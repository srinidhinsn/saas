import React, { useState, useEffect, useMemo } from "react";
import {
    DataGrid,
    GridToolbarContainer,
    GridToolbarExport,
} from "@mui/x-data-grid";
import {
    Button,
    Select,
    MenuItem,
    TextField,
    Collapse,
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import axios from "axios";
import orderServicesPort from "../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
import { useParams } from "react-router-dom";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OrdersVisiblePage = () => {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");
    const { darkMode } = useTheme();

    // Orders and auxiliary states
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tablesMap, setTablesMap] = useState({});
    const [inventoryMap, setInventoryMap] = useState({});
    const [allInventoryItems, setAllInventoryItems] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

    // UI interaction states
    const [expandedRowIds, setExpandedRowIds] = useState(new Set());
    const [editOrderId, setEditOrderId] = useState(null);
    const [itemSearchQueryMap, setItemSearchQueryMap] = useState({});
    const [itemSearchResultsMap, setItemSearchResultsMap] = useState({});

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // {type: "order" | "item", orderId, itemId?}

    // Apply theme to body
    useEffect(() => {
        document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    // Fetch inventory



    // Fetch tables
    useEffect(() => {
        if (!clientId || !token) return;
        (async () => {
            try {
                const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const tables = res.data?.data || [];
                const map = {};
                tables.forEach((t) => (map[t.id] = t.name));
                setTablesMap(map);
                console.log("Tables fetched:", tables);
                console.log("Tables map:", map);
            } catch (err) {
                console.error("Failed to fetch tables", err);
            }
        })();
    }, [clientId, token]);

    // Fetch orders
    useEffect(() => {
        if (!clientId || !token) return;
        (async () => {
            setLoading(true);
            try {
                const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log("Raw orders data from API:", res.data?.data);
                setOrders(res.data?.data || []);
                console.log("Orders fetched:", orders);
            } catch (err) {
                toast.error("Failed to fetch dine-in orders");
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, [clientId, token]);
    useEffect(() => {
        if (!clientId || !token) return;
        (async () => {
            try {
                const res = await inventoryServicesPort.get(`/${clientId}/inventory/read`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const items = res.data?.data || [];
                setAllInventoryItems(items);
                const map = {};
                items.forEach(item => {
                    map[item.id] = item;
                });
                setInventoryMap(map);
            } catch (err) {
                console.error("Failed to fetch inventory", err);
            }
        })();
    }, [clientId, token]);

    // Filter orders by selected date
    const filteredOrders = useMemo(() => {
        if (!selectedDate) return orders;
        return orders.filter((o) => {
            const orderDate = new Date(o.created_at);
            const selDate = new Date(selectedDate);
            return (
                orderDate.getFullYear() === selDate.getFullYear() &&
                orderDate.getMonth() === selDate.getMonth() &&
                orderDate.getDate() === selDate.getDate()
            );
        });
    }, [orders, selectedDate]);



    // Toggle row detail expansion
    const toggleRowExpand = (id) => {
        setExpandedRowIds((prev) => {
            const updated = new Set(prev);
            if (updated.has(id)) {
                updated.delete(id);
            } else {
                updated.add(id);
            }
            return updated;
        });
    };

    // Order status change handler
    const handleStatusChange = async (orderId, newStatus) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order || order.status === "served") return;
        try {
            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: orderId, client_id: clientId, status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Order status updated");
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            );
            if (newStatus === "served") setEditOrderId(null);
        } catch {
            toast.error("Failed to update order status");
        }
    };

    // Item status update
    const handleItemStatusChange = async (orderId, itemId, newStatus) => {
        try {
            const order = orders.find((o) => o.id === orderId);
            if (!order) return;
            const updatedItems = order.items.map((item) =>
                item.item_id === itemId ? { ...item, status: newStatus } : item
            );
            const totalPrice = updatedItems.reduce(
                (sum, item) => sum + (inventoryMap[item.item_id]?.price || 0) * (item.quantity || 1),
                0
            );
            const itemToUpdate = updatedItems.find((item) => item.item_id === itemId);
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
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, items: updatedItems, total_price: totalPrice } : o))
            );
        } catch {
            toast.error("Failed to update item status");
        }
    };

    // Quantity update in local state only, requires save
    const updateItemQuantity = (orderId, itemId, newQty) => {
        if (newQty < 1) newQty = 1;
        setOrders((prev) =>
            prev.map((order) => {
                if (order.id !== orderId) return order;
                const updatedItems = order.items.map((item) =>
                    item.item_id === itemId ? { ...item, quantity: newQty } : item
                );
                const newTotal = updatedItems.reduce(
                    (sum, item) => sum + (inventoryMap[item.item_id]?.price || 0) * (item.quantity || 1),
                    0
                );
                return { ...order, items: updatedItems, total_price: newTotal };
            })
        );
    };

    // Save updated items to backend
    const updateOrderItems = async (orderId, updatedItems) => {
        const cleanedItems = updatedItems.map((item) => ({
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
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, total_price: totalPrice, items: updatedItems } : o))
            );
        } catch {
            toast.error("Failed to update items or total.");
        }
    };

    // Cancel item from order
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
                const newTotal = updatedItems.reduce(
                    (sum, i) => sum + (inventoryMap[i.item_id]?.price || i.price || 0) * (i.quantity || 1),
                    0
                );
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
            toast.success("Item cancelled and total updated");
        } catch {
            toast.error("Failed to cancel item");
        }
    };

    // Confirm delete order
    const confirmDeleteOrder = async () => {
        if (!deleteTarget || deleteTarget.type !== "order") return;
        try {
            await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
                params: { dinein_order_id: deleteTarget.orderId, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.orderId));
            toast.success("Order deleted");
        } catch {
            toast.error("Failed to delete order");
        } finally {
            setShowDeleteModal(false);
            setDeleteTarget(null);
        }
    };

    // Item search query changes
    const onItemSearchChange = (orderId, query) => {
        setItemSearchQueryMap((prev) => ({ ...prev, [orderId]: query }));

        if (!query.trim()) {
            setItemSearchResultsMap((prev) => ({ ...prev, [orderId]: [] }));
            return;
        }

        const order = orders.find((o) => o.id === orderId);
        const currentItemIds = order?.items.map((i) => i.item_id) || [];
        const filteredResults = allInventoryItems
            .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
            .filter((item) => !currentItemIds.includes(item.id));
        setItemSearchResultsMap((prev) => ({ ...prev, [orderId]: filteredResults }));
    };

    // Add item to order
    const addItemToOrder = (orderId, selectedItem) => {
        setOrders((prev) =>
            prev.map((order) => {
                if (order.id !== orderId) return order;
                const newItem = {
                    item_id: selectedItem.id,
                    item_name: selectedItem.name,
                    quantity: 1,
                    price: selectedItem.price,
                    status: "new",
                    note: "",
                    slug: selectedItem.slug || selectedItem.name.toLowerCase().replace(/\s+/g, "-"),
                };
                return { ...order, items: [...order.items, newItem] };
            })
        );
        setItemSearchQueryMap((prev) => ({ ...prev, [orderId]: "" }));
        setItemSearchResultsMap((prev) => ({ ...prev, [orderId]: [] }));
    };

    const columns = React.useMemo(() => [
        {
            field: "expand",
            headerName: "",
            sortable: false,
            filterable: false,
            width: 60,
            renderCell: (params) => (
                <IconButton size="small" onClick={() => toggleRowExpand(params.id)}>
                    {expandedRowIds.has(params.id) ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
            ),
        },
        {
            field: "tableName",
            headerName: "Table",
            width: 130,
        },
        {
            field: "itemsCount",
            headerName: "Items",
            width: 100,
        },
        {
            field: "total_price",
            headerName: "Total (₹)",
            flex: 1,
            minWidth: 150,
            renderCell: (params) => {
                // Show price or fallback
                const val = Number(params.value);
                return isNaN(val) ? "₹0.00" : `₹${val.toFixed(2)}`;
            },
        },
        {
            field: "status",
            headerName: "Status",
            width: 150,
            renderCell: (params) => {
                const status = params?.row?.status ?? "";
                const colorMap = {
                    pending: { color: "orange", bg: "#fff3e0" },
                    preparing: { color: "blue", bg: "#e3f2fd" },
                    served: { color: "green", bg: "#e8f5e9" },
                };
                const { color, bg } = colorMap[status.toLowerCase()] || { color: "gray", bg: "#f5f5f5" };
                return (
                    <Typography
                        variant="body2"
                        sx={{ px: 1, py: 0.5, borderRadius: 1, color, backgroundColor: bg, textTransform: "capitalize" }}
                    >
                        {status}
                    </Typography>
                );
            },
        },
        {
            field: "created_at",
            headerName: "Date",
            flex: 1,
            minWidth: 150,
            renderCell: (params) => {
                if (!params.value) return "";
                const d = new Date(params.value);
                return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
            },
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 220,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const row = params?.row ?? {};
                return (
                    <Box display="flex" gap={1}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setEditOrderId(row.id === editOrderId ? null : row.id)}
                            disabled={row.status === "served"}
                        >
                            {row.id === editOrderId ? "Cancel Edit" : "Edit"}
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => {
                                setDeleteTarget({ type: "order", orderId: row.id });
                                setShowDeleteModal(true);
                            }}
                        >
                            Delete
                        </Button>
                    </Box>
                );
            },
        },
    ], [editOrderId, expandedRowIds]);

    // In your render return:



    return (
        <Box sx={{ padding: 3 }}>
            <Box
                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
            >
                <Typography variant="h5">Table Orders</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Select
                        size="small"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value="">All Dates</MenuItem>
                        {[...Array(15)].map((_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() - i);
                            const val = d.toISOString().split("T")[0];
                            const label = i === 0 ? "Today" : val;
                            return (
                                <MenuItem key={val} value={val}>
                                    {label}
                                </MenuItem>
                            );
                        })}
                    </Select>
                    <Button variant="outlined" disabled>Export</Button>
                    <Button variant="contained" disabled>Create Order</Button>
                </Box>
            </Box>
            <DataGrid
                autoHeight
                rows={filteredOrders.map(o => ({
                    id: o.id,
                    table_id: o.table_id,
                    tableName: tablesMap[String(o.table_id)] ?? "No Table",
                    itemsCount: Array.isArray(o.items) ? o.items.length : 0,
                    total_price: Number(o.total_price), // ensure number here
                    status: o.status,
                    created_at: o.created_at,
                }))}
                columns={columns}
                loading={loading}
                getRowId={(row) => row.id}
                pageSizeOptions={[10, 20, 50]}
                pagination
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
            />



            {/* Expanded rows rendered below grid as detail view */}
            {Array.from(expandedRowIds).map((orderId) => {
                const order = orders.find((o) => o.id === orderId);
                if (!order) return null;
                const isEditing = orderId === editOrderId;
                const itemSearchQuery = itemSearchQueryMap[orderId] || "";
                const itemSearchResults = itemSearchResultsMap[orderId] || [];

                return (
                    <Box key={order.id} sx={{ my: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                        <Box sx={{ mb: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {order.status !== "served" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        color="error"
                                        onClick={() => {
                                            setDeleteTarget({ type: "order", orderId: order.id });
                                            setShowDeleteModal(true);
                                        }}
                                    >
                                        Delete Order
                                    </Button>
                                    {["pending", "preparing", "served"].map((status) => (
                                        <Button
                                            key={status}
                                            size="small"
                                            variant={order.status === status ? "contained" : "outlined"}
                                            onClick={() => handleStatusChange(order.id, status)}
                                        >
                                            {status}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() =>
                                            setEditOrderId((prev) => (prev === order.id ? null : order.id))
                                        }
                                    >
                                        {isEditing ? "Cancel Edit" : "Edit"}
                                    </Button>
                                </>
                            )}
                        </Box>

                        <Box>
                            {/* Items list */}
                            <Box
                                sx={{
                                    width: "100%",
                                    overflowX: "auto",
                                    "& table": { borderCollapse: "collapse", width: "100%" },
                                    "& th, & td": {
                                        border: "1px solid",
                                        borderColor: "divider",
                                        padding: 1,
                                        textAlign: "center",
                                        whiteSpace: "nowrap",
                                    },
                                    "& th": {
                                        backgroundColor: darkMode ? "#333" : "#eee",
                                    },
                                }}
                            >
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Item(s)</th>
                                            <th>Quantity</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map((item) => (
                                            <tr key={item.item_id}>
                                                <td>{item.item_name || item.item_id}</td>
                                                <td>
                                                    {isEditing ? (
                                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                disabled={item.quantity <= 1}
                                                                onClick={() =>
                                                                    updateItemQuantity(order.id, item.item_id, item.quantity - 1)
                                                                }
                                                            >
                                                                −
                                                            </Button>
                                                            <Typography>{item.quantity}</Typography>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() =>
                                                                    updateItemQuantity(order.id, item.item_id, item.quantity + 1)
                                                                }
                                                            >
                                                                +
                                                            </Button>
                                                        </Box>
                                                    ) : (
                                                        item.quantity
                                                    )}
                                                </td>
                                                <td>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            color:
                                                                item.status === "new"
                                                                    ? "gray"
                                                                    : item.status === "preparing"
                                                                        ? "blue"
                                                                        : item.status === "served"
                                                                            ? "green"
                                                                            : "gray",
                                                            backgroundColor:
                                                                item.status === "new"
                                                                    ? "#f0f0f0"
                                                                    : item.status === "preparing"
                                                                        ? "#e3f2fd"
                                                                        : item.status === "served"
                                                                            ? "#e8f5e9"
                                                                            : "#f5f5f5",
                                                        }}
                                                    >
                                                        {item.status}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    {["new", "preparing", "served"].map((status) => (
                                                        <Button
                                                            key={status}
                                                            size="small"
                                                            variant={item.status === status ? "contained" : "outlined"}
                                                            onClick={() => handleItemStatusChange(order.id, item.item_id, status)}
                                                            disabled={item.status === "served" || item.status === "cancelled"}
                                                            sx={{ mr: 0.5, mb: 0.5 }}
                                                        >
                                                            {status}
                                                        </Button>
                                                    ))}
                                                    {isEditing && (
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                            onClick={() => {
                                                                setDeleteTarget({ type: "item", orderId: order.id, itemId: item.item_id });
                                                                setShowDeleteModal(true);
                                                            }}
                                                            disabled={item.status === "cancelled"}
                                                        >
                                                            Delete
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Add item row */}
                                        {isEditing && order.status !== "served" && (
                                            <tr>
                                                <td colSpan={4} style={{ position: "relative" }}>
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        label="Search item to add..."
                                                        variant="outlined"
                                                        value={itemSearchQueryMap[order.id] || ""}
                                                        onChange={(e) => onItemSearchChange(order.id, e.target.value)}
                                                    />
                                                    {itemSearchResultsMap[order.id]?.length > 0 && (
                                                        <Box
                                                            sx={{
                                                                position: "absolute",
                                                                zIndex: 1000,
                                                                bgcolor: "background.paper",
                                                                boxShadow: 1,
                                                                borderRadius: 1,
                                                                maxHeight: 200,
                                                                overflowY: "auto",
                                                                width: "100%",
                                                                mt: 0.5,
                                                            }}
                                                        >
                                                            {itemSearchResultsMap[order.id].map((item) => (
                                                                <Box
                                                                    key={item.id}
                                                                    sx={{
                                                                        p: 1,
                                                                        "&:hover": {
                                                                            bgcolor: "grey.300",
                                                                            cursor: "pointer",
                                                                        },
                                                                    }}
                                                                    onClick={() => addItemToOrder(order.id, item)}
                                                                >
                                                                    {item.name} - ₹{item.price}
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {isEditing && (
                                        <tfoot>
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: "right", padding: 4 }}>
                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        onClick={() => updateOrderItems(order.id, order.items)}
                                                    >
                                                        Save Items
                                                    </Button>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </Box>
                        </Box>
                    </Box>
                );
            })}

            {/* Delete confirmation dialog */}
            <Dialog
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this{" "}
                    {deleteTarget?.type === "order" ? "order" : "item"}?
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            if (deleteTarget?.type === "order") confirmDeleteOrder();
                            else if (deleteTarget?.type === "item") {
                                cancelItem(deleteTarget.orderId, deleteTarget.itemId);
                            }
                            setShowDeleteModal(false);
                            setDeleteTarget(null);
                        }}
                        color="error"
                    >
                        Yes
                    </Button>
                    <Button onClick={() => setShowDeleteModal(false)}>No</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OrdersVisiblePage;
