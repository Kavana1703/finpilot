"""
Category endpoints.

Categories are either:
  - global defaults (user_id = NULL) — seeded once at startup, visible to everyone
  - user-created custom categories (user_id = the owning user)

  GET  /categories?type=income|expense   list categories available to the user
  POST /categories                       create a custom category
  DELETE /categories/{id}                delete a custom category (not defaults)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])

DEFAULT_EXPENSE_CATEGORIES = [
    "Food", "Travel", "Shopping", "Bills", "Rent",
    "Entertainment", "Education", "Healthcare", "Groceries", "Other",
]
DEFAULT_INCOME_CATEGORIES = [
    "Salary", "Freelance", "Allowance", "Scholarship", "Gift", "Other",
]


def seed_default_categories(db: Session):
    """Idempotently ensure the default categories exist. Called on app startup."""
    existing = {
        (c.name, c.type.value)
        for c in db.query(models.Category).filter(models.Category.user_id.is_(None)).all()
    }

    to_add = []
    for name in DEFAULT_EXPENSE_CATEGORIES:
        if (name, "expense") not in existing:
            to_add.append(models.Category(name=name, type=models.TransactionType.expense))
    for name in DEFAULT_INCOME_CATEGORIES:
        if (name, "income") not in existing:
            to_add.append(models.Category(name=name, type=models.TransactionType.income))

    if to_add:
        db.add_all(to_add)
        db.commit()


@router.get("", response_model=list[schemas.CategoryOut])
def list_categories(
    type: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Category).filter(
        or_(models.Category.user_id.is_(None), models.Category.user_id == current_user.id)
    )
    if type:
        query = query.filter(models.Category.type == type)
    return query.order_by(models.Category.name).all()


@router.post("", response_model=schemas.CategoryOut, status_code=201)
def create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category = models.Category(
        name=payload.name,
        type=payload.type,
        user_id=current_user.id,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category = (
        db.query(models.Category)
        .filter(models.Category.id == category_id, models.Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found (default categories can't be deleted)",
        )
    db.delete(category)
    db.commit()
