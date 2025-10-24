import React, { useEffect, useState, useRef } from "react";
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
    const token = localStorage.getItem("access_token") || localStorage.getItem("access_token");
    const [inventoryMap, setInventoryMap] = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [tablesMap, setTablesMap] = useState({});
    const [editOrderId, setEditOrderId] = useState(null);
    const [showDeleteModals, setShowDeleteModals] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState({ orderId: null, itemBackendId: null });
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
    const [tables, setTables] = useState([]); const newlyAddedItemsRef = useRef({});
    const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const [newlyAddedItems, setNewlyAddedItems] = useState({});
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
        // ✅ Don't filter out existing items - allow duplicates
        const filtered = allInventoryItems.filter((item) =>
            (item.name || "").toLowerCase().includes(itemSearchQuery.toLowerCase())
        );
        setItemSearchResults(filtered);
    }, [itemSearchQuery, allInventoryItems, expandedOrderIndex, orders]);
    const addItemToOrder = (orderId, selectedItem) => {
        console.log("🟢 Adding item to order:", selectedItem);
    
        const timestamp = Date.now();
    
        setOrders(prevOrders => {
            return prevOrders.map(order => {
                if (order.id !== orderId) return order;
    
                const newItem = {
                    item_id: selectedItem.id,
                    item_name: selectedItem.name,
                    quantity: 1,
                    price: selectedItem.unit_price,
                    status: "new",
                    note: "",
                    slug: selectedItem.slug || generateSlug(selectedItem.name),
                    added_at_frontend: timestamp, // Mark when it was added
                };
    
                const newItems = [...order.items, newItem];
    
                return {
                    ...order,
                    items: newItems,
                    has_new_items: true // Flag to indicate this order has new items
                };
            });
        });
    
        // Mark this order as having new items in localStorage
        const storageKey = `order_${orderId}_has_new_items`;
        const existingNewItemsCount = parseInt(localStorage.getItem(`order_${orderId}_new_items_count`) || '0');
        localStorage.setItem(storageKey, 'true');
        localStorage.setItem(`order_${orderId}_new_items_count`, (existingNewItemsCount + 1).toString());
        localStorage.setItem(`order_${orderId}_first_new_index`, (existingNewItemsCount === 0 ? 'pending' : localStorage.getItem(`order_${orderId}_first_new_index`)));
    
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
    const generateSlug = (name) => {
        return name.toLowerCase().replace(/[\s]+/g, "-");
    };
    useEffect(() => {
        const fetchOrders = async () => {
            if (!token || !clientId) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
    
                const allOrders = res.data?.data || [];
    
                // Preserve frontend-only fields and check localStorage
                setOrders(prevOrders => {
                    return allOrders.map(newOrder => {
                        const prevOrder = prevOrders.find(o => o.id === newOrder.id);
                        
                        // Check if this order has new items flag in localStorage
                        const hasNewItemsInStorage = localStorage.getItem(`order_${newOrder.id}_has_new_items`) === 'true';
                        const newItemsCount = parseInt(localStorage.getItem(`order_${newOrder.id}_new_items_count`) || '0');
                        
                        // If order is served, clear the new items flag
                        if (newOrder.status === 'served') {
                            localStorage.removeItem(`order_${newOrder.id}_has_new_items`);
                            localStorage.removeItem(`order_${newOrder.id}_new_items_count`);
                            localStorage.removeItem(`order_${newOrder.id}_first_new_index`);
                            return newOrder;
                        }
    
                        // Merge items with frontend flags
                        let mergedItems = newOrder.items;
                        if (prevOrder && prevOrder.items) {
                            mergedItems = newOrder.items.map((newItem, idx) => {
                                const prevItem = prevOrder.items.find(
                                    pi => pi.id === newItem.id || 
                                          (pi.item_id === newItem.item_id && !pi.id && !newItem.id)
                                );
                                
                                // Preserve frontend timestamp
                                if (prevItem?.added_at_frontend) {
                                    return { ...newItem, added_at_frontend: prevItem.added_at_frontend };
                                }
                                return newItem;
                            });
                        }
    
                        // Calculate the divider position (count of old items)
                        const oldItemsCount = mergedItems.length - newItemsCount;
    
                        return { 
                            ...newOrder, 
                            items: mergedItems,
                            has_new_items: hasNewItemsInStorage,
                            new_items_start_index: oldItemsCount > 0 ? oldItemsCount : null
                        };
                    });
                });
    
            } catch {
                toast.error("Failed to fetch orders");
            } finally {
                setLoading(false);
            }
        };
    
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
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
    // Add this in both OrdersVisiblePage.jsx and KitchenDisplay.jsx
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const keysToRemove = [];
            const maxAge = 30 * 60 * 1000; // 30 minutes

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('new_item_')) {
                    const timestamp = parseInt(localStorage.getItem(key), 10);
                    const age = Date.now() - timestamp;

                    if (age > maxAge) {
                        keysToRemove.push(key);

                        // Also remove from ref
                        const parts = key.replace('new_item_', '').split('_');
                        if (parts.length >= 3) {
                            const orderId = parseInt(parts[0], 10);
                            const uniqueKey = parts.slice(1).join('_');

                            if (newlyAddedItemsRef.current[orderId]) {
                                delete newlyAddedItemsRef.current[orderId][uniqueKey];
                            }
                        }
                    }
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
        }, 60000); // Check every minute

        return () => clearInterval(cleanupInterval);
    }, []);
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
    
            // If served, free the table AND clear new items flags
            if (newStatus === "served") {
                localStorage.removeItem(`order_${orderId}_has_new_items`);
                localStorage.removeItem(`order_${orderId}_new_items_count`);
                localStorage.removeItem(`order_${orderId}_first_new_index`);
                
                if (tableObj) {
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
            }
    
            toast.success("Order status updated");
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, has_new_items: newStatus === 'served' ? false : o.has_new_items } : o))
            );
    
            // Update selectedOrder if modal is open
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => ({
                    ...prev,
                    status: newStatus,
                    has_new_items: newStatus === 'served' ? false : prev.has_new_items
                }));
            }
    
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


    // ✅ Updated cancelItem to accept backend id
    const cancelItem = async (orderId, itemBackendId) => {
        const order = orders.find((o) => o.id === orderId);
        const item = order?.items.find((i) => i.id === itemBackendId);
        if (!item) return;

        try {
            await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`, {
                params: { order_item_id: itemBackendId, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });

            const updatedOrders = orders.map((o) => {
                if (o.id !== orderId) return o;

                const updatedItems = o.items.filter((i) => i.id !== itemBackendId);

                const newTotal = updatedItems.reduce((sum, item) => {
                    const price = inventoryMap[item.item_id]?.unit_price || item.price || 0;
                    return sum + (item.quantity || 1) * price;
                }, 0);

                return { ...o, items: updatedItems, total_price: newTotal };
            });

            setOrders(updatedOrders);

            const newOrder = updatedOrders.find((o) => o.id === orderId);
            if (newOrder) {
                await axios.post(
                    `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                    { id: orderId, total_price: newOrder.total_price },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            setEditedItemsMap((prev) => {
                const updated = (prev[orderId] || []).filter((i) => i.id !== itemBackendId);
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
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderId}`,
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
                                                    setSelectedOrder(order);
                                                    setShowOrderDetailModal(true);
                                                }}
                                            >
                                                <span className={`orders-visible-arrow-icon${expandedOrderIndex === index ? " " : "up"}`}>
                                                    <MdOutlineKeyboardDoubleArrowDown />
                                                </span>
                                            </button>
                                        </div>


                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
                {showOrderDetailModal && selectedOrder && (
                    <div className="orders-visible-modal-overlay" onClick={() => setShowOrderDetailModal(false)}>
                        <div className="orders-detail-popup" onClick={(e) => e.stopPropagation()}>
                            {/* Left Side - Available Items */}
                            <div className="orders-detail-left">
                                <h3>Available Items</h3>
                                <input
                                    type="text"
                                    className="orders-visible-item-search"
                                    placeholder="Search items..."
                                    value={itemSearchQuery}
                                    onChange={(e) => setItemSearchQuery(e.target.value)}
                                />
                                <div className="orders-detail-items-list">
                                    {itemSearchResults.length > 0 ? (
                                        <ul className="orders-visible-search-results">
                                            {itemSearchResults.map((item) => (
                                                <li key={item.id} onClick={() => {
                                                    addItemToOrder(selectedOrder.id, item);
                                                    setSelectedOrder(prev => ({
                                                        ...prev,
                                                        items: [...prev.items, {
                                                            item_id: item.id,
                                                            item_name: item.name,
                                                            quantity: 1,
                                                            price: item.unit_price,
                                                            status: "new",
                                                        }]
                                                    }));
                                                }}>
                                                    <span>{item.name}</span>
                                                    <span>₹{item.unit_price}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="orders-detail-all-items">
                                            {allInventoryItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="orders-detail-item-card"
                                                    onClick={() => {
                                                        addItemToOrder(selectedOrder.id, item);
                                                        setSelectedOrder(prev => ({
                                                            ...prev,
                                                            items: [...prev.items, {
                                                                item_id: item.id,
                                                                item_name: item.name,
                                                                quantity: 1,
                                                                price: item.unit_price,
                                                                status: "new",
                                                            }]
                                                        }));
                                                    }}
                                                >
                                                    <span>{item.name}</span>
                                                    <span>₹{item.unit_price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Side - Order Details */}
                            <div className="orders-detail-right">
                                <div className="orders-detail-header">
                                    <button
                                        className="orders-detail-close"
                                        onClick={() => setShowOrderDetailModal(false)}
                                    >
                                        ×
                                    </button>
                                    <h2>{tablesMap[selectedOrder.table_id] || selectedOrder.table_id}</h2>
                                    <span className="orders-visible-items-count">
                                        {selectedOrder.items.length} items
                                    </span>
                                    <button
                                        className="orders-visible-invoice-btn"
                                        onClick={() => openInvoiceModal(selectedOrder)}
                                    >
                                        Invoice
                                    </button>
                                </div>

                                <div className="orders-detail-info">
                                    <span>Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                                    <span>
                                        Total: ₹{selectedOrder.items.reduce(
                                            (sum, item) =>
                                                sum + ((inventoryMap[item.item_id]?.unit_price || item.unit_price || item.price || 0) * (item.quantity || 1)),
                                            0
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="orders-detail-items">
    {editOrderId === selectedOrder.id ? (
        <div className="orders-visible-edit-items-list">
            {selectedOrder.items.map((item, idx) => {
                // Show divider only at the transition point (once)
                const showDivider = selectedOrder.has_new_items && 
                                   selectedOrder.new_items_start_index !== null &&
                                   idx === selectedOrder.new_items_start_index;

                return (
                    <React.Fragment key={item.id || idx}>
                        {showDivider && (
                            <div className="orders-item-divider">
                                <span>Newly Added Items</span>
                            </div>
                        )}
                        <div className="orders-visible-edit-item-row">
                            <span>{item.item_name || item.item_id}</span>
                            <div className="orders-visible-edit-qty-controls">
                                <button
                                    onClick={() => {
                                        updateItemQuantity(selectedOrder.id, item.item_id, item.quantity - 1);
                                        setSelectedOrder(prev => ({
                                            ...prev,
                                            items: prev.items.map(i => 
                                                i.id === item.id
                                                    ? {...i, quantity: Math.max(1, i.quantity - 1)}
                                                    : i
                                            )
                                        }));
                                    }}
                                    disabled={item.quantity <= 1}
                                >
                                    −
                                </button>
                                <span>{item.quantity}</span>
                                <button onClick={() => {
                                    updateItemQuantity(selectedOrder.id, item.item_id, item.quantity + 1);
                                    setSelectedOrder(prev => ({
                                        ...prev,
                                        items: prev.items.map(i => 
                                            i.id === item.id
                                                ? {...i, quantity: i.quantity + 1}
                                                : i
                                        )
                                    }));
                                }}>+</button>
                            </div>
                            <button
                                className="orders-visible-btn orders-visible-edit-delete-btn"
                                onClick={() => {
                                    setDeleteTarget({ orderId: selectedOrder.id, itemBackendId: item.id });
                                    setShowDeleteModals(true);
                                }}
                                disabled={item.status === "cancelled"}
                            >
                                Delete
                            </button>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    ) : (
        selectedOrder.items.map((item, idx) => {
            // Show divider only at the transition point (once)
            const showDivider = selectedOrder.has_new_items && 
                               selectedOrder.new_items_start_index !== null &&
                               idx === selectedOrder.new_items_start_index;

            return (
                <React.Fragment key={item.id || idx}>
                    {showDivider && (
                        <div className="orders-item-divider">
                            <span>Newly Added Items</span>
                        </div>
                    )}
                    <div className="orders-visible-item-row">
                        <span>{item.item_name || item.item_id}</span>
                        <span>Qty: {item.quantity}</span>
                    </div>
                </React.Fragment>
            );
        })
    )}
</div>

                                <div className="orders-detail-actions">
                                    {editOrderId === selectedOrder.id ? (
                                        <>
                                            <button
                                                className="orders-visible-btn orders-visible-save-btn"
                                                onClick={() => {
                                                    updateOrderItems(selectedOrder.id, selectedOrder.items);
                                                }}
                                            >
                                                Save Items
                                            </button>
                                            <button
                                                className="orders-visible-btn orders-visible-edit-btn active"
                                                onClick={() => setEditOrderId(null)}
                                            >
                                                Done Editing
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="orders-visible-btn orders-visible-edit-btn"
                                            onClick={() => setEditOrderId(selectedOrder.id)}
                                        >
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        className="orders-visible-btn orders-visible-served-btn"
                                        disabled={selectedOrder.status === "served"}
                                        onClick={() => {
                                            handleStatusChange(selectedOrder.id, "served");
                                            setShowOrderDetailModal(false);
                                        }}
                                    >
                                        Served
                                    </button>
                                    <button
                                        className="orders-visible-btn orders-visible-delete-btn"
                                        onClick={() => {
                                            setOrderToDelete(selectedOrder.id);
                                            setShowDeleteModal(true);
                                            setShowOrderDetailModal(false);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
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
                                        cancelItem(deleteTarget.orderId, deleteTarget.itemBackendId);
                                        setShowDeleteModals(false);
                                        setDeleteTarget({ orderId: null, itemBackendId: null });
                                    }}
                                >
                                    Yes
                                </button>
                                <button
                                    className="orders-visible-btn orders-visible-modal-no"
                                    onClick={() => {
                                        setShowDeleteModals(false);
                                        setDeleteTarget({ orderId: null, itemBackendId: null });
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
// ================
// ================
// ================
// ================
// ================