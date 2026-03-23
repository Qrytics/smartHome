# Final Demo Guide

This guide walks you through setting up, testing, and **demonstrating the
complete 4-ESP32 Smart Home system** end to end.

---

## Hardware Required

| Qty | Item |
|-----|------|
| 3 | ESP32-S3 DevKit C1 (room nodes) |
| 1 | ESP32-S3 DevKit C1 (door node) |
| 3 | BME280 sensor module |
| 3 | TEMT6000 ambient light sensor |
| 3 | PWM LED dimmer module |
| 3 | 1-channel 5 V relay module |
| 3 | DC fan (5 V or 12 V) |
| 3 | LED strip or dimmable LED load |
| 1 | MFRC522 RFID reader |
| 3+ | RFID cards / fobs |
| 1 | 12 V solenoid door lock |
| 1 | 1-channel relay module (for solenoid) |
| 1 | Laptop / PC to run backend + frontend |

See `hardware/bom.csv` for a complete parts list with suppliers.

---

## Step 1 – Wire the Hardware

Follow the pin connections in [`docs/WIRING.md`](WIRING.md).

Checklist:
- [ ] Room Node 1 (Living Room) – BME280, TEMT6000, dimmer, fan relay
- [ ] Room Node 2 (Bedroom)     – BME280, TEMT6000, dimmer, fan relay
- [ ] Room Node 3 (Kitchen)     – BME280, TEMT6000, dimmer, fan relay
- [ ] Door Node                 – MFRC522, solenoid relay

---

## Step 2 – Flash the Firmware

### Room Nodes

```bash
cd firmware/room-node

# For Room 1 – edit config.h first
#   #define DEVICE_ROOM_ID    "room-node-01"
#   #define DEVICE_ROOM_LABEL "Living Room"
cp include/secrets.h.example include/secrets.h
# Edit secrets.h: set WIFI_SSID, WIFI_PASSWORD, API_HOST

pio run --target upload   # connect ESP32 via USB first
pio device monitor        # verify sensor readings appear
```

Repeat for Room 2 and Room 3, changing `DEVICE_ROOM_ID` and `DEVICE_ROOM_LABEL`.

### Door Node

```bash
cd firmware/door-control

cp include/secrets.h.example include/secrets.h
# Edit secrets.h

pio run --target upload
pio device monitor        # verify "Waiting for RFID cards..." message
```

---

## Step 3 – Start the Infrastructure

> **Running on Raspberry Pi?**  SSH in first:
> ```powershell
> ssh qrytics@smartHome
> cd ~/smartHome
> ```
> Then run all the commands below on the RPi.
> See [`docs/RPI_DEPLOYMENT.md`](RPI_DEPLOYMENT.md) for the full guide.

```bash
cd infrastructure
docker compose up -d timescaledb mqtt redis
```

Wait ~15 seconds for TimescaleDB to initialise, then apply the schema and seed data:

```bash
# Apply schema
docker exec -i smart-home-timescaledb psql -U smart_home_user smart_home \
  < ../infrastructure/timescaledb/init.sql

# Load sample data (optional)
docker exec -i smart-home-timescaledb psql -U smart_home_user smart_home \
  < ../infrastructure/timescaledb/seed.sql
```

---

## Step 4 – Start the Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate  # (first time only)
pip install -r requirements.txt -r requirements-dev.txt  # (first time only)

cp .env.example .env  # configure if needed

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify the backend is running:

```bash
curl http://localhost:8000/health
# → {"status": "healthy", ...}
```

View the interactive API docs at: **http://localhost:8000/docs**

---

## Step 5 – Register RFID Cards

Use the API to add the cards you want to use for the demo:

```bash
curl -X POST http://localhost:8000/api/access/cards \
  -H "Content-Type: application/json" \
  -d '{
    "card_uid": "<scan-your-card-uid>",
    "user_id": "demo-user",
    "label": "Demo Card",
    "active": true
  }'
```

To find the UID of a card:
1. Open the door-node serial monitor (`pio device monitor` in `firmware/door-control`).
2. Tap the card on the RFID reader.
3. The UID will be printed: `Card detected: 04:A3:2B:F2:1C:80`.
4. Copy that UID into the curl command above.

---

## Step 6 – Start the Frontend

```bash
cd frontend
npm install   # first time only
cp .env.example .env   # set REACT_APP_API_URL=http://localhost:8000
npm start
```

Open **http://localhost:3000** in your browser.

---

## Step 7 – Run the Tests

