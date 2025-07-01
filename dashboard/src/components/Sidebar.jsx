import React from "react";
import { useNavigate } from "react-router-dom";
import '../App.css'

function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar" style={{ width: "250px", padding: "20px" }}>
      <h2>Dashboard</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li onClick={() => navigate("profile")}>Profile</li>
        <li onClick={() => navigate("services")}>Services</li>
        <li onClick={() => navigate("database")}>Database Management</li>
        <li onClick={() => navigate("clients")}>Manage Client Services</li>
      </ul>
    </aside>
  );
}

export default Sidebar;
