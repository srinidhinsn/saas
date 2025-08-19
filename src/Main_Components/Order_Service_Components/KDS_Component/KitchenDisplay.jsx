// import React, { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../../ThemeChangerComponent/ThemeProvider";
// import orderServicesPort from "../../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../../Backend_Port_Files/TableServices";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const KitchenDisplay = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const { darkMode } = useTheme();

//     const [orders, setOrders] = useState([]);
//     const [loading, setLoading] = useState(true);

//     // useEffect(() => {
//     //     if (!clientId || !token) {
//     //         setLoading(false);
//     //         toast.error("Token Expired")
//     //     }
//     //     try {
//     //         const response = await tableServicesPort.get(`/${clientId}/dinein/table`, {
//     //             headers: { Authorization: `Bearer ${token}` }
//     //         })
//     //     }
//     // }, [clientId, token])
//     // Fetch real-time orders
//     useEffect(() => {
//         const fetchOrders = async () => {
//             if (!token || !clientId) {
//                 setLoading(false);
//                 return;
//             }
//             try {
//                 const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 setOrders(res.data?.data || []);
//             } catch (error) {
//                 toast.error("Failed to fetch orders.");
//                 console.error("Fetch error:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchOrders();
//         const interval = setInterval(fetchOrders, 10000); // refresh every 10 seconds
//         return () => clearInterval(interval);
//     }, [clientId, token]);

//     // Format date-time as HH:mm
//     const formatTime = (dateStr) => {
//         if (!dateStr) return "";
//         const dt = new Date(dateStr);
//         return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//     };

//     // Determine card color based on order/type/table_number (adapt as needed)
//     const cardColors = (order) => {
//         // Example logic from your image
//         if (order.table_number === "07") return "orange";
//         if (order.type?.toLowerCase() === "take waay") {
//             if (order.customer_name?.toLowerCase().includes("walk") && order.order_id === 428) return "green-light";
//             else return "blue";
//         }
//         if (order.table_number === "12" || order.table_number === "01") return "red";
//         if (order.table_number === "06") return "green-dark";
//         return "default";
//     };

//     // Button text based on order status; adapt as necessary
//     const getButtons = (order) => {
//         if (order.status === "preparing") return ["Pause", "Finish"];
//         return ["Pending", "Preparing", "Served"];
//     };

//     return (
//         <div className="KDS-Container">
//             <div className={`kds-page ${darkMode ? "theme-dark" : "theme-light"}`}>
//                 {loading ? (
//                     <div className="loading">Loading orders...</div>
//                 ) : (
//                     <div className="kds-grid">
//                         {orders.map((order) => (
//                             <div key={order.id || order.order_id} className={`kds-card ${cardColors(order)}`}>
//                                 <div style={{ display: 'flex', justifyContent: 'end', }} className="">
//                                     <button style={{
//                                         background: "var(--bg-container)", border: 'none', padding: '5px', borderRadius: '5px', color: 'var(--bg-text-color)'

//                                     }}>+Add item</button>
//                                 </div>
//                                 <div className="kds-card-header">

//                                     <div className="left-header">
//                                         <span className="table-icon">🪑</span>
//                                         <span className="table-text">
//                                             {order.table_number ? `Table ${order.table_number}` : order.customer_name}
//                                         </span>
//                                         <span className="order-id">Order #{order.id || order.order_id}</span>
//                                     </div>
//                                     <div className="right-header">
//                                         <span>{formatTime(order.created_at || order.createdAt)}</span>
//                                         <span>5 Mins</span>
//                                     </div>
//                                 </div>

//                                 <div className="kds-card-body">
//                                     {(order.items || order.order_items || []).map((item, idx) => (
//                                         <div key={item.item_id || item.id || idx} className="item-row">
//                                             <div className="item-name">
//                                                 {item.quantity || item.qty || 1}x {item.item_name || item.name || "Item"}
//                                             </div>
//                                             <div className="item-measure">{item.measure || item.unit || item.price || ""}</div>
//                                         </div>
//                                     ))}
//                                 </div>

//                                 <div className="kds-card-footer">
//                                     {getButtons(order).map((btn) => (
//                                         <button
//                                             key={btn}
//                                             className={`btn ${btn.toLowerCase()}`}
//                                             type="button"
//                                             onClick={() => toast.info(`${btn} clicked for Order ${order.id || order.order_id}`)}
//                                         >
//                                             {btn}
//                                         </button>
//                                     ))}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default KitchenDisplay;



// =============================================================================================================================== //


import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTheme } from "../../../ThemeChangerComponent/ThemeProvider";
import orderServicesPort from "../../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../../Backend_Port_Files/TableServices";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrash } from "react-icons/fa";

