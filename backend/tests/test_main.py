"""
Tests for the main application entry point (root endpoint).
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Smart Home API"
    assert body["version"] == "0.1.0"
    assert body["status"] == "running"
    assert "docs" in body
    assert "redoc" in body
