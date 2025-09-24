// import React, { useEffect, useState } from "react";
// import {
//     Container,
//     Typography,
//     Button,
//     TextField,
//     Grid,
//     MenuItem,
//     Paper,
//     Box,
//     CircularProgress,
// } from "@mui/material";
// import DataTable from "react-data-table-component";
// import { useParams } from "react-router-dom";

// const PAYMENT_STATUSES = [
//     "Pending",
//     "Paid",
//     "Partial",
//     "Overdue",
// ];

// const APPROVAL_STATUSES = [
//     "Pending",
//     "Approved",
//     "Rejected",
// ];

// const defaultNewItem = {
//     description: "",
//     quantity: 1,
//     unit_price: 0,
//     discount: 0,
//     tax_rate: 0,
//     total: 0,
// };

// export default function BillingUI() {
//     const [documents, setDocuments] = useState([]);
//     const [loadingDocs, setLoadingDocs] = useState(false);
//     const [selectedDoc, setSelectedDoc] = useState(null);
//     const [items, setItems] = useState([]);
//     const [loadingItems, setLoadingItems] = useState(false);
//     const [docForm, setDocForm] = useState({});
//     const [editMode, setEditMode] = useState(false);
//     const { clientId } = useParams()
//     const BASE_URL = `http://localhost:8004/saas/${clientId}/invoice`;
//     const token = localStorage.getItem("access_token")

//     // Fetch billing documents list
//     async function loadDocuments() {
//         setLoadingDocs(true);
//         try {
//             const res = await fetch(
//                 `${BASE_URL}/read_document?client_id=demo-client`,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`
//                     }
//                 }
//             );
//             const json = await res.json();
//             if (json?.data) setDocuments(json.data);
//         } finally {
//             setLoadingDocs(false);
//         }
//     }

//     // Fetch items for a document
//     async function loadItems(documentId) {
//         setLoadingItems(true);
//         try {
//             const res = await fetch(
//                 `${BASE_URL}/read?client_id=demo-client&document_id=${documentId}`,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`
//                     }
//                 }
//             );
//             const json = await res.json();
//             if (json?.data) setItems(json.data);
//         } finally {
//             setLoadingItems(false);
//         }
//     }

//     // Select document & load items for detail
//     function onSelectDocument(doc) {
//         setSelectedDoc(doc);
//         setDocForm(doc);
//         loadItems(doc.id);
//         setEditMode(false);
//     }

//     // Handle document form field change
//     function handleDocChange(e) {
//         const { name, value } = e.target;
//         setDocForm((prev) => ({ ...prev, [name]: value }));
//     }

//     // Handle item field change for inline edit
//     function handleItemChange(index, field, value) {
//         const newItems = [...items];
//         newItems[index][field] = value;

//         // Auto calculate total = (quantity * unit_price) - discount + tax
//         const qty = parseFloat(newItems[index].quantity) || 0;
//         const price = parseFloat(newItems[index].unit_price) || 0;
//         const discount = parseFloat(newItems[index].discount) || 0;
//         const tax = parseFloat(newItems[index].tax_rate) || 0;
//         newItems[index].total = Number(qty * price - discount + tax).toFixed(2);

//         setItems(newItems);
//     }

//     // Add new empty item
//     function addNewItem() {
//         setItems([...items, { ...defaultNewItem }]);
//     }

//     // Remove item by index
//     function removeItem(index) {
//         const newItems = [...items];
//         newItems.splice(index, 1);
//         setItems(newItems);
//     }

//     // Save document updates (patch)
//     async function saveDocument() {
//         if (!docForm?.id) return alert("No document selected");

//         try {
//             await fetch(`${BASE_URL}/update_document?client_id=demo-client`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`
//                 },
//                 body: JSON.stringify(docForm),
//             });
//             alert("Document updated");
//             loadDocuments();
//             setEditMode(false);
//         } catch (e) {
//             alert("Save failed: " + e.message);
//         }
//     }

//     // Save items (send whole array - update items endpoint)
//     async function saveItems() {
//         try {
//             await fetch(`${BASE_URL}/update?client_id=demo-client`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//                 body: JSON.stringify(items),
//             });
//             alert("Items updated");
//             loadItems(selectedDoc.id);
//         } catch (e) {
//             alert("Save items failed: " + e.message);
//         }
//     }

//     // Columns for document table
//     const documentColumns = [
//         { name: "Document Number", selector: (row) => row.document_number, sortable: true },
//         { name: "Date", selector: (row) => new Date(row.document_date).toLocaleDateString(), sortable: true },
//         { name: "Customer ID", selector: (row) => row.customer_id },
//         { name: "Status", selector: (row) => row.status },
//         { name: "Payment Status", selector: (row) => row.payment_status },
//         {
//             name: "Actions",
//             cell: (row) => (
//                 <Button size="small" variant="outlined" onClick={() => onSelectDocument(row)}>
//                     View / Edit
//                 </Button>
//             ),
//         },
//     ];

//     // Columns for items table with editable cells
//     const itemsColumns = [
//         {
//             name: "Description",
//             selector: (row) => row.description,
//             cell: (row, index) => (
//                 <TextField
//                     value={items[index]?.description || ""}
//                     onChange={(e) => handleItemChange(index, "description", e.target.value)}
//                     size="small"
//                 />
//             ),
//         },
//         {
//             name: "Quantity",
//             selector: (row) => row.quantity,
//             width: "120px",
//             cell: (row, index) => (
//                 <TextField
//                     type="number"
//                     value={items[index]?.quantity || ""}
//                     onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
//                     size="small"
//                 />
//             ),
//         },
//         {
//             name: "Unit Price",
//             selector: (row) => row.unit_price,
//             width: "120px",
//             cell: (row, index) => (
//                 <TextField
//                     type="number"
//                     value={items[index]?.unit_price || ""}
//                     onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
//                     size="small"
//                 />
//             ),
//         },
//         {
//             name: "Discount",
//             selector: (row) => row.discount,
//             width: "100px",
//             cell: (row, index) => (
//                 <TextField
//                     type="number"
//                     value={items[index]?.discount || ""}
//                     onChange={(e) => handleItemChange(index, "discount", e.target.value)}
//                     size="small"
//                 />
//             ),
//         },
//         {
//             name: "Tax Rate",
//             selector: (row) => row.tax_rate,
//             width: "100px",
//             cell: (row, index) => (
//                 <TextField
//                     type="number"
//                     value={items[index]?.tax_rate || ""}
//                     onChange={(e) => handleItemChange(index, "tax_rate", e.target.value)}
//                     size="small"
//                 />
//             ),
//         },
//         {
//             name: "Total",
//             selector: (row) => row.total,
//             width: "120px",
//             cell: (row, index) => <Typography>{items[index]?.total || "0.00"}</Typography>,
//         },
//         {
//             name: "Remove",
//             cell: (row, index) => (
//                 <Button size="small" color="error" onClick={() => removeItem(index)}>
//                     Delete
//                 </Button>
//             ),
//         },
//     ];

//     useEffect(() => {
//         loadDocuments();
//     }, []);

//     return (
//         <Container maxWidth="lg" sx={{ pt: 3 }}>
//             <Typography variant="h4" mb={3}>
//                 Billing Documents
//             </Typography>

//             {/* Documents Table */}
//             <Paper sx={{ p: 2, mb: 4 }}>
//                 {loadingDocs ? (
//                     <Box display="flex" justifyContent="center" py={5}>
//                         <CircularProgress />
//                     </Box>
//                 ) : (
//                     <DataTable
//                         columns={documentColumns}
//                         data={documents}
//                         pagination
//                         highlightOnHover
//                         pointerOnHover
//                     />
//                 )}
//             </Paper>

//             {/* Billing Document Detail / Edit Form */}
//             {selectedDoc && (
//                 <Paper sx={{ p: 3 }}>
//                     <Typography variant="h5" mb={2}>
//                         Document Detail & Items (ID: {selectedDoc.id})
//                     </Typography>

//                     <Grid container spacing={2} mb={2}>
//                         <Grid item xs={12} sm={6} md={4}>
//                             <TextField
//                                 fullWidth
//                                 label="Document Number"
//                                 name="document_number"
//                                 value={docForm.document_number || ""}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             />
//                         </Grid>

//                         <Grid item xs={12} sm={6} md={4}>
//                             <TextField
//                                 fullWidth
//                                 label="Document Date"
//                                 name="document_date"
//                                 type="date"
//                                 value={
//                                     docForm.document_date
//                                         ? new Date(docForm.document_date).toISOString().substring(0, 10)
//                                         : ""
//                                 }
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                                 InputLabelProps={{ shrink: true }}
//                             />
//                         </Grid>

//                         <Grid item xs={12} sm={6} md={4}>
//                             <TextField
//                                 fullWidth
//                                 label="Customer ID"
//                                 name="customer_id"
//                                 value={docForm.customer_id || ""}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             />
//                         </Grid>

//                         <Grid item xs={12} sm={6} md={4}>
//                             <TextField
//                                 select
//                                 fullWidth
//                                 label="Status"
//                                 name="status"
//                                 value={docForm.status || ""}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             >
//                                 <MenuItem value="Draft">Draft</MenuItem>
//                                 <MenuItem value="Sent">Sent</MenuItem>
//                                 <MenuItem value="Paid">Paid</MenuItem>
//                                 <MenuItem value="Cancelled">Cancelled</MenuItem>
//                             </TextField>
//                         </Grid>

//                         <Grid item xs={12} sm={6} md={4}>
//                             <TextField
//                                 select
//                                 fullWidth
//                                 label="Payment Status"
//                                 name="payment_status"
//                                 value={docForm.payment_status || "Pending"}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             >
//                                 {PAYMENT_STATUSES.map((status) => (
//                                     <MenuItem key={status} value={status}>
//                                         {status}
//                                     </MenuItem>
//                                 ))}
//                             </TextField>
//                         </Grid>

//                         <Grid item xs={12} sm={6} md={4}>
//                             <TextField
//                                 select
//                                 fullWidth
//                                 label="Approval Status"
//                                 name="approval_status"
//                                 value={docForm.approval_status || "Pending"}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             >
//                                 {APPROVAL_STATUSES.map((status) => (
//                                     <MenuItem key={status} value={status}>
//                                         {status}
//                                     </MenuItem>
//                                 ))}
//                             </TextField>
//                         </Grid>
//                     </Grid>

//                     {/* Document Items Table */}
//                     <Typography variant="h6" mb={1}>
//                         Items
//                     </Typography>

//                     <Box mb={2}>
//                         <Button variant="outlined" onClick={addNewItem} disabled={!editMode}>
//                             + Add Item
//                         </Button>
//                     </Box>

//                     <Paper variant="outlined" sx={{ maxHeight: 300, overflow: "auto" }}>
//                         {loadingItems ? (
//                             <Box display="flex" justifyContent="center" py={5}>
//                                 <CircularProgress />
//                             </Box>
//                         ) : (
//                             <DataTable
//                                 columns={itemsColumns}
//                                 data={items}
//                                 noHeader
//                                 highlightOnHover
//                                 dense
//                             />
//                         )}
//                     </Paper>

//                     <Box mt={3} display="flex" gap={2}>
//                         {!editMode ? (
//                             <Button variant="contained" onClick={() => setEditMode(true)}>
//                                 Edit Document
//                             </Button>
//                         ) : (
//                             <>
//                                 <Button variant="contained" color="primary" onClick={() => { saveDocument(); saveItems(); }}>
//                                     Save Changes
//                                 </Button>
//                                 <Button variant="outlined" onClick={() => { setEditMode(false); loadItems(selectedDoc.id); }}>
//                                     Cancel
//                                 </Button>
//                             </>
//                         )}

//                         <Button variant="text" color="secondary" onClick={() => setSelectedDoc(null)}>
//                             Close Detail
//                         </Button>
//                     </Box>
//                 </Paper>
//             )}
//         </Container>
//     );
// }


// 

// 

// ================================================================================================================================


// // BillingUI.jsx

// import React, { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";

// const PAYMENT_STATUSES = [
//     "Pending",
//     "Paid",
//     "Partial",
//     "Overdue",
// ];
// const APPROVAL_STATUSES = [
//     "Pending",
//     "Approved",
//     "Rejected",
// ];
// const defaultNewItem = {
//     description: "",
//     quantity: 1,
//     unit_price: 0,
//     discount: 0,
//     tax_rate: 0,
//     total: 0,
// };

// export default function BillingUI() {
//     const [documents, setDocuments] = useState([]);
//     const [loadingDocs, setLoadingDocs] = useState(false);
//     const [selectedDoc, setSelectedDoc] = useState(null);
//     const [items, setItems] = useState([]);
//     const [loadingItems, setLoadingItems] = useState(false);
//     const [docForm, setDocForm] = useState({});
//     const [editMode, setEditMode] = useState(false);
//     const { clientId } = useParams()
//     const BASE_URL = `http://localhost:8004/saas/${clientId}/invoice`;
//     const token = localStorage.getItem("access_token")

//     async function loadDocuments() {
//         setLoadingDocs(true);
//         try {
//             const res = await fetch(
//                 `${BASE_URL}/read_document?client_id=demo-client`,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`
//                     }
//                 }
//             );
//             const json = await res.json();
//             if (json?.data) setDocuments(json.data);
//         } finally {
//             setLoadingDocs(false);
//         }
//     }

//     async function loadItems(documentId) {
//         setLoadingItems(true);
//         try {
//             const res = await fetch(
//                 `${BASE_URL}/read?client_id=demo-client&document_id=${documentId}`,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`
//                     }
//                 }
//             );
//             const json = await res.json();
//             if (json?.data) setItems(json.data);
//         } finally {
//             setLoadingItems(false);
//         }
//     }

//     function onSelectDocument(doc) {
//         setSelectedDoc(doc);
//         setDocForm(doc);
//         loadItems(doc.id);
//         setEditMode(false);
//     }

//     function handleDocChange(e) {
//         const { name, value } = e.target;
//         setDocForm((prev) => ({ ...prev, [name]: value }));
//     }

//     function handleItemChange(index, field, value) {
//         const newItems = [...items];
//         newItems[index][field] = value;

//         const qty = parseFloat(newItems[index].quantity) || 0;
//         const price = parseFloat(newItems[index].unit_price) || 0;
//         const discount = parseFloat(newItems[index].discount) || 0;
//         const tax = parseFloat(newItems[index].tax_rate) || 0;
//         newItems[index].total = Number(qty * price - discount + tax).toFixed(2);

//         setItems(newItems);
//     }

//     function addNewItem() {
//         setItems([...items, { ...defaultNewItem }]);
//     }

//     function removeItem(index) {
//         const newItems = [...items];
//         newItems.splice(index, 1);
//         setItems(newItems);
//     }

//     async function saveDocument() {
//         if (!docForm?.id) return alert("No document selected");

//         try {
//             await fetch(`${BASE_URL}/update_document?client_id=demo-client`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`
//                 },
//                 body: JSON.stringify(docForm),
//             });
//             alert("Document updated");
//             loadDocuments();
//             setEditMode(false);
//         } catch (e) {
//             alert("Save failed: " + e.message);
//         }
//     }

//     async function saveItems() {
//         try {
//             await fetch(`${BASE_URL}/update?client_id=demo-client`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//                 body: JSON.stringify(items),
//             });
//             alert("Items updated");
//             loadItems(selectedDoc.id);
//         } catch (e) {
//             alert("Save items failed: " + e.message);
//         }
//     }

//     useEffect(() => {
//         loadDocuments();
//     }, []);

//     return (
//         <div className="billing-root">
//             <h1 className="billing-title">Billing Documents</h1>
//             <section className="billing-section">
//                 {loadingDocs ? (
//                     <div className="centered">
//                         <div className="loader"></div>
//                     </div>
//                 ) : (
//                     <div className="responsive-table">
//                         <table className="main-table">
//                             <thead>
//                                 <tr>
//                                     <th>Document Number</th>
//                                     <th>Date</th>
//                                     <th>Customer ID</th>
//                                     <th>Status</th>
//                                     <th>Payment Status</th>
//                                     <th>Actions</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {documents.map((doc) => (
//                                     <tr key={doc.id}>
//                                         <td>{doc.document_number}</td>
//                                         <td>{new Date(doc.document_date).toLocaleDateString()}</td>
//                                         <td>{doc.customer_id}</td>
//                                         <td>{doc.status}</td>
//                                         <td>{doc.payment_status}</td>
//                                         <td>
//                                             <button className="table-btn" onClick={() => onSelectDocument(doc)}>
//                                                 View / Edit
//                                             </button>
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}
//             </section>

