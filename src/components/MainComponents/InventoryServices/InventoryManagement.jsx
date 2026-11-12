import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import AgGridTable from '../../utils/AgGridTable';

const FIELD =
  "w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
  "outline-none placeholder:text-ink-faint transition-colors " +
  "focus:border-brand-ring focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
const AREA =
  "w-full px-item py-2 rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
  "outline-none placeholder:text-ink-faint transition-colors " +
  "focus:border-brand-ring focus:shadow-focus-ring";
const LABEL =
  "block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted";
const DIALOG =
  "flex flex-col w-full max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line " +
  "border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in";

const API_CONFIG = {
  baseMenu: (clientId) => `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu`,
  baseInventory: (clientId) => `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory`,
};

const getAuthHeaders = (token) => ({
  headers: { Authorization: token ? `Bearer ${token}` : "" },
});

export default function StockRecipeManager({ clientId: propClientId, token: propToken, realm }) {
  const params = useParams();
  const clientId = propClientId || params.clientId || params.client_id;
  const token = propToken || localStorage.getItem("access_token");

  const [activeTab, setActiveTab] = useState("recipe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Units fetched from category id=units
  const [units, setUnits] = useState([]);

  // Inventory Categories (subcategories of id=inventory)
  const [inventoryCategories, setInventoryCategories] = useState([]);
  // All categories for lookup
  const [allCategories, setAllCategories] = useState([]);

  // Stock
  const [stocks, setStocks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockForm, setStockForm] = useState({
    id: null,
    name: "",
    description: "",
    category: "",
    availability: "",
    unit: "",
    unit_price: "",
    inventory_id: "",
  });

  const [isDeductModalOpen, setIsDeductModalOpen] = useState(false);
  const [deductForm, setDeductForm] = useState({
    stock_item_id: null,
    stock_name: "",
    quantity: "",
    unit: "",
    transaction_type: "RETURN",
    remarks: "",
  });
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isEditingStock, setIsEditingStock] = useState(false);

  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [addStockForm, setAddStockForm] = useState({
    stock_item_id: null,
    stock_name: "",
    quantity: "",
    unit: "",
    remarks: "",
  });

  // Add Inventory Modal
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    id: "",
    name: "",
    description: "",
    subcategories: "",
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Recipe
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [recipe, setRecipe] = useState([]);
  const [newIngredient, setNewIngredient] = useState({
    stock_item_id: "",
    quantity_required: "",
    unit: "",
  });

  // Menu Availability
  const [menuAvailabilityList, setMenuAvailabilityList] = useState([]);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  // Enhanced stock with real-time calculations
  const enhancedStocks = useMemo(() => {
    return stocks.map((stock) => {
      const consumption = recipe.reduce((sum, r) => {
        return sum + (Number(r.stock_item_id) === Number(stock.id) ? Number(r.quantity_required || 0) : 0);
      }, 0);

      const physical = Number(stock.availability || 0);
      const effective = physical - consumption;
      const threshold = 5;

      let status = "healthy";
      if (effective <= 0) status = "out";
      else if (effective <= threshold) status = "low";

      return {
        ...stock,
        effectiveAvailability: effective,
        status,
        isLow: status !== "healthy",
        totalCost: effective * Number(stock.unit_price || 0),
      };
    });
  }, [stocks, recipe]);

  const filteredStocks = useMemo(() => {
    let result = enhancedStocks;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        `${s.name} ${s.description || ""} ${s.category || ""}`.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "All") {
      result = result.filter((s) => s.category === categoryFilter);
    }

    if (lowStockOnly) {
      result = result.filter((s) => s.isLow);
    }

    return result;
  }, [enhancedStocks, searchQuery, categoryFilter, lowStockOnly]);

  // Filtered menu items for availability tab
  const filteredMenuItems = useMemo(() => {
    if (!menuSearchQuery) return menuAvailabilityList;

    const q = menuSearchQuery.toLowerCase();
    return menuAvailabilityList.filter((item) =>
      `${item.name} ${item.description || ""} ${item.category || ""}`.toLowerCase().includes(q)
    );
  }, [menuAvailabilityList, menuSearchQuery]);

  // Fetch all categories for name lookup
  const fetchAllCategories = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/read_category?client_id=${clientId}`,
        getAuthHeaders(token)
      );
      const categoriesData = res.data?.data || [];
      setAllCategories(categoriesData);
    } catch (err) {
      console.error("fetchAllCategories failed:", err);
    }
  };

  // Fetch units from category id=units
  const fetchUnits = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.baseInventory(clientId)}/item-types?client_id=${clientId}&category_id=units`,
        getAuthHeaders(token)
      );
      const unitList = res.data?.data || [];
      setUnits(unitList);
    } catch (err) {
      console.error("fetchUnits failed:", err);
    }
  };

  // Fetch inventory categories (subcategories of id=inventory)
  const fetchInventoryCategories = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/read_category?client_id=${clientId}&category_id=inventory`,
        getAuthHeaders(token)
      );

      // Extract subcategories from the inventory category
      const inventoryData = res.data?.data || [];

      let subcategories = [];
      if (Array.isArray(inventoryData)) {
        const inventoryCategory = inventoryData.find(cat => cat.id === 'inventory');
        subcategories = inventoryCategory?.subCategories || [];
      } else if (inventoryData.subCategories) {
        subcategories = inventoryData.subCategories;
      }
      console.log("Inventory Subcategories:", subcategories);
      setInventoryCategories(subcategories);

      // Set first inventory as active tab if exists
      if (subcategories.length > 0 && activeTab === "recipe") {
        setActiveTab(subcategories[0].id);
      }
    } catch (err) {
      console.error("fetchInventoryCategories failed:", err);
      setInventoryCategories([]);
    }
  };

  // Data fetching
  useEffect(() => {
    if (!clientId) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAllCategories(),
        fetchInventoryCategories(),
        fetchStocks(),
        fetchMenuItems(),
        fetchUnits(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [clientId]);

  useEffect(() => {
    if (activeTab === "menu-availability") {
      fetchMenuAvailability();
    }
  }, [activeTab]);

  // Fetch all stocks (no realm filter, will be filtered by inventory_id on frontend)
  const fetchStocks = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/read?client_id=${clientId}`,
        getAuthHeaders(token)
      );

      const allItems = res.data?.data || [];
      console.log("all items", allItems);

      const stockItems = allItems.filter(
        (item) => item.inventory_id && item.inventory_id !== "menu"
      );

      console.log("stock items", stockItems);

      setStocks(stockItems);

      const uniqueCategories = [
        ...new Set(stockItems.map((s) => s.category || "").filter(Boolean)),
      ];

      setCategories(uniqueCategories);
    } catch (err) {
      console.error("fetchStocks failed:", err);
      setError("Failed to load inventory items");
    }
  };

  // Fetch menu items based on inventory_id = 'menu' or realm
  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/read?client_id=${clientId}&inventory_id=menu`,
        getAuthHeaders(token)
      );
      const allItems = res.data?.data || [];

      // ✅ Deduplicate — keep only base record (zone_config_id === 0) per item id
      const seenIds = new Map();
      allItems.forEach(item => {
        const zid = item.zone_config_id === null || item.zone_config_id === undefined
          ? 0 : Number(item.zone_config_id);
        const existing = seenIds.get(item.id);
        if (!existing) {
          seenIds.set(item.id, { ...item, zone_config_id: zid });
        } else if (zid === 0) {
          seenIds.set(item.id, { ...item, zone_config_id: 0 });
        }
      });
      setMenuItems(Array.from(seenIds.values()));
    } catch (err) {
      console.error("fetchMenuItems failed:", err);
    }
  };

  const fetchMenuAvailability = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/read?client_id=${clientId}&inventory_id=menu`,
        getAuthHeaders(token)
      );
      const allItems = res.data?.data || [];

      // ✅ Same dedup logic — base record wins
      const seenIds = new Map();
      allItems.forEach(item => {
        const zid = item.zone_config_id === null || item.zone_config_id === undefined
          ? 0 : Number(item.zone_config_id);
        const existing = seenIds.get(item.id);
        if (!existing) {
          seenIds.set(item.id, { ...item, zone_config_id: zid });
        } else if (zid === 0) {
          seenIds.set(item.id, { ...item, zone_config_id: 0 });
        }
      });
      setMenuAvailabilityList(Array.from(seenIds.values()));
    } catch (err) {
      console.error("fetchMenuAvailability failed:", err);
      setError("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipeForMenu = async (menuId) => {
    if (!menuId) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/recipe/${menuId}?client_id=${clientId}&menu_inventory_id=menu`,
        getAuthHeaders(token)
      );
      const data = res.data?.data || {};
      setRecipe(Array.isArray(data.recipe) ? data.recipe : []);
    } catch (err) {
      console.error("fetchRecipe failed:", err);
      setRecipe([]);
    } finally {
      setLoading(false);
    }
  };

  // Add Inventory Category functions
  const openInventoryModal = () => {
    setInventoryForm({
      id: "",
      name: "",
      description: "",
      subcategories: "",
    });
    setIsInventoryModalOpen(true);
  };

  const createInventoryCategory = async () => {
    if (!inventoryForm.name.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      // Step 1: Create the new subcategory
      const categoryId = inventoryForm.id || inventoryForm.name.toLowerCase().replace(/\s+/g, '_');
      const slug = inventoryForm.name.toLowerCase().replace(/\s+/g, '-');

      const subcategoryPayload = {
        id: categoryId,
        name: inventoryForm.name,
        slug: slug,
        description: inventoryForm.description,
        subcategories: inventoryForm.subcategories || null,
        client_id: clientId,
      };

      await axios.post(
        `${API_CONFIG.baseMenu(clientId)}/create_category?client_id=${clientId}`,
        subcategoryPayload,
        getAuthHeaders(token)
      );

      // Step 2: Fetch current inventory category to get existing subcategories
      const inventoryCategoryRes = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/read_category?client_id=${clientId}&category_id=inventory`,
        getAuthHeaders(token)
      );

      const inventoryData = inventoryCategoryRes.data?.data || [];
      let currentSubcategories = [];

      if (Array.isArray(inventoryData)) {
        const inventoryCategory = inventoryData.find(cat => cat.id === 'inventory');
        currentSubcategories = inventoryCategory?.subCategories || [];
        console.log("Current subcategories are", currentSubcategories)
      } else if (inventoryData.subCategories) {
        currentSubcategories = inventoryData.subCategories;
      }

      // Step 3: Update inventory category's subcategories to include the new one
      const existingSubcategoryIds = currentSubcategories.map(sub => sub.id).filter(id => id !== categoryId);
      console.log("existing subcategories are", existingSubcategoryIds)
      const updatedSubcategoryIds = [...existingSubcategoryIds, categoryId];
      console.log("updated subcategories are", updatedSubcategoryIds)

      await axios.post(
        `${API_CONFIG.baseMenu(clientId)}/update_category?client_id=${clientId}`,
        {
          id: "inventory",
          sub_categories: updatedSubcategoryIds,
          client_id: clientId,
        },
        getAuthHeaders(token)
      );


      setIsInventoryModalOpen(false);
      setInventoryForm({
        id: "",
        name: "",
        description: "",
        subcategories: "",
      });

      await fetchInventoryCategories();

      alert("Inventory category created successfully!");
    } catch (err) {
      console.error("createInventoryCategory failed:", err);
      setError(err.response?.data?.message || "Failed to create inventory category");
    }
  };

  // Stock CRUD
  const openStockModal = (stock = null, prefilledInventoryId = null) => {
    if (stock) {
      setStockForm({
        id: stock.id,
        name: stock.name || "",
        description: stock.description || "",
        category: stock.category || "",
        availability: stock.availability || "",
        unit: stock.unit || "",
        unit_price: stock.unit_price || "",
        inventory_id: stock.inventory_id || "",
      });
      setIsEditingStock(true);
    } else {
      const inventoryId = prefilledInventoryId || "";
      const selectedInventory = inventoryCategories.find(inv => inv.id === inventoryId);
      setStockForm({
        id: null,
        name: "",
        description: "",
        category: selectedInventory?.name || "",
        availability: "",
        unit: "",
        unit_price: "",
        inventory_id: inventoryId,
      });
      setIsEditingStock(false);
    }
    setIsStockModalOpen(true);
  };

  const saveStock = async () => {
    if (!stockForm.name.trim()) return setError("Name is required");
    if (!stockForm.inventory_id) return setError("Please select an inventory");

    const selectedInventory = inventoryCategories.find(inv => inv.id === stockForm.inventory_id);
    const categoryUUID = selectedInventory?.id || stockForm.inventory_id;

    const payload = {
      ...stockForm,
      realm,
      category_id: categoryUUID,
      inventory_id: categoryUUID,
      client_id: clientId,
    };

    try {
      if (isEditingStock) {
        const { availability, ...metaPayload } = payload;
        await axios.post(`${API_CONFIG.baseMenu(clientId)}/stock/update`, metaPayload, getAuthHeaders(token));
      } else {
        await axios.post(`${API_CONFIG.baseMenu(clientId)}/stock/create?client_id=${clientId}`, payload, getAuthHeaders(token));
      }
      setIsStockModalOpen(false);
      await fetchStocks();
      setStockForm({ id: null, name: "", description: "", category: "", availability: "", unit: "", unit_price: "", inventory_id: "" });
    } catch (err) {
      console.error("saveStock failed:", err);
      setError("Failed to save stock item");
    }
  };

  const openAddStockModal = (stock) => {
    setAddStockForm({
      stock_item_id: stock.id,
      stock_name: stock.name,
      quantity: "",
      unit: stock.unit || "",
      remarks: "",
    });
    setIsAddStockModalOpen(true);
  };

  const submitAddStock = async () => {
    if (!addStockForm.quantity || Number(addStockForm.quantity) <= 0)
      return setError("Please enter a valid quantity greater than 0");
    try {
      await axios.post(
        `${API_CONFIG.baseMenu(clientId)}/stock/add`,
        null,
        {
          ...getAuthHeaders(token),
          params: {
            client_id: clientId,
            stock_item_id: addStockForm.stock_item_id,
            quantity: addStockForm.quantity,
            unit: addStockForm.unit || undefined,
            remarks: addStockForm.remarks || undefined,
          },
        }
      );
      setIsAddStockModalOpen(false);
      setAddStockForm({ stock_item_id: null, stock_name: "", quantity: "", unit: "", remarks: "" });
      await Promise.all([fetchStocks(), fetchMenuItems(), fetchMenuAvailability()]);
    } catch (err) {
      console.error("submitAddStock failed:", err);
      setError(err.response?.data?.detail || "Failed to add stock quantity");
    }
  };

  const openDeductModal = (stock) => {
    setDeductForm({
      stock_item_id: stock.id,
      stock_name: stock.name,
      quantity: "",
      unit: stock.unit || "",
      transaction_type: "RETURN",
      remarks: "",
    });
    setIsDeductModalOpen(true);
  };

  const submitDeductStock = async () => {
    if (!deductForm.quantity || Number(deductForm.quantity) <= 0)
      return setError("Please enter a valid quantity greater than 0");

    try {
      await axios.post(
        `${API_CONFIG.baseMenu(clientId)}/stock/manual-deduct`,
        null,
        {
          ...getAuthHeaders(token),
          params: {
            client_id: clientId,
            stock_item_id: deductForm.stock_item_id,
            quantity: deductForm.quantity,
            unit: deductForm.unit || undefined,
            transaction_type: deductForm.transaction_type,
            remarks: deductForm.remarks || undefined,
          },
        }
      );
      setIsDeductModalOpen(false);
      setDeductForm({
        stock_item_id: null,
        stock_name: "",
        quantity: "",
        unit: "",
        transaction_type: "RETURN",
        remarks: "",
      });
      await Promise.all([fetchStocks(), fetchMenuItems(), fetchMenuAvailability()]);
    } catch (err) {
      console.error("submitDeductStock failed:", err);
      setError(err.response?.data?.detail || "Failed to deduct stock quantity");
    }
  };

  const deleteStock = async (id) => {
    if (!window.confirm("Delete this stock item?")) return;
    try {
      await axios.post(`${API_CONFIG.baseMenu(clientId)}/delete`, { id }, getAuthHeaders(token));
      await fetchStocks();
    } catch (err) {
      console.error("deleteStock failed:", err);
      setError("Failed to delete stock item");
    }
  };

  // Recipe operations
  const selectMenu = (menuId) => {
    setSelectedMenuId(menuId);
    if (menuId) fetchRecipeForMenu(menuId);
    else setRecipe([]);
  };

  const addIngredient = async () => {
    if (!selectedMenuId) return setError("Please select a menu item first");
    if (!newIngredient.stock_item_id) return setError("Please select an ingredient");

    const updatedRecipe = [
      ...recipe,
      {
        stock_item_id: Number(newIngredient.stock_item_id),
        quantity_required: Number(newIngredient.quantity_required) || 0,
        unit: newIngredient.unit.trim(),
      },
    ];

    try {
      await axios.post(
        `${API_CONFIG.baseMenu(clientId)}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}&menu_inventory_id=menu`,
        { recipe: updatedRecipe },
        getAuthHeaders(token)
      );
      setNewIngredient({ stock_item_id: "", quantity_required: "", unit: "" });
      await fetchRecipeForMenu(selectedMenuId);
    } catch (err) {
      console.error("addIngredient failed:", err);
      setError("Failed to add ingredient");
    }
  };

  const updateIngredient = async (index, field, value) => {
    if (!selectedMenuId) return;

    const updated = [...recipe];
    updated[index] = {
      ...updated[index],
      [field]: field === "quantity_required" ? Number(value) || 0 : value.trim(),
    };

    try {
      await axios.post(
        `${API_CONFIG.baseMenu(clientId)}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}&menu_inventory_id=menu`,
        { recipe: updated },
        getAuthHeaders(token)
      );
      await fetchRecipeForMenu(selectedMenuId);
    } catch (err) {
      console.error("updateIngredient failed:", err);
    }
  };

  const deleteIngredient = async (index) => {
    if (!window.confirm("Remove this ingredient?")) return;
    if (!selectedMenuId) return;

    const updated = recipe.filter((_, i) => i !== index);

    try {
      await axios.post(
        `${API_CONFIG.baseMenu(clientId)}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}&menu_inventory_id=menu`,
        { recipe: updated },
        getAuthHeaders(token)
      );
      await fetchRecipeForMenu(selectedMenuId);
    } catch (err) {
      console.error("deleteIngredient failed:", err);
      setError("Failed to remove ingredient");
    }
  };

  // Menu Availability operations
  const updateMenuAvailability = async (menuId, newAvailability, newUnit) => {
    try {
      await axios.post(
        `${API_CONFIG.baseMenu(clientId)}/update`,
        {
          id: menuId,
          availability: newAvailability,
          unit: newUnit,
        },
        getAuthHeaders(token)
      );

      setMenuAvailabilityList((prev) =>
        prev.map((item) =>
          item.id === menuId ? { ...item, availability: newAvailability, unit: newUnit } : item
        )
      );

      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === menuId ? { ...item, availability: newAvailability, unit: newUnit } : item
        )
      );
    } catch (err) {
      console.error("updateMenuAvailability failed:", err);
      setError("Failed to update menu availability");
    }
  };

  // Filter stocks by selected inventory_id
  const getStocksForInventory = (inventoryId) => {
    if (inventoryId === "menu" || inventoryId === "recipe") return [];
    return filteredStocks.filter(stock => stock.inventory_id === inventoryId);
  };

  // FIX #3: Calculate dynamic overview based on active inventory
  const getCurrentInventoryOverview = useMemo(() => {
    const currentInventory = inventoryCategories.find(cat => cat.id === activeTab);

    if (!currentInventory) {
      // Default overview when on Recipe tab
      return {
        stockCount: stocks.length,
        lowStockCount: enhancedStocks.filter((s) => s.isLow).length,
        menuCount: menuItems.length,
        inventoryCount: inventoryCategories.length,
      };
    }

    // Filter stocks for current inventory
    const currentStocks = stocks.filter(stock => stock.inventory_id === activeTab);
    const currentEnhancedStocks = currentStocks.map((stock) => {
      const consumption = recipe.reduce((sum, r) => {
        return sum + (Number(r.stock_item_id) === Number(stock.id) ? Number(r.quantity_required || 0) : 0);
      }, 0);

      const physical = Number(stock.availability || 0);
      const effective = physical - consumption;
      const threshold = 5;

      let status = "healthy";
      if (effective <= 0) status = "out";
      else if (effective <= threshold) status = "low";

      return {
        ...stock,
        effectiveAvailability: effective,
        status,
        isLow: status !== "healthy",
      };
    });

    return {
      stockCount: currentStocks.length,
      lowStockCount: currentEnhancedStocks.filter((s) => s.isLow).length,
      menuCount: menuItems.length,
      inventoryCount: inventoryCategories.length,
      inventoryName: currentInventory.name,
    };
  }, [activeTab, stocks, enhancedStocks, menuItems, inventoryCategories, recipe]);

  return (
    <div className="ui-page">
      <div className="mx-auto w-full">
        <div className="ui-panel flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-3 items-center">
            <p className="text-ui text-ink-muted">
              Manage stock items, recipes, and menu availability
            </p>
 
            <button
              className="ui-btn ui-btn-add"
              onClick={openInventoryModal}
            >
              + Add Inventory
            </button>
          </div>
 
          <div className="ui-tabs">
 
            {/* Dynamic Inventory Tabs */}
            {inventoryCategories.map((category) => (
              <button
                key={category.id}
                className={`ui-tab ${activeTab === category.id ? 'ui-tab-active' : ''}`}
                onClick={() => setActiveTab(category.id)}
              >
                {category.name}
              </button>
            ))}
 
            <button
              className={`ui-tab ${activeTab === "recipe" ? 'ui-tab-active' : ''}`}
              onClick={() => setActiveTab("recipe")}
            >
              Recipe
            </button>
          </div>
        </div>
 
        {error && (
          <div className="mb-stack px-4 py-2 bg-state-occupied-bg border border-state-occupied/30 text-state-occupied rounded-button-sm flex items-center justify-between text-ui">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-state-occupied font-bold text-body"
            >
              ×
            </button>
          </div>
        )}
 
        <div className="grid lg:grid-cols-12 gap-tiles">
          <main className="lg:col-span-9 min-w-0">
            {/* Dynamic Inventory Category Tabs */}
            {inventoryCategories.some(cat => cat.id === activeTab) && activeTab !== "menu" && (
              <InventoryCategoryTab
                category={inventoryCategories.find(cat => cat.id === activeTab)}
                stocks={getStocksForInventory(activeTab)}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddNew={() => openStockModal(null, activeTab)}
                onEdit={openStockModal}
                onDelete={deleteStock}
                allCategories={allCategories}
                onAddQty={openAddStockModal}
                onDeduct={openDeductModal}
              />
            )}
 
 
            {/* Menu Availability Tab */}
            {activeTab === "menu" && (
              <MenuAvailabilityTab
                menuItems={menuItems}
                loading={loading}
                onUpdateAvailability={updateMenuAvailability}
                onAddQty={openAddStockModal}
                onDeduct={openDeductModal} 
                allCategories={allCategories}
                units={units}
                searchQuery={menuSearchQuery}
                onSearchChange={setMenuSearchQuery}
              />
            )}
 
            {activeTab === "recipe" && (
              <RecipeTab
                menuItems={menuItems}
                selectedMenuId={selectedMenuId}
                recipe={recipe}
                stocks={stocks}
                newIngredient={newIngredient}
                setNewIngredient={setNewIngredient}
                onSelectMenu={selectMenu}
                onAddIngredient={addIngredient}
                onUpdateIngredient={updateIngredient}
                onDeleteIngredient={deleteIngredient}
                units={units}
              />
            )}
          </main>
 
          <aside className="lg:col-span-3 min-w-0">
            {inventoryCategories.some(cat => cat.id === activeTab) && (
              <div className="ui-card p-panel">
                <h3 className="text-panel-title text-brand-dark mb-item">Filters</h3>
                <div className="space-y-3">
                  <div>
                    <select
                      className={FIELD}
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
 
                  <div className="pt-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lowStockOnly}
                        onChange={(e) => setLowStockOnly(e.target.checked)}
                        className="h-4 w-4 accent-brand rounded cursor-pointer"
                      />
                      <span className="text-ui font-semibold text-ink">Low stock only</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
 
            <div className="ui-card p-panel">
              <h3 className="text-panel-title text-brand-dark mb-item">
                {getCurrentInventoryOverview.inventoryName ? `${getCurrentInventoryOverview.inventoryName} Overview` : 'Overview'}
              </h3>
              <div className="space-y-3 text-ui">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Stock items</span>
                  <span className="font-bold text-brand-dark">{getCurrentInventoryOverview.stockCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Low stock</span>
                  <span className="font-bold text-state-reserved">
                    {getCurrentInventoryOverview.lowStockCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Menu items</span>
                  <span className="font-bold text-brand-dark">{getCurrentInventoryOverview.menuCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Inventories</span>
                  <span className="font-bold text-brand-dark">{getCurrentInventoryOverview.inventoryCount}</span>
                </div>
                <div className="text-ui-sm text-ink-muted pt-2.5 border-t border-line-soft">
                  Last refresh: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
 
      {isStockModalOpen && (
        <StockModal
          isOpen={isStockModalOpen}
          isEditing={isEditingStock}
          form={stockForm}
          categories={categories}
          inventoryCategories={inventoryCategories}
          units={units}
          onChange={setStockForm}
          onSave={saveStock}
          onClose={() => {
            setIsStockModalOpen(false);
            setStockForm({
              id: null,
              name: "",
              description: "",
              category: "",
              availability: "",
              unit: "",
              unit_price: "",
              inventory_id: "",
            });
          }}
        />
      )}
 
      {isInventoryModalOpen && (
        <InventoryModal
          isOpen={isInventoryModalOpen}
          form={inventoryForm}
          onChange={setInventoryForm}
          onSave={createInventoryCategory}
          onClose={() => {
            setIsInventoryModalOpen(false);
            setInventoryForm({
              id: "",
              name: "",
              description: "",
              subcategories: "",
            });
          }}
        />
      )}
 
      {isAddStockModalOpen && (
        <AddStockModal
          isOpen={isAddStockModalOpen}
          form={addStockForm}
          units={units}
          onChange={setAddStockForm}
          onSave={submitAddStock}
          onClose={() => {
            setIsAddStockModalOpen(false);
            setAddStockForm({ stock_item_id: null, stock_name: "", quantity: "", unit: "", remarks: "" });
          }}
        />
      )}
 
      {isDeductModalOpen && (
        <DeductStockModal
          isOpen={isDeductModalOpen}
          form={deductForm}
          units={units}
          onChange={setDeductForm}
          onSave={submitDeductStock}
          onClose={() => {
            setIsDeductModalOpen(false);
            setDeductForm({
              stock_item_id: null,
              stock_name: "",
              quantity: "",
              unit: "",
              transaction_type: "RETURN",
              remarks: "",
            });
          }}
        />
      )}
    </div>
  );
}

function InventoryCategoryTab({
  category,
  stocks,
  loading,
  searchQuery,
  onSearchChange,
  onAddNew,
  onEdit,
  onDelete,
  allCategories,
  onAddQty,
  onDeduct
}) {

  const getCategoryName = (categoryId) => {
    if (!categoryId) return "—";
    const category = allCategories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  if (!category) return null;

  const stockColumnDefs = [
    {
      headerName: 'Item',
      field: 'name',
      minWidth: 220,
      sortable: true,
      cellRenderer: (params) => (
        <div>
          <div className="font-bold text-ink text-ui">{params.data.name}</div>
          {params.data.description && (
            <div className="text-ui-sm text-ink-muted">{params.data.description}</div>
          )}
        </div>
      ),
    },
    {
      headerName: 'Category',
      colId: 'category',
      minWidth: 150,
      sortable: true,
      valueGetter: (params) => getCategoryName(params.data?.category_id),
      cellRenderer: (params) => <span className="text-ui text-ink-soft">{params.value}</span>,
    },
    {
      headerName: 'Availability',
      field: 'effectiveAvailability',
      minWidth: 140,
      sortable: true,
      cellRenderer: (params) => (
        <span className={`inline-flex px-2.5 py-1 text-micro font-bold rounded-badge ${
          params.data.status === "out" ? "bg-state-occupied-bg text-state-occupied" :
          params.data.status === "low" ? "bg-state-reserved-bg text-state-reserved" :
          "bg-state-vacant-bg text-state-vacant"
        }`}>
          {params.value}
        </span>
      ),
    },
    {
      headerName: 'Unit',
      field: 'unit',
      minWidth: 100,
      sortable: true,
      valueGetter: (params) => params.data?.unit || "—",
      cellRenderer: (params) => <span className="text-ui text-ink-soft">{params.value}</span>,
    },
    {
      headerName: 'Price',
      field: 'unit_price',
      minWidth: 120,
      sortable: true,
      valueGetter: (params) => Number(params.data?.unit_price) || 0,
      cellRenderer: (params) => (
        <span className="text-ui font-bold text-brand-dark">₹{params.value.toFixed(2)}</span>
      ),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      minWidth: 380,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params) => (
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            onClick={() => onAddQty(params.data)}
            className="ui-btn ui-btn-update !h-7"
          >
            + Add Qty
          </button>
          <button
            onClick={() => onDeduct(params.data)}
            className="ui-btn ui-btn-delete !h-7"
          >
            Deduct
          </button>
          <button
            onClick={() => onEdit(params.data)}
            className="ui-btn !h-7"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(params.data.id)}
            className="ui-btn ui-btn-delete !h-7"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

   
  return (
  <div className="ui-panel !p-0 overflow-hidden">
    {loading ? (
      <div className="px-6 py-12 text-center text-ink-muted text-ui">Loading...</div>
    ) : stocks.length === 0 ? (
      <div className="px-6 py-12 text-center text-ink-muted text-ui">
        No stock items found. Click "Add Stock" to create one.
      </div>
    ) : (
      <AgGridTable
        columnDefs={stockColumnDefs}
        rowData={stocks}
        domLayout="normal"
        height={600}
        exportFileName="inventory_stock"
        gridOptions={{ getRowId: (params) => String(params.data.id) }}
        toolbarRight={
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <button
              onClick={onAddNew}
              className="ui-btn ui-btn-add whitespace-nowrap"
            >
              + Add Stock
            </button>
          </div>
        }
      />
    )}
  </div>
);
}

function RecipeTab({
  menuItems,
  selectedMenuId,
  recipe,
  stocks,
  newIngredient,
  setNewIngredient,
  onSelectMenu,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  units,
}) {
  const ingredientColumnDefs = [
    {
      headerName: 'Ingredient',
      colId: 'ingredient',
      minWidth: 180,
      sortable: true,
      cellRenderer: (params) => {
        const stockItem = stocks.find((s) => Number(s.id) === Number(params.data.stock_item_id));
        return <span className="font-bold text-ink text-ui">{stockItem?.name || `Item #${params.data.stock_item_id}`}</span>;
      },
    },
    {
      headerName: 'Qty',
      field: 'quantity_required',
      minWidth: 120,
      sortable: true,
      cellRenderer: (params) => (
        <input
          type="number"
          step="0.01"
          min="0"
          value={params.data.quantity_required}
          onChange={(e) => onUpdateIngredient(params.node.rowIndex, "quantity_required", e.target.value)}
          className="w-24 h-7 px-2 rounded-button-sm border border-brand-line bg-surface text-ui text-ink outline-none focus:border-brand-ring focus:shadow-focus-ring"
        />
      ),
    },
    {
      headerName: 'Unit',
      field: 'unit',
      minWidth: 140,
      sortable: true,
      cellRenderer: (params) => (
        <select
          value={params.data.unit || ""}
          onChange={(e) => onUpdateIngredient(params.node.rowIndex, "unit", e.target.value)}
          className="w-28 h-7 px-2 rounded-button-sm border border-brand-line bg-surface text-ui text-ink outline-none focus:border-brand-ring focus:shadow-focus-ring"
        >
          <option value="">Unit</option>
          {units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      ),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      minWidth: 100,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params) => (
        <div className="flex justify-end w-full">
          <button
            onClick={() => onDeleteIngredient(params.node.rowIndex)}
            className="text-brand-dark hover:underline text-ui font-semibold"
          >
            Remove
          </button>
        </div>
      ),
    },
  ];
 

  
  return (
    <div className="ui-panel !p-0 overflow-hidden">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-panel border-b border-line-divider bg-brand-tint">
        <div className="lg:col-span-2">
          <label className={LABEL}>Menu Item</label>
          <select
            className={FIELD}
            value={selectedMenuId || ""}
            onChange={(e) => onSelectMenu(e.target.value)}
          >
            <option value="">— Select menu item —</option>
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
 
        <div>
          <label className={LABEL}>Ingredients</label>
          <div className="h-control px-item flex items-center rounded-button-sm border border-brand-line bg-surface text-body font-bold text-brand-dark">
            {recipe.length}
          </div>
        </div>
      </div>
 
      <div className="p-panel">
      {selectedMenuId ? (
        <>
          <div className="overflow-x-auto mb-item">
            {recipe.length === 0 ? (
              <div className="px-6 py-12 text-center text-ink-muted text-ui">No ingredients added yet</div>
            ) : (
              <AgGridTable
                columnDefs={ingredientColumnDefs}
                rowData={recipe}
                domLayout="normal"
                height={400}
                exportFileName="recipe_ingredients"
                gridOptions={{ getRowId: (params) => String(params.data.stock_item_id) }}
              />
            )}
          </div>
 
          <div className="bg-brand-tint p-panel rounded-panel border border-brand-line">
            <h4 className="text-panel-title text-brand-dark mb-item">Add Ingredient</h4>
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div>
                <select
                  value={newIngredient.stock_item_id}
                  onChange={(e) => setNewIngredient((prev) => ({ ...prev, stock_item_id: e.target.value }))}
                  className={FIELD}
                >
                  <option value="">Select ingredient</option>
                  {stocks.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
 
              <div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Quantity"
                  value={newIngredient.quantity_required}
                  onChange={(e) => setNewIngredient((prev) => ({ ...prev, quantity_required: e.target.value }))}
                  className={FIELD}
                />
              </div>
 
              <div>
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient((prev) => ({ ...prev, unit: e.target.value }))}
                  className={FIELD}
                >
                  <option value="">Select unit</option>
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
 
              <div className="flex gap-3">
                <button
                  onClick={onAddIngredient}
                  className="ui-btn ui-btn-add flex-1"
                >
                  Add
                </button>
                <button
                  onClick={() => setNewIngredient({ stock_item_id: "", quantity_required: "", unit: "" })}
                  className="ui-btn flex-1"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-ink-muted text-ui bg-canvas rounded-panel border border-dashed border-line-strong">
          Select a menu item to manage its recipe
        </div>
      )}
      </div>
    </div>
  );
}

function MenuAvailabilityTab({ menuItems, loading, onUpdateAvailability, onAddQty, onDeduct, allCategories, units, searchQuery, onSearchChange }) {
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ availability: "", unit: "" });

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditForm({
      availability: item.availability || "",
      unit: item.unit || "",
    });
  };

  const handleSave = async (itemId) => {
    await onUpdateAvailability(itemId, editForm.availability, editForm.unit);
    setEditingItem(null);
    setEditForm({ availability: "", unit: "" });
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditForm({ availability: "", unit: "" });
  };

  // FIX #1: Helper function to get category name from UUID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return "—";
    const category = allCategories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  const [sortBy, setSortBy] = useState("name_asc");

  const filteredItems = useMemo(() => {
    let result = menuItems;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) =>
        `${item.name} ${item.description || ""} ${getCategoryName(item.category_id)}`
          .toLowerCase()
          .includes(q)
      );
    }

    return result;
  }, [menuItems, searchQuery, allCategories]);

  const menuColumnDefs = [
    {
      headerName: 'Menu Item',
      field: 'name',
      minWidth: 220,
      sortable: true,
      cellRenderer: (params) => (
        <div>
          <div className="font-bold text-ink text-ui">{params.data.name}</div>
          {params.data.description && (
            <div className="text-ui-sm text-ink-muted">{params.data.description}</div>
          )}
        </div>
      ),
    },
    {
      headerName: 'Category',
      colId: 'category',
      minWidth: 150,
      sortable: true,
      valueGetter: (params) => getCategoryName(params.data?.category_id),
      cellRenderer: (params) => <span className="text-ui text-ink-soft">{params.value}</span>,
    },
    {
      headerName: 'Availability',
      field: 'availability',
      minWidth: 140,
      sortable: true,
      cellRenderer: (params) =>
        editingItem === params.data.id ? (
          <input
            type="number"
            step="0.01"
            min="0"
            value={editForm.availability}
            onChange={(e) => setEditForm((prev) => ({ ...prev, availability: e.target.value }))}
            className="w-24 h-7 px-2 rounded-button-sm border border-brand-line bg-surface text-ui text-ink outline-none focus:border-brand-ring focus:shadow-focus-ring"
            placeholder="0"
          />
        ) : (
          <span className="text-ui text-ink-soft">{params.value || "—"}</span>
        ),
    },
    {
      headerName: 'Unit',
      field: 'unit',
      minWidth: 140,
      sortable: true,
      cellRenderer: (params) =>
        editingItem === params.data.id ? (
          <select
            value={editForm.unit}
            onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
            className="w-28 h-7 px-2 rounded-button-sm border border-brand-line bg-surface text-ui text-ink outline-none focus:border-brand-ring focus:shadow-focus-ring"
          >
            <option value="">Select unit</option>
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        ) : (
          <span className="text-ui text-ink-soft">{params.value || "—"}</span>
        ),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      minWidth: 260,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params) =>
        editingItem === params.data.id ? (
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => handleSave(params.data.id)}
              className="ui-btn ui-btn-add !h-7"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="ui-btn !h-7"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => onAddQty(params.data)}
              className="ui-btn ui-btn-update !h-7"
            >
              + Add Qty
            </button>
            <button
              onClick={() => onDeduct(params.data)}
              className="ui-btn ui-btn-delete !h-7"
            >
              Deduct
            </button>
          </div>
        ),
    },
  ];
  
  return (
    <div className="ui-panel !p-0 overflow-hidden">
 
      {loading ? (
        <div className="px-6 py-12 text-center text-ink-muted text-ui">Loading menu items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="px-6 py-12 text-center text-ink-muted text-ui">
          {searchQuery ? "No menu items match your search" : "No menu items found"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <AgGridTable
            columnDefs={menuColumnDefs}
            rowData={filteredItems}
            domLayout="normal"
            height={600}
            exportFileName="menu_availability"
            gridOptions={{ getRowId: (params) => String(params.data.id) }}
          />
        </div>
      )}
    </div>
  );
}

