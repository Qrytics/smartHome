import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * API Service for Lighting Control
 * 
 * Provides methods to interact with the backend API for:
 * - Sensor data ingestion
 * - Dimmer control
 * - Relay control
 * - Daylight harvesting toggle
 */

// Sensor Data APIs
export const ingestEnvironmentalData = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/sensors/ingest/environmental`, data);
    return response.data;
  } catch (error) {
    console.error('Error ingesting environmental data:', error);
    throw error;
  }
};

export const ingestLightingData = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/sensors/ingest/lighting`, data);
    return response.data;
  } catch (error) {
    console.error('Error ingesting lighting data:', error);
    throw error;
  }
};

export const getLatestSensorData = async (deviceId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/sensors/latest/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    throw error;
  }
};

export const getSensorHistory = async (deviceId, startTime, endTime, limit = 100) => {
  try {
    const params = { limit };
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    
    const response = await axios.get(`${API_BASE_URL}/api/sensors/history/${deviceId}`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    throw error;
  }
};

// Lighting Control APIs
export const setDimmerBrightness = async (deviceId, brightness) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/lighting/dimmer/${deviceId}`, {
      brightness: brightness
    });
    return response.data;
  } catch (error) {
    console.error('Error setting dimmer brightness:', error);
    throw error;
  }
};

export const setRelayState = async (deviceId, channel, state) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/lighting/relay/${deviceId}`, {
      channel: channel,
      state: state
    });
    return response.data;
  } catch (error) {
    console.error('Error setting relay state:', error);
    throw error;
  }
};

export const setDaylightHarvestMode = async (deviceId, enabled) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/lighting/daylight-harvest/${deviceId}`, {
      enabled: enabled
    });
    return response.data;
  } catch (error) {
    console.error('Error setting daylight harvest mode:', error);
    throw error;
  }
};

export const getDeviceStatus = async (deviceId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/lighting/status/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device status:', error);
    throw error;
  }
};

export default {
  ingestEnvironmentalData,
  ingestLightingData,
  getLatestSensorData,
  getSensorHistory,
  setDimmerBrightness,
  setRelayState,
  setDaylightHarvestMode,
  getDeviceStatus,
};
