// ==========================================================================================  =====================
// ==========================================================================================  =====================
// ==========================================================================================  =====================
// ==========================================================================================  =====================
// ==========================================================================================  =====================
// ==========================================================================================  =====================




// import React, { useEffect, useState, useRef } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";

// export default function BillingPage() {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   const [orders, setOrders] = useState([]);
//   const [tablesMap, setTablesMap] = useState({});
//   const [inventoryMap, setInventoryMap] = useState({});
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [taxPercent, setTaxPercent] = useState(18);
//   const [discount, setDiscount] = useState(0);
//   const [method, setMethod] = useState("Cash");
//   const [paymentStatus, setPaymentStatus] = useState("Pending");
//   const [status, setStatus] = useState("Draft");
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [invoiceDraftId, setInvoiceDraftId] = useState(null);
//   const [documentNumber, setDocumentNumber] = useState("");

//   const [customerId, setCustomerId] = useState("");
//   const [contactEmail, setContactEmail] = useState("");
//   const [contactPhone, setContactPhone] = useState("");

//   const invoiceRef = useRef(null);

//   const isToday = (createdAt) => {
//     const date = new Date(createdAt);
//     if (!date) return false;
//     const today = new Date();
//     return date.getFullYear() === today.getFullYear() &&
//       date.getMonth() === today.getMonth() &&
//       date.getDate() === today.getDate();
//   };

//   useEffect(() => {
//     async function fetchAll() {
//       setLoading(true);
//       try {
//         const [ordersRes, tablesRes, invRes] = await Promise.all([
//           orderServices.get(`/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } }),
//           tableServices.get(`/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
//           inventoryServices.get(`/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
//         ]);
//         const served = (ordersRes.data?.data || []).filter(
//           (o) => o.status?.toLowerCase() === "served" && isToday(o.created_at)
//         );
//         setOrders(served);
//         const tMap = {};
//         (tablesRes.data?.data || []).forEach((t) => (tMap[t.id] = t.name || t.table_number || `Table ${t.id}`));
//         setTablesMap(tMap);
//         const iMap = {};
//         (invRes.data?.data || []).forEach((i) => (iMap[i.id] = i));
//         setInventoryMap(iMap);
//       } catch {
//         toast.error("Error loading data");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchAll();
//   }, [clientId, token]);

//   const fetchInvoiceDraft = async (orderId) => {
//     try {
//       const res = await invoiceServices.get(`/${clientId}/invoice/read_document`, {
//         headers: { Authorization: `Bearer ${token}` },
//         params: { client_id: clientId, status: "Draft" }
//       });
//       const drafts = res.data?.data || [];
//       const draft = drafts.find(d => d.order_id?.toString() === orderId?.toString());
//       return draft || {};
//     } catch (err) {
//       console.error("Failed to fetch invoice draft", err);
//       return {};
//     }
//   };

//   const enrichItems = (order) =>
//     (order.items || []).map((item) => {
//       const inv = inventoryMap[item.item_id] || {};
//       return {
//         ...item,
//         unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
//         description: item.description ?? inv.description ?? "",
//         name: item.item_name ?? inv.name ?? "Unnamed Item",
//       };
//     });

//   const subtotal = selectedOrder?.items?.reduce((sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1), 0) || 0;
//   const taxAmount = (taxPercent / 100) * subtotal;
//   const discountAmount = discountIsPercent ? (discount / 100) * subtotal : discount;
//   const total = subtotal + taxAmount - discountAmount;

//   const saveInvoiceDraft = async () => {
//     if (!selectedOrder) return toast.error("Select an order first");
//     if (!selectedOrder.items || selectedOrder.items.length === 0)
//       return toast.error("Selected order has no items");

//     setSaving(true);

//     try {
//       const payload = {
//         client_id: clientId,
//         document_type: "Invoice",
//         document_date: new Date().toISOString(),
//         order_id: selectedOrder.id.toString(),
//         reference_number: tablesMap[selectedOrder.table_id] || `Table ${selectedOrder.table_id}`,
//         subtotal: Number(subtotal.toFixed(2)),
//         tax_amount: Number(taxAmount.toFixed(2)),
//         discount_amount: Number(discountAmount.toFixed(2)),
//         total_amount: Number(total.toFixed(2)),
//         payment_status: paymentStatus,
//         payment_method: method,
//         status: status,
//         customer_id: customerId || "",
//         contact_email: contactEmail || "",
//         contact_phone: contactPhone || "",
//       };

//       let draftId = invoiceDraftId;

//       if (!draftId) {
//         const res = await invoiceServices.post(`/${clientId}/invoice/create_document`, payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         draftId = res?.data?.data?.id;
//         if (!draftId) throw new Error("Draft creation failed");
//         setInvoiceDraftId(draftId);
//       } else {
//         await invoiceServices.post(`/${clientId}/invoice/update_document`, { id: draftId, ...payload }, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       }

//       const itemsPayload = selectedOrder.items.map((item) => ({
//         item_ref_id: item.item_id?.toString(),
//         description: item.description || "",
//         quantity: item.quantity || 0,
//         unit_price: item.unit_price || 0,
//         total: (item.unit_price || 0) * (item.quantity || 0),
//       }));

//       await invoiceServices.post(
//         `/${clientId}/invoice/create?document_id=${draftId}&client_id=${clientId}`,
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


// const printInvoice = async () => {
//   if (!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0) return;

//   try {
//     const draftId = invoiceDraftId || await saveInvoiceDraft();
//     if (!draftId) return toast.error("Failed to create invoice draft");

//     // Generate invoice
//     await invoiceServices.post(
//       `/${clientId}/invoice/generate`,
//       {},
//       { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId, invoice_id: draftId } }
//     );

//     // Issue invoice and get document_number
//     const issueRes = await invoiceServices.post(
//       `/${clientId}/invoice/issue`,
//       {},
//       { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId, invoice_id: draftId } }
//     );

//     const docNum = issueRes?.data?.data?.document_number || "";
//     setDocumentNumber(docNum); // ✅ update state

//     // Wait for React to render updated documentNumber
//     setTimeout(async () => {
//       if (!invoiceRef.current) return;

//       const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
//       const imgData = canvas.toDataURL("image/png");
//       const pdf = new jsPDF('p', 'mm', 'a4');
//       const pdfWidth = pdf.internal.pageSize.getWidth();
//       const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
//       pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
//       pdf.save(`Invoice_${draftId}.pdf`);
//     }, 50);

//   } catch (err) {
//     console.error(err);
//     toast.error("Failed to generate invoice PDF");
//   }
// };

//   // useEffect(() => {
//   //   console.log("Updated documentNumber:", documentNumber);
//   // }, [documentNumber]);
  
//   return (
//     <div className="billing-page" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: "2rem", background: "#f3f6fb", minHeight: "100vh" }}>
//       <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0747a6", marginBottom: "2rem", borderBottom: "3px solid #0747a6", paddingBottom: "0.5rem" }}>
//         Billing & Invoices
//       </h1>

//       {/* Orders Grid */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
//         {loading ? (
//           <p style={{ color: "#555", fontStyle: "italic" }}>Loading...</p>
//         ) : orders.length === 0 ? (
//           <p style={{ color: "#888", fontStyle: "italic" }}>No served orders today</p>
//         ) : (
//           orders.map((order) => {
//             const tableName = tablesMap[order.table_id];
//             const servedTime = new Date(order.created_at);
//             const orderTotal = enrichItems(order).reduce(
//               (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
//               0
//             );
//             return (
//               <div
//                 key={order.id}
//                 onClick={async () => {
//                   const enrichedItems = enrichItems(order);
//                   const invoiceDraft = await fetchInvoiceDraft(order.id);
//                   setCustomerId(invoiceDraft.customer_id || "");
//                   setContactEmail(invoiceDraft.contact_email || "");
//                   setContactPhone(invoiceDraft.contact_phone || "");
//                   setInvoiceDraftId(invoiceDraft.id || null);
//                   setStatus(invoiceDraft.status || "Draft");
//                   setSelectedOrder({ ...order, items: enrichedItems });
//                   setDocumentNumber(invoiceDraft.document_number || "");
//                   setPaymentStatus(invoiceDraft.payment_status || "Pending");
//                 }}
//                 style={{
//                   padding: "1.5rem",
//                   background: selectedOrder?.id === order.id ? "#dce6fb" : "#ffffff",
//                   borderRadius: "12px",
//                   boxShadow: selectedOrder?.id === order.id ? "0 0 10px rgba(7, 71, 166, 0.3)" : "0 2px 6px rgba(0,0,0,0.1)",
//                   border: selectedOrder?.id === order.id ? "2px solid #0747a6" : "1px solid #ccd6f6",
//                   cursor: "pointer",
//                   transition: "all 0.3s ease",
//                 }}
//               >
//                 <h3 style={{ margin: "0 0 0.2rem 0", color: "#0747a6" }}>
//                   {tableName || `Table ${order.table_id}`}
//                 </h3>
//                 <p style={{ margin: "0 0 0.4rem 0", fontWeight: "600", color: "#0f172a" }}>
//                   Order #{order.id}
//                 </p>
//                 <p style={{ fontWeight: 700, color: "#0747a6", fontSize: "1.2rem", margin: "0 0 0.5rem 0" }}>
//                   ₹{orderTotal.toFixed(2)}
//                 </p>
//                 <small style={{ color: "#64748b" }}>
//                   Served at: {servedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                 </small>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* Invoice Section */}
//       {selectedOrder && (
//         <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
//           {/* Left - Invoice Preview */}
//           <section
//             ref={invoiceRef}
//             style={{
//               fontFamily: "'Arial', sans-serif",
//               background: "#ffffff",
//               padding: "40px",
//               borderRadius: "12px",
//               boxShadow: "0 10px 30px rgba(7, 71, 166, 0.2)",
//               color: "#024E89",
//               maxWidth: "700px",
//               margin: "auto",
//             }}
//           >
//             <header style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #0747a6", paddingBottom: "10px", marginBottom: "30px" }}>
//               <h1 style={{ fontWeight: "700", fontSize: "32px", margin: 0 }}>INVOICE</h1>
//               <div>
//   <div style={{ fontSize: "14px", color: "#4a90e2", fontWeight: "600" }}>
//     {documentNumber || "Draft"} {/* ✅ show updated document number */}
//   </div>
//   <div style={{ fontSize: "12px", marginTop: "6px", color: "#7b8ea2" }}>
//     {new Date().toLocaleDateString()}
//   </div>
// </div>


//             </header>
//             <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "30px" }}>
//               <span style={{ color: "darkblue",fontFamily:'cursive',fontSize:'20px',textAlign:'center' }}>{clientId}</span>
//             </div>
//             <section style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
              
//               <div style={{ width: "45%" }}>
//                 <h2 style={{ fontWeight: "700", fontSize: "18px", marginBottom: "10px", borderBottom: "1.5px solid #024E89" }}>Bill To:</h2>
//                 <p style={{ margin: "0", fontWeight: "600",fontSize:'12px' }}>{customerId || "N/A"}</p>
//                 <p style={{ margin: "0", color: "#49657a",fontSize:'12px' }}>{contactEmail}</p>
//               </div>
//               <div style={{ width: "45%", textAlign: "right" }}>
//                 <h2 style={{ fontWeight: "700", fontSize: "18px", marginBottom: "10px", borderBottom: "1.5px solid #024E89" }}>Shipping Info:</h2>
//                 <p style={{ margin: "0", fontWeight: "600" }}>{tablesMap[selectedOrder?.table_id] || "N/A"}</p>
//                 <p style={{ margin: "0", color: "#49657a",fontSize:'12px' }}>Contact: {contactPhone}</p>
//               </div>
//             </section>
           
