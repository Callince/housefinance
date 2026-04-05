from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User, HouseMember, RentPayment
from app.schemas import RentPaymentCreate
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/rent-payments", tags=["rent-payments"])


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


def _to_response(p: RentPayment) -> dict:
    return {
        "id": p.id,
        "user_id": p.user_id,
        "user_name": p.user.name,
        "house_id": p.house_id,
        "month": p.month,
        "year": p.year,
        "amount": p.amount,
        "paid_on": p.paid_on,
        "note": p.note,
        "created_at": p.created_at,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_rent_payment(
    data: RentPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caller = _verify_membership(db, current_user.id, data.house_id)

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
            raise HTTPException(status_code=400, detail="Target user is not a member of this house")
        # Only admin can log payments for other people
        if not caller.is_admin:
            raise HTTPException(status_code=403, detail="Only admins can log payments for others")

    if data.month < 1 or data.month > 12:
        raise HTTPException(status_code=400, detail="Month must be 1-12")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    payment = RentPayment(
        user_id=target_user_id,
        house_id=data.house_id,
        month=data.month,
        year=data.year,
        amount=data.amount,
        paid_on=data.paid_on or date.today(),
        note=data.note,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Notify other members
    try:
        from app.push.sender import send_push_to_user
        other_members = (
            db.query(HouseMember)
            .filter(
                HouseMember.house_id == data.house_id,
                HouseMember.user_id != payment.user_id,
                HouseMember.is_active == True,
            )
            .all()
        )
        title = "💰 Rent payment logged"
        body = f"{payment.user.name} paid Rs {payment.amount:,.0f} for {data.month}/{data.year}"
        for m in other_members:
            send_push_to_user(db, m.user_id, title, body, url="/rent", tag="rent")
    except Exception:
        pass

    return _to_response(payment)


@router.get("/")
def list_rent_payments(
    house_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_membership(db, current_user.id, house_id)
    q = db.query(RentPayment).filter(RentPayment.house_id == house_id)
    if month is not None:
        q = q.filter(RentPayment.month == month)
    if year is not None:
        q = q.filter(RentPayment.year == year)
    payments = q.order_by(RentPayment.paid_on.desc(), RentPayment.created_at.desc()).all()
    return [_to_response(p) for p in payments]


@router.delete("/{payment_id}")
def delete_rent_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(RentPayment).filter(RentPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    caller = _verify_membership(db, current_user.id, payment.house_id)
    if payment.user_id != current_user.id and not caller.is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own payments")
    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted"}


@router.get("/{house_id}/summary/{year}/{month}")
def rent_summary(
    house_id: int,
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Per-member rent due vs paid for the given month."""
    _verify_membership(db, current_user.id, house_id)

    members = (
        db.query(HouseMember)
        .filter(HouseMember.house_id == house_id, HouseMember.is_active == True)
        .all()
    )
    payments = (
        db.query(RentPayment)
        .filter(
            RentPayment.house_id == house_id,
            RentPayment.month == month,
            RentPayment.year == year,
        )
        .all()
    )

    paid_by_user: dict[int, float] = {}
    for p in payments:
        paid_by_user[p.user_id] = paid_by_user.get(p.user_id, 0) + p.amount

    rows = []
    total_due = 0.0
    total_paid = 0.0
    for m in members:
        due = m.rent_amount
        paid = paid_by_user.get(m.user_id, 0.0)
        balance = due - paid
        total_due += due
        total_paid += paid
        rows.append({
            "user_id": m.user_id,
            "name": m.user.name,
            "rent_due": round(due, 2),
            "rent_paid": round(paid, 2),
            "balance": round(balance, 2),  # positive = still owed to owner
            "status": "paid" if balance <= 0.01 else ("partial" if paid > 0.01 else "unpaid"),
        })

    return {
        "house_id": house_id,
        "month": month,
        "year": year,
        "total_due": round(total_due, 2),
        "total_paid": round(total_paid, 2),
        "total_pending": round(total_due - total_paid, 2),
        "members": rows,
    }
