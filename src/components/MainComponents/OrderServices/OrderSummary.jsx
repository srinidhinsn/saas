import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "react-modal";
import {
  X, Trash2, Filter, ShoppingBag,
  Users, Package, Truck, Eye, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";

Modal.setAppElement("#root");

// ─────────────────────────────────────────────────────────────────────────────
// Reason lists — mirrors TakeOrder exactly
// ─────────────────────────────────────────────────────────────────────────────

const ORDER_CANCEL_REASONS = [
  'Customer changed mind',
  'Customer left without paying',
  'Duplicate order',
  'Test / mistake order',
  'Payment issue',
  'Kitchen unable to fulfill',
  'Other',
];

const CANCELLATION_REASONS = [
  'Customer changed mind',
  'Wrong item ordered',
  'Duplicate entry',
  'Item out of stock',
  'Customer left',
  'Order placed by mistake',
  'Allergy concern',
  'Other',
];

const WASTAGE_REASONS = [
  'Plate returned by customer',
  'Quality issue / not fresh',
  'Preparation error',
  'Spilled / dropped',
  'Overcooked / undercooked',
  'Customer complaint',
  'Expired ingredient used',
  'Other',
];

// ─────────────────────────────────────────────────────────────────────────────
// CancelOrderConfirmModal — mirrors TakeOrder
// ─────────────────────────────────────────────────────────────────────────────

const CancelOrderConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (isOpen) { setReason(''); setCustomReason(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveReason = reason === 'Other' ? customReason : reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-600">Cancel Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            The order will be marked as <span className="font-semibold text-red-600">cancelled</span> and kept for records. Select a reason:
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
            {ORDER_CANCEL_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`px-2 py-2 rounded-lg text-xs font-medium border text-left transition
                  ${reason === r ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
              >{r}</button>
            ))}
          </div>
          {reason === 'Other' && (
            <input
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Describe the reason…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          )}
        </div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Go Back</button>
          <button
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            onClick={() => { onConfirm(effectiveReason); onClose(); }}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition
              ${reason && !(reason === 'Other' && !customReason.trim()) ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed'}`}
          >Cancel Order</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OldItemDeleteModal — mirrors TakeOrder exactly
// ─────────────────────────────────────────────────────────────────────────────

const OldItemDeleteModal = ({ isOpen, onClose, item, onRemoveOne, onRemoveAll }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [removeQty, setRemoveQty] = useState(1);

  const isServed = item?.status === 'served';
  const transactionType = isServed ? 'WASTAGE' : 'ITEM_CANCELLED';
  const reasonList = isServed ? WASTAGE_REASONS : CANCELLATION_REASONS;
  const typeLabel = isServed ? 'Wastage' : 'Cancellation';
  const typeColor = isServed ? 'text-red-600' : 'text-orange-600';
  const typeBg = isServed ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
  const buttonColor = isServed ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600';

  useEffect(() => {
    if (isOpen) { setReason(''); setCustomReason(''); setRemoveQty(1); }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const maxQty = item.quantity || 1;
  const isRemoveAll = removeQty >= maxQty;
  const effectiveReason = reason === 'Other' ? customReason : reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className={`text-lg font-bold ${typeColor}`}>Remove Item</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm text-gray-700 font-semibold">{item.item_name || item.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">Ordered quantity: <span className="font-semibold">{maxQty}</span></p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${typeBg} ${typeColor}`}>
            <span className="w-2 h-2 rounded-full bg-current inline-block" />
            {typeLabel} — {isServed ? 'Item was already served. Stock will be reversed.' : 'Item not yet served. No stock deduction.'}
          </div>
          {maxQty > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">How many to remove?</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setRemoveQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold">−</button>
                <span className="w-10 text-center text-lg font-bold text-gray-800">{removeQty}</span>
                <button onClick={() => setRemoveQty(q => Math.min(maxQty, q + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold">+</button>
                <span className="text-xs text-gray-400 ml-1">of {maxQty}</span>
                <button onClick={() => setRemoveQty(maxQty)} className="ml-auto text-xs text-red-500 underline font-semibold">Remove all</button>
              </div>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${(removeQty / maxQty) * 100}%` }} />
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Reason</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {reasonList.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border text-left transition
                    ${reason === r
                      ? isServed ? 'bg-red-600 text-white border-red-600' : 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                >{r}</button>
              ))}
            </div>
            {reason === 'Other' && (
              <input
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe the reason…"
                className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            )}
          </div>
        </div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            onClick={() => {
              if (isRemoveAll) onRemoveAll(transactionType, effectiveReason);
              else onRemoveOne(transactionType, effectiveReason, removeQty);
            }}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition
              ${reason && !(reason === 'Other' && !customReason.trim()) ? buttonColor : 'bg-gray-300 cursor-not-allowed'}`}
          >{isRemoveAll ? `Remove All (${maxQty})` : `Remove ${removeQty}`}</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LineItemsModal
// ─────────────────────────────────────────────────────────────────────────────

const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddMainOnly, onAddWithAddons }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
      <div className="rounded-lg w-full max-w-lg bg-bg-primary shadow-card border border-border-default">
        <div className="px-6 py-4 border-b border-border-default flex justify-between items-center">
          <h3 className="text-lg font-semibold text-text-primary">{mainItem?.name}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-gray-700 transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm mb-4 text-text-secondary">Add-ons for this item:</p>
          <div className="space-y-2">
            {lineItems.map((li, idx) => (
              <div key={li.id} className="flex justify-between items-center px-4 py-3 rounded-lg bg-bg-tertiary border border-border-default">
                <span className="text-sm font-medium text-text-primary">{idx + 1}. {li.name}</span>
                <span className="text-sm font-bold text-action-primary">₹{li.unit_price}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 rounded-b-lg flex gap-3 bg-bg-primary border-t border-border-default">
          <button onClick={onClose} className="bg-bg-tertiary text-text-primary border border-border-default px-4 py-2.5 rounded-lg font-medium text-sm">Cancel</button>
          <button onClick={onAddMainOnly} className="flex-1 bg-action-primary text-text-white px-4 py-2.5 rounded-lg font-medium text-sm">Main Only</button>
          <button onClick={onAddWithAddons} className="flex-1 bg-action-success text-text-white px-4 py-2.5 rounded-lg font-medium text-sm">With Add-ons</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OrderItemsViewModal
// ─────────────────────────────────────────────────────────────────────────────

const OrderItemsViewModal = ({ isOpen, onClose, order, inventoryMap, onRequestDeleteItem }) => {
  if (!isOpen || !order) return null;

  const getItemStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'preparing': return 'bg-blue-100 text-blue-700';
      case 'ready': return 'bg-green-100 text-green-700';
      case 'served': return 'bg-gray-100 text-gray-600';
      default: return 'bg-bg-tertiary text-text-secondary';
    }
  };

  const grandTotal = order.items.reduce((sum, item) => {
    const price = inventoryMap[item.item_id]?.unit_price ?? item.unit_price ?? item.price ?? 0;
    return sum + price * (item.quantity || 1);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg" onClick={onClose}>
      <div className="rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col bg-bg-primary shadow-card border border-border-default" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border-default bg-action-primary rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-white">Order #{order.id}</h2>
            <p className="text-sm text-text-white/70 mt-0.5">
              {order._fixedOrderMode === 'takeaway' ? order.customer_name || 'Takeaway' : order._tableName || order.table || order.table_id}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-text-white/60 uppercase font-semibold tracking-wide">Grand Total</p>
              <p className="text-2xl font-bold text-text-white">₹{grandTotal.toFixed(2)}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-text-white transition-colors"><X size={20} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-tertiary border-b border-border-default z-10">
              <tr>
                <th className="text-left px-5 py-3 text-text-secondary font-semibold text-xs uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-text-secondary font-semibold text-xs uppercase tracking-wider">Item</th>
                <th className="text-center px-4 py-3 text-text-secondary font-semibold text-xs uppercase tracking-wider">Qty</th>
                <th className="text-right px-4 py-3 text-text-secondary font-semibold text-xs uppercase tracking-wider">Unit Price</th>
                <th className="text-right px-4 py-3 text-text-secondary font-semibold text-xs uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-3 text-text-secondary font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-text-secondary font-semibold text-xs uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {order.items.map((item, idx) => {
                const unitPrice = inventoryMap[item.item_id]?.unit_price ?? item.unit_price ?? item.price ?? 0;
                const lineTotal = unitPrice * (item.quantity || 1);
                const isServedItem = item.status?.toLowerCase() === 'served';
                return (
                  <tr key={item.id || idx} className="hover:bg-bg-tertiary/50 transition-colors">
                    <td className="px-5 py-3 text-text-secondary text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{item.item_name || 'Unnamed Item'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-text-primary">{item.quantity || 1}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">₹{unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-text-primary">₹{lineTotal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getItemStatusStyle(item.status)}`}>{item.status || 'pending'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onRequestDeleteItem(item)}
                        className={`p-1.5 rounded-lg transition-colors
                          ${isServedItem
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white'
                            : 'bg-action-danger/10 text-action-danger hover:bg-action-danger hover:text-text-white'}`}
                        title={isServedItem ? 'Delete served item (records wastage)' : 'Delete item'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border-default bg-bg-tertiary rounded-b-xl flex justify-between items-center">
          <span className="text-sm font-medium text-text-secondary">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-secondary">Grand Total:</span>
            <span className="text-xl font-bold text-action-primary">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-orange-100 text-orange-700 border-orange-200',
    preparing: 'bg-blue-100 text-blue-700 border-blue-200',
    ready: 'bg-green-100 text-green-700 border-green-200',
    served: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const s = status?.toLowerCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[s] || 'bg-bg-tertiary text-text-secondary border-border-default'}`}>
      {status || '—'}
    </span>
  );
};

const getInitialOrderMode = (order) => {
  if (Number(order.table_id) === 500) return 'takeaway';
  return 'dinein';
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const OrderSummaryVisible = ({ clientId, token }) => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryMap, setInventoryMap] = useState({});
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [tables, setTables] = useState([]);

  const todayDate = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [filterMode, setFilterMode] = useState(0);
  const [selectedOrderMode, setSelectedOrderMode] = useState('all');

  // View modal
  const [viewOrder, setViewOrder] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // REQ: Cancel order modal (matches TakeOrder — reason required)
  const [cancelOrderModal, setCancelOrderModal] = useState({ isOpen: false, orderId: null });

  // REQ: Item delete modal (matches TakeOrder — reason + qty)
  const [itemDeleteModal, setItemDeleteModal] = useState({ isOpen: false, item: null, orderId: null });

  // Order detail / edit modal state (preserved)
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

  // ── localStorage helpers (unchanged) ──────────────────────────────────────

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
          const batch_timestamp = raw.batch_timestamp ? Number(raw.batch_timestamp) : raw.batchTs ? Number(raw.batchTs) : null;
          const item_id = raw.item_id || raw.inventory_id || raw.inventoryId || raw.itemId || null;
          const added_at = raw.added_at || raw.added_at_frontend || raw.addedAt || raw.addedAtFrontend || null;
          const quantity = raw.quantity || 1;
          arr.push({ ...raw, unique_key, batch_timestamp, item_id, added_at, quantity });
        } catch (e) { console.error('parse localstorage new item', key, e); }
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
    return Array.from(batchMap.entries()).sort((a, b) => a[0] - b[0]).map(([timestamp, item_ids]) => ({ timestamp, item_ids }));
  };

  const clearNewItemsStorage = (orderId) => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(`order_${orderId}_new_item_`) || key.startsWith(`order_${orderId}_batch_`))) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  };

  const slugify = str => (str || '').toString().toUpperCase().replace(/[\s]+/g, '-').replace(/[^A-Z0-9-_]/g, '');

  const ensureBatchForOrder = (orderId, tableName) => {
    let bt = currentBatchTimestamp;
    if (!bt) { bt = Date.now(); setCurrentBatchTimestamp(bt); }
    const storageKey = `order_${orderId}_batch_${bt}`;
    let meta = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { meta = JSON.parse(raw); }
      else {
        let seq = 1;
        const seqKey = `order_${orderId}_batch_seq`;
        const prevSeqRaw = localStorage.getItem(seqKey);
        if (prevSeqRaw) { const prev = parseInt(prevSeqRaw, 10); if (!isNaN(prev)) seq = prev + 1; }
        const now = new Date(bt);
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        meta = { timestamp: bt, started_at: Date.now(), seq, table_slug: slugify(tableName || ''), time_label: `${hh}-${mm}`, added_count: 0 };
        localStorage.setItem(storageKey, JSON.stringify(meta));
        localStorage.setItem(seqKey, String(seq));
      }
    } catch (e) { console.error('ensureBatchForOrder error', e); }
    return { storageKey, meta };
  };

  const generateFrontendKeyFromBatch = (orderId, batchMeta) => {
    return `${batchMeta.table_slug || 'TBL'}_${batchMeta.time_label || '00-00'}_${batchMeta.added_count || 0}_${orderId}_${batchMeta.seq || 1}`;
  };

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchTables = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } });
      setTables(res.data?.data || []);
      const map = {};
      (res.data?.data || []).forEach(t => (map[t.id] = t.name));
      setTablesMap(map);
    } catch (e) { console.error('fetchTables', e); }
  };

  useEffect(() => { if (clientId) fetchTables(); }, [clientId]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setAllInventoryItems(res.data.data || []);
        const map = {};
        (res.data.data || []).forEach(i => (map[i.id] = i));
        setInventoryMap(map);
      }).catch(() => { });
  }, [clientId, token]);

  useEffect(() => {
    if (!showOrderDetailModal || !selectedOrder || editOrderId !== selectedOrder?.id || itemSearchQuery.trim() === '') { setItemSearchResults([]); return; }
    let filtered = allInventoryItems;
    if (selectedCategory) filtered = filtered.filter(item => { const cats = item.categories || []; return cats.some(cat => cat === selectedCategory || cat.id === selectedCategory); });
    if (itemSearchQuery.trim()) filtered = filtered.filter(it => (it.name || '').toLowerCase().includes(itemSearchQuery.toLowerCase()));
    setItemSearchResults(filtered);
  }, [itemSearchQuery, allInventoryItems, showOrderDetailModal, selectedOrder, editOrderId, selectedCategory]);

  // ── processOrder (unchanged) ───────────────────────────────────────────────

  const processOrder = (order) => {
    if (order.status === 'served') {
      clearNewItemsStorage(order.id);
      return { ...order, _fixedOrderMode: order._fixedOrderMode ?? getInitialOrderMode(order) };
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
    const backendUniqueKeys = new Set((order.items || []).filter(i => i.frontend_unique_key).map(i => String(i.frontend_unique_key)));
    const oldItems = [];
    const batchItemsMap = new Map();
    const pushToBatch = (batchTs, itemObj) => {
      if (!batchTs) return;
      const ts = Number(batchTs);
      if (!batchItemsMap.has(ts)) batchItemsMap.set(ts, []);
      const existingIndex = batchItemsMap.get(ts).findIndex(x => String(x.item_id) === String(itemObj.item_id) || x.frontend_unique_key === itemObj.frontend_unique_key);
      if (existingIndex >= 0) {
        const ex = batchItemsMap.get(ts)[existingIndex];
        ex.quantity = (ex.quantity || 1) + (itemObj.quantity || 1);
        ex.line_total = (ex.unit_price || ex.price || 0) * ex.quantity;
        if (!ex.frontend_unique_key && itemObj.frontend_unique_key) ex.frontend_unique_key = itemObj.frontend_unique_key;
      } else { batchItemsMap.get(ts).push(itemObj); }
    };
    (order.items || []).forEach(item => {
      const backendKey = item.frontend_unique_key ? String(item.frontend_unique_key) : null;
      const itemId = item.item_id || item.inventory_id || item.id || null;
      let matchedBatch = null;
      if (backendKey && storageByKey.has(backendKey)) { const si = storageByKey.get(backendKey); if (si && si.batch_timestamp) matchedBatch = Number(si.batch_timestamp); }
      if (!matchedBatch && backendKey) { const parts = backendKey.split('_'); if (parts.length >= 2) { const maybeNum = parseFloat(parts[parts.length - 1]); if (!isNaN(maybeNum)) { const possibleBatch = Math.floor(maybeNum / 1000) * 1000; if (storageByBatchAndItem.has(`${possibleBatch}_${String(itemId)}`)) matchedBatch = possibleBatch; } } }
      if (!matchedBatch) { for (const [k] of storageByBatchAndItem.entries()) { const [batchStr, storedItemId] = k.split('_'); if (String(storedItemId) === String(itemId)) { matchedBatch = Number(batchStr); break; } } }
      if (matchedBatch) pushToBatch(matchedBatch, { ...item, is_new_item: true, batch_timestamp: matchedBatch });
      else oldItems.push(item);
    });
    rawNewItems.forEach(si => {
      if (!si || !si.unique_key) return;
      if (backendUniqueKeys.has(String(si.unique_key))) return;
      if (!si.batch_timestamp || !si.item_id) return;
      const itemInfo = inventoryMap[si.item_id];
      if (!itemInfo) return;
      pushToBatch(si.batch_timestamp, { item_id: si.item_id, item_name: itemInfo.name, quantity: si.quantity || 1, price: itemInfo.unit_price, unit_price: itemInfo.unit_price, status: 'pending', note: '', slug: itemInfo.slug || generateSlug(itemInfo.name), added_at_frontend: si.added_at, frontend_unique_key: si.unique_key, is_new_item: true, batch_timestamp: si.batch_timestamp, id: si.unique_key, image: itemInfo.image });
    });
    let allItems = [...oldItems];
    const sortedTimestamps = Array.from(batchItemsMap.keys()).sort((a, b) => a - b);
    sortedTimestamps.forEach(ts => {
      const batchArr = (batchItemsMap.get(ts) || []).map(it => ({ ...it }));
      if (batchArr.length > 0) { batchArr[0] = { ...batchArr[0], _isBatchStart: true }; allItems.push(...batchArr); }
    });
    const seen = new Set(); const deduped = [];
    for (const it of allItems) {
      const key = it.frontend_unique_key ? String(it.frontend_unique_key) : `${it.item_id}_${it.batch_timestamp || 0}_${it.unit_price || it.price || 0}`;
      if (seen.has(key)) { const existing = deduped.find(x => (x.frontend_unique_key ? String(x.frontend_unique_key) : `${x.item_id}_${x.batch_timestamp || 0}_${x.unit_price || x.price || 0}`) === key); if (existing) { existing.quantity = (existing.quantity || 1) + (it.quantity || 1); existing.line_total = (existing.unit_price || existing.price || 0) * existing.quantity; } continue; }
      seen.add(key); deduped.push(it);
    }
    return { ...order, _fixedOrderMode: order._fixedOrderMode ?? getInitialOrderMode(order), items: deduped, has_new_items: batchItemsMap.size > 0 };
  };

  // ── Fetch orders ───────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token || !clientId) { setLoading(false); return; }
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
        const allOrders = res.data?.data || [];
        setOrders(allOrders.map(processOrder));
      } catch (err) { toast.error('Failed to fetch orders'); console.error(err); }
      finally { setLoading(false); }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [clientId, token, inventoryMap]);

  // ── REQ: Cancel entire order — now requires reason, matches TakeOrder ──────

  const handleCancelOrder = async (orderId, reason) => {
    const order = orders.find(o => o.id === orderId);
    const tableObj = tables.find(t => t.id === order?.table_id);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        {
          params: { dinein_order_id: orderId, client_id: clientId, reason },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (tableObj) {
        await axios.post(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          { id: order.table_id, client_id: clientId, name: tableObj.name, table_type: tableObj.table_type, status: 'vacant', location_zone: tableObj.location_zone },
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

  const handleGenerateBill = (order) => {
    navigate(`/saas/${clientId}/billing`, { state: { orderId: order.id, tableId: order.table_id, clientId } });
  };

  // ── Add item / batch helpers (unchanged) ──────────────────────────────────

  const handleItemSelection = (orderId, selectedItem) => {
    if (selectedItem.line_item_id && Array.isArray(selectedItem.line_item_id) && selectedItem.line_item_id.length > 0) {
      const lineItems = selectedItem.line_item_id.map(id => allInventoryItems.find(i => i.id === id)).filter(Boolean);
      setSelectedMainItem(selectedItem); setLineItemsDetails(lineItems); setPendingOrderId(orderId); setLineItemsModalOpen(true);
    } else { addItemToOrder(orderId, selectedItem); }
    setItemSearchQuery('');
  };

  const handleAddMainItemWithLineItems = () => {
    if (!selectedMainItem || !pendingOrderId) return;
    let batchTimestamp = currentBatchTimestamp;
    if (!batchTimestamp) { batchTimestamp = Date.now(); setCurrentBatchTimestamp(batchTimestamp); localStorage.setItem(`order_${pendingOrderId}_batch_${batchTimestamp}`, JSON.stringify({ timestamp: batchTimestamp, started_at: Date.now() })); }
    addItemToOrderWithBatch(pendingOrderId, selectedMainItem, batchTimestamp, true);
    lineItemsDetails.forEach(li => addItemToOrderWithBatch(pendingOrderId, li, batchTimestamp, false));
    setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]); setPendingOrderId(null);
  };

  const handleAddMainItemOnly = () => {
    if (!selectedMainItem || !pendingOrderId) return;
    addItemToOrder(pendingOrderId, selectedMainItem);
    setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]); setPendingOrderId(null);
  };

  const updateItemQuantity = (orderId, itemIdentifier, newQty) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const updatedItems = o.items.map(item => { const itemKey = item.id || item.frontend_unique_key; if (itemKey === itemIdentifier) return { ...item, quantity: newQty > 0 ? newQty : 1 }; return item; });
      const newTotal = updatedItems.reduce((s, it) => s + ((inventoryMap[it.item_id]?.unit_price || it.unit_price || it.price || 0) * (it.quantity || 1)), 0);
      return { ...o, items: updatedItems, total_price: newTotal };
    }));
    if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, items: prev.items.map(item => { const itemKey = item.id || item.frontend_unique_key; if (itemKey === itemIdentifier) return { ...item, quantity: newQty > 0 ? newQty : 1 }; return item; }) }));
  };

  const addItemToOrderWithBatch = (orderId, selectedItem, forcedBatchTimestamp, isMainItem = false) => {
    let batchKey = `order_${orderId}_batch_${forcedBatchTimestamp}`;
    let batchMeta = null;
    try { const raw = localStorage.getItem(batchKey); if (raw) batchMeta = JSON.parse(raw); } catch { /* ignore */ }
    if (!batchMeta) { const tableName = tablesMap?.[selectedOrder?.table_id] || (selectedOrder?.table || ''); const ensured = ensureBatchForOrder(orderId, tableName); batchKey = ensured.storageKey; batchMeta = ensured.meta; }
    if (!batchMeta) return;
    try { batchMeta.added_count = (batchMeta.added_count || 0) + 1; localStorage.setItem(batchKey, JSON.stringify(batchMeta)); } catch { /* ignore */ }
    const uniqueKey = generateFrontendKeyFromBatch(orderId, batchMeta);
    const existingItemInBatch = selectedOrder?.items.find(item => item.is_new_item && String(item.item_id) === String(selectedItem.id) && Number(item.batch_timestamp) === Number(batchMeta.timestamp));
    if (existingItemInBatch) {
      const idOrKey = existingItemInBatch.id || existingItemInBatch.frontend_unique_key;
      updateItemQuantity(orderId, idOrKey, (existingItemInBatch.quantity || 1) + 1);
      try { const sk = `order_${orderId}_new_item_${existingItemInBatch.frontend_unique_key || existingItemInBatch.id || uniqueKey}`; const raw = JSON.parse(localStorage.getItem(sk) || '{}'); raw.quantity = (raw.quantity || existingItemInBatch.quantity || 1) + 1; localStorage.setItem(sk, JSON.stringify(raw)); } catch { /* best-effort */ }
      return;
    }
    const newItem = { item_id: selectedItem.id, item_name: selectedItem.name, quantity: 1, price: selectedItem.unit_price, status: 'pending', note: '', slug: selectedItem.slug || generateSlug(selectedItem.name), added_at_frontend: Date.now() + Math.random(), frontend_unique_key: uniqueKey, is_new_item: true, unit_price: selectedItem.unit_price || 0, line_total: (selectedItem.unit_price || 0) * 1, batch_timestamp: batchMeta.timestamp, id: uniqueKey, image: selectedItem.image, is_line_item: !isMainItem };
    try { localStorage.setItem(`order_${orderId}_new_item_${uniqueKey}`, JSON.stringify({ item_id: newItem.item_id, unique_key: uniqueKey, added_at: newItem.added_at_frontend, batch_timestamp: newItem.batch_timestamp, quantity: newItem.quantity, is_line_item: newItem.is_line_item })); } catch { /* ignore */ }
    const rebuildOrder = (o) => {
      if (o.id !== orderId) return o;
      const batches = getBatchesFromStorage(orderId);
      const oldItems = o.items.filter(i => !i.is_new_item);
      const newItemsByBatch = new Map();
      batches.forEach(b => newItemsByBatch.set(b.timestamp, []));
      o.items.forEach(item => { if (item.is_new_item && item.batch_timestamp) { if (!newItemsByBatch.has(item.batch_timestamp)) newItemsByBatch.set(item.batch_timestamp, []); newItemsByBatch.get(item.batch_timestamp).push(item); } });
      if (!newItemsByBatch.has(batchMeta.timestamp)) newItemsByBatch.set(batchMeta.timestamp, []);
      newItemsByBatch.get(batchMeta.timestamp).push(newItem);
      const combined = [...oldItems];
      Array.from(newItemsByBatch.keys()).sort((a, b) => a - b).forEach(ts => { const batch = (newItemsByBatch.get(ts) || []).map(it => ({ ...it })); if (batch.length > 0) { batch[0] = { ...batch[0], _isBatchStart: true }; combined.push(...batch); } });
      const seen = new Set(); const deduped = [];
      for (const it of combined) {
        const k = it.frontend_unique_key ? String(it.frontend_unique_key) : `${it.item_id}_${it.batch_timestamp || ''}_${it.unit_price || it.price || 0}`;
        if (seen.has(k)) { const ex = deduped.find(x => (x.frontend_unique_key ? String(x.frontend_unique_key) : `${x.item_id}_${x.batch_timestamp || ''}_${x.unit_price || x.price || 0}`) === k); if (ex) { ex.quantity = (ex.quantity || 1) + (it.quantity || 1); ex.line_total = (ex.unit_price || ex.price || 0) * ex.quantity; } continue; }
        seen.add(k); deduped.push(it);
      }
      return { ...o, items: deduped, has_new_items: true };
    };
    setOrders(prev => prev.map(rebuildOrder));
    if (selectedOrder?.id === orderId) setSelectedOrder(rebuildOrder);
  };

  const addItemToOrder = (orderId, selectedItem) => {
    const tableName = tablesMap?.[selectedOrder?.table_id] || (selectedOrder?.table || '');
    const { storageKey, meta } = ensureBatchForOrder(orderId, tableName);
    if (!meta) return;
    try { meta.added_count = (meta.added_count || 0) + 1; localStorage.setItem(storageKey, JSON.stringify(meta)); } catch { /* ignore */ }
    addItemToOrderWithBatch(orderId, selectedItem, meta.timestamp, true);
  };

  const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
    const newItemsToSave = updatedItemsWithStatuses.filter(item => item.is_new_item);
    if (newItemsToSave.length > 0 && currentBatchTimestamp) {
      localStorage.setItem(`order_${orderId}_batch_${currentBatchTimestamp}`, JSON.stringify({ timestamp: currentBatchTimestamp, started_at: Date.now() }));
      newItemsToSave.forEach(item => { const sk = `order_${orderId}_new_item_${item.frontend_unique_key}`; localStorage.setItem(sk, JSON.stringify({ item_id: item.item_id, unique_key: item.frontend_unique_key, added_at: item.added_at_frontend, batch_timestamp: item.batch_timestamp || currentBatchTimestamp, quantity: item.quantity || 1, is_line_item: item.is_line_item || false })); });
    }
    const cleanedItems = updatedItemsWithStatuses.filter(item => typeof item.id === 'number' || item.is_new_item).map(item => { const inv = inventoryMap[item.item_id || item.inventory_id]; const unitPrice = item.unit_price ?? item.price ?? inv?.unit_price ?? 0; return { item_id: item.item_id || item.inventory_id, item_name: item.item_name || item.name, quantity: item.quantity || 1, status: item.status || 'pending', note: item.note || '', slug: item.slug || '', price: unitPrice, unit_price: unitPrice, line_total: unitPrice * (item.quantity || 1), client_id: clientId, order_id: orderId, frontend_unique_key: item.frontend_unique_key || null }; });
    const totalPrice = cleanedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    try {
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderId}`, cleanedItems, { headers: { Authorization: `Bearer ${token}` } });
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`, { id: orderId, total_price: totalPrice }, { headers: { Authorization: `Bearer ${token}` } });
      setCurrentBatchTimestamp(null); setEditOrderId(null); setItemSearchQuery('');
      toast.success('Items saved successfully!');
      const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = res.data?.data || [];
      const fresh = allOrders.find(o => o.id === orderId);
      if (!fresh) return;
      const processed = processOrder(fresh);
      setOrders(prev => prev.map(o => (o.id === orderId ? processed : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder(processed);
      clearNewItemsStorage(orderId); setCurrentBatchTimestamp(null);
    } catch (err) { console.error('Save error', err); toast.error('Failed to update items or total.'); }
  };

  // ── Filtering (unchanged) ──────────────────────────────────────────────────

  let filteredOrders = selectedDate ? orders.filter(order => { const orderDate = new Date(order.created_at).toLocaleDateString('en-CA'); return orderDate === selectedDate; }) : orders;
  if (selectedOrderMode !== 'all') filteredOrders = filteredOrders.filter(o => o._fixedOrderMode === selectedOrderMode);
  switch (filterMode) {
    case 0: filteredOrders = [...filteredOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
    case 1: filteredOrders = [...filteredOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
    case 2: filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'pending'); break;
    case 3: filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'preparing'); break;
    case 4: filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'ready'); break;
    case 5: filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === 'served'); break;
    default: break;
  }

  const getOrderTotal = (order) => order.items.reduce((sum, item) => { const price = inventoryMap[item.item_id]?.unit_price ?? item.unit_price ?? item.price ?? 0; return sum + price * (item.quantity || 1); }, 0);
  const getOrderModeIcon = (mode) => { if (mode === 'takeaway') return <Package size={12} />; if (mode === 'delivery') return <Truck size={12} />; return <Users size={12} />; };
  const getOrderModeLabel = (mode) => { if (mode === 'takeaway') return 'Takeaway'; if (mode === 'delivery') return 'Delivery'; return 'Dine In'; };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto px-4 py-3">
        <div className="bg-action-primary rounded-2xl shadow-xl px-6 py-5 mb-6">
          <div className="flex flex-wrap gap-8 items-center rounded-xl p-3">
            <div className="flex gap-4">
              {[{ value: 'all', label: 'All', icon: <Filter size={20} /> }, { value: 'dinein', label: 'Dine In', icon: <Users size={20} /> }, { value: 'takeaway', label: 'Takeaway', icon: <Package size={20} /> }, { value: 'delivery', label: 'Delivery', icon: <Truck size={20} /> }].map(({ value, label, icon }) => (
                <button key={value} onClick={() => setSelectedOrderMode(value)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-lg transition-all ${selectedOrderMode === value ? 'bg-action-primary text-text-white shadow-sm' : 'bg-bg-primary text-text-secondary hover:text-text-primary border border-border-default'}`}>{icon}<span>{label}</span></button>
              ))}
            </div>
            <div className="w-px h-6 bg-border-default mx-1 hidden sm:block" />
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={15} />
              <select value={filterMode} onChange={e => setFilterMode(Number(e.target.value))} className="pl-9 pr-4 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm">
                <option value={0}>All Status</option><option value={2}>Pending</option><option value={3}>Preparing</option><option value={4}>Ready</option><option value={5}>Served</option>
              </select>
            </div>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm" />
            <div className="ml-auto text-sm font-semibold text-text-secondary">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-action-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl p-16 text-center bg-bg-primary border border-border-default shadow-card"><ShoppingBag size={40} className="mx-auto mb-3 text-text-secondary opacity-40" /><p className="text-text-secondary text-base font-medium">No orders found</p></div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border-default shadow-card bg-bg-primary">
            <table className="w-full">
              <thead className="bg-bg-tertiary border-b border-border-default">
                <tr>
                  {['Order #', 'Table / Customer', 'Mode', 'Items', 'Total Price', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredOrders.map((order, rowIdx) => {
                  const status = order.status?.toLowerCase();
                  const orderTotal = getOrderTotal(order);
                  return (
                    <tr key={order.id} className={`hover:bg-bg-tertiary transition-colors ${rowIdx % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-tertiary'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-action-primary">#{order.id}</span>
                          {order.has_new_items && <span className="text-[9px] font-bold text-text-white bg-action-primary px-1.5 py-0.5 rounded-full uppercase">New</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{order._fixedOrderMode === 'takeaway' ? order.customer_name || 'Takeaway' : tablesMap[order.table_id] || order.table || String(order.table_id)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-tertiary text-text-secondary border border-border-default">{getOrderModeIcon(order._fixedOrderMode)}{getOrderModeLabel(order._fixedOrderMode)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.items.length}</td>
                      <td className="px-6 py-4 whitespace-nowrap">₹{orderTotal.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={order.status} /></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                          <button
                            onClick={() => { setViewOrder({ ...order, _tableName: tablesMap[order.table_id] || order.table || String(order.table_id) }); setShowViewModal(true); }}
                            className="p-1.5 rounded-lg bg-action-primary/10 text-action-primary hover:bg-action-primary hover:text-text-white transition-colors" title="View items"
                          ><Eye size={15} /></button>
                          {status === 'ready' && (
                            <button onClick={() => handleStatusChange(order.id, 'served')} className="px-2.5 py-1 rounded-lg bg-action-success text-text-white text-xs font-semibold hover:opacity-90 transition-colors whitespace-nowrap">Mark As Served</button>
                          )}
                          {status === 'served' && (
                            <button onClick={() => handleGenerateBill(order)} className="px-2.5 py-1 rounded-lg bg-green-700 text-text-white text-xs font-semibold hover:bg-green-800 transition-colors whitespace-nowrap">Generate Bill</button>
                          )}
                          {/* REQ: trash now opens CancelOrderConfirmModal */}
                          <button
                            onClick={() => setCancelOrderModal({ isOpen: true, orderId: order.id })}
                            className="p-1.5 rounded-lg bg-action-danger/10 text-action-danger hover:bg-action-danger hover:text-text-white transition-colors" title="Cancel order"
                          ><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order detail / edit modal (unchanged structure, delete button now uses new handler) */}
      {showOrderDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg backdrop-blur-sm" onClick={() => { setShowOrderDetailModal(false); setEditOrderId(null); setActiveTab('items'); }}>
          <div className="rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col bg-bg-primary shadow-card border border-border-default" onClick={e => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b border-border-default bg-bg-tertiary rounded-t-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-text-primary">{tablesMap[selectedOrder.table_id] || selectedOrder.table || selectedOrder.table_id}</h3>
                  <span className="text-2xl font-extrabold text-text-primary">{selectedOrder.items.length} items</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right bg-action-primary/10 px-4 py-2 rounded-xl border border-action-primary/20">
                    <div className="text-xs font-semibold text-text-secondary uppercase">Total</div>
                    <div className="text-xl font-bold text-action-primary">₹{selectedOrder.items.reduce((sum, item) => sum + ((inventoryMap[item.item_id]?.unit_price || item.unit_price || item.price || 0) * (item.quantity || 1)), 0).toFixed(2)}</div>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-bg-tertiary" onClick={() => { setShowOrderDetailModal(false); setEditOrderId(null); setActiveTab('items'); }}><X size={20} /></button>
                </div>
              </div>
            </div>
            <div className="lg:hidden border-b border-border-default bg-bg-tertiary">
              <div className="flex">
                <button className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'items' ? 'text-action-primary border-b-2 border-action-primary bg-bg-primary' : 'text-text-secondary'}`} onClick={() => setActiveTab('items')}>Items</button>
                <button className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'available' ? 'text-action-primary border-b-2 border-action-primary bg-bg-primary' : 'text-text-secondary'}`} onClick={() => setActiveTab('available')}>Add Items</button>
              </div>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className={`w-full lg:w-2/5 border-r border-border-default bg-bg-tertiary flex flex-col ${activeTab === 'available' ? 'block' : 'hidden lg:flex'}`}>
                <div className="p-4 border-b border-border-default bg-bg-primary shrink-0">
                  <input type="text" className="w-full px-4 py-2 rounded-xl border border-border-default bg-bg-primary text-text-primary" placeholder="Search items..." value={itemSearchQuery} onChange={e => setItemSearchQuery(e.target.value)} />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(itemSearchResults.length > 0 ? itemSearchResults : allInventoryItems).map(item => (
                    <div key={item.id} className="p-3 rounded-xl bg-bg-primary border border-border-default cursor-pointer hover:border-action-primary transition-colors" onClick={() => { handleItemSelection(selectedOrder.id, item); setActiveTab('items'); }}>
                      <div className="font-semibold text-text-primary">{item.name}</div>
                      <div className="text-sm font-bold text-action-primary">₹{item.unit_price}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`w-full lg:w-3/5 bg-bg-primary ${activeTab === 'items' ? 'block' : 'hidden lg:block'}`}>
                <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {selectedOrder.items.map((item, idx) => {
                    const prev = selectedOrder.items[idx - 1];
                    const showDivider = item._isBatchStart || (item.is_new_item && (!prev || (prev.batch_timestamp || null) !== (item.batch_timestamp || null)));
                    const isServedItem = item.status?.toLowerCase() === 'served';
                    return (
                      <div key={item.id || idx}>
                        {showDivider && (
                          <div className="flex items-center my-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-action-primary to-transparent" />
                            <span className="px-3 py-1.5 text-action-primary bg-action-primary/10 text-xs font-bold rounded-full mx-3 border border-action-primary/30">New Items</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-action-primary to-transparent" />
                          </div>
                        )}
                        <div className={`flex items-center justify-between p-3 rounded-xl border ${isServedItem ? 'bg-gray-50 border-gray-200' : 'bg-bg-tertiary border-border-default'}`}>
                          <div>
                            <div className="font-semibold text-sm text-text-primary">{item.item_name || item.item_id}</div>
                            {isServedItem && <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">served</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isServedItem && (
                              <>
                                <button onClick={() => updateItemQuantity(selectedOrder.id, item.id || item.frontend_unique_key, Math.max(1, item.quantity - 1))} className="px-3 py-1 rounded-lg border border-border-default bg-bg-primary text-text-primary">−</button>
                                <span className="px-3 font-bold text-text-primary">{item.quantity}</span>
                                <button onClick={() => updateItemQuantity(selectedOrder.id, item.id || item.frontend_unique_key, item.quantity + 1)} className="px-3 py-1 rounded-lg border border-border-default bg-bg-primary text-text-primary">+</button>
                              </>
                            )}
                            {/* REQ: now opens OldItemDeleteModal with reason + qty */}
                            <button
                              className={`p-2 rounded-lg transition-colors ${isServedItem ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white' : 'bg-action-danger/10 text-action-danger hover:bg-action-danger hover:text-text-white'}`}
                              title={isServedItem ? 'Delete served item (records wastage)' : 'Delete item'}
                              onClick={() => handleRequestDeleteItem(item, selectedOrder.id)}
                            ><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border-default bg-bg-tertiary flex gap-3 rounded-b-xl">
              <button className="flex-1 bg-action-primary text-text-white py-3 rounded-xl font-semibold" onClick={() => { updateOrderItems(selectedOrder.id, selectedOrder.items); setShowOrderDetailModal(false); setEditOrderId(null); }}>Save Changes</button>
              <button className="flex-1 bg-bg-primary border border-border-default py-3 rounded-xl font-semibold text-text-primary" onClick={() => { setShowOrderDetailModal(false); setEditOrderId(null); setActiveTab('items'); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <OrderItemsViewModal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewOrder(null); }}
        order={viewOrder}
        inventoryMap={inventoryMap}
        onRequestDeleteItem={(item) => handleRequestDeleteItem(item, viewOrder?.id)}
      />

      <LineItemsModal isOpen={lineItemsModalOpen} onClose={() => setLineItemsModalOpen(false)} mainItem={selectedMainItem} lineItems={lineItemsDetails} onAddMainOnly={handleAddMainItemOnly} onAddWithAddons={handleAddMainItemWithLineItems} />

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