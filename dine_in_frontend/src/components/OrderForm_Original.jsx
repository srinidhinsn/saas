import { useState } from 'react';
import axios from 'axios';

const OrderForm = ({ clientId, tableId, onOrderCreated }) => {
  const [items, setItems] = useState([
    { item_id: '', item_type: 'item', quantity: 1 }
  ]);

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addRow = () => {
    setItems([...items, { item_id: '', item_type: 'item', quantity: 1 }]);
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(
        `http://localhost:8000/api/v1/${clientId}/orders`,
        { table_id: tableId, items }
      );
      alert("Order placed!");
      onOrderCreated();  // refresh order list
    } catch (err) {
      console.error(err);
      alert("Error placing order");
    }
  };

  return (
    <div className="border p-4 rounded mb-4">
      <h2 className="font-bold mb-2">Place New Order</h2>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Item or Combo ID"
            value={item.item_id}
            onChange={(e) => handleChange(index, 'item_id', e.target.value)}
            className="border px-2"
          />
          <select
            value={item.item_type}
            onChange={(e) => handleChange(index, 'item_type', e.target.value)}
            className="border px-2"
          >
            <option value="item">Item</option>
            <option value="combo">Combo</option>
          </select>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => handleChange(index, 'quantity', parseInt(e.target.value))}
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









