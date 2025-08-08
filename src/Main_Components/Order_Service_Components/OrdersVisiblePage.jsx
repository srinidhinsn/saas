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
    const [allInventoryItems, setAllInventoryItems] = useState([]);
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [itemSearchResults, setItemSearchResults] = useState([]);

    const todayDate = new Date().toISOString().split("T")[0];
    const [selectedDate, setSelectedDate] = useState(todayDate);

    // --------------------------------------------------------------------------- //
    useEffect(() => {
        axios.get(`http://localhost:8002/saas/${clientId}/inventory/read`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setAllInventoryItems(res.data.data || []); console.log("✅ All inventory items:", res.data.data);
            })
            .catch(err => {
                console.error("Failed to load inventory:", err);
            });
    }, []);
    useEffect(() => {
        if (!expandedOrderIndex || !orders[expandedOrderIndex]) {
            setItemSearchResults([]);
            return;
        }

        const currentOrderItems = orders[expandedOrderIndex].items.map(i => i.item_id);

        const filtered = allInventoryItems
            .filter(item =>
                (item.name || "").toLowerCase().includes(itemSearchQuery.toLowerCase())
            )
            .filter(item => !currentOrderItems.includes(item.id)); // 🔥 Exclude already added items

        setItemSearchResults(filtered);
    }, [itemSearchQuery, allInventoryItems, expandedOrderIndex, orders]);

    const addItemToOrder = (orderId, selectedItem) => {
        console.log("🟢 Adding item to order:", selectedItem);

        let targetItems = [];

        setOrders(prevOrders => {
            return prevOrders.map(order => {
                if (order.id !== orderId) return order;

                const newItem = {
                    item_id: selectedItem.id,
                    item_name: selectedItem.name,
                    quantity: 1,
                    price: selectedItem.price,
                    status: "new",
                    note: "",
                    slug: selectedItem.slug || generateSlug(selectedItem.name)
                };

                const newItems = [...order.items, newItem];
                targetItems = newItems; // 🟢 store for use after state update

                return {
                    ...order,
                    items: newItems
                };
            });
        });

        // ✅ Do this OUTSIDE of setOrders to avoid duplication
        setTimeout(() => {
            updateOrderItems(orderId, targetItems);
        }, 0);

        setItemSearchQuery("");
        setItemSearchResults([]);
    };



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
            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
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

            toast.success("Order status updated");

            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? {
                            ...o,
                            status: newStatus, // ✅ Only this line changes
                            // Items remain untouched
                        }
                        : o
                )
            );

            // Optional: exit edit mode if status is served
            if (newStatus === "served") {
                setEditOrderId(null);
            }

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
            // 1. Delete item from DB
            await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
                params: { order_item_id: item.id, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });

            // 2. Remove item from local state
            const updatedOrders = orders.map(o => {
                if (o.id !== orderId) return o;

                const updatedItems = o.items.filter(i => i.item_id !== itemId);
                const newTotal = updatedItems.reduce((sum, item) => {
                    const price = inventoryMap[item.item_id]?.price || item.price || 0;
                    return sum + (item.quantity || 1) * price;
                }, 0);

                return {
                    ...o,
                    items: updatedItems,
                    total_price: newTotal
                };
            });

            setOrders(updatedOrders);

            // 3. Update backend total_price
            const newOrder = updatedOrders.find(o => o.id === orderId);
            if (newOrder) {
                await orderServicesPort.post(
                    `/${clientId}/dinein/update`,
                    {
                        id: orderId,
                        total_price: newOrder.total_price
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
            }

            // 4. Update editable map (optional)
            setEditedItemsMap(prev => {
                const updated = (prev[orderId] || []).filter(i => i.item_id !== itemId);
                return { ...prev, [orderId]: updated };
            });

            toast.success("Item cancelled and total updated");
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
        const cleanedItems = updatedItemsWithStatuses.map(item => ({
            item_id: item.item_id || item.inventory_id, // fallback
            item_name: item.name || item.item_name,
            quantity: item.quantity || 1,
            status: item.status || "new",
            note: item.note || "",
            slug: item.slug || "",
            price: item.price || inventoryMap[item.item_id || item.inventory_id]?.price || 0,
            client_id: clientId,
            order_id: orderId
        }));

        console.log("📤 Final payload to order_items/update:");
        cleanedItems.forEach((item, i) => console.log(`Item ${i + 1}:`, item));

        const totalPrice = cleanedItems.reduce((sum, item) => {
            return sum + item.price * item.quantity;
        }, 0);

        try {
            // ✅ Use query param for order_id
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
            console.error("❌ Failed to update order items:", err);
            if (err.response?.data) {
                console.error("🚨 Response data:", err.response.data);
            }
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
    const filteredOrders = selectedDate
        ? orders.filter(order => {
            const orderDate = new Date(order.created_at).toLocaleDateString("en-CA");
            return orderDate === selectedDate;
        })
        : orders;


    return (
        <div className="orders-page">
            <div className="orders-container">
                <div className="orders-header">
                    <h2>Table Orders</h2>
                    <div className="orders-actions">
                        <select
                            className="date-filter-dropdown"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        >
                            <option value="">All Dates</option>
                            {[...Array(15)].map((_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() - i);
                                const dateString = d.toLocaleDateString("en-CA");
                                const label = i === 0 ? "Today" : dateString;
                                return (
                                    <option key={dateString} value={dateString}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
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
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="no-orders">No orders found.</td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order, index) => (
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
                                                            {/* Order-level controls */}
                                                            <div className="modern-order-status-controls">
                                                                {order.status !== "served" && (
                                                                    <>
                                                                        <button
                                                                            className="modern-order-delete-button"
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
                                                                                className={`modern-status-toggle-button ${order.status === status ? "modern-active-status" : ""}`}
                                                                                onClick={() => handleStatusChange(order.id, status)}
                                                                            >
                                                                                {status}
                                                                            </button>
                                                                        ))}

                                                                        <button
                                                                            className="modern-order-edit-button"
                                                                            onClick={() =>
                                                                                setEditOrderId((prev) => (prev === order.id ? null : order.id))
                                                                            }
                                                                        >
                                                                            {editOrderId === order.id ? "Cancel Edit" : "Edit"}
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Item table */}
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
                                                                                    {/* ✅ Always show item actions regardless of order status */}
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

                                                                        {/* Add Item row */}
                                                                        {editOrderId === order.id && order.status !== "served" && (
                                                                            <tr>
                                                                                <td colSpan="4">
                                                                                    <div className="modern-add-item-section">
                                                                                        <input
                                                                                            type="text"
                                                                                            className="modern-item-search-input"
                                                                                            placeholder="Search item to add..."
                                                                                            value={itemSearchQuery}
                                                                                            onChange={(e) => setItemSearchQuery(e.target.value)}
                                                                                        />

                                                                                        {itemSearchResults.length > 0 && (
                                                                                            <ul className="modern-item-search-results">
                                                                                                {itemSearchResults.map(item => (
                                                                                                    <li key={item.id} onClick={() => addItemToOrder(order.id, item)}>
                                                                                                        {item.name} - ₹{item.price}
                                                                                                    </li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
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
                                    <p> Delete this item?</p>
                                    <div className="delete-modal-buttons">
                                        <button
                                            className="confirm-delete-btn"
                                            onClick={() => {
                                                cancelItem(deleteTarget.orderId, deleteTarget.itemId);
                                                setShowDeleteModals(false);
                                                setDeleteTarget({ orderId: null, itemId: null });
                                            }}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            className="cancel-delete-btn"
                                            onClick={() => {
                                                setShowDeleteModals(false);
                                                setDeleteTarget({ orderId: null, itemId: null });
                                            }}
                                        >
                                            No
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


