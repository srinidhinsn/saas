// import invoiceServicesPort from "../../Backend_Port_Files/InvoiceServices";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// const Invoice_Page = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const [orders, setOrders] = useState([]);
//     const [tables, setTables] = useState([]);
//     const [records, setRecords] = useState([]);
//     const [selectedId, setSelectedId] = useState(null);

//     const [tableId, setTableId] = useState(null)

//     useEffect(() => {
//         if (tableId) {
//             document.body.classList.add("sidebar-minimized");
//         } else {
//             document.body.classList.remove("sidebar-minimized");
//         }
//     }, [tableId]);

//     const [formData, setFormData] = useState({
//         document_type: "Invoice",
//         document_number: "",
//         document_date: "",
//         customer_id: "",
//         status: "Draft",
//         subtotal: 0,
//         tax_amount: 0,
//         discount_amount: 0,
//         total_amount: 0,
//         contact_email: "",
//         contact_phone: "",
//         notes: "",
//         order_id: "",
//         table_id: ""
//     });

//     const headers = {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json"
//     };

//     const fetchRecords = async () => {
//         try {
//             const res = await invoiceServicesPort.get(`/${clientId}/invoice/read_document`, { headers });
//             setRecords(res.data.data || []);
//         } catch (err) {
//             toast.error("Failed to fetch billing documents");
//         }
//     };

//     const fetchById = async (id) => {
//         try {
//             // If single document fetch endpoint exists:
//             // const res = await invoiceServicesPort.get(`/${clientId}/invoice/read_document/${id}`, { headers });

//             // Workaround: filter from already-fetched records
//             const doc = records.find(r => r.id === id);
//             if (!doc) {
//                 toast.error("Document not found locally");
//                 return;
//             }

//             const formattedDate = doc.document_date?.split("T")[0] || "";

//             setFormData({
//                 id: doc.id,
//                 document_type: doc.document_type || "Invoice",
//                 document_number: doc.document_number || "",
//                 document_date: formattedDate,
//                 customer_id: doc.customer_id || "",
//                 status: doc.status || "Draft",
//                 subtotal: doc.subtotal || 0,
//                 tax_amount: doc.tax_amount || 0,
//                 discount_amount: doc.discount_amount || 0,
//                 total_amount: doc.total_amount || 0,
//                 contact_email: doc.contact_email || "",
//                 contact_phone: doc.contact_phone || "",
//                 notes: doc.notes || "",
//                 order_id: doc.order_id || "",
//                 table_id: doc.table_id || "",
//             });

//             setSelectedId(id);
//         } catch (err) {
//             toast.error("Error fetching document by ID");
//         }
//     };

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();

//         if (!formData.document_number || !formData.document_date || !formData.order_id) {
//             toast.error("Please fill all the required fields!");
//             return;
//         }

//         const isUpdate = selectedId !== null || formData.id;

//         try {
//             let endpoint = "";
//             let payload = {};

//             if (isUpdate) {
//                 endpoint = `/${clientId}/invoice/update_document`;
//                 payload = { ...formData, id: selectedId || formData.id };
//             } else {
//                 endpoint = `/${clientId}/invoice/create_document`;
//                 payload = {
//                     ...formData,
//                     id: undefined,
//                     client_id: clientId,
//                 };
//             }

//             const response = await invoiceServicesPort.post(endpoint, payload, { headers });


//             if (response.status === 200) {
//                 toast.success(`Billing document ${isUpdate ? "updated" : "created"}`);
//                 setFormData({
//                     document_type: "Invoice",
//                     document_number: "",
//                     document_date: "",
//                     customer_id: "",
//                     status: "Draft",
//                     subtotal: 0,
//                     tax_amount: 0,
//                     discount_amount: 0,
//                     total_amount: 0,
//                     contact_email: "",
//                     contact_phone: "",
//                     notes: "",
//                     order_id: "",
//                     table_id: "",
//                 });
//                 setSelectedId(null);
//                 fetchRecords();
//             } else {
//                 toast.error("Failed to submit document: " + response?.data?.message || "Unknown error");
//             }
//         } catch (err) {
//             console.error("Error submitting:", err?.response?.data || err.message);
//             toast.error("Failed to submit document: " + (err?.response?.data?.message || err.message));
//         }
//     };

//     const handleDelete = async (id) => {
//         try {
//             await invoiceServicesPort.post(`/${clientId}/invoice/delete_document?client_id=${clientId}`, { id }, { headers });
//             toast.success("Billing document deleted");
//             fetchRecords();
//         } catch (err) {
//             toast.error("Error deleting document");
//         }
//     };

//     const fetchOrders = async () => {
//         try {
//             const response = await axios.get(`http://localhost:8003/saas/${clientId}/dinein/table`, { headers });
//             setOrders(response.data.data || []);
//         } catch (err) {
//             toast.error("Failed to fetch orders");
//         }
//     };

