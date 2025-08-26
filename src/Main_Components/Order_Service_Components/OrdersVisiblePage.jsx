// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import orderServicesPort from "../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../Backend_Port_Files/TableServices";
// import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import InvoiceModal from "../Invoice_Services_Components/Invoice_Page";


// const OrdersVisiblePage = () => {
//     const { clientId } = useParams();                                                            // extract clientId from URL
//     const [orders, setOrders] = useState([]);                                                    // store orders
//     const [loading, setLoading] = useState(true);                                                // loader flag
//     const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);                          // which order is expanded
//     const { darkMode } = useTheme();                                                             // check if dark mode is enabled
//     const token = localStorage.getItem("access_token");                                          // get token from local storage
//     const [inventoryMap, setInventoryMap] = useState({});
//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [orderToDelete, setOrderToDelete] = useState(null);
//     const [tablesMap, setTablesMap] = useState({});

//     const [editOrderId, setEditOrderId] = useState(null);
//     const [showDeleteModals, setShowDeleteModals] = useState(false);
//     const [deleteTarget, setDeleteTarget] = useState({ orderId: null, itemId: null });
//     const [editedItemsMap, setEditedItemsMap] = useState({});
//     const [allInventoryItems, setAllInventoryItems] = useState([]);
//     const [itemSearchQuery, setItemSearchQuery] = useState("");
//     const [itemSearchResults, setItemSearchResults] = useState([]);

//     const todayDate = new Date().toISOString().split("T")[0];
//     const [selectedDate, setSelectedDate] = useState(todayDate);
//     const [filterMode, setFilterMode] = useState(0);
//     // 0 = ascending date, 1 = descending date, 2 = new, 3 = preparing, 4 = served
//     const [showInvoiceModal, setShowInvoiceModal] = useState(false);
//     const [invoiceOrder, setInvoiceOrder] = useState(null);

//     // --------------------------------------------------------------------------- //

//     const openInvoiceModal = (order) => {
//         const tableName = tablesMap[order.table_id] || order.table_id;

//         // 🔑 Enrich order.items with price from inventoryMap
//         const itemsWithPrice = (order.items || []).map(item => ({
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
//     useEffect(() => {
//         inventoryServicesPort.get(`/${clientId}/inventory/read`, {
//             headers: { Authorization: `Bearer ${token}` }
//         })
//             .then(res => {
//                 setAllInventoryItems(res.data.data || []); console.log("✅ All inventory items:", res.data.data);
//             })
//             .catch(err => {
//                 console.error("Failed to load inventory:", err);
//             });
//     }, []);
//     useEffect(() => {
//         if (expandedOrderIndex === null || expandedOrderIndex === undefined || !orders[expandedOrderIndex]) {
//             setItemSearchResults([]);
//             return;
//         }

//         const currentOrderItems = orders[expandedOrderIndex].items.map(i => i.item_id.toString());

//         console.log("Current order item IDs:", currentOrderItems);
//         console.log("Inventory items IDs for filtering:", allInventoryItems.map(i => ({ id: i.id.toString(), name: i.name })));

//         const filtered = allInventoryItems
//             .filter(item => (item.name || "").toLowerCase().includes(itemSearchQuery.toLowerCase()))
//             .filter(item => !currentOrderItems.includes(item.id.toString()));

//         console.log("Filtered items after exclusion:", filtered.map(i => i.name));

//         setItemSearchResults(filtered);
//     }, [itemSearchQuery, allInventoryItems, expandedOrderIndex, orders]);

//     const addItemToOrder = (orderId, selectedItem) => {
//         console.log("🟢 Adding item to order:", selectedItem);

//         let targetItems = [];

//         setOrders(prevOrders => {
//             return prevOrders.map(order => {
//                 if (order.id !== orderId) return order;

//                 const newItem = {
//                     item_id: selectedItem.id,
//                     item_name: selectedItem.name,
//                     quantity: 1,
//                     price: selectedItem.price,
//                     status: "new",
//                     note: "",
//                     slug: selectedItem.slug || generateSlug(selectedItem.name)
//                 };

//                 const newItems = [...order.items, newItem];
//                 targetItems = newItems; // 🟢 store for use after state update

//                 return {
//                     ...order,
//                     items: newItems
//                 };
//             });
//         });

//         // ✅ Do this OUTSIDE of setOrders to avoid duplication
//         setTimeout(() => {
//             updateOrderItems(orderId, targetItems);
//         }, 0);

//         setItemSearchQuery("");
//         setItemSearchResults([]);
//     };



