"""
Financial report endpoints (spec section 14).

  GET /reports/summary?month=&year=      JSON version (powers the Reports page)
  GET /reports/pdf?month=&year=          downloadable PDF
  GET /reports/csv?month=&year=          downloadable CSV of transactions
"""
import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.crud import analytics
from app.routers.budgets import _budget_status
from app.routers.subscriptions import _to_out as subscription_to_out

router = APIRouter(prefix="/reports", tags=["reports"])

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _build_report(db: Session, user_id: str, month: int, year: int) -> schemas.FinancialReport:
    start, end = analytics.month_bounds(year, month)

    total_income = analytics.sum_transactions(db, user_id, "income", start, end)
    total_expenses = analytics.sum_transactions(db, user_id, "expense", start, end)
    category_data = analytics.category_breakdown(db, user_id, "expense", start, end)
    highest = category_data[0] if category_data else None

    budgets = (
        db.query(models.Budget)
        .filter(models.Budget.user_id == user_id, models.Budget.month == month, models.Budget.year == year)
        .all()
    )
    budget_lines = [
        schemas.BudgetLineReport(
            category_name=bs.category_name, budget_amount=bs.amount, spent=bs.spent, status=bs.status
        )
        for bs in (_budget_status(db, user_id, b) for b in budgets)
    ]

    subs = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == user_id, models.Subscription.status == "active")
        .all()
    )
    subs_total = round(sum(subscription_to_out(s).monthly_equivalent for s in subs), 2)

    return schemas.FinancialReport(
        month=month,
        year=year,
        label=f"{MONTH_NAMES[month - 1]} {year}",
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        savings=round(total_income - total_expenses, 2),
        highest_category=highest,
        subscriptions_monthly_total=subs_total,
        budgets=budget_lines,
        category_breakdown=category_data,
    )


@router.get("/summary", response_model=schemas.FinancialReport)
def get_report_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _build_report(db, current_user.id, month, year)


@router.get("/pdf")
def get_report_pdf(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = _build_report(db, current_user.id, month, year)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(f"FinPilot Financial Report — {report.label}", styles["Title"]),
        Spacer(1, 12),
    ]

    summary_data = [
        ["Income", f"₹{report.total_income:,.2f}"],
        ["Expenses", f"₹{report.total_expenses:,.2f}"],
        ["Savings", f"₹{report.savings:,.2f}"],
        ["Subscriptions (monthly)", f"₹{report.subscriptions_monthly_total:,.2f}"],
        ["Highest Category", f"{report.highest_category.category_name} — ₹{report.highest_category.amount:,.2f}" if report.highest_category else "—"],
    ]
    summary_table = Table(summary_data, colWidths=[8 * cm, 8 * cm])
    summary_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
    ]))
    elements += [summary_table, Spacer(1, 20)]

    elements.append(Paragraph("Spending by Category", styles["Heading2"]))
    if report.category_breakdown:
        cat_data = [["Category", "Amount"]] + [
            [c.category_name, f"₹{c.amount:,.2f}"] for c in report.category_breakdown
        ]
        cat_table = Table(cat_data, colWidths=[10 * cm, 6 * cm])
        cat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#059669")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ]))
        elements += [cat_table, Spacer(1, 20)]
    else:
        elements.append(Paragraph("No expenses recorded this month.", styles["Normal"]))
        elements.append(Spacer(1, 20))

    elements.append(Paragraph("Budget Status", styles["Heading2"]))
    if report.budgets:
        status_labels = {"within_budget": "Within Budget", "near_limit": "Near Limit", "exceeded": "Exceeded"}
        budget_data = [["Category", "Budget", "Spent", "Status"]] + [
            [b.category_name, f"₹{b.budget_amount:,.2f}", f"₹{b.spent:,.2f}", status_labels[b.status]]
            for b in report.budgets
        ]
        budget_table = Table(budget_data, colWidths=[6 * cm, 4 * cm, 4 * cm, 4 * cm])
        budget_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#059669")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ]))
        elements.append(budget_table)
    else:
        elements.append(Paragraph("No budgets set this month.", styles["Normal"]))

    doc.build(elements)
    buffer.seek(0)

    filename = f"finpilot-report-{year}-{month:02d}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/csv")
def get_report_csv(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    start, end = analytics.month_bounds(year, month)
    transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.date >= start,
            models.Transaction.date <= end,
        )
        .order_by(models.Transaction.date.asc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Type", "Category", "Description", "Payment Method", "Amount"])
    for t in transactions:
        writer.writerow([
            t.date.isoformat(),
            t.type.value,
            t.category.name if t.category else "",
            t.description or "",
            t.payment_method or "",
            f"{t.amount:.2f}",
        ])
    buffer.seek(0)

    filename = f"finpilot-transactions-{year}-{month:02d}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
