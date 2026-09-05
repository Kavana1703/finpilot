# 💰 FinPilot — Complete Build (Phases 1–6)

Full-stack personal finance manager, built in phases.

- **Phase 1** — project structure, database, working authentication end-to-end
  (register, login, logout, forgot/reset password, change password, `/auth/me`).
- **Phase 2** — Categories (with sensible defaults), Income CRUD, Expense CRUD,
  and a unified Transactions API with search/filter/sort/pagination, all
  backed by one `transactions` table as the spec calls for.
- **Phase 3** — Budgets (live spend tracking + status per category/month),
  Subscriptions (monthly/yearly totals + renewal countdowns), and the Bill
  Splitter (even split across named participants with paid/unpaid tracking).
- **Phase 4** — the real Dashboard (live totals, category pie chart, recent
  activity, upcoming renewals, generated notifications), a full Analytics
  page (category breakdown, 6-month income vs. expense trend, daily spending
  line, month-over-month change), and the monthly spending prediction from
  spec section 12 using the simple average-daily-spend method.
- **Phase 5** — persisted in-app notifications (a real `notifications` table,
  bell dropdown, mark-read), downloadable PDF and CSV financial reports, a
  global transaction search bar in the header, and a responsive mobile layout
  (slide-out menu + bottom nav on small screens).
- **Phase 6** — Alembic migrations (replacing the dev-only auto-schema),
  a GitHub Actions CI pipeline that applies migrations against a real
  Postgres and builds both apps on every push, and deploy configs for
  Render (backend + managed Postgres) and Vercel (frontend).

This covers the entire original spec, end to end.

## Project structure

```
finpilot/
├── .github/workflows/ci.yml   # backend migrations+import check, frontend build
├── render.yaml                 # Render blueprint: API + managed Postgres
├── backend/                # FastAPI
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py               # wired to app.config + app.models
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 0001_initial_schema.py   # full 8-table schema
│   ├── app/
│   │   ├── main.py         # app entrypoint, CORS, router registration
│   │   ├── config.py       # env-based settings
│   │   ├── database.py     # SQLAlchemy engine/session
│   │   ├── models.py       # ORM models (all 8 tables from the spec)
│   │   ├── schemas.py      # Pydantic request/response schemas (all resources)
│   │   ├── security.py     # bcrypt hashing + JWT
│   │   ├── deps.py         # get_current_user dependency
│   │   ├── crud/
│   │   │   ├── transactions.py   # shared income/expense logic
│   │   │   ├── analytics.py      # shared dashboard + analytics calculations
│   │   │   └── notifications.py  # shared notification-generation rules
│   │   └── routers/
│   │       ├── auth.py           # /auth/* endpoints
│   │       ├── categories.py     # /categories/* + default category seeding
│   │       ├── income.py         # /income/* (type=income wrapper)
│   │       ├── expenses.py       # /expenses/* (type=expense wrapper)
│   │       ├── transactions.py   # /transactions/* (unified search view)
│   │       ├── budgets.py        # /budgets/* (live spend vs limit)
│   │       ├── subscriptions.py  # /subscriptions/* (totals + renewals)
│   │       ├── bills.py          # /bills/* (bill splitter)
│   │       ├── dashboard.py      # /dashboard/summary (one-call overview)
│   │       ├── analytics.py      # /analytics/overview (charts + prediction)
│   │       ├── notifications.py  # /notifications/* (persisted, bell dropdown)
│   │       └── reports.py        # /reports/* (JSON + PDF + CSV export)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React + Vite + Tailwind
│   ├── vercel.json          # SPA rewrite rule for client-side routing
│   ├── src/
│   │   ├── api/             # axios client + one file per resource
│   │   ├── context/         # AuthContext (user session state)
│   │   ├── components/      # ProtectedRoute, Layout, TransactionManager,
│   │   │                    # NotificationBell, GlobalSearch
│   │   ├── pages/           # Login, Register, ForgotPassword, Dashboard,
│   │   │                    # Income, Expenses, Budgets, Subscriptions,
│   │   │                    # Bills, Analytics, Reports
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json         # includes recharts for all Phase 4 charts
│   └── .env.example
└── docker-compose.yml        # local PostgreSQL
```