const KitchenDisplay = () => {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");
    const { darkMode } = useTheme();

    const [orders, setOrders] = useState([]);
    const [tablesMap, setTablesMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [editOrderId, setEditOrderId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // 'order' or {orderId, itemId}

    // Fetch tables map for table names
    useEffect(() => {
        if (!token || !clientId) return;
        const fetchTables = async () => {
            try {
                const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const tableList = res.data?.data || [];
                const map = {};
                tableList.forEach((table) => {
                    map[table.id] = table.name;
                });
                setTablesMap(map);
            } catch (error) {
                console.error("Failed to fetch tables:", error);
            }
        };
        fetchTables();
    }, [clientId, token]);

    // Fetch orders with live refresh
    useEffect(() => {
        const fetchOrders = async () => {
            if (!token || !clientId) {
                setLoading(false);
                return;
            }
            try {
                const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setOrders(res.data?.data || []);
            } catch (error) {
                toast.error("Failed to fetch orders.");
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [clientId, token]);

    // Format created_at time
    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const dt = new Date(dateStr);
        return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Determine card color for header
    const cardColors = (order) => {
        if (order.table_number === "07") return "orange";
        if (order.type?.toLowerCase() === "take waay") {
            if (order.customer_name?.toLowerCase().includes("walk") && order.order_id === 428)
                return "green-light";
            else return "blue";
        }
        if (order.table_number === "12" || order.table_number === "01") return "red";
        if (order.table_number === "06") return "green-dark";
        return "default";
    };

    // Status buttons for the order
    const statusButtons = ["Pending", "Preparing", "Served"];

    // Handle order status update
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: orderId, status: newStatus.toLowerCase() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus.toLowerCase() } : o))
            );
            toast.success("Order status updated");
        } catch (err) {
            toast.error("Failed to update order status");
        }
    };

    // Handle delete order confirmation
    const confirmDeleteOrder = async () => {
        if (!deleteTarget) return;
        try {
            await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
                params: { dinein_order_id: deleteTarget, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders((prev) => prev.filter((o) => o.id !== deleteTarget));
            toast.success("Order deleted");
        } catch (err) {
            toast.error("Failed to delete order");
        } finally {
            setShowDeleteModal(false);
            setDeleteTarget(null);
        }
    };

    // Edit mode helpers
    const toggleEdit = (orderId) => setEditOrderId((prev) => (prev === orderId ? null : orderId));

    // Update item quantity in state (simple local update)
    const updateItemQuantity = (orderId, itemId, newQty) => {
        setOrders((prev) =>
            prev.map((o) => {
                if (o.id !== orderId) return o;
                const updatedItems = o.items.map((item) =>
                    item.item_id === itemId ? { ...item, quantity: newQty > 0 ? newQty : 1 } : item
                );
                return { ...o, items: updatedItems };
            })
        );
    };

    // Delete item from an order locally and optionally an API call can be added here
    const deleteItemFromOrder = (orderId, itemId) => {
        setOrders((prev) =>
            prev.map((o) =>
                o.id !== orderId ? o : { ...o, items: o.items.filter((item) => item.item_id !== itemId) }
            )
        );
    };

    return (
        <>
            <div className={`kds-page ${darkMode ? "theme-dark" : "theme-light"}`}>
                {loading ? (
                    <div className="loading">Loading orders...</div>
                ) : (
                    <div className="kds-grid">
                        {orders.map((order) => (
                            <div key={order.id} className={`kds-card ${cardColors(order)}`}>
                                <div className="kds-card-header">
                                    <div className="left-header" style={{ display: "flex", alignItems: "center" }}>
                                        <button
                                            className="delete-icon"
                                            title="Delete Order"
                                            onClick={() => {
                                                setDeleteTarget(order.id);
                                                setShowDeleteModal(true);
                                            }}
                                        >
                                            <FaTrash />
                                        </button>

                                        <span className="table-text">
                                            {tablesMap[order.table_id] || order.table_number || order.customer_name || "N/A"}
                                        </span>
                                        {/* <span className="order-id">Order #{order.id}</span> */}
                                    </div>

                                    <div className="right-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <button className="edit-btn" onClick={() => toggleEdit(order.id)}>
                                            {editOrderId === order.id ? "Cancel Edit" : "Edit"}
                                        </button>

                                        <button
                                            className="add-item-btn"
                                            onClick={() => toast.info("Add Item clicked - implement your logic")}
                                        >
                                            + Add item
                                        </button>
                                    </div>
                                </div>

                                <div className="kds-card-body">
                                    {(order.items || []).map((item) => (
                                        <div key={item.item_id} className="item-row">
                                            <div className="item-name">
                                                {editOrderId === order.id ? (
                                                    <div>
                                                        <button
                                                            onClick={() =>
                                                                updateItemQuantity(order.id, item.item_id, (item.quantity || 1) - 1)
                                                            }
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            −
                                                        </button>
                                                        <span style={{ margin: "0 8px" }}>{item.quantity || 1}</span>
                                                        <button onClick={() => updateItemQuantity(order.id, item.item_id, (item.quantity || 1) + 1)}>
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    `${item.quantity || 1}x ${item.item_name || "Unnamed Item"}`
                                                )}
                                            </div>

                                            <div className="item-measure">{item.measure || ""}</div>

                                            {editOrderId === order.id && (
                                                <button
                                                    className="delete-item-btn"
                                                    onClick={() => deleteItemFromOrder(order.id, item.item_id)}
                                                    title="Delete Item"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="kds-card-footer">
                                    {statusButtons.map((status) => (
                                        <button
                                            key={status}
                                            className={`btn ${status.toLowerCase()} ${order.status === status.toLowerCase() ? "active" : ""
                                                }`}
                                            onClick={() => handleStatusChange(order.id, status)}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <p>Are you sure you want to delete this order?</p>
                        <button onClick={confirmDeleteOrder} className="btn yes">
                            Yes
                        </button>
                        <button
                            onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteTarget(null);
                            }}
                            className="btn no"
                        >
                            No
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default KitchenDisplay;
