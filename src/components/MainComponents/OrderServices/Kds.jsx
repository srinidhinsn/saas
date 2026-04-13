import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaCheckCircle, FaClock, FaHourglassHalf } from 'react-icons/fa';
import { Filter, Clock, Users, Package, Truck, Trash2, BarChart2, X, ChevronRight } from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────

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
    READY: 'ready',
    SERVED: 'served',
  },
  TAKEAWAY_TABLE_IDS: [500],
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

// ─── Elapsed time ──────────────────────────────────────────────────────────────

const calculateElapsedTime = (createdAt) => {
  if (!createdAt) return null;
  const utcString =
    typeof createdAt === 'string'
      ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
      : createdAt;
  const diffMs = Date.now() - new Date(utcString).getTime();
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
  const { PENDING, PREPARING, READY } = KDS_CONFIG.STATUS;
  const activeItems = (items || []).filter((item) => {
    const status = String(item?.status || '').toLowerCase();
    return status !== 'cancelled' && status !== 'canceled';
  });
  if (!activeItems.length) return PENDING;
  if (activeItems.some((i) => i.status === PENDING)) return PENDING;
  if (activeItems.some((i) => i.status === PREPARING)) return PREPARING;
  if (activeItems.every((i) => i.status === READY || i.status === KDS_CONFIG.STATUS.SERVED)) return READY;
  return PENDING;
};

const isCancelledStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'cancelled' || normalized === 'canceled';
};

const minutesElapsed = (createdAt) => {
  if (!createdAt) return 0;
  const utcString =
    typeof createdAt === 'string'
      ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
      : createdAt;
  return Math.floor((Date.now() - new Date(utcString).getTime()) / 60000);
};

// ─── Helper: is this order item a combo? ──────────────────────────────────────
// Requires BOTH category_id === 'Combos' AND line_item_id present.
// Addons also carry line_item_id so checking only line items is not enough.

const isComboItem = (orderItem, menuRecord) => {
  if (orderItem?.is_addon) return false;
  if (!menuRecord) return false;

  // Must have category_id matching 'Combos' — this is what separates combos
  // from addons, which also carry line_item_id but belong to a different category.
  const isComboCategoryId =
    String(menuRecord.category_id || '').toLowerCase() ===
    KDS_CONFIG.COMBO_CATEGORY_ID.toLowerCase();

  // Must also have line items to actually display
  const hasLineItems =
    Array.isArray(menuRecord.line_item_id) && menuRecord.line_item_id.length > 0;

  // AND — both conditions required
  return isComboCategoryId && hasLineItems;
};

// ─── Modals ────────────────────────────────────────────────────────────────────

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
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">Remove</button>
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
};

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
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">Yes</button>
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">No</button>
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
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
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

