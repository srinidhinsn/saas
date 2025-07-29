// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// const BillingPage = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");

//     const [records, setRecords] = useState([]);
//     const [selectedId, setSelectedId] = useState(null);
//     const [formData, setFormData] = useState({
//         id: null,
//         customer_name: "",
//         date: "",
//         amount: 0,
//         description: "",
//         document_type: "Invoice",
//         status: "Pending"
//     });

//     const baseURL = `http://localhost:8005/saas/${clientId}/tables`;

//     const headers = {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json"
//     };

//     const fetchRecords = async () => {
//         try {
//             const res = await axios.get(`${baseURL}/read`, { headers });
//             setRecords(res.data.data || []);
//         } catch (err) {
//             toast.error("Failed to fetch billing documents");
//         }
//     };

//     const fetchById = async (id) => {
//         try {
//             const res = await axios.get(`${baseURL}/read/${id}`, { headers });
//             const data = res.data.data;
//             setSelectedId(id);
//             setFormData(data);
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
//         try {
//             if (selectedId) {
//                 await axios.post(`${baseURL}/update`, formData, { headers });
//                 toast.success("Billing document updated");
//             } else {
//                 const payload = {
//                     billing: {
//                         ...formData,
//                         id: undefined, // Don't send ID on create
//                         client_id: clientId
//                     },
//                     items: [] // Backend expects items, even empty
//                 };
//                 await axios.post(`${baseURL}/create`, payload, { headers });
//                 toast.success("Billing document created");
//             }
//             setFormData({
//                 id: null,
//                 customer_name: "",
//                 date: "",
//                 amount: 0,
//                 description: "",
//                 document_type: "Invoice",
//                 status: "Pending"
//             });
//             setSelectedId(null);
//             fetchRecords();
//         } catch (err) {
//             toast.error("Failed to submit document");
//         }
//     };

//     const handleDelete = async (id) => {
//         try {
//             await axios.post(`${baseURL}/delete`, { id }, { headers });
//             toast.success("Billing document deleted");
//             fetchRecords();
//         } catch (err) {
//             toast.error("Error deleting document");
//         }
//     };

//     useEffect(() => {
//         fetchRecords();
//     }, []);

//     return (
//         <div className="billing-page">
//             <h2>Billing Manager</h2>
//             <form onSubmit={handleSubmit}>
//                 <input
//                     type="text"
//                     name="customer_name"
//                     placeholder="Customer Name"
//                     value={formData.customer_name}
//                     onChange={handleChange}
//                     required
//                 />
//                 <input
//                     type="date"
//                     name="date"
//                     placeholder="Date"
//                     value={formData.date}
//                     onChange={handleChange}
//                 />
//                 <input
//                     type="number"
//                     name="amount"
//                     placeholder="Amount"
//                     value={formData.amount}
//                     onChange={handleChange}
//                 />
//                 <input
//                     type="text"
//                     name="description"
//                     placeholder="Description"
//                     value={formData.description}
//                     onChange={handleChange}
//                 />
//                 <select name="document_type" value={formData.document_type} onChange={handleChange}>
//                     <option value="Invoice">Invoice</option>
//                     <option value="Receipt">Receipt</option>
//                 </select>
//                 <select name="status" value={formData.status} onChange={handleChange}>
//                     <option value="Pending">Pending</option>
//                     <option value="Paid">Paid</option>
//                 </select>
//                 <button type="submit">{selectedId ? "Update" : "Create"}</button>
//             </form>

//             <ul>
//                 {records.map((doc) => (
//                     <li key={doc.id}>
//                         <strong>{doc.customer_name}</strong> - ₹{doc.amount} on {doc.date} ({doc.document_type})
//                         <button onClick={() => fetchById(doc.id)}>Edit</button>
//                         <button onClick={() => handleDelete(doc.id)}>Delete</button>
//                     </li>
//                 ))}
//             </ul>
//         </div>
//     );
// };