//     const updateItemQuantity = (orderId, itemId, newQty) => {
//         setOrders(prev =>
//             prev.map(order => {
//                 if (order.id !== orderId) return order;

//                 const updatedItems = order.items.map(item =>
//                     item.item_id === itemId
//                         ? { ...item, quantity: newQty > 0 ? newQty : 1 }
//                         : item
//                 );

//                 const newTotal = updatedItems.reduce((sum, item) => {
//                     const itemPrice = inventoryMap[item.item_id]?.price || 0;
//                     return sum + item.quantity * itemPrice;
//                 }, 0);

//                 return {
//                     ...order,
//                     items: updatedItems,
//                     total_price: newTotal
//                 };
//             })
//         );

//         // Also store this in editable map
//         setEditedItemsMap(prev => {
//             const currentItems = orders.find(o => o.id === orderId)?.items || [];
//             const updated = currentItems.map(item =>
//                 item.item_id === itemId
//                     ? { ...item, quantity: newQty > 0 ? newQty : 1 }
//                     : item
//             );
//             return { ...prev, [orderId]: updated };
//         });
//     };


//     // --------------------------------------------------------------------------- //
//     //Theme Effect(dark & light theme)
//     useEffect(() => {
//         document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
//     }, [darkMode]);

//     // --------------------------------------------------------------------------- //
//     //Fetching orders
//     useEffect(() => {
//         const fetchOrders = async () => {
//             //no accesstoken no access
//             if (!token) {
//                 console.error(" Access token not found");
//                 setLoading(false);
//                 return;
//             }

//             try {
//                 const response = await orderServicesPort.get(
//                     `/${clientId}/dinein/table`,
//                     {
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                         },
//                     }
//                 );
//                 console.log("Placed Orders:", response.data);
//                 //on success ...orders are stored in state (orders) else it returns empty array
//                 setOrders(response.data?.data || []);
//                 setLoading(false);
//             } catch (error) {
//                 const msg = error?.response?.data?.detail || "❌ Failed to fetch dine-in orders.";
//                 console.error(msg, error);
//                 toast.error(msg);
//                 setLoading(false);
//             }

//         };

//         if (clientId) {
//             fetchOrders();
//         }
//     }, [clientId]);


//     // --------------------------------------------------------------------------- //
//     //Expands/collapses the details for a particular order
//     const toggleExpand = (index) => {
//         setExpandedOrderIndex(index === expandedOrderIndex ? null : index);
//     };

//     // --------------------------------------------------------------------------- //

//     //Change Order Status
//     const handleStatusChange = async (orderId, newStatus) => {
//         const order = orders.find((o) => o.id === orderId);
//         if (!order || order.status === "served") return;

//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 {
//                     id: orderId,
//                     client_id: clientId,
//                     status: newStatus,
//                 },
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 }
//             );

//             toast.success("Order status updated");

//             setOrders((prev) =>
//                 prev.map((o) =>
//                     o.id === orderId
//                         ? {
//                             ...o,
//                             status: newStatus, // ✅ Only this line changes
//                             // Items remain untouched
//                         }
//                         : o
//                 )
//             );

//             // Optional: exit edit mode if status is served
//             if (newStatus === "served") {
//                 setEditOrderId(null);
//             }

//         } catch (err) {
//             const msg = err?.response?.data?.detail || "❌ Failed to update order status.";
//             console.error(msg, err);
//             toast.error(msg);
//         }
//     };


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




//     // --------------------------------------------------------------------------- //
//     const cancelItem = async (orderId, itemId) => {
//         const order = orders.find(o => o.id === orderId);
//         const item = order?.items.find(i => i.item_id === itemId);
//         if (!item?.id) return;

//         try {
//             // 1. Delete item from DB
//             await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
//                 params: { order_item_id: item.id, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });

//             // 2. Remove item from local state
//             const updatedOrders = orders.map(o => {
//                 if (o.id !== orderId) return o;

//                 const updatedItems = o.items.filter(i => i.item_id !== itemId);
//                 const newTotal = updatedItems.reduce((sum, item) => {
//                     const price = inventoryMap[item.item_id]?.price || item.price || 0;
//                     return sum + (item.quantity || 1) * price;
//                 }, 0);

//                 return {
//                     ...o,
//                     items: updatedItems,
//                     total_price: newTotal
//                 };
//             });

//             setOrders(updatedOrders);

//             // 3. Update backend total_price
//             const newOrder = updatedOrders.find(o => o.id === orderId);
//             if (newOrder) {
//                 await orderServicesPort.post(
//                     `/${clientId}/dinein/update`,
//                     {
//                         id: orderId,
//                         total_price: newOrder.total_price
//                     },
//                     {
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                         },
//                     }
//                 );
//             }