//             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "#024E89" }}>
//               <thead>
//                 <tr style={{ borderBottom: "2px solid #024E89", textTransform: "uppercase", fontWeight: "700" }}>
//                   <th style={{ padding: "10px 5px", textAlign: "left" }}>Item</th>
//                   <th style={{ padding: "10px 5px", textAlign: "right" }}>Quantity</th>
//                   <th style={{ padding: "10px 5px", textAlign: "right" }}>Unit Price</th>
//                   <th style={{ padding: "10px 5px", textAlign: "right" }}>Amount</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {selectedOrder?.items?.map((item, idx) => (
//                   <tr key={idx} style={{ borderBottom: "1px solid #bfcfe8" }}>
//                     <td style={{ padding: "10px 5px" }}>{item.name}</td>
//                     <td style={{ padding: "10px 5px", textAlign: "right" }}>{item.quantity}</td>
//                     <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{item.unit_price.toFixed(2)}</td>
//                     <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{(item.unit_price * item.quantity).toFixed(2)}</td>
//                   </tr>
//                 ))}
//                 <tr style={{ fontWeight: "600", fontSize: "16px" }}>
//                   <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>Subtotal</td>
//                   <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{subtotal.toFixed(2)}</td>
//                 </tr>
//                 <tr style={{ fontWeight: "600", fontSize: "16px" }}>
//                   <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>Discount</td>
//                   <td style={{ padding: "10px 5px", textAlign: "right" }}>-₹{discountAmount.toFixed(2)}</td>
//                 </tr>
//                 <tr style={{ fontWeight: "600", fontSize: "16px" }}>
//                   <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>GST</td>
//                   <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{taxAmount.toFixed(2)}</td>
//                 </tr>
//                 <tr style={{ borderTop: "3px solid #0747a6", fontWeight: "900", fontSize: "18px", color: "#0747a6" }}>
//                   <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>Total</td>
//                   <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{total.toFixed(2)}</td>
//                 </tr>
//               </tbody>
//             </table>

//             <footer style={{ marginTop: "30px", fontSize: "12px", color: "#64748b", borderTop: "1px solid #dbeafe", paddingTop: "15px" }}>
//               <p>Thank you for your business!</p>
//               <p>This is a computer-generated invoice and does not require a signature.</p>
//             </footer>
//           </section>

//           {/* Right - Actions Panel */}
//           <aside
//             style={{
//               flex: "0 1 360px",
//               backgroundColor: "#ffffff",
//               padding: "2rem",
//               borderRadius: "16px",
//               boxShadow: "0 6px 20px rgba(7,71,166,0.15)",
//               display: "flex",
//               flexDirection: "column",
//               gap: "1.25rem",
//               height: "fit-content",
//             }}
//           >
//             <h3 style={{ marginBottom: "1rem", color: "#0747a6" }}>Actions</h3>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>GST (%)</label>
//               <input
//                 type="number"
//                 value={taxPercent}
//                 onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
//               />
//             </div>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>
//                 Discount {discountIsPercent ? "(%)" : "(₹)"}
//               </label>
//               <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
//                 <input
//                   type="number"
//                   value={discount}
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                   style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
//                 />
//                 <select
//                   value={discountIsPercent ? "%" : "₹"}
//                   onChange={(e) => setDiscountIsPercent(e.target.value === "%")}
//                   style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
//                 >
//                   <option value="%">%</option>
//                   <option value="₹">₹</option>
//                 </select>
//               </div>
//             </div>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Payment Status</label>
//               <select
//                 value={paymentStatus}
//                 onChange={(e) => setPaymentStatus(e.target.value)}
//                 style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
//               >
//                 {["Pending", "Paid", "Partial", "Due"].map((s) => (
//                   <option key={s} value={s}>{s}</option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Invoice Status</label>
//               <select
//                 value={status}
//                 onChange={(e) => setStatus(e.target.value)}
//                 style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
//               >
//                 {["Draft", "Created", "Pending", "Issued", "Cancelled"].map((s) => (
//                   <option key={s} value={s}>{s}</option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Customer ID</label>
//               <input
//                 type="text"
//                 value={customerId}
//                 onChange={(e) => setCustomerId(e.target.value)}
//                 style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
//               />
//             </div>
//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Contact Email</label>
//               <input
//                 type="email"
//                 value={contactEmail}
//                 onChange={(e) => setContactEmail(e.target.value)}
//                 style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
//               />
//             </div>
//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Contact Phone</label>
//               <input
//                 type="text"
//                 value={contactPhone}
//                 onChange={(e) => setContactPhone(e.target.value)}
//                 style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
//               />
//             </div>

//             <button
//               onClick={saveInvoiceDraft}
//               disabled={saving}
//               style={{
//                 width: "100%",
//                 padding: "0.75rem",
//                 backgroundColor: "#0747a6",
//                 color: "#fff",
//                 border: "none",
//                 borderRadius: "8px",
//                 fontWeight: "600",
//                 cursor: "pointer",
//                 boxShadow: "0 4px 6px rgba(7,71,166,0.4)",
//                 transition: "background-color 0.3s ease",
//                 marginBottom: "0.75rem",
//               }}
//               onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0a549f")}
//               onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0747a6")}
//             >
//               {saving ? "Saving..." : "Save Bill"}
//             </button>

//             <button
//               onClick={printInvoice}
//               disabled={!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0}
//               style={{
//                 width: "100%",
//                 padding: "0.75rem",
//                 backgroundColor: "#147d4c",
//                 color: "#fff",
//                 border: "none",
//                 borderRadius: "8px",
//                 fontWeight: "600",
//                 cursor: !selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0 ? "not-allowed" : "pointer",
//                 opacity: !selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0 ? 0.6 : 1,
//                 boxShadow: "0 4px 6px rgba(20,125,76,0.4)",
//                 transition: "background-color 0.3s ease",
//               }}
//               onMouseEnter={(e) => {
//                 if (!(!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0)) {
//                   e.currentTarget.style.backgroundColor = "#176f41";
//                 }
//               }}
//               onMouseLeave={(e) => {
//                 if (!(!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0)) {
//                   e.currentTarget.style.backgroundColor = "#147d4c";
//                 }
//               }}
//             >
//               Download PDF / Print
//             </button>
//           </aside>
//         </div>
//       )}
//     </div>
//   );
// }





// ========================================================== 
// =========================================================================



// import React, { useEffect, useState, useRef } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import jsPDF from "jspdf";

// export default function BillingPage() {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   const [orders, setOrders] = useState([]);
//   const [tablesMap, setTablesMap] = useState({});
//   const [inventoryMap, setInventoryMap] = useState({});
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [taxPercent, setTaxPercent] = useState(18);
//   const [discount, setDiscount] = useState(0);
//   const [method, setMethod] = useState("Cash");
//   const [paymentStatus, setPaymentStatus] = useState("Pending");
//   const [status, setStatus] = useState("Draft");
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [invoiceDraftId, setInvoiceDraftId] = useState(null);
//   const [documentNumber, setDocumentNumber] = useState("");

//   const [customerId, setCustomerId] = useState("");
//   const [contactEmail, setContactEmail] = useState("");
//   const [contactPhone, setContactPhone] = useState("");

//   const invoiceRef = useRef(null);

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
//           orderServices.get(`/${clientId}/dinein/table`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           tableServices.get(`/${clientId}/tables/read`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           inventoryServices.get(`/${clientId}/inventory/read`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//         ]);
//         const served = (ordersRes.data?.data || []).filter(
//           (o) => o.status?.toLowerCase() === "served" && isToday(o.created_at)
//         );
//         setOrders(served);
//         const tMap = {};
//         (tablesRes.data?.data || []).forEach(
//           (t) => (tMap[t.id] = t.name || t.table_number || `Table ${t.id}`)
//         );
//         setTablesMap(tMap);
//         const iMap = {};
//         (invRes.data?.data || []).forEach((i) => (iMap[i.id] = i));
//         setInventoryMap(iMap);
//       } catch {
//         toast.error("Error loading data");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchAll();
//   }, [clientId, token]);

//   const fetchInvoiceDraft = async (orderId) => {
//     try {
//       const res = await invoiceServices.get(`/${clientId}/invoice/read_document`, {
//         headers: { Authorization: `Bearer ${token}` },
//         params: { client_id: clientId, status: "Draft" },
//       });
//       const drafts = res.data?.data || [];
//       const draft = drafts.find((d) => d.order_id?.toString() === orderId?.toString());
//       return draft || {};
//     } catch (err) {
//       console.error("Failed to fetch invoice draft", err);
//       return {};
//     }
//   };

//   const enrichItems = (order) =>
//     (order.items || []).map((item) => {
//       const inv = inventoryMap[item.item_id] || {};
//       return {
//         ...item,
//         unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
//         description: item.description ?? inv.description ?? "",
//         name: item.item_name ?? inv.name ?? "Unnamed Item",
//       };
//     });

//   const subtotal =
//     selectedOrder?.items?.reduce(
//       (sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
//       0
//     ) || 0;
//   const taxAmount = (taxPercent / 100) * subtotal;
//   const discountAmount = discountIsPercent ? (discount / 100) * subtotal : discount;
//   const total = subtotal + taxAmount - discountAmount;

//   const saveInvoiceDraft = async () => {
//     if (!selectedOrder) return toast.error("Select an order first");
//     if (!selectedOrder.items || selectedOrder.items.length === 0)
//       return toast.error("Selected order has no items");

//     setSaving(true);

//     try {
//       const payload = {
//         client_id: clientId,
//         document_type: "Invoice",
//         document_date: new Date().toISOString(),
//         order_id: selectedOrder.id.toString(),
//         reference_number: tablesMap[selectedOrder.table_id] || `Table ${selectedOrder.table_id}`,
//         subtotal: Number(subtotal.toFixed(2)),
//         tax_amount: Number(taxAmount.toFixed(2)),
//         discount_amount: Number(discountAmount.toFixed(2)),
//         total_amount: Number(total.toFixed(2)),
//         payment_status: paymentStatus,
//         payment_method: method,
//         status: status,
//         customer_id: customerId || "",
//         contact_email: contactEmail || "",
//         contact_phone: contactPhone || "",
//       };

//       let draftId = invoiceDraftId;

//       if (!draftId) {
//         const res = await invoiceServices.post(`/${clientId}/invoice/create_document`, payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         draftId = res?.data?.data?.id;
//         if (!draftId) throw new Error("Draft creation failed");
//         setInvoiceDraftId(draftId);
//       } else {
//         await invoiceServices.post(
//           `/${clientId}/invoice/update_document`,
//           { id: draftId, ...payload },
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           }
//         );
//       }

//       const itemsPayload = selectedOrder.items.map((item) => ({
//         item_ref_id: item.item_id?.toString(),
//         description: item.description || "",
//         quantity: item.quantity || 0,
//         unit_price: item.unit_price || 0,
//         total: (item.unit_price || 0) * (item.quantity || 0),
//       }));

//       await invoiceServices.post(
//         `/${clientId}/invoice/create?document_id=${draftId}&client_id=${clientId}`,
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

//   const printInvoice = async () => {
//     if (!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0) return;

//     try {
//       const draftId = invoiceDraftId || (await saveInvoiceDraft());
//       if (!draftId) return toast.error("Failed to create invoice draft");

//       await invoiceServices.post(
//         `/${clientId}/invoice/generate`,
//         {},
//         {
//           headers: { Authorization: `Bearer ${token}` },
//           params: { client_id: clientId, invoice_id: draftId },
//         }
//       );

