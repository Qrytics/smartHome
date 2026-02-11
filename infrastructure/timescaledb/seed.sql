-- Sample data for Smart Home IoT development

-- Insert sample devices
INSERT INTO devices (device_id, device_type, name, location, firmware_version, ip_address, mac_address, status, last_seen)
VALUES 
    ('ESP32-001', 'environmental_sensor', 'Living Room Sensor', 'Living Room', '1.2.3', '192.168.1.101', '24:6f:28:a1:b2:c3', 'online', NOW()),
    ('ESP32-002', 'environmental_sensor', 'Bedroom Sensor', 'Bedroom', '1.2.3', '192.168.1.102', '24:6f:28:a1:b2:c4', 'online', NOW()),
    ('ESP32-003', 'environmental_sensor', 'Kitchen Sensor', 'Kitchen', '1.2.2', '192.168.1.103', '24:6f:28:a1:b2:c5', 'offline', NOW() - INTERVAL '2 hours'),
    ('ESP32-004', 'smart_lock', 'Front Door Lock', 'Entrance', '1.0.1', '192.168.1.104', '24:6f:28:a1:b2:c6', 'online', NOW()),
    ('ESP32-005', 'light_controller', 'Living Room Lights', 'Living Room', '1.1.0', '192.168.1.105', '24:6f:28:a1:b2:c7', 'online', NOW()),
    ('lighting-control-01', 'lighting_control', 'Main Area Lighting', 'Living Room', '1.0.0', '192.168.1.106', '24:6f:28:a1:b2:c8', 'online', NOW())
ON CONFLICT (device_id) DO NOTHING;

-- Insert sample sensor readings (last 24 hours)
INSERT INTO sensor_readings (time, device_id, sensor_type, value, unit)
SELECT
    NOW() - (interval '1 minute' * generate_series),
    device_id,
    sensor_type,
    base_value + (random() * variance - variance/2),
    unit
FROM (
    VALUES 
        ('ESP32-001', 'temperature', 22.0, 3.0, '°C'),
        ('ESP32-001', 'humidity', 45.0, 10.0, '%'),
        ('ESP32-001', 'pressure', 1013.25, 5.0, 'hPa'),
        ('ESP32-002', 'temperature', 20.5, 2.5, '°C'),
        ('ESP32-002', 'humidity', 50.0, 8.0, '%'),
        ('ESP32-002', 'pressure', 1013.0, 5.0, 'hPa'),
        ('ESP32-003', 'temperature', 24.0, 4.0, '°C'),
        ('ESP32-003', 'humidity', 55.0, 12.0, '%')
) AS readings(device_id, sensor_type, base_value, variance, unit),
generate_series(0, 1440, 5) -- 24 hours, every 5 minutes
WHERE 
    (device_id = 'ESP32-003' AND generate_series <= 120) OR -- Only 2 hours for offline device
    device_id != 'ESP32-003';

-- Insert sample device events
INSERT INTO device_events (device_id, event_type, event_data, timestamp)
VALUES 
    ('ESP32-004', 'access_granted', '{"user_id": "user001", "method": "rfid", "card_id": "ABC123"}', NOW() - INTERVAL '2 hours'),
    ('ESP32-004', 'access_granted', '{"user_id": "user002", "method": "rfid", "card_id": "DEF456"}', NOW() - INTERVAL '5 hours'),
    ('ESP32-005', 'state_change', '{"state": "on", "brightness": 80}', NOW() - INTERVAL '1 hour'),
    ('ESP32-005', 'state_change', '{"state": "off"}', NOW() - INTERVAL '30 minutes'),
    ('ESP32-001', 'threshold_alert', '{"sensor": "temperature", "value": 25.5, "threshold": 25.0}', NOW() - INTERVAL '3 hours'),
    ('ESP32-003', 'connection_lost', '{"reason": "timeout", "last_message": "2024-01-15T10:30:00Z"}', NOW() - INTERVAL '2 hours');

-- Insert sample access logs
INSERT INTO access_logs (user_id, device_id, action, success, ip_address, timestamp)
VALUES 
    ('user001', 'ESP32-004', 'unlock', true, '192.168.1.50', NOW() - INTERVAL '2 hours'),
    ('user002', 'ESP32-004', 'unlock', true, '192.168.1.51', NOW() - INTERVAL '5 hours'),
    ('user001', 'ESP32-005', 'turn_on', true, '192.168.1.50', NOW() - INTERVAL '1 hour'),
    ('user001', 'ESP32-005', 'turn_off', true, '192.168.1.50', NOW() - INTERVAL '30 minutes'),
    ('admin', 'ESP32-003', 'restart', false, '192.168.1.1', NOW() - INTERVAL '2 hours');

-- Refresh the continuous aggregate with new data
CALL refresh_continuous_aggregate('sensor_readings_hourly', NOW() - INTERVAL '25 hours', NOW());

-- ============================================================================
-- Lighting Control Sample Data
-- ============================================================================

-- Insert sample lighting sensor readings (last 24 hours)
INSERT INTO lighting_sensor_data (time, device_id, light_level, light_lux, dimmer_brightness, daylight_harvest_mode)
SELECT
    NOW() - (interval '1 minute' * generate_series),
    'lighting-control-01',
    LEAST(100, GREATEST(0, 50 + (random() * 40 - 20))),  -- Light level 30-70%
    LEAST(1000, GREATEST(0, 500 + (random() * 400 - 200))),  -- Lux 300-700
    LEAST(100, GREATEST(0, 60 + (random() * 30 - 15))),  -- Dimmer 45-75%
    true
FROM generate_series(0, 1440, 5);  -- 24 hours, every 5 minutes

-- Insert sample relay state changes
INSERT INTO relay_state (time, device_id, channel, state)
VALUES 
    (NOW() - INTERVAL '8 hours', 'lighting-control-01', 1, true),   -- Main lights ON 8 hours ago
    (NOW() - INTERVAL '6 hours', 'lighting-control-01', 2, true),   -- Secondary lights ON 6 hours ago
    (NOW() - INTERVAL '4 hours', 'lighting-control-01', 2, false),  -- Secondary lights OFF 4 hours ago
    (NOW() - INTERVAL '2 hours', 'lighting-control-01', 3, true),   -- HVAC fan ON 2 hours ago
    (NOW() - INTERVAL '1 hour', 'lighting-control-01', 1, false);   -- Main lights OFF 1 hour ago

-- Insert sample dimmer state changes
INSERT INTO dimmer_state (time, device_id, brightness)
VALUES 
    (NOW() - INTERVAL '10 hours', 'lighting-control-01', 100),
    (NOW() - INTERVAL '8 hours', 'lighting-control-01', 80),
    (NOW() - INTERVAL '6 hours', 'lighting-control-01', 60),
    (NOW() - INTERVAL '4 hours', 'lighting-control-01', 75),
    (NOW() - INTERVAL '2 hours', 'lighting-control-01', 50),
    (NOW() - INTERVAL '1 hour', 'lighting-control-01', 40);

-- Refresh the lighting continuous aggregate with new data
CALL refresh_continuous_aggregate('lighting_sensor_data_hourly', NOW() - INTERVAL '25 hours', NOW());
