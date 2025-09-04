// import React, { useState } from "react";

// const initialNotifications = [
//     {
//         id: 1,
//         type: "ready",
//         orderId: "ORD-006",
//         table: "Table 7",
//         message: "ORD-006 is ready for pickup",
//         time: "12:55 PM",
//         items: ["Pasta Primavera", "Garlic Bread"]
//     }
// ];

// export default function NotificationPanel() {
//     const [notifications, setNotifications] = useState(initialNotifications);
//     const [isOpen, setIsOpen] = useState(false);

//     const openPanel = () => setIsOpen(true);
//     const closePanel = () => setIsOpen(false);

//     const removeNotification = (id) => {
//         setNotifications(notifications.filter(n => n.id !== id));
//     };

//     const clearAll = () => setNotifications([]);

//     return (
//         <div>
//             {/* Floating Button */}
//             <div className="fixed-btn">
//                 <button className="notification-btn" onClick={openPanel}>
//                     <span role="img" aria-label="bell" style={{ fontSize: 18 }}>🔔</span>
//                     <span className="notification-btn-text">Notifications</span>
//                     <div className="notification-badge">{notifications.length}</div>
//                 </button>
//             </div>
//             {/* Overlay */}
//             <div className={`overlays${isOpen ? "" : " hidden"}`} onClick={closePanel}></div>
//             {/* Panel */}
//             <div className={`notification-panel${isOpen ? " expanded" : " minimized"}`}>
//                 <div className="panel-header">
//                     <div>
//                         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                             <span role="img" aria-label="bell" style={{ fontSize: 22 }}>🔔</span>
//                             <span className="panel-title">Order Notifications</span>
//                         </div>
//                         <p className="panel-desc">Real-time order updates</p>
//                     </div>
//                     <button className="panel-close" onClick={closePanel}>✖</button>
//                 </div>
//                 <div className="panel-body">
//                     {notifications.length === 0 ? (
//                         <div className="panel-empty">
//                             <div className="empty-icon">🔕</div>
//                             <h3>No notifications</h3>
//                             <p>All orders are up to date!</p>
//                         </div>
//                     ) : (
//                         <div className="notifications-list">
//                             {notifications.map(n => (
//                                 <div key={n.id} className="notification-item">
//                                     <div className="notification-item-icon">
//                                         {n.type === "ready" ? "🔔" : "✅"}
//                                     </div>
//                                     <div className="notification-item-content">
//                                         <div className="notification-item-row">
//                                             <span className="notification-order">{n.orderId}</span>
//                                             <span className="notification-time">{n.time}</span>
//                                         </div>
//                                         <div className="notification-table">
//                                             {n.table} • {n.message}
//                                         </div>
//                                         <div className="notification-items">
//                                             {n.items.slice(0, 2).join(", ")}
//                                             {n.items.length > 2 && ` +${n.items.length - 2} more`}
//                                         </div>
//                                     </div>
//                                     <button className="notification-remove" onClick={() => removeNotification(n.id)}>✖</button>
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                 </div>
//                 <div className="panel-footer">
//                     <button className="clear-btn" onClick={clearAll}>
//                         Clear all notifications
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }



// =================================================================================================================================== //
// =================================================================================================================================== //
// =================================================================================================================================== //

import React, { useState, useEffect } from "react";

// Sample notification data structure
const sampleNotifications = [
    {
        id: 1,
        type: "order",
        title: "Order A01 Created",
        description: "New order placed by table 4.",
        timestamp: "2025-09-03T12:34:00Z",
        details: "Order A01 details: 2 x Apple Juice. Status: Created.",
    },
    {
        id: 2,
        type: "table",
        title: "Table A02 Reserved",
        description: "Table 5 was reserved for 8:00 PM.",
        timestamp: "2025-09-03T11:00:00Z",
        details: "Reservation by Shanmugam for 5 people at 8:00 PM.",
    },
    {
        id: 3,
        type: "menu",
        title: "New Menu Item Added",
        description: "Added 'South Indian Meals' to the main menu.",
        timestamp: "2025-09-03T10:15:00Z",
        details:
            "'South Indian Meals' added..",
    },
    // Add more notifications here
];

const NotificationIcon = ({ type }) => {
    switch (type) {
        case "order":
            return <span className="icon order"></span>;
        case "table":
            return <span className="icon table"></span>;
        case "menu":
            return <span className="icon menu"></span>;
        default:
            return <span className="icon">🔔</span>;
    }
};

export default function Notifications() {
    const [notifications, setNotifications] = useState(sampleNotifications);
    const [selectedId, setSelectedId] = useState(null);
    const [searchKey, setSearchKey] = useState("");

    // Filter notifications based on search input
    const filtered = notifications.filter((n) =>
        n.title.toLowerCase().includes(searchKey.toLowerCase()) ||
        n.description.toLowerCase().includes(searchKey.toLowerCase())
    );

    const selectedNotification = notifications.find((n) => n.id === selectedId);

    // Helper: format timestamp to readable form
    const formatDate = (isoString) => {
        const dt = new Date(isoString);
        return dt.toLocaleString();
    };

    return (
        <div className="Notification-Page-Container">
            <div className="notifications-container">
                <aside className="notifications-sidebar">
                    <h2>Notifications</h2>
                    <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchKey}
                        onChange={(e) => setSearchKey(e.target.value)}
                        className="search-input"
                    />
                    <ul className="notification-list">
                        {filtered.length === 0 && <li className="no-results">No notifications</li>}
                        {filtered.map(({ id, type, title, description, timestamp }) => (
                            <li
                                key={id}
                                className={`notification-item ${id === selectedId ? "selected" : ""}`}
                                onClick={() => setSelectedId(id)}
                            >
                                <NotificationIcon type={type} />
                                <div className="notification-text">
                                    <div className="notification-title">{title}</div>
                                    <div className="notification-desc">{description}</div>
                                    <div className="notification-time">{formatDate(timestamp)}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </aside>
                <main className="notification-details">
                    {selectedNotification ? (
                        <>
                            <div className="detail-header">
                                <h3>{selectedNotification.title}</h3>
                                <button onClick={() => setSelectedId(null)} className="close-btn">
                                    ✖
                                </button>
                            </div>
                            <p>{selectedNotification.details}</p>
                        </>
                    ) : (
                        <div className="no-selection">Select a notification to see details</div>
                    )}
                </main>
            </div>
        </div>
    );
}

