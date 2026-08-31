"""Fail fast on the minimum quality rules required before loading fact_sales."""
from __future__ import annotations

import argparse
import csv
from decimal import Decimal, InvalidOperation
from pathlib import Path


REQUIRED = {"order_id", "date_key", "customer_key", "product_key", "region_key", "salesperson_key", "quantity", "gross_revenue", "discount_amount", "profit_amount"}


def validate(path: Path) -> tuple[int, list[str]]:
    errors: list[str] = []
    order_ids: set[str] = set()
    count = 0
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        missing = REQUIRED - set(reader.fieldnames or [])
        if missing:
            return 0, [f"missing columns: {', '.join(sorted(missing))}"]
        for line, row in enumerate(reader, start=2):
            count += 1
            order_id = row["order_id"]
            if not order_id or order_id in order_ids:
                errors.append(f"line {line}: blank or duplicate order_id")
            order_ids.add(order_id)
            try:
                if int(row["quantity"]) <= 0:
                    errors.append(f"line {line}: quantity must be positive")
                if any(Decimal(row[name]) < 0 for name in ("gross_revenue", "discount_amount")):
                    errors.append(f"line {line}: revenue and discount must be non-negative")
            except (ValueError, InvalidOperation):
                errors.append(f"line {line}: numeric fields are invalid")
            if len(errors) >= 20:
                break
    return count, errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate a fact_sales CSV extract")
    parser.add_argument("path", type=Path)
    arguments = parser.parse_args()
    rows, validation_errors = validate(arguments.path)
    if validation_errors:
        raise SystemExit("Validation failed:\n- " + "\n- ".join(validation_errors))
    print(f"Validation passed: {rows:,} sales records")
