import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import TakeOrder from '../MainComponents/OrderServices/TakeOrder'
import OrderSummary from '../MainComponents/OrderServices/OrderSummary';
import Kds from '../MainComponents/OrderServices/Kds';
import TableManagement from '../MainComponents/TableServices/TableManagement'
import DashBoardPage from '../Constants/DashBoards/DashBoard';
import Documents from '../MainComponents/DocumentServices/Document'
import InventoryManager from '../MainComponents/InventoryServices/InventoryManagement';
import { jwtDecode } from "jwt-decode";
import MenuManagement from '../MainComponents/InventoryServices/MenuManagement';
import BillingPage from '../MainComponents/BillingServices/Billing';
import UserManagement from '../MainComponents/UserServices/UserManagement/UserManagement';


const RoutesManager = ({ token }) => {
  const { clientId } = useParams();
  const decoded = jwtDecode(token);
  const realm=decoded.realm;
  return (
    <Routes>
      <Route path="/" element={<DashBoardPage />} />
      <Route path="home" element={<DashBoardPage />}/>
      <Route path="managing-tables" element={<TableManagement token={token} clientId={clientId} />} />
      <Route path="order" element={<TakeOrder token={token} clientId={clientId} realm={realm} />} />
      <Route path="summary" element={<OrderSummary token={token} clientId={clientId} />} />

      {/* Placeholder routes — replace with your components */}
      <Route path="menu" element={<MenuManagement token={token} clientId={clientId} realm={realm}/>} />
      <Route path="billing" element={<BillingPage/>} />
      <Route path="users" element={<UserManagement  token={token} clientId={clientId} realm={realm}/>} />
      <Route path="inventory" element={< InventoryManager token={token} clientId={clientId} realm={realm} />}></Route>
      <Route path="role" element={<div className="p-8">Role Page (placeholder)</div>} />
      <Route path="kds" element={<Kds/>}/>
      <Route path="documents" element={<Documents token={token} clientId={clientId} />}/>
      <Route path="details" element={<div className="p-8">Details Page (placeholder)</div>} />

      {/* catch-all for unknown client subpaths -> redirect to home */}
      <Route path="*" element={<Navigate to="home" replace />} />
    </Routes>
  );
};

export default RoutesManager;