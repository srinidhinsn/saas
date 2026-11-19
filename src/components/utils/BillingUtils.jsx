import axios from 'axios';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { deduplicateOrderItems } from '../utils/Menu-utils/menuUtils';
import { X, Trash2, Printer, Eye } from "lucide-react";export const DLG_SHELL =
  "flex flex-col w-full max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line " +
  "border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in";
export const DLG_HEAD =
  "flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0";
export const DLG_FOOT =
  "flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0";
export const DLG_CLOSE =
  "grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface " +
  "text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors";
export const FIELD_BASE =
  "h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink outline-none " +
  "placeholder:text-ink-faint transition-colors focus:border-brand-ring focus:shadow-focus-ring";
export const FIELD = FIELD_BASE + " w-full";
const REASON_ON = "bg-brand-soft text-brand-darker border-brand-ring shadow-seg-active";
const REASON_OFF = "bg-surface text-ink-toggle border-brand-line hover:border-brand-ring";



export const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "razorpay_upi", label: "UPI (Razorpay)" },
  { value: "razorpay_card", label: "Card (Razorpay)" },
  { value: "phonepe", label: "PhonePe" },
  { value: "Due", label: "Due" },
];
export const isRazorpayMethod = (method) =>
  method === "razorpay_upi" || method === "razorpay_card";

export const isPhonePeMethod = (method) => method === "phonepe";
export const isOnlinePaymentMethod = (method) =>
  method === "razorpay_upi" || method === "razorpay_card";

export const needsRazorpay = (splitPaymentEnabled, paymentSplits, method) =>
  splitPaymentEnabled
    ? paymentSplits.some(s => isRazorpayMethod(s.method))
    : isRazorpayMethod(method);
export const filterPaymentMethods = (gateways = {}) =>
      PAYMENT_METHODS.filter(m => {
        if (isRazorpayMethod(m.value)) return !!gateways.razorpay;
        if (isPhonePeMethod(m.value)) return !!gateways.phonepe;
        return true;
      });
// Sum of all amounts across split rows
export const sumSplits = (splits) =>
  splits.reduce((sum, s) => sum + Number(s.amount || 0), 0);

// Remaining unpaid balance against a target total (never negative)
export const getBalance = (splits, total) => {
  const bal = Number(total) - sumSplits(splits);
  return bal < 0 ? 0 : Number(bal.toFixed(2));
};

// Update one split row's amount, then auto-adjust the LAST row so the
// total across all rows never exceeds `total`. Returns the new splits array.
export const updateSplitAmount = (splits, index, value, total) => {
  let newAmount = Number(value);
  if (isNaN(newAmount) || newAmount < 0) newAmount = 0;

  const next = [...splits];
  next[index] = { ...next[index], amount: newAmount };

  if (next.length > 1) {
    const sumOthers = next
      .filter((_, idx) => idx !== next.length - 1)
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const remainder = Number((total - sumOthers).toFixed(2));
    next[next.length - 1] = {
      ...next[next.length - 1],
      amount: remainder >= 0 ? remainder : 0,
    };
  }

  let sumTotal = sumSplits(next);
  while (sumTotal > total) {
    const excess = sumTotal - total;
    const last = next[next.length - 1];
    if (last.amount >= excess) {
      next[next.length - 1] = { ...last, amount: last.amount - excess };
    } else {
      next[next.length - 1] = { ...last, amount: 0 };
    }
    sumTotal = sumSplits(next);
  }

  return next;
};

// Add a new split row, pre-filled with whatever's left of the total
export const addSplitRow = (splits, total, defaultMethod = "Cash") => {
  const used = sumSplits(splits);
  const remainder = Number((total - used).toFixed(2));
  return [...splits, { method: defaultMethod, amount: remainder >= 0 ? remainder : 0 }];
};

