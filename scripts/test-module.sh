#!/usr/bin/env bash
# =============================================================================
# Smart Home IoT – Modular Test Runner
#
# Run hardware-component tests independently so you can test whatever parts
# you have on-hand, even before all hardware has arrived.
#
# Usage
# -----
#   ./scripts/test-module.sh <module> [options]
#
# Modules (one per hardware component)
#   bme280        BME280 environmental sensor (temp / humidity / pressure)
#   temt6000      TEMT6000 ambient light sensor
#   dimmer        PWM LED dimmer (LEDC, 0–100%)
#   fan_relay     Fan relay module
#   rfid          MFRC522 RFID reader
#   solenoid      Solenoid door-lock relay (alias: rfid tests cover this)
#   room_node     Full room-node ESP32 (BME280 + TEMT6000 + dimmer + fan)
#   door_node     Full door-node ESP32 (RFID + solenoid lock)
#   websocket     WebSocket communications between ESP32s and backend
#   all           Run all modular tests
#
# Options
#   --report-dir DIR    Directory to save JSON/CSV reports (default: test-reports)
#   --verbose, -v       Show individual test names
#   --fail-fast, -x     Stop on first failure
#   --help, -h          Show this help message
#
# Examples
#   ./scripts/test-module.sh bme280
#   ./scripts/test-module.sh rfid --verbose
#   ./scripts/test-module.sh room_node --report-dir /tmp/reports
#   ./scripts/test-module.sh all --report-dir test-reports
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
MODULE=""
REPORT_DIR="test-reports"
VERBOSE=false
FAIL_FAST=false

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    bme280|temt6000|dimmer|fan_relay|rfid|solenoid|room_node|door_node|websocket|all)
      MODULE="$1"
      shift
      ;;
    --report-dir)
      REPORT_DIR="$2"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --fail-fast|-x)
      FAIL_FAST=true
      shift
      ;;
    --help|-h)
      sed -n '/^# Usage/,/^# =====\+$/p' "$0" | grep -v '^# ===\+' | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $1${NC}"
      echo "Run '$0 --help' for usage."
      exit 1
      ;;
  esac
done

if [[ -z "$MODULE" ]]; then
  echo -e "${RED}Error: No module specified.${NC}"
  echo ""
  echo "Available modules: bme280  temt6000  dimmer  fan_relay  rfid  solenoid"
  echo "                   room_node  door_node  websocket  all"
  echo ""
  echo "Example: $0 bme280"
  exit 1
fi

# ---------------------------------------------------------------------------
# Locate backend directory
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo -e "${RED}Cannot find backend directory: $BACKEND_DIR${NC}"
  exit 1
fi

# ---------------------------------------------------------------------------
# Activate virtualenv if present
# ---------------------------------------------------------------------------
if [[ -f "$BACKEND_DIR/venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "$BACKEND_DIR/venv/bin/activate"
fi

# ---------------------------------------------------------------------------
# Map module name → pytest marker expression
# ---------------------------------------------------------------------------
case "$MODULE" in
  all)
    MARKER_EXPR="bme280 or temt6000 or dimmer or fan_relay or rfid or solenoid or room_node or door_node or websocket"
    ;;
  solenoid)
    # Solenoid is exercised through the RFID/door_node tests
    MARKER_EXPR="rfid or solenoid or door_node"
    ;;
  *)
    MARKER_EXPR="$MODULE"
    ;;
esac

# ---------------------------------------------------------------------------
# Build pytest command
# ---------------------------------------------------------------------------
PYTEST_ARGS=(
  "tests/modular/"
  "-m" "$MARKER_EXPR"
  "--report-dir" "$REPORT_DIR"
  "--tb=short"
)

if [[ "$VERBOSE" == true ]]; then
  PYTEST_ARGS+=("-v")
else
  PYTEST_ARGS+=("-q")
fi

if [[ "$FAIL_FAST" == true ]]; then
  PYTEST_ARGS+=("-x")
fi

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
echo -e "${BLUE}==================================================${NC}"
echo -e "${CYAN} Smart Home IoT – Modular Test Runner${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "  Module      : ${YELLOW}${MODULE}${NC}"
echo -e "  Marker expr : ${YELLOW}${MARKER_EXPR}${NC}"
echo -e "  Report dir  : ${YELLOW}${REPORT_DIR}${NC}"
echo -e "  Verbose     : ${VERBOSE}"
echo -e "${BLUE}--------------------------------------------------${NC}"
echo ""

cd "$BACKEND_DIR"

PYTHONPATH=. python -m pytest "${PYTEST_ARGS[@]}"
EXIT_CODE=$?

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}✓ All ${MODULE} tests passed.${NC}"
  echo -e "  Reports saved to: ${REPORT_DIR}/"
else
  echo -e "${RED}✗ Some ${MODULE} tests failed. Review output above.${NC}"
fi

exit $EXIT_CODE
