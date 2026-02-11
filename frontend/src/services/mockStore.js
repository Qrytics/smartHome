const POLICY_STORE_KEY = 'smarthome.mock.policyCards.v1';
const ACCESS_LOG_STORE_KEY = 'smarthome.mock.accessLogs.v1';

const DEFAULT_POLICY_CARDS = [
  {
    card_uid: '04:A3:2B:F2:1C:80',
    user_name: 'Mario Belmonte',
    added_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
    active: true,
  },
  {
    card_uid: '04:B7:3C:E1:2D:91',
    user_name: 'Cindy Chen',
    added_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
    active: true,
  },
  {
    card_uid: '11:22:33:44:55:66',
    user_name: 'Demo Visitor',
    added_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
];

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseJsonOrFallback(rawValue, fallback) {
  if (!rawValue) return fallback;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return fallback;
  }
}

function safeRead(key, fallback) {
  try {
    return parseJsonOrFallback(window.localStorage.getItem(key), fallback);
  } catch (error) {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Browser storage can fail in privacy mode. Keep fallback non-blocking.
  }
}

function normalizeCardUid(uid) {
  const cleaned = String(uid || '')
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '');

  if (cleaned.length < 2) return '';

  const pairs = cleaned.match(/.{1,2}/g) || [];
  return pairs.slice(0, 8).join(':');
}

function makeDemoLog(index, cards) {
  const card = cards[index % cards.length];
  const granted = index % 4 !== 0;
  const timestamp = new Date(Date.now() - index * 45 * 1000).toISOString();

  return {
    id: `mock-${Date.now()}-${index}`,
    timestamp,
    device_id: 'door-control-01',
    card_uid: granted ? card.card_uid : 'FF:FF:FF:FF:FF:FF',
    user_name: granted ? card.user_name : null,
    granted,
    latency_ms: Math.round(randomRange(28, 92)),
    reason: granted ? null : 'Card not in whitelist',
  };
}

function seedAccessLogs(cards) {
  const logs = [];
  for (let i = 0; i < 32; i += 1) {
    logs.push(makeDemoLog(i, cards));
  }
  safeWrite(ACCESS_LOG_STORE_KEY, logs);
  return logs;
}

export function ensureMockStore() {
  const cards = safeRead(POLICY_STORE_KEY, null);
  if (!Array.isArray(cards) || cards.length === 0) {
    safeWrite(POLICY_STORE_KEY, DEFAULT_POLICY_CARDS);
  }

  const logs = safeRead(ACCESS_LOG_STORE_KEY, null);
  if (!Array.isArray(logs) || logs.length === 0) {
    seedAccessLogs(DEFAULT_POLICY_CARDS);
  }
}

export function getMockPolicyCards() {
  ensureMockStore();
  const cards = safeRead(POLICY_STORE_KEY, DEFAULT_POLICY_CARDS);
  return [...cards].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
  });
}

export function addMockPolicyCard(card) {
  ensureMockStore();
  const cards = getMockPolicyCards();
  const cardUid = normalizeCardUid(card.card_uid);

  if (!cardUid) {
    throw new Error('Invalid card UID');
  }

  const duplicate = cards.some((entry) => entry.card_uid === cardUid);
  if (duplicate) {
    throw new Error(`Card ${cardUid} already exists`);
  }

  const nextCard = {
    card_uid: cardUid,
    user_name: String(card.user_name || 'Unnamed User').trim(),
    added_at: new Date().toISOString(),
    expires_at: card.expires_at || null,
    active: true,
  };

  const nextCards = [nextCard, ...cards];
  safeWrite(POLICY_STORE_KEY, nextCards);
  return nextCard;
}

export function removeMockPolicyCard(cardUid) {
  ensureMockStore();
  const normalized = normalizeCardUid(cardUid);
  const cards = getMockPolicyCards();
  const nextCards = cards.filter((card) => card.card_uid !== normalized);
  safeWrite(POLICY_STORE_KEY, nextCards);
  return { status: 'deleted', card_uid: normalized };
}

