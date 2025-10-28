import React, { useEffect, useState, useRef } from "react";
import AddMenuForm from './AddInventoryItemForm';
import { useParams } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import axios from 'axios';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// NOTE: Your file earlier referenced jwtDecode in import logic for Excel import.
// If you don't already import jwtDecode in the project, add:
// import jwtDecode from "jwt-decode";
// (left out intentionally to avoid breaking existing imports — add if needed)

function InventoryItemList({ selectedCategory ,clientId}) {
    const [items, setItems] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [originalItems, setOriginalItems] = useState([]);

    // Bulk update states
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]); // ids selected in bulk modal
    const [editingRows, setEditingRows] = useState({}); // { id: true/false }
    const [editedRowCopies, setEditedRowCopies] = useState({}); // { id: {...edited fields...} }
    const [selectAllChecked, setSelectAllChecked] = useState(false);
    const [bulkSaving, setBulkSaving] = useState(false);

    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    const [categories, setCategories] = useState([]);

    const flattenCategories = (categoryTree) => {
        const flat = [];
        const recurse = (nodes) => {
            nodes.forEach(node => {
                if (!node) return;
                flat.push({ id: node.id, name: node.name, parent_id: node.parent_id });
                if (node.subCategories && node.subCategories.length > 0) {
                    recurse(node.subCategories);
                }
            });
        };
        recurse(categoryTree);
        return flat;
    };

    // Build slug path same as existing
    const buildCategoryPath = (categoryId, itemName = "") => {
        const path = [];
        let currentId = categoryId;

        while (currentId) {
            const current = categories.find(cat => cat && cat.id === currentId);
            if (!current) break;
            path.unshift(current.name.trim().replace(/\s+/g, "_"));
            currentId = current.parent_id;
        }

        if (itemName) {
            path.push(itemName.trim().replace(/\s+/g, "_"));
        }

        return "_" + path.join(" _");
    };

    useEffect(() => {
        if (!token || !clientId) return;

        // Try to fetch nested categories (flatten afterwards)
        axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                const tree = res.data.data || [];
                const flattened = flattenCategories(tree);
                setCategories(flattened);
            })
            .catch((err) => console.error("Error fetching categories:", err));
    }, [clientId, token]);

    const fetchInventoryItems = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`, { headers });
            setItems(res.data.data || []);
            setOriginalItems(res.data.data || []);
        } catch (err) {
            console.error("Failed to load inventory:", err);
        }
    };

    useEffect(() => {
        fetchInventoryItems();
    }, [clientId, token]);

    // Filtering by selectedCategory (existing logic)
    const getDescendantCategoryIds = (categoryId, categoryTree) => {
        const ids = [categoryId];
        const recurse = (id) => {
            categoryTree
                .filter(cat => cat.parent_id === id)
                .forEach(child => {
                    ids.push(child.id);
                    recurse(child.id);
                });
        };
        recurse(categoryId);
        return ids;
    };

    useEffect(() => {
        if (!selectedCategory || selectedCategory.name === "All") {
            setItems(originalItems);
        } else {
            const descendantIds = getDescendantCategoryIds(selectedCategory.id, categories);
            const filtered = originalItems.filter(item =>
                descendantIds.includes(item.category_id)
            );
            setItems(filtered);
        }
    }, [selectedCategory, originalItems, categories]);

    const handleEdit = (item) => {
        setEditingItem({ ...item });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        const updatedItem = {
            ...editingItem,
            client_id: clientId,
            id: editingItem.id,
            line_item_id: Array.isArray(editingItem.line_item_id)
                ? editingItem.line_item_id
                : typeof editingItem.line_item_id === "string"
                    ? editingItem.line_item_id.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n))
                    : [],
        };

        updatedItem.slug = buildCategoryPath(updatedItem.category_id, updatedItem.name);

        try {
            await axios.post(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`, updatedItem, { headers });

            await fetchInventoryItems();
            setShowEditModal(false);
            setEditingItem(null);
        } catch (err) {
            console.error("Edit failed:", err.response?.data || err.message);
            alert("Edit failed.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
                { id },
                { headers }
            );

            const updatedItems = items.map(item => {
                if (Array.isArray(item.line_item_id) && item.line_item_id.includes(id)) {
                    const newLineItems = item.line_item_id.filter(lid => lid !== id);
                    const updatedItem = { ...item, line_item_id: newLineItems };
                    axios.post(
                        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
                        updatedItem,
                        { headers }
                    ).catch(err => {
                        console.error(`Failed to update item ${item.id}`, err);
                    });
                    return updatedItem;
                }
                return item;
            });

            setItems(updatedItems.filter(i => i.id !== id));
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed.");
        }
    };

    const handleItemCreated = (responseData) => {
        if (responseData?.data) {
            setItems((prev) => [...prev, responseData.data]);
        }
        setShowAddModal(false);
    };

    const getLineItemDetails = (lineItemIds) => {
        if (!Array.isArray(lineItemIds)) return { names: "No linked items", totalPrice: 0 };

        let totalPrice = 0;

        const names = lineItemIds.map((id) => {
            const match = originalItems.find(i => i.id === id);

            if (match) {
                totalPrice += match.unit_price || 0;
                return `${match.name} (₹${match.unit_price})`;
            }
            return "";
        });

        return { names: names.join(", "), totalPrice };
    };


    // DropdownCheckbox component kept as-is for single-edit modal usage
    const DropdownCheckbox = ({ selected, options, onChange }) => {
        const [open, setOpen] = useState(false);
        const ref = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (ref.current && !ref.current.contains(event.target)) {
                    setOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const toggleSelect = (id) => {
            const newSelected = selected.includes(id)
                ? selected.filter(val => val !== id)
                : [...selected, id];
            onChange(newSelected);
        };

        return (
            <div ref={ref} className="dropdown-multiselect">
                <div className="dropdown-header" onClick={() => setOpen(!open)}>
                    {selected.length > 0
                        ? `${selected.length} item(s) selected`
                        : "Select Addon(s)"}
                    <span className="dropdown-arrow">▾</span>
                </div>
                {open && (
                    <div className="dropdown-list">
                        {options.map(option => (
                            <label key={option.id} className="dropdown-item">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option.id)}
                                    onChange={() => toggleSelect(option.id)}
                                />
                                {option.name}
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Export to Excel (kept intact)
    const handleExportToExcel = () => {
        const exportData = items.map(item => ({
            ID: item.id || item.inventory_id,
            Name: item.name,
            Description: item.description,
            Category: categories.find(cat => cat.id === item.category_id)?.name || "Unknown",
            Unit: item.unit,
            Unit_Price: item.unit_price,
            Unit_CST: item.unit_cst,
            Unit_GST: item.unit_gst,
            Total_Unit_Price: item.unit_total_price,
            Total_Price: item.total_price,
            CST: item.cst,
            GST: item.gst,
            Discount: item.discount,
            Availability: item.availability,
            Realm: item.realm,
            Dietary: item.dietary_type,
            Slug: item.slug,
            Line_Item_IDs: Array.isArray(item.line_item_id) ? item.line_item_id.join(", ") : item.line_item_id
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "InventoryItems");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, "inventory_items.xlsx");
    };

    // Import from Excel (kept intact although jwtDecode import may be needed)
    const handleImportFromExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let created_by = "unknown", updated_by = "unknown";
        try {
            const decoded = jwtDecode(token);
            created_by = decoded.user_id || "unknown";
            updated_by = decoded.user_id || "unknown";
        } catch { }

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const parsedData = XLSX.utils.sheet_to_json(worksheet);

                //  Delete all existing items
                await axios.delete(
                    `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete_all`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                //  Import new items 
                for (const row of parsedData) {
                    const newItem = {
                        client_id: clientId,
                        name: row.Name || "",
                        description: row.Description || "",
                        category_id: getCategoryIdByName(row.Category),
                        realm: row.Realm || "",
                        availability: parseInt(row.Availability || 0),
                        unit: row.Unit || "",
                        unit_price: parseFloat(row.Unit_Price || 0),
                        unit_cst: parseFloat(row.Unit_CST || 0),
                        unit_gst: parseFloat(row.Unit_GST || 0),
                        unit_total_price: parseFloat(row.Total_Unit_Price || 0),
                        price: parseFloat(row.Price || 0),
                        cst: parseFloat(row.CST || 0),
                        gst: parseFloat(row.GST || 0),
                        discount: parseFloat(row.Discount || 0),
                        total_price: parseFloat(row.Total_Price || 0),
                        slug: row.Slug || "",
                        line_item_id: row.Line_Item_IDs
                            ? row.Line_Item_IDs.split(",").map(id => parseInt(id.trim()))
                            : [],
                        created_by,
                        updated_by
                    };

                    await axios.post(
                        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
                        newItem,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }

                alert("Import successful!");
                fetchInventoryItems();
            };

            reader.readAsBinaryString(file);
        } catch (err) {
            console.error("Import Error:", err);
            alert("Import failed. Check console for details.");
        }
    };

    const getCategoryIdByName = (name) => {
        const found = categories.find(cat => cat.name.toLowerCase() === name?.toLowerCase());
        return found ? found.id : null;
    };

    // --------------- BULK MODAL HANDLERS ----------------

    const openBulkModal = () => {
        // Reset modal states and open
        const initEditing = {};
        const initCopies = {};
        items.forEach(item => {
            initEditing[item.id] = false;
            // Make a shallow copy to be edited without mutating original
            initCopies[item.id] = {
                ...item,
                line_item_id: Array.isArray(item.line_item_id) ? [...item.line_item_id] : (item.line_item_id ? item.line_item_id.split(",").map(i => parseInt(i)) : [])
            };
        });
        setEditingRows(initEditing);
        setEditedRowCopies(initCopies);
        setSelectedRows([]); // nothing selected initially
        setSelectAllChecked(false);
        setShowBulkModal(true);
    };

    const toggleSelectRow = (id) => {
        setSelectedRows(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            return [...prev, id];
        });
    };

    const toggleSelectAll = () => {
        if (!selectAllChecked) {
            const allIds = items.map(i => i.id);
            setSelectedRows(allIds);
            setSelectAllChecked(true);
        } else {
            setSelectedRows([]);
            setSelectAllChecked(false);
        }
    };

    // Toggle edit mode for a particular row
    const toggleRowEdit = (id) => {
        setEditingRows(prev => ({ ...prev, [id]: !prev[id] }));
        // ensure edited copy exists
        setEditedRowCopies(prev => ({ ...prev, [id]: prev[id] ? prev[id] : { ...(items.find(i => i.id === id) || {}) } }));
    };

    // Handle change for fields inside a row's editable copy
    const handleRowChange = (id, field, value) => {
        setEditedRowCopies(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    // Save a single row to backend (used by Save button on that row)
    const handleSaveRow = async (id) => {
        const edited = editedRowCopies[id];
        if (!edited) return alert("Nothing to save for this row.");

        // Prepare update identical to single-edit save
        const updatedItem = {
            ...edited,
            client_id: clientId,
            id: edited.id,
            line_item_id: Array.isArray(edited.line_item_id) ? edited.line_item_id : (typeof edited.line_item_id === "string" ? edited.line_item_id.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : []),
        };
        updatedItem.slug = buildCategoryPath(updatedItem.category_id, updatedItem.name);

        try {
            await axios.post(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`, updatedItem, { headers });
            // Refresh after save
            await fetchInventoryItems();
            setEditingRows(prev => ({ ...prev, [id]: false }));
            setEditedRowCopies(prev => ({ ...prev, [id]: updatedItem }));
            // remove from selectedRows if present (optional)
            // setSelectedRows(prev => prev.filter(x => x !== id));
        } catch (err) {
            console.error("Row save failed:", err);
            alert("Save failed for item " + (edited.name || id));
        }
    };

    // Cancel edits for a row (revert copy to original)
    const handleCancelRow = (id) => {
        const original = items.find(i => i.id === id);
        setEditedRowCopies(prev => ({ ...prev, [id]: original ? { ...original } : prev[id] }));
        setEditingRows(prev => ({ ...prev, [id]: false }));
    };


    const handleBulkDelete = async () => {
        if (selectedRows.length === 0) {
            alert("No rows selected to delete.");
            return;
        }

        const confirmDelete = window.confirm(
            `Are you sure you want to delete ${selectedRows.length} selected item(s)?`
        );
        if (!confirmDelete) return;

        try {
            setBulkSaving(true);
            await Promise.all(
                selectedRows.map(async (id) => {
                    await axios.post(
                        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
                        { id },
                        { headers }
                    );
                })
            );

            alert("Selected items deleted successfully.");
            setSelectedRows([]);
            setSelectAllChecked(false);
            await fetchInventoryItems(); // Refresh list
        } catch (error) {
            console.error("Bulk delete failed:", error);
            alert("Failed to delete some items. Check console for details.");
        } finally {
            setBulkSaving(false);
        }
    };


    const handleSaveSelected = async () => {
        if (selectedRows.length === 0) return alert("No rows selected to save.");
        setBulkSaving(true);
        try {
            await Promise.all(selectedRows.map(async (id) => {
                // Ensure we have the latest edited copy for all fields
                const edited = editedRowCopies[id]
                    ? { ...editedRowCopies[id] }
                    : { ...items.find(i => i.id === id) };

                const updatedItem = {
                    ...edited,
                    client_id: clientId,
                    id: edited.id,
                };

                updatedItem.slug = buildCategoryPath(updatedItem.category_id, updatedItem.name);

                // Update the editedRowCopies to reflect saved data
                setEditedRowCopies(prev => ({ ...prev, [id]: updatedItem }));

                await axios.post(
                    `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
                    updatedItem,
                    { headers }
                );
            }));

            alert("Selected items updated successfully.");
            setShowBulkModal(false);
            setSelectedRows([]);
            setSelectAllChecked(false);
            await fetchInventoryItems();
        } catch (err) {
            console.error("Bulk save failed:", err);
            alert("Bulk save failed. Check console for details.");
        } finally {
            setBulkSaving(false);
        }
    };


    return (
        <div className="menu-container">
            {/* Header */}
            <div className="menu-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                    <h1>Menu Items</h1>
                    <p>Browse and manage your restaurant menu</p>
                </div>

                <button className="btn-add" onClick={openBulkModal} title="Bulk update multiple items">
                    ⚙ Bulk Update & Delete
                </button>

                <button className="btn-add" onClick={() => {
                    setShowAddModal(true);
                    setEditingItem(null);
                }}>
                    + Add Item
                </button>

                <button className="btn-add" onClick={handleExportToExcel}>
                    ⬇ Export to Excel
                </button>

                <button className="btn-add" onClick={() => document.getElementById('excelInput').click()}>
                    ⬆ Import from Excel
                </button>

                <input
                    type="file"
                    id="excelInput"
                    accept=".xlsx, .xls"
                    style={{ display: "none" }}
                    onChange={handleImportFromExcel}
                />
            </div>

            {/* Menu Grid */}
            <div className="menu-grid">
                {items.length === 0 ? (
                    <p className="no-items">No inventory found.</p>
                ) : (
                    items.map((item) => {
                        const { names, totalPrice } = getLineItemDetails(item.line_item_id);
                        const finalPrice = (item.unit_price || 0) + totalPrice;

                        return (
                            <div className="menu-card" key={item.id}>
                                <h4>{item.name}</h4>
                                <h6 className="line-items">Line Items: {names}</h6>
                                <p className="price">₹{finalPrice}</p>
                                <div className="card-actions">
                                    <button className="btn-edit" onClick={() => handleEdit(item)}><FaEdit /></button>
                                    <button className="btn-delete" onClick={() => setDeleteTarget(item)}><FaTrash /></button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Modal (existing) */}
            {showAddModal && (
    <div className="modal-overlay" onClick={(e) => {
        if (e.target.classList.contains("modal-overlay")) {
            setShowAddModal(false);
        }
    }}>
        <div className="menu-modal-content" style={{ position: "relative" }}>
            {/* X button */}
            <button
                style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "transparent",
                    border: "none",
                    fontSize: 20,
                    cursor: "pointer"
                }}
                onClick={() => setShowAddModal(false)}
            >
                ✖
            </button>

            <h3>Add New Menu Item</h3>
            <AddMenuForm
                clientId={clientId}
                onItemCreated={handleItemCreated}
                selectedCategory={selectedCategory}
            />
        </div>
    </div>
)}



            {/* Edit Modal (existing single-item edit) */}
            {showEditModal && editingItem && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target.classList.contains("modal-overlay")) setShowEditModal(false);
                }}>
                    <div className="menu-modal-content">
                        <h3>Edit Menu Item</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleEditSave();
                        }}>

                            <div className="form-entry-wrapper">
                                <div className="form-row">

                                    <DropdownCheckbox
                                        selected={Array.isArray(editingItem.line_item_id) ? editingItem.line_item_id : []}
                                        options={items.filter(i => i.id !== editingItem.id)}  // Exclude self
                                        onChange={(newSelected) =>
                                            setEditingItem({ ...editingItem, line_item_id: newSelected })
                                        }
                                    />


                                    <label htmlFor="">Name : </label>
                                    <input
                                        type="text"
                                        value={editingItem.name}
                                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                        placeholder="Name"
                                        className="form-input"
                                    />
                                    <label htmlFor="">Description : </label>
                                    <input
                                        value={editingItem.description}
                                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                        placeholder="Description"
                                        className="form-input"
                                    />

                                </div>

                                <div className="form-row">
                                    <label htmlFor="">Categories :</label>
                                    <select
                                        value={editingItem.category_id}
                                        onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>

                                    <label htmlFor="">Availability :</label>
                                    <input
                                        value={editingItem.availability}
                                        onChange={(e) => setEditingItem({ ...editingItem, availability: e.target.value })}
                                        placeholder="Availability"
                                        type="number"
                                        className="form-input short"
                                    />

                                    <label htmlFor="">Units :</label>
                                    <input
                                        value={editingItem.unit}
                                        onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                                        placeholder="Unit (e.g. kg, pcs)"
                                        className="form-input short"
                                    />
                                </div>

                                <div className="form-row">
                                    <label htmlFor=""> Unit Price :</label>
                                    <input
                                        type="number"
                                        value={editingItem.unit_price}
                                        onChange={(e) => setEditingItem({ ...editingItem, unit_price: e.target.value })}
                                        placeholder="Price"
                                        className="form-input"
                                    />

                                    <label htmlFor="">Discount :</label>
                                    <input
                                        type="number"
                                        value={editingItem.discount}
                                        onChange={(e) => setEditingItem({ ...editingItem, discount: e.target.value })}
                                        placeholder="Discount"
                                        className="form-input short"
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn-add">Save</button>
                                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation (existing) */}
            {deleteTarget && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>Confirm Delete</h4>
                        <p>Delete <strong>{deleteTarget.name}</strong>?</p>
                        <div className="modal-buttons">
                            <button
                                className="btn-add"
                                onClick={async () => {
                                    await handleDelete(deleteTarget.id);
                                    setDeleteTarget(null);
                                }}
                            >Yes</button>
                            <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>No</button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK UPDATE MODAL */}
            {/* BULK UPDATE MODAL */}
            {showBulkModal && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target.classList.contains("modal-overlay")) setShowBulkModal(false);
                }}>
                    <div className="menu-modal-content" style={{ width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
                        <h3>Bulk Update Items</h3>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div>
                                <label style={{ marginRight: 8 }}>
                                    <input type="checkbox" checked={selectAllChecked} onChange={toggleSelectAll} /> Select All
                                </label>
                                <span style={{ marginLeft: 12 }}>{selectedRows.length} selected</span>
                            </div>

                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    className="btn-add"
                                    onClick={handleSaveSelected}
                                    disabled={bulkSaving || selectedRows.length === 0}
                                >
                                    {bulkSaving ? "Saving..." : "Save Selected"}
                                </button>

                                <button
                                    className="btn-delete"
                                    onClick={handleBulkDelete}
                                    disabled={selectedRows.length === 0}
                                >
                                    Delete Selected
                                </button>

                                <button
                                    className="btn-cancel"
                                    onClick={() => setShowBulkModal(false)}
                                >
                                    Close
                                </button>
                            </div>

                        </div>

                        {/* Table header */}
                        <div className="bulk-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <div className="bulk-row bulk-header" style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 140px 100px 100px 150px", gap: 8, alignItems: "center", padding: "8px 4px", borderBottom: "1px solid #e0e0e0" }}>
                                <div></div>
                                <div><strong>Name</strong></div>
                                <div><strong>Description</strong></div>
                                <div><strong>Category</strong></div>
                                <div><strong>Unit Price</strong></div>
                                <div><strong>Discount</strong></div>
                            </div>

                            {/* Rows */}
                            {items.map((row) => {
                                const copy = editedRowCopies[row.id] || row;
                                const isSelected = selectedRows.includes(row.id);

                                // Automatically open edit if checkbox is selected
                                const isEditing = isSelected;

                                return (
                                    <div key={row.id} className="bulk-row" style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 140px 100px 100px 150px", gap: 8, alignItems: "center", padding: "8px 4px", borderBottom: "1px solid #f0f0f0" }}>
                                        <div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                    toggleSelectRow(row.id);
                                                    // If row was unchecked and now checked, start editing
                                                    if (!isSelected) {
                                                        setEditingRows(prev => ({ ...prev, [row.id]: true }));
                                                    }
                                                }}
                                            />
                                        </div>

                                        {/* Name */}
                                        <div>
                                            {isEditing ? (
                                                <input className="form-input" value={copy.name || ""} onChange={(e) => handleRowChange(row.id, "name", e.target.value)} />
                                            ) : (
                                                <div>{row.name}</div>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <div>
                                            {isEditing ? (
                                                <input className="form-input" value={copy.description || ""} onChange={(e) => handleRowChange(row.id, "description", e.target.value)} />
                                            ) : (
                                                <div style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.description}</div>
                                            )}
                                        </div>

                                        {/* Category */}
                                        <div>
                                            {isEditing ? (
                                                <select className="form-input" value={copy.category_id || ""} onChange={(e) => handleRowChange(row.id, "category_id", e.target.value)}>
                                                    <option value="">Select Category</option>
                                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                </select>
                                            ) : (
                                                <div>{categories.find(c => c.id === row.category_id)?.name || "—"}</div>
                                            )}
                                        </div>

                                        {/* Unit Price */}
                                        <div>
                                            {isEditing ? (
                                                <input type="number" className="form-input short" value={copy.unit_price || ""} onChange={(e) => handleRowChange(row.id, "unit_price", e.target.value)} />
                                            ) : (
                                                <div>₹{row.unit_price ?? "-"}</div>
                                            )}
                                        </div>

                                        {/* Discount */}
                                        <div>
                                            {isEditing ? (
                                                <input type="number" className="form-input short" value={copy.discount || ""} onChange={(e) => handleRowChange(row.id, "discount", e.target.value)} />
                                            ) : (
                                                <div>{row.discount ?? "-"}</div>
                                            )}
                                        </div>

                                        {/* Actions: only Cancel */}
                                        {/* <div style={{ display: "flex", gap: 8 }}>
                                {isEditing && (
                                    <button className="btn-cancel" onClick={() => handleCancelRow(row.id)}>Cancel</button>
                                )}
                            </div> */}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default InventoryItemList;
