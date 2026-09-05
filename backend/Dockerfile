# Production image for the FinPilot API.
# Render (or any container host) builds this, runs migrations, then starts uvicorn.
FROM python:3.12-slim

WORKDIR /app

# psycopg2 needs libpq at build time
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Render's "Pre-Deploy Command" should run `alembic upgrade head` before
# this starts (see render.yaml). Locally with plain `docker run`, run the
# migration manually first: `docker run <image> alembic upgrade head`.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
