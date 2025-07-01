
import React, { useEffect, useState } from "react";
import axios from "axios";
import AddMenuItemForm from "./AddMenuItemForm";
import { FaEdit, FaTrash } from "react-icons/fa";

function MenuItemList({ clientId, category }) {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addTargetCategoryId, setAddTargetCategoryId] = useState(null);

    useEffect(() => {
        axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
            .then(res => setItems(res.data));
        axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
            .then(res => setCategories(res.data));
    }, [clientId]);



    const handleDelete = async (id) => {
        await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/items/${id}`);
        setItems(items.filter((i) => i.id !== id));
    };


    const handleEdit = (item) => {
        setEditingItem({ ...item });
    };

    const handleEditSave = async () => {
        const { id, name, description, price, image_url } = editingItem;

        const res = await axios.put(
            `http://localhost:8000/api/v1/${clientId}/menu/items/${id}`,
            { name, description, price, image_url }
        );

        setItems(items.map((i) => (i.id === id ? res.data : i)));
        setEditingItem(null);
    };

    const handleAddNewItem = (newItem) => {
        setItems([...items, newItem]);
        setShowAddModal(false);
    };


    const handleExport = () => {
        const headers = ["Name", "Price", "Description", "Category", "Addons", "Dietary", "GST"];
        const rows = items.map(item => [
            `"${item.name}"`,
            item.price,
            `"${item.description}"`,
            `"${categories.find(cat => cat.id === item.category_id)?.name || ''}"`,
            `"${Array.isArray(item.addons) ? item.addons.join(", ") : item.addons || ''}"`,
            item.dietary || '',
            item.gst || ''
        ]);

        const csvContent =
            [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "menu_items.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    // Filter by selected category or show all
    const filteredItems =
        category && category.name !== "All"
            ? items.filter(i => i.category_id === category.id)
            : items;

    return (
        <div className="menu-item-table-container">
            <div className="menu-item-header">
                <h3 className="menu-item-title">
                    {category ? `Items in ${category.name}` : ""}
                </h3>
                {category && category.name !== "All" && (
                    <button
                        className="btn-add"
                        onClick={() => {
                            setShowAddModal(true);
                            setAddTargetCategoryId(category.id);
                            setEditingItem(null);
                        }}
                    >
                        + Add Item
                    </button>
                )}

                {category && category.name === "All" && (
                    <button className="btn-add" onClick={handleExport}>
                        ⬇ Export
                    </button>
                )}

            </div>

            <table className="menu-item-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th>Price (₹)</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Addons</th>
                        <th>Dietary</th>
                        <th>GST (%)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredItems.length === 0 ? (
                        <tr>
                            <td colSpan="9" style={{ textAlign: "center" }}>
                                No items found.
                            </td>
                        </tr>
                    ) : (
                        filteredItems.map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>
                                    {editingItem?.id === item.id ? (
                                        <input
                                            className="menu-item-input"
                                            value={editingItem.name}
                                            onChange={(e) =>
                                                setEditingItem({ ...editingItem, name: e.target.value })
                                            }
                                        />
                                    ) : (
                                        item.name
                                    )}
                                </td>
                                <td>
                                    {editingItem?.id === item.id ? (
                                        <input
                                            type="number"
                                            className="menu-item-input"
                                            value={editingItem.price}
                                            onChange={(e) =>
                                                setEditingItem({
                                                    ...editingItem,
                                                    price: parseFloat(e.target.value),
                                                })
                                            }
                                        />
                                    ) : (
                                        `₹${item.price}`
                                    )}
                                </td>
                                <td>
                                    {editingItem?.id === item.id ? (
                                        <input
                                            className="menu-item-input"
                                            value={editingItem.description}
                                            onChange={(e) =>
                                                setEditingItem({
                                                    ...editingItem,
                                                    description: e.target.value,
                                                })
                                            }
                                        />
                                    ) : (
                                        item.description
                                    )}
                                </td>
                                <td>
                                    {categories.find(cat => cat.id === item.category_id)?.name || "N/A"}
                                </td>
                                <td>{Array.isArray(item.addons) ? item.addons.join(", ") : item.addons || "—"}</td>
                                <td>{item.dietary || "—"}</td>
                                <td>{item.gst ? `${item.gst}%` : "—"}</td>
                                <td className="menu-item-actions">
                                    {editingItem?.id === item.id ? (
                                        <>
                                            <button onClick={handleEditSave} className="btn-edit">
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingItem(null)}
                                                className="btn-delete"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="btn-edit"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="btn-delete"
                                            >
                                                <FaTrash />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {showAddModal && (
                <div
                    className="modal-overlay"
                    onClick={(e) => {
                        if (e.target.classList.contains("modal-overlay"))
                            setShowAddModal(false);
                    }}
                >
                    <div className="modal-content">
                        <h3>Add New Menu Item</h3>
                        <AddMenuItemForm
                            clientId={clientId}
                            categoryId={addTargetCategoryId}
                            onAdd={handleAddNewItem}
                        />
                        <button
                            className="btn-cancel modal-close-btn"
                            onClick={() => setShowAddModal(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MenuItemList;
