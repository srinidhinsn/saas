import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ComboManager({ clientId }) {
  const [menuItems, setMenuItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [newCombo, setNewCombo] = useState({ name: "", description: "", price: "", items: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [editComboId, setEditComboId] = useState(null);

  const fetchCombos = () => {
	axios.get(`http://localhost:8000/api/v1/${clientId}/menu/combos`).then((res) => {
	  console.log("✅ Combos from backend:", res.data);
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
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-2">{isEditing ? "Edit Combo" : "Create Combo"}</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Combo Name"
          value={newCombo.name}
          onChange={(e) => setNewCombo({ ...newCombo, name: e.target.value })}
          className="border p-1 w-full"
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={newCombo.description}
          onChange={(e) => setNewCombo({ ...newCombo, description: e.target.value })}
          className="border p-1 w-full"
        />
        <input
          type="number"
          placeholder="Price"
          value={newCombo.price}
          onChange={(e) => setNewCombo({ ...newCombo, price: e.target.value })}
          className="border p-1 w-full"
          required
        />

        <div>
          <p className="font-medium">Select Items:</p>
          {menuItems.map((item) => {
            const selected = newCombo.items.find((i) => i.menu_item_id === item.id);
            return (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={() => toggleItem(item.id)}
                />
                <span>{item.name}</span>
                {selected && (
                  <input
                    type="number"
                    value={selected.quantity}
                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                    min="1"
                    className="border p-1 w-16"
                  />
                )}
              </div>
            );
          })}
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-1">
          {isEditing ? "Update Combo" : "Create Combo"}
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">Created Combos:</h3>
        <ul className="list-disc ml-5 mt-2">
          {combos.map((combo) => (
		  
		  
            <li key={combo.id} className="mb-2">
			  <div className="font-medium">
				{combo.name} – ₹{combo.price}
			  </div>
			  {combo.items && combo.items.length > 0 && (
				<ul className="ml-4 list-disc text-sm text-gray-700">
				  {combo.items.map((i, index) => (
					<li key={index}>
					  Item ID: {i.menu_item_id}, Qty: {i.quantity}
					</li>
				  ))}
				</ul>
			  )}
			  <div className="space-x-2 mt-1">
				<button onClick={() => handleEdit(combo)} className="text-blue-600">Edit</button>
				<button onClick={() => handleDelete(combo.id)} className="text-red-600">Delete</button>
			  </div>
			</li>

			
			
          ))}
        </ul>
      </div>
    </div>
  );
}