//       const issueRes = await invoiceServices.post(
//         `/${clientId}/invoice/issue`,
//         {},
//         {
//           headers: { Authorization: `Bearer ${token}` },
//           params: { client_id: clientId, invoice_id: draftId },
//         }
//       );

//       const docNum = issueRes?.data?.data?.document_number || "";
//       setDocumentNumber(docNum);

//       setTimeout(() => {
//         if (!invoiceRef.current) return;

//         const pdf = new jsPDF({
//           orientation: "portrait",
//           unit: "pt",
//           format: "a4",
//         });

//         pdf.html(invoiceRef.current, {
//           callback: (doc) => {
//             doc.save(`Invoice_${draftId}.pdf`);
//           },
//           margin: [40, 40, 40, 40],
//           autoPaging: "text",
//           x: 0,
//           y: 0,
//           windowWidth: 800,
//         });
//       }, 100);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to generate invoice PDF");
//     }
//   };

//   return (
//     <div
//       className="billing-page"
//       style={{
//         fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
//         padding: "2rem",
//         background: "#f3f6fb",
//         minHeight: "100vh",
//       }}
//     >
//       <h1
//         style={{
//           fontSize: "2rem",
//           fontWeight: 700,
//           color: "#0747a6",
//           marginBottom: "2rem",
//           borderBottom: "3px solid #0747a6",
//           paddingBottom: "0.5rem",
//         }}
//       >
//         Billing & Invoices
//       </h1>

//       {/* Orders Grid */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
//           gap: "1.5rem",
//           marginBottom: "3rem",
//         }}
//       >
//         {loading ? (
//           <p style={{ color: "#555", fontStyle: "italic" }}>Loading...</p>
//         ) : orders.length === 0 ? (
//           <p style={{ color: "#888", fontStyle: "italic" }}>No served orders today</p>
//         ) : (
//           orders.map((order) => {
//             const tableName = tablesMap[order.table_id];
//             const servedTime = new Date(order.created_at);
//             const orderTotal = enrichItems(order).reduce(
//               (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
//               0
//             );
//             return (
//               <div
//                 key={order.id}
//                 onClick={async () => {
//                   const enrichedItems = enrichItems(order);
//                   const invoiceDraft = await fetchInvoiceDraft(order.id);
//                   setCustomerId(invoiceDraft.customer_id || "");
//                   setContactEmail(invoiceDraft.contact_email || "");
//                   setContactPhone(invoiceDraft.contact_phone || "");
//                   setInvoiceDraftId(invoiceDraft.id || null);
//                   setStatus(invoiceDraft.status || "Draft");
//                   setSelectedOrder({ ...order, items: enrichedItems });
//                   setDocumentNumber(invoiceDraft.document_number || "");
//                   setPaymentStatus(invoiceDraft.payment_status || "Pending");
//                 }}
//                 style={{
//                   padding: "1.5rem",
//                   background: selectedOrder?.id === order.id ? "#dce6fb" : "#ffffff",
//                   borderRadius: "12px",
//                   boxShadow:
//                     selectedOrder?.id === order.id
//                       ? "0 0 10px rgba(7, 71, 166, 0.3)"
//                       : "0 2px 6px rgba(0,0,0,0.1)",
//                   border: selectedOrder?.id === order.id ? "2px solid #0747a6" : "1px solid #ccd6f6",
//                   cursor: "pointer",
//                   transition: "all 0.3s ease",
//                 }}
//               >
//                 <h3 style={{ margin: "0 0 0.2rem 0", color: "#0747a6" }}>
//                   {tableName || `Table ${order.table_id}`}
//                 </h3>
//                 <p style={{ margin: "0 0 0.4rem 0", fontWeight: "600", color: "#0f172a" }}>
//                   Order #{order.id}
//                 </p>
//                 <p
//                   style={{
//                     fontWeight: 700,
//                     color: "#0747a6",
//                     fontSize: "1.2rem",
//                     margin: "0 0 0.5rem 0",
//                   }}
//                 >
//                   ₹{orderTotal.toFixed(2)}
//                 </p>
//                 <small style={{ color: "#64748b" }}>
//                   Served at: {servedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                 </small>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* Invoice Section */}
//       {selectedOrder && (
//         <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
//           {/* Left - Invoice Preview */}
//           <section
//             ref={invoiceRef}
//             style={{
//               fontFamily: "'Arial', sans-serif",
//               background: "#ffffff",
//               padding: "40px",
//               borderRadius: "12px",
//               boxShadow: "0 10px 30px rgba(7, 71, 166, 0.2)",
//               color: "#024E89",
//               maxWidth: "700px",
//               margin: "auto",
//             }}
//           >
//             <header
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 borderBottom: "3px solid #0747a6",
//                 paddingBottom: "10px",
//                 marginBottom: "30px",
//               }}
//             >
//               <h1 style={{ fontWeight: "700", fontSize: "32px", margin: 0 }}>INVOICE</h1>
//               <div>
//                 <div style={{ fontSize: "14px", color: "#4a90e2", fontWeight: "600" }}>
//                   {documentNumber || "Draft"} {/* show updated document number */}
//                 </div>
//                 <div style={{ fontSize: "12px", marginTop: "6px", color: "#7b8ea2" }}>
//                   {new Date().toLocaleDateString()}
//                 </div>
//               </div>
//             </header>
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "center",
//                 gap: "6px",
//                 marginBottom: "30px",
//               }}
//             >
//               <span
//                 style={{ color: "darkblue", fontFamily: "cursive", fontSize: "20px", textAlign: "center" }}
//               >
//                 {clientId}
//               </span>
//             </div>
//             <section
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 marginBottom: "30px",
//               }}
//             >
//               <div style={{ width: "45%" }}>
//                 <h2
//                   style={{
//                     fontWeight: "700",
//                     fontSize: "18px",
//                     marginBottom: "10px",
//                     borderBottom: "1.5px solid #024E89",
//                   }}
//                 >
//                   Bill To:
//                 </h2>
//                 <p style={{ margin: "0", fontWeight: "600", fontSize: "12px" }}>{customerId || "N/A"}</p>
//                 <p style={{ margin: "0", color: "#49657a", fontSize: "12px" }}>{contactEmail}</p>
//               </div>
//               <div style={{ width: "45%", textAlign: "right" }}>
//                 <h2
//                   style={{
//                     fontWeight: "700",
//                     fontSize: "18px",
//                     marginBottom: "10px",
//                     borderBottom: "1.5px solid #024E89",
//                   }}
//                 >
//                   Shipping Info:
//                 </h2>
//                 <p style={{ margin: "0", fontWeight: "600" }}>
//                   {tablesMap[selectedOrder?.table_id] || "N/A"}
//                 </p>
//                 <p style={{ margin: "0", color: "#49657a", fontSize: "12px" }}>
//                   Contact: {contactPhone}
//                 </p>
//               </div>
//             </section>

//             <table
//               style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "#024E89" }}
//             >
//               <thead>
//                 <tr
//                   style={{
//                     borderBottom: "2px solid #024E89",
//                     textTransform: "uppercase",
//                     fontWeight: "700",
//                   }}
//                 >
//                   <th style={{ padding: "10px 5px", textAlign: "left" }}>Item</th>
//                   <th style={{ padding: "10px 5px", textAlign: "right" }}>Quantity</th>
//                   <th style={{ padding: "10px 5px", textAlign: "right" }}>Unit Price</th>
//                   <th style={{ padding: "10px 5px", textAlign: "right" }}>Amount</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {selectedOrder?.items?.map((item, idx) => (
//                   <tr key={idx} style={{ borderBottom: "1px solid #bfcfe8" }}>
//                     <td style={{ padding: "10px 5px" }}>{item.name}</td>
//                     <td style={{ padding: "10px 5px", textAlign: "right" }}>{item.quantity}</td>
//                     <td style={{ padding: "10px 5px", textAlign: "right" }}>
//                       ₹{item.unit_price.toFixed(2)}
//                     </td>
//                     <td style={{ padding: "10px 5px", textAlign: "right" }}>
//                       ₹{(item.unit_price * item.quantity).toFixed(2)}
//                     </td>
//                   </tr>
//                 ))}
//                 <tr style={{ fontWeight: "600", fontSize: "16px" }}>
//                   <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>
//                     Subtotal
//                   </td>
//                   <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{subtotal.toFixed(2)}</td>
//                 </tr>
//                 <tr style={{ fontWeight: "600", fontSize: "16px" }}>
//                   <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>
//                     Discount
//                   </td>
//                   <td style={{ padding: "10px 5px", textAlign: "right" }}>
//                     -₹{discountAmount.toFixed(2)}
//                   </td>
//                 </tr>
//                 <tr style={{ fontWeight: "600", fontSize: "16px" }}>
//                   <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>
//                     GST
//                   </td>
//                   <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{taxAmount.toFixed(2)}</td>
//                 </tr>
//                 <tr
//                   style={{
//                     borderTop: "3px solid #0747a6",
//                     fontWeight: "900",
//                     fontSize: "18px",
//                     color: "#0747a6",
//                   }}
//                 >
//                   <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>
//                     Total
//                   </td>
//                   <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{total.toFixed(2)}</td>
//                 </tr>
//               </tbody>
//             </table>

//             <footer
//               style={{
//                 marginTop: "30px",
//                 fontSize: "12px",
//                 color: "#64748b",
//                 borderTop: "1px solid #dbeafe",
//                 paddingTop: "15px",
//               }}
//             >
//               <p>Thank you for your business!</p>
//               <p>This is a computer-generated invoice and does not require a signature.</p>
//             </footer>
//           </section>