//     const fetchTables = async () => {
//         try {
//             const res = await axios.get(`http://localhost:8001/saas/${clientId}/tables/read`, { headers });
//             setTables(res.data.data || []);
//         } catch (err) {
//             toast.error("Failed to fetch tables");
//         }
//     };

//     useEffect(() => {
//         fetchRecords();
//         fetchOrders();
//         fetchTables();
//     }, []);

//     useEffect(() => {
//         console.log("Fetched orders:", orders);
//     }, [orders]);

//     return (
//         <div className="Invoice-Manage-container">
//             <div className="billing-page">
//                 <h2>Billing Manager</h2>
//                 <form onSubmit={handleSubmit} className="billing-form">
//                     <div className="form-group">
//                         <label className="filled">Select Order</label>
//                         <select
//                             onChange={(e) => {
//                                 const tableId = parseInt(e.target.value);
//                                 const latestOrder = orders
//                                     .filter((order) => order.table_id === tableId)
//                                     .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

//                                 if (latestOrder) {
//                                     let subtotal = 0;
//                                     let tax = 0;
//                                     let discount = 0;

//                                     latestOrder.items.forEach((item) => {
//                                         const price = item.price || 0;
//                                         const qty = item.quantity || 1;
//                                         const gst = item.gst || 0;
//                                         const dis = item.discount || 0;

//                                         subtotal += price * qty;
//                                         tax += gst;
//                                         discount += dis;
//                                     });

//                                     setFormData((prev) => ({
//                                         ...prev,
//                                         order_id: String(latestOrder.id),
//                                         table_id: latestOrder.table_id,
//                                         subtotal,
//                                         tax_amount: tax,
//                                         discount_amount: discount,
//                                         total_amount: latestOrder.total_price || 0,
//                                     }));
//                                 }
//                             }}
//                         >
//                             <option value="">Select Table</option>
//                             {[...new Set(
//                                 orders
//                                     .filter((order) => order.status?.trim().toLowerCase() === "served")
//                                     .map((o) => o.table_id)
//                             )].map((tid) => {
//                                 const table = tables.find((t) => t.id === tid);
//                                 return (
//                                     <option key={tid} value={tid}>
//                                         {table ? table.name : `Table ${tid}`}
//                                     </option>
//                                 );
//                             })}
//                         </select>
//                     </div>

//                     {[
//                         { name: "document_type", type: "text", label: "Document Type" },
//                         { name: "document_number", type: "text", label: "Document Number" },
//                         { name: "document_date", type: "date", label: "Document Date" },
//                         { name: "customer_id", type: "text", label: "Customer ID" },
//                         { name: "subtotal", type: "number", label: "Subtotal" },
//                         { name: "tax_amount", type: "number", label: "Tax Amount" },
//                         { name: "discount_amount", type: "number", label: "Discount Amount" },
//                         { name: "total_amount", type: "number", label: "Total Amount" },
//                         { name: "contact_email", type: "email", label: "Contact Email" },
//                         { name: "contact_phone", type: "text", label: "Contact Phone" },
//                     ].map(field => (
//                         <div className="form-group" key={field.name}>
//                             <input
//                                 type={field.type}
//                                 name={field.name}
//                                 value={formData[field.name]}
//                                 onChange={handleChange}
//                                 required={["document_type", "document_number", "document_date"].includes(field.name)}
//                             />
//                             <label className={formData[field.name] ? "filled" : ""}>{field.label}</label>
//                         </div>
//                     ))}

//                     <div className="form-group">
//                         <select name="status" value={formData.status} onChange={handleChange}>
//                             <option value="Draft">Draft</option>
//                             <option value="Pending">Pending</option>
//                             <option value="Paid">Paid</option>
//                         </select>
//                         <label className="filled">Status</label>
//                     </div>

//                     <div className="form-group">
//                         <textarea name="notes" value={formData.notes} onChange={handleChange} required />
//                         <label className={formData.notes ? "filled" : ""}>Notes</label>
//                     </div>

//                     <button type="submit">{selectedId ? "Update" : "Create"}</button>
//                 </form>

//                 <ul className="billing-list">
//                     {records.map(doc => (
//                         <li key={doc.id}>
//                             <strong>{doc.document_type} #{doc.document_number}</strong> — ₹{doc.total_amount} on {doc.document_date?.slice(0, 10)}
//                             <br />
//                             <button onClick={() => fetchById(doc.id)}>Edit</button>
//                             <button onClick={() => handleDelete(doc.id)}>Delete</button>
//                         </li>
//                     ))}
//                 </ul>
//             </div>
//         </div>
//     );
// };

// export default Invoice_Page;



