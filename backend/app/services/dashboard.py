from __future__ import annotations

from datetime import date, timedelta
from typing import Any, List, Optional

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.dashboard import BreakdownItem, DashboardFilters, DashboardOverview, KpiMetric, TrendPoint


def _filters(start_date: Optional[date], end_date: Optional[date], region: Optional[str], category: Optional[str], customer: Optional[str]) -> tuple[str, dict[str, Any]]:
    return """WHERE (:start_date IS NULL OR d.full_date >= :start_date)
        AND (:end_date IS NULL OR d.full_date <= :end_date)
        AND (:region IS NULL OR r.region_name = :region)
        AND (:category IS NULL OR c.category_name = :category)
        AND (:customer IS NULL OR cu.customer_name = :customer)""", {"start_date": start_date, "end_date": end_date, "region": region, "category": category, "customer": customer}


def _joins() -> str:
    return """FROM analytics.fact_sales s
        JOIN analytics.dim_date d ON d.date_key = s.date_key
        JOIN analytics.dim_region r ON r.region_key = s.region_key
        JOIN analytics.dim_product p ON p.product_key = s.product_key
        JOIN analytics.dim_category c ON c.category_key = p.category_key
        JOIN analytics.dim_customer cu ON cu.customer_key = s.customer_key"""


def _currency(value: float) -> str:
    if value >= 1_000_000:
        return f"${value / 1_000_000:.2f}M"
    if value >= 1_000:
        return f"${value / 1_000:.1f}K"
    return f"${value:,.0f}"


def _breakdowns(rows: List[Any], total: float) -> List[BreakdownItem]:
    return [BreakdownItem(name=row.name, value=float(row.value), percentage=round(float(row.value) / total * 100, 1) if total else 0) for row in rows]


def _warehouse_overview(database: Session, start_date: Optional[date], end_date: Optional[date], region: Optional[str], category: Optional[str], customer: Optional[str]) -> DashboardOverview:
    where, parameters = _filters(start_date, end_date, region, category, customer)
    joins = _joins()
    totals = database.execute(text(f"SELECT COALESCE(SUM(s.gross_revenue - s.discount_amount), 0) AS revenue, COALESCE(SUM(s.profit_amount), 0) AS profit, COUNT(DISTINCT s.order_id) AS orders {joins} {where}"), parameters).mappings().one()
    revenue, profit, orders = float(totals["revenue"]), float(totals["profit"]), int(totals["orders"])
    trend_rows = database.execute(text(f"SELECT d.full_date AS date, SUM(s.gross_revenue - s.discount_amount) AS revenue, SUM(s.profit_amount) AS profit {joins} {where} GROUP BY d.full_date ORDER BY d.full_date"), parameters).mappings().all()
    region_rows = database.execute(text(f"SELECT r.region_name AS name, SUM(s.gross_revenue - s.discount_amount) AS value {joins} {where} GROUP BY r.region_name ORDER BY value DESC"), parameters).mappings().all()
    category_rows = database.execute(text(f"SELECT c.category_name AS name, SUM(s.gross_revenue - s.discount_amount) AS value {joins} {where} GROUP BY c.category_name ORDER BY value DESC"), parameters).mappings().all()
    return DashboardOverview(data_mode="warehouse", generated_at=date.today(), kpis=[KpiMetric(label="Total revenue", value=revenue, display_value=_currency(revenue)), KpiMetric(label="Total profit", value=profit, display_value=_currency(profit)), KpiMetric(label="Profit margin", value=round(profit / revenue * 100, 1) if revenue else 0, display_value=f"{profit / revenue * 100:.1f}%" if revenue else "0.0%"), KpiMetric(label="Orders", value=orders, display_value=f"{orders:,}")], revenue_trend=[TrendPoint(date=row.date, revenue=float(row.revenue), profit=float(row.profit)) for row in trend_rows], revenue_by_region=_breakdowns(region_rows, revenue), revenue_by_category=_breakdowns(category_rows, revenue))


def _preview_overview() -> DashboardOverview:
    today = date.today()
    revenue = [182_400, 201_200, 198_700, 224_500, 231_800, 257_300, 269_900]
    profits = [39_400, 44_100, 42_800, 51_900, 53_200, 60_400, 63_100]
    return DashboardOverview(data_mode="preview", generated_at=today, kpis=[KpiMetric(label="Total revenue", value=1_565_800, display_value="$1.57M", change_percent=12.8, trend="up"), KpiMetric(label="Total profit", value=355_200, display_value="$355.2K", change_percent=9.4, trend="up"), KpiMetric(label="Profit margin", value=22.7, display_value="22.7%", change_percent=1.6, trend="up"), KpiMetric(label="Orders", value=8_642, display_value="8,642", change_percent=6.3, trend="up")], revenue_trend=[TrendPoint(date=today - timedelta(days=6 - i), revenue=value, profit=profits[i]) for i, value in enumerate(revenue)], revenue_by_region=[BreakdownItem(name="North America", value=626_320, percentage=40), BreakdownItem(name="Europe", value=469_740, percentage=30), BreakdownItem(name="Asia Pacific", value=313_160, percentage=20), BreakdownItem(name="Latin America", value=156_580, percentage=10)], revenue_by_category=[BreakdownItem(name="Technology", value=689_000, percentage=44), BreakdownItem(name="Office", value=469_700, percentage=30), BreakdownItem(name="Furniture", value=407_100, percentage=26)])


def get_dashboard_overview(database: Session, start_date: Optional[date], end_date: Optional[date], region: Optional[str], category: Optional[str], customer: Optional[str]) -> DashboardOverview:
    """Serve warehouse aggregates, retaining preview mode only if the warehouse is unavailable."""
    try:
        return _warehouse_overview(database, start_date, end_date, region, category, customer)
    except SQLAlchemyError:
        return _preview_overview()


def get_dashboard_filters(database: Session) -> DashboardFilters:
    try:
        regions = database.execute(text("SELECT region_name FROM analytics.dim_region ORDER BY region_name")).scalars().all()
        categories = database.execute(text("SELECT category_name FROM analytics.dim_category ORDER BY category_name")).scalars().all()
        customers = database.execute(text("SELECT customer_name FROM analytics.dim_customer ORDER BY customer_name")).scalars().all()
        return DashboardFilters(regions=list(regions), categories=list(categories), customers=list(customers))
    except SQLAlchemyError:
        return DashboardFilters(regions=[], categories=[], customers=[])
