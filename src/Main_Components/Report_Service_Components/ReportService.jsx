import React, { useState, useEffect } from 'react'
import ClickSpark from '../../Sub_Components/SparkArrow'

const ReportService = () => {

    const [tableId, setTableId] = useState(null)
    useEffect(() => {
        if (tableId) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableId]);
    return (
        <div className='Report-Service-container'>

            <ClickSpark
                sparkColor='#fff'
                sparkSize={10}
                sparkRadius={15}
                sparkCount={8}
                duration={400}
            >
                Report Services
            </ClickSpark>
        </div>
    )
}

export default ReportService



// ====================================================================================================== //


// import React, { useState } from "react";

// const TableManagement = () => {
//     const [tables, setTables] = useState([
//         { id: 1, name: "Table 1", capacity: 4, status: "Available", location: "Main Floor", reservedBy: null },
//         { id: 2, name: "Table 2", capacity: 6, status: "Occupied", location: "Main Floor", reservedBy: "John Smith" },
//         { id: 3, name: "Table 3", capacity: 2, status: "Reserved", location: "Patio", reservedBy: "Sarah Johnson" },
//         { id: 4, name: "Table 4", capacity: 8, status: "Available", location: "Private Room", reservedBy: null },
//         { id: 5, name: "Table 5", capacity: 4, status: "Cleaning", location: "Main Floor", reservedBy: null },
//         { id: 6, name: "Table 6", capacity: 6, status: "Available", location: "Patio", reservedBy: null },
//     ]);

//     const [showModal, setShowModal] = useState(false);
//     const [selectedTable, setSelectedTable] = useState(null);
//     const [filterStatus, setFilterStatus] = useState("All");
//     const [searchTerm, setSearchTerm] = useState("");

//     const statusColors = {
//         Available: "status-available",
//         Occupied: "status-occupied",
//         Reserved: "status-reserved",
//         Cleaning: "status-cleaning",
//     };

//     const filteredTables = tables.filter((table) => {
//         const matchesStatus = filterStatus === "All" || table.status === filterStatus;
//         const matchesSearch =
//             table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             table.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             (table.reservedBy && table.reservedBy.toLowerCase().includes(searchTerm.toLowerCase()));
//         return matchesStatus && matchesSearch;
//     });

//     const updateTableStatus = (tableId, newStatus, reservedBy = null) => {
//         setTables((prev) =>
//             prev.map((table) =>
//                 table.id === tableId ? { ...table, status: newStatus, reservedBy: reservedBy } : table
//             )
//         );
//         setShowModal(false);
//         setSelectedTable(null);
//     };

//     const openModal = (table) => {
//         setSelectedTable(table);
//         setShowModal(true);
//     };

//     const getStatusIcon = (status) => {
//         switch (status) {
//             case "Available":
//                 return "✅";
//             case "Occupied":
//                 return "🔴";
//             case "Reserved":
//                 return "📅";
//             case "Cleaning":
//                 return "🧹";
//             default:
//                 return "❓";
//         }
//     };

//     return (
//         <div className="page-container">
//             <div className="header-card fade-in">
//                 <div className="header-flex">
//                     <div>
//                         <h1 className="title">🍽️ Table Management</h1>
//                         <p className="subtitle">Manage your restaurant tables efficiently</p>
//                     </div>
//                     <div className="header-actions">
//                         <div className="search-box">
//                             <input
//                                 type="text"
//                                 placeholder="Search tables..."
//                                 value={searchTerm}
//                                 onChange={(e) => setSearchTerm(e.target.value)}
//                             />
//                             <span className="search-icon">🔍</span>
//                         </div>
//                         <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
//                             <option value="All">All Status</option>
//                             <option value="Available">Available</option>
//                             <option value="Occupied">Occupied</option>
//                             <option value="Reserved">Reserved</option>
//                             <option value="Cleaning">Cleaning</option>
//                         </select>
//                     </div>
//                 </div>
//             </div>

//             {/* Stats Cards */}
//             <div className="stats-grid">
//                 {["Available", "Occupied", "Reserved", "Cleaning"].map((status) => {
//                     const count = tables.filter((t) => t.status === status).length;
//                     return (
//                         <div key={status} className="stats-card fade-in">
//                             <div className="stats-flex">
//                                 <div>
//                                     <p className="stats-label">{status}</p>
//                                     <p className="stats-value">{count}</p>
//                                 </div>
//                                 <span className="stats-icon">{getStatusIcon(status)}</span>
//                             </div>
//                         </div>
//                     );
//                 })}
//             </div>

//             {/* Desktop Table */}
//             <div className="table-container fade-in">
//                 <table>
//                     <thead>
//                         <tr>
//                             <th>Table</th>
//                             <th>Capacity</th>
//                             <th>Location</th>
//                             <th>Status</th>
//                             <th>Reserved By</th>
//                             <th>Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {filteredTables.map((table) => (
//                             <tr key={table.id}>
//                                 <td>
//                                     <div className="table-name">
//                                         <span className="table-icon">{getStatusIcon(table.status)}</span>
//                                         {table.name}
//                                     </div>
//                                 </td>
//                                 <td>👥 {table.capacity} people</td>
//                                 <td>📍 {table.location}</td>
//                                 <td>
//                                     <span className={`status-badge ${statusColors[table.status]}`}>
//                                         {table.status}
//                                     </span>
//                                 </td>
//                                 <td>{table.reservedBy || "-"}</td>
//                                 <td>
//                                     <button onClick={() => openModal(table)} className="btn-primary">
//                                         Manage
//                                     </button>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Modal */}
//             {showModal && selectedTable && (
//                 <div className="modal-overlay">
//                     <div className="modal fade-in">
//                         <div className="modal-header">
//                             <h2>Manage {selectedTable.name}</h2>
//                             <button onClick={() => setShowModal(false)} className="close-btn">
//                                 ✕
//                             </button>
//                         </div>

//                         <div className="modal-body">
//                             <div className="current-status">
//                                 <p>Current Status</p>
//                                 <span className={`status-badge ${statusColors[selectedTable.status]}`}>
//                                     {getStatusIcon(selectedTable.status)} {selectedTable.status}
//                                 </span>
//                             </div>
//                             <div className="info-grid">
//                                 <div>
//                                     <p>Capacity</p>
//                                     <p>👥 {selectedTable.capacity} people</p>
//                                 </div>
//                                 <div>
//                                     <p>Location</p>
//                                     <p>📍 {selectedTable.location}</p>
//                                 </div>
//                             </div>
//                             {selectedTable.reservedBy && (
//                                 <div className="reserved-by">
//                                     <p>Reserved By</p>
//                                     <p>{selectedTable.reservedBy}</p>
//                                 </div>
//                             )}
//                         </div>

//                         <div className="modal-actions">
//                             <button onClick={() => updateTableStatus(selectedTable.id, "Available")} className="btn-green">
//                                 ✅ Mark Available
//                             </button>
//                             <button onClick={() => updateTableStatus(selectedTable.id, "Occupied", "Walk-in Customer")} className="btn-red">
//                                 🔴 Mark Occupied
//                             </button>
//                             <button onClick={() => updateTableStatus(selectedTable.id, "Reserved", "New Reservation")} className="btn-yellow">
//                                 📅 Mark Reserved
//                             </button>
//                             <button onClick={() => updateTableStatus(selectedTable.id, "Cleaning")} className="btn-blue">
//                                 🧹 Mark for Cleaning
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default TableManagement;