//           {/* Right - Actions Panel */}
//           <aside
//             style={{
//               flex: "0 1 360px",
//               backgroundColor: "#ffffff",
//               padding: "2rem",
//               borderRadius: "16px",
//               boxShadow: "0 6px 20px rgba(7,71,166,0.15)",
//               display: "flex",
//               flexDirection: "column",
//               gap: "1.25rem",
//               height: "fit-content",
//             }}
//           >
//             <h3 style={{ marginBottom: "1rem", color: "#0747a6" }}>Actions</h3>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>GST (%)</label>
//               <input
//                 type="number"
//                 value={taxPercent}
//                 onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 style={{
//                   width: "100%",
//                   padding: "0.5rem",
//                   marginTop: "0.25rem",
//                   borderRadius: "6px",
//                   border: "1px solid #cbd5e1",
//                 }}
//               />
//             </div>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>
//                 Discount {discountIsPercent ? "(%)" : "(₹)"}
//               </label>
//               <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
//                 <input
//                   type="number"
//                   value={discount}
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                   style={{
//                     flex: 1,
//                     padding: "0.5rem",
//                     borderRadius: "6px",
//                     border: "1px solid #cbd5e1",
//                   }}
//                 />
//                 <select
//                   value={discountIsPercent ? "%" : "₹"}
//                   onChange={(e) => setDiscountIsPercent(e.target.value === "%")}
//                   style={{
//                     padding: "0.5rem",
//                     borderRadius: "6px",
//                     border: "1px solid #cbd5e1",
//                   }}
//                 >
//                   <option value="%">%</option>
//                   <option value="₹">₹</option>
//                 </select>
//               </div>
//             </div>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Payment Status</label>
//               <select
//                 value={paymentStatus}
//                 onChange={(e) => setPaymentStatus(e.target.value)}
//                 style={{
//                   width: "100%",
//                   padding: "0.5rem",
//                   marginTop: "0.25rem",
//                   borderRadius: "6px",
//                   border: "1px solid #cbd5e1",
//                 }}
//               >
//                 {["Pending", "Paid", "Partial", "Due"].map((s) => (
//                   <option key={s} value={s}>
//                     {s}
//                   </option>
//                 ))}
//               </select>
//             </div>
// <div>
//   <label htmlFor="payment-method" className="input-label">
//     Payment Method
//   </label>
//   <select
//     id="payment-method"
//     value={method}
//     onChange={(e) => setMethod(e.target.value)}
//     className="input-field"
//   >
//     {["Cash", "UPI", "Card", "Due"].map((option) => (
//       <option key={option} value={option}>
//         {option}
//       </option>
//     ))}
//   </select>
// </div>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Invoice Status</label>
//               <select
//                 value={status}
//                 onChange={(e) => setStatus(e.target.value)}
//                 style={{
//                   width: "100%",
//                   padding: "0.5rem",
//                   marginTop: "0.25rem",
//                   borderRadius: "6px",
//                   border: "1px solid #cbd5e1",
//                 }}
//               >
//                 {["Draft", "Created", "Pending", "Issued", "Cancelled"].map((s) => (
//                   <option key={s} value={s}>
//                     {s}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Customer ID</label>
//               <input
//                 type="text"
//                 value={customerId}
//                 onChange={(e) => setCustomerId(e.target.value)}
//                 style={{
//                   width: "100%",
//                   padding: "0.5rem",
//                   marginTop: "0.25rem",
//                   borderRadius: "6px",
//                   border: "1px solid #cbd5e1",
//                 }}
//               />
//             </div>
//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Contact Email</label>
//               <input
//                 type="email"
//                 value={contactEmail}
//                 onChange={(e) => setContactEmail(e.target.value)}
//                 style={{
//                   width: "100%",
//                   padding: "0.5rem",
//                   marginTop: "0.25rem",
//                   borderRadius: "6px",
//                   border: "1px solid #cbd5e1",
//                 }}
//               />
//             </div>
//             <div>
//               <label style={{ fontWeight: "600", color: "#334155" }}>Contact Phone</label>
//               <input
//                 type="text"
//                 value={contactPhone}
//                 onChange={(e) => setContactPhone(e.target.value)}
//                 style={{
//                   width: "100%",
//                   padding: "0.5rem",
//                   marginTop: "0.25rem",
//                   borderRadius: "6px",
//                   border: "1px solid #cbd5e1",
//                 }}
//               />
//             </div>

//             <button
//               onClick={saveInvoiceDraft}
//               disabled={saving}
//               style={{
//                 width: "100%",
//                 padding: "0.75rem",
//                 backgroundColor: "#0747a6",
//                 color: "#fff",
//                 border: "none",
//                 borderRadius: "8px",
//                 fontWeight: "600",
//                 cursor: "pointer",
//                 boxShadow: "0 4px 6px rgba(7,71,166,0.4)",
//                 transition: "background-color 0.3s ease",
//                 marginBottom: "0.75rem",
//               }}
//               onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0a549f")}
//               onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0747a6")}
//             >
//               {saving ? "Saving..." : "Save Bill"}
//             </button>

//             <button
//               onClick={printInvoice}
//               disabled={!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0}
//               style={{
//                 width: "100%",
//                 padding: "0.75rem",
//                 backgroundColor: "#147d4c",
//                 color: "#fff",
//                 border: "none",
//                 borderRadius: "8px",
//                 fontWeight: "600",
//                 cursor:
//                   !selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0
//                     ? "not-allowed"
//                     : "pointer",
//                 opacity:
//                   !selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0 ? 0.6 : 1,
//                 boxShadow: "0 4px 6px rgba(20,125,76,0.4)",
//                 transition: "background-color 0.3s ease",
//               }}
//               onMouseEnter={(e) => {
//                 if (!(!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0)) {
//                   e.currentTarget.style.backgroundColor = "#176f41";
//                 }
//               }}
//               onMouseLeave={(e) => {
//                 if (!(!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0)) {
//                   e.currentTarget.style.backgroundColor = "#147d4c";
//                 }
//               }}
//             >
//               Download PDF / Print
//             </button>
//           </aside>
//         </div>
//       )}
//     </div>
//   );
// }




// ===================================================================================================================



// import React, { useEffect, useState, useRef } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import jsPDF from "jspdf";

// export default function BillingPage() {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   const [orders, setOrders] = useState([]);
//   const [tablesMap, setTablesMap] = useState({});
//   const [inventoryMap, setInventoryMap] = useState({});
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [taxPercent, setTaxPercent] = useState(18);
//   const [discount, setDiscount] = useState(0);
//   const [method, setMethod] = useState("Cash");
//   const [paymentStatus, setPaymentStatus] = useState("Pending");
//   const [status, setStatus] = useState("Draft");
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [invoiceDraftId, setInvoiceDraftId] = useState(null);
//   const [documentNumber, setDocumentNumber] = useState("");
//   const [customerId, setCustomerId] = useState("");
//   const [contactEmail, setContactEmail] = useState("");
//   const [contactPhone, setContactPhone] = useState("");
//   const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
//   const [paymentSplits, setPaymentSplits] = useState([{ method: "Cash", amount: 0 }]);
//   const [balanceAmount, setBalanceAmount] = useState(0);
//   const [editingSplitIndex, setEditingSplitIndex] = useState(null);
//   const [singlePaymentAmount, setSinglePaymentAmount] = useState(0);

//   const invoiceRef = useRef(null);

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
//           orderServices.get(`/${clientId}/dinein/table`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           tableServices.get(`/${clientId}/tables/read`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           inventoryServices.get(`/${clientId}/inventory/read`, {
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
//       const res = await invoiceServices.get(`/${clientId}/invoice/read_document`, {
//         headers: { Authorization: `Bearer ${token}` },
//         params: { client_id: clientId },
//       });
//       const invoices = res.data?.data || [];
//       const invoice = invoices.find(
//         (d) => d.order_id?.toString() === orderId?.toString()
//       );
//       return invoice || {};
//     } catch (err) {
//       console.error("Failed to fetch invoice", err);
//       return {};
//     }
//   };
  

//   const subtotal =
//     selectedOrder?.items?.reduce(
//       (sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
//       0
//     ) || 0;

//   const taxAmount = (taxPercent / 100) * subtotal;
//   const discountAmount = discountIsPercent ? (discount / 100) * subtotal : discount;
//   const total = Number((subtotal + taxAmount - discountAmount).toFixed(2));

//   const sumSplits = (splits) =>
//     splits.reduce((sum, s) => sum + Number(s.amount), 0);

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

//   const updateSplitMethod = (index, newMethod) => {
//     setPaymentSplits((prevSplits) => {
//       const updated = [...prevSplits];
//       updated[index].method = newMethod;
//       return updated;
//     });
//   };

//   useEffect(() => {
//     if (!splitPaymentEnabled) {
//       setSinglePaymentAmount(total);
//       setBalanceAmount(Number((singlePaymentAmount - total).toFixed(2)));
//     } else {
//       setPaymentSplits([{ method: "Cash", amount: total }]);
//       setBalanceAmount(0);
//     }
//   }, [total, splitPaymentEnabled]);

//   const onSinglePaymentAmountChange = (val) => {
//     let amount = Number(val);
//     if (isNaN(amount) || amount < 0) amount = 0;
//     setSinglePaymentAmount(amount);
//     setBalanceAmount(Number((amount - total).toFixed(2)));
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
//       const sumPayments = paymentSplits.reduce((sum, p) => sum + p.amount, 0);
//       if (Number(sumPayments.toFixed(2)) !== Number(total.toFixed(2))) {
//         toast.error("Split payment amounts do not sum up to the total");
//         return;
//       }
//     } else {
//       if (singlePaymentAmount < total || isNaN(singlePaymentAmount)) {
//         toast.error("Payment amount should be equal or greater than total");
//         return;
//       }
//     }
//     const paymentMethodString = splitPaymentEnabled
//       ? paymentSplits
//           .map((p) => `${p.method}(${Number(p.amount).toFixed(2)})`)
//           .join(" & ")
//       : `${method}(${Number(singlePaymentAmount).toFixed(2)})`;

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
//         payment_method: paymentMethodString,
//         payment_splits: splitPaymentEnabled
//           ? paymentSplits.map(({ method, amount }) => ({ method, amount: Number(amount.toFixed(2)) }))
//           : null,
//         single_payment_amount: splitPaymentEnabled ? null : Number(singlePaymentAmount.toFixed(2)),
//         status: status,
//         customer_id: selectedOrder.customer_id || "",
//         contact_email: selectedOrder.contact_email || "",
//         contact_phone: selectedOrder.contact_phone || "",
//       };
      
//       let draftId = invoiceDraftId;

//       if (!draftId) {
//         const res = await invoiceServices.post(
//           `/${clientId}/invoice/create_document`,
//           payload,
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           }
//         );
//         draftId = res?.data?.data?.id;
//         if (!draftId) throw new Error("Draft creation failed");
//         setInvoiceDraftId(draftId);
//       } else {
//         await invoiceServices.post(
//           `/${clientId}/invoice/update_document`,
//           { id: draftId, ...payload },
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           }
//         );
//       }

//       const itemsPayload = selectedOrder.items.map((item) => ({
//         item_ref_id: item.item_id?.toString(),
//         description: item.description || "",
//         quantity: item.quantity || 0,
//         unit_price: item.unit_price || 0,
//         total: (item.unit_price || 0) * (item.quantity || 0),
//       }));

//       await invoiceServices.post(
//         `/${clientId}/invoice/create?document_id=${draftId}&client_id=${clientId}`,
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

//   const printInvoice = async () => {
//     if (!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0) return;
  
//     try {
//       let draftId = invoiceDraftId;
  
//       if (!draftId) {
//         draftId = await saveInvoiceDraft();
//         if (!draftId) return toast.error("Failed to create invoice draft");
//       }
  
//       if (status === "Issued" || status === "Created") {
//         toast.info("Invoice already exists. Using existing data.");
//       } else {
//         await invoiceServices.post(
//           `/${clientId}/invoice/generate`,
//           {},
//           {
//             headers: { Authorization: `Bearer ${token}` },
//             params: { client_id: clientId, invoice_id: draftId },
//           }
//         );
  
//         const issueRes = await invoiceServices.post(
//           `/${clientId}/invoice/issue`,
//           {},
//           {
//             headers: { Authorization: `Bearer ${token}` },
//             params: { client_id: clientId, invoice_id: draftId },
//           }
//         );
  
//         const docNum = issueRes?.data?.data?.document_number || "";
//         setDocumentNumber(docNum);
//         setStatus("Issued");
//       }
  
//       if (!invoiceRef.current) return;
  
//       const pdf = new jsPDF({
//         orientation: "portrait",
//         unit: "pt",
//         format: "a4",
//       });

//       pdf.html(invoiceRef.current, {
//         callback: (doc) => {
//           doc.save(`Invoice_${draftId}.pdf`);
//         },
//         margin: [40, 40, 40, 40],
//         autoPaging: "text",
//         x: 0,
//         y: 0,
//         windowWidth: 1200, // wider window for full date display
//       });
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to generate invoice PDF");
//     }
//   };
  

//   return (
//     <div className="billing-page">
//       <h1 className="billing-title">Billing Invoices</h1>
  
//       {/* Orders Grid */}
//       <div className="orders-grid" role="list" aria-label="Orders Grid">
//         {loading && <p className="loading-text">Loading...</p>}
//         {!loading && orders.length === 0 && (
//           <p className="empty-text">No served orders today</p>
//         )}
  