function StockModal({
  isOpen,
  isEditing,
  form,
  categories,
  inventoryCategories,
  units,
  onChange,
  onSave,
  onClose
}) {
  if (!isOpen) return null;

  // Auto-populate category when inventory is selected
  const handleInventoryChange = (inventoryId) => {
    const selectedInventory = inventoryCategories.find(inv => inv.id === inventoryId);
    onChange((prev) => ({
      ...prev,
      inventory_id: inventoryId,
      category: selectedInventory?.name || prev.category
    }));
  };

   return (
    <div className="ui-backdrop font-sans" onMouseDown={onClose}>
      <div className={`${DIALOG} max-w-lg`} role="dialog" aria-modal="true" aria-label={isEditing ? "Edit stock item" : "New stock item"} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h3 className="text-panel-title text-brand-dark">
            {isEditing ? "Edit Stock Item" : "New Stock Item"}
          </h3>
        </div>
 
        <div className="flex-1 overflow-y-auto px-modal py-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL}>Inventory *</label>
            <select
              required
              value={form.inventory_id}
              onChange={(e) => handleInventoryChange(e.target.value)}
              className={FIELD}
            >
              <option value="">Select Inventory</option>
              {inventoryCategories.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.name}</option>
              ))}
            </select>
          </div>
 
          <div>
            <label className={LABEL}>Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => onChange((prev) => ({ ...prev, name: e.target.value }))}
              className={FIELD}
            />
          </div>
 
          <div>
            <label className={LABEL}>Category</label>
            <input
              list="categories"
              value={form.category}
              onChange={(e) => onChange((prev) => ({ ...prev, category: e.target.value }))}
              className={FIELD}
              placeholder="Auto-filled from inventory"
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            <p className="text-ui-sm text-ink-muted mt-1">
              Defaults to inventory name, can be customized
            </p>
          </div>
 
          <div>
            <label className={LABEL}>Availability</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.availability}
              onChange={(e) => onChange((prev) => ({ ...prev, availability: e.target.value }))}
              className={FIELD}
            />
          </div>
 
          <div>
            <label className={LABEL}>Unit</label>
            <select
              value={form.unit}
              onChange={(e) => onChange((prev) => ({ ...prev, unit: e.target.value }))}
              className={FIELD}
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
 
          <div className="sm:col-span-2">
            <label className={LABEL}>Unit Price (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.unit_price}
              onChange={(e) => onChange((prev) => ({ ...prev, unit_price: e.target.value }))}
              className={FIELD}
            />
          </div>
 
          <div className="sm:col-span-2">
            <label className={LABEL}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className={AREA}
            />
          </div>
        </div>
        </div>
 
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="ui-btn ui-btn-add"
          >
            {isEditing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryModal({ isOpen, form, onChange, onSave, onClose }) {
  if (!isOpen) return null;

   return (
    <div className="ui-backdrop font-sans" onMouseDown={onClose}>
      <div className={`${DIALOG} max-w-lg`} role="dialog" aria-modal="true" aria-label="Add inventory category" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h3 className="text-panel-title text-brand-dark">
            Add Inventory Category
          </h3>
        </div>
 
        <div className="flex-1 overflow-y-auto px-modal py-card space-y-4">
          <div>
            <label className={LABEL}>
              Category ID (optional)
            </label>
            <input
              value={form.id}
              onChange={(e) => onChange((prev) => ({ ...prev, id: e.target.value }))}
              placeholder="Auto-generated if left empty"
              className={FIELD}
            />
            <p className="text-ui-sm text-ink-muted mt-1">
              If empty, will use lowercase name with underscores
            </p>
          </div>
 
          <div>
            <label className={LABEL}>
              Category Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => onChange((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Beverages, Dairy, etc."
              className={FIELD}
            />
          </div>
 
          <div>
            <label className={LABEL}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe this inventory category..."
              className={AREA}
            />
          </div>
 
          <div>
            <label className={LABEL}>
              Subcategories (optional)
            </label>
            <input
              value={form.subcategories}
              onChange={(e) => onChange((prev) => ({ ...prev, subcategories: e.target.value }))}
              placeholder="Comma-separated subcategory IDs"
              className={FIELD}
            />
            <p className="text-ui-sm text-ink-muted mt-1">
              e.g., soft_drinks,juices,water
            </p>
          </div>
 
          <div className="bg-brand-tint border border-brand-line rounded-panel p-3">
            <p className="text-ui text-ink-soft">
              <strong className="text-brand-dark">Note:</strong> This will create a subcategory under the existing "inventory" category.
            </p>
          </div>
        </div>
 
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="ui-btn ui-btn-add"
          >
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
}


function AddStockModal({ isOpen, form, units, onChange, onSave, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="ui-backdrop font-sans" onMouseDown={onClose}>
      <div className={`${DIALOG} max-w-md`} role="dialog" aria-modal="true" aria-label="Add stock quantity" onMouseDown={(e) => e.stopPropagation()}>
        <div className="px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h3 className="text-panel-title text-brand-dark">Add Stock Quantity</h3>
          <p className="text-micro text-ink-muted mt-0.5">
            Adding stock to: <span className="font-bold text-ink-soft">{form.stock_name}</span>
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-modal py-card space-y-4">
          <div>
            <label className={LABEL}>Quantity to Add *</label>
            <input
              type="number" step="0.01" min="0.01" autoFocus
              value={form.quantity}
              onChange={(e) => onChange(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="e.g. 50"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Unit</label>
            <select
              value={form.unit}
              onChange={(e) => onChange(prev => ({ ...prev, unit: e.target.value }))}
              className={FIELD}
            >
              <option value="">Select unit</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Remarks (optional)</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => onChange(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="e.g. Weekly restock, Supplier batch #42"
              className={FIELD}
            />
          </div>
          <div className="bg-state-reserved-bg border border-state-reserved/30 rounded-panel p-3 text-ui text-ink-soft">
            This records an <strong>IN transaction</strong> and updates the live stock level.
            It will <em>not</em> create a duplicate item.
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button type="button" onClick={onClose} className="ui-btn">Cancel</button>
          <button onClick={onSave} className="ui-btn ui-btn-add">Add Stock</button>
        </div>
      </div>
    </div>
  );
}

function DeductStockModal({ isOpen, form, units, onChange, onSave, onClose }) {
  if (!isOpen) return null;

   return (
    <div className="ui-backdrop font-sans" onMouseDown={onClose}>
      <div className={`${DIALOG} max-w-md`} role="dialog" aria-modal="true" aria-label="Deduct stock" onMouseDown={(e) => e.stopPropagation()}>
        <div className="px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h3 className="text-panel-title text-brand-dark">Deduct Stock</h3>
          <p className="text-micro text-ink-muted mt-0.5">
            Deducting from:{" "}
            <span className="font-bold text-ink-soft">{form.stock_name}</span>
          </p>
        </div>
 
        <div className="flex-1 overflow-y-auto px-modal py-card space-y-4">
          <div>
            <label className={LABEL}>
              Quantity to Deduct *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              autoFocus
              value={form.quantity}
              onChange={(e) => onChange((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="e.g. 10"
              className={FIELD}
            />
          </div>
 
          <div>
            <label className={LABEL}>Unit</label>
            <select
              value={form.unit}
              onChange={(e) => onChange((prev) => ({ ...prev, unit: e.target.value }))}
              className={FIELD}
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
 
          <div>
            <label className={LABEL}>
              Transaction Type *
            </label>
            <select
              value={form.transaction_type}
              onChange={(e) => onChange((prev) => ({ ...prev, transaction_type: e.target.value }))}
              className={FIELD}
            >
              <option value="RETURN">Return</option>
              <option value="CANCELLATION">Cancellation</option>
            </select>
          </div>
 
          <div>
            <label className={LABEL}>
              Reason
            </label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => onChange((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder="e.g. Customer returned item, Order cancelled"
              className={FIELD}
            />
          </div>
 
          <div className="bg-state-occupied-bg border border-state-occupied/30 rounded-panel p-3 text-ui text-state-occupied">
            This records an <strong>OUT transaction</strong> and reduces the live
            stock level. This action cannot be undone automatically.
          </div>
        </div>
 
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="ui-btn ui-btn-danger"
          >
            Deduct Stock
          </button>
        </div>
      </div>
    </div>
  );
}