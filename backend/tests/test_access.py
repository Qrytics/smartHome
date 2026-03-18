"""
Tests for the access control endpoints.

All external services (db_client) are patched so these tests run without
a real database.
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

DEVICE_ID = "door-control-01"
TIMESTAMP = "2026-01-01T00:00:00Z"
CARD_UID_AUTHORIZED = "04:A3:2B:F2:1C:80"
CARD_UID_UNKNOWN = "FF:FF:FF:FF:FF:FF"
CARD_UID_INACTIVE = "04:B7:3C:F3:2D:91"

ACCESS_CHECK_PAYLOAD = {
    "device_id": DEVICE_ID,
    "card_uid": CARD_UID_AUTHORIZED,
    "timestamp": TIMESTAMP,
}

MOCK_ACTIVE_CARD = {
    "card_uid": CARD_UID_AUTHORIZED,
    "user_id": "user001",
    "label": "Alice – main key",
    "active": True,
}

MOCK_INACTIVE_CARD = {
    "card_uid": CARD_UID_INACTIVE,
    "user_id": "user002",
    "label": "Deactivated card",
    "active": False,
}


# ---------------------------------------------------------------------------
# POST /api/access/check
# ---------------------------------------------------------------------------


def test_access_check_authorized():
    """Authorized active card returns granted=True."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.return_value = MOCK_ACTIVE_CARD
        mock_db.log_access_attempt.return_value = True

        response = client.post("/api/access/check", json=ACCESS_CHECK_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert body["granted"] is True
    assert body["reason"] == "authorized"
    assert body["card_uid"] == CARD_UID_AUTHORIZED
    assert body["device_id"] == DEVICE_ID
    assert "checked_at" in body


def test_access_check_unknown_card():
    """Card not in whitelist returns granted=False."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.return_value = None
        mock_db.log_access_attempt.return_value = True

        response = client.post(
            "/api/access/check",
            json={**ACCESS_CHECK_PAYLOAD, "card_uid": CARD_UID_UNKNOWN},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["granted"] is False
    assert "not registered" in body["reason"]


def test_access_check_inactive_card():
    """Deactivated card returns granted=False."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.return_value = MOCK_INACTIVE_CARD
        mock_db.log_access_attempt.return_value = True

        response = client.post(
            "/api/access/check",
            json={**ACCESS_CHECK_PAYLOAD, "card_uid": CARD_UID_INACTIVE},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["granted"] is False
    assert "deactivated" in body["reason"]


def test_access_check_db_error_denies_access():
    """
    Any database error during card check must result in granted=False
    (fail-secure behaviour).
    """
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.side_effect = RuntimeError("DB down")
        mock_db.log_access_attempt.return_value = True

        response = client.post("/api/access/check", json=ACCESS_CHECK_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert body["granted"] is False


def test_access_check_missing_fields():
    """Missing required fields returns 422."""
    response = client.post("/api/access/check", json={})
    assert response.status_code == 422


def test_access_check_log_failure_does_not_break_response():
    """Audit log failure must not affect the access check response."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.return_value = MOCK_ACTIVE_CARD
        mock_db.log_access_attempt.side_effect = RuntimeError("log DB down")

        response = client.post("/api/access/check", json=ACCESS_CHECK_PAYLOAD)

    # Despite log error, we still get a valid 200 with the authorization result
    assert response.status_code == 200
    body = response.json()
    assert body["granted"] is True


# ---------------------------------------------------------------------------
# GET /api/access/cards
# ---------------------------------------------------------------------------


def test_list_cards_success():
    """Returns list of RFID cards."""
    cards = [MOCK_ACTIVE_CARD, MOCK_INACTIVE_CARD]
    with patch("app.api.access.db_client") as mock_db:
        mock_db.list_rfid_cards.return_value = cards
        response = client.get("/api/access/cards")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2


def test_list_cards_db_error():
    """Returns 500 when db raises an exception."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.list_rfid_cards.side_effect = RuntimeError("DB down")
        response = client.get("/api/access/cards")

    assert response.status_code == 500


# ---------------------------------------------------------------------------
# POST /api/access/cards
# ---------------------------------------------------------------------------


def test_register_card_success():
    """Registering a new card returns 201."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.upsert_rfid_card.return_value = True
        response = client.post(
            "/api/access/cards",
            json={
                "card_uid": "04:AA:BB:CC:DD:EE",
                "user_id": "user003",
                "label": "Carol's card",
                "active": True,
            },
        )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "created"
    assert body["card_uid"] == "04:AA:BB:CC:DD:EE"


def test_register_card_missing_fields():
    """Missing required fields returns 422."""
    response = client.post("/api/access/cards", json={"label": "no uid or user"})
    assert response.status_code == 422


def test_register_card_db_error():
    """DB error during card registration returns 500."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.upsert_rfid_card.side_effect = RuntimeError("DB down")
        response = client.post(
            "/api/access/cards",
            json={"card_uid": "04:AA:BB:CC:DD:EE", "user_id": "user003"},
        )

    assert response.status_code == 500


# ---------------------------------------------------------------------------
# GET /api/access/logs
# ---------------------------------------------------------------------------


def test_get_access_logs_success():
    """Returns list of access log entries."""
    logs = [
        {
            "log_id": 1,
            "card_uid": CARD_UID_AUTHORIZED,
            "device_id": DEVICE_ID,
            "granted": True,
            "reason": "authorized",
            "timestamp": TIMESTAMP,
        }
    ]
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_access_logs.return_value = logs
        response = client.get("/api/access/logs")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["granted"] is True


def test_get_access_logs_db_error():
    """Returns 500 on database error."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_access_logs.side_effect = RuntimeError("DB down")
        response = client.get("/api/access/logs")

    assert response.status_code == 500
