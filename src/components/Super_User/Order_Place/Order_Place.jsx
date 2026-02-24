import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, Search, Users, Package, Trash2, ArrowLeft, FileText, Printer as PrinterIcon, Clock } from 'lucide-react';
import axios from 'axios';
import Category from './Category';
import ImagePreview from '../../utils/ImagePreview';
import { Eye, Lock, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import InvoiceModal from '../../MainComponents/BillingServices/InvoiceModal';
import { getMenuConfig } from '../../utils/menuConfigResolver';
import { useTenant } from '../../../context/TenantContext';
import RestaurantSelector from './RestaurantSelector';

// ─── Status badge helper ─────────────────────────────────────────────────────
const ItemStatusBadge = ({ status }) => {
  const cfg = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending' },
    preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Preparing' },
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
    served: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Served' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status || '—' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

// ─── Modals ───────────────────────────────────────────────────────────────────
const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithSelectedAddons, onAddMainOnly }) => {
  const [selectedAddons, setSelectedAddons] = useState([]);
  useEffect(() => { if (isOpen) setSelectedAddons([]); }, [isOpen]);
  const toggleAddon = id => setSelectedAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg max-w-lg w-full p-6 bg-bg-primary max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
        <p className="mb-4 text-text-secondary">Select add-ons:</p>
        <div className="space-y-2 mb-6">
          {lineItems.map(item => (
            <div key={item.id} onClick={() => toggleAddon(item.id)}
              className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all
                ${selectedAddons.includes(item.id) ? 'bg-action-primary/10 border-2 border-action-primary' : 'bg-bg-tertiary border border-border-default hover:border-action-primary/50'}`}>
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedAddons.includes(item.id) ? 'bg-action-primary border-action-primary' : 'border-gray-300'}`}>
                  {selectedAddons.includes(item.id) && <Check size={14} className="text-white" />}
                </div>
                <span className="text-text-primary font-medium">{item.name}</span>
              </div>
              <span className="font-semibold text-action-primary">₹{item.unit_price}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border-default bg-bg-tertiary text-text-primary hover:bg-gray-100">Cancel</button>
          <button onClick={onAddMainOnly} className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700">Main Only</button>
          <button onClick={() => onAddWithSelectedAddons(selectedAddons)} disabled={selectedAddons.length === 0}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${selectedAddons.length > 0 ? 'bg-action-primary text-white hover:bg-action-danger' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            Add ({selectedAddons.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-600">Delete Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-5"><p className="text-sm text-gray-700">Are you sure? This cannot be undone.</p></div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main TakeOrder component ─────────────────────────────────────────────────
const Order_Place = ({ token, onOrderUpdate, realm }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(true);
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedMainItem, setSelectedMainItem] = useState(null);
  const [lineItemsDetails, setLineItemsDetails] = useState([]);
  const [orderMode, setOrderMode] = useState('takeaway');
  const [takeawayTableId, setTakeawayTableId] = useState(null);
  const isPlacingRef = useRef(false);
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentView, setCurrentView] = useState('floor');
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeDineinOrderId, setActiveDineinOrderId] = useState(null);
  const [hasNewItems, setHasNewItems] = useState(false);
  const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
  const [tableOrders, setTableOrders] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [dieterySubCategories, setDieterySubCategories] = useState([]);
  const [sidebarCategories, setSidebarCategories] = useState([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrderData, setInvoiceOrderData] = useState(null);
  const [inventoryMap, setInventoryMap] = useState({});
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const { clientId } = useTenant();
  const fetchIdRef = useRef(0);
  // ─── Utils ───────────────────────────────────────────────────────────────
  const flattenCategoryTree = (tree, level = 0, parentId = null) => {
    let flat = [];
    tree.forEach(c => {
      flat.push({ id: c.id, name: c.name, level, parentId, hasChildren: !!(c.subCategories?.length) });
      if (c.subCategories?.length) flat = flat.concat(flattenCategoryTree(c.subCategories, level + 1, c.id));
    });
    return flat;
  };

  const menuConfig = React.useMemo(() => clientId ? getMenuConfig(clientId) : null, [clientId]);

  const getAddonCategoryId = itemCategoryId => {
    let cur = itemCategoryId;
    while (cur) {
      const cat = categoriesFlat.find(c => c.id === cur);
      if (!cat) break;
      if (cat.id === 'AC_ROOT_ID') return 'addons_ac';
      if (cat.id === 'NON_AC_ROOT_ID') return 'addons_non_ac';
      cur = cat.parentId;
    }
    return 'addons_ac';
  };

  const getCategoryAndChildrenIds = (categories, targetId) => {
    const result = new Set();
    const traverse = (nodes, found = false) => {
      for (const n of nodes) {
        const isT = n.id === targetId;
        if (isT || found) result.add(n.id);
        if (n.children?.length) traverse(n.children, found || isT);
      }
    };
    traverse(categories);
    return Array.from(result);
  };

  const findCategoryNode = (tree, matcher) => {
    for (const c of tree) {
      if (c.id?.toLowerCase() === matcher.toLowerCase() || c.name?.toLowerCase() === matcher.toLowerCase()) return c;
      if (c.children?.length) { const f = findCategoryNode(c.children, matcher); if (f) return f; }
    }
    return null;
  };

  const getCategoriesAtLevel = (node, tgt, cur = 0) => {
    if (!node) return [];
    if (cur === tgt) return [node];
    let r = [];
    for (const ch of node.children || []) r = r.concat(getCategoriesAtLevel(ch, tgt, cur + 1));
    return r;
  };

  const findNodeAndChildren = (nodes, id) => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children?.length) { const f = findNodeAndChildren(n.children, id); if (f) return f; }
    }
    return null;
  };

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchTables = async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } });
    const list = Array.isArray(res.data?.data) ? res.data.data.map(t => ({ ...t, table_number: t.name || t.table_number || "-" })) : [];
    const tw = list.find(t => Number(t.id) === 500); if (tw) setTakeawayTableId(tw.id);
    list.sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));
    setTables(list);
    await fetchTableOrders(list);
  };

  const fetchTableOrders = async (tableList) => {
    try {
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = r.data?.data || [];
      const map = {};
      tableList.forEach(table => {
        const s = table.status?.toLowerCase();
        if (s === 'occupied' || s === 'served') {
          const o = allOrders
            .filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          if (o) map[table.id] = {
            id: o.id,
            dinein_order_id: o.dinein_order_id,
            status: o.status,
            created_at: o.created_at,     // ★ root created_at (oldest)
            order_count: o.order_count || 1,
            total_price: o.total_price || 0,
          };
        }
      });
      setTableOrders(map);
    } catch (err) { console.error("Failed to fetch table orders:", err); }
  };

  const handleDeleteOrder = async (orderId, tableId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        { params: { dinein_order_id: orderId, client_id: clientId }, headers: { Authorization: `Bearer ${token}` } });
      const tableObj = tables.find(t => t.id === tableId);
      if (tableObj) await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
        { id: tableId, client_id: clientId, name: tableObj.name, table_type: tableObj.table_type, status: 'Vacant', location_zone: tableObj.location_zone },
        { headers: { Authorization: `Bearer ${token}` } });
      await fetchTables(); setShowDeleteConfirm(false); setOrderToDelete(null);
    } catch (err) { console.error(err); }
  };

  const handleMarkAsServed = async (orderId, tableId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: orderId, client_id: clientId, status: 'served' }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchTables();
    } catch (err) { console.error(err); }
  };

  const combineDuplicateItems = items => {
    const m = new Map();
    items.forEach(item => {
      const k = item.item_id.toString();
      if (m.has(k)) m.get(k).quantity += item.quantity || 0;
      else m.set(k, { ...item });
    });
    return Array.from(m.values());
  };

  const handlePrintBill = async (orderId, tableId) => {
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const order = (r.data?.data || []).find(o => o.id === orderId);
      if (!order) { return; }
      const enriched = (order.items || []).map(item => {
        const inv = inventoryMap[item.item_id] || {};
        return { ...item, unit_price: item.unit_price ?? inv.unit_price ?? 0, name: item.item_name ?? inv.name ?? "Unnamed Item" };
      });
      setInvoiceOrderData({ ...order, items: combineDuplicateItems(enriched) });
      setInvoiceModalOpen(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBillFromCart = async () => {
    if (!activeOrderId) { return; }
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const order = (r.data?.data || []).find(o => o.id === activeOrderId);
      if (!order) { return; }
      const enriched = (order.items || []).map(item => {
        const inv = inventoryMap[item.item_id] || {};
        return { ...item, unit_price: item.unit_price ?? inv.unit_price ?? 0, name: item.item_name ?? inv.name ?? "Unnamed" };
      });
      setInvoiceOrderData({ ...order, items: combineDuplicateItems(enriched) });
      setInvoiceModalOpen(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const onBack = e => { if (currentView === 'order') { e.preventDefault(); setCurrentView('floor'); setShowCart(false); window.history.pushState({ view: 'floor' }, ''); } };
    window.addEventListener('popstate', onBack); return () => window.removeEventListener('popstate', onBack);
  }, [currentView]);
  useEffect(() => { window.history.pushState({ view: 'floor' }, ''); }, []);

  useEffect(() => {
    if (!clientId || !token) return;

    const fetchId = ++fetchIdRef.current; // unique id for this fetch

    const fetchData = async () => {
      try {
        setLoading(true);

        // clear previous tenant immediately
        setMenuItems([]);
        setTables([]);
        setCategories([]);
        setCategoriesFlat([]);
        setSidebarCategories([]);
        setInventoryMap({});
        setCart([]);

        const menuConfig = getMenuConfig(clientId);
        if (!menuConfig) return;

        await fetchTables();

        const [catRes, itemRes, invRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?inventory_id=menu`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        // ⭐⭐⭐ IMPORTANT LINE ⭐⭐⭐
        if (fetchId !== fetchIdRef.current) return;
        // If user switched restaurant meanwhile → IGNORE this response

        const iMap = {};
        (invRes.data?.data || []).forEach(i => (iMap[i.id] = i));
        setInventoryMap(iMap);

        const fullTree = (catRes.data?.data || []).filter(c => c && c.name && c.name.toLowerCase() !== "all");

        const subIds = new Set();
        fullTree.forEach(c => (c.subCategories || []).forEach(s => subIds.add(s.id)));

        const topLevel = fullTree.filter(c => !subIds.has(c.id));
        // convert backend category structure -> frontend tree
        const convertToTree = (nodes) => {
          return nodes.map(node => ({
            id: node.id,
            name: node.name,
            description: node.description,
            count: 0, // needed for POS category selection
            children: node.subCategories ? convertToTree(node.subCategories) : []
          }));
        };

        const categoryTree = convertToTree(topLevel);

        // ⭐ THIS IS WHAT YOU FORGOT
        setCategories(categoryTree);
        setSidebarCategories(categoryTree);
        const flatCats = flattenCategoryTree(topLevel);
        setCategoriesFlat(flatCats.map(c => ({
          id: c.id,
          name: (c.name || '').trim(),
          parentId: c.parentId ?? null
        })));

        const enriched = (itemRes.data?.data || []).map(item => {
          const cat = flatCats.find(c => c.id === item.category_id);
          return { ...item, category_name: cat?.name || "Uncategorized" };
        });

        setMenuItems(enriched);

      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        if (fetchId === fetchIdRef.current)
          setLoading(false);
      }
    };

    fetchData();
  }, [clientId, token]);
  useEffect(() => {
    if (!tables || tables.length === 0) return;

    const takeaway = tables.find(t => Number(t.id) === 500);

    if (takeaway) {
      setOrderMode('takeaway');
      setSelectedTable(takeaway.id.toString());
      setCurrentView('order');
      setShowCart(true);
    }
  }, [tables]);
  const selectedCategoryName = categoriesFlat.find(c => c.id === selectedCategoryId)?.name || "All Categories";
  useEffect(() => {
    console.log("CLIENT CHANGED:", clientId);
  }, [clientId]); useEffect(() => {
    console.log("FETCH EXECUTED");
  }, [menuConfig]);
  const getFilteredItems = () => {
    const q = (searchQuery || '').trim().toLowerCase();
    let items = menuItems;
    if (selectedCategoryId) { const ids = getCategoryAndChildrenIds(categories, selectedCategoryId); items = items.filter(i => ids.includes(i.category_id)); }
    if (!q) return items;
    return items.filter(i => (i.name || '').toLowerCase().includes(q) || (i.category_name || '').toLowerCase().includes(q) || String(i.code || '').toLowerCase().includes(q));
  };
  const filteredItems = getFilteredItems();

  // ─── Cart ops ─────────────────────────────────────────────────────────────
  const handleItemClick = item => {
    if (item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0) {
      const addonCatId = getAddonCategoryId(item.category_id);
      const lineItems = item.line_item_id.map(id => {
        const ai = menuItems.find(i => i.id === id); if (!ai) return null;
        const path = []; let cur = ai.category_id; const vis = new Set();
        while (cur && !vis.has(cur)) { vis.add(cur); const cat = categoriesFlat.find(c => c.id === cur); if (!cat) break; path.unshift(cat.id); cur = cat.parentId || cat.parent_id; }
        return path.includes(addonCatId) ? ai : null;
      }).filter(Boolean);
      if (lineItems.length > 0) { setSelectedMainItem(item); setLineItemsDetails(lineItems); setLineItemsModalOpen(true); }
      else addToCart(item);
    } else addToCart(item);
  };

  const addToCart = (item, parentItemKey = null) => {
    setHasNewItems(true);
    const ts = Date.now() + Math.random();
    const uKey = `${item.id}_${ts}`;
    let batch = currentBatchTimestamp;
    if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setCart(prev => [...prev, {
      id: Number(item.id), name: item.name, unit_price: item.unit_price || 0,
      image_id: item.image_id, discount: item.discount || 0, slug: item.slug,
      category: item.category_name, quantity: 1, note: "",
      frontend_unique_key: uKey, batch_timestamp: batch,
      is_new_item: true, saved_sub_order: false,
      parent_item_key: parentItemKey, is_addon: !!parentItemKey,
    }]);
    if (!isMobile) setShowCart(true);
  };

  const handleAddMainItemWithSelectedAddons = selectedAddonIds => {
    if (!selectedMainItem) return;
    const ts = Date.now() + Math.random(); const mKey = `${selectedMainItem.id}_${ts}`;
    let batch = currentBatchTimestamp; if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setCart(prev => [...prev, {
      id: Number(selectedMainItem.id), name: selectedMainItem.name, unit_price: selectedMainItem.unit_price || 0,
      image_id: selectedMainItem.image_id, discount: selectedMainItem.discount || 0, slug: selectedMainItem.slug,
      category: selectedMainItem.category_name, quantity: 1, note: "",
      frontend_unique_key: mKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false, has_addons: selectedAddonIds.length > 0,
    }]);
    lineItemsDetails.filter(i => selectedAddonIds.includes(i.id)).forEach(addon => {
      const ats = Date.now() + Math.random(); const aKey = `${addon.id}_${ats}`;
      setCart(prev => [...prev, {
        id: Number(addon.id), name: addon.name, unit_price: addon.unit_price || 0,
        image_id: addon.image_id, discount: addon.discount || 0, slug: addon.slug,
        category: addon.category_name, quantity: 1, note: "",
        frontend_unique_key: aKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false,
        parent_item_key: mKey, is_addon: true,
      }]);
    });
    setHasNewItems(true); setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]);
  };

  const handleAddMainItemOnly = () => {
    if (!selectedMainItem) return;
    const ts = Date.now() + Math.random(); const uKey = `${selectedMainItem.id}_${ts}`;
    let batch = currentBatchTimestamp; if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setHasNewItems(true);
    setCart(prev => [...prev, {
      id: Number(selectedMainItem.id), name: selectedMainItem.name || 'Unnamed Item', unit_price: selectedMainItem.unit_price || 0,
      image_id: selectedMainItem.image_id, discount: selectedMainItem.discount || 0, slug: selectedMainItem.slug,
      category: selectedMainItem.category_name, quantity: 1, note: "",
      frontend_unique_key: uKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false,
    }]);
    setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]);
    if (!isMobile) setShowCart(true);
  };

  const removeFromCart = (itemId, uniqueKey = null) => {
    setHasNewItems(true);
    if (uniqueKey) setCart(cart.filter(i => i.frontend_unique_key !== uniqueKey && i.parent_item_key !== uniqueKey));
    else setCart(cart.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId, change, uniqueKey = null) => {
    setHasNewItems(true);
    setCart(cart.map(item => {
      const match = uniqueKey ? item.frontend_unique_key === uniqueKey : item.id === itemId && !item.frontend_unique_key;
      if (match) { const q = item.quantity + change; return q > 0 ? { ...item, quantity: q } : null; }
      return item;
    }).filter(Boolean));
  };

  // ★ Total = sum of unit_price * qty (no GST/CST)
  const getTotalPrice = () => cart.reduce((t, i) => t + (i.unit_price || 0) * i.quantity, 0).toFixed(2);

  // ─── Place order ──────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (isPlacingRef.current || !canPlaceOrder) return;
    isPlacingRef.current = true; setIsPlacingOrder(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeOrderId && activeDineinOrderId) {
        const newOnly = cart.filter(i => i.is_new_item && !i.saved_sub_order);
        if (newOnly.length > 0) {
          const r = await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create-sub-order`,
            { items: newOnly.map(i => ({ item_id: i.id, item_name: i.name, quantity: i.quantity, unit_price: i.unit_price, line_total: i.unit_price * i.quantity, slug: i.slug, frontend_unique_key: i.frontend_unique_key })) },
            { headers, params: { client_id: clientId, parent_dinein_order_id: activeDineinOrderId } },
          );
        }
      } else {
        // ★ Fresh order — total = sum of items, no GST/CST
        const total = cart.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
        await axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
          {
            client_id: clientId, table_id: Number(takeawayTableId || 500),
            price: total, gst: 0, cst: 0, total_price: total,
            status: "pending",
            items: cart.map(i => ({ item_id: i.id, item_name: i.name, quantity: i.quantity, unit_price: i.unit_price, line_total: i.unit_price * i.quantity, status: "pending", slug: i.slug })),
          },
          { headers },
        );
        if (orderMode !== 'takeaway') {
          const tableToUpdate = tables.find(t => t.id.toString() === selectedTable);
          if (tableToUpdate) {
            await axios.post(
              `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
              { ...tableToUpdate, id: Number(selectedTable), status: "Occupied" },
              { headers }
            );
          }
        }
      }

      await fetchTables();
      setCart([]); setActiveOrderId(null); setActiveDineinOrderId(null);
      setShowCart(false); setCurrentView("floor"); setCurrentBatchTimestamp(null); setHasNewItems(false);
    } catch (err) { console.error("ORDER ERROR:", err); }
    finally { isPlacingRef.current = false; setIsPlacingOrder(false); }
  };

  const handleTableSelect = table => { setSelectedTable(table.id.toString()); setCurrentView('order'); window.history.pushState({ view: 'order' }, ''); };
  const handleTakeawaySelect = () => { setOrderMode('takeaway'); setSelectedTable(takeawayTableId.toString()); setCurrentView('order'); window.history.pushState({ view: 'order' }, ''); };
  const handleClearCart = () => { if (cart.length === 0) return; setShowClearConfirm(true); };
  const confirmClearCart = () => {
    setCart([]); setSelectedTable(''); setCurrentView('floor'); setShowCart(false); setShowClearConfirm(false);
    setActiveOrderId(null); setActiveDineinOrderId(null); setCurrentBatchTimestamp(null); setHasNewItems(false);
  };

  const handleViewOrder = async table => {
    if (menuItems.length === 0) { alert("Menu still loading..."); return; }
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = r.data?.data || [];
      const tableGroups = allOrders.filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed');
      if (tableGroups.length === 0) { alert('No active order'); return; }
      const activeOrder = tableGroups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      setActiveOrderId(activeOrder.id);
      setActiveDineinOrderId(activeOrder.dinein_order_id);
      setHasNewItems(false);
      setCurrentBatchTimestamp(null);

      // ★ All server items are old/read-only + carry item status for display
      const reconstructedCart = (activeOrder.items || []).map(item => {
        const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
        return {
          id: Number(item.item_id),
          name: item.item_name || menuItem?.name || 'Unnamed Item',
          unit_price: item.unit_price || menuItem?.unit_price || 0,
          quantity: item.quantity || 1,
          note: item.note || '',
          image_id: menuItem?.image_id,
          discount: menuItem?.discount || 0,
          slug: item.slug || menuItem?.slug,
          category: menuItem?.category_name,
          frontend_unique_key: item.frontend_unique_key,
          batch_timestamp: null,
          is_new_item: false,
          saved_sub_order: true,
          status: item.status || "pending",    // ★ item-level status
          batch_label: item.batch_label,            // ★ sub-order label
          sub_order_id: item.sub_order_id,
        };
      });

      setCart(reconstructedCart);
      setSelectedTable(table.id.toString());
      setCurrentView('order');
      setShowCart(true);
      window.history.pushState({ view: 'order' }, '');
    } catch (err) { console.error(err); alert('Failed to load order'); }
    finally { setLoading(false); }
  };

  const handleBackToTables = () => {
    setCart([]);
    setActiveOrderId(null);
    setActiveDineinOrderId(null);
    setCurrentBatchTimestamp(null);
    setHasNewItems(false);
  };

  // ─── Split cart ───────────────────────────────────────────────────────────
  const oldItems = cart.filter(i => !i.is_new_item || i.saved_sub_order);
  const newItems = cart.filter(i => i.is_new_item && !i.saved_sub_order);

  const groupedNewItems = newItems.reduce((acc, item) => { const b = item.batch_timestamp || 'default'; if (!acc[b]) acc[b] = []; acc[b].push(item); return acc; }, {});
  const batchTimestamps = Object.keys(groupedNewItems).sort();
  const canPlaceOrder = cart.length > 0 && !isPlacingOrder;
  const getGroupedCartItems = items => {
    const grouped = []; const processed = new Set();
    items.forEach(item => {
      if (processed.has(item.frontend_unique_key || item.id)) return;
      if (!item.is_addon && !item.parent_item_key) {
        const addons = items.filter(i => i.parent_item_key === item.frontend_unique_key);
        grouped.push({ main: { ...item }, addons });
        processed.add(item.frontend_unique_key || item.id);
        addons.forEach(a => processed.add(a.frontend_unique_key || a.id));
      }
    });
    return grouped;
  };

  // ─── Old item row (read-only) with status badge + batch label ────────────
  const OldItemRow = ({ group }) => {
    const { main, addons } = group;
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
              <ImagePreview clientId={clientId} imageId={main.image_id} token={token} alt={main.name}
                baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold truncate text-gray-800">{main.name}</h4>
              <p className="text-xs font-bold text-action-primary">₹{(main.unit_price - (main.discount || 0)).toFixed(2)}</p>
              {/* ★ Sub-order label + item status */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {main.batch_label && main.batch_label !== activeDineinOrderId && (
                  <span className="text-xs text-orange-500 font-mono font-semibold">#{main.batch_label}</span>
                )}
                {main.status && <ItemStatusBadge status={main.status} />}
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-500 self-center">×{main.quantity}</span>
        </div>
        {addons.map(addon => (
          <div key={addon.frontend_unique_key || addon.id} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-blue-50/50">
            <span className="text-xs text-blue-600">↳</span>
            <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
            <span className="text-xs font-semibold text-blue-600">₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}</span>
            <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">
     

      <div className="mx-auto px-2 py-2">
        <div className="grid lg:grid-cols-4 gap-1">
          {/* Category sidebar */}
          <div className="w-full lg:col-span-1">
            <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1"> <RestaurantSelector token={token} superClientId={clientId} />
              <Category categories={sidebarCategories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} defaultOpenAll />
            </div>
          </div>

          {/* Menu + cart */}
          <div className="lg:col-span-3 flex gap-2">
            {/* Menu grid */}
            <div className="transition-all duration-300 border-default border-border-default p-2 rounded-lg flex-1 overflow-y-auto h-[calc(98dvh-4rem)] lg:h-auto lg:max-h-[calc(98dvh-4rem)]">
              <div className="space-y-2">
                <div className="flex items-center justify-between lg:flex-row flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={handleBackToTables} className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary"><ArrowLeft size={20} /></button>
                    <h2 className="text-xl font-semibold text-text-primary truncate">{selectedCategoryName}<span className="text-sm ml-2">({filteredItems.length})</span></h2>
                  </div>
                  <div className="relative w-64 max-w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary" />
                  </div>
                </div>
              </div>

              <div className={`grid gap-2 grid-cols-2 md:grid-cols-4 ${showCart ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                {filteredItems.map(item => {
                  const dp = item.discount && item.unit_price && Number(item.discount) > 0 ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(0) : null;
                  const ac = item.line_item_id?.length || 0;
                  return (
                    <div onClick={() => handleItemClick(item)} key={item.id}
                      className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-1 shadow-sm hover:shadow-md transition cursor-pointer">
                      <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        <ImagePreview clientId={clientId} imageId={item.image_id} token={token} alt={item.name}
                          baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                          urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                          className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-text-primary line-clamp-2">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {dp ? (<><span className="text-sm font-bold text-action-primary">₹{(item.unit_price - item.discount).toFixed(0)}</span><span className="text-xs line-through text-text-secondary">₹{item.unit_price}</span><span className="text-xs text-action-danger font-semibold">{dp}% OFF</span></>) :
                            (<span className="text-sm font-bold text-action-primary">₹{item.unit_price}</span>)}
                        </div>
                        {ac > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">+{ac} addon{ac > 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart panel */}
            {!isMobile && (
              <div className={`transition-all duration-300 ease-in-out ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0'}`}>
                <div className="border border-gray-300 rounded-xl bg-white shadow-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
                  <div className="flex flex-col h-full p-4">
                    {/* Cart header */}
                    <div className="pb-3 border-b space-y-2">
                      <h2 className="text-lg font-semibold text-gray-800">Your Order</h2>
                      <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          {orderMode === 'dinein' && selectedTable && (
                            <span className="font-semibold text-lg text-gray-700">{tables.find(t => t.id.toString() === selectedTable)?.table_number}</span>
                          )}
                          {activeDineinOrderId && <span className="text-xs text-gray-500 font-mono">#{activeDineinOrderId}</span>}
                        </div>
                        {/* ★ Total price — no GST/CST */}
                        <span className="text-base font-bold text-red-600">₹{getTotalPrice()}</span>
                      </div>
                    </div>

                    {/* Dine-in / takeaway toggle */}
                    <div className="mt-3">
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => { setOrderMode('takeaway'); setSelectedTable(takeawayTableId?.toString()); }} className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${orderMode === 'takeaway' ? 'bg-action-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}><Package size={16} />Your Items</button>
                      </div>
                    </div>

                    {cart.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No items added</div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                          {/* OLD items — read-only with status badge */}
                          {getGroupedCartItems(oldItems).map((group, idx) => (
                            <OldItemRow key={`old-${idx}`} group={group} />
                          ))}

                          {/* Divider */}
                          {activeOrderId && oldItems.length > 0 && newItems.length > 0 && (
                            <div className="flex items-center gap-2 my-2">
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
                              <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                              <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent" />
                            </div>
                          )}

                          {/* NEW items — editable */}
                          {batchTimestamps.map((ts, bi) => (
                            <React.Fragment key={ts}>
                              {bi > 0 && (
                                <div className="flex items-center gap-2 my-2">
                                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
                                  <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                                  <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent" />
                                </div>
                              )}
                              {getGroupedCartItems(groupedNewItems[ts]).map((group, idx) => (
                                <div key={`new-${ts}-${idx}`} className="space-y-1">
                                  <div className="flex items-center gap-2 p-3 rounded-xl border bg-orange-50 shadow-sm">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
                                        <ImagePreview clientId={clientId} imageId={group.main.image_id} token={token} alt={group.main.name}
                                          baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                                          urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                                          className="w-full h-full object-cover" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold truncate text-gray-800">{group.main.name}</h4>
                                        <p className="text-xs font-bold text-action-primary">₹{(group.main.unit_price - (group.main.discount || 0)).toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => updateQuantity(group.main.id, -1, group.main.frontend_unique_key)} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"><Minus size={14} /></button>
                                      <span className="w-6 text-center text-sm font-semibold">{group.main.quantity}</span>
                                      <button onClick={() => updateQuantity(group.main.id, 1, group.main.frontend_unique_key)} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => removeFromCart(group.main.id, group.main.frontend_unique_key)} className="text-action-primary hover:text-red-700"><X size={16} /></button>
                                  </div>
                                  {group.addons.map(addon => (
                                    <div key={addon.frontend_unique_key} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-orange-100/50">
                                      <span className="text-xs text-orange-600">↳</span>
                                      <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
                                      <span className="text-xs font-semibold text-orange-600">₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}</span>
                                      <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Cart actions */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button onClick={handlePlaceOrder}
                            className={`py-2 rounded-lg text-sm font-semibold ${canPlaceOrder && !isPlacingOrder ? 'bg-action-primary text-white hover:bg-action-danger' : 'bg-gray-300 cursor-not-allowed'}`}
                            disabled={!canPlaceOrder || isPlacingOrder}>
                            {isPlacingOrder ? 'Placing...' : 'Place Order'}
                          </button>
                          <button onClick={handleBillFromCart} className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"><FileText size={16} />Bill</button>
                          <button onClick={handleClearCart} className="py-2 border rounded-lg text-sm hover:bg-gray-100">Clear</button>
                          <button onClick={() => toast.info('Print KOT coming soon')} className="py-2 border rounded-lg text-sm hover:bg-gray-100 flex items-center justify-center gap-1"><PrinterIcon size={16} />Print KOT</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Modals */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-80 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Clear all items?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={confirmClearCart} className="flex-1 py-2 bg-action-primary text-white rounded-lg hover:bg-action-danger">Clear</button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40"><ShoppingCart size={24} /></button>
      )}

      <LineItemsModal isOpen={lineItemsModalOpen} onClose={() => { setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]); }} mainItem={selectedMainItem} lineItems={lineItemsDetails} onAddMainOnly={handleAddMainItemOnly} onAddWithSelectedAddons={handleAddMainItemWithSelectedAddons} />
      <DeleteConfirmModal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setOrderToDelete(null); }} onConfirm={() => { if (orderToDelete) handleDeleteOrder(orderToDelete.orderId, orderToDelete.tableId); }} />

      {invoiceModalOpen && invoiceOrderData && (
        <InvoiceModal clientId={clientId} token={token} selectedOrder={invoiceOrderData}
          tablesMap={tables.reduce((m, t) => { m[t.id] = t; return m; }, {})} inventoryMap={inventoryMap}
          onClose={() => { setInvoiceModalOpen(false); setInvoiceOrderData(null); fetchTables(); }}
          onSave={id => { console.log('Invoice saved:', id); fetchTables(); }} />
      )}
    </div>
  );
};

export default Order_Place;