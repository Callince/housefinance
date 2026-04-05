from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, HouseMember
from app.auth.dependencies import get_current_user
from app.dashboard.calculator import compute_monthly_summary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/{house_id}/summary")
def get_monthly_summary(
    house_id: int,
    month: int = Query(default=None),
    year: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = (
        db.query(HouseMember)
        .filter(
            HouseMember.user_id == current_user.id,
            HouseMember.house_id == house_id,
            HouseMember.is_active == True,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this house")

    if month is None:
        month = date.today().month
    if year is None:
        year = date.today().year

    summary = compute_monthly_summary(db, house_id, month, year)
    if summary is None:
        raise HTTPException(status_code=404, detail="House not found")

    return summary
