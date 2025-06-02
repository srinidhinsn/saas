import { useEffect, useState } from 'react';
import axios from 'axios';
import OrderForm from '../components/OrderForm';
import OrderList from '../components/OrderList';

const TableOrdersPage = ({ clientId, tableId }) => {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const res = await axios.get(
      `http://localhost:8000/api/v1/${clientId}/orders/table/${tableId}`
    );
    setOrders(res.data);
  };

  useEffect(() => {
    fetchOrders();
  }, [clientId, tableId]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Orders for Table {tableId}</h1>
      <OrderForm clientId={clientId} tableId={tableId} onOrderCreated={fetchOrders} />
      <OrderList clientId={clientId} tableId={tableId} orders={orders} refresh={fetchOrders} />
    </div>
  );
};

export default TableOrdersPage;
