// import React, { useEffect, useState } from "react";
// import { FiSun, FiMoon } from "react-icons/fi";
// import { useTheme } from "../ThemeChangerComponent/ThemeContext";
// import { FaEdit, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
// import "../App.css";
// import api from '../PortExportingPage/api'

// const TableSelection = () => {
//     const clientId = localStorage.getItem("clientId");
//     const { darkMode, toggleTheme } = useTheme();
//     const [tableRanges, setTableRanges] = useState([]);
//     const [tables, setTables] = useState([]);
//     const [originalTables, setOriginalTables] = useState([]);
//     const [rowErrors, setRowErrors] = useState([]);
//     const [showAddTable, setShowAddTable] = useState(false);
//     const [editRowId, setEditRowId] = useState(null);
//     const [highlightRow, setHighlightRow] = useState(null);
//     const [noChangeRowId, setNoChangeRowId] = useState(null);
//     const [showConfirmDelete, setShowConfirmDelete] = useState(false);
//     const [deleteTableId, setDeleteTableId] = useState(null);
//     const [addRowError, setAddRowError] = useState("");
//     const [fieldErrors, setFieldErrors] = useState([]);



//     useEffect(() => {
//         if (clientId) fetchTables();
//     }, [clientId]);

//     const fetchTables = async () => {
//         try {
//             const res = await api.get(`/${clientId}/tables`);
//             const sorted = res.data.sort((a, b) => a.table_number.localeCompare(b.table_number));
//             setTables(sorted);
//             setOriginalTables(JSON.parse(JSON.stringify(sorted)));
//         } catch (err) {
//             console.error("Error fetching tables");
//         }
//     };

//     const parseTableRange = (rangeStr) => {
//         const parts = rangeStr.split(",");
//         const tables = [];

//         for (let part of parts) {
//             part = part.trim();
//             if (!part) continue;

//             if (part.includes(":")) {
//                 const [startStr, endStr] = part.split(":");
//                 const prefixStart = startStr.match(/[A-Za-z]+/);
//                 const startNum = startStr.match(/\d+/);
//                 const endNum = endStr.match(/\d+/);

//                 if (!prefixStart || !startNum || !endNum) continue;

//                 const prefix = prefixStart[0].toUpperCase();
//                 const start = parseInt(startNum[0]);
//                 const end = parseInt(endNum[0]);

//                 for (let i = start; i <= end; i++) {
//                     tables.push(`${prefix}${i.toString().padStart(2, '0')}`);
//                 }
//             } else {
//                 const prefix = part.match(/[A-Za-z]+/);
//                 const num = part.match(/\d+/);
//                 if (!prefix || !num) continue;

//                 const formatted = `${prefix[0].toUpperCase()}${parseInt(num[0]).toString().padStart(2, '0')}`;
//                 tables.push(formatted);
//             }
//         }

//         return tables;
//     };

//     const generateTables = async () => {
//         const newErrors = tableRanges.map(row => ({
//             range: !row.range,
//             table_type: !row.table_type,
//             type: !row.type
//         }));

//         setFieldErrors(newErrors);

//         // Filter only valid rows
//         const validRows = tableRanges.filter((row, index) => !newErrors[index].range && !newErrors[index].table_type && !newErrors[index].type);

//         // If no valid rows, return early
//         if (validRows.length === 0) return;

//         const payload = [];
//         for (let row of validRows) {
//             const tableNumbers = parseTableRange(row.range);
//             tableNumbers.forEach(num => {
//                 payload.push({
//                     table_number: num,
//                     table_type: row.table_type.toString(),
//                     location_zone: row.type,
//                     status: row.remark || "",
//                     client_id: clientId
//                 });
//             });
//         }

//         try {
//             for (let data of payload) {
//                 await api.post(`/${clientId}/tables`, data);
//             }
//             fetchTables();
//             setShowAddTable(false);
//             setTableRanges([]);        // Reset the form
//             setFieldErrors([]);        // Clear validation errors
//         } catch (err) {
//             console.error("Error generating tables", err);
//         }
//     };


//     const handleEdit = (id) => {
//         setEditRowId(id);
//         setNoChangeRowId(null);
//     };

