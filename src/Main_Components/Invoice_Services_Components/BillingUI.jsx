import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import CustomerAutocomplete from './CustomerAutocomplete'

export default function BillingPage() {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");
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
  const isMobile = window.innerWidth <= 700;
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [customersList, setCustomersList] = useState([]);
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

      // Extract unique customers with their details
      const customersMap = new Map();

      invoices.forEach(inv => {
        if (inv.customer_id) {
          // Keep the most recent record for each customer
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

      // Convert map to array and sort by customer_id
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
  const subtotal =
    selectedOrder?.items?.reduce((sum, item) => sum + safeNum(item.unit_price) * safeNum(item.quantity), 0) || 0;
  const taxAmount = (taxPercent / 100) * subtotal;
  const discountAmount = discountIsPercent ? (discount / 100) * subtotal : discount;
  const total = Number((subtotal + taxAmount - discountAmount).toFixed(2));

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

  const onSinglePaymentAmountChange = (val) => {
    let num = Number(val);
    if (isNaN(num) || num < 0) num = 0;
    setSinglePaymentAmount(num);
    updateBalance(num);
    setPaymentSplits([{ method, amount: num }]);
  };

  const fetchCustomerDetails = async (customerId) => {
    if (!customerId || customerId.trim() === "") return;

    // First check in the local customersList
    const localCustomer = customersList.find(c => c.customer_id === customerId);

    if (localCustomer) {
      setSelectedOrder(prev => ({
        ...prev,
        customer_id: customerId,
        contact_email: localCustomer.contact_email || prev.contact_email || "",
        contact_phone: localCustomer.contact_phone || prev.contact_phone || ""
      }));
      toast.success("Customer details loaded");
      return;
    }

    // If not found locally, fetch from API (existing code)
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { client_id: clientId }
        }
      );

      const invoices = res.data?.data || [];
      const customerInvoice = invoices
        .filter(inv => inv.customer_id === customerId && (inv.contact_email || inv.contact_phone))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      if (customerInvoice) {
        setSelectedOrder(prev => ({
          ...prev,
          customer_id: customerId,
          contact_email: customerInvoice.contact_email || prev.contact_email || "",
          contact_phone: customerInvoice.contact_phone || prev.contact_phone || ""
        }));
        toast.success("Customer details loaded");

        // Add to customersList for future use
        setCustomersList(prev => {
          const exists = prev.find(c => c.customer_id === customerId);
          if (!exists) {
            return [...prev, {
              customer_id: customerId,
              contact_email: customerInvoice.contact_email || "",
              contact_phone: customerInvoice.contact_phone || "",
              created_at: customerInvoice.created_at
            }];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Failed to fetch customer details:", err);
    }
  };

  useEffect(() => {
    if (selectedOrder && isMobile) setInvoiceModalOpen(true);
  }, [selectedOrder]);

  const closeModal = () => setInvoiceModalOpen(false);

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

    const totalVal = Number((combinedItems.reduce(
      (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
      0
    )).toFixed(2));

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

    loadGSTDiscountFromStorage(order.id);
  };

  const loadGSTDiscountFromStorage = (orderId) => {
    try {
      const key = `billing_${orderId}_gst_discount`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.taxPercent === "number") setTaxPercent(parsed.taxPercent);
        if (typeof parsed.discount === "number") setDiscount(parsed.discount);
        if (typeof parsed.discountIsPercent === "boolean")
          setDiscountIsPercent(parsed.discountIsPercent);
      } else {
        setTaxPercent(18);
        setDiscount(0);
        setDiscountIsPercent(true);
      }
    } catch (e) {
      setTaxPercent(18);
      setDiscount(0);
      setDiscountIsPercent(true);
    }
  };

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
        subtotal: Number(subtotal.toFixed(2)),
        tax_amount: Number(taxAmount.toFixed(2)),
        discount_amount: Number(discountAmount.toFixed(2)),
        total_amount: Number(total.toFixed(2)),
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
      let y = 40;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("INVOICE", 40, y);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice No: ${currentInvoiceNumber}`, 400, y);
      doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, 400, y + 15);
      y += 40;

      doc.setFont("helvetica", "bold");
      doc.text(clientId.toUpperCase(), 40, y);
      doc.setFont("helvetica", "normal");
      doc.text(localStorage.getItem("restaurant_address") || "N/A", 40, y + 15);
      y += 40;

      doc.setDrawColor(180);
      doc.line(40, y, 550, y);
      y += 20;

      doc.setFont("helvetica", "bold");
      doc.text("Bill To", 40, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Customer ID: ${selectedOrder.customer_id || "-"}`, 40, y + 20);
      doc.text(`Phone: ${selectedOrder.contact_phone || "-"}`, 40, y + 35);
      doc.text(`Email: ${selectedOrder.contact_email || "-"}`, 40, y + 50);
      doc.text(`Table: ${tablesMap[selectedOrder.table_id]?.name || "N/A"}`, 300, y + 20);
      doc.text(`Type: ${selectedOrder.mode || "Dine-In"}`, 300, y + 35);
      y += 80;

      doc.setDrawColor(180);
      doc.line(40, y, 550, y);
      y += 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Order Details", 40, y);
      y += 20;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Item", 40, y);
      doc.text("Qty", 250, y);
      doc.text("Unit Price", 320, y);
      doc.text("Amount", 420, y);
      y += 10;
      doc.setDrawColor(200);
      doc.line(40, y, 550, y);
      y += 15;

      doc.setFont("helvetica", "normal");
      selectedOrder.items.forEach((item) => {
        doc.text(item.name || "Unnamed", 40, y);
        doc.text(`${item.quantity || 0}`, 250, y);
        doc.text(`Rs.${(item.unit_price ?? 0).toFixed(2)}`, 320, y);
        doc.text(`Rs.${((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}`, 420, y);
        y += 20;
      });

      y += 10;
      doc.setDrawColor(180);
      doc.line(40, y, 550, y);
      y += 20;

      doc.setFont("helvetica", "normal");
      doc.text(`Subtotal: Rs.${subtotal.toFixed(2)}`, 400, y);
      y += 20;
      doc.text(`Discount: -Rs.${discountAmount.toFixed(2)}`, 400, y);
      y += 20;
      doc.text(`GST: Rs.${taxAmount.toFixed(2)}`, 400, y);
      y += 25;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`TOTAL BILL: Rs.${total.toFixed(2)}`, 400, y);
      y += 40;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (splitPaymentEnabled && paymentSplits.length > 1) {
        doc.text("Payment Methods:", 40, y);
        y += 15;
        paymentSplits.forEach((split, idx) => {
          doc.text(`  ${idx + 1}. ${split.method}: Rs.${Number(split.amount).toFixed(2)}`, 50, y);
          y += 15;
        });
      } else {
        const paymentMethod = splitPaymentEnabled && paymentSplits.length > 0 ? paymentSplits[0].method : method;
        const paymentAmount = splitPaymentEnabled && paymentSplits.length > 0 ? paymentSplits[0].amount : total;
        doc.text(`Payment Method: ${paymentMethod}`, 40, y);
        y += 15;
        doc.text(`Amount: Rs.${Number(paymentAmount).toFixed(2)}`, 40, y);
        y += 15;
      }
      doc.text(`Payment Status: ${paymentStatus}`, 40, y);
      y += 40;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text(`${clientId.toUpperCase()} - Thank you for dining with us!`, 300, y, { align: "center" });

      doc.save(`Invoice_${currentInvoiceDraftId || "draft"}.pdf`);
      toast.success("Invoice PDF downloaded");
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

  return (
    <div className="Invoice-Main-COntainer">
      <div className="Invoice-container-page">
        <div className="inv--container">
          <div className="inv--header-row"></div>
          <div className="inv--main-row">
            <aside className="inv--orders-list" aria-label="Orders List">
              {loading && <p className="inv--loading-text">Loading orders...</p>}
              {!loading && orders.length === 0 && <p className="inv--empty-text">No served orders today</p>}
              {orders.map((order) => {
                const tableName = tablesMap[order.table_id]?.name || `Table ${order.table_id}`;
                const itemsWithPrice = (order.items || []).map((item) => ({
                  ...item,
                  unit_price: item.unit_price ?? item.price ?? inventoryMap[item.item_id]?.unit_price ?? 0,
                }));

                const orderTotal = itemsWithPrice.reduce(
                  (sum, item) => sum + (item.unit_price * (item.quantity || 1)),
                  0
                );

                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    tabIndex={0}
                    role="button"
                    className={`inv--order-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectOrder(order)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectOrder(order);
                      }
                    }}
                    aria-pressed={isSelected}
                  >
                    <h4>{tableName}</h4>
                    <div>Order #{order.id}</div>
                    <div className="inv--order-total">₹{orderTotal.toFixed(2)}</div>
                    <time dateTime={order.created_at} className="inv--served-time" title={new Date(order.created_at).toLocaleString()}>
                      Served at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                );
              })}
            </aside>

            {isMobile ? (
              <>
                {invoiceModalOpen && selectedOrder && (
                  <div className="inv--modal-overlay" role="dialog" aria-modal="true">
                    <section ref={invoiceRef} className="inv--invoice-panel inv--modal" aria-label="Invoice Details">
                      <button className="inv--modal-close" type="button" aria-label="Close Invoice" onClick={() => setInvoiceModalOpen(false)}>
                        &times;
                      </button>
                      <div className="inv--invoice-header">
                        <h1>{clientId}</h1>
                        <h2>INVOICE</h2>
                        <div className="inv--document-info">
                          <span className="inv--document-number">{documentNumber || "Draft"}</span>
                          <hr/>
                          <span className="inv--document-date">{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="inv--bill-shipping">
                        <div className="inv--bill-to">
                          <h3>Bill To</h3>
                          <label>
                            Customer ID
                            <CustomerAutocomplete
                              value={selectedOrder.customer_id || ""}
                              onChange={(newValue) => {
                                setSelectedOrder((prev) => ({ ...prev, customer_id: newValue }));
                              }}
                              onSelectCustomer={(customer) => {
                                setSelectedOrder((prev) => ({
                                  ...prev,
                                  customer_id: customer.customer_id,
                                  contact_email: customer.contact_email || prev.contact_email || "",
                                  contact_phone: customer.contact_phone || prev.contact_phone || ""
                                }));
                                toast.success("Customer details loaded");
                              }}
                              customers={customersList}
                              placeholder="Enter customer ID"
                            />
                          </label>

                          <label>
                            Email
                            <input type="email" value={selectedOrder.contact_email || ""}
                              onChange={(e) => setSelectedOrder((prev) => ({ ...prev, contact_email: e.target.value }))}
                              className="inv--input"
                              placeholder="customer@email.com" />
                          </label>
                          <label>
                            Phone
                            <input type="text" value={selectedOrder.contact_phone || ""}
                              onChange={(e) => setSelectedOrder((prev) => ({ ...prev, contact_phone: e.target.value }))}
                              className="inv--input"
                              placeholder="+91 XXXXXXXXXX" />
                          </label>
                        </div>
                        <div className="inv--shipping-info">
                          <h3>Shipping Info</h3>
                          <p>Table: {tablesMap[selectedOrder.table_id]?.name || "N/A"}</p>
                        </div>
                      </div>

                      <table className="inv--table" aria-label="Invoice Items">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th className="right-align">Quantity</th>
                            <th className="right-align">Unit Price</th>
                            <th className="right-align">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.name}</td>
                              <td className="right-align">{item.quantity ?? 0}</td>
                              <td className="right-align">₹{(item.unit_price ?? 0).toFixed(2)}</td>
                              <td className="right-align">₹{((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="inv--summary-row">
                            <td colSpan={3} className="right-align">Subtotal</td>
                            <td className="right-align">₹{subtotal.toFixed(2)}</td>
                          </tr>
                          <tr className="inv--summary-row">
                            <td colSpan={3} className="right-align">Discount</td>
                            <td className="right-align">-₹{discountAmount.toFixed(2)}</td>
                          </tr>
                          <tr className="inv--summary-row">
                            <td colSpan={3} className="right-align">GST</td>
                            <td className="right-align">₹{taxAmount.toFixed(2)}</td>
                          </tr>
                          <tr className="inv--summary-row inv--total-row">
                            <td colSpan={3} className="right-align">Total</td>
                            <td className="right-align">₹{total.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="inv--controls">
                        <label>
                          GST (%)<br />
                          <input type="number" value={taxPercent} onChange={e => setTaxPercent(Number(e.target.value))} className="inv--input" />
                        </label>
                        <label>
                          Discount<br />
                          <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="inv--input" />
                        </label>
                        <label>
                          <select value={discountIsPercent ? "percent" : "fixed"} onChange={e => setDiscountIsPercent(e.target.value === "percent")} className="inv--select">
                            <option value="percent">%</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </label>

                        <div className="inv--payment-status-buttons">
                          <span>Payment Status:</span>
                          {["Pending", "Paid", "Partial", "Due"].map(s => (
                            <button key={s} type="button" className={`inv--status-btn ${paymentStatus === s ? "active" : ""}`} onClick={() => setPaymentStatus(s)}>{s}</button>
                          ))}
                        </div>

                        <label>
                          <input type="checkbox" checked={splitPaymentEnabled} onChange={() => {
                            const newSplitEnabled = !splitPaymentEnabled;
                            setSplitPaymentEnabled(newSplitEnabled);
                            if (newSplitEnabled) {
                              setPaymentSplits([{ method: "Cash", amount: total }]);
                            } else {
                              setSinglePaymentAmount(total);
                              setPaymentSplits([{ method: method, amount: total }]);
                              setBalanceAmount(0);
                            }
                          }} />
                          Enable Split Payment
                        </label>

                        {splitPaymentEnabled ? (
                          <div className="inv--split-payments">
                            {paymentSplits.map((split, idx) => (
                              <div key={idx} className="inv--split-row">
                                <select value={split.method} onChange={e => {
                                  const newSplits = [...paymentSplits]; newSplits[idx].method = e.target.value; setPaymentSplits(newSplits);
                                }}>
                                  <option>Cash</option><option>UPI</option><option>Card</option><option>Due</option>
                                </select>
                                <input type="number" value={split.amount} onChange={e => updateSplitAmount(idx, e.target.value)} />
                                <button type="button" onClick={() => removeSplitRow(idx)}>&times;</button>
                              </div>
                            ))}
                            <button type="button" onClick={addSplitRow}>Add Payment Method</button>
                          </div>
                        ) : (
                          <div>
                            <label>Payment Method
                              <select value={method} onChange={e => {
                                setMethod(e.target.value);
                                setPaymentSplits([{ method: e.target.value, amount: total }])
                              }}>
                                <option>Cash</option><option>UPI</option><option>Card</option><option>Due</option>
                              </select>
                            </label>
                            <label>Total Amount
                              <input type="number" value={total} readOnly style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }} />
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="inv--actions">
                        <button onClick={saveInvoiceDraft}>Save Bill</button>
                        <button onClick={printInvoice} className="inv--btn-success" type="button">
                          Download PDF / Print
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </>
            ) : selectedOrder ? (
              <section ref={invoiceRef} className="inv--invoice-panel" aria-label="Invoice Details">
                <div className="inv--invoice-header">
                  <h1>{clientId}</h1>
                  <h2>INVOICE</h2>
                  <div className="inv--document-info">
                    <span className="inv--document-number">{documentNumber || "Draft"}</span>
                    <hr />
                    <span className="inv--document-date">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="inv--bill-shipping">
                  <div className="inv--bill-to">
                    <h3>Bill To</h3>
                    <label>
  Customer ID
  <CustomerAutocomplete
    value={selectedOrder.customer_id || ""}
    onChange={(newValue) => {
      setSelectedOrder((prev) => ({ ...prev, customer_id: newValue }));
    }}
    onSelectCustomer={(customer) => {
      setSelectedOrder((prev) => ({
        ...prev,
        customer_id: customer.customer_id,
        contact_email: customer.contact_email || prev.contact_email || "",
        contact_phone: customer.contact_phone || prev.contact_phone || ""
      }));
      toast.success("Customer details loaded");
    }}
    customers={customersList}
    placeholder="Enter customer ID"
  />
</label>

                    <label>
                      Email
                      <input
                        type="email"
                        value={selectedOrder.contact_email || ""}
                        onChange={(e) => setSelectedOrder((prev) => ({ ...prev, contact_email: e.target.value }))}
                        className="inv--input"
                        placeholder="customer@email.com"
                      />
                    </label>
                    <label>
                      Phone
                      <input
                        type="text"
                        value={selectedOrder.contact_phone || ""}
                        onChange={(e) => setSelectedOrder((prev) => ({ ...prev, contact_phone: e.target.value }))}
                        className="inv--input"
                        placeholder="+91 XXXXXXXXXX"
                      />
                    </label>
                  </div>
                  <div className="inv--shipping-info">
                    <h3>Shipping Info</h3>
                    <p>Table: {tablesMap[selectedOrder.table_id]?.name || "N/A"}</p>
                  </div>
                </div>

                <table className="inv--table" aria-label="Invoice Items">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="right-align">Quantity</th>
                      <th className="right-align">Unit Price</th>
                      <th className="right-align">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td className="right-align">{item.quantity ?? 0}</td>
                        <td className="right-align">₹{(item.unit_price ?? 0).toFixed(2)}</td>
                        <td className="right-align">₹{((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="inv--summary-row">
                      <td colSpan={3} className="right-align">Subtotal</td>
                      <td className="right-align">₹{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr className="inv--summary-row">
                      <td colSpan={3} className="right-align">Discount</td>
                      <td className="right-align">-₹{discountAmount.toFixed(2)}</td>
                    </tr>
                    <tr className="inv--summary-row">
                      <td colSpan={3} className="right-align">GST</td>
                      <td className="right-align">₹{taxAmount.toFixed(2)}</td>
                    </tr>
                    <tr className="inv--summary-row inv--total-row">
                      <td colSpan={3} className="right-align">Total</td>
                      <td className="right-align">₹{total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="inv--controls">
                  <label>
                    GST (%)<br />
                    <input
                      type="number"
                      value={taxPercent}
                      min="0"
                      className="inv--input"
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Discount<br />
                    <input
                      type="number"
                      value={discount}
                      min="0"
                      className="inv--input discount-input"
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    <select
                      value={discountIsPercent ? "percent" : "fixed"}
                      onChange={(e) => setDiscountIsPercent(e.target.value === "percent")}
                      className="inv--select"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </label>
                  <div className="inv--payment-status-buttons">
                    <span>Payment Status:</span>
                    {["Pending", "Paid", "Partial", "Due"].map((statusOption) => (
                      <button
                        key={statusOption}
                        type="button"
                        className={`inv--status-btn ${paymentStatus === statusOption ? "active" : ""}`}
                        onClick={() => setPaymentStatus(statusOption)}
                      >
                        {statusOption}
                      </button>
                    ))}
                  </div>

                  <label className="inv--checkbox-label">
                    <input
                      type="checkbox"
                      checked={splitPaymentEnabled}
                      onChange={() => {
                        const newSplitEnabled = !splitPaymentEnabled;
                        setSplitPaymentEnabled(newSplitEnabled);
                        if (newSplitEnabled) {
                          setPaymentSplits([{ method: "Cash", amount: total }]);
                        } else {
                          setSinglePaymentAmount(total);
                          setPaymentSplits([{ method: method, amount: total }]);
                          setBalanceAmount(0);
                        }
                      }}
                    />
                    Enable Split Payment
                  </label>
                </div>

                {splitPaymentEnabled ? (
                  <div className="inv--split-payments">
                    {paymentSplits.map((split, idx) => (
                      <div key={idx} className="inv--split-row">
                        <select
                          value={split.method}
                          onChange={(e) => {
                            const newSplits = [...paymentSplits];
                            newSplits[idx].method = e.target.value;
                            setPaymentSplits(newSplits);
                          }}
                          className="inv--select"
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
                          onBlur={() => onSplitAmountBlur(idx)}
                          className="inv--input split-amount"
                          placeholder="Amount"
                        />
                        <button
                          type="button"
                          onClick={() => removeSplitRow(idx)}
                          aria-label={`Remove payment split ${idx + 1}`}
                          className="inv--btn-remove"
                          disabled={paymentSplits.length === 1}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <button type="button" className="inv--btn-add" onClick={addSplitRow}>
                      Add Payment Method
                    </button>
                  </div>
                ) : (
                  <div className="inv--single-payment">
                    <label>
                      Payment Method
                      <select
                        value={method}
                        onChange={(e) => {
                          setMethod(e.target.value);
                          setPaymentSplits([{ method: e.target.value, amount: total }]);
                        }}
                        className="inv--select"
                      >
                        <option>Cash</option>
                        <option>UPI</option>
                        <option>Card</option>
                        <option>Due</option>
                      </select>
                    </label>
                    <label>
                      Total Amount
                      <input
                        type="number"
                        value={total}
                        readOnly
                        className="inv--input"
                        style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                      />
                    </label>
                  </div>
                )}

                <div className="inv--actions">
                  <button
                    onClick={saveInvoiceDraft}
                    disabled={saving}
                    className="inv--btn-pri"
                    type="button"
                  >
                    {saving ? "Saving..." : "Save Bill"}
                  </button>
                  <button
                    onClick={printInvoice}
                    disabled={!selectedOrder || !selectedOrder.items?.length}
                    className="inv--btn-success"
                    type="button"
                  >
                    Download PDF / Print
                  </button>
                </div>
              </section>
            ) : (
              <section className="inv--invoice-placeholder">
                <p>Select an order to view invoice details</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}