import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/OrderSummary.css";

const OrderSummary = ({ clientId }) => {
    const [summaryData, setSummaryData] = useState({});

    useEffect(() => {
        if (!clientId) return;
        axios
            .get(`http://localhost:8000/api/v1/${clientId}/orders/summary`)
            .then((res) => setSummaryData(res.data))
            .catch((err) => console.error("Failed to fetch summary", err));
    }, [clientId]);

    // Transform data: group by date first, then tables
    const getDataGroupedByDate = () => {
        const groupedByDate = {};

        for (const [table, dates] of Object.entries(summaryData)) {
            for (const [date, orders] of Object.entries(dates)) {
                if (!groupedByDate[date]) {
                    groupedByDate[date] = {};
                }
                if (!groupedByDate[date][table]) {
                    groupedByDate[date][table] = [];
                }
                groupedByDate[date][table].push(...orders);
            }
        }

        return groupedByDate;
    };

    const groupedByDate = getDataGroupedByDate();

    return (
        <div className="order-summary-container">
            <h1>Order Summary</h1>

            {Object.keys(groupedByDate).length === 0 ? (
                <p>No orders available.</p>
            ) : (
                Object.entries(groupedByDate).map(([date, tables]) => (
                    <div key={date} className="summary-date-section">
                        <h2 className="date-heading">{date}</h2>
                        <div className="table-grid">
                            {Object.entries(tables).map(([table, orders]) => (
                                <div key={table} className="table-block">
                                    <h3 className="table-title">{table}</h3>
                                    <div className="order-card-grid">
                                        {orders.map((order) => (
                                            <div key={order.order_id} className="order-card">
                                                <div><strong>Order ID:</strong> {order.order_id}</div>
                                                <div>
                                                    <strong>Status:</strong>{" "}
                                                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <ul>
                                                    {order.items.map((item) => (
                                                        <li key={`${item.name}-${item.type}`}>
                                                            {item.name} × {item.quantity} ({item.type})
                                                        </li>
                                                    ))}
                                                </ul>

                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default OrderSummary;