//             // 4. Update editable map (optional)
//             setEditedItemsMap(prev => {
//                 const updated = (prev[orderId] || []).filter(i => i.item_id !== itemId);
//                 return { ...prev, [orderId]: updated };
//             });

//             toast.success("Item cancelled and total updated");
//         } catch (err) {
//             const msg = err?.response?.data?.detail || "❌ Failed to cancel item.";
//             console.error(msg, err);
//             toast.error(msg);
//         }
//     };


//     //-------------------------------------------------- //
//     //-------------------------------------------------- //
//     //-------------------------------------------------- //
//     //-------------------------------------------------- //
//     const updateOrderItems = async (orderId, updatedItemsWithStatuses) => {
//         const cleanedItems = updatedItemsWithStatuses.map(item => ({
//             item_id: item.item_id || item.inventory_id, // fallback
//             item_name: item.name || item.item_name,
//             quantity: item.quantity || 1,
//             status: item.status || "new",
//             note: item.note || "",
//             slug: item.slug || "",
//             price: item.price || inventoryMap[item.item_id || item.inventory_id]?.price || 0,
//             client_id: clientId,
//             order_id: orderId
//         }));

//         console.log("📤 Final payload to order_items/update:");
//         cleanedItems.forEach((item, i) => console.log(`Item ${i + 1}:`, item));

//         const totalPrice = cleanedItems.reduce((sum, item) => {
//             return sum + item.price * item.quantity;
//         }, 0);

//         try {
//             // ✅ Use query param for order_id
//             await axios.post(
//                 `http://localhost:8003/saas/${clientId}/order_items/update?order_id=${orderId}`,
//                 cleanedItems,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             await axios.post(
//                 `http://localhost:8003/saas/${clientId}/dinein/update`,
//                 {
//                     id: orderId,
//                     total_price: totalPrice
//                 },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             toast.success("Item statuses & total updated!");
//         } catch (err) {
//             console.error("❌ Failed to update order items:", err);
//             if (err.response?.data) {
//                 console.error("🚨 Response data:", err.response.data);
//             }
//             toast.error("Failed to update items or total.");
//         }
//     };




//     // ----------------------------------------------------- //
//     const confirmDeleteOrder = async () => {
//         if (!orderToDelete) return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
//                 params: {
//                     dinein_order_id: orderToDelete,
//                     client_id: clientId,
//                 },
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
//             setExpandedOrderIndex(null);
//             toast.success(" Order deleted");
//         } catch (err) {
//             console.error("❌ Failed to delete order", err);
//             toast.error("❌ Failed to delete order");
//         } finally {
//             setShowDeleteModal(false);
//             setOrderToDelete(null);
//         }
//     };

//     // --------------------------------------------------------------------------- //
//     useEffect(() => {
//         const fetchTables = async () => {
//             try {
//                 const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
//                     headers: { Authorization: `Bearer ${token}` }
//                 });

//                 const tableList = res.data?.data || [];
//                 const map = {};
//                 tableList.forEach(table => {
//                     map[table.id] = table.name;
//                 });
//                 setTablesMap(map);
//             } catch (error) {
//                 console.error("❌ Failed to fetch tables:", error);
//             }
//         };

//         fetchTables();
//     }, [clientId]);

//     // --------------------------------------------------------------------------- //
//     useEffect(() => {
//         const fetchInventory = async () => {
//             if (!token || !clientId) return;

//             try {
//                 const res = await inventoryServicesPort.get(`/${clientId}/inventory/read`, {
//                     headers: {
//                         Authorization: `Bearer ${token}`
//                     }
//                 });

//                 const inventoryList = res.data?.data || [];
//                 const map = {};

//                 inventoryList.forEach(item => {
//                     map[item.id] = item; // Includes price
//                 });

//                 setInventoryMap(map);
//             } catch (error) {
//                 console.error("❌ Failed to fetch inventory:", error);
//             }
//         };

//         fetchInventory();
//     }, [clientId]);

//     // --------------------------------------------------------------------------- //
//     let filteredOrders = selectedDate
//         ? orders.filter(order => {
//             const orderDate = new Date(order.created_at).toLocaleDateString("en-CA");
//             return orderDate === selectedDate;
//         })
//         : orders;

