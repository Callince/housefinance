"""Web Push notification sender using VAPID."""
import json
import logging
from pywebpush import webpush, WebPushException
from py_vapid import Vapid01
from sqlalchemy.orm import Session

from app.config import settings
from app.models import PushSubscription

log = logging.getLogger(__name__)


def send_push_to_user(db: Session, user_id: int, title: str, body: str, url: str = "/", tag: str = None) -> dict:
    """Send a push notification to all subscriptions for a given user."""
    subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()

    if not subscriptions:
        return {"sent": 0, "failed": 0, "reason": "no subscriptions"}

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "tag": tag or "housefinance",
        "icon": "/favicon.svg",
        "badge": "/favicon.svg",
    })

    sent = 0
    failed = 0
    to_delete = []
    last_error = None

    # Load VAPID instance once (pywebpush accepts a Vapid01 object directly)
    try:
        vapid = Vapid01.from_file(private_key_file=settings.VAPID_PRIVATE_KEY_PATH)
    except Exception as e:
        return {"sent": 0, "failed": len(subscriptions), "error": f"VAPID key load failed: {e}"}

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=vapid,
                vapid_claims={"sub": settings.VAPID_EMAIL},
            )
            sent += 1
        except WebPushException as e:
            failed += 1
            last_error = str(e)
            log.warning(f"Push failed for sub {sub.id}: {e}")
            # 404 or 410 = subscription expired, remove it
            if hasattr(e, "response") and e.response is not None and e.response.status_code in (404, 410):
                to_delete.append(sub.id)
        except Exception as e:
            failed += 1
            last_error = f"{type(e).__name__}: {e}"
            log.warning(f"Push exception for sub {sub.id}: {e}")

    # Clean up dead subscriptions
    if to_delete:
        db.query(PushSubscription).filter(PushSubscription.id.in_(to_delete)).delete(synchronize_session=False)
        db.commit()

    result = {"sent": sent, "failed": failed}
    if last_error and failed > 0:
        result["last_error"] = last_error
    return result


def broadcast_to_house(db: Session, house_id: int, title: str, body: str, url: str = "/", tag: str = None) -> dict:
    """Send a push to all active members of a house."""
    from app.models import HouseMember
    members = (
        db.query(HouseMember)
        .filter(HouseMember.house_id == house_id, HouseMember.is_active == True)
        .all()
    )
    total_sent = 0
    total_failed = 0
    for m in members:
        result = send_push_to_user(db, m.user_id, title, body, url, tag)
        total_sent += result.get("sent", 0)
        total_failed += result.get("failed", 0)
    return {"sent": total_sent, "failed": total_failed, "members_notified": len(members)}
