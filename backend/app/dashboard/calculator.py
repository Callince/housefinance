from calendar import monthrange
from datetime import date, timedelta
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models import House, HouseMember, Expense, EXPENSE_CATEGORIES

SUNDAY_MULTIPLIER = 2.0  # Sunday food counts double


def _parse_meal_days(meal_days_str: str) -> set[int]:
    """Parse 'meal_days' like '0,1,2,6' into a set of int day-of-week (0=Mon,6=Sun)."""
    if not meal_days_str:
        return set()
    try:
        return {int(d.strip()) for d in meal_days_str.split(",") if d.strip() != ""}
    except Exception:
        return set()


def _compute_meal_units(member_meal_days: set[int], start: date, end: date) -> float:
    """Count meal-units for a member in date range [start, end].
    Each day they eat at home = 1 unit. Sunday = SUNDAY_MULTIPLIER units.
    In Python weekday(): Mon=0,...,Sun=6
    """
    if not member_meal_days:
        return 0.0
    units = 0.0
    d = start
    while d <= end:
        dow = d.weekday()
        if dow in member_meal_days:
            units += SUNDAY_MULTIPLIER if dow == 6 else 1.0
        d += timedelta(days=1)
    return units


def compute_monthly_summary(db: Session, house_id: int, month: int, year: int) -> dict:
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        return None

    start_of_month = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end_of_month = date(year, month, last_day)

    # Step 1: Active members for the month
    active_members = (
        db.query(HouseMember)
        .filter(
            HouseMember.house_id == house_id,
            HouseMember.joined_at <= end_of_month,
            HouseMember.is_active == True,
        )
        .all()
    )
    left_during_month = (
        db.query(HouseMember)
        .filter(
            HouseMember.house_id == house_id,
            HouseMember.is_active == False,
            HouseMember.left_at >= start_of_month,
            HouseMember.left_at <= end_of_month,
        )
        .all()
    )
    all_members = {m.id: m for m in active_members}
    for m in left_during_month:
        all_members[m.id] = m
    members_list = list(all_members.values())
    member_count = max(len(members_list), 1)

    # Step 2: Total rent
    total_rent = sum(m.rent_amount for m in members_list)

    # Step 3: Fetch expenses
    expenses = (
        db.query(Expense)
        .filter(
            Expense.house_id == house_id,
            Expense.date >= start_of_month,
            Expense.date <= end_of_month,
        )
        .all()
    )

    # Step 4: Separate food (shared home food) from other shared expenses and outside food
    shared_food_expenses = [
        e for e in expenses if e.is_shared and e.category == "Food"
    ]
    other_shared_expenses = [
        e for e in expenses if e.is_shared and e.category != "Food"
    ]
    total_shared_food = sum(e.amount for e in shared_food_expenses)
    total_other_shared = sum(e.amount for e in other_shared_expenses)
    total_shared = total_shared_food + total_other_shared

    # Step 5: Meal-units for each member (for food share distribution)
    member_meal_units: dict[int, float] = {}
    for m in members_list:
        days_set = _parse_meal_days(m.meal_days)
        member_meal_units[m.id] = _compute_meal_units(days_set, start_of_month, end_of_month)
    total_meal_units = sum(member_meal_units.values())

    food_per_unit = (
        total_shared_food / total_meal_units if total_meal_units > 0 else 0.0
    )

    # Non-food shared expenses split equally
    non_food_share = total_other_shared / member_count if member_count > 0 else 0.0

    # Step 6: Per-user breakdown
    member_summaries = []
    category_totals = defaultdict(float)

    for member in members_list:
        user_expenses = [e for e in expenses if e.user_id == member.user_id]
        shared_spending = sum(e.amount for e in user_expenses if e.is_shared)
        personal_spending = sum(e.amount for e in user_expenses if not e.is_shared)
        total_spending = shared_spending + personal_spending

        # Food share = meal_units * food_per_unit
        food_share = member_meal_units.get(member.id, 0.0) * food_per_unit
        # Total fair share of shared expenses
        shared_fair_share = food_share + non_food_share

        total_obligation = member.rent_amount + shared_fair_share

        # Balance: paid into shared pot - fair share owed
        expense_balance = shared_spending - shared_fair_share

        # Category breakdown (all expenses by this member)
        cats = defaultdict(float)
        for e in user_expenses:
            cats[e.category] += e.amount
            category_totals[e.category] += e.amount

        member_summaries.append({
            "user_id": member.user_id,
            "name": member.user.name,
            "custom_rent": member.rent_amount,
            "meal_days": member.meal_days,
            "meal_units": round(member_meal_units.get(member.id, 0.0), 2),
            "food_share": round(food_share, 2),
            "non_food_share": round(non_food_share, 2),
            "shared_fair_share": round(shared_fair_share, 2),
            "shared_spending": round(shared_spending, 2),
            "personal_spending": round(personal_spending, 2),
            "total_spending": round(total_spending, 2),
            "expense_balance": round(expense_balance, 2),
            "total_obligation": round(total_obligation, 2),
            "categories": dict(cats),
        })

    settlements = _compute_settlements(member_summaries)

    # Back-compat: equal-per-person number still shown as reference
    shared_per_person = total_shared / member_count if member_count > 0 else 0

    return {
        "month": month,
        "year": year,
        "house_name": house.name,
        "total_monthly_rent": house.monthly_rent,
        "member_count": member_count,
        "total_shared_expenses": round(total_shared, 2),
        "total_shared_food": round(total_shared_food, 2),
        "total_other_shared": round(total_other_shared, 2),
        "total_meal_units": round(total_meal_units, 2),
        "food_per_unit": round(food_per_unit, 2),
        "non_food_per_person": round(non_food_share, 2),
        "shared_expense_per_person": round(shared_per_person, 2),
        "members": member_summaries,
        "settlements": settlements,
        "category_totals": dict(category_totals),
    }


def _compute_settlements(member_summaries: list[dict]) -> list[dict]:
    creditors = []
    debtors = []

    for m in member_summaries:
        balance = m["expense_balance"]
        if balance > 0.01:
            creditors.append({"user_id": m["user_id"], "name": m["name"], "amount": balance})
        elif balance < -0.01:
            debtors.append({"user_id": m["user_id"], "name": m["name"], "amount": abs(balance)})

    creditors.sort(key=lambda x: x["amount"], reverse=True)
    debtors.sort(key=lambda x: x["amount"], reverse=True)

    settlements = []
    ci, di = 0, 0

    while ci < len(creditors) and di < len(debtors):
        creditor = creditors[ci]
        debtor = debtors[di]
        transfer = min(creditor["amount"], debtor["amount"])

        if transfer > 0.01:
            settlements.append({
                "from_user_id": debtor["user_id"],
                "from_user": debtor["name"],
                "to_user_id": creditor["user_id"],
                "to_user": creditor["name"],
                "amount": round(transfer, 2),
            })

        creditor["amount"] -= transfer
        debtor["amount"] -= transfer

        if creditor["amount"] < 0.01:
            ci += 1
        if debtor["amount"] < 0.01:
            di += 1

    return settlements
