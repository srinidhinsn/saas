// import React, { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../../ThemeChangerComponent/ThemeProvider";
// import orderServicesPort from "../../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../../Backend_Port_Files/TableServices";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const KitchenDisplay = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const { darkMode } = useTheme();

//     const [orders, setOrders] = useState([]);
//     const [loading, setLoading] = useState(true);

//     // useEffect(() => {
//     //     if (!clientId || !token) {
//     //         setLoading(false);
//     //         toast.error("Token Expired")
//     //     }
//     //     try {
//     //         const response = await tableServicesPort.get(`/${clientId}/dinein/table`, {
//     //             headers: { Authorization: `Bearer ${token}` }
//     //         })
//     //     }
//     // }, [clientId, token])
//     // Fetch real-time orders
//     useEffect(() => {
//         const fetchOrders = async () => {
//             if (!token || !clientId) {
//                 setLoading(false);
//                 return;
//             }
//             try {
//                 const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 setOrders(res.data?.data || []);
//             } catch (error) {
//                 toast.error("Failed to fetch orders.");
//                 console.error("Fetch error:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchOrders();
//         const interval = setInterval(fetchOrders, 10000); // refresh every 10 seconds
//         return () => clearInterval(interval);
//     }, [clientId, token]);

//     // Format date-time as HH:mm
//     const formatTime = (dateStr) => {
//         if (!dateStr) return "";
//         const dt = new Date(dateStr);
//         return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//     };

//     // Determine card color based on order/type/table_number (adapt as needed)
//     const cardColors = (order) => {
//         // Example logic from your image
//         if (order.table_number === "07") return "orange";
//         if (order.type?.toLowerCase() === "take waay") {
//             if (order.customer_name?.toLowerCase().includes("walk") && order.order_id === 428) return "green-light";
//             else return "blue";
//         }
//         if (order.table_number === "12" || order.table_number === "01") return "red";
//         if (order.table_number === "06") return "green-dark";
//         return "default";
//     };

//     // Button text based on order status; adapt as necessary
//     const getButtons = (order) => {
//         if (order.status === "preparing") return ["Pause", "Finish"];
//         return ["Pending", "Preparing", "Served"];
//     };

//     return (
//         <div className="KDS-Container">
//             <div className={`kds-page ${darkMode ? "theme-dark" : "theme-light"}`}>
//                 {loading ? (
//                     <div className="loading">Loading orders...</div>
//                 ) : (
//                     <div className="kds-grid">
//                         {orders.map((order) => (
//                             <div key={order.id || order.order_id} className={`kds-card ${cardColors(order)}`}>
//                                 <div style={{ display: 'flex', justifyContent: 'end', }} className="">
//                                     <button style={{
//                                         background: "var(--bg-container)", border: 'none', padding: '5px', borderRadius: '5px', color: 'var(--bg-text-color)'

//                                     }}>+Add item</button>
//                                 </div>
//                                 <div className="kds-card-header">

//                                     <div className="left-header">
//                                         <span className="table-icon">🪑</span>
//                                         <span className="table-text">
//                                             {order.table_number ? `Table ${order.table_number}` : order.customer_name}
//                                         </span>
//                                         <span className="order-id">Order #{order.id || order.order_id}</span>
//                                     </div>
//                                     <div className="right-header">
//                                         <span>{formatTime(order.created_at || order.createdAt)}</span>
//                                         <span>5 Mins</span>
//                                     </div>
//                                 </div>

//                                 <div className="kds-card-body">
//                                     {(order.items || order.order_items || []).map((item, idx) => (
//                                         <div key={item.item_id || item.id || idx} className="item-row">
//                                             <div className="item-name">
//                                                 {item.quantity || item.qty || 1}x {item.item_name || item.name || "Item"}
//                                             </div>
//                                             <div className="item-measure">{item.measure || item.unit || item.price || ""}</div>
//                                         </div>
//                                     ))}
//                                 </div>

//                                 <div className="kds-card-footer">
//                                     {getButtons(order).map((btn) => (
//                                         <button
//                                             key={btn}
//                                             className={`btn ${btn.toLowerCase()}`}
//                                             type="button"
//                                             onClick={() => toast.info(`${btn} clicked for Order ${order.id || order.order_id}`)}
//                                         >
//                                             {btn}
//                                         </button>
//                                     ))}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default KitchenDisplay;



// =============================================================================================================================== //
// import React, { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../../ThemeChangerComponent/ThemeProvider";
// import orderServicesPort from "../../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../../Backend_Port_Files/TableServices";
// import inventoryServicesPort from "../../../Backend_Port_Files/InventoryServices";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { FaTrash, FaCheckCircle, FaClock, FaHourglassHalf } from "react-icons/fa";

// const KitchenDisplay = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const { darkMode } = useTheme();

//     const [orders, setOrders] = useState([]);
//     const [tablesMap, setTablesMap] = useState({});
//     const [inventoryItems, setInventoryItems] = useState([]);
//     const [loading, setLoading] = useState(true);

//     const [editOrderId, setEditOrderId] = useState(null);
//     const [addingOrderId, setAddingOrderId] = useState(null);

//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [deleteTarget, setDeleteTarget] = useState(null);

//     const [itemSearchQuery, setItemSearchQuery] = useState("");
//     const [itemSearchResults, setItemSearchResults] = useState([]);

//     // Fetch tables map for table names
//     useEffect(() => {
//         if (!token || !clientId) return;
//         tableServicesPort
//             .get(`/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } })
//             .then(res => {
//                 const map = {};
//                 (res.data?.data || []).forEach(t => (map[t.id] = t.name));
//                 setTablesMap(map);
//             })
//             .catch(err => console.error("Failed to fetch tables:", err));
//     }, [clientId, token]);

//     // Fetch inventory items
//     useEffect(() => {
//         if (!token || !clientId) return;
//         inventoryServicesPort
//             .get(`/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } })
//             .then(res => setInventoryItems(res.data?.data || []))
//             .catch(err => console.error("Failed to fetch inventory:", err));
//     }, [clientId, token]);

//     // Fetch today's orders only
//     useEffect(() => {
//         const fetchOrders = async () => {
//             if (!token || !clientId) {
//                 setLoading(false);
//                 return;
//             }
//             try {
//                 const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const allOrders = res.data?.data || [];
//                 const todayString = new Date().toISOString().split("T")[0];
//                 const todayOrders = allOrders.filter((order) => {
//                     const orderDate = new Date(order.created_at || order.createdAt);
//                     const orderDateString = orderDate.toISOString().split("T");
//                     return orderDateString === todayString;
//                 });
//                 setOrders(allOrders);
//             } catch (err) {
//                 toast.error("Failed to fetch orders.");
//                 console.error(err);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchOrders();
//         const interval = setInterval(fetchOrders, 10000);
//         return () => clearInterval(interval);
//     }, [clientId, token]);

//     // Filtering inventory search results excluding existing items
//     useEffect(() => {
//         if (!addingOrderId) {
//             setItemSearchResults([]);
//             setItemSearchQuery("");
//             return;
//         }
//         const currentOrder = orders.find(o => o.id === addingOrderId);
//         if (!currentOrder) {
//             setItemSearchResults([]);
//             return;
//         }
//         const orderedItemIds = currentOrder.items.map(i => i.item_id);
//         const filtered = inventoryItems.filter(
//             item =>
//                 item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) &&
//                 !orderedItemIds.includes(item.id)
//         );
//         setItemSearchResults(filtered);
//     }, [itemSearchQuery, addingOrderId, inventoryItems, orders]);

//     // Add item to order and save backend
//     const addItemToOrder = async (orderId, item) => {
//         try {
//             setOrders(prev =>
//                 prev.map(o =>
//                     o.id !== orderId ? o : { ...o, items: [...o.items, { ...item, quantity: 1, status: "new", item_name: item.name }] }
//                 )
//             );
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${orderId}`,
//                 [{ ...item, quantity: 1, status: "new", client_id: clientId, order_id: orderId }],
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );
//             toast.success(`Added ${item.name} to order`);
//             setItemSearchQuery("");
//             setItemSearchResults([]);
//             setAddingOrderId(null);
//         } catch (error) {
//             console.error("Failed to add item", error);
//             toast.error("Failed to add item");
//         }
//     };

//     // Toggle edit mode
//     const toggleEdit = (orderId) => {
//         if (addingOrderId && addingOrderId !== orderId) setAddingOrderId(null);
//         setEditOrderId(prev => (prev === orderId ? null : orderId));
//     };

//     // Toggle add item mode
//     const toggleAddItem = (orderId) => {
//         if (editOrderId && editOrderId !== orderId) setEditOrderId(null);
//         setAddingOrderId(prev => (prev === orderId ? null : orderId));
//     };

//     // Update item quantity locally
//     const updateItemQuantity = (orderId, itemId, newQty) => {
//         setOrders(prev =>
//             prev.map(o => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map(item =>
//                     item.item_id === itemId ? { ...item, quantity: newQty < 1 ? 1 : newQty } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
//     };

//     // Update item status locally
//     const updateItemStatus = (orderId, itemId, newStatus) => {
//         setOrders(prev =>
//             prev.map(o => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map(item =>
//                     item.item_id === itemId ? { ...item, status: newStatus } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
//     };

//     // Update item name locally
//     const updateItemName = (orderId, itemId, newName) => {
//         setOrders(prev =>
//             prev.map(o => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map(item =>
//                     item.item_id === itemId ? { ...item, item_name: newName } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
//     };

//     // Delete item locally
//     const deleteItemFromOrder = (orderId, itemId) => {
//         setOrders(prev =>
//             prev.map(o => {
//                 if (o.id !== orderId) return o;
//                 return { ...o, items: o.items.filter(i => i.item_id !== itemId) };
//             })
//         );
//     };

//     // Save order items and total price backend
//     const saveOrderItems = async (order) => {
//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${order.id}`,
//                 order.items,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );
//             const totalPrice = order.items.reduce((acc, i) => acc + (i.price || 0) * (i.quantity || 1), 0);
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: order.id, total_price: totalPrice },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );
//             toast.success("Order items saved");
//             setEditOrderId(null);
//             setAddingOrderId(null);
//         } catch (err) {
//             console.error(err);
//             toast.error("Failed to save order items");
//         }
//     };

