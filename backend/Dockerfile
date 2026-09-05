# Production image for the FinPilot API.
# Migrations run at container startup via start.sh (Render's free tier
# doesn't support a separate pre-deploy step, so this runs them right
# before uvicorn starts instead — safe to run on every restart).
FROM python:3.12-slim

WORKDIR /app

# psycopg2 needs libpq at build time
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