//             {selectedDoc && (
//                 <section className="billing-detail">
//                     <h2>
//                         Document Detail & Items (ID: {selectedDoc.id})
//                     </h2>
//                     <form className="form-grid" autoComplete="off">
//                         <div className="form-field">
//                             <label>Document Number</label>
//                             <input
//                                 name="document_number"
//                                 value={docForm.document_number || ""}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             />
//                         </div>
//                         <div className="form-field">
//                             <label>Document Date</label>
//                             <input
//                                 name="document_date"
//                                 type="date"
//                                 value={docForm.document_date ? new Date(docForm.document_date).toISOString().substring(0, 10) : ""}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             />
//                         </div>
//                         <div className="form-field">
//                             <label>Customer ID</label>
//                             <input
//                                 name="customer_id"
//                                 value={docForm.customer_id || ""}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             />
//                         </div>
//                         <div className="form-field">
//                             <label>Status</label>
//                             <select
//                                 name="status"
//                                 value={docForm.status || ""}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             >
//                                 <option value="Draft">Draft</option>
//                                 <option value="Sent">Sent</option>
//                                 <option value="Paid">Paid</option>
//                                 <option value="Cancelled">Cancelled</option>
//                             </select>
//                         </div>
//                         <div className="form-field">
//                             <label>Payment Status</label>
//                             <select
//                                 name="payment_status"
//                                 value={docForm.payment_status || "Pending"}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             >
//                                 {PAYMENT_STATUSES.map((status) => (
//                                     <option key={status} value={status}>{status}</option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div className="form-field">
//                             <label>Approval Status</label>
//                             <select
//                                 name="approval_status"
//                                 value={docForm.approval_status || "Pending"}
//                                 onChange={handleDocChange}
//                                 disabled={!editMode}
//                             >
//                                 {APPROVAL_STATUSES.map((status) => (
//                                     <option key={status} value={status}>{status}</option>
//                                 ))}
//                             </select>
//                         </div>
//                     </form>
//                     <h3>Items</h3>
//                     <div style={{ marginBottom: "12px" }}>
//                         <button type="button" onClick={addNewItem} disabled={!editMode}>
//                             + Add Item
//                         </button>
//                     </div>
//                     <div className="responsive-table">
//                         {loadingItems ? (
//                             <div className="centered">
//                                 <div className="loader"></div>
//                             </div>
//                         ) : (
//                             <table className="main-table">
//                                 <thead>
//                                     <tr>
//                                         <th>Description</th>
//                                         <th>Quantity</th>
//                                         <th>Unit Price</th>
//                                         <th>Discount</th>
//                                         <th>Tax Rate</th>
//                                         <th>Total</th>
//                                         <th>Remove</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {items.map((item, index) => (
//                                         <tr key={index}>
//                                             <td>
//                                                 <input
//                                                     className="table-input"
//                                                     value={item.description || ""}
//                                                     onChange={(e) => handleItemChange(index, "description", e.target.value)}
//                                                     disabled={!editMode}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     className="table-input"
//                                                     type="number"
//                                                     value={item.quantity || ""}
//                                                     onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
//                                                     disabled={!editMode}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     className="table-input"
//                                                     type="number"
//                                                     value={item.unit_price || ""}
//                                                     onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
//                                                     disabled={!editMode}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     className="table-input"
//                                                     type="number"
//                                                     value={item.discount || ""}
//                                                     onChange={(e) => handleItemChange(index, "discount", e.target.value)}
//                                                     disabled={!editMode}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     className="table-input"
//                                                     type="number"
//                                                     value={item.tax_rate || ""}
//                                                     onChange={(e) => handleItemChange(index, "tax_rate", e.target.value)}
//                                                     disabled={!editMode}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <span>{item.total || "0.00"}</span>
//                                             </td>
//                                             <td>
//                                                 <button
//                                                     className="remove-btn"
//                                                     type="button"
//                                                     onClick={() => removeItem(index)}
//                                                     disabled={!editMode}
//                                                 >
//                                                     Delete
//                                                 </button>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         )}
//                     </div>
//                     <div className="action-row">
//                         {!editMode ? (
//                             <button type="button" onClick={() => setEditMode(true)}>
//                                 Edit Document
//                             </button>
//                         ) : (
//                             <>
//                                 <button type="button" onClick={() => { saveDocument(); saveItems(); }}>
//                                     Save Changes
//                                 </button>
//                                 <button type="button" onClick={() => { setEditMode(false); loadItems(selectedDoc.id); }}>
//                                     Cancel
//                                 </button>
//                             </>
//                         )}
//                         <button type="button" onClick={() => setSelectedDoc(null)}>
//                             Close Detail
//                         </button>
//                     </div>
//                 </section>
//             )}
//         </div>
//     );
// }


// ========================================================================================================================================= //
// ========================================================================================================================================= //
// ========================================================================================================================================= //
// ========================================================================================================================================= //
// ========================================================================================================================================= //




// import React, { useState, useEffect } from "react";
// import { useParams } from "react-router-dom";

// const emptyDoc = {
//     document_number: "",
//     document_type: "",
//     customer_id: "",
//     total_amount: 0,
//     payment_status: "Pending",
//     payment_method: "",
//     document_date: new Date().toISOString(),
//     due_date: null,
//     created_by: "",
//     updated_by: "",
// };

// export default function BillingDocumentCRUD() {
//     const [documents, setDocuments] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [form, setForm] = useState(emptyDoc);
//     const [editingId, setEditingId] = useState(null);
//     const [error, setError] = useState("");
//     const { clientId } = useParams();
//     const API_BASE = `http://localhost:8004/saas/${clientId}/invoice`;
//     const token = localStorage.getItem("access_token");

//     const fetchOptions = (method, body = null) => ({
//         method,
//         headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token ?? ""}`,
//         },
//         ...(body ? { body: JSON.stringify(body) } : {}),
//     });

//     const fetchDocs = async () => {
//         setLoading(true);
//         setError("");
//         try {
//             const res = await fetch(`${API_BASE}/read_document?client_id=${clientId}`, {
//                 headers: { Authorization: `Bearer ${token ?? ""}` },
//             });
//             const json = await res.json();
//             setDocuments(json.data || []);
//         } catch (e) {
//             setError("Error loading billing documents.");
//         }
//         setLoading(false);
//     };

//     useEffect(() => {
//         fetchDocs();
//         // eslint-disable-next-line
//     }, [clientId]);

//     // When editing, fill form including new fields
//     const handleEdit = (doc) => {
//         setEditingId(doc.id);
//         setForm({
//             document_number: doc.document_number || "",
//             document_type: doc.document_type || "",
//             customer_id: doc.customer_id || "",
//             total_amount: doc.total_amount || 0,
//             payment_status: doc.payment_status || "Pending",
//             payment_method: doc.payment_method || "",
//             document_date: doc.document_date || null,
//             due_date: doc.due_date || null,
//             created_by: doc.created_by || "",
//             updated_by: doc.updated_by || "",
//             id: doc.id,
//         });
//     };

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm({ ...form, [name]: value });
//     };

//     const handleCreate = async (e) => {
//         e.preventDefault();
//         setError("");
//         try {
//             // Remove id before create
//             const { id, ...payload } = form;
//             const res = await fetch(`${API_BASE}/create_document`, fetchOptions("POST", { ...payload, client_id: clientId }));
//             if (!res.ok) throw new Error("Create failed");
//             await fetchDocs();
//             setForm(emptyDoc);
//         } catch {
//             setError("Error creating billing document.");
//         }
//     };

//     const handleUpdate = async (e) => {
//         e.preventDefault();
//         setError("");
//         try {
//             const res = await fetch(`${API_BASE}/update_document?client_id=${clientId}`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token ?? ""}`,
//                 },
//                 body: JSON.stringify(form),
//             });
//             if (!res.ok) throw new Error("Update failed");
//             await fetchDocs();
//             setEditingId(null);
//             setForm(emptyDoc);
//         } catch {
//             setError("Error updating billing document.");
//         }
//     };

//     const handleDelete = async (id) => {
//         setError("");
//         if (!window.confirm("Are you sure you want to delete this billing document?")) return;
//         try {
//             const res = await fetch(`${API_BASE}/delete_document`, fetchOptions("POST", { client_id: clientId, id }));
//             if (!res.ok) throw new Error("Delete failed");
//             await fetchDocs();
//         } catch {
//             setError("Error deleting billing document.");
//         }
//     };

//     return (
//         <div style={styles.container}>
//             {/* <h2 style={styles.title}>Billing Documents</h2> */}

//             <form style={styles.form} onSubmit={editingId ? handleUpdate : handleCreate} aria-label="Billing Document Form">
//                 <h3 style={styles.formTitle}>{editingId ? "Update Billing Document" : "Create New Billing Document"}</h3>
//                 <input
//                     style={styles.input}
//                     name="document_number"
//                     value={form.document_number}
//                     onChange={handleChange}
//                     placeholder="Document Number"
//                     required
//                     aria-required="true"
//                 />
//                 <input
//                     style={styles.input}
//                     name="document_type"
//                     value={form.document_type}
//                     onChange={handleChange}
//                     placeholder="Document Type"
//                     required
//                     aria-required="true"
//                 />
//                 <input
//                     style={styles.input}
//                     name="customer_id"
//                     value={form.customer_id}
//                     onChange={handleChange}
//                     placeholder="Customer ID"
//                     required
//                     aria-required="true"
//                 />
//                 <input
//                     style={styles.input}
//                     name="total_amount"
//                     type="number"
//                     value={form.total_amount}
//                     onChange={handleChange}
//                     placeholder="Total Amount"
//                     min="0"
//                     step="0.01"
//                     required
//                     aria-required="true"
//                 />
//                 <select
//                     style={styles.select}
//                     name="payment_status"
//                     value={form.payment_status}
//                     onChange={handleChange}
//                     required
//                     aria-required="true"
//                 >
//                     <option value="Pending">Pending</option>
//                     <option value="Paid">Paid</option>
//                     <option value="Partial">Partial</option>
//                     <option value="Overdue">Overdue</option>
//                 </select>
//                 <select
//                     style={styles.select}
//                     name="payment_method"
//                     value={form.payment_method}
//                     onChange={handleChange}
//                     required
//                     aria-required="true"
//                 >
//                     <option value="UPI">UPI</option>
//                     <option value="Cash">Cash</option>
//                     <option value="Card">Card</option>
//                     <option value="Overdue">Overdue</option>
//                 </select>
//                 {/* <input
//                     style={styles.input}
//                     name="payment_method"
//                     value={form.payment_method}
//                     onChange={handleChange}
//                     placeholder="Payment Method"
//                     aria-label="Payment Method"
//                 /> */}
//                 {/* Hidden fields to preserve other backend-required fields */}
//                 <input type="hidden" name="document_date" value={form.document_date || ""} />
//                 <input type="hidden" name="due_date" value={form.due_date || ""} />
//                 <input type="hidden" name="created_by" value={form.created_by || ""} />
//                 <input type="hidden" name="updated_by" value={form.updated_by || ""} />
//                 <div style={styles.formButtons}>
//                     <button type="submit" style={styles.btnSubmit}>
//                         {editingId ? "Update" : "Create"}
//                     </button>
//                     {editingId && (
//                         <button
//                             type="button"
//                             style={styles.btnCancel}
//                             onClick={() => {
//                                 setEditingId(null);
//                                 setForm(emptyDoc);
//                             }}
//                         >
//                             Cancel
//                         </button>
//                     )}
//                 </div>
//             </form>
//             {error && <p style={styles.error}>{error}</p>}
//             {loading ? (
//                 <p>Loading...</p>
//             ) : documents.length === 0 ? (
//                 <p style={styles.noData}>No billing documents found.</p>
//             ) : (
//                 <table style={styles.table} aria-label="Billing Documents Table">
//                     <thead style={styles.thead}>
//                         <tr>
//                             <th style={styles.th}>Doc No</th>
//                             <th style={styles.th}>Type</th>
//                             <th style={styles.th}>Customer</th>
//                             <th style={styles.th}>Amount</th>
//                             <th style={styles.th}>Status</th>
//                             <th style={styles.th}>Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {documents.map((doc) => (
//                             <tr key={doc.id} style={styles.tr}>
//                                 <td style={styles.td}>{doc.document_number}</td>
//                                 <td style={styles.td}>{doc.document_type}</td>
//                                 <td style={styles.td}>{doc.customer_id}</td>
//                                 <td style={styles.td}>₹{Number(doc.total_amount).toFixed(2)}</td>
//                                 <td style={styles.td}>
//                                     <span style={{ ...styles.status, ...statusColors[doc.payment_status?.toLowerCase()] }}>
//                                         {doc.payment_status}
//                                     </span>
//                                 </td>
//                                 <td style={styles.td}>
//                                     <button style={styles.btnEdit} onClick={() => handleEdit(doc)} aria-label={`Edit Document ${doc.document_number}`}>
//                                         Edit
//                                     </button>
//                                     <button style={styles.btnDelete} onClick={() => handleDelete(doc.id)} aria-label={`Delete Document ${doc.document_number}`}>
//                                         Delete
//                                     </button>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             )}

//         </div>
//     );
// }

// // Color coding payment status badges
// const statusColors = {
//     paid: { backgroundColor: "#d4edda", color: "#155724" },
//     pending: { backgroundColor: "#fff3cd", color: "#856404" },
//     partial: { backgroundColor: "#ffeeba", color: "#856404" },
//     overdue: { backgroundColor: "#f8d7da", color: "#721c24" },
// };

// const styles = {
//     container: {
//         backgroundColor: 'var(--bg-color)',
//         fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
//         color: 'var(--bg-text-color)',
//         padding: "0 15px",
//     },
//     title: {
//         textAlign: "center",
//         fontSize: "2rem",
//         marginBottom: "30px",
//         color: "var(--bg-text-color)",
//     },
//     error: {
//         color: "var(--bg-number-color)",
//         textAlign: "center",
//         marginBottom: "10px",
//     },
//     noData: {
//         textAlign: "center",
//         fontStyle: "italic",
//         color: "#666",
//         marginTop: "20px",
//     },
//     table: {
//         width: "100%",
//         borderCollapse: "collapse",
//         marginBottom: "30px",
//         padding: "25px",
//         boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
//     },
//     thead: {
//         backgroundColor: "var(--bg-container)",
//         color: "var(--bg-text-color)",
//     },
//     th: {
//         padding: "12px 15px",
//         border: "1px solid #007bff",
//         fontWeight: "600",
//         textAlign: "center",
//     },
//     tr: {
//         backgroundColor: "var(--bg-container)",
//         transition: "background-color 0.2s ease", color: 'var(--bg-number-color)'
//     },
//     td: {
//         padding: "12px 15px",
//         border: "1px solid #ddd",
//         textAlign: "center",
//         color: 'var(--bg-number-color)'
//     },
//     btnEdit: {
//         backgroundColor: "#17a2b8",
//         border: "none",
//         color: "#fff",
//         padding: "6px 12px",
//         marginRight: 8,
//         borderRadius: 4,
//         cursor: "pointer",
//         fontSize: "0.9rem",
//         transition: "background-color 0.2s ease",
//     },
//     btnDelete: {
//         backgroundColor: "#dc3545",
//         border: "none",
//         color: "#fff",
//         padding: "6px 12px",
//         borderRadius: 4,
//         cursor: "pointer",
//         fontSize: "0.9rem",
//         transition: "background-color 0.2s ease",
//     },
//     form: {
//         backgroundColor: "#f8f9fa",
//         padding: "25px 30px",
//         borderRadius: 8,
//         boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
//         maxWidth: 600,
//         margin: "25px auto",
//     },
//     formTitle: {
//         fontSize: "1.5rem",
//         marginBottom: 20,
//         textAlign: "center",
//         color: "#343a40",
//     },
//     input: {
//         width: "100%",
//         padding: "12px 15px",
//         fontSize: "1rem",
//         marginBottom: 15,
//         borderRadius: 6,
//         border: "1px solid #ced4da",
//         outlineColor: "#80bdff",
//         transition: "border-color 0.2s ease",
//     },
//     select: {
//         width: "100%",
//         padding: "12px 15px",
//         fontSize: "1rem",
//         marginBottom: 25,
//         borderRadius: 6,
//         border: "1px solid #ced4da",
//         outlineColor: "#80bdff",
//         transition: "border-color 0.2s ease",
//     },
//     formButtons: {
//         display: "flex",
//         justifyContent: "center",
//         gap: "12px",
//     },
//     btnSubmit: {
//         backgroundColor: "#28a745",
//         border: "none",
//         color: "#fff",
//         padding: "12px 30px",
//         fontSize: "1.1rem",
//         borderRadius: 6,
//         cursor: "pointer",
//         transition: "background-color 0.3s ease",
//     },
//     btnCancel: {
//         backgroundColor: "#6c757d",
//         border: "none",
//         color: "#fff",
//         padding: "12px 30px",
//         fontSize: "1.1rem",
//         borderRadius: 6,
//         cursor: "pointer",
//         transition: "background-color 0.3s ease",
//     },
// };



