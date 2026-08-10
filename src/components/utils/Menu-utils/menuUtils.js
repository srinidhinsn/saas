import axios from 'axios';
import { toast } from 'react-toastify';

export function flattenCategoryTree(tree, level = 0, parentId = null) {
  let flat = [];
  tree.forEach(c => {
    flat.push({
      id: c.id,
      name: (c.name || '').trim(),
      level,
      parentId,
      hasChildren: !!(c.subCategories?.length || c.children?.length),
    });
    const children = c.subCategories || c.children || [];
    if (children.length) {
      flat = flat.concat(flattenCategoryTree(children, level + 1, c.id));
    }
  });
  return flat;
}

export function normalizeFlatCategories(flatList) {
  return flatList.map(c => ({
    id: c.id,
    name: (c.name || '').trim(),
    parentId: c.parentId ?? c.parent_id ?? null,
  }));
}

export function buildCategoryTree(flatCats) {
  const map = new Map();
  flatCats.forEach(c => map.set(c.id, { ...c, children: [] }));
  const tree = [];
  map.forEach(cat => {
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId).children.push(cat);
    } else {
      tree.push(cat);
    }
  });
  return tree;
}

export function findCategoryNode(tree, matcher) {
  for (const c of tree) {
    if (
      c.id?.toLowerCase() === matcher.toLowerCase() ||
      c.name?.toLowerCase() === matcher.toLowerCase()
    ) return c;
    const children = c.children || c.subCategories || [];
    if (children.length) {
      const found = findCategoryNode(children, matcher);
      if (found) return found;
    }
  }
  return null;
}

export function getCategoriesAtLevel(node, targetLevel, currentLevel = 0) {
  if (!node) return [];
  if (currentLevel === targetLevel) return [node];
  let result = [];
  for (const child of node.children || []) {
    result = result.concat(getCategoriesAtLevel(child, targetLevel, currentLevel + 1));
  }
  return result;
}

export function getCategoryAndChildrenIds(targetId, categoriesFlat) {
  if (!targetId || !categoriesFlat?.length) return [];
  const result = new Set();
  const addWithChildren = (id) => {
    result.add(id);
    categoriesFlat
      .filter(c => c.parentId === id)
      .forEach(c => addWithChildren(c.id));
  };
  addWithChildren(targetId);
  return Array.from(result);
}

export function getCategoryAncestors(categoryId, categoriesFlat) {
  const ancestors = new Set();
  let cur = categoryId;
  const visited = new Set();
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    ancestors.add(cur);
    const cat = categoriesFlat.find(c => c.id === cur);
    cur = cat?.parentId || null;
  }
  return ancestors;
}

export function isComboCategoryId(categoryId, categoriesFlat) {
  if (!categoryId || !categoriesFlat?.length) return false;
  let cur = categoryId;
  const visited = new Set();
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const cat = categoriesFlat.find(c => c.id === cur);
    if (!cat) break;
    if ((cat.name || '').toLowerCase().includes('combo')) return true;
    cur = cat.parentId ?? null;
  }
  return false;
}