//     // Card color helper
//     const cardColors = (order) => {
//         if (order.table_number === "07") return "orange";
//         if (order.type?.toLowerCase() === "take waay") {
//             if (order.customer_name?.toLowerCase().includes("walk") && order.order_id === 428) return "green-light";
//             else return "blue";
//         }
//         if (order.table_number === "12" || order.table_number === "01") return "red";
//         if (order.table_number === "06") return "green-dark";
//         return "default";
//     };

//     // Status buttons for order status
//     const statusButtons = ["pending", "preparing", "served"];

//     const handleStatusChange = async (orderId, newStatus) => {
//         try {
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: orderId, status: newStatus },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );
//             setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
//             toast.success("Order status updated");
//         } catch {
//             toast.error("Failed to update order status");
//         }
//     };

//     // Confirm delete order modal handler
//     const confirmDeleteOrder = async () => {
//         if (!deleteTarget) return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
//                 params: { dinein_order_id: deleteTarget, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             setOrders(prev => prev.filter(o => o.id !== deleteTarget));
//             toast.success("Order deleted");
//         } catch (err) {
//             toast.error("Failed to delete order");
//         } finally {
//             setShowDeleteModal(false);
//             setDeleteTarget(null);
//         }
//     };

//     return (
//         <>
//             <div className={`kds-page ${darkMode ? "theme-dark" : "theme-light"}`}>
//                 {loading ? (
//                     <div className="loading">Loading orders...</div>
//                 ) : (
//                     <div className="kds-grid">
//                         {orders.map(order => {
//                             const isEditing = editOrderId === order.id;
//                             const isAdding = addingOrderId === order.id;
//                             return (
//                                 <div key={order.id} className={`kds-card ${cardColors(order)}`}>
//                                     <div className="kds-card-header" style={{ display: "flex", justifyContent: "space-between" }}>
//                                         <div className="left-header" style={{ display: "flex", alignItems: "center" }}>
//                                             <button
//                                                 className="delete-icon"
//                                                 title="Delete Order"
//                                                 onClick={() => {
//                                                     setDeleteTarget(order.id);
//                                                     setShowDeleteModal(true);
//                                                 }}
//                                             >
//                                                 <FaTrash />
//                                             </button>
//                                             <span className="table-text" style={{ marginLeft: "10px" }}>
//                                                 {tablesMap[order.table_id] || order.table_number || order.customer_name || "N/A"}
//                                             </span>
//                                         </div>
//                                         <div className="right-header" style={{ gap: "10px", display: "flex" }}>
//                                             <button className="edit-btn" onClick={() => toggleEdit(order.id)}>
//                                                 {isEditing ? "Cancel Edit" : "Edit"}
//                                             </button>
//                                             {!isAdding && !isEditing && (
//                                                 <button className="add-item-btn" onClick={() => setAddingOrderId(order.id)}>
//                                                     + Add item
//                                                 </button>
//                                             )}
//                                             {(isAdding || isEditing) && (
//                                                 <button className="save-btn" onClick={() => saveOrderItems(order)}>
//                                                     Save
//                                                 </button>
//                                             )}
//                                         </div>
//                                     </div>
//                                     <div className="kds-card-body">
//                                         {order.items.map(item => (
//                                             <div key={item.item_id} className="item-row" style={{ alignItems: "center", cursor: isEditing ? "pointer" : "default" }}>
//                                                 <div className="item-name" style={{ flex: 1 }}>
//                                                     {isEditing ? (
//                                                         <input
//                                                             value={item.item_name}
//                                                             onChange={e => updateItemName(order.id, item.item_id, e.target.value)}
//                                                         />
//                                                     ) : (
//                                                         `${item.quantity}x ${item.item_name || "Unnamed Item"}`
//                                                     )}
//                                                 </div>
//                                                 {(isEditing || isAdding) && (
//                                                     <>
//                                                         <div className="quantity-controls">
//                                                             <button onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity - 1)} disabled={item.quantity <= 1}>
//                                                                 −
//                                                             </button>
//                                                             <span style={{ margin: "0 6px" }}>{item.quantity}</span>
//                                                             <button onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity + 1)}>+</button>
//                                                         </div>
//                                                         <div className="status-icons" style={{ display: "flex", gap: "8px", marginLeft: "12px" }}>
//                                                             <FaClock title="Pending" color={item.status === "pending" ? "blue" : "grey"} style={{ cursor: "pointer" }} onClick={() => updateItemStatus(order.id, item.item_id, "pending")} />
//                                                             <FaHourglassHalf title="Preparing" color={item.status === "preparing" ? "orange" : "grey"} style={{ cursor: "pointer" }} onClick={() => updateItemStatus(order.id, item.item_id, "preparing")} />
//                                                             <FaCheckCircle title="Served" color={item.status === "served" ? "green" : "grey"} style={{ cursor: "pointer" }} onClick={() => updateItemStatus(order.id, item.item_id, "served")} />
//                                                         </div>
//                                                         <button className="delete-item-btn" onClick={() => deleteItemFromOrder(order.id, item.item_id)} title="Delete Item" style={{ marginLeft: "12px", color: "red", cursor: "pointer" }}>
//                                                             <FaTrash />
//                                                         </button>
//                                                     </>
//                                                 )}
//                                                 {!isEditing && !isAdding && <div className="item-measure" style={{ marginLeft: "12px" }}>{item.measure || ""}</div>}
//                                             </div>
//                                         ))}
//                                         {isAdding && (
//                                             <div style={{ marginTop: "12px" }}>
//                                                 <input
//                                                     type="text"
//                                                     placeholder="Search inventory items to add..."
//                                                     value={itemSearchQuery}
//                                                     onChange={e => setItemSearchQuery(e.target.value)}
//                                                     style={{ width: "100%", padding: "6px" }}
//                                                 />
//                                                 {itemSearchResults.length > 0 && (
//                                                     <ul style={{ maxHeight: "150px", overflowY: "auto", marginTop: "6px" }}>
//                                                         {itemSearchResults.map(item => (
//                                                             <li
//                                                                 key={item.id}
//                                                                 style={{ cursor: "pointer", padding: "4px", borderBottom: "1px solid #ddd" }}
//                                                                 onClick={() => addItemToOrder(order.id, item)}
//                                                             >
//                                                                 {item.name} - ₹{item.price}
//                                                             </li>
//                                                         ))}
//                                                     </ul>
//                                                 )}
//                                             </div>
//                                         )}
//                                     </div>
//                                     {!isAdding && !isEditing && (
//                                         <div className="kds-card-footer">
//                                             {statusButtons.map(status => (
//                                                 <button key={status} className={`btn ${status} ${order.status === status ? "active" : ""}`} onClick={() => handleStatusChange(order.id, status)}>
//                                                     {status.charAt(0).toUpperCase() + status.slice(1)}
//                                                 </button>
//                                             ))}
//                                         </div>
//                                     )}
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 )}
//             </div>

//             {showDeleteModal && (
//                 <div className="modal-overlay">
//                     <div className="modal">
//                         <p>Delete this order?</p>
//                         <button onClick={confirmDeleteOrder} className="btn yes">Yes</button>
//                         <button
//                             onClick={() => {
//                                 setShowDeleteModal(false);
//                                 setDeleteTarget(null);
//                             }}
//                             className="btn no"
//                         >
//                             No
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default KitchenDisplay;


// =============================================================================================================================== //



// import React, { useEffect, useState } from "react";
// import orderServicesPort from "../../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../../Backend_Port_Files/TableServices";
// import inventoryServicesPort from "../../../Backend_Port_Files/InventoryServices";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../../ThemeChangerComponent/ThemeProvider";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { FaTrash, FaCheckCircle, FaClock, FaHourglassHalf } from "react-icons/fa";

// const KitchenDisplay = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const { darkMode } = useTheme();

//     const [orders, setOrders] = useState([]);
//     const [tablesMap, setTablesMap] = useState({});
//     const [inventoryItems, setInventoryItems] = useState([]);
//     const [inventoryMap, setInventoryMap] = useState({});
//     const [loading, setLoading] = useState(true);

//     const [editOrderId, setEditOrderId] = useState(null);
//     const [addingOrderId, setAddingOrderId] = useState(null);

//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [orderToDelete, setOrderToDelete] = useState(null);

//     const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
//     const [deleteItemTarget, setDeleteItemTarget] = useState({ orderId: null, itemId: null });

//     const [itemSearchQuery, setItemSearchQuery] = useState("");
//     const [itemSearchResults, setItemSearchResults] = useState([]);

//     // Fetch tables
//     useEffect(() => {
//         if (!token || !clientId) return;

//         tableServicesPort
//             .get(`/${clientId}/tables/read`, {
//                 headers: { Authorization: `Bearer ${token}` },
//             })
//             .then((res) => {
//                 const map = {};
//                 (res.data?.data || []).forEach((t) => (map[t.id] = t.name));
//                 setTablesMap(map);
//             })
//             .catch(() => toast.error("Failed to fetch tables"));
//     }, [clientId, token]);

//     // Fetch inventory items
//     useEffect(() => {
//         if (!token || !clientId) return;

//         inventoryServicesPort
//             .get(`/${clientId}/inventory/read`, {
//                 headers: { Authorization: `Bearer ${token}` },
//             })
//             .then((res) => {
//                 setInventoryItems(res.data?.data || []);
//                 const map = {};
//                 (res.data?.data || []).forEach((item) => {
//                     map[item.id] = item;
//                 });
//                 setInventoryMap(map);
//             })
//             .catch(() => toast.error("Failed to fetch inventory items"));
//     }, [clientId, token]);