import invoiceServicesPort from "../../Backend_Port_Files/InvoiceServices"; // adapt import


// import React, { useEffect, useState } from "react";
// import billingServicesPort from "../../Backend_Port_Files/InvoiceServices"; // adjust if needed
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// const BillingPage = () => {
//   const { clientId, invoiceId } = useParams();
//   const [invoice, setInvoice] = useState(null);
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const token = localStorage.getItem("access_token");

//   useEffect(() => {
//     const fetchInvoiceData = async () => {
//       if (!invoiceId) {
//         toast.error("Invoice ID is required.");
//         setLoading(false);
//         return;
//       }
//       if (!token) {
//         toast.error("Authentication token not found.");
//         setLoading(false);
//         return;
//       }

//       try {
//         setLoading(true);

//         const invoiceUrl = `/${clientId}/invoice/read_document?id=${encodeURIComponent(invoiceId)}`;
//         console.log("Fetching invoice:", invoiceUrl);

//         const invoiceResponse = await billingServicesPort.get(invoiceUrl, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (invoiceResponse.data?.data?.length > 0) {
//           setInvoice(invoiceResponse.data.data[0]);
//         } else {
//           toast.error("Invoice not found.");
//           setInvoice(null);
//         }

//         const itemsUrl = `/${clientId}/invoice/read?document_id=${encodeURIComponent(invoiceId)}`;
//         console.log("Fetching invoice items:", itemsUrl);

//         const itemsResponse = await billingServicesPort.get(itemsUrl, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         setItems(itemsResponse.data?.data || []);
//       } catch (error) {
//         console.error("Error fetching invoice data:", error);

//         if (error.response && error.response.status === 401) {
//           toast.error("Unauthorized: Please log in again.");
//         } else {
//           toast.error("Failed to load invoice data.");
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchInvoiceData();
//   }, [clientId, invoiceId, token]);

//   if (loading) return <div>Loading invoice...</div>;
//   if (!invoice)
//     return (
//       <div>
//         <h2>Invoice Not Found</h2>
//       </div>
//     );

//   const formatDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString() : "");

//   return (
//     <div className="billing-page-container" style={{ padding: 20 }}>
//       <h1>Invoice #{invoice.document_number || invoice.id}</h1>
//       <p>
//         <strong>Status:</strong> {invoice.status || "Unknown"}
//       </p>
//       <p>
//         <strong>Order ID:</strong> {invoice.order_id || "N/A"}
//       </p>
//       <p>
//         <strong>Reference:</strong> {invoice.reference_number || "N/A"}
//       </p>
//       <p>
//         <strong>Date:</strong> {formatDate(invoice.document_date)}
//       </p>

//       <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
//         <thead>
//           <tr>
//             <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Description</th>
//             <th style={{ borderBottom: "1px solid #ddd", padding: "8px", width: 80 }}>Qty</th>
//             <th style={{ borderBottom: "1px solid #ddd", padding: "8px", width: 120 }}>Unit Price (₹)</th>
//             <th style={{ borderBottom: "1px solid #ddd", padding: "8px", width: 120 }}>Total (₹)</th>
//           </tr>
//         </thead>
//         <tbody>
//           {items.length === 0 ? (
//             <tr>
//               <td colSpan={4} style={{ padding: "8px", textAlign: "center" }}>
//                 No items found.
//               </td>
//             </tr>
//           ) : (
//             items.map((item) => (
//               <tr key={item.id}>
//                 <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>{item.description}</td>
//                 <td style={{ borderBottom: "1px solid #eee", padding: "8px", textAlign: "center" }}>
//                   {item.quantity}
//                 </td>
//                 <td style={{ borderBottom: "1px solid #eee", padding: "8px", textAlign: "right" }}>
//                   {item.unit_price?.toFixed(2)}
//                 </td>
//                 <td style={{ borderBottom: "1px solid #eee", padding: "8px", textAlign: "right" }}>
//                   {item.total?.toFixed(2)}
//                 </td>
//               </tr>
//             ))
//           )}
//         </tbody>
//       </table>

//       <div style={{ marginTop: 20, textAlign: "right" }}>
//         <p>
//           <strong>Subtotal:</strong> ₹{invoice.subtotal?.toFixed(2) || "0.00"}
//         </p>
//         <p>
//           <strong>Tax:</strong> ₹{invoice.tax_amount?.toFixed(2) || "0.00"}
//         </p>
//         <p>
//           <strong>Discount:</strong> ₹{invoice.discount_amount?.toFixed(2) || "0.00"}
//         </p>
//         <p style={{ fontWeight: "bold", fontSize: "1.2em" }}>
//           Total: ₹{invoice.total_amount?.toFixed(2) || "0.00"}
//         </p>
//       </div>
//     </div>
//   );
// };

// export default BillingPage;



// ==============================================================================================================================


// import React, { useEffect, useState } from "react";
// import billingServicesPort from "../../Backend_Port_Files/InvoiceServices";
// import orderServicesPort from "../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../Backend_Port_Files/TableServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// const BillingPage = () => {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   const [servedOrders, setServedOrders] = useState([]);
//   const [tablesMap, setTablesMap] = useState({});
//   const [selectedOrderId, setSelectedOrderId] = useState("");
//   const [invoice, setInvoice] = useState(null);
//   const [items, setItems] = useState([]);
//   const [loadingOrders, setLoadingOrders] = useState(true);
//   const [loadingInvoice, setLoadingInvoice] = useState(false);

//   // Helper to compare dates ignoring timezones & time parts
//   const isSameCalendarDate = (date1, date2) =>
//     date1.getFullYear() === date2.getFullYear() &&
//     date1.getMonth() === date2.getMonth() &&
//     date1.getDate() === date2.getDate();

//   // Fetch served orders created today
//   useEffect(() => {
//     const fetchServedOrders = async () => {
//       try {
//         setLoadingOrders(true);
//         const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const allOrders = res.data?.data || [];
//         const today = new Date();

//         const todayServedOrders = allOrders.filter((order) => {
//           const orderDate = new Date(order.created_at);
//           return order.status?.toLowerCase() === "served" && isSameCalendarDate(orderDate, today);
//         });
//         setServedOrders(todayServedOrders);
//         console.log("All orders from API", res.data);
//       } catch (error) {
//         toast.error("Failed to fetch today's served orders");
//       } finally {
//         setLoadingOrders(false);
//       }
//     };

//     const fetchTables = async () => {
//       try {
//         const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const tableList = res.data?.data || [];
//         const map = {};
//         tableList.forEach((t) => {
//           map[t.id] = t.name || `Table-${t.id}`;
//         });
//         setTablesMap(map);
//       } catch {
//         toast.error("Failed to fetch tables");
//       }
//     };

//     fetchServedOrders();
//     fetchTables();
//   }, [clientId, token]);

//   // Fetch invoice and invoice items for selected order
//   useEffect(() => {
//     if (!selectedOrderId) {
//       setInvoice(null);
//       setItems([]);
//       return;
//     }

//     const fetchInvoiceData = async () => {
//       setLoadingInvoice(true);
//       try {
//         const invoiceUrl = `/${clientId}/invoice/read_document?id=${encodeURIComponent(selectedOrderId)}`;
//         const itemsUrl = `/${clientId}/invoice/read?document_id=${encodeURIComponent(selectedOrderId)}`;

//         const [invoiceRes, itemsRes] = await Promise.all([
//           billingServicesPort.get(invoiceUrl, { headers: { Authorization: `Bearer ${token}` } }),
//           billingServicesPort.get(itemsUrl, { headers: { Authorization: `Bearer ${token}` } }),
//         ]);

//         if (invoiceRes.data?.data?.length) {
//           setInvoice(invoiceRes.data.data[0]);
//         } else {
//           setInvoice(null);
//           toast.info("No invoice found for this order");
//         }
//         setItems(itemsRes.data?.data || []);
//       } catch (err) {
//         toast.error("Failed to fetch invoice data");
//         setInvoice(null);
//         setItems([]);
//       } finally {
//         setLoadingInvoice(false);
//       }
//     };

//     fetchInvoiceData();
//   }, [selectedOrderId, clientId, token]);

//   const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-CA") : "");

//   return (
//     <section
//       style={{
//         maxWidth: 900,
//         margin: "2rem auto",
//         padding: "2rem",
//         backgroundColor: "#fff",
//         color: "#333",
//         fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
//         borderRadius: 8,
//         boxShadow: "0 0 15px rgba(0,0,0,0.07)",
//         minHeight: "60vh",
//       }}
//     >
//       <h1 style={{ marginBottom: 16, fontWeight: 700, color: "#222" }}>
//         Today's Served Orders Billing
//       </h1>

//       {loadingOrders ? (
//         <p>Loading served orders...</p>
//       ) : servedOrders.length === 0 ? (
//         <p style={{ fontSize: 16, color: "#666" }}>No served orders found for today.</p>
//       ) : (
//         <>
//           <label
//             htmlFor="orderSelect"
//             style={{ fontWeight: 600, display: "block", marginBottom: 8, color: "#444" }}
//           >
//             Select Served Order (by Table)
//           </label>
//           <select
//             id="orderSelect"
//             value={selectedOrderId}
//             onChange={(e) => setSelectedOrderId(e.target.value)}
//             style={{
//               width: "100%",
//               padding: "10px 14px",
//               fontSize: 16,
//               borderRadius: 6,
//               border: "1px solid #bbb",
//               marginBottom: 32,
//               backgroundColor: "#fafafa",
//               color: "#222",
//               cursor: "pointer",
//             }}
//           >
//             <option value="" disabled>
//               -- Pick a Table Order --
//             </option>
//             {servedOrders.map((order) => (
//               <option key={order.id} value={order.id}>
//                 {(tablesMap[order.table_id] || "Table Unknown") + ` (Order #${order.id})`}
//               </option>
//             ))}
//           </select>
//         </>
//       )}

//       {loadingInvoice ? (
//         <p>Loading invoice details...</p>
//       ) : invoice ? (
//         <>
//           <div
//             style={{
//               marginBottom: 32,
//               padding: 16,
//               backgroundColor: "#f9f9f9",
//               borderRadius: 6,
//               boxShadow: "inset 0 0 5px rgba(0,0,0,0.03)",
//             }}
//           >
//             <p>
//               <strong>Invoice No:</strong> {invoice.document_number || invoice.id}
//             </p>
//             <p>
//               <strong>Status:</strong> {invoice.status || "N/A"}
//             </p>
//             <p>
//               <strong>Order ID:</strong> {invoice.order_id || "N/A"}
//             </p>
//             <p>
//               <strong>Reference:</strong> {invoice.reference_number || "N/A"}
//             </p>
//             <p>
//               <strong>Date:</strong> {formatDate(invoice.document_date)}
//             </p>
//           </div>