// Remove a split row, folding its amount back into the last remaining row
export const removeSplitRow = (splits, index) => {
  if (splits.length <= 1) return splits;
  const updated = splits.filter((_, idx) => idx !== index);
  const sum = sumSplits(updated);
  const remainder = Number((sumSplits(splits) - sum).toFixed(2));
  if (updated.length > 0) {
    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      amount: Number(updated[updated.length - 1].amount || 0) + remainder,
    };
  }
  return updated;
};

// Rebalances the last row on blur so all rows always sum exactly to `total`
export const rebalanceOnBlur = (splits, total) => {
  if (splits.length <= 1) return splits;
  const next = [...splits];
  const sumOthers = next
    .filter((_, idx) => idx !== next.length - 1)
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const remainder = Number((total - sumOthers).toFixed(2));
  next[next.length - 1] = {
    ...next[next.length - 1],
    amount: remainder >= 0 ? remainder : 0,
  };
  return next;
};

// Validates a split payment set against the invoice/order total.
// Returns { valid: true } or { valid: false, message }
export const validateSplitTotal = (splits, total) => {
  if (splits.length < 2) {
    return { valid: false, message: "Add at least two payment methods for split payment" };
  }
  const roundedSum = Number(sumSplits(splits).toFixed(2));
  const roundedTotal = Number(Number(total).toFixed(2));
  if (roundedSum < roundedTotal) {
    return {
      valid: false,
      message: `Split payment total ₹${roundedSum.toFixed(2)} is less than invoice total ₹${roundedTotal.toFixed(2)}`,
    };
  }
  if (roundedSum > roundedTotal) {
    return {
      valid: false,
      message: `Split payment total ₹${roundedSum.toFixed(2)} exceeds invoice total ₹${roundedTotal.toFixed(2)}`,
    };
  }
  return { valid: true };
};

// Splits an array of {method, amount} into paid vs due totals.
// "Due" is treated as unpaid; everything else counts as paid.
export const getPaidAndDue = (splits) => {
  const paidAmount = Number(
    splits
      .filter(p => p.method !== "Due")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      .toFixed(2)
  );
  const dueAmount = Number(
    splits
      .filter(p => p.method === "Due")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      .toFixed(2)
  );
  return { paidAmount, dueAmount };
};

// ─────────────────────────────────────────────────────────────────────────
// Invoice / Print-Bill helpers — shared by TakeOrder, OrderSummaryVisible,
// BillingPage, and anywhere else "Print Bill" / "Generate Bill" appears.
// ─────────────────────────────────────────────────────────────────────────

// Latest billing doc for a single order
export async function fetchBillingDocumentForOrder({ clientId, token, orderId }) {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
      { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId } }
    );
    const invoices = (res.data?.data || []).filter(
      d => d.order_id?.toString() === orderId?.toString()
    );
    if (!invoices.length) return null;
    invoices.sort(
      (a, b) =>
        (b.document_version || 1) - (a.document_version || 1) ||
        new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    );
    return invoices[0];
  } catch {
    return null;
  }
}

// order_id -> latest billing doc, for list views (Order Summary, Billing page)
export async function fetchBillingDocumentsMap({ clientId, token }) {
  const map = {};
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
      { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId } }
    );
    (res.data?.data || []).forEach(doc => {
      if (doc.order_id == null) return;
      const key = doc.order_id.toString();
      const existing = map[key];
      if (
        !existing ||
        (doc.document_version || 1) > (existing.document_version || 1) ||
        new Date(doc.updated_at || doc.created_at || 0) > new Date(existing.updated_at || existing.created_at || 0)
      ) {
        map[key] = doc;
      }
    });
  } catch (err) {
    console.error('fetchBillingDocumentsMap failed:', err);
  }
  return map;
}

