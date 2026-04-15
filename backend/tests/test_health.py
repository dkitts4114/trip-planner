"""Smoke test: health endpoint returns ok."""
from fastapi.testclient import TestClient

from trip_planner.main import app


def test_health_ok():
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body
