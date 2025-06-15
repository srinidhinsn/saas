import React, { useEffect, useState } from "react";
import axios from "axios";
import '../styles/ComboManager.css'

export default function ComboManager({ clientId }) {
  const [menuItems, setMenuItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [newCombo, setNewCombo] = useState({ name: "", description: "", price: "", items: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [editComboId, setEditComboId] = useState(null);

  const fetchCombos = () => {
    axios.get(`http://localhost:8000/api/v1/${clientId}/menu/combos`).then((res) => {
      setCombos(res.data);
    });
  };

  useEffect(() => {
    if (!clientId) return;

    axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`).then((res) => setMenuItems(res.data));
    fetchCombos();
  }, [clientId]);

  const toggleItem = (menuItemId) => {
    setNewCombo((prev) => {
      const exists = prev.items.find((i) => i.menu_item_id === menuItemId);
      if (exists) {
        return { ...prev, items: prev.items.filter((i) => i.menu_item_id !== menuItemId) };
      } else {
        return { ...prev, items: [...prev.items, { menu_item_id: menuItemId, quantity: 1 }] };
      }
    });
  };

  const updateQuantity = (menuItemId, quantity) => {
    setNewCombo((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.menu_item_id === menuItemId ? { ...i, quantity: parseInt(quantity) } : i
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...newCombo, price: parseFloat(newCombo.price), client_id: clientId };

    if (isEditing) {
      await axios.put(`http://localhost:8000/api/v1/${clientId}/menu/combos/${editComboId}`, payload);
    } else {
      await axios.post(`http://localhost:8000/api/v1/${clientId}/menu/combos`, payload);
    }

    setNewCombo({ name: "", description: "", price: "", items: [] });
    setIsEditing(false);
    setEditComboId(null);
    fetchCombos();
  };

  const handleEdit = (combo) => {
    setIsEditing(true);
    setEditComboId(combo.id);
    setNewCombo({
      name: combo.name,
      description: combo.description,
      price: combo.price,
      items: combo.items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }))
    });
  };

  const handleDelete = async (comboId) => {
    await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/combos/${comboId}`);
    fetchCombos();
  };

  return (
    <div className="combo-manager-container">
      <form onSubmit={handleSubmit} className="combo-form">

        <h2 className="combo-title">{isEditing ? "Edit Combo" : "Create Combo"}</h2>
        <input
          type="text"
          placeholder="Combo Name"
          value={newCombo.name}
          onChange={(e) => setNewCombo({ ...newCombo, name: e.target.value })}
          className="combo-input"
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={newCombo.description}
          onChange={(e) => setNewCombo({ ...newCombo, description: e.target.value })}
          className="combo-input"
        />
        <input
          type="number"
          placeholder="Price"
          value={newCombo.price}
          onChange={(e) => setNewCombo({ ...newCombo, price: e.target.value })}
          className="combo-input"
          required
          min="0"
          step="0.01"
        />

        <div className="items-section">
          <p className="items-label">Select Items:</p>
          {menuItems.map((item) => {
            const selected = newCombo.items.find((i) => i.menu_item_id === item.id);
            return (
              <div key={item.id} className="item-row">
                <label>
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => toggleItem(item.id)}
                    className="item-checkbox"
                  />
                  <span className="item-name">{item.name}</span>
                </label>
                {selected && (
                  <input
                    type="number"
                    value={selected.quantity}
                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                    min="1"
                    className="quantity-input"
                  />
                )}
              </div>
            );
          })}
        </div>

        <button type="submit" className="submit-button">
          {isEditing ? "Update Combo" : "Create Combo"}
        </button>
      </form>

      <div className="created-combos">
        <h3 className="created-combos-title">Created Combos:</h3>
        <ul className="combo-list">
          {combos.map((combo) => (
            <li key={combo.id} className="combo-item">
              <div className="combo-header">
                <span className="combo-name">{combo.name}</span>
                <span className="combo-price">₹{combo.price.toFixed(2)}</span>
              </div>
              {combo.items && combo.items.length > 0 && (
                <ul className="combo-items-list">
                  {combo.items.map((i, index) => (
                    <li key={index} className="combo-item-detail">
                      Item: {
                        (menuItems.find(item => item.id === i.menu_item_id)?.name || "Unknown")
                      }, Qty: {i.quantity}

                    </li>
                  ))}
                </ul>
              )}
              <div className="combo-actions">
                <button onClick={() => handleEdit(combo)} className="edit-button">
                  Edit
                </button>
                <button onClick={() => handleDelete(combo.id)} className="delete-button">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