//           <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
//             <thead>
//               <tr style={{ borderBottom: "2px solid #444" }}>
//                 <th
//                   style={{ padding: "10px 12px", textAlign: "left", color: "#555", fontWeight: "600" }}
//                 >
//                   Description
//                 </th>
//                 <th
//                   style={{ padding: "10px 12px", width: 70, textAlign: "center", color: "#555", fontWeight: "600" }}
//                 >
//                   Qty
//                 </th>
//                 <th
//                   style={{ padding: "10px 12px", width: 130, textAlign: "right", color: "#555", fontWeight: "600" }}
//                 >
//                   Unit Price (₹)
//                 </th>
//                 <th
//                   style={{ padding: "10px 12px", width: 130, textAlign: "right", color: "#555", fontWeight: "600" }}
//                 >
//                   Total (₹)
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {items.length === 0 ? (
//                 <tr>
//                   <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#999" }}>
//                     No items found.
//                   </td>
//                 </tr>
//               ) : (
//                 items.map((item) => (
//                   <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
//                     <td style={{ padding: "10px 12px", color: "#222" }}>{item.description}</td>
//                     <td style={{ padding: "10px 12px", textAlign: "center" }}>{item.quantity}</td>
//                     <td style={{ padding: "10px 12px", textAlign: "right" }}>
//                       {item.unit_price?.toFixed(2)}
//                     </td>
//                     <td style={{ padding: "10px 12px", textAlign: "right" }}>
//                       {item.total?.toFixed(2)}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>

//           <div
//             style={{
//               fontSize: 18,
//               color: "#222",
//               fontWeight: 600,
//               textAlign: "right",
//               lineHeight: 1.6,
//             }}
//           >
//             <p>Subtotal: ₹{invoice.subtotal?.toFixed(2) || "0.00"}</p>
//             <p>Tax: ₹{invoice.tax_amount?.toFixed(2) || "0.00"}</p>
//             <p>Discount: ₹{invoice.discount_amount?.toFixed(2) || "0.00"}</p>
//             <p style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>
//               Total: ₹{invoice.total_amount?.toFixed(2) || "0.00"}
//             </p>
//           </div>
//         </>
//       ) : (
//         !loadingOrders && <p style={{ fontSize: 16, color: "#666" }}>Select an order above to view invoice.</p>
//       )}
//     </section>
//   );
// };

// export default BillingPage;


// =========================================================================================================================== //
// =========================================================================================================================== //
// =========================================================================================================================== //
// =========================================================================================================================== //
// =========================================================================================================================== //


// import React, { useEffect, useState } from "react";
// import billingServicesPort from "../../Backend_Port_Files/InvoiceServices";
// import orderServicesPort from "../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../Backend_Port_Files/TableServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// const BillingPage = () => {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   // States
//   const [servedOrders, setServedOrders] = useState([]);
//   const [tablesMap, setTablesMap] = useState({});
//   const [selectedOrderId, setSelectedOrderId] = useState("");
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [taxPercent, setTaxPercent] = useState(5);
//   const [discountValue, setDiscountValue] = useState(0);
//   const [discountIsPercent, setDiscountIsPercent] = useState(false);
//   const [saving, setSaving] = useState(false);

//   // Constants
//   const today = new Date();

//   // Helper: Compare if two dates fall on the same day
//   const isSameDay = (d1, d2) =>
//     d1.getFullYear() === d2.getFullYear() &&
//     d1.getMonth() === d2.getMonth() &&
//     d1.getDate() === d2.getDate();

//   // Load served orders for today
//   useEffect(() => {
//     async function loadServedOrders() {
//       try {
//         const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const data = res.data?.data || [];
//         const filtered = data.filter(
//           (o) => o.status?.toLowerCase() === "served" && isSameDay(new Date(o.created_at), today)
//         );
//         setServedOrders(filtered);
//       } catch (e) {
//         toast.error("Failed to load served orders.");
//       }
//     }
//     loadServedOrders();
//   }, [clientId, token]);

//   // Load tables map {id: name}
//   useEffect(() => {
//     async function loadTables() {
//       try {
//         const res = await tableServicesPort.get(`/${clientId}/tables`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const map = {};
//         (res.data?.data || []).forEach((t) => {
//           map[t.id] = t.name || `Table ${t.id}`;
//         });
//         setTablesMap(map);
//       } catch {
//         toast.error("Failed to load table data.");
//       }
//     }
//     loadTables();
//   }, [clientId, token]);

//   // When user selects an order, save it for displaying and calculating totals
//   useEffect(() => {
//     if (!selectedOrderId) return setSelectedOrder(null);
//     const order = servedOrders.find((o) => o.id.toString() === selectedOrderId);
//     setSelectedOrder(order);
//   }, [selectedOrderId, servedOrders]);

//   // Calculate subtotal from order items
//   const subtotal = selectedOrder?.items?.reduce((acc, item) => {
//     const price = parseFloat(item.price) || 0;
//     const qty = parseFloat(item.quantity) || 0;
//     return acc + price * qty;
//   }, 0) || 0;

//   // Calculate tax amount from subtotal and taxPercent
//   const taxAmount = (taxPercent / 100) * subtotal;

//   // Calculate discount amount (percent or fixed)
//   const discountAmount = discountIsPercent ? (discountValue / 100) * subtotal : discountValue;

//   // Final total amount
//   const totalAmount = subtotal + taxAmount - discountAmount;

//   // Handle saving invoice and items to backend
//   const handleSaveInvoice = async () => {
//     if (!selectedOrder) {
//       toast.error("Please select an order.");
//       return;
//     }
//     setSaving(true);
//     try {
//       // Prepare main document payload
//       const billingDocumentPayload = {
//         client_id: clientId,
//         document_type: "Invoice",
//         order_id: selectedOrder.id.toString(),
//         invoice_date: new Date().toISOString(),
//         reference_number: tablesMap[selectedOrder.table_id],
//         subtotal,
//         tax_amount: taxAmount,
//         discount_amount: discountAmount,
//         total_amount: totalAmount,
//         status: "Pending", // Default status
//       };

//       const resDoc = await billingServicesPort.post(
//         `/${clientId}/invoice/create_document`,
//         billingDocumentPayload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const billingDoc = resDoc.data?.data;
//       if (!billingDoc?.id) throw new Error("Failed to create invoice document.");

//       // Prepare document items payload
//       const documentItemsPayload = (selectedOrder.items || []).map((item, idx) => ({
//         item_ref_id: item.item_id?.toString(),
//         description: item.item_name,
//         quantity: item.quantity,
//         unit_price: item.price,
//         discount: 0,
//         tax_rate: taxPercent,
//         total: item.price * item.quantity,
//         item_category: "", // Optional
//         item_discount: 0,
//         item_tax_code: "Standard",
//       }));

//       // Add items linked to created document
//       await billingServicesPort.post(
//         `/${clientId}/invoice/create`,
//         documentItemsPayload,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//           params: { document_id: billingDoc.id },
//         }
//       );

//       toast.success("Invoice saved successfully!");
//     } catch (e) {
//       toast.error("Failed to save invoice.");
//       console.error(e);
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div
//       style={{
//         maxWidth: 900,
//         margin: "auto",
//         padding: 24,
//         backgroundColor: "#fff",
//         color: "#222",
//         fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
//         borderRadius: 8,
//         boxShadow: "0 0 15px rgba(0,0,0,0.08)",
//         minHeight: "60vh",
//       }}
//     >
//       <h1 style={{ marginBottom: 12, color: "#111" }}>Today's Served Orders Billing</h1>

//       <label htmlFor="orderSelect" style={{ fontWeight: "600", marginBottom: 10, display: "block" }}>
//         Select Order by Table
//       </label>

//       <select
//         id="orderSelect"
//         value={selectedOrderId}
//         onChange={(e) => setSelectedOrderId(e.target.value)}
//         style={{
//           width: "100%",
//           padding: 10,
//           fontSize: 16,
//           borderRadius: 6,
//           border: "1px solid #aaa",
//           marginBottom: 25,
//         }}
//       >
//         <option value="" disabled>
//           -- Select an order --
//         </option>
//         {servedOrders.map((order) => (
//           <option key={order.id} value={order.id}>
//             {tablesMap[order.table_id] || `Table ${order.table_id}`} (Order #{order.id})
//           </option>
//         ))}
//       </select>

//       {!selectedOrder && <p style={{ color: "#666", fontStyle: "italic" }}>Select an order to view details.</p>}

//       {selectedOrder && (
//         <>
//           <table
//             style={{
//               width: "100%",
//               borderCollapse: "collapse",
//               marginBottom: 30,
//             }}
//           >
//             <thead>
//               <tr style={{ borderBottom: "2px solid #444" }}>
//                 <th style={{ textAlign: "left", padding: 8, fontWeight: "600", color: "#444" }}>
//                   Item
//                 </th>
//                 <th style={{ width: 60, textAlign: "center", padding: 8, fontWeight: "600", color: "#444" }}>
//                   Qty
//                 </th>
//                 <th style={{ width: 120, textAlign: "right", padding: 8, fontWeight: "600", color: "#444" }}>
//                   Unit Price (₹)
//                 </th>
//                 <th style={{ width: 120, textAlign: "right", padding: 8, fontWeight: "600", color: "#444" }}>
//                   Total (₹)
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {selectedOrder.items.map((item) => (
//                 <tr key={item.item_id} style={{ borderBottom: "1px solid #ddd" }}>
//                   <td style={{ padding: 8, color: "#222" }}>{item.item_name || "Unnamed"}</td>
//                   <td style={{ textAlign: "center" }}>{item.quantity}</td>
//                   <td style={{ textAlign: "right" }}>{parseFloat(item.price).toFixed(2)}</td>
//                   <td style={{ textAlign: "right" }}>
//                     {(parseFloat(item.price) * parseFloat(item.quantity)).toFixed(2)}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           <div style={{ marginBottom: 20, fontSize: 16, maxWidth: 400 }}>
//             <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
//               <label>Tax % (e.g. 5%)</label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.1"
//                 value={taxPercent}
//                 style={{ width: 80, textAlign: "right" }}
//                 onChange={(e) => setTaxPercent(Number(e.target.value))}
//               />
//             </div>

//             <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
//               <label>
//                 Discount {discountIsPercent ? "(%)" : "(₹)"}
//                 <button
//                   style={{ marginLeft: 10, fontWeight: "bold", cursor: "pointer" }}
//                   onClick={() => setDiscountIsPercent(!discountIsPercent)}
//                   title="Toggle discount mode"
//                 >
//                   {discountIsPercent ? "Switch to ₹" : "Switch to %"}
//                 </button>
//               </label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.1"
//                 value={discountValue}
//                 style={{ width: 80, textAlign: "right" }}
//                 onChange={(e) => setDiscountValue(Number(e.target.value))}
//               />
//             </div>

//             <hr style={{ borderColor: "#ccc" }} />

//             <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontWeight: "600" }}>
//               <span>Subtotal:</span>
//               <span>₹{subtotal.toFixed(2)}</span>
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600" }}>
//               <span>Tax Amount:</span>
//               <span>₹{((taxPercent / 100) * subtotal).toFixed(2)}</span>
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600" }}>
//               <span>Discount Amount:</span>
//               <span>₹{discountIsPercent ? ((discountValue / 100) * subtotal).toFixed(2) : discountValue.toFixed(2)}</span>
//             </div>
//             <div style={{ marginTop: 8, borderTop: "2px solid #444", paddingTop: 10, fontWeight: "700", fontSize: 18, display: "flex", justifyContent: "space-between" }}>
//               <span>Total Amount:</span>
//               <span>₹{(subtotal + (taxPercent / 100) * subtotal - (discountIsPercent ? (discountValue / 100) * subtotal : discountValue)).toFixed(2)}</span>
//             </div>
//           </div>

//           <button
//             onClick={handleSaveInvoice}
//             disabled={saving}
//             style={{
//               padding: "12px 30px",
//               backgroundColor: "#333",
//               color: "#fff",
//               border: "none",
//               borderRadius: 6,
//               fontWeight: "bold",
//               cursor: saving ? "not-allowed" : "pointer",
//             }}
//           >
//             {saving ? "Saving..." : "Save Invoice"}
//           </button>
//         </>
//       )}
//     </div>
//   );
// };

// export default BillingPage;


// =========================== Billing Page ================================= //


// import React, { useEffect, useState } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// // Convert DB datetime string to JS Date
// function parseDb(dateStr) {
//   if (!dateStr) return null;
//   const fixed = dateStr.replace(" ", "T").split(".")[0];
//   return new Date(fixed);
// }

// // Safely convert to number
// const safeNum = (v) => {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// };

// const BillingPage = () => {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   const [orders, setOrders] = useState([]);
//   const [tables, setTables] = useState([]);
//   const [inventoryMap, setInventoryMap] = useState({});
//   const [tablesMap, setTablesMap] = useState({});
//   const [selectedOrderId, setSelectedOrderId] = useState("");
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [taxPercent, setTaxPercent] = useState(5);
//   const [discountValue, setDiscountValue] = useState(0);
//   const [discountIsPercent, setDiscountIsPercent] = useState(false);
//   const [saving, setSaving] = useState(false);

//   // Fetch orders, tables, inventory
//   useEffect(() => {
//     async function fetchData() {
//       if (!clientId || !token) return;

//       try {
//         const [ordersRes, tablesRes, invRes] = await Promise.all([
//           orderServices.get(`/${clientId}/dinein/table`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           tableServices.get(`/${clientId}/tables`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           inventoryServices.get(`/${clientId}/inventory/read`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//         ]);

//         setOrders(ordersRes.data?.data || []);
//         const tablesData = tablesRes.data?.data || [];
//         setTables(tablesData);

//         const tMap = {};
//         for (const t of tablesData) {
//           tMap[String(t.id)] = t.name || t.table_number || `Table ${t.id}`;
//         }
//         setTablesMap(tMap);

//         const iMap = {};
//         for (const it of invRes.data?.data || []) {
//           iMap[String(it.id)] = it;
//           iMap[Number(it.id)] = it;
//         }
//         setInventoryMap(iMap);
//       } catch (err) {
//         console.error("BillingPage fetchData error:", err);
//         toast.error("Failed to load billing data");
//       }
//     }

//     fetchData();
//   }, [clientId, token]);

//   // Enrich selected order with inventory data & unit_price
//   useEffect(() => {
//     if (!selectedOrderId) {
//       setSelectedOrder(null);
//       return;
//     }

//     const order = orders.find((o) => String(o.id) === String(selectedOrderId));
//     if (!order) {
//       setSelectedOrder(null);
//       return;
//     }

//     const enrichedItems = (order.items || []).map((item) => {
//       const inv = inventoryMap[item.item_id] || {};

//       const unitPrice =
//         safeNum(item.unit_price) ||
//         safeNum(item.price) ||
//         safeNum(inv.unit_price) ||
//         safeNum(inv.price) ||
//         0;

//       return {
//         ...item,
//         unit_price: unitPrice,
//         price: unitPrice,
//         name: item.item_name || inv.name || "Unnamed Item",
//         description: inv.description || "",
//       };
//     });

//     setSelectedOrder({ ...order, items: enrichedItems });
//   }, [selectedOrderId, orders, inventoryMap]);

//   const isToday = (dbDateStr) => {
//     const d = parseDb(dbDateStr) || (dbDateStr ? new Date(dbDateStr) : null);
//     if (!d || isNaN(d.getTime())) return false;
//     const now = new Date();
//     return (
//       d.getFullYear() === now.getFullYear() &&
//       d.getMonth() === now.getMonth() &&
//       d.getDate() === now.getDate()
//     );
//   };

//   const filteredOrdersForDropdown = orders.filter(
//     (o) => String(o.status || "").toLowerCase() === "served" && isToday(o.created_at)
//   );

//   const subtotal = selectedOrder
//     ? selectedOrder.items.reduce(
//         (s, it) => s + safeNum(it.unit_price) * safeNum(it.quantity),
//         0
//       )
//     : 0;
//   const taxAmount = (taxPercent / 100) * subtotal;
//   const discountAmount = discountIsPercent
//     ? (discountValue / 100) * subtotal
//     : safeNum(discountValue);
//   const totalAmount = subtotal + taxAmount - discountAmount;

//   const saveInvoice = async () => {
//     if (!selectedOrder) {
//       toast.error("Select an order first.");
//       return;
//     }
//     setSaving(true);

//     try {
//       const invoicePayload = {
//         client_id: clientId,
//         document_type: "Invoice",
//         document_number: `INV-${new Date().getFullYear()}-${String(
//           selectedOrder.id
//         ).padStart(4, "0")}`,
//         document_date: new Date().toISOString(),
//         order_id: String(selectedOrder.id),
//         reference_number:
//           tablesMap[String(selectedOrder.table_id)] ||
//           String(selectedOrder.table_id),
//         subtotal,
//         tax_amount: taxAmount,
//         discount_amount: discountAmount,
//         total_amount: totalAmount,
//         status: "Pending",
//       };

//       const docRes = await invoiceServices.post(
//         `/${clientId}/invoice/create_document`,
//         invoicePayload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const createdDoc = docRes?.data?.data;
//       if (!createdDoc?.id) throw new Error("Invoice doc creation failed");

//       const itemsPayload = selectedOrder.items.map((item) => ({
//         document_id: createdDoc.id,
//         item_ref_id: item.item_id?.toString(),
//         description: item.description || "",
//         quantity: item.quantity || 0,
//         unit_price: safeNum(item.unit_price),
//         total: safeNum(item.unit_price) * safeNum(item.quantity),
//       }));

//       await invoiceServices.post(`/${clientId}/invoice/create`, itemsPayload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       toast.success("Invoice saved successfully!");
//     } catch (err) {
//       console.error("saveInvoice error:", err);
//       toast.error("Failed to save invoice");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div style={{ maxWidth: 900, margin: "auto", padding: 24, background: "white", borderRadius: 8 }}>
//       <h1>Today's Served Billing</h1>

//       <label htmlFor="orderSelect">Select Order (Table)</label>
//       <select
//         id="orderSelect"
//         value={String(selectedOrderId)}
//         onChange={(e) => setSelectedOrderId(e.target.value)}
//         style={{ width: "100%", padding: 10, margin: "12px 0" }}
//       >
//         <option value="" disabled>
//           Select Order
//         </option>
//         {filteredOrdersForDropdown.map((order) => (
//           <option key={order.id} value={String(order.id)}>
//             {tablesMap[String(order.table_id)] || order.table_id} (Order #{order.id})
//           </option>
//         ))}
//       </select>

//       {!selectedOrder && <p>Select an order to view details.</p>}

//       {selectedOrder && (
//         <>
//           <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
//             <thead>
//               <tr>
//                 <th style={{ textAlign: "left" }}>Item</th>
//                 <th style={{ textAlign: "center" }}>Qty</th>
//                 <th style={{ textAlign: "right" }}>Unit Price</th>
//                 <th style={{ textAlign: "right" }}>Total</th>
//               </tr>
//             </thead>
//             <tbody>
//               {selectedOrder.items.map((item) => (
//                 <tr key={item.item_id}>
//                   <td>{item.name}</td>
//                   <td style={{ textAlign: "center" }}>{safeNum(item.quantity)}</td>
//                   <td style={{ textAlign: "right" }}>₹{safeNum(item.unit_price).toFixed(2)}</td>
//                   <td style={{ textAlign: "right" }}>
//                     ₹{(safeNum(item.unit_price) * safeNum(item.quantity)).toFixed(2)}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           <div style={{ maxWidth: 400, marginBottom: 20 }}>
//             <label>
//               Tax %
//               <input
//                 type="number"
//                 value={taxPercent}
//                 onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 style={{ width: 70, marginLeft: 10 }}
//               />
//             </label>
//             <label style={{ marginLeft: 20 }}>
//               Discount
//               <input
//                 type="number"
//                 value={discountValue}
//                 onChange={(e) => setDiscountValue(Number(e.target.value))}
//                 style={{ width: 70, marginLeft: 10 }}
//               />
//             </label>
//             <select
//               value={discountIsPercent ? "%" : "₹"}
//               onChange={(e) => setDiscountIsPercent(e.target.value === "%")}
//               style={{ marginLeft: 10 }}
//             >
//               <option value="%">%</option>
//               <option value="₹">₹</option>
//             </select>
//           </div>

//           <div style={{ fontWeight: 600, maxWidth: 400, marginBottom: 20 }}>
//             <div style={{ display: "flex", justifyContent: "space-between" }}>
//               <span>Subtotal:</span>
//               <span>₹{subtotal.toFixed(2)}</span>
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between" }}>
//               <span>Tax Amount:</span>
//               <span>₹{taxAmount.toFixed(2)}</span>
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between" }}>
//               <span>Discount:</span>
//               <span>
//                 ₹
//                 {discountIsPercent
//                   ? ((subtotal * discountValue) / 100).toFixed(2)
//                   : safeNum(discountValue).toFixed(2)}
//               </span>
//             </div>
//             <div
//               style={{
//                 borderTop: "2px solid #444",
//                 marginTop: 10,
//                 fontWeight: 700,
//                 fontSize: 18,
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <span>Total:</span>
//               <span>₹{totalAmount.toFixed(2)}</span>
//             </div>
//           </div>

//           <button
//             onClick={saveInvoice}
//             disabled={saving}
//             style={{
//               backgroundColor: "#333",
//               color: "white",
//               padding: "12px 24px",
//               borderRadius: 6,
//               fontWeight: 700,
//               cursor: saving ? "not-allowed" : "pointer",
//             }}
//           >
//             {saving ? "Saving..." : "Save Invoice"}
//           </button>
//         </>
//       )}
//     </div>
//   );
// };

// export default BillingPage;



// ==================================== New Working Invoice ========================================================== //
// ==================================== New Working Invoice ========================================================== //
// ==================================== New Working Invoice ========================================================== //
// ==================================== New Working Invoice ========================================================== //
// ==================================== New Working Invoice ========================================================== //



// import React, { useEffect, useState } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// function parseDbDate(date) {
//   if (!date) return null;
//   const parts = date.replace(" ", "T").split(".");
//   return new Date(parts[0]);
// }

// const statusColor = {
//   Paid: "#B2F2DD",
//   PaidCircle: "#4ecb90",
//   Due: "#ffc9c9",
//   Pending: "#ffe066",
//   PendingCircle: "#ffe066",
// };

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
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);
//   const [loading, setLoading] = useState(true);

//   // Helper
//   const isToday = (createdAt) => {
//     const date = parseDbDate(createdAt);
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
//           orderServices.get(`/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } }),
//           tableServices.get(`/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
//           inventoryServices.get(`/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
//         ]);
//         // Orders: Only today's served
//         const served = (ordersRes.data?.data || []).filter(
//           (o) => o.status?.toLowerCase() === "served" && isToday(o.created_at)
//         );
//         setOrders(served);
//         // Table map
//         const tMap = {};
//         (tablesRes.data?.data || []).forEach(
//           (t) => (tMap[t.id] = t.name || t.table_number || `Table ${t.id}`)
//         );
//         setTablesMap(tMap);
//         // Inventory map
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

//   // Enrich order items with inventory unit_price
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

//   // Common calculation
//   const subtotal =
//     selectedOrder?.items?.reduce(
//       (sum, item) =>
//         sum +
//         (item.unit_price ?? 0) * (item.quantity ?? 1),
//       0
//     ) || 0;
//   const taxAmount = (taxPercent / 100) * subtotal;
//   const discountAmount =
//     discountIsPercent ? ((discount / 100) * subtotal) : discount;
//   const total = subtotal + taxAmount - discountAmount;

//   const paymentMethods = ["Cash", "Credit/Debit Card", "UPI", "Digital Wallet"];
//   const paymentStatuses = ["Pending", "Paid", "Partial", "Due"];

//   return (
//     <div style={{ padding: "1.5rem", minHeight: "100vh", background: "#f8f9fa" }}>
//       <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
//         Today's Served Orders
//       </h1>
//       {/* Order GRID */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 24, marginBottom: 32 }}>
//         {loading ? (
//           <p>Loading...</p>
//         ) : orders.length === 0 ? (
//           <span style={{ color: "#888" }}>No served orders for today found.</span>
//         ) : (
//           orders.map((order) => {
//             const tableName = tablesMap[order.table_id];
//             const servedTime = parseDbDate(order.created_at);
//             const nItems = (order.items || []).length;
//             const orderTotal = enrichItems(order).reduce(
//               (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
//               0
//             );
//             // Color badge
//             let badge = {};
//             if (paymentStatus === "Paid" || order.status?.toLowerCase() === "paid") {
//               badge = { bg: statusColor.Paid, color: "#167442", text: "Paid" };
//             } else if (
//               paymentStatus === "Due" ||
//               order.status?.toLowerCase() === "due"
//             ) {
//               badge = { bg: statusColor.Due, color: "#dc3545", text: "Due" };
//             } else {
//               badge = { bg: statusColor.Pending, color: "#856404", text: "Pending" };
//             }

//             return (
//               <div
//                 key={order.id}
//                 className="bill-table-card"
//                 style={{
//                   padding: 26,
//                   background: "#fff",
//                   borderRadius: 12,
//                   boxShadow: "0 2px 12px 0 rgba(0,0,0,0.025)",
//                   border:
//                     selectedOrder?.id === order.id
//                       ? "2px solid #333"
//                       : "1px solid #eee",
//                   cursor: "pointer",
//                   position: "relative",
//                   minHeight: 170,
//                 }}
//                 onClick={() =>
//                   setSelectedOrder({
//                     ...order,
//                     items: enrichItems(order),
//                   })
//                 }
//               >
//                 <div style={{ display: "flex", alignItems: "center" }}>
//                   <div style={{ fontSize: 22, fontWeight: 700, marginRight: 18 }}>
//                     {tableName || `Table ${order.table_id}`}
//                   </div>
//                   <span
//                     style={{
//                       background: badge.bg,
//                       color: badge.color,
//                       padding: "6px 16px",
//                       fontSize: 15,
//                       borderRadius: 16,
//                       fontWeight: 600,
//                       marginLeft: "auto",
//                     }}
//                   >
//                     {badge.text}
//                   </span>
//                 </div>
//                 <div style={{ fontSize: 17, marginTop: 8, color: "#555" }}>
//                   Order #{order.id}
//                 </div>
//                 <div style={{ marginTop: 2, color: "#666" }}>Items: {nItems}</div>
//                 <div style={{ marginTop: 6, fontWeight: 700, fontSize: 18 }}>
//                   Total: ₹{orderTotal.toFixed(2)}
//                 </div>
//                 <div style={{ color: "#7b7b7b", marginTop: 7, fontSize: 15 }}>
//                   Served at: {servedTime && servedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* BILL DETAILS */}
//       {selectedOrder && (
//         <div
//           style={{
//             display: "flex",
//             gap: 36,
//             alignItems: "flex-start",
//             marginTop: 34,
//             flexWrap: "wrap",
//           }}
//         >
//           {/* Left: Order summary */}
//           <div style={{ background: "#fff", borderRadius: 12, padding: 32, flex: "1 1 420px", boxShadow: "0 2px 12px 0 rgba(0,0,0,0.03)" }}>
//             <h2 style={{ margin: 0, fontWeight: 600 }}>Order Summary</h2>
//             {selectedOrder.items.map((item) => (
//               <div
//                 key={item.item_id}
//                 style={{
//                   margin: "22px 0 18px 0",
//                   padding: "18px 18px 10px 18px",
//                   borderRadius: 9,
//                   background: "#f8fafb",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "flex-start",
//                 }}
//               >
//                 <div>
//                   <div style={{ fontSize: 17, fontWeight: 600 }}>{item.name}</div>
//                   <div style={{ fontSize: 14, color: "#767676", marginTop: 1 }}>
//                     {item.description}
//                   </div>
//                   <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>
//                     Qty: {item.quantity}
//                   </div>
//                 </div>
//                 <div style={{ textAlign: "right" }}>
//                   <div style={{ fontWeight: 700, fontSize: 16 }}>
//                     ₹{(item.unit_price * item.quantity).toFixed(2)}
//                   </div>
//                   <div style={{ fontSize: 13, color: "#888" }}>
//                     ₹{item.unit_price.toFixed(2)} each
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//           {/* Right: Bill summary and payment */}
//           <div
//             style={{
//               background: "#f8f9fb",
//               borderRadius: 12,
//               padding: 32,
//               minWidth: 320,
//               maxWidth: 360,
//               boxShadow: "0 2px 12px 0 rgba(0,0,0,0.02)",
//               marginTop: 14,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 22 }}>
//               Bill Summary
//             </div>
//             <div style={{ marginBottom: 15 }}>
//               <label>
//                 GST (%)
//                 <input
//                   type="number"
//                   style={{ marginLeft: 10, width: 55 }}
//                   value={taxPercent}
//                   onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 />
//               </label>
//             </div>
//             <div style={{ marginBottom: 16 }}>
//               <label>
//                 Discount {discountIsPercent ? "(%)" : "(₹)"}
//                 <input
//                   type="number"
//                   style={{ marginLeft: 11, width: 65 }}
//                   value={discount}
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                 />
//                 <select style={{ marginLeft: 10, height: 28 }} value={discountIsPercent ? "%" : "₹"} onChange={e => setDiscountIsPercent(e.target.value === "%")}>
//                   <option value="%">%</option>
//                   <option value="₹">₹</option>
//                 </select>
//               </label>
//             </div>
//             <hr style={{ margin: "18px 0", border: "1px solid #eff0f2", borderRadius: 1 }} />
//             <div style={{ fontSize: 16, margin: "12px 0" }}>
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span>Subtotal</span>
//                 <span>₹{subtotal.toFixed(2)}</span>
//               </div>
//               <div style={{ display: "flex", justifyContent: "space-between", color: "#e05050" }}>
//                 <span>Discount</span>
//                 <span>
//                   -₹
//                   {discountIsPercent
//                     ? ((discount / 100) * subtotal).toFixed(2)
//                     : Number(discount).toFixed(2)}
//                 </span>
//               </div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span>GST</span>
//                 <span>₹{taxAmount.toFixed(2)}</span>
//               </div>
//             </div>
//             <div style={{ fontWeight: 700, fontSize: 22, display: "flex", justifyContent: "space-between", margin: "18px 0 15px 0" }}>
//               <span>Total</span>
//               <span>₹{total.toFixed(2)}</span>
//             </div>
//             <fieldset style={{ margin: "22px 0 13px 0" }}>
//               <legend style={{ fontSize: 15, fontWeight: 700 }}>Payment Method</legend>
//               {paymentMethods.map((pm) => (
//                 <div key={pm}>
//                   <input
//                     id={pm}
//                     type="radio"
//                     name="payment-method"
//                     value={pm}
//                     checked={method === pm}
//                     onChange={() => setMethod(pm)}
//                     style={{ marginRight: 5 }}
//                   />
//                   <label htmlFor={pm}>{pm}</label>
//                 </div>
//               ))}
//             </fieldset>
//             <div style={{ margin: "17px 0 30px 0" }}>
//               <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>Payment Status</div>
//               <select
//                 value={paymentStatus}
//                 style={{ width: "100%", borderRadius: 6, padding: 6, fontSize: 15 }}
//                 onChange={(e) => setPaymentStatus(e.target.value)}
//               >
//                 {paymentStatuses.map((s) => (
//                   <option key={s} value={s}>{s}</option>
//                 ))}
//               </select>
//             </div>
//             <button
//               style={{
//                 padding: "14px 0",
//                 width: "100%",
//                 fontWeight: 700,
//                 color: "#fff",
//                 background: "#162e4a",
//                 fontSize: 16,
//                 border: "none",
//                 borderRadius: 6,
//                 marginTop: 10,
//                 boxShadow: "0 2px 6px 0 rgba(0,0,0,0.09)"
//               }}
//               onClick={() => toast.success("Bill Paid! (integration can be added)")}
//             >
//               Paid Bill
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //



// import React, { useEffect, useState } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// function parseDbDate(date) {
//   if (!date) return null;
//   return new Date(date);
// }

// const statusColor = {
//   Paid: "#d4edda",
//   Pending: "#fff3cd",
//   Due: "#f8d7da",
// };

// const buttonLabels = {
//   Pending: "Save Bill",
//   Paid: "Mark as Paid",
//   Partial: "Save Partial Payment",
//   Due: "Save as Due",
// };

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
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   // Helper
//   const isToday = (createdAt) => {
//     const date = parseDbDate(createdAt);
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
//           orderServices.get(`/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } }),
//           tableServices.get(`/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
//           inventoryServices.get(`/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
//         ]);
//         // Orders: Only today's served
//         const served = (ordersRes.data?.data || []).filter(
//           (o) => o.status?.toLowerCase() === "served" && isToday(o.created_at)
//         );
//         setOrders(served);
//         // Table map
//         const tMap = {};
//         (tablesRes.data?.data || []).forEach(
//           (t) => (tMap[t.id] = t.name || t.table_number || `Table ${t.id}`)
//         );
//         setTablesMap(tMap);
//         // Inventory map
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

//   // Enrich order items with inventory unit_price
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

//   // Common calculation
//   const subtotal =
//     selectedOrder?.items?.reduce(
//       (sum, item) =>
//         sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
//       0
//     ) || 0;
//   const taxAmount = (taxPercent / 100) * subtotal;
//   const discountAmount =
//     discountIsPercent ? ((discount / 100) * subtotal) : discount;
//   const total = subtotal + taxAmount - discountAmount;

//   const paymentMethods = ["Cash", "Credit/Debit Card", "UPI", "Digital Wallet"];
//   const paymentStatuses = ["Pending", "Paid", "Partial", "Due"];

//   // --- Save invoice ---
//   const saveInvoice = async () => {
//     if (!selectedOrder) return toast.error("Select an order first");
//     setSaving(true);

//     try {
//       // Step 1: Create invoice document
//       const docRes = await invoiceServices.post(
//         `/${clientId}/invoice/create_document`,
//         {
//           client_id: clientId,
//           document_type: "Invoice",
//           document_number: `INV-${new Date().getFullYear()}-${String(selectedOrder.id).padStart(4, "0")}`,
//           document_date: new Date().toISOString(),
//           order_id: String(selectedOrder.id),
//           reference_number: tablesMap[selectedOrder.table_id] || `Table ${selectedOrder.table_id}`,
//           subtotal,
//           tax_amount: taxAmount,
//           discount_amount: discountAmount,
//           total_amount: total,
//           payment_status: paymentStatus,
//           payment_method: method,
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const createdDoc = docRes?.data?.data;
//       if (!createdDoc?.id) throw new Error("Invoice document creation failed");

//       // Step 2: Create invoice items (no document_id here, backend takes it from query param)
//       const itemsPayload = selectedOrder.items.map((item) => ({
//         item_ref_id: item.item_id?.toString(),
//         description: item.description || "",
//         quantity: item.quantity || 0,
//         unit_price: item.unit_price || 0,
//         total: (item.unit_price || 0) * (item.quantity || 0),
//         payment_status: item.status || "pending", 
//       }));

//       await invoiceServices.post(
//         `/${clientId}/invoice/create?document_id=${createdDoc.id}&client_id=${clientId}`,
//         itemsPayload,   // 👈 plain array
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       console.log("Invoice Items Payload:", itemsPayload);
//       toast.success("Invoice saved successfully!");
//     } catch (err) {
//       console.error("Invoice save error:", err);
//       toast.error("Failed to save invoice");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div style={{ padding: "1.5rem", minHeight: "100vh", background: "#f8f9fa" }}>
//       <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
//         Today's Served Orders
//       </h1>
//       {/* Order GRID */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 24, marginBottom: 32 }}>
//         {loading ? (
//           <p>Loading...</p>
//         ) : orders.length === 0 ? (
//           <span style={{ color: "#888" }}>No served orders for today found.</span>
//         ) : (
//           orders.map((order) => {
//             const tableName = tablesMap[order.table_id];
//             const servedTime = parseDbDate(order.created_at);
//             const nItems = (order.items || []).length;
//             const orderTotal = enrichItems(order).reduce(
//               (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
//               0
//             );
//             // Color badge
//             let badge = {};
//             if (paymentStatus === "Paid" || order.status?.toLowerCase() === "paid") {
//               badge = { bg: statusColor.Paid, color: "#167442", text: "Paid" };
//             } else if (
//               paymentStatus === "Due" ||
//               order.status?.toLowerCase() === "due"
//             ) {
//               badge = { bg: statusColor.Due, color: "#dc3545", text: "Due" };
//             } else {
//               badge = { bg: statusColor.Pending, color: "#856404", text: "Pending" };
//             }

//             return (
//               <div
//                 key={order.id}
//                 className="bill-table-card"
//                 style={{
//                   padding: 26,
//                   background: "#fff",
//                   borderRadius: 12,
//                   boxShadow: "0 2px 12px 0 rgba(0,0,0,0.025)",
//                   border:
//                     selectedOrder?.id === order.id
//                       ? "2px solid #333"
//                       : "1px solid #eee",
//                   cursor: "pointer",
//                   position: "relative",
//                   minHeight: 170,
//                 }}
//                 onClick={() =>
//                   setSelectedOrder({
//                     ...order,
//                     items: enrichItems(order),
//                   })
//                 }
//               >
//                 <div style={{ display: "flex", alignItems: "center" }}>
//                   <div style={{ fontSize: 22, fontWeight: 700, marginRight: 18 }}>
//                     {tableName || `Table ${order.table_id}`}
//                   </div>
//                   <span
//                     style={{
//                       background: badge.bg,
//                       color: badge.color,
//                       padding: "6px 16px",
//                       fontSize: 15,
//                       borderRadius: 16,
//                       fontWeight: 600,
//                       marginLeft: "auto",
//                     }}
//                   >
//                     {badge.text}
//                   </span>
//                 </div>
//                 <div style={{ fontSize: 17, marginTop: 8, color: "#555" }}>
//                   Order #{order.id}
//                 </div>
//                 <div style={{ marginTop: 2, color: "#666" }}>Items: {nItems}</div>
//                 <div style={{ marginTop: 6, fontWeight: 700, fontSize: 18 }}>
//                   Total: ₹{orderTotal.toFixed(2)}
//                 </div>
//                 <div style={{ color: "#7b7b7b", marginTop: 7, fontSize: 15 }}>
//                   Served at: {servedTime && servedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* BILL DETAILS */}
//       {selectedOrder && (
//         <div
//           style={{
//             display: "flex",
//             gap: 36,
//             alignItems: "flex-start",
//             marginTop: 34,
//             flexWrap: "wrap",
//           }}
//         >
//           {/* Left: Order summary */}
//           <div style={{ background: "#fff", borderRadius: 12, padding: 32, flex: "1 1 420px", boxShadow: "0 2px 12px 0 rgba(0,0,0,0.03)" }}>
//             <h2 style={{ margin: 0, fontWeight: 600 }}>Order Summary</h2>
//             {selectedOrder.items.map((item) => (
//               <div
//                 key={item.item_id}
//                 style={{
//                   margin: "22px 0 18px 0",
//                   padding: "18px 18px 10px 18px",
//                   borderRadius: 9,
//                   background: "#f8fafb",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "flex-start",
//                 }}
//               >
//                 <div>
//                   <div style={{ fontSize: 17, fontWeight: 600 }}>{item.name}</div>
//                   <div style={{ fontSize: 14, color: "#767676", marginTop: 1 }}>
//                     {item.description}
//                   </div>
//                   <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>
//                     Qty: {item.quantity}
//                   </div>
//                 </div>
//                 <div style={{ textAlign: "right" }}>
//                   <div style={{ fontWeight: 700, fontSize: 16 }}>
//                     ₹{(item.unit_price * item.quantity).toFixed(2)}
//                   </div>
//                   <div style={{ fontSize: 13, color: "#888" }}>
//                     ₹{item.unit_price.toFixed(2)} each
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Right: Bill summary and payment */}
//           <div
//             style={{
//               background: "#f8f9fb",
//               borderRadius: 12,
//               padding: 32,
//               minWidth: 320,
//               maxWidth: 360,
//               boxShadow: "0 2px 12px 0 rgba(0,0,0,0.02)",
//               marginTop: 14,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 22 }}>
//               Bill Summary
//             </div>
//             <div style={{ marginBottom: 15 }}>
//               <label>
//                 GST (%)
//                 <input
//                   type="number"
//                   style={{ marginLeft: 10, width: 55 }}
//                   value={taxPercent}
//                   onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 />
//               </label>
//             </div>
//             <div style={{ marginBottom: 16 }}>
//               <label>
//                 Discount {discountIsPercent ? "(%)" : "(₹)"}
//                 <input
//                   type="number"
//                   style={{ marginLeft: 11, width: 65 }}
//                   value={discount}
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                 />
//                 <select style={{ marginLeft: 10, height: 28 }} value={discountIsPercent ? "%" : "₹"} onChange={e => setDiscountIsPercent(e.target.value === "%")}>
//                   <option value="%">%</option>
//                   <option value="₹">₹</option>
//                 </select>
//               </label>
//             </div>
//             <hr style={{ margin: "18px 0", border: "1px solid #eff0f2", borderRadius: 1 }} />
//             <div style={{ fontSize: 16, margin: "12px 0" }}>
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span>Subtotal</span>
//                 <span>₹{subtotal.toFixed(2)}</span>
//               </div>
//               <div style={{ display: "flex", justifyContent: "space-between", color: "#e05050" }}>
//                 <span>Discount</span>
//                 <span>
//                   -₹
//                   {discountIsPercent
//                     ? ((discount / 100) * subtotal).toFixed(2)
//                     : Number(discount).toFixed(2)}
//                 </span>
//               </div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span>GST</span>
//                 <span>₹{taxAmount.toFixed(2)}</span>
//               </div>
//             </div>
//             <div style={{ fontWeight: 700, fontSize: 22, display: "flex", justifyContent: "space-between", margin: "18px 0 15px 0" }}>
//               <span>Total</span>
//               <span>₹{total.toFixed(2)}</span>
//             </div>
//             <fieldset style={{ margin: "22px 0 13px 0" }}>
//               <legend style={{ fontSize: 15, fontWeight: 700 }}>Payment Method</legend>
//               {paymentMethods.map((pm) => (
//                 <div key={pm}>
//                   <input
//                     id={pm}
//                     type="radio"
//                     name="payment-method"
//                     value={pm}
//                     checked={method === pm}
//                     onChange={() => setMethod(pm)}
//                     style={{ marginRight: 5 }}
//                   />
//                   <label htmlFor={pm}>{pm}</label>
//                 </div>
//               ))}
//             </fieldset>
//             <div style={{ margin: "17px 0 30px 0" }}>
//               <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>Payment Status</div>
//               <select
//                 value={paymentStatus}
//                 style={{ width: "100%", borderRadius: 6, padding: 6, fontSize: 15 }}
//                 onChange={(e) => setPaymentStatus(e.target.value)}
//               >
//                 {paymentStatuses.map((s) => (
//                   <option key={s} value={s}>{s}</option>
//                 ))}
//               </select>
//             </div>
//             <button
//               style={{
//                 padding: "14px 0",
//                 width: "100%",
//                 fontWeight: 700,
//                 color: "#fff",
//                 background: "#162e4a",
//                 fontSize: 16,
//                 border: "none",
//                 borderRadius: 6,
//                 marginTop: 10,
//                 boxShadow: "0 2px 6px 0 rgba(0,0,0,0.09)"
//               }}
//               onClick={saveInvoice}
//               disabled={saving}
//             >
//               {saving ? "Saving..." : (buttonLabels[paymentStatus] || "Save Bill")}
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




// ======================================================================================================================
// ======================================================================================================================
// ======================================================================================================================
// ======================================================================================================================
// ======================================================================================================================

// import React, { useEffect, useState } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// function parseDbDate(date) {
//   if (!date) return null;
//   return new Date(date);
// }

// const statusColor = {
//   Paid: "#d4edda",
//   Pending: "#fff3cd",
//   Due: "#f8d7da",
// };

// const buttonLabels = {
//   Pending: "Save Bill",
//   Paid: "Mark as Paid",
//   Partial: "Save Partial Payment",
//   Due: "Save as Due",
// };

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
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   // NEW: extra fields
//   const [customerId, setCustomerId] = useState("");
//   const [contactEmail, setContactEmail] = useState("");
//   const [contactPhone, setContactPhone] = useState("");

//   // Helper
//   const isToday = (createdAt) => {
//     const date = parseDbDate(createdAt);
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
//           orderServices.get(`/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } }),
//           tableServices.get(`/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
//           inventoryServices.get(`/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
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
//   const discountAmount =
//     discountIsPercent ? (discount / 100) * subtotal : discount;
//   const total = subtotal + taxAmount - discountAmount;

//   const paymentMethods = ["Cash", "Credit/Debit Card", "UPI", "Digital Wallet"];
//   const paymentStatuses = ["Pending", "Paid", "Partial", "Due"];

//   const saveInvoice = async () => {
//     if (!selectedOrder) return toast.error("Select an order first");
//     setSaving(true);

//     try {
//       const docRes = await invoiceServices.post(
//         `/${clientId}/invoice/create_document`,
//         {
//           client_id: clientId,
//           document_type: "Invoice",
//           document_number: `INV-${new Date().getFullYear()}-${String(
//             selectedOrder.id
//           ).padStart(4, "0")}`,
//           document_date: new Date().toISOString(),
//           order_id: String(selectedOrder.id),
//           reference_number:
//             tablesMap[selectedOrder.table_id] || `Table ${selectedOrder.table_id}`,
//           subtotal,
//           tax_amount: taxAmount,
//           discount_amount: discountAmount,
//           total_amount: total,
//           payment_status: paymentStatus,
//           payment_method: method,

//           // NEW fields
//           customer_id: customerId || selectedOrder.phone_number || "",
//           contact_email: contactEmail,
//           contact_phone: contactPhone || selectedOrder.phone_number || "",
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const createdDoc = docRes?.data?.data;
//       if (!createdDoc?.id) throw new Error("Invoice document creation failed");

//       const itemsPayload = selectedOrder.items.map((item) => ({
//         item_ref_id: item.item_id?.toString(),
//         description: item.description || "",
//         quantity: item.quantity || 0,
//         unit_price: item.unit_price || 0,
//         total: (item.unit_price || 0) * (item.quantity || 0),
//         payment_status: paymentStatus,
//       }));

//       await invoiceServices.post(
//         `/${clientId}/invoice/create?document_id=${createdDoc.id}&client_id=${clientId}`,
//         itemsPayload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       toast.success("Invoice saved successfully!");
//     } catch (err) {
//       console.error("Invoice save error:", err);
//       toast.error("Failed to save invoice");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div style={{ padding: "1.5rem", minHeight: "100vh", background: "#f8f9fa" }}>
//       <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
//         Today's Served Orders
//       </h1>

//       {/* Orders Grid */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
//           gap: 24,
//           marginBottom: 32,
//         }}
//       >
//         {loading ? (
//           <p>Loading...</p>
//         ) : orders.length === 0 ? (
//           <span style={{ color: "#888" }}>No served orders for today found.</span>
//         ) : (
//           orders.map((order) => {
//             const tableName = tablesMap[order.table_id];
//             const servedTime = parseDbDate(order.created_at);
//             const nItems = (order.items || []).length;
//             const orderTotal = enrichItems(order).reduce(
//               (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
//               0
//             );

//             return (
//               <div
//                 key={order.id}
//                 style={{
//                   padding: 26,
//                   background: "#fff",
//                   borderRadius: 12,
//                   boxShadow: "0 2px 12px 0 rgba(0,0,0,0.025)",
//                   border:
//                     selectedOrder?.id === order.id
//                       ? "2px solid #333"
//                       : "1px solid #eee",
//                   cursor: "pointer",
//                 }}
//                 onClick={() =>
//                   setSelectedOrder({ ...order, items: enrichItems(order) })
//                 }
//               >
//                 <div style={{ fontSize: 22, fontWeight: 700 }}>
//                   {tableName || `Table ${order.table_id}`}
//                 </div>
//                 <div style={{ fontSize: 17, marginTop: 8, color: "#555" }}>
//                   Order #{order.id}
//                 </div>
//                 <div style={{ marginTop: 6, fontWeight: 700, fontSize: 18 }}>
//                   Total: ₹{orderTotal.toFixed(2)}
//                 </div>
//                 <div style={{ color: "#7b7b7b", marginTop: 7, fontSize: 15 }}>
//                   Served at:{" "}
//                   {servedTime &&
//                     servedTime.toLocaleTimeString([], {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     })}
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* Bill Details */}
//       {selectedOrder && (
//         <div
//           style={{
//             display: "flex",
//             gap: 36,
//             alignItems: "flex-start",
//             marginTop: 34,
//             flexWrap: "wrap",
//           }}
//         >
//           {/* Left: Order Summary */}
//           <div
//             style={{
//               background: "#fff",
//               borderRadius: 12,
//               padding: 32,
//               flex: "1 1 420px",
//               boxShadow: "0 2px 12px 0 rgba(0,0,0,0.03)",
//             }}
//           >
//             <h2 style={{ margin: 0, fontWeight: 600 }}>Order Summary</h2>
//             {selectedOrder.items.map((item) => (
//               <div
//                 key={item.item_id}
//                 style={{
//                   margin: "22px 0 18px 0",
//                   padding: "18px",
//                   borderRadius: 9,
//                   background: "#f8fafb",
//                   display: "flex",
//                   justifyContent: "space-between",
//                 }}
//               >
//                 <div>
//                   <div style={{ fontSize: 17, fontWeight: 600 }}>{item.name}</div>
//                   <div style={{ fontSize: 14, color: "#767676" }}>
//                     {item.description}
//                   </div>
//                   <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>
//                     Qty: {item.quantity}
//                   </div>
//                 </div>
//                 <div style={{ textAlign: "right" }}>
//                   <div style={{ fontWeight: 700, fontSize: 16 }}>
//                     ₹{(item.unit_price * item.quantity).toFixed(2)}
//                   </div>
//                   <div style={{ fontSize: 13, color: "#888" }}>
//                     ₹{item.unit_price.toFixed(2)} each
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Right: Bill Summary */}
//           <div
//             style={{
//               background: "#f8f9fb",
//               borderRadius: 12,
//               padding: 32,
//               minWidth: 320,
//               maxWidth: 380,
//               boxShadow: "0 2px 12px 0 rgba(0,0,0,0.02)",
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 22 }}>
//               Bill Summary
//             </div>