//     // Fetch today's orders
//     useEffect(() => {
//         const fetchOrders = async () => {
//             if (!token || !clientId) {
//                 setLoading(false);
//                 return;
//             }
//             try {
//                 const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const allOrders = res.data?.data || [];
//                 const todayString = new Date().toISOString().split("T")[0];
//                 const todayOrders = allOrders.filter(order => {
//                     const day = new Date(order.created_at || order.createdAt);
//                     return day.toISOString().split("T")[0] === todayString;
//                 });
//                 setOrders(allOrders);

//             } catch {
//                 toast.error("Failed to fetch orders");
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchOrders();
//         const interval = setInterval(fetchOrders, 10000);
//         return () => clearInterval(interval);
//     }, [clientId, token]);

//     // Inventory filtering for add item search excluding already added items
//     useEffect(() => {
//         if (!addingOrderId) {
//             setItemSearchResults([]);
//             setItemSearchQuery("");
//             return;
//         }
//         const currentOrder = orders.find((o) => o.id === addingOrderId);
//         if (!currentOrder) {
//             setItemSearchResults([]);
//             return;
//         }
//         const orderedIds = new Set(currentOrder.items.map((i) => i.item_id));
//         const filtered = inventoryItems
//             .filter((item) => item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
//             .filter((item) => !orderedIds.has(item.id));
//         setItemSearchResults(filtered);
//     }, [itemSearchQuery, addingOrderId, inventoryItems, orders]);

//     // Add item to order locally & save backend
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
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${orderId}`,
//                 cleanedItems,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
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

//     // Toggle edit mode
//     const toggleEdit = (orderId) => {
//         if (addingOrderId && addingOrderId !== orderId) setAddingOrderId(null);
//         setEditOrderId((prev) => (prev === orderId ? null : orderId));
//     };

//     // Update item quantity locally
//     const updateItemQuantity = (orderId, itemId, newQty) => {
//         setOrders((prev) =>
//             prev.map((o) => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map((item) =>
//                     item.item_id === itemId ? { ...item, quantity: newQty < 1 ? 1 : newQty } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
//     };

//     // Update item status locally
//     const updateItemStatus = (orderId, itemId, newStatus) => {
//         setOrders((prev) =>
//             prev.map((o) => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map((item) =>
//                     item.item_id === itemId ? { ...item, status: newStatus } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
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
//     // Update item name locally
//     const updateItemName = (orderId, itemId, newName) => {
//         setOrders((prev) =>
//             prev.map((o) => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map((item) =>
//                     item.item_id === itemId ? { ...item, item_name: newName } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
//     };
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


//     // Delete item from backend and local state
//     const deleteItemFromOrder = async (orderId, itemId) => {
//         // Find the item id in order with backend id reference
//         const order = orders.find((o) => o.id === orderId);
//         if (!order) return;

//         const item = order.items.find((i) => i.item_id === itemId);
//         if (!item) return;

//         if (!item.id) {
//             // Item may not have 'id' if newly added and unsaved - remove locally
//             setOrders((prev) =>
//                 prev.map((o) => {
//                     if (o.id !== orderId) return o;
//                     return { ...o, items: o.items.filter((i) => i.item_id !== itemId) };
//                 })
//             );
//             toast.success("Item removed locally");
//             return;
//         }

//         try {
//             // Delete from backend
//             await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
//                 params: { order_item_id: item.id, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });

//             // Remove locally
//             setOrders((prev) =>
//                 prev.map((o) => {
//                     if (o.id !== orderId) return o;
//                     const updatedItems = o.items.filter((i) => i.item_id !== itemId);
//                     // Update total price locally reflects immediately
//                     const newTotal = updatedItems.reduce(
//                         (sum, i) => sum + (i.price || 0) * (i.quantity || 1),
//                         0
//                     );
//                     return { ...o, items: updatedItems, total_price: newTotal };
//                 })
//             );

//             toast.success("Item deleted");
//         } catch {
//             toast.error("Failed to delete item");
//         }
//     };

//     // Save order items and updated total price to backend
//     const saveOrderItems = async (order) => {
//         try {
//             // Prepare cleaned items (remove any transient properties)
//             const cleanedItems = order.items.map((item) => ({
//                 item_id: item.item_id,
//                 item_name: item.item_name,
//                 quantity: item.quantity,
//                 status: item.status || "new",
//                 note: item.note || "",
//                 slug: item.slug || "",
//                 price: item.price || inventoryMap[item.item_id]?.price || 0,
//                 client_id: clientId,
//                 order_id: order.id,
//             }));

//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${order.id}`,
//                 cleanedItems,
//                 {
//                     headers: { Authorization: `Bearer ${token}` },
//                 }
//             );

//             const totalPrice = cleanedItems.reduce(
//                 (acc, i) => acc + (i.price || 0) * (i.quantity || 1),
//                 0
//             );

//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: order.id, total_price: totalPrice },
//                 {
//                     headers: { Authorization: `Bearer ${token}` },
//                 }
//             );

//             // Update local total price as well
//             setOrders((prev) =>
//                 prev.map((o) => (o.id === order.id ? { ...o, total_price: totalPrice } : o))
//             );

//             toast.success("Order items saved");
//             setEditOrderId(null);
//             setAddingOrderId(null);
//         } catch {
//             toast.error("Failed to save order items");
//         }
//     };

//     // Card color helper
//     const cardColors = (order) => {
//         if (order.table_number === "07") return "orange";
//         if (order.type?.toLowerCase() === "take waay") {
//             if (order.customer_name?.toLowerCase().includes("walk") && order.order_id === 428) return "green-light";
//             else return "blue";
//         }
//         if (order.table_number === "12" || order.table_number === "01") return "red";
//         if (order.table_number === "06") return "green-dark";
//         return "default";
//     };

//     // Order status buttons
//     const statusButtons = ["pending", "preparing", "served"];

//     // Update order status backend and state
//     const handleStatusChange = async (orderId, newStatus) => {
//         try {
//             // Update order status and items status in backend
//             // First get current order to modify its items
//             const order = orders.find(o => o.id === orderId);
//             if (!order) return;

//             // Update all items if order status is "served"
//             const updatedItems =
//                 newStatus === "served"
//                     ? order.items.map(item => ({ ...item, status: "served" }))
//                     : order.items;

//             const cleanedItems = updatedItems.map(item => ({
//                 item_id: item.item_id,
//                 item_name: item.item_name,
//                 quantity: item.quantity,
//                 status: item.status || "new",
//                 note: item.note || "",
//                 slug: item.slug || "",
//                 price: item.price || inventoryMap[item.item_id]?.price || 0,
//                 client_id: clientId,
//                 order_id: orderId,
//             }));

//             const totalPrice = cleanedItems.reduce(
//                 (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
//                 0
//             );

