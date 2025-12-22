// src/pages/StockRecipeManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function StockRecipeManager(props) {
  const params = useParams();
  const clientId = props.clientId || params.clientId || params.client_id;
  const token = props.token || localStorage.getItem("access_token");
  const realm = props.realm;

  const API_BASE_MENU = `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu`;
  const API_BASE_INVENTORY = `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory`;

  // auth helper
  const getAuthHeaders = () => ({ headers: { Authorization: token ? `Bearer ${token}` : "" } });

  // UI
  const [activeTab, setActiveTab] = useState("stock"); // 'stock'|'recipe'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Stocks
  const [stocks, setStocks] = useState([]);
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

  // Filters & search
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Suppliers & categories (fetched if available)
  const [categories, setCategories] = useState([]);

  // Bulk import preview
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkName, setBulkName] = useState("");

  // Recipe
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [recipe, setRecipe] = useState([]); // array of { stock_item_id, quantity_required, unit }
  const [recipeLineIds, setRecipeLineIds] = useState([]); // optional kept from backend
  const [newIngredient, setNewIngredient] = useState({ stock_item_id: "", quantity_required: "", unit: "" });

  // Pagination (client-side)
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  // ---- Helpers ----
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };

  // ---- Fetchers ----
  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_MENU}/read?client_id=${clientId}`, getAuthHeaders());
      const items = res.data?.data || [];

      // Filter only items with realm = 'inventory'
      const inventoryItems = items.filter((s) => s.realm === "inventory");

      setStocks(inventoryItems);

      // derive categories from filtered items
      const cats = Array.from(new Set(inventoryItems.map((s) => (s.category || "").toString()).filter(Boolean)));
      setCategories(cats);

    } catch (err) {
      console.error("fetchStocks:", err);
      showError("Failed to fetch stocks");
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(`${API_BASE_MENU}/read?realm=${realm}`, getAuthHeaders());
      setMenuItems(res.data?.data || []);
    } catch (err) {
      console.error("fetchMenuItems:", err);
    }
  };



  const fetchRecipe = async (menuId) => {
    if (!menuId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_MENU}/recipe/${menuId}?client_id=${clientId}`, getAuthHeaders());
      const data = res.data?.data || {};
      setRecipe(Array.isArray(data.recipe) ? data.recipe : []);
      setRecipeLineIds(Array.isArray(data.line_item_id) ? data.line_item_id : []);
    } catch (err) {
      console.error("fetchRecipe:", err);
      showError("Failed to fetch recipe");
      setRecipe([]);
      setRecipeLineIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    fetchStocks();
    fetchMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ---- Stock CRUD ----
  const openAddStock = () => {
    setStockForm({ id: null, name: "", description: "", category: "", availability: "", unit: "", unit_price: "" });
    setIsEditingStock(false);
    setIsStockModalOpen(true);
  };

  const openEditStock = (s) => {
    setStockForm({
      id: s.id,
      name: s.name || "",
      description: s.description || "",
      category: s.category || "",
      availability: s.availability || "",
      unit: s.unit || "",
      unit_price: s.unit_price || "",
    });
    setIsEditingStock(true);
    setIsStockModalOpen(true);
  };

  const handleSaveStock = async () => {
    // basic validation
    if (!stockForm.name) return showError("Name required");
    const payload = {
      ...stockForm,
      inventory_id: 2,
      // do not include created_by/updated_by here (per your request)
    };

    try {
      if (isEditingStock) {
        await axios.post(`${API_BASE_MENU}/stock/update`, payload, getAuthHeaders());
      } else {
        await axios.post(`${API_BASE_MENU}/stock/create?client_id=${clientId}`, payload, getAuthHeaders());
      }
      setIsStockModalOpen(false);
      await fetchStocks();
    } catch (err) {
      console.error("handleSaveStock:", err);
      showError("Failed to save stock");
    }
  };

  const handleDeleteStock = async (id) => {
    if (!window.confirm("Delete this stock item?")) return;
    try {
      // backend expects POST /delete with JSON body { id }
      await axios.post(`${API_BASE_MENU}/delete`, { id }, getAuthHeaders());
      await fetchStocks();
    } catch (err) {
      console.error("handleDeleteStock:", err);
      showError("Failed to delete stock");
    }
  };

  const realTimeStocks = useMemo(() => {
    return stocks.map((stock) => {
      let consumption = 0;


      recipe.forEach((r) => {
        if (Number(r.stock_item_id) === Number(stock.id)) {
          consumption += Number(r.quantity_required || 0);
        }
      });


      const physical = Number(stock.availability || 0);
      const effective = physical - consumption;
      const threshold = Number(5 || 0);


      let status = "HEALTHY";
      if (effective <= 0) status = "OUT";
      else if (effective <= threshold) status = "LOW";


      return {
        ...stock,
        effective_availability: effective,
        isLow: status !== "HEALTHY",
        stock_status: status,
        total_cost: effective * Number(stock.unit_price || 0),
      };
    });
  }, [stocks, recipe]);


  const filteredStocks = useMemo(() => {
    let list = realTimeStocks;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((s) => `${s.name} ${s.category}`.toLowerCase().includes(q));
    }
    if (categoryFilter !== "All") list = list.filter((s) => s.category === categoryFilter);
    if (showLowStockOnly) list = list.filter((s) => s.isLow);
    return list;
  }, [realTimeStocks, query, categoryFilter, showLowStockOnly]);

  const pageCount = Math.max(1, Math.ceil(filteredStocks.length / PAGE_SIZE));
  const pageItems = filteredStocks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ---- CSV helpers (robust enough for typical exports/imports) ----
  // Simple CSV parser that handles quoted values containing commas
  const parseCSVText = (text) => {
    const rows = [];
    const re = /("(?:[^"]|"")*"|[^,\n\r]*)(?:,|$)/g;
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const row = [];
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        let cell = m[1] || "";
        if (cell.startsWith('"') && cell.endsWith('"')) {
          cell = cell.slice(1, -1).replace(/""/g, '"');
        }
        row.push(cell);
        if (re.lastIndex >= line.length) break;
      }
      // skip empty rows
      if (row.length === 1 && row[0] === "") continue;
      rows.push(row);
    }
    return rows;
  };

  const escapeForCSV = (val) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  // ---- Stock CSV Import ----
  // expected headers: name,description,category,availability,unit,unit_price
  const handleStockCSVImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSVText(text);
        if (!rows.length) return showError("Empty CSV");
        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const dataRows = rows.slice(1).map((r) => {
          const obj = {};
          for (let i = 0; i < headers.length; i++) {
            obj[headers[i]] = r[i] ?? "";
          }
          return obj;
        });
        setBulkPreview(dataRows);
        setBulkName(file.name);
      } catch (err) {
        console.error("handleStockCSVImport:", err);
        showError("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const applyStockBulkImport = async () => {
    if (!bulkPreview.length) return showError("No rows to import");

    try {
      // STEP 1 → Delete old records first
      await axios.delete(
        `${API_BASE_MENU}/stock/delete_by_realm_inventory`,
        {
          params: {
            client_id: clientId,
            realm: "inventory",
            inventory_id: 2,
          },
          ...getAuthHeaders()
        }
      );

      // STEP 2 → Import rows one-by-one
      for (const row of bulkPreview) {
        const payload = {
          name: row.name?.trim() || "",
          description: row.description || "",
          category: row.category || "",
          availability: row.availability || 0,
          unit: row.unit || "",
          unit_price: row.unit_price || 0,
          inventory_id: 2,
          realm: "inventory",
          recipe: row.recipe ? JSON.parse(row.recipe) : null
        };

        await axios.post(`${API_BASE_MENU}/stock/create?client_id=${clientId}`, payload, getAuthHeaders());
      }

      // UI cleanup
      setBulkPreview([]);
      setBulkName("");
      await fetchStocks();

    } catch (err) {
      console.error("applyStockBulkImport:", err);
      showError("Bulk import failed");
    }
  };


  const handleExportStockCSV = () => {
    if (!stocks.length) return showError("No stock data to export");
    const headers = ["id", "name", "description", "category", "realm", "availability", "unit", "unit_price"];
    const lines = [headers.join(",")];
    stocks.forEach((s) => {
      const row = headers.map((h) => escapeForCSV(s[h] ?? ""));
      lines.push(row.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stocks_${clientId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Recipe operations (stored inside menu item) ----
  const handleSelectMenu = async (menuId) => {
    setSelectedMenuId(menuId);
    setRecipe([]);
    setRecipeLineIds([]);
    if (menuId) await fetchRecipe(menuId);
  };

  const handleAddIngredient = async () => {
    if (!selectedMenuId) return showError("Select a menu item");
    if (!newIngredient.stock_item_id) return showError("Select a stock item");
    const updated = Array.isArray(recipe) ? [...recipe, {
      stock_item_id: Number(newIngredient.stock_item_id),
      quantity_required: newIngredient.quantity_required || 0,
      unit: newIngredient.unit || ""
    }] : [{
      stock_item_id: Number(newIngredient.stock_item_id),
      quantity_required: newIngredient.quantity_required || 0,
      unit: newIngredient.unit || ""
    }];

    try {
      await axios.post(`${API_BASE_MENU}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}`, { recipe: updated }, getAuthHeaders());
      setNewIngredient({ stock_item_id: "", quantity_required: "", unit: "" });
      await fetchRecipe(selectedMenuId);
    } catch (err) {
      console.error("handleAddIngredient:", err);
      showError("Failed to add ingredient");
    }
  };

  const handleEditIngredient = async (index, updatedIngredient) => {
    if (!selectedMenuId) return;
    try {
      const copy = Array.isArray(recipe) ? [...recipe] : [];
      copy[index] = updatedIngredient;
      await axios.post(`${API_BASE_MENU}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}`, { recipe: copy }, getAuthHeaders());
      await fetchRecipe(selectedMenuId);
    } catch (err) {
      console.error("handleEditIngredient:", err);
      showError("Failed to save ingredient");
    }
  };

  const handleDeleteIngredient = async (index) => {
    if (!selectedMenuId) return;
    if (!window.confirm("Delete this ingredient?")) return;
    try {
      const copy = Array.isArray(recipe) ? recipe.filter((_, i) => i !== index) : [];
      await axios.post(`${API_BASE_MENU}/recipe/update?client_id=${clientId}&menu_item_id=${selectedMenuId}`, { recipe: copy }, getAuthHeaders());
      await fetchRecipe(selectedMenuId);
    } catch (err) {
      console.error("handleDeleteIngredient:", err);
      showError("Failed to delete ingredient");
    }
  };

  // ---- small helpers ----
  const resetStockForm = () => setStockForm({ id: null, name: "", description: "", category: "", availability: "", unit: "", unit_price: "" });

  // ---- UI ----
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="w-1.5 h-8 rounded bg-gradient-to-b bg-action-primary mb-2" />
            <h1 className="text-2xl font-semibold text-gray-900">Inventory & Recipe Manager</h1>
            <p className="text-sm text-gray-500 mt-1">Manage stocks and link ingredients to menu items</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded bg-white border shadow-sm overflow-hidden">
              <button
                className={`px-4 py-2 text-sm ${activeTab === "stock" ? "bg-action-primary text-white" : "bg-white text-gray-700"}`}
                onClick={() => setActiveTab("stock")}
              >
                Stock
              </button>
              <button
                className={`px-4 py-2 text-sm ${activeTab === "recipe" ? "bg-action-primary text-white" : "bg-white text-gray-700"}`}
                onClick={() => setActiveTab("recipe")}
              >
                Recipe
              </button>
            </div>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 border border-red-100">{error}</div>}

        {/* Controls */}
        <div className="bg-bg-primary p-4 rounded-xl shadow-sm border border-gray-100 mb-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-bg-primary border rounded px-3 py-2 shadow-sm w-full md:w-80">
              <input
                className="outline-none w-full text-sm"
                placeholder="Search stocks by name, category, description..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>

            <select className="border p-2 rounded text-sm" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
              <option value="All">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showLowStockOnly} onChange={(e) => setShowLowStockOnly(e.target.checked)} />
              Low stock only
            </label>
            <div className="flex items-center gap-2">
              <label className="sr-only">Import Stocks CSV</label>
              <input
                id="stock-import"
                type="file"
                accept=".csv"
                onChange={(e) => handleStockCSVImport(e.target.files?.[0])}
                className="text-sm"
              />
              <button
                onClick={applyStockBulkImport}
                className="px-3 py-1 rounded bg-action-primary text-white text-sm"
                disabled={!bulkPreview.length}
                title="Apply imported CSV rows"
              >
                Apply Import ({bulkPreview.length})
              </button>

              <button onClick={handleExportStockCSV} className="px-3 py-1 border rounded text-action-primary text-sm">Export CSV</button>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {/* STOCK TABLE */}
            {activeTab === "stock" && (
              <section className="bg-bg-primary rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Stock Items</h2>
                  <div className="flex gap-2">
                    <button onClick={openAddStock} className="px-3 py-2 rounded bg-gradient-to-r bg-action-primary  text-text-white text-sm">+ Add Stock</button>
                    <button onClick={fetchStocks} className="px-3 py-2 rounded bg-bg-primary border text-text-black">Refresh</button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-gray-500">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4">Avail</th>
                        <th className="py-2 pr-4">Unit</th>
                        <th className="py-2 pr-4">Unit Price</th>
                        <th className="py-2 pr-4">Total</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.length ? pageItems.map((s) => (
                        <tr key={s.id} className="border-t hover:bg-gray-50">
                          <td className="py-3 pr-4 w-1/3">
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-gray-400">{s.description}</div>
                          </td>
                          <td className="py-3 pr-4">{s.category || "-"}</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className={`${s.isLow ? "bg-red-100 text-red-600" : "bg-cardBackgrounds-bg6 text-green-600"} px-2 py-0.5 rounded-full text-xs`}>
                                {s.availability || 0}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">{s.unit || "-"}</td>
                          <td className="py-3 pr-4">₹{Number(s.unit_price || 0).toFixed(2)}</td>
                          <td className="py-3 pr-4">₹{Number(s.total_cost || 0).toFixed(2)}</td>
                          <td className="py-3 pr-4">
                            <div className="flex gap-2">
                              <button onClick={() => openEditStock(s)} className="px-2 py-1 text-sm rounded bg-white border">Edit</button>
                              <button onClick={() => handleDeleteStock(s.id)} className="px-2 py-1 text-sm rounded bg-red-50 text-red-700">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">No stocks found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">Showing {filteredStocks.length} results</div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 border rounded" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                    <div className="px-3 py-1 border rounded text-sm">{page} / {pageCount}</div>
                    <button className="px-2 py-1 border rounded" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</button>
                  </div>
                </div>

                {/* Stock modal */}
                {isStockModalOpen && (
                  <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30" onClick={() => { setIsStockModalOpen(false); resetStockForm(); }} />
                    <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 z-50">
                      <h3 className="text-lg font-semibold mb-3">{isEditingStock ? "Edit Stock Item" : "Add Stock Item"}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input placeholder="Name" value={stockForm.name} onChange={(e) => setStockForm((p) => ({ ...p, name: e.target.value }))} className="border p-2 rounded" />
                        <input placeholder="Availability" value={stockForm.availability} onChange={(e) => setStockForm((p) => ({ ...p, availability: e.target.value }))} className="border p-2 rounded" type="number" />
                        <input placeholder="Unit" value={stockForm.unit} onChange={(e) => setStockForm((p) => ({ ...p, unit: e.target.value }))} className="border p-2 rounded" />
                        <input placeholder="Unit Price" value={stockForm.unit_price} onChange={(e) => setStockForm((p) => ({ ...p, unit_price: e.target.value }))} className="border p-2 rounded" type="number" />
                        <input placeholder="Category" value={stockForm.category} onChange={(e) => setStockForm((p) => ({ ...p, category: e.target.value }))} className="border p-2 rounded" />
                      </div>
                      <div className="mt-4 flex gap-3 justify-end">
                        <button onClick={() => { setIsStockModalOpen(false); resetStockForm(); }} className="px-4 py-2 rounded bg-white border">Cancel</button>
                        <button onClick={handleSaveStock} className="px-4 py-2 rounded bg-gradient-to-r from-orange-500 to-orange-400 text-white">{isEditingStock ? "Update" : "Save"}</button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* RECIPE TAB */}
            {activeTab === "recipe" && (
              <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Recipe Builder</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-600">Select Menu Item</label>
                    <select className="w-full border p-2 rounded" value={selectedMenuId || ""} onChange={(e) => handleSelectMenu(e.target.value)}>
                      <option value="">-- Select Menu Item --</option>
                      {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Recipe Count</div>
                    <div className="text-lg font-semibold">{Array.isArray(recipe) ? recipe.length : 0}</div>
                  </div>
                </div>

                {selectedMenuId ? (
                  <>
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-gray-500">
                            <th className="py-2 pr-4">Stock Item</th>
                            <th className="py-2 pr-4">Quantity</th>
                            <th className="py-2 pr-4">Unit</th>
                            <th className="py-2 pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(recipe) && recipe.length ? recipe.map((r, idx) => {
                            const stock = stocks.find((s) => Number(s.id) === Number(r.stock_item_id));
                            return (
                              <tr key={idx} className="border-t hover:bg-gray-50">
                                <td className="py-3 pr-4 font-medium">{stock?.name || `#${r.stock_item_id}`}</td>
                                <td className="py-3 pr-4">{r.quantity_required}</td>
                                <td className="py-3 pr-4">{r.unit}</td>
                                <td className="py-3 pr-4">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const newQty = prompt("Quantity", String(r.quantity_required || ""));
                                        if (newQty !== null) {
                                          handleEditIngredient(idx, { ...r, quantity_required: newQty });
                                        }
                                      }}
                                      className="px-2 py-1 text-sm rounded bg-white border"
                                    >
                                      Edit
                                    </button>
                                    <button onClick={() => handleDeleteIngredient(idx)} className="px-2 py-1 text-sm rounded bg-red-50 text-red-700">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }) : (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-gray-400">No ingredients linked yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Add Ingredient</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <select className="border p-2 rounded" value={newIngredient.stock_item_id} onChange={(e) => setNewIngredient((p) => ({ ...p, stock_item_id: e.target.value }))}>
                          <option value="">Select Stock Item</option>
                          {stocks.map((si) => <option key={si.id} value={si.id}>{si.name}</option>)}
                        </select>

                        <input type="number" placeholder="Quantity required" className="border p-2 rounded" value={newIngredient.quantity_required} onChange={(e) => setNewIngredient((p) => ({ ...p, quantity_required: e.target.value }))} />

                        <input placeholder="Unit (g, ml, pcs)" className="border p-2 rounded" value={newIngredient.unit} onChange={(e) => setNewIngredient((p) => ({ ...p, unit: e.target.value }))} />

                        <div className="flex gap-2">
                          <button onClick={handleAddIngredient} className="px-3 py-2 rounded bg-gradient-to-r bg-action-primary text-white">+ Add Link</button>
                          <button onClick={() => setNewIngredient({ stock_item_id: "", quantity_required: "", unit: "" })} className="px-3 py-2 rounded bg-white border">Reset</button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">Tip: quantity and unit should match stock pricing unit for correct costing.</div>
                    </div>
                  </>
                ) : (
                  <div className="p-6 bg-white rounded-lg border border-gray-100 text-gray-500">Select a menu item to view and manage its recipe.</div>
                )}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm text-gray-700 font-medium mb-2">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setActiveTab("stock"); openAddStock(); }} className="px-3 py-2 rounded bg-gradient-to-r bg-action-primary  text-white">Add Stock</button>
                <button onClick={() => { setActiveTab("recipe"); }} className="px-3 py-2 rounded bg-white border">Open Recipe</button>
                <button onClick={() => { fetchStocks(); fetchMenuItems(); }} className="px-3 py-2 rounded bg-white border">Refresh All</button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm text-gray-700 font-medium mb-2">Stock Summary</h3>
              <div className="text-sm text-gray-500">Total stock items</div>
              <div className="text-xl font-semibold text-gray-900">{stocks.length}</div>
              <div className="text-xs text-gray-400 mt-2">Last updated: {new Date().toLocaleString()}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
