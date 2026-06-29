import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { menuCache } from './menuCache';        
import {flattenCategoryTree,normalizeFlatCategories,buildCategoryTree,findCategoryNode,getCategoriesAtLevel,parseTimingString,} from './menuUtils';

// ─────────────────────────────────────────────────────────────────────────────
// useDietaryTypes
// ─────────────────────────────────────────────────────────────────────────────

const DIETARY_COLORS = [
  'bg-green-500',
  'bg-red-500',
  'bg-yellow-400',
  'bg-orange-500',
  'bg-purple-500',
  'bg-blue-500',
];

export function useDietaryTypes({ clientId, token, enabled = true }) {
  const [dietaryOptions, setDietaryOptions] = useState([]);
  const [dietaryColorMap, setDietaryColorMap] = useState({});

  const fetch = useCallback(async () => {
    if (!clientId || !token) return;

    const cached = menuCache.get('dietaryTypes', clientId);
    if (cached) {
      setDietaryOptions(cached);
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
        { params: { category_id: 'dietary_type' }, headers: { Authorization: `Bearer ${token}` } }
      );
      const opts = res.data?.data || [];
      setDietaryOptions(opts);
      menuCache.set('dietaryTypes', clientId, opts);
    } catch (err) {
      console.error('useDietaryTypes fetch failed:', err);
      setDietaryOptions([]);
    }
  }, [clientId, token]);

  // Build color map whenever options change
  useEffect(() => {
    if (!dietaryOptions.length) return;
    const map = {};
    dietaryOptions.forEach((opt, idx) => {
      map[opt.toLowerCase().replace(/[-_\s]/g, '')] = DIETARY_COLORS[idx % DIETARY_COLORS.length];
    });
    setDietaryColorMap(map);
  }, [dietaryOptions]);

  useEffect(() => {
    if (enabled) fetch();
  }, [fetch, enabled]);

  return { dietaryOptions, dietaryColorMap, refetchDietaryTypes: fetch };
}

export function useTimings({ clientId, token, enabled = true }) {
  const [timingOptions, setTimingOptions] = useState([]);

  const fetch = useCallback(async () => {
    if (!clientId || !token) return;

    const cached = menuCache.get('timings', clientId);
    if (cached) {
      setTimingOptions(cached);
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
        { params: { category_id: 'available_timings' }, headers: { Authorization: `Bearer ${token}` } }
      );
      const parsed = (res.data?.data || []).map(parseTimingString);
      setTimingOptions(parsed);
      menuCache.set('timings', clientId, parsed);
    } catch (err) {
      console.error('useTimings fetch failed:', err);
      setTimingOptions([]);
    }
  }, [clientId, token]);

  useEffect(() => {
    if (enabled) fetch();
  }, [fetch, enabled]);

  return { timingOptions, refetchTimings: fetch };
}


export function useZoneConfig({ clientId, token, takeawayRootEnv = '' }) {
  const [sections, setSections] = useState([]);
  const [takeawaySections, setTakeawaySections] = useState([]);
  const [zones, setZones] = useState([]);

  const fetch = useCallback(async () => {
    if (!clientId || !token) return;

    const cached = menuCache.get('zoneConfig', clientId);
    if (cached) {
      setSections(cached.sections);
      setTakeawaySections(cached.takeawaySections || []);
      setZones(cached.zones);
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allSections = res.data || [];

      const takeawayRoots = takeawayRootEnv
        .split(',')
        .map(v => v.trim().toLowerCase())
        .filter(Boolean);

      const dineIn = takeawayRoots.length > 0
        ? allSections.filter(s =>
            !takeawayRoots.some(root =>
              (s.zone || '').toLowerCase().startsWith(root) ||
              (s.section || '').toLowerCase().startsWith(root)
            )
          )
        : allSections;

      const takeaway = takeawayRoots.length > 0
        ? allSections.filter(s =>
            takeawayRoots.some(root =>
              (s.zone || '').toLowerCase().startsWith(root) ||
              (s.section || '').toLowerCase().startsWith(root)
            )
          )
        : [];

      const uniqueZones = [...new Set(allSections.map(d => d.zone).filter(Boolean))];

      setSections(dineIn);
      setTakeawaySections(takeaway);
      setZones(uniqueZones);

      menuCache.set('zoneConfig', clientId, { sections: dineIn, takeawaySections: takeaway, zones: uniqueZones });
    } catch (err) {
      console.error('useZoneConfig fetch failed:', err);
    }
  }, [clientId, token, takeawayRootEnv]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sections, takeawaySections, zones, refetchZoneConfig: fetch };
}

