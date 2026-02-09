"""Tests for health check endpoints."""
from fastapi.testclient import TestClient


def test_health_check(client):
    """Test the health check endpoint returns 200."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "timestamp" in data


def test_health_ready(client):
    """Test the readiness check endpoint."""
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert "ready" in data


def test_health_live(client):
    """Test the liveness check endpoint."""
    response = client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert "alive" in data
