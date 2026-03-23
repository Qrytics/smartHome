# Raspberry Pi Deployment Guide

This guide covers how to **SSH into the Raspberry Pi**, upload and run the
backend, and open the smart-home dashboard from any machine on the same
network.

> **Quick reference**
> | Item | Value |
> |------|-------|
> | Hostname | `smartHome` |
> | Username | `qrytics` |
> | SSH command | `ssh qrytics@smartHome` |
> | Dashboard URL (from other machine) | `http://smartHome:3000` |
> | API URL (from other machine) | `http://smartHome:8000` |
> | API Swagger docs | `http://smartHome:8000/docs` |

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [SSH Into the Raspberry Pi](#2-ssh-into-the-raspberry-pi)
3. [First-Time Setup on the RPi](#3-first-time-setup-on-the-rpi)
4. [Uploading / Updating Code on the RPi](#4-uploading--updating-code-on-the-rpi)
5. [Starting the Backend and Services](#5-starting-the-backend-and-services)
6. [Accessing the Dashboard](#6-accessing-the-dashboard)
7. [Pointing ESP32 Firmware at the RPi](#7-pointing-esp32-firmware-at-the-rpi)
8. [Stopping Services](#8-stopping-services)
9. [Useful One-Liners and Aliases](#9-useful-one-liners-and-aliases)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### On your laptop / development machine

- **SSH client** installed
  - **Windows:** SSH is built into PowerShell/Command Prompt since Windows 10.
    Open PowerShell and run the SSH commands below.
  - **macOS / Linux:** Terminal with OpenSSH (pre-installed).
- You are **on the same Wi-Fi or LAN** as the Raspberry Pi.

### On the Raspberry Pi

The RPi must already be:
- Powered on
- Connected to the same network as your laptop
- Running Raspberry Pi OS (Debian aarch64, as shown in the login banner)

---

## 2. SSH Into the Raspberry Pi

### Standard login

```powershell
# Windows PowerShell / macOS / Linux terminal
ssh qrytics@smartHome
```

You will be prompted for the password. Enter the password for the `qrytics`
account and press **Enter**.

A successful login looks like this:

```
qrytics@smarthome's password:
Linux smartHome 6.12.47+rpt-rpi-v8 #1 SMP PREEMPT Debian 1:6.12.47-1+rpt1 (2025-09-16) aarch64
...
Last login: Wed Mar 11 10:05:46 2026 from 172.26.1.195
qrytics@smartHome:~ $
```

### If the hostname does not resolve

If `smartHome` is not resolving, try the RPi's direct IP address instead:

```powershell
# Find the IP from the RPi (run this while already logged in):
hostname -I
# Example output: 172.26.1.100

# Then connect from your laptop using the IP
ssh qrytics@172.26.1.100
```

### Set up passwordless SSH (optional but recommended)

```powershell
# On your laptop – generate a key pair once (skip if you already have one)
ssh-keygen -t ed25519 -C "smartHome-dev"

# Copy your public key to the RPi
ssh-copy-id qrytics@smartHome
```

After this, `ssh qrytics@smartHome` will not ask for a password.

---

## 3. First-Time Setup on the RPi

Run these steps **once** after the first SSH login.

### 3.1 Clone the repository

```bash
# On the RPi (after SSH)
cd ~
git clone https://github.com/Qrytics/smartHome.git
cd smartHome
```

### 3.2 Install system dependencies

> **Note:** The `docker-compose-plugin` package is not available in the default Raspberry Pi OS repositories.
> `scripts/rpi-setup.sh` handles everything below automatically, including the known
> `raspbian trixie 404` APT error (see the note inside the script for details).

Run the provided setup script — it is safe to run multiple times:

```bash
cd ~/smartHome
chmod +x scripts/rpi-setup.sh
./scripts/rpi-setup.sh
```

The script:
1. Removes any APT source that references `download.docker.com/linux/raspbian` (which does not exist for trixie).
2. Runs `apt update && apt upgrade -y`.
3. Installs Python 3, Node.js, npm, git, and libpq-dev.
4. Installs Docker Engine + Docker Compose via the official convenience script (`https://get.docker.com`).
5. Post-install: if `get.docker.com` wrote a `raspbian` source, replaces it with `debian` so future `apt update` calls succeed.
6. Adds the current user to the `docker` group.

When the script finishes, log out and back in so the `docker` group takes effect:

```bash
exit
```

Re-connect:

```bash
ssh qrytics@smartHome
```

### 3.3 Set up the Python virtual environment

> **Note:** On ARM architectures (e.g. RPi 5) `psycopg2-binary` may attempt to build from source and
> require the PostgreSQL development headers (`libpq-dev`) to be present at the OS level.
> This is already installed in step 3.2 above.

```bash
cd ~/smartHome/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3.4 Configure the backend environment file

```bash
cp .env.example .env
nano .env   # or use vim / any editor you prefer
```

Key variables to set in `.env`:

```bash
DATABASE_URL=postgresql://smarthome:password@localhost:5432/smarthome
BROKER_TYPE=mqtt
MQTT_BROKER_URL=mqtt://localhost:1883
API_HOST=0.0.0.0
API_PORT=8000
ALLOWED_ORIGINS=http://smartHome:3000,http://localhost:3000
```

### 3.5 Install and configure the frontend

```bash
cd ~/smartHome/frontend
npm install
```

Copy the frontend environment file:

```bash
cp .env.example .env
nano .env
```

Set the API URL to the RPi:

```bash
REACT_APP_API_URL=http://smartHome:8000
REACT_APP_WS_URL=ws://smartHome:8000/ws/client
```

### 3.6 Start infrastructure services (database + MQTT + Redis)

```bash
cd ~/smartHome/infrastructure
docker compose up -d timescaledb mqtt redis
```

Wait ~15 seconds for TimescaleDB to initialize, then apply the schema:

```bash
docker exec -i smarthome-timescaledb psql -U smarthome smarthome \
  < ~/smartHome/infrastructure/timescaledb/init.sql

# Optional: load sample data
docker exec -i smarthome-timescaledb psql -U smarthome smarthome \
  < ~/smartHome/infrastructure/timescaledb/seed.sql
```

---

## 4. Uploading / Updating Code on the RPi

### Option A – Git pull (recommended for regular updates)

```bash
# On the RPi
cd ~/smartHome
git pull origin main
```

Then reinstall any new Python or Node dependencies if requirements changed:

```bash
# Backend
cd ~/smartHome/backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ~/smartHome/frontend
npm install
```

### Option B – SCP a single file from your laptop

Use this when you have a local change you want to push to the RPi quickly,
without committing first.

```powershell
# Windows PowerShell / macOS / Linux terminal (run on your LAPTOP)

# Copy a single file
scp backend/app/api/sensors.py qrytics@smartHome:~/smartHome/backend/app/api/sensors.py

# Copy an entire directory
scp -r backend/app/api/ qrytics@smartHome:~/smartHome/backend/app/api/

# Copy the whole backend folder
scp -r backend/ qrytics@smartHome:~/smartHome/
```

### Option C – rsync (efficient for large syncs)

```bash
# Run on your LAPTOP – syncs the backend directory, skipping venv
rsync -avz --exclude='venv/' --exclude='__pycache__/' \
  backend/ qrytics@smartHome:~/smartHome/backend/
```

---

## 5. Starting the Backend and Services

### 5.1 Start Docker infrastructure

```bash
# On the RPi
cd ~/smartHome/infrastructure
docker compose up -d
```

### 5.2 Start the FastAPI backend

```bash
cd ~/smartHome/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will print:

```
Smart Home Backend Starting...
✓ Database client initialized
✓ WebSocket manager initialized
All services initialized successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

> **Tip:** Run the backend in the background with `nohup` so it keeps running
> after you close the SSH session:
>
> ```bash
> nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > ~/backend.log 2>&1 &
> echo "Backend PID: $!"
> ```
>
> View the log with `tail -f ~/backend.log`.

### 5.3 Start the frontend dashboard

Open a **second SSH session** (or use `tmux` / `screen`):

```bash
ssh qrytics@smartHome
cd ~/smartHome/frontend
npm start
```

The React dev server will start on port **3000**:

```
Compiled successfully!

You can now view smart-home-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://172.26.1.100:3000
```

> **Production build (faster, recommended for demo):**
>
> ```bash
> npm run build
> npx serve -s build -l 3000
> ```

### 5.4 Run backend as a systemd service (auto-start on reboot)

Create the service file on the RPi:

```bash
sudo nano /etc/systemd/system/smarthome-backend.service
```

Paste the following content:

```ini
[Unit]
Description=Smart Home FastAPI Backend
After=network.target docker.service

[Service]
User=qrytics
WorkingDirectory=/home/qrytics/smartHome/backend
ExecStart=/home/qrytics/smartHome/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PYTHONPATH=/home/qrytics/smartHome/backend

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable smarthome-backend
sudo systemctl start smarthome-backend

# Check status
sudo systemctl status smarthome-backend

# View live logs
sudo journalctl -u smarthome-backend -f
```

---

## 6. Accessing the Dashboard

### From a laptop / PC on the same network

Open a browser and navigate to:

```
http://smartHome:3000
```

If the hostname does not resolve, use the RPi's IP address:

```
http://172.26.1.100:3000
```

### Verify the backend API is reachable

```powershell
# From your laptop's terminal
curl http://smartHome:8000/health
# or open in a browser
# http://smartHome:8000/docs  ← Swagger UI
```

### Access the dashboard while SSH'd into the RPi

If you are already logged into the RPi via SSH, you can also open the
dashboard on the RPi's own browser (e.g., via VNC / a connected monitor):

```bash
# Open in Chromium on the RPi
chromium-browser http://localhost:3000 &
```

### SSH port-forwarding (access RPi dashboard through your laptop)

If you cannot reach `smartHome:3000` directly (e.g., different subnet or
firewall), forward the RPi's port 3000 to your laptop:

```powershell
# On your laptop – forwards RPi port 3000 to localhost:3000
ssh -L 3000:localhost:3000 qrytics@smartHome

# Then open in your browser:
# http://localhost:3000
```

You can forward multiple ports at once:

```powershell
# Forward both the frontend (3000) and backend (8000)
ssh -L 3000:localhost:3000 -L 8000:localhost:8000 qrytics@smartHome
# Dashboard: http://localhost:3000
# API docs:  http://localhost:8000/docs
```

---

## 7. Pointing ESP32 Firmware at the RPi

Once the backend is running on the RPi, all four ESP32s need to know the
RPi's IP address (or hostname) so they can post sensor data and receive
commands.

### 7.1 Find the RPi's local IP address

```bash
# On the RPi
hostname -I
# Example: 172.26.1.100
```

### 7.2 Set `API_HOST` in firmware secrets

Edit `include/secrets.h` in each firmware project before uploading:

```cpp
// firmware/room-node/include/secrets.h
// firmware/door-control/include/secrets.h
// firmware/lighting-control/include/secrets.h
// firmware/sensor-monitor/include/secrets.h

#define WIFI_SSID     "YourNetworkName"
#define WIFI_PASSWORD "YourNetworkPassword"
#define API_HOST      "172.26.1.100"   // ← RPi IP address (or "smartHome")
#define API_PORT      8000
```

### 7.3 Flash and monitor (from your laptop with USB-connected ESP32)

```bash
# Flash door node
cd firmware/door-control
pio run --target upload
pio device monitor   # watch for "Connected to backend" message

# Flash room node 1
cd firmware/room-node
# edit src/config.h: DEVICE_ROOM_ID "room-node-01"
pio run --target upload
pio device monitor
```

### 7.4 Confirm data arriving at the RPi backend

```bash
# On the RPi – watch backend logs
sudo journalctl -u smarthome-backend -f
# or if running manually:
tail -f ~/backend.log
```

You should see lines like:

```
[SENSOR] Room-node data from room-node-01 (Living Room):
  Temp: 22.5°C  Hum: 55.0%  Press: 1013 hPa
  Light: 45.3% (453 lux)  Dimmer: 65%
  Fan: False  DH: True
```

---

## 8. Stopping Services

### Stop the backend (if running manually)

Press **Ctrl+C** in the terminal running `uvicorn`, or:

```bash
# Find and kill by process name
pkill -f "uvicorn app.main"
```

### Stop the backend systemd service

```bash
sudo systemctl stop smarthome-backend
```

### Stop Docker services

```bash
cd ~/smartHome/infrastructure
docker compose down
```

### Stop the frontend dev server

Press **Ctrl+C** in the terminal running `npm start`.

### Reboot the RPi safely

```bash
sudo reboot
```

After reboot, SSH back in and restart services (or they start automatically
if you configured the systemd service).

---

## 9. Useful One-Liners and Aliases

Add these to `~/.bashrc` on the RPi for convenience:

```bash
# Open ~/.bashrc
nano ~/.bashrc

# Paste at the bottom:

# Smart Home shortcuts
alias smh-start='cd ~/smartHome/infrastructure && docker compose up -d && \
  cd ~/smartHome/backend && source venv/bin/activate && \
  uvicorn app.main:app --host 0.0.0.0 --port 8000 &'

alias smh-stop='pkill -f "uvicorn app.main"; \
  cd ~/smartHome/infrastructure && docker compose down'

alias smh-logs='sudo journalctl -u smarthome-backend -f'

alias smh-status='docker compose -f ~/smartHome/infrastructure/docker-compose.yml ps && \
  systemctl is-active smarthome-backend'

alias smh-update='cd ~/smartHome && git pull && \
  cd backend && source venv/bin/activate && pip install -r requirements.txt && \
  cd ../frontend && npm install && echo "Update complete"'

alias smh-ip='hostname -I | awk "{print \$1}"'
```

Reload the aliases without logging out:

```bash
source ~/.bashrc
```

### Usage examples

```bash
smh-update     # pull latest code + reinstall deps
smh-start      # start all services
smh-logs       # stream live backend logs
smh-status     # check what is running
smh-stop       # stop all services
smh-ip         # print the RPi's IP address
```

---

## 10. Troubleshooting

### "Could not resolve hostname smartHome"

The mDNS broadcast may not be working on your network.

```powershell
# Use the IP address instead
ssh qrytics@172.26.1.100
```

Or find the IP by logging into your router's admin page and looking for a
device named `smartHome`.

### "Connection refused" on port 8000

The backend is not running.  SSH in and start it:

```bash
ssh qrytics@smartHome
cd ~/smartHome/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### "Connection refused" on port 3000

The frontend server is not running.

```bash
ssh qrytics@smartHome
cd ~/smartHome/frontend
npm start
```

### `apt update` fails with 404 for `download.docker.com/linux/raspbian trixie`

Raspberry Pi OS **trixie** (Debian 13) does not have a Docker package repository under the
`raspbian` codename. A source entry pointing to that URL will cause every `apt update` to fail:

```
Err: https://download.docker.com/linux/raspbian trixie Release
     404  Not Found
```

This can happen either from a previous manual Docker installation attempt **or** because the
`get.docker.com` convenience script incorrectly detects the OS as `raspbian` instead of `debian`
on some Raspberry Pi OS 64-bit images and writes the wrong repository URL.

**Quickest fix** – run the provided setup script, which handles both cases:

```bash
cd ~/smartHome
chmod +x scripts/rpi-setup.sh
./scripts/rpi-setup.sh
```

**Manual fix** – if you need to repair the system without running the full script:

```bash
# 1. Remove *any* APT source file referencing the raspbian Docker repo
sudo grep -rl "download\.docker\.com.*raspbian" /etc/apt/sources.list.d/ 2>/dev/null \
  | xargs -r sudo rm -f
sudo sed -i '/download\.docker\.com.*raspbian/id' /etc/apt/sources.list

# 2. Remove orphaned keyrings
sudo rm -f /etc/apt/keyrings/docker.gpg /etc/apt/keyrings/docker.asc

# 3. Re-run apt update
sudo apt update
```

If Docker is already installed and the source points to `raspbian`, replace it with `debian`:

```bash
sudo sed -i 's|download\.docker\.com/linux/raspbian|download.docker.com/linux/debian|ig' \
  /etc/apt/sources.list.d/docker.list
sudo apt update
```

### Docker containers not starting

```bash
# Check status
cd ~/smartHome/infrastructure
docker compose ps
docker compose logs

# Restart
docker compose down && docker compose up -d
```

### Permission denied (publickey)

The RPi is configured for password authentication. If you see this:

```
qrytics@smartHome: Permission denied (publickey).
```

Try forcing password authentication:

```powershell
ssh -o PreferredAuthentications=password qrytics@smartHome
```

Or re-run `ssh-copy-id` to install your public key.

### Backend starts but ESP32 can't reach it

1. Make sure `API_HOST` in `secrets.h` matches the RPi's actual IP (`hostname -I` on the RPi).
2. Check the ESP32 and RPi are on the **same Wi-Fi network**.
3. Verify port 8000 is not blocked by a firewall:
   ```bash
   # On the RPi
   sudo ufw allow 8000/tcp
   sudo ufw allow 3000/tcp
   ```

### "Address already in use" when starting the backend

A previous instance is still running:

```bash
# Find and kill it
lsof -ti:8000 | xargs kill -9
```

---

## Summary Checklist

Use this as a quick reference every time you work on the project:

- [ ] `ssh qrytics@smartHome` – log in to the RPi
- [ ] `cd ~/smartHome && git pull` – pull the latest code
- [ ] `cd infrastructure && docker compose up -d` – start DB + MQTT + Redis
- [ ] `cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000` – start API
- [ ] `cd frontend && npm start` (second SSH tab) – start dashboard
- [ ] Open `http://smartHome:3000` in your browser – view the dashboard
- [ ] `http://smartHome:8000/docs` – test API endpoints interactively

---

*Last updated: 2026-03-23*
