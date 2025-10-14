
import React, { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaUsers, FaClock, FaChartLine, FaPlus, FaUser, FaUtensils } from "react-icons/fa";
import axios from 'axios';
import { useParams } from 'react-router-dom';

const statusConfig = {
    Vacant: { card: "tm-status-card-available", icon: <FaCheck className="tm-status-icon tm-available" />, label: "Available" },
    Occupied: { card: "tm-status-card-occupied", icon: <FaUsers className="tm-status-icon tm-occupied" />, label: "Occupied" },
    Reserved: { card: "tm-status-card-reserved", icon: <FaClock className="tm-status-icon tm-reserved" />, label: "Reserved" }
};

const TableManagement = () => {
    const { clientId } = useParams();
    const { darkMode } = useTheme();

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [tableRanges, setTableRanges] = useState([]);
    const [tables, setTables] = useState([]);
    const [originalTables, setOriginalTables] = useState([]);
    const [fieldErrors, setFieldErrors] = useState([]);
    const [showAddTable, setShowAddTable] = useState(false);
    const [editRowId, setEditRowId] = useState(null);
    const [highlightRow, setHighlightRow] = useState(null);
    const [noChangeRowId, setNoChangeRowId] = useState(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deleteTableId, setDeleteTableId] = useState(null);
    const [addRowError, setAddRowError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTable, setModalTable] = useState(null);

    const token = localStorage.getItem("access_token");
    const [tableId, setTableId] = useState(null)
    useEffect(() => {
        if (tableId) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableId]);
    useEffect(() => {
        if (clientId) fetchTables();
    }, [clientId]);

    const fetchTables = async () => {
        if (!clientId) return;
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
                headers: { Authorization: `Bearer ${token}`}
            });
            const result = res.data;
            if(result.screen_id==="waiter_table"){
            const tableList = Array.isArray(result?.data) ? result.data : [];
            tableList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setTables(tableList);
            setOriginalTables(tableList);
            }
        } catch (error) {
            console.error("❌ Error fetching tables:", error);
        }
    };

    // Stats
    const available = tables.filter(t => t.status === 'Vacant').length;
    const occupied = tables.filter(t => t.status === 'Occupied').length;
    const reserved = tables.filter(t => t.status === 'Reserved').length;
    const total = tables.length;

    // Table filtering
    const filteredTables = tables.filter(table => {
        const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (table.customer && table.customer.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = !statusFilter || table.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="Table-Creation-Management">
            <div className={`tm-bg ${darkMode ? 'tm-dark-mode' : ''}`}>
                {/* Header */}
                <main className="tm-main-container">
                    {/* Stats Cards */}
                     <div className="tm-stats-grid">
                        <div className="tm-stats-card">
                            <div className="tm-stats-flex">
                                <div className="tm-stats-icon-bg tm-stats-icon-green">
                                    <FaCheck className="tm-icon-available" />
                                </div>
                                <div className="tm-stats-text-group">
                                    <p className="tm-stats-label">Available</p>
                                    <p className="tm-stats-value">{available}</p>
                                </div>
                            </div>
                        </div>
                        <div className="tm-stats-card">
                            <div className="tm-stats-flex">
                                <div className="tm-stats-icon-bg tm-stats-icon-blue">
                                    <FaUsers className="tm-icon-occupied" />
                                </div>
                                <div className="tm-stats-text-group">
                                    <p className="tm-stats-label">Occupied</p>
                                    <p className="tm-stats-value">{occupied}</p>
                                </div>
                            </div>
                        </div>
                        <div className="tm-stats-card">
                            <div className="tm-stats-flex">
                                <div className="tm-stats-icon-bg tm-stats-icon-yellow">
                                    <FaClock className="tm-icon-reserved" />
                                </div>
                                <div className="tm-stats-text-group">
                                    <p className="tm-stats-label">Reserved</p>
                                    <p className="tm-stats-value">{reserved}</p>
                                </div>
                            </div>
                        </div>
                        <div className="tm-stats-card">
                            <div className="tm-stats-flex">
                                <div className="tm-stats-icon-bg tm-stats-icon-purple">
                                    <FaChartLine className="tm-icon-total" />
                                </div>
                                <div className="tm-stats-text-group">
                                    <p className="tm-stats-label">Total Tables</p>
                                    <p className="tm-stats-value">{total}</p>
                                </div>
                            </div>
                        </div>
                    </div> 
                  
                    {/* Table Grid */}
                    <div className="tm-table-grid-card">
                        <div className="tm-table-grid">
                            {filteredTables.map(table => {
                                const config = statusConfig[table.status] || statusConfig['Vacant'];
                                return (
                                    <div key={table.id} className={`tm-table-card ${config.card}`} onClick={() => { }}>
                                        <div className="tm-table-card-header">
                                            <div>
                                                <div className="tm-table-card-title">{table.name}</div>
                                                <div className="tm-table-card-capacity">Capacity: {table.table_type}</div>
                                            </div>
                                            {config.icon}
                                        </div>
                                        <div className="tm-table-card-status-row">
                                            <span className={`tm-status-badge ${config.card}`}>{config.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
export default TableManagement;
