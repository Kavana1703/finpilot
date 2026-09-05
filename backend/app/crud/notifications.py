"""
Notification generation (spec section 16). Turns the same conditions the
dashboard already flags (budget warnings/exceeded, upcoming renewals,
predicted overspend) into persisted `Notification` rows instead of
recomputing them fresh on every dashboard load.

`generate_notifications` is idempotent-ish: it skips creating a duplicate
if an unread notification with the same message already exists, so calling
it repeatedly (e.g. every time the dashboard loads) doesn't spam the list.
"""
from datetime import date

from sqlalchemy.orm import Session

from app import models
from app.crud import analytics

NEAR_LIMIT_THRESHOLD = 0.8


def generate_notifications(db: Session, user_id: str) -> list[models.Notification]:
    today = date.today()
    month, year = today.month, today.year
    start, end = analytics.month_bounds(year, month)

    created: list[models.Notification] = []

    def _add(message: str, ntype: str):
        exists = (
            db.query(models.Notification)
            .filter(
                models.Notification.user_id == user_id,
                models.Notification.message == message,
                models.Notification.is_read == False,  # noqa: E712
            )
            .first()
        )
        if exists:
            return
        note = models.Notification(user_id=user_id, message=message, type=ntype)
        db.add(note)
        created.append(note)

    # Budget warnings / exceeded
    budgets = (
        db.query(models.Budget)
        .filter(models.Budget.user_id == user_id, models.Budget.month == month, models.Budget.year == year)
        .all()
    )
    from app.routers.budgets import _budget_status  # local import avoids a circular import at module load

    budget_statuses = [_budget_status(db, user_id, b) for b in budgets]
    monthly_budget_total = sum(bs.amount for bs in budget_statuses)

    for bs in budget_statuses:
        if bs.status == "exceeded":
            _add(
                f"🔴 Your {bs.category_name} budget has been exceeded by ₹{abs(bs.remaining):,.0f}.",
                "budget_exceeded",
            )
        elif bs.status == "near_limit":
            _add(
                f"⚠️ You have used {bs.percent_used:.0f}% of your {bs.category_name} budget.",
                "budget_warning",
            )

    # Subscription renewals within 3 days
    subs = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == user_id, models.Subscription.status == "active")
        .all()
    )
    for s in subs:
        days_left = (s.next_payment_date - today).days
        if 0 <= days_left <= 3:
            when = "today" if days_left == 0 else f"in {days_left} day{'s' if days_left != 1 else ''}"
            _add(f"🔔 {s.name} subscription renews {when}.", "subscription_reminder")

    # Predicted overspend vs total budget
    if monthly_budget_total > 0:
        prediction = analytics.predict_month_end_spending(db, user_id, year, month, as_of=today)
        if prediction.predicted_month_end_spending > monthly_budget_total:
            _add(
                "📈 Your predicted monthly spending is higher than your planned budget.",
                "spending_warning",
            )

    if created:
        db.commit()
        for n in created:
            db.refresh(n)

    return created
