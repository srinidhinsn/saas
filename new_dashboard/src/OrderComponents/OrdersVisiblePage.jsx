import React, { useEffect, useState } from "react";
import { useTheme } from "../ThemeChangerComponent/ThemeContext";
import api from '../PortExportingPage/api'

const OrdersVisiblePage = ({ externalOrders }) => {
    const [orders, setOrders] = useState([]);
    const { darkMode } = useTheme();
    const clientId = localStorage.getItem("clientId");

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await api.get(`/${clientId}/kds/orders`);
                setOrders(res.data);
            } catch (error) {
                console.error("Failed to fetch orders:", error);
            }
        };
        fetchOrders();
    }, [clientId]);


    // Apply theme to <body> using data-theme attribute
    useEffect(() => {
        document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    return (
        <div className="orders-dashboard">
            <div className="orders-container">
                <div className="orders-header">
                    <h2>Orders</h2>
                    <div className="actions">
                        <button className="btn export">Export</button>
                        <button className="btn create">Create Order</button>
                    </div>
                </div>

                <div className="orders-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Payment</th>
                                <th>Total</th>
                                <th>Delivery</th>
                                <th>Items</th>
                                <th>Fulfillment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, i) => (
                                <tr key={i}>
                                    <td>#{i + 1}</td>
                                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td>{order.customer_name || "N/A"}</td>
                                    <td>
                                        <span className={`pill ${order.payment_status === "Success" ? "success" : "pending"}`}>
                                            {order.payment_status || "Pending"}
                                        </span>
                                    </td>
                                    <td>${order.total || "0.00"}</td>
                                    <td>{order.delivery || "N/A"}</td>
                                    <td>{order.items.length} items</td>
                                    <td>
                                        <span className={`pill ${order.fulfilled ? "fulfilled" : "unfulfilled"}`}>
                                            {order.fulfilled ? "Fulfilled" : "Unfulfilled"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrdersVisiblePage;
