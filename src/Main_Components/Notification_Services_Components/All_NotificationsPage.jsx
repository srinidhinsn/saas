
import React, { useState } from "react";
import { CiSearch } from "react-icons/ci";

// Sample notification data for table display
const notificationsTable = [
    {
        id: 1,
        starred: false,
        read: false,
        message: "Your order is ready...come and pick it up!!!",
        time: "Just Now",
        date: "Just Now",
    },
    {
        id: 2467,
        starred: true,
        read: false,
        message: "New orders updated...!",
        time: "30 menit ago",
        date: "30 menit ago",
    },
    {
        id: 34364,
        starred: false,
        read: true,
        message: "New Tables created by the admin!!!",
        time: "Morning",
        date: "Morning",
    },
    {
        id: 16578,
        starred: false,
        read: false,
        message: "Your order is ready...come and pick it up!!!",
        time: "Just Now",
        date: "Just Now",
    },
    {
        id: 2547,
        starred: true,
        read: false,
        message: "New orders updated...!",
        time: "30 menit ago",
        date: "30 menit ago",
    },
    {
        id: 354646,
        starred: false,
        read: true,
        message: "New Tables created by the admin!!!",
        time: "Morning",
        date: "Morning",
    },
    {
        id: 16786,
        starred: false,
        read: false,
        message: "Your order is ready...come and pick it up!!!",
        time: "Just Now",
        date: "Just Now",
    },
    {
        id: 2567,
        starred: true,
        read: false,
        message: "New orders updated...!",
        time: "30 menit ago",
        date: "30 menit ago",
    },
    {
        id: 33545,
        starred: false,
        read: true,
        message: "New Tables created by the admin!!!",
        time: "Morning",
        date: "Morning",
    },
    {
        id: 11213,
        starred: false,
        read: false,
        message: "Your order is ready...come and pick it up!!!",
        time: "Just Now",
        date: "Just Now",
    },
    {
        id: 2221,
        starred: true,
        read: false,
        message: "New orders updated...!",
        time: "30 menit ago",
        date: "30 menit ago",
    },
    {
        id: 1111,
        starred: false,
        read: true,
        message: "New Tables created by the admin!!!",
        time: "Morning",
        date: "Morning",
    },
    {
        id: 11213,
        starred: false,
        read: false,
        message: "Your order is ready...come and pick it up!!!",
        time: "Just Now",
        date: "Just Now",
    },
    {
        id: 2221,
        starred: true,
        read: false,
        message: "New orders updated...!",
        time: "30 menit ago",
        date: "30 menit ago",
    },
    {
        id: 1111,
        starred: false,
        read: true,
        message: "New Tables created by the admin!!!",
        time: "Morning",
        date: "Morning",
    },
    {
        id: 11213,
        starred: false,
        read: false,
        message: "Your order is ready...come and pick it up!!!",
        time: "Just Now",
        date: "Just Now",
    },
    {
        id: 2221,
        starred: true,
        read: false,
        message: "New orders updated...!",
        time: "30 menit ago",
        date: "30 menit ago",
    },
    {
        id: 1111,
        starred: false,
        read: true,
        message: "New Tables created by the admin!!!",
        time: "Morning",
        date: "Morning",
    },
    {
        id: 11213,
        starred: false,
        read: false,
        message: "Your order is ready...come and pick it up!!!",
        time: "Just Now",
        date: "Just Now",
    },
    {
        id: 2221,
        starred: true,
        read: false,
        message: "New orders updated...!",
        time: "30 menit ago",
        date: "30 menit ago",
    },
    {
        id: 1111,
        starred: false,
        read: true,
        message: "New Tables created by the admin!!!",
        time: "Morning",
        date: "Morning",
    },
    {
        id: 11213,
        starred: false,
        read: false,
        message: "Your order is ready...come and pick it up!!!",
        time: "Just Now",
        date: "Just Now",
    },
    {
        id: 2221,
        starred: true,
        read: false,
        message: "New orders updated...!",
        time: "30 menit ago",
        date: "30 menit ago",
    },
    {
        id: 1111,
        starred: false,
        read: true,
        message: "Hello Shanmugam develop Team, This is a reminder to achieve this month's sales target. Currently, we've...",
        time: "Morning",
        date: "Morning",
    },

    // Add additional mock notifications as needed...
];

export default function NotificationTable() {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");

    // Filtering logic (simple demo)
    const filtered = notificationsTable.filter(n =>
        n.message.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="Notification-Page-Container">
            <div className="notiflayout-bg">
                <div className="notiflayout-panel">
                    <div className="notiflayout-toolbar">
                        <h2>List Notification</h2>
                        <span className="notiflayout-toolbar-count">188 Notification</span>
                        <div className="notiflayout-search">
                            <input
                                type="text"
                                placeholder="Search by Name Product"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <span className="notiflayout-search-icon"> <CiSearch /> </span>
                        </div>
                    </div>
                    <div className="notiflayout-tabs">
                        <div className={`notiflayout-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
                            <span className="notiflayout-tab-badge">20</span> All
                        </div>
                        <div className={`notiflayout-tab ${tab === "archive" ? "active" : ""}`} onClick={() => setTab("archive")}>
                            Recent
                        </div>
                        <div className={`notiflayout-tab ${tab === "favorite" ? "active" : ""}`} onClick={() => setTab("favorite")}>
                            Pending Orders
                        </div>
                    </div>
                    <div className="notiflayout-table">
                        {filtered.map((n, idx) => (
                            <div
                                key={n.id}
                                className={`notiflayout-row ${!n.read ? "unread" : ""}`}
                            >
                                {/* <span className="notiflayout-row-star">{n.starred ? "★" : "☆"}</span> */}
                                <span className="notiflayout-row-message">{n.message}</span>
                                <span className="notiflayout-row-time">{n.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
