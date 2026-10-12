import axios from 'axios';
const CACHE_VERSION = 1;

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
    return entry.data;
  },

  remove(slice, clientId) {
    if (!clientId) return;
    try { localStorage.removeItem(buildKey(slice, clientId)); } catch { }
  },

  invalidate(clientId) {
    if (!clientId) return;

    ['addonData', 'zoneConfig', 'units', 'inventoryIds', 'dietaryTypes', 'timings', 'counterTree', 'kds_menuMap', 'summary_menuMap','tablesData','menuItems']
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

  async fetchTables(clientId, token) {
    const cached = this.get('tablesData', clientId);
    if (cached) return cached;
 
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
 
      const rawList = res.data?.data || [];
 
      // normalise table_number (used by TakeOrder floor view)
      const list = rawList.map(t => ({
        ...t,
        table_number: t.name || t.table_number || '-',
      }));
 
      const map = {};
      list.forEach(t => (map[t.id] = t.table_number));
 
      const result = { list, map };
      this.set('tablesData', clientId, result);
      return result;
    } catch (err) {
      console.error('[menuCache.fetchTables]', err);
      return { list: [], map: {} };
    }
  },
 
  // ─── fetchMenuItems ──────────────────────────────────────────────────────
  // Returns { list, map } where:
  //   list → raw menu item array from /menu/read (inventory_id: 'menu')
  //   map  → { [item.id]: item }  — keyed by both Number(id) and String(id)
  //
  // Usage:
  //   const { list, map } = await menuCache.fetchMenuItems(clientId, token);
  //
  // Replaces: kds_menuMap, summary_menuMap, and the inline blocks in
  // KitchenDisplay and OrderSummaryVisible.
 
  async fetchMenuItems(clientId, token) {
    const cached = this.get('menuItems', clientId);
    if (cached) return cached;
 
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { inventory_id: 'menu' },
        }
      );
 
      const list = res.data?.data || [];
 
      // Key by both numeric and string id — KDS uses both access patterns
      const map = {};
      list.forEach(item => {
        map[Number(item.id)] = item;
        map[String(item.id)] = item;
      });
 
      const result = { list, map };
      this.set('menuItems', clientId, result);
      return result;
    } catch (err) {
      console.error('[menuCache.fetchMenuItems]', err);
      return { list: [], map: {} };
    }
  },
 
  // ─── fetchTablesConfig ───────────────────────────────────────────────────
  // Returns { sections, zones } where:
  //   sections → raw config array from /tables/config
  //   zones    → deduped zone name array
  //
  // Usage:
  //   const { sections, zones } = await menuCache.fetchTablesConfig(clientId, token);
  //
  // Replaces: the inline zoneConfig fetch blocks in MenuManagement and TakeOrder.
  // Both callers previously stored under 'zoneConfig' but in different shapes.
  // This unifies them — the stored shape now always matches MenuManagement's
  // { sections, zones } format, which TakeOrder already knows how to read
  // (it does: cached.sections / cached.zones).
 
  async fetchTablesConfig(clientId, token) {
    const cached = this.get('zoneConfig', clientId);
    if (cached) return cached;
 
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
 
      const sections = res.data || [];
      const zones = [...new Set(sections.map(d => d.zone))];
 
      const result = { sections, zones };
      this.set('zoneConfig', clientId, result);
      return result;
    } catch (err) {
      console.error('[menuCache.fetchTablesConfig]', err);
      return { sections: [], zones: [] };
    }
  },

  patchAvailability(clientId, idToAvailability /* { [id]: number } */) {
    if (!clientId || !idToAvailability || Object.keys(idToAvailability).length === 0) return;

    const prefix = `mc_v${CACHE_VERSION}_${clientId}_`;
    let keys;
    try {
      keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    } catch {
      return;
    }

    keys.forEach(key => {
      let parsed;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      let changed = false;
      const visit = (node) => {
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (node && typeof node === 'object') {
          if (
            'id' in node &&
            'availability' in node &&
            Object.prototype.hasOwnProperty.call(idToAvailability, node.id) 
          ) {
            node.availability = idToAvailability[node.id];
            changed = true;
          }
          // also handle numeric-string-keyed maps like { [id]: item }
          Object.values(node).forEach(v => {
            if (v && typeof v === 'object') visit(v);
          });
        }
      };

      visit(parsed);
      if (changed) {
        try { localStorage.setItem(key, JSON.stringify(parsed)); } catch {}
      }
    });
  },
};

