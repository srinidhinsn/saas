import React from "react";
import "../App.css";

const getStatusColor = (status) => {
    switch (status) {
        case "Open":
            return "header-blue";
        case "Hold":
            return "header-yellow";
        case "Done":
            return "header-green";
        default:
            return "header-blue";
    }
};

const OrderCard = ({ order, onStatusChange }) => {
    const { order_id, customer_name, order_time, elapsed_time, order_type, items, status } = order;
    const headerClass = getStatusColor(status);

    return (
        <div className="order-card">
            <div className={`order-card-header ${headerClass}`}>
                <div className="order-id">{order_id}</div>
                <div className="customer-name">{customer_name}</div>
                <div className="order-time">{order_time} <strong>{elapsed_time}</strong></div>
            </div>

            <div className="order-body">
                <div className="order-type">{order_type}</div>
                <ul>
                    {items.map((item, i) => (
                        <li key={i}>
                            {item.quantity} × <strong>{item.name}</strong>
                            {item.note && <span> - {item.note}</span>}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="order-footer">
                <button className="btn done" onClick={() => onStatusChange(order_id, "Done")}>Done</button>
                <button className="btn hold" onClick={() => onStatusChange(order_id, "Hold")}>Hold</button>
            </div>
        </div>
    );
};

export default OrderCard;
