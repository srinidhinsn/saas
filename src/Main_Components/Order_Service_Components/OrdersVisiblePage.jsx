import React, { useEffect, useState } from "react";
import axios from 'axios';
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
    const [tables, setTables] = useState([]);

    useEffect(() => {
        if (tableId) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableId]);

    const statusColorMap = {
        pending: "rgb(165, 206, 244)",
        served: "rgb(192, 240, 164)",
        new: "rgb(191, 170, 124)",
    };

    // New: Fetch invoice payment_status by order IDs to mark paid visually
    const fetchInvoicesForOrders = async (ordersList) => {
        if (!ordersList || ordersList.length === 0) return;
        try {
            const orderIds = ordersList.map(o => o.id);
            // Fetch all invoices for client
            const res = await axios.get(`${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { client_id: clientId },
            });
            const invoices = res.data?.data || [];
            // Map orders with their payment_status from invoices
            const updatedOrders = ordersList.map(order => {
                const matchedInvoice = invoices.find(inv => inv.order_id?.toString() === order.id.toString());
                if (matchedInvoice && matchedInvoice.payment_status?.toLowerCase() === "paid") {
                    return { ...order, payment_status: "Paid" };
                }
                return { ...order, payment_status: order.payment_status || "Pending" };
            });
            setOrders(updatedOrders);
        } catch (error) {
            // Still set orders even if invoices fail
            setOrders(ordersList);
        }
    };

    const openInvoiceModal = (order) => {
        const tableName = tablesMap[order.table_id] || order.table_id;
        const itemsWithPrice = (order.items || []).map((item) => ({
            ...item,
            price: item.unit_price || inventoryMap[item.item_id]?.unit_price || 0,
        }));
        setInvoiceOrder({ ...order, table_name: tableName, items: itemsWithPrice });
        setShowInvoiceModal(true);
    };

    const closeInvoiceModal = () => {
        setInvoiceOrder(null);
        setShowInvoiceModal(false);
    };

    const fetchTables = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTables(res.data?.data || []);
            // Optionally build tablesMap from this as well
            const map = {};
            (res.data?.data || []).forEach(t => { map[t.id] = t.name; });
            setTablesMap(map);
        } catch (error) {
            console.error("Error fetching tables", error);
        }
    };

    useEffect(() => {
        if (clientId) fetchTables();
    }, [clientId]);

    useEffect(() => {
        axios
            .get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setAllInventoryItems(res.data.data || []);
                const map = {};
                (res.data.data || []).forEach(item => { map[item.id] = item; });
                setInventoryMap(map);
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
                    price: selectedItem.total_price,
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
                    const itemPrice = inventoryMap[item.item_id]?.unit_price || 0;
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
                const response = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                // Fetch invoices info to get payment_status per order
                await fetchInvoicesForOrders(response.data?.data || []);
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

    // Only one expanded order at a time
    const toggleExpand = (index) => {
        setExpandedOrderIndex((prev) => (prev === index ? null : index));
    };

    // Click 3 times to mark served
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

        const tableObj = tables.find((t) => t.id === order.table_id);

        try {
            // Update order status in order service
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: orderId, client_id: clientId, status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // If served, free the table
            if (newStatus === "served" && tableObj) {
                await axios.post(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                    {
                        id: order.table_id,
                        client_id: clientId,
                        name: tableObj.name,
                        table_type: tableObj.table_type,
                        status: "Vacant",
                        location_zone: tableObj.location_zone,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            // Update UI state orders as before
            toast.success("Order status updated");
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            );

            if (newStatus === "served") setEditOrderId(null);
        } catch (error) {
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
                (sum, item) => sum + (inventoryMap[item.item_id]?.unit_price || 0) * (item.quantity || 1),
                0
            );
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderId}`,
                itemsForUpdate,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
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
            await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`, {
                params: { order_item_id: item.id, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });
            const updatedOrders = orders.map((o) => {
                if (o.id !== orderId) return o;
                const updatedItems = o.items.filter((i) => i.item_id !== itemId);
                const newTotal = updatedItems.reduce((sum, item) => {
                    const price = inventoryMap[item.item_id]?.unit_price || item.price || 0;
                    return sum + (item.quantity || 1) * price;
                }, 0);
                return { ...o, items: updatedItems, unit_price: newTotal };
            });
            setOrders(updatedOrders);
            const newOrder = updatedOrders.find((o) => o.id === orderId);
            if (newOrder) {
                await axios.post(
                    `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                    { id: orderId, total_price: newOrder.unit_price },
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
            price: item.unit_price || inventoryMap[item.item_id || item.inventory_id]?.unit_price || 0,
            client_id: clientId,
            order_id: orderId,
        }));
        const totalPrice = cleanedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
        try {
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}${clientId}/order_items/update?order_id=${orderId}`,
                cleanedItems,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
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
            await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`, {
                params: { dinein_order_id: orderToDelete, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });

            const deletedOrder = orders.find(o => o.id === orderToDelete);
            const tableIdOfDeletedOrder = deletedOrder?.table_id;

            if (tableIdOfDeletedOrder) {
                const tableObj = tables.find(t => t.id === tableIdOfDeletedOrder);

                await axios.post(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                    {
                        id: tableIdOfDeletedOrder,
                        client_id: clientId,
                        name: tableObj?.name || "",
                        table_type: tableObj?.table_type || "",
                        status: "Vacant",
                        location_zone: tableObj?.location_zone || ""
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            setOrders(prev => prev.filter(o => o.id !== orderToDelete));
            setExpandedOrderIndex(null);
            setShowDeleteModal(false);
            setOrderToDelete(null);

            toast.success("Order deleted and table marked vacant.");
            fetchTables();
        } catch (err) {
            toast.error("❌ Failed to delete order or update table status");
        }
    };

    useEffect(() => {
        const fetchTables = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
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
                const res = await axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const inventoryList = res.data?.data || [];
                const map = {};
                inventoryList.forEach((item) => {
                    map[item.id] = item;
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
        case 0:
            filteredOrders = [...filteredOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 1:
            filteredOrders = [...filteredOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 2:
            filteredOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "new");
            break;
        case 3:
            filteredOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "preparing");
            break;
        case 4:
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
                            filteredOrders.map((order, index) => {
                                const isPaid = order.payment_status?.toLowerCase() === "paid";
                                return (
                                    <div
                                        key={order.id || index}
                                        className={`orders-visible-order-card${expandedOrderIndex === index ? " expanded" : ""}`}
                                        style={{
                                            backgroundColor: statusColorMap[order.status?.toLowerCase()] || "var(--status-prepare-bg)",
                                            border: isPaid ? "2px dashed red" : undefined,
                                            position: "relative",
                                        }}
                                        onClick={() => handleContainerClick(order.id)}
                                    >
                                        {isPaid && (
                                            <div style={{
                                                position: "absolute",
                                                top: 2,
                                                right: 6,
                                                fontSize: "24px",
                                                fontWeight: "bold",
                                                color: "red",
                                                userSelect: "none",
                                                pointerEvents: "none",
                                            }}>
                                                ×
                                            </div>
                                        )}
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
                                                <span>
                                                    Total: ₹{order.items.reduce(
                                                        (sum, item) =>
                                                            sum +
                                                            ((inventoryMap[item.item_id]?.unit_price || item.unit_price || item.price || 0) * (item.quantity || 1))
                                                        ,
                                                        0
                                                    ).toFixed(2)}
                                                </span>
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
                                                                        {item.name} - ₹{item.unit_price}
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
                                );
                            })
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
            <div style={{ position: 'absolute', bottom: '15px', right: '10px' }}>
                <p style={{ color: 'var(--bg-number-color)' }}>
                    <span
                        style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: "blue",
                            marginRight: "6px",
                        }}
                    ></span>
                    Ready
                </p>
                <p style={{ color: 'var(--bg-number-color)' }}>
                    <span
                        style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: "green",
                            marginRight: "6px",
                        }}
                    ></span>
                    Served
                </p>
                <p style={{ color: 'var(--bg-number-color)' }}>
                    <span
                        style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: "lightblue",
                            marginRight: "6px",
                        }}
                    ></span>
                    Preparing
                </p>
                <p style={{ color: 'var(--bg-number-color)' }}>
                    <span
                        style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: "rgb(191, 170, 124)",
                            marginRight: "6px",
                        }}
                    ></span>
                    New
                </p>
            </div>
        </div>
        </div>
    );
};

export default OrdersVisiblePage;