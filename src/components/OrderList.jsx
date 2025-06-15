import axios from "axios";
import { useEffect, useState } from "react";
import "../styles/OrderList.css";

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

  const removeEditedItem = (index) => {
    if (editedItems.length === 1) {
      setEditedItems([{ item_id: "", item_type: "item", quantity: 1 }]);
    } else {
      setEditedItems(editedItems.filter((_, i) => i !== index));
    }
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
    <div className="order-list">
      <h2 className="order-heading">Order History</h2>
      {orders.length === 0 ? <p>No orders yet.</p> : (
        [...orders].reverse().map((order, index) => (


          <div key={order.id} className="order-box">
            <div className="order-header">
              <strong>Order No - {orders.length - index}</strong>

              <span className={`status-tag ${order.status}`}>{order.status}</span>
            </div>

            {editingOrderId === order.id ? (
              <div>
                <h3 className="edit-heading">Editing Order</h3>
                {editedItems.map((item, index) => (
                  <div key={index} className="edit-item-row">
                    <select
                      value={item.item_id}
                      onChange={(e) => updateItemSelection(index, e.target.value)}
                      className="item-select"
                    >
                      <option value="">-- Select Item or Combo --</option>
                      <optgroup label="Menu Items">
                        {menuItems.map(menu => (
                          <option key={menu.id} value={menu.id}>{menu.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Combos">
                        {combos.map(combo => (
                          <option key={combo.id} value={combo.id}>{combo.name}</option>
                        ))}
                      </optgroup>
                    </select>

                    <input
                      type="number"
                      value={item.quantity}
                      min="1"
                      onChange={(e) => updateQuantity(index, e.target.value)}
                      className="quantity-input"
                    />

                    <button
                      className="btn-cancel small-btn"
                      onClick={() => removeEditedItem(index)}
                      disabled={order.status !== "pending"}
                      title={order.status !== "pending" ? "Cannot remove in current status" : "Remove"}
                    >
                      ❌
                    </button>
                  </div>
                ))}

                <div className="edit-buttons">
                  <button onClick={addEditedItem} className="btn-neutral">+ Add</button>
                  <button onClick={submitEdit} className="btn-success">Save</button>
                  <button onClick={cancelEdit} className="btn-cancel">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <ul className="item-list">
                  {order.items.map((i, idx) => {
                    const isCombo = i.item_type === "combo";
                    const source = isCombo
                      ? combos.find(c => c.id === i.item_id)
                      : menuItems.find(m => m.id === i.item_id);

                    const price = source?.price || 0;
                    const name = source?.name || "Unknown";
                    const subtotal = price * i.quantity;

                    return (
                      <li key={idx} className="item-line">
                        {name} × {i.quantity} → ₹{price} × {i.quantity} = ₹{subtotal}
                      </li>
                    );
                  })}
                  <li className="total-line">
                    Total Price: ₹{order.items.reduce((sum, i) => {
                      const isCombo = i.item_type === "combo";
                      const source = isCombo
                        ? combos.find(c => c.id === i.item_id)
                        : menuItems.find(m => m.id === i.item_id);
                      const price = source?.price || 0;
                      return sum + price * i.quantity;
                    }, 0).toFixed(2)}
                  </li>
                </ul>

                <div className="action-buttons">
                  {order.status === "pending" && (
                    <>
                      <button onClick={() => startEdit(order)} className="btn-warning">Edit</button>
                      <button onClick={() => deleteOrder(order.id)} className="btn-danger">Delete</button>
                      <button onClick={() => updateStatus(order.id, "served")} className="btn-served">Mark Served</button>
                    </>
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

