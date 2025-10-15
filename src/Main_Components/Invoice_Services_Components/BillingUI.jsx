// import React, { useEffect, useState, useRef } from "react";
// import axios from 'axios';
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import jsPDF from "jspdf";

// export default function BillingPage() {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   // States
//   const [orders, setOrders] = useState([]);
//   const [tablesMap, setTablesMap] = useState({});
//   const [inventoryMap, setInventoryMap] = useState({});
//   const [selectedOrder, setSelectedOrder] = useState(null);

//   const [taxPercent, setTaxPercent] = useState(10);
//   const [discount, setDiscount] = useState(5);
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);

//   const [method, setMethod] = useState("Cash");
//   const [paymentStatus, setPaymentStatus] = useState("Pending");
//   const [status, setStatus] = useState("Draft");
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [invoiceDraftId, setInvoiceDraftId] = useState(null);
//   const [documentNumber, setDocumentNumber] = useState("");
//   const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
//   const [paymentSplits, setPaymentSplits] = useState([{ method: "Cash", amount: 0 }]);
//   const [balanceAmount, setBalanceAmount] = useState(0);
//   const [singlePaymentAmount, setSinglePaymentAmount] = useState(0);

//   const invoiceRef = useRef(null);

//   // Utility to check if a date is today
//   const isToday = (createdAt) => {
//     const date = new Date(createdAt);
//     if (!date) return false;
//     const today = new Date();
//     return (
//       date.getFullYear() === today.getFullYear() &&
//       date.getMonth() === today.getMonth() &&
//       date.getDate() === today.getDate()
//     );
//   };

//   useEffect(() => {
//     async function fetchAll() {
//       setLoading(true);
//       try {
//         const [ordersRes, tablesRes, invRes] = await Promise.all([
//           axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//         ]);
//         const served = (ordersRes.data?.data || []).filter(
//           (o) => o.status?.toLowerCase() === "served" && isToday(o.created_at)
//         );
//         setOrders(served);
//         const tMap = {};
//         (tablesRes.data?.data || []).forEach((t) => {
//           tMap[t.id] = t;
//         });
//         setTablesMap(tMap);
//         const iMap = {};
//         (invRes.data?.data || []).forEach((i) => {
//           iMap[i.id] = i;
//         });
//         setInventoryMap(iMap);
//       } catch (error) {
//         console.error(error);
//         toast.error("Error loading data");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchAll();
//   }, [clientId, token]);

//   const fetchInvoiceDraft = async (orderId) => {
//     try {
//       const res = await axios.get(`${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`, {
//         headers: { Authorization: `Bearer ${token}` },
//         params: { client_id: clientId },
//       });
//       const invoices = res.data?.data || [];
//       const filtered = invoices.filter(
//         (d) => d.order_id?.toString() === orderId?.toString()
//       );
//       if (filtered.length === 0) return {};
//       filtered.sort(
//         (a, b) =>
//           (b.document_version || 1) - (a.document_version || 1) ||
//           new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
//       );
//       return filtered[0] || {};
//     } catch (err) {
//       console.error("Failed to fetch invoice", err);
//       return {};
//     }
//   };

//   // Calculations
//   const subtotal =
//     selectedOrder?.items?.reduce(
//       (sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
//       0
//     ) || 0;

//   const taxAmount = (taxPercent / 100) * subtotal;
//   const discountAmount = discountIsPercent ? (discount / 100) * subtotal : discount;
//   const total = Number((subtotal + taxAmount - discountAmount).toFixed(2));

//   // Payment split helpers
//   const sumSplits = (splits) => splits.reduce((sum, s) => sum + Number(s.amount), 0);

//   const updateSplitAmount = (index, value) => {
//     let newAmount = Number(value);
//     if (isNaN(newAmount) || newAmount < 0) newAmount = 0;
//     let splits = [...paymentSplits];
//     splits[index].amount = newAmount;
//     if (splits.length > 1) {
//       const sumOthers = splits
//         .filter((_, idx) => idx !== splits.length - 1)
//         .reduce((sum, s) => sum + Number(s.amount), 0);
//       let remainder = Number((total - sumOthers).toFixed(2));
//       splits[splits.length - 1].amount = remainder >= 0 ? remainder : 0;
//     }
//     let sumTotal = sumSplits(splits);
//     while (sumTotal > total) {
//       let excess = sumTotal - total;
//       if (splits[splits.length - 1].amount >= excess) {
//         splits[splits.length - 1].amount -= excess;
//       } else {
//         splits[splits.length - 1].amount = 0;
//       }
//       sumTotal = sumSplits(splits);
//     }
//     setPaymentSplits(splits);
//     setBalanceAmount(Number((total - sumSplits(splits)).toFixed(2)));
//   };

//   const addSplitRow = () => {
//     let used = sumSplits(paymentSplits);
//     let remainder = Number((total - used).toFixed(2));
//     setPaymentSplits((prev) => [
//       ...prev,
//       { method: "Cash", amount: remainder >= 0 ? remainder : 0 },
//     ]);
//     setBalanceAmount(Number(0));
//   };

//   const removeSplitRow = (index) => {
//     if (paymentSplits.length <= 1) return;
//     let updated = paymentSplits.filter((_, idx) => idx !== index);
//     let sum = sumSplits(updated);
//     let remainder = Number((total - sum).toFixed(2));
//     if (updated.length > 0) updated[updated.length - 1].amount += remainder;
//     setPaymentSplits(updated);
//     setBalanceAmount(Number((total - sumSplits(updated)).toFixed(2)));
//   };

