"""Background scheduler: auto-send monthly summary emails to all members at month-end."""
import asyncio
from datetime import datetime, date
from calendar import monthrange

from app.database import SessionLocal
from app.models import House, HouseMember, MonthlyReport
from app.dashboard.calculator import compute_monthly_summary
from app.reports.email_service import send_monthly_report


def _is_last_day_of_month(d: date) -> bool:
    _, last_day = monthrange(d.year, d.month)
    return d.day == last_day


def run_monthly_email_job():
    """Run once. If today is the last day of the month (or past due_day of next month),
    send out monthly summaries for all houses that haven't been emailed yet."""
    today = date.today()
    db = SessionLocal()
    try:
        # Determine which month to report on
        report_month = today.month
        report_year = today.year

        # Only run on the last day of the month
        if not _is_last_day_of_month(today):
            return {"ran": False, "reason": "not last day of month"}

        houses = db.query(House).all()
        results = []
        for house in houses:
            # Skip if already emailed
            existing = (
                db.query(MonthlyReport)
                .filter(
                    MonthlyReport.house_id == house.id,
                    MonthlyReport.month == report_month,
                    MonthlyReport.year == report_year,
                )
                .first()
            )
            if existing and existing.sent_at:
                continue

            summary = compute_monthly_summary(db, house.id, report_month, report_year)
            if not summary:
                continue

            members = (
                db.query(HouseMember)
                .filter(HouseMember.house_id == house.id, HouseMember.is_active == True)
                .all()
            )
            recipients = [
                {"user_id": m.user_id, "name": m.user.name, "email": m.user.email}
                for m in members
            ]

            try:
                send_monthly_report(house.name, report_month, report_year, summary, recipients)

                if existing:
                    existing.sent_at = datetime.utcnow()
                else:
                    import json
                    report = MonthlyReport(
                        house_id=house.id,
                        month=report_month,
                        year=report_year,
                        report_data=json.dumps(summary, default=str),
                        sent_at=datetime.utcnow(),
                    )
                    db.add(report)
                db.commit()
                results.append({"house": house.name, "sent": len(recipients)})
            except Exception as e:
                results.append({"house": house.name, "error": str(e)})
        return {"ran": True, "date": str(today), "results": results}
    finally:
        db.close()


async def scheduler_loop():
    """Check every hour if it's time to run the monthly email job."""
    last_run_date = None
    while True:
        try:
            today = date.today()
            if _is_last_day_of_month(today) and last_run_date != today:
                # Only run once per day, after 20:00 local time
                if datetime.now().hour >= 20:
                    run_monthly_email_job()
                    last_run_date = today
        except Exception as e:
            print(f"Scheduler error: {e}")
        # Sleep for 1 hour
        await asyncio.sleep(3600)
