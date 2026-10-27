import React, { useEffect, useState, useRef } from "react";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaUsers, FaClock, FaPlus } from "react-icons/fa";
import axios from 'axios';
import UniversalAddModal from "../../utils/Modals/UniversalAddModal";
import UniversalEditModal from "../../utils/Modals/UniversalEditModal";
import UniversalBulkUpdateModal from "../../utils/Modals/UniversalBulkUpdateModal";
import UniversalBulkDeleteModal from "../../utils/Modals/UniversalBulkDeleteModal";
import AccessGuard from "../../utils/Interceptors/ProtectedRoute";
import TableConfigModal from "../../utils/Modals/TableConfigModal";
import { menuCache } from '../../utils/Menu-utils/menuCache';

const TableManagement = ({ clientId, token, screenIds, userId, realm }) => {

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
    const [statusFilter, setStatusFilter] = useState("all");

    const [requiredScreenId, setRequiredScreenId] = useState(null);

    // Bulk Update States
    const [showBulkUpdate, setShowBulkUpdate] = useState(false);
    const [bulkUpdateSearch, setBulkUpdateSearch] = useState("");
    const [selectedUpdateTables, setSelectedUpdateTables] = useState([]);
    const [bulkUpdateData, setBulkUpdateData] = useState({});
    const [bulkUpdateGlobal, setBulkUpdateGlobal] = useState({
        table_type: "",
        status: "",
        config_id: ""
    });

    // Bulk Delete States
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [bulkDeleteSearch, setBulkDeleteSearch] = useState("");
    const [selectedDeleteTables, setSelectedDeleteTables] = useState([]);
    const [showFirstDeleteConfirm, setShowFirstDeleteConfirm] = useState(false);
    const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = useState(false);
    const [configs, setConfigs] = useState([]);
    const zones = [...new Set(configs.map(c => c.zone))];
    const sections = [...new Set(configs.map(c => c.section))];
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
        if (!clientId) return;

        fetchTables();
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
            const [tableRes, configRes] = await Promise.all([
                axios.get(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
                    { headers: { Authorization: `Bearer ${token}` } }
                ),
                axios.get(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
                    { params: { client_id: clientId }, headers: { Authorization: `Bearer ${token}` } }
                )
            ]);

            const result = tableRes.data;
            const freshConfigs = configRes.data || [];
            setConfigs(freshConfigs);
            setRequiredScreenId(result.screen_id);


            const tableList = Array.isArray(result?.data) ? result.data : [];
            const enrichedTables = tableList.map(t => {
                const matchedConfig = freshConfigs.find(
                    c =>
                        c.section?.trim().toLowerCase() === t.section?.trim().toLowerCase() &&
                        c.zone?.trim().toLowerCase() === t.location_zone?.trim().toLowerCase()
                );

                return {
                    ...t,
                    config_id: matchedConfig?.id || null
                };
            });

            setTables(enrichedTables);
            setOriginalTables(structuredClone(enrichedTables));

        } catch (error) {
            console.error("Error fetching tables:", error);
        } finally {
            setLoading(false);
        }
    };
    const fetchConfigs = async () => {
        const { sections } = await menuCache.fetchTablesConfig(clientId, token);
        setConfigs(sections);
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

        fetchConfigs();
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
            // Force a fresh fetch before generating so new configs are always picked up
            menuCache.remove('zoneConfig', clientId);
            const { sections: freshConfigs } = await menuCache.fetchTablesConfig(clientId, token);
            setConfigs(freshConfigs);
            for (let row of tableRanges) {
                if (!row.range || !row.config_id || !row.table_type) {
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
                    const config = freshConfigs.find(c => Number(c.id) === Number(row?.config_id));
                    if (!config) {
                        generatingRef.current = false;
                        setIsGenerating(false);
                        return;
                    }
                    const payload = {
                        client_id: clientId,
                        name: tableName.trim(),
                        table_type: row.table_type.toString(),
                        status: row.remark || "vacant",
                        section: config?.section,
                        location_zone: config?.zone,
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
            normalize(original?.config_id) !== normalize(table.config_id) ||
            normalize(original?.status) !== normalize(table.status);

        if (!hasChanged) {
            // Close modal
            setEditTable(null);
            setEditRowId(null);
            setEditFieldErrors({});
            return;
        }

        try {
            // 🔥 map config_id → section + zone
            const config = configs.find(c => Number(c.id) === Number(table?.config_id));

            const payload = {
                ...table,
                table_type: table.table_type.toString(),
                status: table.status.trim(),

                section: config?.section || table.section,
                location_zone: config?.zone || table.location_zone
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
            config_id: ""
        });

        const initialData = {};
        tables.forEach(table => {
            initialData[table.id] = {
                table_type: table.table_type,
                config_id: table.config_id,
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

                // ✅ NEW CONFIG LOGIC
                let finalConfigId = table.config_id;

                if (tableUpdates.config_id && tableUpdates.config_id !== table.config_id) {
                    finalConfigId = tableUpdates.config_id;
                } else if (bulkUpdateGlobal.config_id) {
                    finalConfigId = bulkUpdateGlobal.config_id;
                }

                // 🔥 find config
                const config = configs.find(c => Number(c.id) === Number(finalConfigId));
                const updatedFields = {
                    ...table,
                    table_type: finalTableType.toString(),
                    status: (finalStatus || "").toLowerCase().trim(),

                    // ✅ send what backend expects
                    section: config?.section || table.section,
                    location_zone: config?.zone || table.location_zone
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
                config_id: ""
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
    /* =====================================================================
   REPLACE everything in TableManagement.jsx from the line
       const searchedTables = tables.filter(t => {
   down to the end of the file with the code below.

   ALSO, in the top part of the file:
     1. add this state next to your other useState lines:
            const [statusFilter, setStatusFilter] = useState("all");
     2. FaUsers is already imported; FaCheck / FaClock are no longer needed.

   No CSS file is needed – everything uses tailwind.config.js tokens.
   ===================================================================== */

    // Full class strings (not built dynamically) so Tailwind keeps them.
    const STATE = {
        vacant: { label: "Vacant", bar: "border-t-state-vacant", chip: "bg-state-vacant-bg text-state-vacant" },
        occupied: { label: "Occupied", bar: "border-t-state-occupied", chip: "bg-state-occupied-bg text-state-occupied" },
        reserved: { label: "Reserved", bar: "border-t-state-reserved", chip: "bg-state-reserved-bg text-state-reserved" },
        other: { label: "Other", bar: "border-t-state-other", chip: "bg-state-other-bg text-state-other" },
    };
    const norm = (s) => {
        const v = (s || "").toLowerCase().trim();
        return v === "available" ? "vacant" : v;
    };
    const isKnown = (t) => ["vacant", "occupied", "reserved"].includes(norm(t.status));
    const stateOf = (t) => (isKnown(t) ? STATE[norm(t.status)] : { ...STATE.other, label: t.status || "Unknown" });

    const counts = {
        total: tables.length,
        vacant: tables.filter(t => norm(t.status) === "vacant").length,
        occupied: tables.filter(t => norm(t.status) === "occupied").length,
        reserved: tables.filter(t => norm(t.status) === "reserved").length,
        other: tables.filter(t => !isKnown(t)).length,
    };
    const totalSeats = tables.reduce((n, t) => n + (Number(t.table_type) || 0), 0);
    const occupancyPct = counts.total ? (100 * counts.occupied) / counts.total : 0;

    const searchedTables = tables.filter(t => {
        if (statusFilter !== "all") {
            if (statusFilter === "other" ? isKnown(t) : norm(t.status) !== statusFilter) return false;
        }
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

    const groupedBySection = filteredTables.reduce((acc, table) => {
        const config = configs.find(c => Number(c.id) === Number(table?.config_id));
        const sectionKey = config?.section?.toUpperCase() || table.section?.toUpperCase() || "Unassigned";
        const zoneKey = config?.zone?.toUpperCase() || table.location_zone?.toUpperCase() || "Unassigned";
        if (!acc[sectionKey]) acc[sectionKey] = {};
        if (!acc[sectionKey][zoneKey]) acc[sectionKey][zoneKey] = [];
        acc[sectionKey][zoneKey].push(table);
        return acc;
    }, {});
    const sectionEntries = Object.entries(groupedBySection);

    if (loading) {
        return (
            <div className="min-h-screen bg-canvas font-sans grid place-items-center text-brand-dark">
                <div className="text-center">
                    <div className="h-11 w-11 mx-auto mb-3 rounded-full border-4 border-brand-soft border-t-brand animate-spin-slow" />
                    <p className="text-ui-sm font-semibold">Loading tables…</p>
                </div>
            </div>
        );
    }

    const filterOptions = [
        ["all", "All", counts.total],
        ["vacant", "Vacant", counts.vacant],
        ["occupied", "Occupied", counts.occupied],
        ...(counts.other ? [["other", "Other", counts.other]] : []),
    ];

    return (
        <div className="ui-page">

            {/* Toolbar */}
            <section className="ui-panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                        <div className="relative w-full sm:max-w-xs">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ui text-ink-muted pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search table, section, zone or status"
                                aria-label="Search tables"
                                className="ui-input"
                            />
                        </div>

                        <div className="ui-toggle" role="group" aria-label="Filter by status">
                            {filterOptions.map(([key, label, n]) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={statusFilter === key}
                                    onClick={() => setStatusFilter(key)}
                                    className={`ui-toggle-btn ${statusFilter === key ? "ui-toggle-btn-active" : ""}`}
                                >
                                    {label} ({n})
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            className="ui-btn ui-btn-config"
                            onClick={() => setShowConfig(true)}
                        >
                            <FaEdit /> <span className="hidden md:inline">Config</span>
                        </button>

                        <button
                            className="ui-btn ui-btn-update"
                            onClick={openBulkUpdate}
                        >
                            <FaEdit /> <span className="hidden md:inline">Bulk update</span>
                        </button>

                        <button
                            className="ui-btn ui-btn-delete"
                            onClick={openBulkDelete}
                        >
                            <FaTrash /> <span className="hidden md:inline">Bulk delete</span>
                        </button>

                        <button
                            className="ui-btn ui-btn-add"
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
                            <FaPlus /> <span className="hidden md:inline">Add table</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Sections → zones → table cards */}
            {sectionEntries.length === 0 ? (
                <section className="ui-panel text-center py-10">
                    <FaSearch className="mx-auto mb-2.5 text-heading-sm text-brand-soft" />
                    <strong className="block text-body-sm text-ink-soft mb-1">No tables found</strong>
                    <p className="text-ui text-ink-muted">Change the search or status filter, or add a new table.</p>
                </section>
            ) : (
                sectionEntries.map(([sectionName, zoneGroups]) => {
                    const all = Object.values(zoneGroups).flat();
                    const vac = all.filter(t => norm(t.status) === "vacant").length;
                    const occ = all.filter(t => norm(t.status) === "occupied").length;
                    return (
                        <section className="ui-panel" key={sectionName}>
                            <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-line-divider">
                                <h3 className="text-panel-title text-brand-dark">{sectionName}</h3>
                                <span className="text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line">
                                    {all.length} table{all.length !== 1 ? "s" : ""}
                                </span>
                                <div className="ml-auto hidden sm:flex gap-2.5 text-ui-sm text-ink-muted">
                                    <span><b className="text-ink-soft">{vac}</b> vacant</span>
                                    <span><b className="text-ink-soft">{occ}</b> occupied</span>
                                </div>
                            </div>

                            {Object.entries(zoneGroups).map(([zoneName, zoneTables]) => (
                                <div className="mb-3.5 last:mb-0" key={zoneName}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="text-ui font-bold text-ink-soft">{zoneName}</h4>
                                        <span className="text-micro text-ink-muted">
                                            {zoneTables.length} table{zoneTables.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-tiles">
                                        {zoneTables.map(table => {
                                            const config = configs.find(c => Number(c.id) === Number(table?.config_id));
                                            const st = stateOf(table);
                                            return (
                                                <div
                                                    key={table.id}
                                                    className={`flex flex-col overflow-hidden bg-surface border border-line border-t-bar ${st.bar} rounded-panel shadow-panel hover:shadow-panel-hover transition-shadow duration-fast`}
                                                >
                                                    <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
                                                        <span className="text-body-sm font-bold text-brand-dark break-words">{table.name}</span>
                                                        <span className={`ui-chip ${st.chip}`}>{st.label}</span>
                                                    </div>

                                                    <div className="grid gap-0.5 px-3 pb-2.5 text-ui-sm text-ink-muted">
                                                        <div className="flex items-center gap-1.5 text-ui text-ink-soft">
                                                            <FaUsers className="text-brand text-ui-sm" />
                                                            <b>{table.table_type}</b> seats
                                                        </div>
                                                        <div>Zone: <b className="font-semibold text-ink-soft">{config?.zone || table.location_zone || "—"}</b></div>
                                                        <div>Section: <b className="font-semibold text-ink-soft">{config?.section || table.section || "—"}</b></div>
                                                    </div>

                                                    <div className="grid grid-cols-2 mt-auto border-t border-line-soft text-micro font-bold tracking-wide">
                                                        <button
                                                            className="py-2 bg-canvas/40 text-brand-dark hover:bg-brand-light transition-colors"
                                                            onClick={() => {
                                                                const copy = structuredClone(table);
                                                                editRef.current = copy;
                                                                setEditTable(copy);
                                                                setEditRowId(copy.id);
                                                            }}
                                                        >
                                                            EDIT
                                                        </button>
                                                        <button
                                                            className="py-2 bg-canvas/40 text-state-occupied border-l border-line-soft hover:bg-state-occupied-bg transition-colors"
                                                            onClick={() => {
                                                                setDeleteTableId(table.id);
                                                                setShowConfirmDelete(true);
                                                            }}
                                                        >
                                                            DELETE
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                })
            )}

            {/* Existing modals (unchanged props) */}
            <UniversalAddModal
                showModal={showAddTable}
                setShowModal={setShowAddTable}
                modalType="table"
                zones={zones}
                sections={sections}
                clientId={clientId}
                token={token}
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
                refresh={() => { fetchConfigs(); }}
                realm={realm}
            />

            {/* Bulk delete – step 1 */}
            {showFirstDeleteConfirm && (
                <div className="ui-backdrop font-sans">
                    <div className="ui-modal animate-scale-in" role="dialog" aria-modal="true" aria-label="Confirm deletion">
                        <h3 className="text-body font-bold text-state-occupied mb-2.5">
                            Delete {selectedDeleteTables.length} table{selectedDeleteTables.length !== 1 ? "s" : ""}?
                        </h3>
                        <p className="text-ui-sm text-ink-soft mb-3 leading-relaxed">
                            These tables will be removed from your restaurant:
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto p-2 mb-3.5 rounded-button bg-brand-light">
                            {tables.filter(t => selectedDeleteTables.includes(t.id)).map(t => (
                                <span key={t.id} className="text-ui-sm font-bold px-2.5 py-0.5 rounded-badge bg-state-occupied-bg text-state-occupied">
                                    {t.name}
                                </span>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button className="ui-btn" onClick={() => setShowFirstDeleteConfirm(false)}>Cancel</button>
                            <button
                                className="ui-btn ui-btn-danger"
                                onClick={() => {
                                    setShowFirstDeleteConfirm(false);
                                    setShowSecondDeleteConfirm(true);
                                }}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk delete – step 2 */}
            {showSecondDeleteConfirm && (
                <div className="ui-backdrop font-sans">
                    <div className="ui-modal animate-scale-in" role="dialog" aria-modal="true" aria-label="Final confirmation">
                        <h3 className="text-body font-bold text-state-occupied mb-2.5">Final confirmation</h3>
                        <div className="border-l-bar border-l-state-occupied pl-3 py-2 mb-3.5 text-ui text-ink-muted leading-relaxed">
                            <b className="text-state-occupied">This cannot be undone.</b> All selected tables will be permanently deleted.
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                className="ui-btn"
                                onClick={() => {
                                    setShowSecondDeleteConfirm(false);
                                    setShowFirstDeleteConfirm(false);
                                }}
                            >
                                Cancel
                            </button>
                            <button className="ui-btn ui-btn-danger" onClick={confirmBulkDelete}>
                                <FaTrash /> Delete tables
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Single delete */}
            {showConfirmDelete && (
                <div className="ui-backdrop font-sans" onMouseDown={() => setShowConfirmDelete(false)}>
                    <div
                        className="ui-modal animate-scale-in"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Delete table"
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 mb-2.5">
                            <h3 className="text-body font-bold text-state-occupied">Delete table</h3>
                            <button
                                className="grid place-items-center h-7 w-7 rounded-button-sm border border-brand-line text-ink-muted hover:bg-brand-light"
                                onClick={() => setShowConfirmDelete(false)}
                                aria-label="Close"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <p className="text-ui-sm text-ink-soft mb-3">
                            Delete table{" "}
                            <strong className="text-state-occupied">
                                {tables.find(t => t.id === deleteTableId)?.name || "this table"}
                            </strong>?
                        </p>
                        <div className="border-l-bar border-l-state-occupied pl-3 py-1.5 mb-3.5 text-ui text-state-occupied font-bold">
                            This cannot be undone.
                        </div>
                        <div className="flex justify-end gap-2">
                            <button className="ui-btn" onClick={() => setShowConfirmDelete(false)}>Cancel</button>
                            <button className="ui-btn ui-btn-danger" onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableManagement;