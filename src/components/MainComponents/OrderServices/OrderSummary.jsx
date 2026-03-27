import React, { useEffect, useState } from "react";
import axios from 'axios';
import { toast } from "react-toastify";
import Modal from "react-modal";
import {
  X, Trash2, Filter, ShoppingBag, Clock,
  Users, Package, Truck, Eye, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";

Modal.setAppElement("#root");

// ─────────────────────────────────────────────────────────────────────────────
// SimpleDeleteConfirm
// ─────────────────────────────────────────────────────────────────────────────

const SimpleDeleteConfirm = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete',
  message = 'Are you sure?',
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
      <div className="rounded-lg w-full max-w-sm bg-bg-primary border border-border-default shadow-card">
        <div className="px-6 py-4 border-b border-border-default flex justify-between items-center">
          <h2 className="text-lg font-bold text-action-danger">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-text-primary">{message}</p>
        </div>
        <div className="px-6 py-4 rounded-b-lg flex gap-3 bg-bg-tertiary border-t border-border-default">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-bg-primary border border-border-default text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-lg bg-action-danger text-text-white font-medium text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DeleteServedItemModal — asks reason when deleting a served/prepared item
// Records as wastage. Shows a clear warning that stock will be reversed.
// ─────────────────────────────────────────────────────────────────────────────

const WASTAGE_REASONS = [
  'Customer returned / rejected',
  'Wrong item served',
  'Quality issue',
  'Overcooked / spoiled',
  'Spillage / damage',
  'Other',
];

const DeleteServedItemModal = ({ isOpen, onClose, onConfirm, item, isServed }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  // reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
      setCustomReason('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
  const canSubmit = finalReason.length > 0;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setLoading(true);
    await onConfirm(finalReason);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-color-modalsbg">
      <div className="rounded-xl w-full max-w-md bg-bg-primary border border-border-default shadow-card">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-default flex justify-between items-center bg-action-danger/5 rounded-t-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-action-danger" />
            <h2 className="text-base font-bold text-action-danger">
              {isServed ? 'Delete Served Item — Record Wastage' : 'Delete Item'}
            </h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Item info */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-bg-tertiary border border-border-default mb-1">
            <span className="font-semibold text-sm text-text-primary">{item.item_name || 'Item'}</span>
            <span className="text-xs font-bold text-text-secondary">Qty: {item.quantity || 1}</span>
          </div>

          {isServed && (
            <p className="text-xs text-action-danger/80 mt-2 px-1">
              ⚠️ This item is already <strong>served</strong>. Deleting it will record a wastage
              transaction and reverse the stock deduction.
            </p>
          )}
          {!isServed && (
            <p className="text-xs text-text-secondary mt-2 px-1">
              This item is <strong>{item.status || 'pending'}</strong>. Only a deletion record will
              be saved — no stock reversal needed.
            </p>
          )}
        </div>

        {/* Reason selection */}
        <div className="px-6 py-3">
          <p className="text-sm font-semibold text-text-primary mb-2">
            Reason for deletion <span className="text-action-danger">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {WASTAGE_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setSelectedReason(r)}
                className={`text-left px-3 py-2.5 rounded-lg text-xs font-medium border transition-all
                  ${selectedReason === r
                    ? 'bg-action-danger text-text-white border-action-danger shadow-sm'
                    : 'bg-bg-tertiary text-text-secondary border-border-default hover:border-action-danger/40'}`}
              >
                {r}
              </button>
            ))}
          </div>

          {selectedReason === 'Other' && (
            <textarea
              className="mt-3 w-full px-3 py-2 rounded-lg border border-border-default bg-bg-primary text-text-primary text-sm resize-none focus:outline-none focus:border-action-primary"
              rows={2}
              placeholder="Describe the reason..."
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 rounded-b-xl flex gap-3 bg-bg-tertiary border-t border-border-default">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-bg-primary border border-border-default text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || loading}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all
              ${canSubmit && !loading
                ? 'bg-action-danger text-text-white hover:opacity-90'
                : 'bg-action-danger/30 text-text-white/50 cursor-not-allowed'}`}
          >
            {loading ? 'Deleting…' : isServed ? 'Delete & Record Wastage' : 'Delete Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LineItemsModal — add-on selection
// ─────────────────────────────────────────────────────────────────────────────

const LineItemsModal = ({
  isOpen,
  onClose,
  mainItem,
  lineItems,
  onAddMainOnly,
  onAddWithAddons,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
      <div className="rounded-lg w-full max-w-lg bg-bg-primary shadow-card border border-border-default">
        <div className="px-6 py-4 border-b border-border-default flex justify-between items-center">
          <h3 className="text-lg font-semibold text-text-primary">{mainItem?.name}</h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm mb-4 text-text-secondary">Add-ons for this item:</p>
          <div className="space-y-2">
            {lineItems.map((li, idx) => (
              <div
                key={li.id}
                className="flex justify-between items-center px-4 py-3 rounded-lg bg-bg-tertiary border border-border-default"
              >
                <span className="text-sm font-medium text-text-primary">
                  {idx + 1}. {li.name}
                </span>
                <span className="text-sm font-bold text-action-primary">₹{li.unit_price}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 rounded-b-lg flex gap-3 bg-bg-primary border-t border-border-default">
          <button
            onClick={onClose}
            className="bg-bg-tertiary text-text-primary border border-border-default px-4 py-2.5 rounded-lg font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onAddMainOnly}
            className="flex-1 bg-action-primary text-text-white px-4 py-2.5 rounded-lg font-medium text-sm"
          >
            Main Only
          </button>
          <button
            onClick={onAddWithAddons}
            className="flex-1 bg-action-success text-text-white px-4 py-2.5 rounded-lg font-medium text-sm"
          >
            With Add-ons
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OrderItemsViewModal — read-only view + per-item deletion for ALL statuses
// ─────────────────────────────────────────────────────────────────────────────

const OrderItemsViewModal = ({
  isOpen,
  onClose,
  order,
  inventoryMap,
  onDeleteItem,           // (item, isServed) => void — opens reason modal
}) => {
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
    const price =
      inventoryMap[item.item_id]?.unit_price ??
      item.unit_price ??
      item.price ??
      0;
    return sum + price * (item.quantity || 1);
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg"
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col bg-bg-primary shadow-card border border-border-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-border-default bg-action-primary rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-white">
              Order #{order.id}
            </h2>
            <p className="text-sm text-text-white/70 mt-0.5">
              {order._fixedOrderMode === 'takeaway'
                ? order.customer_name || 'Takeaway'
                : order._tableName || order.table || order.table_id}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-text-white/60 uppercase font-semibold tracking-wide">
                Grand Total
              </p>
              <p className="text-2xl font-bold text-text-white">
                ₹{grandTotal.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Items table */}
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
                const unitPrice =
                  inventoryMap[item.item_id]?.unit_price ??
                  item.unit_price ??
                  item.price ??
                  0;
                const lineTotal = unitPrice * (item.quantity || 1);
                const itemStatus = item.status?.toLowerCase();
                const isServedItem = itemStatus === 'served';

                return (
                  <React.Fragment key={item.id || idx}>
                    {item._isBatchStart && (
                      <tr>
                        <td colSpan={7} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-action-primary to-transparent" />
                            <span className="text-xs font-bold text-action-primary px-3 py-1 rounded-full bg-action-primary/10 border border-action-primary/20">
                              New Items
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-action-primary via-transparent to-transparent" />
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-5 py-3 text-text-secondary text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {item.item_name || 'Unnamed Item'}
                        {item.is_new_item && (
                          <span className="ml-2 text-[10px] font-bold text-action-primary bg-action-primary/10 px-1.5 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-text-primary">
                        {item.quantity || 1}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">
                        ₹{unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text-primary">
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getItemStatusStyle(item.status)}`}>
                          {item.status || 'pending'}
                        </span>
                      </td>
                      {/* ── Per-item delete — always visible ── */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onDeleteItem(item, isServedItem)}
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
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default bg-bg-tertiary rounded-b-xl flex justify-between items-center">
          <span className="text-sm font-medium text-text-secondary">
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </span>
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
// Status badge
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
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border
        ${styles[s] || 'bg-bg-tertiary text-text-secondary border-border-default'}`}
    >
      {status || '—'}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

const getInitialOrderMode = (order) => {
  if (Number(order.table_id) === 500) return 'takeaway';
  return 'dinein';
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const OrderSummaryVisible = ({ clientId, token }) => {
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryMap, setInventoryMap] = useState({});
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [tables, setTables] = useState([]);

  // ── Singular filter state ─────────────────────────────────────────────────
  const todayDate = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [filterMode, setFilterMode] = useState(0);
  const [selectedOrderMode, setSelectedOrderMode] = useState('all');

  // ── View modal ────────────────────────────────────────────────────────────
  const [viewOrder, setViewOrder] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // ── Delete (order-level) ──────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [showDeleteModals, setShowDeleteModals] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ orderId: null, itemBackendId: null });

  // ── Delete served item with reason ────────────────────────────────────────
  const [showServedDeleteModal, setShowServedDeleteModal] = useState(false);
  const [servedDeleteTarget, setServedDeleteTarget] = useState({
    orderId: null,
    item: null,
    isServed: false,
  });

  // ── Order detail / edit modal ─────────────────────────────────────────────
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
  const [visibleOrderId, setVisibleOrderId] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // localStorage helpers (preserved exactly from original)
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch helpers
  // ─────────────────────────────────────────────────────────────────────────

  const fetchTables = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTables(res.data?.data || []);
      const map = {};
      (res.data?.data || []).forEach(t => (map[t.id] = t.name));
      setTablesMap(map);
    } catch (e) {
      console.error('fetchTables', e);
    }
  };

  useEffect(() => {
    if (clientId) fetchTables();
  }, [clientId]);

  useEffect(() => {
    axios
      .get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(res => {
        setAllInventoryItems(res.data.data || []);
        const map = {};
        (res.data.data || []).forEach(i => (map[i.id] = i));
        setInventoryMap(map);
      })
      .catch(() => { });
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
  // ─────────────────────────────────────────────────────────────────────────

  const processOrder = (order) => {
    if (order.status === 'served') {
      clearNewItemsStorage(order.id);
      return {
        ...order,
        _fixedOrderMode: order._fixedOrderMode ?? getInitialOrderMode(order),
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
      _fixedOrderMode: order._fixedOrderMode ?? getInitialOrderMode(order),
      items: deduped,
      has_new_items: batchItemsMap.size > 0,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch orders with polling
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token || !clientId) { setLoading(false); return; }
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const allOrders = res.data?.data || [];
        setOrders(allOrders.map(processOrder));
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

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === 'served') return;
    const tableObj = tables.find(t => t.id === order.table_id);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: orderId, client_id: clientId, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
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
      toast.success('Order status updated');
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? { ...o, status: newStatus, has_new_items: newStatus === 'served' ? false : o.has_new_items }
            : o
        )
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          status: newStatus,
          has_new_items: newStatus === 'served' ? false : prev.has_new_items,
        }));
      }
      if (newStatus === 'served') setEditOrderId(null);
    } catch {
      toast.error('Failed to update order status.');
    }
  };

  // ── cancelItem — drop-in replacement ────────────────────────────────────────
  //
  // Now passes `reason` and `transaction_type` as query params to the existing
  // DELETE /order_item/delete endpoint instead of a separate transaction call.
  //
  // transaction_type values:
  //   "WASTAGE"        → item was served; stock reversal recorded
  //   "ITEM_CANCELLED" → item was pending/preparing/ready; audit record only
  //   (omitted)        → old behaviour — delete only, no transaction
  // ─────────────────────────────────────────────────────────────────────────

  const cancelItem = async (orderId, itemBackendId, reason = null, isServed = false) => {
    const order = orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemBackendId);
    if (!item) return;

    try {
      // 1. Remove local-only (temp) items that haven't hit the backend yet
      if (
        typeof itemBackendId === 'string' &&
        (itemBackendId.startsWith('temp_') || !itemBackendId.includes('_'))
      ) {
        localStorage.removeItem(`order_${orderId}_new_item_${item.frontend_unique_key}`);
        const updated = orders.map(o => {
          if (o.id !== orderId) return o;
          const updatedItems = o.items.filter(i => i.id !== itemBackendId);
          return { ...o, items: updatedItems, has_new_items: updatedItems.some(i => i.is_new_item) };
        });
        setOrders(updated);
        if (selectedOrder?.id === orderId) setSelectedOrder(updated.find(o => o.id === orderId));
        if (viewOrder?.id === orderId) setViewOrder(updated.find(o => o.id === orderId) || null);
        toast.success('Item removed');
        return;
      }

      // 2. Build query params — transaction_type only sent when a reason is provided
      const params = { order_item_id: itemBackendId, client_id: clientId };
      if (reason) {
        params.reason = reason;
        params.transaction_type = isServed ? 'WASTAGE' : 'ITEM_CANCELLED';
      }

      // 3. Single DELETE call — backend handles both deletion + transaction recording
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 4. Clean up localStorage if it was a new item
      if (item.is_new_item && item.frontend_unique_key) {
        localStorage.removeItem(`order_${orderId}_new_item_${item.frontend_unique_key}`);
      }

      // 5. Update local state
      const updateOrder = (o) => {
        if (o.id !== orderId) return o;
        const updatedItems = o.items.filter(i => i.id !== itemBackendId);
        const newTotal = updatedItems.reduce((sum, it) => {
          const price = inventoryMap[it.item_id]?.unit_price || it.price || 0;
          return sum + (it.quantity || 1) * price;
        }, 0);
        return {
          ...o,
          items: updatedItems,
          total_price: newTotal,
          has_new_items: updatedItems.some(i => i.is_new_item),
        };
      };

      const updatedOrders = orders.map(updateOrder);
      setOrders(updatedOrders);

      if (selectedOrder?.id === orderId)
        setSelectedOrder(updatedOrders.find(o => o.id === orderId) || null);

      // Keep viewOrder in sync if the view modal is still open
      if (viewOrder?.id === orderId)
        setViewOrder(updatedOrders.find(o => o.id === orderId) || null);

      toast.success(isServed ? 'Served item deleted & wastage recorded' : 'Item cancelled');

    } catch {
      toast.error('Failed to cancel item.');
    }
  };

  // ── Handler called from OrderItemsViewModal ───────────────────────────────
  // Opens the reason modal for served items; falls through to direct delete for others.

  const handleViewModalDeleteItem = (item, isServedItem) => {
    if (!viewOrder) return;

    if (isServedItem) {
      // Needs a reason — open the served-item delete modal
      setServedDeleteTarget({ orderId: viewOrder.id, item, isServed: true });
      setShowServedDeleteModal(true);
    } else {
      // Non-served item: open the simple confirm modal
      setDeleteTarget({ orderId: viewOrder.id, itemBackendId: item.id });
      setShowDeleteModals(true);
    }
  };

  // ── Handler called from the edit modal's item list ────────────────────────

  const handleEditModalDeleteItem = (item) => {
    if (!selectedOrder) return;
    const isServedItem = item.status?.toLowerCase() === 'served';

    if (isServedItem) {
      setServedDeleteTarget({ orderId: selectedOrder.id, item, isServed: true });
      setShowServedDeleteModal(true);
    } else {
      setDeleteTarget({ orderId: selectedOrder.id, itemBackendId: item.id });
      setShowDeleteModals(true);
    }
  };

  const updateItemQuantity = (orderId, itemIdentifier, newQty) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const updatedItems = o.items.map(item => {
          const itemKey = item.id || item.frontend_unique_key;
          if (itemKey === itemIdentifier) return { ...item, quantity: newQty > 0 ? newQty : 1 };
          return item;
        });
        const newTotal = updatedItems.reduce(
          (s, it) =>
            s + ((inventoryMap[it.item_id]?.unit_price || it.unit_price || it.price || 0) * (it.quantity || 1)),
          0
        );
        return { ...o, items: updatedItems, total_price: newTotal };
      })
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => ({
        ...prev,
        items: prev.items.map(item => {
          const itemKey = item.id || item.frontend_unique_key;
          if (itemKey === itemIdentifier) return { ...item, quantity: newQty > 0 ? newQty : 1 };
          return item;
        }),
      }));
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        {
          params: { dinein_order_id: orderToDelete, client_id: clientId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const deletedOrder = orders.find(o => o.id === orderToDelete);
      const tableIdOfDel = deletedOrder?.table_id;
      if (tableIdOfDel) {
        const tableObj = tables.find(t => t.id === tableIdOfDel);
        await axios.post(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          {
            id: tableIdOfDel,
            client_id: clientId,
            name: tableObj?.name || '',
            table_type: tableObj?.table_type || '',
            status: 'vacant',
            location_zone: tableObj?.location_zone || '',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setOrders(prev => prev.filter(o => o.id !== orderToDelete));
      setShowDeleteModal(false);
      setOrderToDelete(null);
      toast.success('Order deleted and table marked vacant.');
      fetchTables();
    } catch {
      toast.error('Failed to delete order');
    }
  };

  const handleGenerateBill = (order) => {
    navigate(`/saas/${clientId}/billing`, {
      state: { orderId: order.id, tableId: order.table_id, clientId },
    });
  };

  // ── Add item / batch helpers (preserved from original) ────────────────────

  const handleItemSelection = (orderId, selectedItem) => {
    if (
      selectedItem.line_item_id &&
      Array.isArray(selectedItem.line_item_id) &&
      selectedItem.line_item_id.length > 0
    ) {
      const lineItems = selectedItem.line_item_id
        .map(id => allInventoryItems.find(i => i.id === id))
        .filter(Boolean);
      setSelectedMainItem(selectedItem);
      setLineItemsDetails(lineItems);
      setPendingOrderId(orderId);
      setLineItemsModalOpen(true);
    } else {
      addItemToOrder(orderId, selectedItem);
    }
    setItemSearchQuery('');
  };

  const handleAddMainItemWithLineItems = () => {
    if (!selectedMainItem || !pendingOrderId) return;
    let batchTimestamp = currentBatchTimestamp;
    if (!batchTimestamp) {
      batchTimestamp = Date.now();
      setCurrentBatchTimestamp(batchTimestamp);
      localStorage.setItem(
        `order_${pendingOrderId}_batch_${batchTimestamp}`,
        JSON.stringify({ timestamp: batchTimestamp, started_at: Date.now() })
      );
    }
    addItemToOrderWithBatch(pendingOrderId, selectedMainItem, batchTimestamp, true);
    lineItemsDetails.forEach(li =>
      addItemToOrderWithBatch(pendingOrderId, li, batchTimestamp, false)
    );
    setLineItemsModalOpen(false);
    setSelectedMainItem(null);
    setLineItemsDetails([]);
    setPendingOrderId(null);
  };

  const handleAddMainItemOnly = () => {
    if (!selectedMainItem || !pendingOrderId) return;
    addItemToOrder(pendingOrderId, selectedMainItem);
    setLineItemsModalOpen(false);
    setSelectedMainItem(null);
    setLineItemsDetails([]);
    setPendingOrderId(null);
  };

  const addItemToOrderWithBatch = (orderId, selectedItem, forcedBatchTimestamp, isMainItem = false) => {
    let batchKey = `order_${orderId}_batch_${forcedBatchTimestamp}`;
    let batchMeta = null;
    try {
      const raw = localStorage.getItem(batchKey);
      if (raw) batchMeta = JSON.parse(raw);
    } catch { /* ignore */ }

    if (!batchMeta) {
      const tableName = tablesMap?.[selectedOrder?.table_id] || (selectedOrder?.table || '');
      const ensured = ensureBatchForOrder(orderId, tableName);
      batchKey = ensured.storageKey;
      batchMeta = ensured.meta;
    }
    if (!batchMeta) return;

    try {
      batchMeta.added_count = (batchMeta.added_count || 0) + 1;
      localStorage.setItem(batchKey, JSON.stringify(batchMeta));
    } catch { /* ignore */ }

    const uniqueKey = generateFrontendKeyFromBatch(orderId, batchMeta);

    const existingItemInBatch = selectedOrder?.items.find(
      item =>
        item.is_new_item &&
        String(item.item_id) === String(selectedItem.id) &&
        Number(item.batch_timestamp) === Number(batchMeta.timestamp)
    );

    if (existingItemInBatch) {
      const idOrKey = existingItemInBatch.id || existingItemInBatch.frontend_unique_key;
      updateItemQuantity(orderId, idOrKey, (existingItemInBatch.quantity || 1) + 1);
      try {
        const sk = `order_${orderId}_new_item_${existingItemInBatch.frontend_unique_key || existingItemInBatch.id || uniqueKey}`;
        const raw = JSON.parse(localStorage.getItem(sk) || '{}');
        raw.quantity = (raw.quantity || existingItemInBatch.quantity || 1) + 1;
        localStorage.setItem(sk, JSON.stringify(raw));
      } catch { /* best-effort */ }
      return;
    }

    const newItem = {
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      quantity: 1,
      price: selectedItem.unit_price,
      status: 'pending',
      note: '',
      slug: selectedItem.slug || generateSlug(selectedItem.name),
      added_at_frontend: Date.now() + Math.random(),
      frontend_unique_key: uniqueKey,
      is_new_item: true,
      unit_price: selectedItem.unit_price || 0,
      line_total: (selectedItem.unit_price || 0) * 1,
      batch_timestamp: batchMeta.timestamp,
      id: uniqueKey,
      image: selectedItem.image,
      is_line_item: !isMainItem,
    };

    try {
      localStorage.setItem(
        `order_${orderId}_new_item_${uniqueKey}`,
        JSON.stringify({
          item_id: newItem.item_id,
          unique_key: uniqueKey,
          added_at: newItem.added_at_frontend,
          batch_timestamp: newItem.batch_timestamp,
          quantity: newItem.quantity,
          is_line_item: newItem.is_line_item,
        })
      );
    } catch { /* ignore */ }

    const rebuildOrder = (o) => {
      if (o.id !== orderId) return o;
      const batches = getBatchesFromStorage(orderId);
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

      const combined = [...oldItems];
      Array.from(newItemsByBatch.keys()).sort((a, b) => a - b).forEach(ts => {
        const batch = (newItemsByBatch.get(ts) || []).map(it => ({ ...it }));
        if (batch.length > 0) { batch[0] = { ...batch[0], _isBatchStart: true }; combined.push(...batch); }
      });

      const seen = new Set(); const deduped = [];
      for (const it of combined) {
        const k = it.frontend_unique_key
          ? String(it.frontend_unique_key)
          : `${it.item_id}_${it.batch_timestamp || ''}_${it.unit_price || it.price || 0}`;
        if (seen.has(k)) {
          const ex = deduped.find(x =>
            (x.frontend_unique_key ? String(x.frontend_unique_key) : `${x.item_id}_${x.batch_timestamp || ''}_${x.unit_price || x.price || 0}`) === k
          );
          if (ex) { ex.quantity = (ex.quantity || 1) + (it.quantity || 1); ex.line_total = (ex.unit_price || ex.price || 0) * ex.quantity; }
          continue;
        }
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
    try {
      meta.added_count = (meta.added_count || 0) + 1;
      localStorage.setItem(storageKey, JSON.stringify(meta));
    } catch { /* ignore */ }
    addItemToOrderWithBatch(orderId, selectedItem, meta.timestamp, true);
  };

  const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
    const newItemsToSave = updatedItemsWithStatuses.filter(item => item.is_new_item);
    if (newItemsToSave.length > 0 && currentBatchTimestamp) {
      localStorage.setItem(
        `order_${orderId}_batch_${currentBatchTimestamp}`,
        JSON.stringify({ timestamp: currentBatchTimestamp, started_at: Date.now() })
      );
      newItemsToSave.forEach(item => {
        const sk = `order_${orderId}_new_item_${item.frontend_unique_key}`;
        localStorage.setItem(sk, JSON.stringify({
          item_id: item.item_id,
          unique_key: item.frontend_unique_key,
          added_at: item.added_at_frontend,
          batch_timestamp: item.batch_timestamp || currentBatchTimestamp,
          quantity: item.quantity || 1,
          is_line_item: item.is_line_item || false,
        }));
      });
    }
    const cleanedItems = updatedItemsWithStatuses
      .filter(item => typeof item.id === 'number' || item.is_new_item)
      .map(item => {
        const inv = inventoryMap[item.item_id || item.inventory_id];
        const unitPrice = item.unit_price ?? item.price ?? inv?.unit_price ?? 0;
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
          frontend_unique_key: item.frontend_unique_key || null,
        };
      });
    const totalPrice = cleanedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderId}`,
        cleanedItems,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: orderId, total_price: totalPrice },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentBatchTimestamp(null);
      setEditOrderId(null);
      setItemSearchQuery('');
      toast.success('Items saved successfully!');

      const res = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allOrders = res.data?.data || [];
      const fresh = allOrders.find(o => o.id === orderId);
      if (!fresh) return;
      const processed = processOrder(fresh);
      setOrders(prev => prev.map(o => (o.id === orderId ? processed : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder(processed);
      clearNewItemsStorage(orderId);
      setCurrentBatchTimestamp(null);
    } catch (err) {
      console.error('Save error', err);
      toast.error('Failed to update items or total.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Singular filtering
  // ─────────────────────────────────────────────────────────────────────────

  let filteredOrders = selectedDate
    ? orders.filter(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
      return orderDate === selectedDate;
    })
    : orders;

  if (selectedOrderMode !== 'all') {
    filteredOrders = filteredOrders.filter(o => o._fixedOrderMode === selectedOrderMode);
  }

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

  // ─────────────────────────────────────────────────────────────────────────
  // Derived helpers
  // ─────────────────────────────────────────────────────────────────────────

  const getOrderTotal = (order) =>
    order.items.reduce((sum, item) => {
      const price =
        inventoryMap[item.item_id]?.unit_price ??
        item.unit_price ??
        item.price ??
        0;
      return sum + price * (item.quantity || 1);
    }, 0);

  const getOrderModeIcon = (mode) => {
    if (mode === 'takeaway') return <Package size={12} />;
    if (mode === 'delivery') return <Truck size={12} />;
    return <Users size={12} />;
  };

  const getOrderModeLabel = (mode) => {
    if (mode === 'takeaway') return 'Takeaway';
    if (mode === 'delivery') return 'Delivery';
    return 'Dine In';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto px-4 py-3">
        <div className="bg-action-primary rounded-2xl shadow-xl px-6 py-5 mb-6">
          {/* ── Filter bar ── */}
          <div className="flex flex-wrap gap-8 items-center rounded-xl p-3">

            {/* Order mode — singular selection */}
            <div className="flex gap-4">
              {[
                { value: 'all', label: 'All', icon: <Filter size={20} /> },
                { value: 'dinein', label: 'Dine In', icon: <Users size={20} /> },
                { value: 'takeaway', label: 'Takeaway', icon: <Package size={20} /> },
                { value: 'delivery', label: 'Delivery', icon: <Truck size={20} /> },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setSelectedOrderMode(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-lg transition-all
                  ${selectedOrderMode === value
                      ? 'bg-action-primary text-text-white shadow-sm'
                      : 'bg-bg-primary text-text-secondary hover:text-text-primary border border-border-default'}`}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-border-default mx-1 hidden sm:block" />

            {/* Status filter */}
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                size={15}
              />
              <select
                value={filterMode}
                onChange={e => setFilterMode(Number(e.target.value))}
                className="pl-9 pr-4 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm"
              >
                <option value={0}>All Status</option>
                <option value={2}>Pending</option>
                <option value={3}>Preparing</option>
                <option value={4}>Ready</option>
                <option value={5}>Served</option>
              </select>
            </div>

            {/* Date */}
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm"
            />

            <div className="ml-auto text-sm font-semibold text-text-secondary">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* ── Orders table ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-action-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl p-16 text-center bg-bg-primary border border-border-default shadow-card">
            <ShoppingBag size={40} className="mx-auto mb-3 text-text-secondary opacity-40" />
            <p className="text-text-secondary text-base font-medium">No orders found</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border-default shadow-card bg-bg-primary">
            <table className="w-full">
              <thead className="bg-bg-tertiary border-b border-border-default">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Table / Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Total Price</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredOrders.map((order, rowIdx) => {
                  const status = order.status?.toLowerCase();
                  const orderTotal = getOrderTotal(order);
                  const isEven = rowIdx % 2 === 0;

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-bg-tertiary transition-colors ${isEven ? 'bg-bg-primary' : 'bg-bg-tertiary'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-action-primary">#{order.id}</span>
                          {order.has_new_items && (
                            <span className="text-[9px] font-bold text-text-white bg-action-primary px-1.5 py-0.5 rounded-full uppercase">
                              New
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order._fixedOrderMode === 'takeaway'
                          ? order.customer_name || 'Takeaway'
                          : tablesMap[order.table_id] || order.table || String(order.table_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-tertiary text-text-secondary border border-border-default">
                          {getOrderModeIcon(order._fixedOrderMode)}
                          {getOrderModeLabel(order._fixedOrderMode)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.items.length}</td>
                      <td className="px-6 py-4 whitespace-nowrap">₹{orderTotal.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                          <button
                            onClick={() => {
                              setViewOrder({
                                ...order,
                                _tableName: tablesMap[order.table_id] || order.table || String(order.table_id),
                              });
                              setShowViewModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-action-primary/10 text-action-primary hover:bg-action-primary hover:text-text-white transition-colors"
                            title="View items"
                          >
                            <Eye size={15} />
                          </button>
                          {status === 'ready' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'served')}
                              className="px-2.5 py-1 rounded-lg bg-action-success text-text-white text-xs font-semibold hover:opacity-90 transition-colors whitespace-nowrap"
                            >
                              Mark As Served
                            </button>
                          )}
                          {status === 'served' && (
                            <button
                              onClick={() => handleGenerateBill(order)}
                              className="px-2.5 py-1 rounded-lg bg-green-700 text-text-white text-xs font-semibold hover:bg-green-800 transition-colors whitespace-nowrap"
                            >
                              Generate Bill
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setOrderToDelete(order.id);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-action-danger/10 text-action-danger hover:bg-action-danger hover:text-text-white transition-colors"
                            title="Delete order"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* ── Order detail / edit modal ── */}
      {showOrderDetailModal && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg backdrop-blur-sm"
          onClick={() => {
            setShowOrderDetailModal(false);
            setEditOrderId(null);
            setActiveTab('items');
          }}
        >
          <div
            className="rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col bg-bg-primary shadow-card border border-border-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-border-default bg-bg-tertiary rounded-t-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-text-primary">
                    {tablesMap[selectedOrder.table_id] || selectedOrder.table || selectedOrder.table_id}
                  </h3>
                  <span className="text-2xl font-extrabold text-text-primary">
                    {selectedOrder.items.length} items
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right bg-action-primary/10 px-4 py-2 rounded-xl border border-action-primary/20">
                    <div className="text-xs font-semibold text-text-secondary uppercase">Total</div>
                    <div className="text-xl font-bold text-action-primary">
                      ₹{selectedOrder.items
                        .reduce(
                          (sum, item) =>
                            sum +
                            ((inventoryMap[item.item_id]?.unit_price || item.unit_price || item.price || 0) *
                              (item.quantity || 1)),
                          0
                        )
                        .toFixed(2)}
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

            <div className="lg:hidden border-b border-border-default bg-bg-tertiary">
              <div className="flex">
                <button
                  className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'items' ? 'text-action-primary border-b-2 border-action-primary bg-bg-primary' : 'text-text-secondary'}`}
                  onClick={() => setActiveTab('items')}
                >
                  Items
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'available' ? 'text-action-primary border-b-2 border-action-primary bg-bg-primary' : 'text-text-secondary'}`}
                  onClick={() => setActiveTab('available')}
                >
                  Add Items
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className={`w-full lg:w-2/5 border-r border-border-default bg-bg-tertiary flex flex-col ${activeTab === 'available' ? 'block' : 'hidden lg:flex'}`}>
                <div className="p-4 border-b border-border-default bg-bg-primary shrink-0">
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-border-default bg-bg-primary text-text-primary"
                    placeholder="Search items..."
                    value={itemSearchQuery}
                    onChange={e => setItemSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(itemSearchResults.length > 0 ? itemSearchResults : allInventoryItems).map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-bg-primary border border-border-default cursor-pointer hover:border-action-primary transition-colors"
                      onClick={() => {
                        handleItemSelection(selectedOrder.id, item);
                        setActiveTab('items');
                      }}
                    >
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
                    const showDivider =
                      item._isBatchStart ||
                      (item.is_new_item &&
                        (!prev || (prev.batch_timestamp || null) !== (item.batch_timestamp || null)));
                    const isServedItem = item.status?.toLowerCase() === 'served';

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
                        <div className={`flex items-center justify-between p-3 rounded-xl border ${isServedItem ? 'bg-gray-50 border-gray-200' : 'bg-bg-tertiary border-border-default'}`}>
                          <div>
                            <div className="font-semibold text-sm text-text-primary">
                              {item.item_name || item.item_id}
                            </div>
                            {isServedItem && (
                              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                                served
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isServedItem && (
                              <>
                                <button
                                  onClick={() =>
                                    updateItemQuantity(
                                      selectedOrder.id,
                                      item.id || item.frontend_unique_key,
                                      Math.max(1, item.quantity - 1)
                                    )
                                  }
                                  className="px-3 py-1 rounded-lg border border-border-default bg-bg-primary text-text-primary"
                                >
                                  −
                                </button>
                                <span className="px-3 font-bold text-text-primary">{item.quantity}</span>
                                <button
                                  onClick={() =>
                                    updateItemQuantity(
                                      selectedOrder.id,
                                      item.id || item.frontend_unique_key,
                                      item.quantity + 1
                                    )
                                  }
                                  className="px-3 py-1 rounded-lg border border-border-default bg-bg-primary text-text-primary"
                                >
                                  +
                                </button>
                              </>
                            )}
                            {/* Delete button — always shown, amber tint for served items */}
                            <button
                              className={`p-2 rounded-lg transition-colors
                                ${isServedItem
                                  ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white'
                                  : 'bg-action-danger/10 text-action-danger hover:bg-action-danger hover:text-text-white'}`}
                              title={isServedItem ? 'Delete served item (records wastage)' : 'Delete item'}
                              onClick={() => handleEditModalDeleteItem(item)}
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

            <div className="p-4 border-t border-border-default bg-bg-tertiary flex gap-3 rounded-b-xl">
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
                className="flex-1 bg-bg-primary border border-border-default py-3 rounded-xl font-semibold text-text-primary"
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
      )}

      {/* ── Modals ── */}
      <OrderItemsViewModal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewOrder(null); }}
        order={viewOrder}
        inventoryMap={inventoryMap}
        onDeleteItem={handleViewModalDeleteItem}
      />

      <LineItemsModal
        isOpen={lineItemsModalOpen}
        onClose={() => setLineItemsModalOpen(false)}
        mainItem={selectedMainItem}
        lineItems={lineItemsDetails}
        onAddMainOnly={handleAddMainItemOnly}
        onAddWithAddons={handleAddMainItemWithLineItems}
      />

      {/* Order-level delete */}
      <SimpleDeleteConfirm
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteOrder}
        title="Delete Order"
        message="Want to delete this order?"
      />

      {/* Non-served item delete (simple confirm) */}
      <SimpleDeleteConfirm
        isOpen={showDeleteModals}
        onClose={() => setShowDeleteModals(false)}
        onConfirm={() => {
          cancelItem(
            deleteTarget.orderId,
            deleteTarget.itemBackendId,
            'Item cancelled before serving',
            false
          );
          setShowDeleteModals(false);
        }}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
      />

      {/* Served item delete — requires reason, records wastage */}
      <DeleteServedItemModal
        isOpen={showServedDeleteModal}
        onClose={() => {
          setShowServedDeleteModal(false);
          setServedDeleteTarget({ orderId: null, item: null, isServed: false });
        }}
        onConfirm={async (reason) => {
          await cancelItem(
            servedDeleteTarget.orderId,
            servedDeleteTarget.item?.id,
            reason,
            servedDeleteTarget.isServed
          );
        }}
        item={servedDeleteTarget.item}
        isServed={servedDeleteTarget.isServed}
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