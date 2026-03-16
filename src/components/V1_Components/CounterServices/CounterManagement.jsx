import React, { useEffect, useState, useRef } from "react";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaUsers, FaClock, FaPlus } from "react-icons/fa";
import axios from 'axios';
import UniversalAddModal from "../../utils/Modals/UniversalAddModal";
import UniversalEditModal from "../../utils/Modals/UniversalEditModal";
import UniversalBulkUpdateModal from "../../utils/Modals/UniversalBulkUpdateModal";
import UniversalBulkDeleteModal from "../../utils/Modals/UniversalBulkDeleteModal";
import AccessGuard from "../../utils/Interceptors/ProtectedRoute";
import TableConfigModal from "../../utils/Modals/TableConfigModal";

const CounterManagement = ({ clientId, token, screenIds, userId }) => {

    const [searchTerm, setSearchTerm] = useState("");
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

    const [zones, setZones] = useState([]);
    const [sections, setSections] = useState([]);
    const [showConfig, setShowConfig] = useState(false);
    const [editTable, setEditTable] = useState(null);
    const editRef = useRef(null);


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


    const getSortedTables = (tablesToSort, COLS_PER_ROW) => {

        const normalize = (s) => (s || "").toLowerCase();

        const vacant = [];
        const reserved = [];
        const occupied = [];
        const others = [];

        tablesToSort.forEach(t => {
            const s = normalize(t.status);

            if (s === "vacant" || s === "available") vacant.push(t);
            else if (s === "reserved") reserved.push(t);
            else if (s === "occupied") occupied.push(t);
            else others.push(t); // cleaning, billing, running etc
        });

        const sorter = (a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true });

        vacant.sort(sorter);
        reserved.sort(sorter);
        occupied.sort(sorter);
        others.sort(sorter);

        const totalTables = tablesToSort.length;
        const totalRows = Math.ceil(totalTables / COLS_PER_ROW);

        const grid = Array.from({ length: totalRows }, () =>
            Array(COLS_PER_ROW).fill(null)
        );

        const canFill = (row, col) =>
            row * COLS_PER_ROW + col < totalTables;

        /* -------- RESERVED → RIGHT SIDE (TOP) -------- */      let filledCount = 0;
        let resIndex = 0;
        for (let col = COLS_PER_ROW - 1; col >= 0 && resIndex < reserved.length; col--) {
            for (let row = 0; row < totalRows && resIndex < reserved.length; row++) {
                if (!grid[row][col] && canFill(row, col)) {
                    grid[row][col] = reserved[resIndex++];
                    filledCount++;
                }
            }
        }

        /* ---------------- OCCUPIED (below reserved, right-side) ---------------- */
        let occIndex = 0;
        for (let col = COLS_PER_ROW - 1; col >= 0 && occIndex < occupied.length; col--) {
            for (let row = 0; row < totalRows && occIndex < occupied.length; row++) {
                if (!grid[row][col] && canFill(row, col)) {
                    grid[row][col] = occupied[occIndex++];
                    filledCount++;
                }
            }
        }

        /* ---------------- VACANT (everything else) ---------------- */
        let vacIndex = 0;
        for (let row = 0; row < totalRows && vacIndex < vacant.length; row++) {
            for (let col = 0; col < COLS_PER_ROW && vacIndex < vacant.length; col++) {
                if (!grid[row][col] && canFill(row, col)) {
                    grid[row][col] = vacant[vacIndex++];
                    filledCount++;
                }
            }
        }

        return grid.flat().filter(Boolean);
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
                setTables(tableList);
                setOriginalTables(structuredClone(tableList));


            }
        } catch (error) {
            console.error("Error fetching tables:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterValues = async (categoryId, setter) => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
                {
                    params: { category_id: categoryId },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setter(res.data.data || []);

        } catch (err) {
            console.error(`Error fetching ${categoryId}:`, err);
            setter([]);
        }
    };



    useEffect(() => {
        if (!clientId || !token) return;

        fetchMasterValues("zone", setZones);
        fetchMasterValues("section", setSections);

    }, [clientId, token]);

    const parseTableRangeFlexible = (input) => {
        if (!input || !input.trim()) return [];
        const parts = input.split(",").map(p => p.trim()).filter(Boolean);
        const tables = [];
        for (const part of parts) {
            // ---------- RANGE (r1:r5) ----------
            if (part.includes(":")) {
                const [start, end] = part.split(":");
                // Extract prefix and numbers
                const prefixStart = start.match(/[A-Za-z]+/)?.[0]?.toUpperCase() || "";
                const prefixEnd = end.match(/[A-Za-z]+/)?.[0]?.toUpperCase() || "";
                const numStart = parseInt(start.match(/\d+/)?.[0]);
                const numEnd = parseInt(end.match(/\d+/)?.[0]);
                if (!numStart || !numEnd || prefixStart !== prefixEnd) continue;
                // Always pad to 2 digits
                for (let i = numStart; i <= numEnd; i++) {
                    tables.push(prefixStart + String(i).padStart(2, "0"));
                }
            }
            // ---------- SINGLE NAME (shanmugam) ----------
            else {
                tables.push(part.trim().toUpperCase());
            }
        }
        return tables;
    };
    const generateTables = async () => {
        if (generatingRef.current) return;
        generatingRef.current = true;
        setIsGenerating(true);
        try {
            for (let row of tableRanges) {
                if (!row.range || !row.section || !row.location_zone || !row.table_type) {
                    generatingRef.current = false;
                    setIsGenerating(false);
                    return;
                }
                const tableNames = parseTableRangeFlexible(row.range);
                if (tableNames.length === 0) {
                    generatingRef.current = false;
                    setIsGenerating(false);
                    return;
                }
                for (const tableName of tableNames) {
                    const alreadyExists = tables.some(
                        t => t.name.toUpperCase() === tableName.toUpperCase()
                    );
                    if (alreadyExists) {
                        alert(`Table "${tableName}" already exists!!!`)
                        continue;
                    }
                    const payload = {
                        client_id: clientId,
                        name: tableName.trim(),
                        table_type: row.table_type.toString(),
                        status: row.remark || "vacant",
                        section: row.section,
                        location_zone: row.location_zone,
                        description: "",
                        sort_order: null,
                        is_active: true,
                        qr_code_url: "",
                        slug: `${clientId}-${tableName.replace(/\s+/g, '-').toLowerCase()}`
                    };
                    await axios.post(
                        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/create`,
                        payload,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            }
            await fetchTables();
            setShowAddTable(false);
            setTableRanges([]);
        } catch (err) {
            console.error(err);
        } finally {
            generatingRef.current = false;
            setIsGenerating(false);
        }
    };
    const handleEditChange = (id, field, value) => {
        setEditTable(prev => {
            const updated = {
                ...prev,
                [field]: field === "table_type"
                    ? Math.max(1, Number(value) || 1)
                    : value
            };

            editRef.current = updated;   // ⭐ IMPORTANT
            return updated;
        });


        setEditFieldErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
    };


    const saveEdit = async () => {
        const table = editRef.current;

        // Validation
        let errors = {};
        if (Number(table.table_type) < 1) {
            errors.table_type = 'Seating must be at least 1';
        }
        if (!table.table_type || table.table_type.toString().trim() === '') {
            errors.table_type = 'Required';
        }
        // if (!table.section || table.section.trim() === '') {
        //     errors.section = 'Required';
        // }
        if (!table.status || table.status.trim() === '') {
            errors.status = 'Required';
        }

        if (Object.keys(errors).length > 0) {
            setEditFieldErrors(errors);
            return;
        }

        setEditFieldErrors({});

        const original = originalTables.find(t => t.id === table.id);

        const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

        const hasChanged =
            normalize(original?.table_type) !== normalize(table.table_type) ||
            normalize(original?.location_zone) !== normalize(table.location_zone) ||
            normalize(original?.section) !== normalize(table.section) ||
            normalize(original?.status) !== normalize(table.status);

        if (!hasChanged) {
            // Close modal
            setEditTable(null);
            setEditRowId(null);
            setEditFieldErrors({});
            return;
        }

        try {
            const payload = {
                ...table,
                table_type: table.table_type.toString(),
                status: table.status.trim()  // Keep exact casing from dropdown
            };

            console.log("Sending update payload:", payload);

            await axios.post(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Close modal BEFORE fetching to prevent stale data issues
            setEditTable(null);
            setEditRowId(null);
            setEditFieldErrors({});

            // Refresh table list
            await fetchTables();

        } catch (err) {
            console.error("Error updating table", err);
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
                    status: (finalStatus || "").toLowerCase().trim(),
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
    const searchedTables = tables.filter(t => {
        if (!searchTerm.trim()) return true;

        const text = searchTerm.toLowerCase();

        return (
            t.name?.toLowerCase().includes(text) ||
            t.section?.toLowerCase().includes(text) ||
            t.location_zone?.toLowerCase().includes(text) ||
            t.status?.toLowerCase().includes(text)
        );
    });

    const filteredTables = getSortedTables(searchedTables, colsPerRow);


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
                                <div className="relative w-full sm:max-w-xs">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search table / section / zone / status..."
                                        className="w-full pl-10 pr-3 py-2 border border-border-default rounded-lg focus:outline-none focus:border-action-primary bg-bg-primary text-text-primary"
                                    />
                                </div>
                            </div>


                            <div className="flex flex-wrap gap-2 justify-center">
                                <button
                                    className="flex items-center gap-2 px-4 py-2 bg-action-success text-text-white rounded-lg transition-colors font-semibold text-sm shadow-md"
                                    onClick={() => setShowConfig(true)}
                                >
                                    <FaEdit />   <span className="hidden md:inline">Config</span>
                                </button>

                                <button
                                    className="flex items-center gap-2 px-4 py-2 bg-action-primary text-text-white rounded-lg hover:bg-bulkActionsHover-updateHover hover:text-text-primary transition-colors font-semibold text-sm shadow-md"
                                    onClick={openBulkUpdate}
                                >
                                    <FaEdit />
                                    <span className="hidden md:inline">Bulk Update</span>
                                </button>

                                <button
                                    className="flex items-center gap-2 px-4 py-2 bg-bulkActions-delete text-text-white rounded-lg hover:bg-bulkActionsHover-deleteHover hover:text-text-primary transition-colors font-semibold text-sm shadow-md"
                                    onClick={openBulkDelete}
                                >
                                    <FaTrash /> <span className="hidden md:inline">Bulk Delete</span>
                                </button>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 bg-bulkActions-adding text-text-white rounded-lg hover:bg-bulkActionsHover-addingHover hover:text-text-primary transition-colors font-semibold text-sm shadow-md"
                                    onClick={() => {
                                        setShowAddTable(true);
                                        setTableRanges([{
                                            range: "",
                                            table_type: "",
                                            section: "",
                                            location_zone: "",
                                            remark: "vacant",
                                            is_active: false,
                                            description: "",
                                            slug: "",
                                            sort_order: "",
                                            qr_code_url: ""
                                        }]);

                                        setFieldErrors([{}]);
                                    }}
                                >
                                    <FaPlus /> <span className="hidden md:inline">Add Table</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-3">
                        {filteredTables.map(table => {
                            return (
                                <div
                                    key={table.id}
                                    className={`border-2 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition
    ${table.status === "vacant" ? "border-border-default" :
                                            table.status === "Occupied" ? "border-red-400" :
                                                "border-blue-400"}`}
                                >

                                    {/* HEADER */}
                                    <div className={`flex justify-between items-center px-3 py-2 text-sm font-bold
    ${table.status === "vacant" ? "bg-action-primary text-white" :
                                            table.status === "Occupied" ? "bg-action-primary text-white" :
                                                "bg-action-primary text-white"}`}>

                                        <span>{table.name}</span>

                                        <div className="flex gap-3 items-center text-xs font-semibold">
                                            <span className="capitalize font-semibold">
                                                {table.status}
                                            </span>

                                        </div>
                                    </div>

                                    {/* BODY */}
                                    <div className="px-3 py-3 text-sm text-text-primary flex justify-between">
                                        <div className=""> <div className="font-medium">{table.location_zone}</div>
                                            <div className="text-xs text-text-secondary mt-1">
                                                Seats: <span className="font-bold">{table.table_type}</span>
                                            </div>
                                        </div>
                                        <div className="">
                                            <span className="text-md font-semibold">{table.section}</span>
                                        </div>

                                    </div>

                                    {/* FOOTER */}
                                    <div className="grid grid-cols-2 border-t text-xs font-semibold">
                                        <button
                                            onClick={() => {
                                                const copy = structuredClone(table);
                                                editRef.current = copy;   // ⭐ IMPORTANT
                                                setEditTable(copy);
                                                setEditRowId(copy.id);
                                            }}

                                            className="py-2 hover:bg-bg-tertiary transition"
                                        >
                                            EDIT
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDeleteTableId(table.id);
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
                            <p className="text-text-secondary text-lg font-medium">No tables found</p>
                            <p className="text-text-secondary text-sm mt-1">Try adjusting your search or filter criteria</p>
                        </div>
                    )}

                    <UniversalAddModal
                        showModal={showAddTable}
                        setShowModal={setShowAddTable}
                        modalType="table"
                        zones={zones}
                        sections={sections}
                        clientId={clientId}
                        token={token}
                        // Table-specific props
                        tableRanges={tableRanges}
                        setTableRanges={setTableRanges}
                        fieldErrors={fieldErrors}
                        setFieldErrors={setFieldErrors}
                        isGenerating={isGenerating}
                        generateTables={generateTables}
                    />
                    <UniversalEditModal
                        showModal={!!editTable}
                        setShowModal={(show) => {
                            if (!show) {
                                setEditTable(null);
                                setEditRowId(null);
                                setEditFieldErrors({});
                            }
                        }}
                        modalType="table"
                        zones={zones}
                        sections={sections}
                        clientId={clientId}
                        token={token}
                        editRowId={editRowId}
                        setEditRowId={setEditRowId}
                        table={editTable}
                        handleEditChange={handleEditChange}
                        saveEdit={saveEdit}
                        editFieldErrors={editFieldErrors}
                    />

                    <UniversalBulkUpdateModal
                        showModal={showBulkUpdate}
                        setShowModal={setShowBulkUpdate}
                        modalType="table"
                        zones={zones}
                        sections={sections}
                        clientId={clientId}
                        token={token}
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
                    <TableConfigModal
                        show={showConfig}
                        onClose={() => setShowConfig(false)}
                        clientId={clientId}
                        token={token}
                        refresh={() => {
                            fetchMasterValues("zone", setZones);
                            fetchMasterValues("section", setSections);
                        }}
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
