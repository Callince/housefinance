from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# Auth
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# House
class HouseCreate(BaseModel):
    name: str
    monthly_rent: float


class HouseJoin(BaseModel):
    invite_code: str


class MemberRentUpdate(BaseModel):
    rent_amount: float


class MemberMealDaysUpdate(BaseModel):
    meal_days: str  # Comma-separated day numbers (0=Mon..6=Sun), e.g. "0,1,2,3,4,5,6"


class HouseUpdate(BaseModel):
    name: Optional[str] = None
    monthly_rent: Optional[float] = None
    rent_due_day: Optional[int] = None  # 1-31, day of month


class MemberResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    rent_amount: float
    is_admin: bool
    is_active: bool
    joined_at: datetime
    meal_days: str = "0,1,2,3,4,5,6"

    class Config:
        from_attributes = True


class HouseResponse(BaseModel):
    id: int
    name: str
    monthly_rent: float
    invite_code: str
    created_by: int
    created_at: datetime
    rent_due_day: int = 1
    members: list[MemberResponse] = []

    class Config:
        from_attributes = True


# Expenses
class ExpenseCreate(BaseModel):
    house_id: int
    amount: float
    category: str
    description: Optional[str] = None
    date: date
    is_shared: bool = True
    # Optional: log this expense under another house member (e.g. outside food consumed by them)
    user_id: Optional[int] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[date] = None
    is_shared: Optional[bool] = None


class ExpenseResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    house_id: int
    amount: float
    category: str
    description: Optional[str]
    date: date
    is_shared: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Dashboard
class MemberSummary(BaseModel):
    user_id: int
    name: str
    custom_rent: float
    meal_days: str = "0,1,2,3,4,5,6"
    meal_units: float = 0
    food_share: float = 0
    non_food_share: float = 0
    shared_fair_share: float = 0
    shared_spending: float
    personal_spending: float
    total_spending: float
    expense_balance: float
    total_obligation: float
    categories: dict[str, float]


class Settlement(BaseModel):
    from_user_id: int
    from_user: str
    to_user_id: int
    to_user: str
    amount: float


class DashboardSummary(BaseModel):
    month: int
    year: int
    house_name: str
    total_monthly_rent: float
    member_count: int
    total_shared_expenses: float
    total_shared_food: float = 0
    total_other_shared: float = 0
    total_meal_units: float = 0
    food_per_unit: float = 0
    non_food_per_person: float = 0
    shared_expense_per_person: float
    members: list[MemberSummary]
    settlements: list[Settlement]
    category_totals: dict[str, float]


# Rent Payments
class RentPaymentCreate(BaseModel):
    house_id: int
    user_id: Optional[int] = None  # defaults to current user
    month: int
    year: int
    amount: float
    paid_on: Optional[date] = None
    note: Optional[str] = None


class RentPaymentResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    house_id: int
    month: int
    year: int
    amount: float
    paid_on: date
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Reports
class ReportGenerate(BaseModel):
    month: int
    year: int


class ReportResponse(BaseModel):
    id: int
    house_id: int
    month: int
    year: int
    generated_at: datetime
    sent_at: Optional[datetime]

    class Config:
        from_attributes = True