//   const onSplitAmountBlur = (index) => {
//     let splits = [...paymentSplits];
//     if (splits.length > 1) {
//       const sumOthers = splits
//         .filter((_, idx) => idx !== splits.length - 1)
//         .reduce((sum, s) => sum + Number(s.amount), 0);
//       let remainder = Number((total - sumOthers).toFixed(2));
//       splits[splits.length - 1].amount = remainder >= 0 ? remainder : 0;
//     }
//     setPaymentSplits(splits);
//     setBalanceAmount(Number((total - sumSplits(splits)).toFixed(2)));
//   };

//   const onSinglePaymentAmountChange = (value) => {
//     let numAmt = Number(value);
//     if (isNaN(numAmt) || numAmt < 0) numAmt = 0;
//     setSinglePaymentAmount(numAmt);
//     setBalanceAmount(Number((numAmt - total).toFixed(2)));
//     setPaymentSplits([{ method, amount: numAmt }]);
//   };

//   // Load GST/Discount from storage per order
//   const loadGSTDiscountFromStorage = (orderId) => {
//     try {
//       const key = `billing_${orderId}_gst_discount`;
//       const saved = localStorage.getItem(key);
//       if (saved) {
//         const parsed = JSON.parse(saved);
//         if (typeof parsed.taxPercent === "number") setTaxPercent(parsed.taxPercent);
//         if (typeof parsed.discount === "number") setDiscount(parsed.discount);
//         if (typeof parsed.discountIsPercent === "boolean")
//           setDiscountIsPercent(parsed.discountIsPercent);
//       } else {
//         setTaxPercent(18);
//         setDiscount(0);
//         setDiscountIsPercent(true);
//       }
//     } catch (e) {
//       setTaxPercent(18);
//       setDiscount(0);
//       setDiscountIsPercent(true);
//     }
//   };

//   useEffect(() => {
//     if (!selectedOrder?.id) return;
//     const key = `billing_${selectedOrder.id}_gst_discount`;
//     const data = {
//       taxPercent,
//       discount,
//       discountIsPercent,
//     };
//     localStorage.setItem(key, JSON.stringify(data));
//   }, [taxPercent, discount, discountIsPercent, selectedOrder]);

//   useEffect(() => {
//     if (!selectedOrder) return;
//     loadGSTDiscountFromStorage(selectedOrder.id);
//   }, [selectedOrder]);

//   useEffect(() => {
//     if (!selectedOrder) return;
//     if (!splitPaymentEnabled) {
//       setSinglePaymentAmount(total);
//       setBalanceAmount(Number((total - total).toFixed(2)));
//       setPaymentSplits([{ method, amount: total }]);
//     } else {
//       if (!paymentSplits || paymentSplits.length === 0 || paymentSplits.every((p) => p.amount === 0)) {
//         setPaymentSplits([{ method: "Cash", amount: total }]);
//         setBalanceAmount(0);
//       }
//     }
//   }, [total, splitPaymentEnabled]);

//   const handleSelectOrder = async (order) => {
//     if (!order) return;
//     const enrichedItems = (order.items || []).map((item) => {
//       const inv = inventoryMap[item.item_id] || {};
//       return {
//         ...item,
//         unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
//         description: item.description ?? inv.description ?? "",
//         name: item.item_name ?? inv.name ?? "Unnamed Item",
//       };
//     });

//     const invoiceDraft = await fetchInvoiceDraft(order.id);

//     const updatedOrder = {
//       ...order,
//       items: enrichedItems,
//       customer_id: invoiceDraft?.customer_id || order.customer_id || "",
//       contact_email: invoiceDraft?.contact_email || order.contact_email || "",
//       contact_phone: invoiceDraft?.contact_phone || order.contact_phone || "",
//     };
//     setSelectedOrder(updatedOrder);
//     setInvoiceDraftId(invoiceDraft?.id ?? null);
//     setStatus(invoiceDraft?.status ?? "Draft");
//     setDocumentNumber(invoiceDraft?.document_number ?? "");
//     setPaymentStatus(invoiceDraft?.payment_status ?? "Pending");

//     const totalVal = enrichedItems.reduce(
//       (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
//       0
//     );

//     if (Array.isArray(invoiceDraft?.payment_method) && invoiceDraft.payment_method.length > 0) {
//       if (invoiceDraft.payment_method.length === 1) {
//         setSplitPaymentEnabled(false);
//         setPaymentSplits(invoiceDraft.payment_method);
//         setMethod(invoiceDraft.payment_method[0].method || "Cash");
//         setSinglePaymentAmount(invoiceDraft.payment_method[0].amount || totalVal);
//         setBalanceAmount(Number((invoiceDraft.payment_method[0].amount - totalVal).toFixed(2)));
//       } else {
//         setSplitPaymentEnabled(true);
//         setPaymentSplits(
//           invoiceDraft.payment_method.map((split) => ({
//             method: split.method ?? "Cash",
//             amount: split.amount ?? 0,
//           }))
//         );
//         setBalanceAmount(
//           Number((totalVal - invoiceDraft.payment_method.reduce((sum, s) => sum + (s.amount || 0), 0)).toFixed(2))
//         );
//       }
//     } else {
//       setSplitPaymentEnabled(false);
//       setPaymentSplits([{ method: "Cash", amount: totalVal }]);
//       setMethod("Cash");
//       setSinglePaymentAmount(totalVal);
//       setBalanceAmount(0);
//     }

