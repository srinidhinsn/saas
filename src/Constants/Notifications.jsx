import React, { useState } from "react";

const initialNotifications = [
    {
        id: 1,
        type: "ready",
        orderId: "ORD-006",
        table: "Table 7",
        message: "ORD-006 is ready for pickup",
        time: "12:55 PM",
        items: ["Pasta Primavera", "Garlic Bread"]
    }
];

export default function NotificationPanel() {
    const [notifications, setNotifications] = useState(initialNotifications);
    const [isOpen, setIsOpen] = useState(false);

    const openPanel = () => setIsOpen(true);
    const closePanel = () => setIsOpen(false);

    const removeNotification = (id) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const clearAll = () => setNotifications([]);

    return (
        <div>
            {/* Floating Button */}
            <div className="fixed-btn">
                <button className="notification-btn" onClick={openPanel}>
                    <span role="img" aria-label="bell" style={{ fontSize: 18 }}>🔔</span>
                    <span className="notification-btn-text">Notifications</span>
                    <div className="notification-badge">{notifications.length}</div>
                </button>
            </div>
            {/* Overlay */}
            <div className={`overlays${isOpen ? "" : " hidden"}`} onClick={closePanel}></div>
            {/* Panel */}
            <div className={`notification-panel${isOpen ? " expanded" : " minimized"}`}>
                <div className="panel-header">
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span role="img" aria-label="bell" style={{ fontSize: 22 }}>🔔</span>
                            <span className="panel-title">Order Notifications</span>
                        </div>
                        <p className="panel-desc">Real-time order updates</p>
                    </div>
                    <button className="panel-close" onClick={closePanel}>✖</button>
                </div>
                <div className="panel-body">
                    {notifications.length === 0 ? (
                        <div className="panel-empty">
                            <div className="empty-icon">🔕</div>
                            <h3>No notifications</h3>
                            <p>All orders are up to date!</p>
                        </div>
                    ) : (
                        <div className="notifications-list">
                            {notifications.map(n => (
                                <div key={n.id} className="notification-item">
                                    <div className="notification-item-icon">
                                        {n.type === "ready" ? "🔔" : "✅"}
                                    </div>
                                    <div className="notification-item-content">
                                        <div className="notification-item-row">
                                            <span className="notification-order">{n.orderId}</span>
                                            <span className="notification-time">{n.time}</span>
                                        </div>
                                        <div className="notification-table">
                                            {n.table} • {n.message}
                                        </div>
                                        <div className="notification-items">
                                            {n.items.slice(0, 2).join(", ")}
                                            {n.items.length > 2 && ` +${n.items.length - 2} more`}
                                        </div>
                                    </div>
                                    <button className="notification-remove" onClick={() => removeNotification(n.id)}>✖</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="panel-footer">
                    <button className="clear-btn" onClick={clearAll}>
                        Clear all notifications
                    </button>
                </div>
            </div>
        </div>
    );
}