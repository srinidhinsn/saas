import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Clock, Filter, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { menuCache } from '../../utils/Menu-utils/menuCache';
import { parseISTTimestamp } from '../../utils/dateRange';
import { getRentalStatus, parseRentalSlug } from '../../utils/Menu-utils/menuUtils';

const POLL_INTERVAL_MS = 15000;
const RENTAL_MARKER = '||RENTAL|';

const FILTERS = {
  ALL: 'ALL',
  ACTIVE: 'ACTIVE',
  OVERDUE: 'OVERDUE',
  RETURNED: 'RETURNED',
};

const FILTER_OPTIONS = [
  { key: FILTERS.ALL, label: 'All' },
  { key: FILTERS.ACTIVE, label: 'Active' },
  { key: FILTERS.OVERDUE, label: 'Overdue' },
  { key: FILTERS.RETURNED, label: 'Returned' },
];

const isRentalItem = (item) => (item.slug || '').includes(RENTAL_MARKER);

// Resolve a display status for one rental order item.
// Prefers the explicit item.status when it's already 'returned',
// otherwise derives active/overdue from the slug.
const resolveRentalStatus = (item) => {
  if ((item.status || '').toLowerCase() === 'returned') return 'returned';
  const slugStatus = getRentalStatus(item.slug);
  return slugStatus || 'active';
};

const formatCountdown = (dueEpoch) => {
  if (!dueEpoch) return null;
  const diff = dueEpoch - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff >= 0 ? `${label} left` : `${label} overdue`;
};

const STATUS_STYLES = {
  active: { badge: 'bg-blue-100 text-blue-700', border: 'border-l-blue-400', dot: 'bg-blue-500' },
  overdue: { badge: 'bg-red-100 text-red-700', border: 'border-l-red-500', dot: 'bg-red-500' },
  returned: { badge: 'bg-green-100 text-green-700', border: 'border-l-green-400', dot: 'bg-green-500' },
};

