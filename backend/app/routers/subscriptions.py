"""
Subscription endpoints (spec sections 9 & 10).

  GET    /subscriptions            list + monthly/yearly totals + counts
  POST   /subscriptions            add a subscription
  PUT    /subscriptions/{id}       edit (amount, frequency, status, etc.)
  DELETE /subscriptions/{id}       remove
  POST   /subscriptions/{id}/cancel   convenience: mark status=cancelled

Renewal reminders: `days_until_renewal` is computed on every response so the
frontend/dashboard can flag "renews in N days" without a separate job. A
real notification row (spec section 16) gets created for this in Phase 5.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def _monthly_equivalent(amount: float, frequency: str) -> float:
    if frequency == "monthly":
        return amount
    if frequency == "yearly":
        return round(amount / 12, 2)
    if frequency == "weekly":
        return round(amount * 52 / 12, 2)
    return amount


def _to_out(sub: models.Subscription) -> schemas.SubscriptionOut:
    days_left = (sub.next_payment_date - date.today()).days
    return schemas.SubscriptionOut(
        id=sub.id,
        name=sub.name,
        amount=sub.amount,
        frequency=sub.frequency.value,
        next_payment_date=sub.next_payment_date,
        status=sub.status.value,
        monthly_equivalent=_monthly_equivalent(sub.amount, sub.frequency.value),
        days_until_renewal=days_left,
        created_at=sub.created_at,
    )


@router.get("", response_model=schemas.SubscriptionSummary)
def list_subscriptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    subs = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id)
        .order_by(models.Subscription.next_payment_date.asc())
        .all()
    )
    out = [_to_out(s) for s in subs]

    active = [s for s in out if s.status == "active"]
    monthly_total = round(sum(s.monthly_equivalent for s in active), 2)

    return schemas.SubscriptionSummary(
        subscriptions=out,
        monthly_total=monthly_total,
        yearly_total=round(monthly_total * 12, 2),
        active_count=len(active),
        cancelled_count=len(out) - len(active),
    )


@router.post("", response_model=schemas.SubscriptionOut, status_code=201)
def create_subscription(
    payload: schemas.SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sub = models.Subscription(
        user_id=current_user.id,
        name=payload.name,
        amount=payload.amount,
        frequency=payload.frequency,
        next_payment_date=payload.next_payment_date,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return _to_out(sub)


def _get_owned_subscription(db: Session, user_id: str, sub_id: str) -> models.Subscription:
    sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.id == sub_id, models.Subscription.user_id == user_id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.put("/{sub_id}", response_model=schemas.SubscriptionOut)
def update_subscription(
    sub_id: str,
    payload: schemas.SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sub = _get_owned_subscription(db, current_user.id, sub_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(sub, field, value)
    db.commit()
    db.refresh(sub)
    return _to_out(sub)


@router.post("/{sub_id}/cancel", response_model=schemas.SubscriptionOut)
def cancel_subscription(
    sub_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sub = _get_owned_subscription(db, current_user.id, sub_id)
    sub.status = models.SubscriptionStatus.cancelled
    db.commit()
    db.refresh(sub)
    return _to_out(sub)


@router.delete("/{sub_id}", status_code=204)
def delete_subscription(
    sub_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sub = _get_owned_subscription(db, current_user.id, sub_id)
    db.delete(sub)
    db.commit()