//     loadGSTDiscountFromStorage(order.id);
//   };

//   const saveInvoiceDraft = async () => {
//     if (!selectedOrder) {
//       toast.error("Select an order first");
//       return;
//     }
//     if (!selectedOrder.items || selectedOrder.items.length === 0) {
//       toast.error("Selected order has no items");
//       return;
//     }
//     if (splitPaymentEnabled) {
//       const sumPayments = paymentSplits.reduce((sum, p) => sum + Number(p.amount), 0);
//       if (Number(sumPayments.toFixed(2)) !== Number(total.toFixed(2))) {
//         toast.error("Split payment amounts do not sum up to the total");
//         return;
//       }
//       if (paymentSplits.length < 2) {
//         toast.error("Add at least two payment methods for split payment");
//         return;
//       }
//     } else {
//       if (singlePaymentAmount < total || isNaN(singlePaymentAmount)) {
//         toast.error("Payment amount should be equal or greater than total");
//         return;
//       }
//     }
//     let paymentMethodArray;
//     if (splitPaymentEnabled) {
//       paymentMethodArray = paymentSplits.map((p) => ({
//         method: p.method,
//         amount: Number(p.amount || 0),
//       }));
//     } else {
//       paymentMethodArray = [{ method, amount: Number(singlePaymentAmount || 0) }];
//     }

//     setSaving(true);
//     try {
//       const payload = {
//         client_id: clientId,
//         document_type: "Invoice",
//         document_date: new Date().toISOString(),
//         order_id: selectedOrder.id.toString(),
//         reference_number: tablesMap[selectedOrder.table_id]?.name || `Table ${selectedOrder.table_id}`,
//         subtotal: Number(subtotal.toFixed(2)),
//         tax_amount: Number(taxAmount.toFixed(2)),
//         discount_amount: Number(discountAmount.toFixed(2)),
//         total_amount: Number(total.toFixed(2)),
//         payment_status: paymentStatus,
//         payment_method: paymentMethodArray,
//         single_payment_amount: splitPaymentEnabled ? null : Number(singlePaymentAmount.toFixed(2)),
//         status: status,
//         customer_id: selectedOrder.customer_id || "",
//         contact_email: selectedOrder.contact_email || "",
//         contact_phone: selectedOrder.contact_phone || "",
//       };

//       let draftId = invoiceDraftId;
//       if (!draftId) {
//         const res = await axios.post(
//           `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/create_document`,
//           payload,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         draftId = res?.data?.data?.id;
//         if (!draftId) throw new Error("Draft creation failed");
//         setInvoiceDraftId(draftId);
//       } else {
//         await axios.post(
//           `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/update_document`,
//           { id: draftId, ...payload },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//       }

//       const itemsPayload = selectedOrder.items.map((item) => ({
//         item_ref_id: item.item_id?.toString(),
//         description: item.description || "",
//         quantity: item.quantity || 0,
//         unit_price: item.unit_price || 0,
//         total: (item.unit_price || 0) * (item.quantity || 0),
//       }));

//       await axios.post(
//         `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/create?document_id=${draftId}&client_id=${clientId}`,
//         itemsPayload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       toast.success("Invoice draft saved!");
//       return draftId;
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to save invoice draft");
//       throw err;
//     } finally {
//       setSaving(false);
//     }
//   };

//   // Updated printInvoice function with cloning and inline stylings
//   const printInvoice = async () => {
//     if (!selectedOrder || !selectedOrder.items?.length) {
//       toast.error("No order selected or no items");
//       return;
//     }
  
//     let currentInvoiceNumber = documentNumber;
//     let currentInvoiceDraftId = invoiceDraftId;
  
//     // Ensure draft invoice is saved (has an ID)
//     if (!currentInvoiceDraftId) {
//       try {
//         const draftId = await saveInvoiceDraft(); // your existing saving function returns draft ID
//         currentInvoiceDraftId = draftId;
//       } catch {
//         toast.error("Please save invoice draft before printing.");
//         return;
//       }
//     }
  
//     // Issue invoice to generate document_number if missing or "Draft"
//     if (!currentInvoiceNumber || currentInvoiceNumber.toLowerCase() === "draft") {
//       try {
//         const res = await axios.post(
//           `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/issue?invoice_id=${currentInvoiceDraftId}`,
//           null, // no body here, use query param instead
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         currentInvoiceNumber = res?.data?.data?.document_number;
//         if (!currentInvoiceNumber) throw new Error("Invoice number generation failed");
//         setDocumentNumber(currentInvoiceNumber);
//       } catch (err) {
//         console.error("Invoice issue error: ", err);
//         toast.error("Failed to generate invoice number before print.");
//         return;
//       }
//     }
  
//     // Now generate and save PDF with the confirmed invoice number
//     try {
//       const pdf = new jsPDF({ unit: "pt", format: "a4" });
//       let y = 40;
  
