"""
Expense endpoints (spec section 6). Same pattern as income.py, pinned to
type=expense. Kept as a separate file (rather than one generic router) so
routes read as /income/... and /expenses/... in Swagger, matching the spec's
mental model even though both share crud/transactions.py underneath.
"""
from datetime import date as date_type

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.crud import transactions as crud

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=schemas.TransactionListResponse)
def list_expenses(
    search: str | None = None,
    category_id: str | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    payment_method: str | None = None,
    sort_by: str = Query("date", description="date | amount | created_at"),
    sort_dir: str = Query("desc", description="asc | desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.list_transactions(
        db, current_user.id,
        forced_type="expense", search=search, category_id=category_id,
        date_from=date_from, date_to=date_to, payment_method=payment_method,
        sort_by=sort_by, sort_dir=sort_dir,
        page=page, page_size=page_size,
    )


@router.post("", response_model=schemas.TransactionOut, status_code=201)
def add_expense(
    payload: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.create_transaction(db, current_user.id, payload, forced_type="expense")


@router.put("/{tx_id}", response_model=schemas.TransactionOut)
def edit_expense(
    tx_id: str,
    payload: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.update_transaction(db, current_user.id, tx_id, payload)


@router.delete("/{tx_id}", status_code=204)
def delete_expense(
    tx_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    crud.delete_transaction(db, current_user.id, tx_id)
