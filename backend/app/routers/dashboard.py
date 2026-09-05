"""
Dashboard endpoint (spec section 4): one call that returns everything the
main overview page needs — totals, budget status, subscriptions, recent
activity, category breakdown, prediction, and notification strings.
"""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.crud import analytics
from app.routers.budgets import _budget_status
from app.routers.subscriptions import _to_out as subscription_to_out

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today()
    month = month or today.month
    year = year or today.year
    start, end = analytics.month_bounds(year, month)

    total_income = analytics.sum_transactions(db, current_user.id, "income", start, end)
    total_expenses = analytics.sum_transactions(db, current_user.id, "expense", start, end)

    # Budgets for this month
    budgets = (
        db.query(models.Budget)
        .filter(models.Budget.user_id == current_user.id, models.Budget.month == month, models.Budget.year == year)
        .all()
    )
    budget_statuses = [_budget_status(db, current_user.id, b) for b in budgets]
    monthly_budget_total = round(sum(b.amount for b in budget_statuses), 2)
    budget_remaining = round(sum(b.remaining for b in budget_statuses), 2)

    # Subscriptions
    subs = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id, models.Subscription.status == "active")
        .order_by(models.Subscription.next_payment_date.asc())
        .all()
    )
    subs_out = [subscription_to_out(s) for s in subs]
    subs_monthly_total = round(sum(s.monthly_equivalent for s in subs_out), 2)
    upcoming = [s for s in subs_out if 0 <= s.days_until_renewal <= 7][:5]

    # Recent transactions (last 5, any type)
    recent = (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == current_user.id)
        .order_by(models.Transaction.date.desc(), models.Transaction.created_at.desc())
        .limit(5)
        .all()
    )
    recent_out = [
        schemas.TransactionOut(
            id=t.id, type=t.type.value, amount=t.amount, category_id=t.category_id,
            category_name=t.category.name if t.category else None,
            description=t.description, date=t.date, payment_method=t.payment_method,
            created_at=t.created_at,
        )
        for t in recent
    ]

    spending_by_category = analytics.category_breakdown(db, current_user.id, "expense", start, end)
    prediction = analytics.predict_month_end_spending(db, current_user.id, year, month, as_of=today)

    # Notifications (spec section 16) — computed on the fly for now;
    # Phase 5 persists these as real Notification rows.
    notifications = []
    for b in budget_statuses:
        if b.status == "exceeded":
            notifications.append(f"🔴 Your {b.category_name} budget has been exceeded by ₹{abs(b.remaining):,.0f}.")
        elif b.status == "near_limit":
            notifications.append(f"⚠️ You have used {b.percent_used:.0f}% of your {b.category_name} budget.")
    for s in upcoming:
        if s.days_until_renewal <= 3:
            when = "today" if s.days_until_renewal == 0 else f"in {s.days_until_renewal} day{'s' if s.days_until_renewal != 1 else ''}"
            notifications.append(f"🔔 {s.name} subscription renews {when}.")
    if monthly_budget_total > 0 and prediction.predicted_month_end_spending > monthly_budget_total:
        notifications.append("📈 Your predicted monthly spending is higher than your planned budget.")

    return schemas.DashboardSummary(
        month=month,
        year=year,
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        current_balance=round(total_income - total_expenses, 2),
        monthly_budget_total=monthly_budget_total,
        budget_remaining=budget_remaining,
        subscriptions_monthly_total=subs_monthly_total,
        predicted_month_end_spending=prediction.predicted_month_end_spending,
        recent_transactions=recent_out,
        spending_by_category=spending_by_category,
        upcoming_subscriptions=upcoming,
        notifications=notifications,
    )
