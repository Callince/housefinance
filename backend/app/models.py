import secrets
from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database import Base

EXPENSE_CATEGORIES = [
    "Food", "House Cleaning", "Electricity", "Gas",
    "Water", "Internet", "Maintenance", "Other"
]


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("HouseMember", back_populates="user")
    expenses = relationship("Expense", back_populates="user")


class House(Base):
    __tablename__ = "houses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    monthly_rent = Column(Float, nullable=False)
    invite_code = Column(String(16), unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Day of month (1-31) when rent is due. Set by admin. Default 1st.
    rent_due_day = Column(Integer, nullable=False, default=1)

    creator = relationship("User")
    members = relationship("HouseMember", back_populates="house")
    expenses = relationship("Expense", back_populates="house")
    reports = relationship("MonthlyReport", back_populates="house")

    @staticmethod
    def generate_invite_code():
        return secrets.token_urlsafe(8)[:12]


class HouseMember(Base):
    __tablename__ = "house_members"
    __table_args__ = (
        UniqueConstraint("user_id", "house_id", name="uq_user_house"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    rent_amount = Column(Float, nullable=False, default=0)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    # Comma-separated day numbers when member eats at home: 0=Mon,1=Tue,...,6=Sun
    meal_days = Column(String(20), nullable=False, default="0,1,2,3,4,5,6")

    user = relationship("User", back_populates="memberships")
    house = relationship("House", back_populates="members")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(String(200), nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    is_shared = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="expenses")
    house = relationship("House", back_populates="expenses")


class RentPayment(Base):
    __tablename__ = "rent_payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    month = Column(Integer, nullable=False)  # rent is FOR this month
    year = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    paid_on = Column(Date, nullable=False, default=date.today)
    note = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    house = relationship("House")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    user_agent = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"
    __table_args__ = (
        UniqueConstraint("house_id", "month", "year", name="uq_house_month_year"),
    )

    id = Column(Integer, primary_key=True, index=True)
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    report_data = Column(Text, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)

    house = relationship("House", back_populates="reports")
