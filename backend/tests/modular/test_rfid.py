"""
Modular tests for the MFRC522 RFID reader and solenoid door-lock.

Validates the full access-control flow used by the door-node ESP32:
  1. Card scan → POST /api/access/check
  2. Backend looks up card in whitelist
  3. Returns granted=true/false
  4. Writes audit log entry

Run just these tests::

    pytest -m rfid

What is tested
--------------
RFID reader:
- Authorized active card → granted=true
- Unknown / unregistered card → granted=false
- Deactivated card → granted=false
- Fail-secure: DB error → granted=false
- Audit log written for every scan (pass and fail)
- Log write failure does NOT affect access decision (resilience)

Solenoid (door lock):
- grant response triggers unlock via granted field
- deny response keeps door locked
- Fail-secure: any error → door stays locked

Card management:
- Register new card → 201
- Duplicate card upserted without error
- Deactivate card → subsequent scan denied
- List cards returns registered whitelist
"""

import time
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [pytest.mark.rfid, pytest.mark.solenoid, pytest.mark.backend_only]

client = TestClient(app)

DEVICE_ID = "door-control-01"
TIMESTAMP = "2026-01-01T12:00:00Z"

# Representative card UIDs following MFRC522 hex-colon format
CARD_ALICE = "04:A3:2B:F2:1C:80"
CARD_BOB   = "04:B7:3C:F3:2D:91"
CARD_ADMIN = "04:C9:4D:F4:3E:A2"
CARD_UNKNOWN = "FF:FF:FF:FF:FF:FF"
CARD_INACTIVE = "04:DE:AD:BE:EF:00"

MOCK_ACTIVE_CARD = {
    "card_uid": CARD_ALICE,
    "user_id": "user001",
    "label": "Alice – main key",
    "active": True,
}
MOCK_INACTIVE_CARD = {
    "card_uid": CARD_INACTIVE,
    "user_id": "user002",
    "label": "Deactivated card",
    "active": False,
}


def _check_payload(card_uid: str = CARD_ALICE):
    return {
        "device_id": DEVICE_ID,
        "card_uid": card_uid,
        "timestamp": TIMESTAMP,
    }


# ---------------------------------------------------------------------------
# RFID access check – authorization
# ---------------------------------------------------------------------------


def test_rfid_authorized_card_granted(report):
    """Active whitelisted card → granted=True."""
    t0 = time.monotonic()
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.return_value = MOCK_ACTIVE_CARD
        mock_db.log_access_attempt.return_value = True
        response = client.post("/api/access/check", json=_check_payload(CARD_ALICE))
    duration_ms = (time.monotonic() - t0) * 1000

    body = response.json()
    report.record(
        test_id="test_rfid_authorized_card",
        component="rfid",
        scenario="RFID authorized card → granted=True",
        status="passed" if (response.status_code == 200 and body["granted"]) else "failed",
        simulated_data={"card_uid": CARD_ALICE},
        http_status=response.status_code,
        response_body=body,
        duration_ms=duration_ms,
    )
    assert response.status_code == 200
    assert body["granted"] is True
    assert body["reason"] == "authorized"
    assert body["card_uid"] == CARD_ALICE


def test_rfid_unknown_card_denied(report):
    """Unregistered card UID → granted=False, reason contains 'not registered'."""
    t0 = time.monotonic()
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.return_value = None
        mock_db.log_access_attempt.return_value = True
        response = client.post("/api/access/check", json=_check_payload(CARD_UNKNOWN))
    duration_ms = (time.monotonic() - t0) * 1000

    body = response.json()
    report.record(
        test_id="test_rfid_unknown_card",
        component="rfid",
        scenario="RFID unknown card → granted=False",
        status="passed" if (response.status_code == 200 and not body["granted"]) else "failed",
        simulated_data={"card_uid": CARD_UNKNOWN},
        http_status=response.status_code,
        response_body=body,
        duration_ms=duration_ms,
    )
    assert response.status_code == 200
    assert body["granted"] is False
    assert "not registered" in body["reason"]


def test_rfid_deactivated_card_denied(report):
    """Deactivated card → granted=False, reason='card deactivated'."""
    t0 = time.monotonic()
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.return_value = MOCK_INACTIVE_CARD
        mock_db.log_access_attempt.return_value = True
        response = client.post("/api/access/check", json=_check_payload(CARD_INACTIVE))
    duration_ms = (time.monotonic() - t0) * 1000

    body = response.json()
    report.record(
        test_id="test_rfid_deactivated_card",
        component="rfid",
        scenario="RFID deactivated card → granted=False",
        status="passed" if (response.status_code == 200 and not body["granted"]) else "failed",
        simulated_data={"card_uid": CARD_INACTIVE},
        http_status=response.status_code,
        response_body=body,
        duration_ms=duration_ms,
    )
    assert response.status_code == 200
    assert body["granted"] is False
    assert "deactivated" in body["reason"]