## How to run it

### 1. Database

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with user `finpilot_user` / password
`finpilot_pass` / database `finpilot` (matches `.env.example`).

Don't have Docker? Install PostgreSQL locally and create a database called
`finpilot`, then point `DATABASE_URL` in `.env` at it.

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit SECRET_KEY at minimum
alembic upgrade head            # creates all tables via migrations
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Swagger docs at
`http://localhost:8000/docs` — you can register/login and test every
endpoint from there without touching the frontend.

Schema is owned by Alembic now (`backend/alembic/versions/`), not by
`Base.metadata.create_all()`. If you change a model in `app/models.py`,
generate a new migration instead of relying on auto-create:

```bash
alembic revision --autogenerate -m "describe the change"
# review the generated file in alembic/versions/ before applying
alembic upgrade head
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 4. Try it end to end

1. Go to `http://localhost:5173/register`, create an account.
2. You're auto-logged-in and redirected to `/dashboard`.
3. Refresh the page — session persists via the JWT in `localStorage`.
4. Log out, log back in at `/login`.
5. Try `/forgot-password` — since there's no email provider yet, the reset
   token is printed to the **backend console** (`[DEV] Password reset token
   for ...`). Grab it from there to test `/auth/reset-password` via Swagger.

## What's implemented

**Phase 1**
- ✅ User model + all 8 spec tables scaffolded (`models.py`) so later
  phases don't need schema surgery
- ✅ Register / Login / Logout, JWT auth (bcrypt + `python-jose`)
- ✅ Forgot password / Reset password (dev-mode token logging, swap for
  real email in a later phase), Change password, `GET /auth/me`
- ✅ CORS wired to the frontend origin
- ✅ React app with routing, protected routes, auth context, sidebar nav
  shell, and a dashboard placeholder

**Phase 2**
- ✅ Default categories (`Food`, `Travel`, `Salary`, etc.) auto-seeded on
  startup; users can also add their own custom categories
- ✅ `GET/POST /categories`, `DELETE /categories/{id}`
- ✅ Income CRUD at `/income` (add/edit/delete/list, search by description,
  filter by category & date, sort, pagination)
- ✅ Expense CRUD at `/expenses` — same shape, plus payment method filter
- ✅ Unified `/transactions` endpoint (spec section 7) for cross-type search
  — same underlying table, powers the eventual global search bar
- ✅ Frontend: `/income` and `/expenses` pages with add/edit forms, search
  bar, category filter, sortable columns, pagination — sharing one
  `TransactionManager` component so both stay in sync with the backend shape

**Phase 3**
- ✅ Budgets: one cap per category per month; `spent`/`remaining`/`percent_used`
  are always computed live against real transactions (no stale cached totals)
  — status flips to `near_limit` at 80% used and `exceeded` past 100%
- ✅ `GET/POST/PUT/DELETE /budgets` (scoped by `month`/`year` query params)
- ✅ Subscriptions: monthly-equivalent normalization across monthly/yearly/
  weekly frequencies, plus `days_until_renewal` on every response
- ✅ `GET /subscriptions` returns totals (`monthly_total`, `yearly_total`,
  active/cancelled counts) alongside the list — no separate summary call
- ✅ `POST/PUT/DELETE /subscriptions`, `POST /subscriptions/{id}/cancel`
- ✅ Bill Splitter: even split across named participants, per-person paid/
  unpaid tracking — `GET/POST/DELETE /bills`, `PATCH .../participants/{id}`
- ✅ Frontend: **Budgets** page with month/year picker and progress bars per
  category; **Subscriptions** page with totals cards and renewal countdowns;
  **Bill Splitter** page with dynamic participant fields and a paid/unpaid
  toggle per person

