# AGENTS.md

## Cursor Cloud specific instructions

### Architecture overview

Smart Home IoT web dashboard: React 18 frontend (port 3000) + FastAPI backend (port 8000) + Docker infrastructure (TimescaleDB on 5432, MQTT/Mosquitto on 1883, optional Redis on 6379). Firmware (ESP32/PlatformIO) is hardware-only and not runnable in a cloud VM.

### Running infrastructure services

```bash
cd /workspace/infrastructure && sudo docker compose up -d
```

On first start, the TimescaleDB init SQL (`infrastructure/timescaledb/init.sql`) runs automatically but may error on continuous aggregate policies ("policy refresh window too small"). Tables are still created. If the `devices` table is empty, manually seed:

```bash
sudo docker compose exec -T timescaledb psql -U smart_home_user -d smart_home -f /docker-entrypoint-initdb.d/01-init.sql
sudo docker compose exec -T timescaledb psql -U smart_home_user -d smart_home -f /docker-entrypoint-initdb.d/02-seed.sql
```

### Backend

- **Activate venv:** `cd /workspace/backend && source venv/bin/activate`
- **Run server:** `PYTHONPATH=/workspace/backend uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- **Run tests:** `PYTHONPATH=/workspace/backend pytest tests/ -v`
- **Lint:** `flake8 app/ --max-line-length=120`

**Gotcha:** The `ALLOWED_ORIGINS` field in `backend/.env` must use JSON array syntax (e.g. `["http://localhost:3000","http://localhost:8000"]`), not comma-separated strings. The `.env.example` uses comma-separated format which breaks pydantic-settings 2.x.

**Gotcha:** `PYTHONPATH=/workspace/backend` is required when running tests or uvicorn from the backend directory, since there is no `pyproject.toml` or `setup.py` to make the `app` package installable.

### Frontend

- **Requires Node.js 20** (see `.nvmrc`). Use `nvm use 20` before running commands.
- **Install deps:** `cd /workspace/frontend && npm install`
- **Run dev server:** `npm start` (port 3000, proxies API calls to localhost:8000)
- **Lint:** `npx eslint src/`
- **Tests:** `CI=true npm test` (no test files exist currently, so this exits with code 1; use `--passWithNoTests` to avoid failure)

### Database credentials

The docker-compose uses `smart_home_user` / `changeme` / `smart_home` (user/password/db), while the `.env.example` defaults to `smarthome` / `password` / `smarthome`. When creating `backend/.env`, use `DATABASE_URL=postgresql://smart_home_user:changeme@localhost:5432/smart_home` to match docker-compose.

### Standard commands reference

See `docs/SETUP.md` for full setup guide, `scripts/setup-dev-env.sh` for automated setup, and `scripts/run-tests.sh` for the unified test runner.