const ComboComponentsList = ({ menuRecord, menuItemsMap }) => {
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
              {comp.name || comp.item_name || `Item #${comp.id}`}
            </span>
          </div>
        ))
      ) : (
        // IDs present but not resolved in map — show count as safe fallback
        <div className="pl-3 border-l-2 border-violet-200 py-0.5">
          <span className="text-[11px] text-violet-500 font-medium">
            {componentIds.length} included item{componentIds.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── KDS card ─────────────────────────────────────────────────────────────────

const groupItemsWithAddons = (items) => {
  const grouped = [];

  const mainItems = (items || []).filter(
    (item) => !item.parent_item_key
  );

  mainItems.forEach((main) => {
    const addons = (items || []).filter(
      (item) =>
        item.parent_item_key &&
        item.parent_item_key.startsWith(`${main.item_id}_`)
    );

    grouped.push({
      main,
      addons,
    });
  });

  return grouped;
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
    card.items.every((i) => i.status === KDS_CONFIG.STATUS.READY);

  const statusColorClass =
    allReady
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
      <div className="flex items-center justify-between px-4 py-3 bg-action-primary text-white">
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

      {/* ── Card body — item list ── */}
      <div className="bg-bg-primary px-4 py-4 space-y-3 flex-1">
        {groupItemsWithAddons(card.items).map(({ main, addons }, idx) => {
          const item = main;
          const menuRecord =
            menuItemsMap[Number(item.item_id)] || menuItemsMap[String(item.item_id)];

          // Use category_name === 'Combos' as the primary signal (your requirement)
          const combo = isComboItem(item, menuRecord);
          const isPending = pendingItemIds.has(item.id);
          const isCancelled = isCancelledStatus(item.status);

          return (
            <div key={item.id || idx} className="flex flex-col w-full rounded-lg bg-white">
              <div className="flex items-center w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">
                      <span className="mr-1">{item.quantity} x</span>
                      <span>{item.item_name || 'Unnamed Item'}</span>
                    </span>
                    {/* Combo badge */}
                    {combo && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.5 rounded-full leading-none">
                        COMBO
                      </span>
                    )}
                  </div>
                </div>

                {/* Status buttons */}
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
                </div>
              </div>

              {/* Combo line items — always visible, indented below the main item */}
              {combo && (
                <ComboComponentsList
                  menuRecord={menuRecord}
                  menuItemsMap={menuItemsMap}
                />
              )}

              {addons.length > 0 && (
                <div className="mt-1.5 ml-1 space-y-0.5">
                  {addons.map((addon, addonIdx) => (
                    <div
                      key={addon.id || addonIdx}
                      className="flex items-center gap-1.5 pl-3 border-l-2 border-blue-300 py-0.5"
                    >
                      <ChevronRight size={10} className="text-blue-400 flex-shrink-0" />
                      <span className="text-[11px] text-blue-700 font-medium leading-tight">
                        {addon.quantity} x {addon.item_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Card footer ── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
        <span className={`text-l font-semibold uppercase ${statusColorClass}`}>
          {allReady ? 'ready' : card.status}
        </span>
      </div>
    </div>
  );
};

// ─── Main KitchenDisplay component ────────────────────────────────────────────

const KitchenDisplay = () => {
  const { clientId } = useParams();
  const token = localStorage.getItem('access_token');

  const [cards, setCards] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [menuItemsMap, setMenuItemsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [showAggregate, setShowAggregate] = useState(false);

  const itemOrderRef = useRef({});

  // ── FIX 1: track how many status updates are in-flight so polling never
  //    overwrites an optimistic update that hasn't reached the backend yet.
  const inflightUpdatesRef = useRef(0);

  const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // ─── Fetch tables ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token || !clientId) return;
    axios
      .get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const map = {};
        (res.data?.data || []).forEach((t) => (map[t.id] = t.name));
        setTablesMap(map);
      })
      .catch(() => toast.error('Failed to fetch tables'));
  }, [clientId, token]);

  // ─── Fetch menu items (inventory) ─────────────────────────────────────────

  useEffect(() => {
    if (!token || !clientId) return;
    axios
      .get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const map = {};
        (res.data?.data || []).forEach((item) => {
          map[Number(item.id)] = item;
          map[String(item.id)] = item;
        });
        setMenuItemsMap(map);
      })
      .catch((err) => {
        console.warn('[KDS] Failed to fetch inventory for combo lookup:', err);
      });
  }, [clientId, token]);

  // ─── Also try the richer menu/read endpoint ───────────────────────────────

  useEffect(() => {
    if (!token || !clientId) return;
    axios
      .get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { inventory_id: 'menu' },
      })
      .then((res) => {
        const map = {};
        (res.data?.data || []).forEach((item) => {
          map[Number(item.id)] = item;
          map[String(item.id)] = item;
        });
        setMenuItemsMap((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {
        // Silent — inventory/read fallback is sufficient
      });
  }, [clientId, token]);

  // ─── Parse merged orders into per-sub-order cards ─────────────────────────

  const parseIntoCards = (mergedOrder) => {
    const subOrders = mergedOrder.sub_orders || [];

    const activeItems = (mergedOrder.items || []).filter((item) => !isCancelledStatus(item.status));

    const itemsBySubOrder = {};
    activeItems.forEach((item) => {
      const sid = item.sub_order_id;
      if (!itemsBySubOrder[sid]) itemsBySubOrder[sid] = [];
      itemsBySubOrder[sid].push(item);
    });

    if (subOrders.length === 0) {
      return [{
        card_id: mergedOrder.id,
        sub_order_id: mergedOrder.id,
        dinein_order_id: mergedOrder.dinein_order_id,
        root_dinein_order_id: mergedOrder.dinein_order_id,
        table_id: mergedOrder.table_id,
        status: mergedOrder.status || 'pending',
        created_at: mergedOrder.created_at,
        items: activeItems,
        is_sub_order: false,
      }];
    }

    return subOrders
      .slice()
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
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

  // ─── Fetch & poll orders ───────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    if (!token || !clientId) { setLoading(false); return; }

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

      const today = new Date().toLocaleDateString(KDS_CONFIG.DATE_FORMAT);
      const allCards = [];

      (res.data?.data || []).forEach((mergedOrder) => {
        if (mergedOrder.status === 'draft') return;
        const createdAt = mergedOrder.created_at;
        if (createdAt) {
          const utc = typeof createdAt === 'string'
            ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
            : createdAt;
          if (new Date(utc).toLocaleDateString(KDS_CONFIG.DATE_FORMAT) !== today) return;
        }

        if (mergedOrder.status === KDS_CONFIG.STATUS.SERVED) return;

        parseIntoCards(mergedOrder).forEach((card) => {
          if (!card.items || card.items.length === 0) return;
          if (
            card.items.length > 0 &&
            card.items.every((i) => i.status === KDS_CONFIG.STATUS.SERVED)
          ) return;
          allCards.push(card);
        });
      });

      allCards.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

      // Stabilise item order across polls
      const stableCards = allCards.map((incoming) => {
        const cardId = incoming.card_id;
        const incomingItemIds = incoming.items.map((i) => i.id);

        if (!itemOrderRef.current[cardId]) {
          itemOrderRef.current[cardId] = incomingItemIds;
        } else {
          const lockedIds = itemOrderRef.current[cardId];
          const lockedSet = new Set(lockedIds);
          const incomingSet = new Set(incomingItemIds);
          const prunedLocked = lockedIds.filter((id) => incomingSet.has(id));
          incomingItemIds.forEach((id) => { if (!lockedSet.has(id)) prunedLocked.push(id); });
          itemOrderRef.current[cardId] = prunedLocked;
        }

        const itemById = {};
        incoming.items.forEach((i) => { itemById[i.id] = i; });
        const orderedItems = itemOrderRef.current[cardId]
          .filter((id) => itemById[id])
          .map((id) => itemById[id]);

        return { ...incoming, items: orderedItems };
      });

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
  }, [clientId, token]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, KDS_CONFIG.POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ─── Item status change ────────────────────────────────────────────────────
  // FIX 1 — three-step pattern used in production KDS systems:
  //   1. Optimistic local state update (instant UI feedback)
  //   2. Increment in-flight counter (blocks polls)
  //   3. Fire API call; decrement counter when done
  // This means the kitchen staff sees the change immediately and the next poll
  // only runs after the round-trip completes, so stale data never overwrites.

  const handleItemStatusChange = async (cardId, itemId, newStatus) => {
    const card = cards.find((c) => c.card_id === cardId);
    if (!card) return;

    const targetItem = (card.items || []).find((i) => String(i.id) === String(itemId));
    if (!targetItem) return;

    const previousStatus = targetItem.status;

    // Build the full updated items list for local state + deriving order status.
    // We do NOT send this full list to the backend — only the changed item goes,
    // so sibling items' statuses are never touched on the server.
    const updatedItems = (card.items || []).map((i) =>
      String(i.id) === String(itemId) ? { ...i, status: newStatus } : i
    );
    const derivedStatus = deriveStatus(updatedItems);

    // Step 1 — optimistic update (instant, local only)
    setCards((prev) =>
      prev.map((c) =>
        c.card_id !== cardId
          ? c
          : { ...c, items: updatedItems, status: derivedStatus }
      )
    );

    // Step 2 — block the polling loop while this request is in-flight
    inflightUpdatesRef.current += 1;

    try {
      // ── KEY FIX: send ONLY the single changed item in the payload.
      //    Sending all items was writing every sibling's stale status back to the
      //    backend, resetting them to whatever the JS closure had at click time.
      const linkedItems = (card.items || []).filter((i) => {
        if (String(i.id) === String(itemId)) return true;

        return (
          i.parent_item_key &&
          i.parent_item_key.startsWith(`${targetItem.item_id}_`)
        );
      });

      const singleItemPayload = linkedItems.map((linked) => ({
        id: linked.id,
        item_id: linked.item_id,
        item_name: linked.item_name,
        quantity: linked.quantity,
        status: newStatus,
        note: linked.note || '',
        slug: linked.slug || '',
        unit_price: linked.unit_price || 0,
        line_total: (linked.unit_price || 0) * (linked.quantity || 1),
        client_id: clientId,
        order_id: card.sub_order_id,
        frontend_unique_key: linked.frontend_unique_key || null,
        is_addon: linked.is_addon || false,
        parent_item_key: linked.parent_item_key || null,
      }));

      // Fire both API calls in parallel — faster round-trip
      await Promise.all([
        axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${card.sub_order_id}`,
          singleItemPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
          { id: card.sub_order_id, status: derivedStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

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

      // Roll back only the one item that failed — restore its previous status
      setCards((prev) =>
        prev.map((c) => {
          if (c.card_id !== cardId) return c;
          const rolledBackItems = c.items.map((i) =>
            String(i.id) === String(itemId) ? { ...i, status: previousStatus } : i
          );
          return { ...c, items: rolledBackItems, status: deriveStatus(rolledBackItems) };
        })
      );
    } finally {
      // Step 3 — unblock the polling loop
      inflightUpdatesRef.current = Math.max(0, inflightUpdatesRef.current - 1);
    }
  };

  // ─── Filter cards ──────────────────────────────────────────────────────────

  const filteredCards = cards.filter((card) => {
    if (orderFilter === KDS_CONFIG.FILTERS.ALL) return true;
    const isTakeaway = KDS_CONFIG.TAKEAWAY_TABLE_IDS.includes(Number(card.table_id));
    if (orderFilter === KDS_CONFIG.FILTERS.TAKEAWAY) return isTakeaway;
    if (orderFilter === KDS_CONFIG.FILTERS.DINEIN) return !isTakeaway;
    return true;
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen w-full bg-gray-50 text-gray-900">
        <div className="mx-auto p-6 lg:py-8">

          {/* ── Filter + Aggregate bar ── */}
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
            </div>
          </div>

          {/* ── Cards grid ── */}
          <div className="w-full">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-lg font-medium text-gray-500">Loading orders...</div>
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