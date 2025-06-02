import axios from 'axios';

const OrderList = ({ clientId, tableId, orders, refresh }) => {
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
            <div><strong>Status:</strong> {order.status}</div>
            <ul className="list-disc pl-4">
              {order.items.map((i, idx) => (
                <li key={idx}>{i.item_type}: {i.item_id} × {i.quantity}</li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <button onClick={() => updateStatus(order.id, 'served')} className="bg-green-500 text-white px-3 py-1 rounded">Mark Served</button>
              <button onClick={() => deleteOrder(order.id)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default OrderList;
