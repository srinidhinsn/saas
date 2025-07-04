import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../ThemeChangerComponent/ThemeContext";
import api from '../PortExportingPage/api'

const KitchenDisplay = () => {
    const { darkMode, toggleTheme } = useTheme();
    const [clientId] = useState(() => localStorage.getItem("clientId") || "");
    const [orders, setOrders] = useState([]);
    const [itemStatus, setItemStatus] = useState({});
    const [timers, setTimers] = useState({});
    const navigate = useNavigate();

    const getPrepTime = (itemName) => {
        const lower = itemName.toLowerCase();
        if (["biryani", "meals"].some(d => lower.includes(d))) return 5 * 60;
        if (["pizza", "burger", "juice", "fresh"].some(d => lower.includes(d))) return 10 * 60;
        return 7 * 60;
    };
    const fetchOrders = async () => {
        try {
            const res = await api.get(`/${clientId}/kds/orders`);
            const data = res.data;
            const now = Date.now();

            const status = {};
            const newTimers = {};

            data.forEach(order => {
                if (!order.created_at) {
                    order.created_at = now;
                }

                status[order.order_id] = order.items.map(() => false);

                newTimers[order.order_id] = order.items.map(item => ({
                    start: now,
                    duration: getPrepTime(item.name),
                    remaining: getPrepTime(item.name),
                }));
            });

            setOrders(data);
            setItemStatus(status);
            setTimers(newTimers);
        } catch (err) {
            console.error("Failed to fetch KDS orders", err);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [clientId]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimers(prev => {
                const updated = { ...prev };
                for (let orderId in updated) {
                    updated[orderId] = updated[orderId].map(t => {
                        const elapsed = Math.floor((Date.now() - t.start) / 1000);
                        const remaining = Math.max(t.duration - elapsed, 0);
                        return { ...t, remaining };
                    });
                }
                return updated;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const toggleItemStatus = (orderId, index) => {
        setItemStatus(prev => ({
            ...prev,
            [orderId]: prev[orderId].map((val, i) => (i === index ? !val : val)),
        }));
    };

    const isOrderComplete = (orderId) => {
        return itemStatus[orderId]?.every(status => status);
    };

    const serveOrder = async (orderId) => {
        try {
            const res = await fetch(`http://localhost:8000/api/v1/${clientId}/orders/${orderId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "served" }),
            });

            if (!res.ok) throw new Error("Failed to update order status");

            setOrders(prev => prev.filter(order => order.order_id !== orderId));
            setItemStatus(prev => {
                const updated = { ...prev };
                delete updated[orderId];
                return updated;
            });
            setTimers(prev => {
                const updated = { ...prev };
                delete updated[orderId];
                return updated;
            });
        } catch (err) {
            console.error("❌ Error serving order:", err);
        }
    };

    return (
        <div className={`kds-page ${darkMode ? "theme-dark" : "theme-light"}`}>
            <div className="kds-header">
                <div className="status-box open">Open: {orders.length}</div>
                <div className="status-box done">Done: 0</div>
                <div className="status-box hold">Hold: 0</div>
                <button className="theme-toggle" onClick={toggleTheme}>
                    {darkMode ? "☀️ Light" : "🌙 Dark"}
                </button>
            </div>

            <div className="kds-grid">
                {orders.map((order) => {
                    const table = order.table_number || order.table_no || order.order_id;
                    const items = order.items.map((item, index) => ({
                        ...item,
                        orderId: order.order_id,
                        index,
                        created_at: order.created_at,
                    }));

                    return (
                        <div className="kds-card" key={order.order_id}>
                            <div className="kds-card-header">
                                <div className="order-id">Table: {table}</div>
                                <div className="customer-name">{order.customer_name}</div>
                                <div className="time">
                                    Placed: {new Date(order.created_at).toLocaleTimeString()}
                                </div>
                            </div>

                            <div className="kds-card-body">
                                <div className="order-type">{order.type}</div>
                                <ul className="items-list">
                                    {items.map((item) => {
                                        const timer = timers[item.orderId]?.[item.index];
                                        const mins = Math.floor((timer?.remaining ?? 0) / 60);
                                        const secs = (timer?.remaining ?? 0) % 60;

                                        return (
                                            <li
                                                key={`${item.orderId}-${item.index}`}
                                                className={itemStatus[item.orderId]?.[item.index] ? "completed" : ""}
                                                onClick={() => toggleItemStatus(item.orderId, item.index)}
                                            >
                                                <div className="item-left">
                                                    {item.qty} × <b>{item.name}</b>{" "}
                                                    {item.note && <em>({item.note})</em>}
                                                </div>
                                                <div className="item-right">
                                                    <span
                                                        className={`status-pill ${itemStatus[item.orderId]?.[item.index]
                                                            ? "done"
                                                            : "pending"
                                                            }`}
                                                    >
                                                        {itemStatus[item.orderId]?.[item.index]
                                                            ? "✔"
                                                            : `${mins}:${secs.toString().padStart(2, "0")}`}
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="kds-card-footer">
                                <button
                                    className="serve-btn"
                                    disabled={!isOrderComplete(order.order_id)}
                                    onClick={() => serveOrder(order.order_id)}
                                >
                                    Serve
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KitchenDisplay;