export function toSlugSegment(str) {
  return (str || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function generateSlug(itemName, categoryId, suffixParts = [], categoriesFlat = []) {
  const pathParts = [];
  let currentId = categoryId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categoriesFlat.find(c => c.id === currentId);
    if (!cat) break;
    pathParts.unshift(toSlugSegment(cat.name));
    currentId = cat.parentId ?? cat.parent_id ?? null;
  }

  const itemPart = toSlugSegment(itemName);
  const base = [...pathParts, itemPart].filter(Boolean).join('_');
  const filtered = suffixParts.filter(Boolean);
  return filtered.length > 0 ? `${base}__${filtered.join('+')}` : base;
}

export function getTimingsFromSlug(slug) {
  if (!slug) return [];
  const idx = slug.lastIndexOf('__');
  if (idx === -1) return [];
  return slug.slice(idx + 2).toLowerCase().split('+').filter(Boolean);
}

export function normalizeDietaryKey(str) {
  return (str || '').toLowerCase().replace(/[-_\s]/g, '');
}

export function getDietaryFromSlug(item, dietaryOptions) {
  if (!item || !dietaryOptions?.length) return null;

  const normalize = normalizeDietaryKey;
  const slug = item.slug || '';
  const doubleUnderIdx = slug.lastIndexOf('__');

  // ── NEW FORMAT: dietary is in the __ suffix ──
  if (doubleUnderIdx !== -1) {
    const suffix = slug.slice(doubleUnderIdx + 2).toLowerCase();
    if (suffix && suffix !== 'unavailable' && suffix !== 'allday') {
      const suffixParts = suffix.split('+').filter(Boolean);
      const sortedOptions = [...dietaryOptions].sort(
        (a, b) => normalize(b).length - normalize(a).length
      );
      for (const part of suffixParts) {
        const match = sortedOptions.find(d => normalize(d) === normalize(part));
        if (match) return normalize(match);
      }
    }
  }

  // ── OLD FORMAT FALLBACK: dietary was injected into the main slug path ──
  const mainPart = doubleUnderIdx !== -1 ? slug.slice(0, doubleUnderIdx) : slug;
  const slugSegments = mainPart.toLowerCase().split('_').filter(Boolean);
  const sortedOptions = [...dietaryOptions].sort(
    (a, b) => normalize(b).length - normalize(a).length
  );
  for (let i = 0; i < slugSegments.length; i++) {
    for (let j = 1; j <= 3; j++) {
      const joined = normalize(slugSegments.slice(i, i + j).join(''));
      const match = sortedOptions.find(d => normalize(d) === joined);
      if (match) return normalize(match);
    }
  }

  return null;
}

export function parseTimingString(raw) {
  const match = raw.match(/^(.+)\((.+)-(.+)\)$/);
  return {
    name: (match?.[1] ?? raw).trim().toLowerCase(),
    start: match?.[2] ?? null,
    end: match?.[3] ?? null,
    raw,
  };
}

export function isItemActive(slug, timingOptions) {
  if (!slug) return true;

  const idx = slug.lastIndexOf('__');
  const timingSegment = idx !== -1 ? slug.slice(idx + 2).toLowerCase() : null;

  if (timingSegment === 'unavailable') return false;
  if (!timingOptions?.length) return true;
  if (!timingSegment || timingSegment === 'allday') return true;

  const timingKeys = timingSegment.split('+').filter(Boolean);
  if (timingKeys.length === 0) return true;

  // Only check keys that have a defined time window
  const recognizedKeys = timingKeys.filter(key => {
    const t = timingOptions.find(o => o.name?.toLowerCase() === key);
    return t && t.start && t.end;
  });

  if (recognizedKeys.length === 0) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return recognizedKeys.some(key => {
    const t = timingOptions.find(o => o.name?.toLowerCase() === key);
    const [sh, sm] = t.start.split(':').map(Number);
    const [eh, em] = t.end.split(':').map(Number);
    return currentMinutes >= sh * 60 + sm && currentMinutes <= eh * 60 + em;
  });
}

export function buildCartItem(item, extra = {}) {
  const ts = Date.now() + Math.random();
  const { _item_type, ...cleanExtra } = extra;
  const typePrefix = _item_type || 'main';
  const parentKey = cleanExtra.parent_item_key || '';
  const key = parentKey
    ? `${typePrefix}_${parentKey}_${item.id}_${ts}`
    : `${typePrefix}_${item.id}_${ts}`;

  return {
    id: Number(item.id),
    name: item.name,
    image_id: item.image_id,
    unit_price: (item.unit_price || 0) * (1 - (Number(item.discount) || 0) / 100),
    slug: item.slug,
    category: item.category_name,
    category_id: item.category_id || null,
    quantity: 1,
    note: '',
    frontend_unique_key: key,
    is_new_item: true,
    saved_sub_order: false,
    is_addon: false,
    parent_item_key: null,
    ...cleanExtra,
  };
}

export function getGroupedCartItems(items) {
  const grouped = [];
  const processed = new Set();
  items.forEach(item => {
    const key = item.frontend_unique_key || item.id;
    if (processed.has(key)) return;
    if (!item.parent_item_key) {
      const addons = items.filter(i => i.parent_item_key === item.frontend_unique_key);
      grouped.push({ main: { ...item }, addons });
      processed.add(key);
      addons.forEach(a => processed.add(a.frontend_unique_key || a.id));
    }
  });
  return grouped;
}

export function deduplicateOrderItems(items) {
  const keyMap = new Map();
  const result = [];
  items.forEach(item => {
    const fkey = item.frontend_unique_key || (item.id ? String(item.id) : null);
    if (!fkey) {
      result.push({ ...item });
      return;
    }
    if (keyMap.has(fkey)) {
      keyMap.get(fkey).quantity += item.quantity ?? 0;
    } else {
      const copy = { ...item };
      keyMap.set(fkey, copy);
      result.push(copy);
    }
  });
  return result;
}


export const isPackagingCategoryId = (categoryId, categoriesFlat) => {
  if (!categoryId || !categoriesFlat?.length) return false;
  let currentId = categoryId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categoriesFlat.find(c => c.id === currentId);
    if (!cat) break;
    if ((cat.name || '').toLowerCase().includes('packaging')) return true;
    currentId = cat.parentId ?? null;
  }
  return false;
};
export const isDeliveryChargeCategoryId = (categoryId, categoriesFlat) => {
  if (!categoryId || !categoriesFlat?.length) return false;
  let currentId = categoryId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categoriesFlat.find(c => c.id === currentId);
    if (!cat) break;
    if ((cat.name || '').toLowerCase().includes('delivery charge')) return true;
    currentId = cat.parentId ?? null;
  }
  return false;
};
// ── Packaging add-on helpers (shared across TakeOrder, KDS, Billing) ──