//     const handleEditChange = (id, field, value) => {
//         setTables(prev =>
//             prev.map(table =>
//                 table.id === id ? { ...table, [field]: value } : table
//             )
//         );
//     };

//     const saveEdit = async (table) => {
//         const original = originalTables.find(t => t.id === table.id);
//         const hasChanged = (
//             original?.table_type?.toString() !== table.table_type?.toString() ||
//             original?.location_zone !== table.location_zone ||
//             (original?.status || "") !== (table.status || "")
//         );

//         if (!hasChanged) {
//             setNoChangeRowId(table.id);
//             setTimeout(() => {
//                 setNoChangeRowId(null);
//                 setEditRowId(null);
//             }, 2000);
//             return;
//         }

//         try {
//             await api.put(
//                 `/${clientId}/tables/${table.id}`,
//                 {
//                     table_number: table.table_number,
//                     table_type: table.table_type?.toString(),
//                     location_zone: table.location_zone?.trim(),
//                     status: table.status?.trim() || "",
//                 }
//             );
//             setEditRowId(null);
//             setHighlightRow(table.id);
//             setTimeout(() => setHighlightRow(null), 3000);
//             fetchTables();
//         } catch (err) {
//             console.error("Error updating table");
//         }
//     };

//     const cancelEdit = () => {
//         setEditRowId(null);
//         setNoChangeRowId(null);
//         fetchTables();
//     };

//     const handleDelete = async (id) => {
//         setDeleteTableId(id);
//         setShowConfirmDelete(true);
//     };

//     const confirmDelete = async () => {
//         try {
//             await api.delete(`/${clientId}/tables/${deleteTableId}`);
//             fetchTables();
//         } catch (err) {
//             console.error("Error deleting table");
//         } finally {
//             setShowConfirmDelete(false);
//             setDeleteTableId(null);
//         }
//     };

//     const cancelDelete = () => {
//         setShowConfirmDelete(false);
//         setDeleteTableId(null);
//     };

//     return (
//         <div className={`table-selection ${darkMode ? "dark" : "light"}`}>
//             <div className="header">
//                 <h2>Table Management</h2>
//                 <button className="theme-toggle" onClick={toggleTheme}>
//                     {darkMode ? <FiSun /> : <FiMoon />}
//                 </button>
//             </div>

//             {/* Add New Tables Section */}
//             <div className="add-tables-section">
//                 <h3>Add New Tables</h3>
//                 {!showAddTable && (
//                     <button className="btn-primary" onClick={() => {
//                         setShowAddTable(true);
//                         setTableRanges([{ range: "", table_type: "", type: "", remark: "" }]);
//                         setRowErrors([false]);
//                     }}>+ Add Table</button>
//                 )}

//                 {showAddTable && (
//                     <>
//                         <table>
//                             <thead>
//                                 <tr>
//                                     <th>Table Range</th>
//                                     <th>No of Seating</th>
//                                     <th>Type</th>
//                                     <th>Remark</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {tableRanges.map((row, index) => (
//                                     <tr key={index}>
//                                         <td>
//                                             <input
//                                                 className={fieldErrors[index]?.range ? "error-field" : ""}
//                                                 value={row.range}
//                                                 onChange={(e) => {
//                                                     const updated = [...tableRanges];
//                                                     updated[index].range = e.target.value;
//                                                     setTableRanges(updated);
//                                                 }}
//                                             />
//                                             {fieldErrors[index]?.range && <div className="error-text">Enter table range</div>}
//                                         </td>

//                                         <td>
//                                             <input
//                                                 type="number"
//                                                 className={fieldErrors[index]?.table_type ? "error-field" : ""}
//                                                 value={row.table_type}
//                                                 onChange={(e) => {
//                                                     const updated = [...tableRanges];
//                                                     updated[index].table_type = e.target.value;
//                                                     setTableRanges(updated);
//                                                 }}
//                                             />
//                                             {fieldErrors[index]?.table_type && <div className="error-text">Enter no. of seats</div>}
//                                         </td>

