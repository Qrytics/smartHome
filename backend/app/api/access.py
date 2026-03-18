"""
Access Control Endpoints

Handles RFID card authorization for the door-control ESP32:
  POST /api/access/check  – called by ESP32 when a card is scanned
  GET  /api/access/cards  – list registered RFID cards (admin)
  POST /api/access/cards  – register a new RFID card (admin)
  GET  /api/access/logs   – retrieve access log entries
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime, timezone

from app.services import db_client

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AccessCheckRequest(BaseModel):
    """Payload sent by the door-control ESP32 when a card is scanned."""
    device_id: str = Field(..., description="Door control device ID")
    card_uid: str = Field(..., description="Scanned RFID card UID (hex, colon-separated)")
    timestamp: str = Field(..., description="ISO 8601 timestamp from ESP32")

    model_config = {
        "json_schema_extra": {
            "example": {
                "device_id": "door-control-01",
                "card_uid": "04:A3:2B:F2:1C:80",
                "timestamp": "2026-02-09T19:59:04.032Z",
            }
        }
    }


class AccessCheckResponse(BaseModel):
    """Response returned to the door-control ESP32."""
    granted: bool = Field(..., description="Whether access is granted")
    reason: str = Field(..., description="Human-readable reason")
    card_uid: str
    device_id: str
    checked_at: str


class RFIDCardRequest(BaseModel):
    """Payload for registering a new RFID card."""
    card_uid: str = Field(..., description="RFID card UID (hex, colon-separated)")
    user_id: str = Field(..., description="User this card belongs to")
    label: Optional[str] = Field(None, description="Optional label / name")
    active: bool = Field(True, description="Whether the card is active")

    model_config = {
        "json_schema_extra": {
            "example": {
                "card_uid": "04:A3:2B:F2:1C:80",
                "user_id": "user001",
                "label": "Alice's key card",
                "active": True,
            }
        }
    }


class AccessLogEntry(BaseModel):
    """Single access log entry returned to the frontend."""
    log_id: int
    card_uid: str
    device_id: str
    granted: bool
    reason: str
    timestamp: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/check",
    response_model=AccessCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Check RFID card authorization",
)
async def check_access(request: AccessCheckRequest) -> Dict:
    """
    Authorize an RFID card scan.

    Called by the door-control ESP32 every time a card is presented.
    The backend checks the card UID against the registered whitelist and
    writes an entry to the access log regardless of outcome.

    Returns ``granted=True`` only when the card exists and is active.
    On any backend error the endpoint returns ``granted=False`` so the
    door remains locked (fail-secure behaviour mirrors the firmware).
    """
    granted = False
    reason = "card not registered"

    try:
        card = db_client.get_rfid_card(request.card_uid)
        if card is None:
            reason = "card not registered"
        elif not card.get("active", False):
            reason = "card deactivated"
            granted = False
        else:
            granted = True
            reason = "authorized"
    except Exception as exc:
        # Fail-secure: any DB error → deny
        print(f"[ACCESS] DB error during card check: {exc}")
        granted = False
        reason = "backend error – access denied"

    # Write audit log (best-effort – do not let logging failure affect response)
    checked_at = datetime.now(timezone.utc).isoformat()
    try:
        db_client.log_access_attempt(
            card_uid=request.card_uid,
            device_id=request.device_id,
            granted=granted,
            reason=reason,
            timestamp=checked_at,
        )
    except Exception as exc:
        print(f"[ACCESS] Failed to write access log: {exc}")

    return {
        "granted": granted,
        "reason": reason,
        "card_uid": request.card_uid,
        "device_id": request.device_id,
        "checked_at": checked_at,
    }


@router.get(
    "/cards",
    summary="List all registered RFID cards",
)
async def list_cards() -> List[Dict]:
    """Return all RFID cards in the whitelist."""
    try:
        return db_client.list_rfid_cards()
    except Exception as exc:
        print(f"[ACCESS] Failed to list cards: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve card list",
        )


@router.post(
    "/cards",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new RFID card",
)
async def register_card(request: RFIDCardRequest) -> Dict:
    """
    Register a new RFID card in the whitelist.

    If the card UID already exists, the record is updated.
    """
    try:
        db_client.upsert_rfid_card(
            card_uid=request.card_uid,
            user_id=request.user_id,
            label=request.label,
            active=request.active,
        )
    except Exception as exc:
        print(f"[ACCESS] Failed to register card: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register card",
        )

    return {
        "status": "created",
        "card_uid": request.card_uid,
        "user_id": request.user_id,
    }


@router.get(
    "/logs",
    summary="Retrieve access log entries",
)
async def get_access_logs(limit: int = 50) -> List[Dict]:
    """Return the most recent access log entries (up to *limit*)."""
    try:
        return db_client.get_access_logs(limit=min(limit, 500))
    except Exception as exc:
        print(f"[ACCESS] Failed to retrieve logs: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve access logs",
        )
