
import React, { useEffect, useState } from "react";
import axios from 'axios';
import { toast } from "react-toastify";
import { MdOutlineKeyboardDoubleArrowDown } from "react-icons/md";
import Modal from "react-modal";
import { X, Edit2, Trash2, Search, Filter, ShoppingBag, Clock, Users, Package, Truck } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import BillingPage from "../BillingServices/Billing";


Modal.setAppElement("#root");

const SimpleDeleteConfirm = ({ isOpen, onClose, onConfirm, title = 'Delete', message = 'Are you sure?' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
      <div className="rounded-lg w-full max-w-sm bg-bg-primary border-border-default shadow-card">
        <div className="px-6 py-4 border-b flex justify-between items-center border-border-default">
          <h2 className="text-lg font-bold text-action-danger">{title}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-gray-700 transition-colors ">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-text-primary">{message}</p>
        </div>
        <div className="px-6 py-4 rounded-b-lg flex gap-3 bg-bg-tertiary border-t-border-default">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors bg-bg-primary border-border-default border-default text-text-primary">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-lg bg-action-danger text-text-white font-medium text-sm transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );

};

const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddMainOnly, onAddWithAddons }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
      <div className="rounded-lg w-full max-w-lg bg-bg-primary shadow-card border-border-default border-default">
        <div className="px-6 py-4 border-b flex justify-between items-center border-border-default">
          <h3 className="text-lg font-semibold text-text-primary">{mainItem?.name}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm mb-4 text-text-secondary">Add-ons for this item:</p>
          <div className="space-y-2">
            {lineItems.map((li, idx) => (
              <div key={li.id} className="flex justify-between items-center px-4 py-3 rounded-lg bg-bg-tertiary border-default border-border-default">
                <span className="text-sm font-medium text-text-primary">{idx + 1}. {li.name}</span>
                <span className="text-sm font-bold text-action-primary">₹{li.unit_price}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 rounded-b-lg flex gap-3 bg-bg-primary border-t-border-default border-default">
          <button onClick={onClose} className="bg-bg-tertiary text-text-primary border-default border-border-default px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button onClick={onAddMainOnly} className="flex-1 bg-action-primary text-text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
            Main Only
          </button>
          <button onClick={onAddWithAddons} className="flex-1 bg-action-success text-text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
            With Add-ons
          </button>
        </div>
      </div>
    </div>
  );

};

const OrderSummaryVisible = ({ clientId, token }) => {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryMap, setInventoryMap] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [tablesMap, setTablesMap] = useState({});
  const [editOrderId, setEditOrderId] = useState(null);
  const [showDeleteModals, setShowDeleteModals] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ orderId: null, itemBackendId: null });
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const todayDate = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [filterMode, setFilterMode] = useState(0);
  const [tables, setTables] = useState([]);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedMainItem, setSelectedMainItem] = useState(null);
  const [lineItemsDetails, setLineItemsDetails] = useState([]);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [visibleOrderId, setVisibleOrderId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('items');
  const [selectedOrderModes, setSelectedOrderModes] = useState(['all']);


  const navigate = useNavigate();


  // possible values: 'dinein', 'takeaway', 'delivery'
  const getOrderBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'served':
        return 'bg-green-200';
      case 'pending':
        return 'bg-yellow-100';
      case 'preparing':
        return 'bg-blue-200';
      default:
        return 'bg-white';
    }
  };

  const generateSlug = name => name.toLowerCase().replace(/[\s]+/g, '-');

  // REPLACE getNewItemsFromStorage
  const getNewItemsFromStorage = orderId => {
    const arr = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`order_${orderId}_new_item_`)) {
        try {
          const raw = JSON.parse(localStorage.getItem(key));
          if (!raw) continue;
          // Normalize/flatten common shapes so later merge logic is simpler
          const unique_key = raw.unique_key || raw.frontend_unique_key || raw.id || null;
          const batch_timestamp = raw.batch_timestamp ? Number(raw.batch_timestamp) : (raw.batchTs ? Number(raw.batchTs) : null);
          const item_id = raw.item_id || raw.inventory_id || raw.inventoryId || raw.itemId || null;
          const added_at = raw.added_at || raw.added_at_frontend || raw.addedAt || raw.addedAtFrontend || null;
          const quantity = raw.quantity || 1;
          arr.push({
            ...raw,
            unique_key,
            batch_timestamp,
            item_id,
            added_at,
            quantity
          });
        } catch (e) {
          console.error('parse localstorage new item', key, e);
        }
      }
    }
    return arr;
  };

  const getBatchesFromStorage = orderId => {
    const batchMap = new Map();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`order_${orderId}_batch_`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.timestamp && !batchMap.has(data.timestamp)) batchMap.set(data.timestamp, []);
        } catch (e) { }
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
    return Array.from(batchMap.entries()).sort((a, b) => a[0] - b[0]).map(([timestamp, item_ids]) => ({ timestamp, item_ids }));
  };

  const clearNewItemsStorage = orderId => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(`order_${orderId}_new_item_`) || key.startsWith(`order_${orderId}_batch_`))) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  };

  const fetchTables = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } });
      setTables(res.data?.data || []);
      const map = {};
      (res.data?.data || []).forEach(t => map[t.id] = t.name);
      setTablesMap(map);
    } catch (e) { console.error('fetchTables', e); }
  };
  // ---------- Batch & key helpers (REQUIRED) ----------
  const slugify = str => (str || '').toString().toUpperCase().replace(/[\s]+/g, '-').replace(/[^A-Z0-9-_]/g, '');

  // ensureBatchForOrder: ensures a batch meta object exists in localStorage for the current batch timestamp.
  // Returns { storageKey, meta } where meta contains { timestamp, started_at, seq, table_slug, time_label, added_count }.
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
        // compute sequence
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
          table_slug: slugify(tableName || ''), // e.g. A01
          time_label: timeLabel,                 // e.g. 09-11
          added_count: 0
        };
        localStorage.setItem(storageKey, JSON.stringify(meta));
        localStorage.setItem(seqKey, String(seq));
      }
    } catch (e) {
      console.error('ensureBatchForOrder error', e);
    }

    return { storageKey, meta };
  };

  // generateFrontendKeyFromBatch: builds the key like A01_09-11_2_1081_3
  const generateFrontendKeyFromBatch = (orderId, batchMeta) => {
    const tableSlug = batchMeta.table_slug || 'TBL';
    const timeLabel = batchMeta.time_label || '00-00';
    const itemsCount = batchMeta.added_count || 0; // 1-based index will be stored
    const seq = batchMeta.seq || 1;
    return `${tableSlug}_${timeLabel}_${itemsCount}_${orderId}_${seq}`;
  };

  useEffect(() => { if (clientId) fetchTables(); }, [clientId]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setAllInventoryItems(res.data.data || []);
        const map = {};
        (res.data.data || []).forEach(i => map[i.id] = i);
        setInventoryMap(map);
      })
      .catch(() => { });
  }, [clientId, token]);

  useEffect(() => {
    if (!showOrderDetailModal || !selectedOrder || editOrderId !== selectedOrder?.id || itemSearchQuery.trim() === '') {
      setItemSearchResults([]);
      return;
    }

    let filtered = allInventoryItems;

    if (selectedCategory) {
      filtered = filtered.filter(item => {
        const itemCategories = item.categories || [];
        return itemCategories.some(cat => cat === selectedCategory || cat.id === selectedCategory);
      });
    }

    if (itemSearchQuery.trim()) {
      filtered = filtered.filter(it => (it.name || '').toLowerCase().includes(itemSearchQuery.toLowerCase()));
    }

    setItemSearchResults(filtered);
  }, [itemSearchQuery, allInventoryItems, showOrderDetailModal, selectedOrder, editOrderId, selectedCategory]);

  const handleItemSelection = (orderId, selectedItem) => {
    if (selectedItem.line_item_id && Array.isArray(selectedItem.line_item_id) && selectedItem.line_item_id.length > 0) {
      const lineItems = selectedItem.line_item_id.map(id => allInventoryItems.find(i => i.id === id)).filter(Boolean);
      setSelectedMainItem(selectedItem);
      setLineItemsDetails(lineItems);
      setPendingOrderId(orderId);
      setLineItemsModalOpen(true);
    } else addItemToOrder(orderId, selectedItem);
    setItemSearchQuery('');
  };

  const handleAddMainItemWithLineItems = () => {
    if (!selectedMainItem || !pendingOrderId) return;
    let batchTimestamp = currentBatchTimestamp;
    if (!batchTimestamp) {
      batchTimestamp = Date.now();
      setCurrentBatchTimestamp(batchTimestamp);
      localStorage.setItem(`order_${pendingOrderId}_batch_${batchTimestamp}`, JSON.stringify({ timestamp: batchTimestamp, started_at: Date.now() }));
    }
    addItemToOrderWithBatch(pendingOrderId, selectedMainItem, batchTimestamp, true);
    lineItemsDetails.forEach(li => addItemToOrderWithBatch(pendingOrderId, li, batchTimestamp, false));
    setLineItemsModalOpen(false);
    setSelectedMainItem(null);
    setLineItemsDetails([]);
    setPendingOrderId(null);
  };
  // REPLACE addItemToOrderWithBatch
  const addItemToOrderWithBatch = (orderId, selectedItem, forcedBatchTimestamp, isMainItem = false) => {
    // Try reading batch meta for forced timestamp
    let batchKey = `order_${orderId}_batch_${forcedBatchTimestamp}`;
    let batchMeta = null;
    try {
      const raw = localStorage.getItem(batchKey);
      if (raw) batchMeta = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    // Fallback: ensure a batch exists (this will set currentBatchTimestamp if missing)
    if (!batchMeta) {
      const tableName = tablesMap?.[selectedOrder?.table_id] || (selectedOrder?.table || '');
      const ensured = ensureBatchForOrder(orderId, tableName);
      batchKey = ensured.storageKey;
      batchMeta = ensured.meta;
    }

    if (!batchMeta) {
      console.error('No batch meta available for order', orderId);
      return;
    }

    // increment added_count and persist
    try {
      batchMeta.added_count = (batchMeta.added_count || 0) + 1;
      localStorage.setItem(batchKey, JSON.stringify(batchMeta));
    } catch (e) { console.error('update batch meta failed', e); }

    // deterministic frontend_unique_key
    const uniqueKey = generateFrontendKeyFromBatch(orderId, batchMeta);

    // If same item already present in same batch -> increment quantity via updateItemQuantity
    const existingItemInCurrentBatch = selectedOrder?.items.find(item =>
      item.is_new_item &&
      String(item.item_id) === String(selectedItem.id) &&
      Number(item.batch_timestamp) === Number(batchMeta.timestamp)
    );

    if (existingItemInCurrentBatch) {
      const idOrKey = existingItemInCurrentBatch.id || existingItemInCurrentBatch.frontend_unique_key;
      updateItemQuantity(orderId, idOrKey, (existingItemInCurrentBatch.quantity || 1) + 1);

      // also persist new quantity to localStorage if the item is from storage
      try {
        const storageKey = `order_${orderId}_new_item_${existingItemInCurrentBatch.frontend_unique_key || existingItemInCurrentBatch.id || uniqueKey}`;
        const existingRaw = JSON.parse(localStorage.getItem(storageKey) || '{}');
        existingRaw.quantity = (existingRaw.quantity || existingItemInCurrentBatch.quantity || 1) + 1;
        localStorage.setItem(storageKey, JSON.stringify(existingRaw));
      } catch (e) { /* best-effort */ }

      return;
    }

    const timestamp = Date.now() + Math.random();

    const newItem = {
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      quantity: 1,
      price: selectedItem.unit_price,
      status: 'pending',
      note: '',
      slug: selectedItem.slug || generateSlug(selectedItem.name),
      added_at_frontend: timestamp,
      frontend_unique_key: uniqueKey,
      is_new_item: true,
      unit_price: selectedItem.unit_price || 0,
      line_total: (selectedItem.unit_price || 0) * 1,
      batch_timestamp: batchMeta.timestamp,
      id: uniqueKey,
      image: selectedItem.image,
      is_line_item: !isMainItem
    };

    // Persist the single new item to localStorage immediately so backend vs storage merge uses same canonical data
    try {
      const storageKey = `order_${orderId}_new_item_${uniqueKey}`;
      localStorage.setItem(storageKey, JSON.stringify({
        item_id: newItem.item_id,
        unique_key: uniqueKey,
        added_at: newItem.added_at_frontend,
        batch_timestamp: newItem.batch_timestamp,
        quantity: newItem.quantity,
        is_line_item: newItem.is_line_item
      }));
    } catch (e) { console.error('persist new item to storage failed', e); }

    // Update UI state: group items by batch exactly like you already do
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;

      const batches = getBatchesFromStorage(orderId);
      batches.sort((a, b) => a.timestamp - b.timestamp);
      const oldItems = o.items.filter(i => !i.is_new_item);
      const newItemsByBatch = new Map();
      batches.forEach(b => newItemsByBatch.set(b.timestamp, []));
      o.items.forEach(item => {
        if (item.is_new_item && item.batch_timestamp) {
          if (!newItemsByBatch.has(item.batch_timestamp)) newItemsByBatch.set(item.batch_timestamp, []);
          newItemsByBatch.get(item.batch_timestamp).push(item);
        }
      });

      if (!newItemsByBatch.has(batchMeta.timestamp)) newItemsByBatch.set(batchMeta.timestamp, []);
      newItemsByBatch.get(batchMeta.timestamp).push(newItem);

      const allItems = [...oldItems];
      const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);
      sortedTimestamps.forEach(ts => {
        const batchItems = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
        if (batchItems.length > 0) {
          batchItems[0] = { ...batchItems[0], _isBatchStart: true };
          allItems.push(...batchItems);
        }
      });

      // dedupe/merge within list to avoid duplicates
      const seen = new Set();
      const deduped = [];
      for (const it of allItems) {
        const key = it.frontend_unique_key ? String(it.frontend_unique_key) : `${it.item_id}_${it.batch_timestamp || ''}_${it.unit_price || it.price || 0}`;
        if (seen.has(key)) {
          const existing = deduped.find(x => (x.frontend_unique_key ? String(x.frontend_unique_key) === key : `${x.item_id}_${x.batch_timestamp || ''}_${x.unit_price || x.price || 0}` === key));
          if (existing) {
            existing.quantity = (existing.quantity || 1) + (it.quantity || 1);
            existing.line_total = (existing.unit_price || existing.price || 0) * existing.quantity;
          }
          continue;
        }
        seen.add(key);
        deduped.push(it);
      }

      return { ...o, items: deduped, has_new_items: true };
    }));

    // update selectedOrder view if it's the same order
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => {
        const batches = getBatchesFromStorage(orderId);
        batches.sort((a, b) => a.timestamp - b.timestamp);
        const oldItems = prev.items.filter(i => !i.is_new_item);
        const newItemsByBatch = new Map();
        batches.forEach(b => newItemsByBatch.set(b.timestamp, []));
        prev.items.forEach(item => {
          if (item.is_new_item && item.batch_timestamp) {
            if (!newItemsByBatch.has(item.batch_timestamp)) newItemsByBatch.set(item.batch_timestamp, []);
            newItemsByBatch.get(item.batch_timestamp).push(item);
          }
        });

        if (!newItemsByBatch.has(batchMeta.timestamp)) newItemsByBatch.set(batchMeta.timestamp, []);
        newItemsByBatch.get(batchMeta.timestamp).push(newItem);

        const allItems = [...oldItems];
        const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);
        sortedTimestamps.forEach(ts => {
          const batchItems = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
          if (batchItems.length > 0) {
            batchItems[0] = { ...batchItems[0], _isBatchStart: true };
            allItems.push(...batchItems);
          }
        });

        const seen = new Set();
        const deduped = [];
        for (const it of allItems) {
          const key = it.frontend_unique_key ? String(it.frontend_unique_key) : `${it.item_id}_${it.batch_timestamp || ''}_${it.unit_price || it.price || 0}`;
          if (seen.has(key)) {
            const existing = deduped.find(x => (x.frontend_unique_key ? String(x.frontend_unique_key) === key : `${x.item_id}_${x.batch_timestamp || ''}_${x.unit_price || x.price || 0}` === key));
            if (existing) {
              existing.quantity = (existing.quantity || 1) + (it.quantity || 1);
              existing.line_total = (existing.unit_price || existing.price || 0) * existing.quantity;
            }
            continue;
          }
          seen.add(key);
          deduped.push(it);
        }

        return { ...prev, items: deduped, has_new_items: true };
      });
    }
  };


  const handleAddMainItemOnly = () => {
    if (!selectedMainItem || !pendingOrderId) return;
    addItemToOrder(pendingOrderId, selectedMainItem);
    setLineItemsModalOpen(false);
    setSelectedMainItem(null);
    setLineItemsDetails([]);
    setPendingOrderId(null);
  };

  // ---------- REPLACE addItemToOrder ----------
  const addItemToOrder = (orderId, selectedItem) => {
    // ensure we have a batch meta (will set currentBatchTimestamp if missing)
    const tableName = tablesMap?.[selectedOrder?.table_id] || (selectedOrder?.table || '');
    const ensured = ensureBatchForOrder(orderId, tableName);
    const batchKey = ensured.storageKey;
    const batchMeta = ensured.meta;

    if (!batchMeta) {
      console.error('No batch meta found when adding item to order', orderId);
      return;
    }

    // increment added_count and persist
    try {
      batchMeta.added_count = (batchMeta.added_count || 0) + 1;
      localStorage.setItem(batchKey, JSON.stringify(batchMeta));
    } catch (e) { console.error('update batch meta failed', e); }

    // deterministic frontend_unique_key
    const uniqueKey = generateFrontendKeyFromBatch(orderId, batchMeta);

    // if already present in current batch -> increment quantity
    const existingItemInCurrentBatch = selectedOrder?.items.find(item =>
      item.is_new_item &&
      item.item_id === selectedItem.id &&
      item.batch_timestamp === batchMeta.timestamp &&
      (item.frontend_unique_key === uniqueKey || item.item_id === selectedItem.id)
    );

    if (existingItemInCurrentBatch) {
      const itemIdentifier = existingItemInCurrentBatch.id || existingItemInCurrentBatch.frontend_unique_key;
      updateItemQuantity(orderId, itemIdentifier, (existingItemInCurrentBatch.quantity || 1) + 1);
      return;
    }

    const timestamp = Date.now() + Math.random();

    const newItem = {
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      quantity: 1,
      price: selectedItem.unit_price,
      status: 'pending',
      note: '',
      slug: selectedItem.slug || generateSlug(selectedItem.name),
      added_at_frontend: timestamp,
      frontend_unique_key: uniqueKey,
      is_new_item: true,
      unit_price: selectedItem.unit_price || 0,
      line_total: (selectedItem.unit_price || 0) * 1,
      batch_timestamp: batchMeta.timestamp,
      id: uniqueKey,
      image: selectedItem.image
    };

    // update state grouping by batch
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const batches = getBatchesFromStorage(orderId);
      batches.sort((a, b) => a.timestamp - b.timestamp);
      const oldItems = o.items.filter(i => !i.is_new_item);
      const newItemsByBatch = new Map();
      batches.forEach(b => newItemsByBatch.set(b.timestamp, []));
      o.items.forEach(item => {
        if (item.is_new_item && item.batch_timestamp) {
          if (!newItemsByBatch.has(item.batch_timestamp)) newItemsByBatch.set(item.batch_timestamp, []);
          newItemsByBatch.get(item.batch_timestamp).push(item);
        }
      });

      if (!newItemsByBatch.has(batchMeta.timestamp)) newItemsByBatch.set(batchMeta.timestamp, []);
      newItemsByBatch.get(batchMeta.timestamp).push(newItem);

      const allItems = [...oldItems];
      const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);
      sortedTimestamps.forEach(ts => {
        const batchItems = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
        if (batchItems.length > 0) {
          batchItems[0] = { ...batchItems[0], _isBatchStart: true };
          allItems.push(...batchItems);
        }
      });

      // dedupe
      const seen = new Set();
      const deduped = [];
      for (const it of allItems) {
        const key = it.frontend_unique_key || `${it.item_id}_${it.batch_timestamp || ''}_${it.unit_price || it.price || 0}`;
        if (seen.has(key)) {
          const existing = deduped.find(x => (x.frontend_unique_key || `${x.item_id}_${x.batch_timestamp || ''}_${x.unit_price || x.price || 0}`) === key);
          if (existing) {
            existing.quantity = (existing.quantity || 1) + (it.quantity || 1);
            existing.line_total = (existing.unit_price || existing.price || 0) * existing.quantity;
          }
          continue;
        }
        seen.add(key);
        deduped.push(it);
      }

      return { ...o, items: deduped, has_new_items: true };
    }));

    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => {
        const batches = getBatchesFromStorage(orderId);
        batches.sort((a, b) => a.timestamp - b.timestamp);
        const oldItems = prev.items.filter(i => !i.is_new_item);
        const newItemsByBatch = new Map();
        batches.forEach(b => newItemsByBatch.set(b.timestamp, []));
        prev.items.forEach(item => {
          if (item.is_new_item && item.batch_timestamp) {
            if (!newItemsByBatch.has(item.batch_timestamp)) newItemsByBatch.set(item.batch_timestamp, []);
            newItemsByBatch.get(item.batch_timestamp).push(item);
          }
        });

        if (!newItemsByBatch.has(batchMeta.timestamp)) newItemsByBatch.set(batchMeta.timestamp, []);
        newItemsByBatch.get(batchMeta.timestamp).push(newItem);

        const allItems = [...oldItems];
        const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);
        sortedTimestamps.forEach(ts => {
          const batchItems = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
          if (batchItems.length > 0) {
            batchItems[0] = { ...batchItems[0], _isBatchStart: true };
            allItems.push(...batchItems);
          }
        });

        const seen = new Set();
        const deduped = [];
        for (const it of allItems) {
          const key = it.frontend_unique_key || `${it.item_id}_${it.batch_timestamp || ''}_${it.unit_price || it.price || 0}`;
          if (seen.has(key)) {
            const existing = deduped.find(x => (x.frontend_unique_key || `${x.item_id}_${x.batch_timestamp || ''}_${x.unit_price || x.price || 0}`) === key);
            if (existing) {
              existing.quantity = (existing.quantity || 1) + (it.quantity || 1);
              existing.line_total = (existing.unit_price || existing.price || 0) * existing.quantity;
            }
            continue;
          }
          seen.add(key);
          deduped.push(it);
        }

        return { ...prev, items: deduped, has_new_items: true };
      });
    }
  };


  const updateItemQuantity = (orderId, itemIdentifier, newQty) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const updatedItems = o.items.map(item => {
        const itemKey = item.id || item.frontend_unique_key;
        if (itemKey === itemIdentifier) {
          // DO NOT update localStorage here - only update state
          return { ...item, quantity: newQty > 0 ? newQty : 1 };
        }
        return item;
      });
      const newTotal = updatedItems.reduce((s, it) => s + ((inventoryMap[it.item_id]?.unit_price || it.unit_price || it.price || 0) * (it.quantity || 1)), 0);
      return { ...o, items: updatedItems, total_price: newTotal };
    }));

    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => ({
        ...prev,
        items: prev.items.map(item => {
          const itemKey = item.id || item.frontend_unique_key;
          if (itemKey === itemIdentifier) return { ...item, quantity: newQty > 0 ? newQty : 1 };
          return item;
        })
      }));
    }
  };
  useEffect(() => {
    const fetchOrders = async () => {
      if (!token || !clientId) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
        const allOrders = res.data?.data || [];

        const processed = allOrders.map(order => {
          if (order.status === 'served') {
            clearNewItemsStorage(order.id);
            return {
              ...order,
              _fixedOrderMode: order._fixedOrderMode ?? getInitialOrderMode(order)
            };
          }
          

          // read normalized storage items for this order
          const rawNewItems = getNewItemsFromStorage(order.id) || [];
          // build maps for quick lookup
          const storageByKey = new Map();
          const storageByBatchAndItem = new Map();
          rawNewItems.forEach(si => {
            if (!si) return;
            if (si.unique_key) storageByKey.set(String(si.unique_key), si);
            if (si.batch_timestamp && si.item_id) {
              const k = `${Number(si.batch_timestamp)}_${String(si.item_id)}`;
              // allow multiple storage keys per batch+item (we keep array)
              if (!storageByBatchAndItem.has(k)) storageByBatchAndItem.set(k, []);
              storageByBatchAndItem.get(k).push(si);
            }
          });

          const backendUniqueKeys = new Set((order.items || []).filter(i => i.frontend_unique_key).map(i => String(i.frontend_unique_key)));

          const oldItems = [];
          const batchItemsMap = new Map();

          const pushToBatch = (batchTs, itemObj) => {
            if (!batchTs) return;
            const ts = Number(batchTs);
            if (!batchItemsMap.has(ts)) batchItemsMap.set(ts, []);
            // merge same item_id in batch instead of adding duplicate
            const existingIndex = batchItemsMap.get(ts).findIndex(x => String(x.item_id) === String(itemObj.item_id) || x.frontend_unique_key === itemObj.frontend_unique_key);
            if (existingIndex >= 0) {
              const ex = batchItemsMap.get(ts)[existingIndex];
              ex.quantity = (ex.quantity || 1) + (itemObj.quantity || 1);
              ex.line_total = (ex.unit_price || ex.price || 0) * ex.quantity;
              if (!ex.frontend_unique_key && itemObj.frontend_unique_key) ex.frontend_unique_key = itemObj.frontend_unique_key;
            } else {
              batchItemsMap.get(ts).push(itemObj);
            }
          };

          // Classify backend items into batch groups or old items
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
                const last = parts[parts.length - 1];
                const maybeNum = parseFloat(last);
                if (!isNaN(maybeNum)) {
                  const possibleBatch = Math.floor(maybeNum / 1000) * 1000;
                  if (storageByBatchAndItem.has(`${possibleBatch}_${String(itemId)}`)) {
                    matchedBatch = possibleBatch;
                  }
                }
              }
            }

            if (!matchedBatch) {
              for (const [k, arr] of storageByBatchAndItem.entries()) {
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

          // Add storage-only items that backend doesn't claim (by unique_key)
          rawNewItems.forEach(si => {
            if (!si || !si.unique_key) return;
            if (backendUniqueKeys.has(String(si.unique_key))) return;
            if (!si.batch_timestamp || !si.item_id) return;
            const itemInfo = inventoryMap[si.item_id];
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
              image: itemInfo.image
            });
          });

          // combine: old items then batch groups (sorted)
          let allItems = [...oldItems];
          const sortedTimestamps = Array.from(batchItemsMap.keys()).sort((a, b) => a - b);
          sortedTimestamps.forEach(ts => {
            const batchArr = (batchItemsMap.get(ts) || []).map(it => ({ ...it }));
            if (batchArr.length > 0) {
              batchArr[0] = { ...batchArr[0], _isBatchStart: true };
              allItems.push(...batchArr);
            }
          });

          // final dedupe pass (prefer frontend_unique_key)
          const seen = new Set();
          const deduped = [];
          for (const it of allItems) {
            const key = it.frontend_unique_key ? String(it.frontend_unique_key) : `${it.item_id}_${it.batch_timestamp || 0}_${it.unit_price || it.price || 0}`;
            if (seen.has(key)) {
              const existing = deduped.find(x => (x.frontend_unique_key ? String(x.frontend_unique_key) === key : `${x.item_id}_${x.batch_timestamp || 0}_${x.unit_price || x.price || 0}` === key));
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
            _fixedOrderMode: order._fixedOrderMode ?? getInitialOrderMode(order),
            items: deduped,
            has_new_items: batchItemsMap.size > 0
          };
          
        });

        setOrders(processed);
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
  }, [clientId, token, inventoryMap]);



  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === 'served') return;
    const tableObj = tables.find(t => t.id === order.table_id);
    try {
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`, { id: orderId, client_id: clientId, status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      if (tableObj) {
        await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`, {
          id: order.table_id,
          client_id: clientId,
          name: tableObj.name,
          table_type: tableObj.table_type,
          status: 'Vacant',
          location_zone: tableObj.location_zone
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      toast.success('Order status updated');
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: newStatus,
        has_new_items: newStatus === 'served' ? false : o.has_new_items
      } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          status: newStatus,
          has_new_items: newStatus === 'served' ? false : prev.has_new_items
        }));
      }
      if (newStatus === 'served') setEditOrderId(null);
    } catch (err) {
      toast.error('❌ Failed to update order status.');
    }
  };

  const cancelItem = async (orderId, itemBackendId) => {
    const order = orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemBackendId);
    if (!item) return;

    try {
      if (typeof itemBackendId === 'string' && (itemBackendId.startsWith('temp_') || !itemBackendId.includes('_'))) {
        const storageKey = `order_${orderId}_new_item_${item.frontend_unique_key}`;
        localStorage.removeItem(storageKey);
        const updatedOrders = orders.map(o => {
          if (o.id !== orderId) return o;
          const updatedItems = o.items.filter(i => i.id !== itemBackendId);
          return { ...o, items: updatedItems, has_new_items: updatedItems.some(i => i.is_new_item) };
        });
        setOrders(updatedOrders);
        if (selectedOrder?.id === orderId) {
          const updatedOrder = updatedOrders.find(o => o.id === orderId);
          if (updatedOrder) setSelectedOrder(updatedOrder);
        }
        toast.success('Item removed');
        return;
      }

      await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`, {
        params: { order_item_id: itemBackendId, client_id: clientId },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (item.is_new_item && item.frontend_unique_key) {
        localStorage.removeItem(`order_${orderId}_new_item_${item.frontend_unique_key}`);
      }

      const updatedOrders = orders.map(o => {
        if (o.id !== orderId) return o;
        const updatedItems = o.items.filter(i => i.id !== itemBackendId);
        const newTotal = updatedItems.reduce((sum, it) => {
          const price = inventoryMap[it.item_id]?.unit_price || it.price || 0;
          return sum + (it.quantity || 1) * price;
        }, 0);
        return { ...o, items: updatedItems, total_price: newTotal, has_new_items: updatedItems.some(i => i.is_new_item) };
      });

      setOrders(updatedOrders);
      if (selectedOrder?.id === orderId) {
        const updatedOrder = updatedOrders.find(o => o.id === orderId);
        if (updatedOrder) setSelectedOrder(updatedOrder);
      }

      const newOrder = updatedOrders.find(o => o.id === orderId);
      if (newOrder) {
        await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`, {
          id: orderId,
          total_price: newOrder.total_price
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      toast.success('Item cancelled and total updated');
    } catch (err) {
      toast.error('❌ Failed to cancel item.');
    }
  };

  // ---------- REPLACE updateOrderItems ----------
  const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
    const newItemsToSave = updatedItemsWithStatuses.filter(item => item.is_new_item);

    // Save batch info if there are new items
    if (newItemsToSave.length > 0 && currentBatchTimestamp) {
      // ensure batch meta has been persisted (so storage and UI agree)
      localStorage.setItem(`order_${orderId}_batch_${currentBatchTimestamp}`, JSON.stringify({
        timestamp: currentBatchTimestamp,
        started_at: Date.now()
      }));

      // Save each new item to localStorage (include batch_timestamp)
      newItemsToSave.forEach(item => {
        const storageKey = `order_${orderId}_new_item_${item.frontend_unique_key}`;
        localStorage.setItem(storageKey, JSON.stringify({
          item_id: item.item_id,
          unique_key: item.frontend_unique_key,
          added_at: item.added_at_frontend,
          batch_timestamp: item.batch_timestamp || currentBatchTimestamp,
          quantity: item.quantity || 1,
          is_line_item: item.is_line_item || false
        }));
      });
    }

    const itemsToSave = updatedItemsWithStatuses.filter(item => typeof item.id === 'number' || item.is_new_item);
    const cleanedItems = itemsToSave.map(item => {
      const inventoryItem = inventoryMap[item.item_id || item.inventory_id];

      const unitPrice =
        item.unit_price ??
        item.price ??
        inventoryItem?.unit_price ??
        0;

      return {
        item_id: item.item_id || item.inventory_id,
        item_name: item.item_name || item.name,
        quantity: item.quantity || 1,
        status: item.status || 'pending',
        note: item.note || '',
        slug: item.slug || '',
        price: unitPrice,
        unit_price: unitPrice,
        line_total: unitPrice * (item.quantity || 1),
        client_id: clientId,
        order_id: orderId,
        frontend_unique_key: item.frontend_unique_key || null
      };
    });

    const totalPrice = cleanedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    try {
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderId}`, cleanedItems, { headers: { Authorization: `Bearer ${token}` } });
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`, { id: orderId, total_price: totalPrice }, { headers: { Authorization: `Bearer ${token}` } });

      // reset editing state
      setCurrentBatchTimestamp(null);
      setEditOrderId(null);
      setItemSearchQuery('');
      toast.success('Items saved successfully!');

      // REFRESH the orders from server and rebuild merged order exactly like fetchOrders does
      // We'll call the same network used in fetchOrders: get all dinein table orders and then process the single order.
      const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = res.data?.data || [];
      const updatedOrderFromBackend = allOrders.find(o => o.id === orderId);

      if (!updatedOrderFromBackend) {
        // fallback: just refetch everything (the main polling fetch will update soon)
        return;
      }

      // Reconstruct merged order using same rules as fetchOrders
      const batches = getBatchesFromStorage(orderId);
      const newItemsFromStorage = getNewItemsFromStorage(orderId);

      if (batches.length === 0 && newItemsFromStorage.length === 0) {
        // nothing custom to merge - use backend item directly
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrderFromBackend : o));
        if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrderFromBackend);
        return;
      }

      // build storage maps
      const storageByKey = new Map();
      const storageByBatchAndItem = new Map();
      newItemsFromStorage.forEach(si => {
        if (!si) return;
        if (si.unique_key) storageByKey.set(si.unique_key, si);
        if (si.batch_timestamp && si.item_id) {
          const k = `${si.batch_timestamp}_${si.item_id}`;
          if (!storageByBatchAndItem.has(k)) storageByBatchAndItem.set(k, []);
          storageByBatchAndItem.get(k).push(si.unique_key || null);
        }
      });

      const backendUniqueKeys = new Set(updatedOrderFromBackend.items.filter(i => i.frontend_unique_key).map(i => i.frontend_unique_key));

      const oldItems = [];
      const batchGroups = new Map();
      batches.forEach(b => batchGroups.set(b.timestamp, []));

      // classify backend items into oldItems or a batch group
      updatedOrderFromBackend.items.forEach(item => {
        let matchedBatch = null;
        if (item.frontend_unique_key && storageByKey.has(item.frontend_unique_key)) {
          const storageItem = storageByKey.get(item.frontend_unique_key);
          if (storageItem && storageItem.batch_timestamp) matchedBatch = storageItem.batch_timestamp;
        }
        if (!matchedBatch && item.frontend_unique_key) {
          const parts = item.frontend_unique_key.split('_');
          if (parts.length >= 2) {
            const extracted = parseFloat(parts[parts.length - 1]);
            if (!isNaN(extracted)) matchedBatch = Math.floor(extracted / 1000) * 1000;
          }
          if (matchedBatch && !storageByBatchAndItem.has(`${matchedBatch}_${item.item_id}`)) {
            matchedBatch = null;
          }
        }
        if (!matchedBatch) {
          for (const [k, keysArr] of storageByBatchAndItem.entries()) {
            const [_batch, _itemId] = k.split('_');
            if (String(item.item_id) === String(_itemId)) {
              matchedBatch = Number(_batch);
              break;
            }
          }
        }
        if (matchedBatch) {
          if (!batchGroups.has(matchedBatch)) batchGroups.set(matchedBatch, []);
          batchGroups.get(matchedBatch).push({ ...item, is_new_item: true, batch_timestamp: matchedBatch });
        } else {
          oldItems.push(item);
        }
      });

      // add storage-only items
      newItemsFromStorage.forEach(si => {
        if (!si || !si.unique_key) return;
        if (backendUniqueKeys.has(si.unique_key)) return;
        const itemInfo = inventoryMap[si.item_id];
        if (!itemInfo) return;
        if (!si.batch_timestamp) return;
        if (!batchGroups.has(si.batch_timestamp)) batchGroups.set(si.batch_timestamp, []);
        batchGroups.get(si.batch_timestamp).push({
          item_id: si.item_id,
          item_name: itemInfo.name,
          quantity: si.quantity || 1,
          price: itemInfo.unit_price,
          status: 'pending',
          note: '',
          slug: itemInfo.slug || generateSlug(itemInfo.name),
          added_at_frontend: si.added_at,
          frontend_unique_key: si.unique_key,
          is_new_item: true,
          batch_timestamp: si.batch_timestamp,
          id: si.unique_key,
          image: itemInfo.image
        });
      });

      // Build final items list
      let newAllItems = [...oldItems];
      const sortedTs = Array.from(batchGroups.keys()).sort((a, b) => a - b);
      sortedTs.forEach(ts => {
        const bitems = (batchGroups.get(ts) || []).map(it => ({ ...it }));
        if (bitems.length > 0) {
          bitems[0] = { ...bitems[0], _isBatchStart: true };
          newAllItems.push(...bitems);
        }
      });

      // dedupe and merge quantities
      const seen2 = new Set();
      const dedupedNewAll = [];
      for (const it of newAllItems) {
        const key = it.frontend_unique_key || `${it.item_id}_${it.batch_timestamp || ''}_${it.unit_price || it.price || 0}`;
        if (seen2.has(key)) {
          const existing = dedupedNewAll.find(x => (x.frontend_unique_key || `${x.item_id}_${x.batch_timestamp || ''}_${x.unit_price || x.price || 0}`) === key);
          if (existing) {
            existing.quantity = (existing.quantity || 1) + (it.quantity || 1);
            existing.line_total = (existing.unit_price || existing.price || 0) * existing.quantity;
          }
          continue;
        }
        seen2.add(key);
        dedupedNewAll.push(it);
      }

      const processedOrder = { ...updatedOrderFromBackend, items: dedupedNewAll, has_new_items: dedupedNewAll.length > oldItems.length };
      setOrders(prev => prev.map(o => o.id === orderId ? processedOrder : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(processedOrder);

    } catch (err) {
      console.error('Save error', err);
      toast.error('Failed to update items or total.');
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`, {
        params: { dinein_order_id: orderToDelete, client_id: clientId },
        headers: { Authorization: `Bearer ${token}` }
      });

      const deletedOrder = orders.find(o => o.id === orderToDelete);
      const tableIdOfDeletedOrder = deletedOrder?.table_id;

      if (tableIdOfDeletedOrder) {
        const tableObj = tables.find(t => t.id === tableIdOfDeletedOrder);
        await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`, {
          id: tableIdOfDeletedOrder,
          client_id: clientId,
          name: tableObj?.name || '',
          table_type: tableObj?.table_type || '',
          status: 'Vacant',
          location_zone: tableObj?.location_zone || ''
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      setOrders(prev => prev.filter(o => o.id !== orderToDelete));
      setShowDeleteModal(false);
      setOrderToDelete(null);
      toast.success('Order deleted and table marked vacant.');
      fetchTables();
    } catch (err) {
      toast.error('❌ Failed to delete order');
    }
  };

  const toggleVisibleItems = (orderId) => {
    setVisibleOrderId(prev => (prev === orderId ? null : orderId));
  };

  // First filter by date
  let filteredOrders = selectedDate ? orders.filter(order => {
    const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
    return orderDate === selectedDate;
  }) : orders;

  const toggleOrderMode = (mode) => {
    setSelectedOrderModes(prev => {
      // If "all" is clicked → reset everything
      if (mode === 'all') return ['all'];

      // Remove "all" when selecting specific modes
      let updated = prev.filter(m => m !== 'all');

      // Toggle logic
      if (updated.includes(mode)) {
        updated = updated.filter(m => m !== mode);
      } else {
        updated.push(mode);
      }

      // If nothing selected → fallback to all
      return updated.length === 0 ? ['all'] : updated;
    });
  };


  // Filter by order mode
  if (!selectedOrderModes.includes('all')) {
    filteredOrders = filteredOrders.filter(order =>
      selectedOrderModes.includes(order._fixedOrderMode)
    );
  }

  const getInitialOrderMode = (order) => {
    // takeaway is ONLY when table_id === 500 at creation
    if (Number(order.table_id) === 500) return 'takeaway';
    return 'dinein';
  };
  

  // Then filter by status
  switch (filterMode) {
    case 0:
      filteredOrders = [...filteredOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 1:
      filteredOrders = [...filteredOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
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
    default:
      break;
  }



  const handleGenerateBill = (order) => {
    navigate(`/saas/${clientId}/billing`, {
      state: {
        orderId: order.id,
        tableId: order.table_id,
        clientId
      }
    });
  };




  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto px-4 py-2">
        <div className="rounded-lg p-2 mb-2">
          {/* Order Mode Filter - Horizontal Tabs */}
          <div className="mb-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => toggleOrderMode('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedOrderModes.includes('all')
                  ? 'bg-action-primary text-text-white shadow-sm'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
              >
                <Filter size={16} />
                <span>All Orders</span>
              </button>

              <button
                onClick={() => toggleOrderMode('dinein')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedOrderModes.includes('dinein')
                  ? 'bg-action-primary text-text-white shadow-sm'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
              >
                <Users size={16} />
                <span>Dine In</span>
              </button>

              <button
                onClick={() => toggleOrderMode('takeaway')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedOrderModes.includes('takeaway')
                  ? 'bg-action-primary text-text-white shadow-sm'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
              >
                <Package size={16} />
                <span>Takeaway</span>
              </button>

              <button
                onClick={() => toggleOrderMode('delivery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedOrderModes.includes('delivery')
                  ? 'bg-action-primary text-text-white shadow-sm'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
              >
                <Truck size={16} />
                <span>Delivery</span>
              </button>

              <div className="flex justify-end">
                <div className="relative w-full sm:w-auto">
                  <Filter
                    className="absolute left-3 top-1/2 text-text-secondary transform -translate-y-1/2"
                    size={20}
                  />
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(Number(e.target.value))}
                    className="w-full sm:w-auto pl-10 pr-4 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary"
                  >
                    <option value={0}>All Status</option>
                    <option value={2}>Pending</option>
                    <option value={3}>Preparing</option>
                    <option value={4}>Ready</option>
                    <option value={5}>Served</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredOrders.length === 0 ? (
            <div className="rounded-xl p-8 lg:p-12 text-center col-span-full bg-bg-primary border-default border-border-default shadow-card">
              <p className="text-text-secondary text-base">No orders found</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const status = order.status?.toLowerCase();

              const cardBg =
                status === 'pending'
                  ? 'bg-orange-50'
                  : status === 'preparing'
                    ? 'bg-yellow-50'
                    : status === 'ready'
                      ? 'bg-green-50'
                      : status === 'served'
                        ? 'bg-green-100'
                        : '';

              const statusBadge =
                status === 'pending'
                  ? 'bg-orange-500 text-white'
                  : status === 'preparing'
                    ? 'bg-yellow-400 text-yellow-900'
                    : status === 'ready'
                      ? 'bg-green-500 text-white'
                      : status === 'served'
                        ? 'bg-green-700 text-white'
                        : 'bg-transparent text-text-primary';

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl overflow-hidden shadow-md border border-gray-200 flex flex-col h-full ${cardBg}`}
                >
                  {/* HEADER */}
                  <div className="bg-action-primary px-4 py-3 text-text-black rounded-t-2xl">
                    <div className="flex justify-between">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-bg-primary text-text-secondary border border-border-default">
                        {order._fixedOrderMode=== 'dinein' ? <Users size={10} /> : <Package size={10} />}
                        {order._fixedOrderMode=== 'dinein' ? 'Dine In' : 'Takeaway'}
                      </span>


                      <button
                        onClick={() => {
                          setOrderToDelete(order.id);
                          setShowDeleteModal(true);
                        }}
                        className="text-text-white p-2 rounded-lg hover:bg-black/10"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2 gap-2">
                      <h3 className="text-lg font-bold text-text-white truncate">
                        {order._fixedOrderMode  === 'takeaway'
                          ? order.customer_name || 'Take Away'
                          : tablesMap[order.table_id] || order.table || order.table_id}
                      </h3>

                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xl font-bold ${statusBadge}`}>
                        {(status === 'ready' || status === 'served') && '✔'}
                        {order.status}
                      </span>

                      <span className="text-lg font-bold text-text-white">
                        #{order.id}
                      </span>

                    </div>
                  </div>

                  {/* BODY */}
                  <div className="flex-1 overflow-y-auto bg-bg-primary px-4 py-4 space-y-3">
                    {order.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white rounded-lg"
                      >
                        <span className="text-sm font-medium">
                          <span className="mr-2">{it.quantity} ×</span>
                          {it.item_name || 'Unnamed Item'}
                        </span>

                        <span className="text-sm text-gray-600">
                          ₹{(
                            (inventoryMap[it.item_id]?.unit_price ||
                              it.unit_price ||
                              it.price ||
                              0) *
                            (it.quantity || 1)
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* ACTIONS */}
                  <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 space-y-3">
                    {/* Existing buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setEditOrderId(order.id);
                          setShowOrderDetailModal(true);
                          setActiveTab('items');
                        }}
                        className="flex-1 px-4 py-2 rounded-lg bg-action-primary text-text-white text-sm font-semibold"
                      >
                        Edit Order
                      </button>

                      <button
                        onClick={() => status === 'ready' && handleStatusChange(order.id, 'served')}
                        disabled={status !== 'ready'}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all
    ${status === 'ready'
                            ? 'bg-action-success text-text-white hover:opacity-90'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        Mark as Served
                      </button>

                    </div>

                    {/* NEW: Generate Bill button */}
                    {status === 'served' && (
                      <button
                        onClick={() => handleGenerateBill(order)}
                        className="w-full px-4 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold shadow-md transition-all"
                      >
                        Generate Bill
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {
        showOrderDetailModal && selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg backdrop-blur-sm"
            onClick={() => {
              setShowOrderDetailModal(false);
              setEditOrderId(null);
              setActiveTab('items');
            }}
          >
            <div
              className="rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col bg-bg-primary shadow-2xl border-default border-border-default"
              onClick={(e) => e.stopPropagation()}
            >

              {/* HEADER */}
              <div className="px-4 sm:px-6 py-4 border-b border-border-default bg-gradient-to-r from-action-primary/10 via-bg-tertiary to-action-primary/5">
                <div className="flex items-center justify-between gap-4">

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-text-primary">
                      {tablesMap[selectedOrder.table_id] ||
                        selectedOrder.table ||
                        selectedOrder.table_id}
                    </h3>

                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-2xl font-extrabold text-text-primary">
                        {selectedOrder.items.length} items
                      </span>

                      {/* <span className="text-sm font-semibold text-text-secondary">
                  {relativeTime}
                </span> */}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right bg-gradient-to-br from-action-primary/10 to-action-primary/5 px-4 py-2 rounded-xl border border-action-primary/20 shadow-sm">
                      <div className="text-xs font-semibold text-text-secondary uppercase">
                        Total
                      </div>
                      <div className="text-xl font-bold text-action-primary">
                        ₹{selectedOrder.items.reduce(
                          (sum, item) =>
                            sum +
                            ((inventoryMap[item.item_id]?.unit_price ||
                              item.unit_price ||
                              item.price ||
                              0) *
                              (item.quantity || 1)),
                          0
                        ).toFixed(2)}
                      </div>
                    </div>

                    <button
                      className="p-2 rounded-xl hover:bg-bg-tertiary"
                      onClick={() => {
                        setShowOrderDetailModal(false);
                        setEditOrderId(null);
                        setActiveTab('items');
                      }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* MOBILE TABS */}
              <div className="lg:hidden border-b border-border-default bg-bg-tertiary">
                <div className="flex">
                  <button
                    className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'items'
                      ? 'text-action-primary border-b-2 border-action-primary bg-bg-primary'
                      : 'text-text-secondary'
                      }`}
                    onClick={() => setActiveTab('items')}
                  >
                    Items
                  </button>
                  <button
                    className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'available'
                      ? 'text-action-primary border-b-2 border-action-primary bg-bg-primary'
                      : 'text-text-secondary'
                      }`}
                    onClick={() => setActiveTab('available')}
                  >
                    Add Items
                  </button>
                </div>
              </div>

              {/* CONTENT */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                {/* AVAILABLE ITEMS */}
                {/* AVAILABLE ITEMS */}
                <div
                  className={`w-full lg:w-2/5 border-r border-border-default bg-bg-tertiary flex flex-col ${activeTab === 'available' ? 'block' : 'hidden lg:flex'
                    }`}
                >
                  {/* Search bar (fixed) */}
                  <div className="p-4 border-b border-border-default bg-bg-primary shrink-0">
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-xl border border-border-default"
                      placeholder="Search items..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* SCROLL AREA */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {(itemSearchResults.length > 0
                      ? itemSearchResults
                      : allInventoryItems
                    ).map(item => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-bg-primary border border-border-default cursor-pointer hover:border-action-primary"
                        onClick={() => {
                          handleItemSelection(selectedOrder.id, item);
                          setActiveTab('items');
                        }}
                      >
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm font-bold text-action-primary">
                          ₹{item.unit_price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


                {/* ORDER ITEMS */}
                <div
                  className={`w-full lg:w-3/5 bg-bg-primary ${activeTab === 'items' ? 'block' : 'hidden lg:block'
                    }`}
                >
                  <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {selectedOrder.items.map((item, idx) => {
                      const prev = selectedOrder.items[idx - 1];
                      const showDivider =
                        item._isBatchStart ||
                        (item.is_new_item &&
                          (!prev ||
                            (prev.batch_timestamp || null) !==
                            (item.batch_timestamp || null)));

                      return (
                        <div key={item.id || idx}>
                          {showDivider && (
                            <div className="flex items-center my-4">
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-action-primary to-transparent" />
                              <span className="px-3 py-1.5 text-action-primary bg-action-primary/10 text-xs font-bold rounded-full mx-3 border border-action-primary/30">
                                New Items
                              </span>
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-action-primary to-transparent" />
                            </div>
                          )}

                          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary border border-border-default">
                            <div className="font-semibold text-sm">
                              {item.item_name || item.item_id}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  updateItemQuantity(
                                    selectedOrder.id,
                                    item.id || item.frontend_unique_key,
                                    Math.max(1, item.quantity - 1)
                                  )
                                }
                                className="px-3 py-1 rounded-lg border"
                              >
                                −
                              </button>

                              <span className="px-3 font-bold">{item.quantity}</span>

                              <button
                                onClick={() =>
                                  updateItemQuantity(
                                    selectedOrder.id,
                                    item.id || item.frontend_unique_key,
                                    item.quantity + 1
                                  )
                                }
                                className="px-3 py-1 rounded-lg border"
                              >
                                +
                              </button>

                              <button
                                className="p-2 rounded-lg bg-red-50 text-red-600"
                                onClick={() => {
                                  setDeleteTarget({
                                    orderId: selectedOrder.id,
                                    itemBackendId: item.id,
                                  });
                                  setShowDeleteModals(true);
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="p-4 border-t border-border-default bg-bg-tertiary flex gap-3">
                <button
                  className="flex-1 bg-action-primary text-text-white py-3 rounded-xl font-semibold"
                  onClick={() => {
                    updateOrderItems(selectedOrder.id, selectedOrder.items);
                    setShowOrderDetailModal(false);
                    setEditOrderId(null);
                  }}
                >
                  Save Changes
                </button>

                <button
                  className="flex-1 bg-bg-primary border border-border-default py-3 rounded-xl font-semibold"
                  onClick={() => {
                    setShowOrderDetailModal(false);
                    setEditOrderId(null);
                    setActiveTab('items');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }



      <style>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-border-default);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-action-primary);
  }
`}</style>

      <LineItemsModal
        isOpen={lineItemsModalOpen}
        onClose={() => setLineItemsModalOpen(false)}
        mainItem={selectedMainItem}
        lineItems={lineItemsDetails}
        onAddMainOnly={handleAddMainItemOnly}
        onAddWithAddons={handleAddMainItemWithLineItems}
      />

      <SimpleDeleteConfirm
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteOrder}
        title="Delete Order"
        message="Want to Delete this Order ?"
      />

      <SimpleDeleteConfirm
        isOpen={showDeleteModals}
        onClose={() => setShowDeleteModals(false)}
        onConfirm={() => { cancelItem(deleteTarget.orderId, deleteTarget.itemBackendId); setShowDeleteModals(false); }}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
      />
    </div >
  );
};

export default OrderSummaryVisible;