const RentalItemRow = ({ item, onReturn, isReturning }) => {
  const status = resolveRentalStatus(item);
  const style = STATUS_STYLES[status] || STATUS_STYLES.active;
  const parsed = parseRentalSlug ? parseRentalSlug(item.slug) : null;
  const countdown = parsed?.dueEpoch ? formatCountdown(parsed.dueEpoch) : null;

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border-l-4 bg-white shadow-sm ${style.border}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 truncate">{item.item_name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${style.badge}`}>
            {status}
          </span>
          {countdown && (
            <span className="text-[11px] text-gray-500 flex items-center gap-1">
              <Clock size={11} /> {countdown}
            </span>
          )}
          <span className="text-[11px] text-gray-400">× {item.quantity}</span>
        </div>
      </div>

      {status !== 'returned' && (
        <button
          onClick={() => onReturn(item.id)}
          disabled={isReturning}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
            ${isReturning
              ? 'text-gray-400 border-gray-200 cursor-not-allowed'
              : 'text-green-700 border-green-300 bg-green-50 hover:bg-green-100'}`}
        >
          {isReturning ? 'Returning…' : 'Mark Returned'}
        </button>
      )}
      {status === 'returned' && (
        <CheckCircle2 size={18} className="text-green-500 shrink-0" />
      )}
    </div>
  );
};

const RentalCard = ({ card, tableLabel, onReturn, returningIds }) => {
  const hasOverdue = card.items.some(i => resolveRentalStatus(i) === 'overdue');
  return (
    <div className="rounded-xl shadow-md overflow-hidden border border-gray-200 bg-white flex flex-col">
      <div className={`flex items-center justify-between px-4 py-3 text-white ${hasOverdue ? 'bg-red-600' : 'bg-action-primary'}`}>
        <span className="text-sm md:text-base font-semibold">{tableLabel}</span>
        <span className="text-sm font-semibold opacity-90">#{card.dinein_order_id}</span>
        {hasOverdue && <AlertTriangle size={16} className="text-yellow-200" />}
      </div>
      <div className="p-3 space-y-2">
        {card.items.map(item => (
          <RentalItemRow
            key={item.id}
            item={item}
            onReturn={onReturn}
            isReturning={returningIds.has(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

const RentalTrackingDisplay = ({ clientId, token }) => {
  const [cards, setCards] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(FILTERS.ALL);
  const [returningIds, setReturningIds] = useState(new Set());

  const clientIdRef = useRef(clientId);
  const tokenRef = useRef(token);
  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    if (!clientId || !token) return;
    menuCache.fetchTables(clientId, token).then(({ map }) => setTablesMap(map));
  }, [clientId, token]);

  const fetchRentalOrders = useCallback(async () => {
    const cId = clientIdRef.current;
    const tok = tokenRef.current;
    if (!cId || !tok) { setLoading(false); return; }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${cId}/dinein/table`,
        { headers: { Authorization: `Bearer ${tok}` } }
      );
      const allOrders = res.data?.data || [];
      const built = [];

      allOrders.forEach(order => {
        const status = (order.status || '').toLowerCase();
        if (status === 'draft' || status === 'cancelled') return;

        const rentalItems = (order.items || []).filter(
          item => isRentalItem(item) && (item.status || '').toLowerCase() !== 'cancelled'
        );
        if (rentalItems.length === 0) return;

        built.push({
          card_id: order.id,
          dinein_order_id: order.dinein_order_id,
          table_id: order.table_id,
          created_at: order.created_at,
          items: rentalItems,
        });
      });

      built.sort((a, b) => parseISTTimestamp(b.created_at || 0) - parseISTTimestamp(a.created_at || 0));
      setCards(built);
    } catch (err) {
      console.error('[RentalTrackingDisplay] fetch failed:', err);
      toast.error('Failed to load rental orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRentalOrders();
    const interval = setInterval(fetchRentalOrders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRentalOrders]);

  const handleReturn = async (orderItemId) => {
    if (returningIds.has(orderItemId)) return;
    setReturningIds(prev => new Set(prev).add(orderItemId));

    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientIdRef.current}/order_item/delete`,
        { params: { order_item_id: orderItemId }, headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );
      const {
        late_fee: lateFee = 0,
        item_id,
        availability,
        stock_restored,
        skipped_reason,
      } = res.data?.data || {};

      if (item_id != null && availability != null) {
        menuCache.patchAvailability(clientIdRef.current, { [item_id]: availability });
      }

      if (stock_restored) {
        toast.success(lateFee > 0 ? `Returned — late fee ₹${lateFee} added.` : 'Item returned.');
      } else {
        toast.warn(`Item marked returned, but stock was NOT auto-restored. ${skipped_reason || ''}`, { autoClose: 8000 });
      }

      // Optimistically flip status locally, then refresh from server
      setCards(prev => prev.map(card => ({
        ...card,
        items: card.items.map(i => i.id === orderItemId ? { ...i, status: 'returned' } : i),
      })));
      await fetchRentalOrders();
    } catch (err) {
      console.error('[RentalTrackingDisplay] return failed:', err);
      if (err.response?.status === 409) {
        toast.info('This item was already marked as returned.');
      } else {
        toast.error('Failed to mark item returned.');
      }
    } finally {
      setReturningIds(prev => {
        const next = new Set(prev);
        next.delete(orderItemId);
        return next;
      });
    }
  };

  const filteredCards = cards
    .map(card => {
      if (filter === FILTERS.ALL) return card;
      const items = card.items.filter(i => resolveRentalStatus(i).toUpperCase() === filter);
      return { ...card, items };
    })
    .filter(card => card.items.length > 0);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <div className="mx-auto p-6 lg:py-8">

        <div className="mb-4 flex items-center gap-2">
          <RotateCcw size={20} className="text-action-primary" />
          <h1 className="text-xl font-bold">Rental Tracking</h1>
        </div>

        <div className="mb-4 flex gap-2 items-center">
          <Filter size={16} className="text-gray-400" />
          {FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${filter === key
                  ? 'bg-action-primary text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:text-gray-800'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg font-medium text-gray-500">Loading rentals…</div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg font-medium text-gray-400">No rental items to show</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCards.map(card => (
              <RentalCard
                key={card.card_id}
                card={card}
                tableLabel={tablesMap[card.table_id] || `Order #${card.card_id}`}
                onReturn={handleReturn}
                returningIds={returningIds}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RentalTrackingDisplay;