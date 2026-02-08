import React, { useEffect, useState, useRef } from "react";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaUsers, FaClock, FaPlus } from "react-icons/fa";
import axios from 'axios';
import { toast } from "react-toastify";
import UniversalAddModal_V1 from "../Modals/UniversalAddModal_V1";
import UniversalEditModal_V1 from "../Modals/UniversalEditModal_V1";
import UniversalBulkUpdateModal from "../../utils/Modals/UniversalBulkUpdateModal";
import UniversalBulkDeleteModal from "../../utils/Modals/UniversalBulkDeleteModal";
import AccessGuard from "../../utils/Interceptors/ProtectedRoute";

const statusConfig = {
    Active: {
        card: "border-action-primary",
        icon: <FaCheck className="text-action-success text-xl" />,
        label: "Active"
    },
    Busy: {
        card: "border-yellow-400",
        icon: <FaUsers className="text-yellow-600 text-xl" />,
        label: "Busy"
    },
    Closed: {
        card: "border-border-default",
        icon: <FaTimes className="text-gray-600 text-xl" />,
        label: "Closed"
    }
};


const CounterManagement = ({ clientId, token, screenIds, userId }) => {
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

    const [requiredScreenId, setRequiredScreenId] = useState(null);

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

    const [viewMode, setViewMode] = useState(false);
    const [addItemsMode, setAddItemsMode] = useState(false);
    const getColumnsByScreen = () => {
        const width = window.innerWidth;

        if (width >= 1536) return 8; // 2xl
        if (width >= 1280) return 6; // xl
        if (width >= 1024) return 6; // lg
        if (width >= 640) return 4;  // sm
        return 2;                    // mobile
    };
    useEffect(() => {
        if (clientId) fetchTables();
    }, [clientId]);
    const [colsPerRow, setColsPerRow] = useState(getColumnsByScreen());

    useEffect(() => {
        const onResize = () => {
            setColsPerRow(getColumnsByScreen());
        };

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const getSortedTables = (items, COLS_PER_ROW) => {
        const active = items.filter(t => t.status === "Active");
        const busy = items.filter(t => t.status === "Busy");
        const closed = items.filter(t => t.status === "Closed");

        const sorted = [...active, ...busy, ...closed];

        return sorted.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true })
        );
    };



    const fetchTables = async () => {
        if (!clientId) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const result = res.data;
            setRequiredScreenId(result.screen_id);

            if (result.screen_id === "default_tables") {
                const tableList = Array.isArray(result?.data) ? result.data : [];

                // Exclude takeaway table
                const filteredTables = tableList
                .filter(table => table.id !== 500)
                    .sort((a, b) =>
                        a.name.localeCompare(b.name, undefined, { numeric: true })
                    );

                setTables(filteredTables);
                setOriginalTables(filteredTables);
            }console.log("ALL TABLES FROM API", result.data);
            console.log("SCREEN ID", result.screen_id);
            
        } catch (error) {
            console.error("Error fetching tables:", error);
        } finally {
            setLoading(false);
        }
    };
    const validateCounterName = (name, existingCounters) => {
        if (!name || !name.trim()) {
            return "Counter name is required";
        }

        const normalized = name.trim().toLowerCase();

        const existingNames = existingCounters.map(
            c => c.name?.trim().toLowerCase()
        );

        if (existingNames.includes(normalized)) {
            return `Counter "${name}" already exists`;
        }

        return null; // ✅ valid
    };

    const generateTables = async () => {
        if (generatingRef.current) return;
        generatingRef.current = true;
        setIsGenerating(true);

        try {
            const newErrors = tableRanges.map(row => ({
                range: !row.range,
                table_type: !row.table_type,
                location_zone: !row.location_zone
            }));

            setFieldErrors(newErrors);

            const validRows = tableRanges.filter((row, index) =>
                !newErrors[index].range &&
                !newErrors[index].table_type &&
                !newErrors[index].location_zone
            );

            if (validRows.length === 0) {
                toast.error('Fill the fields')
                return;
            }

            const payload = [];
            for (let row of validRows) {
                payload.push({
                    client_id: clientId,
                    name: row.range.trim(),
                    table_type: row.table_type.toString(),
                    status: row.remark || "Active",
                    location_zone: row.location_zone,
                    slug: `${clientId}-${row.range.trim().toLowerCase().replace(/\s+/g, '-')}`
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
                        alert(`Counter name "${data.name}" already exists!`);
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

    const saveEdit = async (updatedTable) => {
        // 1️⃣ Optimistic UI update
        setTables(prev =>
          prev.map(t =>
            t.id === updatedTable.id ? { ...updatedTable } : t
          )
        );
      
        setEditRowId(null);
      
        try {
          await axios.post(
            `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
            {
              ...updatedTable,
              table_type: updatedTable.table_type.toString()
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
      
          // Optional: silent refetch to stay in sync
          fetchTables();
      
        } catch (err) {
          toast.error("Failed to update counter");
          fetchTables(); // rollback safety
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
                let finalSection = table.section;
                if (tableUpdates.section && tableUpdates.section !== table.section) {
                    finalSection = tableUpdates.section;
                } else if (bulkUpdateGlobal.section) {
                    finalSection = bulkUpdateGlobal.section;
                }

                const updatedFields = {
                    ...table,
                    table_type: finalTableType.toString(),
                    status: finalStatus,
                    location_zone: finalZone,
                    section: finalSection,
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

    
    // const filteredTables = tables.filter(
    //     table => Number(table.id) === 501 || Number(table.id) === 502
    // );
    
    
    const filteredTables = getSortedTables(
        tables.filter(table => {
            const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !statusFilter || table.status === statusFilter;
            return matchesSearch && matchesStatus;
        }), colsPerRow
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg font-medium">Loading Counters...</p>
                </div>
            </div>
        );
    }

    return (
        <AccessGuard screenIds={screenIds} requiredScreenId={requiredScreenId} clientId={clientId} requesterId={userId}>
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
                                        placeholder="Search counters..."
                                        className="w-full pl-10 pr-3 py-2 border-default border-border-default rounded-lg focus:outline-none  focus:border-action-primary bg-bg-primary text-text-primary"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 border-default border-border-default rounded-lg focus:outline-none focus:ring-2 focus:border-action-primary bg-bg-primary text-text-primary"
                                >
                                    <option value="">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Busy">Busy</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {/* <button
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
                                </button> */}
                                <button
                                    className="flex items-center gap-2 px-4 py-2 bg-bulkActions-adding text-text-white rounded-lg hover:bg-bulkActionsHover-addingHover hover:text-text-primary transition-colors font-semibold text-sm shadow-md"
                                    onClick={() => {
                                        setShowAddTable(true);
                                        setTableRanges([{
                                            range: "",
                                            table_type: "",
                                            location_zone: "",
                                            remark: "Active",
                                            is_active: false,
                                            description: "",
                                            slug: "",
                                            sort_order: "",
                                            qr_code_url: ""
                                        }]);

                                        setFieldErrors([{}]);
                                    }}
                                >
                                    <FaPlus /> <span>Add Counter</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-2 sm:gap-3">
                        {filteredTables.map(counter => {
                            const config = statusConfig[counter.status] || statusConfig.Active;

                            return (
                                <div
                                    key={counter.id}
                                    className={`relative rounded-xl border-2 ${config.card}
        bg-bg-primary shadow-sm hover:shadow-md transition-all duration-200`}
                                >
                                    {/* STATUS BADGE */}
                                    <div className="absolute top-2 right-2">
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold
            ${counter.status === 'Active' && 'bg-green-100 text-green-700'}
            ${counter.status === 'Busy' && 'bg-yellow-100 text-yellow-700'}
            ${counter.status === 'Closed' && 'bg-gray-200 text-gray-700'}
          `}
                                        >
                                            {counter.status}
                                        </span>
                                    </div>

                                    {/* BODY */}
                                    <div className="p-4 space-y-3">
                                        {/* COUNTER NAME */}
                                        <div className="text-sm md:text-lg font-bold text-text-primary">
                                            {counter.name}
                                        </div>

                                        {/* ZONE */}
                                        <div className="inline-flex items-center px-2.5 py-1 rounded-md
          bg-bg-tertiary text-xs font-medium text-text-secondary">
                                           {counter.location_zone}
                                        </div>

                                        {/* TERMINALS */}
                                        <div className="flex items-center gap-2 text-sm text-text-primary">
                                            <FaUsers className="text-action-primary" />
                                            <span>
                                                Terminals:
                                                <span className="font-bold ml-1">{counter.table_type}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* FOOTER ACTIONS */}
                                    <div className="grid grid-cols-2 border-t text-xs font-semibold">
                                        <button
                                            onClick={() => setEditRowId(counter.id)}
                                            className="py-2 hover:bg-bg-tertiary transition"
                                        >
                                            EDIT
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDeleteTableId(counter.id);
                                                setShowConfirmDelete(true);
                                            }}
                                            className="py-2 text-action-danger hover:bg-red-50 transition border-l"
                                        >
                                            DELETE
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
                            <p className="text-text-secondary text-lg font-medium">No counters found</p>
                            <p className="text-text-secondary text-sm mt-1">Try adjusting your search or filter criteria</p>
                        </div>
                    )}

                    <UniversalAddModal_V1
                        showModal={showAddTable}
                        setShowModal={setShowAddTable}
                        modalType="table"

                        // Table-specific props
                        tableRanges={tableRanges}
                        setTableRanges={setTableRanges}
                        fieldErrors={fieldErrors}
                        setFieldErrors={setFieldErrors}
                        isGenerating={isGenerating}
                        generateTables={generateTables}
                    />
                    <UniversalEditModal_V1
                        showModal={editRowId !== null}
                        setShowModal={(show) => !show && setEditRowId(null)}
                        modalType="table"

                        // Table-specific props
                        editRowId={editRowId}
                        setEditRowId={setEditRowId}
                        tables={tables}
                        handleEditChange={handleEditChange}
                        saveEdit={saveEdit}
                        editFieldErrors={editFieldErrors}
                    />

                    <UniversalBulkUpdateModal
                        showModal={showBulkUpdate}
                        setShowModal={setShowBulkUpdate}
                        modalType="table"

                        // Table-specific props
                        tables={tables}
                        bulkUpdateSearch={bulkUpdateSearch}
                        setBulkUpdateSearch={setBulkUpdateSearch}
                        selectedUpdateTables={selectedUpdateTables}
                        setSelectedUpdateTables={setSelectedUpdateTables}
                        bulkUpdateData={bulkUpdateData}
                        setBulkUpdateData={setBulkUpdateData}
                        bulkUpdateGlobal={bulkUpdateGlobal}
                        setBulkUpdateGlobal={setBulkUpdateGlobal}
                        handleBulkUpdateChange={handleBulkUpdateChange}
                        saveBulkUpdate={saveBulkUpdate}
                        getFilteredUpdateTables={getFilteredUpdateTables}
                    />

                    <UniversalBulkDeleteModal
                        showModal={showBulkDelete}
                        setShowModal={setShowBulkDelete}
                        modalType="table"
                        tables={tables}
                        bulkDeleteSearch={bulkDeleteSearch}
                        setBulkDeleteSearch={setBulkDeleteSearch}
                        selectedDeleteTables={selectedDeleteTables}
                        setSelectedDeleteTables={setSelectedDeleteTables}
                        showFirstDeleteConfirm={showFirstDeleteConfirm}
                        setShowFirstDeleteConfirm={setShowFirstDeleteConfirm}
                        showSecondDeleteConfirm={showSecondDeleteConfirm}
                        setShowSecondDeleteConfirm={setShowSecondDeleteConfirm}
                        confirmBulkDelete={confirmBulkDelete}
                        getFilteredDeleteTables={getFilteredDeleteTables}
                    />

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
        </AccessGuard>
    );
};

export default CounterManagement;
