import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import CustomerAutocomplete from './CustomerAutocomplete';


export default function BillingPage({ clientId, token }) {
  const invoiceRef = useRef(null);
  const navigate = useNavigate();

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
        const todayOrders = (ordersRes.data?.data || []).filter(
          (o) => new Date(o.created_at).toDateString() === new Date().toDateString()
        );
        setOrders(todayOrders);
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
    setInvoiceModalOpen(true);

    const totalVal = Number(order.total_price ?? 0);

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

  useEffect(() => {
    if (!selectedOrder) return;

    if (!splitPaymentEnabled) {
      setPaymentSplits([{ method, amount: total }]);
      setSinglePaymentAmount(total);
      setBalanceAmount(0);
    } else {
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
          status: "served",
          invoice_status: paymentStatus.toLowerCase(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Invoice draft saved!");
      // setTimeout(() => {
      //   navigate(`/saas/${clientId}/orders`);
      // }, 1000);

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

  const renderInvoiceContent = () => (
    <div className="flex flex-col h-full bg-bg-primary">

      {/* Header with Order Info */}
      <div className="bg-action-primary px-4 py-3 shadow-lg flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-text-white font-bold text-lg shadow-md border border-white/30">
              {clientId.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-white">{clientId.toUpperCase()}</h1>
              <p className="text-text-white/80 text-xs">Invoice #{documentNumber || "Draft"}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-text-white/80">Table: {tablesMap[selectedOrder.table_id]?.name}</div>
              <div className="text-xs text-text-white/80">Order #{selectedOrder.id} • {selectedOrder.mode}</div>
            </div>
            <div className="text-right text-text-white">
              <div className="text-xs font-medium">{new Date().toLocaleDateString()}</div>
              <div className="text-xs text-text-white/80">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* LEFT - Items */}
          <div className="lg:col-span-7">
            <div className="bg-bg-primary rounded-xl shadow-md border border-gray-200">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-xl">
                <h2 className="text-sm font-bold text-text-black">Order Items</h2>
              </div>

              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start py-2 px-3 rounded-lg border border-gray-100 hover:border-action-primary hover:bg-indigo-50/50 transition-all">
                    <div className="flex-1">
                      <div className="font-semibold text-text-black text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                          {item.quantity}x
                        </span>
                        <span>@ ₹{item.unit_price?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="font-bold text-text-black">
                      ₹{((item.unit_price || 0) * (item.quantity || 0)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 rounded-b-xl">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">₹{orderSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span className="font-semibold">-₹{calculatedDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST ({taxPercent}%)</span>
                    <span className="font-semibold">₹{calculatedGST.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between items-center">
                    <span className="text-base font-bold text-text-black">TOTAL</span>
                    <span className="text-lg font-bold text-action-primary">
                      ₹{calculatedTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT - Customer & Payment */}
          <div className="lg:col-span-5 space-y-4">

            {/* Customer Details */}
            <div className="bg-bg-primary rounded-xl shadow-md border border-gray-200">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-xl">
                <h3 className="text-sm font-bold text-text-black">👤 Customer</h3>
              </div>
              <div className="p-3 space-y-2">
                <CustomerAutocomplete
                  value={selectedOrder.customer_id || ""}
                  onChange={(val) => setSelectedOrder((p) => ({ ...p, customer_id: val }))}
                  onSelectCustomer={(c) => {
                    setSelectedOrder((p) => ({
                      ...p,
                      customer_id: c.customer_id,
                      contact_email: c.contact_email || "",
                      contact_phone: c.contact_phone || "",
                    }));
                  }}
                  customers={customersList}
                  placeholder="Walk-in / Customer ID"
                />
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-action-primary focus:border-action-primary transition-all"
                  placeholder="📞 Phone"
                  value={selectedOrder.contact_phone || ""}
                  onChange={(e) => setSelectedOrder((p) => ({ ...p, contact_phone: e.target.value }))}
                />
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-action-primary focus:border-action-primary transition-all"
                  placeholder="📧 Email"
                  value={selectedOrder.contact_email || ""}
                  onChange={(e) => setSelectedOrder((p) => ({ ...p, contact_email: e.target.value }))}
                />
              </div>
            </div>

            {/* Tax & Discount */}
            <div className="bg-bg-primary rounded-xl shadow-md border border-gray-200">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-xl">
                <h3 className="text-sm font-bold text-text-black">⚙️ Tax & Discount</h3>
              </div>
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">GST (%)</label>
                    <input
                      type="number"
                      value={taxPercent}
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-action-primary"
                      onChange={(e) => {
                        setTaxPercent(Number(e.target.value));
                        setGstManuallyEdited(true);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Discount</label>
                    <input
                      type="number"
                      value={discount}
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-action-primary"
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Type</label>
                    <select
                      value={discountIsPercent ? "percent" : "fixed"}
                      onChange={(e) => setDiscountIsPercent(e.target.value === "percent")}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-action-primary bg-bg-primary"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">₹</option>
                    </select>
                  </div>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Payment Status</label>
                  <div className="flex gap-2 flex-wrap">
                    {["Pending", "Paid", "Partial", "Due"].map((statusOption) => (
                      <button
                        key={statusOption}
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${paymentStatus === statusOption
                            ? "bg-action-primary text-text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
            <div className="bg-bg-primary rounded-xl shadow-md border border-gray-200">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-xl flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-black">💳 Payment</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-action-primary rounded"
                    checked={splitPaymentEnabled}
                    onChange={() => {
                      const newSplitEnabled = !splitPaymentEnabled;
                      setSplitPaymentEnabled(newSplitEnabled);
                      if (newSplitEnabled) setPaymentSplits([{ method: "Cash", amount: total }]);
                      else setPaymentSplits([{ method, amount: total }]);
                    }}
                  />
                  <span className="text-xs font-medium text-gray-600">Split</span>
                </label>
              </div>

              <div className="p-3">
                {splitPaymentEnabled ? (
                  <div className="space-y-2">
                    {paymentSplits.map((split, idx) => (
                      <div key={idx} className="flex gap-2 items-center p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <select
                          value={split.method}
                          onChange={(e) => {
                            const newSplits = [...paymentSplits];
                            newSplits[idx].method = e.target.value;
                            setPaymentSplits(newSplits);
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-action-primary bg-bg-primary"
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
                          className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-action-primary"
                        />
                        <button
                          type="button"
                          onClick={() => removeSplitRow(idx)}
                          className="text-red-600 hover:bg-red-50 font-bold px-2 py-1 rounded-lg"
                          disabled={paymentSplits.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addSplitRow}
                      className="w-full bg-action-primary hover:bg-action-primary/90 text-text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all"
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
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-action-primary bg-bg-primary"
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
                      className="w-28 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-sm font-semibold text-right"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={saveInvoiceDraft}
                disabled={saving}
                className="flex-1 bg-action-primary hover:bg-action-primary/90 text-text-white px-4 py-2.5 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "💾 Save"}
              </button>
              <button
                onClick={printInvoice}
                className="flex-1 bg-bg-primary border-2 border-action-primary hover:border-action-primary hover:bg-indigo-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all shadow-md"
              >
                📄 Print
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 p-4">
      <div className="max-w-8xl mx-auto">

        {/* Header */}
        <div className="bg-action-primary rounded-2xl shadow-xl px-6 py-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-text-white font-bold text-xl shadow-md border border-white/30">
                {clientId.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-white">{clientId.toUpperCase()}</h1>
                <p className="text-text-white/80 text-sm">Today's Orders</p>
              </div>
            </div>
            <div className="text-text-white text-right">
              <div className="text-sm font-medium">{new Date().toLocaleDateString()}</div>
              <div className="text-xs text-text-white/80">{orders.length} served orders</div>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 text-sm mt-4">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-bg-primary rounded-2xl shadow-lg">
            <div className="text-7xl mb-4">📭</div>
            <p className="text-xl font-bold text-text-black mb-2">No Orders Yet</p>
            <p className="text-gray-500">No served orders for today</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const tableName = tablesMap[order.table_id]?.name || `Table ${order.table_id}`;
              const orderTotal = Number(order.total_price ?? 0);

              return (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className="bg-bg-primary rounded-xl shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-action-primary p-4 cursor-pointer transition-all duration-200 hover:scale-105"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-text-black">{tableName}</h3>
                      <p className="text-xs text-gray-500">Order #{order.id}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-action-primary">₹{orderTotal.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {order.mode || "Dine-In"}
                    </span>
                    <span className="text-gray-400 text-xs">{order.items?.length || 0} items</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Invoice Modal */}
        {invoiceModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col relative">
              <button
                className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-2xl font-bold w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md bg-bg-primary"
                onClick={() => setInvoiceModalOpen(false)}
              >
                ×
              </button>
              {renderInvoiceContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}