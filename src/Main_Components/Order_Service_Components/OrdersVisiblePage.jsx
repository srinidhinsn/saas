import React, { useEffect, useState } from "react";
import axios from "axios";
import orderServicesPort from "../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
import { useParams } from "react-router-dom";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
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
    const [tablesMap, setTablesMap] = useState({});

    const [editOrderId, setEditOrderId] = useState(null);
    const [showDeleteModals, setShowDeleteModals] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState({ orderId: null, itemId: null });
    const [editedItemsMap, setEditedItemsMap] = useState({});

    // --------------------------------------------------------------------------- //

    const updateItemQuantity = (orderId, itemId, newQty) => {
        setOrders(prev =>
            prev.map(order => {
                if (order.id !== orderId) return order;

                const updatedItems = order.items.map(item =>
                    item.item_id === itemId
                        ? { ...item, quantity: newQty > 0 ? newQty : 1 }
                        : item
                );

                const newTotal = updatedItems.reduce((sum, item) => {
                    const itemPrice = inventoryMap[item.item_id]?.price || 0;
                    return sum + item.quantity * itemPrice;
                }, 0);

                return {
                    ...order,
                    items: updatedItems,
                    total_price: newTotal
                };
            })
        );

        // Also store this in editable map
        setEditedItemsMap(prev => {
            const currentItems = orders.find(o => o.id === orderId)?.items || [];
            const updated = currentItems.map(item =>
                item.item_id === itemId
                    ? { ...item, quantity: newQty > 0 ? newQty : 1 }
                    : item
            );
            return { ...prev, [orderId]: updated };
        });
    };


    // --------------------------------------------------------------------------- //
    //Theme Effect(dark & light theme)
    useEffect(() => {
        document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    // --------------------------------------------------------------------------- //
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
                const response = await orderServicesPort.get(
                    `/${clientId}/dinein/table`,
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


    // --------------------------------------------------------------------------- //
    //Expands/collapses the details for a particular order
    const toggleExpand = (index) => {
        setExpandedOrderIndex(index === expandedOrderIndex ? null : index);
    };

    // --------------------------------------------------------------------------- //

    //Change Order Status
    const handleStatusChange = async (orderId, newStatus) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order || order.status === "served") return;

        try {
            const response = await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                {
                    id: orderId,
                    client_id: clientId,
                    status: newStatus,
                    // invoice_status: newStatus === "served" ? "paid" : undefined,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("Item status updated");


            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? {
                            ...o,
                            status: newStatus,
                            items: o.items.map(item => ({ ...item, status: newStatus === 'served' ? 'served' : item.status }))
                        }
                        : o
                )
            );

        } catch (err) {
            const msg = err?.response?.data?.detail || "❌ Failed to update order status.";
            console.error(msg, err);
            toast.error(msg);

        }
    };

    // --------------------------------------------------------------------------- //
    const handleItemStatusChange = async (orderId, itemId, newStatus) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            const updatedItems = order.items.map(item =>
                item.item_id === itemId ? { ...item, status: newStatus } : item
            );

            const totalPrice = updatedItems.reduce((sum, item) => {
                const price = inventoryMap[item.item_id]?.price || 0;
                return sum + price * (item.quantity || 1);
            }, 0);

            const itemToUpdate = updatedItems.find(item => item.item_id === itemId);

            await orderServicesPort.post(
                `/${clientId}/order_items/update?single_item=true`,
                [{ id: itemToUpdate.id, status: newStatus }],
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: orderId, total_price: totalPrice },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId
                        ? { ...order, items: updatedItems, total_price: totalPrice }
                        : order
                )
            );

        } catch (err) {
            console.error("❌ Failed to update item status", err);
        }
    };




    // --------------------------------------------------------------------------- //
    const cancelItem = async (orderId, itemId) => {
        const order = orders.find(o => o.id === orderId);
        const item = order?.items.find(i => i.item_id === itemId);
        if (!item?.id) return;

        try {
            await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
                params: { order_item_id: item.id },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setOrders((prevOrders) => {
                return prevOrders.map(o => {
                    if (o.id !== orderId) return o;

                    const updatedItems = o.items.map(item =>
                        item.item_id === itemId ? { ...item, status: "cancelled" } : item
                    );

                    return { ...o, items: updatedItems };
                });
            });

            // Also update editable map
            setEditedItemsMap(prev => {
                const existing = orders.find(o => o.id === orderId)?.items || [];
                const updated = existing.map(item =>
                    item.item_id === itemId ? { ...item, status: "cancelled" } : item
                );
                return { ...prev, [orderId]: updated };
            });

        } catch (err) {
            const msg = err?.response?.data?.detail || "❌ Failed to cancel item.";
            console.error(msg, err);
            toast.error(msg);
        }
    };


    //-------------------------------------------------- //
    //-------------------------------------------------- //
    //-------------------------------------------------- //
    //-------------------------------------------------- //
    const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
        const cleanedItems = updatedItemsWithStatuses.map(item => {
            const { id, ...rest } = item;
            return {
                ...rest,
                status: item.status || "new"
            };
        });

        const totalPrice = cleanedItems.reduce((sum, item) => {
            const price = inventoryMap[item.item_id]?.price || 0;
            return sum + price * (item.quantity || 1);
        }, 0);

        try {
            await axios.post(
                `http://localhost:8003/saas/${clientId}/order_items/update?order_id=${orderId}`,
                cleanedItems,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await axios.post(
                `http://localhost:8003/saas/${clientId}/dinein/update`,
                {
                    id: orderId,
                    total_price: totalPrice
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success("Item statuses & total updated!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update items or total.");
        }
    };


    // ----------------------------------------------------- //
    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
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
        const fetchTables = async () => {
            try {
                const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const tableList = res.data?.data || [];
                const map = {};
                tableList.forEach(table => {
                    map[table.id] = table.name;
                });
                setTablesMap(map);
            } catch (error) {
                console.error("❌ Failed to fetch tables:", error);
            }
        };

        fetchTables();
    }, [clientId]);

    // --------------------------------------------------------------------------- //
    useEffect(() => {
        const fetchInventory = async () => {
            if (!token || !clientId) return;

            try {
                const res = await inventoryServicesPort.get(`/${clientId}/inventory/read`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const inventoryList = res.data?.data || [];
                const map = {};

                inventoryList.forEach(item => {
                    map[item.id] = item; // Includes price
                });

                setInventoryMap(map);
            } catch (error) {
                console.error("❌ Failed to fetch inventory:", error);
            }
        };

        fetchInventory();
    }, [clientId]);

    // --------------------------------------------------------------------------- //

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
                                                <td data-label="Table">{tablesMap[order.table_id] || order.table_id}</td>
                                                <td>{order.items.length} items</td>
                                                <td data-label="Total"> ₹{parseFloat(order.total_price || 0).toFixed(2)} </td>
                                                <td data-label="Status" className={`status ${order.status?.toLowerCase()}`}>  {order.status}  </td>
                                                <td data-label="Date"> {new Date(order.created_at).toLocaleDateString()} </td>
                                                <td data-label="Action">
                                                    <button className="btn toggle" onClick={() => toggleExpand(index)} >
                                                        {expandedOrderIndex === index ? "Hide" : "View"}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedOrderIndex === index && (
                                                <tr>
                                                    <td colSpan="7" className="expanded-order-row">
                                                        <div className="modern-order-details-container">
                                                            <div className="modern-order-status-controls">
                                                                <button
                                                                    className="modern-order-delete-button"
                                                                    onClick={() => {
                                                                        console.log("Clicked delete for", order.id);
                                                                        setOrderToDelete(order.id);
                                                                        setShowDeleteModal(true);
                                                                    }}
                                                                >
                                                                    Delete Order
                                                                </button>

                                                                {["pending", "preparing", "served"].map((status) => (
                                                                    <button
                                                                        key={status}
                                                                        className={`modern-status-toggle-button ${order.status === status ? "modern-active-status" : ""}`}
                                                                        onClick={() => handleStatusChange(order.id, status)}
                                                                        disabled={order.status === "served"}
                                                                    >
                                                                        {status}
                                                                    </button>
                                                                ))}

                                                                <button
                                                                    className="modern-order-edit-button"
                                                                    onClick={() => setEditOrderId(prev => prev === order.id ? null : order.id)}
                                                                >
                                                                    {editOrderId === order.id ? 'Cancel Edit' : 'Edit'}
                                                                </button>
                                                            </div>

                                                            <div className="modern-items-table-wrapper">
                                                                <table className="modern-items-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Item(s)</th>
                                                                            <th>Quantity</th>
                                                                            <th>Status</th>
                                                                            <th>Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {order.items?.map((item, idx) => (
                                                                            <tr key={idx}>
                                                                                <td data-label="Item(s)">
                                                                                    {item.item_name || item.item_id}
                                                                                </td>

                                                                                <td data-label="Quantity">
                                                                                    {editOrderId === order.id ? (
                                                                                        <div className="modern-qty-edit-controls">
                                                                                            <button
                                                                                                onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity - 1)}
                                                                                                disabled={item.quantity <= 1}
                                                                                            >
                                                                                                −
                                                                                            </button>
                                                                                            <span>{item.quantity}</span>
                                                                                            <button
                                                                                                onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity + 1)}
                                                                                            >
                                                                                                +
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span>{item.quantity}</span>
                                                                                    )}
                                                                                </td>

                                                                                <td data-label="Status">
                                                                                    <span className={`modern-item-status-tag ${item.status}`}>
                                                                                        {item.status}
                                                                                    </span>
                                                                                </td>

                                                                                <td data-label="Actions">
                                                                                    {["new", "preparing", "served"].map((status) => (
                                                                                        <button
                                                                                            key={status}
                                                                                            className={`modern-item-action-button ${item.status === status ? "modern-active-status" : ""}`}
                                                                                            onClick={() => handleItemStatusChange(order.id, item.item_id, status)}
                                                                                            disabled={item.status === "served" || item.status === "cancelled"}
                                                                                        >
                                                                                            {status}
                                                                                        </button>
                                                                                    ))}

                                                                                    {editOrderId === order.id && (
                                                                                        <button
                                                                                            className="modern-item-delete-button"
                                                                                            onClick={() => {
                                                                                                setDeleteTarget({ orderId: order.id, itemId: item.item_id });
                                                                                                setShowDeleteModals(true);
                                                                                            }}
                                                                                            disabled={item.status === "cancelled"}
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                    <tfoot>
                                                                        <tr>
                                                                            <td colSpan="4" style={{ textAlign: "right" }}>
                                                                                <button
                                                                                    className="modern-save-items-button"
                                                                                    onClick={() => updateOrderItems(order.id, order.items)}
                                                                                >
                                                                                    Save Items
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>



                                            )}

                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {showDeleteModals && deleteTarget && (
                            <div className="delete-modal-overlay">
                                <div className="delete-modal-box">
                                    <p>Are you sure you want to delete this item?</p>
                                    <div className="delete-modal-buttons">
                                        <button
                                            className="confirm-delete-btn"
                                            onClick={() => {
                                                cancelItem(deleteTarget.orderId, deleteTarget.itemId);
                                                setShowDeleteModals(false);
                                                setDeleteTarget({ orderId: null, itemId: null });
                                            }}
                                        >
                                            Yes, Delete
                                        </button>
                                        <button
                                            className="cancel-delete-btn"
                                            onClick={() => {
                                                setShowDeleteModals(false);
                                                setDeleteTarget({ orderId: null, itemId: null });
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}


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


        </div>
    );
};

export default OrdersVisiblePage;