//                                         <td>
//                                             <select
//                                                 className={fieldErrors[index]?.type ? "error-field" : ""}
//                                                 value={row.type}
//                                                 onChange={(e) => {
//                                                     const updated = [...tableRanges];
//                                                     updated[index].type = e.target.value;
//                                                     setTableRanges(updated);
//                                                 }}
//                                             >
//                                                 <option value="">Select</option>
//                                                 <option value="AC">AC</option>
//                                                 <option value="Non-AC">Non-AC</option>
//                                             </select>
//                                             {fieldErrors[index]?.type && <div className="error-text">Select type</div>}
//                                         </td>

//                                         <td>
//                                             <input
//                                                 value={row.remark}
//                                                 onChange={(e) => {
//                                                     const updated = [...tableRanges];
//                                                     updated[index].remark = e.target.value;
//                                                     setTableRanges(updated);
//                                                 }}
//                                             />
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>


//                         </table>
//                         {rowErrors.includes(true) && (
//                             <p className="error">Please fill all required fields .</p>
//                         )}
//                         {addRowError && (
//                             <div className="error-message" style={{ color: "red", marginTop: "5px" }}>
//                                 {addRowError}
//                             </div>
//                         )}

//                         <p className="example-text">
//                             Example: <br />
//                             a) Table Range: T01:T10 <br />
//                             b) Multi-Table Range: A01:A10,B01:B05
//                         </p>
//                         <button
//                             className="btn-warning"
//                             onClick={() => {
//                                 const emptyRows = tableRanges.filter(
//                                     row => !row.range || !row.table_type || !row.type
//                                 );

//                                 if (emptyRows.length >= 3) {
//                                     setAddRowError("Please fill the existing rows");
//                                     return;
//                                 }

//                                 setAddRowError(""); // Clear error
//                                 setTableRanges([
//                                     ...tableRanges,
//                                     { range: "", table_type: "", type: "", remark: "" }
//                                 ]);
//                                 setRowErrors(prev => [...prev, false]);
//                             }}
//                         >
//                             + Add Row
//                         </button>


//                         <button className="btn-info" onClick={generateTables}>Generate Table</button>
//                     </>
//                 )}
//             </div>

//             {/* Edit Tables */}
//             <div className="edit-tables-section">
//                 <h3>Edit Tables</h3>
//                 <table>
//                     <thead>
//                         <tr>
//                             <th>Table No</th>
//                             <th>No of Seating</th>
//                             <th>Type</th>
//                             <th>Remark</th>
//                             <th>Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {tables.map((table) => (
//                             <tr key={table.id} className={highlightRow === table.id ? "highlighted" : ""}>
//                                 <td>{table.table_number}</td>
//                                 {editRowId === table.id ? (
//                                     noChangeRowId === table.id ? (
//                                         <td colSpan={4}>
//                                             <div className="inline-warning">
//                                                 ⚠️ No changes made.
//                                             </div>
//                                         </td>

//                                     ) : (
//                                         <>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     value={table.table_type}
//                                                     onChange={(e) => handleEditChange(table.id, "table_type", e.target.value)}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <select
//                                                     value={table.location_zone}
//                                                     onChange={(e) => handleEditChange(table.id, "location_zone", e.target.value)}
//                                                 >
//                                                     <option value="AC">AC</option>
//                                                     <option value="Non-AC">Non-AC</option>
//                                                 </select>
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     value={table.status || ""}
//                                                     onChange={(e) => handleEditChange(table.id, "status", e.target.value)}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <button className="btn-primary" onClick={() => saveEdit(table)}><FaCheck /></button>
//                                                 <button className="btn-warning" onClick={cancelEdit}><FaTimes /></button>
//                                             </td>
//                                         </>
//                                     )
//                                 ) : (
//                                     <>
//                                         <td>{table.table_type}</td>
//                                         <td>{table.location_zone}</td>
//                                         <td>{table.status || "-"}</td>
//                                         <td>
//                                             <button className="btn-primary" onClick={() => handleEdit(table.id)}><FaEdit /></button>
//                                             <button className="btn-danger" onClick={() => handleDelete(table.id)}><FaTrash /></button>
//                                         </td>
//                                     </>
//                                 )}
//                             </tr>

