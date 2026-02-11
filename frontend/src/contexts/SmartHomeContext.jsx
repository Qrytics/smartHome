import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addPolicyCard,
  checkAccess,
  deletePolicyCard,
  getAccessLogs,
  getDeviceStatus,
  getEnvironmentalReadings,
  getHealthCheck,
  getPolicyCards,
  getSensorHistory,
  isHttpError,
  setDaylightHarvestMode,
  setDimmerBrightness,
  setRelayState,
} from '../services/api';
import {
  addMockPolicyCard,
  appendMockAccessLog,
  createMockAccessEvent,
  ensureMockStore,
  generateSyntheticEnvironmentalPoint,
  generateSyntheticLightingPoint,
  getMockAccessLogs,
  getMockPolicyCards,
  removeMockPolicyCard,
} from '../services/mockStore';
import useRealtimeFeed from '../hooks/useRealtimeFeed';
import { asNumber, toIsoTimestamp } from '../utils/formatters';

const DEVICE_ID_STORE_KEY = 'smarthome.dashboard.deviceIds.v1';
const MAX_DATA_POINTS = 720;

const DEFAULT_DEVICE_IDS = {
  environmental: 'sensor-monitor-01',
  lighting: 'lighting-control-01',
  door: 'door-control-01',
};

const SmartHomeContext = createContext(null);

function capDataPoints(series) {
  if (series.length <= MAX_DATA_POINTS) return series;
  return series.slice(series.length - MAX_DATA_POINTS);
}

function loadDeviceIds() {
  try {
    const raw = window.localStorage.getItem(DEVICE_ID_STORE_KEY);
    if (!raw) return DEFAULT_DEVICE_IDS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_DEVICE_IDS;

    return {
      environmental: parsed.environmental || DEFAULT_DEVICE_IDS.environmental,
      lighting: parsed.lighting || DEFAULT_DEVICE_IDS.lighting,
      door: parsed.door || DEFAULT_DEVICE_IDS.door,
    };
  } catch (error) {
    return DEFAULT_DEVICE_IDS;
  }
}

function persistDeviceIds(deviceIds) {
  try {
    window.localStorage.setItem(DEVICE_ID_STORE_KEY, JSON.stringify(deviceIds));
  } catch (error) {
    // Storage persistence is best-effort only.
  }
}

function normalizePolicyCards(response) {
  const cards = Array.isArray(response?.cards)
    ? response.cards
    : Array.isArray(response)
      ? response
      : [];

  return cards.map((entry) => ({
    card_uid: String(entry.card_uid || entry.uid || '').toUpperCase(),
    user_name: entry.user_name || entry.name || 'Unknown User',
    added_at: toIsoTimestamp(entry.added_at || entry.created_at || new Date().toISOString()),
    expires_at: entry.expires_at || null,
    active: entry.active !== false,
  }));
}

