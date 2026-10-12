import React, { useState, useEffect } from 'react';
import { X, Check, Clock } from 'lucide-react';
import axios from 'axios';
import InvoiceModal from '../../MainComponents/BillingServices/InvoiceModal';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

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

const ORDER_CANCEL_REASONS = [
    'Customer changed mind',
    'Customer left without paying',
    'Duplicate order',
    'Test / mistake order',
    'Payment issue',
    'Kitchen unable to fulfill',
    'Other',
];

// ─────────────────────────────────────────────────────────────────────────────
// TransferTableModal
// ─────────────────────────────────────────────────────────────────────────────

export const TransferTableModal = ({ isOpen, onClose, tables, currentTableId, onConfirm }) => {
    const [selectedNewTable, setSelectedNewTable] = useState(null);

    useEffect(() => {
        if (isOpen) setSelectedNewTable(null);
    }, [isOpen]);

    if (!isOpen) return null;

    const vacantTables = tables.filter(
        t => t.status?.toLowerCase() === 'vacant' && t.id.toString() !== currentTableId
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Transfer Table</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>
                <div className="px-6 py-4 max-h-72 overflow-y-auto">
                    {vacantTables.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No vacant tables available.</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {vacantTables.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedNewTable(t)}
                                    className={`py-3 rounded-lg border-2 text-sm font-bold transition
                    ${selectedNewTable?.id === t.id
                                            ? 'border-action-primary bg-action-primary/10 text-action-primary'
                                            : 'border-gray-200 hover:border-action-primary text-gray-700'}`}
                                >
                                    {t.table_number}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { if (selectedNewTable) { onConfirm(selectedNewTable); onClose(); } }}
                        disabled={!selectedNewTable}
                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition
              ${selectedNewTable ? 'bg-action-primary hover:bg-action-danger' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        Transfer
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// CancelOrderConfirmModal
// ─────────────────────────────────────────────────────────────────────────────

export const CancelOrderConfirmModal = ({ isOpen, onClose, onConfirm }) => {
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
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
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
                  ${reason === r
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                            >
                                {r}
                            </button>
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
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                        Go Back
                    </button>
                    <button
                        disabled={!reason || (reason === 'Other' && !customReason.trim())}
                        onClick={() => { onConfirm(effectiveReason); onClose(); }}
                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition
              ${reason && !(reason === 'Other' && !customReason.trim())
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        Cancel Order
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// OldItemDeleteModal
// ─────────────────────────────────────────────────────────────────────────────

export const OldItemDeleteModal = ({ isOpen, onClose, item, onRemoveOne, onRemoveAll }) => {
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
        if (isOpen) {
            setReason('');
            setCustomReason('');
            setRemoveQty(1);
        }
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
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div>
                        <p className="text-sm text-gray-700 font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Ordered quantity: <span className="font-semibold">{maxQty}</span>
                        </p>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${typeBg} ${typeColor}`}>
                        <span className="w-2 h-2 rounded-full bg-current inline-block" />
                        {typeLabel} — {isServed
                            ? 'Item was already served. Stock will be reversed.'
                            : 'Item not yet served. No stock deduction.'}
                    </div>

                    {maxQty > 1 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-2">How many to remove?</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setRemoveQty(q => Math.max(1, q - 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold"
                                >−</button>
                                <span className="w-10 text-center text-lg font-bold text-gray-800">{removeQty}</span>
                                <button
                                    onClick={() => setRemoveQty(q => Math.min(maxQty, q + 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold"
                                >+</button>
                                <span className="text-xs text-gray-400 ml-1">of {maxQty}</span>
                                <button
                                    onClick={() => setRemoveQty(maxQty)}
                                    className="ml-auto text-xs text-red-500 underline font-semibold"
                                >Remove all</button>
                            </div>
                            <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-400 rounded-full transition-all"
                                    style={{ width: `${(removeQty / maxQty) * 100}%` }}
                                />
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
                                            ? isServed
                                                ? 'bg-red-600 text-white border-red-600'
                                                : 'bg-orange-500 text-white border-orange-500'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                                >
                                    {r}
                                </button>
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
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!reason || (reason === 'Other' && !customReason.trim())}
                        onClick={() => {
                            if (isRemoveAll) {
                                onRemoveAll(transactionType, effectiveReason);
                            } else {
                                onRemoveOne(transactionType, effectiveReason, removeQty);
                            }
                        }}
                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition
              ${reason && !(reason === 'Other' && !customReason.trim())
                                ? buttonColor
                                : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        {isRemoveAll
                            ? `Remove All (${maxQty})`
                            : `Remove ${removeQty}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TablePaymentConfirmModal
// ─────────────────────────────────────────────────────────────────────────────

export const TablePaymentConfirmModal = ({ isOpen, orderId, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-green-700">Confirm Payment</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="px-6 py-5">
                    <p className="text-sm text-gray-600">
                        Mark order <span className="font-semibold">#{orderId}</span> as paid and free the table?
                    </p>
                </div>
                <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(orderId); onClose(); }}
                        className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-green-600 hover:bg-green-700 text-white"
                    >
                        Confirm Paid
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// LineItemsModal
// ─────────────────────────────────────────────────────────────────────────────

export const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithSelectedAddons, onAddMainOnly }) => {
    const [selectedAddons, setSelectedAddons] = useState([]);

    useEffect(() => {
        if (isOpen) setSelectedAddons([]);
    }, [isOpen]);

    const toggleAddon = (id) => {
        setSelectedAddons(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="rounded-lg max-w-lg w-full p-6 bg-bg-primary max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
                <p className="mb-4 text-text-secondary">Select add-ons:</p>

                <div className="space-y-2 mb-6">
                    {lineItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => toggleAddon(item.id)}
                            className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all
                ${selectedAddons.includes(item.id)
                                    ? 'bg-action-primary/10 border-2 border-action-primary'
                                    : 'bg-bg-tertiary border border-border-default hover:border-action-primary/50'}`}
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${selectedAddons.includes(item.id)
                                            ? 'bg-action-primary border-action-primary'
                                            : 'border-gray-300'}`}
                                >
                                    {selectedAddons.includes(item.id) && <Check size={14} className="text-white" />}
                                </div>
                                <span className="text-text-primary font-medium">{item.name}</span>
                            </div>
                            <span className="font-semibold text-action-primary">₹{item.unit_price}</span>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg border border-border-default bg-bg-tertiary text-text-primary hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onAddMainOnly}
                        className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
                    >
                        Main Only
                    </button>
                    <button
                        onClick={() => onAddWithSelectedAddons(selectedAddons)}
                        disabled={selectedAddons.length === 0}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors
              ${selectedAddons.length > 0
                                ? 'bg-action-primary text-white hover:bg-action-danger'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                        Add ({selectedAddons.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TakeawayOrdersModal — today's takeaway orders picker
// ─────────────────────────────────────────────────────────────────────────────

export const TakeawayOrdersModal = ({ isOpen, onClose, clientId, token, takeawayTableIds, onSelectOrder }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const fetchTodayOrders = async () => {
            setLoading(true);
            try {
                const r = await axios.get(
                    `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const all = r.data?.data || [];
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                const todayTakeaway = all.filter(o => {
                    if (!takeawayTableIds.includes(String(o.table_id))) return false;
                    if (o.status?.toLowerCase() === 'completed') return false;
                    if (o.status?.toLowerCase() === 'draft') return false;
                    const created = new Date(
                        typeof o.created_at === 'string'
                            ? o.created_at.replace(' ', 'T').split('.')[0] + 'Z'
                            : o.created_at
                    );
                    return created >= todayStart;
                }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                setOrders(todayTakeaway);
            } catch (err) {
                console.error('TakeawayOrdersModal fetch failed:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTodayOrders();
    }, [isOpen, clientId, token, takeawayTableIds]);

    if (!isOpen) return null;

    const statusStyle = (s) => ({
        pending: 'bg-orange-100 text-orange-700',
        preparing: 'bg-blue-100 text-blue-700',
        ready: 'bg-green-100 text-green-700',
        served: 'bg-purple-100 text-purple-700',
    }[s?.toLowerCase()] || 'bg-gray-100 text-gray-600');

    const calcElapsed = (createdAt) => {
        if (!createdAt) return '';
        const utc = typeof createdAt === 'string'
            ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
            : createdAt;
        const diff = Date.now() - new Date(utc).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m} min ago`;
        const h = Math.floor(m / 60);
        return h < 24 ? `${h} hr ago` : `${Math.floor(h / 24)} day ago`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="rounded-xl w-full max-w-md bg-white shadow-xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-5 py-4 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Today's Takeaway Orders</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Select an order to add more items</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                    {loading && (
                        <p className="text-sm text-center text-gray-400 py-6">Loading…</p>
                    )}
                    {!loading && orders.length === 0 && (
                        <p className="text-sm text-center text-gray-400 py-6">No takeaway orders today yet.</p>
                    )}
                    {!loading && orders.map(order => (
                        <button
                            key={order.id}
                            onClick={() => { onSelectOrder(order); onClose(); }}
                            className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-action-primary hover:bg-orange-50 transition group"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-800 font-mono">
                                        #{order.dinein_order_id || order.id}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusStyle(order.status)}`}>
                                        {order.status?.toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-action-primary">
                                    ₹{Number(order.total_price || 0).toFixed(0)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                                <span>{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</span>
                                <span className="flex items-center gap-1">
                                    <Clock size={11} className="text-orange-400" />
                                    {calcElapsed(order.created_at)}
                                </span>
                            </div>
                            {(order.items || []).length > 0 && (
                                <p className="mt-1 text-xs text-gray-400 truncate">
                                    {order.items.slice(0, 3).map(i => i.item_name).join(', ')}
                                    {order.items.length > 3 ? ` +${order.items.length - 3} more` : ''}
                                </p>
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer — new order option */}
                <div className="px-4 py-3 border-t bg-gray-50 rounded-b-xl">
                    <button
                        onClick={() => { onSelectOrder(null); onClose(); }}
                        className="w-full py-2.5 rounded-lg border-2 border-dashed border-orange-300 text-orange-600 text-sm font-semibold hover:bg-orange-50 transition"
                    >
                        + Start a new takeaway order
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ClearConfirmModal — was an inline dialog in the main component
// ─────────────────────────────────────────────────────────────────────────────

export const ClearConfirmModal = ({ isOpen, onCancel, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg p-6 w-80 shadow-xl">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Clear all items?</h3>
                <p className="text-sm text-gray-500 mb-4">
                    This will also discard the saved draft for this table.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2 bg-action-primary text-white rounded-lg hover:bg-action-danger"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// StockWarningModal — was an inline dialog in the main component
// ─────────────────────────────────────────────────────────────────────────────

export const StockWarningModal = ({ warning, onClose }) => {
    if (!warning) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
                <h3 className="text-base font-bold text-red-600 mb-2">Stock Limit Reached</h3>
                <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold text-gray-800">{warning.itemName}</span>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                    Only <span className="font-bold text-red-500">{warning.available}</span> available.
                    You've already added the maximum quantity.
                </p>
                <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-action-primary text-white rounded-lg font-semibold text-sm hover:bg-action-danger"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// OrderModals — renders every modal; `o` is the object returned by useOrderPlace
// ─────────────────────────────────────────────────────────────────────────────

export const OrderModals = ({ o, clientId, token }) => {
    const { modals: m } = o;
    const [cancelM, setCancelM] = m.cancelOrder;
    const [payM, setPayM] = m.payConfirm;
    const [delM, setDelM] = m.oldItemDelete;
    const [showTransfer, setShowTransfer] = m.transfer;
    const [showTakeaway, setShowTakeaway] = m.takeaway;
    const [showClear, setShowClear] = m.clearConfirm;
    const [stock, setStock] = m.stockWarning;

    return (
        <>
            {/* ── Clear confirm dialog ── */}
            <ClearConfirmModal
                isOpen={showClear}
                onCancel={() => setShowClear(false)}
                onConfirm={o.confirmClearCart}
            />

            {/* ── Modals ── */}
            <LineItemsModal
                isOpen={m.lineItems.open}
                onClose={o.closeLineItems}
                mainItem={m.lineItems.mainItem}
                lineItems={m.lineItems.items}
                onAddMainOnly={o.handleAddMainItemOnly}
                onAddWithSelectedAddons={o.handleAddMainItemWithSelectedAddons}
            />

            <CancelOrderConfirmModal
                isOpen={cancelM.isOpen}
                onClose={() => setCancelM({ isOpen: false, orderId: null, tableId: null })}
                onConfirm={(reason) => {
                    if (cancelM.orderId) {
                        o.handleCancelOrder(cancelM.orderId, cancelM.tableId, reason);
                    }
                }}
            />

            <TablePaymentConfirmModal
                isOpen={payM.isOpen}
                orderId={payM.orderId}
                onClose={() => setPayM({ isOpen: false, orderId: null, tableId: null })}
                onConfirm={(orderId) => {
                    o.handleConfirmPaymentFromGrid(orderId, payM.tableId);
                }}
            />

            <OldItemDeleteModal
                isOpen={delM.isOpen}
                item={delM.item}
                onClose={() => setDelM({ isOpen: false, item: null })}
                onRemoveOne={o.handleOldItemRemoveOne}
                onRemoveAll={o.handleOldItemRemoveAll}
            />

            <TransferTableModal
                isOpen={showTransfer}
                onClose={() => setShowTransfer(false)}
                tables={o.tables}
                currentTableId={o.selectedTable}
                onConfirm={o.handleTransferTable}
            />

            <TakeawayOrdersModal
                isOpen={showTakeaway}
                onClose={() => setShowTakeaway(false)}
                clientId={clientId}
                token={token}
                takeawayTableIds={o.takeawayTables.map(t => String(t.id))}
                onSelectOrder={o.handleTakeawayOrderSelected}
            />

            {m.invoice.open && m.invoice.data && (
                <InvoiceModal
                    clientId={clientId}
                    token={token}
                    selectedOrder={m.invoice.data}
                    tablesMap={o.tables.reduce((acc, t) => { acc[t.id] = t; return acc; }, {})}
                    inventoryMap={o.inventoryMap}
                    onClose={o.closeInvoice}
                    onSave={id => {
                        console.log('Invoice saved:', id);
                        o.fetchTables();
                    }}
                />
            )}

            <StockWarningModal warning={stock} onClose={() => setStock(null)} />
        </>
    );
};