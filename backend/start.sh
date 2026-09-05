#!/bin/sh
# Runs on every container start (Render free tier doesn't support a separate
# pre-deploy step, so migrations run here instead, right before uvicorn).
# `alembic upgrade head` is safe to run repeatedly — it's a no-op if the
# database is already up to date.
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