// export default BillingPage;

// 


//


import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

const BillingPage = () => {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);

    const [records, setRecords] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({

        document_type: "Invoice",
        document_number: "",
        document_date: "",
        customer_id: "",
        status: "Draft",
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        contact_email: "",
        contact_phone: "",
        notes: "",
        order_id: "",
        table_id: ""
    });


    const baseURL = `http://localhost:8005/saas/${clientId}/tables`;

    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    const fetchRecords = async () => {
        try {
            const res = await axios.get(`${baseURL}/read`, { headers });
            setRecords(res.data.data || []);
        } catch (err) {
            toast.error("Failed to fetch billing documents");
        }
    };

    const fetchById = async (id) => {
        try {
            const res = await axios.get(`${baseURL}/read/${id}`, { headers });
            const data = res.data.data;

            // Format date to "yyyy-MM-dd"
            const formattedDate = data.document_date?.split("T")[0] || "";

            setFormData({
                id: data.id,
                document_type: data.document_type || "Invoice",
                document_number: data.document_number || "",
                document_date: formattedDate,
                customer_id: data.customer_id || "",
                status: data.status || "Draft",
                subtotal: data.subtotal || 0,
                tax_amount: data.tax_amount || 0,
                discount_amount: data.discount_amount || 0,
                total_amount: data.total_amount || 0,
                contact_email: data.contact_email || "",
                contact_phone: data.contact_phone || "",
                notes: data.notes || "",
                order_id: data.order_id || "",
                table_id: data.table_id || "",
            });


            setSelectedId(id);
        } catch (err) {
            toast.error("Error fetching document by ID");
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.document_number || !formData.document_date || !formData.order_id) {
            toast.error("Please fill all the required fields!");
            return;
        }

        const isUpdate = selectedId !== null || formData.id;

        if (!isUpdate) {
            // If creating and missing required info
            const requiredFields = ["document_number", "document_date", "order_id"];
            for (let field of requiredFields) {
                if (!formData[field]) {
                    toast.error(`Missing required field: ${field}`);
                    return;
                }
            }
        }

        try {
            const payload = isUpdate
                ? { ...formData, id: selectedId || formData.id }
                : {
                    billing: {
                        ...formData,
                        id: undefined,
                        client_id: clientId
                    },
                    items: []
                };

            console.log("Payload for Create Table:", payload);
            const endpoint = isUpdate ? "update" : "create";
            const response = await axios.post(
                `${baseURL}/${endpoint}?client_id=${clientId}`,
                payload,
                { headers }
            );

            if (response.status === 200) {
                toast.success(`Billing document ${isUpdate ? "updated" : "created"}`);
                setFormData({
                    document_type: "Invoice",
                    document_number: "",
                    document_date: "",
                    customer_id: "",
                    status: "Draft",
                    subtotal: 0,
                    tax_amount: 0,
                    discount_amount: 0,
                    total_amount: 0,
                    contact_email: "",
                    contact_phone: "",
                    notes: "",
                    order_id: "",
                    table_id: "",
                });
                setSelectedId(null);
                fetchRecords();
            } else {
                toast.error("Failed to submit document: " + response?.data?.message || "Unknown error");
            }
        } catch (err) {
            console.error("Error submitting:", err?.response?.data || err.message);
            toast.error("Failed to submit document: " + (err?.response?.data?.message || err.message));
        }
    };





    const handleDelete = async (id) => {
        try {
            await axios.post(`${baseURL}/delete`, { id }, { headers });
            toast.success("Billing document deleted");
            fetchRecords();
        } catch (err) {
            toast.error("Error deleting document");
        }
    };
    const fetchOrders = async () => {
        try {
            const response = await axios.get(
                `http://localhost:8003/saas/${clientId}/dinein/table`,
                { headers }
            );
            setOrders(response.data.data || []);
        } catch (err) {
            toast.error("Failed to fetch orders");
        }
    };

    useEffect(() => {
        fetchRecords(); fetchOrders(); fetchTables()
    }, []);
    const fetchTables = async () => {
        try {
            const res = await axios.get(`http://localhost:8001/saas/${clientId}/tables/read`, { headers });
            setTables(res.data.data || []);
        } catch (err) {
            toast.error("Failed to fetch tables");
        }
    };

    return (
        <div className="billing-page">
            <h2>Billing Manager</h2>
            <form onSubmit={handleSubmit} className="billing-form">
                <div className="form-group">
                    <label className="filled">Select Order</label>
                    <select
                        onChange={(e) => {
                            const tableId = parseInt(e.target.value);

                            const latestOrder = orders
                                .filter((order) => order.table_id === tableId)
                                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

                            if (latestOrder) {
                                let subtotal = 0;
                                let tax = 0;
                                let discount = 0;

                                latestOrder.items.forEach((item) => {
                                    const price = item.price || 0;
                                    const qty = item.quantity || 1;
                                    const gst = item.gst || 0;
                                    const dis = item.discount || 0;

                                    const itemTotal = price * qty;
                                    subtotal += itemTotal;
                                    tax += gst;
                                    discount += dis;
                                });

                                setFormData((prev) => ({
                                    ...prev,
                                    order_id: String(latestOrder.id),
                                    table_id: latestOrder.table_id,
                                    subtotal,
                                    tax_amount: tax,
                                    discount_amount: discount,
                                    total_amount: latestOrder.total_price || 0,
                                }));

                                console.log("Selected table:", latestOrder.table_id);
                            }
                        }}
                    >
                        <option value="">Select Table</option>
                        {[...new Set(orders.map((o) => o.table_id))].map((tid) => {
                            const table = tables.find((t) => t.id === tid);
                            return (
                                <option key={tid} value={tid}>
                                    {table ? table.name : `Table ${tid}`}
                                </option>
                            );
                        })}
                    </select>


                </div>

                {[
                    { name: "document_type", type: "text", label: "Document Type" },
                    { name: "document_number", type: "text", label: "Document Number" },
                    { name: "document_date", type: "date", label: "Document Date" },
                    { name: "customer_id", type: "text", label: "Customer ID" },
                    { name: "subtotal", type: "number", label: "Subtotal" },
                    { name: "tax_amount", type: "number", label: "Tax Amount" },
                    { name: "discount_amount", type: "number", label: "Discount Amount" },
                    { name: "total_amount", type: "number", label: "Total Amount" },
                    { name: "contact_email", type: "email", label: "Contact Email" },
                    { name: "contact_phone", type: "text", label: "Contact Phone" },
                ].map(field => (
                    <div className="form-group" key={field.name}>
                        <input
                            type={field.type}
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleChange}
                            required={field.name === "document_type" || field.name === "document_number" || field.name === "document_date"}
                        />
                        <label className={formData[field.name] ? "filled" : ""}>{field.label}</label>
                    </div>
                ))}

                <div className="form-group">
                    <select name="status" value={formData.status} onChange={handleChange}>
                        <option value="Draft">Draft</option>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                    </select>
                    <label className="filled">Status</label>
                </div>

                <div className="form-group">
                    <textarea name="notes" value={formData.notes} onChange={handleChange} required />
                    <label className={formData.notes ? "filled" : ""}>Notes</label>
                </div>

                <button type="submit">{selectedId ? "Update" : "Create"}</button>
            </form>

            <ul className="billing-list">
                {records.map(doc => (
                    <li key={doc.id}>
                        <strong>{doc.document_type} #{doc.document_number}</strong> — ₹{doc.total_amount} on {doc.document_date?.slice(0, 10)}
                        <br />
                        <button onClick={() => fetchById(doc.id)}>Edit</button>
                        <button onClick={() => handleDelete(doc.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BillingPage;