//     // Now apply filterMode on filteredOrders instead of on all orders again
//     switch (filterMode) {
//         case 0: // Ascending date
//             filteredOrders = [...filteredOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
//             break;
//         case 1: // Descending date
//             filteredOrders = [...filteredOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
//             break;
//         case 2: // New orders
//             filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "new");
//             break;
//         case 3: // Preparing orders
//             filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "preparing");
//             break;
//         case 4: // Served orders
//             filteredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "served");
//             break;
//         default:
//             break;
//     }


//     return (
//         <>
//             <div className="OrderSummary-container">
//                 <div className="orders-page">
//                     <div className="orders-header">
//                         <h2>Table Orders</h2>
//                         <div className="orders-actions">
//                             <select
//                                 className="date-filter"
//                                 value={selectedDate}
//                                 onChange={(e) => setSelectedDate(e.target.value)}
//                             >
//                                 <option value="">All Dates</option>
//                                 {[...Array(15)].map((_, i) => {
//                                     const d = new Date();
//                                     d.setDate(d.getDate() - i);
//                                     const dateString = d.toLocaleDateString("en-CA");
//                                     const label = i === 0 ? "Today" : dateString;
//                                     return (
//                                         <option key={dateString} value={dateString}>
//                                             {label}
//                                         </option>
//                                     );
//                                 })}
//                             </select>
//                             <button className="btn export">Export</button>
//                             <button
//                                 className="btn filter"
//                                 onClick={() => setFilterMode((prev) => (prev + 1) % 5)}
//                             >
//                                 Filter
//                             </button>

//                         </div>
//                     </div>

//                     {loading ? (
//                         <div className="loading">Loading orders...</div>
//                     ) : (
//                         <div className="orders-list">
//                             {filteredOrders.length === 0 ? (
//                                 <div className="no-orders">No orders found.</div>
//                             ) : (
//                                 filteredOrders.map((order, index) => (
//                                     <div key={order.id || index} className="order-card">
//                                         <div className="order-summary grid-row">
//                                             <div className="order-col">{tablesMap[order.table_id] || order.table_id}</div>
//                                             <div className="order-col">{order.items.length} items</div>
//                                             <div className="order-col">₹{parseFloat(order.total_price || 0).toFixed(2)}</div>
//                                             <div className={`order-col status ${order.status?.toLowerCase()}`}>
//                                                 {order.status}
//                                             </div>
//                                             <div className="order-col">{new Date(order.created_at).toLocaleDateString()}</div>
//                                             <div className="order-col"><button
//                                                 className="btn invoice"
//                                                 onClick={() => openInvoiceModal(order)}
//                                             >
//                                                 Invoice
//                                             </button>

//                                             </div>
//                                             <div className="order-col">
//                                                 <button className="btn toggle" onClick={() => toggleExpand(index)}>
//                                                     {expandedOrderIndex === index ? "Hide" : "View"}
//                                                 </button>
//                                             </div>
//                                         </div>

//                                         {expandedOrderIndex === index && (
//                                             <div className="order-details">
//                                                 <div className="order-controls">
//                                                     {order.status !== "served" && (
//                                                         <>
//                                                             <button
//                                                                 className="delete-btn"
//                                                                 onClick={() => {
//                                                                     setOrderToDelete(order.id);
//                                                                     setShowDeleteModal(true);
//                                                                 }}
//                                                             >
//                                                                 Delete Order
//                                                             </button>

//                                                             {["served"].map((status) => (
//                                                                 <button
//                                                                     key={status}
//                                                                     className={`btn status-toggle ${order.status === status ? "active" : ""}`}
//                                                                     onClick={() => handleStatusChange(order.id, status)}
//                                                                 >
//                                                                     {status}
//                                                                 </button>
//                                                             ))}

//                                                             <button
//                                                                 className="btn edit"
//                                                                 onClick={() =>
//                                                                     setEditOrderId((prev) => (prev === order.id ? null : order.id))
//                                                                 }
//                                                             >
//                                                                 {editOrderId === order.id ? "Cancel Edit" : "Edit"}
//                                                             </button>
//                                                         </>
//                                                     )}
//                                                 </div>

//                                                 {/* Items grid */}
//                                                 <div className="items-grid-header grid-row">
//                                                     <div>Item(s)</div>
//                                                     <div>Quantity</div>
//                                                     <div>Status</div>
//                                                     <div>Actions</div>
//                                                 </div>

