import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Upload, Download, CloudUpload } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import MenuCategoryTree from './Tree&CategoryManage/MenuCategoryTree';
import MenuImagePreview from './Tree&CategoryManage/MenuImagePreview';
import UniversalAddModal from '../../utils/Modals/UniversalAddModal';
import UniversalEditModal from '../../utils/Modals/UniversalEditModal';
import UniversalBulkUpdateModal from '../../utils/Modals/UniversalBulkUpdateModal';
import { jwtDecode } from "jwt-decode";
import { getMenuConfig } from '../../utils/menuConfigResolver';
import MenuConfigModal from '../../utils/Modals/MenuConfigModal';

const MenuManagement = ({ clientId, token, realm }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [allMenuItemsRaw, setAllMenuItemsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryIds, setInventoryIds] = useState([]);

  const [addonSubcategories, setAddonSubcategories] = useState([]);
  const [allAddonItems, setAllAddonItems] = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);

  // Deduped menu items (one per name) — used by combo component picker
  const [dedupedMenuItems, setDedupedMenuItems] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [dieterySubCategories, setDieterySubCategories] = useState([]);
  const [sidebarCategories, setSidebarCategories] = useState([]);

  const savedCategoryRef = useRef(localStorage.getItem("menu_selected_category"));
  const [dietaryColorMap, setDietaryColorMap] = useState({});
  const [dietaryOptions, setDietaryOptions] = useState([]);
  const [showMenuConfig, setShowMenuConfig] = useState(false);
  const [timeTick, setTimeTick] = useState(Date.now());
  // All IDs and keywords come from menuConfigResolver — nothing hardcoded here
  const menuConfig = React.useMemo(() => {
    if (!clientId) return null;
    return getMenuConfig(clientId);
  }, [clientId]);

  const { addons } = getMenuConfig(clientId);

  // Detect combo category: any category whose name (or any ancestor) contains "combo"
  const isComboCategory = React.useMemo(() => {
    if (!selectedCategoryId || !categoriesFlat?.length) return false;
    let currentId = selectedCategoryId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const cat = categoriesFlat.find(c => c.id === currentId);
      if (!cat) break;
      if ((cat.name || '').toLowerCase().includes('combo')) return true;
      currentId = cat.parentId ?? null;
    }
    return false;
  }, [selectedCategoryId, categoriesFlat]);

  const normalizedRealm = (realm || '').toLowerCase();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [units, setUnits] = useState([]);

  const [newItemImage, setNewItemImage] = useState(null);
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [editItemImage, setEditItemImage] = useState(null);
  const [editItemImageUrl, setEditItemImageUrl] = useState('');
  const [importValidationModal, setImportValidationModal] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '', description: '', category_id: '', unit_price: '',
    discount: '', code: '', unit: '', serving_quantity: "", serving_unit: "", line_item_id: []
  });

  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  const quickCatRef = useRef(null);
  const [zones, setZones] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [zoneConfigId, setZoneConfigId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedDietary, setSelectedDietary] = useState(null);
  const [timingOptions, setTimingOptions] = useState([]);

  const DIETARY_COLORS = [
    'bg-green-500',
    'bg-red-500',
    'bg-yellow-400',
    'bg-orange-500',
    'bg-purple-500',
    'bg-blue-500',
  ];

  useEffect(() => {
    if (!dietaryOptions.length) return;
    const map = {};
    dietaryOptions.forEach((opt, idx) => {
      // Key is normalized (no hyphens/spaces/underscores, lowercase)
      const key = opt.toLowerCase().replace(/[-_\s]/g, '');
      map[key] = DIETARY_COLORS[idx % DIETARY_COLORS.length];
    });
    setDietaryColorMap(map);
  }, [dietaryOptions]);
  useEffect(() => {
    try {
      const decoded = jwtDecode(token);
      setCurrentUserId(decoded?.user_id || null);
    } catch { console.warn("JWT decode failed"); }
  }, [token]);

  const fetchTimings = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
        {
          params: { category_id: "available_timings" },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const raw = res.data?.data || [];

      const parsed = raw.map(v => {
        const match = v.match(/^(.+)\((.+)-(.+)\)$/);
        return {
          name: (match?.[1] ?? v).toLowerCase(),
          start: match?.[2] ?? null,
          end: match?.[3] ?? null,
          raw: v
        };
      });

      setTimingOptions(parsed);
    } catch (err) {
      console.error("Timing fetch error:", err);
      setTimingOptions([]);
    }
  };
  useEffect(() => {
    if (normalizedRealm === 'restaurant') fetchTimings();
  }, [clientId, normalizedRealm]);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(Date.now()); // triggers re-render
    }, 60000); // every 1 minute

    return () => clearInterval(interval);
  }, []);
  // ─── Walk up the categoriesFlat tree and collect all ancestor name segments ─
  const buildPathNames = useCallback((categoryId, flatList) => {
    const pathNames = [];
    let currentId = categoryId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const cat = flatList.find(c => c.id === currentId);
      if (!cat) break;
      pathNames.push((cat.name || '').toLowerCase());
      currentId = cat.parentId || cat.parent_id;
    }
    return pathNames; // nearest-first: [leafName, parentName, grandparentName, ...]
  }, []);
  const fetchZoneConfig = useCallback(async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data || [];

      setSections(data);

      const uniqueZones = [...new Set(data.map(d => d.zone))];
      setZones(uniqueZones);

    } catch (err) {
      console.error("Zone config fetch failed", err);
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchZoneConfig();
  }, [fetchZoneConfig]);

  useEffect(() => {
    if (!selectedZone || !selectedSection) return;

    const found = sections.find(
      s => s.zone === selectedZone && s.section === selectedSection
    );

    if (found) {
      setZoneConfigId(found.id);
    }
  }, [selectedZone, selectedSection, sections]);

  // ─── Get top-level section name dynamically ─────────────────────────
  const getTopLevelSection = useCallback((categoryId) => {
    if (!categoryId || !categoriesFlat.length || !menuConfig) return null;

    const rootNode = categoriesFlat.find(
      c =>
        c.name.toLowerCase() === menuConfig.root.toLowerCase() ||
        c.id.toLowerCase() === menuConfig.root.toLowerCase()
    );

    if (!rootNode) return null;

    let current = categoriesFlat.find(c => c.id === categoryId);

    while (current && current.parentId) {
      if (current.parentId === rootNode.id) {
        // console.log("Current name", current.name)
        return current.name; // THIS is AC / Rooftop / Garden etc
      }
      current = categoriesFlat.find(c => c.id === current.parentId);
    }

    return null;
  }, [categoriesFlat, menuConfig]);



  const getAddonCategoryId = useCallback((itemCategoryId) => {
    if (!itemCategoryId) return null;

    const sectionName = getTopLevelSection(itemCategoryId);
    if (!sectionName) return null;

    // convert to slug format
    const slug = sectionName
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "")
      .replace(/[^a-z0-9]/g, "");
    // console.log("Slug =", slug)
    return `addons_${slug}`;
  }, [getTopLevelSection]);

  const fetchDietaryTypes = useCallback(async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
        {
          params: { category_id: "dietary_type" },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setDietaryOptions(res.data?.data || []);
    } catch (err) {
      console.error("Dietary fetch error:", err);
      setDietaryOptions([]);
    }
  }, [clientId, token]);
  useEffect(() => {
    if (normalizedRealm === 'restaurant') fetchDietaryTypes();
  }, [fetchDietaryTypes, normalizedRealm]);

  const fetchAddonData = useCallback(async (zoneConfigIdParam = zoneConfigId) => {
    if (!menuConfig) return { subcategories: [], items: [] };
    try {
      const [catRes, itemRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${addons}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              inventory_id: menuConfig.menuInventoryId,
              ...(zoneConfigIdParam !== null && zoneConfigIdParam !== undefined
                ? { zone_config_id: zoneConfigIdParam }
                : {})
            }
          }
        )
      ]);

      const addonsCategory = catRes.data.data?.[0];

      if (!addonsCategory) {
        // No addon category created yet
        return { subcategories: [], items: [] };
      }

      const subcats = addonsCategory.subCategories || [];
      const allItems = itemRes.data.data || [];
      const subcategoryIds = new Set(subcats.map(s => s.id));
      const subcategoryNames = new Set(subcats.map(s => (s.name || '').trim().toLowerCase()));

      const matchingAddons = allItems.filter(item => {
        const catVal = (item.category_id || '').trim().toLowerCase();
        return (
          catVal === 'addons' ||
          subcategoryIds.has(item.category_id) ||
          subcategoryNames.has(catVal)
        );
      });

      const seen = new Map();
      matchingAddons.forEach(item => {
        const key = (item.name || '').trim().toLowerCase();
        const itemZid = item.zone_config_id === null || item.zone_config_id === undefined
          ? 0
          : Number(item.zone_config_id);

        const existing = seen.get(key);
        if (!existing) {
          seen.set(key, { ...item, zone_config_id: itemZid });
          return;
        }

        const existingZid = existing.zone_config_id === null || existing.zone_config_id === undefined
          ? 0
          : Number(existing.zone_config_id);

        if (zoneConfigIdParam !== null && zoneConfigIdParam !== undefined) {
          if (itemZid === zoneConfigIdParam && existingZid !== zoneConfigIdParam) {
            seen.set(key, { ...item, zone_config_id: itemZid });
          } else if (itemZid === 0 && existingZid !== zoneConfigIdParam && existingZid !== 0) {
            seen.set(key, { ...item, zone_config_id: itemZid });
          }
        } else if (itemZid === 0 && existingZid !== 0) {
          seen.set(key, { ...item, zone_config_id: itemZid });
        }
      });

      return { subcategories: subcats, items: Array.from(seen.values()) };
    } catch (error) {
      console.warn('Addon fetch failed:', error);
      return { subcategories: [], items: [] };
    }
  }, [clientId, token, menuConfig, zoneConfigId]);



  useEffect(() => {
    fetchAddonData(zoneConfigId).then(({ subcategories, items }) => {
      setAddonSubcategories(subcategories);
      setAllAddonItems(items);
    });
  }, [zoneConfigId, selectedCategoryId, fetchAddonData]);

  useEffect(() => {
    fetchAddonData().then(({ subcategories, items }) => {
      setAddonSubcategories(subcategories);
      setAllAddonItems(items);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (zoneConfigId) fetchData(); }, [zoneConfigId]);

  const buildCategoryPath = (categoryId) => {
    if (!categoryId) return [];
    const path = [];
    let currentId = categoryId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const current = categories.find(cat => cat && cat.id === currentId);
      if (!current) break;
      path.unshift((current.name || '').trim().replace(/\s+/g, '_'));
      currentId = current.parent_id ?? current.parentId ?? null;
    }
    return path;
  };
  // ✅ Add this once near generateSlug
  const toSlugSegment = (str) =>
    (str || '')
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')  // replace ANY non-alphanumeric sequence with single _
      .replace(/^_+|_+$/g, '');         // trim leading/trailing underscores
  // CHANGED: accepts timings as string[] or string, joins with +
  const generateSlug = (itemName, categoryId, timings, flatList = categoriesFlat) => {
    const pathParts = [];
    let currentId = categoryId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const cat = flatList.find(c => c.id === currentId);
      if (!cat) break;
      pathParts.unshift(toSlugSegment(cat.name));
      currentId = cat.parentId ?? cat.parent_id ?? null;
    }

    const itemPart = toSlugSegment(itemName);

    const timingArr = Array.isArray(timings)
      ? timings.filter(Boolean)
      : (timings ? [timings] : []);
    const timingPart = timingArr.length > 0 ? timingArr.join('+') : null;

    const base = [...pathParts, itemPart].filter(Boolean).join('_');
    return timingPart ? `${base}__${timingPart}` : base;
  };

  const openAddModal = () => {
    setNewItem({
      name: '', description: '', category_id: selectedCategoryId || '',
      unit_price: '', discount: '', code: '', unit: '',
      serving_quantity: "", serving_unit: "", line_item_id: [], inventory_id: 'menu', zone_config_id: zoneConfigId || null
    });
    setNewItemImage(null);
    setNewItemImageUrl('');
    setShowAddModal(true);
  };

  // Determine if an item's category is a combo category
  const resolveCategoryIsCombo = (categoryId) => {
    if (!categoryId || !categoriesFlat?.length) return false;
    let currentId = categoryId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const cat = categoriesFlat.find(c => c.id === currentId);
      if (!cat) break;
      if ((cat.name || '').toLowerCase().includes('combo')) return true;
      currentId = cat.parentId ?? null;
    }
    return false;
  };

  const handleItemClick = (item) => {
    // Use allMenuItemsRaw to get ALL zone variants for this item
    const allSiblings = allMenuItemsRaw.filter(m => Number(m.id) === Number(item.id));
    const baseRecord = allSiblings.find(m => m.zone_config_id === 0)
  ?? allSiblings.find(m => m.zone_config_id === null)
  ?? item;

    const zonePrices = {};
    allSiblings
      .filter(m => m.zone_config_id !== 0)
      .forEach(m => { zonePrices[m.zone_config_id] = m.unit_price; });

    const resolvedCategoryId =
      categoriesFlat.find(c => c.id === baseRecord.category_id)?.id
      ?? categoriesFlat.find(
        c => c.name.toLowerCase() === (baseRecord.category_id || '').toLowerCase()
      )?.id
      ?? baseRecord.category_id;

    const slug = baseRecord.slug || '';
    const doubleUnderIdx = slug.lastIndexOf('__');
    // CHANGED: parse as array, not single string
    const timingsFromSlug = doubleUnderIdx !== -1
      ? slug.slice(doubleUnderIdx + 2).toLowerCase().split('+').filter(Boolean)
      : [];

    const dietaryFromSlug = getDietaryFromSlug({ ...baseRecord, category_id: resolvedCategoryId });

    setEditingItem({
      ...baseRecord,
      category_id: resolvedCategoryId,
      zonePrices,
      isCombo: resolveCategoryIsCombo(resolvedCategoryId),
      availability_time: timingsFromSlug,   // now an array
      dietary_type: dietaryFromSlug,
    });
    setShowEditModal(true);
  };

  const flattenCategoryTree = (tree, level = 0, parentId = null) => {
    let flatList = [];
    tree.forEach(category => {
      flatList.push({
        id: category.id, name: category.name, level,
        parentId, hasChildren: !!(category.subCategories?.length),
      });
      if (category.subCategories?.length) {
        flatList = flatList.concat(flattenCategoryTree(category.subCategories, level + 1, category.id));
      }
    });
    return flatList;
  };

  const findCategoryNode = (tree, matcher) => {
    for (const cat of tree) {
      if (cat.id?.toLowerCase() === matcher.toLowerCase() || cat.name?.toLowerCase() === matcher.toLowerCase()) return cat;
      if (cat.children?.length) { const found = findCategoryNode(cat.children, matcher); if (found) return found; }
    }
    return null;
  };

  const getCategoriesAtLevel = (node, targetLevel, currentLevel = 0) => {
    if (!node) return [];
    if (currentLevel === targetLevel) return [node];
    let result = [];
    for (const child of node.children || []) {
      result = result.concat(getCategoriesAtLevel(child, targetLevel, currentLevel + 1));
    }
    return result;
  };

  // ✅ FIXED — uses the same axios pattern as the rest of MenuManagement
  const fetchUnits = useCallback(async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=units`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data?.data || [];
      const unitsNode = Array.isArray(data) ? data.find((d) => d.id === "units") : data;
      const subCats = unitsNode?.subCategories || [];
      const unitList = subCats.map((u) => (typeof u === "string" ? u : u.id));
      setUnits(unitList.length > 0 ? unitList : ["g", "kg", "ml", "litre", "pcs"]);
    } catch (err) {
      console.error("fetchUnits failed:", err);
      setUnits();
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const getCategoryIdByName = (categoryName) => {
    if (!categoryName) return null;
    return categoriesFlat.find(
      c => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
    )?.id || null;
  };

  const fetchInventoryIds = useCallback(async () => {
    if (!menuConfig) return;
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.inventoryCategoryRoot}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInventoryIds(res.data.data[0]?.subCategories ?? []);
    } catch (error) {
      console.error("Error fetching inventory IDs:", error);
    }
  }, [clientId, token, menuConfig]);

  useEffect(() => {
    fetchInventoryIds();
  }, [fetchInventoryIds]);

  const handleAddItem = async () => {
    try {
      let imageId = null;

      if (newItemImage) {
        imageId = await uploadImageToDocumentService(newItemImage);
      }

      const resolvedCat = categoriesFlat.find(
        c => c.id === newItem?.category_id
      );
      if (!resolvedCat) {
        console.error("Add failed: could not resolve category by ID", newItem?.category_id);
        return;
      }
      const finalCategoryId = resolvedCat.id;
      if (!finalCategoryId) return;

      const { dietary_type, ...cleanNewItem } = newItem;

      const slug = generateSlug(
        newItem.name,
        finalCategoryId,
        newItem.availability_time ?? [],
        categoriesFlat
      );

      const created_by =
        currentUserId || localStorage.getItem("user_id") || "system";

      const basePrice = parseFloat(newItem.unit_price) || 0;
      const zonePrices = newItem.zonePrices || {};

      const basePayload = {
        ...cleanNewItem,
        client_id: clientId,
        category_id: finalCategoryId,
        image_id: imageId,
        realm: realm || newItem.realm || "",
        slug,
        unit_price: basePrice,
        discount: parseFloat(newItem.discount) || 0,
        code: newItem.code ? String(newItem.code).trim() : null,
        serving_quantity: newItem.serving_quantity
          ? parseFloat(newItem.serving_quantity)
          : null,
          unit: newItem.unit || null,
        serving_unit: newItem.serving_unit || null,
        availability: parseFloat(newItem.availability) || 0,
        created_by,
        updated_by: created_by,
        inventory_id: newItem.inventory_id,
        zone_config_id: 0,
      };

      // STEP 1: Create base record (zone_config_id = 0)
      const baseRes = await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
        basePayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const sharedId = baseRes.data.data.id;

      // STEP 2: Create records for ALL sections
      if (sections && sections.length > 0) {
        for (const section of sections) {
          const configId = Number(section.id);
          const enteredPrice = zonePrices[configId];
          const finalPrice =
            enteredPrice !== "" && enteredPrice !== null && enteredPrice !== undefined
              ? parseFloat(enteredPrice)
              : basePrice;

          await axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
            {
              ...basePayload,
              id: sharedId,
              unit_price: finalPrice,
              zone_config_id: configId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } else {
        console.warn("No sections found → skipping zone creation");
      }

      await fetchData({ silent: true });

      setShowAddModal(false);
      setNewItem({
        name: "",
        description: "",
        category_id: "",
        unit_price: "",
        discount: "",
        code: "",
        unit: "",
        line_item_id: [],
        zonePrices: {},
      });
      setNewItemImage(null);
      setNewItemImageUrl("");

    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleEditItem = async () => {
    try {
      let imageId = editingItem.image_id;
      if (editItemImage) imageId = await uploadImageToDocumentService(editItemImage);

      const resolvedCat = categoriesFlat.find(c => c.id === editingItem?.category_id);
      if (!resolvedCat) {
        console.error("Edit failed: could not resolve category", editingItem?.category_id);
        return;
      }
      const finalCategoryId = resolvedCat.id;
      if (!finalCategoryId) return;

      // ✅ Build slug with dietary injected — same pattern as import
      const { dietary_type, zonePrices: zp, ...cleanEditingItem } = editingItem;

      const slug = (() => {
        const parts = [];
        let currentId = finalCategoryId;
        const visited = new Set();
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          const cat = categoriesFlat.find(c => c.id === currentId);
          if (!cat) break;
          parts.unshift(toSlugSegment(cat.name));
          currentId = cat.parentId ?? cat.parent_id ?? null;
        }

        const itemPart = toSlugSegment(editingItem.name);
        // Check if category path already contains a dietary segment
        const categoryPathStr = parts.join('_').toLowerCase().replace(/[-_\s]/g, '');
        const dietaryAlreadyInPath = dietaryOptions.some(
          d => categoryPathStr.includes(d.toLowerCase().replace(/[-_\s]/g, ''))
        );

        const normalizedDietary = (dietary_type || '').toLowerCase().replace(/[-_\s]/g, '');

        // Only inject dietary segment if it's NOT already in the category path
        const nameParts = (normalizedDietary && !dietaryAlreadyInPath)
          ? [...parts, normalizedDietary, itemPart]
          : [...parts, itemPart];

        const timingArr = Array.isArray(editingItem.availability_time)
          ? editingItem.availability_time.filter(Boolean)
          : (editingItem.availability_time ? [editingItem.availability_time] : []);
        const timingPart = timingArr.length > 0 ? timingArr.join('+') : null;

        const base = nameParts.filter(Boolean).join('_');

        if ((editingItem.slug || '').endsWith('__unavailable') && timingArr.length === 0) {
          return `${base}__unavailable`;
        }
        return timingPart ? `${base}__${timingPart}` : base;
      })();

      // console.log(`[Edit] slug="${slug}" dietary="${dietary_type}" timing="${editingItem.availability_time}"`);
      const created_by =
      currentUserId || localStorage.getItem("user_id") || "system";
      const basePayload = {
        name: editingItem.name,
        description: editingItem.description || null,
        category_id: finalCategoryId,
        image_id: imageId || null,
        discount: Number(editingItem.discount) || 0,
        code: editingItem.code ? String(editingItem.code).trim() : null,
        unit: editingItem.unit || null,
        serving_quantity: editingItem.serving_quantity ? Number(editingItem.serving_quantity) : null,
        serving_unit: editingItem.serving_unit || null,
        line_item_id: Array.isArray(editingItem.line_item_id) && editingItem.line_item_id.length > 0
          ? editingItem.line_item_id : null,
        realm: editingItem.realm || 'restaurant',
        availability: Number(editingItem.availability) || 0,
        created_by:created_by,
        updated_by: currentUserId,
        slug,  // ✅ uses new slug with dietary + timing
        client_id: clientId,
        inventory_id: editingItem.inventory_id,
        id: Number(editingItem.id),
      };

      // Always update base record (zone_config_id = 0)
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
        { ...basePayload, unit_price: Number(editingItem.unit_price) || 0, zone_config_id: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Always sync ALL zone records — category_id, slug, and other fields
      // must be consistent across every zone variant
      for (const section of sections) {
        const configId = Number(section.id);

        const existingZoneRecord = allMenuItemsRaw.find(
          m => Number(m.id) === Number(editingItem.id) && m.zone_config_id === configId
        );

        // Use entered zone price if provided, else keep existing zone price,
        // else fall back to base unit_price
        const enteredPrice = zp?.[configId];
        const finalPrice =
          enteredPrice !== '' && enteredPrice !== null && enteredPrice !== undefined
            ? parseFloat(enteredPrice)
            : existingZoneRecord
              ? Number(existingZoneRecord.unit_price)
              : Number(editingItem.unit_price) || 0;

              if (existingZoneRecord) {
                await axios.post(
                  `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
                  { ...basePayload, unit_price: finalPrice, zone_config_id: configId },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              } else {
                const enteredPrice = zp?.[configId];
                const hasExplicitPrice =
                  enteredPrice !== '' && enteredPrice !== null && enteredPrice !== undefined;
              
                if (hasExplicitPrice) {
                  await axios.post(
                    `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
                    { ...basePayload, unit_price: parseFloat(enteredPrice), zone_config_id: configId },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                }
              }
      }

      await fetchData({ silent: true });
      setShowEditModal(false);
      setEditingItem(null);
      setEditItemImage(null);
      setEditItemImageUrl('');
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (quickCatRef.current && !quickCatRef.current.contains(event.target)) { }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Uses menuInventoryId and root from config — not hardcoded
  const fetchData = useCallback(async (options = { silent: false }) => {
    const { silent = false } = options;
    if (!clientId || !token || !menuConfig) {
      if (!silent) setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);

      const [catRes, itemRes, allItemsRes] = await Promise.all([
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
              ...(zoneConfigId && { zone_config_id: zoneConfigId })
            }
          }
        ),
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { inventory_id: menuConfig.menuInventoryId }
          }
        )
      ]);

      const fullTree = (catRes.data.data || []).filter(c => c.name?.toLowerCase() !== "all");
      const subcategoryIds = new Set();
      fullTree.forEach(cat => { cat.subCategories?.forEach(sub => subcategoryIds.add(sub.id)); });

      const topLevelCategories = fullTree.filter(cat => !subcategoryIds.has(cat.id));
      const flatCategories = flattenCategoryTree(topLevelCategories);
      const normalizedFlat = flatCategories.map(cat => ({
        id: cat.id, name: (cat.name || '').trim(),
        parentId: cat.parentId ?? cat.parent_id ?? null
      }));
      setCategoriesFlat(normalizedFlat);

      const rawItems = itemRes.data.data;

      const allRawItems = allItemsRes.data.data || [];
      setAllMenuItemsRaw(allRawItems.map(item => ({
        ...item,
        zone_config_id: item.zone_config_id === null || item.zone_config_id === undefined
          ? 0
          : Number(item.zone_config_id)
      })));

      // ✅ FIXED — always prefer zone_config_id === 0 (base record)
      const seenInit = new Map();
      rawItems.forEach(item => {
        const zid = item.zone_config_id === null || item.zone_config_id === undefined
          ? 0
          : Number(item.zone_config_id);

        if (!seenInit.has(item.id)) {
          seenInit.set(item.id, { ...item, zone_config_id: zid });
        } else if (zid === 0) {
          // Base record always wins — overwrite whatever zone record is there
          seenInit.set(item.id, { ...item, zone_config_id: 0 });
        }
        // zone records (zid > 0) never overwrite an existing entry
      });
      const enrichedItems = Array.from(seenInit.values()).map(item => {
        const cat = flatCategories.find(c => c.id === item.category_id);
        return { ...item, category_name: cat?.name || 'Uncategorized' };
      });
      enrichedItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMenuItems(enrichedItems);

      // Build deduped list for combo component picker
      const dedupMap = new Map();
      enrichedItems.forEach(item => {
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

      const buildCategoryTree = (flatCats) => {
        const categoryMap = new Map();
        flatCats.forEach(cat => categoryMap.set(cat.id, { ...cat, children: [] }));
        const tree = [];
        categoryMap.forEach(cat => {
          if (cat.parentId && categoryMap.has(cat.parentId)) { categoryMap.get(cat.parentId).children.push(cat); }
          else { tree.push(cat); }
        });
        categoryMap.forEach(cat => { cat.count = cat.children.length; });
        return tree;
      };

      const categoryTree = buildCategoryTree(flatCategories).map(cat => {
        if (cat.id === menuConfig.root || cat.name.toLowerCase() === menuConfig.root.toLowerCase()) {
          return { ...cat, name: 'All Categories', count: cat.children.length };
        }
        return cat;
      });
      setCategories(categoryTree);

      const rootNode = findCategoryNode(categoryTree, menuConfig.root);
      let quickCategories = [];
      if (rootNode) {
        let level = menuConfig.level;
        while (level >= 0) {
          quickCategories = getCategoriesAtLevel(rootNode, level);
          if (quickCategories.length > 0) break;
          level--;
        }
      }
      setDieterySubCategories(quickCategories);

      if (!savedCategoryRef.current) setSidebarCategories(categoryTree);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId, token, realm, menuConfig, zoneConfigId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getAllDescendantCategoryIds = (categoryId, categoryTree) => {
    if (!categoryId) return [];
    const descendants = [categoryId];
    const findCategory = (cats, id) => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) { const found = findCategory(cat.children, id); if (found) return found; }
      }
      return null;
    };
    const collectDescendants = (cat) => {
      cat.children?.forEach(child => { descendants.push(child.id); collectDescendants(child); });
    };
    const category = findCategory(categoryTree, categoryId);
    if (category) collectDescendants(category);
    return descendants;
  };

  const getFilteredItems = () => {
    if (!menuItems.length) return [];

    const normalize = (str) => (str || '').toLowerCase().replace(/[-_\s]/g, '');
    const q = (searchQuery || '').trim().toLowerCase();

    let items = menuItems;

    // ── 1. Dietary filter — uses getDietaryFromSlug (slug-segment based) ──
    if (selectedDietary) {
      items = items.filter(item => {
        const dietary = getDietaryFromSlug(item);
        return dietary !== null && normalize(dietary) === normalize(selectedDietary);
      });
    }

    // ── 2. Search filter ──
    if (q.length > 0) {
      items = items.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        String(item.code || '').toLowerCase().includes(q)
      );
    }

    // ── 3. Category tree filter ──
    if (selectedCategoryId) {
      const allowedCategoryIds = getAllDescendantCategoryIds(selectedCategoryId, categories);

      items = items.filter(item => {
        const resolvedId =
          categoriesFlat.find(c => c.id === item.category_id)?.id
          ?? categoriesFlat.find(
            c => c.name.toLowerCase() === String(item.category_id || '').toLowerCase()
          )?.id;

        return resolvedId ? allowedCategoryIds.includes(resolvedId) : false;
      });
    }

    // ── 4. Zone filter ──
    if (zoneConfigId !== null) {
      return items.filter(item => item.zone_config_id === zoneConfigId);
    }

    // ── 5. "All zones" dedup — prefer base record (zone_config_id === 0) ──
    // ── 5. "All zones" dedup ──
    const seen = new Map();

    items.forEach(item => {
      const existing = seen.get(item.id);
      if (!existing) {
        seen.set(item.id, item);
      } else {
        // base record (zone_config_id === 0) always wins
        if (item.zone_config_id === 0 || item.zone_config_id === null) {
          seen.set(item.id, item);
        }
      }
    });

    // Sort by id to guarantee same order across all zones
    return Array.from(seen.values()).sort((a, b) => Number(a.id) - Number(b.id));
  };
  const isItemActive = (slug, timingOptions) => {
    if (!slug) return true;

    const doubleUnderIdx = slug.lastIndexOf('__');
    const timingSegment = doubleUnderIdx !== -1
      ? slug.slice(doubleUnderIdx + 2).toLowerCase()
      : null;

    if (timingSegment === 'unavailable') return false;

    if (!timingOptions || timingOptions.length === 0) return true;
    if (!timingSegment || timingSegment === 'allday') return true;

    const timingKeys = timingSegment.split('+').filter(Boolean);
    if (timingKeys.length === 0) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return timingKeys.some(key => {
      const t = timingOptions.find(o => o.name?.toLowerCase() === key);
      if (!t || !t.start || !t.end) return true;
      const [sh, sm] = t.start.split(':').map(Number);
      const [eh, em] = t.end.split(':').map(Number);
      return currentMinutes >= (sh * 60 + sm) && currentMinutes <= (eh * 60 + em);
    });
  };
  const getDietaryFromSlug = (item) => {
    if (!item || !dietaryOptions.length) return null;

    const normalize = (str) => (str || '').toLowerCase().replace(/[-_\s]/g, '');

    const [mainPart = ''] = (item.slug || '').split('__');
    const slugSegments = mainPart.split('_').filter(Boolean);

    // Try matching by joining consecutive segments (to catch "Non_Veg" → "nonveg")
    // Sort dietary options longest-first so "nonveg" is tried before "veg"
    const sortedOptions = [...dietaryOptions].sort(
      (a, b) => normalize(b).length - normalize(a).length
    );

    for (let i = 0; i < slugSegments.length; i++) {
      // Try joining 1, 2, 3 consecutive segments from position i
      for (let j = 1; j <= 3; j++) {
        const joined = normalize(slugSegments.slice(i, i + j).join(''));
        const match = sortedOptions.find(d => normalize(d) === joined);
        if (match) return normalize(match);
      }
    }

    return null;
  };
  const handleEditImageFile = (file) => {
    if (file?.type.startsWith('image/')) { setEditItemImage(file); setEditItemImageUrl(URL.createObjectURL(file)); }
    else { alert('Please upload a valid image file'); }
  };

  const filteredItems = getFilteredItems();
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aActive = isItemActive(a.slug, timingOptions);
    const bActive = isItemActive(b.slug, timingOptions);
    if (bActive !== aActive) return bActive - aActive; // active first
    return Number(a.id) - Number(b.id);               // same order within each group
  });
  const uploadImageToDocumentService = async (imageFile) => {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("description", "Menu item image");
    formData.append("category_id", "menu_images");
    formData.append("realm", "menu");
    formData.append("created_by", localStorage.getItem("user_id") || "system");
    const response = await axios.post(
      `${import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}/${clientId}/document/upload`,
      formData, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
    );
    return response.data.data.id;
  };

  const handleImageFile = (file) => {
    if (file?.type.startsWith('image/')) { setNewItemImage(file); setNewItemImageUrl(URL.createObjectURL(file)); }
    else { alert('Please upload a valid image file'); }
  };

  const handleDeleteItem = async () => {
    try {
      const deletedItemId = deleteTarget.id;

      // ✅ Send zone_config_id: 0 — backend will now delete ALL variants for this id
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
        { id: deletedItemId, zone_config_id: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Clean up line_item_id references in other items
      const itemsToUpdate = menuItems.filter(
        item => Array.isArray(item.line_item_id) && item.line_item_id.includes(deletedItemId)
      );
      if (itemsToUpdate.length > 0) {
        await Promise.all(itemsToUpdate.map(item => axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
          { ...item, line_item_id: item.line_item_id.filter(id => id !== deletedItemId), client_id: clientId },
          { headers: { Authorization: `Bearer ${token}` } }
        )));
      }

      await fetchData({ silent: true });
      const { subcategories, items } = await fetchAddonData();
      setAddonSubcategories(subcategories);
      setAllAddonItems(items);

      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) { alert('No items selected'); return; }
    if (!window.confirm(`Delete ${selectedRows.length} selected items?`)) return;

    try {
      // ✅ Backend now deletes all zone variants — just send id + zone_config_id: 0
      await Promise.all(selectedRows.map(id => axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
        { id, zone_config_id: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      )));

      const itemsToUpdate = menuItems.filter(item =>
        Array.isArray(item.line_item_id) &&
        item.line_item_id.some(addonId => selectedRows.includes(addonId))
      );
      if (itemsToUpdate.length > 0) {
        await Promise.all(itemsToUpdate.map(item => axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
          { ...item, line_item_id: item.line_item_id.filter(id => !selectedRows.includes(id)), client_id: clientId },
          { headers: { Authorization: `Bearer ${token}` } }
        )));
      }

      await fetchData({ silent: true });
      setSelectedRows([]);
      setSelectAllChecked(false);
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };

// Find and replace the entire handleBulkUpdate function:
const handleBulkUpdate = async () => {
  if (selectedRows.length === 0) return;
  try {
    for (const id of selectedRows) {
      const { dietary_type: ed, zonePrices: zp, ...cleanEditedData } = bulkEditData[id] || {};
      const baseItem = menuItems.find(item => item.id === id && (item.zone_config_id === 0 || item.zone_config_id === null));
      if (!baseItem) continue;
      const { dietary_type: od, ...cleanOriginalItem } = baseItem;

      // ✅ Handle slug update when availability changes
      let updatedSlug = cleanOriginalItem.slug;
      if ('availability' in cleanEditedData) {
        const currentSlug = cleanOriginalItem.slug || '';
        const doubleUnderIdx = currentSlug.lastIndexOf('__');
        const existingTimingPart = doubleUnderIdx !== -1
          ? currentSlug.slice(doubleUnderIdx + 2).toLowerCase()
          : null;
        const baseSlug = doubleUnderIdx !== -1
          ? currentSlug.slice(0, doubleUnderIdx)
          : currentSlug;

        if (Number(cleanEditedData.availability) === 0) {
          updatedSlug = `${baseSlug}__unavailable`;
        } else {
          if (existingTimingPart === 'unavailable') {
            updatedSlug = baseSlug;
            }
          }
          cleanEditedData.slug = updatedSlug;
        }

        const mergedItem = { ...cleanOriginalItem, ...cleanEditedData, client_id: clientId };

        // ✅ Update the base record (zone_config_id = 0)
        await axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
          { ...mergedItem, zone_config_id: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // ✅ Always sync slug + availability to ALL zone variants
        const zoneVariants = allMenuItemsRaw.filter(
          m => Number(m.id) === Number(id) && m.zone_config_id !== 0 && m.zone_config_id !== null
        );

        for (const zoneRecord of zoneVariants) {
          const configId = Number(zoneRecord.zone_config_id);

          // Zone price: use explicitly entered price if provided, else keep existing
          const enteredPrice = zp?.[configId];
          const finalPrice =
            enteredPrice !== '' && enteredPrice !== null && enteredPrice !== undefined
              ? parseFloat(enteredPrice)
              : Number(zoneRecord.unit_price);

          await axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
            {
              ...mergedItem,           // carries updated slug + availability
              id: Number(id),
              unit_price: finalPrice,
              zone_config_id: configId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        // ✅ Handle any explicitly entered zone prices for zones that don't have a record yet
        const filledZonePrices = Object.entries(zp || {}).filter(
          ([, price]) => price !== '' && price !== null && price !== undefined
        );

        for (const [configId, price] of filledZonePrices) {
          const alreadyUpdated = zoneVariants.some(
            m => m.zone_config_id === Number(configId)
          );
          if (alreadyUpdated) continue; // already handled above

          // This is a new zone record that doesn't exist yet — create it
          await axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
            {
              ...mergedItem,
              id: Number(id),
              unit_price: parseFloat(price),
              zone_config_id: Number(configId),
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }

    await fetchData({ silent: true });
    setShowBulkModal(false);
    setSelectedRows([]);
    setBulkEditData({});
    setSelectAllChecked(false);
  } catch (error) {
    console.error('Error updating items:', error);
  }
};

  const clean = (v) => (v === "" || v === undefined || v === null || (typeof v === "number" && isNaN(v)) ? null : v);
  const num = (v) => { if (v === "" || v === undefined || v === null || (typeof v === "number" && isNaN(v))) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };
  const sectionLabel = (s) => `${s.zone}-${s.section}`.trim().toLowerCase();

  const handleExportToExcel = () => {
    try {
      const catNameById = (idOrName) => {
        if (!idOrName) return "Uncategorized";
        const found = categoriesFlat.find(
          c => c.id === idOrName || c.name?.toLowerCase() === String(idOrName).toLowerCase()
        );
        return found?.name || idOrName || "Unknown";
      };

      // Group by item id using allMenuItemsRaw so we get every zone variant
      const grouped = {};
      allMenuItemsRaw.forEach(item => {
        const key = item.id; // group by id, not slug (slug can be same across zones)
        if (!grouped[key]) {
          grouped[key] = { baseItem: null, zonePrices: {} };
        }

        const zid = Number(item.zone_config_id);

        if (zid === 0) {
          // ✅ This is the true base record — use it as baseItem AND for Unit_Price
          grouped[key].baseItem = item;
        } else {
          // Zone-specific record — store price keyed by section label
          const sec = sections.find(s => Number(s.id) === zid);
          if (sec) grouped[key].zonePrices[sectionLabel(sec)] = item.unit_price;
        }
      });

      const zoneColumns = sections.map(sectionLabel);

      const exportData = Object.values(grouped)
        .filter(({ baseItem }) => baseItem !== null) // skip orphaned zone records
        .map(({ baseItem: item, zonePrices }) => {
          const dietary = getDietaryFromSlug(item);
          const slugTimingPart = item.slug?.includes('__') ? item.slug.split('__')[1] : '';
          const availabilityTiming = (!slugTimingPart || slugTimingPart === 'allday') ? "" : slugTimingPart;

          const row = {
            Name: item.name ?? "",
            Description: item.description ?? "",
            Category: catNameById(item.category_id) || "Unknown",
            Dietary_Type: dietary || "",
            Availability_Timing: availabilityTiming,
            Image: item.image_id ?? "",
            Unit: item.unit ?? "",
            Unit_Price: Number(item.unit_price) || 0, // ✅ always from zone_config_id=0 record
            Discount: Number(item.discount) || 0,
            Availability: Number(item.availability) || 0,
            Code: item.code != null ? String(item.code) : "",
            Serving_Quantity: item.serving_quantity ?? "",
            Serving_Unit: item.serving_unit ?? "",
            Line_Item_IDs: Array.isArray(item.line_item_id) ? item.line_item_id.join(", ") : "",
          };

          zoneColumns.forEach(col => {
            row[`Price_${col}`] = zonePrices[col] ?? "";
          });

          return row;
        });

      const headers = [
        "Name", "Description", "Category", "Dietary_Type", "Availability_Timing",
        "Image", "Unit", "Unit_Price", "Discount", "Availability", "Code",
        "Serving_Quantity", "Serving_Unit", "Line_Item_IDs",
        ...zoneColumns.map(c => `Price_${c}`)
      ];

      const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "MenuItems");
      XLSX.writeFile(workbook, `menu_items_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };


  // ─────────────────────────────────────────────────────────────────
  // CHANGE 3 of 3:  handleImportFromExcel  — full rewrite
  // ─────────────────────────────────────────────────────────────────
  const runImport = async ({
    parsedData, priceColumns, allMenuItems,
    created_by, updated_by,
    currentCategoriesFlat, currentSelectedCategoryId, currentSections,
  }) => {
    for (const row of parsedData) {
      if (!row.Name?.trim()) continue;  
      const existingRecords = allMenuItems.filter(
        item => item.name?.trim().toLowerCase() === row.Name?.trim().toLowerCase()
      ); 
      const categoryId =
        currentCategoriesFlat.find(
          c => c.name.trim().toLowerCase() === (row.Category || '').trim().toLowerCase()
        )?.id || currentSelectedCategoryId;

      const categoryName = currentCategoriesFlat.find(c => c.id === categoryId)?.name || null;
      if (!categoryName) {
        console.warn(`[Import] Skipping "${row.Name}" — category not found: "${row.Category}"`);
        continue;
      }

      const rawDietary = (row.Dietary_Type || "").trim().toLowerCase().replace(/[-_\s]/g, '');
      const matchedDietaryOption = dietaryOptions.find(
        d => d.toLowerCase().replace(/[-_\s]/g, '') === rawDietary
      );
      const importedDietary = matchedDietaryOption
        ? matchedDietaryOption.toLowerCase().replace(/[-_\s]/g, '')
        : rawDietary;

      const rawTiming = (row.Availability_Timing || "").trim().toLowerCase();
      const timingPart = rawTiming || null;

      const slug = (() => {
        const parts = [];
        let currentId = categoryId;
        const visited = new Set();
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          const cat = currentCategoriesFlat.find(c => c.id === currentId);
          if (!cat) break;
          parts.unshift(toSlugSegment(cat.name));
          currentId = cat.parentId ?? cat.parent_id ?? null;
        }
        const itemPart = toSlugSegment(row.Name);
        const categoryPathStr = parts.join('_').toLowerCase().replace(/[-_\s]/g, '');
        const dietaryAlreadyInPath = dietaryOptions.some(
          d => categoryPathStr.includes(d.toLowerCase().replace(/[-_\s]/g, ''))
        );
        const nameParts =
          importedDietary && !dietaryAlreadyInPath
            ? [...parts, importedDietary, itemPart]
            : [...parts, itemPart];
        const base = nameParts.filter(Boolean).join('_');
        return timingPart ? `${base}__${timingPart}` : base;
      })();

      const basePayload = {
        client_id: clientId,
        inventory_id: menuConfig.menuInventoryId,
        name: row.Name?.trim(),
        description: row.Description || null,
        category_id: categoryId,
        realm: realm || null,
        code: row.Code ? String(row.Code) : null,
        serving_quantity: row.Serving_Quantity || null,
        serving_unit: row.Serving_Unit || null,
        unit: row.Unit || null,
        ...(row.Image && String(row.Image).trim() !== "" && { image_id: String(row.Image).trim() }),
        discount: Number(row.Discount) || 0,
        availability: Number(row.Availability) || 0,
        slug,
        line_item_id: row.Line_Item_IDs
          ? row.Line_Item_IDs.split(",").map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v))
          : null,
        created_by,
        updated_by,
      };

      const baseUnitPrice = Number(row.Unit_Price) || 0;
      let sharedId;
      const existingBase = existingRecords.find(item => item.zone_config_id === 0);

      if (existingBase) {
        sharedId = existingBase.id;
  
        await axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
          { id: sharedId, zone_config_id: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
  
        // ✅ Recreate base record fresh
        const res = await axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
          { ...basePayload, id: sharedId, unit_price: baseUnitPrice, zone_config_id: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        sharedId = res.data.data.id;
  
      } else {
        // ✅ No existing record — create fresh
        const res = await axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
          { ...basePayload, unit_price: baseUnitPrice, zone_config_id: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        sharedId = res.data.data.id;
      }
  
      // ✅ Recreate all zone records fresh — no conflicts possible
      for (const section of currentSections) {
        const configId = Number(section.id);
        if (!configId || configId === 0) continue;
  
        const priceCol = priceColumns.find(
          col => col.replace("Price_", "").trim().toLowerCase() === sectionLabel(section)
        );
        const priceVal = priceCol ? row[priceCol] : undefined;
        const finalPrice =
          priceVal !== "" && priceVal !== null && priceVal !== undefined
            ? Number(priceVal)
            : baseUnitPrice;
  
        await axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
          { ...basePayload, id: sharedId, unit_price: finalPrice, zone_config_id: configId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    }
  
    await fetchData({ silent: false });
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  };
  const handleImportFromExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let created_by = "system", updated_by = "system";
    try {
      const decoded = jwtDecode(token);
      created_by = decoded?.user_id || created_by;
      updated_by = created_by;
    } catch { }

    const currentCategoriesFlat = [...categoriesFlat];
    const currentSelectedCategoryId = selectedCategoryId;
    const currentSections = [...sections];

    let allMenuItems = [];
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { inventory_id: menuConfig.menuInventoryId }
        }
      );
      allMenuItems = res.data.data || [];
    } catch (err) {
      console.error("Failed to fetch full menu:", err);
      return;
    }

    allMenuItems = allMenuItems.map(item => ({
      ...item,
      zone_config_id:
        item.zone_config_id === null || item.zone_config_id === undefined
          ? 0 : Number(item.zone_config_id),
    }));

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: "binary" });
        const parsedData = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]],
          { defval: "" }
        );
        if (!parsedData.length) return;

        const allColumns = Object.keys(parsedData[0]);
        const priceColumns = allColumns.filter(col => col.startsWith("Price_"));
        const normalize = (str) => (str || '').toLowerCase().replace(/[-_\s]/g, '');

        const invalidDietarySet = new Set();
        const invalidTimingSet = new Set();
        const invalidCategorySet = new Set();
        for (const row of parsedData) {
          if (!row.Name?.trim()) continue;
          const rawCategory = (row.Category || "").trim();
          if (rawCategory) {
            const matched = currentCategoriesFlat.find(
              c => c.name.trim().toLowerCase() === rawCategory.toLowerCase()
            );
            if (!matched) invalidCategorySet.add(rawCategory);
          }
          const rawDietary = (row.Dietary_Type || "").trim();
          if (rawDietary) {
            const matched = dietaryOptions.find(d => normalize(d) === normalize(rawDietary));
            if (!matched) invalidDietarySet.add(rawDietary);
          }

          const rawTiming = (row.Availability_Timing || "").trim();
          if (rawTiming && rawTiming.toLowerCase() !== 'allday') {
            const timingKeys = rawTiming.toLowerCase().split('+').map(t => t.trim()).filter(Boolean);
            for (const key of timingKeys) {
              const matched = timingOptions.find(o => o.name?.toLowerCase() === key);
              if (!matched) invalidTimingSet.add(key);
            }
          }
        }

        if (invalidDietarySet.size > 0 || invalidTimingSet.size > 0) {
          setImportValidationModal({
            invalidCategory: [...invalidCategorySet],
            invalidDietary: [...invalidDietarySet],
            invalidTiming: [...invalidTimingSet],
            parsedData,
            priceColumns,
            allMenuItems,
            created_by,
            updated_by,
            currentCategoriesFlat,
            currentSelectedCategoryId,
            currentSections,
            fileEvent: e,
          });
          return;
        }

        await runImport({
          parsedData, priceColumns, allMenuItems,
          created_by, updated_by,
          currentCategoriesFlat, currentSelectedCategoryId, currentSections,
        });
        e.target.value = "";
      } catch (err) {
        console.error("Import Error:", err);
        setImportError(err.message || "Something went wrong during import.");
        setTimeout(() => setImportError(null), 4000);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const toggleSelectAll = () => {
    if (!selectAllChecked) { setSelectedRows(filteredItems.map(item => item.id)); setSelectAllChecked(true); }
    else { setSelectedRows([]); setSelectAllChecked(false); }
  };
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return; 
    if (!categories?.length) return;
    const saved = savedCategoryRef.current;
    if (!saved) return;

    const findNode = (nodes, id) => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children?.length) { const found = findNode(node.children, id); if (found) return found; }
      }
      return null;
    };

    // Find the saved node
    const node = findNode(categories, saved);
    if (!node) return;

    // Find its parent (first level under root)
    const findParentAtLevel = (nodes, targetId, parentNode = null, level = 0) => {
      for (const n of nodes) {
        if (n.id === targetId) {
          // Return the parent at level 1 (AC/Non-AC level)
          return level === 2 ? parentNode : n;
        }
        if (n.children?.length) {
          const found = findParentAtLevel(n.children, targetId, n, level + 1);
          if (found) return found;
        }
      }
      return null;
    };
    const parentCategory = findParentAtLevel(categories, saved);
    if (parentCategory) {
      setSelectedCategoryId(parentCategory.id);
      localStorage.setItem("menu_selected_category", parentCategory.id);
      setSidebarCategories([parentCategory]);hasRestoredRef.current = true;
    }
  }, [categories]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      const t = setTimeout(() => searchInputRef.current.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getSelectedCategoryNameById = () => {
    if (!selectedCategoryId) return 'All Categories';
    return categoriesFlat.find(c => c.id === selectedCategoryId)?.name || 'All Categories';
  };

  useEffect(() => {
    if (!selectedCategoryId) setSidebarCategories(categories);
  }, [selectedCategoryId, categories]);

  return (
    <div className="h-[90vh] bg-bg-primary overflow-hidden">
      <div className="mx-auto p-2">
        <div className="lg:grid lg:grid-cols-4 gap-2">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-2">
              <MenuCategoryTree
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(id) => {
                  setSelectedCategoryId(id);
                  localStorage.setItem("menu_selected_category", id);
                }}
                clientId={clientId}
                token={token}
                onCategoriesUpdate={() => fetchData({ silent: true })}
                menuConfig={menuConfig}
              />
            </div>
          </div>

          <div className="lg:col-span-3 border-default border-border-default p-3 rounded-lg h-[88.5vh] flex flex-col">
            <div className="mb-3 flex flex-wrap gap-2">
              <button

                onClick={() => setZoneConfigId(null)}
                className={`px-3 py-1 rounded-full text-sm border transition
    ${zoneConfigId === null
                    ? "bg-black text-white border-black"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                All
              </button>

              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setZoneConfigId(s.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition
      ${zoneConfigId === s.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  {s.zone} - {s.section}
                </button>
              ))}
            </div>

            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
              <div className="flex-shrink-0 flex items-center gap-2">
                <h2 className="text-lg lg:text-2xl font-semibold text-text-primary leading-tight">
                  {getSelectedCategoryNameById() || 'All Categories'}
                  <span className="text-sm ml-2 text-text-secondary">({filteredItems.length})</span>
                </h2>
                {isComboCategory && (
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full border border-violet-200">
                    Combo
                  </span>
                )}
              </div>
              {/* {isRestaurant && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {dietaryOptions.map(type => {
                    const key = type.toLowerCase().replace(/[-_\s]/g, '');
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDietary(key)}
                        className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${selectedDietary === key ? "bg-black text-white" : "bg-gray-100"
                          }`}
                      >
                        {dietaryColorMap[key] && (
                          <span className={`inline-block w-2 h-2 rounded-full ${dietaryColorMap[key]}`} />
                        )}
                        {type}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSelectedDietary(null)}
                    className="px-3 py-1 rounded-full text-sm bg-gray-200"
                  >
                    All
                  </button>
                </div>
              )} */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:flex-nowrap lg:gap-2">
                <div className="relative w-full sm:w-56">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items…"
                    className="w-full h-9 pl-10 pr-3 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-action-primary/30"
                  />
                </div>
                <div className="flex gap-2 flex-wrap justify-end">

                  {normalizedRealm === 'restaurant' &&
                    <button onClick={() => setShowMenuConfig(true)} className="h-9 px-3 flex items-center gap-2 rounded-lg bg-action-success text-white text-sm font-semibold shadow-sm hover:opacity-90">
                      <span>Config</span>
                    </button>}
                  <button onClick={openAddModal} className="h-9 px-3 flex items-center gap-2 rounded-lg bg-action-primary text-white text-sm font-semibold shadow-sm hover:opacity-90">
                    <Plus size={14} /><span>{isComboCategory ? 'Add Combo' : 'Add Item'}</span>
                  </button>
                  <button onClick={() => setShowBulkModal(true)} className="h-9 px-3 flex items-center gap-2 rounded-lg bg-bg-tertiary border border-border-default text-sm font-semibold hover:border-action-primary hover:bg-bg-secondary">
                    <Edit size={14} /><span className="hidden sm:inline">Bulk Update</span>
                  </button>
                  <div className="relative group">
                    <button className="h-9 px-3 flex items-center gap-2 rounded-lg bg-bg-tertiary border border-border-default text-sm font-semibold hover:border-action-primary hover:bg-bg-secondary">
                      <CloudUpload size={14} />
                    </button>
                    <div className="absolute right-0 mt-1 w-36 bg-bg-primary border border-border-default rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <button onClick={() => document.getElementById('excelInput').click()} className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-bg-secondary">
                        <Upload size={14} />Import
                      </button>
                      <button onClick={handleExportToExcel} className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-bg-secondary">
                        <Download size={14} />Export
                      </button>
                    </div>
                  </div>
                  <input type="file" id="excelInput" accept=".xlsx, .xls" className="hidden" onChange={handleImportFromExcel} />
                </div>
              </div>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {sortedItems.map((item) => {
                  const discountPercent = item.discount && Number(item.discount) > 0
                    ? Number(item.discount).toFixed(0) : null;
                  const dietary = getDietaryFromSlug(item);
                  const dietaryColor = dietary ? (dietaryColorMap[dietary] || 'bg-transparent') : 'bg-transparent';
                  const active = isItemActive(item.slug, timingOptions);
                  return (
                    <div key={item.id}
                      className={`relative flex gap-2 items-center bg-bg-primary border rounded-xl p-1 shadow-sm transition group overflow-hidden
                      ${active ? "" : "opacity-40 grayscale"}
                    `}                    >


                      <div className={`w-[3px] h-full rounded-l-xl ${dietaryColor}`} /> <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 pointer-events-none z-10 group-hover:animate-overlayFade" />

                      {item.line_item_id?.length > 0 && (
                        <div className="absolute bottom-2 right-2 bg-orange-500 text-white text-[7px] p-1 rounded-md z-10 shadow-md flex items-center gap-1">
                          <Plus size={10} /><span>{item.line_item_id.length} add-ons</span>
                        </div>
                      )}
                      <div className="relative w-10 h-12 md:h-16 md:w-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {discountPercent && (
                          <div className="absolute top-1 left-1 bg-action-danger text-white text-[7px] md:text-[10px] px-1 rounded z-10">
                            {discountPercent}% OFF
                          </div>
                        )}
                        <MenuImagePreview clientId={clientId} imageId={item.image_id} token={token} alt={item.name}
                          baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL} className="w-full h-full object-cover"
                          urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`} />
                      </div>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleItemClick(item)}>
                        <h3 className="text-[10px] md:text-[16px] font-semibold text-text-primary">{item.name}</h3>
                        {/* {!active && (
                          <p className="text-[10px] text-red-500">
                            Not available now
                          </p>
                        )} */}
                        {item.description && <p className="text-[8px] md:text-[13px] text-text-secondary line-clamp-1">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {discountPercent ? (
                            <>
                              <span className="text-sm font-bold text-action-primary">
                                ₹{(item.unit_price * (1 - Number(item.discount) / 100)).toFixed(0)}
                              </span>
                              <span className="text-xs line-through text-text-secondary">₹{item.unit_price}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-action-primary">₹{item.unit_price}</span>
                          )}
                        </div>
                      </div>

                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                        <button className="bg-action-primary text-white p-1 rounded-full hover:scale-110"
                          onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}>
                          <Edit size={10} />
                        </button>
                        <button className="bg-action-danger text-white p-1 rounded-full hover:scale-110"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); setShowDeleteModal(true); }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
          <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary">
            <h3 className="text-xl font-semibold mb-4 text-text-primary">Confirm Delete</h3>
            <p className="mb-6 text-text-secondary">
              Are you sure you want to delete <strong className="text-text-primary">{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors">Cancel</button>
              <button onClick={handleDeleteItem} className="flex-1 px-4 py-2 rounded-lg bg-action-danger text-text-white hover:opacity-90 transition-opacity">Delete</button>
            </div>
          </div>
        </div>
      )}
      {importValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg-primary rounded-2xl w-full max-w-md shadow-xl border border-border-default overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-default bg-yellow-50">
              <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-yellow-900">Invalid values detected</h3>
                <p className="text-xs text-yellow-700 mt-0.5">Some values in your file don't match existing categories</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 max-h-72 overflow-y-auto">

              {/* ── CATEGORY ERRORS ── */}
              {importValidationModal.invalidCategory?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Category — not found
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {importValidationModal.invalidCategory.map(v => (
                      <span key={v} className="px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-800 font-medium">
                        {v}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    These categories don't exist in your menu tree. Create them first in the sidebar for a smooth import.
                    {/* Go to the{" "}
                    <strong className="text-text-primary">category sidebar</strong> and create them first, then re-import.
                    Items with missing categories will be <strong className="text-text-primary">skipped</strong> during import. */}
                  </p>
                </div>
              )}

              {/* ── DIETARY ERRORS ── */}
              {importValidationModal.invalidDietary?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Dietary type — not found
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {importValidationModal.invalidDietary.map(v => (
                      <span key={v} className="px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-800 font-medium">
                        {v}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Valid options:{" "}
                    {dietaryOptions.length > 0
                      ? dietaryOptions.map(d => (
                        <span key={d} className="inline-block mx-0.5 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">{d}</span>
                      ))
                      : <span className="italic">none configured</span>}
                  </p>
                </div>
              )}

              {/* ── TIMING ERRORS ── */}
              {importValidationModal.invalidTiming?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Availability timing — not found
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {importValidationModal.invalidTiming.map(v => (
                      <span key={v} className="px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-800 font-medium">
                        {v}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Valid options:{" "}
                    {timingOptions.length > 0
                      ? timingOptions.map(t => (
                        <span key={t.name} className="inline-block mx-0.5 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">{t.name}</span>
                      ))
                      : <span className="italic">none configured</span>}
                  </p>
                </div>
              )}

              {/* ── FOOTER NOTE ── */}
              <div className="pt-1 border-t border-border-default">
                <p className="text-xs text-text-secondary leading-relaxed">
                  {importValidationModal.invalidCategory?.length > 0
                    ? <>Items with <strong className="text-text-primary">missing categories will always be skipped</strong> even if you proceed. Fix those categories first for a clean import.</>
                    : <>Clicking <strong className="text-text-primary">Import anyway</strong> will use the raw values as-is. Go to <strong className="text-text-primary">Config</strong> to create missing categories first.</>
                  }
                </p>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-2 px-5 py-4 border-t border-border-default">
              <button
                onClick={() => {
                  if (importValidationModal.fileEvent) importValidationModal.fileEvent.target.value = "";
                  setImportValidationModal(null);
                }}
                className="flex-1 h-9 rounded-lg border border-border-default text-sm font-semibold bg-bg-tertiary hover:bg-bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const ctx = importValidationModal;
                  setImportValidationModal(null);
                  try {
                    await runImport({
                      parsedData: ctx.parsedData,
                      priceColumns: ctx.priceColumns,
                      allMenuItems: ctx.allMenuItems,
                      created_by: ctx.created_by,
                      updated_by: ctx.updated_by,
                      currentCategoriesFlat: ctx.currentCategoriesFlat,
                      currentSelectedCategoryId: ctx.currentSelectedCategoryId,
                      currentSections: ctx.currentSections,
                    });
                  } catch (err) {
                    console.error("Import Error:", err);
                    setImportError(err.message || "Something went wrong during import.");
                    setTimeout(() => setImportError(null), 4000);
                  }
                  if (ctx.fileEvent) ctx.fileEvent.target.value = "";
                }}
                className="flex-1 h-9 rounded-lg border border-yellow-400 text-sm font-semibold bg-yellow-50 text-yellow-900 hover:bg-yellow-100 transition-colors"
              >
                Import anyway
              </button>
            </div>

          </div>
        </div>
      )}
      {importSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-600 text-white shadow-lg animate-slideUp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-sm font-semibold">Import completed successfully</span>
          <button
            onClick={() => setImportSuccess(false)}
            className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      {importError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600 text-white shadow-lg animate-slideUp max-w-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Import failed</span>
            <span className="text-xs opacity-80 mt-0.5 leading-snug">{importError}</span>
          </div>
          <button
            onClick={() => setImportError(null)}
            className="ml-1 opacity-70 hover:opacity-100 transition-opacity shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      <UniversalAddModal clientId={clientId}
        token={token}
        showModal={showAddModal} setShowModal={setShowAddModal} modalType="menu"
        newItem={newItem} setNewItem={setNewItem} selectedCategoryId={selectedCategoryId}
        categories={categories} addonSubcategories={addonSubcategories} allAddonItems={allAddonItems}
        newItemImage={newItemImage} setNewItemImage={setNewItemImage}
        newItemImageUrl={newItemImageUrl} setNewItemImageUrl={setNewItemImageUrl}
        handleAddItem={handleAddItem} getCategoryIdByName={getCategoryIdByName}
        inventoryIds={inventoryIds} getAddonCategoryId={getAddonCategoryId}
        fetchAddonData={fetchAddonData} setAddonSubcategories={setAddonSubcategories} setAllAddonItems={setAllAddonItems}
        units={units} normalizedRealm={normalizedRealm}
        isComboCategory={isComboCategory}
        dedupedMenuItems={dedupedMenuItems}
        categoriesFlat={categoriesFlat}
      />

      <UniversalEditModal
        showModal={showEditModal} setShowModal={setShowEditModal} modalType="menu"
        editingItem={editingItem} setEditingItem={setEditingItem}
        categories={categories} addonSubcategories={addonSubcategories} allAddonItems={allAddonItems}
        editItemImage={editItemImage} setEditItemImage={setEditItemImage}
        editItemImageUrl={editItemImageUrl} setEditItemImageUrl={setEditItemImageUrl}
        handleEditItem={handleEditItem} clientId={clientId} token={token}
        inventoryIds={inventoryIds} getAddonCategoryId={getAddonCategoryId}
        fetchAddonData={fetchAddonData} setAddonSubcategories={setAddonSubcategories} setAllAddonItems={setAllAddonItems}
        units={units} normalizedRealm={normalizedRealm}
        dedupedMenuItems={dedupedMenuItems}
        categoriesFlat={categoriesFlat}
      />

      <UniversalBulkUpdateModal clientId={clientId}
        token={token} menuItems={allMenuItemsRaw}
        showModal={showBulkModal} setShowModal={setShowBulkModal} modalType="menu"
        filteredItems={filteredItems} selectedRows={selectedRows} setSelectedRows={setSelectedRows}
        selectAllChecked={selectAllChecked} setSelectAllChecked={setSelectAllChecked}
        bulkEditData={bulkEditData} setBulkEditData={setBulkEditData}
        handleBulkUpdate={handleBulkUpdate} handleBulkDelete={handleBulkDelete}
        addonSubcategories={addonSubcategories} allAddonItems={allAddonItems}
      />
      <MenuConfigModal
        show={showMenuConfig}
        onClose={() => setShowMenuConfig(false)}
        clientId={clientId}
        token={token}
      />
    </div>
  );
};

export default MenuManagement;
