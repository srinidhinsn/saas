
import React, { useEffect, useState } from "react";
import axios from "axios";
import AddMenuItemForm from "./AddMenuForm";
import { FaEdit, FaTrash } from "react-icons/fa";

function SwiggyMenuItemList({ clientId, category }) {
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
      category_id,
      imageFile
    } = editingItem;

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", parseFloat(price));
      formData.append("dietary", dietary);
      formData.append("gst", parseFloat(gst));
      formData.append("swiggyPrice", parseFloat(swiggyPrice));
      formData.append("zomatoPrice", parseFloat(zomatoPrice));
      formData.append("isAvailableSwiggy", isAvailableSwiggy);
      formData.append("isAvailableZomato", isAvailableZomato);
      formData.append("category_id", category_id);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await axios.put(
        `http://localhost:8000/api/v1/${clientId}/menu/items/${id}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      setItems(items.map((i) => (i.id === id ? res.data : i)));
      setEditingItem(null);
      setShowEditModal(false);
      setRecentlyEditedId(id);
      setTimeout(() => setRecentlyEditedId(null), 2000);
    } catch (err) {
      console.error("Edit save failed:", err);
      alert("Failed to save. Please try again.");
    }
  };


  const handleAddNewItem = (newItem) => {
    setItems([...items, newItem]);
    setShowAddModal(false);
  };

  const toggleAvailability = async (item) => {
    try {
      const res = await axios.put(
        `http://localhost:8000/api/v1/${clientId}/menu/items/${item.id}`,
        {
          ...item,
          isAvailableSwiggy: !item.isAvailableSwiggy
        }
      );

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? res.data : i))
      );
    } catch (err) {
      console.error("Toggle failed:", err);
      alert("Failed to update Swiggy availability.");
    }
  };



  const filteredItems = (category && category.name !== "All"
    ? items.filter(i => i.category_id === category.id)
    : items
  ).filter(i => i.isAvailableSwiggy === true);


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
                {/* Image section */}
                <div className="menu-card-image">
                  {item.image_url ? (
                    <img src={`http://localhost:8000${item.image_url}`} alt={item.name} />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                </div>

                {/* Name, price, code */}
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

                {/* Actions and availability */}
                <div className="menu-card-footer">
                  <button
                    className={item.isAvailableSwiggy ? "btn-on" : "btn-off"}
                    onClick={() => toggleAvailability(item)}
                  >
                    {item.isAvailableSwiggy ? "ON" : "OFF"}
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

      {/* Unavailable Swiggy Items Section */}
      {items.some(i => i.isAvailableSwiggy === false) && (
        <>
          <h4 className="menu-item-subheading">Unavailable Swiggy Items</h4>
          <table className="menu-item-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Dietary</th>
                <th>Swiggy Status</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter(i => i.isAvailableSwiggy === false)
                .map((item) => (
                  <tr key={item.id}>
                    <td>{item.itemCode || "x"}</td>
                    <td>{item.name}</td>
                    <td>{categories.find(cat => cat.id === item.category_id)?.name || "N/A"}</td>
                    <td>{item.dietary || "x"}</td>
                    <td>
                      <button
                        className="btn-on"
                        onClick={() => toggleAvailability(item)}
                      >
                        Turn ON
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

    </>



  );
}

export default SwiggyMenuItemList;
