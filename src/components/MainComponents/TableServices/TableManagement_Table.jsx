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
import { IoSettingsOutline } from "react-icons/io5";

// ─── Status chips (same tokens as the card view) ───────────────────────────────

const STATE = {
    vacant: { label: "Vacant", chip: "bg-state-vacant-bg text-state-vacant" },
    occupied: { label: "Occupied", chip: "bg-state-occupied-bg text-state-occupied" },
    reserved: { label: "Reserved", chip: "bg-state-reserved-bg text-state-reserved" },
    other: { label: "Other", chip: "bg-state-other-bg text-state-other" },
};
const normStatus = (s) => {
    const v = (s || "").toString().toLowerCase().trim();
    return v === "available" ? "vacant" : v;
};
const stateOf = (t) => {
    const key = normStatus(t.status);
    return ["vacant", "occupied", "reserved"].includes(key)
        ? STATE[key]
        : { ...STATE.other, label: t.status || "Unknown" };
};

// ─── Paginated table (module level so its page state survives re-renders) ──────

const PaginatedTable = ({
    columns,
    rows,
    rowKey,
    pageSize = 10,
    minWidth = "min-w-[640px]",
    emptyText = "No data",
}) => {
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const current = Math.min(page, totalPages); // stays valid after search / delete
    const startIdx = (current - 1) * pageSize;
    const pageRows = rows.slice(startIdx, startIdx + pageSize);

    // up to 5 page buttons around the current page
    const first = Math.max(1, Math.min(current - 2, totalPages - 4));
    const last = Math.min(totalPages, first + 4);
    const pageNumbers = [];
    for (let i = first; i <= last; i++) pageNumbers.push(i);

    const navBtn = "ui-btn !h-8 !px-2.5 text-ui-sm disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="rounded-panel border border-line-soft overflow-hidden">
            <div className="overflow-x-auto">
                <table className={`w-full ${minWidth} border-collapse`}>
                    <thead>
                        <tr className="bg-brand-light border-b border-brand-line">
                            {columns.map(c => (
                                <th
                                    key={c.header}
                                    className={`text-left text-ui-sm font-bold text-brand-dark px-3 py-2 whitespace-nowrap ${c.align === "right" ? "text-right" : ""}`}
                                >
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-3 py-8 text-center text-ui text-ink-muted">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            pageRows.map(r => (
                                <tr key={rowKey(r)} className="border-b border-line-soft last:border-b-0 even:bg-canvas/40">
                                    {columns.map(c => (
                                        <td
                                            key={c.header}
                                            className={`px-3 py-2 text-ui text-ink-soft whitespace-nowrap ${c.align === "right" ? "text-right" : ""} ${c.cellClass || ""}`}
                                        >
                                            {c.render(r)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {rows.length > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2.5 border-t border-line-soft">
                    <p className="text-ui-sm text-ink-muted">
                        Showing {startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)} of {rows.length}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1">
                        <button className={navBtn} disabled={current === 1} onClick={() => setPage(1)}>First</button>
                        <button className={navBtn} disabled={current === 1} onClick={() => setPage(current - 1)}>Prev</button>
                        {pageNumbers.map(n => (
                            <button
                                key={n}
                                onClick={() => setPage(n)}
                                aria-current={n === current ? "page" : undefined}
                                className={`ui-btn !h-8 !px-2.5 min-w-[32px] text-ui-sm ${n === current ? "ui-btn-add" : ""}`}
                            >
                                {n}
                            </button>
                        ))}
                        <button className={navBtn} disabled={current === totalPages} onClick={() => setPage(current + 1)}>Next</button>
                        <button className={navBtn} disabled={current === totalPages} onClick={() => setPage(totalPages)}>Last</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const TableManagement_Table = ({ clientId, token, screenIds, userId, realm}) => {

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
            <div className="min-h-screen bg-canvas font-sans grid place-items-center text-brand-dark">
                <div className="text-center">
                    <div className="h-11 w-11 mx-auto mb-3 rounded-full border-4 border-brand-soft border-t-brand animate-spin-slow" />
                    <p className="text-ui-sm font-semibold">Loading tables…</p>
                </div>
            </div>
        );
    }

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
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            className="ui-btn ui-btn-config"
                            onClick={() => setShowConfig(true)}
                        >
                            <IoSettingsOutline /> <span className="hidden md:inline">Config</span>
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

            {/* ================= DASHBOARD ================= */}
            {(() => {
                // ---------- helpers (local to this render only) ----------
                const norm = (s) => (s || "").toString().trim().toLowerCase();
                const isVacant = (t) => ["vacant", "available"].includes(norm(t.status));
                const isOccupied = (t) => norm(t.status) === "occupied";
                const seatsOf = (t) => Number(t.table_type) || 0;
                const pct = (n, d) => (d > 0 ? `${Number(((n / d) * 100).toFixed(2))}%` : "0%");
                const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "-");

                const areaOf = (t) => {
                    const cfg = configs.find(c => Number(c.id) === Number(t?.config_id));
                    return cfg?.zone || t.location_zone || "Unassigned";
                };

                const usageOf = (t) => {
                    if (!isOccupied(t)) return "Not recorded";
                    if (t.usage_minutes != null) return `${t.usage_minutes} min`;
                    const since = t.occupied_since || t.occupied_at;
                    if (since) {
                        const mins = Math.max(0, Math.round((Date.now() - new Date(since).getTime()) / 60000));
                        if (!Number.isNaN(mins)) return `${mins} min`;
                    }
                    return "Not recorded";
                };

                const availabilityOf = (t) => {
                    if (isVacant(t)) return "Available now";
                    if (isOccupied(t)) return "Not available";
                    return cap(norm(t.status));
                };

                // ---------- data ----------
                const total = tables.length;
                const occupiedCount = tables.filter(isOccupied).length;
                const vacantCount = tables.filter(isVacant).length;

                const areaMap = {};
                tables.forEach(t => {
                    const a = areaOf(t);
                    if (!areaMap[a]) areaMap[a] = { area: a, tables: 0, seats: 0, occupied: 0, vacant: 0, other: 0 };
                    areaMap[a].tables += 1;
                    areaMap[a].seats += seatsOf(t);
                    if (isOccupied(t)) areaMap[a].occupied += 1;
                    else if (isVacant(t)) areaMap[a].vacant += 1;
                    else areaMap[a].other += 1;
                });
                const areaRows = Object.values(areaMap).sort((a, b) =>
                    a.area.localeCompare(b.area, undefined, { numeric: true })
                );

                const byAreaThenName = (a, b) =>
                    areaOf(a).localeCompare(areaOf(b), undefined, { numeric: true }) ||
                    (a.name || "").localeCompare(b.name || "", undefined, { numeric: true });

                const occupancyRows = [...searchedTables].sort(byAreaThenName);
                const vacantRows = searchedTables.filter(isVacant).sort(byAreaThenName);

                const stats = [
                    { label: "Total Service Types", value: sections.length },
                    { label: "Dine-in Areas", value: areaRows.length },
                    { label: "Total Dine-in Tables", value: total },
                    { label: "Dine-in Occupancy Coverage", value: pct(occupiedCount, total) },
                    { label: "Occupied Tables", value: occupiedCount },
                    { label: "Vacant Tables", value: vacantCount },
                ];

                if (total === 0) {
                    return (
                        <section className="ui-panel text-center py-10">
                            <FaSearch className="mx-auto mb-2.5 text-heading-sm text-brand-soft" />
                            <strong className="block text-body-sm text-ink-soft mb-1">No tables found</strong>
                            <p className="text-ui text-ink-muted">Use "Add table" to create your first table.</p>
                        </section>
                    );
                }

                return (
                    <>
                        {/* ---------- STAT CARDS ---------- */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-tiles mb-2">
                            {stats.map(s => (
                                <div key={s.label} className="ui-card px-3 py-2.5">
                                    <p className="text-ui-sm font-medium text-ink-muted">{s.label}</p>
                                    <p className="text-kpi text-brand-dark mt-1">{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* ---------- DINING AREA AVAILABILITY ---------- */}
                        <section className="ui-panel">
                            <h3 className="text-panel-title text-brand-dark mb-3">Dining Area Availability</h3>
                            <PaginatedTable
                                pageSize={10}
                                minWidth="min-w-[640px]"
                                rows={areaRows}
                                rowKey={r => r.area}
                                emptyText="No dining areas found"
                                columns={[
                                    { header: "Dining area", render: r => r.area },
                                    { header: "Tables", render: r => r.tables },
                                    { header: "Seats", render: r => r.seats },
                                    { header: "Occupied", render: r => r.occupied },
                                    { header: "Vacant", render: r => r.vacant },
                                    { header: "Other status", render: r => r.other },
                                    { header: "Occupancy %", render: r => pct(r.occupied, r.tables) },
                                ]}
                            />
                        </section>

                        {/* ---------- TABLE OCCUPANCY & AVAILABILITY ---------- */}
                        <section className="ui-panel">
                            <h3 className="text-panel-title text-brand-dark mb-3">Table Occupancy &amp; Availability</h3>
                            <PaginatedTable
                                pageSize={10}
                                minWidth="min-w-[760px]"
                                rows={occupancyRows}
                                rowKey={t => t.id}
                                emptyText="No tables match your search"
                                columns={[
                                    { header: "Dining area", render: t => areaOf(t) },
                                    { header: "Table name", cellClass: "font-semibold text-brand-dark", render: t => t.name },
                                    { header: "Seats", render: t => t.table_type },
                                    {
                                        header: "Status",
                                        render: t => {
                                            const st = stateOf(t);
                                            return (
                                                <span className={`inline-block text-micro font-bold px-2 py-0.5 rounded-badge ${st.chip}`}>
                                                    {st.label}
                                                </span>
                                            );
                                        },
                                    },
                                    { header: "Usage time", render: t => usageOf(t) },
                                    { header: "Expected availability", render: t => availabilityOf(t) },
                                    {
                                        header: "Actions",
                                        align: "right",
                                        render: t => (
                                            <div className="inline-flex gap-1">
                                                <button
                                                    title="Edit"
                                                    aria-label={`Edit ${t.name}`}
                                                    className="p-1.5 rounded-button-sm text-brand-dark hover:bg-brand-light transition-colors"
                                                    onClick={() => {
                                                        const copy = structuredClone(t);
                                                        editRef.current = copy;
                                                        setEditTable(copy);
                                                        setEditRowId(copy.id);
                                                    }}
                                                >
                                                    <FaEdit size={13} />
                                                </button>
                                                <button
                                                    title="Delete"
                                                    aria-label={`Delete ${t.name}`}
                                                    className="p-1.5 rounded-button-sm text-state-occupied hover:bg-state-occupied-bg transition-colors"
                                                    onClick={() => {
                                                        setDeleteTableId(t.id);
                                                        setShowConfirmDelete(true);
                                                    }}
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </section>

                        {/* ---------- VACANT DINE-IN TABLES ---------- */}
                        <section className="ui-panel">
                            <h3 className="text-panel-title text-brand-dark mb-3">Vacant Dine-in Tables</h3>
                            <PaginatedTable
                                pageSize={10}
                                minWidth="min-w-[420px]"
                                rows={vacantRows}
                                rowKey={t => t.id}
                                emptyText="No vacant tables"
                                columns={[
                                    { header: "Dining area", render: t => areaOf(t) },
                                    { header: "Table name", cellClass: "font-semibold text-brand-dark", render: t => t.name },
                                    { header: "Seats", render: t => t.table_type },
                                ]}
                            />
                        </section>
                    </>
                );
            })()}

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
                        <h3 className="text-body font-bold text-brand-dark mb-2.5">Final confirmation</h3>
                        <div className="border-l-bar border-l-brand pl-3 py-2 mb-3.5 text-ui text-ink-muted leading-relaxed">
                            <b className="text-brand-dark">This cannot be undone.</b> All selected tables will be permanently deleted.
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

export default TableManagement_Table;