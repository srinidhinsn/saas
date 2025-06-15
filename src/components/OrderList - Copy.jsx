import axios from "axios";
import { useState } from "react";

const OrderList = ({ clientId, tableId, orders, refresh }) => {
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editedItems, setEditedItems] = useState([]);

  const startEdit = (order) => {
    setEditingOrderId(order.id);
    setEditedItems(order.items.map(i => ({ ...i })));
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
    setEditedItems([]);
  };

  const updateEditedItem = (index, field, value) => {
    const updated = [...editedItems];
    updated[index][field] = value;
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
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      value={item.item_id}
                      onChange={(e) => updateEditedItem(index, "item_id", e.target.value)}
                      className="border px-2"
                      placeholder="Item or Combo ID"
                    />
                    <select
                      value={item.item_type}
                      onChange={(e) => updateEditedItem(index, "item_type", e.target.value)}
                      className="border px-2"
                    >
                      <option value="item">Item</option>
                      <option value="combo">Combo</option>
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      min="1"
                      onChange={(e) => updateEditedItem(index, "quantity", parseInt(e.target.value))}
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
                <ul className="list-disc pl-4">
                  {order.items.map((i, idx) => (
                    <li key={idx}>{i.item_type}: {i.item_id} × {i.quantity}</li>
                  ))}
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
