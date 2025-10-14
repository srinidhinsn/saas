import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function PopupNotification() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [bellShake, setBellShake] = useState(false);
    const nav = useNavigate();
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token")

    const openPanel = () => setIsOpen(true);
    const closePanel = () => setIsOpen(false);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const addNotification = (note) => {
        setNotifications(prev => [note, ...prev]);
        setBellShake(true);
        setIsOpen(true);
        setTimeout(() => setBellShake(false), 1000);
    };

    const clearAll = () => setNotifications([]);
    const notificationsPage = () => nav(`/saas/${clientId}/main/all-notifications`);

    return (
        <div>
            {/* Floating Button */}
            <div className="fixed-btn">
                <button
                    className={`notification-btn ${bellShake ? "shake" : ""}`}
                    onClick={openPanel}
                >
                    <span role="img" aria-label="bell" style={{ fontSize: 18 }}>🔔</span>
                    <span className="notification-btn-text">Notifications</span>
                    {notifications.length > 0 && (
                        <div className="notification-badge">{notifications.length}</div>
                    )}
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
                            <span className="panel-title">Notifications</span>
                        </div>
                        <p className="panel-desc">Real-time updates</p>
                    </div>
                    <button className="panel-close" onClick={closePanel}>✖</button>
                </div>

                <div className="panel-body">
                    {notifications.length === 0 ? (
                        <div className="panel-empty">
                            <div className="empty-icon">🔕</div>
                            <h3>No notifications</h3>
                            <p>Everything is up to date!</p>
                        </div>
                    ) : (
                        <div className="notifications-list">
                            {notifications.map(n => (
                                <div key={n.id} className="notification-item">
                                    <div className="notification-item-icon">🔔</div>
                                    <div className="notification-item-content">
                                        <div className="notification-item-row">
                                            <span className="notification-type">{n.type}</span>
                                            <span className="notification-time">{n.time}</span>
                                        </div>
                                        <div className="notification-message">
                                            {n.message}
                                        </div>
                                    </div>
                                    <button
                                        className="notification-remove"
                                        onClick={() => removeNotification(n.id)}
                                    >
                                        ✖
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="panel-footer">
                        <button className="clear-btn" onClick={notificationsPage}>
                            View All ...
                        </button>
                    </div>
                    <div className="panel-footer">
                        <button className="clear-btn" onClick={clearAll}>
                            Clear all notifications
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
