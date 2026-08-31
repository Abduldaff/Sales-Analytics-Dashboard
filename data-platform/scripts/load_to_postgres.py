"""Load validated generated extracts into the analytics schema using PostgreSQL COPY."""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import psycopg

TABLE_FILES = [("dim_date", "dim_date.csv"), ("dim_region", "dim_region.csv"), ("dim_category", "dim_category.csv"), ("dim_product", "dim_product.csv"), ("dim_customer", "dim_customer.csv"), ("dim_salesperson", "dim_salesperson.csv"), ("fact_sales", "fact_sales.csv")]


def connection_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required")
    return url.replace("postgresql+psycopg://", "postgresql://", 1)


def load_extracts(directory: Path, replace: bool) -> None:
    missing = [name for _, name in TABLE_FILES if not (directory / name).is_file()]
    if missing:
        raise FileNotFoundError(f"missing source files: {', '.join(missing)}")
    with psycopg.connect(connection_url()) as connection:
        with connection.cursor() as cursor:
            if replace:
                cursor.execute("TRUNCATE TABLE analytics.fact_sales, analytics.dim_salesperson, analytics.dim_customer, analytics.dim_product, analytics.dim_category, analytics.dim_region, analytics.dim_date RESTART IDENTITY CASCADE")
            for table, file_name in TABLE_FILES:
                with (directory / file_name).open("r", encoding="utf-8") as source:
                    with cursor.copy(f"COPY analytics.{table} FROM STDIN WITH (FORMAT CSV, HEADER TRUE)") as copy:
                        while chunk := source.read(1024 * 1024):
                            copy.write(chunk)
        connection.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bulk load generated sales CSVs into PostgreSQL")
    parser.add_argument("--input-dir", type=Path, default=Path("data/generated"))
    parser.add_argument("--replace", action="store_true", help="truncate generated warehouse tables before loading")
    args = parser.parse_args()
    load_extracts(args.input_dir, args.replace)
    print(f"Loaded generated extracts from {args.input_dir}")
