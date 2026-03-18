-- Sample data for Smart Home IoT development
-- 4-ESP32 scenario:
--   room-node-01  Living Room  (fan + dimmer + TEMT6000 + BME280)
--   room-node-02  Bedroom      (fan + dimmer + TEMT6000 + BME280)
--   room-node-03  Kitchen      (fan + dimmer + TEMT6000 + BME280)
--   door-control-01  Front Door  (RFID + solenoid lock)

-- ============================================================================
-- Devices
-- ============================================================================
INSERT INTO devices (device_id, device_type, name, location, firmware_version, ip_address, mac_address, status, last_seen)
VALUES
    ('room-node-01',    'room_node',     'Living Room Node',  'Living Room', '2.0.0', '192.168.1.101', '24:6f:28:a1:b2:c1', 'online',  NOW()),
    ('room-node-02',    'room_node',     'Bedroom Node',      'Bedroom',     '2.0.0', '192.168.1.102', '24:6f:28:a1:b2:c2', 'online',  NOW()),
    ('room-node-03',    'room_node',     'Kitchen Node',      'Kitchen',     '2.0.0', '192.168.1.103', '24:6f:28:a1:b2:c3', 'online',  NOW()),
    ('door-control-01', 'door_control',  'Front Door',        'Entrance',    '2.0.0', '192.168.1.104', '24:6f:28:a1:b2:c4', 'online',  NOW()),
    -- Legacy devices kept for backward-compatibility with existing tests/seed data
    ('lighting-control-01', 'lighting_control', 'Main Area Lighting', 'Living Room', '1.0.0', '192.168.1.106', '24:6f:28:a1:b2:c8', 'online', NOW())
ON CONFLICT (device_id) DO NOTHING;

-- ============================================================================
-- Sensor readings (generic)
-- ============================================================================
INSERT INTO sensor_readings (time, device_id, sensor_type, value, unit)
SELECT
    NOW() - (interval '1 minute' * generate_series),
    device_id,
    sensor_type,
    base_value + (random() * variance - variance/2),
    unit
FROM (
    VALUES
        ('room-node-01', 'temperature', 22.0, 3.0, '°C'),
        ('room-node-01', 'humidity',    45.0, 10.0, '%'),
        ('room-node-01', 'pressure',    1013.25, 5.0, 'hPa'),
        ('room-node-01', 'light_lux',   400.0, 200.0, 'lux'),
        ('room-node-02', 'temperature', 20.5, 2.5, '°C'),
        ('room-node-02', 'humidity',    50.0, 8.0, '%'),
        ('room-node-02', 'pressure',    1013.0, 5.0, 'hPa'),
        ('room-node-02', 'light_lux',   250.0, 150.0, 'lux'),
        ('room-node-03', 'temperature', 24.0, 4.0, '°C'),
        ('room-node-03', 'humidity',    55.0, 12.0, '%'),
        ('room-node-03', 'pressure',    1012.5, 5.0, 'hPa'),
        ('room-node-03', 'light_lux',   600.0, 300.0, 'lux')
) AS readings(device_id, sensor_type, base_value, variance, unit),
generate_series(0, 1440, 5); -- 24 hours, every 5 minutes

