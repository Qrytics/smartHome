# Setup Guide

This guide will help you set up the Smart Home project development environment on your local machine.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Component-Specific Setup](#component-specific-setup)
4. [Environment Variables](#environment-variables)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

#### For Backend Development
- **Python 3.11 or higher**
  ```bash
  python --version  # Should show 3.11+
  ```
- **pip** (Python package manager)
- **virtualenv** or **venv** (for isolated Python environments)

#### For Frontend Development
- **Node.js 18 or higher**
  ```bash
  node --version  # Should show v18+
  ```
- **npm 9+ or yarn**
  ```bash
  npm --version  # Should show 9+
  ```

#### For Firmware Development
- **PlatformIO Core** or **PlatformIO IDE**
  ```bash
  pio --version  # Should show 6.1+
  ```
  Install via: `pip install platformio`

#### For Infrastructure
- **Docker 24+**
  ```bash
  docker --version
  ```
- **Docker Compose V2**
  ```bash
  docker compose version
  ```

#### Optional Tools
- **Git** (version control)
- **Visual Studio Code** with extensions:
  - Python
  - PlatformIO IDE
  - ESLint
  - Prettier

## Quick Start

### Automated Setup

Run the automated setup script to configure all components:

```bash
# Clone the repository
git clone https://github.com/Qrytics/smartHome.git
cd smartHome

# Make setup script executable
chmod +x scripts/setup-dev-env.sh

# Run automated setup
./scripts/setup-dev-env.sh
```

This script will:
1. Create Python virtual environment
2. Install backend dependencies
3. Install frontend dependencies
4. Build firmware projects
5. Start Docker services
6. Generate development certificates

### Verify Installation

```bash
# Check backend
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -c "import fastapi; print(fastapi.__version__)"

# Check frontend
cd ../frontend
node -e "console.log(require('./package.json').dependencies.react)"

# Check firmware
cd ../firmware/door-control
pio run

# Check infrastructure
cd ../../infrastructure
docker compose ps
```

## Component-Specific Setup

### Backend Setup

1. **Create virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
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

5. **Initialize database:**
   ```bash
   cd ../backend
   # Database migrations will be added via Alembic
   ```

6. **Run backend server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Test API:**
   Open browser to: http://localhost:8000/docs

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env to point to your backend
   # REACT_APP_API_URL=http://localhost:8000
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Access dashboard:**
   Open browser to: http://localhost:3000

### Firmware Setup

#### Door Control ESP32

1. **Navigate to project:**
   ```bash
   cd firmware/door-control
   ```

2. **Configure secrets:**
   ```bash
   cp include/secrets.h.example include/secrets.h
   # Edit secrets.h with your WiFi credentials and API endpoint
   ```

3. **Build firmware:**
   ```bash
   pio run
   ```

4. **Upload to ESP32 (with device connected):**
   ```bash
   pio run --target upload
   ```

5. **Monitor serial output:**
   ```bash
   pio device monitor
   ```

#### Sensor Monitor ESP32

1. **Navigate to project:**
   ```bash
   cd firmware/sensor-monitor
   ```

2. **Configure secrets:**
   ```bash
   cp include/secrets.h.example include/secrets.h
   ```

3. **Build and upload:**
   ```bash
   pio run --target upload
   pio device monitor
   ```

#### Lighting Control ESP32

1. **Navigate to project:**
   ```bash
   cd firmware/lighting-control
   ```

2. **Configure secrets:**
   ```bash
   cp include/secrets.h.example include/secrets.h
   # Edit include/secrets.h with your WiFi credentials and backend IP
   ```

3. **Verify hardware connections:**
   - **TEMT6000 Light Sensor:** VCC→3.3V, GND→GND, SIG→GPIO 34
   - **PWM Dimmer Module:** VCC→5V, GND→GND, SIG→GPIO 25, LED power supply→12V
   - **4-Channel Relay Module:** VCC→5V, GND→GND, IN1→GPIO 26, IN2→GPIO 27, IN3→GPIO 14, IN4→GPIO 12

4. **Build and upload:**
   ```bash
   pio run --target upload
   pio device monitor
   ```

5. **Test functionality:**
   - Observe ambient light readings in serial monitor (updates every 500ms)
   - Verify PWM dimmer responds to daylight harvesting (brightness adjusts based on ambient light)
   - Test relay control via WebSocket commands from backend

6. **Calibrate light sensor (optional):**
   - Adjust `LIGHT_MAX_LUX` in `src/config.h` to match your environment
   - Typical values: office (300-500 lux), living room (50-150 lux)

### Infrastructure Setup

1. **Start all services:**
   ```bash
   cd infrastructure
   docker compose up -d
   ```

2. **Verify services:**
   ```bash
   # Check Redis
   docker compose exec redis redis-cli ping
   # Should return: PONG
   
   # Check TimescaleDB
   docker compose exec timescaledb psql -U smartho me -c "SELECT version();"
   ```

3. **View logs:**
   ```bash
   docker compose logs -f
   ```

4. **Stop services:**
   ```bash
   docker compose down
   ```

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://smarthome:password@localhost:5432/smarthome
REDIS_URL=redis://localhost:6379/0

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true

# Security
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# TLS Certificates
TLS_CA_CERT=../certs/ca.crt
TLS_SERVER_CERT=../certs/server.crt
TLS_SERVER_KEY=../certs/server.key

# Logging
LOG_LEVEL=INFO
```

### Frontend (.env)

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
```

### Firmware (secrets.h)

```cpp
// WiFi Configuration
#define WIFI_SSID "YourNetworkName"
#define WIFI_PASSWORD "YourNetworkPassword"

// API Configuration
#define API_HOST "192.168.1.100"  // Backend IP address
#define API_PORT 8000
#define API_USE_TLS true

// Device Configuration
#define DEVICE_ID "door-control-01"
#define DEVICE_SECRET "your-device-secret"
```

## Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError: No module named 'fastapi'`
- **Solution:** Ensure virtual environment is activated and dependencies are installed:
  ```bash
  source venv/bin/activate
  pip install -r requirements.txt
  ```

**Problem:** Cannot connect to Redis
- **Solution:** Ensure Docker services are running:
  ```bash
  cd infrastructure
  docker compose up -d redis
  docker compose logs redis
  ```

**Problem:** Database connection error
- **Solution:** Check TimescaleDB is running and credentials match:
  ```bash
  docker compose ps timescaledb
  docker compose logs timescaledb
  ```

### Frontend Issues

**Problem:** `npm install` fails
- **Solution:** Clear npm cache and try again:
  ```bash
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install
  ```

**Problem:** CORS errors in browser console
- **Solution:** Verify backend `ALLOWED_ORIGINS` includes frontend URL:
  ```python
  # In backend/.env
  ALLOWED_ORIGINS=http://localhost:3000
  ```

**Problem:** Cannot connect to WebSocket
- **Solution:** Check backend WebSocket endpoint is accessible:
  ```bash
  curl -i -N \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: test" \
    http://localhost:8000/ws
  ```

### Firmware Issues

**Problem:** `pio` command not found
- **Solution:** Install PlatformIO:
  ```bash
  pip install platformio
  ```

**Problem:** Upload fails - cannot find port
- **Solution:** 
  1. Connect ESP32 via USB
  2. Find port: `pio device list`
  3. Specify port: `pio run --target upload --upload-port /dev/ttyUSB0`

**Problem:** ESP32 crashes or reboots repeatedly
- **Solution:** Check serial monitor for errors:
  ```bash
  pio device monitor --baud 115200
  ```
  Common issues:
  - WiFi credentials incorrect
  - Power supply insufficient (use 5V 2A minimum)
  - TLS certificate validation failing

**Problem:** Firmware compiles but doesn't work
- **Solution:** Erase flash and re-upload:
  ```bash
  pio run --target erase
  pio run --target upload
  ```

### Infrastructure Issues

**Problem:** Docker services won't start
- **Solution:** Check for port conflicts:
  ```bash
  # Check if ports are already in use
  lsof -i :6379  # Redis
  lsof -i :5432  # PostgreSQL
  ```

**Problem:** Permission denied accessing Docker
- **Solution:** Add user to docker group:
  ```bash
  sudo usermod -aG docker $USER
  # Log out and back in for changes to take effect
  ```

**Problem:** Out of disk space
- **Solution:** Clean up Docker resources:
  ```bash
  docker system prune -a --volumes
  ```

### Certificate Issues

**Problem:** TLS handshake fails
- **Solution:** Regenerate certificates:
  ```bash
  cd certs
  ./generate.sh
  # Copy certificates to firmware and backend
  ```

**Problem:** Certificate validation errors on ESP32
- **Solution:** Ensure ESP32 has correct CA certificate embedded in firmware

## Next Steps

After completing setup:

1. **Read the architecture documentation:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
2. **Review API documentation:** [docs/API.md](API.md)
3. **Check testing guide:** [docs/TESTING.md](TESTING.md)
4. **Review contribution guidelines:** [CONTRIBUTING.md](../CONTRIBUTING.md)

## Getting Help

- **Documentation:** Check other files in `docs/` folder
- **Issues:** Open an issue on GitHub
- **Team:** Contact project team members (see main README.md)

---

Last updated: 2026-02-09

### Lighting Control Specific Issues

**Problem:** Light sensor always reads 0
- **Solution:**
  - Check TEMT6000 wiring: VCC→3.3V, GND→GND, SIG→GPIO 34
  - Verify sensor has light exposure (not covered or in dark enclosure)
  - Test with multimeter: SIG pin should read 0-3.3V proportional to light
  - Increase ambient light and check if reading changes

**Problem:** PWM dimmer not responding
- **Solution:**
  - Verify dimmer module has both 5V logic power and 12V LED supply
  - Check PWM signal with oscilloscope: should be 5 kHz, 0-3.3V
  - Ensure LED polarity is correct on output terminals
  - Test dimmer manually by connecting SIG to VCC (should go full brightness)

**Problem:** Relays not switching
- **Solution:**
  - Verify relay module has 5V power supply
  - Check GPIO signals with multimeter (HIGH = 3.3V when active)
  - Some modules use active-LOW logic - set `RELAY_ACTIVE_HIGH false` in config.h
  - Test relay manually by connecting IN pins to VCC/GND

**Problem:** Daylight harvesting not working correctly
- **Solution:**
  - Calibrate `LIGHT_MAX_LUX` in `config.h` to match your environment
  - Adjust `TARGET_LUX` (default 300) for desired brightness level
  - Check that daylight harvesting is enabled (default: true)
  - Monitor serial output to see actual lux readings vs. dimmer adjustments

**Problem:** Dimmer brightness inverted (brighter when should be dimmer)
- **Solution:**
  - Some PWM modules invert the signal
  - Swap calculation in `updateDimmer()` function to invert PWM values

---

## Next Steps

After completing the setup:

1. **Access the dashboard:**
   ```
   http://localhost:3000
   ```

2. **View API documentation:**
   ```
   http://localhost:8000/docs
   ```

3. **Monitor real-time data:**
   - Open WebSocket connection to `ws://localhost:8000/ws/client`
   - Observe sensor data streams from connected devices

4. **Test lighting control:**
   - Use dashboard to adjust dimmer brightness
   - Toggle relays on/off
   - Enable/disable daylight harvesting
   - Monitor ambient light levels in real-time

5. **Review logs:**
   ```bash
   # Backend logs
   tail -f backend/logs/app.log
   
   # Docker services
   cd infrastructure && docker compose logs -f
   
   # ESP32 serial monitor
   cd firmware/lighting-control && pio device monitor
   ```

---

Last updated: 2026-02-11
