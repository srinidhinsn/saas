import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import TakeOrder from '../MainComponents/OrderServices/TakeOrder'
import OrderSummary from '../MainComponents/OrderServices/OrderSummary';
import Dashboard from '../Constants/Dashboard'
import Kds from '../MainComponents/OrderServices/Kds'

const RoutesManager = ({ token }) => {
    const {clientId}=useParams();
  return (
    <Routes>
      <Route path="/" element={<Navigate to="home" replace />} />
      <Route path="home" element={<Dashboard/>}/>
      <Route path="managing-tables"element={<div className="p-8">Table Page (placeholder)</div>} />
      <Route path="order" element={<TakeOrder token={token}clientId={clientId} />} />
      <Route path="summary" element={<OrderSummary token={token} clientId={clientId}/>} />

      {/* Placeholder routes — replace with your components */}
      <Route path="menu" element={<div className="p-8">Menu Page (placeholder)</div>} />
      <Route path="billing" element={<div className="p-8">Billing Page (placeholder)</div>} />
      <Route path="users" element={<div className="p-8">Users Page (placeholder)</div>} />
      <Route path="inventory" element={<div className="p-8">Inventory Page (placeholder)</div>} />
      <Route path="role" element={<div className="p-8">Role Page (placeholder)</div>} />
      <Route path="kds" element={<Kds/>}/>
      <Route path="details" element={<div className="p-8">Details Page (placeholder)</div>} />

      {/* catch-all for unknown client subpaths -> redirect to home */}
      <Route path="*" element={<Navigate to="home" replace />} />
    </Routes>
  );
};

export default RoutesManager;
