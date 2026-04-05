from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, House, HouseMember
from app.schemas import (
    HouseCreate, HouseJoin, HouseUpdate, HouseResponse,
    MemberResponse, MemberRentUpdate, MemberMealDaysUpdate,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/houses", tags=["houses"])


def _build_member_response(m: HouseMember) -> dict:
    return {
        "id": m.id,
        "user_id": m.user_id,
        "user_name": m.user.name,
        "user_email": m.user.email,
        "rent_amount": m.rent_amount,
        "is_admin": m.is_admin,
        "is_active": m.is_active,
        "joined_at": m.joined_at,
        "meal_days": m.meal_days or "0,1,2,3,4,5,6",
    }


def _build_house_response(house: House) -> dict:
    return {
        "id": house.id,
        "name": house.name,
        "monthly_rent": house.monthly_rent,
        "invite_code": house.invite_code,
        "created_by": house.created_by,
        "created_at": house.created_at,
        "rent_due_day": getattr(house, "rent_due_day", 1) or 1,
        "members": [
            _build_member_response(m) for m in house.members if m.is_active
        ],
    }


@router.post("/", response_model=HouseResponse, status_code=status.HTTP_201_CREATED)
def create_house(
    data: HouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    house = House(
        name=data.name,
        monthly_rent=data.monthly_rent,
        invite_code=House.generate_invite_code(),
        created_by=current_user.id,
    )
    db.add(house)
    db.flush()

    member = HouseMember(
        user_id=current_user.id,
        house_id=house.id,
        rent_amount=data.monthly_rent,
        is_admin=True,
    )
    db.add(member)
    db.commit()
    db.refresh(house)
    return _build_house_response(house)


@router.post("/join", response_model=HouseResponse)
def join_house(
    data: HouseJoin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    house = db.query(House).filter(House.invite_code == data.invite_code).first()
    if not house:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    existing = (
        db.query(HouseMember)
        .filter(HouseMember.user_id == current_user.id, HouseMember.house_id == house.id)
        .first()
    )
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Already a member of this house")
        existing.is_active = True
        existing.left_at = None
    else:
        member = HouseMember(
            user_id=current_user.id,
            house_id=house.id,
            rent_amount=0,
            is_admin=False,
        )
        db.add(member)

    db.commit()
    db.refresh(house)
    return _build_house_response(house)


@router.get("/my-houses")
def list_my_houses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = (
        db.query(HouseMember)
        .filter(HouseMember.user_id == current_user.id, HouseMember.is_active == True)
        .all()
    )
    houses = []
    for m in memberships:
        houses.append(_build_house_response(m.house))
    return houses


@router.get("/{house_id}", response_model=HouseResponse)
def get_house(
    house_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="House not found")

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

    return _build_house_response(house)


@router.put("/{house_id}", response_model=HouseResponse)
def update_house(
    house_id: int,
    data: HouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = (
        db.query(HouseMember)
        .filter(
            HouseMember.user_id == current_user.id,
            HouseMember.house_id == house_id,
            HouseMember.is_admin == True,
            HouseMember.is_active == True,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="Only admins can update house settings")

    house = db.query(House).filter(House.id == house_id).first()
    if data.name is not None:
        house.name = data.name
    if data.monthly_rent is not None:
        house.monthly_rent = data.monthly_rent
    if data.rent_due_day is not None:
        if data.rent_due_day < 1 or data.rent_due_day > 31:
            raise HTTPException(status_code=400, detail="rent_due_day must be between 1 and 31")
        house.rent_due_day = data.rent_due_day
    db.commit()
    db.refresh(house)
    return _build_house_response(house)


@router.put("/{house_id}/members/{member_id}/rent")
def update_member_rent(
    house_id: int,
    member_id: int,
    data: MemberRentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin = (
        db.query(HouseMember)
        .filter(
            HouseMember.user_id == current_user.id,
            HouseMember.house_id == house_id,
            HouseMember.is_admin == True,
            HouseMember.is_active == True,
        )
        .first()
    )
    if not admin:
        raise HTTPException(status_code=403, detail="Only admins can set member rent")

    member = (
        db.query(HouseMember)
        .filter(HouseMember.id == member_id, HouseMember.house_id == house_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.rent_amount = data.rent_amount
    db.commit()
    return {"message": "Rent updated", "member_id": member_id, "rent_amount": data.rent_amount}


@router.put("/{house_id}/members/{member_id}/meal-days")
def update_member_meal_days(
    house_id: int,
    member_id: int,
    data: MemberMealDaysUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Member can update their own meal days; admin can update anyone's
    caller = (
        db.query(HouseMember)
        .filter(
            HouseMember.user_id == current_user.id,
            HouseMember.house_id == house_id,
            HouseMember.is_active == True,
        )
        .first()
    )
    if not caller:
        raise HTTPException(status_code=403, detail="Not a member of this house")

    member = (
        db.query(HouseMember)
        .filter(HouseMember.id == member_id, HouseMember.house_id == house_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.user_id != current_user.id and not caller.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Can only update your own meal days (or be admin)",
        )

    # Validate the meal_days string: comma-separated ints 0-6
    try:
        parts = [int(x.strip()) for x in data.meal_days.split(",") if x.strip() != ""]
        for p in parts:
            if p < 0 or p > 6:
                raise ValueError("day out of range")
        meal_days = ",".join(str(p) for p in sorted(set(parts)))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="meal_days must be comma-separated integers 0-6 (0=Mon..6=Sun)",
        )

    member.meal_days = meal_days
    db.commit()
    return {"message": "Meal days updated", "member_id": member_id, "meal_days": meal_days}


@router.post("/{house_id}/leave")
def leave_house(
    house_id: int,
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
        raise HTTPException(status_code=404, detail="Not a member of this house")

    if member.is_admin:
        other_admins = (
            db.query(HouseMember)
            .filter(
                HouseMember.house_id == house_id,
                HouseMember.is_admin == True,
                HouseMember.is_active == True,
                HouseMember.id != member.id,
            )
            .count()
        )
        if other_admins == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot leave: you are the only admin. Promote another member first.",
            )

    from datetime import datetime
    member.is_active = False
    member.left_at = datetime.utcnow()
    db.commit()
    return {"message": "Left the house successfully"}
