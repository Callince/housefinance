from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, PushSubscription
from app.auth.dependencies import get_current_user
from app.config import settings
from app.push.sender import send_push_to_user

router = APIRouter(prefix="/api/push", tags=["push"])


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeRequest(BaseModel):
    endpoint: str
    keys: SubscriptionKeys
    user_agent: Optional[str] = None


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Public endpoint — frontend needs this to subscribe users."""
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe")
def subscribe(
    data: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Upsert: if same endpoint exists, update; else create
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == data.endpoint).first()
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = data.keys.p256dh
        existing.auth = data.keys.auth
        existing.user_agent = data.user_agent
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=data.endpoint,
            p256dh=data.keys.p256dh,
            auth=data.keys.auth,
            user_agent=data.user_agent,
        )
        db.add(sub)
    db.commit()
    return {"message": "Subscribed"}


@router.post("/unsubscribe")
def unsubscribe(
    data: UnsubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == data.endpoint,
        PushSubscription.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"message": "Unsubscribed"}


@router.get("/status")
def status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).count()
    return {"subscribed": count > 0, "device_count": count}


@router.post("/test")
def send_test(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a test notification to the current user."""
    result = send_push_to_user(
        db,
        current_user.id,
        title="🏠 HouseFinance",
        body=f"Hi {current_user.name}! Notifications are working.",
        url="/",
        tag="test",
    )
    return result