//         {orders.map((order) => {
//           const table = tablesMap[order.table_id];
//           const tableName = table
//             ? `${table.name || "Table"} ${table.table_number || order.table_id}`
//             : `Table ${order.table_id}`;
//           const servedTime = new Date(order.created_at);
//           const orderTotal = order.items.reduce(
//             (sum, i) =>
//               sum +
//               (i.unit_price ?? i.price ?? 0) *
//                 (i.quantity ?? 1),
//             0
//           );
//           const isSelected = selectedOrder?.id === order.id;
  
//           return (
//             <div
//               key={order.id}
//               role="button"
//               tabIndex={0}
//               className={`order-item ${isSelected ? "selected" : ""}`}
//               onClick={async () => {
//                 const enrichedItems = (order.items || []).map((item) => {
//                   const inv = inventoryMap[item.item_id] || {};
//                   return {
//                     ...item,
//                     unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
//                     description: item.description ?? inv.description ?? "",
//                     name: item.item_name ?? inv.name ?? "Unnamed Item",
//                   };
//                 });
              
//                 const invoiceDraft = await fetchInvoiceDraft(order.id);
              
//                 // Merge invoice draft data into selectedOrder
//                 const updatedOrder = {
//                   ...order,
//                   items: enrichedItems,
//                   customer_id: invoiceDraft?.customer_id || order.customer_id || "",
//                   contact_email: invoiceDraft?.contact_email || order.contact_email || "",
//                   contact_phone: invoiceDraft?.contact_phone || order.contact_phone || "",
//                 };
              
//                 setSelectedOrder(updatedOrder);
              
//                 setInvoiceDraftId(invoiceDraft?.id ?? null);
//                 setStatus(invoiceDraft?.status ?? "Draft");
//                 setDocumentNumber(invoiceDraft?.document_number ?? "");
//                 setPaymentStatus(invoiceDraft?.payment_status ?? "Pending");
              
//                 const total = updatedOrder.items.reduce(
//                   (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
//                   0
//                 );
              
//                 // Handle split payments
//                 if (invoiceDraft?.payment_splits?.length > 0) {
//                   setSplitPaymentEnabled(true);
//                   setPaymentSplits(
//                     invoiceDraft.payment_splits.map((split) => ({
//                       method: split.method ?? "Cash",
//                       amount: split.amount ?? 0,
//                     }))
//                   );
//                   setBalanceAmount(
//                     total -
//                       invoiceDraft.payment_splits.reduce((sum, s) => sum + s.amount, 0)
//                   );
//                 } else {
//                   setSplitPaymentEnabled(false);
//                   setPaymentSplits([{ method: "Cash", amount: total }]);
//                   setBalanceAmount(0);
//                 }
              
//                 setMethod(invoiceDraft?.payment_method ?? "Cash");
//                 setSinglePaymentAmount(invoiceDraft?.single_payment_amount ?? total);
//               }}
              
//               onKeyDown={(e) => {
//                 if (e.key === "Enter" || e.key === " ") {
//                   e.preventDefault();
//                   e.currentTarget.click();
//                 }
//               }}
//             >
//               <h3>{tableName}</h3>
//               <p>
//                 <strong>Order -{order.id}</strong>
//               </p>
//               <p className="order-total">₹{orderTotal.toFixed(2)}</p>
//               <time
//                 className="served-time"
//                 dateTime={servedTime.toISOString()}
//               >
//                 Served at{" "}
//                 {servedTime.toLocaleTimeString([], {
//                   hour: "2-digit",
//                   minute: "2-digit",
//                 })}
//               </time>
//             </div>
//           );
//         })}
//       </div>
  
//       {/* Invoice Overlay */}
//       {selectedOrder && (
//         <div
//           className="invoice-overlay"
//           role="dialog"
//           aria-modal="true"
//           aria-label="Invoice details overlay"
//           tabIndex={-1}
//           onClick={(e) => {
//             if (e.target.classList.contains("invoice-overlay")) {
//               setSelectedOrder(null);
//             }
//           }}
//         >
//           <div className="invoice-section" onClick={(e) => e.stopPropagation()}>
//             <button
//               className="btn-close-overlay"
//               aria-label="Close invoice preview"
//               onClick={() => setSelectedOrder(null)}
//             >
//               ×
//             </button>
  
//             {/* Left: Invoice Preview */}
//             <section
//               ref={invoiceRef}
//               className="invoice-preview"
//               aria-label="Invoice Preview"
//             >
//               <header className="invoice-header">
//                 <h1>{clientId}</h1>
//                 <h1>INVOICE</h1>
//                 <div className="document-info">
//                   <span className="document-number">
//                     {documentNumber || "Draft"}
//                   </span>
//                   <span className="document-date">
//                     {new Date().toLocaleDateString()}
//                   </span>
//                 </div>
//               </header>
  
//               <div className="bill-shipping-info">
//               <div className="bill-to">
//   <h2>Bill To</h2>
//   <p>
//     <strong>Customer ID:</strong>{" "}
//     <input
//       type="text"
//       value={selectedOrder.customer_id || ""}
//       onChange={(e) =>
//         setSelectedOrder((prev) => ({ ...prev, customer_id: e.target.value }))
//       }
//       className="inline-input"
//     />
//   </p>
//   <p>
//     <strong>Email:</strong>{" "}
//     <input
//       type="email"
//       value={selectedOrder.contact_email || ""}
//       onChange={(e) =>
//         setSelectedOrder((prev) => ({ ...prev, contact_email: e.target.value }))
//       }
//       className="inline-input"
//     />
//   </p>
//   <p>
//     <strong>Phone:</strong>{" "}
//     <input
//       type="text"
//       value={selectedOrder.contact_phone || ""}
//       onChange={(e) =>
//         setSelectedOrder((prev) => ({ ...prev, contact_phone: e.target.value }))
//       }
//       className="inline-input"
//     />
//   </p>
// </div>

//                 <div className="shipping-info">
//                   <h2>Shipping Info</h2>
//                   <p>
//                     <strong>Table:</strong>{" "}
//                     {tablesMap[selectedOrder.table_id]?.name || "N/A"}
//                   </p>
//                   <p>
//                     <strong>Contact:</strong> {contactPhone || "-"}
//                   </p>
//                 </div>
//               </div>
  
