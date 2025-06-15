import React, { useEffect, useState } from "react";
import OrderCard from "./OrderCard";

const KitchenDisplay = ({ clientId }) => {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/${clientId}/kds/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch KDS orders", err);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await fetch(`http://localhost:8000/api/v1/${clientId}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders(); // Refresh
    } catch (err) {
      alert("Status update failed");
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [clientId]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4" style={{color:'gray'}}>👨‍🍳 Kitchen Display</h2>
      {orders.length === 0 ? (
        <p className="text-gray-600">No active orders</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {orders.map((order) => (
            <OrderCard key={order.order_id} order={order} onStatusChange={updateStatus} />
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
