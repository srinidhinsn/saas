import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import CustomerAutocomplete from './CustomerAutocomplete';
import { X, Save, Printer } from 'lucide-react';
import RazorpayPayment from "../../Constants/RazorPay/RazorpayPayment";

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
  const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

  const updateBalance = (sumOfPayments) => {
    const bal = total - sumOfPayments;
    setBalanceAmount(bal < 0 ? 0 : Number(bal.toFixed(2)));
  };

  // 1️⃣ Subtotal
  const orderSubtotal = Number(
    (selectedOrder?.items || []).reduce(
      (sum, item) =>
        sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
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

  // 5️⃣ Final Total
  const calculatedTotal = Number(
    (amountAfterTax - calculatedDiscount).toFixed(2)
  );

  const total = calculatedTotal;

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

  useEffect(() => {
    if (clientId && token) {
      fetchUniqueCustomers();
    }
  }, [clientId, token]);

  useEffect(() => {
    const loadInvoiceDraft = async () => {
      if (!initialOrder) return;

      const invoiceDraft = await fetchInvoiceDraft(initialOrder.id);

      setInvoiceDraftId(invoiceDraft?.id ?? null);
      setStatus(invoiceDraft?.status ?? "Draft");
      setDocumentNumber(invoiceDraft?.document_number ?? "");
      setPaymentStatus(invoiceDraft?.payment_status ?? "Pending");

      const totalVal = Number(initialOrder.total_price ?? 0);

      if (Array.isArray(invoiceDraft?.payment_method) && invoiceDraft.payment_method.length > 0) {
        if (invoiceDraft.payment_method.length === 1) {
          setSplitPaymentEnabled(false);
          setPaymentSplits(invoiceDraft.payment_method);
          setMethod(invoiceDraft.payment_method[0].method || "Cash");
          const paidAmount = Number(invoiceDraft.payment_method[0].amount || totalVal);
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
      if (paymentSplits.length < 2) {
        toast.error("Add at least two payment methods for split payment");
        return;
      }

      const sumPayments = paymentSplits.reduce((sum, p) => sum + Number(p.amount), 0);
      const roundedSum = Number(sumPayments.toFixed(2));
      const roundedTotal = Number(total.toFixed(2));

      if (roundedSum < roundedTotal) {
        toast.error(`Split payment total ₹${roundedSum.toFixed(2)} is less than invoice total ₹${roundedTotal.toFixed(2)}`);
        return;
      }
      if (roundedSum > roundedTotal) {
        toast.error(`Split payment total ₹${roundedSum.toFixed(2)} exceeds invoice total ₹${roundedTotal.toFixed(2)}`);
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
        single_payment_amount: splitPaymentEnabled ? null : Number(paymentSplits[0]?.amount ?? total),  // ✅ also fixed here
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

      // Update table status to vacant after saving invoice
      if (selectedOrder.table_id) {
        try {
          const tableData = tablesMap[selectedOrder.table_id];
          await axios.post(
            `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
            {
              id: selectedOrder.table_id,
              client_id: clientId,
              name: tableData?.name || `Table ${selectedOrder.table_id}`,
              table_type: tableData?.table_type || "Regular",
              status: 'Vacant',
              location_zone: tableData?.location_zone || "Main"
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (tableErr) {
          console.error("Failed to update table status:", tableErr.response?.data || tableErr.message);
        }
      }

      toast.success("Invoice saved successfully!");
      return draftId;
    } catch (err) {
      console.error(err);
      toast.error("Failed to save invoice");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentClick = async () => {
    // Run validation + save — if validation fails, saveInvoiceDraft returns undefined
    let draftId = invoiceDraftId;

    if (!draftId) {
      try {
        draftId = await saveInvoiceDraft();
      } catch {
        // saveInvoiceDraft threw — error toast already shown inside
        return;
      }
    } else {
      // Draft exists but we still need to validate + update with latest values
      try {
        await saveInvoiceDraft();
      } catch {
        return;
      }
    }

    // If draftId is still null/undefined, validation blocked the save
    if (!draftId) return;

    const isOnlineMethod = (m) =>
      m === "razorpay_upi" || m === "razorpay_card";

    const needsRazorpay = splitPaymentEnabled
      ? paymentSplits.some(s => isOnlineMethod(s.method))
      : isOnlineMethod(method);
    if (needsRazorpay) {
      setShowRazorpayModal(true);
    } else {
      toast.success("Payment saved successfully!");
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
        const updated = await fetchInvoiceDraft(selectedOrder.id);
        if (updated?.id) {
          setInvoiceDraftId(updated.id);
          setPaymentStatus(updated.payment_status || "Paid");
        }
        if (updatedDraft) {
          setSelectedOrder(prev => ({
            ...prev,
            customer_id: updatedDraft.customer_id || prev.customer_id,
            contact_email: updatedDraft.contact_email || prev.contact_email,
            contact_phone: updatedDraft.contact_phone || prev.contact_phone
          }));
        }
      } catch {
        toast.error("Please save invoice before printing.");
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
        toast.error("Failed to generate invoice number");
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
        doc.text(`₹${(item.unit_price ?? 0).toFixed(2)}`, pageWidth - 180, y);
        doc.text(`₹${((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}`, pageWidth - 80, y);
        y += 20;
      });

      y += 15;

      doc.setDrawColor(200, 200, 200);
      doc.line(40, y, pageWidth - 40, y);
      y += 20;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Subtotal:", pageWidth - 200, y);
      doc.text(`₹${orderSubtotal.toFixed(2)}`, pageWidth - 80, y, { align: "right" });
      y += 18;

      doc.text("Discount:", pageWidth - 200, y);
      doc.setTextColor(239, 68, 68);
      doc.text(`-₹${calculatedDiscount.toFixed(2)}`, pageWidth - 80, y, { align: "right" });
      y += 18;

      doc.setTextColor(0, 0, 0);
      doc.text(`GST (${taxPercent}%):`, pageWidth - 200, y);
      doc.text(`₹${calculatedGST.toFixed(2)}`, pageWidth - 80, y, { align: "right" });
      y += 25;

      doc.setFillColor(239, 246, 255);
      doc.rect(pageWidth - 220, y - 12, 180, 30, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("TOTAL:", pageWidth - 200, y);
      doc.text(`₹${total.toFixed(2)}`, pageWidth - 80, y, { align: "right" });

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
          doc.text(`₹${Number(split.amount).toFixed(2)}`, 200, y);
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
      toast.error("Failed to generate invoice PDF");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-[1600px] h-[90vh] flex flex-col relative">
        <button
          className="absolute top-4 right-4 z-10 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary text-2xl font-bold w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md bg-bg-primary border border-border-default"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        <div className="flex flex-col h-full bg-bg-primary">
          {/* Header */}
          <div className="bg-action-primary px-6 py-4 shadow-lg flex-shrink-0 rounded-t-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-text-white font-bold text-xl shadow-md border border-white/30">
                  {clientId.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text-white">{clientId.toUpperCase()}</h1>
                  <p className="text-text-white/80 text-sm">Invoice #{documentNumber || "Draft"}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="text-text-white">
                  <div className="text-sm font-medium">Table: {tablesMap[selectedOrder.table_id]?.name}</div>
                  <div className="text-xs text-text-white/80">Order #{selectedOrder.id}</div>
                </div>
                <div className="text-text-white">
                  <div className="text-sm font-medium">{new Date().toLocaleDateString()}</div>
                  <div className="text-xs text-text-white/80">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* LEFT - Items (2/3 width on xl) */}
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-bg-primary rounded-xl shadow-lg border border-border-default">
                  <div className="px-5 py-3 bg-bg-tertiary border-b border-border-default rounded-t-xl">
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                      📦 Order Items
                    </h2>
                  </div>

                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3 px-4 rounded-lg bg-bg-tertiary border border-border-default hover:border-action-primary transition-all">
                        <div className="flex-1">
                          <div className="font-semibold text-text-primary">{item.name}</div>
                          <div className="text-sm text-text-secondary mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-primary text-text-primary font-medium text-xs">
                              {item.quantity}x
                            </span>
                            <span>@ ₹{item.unit_price?.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="font-bold text-text-primary text-lg">
                          ₹{((item.unit_price || 0) * (item.quantity || 0)).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-border-default bg-bg-tertiary px-5 py-4 rounded-b-xl">
                    <div className="space-y-2">
                      <div className="flex justify-between text-text-secondary">
                        <span>Subtotal</span>
                        <span className="font-semibold">₹{orderSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-action-danger">
                        <span>Discount</span>
                        <span className="font-semibold">-₹{calculatedDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-text-secondary">
                        <span>GST ({taxPercent}%)</span>
                        <span className="font-semibold">₹{calculatedGST.toFixed(2)}</span>
                      </div>
                      <div className="pt-3 border-t border-border-default flex justify-between items-center">
                        <span className="text-lg font-bold text-text-primary">TOTAL</span>
                        <span className="text-2xl font-bold text-action-primary">
                          ₹{calculatedTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT - Customer & Settings (1/3 width on xl) */}
              <div className="space-y-6">

                {/* Customer Details */}
                <div className="bg-bg-primary rounded-xl shadow-lg border border-border-default">
                  <div className="px-5 py-3 bg-bg-tertiary border-b border-border-default rounded-t-xl">
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                      👤 Customer
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
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
                      className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary focus:border-action-primary transition-all"
                      placeholder="📞 Phone"
                      value={selectedOrder.contact_phone || ""}
                      onChange={(e) => setSelectedOrder((p) => ({ ...p, contact_phone: e.target.value }))}
                    />
                    <input
                      className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary focus:border-action-primary transition-all"
                      placeholder="📧 Email"
                      value={selectedOrder.contact_email || ""}
                      onChange={(e) => setSelectedOrder((p) => ({ ...p, contact_email: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Tax & Discount */}
                <div className="bg-bg-primary rounded-xl shadow-lg border border-border-default">
                  <div className="px-5 py-3 bg-bg-tertiary border-b border-border-default rounded-t-xl">
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                      ⚙️ Tax & Discount
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-text-secondary mb-1 block">GST (%)</label>
                        <input
                          type="number"
                          value={taxPercent}
                          min="0"
                          className="w-full border border-border-default rounded-lg px-2 py-2 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary"
                          onChange={(e) => {
                            setTaxPercent(Number(e.target.value));
                            setGstManuallyEdited(true);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-secondary mb-1 block">Discount</label>
                        <input
                          type="number"
                          value={discount}
                          min="0"
                          className="w-full border border-border-default rounded-lg px-2 py-2 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary"
                          onChange={(e) => setDiscount(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-secondary mb-1 block">Type</label>
                        <select
                          value={discountIsPercent ? "percent" : "fixed"}
                          onChange={(e) => setDiscountIsPercent(e.target.value === "percent")}
                          className="w-full border border-border-default rounded-lg px-2 py-2 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary"
                        >
                          <option value="percent">%</option>
                          <option value="fixed">₹</option>
                        </select>
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div>
                      <label className="text-xs font-semibold text-text-secondary mb-2 block">Payment Status</label>
                      <div className="flex gap-2 flex-wrap">
                        {["Pending", "Paid", "Partial", "Due"].map((statusOption) => (
                          <button
                            key={statusOption}
                            type="button"
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${paymentStatus === statusOption
                              ? "bg-action-primary text-text-white shadow-md"
                              : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary border border-border-default"
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
                <div className="bg-bg-primary rounded-xl shadow-lg border border-border-default">
                  <div className="px-5 py-3 bg-bg-tertiary border-b border-border-default rounded-t-xl flex items-center justify-between">
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                      💳 Payment
                    </h3>
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
                      <span className="text-xs font-medium text-text-secondary">Split</span>
                    </label>
                  </div>

                  <div className="p-4">
                    {splitPaymentEnabled ? (
                      <div className="space-y-2">
                        {paymentSplits.map((split, idx) => (
                          <div key={idx} className="flex gap-2 items-center p-2 rounded-lg bg-bg-tertiary border border-border-default">
                            <select
                              value={split.method}
                              onChange={(e) => {
                                const newSplits = [...paymentSplits];
                                newSplits[idx].method = e.target.value;
                                setPaymentSplits(newSplits);
                              }}
                              className="flex-1 border border-border-default rounded-lg px-2 py-1.5 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary"
                            >
                              <option>Cash</option>
                              <option value="razorpay_upi">UPI (Razorpay)</option>
                              <option value="razorpay_card">Card (Razorpay)</option>
                              <option>Due</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={split.amount}
                              onChange={(e) => updateSplitAmount(idx, e.target.value)}
                              onBlur={() => onSplitAmountBlur()}
                              className="w-24 border border-border-default rounded-lg px-2 py-1.5 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary"
                            />
                            <button
                              type="button"
                              onClick={() => removeSplitRow(idx)}
                              className="text-action-danger hover:bg-red-50 font-bold px-2 py-1 rounded-lg"
                              disabled={paymentSplits.length === 1}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addSplitRow}
                          className="w-full bg-action-primary hover:bg-action-primary/90 text-text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
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
                          className="flex-1 border border-border-default rounded-lg px-3 py-2 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary"
                        >
                          <option>Cash</option>
                          <option value="razorpay_upi">UPI (Razorpay)</option>
                          <option value="razorpay_card">Card (Razorpay)</option>
                          <option>Due</option>
                        </select>
                        <input
                          type="number"
                          value={total}
                          readOnly
                          className="w-28 border border-border-default rounded-lg px-3 py-2 text-sm font-semibold text-right text-text-primary bg-bg-tertiary cursor-not-allowed opacity-70"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handlePaymentClick}
                    disabled={saving}
                    className="flex-1 bg-action-primary hover:bg-action-primary/90 text-text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={printInvoice}
                    className="flex-1 bg-bg-primary border-2 border-action-primary hover:bg-action-primary/10 text-text-primary px-4 py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
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
                    razorpay_order_id:   response.razorpay_order_id,
                    razorpay_signature:  response.razorpay_signature,
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
                    document_id:         Number(docId),
                    razorpay_payment_id: String(p.razorpay_payment_id),
                    razorpay_order_id:   String(p.razorpay_order_id),
                    razorpay_signature:  String(p.razorpay_signature),
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
          
              // Free the table
              if (selectedOrder.table_id) {
                try {
                  const tableData = tablesMap[selectedOrder.table_id];
                  await axios.post(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                    {
                      id:            selectedOrder.table_id,
                      client_id:     clientId,
                      name:          tableData?.name || `Table ${selectedOrder.table_id}`,
                      table_type:    tableData?.table_type || "Regular",
                      status:        "vacant",
                      location_zone: tableData?.location_zone || "Main",
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                } catch (tableErr) {
                  console.error("Table update failed:", tableErr.response?.data || tableErr.message);
                }
              }
          
              setPaymentStatus("Paid");
              setShowRazorpayModal(false);
              toast.success("Payment verified successfully!");
          
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
    </div>
  );
}