from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.core.security import get_current_user
from app.db.session import get_db
from app.main import app


def test_health_check() -> None:
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "database" in payload
    assert "redis" in payload


def test_dashboard_contract() -> None:
    class UnavailableDatabase:
        def execute(self, *args, **kwargs):
            raise SQLAlchemyError("warehouse unavailable")

    app.dependency_overrides[get_db] = lambda: UnavailableDatabase()
    app.dependency_overrides[get_current_user] = lambda: object()
    response = TestClient(app).get("/api/v1/dashboard/overview?customer=Ava%20Patel")
    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert len(response.json()["kpis"]) == 4