//       // Restaurant / client info
//       const restaurantName = clientId?.toUpperCase() || "Restaurant";
//       const restaurantAddress = localStorage.getItem("restaurant_address") || "N/A";
//       const invoiceNo = currentInvoiceNumber;
//       const invoiceDate = new Date().toLocaleDateString();
//       const invoiceTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
//       // Header
//       pdf.setFont("helvetica", "bold");
//       pdf.setFontSize(18);
//       pdf.text(restaurantName, 40, y);
//       pdf.setFontSize(10);
//       pdf.setFont("helvetica", "normal");
//       pdf.text(restaurantAddress, 40, y + 15);
//       pdf.setFont("helvetica", "bold");
//       pdf.text("INVOICE", 500, y);
//       y += 35;
//       pdf.setFont("helvetica", "normal");
//       pdf.text(`Invoice No: ${invoiceNo}`, 400, y);
//       pdf.text(`Date: ${invoiceDate} ${invoiceTime}`, 400, y + 15);
  
//       // Customer + delivery info
//       y += 50;
//       pdf.setFont("helvetica", "bold");
//       pdf.text("Customer", 40, y);
//       pdf.text("Deliver To", 300, y);
//       pdf.setFont("helvetica", "normal");
//       pdf.text(`ID: ${selectedOrder.customer_id || "-"}`, 40, y + 20);
//       pdf.text(`Phone: ${selectedOrder.contact_phone || "-"}`, 40, y + 35);
//       pdf.text(`Email: ${selectedOrder.contact_email || "-"}`, 40, y + 50);
//       const tableName = tablesMap[selectedOrder.table_id]?.name || `Table ${selectedOrder.table_id || "-"}`;
//       pdf.text(`Table: ${tableName}`, 300, y + 20);
//       pdf.text(`Type: ${selectedOrder.mode || "Dine-In"}`, 300, y + 35);
  
//       // Section title
//       y += 100;
//       pdf.setFont("helvetica", "bold");
//       pdf.setTextColor(200, 50, 50);
//       pdf.text("Order Details", 40, y);
//       pdf.setTextColor(0, 0, 0);
  
//       // Column headers
//       y += 25;
//       pdf.setFont("helvetica", "bold");
//       pdf.text("Item", 40, y);
//       pdf.text("Qty", 250, y);
//       pdf.text("Unit Price", 320, y);
//       pdf.text("Amount", 420, y);
//       pdf.setFont("helvetica", "normal");
  
//       // Order items
//       selectedOrder.items.forEach((item) => {
//         y += 20;
//         pdf.text(item.name || "Unnamed", 40, y);
//         pdf.text(`${item.quantity || 0}`, 250, y);
//         pdf.text(`Rs.${(item.unit_price ?? 0).toFixed(2)}`, 320, y);
//         pdf.text(`Rs.${((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}`, 420, y);
//       });
  
//       // Summary
//       y += 40;
//       pdf.setFont("helvetica", "normal");
//       pdf.text(`Subtotal: Rs.${subtotal.toFixed(2)}`, 300, y);
//       y += 20;
//       pdf.text(`Discount: -Rs.${discountAmount.toFixed(2)}`, 300, y);
//       y += 20;
//       pdf.text(`GST: Rs.${taxAmount.toFixed(2)}`, 300, y);
//       y += 25;
//       pdf.setFont("helvetica", "bold");
//       pdf.text(`TOTAL DUE: Rs.${total.toFixed(2)}`, 300, y);
  
//       // Payment info
//       y += 40;
//       pdf.setFont("helvetica", "normal");
//       if (splitPaymentEnabled) {
//         paymentSplits.forEach((split, idx) => {
//           pdf.text(`Payment Method ${idx + 1}: ${split.method} - Rs.${Number(split.amount).toFixed(2)}`, 40, y);
//           y += 20;
//         });
//       } else {
//         pdf.text(`Payment Method: ${method}`, 40, y);
//         y += 20;
//         pdf.text(`Amount Given: Rs.${singlePaymentAmount.toFixed(2)}`, 40, y);
//         y += 20;
//       }
//       pdf.text(`Payment Status: ${paymentStatus}`, 40, y);
  
//       // Footer
//       y += 50;
//       pdf.setFont("helvetica", "italic");
//       pdf.setFontSize(10);
//       pdf.text(`${restaurantName} - Thank you for dining with us!`, 220, y, { align: "center" });
  
//       pdf.save(`Invoice_${currentInvoiceDraftId || "draft"}.pdf`);
//       toast.success("Invoice issued and PDF downloaded!");
//     } catch (err) {
//       console.error("Error generating PDF:", err);
//       toast.error("Failed to generate invoice PDF.");
//     } finally {
//       setSaving(false);
//     }
//   };
  
  
  

//   return (
//   <div className="Invoice-container-page">
//       <div className="inv--container">
//       <div className="inv--header-row">
//         {/* <div className="inv--header-l">Billing Invoices</div> */}
//         {/* <div className="inv--header-r">
//           <button className="inv--btn-light" disabled>{loading ? "Loading..." : "Export"}</button>
//           <button className="inv--btn-light" disabled>{loading ? "Loading..." : "Import"}</button>
//           <button className="inv--btn-pri" disabled={!selectedOrder} onClick={saveInvoiceDraft}>
//             {saving ? "Saving..." : "+ Save Bill"}
//           </button>
//         </div> */}
//       </div>
//       <div className="inv--main-row">
//         <aside className="inv--orders-list" aria-label="Orders List">
//           {loading && <p className="inv--loading-text">Loading orders...</p>}
//           {!loading && orders.length === 0 && <p className="inv--empty-text">No served orders today</p>}
//           {orders.map((order) => {
//             const tableName = tablesMap[order.table_id]?.name || `Table ${order.table_id}`;
//             const orderTotal = order.items.reduce(
//               (sum, i) => sum + (i.unit_price ?? i.price ?? 0) * (i.quantity ?? 1),
//               0
//             );
//             const isSelected = selectedOrder?.id === order.id;
//             return (
//               <div
//                 key={order.id}
//                 tabIndex={0}
//                 role="button"
//                 className={`inv--order-card ${isSelected ? "selected" : ""}`}
//                 onClick={() => handleSelectOrder(order)}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter" || e.key === " ") {
//                     e.preventDefault();
//                     e.currentTarget.click();
//                   }
//                 }}
//                 aria-pressed={isSelected}
//               >
//                 <h4>{tableName}</h4>
//                 <div>Order #{order.id}</div>
//                 <div className="inv--order-total">₹{orderTotal.toFixed(2)}</div>
//                 <time
//                   dateTime={order.created_at}
//                   className="inv--served-time"
//                   title={new Date(order.created_at).toLocaleString()}
//                 >
//                   Served at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                 </time>
//               </div>
//             );
//           })}
//         </aside>

