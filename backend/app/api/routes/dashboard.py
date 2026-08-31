from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dashboard import DashboardFilters, DashboardOverview
from app.services.dashboard import get_dashboard_filters, get_dashboard_overview

router = APIRouter()


@router.get("/overview", response_model=DashboardOverview, summary="Get executive dashboard aggregates")
def dashboard_overview(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    region: Optional[str] = Query(default=None, max_length=120),
    category: Optional[str] = Query(default=None, max_length=120),
    customer: Optional[str] = Query(default=None, max_length=120),
    database: Session = Depends(get_db),
) -> DashboardOverview:
    """Return aggregate data only; warehouse-level rows remain server-side."""
    return get_dashboard_overview(database, start_date, end_date, region, category, customer)


@router.get("/filters", response_model=DashboardFilters, summary="Get available dashboard filter values")
def dashboard_filters(database: Session = Depends(get_db)) -> DashboardFilters:
    return get_dashboard_filters(database)
