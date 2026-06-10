const CACHE_VERSION = 1;
const TTL_MS = 10 * 60 * 1000;

const buildKey = (slice, clientId) => `mc_v${CACHE_VERSION}_${clientId}_${slice}`;

const safeRead = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const safeWrite = (storageKey, value) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[menuCache] write failed:', e?.name);
    return false;
  }
};

export const menuCache = {
  set(slice, clientId, data) {
    if (!clientId) return;
    safeWrite(buildKey(slice, clientId), {
      ts: Date.now(),
      data,
    });
  },

  get(slice, clientId) {
    if (!clientId) return null;
    const entry = safeRead(buildKey(slice, clientId));
    if (!entry) return null;
    if (Date.now() - entry.ts > TTL_MS) {
      this.remove(slice, clientId);
      return null;
    }
    return entry.data;
  },

  remove(slice, clientId) {
    if (!clientId) return;
    try { localStorage.removeItem(buildKey(slice, clientId)); } catch { }
  },

  invalidate(clientId) {
    if (!clientId) return;

    ['addonData', 'zoneConfig', 'units', 'inventoryIds', 'dietaryTypes', 'timings']
      .forEach(slice => this.remove(slice, clientId));

    const prefix = `mc_v${CACHE_VERSION}_${clientId}_menuData`;
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k));
    } catch { }
  },

  isValid(slice, clientId) {
    return this.get(slice, clientId) !== null;
  },
};