//             {/* Existing GST/Discount */}
//             <div style={{ marginBottom: 15 }}>
//               <label>
//                 GST (%)
//                 <input
//                   type="number"
//                   style={{ marginLeft: 10, width: 55 }}
//                   value={taxPercent}
//                   onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 />
//               </label>
//             </div>
//             <div style={{ marginBottom: 16 }}>
//               <label>
//                 Discount {discountIsPercent ? "(%)" : "(₹)"}
//                 <input
//                   type="number"
//                   style={{ marginLeft: 11, width: 65 }}
//                   value={discount}
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                 />
//                 <select
//                   style={{ marginLeft: 10, height: 28 }}
//                   value={discountIsPercent ? "%" : "₹"}
//                   onChange={(e) => setDiscountIsPercent(e.target.value === "%")}
//                 >
//                   <option value="%">%</option>
//                   <option value="₹">₹</option>
//                 </select>
//               </label>
//             </div>

//             <hr style={{ margin: "18px 0" }} />

//             {/* Totals */}
//             <div style={{ display: "flex", justifyContent: "space-between" }}>
//               <span>Subtotal</span>
//               <span>₹{subtotal.toFixed(2)}</span>
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between" }}>
//               <span>Discount</span>
//               <span>-₹{discountAmount.toFixed(2)}</span>
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between" }}>
//               <span>GST</span>
//               <span>₹{taxAmount.toFixed(2)}</span>
//             </div>
//             <div
//               style={{
//                 fontWeight: 700,
//                 fontSize: 22,
//                 display: "flex",
//                 justifyContent: "space-between",
//                 margin: "18px 0",
//               }}
//             >
//               <span>Total</span>
//               <span>₹{total.toFixed(2)}</span>
//             </div>

