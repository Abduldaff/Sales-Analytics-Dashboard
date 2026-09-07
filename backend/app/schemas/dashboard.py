from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class KpiMetric(BaseModel):
    label: str
    value: float
    display_value: str
    change_percent: Optional[float] = None
    trend: str = "neutral"


class TrendPoint(BaseModel):
    date: date
    revenue: float
    profit: float


class BreakdownItem(BaseModel):
    name: str
    value: float
    percentage: float = Field(ge=0, le=100)


class DashboardOverview(BaseModel):
    data_mode: str
    kpis: List[KpiMetric]
    revenue_trend: List[TrendPoint]
    revenue_by_region: List[BreakdownItem]
    revenue_by_category: List[BreakdownItem]
    top_customers: List[BreakdownItem]
    top_products: List[BreakdownItem]
    generated_at: date


class DashboardFilters(BaseModel):
    regions: List[str]
    categories: List[str]
    customers: List[str]
