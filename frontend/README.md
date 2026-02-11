# Smart Home Frontend Dashboard

Full React dashboard for the Smart Home web-first building management system.

## What this frontend includes

- **Dashboard overview** for environmental + lighting telemetry
- **Lighting controls** (dimmer, daylight harvesting toggle, 4 relay channels)
- **Access control UI** (RFID policy cards + audit log table)
- **Analytics** (time-window filtering + CSV export)
- **Settings** (device IDs, admin session, runtime diagnostics)
- **Live updates** over WebSocket (`/ws/client`) with auto-reconnect
- **Graceful fallback mode** for access/policy features when backend endpoints are unavailable
- **Dark Mosaic-inspired visual theme** with flat controls and deep grey gradient background

## Prerequisites

- Node.js 18+
- npm 9+
- Backend API available at `http://localhost:8000` (default)

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend API base URL |
| `REACT_APP_WS_URL` | _empty_ | Optional explicit websocket URL (`ws://.../ws/client`) |
| `REACT_APP_ADMIN_USERNAME` | `admin` | Frontend admin session username |
| `REACT_APP_ADMIN_PASSWORD` | `changeme` | Frontend admin session password |
| `REACT_APP_ENV` | `development` | Optional environment label |

If `REACT_APP_WS_URL` is empty, the app derives websocket URL from `REACT_APP_API_URL`.

## Run locally

```bash
npm start
```

Frontend runs at [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Lint / format

```bash
npm run lint
npm run format
```

## Source layout

```
src/
├── components/
│   ├── access/
│   ├── charts/
│   ├── common/
│   ├── layout/
│   └── lighting/
├── contexts/
├── hooks/
├── pages/
├── services/
└── utils/
```

## Notes on backend compatibility

This dashboard is wired to documented routes in `docs/API.md`.  
If access-control policy endpoints are not yet deployed, the UI uses local fallback storage so pages remain fully usable for demos.