// Cart-item level check: works for freshly-added items (is_container flag,
// set at add-to-cart time) AND for items reconstructed from the server on
// reload/draft-restore/view-order (falls back to category_id walk).
export const isPackagingCartItem = (item, categoriesFlat) => {
  if (!item) return false;
  if (item.is_container) return true;
  return isPackagingCategoryId(item.category_id, categoriesFlat);
};

export const excludePackagingItems = (items, categoriesFlat) => {
  return (items || []).filter(i => !isPackagingCartItem(i, categoriesFlat));
};

export const getPackagingItems = (items, categoriesFlat) => {
  return (items || []).filter(i => isPackagingCartItem(i, categoriesFlat));
};

export const getPackagingChargesTotal = (items, categoriesFlat) => {
  return getPackagingItems(items, categoriesFlat)
    .reduce((sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0);
};

export const isPackagingMenuRecord = (menuRecord) => {
  if (!menuRecord) return false;
  const categoryId = String(menuRecord.category_id || '').toLowerCase();
  const categoryName = String(menuRecord.category_name || '').toLowerCase();
  return categoryId.includes('packaging') || categoryName.includes('packaging');
};


// Slug-based packaging check — for contexts where category data isn't
// available (e.g. billing, where order items only round-trip with
// id/name/price/slug, not category_id).
export const isPackagingSlug = (slug) => {
  if (!slug) return false;
  const mainPart = slug.includes('__') ? slug.split('__')[0] : slug;
  return mainPart.toLowerCase().split('_').includes('packaging');
};

export const isPackagingOrderItem = (item, inventoryMap = {}) => {
  if (!item) return false;
  if (isPackagingSlug(item.slug)) return true;
  const inv = inventoryMap?.[item.item_id ?? item.id];
  return inv
    ? String(inv.category_id || inv.category_name || '').toLowerCase().includes('packaging')
    : false;
};

// Reconstructs parent_item_key / is_addon on cart items rebuilt from server
// order data (view order, resume takeaway order, reload after item delete),
// which only round-trips frontend_unique_key — not parent_item_key. Without
// this, getGroupedCartItems() can't nest addons under their main item and
// every item renders as a standalone row.
export function relinkCartItemsToParents(items) {
  const mainKeys = items
    .filter(i => {
      const k = i.frontend_unique_key || '';
      return !k.startsWith('addon_') && !k.startsWith('cchild_');
    })
    .map(i => i.frontend_unique_key);

  return items.map(item => {
    const fkey = item.frontend_unique_key || '';
    const prefix = fkey.startsWith('addon_') ? 'addon_' : fkey.startsWith('cchild_') ? 'cchild_' : null;
    if (!prefix) return { ...item, is_addon: false, parent_item_key: null };

    const rest = fkey.slice(prefix.length);
    const parentKey = mainKeys.find(k => rest.startsWith(`${k}_`)) || null;
    return { ...item, is_addon: true, parent_item_key: parentKey };
  });
}

export const isRentalCategoryId = (categoryId, categoriesFlat) => {
  if (!categoryId || !categoriesFlat?.length) return false;
  let currentId = categoryId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categoriesFlat.find(c => c.id === currentId);
    if (!cat) break;
    if ((cat.name || '').toLowerCase().includes('rental')) return true;
    currentId = cat.parentId ?? null;
  }
  return false;
};
export const isRentalMenuItem = (item) => {
  return Array.isArray(item?.recipe) && item.recipe.length > 0 && !!item.recipe[0]?.rental_tier_id;
};


export const buildRentalSlug = (baseSlug, { tierId, durationMinutes, startEpoch, dueEpoch }) =>
  `${baseSlug}||RENTAL|${tierId}|${durationMinutes}|${startEpoch}|${dueEpoch}|-|0`;

export const parseRentalSlug = (slug) => {
  if (!slug || !slug.includes('||RENTAL|')) return null;
  const [, meta] = slug.split('||RENTAL|');
  const [tierId, durationMinutes, startEpoch, dueEpoch, returnedEpoch, lateFee] = meta.split('|');
  return {
    tierId,
    durationMinutes: Number(durationMinutes),
    startEpoch: Number(startEpoch),
    dueEpoch: Number(dueEpoch),
    returnedEpoch: returnedEpoch === '-' ? null : Number(returnedEpoch),
    lateFee: Number(lateFee) || 0,
  };
};

export const getRentalStatus = (slug) => {
  const parsed = parseRentalSlug(slug);
  if (!parsed) return null;
  if (parsed.returnedEpoch) return parsed.returnedEpoch > parsed.dueEpoch ? 'returned_late' : 'returned';
  return Date.now() > parsed.dueEpoch ? 'overdue' : 'on_rent';
};
export const isRentalRealm = (realm) => {
  const configured = (import.meta.env.VITE_RENTAL_REALMS || '')
    .split(',')
    .map(r => r.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes((realm || '').trim().toLowerCase());
};
export const findRentalCategoryId = (categoriesFlat) => {
  if (!categoriesFlat?.length) return null;
  const match = categoriesFlat.find(c => (c.name || '').toLowerCase().includes('rental'));
  return match?.id || null;
};