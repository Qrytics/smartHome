# Backend (Python/FastAPI)

FastAPI backend for the Smart Home system, providing REST API and WebSocket endpoints for device communication and dashboard integration.

## Features

- **Access Control API**: RFID card authorization with sub-50ms response time
- **Sensor Data Ingestion**: Real-time environmental data collection
- **WebSocket Streaming**: Live data broadcast to dashboard clients
- **Policy Management**: RFID whitelist CRUD operations
- **Time-Series Storage**: Historical data in TimescaleDB
- **Event-Driven Architecture**: Redis Streams for async processing

## Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: TimescaleDB (PostgreSQL extension)
- **Cache/Broker**: Redis (in-memory data store)
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2
- **ASGI Server**: Uvicorn

## Quick Start

### Prerequisites

- Python 3.11 or higher
- Docker and Docker Compose (for Redis and TimescaleDB)

### Installation

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # For development
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure services:**
   ```bash
   cd ../infrastructure
   docker compose up -d redis timescaledb
   ```

5. **Run database migrations:**
   ```bash
   # TODO: Add Alembic migration commands
   # alembic upgrade head
   ```

6. **Start development server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Access API documentation:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app initialization
│   ├── config.py            # Configuration management
│   │
│   ├── api/                 # API endpoints
│   │   ├── __init__.py
│   │   ├── health.py        # Health check endpoints
│   │   ├── access.py        # Access control (TODO)
│   │   ├── sensors.py       # Sensor data ingestion (TODO)
│   │   ├── policies.py      # RFID policy management (TODO)
│   │   └── websocket.py     # WebSocket handler (TODO)
│   │
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── device.py        # (TODO)
│   │   ├── access_log.py    # (TODO)
│   │   ├── sensor_data.py   # (TODO)
│   │   └── policy.py        # (TODO)
│   │
│   ├── services/            # Business logic
│   │   ├── __init__.py
│   │   ├── redis_client.py  # (TODO)
│   │   ├── db_client.py     # (TODO)
│   │   └── auth_service.py  # (TODO)
│   │
│   ├── schemas/             # Pydantic models
│   │   ├── __init__.py
│   │   ├── access.py        # (TODO)
│   │   └── sensor.py        # (TODO)
│   │
│   └── utils/               # Helper functions
│       ├── __init__.py
│       ├── logger.py        # (TODO)
│       └── crypto.py        # (TODO)
│
├── alembic/                 # Database migrations
├── requirements.txt         # Production dependencies
├── requirements-dev.txt     # Development dependencies
├── .env.example             # Environment template
└── README.md                # This file
```

## Development

### Code Quality

```bash
# Format code
black app/

# Check style
flake8 app/

# Type checking
mypy app/

# Sort imports
isort app/
```

### Running Locally

```bash
# Development mode (auto-reload)
uvicorn app.main:app --reload

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Health Check
- `GET /health` - Service health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Access Control (TODO)
- `POST /api/access/check` - Validate RFID card
- `GET /api/access/logs` - Retrieve access history

### Sensor Data (TODO)
- `POST /api/sensors/ingest` - Ingest sensor readings
- `GET /api/sensors/readings` - Query historical data

### Policy Management (TODO)
- `GET /api/policies/cards` - List authorized cards
- `POST /api/policies/cards` - Add card to whitelist
- `DELETE /api/policies/cards/{uid}` - Remove card

### WebSocket (TODO)
- `WS /ws` - Real-time data streaming

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: JWT signing key (CHANGE IN PRODUCTION!)
- `ALLOWED_ORIGINS`: CORS allowed origins

## Database

### Schema

```sql
-- Access logs
CREATE TABLE access_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    device_id TEXT NOT NULL,
    card_uid TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    latency_ms INTEGER
);

-- Sensor data (hypertable)
CREATE TABLE sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    device_id TEXT NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    pressure DOUBLE PRECISION
);

SELECT create_hypertable('sensor_readings', 'time');
```

### Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Performance Targets

- **Access Check Latency**: <50ms (P99)
- **Sensor Ingestion**: <100ms acknowledgment
- **WebSocket Latency**: <200ms for dashboard updates
- **Database Queries**: <100ms for 24-hour range

## Security

- Mutual TLS for device authentication
- JWT tokens for dashboard authentication
- Input validation with Pydantic
- SQL injection prevention via SQLAlchemy ORM
- CORS configuration
- Rate limiting (TODO)

## Deployment

### Docker

```bash
# Build image
docker build -t smarthome-backend .

# Run container
docker run -p 8000:8000 --env-file .env smarthome-backend
```

### Systemd Service

See `../infrastructure/systemd/smarthome-backend.service`

## Troubleshooting

### Cannot connect to Redis

```bash
# Check if Redis is running
docker compose ps redis

# Test connection
redis-cli ping
```

### Database connection error

```bash
# Check if TimescaleDB is running
docker compose ps timescaledb

# Test connection
psql postgresql://smarthome:password@localhost:5432/smarthome
```

### Import errors

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

See [LICENSE](../LICENSE) file in repository root.

---

Last updated: 2026-02-09