//             // Save updated items with their statuses
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${orderId}`,
//                 cleanedItems,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             // Update overall order status and total price
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: orderId, status: newStatus, total_price: totalPrice },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             // Update local state accordingly
//             setOrders(prev =>
//                 prev.map(o =>
//                     o.id === orderId
//                         ? { ...o, status: newStatus, items: updatedItems, total_price: totalPrice }
//                         : o
//                 )
//             );

//             toast.success("Order and item statuses updated");

//             // Exit edit/add modes if served
//             if (newStatus === "served") {
//                 if (editOrderId === orderId) setEditOrderId(null);
//                 if (addingOrderId === orderId) setAddingOrderId(null);
//             }
//         } catch (err) {
//             console.error(err);
//             toast.error("Failed to update order status");
//         }
//     };


//     // Delete order confirmation and delete
//     const confirmDeleteOrder = async () => {
//         if (!orderToDelete) return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
//                 params: { dinein_order_id: orderToDelete, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
//             toast.success("Order deleted");
//         } catch {
//             toast.error("Failed to delete order");
//         } finally {
//             setShowDeleteModal(false);
//             setOrderToDelete(null);
//         }
//     };

//     return (
//         <div className="KDS-Container">
//             <>
//                 <div className={`kds-page ${darkMode ? "theme-dark" : "theme-light"}`}>
//                     {loading ? (
//                         <div className="loading">Loading orders...</div>
//                     ) : (
//                         <div className="kds-grid">
//                             {orders.map((order) => {
//                                 const isEditing = editOrderId === order.id;
//                                 const isAdding = addingOrderId === order.id;
//                                 return (
//                                     <div key={order.id} className={`kds-card ${cardColors(order)}`}>
//                                         <div className="kds-card-header" style={{ display: "flex", justifyContent: "space-between" }}>
//                                             <div className="left-header" style={{ display: "flex", alignItems: "center" }}>
//                                                 {/* <button
//                                                 className="delete-icon"
//                                                 title="Delete Order"
//                                                 onClick={() => {
//                                                     setOrderToDelete(order.id);
//                                                     setShowDeleteModal(true);
//                                                 }}
//                                             >
//                                                 <FaTrash />
//                                             </button> */}
//                                                 <span className="table-text" style={{ marginLeft: "10px" }}>
//                                                     {tablesMap[order.table_id] || order.table_number || order.customer_name || "N/A"}
//                                                 </span>
//                                             </div>
//                                             {/* <div className="right-header" style={{ gap: "10px", display: "flex" }}>
//                                             <button className="edit-btn" onClick={() => toggleEdit(order.id)}>
//                                                 {isEditing ? "Cancel Edit" : "Edit"}
//                                             </button>
//                                             {!isAdding && !isEditing && (
//                                                 <button className="add-item-btn" onClick={() => setAddingOrderId(order.id)}>
//                                                     + Add item
//                                                 </button>
//                                             )}
//                                             {(isAdding || isEditing) && (
//                                                 <button className="save-btn" onClick={() => updateOrderItems(order.id, order.items)}>
//                                                     Save
//                                                 </button>
//                                             )}
//                                         </div> */}
//                                         </div>
//                                         <div className="kds-card-body">
//                                             {order.items.map((item, index) => (
//                                                 <div
//                                                     key={item.item_id || index}
//                                                     className="item-row"
//                                                     style={{ alignItems: "center", cursor: isEditing ? "pointer" : "default" }}
//                                                 >
//                                                     <div className="item-name" style={{ flex: 1 }}>
//                                                         {isEditing ? (
//                                                             <input
//                                                                 value={item.item_name}
//                                                                 onChange={(e) => updateItemName(order.id, item.item_id, e.target.value)}
//                                                             />
//                                                         ) : (
//                                                             `${item.quantity}x ${item.item_name || "Unnamed Item"}`
//                                                         )}
//                                                     </div>
//                                                     {order.status !== "served" && (
//                                                         <div
//                                                             className="status-icons"
//                                                             style={{ display: "flex", gap: "8px", marginLeft: "12px" }}
//                                                         >
//                                                             {item.status === "served" ? (
//                                                                 <FaCheckCircle
//                                                                     className="served-status spin"
//                                                                     title="Served"
//                                                                     color="green"
//                                                                     style={{ cursor: "default" }}
//                                                                 />
//                                                             ) : (
//                                                                 <>
//                                                                     <FaClock
//                                                                         className={`pending-status ${item.status === "pending" ? "spin" : ""}`}
//                                                                         title="Pending"
//                                                                         color={item.status === "pending" ? "blue" : "grey"}
//                                                                         style={{ cursor: "pointer" }}
//                                                                         onClick={() => handleItemStatusChange(order.id, item.item_id, "pending")}
//                                                                     />
//                                                                     <FaHourglassHalf
//                                                                         className={`preparing-status ${item.status === "preparing" ? "spin" : ""}`}
//                                                                         title="Preparing"
//                                                                         color={item.status === "preparing" ? "orange" : "grey"}
//                                                                         style={{ cursor: "pointer" }}
//                                                                         onClick={() => handleItemStatusChange(order.id, item.item_id, "preparing")}
//                                                                     />
//                                                                     <FaCheckCircle
//                                                                         className={`served-status ${item.status === "served" ? "spin" : ""}`}
//                                                                         title="Served"
//                                                                         color={item.status === "served" ? "green" : "grey"}
//                                                                         style={{ cursor: "pointer" }}
//                                                                         onClick={() => handleItemStatusChange(order.id, item.item_id, "served")}
//                                                                     />
//                                                                 </>
//                                                             )}
//                                                         </div>
//                                                     )}

//                                                     {(isEditing || isAdding) && (
//                                                         <>
//                                                             {/* <div className="quantity-controls">
//                                                                 <button
//                                                                     onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity - 1)}
//                                                                     disabled={item.quantity <= 1}
//                                                                 >
//                                                                     −
//                                                                 </button>
//                                                                 <span style={{ margin: "0 6px" }}>{item.quantity}</span>
//                                                                 <button onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity + 1)}>+</button>
//                                                             </div> */}
//                                                             <div
//                                                                 className="status-icons"
//                                                                 style={{ display: "flex", gap: "8px", marginLeft: "12px" }}
//                                                             >
//                                                                 <FaClock
//                                                                     title="Pending"
//                                                                     color={item.status === "pending" ? "blue" : "grey"}
//                                                                     style={{ cursor: "pointer" }}
//                                                                     onClick={() => handleItemStatusChange(order.id, item.item_id, "pending")}
//                                                                 />
//                                                                 <FaHourglassHalf
//                                                                     title="Preparing"
//                                                                     color={item.status === "preparing" ? "orange" : "grey"}
//                                                                     style={{ cursor: "pointer" }}
//                                                                     onClick={() => handleItemStatusChange(order.id, item.item_id, "preparing")}
//                                                                 />
//                                                                 <FaCheckCircle
//                                                                     title="Served"
//                                                                     color={item.status === "served" ? "green" : "grey"}
//                                                                     style={{ cursor: "pointer" }}
//                                                                     onClick={() => handleItemStatusChange(order.id, item.item_id, "served")}
//                                                                 />
//                                                             </div>
//                                                             {/* <button
//                                                                 className="delete-item-btn"
//                                                                 onClick={() => {
//                                                                     setDeleteItemTarget({ orderId: order.id, itemId: item.item_id });
//                                                                     setShowDeleteItemModal(true);
//                                                                 }}
//                                                                 title="Delete Item"
//                                                                 style={{ marginLeft: "12px", color: "red", cursor: "pointer" }}
//                                                             >
//                                                                 <FaTrash />
//                                                             </button> */}
//                                                         </>
//                                                     )}
//                                                     {!isEditing && !isAdding && (
//                                                         <div className="item-measure" style={{ marginLeft: "12px" }}>
//                                                             {item.measure || ""}
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             ))}
//                                             {isAdding && (
//                                                 <div style={{ marginTop: "12px" }}>
//                                                     <input
//                                                         type="text"
//                                                         placeholder="Search inventory items to add..."
//                                                         value={itemSearchQuery}
//                                                         onChange={(e) => setItemSearchQuery(e.target.value)}
//                                                         style={{ width: "100%", padding: "6px" }}
//                                                     />
//                                                     {itemSearchResults.length > 0 && (
//                                                         <ul
//                                                             style={{ maxHeight: "150px", overflowY: "auto", marginTop: "6px" }}
//                                                         >
//                                                             {itemSearchResults.map((item) => (
//                                                                 <li
//                                                                     key={item.id}
//                                                                     style={{
//                                                                         cursor: "pointer",
//                                                                         padding: "4px",
//                                                                         borderBottom: "1px solid #ddd",
//                                                                     }}
//                                                                     onClick={() => addItemToOrder(order.id, item)}
//                                                                 >
//                                                                     {item.name} - ₹{item.price}
//                                                                 </li>
//                                                             ))}
//                                                         </ul>
//                                                     )}
//                                                 </div>
//                                             )}
//                                         </div>
//                                         {!isAdding && !isEditing && order.status !== "served" && (
//                                             <div className="kds-card-footer">
//                                                 {order.status === "new" && (
//                                                     <button
//                                                         className="btn pending"
//                                                         onClick={() => handleStatusChange(order.id, "pending")}
//                                                     >
//                                                         New
//                                                     </button>
//                                                 )}
//                                                 {order.status === "pending" && (
//                                                     <button
//                                                         className="btn preparing"
//                                                         onClick={() => handleStatusChange(order.id, "preparing")}
//                                                     >
//                                                         Preparing
//                                                     </button>
//                                                 )}
//                                                 {order.status === "preparing" && (
//                                                     <button
//                                                         className="btn served"
//                                                         onClick={() => handleStatusChange(order.id, "served")}
//                                                     >
//                                                         Order Ready!!!
//                                                     </button>
//                                                 )}
//                                             </div>
//                                         )}

//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     )}
//                 </div>

//                 {/* Delete order confirmation modal */}
//                 {showDeleteModal && (
//                     <div className="modal-overlay">
//                         <div className="modal">
//                             <p>Delete this order?</p>
//                             <button onClick={confirmDeleteOrder} className="btn yes">
//                                 Yes
//                             </button>
//                             <button
//                                 onClick={() => {
//                                     setShowDeleteModal(false);
//                                     setOrderToDelete(null);
//                                 }}
//                                 className="btn no"
//                             >
//                                 No
//                             </button>
//                         </div>
//                     </div>
//                 )}

//                 {/* Delete item confirmation modal */}
//                 {showDeleteItemModal && (
//                     <div className="modal-overlay">
//                         <div className="modal">
//                             <p>Delete this item?</p>
//                             <button
//                                 className="btn yes"
//                                 onClick={async () => {
//                                     if (deleteItemTarget.orderId && deleteItemTarget.itemId) {
//                                         try {
//                                             await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
//                                                 params: { order_item_id: deleteItemTarget.itemId, client_id: clientId },
//                                                 headers: { Authorization: `Bearer ${token}` },
//                                             });
//                                             setOrders((prev) =>
//                                                 prev.map((o) => {
//                                                     if (o.id !== deleteItemTarget.orderId) return o;
//                                                     const updatedItems = o.items.filter(
//                                                         (i) => i.item_id !== deleteItemTarget.itemId
//                                                     );
//                                                     const newTotal = updatedItems.reduce(
//                                                         (sum, i) => sum + (i.price || 0) * (i.quantity || 1),
//                                                         0
//                                                     );
//                                                     return { ...o, items: updatedItems, total_price: newTotal };
//                                                 })
//                                             );
//                                             toast.success("Item deleted");
//                                         } catch {
//                                             toast.error("Failed to delete item");
//                                         } finally {
//                                             setShowDeleteItemModal(false);
//                                             setDeleteItemTarget({ orderId: null, itemId: null });
//                                         }
//                                     }
//                                 }}
//                             >
//                                 Yes
//                             </button>
//                             <button
//                                 className="btn no"
//                                 onClick={() => {
//                                     setShowDeleteItemModal(false);
//                                     setDeleteItemTarget({ orderId: null, itemId: null });
//                                 }}
//                             >
//                                 No
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </>
//         </div>
//     );
// };

// export default KitchenDisplay;


// ========================================================================================================================== // 
// ========================================================================================================================== // 
// ========================================================================================================================== // 
// ========================================================================================================================== // 
// ========================================================================================================================== // 
// ========================================================================================================================== // 
// ========================================================================================================================== //



import React, { useEffect, useState } from "react";
import orderServicesPort from "../../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../../../Backend_Port_Files/InventoryServices";
import { useParams } from "react-router-dom";
import { useTheme } from "../../../ThemeChangerComponent/ThemeProvider";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrash, FaCheckCircle, FaClock, FaHourglassHalf } from "react-icons/fa";

const KitchenDisplay = () => {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");
    const { darkMode } = useTheme();

    const [orders, setOrders] = useState([]);
    const [tablesMap, setTablesMap] = useState({});
    const [inventoryItems, setInventoryItems] = useState([]);
    const [inventoryMap, setInventoryMap] = useState({});
    const [loading, setLoading] = useState(true);

    const [editOrderId, setEditOrderId] = useState(null);
    const [addingOrderId, setAddingOrderId] = useState(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);

    const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
    const [deleteItemTarget, setDeleteItemTarget] = useState({ orderId: null, itemId: null });

    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [itemSearchResults, setItemSearchResults] = useState([]);

    // Fetch tables
    useEffect(() => {
        if (!token || !clientId) return;

        tableServicesPort
            .get(`/${clientId}/tables/read`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const map = {};
                (res.data?.data || []).forEach((t) => (map[t.id] = t.name));
                setTablesMap(map);
            })
            .catch(() => toast.error("Failed to fetch tables"));
    }, [clientId, token]);

    // Fetch inventory items
    useEffect(() => {
        if (!token || !clientId) return;

        inventoryServicesPort
            .get(`/${clientId}/inventory/read`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setInventoryItems(res.data?.data || []);
                const map = {};
                (res.data?.data || []).forEach((item) => {
                    map[item.id] = item;
                });
                setInventoryMap(map);
            })
            .catch(() => toast.error("Failed to fetch inventory items"));
    }, [clientId, token]);

    // Fetch today's orders
    useEffect(() => {
        const fetchOrders = async () => {
            if (!token || !clientId) {
                setLoading(false);
                return;
            }
            try {
                const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const allOrders = res.data?.data || [];
                const today = new Date();
                const todayString = today.toLocaleDateString("en-CA");

                // ✅ filter only today's orders and exclude served ones
                const todayOrders = allOrders.filter(order => {
                    const orderDate = new Date(order.created_at || order.createdAt)
                        .toLocaleDateString("en-CA");
                    return orderDate === todayString && order.status !== "served";
                });

                setOrders(todayOrders);

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



    // Inventory filtering for add item search excluding already added items
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

    // Add item to order locally & save backend
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
            await orderServicesPort.post(
                `/${clientId}/order_items/update?order_id=${orderId}`,
                cleanedItems,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
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

    // Toggle edit mode
    const toggleEdit = (orderId) => {
        if (addingOrderId && addingOrderId !== orderId) setAddingOrderId(null);
        setEditOrderId((prev) => (prev === orderId ? null : orderId));
    };

    // Update item quantity locally
    const updateItemQuantity = (orderId, itemId, newQty) => {
        setOrders((prev) =>
            prev.map((o) => {
                if (o.id !== orderId) return o;
                const updatedItems = o.items.map((item) =>
                    item.item_id === itemId ? { ...item, quantity: newQty < 1 ? 1 : newQty } : item
                );
                return { ...o, items: updatedItems };
            })
        );
    };

    // Update item status locally
    const updateItemStatus = (orderId, itemId, newStatus) => {
        setOrders((prev) =>
            prev.map((o) => {
                if (o.id !== orderId) return o;
                const updatedItems = o.items.map((item) =>
                    item.item_id === itemId ? { ...item, status: newStatus } : item
                );
                return { ...o, items: updatedItems };
            })
        );
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


    // Delete item from backend and local state
    const deleteItemFromOrder = async (orderId, itemId) => {
        // Find the item id in order with backend id reference
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;

        const item = order.items.find((i) => i.item_id === itemId);
        if (!item) return;

        if (!item.id) {
            // Item may not have 'id' if newly added and unsaved - remove locally
            setOrders((prev) =>
                prev.map((o) => {
                    if (o.id !== orderId) return o;
                    return { ...o, items: o.items.filter((i) => i.item_id !== itemId) };
                })
            );
            toast.success("Item removed locally");
            return;
        }

        try {
            // Delete from backend
            await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
                params: { order_item_id: item.id, client_id: clientId },
                headers: { Authorization: `Bearer ${token}` },
            });

            // Remove locally
            setOrders((prev) =>
                prev.map((o) => {
                    if (o.id !== orderId) return o;
                    const updatedItems = o.items.filter((i) => i.item_id !== itemId);
                    // Update total price locally reflects immediately
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
        }
    };

    // Save order items and updated total price to backend
    const saveOrderItems = async (order) => {
        try {
            // Prepare cleaned items (remove any transient properties)
            const cleanedItems = order.items.map((item) => ({
                item_id: item.item_id,
                item_name: item.item_name,
                quantity: item.quantity,
                status: item.status || "new",
                note: item.note || "",
                slug: item.slug || "",
                price: item.price || inventoryMap[item.item_id]?.price || 0,
                client_id: clientId,
                order_id: order.id,
            }));

            await orderServicesPort.post(
                `/${clientId}/order_items/update?order_id=${order.id}`,
                cleanedItems,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const totalPrice = cleanedItems.reduce(
                (acc, i) => acc + (i.price || 0) * (i.quantity || 1),
                0
            );

            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: order.id, total_price: totalPrice },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            // Update local total price as well
            setOrders((prev) =>
                prev.map((o) => (o.id === order.id ? { ...o, total_price: totalPrice } : o))
            );

            toast.success("Order items saved");
            setEditOrderId(null);
            setAddingOrderId(null);
        } catch {
            toast.error("Failed to save order items");
        }
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

    // Order status buttons
    const statusButtons = ["pending", "preparing", "served"];

    // Update order status backend and state
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            // Update order status and items status in backend
            // First get current order to modify its items
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            // Update all items if order status is "served"
            const updatedItems =
                newStatus === "served"
                    ? order.items.map(item => ({ ...item, status: "served" }))
                    : order.items;

            const cleanedItems = updatedItems.map(item => ({
                item_id: item.item_id,
                item_name: item.item_name,
                quantity: item.quantity,
                status: item.status || "new",
                note: item.note || "",
                slug: item.slug || "",
                price: item.price || inventoryMap[item.item_id]?.price || 0,
                client_id: clientId,
                order_id: orderId,
            }));

            const totalPrice = cleanedItems.reduce(
                (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
                0
            );

            // Save updated items with their statuses
            await orderServicesPort.post(
                `/${clientId}/order_items/update?order_id=${orderId}`,
                cleanedItems,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update overall order status and total price
            await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                { id: orderId, status: newStatus, total_price: totalPrice },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state accordingly
            setOrders(prev =>
                prev.map(o =>
                    o.id === orderId
                        ? { ...o, status: newStatus, items: updatedItems, total_price: totalPrice }
                        : o
                )
            );

            // toast.success("Order and item statuses updated");

            // Exit edit/add modes if served
            if (newStatus === "served") {
                if (editOrderId === orderId) setEditOrderId(null);
                if (addingOrderId === orderId) setAddingOrderId(null);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update order status");
        }
    };


    // Delete order confirmation and delete
    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
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

    return (
        <div className="KDS-Container">
            <>
                <div className={`kds-page ${darkMode ? "theme-dark" : "theme-light"}`}>
                    {loading ? (
                        <div className="loading">Loading orders...</div>
                    ) : (
                        <div className="kds-grid">
                            {orders.map((order) => {
                                const isEditing = editOrderId === order.id;
                                const isAdding = addingOrderId === order.id;
                                return (
                                    <div key={order.id} className={`kds-card ${cardColors(order)}`}>
                                        <div className="kds-card-header" style={{ display: "flex", justifyContent: "space-between" }}>
                                            <div className="left-header" style={{ display: "flex", alignItems: "center" }}>
                                                {/* <button
                                                className="delete-icon"
                                                title="Delete Order"
                                                onClick={() => {
                                                    setOrderToDelete(order.id);
                                                    setShowDeleteModal(true);
                                                }}
                                            >
                                                <FaTrash />
                                            </button> */}
                                                <span className="table-text" style={{ marginLeft: "10px" }}>
                                                    {tablesMap[order.table_id] || order.table_number || order.customer_name || "N/A"}
                                                </span>
                                            </div>
                                            {/* <div className="right-header" style={{ gap: "10px", display: "flex" }}>
                                            <button className="edit-btn" onClick={() => toggleEdit(order.id)}>
                                                {isEditing ? "Cancel Edit" : "Edit"}
                                            </button>
                                            {!isAdding && !isEditing && (
                                                <button className="add-item-btn" onClick={() => setAddingOrderId(order.id)}>
                                                    + Add item
                                                </button>
                                            )}
                                            {(isAdding || isEditing) && (
                                                <button className="save-btn" onClick={() => updateOrderItems(order.id, order.items)}>
                                                    Save
                                                </button>
                                            )}
                                        </div> */}
                                        </div>
                                        <div className="kds-card-body">
                                            {order.items.map((item, index) => (
                                                <div
                                                    key={item.item_id || index}
                                                    className="item-row"
                                                    style={{ alignItems: "center", cursor: isEditing ? "pointer" : "default" }}
                                                >
                                                    <div className="item-name" style={{ flex: 1 }}>
                                                        {isEditing ? (
                                                            <input
                                                                value={item.item_name}
                                                                onChange={(e) => updateItemName(order.id, item.item_id, e.target.value)}
                                                            />
                                                        ) : (
                                                            `${item.quantity}x ${item.item_name || "Unnamed Item"}`
                                                        )}
                                                    </div>
                                                    {order.status !== "served" && (
                                                        <div
                                                            className="status-icons"
                                                            style={{ display: "flex", gap: "8px", marginLeft: "12px" }}
                                                        >
                                                            {item.status === "served" ? (
                                                                <FaCheckCircle
                                                                    className="served-status spin"
                                                                    title="Served"
                                                                    color="green"
                                                                    style={{ cursor: "default" }}
                                                                />
                                                            ) : (
                                                                <>
                                                                    <FaClock
                                                                        className={`pending-status ${item.status === "pending" ? "spin" : ""}`}
                                                                        title="Pending"
                                                                        color={item.status === "pending" ? "blue" : "grey"}
                                                                        style={{ cursor: "pointer" }}
                                                                        onClick={() => handleItemStatusChange(order.id, item.item_id, "pending")}
                                                                    />
                                                                    <FaHourglassHalf
                                                                        className={`preparing-status ${item.status === "preparing" ? "spin" : ""}`}
                                                                        title="Preparing"
                                                                        color={item.status === "preparing" ? "orange" : "grey"}
                                                                        style={{ cursor: "pointer" }}
                                                                        onClick={() => handleItemStatusChange(order.id, item.item_id, "preparing")}
                                                                    />
                                                                    <FaCheckCircle
                                                                        className={`served-status ${item.status === "served" ? "spin" : ""}`}
                                                                        title="Served"
                                                                        color={item.status === "served" ? "green" : "grey"}
                                                                        style={{ cursor: "pointer" }}
                                                                        onClick={() => handleItemStatusChange(order.id, item.item_id, "served")}
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {(isEditing || isAdding) && (
                                                        <>
                                                            {/* <div className="quantity-controls">
                                                                <button
                                                                    onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity - 1)}
                                                                    disabled={item.quantity <= 1}
                                                                >
                                                                    −
                                                                </button>
                                                                <span style={{ margin: "0 6px" }}>{item.quantity}</span>
                                                                <button onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity + 1)}>+</button>
                                                            </div> */}
                                                            <div
                                                                className="status-icons"
                                                                style={{ display: "flex", gap: "8px", marginLeft: "12px" }}
                                                            >
                                                                <FaClock
                                                                    title="Pending"
                                                                    color={item.status === "pending" ? "blue" : "grey"}
                                                                    style={{ cursor: "pointer" }}
                                                                    onClick={() => handleItemStatusChange(order.id, item.item_id, "pending")}
                                                                />
                                                                <FaHourglassHalf
                                                                    title="Preparing"
                                                                    color={item.status === "preparing" ? "orange" : "grey"}
                                                                    style={{ cursor: "pointer" }}
                                                                    onClick={() => handleItemStatusChange(order.id, item.item_id, "preparing")}
                                                                />
                                                                <FaCheckCircle
                                                                    title="Served"
                                                                    color={item.status === "served" ? "green" : "grey"}
                                                                    style={{ cursor: "pointer" }}
                                                                    onClick={() => handleItemStatusChange(order.id, item.item_id, "served")}
                                                                />
                                                            </div>
                                                            {/* <button
                                                                className="delete-item-btn"
                                                                onClick={() => {
                                                                    setDeleteItemTarget({ orderId: order.id, itemId: item.item_id });
                                                                    setShowDeleteItemModal(true);
                                                                }}
                                                                title="Delete Item"
                                                                style={{ marginLeft: "12px", color: "red", cursor: "pointer" }}
                                                            >
                                                                <FaTrash />
                                                            </button> */}
                                                        </>
                                                    )}
                                                    {!isEditing && !isAdding && (
                                                        <div className="item-measure" style={{ marginLeft: "12px" }}>
                                                            {item.measure || ""}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {isAdding && (
                                                <div style={{ marginTop: "12px" }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Search inventory items to add..."
                                                        value={itemSearchQuery}
                                                        onChange={(e) => setItemSearchQuery(e.target.value)}
                                                        style={{ width: "100%", padding: "6px" }}
                                                    />
                                                    {itemSearchResults.length > 0 && (
                                                        <ul
                                                            style={{ maxHeight: "150px", overflowY: "auto", marginTop: "6px" }}
                                                        >
                                                            {itemSearchResults.map((item) => (
                                                                <li
                                                                    key={item.id}
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        padding: "4px",
                                                                        borderBottom: "1px solid #ddd",
                                                                    }}
                                                                    onClick={() => addItemToOrder(order.id, item)}
                                                                >
                                                                    {item.name} - ₹{item.price}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {!isAdding && !isEditing && order.status !== "served" && (
                                            <div className="kds-card-footer">
                                                {order.status === "new" && (
                                                    <button
                                                        className="btn pending"
                                                        onClick={() => handleStatusChange(order.id, "pending")}
                                                    >
                                                        New
                                                    </button>
                                                )}
                                                {order.status === "pending" && (
                                                    <button
                                                        className="btn preparing"
                                                        onClick={() => handleStatusChange(order.id, "preparing")}
                                                    >
                                                        Preparing!!!
                                                    </button>
                                                )}
                                                {order.status === "preparing" && (
                                                    <button
                                                        className="btn served"
                                                        onClick={() => {
                                                            handleStatusChange(order.id, "preparing");

                                                            // Dispatch custom event with order and table info
                                                            const collectEvent = new CustomEvent("orderCollect", {
                                                                detail: {
                                                                    tableName: tablesMap[order.table_id] || order.table_number || "Unknown Table",
                                                                    orderId: order.id,
                                                                },
                                                            });
                                                            window.dispatchEvent(collectEvent);
                                                        }}
                                                    >
                                                        Order Ready!!!
                                                    </button>

                                                )}
                                            </div>
                                        )}

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Delete order confirmation modal */}
                {showDeleteModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <p>Delete this order?</p>
                            <button onClick={confirmDeleteOrder} className="btn yes">
                                Yes
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setOrderToDelete(null);
                                }}
                                className="btn no"
                            >
                                No
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete item confirmation modal */}
                {showDeleteItemModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <p>Delete this item?</p>
                            <button
                                className="btn yes"
                                onClick={async () => {
                                    if (deleteItemTarget.orderId && deleteItemTarget.itemId) {
                                        try {
                                            await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
                                                params: { order_item_id: deleteItemTarget.itemId, client_id: clientId },
                                                headers: { Authorization: `Bearer ${token}` },
                                            });
                                            setOrders((prev) =>
                                                prev.map((o) => {
                                                    if (o.id !== deleteItemTarget.orderId) return o;
                                                    const updatedItems = o.items.filter(
                                                        (i) => i.item_id !== deleteItemTarget.itemId
                                                    );
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
                                className="btn no"
                                onClick={() => {
                                    setShowDeleteItemModal(false);
                                    setDeleteItemTarget({ orderId: null, itemId: null });
                                }}
                            >
                                No
                            </button>
                        </div>
                    </div>
                )}
            </>
        </div>
    );
};

export default KitchenDisplay;






// ============================================================================== //
// ============================================================================== //
// ============================================================================== //
// ============================================================================== //
// ============================================================================== //
// ============================================================================== //
// ============================================================================== //

// import React, { useEffect, useState } from "react";
// import orderServicesPort from "../../../Backend_Port_Files/OrderServices";
// import tableServicesPort from "../../../Backend_Port_Files/TableServices";
// import inventoryServicesPort from "../../../Backend_Port_Files/InventoryServices";
// import { useParams } from "react-router-dom";
// import { useTheme } from "../../../ThemeChangerComponent/ThemeProvider";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { FaTrash, FaCheckCircle, FaClock, FaHourglassHalf } from "react-icons/fa";

// const KitchenDisplay = () => {
//     const { clientId } = useParams();
//     const token = localStorage.getItem("access_token");
//     const { darkMode } = useTheme();

//     const [orders, setOrders] = useState([]);
//     const [tablesMap, setTablesMap] = useState({});
//     const [inventoryItems, setInventoryItems] = useState([]);
//     const [inventoryMap, setInventoryMap] = useState({});
//     const [loading, setLoading] = useState(true);

//     const [editOrderId, setEditOrderId] = useState(null);
//     const [addingOrderId, setAddingOrderId] = useState(null);

//     const [showDeleteModal, setShowDeleteModal] = useState(false);
//     const [orderToDelete, setOrderToDelete] = useState(null);

//     const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
//     const [deleteItemTarget, setDeleteItemTarget] = useState({ orderId: null, itemId: null });

//     const [itemSearchQuery, setItemSearchQuery] = useState("");
//     const [itemSearchResults, setItemSearchResults] = useState([]);

//     // Fetch tables
//     useEffect(() => {
//         if (!token || !clientId) return;

//         tableServicesPort
//             .get(`/${clientId}/tables/read`, {
//                 headers: { Authorization: `Bearer ${token}` },
//             })
//             .then((res) => {
//                 const map = {};
//                 (res.data?.data || []).forEach((t) => (map[t.id] = t.name));
//                 setTablesMap(map);
//             })
//             .catch(() => toast.error("Failed to fetch tables"));
//     }, [clientId, token]);

//     // Fetch inventory items
//     useEffect(() => {
//         if (!token || !clientId) return;

//         inventoryServicesPort
//             .get(`/${clientId}/inventory/read`, {
//                 headers: { Authorization: `Bearer ${token}` },
//             })
//             .then((res) => {
//                 setInventoryItems(res.data?.data || []);
//                 const map = {};
//                 (res.data?.data || []).forEach((item) => {
//                     map[item.id] = item;
//                 });
//                 setInventoryMap(map);
//             })
//             .catch(() => toast.error("Failed to fetch inventory items"));
//     }, [clientId, token]);

//     // Fetch today's orders
//     useEffect(() => {
//         const fetchOrders = async () => {
//             if (!token || !clientId) {
//                 setLoading(false);
//                 return;
//             }
//             try {
//                 const res = await orderServicesPort.get(`/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 const allOrders = res.data?.data || [];
//                 const todayString = new Date().toISOString().split("T")[0];
//                 const todayOrders = allOrders.filter(order => {
//                     const day = new Date(order.created_at || order.createdAt);
//                     return day.toISOString().split("T")[0] === todayString;
//                 });
//                 setOrders(allOrders);

