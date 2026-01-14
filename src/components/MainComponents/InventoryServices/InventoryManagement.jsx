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

  const [activeTab, setActiveTab] = useState("stock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  });
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isEditingStock, setIsEditingStock] = useState(false);

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

  // Data fetching
  useEffect(() => {
    if (!clientId) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStocks(), fetchMenuItems()]);
      setLoading(false);
    };

    loadData();
  }, [clientId]);

  useEffect(() => {
    if (activeTab === "menu-availability") {
      fetchMenuAvailability();
    }
  }, [activeTab]);

  const fetchStocks = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/read?client_id=${clientId}`,
        getAuthHeaders(token)
      );

      const inventoryItems = (res.data?.data || []).filter((item) => item.realm === "inventory");
      setStocks(inventoryItems);

      const uniqueCategories = [...new Set(inventoryItems.map((s) => s.category || "").filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error("fetchStocks failed:", err);
      setError("Failed to load inventory items");
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(
        `${API_CONFIG.baseMenu(clientId)}/read?realm=${realm}`,
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
        `${API_CONFIG.baseMenu(clientId)}/read?realm=${realm}`,
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
        `${API_CONFIG.baseMenu(clientId)}/recipe/${menuId}?client_id=${clientId}`,
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
      });
      setIsEditingStock(false);
    }
    setIsStockModalOpen(true);
  };

  const saveStock = async () => {
    if (!stockForm.name.trim()) return setError("Name is required");

    const payload = {
      ...stockForm,
      inventory_id: 2,
    };

    try {
      const url = isEditingStock
        ? `${API_CONFIG.baseMenu(clientId)}/stock/update`
        : `${API_CONFIG.baseMenu(clientId)}/stock/create?client_id=${clientId}`;

      await axios.post(url, payload, getAuthHeaders(token));
      setIsStockModalOpen(false);
      await fetchStocks();
    } catch (err) {
      console.error("saveStock failed:", err);
      setError("Failed to save stock item");
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
        `${API_CONFIG.baseMenu(clientId)}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}`,
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
        `${API_CONFIG.baseMenu(clientId)}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}`,
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
        `${API_CONFIG.baseMenu(clientId)}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}`,
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

  return (
    <div className="min-h-screen bg-gray-50/50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-8xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Inventory & Recipe Management
            </h1>
            <p className="mt-2 text-base text-gray-600">
              Manage stock items, recipes, and menu availability
            </p>
          </div>

          <div className="flex gap-3">
            <button
             className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === "stock"
              ? 'bg-action-primary text-text-white shadow-sm'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
              }`}
              onClick={() => setActiveTab("stock")}
            >
              Stock
            </button>
            <button
             className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === "recipe"
              ? 'bg-action-primary text-text-white shadow-sm'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
              }`}
              onClick={() => setActiveTab("recipe")}
            >
              Recipe
            </button>
            <button
             className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === "menu-availability"
              ? 'bg-action-primary text-text-white shadow-sm'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
              }`}
              onClick={() => setActiveTab("menu-availability")}
            >
              Menu Availability
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between text-base">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-action-primary  hover:text-action-primary font-medium text-2xl"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          <main className="lg:col-span-9 space-y-6">
            {activeTab === "stock" && (
              <StockTab
                stocks={filteredStocks}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddNew={() => openStockModal()}
                onEdit={openStockModal}
                onDelete={deleteStock}
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
              />
            )}

            {activeTab === "menu-availability" && (
              <MenuAvailabilityTab
                menuItems={filteredMenuItems}
                loading={loading}
                menuSearchQuery={menuSearchQuery}
                onSearchChange={setMenuSearchQuery}
                onUpdateAvailability={updateMenuAvailability}
              />
            )}
          </main>

          <aside className="lg:col-span-3 space-y-6">
            {activeTab === "stock" && (
              <div className="bg-bg-primary rounded-xl border border-gray-100 shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
                <div className="space-y-4">
                  <div>
                    {/* <label className="block text-base font-medium text-gray-700 mb-2">Category</label> */}
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
                        className="h-5 w-5 text-action-primary  focus:ring-action-primary border-gray-300 rounded"
                      />
                      <span className="text-base text-gray-700 font-medium">Low stock only</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-bg-primary rounded-xl border border-gray-100 shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Overview</h3>
              <div className="space-y-4 text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock items</span>
                  <span className="font-semibold text-gray-900">{stocks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Low stock</span>
                  <span className="font-semibold text-amber-600">
                    {enhancedStocks.filter((s) => s.isLow).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Menu items</span>
                  <span className="font-semibold text-gray-900">{menuItems.length}</span>
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
            });
          }}
        />
      )}
    </div>
  );
}

function StockTab({
  stocks,
  loading,
  searchQuery,
  onSearchChange,
  onAddNew,
  onEdit,
  onDelete,
}) {
  return (
    <div className="bg-bg-primary rounded-xl shadow border border-gray-100 overflow-hidden">
      <div className="bg-action-primary p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name, category, description..."
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-action-primary focus:border-action-primary"
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
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-base">No stock items found</td>
              </tr>
            ) : (
              stocks.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900 text-base">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.description || "—"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">{item.category || "—"}</td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-base font-medium">
                    <button onClick={() => onEdit(item)} className="text-action-primary hover:text-action-primary  mr-4">Edit</button>
                    <button onClick={() => onDelete(item.id)} className="text-action-primary hover:text-action-primary">Delete</button>
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
                          <input
                            value={ing.unit || ""}
                            onChange={(e) => onUpdateIngredient(index, "unit", e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="g/ml/pcs"
                          />
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
                <input
                  placeholder="Unit (g/ml/pcs)"
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
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

function MenuAvailabilityTab({ menuItems, loading, onUpdateAvailability }) {
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
                    {item.category || "—"}
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
                      <input
                        type="text"
                        value={editForm.unit}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, unit: e.target.value }))
                        }
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="kg, pcs"
                      />
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
                        className="text-indigo-600 hover:text-indigo-900"
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

function StockModal({ isOpen, isEditing, form, categories, onChange, onSave, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-primary rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          {isEditing ? "Edit Stock Item" : "New Stock Item"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
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
            <input
              value={form.unit}
              onChange={(e) => onChange((prev) => ({ ...prev, unit: e.target.value }))}
              placeholder="g / ml / pcs / kg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
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