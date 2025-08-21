import React, { useEffect, useState } from "react";
import axios from "axios";
import orderServicesPort from "../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
import { useParams } from "react-router-dom";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Invoice from "../Invoice_Services_Components/Invoice_Page";
import InvoiceModal from "../Invoice_Services_Components/Invoice_Page";
// import SplashCursor from "../../Sub_Components/Arrow";


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
    const [filterMode, setFilterMode] = useState(0);
    // 0 = ascending date, 1 = descending date, 2 = new, 3 = preparing, 4 = served
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceOrder, setInvoiceOrder] = useState(null);

    // --------------------------------------------------------------------------- //

    const openInvoiceModal = (order) => {
        setInvoiceOrder(order);
        setShowInvoiceModal(true);
    };

    const closeInvoiceModal = () => {
        setInvoiceOrder(null);
        setShowInvoiceModal(false);
    };
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
        if (expandedOrderIndex === null || expandedOrderIndex === undefined || !orders[expandedOrderIndex]) {
            setItemSearchResults([]);
            return;
        }

        const currentOrderItems = orders[expandedOrderIndex].items.map(i => i.item_id.toString());

        console.log("Current order item IDs:", currentOrderItems);
        console.log("Inventory items IDs for filtering:", allInventoryItems.map(i => ({ id: i.id.toString(), name: i.name })));

        const filtered = allInventoryItems
            .filter(item => (item.name || "").toLowerCase().includes(itemSearchQuery.toLowerCase()))
            .filter(item => !currentOrderItems.includes(item.id.toString()));

        console.log("Filtered items after exclusion:", filtered.map(i => i.name));

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


    const handleItemStatusChange = async (orderId, itemId, newStatus) => {
        try {
            // Get the order from state
            const order = orders.find(o => o.id === orderId);
            if (!order) {
                toast.error("Order not found in state");
                return;
            }

            // Modify only the item you care about
            const updatedItems = order.items.map(item =>
                item.item_id === itemId
                    ? { ...item, status: newStatus }
                    : item
            );

            // Strip 'id' so backend doesn't try to insert into identity column
            const itemsForUpdate = updatedItems.map(({ id, ...rest }) => rest);

            // Recalculate total price
            const totalPrice = updatedItems.reduce(
                (sum, item) =>
                    sum + (inventoryMap[item.item_id]?.price || 0) * (item.quantity || 1),
                0
            );

            // Send full updated list without 'id'
            await orderServicesPort.post(
                `/${clientId}/order_items/update?order_id=${orderId}`,
                itemsForUpdate,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update order total price in backend
            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: orderId, total_price: totalPrice },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state (with id still intact locally)
            setOrders(prev =>
                prev.map(o =>
                    o.id === orderId
                        ? { ...o, items: updatedItems, total_price: totalPrice }
                        : o
                )
            );

            toast.success("Item status updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update item status");
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
    let filteredOrders = selectedDate
        ? orders.filter(order => {
            const orderDate = new Date(order.created_at).toLocaleDateString("en-CA");
            return orderDate === selectedDate;
        })
        : orders;

    // Now apply filterMode on filteredOrders instead of on all orders again
    switch (filterMode) {
        case 0: // Ascending date
            filteredOrders = [...filteredOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 1: // Descending date
            filteredOrders = [...filteredOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 2: // New orders
            filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "new");
            break;
        case 3: // Preparing orders
            filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "preparing");
            break;
        case 4: // Served orders
            filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "served");
            break;
        default:
            break;
    }


    return (
        <>
            <div className="OrderSummary-container">
                <div className="orders-page">
                    <div className="orders-header">
                        <h2>Table Orders</h2>
                        <div className="orders-actions">
                            <select
                                className="date-filter"
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
                            <button
                                className="btn filter"
                                onClick={() => setFilterMode((prev) => (prev + 1) % 5)}
                            >
                                Filter
                            </button>

                        </div>
                    </div>

                    {loading ? (
                        <div className="loading">Loading orders...</div>
                    ) : (
                        <div className="orders-list">
                            {filteredOrders.length === 0 ? (
                                <div className="no-orders">No orders found.</div>
                            ) : (
                                filteredOrders.map((order, index) => (
                                    <div key={order.id || index} className="order-card">
                                        <div className="order-summary grid-row">
                                            <div className="order-col">{tablesMap[order.table_id] || order.table_id}</div>
                                            <div className="order-col">{order.items.length} items</div>
                                            <div className="order-col">₹{parseFloat(order.total_price || 0).toFixed(2)}</div>
                                            <div className={`order-col status ${order.status?.toLowerCase()}`}>
                                                {order.status}
                                            </div>
                                            <div className="order-col">{new Date(order.created_at).toLocaleDateString()}</div>
                                            <div className="order-col"><button
                                                className="btn invoice"
                                                onClick={() => openInvoiceModal(order)}
                                            >
                                                Invoice
                                            </button>

                                            </div>
                                            <div className="order-col">
                                                <button className="btn toggle" onClick={() => toggleExpand(index)}>
                                                    {expandedOrderIndex === index ? "Hide" : "View"}
                                                </button>
                                            </div>
                                        </div>

                                        {expandedOrderIndex === index && (
                                            <div className="order-details">
                                                <div className="order-controls">
                                                    {order.status !== "served" && (
                                                        <>
                                                            <button
                                                                className="delete-btn"
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
                                                                    className={`btn status-toggle ${order.status === status ? "active" : ""}`}
                                                                    onClick={() => handleStatusChange(order.id, status)}
                                                                >
                                                                    {status}
                                                                </button>
                                                            ))}

                                                            <button
                                                                className="btn edit"
                                                                onClick={() =>
                                                                    setEditOrderId((prev) => (prev === order.id ? null : order.id))
                                                                }
                                                            >
                                                                {editOrderId === order.id ? "Cancel Edit" : "Edit"}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Items grid */}
                                                <div className="items-grid-header grid-row">
                                                    <div>Item(s)</div>
                                                    <div>Quantity</div>
                                                    <div>Status</div>
                                                    <div>Actions</div>
                                                </div>

                                                {order.items?.map((item, idx) => (
                                                    <div key={idx} className="items-grid-row grid-row">
                                                        <div>{item.item_name || item.item_id}</div>
                                                        <div>
                                                            {editOrderId === order.id ? (
                                                                <div className="qty-controls">
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
                                                        </div>
                                                        <div>
                                                            <span className={`status-tag ${item.status}`}>{item.status}</span>
                                                        </div>
                                                        <div className="actions">
                                                            {["new", "preparing", "served"].map((status) => (
                                                                <button
                                                                    key={status}
                                                                    className={`btn item-status ${item.status === status ? "active" : ""}`}
                                                                    onClick={() => handleItemStatusChange(order.id, item.item_id, status)}
                                                                    disabled={item.status === "served" || item.status === "cancelled"}
                                                                >
                                                                    {status}
                                                                </button>
                                                            ))}

                                                            {editOrderId === order.id && (
                                                                <button
                                                                    className="btn delete"
                                                                    onClick={() => {
                                                                        setDeleteTarget({ orderId: order.id, itemId: item.item_id });
                                                                        setShowDeleteModals(true);
                                                                    }}
                                                                    disabled={item.status === "cancelled"}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {editOrderId === order.id && order.status !== "served" && (
                                                    <div className="add-item-row">
                                                        <input
                                                            type="text"
                                                            className="item-search"
                                                            placeholder="Search item to add..."
                                                            value={itemSearchQuery}
                                                            onChange={(e) => setItemSearchQuery(e.target.value)}
                                                        />
                                                        {itemSearchResults.length > 0 && (
                                                            <ul className="search-results">
                                                                {itemSearchResults.map(item => (
                                                                    <li key={item.id} onClick={() => addItemToOrder(order.id, item)}>
                                                                        {item.name} - ₹{item.price}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="save-row">
                                                    <button
                                                        className="btn save"
                                                        onClick={() => updateOrderItems(order.id, order.items)}
                                                    >
                                                        Save Items
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Modals */}
                    {showDeleteModals && deleteTarget && (
                        <div className="modal-overlay">
                            <div className="modal">
                                <p>Delete this item?</p>
                                <div className="modal-buttons">
                                    <button
                                        className="btn yes"
                                        onClick={() => {
                                            cancelItem(deleteTarget.orderId, deleteTarget.itemId);
                                            setShowDeleteModals(false);
                                            setDeleteTarget({ orderId: null, itemId: null });
                                        }}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        className="btn no"
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

                    {showDeleteModal && (
                        <div className="modal-overlay">
                            <div className="modal">
                                <h3>Delete this order?</h3>
                                <div className="modal-buttons">
                                    <button className="btn yes" onClick={confirmDeleteOrder}>Yes</button>
                                    <button
                                        className="btn no"
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setOrderToDelete(null);
                                        }}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showInvoiceModal && invoiceOrder && (
                        <InvoiceModal order={invoiceOrder} onClose={closeInvoiceModal} />
                    )}

                </div>
            </div>
        </>

    );
};

export default OrdersVisiblePage;
//   Shanmugam

//
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //
//========================================== Order Summary Page Updated =============================================== //

// import React, { useState, useEffect, useMemo } from "react";
// import { handleExportOrders } from '../../Util_Components/handleExportOrders'
// import {
//     DataGrid,
//     GridToolbarContainer,
//     GridToolbarExport,
// } from "@mui/x-data-grid";
// import {
//     Button,
//     Select,
//     MenuItem,
//     TextField,
//     Collapse,
//     Box,
//     Typography,
//     Dialog,
//     DialogTitle,
//     DialogContent,
//     DialogActions,
//     IconButton,
// } from "@mui/material";
// import { ExpandMore, ExpandLess } from "@mui/icons-material";
// import axios from "axios";
// import orderServicesPort from "../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../Backend_Port_Files/TableServices";
// import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";


// const OrdersVisiblePage = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const { darkMode } = useTheme();

//     // Orders and auxiliary states
//     const [orders, setOrders] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [tablesMap, setTablesMap] = useState({});
//     const [inventoryMap, setInventoryMap] = useState({});
//     const [allInventoryItems, setAllInventoryItems] = useState([]);
//     const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

//     // UI interaction states
//     const [expandedRowIds, setExpandedRowIds] = useState(new Set());
//     const [editOrderId, setEditOrderId] = useState(null);
//     const [itemSearchQueryMap, setItemSearchQueryMap] = useState({});
//     const [itemSearchResultsMap, setItemSearchResultsMap] = useState({});

//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [deleteTarget, setDeleteTarget] = useState(null); // {type: "order" | "item", orderId, itemId?}
//     const [showExportModal, setShowExportModal] = React.useState(false);
//     const [exportStep, setExportStep] = React.useState(1);
//     const [exportDate, setExportDate] = React.useState("");
//     const [exportPageOption, setExportPageOption] = React.useState("all");

//     // Apply theme to body
//     useEffect(() => {
//         document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
//     }, [darkMode]);

//     // Fetch inventory

//     const onExportClick = () => {
//         handleExportOrders({
//             orders,
//             exportDate,
//             exportPageOption,
//             tablesMap,
//             onExportComplete: () => {
//                 setShowExportModal(false);
//                 setExportStep(1);
//                 setExportDate("");
//                 setExportPageOption("all");
//             },
//         });
//     };

//     // Fetch tables
//     useEffect(() => {
//         if (!clientId || !token) return;
//         (async () => {
//             try {
//                 const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const tables = res.data?.data || [];
//                 const map = {};
//                 tables.forEach((t) => (map[t.id] = t.name));
//                 setTablesMap(map);
//                 console.log("Tables fetched:", tables);
//                 console.log("Tables map:", map);
//             } catch (err) {
//                 console.error("Failed to fetch tables", err);
//             }
//         })();
//     }, [clientId, token]);

//     // Fetch orders
//     useEffect(() => {
//         if (!clientId || !token) return;
//         (async () => {
//             setLoading(true);
//             try {
//                 const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 console.log("Raw orders data from API:", res.data?.data);
//                 setOrders(res.data?.data || []);
//                 console.log("Orders fetched:", orders);
//             } catch (err) {
//                 toast.error("Failed to fetch dine-in orders");
//                 console.error(err);
//             } finally {
//                 setLoading(false);
//             }
//         })();
//     }, [clientId, token]);
//     useEffect(() => {
//         if (!clientId || !token) return;
//         (async () => {
//             try {
//                 const res = await inventoryServicesPort.get(`/${clientId}/inventory/read`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const items = res.data?.data || [];
//                 setAllInventoryItems(items);
//                 const map = {};
//                 items.forEach(item => {
//                     map[item.id] = item;
//                 });
//                 setInventoryMap(map);
//             } catch (err) {
//                 console.error("Failed to fetch inventory", err);
//             }
//         })();
//     }, [clientId, token]);

//     // Filter orders by selected date
//     const filteredOrders = useMemo(() => {
//         if (!selectedDate) return orders;
//         return orders.filter((o) => {
//             const orderDate = new Date(o.created_at);
//             const selDate = new Date(selectedDate);
//             return (
//                 orderDate.getFullYear() === selDate.getFullYear() &&
//                 orderDate.getMonth() === selDate.getMonth() &&
//                 orderDate.getDate() === selDate.getDate()
//             );
//         });
//     }, [orders, selectedDate]);



//     // Toggle row detail expansion
//     const toggleRowExpand = (id) => {
//         setExpandedRowIds((prev) => {
//             const updated = new Set(prev);
//             if (updated.has(id)) {
//                 updated.delete(id);
//             } else {
//                 updated.add(id);
//             }
//             return updated;
//         });
//     };

//     // Order status change handler
//     const handleStatusChange = async (orderId, newStatus) => {
//         const order = orders.find((o) => o.id === orderId);
//         if (!order || order.status === "served") return;
//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: orderId, client_id: clientId, status: newStatus },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );
//             toast.success("Order status updated");
//             setOrders((prev) =>
//                 prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
//             );
//             if (newStatus === "served") setEditOrderId(null);
//         } catch {
//             toast.error("Failed to update order status");
//         }
//     };

//     // Item status update
//     const handleItemStatusChange = async (orderId, itemId, newStatus) => {
//         try {
//             // Get the order from state
//             const order = orders.find(o => o.id === orderId);
//             if (!order) {
//                 toast.error("Order not found in state");
//                 return;
//             }

//             // Modify only the item you care about
//             const updatedItems = order.items.map(item =>
//                 item.item_id === itemId
//                     ? { ...item, status: newStatus }
//                     : item
//             );

//             // Strip 'id' so backend doesn't try to insert into identity column
//             const itemsForUpdate = updatedItems.map(({ id, ...rest }) => rest);

//             // Recalculate total price
//             const totalPrice = updatedItems.reduce(
//                 (sum, item) =>
//                     sum + (inventoryMap[item.item_id]?.price || 0) * (item.quantity || 1),
//                 0
//             );

//             // Send full updated list without 'id'
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${orderId}`,
//                 itemsForUpdate,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             // Update order total price in backend
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: orderId, total_price: totalPrice },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             // Update local state (with id still intact locally)
//             setOrders(prev =>
//                 prev.map(o =>
//                     o.id === orderId
//                         ? { ...o, items: updatedItems, total_price: totalPrice }
//                         : o
//                 )
//             );

//             toast.success("Item status updated");
//         } catch (err) {
//             console.error(err);
//             toast.error("Failed to update item status");
//         }
//     };




//     // Quantity update in local state only, requires save
//     const updateItemQuantity = (orderId, itemId, newQty) => {
//         if (newQty < 1) newQty = 1;
//         setOrders((prev) =>
//             prev.map((order) => {
//                 if (order.id !== orderId) return order;
//                 const updatedItems = order.items.map((item) =>
//                     item.item_id === itemId ? { ...item, quantity: newQty } : item
//                 );
//                 const newTotal = updatedItems.reduce(
//                     (sum, item) => sum + (inventoryMap[item.item_id]?.price || 0) * (item.quantity || 1),
//                     0
//                 );
//                 return { ...order, items: updatedItems, total_price: newTotal };
//             })
//         );
//     };

//     // Save updated items to backend
//     const updateOrderItems = async (orderId, updatedItems) => {
//         const cleanedItems = updatedItems.map((item) => ({
//             item_id: item.item_id || item.inventory_id,
//             item_name: item.name || item.item_name,
//             quantity: item.quantity || 1,
//             status: item.status || "new",
//             note: item.note || "",
//             slug: item.slug || "",
//             price: item.price || inventoryMap[item.item_id || item.inventory_id]?.price || 0,
//             client_id: clientId,
//             order_id: orderId,
//         }));

//         const totalPrice = cleanedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${orderId}`,
//                 cleanedItems,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: orderId, total_price: totalPrice },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             toast.success("Item statuses & total updated!");
//             setOrders((prev) =>
//                 prev.map((o) => (o.id === orderId ? { ...o, total_price: totalPrice, items: updatedItems } : o))
//             );
//         } catch {
//             toast.error("Failed to update items or total.");
//         }
//     };

//     // Cancel item from order
//     const cancelItem = async (orderId, itemId) => {
//         const order = orders.find((o) => o.id === orderId);
//         const item = order?.items.find((i) => i.item_id === itemId);
//         if (!item?.id) return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
//                 params: { order_item_id: item.id, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             const updatedOrders = orders.map((o) => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.filter((i) => i.item_id !== itemId);
//                 const newTotal = updatedItems.reduce(
//                     (sum, i) => sum + (inventoryMap[i.item_id]?.price || i.price || 0) * (i.quantity || 1),
//                     0
//                 );
//                 return { ...o, items: updatedItems, total_price: newTotal };
//             });
//             setOrders(updatedOrders);
//             const newOrder = updatedOrders.find((o) => o.id === orderId);
//             if (newOrder) {
//                 await orderServicesPort.post(
//                     `/${clientId}/dinein/update`,
//                     { id: orderId, total_price: newOrder.total_price },
//                     { headers: { Authorization: `Bearer ${token}` } }
//                 );
//             }
//             toast.success("Item cancelled and total updated");
//         } catch {
//             toast.error("Failed to cancel item");
//         }
//     };

//     // Confirm delete order
//     const confirmDeleteOrder = async () => {
//         if (!deleteTarget || deleteTarget.type !== "order") return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
//                 params: { dinein_order_id: deleteTarget.orderId, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.orderId));
//             toast.success("Order deleted");
//         } catch {
//             toast.error("Failed to delete order");
//         } finally {
//             setShowDeleteModal(false);
//             setDeleteTarget(null);
//         }
//     };

//     // Item search query changes
//     const onItemSearchChange = (orderId, query) => {
//         setItemSearchQueryMap((prev) => ({ ...prev, [orderId]: query }));

//         if (!query.trim()) {
//             setItemSearchResultsMap((prev) => ({ ...prev, [orderId]: [] }));
//             return;
//         }

//         const order = orders.find((o) => o.id === orderId);
//         const currentItemIds = order?.items.map((i) => i.item_id) || [];
//         const filteredResults = allInventoryItems
//             .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
//             .filter((item) => !currentItemIds.includes(item.id));
//         setItemSearchResultsMap((prev) => ({ ...prev, [orderId]: filteredResults }));
//     };

//     // Add item to order
//     const addItemToOrder = (orderId, selectedItem) => {
//         setOrders((prev) =>
//             prev.map((order) => {
//                 if (order.id !== orderId) return order;
//                 const newItem = {
//                     item_id: selectedItem.id,
//                     item_name: selectedItem.name,
//                     quantity: 1,
//                     price: selectedItem.price,
//                     status: "new",
//                     note: "",
//                     slug: selectedItem.slug || selectedItem.name.toLowerCase().replace(/\s+/g, "-"),
//                 };
//                 return { ...order, items: [...order.items, newItem] };
//             })
//         );
//         setItemSearchQueryMap((prev) => ({ ...prev, [orderId]: "" }));
//         setItemSearchResultsMap((prev) => ({ ...prev, [orderId]: [] }));
//     };

//     const columns = useMemo(() => [
//         {
//             field: "expand",
//             headerName: "",
//             sortable: false,
//             filterable: false,
//             width: 60, // Keep fixed so icon button doesn't stretch
//             renderCell: (params) => (
//                 <IconButton size="small" onClick={() => toggleRowExpand(params.id)}>
//                     {expandedRowIds.has(params.id) ? <ExpandLess /> : <ExpandMore />}
//                 </IconButton>
//             ),
//         },
//         {
//             field: "tableName",
//             headerName: "Table",
//             flex: 1,
//             minWidth: 130,
//         },
//         {
//             field: "itemsCount",
//             headerName: "Items",
//             flex: 0.6,
//             minWidth: 100,
//         },
//         {
//             field: "total_price",
//             headerName: "Total (₹)",
//             flex: 1,
//             minWidth: 150,
//             renderCell: (params) => {
//                 const val = Number(params.value);
//                 return isNaN(val) ? "₹0.00" : `₹${val.toFixed(2)}`;
//             },
//         },
//         {
//             field: "status",
//             headerName: "Status",
//             flex: 0.8,
//             minWidth: 150,
//             renderCell: (params) => {
//                 const status = params?.row?.status ?? "";
//                 const colorMap = {
//                     pending: { color: "orange", bg: "#fff3e0" },
//                     preparing: { color: "blue", bg: "#e3f2fd" },
//                     served: { color: "green", bg: "#e8f5e9" },
//                 };
//                 const { color, bg } = colorMap[status.toLowerCase()] || { color: "gray", bg: "#f5f5f5" };
//                 return (
//                     <Typography
//                         variant="body2"
//                         sx={{
//                             px: 1,
//                             py: 0.5,
//                             borderRadius: 1,
//                             color,
//                             backgroundColor: bg,
//                             textTransform: "capitalize",
//                         }}
//                     >
//                         {status}
//                     </Typography>
//                 );
//             },
//         },
//         {
//             field: "created_at",
//             headerName: "Date",
//             flex: 1,
//             minWidth: 150,
//             renderCell: (params) => {
//                 if (!params.value) return "";
//                 const d = new Date(params.value);
//                 return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
//             },
//         },
//         {
//             field: "actions",
//             headerName: "Actions",
//             flex: 1,
//             minWidth: 220,
//             sortable: false,
//             filterable: false,
//             renderCell: (params) => {
//                 const row = params?.row ?? {};
//                 return (
//                     <Box display="flex" gap={1}>
//                         <Button
//                             variant="contained"
//                             color="error"
//                             size="small"
//                             onClick={() => {
//                                 setDeleteTarget({ type: "order", orderId: row.id });
//                                 setShowDeleteModal(true);
//                             }}
//                         >
//                             Delete
//                         </Button>
//                     </Box>
//                 );
//             },
//         },
//     ], [editOrderId, expandedRowIds]);






//     return (
//         <Box className="orders-page-container">
//             <Box className="orders-header" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
//                 <Typography variant="h5" className="orders-title" sx={{ flex: "1 1 auto" }}>
//                     Table Orders
//                 </Typography>
//                 <Box className="orders-header-actions" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
//                     <Select
//                         size="small"
//                         value={selectedDate}
//                         onChange={(e) => setSelectedDate(e.target.value)}
//                         className="date-select"
//                     >
//                         <MenuItem value="">All Dates</MenuItem>
//                         {[...Array(15)].map((_, i) => {
//                             const d = new Date();
//                             d.setDate(d.getDate() - i);
//                             const val = d.toISOString().split("T")[0];
//                             const label = i === 0 ? "Today" : val;
//                             return (
//                                 <MenuItem key={val} value={val}>
//                                     {label}
//                                 </MenuItem>
//                             );
//                         })}
//                     </Select>
//                     <Button
//                         variant="outlined"
//                         onClick={() => {
//                             setShowExportModal(true);
//                             setExportStep(1);
//                             setExportDate("");
//                             setExportPageOption("all");
//                         }}
//                         className="btn-export"
//                     >
//                         Export
//                     </Button>
//                 </Box>
//             </Box>

//             {/* Responsive DataGrid wrapper */}
//             <Box sx={{ width: "100%", overflowX: "auto" }}>
//                 <DataGrid
//                     autoHeight
//                     rows={filteredOrders.map(o => ({
//                         id: o.id,
//                         table_id: o.table_id,
//                         tableName: tablesMap[String(o.table_id)] ?? "No Table",
//                         itemsCount: Array.isArray(o.items) ? o.items.length : 0,
//                         total_price: Number(o.total_price),
//                         status: o.status,
//                         created_at: o.created_at,
//                     }))}
//                     columns={columns}
//                     loading={loading}
//                     getRowId={(row) => row.id}
//                     pageSizeOptions={[5, 10, 20, 50]}
//                     pagination
//                     initialState={{
//                         pagination: { paginationModel: { pageSize: 10, page: 0 } }
//                     }}
//                     disableRowSelectionOnClick
//                     className="orders-data-grid"
//                     sx={{
//                         minWidth: "600px", // ensures columns don't shrink too much
//                         "& .MuiDataGrid-columnHeaders": { whiteSpace: "nowrap" },
//                     }}
//                 />
//             </Box>

//             {/* Expanded rows below grid */}
//             {Array.from(expandedRowIds).map((orderId) => {
//                 const order = orders.find((o) => o.id === orderId);
//                 if (!order) return null;
//                 const isEditing = orderId === editOrderId;

//                 return (
//                     <Box key={order.id} className="order-detail-container">
//                         <Box className="order-actions-row">
//                             {order.status !== "served" && (
//                                 <>
//                                     <Button
//                                         variant="outlined"
//                                         size="small"
//                                         color="error"
//                                         className="btn-delete-order"
//                                         onClick={() => {
//                                             setDeleteTarget({ type: "order", orderId: order.id });
//                                             setShowDeleteModal(true);
//                                         }}
//                                     >
//                                         Delete Order
//                                     </Button>
//                                     {["pending", "preparing", "served"].map((status) => (
//                                         <Button
//                                             key={status}
//                                             size="small"
//                                             variant={order.status === status ? "contained" : "outlined"}
//                                             className={`btn-status btn-status-${status}`}
//                                             onClick={() => handleStatusChange(order.id, status)}
//                                         >
//                                             {status}
//                                         </Button>
//                                     ))}
//                                     <Button
//                                         variant="outlined"
//                                         size="small"
//                                         className="btn-edit-toggle"
//                                         onClick={() => setEditOrderId((prev) => (prev === order.id ? null : order.id))}
//                                     >
//                                         {isEditing ? "Cancel Edit" : "Edit"}
//                                     </Button>
//                                 </>
//                             )}
//                         </Box>

//                         <Box className="order-items-wrapper">
//                             <table className="order-items-table">
//                                 <thead>
//                                     <tr>
//                                         <th>Item(s)</th>
//                                         <th>Quantity</th>
//                                         <th>Status</th>
//                                         <th>Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {order.items.map((item) => (
//                                         <tr key={item.item_id}>
//                                             <td>{item.item_name || item.item_id}</td>
//                                             <td>
//                                                 {isEditing ? (
//                                                     <Box className="quantity-controls">
//                                                         <Button
//                                                             size="small"
//                                                             variant="outlined"
//                                                             disabled={item.quantity <= 1}
//                                                             onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity - 1)}
//                                                             className="btn-quantity-minus"
//                                                         >
//                                                             −
//                                                         </Button>
//                                                         <Typography className="quantity-text">{item.quantity}</Typography>
//                                                         <Button
//                                                             size="small"
//                                                             variant="outlined"
//                                                             onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity + 1)}
//                                                             className="btn-quantity-plus"
//                                                         >
//                                                             +
//                                                         </Button>
//                                                     </Box>
//                                                 ) : (
//                                                     item.quantity
//                                                 )}
//                                             </td>
//                                             <td>
//                                                 <Typography
//                                                     variant="body2"
//                                                     className={`item-status item-status-${item.status}`}
//                                                 >
//                                                     {item.status}
//                                                 </Typography>
//                                             </td>
//                                             <td>
//                                                 {["new", "preparing", "served"].map((status) => (
//                                                     <Button
//                                                         key={status}
//                                                         size="small"
//                                                         variant={item.status === status ? "contained" : "outlined"}
//                                                         onClick={() => handleItemStatusChange(order.id, item.item_id, status)}
//                                                         disabled={item.status === "served" || item.status === "cancelled"}
//                                                         className={`btn-item-status btn-item-status-${status}`}
//                                                     >
//                                                         {status}
//                                                     </Button>
//                                                 ))}
//                                                 {isEditing && (
//                                                     <Button
//                                                         size="small"
//                                                         color="error"
//                                                         variant="outlined"
//                                                         onClick={() => {
//                                                             setDeleteTarget({ type: "item", orderId: order.id, itemId: item.item_id });
//                                                             setShowDeleteModal(true);
//                                                         }}
//                                                         disabled={item.status === "cancelled"}
//                                                         className="btn-delete-item"
//                                                     >
//                                                         Delete
//                                                     </Button>
//                                                 )}
//                                             </td>
//                                         </tr>
//                                     ))}

//                                     {isEditing && order.status !== "served" && (
//                                         <tr>
//                                             <td colSpan={4} className="add-item-row">
//                                                 <TextField
//                                                     fullWidth
//                                                     size="small"
//                                                     label="Search item to add..."
//                                                     variant="outlined"
//                                                     value={itemSearchQueryMap[order.id] || ""}
//                                                     onChange={(e) => onItemSearchChange(order.id, e.target.value)}
//                                                     className="item-search-field"
//                                                 />
//                                                 {itemSearchResultsMap[order.id]?.length > 0 && (
//                                                     <Box className="item-search-results">
//                                                         {itemSearchResultsMap[order.id].map((item) => (
//                                                             <Box
//                                                                 key={item.id}
//                                                                 className="item-search-result"
//                                                                 onClick={() => addItemToOrder(order.id, item)}
//                                                             >
//                                                                 {item.name} - ₹{item.price}
//                                                             </Box>
//                                                         ))}
//                                                     </Box>
//                                                 )}
//                                             </td>
//                                         </tr>
//                                     )}
//                                 </tbody>
//                                 {isEditing && (
//                                     <tfoot>
//                                         <tr>
//                                             <td colSpan={4} className="save-items-footer">
//                                                 <Button
//                                                     variant="contained"
//                                                     color="success"
//                                                     onClick={() => updateOrderItems(order.id, order.items)}
//                                                     className="btn-save-items"
//                                                 >
//                                                     Save Items
//                                                 </Button>
//                                             </td>
//                                         </tr>
//                                     </tfoot>
//                                 )}
//                             </table>
//                         </Box>
//                     </Box>
//                 );
//             })}

//             {/* Delete confirmation dialog */}
//             <Dialog
//                 open={showDeleteModal}
//                 onClose={() => setShowDeleteModal(false)}
//                 maxWidth="xs"
//                 fullWidth
//                 className="delete-dialog"
//             >
//                 <DialogTitle>Delete {deleteTarget?.type === "order" ? "order" : "item"}?</DialogTitle>
//                 <DialogContent>
//                     Want to delete {deleteTarget?.type === "order" ? "order" : "item"}?
//                 </DialogContent>
//                 <DialogActions>
//                     <Button
//                         onClick={() => {
//                             if (deleteTarget?.type === "order") confirmDeleteOrder();
//                             else if (deleteTarget?.type === "item") {
//                                 cancelItem(deleteTarget.orderId, deleteTarget.itemId);
//                             }
//                             setShowDeleteModal(false);
//                             setDeleteTarget(null);
//                         }}
//                         color="error"
//                         className="btn-confirm-delete"
//                     >
//                         Yes
//                     </Button>
//                     <Button onClick={() => setShowDeleteModal(false)} className="btn-cancel-delete">No</Button>
//                 </DialogActions>
//             </Dialog>

//             {/* Export Dialog */}
//             {/* Export Orders Dialog */}
//             <Dialog
//                 open={showExportModal}
//                 onClose={() => setShowExportModal(false)}
//                 maxWidth="xs"
//                 fullWidth
//                 className="export-dialog"
//             >
//                 <DialogTitle>Export Orders</DialogTitle>
//                 <DialogContent>
//                     {!exportStep || exportStep === 1 ? (
//                         <>
//                             <Typography>Select date to export:</Typography>
//                             <Select
//                                 fullWidth
//                                 value={exportDate}
//                                 onChange={(e) => setExportDate(e.target.value)}
//                                 sx={{ marginTop: 1, marginBottom: 2 }}
//                             >
//                                 <MenuItem value="">All Dates</MenuItem>
//                                 {[...Array(15)].map((_, i) => {
//                                     const d = new Date();
//                                     d.setDate(d.getDate() - i);
//                                     const val = d.toISOString().split("T")[0];
//                                     const label = i === 0 ? "Today" : val;
//                                     return (
//                                         <MenuItem key={val} value={val}>
//                                             {label}
//                                         </MenuItem>
//                                     );
//                                 })}
//                             </Select>
//                         </>
//                     ) : null}

//                     {exportStep === 2 && (
//                         <>
//                             <Typography>Which orders to export?</Typography>
//                             <Select
//                                 fullWidth
//                                 value={exportPageOption}
//                                 onChange={(e) => setExportPageOption(e.target.value)}
//                                 sx={{ marginTop: 1, marginBottom: 2 }}
//                             >
//                                 <MenuItem value="all">All Orders</MenuItem>
//                                 <MenuItem value="first">First Page</MenuItem>
//                                 <MenuItem value="last">Last Page</MenuItem>
//                             </Select>
//                         </>
//                     )}
//                 </DialogContent>
//                 <DialogActions>
//                     <Button
//                         onClick={() => {
//                             if (exportStep === 1) {
//                                 // Validate date (empty string is allowed as "all dates")
//                                 if (exportDate === null) {
//                                     alert("Please select a date");
//                                     return;
//                                 }
//                                 setExportStep(2);
//                             } else if (exportStep === 2) {
//                                 onExportClick();  // <-- call your function here
//                             }
//                         }}
//                         variant="contained"
//                         color="primary"
//                     >
//                         {exportStep === 2 ? "Export" : "Next"}
//                     </Button>

//                     <Button
//                         onClick={() => {
//                             setShowExportModal(false);
//                             setExportStep(1);
//                             setExportDate("");
//                             setExportPageOption("all");
//                         }}
//                     >
//                         Cancel
//                     </Button>
//                 </DialogActions>

//             </Dialog>

//         </Box>

//     );
// };

// export default OrdersVisiblePage;