//               <table
//                 className="invoice-table"
//                 aria-label="Invoice Items"
//                 role="table"
//               >
//                 <thead>
//                   <tr>
//                     <th scope="col">Item</th>
//                     <th scope="col" className="right-align">
//                       Quantity
//                     </th>
//                     <th scope="col" className="right-align">
//                       Unit Price
//                     </th>
//                     <th scope="col" className="right-align">
//                       Amount
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {selectedOrder.items.map((item, idx) => (
//                     <tr key={idx}>
//                       <td>{item.name}</td>
//                       <td className="right-align">{item.quantity ?? 0}</td>
//                       <td className="right-align">
//                       ₹{(item.unit_price ?? 0).toFixed(2)}
//                       </td>
//                       <td className="right-align">
//                       ₹{((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}
//                       </td>
//                     </tr>
//                   ))}
//                   <tr className="summary-row">
//                     <td colSpan="3" className="right-align">
//                       Subtotal
//                     </td>
//                     <td className="right-align">{subtotal.toFixed(2)}</td>
//                   </tr>
//                   <tr className="summary-row">
//                     <td colSpan="3" className="right-align">
//                       Discount
//                     </td>
//                     <td className="right-align">
//                       -{discountAmount.toFixed(2)}
//                     </td>
//                   </tr>
//                   <tr className="summary-row">
//                     <td colSpan="3" className="right-align">
//                       GST
//                     </td>
//                     <td className="right-align">{taxAmount.toFixed(2)}</td>
//                   </tr>
//                   <tr className="summary-row total-row">
//                     <td colSpan="3" className="right-align">
//                       Total
//                     </td>
//                     <td className="right-align">{total.toFixed(2)}</td>
//                   </tr>
//                 </tbody>
//               </table>
  
//               <footer
//                 className="invoice-footer"
//                 aria-label="Invoice Footer"
//               >
//                 <p>Thank you for your business with {clientId}` !</p>
//                 <p>This is a computer-generated invoice and does not require a signature.</p>
//               </footer>
//             </section>
  
//             {/* Right: Actions Panel */}
//             <aside className="actions-panel" aria-label="Invoice Actions">
//               <h3>Actions</h3>
  
//               <label htmlFor="tax-percent">GST (%)</label>
//               <input
//                 id="tax-percent"
//                 type="number"
//                 className="input-field"
//                 value={taxPercent}
//                 onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 min={0}
//               />
  
//               <label>Discount</label>
//               <div className="discount-control">
//                 <input
//                   type="number"
//                   value={discount}
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                   className="input-field"
//                   min={0}
//                 />
//                 <select
//                   value={discountIsPercent ? "percent" : "fixed"}
//                   onChange={(e) => setDiscountIsPercent(e.target.value === "percent")}
//                   className="input-field discount-select"
//                 >
//                   <option value="percent">%</option>
//                   <option value="fixed">Fixed</option>
//                 </select>
//               </div>
  
//               <label htmlFor="payment-status">Payment Status</label>
//               <select
//                 id="payment-status"
//                 value={paymentStatus}
//                 onChange={(e) => setPaymentStatus(e.target.value)}
//                 className="input-field"
//               >
//                 <option>Pending</option>
//                 <option>Paid</option>
//                 <option>Partial</option>
//                 <option>Due</option>
//               </select>
  
//               <label className="checkbox-label">
//                 <input
//                   type="checkbox"
//                   checked={splitPaymentEnabled}
//                   onChange={() => {
//                     setSplitPaymentEnabled(!splitPaymentEnabled);
//                     if (!splitPaymentEnabled) {
//                       setPaymentSplits([{ method: "Cash", amount: total }]);
//                       setBalanceAmount(0);
//                     } else {
//                       setMethod("Cash");
//                       setPaymentSplits([{ method: "Cash", amount: total }]);
//                       setSinglePaymentAmount(total);
//                       setBalanceAmount(0);
//                     }
//                   }}
//                 />
//                 Enable Split Payment
//               </label>
  
//               {splitPaymentEnabled && (
//                 <div
//                   className="split-payments-container"
//                   style={{ maxHeight: 250, overflowY: "auto" }}
//                 >
//                   {paymentSplits.map((split, idx) => (
//                     <div key={idx} className="split-payment-row">
//                       <select
//                         value={split.method}
//                         onChange={(e) => {
//                           const newSplits = [...paymentSplits];
//                           newSplits[idx].method = e.target.value;
//                           setPaymentSplits(newSplits);
//                         }}
//                         className="input-field split-method-select"
//                       >
//                         <option>Cash</option>
//                         <option>UPI</option>
//                         <option>Card</option>
//                         <option>Due</option>
//                       </select>
//                       <input
//                         type="number"
//                         step="0.01"
//                         min="0"
//                         value={split.amount}
//                         onChange={(e) => {
//                           const newAmount = Number(e.target.value) || 0;
//                           const newSplits = [...paymentSplits];
//                           newSplits[idx].amount = newAmount > total ? total : newAmount;
//                           setPaymentSplits(newSplits);
//                         }}
//                         onBlur={() => {
//                           onSplitAmountBlur(idx);
//                         }}
//                         className="input-field split-amount-input"
//                         placeholder="Amount"
//                       />
//                       <button
//                         type="button"
//                         onClick={() => {
//                           if (paymentSplits.length > 1) {
//                             const newSplits = paymentSplits.filter((_, i) => i !== idx);
//                             setPaymentSplits(newSplits);
//                           }
//                         }}
//                         aria-label={`Remove payment split ${idx + 1}`}
//                         className="btn-remove-split"
//                         disabled={paymentSplits.length === 1}
//                       >
//                         &times;
//                       </button>
//                     </div>
//                   ))}
//                   <button
//                     type="button"
//                     onClick={addSplitRow}
//                     className="btn-add-split"
//                   >
//                     Add Payment Method
//                   </button>
//                   <p className="balance-amount">
//                     Balance:{" "}
//                     {balanceAmount < 0
//                       ? `-${Math.abs(balanceAmount).toFixed(2)}`
//                       : balanceAmount.toFixed(2)}
//                   </p>
//                 </div>
//               )}
  
//               {!splitPaymentEnabled && (
//                 <>
//                   <label htmlFor="payment-method">Payment Method</label>
//                   <select
//                     id="payment-method"
//                     value={method}
//                     onChange={(e) => setMethod(e.target.value)}
//                     className="input-field"
//                   >
//                     <option>Cash</option>
//                     <option>UPI</option>
//                     <option>Card</option>
//                     <option>Due</option>
//                   </select>
  
//                   <label htmlFor="amount-given">Amount Given</label>
//                   <input
//                     id="amount-given"
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={singlePaymentAmount}
//                     onChange={(e) => onSinglePaymentAmountChange(e.target.value)}
//                     placeholder="Enter amount received"
//                     className="input-field"
//                   />
//                   <p className="balance-amount">
//                     Balance:{" "}
//                     {balanceAmount < 0
//                       ? `-${Math.abs(balanceAmount).toFixed(2)}`
//                       : balanceAmount.toFixed(2)}
//                   </p>
//                 </>
//               )}
  
//               <label htmlFor="invoice-status">Invoice Status</label>
//               {/* <select
//                 id="invoice-status"
//                 value={status}
//                 onChange={(e) => setStatus(e.target.value)}
//                 className="input-field"
//               >
//                 <option>Draft</option>
//                 <option>Created</option>
//                 <option>Pending</option>
//                 <option>Issued</option>
//                 <option>Cancelled</option>
//               </select> */}
  
//               {/* <label htmlFor="customer-id">Customer ID</label>
//               <input
//                 id="customer-id"
//                 type="text"
//                 value={customerId}
//                 onChange={(e) => setCustomerId(e.target.value)}
//                 className="input-field"
//               />
  
//               <label htmlFor="contact-email">Contact Email</label>
//               <input
//                 id="contact-email"
//                 type="email"
//                 value={contactEmail}
//                 onChange={(e) => setContactEmail(e.target.value)}
//                 className="input-field"
//               />
  
//               <label htmlFor="contact-phone">Contact Phone</label>
//               <input
//                 id="contact-phone"
//                 type="text"
//                 value={contactPhone}
//                 onChange={(e) => setContactPhone(e.target.value)}
//                 className="input-field"
//               /> */}
  
//               <button
//                 onClick={saveInvoiceDraft}
//                 disabled={saving}
//                 className="btn-primary"
//                 type="button"
//               >
//                 {saving ? "Saving..." : "Save Bill"}
//               </button>
//               <button
//                 onClick={printInvoice}
//                 disabled={!selectedOrder || !selectedOrder.items?.length}
//                 className="btn-success"
//                 type="button"
//               >
//                 Download PDF / Print
//               </button>
//             </aside>
//           </div>
//         </div>
//       )}
//     </div>
//   );
  
// }


// =================================================================================== ===================== //


// import React, { useEffect, useState, useRef } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import jsPDF from "jspdf";

// export default function BillingPage() {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   const [orders, setOrders] = useState([]);
//   const [tablesMap, setTablesMap] = useState({});
//   const [inventoryMap, setInventoryMap] = useState({});
//   const [selectedOrder, setSelectedOrder] = useState(null);

//   // GST/Discount, UI state
//   const [taxPercent, setTaxPercent] = useState(10);
//   const [discount, setDiscount] = useState(5);
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);

//   // Invoice and payment state
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

//   // Util: Check if date is today
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

//   // Fetch orders, tables, and inventory
//   useEffect(() => {
//     async function fetchAll() {
//       setLoading(true);
//       try {
//         const [ordersRes, tablesRes, invRes] = await Promise.all([
//           orderServices.get(`/${clientId}/dinein/table`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           tableServices.get(`/${clientId}/tables/read`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           inventoryServices.get(`/${clientId}/inventory/read`, {
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

//   // Always fetch the latest invoice draft for the given order ID
//   const fetchInvoiceDraft = async (orderId) => {
//     try {
//       const res = await invoiceServices.get(`/${clientId}/invoice/read_document`, {
//         headers: { Authorization: `Bearer ${token}` },
//         params: { client_id: clientId },
//       });
//       const invoices = res.data?.data || [];
//       // Pick the latest invoice for this order_id;
//       // If multiple, pick the highest doc version/created_at
//       const filtered = invoices.filter(
//         (d) => d.order_id?.toString() === orderId?.toString()
//       );
//       if (filtered.length === 0) return {};
//       // Sort by document_version and updated_at desc
//       filtered.sort(
//         (a, b) =>
//           (b.document_version || 1) - (a.document_version || 1) ||
//           (new Date(b.updated_at || b.created_at || 0)) -
//             (new Date(a.updated_at || a.created_at || 0))
//       );
//       return filtered[0] || {};
//     } catch (err) {
//       console.error("Failed to fetch invoice", err);
//       return {};
//     }
//   };

//   // Subtotal calculation
//   const subtotal =
//     selectedOrder?.items?.reduce(
//       (sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
//       0
//     ) || 0;

//   // GST and Discount
//   const taxAmount = (taxPercent / 100) * subtotal;
//   const discountAmount = discountIsPercent ? (discount / 100) * subtotal : discount;
//   const total = Number((subtotal + taxAmount - discountAmount).toFixed(2));

//   // Helpers: payment split
//   const sumSplits = (splits) =>
//     splits.reduce((sum, s) => sum + Number(s.amount), 0);

//   // Update one split amount and last row if needed
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

//   // Single payment explicit change
//   const onSinglePaymentAmountChange = (value) => {
//     let numAmt = Number(value);
//     if (isNaN(numAmt) || numAmt < 0) numAmt = 0;
//     setSinglePaymentAmount(numAmt);
//     setBalanceAmount(Number((numAmt - total).toFixed(2)));
//     setPaymentSplits([{ method, amount: numAmt }]);
//   };

//   // GST/Discount per order
//   const loadGSTDiscountFromStorage = (orderId) => {
//     try {
//       const key = `billing_${orderId}_gst_discount`;
//       const saved = localStorage.getItem(key);
//       if (saved) {
//         const parsed = JSON.parse(saved);
//         if (typeof parsed.taxPercent === "number") setTaxPercent(parsed.taxPercent);
//         if (typeof parsed.discount === "number") setDiscount(parsed.discount);
//         if (typeof parsed.discountIsPercent === "boolean") setDiscountIsPercent(parsed.discountIsPercent);
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

//   // Save GST/Discount per order in localStorage on change
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

//   // When selectedOrder changes, load GST/Discount
//   useEffect(() => {
//     if (!selectedOrder) return;
//     loadGSTDiscountFromStorage(selectedOrder.id);
//   }, [selectedOrder]);

//   // Sync splitPaymentEnabled & paymentSplits when total or split toggle changes
//   useEffect(() => {
//     if (!selectedOrder) return;
//     if (!splitPaymentEnabled) {
//       setSinglePaymentAmount(total);
//       setBalanceAmount(Number((total - total).toFixed(2)));
//       setPaymentSplits([{ method, amount: total }]);
//     } else {
//       if (!paymentSplits || paymentSplits.length === 0 || paymentSplits.every(p => p.amount === 0)) {
//         setPaymentSplits([{ method: "Cash", amount: total }]);
//         setBalanceAmount(0);
//       }
//     }
//     // eslint-disable-next-line
//   }, [total, splitPaymentEnabled]);

//   // Select order and restore invoice/split payment from JSONB payment_method
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

//     // Fetch the current invoice for this order
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

//     // Restore split or single payment from payment_method array (JSONB)
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

//     // Load GST/discount
//     loadGSTDiscountFromStorage(order.id);
//   };

//   // Save invoice draft - payment_method is always an array
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
//         amount: Number(p.amount || 0)
//       }));
//     } else {
//       paymentMethodArray = [{
//         method,
//         amount: Number(singlePaymentAmount || 0)
//       }];
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
//         payment_method: paymentMethodArray, // only jsonb array!
//         single_payment_amount: splitPaymentEnabled ? null : Number(singlePaymentAmount.toFixed(2)),
//         status: status,
//         customer_id: selectedOrder.customer_id || "",
//         contact_email: selectedOrder.contact_email || "",
//         contact_phone: selectedOrder.contact_phone || "",
//       };

//       let draftId = invoiceDraftId;
//       if (!draftId) {
//         const res = await invoiceServices.post(
//           `/${clientId}/invoice/create_document`,
//           payload,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         draftId = res?.data?.data?.id;
//         if (!draftId) throw new Error("Draft creation failed");
//         setInvoiceDraftId(draftId);
//       } else {
//         // Update must preserve ID and payment_method
//         await invoiceServices.post(
//           `/${clientId}/invoice/update_document`,
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

//       await invoiceServices.post(
//         `/${clientId}/invoice/create?document_id=${draftId}&client_id=${clientId}`,
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

//   // Download/Print: always fetch issued invoice/document number live before printing
//   const printInvoice = async () => {
//     if (!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0) return;
//     try {
//       let draftId = invoiceDraftId;
//       let invoiceDraft = null;
  
//       // Fetch latest invoice draft to know current status and doc number
//       invoiceDraft = await fetchInvoiceDraft(selectedOrder.id);
//       draftId = invoiceDraft?.id;
  
//       if (!draftId) {
//         draftId = await saveInvoiceDraft();
//         if (!draftId) return toast.error("Failed to create invoice draft");
//         invoiceDraft = await fetchInvoiceDraft(selectedOrder.id);
//       }
  
//       if (!invoiceDraft.document_number || invoiceDraft.status !== "Issued") {
//         await invoiceServices.post(
//           `/${clientId}/invoice/generate`,
//           {},
//           {
//             headers: { Authorization: `Bearer ${token}` },
//             params: { client_id: clientId, invoice_id: draftId },
//           }
//         );
  
//         const issueRes = await invoiceServices.post(
//           `/${clientId}/invoice/issue`,
//           {},
//           {
//             headers: { Authorization: `Bearer ${token}` },
//             params: { client_id: clientId, invoice_id: draftId },
//           }
//         );
  
//         // Update document number and status with latest values from issue response
//         const newDocNum = issueRes?.data?.data?.document_number || "";
//         setDocumentNumber(newDocNum);
//         setStatus("Issued");
  
//         // Fetch updated invoice to confirm latest document number and state
//         invoiceDraft = await fetchInvoiceDraft(selectedOrder.id);
//       } else {
//         setDocumentNumber(invoiceDraft.document_number);
//         setStatus(invoiceDraft.status);
//         toast.info(`Invoice already issued with doc# ${invoiceDraft.document_number}`);
//       }
  
//       // Ensure invoiceRef shows updated document number before printing PDF
//       setTimeout(() => {
//         if (!invoiceRef.current) return;
//         const pdf = new jsPDF({
//           orientation: "portrait",
//           unit: "pt",
//           format: "a4",
//         });
//         pdf.html(invoiceRef.current, {
//           callback: (doc) => {
//             doc.save(`Invoice_${draftId}.pdf`);
//           },
//           margin: [40, 40, 40, 40],
//           autoPaging: "text",
//           x: 0,
//           y: 0,
//           windowWidth: 1200,
//         });
//       }, 100);  // Delay to let DOM update and display new invoice number
  
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to generate invoice PDF");
//     }
//   };
  

//   return (
//     <div className="billing-page">
//       <h1 className="billing-title">Billing Invoices</h1>
//       <div className="orders-grid" role="list" aria-label="Orders Grid">
//         {loading && <p className="loading-text">Loading...</p>}
//         {!loading && orders.length === 0 && (
//           <p className="empty-text">No served orders today</p>
//         )}
//         {orders.map((order) => {
//           const table = tablesMap[order.table_id];
//           const tableName = table
//             ? `${table.name || "Table"} ${table.table_number || order.table_id}`
//             : `Table ${order.table_id}`;
//           const servedTime = new Date(order.created_at);
//           const orderTotal = order.items.reduce(
//             (sum, i) =>
//               sum +
//               (i.unit_price ?? i.price ?? 0) * (i.quantity ?? 1),
//             0
//           );
//           const isSelected = selectedOrder?.id === order.id;
//           return (
//             <div
//               key={order.id}
//               role="button"
//               tabIndex={0}
//               className={`order-item ${isSelected ? "selected" : ""}`}
//               onClick={() => handleSelectOrder(order)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter" || e.key === " ") {
//                   e.preventDefault();
//                   e.currentTarget.click();
//                 }
//               }}
//             >
//               <h3>{tableName}</h3>
//               <p>
//                 <strong>Order -{order.id}</strong>
//               </p>
//               <p className="order-total">₹{orderTotal.toFixed(2)}</p>
//               <time
//                 className="served-time"
//                 dateTime={servedTime.toISOString()}
//               >
//                 Served at{" "}
//                 {servedTime.toLocaleTimeString([], {
//                   hour: "2-digit",
//                   minute: "2-digit",
//                 })}
//               </time>
//             </div>
//           );
//         })}
//       </div>
//       {selectedOrder && (
//         <div
//           className="invoice-overlay"
//           role="dialog"
//           aria-modal="true"
//           aria-label="Invoice details overlay"
//           tabIndex={-1}
//           onClick={(e) => {
//             if (e.target.classList.contains("invoice-overlay")) {
//               setSelectedOrder(null);
//             }
//           }}
//         >
//           <div className="invoice-section" onClick={(e) => e.stopPropagation()}>
//             <button
//               className="btn-close-overlay"
//               aria-label="Close invoice preview"
//               onClick={() => setSelectedOrder(null)}
//             >
//               ×
//             </button>
//             <section
//               ref={invoiceRef}
//               className="invoice-preview"
//               aria-label="Invoice Preview"
//             >
//               <header className="invoice-header">
//                 <h1>{clientId}</h1>
//                 <h1>INVOICE</h1>
//                 <div className="document-info">
//                   <span className="document-number">
//                     {documentNumber || "Draft"}
//                   </span>
//                   <span className="document-date">
//                     {new Date().toLocaleDateString()}
//                   </span>
//                 </div>
//               </header>
//               <div className="bill-shipping-info">
//                 <div className="bill-to">
//                   <h2>Bill To</h2>
//                   <p>
//                     <strong>Customer ID:</strong>{" "}
//                     <input
//                       type="text"
//                       value={selectedOrder.customer_id || ""}
//                       onChange={(e) =>
//                         setSelectedOrder((prev) => ({ ...prev, customer_id: e.target.value }))
//                       }
//                       className="inline-input"
//                     />
//                   </p>
//                   <p>
//                     <strong>Email:</strong>{" "}
//                     <input
//                       type="email"
//                       value={selectedOrder.contact_email || ""}
//                       onChange={(e) =>
//                         setSelectedOrder((prev) => ({ ...prev, contact_email: e.target.value }))
//                       }
//                       className="inline-input"
//                     />
//                   </p>
//                   <p>
//                     <strong>Phone:</strong>{" "}
//                     <input
//                       type="text"
//                       value={selectedOrder.contact_phone || ""}
//                       onChange={(e) =>
//                         setSelectedOrder((prev) => ({ ...prev, contact_phone: e.target.value }))
//                       }
//                       className="inline-input"
//                     />
//                   </p>
//                 </div>
//                 <div className="shipping-info">
//                   <h2>Shipping Info</h2>
//                   <p>
//                     <strong>Table:</strong>{" "}
//                     {tablesMap[selectedOrder.table_id]?.name || "N/A"}
//                   </p>
//                 </div>
//               </div>
//               <table
//                 className="invoice-table"
//                 aria-label="Invoice Items"
//                 role="table"
//               >
//                 <thead>
//                   <tr>
//                     <th scope="col">Item</th>
//                     <th scope="col" className="right-align">
//                       Quantity
//                     </th>
//                     <th scope="col" className="right-align">
//                       Unit Price
//                     </th>
//                     <th scope="col" className="right-align">
//                       Amount
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {selectedOrder.items.map((item, idx) => (
//                     <tr key={idx}>
//                       <td>{item.name}</td>
//                       <td className="right-align">{item.quantity ?? 0}</td>
//                       <td className="right-align">
//                       ₹{(item.unit_price ?? 0).toFixed(2)}
//                       </td>
//                       <td className="right-align">
//                       ₹{((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}
//                       </td>
//                     </tr>
//                   ))}
//                   <tr className="summary-row">
//                     <td colSpan="3" className="right-align">
//                       Subtotal
//                     </td>
//                     <td className="right-align">{subtotal.toFixed(2)}</td>
//                   </tr>
//                   <tr className="summary-row">
//                     <td colSpan="3" className="right-align">
//                       Discount
//                     </td>
//                     <td className="right-align">
//                       -{discountAmount.toFixed(2)}
//                     </td>
//                   </tr>
//                   <tr className="summary-row">
//                     <td colSpan="3" className="right-align">
//                       GST
//                     </td>
//                     <td className="right-align">{taxAmount.toFixed(2)}</td>
//                   </tr>
//                   <tr className="summary-row total-row">
//                     <td colSpan="3" className="right-align">
//                       Total
//                     </td>
//                     <td className="right-align">{total.toFixed(2)}</td>
//                   </tr>
//                 </tbody>
//               </table>
//               <footer
//                 className="invoice-footer"
//                 aria-label="Invoice Footer"
//               >
//                 <p>Thank you for your business with {clientId}!</p>
//                 <p>This is a computer-generated invoice and does not require a signature.</p>
//               </footer>
//             </section>
//             <aside className="actions-panel" aria-label="Invoice Actions">
//               <h3>Actions</h3>
//               <label htmlFor="tax-percent">GST (%)</label>
//               <input
//                 id="tax-percent"
//                 type="number"
//                 className="input-field"
//                 value={taxPercent}
//                 onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 min={0}
//               />
//               <label>Discount</label>
//               <div className="discount-control">
//                 <input
//                   type="number"
//                   value={discount}
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                   className="input-field"
//                   min={0}
//                 />
//                 <select
//                   value={discountIsPercent ? "percent" : "fixed"}
//                   onChange={(e) => setDiscountIsPercent(e.target.value === "percent")}
//                   className="input-field discount-select"
//                 >
//                   <option value="percent">%</option>
//                   <option value="fixed">Fixed</option>
//                 </select>
//               </div>
//               <label htmlFor="payment-status">Payment Status</label>
//               <select
//                 id="payment-status"
//                 value={paymentStatus}
//                 onChange={(e) => setPaymentStatus(e.target.value)}
//                 className="input-field"
//               >
//                 <option>Pending</option>
//                 <option>Paid</option>
//                 <option>Partial</option>
//                 <option>Due</option>
//               </select>
//               <label className="checkbox-label">
//                 <input
//                   type="checkbox"
//                   checked={splitPaymentEnabled}
//                   onChange={() => {
//                     setSplitPaymentEnabled(!splitPaymentEnabled);
//                     if (!splitPaymentEnabled) {
//                       setPaymentSplits([{ method: method || "Cash", amount: total }]);
//                       setSinglePaymentAmount(total);
//                       setBalanceAmount(0);
//                     } else {
//                       setPaymentSplits([{ method: "Cash", amount: total }]);
//                       setMethod("Cash");
//                       setSinglePaymentAmount(total);
//                       setBalanceAmount(0);
//                     }
//                   }}
//                 />
//                 Enable Split Payment
//               </label>
//               {splitPaymentEnabled && (
//                 <div
//                   className="split-payments-container"
//                   style={{ maxHeight: 250, overflowY: "auto" }}
//                 >
//                   {paymentSplits.map((split, idx) => (
//                     <div key={idx} className="split-payment-row">
//                       <select
//                         value={split.method}
//                         onChange={(e) => {
//                           const newSplits = [...paymentSplits];
//                           newSplits[idx].method = e.target.value;
//                           setPaymentSplits(newSplits);
//                         }}
//                         className="input-field split-method-select"
//                       >
//                         <option>Cash</option>
//                         <option>UPI</option>
//                         <option>Card</option>
//                         <option>Due</option>
//                       </select>
//                       <input
//                         type="number"
//                         step="0.01"
//                         min="0"
//                         value={split.amount}
//                         onChange={(e) => {
//                           updateSplitAmount(idx, e.target.value);
//                         }}
//                         onBlur={() => {
//                           onSplitAmountBlur(idx);
//                         }}
//                         className="input-field split-amount-input"
//                         placeholder="Amount"
//                       />
//                       <button
//                         type="button"
//                         onClick={() => removeSplitRow(idx)}
//                         aria-label={`Remove payment split ${idx + 1}`}
//                         className="btn-remove-split"
//                         disabled={paymentSplits.length === 1}
//                       >
//                         &times;
//                       </button>
//                     </div>
//                   ))}
//                   <button
//                     type="button"
//                     onClick={addSplitRow}
//                     className="btn-add-split"
//                   >
//                     Add Payment Method
//                   </button>
//                   <p className="balance-amount">
//                     Balance:{" "}
//                     {balanceAmount < 0
//                       ? `-${Math.abs(balanceAmount).toFixed(2)}`
//                       : balanceAmount.toFixed(2)}
//                   </p>
//                 </div>
//               )}
//               {!splitPaymentEnabled && (
//                 <>
//                   <label htmlFor="payment-method">Payment Method</label>
//                   <select
//                     id="payment-method"
//                     value={method}
//                     onChange={(e) => {
//                       setMethod(e.target.value);
//                       setPaymentSplits([{ method: e.target.value, amount: singlePaymentAmount }]);
//                     }}
//                     className="input-field"
//                   >
//                     <option>Cash</option>
//                     <option>UPI</option>
//                     <option>Card</option>
//                     <option>Due</option>
//                   </select>
//                   <label htmlFor="amount-given">Amount Given</label>
//                   <input
//                     id="amount-given"
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={singlePaymentAmount}
//                     onChange={(e) => onSinglePaymentAmountChange(e.target.value)}
//                     placeholder="Enter amount received"
//                     className="input-field"
//                   />
//                   <p className="balance-amount">
//                     Balance:{" "}
//                     {balanceAmount < 0
//                       ? `-${Math.abs(balanceAmount).toFixed(2)}`
//                       : balanceAmount.toFixed(2)}
//                   </p>
//                 </>
//               )}
//               <button
//                 onClick={saveInvoiceDraft}
//                 disabled={saving}
//                 className="btn-primary"
//                 type="button"
//               >
//                 {saving ? "Saving..." : "Save Bill"}
//               </button>
//               <button
//                 onClick={printInvoice}
//                 disabled={!selectedOrder || !selectedOrder.items?.length}
//                 className="btn-success"
//                 type="button"
//               >
//                 Download PDF / Print
//               </button>
//             </aside>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



// ====================================== =============================== ==========================

import React, { useEffect, useState, useRef } from "react";
import orderServices from "../../Backend_Port_Files/OrderServices";
import tableServices from "../../Backend_Port_Files/TableServices";
import inventoryServices from "../../Backend_Port_Files/InventoryServices";
import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export default function BillingPage() {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  // States
  const [orders, setOrders] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [inventoryMap, setInventoryMap] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [taxPercent, setTaxPercent] = useState(10);
  const [discount, setDiscount] = useState(5);
  const [discountIsPercent, setDiscountIsPercent] = useState(true);

  const [method, setMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [status, setStatus] = useState("Draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceDraftId, setInvoiceDraftId] = useState(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState([{ method: "Cash", amount: 0 }]);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [singlePaymentAmount, setSinglePaymentAmount] = useState(0);

  const invoiceRef = useRef(null);

  // Utility to check if a date is today
  const isToday = (createdAt) => {
    const date = new Date(createdAt);
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [ordersRes, tablesRes, invRes] = await Promise.all([
          orderServices.get(`/${clientId}/dinein/table`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          tableServices.get(`/${clientId}/tables/read`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          inventoryServices.get(`/${clientId}/inventory/read`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const served = (ordersRes.data?.data || []).filter(
          (o) => o.status?.toLowerCase() === "served" && isToday(o.created_at)
        );
        setOrders(served);
        const tMap = {};
        (tablesRes.data?.data || []).forEach((t) => {
          tMap[t.id] = t;
        });
        setTablesMap(tMap);
        const iMap = {};
        (invRes.data?.data || []).forEach((i) => {
          iMap[i.id] = i;
        });
        setInventoryMap(iMap);
      } catch (error) {
        console.error(error);
        toast.error("Error loading data");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [clientId, token]);

  const fetchInvoiceDraft = async (orderId) => {
    try {
      const res = await invoiceServices.get(`/${clientId}/invoice/read_document`, {
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

  // Calculations
  const subtotal =
    selectedOrder?.items?.reduce(
      (sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
      0
    ) || 0;

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
      const sumOthers = splits
        .filter((_, idx) => idx !== splits.length - 1)
        .reduce((sum, s) => sum + Number(s.amount), 0);
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
    setBalanceAmount(Number((total - sumSplits(splits)).toFixed(2)));
  };

  const addSplitRow = () => {
    let used = sumSplits(paymentSplits);
    let remainder = Number((total - used).toFixed(2));
    setPaymentSplits((prev) => [
      ...prev,
      { method: "Cash", amount: remainder >= 0 ? remainder : 0 },
    ]);
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

  const onSplitAmountBlur = (index) => {
    let splits = [...paymentSplits];
    if (splits.length > 1) {
      const sumOthers = splits
        .filter((_, idx) => idx !== splits.length - 1)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      let remainder = Number((total - sumOthers).toFixed(2));
      splits[splits.length - 1].amount = remainder >= 0 ? remainder : 0;
    }
    setPaymentSplits(splits);
    setBalanceAmount(Number((total - sumSplits(splits)).toFixed(2)));
  };

  const onSinglePaymentAmountChange = (value) => {
    let numAmt = Number(value);
    if (isNaN(numAmt) || numAmt < 0) numAmt = 0;
    setSinglePaymentAmount(numAmt);
    setBalanceAmount(Number((numAmt - total).toFixed(2)));
    setPaymentSplits([{ method, amount: numAmt }]);
  };

  // Load GST/Discount from storage per order
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

  useEffect(() => {
    if (!selectedOrder?.id) return;
    const key = `billing_${selectedOrder.id}_gst_discount`;
    const data = {
      taxPercent,
      discount,
      discountIsPercent,
    };
    localStorage.setItem(key, JSON.stringify(data));
  }, [taxPercent, discount, discountIsPercent, selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) return;
    loadGSTDiscountFromStorage(selectedOrder.id);
  }, [selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) return;
    if (!splitPaymentEnabled) {
      setSinglePaymentAmount(total);
      setBalanceAmount(Number((total - total).toFixed(2)));
      setPaymentSplits([{ method, amount: total }]);
    } else {
      if (!paymentSplits || paymentSplits.length === 0 || paymentSplits.every((p) => p.amount === 0)) {
        setPaymentSplits([{ method: "Cash", amount: total }]);
        setBalanceAmount(0);
      }
    }
  }, [total, splitPaymentEnabled]);

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
        const res = await invoiceServices.post(
          `/${clientId}/invoice/create_document`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        draftId = res?.data?.data?.id;
        if (!draftId) throw new Error("Draft creation failed");
        setInvoiceDraftId(draftId);
      } else {
        await invoiceServices.post(
          `/${clientId}/invoice/update_document`,
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

      await invoiceServices.post(
        `/${clientId}/invoice/create?document_id=${draftId}&client_id=${clientId}`,
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

  // Updated printInvoice function with cloning and inline stylings
  const printInvoice = () => {
    if (!selectedOrder || !selectedOrder.items?.length) {
      toast.error("No order selected or no items");
      return;
    }
  
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    let y = 40;
  
    // RESTAURANT / CLIENT INFO (dynamic)
    const restaurantName = clientId?.toUpperCase() || "Restaurant";
    const restaurantAddress = localStorage.getItem("restaurant_address") || "N/A"; // if you save it
    const invoiceNo = documentNumber || "Draft";
    const invoiceDate = new Date().toLocaleDateString();
    const invoiceTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
    // HEADER
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(restaurantName, 40, y);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(restaurantAddress, 40, y + 15);
  
    pdf.setFont("helvetica", "bold");
    pdf.text("INVOICE", 500, y);
  
    y += 35;
    pdf.setFont("helvetica", "normal");
    pdf.text(`Invoice No: ${invoiceNo}`, 400, y);
    pdf.text(`Date: ${invoiceDate} ${invoiceTime}`, 400, y + 15);
  
    // CUSTOMER + DELIVERY BLOCK
    y += 50;
    pdf.setFont("helvetica", "bold");
    pdf.text("Customer", 40, y);
    pdf.text("Deliver To", 300, y);
  
    pdf.setFont("helvetica", "normal");
    pdf.text(`ID: ${selectedOrder.customer_id || "-"}`, 40, y + 20);
    pdf.text(`Phone: ${selectedOrder.contact_phone || "-"}`, 40, y + 35);
    pdf.text(`Email: ${selectedOrder.contact_email || "-"}`, 40, y + 50);
  
    const tableName = tablesMap[selectedOrder.table_id]?.name || `Table ${selectedOrder.table_id || "-"}`;
    pdf.text(`Table: ${tableName}`, 300, y + 20);
    pdf.text(`Type: ${selectedOrder.mode || "Dine-In"}`, 300, y + 35); // use order mode if available
  
    // SECTION TITLE
    y += 100;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(200, 50, 50);
    pdf.text("Order Details", 40, y);
    pdf.setTextColor(0, 0, 0);
  
    // COLUMN HEADERS
    y += 25;
    pdf.setFont("helvetica", "bold");
    pdf.text("Item", 40, y);
    pdf.text("Qty", 250, y);
    pdf.text("Unit Price", 320, y);
    pdf.text("Amount", 420, y);
  
    pdf.setFont("helvetica", "normal");
  
    // ORDER ITEMS
    selectedOrder.items.forEach((item) => {
      y += 20;
      pdf.text(item.name || "Unnamed", 40, y);
      pdf.text(`${item.quantity || 0}`, 250, y);
      pdf.text(`Rs.${(item.unit_price ?? 0).toFixed(2)}`, 320, y);
      pdf.text(`Rs.${((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}`, 420, y);
    });
  
    // SUMMARY
    y += 40;
    pdf.setFont("helvetica", "normal");
    pdf.text(`Subtotal: Rs.${subtotal.toFixed(2)}`, 300, y);
    y += 20;
    pdf.text(`Discount: -Rs.${discountAmount.toFixed(2)}`, 300, y);
    y += 20;
    pdf.text(`GST: Rs.${taxAmount.toFixed(2)}`, 300, y);
    y += 25;
  
    pdf.setFont("helvetica", "bold");
    pdf.text(`TOTAL DUE: Rs.${total.toFixed(2)}`, 300, y);
  
    // PAYMENT INFO
    y += 40;
    pdf.setFont("helvetica", "normal");
    pdf.text(`Payment Method: ${method}`, 40, y);
    y += 20;
    pdf.text(`Payment Status: ${paymentStatus}`, 40, y);
  
    // FOOTER
    y += 50;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    pdf.text(`${restaurantName} - Thank you for dining with us!`, 220, y, { align: "center" });
  
    pdf.save(`Invoice_${invoiceDraftId || "draft"}.pdf`);
  };
  
  

  return (
  <div className="Invoice-container-page">
      <div className="inv--container">
      <div className="inv--header-row">
        <div className="inv--header-l">Billing Invoices</div>
        {/* <div className="inv--header-r">
          <button className="inv--btn-light" disabled>{loading ? "Loading..." : "Export"}</button>
          <button className="inv--btn-light" disabled>{loading ? "Loading..." : "Import"}</button>
          <button className="inv--btn-pri" disabled={!selectedOrder} onClick={saveInvoiceDraft}>
            {saving ? "Saving..." : "+ Save Bill"}
          </button>
        </div> */}
      </div>
      <div className="inv--main-row">
        <aside className="inv--orders-list" aria-label="Orders List">
          {loading && <p className="inv--loading-text">Loading orders...</p>}
          {!loading && orders.length === 0 && <p className="inv--empty-text">No served orders today</p>}
          {orders.map((order) => {
            const tableName = tablesMap[order.table_id]?.name || `Table ${order.table_id}`;
            const orderTotal = order.items.reduce(
              (sum, i) => sum + (i.unit_price ?? i.price ?? 0) * (i.quantity ?? 1),
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
                    e.currentTarget.click();
                  }
                }}
                aria-pressed={isSelected}
              >
                <h4>{tableName}</h4>
                <div>Order #{order.id}</div>
                <div className="inv--order-total">₹{orderTotal.toFixed(2)}</div>
                <time
                  dateTime={order.created_at}
                  className="inv--served-time"
                  title={new Date(order.created_at).toLocaleString()}
                >
                  Served at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            );
          })}
        </aside>

        {selectedOrder ? (
          <section ref={invoiceRef} className="inv--invoice-panel" aria-label="Invoice Details">
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
                  <td colSpan="3" className="right-align">Subtotal</td>
                  <td className="right-align">₹{subtotal.toFixed(2)}</td>
                </tr>
                <tr className="inv--summary-row">
                  <td colSpan="3" className="right-align">Discount</td>
                  <td className="right-align">-₹{discountAmount.toFixed(2)}</td>
                </tr>
                <tr className="inv--summary-row">
                  <td colSpan="3" className="right-align">GST</td>
                  <td className="right-align">₹{taxAmount.toFixed(2)}</td>
                </tr>
                <tr className="inv--summary-row inv--total-row">
                  <td colSpan="3" className="right-align">Total</td>
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
              <label>
                Payment Status<br />
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="inv--select"
                >
                  <option>Pending</option>
                  <option>Paid</option>
                  <option>Partial</option>
                  <option>Due</option>
                </select>
              </label>
              <label className="inv--checkbox-label">
                <input
                  type="checkbox"
                  checked={splitPaymentEnabled}
                  onChange={() => setSplitPaymentEnabled(!splitPaymentEnabled)}
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
                <p className="inv--balance">Balance: ₹{balanceAmount.toFixed(2)}</p>
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
                <p className="inv--balance">Balance: ₹{balanceAmount.toFixed(2)}</p>
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
  );
}