//         {selectedOrder ? (
//           <section ref={invoiceRef} className="inv--invoice-panel" aria-label="Invoice Details">
//             <div className="inv--invoice-header">
//               <h1>{clientId}</h1>
//               <h2>INVOICE</h2>
//               <div className="inv--document-info">
//                 <span className="inv--document-number">{documentNumber || "Draft"}</span>
//                 <span className="inv--document-date">{new Date().toLocaleDateString()}</span>
//               </div>
//             </div>

//             <div className="inv--bill-shipping">
//               <div className="inv--bill-to">
//                 <h3>Bill To</h3>
//                 <label>
//                   Customer ID
//                   <input
//                     type="text"
//                     value={selectedOrder.customer_id || ""}
//                     onChange={(e) => setSelectedOrder((prev) => ({ ...prev, customer_id: e.target.value }))}
//                     className="inv--input"
//                   />
//                 </label>
//                 <label>
//                   Email
//                   <input
//                     type="email"
//                     value={selectedOrder.contact_email || ""}
//                     onChange={(e) => setSelectedOrder((prev) => ({ ...prev, contact_email: e.target.value }))}
//                     className="inv--input"
//                   />
//                 </label>
//                 <label>
//                   Phone
//                   <input
//                     type="text"
//                     value={selectedOrder.contact_phone || ""}
//                     onChange={(e) => setSelectedOrder((prev) => ({ ...prev, contact_phone: e.target.value }))}
//                     className="inv--input"
//                   />
//                 </label>
//               </div>
//               <div className="inv--shipping-info">
//                 <h3>Shipping Info</h3>
//                 <p>Table: {tablesMap[selectedOrder.table_id]?.name || "N/A"}</p>
//               </div>
//             </div>

//             <table className="inv--table" aria-label="Invoice Items">
//               <thead>
//                 <tr>
//                   <th>Item</th>
//                   <th className="right-align">Quantity</th>
//                   <th className="right-align">Unit Price</th>
//                   <th className="right-align">Amount</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {selectedOrder.items.map((item, idx) => (
//                   <tr key={idx}>
//                     <td>{item.name}</td>
//                     <td className="right-align">{item.quantity ?? 0}</td>
//                     <td className="right-align">₹{(item.unit_price ?? 0).toFixed(2)}</td>
//                     <td className="right-align">₹{((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}</td>
//                   </tr>
//                 ))}
//                 <tr className="inv--summary-row">
//                   <td colSpan="3" className="right-align">Subtotal</td>
//                   <td className="right-align">₹{subtotal.toFixed(2)}</td>
//                 </tr>
//                 <tr className="inv--summary-row">
//                   <td colSpan="3" className="right-align">Discount</td>
//                   <td className="right-align">-₹{discountAmount.toFixed(2)}</td>
//                 </tr>
//                 <tr className="inv--summary-row">
//                   <td colSpan="3" className="right-align">GST</td>
//                   <td className="right-align">₹{taxAmount.toFixed(2)}</td>
//                 </tr>
//                 <tr className="inv--summary-row inv--total-row">
//                   <td colSpan="3" className="right-align">Total</td>
//                   <td className="right-align">₹{total.toFixed(2)}</td>
//                 </tr>
//               </tbody>
//             </table>

//             <div className="inv--controls">
//               <label>
//                 GST (%)<br />
//                 <input
//                   type="number"
//                   value={taxPercent}
//                   min="0"
//                   className="inv--input"
//                   onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 />
//               </label>
//               <label>
//                 Discount<br />
//                 <input
//                   type="number"
//                   value={discount}
//                   min="0"
//                   className="inv--input discount-input"
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                 />
//               </label>
//               <label>
//                 <select
//                   value={discountIsPercent ? "percent" : "fixed"}
//                   onChange={(e) => setDiscountIsPercent(e.target.value === "percent")}
//                   className="inv--select"
//                 >
//                   <option value="percent">%</option>
//                   <option value="fixed">Fixed</option>
//                 </select>
//               </label>
//               <div className="inv--payment-status-buttons">
//   <span>Payment Status:</span>
//   {["Pending", "Paid", "Partial", "Due"].map((statusOption) => (
//     <button
//       key={statusOption}
//       type="button"
//       className={`inv--status-btn ${paymentStatus === statusOption ? "active" : ""}`}
//       onClick={() => setPaymentStatus(statusOption)}
//     >
//       {statusOption}
//     </button>
//   ))}
// </div>

