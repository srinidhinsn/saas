import React, { useEffect, useState, useCallback } from "react";
import axios from 'axios';
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaClock, FaHourglassHalf } from "react-icons/fa";
import { Filter, Clock, Users, Package, Truck } from 'lucide-react';


const KitchenDisplay = () => {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");

    // cards = array of { card_id, sub_order_id, dinein_order_id, table_id, status, created_at, items[] }
    // Each card maps to one DB sub-order / root-order row
    const [cards, setCards]                     = useState([]);
    const [tablesMap, setTablesMap]             = useState({});
    const [inventoryItems, setInventoryItems]   = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [orderFilter, setOrderFilter]         = useState("ALL");

    const [addingCardId, setAddingCardId]           = useState(null);
    const [itemSearchQuery, setItemSearchQuery]     = useState("");
    const [itemSearchResults, setItemSearchResults] = useState([]);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete]       = useState(null);

    // ─── Fetch tables ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token || !clientId) return;
        axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(res => {
            const map = {};
            (res.data?.data || []).forEach(t => (map[t.id] = t.name));
            setTablesMap(map);
        }).catch(() => toast.error("Failed to fetch tables"));
    }, [clientId, token]);

    // ─── Fetch inventory ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!token || !clientId) return;
        axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(res => {
            setInventoryItems(res.data?.data || []);
        }).catch(() => toast.error("Failed to fetch inventory"));
    }, [clientId, token]);

    // ─── Parse /dinein/table response → one card per sub_order ────────────────
    //
    // Backend _merge_group() returns one merged entry per table group with:
    //   item.batch_label   = the sub-order's dinein_order_id  ("1001" or "1001-2")
    //   item.sub_order_id  = the DB pk of that sub-order row
    //   sub_orders[]       = [{id, dinein_order_id, created_at, status, total_price}, ...]
    //
    // We split the merged items back into individual per-sub-order cards.
    const parseIntoCards = (mergedOrder) => {
        const subOrders = mergedOrder.sub_orders || [];

        // Group merged items by their sub_order_id tag
        const itemsBySubOrder = {};
        (mergedOrder.items || []).forEach(item => {
            const sid = item.sub_order_id;
            if (!itemsBySubOrder[sid]) itemsBySubOrder[sid] = [];
            itemsBySubOrder[sid].push(item);
        });

        // Fallback: no sub_orders metadata — treat whole group as one card
        if (subOrders.length === 0) {
            return [{
                card_id:              mergedOrder.id,
                sub_order_id:         mergedOrder.id,
                dinein_order_id:      mergedOrder.dinein_order_id,
                root_dinein_order_id: mergedOrder.dinein_order_id,
                table_id:             mergedOrder.table_id,
                status:               mergedOrder.status || "pending",
                created_at:           mergedOrder.created_at,
                items:                mergedOrder.items || [],
                is_sub_order:         false,
            }];
        }

        // One card per sub-order — root first, then chronological sub-orders
        return subOrders
            .slice()
            .sort((a, b) => {
                const aIsRoot = !String(a.dinein_order_id).includes("-");
                const bIsRoot = !String(b.dinein_order_id).includes("-");
                if (aIsRoot !== bIsRoot) return aIsRoot ? -1 : 1;
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            })
            .map(s => ({
                card_id:              s.id,
                sub_order_id:         s.id,
                dinein_order_id:      s.dinein_order_id,
                root_dinein_order_id: mergedOrder.dinein_order_id,
                table_id:             mergedOrder.table_id,
                status:               s.status || "pending",
                created_at:           s.created_at,
                items:                itemsBySubOrder[s.id] || [],
                is_sub_order:         String(s.dinein_order_id).includes("-"),
            }));
    };

    // ─── Fetch & poll — /dinein/table ─────────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        if (!token || !clientId) { setLoading(false); return; }
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const today = new Date().toLocaleDateString("en-CA");
            const allCards = [];

            (res.data?.data || []).forEach(mergedOrder => {
                // Date filter using root created_at
                const d = mergedOrder.created_at;
                if (d) {
                    const utc = typeof d === "string"
                        ? d.replace(" ", "T").split(".")[0] + "Z"
                        : d;
                    const orderDate = new Date(utc).toLocaleDateString("en-CA");
                    if (orderDate !== today) return;
                }

                // Skip fully-served groups
                if (mergedOrder.status === "served") return;

                parseIntoCards(mergedOrder).forEach(card => {
                    // Skip cards where every item is already served
                    if (card.items.length > 0 && card.items.every(i => i.status === "served")) return;
                    allCards.push(card);
                });
            });

            setCards(allCards);
        } catch (err) {
            console.error("❌ Error fetching orders:", err);
            toast.error("Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    }, [clientId, token]);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    // ─── Item search for add panel ─────────────────────────────────────────────
    useEffect(() => {
        if (!addingCardId) { setItemSearchResults([]); setItemSearchQuery(""); return; }
        const cur = cards.find(c => c.card_id === addingCardId);
        if (!cur) { setItemSearchResults([]); return; }
        const orderedIds = new Set((cur.items || []).map(i => i.item_id));
        setItemSearchResults(
            inventoryItems
                .filter(item => item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                .filter(item => !orderedIds.has(item.id))
        );
    }, [itemSearchQuery, addingCardId, inventoryItems, cards]);

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const generateSlug = name => name ? name.toLowerCase().replace(/\s+/g, "-") : "";

    const calculateElapsedTime = createdAt => {
        if (!createdAt) return null;
        const utc = typeof createdAt === "string"
            ? createdAt.replace(" ", "T").split(".")[0] + "Z"
            : createdAt;
        const diff = Date.now() - new Date(utc).getTime();
        if (diff < 0) return "Just now";
        const s = Math.floor(diff / 1000),
              m = Math.floor(s / 60),
              h = Math.floor(m / 60),
              d = Math.floor(h / 24);
        if (s < 60)  return "Just now";
        if (m === 1) return "1 min ago";
        if (m < 60)  return `${m} mins ago`;
        if (h === 1) return "1 hr ago";
        if (h < 24)  return `${h} hrs ago`;
        if (d === 1) return "1 day ago";
        return `${d} days ago`;
    };

    const deriveStatus = items => {
        if (!items?.length) return "pending";
        if (items.some(i => i.status === "pending"))   return "pending";
        if (items.some(i => i.status === "preparing")) return "preparing";
        if (items.every(i => i.status === "served"))   return "ready";
        return "pending";
    };

    // ─── Item status change — updates only this card's sub_order_id ────────────
    const handleItemStatusChange = async (cardId, itemId, newStatus) => {
        const card = cards.find(c => c.card_id === cardId);
        if (!card) return;

        const updatedItems  = (card.items || []).map(i =>
            String(i.id) === String(itemId) ? { ...i, status: newStatus } : i
        );
        const derivedStatus = deriveStatus(updatedItems);

        try {
            const payload = updatedItems.map(item => ({
                id:                  item.id,
                item_id:             item.item_id,
                item_name:           item.item_name,
                quantity:            item.quantity,
                status:              item.status,
                note:                item.note || "",
                slug:                item.slug || "",
                unit_price:          item.unit_price || 0,
                line_total:          (item.unit_price || 0) * (item.quantity || 1),
                client_id:           clientId,
                order_id:            card.sub_order_id,
                frontend_unique_key: item.frontend_unique_key || null,
            }));

            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${card.sub_order_id}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: card.sub_order_id, status: derivedStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (derivedStatus === "ready" && card.status !== "ready") {
                window.dispatchEvent(new CustomEvent("orderCollect", {
                    detail: {
                        tableName: tablesMap[card.table_id] || "Unknown",
                        orderId:   card.sub_order_id,
                    },
                }));
            }

            // Optimistic update
            setCards(prev =>
                prev.map(c =>
                    c.card_id !== cardId
                        ? c
                        : { ...c, items: updatedItems, status: derivedStatus }
                )
            );

            // Remove card once all its items are served
            if (derivedStatus === "ready" && updatedItems.every(i => i.status === "served")) {
                setCards(prev => prev.filter(c => c.card_id !== cardId));
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update item status");
        }
    };



    // ─── Delete card ───────────────────────────────────────────────────────────
    const confirmDeleteCard = async () => {
        if (!cardToDelete) return;
        try {
            await axios.delete(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
                {
                    params:  { dinein_order_id: cardToDelete.sub_order_id, client_id: clientId },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!cardToDelete.is_sub_order) {
                // Root delete → backend also removes all sub-orders
                const prefix = String(cardToDelete.dinein_order_id) + "-";
                setCards(prev => prev.filter(c =>
                    c.card_id !== cardToDelete.card_id &&
                    !String(c.dinein_order_id || "").startsWith(prefix)
                ));
            } else {
                setCards(prev => prev.filter(c => c.card_id !== cardToDelete.card_id));
            }
            toast.success("Order deleted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete order");
        } finally {
            setShowDeleteModal(false);
            setCardToDelete(null);
        }
    };

    // ─── Filter + sort ─────────────────────────────────────────────────────────
    const statusPriority = { pending: 1, preparing: 2, ready: 3 };

    const filteredCards = cards
        .filter(c => {
            if (orderFilter === "ALL")      return true;
            const isTW = Number(c.table_id) === 500;
            if (orderFilter === "TAKEAWAY") return isTW;
            if (orderFilter === "DINEIN")   return !isTW;
            return true;
        })
        .sort((a, b) =>
            (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99)
        );

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="min-h-screen w-full bg-gray-50 text-gray-900">
                <div className="mx-auto p-6 lg:py-8">

                    {/* ── Filter bar — old styling ── */}
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

                    {/* ── Grid ── */}
                    <div className="w-full">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-lg font-medium text-gray-500">Loading orders...</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {filteredCards.map(card => {
                                    const isAdding    = addingCardId === card.card_id;
                                    const elapsedTime = card.created_at ? calculateElapsedTime(card.created_at) : null;

                                    return (
                                        <div
                                            key={card.card_id}
                                            className="rounded-xl shadow-md overflow-hidden border border-gray-200 bg-white transition-transform transform hover:-translate-y-0.5 flex flex-col"
                                        >
                                            {/* ── Card header — old styling with bg-action-primary ── */}
                                            <div className="flex items-center justify-between px-4 py-3 bg-action-primary text-text-white">
                                                <div className="flex items-center justify-between w-full">
                                                    {/* Table name */}
                                                    <span className="text-sm md:text-base font-semibold">
                                                        {tablesMap[card.table_id] || `T-${card.table_id}`}
                                                    </span>

                                                    {/* Timer */}
                                                    <div className="flex items-center justify-center gap-2 text-xl font-semibold text-text-white">
                                                        <Clock size={16} className="text-text-white" />
                                                        <span>{elapsedTime}</span>
                                                    </div>

                                                    {/* Order ID — with sub-order badge if applicable */}
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xl font-semibold text-orange-100/80">
                                                            #{card.dinein_order_id}
                                                        </span>
                                                        {card.is_sub_order && (
                                                            <span className="text-[10px] bg-white/20 rounded px-1 leading-tight">
                                                                sub-order
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Card body — old styling ── */}
                                            <div className="bg-bg-primary px-4 py-4 space-y-3 flex-1">
                                                {(card.items || []).map((item, idx) => (
                                                    <div
                                                        key={item.id || idx}
                                                        className="flex items-center w-full rounded-lg bg-white cursor-default"
                                                    >
                                                        {/* Item name + qty */}
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="font-medium text-sm">
                                                                    <span className="mr-2">{item.quantity}  x</span>
                                                                    <span>{item.item_name || "Unnamed Item"}</span>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Status icons — old sizing (size 20) */}
                                                        <div className="flex items-center gap-3 ml-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemStatusChange(card.card_id, item.id, "pending")}
                                                                title="Pending"
                                                                className="p-2 rounded-md hover:bg-gray-100"
                                                            >
                                                                <FaClock
                                                                    size={20}
                                                                    className={item.status === "pending" ? "text-blue-600" : "text-gray-500"}
                                                                />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemStatusChange(card.card_id, item.id, "preparing")}
                                                                title="Preparing"
                                                                className="p-2 rounded-md hover:bg-gray-100"
                                                            >
                                                                <FaHourglassHalf
                                                                    size={20}
                                                                    className={item.status === "preparing" ? "text-orange-500" : "text-gray-500"}
                                                                />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemStatusChange(card.card_id, item.id, "served")}
                                                                title="Ready"
                                                                className="p-2 rounded-md hover:bg-gray-100"
                                                            >
                                                                <FaCheckCircle
                                                                    size={20}
                                                                    className={item.status === "served" ? "text-green-500" : "text-gray-500"}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* ── Card footer — old styling: status as colored text + add button ── */}
                                            <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
                                                <button className={`text-l font-semibold uppercase
                                                    ${card.status === "pending"   ? "text-blue-600"  : ""}
                                                    ${card.status === "preparing" ? "text-orange-600": ""}
                                                    ${card.status === "ready"     ? "text-green-600" : ""}
                                                `}>
                                                    {card.status}
                                                </button>

                                               
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Delete order confirmation modal — old styling ── */}
                    {showDeleteModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="w-full max-w-md rounded-xl overflow-hidden shadow-lg bg-white text-gray-900">
                                <div className="px-6 py-5 border-b">
                                    <h3 className="text-lg font-semibold">Confirm Delete</h3>
                                </div>
                                <div className="px-6 py-4">
                                    <p className="text-sm text-gray-600">
                                        {!cardToDelete?.is_sub_order
                                            ? "Delete this order and ALL its sub-orders?"
                                            : `Delete sub-order #${cardToDelete?.dinein_order_id}?`}
                                    </p>
                                </div>
                                <div className="px-6 py-4 flex justify-end gap-3 border-t">
                                    <button
                                        onClick={confirmDeleteCard}
                                        className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => { setShowDeleteModal(false); setCardToDelete(null); }}
                                        className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
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