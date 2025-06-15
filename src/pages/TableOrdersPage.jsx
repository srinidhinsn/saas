// import { useEffect, useState } from 'react';
// import axios from 'axios';
// import OrderForm from '../components/OrderForm';
// import OrderList from '../components/OrderList';
// import ExportOrdersButton from "../components/ExportOrdersButton";


// const TableOrdersPage = ({ clientId, tableId }) => {
//   const [orders, setOrders] = useState([]);

//   const fetchOrders = async () => {
//     const res = await axios.get(
//       `http://localhost:8000/api/v1/${clientId}/orders/table/${tableId}`
//     );
//     setOrders(res.data);
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, [clientId, tableId]);

//   return (
//     <div className="p-6 max-w-3xl mx-auto">
//       <h1 className="text-xl font-bold mb-4">Orders for Table {tableId}</h1>
//       <OrderForm clientId={clientId} tableId={tableId} onOrderCreated={fetchOrders} />
//       <OrderList clientId={clientId} tableId={tableId} orders={orders} refresh={fetchOrders} />
// 	  <ExportOrdersButton clientId={clientId} />

//     </div>
//   );
// };

// export default TableOrdersPage;



import { useEffect, useState } from 'react';
import axios from 'axios';
import OrderForm from '../components/OrderForm';
import OrderList from '../components/OrderList';
import '../styles/TableOrdersPage.css';

const TableOrdersPage = ({ clientId, tableId }) => {
  const [orders, setOrders] = useState([]);
  const [tableNumber, setTableNumber] = useState("");

  const fetchOrders = async () => {
    const res = await axios.get(
      `http://localhost:8000/api/v1/${clientId}/orders/table/${tableId}`
    );
    setOrders(res.data);
  };

  const fetchTableNumber = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/v1/${clientId}/tables/${tableId}`
      );
      setTableNumber(res.data.table_number); // ✅ This should now work!
    } catch (err) {
      console.error("Failed to fetch table number", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchTableNumber();
  }, [clientId, tableId]);

  return (
    <div className="table-orders-page">
      <div className="main-content">
        <h1 className="page-title">
          {tableNumber ? `Orders for  ${tableNumber}` : "Loading table..."}
        </h1>
        <OrderForm clientId={clientId} tableId={tableId} onOrderCreated={fetchOrders} />
      </div>
      <div className="sidebar">
        <OrderList clientId={clientId} tableId={tableId} orders={orders} refresh={fetchOrders} />
      </div>
    </div>
  );
};

export default TableOrdersPage;
