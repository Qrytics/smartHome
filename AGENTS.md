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
- **TimescaleDB init scripts**: The `timescaledb-tune` entrypoint script in the TimescaleDB Docker image may crash on first init, preventing `01-init.sql` and `02-seed.sql` from running automatically. If tables are missing after `docker compose up`, manually run: `sudo docker compose exec -T timescaledb psql -U smart_home_user -d smart_home < timescaledb/init.sql && sudo docker compose exec -T timescaledb psql -U smart_home_user -d smart_home < timescaledb/seed.sql` from the `infrastructure/` directory.
- **Redis auth**: Redis is configured with password `changeme` in `redis/redis.conf`. The backend's default `REDIS_URL` in `.env.example` does not include the password. Since the default broker is MQTT (not Redis), this only matters if `BROKER_TYPE=redis` is set.

### Known firmware/hardware issues (for demo prep)

A comprehensive audit found critical issues that must be addressed before flashing to real ESP32-S3 hardware:

1. **GPIO pin assignments are for original ESP32, not ESP32-S3** — GPIO 22, 25 do not exist on ESP32-S3; GPIO 26-32 conflict with SPI flash. All 4 firmware projects need pin remapping.
2. **`lighting-control` firmware fails to compile** — missing braces in a `switch` case body causes `-fpermissive` error.
3. **`room-node/.gitignore` missing `secrets.h`** — credential exposure risk.
4. **`#ifdef USE_TLS` vs `#if USE_TLS`** — preprocessor bug in door-control always enables TLS path.
5. **Hardcoded timestamps** — 3 of 4 projects return static ISO 8601 strings instead of real NTP time.
6. **No hardware watchdog timer** — door could stay unlocked if firmware crashes during unlock.
7. **PlatformIO platform version not pinned** — LEDC API changed between Arduino core 2.x→3.x.
8. **Flyback diodes** bought but not documented in wiring diagrams for solenoid/fans.
9. **Docs reference BH1750 (I2C) but firmware uses TEMT6000 (analog ADC)** — documentation mismatch.

See `/opt/cursor/artifacts/firmware_audit_report.md` for the complete report with fixes.