export function useCounterTree({ clientId, token }) {
  const [counterTree, setCounterTree] = useState([]);

  const fetch = useCallback(async () => {
    if (!clientId || !token) return;

    const cached = menuCache.get('counterTree', clientId);
    if (cached) { setCounterTree(cached); return; }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category`,
        {
          params: { client_id: clientId, category_id: 'counter' },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = res.data.data?.[0]?.subCategories || [];
      setCounterTree(data);
      menuCache.set('counterTree', clientId, data);
    } catch (err) {
      console.error('useCounterTree fetch failed:', err);
    }
  }, [clientId, token]);

  useEffect(() => { fetch(); }, [fetch]);

  return { counterTree, refetchCounterTree: fetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useMenuData  (categories + items)
// ─────────────────────────────────────────────────────────────────────────────

export function useMenuData({
  clientId,
  token,
  menuConfig,
  zoneConfigId = null,
  includeAllRaw = false,  
}) {
  const [menuItems, setMenuItems] = useState([]);
  const [allMenuItemsRaw, setAllMenuItemsRaw] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const [dieterySubCategories, setDieterySubCategories] = useState([]);
  const [dedupedMenuItems, setDedupedMenuItems] = useState([]);
  const [requiredScreenId, setRequiredScreenId] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async (opts = {}) => {
    const { silent = false, force = false } = opts;
    if (!clientId || !token || !menuConfig) {
      if (!silent) setLoading(false);
      return;
    }

    const cacheSlice = `menuData_zone_${zoneConfigId ?? 'all'}`;

    if (!silent && !force) {
      const cached = menuCache.get(cacheSlice, clientId);
      if (cached) {
        setCategoriesFlat(cached.categoriesFlat);
        setMenuItems(cached.menuItems);
        if (includeAllRaw) setAllMenuItemsRaw(cached.allMenuItemsRaw || []);
        setCategories(cached.categoryTree);
        setDieterySubCategories(cached.quickCategories || []);
        setDedupedMenuItems(cached.dedupedMenuItems || []);
        setRequiredScreenId(cached.screen_id || null);
        setLoading(false);
        return;
      }
    }

    try {
      if (!silent) setLoading(true);

      const requests = [
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              inventory_id: menuConfig.menuInventoryId,
              ...(zoneConfigId ? { zone_config_id: zoneConfigId } : {}),
            },
          }
        ),
      ];

      if (includeAllRaw) {
        requests.push(
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { inventory_id: menuConfig.menuInventoryId },
            }
          )
        );
      }

      const [catRes, itemRes, allItemsRes] = await Promise.all(requests);

      setRequiredScreenId(catRes.data.screen_id || null);
      const fullTree = (catRes.data.data || []).filter(c => c.name?.toLowerCase() !== 'all');
      const subIds = new Set();
      fullTree.forEach(c => c.subCategories?.forEach(s => subIds.add(s.id)));
      const topLevel = fullTree.filter(c => !subIds.has(c.id));
      const flatRaw = flattenCategoryTree(topLevel);
      const flat = normalizeFlatCategories(flatRaw);
      setCategoriesFlat(flat);

      const normalizeZid = item => ({
        ...item,
        zone_config_id:
          item.zone_config_id === null || item.zone_config_id === undefined
            ? 0
            : Number(item.zone_config_id),
      });

      const rawItems = itemRes.data.data || [];

      const seenInit = new Map();
      rawItems.forEach(item => {
        const zid = item.zone_config_id === null || item.zone_config_id === undefined
          ? 0 : Number(item.zone_config_id);
        if (!seenInit.has(item.id)) {
          seenInit.set(item.id, { ...item, zone_config_id: zid });
        } else if (zid === 0) {
          seenInit.set(item.id, { ...item, zone_config_id: 0 });
        }
      });

      const enriched = Array.from(seenInit.values()).map(item => {
        const cat = flatRaw.find(c => c.id === item.category_id);
        return { ...item, category_name: cat?.name || 'Uncategorized' };
      });
      enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMenuItems(enriched);

      if (includeAllRaw && allItemsRes) {
        setAllMenuItemsRaw((allItemsRes.data.data || []).map(normalizeZid));
      }
      const dedupMap = new Map();
      enriched.forEach(item => {
        const key = (item.name || '').trim().toLowerCase();
        if (!dedupMap.has(key)) {
          dedupMap.set(key, item);
        } else {
          const existing = dedupMap.get(key);
          const isBase = item.zone_config_id === 0 || item.zone_config_id === null;
          const existingIsBase = existing.zone_config_id === 0 || existing.zone_config_id === null;
          if (isBase && !existingIsBase) dedupMap.set(key, item);
        }
      });
      setDedupedMenuItems(Array.from(dedupMap.values()));

      const categoryTree = buildCategoryTree(flat).map(c =>
        c.id === menuConfig.root || c.name?.toLowerCase() === menuConfig.root.toLowerCase()
          ? { ...c, displayName: 'All Categories', count: c.children.length }
          : c
      );
      setCategories(categoryTree);

      const rootNode = findCategoryNode(categoryTree, menuConfig.root);
      let quickCategories = [];
      if (rootNode) {
        let level = menuConfig.level ?? 1;
        while (level >= 0) {
          quickCategories = getCategoriesAtLevel(rootNode, level);
          if (quickCategories.length > 0) break;
          level--;
        }
      }
      setDieterySubCategories(quickCategories);

      // ── Persist to cache ──
      menuCache.set(cacheSlice, clientId, {
        categoriesFlat: flat,
        menuItems: enriched,
        allMenuItemsRaw: includeAllRaw && allItemsRes
          ? (allItemsRes.data.data || []).map(normalizeZid)
          : [],
        categoryTree,
        quickCategories,
        dedupedMenuItems: Array.from(dedupMap.values()),
        screen_id: catRes.data.screen_id || null,
      });
    } catch (err) {
      console.error('useMenuData fetch failed:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId, token, menuConfig, zoneConfigId, includeAllRaw]);

  useEffect(() => { refetch(); }, [refetch]);

  return {
    menuItems,
    allMenuItemsRaw,
    categories,
    categoriesFlat,
    dieterySubCategories,
    dedupedMenuItems,
    requiredScreenId,
    loading,
    refetch,
    setMenuItems,
  };
}