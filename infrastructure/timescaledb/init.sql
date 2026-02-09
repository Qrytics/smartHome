-- TimescaleDB Initialization for Smart Home IoT
-- This script sets up the database schema and hypertables

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(50) PRIMARY KEY,
    device_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    firmware_version VARCHAR(20),
    ip_address INET,
    mac_address MACADDR,
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensor readings table (hypertable for time-series data)
CREATE TABLE IF NOT EXISTS sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20),
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Convert to hypertable
SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time 
    ON sensor_readings (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_type_time 
    ON sensor_readings (sensor_type, time DESC);

-- Device events table
CREATE TABLE IF NOT EXISTS device_events (
    event_id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_events_device_timestamp 
    ON device_events (device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_type 
    ON device_events (event_type);

-- User access logs
CREATE TABLE IF NOT EXISTS access_logs (
    log_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    device_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp 
    ON access_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user 
    ON access_logs (user_id, timestamp DESC);

-- Automated data retention policy (keep 90 days)
SELECT add_retention_policy('sensor_readings', INTERVAL '90 days', if_not_exists => TRUE);

-- Continuous aggregate for hourly sensor averages
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    device_id,
    sensor_type,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS reading_count
FROM sensor_readings
GROUP BY bucket, device_id, sensor_type
WITH NO DATA;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('sensor_readings_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to devices table
CREATE TRIGGER update_devices_updated_at 
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smart_home_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smart_home_user;