//             {/* Payment Method & Status */}
//             <fieldset>
//               <legend style={{ fontSize: 15, fontWeight: 700 }}>
//                 Payment Method
//               </legend>
//               {paymentMethods.map((pm) => (
//                 <div key={pm}>
//                   <input
//                     id={pm}
//                     type="radio"
//                     name="payment-method"
//                     value={pm}
//                     checked={method === pm}
//                     onChange={() => setMethod(pm)}
//                   />
//                   <label htmlFor={pm}>{pm}</label>
//                 </div>
//               ))}
//             </fieldset>

//             <div style={{ margin: "17px 0" }}>
//               <label style={{ fontWeight: 700 }}>Payment Status</label>
//               <select
//                 value={paymentStatus}
//                 style={{
//                   width: "100%",
//                   borderRadius: 6,
//                   padding: 6,
//                   fontSize: 15,
//                   marginTop: 6,
//                 }}
//                 onChange={(e) => setPaymentStatus(e.target.value)}
//               >
//                 {paymentStatuses.map((s) => (
//                   <option key={s} value={s}>
//                     {s}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* NEW Customer Fields */}
//             <div style={{ marginTop: 20 }}>
//               <label style={{ fontWeight: 700 }}>Customer ID</label>
//               <input
//                 type="text"
//                 value={customerId}
//                 placeholder="Enter customer ID"
//                 onChange={(e) => setCustomerId(e.target.value)}
//                 style={{ width: "100%", marginTop: 6, padding: 6 }}
//               />
//             </div>
//             <div style={{ marginTop: 12 }}>
//               <label style={{ fontWeight: 700 }}>Contact Email</label>
//               <input
//                 type="email"
//                 value={contactEmail}
//                 placeholder="Enter email"
//                 onChange={(e) => setContactEmail(e.target.value)}
//                 style={{ width: "100%", marginTop: 6, padding: 6 }}
//               />
//             </div>
//             <div style={{ marginTop: 12 }}>
//               <label style={{ fontWeight: 700 }}>Contact Phone</label>
//               <input
//                 type="text"
//                 value={contactPhone}
//                 placeholder="Enter phone"
//                 onChange={(e) => setContactPhone(e.target.value)}
//                 style={{ width: "100%", marginTop: 6, padding: 6 }}
//               />
//             </div>

