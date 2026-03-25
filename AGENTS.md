# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Smart Home IoT web-first building management system (CMU capstone). Three main dev services: **FastAPI backend** (Python 3.12, port 8000), **React frontend** (Node.js 20, port 3000), and **Docker infrastructure** (TimescaleDB on 5432, MQTT/Mosquitto on 1883, Redis on 6379).

### Running services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Docker infra | `cd infrastructure && sudo docker compose up -d timescaledb mqtt redis` | 5432, 1883, 6379 | Must start Docker daemon first: `sudo dockerd &>/tmp/dockerd.log &` |
| Backend | `cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` | 8000 | Requires venv activation; uses `.env` from `backend/.env` |
| Frontend | `cd frontend && npm start` | 3000 | Requires Node.js 20 via nvm: `nvm use 20` |

### Important caveats

- **Node.js version**: The frontend requires Node.js <=20.x (set in `.nvmrc` as `20`). The environment ships with Node 22 by default; use `nvm use 20` before running any frontend commands.
- **Docker daemon**: Must be started manually in Cloud Agent VMs: `sudo dockerd &>/tmp/dockerd.log &`. Wait ~3 seconds before running `docker compose`.
- **Python venv**: Backend deps live in `backend/venv/`. Always activate with `source backend/venv/bin/activate` before running backend commands.
- **Backend tests**: Run from `backend/` directory: `PYTHONPATH=/workspace/backend pytest tests/ -v`. The `PYTHONPATH` is needed because conftest imports `app.main`.
- **Frontend tests**: The project currently has no frontend test files. `CI=true npm test` exits with code 1 (no tests found). Use `npm test -- --passWithNoTests` to get a clean exit.
- **Frontend lint**: `npx eslint src/` from `frontend/` directory.
- **Backend lint**: `flake8 app/ --max-line-length=100` from `backend/` directory (existing code has W293 whitespace warnings).
- **`.env` files**: Copy from `.env.example` for both backend and frontend if not present. Default values work for local dev with Docker infrastructure.
- **Sensor ingestion endpoints** (`POST /api/sensors/ingest/environmental`, `/ingest/room-node`) work without DB writes (fire-and-forget to broker). The access and lighting endpoints attempt DB operations.
- **Frontend build**: `npx react-scripts build` from `frontend/` — produces static bundle in `build/`.