```bash
cd backend
PYTHONPATH=. pytest -v
```

All 99 tests should pass.

---

## Demo Walkthrough

### Scene A – Environmental Monitoring

1. Open the **Dashboard** page in the frontend.
2. Point a heat source (e.g. hand) near the BME280 on Room Node 1.
3. Observe the temperature reading climb in real time on the dashboard.
4. Move away – temperature returns to ambient.

**Expected result:** Live chart updates within 2 seconds.

---

### Scene B – Ambient Light & Daylight Harvesting

1. On the **Lighting** page, enable **Daylight Harvest Mode** for `room-node-01`.
2. Cover the TEMT6000 sensor with your hand (simulate darkness).
3. Observe the **dimmer brightness** increase (backend commands the ESP32 to brighten).
4. Uncover the sensor (simulate bright light).
5. Observe the dimmer brightness decrease.

**Expected result:** Dimmer adjusts automatically within one sensor-read cycle (~2 s).

---

### Scene C – Manual Dimmer Control

1. Disable Daylight Harvest Mode for `room-node-01`.
2. Use the **Dimmer** slider on the Lighting page to set brightness to 25 %.
3. Observe the LED strip dim.
4. Set to 100 % – LED strip returns to full brightness.

**Expected result:** LED brightness changes within ~1 second of slider release.

---

### Scene D – Fan Control

1. On the **Lighting** page, click **Fan ON** for `room-node-02`.
2. Observe the relay click and the fan spin.
3. Click **Fan OFF** – fan stops.

**Expected result:** Fan responds within ~1 second.

---

### Scene E – Door Access Control

#### Authorized card

1. Tap an **authorized** RFID card on the door node reader.
2. Serial monitor shows `Authorization: GRANTED`.
3. The solenoid energises (lock opens) for 3 seconds.
4. Lock re-engages automatically.
5. The **Access Control** page in the frontend shows a new log entry: `granted = true`.

#### Unauthorized card

1. Tap an **unregistered** card.
2. Serial monitor shows `Authorization: DENIED`.
3. Status LED blinks 3 times (red).
4. Solenoid does **not** activate.
5. Access log shows `granted = false`, reason = `card not registered`.

#### Deactivate a card via API

```bash
curl -X POST http://localhost:8000/api/access/cards \
  -H "Content-Type: application/json" \
  -d '{"card_uid": "<card-uid>", "user_id": "demo-user", "active": false}'
```

6. Tap the same card – access is now denied.

---

### Scene F – Analytics

1. Navigate to the **Analytics** page.
2. Select `room-node-01` from the device dropdown.
3. Select a 24-hour time range.
4. Observe temperature, humidity, light level, and dimmer brightness trend charts.

---

## Troubleshooting During Demo

| Symptom | Fix |
|---------|-----|
| ESP32 not connecting to WiFi | Check `secrets.h`; ensure both ESP32 and laptop on same SSID |
| Backend not receiving data | Check `API_HOST` in `secrets.h`; verify port 8000 is reachable |
| BME280 not found | Check I2C wiring; try `BME280_ADDRESS 0x77` |
| RFID always denied | Check card is registered via `GET /api/access/cards`; check `active=true` |
| Dimmer not changing | Check GPIO25 → dimmer IN wiring; verify PWM module is powered |
| Fan relay not clicking | Check GPIO26 → relay IN; verify relay VCC is 5 V |
| Solenoid not energising | Check relay NO/COM wiring; verify 12 V supply is on |

---

## API Quick Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | System health check |
| POST | `/api/sensors/ingest/environmental` | Ingest BME280 data |
| POST | `/api/sensors/ingest/room-node` | Ingest full room-node data |
| POST | `/api/lighting/dimmer/{device_id}` | Set dimmer brightness |
| POST | `/api/lighting/fan/{device_id}` | Control fan |
| POST | `/api/lighting/relay/{device_id}` | Control relay channel |
| POST | `/api/lighting/daylight-harvest/{device_id}` | Toggle auto-dimming |
| POST | `/api/access/check` | RFID authorization (called by ESP32) |
| GET  | `/api/access/cards` | List registered cards |
| POST | `/api/access/cards` | Register a card |
| GET  | `/api/access/logs` | View access log |
| GET  | `/docs` | Swagger UI |

---

## Resetting for the Next Demo

```bash
# Restart infrastructure (clears in-memory state)
cd infrastructure
docker compose restart

# Re-apply seed data
docker exec -i smart-home-timescaledb psql -U smart_home_user smart_home \
  < timescaledb/seed.sql
```
