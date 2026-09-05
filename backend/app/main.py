"""
FinPilot API entrypoint.

Run locally with:
    uvicorn app.main:app --reload

Swagger docs at /docs, ReDoc at /redoc (both free via FastAPI).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.config import settings
from app.routers import auth, categories, income, expenses, transactions, budgets, subscriptions, bills, dashboard, analytics, notifications, reports
from app.routers.categories import seed_default_categories

# Schema is now owned by Alembic migrations (see backend/alembic/), not by
# Base.metadata.create_all(). Run `alembic upgrade head` before starting the
# app (locally, in Docker, or as a Render pre-deploy command) to create or
# update tables. This keeps schema changes reviewable and reversible instead
# of the implicit auto-create used in Phases 1-5.

# Seed default categories (Food, Travel, Salary, etc.) once at startup.
_db = SessionLocal()
try:
    seed_default_categories(_db)
finally:
    _db.close()

app = FastAPI(
    title="FinPilot API",
    description="Smart Expense & Subscription Manager backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(income.router)
app.include_router(expenses.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(subscriptions.router)
app.include_router(bills.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "FinPilot API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
