# VANTAGE Sales Intelligence

VANTAGE is an enterprise sales analytics workspace for governed PostgreSQL data, operational insights, and executive reporting. It includes a FastAPI service, a React and TypeScript dashboard, a PostgreSQL star schema, synthetic data tooling, and JWT authentication.

## Features

- Secure sign-in, signup, session restoration, and logout
- Protected dashboard and filter API routes
- Live PostgreSQL warehouse mode with preview fallback
- Date, customer, region, and category filtering
- Executive KPIs, revenue and profit trends, regional and category mix
- Customer contribution and product performance views
- Seven-day revenue forecast based on the selected time series
- Anomaly watchlist for daily movements outside the 15% threshold
- CSV exports for trends and filtered executive reports
- Health endpoint and OpenAPI documentation

## Quick start with Docker

Install and start Docker Desktop, then run these commands from the repository root:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Open the application at [http://localhost:5173](http://localhost:5173). The API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

Create an administrator account after PostgreSQL is ready:

```powershell
$env:PYTHONPATH = "backend"
python backend/scripts/create_user.py --email abdul.daff@example.com --name "Abdul Daff" --role ADMIN
```

The command prompts for the password and never accepts it as a command-line argument.

## Local PostgreSQL workflow

Use this workflow when PostgreSQL is installed locally instead of running it through Docker.

1. Create a PostgreSQL database named `sales_analytics` and a login named `sales_app`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your local connection.
3. Apply the schema and load the generated warehouse data:

```powershell
cd C:\Users\abdul\OneDrive\Desktop\Sales-Analytics-Dashboard

$env:PYTHONPATH = "backend"
psql -U postgres -d sales_analytics -f database/init.sql

cd data-platform
python scripts/generate_synthetic_data.py --orders 25000 --customers 2000 --output-dir data/generated
python scripts/validate_sales_extract.py data/generated/fact_sales.csv

$env:DATABASE_URL = "postgresql://sales_app:change-me-locally@localhost:5432/sales_analytics"
python scripts/load_to_postgres.py --input-dir data/generated --replace
```

Start the API in a new terminal:

```powershell
cd C:\Users\abdul\OneDrive\Desktop\Sales-Analytics-Dashboard\backend
$env:PYTHONPATH = "."
uvicorn app.main:app --reload
```

Start the frontend in another terminal:

```powershell
cd C:\Users\abdul\OneDrive\Desktop\Sales-Analytics-Dashboard\frontend
npm install
npm run dev
```

The dashboard should display `LIVE` after the warehouse is loaded.

## Signup and authentication

New users can select **Need access? Create an account** on the VANTAGE sign-in screen. Signup creates an `ANALYST` account and requires a password with at least 12 characters. Administrator and manager roles should be created through the server-side user script.

The main authentication endpoints are:

```text
POST /api/v1/auth/token
POST /api/v1/auth/register
GET  /api/v1/auth/me
```

Dashboard endpoints require a bearer token:

```text
GET /api/v1/dashboard/overview
GET /api/v1/dashboard/filters
```

## Validation commands

Backend tests:

```powershell
$env:PYTHONPATH = "backend"
pytest backend/tests -q
```

Frontend lint and production build:

```powershell
cd frontend
npm run lint
npm run build
```

Health check:

```text
http://localhost:8000/api/v1/health
```

## Repository structure

```text
backend/             FastAPI API, authentication, services, persistence
frontend/            React and TypeScript VANTAGE dashboard
data-platform/       Data generation, validation, and PostgreSQL loading
ml/                  Feature and model pipeline area
database/            PostgreSQL warehouse bootstrap SQL
docs/                Architecture and technical documentation
```

See [docs/architecture.md](docs/architecture.md) for the system architecture.
