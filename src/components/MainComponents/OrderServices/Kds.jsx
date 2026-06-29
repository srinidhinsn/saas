import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaCheckCircle, FaClock, FaHourglassHalf, FaConciergeBell } from 'react-icons/fa';
import { Filter, Clock, Users, Package, Truck, Trash2, BarChart2, X, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import { menuCache } from '../../utils/Menu-utils/menuCache';
// ─── Constants ─────────────────────────────────────────────────────────────────


// ─── Dynamic Configuration ─────────────────────────────────────────────────────

const KDS_CONFIG = {
  FILTERS: {
    ALL: 'ALL',
    DINEIN: 'DINEIN',
    TAKEAWAY: 'TAKEAWAY',
    DELIVERY: 'DELIVERY',
  },

  STATUS: {
    PENDING: 'pending',
    PREPARING: 'preparing',
    SERVED: 'served',
    READY: 'ready',
    CANCELLED: 'cancelled',
  },

  POLL_INTERVAL_MS: 10000,

  DATE_FORMAT: 'en-CA',

  DEFAULT_TABLE_PREFIX: 'T-',

  DEFAULT_UNKNOWN_LABEL: 'Unknown',
  // The category_id value used in your menu data to identify combo items
  COMBO_CATEGORY_ID: 'Combos',
};

const ORDER_FILTER_OPTIONS = [
  { key: KDS_CONFIG.FILTERS.ALL, label: 'All Orders', Icon: Filter },
  { key: KDS_CONFIG.FILTERS.DINEIN, label: 'Dine-In', Icon: Users },
  { key: KDS_CONFIG.FILTERS.TAKEAWAY, label: 'Takeaway', Icon: Package },
  { key: KDS_CONFIG.FILTERS.DELIVERY, label: 'Delivery', Icon: Truck },
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const parseISTTimestamp = (createdAt) => {
  if (!createdAt) return 0;
  const raw = typeof createdAt === 'string'
    ? createdAt.replace(' ', 'T').split('.')[0]
    : String(createdAt);
  // If the string already carries timezone info, parse as-is
  const hasZone = raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw);
  return hasZone
    ? new Date(raw).getTime()
    : new Date(raw + 'Z').getTime() - IST_OFFSET_MS;
};

// Returns YYYY-MM-DD for "today" in IST, matching the en-CA formatted dates
// produced elsewhere in this file so date-string comparisons stay consistent.
const getTodayISTDateString = () => {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  return nowIST.toISOString().split('T')[0];
};


// ─── Elapsed time helper ───────────────────────────────────────────────────────

const calculateElapsedTime = (createdAt) => {
  if (!createdAt) return null;

  const diffMs = Date.now() - parseISTTimestamp(createdAt);
  if (diffMs < 0) return '0m';

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalSeconds < 60) return '< 1m';
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${totalMinutes}m`;
};

const deriveStatus = (items) => {
  const { PENDING, PREPARING, READY, SERVED } = KDS_CONFIG.STATUS;
  const activeItems = (items || []).filter((item) => {
    const status = String(item?.status || '').toLowerCase();
    return status !== KDS_CONFIG.STATUS.CANCELLED;
  });

  if (!activeItems.length) return PENDING;
  if (activeItems.every((i) => i.status === SERVED)) return SERVED;
  if (activeItems.some((i) => i.status === PENDING)) return PENDING;
  if (activeItems.some((i) => i.status === PREPARING)) return PREPARING;
  if (activeItems.every((i) => i.status === READY)) return READY;
  return READY;
};

const isCancelledStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === KDS_CONFIG.STATUS.CANCELLED;
};

// ─── Derive card-level status from its items ───────────────────────────────────
const minutesElapsed = (createdAt) => {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - parseISTTimestamp(createdAt)) / 60000);
};

// ─── Helper: is this order item a combo? ──────────────────────────────────────
// Requires BOTH category_id === 'Combos' AND line_item_id present.
// Addons also carry line_item_id so checking only line items is not enough.

const isComboItem = (orderItem, menuRecord) => {
  if (!menuRecord) return false;

  // Check category_id contains 'combo' anywhere (case-insensitive)
  const categoryId = String(menuRecord.category_id || '').toLowerCase();
  const categoryName = String(menuRecord.category_name || '').toLowerCase();

  const isComboCategory = categoryId.includes('combo') || categoryName.includes('combo');

  const hasLineItems =
    Array.isArray(menuRecord.line_item_id) && menuRecord.line_item_id.length > 0;

  return isComboCategory && hasLineItems;
};

// ─── Delete item confirmation modal ───────────────────────────────────────────

const DeleteItemModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm rounded-xl overflow-hidden shadow-lg bg-white text-gray-900">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-red-600">Remove Item</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600">
            Remove <span className="font-semibold">{itemName}</span> from this order?
          </p>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
          >
            Remove
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


// ─── Delete order confirmation modal ──────────────────────────────────────────

const DeleteOrderModal = ({ isOpen, onClose, onConfirm, cardToDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-xl overflow-hidden shadow-lg bg-white text-gray-900">
        <div className="px-6 py-5 border-b">
          <h3 className="text-lg font-semibold">Confirm Delete</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600">
            {!cardToDelete?.is_sub_order
              ? 'Delete this order and ALL its sub-orders?'
              : `Delete sub-order #${cardToDelete?.dinein_order_id}?`}
          </p>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
          >
            Yes
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── AggregatePanel ─────────────────────────────────────────────────────────────

const AggregatePanel = ({ cards, tablesMap, onClose }) => {
  const aggregateMap = {};

  cards.forEach((card) => {
    const tableLabel =
      tablesMap[card.table_id] || `${KDS_CONFIG.DEFAULT_TABLE_PREFIX}${card.table_id}`;
    (card.items || []).forEach((item) => {
      if (item.status === KDS_CONFIG.STATUS.SERVED || isCancelledStatus(item.status)) return;
      const name = item.item_name || 'Unnamed';
      if (!aggregateMap[name]) {
        aggregateMap[name] = { totalQty: 0, orders: [] };
      }
      aggregateMap[name].totalQty += item.quantity || 1;
      aggregateMap[name].orders.push({
        tableLabel,
        dineinOrderId: card.dinein_order_id,
        qty: item.quantity || 1,
        createdAt: card.created_at,
        cardId: card.card_id,
        itemStatus: item.status,
      });
    });
  });

  const entries = Object.entries(aggregateMap).sort(
    (a, b) => b[1].totalQty - a[1].totalQty
  );

  entries.forEach(([, data]) => {
    data.orders.sort(
      (a, b) => parseISTTimestamp(a.createdAt || 0) - parseISTTimestamp(b.createdAt || 0)
    );
  });

  const urgencyColor = (createdAt) => {
    const m = minutesElapsed(createdAt);
    if (m >= 20) return 'bg-red-100 text-red-700 border-red-300';
    if (m >= 10) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const urgencyDot = (createdAt) => {
    const m = minutesElapsed(createdAt);
    if (m >= 20) return 'bg-red-500';
    if (m >= 10) return 'bg-orange-400';
    return 'bg-green-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-action-primary rounded-t-2xl">
          <div className="flex items-center gap-3">
            <BarChart2 size={22} className="text-white" />
            <h2 className="text-lg font-bold text-white">Kitchen Aggregate View</h2>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">
              {entries.length} items
            </span>
          </div>
          <button onClick={onClose} className="text-white hover:text-white/70 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex items-center gap-4 px-6 py-2 bg-gray-50 border-b text-xs text-gray-500">
          <span className="font-semibold">Priority:</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &gt;20 min — urgent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> 10–20 min — watch</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> &lt;10 min — fresh</span>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {entries.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No active items</p>
          ) : (
            entries.map(([itemName, data]) => (
              <div key={itemName} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="font-bold text-gray-800 text-base">{itemName}</span>
                  <span className="bg-action-primary text-white text-sm font-bold px-3 py-1 rounded-full">
                    × {data.totalQty} total
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.orders.map((ord, idx) => (
                    <div
                      key={`${ord.cardId}-${idx}`}
                      className={`flex items-center justify-between px-4 py-2.5 ${urgencyColor(ord.createdAt)} border-l-4`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${urgencyDot(ord.createdAt)}`}
                        />
                        <div>
                          <span className="font-semibold text-sm">{ord.tableLabel}</span>
                          <span className="text-xs ml-2 opacity-70">#{ord.dineinOrderId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold opacity-60">
                          {idx === 0 ? '🔴 Serve first' : `#${idx + 1}`}
                        </span>
                        <span className="text-xs opacity-60">
                          {calculateElapsedTime(ord.createdAt)} ago
                        </span>
                        <span className="font-bold text-sm">× {ord.qty}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold
                            ${ord.itemStatus === 'ready' ? 'bg-green-200 text-green-800' :
                              ord.itemStatus === 'preparing' ? 'bg-orange-200 text-orange-800' :
                                'bg-blue-100 text-blue-700'}`}
                        >
                          {ord.itemStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ComboComponentsList ───────────────────────────────────────────────────────
// Shows the included line items of a combo directly below the main item row.
// Industry standard KDS pattern: always-visible, indented, read-only sub-list.

// ─── Item status icon button ───────────────────────────────────────────────────
const ComboComponentsList = ({ menuRecord, menuItemsMap, parentQuantity = 1 }) => {
  const componentIds = menuRecord?.line_item_id;
  if (!componentIds || !Array.isArray(componentIds) || componentIds.length === 0) return null;

  const components = componentIds
    .map((id) => menuItemsMap[Number(id)] || menuItemsMap[String(id)])
    .filter(Boolean);

  return (
    <div className="mt-1.5 ml-1 space-y-0.5">
      {components.length > 0 ? (
        components.map((comp, idx) => (
          <div
            key={comp.id || idx}
            className="flex items-center gap-1.5 pl-3 border-l-2 border-violet-300 py-0.5"
          >
            <ChevronRight size={10} className="text-violet-400 flex-shrink-0" />
            <span className="text-[11px] text-violet-700 font-medium leading-tight">
              {parentQuantity > 1 && (
                <span className="font-bold mr-1">{parentQuantity}×</span>
              )}
              {comp.name || comp.item_name || `Item #${comp.id}`}
            </span>
          </div>
        ))
      ) : (
        <div className="pl-3 border-l-2 border-violet-200 py-0.5">
          <span className="text-[11px] text-violet-500 font-medium">
            {parentQuantity > 1 ? `${parentQuantity}× ` : ''}
            {componentIds.length} included item{componentIds.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── KDS card ─────────────────────────────────────────────────────────────────

const groupItemsWithAddons = (items) => {
  const groups = [];
  const processed = new Set();

  (items || []).forEach(item => {
    if (processed.has(item.id)) return;

    const fkey = item.frontend_unique_key || '';
    const isChild = fkey.startsWith('addon_') || fkey.startsWith('cchild_');

    if (!isChild) {
      // Find addon children: their key starts with "addon_{thisItemsKey}_"
      const addonPrefix = `addon_${fkey}_`;
      const addons = (items || []).filter(
        a => (a.frontend_unique_key || '').startsWith(addonPrefix)
      );
      groups.push({ main: item, addons });
      processed.add(item.id);
      addons.forEach(a => processed.add(a.id));
    }
  });
  return groups;
};

const KitchenCard = ({
  card,
  tablesMap,
  menuItemsMap,
  onItemStatusChange,
}) => {
  // Track which item buttons are currently being saved to prevent double-clicks
  const [pendingItemIds, setPendingItemIds] = useState(new Set());

  const elapsedTime = card.created_at ? calculateElapsedTime(card.created_at) : null;

  const allReady =
  card.items?.length > 0 &&
  card.items.every((i) => i.status === KDS_CONFIG.STATUS.READY || i.status === KDS_CONFIG.STATUS.SERVED) &&
  !card.items.every((i) => i.status === KDS_CONFIG.STATUS.SERVED);

  const statusColorClass =
  allReady
    ? 'text-yellow-500'
    : card.status === KDS_CONFIG.STATUS.SERVED
      ? 'text-green-600'
      : card.status === KDS_CONFIG.STATUS.PENDING
        ? 'text-blue-600'
        : card.status === KDS_CONFIG.STATUS.PREPARING
          ? 'text-orange-600'
          : '';

  const handleStatusClick = async (cardId, itemId, newStatus) => {
    if (pendingItemIds.has(itemId)) return; // debounce rapid taps
    setPendingItemIds((prev) => new Set(prev).add(itemId));
    try {
      await onItemStatusChange(cardId, itemId, newStatus);
    } finally {
      setPendingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  return (
    <div className="rounded-xl shadow-md overflow-hidden border border-gray-200 bg-white transition-transform transform hover:-translate-y-0.5 flex flex-col">

      {/* ── Card header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-action-primary text-text-white">
        <div className="flex items-center justify-between w-full">

          {/* Table name */}
          <span className="text-sm md:text-base font-semibold">
            {tablesMap[card.table_id] || `${KDS_CONFIG.DEFAULT_TABLE_PREFIX}${card.table_id}`}
          </span>
          <div className="flex items-center gap-2 text-xl font-semibold text-white">
            <Clock size={16} />
            <span>{elapsedTime}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xl font-semibold text-orange-100/80">
              #{card.dinein_order_id}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card body — item list ── */}
      <div className="bg-bg-primary px-4 py-4 space-y-3 flex-1">
        {groupItemsWithAddons(card.items).map(({ main: item, addons }, idx) => {
          const menuRecord = menuItemsMap[String(item.item_id)];
          const combo = isComboItem(item, menuRecord);
          const isPending = pendingItemIds.has(item.id);
          const isCancelled = isCancelledStatus(item.status);

          return (
            <div key={item.id || idx} className="flex flex-col w-full rounded-lg bg-white">
              {/* Main item row — unchanged */}
              <div className="flex items-center w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">
                      <span className="mr-1">{item.quantity} x</span>
                      <span>{item.item_name || 'Unnamed Item'}</span>
                    </span>
                    {combo && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.5 rounded-full">
                        COMBO
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    type="button"
                    disabled={isPending || isCancelled}
                    onClick={() => handleStatusClick(card.card_id, item.id, KDS_CONFIG.STATUS.PENDING)}
                    title="Mark as Pending"
                    className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${isPending || isCancelled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <FaClock
                      size={20}
                      className={item.status === 'pending' ? 'text-blue-600' : 'text-gray-400'}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={isPending || isCancelled}
                    onClick={() => handleStatusClick(card.card_id, item.id, KDS_CONFIG.STATUS.PREPARING)}
                    title="Mark as Preparing"
                    className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${isPending || isCancelled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <FaHourglassHalf
                      size={20}
                      className={item.status === 'preparing' ? 'text-orange-500' : 'text-gray-400'}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={isPending || isCancelled}
                    onClick={() => handleStatusClick(card.card_id, item.id, KDS_CONFIG.STATUS.READY)}
                    title="Mark as Ready"
                    className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${isPending || isCancelled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <FaCheckCircle
                      size={20}
                      className={item.status === 'ready' ? 'text-green-500' : 'text-gray-400'}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={isPending || isCancelled}
                    onClick={() => handleStatusClick(card.card_id, item.id, KDS_CONFIG.STATUS.SERVED)}
                    title="Mark as Served"
                    className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${isPending || isCancelled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <FaConciergeBell
                      size={20}
                      className={item.status === 'served' ? 'text-purple-500' : 'text-gray-400'}
                    />
                  </button>
                </div>
              </div>

              {/* Combo components list — unchanged */}
              {combo && <ComboComponentsList menuRecord={menuRecord} menuItemsMap={menuItemsMap} parentQuantity={item.quantity ?? 1}  />}

              {/* Addon rows — identified by "addon_" prefix on frontend_unique_key */}
              {/* Addon rows */}
              {addons.length > 0 && (
                <div className="mt-1 ml-1 space-y-0.5">
                  {addons.map((addon, ai) => {
                    const isAddonPending = pendingItemIds.has(addon.id);
                    const isAddonCancelled = isCancelledStatus(addon.status);
                    return (
                      <div key={addon.id || ai}
                        className="flex items-center gap-1.5 pl-3 border-l-2 border-blue-300 py-0.5">
                        <ChevronRight size={10} className="text-blue-400 flex-shrink-0" />
                        <span className="text-[11px] text-blue-700 font-medium leading-tight flex-1">
                          {addon.quantity} × {addon.item_name || 'Addon'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button type="button" disabled={isAddonPending || isAddonCancelled}
                            onClick={() => handleStatusClick(card.card_id, addon.id, KDS_CONFIG.STATUS.PENDING)}
                            className={`p-1 rounded hover:bg-gray-100 ${isAddonPending || isAddonCancelled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <FaClock size={14} className={addon.status === 'pending' ? 'text-blue-600' : 'text-gray-400'} />
                          </button>
                          <button type="button" disabled={isAddonPending || isAddonCancelled}
                            onClick={() => handleStatusClick(card.card_id, addon.id, KDS_CONFIG.STATUS.PREPARING)}
                            className={`p-1 rounded hover:bg-gray-100 ${isAddonPending || isAddonCancelled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <FaHourglassHalf size={14} className={addon.status === 'preparing' ? 'text-orange-500' : 'text-gray-400'} />
                          </button>
                          <button type="button" disabled={isAddonPending || isAddonCancelled}
                            onClick={() => handleStatusClick(card.card_id, addon.id, KDS_CONFIG.STATUS.READY)}
                            className={`p-1 rounded hover:bg-gray-100 ${isAddonPending || isAddonCancelled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <FaCheckCircle size={14} className={addon.status === 'ready' ? 'text-green-500' : 'text-gray-400'} />
                          </button>
                          <button type="button" disabled={isAddonPending || isAddonCancelled}
                            onClick={() => handleStatusClick(card.card_id, addon.id, KDS_CONFIG.STATUS.SERVED)}
                            title="Mark as Served"
                            className={`p-1 rounded hover:bg-gray-100 ${isAddonPending || isAddonCancelled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <FaConciergeBell size={14} className={addon.status === 'served' ? 'text-purple-500' : 'text-gray-400'} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Card footer — status label ── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
        <span className={`text-l font-semibold uppercase ${statusColorClass}`}>
          {allReady ? 'ready' : card.status}
        </span>
      </div>
    </div>
  );
};


// ─── Main KitchenDisplay component ────────────────────────────────────────────

const KitchenDisplay = ({clientId, token}) => {
  const [cards, setCards] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [menuItemsMap, setMenuItemsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [showAggregate, setShowAggregate] = useState(false);

  // ── Date filter ──────────────────────────────────────────────────────────
  // Defaults to today (live view). Selecting an earlier date switches the
  // page into a "missed orders" lookup mode: same hide-served filtering,
  // but no polling, since past orders don't change on their own.
  const todayStr = getTodayISTDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  // Stores the canonical item order (array of item ids) per card_id.
  // Persists across re-renders and poll ticks so item positions never shift.
  const itemOrderRef = useRef({});

  // ── FIX 1: track how many status updates are in-flight so polling never
  //    overwrites an optimistic update that hasn't reached the backend yet.
  const inflightUpdatesRef = useRef(0);

  // ── FIX 2: stable refs for clientId and token so fetchOrders never needs
  //    them in its useCallback dep array, preventing interval resets on re-render.
  const clientIdRef = useRef(clientId);
  const tokenRef = useRef(token);
  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  // Delete item modal state
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);  // { cardId, item }


  const hasFetchedStaticRef = useRef(false);

  useEffect(() => {
    if (!token || !clientId) return;
    if (hasFetchedStaticRef.current) return;
    hasFetchedStaticRef.current = true;

    const fetchStaticData = async () => {
      const { map: tablesMap } = await menuCache.fetchTables(clientId, token);
      setTablesMap(tablesMap);

      const { map: menuMap } = await menuCache.fetchMenuItems(clientId, token);
      setMenuItemsMap(menuMap);
    };

    fetchStaticData();
  }, [clientId, token]);

  // ─── Parse merged orders into per-sub-order cards ─────────────────────────

  const parseIntoCards = (mergedOrder) => {
    const subOrders = mergedOrder.sub_orders || [];

    // Group merged items by sub_order_id — preserve server-returned order
    const activeItems = (mergedOrder.items || []).filter((item) => !isCancelledStatus(item.status));

    const itemsBySubOrder = {};
    activeItems.forEach((item) => {
      const sid = item.sub_order_id;
      if (!itemsBySubOrder[sid]) itemsBySubOrder[sid] = [];
      itemsBySubOrder[sid].push(item);
    });

    // Fallback: no sub_orders metadata — treat entire group as one card
    if (subOrders.length === 0) {
      return [
        {
          card_id: mergedOrder.id,
          sub_order_id: mergedOrder.id,
          dinein_order_id: mergedOrder.dinein_order_id,
          root_dinein_order_id: mergedOrder.dinein_order_id,
          table_id: mergedOrder.table_id,
          status: mergedOrder.status || 'pending',
          created_at: mergedOrder.created_at,
          items: activeItems,
          is_sub_order: false,
        },
      ];
    }

    // One card per sub-order: sort strictly by created_at ascending
    return subOrders
      .slice()
      .filter((subOrder) => !isCancelledStatus(subOrder.status)) 
      .sort((a, b) => parseISTTimestamp(a.created_at || 0) - parseISTTimestamp(b.created_at || 0))
      .map((subOrder) => ({
        card_id: subOrder.id,
        sub_order_id: subOrder.id,
        dinein_order_id: subOrder.dinein_order_id,
        root_dinein_order_id: mergedOrder.dinein_order_id,
        table_id: mergedOrder.table_id,
        status: subOrder.status || 'pending',
        created_at: subOrder.created_at,
        items: itemsBySubOrder[subOrder.id] || [],
        is_sub_order: String(subOrder.dinein_order_id).includes('-'),
      }));
  };


  // ─── Fetch & poll orders ──────────────────────────────────────────────────────
  // ── FIX 2: empty dep array — fetchOrders is stable forever.
  //    clientId and token are read from refs so they're always current.
  //    selectedDate is also read from a ref for the same reason — changing the
  //    date shouldn't tear down/recreate the poll interval, it just changes
  //    what the next fetch (and the manual refetch below) filters for.

  const fetchOrders = useCallback(async () => {
    const clientId = clientIdRef.current;
    const token = tokenRef.current;
    const targetDateStr = selectedDateRef.current;

    if (!token || !clientId) {
      setLoading(false);
      return;
    }

    // ── FIX 1: Skip poll entirely while any status update is still in-flight.
    //    This is the core fix for the flickering issue — we never let a stale
    //    server response overwrite a fresh optimistic UI update.
    if (inflightUpdatesRef.current > 0) {
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Check again after the await — a user may have clicked in the meantime
      if (inflightUpdatesRef.current > 0) return;

      const allCards = [];

      (res.data?.data || []).forEach((mergedOrder) => {
        // Date filter using root created_at — matches whichever date is
        // currently selected (defaults to today).
        if (mergedOrder.status === 'draft') return;
        if (isCancelledStatus(mergedOrder.status)) return;
        const createdAt = mergedOrder.created_at;
        if (createdAt) {
          const orderDate = new Date(parseISTTimestamp(createdAt)).toLocaleDateString(KDS_CONFIG.DATE_FORMAT);
          if (orderDate !== targetDateStr) return;
        } else {
          // No created_at at all — can't place it on the selected date, skip.
          return;
        }

        // Skip fully-served groups (missed orders that were never served are
        // exactly what we still want to surface, on any date)
        if (mergedOrder.status === KDS_CONFIG.STATUS.SERVED) return;

        parseIntoCards(mergedOrder).forEach((card) => {
          if (!card.items || card.items.length === 0) return;
          if (isCancelledStatus(card.status)) return;
          if (
            card.items.length > 0 &&
            card.items.every((i) => i.status === KDS_CONFIG.STATUS.SERVED)
          ) return;
          allCards.push(card);
        });
      });

      // Sort all cards by created_at ascending so newest orders appear last
      allCards.sort((a, b) => parseISTTimestamp(a.created_at || 0) - parseISTTimestamp(b.created_at || 0));

      // Stabilise item order using a ref so positions survive refresh + navigation.
      // On first sight of a card, record item ids in server-arrival order.
      // On subsequent polls, reorder items to match that recorded order.
      const stableCards = allCards.map((incoming) => {
        const cardId = incoming.card_id;
        const incomingItemIds = incoming.items.map((i) => i.id);

        if (!itemOrderRef.current[cardId]) {
          // First time we see this card — lock in the server order as canonical
          itemOrderRef.current[cardId] = incomingItemIds;
        } else {
          // Merge: keep known order, append any genuinely new items at the end
          const lockedIds = itemOrderRef.current[cardId];
          const lockedSet = new Set(lockedIds);
          const incomingSet = new Set(incomingItemIds);

          // Drop ids that no longer exist on the server (deleted items)
          const prunedLocked = lockedIds.filter((id) => incomingSet.has(id));

          // Append brand-new item ids not yet in our locked list
          incomingItemIds.forEach((id) => {
            if (!lockedSet.has(id)) prunedLocked.push(id);
          });

          itemOrderRef.current[cardId] = prunedLocked;
        }

        // Build a lookup map then re-order items by the locked id sequence
        const itemById = {};
        incoming.items.forEach((i) => { itemById[i.id] = i; });
        const orderedItems = itemOrderRef.current[cardId]
          .filter((id) => itemById[id]) // skip ids that vanished
          .map((id) => itemById[id]);

        return { ...incoming, items: orderedItems };
      });

      // Clean up ref entries for cards that are no longer active
      const activeIds = new Set(allCards.map((c) => c.card_id));
      Object.keys(itemOrderRef.current).forEach((id) => {
        if (!activeIds.has(Number(id)) && !activeIds.has(id)) {
          delete itemOrderRef.current[id];
        }
      });

      setCards(stableCards);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []); // ── FIX 2: empty deps — stable forever, reads clientId/token/date from refs

  const hasFetchedOrdersRef = useRef(false);

  useEffect(() => {
    if (!clientId || !token) return;
    if (hasFetchedOrdersRef.current) return;
    hasFetchedOrdersRef.current = true;

    fetchOrders();
    const interval = setInterval(() => {
      // Only keep polling while looking at today — a past date is a static
      // "what did we miss" lookup, no need to hit the API every 10s for it.
      if (selectedDateRef.current === getTodayISTDateString()) {
        fetchOrders();
      }
    }, KDS_CONFIG.POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Whenever the user changes the date, do one immediate fetch for it
  // (don't wait for the next poll tick). Skipped on the very first render
  // since hasFetchedOrdersRef's effect above already covers that fetch.
  const isFirstDateRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstDateRenderRef.current) {
      isFirstDateRenderRef.current = false;
      return;
    }
    setLoading(true);
    fetchOrders();
  }, [selectedDate, fetchOrders]);

  // ─── Item status change ───────────────────────────────────────────────────────

  const handleItemStatusChange = async (cardId, itemId, newStatus) => {
    const card = cards.find((c) => c.card_id === cardId);
    if (!card) return;

    const targetItem = (card.items || []).find((i) => String(i.id) === String(itemId));
    if (!targetItem) return;

    const previousStatus = targetItem.status;

    const updatedItems = (card.items || []).map((i) =>
      String(i.id) === String(itemId) && !isCancelledStatus(i.status)
        ? { ...i, status: newStatus }
        : i
    );
    const derivedStatus = deriveStatus(updatedItems);

    setCards((prev) =>
      prev.map((c) =>
        c.card_id !== cardId
          ? c
          : { ...c, items: updatedItems, status: derivedStatus }
      )
    );

    inflightUpdatesRef.current += 1;

    try {
      const singleItemPayload = [{
        id: targetItem.id,
        item_id: targetItem.item_id,
        item_name: targetItem.item_name,
        quantity: targetItem.quantity,
        status: newStatus,
        note: targetItem.note || '',
        slug: targetItem.slug || '',
        unit_price: targetItem.unit_price || 0,
        line_total: (targetItem.unit_price || 0) * (targetItem.quantity || 1),
        client_id: clientIdRef.current,
        order_id: card.sub_order_id,
        frontend_unique_key: targetItem.frontend_unique_key || null,
        is_addon: false,
        parent_item_key: null,
      }];

      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientIdRef.current}/order_items/update?order_id=${card.sub_order_id}`,
        singleItemPayload,
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );

      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientIdRef.current}/dinein/update`,
        { id: card.sub_order_id, status: derivedStatus },
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );

      if (derivedStatus === KDS_CONFIG.STATUS.READY && card.status !== KDS_CONFIG.STATUS.READY) {
        window.dispatchEvent(
          new CustomEvent('orderCollect', {
            detail: {
              tableName: tablesMap[card.table_id] || KDS_CONFIG.DEFAULT_UNKNOWN_LABEL,
              orderId: card.sub_order_id,
            },
          })
        );
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update item status');
      setCards((prev) =>
        prev.map((c) => {
          if (c.card_id !== cardId) return c;
          const rolledBackItems  = c.items.map((i) =>
            String(i.id) === String(itemId) ? { ...i, status: previousStatus } : i
          );
          return { ...c, items: rolledBackItems, status: deriveStatus(rolledBackItems) };
        })
      );
    } finally {
      inflightUpdatesRef.current = Math.max(0, inflightUpdatesRef.current - 1);
    }
  };


  // ─── Filter cards (sort already applied at fetch time) ───────────────────────
  const filteredCards = cards
    .filter((card) => {
      if (orderFilter === KDS_CONFIG.FILTERS.ALL) return true;
      const tableName = tablesMap[card.table_id] || '';
      const isTakeaway = tableName.toLowerCase().includes('takeaway');
      if (orderFilter === KDS_CONFIG.FILTERS.TAKEAWAY) return isTakeaway;
      if (orderFilter === KDS_CONFIG.FILTERS.DINEIN) return !isTakeaway;
      return true;
    });

  const handleDateChange = (e) => {
    const value = e.target.value; // 'YYYY-MM-DD'
    if (!value) return;
    setSelectedDate(value);
  };

  const handleResetToToday = () => {
    setSelectedDate(getTodayISTDateString());
  };


  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen w-full bg-gray-50 text-gray-900">
        <div className="mx-auto p-6 lg:py-8">

          {/* ── Filter bar ── */}
          <div className="mb-3 overflow-x-auto">
            <div className="flex gap-2 items-center min-w-max">
              {ORDER_FILTER_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setOrderFilter(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${orderFilter === key
                     ? 'bg-action-primary text-text-white shadow-sm'
                     : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                    }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}

              <button
                onClick={() => setShowAggregate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all bg-purple-600 text-white hover:bg-purple-700 shadow-sm ml-2"
              >
                <BarChart2 size={16} />
                Aggregate View
                {filteredCards.length > 0 && (
                  <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                    {filteredCards.length}
                  </span>
                )}
              </button>

              {/* ── Date filter — defaults to today, lets staff look back for
                   missed orders on a previous date. Future dates disabled. ── */}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
                <div className="relative flex items-center">
                  <Calendar size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedDate}
                    max={todayStr}
                    onChange={handleDateChange}
                    className="pl-9 pr-3 py-2 rounded-lg font-medium text-sm border border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all focus:outline-none focus:ring-2 focus:ring-action-primary"
                  />
                </div>
                {!isToday && (
                  <button
                    onClick={handleResetToToday}
                    title="Back to today"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all bg-amber-100 text-amber-700 hover:bg-amber-200"
                  >
                    <RotateCcw size={14} />
                    Today
                  </button>
                )}
              </div>
            </div>
          </div>

          {!isToday && (
            <div className="mb-3 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
              Viewing missed orders from {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. Live updates are paused — switch back to "Today" to resume.
            </div>
          )}

          {/* ── Cards grid ── */}
          <div className="w-full">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-lg font-medium text-gray-500">Loading orders...</div>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-lg font-medium text-gray-400">
                  {isToday ? 'No active orders' : 'No missed orders found for this date'}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredCards.map((card) => (
                  <KitchenCard
                    key={card.card_id}
                    card={card}
                    tablesMap={tablesMap}
                    menuItemsMap={menuItemsMap}
                    onItemStatusChange={handleItemStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAggregate && (
        <AggregatePanel
          cards={filteredCards}
          tablesMap={tablesMap}
          onClose={() => setShowAggregate(false)}
        />
      )}
    </>
  );
};

export default KitchenDisplay;