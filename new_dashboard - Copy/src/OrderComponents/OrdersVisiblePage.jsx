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
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const OrdersVisiblePage = () => {
    const { clientId } = useParams();                                                            // extract clientId from URL
    const [orders, setOrders] = useState([]);                                                    // store orders
    const [loading, setLoading] = useState(true);                                                // loader flag
    const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);                          // which order is expanded
    const { darkMode } = useTheme();                                                             // check if dark mode is enabled
    const token = localStorage.getItem("access_token");                                          // get token from local storage
    const [inventoryMap, setInventoryMap] = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);


    //Theme Effect(dark & light theme)
    useEffect(() => {
        document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    //Fetching orders
    useEffect(() => {
        const fetchOrders = async () => {
            //no accesstoken no access
            if (!token) {
                console.error(" Access token not found");
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
                console.log("Placed Orders:", response.data);
                //on success ...orders are stored in state (orders) else it returns empty array
                setOrders(response.data?.data || []);
                setLoading(false);
            } catch (error) {
                const msg = error?.response?.data?.detail || "❌ Failed to fetch dine-in orders.";
                console.error(msg, error);
                toast.error(msg);
                setLoading(false);
            }

        };

        if (clientId) {
            fetchOrders();
        }
    }, [clientId]);


    //Expands/collapses the details for a particular order
    const toggleExpand = (index) => {
        setExpandedOrderIndex(index === expandedOrderIndex ? null : index);
    };


    //Change Order Status
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
                    invoice_status: newStatus === "served" ? "paid" : undefined,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("Item status updated");

            // if (newStatus === "served") {
            //     await axios.post(
            //         `http://localhost:8003/saas/${clientId}/dinein/update`,
            //         {
            //             order_id: orderId,
            //             invoice_status: "paid",
            //         },
            //         {
            //             headers: {
            //                 Authorization: `Bearer ${token}`,
            //             },
            //         }
            //     );
            // }
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId ? { ...o, status: newStatus } : o
                )
            );
        } catch (err) {
            const msg = err?.response?.data?.detail || "❌ Failed to update order status.";
            console.error(msg, err);
            toast.error(msg);

        }
    };
    const handleItemStatusChange = async (orderId, itemId, newStatus) => {
        try {
            await axios.post(`http://localhost:8003/saas/${clientId}/dinein/item/update`, {
                order_id: orderId,
                item_id: itemId,
                status: newStatus
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });

            setOrders((prev) =>
                prev.map((order) =>
                    order.id === orderId
                        ? {
                            ...order,
                            items: order.items.map((item) =>
                                item.item_id === itemId ? { ...item, status: newStatus } : item
                            ),
                        }
                        : order
                )
            );
        } catch (err) {
            console.error("❌ Failed to update item status", err);
        }
    };

    const cancelItem = async (orderId, itemId) => {
        try {
            await axios.post(`http://localhost:8003/saas/${clientId}/dinein/item/update`, {
                order_id: orderId,
                item_id: itemId,
                status: "cancelled"
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });

            setOrders((prev) =>
                prev.map((order) =>
                    order.id === orderId
                        ? {
                            ...order,
                            items: order.items.map((item) =>
                                item.item_id === itemId ? { ...item, status: "cancelled" } : item
                            ),
                        }
                        : order
                )
            );
        } catch (err) {
            const msg = err?.response?.data?.detail || "❌ Failed to cancel item.";
            console.error(msg, err);
            toast.error(msg);

        }
    };
    //-------------------------------------------------- //
    const updateOrderItems = async (orderId, items) => {
        // Step 1: Recalculate total based on quantity and item prices (from inventoryMap)
        let updatedTotal = 0;
        items.forEach(item => {
            const price = inventoryMap[item.item_id]?.price || 0;
            updatedTotal += item.quantity * price;
        });

        try {
            const response = await axios.post(
                `http://localhost:8003/saas/${clientId}/order_item/update`,
                {
                    dinein_order_id: String(orderId),
                    items: items.map(item => ({
                        item_id: item.item_id,
                        quantity: item.quantity
                    })),
                    total_price: updatedTotal, // Include total
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("✅ Order items updated");

            // Update state after backend update
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId ? { ...o, items, total_price: updatedTotal } : o
                )
            );
        } catch (error) {
            const msg = error?.response?.data?.detail || "❌ Failed to update order items.";
            console.error(msg, error);
            toast.error(msg);
        }
    };


    // ----------------------------------------------------- //
    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            await axios.delete(`http://localhost:8003/saas/${clientId}/dinein/delete`, {
                params: {
                    dinein_order_id: orderToDelete,
                    client_id: clientId,
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
            setExpandedOrderIndex(null);
            toast.success(" Order deleted");
        } catch (err) {
            console.error("❌ Failed to delete order", err);
            toast.error("❌ Failed to delete order");
        } finally {
            setShowDeleteModal(false);
            setOrderToDelete(null);
        }
    };


    // --------------------------------------------------------------------------- //

    useEffect(() => {
        if (!token || !clientId) return;

        axios
            .get(`http://localhost:8002/saas/${clientId}/inventory/read`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const items = res.data.data || [];
                console.log("📦 Inventory fetched:", items);
                const map = {};
                items.forEach((item) => {
                    map[item.id] = item.name;

                });
                console.log("🧭 inventoryMap:", map);
                setInventoryMap(map);
            })
            .catch((err) => {
                console.error("Failed to load inventory for mapping:", err);
            });
    }, [clientId]);
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
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Invoice Status</th>
                                    <th>Status</th>
                                    <th>Date</th>
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
                                                <td data-label="Items">
                                                    {order.items?.map((item) => inventoryMap[item.item_id] || item.item_id).join(", ") || "-"}
                                                </td>

                                                <td data-label="Total"> ₹{parseFloat(order.total_price || 0).toFixed(2)} </td>
                                                <td data-label="Invoice Status"> {order.invoice_status || "-"} </td>
                                                <td data-label="Status" className={`status ${order.status?.toLowerCase()}`}>
                                                    {order.status}
                                                </td>
                                                <td data-label="Date"> {new Date(order.created_at).toLocaleDateString()} </td>
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
                                                                <button
                                                                    className="btn delete"
                                                                    onClick={() => {
                                                                        setOrderToDelete(order.id);
                                                                        setShowDeleteModal(true);
                                                                    }}

                                                                >
                                                                    Delete Order
                                                                </button>

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
                                                                            <td data-label="Item">{inventoryMap[item.item_id] || item.item_id}</td>
                                                                            <td data-label="Order ID">{item?.order_id ?? order.id}</td>
                                                                            <td data-label="Table ID">{order?.table_id ?? "-"}</td>
                                                                            <td data-label="Quantity">
                                                                                <input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    value={item.quantity}
                                                                                    onChange={(e) => {
                                                                                        const newQty = parseInt(e.target.value);
                                                                                        const currentOrderId = order.id;

                                                                                        setOrders((prev) =>
                                                                                            prev.map((o) =>
                                                                                                o.id === currentOrderId
                                                                                                    ? {
                                                                                                        ...o,
                                                                                                        items: o.items.map((it) =>
                                                                                                            it.item_id === item.item_id
                                                                                                                ? { ...it, quantity: newQty }
                                                                                                                : it
                                                                                                        ),
                                                                                                    }
                                                                                                    : o
                                                                                            )
                                                                                        );
                                                                                    }}

                                                                                    style={{ width: "50px" }}
                                                                                />
                                                                            </td>

                                                                            <td data-label="Status">
                                                                                <span className={`tag ${item.status}`}>{item.status}</span>
                                                                            </td>


                                                                            <td data-label="Actions">

                                                                                {["new", "preparing", "served"].map((status) => (
                                                                                    <button
                                                                                        key={status}
                                                                                        className={`btn-sm ${item.status === status ? "active" : ""}`}
                                                                                        onClick={() => handleItemStatusChange(order.id, item.item_id, status)}
                                                                                        disabled={item.status === "served" || item.status === "cancelled"}
                                                                                    >
                                                                                        {status}
                                                                                    </button>
                                                                                ))}
                                                                                <button
                                                                                    className="btn-sm cancel"
                                                                                    onClick={() => cancelItem(order.id, item.item_id)}
                                                                                    disabled={item.status === "cancelled"}
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </td>
                                                                        </tr>

                                                                    ))}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr>
                                                                        <td colSpan="5" style={{ textAlign: "right" }}>
                                                                            <button
                                                                                className="btn save-items"
                                                                                onClick={() => updateOrderItems(order.id, order.items)}
                                                                            >
                                                                                Save Items
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                </tfoot>
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
            {showDeleteModal && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <h3>Delete this order?</h3>
                        <div className="modal-buttons">
                            <button className="yes" onClick={confirmDeleteOrder}>Yes</button>
                            <button className="no" onClick={() => {
                                setShowDeleteModal(false);
                                setOrderToDelete(null);
                            }}>No</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default OrdersVisiblePage;