// ============================================================================================================================================= //
// ============================================================================================================================================= //
// ============================================================================================================================================= //
// ============================================================================================================================================= //

import React from "react";

const InvoiceModal = ({ order, onClose }) => {
    if (!order) return null;

    const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

    // Calculate totals dynamically
    const subtotal = (order.items || []).reduce(
        (acc, item) => acc + safeNum(item.price) * safeNum(item.quantity),
        0
    );
    const tax = subtotal * 0.085;
    const serviceCharge = subtotal * 0.18;
    const totalAmount = subtotal + tax + serviceCharge;

    // Format order date/time
    const orderDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString()
        : new Date().toLocaleDateString();

    const orderTime = order.created_at
        ? new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "N/A";

    return (
        <div
            className="modal-overlay"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
            }}
        >
            <div
                className="invoice-body"
                style={{
                    background: "#fff",
                    padding: "20px",
                    borderRadius: "8px",
                    width: "90%",
                    maxWidth: "600px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    position: "relative",
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "none",
                        border: "none",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                    }}
                    aria-label="Close modal"
                >
                    &times;
                </button>

                <div className="invoice-container">
                    {/* Header */}
                    <div className="invoice-header">
                        <div className="header-content">
                            <div>
                                <h1 className="restaurant-name">EASYFOOD</h1>
                                <p className="restaurant-info">Ullal Uppanagar,Railway Layout,Bengaluru</p>
                                <p className="restaurant-info">Phone: +91-8939614323</p>
                            </div>
                            <div className="text-right">
                                <h2 className="invoice-title">INVOICE</h2>
                                <p className="restaurant-info">Invoice #: <span id="invoiceNumber">INV-{new Date().getFullYear()}-{String(order.id).padStart(4, "0")}</span></p>
                                <p className="restaurant-info">Date: <span id="invoiceDate">{orderDate}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="customer-info">
                        <div className="grid">
                            <div>
                                <h3 className="section-title">Bill To:</h3>
                                <div className="info-text">
                                    <p className="font-medium">Table : <span id="tableName">{order.table_name}</span></p>
                                    <p>Waiter: <span id="serverName">{order.server_name || "N/A"}</span></p>
                                    <p>Customer: <span id="guestCount">{order.guest_count || "N/A"}</span></p>
                                </div>
                            </div>
                            <div>
                                <h3 className="section-title">Order Details:</h3>
                                <div className="info-text">
                                    <p>Order Time: <span id="orderTime">{orderTime}</span></p>
                                    <p>Payment Method: <span id="paymentMethod">{order.payment_method || "N/A"}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Items */}
                    <div className="invoice-items">
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th className="th-left">Item Name</th>
                                    <th className="th-center">Qty</th>
                                    <th className="th-right">Price</th>
                                    <th className="th-right">Total</th>
                                </tr>
                            </thead>
                            <tbody id="invoiceItems">
                                {(order.items || []).length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: "center", fontStyle: "italic" }}>
                                            No items to display.
                                        </td>
                                    </tr>
                                )}
                                {(order.items || []).map((item) => (
                                    <tr key={item.item_id}>
                                        <td>
                                            <div className="item-name">{item.item_name || "Unnamed Item"}</div>
                                            <div className="item-desc">{item.description || ""}</div>
                                        </td>
                                        <td className="td-center">{safeNum(item.quantity)}</td>
                                        <td className="td-right">₹{safeNum(item.price).toFixed(2)}</td>
                                        <td className="td-right font-medium">₹{(safeNum(item.price) * safeNum(item.quantity)).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="totals">
                            <div className="totals-box">
                                <div className="flex-between">
                                    <span>Subtotal:</span>
                                    <span id="subtotal">₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex-between">
                                    <span>Tax (8.5%):</span>
                                    <span id="tax">₹{tax.toFixed(2)}</span>
                                </div>
                                <div className="flex-between">
                                    <span>Service Charge (18%):</span>
                                    <span id="serviceCharge">₹{serviceCharge.toFixed(2)}</span>
                                </div>
                                <div className="total-amount">
                                    <span>Total Amount:</span>
                                    <span id="totalAmount">₹{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="footer">
                        <div className="footer-text">
                            <p>Thank you for dining with us!</p>
                            <p>Please visit us again soon. Your feedback is valuable to us.</p>
                            <p> @inspiritengineering</p>
                        </div>
                        {/* Footer buttons inside the modal */}
                        <div className="footer-buttons no-print" >
                            <button onClick={() => window.print()} className="btn-blue" >
                                🖨️ Print Invoice
                            </button>
                            <button onClick={() => alert("Email Invoice")} className="btn-orange">
                                📧 Email Invoice
                            </button>
                            {/* <button onClick={() => alert("New Invoice")} className="btn-green">
                                ➕ New Invoice
                            </button> */}
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

export default InvoiceModal;
