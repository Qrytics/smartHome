"""
Shared fixtures and report generator for modular hardware-component tests.

Every modular test in this package automatically has its result captured
and written to ``test-reports/<component>_<timestamp>.json`` (and an
accompanying ``.csv``) so test data can be recovered and analysed even
when hardware is unavailable.

Usage
-----
Run a single component::

    pytest -m bme280 --report-dir test-reports   # explicit dir
    pytest -m bme280                             # default dir: test-reports

Run all modular tests and save a combined report::

    pytest tests/modular/ --report-dir test-reports

Results JSON schema
-------------------
{
    "session": {
        "timestamp": "2026-03-18T13:00:00Z",
        "module": "<marker>",
        "hardware_available": false
    },
    "results": [
        {
            "test_id": "test_bme280_valid_temperature",
            "component": "bme280",
            "scenario": "Normal indoor temperature reading",
            "status": "passed",        // passed | failed | error
            "simulated_data": {...},
            "http_status": 202,
            "response_body": {...},
            "error": null,
            "duration_ms": 12.3
        }
    ],
    "summary": {"total": 10, "passed": 10, "failed": 0, "error": 0}
}
"""

from __future__ import annotations

import csv
import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

# ---------------------------------------------------------------------------
# CLI option: --report-dir
# ---------------------------------------------------------------------------


def pytest_addoption(parser):
    parser.addoption(
        "--report-dir",
        action="store",
        default="test-reports",
        help="Directory where JSON/CSV modular test reports are written.",
    )


# ---------------------------------------------------------------------------
# Session-level report collector
# ---------------------------------------------------------------------------


class ModularTestReport:
    """Accumulates test results during the session and writes reports on exit."""

    def __init__(self, report_dir: str) -> None:
        self.report_dir = report_dir
        self.results: List[Dict[str, Any]] = []
        self.session_start = datetime.now(timezone.utc).isoformat()

    def record(
        self,
        *,
        test_id: str,
        component: str,
        scenario: str,
        status: str,
        simulated_data: Optional[Dict] = None,
        http_status: Optional[int] = None,
        response_body: Optional[Dict] = None,
        error: Optional[str] = None,
        duration_ms: float = 0.0,
    ) -> None:
        self.results.append(
            {
                "test_id": test_id,
                "component": component,
                "scenario": scenario,
                "status": status,
                "simulated_data": simulated_data or {},
                "http_status": http_status,
                "response_body": response_body or {},
                "error": error,
                "duration_ms": round(duration_ms, 2),
            }
        )

    def save(self, module_name: str = "all") -> None:
        os.makedirs(self.report_dir, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        passed = sum(1 for r in self.results if r["status"] == "passed")
        failed = sum(1 for r in self.results if r["status"] == "failed")
        errors = sum(1 for r in self.results if r["status"] == "error")

        report = {
            "session": {
                "timestamp": self.session_start,
                "module": module_name,
                "hardware_available": False,  # all modular tests use mocked hardware
                "report_generated": datetime.now(timezone.utc).isoformat(),
            },
            "results": self.results,
            "summary": {
                "total": len(self.results),
                "passed": passed,
                "failed": failed,
                "error": errors,
            },
        }

        json_path = os.path.join(self.report_dir, f"{module_name}_{ts}.json")
        with open(json_path, "w") as f:
            json.dump(report, f, indent=2, default=str)

        # Also write CSV for easy spreadsheet analysis
        csv_path = os.path.join(self.report_dir, f"{module_name}_{ts}.csv")
        with open(csv_path, "w", newline="") as f:
            fieldnames = [
                "test_id",
                "component",
                "scenario",
                "status",
                "http_status",
                "duration_ms",
                "error",
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(self.results)

        print(f"\n[Modular Test Report] JSON → {json_path}")
        print(f"[Modular Test Report] CSV  → {csv_path}")
        print(
            f"[Modular Test Report] Summary: "
            f"{passed} passed / {failed} failed / {errors} errors "
            f"(total {len(self.results)})"
        )


# ---------------------------------------------------------------------------
# Pytest fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def report(request) -> ModularTestReport:
    """Session-scoped report collector.  Writes files on session teardown."""
    report_dir = request.config.getoption("--report-dir", default="test-reports")
    r = ModularTestReport(report_dir)
    yield r
    # Determine which markers are present in this session
    module_names = set()
    for item in request.session.items:
        for mark in item.iter_markers():
            if mark.name not in (
                "parametrize", "skip", "xfail", "asyncio",
                "backend_only", "integration",
            ):
                module_names.add(mark.name)
    module_label = "_".join(sorted(module_names)) or "modular"
    r.save(module_name=module_label)


@pytest.fixture
def api_client():
    """FastAPI TestClient with all external services mocked."""
    return TestClient(app)


@pytest.fixture
def mock_device_factory():
    """Return a callable that creates a mock device dict."""

    def _make(device_id: str, device_type: str = "room_node", location: str = "Living Room"):
        return {
            "device_id": device_id,
            "device_type": device_type,
            "name": f"{location} Node",
            "location": location,
            "status": "online",
            "last_seen": "2026-01-01T00:00:00",
        }

    return _make


@pytest.fixture
def mock_online_ws():
    """Patch ws_manager so the device appears online and commands succeed."""

    class _MockWS:
        def __enter__(self):
            self._patches = [
                patch("app.api.lighting.ws_manager"),
                patch("app.api.sensors.ws_manager"),
            ]
            self.mocks = [p.start() for p in self._patches]
            for m in self.mocks:
                m.is_device_connected.return_value = True
                m.send_dimmer_command = AsyncMock(return_value=True)
                m.send_relay_command = AsyncMock(return_value=True)
                m.send_daylight_harvest_command = AsyncMock(return_value=True)
                m.send_fan_command = AsyncMock(return_value=True)
                m.broadcast_to_clients = AsyncMock(return_value=None)
                m.get_device_state.return_value = {}
            return self.mocks

        def __exit__(self, *_):
            for p in self._patches:
                p.stop()

    return _MockWS()