function normalizeAccessLog(entry) {
  const granted = Boolean(
    entry?.granted ?? entry?.authorized ?? entry?.result === 'granted' ?? false
  );

  return {
    id: entry.id || entry.access_log_id || `log-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    timestamp: toIsoTimestamp(entry.timestamp || entry.time || new Date().toISOString()),
    device_id: entry.device_id || 'door-control-01',
    card_uid: String(entry.card_uid || entry.uid || '').toUpperCase(),
    user_name: entry.user_name || entry.user || null,
    granted,
    latency_ms: asNumber(entry.latency_ms, 0),
    reason: entry.reason || null,
  };
}

function normalizeLightingPoint(entry) {
  return {
    timestamp: toIsoTimestamp(
      entry?.timestamp || entry?.time || entry?.last_update || new Date().toISOString()
    ),
    light_level: asNumber(entry?.light_level),
    light_lux: asNumber(entry?.light_lux),
    dimmer_brightness: asNumber(entry?.dimmer_brightness),
    daylight_harvest_mode: Boolean(entry?.daylight_harvest_mode),
    relays: Array.isArray(entry?.relays) ? entry.relays.slice(0, 4) : [false, false, false, false],
  };
}

function normalizeEnvironmentalPoint(entry) {
  return {
    timestamp: toIsoTimestamp(entry?.timestamp || entry?.time || new Date().toISOString()),
    temperature: asNumber(entry?.temperature ?? entry?.temperature_avg),
    humidity: asNumber(entry?.humidity ?? entry?.humidity_avg),
    pressure: asNumber(entry?.pressure ?? entry?.pressure_avg),
  };
}

function mergeLatestByTimestamp(series) {
  const byTime = new Map();
  series.forEach((entry) => {
    if (!entry.timestamp) return;
    byTime.set(entry.timestamp, entry);
  });

  return [...byTime.values()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function hasLightingFields(payload) {
  return (
    payload &&
    (payload.light_level !== undefined ||
      payload.light_lux !== undefined ||
      payload.dimmer_brightness !== undefined ||
      payload.daylight_harvest_mode !== undefined ||
      Array.isArray(payload.relays))
  );
}

function hasEnvironmentalFields(payload) {
  return (
    payload &&
    (payload.temperature !== undefined ||
      payload.temperature_avg !== undefined ||
      payload.humidity !== undefined ||
      payload.humidity_avg !== undefined ||
      payload.pressure !== undefined ||
      payload.pressure_avg !== undefined)
  );
}

export function SmartHomeProvider({ children }) {
  const [deviceIds, setDeviceIdsState] = useState(() => loadDeviceIds());
  const [health, setHealth] = useState({
    status: 'unknown',
    timestamp: null,
    services: {
      redis: 'unknown',
      database: 'unknown',
    },
  });
  const [apiReachable, setApiReachable] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [environmentalData, setEnvironmentalData] = useState([]);
  const [lightingData, setLightingData] = useState([]);
  const [policyCards, setPolicyCards] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [usingPolicyFallback, setUsingPolicyFallback] = useState(false);
  const [usingAccessFallback, setUsingAccessFallback] = useState(false);
  const [usingSyntheticFeed, setUsingSyntheticFeed] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [lastCommand, setLastCommand] = useState(null);
  const [loading, setLoading] = useState({
    health: false,
    environmentalHistory: false,
    lightingHistory: false,
    policies: false,
    accessLogs: false,
    commands: false,
  });

  const setLoadingFlag = useCallback((key, value) => {
    setLoading((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const appendEnvironmentalPoint = useCallback((point) => {
    const normalized = normalizeEnvironmentalPoint(point);
    setEnvironmentalData((previous) => {
      const merged = mergeLatestByTimestamp([...previous, normalized]);
      return capDataPoints(merged);
    });
  }, []);

  const appendLightingPoint = useCallback((point) => {
    const normalized = normalizeLightingPoint(point);
    setLightingData((previous) => {
      const merged = mergeLatestByTimestamp([...previous, normalized]);
      return capDataPoints(merged);
    });
  }, []);

  const appendAccessLog = useCallback((log) => {
    const normalized = normalizeAccessLog(log);
    setAccessLogs((previous) => {
      const merged = [normalized, ...previous]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 500);
      return merged;
    });
  }, []);

  const handleRealtimeMessage = useCallback(
    (message) => {
      if (message?.status === 'connected' && Array.isArray(message?.connected_devices)) {
        setConnectedDevices(message.connected_devices);
      }

      const payload = message?.data || message;
      if (!payload || typeof payload !== 'object') return;

      if (hasLightingFields(payload)) {
        appendLightingPoint(payload);
      }

      if (hasEnvironmentalFields(payload)) {
        appendEnvironmentalPoint(payload);
      }

      if (message?.type === 'access_event') {
        appendAccessLog(payload);
      }
    },
    [appendAccessLog, appendEnvironmentalPoint, appendLightingPoint]
  );

  const { status: wsStatus, wsUrl, lastMessageAt } = useRealtimeFeed({
    enabled: true,
    onMessage: handleRealtimeMessage,
  });

  const refreshHealth = useCallback(async () => {
    setLoadingFlag('health', true);
    try {
      const data = await getHealthCheck();
      setHealth({
        status: data.status || 'unknown',
        timestamp: data.timestamp || new Date().toISOString(),
        services: data.services || {
          redis: 'unknown',
          database: 'unknown',
        },
      });
      setApiReachable(true);
      setLastError(null);
    } catch (error) {
      setApiReachable(false);
      setHealth({
        status: 'unreachable',
        timestamp: new Date().toISOString(),
        services: {
          redis: 'unknown',
          database: 'unknown',
        },
      });
      setLastError('Backend API is unreachable. Running in fallback mode where possible.');
    } finally {
      setLoadingFlag('health', false);
    }
  }, [setLoadingFlag]);

  const refreshLightingSnapshot = useCallback(async () => {
    try {
      const data = await getDeviceStatus(deviceIds.lighting);
      if (data?.current_state) {
        appendLightingPoint({
          ...data.current_state,
          timestamp: data.current_state.timestamp || data.current_state.time || new Date().toISOString(),
        });
      }

      if (data?.online) {
        setConnectedDevices((previous) => {
          if (previous.includes(deviceIds.lighting)) return previous;
          return [...previous, deviceIds.lighting];
        });
      }
    } catch (error) {
      if (!isHttpError(error, 404)) {
        setLastError('Unable to fetch lighting device snapshot.');
      }
    }
  }, [appendLightingPoint, deviceIds.lighting]);

  const refreshLightingHistory = useCallback(
    async (rangeHours = 24) => {
      setLoadingFlag('lightingHistory', true);
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - rangeHours * 60 * 60 * 1000);

      try {
        const response = await getSensorHistory(deviceIds.lighting, {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          limit: 1500,
        });

        const rows = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.readings)
            ? response.readings
            : [];

        const normalized = rows.map(normalizeLightingPoint);
        if (normalized.length > 0) {
          setLightingData(capDataPoints(mergeLatestByTimestamp(normalized)));
        }
      } catch (error) {
        setLastError('Unable to load lighting history from backend.');
      } finally {
        setLoadingFlag('lightingHistory', false);
      }
    },
    [deviceIds.lighting, setLoadingFlag]
  );

  const refreshEnvironmentalHistory = useCallback(
    async (rangeHours = 24) => {
      setLoadingFlag('environmentalHistory', true);
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - rangeHours * 60 * 60 * 1000);

      try {
        const response = await getEnvironmentalReadings(deviceIds.environmental, {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          interval: '1m',
          limit: 1500,
        });

        const rows = Array.isArray(response?.readings)
          ? response.readings
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const normalized = rows.map(normalizeEnvironmentalPoint);
        if (normalized.length > 0) {
          setEnvironmentalData(capDataPoints(mergeLatestByTimestamp(normalized)));
        }
      } catch (error) {
        // Environmental history is not available on every backend revision.
      } finally {
        setLoadingFlag('environmentalHistory', false);
      }
    },
    [deviceIds.environmental, setLoadingFlag]
  );

  const refreshPolicyCards = useCallback(async () => {
    setLoadingFlag('policies', true);
    try {
      const response = await getPolicyCards();
      const cards = normalizePolicyCards(response);
      setPolicyCards(cards);
      setUsingPolicyFallback(false);
    } catch (error) {
      const fallbackCards = getMockPolicyCards();
      setPolicyCards(fallbackCards);
      setUsingPolicyFallback(true);
    } finally {
      setLoadingFlag('policies', false);
    }
  }, [setLoadingFlag]);

  const refreshAccessLogs = useCallback(
    async (filters = {}) => {
      setLoadingFlag('accessLogs', true);

      try {
        const response = await getAccessLogs({
          limit: 200,
          offset: 0,
          ...filters,
        });

        const rawLogs = Array.isArray(response?.logs)
          ? response.logs
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const logs = rawLogs
          .map(normalizeAccessLog)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setAccessLogs(logs);
        setUsingAccessFallback(false);
      } catch (error) {
        const fallback = getMockAccessLogs({
          limit: filters.limit || 200,
          offset: filters.offset || 0,
          search: filters.search,
          granted: filters.granted,
          card_uid: filters.card_uid,
          device_id: filters.device_id,
        });
        setAccessLogs(fallback.logs.map(normalizeAccessLog));
        setUsingAccessFallback(true);
      } finally {
        setLoadingFlag('accessLogs', false);
      }
    },
    [setLoadingFlag]
  );

  const updateLightingState = useCallback((patch) => {
    setLightingData((previous) => {
      const base = previous[previous.length - 1] || {
        timestamp: new Date().toISOString(),
        light_level: 0,
        light_lux: 0,
        dimmer_brightness: 0,
        daylight_harvest_mode: false,
        relays: [false, false, false, false],
      };

      const next = normalizeLightingPoint({
        ...base,
        ...patch,
        timestamp: new Date().toISOString(),
      });

      return capDataPoints(mergeLatestByTimestamp([...previous, next]));
    });
  }, []);

  const setDimmer = useCallback(
    async (brightness) => {
      setLoadingFlag('commands', true);
      try {
        const response = await setDimmerBrightness(deviceIds.lighting, brightness);
        setLastCommand({
          type: 'dimmer',
          message: response?.message || `Dimmer set to ${brightness}%`,
          timestamp: new Date().toISOString(),
        });
        setLastError(null);
      } catch (error) {
        setLastCommand({
          type: 'dimmer',
          message: `Local update only: unable to reach ${deviceIds.lighting}.`,
          timestamp: new Date().toISOString(),
        });
      } finally {
        updateLightingState({
          dimmer_brightness: asNumber(brightness, 0),
        });
        setLoadingFlag('commands', false);
      }
    },
    [deviceIds.lighting, setLoadingFlag, updateLightingState]
  );

  const setDaylightHarvest = useCallback(
    async (enabled) => {
      setLoadingFlag('commands', true);
      try {
        const response = await setDaylightHarvestMode(deviceIds.lighting, enabled);
        setLastCommand({
          type: 'daylight',
          message: response?.message || `Daylight harvesting ${enabled ? 'enabled' : 'disabled'}`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setLastCommand({
          type: 'daylight',
          message: `Local update only: unable to reach ${deviceIds.lighting}.`,
          timestamp: new Date().toISOString(),
        });
      } finally {
        updateLightingState({
          daylight_harvest_mode: Boolean(enabled),
        });
        setLoadingFlag('commands', false);
      }
    },
    [deviceIds.lighting, setLoadingFlag, updateLightingState]
  );

  const setRelay = useCallback(
    async (channel, state) => {
      setLoadingFlag('commands', true);
      try {
        const response = await setRelayState(deviceIds.lighting, channel, state);
        setLastCommand({
          type: `relay-${channel}`,
          message: response?.message || `Relay ${channel} set to ${state ? 'ON' : 'OFF'}`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setLastCommand({
          type: `relay-${channel}`,
          message: `Local update only: relay ${channel} pending backend sync.`,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLightingData((previous) => {
          const latest = previous[previous.length - 1] || {
            relays: [false, false, false, false],
            light_level: 0,
            light_lux: 0,
            dimmer_brightness: 0,
            daylight_harvest_mode: false,
            timestamp: new Date().toISOString(),
          };

          const relays = Array.isArray(latest.relays)
            ? latest.relays.slice(0, 4)
            : [false, false, false, false];
          relays[channel - 1] = Boolean(state);

          const next = normalizeLightingPoint({
            ...latest,
            relays,
            timestamp: new Date().toISOString(),
          });

          return capDataPoints(mergeLatestByTimestamp([...previous, next]));
        });
        setLoadingFlag('commands', false);
      }
    },
    [deviceIds.lighting, setLoadingFlag]
  );

  const createOrCheckAccessEvent = useCallback(
    async (cardUid) => {
      const payload = {
        device_id: deviceIds.door,
        card_uid: String(cardUid || '').toUpperCase(),
        timestamp: new Date().toISOString(),
      };

      try {
        const response = await checkAccess(payload);
        const log = normalizeAccessLog({
          ...payload,
          granted: response?.granted ?? response?.authorized,
          user_name: response?.user_name || null,
          reason: response?.reason || null,
          latency_ms: response?.latency_ms || Math.round(Math.random() * 40 + 25),
          access_log_id: response?.access_log_id,
        });

        appendAccessLog(log);
        appendMockAccessLog(log);
        return response;
      } catch (error) {
        const fallback = createMockAccessEvent({
          cardUid,
          deviceId: deviceIds.door,
          cards: policyCards,
        });
        appendAccessLog(fallback);
        setUsingAccessFallback(true);
        return fallback;
      }
    },
    [appendAccessLog, deviceIds.door, policyCards]
  );

  const createPolicyCard = useCallback(async (payload) => {
    try {
      await addPolicyCard(payload);
      await refreshPolicyCards();
      return { ok: true };
    } catch (error) {
      try {
        addMockPolicyCard(payload);
        await refreshPolicyCards();
        setUsingPolicyFallback(true);
        return { ok: true, fallback: true };
      } catch (fallbackError) {
        return { ok: false, error: fallbackError.message || 'Failed to add policy card.' };
      }
    }
  }, [refreshPolicyCards]);

  const revokePolicyCard = useCallback(async (cardUid) => {
    try {
      await deletePolicyCard(cardUid);
      await refreshPolicyCards();
      return { ok: true };
    } catch (error) {
      try {
        removeMockPolicyCard(cardUid);
        await refreshPolicyCards();
        setUsingPolicyFallback(true);
        return { ok: true, fallback: true };
      } catch (fallbackError) {
        return { ok: false, error: fallbackError.message || 'Failed to revoke card.' };
      }
    }
  }, [refreshPolicyCards]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshHealth(),
      refreshLightingSnapshot(),
      refreshLightingHistory(24),
      refreshEnvironmentalHistory(24),
      refreshPolicyCards(),
      refreshAccessLogs(),
    ]);
  }, [
    refreshAccessLogs,
    refreshEnvironmentalHistory,
    refreshHealth,
    refreshLightingHistory,
    refreshLightingSnapshot,
    refreshPolicyCards,
  ]);

  const setDeviceIds = useCallback((nextIds) => {
    setDeviceIdsState((previous) => {
      const merged = {
        environmental: nextIds.environmental || previous.environmental,
        lighting: nextIds.lighting || previous.lighting,
        door: nextIds.door || previous.door,
      };
      persistDeviceIds(merged);
      return merged;
    });
  }, []);

  useEffect(() => {
    ensureMockStore();
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshHealth();
      refreshLightingSnapshot();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshHealth, refreshLightingSnapshot]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshAccessLogs({ limit: 100 });
    }, 45000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshAccessLogs]);

  useEffect(() => {
    if (wsStatus === 'connected') {
      setUsingSyntheticFeed(false);
      return undefined;
    }

    setUsingSyntheticFeed(true);
    const interval = window.setInterval(() => {
      setEnvironmentalData((previous) => {
        const nextPoint = generateSyntheticEnvironmentalPoint(previous[previous.length - 1]);
        return capDataPoints(mergeLatestByTimestamp([...previous, nextPoint]));
      });

      setLightingData((previous) => {
        const nextPoint = generateSyntheticLightingPoint(previous[previous.length - 1]);
        return capDataPoints(mergeLatestByTimestamp([...previous, nextPoint]));
      });
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [wsStatus]);

  const latestEnvironmental = environmentalData[environmentalData.length - 1] || null;
  const latestLighting = lightingData[lightingData.length - 1] || null;

  const value = useMemo(
    () => ({
      accessLogs,
      apiReachable,
      connectedDevices,
      createOrCheckAccessEvent,
      createPolicyCard,
      deviceIds,
      environmentalData,
      health,
      lastCommand,
      lastError,
      lastMessageAt,
      latestEnvironmental,
      latestLighting,
      lightingData,
      loading,
      policyCards,
      refreshAccessLogs,
      refreshAll,
      refreshEnvironmentalHistory,
      refreshHealth,
      refreshLightingHistory,
      refreshLightingSnapshot,
      refreshPolicyCards,
      revokePolicyCard,
      setDaylightHarvest,
      setDeviceIds,
      setDimmer,
      setRelay,
      usingAccessFallback,
      usingPolicyFallback,
      usingSyntheticFeed,
      wsStatus,
      wsUrl,
    }),
    [
      accessLogs,
      apiReachable,
      connectedDevices,
      createOrCheckAccessEvent,
      createPolicyCard,
      deviceIds,
      environmentalData,
      health,
      lastCommand,
      lastError,
      lastMessageAt,
      latestEnvironmental,
      latestLighting,
      lightingData,
      loading,
      policyCards,
      refreshAccessLogs,
      refreshAll,
      refreshEnvironmentalHistory,
      refreshHealth,
      refreshLightingHistory,
      refreshLightingSnapshot,
      refreshPolicyCards,
      revokePolicyCard,
      setDaylightHarvest,
      setDeviceIds,
      setDimmer,
      setRelay,
      usingAccessFallback,
      usingPolicyFallback,
      usingSyntheticFeed,
      wsStatus,
      wsUrl,
    ]
  );

  return <SmartHomeContext.Provider value={value}>{children}</SmartHomeContext.Provider>;
}

export function useSmartHome() {
  const context = useContext(SmartHomeContext);
  if (!context) {
    throw new Error('useSmartHome must be used within a SmartHomeProvider');
  }
  return context;
}

