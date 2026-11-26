import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import CustomerAutocomplete from './CustomerAutocomplete';
import { X, Save, Printer, CreditCard, CheckCircle } from 'lucide-react';
import RazorpayPayment from "../../Constants/RazorPay/RazorpayPayment";
import { useClient } from "../../../context/ClientContext";
import { isPackagingOrderItem, fmt, formatPriceByMode } from '../../utils/Menu-utils/menuUtils';
import {
  filterPaymentMethods,
  needsRazorpay,
  sumSplits,
  getBalance,
  updateSplitAmount as updateSplitAmountUtil,
  addSplitRow as addSplitRowUtil,
  removeSplitRow as removeSplitRowUtil,
  rebalanceOnBlur,
  validateSplitTotal,
  getPaidAndDue,
  DLG_SHELL,
  DLG_CLOSE,
  FIELD_BASE,
  FIELD
} from '../../utils/BillingUtils';

import PhonePeIframe from "../../Constants/RazorPay/PhonePeIframe";
import { generateInvoiceOutput } from '../../utils/InvoiceSupporter/generateInvoiceOutput'
// ─────────────────────────────────────────────────────────────────────────────
// REQ 2 helpers
// ─────────────────────────────────────────────────────────────────────────────

// Free the table — called ONLY after payment is confirmed as "Paid"
async function freeTable({ clientId, token, tableId, tablesMap }) {
  if (!tableId) return;
  try {
    const tableData = tablesMap[tableId];
    await axios.post(
      `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
      {
        id: tableId,
        client_id: clientId,
        name: tableData?.name || `Table ${tableId}`,
        table_type: tableData?.table_type || "Regular",
        status: 'vacant',
        location_zone: tableData?.location_zone || "Main",
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err) {
    console.error("[freeTable] failed:", err?.response?.data || err.message);
  }
}

// Only dine-in orders should be auto-marked "served" when payment is
// confirmed — a takeaway/delivery (prepaid) order may not have been
// served yet, so its status must be left alone.
function isDineInOrder(order, tablesMap) {
  if (!order) return true; // conservative default: behave as before
  if (order._fixedOrderMode) return order._fixedOrderMode === 'dinein';
  if (order.mode) {
    const m = order.mode.toLowerCase();
    if (m === 'takeaway' || m === 'delivery') return false;
    if (m === 'dinein' || m === 'dine-in') return true;
  }
  const tableName = (tablesMap?.[order.table_id]?.name || '').toLowerCase();
  return !tableName.includes('takeaway');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main InvoiceModal
// ─────────────────────────────────────────────────────────────────────────────
const _isChildItem = (fkey) => {
  const k = fkey || '';
  return k.startsWith('cchild_') || k.startsWith('addon_');
};

export default function InvoiceModal({
  clientId,
  token,
  selectedOrder: initialOrder,
  tablesMap,
  inventoryMap,
  onClose,
  onSave
}) {
  const [selectedOrder, setSelectedOrder] = useState(initialOrder);

  const [invoiceDraftId, setInvoiceDraftId] = useState(null);
  const [taxPercent, setTaxPercent] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [discountIsPercent, setDiscountIsPercent] = useState(true);
  const [method, setMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState([{ method: "Cash", amount: 0 }]);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [documentNumber, setDocumentNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Draft");
  const [customersList, setCustomersList] = useState([]);
  const [gstManuallyEdited, setGstManuallyEdited] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const { clientDetails } = useClient();
  const clientGstNumber = clientDetails?.gst_number || "";
  const [showPhonePeIframe, setShowPhonePeIframe] = useState(false);
  const [gateways, setGateways] = useState({ razorpay: false, phonepe: false });
  const [gatewaysLoaded, setGatewaysLoaded] = useState(false);
  const [verifiedTotal, setVerifiedTotal] = useState(0);
  const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

  const allOrderItems = selectedOrder?.items || [];
  const packagingChargeTotal = Number(
    allOrderItems
      .filter(i => isPackagingOrderItem(i, inventoryMap))
      .reduce((sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0)
      .toFixed(2)
  );

  // 1️⃣ Subtotal
  const orderSubtotal = Number(
    (selectedOrder?.items || [])
      .filter(item => !(item.frontend_unique_key || '').startsWith('cchild_'))
      .reduce(
        (sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
        0
      ).toFixed(2)
  );

  // 2️⃣ GST on subtotal
  const calculatedGST = Number(
    (orderSubtotal * (taxPercent / 100)).toFixed(2)
  );

  // 3️⃣ Amount after tax
  const amountAfterTax = Number(
    (orderSubtotal + calculatedGST).toFixed(2)
  );

  // 4️⃣ Discount on final amount (after tax)
  const calculatedDiscount = discountIsPercent
    ? Number(((amountAfterTax * discount) / 100).toFixed(2))
    : Number(discount);
  const calculatedTotal = Number(
    (amountAfterTax - calculatedDiscount).toFixed(2)
  );

  const total = calculatedTotal;
  const isFullyPaid = verifiedTotal > 0 && verifiedTotal + 0.01 >= total;

  const { paidAmount, dueAmount } = getPaidAndDue(paymentSplits);

  // ─── Split payment helpers ─────────────────────────────────────────────────

  const sumSplits = (splits) => splits.reduce((sum, s) => sum + Number(s.amount), 0);

  const updateBalance = (splits) => setBalanceAmount(getBalance(splits, total));

  const updateSplitAmount = (index, value) => {
    const next = updateSplitAmountUtil(paymentSplits, index, value, total);
    setPaymentSplits(next);
    updateBalance(next);
  };

  const addSplitRow = () => {
    setPaymentSplits(prev => addSplitRowUtil(prev, total));
    setBalanceAmount(0);
  };

  const removeSplitRow = (index) => {
    const updated = removeSplitRowUtil(paymentSplits, index);
    setPaymentSplits(updated);
    setBalanceAmount(getBalance(updated, total));
  };

  const onSplitAmountBlur = () => {
    const next = rebalanceOnBlur(paymentSplits, total);
    setPaymentSplits(next);
    updateBalance(next);
  };

  // ─── Fetch customers & invoice draft ──────────────────────────────────────
  const searchCustomersLocally = (q) => {
    if (!q || q.trim().length === 0) return customersList;
    const lower = q.toLowerCase();
    return customersList.filter(c =>
      c.customer_id?.toLowerCase().includes(lower) ||
      c.contact_phone?.toLowerCase().includes(lower) ||
      c.contact_email?.toLowerCase().includes(lower)
    );
  };
  const fetchUniqueCustomers = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/customer/search`,
        { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId } }
      );
      setCustomersList(res.data?.data?.customers || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setCustomersList([]);
    }
  };

  const fetchInvoiceDraft = async (orderId) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            client_id: clientId,
            document_type: "Invoice",
            order_id: orderId,
          },
        }
      );

      const invoices = res.data?.data || [];

      const filtered = invoices.filter(
        (d) =>
          d.order_id?.toString() === orderId?.toString() &&
          d.document_type === "Invoice"
      );

      if (filtered.length === 0) {
        return {};
      }

      filtered.sort((a, b) => {
        const aTime = new Date(
          a.updated_at || a.created_at || 0
        ).getTime();

        const bTime = new Date(
          b.updated_at || b.created_at || 0
        ).getTime();

        return bTime - aTime;
      });

      return filtered[0] || {};
    } catch (err) {
      console.error("Failed to fetch invoice", err);
      return {};
    }
  };

  useEffect(() => {
    if (clientId && token) {
      fetchUniqueCustomers();
    }
  }, [clientId, token]);
  useEffect(() => {
    if (!clientId || !token) return;
    (async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/verify/payment_gateways`,
          { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId } }
        );
        setGateways(res.data?.data || { razorpay: false, phonepe: false });
      } catch (err) {
        console.error("Failed to fetch payment gateways:", err);
        setGateways({ razorpay: false, phonepe: false });
      } finally {
        setGatewaysLoaded(true);
      }
    })();
  }, [clientId, token]);

  const isMethodAvailable = (value) => {
    const v = String(value || "").toLowerCase();
    if (v.includes("razorpay")) return gateways.razorpay;
    if (v.includes("phonepe")) return gateways.phonepe;
    return true; // Cash, Due, etc.
  };

  // If the saved/selected method isn't available for this client, fall back to Cash
  useEffect(() => {
    if (!gatewaysLoaded) return;
    if (!isMethodAvailable(method)) {
      setMethod("Cash");
      if (!splitPaymentEnabled) setPaymentSplits([{ method: "Cash", amount: total }]);
    }
  }, [gatewaysLoaded, gateways]);
  useEffect(() => {
    const loadInvoiceDraft = async () => {
      if (!initialOrder) return;

      const invoiceDraft = await fetchInvoiceDraft(initialOrder.id);

      setInvoiceDraftId(invoiceDraft?.id ?? null);
      setStatus(invoiceDraft?.status ?? "Draft");
      setDocumentNumber(invoiceDraft?.document_number ?? "");
      setPaymentStatus(invoiceDraft?.payment_status ?? "Pending");
      setSelectedOrder(prev => ({
        ...prev,
        customer_id: invoiceDraft?.customer_id || prev.customer_id || "",
        contact_email: invoiceDraft?.contact_email || prev.contact_email || "",
        contact_phone: invoiceDraft?.contact_phone || prev.contact_phone || "",
        shipping_address: invoiceDraft?.shipping_address || prev.shipping_address || "",
      }));
      const invoiceTotal = Number(invoiceDraft?.total_amount ?? initialOrder.total_price ?? 0);
let savedMethods = Array.isArray(invoiceDraft?.payment_method) ? invoiceDraft.payment_method : [];

// money Razorpay/PhonePe already confirmed
const verifiedMethods = savedMethods.filter(p => p.verified_at);
setVerifiedTotal(
  Number(verifiedMethods.reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(2))
);

// corrupted data (rows don't add up to the invoice total) -> keep verified rows only
const savedSum = savedMethods.reduce((s, p) => s + Number(p.amount || 0), 0);
if (savedMethods.length > 0 && Math.abs(savedSum - invoiceTotal) > 0.01) {
  savedMethods = verifiedMethods;
}

if (savedMethods.length > 0) {
  if (savedMethods.length === 1) {
    setSplitPaymentEnabled(false);
    setPaymentSplits(savedMethods);
    setMethod(savedMethods[0].method || "Cash");
    const paid = Number(savedMethods[0].amount || invoiceTotal);
    setBalanceAmount(Number((invoiceTotal - paid).toFixed(2)));
  } else {
    setSplitPaymentEnabled(true);
    setPaymentSplits(
      savedMethods.map((split) => ({
        method: split.method ?? "Cash",
        amount: Number(split.amount ?? 0),
      }))
    );
    const totalPaid = savedMethods.reduce((s, p) => s + Number(p.amount || 0), 0);
    setBalanceAmount(Number((invoiceTotal - totalPaid).toFixed(2)));
  }
} else {
  setSplitPaymentEnabled(false);
  setPaymentSplits([{ method: "Cash", amount: invoiceTotal }]);
  setMethod("Cash");
  setBalanceAmount(0);
}

      if (!gstManuallyEdited) {
        if (invoiceDraft?.tax_rate !== undefined && invoiceDraft?.tax_rate !== null) {
          setTaxPercent(Number(invoiceDraft.tax_rate));
        } else {
          setTaxPercent(18);
        }
      }

      if (invoiceDraft?.discount !== undefined && invoiceDraft?.discount !== null) {
        setDiscount(Number(invoiceDraft.discount));
        const hasDecimal = (invoiceDraft.discount % 1 !== 0);
        setDiscountIsPercent(hasDecimal);
      } else if (invoiceDraft?.discount_amount !== undefined) {
        setDiscount(Number(invoiceDraft.discount_amount));
        setDiscountIsPercent(false);
      } else {
        setDiscount(0);
        setDiscountIsPercent(true);
      }
    };

    loadInvoiceDraft();
  }, [initialOrder]);

  useEffect(() => {
    if (!selectedOrder) return;

    if (!splitPaymentEnabled) {
      setPaymentSplits([{ method, amount: total }]);
      setBalanceAmount(0);
    } else {
      let splits = paymentSplits.map(s => ({ ...s }));
      if (splits.length > 0) {
        const used = splits
          .slice(0, splits.length - 1)
          .reduce((sum, s) => sum + Number(s.amount || 0), 0);

        splits[splits.length - 1].amount = Math.max(
          Number((total - used).toFixed(2)),
          0
        );

        setPaymentSplits(splits);
        updateBalance(splits);
      }
    }
  }, [total]);

  const saveInvoiceDraft = async () => {
    if (!selectedOrder) {
      toast.error("Select an order first");
      return;
    }
    if (!selectedOrder.items || selectedOrder.items.length === 0) {
      toast.error("Selected order has no items");
      return;
    }

    if (splitPaymentEnabled) {
      const result = validateSplitTotal(paymentSplits, total);
      if (!result.valid) {
        toast.error(result.message);
        return;
      }
    } else {
      setPaymentSplits([{ method, amount: total }]);
    }

    let paymentMethodArray;
    if (splitPaymentEnabled) {
      paymentMethodArray = paymentSplits.map((p) => ({
        method: p.method,
        amount: Number(p.amount || 0),
      }));
    } else {
      paymentMethodArray = [{ method, amount: total }];
    }

    setSaving(true);
    let resolvedCustomerId = selectedOrder.customer_id;
    if (selectedOrder.contact_phone || selectedOrder.contact_email || selectedOrder.customer_id) {
      try {
        const custRes = await axios.post(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/customer/find_or_create`,
          {
            contact_email: selectedOrder.contact_email,
            contact_phone: selectedOrder.contact_phone,
            shipping_address: selectedOrder.shipping_address,
            customer_id: selectedOrder.customer_id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        resolvedCustomerId = custRes.data?.data?.person_id || resolvedCustomerId;
        console.log("find_or_create response:", custRes.data); // temporary debug
      } catch (err) {
        console.error("Failed to resolve/create customer:", err.response?.data || err.message);
      }
    }
    try {
      const payload = {
        client_id: clientId,
        document_type: "Invoice",
        document_date: new Date().toISOString(),
        order_id: selectedOrder.id.toString(),
        gst_number: clientGstNumber,
        reference_number: tablesMap[selectedOrder.table_id]?.name || `Table ${selectedOrder.table_id}`,
        subtotal: orderSubtotal,
        tax_amount: calculatedGST,
        tax_rate: taxPercent,
        discount_amount: calculatedDiscount,
        discount: discountIsPercent ? discount : calculatedDiscount,
        total_amount: calculatedTotal,
        payment_status: paymentStatus,
        payment_method: paymentMethodArray,
        single_payment_amount: splitPaymentEnabled ? null : Number(paymentSplits[0]?.amount ?? total),
        customer_id: resolvedCustomerId ?? initialOrder.customer_id ?? undefined,
        contact_email: selectedOrder.contact_email || "",
        contact_phone: selectedOrder.contact_phone || "",
        shipping_address:
          selectedOrder.shipping_address ??
          initialOrder.shipping_address ??
          undefined,
      };

      let draftId = invoiceDraftId;
      if (!draftId) {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/create_document`,
          { ...payload, status: "Draft" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        draftId = res?.data?.data?.id;
        if (!draftId) throw new Error("Draft creation failed");
        setInvoiceDraftId(draftId);
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/update_document`,
          { id: draftId, ...payload },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // REQ 2: Always issue an invoice number on save, not just on payment confirmation
      if (!documentNumber || documentNumber.toLowerCase() === "draft") {
        try {
          const issueRes = await axios.post(
            `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/issue?invoice_id=${draftId}`,
            null,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = issueRes?.data?.data || {};
          if (data.document_number) setDocumentNumber(data.document_number);
          if (data.status) setStatus(data.status);

        } catch (err) {
          console.error("Failed to generate invoice number:", err.response?.data || err.message);
        }
      }

      const itemsPayload = selectedOrder.items.map((item) => ({
        item_ref_id: item.item_id?.toString(),
        description: item.description || "",
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total: (item.unit_price || 0) * (item.quantity || 0),
      }));

      await axios.post(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/create?document_id=${draftId}&client_id=${clientId}`,
        itemsPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        {
          id: selectedOrder.id,
          invoice_status: paymentStatus.toLowerCase(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Invoice saved successfully!");
      if (onSave) onSave(draftId);
      return draftId;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to save invoice");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ─── REQ 2: Confirm payment ────────────────────────────────────────────────
  // Called when the "Confirm Payment" button is clicked.
  // Sets invoice payment_status to "Paid", marks order as "served",
  // and THEN frees the table.

  const handleConfirmPayment = async () => {
    setSaving(true);
    try {
      const invoiceDraft = await fetchInvoiceDraft(selectedOrder.id);
      const correctInvoiceDraftId = invoiceDraft?.id || invoiceDraftId;
      if (!correctInvoiceDraftId) throw new Error("No invoice draft found");

      const updateRes = await axios.post(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/update_document`,
        { id: correctInvoiceDraftId, client_id: clientId, payment_status: paymentStatus, status: "Issued" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedInvoice = updateRes?.data?.data;

      // Only auto-mark "served" for dine-in orders — takeaway/delivery
      // orders are typically prepaid before the food is even ready.
      const dineIn = isDineInOrder(selectedOrder, tablesMap);
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        {
          id: selectedOrder.id,
          ...(dineIn ? { status: "served" } : {}),
          invoice_status: paymentStatus.toLowerCase(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await freeTable({ clientId, token, tableId: selectedOrder.table_id, tablesMap });

      setInvoiceDraftId(updatedInvoice?.id || correctInvoiceDraftId);
      setDocumentNumber(updatedInvoice?.document_number || documentNumber);
      setPaymentStatus(updatedInvoice?.payment_status || paymentStatus);
      setStatus(updatedInvoice?.status || "Issued");
      onClose();
    } catch (err) {
      console.error("Payment Confirmation Failed:", err.message);
      toast.error("Payment confirmation failed");
    } finally {
      setSaving(false);
    }
  };

  // ─── handlePaymentClick ────────────────────────────────────────────────────

  const handlePaymentClick = async () => {
    let draftId = invoiceDraftId;
    try {
      draftId = await saveInvoiceDraft();
    } catch {
      return;
    }
    if (!draftId) return;
    if (method === "phonepe" && !splitPaymentEnabled) {
      setShowPhonePeIframe(true);
      return;
    }
    const requiresRazorpay = needsRazorpay(splitPaymentEnabled, paymentSplits, method);
    if (requiresRazorpay) {
      setShowRazorpayModal(true);
    } else if (paymentStatus !== "Pending") {
      await handleConfirmPayment();
    }
  };

  // ─── Print invoice ─────────────────────────────────────────────────────────

  const printInvoice = async () => {
    if (!selectedOrder || !selectedOrder.items?.length) {
      toast.error("Select an order with items first");
      return;
    }

    let currentInvoiceDraftId = invoiceDraftId;
    let currentInvoiceNumber = documentNumber;

    if (!currentInvoiceDraftId) {
      try {
        currentInvoiceDraftId = await saveInvoiceDraft();
        const updated = await fetchInvoiceDraft(selectedOrder.id);
        if (updated?.id) {
          setInvoiceDraftId(updated.id);
          setPaymentStatus(updated.payment_status || "Pending");
        }
        if (updated) {
          setSelectedOrder(prev => ({
            ...prev,
            customer_id: updated.customer_id || prev.customer_id,
            contact_email: updated.contact_email || prev.contact_email,
            contact_phone: updated.contact_phone || prev.contact_phone
          }));
        }
      } catch {
        toast.error("Please save invoice before printing.");
        return;
      }
    }

    if (!currentInvoiceNumber || currentInvoiceNumber.toLowerCase() === "draft") {
      toast.error("Invoice number will be generated after payment confirmation. Please confirm payment first.");
      return;
    }

    try {
      // REQ 2: everything below is common data shared by both the PDF and the
      // slip — only the customer fields differ, and those are only passed to
      // the 'pdf' call further down.
      const parentItemsForPrint = (selectedOrder.items || []).filter(i => !_isChildItem(i.frontend_unique_key));
      const addonsMapForPrint = {};
      parentItemsForPrint.forEach(item => {
        addonsMapForPrint[item.frontend_unique_key] = (selectedOrder.items || []).filter(a =>
          (a.frontend_unique_key || '').startsWith(`addon_${item.frontend_unique_key}_`) &&
          !isPackagingOrderItem(a, inventoryMap)
        );
      });

      const sharedPrintData = {
        clientId,
        gstNumber: clientGstNumber,
        invoiceNumber: currentInvoiceNumber,
        tableName: tablesMap[selectedOrder.table_id]?.name || `Table ${selectedOrder.table_id}`,
        orderMode: selectedOrder.mode || 'Dine-In',
        orderId: selectedOrder.id,
        items: parentItemsForPrint,
        addonsByParent: addonsMapForPrint,
        subtotal: orderSubtotal,
        discount: calculatedDiscount,
        taxPercent,
        gstAmount: calculatedGST,
        packagingCharge: packagingChargeTotal,
        total,
        paymentInfo: splitPaymentEnabled ? paymentSplits : [{ method, amount: total }],
        paymentStatus,
      };

      // PDF copy — includes customer details
      generateInvoiceOutput({
        type: 'pdf',
        ...sharedPrintData,
        customerId: selectedOrder.customer_id,
        contactPhone: selectedOrder.contact_phone,
        contactEmail: selectedOrder.contact_email,
      });
      toast.success("Invoice PDF downloaded successfully!");

      // Thermal slip copy — customer details intentionally omitted
      generateInvoiceOutput({
        type: 'slip',
        ...sharedPrintData,
      });
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Failed to generate invoice PDF");
    }
  };

  return (
    <div className="ui-backdrop font-sans">
      <div className={`${DLG_SHELL} max-w-[1600px] h-[90vh] relative`} role="dialog" aria-modal="true" aria-label="Invoice">
        <button
          className={`absolute top-4 right-4 z-10 ${DLG_CLOSE}`}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
 
        <div className="flex flex-col h-full min-h-0 bg-canvas">
          {/* Header */}
          <div className="bg-brand-light border-b border-brand-line px-6 py-4 flex-shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xl text-ink-muted">
                    Invoice #{documentNumber || "Draft"}
                    {/* REQ 2: Show payment status badge in header */}
                    {invoiceDraftId && (
                      <span
                        className={`ml-2 text-micro px-2 py-0.5 rounded-badge font-bold
                          ${paymentStatus === 'Paid'
                            ? 'bg-state-vacant-bg text-state-vacant'
                            : 'bg-state-reserved-bg text-state-reserved'}`}
                      >
                        {paymentStatus}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mr-10">
                <div className="text-ink">
                  <div className="text-ui font-semibold">Table: {tablesMap[selectedOrder.table_id]?.name}</div>
                  <div className="text-ui-sm text-ink-muted">Order #{selectedOrder.dinein_order_id ?? selectedOrder.id}</div>
                </div>
                <div className="text-ink">
                  <div className="text-ui font-semibold">{new Date().toLocaleDateString()}</div>
                  <div className="text-ui-sm text-ink-muted">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            </div>
          </div>
 
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
 
              {/* LEFT - Items (2/3 width on xl) */}
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-surface rounded-panel shadow-panel border border-line">
                  <div className="px-5 py-3 bg-brand-light border-b border-brand-line rounded-t-panel">
                    <h2 className="text-panel-title text-brand-dark flex items-center gap-2">
                      📦 Order Items
                    </h2>
                  </div>
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
 
                    {(() => {
                      const items = selectedOrder.items || [];
                      const parents = items.filter(i => !_isChildItem(i.frontend_unique_key));
                      return parents.map((item, idx) => {
 
                        const addons = items.filter(i =>
                          (i.frontend_unique_key || '').startsWith(`addon_${item.frontend_unique_key}_`) &&
                          !isPackagingOrderItem(i, inventoryMap)
                        );
 
                        return (
                          <div key={idx}>
                            {/* Main item row */}
                            <div className="flex justify-between items-center py-3 px-4 rounded-panel bg-canvas border border-line hover:border-brand-ring transition-colors">
                              <div className="flex-1">
                                <div className="font-bold text-body-sm text-ink">{item.name}</div>
                                <div className="text-ui text-ink-muted mt-1 flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark font-bold text-micro">
                                    {item.quantity}x
                                  </span>
                                  <span>@ ₹{formatPriceByMode(item.unit_price || 0, clientId)}</span>
                                </div>
                              </div>
                              <div className="font-bold text-brand-dark text-body">
                                ₹{formatPriceByMode((item.unit_price || 0) * (item.quantity || 0), clientId)}
                              </div>
                            </div>
                            {/* Addon rows indented below */}
                            {addons.map((addon, ai) => (
                              <div key={ai} className="flex justify-between items-center py-1.5 px-4 pl-8 rounded-panel bg-brand-tint border border-dashed border-brand-line mt-0.5 ml-3">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-brand-ring text-ui">↳</span>
                                  <span className="text-ui text-brand-dark">{addon.name}</span>
                                  <span className="text-ui-sm text-ink-muted">×{addon.quantity}</span>
                                </div>
                                <span className="text-ui-sm font-bold text-brand-dark">
                                  +₹{formatPriceByMode((addon.unit_price || 0) * (addon.quantity || 0), clientId)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </div>
 
                  {/* Totals */}
                  <div className="border-t border-line bg-canvas px-5 py-4 rounded-b-panel">
                    <div className="space-y-2">
                      <div className="flex justify-between text-ink text-body-sm">
                        <span>Subtotal</span>
                        <span className="font-semibold">₹{formatPriceByMode(orderSubtotal, clientId)}</span>
                      </div>
                      <div className="flex justify-between text-brand-dark text-body-sm">
                        <span>Discount</span>
                        <span className="font-semibold">-₹{formatPriceByMode(calculatedDiscount, clientId)}</span>
                      </div>
                      <div className="flex justify-between text-ink-muted text-body-sm">
                        <span>GST ({taxPercent}%)</span>
                        <span className="font-semibold">₹{formatPriceByMode(calculatedGST, clientId)}</span>
                      </div>
                      {packagingChargeTotal > 0 && (
                        <div className="flex justify-between text-ink-muted text-body-sm">
                          <span>Packaging Charges</span>
                          <span className="font-semibold">₹{formatPriceByMode(packagingChargeTotal, clientId)}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-line flex justify-between items-center">
                        <span className="text-body font-bold text-ink">TOTAL</span>
                        <span className="text-kpi text-brand-dark">
                          ₹{formatPriceByMode(calculatedTotal, clientId)}
                        </span>
                      </div>
                        {dueAmount > 0 && (
                          <>
                          <div className="flex justify-between text-ink-muted text-body-sm">
                            <span>Paid</span>
                            <span className="font-semibold">₹{formatPriceByMode(paidAmount, clientId)}</span>
                          </div>
                          <div className="flex justify-between text-ink-muted text-body-sm">
                            <span>Due</span>
                            <span className="font-semibold">₹{formatPriceByMode(dueAmount, clientId)}</span>
                          </div>
                          </>
                        )}
                    </div>
                  </div>
                </div>
              </div>
 
              {/* RIGHT - Customer & Settings (1/3 width on xl) */}
              <div className="space-y-6">
 
                {/* Customer Details */}
                <div className="bg-surface rounded-panel shadow-panel border border-line">
                  <div className="px-5 py-3 bg-brand-light border-b border-brand-line rounded-t-panel">
                    <h3 className="text-panel-title text-brand-dark flex items-center gap-2">
                      👤 Customer
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <CustomerAutocomplete
                      value={selectedOrder.contact_phone || ""}
                      onChange={(val) => setSelectedOrder((p) => ({ ...p, contact_phone: val }))}
                      onSelectCustomer={(c) => {
                        setSelectedOrder((p) => ({
                          ...p,
                          customer_id: c.customer_id || p.customer_id,
                          contact_phone: c.contact_phone || "",
                          contact_email: c.contact_email || "",
                          shipping_address: c.shipping_address || "",
                        }));
                      }}
                      customers={customersList}
                      placeholder="📞 Phone"
                      valueField="contact_phone"
                    />
                    <CustomerAutocomplete
                      value={selectedOrder.contact_email || ""}
                      onChange={(val) => setSelectedOrder((p) => ({ ...p, contact_email: val }))}
                      onSelectCustomer={(c) => {
                        setSelectedOrder((p) => ({
                          ...p,
                          customer_id: c.customer_id || p.customer_id,
                          contact_phone: c.contact_phone || "",
                          contact_email: c.contact_email || "",
                          shipping_address: c.shipping_address || "",
                        }));
                      }}
                      customers={customersList}
                      placeholder="📧 Email"
                      valueField="contact_email"
                    />
                    <CustomerAutocomplete
                      value={selectedOrder.shipping_address || ""}
                      onChange={(val) => setSelectedOrder((p) => ({ ...p, shipping_address: val }))}
                      onSelectCustomer={(c) => {
                        setSelectedOrder((p) => ({
                          ...p,
                          customer_id: c.customer_id || p.customer_id,
                          contact_phone: c.contact_phone || p.contact_phone,
                          contact_email: c.contact_email || p.contact_email,
                          shipping_address: c.shipping_address || "",
                        }));
                      }}
                      customers={customersList}
                      placeholder="🏠 Shipping Address"
                      valueField="shipping_address"
                    />
                  </div>
                </div>
 
                {/* Tax & Discount */}
                <div className="bg-surface rounded-panel shadow-panel border border-line">
                  <div className="px-5 py-3 bg-brand-light border-b border-brand-line rounded-t-panel">
                    <h3 className="text-panel-title text-brand-dark flex items-center gap-2">
                      ⚙️ Tax & Discount
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted">GST (%)</label>
                        <input
                          type="number"
                          value={taxPercent}
                          min="0"
                          className={FIELD}
                          onChange={(e) => {
                            setTaxPercent(Number(e.target.value));
                            setGstManuallyEdited(true);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted">Discount</label>
                        <input
                          type="number"
                          value={discount}
                          min="0"
                          className={FIELD}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted">Type</label>
                        <select
                          value={discountIsPercent ? "percent" : "fixed"}
                          onChange={(e) => setDiscountIsPercent(e.target.value === "percent")}
                          className={FIELD}
                        >
                          <option value="percent">%</option>
                          <option value="fixed">₹</option>
                        </select>
                      </div>
                    </div>
 
                    {/* Payment Status */}
                    <div>
                      <label className="block mb-2 text-micro font-bold uppercase tracking-wide text-ink-muted">Payment Status</label>
                      <div className="ui-toggle">
                        {["Pending", "Paid", "Partial", "Due"].map((statusOption) => (
                          <button
                            key={statusOption}
                            disabled={isFullyPaid}
                            type="button"
                            className={`ui-toggle-btn ${paymentStatus === statusOption
                              ? "ui-toggle-btn-active"
                              : ""
                              }`}
                            onClick={() => setPaymentStatus(statusOption)}
                          >
                            {statusOption}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
 
                {/* Payment Method */}
                <div className="bg-surface rounded-panel shadow-panel border border-line">
                  <div className="px-5 py-3 bg-brand-light border-b border-brand-line rounded-t-panel flex items-center justify-between">
                    <h3 className="text-panel-title text-brand-dark flex items-center gap-2">
                      💳 Payment
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand cursor-pointer"
                        checked={splitPaymentEnabled}
                        disabled={isFullyPaid}
                        onChange={() => {
                          const newSplitEnabled = !splitPaymentEnabled;
                          setSplitPaymentEnabled(newSplitEnabled);
                          if (newSplitEnabled) setPaymentSplits([{ method: "Cash", amount: total }]);
                          else setPaymentSplits([{ method, amount: total }]);
                        }}
                      />
                      <span className="text-ui font-semibold text-ink-muted">Split</span>
                    </label>
                  </div>
 
                  <div className="p-4">
                    {splitPaymentEnabled ? (
                      <div className="space-y-2">
                        {paymentSplits.map((split, idx) => (
                          <div key={idx} className="flex gap-2 items-center p-2 rounded-panel bg-canvas border border-line">
                            <select
                              value={split.method}
                              disabled={isFullyPaid}
                              onChange={(e) => {
                                const newSplits = [...paymentSplits];
                                newSplits[idx].method = e.target.value;
                                setPaymentSplits(newSplits);
                              }}
                              className={`${FIELD_BASE} flex-1`}
                            >
                              {filterPaymentMethods(gateways).map(m => (
  <option key={m.value} value={m.value}>{m.label}</option>
))}
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={split.amount}
                              disabled={isFullyPaid}
                              onChange={(e) => updateSplitAmount(idx, e.target.value)}
                              onBlur={() => onSplitAmountBlur()}
                              className={`${FIELD_BASE} w-24`}
                            />
                            <button
                              type="button"
                              onClick={() => removeSplitRow(idx)}
                              className="grid place-items-center h-7 w-7 rounded-button-sm text-brand-dark hover:bg-brand-soft disabled:opacity-40"
                              disabled={paymentSplits.length === 1 || isFullyPaid}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addSplitRow}
                          disabled={isFullyPaid}
                          className="ui-btn ui-btn-add w-full"
                        >
                          + Add Payment
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                       <select
  value={method}
  onChange={(e) => {
    setMethod(e.target.value);
    setPaymentSplits([{ method: e.target.value, amount: total }]);
  }}
  disabled={isFullyPaid}
  className={`${FIELD_BASE} flex-1`}
>
  <option value="Cash">Cash</option>
  {gateways.razorpay && <option value="razorpay_upi">UPI</option>}
  {gateways.razorpay && <option value="razorpay_card">Card</option>}
  {gateways.phonepe && <option value="phonepe">PhonePe</option>}
  <option value="Due">Due</option>
</select>
                        <input
                          type="number"
                          value={total}
                          readOnly
                          className={`${FIELD_BASE} w-28 font-semibold text-right bg-canvas cursor-not-allowed opacity-70`}
                        />
                      </div>
                    )}
                  </div>
                </div>
 
                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <button
                      onClick={handlePaymentClick}
                      disabled={saving || isFullyPaid}
                      className="ui-btn ui-btn-add flex-1 h-11"
                    >
                      <Save size={18} />
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={printInvoice}
                      className="ui-btn flex-1 h-11"
                    >
                      <Printer size={18} />
                      Print
                    </button>
                  </div>  
 
                  {/* REQ 2: Already paid indicator */}
                  {invoiceDraftId && paymentStatus === "Paid" && (
                    <div className="flex items-center justify-center gap-2 py-3 rounded-panel bg-state-vacant-bg border border-state-vacant/30 text-state-vacant font-semibold text-ui">
                      <CheckCircle size={18} className="text-state-vacant" />
                      Payment Confirmed — Table Freed
                    </div>
                  )}
                </div>
 
              </div>
            </div>
          </div>
        </div>
      </div>
 

      {/* ── Razorpay modal ── */}
      {showRazorpayModal && (
        <RazorpayPayment
          amount={total}
          orderId={invoiceDraftId}
          clientId={clientId}
          token={token}
          splitPayments={splitPaymentEnabled ? paymentSplits.filter(s => s.method.includes('razorpay')) : []}
          isSplitPayment={splitPaymentEnabled}
          customerDetails={{
            name: selectedOrder.customer_id || 'Customer',
            email: selectedOrder.contact_email || '',
            phone: selectedOrder.contact_phone || ''
          }}
          onPaymentSuccess={async (response) => {
            try {
              const docId = invoiceDraftId;
              if (!docId) {
                toast.error("Invoice ID missing — save before paying");
                return;
              }

              const isSplit = response?.is_split_payment;
              const paymentsToVerify = isSplit
                ? response.completed_razorpay_payments   // array of { razorpay_payment_id, order_id, signature }
                : [{
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }];

              // ✅ Verify each Razorpay payment sequentially
              for (const p of paymentsToVerify) {
                if (!p.razorpay_payment_id || !p.razorpay_order_id || !p.razorpay_signature) {
                  console.warn("Skipping invalid payment entry:", p);
                  continue;
                }
                await axios.post(
                  `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/verify?client_id=${clientId}`,
                  {
                    document_id: Number(docId),
                    razorpay_payment_id: String(p.razorpay_payment_id),
                    razorpay_order_id: String(p.razorpay_order_id),
                    razorpay_signature: String(p.razorpay_signature),
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
              }

              // Update order status
              await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: selectedOrder.id, status: "served", invoice_status: "paid" },
                { headers: { Authorization: `Bearer ${token}` } }
              );

              await freeTable({ clientId, token, tableId: selectedOrder.table_id, tablesMap });

              setPaymentStatus("Paid");
              setShowRazorpayModal(false);
              toast.success("Payment verified successfully!");
              if (onSave) onSave(invoiceDraftId);
              onClose();
            } catch (err) {
              console.error("VERIFY ERROR:", err.response?.data || err.message);
              toast.error("Verification failed: " + (err.response?.data?.detail || err.message));
            }
          }}
          onPaymentFailure={(error) => {
            console.error('Payment failed:', error);
            setShowRazorpayModal(false);
            toast.error('Payment failed. Please try again.');
          }}
          onClose={() => setShowRazorpayModal(false)}
        />
      )}
      {showPhonePeIframe && (
        <PhonePeIframe
          amount={total}
          documentId={invoiceDraftId}
          clientId={clientId}
          token={token}
          onPaymentSuccess={async (data) => {
            try {
              await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: selectedOrder.id, status: "served", invoice_status: "paid" },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              await freeTable({ clientId, token, tableId: selectedOrder.table_id, tablesMap });
              setPaymentStatus("Paid");
              setStatus("Issued");
              setShowPhonePeIframe(false);
              toast.success("PhonePe payment verified!");
              if (onSave) onSave(invoiceDraftId);
              onClose();
            } catch (err) {
              console.error("Post-payment update failed:", err.response?.data || err.message);
              toast.error("Payment verified but order update failed");
            }
          }}
          onPaymentFailure={(error) => {
            console.error('PhonePe payment failed:', error);
            setShowPhonePeIframe(false);
            toast.error(error.error || 'Payment failed. Please try again.');
          }}
        />
      )}
    </div>
  );
}