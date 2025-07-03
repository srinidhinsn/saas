
import React, { useEffect, useState } from "react";
import axios from "axios";
import AddMenuItemForm from "./AddMenuForm";
import { FaEdit, FaTrash } from "react-icons/fa";

function ZomatoMenuItemList({ clientId, category }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTargetCategoryId, setAddTargetCategoryId] = useState(null);
  const [recentlyEditedId, setRecentlyEditedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);


  const isAllCategory = category?.name?.toLowerCase() === "all";

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
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    const {
      id,
      name,
      description,
      price,
      dietary,
      gst,
      swiggyPrice,
      zomatoPrice,
      isAvailableSwiggy,
      isAvailableZomato,
      imageFile,
    } = editingItem;

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description || "");
      formData.append("price", price);
      formData.append("dietary", dietary || "");
      formData.append("gst", gst || 0);
      formData.append("swiggyPrice", swiggyPrice || 0);
      formData.append("zomatoPrice", zomatoPrice || 0);
      formData.append("isAvailableSwiggy", isAvailableSwiggy ? "true" : "false");
      formData.append("isAvailableZomato", isAvailableZomato ? "true" : "false");

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await axios.put(
        `http://localhost:8000/api/v1/${clientId}/menu/items/${id}/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setItems(items.map((i) => (i.id === id ? res.data : i)));
      setEditingItem(null);
      setRecentlyEditedId(id);
      setTimeout(() => setRecentlyEditedId(null), 2000);
    } catch (error) {
      console.error("Save failed:", error.response?.data || error.message);
      alert("Save failed. Please check inputs.");
    }
  };

  const handleAddNewItem = (newItem) => {
    setItems([...items, newItem]);
    setShowAddModal(false);
  };

  const toggleAvailability1 = async (item) => {
    try {
      const res = await axios.put(
        `http://localhost:8000/api/v1/${clientId}/menu/items/${item.id}`,
        {
          ...item,
          isAvailableZomato: !item.isAvailableZomato
        }
      );

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? res.data : i))
      );
    } catch (err) {
      console.error("Toggle failed:", err);
      alert("Failed to update Zomato availability.");
    }
  };


  const filteredItems = (category && category.name !== "All"
    ? items.filter(i => i.category_id === category.id)
    : items
  ).filter(i => i.isAvailableZomato === true);


  return (
    <>
      <div className="menu-item-table-container">
        <div className="menu-item-header">
          <h3 className="menu-item-title">
            {category ? `Items in ${category.name}` : ""}
          </h3>

          {!isAllCategory && (
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


        </div>

        <div className="menu-grid-container">
          {filteredItems.length === 0 ? (
            <p className="no-items">No items found.</p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`menu-grid-card ${recentlyEditedId === item.id ? "highlight" : ""}`}
              >
                {/* Image */}
                <div className="menu-card-image">
                  {item.image_url ? (
                    <img src={`http://localhost:8000${item.image_url}`} alt={item.name} />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                </div>

                {/* Info */}
                <div className="menu-card-body">
                  <h4>{item.name}</h4>
                  <p className="menu-card-price">₹{item.price}</p>
                  <p className="menu-card-code">Code: {item.itemCode || "x"}</p>
                  <p className="menu-card-code">GST: {item.gst || "x"}%</p>
                  <p className="menu-card-code">
                    Category: {categories.find(cat => cat.id === item.category_id)?.name || "N/A"}
                  </p>
                  <p className="menu-card-code">Dietary: {item.dietary || "x"}</p>
                  <p className="menu-card-code">Description: {item.description || "x"}</p>
                </div>

                {/* Footer with actions */}
                <div className="menu-card-footer">
                  <button
                    className={item.isAvailableZomato ? "btn-on" : "btn-off"}
                    onClick={() => toggleAvailability1(item)}
                  >
                    {item.isAvailableZomato ? "ON" : "OFF"}
                  </button>

                  <div>
                    <button onClick={() => handleEdit(item)} className="btn-edit">
                      <FaEdit />
                    </button>
                    <button onClick={() => setDeleteTarget(item)} className="btn-delete">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>


        {/* Add Item Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={(e) => {
            if (e.target.classList.contains("modal-overlay")) setShowAddModal(false);
          }}>
            <div className="menu-modal-content">
              <h3>Add New Menu Item</h3>
              <AddMenuItemForm
                clientId={clientId}
                categoryId={addTargetCategoryId}
                onAdd={handleAddNewItem}
              />
              <button className="btn-cancel modal-close-btn" onClick={() => setShowAddModal(false)}>Close</button>
            </div>
          </div>
        )}

        {showEditModal && editingItem && (
          <div className="modal-overlay" onClick={(e) => {
            if (e.target.classList.contains("modal-overlay")) setShowEditModal(false);
          }}>
            <div className="menu-modal-content">
              <h3>Edit Menu Item</h3>

              <form onSubmit={(e) => { e.preventDefault(); handleEditSave(); }} className="add-menu-item-form">
                <div className="form-entry-wrapper">
                  {/* Row 1 */}
                  <div className="form-row">
                    <input
                      value={editingItem.itemCode || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, itemCode: e.target.value })}
                      placeholder="Item Code"
                      className="form-input short"
                      required
                    />
                    <input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      placeholder="Item Name"
                      className="form-input"
                      required
                    />
                    <input
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      placeholder="Description"
                      className="form-input"
                    />

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, imageFile: e.target.files[0] })
                      }
                      className="form-input"
                    />

                    <select
                      value={editingItem.dietary}
                      onChange={(e) => setEditingItem({ ...editingItem, dietary: e.target.value })}
                      placeholder="Dietary"
                      className="form-input"
                      required
                    >
                      <option value="">Select Dietary</option>
                      <option value="VEG">VEG</option>
                      <option value="NON-VEG">NON-VEG</option>
                    </select>

                  </div>

                  {/* Row 2 */}
                  <div className="form-row">
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                      placeholder="Price"
                      className="form-input short"
                      required
                    />
                    <input
                      type="number"
                      value={editingItem.gst}
                      onChange={(e) => setEditingItem({ ...editingItem, gst: e.target.value })}
                      placeholder="GST (%)"
                      className="form-input short"
                      required
                    />
                    <select
                      value={editingItem.category_id}
                      onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                      className="form-input"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
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

        {/* Custom Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h4>Confirm Delete</h4>
              <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>?</p>
              <div className="modal-buttons">
                <button className="btn-delete" onClick={async () => {
                  await handleDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }}>
                  Yes, Delete
                </button>
                <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {items.some(i => i.isAvailableZomato === false) && (
  <>
    <h4 className="menu-item-subheading">Unavailable Zomato Items</h4>
    <div className="menu-grid-container">
      {items
        .filter(i => i.isAvailableZomato === false)
        .map((item) => (
          <div key={item.id} className="menu-grid-card">
            {/* Image */}
            <div className="menu-card-image">
              {item.image_url ? (
                <img src={`http://localhost:8000${item.image_url}`} alt={item.name} />
              ) : (
                <div className="no-image">No Image</div>
              )}
            </div>

            {/* Info */}
            <div className="menu-card-body">
              <h4>{item.name}</h4>
              <p className="menu-card-code">Code: {item.itemCode || "x"}</p>
              <p className="menu-card-code">
                Category: {categories.find(cat => cat.id === item.category_id)?.name || "N/A"}
              </p>
              <p className="menu-card-code">Dietary: {item.dietary || "x"}</p>
            </div>

            {/* Footer */}
            <div className="menu-card-footer">
              <button
                className="btn-on"
                onClick={() => toggleAvailability1(item)}
              >
                Turn ON
              </button>
            </div>
          </div>
        ))}
    </div>
  </>
)}

    </>
  );
}

export default ZomatoMenuItemList;