//                                                 {order.items?.map((item, idx) => (
//                                                     <div key={idx} className="items-grid-row grid-row">
//                                                         <div>{item.item_name || item.item_id}</div>
//                                                         <div>
//                                                             {editOrderId === order.id ? (
//                                                                 <div className="qty-controls">
//                                                                     <button
//                                                                         onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity - 1)}
//                                                                         disabled={item.quantity <= 1}
//                                                                     >
//                                                                         −
//                                                                     </button>
//                                                                     <span>{item.quantity}</span>
//                                                                     <button
//                                                                         onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity + 1)}
//                                                                     >
//                                                                         +
//                                                                     </button>
//                                                                 </div>
//                                                             ) : (
//                                                                 <span>{item.quantity}</span>
//                                                             )}
//                                                         </div>
//                                                         <div>
//                                                             <span className={`status-tag ${item.status}`}>{item.status}</span>
//                                                         </div>
//                                                         <div className="actions">
//                                                             {["served"].map((status) => (
//                                                                 <button
//                                                                     key={status}
//                                                                     className={`btn item-status ${item.status === status ? "active" : ""}`}
//                                                                     onClick={() => handleItemStatusChange(order.id, item.item_id, status)}
//                                                                     disabled={item.status === "served" || item.status === "cancelled"}
//                                                                 >
//                                                                     {status}
//                                                                 </button>
//                                                             ))}

//                                                             {editOrderId === order.id && (
//                                                                 <button
//                                                                     className="btn delete"
//                                                                     onClick={() => {
//                                                                         setDeleteTarget({ orderId: order.id, itemId: item.item_id });
//                                                                         setShowDeleteModals(true);
//                                                                     }}
//                                                                     disabled={item.status === "cancelled"}
//                                                                 >
//                                                                     Delete
//                                                                 </button>
//                                                             )}
//                                                         </div>
//                                                     </div>
//                                                 ))}

//                                                 {editOrderId === order.id && order.status !== "served" && (
//                                                     <div className="add-item-row">
//                                                         <input
//                                                             type="text"
//                                                             className="item-search"
//                                                             placeholder="Search item to add..."
//                                                             value={itemSearchQuery}
//                                                             onChange={(e) => setItemSearchQuery(e.target.value)}
//                                                         />
//                                                         {itemSearchResults.length > 0 && (
//                                                             <ul className="search-results">
//                                                                 {itemSearchResults.map(item => (
//                                                                     <li key={item.id} onClick={() => addItemToOrder(order.id, item)}>
//                                                                         {item.name} - ₹{item.price}
//                                                                     </li>
//                                                                 ))}
//                                                             </ul>
//                                                         )}
//                                                     </div>
//                                                 )}

//                                                 <div className="save-row">
//                                                     <button
//                                                         className="btn save"
//                                                         onClick={() => updateOrderItems(order.id, order.items)}
//                                                     >
//                                                         Save Items
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </div>
//                                 ))
//                             )}
//                         </div>
//                     )}

