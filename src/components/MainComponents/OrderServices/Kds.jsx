import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaCheckCircle, FaClock, FaHourglassHalf } from 'react-icons/fa';
import { Filter, Clock, Users, Package, Truck, Trash2 } from 'lucide-react';


// ─── Constants ─────────────────────────────────────────────────────────────────


const ORDER_FILTER_OPTIONS = [
  { key: 'ALL',      label: 'All Orders', Icon: Filter },
  { key: 'DINEIN',   label: 'Dine-In',    Icon: Users  },
  { key: 'TAKEAWAY', label: 'Takeaway',   Icon: Package },
  { key: 'DELIVERY', label: 'Delivery',   Icon: Truck  },
];


// ─── Elapsed time helper ───────────────────────────────────────────────────────

const calculateElapsedTime = (createdAt) => {
  if (!createdAt) return null;

  const utcString =
    typeof createdAt === 'string'
      ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
      : createdAt;

  const diffMs = Date.now() - new Date(utcString).getTime();
  if (diffMs < 0) return 'Just now';

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes      = Math.floor(totalSeconds / 60);
  const hours        = Math.floor(minutes / 60);
  const days         = Math.floor(hours / 24);

  if (totalSeconds < 60) return 'Just now';
  if (minutes === 1)     return '1 min ago';
  if (minutes < 60)      return `${minutes} mins ago`;
  if (hours === 1)       return '1 hr ago';
  if (hours < 24)        return `${hours} hrs ago`;
  if (days === 1)        return '1 day ago';
  return `${days} days ago`;
};


// ─── Derive card-level status from its items ───────────────────────────────────

