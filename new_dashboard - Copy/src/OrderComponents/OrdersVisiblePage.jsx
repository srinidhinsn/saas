// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../ThemeChangerComponent/ThemeContext";

// const OrdersVisiblePage = () => {
//     const [orders, setOrders] = useState([]);
//     const { darkMode } = useTheme();
//     const { clientId, tableId } = useParams(); // URL: /saas/:clientId/orders/:tableId (optional)

//     useEffect(() => {
//         document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
//     }, [darkMode]);

//     useEffect(() => {
//         const fetchOrders = async () => {
//             try {
//                 const response = await axios.get(
//                     `http://localhost:8003/saas/${clientId}/dinein/table`
//                 );
//                 const data = response.data || [];

//                 // Optional filter if tableId is present in URL
//                 const filtered = tableId
//                     ? data.filter((order) => order.table_id?.toString() === tableId)
//                     : data;

//                 setOrders(filtered);
//             } catch (error) {
//                 console.error("❌ Failed to fetch orders:", error.message);
//             }
//         };

//         if (clientId) {
//             fetchOrders();
//         }
//     }, [clientId, tableId]);

//     return (
//         <div className="orders-dashboard" style={{ padding: "1rem" }}>
//             <div className="orders-header" style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 marginBottom: "1rem"
//             }}>
//                 <h2 style={{ fontWeight: "bold" }}>Table Orders</h2>
//                 <div className="actions" style={{ display: "flex", gap: "0.5rem" }}>
//                     <button className="btn export">Export</button>
//                     <button className="btn create">Create Order</button>
//                 </div>
//             </div>

//             <div className="orders-table" style={{ overflowX: "auto" }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse" }}>
//                     <thead>
//                         <tr style={{ backgroundColor: darkMode ? "#333" : "#f0f0f0" }}>
//                             <th>#</th>
//                             <th>Table</th>
//                             <th>Date</th>
//                             <th>Customer</th>
//                             <th>Payment</th>
//                             <th>Total</th>
//                             <th>Items</th>
//                             <th>Status</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {orders.length === 0 ? (
//                             <tr>
//                                 <td colSpan="8" style={{ textAlign: "center", padding: "1rem" }}>
//                                     No orders found.
//                                 </td>
//                             </tr>
//                         ) : (
//                             orders.map((order, i) => (
//                                 <tr key={order.id || i} style={{ borderBottom: "1px solid #ccc" }}>
//                                     <td>{i + 1}</td>
//                                     <td>{order.table_name || "N/A"}</td>
//                                     <td>{new Date(order.created_at).toLocaleString()}</td>
//                                     <td>{order.customer_name || "-"}</td>
//                                     <td>{order.payment_method || "-"}</td>
//                                     <td>₹{order.total?.toFixed(2) || "0.00"}</td>
//                                     <td>{order.items?.length || 0}</td>
//                                     <td>{order.status || "-"}</td>
//                                 </tr>
//                             ))
//                         )}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };

// export default OrdersVisiblePage;

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../ThemeChangerComponent/ThemeContext";

// const OrdersVisiblePage = () => {
//     const { clientId } = useParams();
//     const [orders, setOrders] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);
//     const { darkMode } = useTheme();
//     const token = localStorage.getItem("access_token");
//     useEffect(() => {
//         document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
//     }, [darkMode]);

//     useEffect(() => {
//         const fetchOrders = async () => {

//             if (!token) {
//                 console.error("❌ Access token not found.");
//                 setLoading(false);
//                 return;
//             }

//             try {
//                 const response = await axios.get(
//                     `http://localhost:8003/saas/${clientId}/dinein/table`,
//                     {
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                         },
//                         params: {
//                             client_id: clientId,
//                         },
//                     }
//                 );

//                 console.log("✅ Orders:", response.data);
//                 setOrders(response.data?.data || []);
//                 setLoading(false);
//             } catch (error) {
//                 console.error("❌ Error fetching dine-in orders:", error);
//                 setLoading(false);
//             }
//         };

//         if (clientId) {
//             fetchOrders();
//         }
//     }, [clientId]);

//     const toggleExpand = (index) => {
//         setExpandedOrderIndex(index === expandedOrderIndex ? null : index);
//     };

