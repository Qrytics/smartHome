import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost:8000';
const DEFAULT_API_PORT = '8000';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * When true (set in .env.production on the Pi), API + WebSocket hosts are taken from the
 * browser URL (same hostname as the dashboard, port 8000). That way one build works whether
 * you open http://smartHome:3000 or http://192.168.x.x:3000 — fixing false "API DEGRADED"
 * when REACT_APP_API_URL was baked to a hostname your laptop cannot resolve.
 */
function isBrowserOriginMode() {
  const v = process.env.REACT_APP_USE_BROWSER_ORIGIN;
  return v === '1' || String(v).toLowerCase() === 'true';
}

function browserOriginApiBase() {
  if (typeof window === 'undefined') return DEFAULT_API_URL;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
}

function resolveApiBaseUrl() {
  if (isBrowserOriginMode() && typeof window !== 'undefined') {
    return normalizeApiBaseUrl(browserOriginApiBase());
  }
  return normalizeApiBaseUrl(process.env.REACT_APP_API_URL || DEFAULT_API_URL);
}

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

export const API_BASE_URL = resolveApiBaseUrl();

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

export async function setFanState(deviceId, fanOn) {
  return api.post(`/api/lighting/fan/${encodeURIComponent(deviceId)}`, { fan_on: fanOn }).then(unwrap);
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

export async function updatePolicyCard(cardUid, payload) {
  const encodedUid = encodeURIComponent(cardUid);
  try {
    return await api.patch(`/api/policies/cards/${encodedUid}`, payload).then(unwrap);
  } catch (error) {
    if (isHttpError(error, 404) || isHttpError(error, 405)) {
      return api.put(`/api/policies/cards/${encodedUid}`, payload).then(unwrap);
    }
    throw error;
  }
}

export async function setPolicyCardActive(cardUid, active) {
  return updatePolicyCard(cardUid, { active });
}

export async function listAutomationRules() {
  return api.get('/api/rules').then(unwrap);
}

export async function createAutomationRule(payload) {
  return api.post('/api/rules', payload).then(unwrap);
}

export async function updateAutomationRule(ruleId, payload) {
  return api.put(`/api/rules/${encodeURIComponent(ruleId)}`, payload).then(unwrap);
}

export async function deleteAutomationRule(ruleId) {
  return api.delete(`/api/rules/${encodeURIComponent(ruleId)}`).then(unwrap);
}

export async function toggleAutomationRule(ruleId, enabled) {
  return api
    .post(`/api/rules/${encodeURIComponent(ruleId)}/toggle`, { enabled })
    .then(unwrap);
}

export async function getDefaultAutomationRuleset() {
  return api.get('/api/rules/templates/default').then(unwrap);
}

export function buildWebSocketUrl() {
  if (isBrowserOriginMode() && typeof window !== 'undefined') {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.hostname}:${DEFAULT_API_PORT}/ws/client`;
  }

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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/client`;
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
  setPolicyCardActive,
  setDaylightHarvestMode,
  setDimmerBrightness,
  setFanState,
  setRelayState,
  createAutomationRule,
  deleteAutomationRule,
  getDefaultAutomationRuleset,
  listAutomationRules,
  toggleAutomationRule,
  updatePolicyCard,
  updateAutomationRule,
};

export default apiService;
