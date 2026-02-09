"""Tests for the main FastAPI application."""
from fastapi.testclient import TestClient


def test_root_endpoint(client):
    """Test the root endpoint returns basic API info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data
    assert "status" in data
    assert data["status"] == "running"
