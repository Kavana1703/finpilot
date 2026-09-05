"""
Shared analytics logic used by both the dashboard and the analytics page.

Spending prediction (spec section 12) uses the simple average-daily method
described in the spec — no ML needed:
    predicted_spend = (spend_so_far / days_elapsed) * days_in_month
"""
from calendar import monthrange
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas


def month_bounds(year: int, month: int) -> tuple[date, date]:
    days_in_month = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, days_in_month)


def sum_transactions(
    db: Session, user_id: str, tx_type: str, start: date, end: date
) -> float:
    total = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == tx_type,
            models.Transaction.date >= start,
            models.Transaction.date <= end,
        )
        .scalar()
    )
    return float(total)


def predict_month_end_spending(
    db: Session, user_id: str, year: int, month: int, as_of: date | None = None
) -> schemas.SpendingPrediction:
    """
    Simple mathematical prediction per spec section 12:
    average daily spend so far this month, projected across the full month.
    """
    today = as_of or date.today()
    start, end = month_bounds(year, month)
    days_in_month = (end - start).days + 1

    # If asking about a month that isn't the current one, use the full month
    # as "elapsed" (nothing left to predict) rather than a bogus day count.
    if today < start:
        days_elapsed = 0
    elif today > end:
        days_elapsed = days_in_month
    else:
        days_elapsed = (today - start).days + 1

    spent_so_far = sum_transactions(
        db, user_id, "expense", start, min(today, end)
    ) if days_elapsed > 0 else 0.0

    if days_elapsed == 0:
        avg_daily = 0.0
        predicted = 0.0
    else:
        avg_daily = round(spent_so_far / days_elapsed, 2)
        predicted = round(avg_daily * days_in_month, 2)

    return schemas.SpendingPrediction(
        month=month,
        year=year,
        days_elapsed=days_elapsed,
        days_in_month=days_in_month,
        spent_so_far=round(spent_so_far, 2),
        average_daily_spending=avg_daily,
        predicted_month_end_spending=predicted,
    )


def category_breakdown(
    db: Session, user_id: str, tx_type: str, start: date, end: date
) -> list[schemas.CategoryAmount]:
    rows = (
        db.query(
            models.Category.id,
            models.Category.name,
            func.sum(models.Transaction.amount).label("total"),
        )
        .join(models.Transaction, models.Transaction.category_id == models.Category.id)
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == tx_type,
            models.Transaction.date >= start,
            models.Transaction.date <= end,
        )
        .group_by(models.Category.id, models.Category.name)
        .order_by(func.sum(models.Transaction.amount).desc())
        .all()
    )
    return [
        schemas.CategoryAmount(category_id=r.id, category_name=r.name, amount=round(float(r.total), 2))
        for r in rows
    ]


def daily_spending(
    db: Session, user_id: str, start: date, end: date
) -> list[schemas.DailyPoint]:
    rows = (
        db.query(models.Transaction.date, func.sum(models.Transaction.amount).label("total"))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.date >= start,
            models.Transaction.date <= end,
        )
        .group_by(models.Transaction.date)
        .order_by(models.Transaction.date.asc())
        .all()
    )
    return [schemas.DailyPoint(date=r.date, amount=round(float(r.total), 2)) for r in rows]


def monthly_trend(
    db: Session, user_id: str, year: int, month: int, months_back: int = 6
) -> list[schemas.MonthlyPoint]:
    """Income vs expenses for the last `months_back` months, ending at year/month."""
    points = []
    y, m = year, month
    labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    window = []
    for _ in range(months_back):
        window.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    window.reverse()

    for (yy, mm) in window:
        start, end = month_bounds(yy, mm)
        income = sum_transactions(db, user_id, "income", start, end)
        expenses = sum_transactions(db, user_id, "expense", start, end)
        points.append(
            schemas.MonthlyPoint(
                month=mm, year=yy, label=f"{labels[mm - 1]} {yy}",
                income=round(income, 2), expenses=round(expenses, 2),
            )
        )
    return points
