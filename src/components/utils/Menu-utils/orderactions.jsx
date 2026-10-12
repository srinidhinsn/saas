import React, { useState, useEffect } from "react";
import { X, Trash2, Printer, Eye } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared reason lists
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_CANCEL_REASONS = [
  'Customer changed mind',
  'Customer left without paying',
  'Duplicate order',
  'Test / mistake order',
  'Payment issue',
  'Kitchen unable to fulfill',
  'Other',
];

export const CANCELLATION_REASONS = [
  'Customer changed mind',
  'Wrong item ordered',
  'Duplicate entry',
  'Item out of stock',
  'Customer left',
  'Order placed by mistake',
  'Allergy concern',
  'Other',
];

export const WASTAGE_REASONS = [
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
// Small shared helpers
// ─────────────────────────────────────────────────────────────────────────────

// tablesMap here can be either { [id]: "Table Name" } or { [id]: { name: "..." } }
// — both shapes exist across the app, so we normalise.
export const getTableName = (tableId, tablesMap = {}) => {
  const raw = tablesMap[tableId] ?? tablesMap[String(tableId)] ?? '';
  return typeof raw === 'string' ? raw : (raw?.name || '');
};

export const getInitialOrderMode = (order, tablesMap = {}) => {
  const tableName = getTableName(order.table_id, tablesMap);
  if (tableName.toLowerCase().includes('takeaway')) return 'takeaway';
  return 'dinein';
};

export const StatusBadge = ({ status }) => {
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
// OrderItemsViewModal — read-only view of all items for an order, with a
// per-item delete affordance (routes through OldItemDeleteModal via the
// parent's onRequestDeleteItem callback).
// ─────────────────────────────────────────────────────────────────────────────

export const OrderItemsViewModal = ({ isOpen, onClose, order, onRequestDeleteItem, getOrderTotal }) => {
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

  const grandTotal = getOrderTotal(order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg"
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col bg-bg-primary shadow-card border border-border-default"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border-default bg-action-primary rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-white">Order #{order.id}</h2>
            <p className="text-sm text-text-white/70 mt-0.5">
              {order._fixedOrderMode === 'takeaway'
                ? order.customer_name || 'Takeaway'
                : order._tableName || order.table || order.table_id}
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
                <th className="text-center px-4 py-3 text-text-secondary font-semibold text-xs uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {order.items.map((item, idx) => {
                const unitPrice = item.unit_price ?? item.price ?? 0;
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
                      {onRequestDeleteItem && (
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
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
// OrderRowActions — the ONE shared button group.
//
// Exactly 3 always-visible buttons (View items / Print & Invoice / Cancel),
// plus an optional 4th "Mark As Served" button that only appears when the
// order status is "ready". This is the single source of truth for the
// actions column in both OrderSummaryVisible and BillingPage — don't
// re-implement it locally in either place.
//
// Props:
//   order        - the row's order object (needs .id and .status)
//   onView       - (order) => void  — opens the items view/manage modal
//   onPrint      - (order) => void  — opens the invoice modal / prints the bill
//   onCancel     - (order) => void  — opens the cancel-order confirm modal
//   onMarkServed - (order) => void  — optional; if omitted, the "Mark As
//                  Served" button never renders even when status is 'ready'
// ─────────────────────────────────────────────────────────────────────────────

export const OrderRowActions = ({ order, onView, onPrint, onCancel, onMarkServed }) => {
  if (!order) return null;
  const status = order.status?.toLowerCase();

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap h-full">
      <button
        onClick={() => onView(order)}
        className="p-1.5 rounded-lg bg-action-primary/10 text-action-primary hover:bg-action-primary hover:text-text-white transition-colors"
        title="View items"
      >
        <Eye size={15} />
      </button>

      <button
        onClick={() => onPrint(order)}
        className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-600 hover:text-white transition-colors"
        title="Print bill"
      >
        <Printer size={15} />
      </button>

      {status === 'ready' && onMarkServed && (
        <button
          onClick={() => onMarkServed(order)}
          className="px-2.5 py-1 rounded-lg bg-action-success text-text-white text-xs font-semibold hover:opacity-90 transition-colors whitespace-nowrap"
        >
          Mark As Served
        </button>
      )}

      <button
        onClick={() => onCancel(order)}
        className="p-1.5 rounded-lg bg-action-danger/10 text-action-danger hover:bg-action-danger hover:text-text-white transition-colors"
        title="Cancel order"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
};