import React, { useEffect, useState } from "react";
import axios from 'axios';
import { toast } from "react-toastify";
import { MdOutlineKeyboardDoubleArrowDown } from "react-icons/md";
import Modal from "react-modal";
import { X, Edit2, Trash2, Search, Filter } from 'lucide-react';

Modal.setAppElement("#root");

const SimpleDeleteConfirm = ({ isOpen, onClose, onConfirm, title = 'Delete', message = 'Are you sure?' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg w-full max-w-sm" style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-card)', border: `1px solid var(--color-border-default)` }}>
        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border-default)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-action-danger)' }}>{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{message}</p>
        </div>
        <div className="px-6 py-4 rounded-b-lg flex gap-3" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderTop: `1px solid var(--color-border-default)` }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: `1px solid var(--color-border-default)`,
              color: 'var(--color-text-primary)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors"
            style={{
              backgroundColor: 'var(--color-action-danger)',
              color: 'var(--color-text-white)'
            }}
          >
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg w-full max-w-lg" style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-card)', border: `1px solid var(--color-border-default)` }}>
        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border-default)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{mainItem?.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>This item comes with the following add-ons:</p>
          <div className="space-y-2">
            {lineItems.map((li, idx) => (
              <div key={li.id} className="flex justify-between items-center px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid var(--color-border-default)` }}>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{idx + 1}. {li.name}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--color-action-primary)' }}>₹{li.unit_price}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 rounded-b-lg flex gap-3" style={{ backgroundColor: 'var(--color-bg-primary)', borderTop: `1px solid var(--color-border-default)` }}>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: `1px solid var(--color-border-default)` }}
          >
            Cancel
          </button>
          <button onClick={onAddMainOnly} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
            style={{ backgroundColor: 'var(--color-action-primary)', color: 'var(--color-text-white)' }}
          >
            Main Only
          </button>
          <button onClick={onAddWithAddons} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
            style={{ backgroundColor: 'var(--color-action-success)', color: 'var(--color-text-white)' }}
          >
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

  const getOrderBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'served':
        return 'bg-green-200';
      case 'pending':
        return 'bg-yellow-100';
      case 'preparing':
        return 'bg-blue-200';
      case 'new':
        return 'bg-orange-100';
      default:
        return 'bg-white';
    }
  };

  const generateSlug = name => name.toLowerCase().replace(/[\s]+/g, '-');

  const getNewItemsFromStorage = orderId => {
    const arr = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`order_${orderId}_new_item_`)) {
        try { arr.push(JSON.parse(localStorage.getItem(key))); } catch (e) { console.error(e); }
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

  const addItemToOrderWithBatch = (orderId, selectedItem, forcedBatchTimestamp, isMainItem = false) => {
    const existingItemInCurrentBatch = selectedOrder?.items.find(item =>
      item.item_id === selectedItem.id && item.is_new_item && item.batch_timestamp === forcedBatchTimestamp
    );

    if (existingItemInCurrentBatch) {
      const itemIdentifier = existingItemInCurrentBatch.id || existingItemInCurrentBatch.frontend_unique_key;
      updateItemQuantity(orderId, itemIdentifier, existingItemInCurrentBatch.quantity + 1);
      return;
    }

    const timestamp = Date.now() + Math.random();
    const uniqueKey = `${selectedItem.id}_${timestamp}`;
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
      batch_timestamp: forcedBatchTimestamp,
      id: uniqueKey,
      image: selectedItem.image,
      is_line_item: !isMainItem
    };

    // DO NOT save to localStorage here - only save when "Save Changes" is clicked

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

      if (!newItemsByBatch.has(forcedBatchTimestamp)) newItemsByBatch.set(forcedBatchTimestamp, []);
      newItemsByBatch.get(forcedBatchTimestamp).push(newItem);

      const allItems = [...oldItems];
      const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);
      sortedTimestamps.forEach(ts => {
        const batchItems = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
        if (batchItems.length > 0) {
          batchItems[0] = { ...batchItems[0], _isBatchStart: true };
          allItems.push(...batchItems);
        }
      });
      return { ...o, items: allItems, has_new_items: true };
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

        if (!newItemsByBatch.has(forcedBatchTimestamp)) newItemsByBatch.set(forcedBatchTimestamp, []);
        newItemsByBatch.get(forcedBatchTimestamp).push(newItem);

        const allItems = [...oldItems];
        const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);
        sortedTimestamps.forEach(ts => {
          const batchItems = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
          if (batchItems.length > 0) {
            batchItems[0] = { ...batchItems[0], _isBatchStart: true };
            allItems.push(...batchItems);
          }
        });
        return { ...prev, items: allItems, has_new_items: true };
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

  const addItemToOrder = (orderId, selectedItem) => {
    const existingItemInCurrentBatch = selectedOrder?.items.find(item =>
      item.item_id === selectedItem.id && item.is_new_item && item.batch_timestamp === currentBatchTimestamp
    );

    if (existingItemInCurrentBatch) {
      const itemIdentifier = existingItemInCurrentBatch.id || existingItemInCurrentBatch.frontend_unique_key;
      updateItemQuantity(orderId, itemIdentifier, existingItemInCurrentBatch.quantity + 1);
      return;
    }

    let batchTimestamp = currentBatchTimestamp;
    if (!batchTimestamp) {
      batchTimestamp = Date.now();
      setCurrentBatchTimestamp(batchTimestamp);
      // DO NOT save batch to localStorage here
    }

    const timestamp = Date.now() + Math.random();
    const uniqueKey = `${selectedItem.id}_${timestamp}`;
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
      batch_timestamp: batchTimestamp,
      id: uniqueKey,
      image: selectedItem.image
    };

    // DO NOT save to localStorage here - only save when "Save Changes" is clicked

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

      if (!newItemsByBatch.has(batchTimestamp)) newItemsByBatch.set(batchTimestamp, []);
      newItemsByBatch.get(batchTimestamp).push(newItem);

      const allItems = [...oldItems];
      const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);
      sortedTimestamps.forEach(ts => {
        const batchItems = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
        if (batchItems.length > 0) {
          batchItems[0] = { ...batchItems[0], _isBatchStart: true };
          allItems.push(...batchItems);
        }
      });
      return { ...o, items: allItems, has_new_items: true };
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

        if (!newItemsByBatch.has(batchTimestamp)) newItemsByBatch.set(batchTimestamp, []);
        newItemsByBatch.get(batchTimestamp).push(newItem);

        const allItems = [...oldItems];
        const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);
        sortedTimestamps.forEach(ts => {
          const batchItems = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
          if (batchItems.length > 0) {
            batchItems[0] = { ...batchItems[0], _isBatchStart: true };
            allItems.push(...batchItems);
          }
        });
        return { ...prev, items: allItems, has_new_items: true };
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

        setOrders(allOrders.map(order => {
          if (order.status === 'served') {
            clearNewItemsStorage(order.id);
            return order;
          }

          const newItemsFromStorage = getNewItemsFromStorage(order.id);
          const storageUniqueKeys = new Set(newItemsFromStorage.map(i => i.unique_key));
          const keyToBatchMap = new Map();
          newItemsFromStorage.forEach(si => {
            if (si.unique_key && si.batch_timestamp) keyToBatchMap.set(si.unique_key, si.batch_timestamp);
          });

          const oldItems = [];
          const batchItemsMap = new Map();
          const backendUniqueKeys = new Set(order.items.filter(i => i.frontend_unique_key).map(i => i.frontend_unique_key));

          order.items.forEach(item => {
            if (item.frontend_unique_key) {
              let batchTimestamp = keyToBatchMap.get(item.frontend_unique_key);
              if (!batchTimestamp) {
                const parts = item.frontend_unique_key.split('_');
                if (parts.length >= 2) {
                  const extracted = parseFloat(parts[parts.length - 1]);
                  if (!isNaN(extracted)) batchTimestamp = Math.floor(extracted / 1000) * 1000;
                }
              }
              if (batchTimestamp) {
                if (!batchItemsMap.has(batchTimestamp)) batchItemsMap.set(batchTimestamp, []);
                batchItemsMap.get(batchTimestamp).push({ ...item, is_new_item: true, batch_timestamp: batchTimestamp });
              } else oldItems.push(item);
            } else oldItems.push(item);
          });

          newItemsFromStorage.forEach(si => {
            if (!backendUniqueKeys.has(si.unique_key)) {
              const itemInfo = inventoryMap[si.item_id];
              if (itemInfo && si.batch_timestamp) {
                if (!batchItemsMap.has(si.batch_timestamp)) batchItemsMap.set(si.batch_timestamp, []);
                batchItemsMap.get(si.batch_timestamp).push({
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
              }
            }
          });

          const allItems = [...oldItems];
          const sortedTimestamps = Array.from(batchItemsMap.keys()).sort((a, b) => a - b);
          sortedTimestamps.forEach(ts => {
            const batchItems = (batchItemsMap.get(ts) || []).map(it => ({ ...it }));
            if (batchItems.length > 0) {
              batchItems[0] = { ...batchItems[0], _isBatchStart: true };
              allItems.push(...batchItems);
            }
          });

          return { ...order, items: allItems, has_new_items: batchItemsMap.size > 0 };
        }));
      } catch (err) {
        toast.error('Failed to fetch orders');
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

  const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
    // First, save all new items to localStorage with their batch timestamp
    const newItemsToSave = updatedItemsWithStatuses.filter(item => item.is_new_item);

    // Save batch info if there are new items
    if (newItemsToSave.length > 0 && currentBatchTimestamp) {
      localStorage.setItem(`order_${orderId}_batch_${currentBatchTimestamp}`, JSON.stringify({
        timestamp: currentBatchTimestamp,
        started_at: Date.now()
      }));

      // Save each new item to localStorage
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
    const cleanedItems = itemsToSave.map(item => ({
      item_id: item.item_id || item.inventory_id,
      item_name: item.name || item.item_name,
      quantity: item.quantity || 1,
      status: item.status || 'pending',
      note: item.note || '',
      slug: item.slug || '',
      price: item.unit_price || item.price || inventoryMap[item.item_id || item.inventory_id]?.unit_price || 0,
      unit_price: item.unit_price || item.price || inventoryMap[item.item_id || item.inventory_id]?.unit_price || 0,
      line_total: (item.unit_price || item.price || 0) * (item.quantity || 1),
      client_id: clientId,
      order_id: orderId,
      frontend_unique_key: item.frontend_unique_key || null
    }));

    const totalPrice = cleanedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    try {
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderId}`, cleanedItems, { headers: { Authorization: `Bearer ${token}` } });
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`, { id: orderId, total_price: totalPrice }, { headers: { Authorization: `Bearer ${token}` } });
      setCurrentBatchTimestamp(null);
      setEditOrderId(null);
      setItemSearchQuery('');
      toast.success('Items saved successfully!');

      const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = res.data?.data || [];
      const updatedOrderFromBackend = allOrders.find(o => o.id === orderId);

      if (updatedOrderFromBackend) {
        const batches = getBatchesFromStorage(orderId);
        const newItemsFromStorage = getNewItemsFromStorage(orderId);

        if (batches.length === 0 && newItemsFromStorage.length === 0) {
          setOrders(prev => prev.map(o => o.id === orderId ? updatedOrderFromBackend : o));
          if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrderFromBackend);
          return;
        }

        batches.sort((a, b) => a.timestamp - b.timestamp);
        const storageMap = new Map();
        newItemsFromStorage.forEach(si => storageMap.set(si.unique_key, si));
        const storageUniqueKeys = new Set(newItemsFromStorage.map(i => i.unique_key));
        const backendUniqueKeys = new Set(updatedOrderFromBackend.items.filter(i => i.frontend_unique_key).map(i => i.frontend_unique_key));

        const oldItems = [];
        updatedOrderFromBackend.items.forEach(item => {
          if (!item.frontend_unique_key || !storageUniqueKeys.has(item.frontend_unique_key)) oldItems.push(item);
        });

        const batchGroups = new Map();
        batches.forEach(b => batchGroups.set(b.timestamp, []));

        updatedOrderFromBackend.items.forEach(item => {
          if (item.frontend_unique_key && storageUniqueKeys.has(item.frontend_unique_key)) {
            const storageItem = storageMap.get(item.frontend_unique_key);
            if (storageItem && storageItem.batch_timestamp) {
              if (!batchGroups.has(storageItem.batch_timestamp)) batchGroups.set(storageItem.batch_timestamp, []);
              batchGroups.get(storageItem.batch_timestamp).push({ ...item, is_new_item: true, batch_timestamp: storageItem.batch_timestamp });
            }
          }
        });

        newItemsFromStorage.forEach(si => {
          if (!backendUniqueKeys.has(si.unique_key)) {
            const itemInfo = inventoryMap[si.item_id];
            if (itemInfo && si.batch_timestamp) {
              if (!batchGroups.has(si.batch_timestamp)) batchGroups.set(si.batch_timestamp, []);
              batchGroups.get(si.batch_timestamp).push({
                item_id: si.item_id,
                item_name: inventoryMap[si.item_id]?.name || '',
                quantity: si.quantity || 1,
                price: inventoryMap[si.item_id]?.unit_price || 0,
                status: 'pending',
                note: '',
                slug: inventoryMap[si.item_id]?.slug || '',
                added_at_frontend: si.added_at,
                frontend_unique_key: si.unique_key,
                is_new_item: true,
                batch_timestamp: si.batch_timestamp,
                id: si.unique_key,
                image: inventoryMap[si.item_id]?.image
              });
            }
          }
        });

        const sortedTs = Array.from(batchGroups.keys()).sort((a, b) => a - b);
        let newAllItems = [...oldItems];
        sortedTs.forEach(ts => {
          const bitems = (batchGroups.get(ts) || []).map(it => ({ ...it }));
          if (bitems.length > 0) {
            bitems[0] = { ...bitems[0], _isBatchStart: true };
            newAllItems.push(...bitems);
          }
        });

        const processedOrder = { ...updatedOrderFromBackend, items: newAllItems, has_new_items: newAllItems.length > oldItems.length };
        setOrders(prev => prev.map(o => o.id === orderId ? processedOrder : o));
        if (selectedOrder?.id === orderId) setSelectedOrder(processedOrder);
      }
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

  let filteredOrders = selectedDate ? orders.filter(order => {
    const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
    return orderDate === selectedDate;
  }) : orders;

  switch (filterMode) {
    case 0:
      filteredOrders = [...filteredOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 1:
      filteredOrders = [...filteredOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 2:
      filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'new');
      break;
    case 3:
      filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'preparing');
      break;
    case 4:
      filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'served');
      break;
    default:
      break;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="container mx-auto px-4 py-2">
        {/* <div className="text-center mb-6 lg:mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif italic mb-3 lg:mb-4" style={{ color: 'var(--color-text-primary)' }}>Order Summary</h1>
          <p className="text-sm md:text-base" style={{ color: 'var(--color-text-secondary)' }}>Manage and track all active orders</p>
        </div> */}

        <div className="rounded-lg p-2 mb-2 flex justify-end">
          <div className="">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2" size={20} style={{ color: 'var(--color-text-secondary)' }} />
              <select value={filterMode} onChange={(e) => setFilterMode(Number(e.target.value))} className="w-full pl-10 pr-4 py-2 rounded-lg" >
                <option value={0}>Orders</option>
                <option value={1}>New</option>
                <option value={2}>New Orders</option>
                <option value={3}>Preparing</option>
                <option value={4}>Served</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.length === 0 ? (
            <div className="rounded-lg p-8 lg:p-12 text-center col-span-full" style={{ backgroundColor: 'var(--color-bg-primary)', border: `1px solid var(--color-border-default)`, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>No orders found</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const borderColor =
                order.status?.toLowerCase() === 'served' ? 'var(--color-status-served)' :
                  order.status?.toLowerCase() === 'pending' ? 'var(--color-status-pending)' :
                    order.status?.toLowerCase() === 'preparing' ? 'var(--color-status-preparing)' :
                      order.status?.toLowerCase() === 'new' ? 'var(--color-status-new)' :
                        'var(--color-border-default)';

              return (
                <div key={order.id} className="rounded-lg overflow-hidden self-start" style={{ backgroundColor: order.status?.toLowerCase() === 'served' ? 'var(--color-bg-primary)' : 'var(--color-bg-primary)', border: `2px solid ${borderColor}`, boxShadow: 'var(--shadow-card)' }}>
                  <div className="p-3 lg:p-6 border-b flex items-start justify-between" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-default)' }}>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Table: {tablesMap[order.table_id] || order.table || order.table_id}</h3>
                        <span className="px-2 py-1 rounded-full text-[12px] font-semibold" style={{ backgroundColor: 'var(--color-status-new)', color: 'var(--color-action-primary)' }}>{order.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid var(--color-border-default)` }}>Order Id: #{order.id}</span>
                        <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid var(--color-border-default)` }}>Time: {new Date(order.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button onClick={(e) => { e.stopPropagation(); toggleVisibleItems(order.id); }} title="View items" className="p-2 rounded" style={{ color: 'var(--color-text-secondary)' }}>
                        <MdOutlineKeyboardDoubleArrowDown size={20} />
                      </button>
                      <button onClick={() => { setSelectedOrder(order); setShowOrderDetailModal(true); }} className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-action-primary)', color: 'var(--color-text-white)' }}>Manage</button>
                      <button onClick={() => { setOrderToDelete(order.id); setShowDeleteModal(true); }} className="p-2 rounded-lg" style={{ color: 'var(--color-action-danger)' }}><Trash2 size={18} /></button>
                    </div>
                  </div>

                  {visibleOrderId === order.id && (
                    <div className="p-4 lg:p-6 border-t">
                      <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {order.items.map((it, idx) => (
                          <div key={idx}>
                            {it._isBatchStart && (
                              <div className="flex items-center my-3">
                                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-action-primary)' }}></div>
                                <span className="px-3 text-xs font-semibold" style={{ color: 'var(--color-action-primary)', backgroundColor: 'var(--color-primary-50)', borderRadius: '9999px' }}>New Items</span>
                                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-action-primary)' }}></div>
                              </div>
                            )}
                            <div className="flex justify-between" style={{ color: 'var(--color-text-primary)' }}>
                              <div>{it.item_name || it.name}</div>
                              <div className="text-right">x{it.quantity} &nbsp; ₹{(inventoryMap[it.item_id]?.unit_price || it.unit_price || it.price || 0).toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 lg:p-6 flex items-center justify-between" style={{ borderTop: `1px solid var(--color-border-default)` }}>
                    <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total items: {order.items.length}</div>
                    <div className="text-lg font-bold" style={{ color: 'var(--color-action-primary)' }}>
                      Rs.{order.items.reduce((s, it) => s + ((inventoryMap[it.item_id]?.unit_price || it.unit_price || it.price || 0) * (it.quantity || 1)), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showOrderDetailModal && selectedOrder && (
        <div
          className="fixed top-16 inset-0 z-40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setShowOrderDetailModal(false)}
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          <div
            className="rounded-xl w-full max-w-4xl my-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              boxShadow: 'var(--shadow-card)',
              border: `1px solid var(--color-border-default)`
            }}
          >
            <div
              className="flex px-3 sm:px-4 py-2.5 sm:py-3 border-b items-center justify-between flex-shrink-0"
              style={{
                background: 'linear-gradient(90deg,var(--color-primary-50),var(--color-bg-primary))',
                borderColor: 'var(--color-border-default)'
              }}
            >
              <div className="flex-1 min-w-0 mr-2">
                <h3
                  className="text-base sm:text-lg font-bold truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {tablesMap[selectedOrder.table_id] || selectedOrder.table || selectedOrder.table_id}
                </h3>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedOrder.items.length} items • {new Date(selectedOrder.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total</div>
                  <div className="text-sm sm:text-base font-bold" style={{ color: 'var(--color-action-primary)' }}>
                    ₹{selectedOrder.items.reduce((sum, item) => sum + ((inventoryMap[item.item_id]?.unit_price || item.unit_price || item.price || 0) * (item.quantity || 1)), 0).toFixed(2)}
                  </div>
                </div>

                <button
                  className="p-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
                  onClick={() => { setShowOrderDetailModal(false); setEditOrderId(null); }}
                  aria-label="Close order details"
                  style={{
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'transparent',
                    border: `1px solid transparent`
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="flex flex-col lg:flex-row h-full">
                {editOrderId === selectedOrder.id && (
                  <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-default)' }}>
                    <div className="p-3 sticky top-0 z-10" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderBottom: `1px solid var(--color-border-default)` }}>
                      <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>Available Items</h4>
                      <div className="relative">
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                        <input
                          type="text"
                          className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg transition-all"
                          placeholder="Search items..."
                          value={itemSearchQuery}
                          onChange={(e) => setItemSearchQuery(e.target.value)}
                          style={{
                            border: `1px solid var(--color-border-default)`,
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)'
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                      {(itemSearchResults.length > 0 ? itemSearchResults : allInventoryItems).map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all active:scale-95"
                          onClick={() => handleItemSelection(selectedOrder.id, item)}
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            border: `1px solid var(--color-border-default)`
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-action-primary)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.03)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-9 h-9 object-cover rounded-lg flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate" style={{ color: 'var(--color-text-primary)' }}>{item.name}</div>
                            <div className="text-xs font-bold" style={{ color: 'var(--color-action-primary)' }}>₹{item.unit_price}</div>
                          </div>
                          {item.line_item_id && item.line_item_id.length > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: 'var(--color-action-primary)', color: 'var(--color-text-white)' }}>
                              +{item.line_item_id.length}
                            </span>
                          )}
                        </div>
                      ))}

                      {itemSearchQuery && itemSearchResults.length === 0 && (
                        <div className="text-center py-6 text-xs" style={{ color: 'var(--color-text-secondary)' }}>No items found</div>
                      )}
                    </div>
                  </div>
                )}

                <div className={editOrderId === selectedOrder.id ? 'w-full lg:w-1/2' : 'w-full'}>
                  <div className="p-3 sticky top-0 z-10" style={{ backgroundColor: 'var(--color-bg-primary)', borderBottom: `1px solid var(--color-border-default)` }}>
                    <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Order Items</h4>
                  </div>

                  <div className="p-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    {selectedOrder.items.map((item, idx) => {
                      const prev = selectedOrder.items[idx - 1];
                      const showDivider = item._isBatchStart || (item.is_new_item && (!prev || (prev.batch_timestamp || null) !== (item.batch_timestamp || null)));

                      return (
                        <div key={item.id || idx}>
                          {showDivider && (
                            <div className="flex items-center my-2">
                              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-action-primary)' }}></div>
                              <span
                                className="px-2 py-0.5 text-xs font-bold rounded-full mx-2"
                                style={{ color: 'var(--color-action-primary)', backgroundColor: 'var(--color-primary-50)', border: `1px solid var(--color-border-default)` }}
                              >
                                New Items
                              </span>
                              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-action-primary)' }}></div>
                            </div>
                          )}

                          <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)', border: `1px solid var(--color-border-default)` }}>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>{item.item_name || item.item_id}</div>
                              <span
                                className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium mt-1"
                                style={{
                                  backgroundColor: item.status === 'pending' ? 'var(--color-status-pending)' : item.status === 'completed' ? 'var(--color-status-served)' : 'var(--color-bg-tertiary)',
                                  color: item.status === 'pending' ? 'var(--color-action-warning)' : item.status === 'completed' ? 'var(--color-action-success)' : 'var(--color-text-secondary)'
                                }}
                              >
                                {item.status}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {editOrderId === selectedOrder.id ? (
                                <>
                                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid var(--color-border-default)`, backgroundColor: 'var(--color-bg-primary)' }}>
                                    <button
                                      className="px-2 py-1 text-xs font-bold transition-colors"
                                      onClick={() => updateItemQuantity(selectedOrder.id, item.id || item.frontend_unique_key, Math.max(1, (item.quantity || 1) - 1))}
                                      style={{ color: 'var(--color-text-primary)' }}
                                    >
                                      −
                                    </button>
                                    <div className="px-2 py-1 font-bold text-xs text-center" style={{ borderLeft: `1px solid var(--color-border-default)`, borderRight: `1px solid var(--color-border-default)`, color: 'var(--color-text-primary)', minWidth: 28 }}>
                                      {item.quantity}
                                    </div>
                                    <button
                                      className="px-2 py-1 text-xs font-bold transition-colors"
                                      onClick={() => updateItemQuantity(selectedOrder.id, item.id || item.frontend_unique_key, (item.quantity || 1) + 1)}
                                      style={{ color: 'var(--color-text-primary)' }}
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    className="p-1.5 rounded-lg transition-colors"
                                    onClick={() => { setDeleteTarget({ orderId: selectedOrder.id, itemBackendId: item.id }); setShowDeleteModals(true); }}
                                    title="Delete item"
                                    style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-action-danger)' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>×{item.quantity}</span>
                                  <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    ₹{((inventoryMap[item.item_id]?.unit_price || item.unit_price || item.price || 0) * item.quantity).toFixed(2)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3" style={{ borderTop: `1px solid var(--color-border-default)`, backgroundColor: 'var(--color-bg-primary)' }}>
              {editOrderId === selectedOrder.id ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    className="flex-1 rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                    onClick={() => updateOrderItems(selectedOrder.id, selectedOrder.items)}
                    style={{ backgroundColor: 'var(--color-action-secondary)', color: 'var(--color-text-white)', padding: '0.6rem' }}
                  >
                    Save Changes
                  </button>
                  <button
                    className="flex-1 rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                    onClick={() => { setEditOrderId(null); setCurrentBatchTimestamp(null); setItemSearchQuery(''); }}
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', padding: '0.6rem', border: `1px solid var(--color-border-default)` }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    className="w-full rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                    onClick={() => { setEditOrderId(selectedOrder.id); }}
                    style={{ backgroundColor: 'var(--color-action-primary)', color: 'var(--color-text-white)', padding: '0.6rem' }}
                  >
                    <Edit2 size={14} />
                    Edit Order
                  </button>

                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                      onClick={() => { handleStatusChange(selectedOrder.id, 'served'); setShowOrderDetailModal(false); setEditOrderId(null); }}
                      style={{ backgroundColor: 'var(--color-action-success)', color: 'var(--color-text-white)', padding: '0.6rem' }}
                    >
                      Mark as Served
                    </button>

                    <button
                      className="flex-1 rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                      onClick={() => { setOrderToDelete(selectedOrder.id); setShowDeleteModal(true); setShowOrderDetailModal(false); }}
                      style={{ backgroundColor: 'var(--color-action-danger)', color: 'var(--color-text-white)', padding: '0.6rem' }}
                    >
                      Delete Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


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
        message="Are you sure you want to delete this order? This action cannot be undone."
      />

      <SimpleDeleteConfirm
        isOpen={showDeleteModals}
        onClose={() => setShowDeleteModals(false)}
        onConfirm={() => { cancelItem(deleteTarget.orderId, deleteTarget.itemBackendId); setShowDeleteModals(false); }}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
      />
    </div>
  );
};

export default OrderSummaryVisible;