//     const handleStatusChange = async (orderId, newStatus) => {
//         try {
//             await axios.post(
//                 `http://localhost:8003/saas/${clientId}/dinein/update`,
//                 {
//                     order_id: orderId,
//                     client_id: clientId,
//                     status: newStatus,
//                 },
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 }
//             );
//             setOrders((prev) =>
//                 prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
//             );
//         } catch (err) {
//             console.error("Failed to update status", err);
//         }
//     };

//     return (
//         <div style={{ padding: "1rem" }}>
//             <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
//                 <div style={{
//                     display: "flex",
//                     flexWrap: "wrap",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "1.5rem"
//                 }}>
//                     <h2 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Table Orders</h2>
//                     <div style={{ display: "flex", gap: "0.5rem" }}>
//                         <button style={{ backgroundColor: "#e5e7eb", padding: "0.5rem 1rem", borderRadius: "4px" }}>Export</button>
//                         <button style={{ backgroundColor: "#3b82f6", color: "white", padding: "0.5rem 1rem", borderRadius: "4px" }}>Create Order</button>
//                     </div>
//                 </div>

//                 {loading ? (
//                     <div style={{ textAlign: "center", padding: "2rem 0" }}>Loading orders...</div>
//                 ) : (
//                     <div style={{ overflowX: "auto" }}>
//                         <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
//                             <thead>
//                                 <tr style={{ backgroundColor: "#f3f4f6" }}>
//                                     <th>#</th>
//                                     <th>Table</th>
//                                     <th>Date</th>
//                                     <th>Total</th>
//                                     <th>Items</th>
//                                     <th>Status</th>
//                                     <th>Action</th>
//                                 </tr>
//                             </thead>

//                             <tbody>
//                                 {orders.length === 0 ? (
//                                     <tr>
//                                         <td colSpan="7" style={{ textAlign: "center", padding: "1.5rem 0" }}>No orders found.</td>
//                                     </tr>
//                                 ) : (
//                                     orders.map((order, index) => (
//                                         <React.Fragment key={order.id || index}>
//                                             <tr style={{ textAlign: "center", borderTop: "1px solid #ccc" }}>
//                                                 <td>{index + 1}</td>
//                                                 <td>{order.table_id}</td>
//                                                 <td>{new Date(order.created_at).toLocaleString()}</td>
//                                                 <td>₹{order.total_price?.toFixed(2) || "0.00"}</td>
//                                                 <td>
//                                                     {order.items?.map((item) => item.name || item.item_id).filter(Boolean).join(", ") || "-"}
//                                                 </td>
//                                                 <td style={{ fontWeight: "bold", textTransform: "capitalize" }}>
//                                                     {order.status}
//                                                 </td>
//                                                 <td>
//                                                     <button
//                                                         style={{ color: "#3b82f6", textDecoration: "underline" }}
//                                                         onClick={() => toggleExpand(index)}
//                                                     >
//                                                         {expandedOrderIndex === index ? "Hide" : "View"}
//                                                     </button>
//                                                 </td>
//                                             </tr>

//                                             {expandedOrderIndex === index && (
//                                                 <tr>
//                                                     <td colSpan="7" style={{ backgroundColor: "#f9fafb" }}>
//                                                         <div style={{ padding: "1rem" }}>
//                                                             <div style={{
//                                                                 display: "flex",
//                                                                 flexWrap: "wrap",
//                                                                 gap: "0.5rem",
//                                                                 marginBottom: "1rem"
//                                                             }}>
//                                                                 {["pending", "preparing", "served"].map((status) => (
//                                                                     <button
//                                                                         key={status}
//                                                                         style={{
//                                                                             padding: "0.25rem 0.75rem",
//                                                                             borderRadius: "4px",
//                                                                             color: "white",
//                                                                             backgroundColor: order.status === status ? "#16a34a" : "#6b7280",
//                                                                         }}
//                                                                         onClick={() => handleStatusChange(order.id, status)}
//                                                                     >
//                                                                         {status}
//                                                                     </button>
//                                                                 ))}
//                                                             </div>
//                                                             <table style={{ width: "100%", textAlign: "left", border: "1px solid #ccc" }}>
//                                                                 <thead>
//                                                                     <tr style={{ backgroundColor: "#f3f4f6" }}>
//                                                                         <th>Item </th>
//                                                                         <th>Order ID</th>
//                                                                         <th>Table ID</th>
//                                                                         <th>Quantity</th>
//                                                                         <th>Status</th>
//                                                                     </tr>
//                                                                 </thead>
//                                                                 <tbody>
//                                                                     {order.items?.map((item, idx) => (
//                                                                         <tr key={idx} style={{ borderTop: "1px solid #ccc" }}>
//                                                                             <td>{item?.name ?? item?.item_id ?? "-"}</td>
//                                                                             <td>{item?.order_id ?? order.id}</td>
//                                                                             <td>{order?.table_id ?? "-"}</td>
//                                                                             <td>{item?.quantity ?? 1}</td>
//                                                                             <td>{item?.status ?? "-"}</td>
//                                                                         </tr>
//                                                                     ))}
//                                                                 </tbody>
//                                                             </table>
//                                                         </div>
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </React.Fragment>
//                                     ))
//                                 )}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default OrdersVisiblePage;