//             {/* Save Button */}
//             <button
//               style={{
//                 padding: "14px 0",
//                 width: "100%",
//                 fontWeight: 700,
//                 color: "#fff",
//                 background: "#162e4a",
//                 fontSize: 16,
//                 border: "none",
//                 borderRadius: 6,
//                 marginTop: 20,
//               }}
//               onClick={saveInvoice}
//               disabled={saving}
//             >
//               {saving
//                 ? "Saving..."
//                 : buttonLabels[paymentStatus] || "Save Bill"}
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //
// =============================================================================================================================== //


// import React, { useEffect, useState, useRef } from "react";
// import orderServices from "../../Backend_Port_Files/OrderServices";
// import tableServices from "../../Backend_Port_Files/TableServices";
// import inventoryServices from "../../Backend_Port_Files/InventoryServices";
// import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// function parseDbDate(date) {
//   if (!date) return null;
//   return new Date(date);
// }

// const buttonLabels = {
//   Pending: "Save Bill",
//   Paid: "Mark as Paid",
//   Partial: "Save Partial Payment",
//   Due: "Save as Due",
// };

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
//   const [discountIsPercent, setDiscountIsPercent] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   // Extra fields
//   const [customerId, setCustomerId] = useState("");
//   const [contactEmail, setContactEmail] = useState("");
//   const [contactPhone, setContactPhone] = useState("");

//   const invoiceRef = useRef(null);

//   const isToday = (createdAt) => {
//     const date = parseDbDate(createdAt);
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
//   const discountAmount =
//     discountIsPercent ? (discount / 100) * subtotal : discount;
//   const total = subtotal + taxAmount - discountAmount;

//   const paymentMethods = ["Cash", "Credit/Debit Card", "UPI", "Digital Wallet"];
//   const paymentStatuses = ["Pending", "Paid", "Partial", "Due"];

//   // Save invoice (draft)
//   const saveInvoice = async () => {
//     if (!selectedOrder) return toast.error("Select an order first");
//     setSaving(true);
//     try {
//       const docRes = await invoiceServices.post(
//         `/${clientId}/invoice/create_document`,
//         {
//           client_id: clientId,
//           document_type: "Invoice",
//           document_number: null, // draft, no number
//           document_date: new Date().toISOString(),
//           order_id: String(selectedOrder.id),
//           reference_number:
//             tablesMap[selectedOrder.table_id] || `Table ${selectedOrder.table_id}`,
//           subtotal,
//           tax_amount: taxAmount,
//           discount_amount: discountAmount,
//           total_amount: total,
//           payment_status: paymentStatus,
//           payment_method: method,
//           customer_id: customerId || selectedOrder.phone_number || "",
//           contact_email: contactEmail,
//           contact_phone: contactPhone || selectedOrder.phone_number || "",
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const createdDoc = docRes?.data?.data;
//       if (!createdDoc?.id) throw new Error("Invoice draft creation failed");

//       const itemsPayload = selectedOrder.items.map((item) => ({
//         item_ref_id: item.item_id?.toString(),
//         description: item.description || "",
//         quantity: item.quantity || 0,
//         unit_price: item.unit_price || 0,
//         total: (item.unit_price || 0) * (item.quantity || 0),
//         payment_status: paymentStatus,
//       }));

//       await invoiceServices.post(
//         `/${clientId}/invoice/create?document_id=${createdDoc.id}&client_id=${clientId}`,
//         itemsPayload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       toast.success("Invoice draft saved!");
//     } catch (err) {
//       console.error("Invoice save error:", err);
//       toast.error("Failed to save invoice");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const printInvoice = () => {
//     if (!invoiceRef.current) return;
//     const printContents = invoiceRef.current.innerHTML;
//     const printWindow = window.open("", "", "width=800,height=600");
//     printWindow.document.write(`
//       <html>
//         <head>
//           <title>Invoice</title>
//           <style>
//             body { font-family: Arial, sans-serif; padding:20px; }
//             .invoice-header { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
//             .meta { margin: 10px 0; }
//             .meta span { display:inline-block; min-width:140px; font-weight:600; }
//             table { width:100%; border-collapse:collapse; margin-top:20px; }
//             th, td { border:1px solid #ddd; padding:8px; text-align:left; }
//             th { background:#f4f4f4; }
//             .total { font-weight:bold; }
//           </style>
//         </head>
//         <body>${printContents}</body>
//       </html>
//     `);
//     printWindow.document.close();
//     printWindow.print();
//   };

//   return (
//     <div className="billing-page" style={{ padding: "1rem", background: "#f9fafc" }}>
//       <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
//         Billing & Invoices
//       </h1>

//       {/* Orders grid */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
//           gap: "1rem",
//           marginBottom: "1.5rem",
//         }}
//       >
//         {loading ? (
//           <p>Loading...</p>
//         ) : orders.length === 0 ? (
//           <span style={{ color: "#888" }}>No served orders today</span>
//         ) : (
//           orders.map((order) => {
//             const tableName = tablesMap[order.table_id];
//             const servedTime = parseDbDate(order.created_at);
//             const orderTotal = enrichItems(order).reduce(
//               (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
//               0
//             );
//             return (
//               <div
//                 key={order.id}
//                 style={{
//                   padding: "1rem",
//                   background: "#fff",
//                   borderRadius: "10px",
//                   boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
//                   border:
//                     selectedOrder?.id === order.id
//                       ? "2px solid #0d6efd"
//                       : "1px solid #eee",
//                   cursor: "pointer",
//                 }}
//                 onClick={() =>
//                   setSelectedOrder({ ...order, items: enrichItems(order) })
//                 }
//               >
//                 <h3 style={{ margin: 0 }}>{tableName || `Table ${order.table_id}`}</h3>
//                 <p style={{ margin: "0.25rem 0", color: "#555" }}>
//                   Order #{order.id}
//                 </p>
//                 <p style={{ fontWeight: 700 }}>₹{orderTotal.toFixed(2)}</p>
//                 <small style={{ color: "#666" }}>
//                   Served at:{" "}
//                   {servedTime &&
//                     servedTime.toLocaleTimeString([], {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     })}
//                 </small>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* Invoice / Bill */}
//       {selectedOrder && (
//         <div
//           style={{
//             display: "flex",
//             flexWrap: "wrap",
//             gap: "1.5rem",
//           }}
//         >
//           {/* Left: Invoice Content */}
//           <div
//             ref={invoiceRef}
//             style={{
//               flex: "1 1 600px",
//               background: "#fff",
//               padding: "1.5rem",
//               borderRadius: "10px",
//               boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
//             }}
//           >
//             <div className="invoice-header">Invoice</div>
//             <div className="meta">
//               <span>Client ID:</span> {clientId}
//             </div>
//             <div className="meta">
//               <span>Order ID:</span> {selectedOrder.id}
//             </div>
//             <div className="meta">
//               <span>Table:</span>{" "}
//               {tablesMap[selectedOrder.table_id] || selectedOrder.table_id}
//             </div>
//             <div className="meta">
//               <span>Date:</span> {new Date().toLocaleDateString()}
//             </div>
//             <div className="meta">
//               <span>Status:</span> {paymentStatus}
//             </div>

//             <table>
//               <thead>
//                 <tr>
//                   <th>Item</th>
//                   <th>Qty</th>
//                   <th>Unit Price</th>
//                   <th>Total</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {selectedOrder.items.map((item) => (
//                   <tr key={item.item_id}>
//                     <td>{item.name}</td>
//                     <td>{item.quantity}</td>
//                     <td>₹{item.unit_price.toFixed(2)}</td>
//                     <td>₹{(item.unit_price * item.quantity).toFixed(2)}</td>
//                   </tr>
//                 ))}
//                 <tr>
//                   <td colSpan="3" className="total">
//                     Subtotal
//                   </td>
//                   <td>₹{subtotal.toFixed(2)}</td>
//                 </tr>
//                 <tr>
//                   <td colSpan="3">Discount</td>
//                   <td>-₹{discountAmount.toFixed(2)}</td>
//                 </tr>
//                 <tr>
//                   <td colSpan="3">GST</td>
//                   <td>₹{taxAmount.toFixed(2)}</td>
//                 </tr>
//                 <tr>
//                   <td colSpan="3" className="total">
//                     Total
//                   </td>
//                   <td>₹{total.toFixed(2)}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>

//           {/* Right: Actions */}
//           <div
//             style={{
//               flex: "0 1 320px",
//               background: "#fff",
//               padding: "1.5rem",
//               borderRadius: "10px",
//               boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
//               alignSelf: "flex-start",
//             }}
//           >
//             <h3 style={{ marginBottom: "1rem" }}>Actions</h3>
//             <div style={{ marginBottom: "1rem" }}>
//               <label>GST (%)</label>
//               <input
//                 type="number"
//                 value={taxPercent}
//                 onChange={(e) => setTaxPercent(Number(e.target.value))}
//                 style={{ width: "100%", marginTop: "0.25rem", padding: "0.5rem" }}
//               />
//             </div>
//             <div style={{ marginBottom: "1rem" }}>
//               <label>
//                 Discount {discountIsPercent ? "(%)" : "(₹)"}
//               </label>
//               <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
//                 <input
//                   type="number"
//                   value={discount}
//                   onChange={(e) => setDiscount(Number(e.target.value))}
//                   style={{ flex: 1, padding: "0.5rem" }}
//                 />
//                 <select
//                   value={discountIsPercent ? "%" : "₹"}
//                   onChange={(e) => setDiscountIsPercent(e.target.value === "%")}
//                   style={{ padding: "0.5rem" }}
//                 >
//                   <option value="%">%</option>
//                   <option value="₹">₹</option>
//                 </select>
//               </div>
//             </div>

//             <div style={{ marginBottom: "1rem" }}>
//               <label>Payment Status</label>
//               <select
//                 value={paymentStatus}
//                 onChange={(e) => setPaymentStatus(e.target.value)}
//                 style={{ width: "100%", marginTop: "0.25rem", padding: "0.5rem" }}
//               >
//                 {paymentStatuses.map((s) => (
//                   <option key={s} value={s}>
//                     {s}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <button
//               onClick={saveInvoice}
//               disabled={saving}
//               style={{
//                 width: "100%",
//                 padding: "0.75rem",
//                 background: "#0d6efd",
//                 color: "#fff",
//                 border: "none",
//                 borderRadius: "6px",
//                 marginBottom: "0.5rem",
//                 cursor: "pointer",
//               }}
//             >
//               {saving
//                 ? "Saving..."
//                 : buttonLabels[paymentStatus] || "Save Bill"}
//             </button>
//             <button
//               onClick={printInvoice}
//               style={{
//                 width: "100%",
//                 padding: "0.75rem",
//                 background: "#198754",
//                 color: "#fff",
//                 border: "none",
//                 borderRadius: "6px",
//                 cursor: "pointer",
//               }}
//             >
//               Print Invoice
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




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




import React, { useEffect, useState, useRef } from "react";
import orderServices from "../../Backend_Port_Files/OrderServices";
import tableServices from "../../Backend_Port_Files/TableServices";
import inventoryServices from "../../Backend_Port_Files/InventoryServices";
import invoiceServices from "../../Backend_Port_Files/InvoiceServices";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";

