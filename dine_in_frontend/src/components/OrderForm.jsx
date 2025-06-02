import { useEffect, useState } from "react";
import axios from "axios";

const calculateTotal = (items, menuItems, combos) => {
  return items.reduce((sum, item) => {
    const source = item.item_type === "combo"
      ? combos.find(c => c.id === item.item_id)
      : menuItems.find(i => i.id === item.item_id);

    const price = source?.price || 0;
    return sum + price * item.quantity;
  }, 0);
};


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
  
  const total = calculateTotal(items, menuItems, combos);

  const handleItemSelect = (index, selectedId) => {
    const updated = [...items];
    const isCombo = combos.some(c => c.id === selectedId);
    updated[index].item_id = selectedId;
    updated[index].item_type = isCombo ? "combo" : "item";
    setItems(updated);
  };

  const updateQuantity = (index, value) => {
    const updated = [...items];
    updated[index].quantity = parseInt(value) || 1;
    setItems(updated);
  };

  const addRow = () => {
    setItems([...items, { item_id: "", item_type: "item", quantity: 1 }]);
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`http://localhost:8000/api/v1/${clientId}/orders`, {
        table_id: tableId,
        items
      });
      alert("Order placed successfully!");
      setItems([{ item_id: "", item_type: "item", quantity: 1 }]);
      onOrderCreated();
    } catch (err) {
      console.error("Failed to submit order:", err);
      alert("Error placing order");
    }
  };

  return (
    <div className="border p-4 rounded mb-4">
      <h2 className="font-bold mb-2">Place New Order</h2>

      {items.map((item, index) => (
        <div key={index} className="flex gap-2 mb-2 items-center">
          <select
            value={item.item_id}
            onChange={(e) => handleItemSelect(index, e.target.value)}
            className="border px-2 w-64"
          >
            <option value="">-- Select Item or Combo --</option>
            <optgroup label="Menu Items">
              {menuItems.map(menu => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Combos">
              {combos.map(combo => (
                <option key={combo.id} value={combo.id}>
                  {combo.name}
                </option>
              ))}
            </optgroup>
          </select>

          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => updateQuantity(index, e.target.value)}
            className="border px-2 w-20"
          />
        </div>
      ))}

      <div className="mt-2 flex gap-2">
		<p className="mt-2 font-semibold">Total Price: ₹ {total.toFixed(2)}</p>
        <button onClick={addRow} className="bg-gray-300 px-3 py-1 rounded">+ Add Item</button>
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-1 rounded">Submit Order</button>
      </div>
    </div>
  );
};

export default OrderForm;
