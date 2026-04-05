import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, House, HouseMember, MonthlyReport
from app.schemas import ReportGenerate, ReportResponse
from app.auth.dependencies import get_current_user
from app.dashboard.calculator import compute_monthly_summary
from app.reports.email_service import send_monthly_report
from app.reports.scheduler import run_monthly_email_job

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _verify_house_member(db: Session, user_id: int, house_id: int) -> HouseMember:
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


@router.get("/{house_id}")
def list_reports(
    house_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_house_member(db, current_user.id, house_id)
    reports = (
        db.query(MonthlyReport)
        .filter(MonthlyReport.house_id == house_id)
        .order_by(MonthlyReport.year.desc(), MonthlyReport.month.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "house_id": r.house_id,
            "month": r.month,
            "year": r.year,
            "generated_at": r.generated_at,
            "sent_at": r.sent_at,
        }
        for r in reports
    ]


@router.get("/{house_id}/{year}/{month}")
def get_report(
    house_id: int,
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_house_member(db, current_user.id, house_id)

    report = (
        db.query(MonthlyReport)
        .filter(
            MonthlyReport.house_id == house_id,
            MonthlyReport.month == month,
            MonthlyReport.year == year,
        )
        .first()
    )
    if report and report.report_data:
        return {
            "id": report.id,
            "month": month,
            "year": year,
            "generated_at": report.generated_at,
            "sent_at": report.sent_at,
            "data": json.loads(report.report_data),
        }

    # Compute live if no saved report
    summary = compute_monthly_summary(db, house_id, month, year)
    if not summary:
        raise HTTPException(status_code=404, detail="House not found")
    return {"id": None, "month": month, "year": year, "generated_at": None, "sent_at": None, "data": summary}


@router.post("/{house_id}/generate")
def generate_report(
    house_id: int,
    data: ReportGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_house_member(db, current_user.id, house_id)

    summary = compute_monthly_summary(db, house_id, data.month, data.year)
    if not summary:
        raise HTTPException(status_code=404, detail="House not found")

    existing = (
        db.query(MonthlyReport)
        .filter(
            MonthlyReport.house_id == house_id,
            MonthlyReport.month == data.month,
            MonthlyReport.year == data.year,
        )
        .first()
    )

    if existing:
        existing.report_data = json.dumps(summary, default=str)
        existing.generated_at = datetime.utcnow()
    else:
        report = MonthlyReport(
            house_id=house_id,
            month=data.month,
            year=data.year,
            report_data=json.dumps(summary, default=str),
        )
        db.add(report)

    db.commit()
    return {"message": "Report generated", "data": summary}


@router.post("/{house_id}/send")
def send_report_email(
    house_id: int,
    data: ReportGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = _verify_house_member(db, current_user.id, house_id)
    if not member.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can send reports")

    house = db.query(House).filter(House.id == house_id).first()
    summary = compute_monthly_summary(db, house_id, data.month, data.year)
    if not summary:
        raise HTTPException(status_code=404, detail="House not found")

    # Get all active members' emails
    members = (
        db.query(HouseMember)
        .filter(HouseMember.house_id == house_id, HouseMember.is_active == True)
        .all()
    )
    recipients = [
        {"user_id": m.user_id, "name": m.user.name, "email": m.user.email}
        for m in members
    ]

    result = send_monthly_report(house.name, data.month, data.year, summary, recipients)

    # Update sent_at on report
    report = (
        db.query(MonthlyReport)
        .filter(
            MonthlyReport.house_id == house_id,
            MonthlyReport.month == data.month,
            MonthlyReport.year == data.year,
        )
        .first()
    )
    if report:
        report.sent_at = datetime.utcnow()
        db.commit()

    return result


@router.post("/auto-send-monthly")
def trigger_auto_send(current_user: User = Depends(get_current_user)):
    """Manually trigger the month-end auto-send job (for testing)."""
    result = run_monthly_email_job()
    return result
