"""
Budget endpoints (spec section 8). A budget is a per-category monthly cap.
Status is computed live against the `transactions` table — no separate
"spent" column to keep in sync, it's always derived from real data.

  GET    /budgets?month=&year=     list budgets for a month with spend status
  POST   /budgets                  create a budget (category+month+year unique)
  PUT    /budgets/{id}             update the amount
  DELETE /budgets/{id}             remove a budget
"""
from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/budgets", tags=["budgets"])

NEAR_LIMIT_THRESHOLD = 0.8  # 80% used triggers a "near limit" warning


def _budget_status(db: Session, user_id: str, budget: models.Budget) -> schemas.BudgetStatus:
    days_in_month = monthrange(budget.year, budget.month)[1]
    start = date(budget.year, budget.month, 1)
    end = date(budget.year, budget.month, days_in_month)

    spent = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == models.TransactionType.expense,
            models.Transaction.category_id == budget.category_id,
            models.Transaction.date >= start,
            models.Transaction.date <= end,
        )
        .scalar()
    )
    spent = float(spent)
    percent_used = round((spent / budget.amount) * 100, 1) if budget.amount else 0.0

    if spent > budget.amount:
        status = "exceeded"
    elif percent_used >= NEAR_LIMIT_THRESHOLD * 100:
        status = "near_limit"
    else:
        status = "within_budget"

    return schemas.BudgetStatus(
        id=budget.id,
        category_id=budget.category_id,
        category_name=budget.category.name,
        amount=budget.amount,
        month=budget.month,
        year=budget.year,
        spent=spent,
        remaining=round(budget.amount - spent, 2),
        percent_used=percent_used,
        status=status,
    )


@router.get("", response_model=list[schemas.BudgetStatus])
def list_budgets(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    budgets = (
        db.query(models.Budget)
        .filter(
            models.Budget.user_id == current_user.id,
            models.Budget.month == month,
            models.Budget.year == year,
        )
        .all()
    )
    return [_budget_status(db, current_user.id, b) for b in budgets]


@router.post("", response_model=schemas.BudgetStatus, status_code=201)
def create_budget(
    payload: schemas.BudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = (
        db.query(models.Budget)
        .filter(
            models.Budget.user_id == current_user.id,
            models.Budget.category_id == payload.category_id,
            models.Budget.month == payload.month,
            models.Budget.year == payload.year,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A budget for this category and month already exists — edit it instead",
        )

    category = db.query(models.Category).filter(models.Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category_id")

    budget = models.Budget(
        user_id=current_user.id,
        category_id=payload.category_id,
        amount=payload.amount,
        month=payload.month,
        year=payload.year,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _budget_status(db, current_user.id, budget)


@router.put("/{budget_id}", response_model=schemas.BudgetStatus)
def update_budget(
    budget_id: str,
    payload: schemas.BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    budget = (
        db.query(models.Budget)
        .filter(models.Budget.id == budget_id, models.Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if payload.amount is not None:
        budget.amount = payload.amount

    db.commit()
    db.refresh(budget)
    return _budget_status(db, current_user.id, budget)


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    budget = (
        db.query(models.Budget)
        .filter(models.Budget.id == budget_id, models.Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