//               <label className="inv--checkbox-label">
//                 <input
//                   type="checkbox"
//                   checked={splitPaymentEnabled}
//                   onChange={() => setSplitPaymentEnabled(!splitPaymentEnabled)}
//                 />
//                 Enable Split Payment
//               </label>
//             </div>

//             {splitPaymentEnabled ? (
//               <div className="inv--split-payments">
//                 {paymentSplits.map((split, idx) => (
//                   <div key={idx} className="inv--split-row">
//                     <select
//                       value={split.method}
//                       onChange={(e) => {
//                         const newSplits = [...paymentSplits];
//                         newSplits[idx].method = e.target.value;
//                         setPaymentSplits(newSplits);
//                       }}
//                       className="inv--select"
//                     >
//                       <option>Cash</option>
//                       <option>UPI</option>
//                       <option>Card</option>
//                       <option>Due</option>
//                     </select>
//                     <input
//                       type="number"
//                       step="0.01"
//                       min="0"
//                       value={split.amount}
//                       onChange={(e) => updateSplitAmount(idx, e.target.value)}
//                       onBlur={() => onSplitAmountBlur(idx)}
//                       className="inv--input split-amount"
//                       placeholder="Amount"
//                     />
//                     <button
//                       type="button"
//                       onClick={() => removeSplitRow(idx)}
//                       aria-label={`Remove payment split ${idx + 1}`}
//                       className="inv--btn-remove"
//                       disabled={paymentSplits.length === 1}
//                     >
//                       &times;
//                     </button>
//                   </div>
//                 ))}
//                 <button type="button" className="inv--btn-add" onClick={addSplitRow}>
//                   Add Payment Method
//                 </button>
//                 <p className="inv--balance">Balance: ₹{balanceAmount.toFixed(2)}</p>
//               </div>
//             ) : (
//               <div className="inv--single-payment">
//                 <label>
//                   Payment Method
//                   <select
//                     value={method}
//                     onChange={(e) => {
//                       setMethod(e.target.value);
//                       setPaymentSplits([{ method: e.target.value, amount: singlePaymentAmount }]);
//                     }}
//                     className="inv--select"
//                   >
//                     <option>Cash</option>
//                     <option>UPI</option>
//                     <option>Card</option>
//                     <option>Due</option>
//                   </select>
//                 </label>
//                 <label>
//                   Amount Given
//                   <input
//                     type="number"
//                     value={singlePaymentAmount}
//                     min="0"
//                     step="0.01"
//                     onChange={(e) => onSinglePaymentAmountChange(e.target.value)}
//                     placeholder="Enter amount received"
//                     className="inv--input"
//                   />
//                 </label>
//                 <p className="inv--balance">Balance: ₹{balanceAmount.toFixed(2)}</p>
//               </div>
//             )}

//             <div className="inv--actions">
//               <button
//                 onClick={saveInvoiceDraft}
//                 disabled={saving}
//                 className="inv--btn-pri"
//                 type="button"
//               >
//                 {saving ? "Saving..." : "Save Bill"}
//               </button>
//               <button
//                 onClick={printInvoice}
//                 disabled={!selectedOrder || !selectedOrder.items?.length}
//                 className="inv--btn-success"
//                 type="button"
//               >
//                 Download PDF / Print
//               </button>
//             </div>
//           </section>
//         ) : (
//           <section className="inv--invoice-placeholder">
//             <p>Select an order to view invoice details</p>
//           </section>
//         )}
//       </div>
//     </div>
//   </div>
//   );
// }




// =============================================================
// =============================================================
// =============================================================
// =============================================================
// =============================================================


