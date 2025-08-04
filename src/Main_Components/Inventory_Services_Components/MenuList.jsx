import React, { useEffect, useState } from "react";
import axios from "axios";
import AddMenuForm from './AddInventoryItemForm'; import { useParams } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";

function MenuList({ selectedCategory }) {
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

        axios.get(`http://localhost:8002/saas/${clientId}/inventory/read_category`, {
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

        axios
            .get(`http://localhost:8002/saas/${clientId}/inventory/read`, { headers })
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
            const res = await axios.post(
                `http://localhost:8002/saas/${clientId}/inventory/update`,
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
            await axios.post(
                `http://localhost:8002/saas/${clientId}/inventory/delete`,
                { id }, // ✅ backend expects { id: value }
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
                    items.map((item) => (
                        <div className="grids" key={item.inventory_id}>
                            <h4>{item.name}</h4>
                            <p className="menu-card-price">₹{item.unit_price}</p>
                            <div className="menu-card-footer">
                                <button className="btn-edit" onClick={() => handleEdit(item)}><FaEdit /></button>
                                <button className="btn-delete" onClick={() => setDeleteTarget(item)}><FaTrash /></button>
                            </div>
                        </div>
                    ))
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
                                    <select
                                        value={editingItem.line_item_id}
                                        onChange={(e) => setEditingItem({ ...editingItem, line_item_id: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="">Select Addon</option>
                                        {items.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>

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

export default MenuList;
