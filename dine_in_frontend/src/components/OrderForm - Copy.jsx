import { useEffect, useState } from "react";
import axios from "axios";

const OrderForm = ({ clientId, tableId, onOrderCreated }) => {
  const [items, setItems] = useState([{ item_id: "", item_type: "item", quantity: 1 }]);
  const [menuItems, setMenuItems] = useState([]);
  const [combos, setCombos] = useState([]);

  useEffect(() => {
    if (!clientId) return;

    axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
      .then(res => setMenuItems(res.data))
      .catch(err => console.error("Failed to fetch menu items", err));

    axios.get(`http://localhost:8000/api/v1/${clientId}/menu/combos`)
      .then(res => setCombos(res.data))
      .catch(err => console.error("Failed to fetch combos", err));
  }, [clientId]);

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addRow = () => {
    setItems([...items, { item_id: "", item_type: "item", quantity: 1 }]);
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`http://localhost:8000/api/v1/${clientId}/orders`, {
        table_id: tableId,
        items,
      });
      alert("Order placed successfully!");
      setItems([{ item_id: "", item_type: "item", quantity: 1 }]);
      onOrderCreated();
    } catch (err) {
      console.error("Failed to submit order:", err);
      alert("Failed to place order");
    }
  };

  return (
    <div className="border p-4 rounded mb-4">
      <h2 className="font-bold mb-2">Place New Order</h2>

      {/* Show available menu items */}
      <div className="mb-3">
        <strong>Menu Items:</strong>
        <ul className="text-sm text-gray-700 list-disc pl-4">
          {menuItems.map(item => (
            <li key={item.id}>{item.name} — <code>{item.id}</code></li>
          ))}
        </ul>
        <strong>Combos:</strong>
        <ul className="text-sm text-gray-700 list-disc pl-4">
          {combos.map(combo => (
            <li key={combo.id}>{combo.name} — <code>{combo.id}</code></li>
          ))}
        </ul>
      </div>

      {/* Input fields */}
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Item or Combo ID"
            value={item.item_id}
            onChange={(e) => handleChange(index, "item_id", e.target.value)}
            className="border px-2 w-64"
          />
          <select
            value={item.item_type}
            onChange={(e) => handleChange(index, "item_type", e.target.value)}
            className="border px-2"
          >
            <option value="item">Item</option>
            <option value="combo">Combo</option>
          </select>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => handleChange(index, "quantity", parseInt(e.target.value))}
            className="border px-2 w-16"
          />
        </div>
      ))}
      <button onClick={addRow} className="bg-gray-300 px-3 py-1 rounded mr-2">+ Add Item</button>
      <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-1 rounded">Submit Order</button>
    </div>
  );
};

export default OrderForm;
