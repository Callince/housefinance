from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User, Expense, HouseMember, EXPENSE_CATEGORIES
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


def _verify_membership(db: Session, user_id: int, house_id: int) -> HouseMember:
    member = (
        db.query(HouseMember)
        .filter(
            HouseMember.user_id == user_id,
            HouseMember.house_id == house_id,
            HouseMember.is_active == True,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this house")
    return member


def _expense_to_response(expense: Expense) -> dict:
    return {
        "id": expense.id,
        "user_id": expense.user_id,
        "user_name": expense.user.name,
        "house_id": expense.house_id,
        "amount": expense.amount,
        "category": expense.category,
        "description": expense.description,
        "date": expense.date,
        "is_shared": expense.is_shared,
        "created_at": expense.created_at,
    }


@router.get("/")
def list_expenses(
    house_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_membership(db, current_user.id, house_id)

    query = db.query(Expense).filter(Expense.house_id == house_id)

    if month and year:
        from calendar import monthrange
        from datetime import date
        start = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end = date(year, month, last_day)
        query = query.filter(Expense.date >= start, Expense.date <= end)

    if category:
        query = query.filter(Expense.category == category)
    if user_id:
        query = query.filter(Expense.user_id == user_id)

    expenses = query.order_by(Expense.date.desc(), Expense.created_at.desc()).all()
    return [_expense_to_response(e) for e in expenses]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_membership(db, current_user.id, data.house_id)

    if data.category not in EXPENSE_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(EXPENSE_CATEGORIES)}",
        )

    # Resolve target user: default to current user, else ensure target is in same house
    target_user_id = data.user_id or current_user.id
    if target_user_id != current_user.id:
        target_member = (
            db.query(HouseMember)
            .filter(
                HouseMember.user_id == target_user_id,
                HouseMember.house_id == data.house_id,
                HouseMember.is_active == True,
            )
            .first()
        )
        if not target_member:
            raise HTTPException(
                status_code=400,
                detail="Target user is not a member of this house",
            )

    expense = Expense(
        user_id=target_user_id,
        house_id=data.house_id,
        amount=data.amount,
        category=data.category,
        description=data.description,
        date=data.date,
        is_shared=data.is_shared,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    # Notify other house members (best-effort)
    try:
        from app.push.sender import send_push_to_user
        from app.models import HouseMember
        other_members = (
            db.query(HouseMember)
            .filter(
                HouseMember.house_id == data.house_id,
                HouseMember.user_id != expense.user_id,
                HouseMember.is_active == True,
            )
            .all()
        )
        title = "💸 New expense"
        body = f"{expense.user.name} added {expense.category}: Rs {expense.amount:,.0f}" + (f" — {expense.description}" if expense.description else "")
        for m in other_members:
            send_push_to_user(db, m.user_id, title, body, url="/expenses", tag="expense")
    except Exception:
        pass

    return _expense_to_response(expense)


@router.put("/{expense_id}")
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    member = _verify_membership(db, current_user.id, expense.house_id)
    if expense.user_id != current_user.id and not member.is_admin:
        raise HTTPException(status_code=403, detail="Can only edit your own expenses")

    if data.category and data.category not in EXPENSE_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(EXPENSE_CATEGORIES)}",
        )

    if data.amount is not None:
        expense.amount = data.amount
    if data.category is not None:
        expense.category = data.category
    if data.description is not None:
        expense.description = data.description
    if data.date is not None:
        expense.date = data.date
    if data.is_shared is not None:
        expense.is_shared = data.is_shared

    db.commit()
    db.refresh(expense)
    return _expense_to_response(expense)


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    member = _verify_membership(db, current_user.id, expense.house_id)
    if expense.user_id != current_user.id and not member.is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own expenses")

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted"}