//             } catch {
//                 toast.error("Failed to fetch orders");
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchOrders();
//         const interval = setInterval(fetchOrders, 10000);
//         return () => clearInterval(interval);
//     }, [clientId, token]);

//     // Inventory filtering for add item search excluding already added items
//     useEffect(() => {
//         if (!addingOrderId) {
//             setItemSearchResults([]);
//             setItemSearchQuery("");
//             return;
//         }
//         const currentOrder = orders.find((o) => o.id === addingOrderId);
//         if (!currentOrder) {
//             setItemSearchResults([]);
//             return;
//         }
//         const orderedIds = new Set(currentOrder.items.map((i) => i.item_id));
//         const filtered = inventoryItems
//             .filter((item) => item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
//             .filter((item) => !orderedIds.has(item.id));
//         setItemSearchResults(filtered);
//     }, [itemSearchQuery, addingOrderId, inventoryItems, orders]);

//     // Add item to order locally & save backend
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
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${orderId}`,
//                 cleanedItems,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
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

//     // Toggle edit mode
//     const toggleEdit = (orderId) => {
//         if (addingOrderId && addingOrderId !== orderId) setAddingOrderId(null);
//         setEditOrderId((prev) => (prev === orderId ? null : orderId));
//     };

//     // Update item quantity locally
//     const updateItemQuantity = (orderId, itemId, newQty) => {
//         setOrders((prev) =>
//             prev.map((o) => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map((item) =>
//                     item.item_id === itemId ? { ...item, quantity: newQty < 1 ? 1 : newQty } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
//     };

//     // Update item status locally
//     const updateItemStatus = (orderId, itemId, newStatus) => {
//         setOrders((prev) =>
//             prev.map((o) => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map((item) =>
//                     item.item_id === itemId ? { ...item, status: newStatus } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
//     };
//     const getNextStatus = (currentStatus) => {
//         switch (currentStatus) {
//             case "new": return "pending";
//             case "pending": return "preparing";
//             case "preparing": return "collect"; // custom final status before collection
//             default: return currentStatus;
//         }
//     };

//     const handleItemStatusChange = async (orderId, itemId) => {
//         try {
//             const order = orders.find(o => o.id === orderId);
//             if (!order) {
//                 toast.error("Order not found in state");
//                 return;
//             }

//             const updatedItems = order.items.map(item => {
//                 if (item.item_id === itemId) {
//                     if (item.status === "served") return item; // Don't change if already served
//                     const newStatus = getNextStatus(item.status);
//                     return { ...item, status: newStatus };
//                 }
//                 return item;
//             });

//             const itemsForUpdate = updatedItems.map(({ id, ...rest }) => rest);

//             const totalPrice = updatedItems.reduce((sum, item) =>
//                 sum + (inventoryMap[item.item_id]?.price || 0) * (item.quantity || 1),
//                 0);

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

//             setOrders(prev =>
//                 prev.map(o =>
//                     o.id === orderId ? { ...o, items: updatedItems, total_price: totalPrice } : o
//                 )
//             );

//             // Show the collect notification when status changes to "collect"
//             updatedItems.forEach(item => {
//                 if (item.item_id === itemId && item.status === "collect") {
//                     const collectEvent = new CustomEvent("orderCollect", {
//                         detail: {
//                             tableName: tablesMap[order.table_id] || order.table_number || "Unknown Table",
//                             orderId: orderId,
//                         },
//                     });
//                     window.dispatchEvent(collectEvent);
//                 }
//             });

//             toast.success("Item status updated");
//         } catch (err) {
//             console.error(err);
//             toast.error("Failed to update item status");
//         }
//     };

//     // Update item name locally
//     const updateItemName = (orderId, itemId, newName) => {
//         setOrders((prev) =>
//             prev.map((o) => {
//                 if (o.id !== orderId) return o;
//                 const updatedItems = o.items.map((item) =>
//                     item.item_id === itemId ? { ...item, item_name: newName } : item
//                 );
//                 return { ...o, items: updatedItems };
//             })
//         );
//     };
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


//     // Delete item from backend and local state
//     const deleteItemFromOrder = async (orderId, itemId) => {
//         // Find the item id in order with backend id reference
//         const order = orders.find((o) => o.id === orderId);
//         if (!order) return;

//         const item = order.items.find((i) => i.item_id === itemId);
//         if (!item) return;

//         if (!item.id) {
//             // Item may not have 'id' if newly added and unsaved - remove locally
//             setOrders((prev) =>
//                 prev.map((o) => {
//                     if (o.id !== orderId) return o;
//                     return { ...o, items: o.items.filter((i) => i.item_id !== itemId) };
//                 })
//             );
//             toast.success("Item removed locally");
//             return;
//         }

//         try {
//             // Delete from backend
//             await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
//                 params: { order_item_id: item.id, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });

//             // Remove locally
//             setOrders((prev) =>
//                 prev.map((o) => {
//                     if (o.id !== orderId) return o;
//                     const updatedItems = o.items.filter((i) => i.item_id !== itemId);
//                     // Update total price locally reflects immediately
//                     const newTotal = updatedItems.reduce(
//                         (sum, i) => sum + (i.price || 0) * (i.quantity || 1),
//                         0
//                     );
//                     return { ...o, items: updatedItems, total_price: newTotal };
//                 })
//             );

//             toast.success("Item deleted");
//         } catch {
//             toast.error("Failed to delete item");
//         }
//     };

//     // Save order items and updated total price to backend
//     const saveOrderItems = async (order) => {
//         try {
//             // Prepare cleaned items (remove any transient properties)
//             const cleanedItems = order.items.map((item) => ({
//                 item_id: item.item_id,
//                 item_name: item.item_name,
//                 quantity: item.quantity,
//                 status: item.status || "new",
//                 note: item.note || "",
//                 slug: item.slug || "",
//                 price: item.price || inventoryMap[item.item_id]?.price || 0,
//                 client_id: clientId,
//                 order_id: order.id,
//             }));

//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${order.id}`,
//                 cleanedItems,
//                 {
//                     headers: { Authorization: `Bearer ${token}` },
//                 }
//             );

