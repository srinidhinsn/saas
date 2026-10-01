import React, { useEffect, useState, useRef} from "react";
import axios from 'axios';
import { toast } from "react-toastify";
import Modal from "react-modal";
import {
  Filter, ShoppingBag,
  Users, Package, Truck, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { menuCache } from '../../utils/Menu-utils/menuCache';
Modal.setAppElement("#root");
import { getDateRangeFromPreset, DateRangeFilter } from '../../utils/dateRange';
import AgGridTable from '../../utils/AgGridTable';
import { Printer } from 'lucide-react';
import InvoiceModal from '../BillingServices/InvoiceModal';
import { useInvoiceModal, fetchBillingDocumentsMap } from '../../utils/BillingUtils';
import {
  OrderRowActions,
  CancelOrderConfirmModal,
  OldItemDeleteModal,
  OrderItemsViewModal,
  StatusBadge,
  getInitialOrderMode,
} from '../../utils/BillingUtils';

const normaliseItem = (item) => {
  if (item.quantity == null) {
    console.warn(`Item ${item.item_id} has no quantity`);
  }
  return {
    ...item,
    quantity: item.quantity ?? 0,
    unit_price: item.unit_price ?? item.price ?? 0,
  };
};
// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const OrderSummaryVisible = ({ clientId, token }) => {
  const navigate = useNavigate();
  const hasFetchedStaticRef = useRef(false);
  const hasFetchedOrdersRef = useRef(false);
  const inventoryMapRef = useRef({});
  const tablesMapRef = useRef({});

  // ── Data ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryMap, setInventoryMap] = useState({});
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [tables, setTables] = useState([]);

  // ── Singular filter state ─────────────────────────────────────────────────
  const todayDate = new Date().toISOString().split('T')[0];
  const [datePreset, setDatePreset] = useState('today');
  const [customFrom, setCustomFrom] = useState(todayDate);
  const [customTo, setCustomTo] = useState(todayDate);
  const [filterMode, setFilterMode] = useState(0);
  // Single order-mode selection — NOT multi-select
  const [selectedOrderMode, setSelectedOrderMode] = useState('all');

  // ── View modal ────────────────────────────────────────────────────────────
  const [viewOrder, setViewOrder] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // REQ: Cancel order modal (matches TakeOrder — reason required)
  const [cancelOrderModal, setCancelOrderModal] = useState({ isOpen: false, orderId: null });
  const [itemDeleteModal, setItemDeleteModal] = useState({ isOpen: false, item: null, orderId: null });

  // ── Order detail / edit modal (kept from original) ────────────────────────
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editOrderId, setEditOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState('items');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedMainItem, setSelectedMainItem] = useState(null);
  const [lineItemsDetails, setLineItemsDetails] = useState([]);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [billingDocMap, setBillingDocMap] = useState({});

  // ─────────────────────────────────────────────────────────────────────────
  // localStorage helpers (preserved exactly from original)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    tablesMapRef.current = tablesMap;
  }, [tablesMap]);

  const generateSlug = name => name.toLowerCase().replace(/[\s]+/g, '-');

  const getNewItemsFromStorage = (orderId) => {
    const arr = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`order_${orderId}_new_item_`)) {
        try {
          const raw = JSON.parse(localStorage.getItem(key));
          if (!raw) continue;
          const unique_key = raw.unique_key || raw.frontend_unique_key || raw.id || null;
          const batch_timestamp = raw.batch_timestamp
            ? Number(raw.batch_timestamp)
            : raw.batchTs ? Number(raw.batchTs) : null;
          const item_id = raw.item_id || raw.inventory_id || raw.inventoryId || raw.itemId || null;
          const added_at = raw.added_at || raw.added_at_frontend || raw.addedAt || raw.addedAtFrontend || null;
          const quantity = raw.quantity || 1;
          arr.push({ ...raw, unique_key, batch_timestamp, item_id, added_at, quantity });
        } catch (e) {
          console.error('parse localstorage new item', key, e);
        }
      }
    }
    return arr;
  };

  const getBatchesFromStorage = (orderId) => {
    const batchMap = new Map();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`order_${orderId}_batch_`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.timestamp && !batchMap.has(data.timestamp)) batchMap.set(data.timestamp, []);
        } catch (e) { /* ignore */ }
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`order_${orderId}_new_item_`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.batch_timestamp) {
            if (!batchMap.has(data.batch_timestamp)) batchMap.set(data.batch_timestamp, []);
            batchMap.get(data.batch_timestamp).push(data.item_id);
          }
        } catch (e) { console.error(e); }
      }
    }
    return Array.from(batchMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, item_ids]) => ({ timestamp, item_ids }));
  };

  const clearNewItemsStorage = (orderId) => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(`order_${orderId}_new_item_`) ||
          key.startsWith(`order_${orderId}_batch_`))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  };

  const slugify = str =>
    (str || '').toString().toUpperCase().replace(/[\s]+/g, '-').replace(/[^A-Z0-9-_]/g, '');

  const ensureBatchForOrder = (orderId, tableName) => {
    let bt = currentBatchTimestamp;
    if (!bt) {
      bt = Date.now();
      setCurrentBatchTimestamp(bt);
    }
    const storageKey = `order_${orderId}_batch_${bt}`;
    let meta = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        meta = JSON.parse(raw);
      } else {
        let seq = 1;
        const seqKey = `order_${orderId}_batch_seq`;
        const prevSeqRaw = localStorage.getItem(seqKey);
        if (prevSeqRaw) {
          const prev = parseInt(prevSeqRaw, 10);
          if (!isNaN(prev)) seq = prev + 1;
        }
        const now = new Date(bt);
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeLabel = `${hh}-${mm}`;
        meta = {
          timestamp: bt,
          started_at: Date.now(),
          seq,
          table_slug: slugify(tableName || ''),
          time_label: timeLabel,
          added_count: 0,
        };
        localStorage.setItem(storageKey, JSON.stringify(meta));
        localStorage.setItem(seqKey, String(seq));
      }
    } catch (e) {
      console.error('ensureBatchForOrder error', e);
    }
    return { storageKey, meta };
  };

  const generateFrontendKeyFromBatch = (orderId, batchMeta) => {
    const tableSlug = batchMeta.table_slug || 'TBL';
    const timeLabel = batchMeta.time_label || '00-00';
    const itemsCount = batchMeta.added_count || 0;
    const seq = batchMeta.seq || 1;
    return `${tableSlug}_${timeLabel}_${itemsCount}_${orderId}_${seq}`;
  };

  const { invoiceModalOpen, invoiceOrderData, openInvoiceForOrder, closeInvoiceModal } =
  useInvoiceModal({ clientId, token, inventoryMap });

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch helpers
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clientId || !token) return;
    if (hasFetchedStaticRef.current) return;
    hasFetchedStaticRef.current = true;

    const fetchStaticData = async () => {
      const { list: tableList, map: tableMap } = await menuCache.fetchTables(clientId, token);
      setTables(tableList);
      setTablesMap(tableMap);

      const { list: menuList, map: menuMap } = await menuCache.fetchMenuItems(clientId, token);
      setAllInventoryItems(menuList);
      setInventoryMap(menuMap);
      inventoryMapRef.current = menuMap;
    };

    fetchStaticData();
  }, [clientId, token]);

  // ─────────────────────────────────────────────────────────────────────────
  // Item search for order-detail modal (preserved from original)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      !showOrderDetailModal ||
      !selectedOrder ||
      editOrderId !== selectedOrder?.id ||
      itemSearchQuery.trim() === ''
    ) {
      setItemSearchResults([]);
      return;
    }
    let filtered = allInventoryItems;
    if (selectedCategory) {
      filtered = filtered.filter(item => {
        const cats = item.categories || [];
        return cats.some(cat => cat === selectedCategory || cat.id === selectedCategory);
      });
    }
    if (itemSearchQuery.trim()) {
      filtered = filtered.filter(it =>
        (it.name || '').toLowerCase().includes(itemSearchQuery.toLowerCase())
      );
    }
    setItemSearchResults(filtered);
  }, [
    itemSearchQuery, allInventoryItems,
    showOrderDetailModal, selectedOrder,
    editOrderId, selectedCategory,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // processOrder — merge backend items with localStorage batches
  // (preserved exactly from original)
  // ─────────────────────────────────────────────────────────────────────────

  const processOrder = (order) => {
    if (order.status === 'served') {
      clearNewItemsStorage(order.id);
      return {
        ...order,
        _fixedOrderMode: order._fixedOrderMode ?? getInitialOrderMode(order, tablesMapRef.current),
      };
    }

    const rawNewItems = getNewItemsFromStorage(order.id) || [];
    const storageByKey = new Map();
    const storageByBatchAndItem = new Map();

    rawNewItems.forEach(si => {
      if (!si) return;
      if (si.unique_key) storageByKey.set(String(si.unique_key), si);
      if (si.batch_timestamp && si.item_id) {
        const k = `${Number(si.batch_timestamp)}_${String(si.item_id)}`;
        if (!storageByBatchAndItem.has(k)) storageByBatchAndItem.set(k, []);
        storageByBatchAndItem.get(k).push(si);
      }
    });

    const backendUniqueKeys = new Set(
      (order.items || [])
        .filter(i => i.frontend_unique_key)
        .map(i => String(i.frontend_unique_key))
    );
    const oldItems = [];
    const batchItemsMap = new Map();

    const pushToBatch = (batchTs, itemObj) => {
      if (!batchTs) return;
      const ts = Number(batchTs);
      if (!batchItemsMap.has(ts)) batchItemsMap.set(ts, []);
      const existingIndex = batchItemsMap.get(ts).findIndex(
        x =>
          String(x.item_id) === String(itemObj.item_id) ||
          x.frontend_unique_key === itemObj.frontend_unique_key
      );
      if (existingIndex >= 0) {
        const ex = batchItemsMap.get(ts)[existingIndex];
        ex.quantity = (ex.quantity || 1) + (itemObj.quantity || 1);
        ex.line_total = (ex.unit_price || ex.price || 0) * ex.quantity;
        if (!ex.frontend_unique_key && itemObj.frontend_unique_key)
          ex.frontend_unique_key = itemObj.frontend_unique_key;
      } else {
        batchItemsMap.get(ts).push(itemObj);
      }
    };

    (order.items || []).forEach(item => {
      const backendKey = item.frontend_unique_key ? String(item.frontend_unique_key) : null;
      const itemId = item.item_id || item.inventory_id || item.id || null;
      let matchedBatch = null;

      if (backendKey && storageByKey.has(backendKey)) {
        const si = storageByKey.get(backendKey);
        if (si && si.batch_timestamp) matchedBatch = Number(si.batch_timestamp);
      }

      if (!matchedBatch && backendKey) {
        const parts = backendKey.split('_');
        if (parts.length >= 2) {
          const maybeNum = parseFloat(parts[parts.length - 1]);
          if (!isNaN(maybeNum)) {
            const possibleBatch = Math.floor(maybeNum / 1000) * 1000;
            if (storageByBatchAndItem.has(`${possibleBatch}_${String(itemId)}`))
              matchedBatch = possibleBatch;
          }
        }
      }

      if (!matchedBatch) {
        for (const [k] of storageByBatchAndItem.entries()) {
          const [batchStr, storedItemId] = k.split('_');
          if (String(storedItemId) === String(itemId)) {
            matchedBatch = Number(batchStr);
            break;
          }
        }
      }

      if (matchedBatch) {
        pushToBatch(matchedBatch, { ...item, is_new_item: true, batch_timestamp: matchedBatch });
      } else {
        oldItems.push(item);
      }
    });

    rawNewItems.forEach(si => {
      if (!si || !si.unique_key) return;
      if (backendUniqueKeys.has(String(si.unique_key))) return;
      if (!si.batch_timestamp || !si.item_id) return;
      const itemInfo = inventoryMapRef.current[si.item_id];
      if (!itemInfo) return;
      pushToBatch(si.batch_timestamp, {
        item_id: si.item_id,
        item_name: itemInfo.name,
        quantity: si.quantity || 1,
        price: itemInfo.unit_price,
        unit_price: itemInfo.unit_price,
        status: 'pending',
        note: '',
        slug: itemInfo.slug || generateSlug(itemInfo.name),
        added_at_frontend: si.added_at,
        frontend_unique_key: si.unique_key,
        is_new_item: true,
        batch_timestamp: si.batch_timestamp,
        id: si.unique_key,
        image: itemInfo.image,
      });
    });

    let allItems = [...oldItems];
    const sortedTimestamps = Array.from(batchItemsMap.keys()).sort((a, b) => a - b);
    sortedTimestamps.forEach(ts => {
      const batchArr = (batchItemsMap.get(ts) || []).map(it => ({ ...it }));
      if (batchArr.length > 0) {
        batchArr[0] = { ...batchArr[0], _isBatchStart: true };
        allItems.push(...batchArr);
      }
    });

    const seen = new Set();
    const deduped = [];
    for (const it of allItems) {
      const key = it.frontend_unique_key
        ? String(it.frontend_unique_key)
        : `${it.item_id}_${it.batch_timestamp || 0}_${it.unit_price || it.price || 0}`;
      if (seen.has(key)) {
        const existing = deduped.find(x =>
          (x.frontend_unique_key
            ? String(x.frontend_unique_key)
            : `${x.item_id}_${x.batch_timestamp || 0}_${x.unit_price || x.price || 0}`) === key
        );
        if (existing) {
          existing.quantity = (existing.quantity || 1) + (it.quantity || 1);
          existing.line_total = (existing.unit_price || existing.price || 0) * existing.quantity;
        }
        continue;
      }
      seen.add(key);
      deduped.push(it);
    }

    return {
      ...order,
      _fixedOrderMode: order._fixedOrderMode ?? getInitialOrderMode(order, tablesMapRef.current),
      items: deduped.map(normaliseItem),
      has_new_items: batchItemsMap.size > 0,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch orders with polling
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
  if (!token || !clientId) return;
  if (hasFetchedOrdersRef.current) return;
  hasFetchedOrdersRef.current = true;

  const fetchOrders = async () => {
    if (!token || !clientId) { setLoading(false); return; }
    try {
      const [ordersRes, billingMap] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetchBillingDocumentsMap({ clientId, token }),
      ]);
      const allOrders = ordersRes.data?.data || [];
      setOrders(allOrders.map(processOrder));
      setBillingDocMap(billingMap);
    } catch (err) {
      toast.error('Failed to fetch orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [clientId, token]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions (preserved from original)
  // ─────────────────────────────────────────────────────────────────────────
  const handleCancelOrder = async (orderId, reason) => {
    const order = orders.find(o => o.id === orderId);
    const tableObj = tables.find(t => t.id === order?.table_id);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/cancel`,
        {},
        {
          params: { order_id: orderId, reason: reason || '' },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (tableObj) {
        await axios.post(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          {
            id: order.table_id,
            client_id: clientId,
            name: tableObj.name,
            table_type: tableObj.table_type,
            status: 'vacant',
            location_zone: tableObj.location_zone,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Order cancelled and table freed.');
      fetchTables();
    } catch { toast.error('Failed to cancel order'); }
  };
  // ── REQ: Item delete — now matches TakeOrder (reason + qty + transaction) ──

  const handleItemRemoveOne = async (transactionType, reason, removeQty) => {
    const { item, orderId } = itemDeleteModal;
    setItemDeleteModal({ isOpen: false, item: null, orderId: null });
    if (!item?.id) { toast.error('Cannot update — item has no DB reference.'); return; }
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
        {
          params: { client_id: clientId, order_item_id: item.id, quantity: removeQty, transaction_type: transactionType, reason: reason || undefined },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const newQty = item.quantity - removeQty;
      toast.success(newQty > 0 ? `Quantity reduced to ${newQty}.` : 'Item removed.');
      // Refresh orders from server
      const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = res.data?.data || [];
      const fresh = allOrders.find(o => o.id === orderId);
      if (!fresh) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (viewOrder?.id === orderId) { setViewOrder(null); setShowViewModal(false); }
        toast.info('All items removed — order closed.');
        return;
      }
      const processed = processOrder(fresh);
      setOrders(prev => prev.map(o => o.id === orderId ? processed : o));
      if (viewOrder?.id === orderId) setViewOrder({ ...processed, _tableName: tablesMap[processed.table_id] || String(processed.table_id) });
      if (selectedOrder?.id === orderId) setSelectedOrder(processed);
    } catch { toast.error('Failed to update item.'); }
  };

  const handleItemRemoveAll = async (transactionType, reason) => {
    const { item, orderId } = itemDeleteModal;
    setItemDeleteModal({ isOpen: false, item: null, orderId: null });
    if (!item?.id) { toast.error('Cannot delete — item has no DB reference.'); return; }
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
        {
          params: { client_id: clientId, order_item_id: item.id, transaction_type: transactionType, reason: reason || undefined },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Item removed.');
      const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = res.data?.data || [];
      const fresh = allOrders.find(o => o.id === orderId);
      if (!fresh) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (viewOrder?.id === orderId) { setViewOrder(null); setShowViewModal(false); }
        toast.info('All items removed — order closed.');
        return;
      }
      const processed = processOrder(fresh);
      setOrders(prev => prev.map(o => o.id === orderId ? processed : o));
      if (viewOrder?.id === orderId) setViewOrder({ ...processed, _tableName: tablesMap[processed.table_id] || String(processed.table_id) });
      if (selectedOrder?.id === orderId) setSelectedOrder(processed);
    } catch { toast.error('Failed to remove item.'); }
  };

  const handleRequestDeleteItem = (item, orderId) => {
    setItemDeleteModal({ isOpen: true, item, orderId });
  };

  // ── Status change (unchanged) ──────────────────────────────────────────────

  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === 'served') return;
    const tableObj = tables.find(t => t.id === order.table_id);
    try {
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`, { id: orderId, client_id: clientId, status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      if (tableObj) await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`, { id: order.table_id, client_id: clientId, name: tableObj.name, table_type: tableObj.table_type, status: 'vacant', location_zone: tableObj.location_zone }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Order status updated');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, has_new_items: newStatus === 'served' ? false : o.has_new_items } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      if (newStatus === 'served') setEditOrderId(null);
    } catch { toast.error('Failed to update order status.'); }
  };

  const handlePrintBill = async (orderId) => {
  await openInvoiceForOrder(orderId);
};

  const { from, to } = getDateRangeFromPreset(datePreset, customFrom, customTo);
  let filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
    return orderDate >= from && orderDate <= to;
  });

  // Single mode selection (not multi)
  if (selectedOrderMode !== 'all') {
    filteredOrders = filteredOrders.filter(o => o._fixedOrderMode === selectedOrderMode);
  }
  
  switch (filterMode) {
    case 2:
      filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'pending');
      break;
    case 3:
      filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'preparing');
      break;
    case 4:
      filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'ready');
      break;
    case 5:
      filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'served');
      break;
    case 6:
      filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'cancelled');
      break;
    default:
      break;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived helpers
  // ─────────────────────────────────────────────────────────────────────────

  const getOrderTotal = (order) =>
    (order.items || [])
      .filter(item => !item.parent_item_key)
      .reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const getOrderModeIcon = (mode) => {
    if (mode === 'takeaway') return <Package size={12} />;
    if (mode === 'delivery') return <Truck size={12} />;
    return <Users size={12} />;
  };
  const getOrderModeLabel = (mode) => { if (mode === 'takeaway') return 'Takeaway'; if (mode === 'delivery') return 'Delivery'; return 'Dine In'; };

  const orderColumnDefs = [
    {
      headerName: 'Order #',
      field: 'id',
      minWidth: 130,
      cellRenderer: (params) => (
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-action-primary">#{params.value}</span>
          {params.data?.has_new_items && <span className="text-[9px] font-bold text-text-white bg-action-primary px-1.5 py-0.5 rounded-full uppercase">New</span>}
        </div>
      ),
    },
    {
      headerName: 'Table / Customer',
      field: 'table_id',
      minWidth: 160,
      valueGetter: (params) => {
        const order = params.data;
        if (!order) return '';
        return order._fixedOrderMode === 'takeaway' ? order.customer_name || 'Takeaway' : tablesMap[order.table_id] || order.table || String(order.table_id);
      },
    },
    {
      headerName: 'Mode',
      field: '_fixedOrderMode',
      minWidth: 140,
      valueGetter: (params) => getOrderModeLabel(params.data?._fixedOrderMode),
      cellRenderer: (params) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-tertiary text-text-secondary border border-border-default">
          {getOrderModeIcon(params.data?._fixedOrderMode)}{getOrderModeLabel(params.data?._fixedOrderMode)}
        </span>
      ),
    },
    {
      headerName: 'Items',
      field: 'items',
      minWidth: 100,
      valueGetter: (params) => params.data?.items?.length || 0,
    },
    {
      headerName: 'Total Price',
      field: 'total_price',
      minWidth: 140,
      valueGetter: (params) => getOrderTotal(params.data || {}),
      valueFormatter: (params) => `₹${(params.value || 0).toFixed(2)}`,
    },
    {
      headerName: 'Status',
      field: 'status',
      minWidth: 130,
      cellRenderer: (params) => <StatusBadge status={params.value} />,
    },
    {
  headerName: 'Invoice #',
  colId: 'invoice_number',
  minWidth: 140,
  sortable: false,
  valueGetter: (params) => billingDocMap[params.data?.id?.toString()]?.document_number || '',
  cellRenderer: (params) => (
    <span className="text-sm font-medium text-text-primary">
      {params.value || '—'}
    </span>
  ),
},
    {
  headerName: 'Payment Status',
  colId: 'payment_status',
  minWidth: 160,
  sortable: false,
  valueGetter: (params) => billingDocMap[params.data?.id?.toString()]?.payment_status || '',
  cellRenderer: (params) => {
    const billingDoc = billingDocMap[params.data?.id?.toString()];
    return billingDoc ? (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
        billingDoc.payment_status === 'Paid'
          ? 'bg-green-100 text-green-700'
          : billingDoc.status === 'partial'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
      }`}>
        {billingDoc.payment_status?.toUpperCase() ?? 'UNKNOWN'}
      </span>
    ) : (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
        NOT BILLED
      </span>
    );
  },
},
    {
  headerName: 'Actions',
  colId: 'actions',
  minWidth: 240,
  sortable: false,
  filter: false,
  floatingFilter: false,
  cellRenderer: (params) => (
    <OrderRowActions
      order={params.data}
      onView={(order) => {
        setViewOrder({ ...order, _tableName: tablesMap[order.table_id] || order.table || String(order.table_id) });
        setShowViewModal(true);
      }}
      onPrint={(order) => handlePrintBill(order.id)}
      onCancel={(order) => setCancelOrderModal({ isOpen: true, orderId: order.id })}
      onMarkServed={(order) => handleStatusChange(order.id, 'served')}
    />
  ),
},
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-primary overflow-x-hidden">
      <div className="mx-auto px-2 sm:px-4 py-3">

        {loading ? (
          <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-action-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl p-16 text-center bg-bg-primary border border-border-default shadow-card"><ShoppingBag size={40} className="mx-auto mb-3 text-text-secondary opacity-40" /><p className="text-text-secondary text-base font-medium">No orders found</p></div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border-default shadow-card bg-bg-primary">
            <AgGridTable columnDefs={orderColumnDefs} rowData={filteredOrders} domLayout="normal" height={600} />
          </div>
        )}
      </div>

 
      {/* Modals */}
      <OrderItemsViewModal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewOrder(null); }}
        order={viewOrder}
        onRequestDeleteItem={(item) => handleRequestDeleteItem(item, viewOrder?.id)}
        getOrderTotal={getOrderTotal}
      />

      {/* REQ: Cancel order — now requires reason (matches TakeOrder) */}
      <CancelOrderConfirmModal
        isOpen={cancelOrderModal.isOpen}
        onClose={() => setCancelOrderModal({ isOpen: false, orderId: null })}
        onConfirm={(reason) => { if (cancelOrderModal.orderId) handleCancelOrder(cancelOrderModal.orderId, reason); }}
      />

      {/* REQ: Item delete — now has reason + qty (matches TakeOrder) */}
      <OldItemDeleteModal
        isOpen={itemDeleteModal.isOpen}
        item={itemDeleteModal.item}
        onClose={() => setItemDeleteModal({ isOpen: false, item: null, orderId: null })}
        onRemoveOne={handleItemRemoveOne}
        onRemoveAll={handleItemRemoveAll}
      />

      {invoiceModalOpen && invoiceOrderData && (
  <InvoiceModal
    clientId={clientId}
    token={token}
    selectedOrder={invoiceOrderData}
    tablesMap={tables.reduce((m, t) => { m[t.id] = t; return m; }, {})}
    inventoryMap={inventoryMap}
    onClose={async () => {
      closeInvoiceModal();
      setBillingDocMap(await fetchBillingDocumentsMap({ clientId, token }));
    }}
    onSave={async (id) => {
      console.log('Invoice saved:', id);
      setBillingDocMap(await fetchBillingDocumentsMap({ clientId, token }));
    }}
  />
)}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--color-bg-tertiary); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-border-default); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-action-primary); }
      `}</style>
      </div>
      );
};

      export default OrderSummaryVisible;