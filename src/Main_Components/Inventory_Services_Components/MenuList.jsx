
    // const handleExportToExcel = () => {
    //     const exportData = items.map(item => ({
    //         ID: item.id || item.inventory_id,
    //         Name: item.name,
    //         Description: item.description,
    //         Category: categories.find(cat => cat.id === item.category_id)?.name || "Unknown",
    //         Unit: item.unit,
    //         Unit_Price: item.unit_price,
    //         Unit_CST: item.unit_cst,
    //         Unit_GST: item.unit_gst,
    //         Total_Unit_Price: item.unit_total_price,
    //         Total_Price: item.total_price,
    //         CST: item.cst,
    //         GST: item.gst,
    //         Discount: item.discount,
    //         Availability: item.availability,
    //         Realm: item.realm,
    //         Dietary: item.dietary_type,
    //         Slug: item.slug,
    //         Line_Item_IDs: Array.isArray(item.line_item_id) ? item.line_item_id.join(", ") : item.line_item_id
    //     }));

    //     const worksheet = XLSX.utils.json_to_sheet(exportData);
    //     const workbook = XLSX.utils.book_new();
    //     XLSX.utils.book_append_sheet(workbook, worksheet, "InventoryItems");

    //     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    //     const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    //     saveAs(data, "inventory_items.xlsx");
    // };

    

    // const handleImportFromExcel = async (e) => {
    //     const file = e.target.files[0];
    //     if (!file) return;
    
    //     let created_by = "unknown", updated_by = "unknown";
    //     try {
    //         const decoded = jwtDecode(token);
    //         created_by = decoded.user_id || "unknown";
    //         updated_by = decoded.user_id || "unknown";
    //     } catch {}
    
    //     try {
    //         const reader = new FileReader();
    //         reader.onload = async (evt) => {
    //             const data = evt.target.result;
    //             const workbook = XLSX.read(data, { type: "binary" });
    //             const sheetName = workbook.SheetNames[0];
    //             const worksheet = workbook.Sheets[sheetName];
    //             const parsedData = XLSX.utils.sheet_to_json(worksheet);
    
    //             // 🔴 Step 1: Delete all existing items
    //             await inventoryServicesPort.delete(
    //                 `/${clientId}/inventory/delete_all`,
    //                 { headers: { Authorization: `Bearer ${token}` } }
    //             );
    
    //             // ✅ Step 2: Import new items from Excel
    //             for (const row of parsedData) {
    //                 const newItem = {
    //                     client_id: clientId,
    //                     name: row.Name || "",
    //                     description: row.Description || "",
    //                     category_id: getCategoryIdByName(row.Category),
    //                     realm: row.Realm || "",
    //                     availability: parseInt(row.Availability || 0),
    //                     unit: row.Unit || "",
    //                     unit_price: parseFloat(row.Unit_Price || 0),
    //                     unit_cst: parseFloat(row.Unit_CST || 0),
    //                     unit_gst: parseFloat(row.Unit_GST || 0),
    //                     unit_total_price: parseFloat(row.Total_Unit_Price || 0),
    //                     price: parseFloat(row.Price || 0),
    //                     cst: parseFloat(row.CST || 0),
    //                     gst: parseFloat(row.GST || 0),
    //                     discount: parseFloat(row.Discount || 0),
    //                     total_price: parseFloat(row.Total_Price || 0),
    //                     slug: row.Slug || "",
    //                     line_item_id: row.Line_Item_IDs
    //                         ? row.Line_Item_IDs.split(",").map(id => parseInt(id.trim()))
    //                         : [],
    //                     created_by,
    //                     updated_by
    //                 };
    
    //                 await inventoryServicesPort.post(
    //                     `/${clientId}/inventory/create`,
    //                     newItem,
    //                     { headers: { Authorization: `Bearer ${token}` } }
    //                 );
    //             }
    
    //             alert("Import successful!");
    //             fetchInventoryItems();
    //         };
    
    //         reader.readAsBinaryString(file);
    //     } catch (err) {
    //         console.error("Import Error:", err);
    //         alert("Import failed. Check console for details.");
    //     }
    // };
    
    // // Helper function to map category name to ID
    // const getCategoryIdByName = (name) => {
    //     const found = categories.find(cat => cat.name.toLowerCase() === name?.toLowerCase());
    //     return found ? found.id : null;
    // };

    
  {/* <button className="btn-add" onClick={handleExportToExcel}>
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
  /> */}



  

