export function getMenuConfig(clientId) {
  const normalizedClient = String(clientId)
    .trim()
    .toLowerCase()
    .split("/")
    .pop()
    .replace(/[^a-z0-9]/g, "_");

  const prefix = normalizedClient.toUpperCase();

  // ─── Menu hierarchy ─────────────────────────────────────────────────────────
  // .env: VITE_MENU_DEFAULT_ROOT=dietery
  //   OR  VITE_{PREFIX}_MENU_DEFAULT_ROOT=dietery
  const root =
    import.meta.env[`VITE_${prefix}_MENU_DEFAULT_ROOT`] ??
    import.meta.env.VITE_MENU_DEFAULT_ROOT ??
    "dietery";

  // .env: VITE_MENU_HIERARCHY_LEVEL=2
  //   OR  VITE_{PREFIX}_MENU_HIERARCHY_LEVEL=2
  const level =
    Number(import.meta.env[`VITE_${prefix}_MENU_HIERARCHY_LEVEL`]) ||
    Number(import.meta.env.VITE_MENU_HIERARCHY_LEVEL) ||
    2;

  // ─── Inventory read ID (/menu/read?inventory_id=...) ────────────────────────
  // .env: VITE_MENU_INVENTORY_ID=menu
  //   OR  VITE_{PREFIX}_MENU_INVENTORY_ID=menu
  const menuInventoryId =
    import.meta.env[`VITE_${prefix}_MENU_INVENTORY_ID`] ??
    import.meta.env.VITE_MENU_INVENTORY_ID ??
    "menu";

  // ─── Category root for inventory sidebar ────────────────────────────────────
  // .env: VITE_INVENTORY_CATEGORY_ROOT=inventory
  //   OR  VITE_{PREFIX}_INVENTORY_CATEGORY_ROOT=inventory
  const inventoryCategoryRoot =
    import.meta.env[`VITE_${prefix}_INVENTORY_CATEGORY_ROOT`] ??
    import.meta.env.VITE_INVENTORY_CATEGORY_ROOT ??
    "inventory";

  // ─── Addon category IDs ──────────────────────────────────────────────────────
  // .env: VITE_ADDON_CATEGORY_AC=addons_ac
  //   OR  VITE_{PREFIX}_ADDON_CATEGORY_AC=addons_ac
  const addonCategoryAC =
    import.meta.env[`VITE_${prefix}_ADDON_CATEGORY_AC`] ??
    import.meta.env.VITE_ADDON_CATEGORY_AC ??
    "addons_ac";

  // .env: VITE_ADDON_CATEGORY_NON_AC=addons_non_ac
  //   OR  VITE_{PREFIX}_ADDON_CATEGORY_NON_AC=addons_non_ac
  const addonCategoryNonAC =
    import.meta.env[`VITE_${prefix}_ADDON_CATEGORY_NON_AC`] ??
    import.meta.env.VITE_ADDON_CATEGORY_NON_AC ??
    "addons_non_ac";

  // ─── Non-AC detection keywords ───────────────────────────────────────────────
  // ⚠️  MUST be checked BEFORE AC keywords — "non_ac" contains "ac" so order matters.
  // .env: VITE_ADDON_NON_AC_KEYWORDS=non_ac,non ac,non-ac
  //   OR  VITE_{PREFIX}_ADDON_NON_AC_KEYWORDS=non_ac,non ac,non-ac
  const addonNonACKeywordsRaw =
    import.meta.env[`VITE_${prefix}_ADDON_NON_AC_KEYWORDS`] ??
    import.meta.env.VITE_ADDON_NON_AC_KEYWORDS ??
    "non_ac,non ac,non-ac";

  // ─── AC detection keywords (only checked when Non-AC didn't match) ───────────
  // .env: VITE_ADDON_AC_KEYWORDS=ac
  //   OR  VITE_{PREFIX}_ADDON_AC_KEYWORDS=ac
  const addonACKeywordsRaw =
    import.meta.env[`VITE_${prefix}_ADDON_AC_KEYWORDS`] ??
    import.meta.env.VITE_ADDON_AC_KEYWORDS ??
    "ac";

  const addonNonACKeywords = addonNonACKeywordsRaw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const addonACKeywords = addonACKeywordsRaw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  return {
    root,
    level,
    menuInventoryId,
    inventoryCategoryRoot,
    addonCategoryAC,
    addonCategoryNonAC,
    addonNonACKeywords, // checked first — before AC
    addonACKeywords,
  };
}