//             const totalPrice = cleanedItems.reduce(
//                 (acc, i) => acc + (i.price || 0) * (i.quantity || 1),
//                 0
//             );

//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: order.id, total_price: totalPrice },
//                 {
//                     headers: { Authorization: `Bearer ${token}` },
//                 }
//             );

//             // Update local total price as well
//             setOrders((prev) =>
//                 prev.map((o) => (o.id === order.id ? { ...o, total_price: totalPrice } : o))
//             );

//             toast.success("Order items saved");
//             setEditOrderId(null);
//             setAddingOrderId(null);
//         } catch {
//             toast.error("Failed to save order items");
//         }
//     };

//     // Card color helper
//     const cardColors = (order) => {
//         if (order.table_number === "07") return "orange";
//         if (order.type?.toLowerCase() === "take waay") {
//             if (order.customer_name?.toLowerCase().includes("walk") && order.order_id === 428) return "green-light";
//             else return "blue";
//         }
//         if (order.table_number === "12" || order.table_number === "01") return "red";
//         if (order.table_number === "06") return "green-dark";
//         return "default";
//     };

//     // Order status buttons
//     const statusButtons = ["pending", "preparing", "served"];

//     // Update order status backend and state
//     const handleStatusChange = async (orderId, newStatus) => {
//         try {
//             // Update order status and items status in backend
//             // First get current order to modify its items
//             const order = orders.find(o => o.id === orderId);
//             if (!order) return;

