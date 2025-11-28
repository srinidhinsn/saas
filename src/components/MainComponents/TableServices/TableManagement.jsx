import React, { useEffect, useState, useRef } from "react";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaUsers, FaClock, FaPlus } from "react-icons/fa";
import axios from 'axios';
import { toast } from "react-toastify";
import { injectThemeVars } from '../../utils/injectThemeVars'

const statusConfig = {
    Vacant: { card: "bg-tableStatusBg-vacant border-tableStatusBorder-vacant", icon: <FaCheck className="text-action-success text-xl" />, label: "Available" },
    Occupied: { card: "bg-tableStatusBg-occupied border-tableStatusBorder-occupied", icon: <FaUsers className="text-action-danger text-xl" />, label: "Occupied" },
    Reserved: { card: "bg-tableStatusBg-reserved border-tableStatusBorder-reserved", icon: <FaClock className="text-action-primary text-xl" />, label: "Reserved" }
};

const TableManagement = ({ clientId, token }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [tableRanges, setTableRanges] = useState([]);
    const [tables, setTables] = useState([]);
    const [originalTables, setOriginalTables] = useState([]);
    const [fieldErrors, setFieldErrors] = useState([]);
    const [editFieldErrors, setEditFieldErrors] = useState({});
    const [showAddTable, setShowAddTable] = useState(false);
    const [editRowId, setEditRowId] = useState(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deleteTableId, setDeleteTableId] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const generatingRef = useRef(false);

    // Bulk Update States
    const [showBulkUpdate, setShowBulkUpdate] = useState(false);
    const [bulkUpdateSearch, setBulkUpdateSearch] = useState("");
    const [selectedUpdateTables, setSelectedUpdateTables] = useState([]);
    const [bulkUpdateData, setBulkUpdateData] = useState({});
    const [bulkUpdateGlobal, setBulkUpdateGlobal] = useState({
        table_type: "",
        status: "",
        location_zone: ""
    });

    // Bulk Delete States
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [bulkDeleteSearch, setBulkDeleteSearch] = useState("");
    const [selectedDeleteTables, setSelectedDeleteTables] = useState([]);
    const [showFirstDeleteConfirm, setShowFirstDeleteConfirm] = useState(false);
    const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = useState(false);

    useEffect(() => {
        injectThemeVars();
    }, []);
    useEffect(() => {
        if (clientId) fetchTables();
    }, [clientId]);

    const fetchTables = async () => {
        if (!clientId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
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
            console.error("Error fetching tables:", error);
        } finally {
            setLoading(false);
        }
    };

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

    const generateTables = async () => {
        if (generatingRef.current) return;
        generatingRef.current = true;
        setIsGenerating(true);

        try {
            const newErrors = tableRanges.map(row => ({
                range: !row.range,
                table_type: !row.table_type,
                type: !row.type
            }));
            setFieldErrors(newErrors);

            const validRows = tableRanges.filter((row, index) =>
                !newErrors[index].range &&
                !newErrors[index].table_type &&
                !newErrors[index].type
            );
            if (validRows.length === 0) {
                toast.error('Fill the fields')
                return;
            }

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
                        description: row.description || "",
                        section: row.section || "",
                        sort_order: row.sort_order ? parseInt(row.sort_order) : null,
                        is_active: row.is_active || false,
                        qr_code_url: row.qr_code_url || "",
                        slug: `${clientId}-${(row.slug || num).toLowerCase().replace(/[^a-z0-9-]/g, '')}`
                    });
                });
            }

            for (let data of payload) {
                try {
                    await axios.post(
                        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/create`,
                        data,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } catch (err) {
                    if (err.response && err.response.status === 400) {
                        alert(`Table "${data.name}" already exists!`);
                    }
                }
            }

            await fetchTables();
            setShowAddTable(false);
            setTableRanges([]);
            setFieldErrors([]);

        } catch (err) {
            console.error("Error generating tables", err);
        } finally {
            generatingRef.current = false;
            setIsGenerating(false);
        }
    };

    const handleEditChange = (id, field, value) => {
        setTables(prev =>
            prev.map(table =>
                table.id === id
                    ? {
                        ...table,
                        [field]: field === "table_type" ? Math.max(1, Number(value) || 1) : value
                    }
                    : table
            )
        );
        setEditFieldErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
    };

    const saveEdit = async (table) => {
        let errors = {};
        if (Number(table.table_type) < 1) {
            errors.table_type = 'Seating must be at least 1';
        }
        if (!table.table_type || table.table_type.toString().trim() === '') {
            errors.table_type = 'Required';
        }
        if (!table.location_zone || table.location_zone.trim() === '') {
            errors.location_zone = 'Required';
        }
        if (!table.status || table.status.trim() === '') {
            errors.status = 'Required';
        }

        if (Object.keys(errors).length > 0) {
            setEditFieldErrors(errors);
            return;
        }

        setEditFieldErrors({});

        const original = originalTables.find(t => t.id === table.id);
        const hasChanged = (
            original?.table_type?.toString() !== table.table_type?.toString() ||
            original?.location_zone !== table.location_zone ||
            (original?.status || "") !== (table.status || "")
        );

        if (!hasChanged) {
            alert("No changes detected");
            setEditRowId(null);
            return;
        }

        try {
            const payload = {
                ...table,
                table_type: table.table_type.toString()
            };

            await axios.post(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setEditRowId(null);
            setEditFieldErrors({});
            await fetchTables();

        } catch (err) {
            console.error("Error updating table", err);
            alert("Failed to update table");
        }
    };

    const confirmDelete = async () => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/delete`,
                {
                    id: deleteTableId,
                    client_id: clientId,
                    name: "",
                    table_type: "",
                    location_zone: "",
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setShowConfirmDelete(false);
            setDeleteTableId(null);
            await fetchTables();

        } catch (err) {
            console.error("Error deleting table", err);
            alert("Failed to delete table");
            setShowConfirmDelete(false);
            setDeleteTableId(null);
        }
    };

    const openBulkUpdate = () => {
        setShowBulkUpdate(true);
        setSelectedUpdateTables([]);
        setBulkUpdateSearch("");
        setBulkUpdateGlobal({
            table_type: "",
            status: "",
            location_zone: ""
        });

        const initialData = {};
        tables.forEach(table => {
            initialData[table.id] = {
                table_type: table.table_type,
                location_zone: table.location_zone,
                status: table.status
            };
        });
        setBulkUpdateData(initialData);
    };

    const toggleUpdateTableSelection = (tableId) => {
        setSelectedUpdateTables(prev =>
            prev.includes(tableId)
                ? prev.filter(id => id !== tableId)
                : [...prev, tableId]
        );
    };

    const selectAllUpdateTables = () => {
        const filtered = getFilteredUpdateTables();
        if (selectedUpdateTables.length === filtered.length) {
            setSelectedUpdateTables([]);
        } else {
            setSelectedUpdateTables(filtered.map(t => t.id));
        }
    };

    const handleBulkUpdateChange = (tableId, field, value) => {
        setBulkUpdateData(prev => ({
            ...prev,
            [tableId]: {
                ...prev[tableId],
                [field]: field === "table_type" ? (value ? Math.max(1, Number(value)) : "") : value
            }
        }));
    };

    const saveBulkUpdate = async () => {
        try {
            const tablesToUpdate = tables.filter(t =>
                selectedUpdateTables.includes(t.id)
            );

            for (const table of tablesToUpdate) {
                const tableUpdates = bulkUpdateData[table.id] || {};

                let finalTableType = table.table_type;
                if (tableUpdates.table_type && tableUpdates.table_type !== table.table_type) {
                    finalTableType = tableUpdates.table_type;
                } else if (bulkUpdateGlobal.table_type) {
                    finalTableType = bulkUpdateGlobal.table_type;
                }

                let finalStatus = table.status;
                if (tableUpdates.status && tableUpdates.status !== table.status) {
                    finalStatus = tableUpdates.status;
                } else if (bulkUpdateGlobal.status) {
                    finalStatus = bulkUpdateGlobal.status;
                }

                let finalZone = table.location_zone;
                if (tableUpdates.location_zone && tableUpdates.location_zone !== table.location_zone) {
                    finalZone = tableUpdates.location_zone;
                } else if (bulkUpdateGlobal.location_zone) {
                    finalZone = bulkUpdateGlobal.location_zone;
                }

                const updatedFields = {
                    ...table,
                    table_type: finalTableType.toString(),
                    status: finalStatus,
                    location_zone: finalZone,
                };

                await axios.post(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                    updatedFields,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
            }

            setShowBulkUpdate(false);
            setSelectedUpdateTables([]);
            setBulkUpdateData({});
            setBulkUpdateSearch("");
            setBulkUpdateGlobal({
                table_type: "",
                status: "",
                location_zone: "",
            });

            await fetchTables();

        } catch (err) {
            console.error("Bulk update error", err);
            alert("Failed to update tables");
        }
    };

    const getFilteredUpdateTables = () => {
        return tables.filter(table =>
            table.name.toLowerCase().includes(bulkUpdateSearch.toLowerCase())
        );
    };

    const openBulkDelete = () => {
        setShowBulkDelete(true);
        setSelectedDeleteTables([]);
        setBulkDeleteSearch("");
    };

    const toggleDeleteTableSelection = (tableId) => {
        setSelectedDeleteTables(prev =>
            prev.includes(tableId)
                ? prev.filter(id => id !== tableId)
                : [...prev, tableId]
        );
    };

    const selectAllDeleteTables = () => {
        const filtered = getFilteredDeleteTables();
        if (selectedDeleteTables.length === filtered.length) {
            setSelectedDeleteTables([]);
        } else {
            setSelectedDeleteTables(filtered.map(t => t.id));
        }
    };

    const confirmBulkDelete = async () => {
        try {
            const tablesToDelete = tables.filter(t => selectedDeleteTables.includes(t.id));
            for (const table of tablesToDelete) {
                await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/delete`, {
                    id: table.id,
                    client_id: clientId,
                    name: "",
                    table_type: "",
                    location_zone: "",
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            await fetchTables();
        } catch (err) {
            console.error("Bulk delete error", err);
            alert("Failed to delete tables");
        } finally {
            setShowBulkDelete(false);
            setShowSecondDeleteConfirm(false);
            setSelectedDeleteTables([]);
        }
    };

    const getFilteredDeleteTables = () => {
        return tables.filter(table =>
            table.name.toLowerCase().includes(bulkDeleteSearch.toLowerCase())
        );
    };

    const filteredTables = tables.filter(table => {
        const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || table.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg font-medium">Loading Tables...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <style>
                {`
          @keyframes scale-in {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-scale-in {
            animation: scale-in 0.2s ease-out;
          }
        `}
            </style>
            <main className="mx-auto px-3 py-2">
                {/* Controls */}
                <div className="rounded-xl p-2 mb-4">
                    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                        <div className="flex flex-col sm:flex-row gap-2 flex-1">
                            <div className="relative ">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search tables..."
                                    className="w-full pl-10 pr-3 py-2 border-default border-border-default rounded-lg focus:outline-none  focus:border-action-primary bg-bg-primary text-text-primary"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border-default border-border-default rounded-lg focus:outline-none focus:ring-2 focus:border-action-primary bg-bg-primary text-text-primary"
                            >
                                <option value="">All Status</option>
                                <option value="Vacant">Available</option>
                                <option value="Occupied">Occupied</option>
                                <option value="Reserved">Reserved</option>
                            </select>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                className="flex items-center gap-2 px-4 py-2 bg-action-primary text-text-white rounded-lg hover:bg-bulkActionsHover-updateHover hover:text-text-primary transition-colors font-semibold text-sm shadow-md"
                                onClick={openBulkUpdate}
                            >
                                <FaEdit /> <span>Bulk Update</span> 
                            </button>
                            <button
                                className="flex items-center gap-2 px-4 py-2 bg-bulkActions-delete text-text-white rounded-lg hover:bg-bulkActionsHover-deleteHover hover:text-text-primary transition-colors font-semibold text-sm shadow-md"
                                onClick={openBulkDelete}
                            >
                                <FaTrash /> <span>Bulk Delete</span>
                            </button>
                            <button
                                className="flex items-center gap-2 px-4 py-2 bg-bulkActions-adding text-text-white rounded-lg hover:bg-bulkActionsHover-addingHover hover:text-text-primary transition-colors font-semibold text-sm shadow-md"
                                onClick={() => {
                                    setShowAddTable(true);
                                    setTableRanges([{
                                        range: "", table_type: "", type: "", remark: "Vacant",
                                        is_active: false, description: "", slug: "", section: "",
                                        sort_order: "", qr_code_url: ""
                                    }]);
                                    setFieldErrors([{}]);
                                }}
                            >
                                <FaPlus /> <span>Add Table</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
                    {filteredTables.map(table => {
                        const config = statusConfig[table.status] || statusConfig['Vacant'];
                        return (
                            <div key={table.id} className={`${config.card} rounded-button shadow-sm overflow-hidden border-2 transition-all duration-200 hover:shadow-lg hover:scale-105`}>
                                <div className="p-3 border-b bg-bg-primary bg-opacity-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="text-lg font-bold text-text-primary mb-0.5">{table.name}</div>
                                            <div className="text-xs text-text-secondary">Seating : <span className="font-semibold text-text-primary">{table.table_type}</span></div>
                                            <div className="text-xs text-text-secondary">Zone : <span className="font-semibold text-text-primary">{table.location_zone}</span></div>
                                        </div>
                                        {config.icon}
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${table.status === 'Vacant' ? 'bg-tableStatusBg-vacant text-tableStatusText-vacant' :
                                            table.status === 'Occupied' ? 'bg-tableStatusBg-occupied text-tableStatusText-occupied' :
                                                'bg-tableStatusBg-reserved text-tableStatusText-reserved'
                                            }`}>
                                            Status : {config.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-2 bg-bg-primary bg-opacity-50 flex gap-1.5">
                                    <button
                                        className="flex-1 flex items-center justify-center gap-1 bg-action-primary text-text-white py-1.5 rounded hover:bg-bulkActionsHover-updateHover hover:text-text-primary transition-colors font-semibold text-xs shadow-sm"
                                        onClick={() => setEditRowId(table.id)}
                                    >
                                        <FaEdit className="text-xs" /> Edit
                                    </button>
                                    <button
                                        className="flex-1 flex items-center justify-center gap-1 bg-action-danger text-text-white py-1.5 rounded hover:bg-bulkActionsHover-deleteHover hover:text-text-primary transition-colors font-semibold text-xs shadow-sm"
                                        onClick={() => { setDeleteTableId(table.id); setShowConfirmDelete(true); }}
                                    >
                                        <FaTrash className="text-xs" /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredTables.length === 0 && (
                    <div className="bg-bg-primary rounded-xl shadow-sm p-12 text-center border border-border-default">
                        <div className="text-text-secondary mb-3">
                            <FaSearch className="text-5xl mx-auto" />
                        </div>
                        <p className="text-text-secondary text-lg font-medium">No tables found</p>
                        <p className="text-text-secondary text-sm mt-1">Try adjusting your search or filter criteria</p>
                    </div>
                )}

                {/* Add Table Modal */}
                {showAddTable && (
                    <div className="fixed inset-0 bg-color-modalsbg bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-bg-primary rounded-xl w-full max-w-xl shadow-2xl border border-border-default my-8">
                            <div className="sticky top-0 bg-bg-primary px-4 py-2 border-b-border-default flex justify-between items-center z-10 rounded-t-xl">
                                <h3 className="text-xl font-bold text-text-primary">Add Tables</h3>
                                <button
                                    className="text-text-secondary hover:text-text-primary transition-colors p-1"
                                    onClick={() => {
                                        setShowAddTable(false);
                                        setTableRanges([]);
                                        setFieldErrors([]);
                                    }}
                                >
                                    <FaTimes size={24} />
                                </button>
                            </div>
                            <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
                                {tableRanges.map((row, index) => (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 bg-bg-tertiary rounded-lg border-default border-border-default" key={index}>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-text-primary">Table Range *</label>
                                            <input
                                                value={row.range}
                                                onChange={e => {
                                                    const updated = [...tableRanges];
                                                    updated[index].range = e.target.value;
                                                    setTableRanges(updated);
                                                }}
                                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-success ${fieldErrors[index]?.range ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                                                    }`}
                                                placeholder="S01:S10"
                                            />
                                            {fieldErrors[index]?.range && <div className="text-action-danger text-xs mt-1 font-medium">Enter table range</div>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-text-primary">No of Seating *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={row.table_type}
                                                onChange={e => {
                                                    const value = Math.max(1, Number(e.target.value) || "");
                                                    const updated = [...tableRanges];
                                                    updated[index].table_type = value;
                                                    setTableRanges(updated);
                                                }}
                                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${fieldErrors[index]?.table_type ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                                                    }`}
                                                placeholder="4"
                                            />
                                            {fieldErrors[index]?.table_type && <div className="text-action-danger text-xs mt-1 font-medium">Enter seating</div>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-text-secondary">Type *</label>
                                            <select
                                                value={row.type}
                                                onChange={e => {
                                                    const updated = [...tableRanges];
                                                    updated[index].type = e.target.value;
                                                    setTableRanges(updated);
                                                }}
                                                className={`w-full px-3  py-2 border-default border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${fieldErrors[index]?.type ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                                                    }`}
                                            >
                                                <option value="">Select</option>
                                                <option value="AC">AC</option>
                                                <option value="Non-AC">Non-AC</option>
                                            </select>
                                            {fieldErrors[index]?.type && <div className="text-action-danger text-xs mt-1 font-medium">Select type</div>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-text-secondary">Remark</label>
                                            <select
                                                value={row.remark}
                                                onChange={e => {
                                                    const updated = [...tableRanges];
                                                    updated[index].remark = e.target.value;
                                                    setTableRanges(updated);
                                                }}
                                                className="w-full px-3 py-2 border-default border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary"
                                            >
                                                <option value="Vacant">Vacant</option>
                                                <option value="Reserved">Reserved</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-5 mb-6">
                                    <div className="flex items-start gap-3">
                                        <div className="text-tableStatusText-vacant mt-1">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-text-primary mb-2">Table Range Examples:</div>
                                            <div className="text-sm text-gray-700 space-y-1">
                                                <div><strong>Single Table:</strong> S1</div>
                                                <div><strong>Single & Multi Range:</strong> T01:T10 & A01:A10,B01:B05</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="w-full bg-action-primary text-text-white py-2 rounded-lg hover:bg-bulkActionsHover-addingHover hover:text-text-primary transition-colors font-bold text-lg shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    disabled={isGenerating}
                                    onClick={generateTables}
                                >
                                    {isGenerating ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-border-default"></div>
                                            Generating Tables...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <FaPlus /> Generate Tables
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Table Modal */}
                {editRowId && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200 animate-scale-in">
                            <div className="px-5 py-3 rounded-xl border-b-default flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50">
                                <h3 className="text-lg font-bold text-text-primary">Edit Table</h3>
                                <button className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full" onClick={() => { setEditRowId(null); setEditFieldErrors({}); }}>
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            {tables.filter(table => table.id === editRowId).map(table => (
                                <div className="p-5" key={table.id}>
                                    <div className="bg-gradient-to-r from-action-primary via-text-white to-bulkActionsHover-deleteHover  rounded-lg border border-orange-200 p-3 mb-4 text-center">
                                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Table Name</span>
                                        <div className="text-2xl font-bold text-text-primary mt-0.5">{table.name}</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-text-secondary">No of Seating</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={table.table_type}
                                                onChange={e => {
                                                    const value = Math.max(1, Number(e.target.value) || 1);
                                                    handleEditChange(table.id, "table_type", value);
                                                }}
                                                className={`w-full px-3 py-2 border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${editFieldErrors.table_type ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                                                    }`}
                                            />
                                            {editFieldErrors.table_type && <div className="text-action-danger text-xs mt-1 font-medium">{editFieldErrors.table_type}</div>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-text-secondary0">Type</label>
                                            <select
                                                value={table.location_zone}
                                                onChange={e => handleEditChange(table.id, "location_zone", e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${editFieldErrors.location_zone ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                                                    }`}
                                            >
                                                <option value="AC">AC</option>
                                                <option value="Non-AC">Non-AC</option>
                                            </select>
                                            {editFieldErrors.location_zone && <div className="text-action-danger text-xs mt-1 font-medium">{editFieldErrors.location_zone}</div>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-text-secondary">Status</label>
                                            <select
                                                value={table.status || ""}
                                                onChange={e => handleEditChange(table.id, "status", e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${editFieldErrors.status ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                                                    }`}
                                            >
                                                <option value="Vacant">Vacant</option>
                                                {/* <option value="Occupied">Occupied</option> */}
                                                <option value="Reserved">Reserved</option>
                                            </select>
                                            {editFieldErrors.status && <div className="text-action-danger text-xs mt-1 font-medium">{editFieldErrors.status}</div>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-5">
                                        <button
                                            className="flex-1 bg-action-primary text-text-white py-2.5 rounded-lg hover:bg-green-600 transition-colors font-bold shadow-md flex items-center justify-center gap-2"
                                            onClick={() => saveEdit(table)}
                                        >
                                            <FaCheck /> Save
                                        </button>
                                        <button
                                            className="flex-1 bg-modalsUpdateBg-cancel text-text-white py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-bold flex items-center justify-center gap-2"
                                            onClick={() => { setEditRowId(null); setEditFieldErrors({}); }}
                                        >
                                            <FaTimes /> Cancel
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bulk Update Modal */}
                {showBulkUpdate && (
                    <div className="fixed inset-0 bg-color-modalsbg z-50 flex items-center justify-center p-4">
                        <div className="bg-bg-primary rounded-xl w-full max-w-xl shadow-2xl border border-border-default max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="px-3 py-2 border-b flex justify-between items-center bg-gradient-to-r from-action-primary via-text-white to-action-success">
                                <h3 className="text-xl font-bold text-text-primary">Bulk Update Tables</h3>
                                <button
                                    className="text-text-primary hover:text-text-secondary transition-colors p-1"
                                    onClick={() => {
                                        setShowBulkUpdate(false);
                                        setSelectedUpdateTables([]);
                                        setBulkUpdateData({});
                                        setBulkUpdateSearch("");
                                        setBulkUpdateGlobal({ table_type: "", status: "", location_zone: "" });
                                    }}
                                >
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            {/* Global Update Section */}
                            <div className="px-6 py-2 bg-gradient-to-r from-orange-50 to-yellow-50 border-b">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold mb-border-default text-text-secondary">Global Seating</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={bulkUpdateGlobal.table_type}
                                            onChange={e => {
                                                const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                                                setBulkUpdateGlobal(prev => ({ ...prev, table_type: value }));
                                            }}
                                            placeholder="Apply to all selected"
                                            className="w-full px-2 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-action-primary text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-border-default text-text-secondary">Global Status</label>
                                        <select
                                            value={bulkUpdateGlobal.status}
                                            onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full px-2 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-action-primary text-sm"
                                        >
                                            <option value="">-- No Change --</option>
                                            <option value="Vacant">Vacant</option>
                                            {/* <option value="Occupied">Occupied</option> */}
                                            <option value="Reserved">Reserved</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-border-default text-text-secondary">Global Zone</label>
                                        <select
                                            value={bulkUpdateGlobal.location_zone}
                                            onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, location_zone: e.target.value }))}
                                            className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-action-primary text-sm"
                                        >
                                            <option value="">-- No Change --</option>
                                            <option value="AC">AC</option>
                                            <option value="Non-AC">Non-AC</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="px-4 py-2 border-b bg-bg-primary">
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                                    <input
                                        type="text"
                                        placeholder="Search tables to update..."
                                        value={bulkUpdateSearch}
                                        onChange={e => setBulkUpdateSearch(e.target.value)}
                                        className="w-full pl-12 pr-4 py-1 border border-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-action-primary"
                                    />
                                </div>
                            </div>

                            {/* Select All */}
                            <div className="px-4 bg-bg-tertiary border-b-default">
                                <label className="flex items-center gap-3 cursor-pointer hover:bg-bg-primary p-1 rounded-lg transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedUpdateTables.length === getFilteredUpdateTables().length && getFilteredUpdateTables().length > 0}
                                        onChange={selectAllUpdateTables}
                                        className="w-3 h-3 text-action-primary rounded  focus:ring-action-primary"
                                    />
                                    <span className="font-semibold text-text-primary">
                                        Select All <span className="text-action-primary">({selectedUpdateTables.length} selected)</span>
                                    </span>
                                </label>
                            </div>

                            {/* Table List */}
                            <div className="flex-1 overflow-y-auto px-4 py-2">
                                <div className="space-y-3">
                                    {getFilteredUpdateTables().length === 0 ? (
                                        <div className="text-center py-12">
                                            <FaSearch className="text-text-secondary text-3xl mx-auto mb-3" />
                                            <p className="text-text-secondary font-medium">No tables found</p>
                                        </div>
                                    ) : (
                                        getFilteredUpdateTables().map(table => (
                                            <div key={table.id} className={`border-2 rounded-lg p-2 bg-bg-primary transition-all ${selectedUpdateTables.includes(table.id) ? 'border-orange-300 shadow-md' : 'border-gray-200 hover:shadow-md'
                                                }`}>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUpdateTables.includes(table.id)}
                                                        onChange={() => toggleUpdateTableSelection(table.id)}
                                                        className="w-3 h-3 text-action-primary rounded "
                                                    />
                                                    <span className="font-bold text-lg text-text-primary">{table.name}</span>
                                                    {selectedUpdateTables.includes(table.id) && (
                                                        <span className="ml-auto text-xs bg-bg-tertiary text-action-primary px-2 py-1 rounded-full font-semibold">Selected</span>
                                                    )}
                                                </div>

                                                {selectedUpdateTables.includes(table.id) ? (
                                                    <div className="grid xl:grid-cols-3 xl:gap-3 sm:grid-cols-1 sm:gap-2">
                                                        <div>
                                                            <label className="block text-xs font-semibold mb-1 text-text-secondary">Seating</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={bulkUpdateData[table.id]?.table_type ?? table.table_type ?? ""}
                                                                onChange={e => {
                                                                    const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                                                                    handleBulkUpdateChange(table.id, "table_type", value);
                                                                }}
                                                                placeholder={bulkUpdateGlobal.table_type ? `Global: ${bulkUpdateGlobal.table_type}` : ""}
                                                                className="w-full px-4 py-1.5 border border-border-default rounded text-sm focus:outline-none focus:ring-1 focus:ring-action-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold mb-1 text-text-secondary">Status</label>
                                                            <select
                                                                value={bulkUpdateData[table.id]?.status ?? table.status}
                                                                onChange={e => handleBulkUpdateChange(table.id, 'status', e.target.value)}
                                                                className="w-full px-4 py-1.5 border border-border-default rounded text-sm focus:outline-none focus:ring-1 focus:ring-action-primary"
                                                            >
                                                                <option value="Vacant">Vacant</option>
                                                                {/* <option value="Occupied">Occupied</option> */}
                                                                <option value="Reserved">Reserved</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold mb-1 text-text-secondary">Zone</label>
                                                            <select
                                                                value={bulkUpdateData[table.id]?.location_zone ?? table.location_zone}
                                                                onChange={e => handleBulkUpdateChange(table.id, 'location_zone', e.target.value)}
                                                                className="w-full px-4 py-1.5 border border-border-default rounded text-sm focus:outline-none focus:ring-1 focus:ring-action-primary"
                                                            >
                                                                <option value="AC">AC</option>
                                                                <option value="Non-AC">Non-AC</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className=" text-sm text-text-secondary bg-bg-tertiary p-2 rounded">
                                                        <strong>Seating:</strong> {table.table_type} | <strong>Status:</strong> {table.status} | <strong>Zone:</strong> {table.location_zone}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 bg-bg-tertiary border-t-default flex gap-5">
                                <button
                                    className="flex-1 bg-modalsUpdateBg-save text-text-white py-3 rounded-lg hover:bg-action-primary transition-colors font-bold shadow-md disabled:bg-bg-tertiary disabled:cursor-not-allowed flex items-center justify-center p-2 gap-2"
                                    onClick={saveBulkUpdate}
                                    disabled={selectedUpdateTables.length === 0}
                                >
                                    <FaCheck /> Update {selectedUpdateTables.length} Table(s)
                                </button>
                                <button
                                    className="flex-1 bg-modalsUpdateBg-cancel text-text-white py-3 rounded-lg hover:bg-bg-primary hover:text-text-primary transition-colors font-bold flex items-center justify-center gap-2"
                                    onClick={() => {
                                        setShowBulkUpdate(false);
                                        setSelectedUpdateTables([]);
                                        setBulkUpdateData({});
                                        setBulkUpdateSearch("");
                                        setBulkUpdateGlobal({ table_type: "", status: "", location_zone: "" });
                                    }}
                                >
                                    <FaTimes /> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Delete Modal */}
                {showBulkDelete && (
                    <div className="fixed inset-0 bg-color-modalsbg z-50 flex items-center justify-center p-4">
                        <div className="bg-bg-primary rounded-xl w-full max-w-xl shadow-card border-default border-border-default max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="px-4 py-2 border-b-default flex justify-between items-center bg-gradient-to-r from-red-50 to-pink-50">
                                <h3 className="text-xl font-bold text-action-danger flex items-center gap-2">
                                    Bulk Delete Tables
                                </h3>
                                <button className="text-text-primary hover:text-text-secondary transition-colors p-1" onClick={() => setShowBulkDelete(false)}>
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="px-4 py-2 border-b-default bg-bg-primary">
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                                    <input
                                        type="text"
                                        placeholder="Search tables to delete..."
                                        value={bulkDeleteSearch}
                                        onChange={e => setBulkDeleteSearch(e.target.value)}
                                        className="w-full pl-12 pr-4 py-2.5 border border-border-default rounded-lg focus:outline-none focus:ring-1 focus:ring-action-primary"
                                    />
                                </div>
                            </div>

                            {/* Select All */}
                            <div className="px-2 py-1 bg-bg-tertiary border-b-default">
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-bg-primary p-2 rounded-lg transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedDeleteTables.length === getFilteredDeleteTables().length && getFilteredDeleteTables().length > 0}
                                        onChange={selectAllDeleteTables}
                                        className="w-3 h-3 text-action-danger rounded"
                                    />
                                    <span className="font-semibold text-text-primary">
                                        Select All <span className="text-action-danger">({selectedDeleteTables.length} selected)</span>
                                    </span>
                                </label>
                            </div>

                            {/* Table List */}
                            <div className="flex-1 overflow-y-auto p-2">
                                <div className="space-y-2">
                                    {getFilteredDeleteTables().map(table => (
                                        <div key={table.id} className={`border-2 rounded-lg p-2 bg-bg-primary transition-all ${selectedDeleteTables.includes(table.id) ? 'border-action-danger shadow-card bg-red-50' : 'border-border-default hover:shadow-md'
                                            }`}>
                                            <label className="flex items-start gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDeleteTables.includes(table.id)}
                                                    onChange={() => toggleDeleteTableSelection(table.id)}
                                                    className="w-3 h-3 text-action-danger rounded focus:ring-1 focus:ring-action-danger"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-lg text-text-primary">{table.name}</span>
                                                        {selectedDeleteTables.includes(table.id) && (
                                                            <span className="text-xs bg-tableStatusBg-occupied text-action-danger px-2 py-1 rounded-full font-semibold">Will be deleted</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-text-secondary">
                                                        <strong>Seating:</strong> {table.table_type} | <strong>Status:</strong> {table.status} | <strong>Zone:</strong> {table.location_zone}
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 bg-bg-primary border-t flex gap-3">
                                <button
                                    className="flex-1 bg-action-danger text-text-white py-3 rounded-lg hover:bg-action-primary transition-colors font-bold shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    onClick={() => {
                                        setShowBulkDelete(false);
                                        setShowFirstDeleteConfirm(true);
                                    }}
                                    disabled={selectedDeleteTables.length === 0}
                                >
                                    <FaTrash /> Delete {selectedDeleteTables.length} Table(s)
                                </button>
                                <button
                                    className="flex-1 bg-modalsUpdateBg-cancel text-text-primary py-3 rounded-lg hover:bg-bg-tertiary transition-colors font-bold flex items-center justify-center gap-2"
                                    onClick={() => setShowBulkDelete(false)}
                                >
                                    <FaTimes /> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* First Delete Confirmation */}
                {showFirstDeleteConfirm && (
                    <div className="fixed inset-0 bg-color-modalsbg bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-bg-primary rounded-xl w-full max-w-md shadow-2xl border-2 border-border-default animate-scale-in">
                            <div className="p-6 text-center">
                                <h3 className="text-2xl font-bold text-text-primary mb-2">Confirm Deletion</h3>
                                <p className="text-text-secondary mb-3">
                                    Delete <strong className="text-action-danger text-xl">{selectedDeleteTables.length}</strong> table(s)?
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center mb-5 max-h-32 overflow-y-auto p-2 bg-bg-tertiary rounded-lg">
                                    {tables.filter(t => selectedDeleteTables.includes(t.id)).map(t => (
                                        <span key={t.id} className="px-2.5 py-1 bg-tableStatusBg-occupied text-action-danger rounded-full text-sm font-bold border border-red-300">
                                            {t.name}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        className="flex-1 bg-action-danger text-text-white py-2.5 rounded-lg hover:bg-action-primary transition-colors font-bold shadow-md"
                                        onClick={() => {
                                            setShowFirstDeleteConfirm(false);
                                            setShowSecondDeleteConfirm(true);
                                        }}
                                    >
                                        Continue
                                    </button>
                                    <button
                                        className="flex-1 bg-modalsUpdateBg-cancel text-text-primary py-2.5 rounded-lg hover:bg-bg-tertiary transition-colors font-bold"
                                        onClick={() => setShowFirstDeleteConfirm(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Second Delete Confirmation */}
                {showSecondDeleteConfirm && (
                    <div className="fixed inset-0 bg-color-modalsbg bg-opacity-70 z-50 flex items-center justify-center p-4">
                        <div className="bg-bg-primary rounded-xl w-full max-w-md shadow-2xl border-default border-red-300 animate-scale-in">
                            <div className="p-6 text-center">
                                <h3 className="text-2xl font-bold text-action-danger mb-3">Final Confirmation</h3>
                                <div className="bg-tableStatusBg-occupied border-2 border-red-300 rounded-lg p-3 mb-5">
                                    <p className="text-gray-800 font-semibold text-base mb-1">
                                        <span className="text-action-danger font-black text-lg">IRREVERSIBLE ACTION</span>
                                    </p>
                                    <p className="text-text-primary text-sm">
                                        All selected tables will be permanently deleted
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        className="flex-1 bg-action-danger text-text-white py-3 rounded-lg hover:bg-action-primary  transition-colors font-bold shadow-lg flex items-center justify-center gap-2"
                                        onClick={confirmBulkDelete}
                                    >
                                        <FaTrash /> Confirm Delete
                                    </button>
                                    <button
                                        className="flex-1 bg-modalsUpdateBg-cancel text-text-primary py-3 rounded-lg hover:bg-bg-tertiary transition-colors font-bold"
                                        onClick={() => {
                                            setShowSecondDeleteConfirm(false);
                                            setShowFirstDeleteConfirm(false);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Single Delete Confirmation */}
                {showConfirmDelete && (
                    <div className="fixed inset-0 bg-color-modalsbg bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-bg-primary rounded-xl w-full max-w-sm shadow-2xl border border-border-default animate-scale-in">
                            <div className="px-5 py-3 border-b rounded-xl flex justify-between items-center bg-gradient-to-r from-red-50 to-pink-50">
                                <h2 className="text-lg font-bold text-action-danger flex items-center gap-2">
                                    <FaTrash /> Delete Table
                                </h2>
                                <button onClick={() => setShowConfirmDelete(false)} className="text-text-primary hover:text-text-secondary transition-colors p-1 rounded-full">
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            <div className="p-5">
                                <div className="text-center">
                                    {/* <div className="text-5xl mb-3">🗑️</div> */}
                                    <p className="text-text-primary mb-3">
                                        Delete table <strong className="text-action-danger text-lg">{tables.find(t => t.id === deleteTableId)?.name || "this table"}</strong>?
                                    </p>
                                    <p className="text-sm text-action-danger bg-red-200 p-2 rounded border border-red-300 mb-4">
                                        This action cannot be undone
                                    </p>
                                    <div className="flex justify-center gap-3">
                                        <button className="bg-action-danger text-text-white rounded-lg px-6 py-2 font-semibold hover:bg-action-primary transition-colors shadow-md" onClick={confirmDelete}>Delete</button>
                                        <button className="bg-modalsUpdateBg-cancel text-text-primary rounded-lg px-6 py-2 font-semibold hover:bg-bg-tertiary transition-colors" onClick={() => setShowConfirmDelete(false)}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TableManagement;