import React, { useEffect, useState, useRef } from "react";
import AddMenuForm from './AddInventoryItemForm'; 
import { useParams } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";


function InventoryItemList({ selectedCategory }) {
    const [items, setItems] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [originalItems, setOriginalItems] = useState([]);

    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    const [categories, setCategories] = useState([]);
    const { clientId } = useParams();
    useEffect(() => {
        if (!token || !clientId) return;

        inventoryServicesPort.get(`/${clientId}/inventory/read_category`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setCategories(res.data.data || []);
            })
            .catch((err) => {
                console.error("Error fetching categories:", err);
            });
    }, [clientId]);

    useEffect(() => {
        if (!clientId || !token) return;

        inventoryServicesPort
            .get(`/${clientId}/inventory/read`, { headers })
            .then((res) => {
                console.log("fetched items  :", res.data.data)
                setItems(res.data.data || []);
                setOriginalItems(res.data.data || []);
            })
            .catch((err) => {
                console.error("Failed to load inventory:", err);
            });
    }, [clientId, token]);


    useEffect(() => {
        if (!selectedCategory || selectedCategory.name === "All") {
            setItems(originalItems);
        } else {
            const filtered = originalItems.filter(item => item.category_id === selectedCategory.id);
            setItems(filtered);
        }
    }, [selectedCategory, originalItems]);



    const handleEdit = (item) => {
        setEditingItem({ ...item });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        const updatedItem = {
            ...editingItem,
            client_id: clientId,
            line_item_id: Array.isArray(editingItem.line_item_id)
                ? editingItem.line_item_id
                : typeof editingItem.line_item_id === "string"
                    ? editingItem.line_item_id
                        .split(",")
                        .map((s) => parseInt(s.trim()))
                        .filter((n) => !isNaN(n))
                    : [],
        };

        try {
            const res = await inventoryServicesPort.post(
                `/${clientId}/inventory/update`,
                updatedItem,
                { headers }
            );

            setItems((prev) =>
                prev.map((i) =>
                    i.inventory_id === updatedItem.inventory_id ? res.data.data : i
                )
            );
            setShowEditModal(false);
            setEditingItem(null);
        } catch (err) {
            console.error("Edit failed:", err.response?.data || err.message);
            alert("Edit failed.");
        }
    };


    const handleDelete = async (id) => {
        try {
            await inventoryServicesPort.post(
                `/${clientId}/inventory/delete`,
                { id },
                { headers }
            );

            setItems((prev) => prev.filter((i) => i.id !== id));
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
            const match = items.find((i) => i.id === id || i.line_item_id === id);
            if (match) {
                totalPrice += match.unit_price || 0;
                return `${match.name} (₹${match.unit_price})`;
            }
            return "Unknown";
        });

        return { names: names.join(", "), totalPrice };
    };

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


    


    return (
        <div className="menu-items-panel">
           <div className="btns">
  <button className="btn-add" onClick={() => {
    setShowAddModal(true);
    setEditingItem(null);
  }}>
    + Add Item
  </button>

  
</div>



            <div className="grid-layout ">
                {items.length === 0 ? (
                    <p className="no-items">No inventory found.</p>
                ) : (
                    items.map((item) => {
                        const { names, totalPrice } = getLineItemDetails(item.line_item_id);
                        const finalPrice = (item.unit_price || 0) + totalPrice;

                        return (
                            <div className="grids" key={item.inventory_id}>
                                <h4>{item.name}</h4>
                                <h4>Line Items: {names}</h4>
                                <p className="menu-card-price">₹{finalPrice}</p>
                                <div className="menu-card-footer">
                                    <button className="btn-edit" onClick={() => handleEdit(item)}><FaEdit /></button>
                                    <button className="btn-delete" onClick={() => setDeleteTarget(item)}><FaTrash /></button>
                                </div>
                            </div>
                        );
                    })

                )}

            </div>

            {showAddModal && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target.classList.contains("modal-overlay")) {
                        setShowAddModal(false);
                    }
                }}>
                    <div className="menu-modal-content">
                        <h3>Add New Inventory Item</h3>
                        <AddMenuForm
                            clientId={clientId}
                            onItemCreated={handleItemCreated}
                        />
                    </div>
                </div>
            )}

            {showEditModal && editingItem && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target.classList.contains("modal-overlay")) setShowEditModal(false);
                }}>
                    <div className="menu-modal-content">
                        <h3>Edit Inventory Item</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleEditSave();
                        }}>

                            <div className="form-entry-wrapper">
                                <div className="form-row">
                                    <input
                                        type="text"
                                        value={editingItem.inventory_id}
                                        onChange={(e) => setEditingItem({ ...editingItem, inventory_id: e.target.value })}
                                        placeholder="Inventory ID"
                                        className="form-input short"
                                        readOnly
                                    />


                                    <DropdownCheckbox
                                        selected={Array.isArray(editingItem.line_item_id) ? editingItem.line_item_id : []}
                                        options={items}
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

                                    <label htmlFor="">Realm :</label>
                                    <input
                                        value={editingItem.realm}
                                        onChange={(e) => setEditingItem({ ...editingItem, realm: e.target.value })}
                                        placeholder="Realm"
                                        className="form-input"
                                    />
                                    <label htmlFor="">Dietary : </label>
                                    <select
                                        value={editingItem.dietary_type}
                                        onChange={(e) => setEditingItem({ ...editingItem, dietary_type: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="">Select Dietary Type</option>
                                        <option value="veg">Veg</option>
                                        <option value="non-veg">NonVeg</option>
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

                                    <label htmlFor="">CST :</label>
                                    <input
                                        type="number"
                                        value={editingItem.unit_cst}
                                        onChange={(e) => setEditingItem({ ...editingItem, unit_cst: e.target.value })}
                                        placeholder="Unit CST"
                                        className="form-input short"
                                    />

                                    <label htmlFor="">GST :</label>
                                    <input
                                        type="number"
                                        value={editingItem.unit_gst}
                                        onChange={(e) => setEditingItem({ ...editingItem, unit_gst: e.target.value })}
                                        placeholder="Unit GST"
                                        className="form-input short"
                                    />

                                    <label htmlFor="">Total Price : </label>
                                    <input
                                        type="number"
                                        value={editingItem.unit_total_price}
                                        onChange={(e) => setEditingItem({ ...editingItem, unit_total_price: e.target.value })}
                                        placeholder="Unit Total Price"
                                        className="form-input short"
                                    />
                                </div>


                                <div className="form-row">
                                    <label htmlFor="">Total Price :</label>
                                    <input
                                        type="number"
                                        value={editingItem.price}
                                        onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                        placeholder="Price"
                                        className="form-input short"
                                    />

                                    <label htmlFor="">Total GST :</label>
                                    <input
                                        type="number"
                                        value={editingItem.cst}
                                        onChange={(e) => setEditingItem({ ...editingItem, cst: e.target.value })}
                                        placeholder="CST"
                                        className="form-input short"
                                    />

                                    <label htmlFor="">Total GST :</label>
                                    <input
                                        type="number"
                                        value={editingItem.gst}
                                        onChange={(e) => setEditingItem({ ...editingItem, gst: e.target.value })}
                                        placeholder="GST"
                                        className="form-input short"
                                    />

                                    <label htmlFor="">Discount :</label>
                                    <input
                                        type="number"
                                        value={editingItem.discount}
                                        onChange={(e) => setEditingItem({ ...editingItem, discount: e.target.value })}
                                        placeholder="Discount"
                                        className="form-input short"
                                    />

                                    <label htmlFor="">Total Price :</label>
                                    <input
                                        type="number"
                                        value={editingItem.total_price}
                                        onChange={(e) => setEditingItem({ ...editingItem, total_price: e.target.value })}
                                        placeholder="Total Price"
                                        className="form-input short"
                                    />

                                    <label htmlFor="">Slug :</label>
                                    <input
                                        value={editingItem.slug}
                                        onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })}
                                        placeholder="Slug"
                                        className="form-input"
                                    />
                                    <button
                                        type="button"
                                        className="btn-cancel-row"
                                        onClick={() => handleCancel(index)}
                                    >
                                        Cancel
                                    </button>
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
        </div>
    );
}

export default InventoryItemList;
