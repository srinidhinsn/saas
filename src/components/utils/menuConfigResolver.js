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


  return {
    root,
    level,
    menuInventoryId,
    inventoryCategoryRoot,
  };
}