"""
Bill splitter endpoints (spec section 11). Splits a total evenly across
named participants and tracks who's paid.

  GET    /bills                          list all bills with participants
  POST   /bills                          create a bill (auto-splits evenly)
  PATCH  /bills/{id}/participants/{pid}  toggle a participant's paid status
  DELETE /bills/{id}                     remove a bill
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/bills", tags=["bills"])


@router.get("", response_model=list[schemas.BillOut])
def list_bills(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Bill)
        .options(joinedload(models.Bill.participants))
        .filter(models.Bill.user_id == current_user.id)
        .order_by(models.Bill.date.desc())
        .all()
    )


@router.post("", response_model=schemas.BillOut, status_code=201)
def create_bill(
    payload: schemas.BillCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    share = round(payload.total_amount / len(payload.participants), 2)

    bill = models.Bill(
        user_id=current_user.id,
        name=payload.name,
        total_amount=payload.total_amount,
        date=payload.date,
    )
    bill.participants = [
        models.BillParticipant(name=p.name, share_amount=share)
        for p in payload.participants
    ]

    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.patch("/{bill_id}/participants/{participant_id}", response_model=schemas.BillOut)
def set_participant_paid(
    bill_id: str,
    participant_id: str,
    payload: schemas.BillParticipantPaidUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bill = (
        db.query(models.Bill)
        .filter(models.Bill.id == bill_id, models.Bill.user_id == current_user.id)
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    participant = next((p for p in bill.participants if p.id == participant_id), None)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found on this bill")

    participant.paid = payload.paid
    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/{bill_id}", status_code=204)
def delete_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bill = (
        db.query(models.Bill)
        .filter(models.Bill.id == bill_id, models.Bill.user_id == current_user.id)
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()