//                     {/* Modals */}
//                     {showDeleteModals && deleteTarget && (
//                         <div className="modal-overlay">
//                             <div className="modal">
//                                 <p>Delete this item?</p>
//                                 <div className="modal-buttons">
//                                     <button
//                                         className="btn yes"
//                                         onClick={() => {
//                                             cancelItem(deleteTarget.orderId, deleteTarget.itemId);
//                                             setShowDeleteModals(false);
//                                             setDeleteTarget({ orderId: null, itemId: null });
//                                         }}
//                                     >
//                                         Yes
//                                     </button>
//                                     <button
//                                         className="btn no"
//                                         onClick={() => {
//                                             setShowDeleteModals(false);
//                                             setDeleteTarget({ orderId: null, itemId: null });
//                                         }}
//                                     >
//                                         No
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {showDeleteModal && (
//                         <div className="modal-overlay">
//                             <div className="modal">
//                                 <h3>Delete this order?</h3>
//                                 <div className="modal-buttons">
//                                     <button className="btn yes" onClick={confirmDeleteOrder}>Yes</button>
//                                     <button
//                                         className="btn no"
//                                         onClick={() => {
//                                             setShowDeleteModal(false);
//                                             setOrderToDelete(null);
//                                         }}
//                                     >
//                                         No
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                     {showInvoiceModal && invoiceOrder && (
//                         <InvoiceModal order={invoiceOrder} onClose={closeInvoiceModal} />
//                     )}

//                 </div>
//             </div>
//         </>

//     );
// };

// export default OrdersVisiblePage;


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
import React, { useEffect, useState, useMemo } from "react";
import {
    DataGrid,
    GridActionsCellItem,
    GridToolbarContainer,
    GridToolbarExport,
} from "@mui/x-data-grid";
import {
    Box,
    Button,
    Modal,
    Typography,
    TextField,
    Select,
    MenuItem,
} from "@mui/material";
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Receipt as InvoiceIcon,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { toast } from "react-toastify";

import orderServicesPort from "../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";

import InvoiceModal from "../Invoice_Services_Components/Invoice_Page";

const OrdersVisiblePage = () => {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");
    const { darkMode } = useTheme();

    // Order data and tables/inventory maps
    const [orders, setOrders] = useState([]);
    const [tablesMap, setTablesMap] = useState({});
    const [inventoryMap, setInventoryMap] = useState({});
    const [allInventoryItems, setAllInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Date filter and other UI state
    const todayDate = new Date().toISOString().split("T")[0];
    const [selectedDate, setSelectedDate] = useState(todayDate);

    // Modals and selected entities
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceOrder, setInvoiceOrder] = useState(null);

    const [editOrderId, setEditOrderId] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);

    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [editedOrderItems, setEditedOrderItems] = useState([]);

    // --- Fetch tables map
    useEffect(() => {
        if (!clientId || !token) return;

        const fetchTables = async () => {
            try {
                const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const map = {};
                (res.data?.data || []).forEach((t) => {
                    map[t.id] = t.name;
                });
                setTablesMap(map);
            } catch { }
        };
        fetchTables();
    }, [clientId, token]);

    // --- Fetch inventory map & all items list
    useEffect(() => {
        if (!clientId || !token) return;

        const fetchInventory = async () => {
            try {
                const res = await inventoryServicesPort.get(
                    `/${clientId}/inventory/read`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const invMap = {};
                (res.data?.data || []).forEach((item) => {
                    invMap[item.id] = item;
                });
                setInventoryMap(invMap);
                setAllInventoryItems(res.data?.data || []);
            } catch { }
        };

        fetchInventory();
    }, [clientId, token]);

    // --- Fetch orders
    useEffect(() => {
        if (!clientId || !token) return;

        const fetchOrders = async () => {
            setLoading(true);
            try {
                const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setOrders(res.data?.data || []);
            } catch {
                toast.error("Failed to fetch dine-in orders");
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [clientId, token]);

    // Filter orders by selected date
    const filteredOrders = useMemo(() => {
        if (!selectedDate) return orders;
        return orders.filter(
            (o) =>
                new Date(o.created_at).toLocaleDateString("en-CA") === selectedDate
        );
    }, [orders, selectedDate]);

    // Prepare rows for DataGrid
    const rows = useMemo(() => filteredOrders.map(order => ({
        id: order.id,
        tableName: tablesMap[order.table_id] || order.table_id,
        itemsCount: Array.isArray(order.items) ? order.items.length : 0,
        totalPrice: Number(order.total_price) || 0,
        status: order.status || '',
        createdAt: new Date(order.created_at).toLocaleDateString(),
        rawOrder: order,
    })), [filteredOrders, tablesMap]);

    // --- Open invoice modal
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

    // --- Open edit modal with order items for editing
    const openEditModal = (order) => {
        setEditOrderId(order.id);
        // Deep clone to avoid mutating original order state until saved
        setEditedOrderItems(JSON.parse(JSON.stringify(order.items || [])));
        setItemSearchQuery("");
        setItemSearchResults([]);
        setShowEditModal(true);
    };
    const closeEditModal = () => {
        setEditOrderId(null);
        setEditedOrderItems([]);
        setShowEditModal(false);
    };

    // --- Update item quantity locally while editing
    const updateItemQuantity = (itemId, newQty) => {
        if (newQty < 1) return;
        setEditedOrderItems((prev) =>
            prev.map((item) => (item.item_id === itemId ? { ...item, quantity: newQty } : item))
        );
    };

    // --- Update item status locally while editing
    const updateItemStatus = (itemId, newStatus) => {
        setEditedOrderItems((prev) =>
            prev.map((item) => (item.item_id === itemId ? { ...item, status: newStatus } : item))
        );
    };

    // --- Add item to edited order items
    const addItemToOrder = (selectedItem) => {
        if (editedOrderItems.find((i) => i.item_id === selectedItem.id)) return;
        const newItem = {
            item_id: selectedItem.id,
            item_name: selectedItem.name,
            quantity: 1,
            price: selectedItem.price,
            status: "new",
            note: "",
            slug: selectedItem.slug || selectedItem.name.toLowerCase().replace(/\s+/g, "-"),
        };
        setEditedOrderItems((prev) => [...prev, newItem]);
        setItemSearchQuery("");
        setItemSearchResults([]);
    };

    // --- Remove item from edited order items
    const removeItemFromOrder = (itemId) => {
        setEditedOrderItems((prev) => prev.filter((item) => item.item_id !== itemId));
    };

    // --- Save edited order items to backend
    const saveEditedOrderItems = async () => {
        if (!editOrderId) return;

        // Prepare cleaned items for backend API
        const cleanedItems = editedOrderItems.map((item) => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            status: item.status || "new",
            note: item.note || "",
            slug: item.slug || "",
            price: item.price || inventoryMap[item.item_id]?.price || 0,
            client_id: clientId,
            order_id: editOrderId,
        }));

        const totalPrice = cleanedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        try {
            await orderServicesPort.post(
                `/${clientId}/order_items/update?order_id=${editOrderId}`,
                cleanedItems,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: editOrderId, total_price: totalPrice },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update state locally
            setOrders((prev) =>
                prev.map((o) => (o.id === editOrderId ? { ...o, items: editedOrderItems, total_price: totalPrice } : o))
            );

            toast.success("Order updated successfully");
            closeEditModal();
        } catch {
            toast.error("Failed to save order changes");
        }
    };

    // --- Search inventory for adding items to order edit modal
    useEffect(() => {
        if (!itemSearchQuery.trim() || !editOrderId) {
            setItemSearchResults([]);
            return;
        }
        const currentItemIds = editedOrderItems.map((i) => i.item_id);

        const filtered = allInventoryItems.filter(
            (item) =>
                item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) &&
                !currentItemIds.includes(item.id)
        );

        setItemSearchResults(filtered);
    }, [itemSearchQuery, allInventoryItems, editedOrderItems, editOrderId]);

    // --- Delete order handling
    const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
                params: { dinein_order_id: orderToDelete, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
            toast.success("Order deleted");
            setShowDeleteOrderModal(false);
            setOrderToDelete(null);
        } catch {
            toast.error("Failed to delete order");
        }
    };

    // Columns for DataGrid
    const columns = useMemo(() => [
        { field: "tableName", headerName: "Table", flex: 1, minWidth: 120 },
        { field: "itemsCount", headerName: "Items", width: 90 },
        {
            field: "totalPrice",
            headerName: "Total Price",
            width: 130,
            // Show as currency string
            renderCell: (params) => `₹${Number(params.value).toFixed(2)}`,
        },
        { field: "status", headerName: "Status", minWidth: 120 },
        { field: "createdAt", headerName: "Date", minWidth: 120 },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            type: "actions",
            getActions: (params) => {
                const order = params.row.rawOrder;
                return [
                    <GridActionsCellItem
                        key="invoice"
                        icon={<InvoiceIcon />}
                        label="Invoice"
                        onClick={() => openInvoiceModal(order)}
                        showInMenu={false}
                    />,
                    <GridActionsCellItem
                        key="edit"
                        icon={<EditIcon />}
                        label={editOrderId === order.id ? "Cancel Edit" : "Edit"}
                        onClick={() => (editOrderId === order.id ? closeEditModal() : openEditModal(order))}
                        showInMenu={false}
                    />,
                    order.status !== "served" && (
                        <GridActionsCellItem
                            key="delete"
                            icon={<DeleteIcon />}
                            label="Delete Order"
                            onClick={() => {
                                setOrderToDelete(order.id);
                                setShowDeleteOrderModal(true);
                            }}
                            showInMenu={false}
                        />
                    ),
                ].filter(Boolean);
            },
        },
    ], [editOrderId, tablesMap, inventoryMap, editedOrderItems]);

    // Custom toolbar with date filter and export button
    const CustomToolbar = () => (
        <GridToolbarContainer sx={{ display: "flex", alignItems: "center", gap: 2, p: 1 }}>
            <Select
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                sx={{ minWidth: 120 }}
            >
                <MenuItem value="">All Dates</MenuItem>
                {[...Array(15)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateString = d.toLocaleDateString("en-CA");
                    const label = i === 0 ? "Today" : dateString;
                    return (
                        <MenuItem key={dateString} value={dateString}>
                            {label}
                        </MenuItem>
                    );
                })}
            </Select>
            <Button variant="outlined" onClick={() => setFilterMode((prev) => (prev + 1) % 5)} size="small">
                Filter Mode:{" "}
                {["Asc Date", "Desc Date", "New", "Preparing", "Served"][filterMode]}
            </Button>
            <GridToolbarExport csvOptions={{ fileName: "orders-export" }} />
        </GridToolbarContainer>
    );

    return (
        <Box sx={{ p: 1, bgcolor: darkMode ? "background.default" : "#f5f5f5", minHeight: "89vh", overflow: 'scroll', width: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Table Orders
            </Typography>

            <Box sx={{ width: "100%", overflowX: "auto", bgcolor: darkMode ? "background.paper" : "#fff", borderRadius: 1, boxShadow: 2 }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSizeOptions={[5, 8, 10, 20]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 8, page: 0 } },
                        sorting: { sortModel: [{ field: "createdAt", sort: "desc" }] },
                    }}
                    pagination
                    sortingMode="client"
                    filterMode="client"
                    autoHeight
                    loading={loading}
                    components={{ Toolbar: CustomToolbar }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                />
            </Box>

            {/* Edit Order Modal */}
            <Modal open={showEditModal} onClose={closeEditModal} aria-labelledby="edit-order-title" aria-describedby="edit-order-description">
                <Box sx={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                    bgcolor: "background.paper", borderRadius: 1, boxShadow: 24, p: 3, minWidth: 400, maxHeight: "90vh", overflowY: "auto"
                }}>
                    {editOrderId && (() => {
                        const order = orders.find((o) => o.id === editOrderId);
                        if (!order) return null;

                        return (
                            <>
                                <Typography id="edit-order-title" variant="h6" mb={2}>
                                    Edit Order #{order.id} - Table: {tablesMap[order.table_id] || order.table_id}
                                </Typography>

                                <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mb: 2 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: "left", padding: "8px" }}>Item</th>
                                            <th style={{ padding: "8px" }}>Qty</th>
                                            <th style={{ padding: "8px" }}>Status</th>
                                            <th style={{ padding: "8px" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editedOrderItems.map((item) => (
                                            <tr key={item.item_id}>
                                                <td style={{ padding: "6px 8px" }}>{item.item_name || item.item_id}</td>
                                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                                    <Button size="small" disabled={item.quantity <= 1} onClick={() => updateItemQuantity(item.item_id, item.quantity - 1)}>-</Button>
                                                    <span style={{ margin: "0 8px" }}>{item.quantity}</span>
                                                    <Button size="small" onClick={() => updateItemQuantity(item.item_id, item.quantity + 1)}>+</Button>
                                                </td>
                                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                                    <Select
                                                        size="small"
                                                        value={item.status}
                                                        onChange={(e) => updateItemStatus(item.item_id, e.target.value)}
                                                    >
                                                        {["new", "preparing", "served", "cancelled"].map((status) => (
                                                            <MenuItem key={status} value={status}>
                                                                {status}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </td>
                                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                                    {item.status !== "cancelled" && (
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            onClick={() => removeItemFromOrder(item.item_id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Box>

                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Search items to add"
                                    value={itemSearchQuery}
                                    onChange={(e) => setItemSearchQuery(e.target.value)}
                                    placeholder="Type to search inventory..."
                                    margin="normal"
                                />
                                {itemSearchResults.length > 0 && (
                                    <Box sx={{
                                        border: "1px solid", borderColor: "divider", borderRadius: 1,
                                        maxHeight: 180, overflowY: "auto", bgcolor: "background.paper"
                                    }}>
                                        {itemSearchResults.map((item) => (
                                            <Box
                                                key={item.id}
                                                sx={{ p: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                                                onClick={() => addItemToOrder(item)}
                                            >
                                                {item.name} - ₹{item.price}
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                <Box mt={2} sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                    <Button variant="contained" color="primary" onClick={saveEditedOrderItems}>
                                        Save
                                    </Button>
                                    <Button variant="outlined" onClick={closeEditModal}>
                                        Cancel
                                    </Button>
                                </Box>
                            </>
                        );
                    })()}
                </Box>
            </Modal>

            {/* Delete Order Modal */}
            <Modal
                open={showDeleteModal}
                onClose={() => setShowDeleteOrderModal(false)}
                aria-labelledby="delete-order-title"
                aria-describedby="delete-order-description"
            >
                <Box sx={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                    bgcolor: "background.paper", borderRadius: 1, boxShadow: 24, p: 4, width: 300, textAlign: "center"
                }}>
                    <Typography id="delete-order-title" variant="h6" gutterBottom>
                        Delete this order?
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-around", mt: 2 }}>
                        <Button variant="contained" color="error" onClick={confirmDeleteOrder}>Yes</Button>
                        <Button variant="outlined" onClick={() => setShowDeleteOrderModal(false)}>No</Button>
                    </Box>
                </Box>
            </Modal>

            {/* Invoice Modal */}
            {showInvoiceModal && invoiceOrder && (
                <InvoiceModal order={invoiceOrder} onClose={closeInvoiceModal} />
            )}
        </Box>
    );
};

export default OrdersVisiblePage;

