import React, { useEffect, useState } from "react";
import axios from "axios";
import orderServicesPort from "../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
import { useParams } from "react-router-dom";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


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

    // --------------------------------------------------------------------------- //

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
            const response = await orderServicesPort.post(
                `/${clientId}/dinein/update`,
                {
                    id: orderId,
                    client_id: clientId,
                    status: newStatus,
                    // invoice_status: newStatus === "served" ? "paid" : undefined,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("Item status updated");

            // if (newStatus === "served") {
            //     await axios.post(
            //         `http://localhost:8003/saas/${clientId}/dinein/update`,
            //         {
            //             order_id: orderId,
            //             invoice_status: "paid",
            //         },
            //         {
            //             headers: {
            //                 Authorization: `Bearer ${token}`,
            //             },
            //         }
            //     );
            // }
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? {
                            ...o,
                            status: newStatus,
                            items: o.items.map(item => ({ ...item, status: newStatus === 'served' ? 'served' : item.status }))
                        }
                        : o
                )
            );

        } catch (err) {
            const msg = err?.response?.data?.detail || "❌ Failed to update order status.";
            console.error(msg, err);
            toast.error(msg);

        }
    };

    // --------------------------------------------------------------------------- //
    const handleItemStatusChange = async (orderId, itemId, newStatus) => {
        try {
            await orderServicesPort.post(`/${clientId}/dinein/item/update`, {
                order_id: orderId,
                item_id: itemId,
                status: newStatus
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });

            setOrders((prev) =>
                prev.map((order) =>
                    order.id === orderId
                        ? {
                            ...order,
                            items: order.items.map((item) =>
                                item.item_id === itemId ? { ...item, status: newStatus } : item
                            ),
                        }
                        : order
                )
            );
        } catch (err) {
            console.error("❌ Failed to update item status", err);
        }
    };

    // --------------------------------------------------------------------------- //
    const cancelItem = async (orderId, itemId) => {
        const order = orders.find(o => o.id === orderId);
        const item = order?.items.find(i => i.item_id === itemId);
        if (!item?.id) return;

        try {
            await orderServicesPort.delete(`/${clientId}/order_item/delete`, {
                params: { order_item_id: item.id },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            // Update state
            setOrders((prevOrders) => {
                return prevOrders.reduce((acc, o) => {
                    if (o.id !== orderId) {
                        acc.push(o);
                        return acc;
                    }

                    const updatedItems = o.items.map((item) =>
                        item.item_id === itemId ? { ...item, status: "cancelled" } : item
                    );

                    const allCancelled = updatedItems.every(item => item.status === "cancelled");

                    if (!allCancelled) {
                        acc.push({ ...o, items: updatedItems });
                    } else {
                        toast.info("All items in the order are cancelled. Order removed.");
                    }

                    return acc;
                }, []);
            });
        } catch (err) {
            const msg = err?.response?.data?.detail || "❌ Failed to cancel item.";
            console.error(msg, err);
            toast.error(msg);
        }
    };


    //-------------------------------------------------- //
    const updateOrderItems = async (orderId, items) => {
        let updatedTotal = 0;
        items.forEach(item => {
            const price = inventoryMap[item.item_id]?.price || 0;
            updatedTotal += item.quantity * price;
        });

        try {
            const response = await orderServicesPort.post(
                `/${clientId}/order_items/update?order_id=${orderId}`,
                items.map(item => ({
                    item_id: item.item_id,
                    quantity: item.quantity,
                    client_id: clientId,
                    order_id: orderId,
                    status: item.status || "new",
                })),
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            toast.success("Order items updated");

            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? { ...o, items, total_price: updatedTotal }
                        : o
                )
            );
        } catch (error) {
            const msg = error?.response?.data?.detail || "❌ Failed to update order items.";
            console.error(msg, error);
            toast.error(msg);
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

    return (
        <div className="orders-page">
            <div className="orders-container">
                <div className="orders-header">
                    <h2>Table Orders</h2>
                    <div className="orders-actions">
                        <button className="btn export">Export</button>
                        <button className="btn create">Create Order</button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Loading orders...</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Table</th>
                                    <th>Items</th>
                                    <th>Total</th>

                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="no-orders">No orders found.</td>
                                    </tr>
                                ) : (
                                    orders.map((order, index) => (
                                        <React.Fragment key={order.id || index}>
                                            <tr className="order-row">
                                                <td data-label="#"> {index + 1} </td>
                                                <td data-label="Table">{tablesMap[order.table_id] || order.table_id}</td>
                                                <td>{order.items.length} items</td>
                                                <td data-label="Total"> ₹{parseFloat(order.total_price || 0).toFixed(2)} </td>
                                                <td data-label="Status" className={`status ${order.status?.toLowerCase()}`}>  {order.status}  </td>
                                                <td data-label="Date"> {new Date(order.created_at).toLocaleDateString()} </td>
                                                <td data-label="Action">
                                                    <button className="btn toggle" onClick={() => toggleExpand(index)} >
                                                        {expandedOrderIndex === index ? "Hide" : "View"}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedOrderIndex === index && (
                                                <tr>
                                                    <td colSpan="7" className="expanded-order-row">
                                                        <div className="modern-order-details-container">
                                                            <div className="modern-order-status-controls">
                                                                <button
                                                                    className="modern-order-delete-button"
                                                                    onClick={() => {
                                                                        console.log("Clicked delete for", order.id);
                                                                        setOrderToDelete(order.id);
                                                                        setShowDeleteModal(true);
                                                                    }}
                                                                >
                                                                    Delete Order
                                                                </button>

                                                                {["pending", "preparing", "served"].map((status) => (
                                                                    <button
                                                                        key={status}
                                                                        className={`modern-status-toggle-button ${order.status === status ? "modern-active-status" : ""}`}
                                                                        onClick={() => handleStatusChange(order.id, status)}
                                                                        disabled={order.status === "served"}
                                                                    >
                                                                        {status}
                                                                    </button>
                                                                ))}

                                                                <button
                                                                    className="modern-order-edit-button"
                                                                    onClick={() => setEditOrderId(prev => prev === order.id ? null : order.id)}
                                                                >
                                                                    {editOrderId === order.id ? 'Cancel Edit' : 'Edit'}
                                                                </button>
                                                            </div>

                                                            <div className="modern-items-table-wrapper">
                                                                <table className="modern-items-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Item(s)</th>
                                                                            <th>Quantity</th>
                                                                            <th>Status</th>
                                                                            <th>Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {order.items?.map((item, idx) => (
                                                                            <tr key={idx}>
                                                                                <td data-label="Item(s)">
                                                                                    {item.item_name || item.item_id}
                                                                                </td>

                                                                                <td data-label="Quantity">
                                                                                    {editOrderId === order.id ? (
                                                                                        <div className="modern-qty-edit-controls">
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
                                                                                </td>

                                                                                <td data-label="Status">
                                                                                    <span className={`modern-item-status-tag ${item.status}`}>
                                                                                        {item.status}
                                                                                    </span>
                                                                                </td>

                                                                                <td data-label="Actions">
                                                                                    {["new", "preparing", "served"].map((status) => (
                                                                                        <button
                                                                                            key={status}
                                                                                            className={`modern-item-action-button ${item.status === status ? "modern-active-status" : ""}`}
                                                                                            onClick={() => handleItemStatusChange(order.id, item.item_id, status)}
                                                                                            disabled={item.status === "served" || item.status === "cancelled"}
                                                                                        >
                                                                                            {status}
                                                                                        </button>
                                                                                    ))}

                                                                                    {editOrderId === order.id && (
                                                                                        <button
                                                                                            className="modern-item-delete-button"
                                                                                            onClick={() => {
                                                                                                setDeleteTarget({ orderId: order.id, itemId: item.item_id });
                                                                                                setShowDeleteModals(true);
                                                                                            }}
                                                                                            disabled={item.status === "cancelled"}
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                    <tfoot>
                                                                        <tr>
                                                                            <td colSpan="4" style={{ textAlign: "right" }}>
                                                                                <button
                                                                                    className="modern-save-items-button"
                                                                                    onClick={() => updateOrderItems(order.id, order.items)}
                                                                                >
                                                                                    Save Items
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>



                                            )}

                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {showDeleteModals && deleteTarget && (
                            <div className="delete-modal-overlay">
                                <div className="delete-modal-box">
                                    <p>Are you sure you want to delete this item?</p>
                                    <div className="delete-modal-buttons">
                                        <button
                                            className="confirm-delete-btn"
                                            onClick={() => {
                                                cancelItem(deleteTarget.orderId, deleteTarget.itemId);
                                                setShowDeleteModals(false);
                                                setDeleteTarget({ orderId: null, itemId: null });
                                            }}
                                        >
                                            Yes, Delete
                                        </button>
                                        <button
                                            className="cancel-delete-btn"
                                            onClick={() => {
                                                setShowDeleteModals(false);
                                                setDeleteTarget({ orderId: null, itemId: null });
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}


                {showDeleteModal && (
                    <div className="delete-modal-overlay">
                        <div className="delete-modal">
                            <h3>Delete this order?</h3>
                            <div className="modal-buttons">
                                <button className="yes" onClick={confirmDeleteOrder}>Yes</button>
                                <button className="no" onClick={() => {
                                    setShowDeleteModal(false);
                                    setOrderToDelete(null);
                                }}>No</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
};

export default OrdersVisiblePage;




// import React from 'react'
// import { CiSearch } from "react-icons/ci";
// import { CiBellOn } from "react-icons/ci";
// import { BiExport } from "react-icons/bi"; import { CiCalendarDate } from "react-icons/ci";
// import { LiaFileExportSolid } from "react-icons/lia"; import { TbDotsVertical } from "react-icons/tb";
// import { RiExpandUpDownLine } from "react-icons/ri";
// import { TbMessage } from "react-icons/tb";
// import '../App.css'
// const OrdersVisiblePage = () => {
//     return (

//         <>
//             <div>

//                 <div className="">
//                     <div className="Order-Summary-Page">
//                         {/* Search bar */}
//                         <div className="Search-bar-container">
//                             <div className='Search-input'> <CiSearch className='React-search-icon' />    <input type="text" placeholder='Search' /></div>
//                             <div className='React-bell-icon'><CiBellOn /></div>
//                         </div>
//                         {/* Buttons */}
//                         <div className="">
//                             <div className="">
//                                 <h3>Orders</h3>
//                             </div>
//                             <div className="">
//                                 <div>
//                                     <BiExport />
//                                     <button>Export</button></div>

//                                 <div><LiaFileExportSolid />
//                                     <button>Create Order</button>
//                                 </div>
//                             </div>
//                         </div>
//                         {/* calendar */}
//                         <div className="">
//                             <div>
//                                 <CiCalendarDate />
//                                 <input type="date" />
//                             </div>
//                         </div>

//                         {/* Containers */}
//                         <div className="">
//                             {/* Total  */}
//                             <div className="">

//                             </div>
//                             {/* New */}
//                             <div className=""></div>
//                             {/* Pending */}
//                             <div className=""></div>
//                             {/* Served */}
//                             <div className=""></div>
//                         </div>
//                         {/* Order summary */}
//                         <table>
//                             <thead>
//                                 <tr>
//                                     <th>Order No</th>
//                                     <th>Date<RiExpandUpDownLine /></th>
//                                     <th>Items</th>
//                                     <th>Status</th>
//                                     <th>Total</th>
//                                     <th>Action</th>
//                                 </tr>
//                                 <tr>
//                                     <td>1</td>
//                                     <td> today</td>
//                                     <td>10</td>
//                                     <td>pending</td>
//                                     <td>550</td>
//                                     <td> <TbMessage /> <TbDotsVertical /></td>
//                                 </tr>
//                             </thead>
//                         </table>
//                     </div>
//                 </div>

//             </div>



//         </>

//     )
// }

// export default OrdersVisiblePage
