"""
Shared transaction logic. Income and Expense are both stored as rows in the
`transactions` table (see spec section 7), distinguished by `type`. The
/income and /expenses routers are thin wrappers around these functions with
`type` pinned, so the frontend gets dedicated pages while the backend has
one source of truth (also what powers the unified /transactions search).
"""
from datetime import date as date_type

from fastapi import HTTPException
from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from app import models, schemas


def _to_out(t: models.Transaction) -> schemas.TransactionOut:
    return schemas.TransactionOut(
        id=t.id,
        type=t.type.value,
        amount=t.amount,
        category_id=t.category_id,
        category_name=t.category.name if t.category else None,
        description=t.description,
        date=t.date,
        payment_method=t.payment_method,
        created_at=t.created_at,
    )


def create_transaction(
    db: Session, user_id: str, payload: schemas.TransactionCreate, forced_type: str | None = None
) -> schemas.TransactionOut:
    tx_type = forced_type or payload.type

    if payload.category_id:
        category = (
            db.query(models.Category)
            .filter(
                models.Category.id == payload.category_id,
                or_(models.Category.user_id.is_(None), models.Category.user_id == user_id),
            )
            .first()
        )
        if not category:
            raise HTTPException(status_code=400, detail="Invalid category_id")

    tx = models.Transaction(
        user_id=user_id,
        type=tx_type,
        amount=payload.amount,
        category_id=payload.category_id,
        description=payload.description,
        date=payload.date,
        payment_method=payload.payment_method,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return _to_out(tx)


def list_transactions(
    db: Session,
    user_id: str,
    *,
    forced_type: str | None = None,
    search: str | None = None,
    category_id: str | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    payment_method: str | None = None,
    sort_by: str = "date",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 20,
) -> schemas.TransactionListResponse:
    query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id)

    if forced_type:
        query = query.filter(models.Transaction.type == forced_type)
    if search:
        like = f"%{search}%"
        query = query.filter(models.Transaction.description.ilike(like))
    if category_id:
        query = query.filter(models.Transaction.category_id == category_id)
    if date_from:
        query = query.filter(models.Transaction.date >= date_from)
    if date_to:
        query = query.filter(models.Transaction.date <= date_to)
    if min_amount is not None:
        query = query.filter(models.Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(models.Transaction.amount <= max_amount)
    if payment_method:
        query = query.filter(models.Transaction.payment_method == payment_method)

    total = query.count()

    sort_column = {
        "date": models.Transaction.date,
        "amount": models.Transaction.amount,
        "created_at": models.Transaction.created_at,
    }.get(sort_by, models.Transaction.date)
    direction = desc if sort_dir == "desc" else asc
    query = query.order_by(direction(sort_column), direction(models.Transaction.created_at))

    query = query.offset((page - 1) * page_size).limit(page_size)
    items = [_to_out(t) for t in query.all()]

    return schemas.TransactionListResponse(items=items, total=total, page=page, page_size=page_size)


def get_transaction(db: Session, user_id: str, tx_id: str) -> models.Transaction:
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == tx_id, models.Transaction.user_id == user_id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


def update_transaction(
    db: Session, user_id: str, tx_id: str, payload: schemas.TransactionUpdate
) -> schemas.TransactionOut:
    tx = get_transaction(db, user_id, tx_id)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)
    return _to_out(tx)


def delete_transaction(db: Session, user_id: str, tx_id: str) -> None:
    tx = get_transaction(db, user_id, tx_id)
    db.delete(tx)
    db.commit()