-- ============================================================================
-- Device events
-- ============================================================================
INSERT INTO device_events (device_id, event_type, event_data, timestamp)
VALUES
    ('door-control-01', 'access_granted', '{"user_id": "user001", "method": "rfid", "card_uid": "04:A3:2B:F2:1C:80"}', NOW() - INTERVAL '2 hours'),
    ('door-control-01', 'access_denied',  '{"user_id": "unknown", "method": "rfid", "card_uid": "FF:FF:FF:FF:FF:FF"}', NOW() - INTERVAL '4 hours'),
    ('room-node-01', 'threshold_alert', '{"sensor": "temperature", "value": 25.5, "threshold": 25.0}', NOW() - INTERVAL '3 hours'),
    ('room-node-02', 'fan_state_change', '{"fan_on": true}', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Refresh the continuous aggregate with new data
-- ============================================================================
CALL refresh_continuous_aggregate('sensor_readings_hourly', NOW() - INTERVAL '25 hours', NOW());

-- ============================================================================
-- Lighting sensor data (room nodes share lighting_sensor_data)
-- ============================================================================
INSERT INTO lighting_sensor_data (time, device_id, light_level, light_lux, dimmer_brightness, daylight_harvest_mode)
SELECT
    NOW() - (interval '1 minute' * generate_series),
    device_id,
    LEAST(100, GREATEST(0, base_light + (random() * 40 - 20))),
    LEAST(1000, GREATEST(0, base_lux + (random() * 400 - 200))),
    LEAST(100, GREATEST(0, base_dimmer + (random() * 30 - 15))),
    true
FROM (
    VALUES
        ('room-node-01', 50, 500, 60),
        ('room-node-02', 30, 300, 80),
        ('room-node-03', 70, 700, 40),
        ('lighting-control-01', 50, 500, 60)
) AS rooms(device_id, base_light, base_lux, base_dimmer),
generate_series(0, 1440, 5);  -- 24 hours, every 5 minutes

-- ============================================================================
-- Fan state history (room nodes)
-- ============================================================================
INSERT INTO fan_state (time, device_id, fan_on)
VALUES
    (NOW() - INTERVAL '6 hours', 'room-node-01', true),
    (NOW() - INTERVAL '4 hours', 'room-node-01', false),
    (NOW() - INTERVAL '3 hours', 'room-node-02', true),
    (NOW() - INTERVAL '1 hour',  'room-node-02', false),
    (NOW() - INTERVAL '2 hours', 'room-node-03', true);

-- Insert sample relay state changes
INSERT INTO relay_state (time, device_id, channel, state)
VALUES
    (NOW() - INTERVAL '8 hours', 'lighting-control-01', 1, true),
    (NOW() - INTERVAL '6 hours', 'lighting-control-01', 2, true),
    (NOW() - INTERVAL '4 hours', 'lighting-control-01', 2, false),
    (NOW() - INTERVAL '2 hours', 'lighting-control-01', 3, true),
    (NOW() - INTERVAL '1 hour',  'lighting-control-01', 1, false);

-- Insert sample dimmer state changes
INSERT INTO dimmer_state (time, device_id, brightness)
VALUES
    (NOW() - INTERVAL '10 hours', 'lighting-control-01', 100),
    (NOW() - INTERVAL '8 hours',  'lighting-control-01', 80),
    (NOW() - INTERVAL '6 hours',  'lighting-control-01', 60),
    (NOW() - INTERVAL '4 hours',  'lighting-control-01', 75),
    (NOW() - INTERVAL '2 hours',  'lighting-control-01', 50),
    (NOW() - INTERVAL '1 hour',   'lighting-control-01', 40);

-- ============================================================================
-- RFID whitelist + access log sample data
-- ============================================================================
INSERT INTO rfid_cards (card_uid, user_id, label, active)
VALUES
    ('04:A3:2B:F2:1C:80', 'user001', 'Alice – main key', true),
    ('04:B7:3C:F3:2D:91', 'user002', 'Bob – main key',   true),
    ('04:C9:4D:F4:3E:A2', 'admin',   'Admin master key', true),
    ('FF:FF:FF:FF:FF:FF', 'unknown', 'Blocked test card', false)
ON CONFLICT (card_uid) DO NOTHING;

INSERT INTO access_log (card_uid, device_id, granted, reason, timestamp)
VALUES
    ('04:A3:2B:F2:1C:80', 'door-control-01', true,  'authorized',      NOW() - INTERVAL '2 hours'),
    ('04:B7:3C:F3:2D:91', 'door-control-01', true,  'authorized',      NOW() - INTERVAL '5 hours'),
    ('FF:FF:FF:FF:FF:FF', 'door-control-01', false, 'card not registered', NOW() - INTERVAL '3 hours');

-- Refresh the lighting continuous aggregate with new data
CALL refresh_continuous_aggregate('lighting_sensor_data_hourly', NOW() - INTERVAL '25 hours', NOW());
