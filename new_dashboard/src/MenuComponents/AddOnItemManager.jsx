import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash } from "react-icons/fa";

function AddonItemManager({ group }) {
  const [itemsByGroup, setItemsByGroup] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", dietary: "" });

  useEffect(() => {
    if (group) fetchItems();
  }, [group]);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/addons/groups/${group.id}/items`);
      setItemsByGroup(prev => ({ ...prev, [group.id]: res.data }));
    } catch (err) {
      console.error("Failed to fetch addon items:", err);
    }
  };

  if (!group) {
    return <div className="addon-item-placeholder">🔍 Select a group to view its items.</div>;
  }

  const items = itemsByGroup[group.id] || [];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddItem = async () => {
    if (!formData.name.trim() || isNaN(parseFloat(formData.price))) return;

    try {
      const res = await axios.post(`http://localhost:8000/api/v1/addons/items`, {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        dietary: formData.dietary.trim(),
        group_id: group.id,
      });

      setItemsByGroup(prev => ({
        ...prev,
        [group.id]: [...(prev[group.id] || []), res.data],
      }));

      setFormData({ name: "", price: "", dietary: "" });
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add item:", err);
      alert("Add failed.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this add-on item?")) return;
    try {
      await axios.delete(`http://localhost:8000/api/v1/addons/items/${id}`);
      setItemsByGroup(prev => ({
        ...prev,
        [group.id]: prev[group.id].filter(item => item.id !== id),
      }));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed.");
    }
  };

  const handleEditChange = (id, field, value) => {
    setItemsByGroup(prev => ({
      ...prev,
      [group.id]: prev[group.id].map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleEditSave = async (item) => {
    try {
      const res = await axios.put(`http://localhost:8000/api/v1/addons/items/${item.id}`, {
        name: item.name,
        price: parseFloat(item.price),
        dietary: item.dietary,
      });

      setItemsByGroup(prev => ({
        ...prev,
        [group.id]: prev[group.id].map(i => (i.id === item.id ? res.data : i)),
      }));

      setEditingItemId(null);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Update failed.");
    }
  };

  return (
    <div className="menu-item-table-container">
      <div className="menu-item-header">
        <h3 className="menu-item-title">Items in {group.name}</h3>
        <button className="btn-add" onClick={() => setShowAddModal(true)}>+ Add Item</button>
      </div>

      <div className="menu-grid-container">
        {items.length === 0 ? (
          <p className="no-items">No items found.</p>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="menu-grid-card">
              <div className="menu-card-body">
                <h4 className="menu-card-name">
                  {editingItemId === item.id ? (
                    <input
                      value={item.name}
                      className="menu-item-input"
                      onChange={(e) => handleEditChange(item.id, "name", e.target.value)}
                    />
                  ) : (
                    item.name
                  )}
                </h4>

                <p className="menu-card-price">
                  {editingItemId === item.id ? (
                    <input
                      type="number"
                      className="menu-item-input"
                      value={item.price}
                      onChange={(e) =>
                        handleEditChange(item.id, "price", parseFloat(e.target.value))
                      }
                    />
                  ) : (
                    `₹${item.price.toFixed(2)}`
                  )}
                </p>

                <p className="menu-card-dietary">
                  {editingItemId === item.id ? (
                    <input
                      className="menu-item-input"
                      value={item.dietary}
                      onChange={(e) => handleEditChange(item.id, "dietary", e.target.value)}
                    />
                  ) : (
                    item.dietary || "—"
                  )}
                </p>
              </div>

              <div className="menu-card-footer">
                {editingItemId === item.id ? (
                  <>
                    <button onClick={() => handleEditSave(item)} className="btn-edit">Save</button>
                    <button onClick={() => setEditingItemId(null)} className="btn-delete">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditingItemId(item.id)} className="btn-edit"><FaEdit /></button>
                    <button onClick={() => handleDelete(item.id)} className="btn-delete"><FaTrash /></button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.classList.contains("modal-overlay")) setShowAddModal(false);
        }}>
          <div className="modal-content">
            <h3>Add New Addon Item</h3>
            <input
              type="text"
              name="name"
              placeholder="Add-on Item Name"
              value={formData.name}
              onChange={handleChange}
              className="modal-input"
            />
            <input
              type="number"
              name="price"
              placeholder="Price"
              value={formData.price}
              onChange={handleChange}
              className="modal-input"
            />
            <input
              type="text"
              name="dietary"
              placeholder="Dietary Info"
              value={formData.dietary}
              onChange={handleChange}
              className="modal-input"
            />
            <div className="modal-buttons">
              <button onClick={handleAddItem} className="modal-save-btn">Add</button>
              <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddonItemManager;
