"""
Extended tests for health check endpoints.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_ready_endpoint():
    response = client.get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body.get("ready") is True


def test_health_live_endpoint():
    response = client.get("/health/live")
    assert response.status_code == 200
    body = response.json()
    assert body.get("alive") is True
