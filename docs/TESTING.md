# Testing Strategy

This document describes the testing strategy, procedures, and guidelines for the Smart Home project.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Types](#test-types)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [Firmware Testing](#firmware-testing)
6. [Integration Testing](#integration-testing)
7. [Performance Testing](#performance-testing)
8. [Hardware Testing](#hardware-testing)
9. [CI/CD Pipeline](#cicd-pipeline)

## Testing Philosophy

### Test Pyramid

We follow the testing pyramid approach:

```
        /\
       /  \         E2E Tests (Few)
      /____\        - Full system integration
     /      \       - User scenarios
    /        \
   /__________\     Integration Tests (Some)
  /            \    - API endpoints
 /              \   - Component interaction
/________________\  Unit Tests (Many)
                    - Individual functions
                    - Business logic
```

### Coverage Goals

- **Backend**: Minimum 80% code coverage
- **Frontend**: Minimum 70% code coverage
- **Firmware**: Critical path coverage (no specific %)

### Testing Priorities

1. **Critical Path**: Access control authorization flow
2. **Security**: Authentication, authorization, input validation
3. **Performance**: Latency targets (<500ms access, <1s sensor)
4. **Reliability**: Error handling, recovery, failsafes

## Test Types

### Unit Tests
- Test individual functions in isolation
- Mock external dependencies
- Fast execution (<100ms per test)
- Run on every commit

### Integration Tests
- Test component interactions
- Use real dependencies (Redis, DB)
- Moderate execution time (<5s per test)
- Run on every commit

### End-to-End Tests
- Test complete user workflows
- Use real services and hardware
- Slow execution (>10s per test)
- Run before release

### Performance Tests
- Measure latency and throughput
- Load testing under stress
- Benchmark against targets
- Run weekly or before release

## Backend Testing

### Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_access_api.py

# Run specific test
pytest tests/test_access_api.py::test_authorize_valid_card

# Run with verbose output
pytest -v

# Run in parallel
pytest -n auto
```

### Test Structure

```
backend/tests/
├── conftest.py              # Shared fixtures
├── test_access_api.py       # Access control endpoints
├── test_sensor_api.py       # Sensor ingestion endpoints
├── test_policy_api.py       # Policy management endpoints
├── test_websocket.py        # WebSocket functionality
├── test_redis_client.py     # Redis service layer
├── test_db_client.py        # Database service layer
└── test_stream_processor.py # Background worker
```

### Example Unit Test

```python
# tests/test_access_api.py
import pytest
from app.services.auth_service import check_card_authorization

def test_authorize_valid_card(redis_client, db_session):
    # Arrange
    card_uid = "04:A3:2B:F2:1C:80"
    redis_client.sadd("rfid:whitelist", card_uid)
    
    # Act
    result = check_card_authorization(card_uid, "door-01")
    
    # Assert
    assert result.granted is True
    assert result.card_uid == card_uid

def test_deny_unknown_card(redis_client, db_session):
    # Arrange
    card_uid = "FF:FF:FF:FF:FF:FF"
    
    # Act
    result = check_card_authorization(card_uid, "door-01")
    
    # Assert
    assert result.granted is False
    assert "not in whitelist" in result.reason
```

### Example Integration Test

```python
# tests/test_access_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_access_check_endpoint(client, redis_client):
    # Arrange
    redis_client.sadd("rfid:whitelist", "04:A3:2B:F2:1C:80")
    
    # Act
    response = client.post("/api/access/check", json={
        "device_id": "door-01",
        "card_uid": "04:A3:2B:F2:1C:80",
        "timestamp": "2026-02-09T19:59:04.032Z"
    })
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["granted"] is True
    assert "access_log_id" in data
```

### Test Fixtures

```python
# tests/conftest.py
import pytest
from redis import Redis
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def redis_client():
    """Provide Redis client for testing"""
    client = Redis(host='localhost', port=6379, db=1)
    yield client
    client.flushdb()  # Clean up after test

@pytest.fixture
def db_session():
    """Provide database session for testing"""
    engine = create_engine("postgresql://test:test@localhost/test_db")
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.rollback()
    session.close()
```

## Frontend Testing

### Setup

```bash
cd frontend
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- TemperatureGraph.test.jsx
```

### Test Structure

```
frontend/src/
├── components/
│   ├── TemperatureGraph.jsx
│   └── TemperatureGraph.test.jsx
├── services/
│   ├── api.js
│   └── api.test.js
└── hooks/
    ├── useWebSocket.js
    └── useWebSocket.test.js
```

### Example Component Test

```javascript
// src/components/TemperatureGraph.test.jsx
import { render, screen } from '@testing-library/react';
import TemperatureGraph from './TemperatureGraph';

describe('TemperatureGraph', () => {
  test('renders temperature graph with data', () => {
    const data = [
      { timestamp: '2026-02-09T19:59:00Z', temperature: 23.5, humidity: 45.2 },
      { timestamp: '2026-02-09T19:59:01Z', temperature: 23.6, humidity: 45.1 },
    ];
    
    render(<TemperatureGraph data={data} />);
    
    expect(screen.getByText(/temperature/i)).toBeInTheDocument();
  });

  test('shows loading state when no data', () => {
    render(<TemperatureGraph data={[]} />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Example Hook Test

```javascript
// src/hooks/useWebSocket.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import useWebSocket from './useWebSocket';

describe('useWebSocket', () => {
  test('connects to WebSocket on mount', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));
    
    expect(result.current.connected).toBe(false);
    // WebSocket mock would be needed for full test
  });

  test('handles incoming messages', () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws', { onMessage }));
    
    // Simulate incoming message
    act(() => {
      result.current.handleMessage({ type: 'sensor_reading', data: {} });
    });
    
    expect(onMessage).toHaveBeenCalled();
  });
});
```

## Firmware Testing

### Setup

```bash
cd firmware/door-control
pio test
```

### Running Tests

```bash
# Run all tests
pio test

# Run specific test
pio test -e native -f test_rfid

# Run with verbose output
pio test -v
```

### Test Structure

```
firmware/door-control/
└── test/
    ├── test_rfid.cpp        # RFID reader tests
    ├── test_wifi.cpp        # WiFi connection tests
    └── test_api_client.cpp  # API client tests
```

### Example Firmware Test

```cpp
// test/test_rfid.cpp
#include <unity.h>
#include "rfid_handler.h"

void setUp(void) {
    // Set up before each test
}

void tearDown(void) {
    // Clean up after each test
}

void test_parse_card_uid() {
    // Arrange
    byte uid[4] = {0x04, 0xA3, 0x2B, 0xF2};
    
    // Act
    String result = parseCardUid(uid, 4);
    
    // Assert
    TEST_ASSERT_EQUAL_STRING("04:A3:2B:F2", result.c_str());
}

void test_validate_card_uid_format() {
    // Valid UID
    TEST_ASSERT_TRUE(isValidUidFormat("04:A3:2B:F2:1C:80"));
    
    // Invalid formats
    TEST_ASSERT_FALSE(isValidUidFormat("invalid"));
    TEST_ASSERT_FALSE(isValidUidFormat("04-A3-2B-F2"));
    TEST_ASSERT_FALSE(isValidUidFormat(""));
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_parse_card_uid);
    RUN_TEST(test_validate_card_uid_format);
    return UNITY_END();
}
```

### Hardware-in-the-Loop Testing

For tests requiring actual hardware:

1. Connect ESP32 via USB
2. Run test with `-e esp32s3` environment:
   ```bash
   pio test -e esp32s3
   ```
3. Tests will upload to device and run
4. Results appear in serial monitor

## Integration Testing

### End-to-End Access Control Flow

```python
# tests/integration/test_access_flow.py
import pytest
import requests
import time

def test_complete_access_flow(backend_url, redis_client):
    """Test complete access control flow from card swipe to lock"""
    
    # 1. Add card to whitelist
    response = requests.post(f"{backend_url}/api/policies/cards", json={
        "card_uid": "04:A3:2B:F2:1C:80",
        "user_name": "Test User",
        "expires_at": None
    })
    assert response.status_code == 201
    
    # 2. Wait for cache update
    time.sleep(1)
    
    # 3. Simulate card swipe
    start_time = time.time()
    response = requests.post(f"{backend_url}/api/access/check", json={
        "device_id": "door-01",
        "card_uid": "04:A3:2B:F2:1C:80",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    latency = (time.time() - start_time) * 1000
    
    # 4. Verify authorization
    assert response.status_code == 200
    data = response.json()
    assert data["granted"] is True
    assert latency < 500, f"Latency {latency}ms exceeds 500ms target"
    
    # 5. Verify log entry
    logs_response = requests.get(f"{backend_url}/api/access/logs?limit=1")
    logs = logs_response.json()["logs"]
    assert len(logs) > 0
    assert logs[0]["card_uid"] == "04:A3:2B:F2:1C:80"
    assert logs[0]["granted"] is True
```

## Performance Testing

### Latency Benchmarks

```python
# tests/performance/test_latency.py
import pytest
import requests
import statistics

def test_access_check_latency(backend_url):
    """Verify access check latency meets <500ms target"""
    
    latencies = []
    for _ in range(100):
        start = time.time()
        response = requests.post(f"{backend_url}/api/access/check", json={
            "device_id": "door-01",
            "card_uid": "04:A3:2B:F2:1C:80",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
        latency = (time.time() - start) * 1000
        latencies.append(latency)
        assert response.status_code == 200
    
    # Statistics
    avg_latency = statistics.mean(latencies)
    p50_latency = statistics.median(latencies)
    p99_latency = sorted(latencies)[98]
    
    # Assertions
    assert avg_latency < 100, f"Average latency {avg_latency}ms too high"
    assert p99_latency < 500, f"P99 latency {p99_latency}ms exceeds target"
    
    print(f"\nLatency Stats:")
    print(f"  Average: {avg_latency:.1f}ms")
    print(f"  P50: {p50_latency:.1f}ms")
    print(f"  P99: {p99_latency:.1f}ms")
```

### Load Testing

```python
# tests/performance/test_load.py
import pytest
import concurrent.futures
import requests

def test_concurrent_access_checks(backend_url):
    """Test system under concurrent load"""
    
    def make_request():
        response = requests.post(f"{backend_url}/api/access/check", json={
            "device_id": "door-01",
            "card_uid": "04:A3:2B:F2:1C:80",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
        return response.status_code == 200
    
    # Simulate 50 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(make_request) for _ in range(100)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    # All requests should succeed
    success_count = sum(results)
    assert success_count == 100, f"Only {success_count}/100 requests succeeded"
```

## Hardware Testing

### Manual Test Procedures

#### RFID Reader Test

1. Power on ESP32 door control
2. Observe RFID reader LED (should be steady)
3. Place authorized card on reader
4. Verify:
   - LED blinks
   - Serial output shows card UID
   - Lock actuates within 500ms
   - Lock releases after 3 seconds

#### Temperature Sensor Test

1. Power on ESP32 sensor monitor
2. Observe OLED display shows readings
3. Verify:
   - Temperature updates every 1 second
   - Readings are reasonable (15-30°C)
   - Display doesn't flicker
4. Apply heat source (hand)
5. Verify temperature increases

#### Lock Actuation Test

1. Connect multimeter to solenoid terminals
2. Trigger access grant
3. Measure:
   - Voltage: Should be 12V ± 1V
   - Current: ~200-500mA
   - Duration: 3 seconds ± 0.5s

### Automated Hardware Tests

For continuous monitoring:

```bash
# Run hardware test script
cd scripts
./hardware-test.sh
```

## CI/CD Pipeline

### GitHub Actions Workflows

```yaml
# .github/workflows/backend-tests.yml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      
      postgres:
        image: timescale/timescaledb:latest-pg15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt -r requirements-dev.txt
      
      - name: Run tests with coverage
        run: |
          cd backend
          pytest --cov=app --cov-report=xml tests/
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Setup hooks
pre-commit install

# Hooks will run:
# - Black (Python formatting)
# - Flake8 (Python linting)
# - Prettier (JavaScript formatting)
# - ESLint (JavaScript linting)
```

---

Last updated: 2026-02-09