import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  // Utility safe number
  const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);
  const updateBalance = (sumOfPayments) => {
    const bal = total - sumOfPayments;
    setBalanceAmount(bal < 0 ? 0 : Number(bal.toFixed(2)));
  };
  
  // Load orders, tables, inventory on mount or clientId/token change
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

  // Calculations
  const subtotal =
    selectedOrder?.items?.reduce((sum, item) => sum + safeNum(item.unit_price) * safeNum(item.quantity), 0) || 0;
  const taxAmount = (taxPercent / 100) * subtotal;
  const discountAmount = discountIsPercent ? (discount / 100) * subtotal : discount;
  const total = Number((subtotal + taxAmount - discountAmount).toFixed(2));

  // Payment split helpers
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
    setPaymentSplits(splits);updateBalance(sumSplits(splits));
    setBalanceAmount(Number((total - sumSplits(splits)).toFixed(2)));
  };

  const onSinglePaymentAmountChange = (val) => {
    let num = Number(val);
    if (isNaN(num) || num < 0) num = 0;
    setSinglePaymentAmount(num);
    updateBalance(num);
    setPaymentSplits([{ method, amount: num }]);
  };

  // Modal auto open on mobile with order select
  useEffect(() => {
    if (selectedOrder && isMobile) setInvoiceModalOpen(true);
  }, [selectedOrder]);

  const closeModal = () => setInvoiceModalOpen(false);

  // Save invoiceDraft logic, fetchInvoiceDraft etc omitted here for brevity
  // Assume your original saveInvoiceDraft, fetchInvoiceDraft, handleSelectOrder stay unchanged


  const handleSelectOrder = async (order) => {
    if (!order) return;
    const enrichedItems = (order.items || []).map((item) => {
      const inv = inventoryMap[item.item_id] || {};
      return {
        ...item,
        unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
        description: item.description ?? inv.description ?? "",
        name: item.item_name ?? inv.name ?? "Unnamed Item", // <-- fetching item name here
      };
    });
    
    console.log("Enriched item:", enrichedItems);
    

    const invoiceDraft = await fetchInvoiceDraft(order.id);

    const updatedOrder = {
      ...order,
      items: enrichedItems,
      customer_id: invoiceDraft?.customer_id || order.customer_id || "",
      contact_email: invoiceDraft?.contact_email || order.contact_email || "",
      contact_phone: invoiceDraft?.contact_phone || order.contact_phone || "",
    };
    setSelectedOrder(updatedOrder);
    setInvoiceDraftId(invoiceDraft?.id ?? null);
    setStatus(invoiceDraft?.status ?? "Draft");
    setDocumentNumber(invoiceDraft?.document_number ?? "");
    setPaymentStatus(invoiceDraft?.payment_status ?? "Pending");

    const totalVal = enrichedItems.reduce(
      (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
      0
    );

    if (Array.isArray(invoiceDraft?.payment_method) && invoiceDraft.payment_method.length > 0) {
      if (invoiceDraft.payment_method.length === 1) {
        setSplitPaymentEnabled(false);
        setPaymentSplits(invoiceDraft.payment_method);
        setMethod(invoiceDraft.payment_method[0].method || "Cash");
        setSinglePaymentAmount(invoiceDraft.payment_method[0].amount || totalVal);
        setBalanceAmount(Number((invoiceDraft.payment_method[0].amount - totalVal).toFixed(2)));
      } else {
        setSplitPaymentEnabled(true);
        setPaymentSplits(
          invoiceDraft.payment_method.map((split) => ({
            method: split.method ?? "Cash",
            amount: split.amount ?? 0,
          }))
        );
        setBalanceAmount(
          Number((totalVal - invoiceDraft.payment_method.reduce((sum, s) => sum + (s.amount || 0), 0)).toFixed(2))
        );
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
  // Print & export PDF with jsPDF + autotable for professional layout
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
    } else {
      if (singlePaymentAmount < total || isNaN(singlePaymentAmount)) {
        toast.error("Payment amount should be equal or greater than total");
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
      paymentMethodArray = [{ method, amount: Number(singlePaymentAmount || 0) }];
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
        single_payment_amount: splitPaymentEnabled ? null : Number(singlePaymentAmount.toFixed(2)),
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
      } catch (err) {
        console.error("Invoice issue error: ", err);
        toast.error("Failed to generate invoice number before print.");
        return;
      }
    }
  
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      let y = 40;
  
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("INVOICE", 40, y);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice No: ${currentInvoiceNumber}`, 400, y);
      doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, 400, y + 15);
      y += 40;
  
      // Restaurant Info
      doc.setFont("helvetica", "bold");
      doc.text(clientId.toUpperCase(), 40, y);
      doc.setFont("helvetica", "normal");
      doc.text(localStorage.getItem("restaurant_address") || "N/A", 40, y + 15);
      y += 40;
  
      // Divider
      doc.setDrawColor(180);
      doc.line(40, y, 550, y);
      y += 20;
  
      // Customer Info
      doc.setFont("helvetica", "bold");
      doc.text("Bill To", 40, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Customer ID: ${selectedOrder.customer_id || "-"}`, 40, y + 20);
      doc.text(`Phone: ${selectedOrder.contact_phone || "-"}`, 40, y + 35);
      doc.text(`Email: ${selectedOrder.contact_email || "-"}`, 40, y + 50);
      doc.text(`Table: ${tablesMap[selectedOrder.table_id]?.name || "N/A"}`, 300, y + 20);
      doc.text(`Type: ${selectedOrder.mode || "Dine-In"}`, 300, y + 35);
      y += 80;
  
      // Divider
      doc.setDrawColor(180);
      doc.line(40, y, 550, y);
      y += 20;
  
      // Order Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Order Details", 40, y);
      y += 20;
  
      // Table Headers
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
  
      // Table Rows
      doc.setFont("helvetica", "normal");
      selectedOrder.items.forEach((item) => {
        doc.text(item.name || "Unnamed", 40, y);
        doc.text(`${item.quantity || 0}`, 250, y);
        doc.text(`Rs.${(item.unit_price ?? 0).toFixed(2)}`, 320, y);
        doc.text(`Rs.${((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}`, 420, y);
        y += 20;
      });
  
      // Divider
      y += 10;
      doc.setDrawColor(180);
      doc.line(40, y, 550, y);
      y += 20;
  
      // Summary
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
  
      // Payment Info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (splitPaymentEnabled) {
        paymentSplits.forEach((split, idx) => {
          doc.text(`Payment Method ${idx + 1}: ${split.method} - ₹${Number(split.amount).toFixed(2)}`, 40, y);
          y += 20;
        });
      } else {
        doc.text(`Payment Method: ${method}`, 40, y);
        y += 20;
        doc.text(`Amount Given: ₹${singlePaymentAmount.toFixed(2)}`, 40, y);
        y += 20;
      }
      doc.text(`Payment Status: ${paymentStatus}`, 40, y);
      y += 40;
  
      // Footer
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
  
  

  return (
   <div className="Invoice-Main-COntainer">
     <div className="Invoice-container-page">
      <div className="inv--container">
        <div className="inv--header-row">{/* Optional header */}</div>
        <div className="inv--main-row">
          <aside className="inv--orders-list" aria-label="Orders List">
            {loading && <p className="inv--loading-text">Loading orders...</p>}
            {!loading && orders.length === 0 && <p className="inv--empty-text">No served orders today</p>}
            {orders.map((order) => {
              const tableName = tablesMap[order.table_id]?.name || `Table ${order.table_id}`;
              const orderTotal = order.items.reduce(
                (sum, i) => sum + safeNum(i.unit_price) * safeNum(i.quantity),
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

          {/* Invoice panel - as modal on mobile */}
          {isMobile ? (
            <>
              {invoiceModalOpen && selectedOrder && (
                <div className="inv--modal-overlay" role="dialog" aria-modal="true">
                  <section ref={invoiceRef} className="inv--invoice-panel inv--modal" aria-label="Invoice Details">
                    <button className="inv--modal-close" type="button" aria-label="Close Invoice" onClick={() => setInvoiceModalOpen(false)}>
                      &times;
                    </button>
                    {/* Invoice content copied below */}
                    <div className="inv--invoice-header">
                      <h1>{clientId}</h1>
                      <h2>INVOICE</h2>
                      <div className="inv--document-info">
                        <span className="inv--document-number">{documentNumber || "Draft"}</span>
                        <span className="inv--document-date">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="inv--bill-shipping">
                      <div className="inv--bill-to">
                        <h3>Bill To</h3>
                        <label>
                          Customer ID
                          <input type="text" value={selectedOrder.customer_id || ""} readOnly className="inv--input" />
                        </label>
                        <label>
                          Email
                          <input type="email" value={selectedOrder.contact_email || ""} readOnly className="inv--input" />
                        </label>
                        <label>
                          Phone
                          <input type="text" value={selectedOrder.contact_phone || ""} readOnly className="inv--input" />
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
                          <td colSpan={3} className="right-align">
                            Subtotal
                          </td>
                          <td className="right-align">₹{subtotal.toFixed(2)}</td>
                        </tr>
                        <tr className="inv--summary-row">
                          <td colSpan={3} className="right-align">
                            Discount
                          </td>
                          <td className="right-align">-₹{discountAmount.toFixed(2)}</td>
                        </tr>
                        <tr className="inv--summary-row">
                          <td colSpan={3} className="right-align">
                            GST
                          </td>
                          <td className="right-align">₹{taxAmount.toFixed(2)}</td>
                        </tr>
                        <tr className="inv--summary-row inv--total-row">
                          <td colSpan={3} className="right-align">
                            Total
                          </td>
                          <td className="right-align">₹{total.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="inv--actions">
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
              {/* Inline desktop invoice content (same as modal without close) */}
              <div className="inv--invoice-header">
                <h1>{clientId}</h1>
                <h2>INVOICE</h2>
                <div className="inv--document-info">
                  <span className="inv--document-number">{documentNumber || "Draft"}</span>
                  <span className="inv--document-date">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <div className="inv--bill-shipping">
                <div className="inv--bill-to">
                  <h3>Bill To</h3>
                  <label>
                    Customer ID
                    <input
                      type="text"
                      value={selectedOrder.customer_id || ""}
                      onChange={(e) => setSelectedOrder((prev) => ({ ...prev, customer_id: e.target.value }))}
                      className="inv--input"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={selectedOrder.contact_email || ""}
                      onChange={(e) => setSelectedOrder((prev) => ({ ...prev, contact_email: e.target.value }))}
                      className="inv--input"
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      type="text"
                      value={selectedOrder.contact_phone || ""}
                      onChange={(e) => setSelectedOrder((prev) => ({ ...prev, contact_phone: e.target.value }))}
                      className="inv--input"
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
                    <td colSpan={3} className="right-align">
                      Subtotal
                    </td>
                    <td className="right-align">₹{subtotal.toFixed(2)}</td>
                  </tr>
                  <tr className="inv--summary-row">
                    <td colSpan={3} className="right-align">
                      Discount
                    </td>
                    <td className="right-align">-₹{discountAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="inv--summary-row">
                    <td colSpan={3} className="right-align">
                      GST
                    </td>
                    <td className="right-align">₹{taxAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="inv--summary-row inv--total-row">
                    <td colSpan={3} className="right-align">
                      Total
                    </td>
                    <td className="right-align">₹{total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Controls */}
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
                    onChange={() => setSplitPaymentEnabled(!splitPaymentEnabled)}
                  />
                  Enable Split Payment
                </label>
              </div>

              {/* Payment splits */}
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
                  {/* <p className="inv--balance">Balance: ₹{balanceAmount.toFixed(2)}</p> */}
                </div>
              ) : (
                <div className="inv--single-payment">
                  <label>
                    Payment Method
                    <select
                      value={method}
                      onChange={(e) => {
                        setMethod(e.target.value);
                        setPaymentSplits([{ method: e.target.value, amount: singlePaymentAmount }]);
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
                    Amount Given
                    <input
                      type="number"
                      value={singlePaymentAmount}
                      min="0"
                      step="0.01"
                      onChange={(e) => onSinglePaymentAmountChange(e.target.value)}
                      placeholder="Enter amount received"
                      className="inv--input"
                    />
                  </label>
                  {/* <p className="inv--balance">Balance: ₹{balanceAmount.toFixed(2)}</p> */}
                </div>
              )}

              {/* Actions */}
           
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
