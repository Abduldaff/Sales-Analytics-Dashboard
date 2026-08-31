# Sales Analytics Dashboard

An enterprise-oriented sales intelligence platform for ingesting sales data, serving governed analytics APIs, and presenting executive and operational insights.

## Current milestone

The repository now contains the initial runnable vertical slice:

- FastAPI API with health and executive-dashboard endpoints under `/api/v1`
- React + TypeScript dashboard shell with KPI, trends, category and regional views
- PostgreSQL-ready star-schema initialization SQL
- Docker Compose local runtime for frontend, API, PostgreSQL, and Redis
- A modular layout for data pipelines and machine-learning services

The dashboard deliberately uses seeded preview data until the ingestion pipeline loads the warehouse. This keeps the UI demonstrable while preserving the API contract that will be backed by aggregate warehouse queries.

## Quick start

1. Copy `.env.example` to `.env` and replace the development secrets.
2. Run `docker compose up --build`.
3. Open `http://localhost:5173`; API documentation is at `http://localhost:8000/docs`.

To create a local application user after PostgreSQL has initialized, run:

```powershell
$env:PYTHONPATH = "backend"
python backend/scripts/create_user.py --email admin@example.test --name "Local Admin" --role ADMIN
```

The command prompts for the password; it is never accepted as a command-line value or stored in plain text.

For local API development, create a Python 3.10+ environment and run `pip install -r backend/requirements.txt`, then `uvicorn app.main:app --reload --app-dir backend`.

## Activate live dashboard analytics

The UI starts in preview mode until the warehouse contains data. To activate live figures and the Region/Category filter controls:

```powershell
# 1. Start PostgreSQL (requires Docker Desktop)
docker compose up -d postgres redis

# 2. Generate and validate a local dataset (from data-platform)
cd data-platform
python scripts/generate_synthetic_data.py --output-dir data/generated
python scripts/validate_sales_extract.py data/generated/fact_sales.csv

# 3. Load it into the local warehouse
$env:DATABASE_URL = "postgresql://sales_app:change-me-locally@localhost:5432/sales_analytics"
python scripts/load_to_postgres.py --input-dir data/generated --replace
```

Restart the API if it was already running locally. The dashboard will show `LIVE` and aggregate the loaded warehouse data; selecting a Region or Category immediately updates all charts and KPI cards.

## Structure

```
backend/             FastAPI API, domain services, persistence
frontend/            React dashboard
data-platform/       ingestion, validation and Airflow assets
ml/                  feature and model pipelines
database/            warehouse bootstrap SQL
docs/                architecture and technical documentation
```

See [docs/architecture.md](docs/architecture.md) for the target architecture.
