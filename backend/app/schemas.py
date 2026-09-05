"""
Pydantic schemas (request/response shapes) for the auth module.
More schemas (Transaction, Budget, Subscription, Bill...) get added
in their respective phases.
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str | None = None


class ChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ---------------------------------------------------------------------------
# Phase 2: Categories & Transactions (Income + Expense)
# ---------------------------------------------------------------------------
from datetime import date as date_type
from typing import Optional, Literal


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    type: Literal["income", "expense"]


class CategoryOut(BaseModel):
    id: str
    name: str
    type: str
    user_id: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: float = Field(..., gt=0)
    category_id: Optional[str] = None
    description: Optional[str] = Field(None, max_length=255)
    date: date_type
    payment_method: Optional[str] = Field(None, max_length=50)


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category_id: Optional[str] = None
    description: Optional[str] = Field(None, max_length=255)
    date: Optional[date_type] = None
    payment_method: Optional[str] = Field(None, max_length=50)


class TransactionOut(BaseModel):
    id: str
    type: str
    amount: float
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    description: Optional[str] = None
    date: date_type
    payment_method: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Phase 3: Budgets, Subscriptions, Bill Splitter
# ---------------------------------------------------------------------------

class BudgetCreate(BaseModel):
    category_id: str
    amount: float = Field(..., gt=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)


class BudgetUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)


class BudgetStatus(BaseModel):
    id: str
    category_id: str
    category_name: str
    amount: float
    month: int
    year: int
    spent: float
    remaining: float
    percent_used: float
    status: Literal["within_budget", "near_limit", "exceeded"]

    class Config:
        from_attributes = True


class SubscriptionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)
    frequency: Literal["monthly", "yearly", "weekly"]
    next_payment_date: date_type


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    frequency: Optional[Literal["monthly", "yearly", "weekly"]] = None
    next_payment_date: Optional[date_type] = None
    status: Optional[Literal["active", "cancelled"]] = None


class SubscriptionOut(BaseModel):
    id: str
    name: str
    amount: float
    frequency: str
    next_payment_date: date_type
    status: str
    monthly_equivalent: float
    days_until_renewal: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionSummary(BaseModel):
    subscriptions: list[SubscriptionOut]
    monthly_total: float
    yearly_total: float
    active_count: int
    cancelled_count: int


class BillParticipantIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class BillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    total_amount: float = Field(..., gt=0)
    date: date_type
    participants: list[BillParticipantIn] = Field(..., min_length=1)


class BillParticipantOut(BaseModel):
    id: str
    name: str
    share_amount: float
    paid: bool

    class Config:
        from_attributes = True


class BillOut(BaseModel):
    id: str
    name: str
    total_amount: float
    date: date_type
    participants: list[BillParticipantOut]
    created_at: datetime

    class Config:
        from_attributes = True


class BillParticipantPaidUpdate(BaseModel):
    paid: bool


# ---------------------------------------------------------------------------
# Phase 4: Dashboard & Analytics
# ---------------------------------------------------------------------------

class CategoryAmount(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    amount: float


class DashboardSummary(BaseModel):
    month: int
    year: int
    total_income: float
    total_expenses: float
    current_balance: float
    monthly_budget_total: float
    budget_remaining: float
    subscriptions_monthly_total: float
    predicted_month_end_spending: float
    recent_transactions: list[TransactionOut]
    spending_by_category: list[CategoryAmount]
    upcoming_subscriptions: list[SubscriptionOut]
    notifications: list[str]


class MonthlyPoint(BaseModel):
    month: int
    year: int
    label: str
    income: float
    expenses: float


class DailyPoint(BaseModel):
    date: date_type
    amount: float


class SpendingPrediction(BaseModel):
    month: int
    year: int
    days_elapsed: int
    days_in_month: int
    spent_so_far: float
    average_daily_spending: float
    predicted_month_end_spending: float


class AnalyticsOverview(BaseModel):
    month: int
    year: int
    category_breakdown: list[CategoryAmount]
    monthly_trend: list[MonthlyPoint]
    daily_spending: list[DailyPoint]
    highest_category: Optional[CategoryAmount] = None
    income_vs_expenses: dict
    prediction: SpendingPrediction
    month_over_month_change_percent: Optional[float] = None


# ---------------------------------------------------------------------------
# Phase 5: Notifications & Reports
# ---------------------------------------------------------------------------

class NotificationOut(BaseModel):
    id: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    unread_count: int


class BudgetLineReport(BaseModel):
    category_name: str
    budget_amount: float
    spent: float
    status: str


class FinancialReport(BaseModel):
    month: int
    year: int
    label: str
    total_income: float
    total_expenses: float
    savings: float
    highest_category: Optional[CategoryAmount] = None
    subscriptions_monthly_total: float
    budgets: list[BudgetLineReport]
    category_breakdown: list[CategoryAmount]
