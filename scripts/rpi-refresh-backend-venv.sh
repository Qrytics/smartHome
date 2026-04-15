#!/usr/bin/env bash

# Rebuild backend virtual environment safely on Raspberry Pi.
# Useful after pulling dependency updates (e.g., SQLAlchemy/Pydantic/FastAPI changes).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
VENV_DIR="$BACKEND_DIR/venv"

echo "[INFO] Refreshing backend virtual environment..."
echo "[INFO] Backend directory: $BACKEND_DIR"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "[ERROR] Backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

cd "$BACKEND_DIR"

if [[ -d "$VENV_DIR" ]]; then
  echo "[INFO] Removing existing venv..."
  rm -rf "$VENV_DIR"
fi

echo "[INFO] Creating venv..."
python3 -m venv venv

echo "[INFO] Installing dependencies..."
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

echo "[OK] Backend venv refresh complete."
echo "[OK] Start backend with either of these:"
echo "      1) source ~/smartHome/backend/venv/bin/activate && cd ~/smartHome/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo "      2) ~/smartHome/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir ~/smartHome/backend"
