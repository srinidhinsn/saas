import React, { useEffect, useState } from "react"; import { toast } from "react-toastify";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaUsers, FaClock, FaPlus } from "react-icons/fa";
import axios from 'axios';
import { useParams } from 'react-router-dom';
import "react-toastify/dist/ReactToastify.css";


const statusConfig = {
  Vacant: { card: "tm-status-card-available", icon: <FaCheck className="tm-status-icon tm-available" />, label: "Available" },
  Occupied: { card: "tm-status-card-occupied", icon: <FaUsers className="tm-status-icon tm-occupied" />, label: "Occupied" },
  Reserved: { card: "tm-status-card-reserved", icon: <FaClock className="tm-status-icon tm-reserved" />, label: "Reserved" }
};

const TableManagement = () => {
  const { clientId } = useParams();
  const { darkMode } = useTheme();
  const [noChangeRowId, setNoChangeRowId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Bulk Update States
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdateSearch, setBulkUpdateSearch] = useState("");
  const [selectedUpdateTables, setSelectedUpdateTables] = useState([]);
  const [bulkUpdateData, setBulkUpdateData] = useState({});

  // Bulk Delete States
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleteSearch, setBulkDeleteSearch] = useState("");
  const [selectedDeleteTables, setSelectedDeleteTables] = useState([]);
  const [showFirstDeleteConfirm, setShowFirstDeleteConfirm] = useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = useState(false);
  const [bulkUpdateGlobal, setBulkUpdateGlobal] = useState({
    table_type: "",
    status: "",
    location_zone: ""
  });

  const token = localStorage.getItem("access_token");
  const [tableId, setTableId] = useState(null);

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
    if (isGenerating) return;
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
    if (validRows.length === 0) return;
    setIsGenerating(true);
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
          is_active: row.is_active,
          qr_code_url: row.qr_code_url || "",
          slug: `${clientId}-${(row.slug || num)
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')}`
        });
      });
    }

    try {
      for (let data of payload) {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/create`,
            data,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (err) {
          if (err.response && err.response.status === 400) {
            // assuming backend returns 400 for duplicate name/slug
            toast.warning(`Table "${data.name}" already exists!`);
          } else {
            console.error("Error creating table:", err);
            toast.error(`You are trying to create an existing table "${data.name}".`);
          }
        }
      }

      fetchTables();
      setShowAddTable(false);
      setTableRanges([]);
      setFieldErrors([]);

    } catch (err) {
      console.error("Error generating tables", err);
      toast.error("Something went wrong while generating tables.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditChange = (id, field, value) => {
    setTables(prev =>
      prev.map(table =>
        table.id === id
          ? {
            ...table,
            [field]: field === "table_type"
              ? Math.max(1, Number(value) || 1)  // ✅ Ensure minimum 1
              : value
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
      toast.info("No changes detected");
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

      toast.success("Table updated successfully!");

      // Close modal immediately
      setEditRowId(null);
      setEditFieldErrors({});

      // Then fetch updated data
      await fetchTables();

    } catch (err) {
      console.error("Error updating table", err);
      toast.error("Failed to update table");
    }
  };
  const cancelEdit = () => {
    setEditRowId(null);
    setNoChangeRowId(null);
    fetchTables();
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

      // ✅ Close modal and reset BEFORE fetching
      setShowConfirmDelete(false);
      setDeleteTableId(null);

      await fetchTables();
      toast.success("Table deleted successfully!"); // ✅ Add success message

    } catch (err) {
      console.error("Error deleting table", err);
      toast.error("Failed to delete table");
      // ✅ Still close modal even on error
      setShowConfirmDelete(false);
      setDeleteTableId(null);
    }
  };

  const openBulkUpdate = () => {
    setShowBulkUpdate(true);
    setSelectedUpdateTables([]);
    setBulkUpdateSearch("");

    // Reset global values
    setBulkUpdateGlobal({
      table_type: "",
      status: "",
      location_zone: ""
    });

    // Initialize bulk update data for all tables with their current values
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

        // Determine final values with proper priority logic
        // Priority: Individual change > Global change > Original value

        // For table_type (seating)
        let finalTableType = table.table_type;
        if (tableUpdates.table_type && tableUpdates.table_type !== table.table_type) {
          // User explicitly changed this individual table
          finalTableType = tableUpdates.table_type;
        } else if (bulkUpdateGlobal.table_type) {
          // Global value should apply
          finalTableType = bulkUpdateGlobal.table_type;
        }

        // For status
        let finalStatus = table.status;
        if (tableUpdates.status && tableUpdates.status !== table.status) {
          finalStatus = tableUpdates.status;
        } else if (bulkUpdateGlobal.status) {
          finalStatus = bulkUpdateGlobal.status;
        }

        // For location_zone
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

      toast.success(`${tablesToUpdate.length} table(s) updated successfully!`);

      // Close modal and reset states
      setShowBulkUpdate(false);
      setSelectedUpdateTables([]);
      setBulkUpdateData({});
      setBulkUpdateSearch("");
      setBulkUpdateGlobal({
        table_type: "",
        status: "",
        location_zone: "",
      });

      // Fetch updated data
      await fetchTables();

    } catch (err) {
      console.error("Bulk update error", err);
      toast.error("Failed to update tables");
    }
  };




  const getFilteredUpdateTables = () => {
    return tables.filter(table =>
      table.name.toLowerCase().includes(bulkUpdateSearch.toLowerCase())
    );
  };

  // Bulk Delete Functions
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
      fetchTables();
    } catch (err) {
      console.error("Bulk delete error", err);
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


  const closeEditModal = () => {
    setEditRowId(null);
    setEditFieldErrors({});
  };


  return (
    <div className="Table-Creation-Management">
      <div className={`tm-bg ${darkMode ? 'tm-dark-mode' : ''}`}>
        <main className="tm-main-container">
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

              <div className="tm-action-buttons">
                <button className="tm-bulk-update-btn" onClick={openBulkUpdate}>
                  <FaEdit /> <span>Bulk Update</span>
                </button>
                <button className="tm-bulk-delete-btn" onClick={openBulkDelete}>
                  <FaTrash /> <span>Bulk Delete</span>
                </button>
                <button
                  className="tm-add-table-btn"
                  onClick={() => {
                    setShowAddTable(true);
                    setTableRanges([{
                      range: "",
                      table_type: "",
                      type: "",
                      remark: "Vacant",
                      is_active: false,
                      description: "",    // ✅ Add these
                      slug: "",           // ✅ Add these
                      section: "",        // ✅ Add these
                      sort_order: "",     // ✅ Add these
                      qr_code_url: ""     // ✅ Add these
                    }]);
                    setFieldErrors([{}]);
                  }}
                >
                  <FaPlus className="tm-add-icon" /> <span>Add Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Grid */}
          <div className="tm-table-grid-card">
            <div className="tm-table-grid">
              {filteredTables.map(table => {
                const config = statusConfig[table.status] || statusConfig['Vacant'];
                return (
                  <div key={table.id} className={`tm-table-card ${config.card}`}>
                    <div className="tm-table-card-header">
                      <div>
                        <div className="tm-table-card-title">{table.name}</div>
                        <div className="tm-table-card-capacity">Seating: <span>{table.table_type}</span></div>
                        <div className="tm-table-card-capacity">Zone: <span>{table.location_zone}</span></div>
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
                  <button
                    className="tm-modal-close"
                    onClick={() => {
                      setShowAddTable(false);
                      setTableRanges([]);
                      setFieldErrors([]);  // ✅ Add this
                    }}
                  >
                    <FaTimes />
                  </button>
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
                          type="number" min="1"
                          value={row.table_type}
                          onChange={e => {
                            const value = Math.max(1, Number(e.target.value) || "");  // ✅ Add this
                            const updated = [...tableRanges];
                            updated[index].table_type = value;
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
                  <button className="tm-modal-generate-table" disabled={isGenerating} onClick={generateTables}>{isGenerating ? "Generating..." : "Generate Table"}</button>
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
                    <button className="tm-edit-modal-close" onClick={closeEditModal}
                    ><FaTimes /></button>
                  </div>
                  {tables
                    .filter((table) => table.id === editRowId)
                    .map((table) => (
                      <div className="tm-edit-modal-body" key={table.id}>
                        <div className="tm-edit-modal-table-name">
                          <span className="tm-edit-modal-label">Table Name:</span>
                          <span className="tm-edit-modal-value">{table.name}</span>
                        </div>
                        <div className="tm-edit-modal-field">
                          <label>No of Seating</label>
                          <input
                            type="number" min="1"
                            value={table.table_type}
                            onChange={(e) => {
                              const value = Math.max(1, Number(e.target.value) || 1);  // ✅ Fix this
                              handleEditChange(table.id, "table_type", value);
                            }}
                          />
                          {editFieldErrors.table_type && <div className="tm-error-message">Enter seating</div>}

                        </div>
                        <div className="tm-edit-modal-field">
                          <label>Type</label>
                          <select
                            value={table.location_zone}
                            onChange={(e) => handleEditChange(table.id, "location_zone", e.target.value)}
                          >
                            <option value="AC">AC</option>
                            <option value="Non-AC">Non-AC</option>
                          </select>
                        </div>
                        <div className="tm-edit-modal-field">
                          <label>Remark</label>
                          <select
                            value={table.status || ""}
                            onChange={(e) => handleEditChange(table.id, "status", e.target.value)}
                          >
                            <option value="Vacant">Vacant</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Reserved">Reserved</option>
                          </select>
                        </div>
                        <div className="tm-edit-modal-btns">
                          <button className="tm-edit-modal-save" onClick={() => saveEdit(table)}>
                            <FaCheck />
                          </button>
                          <button className="tm-edit-modal-cancel" onClick={closeEditModal}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Bulk Update Modal */}
          {showBulkUpdate && (
            <div className="tm-bulk-modal-overlay">
              <div className="tm-bulk-modal">
                {/* Global Update Section */}
                <div className="tm-bulk-global-update-row">
                  <div className="tm-bulk-field">
                    <label>Global Seating</label>
                    <input
                      type="number"
                      min="1"
                      value={bulkUpdateGlobal.table_type}
                      onChange={e => {
                        const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                        setBulkUpdateGlobal(prev => ({
                          ...prev,
                          table_type: value
                        }));
                      }}
                      placeholder="Apply to all selected"
                    />
                  </div>
                  <div className="tm-bulk-field">
                    <label>Global Status</label>
                    <select
                      value={bulkUpdateGlobal.status}
                      onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="">-- No Change --</option>
                      <option value="Vacant">Vacant</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Reserved">Reserved</option>
                    </select>
                  </div>
                  <div className="tm-bulk-field">
                    <label>Global Zone</label>
                    <select
                      value={bulkUpdateGlobal.location_zone}
                      onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, location_zone: e.target.value }))}
                    >
                      <option value="">-- No Change --</option>
                      <option value="AC">AC</option>
                      <option value="Non-AC">Non-AC</option>
                    </select>
                  </div>
                </div>

                {/* Modal Header */}
                <div className="tm-bulk-modal-header">
                  <h3>Bulk Update Tables</h3>
                  <button
                    className="tm-modal-close"
                    onClick={() => {
                      setShowBulkUpdate(false);
                      setSelectedUpdateTables([]);
                      setBulkUpdateData({});
                      setBulkUpdateSearch("");
                      setBulkUpdateGlobal({
                        table_type: "",
                        status: "",
                        location_zone: "",
                      });
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="tm-bulk-modal-search">
                  <FaSearch className="tm-search-icon" />
                  <input
                    type="text"
                    placeholder="Search tables to update..."
                    value={bulkUpdateSearch}
                    onChange={(e) => setBulkUpdateSearch(e.target.value)}
                  />
                </div>

                {/* Select All Checkbox */}
                <div className="tm-bulk-select-all">
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        selectedUpdateTables.length === getFilteredUpdateTables().length &&
                        getFilteredUpdateTables().length > 0
                      }
                      onChange={selectAllUpdateTables}
                    />
                    <span>Select All ({selectedUpdateTables.length} selected)</span>
                  </label>
                </div>

                {/* Table List */}
                <div className="tm-bulk-table-list">
                  {getFilteredUpdateTables().length === 0 ? (
                    <div className="tm-bulk-no-results">
                      <p>No tables found</p>
                    </div>
                  ) : (
                    getFilteredUpdateTables().map(table => (
                      <div key={table.id} className="tm-bulk-table-item">
                        {/* Checkbox and Table Name */}
                        <div className="tm-bulk-table-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedUpdateTables.includes(table.id)}
                            onChange={() => toggleUpdateTableSelection(table.id)}
                          />
                          <span className="tm-bulk-table-name">{table.name}</span>
                        </div>

                        {selectedUpdateTables.includes(table.id) ? (
                          // Editable fields when selected
                          <div className="tm-bulk-table-fields">
                            <div className="tm-bulk-field">
                              <label>Seating</label>
                              <input
                                type="number"
                                min="1"
                                value={bulkUpdateData[table.id]?.table_type ?? table.table_type ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                                  handleBulkUpdateChange(table.id, "table_type", value);
                                }}
                                placeholder={bulkUpdateGlobal.table_type ? `Global: ${bulkUpdateGlobal.table_type}` : ""}
                              />
                            </div>

                            <div className="tm-bulk-field">
                              <label>Status</label>
                              <select
                                value={bulkUpdateData[table.id]?.status ?? table.status}
                                onChange={(e) => handleBulkUpdateChange(table.id, 'status', e.target.value)}
                              >
                                <option value="Vacant">Vacant</option>
                                <option value="Occupied">Occupied</option>
                                <option value="Reserved">Reserved</option>
                              </select>
                            </div>

                            <div className="tm-bulk-field">
                              <label>Zone</label>
                              <select
                                value={bulkUpdateData[table.id]?.location_zone ?? table.location_zone}
                                onChange={(e) => handleBulkUpdateChange(table.id, 'location_zone', e.target.value)}
                              >
                                <option value="AC">AC</option>
                                <option value="Non-AC">Non-AC</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          // Read-only view when not selected
                          <div className="tm-bulk-table-details">
                            Seating: {table.table_type} | Status: {table.status} | Zone: {table.location_zone}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="tm-bulk-modal-footer">
                  <button
                    className="tm-bulk-save-btn"
                    onClick={saveBulkUpdate}
                    disabled={selectedUpdateTables.length === 0}
                  >
                    <FaCheck /> Update {selectedUpdateTables.length} Table(s)
                  </button>
                  <button
                    className="tm-bulk-cancel-btn"
                    onClick={() => {
                      setShowBulkUpdate(false);
                      setSelectedUpdateTables([]);
                      setBulkUpdateData({});
                      setBulkUpdateSearch("");
                      setBulkUpdateGlobal({
                        table_type: "",
                        status: "",
                        location_zone: "",
                      });
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
            <div className="tm-bulk-modal-overlay">
              <div className="tm-bulk-modal">
                <div className="tm-bulk-modal-header">
                  <h3>Bulk Delete Tables</h3>
                  <button className="tm-modal-close" onClick={() => setShowBulkDelete(false)}>
                    <FaTimes />
                  </button>
                </div>

                <div className="tm-bulk-modal-search">
                  <FaSearch className="tm-search-icon" />
                  <input
                    type="text"
                    placeholder="Search tables to delete..."
                    value={bulkDeleteSearch}
                    onChange={(e) => setBulkDeleteSearch(e.target.value)}
                  />
                </div>

                <div className="tm-bulk-select-all">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedDeleteTables.length === getFilteredDeleteTables().length && getFilteredDeleteTables().length > 0}
                      onChange={selectAllDeleteTables}
                    />
                    <span>Select All ({selectedDeleteTables.length} selected)</span>
                  </label>
                </div>

                <div className="tm-bulk-table-list tm-bulk-delete-list">
                  {getFilteredDeleteTables().map(table => (
                    <div key={table.id} className="tm-bulk-table-item tm-bulk-delete-item">
                      <label className="tm-bulk-delete-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedDeleteTables.includes(table.id)}
                          onChange={() => toggleDeleteTableSelection(table.id)}
                        />
                        <div className="tm-bulk-delete-info">
                          <span className="tm-bulk-table-name">{table.name}</span>
                          <span className="tm-bulk-table-details">
                            Seating: {table.table_type}  | Status: {table.status} | Zone: {table.location_zone}
                          </span>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="tm-bulk-modal-footer">
                  <button
                    className="tm-bulk-delete-confirm-btn"
                    onClick={() => {
                      setShowBulkDelete(false);
                      setShowFirstDeleteConfirm(true);
                    }}
                    disabled={selectedDeleteTables.length === 0}
                  >
                    <FaTrash /> Delete {selectedDeleteTables.length} Table(s)
                  </button>
                  <button className="tm-bulk-cancel-btn" onClick={() => setShowBulkDelete(false)}>
                    <FaTimes /> Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* First Delete Confirmation */}
          {showFirstDeleteConfirm && (
            <div className="tm-confirm-overlay">
              <div className="tm-confirm-modal-card">
                <div className="tm-confirm-icon-warning">⚠️</div>
                <h3>Confirm Deletion</h3>
                <p>Are you sure you want to delete <strong>{selectedDeleteTables.length}</strong> table(s)?</p>
                <div className="tm-confirm-table-list">
                  {tables.filter(t => selectedDeleteTables.includes(t.id)).map(t => (
                    <span key={t.id} className="tm-confirm-table-tag">{t.name}</span>
                  ))}
                </div>
                <div className="tm-confirm-modal-btns">
                  <button className="tm-confirm-warning" onClick={() => {
                    setShowFirstDeleteConfirm(false);
                    setShowSecondDeleteConfirm(true);
                  }}>
                    Yes, Continue
                  </button>
                  <button className="tm-confirm-cancel" onClick={() => setShowFirstDeleteConfirm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Second Delete Confirmation */}
          {showSecondDeleteConfirm && (
            <div className="tm-confirm-overlay">
              <div className="tm-confirm-modal-card tm-confirm-danger-modal">
                <div className="tm-confirm-icon-danger">🗑️</div>
                <h3>Final Confirmation</h3>
                <p className="tm-confirm-danger-text">
                  This action is <strong>irreversible</strong>. All selected tables will be permanently deleted.
                </p>
                <div className="tm-confirm-modal-btns">
                  <button className="tm-confirm-danger" onClick={confirmBulkDelete}>
                    <FaTrash /> Confirm Delete
                  </button>
                  <button className="tm-confirm-cancel" onClick={() => {
                    setShowSecondDeleteConfirm(false);
                    setShowFirstDeleteConfirm(false);
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Single Delete Modal */}
          {showConfirmDelete && (
            <div className="tm-confirm-overlay">
              <div className="tm-confirm-modal-card">
                <p>Delete table <strong>{tables.find(t => t.id === deleteTableId)?.name || "this table"}</strong>?</p>
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