export default function BillingPage() {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  const [orders, setOrders] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [inventoryMap, setInventoryMap] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [taxPercent, setTaxPercent] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [status, setStatus] = useState("Draft");
  const [discountIsPercent, setDiscountIsPercent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceDraftId, setInvoiceDraftId] = useState(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState([{ method: "Cash", amount: 0 }]);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [editingSplitIndex, setEditingSplitIndex] = useState(null);
  const [singlePaymentAmount, setSinglePaymentAmount] = useState(0);

  const invoiceRef = useRef(null);

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
        (tablesRes.data?.data || []).forEach(
          (t) => (tMap[t.id] = t.name || t.table_number || `Table ${t.id}`)
        );
        setTablesMap(tMap);
        const iMap = {};
        (invRes.data?.data || []).forEach((i) => (iMap[i.id] = i));
        setInventoryMap(iMap);
      } catch {
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
        params: { client_id: clientId, status: "Draft" },
      });
      const drafts = res.data?.data || [];
      const draft = drafts.find((d) => d.order_id?.toString() === orderId?.toString());
      return draft || {};
    } catch (err) {
      console.error("Failed to fetch invoice draft", err);
      return {};
    }
  };

  const enrichItems = (order) =>
    (order.items || []).map((item) => {
      const inv = inventoryMap[item.item_id] || {};
      return {
        ...item,
        unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
        description: item.description ?? inv.description ?? "",
        name: item.item_name ?? inv.name ?? "Unnamed Item",
      };
    });

  const subtotal =
    selectedOrder?.items?.reduce(
      (sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
      0
    ) || 0;
  const taxAmount = (taxPercent / 100) * subtotal;
  const discountAmount = discountIsPercent ? (discount / 100) * subtotal : discount;
  const total = Number((subtotal + taxAmount - discountAmount).toFixed(2));

  // --- Split Payment functions ---

  // Sum all split amounts
  const sumSplits = (splits) =>
    splits.reduce((sum, s) => sum + Number(s.amount), 0);

  // Update split amount and keep total in sync
  const updateSplitAmount = (index, value) => {
    let newAmount = Number(value);
    if (isNaN(newAmount) || newAmount < 0) newAmount = 0;

    let splits = [...paymentSplits];
    splits[index].amount = newAmount;

    // When editing any split, set last split to remainder
    if (splits.length > 1) {
      const sumOthers = splits
        .filter((_, idx) => idx !== splits.length - 1)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      let remainder = Number((total - sumOthers).toFixed(2));
      splits[splits.length - 1].amount = remainder >= 0 ? remainder : 0;
    }

    // Prevent overpayment by reducing fields if necessary
    let sumTotal = sumSplits(splits);
    while (sumTotal > total) {
      // Reduce last field until total aligns
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

  // Add new split with remaining balance
  const addSplitRow = () => {
    let used = sumSplits(paymentSplits);
    let remainder = Number((total - used).toFixed(2));
    setPaymentSplits((prev) => [
      ...prev,
      { method: "Cash", amount: remainder >= 0 ? remainder : 0 }
    ]);
    setBalanceAmount(Number((0).toFixed(2)));
  };

  // Remove a split and re-distribute
  const removeSplitRow = (index) => {
    if (paymentSplits.length <= 1) return;
    let updated = paymentSplits.filter((_, idx) => idx !== index);
    let sum = sumSplits(updated);
    let remainder = Number((total - sum).toFixed(2));
    if (updated.length > 0) updated[updated.length - 1].amount += remainder;
    setPaymentSplits(updated);
    setBalanceAmount(Number((total - sumSplits(updated)).toFixed(2)));
  };

  // On blur, re-calculate last split
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

  const updateSplitMethod = (index, newMethod) => {
    setPaymentSplits((prevSplits) => {
      const updated = [...prevSplits];
      updated[index].method = newMethod;
      return updated;
    });
  };

  useEffect(() => {
    if (!splitPaymentEnabled) {
      setSinglePaymentAmount(total);
      setBalanceAmount(Number((singlePaymentAmount - total).toFixed(2)));
    } else {
      // When switching to split, auto fill the entire amount in the first split
      setPaymentSplits([{ method: "Cash", amount: total }]);
      setBalanceAmount(0);
    }
    // eslint-disable-next-line
  }, [total, splitPaymentEnabled]);

  const onSinglePaymentAmountChange = (val) => {
    let amount = Number(val);
    if (isNaN(amount) || amount < 0) amount = 0;
    setSinglePaymentAmount(amount);
    setBalanceAmount(Number((amount - total).toFixed(2)));
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
      const sumPayments = paymentSplits.reduce((sum, p) => sum + p.amount, 0);
      if (Number(sumPayments.toFixed(2)) !== Number(total.toFixed(2))) {
        toast.error("Split payment amounts do not sum up to the total");
        return;
      }
    } else {
      if (singlePaymentAmount < total || isNaN(singlePaymentAmount)) {
        toast.error("Payment amount should be equal or greater than total");
        return;
      }
    }
const paymentMethodString = splitPaymentEnabled
  ? paymentSplits
      .map((p) => `${p.method}(${Number(p.amount).toFixed(2)})`)
      .join(' & ')
  : `${method}(${Number(singlePaymentAmount).toFixed(2)})`;


    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        document_type: "Invoice",
        document_date: new Date().toISOString(),
        order_id: selectedOrder.id.toString(),
        reference_number: tablesMap[selectedOrder.table_id] || `Table ${selectedOrder.table_id}`,
        subtotal: Number(subtotal.toFixed(2)),
        tax_amount: Number(taxAmount.toFixed(2)),
        discount_amount: Number(discountAmount.toFixed(2)),
        total_amount: Number(total.toFixed(2)),
        payment_status: paymentStatus,
       payment_method: paymentMethodString, 
       payment_splits: splitPaymentEnabled
    ? paymentSplits.map(({ method, amount }) => ({
        method,
        amount: Number(amount.toFixed(2))
      }))
    : null,
        single_payment_amount: splitPaymentEnabled ? null : Number(singlePaymentAmount.toFixed(2)),
        status: status,
        customer_id: customerId || "",
        contact_email: contactEmail || "",
        contact_phone: contactPhone || "",
      };

      let draftId = invoiceDraftId;

      if (!draftId) {
        const res = await invoiceServices.post(`/${clientId}/invoice/create_document`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        draftId = res?.data?.data?.id;
        if (!draftId) throw new Error("Draft creation failed");
        setInvoiceDraftId(draftId);
      } else {
        await invoiceServices.post(
          `/${clientId}/invoice/update_document`,
          { id: draftId, ...payload },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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

  const printInvoice = async () => {
    if (!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0) return;

    try {
      const draftId = invoiceDraftId || (await saveInvoiceDraft());
      if (!draftId) return toast.error("Failed to create invoice draft");

      await invoiceServices.post(
        `/${clientId}/invoice/generate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { client_id: clientId, invoice_id: draftId },
        }
      );

      const issueRes = await invoiceServices.post(
        `/${clientId}/invoice/issue`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { client_id: clientId, invoice_id: draftId },
        }
      );

      const docNum = issueRes?.data?.data?.document_number || "";
      setDocumentNumber(docNum);

      setTimeout(() => {
        if (!invoiceRef.current) return;

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4",
        });

        pdf.html(invoiceRef.current, {
          callback: (doc) => {
            doc.save(`Invoice_${draftId}.pdf`);
          },
          margin: [40, 40, 40, 40],
          autoPaging: "text",
          x: 0,
          y: 0,
          windowWidth: 800,
        });
      }, 100);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate invoice PDF");
    }
  };

  return (
    <div
      className="billing-page"
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: "2rem",
        background: "#f3f6fb",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "#0747a6",
          marginBottom: "2rem",
          borderBottom: "3px solid #0747a6",
          paddingBottom: "0.5rem",
        }}
      >
        Billing & Invoices
      </h1>
      {/* Orders Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "1.5rem",
          marginBottom: "3rem",
        }}
      >
        {loading ? (
          <p style={{ color: "#555", fontStyle: "italic" }}>Loading...</p>
        ) : orders.length === 0 ? (
          <p style={{ color: "#888", fontStyle: "italic" }}>No served orders today</p>
        ) : (
          orders.map((order) => {
            const tableName = tablesMap[order.table_id];
            const servedTime = new Date(order.created_at);
            const orderTotal = enrichItems(order).reduce(
              (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
              0
            );
            return (
              <div
                key={order.id}
                onClick={async () => {
                  const enrichedItems = enrichItems(order);
                  const invoiceDraft = await fetchInvoiceDraft(order.id);
                  setCustomerId(invoiceDraft.customer_id || "");
                  setContactEmail(invoiceDraft.contact_email || "");
                  setContactPhone(invoiceDraft.contact_phone || "");
                  setInvoiceDraftId(invoiceDraft.id || null);
                  setStatus(invoiceDraft.status || "Draft");
                  setSelectedOrder({ ...order, items: enrichedItems });
                  setDocumentNumber(invoiceDraft.document_number || "");
                  setPaymentStatus(invoiceDraft.payment_status || "Pending");

                  if (invoiceDraft.payment_splits && invoiceDraft.payment_splits.length > 0) {
                    setSplitPaymentEnabled(true);
                    setPaymentSplits(
                      invoiceDraft.payment_splits.map((split) => ({
                        method: split.method || "Cash",
                        amount: split.amount || 0,
                      }))
                    );
                    setBalanceAmount(total - sumSplits(invoiceDraft.payment_splits));
                  } else {
                    setSplitPaymentEnabled(false);
                    setPaymentSplits([{ method: "Cash", amount: total }]);
                    setMethod(invoiceDraft.payment_method || "Cash");
                    setSinglePaymentAmount(invoiceDraft.single_payment_amount || total);
                    setBalanceAmount((invoiceDraft.single_payment_amount || total) - total);
                  }
                }}
                style={{
                  padding: "1.5rem",
                  background: selectedOrder?.id === order.id ? "#dce6fb" : "#ffffff",
                  borderRadius: "12px",
                  boxShadow:
                    selectedOrder?.id === order.id
                      ? "0 0 10px rgba(7, 71, 166, 0.3)"
                      : "0 2px 6px rgba(0,0,0,0.1)",
                  border: selectedOrder?.id === order.id ? "2px solid #0747a6" : "1px solid #ccd6f6",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <h3 style={{ margin: "0 0 0.2rem 0", color: "#0747a6" }}>
                  {tableName || `Table ${order.table_id}`}
                </h3>
                <p style={{ margin: "0 0 0.4rem 0", fontWeight: "600", color: "#0f172a" }}>
                  Order #{order.id}
                </p>
                <p
                  style={{
                    fontWeight: 700,
                    color: "#0747a6",
                    fontSize: "1.2rem",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  ₹{orderTotal.toFixed(2)}
                </p>
                <small style={{ color: "#64748b" }}>
                  Served at:{" "}
                  {servedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </small>
              </div>
            );
          })
        )}
      </div>
      {/* Invoice Section */}
      {selectedOrder && (
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          {/* Left - Invoice Preview */}
          <section
            ref={invoiceRef}
            style={{
              fontFamily: "'Arial', sans-serif",
              background: "#ffffff",
              padding: "40px",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(7, 71, 166, 0.2)",
              color: "#024E89",
              maxWidth: "700px",
              margin: "auto",
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "3px solid #0747a6",
                paddingBottom: "10px",
                marginBottom: "30px",
              }}
            >
              <h1 style={{ fontWeight: "700", fontSize: "32px", margin: 0 }}>INVOICE</h1>
              <div>
                <div style={{ fontSize: "14px", color: "#4a90e2", fontWeight: "600" }}>
                  {documentNumber || "Draft"}
                </div>
                <div style={{ fontSize: "12px", marginTop: "6px", color: "#7b8ea2" }}>
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </header>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "6px",
                marginBottom: "30px",
              }}
            >
              <span
                style={{ color: "darkblue", fontFamily: "cursive", fontSize: "20px", textAlign: "center" }}
              >
                {clientId}
              </span>
            </div>
            <section
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "30px",
              }}
            >
              <div style={{ width: "45%" }}>
                <h2
                  style={{
                    fontWeight: "700",
                    fontSize: "18px",
                    marginBottom: "10px",
                    borderBottom: "1.5px solid #024E89",
                  }}
                >
                  Bill To:
                </h2>
                <p style={{ margin: "0", fontWeight: "600", fontSize: "12px" }}>{customerId || "N/A"}</p>
                <p style={{ margin: "0", color: "#49657a", fontSize: "12px" }}>{contactEmail}</p>
              </div>
              <div style={{ width: "45%", textAlign: "right" }}>
                <h2
                  style={{
                    fontWeight: "700",
                    fontSize: "18px",
                    marginBottom: "10px",
                    borderBottom: "1.5px solid #024E89",
                  }}
                >
                  Shipping Info:
                </h2>
                <p style={{ margin: "0", fontWeight: "600" }}>
                  {tablesMap[selectedOrder?.table_id] || "N/A"}
                </p>
                <p style={{ margin: "0", color: "#49657a", fontSize: "12px" }}>
                  Contact: {contactPhone}
                </p>
              </div>
            </section>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "#024E89" }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid #024E89",
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  <th style={{ padding: "10px 5px", textAlign: "left" }}>Item</th>
                  <th style={{ padding: "10px 5px", textAlign: "right" }}>Quantity</th>
                  <th style={{ padding: "10px 5px", textAlign: "right" }}>Unit Price</th>
                  <th style={{ padding: "10px 5px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder?.items?.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #bfcfe8" }}>
                    <td style={{ padding: "10px 5px" }}>{item.name}</td>
                    <td style={{ padding: "10px 5px", textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ padding: "10px 5px", textAlign: "right" }}>
                      ₹{item.unit_price.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 5px", textAlign: "right" }}>
                      ₹{(item.unit_price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: "600", fontSize: "16px" }}>
                  <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>
                    Subtotal
                  </td>
                  <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{subtotal.toFixed(2)}</td>
                </tr>
                <tr style={{ fontWeight: "600", fontSize: "16px" }}>
                  <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>
                    Discount
                  </td>
                  <td style={{ padding: "10px 5px", textAlign: "right" }}>
                    -₹{discountAmount.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ fontWeight: "600", fontSize: "16px" }}>
                  <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>
                    GST
                  </td>
                  <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{taxAmount.toFixed(2)}</td>
                </tr>
                <tr
                  style={{
                    borderTop: "3px solid #0747a6",
                    fontWeight: "900",
                    fontSize: "18px",
                    color: "#0747a6",
                  }}
                >
                  <td colSpan="3" style={{ padding: "10px 5px", textAlign: "right" }}>
                    Total
                  </td>
                  <td style={{ padding: "10px 5px", textAlign: "right" }}>₹{total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <footer
              style={{
                marginTop: "30px",
                fontSize: "12px",
                color: "#64748b",
                borderTop: "1px solid #dbeafe",
                paddingTop: "15px",
              }}
            >
              <p>Thank you for your business!</p>
              <p>This is a computer-generated invoice and does not require a signature.</p>
            </footer>
          </section>
          {/* Right - Actions Panel */}
          <aside
            style={{
              flex: "0 1 360px",
              backgroundColor: "#ffffff",
              padding: "2rem",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(7,71,166,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              height: "fit-content",
            }}
          >
            <h3 style={{ marginBottom: "1rem", color: "#0747a6" }}>Actions</h3>
            <div>
              <label style={{ fontWeight: "600", color: "#334155" }}>GST (%)</label>
              <input
                type="number"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>
            <div>
              <label style={{ fontWeight: "600", color: "#334155" }}>
                Discount {discountIsPercent ? "(%)" : "(₹)"}
              </label>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                  }}
                />
                <select
                  value={discountIsPercent ? "%" : "₹"}
                  onChange={(e) => setDiscountIsPercent(e.target.value === "%")}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <option value="%">%</option>
                  <option value="₹">₹</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontWeight: "600", color: "#334155" }}>Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              >
                {["Pending", "Paid", "Partial", "Due"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {/* Split Payment Toggle */}
            <div>
              <label style={{ fontWeight: "600", color: "#334155" }}>
                <input
                  type="checkbox"
                  checked={splitPaymentEnabled}
                  onChange={() => {
                    setSplitPaymentEnabled(!splitPaymentEnabled);
                    if (!splitPaymentEnabled) {
                      setPaymentSplits([{ method: "Cash", amount: total }]);
                      setBalanceAmount(0);
                    } else {
                      setMethod("Cash");
                      setPaymentSplits([{ method: "Cash", amount: total }]);
                      setSinglePaymentAmount(total);
                      setBalanceAmount(0);
                    }
                  }}
                  style={{ marginRight: "0.5rem" }}
                />
                Enable Split Payment
              </label>
            </div>
            {splitPaymentEnabled ? (
              <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                {paymentSplits.map((split, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={split.method}
                      onChange={(e) => updateSplitMethod(idx, e.target.value)}
                      style={{
                        flex: "1 1 50%",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {["Cash", "UPI", "Card", "Due"].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={split.amount}
                      onChange={(e) => updateSplitAmount(idx, e.target.value)}
                      onBlur={() => onSplitAmountBlur(idx)}
                      placeholder={
                        split.amount === 0
                          ? idx === paymentSplits.length - 1
                            ? Number(
                                (
                                  total -
                                  paymentSplits
                                    .filter((_, i) => i !== paymentSplits.length - 1)
                                    .reduce((sum, s) => sum + Number(s.amount), 0)
                                ).toFixed(2)
                              )
                            : ""
                          : ""
                      }
                      style={{
                        flex: "1 1 40%",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeSplitRow(idx)}
                      aria-label={`Remove payment split ${idx + 1}`}
                      style={{
                        backgroundColor: "#e53e3e",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0 0.75rem",
                        cursor: paymentSplits.length > 1 ? "pointer" : "not-allowed",
                        opacity: paymentSplits.length > 1 ? 1 : 0.5,
                        fontWeight: "700",
                        fontSize: "1.2rem",
                      }}
                      disabled={paymentSplits.length <= 1}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSplitRow}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  + Add Payment Method
                </button>
                <p style={{ marginTop: "0.5rem", fontWeight: "600", color: "#334155" }}>
                  Balance: ₹
                  {balanceAmount < 0
                    ? (-balanceAmount).toFixed(2) + " remaining"
                    : balanceAmount.toFixed(2) + " change"}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="payment-method"
                    className="input-label"
                    style={{ fontWeight: 600, color: "#334155" }}
                  >
                    Payment Method
                  </label>
                  <select
                    id="payment-method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="input-field"
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      marginTop: "0.25rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {["Cash", "UPI", "Card", "Due"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: "600", color: "#334155" }}>Amount Given</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singlePaymentAmount}
                    onChange={(e) => onSinglePaymentAmountChange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      marginTop: "0.25rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                    }}
                    placeholder="Enter amount received"
                  />
                </div>
                <p style={{ marginTop: "0.5rem", fontWeight: "600", color: "#334155" }}>
                  Balance: ₹
                  {balanceAmount < 0
                    ? (-balanceAmount).toFixed(2) + " remaining"
                    : balanceAmount.toFixed(2) + " change"}
                </p>
              </>
            )}
            <div>
              <label style={{ fontWeight: "600", color: "#334155" }}>Invoice Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              >
                {["Draft", "Created", "Pending", "Issued", "Cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: "600", color: "#334155" }}>Customer ID</label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>
            <div>
              <label style={{ fontWeight: "600", color: "#334155" }}>Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>
            <div>
              <label style={{ fontWeight: "600", color: "#334155" }}>Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>
            <button
              onClick={saveInvoiceDraft}
              disabled={saving}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#0747a6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 6px rgba(7,71,166,0.4)",
                transition: "background-color 0.3s ease",
                marginBottom: "0.75rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0a549f")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0747a6")}
            >
              {saving ? "Saving..." : "Save Bill"}
            </button>
            <button
              onClick={printInvoice}
              disabled={!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#147d4c",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                cursor:
                  !selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  !selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0 ? 0.6 : 1,
                boxShadow: "0 4px 6px rgba(20,125,76,0.4)",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => {
                if (!(!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0)) {
                  e.currentTarget.style.backgroundColor = "#176f41";
                }
              }}
              onMouseLeave={(e) => {
                if (!(!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0)) {
                  e.currentTarget.style.backgroundColor = "#147d4c";
                }
              }}
            >
              Download PDF / Print
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
