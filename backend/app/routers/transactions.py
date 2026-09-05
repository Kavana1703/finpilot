"""
Unified transaction endpoints (spec section 7). Covers both income and
expense rows and is what the global search bar and Transactions view hit.
For dedicated Income/Expense pages, see routers/income.py and expenses.py —
they call the same crud functions with `type` pinned.
"""
from datetime import date as date_type

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.crud import transactions as crud

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=schemas.TransactionListResponse)
def list_transactions(
    search: str | None = None,
    type: str | None = Query(None, description="income | expense"),
    category_id: str | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
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
        forced_type=type, search=search, category_id=category_id,
        date_from=date_from, date_to=date_to,
        min_amount=min_amount, max_amount=max_amount,
        payment_method=payment_method,
        sort_by=sort_by, sort_dir=sort_dir,
        page=page, page_size=page_size,
    )


@router.post("", response_model=schemas.TransactionOut, status_code=201)
def create_transaction(
    payload: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.create_transaction(db, current_user.id, payload)


@router.put("/{tx_id}", response_model=schemas.TransactionOut)
def update_transaction(
    tx_id: str,
    payload: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.update_transaction(db, current_user.id, tx_id, payload)


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(
    tx_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    crud.delete_transaction(db, current_user.id, tx_id)
