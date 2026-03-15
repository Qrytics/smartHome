"""
Shared test fixtures for the smart home backend test suite.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Return a FastAPI test client."""
    return TestClient(app)