export function getMockAccessLogs(filters = {}) {
  ensureMockStore();
  const logs = safeRead(ACCESS_LOG_STORE_KEY, []);
  const {
    search,
    granted,
    card_uid: cardUid,
    device_id: deviceId,
    limit = 200,
    offset = 0,
  } = filters;

  const normalizedSearch = String(search || '').trim().toLowerCase();
  const normalizedCardUid = cardUid ? normalizeCardUid(cardUid) : null;

  const filtered = logs.filter((entry) => {
    if (typeof granted === 'boolean' && entry.granted !== granted) return false;
    if (typeof deviceId === 'string' && deviceId && entry.device_id !== deviceId) return false;
    if (normalizedCardUid && entry.card_uid !== normalizedCardUid) return false;

    if (normalizedSearch) {
      const haystack = [
        entry.card_uid,
        entry.user_name || '',
        entry.device_id,
        entry.reason || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    }

    return true;
  });

  const sorted = filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    total: sorted.length,
    limit,
    offset,
    logs: sorted.slice(offset, offset + limit),
  };
}

export function appendMockAccessLog(entry) {
  ensureMockStore();
  const logs = safeRead(ACCESS_LOG_STORE_KEY, []);
  const nextLog = {
    id: entry.id || `mock-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    device_id: entry.device_id || 'door-control-01',
    card_uid: normalizeCardUid(entry.card_uid || '00:00:00:00:00:00'),
    user_name: entry.user_name || null,
    granted: Boolean(entry.granted),
    latency_ms: Number.isFinite(entry.latency_ms) ? entry.latency_ms : Math.round(randomRange(32, 84)),
    reason: entry.reason || null,
  };

  const nextLogs = [nextLog, ...logs].slice(0, 500);
  safeWrite(ACCESS_LOG_STORE_KEY, nextLogs);
  return nextLog;
}

export function createMockAccessEvent({ cardUid, deviceId = 'door-control-01', cards = [] }) {
  const normalizedUid = normalizeCardUid(cardUid);
  const card = cards.find((entry) => entry.card_uid === normalizedUid);
  const expiresAt = card?.expires_at ? new Date(card.expires_at).getTime() : null;
  const expired = Number.isFinite(expiresAt) ? Date.now() > expiresAt : false;
  const granted = Boolean(card && card.active && !expired);

  const event = appendMockAccessLog({
    timestamp: new Date().toISOString(),
    device_id: deviceId,
    card_uid: normalizedUid || 'FF:FF:FF:FF:FF:FF',
    user_name: granted ? card.user_name : null,
    granted,
    reason: granted ? null : expired ? 'Card expired' : 'Card not in whitelist',
    latency_ms: Math.round(randomRange(26, 96)),
  });

  return {
    granted,
    card_uid: event.card_uid,
    device_id: event.device_id,
    user_name: event.user_name,
    reason: event.reason,
    access_log_id: event.id,
    timestamp: event.timestamp,
  };
}

export function generateSyntheticEnvironmentalPoint(previous) {
  const now = new Date().toISOString();
  const prevTemp = Number(previous?.temperature || 22.4);
  const prevHumidity = Number(previous?.humidity || 46.5);
  const prevPressure = Number(previous?.pressure || 1012.8);

  return {
    timestamp: now,
    temperature: Number(clamp(prevTemp + randomRange(-0.2, 0.2), 17, 33).toFixed(2)),
    humidity: Number(clamp(prevHumidity + randomRange(-0.6, 0.6), 22, 78).toFixed(2)),
    pressure: Number(clamp(prevPressure + randomRange(-0.4, 0.4), 990, 1038).toFixed(2)),
  };
}

export function generateSyntheticLightingPoint(previous) {
  const now = new Date().toISOString();
  const prevLightLevel = Number(previous?.light_level || 42);
  const prevLux = Number(previous?.light_lux || 310);
  const prevBrightness = Number(previous?.dimmer_brightness || 64);
  const prevDaylight = Boolean(previous?.daylight_harvest_mode ?? true);
  const prevRelays = Array.isArray(previous?.relays)
    ? previous.relays.slice(0, 4)
    : [true, false, false, false];

  const nextLight = Number(clamp(prevLightLevel + randomRange(-2.2, 2.2), 0, 100).toFixed(2));
  const nextLux = Number(clamp(prevLux + randomRange(-28, 28), 0, 1600).toFixed(1));
  const targetBrightness = prevDaylight
    ? clamp(100 - nextLight, 8, 96)
    : clamp(prevBrightness + randomRange(-1.5, 1.5), 0, 100);

  return {
    timestamp: now,
    light_level: nextLight,
    light_lux: nextLux,
    dimmer_brightness: Math.round(targetBrightness),
    daylight_harvest_mode: prevDaylight,
    relays: prevRelays,
  };
}

