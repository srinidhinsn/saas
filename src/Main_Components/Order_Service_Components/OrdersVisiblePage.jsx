import React, { useEffect, useState } from "react";
import orderServicesPort from "../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
import { useParams } from "react-router-dom";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { toast } from "react-toastify";
import InvoiceModal from "../Invoice_Services_Components/Invoice_Page";
import { MdOutlineKeyboardDoubleArrowDown } from "react-icons/md";


const OrdersVisiblePage = () => {
    const { clientId } = useParams();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);
    const [servedClickCountMap, setServedClickCountMap] = useState({});
    const { darkMode } = useTheme();
    const token = localStorage.getItem("access_token");
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
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceOrder, setInvoiceOrder] = useState(null);
    const [tableId, setTableId] = useState(null)
    useEffect(() => {
        if (tableId) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableId]);

    const statusColorMap = {
        pending: "blue",
        served: "var(--status-served-bg)",
        new: "red",
    };

    const openInvoiceModal = (order) => {
        const tableName = tablesMap[order.table_id] || order.table_id;
        const itemsWithPrice = (order.items || []).map((item) => ({
            ...item,
            price: item.price || inventoryMap[item.item_id]?.price || 0,
        }));
        setInvoiceOrder({ ...order, table_name: tableName, items: itemsWithPrice });
        setShowInvoiceModal(true);
    };

    const closeInvoiceModal = () => {
        setInvoiceOrder(null);
        setShowInvoiceModal(false);
    };

    useEffect(() => {
        inventoryServicesPort
            .get(`/${clientId}/inventory/read`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setAllInventoryItems(res.data.data || []);
            })
            .catch(() => { });
    }, [clientId, token]);

    useEffect(() => {
        if (
            expandedOrderIndex === null ||
            expandedOrderIndex === undefined ||
            !orders[expandedOrderIndex] ||
            itemSearchQuery.trim() === ""
        ) {
            setItemSearchResults([]);
            return;
        }
        const currentOrderItems = orders[expandedOrderIndex].items.map((i) =>
            i.item_id.toString()
        );
        const filtered = allInventoryItems
            .filter((item) =>
                (item.name || "").toLowerCase().includes(itemSearchQuery.toLowerCase())
            )
            .filter((item) => !currentOrderItems.includes(item.id.toString()));
        setItemSearchResults(filtered);
    }, [itemSearchQuery, allInventoryItems, expandedOrderIndex, orders]);

    const addItemToOrder = (orderId, selectedItem) => {
        let targetItems = [];
        setOrders((prevOrders) => {
            return prevOrders.map((order) => {
                if (order.id !== orderId) return order;
                const newItem = {
                    item_id: selectedItem.id,
                    item_name: selectedItem.name,
                    quantity: 1,
                    price: selectedItem.price,
                    status: "new",
                    note: "",
                    slug: selectedItem.slug || selectedItem.name.replace(/[\s]+/g, "-").toLowerCase(),
                };
                const newItems = [...order.items, newItem];
                targetItems = newItems;
                return {
                    ...order,
                    items: newItems,
                };
            });
        });
        setTimeout(() => {
            updateOrderItems(orderId, targetItems);
        }, 0);
        setItemSearchQuery("");
        setItemSearchResults([]);
    };

    const updateItemQuantity = (orderId, itemId, newQty) => {
        setOrders((prev) =>
            prev.map((order) => {
                if (order.id !== orderId) return order;
                const updatedItems = order.items.map((item) =>
                    item.item_id === itemId ? { ...item, quantity: newQty > 0 ? newQty : 1 } : item
                );
                const newTotal = updatedItems.reduce((sum, item) => {
                    const itemPrice = inventoryMap[item.item_id]?.price || 0;
                    return sum + item.quantity * itemPrice;
                }, 0);
                return {
                    ...order,
                    items: updatedItems,
                    total_price: newTotal,
                };
            })
        );
        setEditedItemsMap((prev) => {
            const currentItems = orders.find((o) => o.id === orderId)?.items || [];
            const updated = currentItems.map((item) =>
                item.item_id === itemId ? { ...item, quantity: newQty > 0 ? newQty : 1 } : item
            );
            return { ...prev, [orderId]: updated };
        });
    };

    useEffect(() => {
        document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const response = await orderServicesPort.get(`/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setOrders(response.data?.data || []);
                setLoading(false);
            } catch (error) {
                toast.error("❌ Failed to fetch dine-in orders.");
                setLoading(false);
            }
        };
        if (clientId) {
            fetchOrders();
        }
    }, [clientId, token]);

    // ONLY ONE container expands at a time
    const toggleExpand = (index) => {
        setExpandedOrderIndex((prev) => (prev === index ? null : index));
    };

    // Click three times to mark served
    const handleContainerClick = (orderId) => {
        const count = servedClickCountMap[orderId] || 0;
        const newCount = count + 1;
        setServedClickCountMap((prev) => ({ ...prev, [orderId]: newCount }));
        if (newCount >= 3) {
            handleStatusChange(orderId, "served");
            setServedClickCountMap((prev) => ({ ...prev, [orderId]: 0 }));
        }
    };
    const handleStatusChange = async (orderId, newStatus) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order || order.status === "served") return;

        try {
            // 1. Update order status
            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: orderId, client_id: clientId, status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // 2. If served, also free the table
            if (newStatus === "served") {
                await tableServicesPort.post(
                    `/${clientId}/tables/update`,
                    {
                        id: order.table_id,
                        client_id: clientId, // ✅ required by backend
                        name: tablesMap[order.table_id] || `Table ${order.table_id}`,
                        table_type: "Standard", // or use your real type if available
                        status: "Vacant",
                        location_zone: null
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                // ✅ update local table state so UI reflects immediately
                setTablesMap((prev) => ({
                    ...prev,
                    [order.table_id]: tablesMap[order.table_id] || `Table ${order.table_id}`
                }));
            }

            toast.success("Order status updated");

            // update orders state
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            );

            if (newStatus === "served") setEditOrderId(null);
        } catch (err) {
            toast.error("❌ Failed to update order status.");
        }
    };



    const handleItemStatusChange = async (orderId, itemId, newStatus) => {
        try {
            const order = orders.find((o) => o.id === orderId);
            if (!order) return toast.error("Order not found in state");
            const updatedItems = order.items.map((item) =>
                item.item_id === itemId ? { ...item, status: newStatus } : item
            );
            const itemsForUpdate = updatedItems.map(({ id, ...rest }) => rest);
            const totalPrice = updatedItems.reduce(
                (sum, item) => sum + (inventoryMap[item.item_id]?.price || 0) * (item.quantity || 1),
                0
            );
            await orderServicesPort.post(
                `/${clientId}/order_items/update?order_id=${orderId}`,
                itemsForUpdate,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: orderId, total_price: totalPrice },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, items: updatedItems, total_price: totalPrice } : o))
            );
            toast.success("Item status updated");
        } catch (err) {
            toast.error("Failed to update item status");
        }
    };

    const cancelItem = async (orderId, itemId) => {
        const order = orders.find((o) => o.id === orderId);
        const item = order?.items.find((i) => i.item_id === itemId);
        if (!item?.id) return;
        try {
            await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
                params: { order_item_id: item.id, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });
            const updatedOrders = orders.map((o) => {
                if (o.id !== orderId) return o;
                const updatedItems = o.items.filter((i) => i.item_id !== itemId);
                const newTotal = updatedItems.reduce((sum, item) => {
                    const price = inventoryMap[item.item_id]?.price || item.price || 0;
                    return sum + (item.quantity || 1) * price;
                }, 0);
                return { ...o, items: updatedItems, total_price: newTotal };
            });
            setOrders(updatedOrders);
            const newOrder = updatedOrders.find((o) => o.id === orderId);
            if (newOrder) {
                await orderServicesPort.post(
                    `/${clientId}/dinein/update`,
                    { id: orderId, total_price: newOrder.total_price },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            setEditedItemsMap((prev) => {
                const updated = (prev[orderId] || []).filter((i) => i.item_id !== itemId);
                return { ...prev, [orderId]: updated };
            });
            toast.success("Item cancelled and total updated");
        } catch (err) {
            toast.error("❌ Failed to cancel item.");
        }
    };

    const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
        const cleanedItems = updatedItemsWithStatuses.map((item) => ({
            item_id: item.item_id || item.inventory_id,
            item_name: item.name || item.item_name,
            quantity: item.quantity || 1,
            status: item.status || "new",
            note: item.note || "",
            slug: item.slug || "",
            price: item.price || inventoryMap[item.item_id || item.inventory_id]?.price || 0,
            client_id: clientId,
            order_id: orderId,
        }));
        const totalPrice = cleanedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        try {
            await orderServicesPort.post(
                `/${clientId}/order_items/update?order_id=${orderId}`,
                cleanedItems,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: orderId, total_price: totalPrice },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Item statuses & total updated!");
        } catch (err) {
            toast.error("Failed to update items or total.");
        }
    };

    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
                params: { dinein_order_id: orderToDelete, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
            setExpandedOrderIndex(null);
            toast.success("Order deleted");
        } catch (err) {
            toast.error("❌ Failed to delete order");
        } finally {
            setShowDeleteModal(false);
            setOrderToDelete(null);
        }
    };

    useEffect(() => {
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
            } catch (error) { }
        };
        fetchTables();
    }, [clientId, token]);

    useEffect(() => {
        const fetchInventory = async () => {
            if (!token || !clientId) return;
            try {
                const res = await inventoryServicesPort.get(`/${clientId}/inventory/read`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const inventoryList = res.data?.data || [];
                const map = {};
                inventoryList.forEach((item) => {
                    map[item.id] = item; // Includes price
                });
                setInventoryMap(map);
            } catch (error) { }
        };
        fetchInventory();
    }, [clientId, token]);

    let filteredOrders = selectedDate
        ? orders.filter((order) => {
            const orderDate = new Date(order.created_at).toLocaleDateString("en-CA");
            return orderDate === selectedDate;
        })
        : orders;

    switch (filterMode) {
        case 0: // Ascending date
            filteredOrders = [...filteredOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 1: // Descending date
            filteredOrders = [...filteredOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 2: // New orders
            filteredOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "new");
            break;
        case 3: // Preparing orders
            filteredOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "preparing");
            break;
        case 4: // Served orders
            filteredOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "served");
            break;
        default:
            break;
    }

    return (
        <div className="OrderSummary-Page-Container"><div className="orders-visible-root">
            <div className="orders-visible-content">
                <div className="orders-visible-header">
                    <h2>Table Orders</h2>
                    <div className="orders-visible-actions">
                        <select
                            className="orders-visible-date-filter"
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
                        <button className="orders-visible-btn orders-visible-export-btn">Export</button>
                        <button
                            className="orders-visible-btn orders-visible-filter-btn"
                            onClick={() => setFilterMode((prev) => (prev + 1) % 5)}
                        >
                            Filter
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="orders-visible-loading">Loading orders...</div>
                ) : (
                    <div className="orders-visible-order-grid">
                        {filteredOrders.length === 0 ? (
                            <div className="orders-visible-no-orders">No orders found.</div>
                        ) : (
                            filteredOrders.map((order, index) => (
                                <div
                                    key={order.id || index}
                                    className={`orders-visible-order-card${expandedOrderIndex === index ? " expanded" : ""}`}
                                    style={{
                                        backgroundColor: statusColorMap[order.status?.toLowerCase()] || "var(--status-prepare-bg)",
                                    }}
                                    onClick={() => handleContainerClick(order.id)}
                                >
                                    <div className="orders-visible-card-top-row">
                                        <span className="orders-visible-tablename">{tablesMap[order.table_id] || order.table_id}</span>
                                        <span className="orders-visible-items-count">{order.items.length} items</span>
                                        <button className="orders-visible-invoice-btn" onClick={(e) => { e.stopPropagation(); openInvoiceModal(order); }}>
                                            Invoice
                                        </button>
                                        <button
                                            className="orders-visible-expand-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpand(index);
                                            }}
                                        >
                                            <span className={`orders-visible-arrow-icon${expandedOrderIndex === index ? " " : "up"}`}>
                                                <MdOutlineKeyboardDoubleArrowDown />
                                            </span>
                                        </button>
                                    </div>

                                    <div
                                        className="orders-visible-card-expand-section"
                                        style={{
                                            display: expandedOrderIndex === index ? "block" : "none",
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="orders-visible-expanded-info">
                                            <span>Date: {new Date(order.created_at).toLocaleDateString()}</span>
                                            <span>Price: ₹{parseFloat(order.total_price || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="orders-visible-expanded-actions">
                                            {editOrderId === order.id ? (
                                                <button
                                                    className="orders-visible-btn orders-visible-edit-btn active"
                                                    onClick={() => setEditOrderId((prev) => (prev === order.id ? null : order.id))}
                                                >
                                                    Done Editing
                                                </button>
                                            ) : (
                                                <button className="orders-visible-btn orders-visible-edit-btn" onClick={() => setEditOrderId(order.id)}>
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                className="orders-visible-btn orders-visible-served-btn"
                                                disabled={order.status === "served"}
                                                onClick={() => handleStatusChange(order.id, "served")}
                                            >
                                                Served
                                            </button>
                                            <button
                                                className="orders-visible-btn orders-visible-delete-btn"
                                                onClick={() => {
                                                    setOrderToDelete(order.id);
                                                    setShowDeleteModal(true);
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>

                                        {editOrderId === order.id && (
                                            <div className="orders-visible-edit-panel">
                                                <div className="orders-visible-edit-items-list">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="orders-visible-edit-item-row">
                                                            <span>{item.item_name || item.item_id}</span>
                                                            <div className="orders-visible-edit-qty-controls">
                                                                <button
                                                                    onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity - 1)}
                                                                    disabled={item.quantity <= 1}
                                                                >
                                                                    −
                                                                </button>
                                                                <span>{item.quantity}</span>
                                                                <button onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity + 1)}>+</button>
                                                            </div>
                                                            <button
                                                                className="orders-visible-btn orders-visible-edit-delete-btn"
                                                                onClick={() => {
                                                                    setDeleteTarget({ orderId: order.id, itemId: item.item_id });
                                                                    setShowDeleteModals(true);
                                                                }}
                                                                disabled={item.status === "cancelled"}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="orders-visible-add-item-row">
                                                    <input
                                                        type="text"
                                                        className="orders-visible-item-search"
                                                        placeholder="Search item to add..."
                                                        value={itemSearchQuery}
                                                        onChange={(e) => setItemSearchQuery(e.target.value)}
                                                    />
                                                    {itemSearchResults.length > 0 && (
                                                        <ul className="orders-visible-search-results">
                                                            {itemSearchResults.map((item) => (
                                                                <li key={item.id} onClick={() => addItemToOrder(order.id, item)}>
                                                                    {item.name} - ₹{item.price}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                                <div className="orders-visible-save-row">
                                                    <button className="orders-visible-btn orders-visible-save-btn" onClick={() => updateOrderItems(order.id, order.items)}>
                                                        Save Items
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {showDeleteModals && deleteTarget && (
                    <div className="orders-visible-modal-overlay">
                        <div className="orders-visible-modal orders-visible-delete-modal">
                            <p>Delete this item?</p>
                            <div className="orders-visible-modal-buttons">
                                <button
                                    className="orders-visible-btn orders-visible-modal-yes"
                                    onClick={() => {
                                        cancelItem(deleteTarget.orderId, deleteTarget.itemId);
                                        setShowDeleteModals(false);
                                        setDeleteTarget({ orderId: null, itemId: null });
                                    }}
                                >
                                    Yes
                                </button>
                                <button
                                    className="orders-visible-btn orders-visible-modal-no"
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
                    <div className="orders-visible-modal-overlay">
                        <div className="orders-visible-modal orders-visible-confirm-delete-modal">
                            <h3>Delete this order?</h3>
                            <div className="orders-visible-modal-buttons">
                                <button className="orders-visible-btn orders-visible-modal-yes" onClick={confirmDeleteOrder}>
                                    Yes
                                </button>
                                <button
                                    className="orders-visible-btn orders-visible-modal-no"
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

                {showInvoiceModal && invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={closeInvoiceModal} />}
            </div>
        </div></div>
    );
};

export default OrdersVisiblePage;


// =================================================================================================================== //

// import React, { useEffect, useState, useCallback, useMemo } from "react";
// import { DataGrid, GridToolbarContainer, GridToolbarExport, GridActionsCellItem } from "@mui/x-data-grid";
// import { Box, Button, IconButton, TextField, Select, MenuItem, Modal, Typography } from "@mui/material";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import {
//     Delete as DeleteIcon,
//     Edit as EditIcon,
//     RemoveCircleOutline as CancelIcon,
//     Receipt as InvoiceIcon,
//     ArrowUpward as StatusArrowIcon,
// } from "@mui/icons-material";

// import orderServicesPort from "../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../Backend_Port_Files/TableServices";
// import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";

// import InvoiceModal from "../Invoice_Services_Components/Invoice_Page";

// const OrdersDataGridPage = () => {
//     const { clientId } = useParams();
//     const { darkMode } = useTheme();
//     const token = localStorage.getItem("access_token");

//     // Orders & related states
//     const [orders, setOrders] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [inventoryMap, setInventoryMap] = useState({});
//     const [tablesMap, setTablesMap] = useState({});

//     // For filtering by date & status (mimic your filterMode and selectedDate)
//     const todayDate = new Date().toISOString().split("T")[0];
//     const [selectedDate, setSelectedDate] = useState(todayDate);
//     const [filterMode, setFilterMode] = useState(0);
//     // 0 = ascending date, 1 = descending date, 2 = new, 3 = preparing, 4 = served

//     // Edit mode and modals
//     const [editOrderId, setEditOrderId] = useState(null);
//     const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
//     const [orderToDelete, setOrderToDelete] = useState(null);

//     const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
//     const [itemToDelete, setItemToDelete] = useState({ orderId: null, itemId: null });

//     const [showInvoiceModal, setShowInvoiceModal] = useState(false);
//     const [invoiceOrder, setInvoiceOrder] = useState(null);

//     // Item search for adding items when editing
//     const [allInventoryItems, setAllInventoryItems] = useState([]);
//     const [itemSearchQuery, setItemSearchQuery] = useState("");
//     const [itemSearchResults, setItemSearchResults] = useState([]);

//     // Maintain edited items map to track quantity changes before saving
//     const [editedItemsMap, setEditedItemsMap] = useState({});

//     // Fetch orders
//     useEffect(() => {
//         if (!token) {
//             setLoading(false);
//             return;
//         }

//         const fetchOrders = async () => {
//             try {
//                 const response = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 setOrders(response.data?.data || []);
//             } catch (error) {
//                 toast.error(error?.response?.data?.detail || "Failed to fetch dine-in orders.");
//             } finally {
//                 setLoading(false);
//             }
//         };

//         if (clientId) fetchOrders();
//     }, [clientId, token]);

//     // Fetch tables map
//     useEffect(() => {
//         const fetchTables = async () => {
//             try {
//                 const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const map = {};
//                 (res.data?.data || []).forEach((t) => {
//                     map[t.id] = t.name;
//                 });
//                 setTablesMap(map);
//             } catch {
//                 // ignore errors silently or handle
//             }
//         };
//         fetchTables();
//     }, [clientId, token]);

//     // Fetch inventory map & all items list
//     useEffect(() => {
//         const fetchInventory = async () => {
//             try {
//                 const res = await inventoryServicesPort.get(`/${clientId}/inventory/read`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const invMap = {};
//                 (res.data?.data || []).forEach((item) => {
//                     invMap[item.id] = item;
//                 });
//                 setInventoryMap(invMap);
//                 setAllInventoryItems(res.data?.data || []);
//             } catch {
//                 // Handle error if needed
//             }
//         };
//         if (clientId && token) fetchInventory();
//     }, [clientId, token]);

//     // Filter & sort orders for grid rows based on your selectedDate and filterMode logic
//     const filteredOrders = useMemo(() => {
//         let filtered = selectedDate
//             ? orders.filter((order) => {
//                 const dateStr = new Date(order.created_at).toLocaleDateString("en-CA");
//                 return dateStr === selectedDate;
//             })
//             : orders;

//         switch (filterMode) {
//             case 0:
//                 filtered = filtered.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
//                 break;
//             case 1:
//                 filtered = filtered.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
//                 break;
//             case 2:
//                 filtered = filtered.filter((o) => (o.status || "").toLowerCase() === "new");
//                 break;
//             case 3:
//                 filtered = filtered.filter((o) => (o.status || "").toLowerCase() === "preparing");
//                 break;
//             case 4:
//                 filtered = filtered.filter((o) => (o.status || "").toLowerCase() === "served");
//                 break;
//             default:
//                 break;
//         }
//         return filtered;
//     }, [orders, selectedDate, filterMode]);

//     // Prepare rows for the grid: add id for DataGrid as order.id (required unique key)
//     const rows = useMemo(() => {
//         return filteredOrders.map((order) => ({
//             id: order.id,
//             tableName: tablesMap[order.table_id] || order.table_id,
//             itemsCount: order.items.length,
//             totalPrice: parseFloat(order.total_price || 0).toFixed(2),
//             status: order.status || "",
//             createdAt: new Date(order.created_at).toLocaleDateString(),
//             rawOrder: order, // keep full order for use in custom cells & modals
//         }));
//     }, [filteredOrders, tablesMap]);

//     // Handlers for modals
//     const openInvoiceModal = (order) => {
//         const tableName = tablesMap[order.table_id] || order.table_id;
//         // Enrich items with price from inventoryMap if missing
//         const itemsWithPrice = (order.items || []).map((item) => ({
//             ...item,
//             price: item.price || inventoryMap[item.item_id]?.price || 0,
//         }));
//         setInvoiceOrder({ ...order, table_name: tableName, items: itemsWithPrice });
//         setShowInvoiceModal(true);
//     };
//     const closeInvoiceModal = () => {
//         setInvoiceOrder(null);
//         setShowInvoiceModal(false);
//     };

//     // Confirm and cancel order deletion
//     const confirmDeleteOrder = async () => {
//         if (!orderToDelete) return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
//                 params: { dinein_order_id: orderToDelete, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
//             setShowDeleteOrderModal(false);
//             setOrderToDelete(null);
//             toast.success("Order deleted");
//         } catch {
//             toast.error("Failed to delete order");
//         }
//     };

//     // Confirm and cancel item deletion
//     const confirmDeleteItem = async () => {
//         if (!itemToDelete.orderId || !itemToDelete.itemId) return;
//         const { orderId, itemId } = itemToDelete;
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
//                 const newTotal = updatedItems.reduce((sum, it) => {
//                     return sum + (inventoryMap[it.item_id]?.price || it.price || 0) * (it.quantity || 1);
//                 }, 0);
//                 return { ...o, items: updatedItems, total_price: newTotal };
//             });

//             setOrders(updatedOrders);

//             // Update total_price on backend
//             const newOrder = updatedOrders.find((o) => o.id === orderId);
//             if (newOrder) {
//                 await orderServicesPort.post(
//                     `/${clientId}/dinein/update`,
//                     { id: orderId, total_price: newOrder.total_price },
//                     { headers: { Authorization: `Bearer ${token}` } }
//                 );
//             }

//             setShowDeleteItemModal(false);
//             setItemToDelete({ orderId: null, itemId: null });
//             toast.success("Item cancelled and total updated");
//         } catch {
//             toast.error("Failed to cancel item");
//         }
//     };

//     // Handle status change of order (served)
//     const handleStatusChange = async (orderId, newStatus) => {
//         const order = orders.find((o) => o.id === orderId);
//         if (!order || order.status === "served") return;

//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: orderId, client_id: clientId, status: newStatus },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             setOrders((prev) =>
//                 prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
//             );

//             toast.success("Order status updated");

//             if (newStatus === "served") {
//                 setEditOrderId(null);
//             }
//         } catch {
//             toast.error("Failed to update order status");
//         }
//     };

//     // Handle item status changes and update backend + state
//     const handleItemStatusChange = async (orderId, itemId, newStatus) => {
//         try {
//             const order = orders.find((o) => o.id === orderId);
//             if (!order) {
//                 toast.error("Order not found");
//                 return;
//             }
//             const updatedItems = order.items.map((item) =>
//                 item.item_id === itemId ? { ...item, status: newStatus } : item
//             );

//             const totalPrice = updatedItems.reduce(
//                 (sum, item) =>
//                     sum +
//                     (Number(inventoryMap[item.item_id]?.price) || 0) *
//                     (Number(item.quantity) || 1),
//                 0
//             );


//             // Strip 'id' to avoid identity column errors in backend
//             const itemsForUpdate = updatedItems.map(({ id, ...rest }) => rest);

//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${orderId}`,
//                 itemsForUpdate,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: orderId, total_price: totalPrice },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             setOrders((prev) =>
//                 prev.map((o) =>
//                     o.id === orderId ? { ...o, items: updatedItems, total_price: totalPrice } : o
//                 )
//             );

//             toast.success("Item status updated");
//         } catch {
//             toast.error("Failed to update item status");
//         }
//     };

//     // Add item search filtering excluding current items in order
//     useEffect(() => {
//         if (!editOrderId) {
//             setItemSearchResults([]);
//             setItemSearchQuery("");
//             return;
//         }
//         const currentOrder = orders.find((o) => o.id === editOrderId);
//         if (!currentOrder) return;

//         const currentItemIds = currentOrder.items.map((i) => i.item_id.toString());
//         const filtered = allInventoryItems
//             .filter((item) => item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
//             .filter((item) => !currentItemIds.includes(item.id.toString()));

//         setItemSearchResults(filtered);
//     }, [itemSearchQuery, allInventoryItems, editOrderId, orders]);

//     // Add item to order
//     const addItemToOrder = (orderId, selectedItem) => {
//         setOrders((prevOrders) =>
//             prevOrders.map((order) => {
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

//         setItemSearchQuery("");
//         setItemSearchResults([]);
//     };

//     // Update item quantity locally
//     const updateItemQuantity = (orderId, itemId, newQty) => {
//         setOrders((prev) =>
//             prev.map((order) => {
//                 if (order.id !== orderId) return order;
//                 const updatedItems = order.items.map((item) =>
//                     item.item_id === itemId ? { ...item, quantity: Math.max(newQty, 1) } : item
//                 );
//                 const newTotal = updatedItems.reduce(
//                     (sum, item) => sum + (inventoryMap[item.item_id]?.price || 0) * item.quantity,
//                     0
//                 );
//                 return { ...order, items: updatedItems, total_price: newTotal };
//             })
//         );
//     };

//     // Save edited items (update backend)
//     const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
//         // Clean and format items for backend
//         const cleanedItems = updatedItemsWithStatuses.map((item) => ({
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

//             toast.success("Items & total updated!");
//             setEditOrderId(null);
//         } catch {
//             toast.error("Failed to update items or total.");
//         }
//     };

//     // Define columns with sorting and action buttons
//     const columns = useMemo(
//         () => [
//             {
//                 field: "tableName",
//                 headerName: "Table",
//                 width: 120,
//                 sortable: true,
//             },
//             {
//                 field: "itemsCount",
//                 headerName: "Items",
//                 width: 90,
//                 sortable: false,
//             },
//             {
//                 field: "totalPrice",
//                 headerName: "Total Price (₹)",
//                 width: 130,
//                 sortable: true,
//                 valueGetter: (params) => parseFloat(params.value),
//             },
//             {
//                 field: "status",
//                 headerName: "Status",
//                 width: 120,
//                 sortable: true,
//                 cellClassName: (params) => `status-${params.value?.toLowerCase()}`,
//                 renderCell: (params) => <strong>{params.value}</strong>,
//             },
//             {
//                 field: "createdAt",
//                 headerName: "Date",
//                 width: 120,
//                 sortable: true,
//             },
//             {
//                 field: "actions",
//                 headerName: "Actions",
//                 type: "actions",
//                 width: 210,
//                 getActions: (params) => {
//                     const order = params.row.rawOrder;
//                     return [
//                         <GridActionsCellItem
//                             icon={<InvoiceIcon />}
//                             label="Invoice"
//                             onClick={() => openInvoiceModal(order)}
//                             showInMenu={false}
//                         />,
//                         <GridActionsCellItem
//                             key="edit"
//                             icon={<EditIcon />}
//                             label={editOrderId === order.id ? "Cancel Edit" : "Edit"}
//                             onClick={() =>
//                                 setEditOrderId((prev) => (prev === order.id ? null : order.id))
//                             }
//                             showInMenu={false}
//                         />,
//                         order.status !== "served" && (
//                             <GridActionsCellItem
//                                 key="deleteOrder"
//                                 icon={<DeleteIcon />}
//                                 label="Delete Order"
//                                 onClick={() => {
//                                     setOrderToDelete(order.id);
//                                     setShowDeleteOrderModal(true);
//                                 }}
//                                 showInMenu={false}
//                             />
//                         ),
//                         order.status !== "served" && (
//                             <GridActionsCellItem
//                                 key="statusServed"
//                                 icon={<StatusArrowIcon />}
//                                 label="Mark Served"
//                                 onClick={() => handleStatusChange(order.id, "served")}
//                                 showInMenu={false}
//                                 disabled={order.status === "served"}
//                             />
//                         ),
//                     ].filter(Boolean);
//                 },
//             },
//         ],
//         [editOrderId, tablesMap, inventoryMap]
//     );

//     // Custom toolbar with export and filter controls
//     const CustomToolbar = () => (
//         <GridToolbarContainer>
//             <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 2 }}>
//                 <Select
//                     value={selectedDate}
//                     onChange={(e) => setSelectedDate(e.target.value)}
//                     size="small"
//                     variant="outlined"
//                     sx={{ minWidth: 120 }}
//                 >
//                     <MenuItem value="">All Dates</MenuItem>
//                     {[...Array(15)].map((_, i) => {
//                         const d = new Date();
//                         d.setDate(d.getDate() - i);
//                         const dateString = d.toLocaleDateString("en-CA");
//                         const label = i === 0 ? "Today" : dateString;
//                         return (
//                             <MenuItem key={dateString} value={dateString}>
//                                 {label}
//                             </MenuItem>
//                         );
//                     })}
//                 </Select>

//                 <Button
//                     variant="outlined"
//                     size="small"
//                     onClick={() => setFilterMode((prev) => (prev + 1) % 5)}
//                 >
//                     Filter Mode:{" "}
//                     {["Asc Date", "Desc Date", "New", "Preparing", "Served"][filterMode]}
//                 </Button>

//                 <GridToolbarExport csvOptions={{ fileName: "orders-export" }} />
//             </Box>
//         </GridToolbarContainer>
//     );

//     // For expanding an order to edit items - rendered below grid
//     const renderEditSection = () => {
//         if (!editOrderId) return null;
//         const order = orders.find((o) => o.id === editOrderId);
//         if (!order) return null;

//         return (
//             <Box
//                 sx={{
//                     mt: 2,
//                     p: 2,
//                     border: "1px solid",
//                     borderColor: "divider",
//                     borderRadius: 1,
//                     bgcolor: darkMode ? "background.paper" : "background.default",
//                     maxWidth: "100%",
//                     overflowX: "auto",
//                 }}
//             >
//                 <Typography variant="h6" gutterBottom>
//                     Edit Order #{order.id} - Table: {tablesMap[order.table_id] || order.table_id}
//                 </Typography>

//                 {/* Items table for editing quantity, status, and deleting items */}
//                 <Box
//                     component="table"
//                     sx={{
//                         width: "100%",
//                         borderCollapse: "collapse",
//                         mb: 2,
//                         minWidth: 600,
//                     }}
//                 >
//                     <thead>
//                         <tr>
//                             <th>Item</th>
//                             <th>Quantity</th>
//                             <th>Status</th>
//                             <th>Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {order.items.map((item) => (
//                             <tr key={item.item_id}>
//                                 <td>{item.item_name || item.item_id}</td>
//                                 <td>
//                                     <Button
//                                         size="small"
//                                         onClick={() =>
//                                             updateItemQuantity(order.id, item.item_id, item.quantity - 1)
//                                         }
//                                         disabled={item.quantity <= 1}
//                                     >
//                                         −
//                                     </Button>
//                                     <span style={{ margin: "0 8px" }}>{item.quantity}</span>
//                                     <Button
//                                         size="small"
//                                         onClick={() =>
//                                             updateItemQuantity(order.id, item.item_id, item.quantity + 1)
//                                         }
//                                     >
//                                         +
//                                     </Button>
//                                 </td>
//                                 <td>
//                                     <Typography
//                                         component="span"
//                                         sx={{
//                                             p: "4px 8px",
//                                             borderRadius: 1,
//                                             bgcolor:
//                                                 item.status === "new"
//                                                     ? "info.light"
//                                                     : item.status === "preparing"
//                                                         ? "warning.light"
//                                                         : item.status === "served"
//                                                             ? "success.light"
//                                                             : item.status === "cancelled"
//                                                                 ? "error.light"
//                                                                 : "grey.300",
//                                             color: "text.primary",
//                                         }}
//                                     >
//                                         {item.status}
//                                     </Typography>
//                                 </td>
//                                 <td>
//                                     {item.status !== "cancelled" && (
//                                         <>
//                                             <Button
//                                                 size="small"
//                                                 onClick={() => {
//                                                     setItemToDelete({ orderId: order.id, itemId: item.item_id });
//                                                     setShowDeleteItemModal(true);
//                                                 }}
//                                                 color="error"
//                                             >
//                                                 Delete
//                                             </Button>
//                                         </>
//                                     )}
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </Box>

//                 {/* Add item search */}
//                 <Box sx={{ mb: 2 }}>
//                     <TextField
//                         label="Search item to add"
//                         variant="outlined"
//                         value={itemSearchQuery}
//                         onChange={(e) => setItemSearchQuery(e.target.value)}
//                         fullWidth
//                         size="small"
//                     />
//                     {itemSearchResults.length > 0 && (
//                         <Box
//                             sx={{
//                                 border: "1px solid",
//                                 borderColor: "divider",
//                                 borderRadius: 1,
//                                 mt: 1,
//                                 maxHeight: 200,
//                                 overflowY: "auto",
//                                 bgcolor: "background.paper",
//                             }}
//                         >
//                             {itemSearchResults.map((item) => (
//                                 <Box
//                                     key={item.id}
//                                     sx={{
//                                         px: 2,
//                                         py: 1,
//                                         cursor: "pointer",
//                                         "&:hover": { bgcolor: "action.hover" },
//                                     }}
//                                     onClick={() => addItemToOrder(order.id, item)}
//                                 >
//                                     {item.name} - ₹{item.price}
//                                 </Box>
//                             ))}
//                         </Box>
//                     )}
//                 </Box>

//                 <Box>
//                     <Button
//                         variant="contained"
//                         onClick={() => updateOrderItems(order.id, order.items)}
//                         color="primary"
//                     >
//                         Save Items
//                     </Button>
//                     <Button
//                         onClick={() => setEditOrderId(null)}
//                         sx={{ ml: 2 }}
//                         color="secondary"
//                     >
//                         Cancel Edit
//                     </Button>
//                 </Box>
//             </Box>
//         );
//     };

//     return (
//         <Box
//             sx={{
//                 width: "100%",
//                 maxWidth: "100vw",
//                 p: 2,
//                 bgcolor: darkMode ? "background.default" : "#f5f5f5",
//             }}
//         >
//             <Typography variant="h4" gutterBottom>
//                 Table Orders
//             </Typography>

//             {/* DataGrid wrapped to allow horizontal scroll on small devices */}
//             <Box
//                 sx={{
//                     width: "100%",
//                     overflowX: "auto",
//                     bgcolor: darkMode ? "background.paper" : "#fff",
//                     borderRadius: 1,
//                     boxShadow: 2,
//                 }}
//             >
//                 <DataGrid
//                     rows={rows}
//                     columns={columns}
//                     pageSizeOptions={[5, 10, 20]}
//                     initialState={{
//                         pagination: { paginationModel: { pageSize: 10, page: 0 } },
//                         sorting: { sortModel: [{ field: "createdAt", sort: "desc" }] },
//                     }}
//                     pagination
//                     sortingMode="client"
//                     filterMode="client"
//                     autoHeight
//                     loading={loading}
//                     components={{
//                         Toolbar: CustomToolbar,
//                     }}
//                     getRowId={(row) => row.id}
//                     disableRowSelectionOnClick
//                 />
//             </Box>

//             {/* Render order edit section */}
//             {renderEditSection()}

//             {/* Delete Order Modal */}
//             <Modal
//                 open={showDeleteOrderModal}
//                 onClose={() => setShowDeleteOrderModal(false)}
//                 aria-labelledby="delete-order-title"
//                 aria-describedby="delete-order-description"
//             >
//                 <Box
//                     sx={{
//                         position: "absolute",
//                         top: "50%",
//                         left: "50%",
//                         transform: "translate(-50%, -50%)",
//                         bgcolor: "background.paper",
//                         borderRadius: 1,
//                         boxShadow: 24,
//                         p: 4,
//                         width: 300,
//                         textAlign: "center",
//                     }}
//                 >
//                     <Typography id="delete-order-title" variant="h6" gutterBottom>
//                         Delete this order?
//                     </Typography>
//                     <Box sx={{ display: "flex", justifyContent: "space-around", mt: 2 }}>
//                         <Button variant="contained" color="error" onClick={confirmDeleteOrder}>
//                             Yes
//                         </Button>
//                         <Button
//                             variant="outlined"
//                             onClick={() => setShowDeleteOrderModal(false)}
//                         >
//                             No
//                         </Button>
//                     </Box>
//                 </Box>
//             </Modal>

//             {/* Delete Item Modal */}
//             <Modal
//                 open={showDeleteItemModal}
//                 onClose={() => setShowDeleteItemModal(false)}
//                 aria-labelledby="delete-item-title"
//                 aria-describedby="delete-item-description"
//             >
//                 <Box
//                     sx={{
//                         position: "absolute",
//                         top: "50%",
//                         left: "50%",
//                         transform: "translate(-50%, -50%)",
//                         bgcolor: "background.paper",
//                         borderRadius: 1,
//                         boxShadow: 24,
//                         p: 4,
//                         width: 300,
//                         textAlign: "center",
//                     }}
//                 >
//                     <Typography id="delete-item-title" variant="h6" gutterBottom>
//                         Delete this item?
//                     </Typography>
//                     <Box sx={{ display: "flex", justifyContent: "space-around", mt: 2 }}>
//                         <Button variant="contained" color="error" onClick={confirmDeleteItem}>
//                             Yes
//                         </Button>
//                         <Button
//                             variant="outlined"
//                             onClick={() => setShowDeleteItemModal(false)}
//                         >
//                             No
//                         </Button>
//                     </Box>
//                 </Box>
//             </Modal>

//             {/* Invoice Modal */}
//             {showInvoiceModal && invoiceOrder && (
//                 <InvoiceModal order={invoiceOrder} onClose={closeInvoiceModal} />
//             )}
//         </Box>
//     );
// };

// export default OrdersDataGridPage;

// =================================================================================================================== //

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





// import React, { useEffect, useState, useMemo } from "react";
// import {
//     DataGrid,
//     GridActionsCellItem,
//     GridToolbarContainer,
//     GridToolbarExport,
// } from "@mui/x-data-grid";
// import {
//     Box,
//     Button,
//     Modal,
//     Typography,
//     TextField,
//     Select,
//     MenuItem,
// } from "@mui/material";
// import {
//     Delete as DeleteIcon,
//     Edit as EditIcon,
//     Receipt as InvoiceIcon,
//     CheckCircle as MarkServedIcon,
// } from "@mui/icons-material"; // Added icon for status update
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
// import { toast } from "react-toastify";


// import orderServicesPort from "../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../Backend_Port_Files/TableServices";
// import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";


// import InvoiceModal from "../Invoice_Services_Components/Invoice_Page";


// const OrdersVisiblePage = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const { darkMode } = useTheme();


//     // Order data and tables/inventory maps
//     const [orders, setOrders] = useState([]);
//     const [tablesMap, setTablesMap] = useState({});
//     const [inventoryMap, setInventoryMap] = useState({});
//     const [allInventoryItems, setAllInventoryItems] = useState([]);
//     const [loading, setLoading] = useState(true);


//     // Date filter and other UI state
//     const todayDate = new Date().toISOString().split("T")[0];
//     const [selectedDate, setSelectedDate] = useState(todayDate);


//     // Modals and selected entities
//     const [showInvoiceModal, setShowInvoiceModal] = useState(false);
//     const [invoiceOrder, setInvoiceOrder] = useState(null);


//     const [editOrderId, setEditOrderId] = useState(null);
//     const [showEditModal, setShowEditModal] = useState(false);


//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [orderToDelete, setOrderToDelete] = useState(null);


//     const [itemSearchQuery, setItemSearchQuery] = useState("");
//     const [itemSearchResults, setItemSearchResults] = useState([]);
//     const [editedOrderItems, setEditedOrderItems] = useState([]);


//     // --- Fetch tables map
//     useEffect(() => {
//         if (!clientId || !token) return;


//         const fetchTables = async () => {
//             try {
//                 const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const map = {};
//                 (res.data?.data || []).forEach((t) => {
//                     map[t.id] = t.name;
//                 });
//                 setTablesMap(map);
//             } catch { }
//         };
//         fetchTables();
//     }, [clientId, token]);


//     // --- Fetch inventory map & all items list
//     useEffect(() => {
//         if (!clientId || !token) return;


//         const fetchInventory = async () => {
//             try {
//                 const res = await inventoryServicesPort.get(
//                     `/${clientId}/inventory/read`,
//                     { headers: { Authorization: `Bearer ${token}` } }
//                 );
//                 const invMap = {};
//                 (res.data?.data || []).forEach((item) => {
//                     invMap[item.id] = item;
//                 });
//                 setInventoryMap(invMap);
//                 setAllInventoryItems(res.data?.data || []);
//             } catch { }
//         };


//         fetchInventory();
//     }, [clientId, token]);


//     // --- Fetch orders
//     useEffect(() => {
//         if (!clientId || !token) return;


//         const fetchOrders = async () => {
//             setLoading(true);
//             try {
//                 const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 setOrders(res.data?.data || []);
//             } catch {
//                 toast.error("Failed to fetch dine-in orders");
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchOrders();
//     }, [clientId, token]);


//     // Filter orders by selected date
//     const filteredOrders = useMemo(() => {
//         if (!selectedDate) return orders;
//         return orders.filter(
//             (o) =>
//                 new Date(o.created_at).toLocaleDateString("en-CA") === selectedDate
//         );
//     }, [orders, selectedDate]);


//     // Prepare rows for DataGrid
//     const rows = useMemo(() => filteredOrders.map(order => ({
//         id: order.id,
//         tableName: tablesMap[order.table_id] || order.table_id,
//         itemsCount: Array.isArray(order.items) ? order.items.length : 0,
//         totalPrice: Number(order.total_price) || 0,
//         status: order.status || '',
//         createdAt: new Date(order.created_at).toLocaleDateString(),
//         rawOrder: order,
//     })), [filteredOrders, tablesMap]);

//     // Added status update function
//     const updateOrderStatus = async (orderId, newStatus) => {
//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 {
//                     id: orderId,
//                     client_id: clientId,
//                     status: newStatus
//                 },
//                 {
//                     headers: { Authorization: `Bearer ${token}` }
//                 }
//             );
//             setOrders(prev =>
//                 prev.map(order =>
//                     order.id === orderId ? { ...order, status: newStatus } : order
//                 )
//             );
//             toast.success("Order status updated");
//             if (editOrderId === orderId && newStatus === "served") {
//                 closeEditModal();
//             }
//         } catch (error) {
//             toast.error("Failed to update order status");
//         }
//     };


//     // --- Open invoice modal
//     const openInvoiceModal = (order) => {
//         const tableName = tablesMap[order.table_id] || order.table_id;
//         const itemsWithPrice = (order.items || []).map((item) => ({
//             ...item,
//             price: item.price || inventoryMap[item.item_id]?.price || 0,
//         }));
//         setInvoiceOrder({ ...order, table_name: tableName, items: itemsWithPrice });
//         setShowInvoiceModal(true);
//     };
//     const closeInvoiceModal = () => {
//         setInvoiceOrder(null);
//         setShowInvoiceModal(false);
//     };


//     // --- Open edit modal with order items for editing
//     const openEditModal = (order) => {
//         setEditOrderId(order.id);
//         // Deep clone to avoid mutating original order state until saved
//         setEditedOrderItems(JSON.parse(JSON.stringify(order.items || [])));
//         setItemSearchQuery("");
//         setItemSearchResults([]);
//         setShowEditModal(true);
//     };
//     const closeEditModal = () => {
//         setEditOrderId(null);
//         setEditedOrderItems([]);
//         setShowEditModal(false);
//     };


//     // --- Update item quantity locally while editing
//     const updateItemQuantity = (itemId, newQty) => {
//         if (newQty < 1) return;
//         setEditedOrderItems((prev) =>
//             prev.map((item) => (item.item_id === itemId ? { ...item, quantity: newQty } : item))
//         );
//     };


//     // --- Update item status locally while editing
//     const updateItemStatus = (itemId, newStatus) => {
//         setEditedOrderItems((prev) =>
//             prev.map((item) => (item.item_id === itemId ? { ...item, status: newStatus } : item))
//         );
//     };


//     // --- Add item to edited order items
//     const addItemToOrder = (selectedItem) => {
//         if (editedOrderItems.find((i) => i.item_id === selectedItem.id)) return;
//         const newItem = {
//             item_id: selectedItem.id,
//             item_name: selectedItem.name,
//             quantity: 1,
//             price: selectedItem.price,
//             status: "new",
//             note: "",
//             slug: selectedItem.slug || selectedItem.name.toLowerCase().replace(/\s+/g, "-"),
//         };
//         setEditedOrderItems((prev) => [...prev, newItem]);
//         setItemSearchQuery("");
//         setItemSearchResults([]);
//     };


//     // --- Remove item from edited order items
//     const removeItemFromOrder = (itemId) => {
//         setEditedOrderItems((prev) => prev.filter((item) => item.item_id !== itemId));
//     };


//     // --- Save edited order items to backend
//     const saveEditedOrderItems = async () => {
//         if (!editOrderId) return;


//         // Prepare cleaned items for backend API
//         const cleanedItems = editedOrderItems.map((item) => ({
//             item_id: item.item_id,
//             item_name: item.item_name,
//             quantity: item.quantity,
//             status: item.status || "new",
//             note: item.note || "",
//             slug: item.slug || "",
//             price: item.price || inventoryMap[item.item_id]?.price || 0,
//             client_id: clientId,
//             order_id: editOrderId,
//         }));


//         const totalPrice = cleanedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);


//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${editOrderId}`,
//                 cleanedItems,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );


//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: editOrderId, total_price: totalPrice },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );


//             // Update state locally
//             setOrders((prev) =>
//                 prev.map((o) => (o.id === editOrderId ? { ...o, items: editedOrderItems, total_price: totalPrice } : o))
//             );


//             toast.success("Order updated successfully");
//             closeEditModal();
//         } catch {
//             toast.error("Failed to save order changes");
//         }
//     };


//     // --- Search inventory for adding items to order edit modal
//     useEffect(() => {
//         if (!itemSearchQuery.trim() || !editOrderId) {
//             setItemSearchResults([]);
//             return;
//         }
//         const currentItemIds = editedOrderItems.map((i) => i.item_id);


//         const filtered = allInventoryItems.filter(
//             (item) =>
//                 item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) &&
//                 !currentItemIds.includes(item.id)
//         );


//         setItemSearchResults(filtered);
//     }, [itemSearchQuery, allInventoryItems, editedOrderItems, editOrderId]);


//     // --- Delete order handling
//     const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
//     const confirmDeleteOrder = async () => {
//         if (!orderToDelete) return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
//                 params: { dinein_order_id: orderToDelete, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
//             toast.success("Order deleted");
//             setShowDeleteOrderModal(false);
//             setOrderToDelete(null);
//         } catch {
//             toast.error("Failed to delete order");
//         }
//     };


//     // Add status update button to columns actions
//     const columns = useMemo(() => [
//         { field: "tableName", headerName: "Table", flex: 1, minWidth: 120 },
//         { field: "itemsCount", headerName: "Items", width: 90 },
//         {
//             field: "totalPrice",
//             headerName: "Total Price",
//             width: 130,
//             // Show as currency string
//             renderCell: (params) => `₹${Number(params.value).toFixed(2)}`,
//         },
//         { field: "status", headerName: "Status", minWidth: 120 },
//         { field: "createdAt", headerName: "Date", minWidth: 120 },
//         {
//             field: "actions",
//             headerName: "Actions",
//             flex: 1,
//             type: "actions",
//             getActions: (params) => {
//                 const order = params.row.rawOrder;
//                 return [
//                     <GridActionsCellItem
//                         key="invoice"
//                         icon={<InvoiceIcon />}
//                         label="Invoice"
//                         onClick={() => openInvoiceModal(order)}
//                         showInMenu={false}
//                     />,
//                     <GridActionsCellItem
//                         key="edit"
//                         icon={<EditIcon />}
//                         label={editOrderId === order.id ? "Cancel Edit" : "Edit"}
//                         onClick={() => (editOrderId === order.id ? closeEditModal() : openEditModal(order))}
//                         showInMenu={false}
//                     />,
//                     // Status update button if not served
//                     order.status.toLowerCase() !== "served" && (
//                         <GridActionsCellItem
//                             key="mark-served"
//                             icon={<MarkServedIcon />}
//                             label="Mark Served"
//                             onClick={() => updateOrderStatus(order.id, "served")}
//                             showInMenu={false}
//                         />
//                     ),
//                     <GridActionsCellItem
//                         key="delete"
//                         icon={<DeleteIcon />}
//                         label="Delete Order"
//                         onClick={() => {
//                             setOrderToDelete(order.id);
//                             setShowDeleteOrderModal(true);
//                         }}
//                         showInMenu={false}
//                     />,
//                 ].filter(Boolean);
//             },
//         },
//     ], [editOrderId, tablesMap, inventoryMap, editedOrderItems]);


//     // Custom toolbar with date filter and export button
//     const CustomToolbar = () => (
//         <GridToolbarContainer sx={{ display: "flex", alignItems: "center", gap: 2, p: 1 }}>
//             <Select
//                 size="small"
//                 value={selectedDate}
//                 onChange={(e) => setSelectedDate(e.target.value)}
//                 sx={{ minWidth: 120 }}
//             >
//                 <MenuItem value="">All Dates</MenuItem>
//                 {[...Array(15)].map((_, i) => {
//                     const d = new Date();
//                     d.setDate(d.getDate() - i);
//                     const dateString = d.toLocaleDateString("en-CA");
//                     const label = i === 0 ? "Today" : dateString;
//                     return (
//                         <MenuItem key={dateString} value={dateString}>
//                             {label}
//                         </MenuItem>
//                     );
//                 })}
//             </Select>
//             <Button variant="outlined" onClick={() => setFilterMode((prev) => (prev + 1) % 5)} size="small">
//                 Filter Mode:{" "}
//                 {["Asc Date", "Desc Date", "New", "Preparing", "Served"][filterMode]}
//             </Button>
//             <GridToolbarExport csvOptions={{ fileName: "orders-export" }} />
//         </GridToolbarContainer>
//     );


//     return (
//         <Box className="OrderSummary-Container" >
//             <Typography className="Top-Summary-Header" gutterBottom>
//                 <h5>Order Summary</h5>
//                 <button>Export</button>
//             </Typography>


//             <Box className="OrderSummary-second-Container" sx={{ overflowX: "auto", borderRadius: 1, boxShadow: 2, }}>
//                 <DataGrid
//                     rows={rows}
//                     columns={columns}
//                     pageSizeOptions={[5, 8, 10, 20]}
//                     initialState={{
//                         pagination: { paginationModel: { pageSize: 8, page: 0 } },
//                         sorting: { sortModel: [{ field: "createdAt", sort: "desc" }] },
//                     }}
//                     pagination
//                     sortingMode="client"
//                     filterMode="client"
//                     autoHeight
//                     loading={loading}
//                     components={{ Toolbar: CustomToolbar }}
//                     getRowId={(row) => row.id}
//                     disableRowSelectionOnClick
//                 />
//             </Box>


//             {/* Edit Order Modal */}
//             <Modal open={showEditModal} onClose={closeEditModal} aria-labelledby="edit-order-title" aria-describedby="edit-order-description">
//                 <Box sx={{
//                     position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
//                     bgcolor: "background.paper", borderRadius: 1, boxShadow: 24, p: 3, minWidth: 400, maxHeight: "90vh", overflowY: "auto"
//                 }}>
//                     {editOrderId && (() => {
//                         const order = orders.find((o) => o.id === editOrderId);
//                         if (!order) return null;


//                         return (
//                             <>
//                                 <Typography id="edit-order-title" variant="h6" mb={2}>
//                                     Edit Order #{order.id} - Table: {tablesMap[order.table_id] || order.table_id}
//                                 </Typography>


//                                 <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mb: 2 }}>
//                                     <thead>
//                                         <tr>
//                                             <th style={{ textAlign: "left", padding: "8px" }}>Item</th>
//                                             <th style={{ padding: "8px" }}>Qty</th>
//                                             <th style={{ padding: "8px" }}>Status</th>
//                                             <th style={{ padding: "8px" }}>Actions</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         {editedOrderItems.map((item) => (
//                                             <tr key={item.item_id}>
//                                                 <td style={{ padding: "6px 8px" }}>{item.item_name || item.item_id}</td>
//                                                 <td style={{ padding: "6px 8px", textAlign: "center" }}>
//                                                     <Button size="small" disabled={item.quantity <= 1} onClick={() => updateItemQuantity(item.item_id, item.quantity - 1)}>-</Button>
//                                                     <span style={{ margin: "0 8px" }}>{item.quantity}</span>
//                                                     <Button size="small" onClick={() => updateItemQuantity(item.item_id, item.quantity + 1)}>+</Button>
//                                                 </td>
//                                                 <td style={{ padding: "6px 8px", textAlign: "center" }}>
//                                                     <Select
//                                                         size="small"
//                                                         value={item.status}
//                                                         onChange={(e) => updateItemStatus(item.item_id, e.target.value)}
//                                                     >
//                                                         {["new", "preparing", "served", "cancelled"].map((status) => (
//                                                             <MenuItem key={status} value={status}>
//                                                                 {status}
//                                                             </MenuItem>
//                                                         ))}
//                                                     </Select>
//                                                 </td>
//                                                 <td style={{ padding: "6px 8px", textAlign: "center" }}>
//                                                     {item.status !== "cancelled" && (
//                                                         <Button
//                                                             size="small"
//                                                             color="error"
//                                                             onClick={() => removeItemFromOrder(item.item_id)}
//                                                         >
//                                                             Delete
//                                                         </Button>
//                                                     )}
//                                                 </td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </Box>


//                                 <TextField
//                                     fullWidth
//                                     size="small"
//                                     label="Search items to add"
//                                     value={itemSearchQuery}
//                                     onChange={(e) => setItemSearchQuery(e.target.value)}
//                                     placeholder="Type to search inventory..."
//                                     margin="normal"
//                                 />
//                                 {itemSearchResults.length > 0 && (
//                                     <Box sx={{
//                                         border: "1px solid", borderColor: "divider", borderRadius: 1,
//                                         maxHeight: 180, overflowY: "auto", bgcolor: "background.paper"
//                                     }}>
//                                         {itemSearchResults.map((item) => (
//                                             <Box
//                                                 key={item.id}
//                                                 sx={{ p: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
//                                                 onClick={() => addItemToOrder(item)}
//                                             >
//                                                 {item.name} - ₹{item.price}
//                                             </Box>
//                                         ))}
//                                     </Box>
//                                 )}


//                                 <Box mt={2} sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
//                                     <Button variant="contained" color="primary" onClick={saveEditedOrderItems}>
//                                         Save
//                                     </Button>
//                                     <Button variant="outlined" onClick={closeEditModal}>
//                                         Cancel
//                                     </Button>
//                                 </Box>
//                             </>
//                         );
//                     })()}
//                 </Box>
//             </Modal>


//             {/* Delete Order Modal */}
//             <Modal
//                 open={showDeleteOrderModal}
//                 onClose={() => setShowDeleteOrderModal(false)}
//                 aria-labelledby="delete-order-title"
//                 aria-describedby="delete-order-description"
//             >
//                 <Box sx={{
//                     position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
//                     bgcolor: "background.paper", borderRadius: 1, boxShadow: 24, p: 4, width: 300, textAlign: "center"
//                 }}>
//                     <Typography id="delete-order-title" variant="h6" gutterBottom>
//                         Delete this order?
//                     </Typography>
//                     <Box sx={{ display: "flex", justifyContent: "space-around", mt: 2 }}>
//                         <Button variant="contained" color="error" onClick={confirmDeleteOrder}>Yes</Button>
//                         <Button variant="outlined" onClick={() => setShowDeleteOrderModal(false)}>No</Button>
//                     </Box>
//                 </Box>
//             </Modal>


//             {/* Invoice Modal */}
//             {showInvoiceModal && invoiceOrder && (
//                 <InvoiceModal order={invoiceOrder} onClose={closeInvoiceModal} />
//             )}
//         </Box>
//     );
// };


// export default OrdersVisiblePage;




// ============================================================================================================= //
// ============================================================================================================= //
// ============================================================================================================= //




// import React, { useEffect, useState, useMemo, useCallback } from "react";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
// import { toast } from "react-toastify";

// import orderServicesPort from "../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../Backend_Port_Files/TableServices";
// import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
// import InvoiceModal from "../Invoice_Services_Components/Invoice_Page";

// const OrdersVisiblePage = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const { darkMode } = useTheme();

//     // Order data and tables/inventory maps
//     const [orders, setOrders] = useState([]);
//     const [tablesMap, setTablesMap] = useState({});
//     const [inventoryMap, setInventoryMap] = useState({});
//     const [allInventoryItems, setAllInventoryItems] = useState([]);
//     const [loading, setLoading] = useState(true);

//     // Date filter and other UI state
//     const todayDate = new Date().toISOString().split("T")[0];
//     const [selectedDate, setSelectedDate] = useState(todayDate);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [statusFilter, setStatusFilter] = useState('all');
//     const [currentView, setCurrentView] = useState('dashboard');
//     const [selectedOrder, setSelectedOrder] = useState(null);

//     // Modals and selected entities
//     const [showInvoiceModal, setShowInvoiceModal] = useState(false);
//     const [invoiceOrder, setInvoiceOrder] = useState(null);
//     const [editOrderId, setEditOrderId] = useState(null);
//     const [showEditModal, setShowEditModal] = useState(false);
//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [orderToDelete, setOrderToDelete] = useState(null);
//     const [itemSearchQuery, setItemSearchQuery] = useState("");
//     const [itemSearchResults, setItemSearchResults] = useState([]);
//     const [editedOrderItems, setEditedOrderItems] = useState([]);

//     // Status configurations
//     const statusConfig = {
//         pending: {
//             color: 'from-amber-400 to-orange-500',
//             textColor: 'text-amber-800',
//             bgColor: 'bg-amber-50',
//             icon: 'fas fa-clock',
//             label: 'Pending',
//             description: 'Order received, awaiting confirmation'
//         },
//         preparing: {
//             color: 'from-blue-400 to-indigo-500',
//             textColor: 'text-blue-800',
//             bgColor: 'bg-blue-50',
//             icon: 'fas fa-utensils',
//             label: 'Preparing',
//             description: 'Kitchen is preparing your order'
//         },
//         delivering: {
//             color: 'from-purple-400 to-pink-500',
//             textColor: 'text-purple-800',
//             bgColor: 'bg-purple-50',
//             icon: 'fas fa-truck',
//             label: 'Delivering',
//             description: 'On the way to your location'
//         },
//         served: {
//             color: 'from-green-400 to-emerald-500',
//             textColor: 'text-green-800',
//             bgColor: 'bg-green-50',
//             icon: 'fas fa-check-circle',
//             label: 'Served',
//             description: 'Successfully served'
//         }
//     };

//     // Priority configurations
//     const priorityConfig = {
//         low: { color: 'priority-low', icon: 'fas fa-arrow-down' },
//         medium: { color: 'priority-medium', icon: 'fas fa-minus' },
//         high: { color: 'priority-high', icon: 'fas fa-arrow-up' }
//     };

//     // Calculate order totals
//     const calculateOrderTotal = useCallback((order) => {
//         if (!order.items || !Array.isArray(order.items)) return order.total_price || 0;
//         const subtotal = order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
//         return subtotal;
//     }, []);

//     // --- Fetch tables map
//     useEffect(() => {
//         if (!clientId || !token) return;

//         const fetchTables = async () => {
//             try {
//                 const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const map = {};
//                 (res.data?.data || []).forEach((t) => {
//                     map[t.id] = t.name;
//                 });
//                 setTablesMap(map);
//             } catch { }
//         };
//         fetchTables();
//     }, [clientId, token]);

//     // --- Fetch inventory map & all items list
//     useEffect(() => {
//         if (!clientId || !token) return;

//         const fetchInventory = async () => {
//             try {
//                 const res = await inventoryServicesPort.get(
//                     `/${clientId}/inventory/read`,
//                     { headers: { Authorization: `Bearer ${token}` } }
//                 );
//                 const invMap = {};
//                 (res.data?.data || []).forEach((item) => {
//                     invMap[item.id] = item;
//                 });
//                 setInventoryMap(invMap);
//                 setAllInventoryItems(res.data?.data || []);
//             } catch { }
//         };

//         fetchInventory();
//     }, [clientId, token]);

//     // --- Fetch orders
//     useEffect(() => {
//         if (!clientId || !token) return;

//         const fetchOrders = async () => {
//             setLoading(true);
//             try {
//                 const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 setOrders(res.data?.data || []);
//             } catch {
//                 toast.error("Failed to fetch dine-in orders");
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchOrders();
//     }, [clientId, token]);

//     // Filter orders based on search, status, and date
//     const filteredOrders = useMemo(() => {
//         return orders.filter(order => {
//             const matchesSearch = (tablesMap[order.table_id] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 order.id.toString().toLowerCase().includes(searchTerm.toLowerCase());
//             const matchesStatus = statusFilter === 'all' || (order.status || '').toLowerCase() === statusFilter.toLowerCase();
//             const matchesDate = !selectedDate || new Date(order.created_at).toLocaleDateString("en-CA") === selectedDate;
//             return matchesSearch && matchesStatus && matchesDate;
//         });
//     }, [orders, searchTerm, statusFilter, selectedDate, tablesMap]);

//     // Statistics
//     const stats = useMemo(() => {
//         const total = filteredOrders.length;
//         const completed = filteredOrders.filter(o => (o.status || '').toLowerCase() === 'served').length;
//         const pending = filteredOrders.filter(o => ['pending', 'preparing', 'new'].includes((o.status || '').toLowerCase())).length;
//         const revenue = filteredOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
//         const avgRating = 4.5; // Since we don't have ratings in the order data

//         return { total, completed, pending, revenue, avgRating };
//     }, [filteredOrders, calculateOrderTotal]);

//     // Status update function
//     const updateOrderStatus = async (orderId, newStatus) => {
//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 {
//                     id: orderId,
//                     client_id: clientId,
//                     status: newStatus
//                 },
//                 {
//                     headers: { Authorization: `Bearer ${token}` }
//                 }
//             );
//             setOrders(prev =>
//                 prev.map(order =>
//                     order.id === orderId ? { ...order, status: newStatus } : order
//                 )
//             );
//             toast.success("Order status updated");
//             if (editOrderId === orderId && newStatus === "served") {
//                 closeEditModal();
//             }
//         } catch (error) {
//             toast.error("Failed to update order status");
//         }
//     };

//     // --- Open invoice modal
//     const openInvoiceModal = (order) => {
//         const tableName = tablesMap[order.table_id] || order.table_id;
//         const itemsWithPrice = (order.items || []).map((item) => ({
//             ...item,
//             price: item.price || inventoryMap[item.item_id]?.price || 0,
//         }));
//         setInvoiceOrder({ ...order, table_name: tableName, items: itemsWithPrice });
//         setShowInvoiceModal(true);
//     };

//     const closeInvoiceModal = () => {
//         setInvoiceOrder(null);
//         setShowInvoiceModal(false);
//     };

//     // --- Open edit modal with order items for editing
//     const openEditModal = (order) => {
//         setEditOrderId(order.id);
//         setEditedOrderItems(JSON.parse(JSON.stringify(order.items || [])));
//         setItemSearchQuery("");
//         setItemSearchResults([]);
//         setShowEditModal(true);
//     };

//     const closeEditModal = () => {
//         setEditOrderId(null);
//         setEditedOrderItems([]);
//         setShowEditModal(false);
//     };

//     // --- Update item quantity locally while editing
//     const updateItemQuantity = (itemId, newQty) => {
//         if (newQty < 1) return;
//         setEditedOrderItems((prev) =>
//             prev.map((item) => (item.item_id === itemId ? { ...item, quantity: newQty } : item))
//         );
//     };

//     // --- Update item status locally while editing
//     const updateItemStatus = (itemId, newStatus) => {
//         setEditedOrderItems((prev) =>
//             prev.map((item) => (item.item_id === itemId ? { ...item, status: newStatus } : item))
//         );
//     };

//     // --- Add item to edited order items
//     const addItemToOrder = (selectedItem) => {
//         if (editedOrderItems.find((i) => i.item_id === selectedItem.id)) return;
//         const newItem = {
//             item_id: selectedItem.id,
//             item_name: selectedItem.name,
//             quantity: 1,
//             price: selectedItem.price,
//             status: "new",
//             note: "",
//             slug: selectedItem.slug || selectedItem.name.toLowerCase().replace(/\s+/g, "-"),
//         };
//         setEditedOrderItems((prev) => [...prev, newItem]);
//         setItemSearchQuery("");
//         setItemSearchResults([]);
//     };

//     // --- Remove item from edited order items
//     const removeItemFromOrder = (itemId) => {
//         setEditedOrderItems((prev) => prev.filter((item) => item.item_id !== itemId));
//     };

//     // --- Save edited order items to backend
//     const saveEditedOrderItems = async () => {
//         if (!editOrderId) return;

//         const cleanedItems = editedOrderItems.map((item) => ({
//             item_id: item.item_id,
//             item_name: item.item_name,
//             quantity: item.quantity,
//             status: item.status || "new",
//             note: item.note || "",
//             slug: item.slug || "",
//             price: item.price || inventoryMap[item.item_id]?.price || 0,
//             client_id: clientId,
//             order_id: editOrderId,
//         }));

//         const totalPrice = cleanedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${editOrderId}`,
//                 cleanedItems,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: editOrderId, total_price: totalPrice },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             setOrders((prev) =>
//                 prev.map((o) => (o.id === editOrderId ? { ...o, items: editedOrderItems, total_price: totalPrice } : o))
//             );

//             toast.success("Order updated successfully");
//             closeEditModal();
//         } catch {
//             toast.error("Failed to save order changes");
//         }
//     };

//     // --- Search inventory for adding items to order edit modal
//     useEffect(() => {
//         if (!itemSearchQuery.trim() || !editOrderId) {
//             setItemSearchResults([]);
//             return;
//         }
//         const currentItemIds = editedOrderItems.map((i) => i.item_id);

//         const filtered = allInventoryItems.filter(
//             (item) =>
//                 item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) &&
//                 !currentItemIds.includes(item.id)
//         );

//         setItemSearchResults(filtered);
//     }, [itemSearchQuery, allInventoryItems, editedOrderItems, editOrderId]);

//     // --- Delete order handling
//     const confirmDeleteOrder = async () => {
//         if (!orderToDelete) return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
//                 params: { dinein_order_id: orderToDelete, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
//             toast.success("Order deleted");
//             setShowDeleteModal(false);
//             setOrderToDelete(null);
//         } catch {
//             toast.error("Failed to delete order");
//         }
//     };

//     // Header Component
//     // const Header = () => (
//     //     <header className="header">
//     //         <div className="header-container">
//     //             <div className="header-content">
//     //                 <div className="header-left">
//     //                     <div className="header-brand">
//     //                         <div className="brand-icon">
//     //                             <i className="fas fa-shopping-cart"></i>
//     //                         </div>
//     //                         <div className="brand-text">
//     //                             <h1>Orders Hub</h1>
//     //                             <p>Management System</p>
//     //                         </div>
//     //                     </div>
//     //                 </div>

//     //                 <div className="header-right">
//     //                     {currentView === 'detail' && (
//     //                         <button
//     //                             onClick={() => setCurrentView('dashboard')}
//     //                             className="btn-secondary"
//     //                         >
//     //                             <i className="fas fa-arrow-left"></i>
//     //                             <span>Back</span>
//     //                         </button>
//     //                     )}

//     //                     <div className="user-profile">
//     //                         <div className="user-avatar">
//     //                             <i className="fas fa-user"></i>
//     //                         </div>
//     //                         <div className="user-info">
//     //                             <p className="user-name">Admin</p>
//     //                             <p className="user-role">Manager</p>
//     //                         </div>
//     //                     </div>
//     //                 </div>
//     //             </div>
//     //         </div>
//     //     </header>
//     // );

//     // Stats Cards Component
//     const StatsCards = () => (
//         <div className="stats-grid">
//             <div className="stat-card animate-fade-in">
//                 <div className="stat-content">
//                     <div className="stat-text">
//                         <p className="stat-label">Total Orders</p>
//                         <p className="stat-value">{stats.total}</p>
//                         <p className="stat-change positive">
//                             <i className="fas fa-arrow-up"></i>+12% from last week
//                         </p>
//                     </div>
//                     <div className="stat-icon blue">
//                         <i className="fas fa-shopping-bag"></i>
//                     </div>
//                 </div>
//             </div>

//             <div className="stat-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
//                 <div className="stat-content">
//                     <div className="stat-text">
//                         <p className="stat-label">Completed</p>
//                         <p className="stat-value">{stats.completed}</p>
//                         <p className="stat-change positive">
//                             <i className="fas fa-check"></i>{stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}% success rate
//                         </p>
//                     </div>
//                     <div className="stat-icon green">
//                         <i className="fas fa-check-circle"></i>
//                     </div>
//                 </div>
//             </div>

//             <div className="stat-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
//                 <div className="stat-content">
//                     <div className="stat-text">
//                         <p className="stat-label">Pending</p>
//                         <p className="stat-value">{stats.pending}</p>
//                         <p className="stat-change warning">
//                             <i className="fas fa-clock"></i>Needs attention
//                         </p>
//                     </div>
//                     <div className="stat-icon orange">
//                         <i className="fas fa-clock"></i>
//                     </div>
//                 </div>
//             </div>

//             <div className="stat-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
//                 <div className="stat-content">
//                     <div className="stat-text">
//                         <p className="stat-label">Revenue</p>
//                         <p className="stat-value">₹{stats.revenue.toFixed(0)}</p>
//                         <p className="stat-change positive">
//                             <i className="fas fa-trending-up"></i>+8% this month
//                         </p>
//                     </div>
//                     <div className="stat-icon purple">
//                         <i className="fas fa-dollar-sign"></i>
//                     </div>
//                 </div>
//             </div>

//             <div className="stat-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
//                 <div className="stat-content">
//                     <div className="stat-text">
//                         <p className="stat-label">Avg Rating</p>
//                         <p className="stat-value">{stats.avgRating.toFixed(1)}</p>
//                         <div className="rating-stars">
//                             {[...Array(5)].map((_, i) => (
//                                 <i key={i} className={`fas fa-star ${i < Math.floor(stats.avgRating) ? 'active' : ''}`}></i>
//                             ))}
//                         </div>
//                     </div>
//                     <div className="stat-icon yellow">
//                         <i className="fas fa-star"></i>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );

//     // Search and Filter Component
//     const SearchAndFilter = () => (
//         <div className="search-filter-container animate-fade-in">
//             <div className="search-filter-content">
//                 <div className="search-box">
//                     <div className="search-input-wrapper">
//                         <i className="fas fa-search search-icon"></i>
//                         <input
//                             type="text"
//                             placeholder="Search orders by table name or order ID..."
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             className="search-input"
//                         />
//                     </div>
//                 </div>

//                 <div className="filter-controls">
//                     <select
//                         value={selectedDate}
//                         onChange={(e) => setSelectedDate(e.target.value)}
//                         className="filter-select"
//                     >
//                         <option value="">All Dates</option>
//                         {[...Array(15)].map((_, i) => {
//                             const d = new Date();
//                             d.setDate(d.getDate() - i);
//                             const dateString = d.toLocaleDateString("en-CA");
//                             const label = i === 0 ? "Today" : dateString;
//                             return (
//                                 <option key={dateString} value={dateString}>
//                                     {label}
//                                 </option>
//                             );
//                         })}
//                     </select>

//                     <select
//                         value={statusFilter}
//                         onChange={(e) => setStatusFilter(e.target.value)}
//                         className="filter-select"
//                     >
//                         <option value="all">All Status</option>
//                         <option value="pending">Pending</option>
//                         <option value="preparing">Preparing</option>
//                         <option value="new">New</option>
//                         <option value="served">Served</option>
//                         <option value="cancelled">Cancelled</option>
//                     </select>

//                     <button className="btn-primary">
//                         <i className="fas fa-filter"></i>
//                         Filter
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );

//     // Order Card Component
//     const OrderCard = ({ order }) => {
//         const config = statusConfig[order.status?.toLowerCase()] || statusConfig.pending;
//         const total = calculateOrderTotal(order);

//         return (
//             <div className="order-card card-hover animate-fade-in">
//                 <div className="card-header">
//                     <div className="card-header-left">
//                         <div className="customer-avatar">
//                             {tablesMap[order.table_id]?.charAt(0) || 'T'}
//                         </div>
//                         <div className="order-info">
//                             <h3 className="order-id">#{order.id}</h3>
//                             <p className="table-name">{tablesMap[order.table_id] || `Table ${order.table_id}`}</p>
//                         </div>
//                     </div>

//                     <div className="card-header-right">
//                         <span className="priority-badge priority-medium">
//                             <i className="fas fa-minus"></i>
//                             medium
//                         </span>
//                     </div>
//                 </div>

//                 <div className={`status-badge status-${order.status?.toLowerCase() || 'pending'}`}>
//                     <i className={config.icon}></i>
//                     {config.label}
//                 </div>

//                 <div className="order-details">
//                     <div className="detail-row">
//                         <span className="detail-label">
//                             <i className="fas fa-calendar"></i>
//                             {new Date(order.created_at).toLocaleDateString()}
//                         </span>
//                         <span className="detail-label">
//                             <i className="fas fa-clock"></i>
//                             {new Date(order.created_at).toLocaleTimeString()}
//                         </span>
//                     </div>

//                     <div className="detail-row">
//                         <span className="detail-label">
//                             <i className="fas fa-shopping-bag"></i>
//                             {order.items?.length || 0} items
//                         </span>
//                         <span className="order-total">
//                             ₹{total.toFixed(2)}
//                         </span>
//                     </div>

//                     {order.items && order.items.length > 0 && (
//                         <div className="items-preview">
//                             <span className="items-label">Items:</span>
//                             <div className="items-tags">
//                                 {order.items.slice(0, 3).map((item, index) => (
//                                     <span key={index} className="item-tag">
//                                         {item.item_name || `Item ${item.item_id}`}
//                                     </span>
//                                 ))}
//                                 {order.items.length > 3 && (
//                                     <span className="item-tag">
//                                         +{order.items.length - 3} more
//                                     </span>
//                                 )}
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 <div className="card-footer">
//                     <button
//                         onClick={() => {
//                             setSelectedOrder(order);
//                             setCurrentView('detail');
//                         }}
//                         className="btn-primary full-width"
//                     >
//                         <i className="fas fa-eye"></i>
//                         View Details & Manage
//                     </button>
//                 </div>
//             </div>
//         );
//     };

//     // Orders Grid Component
//     const OrdersGrid = () => (
//         <div className="orders-grid">
//             {loading ? (
//                 <div className="loading-container">
//                     <div className="loading-spinner"></div>
//                     <p>Loading orders...</p>
//                 </div>
//             ) : filteredOrders.length > 0 ? (
//                 filteredOrders.map((order, index) => (
//                     <div key={order.id} style={{ animationDelay: `${index * 0.1}s` }}>
//                         <OrderCard order={order} />
//                     </div>
//                 ))
//             ) : (
//                 <div className="no-orders-container">
//                     <div className="no-orders-icon">
//                         <i className="fas fa-search"></i>
//                     </div>
//                     <h3>No orders found</h3>
//                     <p>Try adjusting your search or filter criteria</p>
//                 </div>
//             )}
//         </div>
//     );

//     // Order Detail View Component
//     const OrderDetailView = () => {
//         if (!selectedOrder) return null;

//         const config = statusConfig[selectedOrder.status?.toLowerCase()] || statusConfig.pending;
//         const subtotal = selectedOrder.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0) || 0;
//         const total = calculateOrderTotal(selectedOrder);

//         return (
//             <div className="order-detail-view animate-fade-in">
//                 {/* Order Header */}
//                 <div className="detail-header">
//                     <div className={`detail-header-gradient ${config.color}`}>
//                         <div className="detail-header-content">
//                             <div className="detail-header-left">
//                                 <h1 className="detail-order-id">#{selectedOrder.id}</h1>
//                                 <p>Placed on {new Date(selectedOrder.created_at).toLocaleDateString()} at {new Date(selectedOrder.created_at).toLocaleTimeString()}</p>
//                                 <p>Table: {tablesMap[selectedOrder.table_id] || selectedOrder.table_id}</p>
//                             </div>
//                             <div className="detail-header-right">
//                                 <select
//                                     value={selectedOrder.status || 'pending'}
//                                     onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
//                                     className="status-select"
//                                 >
//                                     <option value="pending">Pending</option>
//                                     <option value="preparing">Preparing</option>
//                                     <option value="new">New</option>
//                                     <option value="served">Served</option>
//                                     <option value="cancelled">Cancelled</option>
//                                 </select>
//                             </div>
//                         </div>
//                     </div>

//                     <div className="detail-info-grid">
//                         <div className="customer-info-section">
//                             <h3 className="section-title">
//                                 <i className="fas fa-user"></i>
//                                 Table Information
//                             </h3>
//                             <div className="info-card">
//                                 <div className="customer-details">
//                                     <div className="customer-avatar-large">
//                                         {tablesMap[selectedOrder.table_id]?.charAt(0) || 'T'}
//                                     </div>
//                                     <div className="customer-text">
//                                         <p className="customer-name">{tablesMap[selectedOrder.table_id] || `Table ${selectedOrder.table_id}`}</p>
//                                         <p className="customer-detail">Dine-in Order</p>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="payment-info-section">
//                             <h3 className="section-title">
//                                 <i className="fas fa-credit-card"></i>
//                                 Order Summary
//                             </h3>
//                             <div className="info-card">
//                                 <div className="payment-status">
//                                     <span className="payment-method">Total Amount</span>
//                                     <span className="payment-amount">₹{total.toFixed(2)}</span>
//                                 </div>
//                                 <div className="status-indicator">
//                                     <span className={`status-badge-small status-${selectedOrder.status?.toLowerCase() || 'pending'}`}>
//                                         {config.label}
//                                     </span>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Order Items */}
//                 <div className="detail-section">
//                     <div className="section-header">
//                         <h3 className="section-title">
//                             <i className="fas fa-shopping-bag"></i>
//                             Order Items ({selectedOrder.items?.length || 0})
//                         </h3>
//                         <button
//                             onClick={() => openEditModal(selectedOrder)}
//                             className="btn-primary"
//                         >
//                             <i className="fas fa-edit"></i>
//                             Edit Order
//                         </button>
//                     </div>

//                     <div className="items-list">
//                         {selectedOrder.items && selectedOrder.items.length > 0 ? (
//                             selectedOrder.items.map((item, index) => (
//                                 <div key={item.item_id || index} className="item-row">
//                                     <div className="item-info">
//                                         <div className="item-icon">
//                                             <i className="fas fa-utensils"></i>
//                                         </div>
//                                         <div className="item-details">
//                                             <h4 className="item-name">{item.item_name || `Item ${item.item_id}`}</h4>
//                                             <p className="item-description">{inventoryMap[item.item_id]?.description || 'No description'}</p>
//                                             <div className="item-badges">
//                                                 <span className="quantity-badge">
//                                                     Qty: {item.quantity || 1}
//                                                 </span>
//                                                 <span className={`status-badge-small status-${item.status?.toLowerCase() || 'new'}`}>
//                                                     {item.status || 'New'}
//                                                 </span>
//                                             </div>
//                                         </div>
//                                     </div>
//                                     <div className="item-price">
//                                         <div className="price-info">
//                                             <p className="total-price">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
//                                             <p className="unit-price">₹{(item.price || 0).toFixed(2)} each</p>
//                                         </div>
//                                         <button
//                                             onClick={() => {
//                                                 if (window.confirm('Delete this item?')) {
//                                                     const updatedItems = selectedOrder.items.filter(i => i.item_id !== item.item_id);
//                                                     const updatedOrder = { ...selectedOrder, items: updatedItems };
//                                                     const updatedOrders = orders.map(o =>
//                                                         o.id === selectedOrder.id ? updatedOrder : o
//                                                     );
//                                                     setOrders(updatedOrders);
//                                                     setSelectedOrder(updatedOrder);
//                                                 }
//                                             }}
//                                             className="btn-delete"
//                                         >
//                                             <i className="fas fa-trash"></i>
//                                         </button>
//                                     </div>
//                                 </div>
//                             ))
//                         ) : (
//                             <div className="no-items">
//                                 <p>No items in this order</p>
//                             </div>
//                         )}
//                     </div>
//                 </div>

//                 {/* Order Summary */}
//                 <div className="detail-section">
//                     <div className="section-header">
//                         <h3 className="section-title">
//                             <i className="fas fa-calculator"></i>
//                             Order Summary
//                         </h3>
//                     </div>

//                     <div className="summary-container">
//                         <div className="summary-rows">
//                             <div className="summary-row">
//                                 <span>Subtotal</span>
//                                 <span className="summary-value">₹{subtotal.toFixed(2)}</span>
//                             </div>
//                             <div className="summary-row">
//                                 <span>Tax & Fees</span>
//                                 <span className="summary-value">₹0.00</span>
//                             </div>
//                             <div className="summary-row total-row">
//                                 <span className="total-label">Total Amount</span>
//                                 <span className="total-amount">₹{total.toFixed(2)}</span>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="detail-section">
//                     <div className="action-buttons">
//                         <button
//                             onClick={() => window.print()}
//                             className="btn-success"
//                         >
//                             <i className="fas fa-print"></i>
//                             Print Invoice
//                         </button>

//                         <button
//                             onClick={() => openEditModal(selectedOrder)}
//                             className="btn-primary"
//                         >
//                             <i className="fas fa-edit"></i>
//                             Edit Order
//                         </button>

//                         <button
//                             onClick={() => openInvoiceModal(selectedOrder)}
//                             className="btn-info"
//                         >
//                             <i className="fas fa-receipt"></i>
//                             View Invoice
//                         </button>

//                         <button
//                             onClick={() => {
//                                 if (window.confirm('Delete this order permanently?')) {
//                                     setOrderToDelete(selectedOrder.id);
//                                     confirmDeleteOrder();
//                                     setCurrentView('dashboard');
//                                 }
//                             }}
//                             className="btn-danger"
//                         >
//                             <i className="fas fa-trash"></i>
//                             Delete Order
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     // Edit Order Modal Component
//     const EditOrderModal = () => {
//         if (!showEditModal || !editOrderId) return null;

//         const order = orders.find((o) => o.id === editOrderId);
//         if (!order) return null;

//         return (
//             <div className="modal-backdrop" onClick={closeEditModal}>
//                 <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//                     <div className="modal-header">
//                         <h3>Edit Order #{order.id} - Table: {tablesMap[order.table_id] || order.table_id}</h3>
//                         <button onClick={closeEditModal} className="modal-close">
//                             <i className="fas fa-times"></i>
//                         </button>
//                     </div>

//                     <div className="modal-body">
//                         <div className="edit-items-table">
//                             <table>
//                                 <thead>
//                                     <tr>
//                                         <th>Item</th>
//                                         <th>Qty</th>
//                                         <th>Status</th>
//                                         <th>Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {editedOrderItems.map((item) => (
//                                         <tr key={item.item_id}>
//                                             <td>{item.item_name || item.item_id}</td>
//                                             <td>
//                                                 <div className="quantity-controls">
//                                                     <button
//                                                         disabled={item.quantity <= 1}
//                                                         onClick={() => updateItemQuantity(item.item_id, item.quantity - 1)}
//                                                         className="qty-btn"
//                                                     >
//                                                         -
//                                                     </button>
//                                                     <span className="qty-value">{item.quantity}</span>
//                                                     <button
//                                                         onClick={() => updateItemQuantity(item.item_id, item.quantity + 1)}
//                                                         className="qty-btn"
//                                                     >
//                                                         +
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                             <td>
//                                                 <select
//                                                     value={item.status || 'new'}
//                                                     onChange={(e) => updateItemStatus(item.item_id, e.target.value)}
//                                                     className="status-select-small"
//                                                 >
//                                                     <option value="new">New</option>
//                                                     <option value="preparing">Preparing</option>
//                                                     <option value="served">Served</option>
//                                                     <option value="cancelled">Cancelled</option>
//                                                 </select>
//                                             </td>
//                                             <td>
//                                                 {item.status !== "cancelled" && (
//                                                     <button
//                                                         onClick={() => removeItemFromOrder(item.item_id)}
//                                                         className="btn-delete-small"
//                                                     >
//                                                         Delete
//                                                     </button>
//                                                 )}
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>

//                         <div className="add-item-section">
//                             <div className="search-input-wrapper">
//                                 <input
//                                     type="text"
//                                     placeholder="Search items to add..."
//                                     value={itemSearchQuery}
//                                     onChange={(e) => setItemSearchQuery(e.target.value)}
//                                     className="search-input"
//                                 />
//                             </div>

//                             {itemSearchResults.length > 0 && (
//                                 <div className="search-results">
//                                     {itemSearchResults.map((item) => (
//                                         <div
//                                             key={item.id}
//                                             className="search-result-item"
//                                             onClick={() => addItemToOrder(item)}
//                                         >
//                                             {item.name} - ₹{item.price}
//                                         </div>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     <div className="modal-footer">
//                         <button onClick={saveEditedOrderItems} className="btn-primary">
//                             Save Changes
//                         </button>
//                         <button onClick={closeEditModal} className="btn-secondary">
//                             Cancel
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     // Delete Order Modal Component
//     const DeleteOrderModal = () => {
//         if (!showDeleteModal) return null;

//         return (
//             <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
//                 <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
//                     <div className="modal-header">
//                         <h3>Delete Order</h3>
//                     </div>
//                     <div className="modal-body text-center">
//                         <p>Delete this order permanently?</p>
//                     </div>
//                     <div className="modal-footer">
//                         <button onClick={confirmDeleteOrder} className="btn-danger">
//                             Yes, Delete
//                         </button>
//                         <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
//                             Cancel
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     // Main render
//     return (
//         <div className="orders-app">

//             <main className="main-content">
//                 {currentView === 'dashboard' ? (
//                     <>
//                         {/* <StatsCards /> */}
//                         <SearchAndFilter />
//                         <OrdersGrid />
//                     </>
//                 ) : (
//                     <OrderDetailView />
//                 )}
//             </main>

//             {/* Modals */}
//             <EditOrderModal />
//             <DeleteOrderModal />

//             {/* Invoice Modal */}
//             {showInvoiceModal && invoiceOrder && (
//                 <InvoiceModal order={invoiceOrder} onClose={closeInvoiceModal} />
//             )}

//             {/* Floating Action Button */}
//             <div className="floating-action">
//                 <button className="fab">
//                     <i className="fas fa-plus"></i>
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default OrdersVisiblePage;