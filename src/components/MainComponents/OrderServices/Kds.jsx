import React, { useEffect, useState, useRef } from "react";
import axios from 'axios';
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaClock, FaHourglassHalf } from "react-icons/fa";
import { X, Edit2, Trash2, Search, Filter, ShoppingBag, Clock, Users, Package, Truck } from 'lucide-react';


const KitchenDisplay = () => {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");
    const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
    const [orders, setOrders] = useState([]);
    const [tablesMap, setTablesMap] = useState({});
    const [inventoryItems, setInventoryItems] = useState([]);
    const [inventoryMap, setInventoryMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [orderFilter, setOrderFilter] = useState("ALL");
    // ALL | DINEIN | TAKEAWAY

    const [editOrderId, setEditOrderId] = useState(null);
    const [addingOrderId, setAddingOrderId] = useState(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);

    const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
    const [deleteItemTarget, setDeleteItemTarget] = useState({ orderId: null, itemId: null });

    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [newlyAddedItems, setNewlyAddedItems] = useState({});
    const [tableIds, setTableId] = useState(null)
    const newlyAddedItemsRef = useRef({});
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        if (tableIds) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableIds]);
    // Fetch tables
    useEffect(() => {
        if (!token || !clientId) return;

        axios
            .get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const map = {};
                (res.data?.data || []).forEach((t) => (map[t.id] = t.name));
                setTablesMap(map);
            })
            .catch(() => toast.error("Failed to fetch tables"));
    }, [clientId, token]);
    const generateSlug = (name) => {
        return name ? name.toLowerCase().replace(/[\s]+/g, "-") : "";
    };
    // Fetch inventory items
    useEffect(() => {
        if (!token || !clientId) return;

        axios
            .get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                console.log("📦 Sample inventory item:", res.data?.data?.[0]); // ✅ CHECK THIS
                setInventoryItems(res.data?.data || []);
                const map = {};
                (res.data?.data || []).forEach((item) => {
                    map[item.id] = item;
                });
                setInventoryMap(map);
            })
            .catch(() => toast.error("Failed to fetch inventory items"));
    }, [clientId, token]);
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
                const today = new Date();
                const todayString = today.toLocaleDateString("en-CA");

                const todayOrders = allOrders.filter(order => {
                    const orderDate = new Date(order.created_at || order.createdAt)
                        .toLocaleDateString("en-CA");
                    return orderDate === todayString && order.status !== "served";
                });

                console.log(`📊 Processing ${todayOrders.length} orders`);

                setOrders(todayOrders.map(order => {
                    console.log(`\n🔄 Processing order ${order.id}`);

                    if (order.status === 'served') {
                        clearNewItemsStorage(order.id);
                        return order;
                    }

                    // ✅ Get localStorage data
                    const newItemsFromStorage = getNewItemsFromStorage(order.id);
                    console.log(`📦 localStorage items for order ${order.id}:`, newItemsFromStorage);

                    if (newItemsFromStorage.length === 0) {
                        console.log(`✅ No new items for order ${order.id}`);
                        return order;
                    }

                    const storageUniqueKeys = new Set(newItemsFromStorage.map(item => item.unique_key));
                    console.log(`🔑 Storage unique keys:`, Array.from(storageUniqueKeys));

                    // ✅ Build a map: frontend_unique_key → batch_timestamp from localStorage
                    const keyToBatchMap = new Map();
                    newItemsFromStorage.forEach(storageItem => {
                        if (storageItem.unique_key && storageItem.batch_timestamp) {
                            keyToBatchMap.set(storageItem.unique_key, storageItem.batch_timestamp);
                        }
                    });

                    // ✅ Separate items into OLD and items grouped by BATCH
                    const oldItems = [];
                    const batchItemsMap = new Map();

                    // ✅ Track which localStorage keys are already in backend
                    const backendUniqueKeys = new Set(
                        order.items
                            .filter(item => item.frontend_unique_key)
                            .map(item => item.frontend_unique_key)
                    );
                    console.log(`🔑 Backend unique keys:`, Array.from(backendUniqueKeys));

                    // ✅ Process backend items
                    order.items.forEach((item, idx) => {
                        if (item.frontend_unique_key) {
                            // Item has a unique key - determine if it's new
                            let batchTimestamp = keyToBatchMap.get(item.frontend_unique_key);

                            if (!batchTimestamp) {
                                // ✅ Extract timestamp from the key itself
                                const parts = item.frontend_unique_key.split('_');
                                if (parts.length >= 2) {
                                    const extractedTimestamp = parseFloat(parts[parts.length - 1]);
                                    if (!isNaN(extractedTimestamp)) {
                                        batchTimestamp = Math.floor(extractedTimestamp / 1000) * 1000;
                                    }
                                }
                            }

                            if (batchTimestamp) {
                                console.log(`✅ Item ${idx} "${item.item_name}" is NEW (batch: ${batchTimestamp})`);
                                if (!batchItemsMap.has(batchTimestamp)) {
                                    batchItemsMap.set(batchTimestamp, []);
                                }
                                batchItemsMap.get(batchTimestamp).push({
                                    ...item,
                                    is_new_item: true,
                                    batch_timestamp: batchTimestamp,
                                });
                            } else {
                                console.log(`❌ Item ${idx} "${item.item_name}" has unique_key but no batch - treating as OLD`);
                                oldItems.push(item);
                            }
                        } else {
                            console.log(`⬜ Item ${idx} "${item.item_name}" has no unique_key - OLD`);
                            oldItems.push(item);
                        }
                    });

                    // ✅ Add truly unsaved items from localStorage
                    newItemsFromStorage.forEach(storageItem => {
                        if (!backendUniqueKeys.has(storageItem.unique_key)) {
                            const itemInfo = inventoryMap[storageItem.item_id];
                            if (itemInfo && storageItem.batch_timestamp) {
                                console.log(`➕ Adding unsaved item from localStorage: ${itemInfo.name}`);
                                if (!batchItemsMap.has(storageItem.batch_timestamp)) {
                                    batchItemsMap.set(storageItem.batch_timestamp, []);
                                }
                                batchItemsMap.get(storageItem.batch_timestamp).push({
                                    item_id: storageItem.item_id,
                                    item_name: itemInfo.name,
                                    quantity: storageItem.quantity || 1,
                                    price: itemInfo.unit_price || itemInfo.price,
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

                    // ✅ Build final items array with batch dividers
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

                    console.log(`📊 Order ${order.id} summary: ${oldItems.length} old items, ${sortedBatchTimestamps.length} batches`);

                    return {
                        ...order,
                        items: allItems,
                        has_new_items: batchItemsMap.size > 0,
                        batch_dividers: batchDividers,
                    };
                }));

            } catch (err) {
                console.error("❌ Error fetching orders:", err);
                toast.error("Failed to fetch orders");
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [clientId, token, inventoryMap]);

    useEffect(() => {
        if (!addingOrderId) {
            setItemSearchResults([]);
            setItemSearchQuery("");
            return;
        }
        const currentOrder = orders.find((o) => o.id === addingOrderId);
        if (!currentOrder) {
            setItemSearchResults([]);
            return;
        }
        const orderedIds = new Set(currentOrder.items.map((i) => i.item_id));
        const filtered = inventoryItems
            .filter((item) => item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
            .filter((item) => !orderedIds.has(item.id));
        setItemSearchResults(filtered);
    }, [itemSearchQuery, addingOrderId, inventoryItems, orders]);


    const addItemToOrder = (orderId, selectedItem) => {
        console.log("🟢 Adding item to order:", selectedItem);

        const timestamp = Date.now() + Math.random();
        const uniqueKey = `${selectedItem.id}_${timestamp}`;

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

        setOrders(prevOrders => {
            return prevOrders.map(order => {
                if (order.id !== orderId) return order;

                const newItem = {
                    item_id: selectedItem.id,
                    item_name: selectedItem.name,
                    quantity: 1,
                    price: selectedItem.unit_price || selectedItem.price || 0, // ✅ Handle both
                    status: "new",
                    note: "",
                    slug: selectedItem.slug || generateSlug(selectedItem.name),
                    added_at_frontend: timestamp,
                    frontend_unique_key: uniqueKey,
                    is_new_item: true,
                    batch_timestamp: batchTimestamp,
                    id: uniqueKey,
                };

                const newItems = [...order.items, newItem];
                const oldItemsCount = order.items.filter(i => !i.is_new_item).length;

                console.log(`✅ Added item, oldItems: ${oldItemsCount}, totalItems: ${newItems.length}`);

                return {
                    ...order,
                    items: newItems,
                    has_new_items: true,
                    new_items_start_index: oldItemsCount,
                };
            });
        });

        // ✅ Store in localStorage
        const storageKey = `order_${orderId}_new_item_${uniqueKey}`;
        localStorage.setItem(storageKey, JSON.stringify({
            item_id: selectedItem.id,
            unique_key: uniqueKey,
            added_at: timestamp,
            batch_timestamp: batchTimestamp,
            quantity: 1,
        }));
        console.log(`💾 Saved to localStorage: ${storageKey}`);

        // Save to backend
        setTimeout(() => {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                updateOrderItems(orderId, order.items);
            }
        }, 0);

        setItemSearchQuery("");
        setItemSearchResults([]);
    };



    const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
        const cleanedItems = updatedItemsWithStatuses.map(item => ({
            item_id: item.item_id || item.inventory_id,
            item_name: item.name || item.item_name,
            quantity: item.quantity || 1,
            status: item.status || "new",
            note: item.note || "",
            slug: item.slug || "",
            price: item.price || inventoryMap[item.item_id || item.inventory_id]?.unit_price || 0,
            client_id: clientId,
            order_id: orderId,
            frontend_unique_key: item.frontend_unique_key || null, // ✅ ADDED
        }));

        console.log("📤 Final payload to order_items/update:");
        cleanedItems.forEach((item, i) => console.log(`Item ${i + 1}:`, item));

        const totalPrice = cleanedItems.reduce((sum, item) => {
            return sum + item.price * item.quantity;
        }, 0);

        try {
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderId}`,
                cleanedItems,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                {
                    id: orderId,
                    total_price: totalPrice
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success("Item statuses & total updated!");
        } catch (err) {
            console.error("❌ Failed to update order items:", err);
            toast.error("Failed to update items or total.");
        }
    };



    const handleItemStatusChange = async (orderId, itemBackendId, newStatus) => {
        try {
            const orderIdInt = parseInt(orderId, 10);
            const order = orders.find(o => o.id === orderIdInt);
            if (!order) return;

            // 🔄 Update clicked item status
            const updatedItems = order.items.map(item =>
                item.id === itemBackendId
                    ? { ...item, status: newStatus }
                    : item
            );

            // ❗ Remove id before sending to backend
            const itemsForUpdate = updatedItems;

            // 💰 Recalculate total
            const totalPrice = updatedItems.reduce(
                (sum, item) =>
                    sum + (inventoryMap[item.item_id]?.price || 0) * (item.quantity || 1),
                0
            );

            // 🔄 Update items in backend
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderIdInt}`,
                itemsForUpdate,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // 🧠 DERIVE ORDER STATUS FROM ITEMS
            const derivedStatus = deriveOrderStatusFromItems(updatedItems);

            // 🔄 Update order status in backend
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                {
                    id: orderIdInt,
                    status: derivedStatus,
                    total_price: totalPrice,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // 📣 DISPATCH EVENT ONLY WHEN ALL ITEMS ARE SERVED
            if (derivedStatus === "ready" && order.status !== "ready") {
                const collectEvent = new CustomEvent("orderCollect", {
                    detail: {
                        tableName:
                            tablesMap[order.table_id] ||
                            order.table_number ||
                            "Unknown Table",
                        orderId: order.id,
                    },
                });
                window.dispatchEvent(collectEvent);
            }

            // 🪄 Update local state
            setOrders(prev =>
                prev.map(o =>
                    o.id === orderId
                        ? {
                            ...o,
                            items: updatedItems,
                            status: derivedStatus,
                            total_price: totalPrice,
                        }
                        : o
                )
            );

        } catch (err) {
            console.error(err);
            toast.error("Failed to update item status");
        }
    };



    // Update item name locally
    const updateItemName = (orderId, itemId, newName) => {
        setOrders((prev) =>
            prev.map((o) => {
                if (o.id !== orderId) return o;
                const updatedItems = o.items.map((item) =>
                    item.item_id === itemId ? { ...item, item_name: newName } : item
                );
                return { ...o, items: updatedItems };
            })
        );
    };

    // Card color helper
    const cardColors = (order) => {
        if (order.table_number === "07") return "orange";
        if (order.type?.toLowerCase() === "take waay") {
            if (order.customer_name?.toLowerCase().includes("walk") && order.order_id === 428) return "green-light";
            else return "blue";
        }
        if (order.table_number === "12" || order.table_number === "01") return "red";
        if (order.table_number === "06") return "green-dark";
        return "default";
    };

    const statusPriority = {
        pending: 1,
        preparing: 2,
        ready: 3,
    };

    const filteredOrders = orders
        .filter(order => {
            if (orderFilter === "ALL") return true;

            const isTakeaway = Number(order.table_id) === 500;

            if (orderFilter === "TAKEAWAY") return isTakeaway;
            if (orderFilter === "DINEIN") return !isTakeaway;

            return true;
        })
        .sort((a, b) => {
            return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
        });




    const deriveOrderStatusFromItems = (items) => {
        if (!items || items.length === 0) return "pending";

        if (items.some(i => i.status === "pending")) {
            return "pending";
        }

        if (items.some(i => i.status === "preparing")) {
            return "preparing";
        }

        if (items.every(i => i.status === "served")) {
            return "ready";
        }

        return "pending";
    };



    // const handleStatusChange = async (orderId, newStatus) => {
    //     try {
    //         const orderIdInt = parseInt(orderId, 10);
    //         const order = orders.find(o => o.id === orderIdInt);
    //         if (!order) return;

    //         // Update all items if order status is "served"
    //         const updatedItems =
    //         newStatus === "served"
    //             ? order.items.map(item => ({ ...item, status: "served" }))
    //             : newStatus === "ready"
    //             ? order.items.map(item => ({ ...item, status: "ready" }))
    //             : order.items;


    //         const cleanedItems = updatedItems.map(item => ({
    //             item_id: item.item_id,
    //             item_name: item.item_name,
    //             quantity: item.quantity,
    //             status: item.status || "new",
    //             note: item.note || "",
    //             slug: item.slug || "",
    //             price: item.price || inventoryMap[item.item_id]?.price || 0,
    //             client_id: clientId,
    //             order_id: orderId,
    //         }));

    //         const totalPrice = cleanedItems.reduce(
    //             (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    //             0
    //         );

    //         // Save updated items with their statuses
    //         await axios.post(
    //             `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${orderIdInt}`,
    //             cleanedItems,
    //             { headers: { Authorization: `Bearer ${token}` } }
    //         );

    //         // Update overall order status and total price
    //         await axios.post(
    //             `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
    //             { id: orderIdInt, status: newStatus, total_price: totalPrice },
    //             { headers: { Authorization: `Bearer ${token}` } }
    //         );

    //         // ✅ If served, clear new items tracking
    //         if (newStatus === "served") {
    //             clearNewItemsStorage(orderId);
    //         }

    //         // Update local state accordingly
    //         setOrders(prev =>
    //             prev.map(o =>
    //                 o.id === orderId
    //                     ? {
    //                         ...o,
    //                         status: newStatus,
    //                         items: updatedItems,
    //                         total_price: totalPrice,
    //                         has_new_items: newStatus === 'served' ? false : o.has_new_items,
    //                         new_items_start_index: newStatus === 'served' ? null : o.new_items_start_index,
    //                     }
    //                     : o
    //             )
    //         );

    //         // Exit edit/add modes if served
    //         if (newStatus === "served") {
    //             if (editOrderId === orderId) setEditOrderId(null);
    //             if (addingOrderId === orderId) setAddingOrderId(null);
    //         }
    //     } catch (err) {
    //         console.error(err);
    //         toast.error("Failed to update order status");
    //     }
    // };

    // Calculate elapsed time since item was created
    const calculateElapsedTime = (createdAt) => {
        if (!createdAt) return null;
    
        let created;
    
        if (typeof createdAt === "string") {
          // Convert to proper ISO UTC format
          const utcString =
            createdAt.replace(" ", "T").split(".")[0] + "Z";
    
          created = new Date(utcString).getTime();
        } else {
          created = new Date(createdAt).getTime();
        }
    
        const diffMs = Date.now() - created;
    
        if (diffMs < 0) return "Just now";
    
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
    
        if (seconds < 60) return "Just now";
        if (minutes === 1) return "1 min ago";
        if (minutes < 60) return `${minutes} mins ago`;
        if (hours === 1) return "1 hr ago";
        if (hours < 24) return `${hours} hrs ago`;
        if (days === 1) return "1 day ago";
    
        return `${days} days ago`;
      };

    // Update timer every second
    useEffect(() => {
        const timerInterval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(timerInterval);
    }, []);
    // Delete order confirmation and delete
    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`, {
                params: { dinein_order_id: orderToDelete, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
            toast.success("Order deleted");
        } catch {
            toast.error("Failed to delete order");
        } finally {
            setShowDeleteModal(false);
            setOrderToDelete(null);
        }
    };

    useEffect(() => {
        // Load newly added items from localStorage on mount
        const loadNewlyAddedItems = () => {
            const newItems = {};
            const keysToRemove = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('new_item_')) {
                    const timestampStr = localStorage.getItem(key);
                    const timestamp = parseInt(timestampStr, 10);
                    const age = Date.now() - timestamp;
                    const maxAge = 30 * 60 * 1000; // 30 minutes

                    if (age > maxAge) {
                        keysToRemove.push(key);
                    } else {
                        // ✅ Parse key: "new_item_{orderId}_{itemId}_{timestamp}"
                        // Example: "new_item_123_456_1704067200000"
                        const withoutPrefix = key.replace('new_item_', '');
                        const firstUnderscoreIndex = withoutPrefix.indexOf('_');

                        if (firstUnderscoreIndex !== -1) {
                            const orderId = parseInt(withoutPrefix.substring(0, firstUnderscoreIndex), 10);
                            const uniqueKey = withoutPrefix.substring(firstUnderscoreIndex + 1);

                            if (!isNaN(orderId)) {
                                if (!newItems[orderId]) {
                                    newItems[orderId] = {};
                                }
                                newItems[orderId][uniqueKey] = timestamp;
                                console.log(`✅ Loaded: orderId=${orderId}, uniqueKey=${uniqueKey}, timestamp=${timestamp}`);
                            }
                        }
                    }
                }
            }

            // Remove expired items
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Update ref
            newlyAddedItemsRef.current = newItems;
            console.log('📦 Final loaded items:', newItems);
        };

        loadNewlyAddedItems();
    }, []);

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
                        const withoutPrefix = key.replace('new_item_', '');
                        const firstUnderscoreIndex = withoutPrefix.indexOf('_');

                        if (firstUnderscoreIndex !== -1) {
                            const orderId = parseInt(withoutPrefix.substring(0, firstUnderscoreIndex), 10);
                            const uniqueKey = withoutPrefix.substring(firstUnderscoreIndex + 1);

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


    const getNewItemsFromStorage = (orderId) => {
        const newItems = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`order_${orderId}_new_item_`)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.item_id) { // ✅ Validate data
                        newItems.push(data);
                    }
                } catch (e) {
                    console.error("Error parsing localStorage item:", e);
                }
            }
        }
        console.log(`🔍 Found ${newItems.length} new items for order ${orderId}:`, newItems);
        return newItems;
    };


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




    return (

        <>
            <div className="min-h-screen w-full bg-gray-50 text-gray-900">
                <div className="mx-auto p-6 lg:py-8">
                    <div className="mb-3 overflow-x-auto">
                        <div className="flex gap-2 min-w-max">
                            <button
                                onClick={() => setOrderFilter("ALL")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${orderFilter === "ALL"
                                    ? "bg-action-primary text-text-white shadow-sm"
                                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default"}`}
                            >
                                <Filter size={16} />
                                All Orders
                            </button>

                            <button
                                onClick={() => setOrderFilter("DINEIN")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${orderFilter === "DINEIN"
                                    ? "bg-action-primary text-text-white shadow-sm"
                                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default"}`}
                            >
                                <Users size={16} />
                                Dine-In
                            </button>

                            <button
                                onClick={() => setOrderFilter("TAKEAWAY")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${orderFilter === "TAKEAWAY"
                                    ? "bg-action-primary text-text-white shadow-sm"
                                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default"}`}
                            >
                                <Package size={16} />
                                Takeaway
                            </button>

                            <button
                                onClick={() => setOrderFilter("DELIVERY")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${orderFilter === "DELIVERY"
                                    ? "bg-action-primary text-text-white shadow-sm"
                                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default"}`}
                            >
                                <Truck size={16} />
                                DELIVERY
                            </button>
                        </div>
                    </div>


                    <div className="w-full">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-lg font-medium text-gray-500">Loading orders...</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {filteredOrders.map((order) => {
                                    const isEditing = editOrderId === order.id;
                                    const isAdding = addingOrderId === order.id;
                                    const elapsedTime = order?.created_at ? calculateElapsedTime(order.created_at) : null;
                                    return (
                                        <div
                                            key={order.id}
                                            className={`
                                          rounded-xl shadow-md overflow-hidden border border-gray-200 bg-white
                                          transition-transform transform hover:-translate-y-0.5
                                          flex flex-col
                                          ${cardColors(order)}
                                        `}
                                        >

                                            {/* Card header */}
                                            <div className="flex items-center justify-between px-4 py-3 bg-action-primary text-text-white">
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-sm md:text-base font-semibold">
                                                        {tablesMap[order.table_id] || order.table_number || order.customer_name || "N/A"}
                                                    </span>

                                                    <div className="flex items-center justify-center gap-2 text-xl font-semibold text-text-white">
                                                        <Clock size={16} className="text-text-white" />
                                                        <span>{elapsedTime}</span>
                                                    </div>

                                                    <span className="text-xl font-semibold text-orange-100/80">
                                                        #{order.id}
                                                    </span>
                                                </div>


                                                <div className="flex items-center gap-2">
                                                    {/* commented actions preserved but hidden visually */}
                                                </div>
                                            </div>

                                            {/* Card body */}
                                            <div className="bg-bg-primary px-4 py-4 space-y-3 flex-1">
                                                {order.items.map((item, idx) => {
                                                    const divider = order.batch_dividers?.find(d => d.index === idx);

                                                    return (
                                                        <React.Fragment key={item.id || idx}>
                                                            {/* Batch divider */}
                                                            {divider && <div className="w-full border-t-2 border-dashed border-orange-200 my-2" />}

                                                            {/* Item row */}
                                                            <div
                                                                className={` flex items-center w-full  rounded-lg ${item.is_new_item ? "bg-orange-50" : "bg-white"} ${isEditing ? "cursor-pointer hover:shadow-sm" : "cursor-default"}`}>
                                                                {/* Item name / editable */}
                                                                <div className="flex-1">
                                                                    {isEditing ? (
                                                                        <input
                                                                            value={item.item_name}
                                                                            onChange={(e) => updateItemName(order.id, item.item_id, e.target.value)}
                                                                            className="w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <span className=" font-medium text-sm">
                                                                                <span className="font-medium text-sm">
                                                                                    <span className="mr-2">{item.quantity}  x</span>
                                                                                    <span>{item.item_name || "Unnamed Item"}</span>
                                                                                </span>

                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Status icons */}
                                                                <div className="flex items-center gap-3 ml-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleItemStatusChange(order.id, item.id, "pending")}
                                                                        title="Pending"
                                                                        className="p-2 rounded-md hover:bg-gray-100"
                                                                    >
                                                                        <FaClock size={20}
                                                                            className={item.status === "pending" ? "text-blue-600" : "text-gray-500"}
                                                                            title="Pending"
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleItemStatusChange(order.id, item.id, "preparing")}
                                                                        title="Preparing"
                                                                        className="p-2 rounded-md hover:bg-gray-100"
                                                                    >
                                                                        <FaHourglassHalf size={20}
                                                                            className={item.status === "preparing" ? "text-orange-500" : "text-gray-500"}
                                                                            title="Preparing"
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleItemStatusChange(order.id, item.id, "served")}
                                                                        title="Ready"
                                                                        className="p-2 rounded-md hover:bg-gray-100"
                                                                    >
                                                                        <FaCheckCircle size={20}
                                                                            className={item.status === "served" ? "text-green-500" : "text-gray-500"}
                                                                            title="Ready"
                                                                        />
                                                                    </button>
                                                                </div>

                                                                {/* Measure / extra */}
                                                                {!isEditing && !isAdding && (
                                                                    <div className="ml-3 text-sm text-gray-500">{item.measure || ""}</div>
                                                                )}
                                                            </div>
                                                        </React.Fragment>
                                                    );
                                                })}

                                                {/* Add item search UI when adding */}
                                                {isAdding && (
                                                    <div className="mt-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Search inventory items to add..."
                                                            value={itemSearchQuery}
                                                            onChange={(e) => setItemSearchQuery(e.target.value)}
                                                            className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                                                        />
                                                        {itemSearchResults.length > 0 && (
                                                            <ul className="mt-2 max-h-36 overflow-y-auto rounded-md border border-gray-200 bg-white">
                                                                {itemSearchResults.map((it) => (
                                                                    <li
                                                                        key={it.id}
                                                                        onClick={() => addItemToOrder(order.id, it)}
                                                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between text-sm border-b last:border-b-0"
                                                                    >
                                                                        <span>{it.name}</span>
                                                                        <span className="text-gray-600">₹{it.price}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="px-4 py-3 border-t border-gray-100 bg-white">
                                                <button className={`text-l font-semibold uppercase
        ${order.status === "pending" && "text-blue-600"}
        ${order.status === "preparing" && "text-orange-600"}
        ${order.status === "ready" && "text-green-600"}
    `}>
                                                    {order.status}
                                                </button>
                                            </div>


                                            {/* Card footer (status action)
                                            {!isAdding && !isEditing && order.status !== "served" && (
                                                <div className="px-4 py-3 border-t border-gray-100 bg-white">
                                                    <div className="flex items-center gap-3">
                                                        {order.status === "new" && (
                                                            <button
                                                                className="px-3 py-2 rounded-lg bg-action-primary text-text-white font-semibold hover:bg-orange-600"
                                                                onClick={() => handleStatusChange(order.id, "pending")}
                                                            >
                                                                Pending
                                                            </button>
                                                        )}
                                                        {order.status === "pending" && (
                                                            <button
                                                                className="px-3 py-2 rounded-lg bg-yellow-100 text-yellow-700 font-semibold hover:bg-yellow-200"
                                                                onClick={() => handleStatusChange(order.id, "preparing")}
                                                            >
                                                                Preparing!!!
                                                            </button>
                                                        )}
                                                        {order.status === "preparing" && (
                                                            <button
                                                                className="px-3 py-2 rounded-lg bg-green-50 text-green-700 font-semibold hover:bg-green-100"
                                                                onClick={() => {
                                                                    handleStatusChange(order.id, "ready");

                                                                    const collectEvent = new CustomEvent("orderCollect", {
                                                                        detail: {
                                                                            tableName: tablesMap[order.table_id] || order.table_number || "Unknown Table",
                                                                            orderId: order.id,
                                                                        },
                                                                    });
                                                                    window.dispatchEvent(collectEvent);
                                                                }}
                                                            >
                                                                Ready To Serve !!!
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )} */}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Delete order confirmation modal */}
                    {showDeleteModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="w-full max-w-md rounded-xl overflow-hidden shadow-lg bg-white text-gray-900">
                                <div className="px-6 py-5 border-b">
                                    <h3 className="text-lg font-semibold">Confirm Delete</h3>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-gray-600">Delete this order?</p>
                                </div>
                                <div className="px-6 py-4 flex justify-end gap-3 border-t">
                                    <button
                                        onClick={confirmDeleteOrder}
                                        className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setOrderToDelete(null);
                                        }}
                                        className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete item confirmation modal */}
                    {showDeleteItemModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="w-full max-w-md rounded-xl overflow-hidden shadow-lg bg-white text-gray-900">
                                <div className="px-6 py-5 border-b">
                                    <h3 className="text-lg font-semibold">Confirm Delete Item</h3>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-gray-600">Delete this item?</p>
                                </div>
                                <div className="px-6 py-4 flex justify-end gap-3 border-t">
                                    <button
                                        className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600"
                                        onClick={async () => {
                                            if (deleteItemTarget.orderId && deleteItemTarget.itemId) {
                                                try {
                                                    await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`, {
                                                        params: { order_item_id: deleteItemTarget.itemId, client_id: clientId },
                                                        headers: { Authorization: `Bearer ${token}` },
                                                    });
                                                    setOrders((prev) =>
                                                        prev.map((o) => {
                                                            if (o.id !== deleteItemTarget.orderId) return o;
                                                            const updatedItems = o.items.filter((i) => i.item_id !== deleteItemTarget.itemId);
                                                            const newTotal = updatedItems.reduce(
                                                                (sum, i) => sum + (i.price || 0) * (i.quantity || 1),
                                                                0
                                                            );
                                                            return { ...o, items: updatedItems, total_price: newTotal };
                                                        })
                                                    );
                                                    toast.success("Item deleted");
                                                } catch {
                                                    toast.error("Failed to delete item");
                                                } finally {
                                                    setShowDeleteItemModal(false);
                                                    setDeleteItemTarget({ orderId: null, itemId: null });
                                                }
                                            }
                                        }}
                                    >
                                        Yes
                                    </button>

                                    <button
                                        className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        onClick={() => {
                                            setShowDeleteItemModal(false);
                                            setDeleteItemTarget({ orderId: null, itemId: null });
                                        }}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>

    );

};

export default KitchenDisplay;

