import React, { useEffect, useState, useRef } from "react";
import axios from 'axios';
import { toast } from "react-toastify";
import Modal from "react-modal";
import {
  Users, Package, Truck,
  Eye, Printer, Trash2, Check,
  CalendarDays, ChevronDown, Search, X,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { menuCache } from '../../utils/Menu-utils/menuCache';
Modal.setAppElement("#root");
import AgGridTable from '../../utils/AgGridTable';
import InvoiceModal from '../BillingServices/InvoiceModal';
import { useInvoiceModal, fetchBillingDocumentsMap } from '../../utils/BillingUtils';
import {
  CancelOrderConfirmModal,
  OldItemDeleteModal,
  OrderItemsViewModal,
  StatusBadge,
  getInitialOrderMode,
  hasInvoiceBeenGenerated
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
// Theme — every colour comes from tailwind.config.js tokens (no hex in this file)
//   brand / brand-dark / brand-light / brand-tint   ink-soft / ink-muted / ink-faint
//   line / line-soft   canvas / surface   success / warning / state-occupied
// ─────────────────────────────────────────────────────────────────────────────

// Colours for the AG Grid internals, applied from the card wrapper with Tailwind
// arbitrary variants so they use the same tokens as the rest of the page.
const GRID_THEME = [
  '[&_.ag-header]:!bg-brand-light',
  '[&_.ag-header]:!border-b',
  '[&_.ag-header]:!border-line-soft',
  '[&_.ag-header-cell]:!text-brand-dark',
  '[&_.ag-header-cell-text]:!text-brand-dark',
  '[&_.ag-header-cell-label]:!text-brand-dark',
  '[&_.ag-header-cell-label]:!font-bold',
  '[&_.ag-header-cell-label]:!text-[13px]',
  '[&_.ag-header-cell-label]:!tracking-normal',
  '[&_.ag-header-cell-label]:!normal-case',
  '[&_.ag-icon]:!text-brand-dark',
  '[&_.ag-cell]:!text-ink-soft',
  '[&_.ag-row]:!border-line-soft',
  '[&_.ag-row-zebra]:!bg-brand-tint',
  '[&_.ag-row-hover]:!bg-brand-light',
].join(' ');

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

// Sorts Order # numerically (1, 2, 3, … 10) instead of as text; ties fall back to the DB id
const orderNoComparator = (a, b, nodeA, nodeB) => {
  const na = parseFloat(String(a ?? '').replace(/[^0-9.]/g, ''));
  const nb = parseFloat(String(b ?? '').replace(/[^0-9.]/g, ''));
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  const t = String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
  if (t !== 0) return t;
  return (Number(nodeA?.data?.id) || 0) - (Number(nodeB?.data?.id) || 0);
};

const formatLocalDate = (d) => d.toLocaleDateString('en-CA');

// Day / week (Mon–today) / month / year ranges, ending today
const getPeriodRange = (period) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  else if (period === 'month') start.setDate(1);
  else if (period === 'year') { start.setMonth(0); start.setDate(1); }
  return { from: formatLocalDate(start), to: formatLocalDate(now) };
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
  const [period, setPeriod] = useState('day');
  const [searchText, setSearchText] = useState('');
  const [filterMode, setFilterMode] = useState(0);
  // Single order-mode selection — NOT multi-select
  const [selectedOrderMode, setSelectedOrderMode] = useState('all');

  // ── Fit-to-viewport: page never scrolls, only the table does ──────────────
  const rootRef = useRef(null);
  const [availHeight, setAvailHeight] = useState(null);

  useEffect(() => {
    const measure = () => {
      if (!rootRef.current) return;
      const top = rootRef.current.getBoundingClientRect().top + window.scrollY;
      setAvailHeight(Math.max(window.innerHeight - top, 420));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [loading]);

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
      // The original called an undefined `fetchTables()` here, which threw after a
      // successful cancel and showed "Failed to cancel order". Refresh via menuCache.
      try {
        const { list, map } = await menuCache.fetchTables(clientId, token);
        setTables(list);
        setTablesMap(map);
      } catch (e) { console.error('refresh tables failed', e); }
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

  // What the user sees as the order number (dinein_order_id), falling back to id
  const getDisplayOrderId = (order) => order?.dinein_order_id ?? order?.id ?? '';

  const getTableOrCustomer = (order) =>
    order._fixedOrderMode === 'takeaway'
      ? order.customer_name || 'Takeaway'
      : tablesMap[order.table_id] || order.table || String(order.table_id);

  const getBillingDoc = (order) => billingDocMap[order?.id?.toString()];

  // paid | partial | unpaid | not billed
  const getPaymentKey = (order) => {
    const doc = getBillingDoc(order);
    if (!doc) return 'not billed';
    const ps = (doc.payment_status || '').toLowerCase();
    if (ps === 'paid') return 'paid';
    if (ps === 'partial' || (doc.status || '').toLowerCase() === 'partial') return 'partial';
    return 'unpaid';
  };

  const openViewModal = (order) => {
    setViewOrder({ ...order, _tableName: tablesMap[order.table_id] || order.table || String(order.table_id) });
    setShowViewModal(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Date / mode / status filters (unchanged)
  // ─────────────────────────────────────────────────────────────────────────

  const { from, to } = getPeriodRange(period);
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
  // Search — every word typed must match somewhere in the row
  // (order #, table/customer, mode, status, invoice #, payment, total, item names)
  // ─────────────────────────────────────────────────────────────────────────

  const searchWords = searchText
    .toLowerCase()
    .replace(/#/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const visibleOrders = searchWords.length === 0
    ? filteredOrders
    : filteredOrders.filter(order => {
        const doc = getBillingDoc(order);
        const haystack = [
          getDisplayOrderId(order),
          order.id,
          getTableOrCustomer(order),
          order.customer_name,
          getOrderModeLabel(order._fixedOrderMode),
          order._fixedOrderMode,
          order.status,
          doc?.document_number,
          doc?.payment_status || 'not billed',
          getOrderTotal(order).toFixed(2),
          ...(order.items || []).map(i => i.item_name || i.name),
        ]
          .filter(v => v !== undefined && v !== null && v !== '')
          .join(' ')
          .toLowerCase();
        return searchWords.every(w => haystack.includes(w));
      });

  // ─────────────────────────────────────────────────────────────────────────
  // Cell renderers (plain functions so grid cells don't remount every render)
  // ─────────────────────────────────────────────────────────────────────────

  const renderModePill = (mode) => (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-light text-brand-dark border border-brand-200 whitespace-nowrap">
      {getOrderModeIcon(mode)}{getOrderModeLabel(mode)}
    </span>
  );

  const renderPaymentPill = (order) => {
    const doc = getBillingDoc(order);
    const key = getPaymentKey(order);
    if (!doc) {
      return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-tertiary text-text-secondary whitespace-nowrap">NOT BILLED</span>;
    }
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
        key === 'paid' ? 'bg-action-success text-text-white'
          : key === 'partial' ? 'bg-bulkActions-adding text-text-white'
            : 'bg-action-danger text-text-white'
      }`}>
        {doc.payment_status?.toUpperCase() ?? 'UNKNOWN'}
      </span>
    );
  };

  // Icons on top, "Mark As Served" pill stacked underneath (only when status = ready)
  const renderActionButtons = (order) => {
    if (!order) return null;
    const canServe = order.status?.toLowerCase() === 'ready';
    return (
      <div className="inline-flex flex-col items-stretch gap-1.5 w-[132px] leading-none">
        <div className="flex items-center justify-between">
          <button
            onClick={() => openViewModal(order)}
            title="View items"
            className="p-1.5 rounded-lg bg-brand-light text-brand-dark hover:bg-brand-dark hover:text-text-white transition-colors"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handlePrintBill(order.id)}
            title="Print bill"
            className="p-1.5 rounded-lg bg-success-soft text-success hover:bg-success hover:text-text-white transition-colors"
          >
            <Printer size={15} />
          </button>
          <button
            onClick={() => setCancelOrderModal({ isOpen: true, orderId: order.id })}
            title="Cancel order"
            className="p-1.5 rounded-lg bg-state-occupied-bg text-state-occupied hover:bg-state-occupied hover:text-text-white transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
        {canServe && (
          <button
            onClick={() => handleStatusChange(order.id, 'served')}
            style={{ height: 28, lineHeight: 1 }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-2 rounded-lg text-[11px] font-semibold whitespace-nowrap
                       bg-success-soft text-success border border-success-line
                       hover:bg-success hover:text-text-white hover:border-success
                       active:scale-[0.98] transition-all"
          >
            <Check size={13} strokeWidth={3} className="shrink-0" />
            <span style={{ lineHeight: 1 }}>Mark As Served</span>
          </button>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Grid columns (AG Grid → per-column filters, sorting, Columns menu, Export)
  // ─────────────────────────────────────────────────────────────────────────

  const orderColumnDefs = [
    {
      headerName: 'Order #',
      colId: 'dinein_order_id',
      minWidth: 140,
      comparator: orderNoComparator,
      sortingOrder: ['asc', 'desc', null],
      initialSort: 'asc',
      valueGetter: (params) => (params.data ? getDisplayOrderId(params.data) : ''),
      cellRenderer: (params) => (
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-brand-dark">#{params.value}</span>
          {params.data?.has_new_items && <span className="text-[9px] font-bold text-text-white bg-brand px-1.5 py-0.5 rounded-full uppercase">New</span>}
        </div>
      ),
    },
    {
      headerName: 'Table / Customer',
      field: 'table_id',
      minWidth: 160,
      valueGetter: (params) => (params.data ? getTableOrCustomer(params.data) : ''),
    },
    {
      headerName: 'Mode',
      field: '_fixedOrderMode',
      minWidth: 140,
      valueGetter: (params) => getOrderModeLabel(params.data?._fixedOrderMode),
      cellRenderer: (params) => renderModePill(params.data?._fixedOrderMode),
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
      valueGetter: (params) => getBillingDoc(params.data)?.document_number || '',
      cellRenderer: (params) => (
        <span className="text-sm font-medium text-ink-soft">{params.value || '—'}</span>
      ),
    },
    {
      headerName: 'Payment Status',
      colId: 'payment_status',
      minWidth: 160,
      sortable: false,
      valueGetter: (params) => (params.data ? (getBillingDoc(params.data)?.payment_status || 'Not billed') : ''),
      cellRenderer: (params) => renderPaymentPill(params.data),
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
      invoiceGenerated={hasInvoiceBeenGenerated(params.data, billingDocMap)}
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
    <div
      ref={rootRef}
      className="bg-canvas overflow-hidden flex flex-col"
      style={{ height: availHeight ? `${availHeight}px` : '100vh' }}
    >
      <div className="mx-auto w-full max-w-[1600px] flex-1 min-h-0 px-3 sm:px-5 py-3 sm:py-4">

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className={`orders-purple-grid ${GRID_THEME} h-full min-h-0 flex flex-col bg-surface rounded-xl border border-line shadow-panel p-3 sm:p-4`}>

            {/* Title */}
            <h3 className="shrink-0 text-[17px] font-bold text-brand-dark">
              Orders <span className="font-normal text-[15px] text-ink-muted">({visibleOrders.length})</span>
            </h3>

            {/* Search (left)  ·  Today / Week / Month / Year dropdown (right) */}
            <div className="shrink-0 flex items-center justify-between gap-3 flex-wrap mt-3 mb-3">
              <div className="relative w-full sm:w-96 sm:max-w-full">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search order #, table, customer, item, invoice, status…"
                  className="w-full pl-9 pr-9 py-2 text-[13px] rounded-lg border border-line bg-surface text-ink-soft placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-brand-dark"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="relative ml-auto">
                <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark pointer-events-none" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  aria-label="Filter orders by period"
                  className="appearance-none cursor-pointer pl-9 pr-9 py-2 text-[13px] font-semibold rounded-lg border border-brand-200 bg-brand-light text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/25"
                >
                  {PERIOD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark pointer-events-none" />
              </div>
            </div>

            {/* Grid — only this area scrolls (rows scroll, header stays) */}
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-line">
              <AgGridTable
                columnDefs={orderColumnDefs}
                rowData={visibleOrders}
                domLayout="normal"
                height="100%"
                rowHeight={72}
                exportFileName="orders"
                overlayNoRowsTemplate={`<div class="p-6 text-sm font-medium text-ink-muted">${searchText ? 'No orders match your search' : 'No orders found'}</div>`}
              />
            </div>
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
        /* Fill the available height: toolbar stays put, grid rows scroll inside */
        .orders-purple-grid .ag-modern-wrapper {
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .orders-purple-grid .ag-modern-wrapper > .ag-modern-grid {
          flex: 1 1 0;
          min-height: 0;
          height: auto !important;
        }
      `}</style>
    </div>
  );
};

export default OrderSummaryVisible;