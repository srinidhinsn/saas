import axios from 'axios';
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { deduplicateOrderItems } from '../utils/Menu-utils/menuUtils';

export const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "razorpay_upi", label: "UPI (Razorpay)" },
  { value: "razorpay_card", label: "Card (Razorpay)" },
  { value: "Due", label: "Due" },
];

export const isOnlinePaymentMethod = (method) =>
  method === "razorpay_upi" || method === "razorpay_card";

export const needsRazorpay = (splitPaymentEnabled, paymentSplits, method) =>
  splitPaymentEnabled
    ? paymentSplits.some(s => isOnlinePaymentMethod(s.method))
    : isOnlinePaymentMethod(method);

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