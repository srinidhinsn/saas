import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import CustomerAutocomplete from './CustomerAutocomplete';


export default function BillingPage({ clientId, token }) {
  const invoiceRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [inventoryMap, setInventoryMap] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceDraftId, setInvoiceDraftId] = useState(null);
  const [taxPercent, setTaxPercent] = useState(10);
  const [discount, setDiscount] = useState(5);
  const [discountIsPercent, setDiscountIsPercent] = useState(true);

  const [method, setMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState([{ method: "Cash", amount: 0 }]);
  const [singlePaymentAmount, setSinglePaymentAmount] = useState(0);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [documentNumber, setDocumentNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [status, setStatus] = useState("Draft");
  const isMobile = window.innerWidth <= 768;
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [gstManuallyEdited, setGstManuallyEdited] = useState(false);

  const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

  const updateBalance = (sumOfPayments) => {
    const bal = total - sumOfPayments;
    setBalanceAmount(bal < 0 ? 0 : Number(bal.toFixed(2)));
  };

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const [ordersRes, tablesRes, invRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const servedOrders = (ordersRes.data?.data || []).filter(
          (o) => o.status?.toLowerCase() === "served" && new Date(o.created_at).toDateString() === new Date().toDateString()
        );
        setOrders(servedOrders);
        const tMap = {};
        (tablesRes.data?.data || []).forEach((t) => (tMap[t.id] = t));
        setTablesMap(tMap);
        const iMap = {};
        (invRes.data?.data || []).forEach((i) => (iMap[i.id] = i));
        setInventoryMap(iMap);
      } catch (e) {
        toast.error("Error loading data");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [clientId, token]);

  const fetchUniqueCustomers = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { client_id: clientId }
        }
      );

      const invoices = res.data?.data || [];
      const customersMap = new Map();

      invoices.forEach(inv => {
        if (inv.customer_id) {
          if (!customersMap.has(inv.customer_id) ||
            new Date(inv.created_at) > new Date(customersMap.get(inv.customer_id).created_at)) {
            customersMap.set(inv.customer_id, {
              customer_id: inv.customer_id,
              contact_email: inv.contact_email || "",
              contact_phone: inv.contact_phone || "",
              created_at: inv.created_at
            });
          }
        }
      });

      const uniqueCustomers = Array.from(customersMap.values())
        .sort((a, b) => a.customer_id.localeCompare(b.customer_id));

      setCustomersList(uniqueCustomers);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setCustomersList([]);
    }
  };


  useEffect(() => {
    if (clientId && token) {
      fetchUniqueCustomers();
    }
  }, [clientId, token]);
  const orderSubtotal = Number(
    (selectedOrder?.items || []).reduce(
      (sum, item) =>
        sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
      0
    ).toFixed(2)
  );

  const orderGST = Number(selectedOrder?.gst ?? 0);
  const orderCST = Number(selectedOrder?.cst ?? 0);
  const orderDiscount = Number(selectedOrder?.discount ?? 0);
  const orderTotal = Number(selectedOrder?.total_price ?? 0);

  const calculatedDiscount = discountIsPercent
    ? (orderSubtotal * discount) / 100
    : discount;

  const calculatedGST = (orderSubtotal - calculatedDiscount) * (taxPercent / 100);

  const calculatedTotal = Number(
    (orderSubtotal - calculatedDiscount + calculatedGST).toFixed(2)
  );
  const total = calculatedTotal;
  const orderTax = orderGST + orderCST;

  const sumSplits = (splits) => splits.reduce((sum, s) => sum + Number(s.amount), 0);

  const updateSplitAmount = (index, value) => {
    let newAmount = Number(value);
    if (isNaN(newAmount) || newAmount < 0) newAmount = 0;
    let splits = [...paymentSplits];
    splits[index].amount = newAmount;
    if (splits.length > 1) {
      const sumOthers = splits.filter((_, idx) => idx !== splits.length - 1).reduce((sum, s) => sum + Number(s.amount), 0);
      let remainder = Number((total - sumOthers).toFixed(2));
      splits[splits.length - 1].amount = remainder >= 0 ? remainder : 0;
    }
    let sumTotal = sumSplits(splits);
    while (sumTotal > total) {
      let excess = sumTotal - total;
      if (splits[splits.length - 1].amount >= excess) {
        splits[splits.length - 1].amount -= excess;
      } else {
        splits[splits.length - 1].amount = 0;
      }
      sumTotal = sumSplits(splits);
    }
    setPaymentSplits(splits);
    updateBalance(sumSplits(splits));
  };

  const addSplitRow = () => {
    const used = sumSplits(paymentSplits);
    const remainder = Number((total - used).toFixed(2));
    setPaymentSplits((prev) => [...prev, { method: "Cash", amount: remainder >= 0 ? remainder : 0 }]);
    setBalanceAmount(Number(0));
  };

  const removeSplitRow = (index) => {
    if (paymentSplits.length <= 1) return;
    let updated = paymentSplits.filter((_, idx) => idx !== index);
    let sum = sumSplits(updated);
    let remainder = Number((total - sum).toFixed(2));
    if (updated.length > 0) updated[updated.length - 1].amount += remainder;
    setPaymentSplits(updated);
    setBalanceAmount(Number((total - sumSplits(updated)).toFixed(2)));
  };

  const onSplitAmountBlur = () => {
    let splits = [...paymentSplits];
    if (splits.length > 1) {
      const sumOthers = splits.filter((_, idx) => idx !== splits.length - 1).reduce((sum, s) => sum + Number(s.amount), 0);
      let remainder = Number((total - sumOthers).toFixed(2));
      splits[splits.length - 1].amount = remainder >= 0 ? remainder : 0;
    }
    setPaymentSplits(splits);
    updateBalance(sumSplits(splits));
    setBalanceAmount(Number((total - sumSplits(splits)).toFixed(2)));
  };

  const combineDuplicateItems = (items) => {
    const itemsMap = new Map();
    items.forEach(item => {
      const key = item.item_id.toString();
      if (itemsMap.has(key)) {
        const existing = itemsMap.get(key);
        existing.quantity = (existing.quantity || 0) + (item.quantity || 0);
      } else {
        itemsMap.set(key, { ...item });
      }
    });
    return Array.from(itemsMap.values());
  };

  const handleSelectOrder = async (order) => {
    setGstManuallyEdited(false);

    if (!order) return;

    const enrichedItems = (order.items || []).map((item) => {
      const inv = inventoryMap[item.item_id] || {};
      return {
        ...item,
        unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
        description: item.description ?? inv.description ?? "",
        name: item.item_name ?? inv.name ?? "Unnamed Item",
      };
    });

    const combinedItems = combineDuplicateItems(enrichedItems);
    const invoiceDraft = await fetchInvoiceDraft(order.id);

    const updatedOrder = {
      ...order,
      items: combinedItems,
      customer_id: invoiceDraft?.customer_id || order.customer_id || "",
      contact_email: invoiceDraft?.contact_email || order.contact_email || "",
      contact_phone: invoiceDraft?.contact_phone || order.contact_phone || "",
    };

    setSelectedOrder(updatedOrder);
    setInvoiceDraftId(invoiceDraft?.id ?? null);
    setStatus(invoiceDraft?.status ?? "Draft");
    setDocumentNumber(invoiceDraft?.document_number ?? "");
    setPaymentStatus(invoiceDraft?.payment_status ?? "Pending");

    const totalVal = Number(order.total_price ?? 0);


    // Handle payment methods
    if (Array.isArray(invoiceDraft?.payment_method) && invoiceDraft.payment_method.length > 0) {
      if (invoiceDraft.payment_method.length === 1) {
        setSplitPaymentEnabled(false);
        setPaymentSplits(invoiceDraft.payment_method);
        setMethod(invoiceDraft.payment_method[0].method || "Cash");
        const paidAmount = Number(invoiceDraft.payment_method[0].amount || totalVal);
        setSinglePaymentAmount(paidAmount);
        setBalanceAmount(Number((totalVal - paidAmount).toFixed(2)));
      } else {
        setSplitPaymentEnabled(true);
        setPaymentSplits(
          invoiceDraft.payment_method.map((split) => ({
            method: split.method ?? "Cash",
            amount: Number(split.amount ?? 0),
          }))
        );
        const totalPaid = invoiceDraft.payment_method.reduce((sum, s) => sum + Number(s.amount || 0), 0);
        setBalanceAmount(Number((totalVal - totalPaid).toFixed(2)));
      }
    } else {
      setSplitPaymentEnabled(false);
      setPaymentSplits([{ method: "Cash", amount: totalVal }]);
      setMethod("Cash");
      setSinglePaymentAmount(totalVal);
      setBalanceAmount(0);
    }

    if (!gstManuallyEdited) {
      if (invoiceDraft?.tax_rate !== undefined && invoiceDraft?.tax_rate !== null) {
        setTaxPercent(Number(invoiceDraft.tax_rate));
      } else {
        setTaxPercent(18); // default GST
      }
    }


    // Load discount from invoice draft (from DB)
    if (invoiceDraft?.discount !== undefined && invoiceDraft?.discount !== null) {
      setDiscount(Number(invoiceDraft.discount));
      // Determine type: if has decimal (.0 format), it's percentage
      const hasDecimal = (invoiceDraft.discount % 1 !== 0);
      setDiscountIsPercent(hasDecimal);
    } else if (invoiceDraft?.discount_amount !== undefined) {
      setDiscount(Number(invoiceDraft.discount_amount));
      setDiscountIsPercent(false); // discount_amount is typically fixed value
    } else {
      setDiscount(0);
      setDiscountIsPercent(true);
    }
  };


  useEffect(() => {
    if (!selectedOrder) return;

    // When total changes, resync payments
    if (!splitPaymentEnabled) {
      setPaymentSplits([{ method, amount: total }]);
      setSinglePaymentAmount(total);
      setBalanceAmount(0);
    } else {
      // Split payment → rebalance last row
      let splits = [...paymentSplits];
      if (splits.length > 0) {
        const used = splits
          .slice(0, splits.length - 1)
          .reduce((sum, s) => sum + Number(s.amount || 0), 0);

        splits[splits.length - 1].amount = Math.max(
          Number((total - used).toFixed(2)),
          0
        );

        setPaymentSplits(splits);
        updateBalance(sumSplits(splits));
      }
    }
  }, [total]);

  const fetchInvoiceDraft = async (orderId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { client_id: clientId },
      });
      const invoices = res.data?.data || [];
      const filtered = invoices.filter(
        (d) => d.order_id?.toString() === orderId?.toString()
      );
      if (filtered.length === 0) return {};
      filtered.sort(
        (a, b) =>
          (b.document_version || 1) - (a.document_version || 1) ||
          new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
      );
      return filtered[0] || {};
    } catch (err) {
      console.error("Failed to fetch invoice", err);
      return {};
    }
  };
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
      const sumPayments = paymentSplits.reduce((sum, p) => sum + Number(p.amount), 0);
      if (Number(sumPayments.toFixed(2)) !== Number(total.toFixed(2))) {
        toast.error("Split payment amounts do not sum up to the total");
        return;
      }
      if (paymentSplits.length < 2) {
        toast.error("Add at least two payment methods for split payment");
        return;
      }
    }

    let paymentMethodArray;
    if (splitPaymentEnabled) {
      paymentMethodArray = paymentSplits.map((p) => ({
        method: p.method,
        amount: Number(p.amount || 0),
      }));
    } else {
      paymentMethodArray = [{ method, amount: Number(total) }];
    }

    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        document_type: "Invoice",
        document_date: new Date().toISOString(),
        order_id: selectedOrder.id.toString(),
        reference_number: tablesMap[selectedOrder.table_id]?.name || `Table ${selectedOrder.table_id}`,
        subtotal: orderSubtotal,
        tax_amount: calculatedGST,
        tax_rate: taxPercent,
        discount_amount: calculatedDiscount,
        discount: discountIsPercent ? discount : calculatedDiscount,
        total_amount: calculatedTotal,
        payment_status: paymentStatus,
        payment_method: paymentMethodArray,
        single_payment_amount: splitPaymentEnabled ? null : Number(total.toFixed(2)),
        status: status,
        customer_id: selectedOrder.customer_id || "",
        contact_email: selectedOrder.contact_email || "",
        contact_phone: selectedOrder.contact_phone || "",
      };

      let draftId = invoiceDraftId;
      if (!draftId) {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/create_document`,
          payload,
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
          invoice_status: paymentStatus.toLowerCase(), // paid / unpaid / partial / due
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Invoice draft saved!");
      return draftId;
    } catch (err) {
      console.error(err);
      toast.error("Failed to save invoice draft");
      throw err;
    } finally {
      setSaving(false);
    }
  };
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
        const updatedDraft = await fetchInvoiceDraft(selectedOrder.id);
        if (updatedDraft) {
          setSelectedOrder(prev => ({
            ...prev,
            customer_id: updatedDraft.customer_id || prev.customer_id,
            contact_email: updatedDraft.contact_email || prev.contact_email,
            contact_phone: updatedDraft.contact_phone || prev.contact_phone
          }));
        }
      } catch {
        toast.error("Please save invoice draft before printing.");
        return;
      }
    }

    if (!currentInvoiceNumber || currentInvoiceNumber.toLowerCase() === "draft") {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/issue?invoice_id=${currentInvoiceDraftId}`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        currentInvoiceNumber = res?.data?.data?.document_number;
        if (!currentInvoiceNumber) throw new Error("Invoice number generation failed");
        setDocumentNumber(currentInvoiceNumber);
        setStatus("Issued");
      } catch (err) {
        console.error("Invoice issue error: ", err);
        toast.error("Failed to generate invoice number before print.");
        return;
      }
    }

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = 50;

      // Header with gradient effect
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, pageWidth, 120, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.text(clientId.toUpperCase(), 40, y);

      doc.setFontSize(18);
      doc.text("INVOICE", 40, y + 30);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice No: ${currentInvoiceNumber}`, pageWidth - 40, y, { align: "right" });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 40, y + 20, { align: "right" });
      doc.text(`Time: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, pageWidth - 40, y + 35, { align: "right" });

      y = 140;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FROM", 40, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(localStorage.getItem("restaurant_address") || "Address not available", 40, y + 15);

      y += 50;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.line(40, y, pageWidth - 40, y);

      y += 25;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("BILL TO", 40, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Customer: ${selectedOrder.customer_id || "Walk-in Customer"}`, 40, y + 18);
      doc.text(`Phone: ${selectedOrder.contact_phone || "N/A"}`, 40, y + 32);
      doc.text(`Email: ${selectedOrder.contact_email || "N/A"}`, 40, y + 46);

      doc.setFont("helvetica", "bold");
      doc.text("ORDER DETAILS", pageWidth - 180, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Table: ${tablesMap[selectedOrder.table_id]?.name || "N/A"}`, pageWidth - 180, y + 18);
      doc.text(`Type: ${selectedOrder.mode || "Dine-In"}`, pageWidth - 180, y + 32);
      doc.text(`Order #${selectedOrder.id}`, pageWidth - 180, y + 46);

      y += 70;

      doc.setFillColor(248, 250, 252);
      doc.rect(40, y - 5, pageWidth - 80, 25, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("ITEM", 45, y + 10);
      doc.text("QTY", pageWidth - 260, y + 10);
      doc.text("PRICE", pageWidth - 180, y + 10);
      doc.text("AMOUNT", pageWidth - 80, y + 10);

      y += 30;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      selectedOrder.items.forEach((item, index) => {
        if (y > pageHeight - 150) {
          doc.addPage();
          y = 50;
        }

        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(40, y - 8, pageWidth - 80, 20, 'F');
        }

        doc.text(item.name || "Unnamed", 45, y);
        doc.text(`${item.quantity || 0}`, pageWidth - 260, y);
        doc.text(`Rs.${(item.unit_price ?? 0).toFixed(2)}`, pageWidth - 180, y);
        doc.text(`Rs.${((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}`, pageWidth - 80, y);
        y += 20;
      });

      y += 15;

      doc.setDrawColor(200, 200, 200);
      doc.line(40, y, pageWidth - 40, y);
      y += 20;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Subtotal:", pageWidth - 200, y);
      doc.text(`Rs.${orderSubtotal.toFixed(2)}`, pageWidth - 80, y, { align: "right" });
      y += 18;

      doc.text("Discount:", pageWidth - 200, y);
      doc.setTextColor(239, 68, 68);
      doc.text(`-Rs.${calculatedDiscount.toFixed(2)}`, pageWidth - 80, y, { align: "right" });
      y += 18;

      doc.setTextColor(0, 0, 0);
      doc.text(`GST (${taxPercent}%):`, pageWidth - 200, y);
      doc.text(`Rs.${calculatedGST.toFixed(2)}`, pageWidth - 80, y, { align: "right" });
      y += 25;

      doc.setFillColor(239, 246, 255);
      doc.rect(pageWidth - 220, y - 12, 180, 30, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("TOTAL:", pageWidth - 200, y);
      doc.text(`Rs.${total.toFixed(2)}`, pageWidth - 80, y, { align: "right" });

      y += 40;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PAYMENT INFORMATION", 40, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      if (splitPaymentEnabled && paymentSplits.length > 1) {
        paymentSplits.forEach((split, idx) => {
          doc.text(`${idx + 1}. ${split.method}:`, 45, y);
          doc.text(`Rs.${Number(split.amount).toFixed(2)}`, 200, y);
          y += 15;
        });
      } else {
        const paymentMethod = splitPaymentEnabled && paymentSplits.length > 0 ? paymentSplits[0].method : method;
        const paymentAmount = splitPaymentEnabled && paymentSplits.length > 0 ? paymentSplits[0].amount : total;
        doc.text(`Payment Method: ${paymentMethod}`, 45, y);
        y += 15;
        doc.text(`Amount Paid: ₹${Number(paymentAmount).toFixed(2)}`, 45, y);
        y += 15;
      }

      doc.text(`Payment Status: ${paymentStatus}`, 45, y);
      y += 30;

      doc.setDrawColor(200, 200, 200);
      doc.line(40, pageHeight - 80, pageWidth - 40, pageHeight - 80);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Thank you for your business!", pageWidth / 2, pageHeight - 50, { align: "center" });
      doc.setFontSize(8);
      doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 35, { align: "center" });

      doc.save(`Invoice_${currentInvoiceNumber}_${selectedOrder.id}.pdf`);
      toast.success("Invoice PDF downloaded successfully!");
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Failed to generate invoice PDF.");
    }

    setSaving(false);
  };

  useEffect(() => {
    async function fetchPaidInvoices() {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { client_id: clientId }
          }
        );
        const today = (new Date()).toISOString().slice(0, 10);
        const paid = (res.data?.data || []).filter(
          inv => inv.payment_status?.toLowerCase() === "paid" && (inv.document_date || "").slice(0, 10) === today
        );
        setPaidInvoices(paid);
      } catch (err) {
        setPaidInvoices([]);
      }
    }
    fetchPaidInvoices();
  }, [clientId, token, selectedOrder]);

  useEffect(() => {
    if (selectedOrder && isMobile) setInvoiceModalOpen(true);
  }, [selectedOrder, isMobile]);

  const renderInvoiceContent = () => (
    <>
      {/* Header */}
      <div className="flex justify-between bg-action-primary text-text-white p-4 rounded-t-lg">
        <div>
          <h1 className="text-2xl font-bold">{clientId.toUpperCase()}</h1>
          <h2 className="text-lg font-semibold">INVOICE</h2>
        </div>
        <div className="text-right">
          <div className="text-sm">#{documentNumber || "Draft"}</div>
          <div className="text-xs">{new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Customer & Order Info */}
      <div className="flex flex-col md:flex-row justify-between bg-bg-white p-4 border-b border-gray-200 gap-4">
        <div className="flex-1">
          <h3 className="text-action-primary font-semibold mb-2">Bill To</h3>
          <div className="mb-2">
            <CustomerAutocomplete
              value={selectedOrder.customer_id || ""}
              onChange={(newValue) =>
                setSelectedOrder((prev) => ({ ...prev, customer_id: newValue }))
              }
              onSelectCustomer={(customer) => {
                setSelectedOrder((prev) => ({
                  ...prev,
                  customer_id: customer.customer_id,
                  contact_email: customer.contact_email || prev.contact_email || "",
                  contact_phone: customer.contact_phone || prev.contact_phone || "",
                }));
                toast.success("Customer details loaded");
              }}
              customers={customersList}
              placeholder="Enter customer ID"
            />
          </div>
          <input
            type="email"
            value={selectedOrder.contact_email || ""}
            onChange={(e) =>
              setSelectedOrder((prev) => ({ ...prev, contact_email: e.target.value }))
            }
            placeholder="Email"
            className="w-full border border-gray-300 rounded px-2 py-1 mb-2"
          />
          <input
            type="text"
            value={selectedOrder.contact_phone || ""}
            onChange={(e) =>
              setSelectedOrder((prev) => ({ ...prev, contact_phone: e.target.value }))
            }
            placeholder="Phone"
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <div className="flex-1">
          <h3 className="text-action-primary font-semibold mb-2">Order Info</h3>
          <p><span className="font-semibold">Table:</span> {tablesMap[selectedOrder.table_id]?.name || "N/A"}</p>
          <p><span className="font-semibold">Type:</span> {selectedOrder.mode || "Dine-In"}</p>
          <p><span className="font-semibold">Order ID:</span> #{selectedOrder.id}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto bg-bg-primary p-4 border-b border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-orange-100 text-action-primary font-semibold">
            <tr>
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {selectedOrder.items.map((item, idx) => (
              <tr key={idx} className="border-b hover:bg-orange-50">
                <td className="p-2">{item.name}</td>
                <td className="p-2 text-right">{item.quantity ?? 0}</td>
                <td className="p-2 text-right">₹{(item.unit_price ?? 0).toFixed(2)}</td>
                <td className="p-2 text-right">₹{((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td colSpan={3} className="text-right p-2">Subtotal</td>
              <td className="text-right p-2">₹{orderSubtotal.toFixed(2)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={3} className="text-right p-2">Discount</td>
              <td className="text-right p-2">-₹{calculatedDiscount.toFixed(2)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={3} className="text-right p-2">GST ({taxPercent}%)</td>
              <td className="text-right p-2">₹{calculatedGST.toFixed(2)}
              </td>
            </tr>
            <tr className="font-bold text-lg bg-orange-50">
              <td colSpan={3} className="text-right p-2">TOTAL</td>
              <td className="text-right p-2">₹{calculatedTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div className="bg-bg-primary p-4 flex flex-col md:flex-row gap-4 border-b border-gray-200">
        <div className="flex-1 grid grid-cols-3 gap-2">
          <div>
            <label className="text-action-primary font-semibold">GST (%)</label>
            <input
              type="number"
              value={taxPercent}
              min="0"
              className="w-full border border-gray-300 rounded px-2 py-1"
              onChange={(e) => {
                setTaxPercent(Number(e.target.value));
                setGstManuallyEdited(true);
              }}
            />
          </div>
          <div>
            <label className="text-action-primary font-semibold">Discount</label>
            <input
              type="number"
              value={discount}
              min="0"
              className="w-full border border-gray-300 rounded px-2 py-1"
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-action-primary font-semibold">Type</label>
            <select
              value={discountIsPercent ? "percent" : "fixed"}
              onChange={(e) => setDiscountIsPercent(e.target.value === "percent")}
              className="w-full border border-gray-300 rounded px-2 py-1"
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex-1">
          <span className="text-action-primary font-semibold mb-1 block">Payment Status</span>
          <div className="flex gap-2 flex-wrap">
            {["Pending", "Paid", "Partial", "Due"].map((statusOption) => (
              <button
                key={statusOption}
                type="button"
                className={`px-3 py-1 rounded-md font-semibold border ${paymentStatus === statusOption
                  ? "bg-action-primary text-text-white border-action-primary"
                  : "bg-bg-primary text-action-primary border-action-primary hover:bg-orange-100"
                  }`}
                onClick={() => setPaymentStatus(statusOption)}
              >
                {statusOption}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-bg-primary p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="split-payment-toggle"
            className="accent-orange-500"
            checked={splitPaymentEnabled}
            onChange={() => {
              const newSplitEnabled = !splitPaymentEnabled;
              setSplitPaymentEnabled(newSplitEnabled);
              if (newSplitEnabled) setPaymentSplits([{ method: "Cash", amount: total }]);
              else setPaymentSplits([{ method, amount: total }]);
            }}
          />
          <label htmlFor="split-payment-toggle" className="font-semibold text-action-primary">
            Enable Split Payment
          </label>
        </div>

        {splitPaymentEnabled ? (
          <div className="space-y-2">
            {paymentSplits.map((split, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={split.method}
                  onChange={(e) => {
                    const newSplits = [...paymentSplits];
                    newSplits[idx].method = e.target.value;
                    setPaymentSplits(newSplits);
                  }}
                  className="border border-gray-300 rounded px-2 py-1"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Due</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={split.amount}
                  onChange={(e) => updateSplitAmount(idx, e.target.value)}
                  onBlur={() => onSplitAmountBlur()}
                  className="border border-gray-300 rounded px-2 py-1 w-24"
                  placeholder="Amount"
                />
                <button
                  type="button"
                  onClick={() => removeSplitRow(idx)}
                  className="text-action-primary font-bold px-2 py-1 rounded hover:bg-red-50"
                  disabled={paymentSplits.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSplitRow}
              className="bg-action-primary text-text-white px-3 py-1 rounded hover:bg-action-primary"
            >
              + Add Payment Method
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPaymentSplits([{ method: e.target.value, amount: total }]);
              }}
              className="border border-gray-300 rounded px-2 py-1"
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Due</option>
            </select>
            <input
              type="number"
              value={total}
              readOnly
              className="border border-gray-300 rounded px-2 py-1 bg-gray-50 w-32 cursor-not-allowed"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-bg-primary p-4 flex gap-4 justify-end border-t border-gray-200">
        <button
          onClick={saveInvoiceDraft}
          disabled={saving}
          className="bg-action-primary text-text-white px-4 py-2 rounded hover:bg-action-primary"
        >
          {saving ? "Saving..." : "💾 Save Bill"}
        </button>
        <button
          onClick={printInvoice}
          disabled={!selectedOrder || !selectedOrder.items?.length}
          className="bg-bg-primary text-action-primary border border-action-primary px-4 py-2 rounded hover:bg-orange-50"
        >
          📄 Download PDF
        </button>
      </div>
    </>
  );


  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden flex flex-col md:flex-row">

        {/* Orders Sidebar */}
        <aside className="w-full md:w-80 border-r border-gray-200">
          <div className="bg-action-primary text-text-white p-4">
            <h2 className="text-lg font-semibold">📋 Today's Orders</h2>
          </div>

          <div className="overflow-y-auto h-[calc(100vh-6rem)] p-2 space-y-2 bg-bg-primary">
            {loading && (
              <p className="text-gray-500 text-sm text-center mt-4">Loading orders...</p>
            )}
            {!loading && orders.length === 0 && (
              <p className="text-gray-400 text-sm text-center mt-4">No served orders today</p>
            )}

            {orders.map((order) => {
              const tableName = tablesMap[order.table_id]?.name || `Table ${order.table_id}`;
              const itemsWithPrice = (order.items || []).map((item) => ({
                ...item,
                unit_price: item.unit_price ?? item.price ?? inventoryMap[item.item_id]?.unit_price ?? 0,
              }));
              const orderTotal = Number(order.total_price ?? 0);

              const isSelected = selectedOrder?.id === order.id;

              return (
                <div
                  key={order.id}
                  tabIndex={0}
                  role="button"
                  className={`p-3 rounded-lg cursor-pointer border transition-all ${isSelected
                    ? "bg-orange-100 border-orange-400"
                    : "bg-bg-primary border-gray-200 hover:bg-orange-50"
                    }`}
                  onClick={() => handleSelectOrder(order)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectOrder(order);
                    }
                  }}
                  aria-pressed={isSelected}
                >
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-semibold text-action-primary">{tableName}</h4>
                    <div className="font-semibold text-gray-700">₹{orderTotal.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Order #{order.id}</span>
                    <time dateTime={order.created_at}>
                      {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Invoice Section */}
        <main className="flex-1 overflow-y-auto">
          {isMobile ? (
            <>
              {invoiceModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-20 z-50">
                  <div className="bg-bg-primary rounded-lg shadow-lg w-full max-w-3xl p-6 relative">
                    <button
                      className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                      type="button"
                      onClick={() => setInvoiceModalOpen(false)}
                    >
                      ×
                    </button>
                    {renderInvoiceContent()}
                  </div>
                </div>
              )}
            </>
          ) : selectedOrder ? (
            <section className="bg-white p-6 rounded-lg shadow">{renderInvoiceContent()}</section>
          ) : (
            <section className="flex justify-center items-center h-full text-gray-400 text-center">
              <p className="text-lg">📋 Select an order to view invoice details</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );

}


