# Data platform

Planned ingestion flow: source connector → raw extract → Pandera quality gate → Polars/Pandas transform → analytics star schema. Airflow DAGs will orchestrate retries and persist quality/run status.

## Generate development data

Generate the default 500,000 transactional rows (the output directory is ignored by Git):

```powershell
python scripts/generate_synthetic_data.py --output-dir data/generated
python scripts/validate_sales_extract.py data/generated/fact_sales.csv
```

Use a smaller `--orders` value for a quick local smoke test. The generator is deterministic when the same seed is supplied and emits relational dimension CSVs alongside `fact_sales.csv`.

After PostgreSQL is running, load the validated extracts with:

```powershell
$env:DATABASE_URL = "postgresql://sales_app:change-me-locally@localhost:5432/sales_analytics"
python scripts/load_to_postgres.py --input-dir data/generated --replace
```

`--replace` truncates the generated dimension and sales fact tables, so use it only for a local development refresh.