**Phase 4**
- ✅ `crud/analytics.py` — shared calculation layer (category breakdown,
  daily spending, 6-month trend, month bounds, the spending prediction) used
  by both the dashboard and analytics endpoints so the numbers always agree
- ✅ `GET /dashboard/summary` — one call returns income/expenses/balance,
  budget totals, subscription totals, predicted spend, recent transactions,
  category breakdown, upcoming renewals, and generated notification strings
- ✅ `GET /analytics/overview` — category breakdown, 6-month income-vs-expense
  trend, daily spending for the selected month, highest category, and
  month-over-month % change in expenses
- ✅ Spending prediction implemented exactly per spec section 12: simple
  average-daily-spend projected across the full month, no ML
- ✅ Frontend: real **Dashboard** with live cards, a category pie chart,
  recent transactions, upcoming subscriptions, and notification banners;
  new **Analytics** page with pie/bar/line charts (Recharts) and a
  month/year picker

**Phase 5**
- ✅ Notifications are now real, persisted rows (not recomputed strings) —
  `crud/notifications.py` checks the same conditions as the dashboard
  (budget warnings/exceeded, renewals within 3 days, predicted overspend)
  and inserts new rows, skipping duplicates so repeat checks don't spam
- ✅ `GET/POST /notifications`, `/notifications/generate`,
  `PATCH .../{id}/read`, `POST .../read-all`, `DELETE .../{id}`
- ✅ `GET /reports/summary` (JSON), `/reports/pdf` (ReportLab-generated PDF),
  `/reports/csv` (transaction export) — all scoped by month/year
- ✅ Frontend: bell-icon dropdown (`NotificationBell.jsx`) generating and
  showing notifications, wired into the header on every page
- ✅ Global search bar in the header (`GlobalSearch.jsx`) — debounced,
  searches across income + expenses via the unified `/transactions` endpoint
- ✅ **Reports** page with a month/year picker, on-screen summary, and
  Download PDF / Download CSV buttons
- ✅ Responsive polish: slide-out mobile menu, bottom tab bar on small
  screens, header collapses the search bar on mobile

**Phase 6**
- ✅ Alembic wired up (`alembic/env.py` reads `DATABASE_URL` from the same
  `.env` the app uses, and targets `app.models` directly so
  `--autogenerate` compares against the real schema)
- ✅ `0001_initial_schema.py` — hand-reviewed initial migration creating all
  8 tables, indexes, foreign keys (with sensible `ondelete` behavior), and
  the 3 Postgres enums, with a matching `downgrade()`
- ✅ `app/main.py` no longer calls `Base.metadata.create_all()` — schema is
  now owned entirely by migrations, the correct pattern for a real app
- ✅ `backend/Dockerfile` — production image; Render runs `alembic upgrade
  head` as a pre-deploy command before starting `uvicorn`
- ✅ `render.yaml` — one-click Render Blueprint: web service + managed
  Postgres, `SECRET_KEY` auto-generated, `DATABASE_URL` auto-wired from the
  database resource
- ✅ `frontend/vercel.json` — Vite build config + SPA rewrite so client-side
  routing (`/dashboard`, `/income`, etc.) doesn't 404 on refresh
- ✅ `.github/workflows/ci.yml` — on every push/PR: spins up a real Postgres
  service container, installs backend deps, runs `alembic upgrade head`
  against it, imports the FastAPI app to catch router/wiring errors, then
  separately installs frontend deps and runs `npm run build`
- ✅ `.gitignore` / `backend/.dockerignore` — env files, `venv/`,
  `node_modules/`, `__pycache__/`, build output all excluded

### Try Phase 2

1. Log in, go to the sidebar → **Income** or **Expenses**.
2. Click **+ Add Income/Expense**, fill amount/category/date, save.
3. Search by description, filter by category, click column headers to sort.
4. Edit or delete any row inline.