const deriveStatus = (items) => {
  if (!items?.length)                            return 'pending';
  if (items.some((i) => i.status === 'pending')) return 'pending';
  if (items.some((i) => i.status === 'preparing')) return 'preparing';
  if (items.every((i) => i.status === 'served')) return 'ready';
  return 'pending';
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


// ─── Item status icon button ───────────────────────────────────────────────────

const ItemStatusButton = ({ status, activeStatus, onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
  >
    {React.cloneElement(children, {
      size:      20,
      className: status === activeStatus ? children.props.activeClass : 'text-gray-500',
    })}
  </button>
);


// ─── KDS card ─────────────────────────────────────────────────────────────────

const KitchenCard = ({
  card,
  tablesMap,
  onItemStatusChange,
  onDeleteItem,
}) => {
  const elapsedTime = card.created_at ? calculateElapsedTime(card.created_at) : null;

  const statusColorClass =
    card.status === 'pending'
      ? 'text-blue-600'
      : card.status === 'preparing'
      ? 'text-orange-600'
      : card.status === 'ready'
      ? 'text-green-600'
      : '';

  return (
    <div className="rounded-xl shadow-md overflow-hidden border border-gray-200 bg-white transition-transform transform hover:-translate-y-0.5 flex flex-col">

      {/* ── Card header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-action-primary text-text-white">
        <div className="flex items-center justify-between w-full">

          {/* Table name */}
          <span className="text-sm md:text-base font-semibold">
            {tablesMap[card.table_id] || `T-${card.table_id}`}
          </span>

          {/* Elapsed timer */}
          <div className="flex items-center justify-center gap-2 text-xl font-semibold text-text-white">
            <Clock size={16} className="text-text-white" />
            <span>{elapsedTime}</span>
          </div>

          {/* Order ID + sub-order label */}
          <div className="flex flex-col items-end">
            <span className="text-xl font-semibold text-orange-100/80">
              #{card.dinein_order_id}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card body — item list ── */}
      <div className="bg-bg-primary px-4 py-4 space-y-3 flex-1">
        {(card.items || []).map((item, idx) => (
          <div
            key={item.id || idx}
            className="flex items-center w-full rounded-lg bg-white"
          >
            {/* Item name + quantity */}
            <div className="flex-1">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">
                  <span className="mr-2">{item.quantity} x</span>
                  <span>{item.item_name || 'Unnamed Item'}</span>
                </span>
              </div>
            </div>

            {/* Status action buttons */}
            <div className="flex items-center gap-1 ml-3">
              <button
                type="button"
                onClick={() => onItemStatusChange(card.card_id, item.id, 'pending')}
                title="Mark as Pending"
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <FaClock
                  size={20}
                  className={item.status === 'pending' ? 'text-blue-600' : 'text-gray-400'}
                />
              </button>

              <button
                type="button"
                onClick={() => onItemStatusChange(card.card_id, item.id, 'preparing')}
                title="Mark as Preparing"
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <FaHourglassHalf
                  size={20}
                  className={item.status === 'preparing' ? 'text-orange-500' : 'text-gray-400'}
                />
              </button>

              <button
                type="button"
                onClick={() => onItemStatusChange(card.card_id, item.id, 'served')}
                title="Mark as Ready"
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <FaCheckCircle
                  size={20}
                  className={item.status === 'served' ? 'text-green-500' : 'text-gray-400'}
                />
              </button>

              {/* ── Requirement 2: Per-item delete button ── */}
              <button
                type="button"
                onClick={() => onDeleteItem(card.card_id, item)}
                title="Remove item"
                className="p-2 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} className="text-red-400 hover:text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Card footer — status label ── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
        <span className={`text-l font-semibold uppercase ${statusColorClass}`}>
          {card.status}
        </span>
      </div>
    </div>
  );
};


// ─── Main KitchenDisplay component ────────────────────────────────────────────

const KitchenDisplay = () => {
  const { clientId } = useParams();
  const token = localStorage.getItem('access_token');

  // cards = array of { card_id, sub_order_id, dinein_order_id, table_id, status, created_at, items[] }
  const [cards, setCards]                   = useState([]);
  const [tablesMap, setTablesMap]           = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [orderFilter, setOrderFilter]       = useState('ALL');

  // Delete order modal state
  const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
  const [cardToDelete, setCardToDelete]                 = useState(null);

  // Delete item modal state
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [itemToDelete, setItemToDelete]               = useState(null);  // { cardId, item }


  // ─── Fetch tables ────────────────────────────────────────────────────────────

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


  // ─── Fetch inventory ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token || !clientId) return;
    axios
      .get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setInventoryItems(res.data?.data || []);
      })
      .catch(() => toast.error('Failed to fetch inventory'));
  }, [clientId, token]);


  // ─── Parse /dinein/table merged response into per-sub-order cards ─────────────
  //
  // Backend _merge_group() returns one merged entry per table group with:
  //   item.batch_label  = the sub-order's dinein_order_id ("1001" or "1001-2")
  //   item.sub_order_id = the DB pk of that sub-order row
  //   sub_orders[]      = [{id, dinein_order_id, created_at, status, total_price}, ...]
  //
  // We split merged items back into individual per-sub-order cards for the KDS.

  const parseIntoCards = (mergedOrder) => {
    const subOrders = mergedOrder.sub_orders || [];

    // Group merged items by sub_order_id
    const itemsBySubOrder = {};
    (mergedOrder.items || []).forEach((item) => {
      const sid = item.sub_order_id;
      if (!itemsBySubOrder[sid]) itemsBySubOrder[sid] = [];
      itemsBySubOrder[sid].push(item);
    });

    // Fallback: no sub_orders metadata — treat entire group as one card
    if (subOrders.length === 0) {
      return [
        {
          card_id:              mergedOrder.id,
          sub_order_id:         mergedOrder.id,
          dinein_order_id:      mergedOrder.dinein_order_id,
          root_dinein_order_id: mergedOrder.dinein_order_id,
          table_id:             mergedOrder.table_id,
          status:               mergedOrder.status || 'pending',
          created_at:           mergedOrder.created_at,
          items:                mergedOrder.items || [],
          is_sub_order:         false,
        },
      ];
    }

    // One card per sub-order: root first, then chronological sub-orders
    return subOrders
      .slice()
      .sort((a, b) => {
        const aIsRoot = !String(a.dinein_order_id).includes('-');
        const bIsRoot = !String(b.dinein_order_id).includes('-');
        if (aIsRoot !== bIsRoot) return aIsRoot ? -1 : 1;
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      })
      .map((subOrder) => ({
        card_id:              subOrder.id,
        sub_order_id:         subOrder.id,
        dinein_order_id:      subOrder.dinein_order_id,
        root_dinein_order_id: mergedOrder.dinein_order_id,
        table_id:             mergedOrder.table_id,
        status:               subOrder.status || 'pending',
        created_at:           subOrder.created_at,
        items:                itemsBySubOrder[subOrder.id] || [],
        is_sub_order:         String(subOrder.dinein_order_id).includes('-'),
      }));
  };


  // ─── Fetch & poll orders ──────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    if (!token || !clientId) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const today    = new Date().toLocaleDateString('en-CA');
      const allCards = [];

      (res.data?.data || []).forEach((mergedOrder) => {
        // Date filter using root created_at
        const createdAt = mergedOrder.created_at;
        if (createdAt) {
          const utc = typeof createdAt === 'string'
            ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
            : createdAt;
          const orderDate = new Date(utc).toLocaleDateString('en-CA');
          if (orderDate !== today) return;
        }

        // Skip fully-served groups
        if (mergedOrder.status === 'served') return;

        parseIntoCards(mergedOrder).forEach((card) => {
          // Skip cards where every item is already served
          if (card.items.length > 0 && card.items.every((i) => i.status === 'served')) return;
          allCards.push(card);
        });
      });

      setCards(allCards);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);


  // ─── Item status change ───────────────────────────────────────────────────────

  const handleItemStatusChange = async (cardId, itemId, newStatus) => {
    const card = cards.find((c) => c.card_id === cardId);
    if (!card) return;

    const updatedItems  = (card.items || []).map((i) =>
      String(i.id) === String(itemId) ? { ...i, status: newStatus } : i
    );
    const derivedStatus = deriveStatus(updatedItems);

    try {
      // Update all item statuses for this sub-order
      const payload = updatedItems.map((item) => ({
        id:                  item.id,
        item_id:             item.item_id,
        item_name:           item.item_name,
        quantity:            item.quantity,
        status:              item.status,
        note:                item.note || '',
        slug:                item.slug || '',
        unit_price:          item.unit_price || 0,
        line_total:          (item.unit_price || 0) * (item.quantity || 1),
        client_id:           clientId,
        order_id:            card.sub_order_id,
        frontend_unique_key: item.frontend_unique_key || null,
      }));

      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${card.sub_order_id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update the sub-order's overall status
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: card.sub_order_id, status: derivedStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Notify when order moves to ready
      if (derivedStatus === 'ready' && card.status !== 'ready') {
        window.dispatchEvent(
          new CustomEvent('orderCollect', {
            detail: {
              tableName: tablesMap[card.table_id] || 'Unknown',
              orderId:   card.sub_order_id,
            },
          })
        );
      }

      // Optimistic UI update
      setCards((prev) =>
        prev.map((c) =>
          c.card_id !== cardId
            ? c
            : { ...c, items: updatedItems, status: derivedStatus }
        )
      );

      // Remove card once all items are served
      if (derivedStatus === 'ready' && updatedItems.every((i) => i.status === 'served')) {
        setCards((prev) => prev.filter((c) => c.card_id !== cardId));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update item status');
    }
  };


  // ─── Delete individual item from an order (Requirement 2) ─────────────────────

  const handleDeleteItem = (cardId, item) => {
    setItemToDelete({ cardId, item });
    setShowDeleteItemModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    const { cardId, item } = itemToDelete;
    const card = cards.find((c) => c.card_id === cardId);
    if (!card) {
      setShowDeleteItemModal(false);
      setItemToDelete(null);
      return;
    }

    const remainingItems = (card.items || []).filter(
      (i) => String(i.id) !== String(item.id)
    );
    const isLastItem = remainingItems.length === 0;

    try {
      // Always delete the order item record
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
        {
          params:  { order_item_id: item.id },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Requirement 2: if this was the last item in the card, also delete
      // the parent dinein order row so it doesn't linger as an empty record.
      if (isLastItem) {
        await axios.delete(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
          {
            params:  { dinein_order_id: card.sub_order_id, client_id: clientId },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Remove the entire card from the KDS view
        setCards((prev) => prev.filter((c) => c.card_id !== cardId));
      } else {
        // Update the card with remaining items and recalculate status
        setCards((prev) =>
          prev.map((c) =>
            c.card_id !== cardId
              ? c
              : { ...c, items: remainingItems, status: deriveStatus(remainingItems) }
          )
        );
      }

      toast.success(
        isLastItem
          ? `"${item.item_name}" removed — empty order also deleted`
          : `"${item.item_name}" removed from order`
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove item');
    } finally {
      setShowDeleteItemModal(false);
      setItemToDelete(null);
    }
  };


  // ─── Delete entire order ──────────────────────────────────────────────────────

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        {
          params:  { dinein_order_id: cardToDelete.sub_order_id, client_id: clientId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!cardToDelete.is_sub_order) {
        // Root delete → backend also removes all sub-orders; remove them from UI too
        const prefix = String(cardToDelete.dinein_order_id) + '-';
        setCards((prev) =>
          prev.filter(
            (c) =>
              c.card_id !== cardToDelete.card_id &&
              !String(c.dinein_order_id || '').startsWith(prefix)
          )
        );
      } else {
        setCards((prev) => prev.filter((c) => c.card_id !== cardToDelete.card_id));
      }

      toast.success('Order deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete order');
    } finally {
      setShowDeleteOrderModal(false);
      setCardToDelete(null);
    }
  };


  // ─── Filter + sort cards ──────────────────────────────────────────────────────

  const filteredCards = cards
    .filter((card) => {
      if (orderFilter === 'ALL') return true;
      const isTakeaway = Number(card.table_id) === 500;
      if (orderFilter === 'TAKEAWAY') return isTakeaway;
      if (orderFilter === 'DINEIN')   return !isTakeaway;
      return true;
    })


  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen w-full bg-gray-50 text-gray-900">
        <div className="mx-auto p-6 lg:py-8">

          {/* ── Filter bar ── */}
          <div className="mb-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {ORDER_FILTER_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setOrderFilter(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    orderFilter === key
                      ? 'bg-action-primary text-text-white shadow-sm'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
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
                    onItemStatusChange={handleItemStatusChange}
                    onDeleteItem={handleDeleteItem}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete item modal ── */}
      <DeleteItemModal
        isOpen={showDeleteItemModal}
        itemName={itemToDelete?.item?.item_name}
        onClose={() => {
          setShowDeleteItemModal(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteItem}
      />

      {/* ── Delete order modal ── */}
      <DeleteOrderModal
        isOpen={showDeleteOrderModal}
        cardToDelete={cardToDelete}
        onClose={() => {
          setShowDeleteOrderModal(false);
          setCardToDelete(null);
        }}
        onConfirm={confirmDeleteCard}
      />
    </>
  );
};

export default KitchenDisplay;