//             // Update all items if order status is "served"
//             const updatedItems =
//                 newStatus === "served"
//                     ? order.items.map(item => ({ ...item, status: "served" }))
//                     : order.items;

//             const cleanedItems = updatedItems.map(item => ({
//                 item_id: item.item_id,
//                 item_name: item.item_name,
//                 quantity: item.quantity,
//                 status: item.status || "new",
//                 note: item.note || "",
//                 slug: item.slug || "",
//                 price: item.price || inventoryMap[item.item_id]?.price || 0,
//                 client_id: clientId,
//                 order_id: orderId,
//             }));

//             const totalPrice = cleanedItems.reduce(
//                 (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
//                 0
//             );

//             // Save updated items with their statuses
//             await orderServicesPort.post(
//                 `/${clientId}/order_items/update?order_id=${orderId}`,
//                 cleanedItems,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             // Update overall order status and total price
//             await orderServicesPort.post(
//                 `/${clientId}/dinein/update`,
//                 { id: orderId, status: newStatus, total_price: totalPrice },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             // Update local state accordingly
//             setOrders(prev =>
//                 prev.map(o =>
//                     o.id === orderId
//                         ? { ...o, status: newStatus, items: updatedItems, total_price: totalPrice }
//                         : o
//                 )
//             );

//             toast.success("Order and item statuses updated");

//             // Exit edit/add modes if served
//             if (newStatus === "served") {
//                 if (editOrderId === orderId) setEditOrderId(null);
//                 if (addingOrderId === orderId) setAddingOrderId(null);
//             }
//         } catch (err) {
//             console.error(err);
//             toast.error("Failed to update order status");
//         }
//     };


//     // Delete order confirmation and delete
//     const confirmDeleteOrder = async () => {
//         if (!orderToDelete) return;
//         try {
//             await orderServicesPort.delete(`/${clientId}/dinein/delete`, {
//                 params: { dinein_order_id: orderToDelete, client_id: clientId },
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
//             toast.success("Order deleted");
//         } catch {
//             toast.error("Failed to delete order");
//         } finally {
//             setShowDeleteModal(false);
//             setOrderToDelete(null);
//         }
//     };

