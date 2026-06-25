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