// Single source of truth for "Print Bill" everywhere: fetch order, enrich
// items with inventory data, dedupe, merge customer/billing-doc contact info.
export async function buildInvoiceOrderData({
  clientId,
  token,
  orderId,
  inventoryMap = {},
  customerDetails = {},
}) {
  const r = await axios.get(
    `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const order = (r.data?.data || []).find(o => o.id === orderId);
  if (!order) return null;

  const enriched = (order.items || []).map(item => {
    const inv = inventoryMap[item.item_id] || {};
    return {
      ...item,
      unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
      name: item.item_name ?? inv.name ?? 'Unnamed Item',
    };
  });

  const deduplicatedItems = deduplicateOrderItems(enriched);
  const billingDoc = await fetchBillingDocumentForOrder({ clientId, token, orderId });

  return {
    ...order,
    items: deduplicatedItems,
    customer_id: customerDetails.customer_id || billingDoc?.customer_id || order.customer_id || '',
    contact_phone: customerDetails.contact_phone || billingDoc?.contact_phone || order.contact_phone || '',
    contact_email: customerDetails.contact_email || billingDoc?.contact_email || order.contact_email || '',
    shipping_address:
      customerDetails.shipping_address || billingDoc?.shipping_address || order.delivery_address || '',
  };
}

// Shared hook: open/close the invoice modal from any screen with one call.
export function useInvoiceModal({ clientId, token, inventoryMap = {} }) {
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrderData, setInvoiceOrderData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const openInvoiceForOrder = useCallback(
    async (orderId, customerDetails = {}) => {
      setInvoiceLoading(true);
      try {
        const data = await buildInvoiceOrderData({ clientId, token, orderId, inventoryMap, customerDetails });
        if (!data) {
          toast.error('Order not found');
          return;
        }
        setInvoiceOrderData(data);
        setInvoiceModalOpen(true);
      } catch (err) {
        console.error('openInvoiceForOrder failed:', err);
        toast.error('Failed to load order');
      } finally {
        setInvoiceLoading(false);
      }
    },
    [clientId, token, inventoryMap]
  );

  const closeInvoiceModal = useCallback(() => {
    setInvoiceModalOpen(false);
    setInvoiceOrderData(null);
  }, []);

  return { invoiceModalOpen, invoiceOrderData, invoiceLoading, openInvoiceForOrder, closeInvoiceModal, setInvoiceOrderData };
}

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
    pending: 'bg-state-other-bg text-state-other border-state-other/30',
    preparing: 'bg-state-reserved-bg text-state-reserved border-state-reserved/30',
    ready: 'bg-state-vacant-bg text-state-vacant border-state-vacant/30',
    served: 'bg-brand-light text-brand-dark border-brand-line',
  };
  const s = status?.toLowerCase();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-badge text-micro font-bold border capitalize
        ${styles[s] || 'bg-brand-light text-ink-muted border-brand-line'}`}
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
    <div className="ui-backdrop font-sans">
      <div className={`${DLG_SHELL} max-w-sm`} role="dialog" aria-modal="true" aria-label="Cancel order">
        <div className={DLG_HEAD}>
          <h2 className="text-panel-title text-brand-dark">Cancel order</h2>
          <button onClick={onClose} className={DLG_CLOSE} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-modal py-card space-y-item">
          <p className="text-ui text-ink-muted">
            The order will be marked as <span className="font-bold text-brand-dark">cancelled</span> and kept for records. Select a reason:
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
            {ORDER_CANCEL_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`px-2 py-2 rounded-button-sm text-ui font-semibold border text-left transition-colors
                  ${reason === r ? REASON_ON : REASON_OFF}`}
              >{r}</button>
            ))}
          </div>
          {reason === 'Other' && (
            <input
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Describe the reason…"
              className={FIELD}
            />
          )}
        </div>
        <div className={DLG_FOOT}>
          <button onClick={onClose} className="ui-btn">Go back</button>
          <button
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            onClick={() => { onConfirm(effectiveReason); onClose(); }}
            className="ui-btn ui-btn-danger"
          >Cancel order</button>
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
  const typeColor = 'text-brand-dark';
  const typeBg = 'bg-brand-tint border-brand-line';
 
  useEffect(() => {
    if (isOpen) { setReason(''); setCustomReason(''); setRemoveQty(1); }
  }, [isOpen]);
 
  if (!isOpen || !item) return null;
 
  const maxQty = item.quantity || 1;
  const isRemoveAll = removeQty >= maxQty;
  const effectiveReason = reason === 'Other' ? customReason : reason;
 
  return (
    <div className="ui-backdrop font-sans">
      <div className={`${DLG_SHELL} max-w-sm`} role="dialog" aria-modal="true" aria-label="Remove item">
        <div className={DLG_HEAD}>
          <h2 className="text-panel-title text-brand-dark">Remove item</h2>
          <button onClick={onClose} className={DLG_CLOSE} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-modal py-card space-y-item">
          <div>
            <p className="text-body-sm font-bold text-ink">{item.item_name || item.name}</p>
            <p className="text-ui text-ink-muted mt-0.5">Ordered quantity: <span className="font-bold text-ink-soft">{maxQty}</span></p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-panel border text-ui font-semibold ${typeBg} ${typeColor}`}>
            <span className="w-2 h-2 rounded-badge bg-current inline-block" />
            {typeLabel} — {isServed ? 'Item was already served. Stock will be reversed.' : 'Item not yet served. No stock deduction.'}
          </div>
          {maxQty > 1 && (
            <div>
              <p className="text-micro font-bold uppercase tracking-wide text-ink-muted mb-2">How many to remove?</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setRemoveQty(q => Math.max(1, q - 1))} className="ui-btn h-8 w-8 px-0 text-body font-bold">−</button>
                <span className="w-10 text-center text-kpi text-ink">{removeQty}</span>
                <button onClick={() => setRemoveQty(q => Math.min(maxQty, q + 1))} className="ui-btn h-8 w-8 px-0 text-body font-bold">+</button>
                <span className="text-ui-sm text-ink-muted ml-1">of {maxQty}</span>
                <button onClick={() => setRemoveQty(maxQty)} className="ml-auto text-ui font-bold text-brand underline">Remove all</button>
              </div>
              <div className="mt-1 h-1.5 bg-brand-light rounded-badge overflow-hidden">
                <div className="h-full bg-brand rounded-badge transition-all" style={{ width: `${(removeQty / maxQty) * 100}%` }} />
              </div>
            </div>
          )}
          <div>
            <p className="text-micro font-bold uppercase tracking-wide text-ink-muted mb-2">Reason</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {reasonList.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-2 py-2 rounded-button-sm text-ui font-semibold border text-left transition-colors
                    ${reason === r ? REASON_ON : REASON_OFF}`}
                >{r}</button>
              ))}
            </div>
            {reason === 'Other' && (
              <input
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe the reason…"
                className={`${FIELD} mt-2`}
              />
            )}
          </div>
        </div>
        <div className={DLG_FOOT}>
          <button onClick={onClose} className="ui-btn">Cancel</button>
          <button
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            onClick={() => {
              if (isRemoveAll) onRemoveAll(transactionType, effectiveReason);
              else onRemoveOne(transactionType, effectiveReason, removeQty);
            }}
            className="ui-btn ui-btn-danger"
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
      case 'pending': return 'bg-state-other-bg text-state-other';
      case 'preparing': return 'bg-state-reserved-bg text-state-reserved';
      case 'ready': return 'bg-state-vacant-bg text-state-vacant';
      case 'served': return 'bg-brand-light text-brand-dark';
      default: return 'bg-brand-light text-ink-muted';
    }
  };
 
  const grandTotal = getOrderTotal(order);
 
  return (
    <div className="ui-backdrop font-sans" onClick={onClose}>
      <div
        className={`${DLG_SHELL} max-w-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label="Order items"
        onClick={e => e.stopPropagation()}
      >
        <div className={DLG_HEAD}>
          <div className="min-w-0">
            <h2 className="text-panel-title text-brand-dark">Order #{order.id}</h2>
            <p className="text-micro text-ink-muted truncate">
              {order._fixedOrderMode === 'takeaway'
                ? order.customer_name || 'Takeaway'
                : order._tableName || order.table || order.table_id}
            </p>
          </div>
          <div className="flex items-center gap-item">
            <div className="text-right">
              <p className="text-micro font-bold uppercase tracking-wide text-ink-muted">Grand total</p>
              <p className="text-kpi text-brand-dark">₹{grandTotal.toFixed(2)}</p>
            </div>
            <button onClick={onClose} className={DLG_CLOSE} aria-label="Close"><X size={16} /></button>
          </div>
        </div>
 
        <div className="flex-1 overflow-y-auto px-modal pb-card">
          <table className="ui-table text-ui">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Unit price</th>
                <th className="text-right">Total</th>
                <th className="text-center">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => {
                const unitPrice = item.unit_price ?? item.price ?? 0;
                const lineTotal = unitPrice * (item.quantity || 1);
                const isServedItem = item.status?.toLowerCase() === 'served';
                return (
                  <tr key={item.id || idx}>
                    <td>{idx + 1}</td>
                    <td className="font-semibold text-ink">{item.item_name || 'Unnamed Item'}</td>
                    <td className="text-center font-bold text-ink">{item.quantity || 1}</td>
                    <td className="text-right">₹{unitPrice.toFixed(2)}</td>
                    <td className="text-right font-bold text-brand-dark">₹{lineTotal.toFixed(2)}</td>
                    <td className="text-center">
                      <span className={`text-micro font-bold px-2.5 py-1 rounded-badge capitalize ${getItemStatusStyle(item.status)}`}>{item.status || 'pending'}</span>
                    </td>
                    <td className="text-center">
                      {onRequestDeleteItem && (
                        <button
                          onClick={() => onRequestDeleteItem(item)}
                          className="p-1.5 rounded-button-sm bg-brand-light text-brand-dark hover:bg-brand-soft transition-colors"
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
 
        <div className="px-modal py-item border-t border-line bg-canvas flex justify-between items-center shrink-0">
          <span className="text-ui font-semibold text-ink-muted">
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-ui font-semibold text-ink-muted">Grand total:</span>
            <span className="text-kpi text-brand-dark">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// OrderRowActions — the ONE shared button group (same props as before)
// ─────────────────────────────────────────────────────────────────────────────
 

export const OrderRowActions = ({ order, onView, onPrint, onCancel, onMarkServed }) => {
  if (!order) return null;
  const status = order.status?.toLowerCase();

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap h-full">
      <button
        onClick={() => onView(order)}
        className="p-1.5 rounded-button-sm bg-[#edf2f8] text-[#496582] hover:bg-[#dfe8f2] hover:text-[#354f6b] transition-colors"
        title="View items"
      >
        <Eye size={15} />
      </button>

      <button
        onClick={() => onPrint(order)}
        className="p-1.5 rounded-button-sm bg-[#e8f4f1] text-[#397b6c] hover:bg-[#d8ebe5] hover:text-[#286556] transition-colors"
        title="Print bill"
      >
        <Printer size={15} />
      </button>

      {status === 'ready' && onMarkServed && (
        <button
          onClick={() => onMarkServed(order)}
          className="ui-btn ui-btn-add h-7 px-2.5 text-micro whitespace-nowrap"
        >
          Mark As Served
        </button>
      )}

      <button
        onClick={() => onCancel(order)}
        className="p-1.5 rounded-button-sm bg-[#f8eded] text-[#b65b5b] hover:bg-[#f1dede] hover:text-[#984444] transition-colors"
        title="Cancel order"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
};


export const hasInvoiceBeenGenerated = (order, billingDocMap = {}) =>
  Boolean(billingDocMap?.[order?.id?.toString()]?.document_number);