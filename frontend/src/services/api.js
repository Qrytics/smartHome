import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 10000;

function normalizeApiBaseUrl(rawUrl) {
  const base = (rawUrl || DEFAULT_API_URL).trim().replace(/\/+$/, '');

  if (/\/api\/v\d+$/i.test(base)) {
    return base.replace(/\/api\/v\d+$/i, '');
  }

  if (/\/api$/i.test(base)) {
    return base.replace(/\/api$/i, '');
  }

  return base;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

function unwrap(response) {
  return response.data;
}

export function isHttpError(error, statusCode) {
  return Boolean(
    axios.isAxiosError(error) &&
      (statusCode ? error.response?.status === statusCode : error.response?.status)
  );
}

export async function getHealthCheck() {
  return api.get('/health').then(unwrap);
}

export async function ingestEnvironmentalData(payload) {
  return api.post('/api/sensors/ingest/environmental', payload).then(unwrap);
}

export async function ingestLightingData(payload) {
  return api.post('/api/sensors/ingest/lighting', payload).then(unwrap);
}

export async function getLatestSensorData(deviceId) {
  return api.get(`/api/sensors/latest/${encodeURIComponent(deviceId)}`).then(unwrap);
}

export async function getSensorHistory(deviceId, { startTime, endTime, limit = 100 } = {}) {
  const params = { limit };
  if (startTime) params.start_time = startTime;
  if (endTime) params.end_time = endTime;

  return api.get(`/api/sensors/history/${encodeURIComponent(deviceId)}`, { params }).then(unwrap);
}

export async function getEnvironmentalReadings(
  deviceId,
  { startTime, endTime, interval, limit } = {}
) {
  const params = { device_id: deviceId };
  if (startTime) params.start_time = startTime;
  if (endTime) params.end_time = endTime;
  if (interval) params.interval = interval;
  if (limit) params.limit = limit;

  try {
    return await api.get('/api/sensors/readings', { params }).then(unwrap);
  } catch (error) {
    if (isHttpError(error, 404)) {
      return getSensorHistory(deviceId, {
        startTime,
        endTime,
        limit: limit || 500,
      });
    }
    throw error;
  }
}

export async function setDimmerBrightness(deviceId, brightness) {
  return api
    .post(`/api/lighting/dimmer/${encodeURIComponent(deviceId)}`, { brightness })
    .then(unwrap);
}

export async function setRelayState(deviceId, channel, state) {
  return api
    .post(`/api/lighting/relay/${encodeURIComponent(deviceId)}`, { channel, state })
    .then(unwrap);
}

export async function setDaylightHarvestMode(deviceId, enabled) {
  return api
    .post(`/api/lighting/daylight-harvest/${encodeURIComponent(deviceId)}`, { enabled })
    .then(unwrap);
}

export async function getDeviceStatus(deviceId) {
  return api.get(`/api/lighting/status/${encodeURIComponent(deviceId)}`).then(unwrap);
}

export async function getAccessLogs(params = {}) {
  return api.get('/api/access/logs', { params }).then(unwrap);
}

export async function checkAccess(payload) {
  return api.post('/api/access/check', payload).then(unwrap);
}

export async function getPolicyCards() {
  return api.get('/api/policies/cards').then(unwrap);
}

export async function addPolicyCard(payload) {
  return api.post('/api/policies/cards', payload).then(unwrap);
}

export async function deletePolicyCard(cardUid) {
  return api.delete(`/api/policies/cards/${encodeURIComponent(cardUid)}`).then(unwrap);
}

export function buildWebSocketUrl() {
  const rawWsUrl = process.env.REACT_APP_WS_URL?.trim();
  if (rawWsUrl) {
    const trimmed = rawWsUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/ws/client') ? trimmed : `${trimmed}/ws/client`;
  }

  try {
    const parsed = new URL(API_BASE_URL);
    const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${parsed.host}/ws/client`;
  } catch (error) {
    return 'ws://localhost:8000/ws/client';
  }
}

const apiService = {
  addPolicyCard,
  API_BASE_URL,
  buildWebSocketUrl,
  checkAccess,
  deletePolicyCard,
  getAccessLogs,
  getDeviceStatus,
  getEnvironmentalReadings,
  getHealthCheck,
  getLatestSensorData,
  getPolicyCards,
  getSensorHistory,
  ingestEnvironmentalData,
  ingestLightingData,
  isHttpError,
  setDaylightHarvestMode,
  setDimmerBrightness,
  setRelayState,
};

export default apiService;