//     return (
//         <div className="KDS-Container">
//             <>
//                 <div className={`kds-page ${darkMode ? "theme-dark" : "theme-light"}`}>
//                     {loading ? (
//                         <div className="loading">Loading orders...</div>
//                     ) : (
//                         <div className="kds-grid">
//                             {orders.map((order) => {
//                                 const isEditing = editOrderId === order.id;
//                                 const isAdding = addingOrderId === order.id;
//                                 return (
//                                     <div key={order.id} className={`kds-card ${cardColors(order)}`}>
//                                         <div className="kds-card-header" style={{ display: "flex", justifyContent: "space-between" }}>
//                                             <div className="left-header" style={{ display: "flex", alignItems: "center" }}>
//                                                 {/* <button
//                                                 className="delete-icon"
//                                                 title="Delete Order"
//                                                 onClick={() => {
//                                                     setOrderToDelete(order.id);
//                                                     setShowDeleteModal(true);
//                                                 }}
//                                             >
//                                                 <FaTrash />
//                                             </button> */}
//                                                 <span className="table-text" style={{ marginLeft: "10px" }}>
//                                                     {tablesMap[order.table_id] || order.table_number || order.customer_name || "N/A"}
//                                                 </span>
//                                             </div>
//                                             {/* <div className="right-header" style={{ gap: "10px", display: "flex" }}>
//                                             <button className="edit-btn" onClick={() => toggleEdit(order.id)}>
//                                                 {isEditing ? "Cancel Edit" : "Edit"}
//                                             </button>
//                                             {!isAdding && !isEditing && (
//                                                 <button className="add-item-btn" onClick={() => setAddingOrderId(order.id)}>
//                                                     + Add item
//                                                 </button>
//                                             )}
//                                             {(isAdding || isEditing) && (
//                                                 <button className="save-btn" onClick={() => updateOrderItems(order.id, order.items)}>
//                                                     Save
//                                                 </button>
//                                             )}
//                                         </div> */}
//                                         </div>
//                                         <div className="kds-card-body">
//                                             {order.items.map((item, index) => (
//                                                 <div
//                                                     key={item.item_id || index}
//                                                     className="item-row"
//                                                     style={{ alignItems: "center", cursor: isEditing ? "pointer" : "default" }}
//                                                 >
//                                                     <div className="item-name" style={{ flex: 1 }}>
//                                                         {isEditing ? (
//                                                             <input
//                                                                 value={item.item_name}
//                                                                 onChange={(e) => updateItemName(order.id, item.item_id, e.target.value)}
//                                                             />
//                                                         ) : (
//                                                             `${item.quantity}x ${item.item_name || "Unnamed Item"}`
//                                                         )}
//                                                     </div>
//                                                     {order.status !== "served" && (
//                                                         <div
//                                                             className="status-icons"
//                                                             style={{ display: "flex", gap: "8px", marginLeft: "12px" }}
//                                                         >
//                                                             {item.status === "served" ? (
//                                                                 <FaCheckCircle
//                                                                     className="served-status spin"
//                                                                     title="Served"
//                                                                     color="green"
//                                                                     style={{ cursor: "default" }}
//                                                                 />
//                                                             ) : (
//                                                                 <>
//                                                                     <FaClock
//                                                                         className={`pending-status ${item.status === "pending" ? "spin" : ""}`}
//                                                                         title="Pending"
//                                                                         color={item.status === "pending" ? "blue" : "grey"}
//                                                                         style={{ cursor: "pointer" }}
//                                                                         onClick={() => handleItemStatusChange(order.id, item.item_id, "pending")}
//                                                                     />
//                                                                     <FaHourglassHalf
//                                                                         className={`preparing-status ${item.status === "preparing" ? "spin" : ""}`}
//                                                                         title="Preparing"
//                                                                         color={item.status === "preparing" ? "orange" : "grey"}
//                                                                         style={{ cursor: "pointer" }}
//                                                                         onClick={() => handleItemStatusChange(order.id, item.item_id, "preparing")}
//                                                                     />
//                                                                     <FaCheckCircle
//                                                                         className={`served-status ${item.status === "served" ? "spin" : ""}`}
//                                                                         title="Served"
//                                                                         color={item.status === "served" ? "green" : "grey"}
//                                                                         style={{ cursor: "pointer" }}
//                                                                         onClick={() => handleItemStatusChange(order.id, item.item_id, "served")}
//                                                                     />
//                                                                 </>
//                                                             )}
//                                                         </div>
//                                                     )}

//                                                     {(isEditing || isAdding) && (
//                                                         <>
//                                                             {/* <div className="quantity-controls">
//                                                                 <button
//                                                                     onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity - 1)}
//                                                                     disabled={item.quantity <= 1}
//                                                                 >
//                                                                     −
//                                                                 </button>
//                                                                 <span style={{ margin: "0 6px" }}>{item.quantity}</span>
//                                                                 <button onClick={() => updateItemQuantity(order.id, item.item_id, item.quantity + 1)}>+</button>
//                                                             </div> */}
//                                                             <div
//                                                                 className="status-icons"
//                                                                 style={{ display: "flex", gap: "8px", marginLeft: "12px" }}
//                                                             >
//                                                                 <FaClock
//                                                                     title="Pending"
//                                                                     color={item.status === "pending" ? "blue" : "grey"}
//                                                                     style={{ cursor: "pointer" }}
//                                                                     onClick={() => handleItemStatusChange(order.id, item.item_id, "pending")}
//                                                                 />
//                                                                 <FaHourglassHalf
//                                                                     title="Preparing"
//                                                                     color={item.status === "preparing" ? "orange" : "grey"}
//                                                                     style={{ cursor: "pointer" }}
//                                                                     onClick={() => handleItemStatusChange(order.id, item.item_id, "preparing")}
//                                                                 />
//                                                                 <FaCheckCircle
//                                                                     title="Served"
//                                                                     color={item.status === "served" ? "green" : "grey"}
//                                                                     style={{ cursor: "pointer" }}
//                                                                     onClick={() => handleItemStatusChange(order.id, item.item_id, "served")}
//                                                                 />
//                                                             </div>
//                                                             {/* <button
//                                                                 className="delete-item-btn"
//                                                                 onClick={() => {
//                                                                     setDeleteItemTarget({ orderId: order.id, itemId: item.item_id });
//                                                                     setShowDeleteItemModal(true);
//                                                                 }}
//                                                                 title="Delete Item"
//                                                                 style={{ marginLeft: "12px", color: "red", cursor: "pointer" }}
//                                                             >
//                                                                 <FaTrash />
//                                                             </button> */}
//                                                         </>
//                                                     )}
//                                                     {!isEditing && !isAdding && (
//                                                         <div className="item-measure" style={{ marginLeft: "12px" }}>
//                                                             {item.measure || ""}
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             ))}
//                                             {isAdding && (
//                                                 <div style={{ marginTop: "12px" }}>
//                                                     <input
//                                                         type="text"
//                                                         placeholder="Search inventory items to add..."
//                                                         value={itemSearchQuery}
//                                                         onChange={(e) => setItemSearchQuery(e.target.value)}
//                                                         style={{ width: "100%", padding: "6px" }}
//                                                     />
//                                                     {itemSearchResults.length > 0 && (
//                                                         <ul style={{ maxHeight: "150px", overflowY: "auto", marginTop: "6px" }}>
//                                                             {itemSearchResults.map((item) => (
//                                                                 <li
//                                                                     key={item.id}
//                                                                     style={{
//                                                                         cursor: "pointer",
//                                                                         padding: "4px",
//                                                                         borderBottom: "1px solid #ddd",
//                                                                     }}
//                                                                     onClick={() => handleItemStatusChange(order.id, item.id)} // no status here
//                                                                 >
//                                                                     {item.name} - ₹{item.price}
//                                                                 </li>
//                                                             ))}
//                                                         </ul>
//                                                     )}

//                                                 </div>
//                                             )}
//                                         </div>
//                                         {!isAdding && !isEditing && order.status !== "served" && (
//                                             <div className="kds-card-footer">
//                                                 {order.status === "new" && (
//                                                     <button
//                                                         className="btn pending"
//                                                         onClick={() => handleStatusChange(order.id, "pending")}
//                                                     >
//                                                         New
//                                                     </button>
//                                                 )}
//                                                 {order.status === "pending" && (
//                                                     <button
//                                                         className="btn preparing"
//                                                         onClick={() => handleStatusChange(order.id, "preparing")}
//                                                     >
//                                                         Preparing!!!
//                                                     </button>
//                                                 )}
//                                                 {order.status === "preparing" && (
//                                                     <button
//                                                         className="btn preparing"
//                                                         onClick={() => {
//                                                             handleStatusChange(order.id, "preparing");

//                                                             // Dispatch custom event with order and table info
//                                                             const collectEvent = new CustomEvent("orderCollect", {
//                                                                 detail: {
//                                                                     tableName: tablesMap[order.table_id] || order.table_number || "Unknown Table",
//                                                                     orderId: order.id,
//                                                                 },
//                                                             });
//                                                             window.dispatchEvent(collectEvent);
//                                                         }}
//                                                     >
//                                                         Order Ready!!!
//                                                     </button>

//                                                 )}
//                                             </div>
//                                         )}

//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     )}
//                 </div>

//                 {/* Delete order confirmation modal */}
//                 {showDeleteModal && (
//                     <div className="modal-overlay">
//                         <div className="modal">
//                             <p>Delete this order?</p>
//                             <button onClick={confirmDeleteOrder} className="btn yes">
//                                 Yes
//                             </button>
//                             <button
//                                 onClick={() => {
//                                     setShowDeleteModal(false);
//                                     setOrderToDelete(null);
//                                 }}
//                                 className="btn no"
//                             >
//                                 No
//                             </button>
//                         </div>
//                     </div>
//                 )}

//                 {/* Delete item confirmation modal */}
//                 {showDeleteItemModal && (
//                     <div className="modal-overlay">
//                         <div className="modal">
//                             <p>Delete this item?</p>
//                             <button
//                                 className="btn yes"
//                                 onClick={async () => {
//                                     if (deleteItemTarget.orderId && deleteItemTarget.itemId) {
//                                         try {
//                                             await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
//                                                 params: { order_item_id: deleteItemTarget.itemId, client_id: clientId },
//                                                 headers: { Authorization: `Bearer ${token}` },
//                                             });
//                                             setOrders((prev) =>
//                                                 prev.map((o) => {
//                                                     if (o.id !== deleteItemTarget.orderId) return o;
//                                                     const updatedItems = o.items.filter(
//                                                         (i) => i.item_id !== deleteItemTarget.itemId
//                                                     );
//                                                     const newTotal = updatedItems.reduce(
//                                                         (sum, i) => sum + (i.price || 0) * (i.quantity || 1),
//                                                         0
//                                                     );
//                                                     return { ...o, items: updatedItems, total_price: newTotal };
//                                                 })
//                                             );
//                                             toast.success("Item deleted");
//                                         } catch {
//                                             toast.error("Failed to delete item");
//                                         } finally {
//                                             setShowDeleteItemModal(false);
//                                             setDeleteItemTarget({ orderId: null, itemId: null });
//                                         }
//                                     }
//                                 }}
//                             >
//                                 Yes
//                             </button>
//                             <button
//                                 className="btn no"
//                                 onClick={() => {
//                                     setShowDeleteItemModal(false);
//                                     setDeleteItemTarget({ orderId: null, itemId: null });
//                                 }}
//                             >
//                                 No
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </>
//         </div>
//     );
// };

// export default KitchenDisplay;


