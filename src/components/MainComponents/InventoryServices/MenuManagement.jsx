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
  const [loading, setLoading] = useState(true);
  const [inventoryIds, setInventoryIds] = useState([]);

  const [addonSubcategories, setAddonSubcategories] = useState([]);
  const [allAddonItems, setAllAddonItems] = useState([]);

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

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [units, setUnits] = useState([]);

  const [newItemImage, setNewItemImage] = useState(null);
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [editItemImage, setEditItemImage] = useState(null);
  const [editItemImageUrl, setEditItemImageUrl] = useState('');

  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '', description: '', category_id: '', unit_price: '',
    discount: '', code: '', unit: '', serving_quantity: "", serving_unit: "", line_item_id: []
  });

  const [categoriesFlat, setCategoriesFlat] = useState([]);

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
  useEffect(() => {
    try {
      const decoded = jwtDecode(token);
      setCurrentUserId(decoded?.user_id || null);
    } catch { console.warn("JWT decode failed"); }
  }, [token]);

  const dietaryStyles = {
    veg: { label: "Veg", color: "bg-green-500" },
    nonveg: { label: "Non Veg", color: "bg-red-500" },
    egg: { label: "Egg", color: "bg-yellow-400" },
    chinese: { label: "Chinese", color: "bg-orange-500" }
  };
  const dietaryBorderStyles = {
    veg: "border-green-500",
    nonveg: "border-red-500",
    egg: "border-yellow-400",
    chinese: "border-orange-500"
  };
  const fetchTimings = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
        {
          params: { category_id: "available_timings" },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setTimingOptions(res.data?.data || []);
    } catch (err) {
      console.error("Timing fetch error:", err);
    }
  };
  useEffect(() => {
    fetchTimings();
  }, [clientId]);
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
  const filteredSections = sections.filter(
    s => s.zone === selectedZone
  );

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
        console.log("Current name", current.name)
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
    console.log("Slug =", slug)
    return `addons_${slug}`;
  }, [getTopLevelSection]);

  const fetchDietaryTypes = useCallback(async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
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
    fetchDietaryTypes();
  }, [fetchDietaryTypes]);

  const fetchAddonData = useCallback(async (addonCategoryId) => {
    if (!menuConfig || !addonCategoryId) {
      return { subcategories: [], items: [] };
    }

    try {
      const [catRes, itemRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${addonCategoryId}`,
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

      const filteredAddons = allItems.filter(
        item =>
          item.category_id === addonCategoryId ||
          subcategoryIds.has(item.category_id)
      );

      return { subcategories: subcats, items: filteredAddons };
    } catch (error) {
      console.warn(`Addon category not found: ${addonCategoryId}`);
      return { subcategories: [], items: [] };
    }
  }, [clientId, token, menuConfig, zoneConfigId]);

  useEffect(() => {
    if (zoneConfigId) {
      fetchData();
    }
  }, [zoneConfigId]);

  useEffect(() => {
    if (!selectedCategoryId) return;

    const addonCatId = getAddonCategoryId(selectedCategoryId);

    if (!addonCatId) {
      setAddonSubcategories([]);
      setAllAddonItems([]);
      return;
    }

    fetchAddonData(addonCatId).then(({ subcategories, items }) => {
      setAddonSubcategories(subcategories);
      setAllAddonItems(items);
    });
  }, [selectedCategoryId, getAddonCategoryId, fetchAddonData]);


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

  const generateSlug = (itemName, dietaryType, timing) => {
    const itemPart = itemName?.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, '') || "";
    // Always encode defaults so slug always has 3 parts: name_dietary_timing
    const dietaryPart = (dietaryType || "veg").charAt(0).toUpperCase() + (dietaryType || "veg").slice(1);
    const timingPart = (timing || "allday").charAt(0).toUpperCase() + (timing || "allday").slice(1);
    return [itemPart, dietaryPart, timingPart].filter(Boolean).join("_");
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

  const handleItemClick = (item) => {
    const allSiblings = menuItems.filter(m => m.id === item.id);
    const baseRecord = allSiblings.find(m => m.zone_config_id === 0) || item;

    const zonePrices = {};
    allSiblings
      .filter(m => m.zone_config_id !== 0)
      .forEach(m => { zonePrices[m.zone_config_id] = m.unit_price; });

    const slugParts = (baseRecord.slug || "").split("_");
    // slug format: ItemName_Dietary_Timing (always 3+ parts after fix)
    const timingFromSlug = slugParts.length >= 3
      ? slugParts[slugParts.length - 1]?.toLowerCase()
      : "allday";
    const dietaryFromSlug = slugParts.length >= 3
      ? slugParts[slugParts.length - 2]?.toLowerCase()
      : "veg";

    const resolvedCategoryId = categoriesFlat.find(
      c => c.name.toLowerCase() === (baseRecord.category_id || '').toLowerCase()
    )?.id || baseRecord.category_id;

    setEditingItem({
      ...baseRecord,
      category_id: resolvedCategoryId,
      zonePrices,
      availability_time: timingFromSlug,
      dietary_type: dietaryFromSlug,  // ← now correctly pre-fills edit modal
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
      setUnits(["g", "kg", "ml", "litre", "pcs"]);
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

  const getCategoryNameById = (categoryId) => {
    if (!categoryId) return null;
    const found = categoriesFlat.find(
      c => c.id === categoryId || c.name?.toLowerCase() === String(categoryId).toLowerCase()
    );
    return found?.name || null;
  };
  // Uses inventoryCategoryRoot from config — not hardcoded "inventory"
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

  const getModalCategories = () => {
    if (!categories?.length || !menuConfig) return [];
    const { root } = menuConfig;
    const findRoot = (nodes) => {
      for (const node of nodes) {
        if (String(node.id).toLowerCase() === String(root).toLowerCase() || String(node.name).toLowerCase() === String(root).toLowerCase()) return node;
        if (node.children?.length) { const found = findRoot(node.children); if (found) return found; }
      }
      return null;
    };
    const rootNode = findRoot(categories);
    if (!rootNode) return categories;
    const flattenedGrandChildren = (rootNode.children || []).flatMap(child => child.children || []);
    return [{ ...rootNode, id: rootNode.id, name: "All Categories", children: flattenedGrandChildren }];
  };

  const handleAddItem = async () => {
    try {
      let imageId = null;

      if (newItemImage) {
        imageId = await uploadImageToDocumentService(newItemImage);
      }

      const selectedCat = categoriesFlat.find(
        c => c.id === newItem?.category_id
      );

      const finalCategoryId =
        selectedCat?.name ||
        categoriesFlat.find(
          c => c.name.toLowerCase() === (newItem?.category_id || '').toLowerCase()
        )?.name ||
        newItem?.category_id;

      if (!finalCategoryId) return;
      const slug = generateSlug(
        newItem.name,
        newItem.dietary_type,
        newItem.availability_time
      );
      const { dietary_type, ...cleanNewItem } = newItem;

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
        serving_unit: newItem.serving_unit || null, availability: parseFloat(newItem.availability) || 0,
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

      // STEP 2: Always create records for ALL sections,
      // using entered zone price if provided, otherwise falling back to base price
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

      // Refresh UI
      await fetchData({ silent: true });

      // Reset form
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

      // ✅ FIXED: was incorrectly reading from newItem — must use editingItem
      const resolvedCat = categoriesFlat.find(c => c.id === editingItem?.category_id);
      const finalCategoryId =
        resolvedCat?.name ||
        categoriesFlat.find(
          c => c.name.toLowerCase() === (editingItem?.category_id || '').toLowerCase()
        )?.name ||
        editingItem?.category_id;

      if (!finalCategoryId) {
        console.error("Edit failed: could not resolve category");
        return;
      }

      const slug = generateSlug(
        editingItem.name,
        editingItem.dietary_type,
        editingItem.availability_time
      );
      const { dietary_type, zonePrices: zp, ...cleanEditingItem } = editingItem;

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
        realm: editingItem.realm || 'restaurant', availability: Number(editingItem.availability) || 0,
        updated_by: currentUserId,
        slug,
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

      // Upsert zone variants
      const filledZonePrices = Object.entries(zp || {}).filter(
        ([, price]) => price !== '' && price !== null && price !== undefined
      );

      for (const [configId, price] of filledZonePrices) {
        const existingZoneRecord = menuItems.find(
          m => m.id === editingItem.id && m.zone_config_id === Number(configId)
        );

        if (existingZoneRecord) {
          await axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
            { ...basePayload, unit_price: parseFloat(price), zone_config_id: Number(configId) },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          await axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
            { ...basePayload, unit_price: parseFloat(price), zone_config_id: Number(configId) },
            { headers: { Authorization: `Bearer ${token}` } }
          );
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

      const [catRes, itemRes] = await Promise.all([
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

      const enrichedItems = (itemRes.data.data || []).map(item => {
        const cat = flatCategories.find(
          c =>
            c.id === item.category_id ||
            c.name.toLowerCase() === (item.category_id || '').toLowerCase()
        );
        return { ...item, category: cat?.name ?? "Uncategorized" };
      });
      setMenuItems(enrichedItems);

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
    const q = (searchQuery || '').trim().toLowerCase();

    let items = menuItems;
    if (selectedDietary) {
      items = items.filter(item => {
        const dietary = getDietaryFromSlug(item.slug);
        return dietary === selectedDietary;
      });
    }
    if (q.length > 0) {
      items = items.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        String(item.code || '').toLowerCase().includes(q)
      );
    }

    if (selectedCategoryId) {
      // selectedCategoryId is still the actual id from the tree click
      // so we need to collect allowed names instead of ids
      const allowedCategoryIds = getAllDescendantCategoryIds(selectedCategoryId, categories);
      const allowedNames = allowedCategoryIds
        .map(id => categoriesFlat.find(c => c.id === id)?.name)
        .filter(Boolean)
        .map(n => n.toLowerCase());

      items = items.filter(item =>
        allowedNames.includes((item.category_id || '').toLowerCase())
      );
    }

    // If a specific zone is selected, show only that zone's records
    if (zoneConfigId !== null) {
      return items.filter(item => item.zone_config_id === zoneConfigId);
    }

    // "All" view — deduplicate by name, always prefer base record (zone_config_id === 0)
    const seen = new Map();
    items.forEach(item => {
      const key = (item.name || '').trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        const existing = seen.get(key);
        if ((item.zone_config_id === 0 || item.zone_config_id === null) &&
          existing.zone_config_id !== 0 && existing.zone_config_id !== null) {
          seen.set(key, item);
        }
      }
    });
    return Array.from(seen.values());
  };
  const isItemActive = (slug, timingOptions) => {
    if (!slug) return true;
    const parts = slug.split("_");
    if (parts.length < 3) return true; // old format slug = always active
    const timing = parts[parts.length - 1]?.toLowerCase();
    if (!timing || timing === "allday") return true; // default = always active
    const timingData = timingOptions.find(t => t.toLowerCase().startsWith(timing));
    if (!timingData) return true;
    const [, start, end] = timingData.split("|");
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return currentMinutes >= (sh * 60 + sm) && currentMinutes <= (eh * 60 + em);
  };
  const getDietaryFromSlug = (slug) => {
    if (!slug) return "veg"; // default
    const parts = slug.split("_");
    if (parts.length < 3) return "veg"; // default if old slug format
    return parts[parts.length - 2].toLowerCase();
  };
  const handleEditImageFile = (file) => {
    if (file?.type.startsWith('image/')) { setEditItemImage(file); setEditItemImageUrl(URL.createObjectURL(file)); }
    else { alert('Please upload a valid image file'); }
  };

  const filteredItems = getFilteredItems();
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aActive = isItemActive(a.slug, timingOptions);
    const bActive = isItemActive(b.slug, timingOptions);

    return bActive - aActive; // active first
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

      const addonCatId = getAddonCategoryId(deleteTarget.category_id);
      const { subcategories, items } = await fetchAddonData(addonCatId);
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

  const handleBulkUpdate = async () => {
    if (selectedRows.length === 0) return;
    try {
      for (const id of selectedRows) {
        const { dietary_type: ed, zonePrices: zp, ...cleanEditedData } = bulkEditData[id] || {};
        const { dietary_type: od, ...cleanOriginalItem } = menuItems.find(item => item.id === id && (item.zone_config_id === 0 || item.zone_config_id === null));
        // ^^^ Always grab the BASE record (zone_config_id=0) as the merge source

        const mergedItem = { ...cleanOriginalItem, ...cleanEditedData, client_id: clientId };

        // Update the base record
        await axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
          { ...mergedItem, zone_config_id: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Upsert zone price records
        const filledZonePrices = Object.entries(zp || {}).filter(
          ([, price]) => price !== '' && price !== null && price !== undefined
        );

        if (filledZonePrices.length > 0) {
          // Find ALL zone variants for this item id (they share the same id)
          const zoneVariants = menuItems.filter(
            m => m.id === id && m.zone_config_id !== 0 && m.zone_config_id !== null
          );

          for (const [configId, price] of filledZonePrices) {
            // ✅ Match by id + zone_config_id directly — no name matching needed
            const existingZoneRecord = zoneVariants.find(
              m => m.zone_config_id === Number(configId)
            );

            if (existingZoneRecord) {
              // Update existing zone variant
              await axios.post(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
                {
                  ...mergedItem,
                  id: Number(existingZoneRecord.id),
                  unit_price: parseFloat(price),
                  zone_config_id: Number(configId)
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            } else {
              // Create missing zone variant
              await axios.post(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
                {
                  ...mergedItem,
                  id: Number(id),           // ✅ preserve shared id
                  unit_price: parseFloat(price),
                  zone_config_id: Number(configId)
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            }
          }
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

  const handleExportToExcel = () => {
    try {
      const catNameById = (idOrName) => {
        if (!idOrName) return "Uncategorized";

        const found = categoriesFlat.find(
          c =>
            c.id === idOrName ||
            c.name?.toLowerCase() === String(idOrName).toLowerCase()
        );

        return found?.name || idOrName || "Unknown";
      };

      // Build a label for each section: "Zone-Section"
      const sectionLabel = (s) => `${s.zone}-${s.section}`;

      // Group all menu items by slug (deduplication key)
      const grouped = {};
      menuItems.forEach(item => {
        const key = item.slug || item.name;
        if (!grouped[key]) {
          grouped[key] = { baseItem: item, zonePrices: {} };
        }
        // Store price keyed by zone-section label
        if (item.zone_config_id) {
          const sec = sections.find(s => s.id === item.zone_config_id);
          if (sec) {
            grouped[key].zonePrices[sectionLabel(sec)] = item.unit_price;
          }
        } else {
          // No zone = base price
          grouped[key].zonePrices["Base"] = item.unit_price;
        }
      });

      // All unique zone-section column names
      const zoneColumns = sections.map(sectionLabel);

      const exportData = Object.values(grouped).map(({ baseItem: item, zonePrices }) => {
        const row = {
          ID: item.id ?? "",
          Name: item.name ?? "",
          Description: item.description ?? "",
          Category: catNameById(item.category_id) || "Unknown",
          Image: item.image_id,
          Unit: item.unit ?? "",
          Unit_Price: Number(item.unit_price) || 0,
          Discount: Number(item.discount) || 0,
          Availability: Number(item.availability) || 0,  // ✅ added
          Code: item.code != null ? String(item.code) : "",
          Serving_Quantity: item.serving_quantity,
          Serving_Unit: item.serving_unit,
          Realm: item.realm ?? realm ?? "",
          Slug: item.slug ?? "",
          Line_Item_IDs: Array.isArray(item.line_item_id)
            ? item.line_item_id.join(", ") : "",
        };

        // Add one column per zone-section
        zoneColumns.forEach(col => {
          row[`Price_${col}`] = zonePrices[col] ?? "";
        });

        return row;
      });

      const headers = [
        "ID", "Name", "Description", "Category", "Image",
        "Unit", "Unit_Price", "Discount", "Availability", "Code", "Serving_Quantity",
        "Serving_Unit", "Realm", "Slug", "Line_Item_IDs",
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
  const clean = (v) => (v === "" || v === undefined || v === null || (typeof v === "number" && isNaN(v)) ? null : v);
  const num = (v) => { if (v === "" || v === undefined || v === null || (typeof v === "number" && isNaN(v))) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };

  const handleImportFromExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let created_by = "system", updated_by = "system";
    try {
      const decoded = jwtDecode(token);
      created_by = decoded?.user_id || created_by;
      updated_by = created_by;
    } catch { }

    const sectionLabel = (s) => `${s.zone}-${s.section}`;

    const currentCategoriesFlat = [...categoriesFlat];
    const currentSelectedCategoryId = selectedCategoryId;
    const currentSections = [...sections];

    // Fetch ALL items with no zone filter
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

    // ✅ Normalize ALL zone_config_ids to numbers right after fetch
    // This is the root cause — API may return strings, null, or numbers inconsistently
    allMenuItems = allMenuItems.map(item => ({
      ...item,
      zone_config_id: item.zone_config_id === null || item.zone_config_id === undefined
        ? 0
        : Number(item.zone_config_id)
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

        if (!window.confirm(`Import ${parsedData.length} items?`)) {
          e.target.value = "";
          return;
        }

        for (const row of parsedData) {
          if (!row.Name?.trim()) continue;

          // ✅ Match by name from normalized full data
          const existingRecords = allMenuItems.filter(
            item => item.name?.trim().toLowerCase() === row.Name?.trim().toLowerCase()
          );

          console.log(`[Import] "${row.Name}" — found ${existingRecords.length} existing records`);
          console.log(`[Import] zone_config_ids:`, existingRecords.map(r => r.zone_config_id));

          // ✅ Use snapshot of categoriesFlat
          const categoryId = currentCategoriesFlat.find(
            c => c.name.trim().toLowerCase() === (row.Category || '').trim().toLowerCase()
          )?.id || currentSelectedCategoryId;

          const categoryName = currentCategoriesFlat.find(
            c => c.id === categoryId
          )?.name || null;

          if (!categoryName) {
            console.warn(`[Import] Skipping "${row.Name}" — category not found: "${row.Category}"`);
            continue;
          }

          // ✅ Inline slug using snapshot
          const slug = (() => {
            const parts = [];
            let currentId = categoryId;
            const visited = new Set();
            while (currentId && !visited.has(currentId)) {
              visited.add(currentId);
              const cat = currentCategoriesFlat.find(c => c.id === currentId);
              if (!cat) break;
              parts.unshift((cat.name || '').trim().replace(/\s+/g, '_'));
              currentId = cat.parentId ?? cat.parent_id ?? null;
            }
            const itemPart = (row.Name || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            if (itemPart) parts.push(itemPart);
            return parts.filter(Boolean).join('_');
          })();

          const basePayload = {
            client_id: clientId,
            inventory_id: "menu",
            name: row.Name?.trim(),
            description: row.Description || null,
            category_id: categoryName,
            realm: row.Realm || realm || null,
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

          // ================= BASE RECORD =================
          let sharedId;

          // ✅ zone_config_id is now guaranteed to be a number after normalization above
          const existingBase = existingRecords.find(item => item.zone_config_id === 0);

          if (existingBase) {
            sharedId = existingBase.id;
            console.log(`[Import] Updating base record id=${sharedId} price=${row.Unit_Price}`);
            await axios.post(
              `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
              {
                ...basePayload,
                id: Number(sharedId),
                unit_price: Number(row.Unit_Price) || 0,
                zone_config_id: 0
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } else {
            console.log(`[Import] Creating new base record for "${row.Name}"`);
            const res = await axios.post(
              `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
              {
                ...basePayload,
                unit_price: Number(row.Unit_Price) || 0,
                zone_config_id: 0
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            sharedId = res.data.data.id;
          }

          // ================= ZONE RECORDS =================
          for (const col of priceColumns) {
            const priceVal = row[col];
            if (priceVal === "" || priceVal === null || priceVal === undefined) continue;

            const label = col.replace("Price_", "");
            const matchedSection = currentSections.find(s => sectionLabel(s) === label);
            if (!matchedSection) {
              console.warn(`[Import] No section matched for column: ${col}`);
              continue;
            }

            // ✅ Always a number, no shadowing
            const matchedZoneConfigId = Number(matchedSection.id);

            // ✅ zone_config_id on existingRecords is also normalized to number — strict === works
            const existingZone = existingRecords.find(
              item => item.zone_config_id === matchedZoneConfigId
            );

            if (existingZone) {
              console.log(`[Import] Updating zone record id=${existingZone.id} zone=${matchedZoneConfigId} price=${priceVal}`);
              await axios.post(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
                {
                  ...basePayload,
                  id: Number(existingZone.id),
                  unit_price: Number(priceVal),
                  zone_config_id: matchedZoneConfigId
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            } else {
              console.log(`[Import] Creating zone record zone=${matchedZoneConfigId} price=${priceVal}`);
              await axios.post(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
                {
                  ...basePayload,
                  id: sharedId,
                  unit_price: Number(priceVal),
                  zone_config_id: matchedZoneConfigId
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            }
          }
        }

        await fetchData({ silent: false });
        alert("Import complete!");
        e.target.value = "";

      } catch (err) {
        console.error("Import Error:", err);
        alert(`Import failed: ${err.message}`);
        e.target.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const toggleSelectAll = () => {
    if (!selectAllChecked) { setSelectedRows(filteredItems.map(item => item.id)); setSelectAllChecked(true); }
    else { setSelectedRows([]); setSelectAllChecked(false); }
  };

  useEffect(() => {
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
      setSidebarCategories([parentCategory]);
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

  const getTopSectionName = (categoryId) => {
    if (!categoryId || !menuConfig) return null;
    const rootNode = categoriesFlat.find(
      c => c.name.toLowerCase() === menuConfig.root.toLowerCase() || c.id.toLowerCase() === menuConfig.root.toLowerCase()
    );
    if (!rootNode) return null;
    let current = categoriesFlat.find(c => c.id === categoryId);
    while (current && current.parentId) {
      if (current.parentId === rootNode.id) return current.name;
      current = categoriesFlat.find(c => c.id === current.parentId);
    }
    return null;
  };

  const findNodeAndChildren = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children?.length) { const found = findNodeAndChildren(node.children, id); if (found) return found; }
    }
    return null;
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

          {/* Main Content */}
          <div className="lg:col-span-3 border-default border-border-default p-3 rounded-lg h-[88.5vh] flex flex-col">
            {/* Quick category pills */}
            {/* <div className="flex gap-2 overflow-x-auto scrollbar-hide lg:overflow-visible pb-2">
              {dieterySubCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    localStorage.setItem("menu_selected_category", cat.id);
                    savedCategoryRef.current = cat.id;
                    const selectedNode = findNodeAndChildren(categories, cat.id);
                    if (selectedNode) setSidebarCategories([selectedNode]);
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold border whitespace-nowrap transition-all flex-shrink-0"
                >
                  {(() => {
                    const section = getTopSectionName(cat.id);
                    return (
                      <div className="flex flex-col leading-tight text-left">
                        {section && <span className="text-[10px] opacity-60">{section}</span>}
                        <span className="text-sm font-semibold">{cat.name}</span>
                      </div>
                    );
                  })()}
                </button>
              ))}
            </div> */}
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
              <div className="flex-shrink-0">
                <h2 className="text-lg lg:text-2xl font-semibold text-text-primary leading-tight">
                  {getSelectedCategoryNameById() || 'All Categories'}
                  <span className="text-sm ml-2 text-text-secondary">({filteredItems.length})</span>
                </h2>
              </div>
              <div className="flex gap-2 mb-3">
                {["veg", "nonveg", "egg", "chinese"].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedDietary(type)}
                    className={`px-3 py-1 rounded-full text-sm ${selectedDietary === type
                      ? "bg-black text-white"
                      : "bg-gray-100"
                      }`}
                  >
                    {type}
                  </button>
                ))}

                <button
                  onClick={() => setSelectedDietary(null)}
                  className="px-3 py-1 rounded-full text-sm bg-gray-200"
                >
                  All
                </button>
              </div>
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
                  <button onClick={() => setShowMenuConfig(true)} className="h-9 px-3 flex items-center gap-2 rounded-lg bg-action-success text-white text-sm font-semibold shadow-sm hover:opacity-90">
                    <span>Config</span>
                  </button>
                  <button onClick={openAddModal} className="h-9 px-3 flex items-center gap-2 rounded-lg bg-action-primary text-white text-sm font-semibold shadow-sm hover:opacity-90">
                    <Plus size={14} /><span>Add Item</span>
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
                  const discountPercent = item.discount && item.unit_price && Number(item.discount) > 0
                    ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(0) : null;
                  const dietary = getDietaryFromSlug(item.slug);
                  const active = isItemActive(item.slug, timingOptions);
                  return (
                    <div key={item.id}
                      className={`relative flex gap-2 items-center bg-bg-primary border rounded-xl p-1 shadow-sm transition group overflow-hidden
                      ${active ? "" : "opacity-40 grayscale"}
                    `}                    >

                      <div
                        className={`w-[3px] h-full rounded-l-xl
    ${dietary === "veg" ? "bg-green-500" :
                            dietary === "nonveg" ? "bg-red-500" :
                              dietary === "egg" ? "bg-yellow-400" :
                                dietary === "chinese" ? "bg-orange-500" :
                                  "bg-transparent"
                          }
  `}
                      /> <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 pointer-events-none z-10 group-hover:animate-overlayFade" />

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
                              <span className="text-sm font-bold text-action-primary">₹{(item.unit_price - item.discount).toFixed(0)}</span>
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
        units={units}
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
        units={units}

      />

      <UniversalBulkUpdateModal clientId={clientId}
        token={token} menuItems={menuItems}
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