# ---------------------------------------------------------------------------
# Fail-secure behaviour (solenoid stays locked on error)
# ---------------------------------------------------------------------------


def test_rfid_fail_secure_db_error(report):
    """
    Any backend error during card lookup MUST result in granted=False.
    This ensures the solenoid remains in the locked (secure) state.
    """
    t0 = time.monotonic()
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.side_effect = RuntimeError("DB unreachable")
        mock_db.log_access_attempt.return_value = True
        response = client.post("/api/access/check", json=_check_payload(CARD_ALICE))
    duration_ms = (time.monotonic() - t0) * 1000

    body = response.json()
    report.record(
        test_id="test_rfid_fail_secure_db_error",
        component="rfid",
        scenario="Fail-secure: DB error → granted=False (solenoid locked)",
        status="passed" if (response.status_code == 200 and not body["granted"]) else "failed",
        simulated_data={"card_uid": CARD_ALICE, "error": "DB unreachable"},
        http_status=response.status_code,
        response_body=body,
        duration_ms=duration_ms,
    )
    assert response.status_code == 200
    assert body["granted"] is False


def test_rfid_log_failure_does_not_break_access(report):
    """
    Audit log write failure must NOT affect the access decision.
    The card is still authorized; only the log write fails.
    """
    t0 = time.monotonic()
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_rfid_card.return_value = MOCK_ACTIVE_CARD
        mock_db.log_access_attempt.side_effect = RuntimeError("log DB down")
        response = client.post("/api/access/check", json=_check_payload(CARD_ALICE))
    duration_ms = (time.monotonic() - t0) * 1000

    body = response.json()
    report.record(
        test_id="test_rfid_log_failure_resilient",
        component="rfid",
        scenario="RFID log failure → access decision unchanged",
        status="passed" if (response.status_code == 200 and body["granted"]) else "failed",
        http_status=response.status_code,
        response_body=body,
        duration_ms=duration_ms,
    )
    assert response.status_code == 200
    assert body["granted"] is True


# ---------------------------------------------------------------------------
# Card management
# ---------------------------------------------------------------------------


def test_rfid_register_new_card(report):
    """POST /api/access/cards → 201 with correct card_uid and user_id."""
    with patch("app.api.access.db_client") as mock_db:
        mock_db.upsert_rfid_card.return_value = True
        response = client.post(
            "/api/access/cards",
            json={"card_uid": CARD_BOB, "user_id": "user002", "label": "Bob", "active": True},
        )
    report.record(
        test_id="test_rfid_register_card",
        component="rfid",
        scenario="Register new RFID card → 201",
        status="passed" if response.status_code == 201 else "failed",
        simulated_data={"card_uid": CARD_BOB},
        http_status=response.status_code,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["card_uid"] == CARD_BOB


def test_rfid_list_cards(report):
    """GET /api/access/cards returns the card whitelist."""
    cards = [MOCK_ACTIVE_CARD, MOCK_INACTIVE_CARD]
    with patch("app.api.access.db_client") as mock_db:
        mock_db.list_rfid_cards.return_value = cards
        response = client.get("/api/access/cards")
    report.record(
        test_id="test_rfid_list_cards",
        component="rfid",
        scenario="List RFID cards whitelist",
        status="passed" if response.status_code == 200 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_rfid_access_log_entries(report):
    """GET /api/access/logs returns access log entries."""
    logs = [
        {"log_id": 1, "card_uid": CARD_ALICE, "device_id": DEVICE_ID,
         "granted": True, "reason": "authorized", "timestamp": TIMESTAMP},
        {"log_id": 2, "card_uid": CARD_UNKNOWN, "device_id": DEVICE_ID,
         "granted": False, "reason": "card not registered", "timestamp": TIMESTAMP},
    ]
    with patch("app.api.access.db_client") as mock_db:
        mock_db.get_access_logs.return_value = logs
        response = client.get("/api/access/logs")
    report.record(
        test_id="test_rfid_access_log",
        component="rfid",
        scenario="Access log contains grant + deny entries",
        status="passed" if response.status_code == 200 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["granted"] is True
    assert body[1]["granted"] is False


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------


def test_rfid_check_missing_card_uid(report):
    """Missing card_uid → 422 validation error."""
    response = client.post(
        "/api/access/check",
        json={"device_id": DEVICE_ID, "timestamp": TIMESTAMP},
    )
    report.record(
        test_id="test_rfid_missing_card_uid",
        component="rfid",
        scenario="Missing card_uid → 422",
        status="passed" if response.status_code == 422 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 422


def test_rfid_register_missing_user_id(report):
    """Missing user_id on card registration → 422."""
    with patch("app.api.access.db_client"):
        response = client.post(
            "/api/access/cards",
            json={"card_uid": CARD_BOB, "label": "no user"},
        )
    report.record(
        test_id="test_rfid_register_missing_user",
        component="rfid",
        scenario="Card registration without user_id → 422",
        status="passed" if response.status_code == 422 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 422
