import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

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
        `${API_CONFIG.baseMenu(clientId)}/read_category?client_id=${clientId}&category_id=units`,
        getAuthHeaders(token)
      );
      const data = res.data?.data || [];
      const unitsNode = Array.isArray(data) ? data.find((d) => d.id === "units") : data;
      const subCats = unitsNode?.subCategories || [];
      // subCategories may be objects {id, name, ...} or plain strings
      const unitList = subCats.map((u) => (typeof u === "string" ? u : u.id));
      setUnits(unitList);
    } catch (err) {
      console.error("fetchUnits failed:", err);
      // Fallback to standard units if API fails
      setUnits(["g", "kg", "ml", "litre", "pcs"]);
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
      setMenuItems(res.data?.data || []);
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
      setMenuAvailabilityList(res.data?.data || []);
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
  const openStockModal = (stock = null) => {
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
      await fetchStocks();
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
      await fetchStocks();
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
        `${API_CONFIG.baseMenu(clientId)}/update/avail`,
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
    <div className="min-h-screen bg-gray-50/50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-8xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex gap-3">
            <p className="text-3xl font-bold xl mt-2 text-base text-gray-600">
              Manage stock items, recipes, and menu availability
            </p>

            <button
              className="flex items-center gap-2 px-4 py-2 bg-action-primary hover:bg-action-primary text-text-white rounded-lg font-medium text-sm transition-all shadow-sm"
              onClick={openInventoryModal}
            >
              + Add Inventory
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">

            {/* Dynamic Inventory Tabs */}
            {inventoryCategories.map((category) => (
              <button
                key={category.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === category.id
                  ? 'bg-action-primary text-text-white shadow-sm'
                  : 'bg-bg-tertiary text-text-secondary  hover:text-gray-900 border border-gray-300'
                  }`}
                onClick={() => setActiveTab(category.id)}
              >
                {category.name}
              </button>
            ))}

            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === "recipe"
                ? 'bg-action-primary text-text-white shadow-sm'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                }`}
              onClick={() => setActiveTab("recipe")}
            >
              Recipe
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between text-base">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-action-primary hover:text-action-primary font-medium text-2xl"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          <main className="lg:col-span-9 space-y-6">
            {/* Dynamic Inventory Category Tabs */}
            {inventoryCategories.some(cat => cat.id === activeTab) && activeTab !== "menu" && (
              <InventoryCategoryTab
                category={inventoryCategories.find(cat => cat.id === activeTab)}
                stocks={getStocksForInventory(activeTab)}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddNew={() => {
                  setStockForm(prev => ({ ...prev, inventory_id: activeTab }));
                  openStockModal();
                }}
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
                allCategories={allCategories}
                units={units}
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

          <aside className="lg:col-span-3 space-y-6">
            {inventoryCategories.some(cat => cat.id === activeTab) && (
              <div className="bg-bg-primary rounded-xl border border-gray-100 shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
                <div className="space-y-4">
                  <div>
                    <select
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lowStockOnly}
                        onChange={(e) => setLowStockOnly(e.target.checked)}
                        className="h-5 w-5 text-action-primary focus:ring-action-primary border-gray-300 rounded"
                      />
                      <span className="text-base text-gray-700 font-medium">Low stock only</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-bg-primary rounded-xl border border-gray-100 shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {getCurrentInventoryOverview.inventoryName ? `${getCurrentInventoryOverview.inventoryName} Overview` : 'Overview'}
              </h3>
              <div className="space-y-4 text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock items</span>
                  <span className="font-semibold text-gray-900">{getCurrentInventoryOverview.stockCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Low stock</span>
                  <span className="font-semibold text-amber-600">
                    {getCurrentInventoryOverview.lowStockCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Menu items</span>
                  <span className="font-semibold text-gray-900">{getCurrentInventoryOverview.menuCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inventories</span>
                  <span className="font-semibold text-purple-600">{getCurrentInventoryOverview.inventoryCount}</span>
                </div>
                <div className="text-sm text-gray-500 pt-3 border-t border-gray-100">
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

  return (
    <div className="bg-bg-primary rounded-xl shadow border border-gray-100 overflow-hidden">
      <div className="bg-action-primary p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{category.name}</h2>
          {category.description && (
            <p className="text-sm text-purple-100 mt-2">{category.description}</p>
          )}
        </div>
        <div className="flex-1 max-w-md ml-4">
          <input
            type="text"
            placeholder="Search stocks..."
            className="w-full px-4 py-3 text-base border border-purple-300 rounded-lg focus:ring-2 focus:ring-white focus:border-white"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button
          onClick={onAddNew}
          className="ml-4 px-6 py-3 bg-action-primary border border-black-600 hover:bg-action-primary  text-text-white rounded-lg text-base font-semibold transition-colors"
        >
          + Add Stock
        </button>
      </div>

      <div className="overflow-auto max-h-[600px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Item</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Availability</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-bg-primary divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-base">Loading...</td>
              </tr>
            ) : stocks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-base">
                  No stock items found. Click "Add Stock" to create one.
                </td>
              </tr>
            ) : (
              stocks.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900 text-base">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-gray-500">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600"> {getCategoryName(item.category_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full ${item.status === "out" ? "bg-red-100 text-red-800" :
                      item.status === "low" ? "bg-amber-100 text-amber-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                      {item.effectiveAvailability}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">{item.unit || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-700">
                    ₹{(Number(item.unit_price) || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-4">
                      <button
                        onClick={() => onAddQty(item)}
                        className="text-green-700 hover:text-green-900 border border-green-300 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                      >
                        + Add Qty
                      </button>
                      <button
                        onClick={() => onDeduct(item)}
                        className="text-red-700 hover:text-red-900 border border-red-300 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                      >
                        Deduct
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="text-action-primary hover:text-action-primary mr-4 border gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-action-primary hover:text-action-primary border gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
  return (
    <div className="bg-bg-primary rounded-xl shadow border border-gray-100">
      <div className="bg-action-primary p-3 grid md:grid-cols-2 lg:grid-cols-3 rounded-xl gap-4 mb-2">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-text-white mb-1">Menu Item</label>
          <select
            className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
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
          <label className="block text-sm font-medium text-text-white mb-1">Ingredients</label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-lg font-medium text-gray-900">
            {recipe.length}
          </div>
        </div>
      </div>

      {selectedMenuId ? (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-bg-primary divide-y divide-gray-200">
                {recipe.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No ingredients added yet</td>
                  </tr>
                ) : (
                  recipe.map((ing, index) => {
                    const stockItem = stocks.find((s) => Number(s.id) === Number(ing.stock_item_id));
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {stockItem?.name || `Item #${ing.stock_item_id}`}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ing.quantity_required}
                            onChange={(e) => onUpdateIngredient(index, "quantity_required", e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={ing.unit || ""}
                            onChange={(e) => onUpdateIngredient(index, "unit", e.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Unit</option>
                            {units.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onDeleteIngredient(index)}
                            className="text-action-primary hover:text-action-primary text-sm font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
            <h4 className="text-base font-medium text-gray-800 mb-4">Add Ingredient</h4>
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div>
                <select
                  value={newIngredient.stock_item_id}
                  onChange={(e) => setNewIngredient((prev) => ({ ...prev, stock_item_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="flex-1 py-2 px-4 bg-action-primary hover:bg-action-primary text-text-white rounded-lg transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setNewIngredient({ stock_item_id: "", quantity_required: "", unit: "" })}
                  className="flex-1 py-2 px-4 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          Select a menu item to manage its recipe
        </div>
      )}
    </div>
  );
}

function MenuAvailabilityTab({ menuItems, loading, onUpdateAvailability, allCategories, units }) {
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

  return (
    <div className="bg-bg-primary rounded-xl shadow border border-gray-100 overflow-hidden">
      <div className="bg-action-primary p-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-text-white">Menu Availability</h2>
        <p className="text-sm text-text-white mt-1">Manage availability and units for menu items</p>
      </div>

      {loading ? (
        <div className="px-6 py-12 text-center text-gray-500">Loading menu items...</div>
      ) : menuItems.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-500">No menu items found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Menu Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Availability
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-bg-primary divide-y divide-gray-200">
              {menuItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-gray-500">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getCategoryName(item.category_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.availability}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, availability: e.target.value }))
                        }
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">
                        {item.availability || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingItem === item.id ? (
                      <select
                        value={editForm.unit}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, unit: e.target.value }))
                        }
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select unit</option>
                        {units.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-900">{item.unit || "—"}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingItem === item.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSave(item.id)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-action-primary hover:text-action-primary mr-4 border gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-primary rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          {isEditing ? "Edit Stock Item" : "New Stock Item"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Inventory *</label>
            <select
              required
              value={form.inventory_id}
              onChange={(e) => handleInventoryChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Inventory</option>
              {inventoryCategories.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => onChange((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              list="categories"
              value={form.category}
              onChange={(e) => onChange((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Auto-filled from inventory"
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            <p className="text-xs text-gray-500 mt-1">
              Defaults to inventory name, can be customized
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.availability}
              onChange={(e) => onChange((prev) => ({ ...prev, availability: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => onChange((prev) => ({ ...prev, unit: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.unit_price}
              onChange={(e) => onChange((prev) => ({ ...prev, unit_price: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2.5 bg-action-primary text-text-white rounded-lg transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-primary rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Add Inventory Category
        </h3>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category ID (optional)
            </label>
            <input
              value={form.id}
              onChange={(e) => onChange((prev) => ({ ...prev, id: e.target.value }))}
              placeholder="Auto-generated if left empty"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              If empty, will use lowercase name with underscores
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => onChange((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Beverages, Dairy, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe this inventory category..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategories (optional)
            </label>
            <input
              value={form.subcategories}
              onChange={(e) => onChange((prev) => ({ ...prev, subcategories: e.target.value }))}
              placeholder="Comma-separated subcategory IDs"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., soft_drinks,juices,water
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will create a subcategory under the existing "inventory" category.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-primary rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">Add Stock Quantity</h3>
        <p className="text-sm text-gray-500 mb-6">
          Adding stock to: <span className="font-medium text-gray-800">{form.stock_name}</span>
        </p>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add *</label>
            <input
              type="number" step="0.01" min="0.01" autoFocus
              value={form.quantity}
              onChange={(e) => onChange(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="e.g. 50"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => onChange(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select unit</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => onChange(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="e.g. Weekly restock, Supplier batch #42"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            This records an <strong>IN transaction</strong> and updates the live stock level.
            It will <em>not</em> create a duplicate item.
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onSave} className="px-6 py-2.5 bg-action-primary text-text-white rounded-lg transition-colors">Add Stock</button>
        </div>
      </div>
    </div>
  );
} 

function DeductStockModal({ isOpen, form, units, onChange, onSave, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-primary rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">Deduct Stock</h3>
        <p className="text-sm text-gray-500 mb-6">
          Deducting from:{" "}
          <span className="font-medium text-gray-800">{form.stock_name}</span>
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => onChange((prev) => ({ ...prev, unit: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400"
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type *
            </label>
            <select
              value={form.transaction_type}
              onChange={(e) => onChange((prev) => ({ ...prev, transaction_type: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400"
            >
              <option value="RETURN">Return</option>
              <option value="CANCELLATION">Cancellation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => onChange((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder="e.g. Customer returned item, Order cancelled"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400"
            />
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            This records an <strong>OUT transaction</strong> and reduces the live
            stock level. This action cannot be undone automatically.
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Deduct Stock
          </button>
        </div>
      </div>
    </div>
  );
}