
import React, { useEffect, useState, useRef } from "react";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaUsers, FaClock, FaPlus } from "react-icons/fa";
import axios from 'axios';
import { toast } from "react-toastify";
import UniversalAddModal from "../../utils/Modals/UniversalAddModal";
import UniversalEditModal from "../../utils/Modals/UniversalEditModal";
import UniversalBulkUpdateModal from "../../utils/Modals/UniversalBulkUpdateModal";
import UniversalBulkDeleteModal from "../../utils/Modals/UniversalBulkDeleteModal";
import AccessGuard from "../../utils/Interceptors/ProtectedRoute";

const statusConfig = {
    Vacant: { card: "border-tableStatusBorder-vacant", icon: <FaCheck className="text-action-success text-xl" />, label: "Available" },
    Occupied: { card: "border-tableStatusBorder-occupied", icon: <FaUsers className="text-action-danger text-xl" />, label: "Occupied" },
    Reserved: { card: "border-tableStatusBorder-reserved", icon: <FaClock className="text-action-primary text-xl" />, label: "Reserved" }
};

const TableManagement = ({ clientId, token, screenIds, userId }) => {

    console.log("requesterId", userId)
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
    useEffect(() => {
        if (clientId) fetchTables();
    }, [clientId]);
    const getSortedTables = (tablesToSort) => {
        const COLS_PER_ROW = 8;

        const occupied = tablesToSort
            .filter(t => t.status === 'Occupied')
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        const reserved = tablesToSort
            .filter(t => t.status === 'Reserved')
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        const vacant = tablesToSort
            .filter(t => t.status === 'Vacant')
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        const totalTables = tablesToSort.length;
        const totalRows = Math.ceil(totalTables / COLS_PER_ROW);

        const grid = Array.from({ length: totalRows }, () =>
            Array(COLS_PER_ROW).fill(null)
        );

        let filledCount = 0;

        const canFill = (row, col) =>
            row * COLS_PER_ROW + col < totalTables;

        /* ---------------- RESERVED (right-most, top-down) ---------------- */
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

                // Exclude takeaway table
                const filteredTables = tableList
                    .filter(table =>
                        table.id !== 500 &&                           // ⬅️ hard exclude takeaway table
                        table.name?.toLowerCase() !== "take away" && // ⬅️ extra safety
                        table.name?.toLowerCase() !== "takeaway"
                    )
                    .sort((a, b) =>
                        a.name.localeCompare(b.name, undefined, { numeric: true })
                    );

                setTables(filteredTables);
                setOriginalTables(filteredTables);
            }
        } catch (error) {
            console.error("Error fetching tables:", error);
        } finally {
            setLoading(false);
        }
    };
    const normalizeTableRangeStrict = (rangeStr) => {
        const raw = rangeStr.trim().toUpperCase();

        // Reject any unpadded numbers like B1, A3
        if (/\b[A-Z]+\d\b/.test(raw)) {
            throw new Error("Table numbers must be 2 digits. Use B01 instead of B1");
        }

        // Reject mixed digit width ranges like A01:A3
        const parts = raw.split(",");
        for (const part of parts) {
            if (part.includes(":")) {
                const [start, end] = part.split(":");

                const startDigits = start.match(/\d+$/)?.[0]?.length;
                const endDigits = end.match(/\d+$/)?.[0]?.length;

                if (startDigits !== endDigits) {
                    throw new Error("Mixed numbering not allowed. Use A01:A03");
                }
            }
        }

        return raw;
    };

    const validateTableRangeStrict = (rangeStr, existingTables) => {
        let normalized;

        try {
            normalized = normalizeTableRangeStrict(rangeStr);
        } catch (e) {
            return e.message;
        }

        const validPattern =
            /^[A-Z]{1,3}\d{2}(?::[A-Z]{1,3}\d{2})?(,\s*[A-Z]{1,3}\d{2}(?::[A-Z]{1,3}\d{2})?)*$/;

        if (!validPattern.test(normalized)) {
            return "Invalid format. Use A01 or A01:A10 or A01,B02";
        }

        const generated = parseTableRange(normalized);

        // Duplicate check
        const duplicates = generated.filter((v, i, a) => a.indexOf(v) !== i);
        if (duplicates.length > 0) {
            return `Duplicate table(s): ${duplicates.join(", ")}`;
        }

        // Existing table conflict
        const existingNames = existingTables.map(t => t.name.toUpperCase());
        const conflicts = generated.filter(t => existingNames.includes(t));
        if (conflicts.length > 0) {
            return `Table already exists: ${conflicts.join(", ")}`;
        }

        return null;
    };



    const parseTableRange = (rangeStr) => {
        const parts = rangeStr.split(",");
        const tables = [];

        for (let part of parts) {
            part = part.trim();

            if (part.includes(":")) {
                const [start, end] = part.split(":");

                const prefix = start.match(/^[A-Z]+/)[0];
                const startNum = parseInt(start.match(/\d{2}$/)[0], 10);
                const endNum = parseInt(end.match(/\d{2}$/)[0], 10);

                for (let i = startNum; i <= endNum; i++) {
                    tables.push(`${prefix}${i.toString().padStart(2, "0")}`);
                }
            } else {
                tables.push(part);
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
                section: !row.section,
                location_zone: !row.location_zone
            }));

            setFieldErrors(newErrors);

            const validRows = tableRanges.filter((row, index) =>
                !newErrors[index].range &&
                !newErrors[index].table_type &&
                !newErrors[index].section &&
                !newErrors[index].location_zone
            );

            if (validRows.length === 0) {
                toast.error('Fill the fields')
                return;
            }

            const payload = [];
            for (let row of validRows) {
                const error = validateTableRangeStrict(row.range, originalTables);
                if (error) {
                    toast.error(error);
                    return; // ⛔ STOP ENTIRE CREATION
                }

                const normalized = normalizeTableRangeStrict(row.range);
                const tableNumbers = parseTableRange(normalized);

                tableNumbers.forEach(num => {
                    payload.push({
                        client_id: clientId,
                        name: num,
                        table_type: row.table_type.toString(),
                        status: row.remark || "Vacant",
                        section: row.section,
                        location_zone: row.location_zone,
                        description: row.description || "",
                        sort_order: row.sort_order ? parseInt(row.sort_order) : null,
                        is_active: row.is_active || false,
                        qr_code_url: row.qr_code_url || "",
                        slug: `${clientId}-${num.toLowerCase()}`
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
        if (!table.section || table.section.trim() === '') {
            errors.section = 'Required';
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

    const filteredTables = getSortedTables(
        tables.filter(table => {
            const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !statusFilter || table.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
    );

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
        // <AccessGuard screenIds={screenIds} requiredScreenId={requiredScreenId} clientId={clientId} requesterId={userId}>
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
                                            range: "",
                                            table_type: "",
                                            section: "",
                                            location_zone: "",
                                            remark: "Vacant",
                                            is_active: false,
                                            description: "",
                                            slug: "",
                                            sort_order: "",
                                            qr_code_url: ""
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-3">
                        {filteredTables.map(table => {
                            const config = statusConfig[table.status] || statusConfig['Vacant'];
                            return (
                                <div
                                    key={table.id}
                                    className={`border-2 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition
    ${table.status === "Vacant" ? "border-border-default" :
                                            table.status === "Occupied" ? "border-red-400" :
                                                "border-blue-400"}`}
                                >

                                    {/* HEADER */}
                                    <div className={`flex justify-between items-center px-3 py-2 text-sm font-bold
    ${table.status === "Vacant" ? "bg-action-primary text-white" :
                                            table.status === "Occupied" ? "bg-action-primary text-white" :
                                                "bg-action-primary text-white"}`}>

                                        <span>{table.name}</span>

                                        <div className="flex gap-3 items-center text-xs font-semibold">
                                            <span>{table.section}</span>
                                            <span>
                                                {table.status === "Vacant" }
                                                {table.status === "Occupied" }
                                                {table.status === "Reserved"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* BODY */}
                                    <div className="px-3 py-3 text-sm text-text-primary">
                                        <div className="font-medium">{table.location_zone}</div>
                                        <div className="text-xs text-text-secondary mt-1">
                                            Seats: <span className="font-bold">{table.table_type}</span>
                                        </div>
                                    </div>

                                    {/* FOOTER */}
                                    <div className="grid grid-cols-2 border-t text-xs font-semibold">
                                        <button
                                            onClick={() => setEditRowId(table.id)}
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

                        // Table-specific props
                        tableRanges={tableRanges}
                        setTableRanges={setTableRanges}
                        fieldErrors={fieldErrors}
                        setFieldErrors={setFieldErrors}
                        isGenerating={isGenerating}
                        generateTables={generateTables}
                    />
                    <UniversalEditModal
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
        // </AccessGuard>
    );
};

export default TableManagement;