"""Generate deterministic, relational sales data for local analytics development.

Example: python scripts/generate_synthetic_data.py --orders 500000 --output-dir data/generated
"""
from __future__ import annotations

import argparse
import csv
import random
from datetime import date, timedelta
from pathlib import Path
from typing import Iterator


REGIONS = [("NA", "North America", "United States"), ("EU", "Europe", "Germany"), ("APAC", "Asia Pacific", "Singapore"), ("LATAM", "Latin America", "Brazil")]
CATEGORIES = ["Technology", "Office Supplies", "Furniture"]
PRODUCT_PREFIXES = {"Technology": ["Apex", "Nova", "Vertex"], "Office Supplies": ["Paperline", "Draft", "Clear"], "Furniture": ["Form", "Harbor", "Studio"]}
FIRST_NAMES = ["Ava", "Noah", "Mia", "Liam", "Olivia", "Ethan", "Emma", "Arjun", "Sofia", "Mateo"]
LAST_NAMES = ["Patel", "Kim", "Garcia", "Miller", "Nguyen", "Smith", "Khan", "Wilson", "Chen", "Silva"]


def writer(path: Path, headers: list[str]) -> tuple[object, csv.DictWriter]:
    handle = path.open("w", newline="", encoding="utf-8")
    csv_writer = csv.DictWriter(handle, fieldnames=headers)
    csv_writer.writeheader()
    return handle, csv_writer


def generate_dates(start: date, end: date) -> Iterator[dict[str, object]]:
    current = start
    while current <= end:
        yield {"date_key": current.strftime("%Y%m%d"), "full_date": current.isoformat(), "day_of_month": current.day, "month_number": current.month, "month_name": current.strftime("%B"), "quarter_number": (current.month - 1) // 3 + 1, "year_number": current.year, "week_number": current.isocalendar()[1]}
        current += timedelta(days=1)


def generate(output_dir: Path, orders: int, customers: int, seed: int) -> None:
    if orders < 1 or customers < 1:
        raise ValueError("orders and customers must be positive")
    output_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    start, end = date(2023, 1, 1), date(2025, 12, 31)
    dates = list(generate_dates(start, end))

    handle, out = writer(output_dir / "dim_date.csv", list(dates[0]))
    out.writerows(dates)
    handle.close()
    handle, out = writer(output_dir / "dim_region.csv", ["region_key", "region_code", "region_name", "country_name"])
    regions = [{"region_key": i + 1, "region_code": code, "region_name": name, "country_name": country} for i, (code, name, country) in enumerate(REGIONS)]
    out.writerows(regions)
    handle.close()
    handle, out = writer(output_dir / "dim_category.csv", ["category_key", "category_name"])
    category_rows = [{"category_key": i + 1, "category_name": name} for i, name in enumerate(CATEGORIES)]
    out.writerows(category_rows)
    handle.close()

    products: list[dict[str, object]] = []
    for category in category_rows:
        for n in range(1, 51):
            cost = round(rng.uniform(8, 420), 2)
            products.append({"product_key": len(products) + 1, "product_sku": f"{category['category_name'][:3].upper()}-{n:03}", "product_name": f"{rng.choice(PRODUCT_PREFIXES[str(category['category_name'])])} {category['category_name']} {n}", "category_key": category["category_key"], "unit_cost": cost})
    handle, out = writer(output_dir / "dim_product.csv", list(products[0]))
    out.writerows(products)
    handle.close()

    handle, out = writer(output_dir / "dim_customer.csv", ["customer_key", "customer_external_id", "customer_name", "email"])
    for key in range(1, customers + 1):
        first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        out.writerow({"customer_key": key, "customer_external_id": f"CUST-{key:07}", "customer_name": f"{first} {last}", "email": f"{first.lower()}.{last.lower()}.{key}@example.test"})
    handle.close()

    salespeople = [{"salesperson_key": i + 1, "employee_code": f"REP-{i + 1:03}", "salesperson_name": f"{FIRST_NAMES[i % len(FIRST_NAMES)]} {LAST_NAMES[(i + 2) % len(LAST_NAMES)]}", "region_key": i % len(regions) + 1} for i in range(24)]
    handle, out = writer(output_dir / "dim_salesperson.csv", list(salespeople[0]))
    out.writerows(salespeople)
    handle.close()

    handle, out = writer(output_dir / "fact_sales.csv", ["order_id", "date_key", "customer_key", "product_key", "region_key", "salesperson_key", "quantity", "gross_revenue", "discount_amount", "profit_amount"])
    for order_number in range(1, orders + 1):
        product = rng.choice(products)
        region_key = rng.choices([1, 2, 3, 4], weights=[40, 30, 20, 10], k=1)[0]
        quantity = rng.choices([1, 2, 3, 4, 5], weights=[38, 30, 18, 9, 5], k=1)[0]
        unit_price = float(product["unit_cost"]) * rng.uniform(1.22, 1.95)
        gross = round(unit_price * quantity, 2)
        discount = round(gross * rng.choices([0, 0.05, 0.10, 0.15], weights=[55, 25, 15, 5], k=1)[0], 2)
        margin = rng.uniform(0.08, 0.32)
        sale_date = rng.choice(dates)
        out.writerow({"order_id": f"ORD-{order_number:09}", "date_key": sale_date["date_key"], "customer_key": rng.randint(1, customers), "product_key": product["product_key"], "region_key": region_key, "salesperson_key": (region_key - 1) * 6 + rng.randint(1, 6), "quantity": quantity, "gross_revenue": gross, "discount_amount": discount, "profit_amount": round((gross - discount) * margin, 2)})
    handle.close()
    (output_dir / "manifest.txt").write_text(f"seed={seed}\norders={orders}\ncustomers={customers}\ndate_range={start}:{end}\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate enterprise sales CSV extracts")
    parser.add_argument("--output-dir", type=Path, default=Path("data/generated"))
    parser.add_argument("--orders", type=int, default=500_000)
    parser.add_argument("--customers", type=int, default=50_000)
    parser.add_argument("--seed", type=int, default=20260101)
    options = parser.parse_args()
    generate(options.output_dir, options.orders, options.customers, options.seed)
