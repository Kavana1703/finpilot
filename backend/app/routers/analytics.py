"""
Analytics endpoint (spec sections 12 & 13): category breakdown, monthly
income-vs-expense trend, daily spending for the current month, highest
spending category, month-over-month change, and the spending prediction.
"""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.crud import analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=schemas.AnalyticsOverview)
def get_analytics_overview(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today()
    month = month or today.month
    year = year or today.year
    start, end = analytics.month_bounds(year, month)

    category_data = analytics.category_breakdown(db, current_user.id, "expense", start, end)
    trend = analytics.monthly_trend(db, current_user.id, year, month, months_back=6)
    daily = analytics.daily_spending(db, current_user.id, start, end)
    prediction = analytics.predict_month_end_spending(db, current_user.id, year, month, as_of=today)

    highest = category_data[0] if category_data else None

    total_income = analytics.sum_transactions(db, current_user.id, "income", start, end)
    total_expenses = analytics.sum_transactions(db, current_user.id, "expense", start, end)

    # Month-over-month % change in expenses
    prev_month = month - 1 or 12
    prev_year = year if month > 1 else year - 1
    prev_start, prev_end = analytics.month_bounds(prev_year, prev_month)
    prev_expenses = analytics.sum_transactions(db, current_user.id, "expense", prev_start, prev_end)

    mom_change = None
    if prev_expenses > 0:
        mom_change = round(((total_expenses - prev_expenses) / prev_expenses) * 100, 1)

    return schemas.AnalyticsOverview(
        month=month,
        year=year,
        category_breakdown=category_data,
        monthly_trend=trend,
        daily_spending=daily,
        highest_category=highest,
        income_vs_expenses={"income": round(total_income, 2), "expenses": round(total_expenses, 2)},
        prediction=prediction,
        month_over_month_change_percent=mom_change,
    )
