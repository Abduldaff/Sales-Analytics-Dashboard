# Architecture

The system follows a layered, warehouse-first architecture:

`Sources → ingestion → validation → transformations → PostgreSQL analytics schema → API aggregates → React dashboard`

Source connectors write raw, immutable extracts to object storage. Airflow orchestrates validation, deduplication, enrichment, and loads. The serving API exposes only aggregated and paginated data through `/api/v1`; browsers never query the warehouse directly.

## Boundaries

| Layer | Responsibility |
| --- | --- |
| `frontend` | UX, filters, visualization, authenticated API calls |
| `backend/app/api` | HTTP validation, response contracts, authorization |
| `backend/app/services` | KPI and analytical business logic |
| `backend/app/db` | SQLAlchemy sessions and repository access |
| `data-platform` | ingestion, quality validation, transformations, orchestration |
| `ml` | feature creation, training, inference and experiment tracking |
| `database` | analytical star schema and views |

## Initial delivery plan

1. Establish API/UI contracts and a preview dashboard (current milestone).
2. Add Alembic migrations, authentication/RBAC, repositories, and seeded warehouse data.
3. Build CSV/Excel ingestion and Pandera quality gates, then Airflow orchestration.
4. Add forecasting, segmentation, churn, anomaly and governed AI-query services.
5. Add CI, observability, reports, deployment infrastructure and hardening.
