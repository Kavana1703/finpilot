"""
Notification endpoints (spec section 16).

  GET   /notifications                 list (newest first) + unread_count
  POST  /notifications/generate        run the rule checks, persist any new ones
  PATCH /notifications/{id}/read       mark one as read
  POST  /notifications/read-all        mark everything read
  DELETE /notifications/{id}           remove one

The frontend calls POST /generate once when the app loads (see Layout.jsx),
then GET to render the bell dropdown — that keeps notification generation
out of every single page's data-fetch path.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.crud.notifications import generate_notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=schemas.NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    items = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(50)
        .all()
    )
    unread_count = sum(1 for n in items if not n.is_read)
    return schemas.NotificationListResponse(items=items, unread_count=unread_count)


@router.post("/generate", response_model=schemas.NotificationListResponse)
def generate(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    generate_notifications(db, current_user.id)
    return list_notifications(db=db, current_user=current_user)


@router.patch("/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    note = (
        db.query(models.Notification)
        .filter(models.Notification.id == notification_id, models.Notification.user_id == current_user.id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")
    note.is_read = True
    db.commit()
    db.refresh(note)
    return note


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    note = (
        db.query(models.Notification)
        .filter(models.Notification.id == notification_id, models.Notification.user_id == current_user.id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(note)
    db.commit()
