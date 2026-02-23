    smartHome/
    ├── .github/
    │ ├── workflows/
    │ │ ├── esp32-build.yml # CI for firmware compilation
    │ │ ├── backend-tests.yml # Python unit tests
    │ │ └── frontend-build.yml # React build/deploy
    │ └── ISSUE_TEMPLATE/
    │ ├── bug_report.md
    │ └── feature_request.md
    │
    ├── docs/
    │ ├── productReqDoc.md # Comprehensive PRD
    │ ├── projectDescription.md # Detailed project overview
    │ ├── SETUP.md # Installation guide
    │ ├── USER_GUIDE.md # End-user documentation
    │ ├── API.md # API reference
    │ ├── ARCHITECTURE.md # System design details
    │ ├── TESTING.md # Testing procedures
    │ └── images/
    │ ├── architecture-diagram.png
    │ ├── hardware-assembly.jpg
    │ └── dashboard-screenshot.png
    │
    ├── firmware/ # ESP32 embedded code
    │ ├── door-control/ # ESP32 #1: RFID + Lock
    │ │ ├── platformio.ini
    │ │ ├── src/
    │ │ │ ├── main.cpp
    │ │ │ ├── rfid_handler.cpp
    │ │ │ ├── rfid_handler.h
    │ │ │ ├── wifi_manager.cpp
    │ │ │ ├── wifi_manager.h
    │ │ │ ├── api_client.cpp
    │ │ │ ├── api_client.h
    │ │ │ └── config.h
    │ │ ├── include/
    │ │ │ └── secrets.h.example # WiFi credentials template
    │ │ ├── test/
    │ │ │ └── test_rfid.cpp
    │ │ └── README.md
    │ │
    │ └── sensor-monitor/ # ESP32 #2: BME280 + OLED
    │ ├── platformio.ini
    │ ├── src/
    │ │ ├── main.cpp
    │ │ ├── sensor_handler.cpp
    │ │ ├── sensor_handler.h
    │ │ ├── display_manager.cpp
    │ │ ├── display_manager.h
    │ │ ├── websocket_client.cpp
    │ │ ├── websocket_client.h
    │ │ └── config.h
    │ ├── include/
    │ │ └── secrets.h.example
    │ └── README.md
    │
    ├── lighting-control/ # ESP32 #3: Ambient Light + Dimmer Control
    │ ├── platformio.ini
    │ ├── src/
    │ │ ├── main.cpp              # Complete lighting control implementation
    │ │ └── config.h              # Hardware pins and calibration settings
    │ ├── include/
    │ │ └── secrets.h.example     # WiFi and API credentials template
    │ └── README.md               # Complete hardware setup guide
    │
    ├── backend/ # Python FastAPI server
    │ ├── app/
    │ │ ├── init.py
    │ │ ├── main.py # FastAPI entry point
    │ │ ├── config.py # Environment variables
    │ │ │
    │ │ ├── api/ # HTTP / WebSocket endpoints
    │ │ │ ├── __init__.py
    │ │ │ ├── health.py           # ✅ GET /health
    │ │ │ ├── sensors.py          # ✅ POST /api/sensors/ingest/lighting, GET /api/sensors/latest, history
    │ │ │ ├── lighting.py         # ✅ POST /api/lighting/dimmer, relay, daylight-harvest, GET /api/lighting/status
    │ │ │ └── websocket.py        # ✅ WS /ws (devices), WS /ws/client (frontend)
    │ │ │
    │ │ ├── models/ # SQLAlchemy models
    │ │ │ ├── __init__.py         # Model exports
    │ │ │ └── lighting.py         # ✅ LightingSensorData, RelayState, DimmerState, Device
    │ │ │
    │ │ ├── services/ # Business logic
    │ │ │ ├── __init__.py         # Service exports
    │ │ │ ├── db_client.py        # ✅ DatabaseClient with CRUD operations
    │ │ │ ├── websocket_manager.py # ✅ ConnectionManager for real-time communication
    │ │ │ └── broker.py           # ✅ Message broker abstraction (MQTT default, Redis alternative)
    │ │ │
    │ │ ├── schemas/ # Pydantic models
    │ │ │ ├── __init__.py         # Schema exports
    │ │ │ └── lighting.py         # ✅ Request/response validation schemas
    │ │ │
    │ │ └── utils/
    │ │ ├── init.py
    │ │ ├── logger.py
    │ │ └── crypto.py
    │ │
    │ ├── tests/
    │ │ ├── init.py
    │ │ ├── conftest.py
    │ │ ├── test_access_api.py
    │ │ ├── test_sensor_api.py
    │ │ └── test_stream_processor.py
    │ │
    │ ├── alembic/
    │ │ ├── versions/
    │ │ ├── env.py
    │ │ └── alembic.ini
    │ │
    │ ├── scripts/
    │ │ ├── init_db.py
    │ │ ├── generate_certs.sh
    │ │ └── stress_test.py
    │ │
    │ ├── requirements.txt
    │ ├── requirements-dev.txt
    │ ├── .env.example
    │ ├── Dockerfile
    │ └── README.md
    │
    ├── frontend/ # React dashboard
    │ ├── public/
    │ │ ├── index.html
    │ │ ├── favicon.ico
    │ │ └── manifest.json
    │ │
    │ ├── src/
    │ │ ├── components/
    │ │ │ ├── AmbientLightGraph.jsx  # ✅ Real-time light level visualization
    │ │ │ ├── DimmerControl.jsx      # ✅ Brightness slider and daylight harvest toggle
    │ │ │ ├── RelayControl.jsx       # ✅ 4-channel relay switches
    │ │ │ └── SystemStatus.jsx       # System monitoring
    │ │ │
    │ │ ├── pages/
    │ │ │ └── Dashboard.jsx          # ✅ Main dashboard with all lighting controls
    │ │ │
    │ │ ├── services/
    │ │ │ └── api.js                 # ✅ Complete API client with all endpoints
    │ │ │
    │ │ ├── contexts/
    │ │ │ └── AuthContext.js
    │ │ │
    │ │ ├── hooks/
    │ │ │ ├── useWebSocket.js
    │ │ │ └── useSensorData.js
    │ │ │
    │ │ ├── pages/
    │ │ │ ├── Dashboard.jsx
    │ │ │ ├── AccessControl.jsx
    │ │ │ ├── Analytics.jsx
    │ │ │ └── Settings.jsx
    │ │ │
    │ │ ├── App.jsx
    │ │ ├── App.css
    │ │ ├── index.js
    │ │ └── index.css
    │ │
    │ ├── package.json
    │ ├── package-lock.json
    │ ├── .env.example
    │ └── README.md
    │
    ├── infrastructure/ # Deployment configs
    │ ├── docker-compose.yml      # TimescaleDB + MQTT + Redis services
    │ ├── docker-compose.dev.yml  # Dev-time overrides for DB/brokers
    │ ├── docker-compose.prod.yml
    │ │
    │ ├── redis/
    │ │ └── redis.conf
    │ │
    │ ├── timescaledb/
    │ │ ├── init.sql              # ✅ Complete schema with lighting tables
    │ │ └── seed.sql              # ✅ Sample data including lighting device
    │ │
    │ ├── nginx/
    │ │ ├── nginx.conf
    │ │ └── Dockerfile
    │ │
    │ └── systemd/
    │ ├── smarthome-backend.service
    │ └── smarthome-frontend.service
    │
    ├── certs/ # TLS certificates (gitignored)
    │ ├── .gitkeep
    │ ├── README.md
    │ ├── ca.crt.example
    │ └── generate.sh
    │
    ├── hardware/ # Physical build resources
    │ ├── schematics/
    │ │ ├── door-control.fzz
    │ │ ├── sensor-module.fzz
    │ │ └── power-supply.fzz
    │ │
    │ ├── 3d-models/
    │ │ ├── esp32-mount.stl
    │ │ ├── sensor-enclosure.stl
    │ │ └── oled-holder.stl
    │ │
    │ ├── bom.csv
    │ └── assembly-guide.pdf
    │
    ├── scripts/ # Top-level utilities
    │ ├── setup-dev-env.sh
    │ ├── run-tests.sh
    │ ├── deploy.sh
    │ └── backup-database.sh
    │
    ├── .gitignore
    ├── .gitattributes
    ├── .editorconfig
    ├── LICENSE
    ├── README.md
    ├── CONTRIBUTING.md
    └── CHANGELOG.md
