import axios from "axios";
import { useEffect, useState } from "react";

const OrderList = ({ clientId, tableId, orders, refresh }) => {
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
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

  const startEdit = (order) => {
    setEditingOrderId(order.id);
    setEditedItems(order.items.map(i => ({ ...i })));
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
    setEditedItems([]);
  };

  const updateItemSelection = (index, selectedId) => {
    const updated = [...editedItems];
    const isCombo = combos.some(c => c.id === selectedId);
    updated[index].item_id = selectedId;
    updated[index].item_type = isCombo ? "combo" : "item";
    setEditedItems(updated);
  };

  const updateQuantity = (index, value) => {
    const updated = [...editedItems];
    updated[index].quantity = parseInt(value) || 1;
    setEditedItems(updated);
  };

  const addEditedItem = () => {
    setEditedItems([...editedItems, { item_id: "", item_type: "item", quantity: 1 }]);
  };

  const submitEdit = async () => {
    try {
      await axios.put(
        `http://localhost:8000/api/v1/${clientId}/orders/${editingOrderId}`,
        { items: editedItems }
      );
      setEditingOrderId(null);
      refresh();
    } catch (err) {
      console.error("Failed to update order", err);
      alert("Update failed");
    }
  };

  const updateStatus = async (orderId, status) => {
    await axios.patch(
      `http://localhost:8000/api/v1/${clientId}/orders/${orderId}/status`,
      { status }
    );
    refresh();
  };

  const deleteOrder = async (orderId) => {
    await axios.delete(
      `http://localhost:8000/api/v1/${clientId}/orders/${orderId}`
    );
    refresh();
  };

  const getItemName = (item_id) => {
    const match = menuItems.find(i => i.id === item_id);
    if (match) return match.name + " (Item)";
    const comboMatch = combos.find(c => c.id === item_id);
    return comboMatch ? comboMatch.name + " (Combo)" : item_id;
  };

  return (
    <div>
      <h2 className="font-bold mb-2">Current Orders</h2>
      {orders.length === 0 ? <p>No orders yet.</p> : (
        orders.map(order => (
          <div key={order.id} className="border p-3 mb-2 rounded">
            {editingOrderId === order.id ? (
              <div>
                <h3 className="font-semibold mb-1">Editing Order</h3>
                {editedItems.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <select
                      value={item.item_id}
                      onChange={(e) => updateItemSelection(index, e.target.value)}
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
                      value={item.quantity}
                      min="1"
                      onChange={(e) => updateQuantity(index, e.target.value)}
                      className="border px-2 w-20"
                    />
                  </div>
                ))}

                <div className="flex gap-2 mt-2">
                  <button onClick={addEditedItem} className="bg-gray-300 px-3 py-1 rounded">+ Add</button>
                  <button onClick={submitEdit} className="bg-green-600 text-white px-3 py-1 rounded">Save</button>
                  <button onClick={cancelEdit} className="text-gray-500 px-3 py-1">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div><strong>Status:</strong> {order.status}</div>
				
				
                <ul className="pl-4 mb-2">
				  {order.items.map((i, idx) => {
					const isCombo = i.item_type === "combo";
					const source = isCombo
					  ? combos.find(c => c.id === i.item_id)
					  : menuItems.find(m => m.id === i.item_id);

					const price = source?.price || 0;
					const name = source?.name || "Unknown";
					const subtotal = price * i.quantity;

					return (
					  <li key={idx} className="text-sm">
						{name} × {i.quantity} → ₹{price} × {i.quantity} = ₹{subtotal}
					  </li>
					);
				  })}

				  <li className="mt-2 font-semibold">
					Total Price: ₹
					{
					  order.items.reduce((sum, i) => {
						const isCombo = i.item_type === "combo";
						const source = isCombo
						  ? combos.find(c => c.id === i.item_id)
						  : menuItems.find(m => m.id === i.item_id);
						const price = source?.price || 0;
						return sum + price * i.quantity;
					  }, 0).toFixed(2)
					}
				  </li>
				</ul>

				
				
                <div className="mt-2 flex gap-2">
                  {order.status !== "served" && (
                    <>
                      <button onClick={() => startEdit(order)} className="bg-yellow-400 px-3 py-1 rounded">Edit</button>
                      <button onClick={() => deleteOrder(order.id)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
                    </>
                  )}
                  {order.status === "pending" && (
                    <button onClick={() => updateStatus(order.id, "served")} className="bg-green-500 text-white px-3 py-1 rounded">Mark Served</button>
                  )}
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default OrderList;