//                         ))}
//                     </tbody>
//                 </table>
//             </div>

//             {showConfirmDelete && (
//                 <div className="confirm-overlay">
//                     <div className="confirm-box">
//                         <p>Are you sure you want to delete this table?</p>
//                         <div className="buttons">
//                             <button className="btn-danger" onClick={confirmDelete}>Yes</button>
//                             <button className="btn-info" onClick={cancelDelete}>No</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default TableSelection;



// 



// TableSelection.jsx
import React, { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../ThemeChangerComponent/ThemeContext";
import { FaEdit, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
// import newApi from "../PortExportingPage/newApi";
import axios from "axios";

const TableSelection = () => {
    useEffect(() => {
        if (!localStorage.getItem("clientId")) {
            localStorage.setItem("clientId", "39d5f232-135d-4b7d-8e2b-f339958c8684");
        }
    }, []);

    const clientId = localStorage.getItem("clientId");

    const { darkMode, toggleTheme } = useTheme();
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
    const TEMP_ACCESS_TOKEN = "mock_token_for_dev";
    useEffect(() => {
        if (clientId) fetchTables();
    }, [clientId]);

    const fetchTables = async () => {
        if (!clientId) return;
        try {
            const token = localStorage.getItem("accessToken"); // 👈 get token
            const res = await axios.get(`http://localhost:8000/saas/${clientId}/tables/read`);


            const result = res.data;
            const tableList = Array.isArray(result?.data) ? result.data : [];

            setTables(tableList);
            setOriginalTables(tableList);

        } catch (error) {
            console.error("❌ Error fetching tables:", error);
            localStorage.removeItem("clientId");
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
                    table_type: row.table_type,        // <-- use this as table name
                    status: row.remark || "Vacant",
                    location_zone: row.type,
                    sort_order: null,         // optional, add if you want
                    // Add any other required fields if you want to send explicitly
                });
            });
        }

        try {
            for (let data of payload) {
                await axios.post(`http://localhost:8000/saas/${clientId}/tables/create`, data);



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
            await axios.post(`http://localhost:8000/saas/${clientId}/tables/update`, table);




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
            await axios.post(`http://localhost:8000/saas/${clientId}/tables/delete`, { id: deleteTableId });

            fetchTables();
        } catch (err) {
            console.error("Error deleting table");
        } finally {
            setShowConfirmDelete(false);
            setDeleteTableId(null);
        }
    };

    return (
        <div className={`table-selection ${darkMode ? "dark" : ""}`}>
            <div className="header">
                <h2>Table Management</h2>
                <button className="theme-toggle" onClick={toggleTheme}>
                    {darkMode ? <FiSun /> : <FiMoon />}
                </button>
            </div>

            <div className="add-tables-section">
                <h3>Add New Tables</h3>
                {!showAddTable && (
                    <button className="btn-primary" onClick={() => {
                        setShowAddTable(true);
                        setTableRanges([{ range: "", table_type: "", type: "", remark: "" }]);
                        setFieldErrors([{}]);
                    }}>
                        + Add Table
                    </button>
                )}

                {showAddTable && (
                    <>
                        {tableRanges.map((row, index) => (
                            <div className="form-grid" key={index}>
                                <div className="field-block">
                                    <label>Table Range</label>
                                    <input
                                        value={row.range}
                                        onChange={(e) => {
                                            const updated = [...tableRanges];
                                            updated[index].range = e.target.value;
                                            setTableRanges(updated);
                                        }}
                                        className={fieldErrors[index]?.range ? "error-field" : ""}
                                    />
                                    {fieldErrors[index]?.range && <div className="error-text">Enter table range</div>}
                                </div>

                                <div className="field-block">
                                    <label>No of Seating</label>
                                    <input
                                        type="number"
                                        value={row.table_type}
                                        onChange={(e) => {
                                            const updated = [...tableRanges];
                                            updated[index].table_type = e.target.value;
                                            setTableRanges(updated);
                                        }}
                                        className={fieldErrors[index]?.table_type ? "error-field" : ""}
                                    />
                                    {fieldErrors[index]?.table_type && <div className="error-text">Enter seating</div>}
                                </div>

                                <div className="field-block">
                                    <label>Type</label>
                                    <select
                                        value={row.type}
                                        onChange={(e) => {
                                            const updated = [...tableRanges];
                                            updated[index].type = e.target.value;
                                            setTableRanges(updated);
                                        }}
                                        className={fieldErrors[index]?.type ? "error-field" : ""}
                                    >
                                        <option value="">Select</option>
                                        <option value="AC">AC</option>
                                        <option value="Non-AC">Non-AC</option>
                                    </select>
                                    {fieldErrors[index]?.type && <div className="error-text">Select type</div>}
                                </div>

                                <div className="field-block">
                                    <label>Remark</label>
                                    <input
                                        value={row.remark}
                                        onChange={(e) => {
                                            const updated = [...tableRanges];
                                            updated[index].remark = e.target.value;
                                            setTableRanges(updated);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="example-text">
                            Example:<br />
                            a) Table Range: T01:T10<br />
                            b) Multi-Table Range: A01:A10,B01:B05
                        </div>

                        {addRowError && <div className="error">{addRowError}</div>}

                        <button className="btn-warning" onClick={() => {
                            const emptyRows = tableRanges.filter(
                                row => !row.range || !row.table_type || !row.type
                            );
                            if (emptyRows.length >= 3) {
                                setAddRowError("Please fill the existing rows first.");
                                return;
                            }
                            setAddRowError("");
                            setTableRanges([...tableRanges, { range: "", table_type: "", type: "", remark: "" }]);
                            setFieldErrors([...fieldErrors, {}]);
                        }}>
                            + Add Row
                        </button>

                        <button className="btn-info" onClick={generateTables}>Generate Table</button>
                    </>
                )}
            </div>

            <div className="edit-tables-section">
                <h3>Edit Tables</h3>
                <div className="edit-grid">
                    {tables.map((table) => (
                        <div className="form-grid" key={table.id}>
                            <div className="field-block">
                                <label>Table No</label>
                                <div>{table.name}</div>

                            </div>

                            {editRowId === table.id ? (
                                <>
                                    <div className="field-block">
                                        <label>No of Seating</label>
                                        <input
                                            type="number"
                                            value={table.table_type}
                                            onChange={(e) => handleEditChange(table.id, "table_type", e.target.value)}
                                        />
                                    </div>

                                    <div className="field-block">
                                        <label>Type</label>
                                        <select
                                            value={table.location_zone}
                                            onChange={(e) => handleEditChange(table.id, "location_zone", e.target.value)}
                                        >
                                            <option value="AC">AC</option>
                                            <option value="Non-AC">Non-AC</option>
                                        </select>
                                    </div>

                                    <div className="field-block">
                                        <label>Remark</label>
                                        <input
                                            value={table.status || ""}
                                            onChange={(e) => handleEditChange(table.id, "status", e.target.value)}
                                        />
                                    </div>

                                    <div className="btn-block">
                                        <button className="btn-primary" onClick={() => saveEdit(table)}><FaCheck /></button>
                                        <button className="btn-warning" onClick={cancelEdit}><FaTimes /></button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="field-block"><label>No of Seating</label><div>{table.table_type}</div></div>
                                    <div className="field-block"><label>Type</label><div>{table.location_zone}</div></div>
                                    <div className="field-block"><label>Remark</label><div>{table.status || "-"}</div></div>
                                    <div className="btn-block">
                                        <button className="btn-primary" onClick={() => setEditRowId(table.id)}><FaEdit /></button>
                                        <button className="btn-danger" onClick={() => {
                                            setDeleteTableId(table.id);
                                            setShowConfirmDelete(true);
                                        }}><FaTrash /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {showConfirmDelete && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <p>
                            Delete table{" "}
                            <strong>
                                {
                                    tables.find((t) => t.id === deleteTableId)?.name ||
                                    "this table"
                                }
                            </strong>
                            ?
                        </p>
                        <div className="buttons">
                            <button className="btn-danger" onClick={confirmDelete}>Yes</button>
                            <button className="btn-info" onClick={() => setShowConfirmDelete(false)}>No</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TableSelection;