///

///


import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useTheme } from "../ThemeChangerComponent/ThemeContext";

const OrdersVisiblePage = () => {
    const { clientId } = useParams();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);
    const { darkMode } = useTheme();
    const token = localStorage.getItem("access_token");

    useEffect(() => {
        document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!token) {
                console.error("❌ Access token not found.");
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(
                    `http://localhost:8003/saas/${clientId}/dinein/table`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                console.log("✅ Orders:", response.data);
                setOrders(response.data?.data || []);
                setLoading(false);
            } catch (error) {
                console.error("❌ Error fetching dine-in orders:", error);
                setLoading(false);
            }
        };

        if (clientId) {
            fetchOrders();
        }
    }, [clientId]);

    const toggleExpand = (index) => {
        setExpandedOrderIndex(index === expandedOrderIndex ? null : index);
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order || order.status === "served") return;

        try {
            const response = await axios.post(
                `http://localhost:8003/saas/${clientId}/dinein/update`,
                {
                    id: orderId,
                    client_id: clientId,
                    status: newStatus,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId ? { ...o, status: newStatus } : o
                )
            );
        } catch (err) {
            console.error("❌ Failed to update status", err);
        }
    };

    return (
        <div className="orders-page">
            <div className="orders-container">
                <div className="orders-header">
                    <h2>Table Orders</h2>
                    <div className="orders-actions">
                        <button className="btn export">Export</button>
                        <button className="btn create">Create Order</button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Loading orders...</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Table</th>
                                    <th>Date</th>
                                    <th>Total</th>
                                    <th>Items</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="no-orders">No orders found.</td>
                                    </tr>
                                ) : (
                                    orders.map((order, index) => (
                                        <React.Fragment key={order.id || index}>
                                            <tr className="order-row">
                                                <td data-label="#"> {index + 1} </td>
                                                <td data-label="Table"> {order.table_id} </td>
                                                <td data-label="Date"> {new Date(order.created_at).toLocaleString()} </td>
                                                <td data-label="Total"> ₹{parseFloat(order.total_price || 0).toFixed(2)} </td>
                                                <td data-label="Items">
                                                    {order.items?.map((item) => item.name || item.item_id).filter(Boolean).join(", ") || "-"}
                                                </td>
                                                <td data-label="Status" className="status"> {order.status} </td>
                                                <td data-label="Action">
                                                    <button
                                                        className="btn toggle"
                                                        onClick={() => toggleExpand(index)}
                                                    >
                                                        {expandedOrderIndex === index ? "Hide" : "View"}
                                                    </button>
                                                </td>
                                            </tr>

                                            {expandedOrderIndex === index && (
                                                <tr>
                                                    <td colSpan="7" className="order-details">
                                                        <div className="details-wrapper">
                                                            <div className="status-buttons">
                                                                {["pending", "preparing", "served"].map((status) => (
                                                                    <button
                                                                        key={status}
                                                                        className={`btn status-change ${order.status === status ? "active" : ""}`}
                                                                        onClick={() => handleStatusChange(order.id, status)}
                                                                        disabled={order.status === "served"}
                                                                    >
                                                                        {status}
                                                                    </button>
                                                                ))}

                                                            </div>
                                                            <table className="items-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Item</th>
                                                                        <th>Order ID</th>
                                                                        <th>Table ID</th>
                                                                        <th>Quantity</th>
                                                                        <th>Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {order.items?.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td>{item?.name ?? item?.item_id ?? "-"}</td>
                                                                            <td>{item?.order_id ?? order.id}</td>
                                                                            <td>{order?.table_id ?? "-"}</td>
                                                                            <td>{item?.quantity ?? 1}</td>
                                                                            <td>{item?.status ?? "-"}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersVisiblePage;