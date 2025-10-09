import React, { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaUsers, FaClock, FaChartLine, FaPlus, FaUser, FaUtensils } from "react-icons/fa";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
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
            const res = await tableServicesPort.get(`/${clientId}/tables/read`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = res.data;
            if (result.screen_id === "default_tables") {
                const tableList = Array.isArray(result?.data) ? result.data : [];
                tableList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
                setTables(tableList);
                setOriginalTables(tableList);
            }
        } catch (error) {
            console.error("❌ Error fetching tables:", error);
        }
    };

    // Parse multi-range
    const parseTableRange = (rangeStr) => {
        const parts = rangeStr.split(",");
        const tables = [];
        for (let part of parts) {
            part = part.trim();
            if (!part) continue;
            if (part.includes(":")) {
                const [startStr, endStr] = part.split(":");
                const prefixStart = startStr.match(/[A-Za-z]+/);
                const startNum = startStr.match(/\d+/);
                const endNum = endStr.match(/\d+/);
                if (!prefixStart || !startNum || !endNum) continue;
                const prefix = prefixStart[0].toUpperCase();
                const start = parseInt(startNum[0]);
                const end = parseInt(endNum[0]);
                for (let i = start; i <= end; i++) {
                    tables.push(`${prefix}${i.toString().padStart(2, "0")}`);
                }
            } else {
                const prefix = part.match(/[A-Za-z]+/);
                const num = part.match(/\d+/);
                if (!prefix || !num) continue;
                const formatted = `${prefix[0].toUpperCase()}${parseInt(num[0]).toString().padStart(2, "0")}`;
                tables.push(formatted);
            }
        }
        return tables;
    };

    // Generate tables
    const generateTables = async () => {
        const newErrors = tableRanges.map(row => ({
            range: !row.range,
            table_type: !row.table_type,
            type: !row.type
        }));
        setFieldErrors(newErrors);

        const validRows = tableRanges.filter((row, index) => !newErrors[index].range && !newErrors[index].table_type && !newErrors[index].type);
        if (validRows.length === 0) return;
        const payload = [];
        for (let row of validRows) {
            const tableNumbers = parseTableRange(row.range);
            tableNumbers.forEach(num => {
                payload.push({
                    client_id: clientId,
                    name: num,
                    table_type: row.table_type.toString(),
                    status: row.remark || "Vacant",
                    location_zone: row.type,
                    description: row.description,
                    section: row.section,
                    sort_order: row.sort_order ? parseInt(row.sort_order) : null,
                    is_active: row.is_active, qr_code_url: row.qr_code_url || "",
                    slug: `${clientId}-${(row.slug || num).toLowerCase().replace(/[^a-z0-9-]/g, '')}`
                });
            });
        }

        try {
            for (let data of payload) {
                await tableServicesPort.post(
                    `/${clientId}/tables/create`,
                    data,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            fetchTables();
            setShowAddTable(false);
            setTableRanges([]);
            setFieldErrors([]);
        } catch (err) {
            console.error("Error generating tables", err);
        }
    };

    const handleEditChange = (id, field, value) => {
        setTables(prev =>
            prev.map(table => (table.id === id ? { ...table, [field]: value } : table))
        );
    };

    const saveEdit = async (table) => {
        const original = originalTables.find(t => t.id === table.id);
        const hasChanged = (
            original?.table_type?.toString() !== table.table_type?.toString() ||
            original?.location_zone !== table.location_zone ||
            (original?.status || "") !== (table.status || "")
        );
        if (!hasChanged) {
            setNoChangeRowId(table.id);
            setTimeout(() => {
                setNoChangeRowId(null);
                setEditRowId(null);
            }, 2000);
            return;
        }
        try {
            await tableServicesPort.post(`/${clientId}/tables/update`, table, { headers: { Authorization: `Bearer ${token}` } });
            setEditRowId(null);
            setHighlightRow(table.id);
            setTimeout(() => setHighlightRow(null), 3000);
            fetchTables();
        } catch (err) {
            console.error("Error updating table");
        }
    };

    const cancelEdit = () => {
        setEditRowId(null);
        setNoChangeRowId(null);
        fetchTables();
    };

    const confirmDelete = async () => {
        try {
            await tableServicesPort.post(`/${clientId}/tables/delete`, {
                id: deleteTableId,
                client_id: clientId,
                name: "",
                table_type: "",
                location_zone: "",
            }, { headers: { Authorization: `Bearer ${token}` } });
            fetchTables();
        } catch (err) {
            console.error("Error deleting table");
        } finally {
            setShowConfirmDelete(false);
            setDeleteTableId(null);
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
                    {/* <div className="tm-stats-grid">
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
                    </div> */}
                    {/* Controls */}
                    <div className="tm-controls-card">
                        <div className="tm-controls-flex">
                            <div className="tm-controls-search-filter">
                                <div className="tm-search-wrap">
                                    <FaSearch className="tm-search-icon" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search tables..."
                                        className="tm-search-input"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="tm-filter-select"
                                >
                                    <option value="">All Status</option>
                                    <option value="Vacant">Available</option>
                                    <option value="Occupied">Occupied</option>
                                    <option value="Reserved">Reserved</option>
                                </select>
                            </div>
                            <button className="tm-add-table-btn" onClick={() => {
                                setShowAddTable(true);
                                setTableRanges([...tableRanges, { range: "", table_type: "", type: "", remark: "Vacant", is_active: false }]);
                                setFieldErrors([{}]);
                            }}>
                                <FaPlus className="tm-add-icon" /> <span>Add Table</span>
                            </button>
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
                                                <div className="tm-table-card-capacity">Capacity: <span>{table.table_type}</span></div>
                                            </div>
                                            {config.icon}
                                        </div>
                                        <div className="tm-table-card-status-row">
                                            <span className={`tm-status-badge ${config.card}`}>{config.label}</span>
                                        </div>
                                        <div className="tm-table-card-actions">
                                            <button className="tm-edit-btn" onClick={() => setEditRowId(table.id)}><FaEdit /></button>
                                            <button className="tm-delete-btn" onClick={() => { setDeleteTableId(table.id); setShowConfirmDelete(true); }}><FaTrash /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Add Table Modal */}
                    {showAddTable && (
                        <div className="tm-modal-overlay">
                            <div className="tm-modal-card">
                                <div className="tm-modal-header">
                                    <h3>Add New Tables</h3>
                                    <button className="tm-modal-close" onClick={() => setShowAddTable(false)}><FaTimes /></button>
                                </div>
                                <div className="tm-modal-body">
                                    {tableRanges.map((row, index) => (
                                        <div className="tm-modal-row" key={index}>
                                            <div className="tm-modal-field">
                                                <label>Table Range</label>
                                                <input
                                                    value={row.range}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].range = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                    className={fieldErrors[index]?.range ? "tm-error-input" : ""}
                                                />
                                                {fieldErrors[index]?.range && <div className="tm-error-message">Enter table range</div>}
                                            </div>
                                            <div className="tm-modal-field">
                                                <label>No of Seating</label>
                                                <input
                                                    type="number"
                                                    value={row.table_type}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].table_type = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                    className={fieldErrors[index]?.table_type ? "tm-error-input" : ""}
                                                />
                                                {fieldErrors[index]?.table_type && <div className="tm-error-message">Enter seating</div>}
                                            </div>
                                            <div className="tm-modal-field">
                                                <label>Type</label>
                                                <select
                                                    value={row.type}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].type = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                    className={fieldErrors[index]?.type ? "tm-error-input" : ""}
                                                >
                                                    <option value="">Select</option>
                                                    <option value="AC">AC</option>
                                                    <option value="Non-AC">Non-AC</option>
                                                </select>
                                                {fieldErrors[index]?.type && <div className="tm-error-message">Select type</div>}
                                            </div>
                                            <div className="tm-modal-field">
                                                <label>Remark</label>
                                                <select
                                                    value={row.remark}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].remark = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                >
                                                    <option value="Vacant">Vacant</option>
                                                    <option value="Occupied">Occupied</option>
                                                    <option value="Reserved">Reserved</option>
                                                </select>
                                            </div>
                                            <div className="tm-modal-field">
                                                <label>QR Code URL</label>
                                                <input
                                                    type="text"
                                                    value={row.qr_code_url || ""}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].qr_code_url = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                    placeholder="Enter QR code URL"
                                                />
                                            </div>
                                            <div className="tm-modal-field">
                                                <label>Description</label>
                                                <input
                                                    value={row.description}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].description = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                />
                                            </div>
                                            <div className="tm-modal-field">
                                                <label>Slug</label>
                                                <input
                                                    type="text"
                                                    value={row.slug || ""}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].slug = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                    placeholder="Enter slug"
                                                />
                                            </div>
                                            <div className="tm-modal-field">
                                                <label>Section</label>
                                                <input
                                                    value={row.section}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].section = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                />
                                            </div>
                                            <div className="tm-modal-field">
                                                <label>Sort Order</label>
                                                <input
                                                    type="number"
                                                    value={row.sort_order}
                                                    onChange={e => {
                                                        const updated = [...tableRanges];
                                                        updated[index].sort_order = e.target.value;
                                                        setTableRanges(updated);
                                                    }}
                                                />
                                            </div>
                                            <div className="tm-modal-field tm-checkbox-field">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={row.is_active}
                                                        onChange={e => {
                                                            const updated = [...tableRanges];
                                                            updated[index].is_active = e.target.checked;
                                                            setTableRanges(updated);
                                                        }}
                                                    /> Active
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="tm-modal-example">
                                        Example:<br />
                                        a) Table Range: T01:T10<br />
                                        b) Multi-Table Range: A01:A10,B01:B05
                                    </div>
                                    {addRowError && <div className="tm-modal-error">{addRowError}</div>}
                                    {/* <button className="tm-modal-add-row" onClick={() => {
                                        const emptyRows = tableRanges.filter(
                                            row => !row.range || !row.table_type || !row.type
                                        );
                                        if (emptyRows.length >= 3) {
                                            setAddRowError("Please fill the existing rows first.");
                                            return;
                                        }
                                        setAddRowError("");
                                        setTableRanges([...tableRanges, { range: "", table_type: "", type: "", remark: "Vacant", is_active: false }]);
                                        setFieldErrors([...fieldErrors, {}]);
                                    }}>
                                        + Add Row
                                    </button> */}
                                    <button className="tm-modal-generate-table" onClick={generateTables}>Generate Table</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Edit Table Modal */}
                    <div className="tm-edit-tables-section">
                        {editRowId && (
                            <div className="tm-edit-modal-overlay">
                                <div className="tm-edit-modal-card">
                                    <div className="tm-edit-modal-header">
                                        <h3>Edit Table</h3>
                                        <button className="tm-edit-modal-close" onClick={cancelEdit}><FaTimes /></button>
                                    </div>
                                    {tables.filter(table => table.id === editRowId).map(table => (
                                        <div className="tm-edit-modal-body" key={table.id}>
                                            <div className="tm-edit-modal-field">
                                                <label>No of Seating</label>
                                                <input
                                                    type="number"
                                                    value={table.table_type}
                                                    onChange={e => handleEditChange(table.id, "table_type", e.target.value)}
                                                />
                                            </div>
                                            <div className="tm-edit-modal-field">
                                                <label>Type</label>
                                                <select
                                                    value={table.location_zone}
                                                    onChange={e => handleEditChange(table.id, "location_zone", e.target.value)}
                                                >
                                                    <option value="AC">AC</option>
                                                    <option value="Non-AC">Non-AC</option>
                                                </select>
                                            </div>
                                            <div className="tm-edit-modal-field">
                                                <label>Remark</label>
                                                <select
                                                    value={table.status || ""}
                                                    onChange={e => handleEditChange(table.id, "status", e.target.value)}
                                                >
                                                    <option value="Vacant">Vacant</option>
                                                    <option value="Occupied">Occupied</option>
                                                    <option value="Reserved">Reserved</option>
                                                </select>
                                            </div>

                                            <div className="tm-edit-modal-btns">
                                                <button className="tm-edit-modal-save" onClick={() => saveEdit(table)}><FaCheck /></button>
                                                <button className="tm-edit-modal-cancel" onClick={cancelEdit}><FaTimes /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Delete Modal */}
                    {showConfirmDelete && (
                        <div className="tm-confirm-overlay">
                            <div className="tm-confirm-modal-card">
                                <p>
                                    Delete table <strong>{tables.find(t => t.id === deleteTableId)?.name || "this table"}</strong>?
                                </p>
                                <div className="tm-confirm-modal-btns">
                                    <button className="tm-confirm-danger" onClick={confirmDelete}>Yes</button>
                                    <button className="tm-confirm-cancel" onClick={() => setShowConfirmDelete(false)}>No</button>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};
export default TableManagement;
