import resend
from app.config import settings


def send_monthly_report(house_name: str, month: int, year: int, summary: dict, recipients: list[dict]) -> dict:
    if not settings.RESEND_API_KEY:
        return {"sent": [], "failed": [], "error": "RESEND_API_KEY not configured"}

    resend.api_key = settings.RESEND_API_KEY
    sent = []
    failed = []

    for recipient in recipients:
        user_data = next(
            (m for m in summary["members"] if m["user_id"] == recipient["user_id"]),
            None,
        )
        if not user_data:
            continue

        html = _render_email(house_name, month, year, summary, user_data, recipient["name"])

        try:
            resend.Emails.send({
                "from": settings.RESEND_FROM_EMAIL,
                "to": [recipient["email"]],
                "subject": f"Monthly Finance Report - {house_name} ({month}/{year})",
                "html": html,
            })
            sent.append(recipient["email"])
        except Exception as e:
            failed.append({"email": recipient["email"], "error": str(e)})

    return {"sent": sent, "failed": failed}


def _render_email(house_name: str, month: int, year: int, summary: dict, user_data: dict, name: str) -> str:
    months = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    month_name = months[month]

    # Balance Payment = custom_rent + shared_fair_share − shared_spending
    shared_fair_share = user_data.get("shared_fair_share", summary.get("shared_expense_per_person", 0))
    balance_payment = user_data["custom_rent"] + shared_fair_share - user_data["shared_spending"]
    is_credit = balance_payment < 0

    bp_color = "#0ea5e9" if is_credit else "#dc3545"
    bp_label = "You overpaid — get back" if is_credit else "Amount you need to pay"
    bp_display = f"Rs {abs(balance_payment):,.2f}"

    # Two lists: Amount Spent / Balance Payment
    spent_rows = ""
    balance_rows = ""
    for m in summary["members"]:
        share = m.get("shared_fair_share", summary.get("shared_expense_per_person", 0))
        bp = m["custom_rent"] + share - m["shared_spending"]
        bp_text = f"(Rs {abs(bp):,.2f})" if bp < 0 else f"Rs {bp:,.2f}"
        bp_color_row = "#0ea5e9" if bp < 0 else "#111827"
        is_me = m["user_id"] == user_data["user_id"]
        name_style = "font-weight:bold;color:#4f46e5;" if is_me else ""
        suffix = " (You)" if is_me else ""
        spent_rows += f'<tr><td style="padding:8px;border-bottom:1px solid #eee;{name_style}">{m["name"]}{suffix}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">Rs {m["shared_spending"]:,.2f}</td></tr>'
        balance_rows += f'<tr><td style="padding:8px;border-bottom:1px solid #eee;{name_style}">{m["name"]}{suffix}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:{bp_color_row};font-weight:600;">{bp_text}</td></tr>'

    # Category breakdown for this user
    category_html = ""
    for cat, amt in user_data.get("categories", {}).items():
        category_html += f'<tr><td style="padding:8px;border-bottom:1px solid #eee;">{cat}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">Rs {amt:,.2f}</td></tr>'

    food_info = ""
    if summary.get("total_shared_food", 0) > 0:
        food_info = f"""
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin:16px 0;">
            <div style="font-size:12px;color:#9a3412;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">🍽️ Food Sharing</div>
            <div style="color:#9a3412;font-size:13px;margin-top:4px;">
                Total: Rs {summary["total_shared_food"]:,.2f} · {summary.get("total_meal_units", 0)} meal units · Rs {summary.get("food_per_unit", 0):,.2f}/unit (Sunday = 2x)
            </div>
            <div style="color:#9a3412;font-size:13px;margin-top:4px;">
                Your food share: <b>Rs {user_data.get("food_share", 0):,.2f}</b> ({user_data.get("meal_units", 0)} units)
            </div>
        </div>
        """

    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:24px;border-radius:12px;margin-bottom:24px;">
            <h1 style="margin:0;font-size:24px;">🏠 {house_name}</h1>
            <p style="margin:4px 0 0;opacity:0.9;">Monthly Report — {month_name} {year}</p>
        </div>

        <p style="font-size:16px;color:#111827;">Hi <b>{name}</b>,</p>
        <p style="color:#6b7280;">Here's your monthly finance summary:</p>

        <!-- Balance Payment Hero -->
        <div style="background:{'#eff6ff' if is_credit else '#fef2f2'};border:2px solid {bp_color};border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:{bp_color};font-weight:600;">{bp_label}</div>
            <div style="font-size:36px;font-weight:bold;color:{bp_color};margin-top:8px;">{bp_display}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:6px;">Rent + shared expense share − what you spent</div>
        </div>

        <!-- Your breakdown -->
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;overflow:hidden;">
            <tr><td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Your Rent</td><td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">Rs {user_data["custom_rent"]:,.2f}</td></tr>
            <tr><td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Your Expense Share</td><td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">Rs {shared_fair_share:,.2f}</td></tr>
            <tr><td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">You Spent (Shared)</td><td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">Rs {user_data["shared_spending"]:,.2f}</td></tr>
            <tr style="background:#eef2ff;"><td style="padding:12px;color:#4338ca;font-weight:bold;">Balance Payment</td><td style="padding:12px;text-align:right;color:{bp_color};font-weight:bold;font-size:16px;">{bp_display}</td></tr>
        </table>

        {food_info}

        <!-- Two-list summary -->
        <h3 style="color:#111827;margin-top:24px;">Monthly Summary — All Members</h3>
        <table style="width:100%;border-collapse:collapse;margin:8px 0;">
            <thead><tr style="background:#f3f4f6;"><th colspan="2" style="padding:10px;text-align:left;font-size:13px;color:#374151;">Amount Spent</th></tr></thead>
            <tbody>{spent_rows}
            <tr style="background:#f9fafb;font-weight:bold;"><td style="padding:10px;">Total</td><td style="padding:10px;text-align:right;">Rs {summary["total_shared_expenses"]:,.2f}</td></tr>
            </tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead><tr style="background:#f3f4f6;"><th colspan="2" style="padding:10px;text-align:left;font-size:13px;color:#374151;">Balance Payment <span style="font-weight:normal;color:#6b7280;">(rent + share − spent)</span></th></tr></thead>
            <tbody>{balance_rows}
            <tr style="background:#eef2ff;font-weight:bold;"><td style="padding:10px;color:#4338ca;">Total (= total rent)</td><td style="padding:10px;text-align:right;color:#4338ca;">Rs {summary["total_monthly_rent"]:,.2f}</td></tr>
            </tbody>
        </table>

        {"<h3 style='color:#111827;margin-top:24px;'>Your Spending by Category</h3><table style='width:100%;border-collapse:collapse;'>" + category_html + "</table>" if category_html else ""}

        <hr style="margin:32px 0 16px;border:none;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
            Bachelor House Finance · Automated monthly report<br>
            Total house rent: Rs {summary["total_monthly_rent"]:,.2f} · Total shared expenses: Rs {summary["total_shared_expenses"]:,.2f} · {summary["member_count"]} members
        </p>
    </div>
    """