### Try Phase 3

1. **Budgets** — pick a month/year, add a budget for an expense category,
   then add some expenses in that category (Phase 2 page) and come back —
   the progress bar and status update automatically.
2. **Subscriptions** — add Netflix (₹649/monthly), Amazon Prime (₹1499/yearly)
   — watch the monthly total blend both correctly, and check the renewal
   countdown text.
3. **Bill Splitter** — split a ₹2,400 restaurant bill across 4 people, then
   toggle each person's paid status.

### Try Phase 4

1. Add a few income and expense entries across different categories and a
   couple of different dates this month (Phase 2 pages), plus a budget or
   two (Phase 3 page).
2. Go to **Dashboard** — every card is now real: income, expenses, balance,
   budget remaining, subscription total, and predicted month-end spend.
   Budget warnings/exceeded and subscription-renewal notices appear as
   banners automatically once you cross a threshold.
3. Go to **Analytics** — switch months with the picker at the top. You'll
   see a category pie + bar, a 6-month income-vs-expenses trend, a daily
   spending line for the selected month, and month-over-month % change.
4. The spending prediction (🔮 card) uses the exact method from the spec:
   `(spend so far ÷ days elapsed) × days in month` — no ML, just math.

### Try Phase 5

1. Click the 🔔 bell in the top-right on any page — it generates fresh
   notifications from your current budgets/subscriptions and lists them.
   Click one to mark it read, or "Mark all read."
2. Try the search bar in the header — type part of an expense description
   (e.g. "coffee") and watch results appear as you type.
3. Go to **Reports**, pick a month, and click **Download PDF** — a real
   PDF opens with income/expenses/savings, category breakdown, and budget
   status tables. Try **Download CSV** too — it's every transaction for
   that month, ready for a spreadsheet.
4. Shrink your browser window (or open on a phone) — the sidebar becomes a
   hamburger menu + bottom tab bar.

### Try Phase 6

1. Delete your local database and recreate it, then run `alembic upgrade
   head` in `backend/` instead of relying on auto-create — confirm the app
   still starts and all 8 tables exist (`\dt` in `psql`).
2. Change a field in `app/models.py` (e.g. add a column), then run
   `alembic revision --autogenerate -m "test change"` and look at the
   generated file in `alembic/versions/` — review before applying.
3. Push this repo to GitHub and check the **Actions** tab — the CI workflow
   spins up Postgres, migrates it, and verifies the app imports cleanly,
   plus builds the frontend, on every push.

### Deploying it for real

**Backend + database (Render):**
1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and point it at the repo — it
   reads `render.yaml` and provisions the API service and a managed
   Postgres database together.
3. `SECRET_KEY` is auto-generated and `DATABASE_URL` is auto-wired from the
   database. After the frontend is deployed (next step), set
   `FRONTEND_ORIGIN` on the Render service to your Vercel URL so CORS
   allows it.
4. Render runs `alembic upgrade head` as the pre-deploy command automatically
   — no manual migration step needed on deploy.

**Frontend (Vercel):**
1. Import the repo in Vercel, set the project root to `frontend/`.
2. It auto-detects Vite via `vercel.json`; set the environment variable
   `VITE_API_URL` to your Render API URL (e.g.
   `https://finpilot-api.onrender.com`).
3. Deploy. `vercel.json`'s rewrite rule keeps client-side routes like
   `/dashboard` working on refresh instead of 404ing.

## What's not built (intentionally, per the spec)

The original spec explicitly excluded these for v1, so they're not here:
SMS transaction tracking, Google Pay / bank integration, automatic
transaction detection, and real email delivery for password resets (which
currently logs the reset token to the backend console instead — swap
`print()` in `routers/auth.py` for an email provider like Resend or SES
when you're ready). A future iteration could also add a `pytest` suite —
the CI workflow already has a placeholder comment for wiring it in.

This completes the entire original spec, phase by phase, end to end.
