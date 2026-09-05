"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-08-09

Creates all 8 tables from the spec (users, categories, transactions,
budgets, subscriptions, bills, bill_participants, notifications) in
dependency order, matching app/models.py exactly. This replaces the
Base.metadata.create_all() auto-schema used in Phases 1-5 — from here on,
schema changes should be made via `alembic revision --autogenerate`
followed by a manual review of the generated migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

transaction_type_enum = postgresql.ENUM("income", "expense", name="transactiontype")
subscription_frequency_enum = postgresql.ENUM(
    "monthly", "yearly", "weekly", name="subscriptionfrequency"
)
subscription_status_enum = postgresql.ENUM(
    "active", "cancelled", name="subscriptionstatus"
)


def upgrade() -> None:
    bind = op.get_bind()
    transaction_type_enum.create(bind, checkfirst=True)
    subscription_frequency_enum.create(bind, checkfirst=True)
    subscription_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "categories",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", transaction_type_enum, nullable=False),
        sa.Column(
            "user_id", sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True,
        ),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id", sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("type", transaction_type_enum, nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column(
            "category_id", sa.String(),
            sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_date", "transactions", ["date"])

    op.create_table(
        "budgets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id", sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column(
            "category_id", sa.String(),
            sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_budgets_user_month_year", "budgets", ["user_id", "month", "year"])

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id", sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("frequency", subscription_frequency_enum, nullable=False),
        sa.Column("next_payment_date", sa.Date(), nullable=False),
        sa.Column("status", subscription_status_enum, server_default="active"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])

    op.create_table(
        "bills",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id", sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_bills_user_id", "bills", ["user_id"])

    op.create_table(
        "bill_participants",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "bill_id", sa.String(),
            sa.ForeignKey("bills.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("share_amount", sa.Float(), nullable=False),
        sa.Column("paid", sa.Boolean(), server_default=sa.false()),
    )
    op.create_index("ix_bill_participants_bill_id", "bill_participants", ["bill_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id", sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("bill_participants")
    op.drop_table("bills")
    op.drop_table("subscriptions")
    op.drop_table("budgets")
    op.drop_table("transactions")
    op.drop_table("categories")
    op.drop_table("users")

    bind = op.get_bind()
    subscription_status_enum.drop(bind, checkfirst=True)
    subscription_frequency_enum.drop(bind, checkfirst=True)
    transaction_type_enum.drop(bind, checkfirst=True)
