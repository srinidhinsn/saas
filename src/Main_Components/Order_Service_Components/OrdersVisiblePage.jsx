import React, { useEffect, useState } from "react";
import axios from "axios";
import orderServicesPort from "../../Backend_Port_Files/OrderServices";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
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


    //Theme Effect(dark & light theme)
    useEffect(() => {
        document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

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


    //Expands/collapses the details for a particular order
    const toggleExpand = (index) => {
        setExpandedOrderIndex(index === expandedOrderIndex ? null : index);
    };


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
                    o.id === orderId ? { ...o, status: newStatus } : o
                )
            );
        } catch (err) {
            const msg = err?.response?.data?.detail || "❌ Failed to update order status.";
            console.error(msg, err);
            toast.error(msg);

        }
    };
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

            setOrders((prev) =>
                prev.map((order) =>
                    order.id === orderId
                        ? {
                            ...order,
                            items: order.items.map((item) =>
                                item.item_id === itemId ? { ...item, status: "cancelled" } : item
                            ),
                        }
                        : order
                )
            );
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
                                                    <td colSpan="7" className="order-details">
                                                        <div className="details-wrapper">
                                                            <div className="status-buttons">
                                                                <button
                                                                    className="btn delete"
                                                                    onClick={() => {
                                                                        console.log("Clicked delete for", order.id);
                                                                        setOrderToDelete(order.id);
                                                                        setShowDeleteModal(true);
                                                                    }} > Delete Order
                                                                </button>

                                                                {["pending", "preparing", "served"].map((status) => (
                                                                    <button
                                                                        key={status}
                                                                        className={`btn status-change ${order.status === status ? "active" : ""}`}
                                                                        onClick={() => handleStatusChange(order.id, status)}
                                                                        disabled={order.status === "served"}
                                                                    >
                                                                        {status}
                                                                    </button>
                                                                ))}

                                                            </div>
                                                            <table className="items-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Item(s)</th>
                                                                        {/* <th>Order ID</th> */}
                                                                        {/* <th>Table</th> */}
                                                                        <th>Quantity</th>
                                                                        <th>Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {order.items?.map((item, idx) => (

                                                                        <tr key={idx}>
                                                                            <td data-label="Item(s)">{item.item_name || item.item_id}</td>

                                                                            {/* <td data-label="Order ID">{item?.order_id ?? order.id}</td> */}
                                                                            {/* <td data-label="Table">{tablesMap[order.table_id] || order.table_id}</td> */}
                                                                            <td data-label="Quantity">
                                                                                <input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    value={item.quantity}
                                                                                    onChange={(e) => {
                                                                                        const newQty = parseInt(e.target.value);
                                                                                        const currentOrderId = order.id;

                                                                                        setOrders((prev) =>
                                                                                            prev.map((o) => {
                                                                                                if (o.id !== currentOrderId) return o;

                                                                                                const updatedItems = o.items.map((it) =>
                                                                                                    it.item_id === item.item_id
                                                                                                        ? { ...it, quantity: newQty }
                                                                                                        : it
                                                                                                );

                                                                                                const newTotal = updatedItems.reduce((sum, it) => {
                                                                                                    const price = inventoryMap[it.item_id]?.price || 0;
                                                                                                    return sum + price * it.quantity;
                                                                                                }, 0);

                                                                                                return {
                                                                                                    ...o,
                                                                                                    items: updatedItems,
                                                                                                    total_price: newTotal,
                                                                                                };
                                                                                            })
                                                                                        );
                                                                                    }}


                                                                                    style={{ width: "50px" }}
                                                                                />
                                                                            </td>

                                                                            <td data-label="Status">
                                                                                <span className={`tag ${item.status}`}>{item.status}</span>
                                                                            </td>


                                                                            <td data-label="Actions">

                                                                                {["new", "preparing", "served"].map((status) => (
                                                                                    <button
                                                                                        key={status}
                                                                                        className={`btn-sm ${item.status === status ? "active" : ""}`}
                                                                                        onClick={() => handleItemStatusChange(order.id, item.item_id, status)}
                                                                                        disabled={item.status === "served" || item.status === "cancelled"}
                                                                                    >
                                                                                        {status}
                                                                                    </button>
                                                                                ))}
                                                                                <button
                                                                                    className="btn-sm cancel"
                                                                                    onClick={() => cancelItem(order.id, item.item_id)}
                                                                                    disabled={item.status === "cancelled"}
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </td>
                                                                        </tr>

                                                                    ))}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr>
                                                                        <td colSpan="5" style={{ textAlign: "right" }}>
                                                                            <button
                                                                                className="btn save-items"
                                                                                onClick={() => updateOrderItems(order.id, order.items)}
                                                                            >
                                                                                Save Items
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
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
