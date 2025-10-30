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
    const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
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
        // Only show search results when modal is open AND in edit mode
        if (
            !showOrderDetailModal ||
            !selectedOrder ||
            editOrderId !== selectedOrder?.id ||
            itemSearchQuery.trim() === ""
        ) {
            setItemSearchResults([]);
            return;
        }

        // ✅ Filter items based on search query
        const filtered = allInventoryItems.filter((item) =>
            (item.name || "").toLowerCase().includes(itemSearchQuery.toLowerCase())
        );
        setItemSearchResults(filtered);
    }, [itemSearchQuery, allInventoryItems, showOrderDetailModal, selectedOrder, editOrderId]);
    const addItemToOrder = (orderId, selectedItem) => {
        const existingItemInCurrentBatch = selectedOrder?.items.find(item =>
            item.item_id === selectedItem.id &&
            item.is_new_item &&
            item.batch_timestamp === currentBatchTimestamp
        );

        if (existingItemInCurrentBatch) {
            const itemIdentifier = existingItemInCurrentBatch.id || existingItemInCurrentBatch.frontend_unique_key;
            updateItemQuantity(orderId, itemIdentifier, existingItemInCurrentBatch.quantity + 1);
            setItemSearchQuery("");
            setItemSearchResults([]);
            return;
        }

        let batchTimestamp = currentBatchTimestamp;

        if (!batchTimestamp) {
            batchTimestamp = Date.now();
            setCurrentBatchTimestamp(batchTimestamp);

            const batchKey = `order_${orderId}_batch_${batchTimestamp}`;
            localStorage.setItem(batchKey, JSON.stringify({
                timestamp: batchTimestamp,
                started_at: Date.now(),
            }));
        }

        const timestamp = Date.now() + Math.random();
        const uniqueKey = `${selectedItem.id}_${timestamp}`;

        const newItem = {
            item_id: selectedItem.id,
            item_name: selectedItem.name,
            quantity: 1,
            price: selectedItem.unit_price,
            status: "new",
            note: "",
            slug: selectedItem.slug || generateSlug(selectedItem.name),
            added_at_frontend: timestamp,
            frontend_unique_key: uniqueKey,
            is_new_item: true,
            unit_price: selectedItem.unit_price || 0,  
    line_total: (selectedItem.unit_price || 0) * 1, 
            batch_timestamp: batchTimestamp,
            id: uniqueKey,
        };

        const storageKey = `order_${orderId}_new_item_${uniqueKey}`;
        localStorage.setItem(storageKey, JSON.stringify({
            item_id: selectedItem.id,
            unique_key: uniqueKey,
            added_at: timestamp,
            batch_timestamp: batchTimestamp,
            quantity: 1,
        }));

        // ✅ Update orders state with proper batch grouping
        setOrders(prevOrders => {
            return prevOrders.map(order => {
                if (order.id !== orderId) return order;

                const batches = getBatchesFromStorage(orderId);
                batches.sort((a, b) => a.timestamp - b.timestamp);

                // Separate old items
                const oldItems = order.items.filter(item => !item.is_new_item);

                // Group new items by batch
                const newItemsByBatch = new Map();
                batches.forEach(batch => {
                    newItemsByBatch.set(batch.timestamp, []);
                });

                // Add existing new items to their batches
                order.items.forEach(item => {
                    if (item.is_new_item && item.batch_timestamp) {
                        if (!newItemsByBatch.has(item.batch_timestamp)) {
                            newItemsByBatch.set(item.batch_timestamp, []);
                        }
                        newItemsByBatch.get(item.batch_timestamp).push(item);
                    }
                });

                // Add the new item to its batch
                if (!newItemsByBatch.has(batchTimestamp)) {
                    newItemsByBatch.set(batchTimestamp, []);
                }
                newItemsByBatch.get(batchTimestamp).push(newItem);

                // Build final items array
                const allItems = [...oldItems];
                const batchDividers = [];

                const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);

                sortedTimestamps.forEach((ts, idx) => {
                    const batchItems = newItemsByBatch.get(ts);
                    if (batchItems && batchItems.length > 0) {
                        batchDividers.push({
                            index: allItems.length,
                            batch_number: idx + 2,
                        });
                        allItems.push(...batchItems);
                    }
                });

                return {
                    ...order,
                    items: allItems,
                    has_new_items: true,
                    batch_dividers: batchDividers,
                };
            });
        });

        // ✅ Update selectedOrder
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => {
                const batches = getBatchesFromStorage(orderId);
                batches.sort((a, b) => a.timestamp - b.timestamp);

                const oldItems = prev.items.filter(item => !item.is_new_item);

                const newItemsByBatch = new Map();
                batches.forEach(batch => {
                    newItemsByBatch.set(batch.timestamp, []);
                });

                prev.items.forEach(item => {
                    if (item.is_new_item && item.batch_timestamp) {
                        if (!newItemsByBatch.has(item.batch_timestamp)) {
                            newItemsByBatch.set(item.batch_timestamp, []);
                        }
                        newItemsByBatch.get(item.batch_timestamp).push(item);
                    }
                });

                if (!newItemsByBatch.has(batchTimestamp)) {
                    newItemsByBatch.set(batchTimestamp, []);
                }
                newItemsByBatch.get(batchTimestamp).push(newItem);

                const allItems = [...oldItems];
                const batchDividers = [];

                const sortedTimestamps = Array.from(newItemsByBatch.keys()).sort((a, b) => a - b);

                sortedTimestamps.forEach((ts, idx) => {
                    const batchItems = newItemsByBatch.get(ts);
                    if (batchItems && batchItems.length > 0) {
                        batchDividers.push({
                            index: allItems.length,
                            batch_number: idx + 2,
                        });
                        allItems.push(...batchItems);
                    }
                });

                return {
                    ...prev,
                    items: allItems,
                    has_new_items: true,
                    batch_dividers: batchDividers,
                };
            });
        }

        setItemSearchQuery("");
        setItemSearchResults([]);
    };
    const updateItemQuantity = (orderId, itemIdentifier, newQty) => {
        setOrders((prev) =>
            prev.map((order) => {
                if (order.id !== orderId) return order;

                const updatedItems = order.items.map((item) => {
                    const itemKey = item.id || item.frontend_unique_key;
                    if (itemKey === itemIdentifier) {
                        // ✅ Update localStorage if it's an unsaved item
                        if (item.frontend_unique_key && item.is_new_item) {
                            const storageKey = `order_${orderId}_new_item_${item.frontend_unique_key}`;
                            const storageData = localStorage.getItem(storageKey);
                            if (storageData) {
                                try {
                                    const data = JSON.parse(storageData);
                                    data.quantity = newQty > 0 ? newQty : 1;
                                    localStorage.setItem(storageKey, JSON.stringify(data));
                                } catch (e) {
                                    console.error("Error updating localStorage quantity:", e);
                                }
                            }
                        }
                        return { ...item, quantity: newQty > 0 ? newQty : 1 };
                    }
                    return item;
                });

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

        // ✅ Update selectedOrder if modal is open
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => ({
                ...prev,
                items: prev.items.map(item => {
                    const itemKey = item.id || item.frontend_unique_key;
                    if (itemKey === itemIdentifier) {
                        return { ...item, quantity: newQty > 0 ? newQty : 1 };
                    }
                    return item;
                })
            }));
        }

        setEditedItemsMap((prev) => {
            const currentItems = orders.find((o) => o.id === orderId)?.items || [];
            const updated = currentItems.map((item) => {
                const itemKey = item.id || item.frontend_unique_key;
                if (itemKey === itemIdentifier) {
                    return { ...item, quantity: newQty > 0 ? newQty : 1 };
                }
                return item;
            });
            return { ...prev, [orderId]: updated };
        });
    };

    useEffect(() => {
        document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode]);
    const generateSlug = (name) => {
        return name.toLowerCase().replace(/[\s]+/g, "-");
    };

    const getNewItemsFromStorage = (orderId) => {
        const newItems = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`order_${orderId}_new_item_`)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    newItems.push(data);
                } catch (e) {
                    console.error("Error parsing localStorage item:", e);
                }
            }
        }
        return newItems;
    };

    const getBatchesFromStorage = (orderId) => {
        const batchMap = new Map();

        // ✅ First, collect all batch timestamps from batch keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`order_${orderId}_batch_`)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.timestamp && !batchMap.has(data.timestamp)) {
                        batchMap.set(data.timestamp, []);
                    }
                } catch (e) { }
            }
        }

        // ✅ Then, collect all items and assign them to their batches
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`order_${orderId}_new_item_`)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.batch_timestamp) {
                        if (!batchMap.has(data.batch_timestamp)) {
                            batchMap.set(data.batch_timestamp, []);
                        }
                        batchMap.get(data.batch_timestamp).push(data.item_id);
                    }
                } catch (e) {
                    console.error("Error parsing localStorage item:", e);
                }
            }
        }

        // Convert map to sorted array of batch objects
        const batches = Array.from(batchMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([timestamp, item_ids]) => ({
                timestamp: timestamp,
                item_ids: item_ids,
            }));

        return batches;
    };

    // Clear batches when order is served
    const clearNewItemsStorage = (orderId) => {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.startsWith(`order_${orderId}_new_item_`) ||
                key.startsWith(`order_${orderId}_batch_`)
            )) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
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
    
                setOrders(allOrders.map(order => {
                    if (order.status === 'served') {
                        clearNewItemsStorage(order.id);
                        return order;
                    }
    
                    // ✅ Get localStorage data
                    const newItemsFromStorage = getNewItemsFromStorage(order.id);
                    const storageUniqueKeys = new Set(newItemsFromStorage.map(item => item.unique_key));
    
                    // ✅ Build a map: frontend_unique_key → batch_timestamp from localStorage
                    const keyToBatchMap = new Map();
                    newItemsFromStorage.forEach(storageItem => {
                        if (storageItem.unique_key && storageItem.batch_timestamp) {
                            keyToBatchMap.set(storageItem.unique_key, storageItem.batch_timestamp);
                        }
                    });
    
                    // ✅ Separate items into categories
                    const oldItems = []; // Items WITHOUT frontend_unique_key
                    const batchItemsMap = new Map(); // Items WITH frontend_unique_key, grouped by batch
                    const unsavedItems = []; // Items in localStorage but NOT in backend yet
    
                    // ✅ Track which localStorage keys are already in backend
                    const backendUniqueKeys = new Set(
                        order.items
                            .filter(item => item.frontend_unique_key)
                            .map(item => item.frontend_unique_key)
                    );
    
                    // ✅ Process backend items
                    order.items.forEach((item) => {
                        if (item.frontend_unique_key) {
                            // Item has a unique key - it's part of a batch
                            // Get batch timestamp from localStorage OR extract from the key itself
                            let batchTimestamp = keyToBatchMap.get(item.frontend_unique_key);
                            
                            if (!batchTimestamp) {
                                // ✅ CRITICAL: If not in localStorage, extract timestamp from the key
                                // Format: {item_id}_{timestamp}
                                const parts = item.frontend_unique_key.split('_');
                                if (parts.length >= 2) {
                                    const extractedTimestamp = parseFloat(parts[parts.length - 1]);
                                    if (!isNaN(extractedTimestamp)) {
                                        // Round to batch start (e.g., group items added within same session)
                                        // We'll use the key's timestamp directly as batch identifier
                                        batchTimestamp = Math.floor(extractedTimestamp / 1000) * 1000; // Round to nearest second
                                    }
                                }
                            }
    
                            if (batchTimestamp) {
                                if (!batchItemsMap.has(batchTimestamp)) {
                                    batchItemsMap.set(batchTimestamp, []);
                                }
                                batchItemsMap.get(batchTimestamp).push({
                                    ...item,
                                    is_new_item: true,
                                    batch_timestamp: batchTimestamp,
                                });
                            } else {
                                // Fallback: treat as old item if we can't determine batch
                                oldItems.push(item);
                            }
                        } else {
                            // No frontend_unique_key = OLD item
                            oldItems.push(item);
                        }
                    });
    
                    // ✅ Add truly unsaved items from localStorage
                    newItemsFromStorage.forEach(storageItem => {
                        if (!backendUniqueKeys.has(storageItem.unique_key)) {
                            const itemInfo = inventoryMap[storageItem.item_id];
                            if (itemInfo && storageItem.batch_timestamp) {
                                if (!batchItemsMap.has(storageItem.batch_timestamp)) {
                                    batchItemsMap.set(storageItem.batch_timestamp, []);
                                }
                                batchItemsMap.get(storageItem.batch_timestamp).push({
                                    item_id: storageItem.item_id,
                                    item_name: itemInfo.name,
                                    quantity: storageItem.quantity || 1,
                                    price: itemInfo.unit_price,
                                    status: "new",
                                    note: "",
                                    slug: itemInfo.slug || generateSlug(itemInfo.name),
                                    added_at_frontend: storageItem.added_at,
                                    frontend_unique_key: storageItem.unique_key,
                                    is_new_item: true,
                                    batch_timestamp: storageItem.batch_timestamp,
                                    id: storageItem.unique_key,
                                });
                            }
                        }
                    });
    
                    // ✅ Build final items array with dividers
                    const allItems = [...oldItems];
                    const batchDividers = [];
    
                    // Sort batches by timestamp
                    const sortedBatchTimestamps = Array.from(batchItemsMap.keys()).sort((a, b) => a - b);
    
                    sortedBatchTimestamps.forEach((timestamp, batchIdx) => {
                        const batchItems = batchItemsMap.get(timestamp);
                        if (batchItems && batchItems.length > 0) {
                            batchDividers.push({
                                index: allItems.length,
                                batch_number: batchIdx + 2,
                            });
                            allItems.push(...batchItems);
                        }
                    });
    
                    return {
                        ...order,
                        items: allItems,
                        has_new_items: batchItemsMap.size > 0,
                        batch_dividers: batchDividers,
                    };
                }));
    
            } catch {
                toast.error("Failed to fetch orders");
            } finally {
                setLoading(false);
            }
        };
    
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [clientId, token, inventoryMap]);
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
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: orderId, client_id: clientId, status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

        

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
            

            toast.success("Order status updated");

            // ✅ Update both orders and selectedOrder states
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? {
                    ...o,
                    status: newStatus,
                    has_new_items: newStatus === 'served' ? false : o.has_new_items,
                    new_items_start_index: newStatus === 'served' ? null : o.new_items_start_index,
                } : o))
            );

            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => ({
                    ...prev,
                    status: newStatus,
                    has_new_items: newStatus === 'served' ? false : prev.has_new_items,
                    new_items_start_index: newStatus === 'served' ? null : prev.new_items_start_index,
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

    const cancelItem = async (orderId, itemBackendId) => {
        const order = orders.find((o) => o.id === orderId);
        const item = order?.items.find((i) => i.id === itemBackendId);
        if (!item) return;

        try {
            // ✅ If it's an unsaved item (temporary ID), just remove from localStorage
            if (typeof itemBackendId === 'string' && (itemBackendId.startsWith('temp_') || !itemBackendId.includes('_'))) {
                // This is an unsaved item, just remove from localStorage
                const storageKey = `order_${orderId}_new_item_${item.frontend_unique_key}`;
                localStorage.removeItem(storageKey);

                // Update state
                const updatedOrders = orders.map((o) => {
                    if (o.id !== orderId) return o;
                    const updatedItems = o.items.filter((i) => i.id !== itemBackendId);

                    // Recalculate dividers
                    const batches = getBatchesFromStorage(orderId);
                    batches.sort((a, b) => a.timestamp - b.timestamp);
                    const batchDividers = [];
                    batches.forEach((batch, batchIdx) => {
                        const firstItemIndex = updatedItems.findIndex(
                            item => item.batch_timestamp === batch.timestamp
                        );
                        if (firstItemIndex !== -1) {
                            batchDividers.push({
                                index: firstItemIndex,
                                batch_number: batchIdx + 2,
                            });
                        }
                    });

                    return {
                        ...o,
                        items: updatedItems,
                        has_new_items: updatedItems.some(i => i.is_new_item),
                        batch_dividers: batchDividers,
                    };
                });

                setOrders(updatedOrders);

                if (selectedOrder?.id === orderId) {
                    const updatedOrder = updatedOrders.find(o => o.id === orderId);
                    if (updatedOrder) {
                        setSelectedOrder(updatedOrder);
                    }
                }

                toast.success("Item removed");
                return;
            }

            // ✅ Otherwise, it's a saved item - delete from backend
            await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`, {
                params: { order_item_id: itemBackendId, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });

            // ✅ Remove from localStorage if it's a new item
            if (item.is_new_item && item.frontend_unique_key) {
                const storageKey = `order_${orderId}_new_item_${item.frontend_unique_key}`;
                localStorage.removeItem(storageKey);
            }

            // ✅ Update orders state
            const updatedOrders = orders.map((o) => {
                if (o.id !== orderId) return o;

                const updatedItems = o.items.filter((i) => i.id !== itemBackendId);

                const newTotal = updatedItems.reduce((sum, item) => {
                    const price = inventoryMap[item.item_id]?.unit_price || item.price || 0;
                    return sum + (item.quantity || 1) * price;
                }, 0);

                // ✅ Recalculate batch dividers
                const batches = getBatchesFromStorage(orderId);
                batches.sort((a, b) => a.timestamp - b.timestamp);

                const batchDividers = [];
                batches.forEach((batch, batchIdx) => {
                    const firstItemIndex = updatedItems.findIndex(
                        item => item.batch_timestamp === batch.timestamp
                    );
                    if (firstItemIndex !== -1) {
                        batchDividers.push({
                            index: firstItemIndex,
                            batch_number: batchIdx + 2,
                        });
                    }
                });

                return {
                    ...o,
                    items: updatedItems,
                    total_price: newTotal,
                    has_new_items: updatedItems.some(i => i.is_new_item),
                    batch_dividers: batchDividers,
                };
            });

            setOrders(updatedOrders);

            // ✅ Update selectedOrder with recalculated dividers
            if (selectedOrder?.id === orderId) {
                const updatedOrder = updatedOrders.find(o => o.id === orderId);
                if (updatedOrder) {
                    setSelectedOrder(updatedOrder);
                }
            }

            const newOrder = updatedOrders.find((o) => o.id === orderId);
            if (newOrder) {
                await axios.post(
                    `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                    { id: orderId, total_price: newOrder.total_price },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            toast.success("Item cancelled and total updated");
        } catch (err) {
            toast.error("❌ Failed to cancel item.");
        }
    };
    const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
        const itemsToSave = updatedItemsWithStatuses.filter(item => {
            return typeof item.id === 'number' || item.is_new_item;
        });

        const cleanedItems = itemsToSave.map((item) => ({
            item_id: item.item_id || item.inventory_id,
            item_name: item.name || item.item_name,
            quantity: item.quantity || 1,
            status: item.status || "new",
            note: item.note || "",
            slug: item.slug || "",
            price: item.unit_price || item.price || inventoryMap[item.item_id || item.inventory_id]?.unit_price || 0,
            unit_price: item.unit_price || item.price || inventoryMap[item.item_id || item.inventory_id]?.unit_price || 0,  // ✅ Add this line
            line_total: (item.unit_price || item.price || 0) * (item.quantity || 1),  client_id: clientId,
            order_id: orderId,
            frontend_unique_key: item.frontend_unique_key || null,
        }));

        const totalPrice = cleanedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

            // ✅ DON'T clear localStorage - keep it for batch tracking
            // ✅ Reset current batch timestamp so next additions create NEW batch
            setCurrentBatchTimestamp(null);

            toast.success("Items saved successfully!");

            // ✅ Fetch fresh data - localStorage will still differentiate batches
            const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const allOrders = res.data?.data || [];

            // ✅ Re-process with localStorage intact
            const updatedOrderFromBackend = allOrders.find(o => o.id === orderId);

            if (updatedOrderFromBackend) {
                // Process with existing fetchOrders logic
                const batches = getBatchesFromStorage(orderId);
                const newItemsFromStorage = getNewItemsFromStorage(orderId);

                if (batches.length === 0 && newItemsFromStorage.length === 0) {
                    setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updatedOrderFromBackend : o));
                    if (selectedOrder?.id === orderId) {
                        setSelectedOrder(updatedOrderFromBackend);
                    }
                    return;
                }

                batches.sort((a, b) => a.timestamp - b.timestamp);

                const storageMap = new Map();
                newItemsFromStorage.forEach(storageItem => {
                    storageMap.set(storageItem.unique_key, storageItem);
                });

                const storageUniqueKeys = new Set(newItemsFromStorage.map(item => item.unique_key));
                const backendUniqueKeys = new Set(
                    updatedOrderFromBackend.items
                        .filter(item => item.frontend_unique_key)
                        .map(item => item.frontend_unique_key)
                );

                const oldItems = [];
                updatedOrderFromBackend.items.forEach((item) => {
                    if (!item.frontend_unique_key || !storageUniqueKeys.has(item.frontend_unique_key)) {
                        oldItems.push(item);
                    }
                });

                const batchGroups = new Map();
                batches.forEach(batch => {
                    batchGroups.set(batch.timestamp, []);
                });

                updatedOrderFromBackend.items.forEach((item) => {
                    if (item.frontend_unique_key && storageUniqueKeys.has(item.frontend_unique_key)) {
                        const storageItem = storageMap.get(item.frontend_unique_key);
                        if (storageItem && storageItem.batch_timestamp) {
                            if (!batchGroups.has(storageItem.batch_timestamp)) {
                                batchGroups.set(storageItem.batch_timestamp, []);
                            }
                            batchGroups.get(storageItem.batch_timestamp).push({
                                ...item,
                                is_new_item: true,
                                batch_timestamp: storageItem.batch_timestamp,
                            });
                        }
                    }
                });

                newItemsFromStorage.forEach(storageItem => {
                    if (!backendUniqueKeys.has(storageItem.unique_key)) {
                        const itemInfo = inventoryMap[storageItem.item_id];
                        if (itemInfo && storageItem.batch_timestamp) {
                            if (!batchGroups.has(storageItem.batch_timestamp)) {
                                batchGroups.set(storageItem.batch_timestamp, []);
                            }
                            batchGroups.get(storageItem.batch_timestamp).push({
                                item_id: storageItem.item_id,
                                item_name: itemInfo.name,
                                quantity: storageItem.quantity || 1,
                                price: itemInfo.unit_price,
                                status: "new",
                                note: "",
                                slug: itemInfo.slug || generateSlug(itemInfo.name),
                                added_at_frontend: storageItem.added_at,
                                frontend_unique_key: storageItem.unique_key,
                                is_new_item: true,
                                batch_timestamp: storageItem.batch_timestamp,
                                id: storageItem.unique_key,
                            });
                        }
                    }
                });

                const allItems = [...oldItems];
                const batchDividers = [];

                const sortedBatchTimestamps = Array.from(batchGroups.keys()).sort((a, b) => a - b);

                sortedBatchTimestamps.forEach((timestamp, batchIdx) => {
                    const batchItems = batchGroups.get(timestamp);
                    if (batchItems && batchItems.length > 0) {
                        batchDividers.push({
                            index: allItems.length,
                            batch_number: batchIdx + 2,
                        });
                        allItems.push(...batchItems);
                    }
                });

                const processedOrder = {
                    ...updatedOrderFromBackend,
                    items: allItems,
                    has_new_items: allItems.length > oldItems.length,
                    batch_dividers: batchDividers,
                };

                setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? processedOrder : o));

                if (selectedOrder?.id === orderId) {
                    setSelectedOrder(processedOrder);
                }
            }

        } catch (err) {
            console.error("Save error:", err);
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
                        <div className={`orders-detail-popup${editOrderId === selectedOrder.id ? ' edit-mode-active' : ''}`}  onClick={(e) => e.stopPropagation()}>

                            {/* Left Side - Available Items - ONLY SHOW IN EDIT MODE */}
                            {editOrderId === selectedOrder.id && (
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
                                                    <li
                                                        key={item.id}
                                                        onClick={() => {
                                                            const timestamp = Date.now();
                                                            const uniqueKey = `${item.id}_${timestamp}`;
                                                            addItemToOrder(selectedOrder.id, item);

                                                        }}
                                                    >
                                                        <span>{item.name}</span>
                                                        <span>₹{item.unit_price}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : itemSearchQuery.trim() === "" ? (
                                            <div className="orders-detail-all-items">
                                                {allInventoryItems.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="orders-detail-item-card"
                                                        onClick={() => {
                                                            const timestamp = Date.now();
                                                            const uniqueKey = `${item.id}_${timestamp}`;
                                                            addItemToOrder(selectedOrder.id, item);

                                                        }}
                                                    >
                                                        <span>{item.name}</span>
                                                        <span>₹{item.unit_price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="orders-visible-no-results">
                                                No items found matching "{itemSearchQuery}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Right Side - Order Details */}
                            <div
                                className="orders-detail-right"
                                style={{
                                    width: editOrderId === selectedOrder.id ? '50%' : '100%',
                                }}
                            >
                                <div className="orders-detail-header">
                                    <button
                                        className="orders-detail-close"
                                        onClick={() => {

                                            setShowOrderDetailModal(false);
                                            setEditOrderId(null);
                                            setItemSearchQuery("");
                                        }}
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
                                                const divider = selectedOrder.batch_dividers?.find(d => d.index === idx);

                                                return (
                                                    <React.Fragment key={item.id || `item-${idx}`}>
                                                        {/* ✅ Just dashed line, no text */}
                                                        {divider && (
                                                            <div className="orders-item-divider-line"></div>
                                                        )}

                                                        <div className="orders-visible-edit-item-row">
                                                            <span>{item.item_name || item.item_id}</span>
                                                            {/* Status badge */}
                                                            <span className={`item-status-badge status-${item.status}`}>
                                                                {item.status}
                                                            </span>
                                                            <div className="orders-visible-edit-qty-controls">
                                                                <button
                                                                    onClick={() => {
                                                                        // ✅ Use backend id if available, otherwise frontend unique key
                                                                        const itemIdentifier = item.id || item.frontend_unique_key;
                                                                        updateItemQuantity(selectedOrder.id, itemIdentifier, item.quantity - 1);
                                                                    }}
                                                                    disabled={item.quantity <= 1}
                                                                >
                                                                    −
                                                                </button>
                                                                <span>{item.quantity}</span>
                                                                <button onClick={() => {
                                                                    // ✅ Use backend id if available, otherwise frontend unique key
                                                                    const itemIdentifier = item.id || item.frontend_unique_key;
                                                                    updateItemQuantity(selectedOrder.id, itemIdentifier, item.quantity + 1);
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
                                        // Non-edit mode
                                        selectedOrder.items.map((item, idx) => {
                                            const divider = selectedOrder.batch_dividers?.find(d => d.index === idx);

                                            return (
                                                <React.Fragment key={item.id || idx}>
                                                    {/* ✅ Just dashed line */}
                                                    {divider && (
                                                        <div className="orders-item-divider-line"></div>
                                                    )}

                                                    <div className="orders-visible-item-row">
                                                        <span>{item.item_name || item.item_id}</span>
                                                        <span>Qty: {item.quantity}</span>
                                                        <span className={`item-status-badge status-${item.status}`}>
                                                            {item.status}
                                                        </span>
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
                                                onClick={() => {
                                                    setCurrentBatchTimestamp(null);
                                                    setEditOrderId(null);
                                                    setItemSearchQuery("");
                                                }}
                                            >
                                                Done Editing
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="orders-visible-btn orders-visible-edit-btn"
                                            onClick={() => {
                                                setEditOrderId(selectedOrder.id); setCurrentBatchTimestamp(null);
                                            }}
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
                                            setEditOrderId(null);
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
                                            setEditOrderId(null);
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
            {/* <div style={{ position: 'absolute', bottom: '15px', right: '10px' }}>
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
            </div> */}
        </div>
        </div>
    );
};

export default OrdersVisiblePage;
