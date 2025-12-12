// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
// import TakeOrder from '../MainComponents/OrderServices/TakeOrder';
// import OrderSummary from '../MainComponents/OrderServices/OrderSummary';
// import Kds from '../MainComponents/OrderServices/Kds';
// import TableManagement from '../MainComponents/TableServices/TableManagement';
// import DashBoardPage from '../Constants/DashBoards/DashBoard';
// import Documents from '../MainComponents/DocumentServices/Document';
// import InventoryManager from '../MainComponents/InventoryServices/InventoryManagement';
// import {jwtDecode} from 'jwt-decode';
// import MenuManagement from '../MainComponents/InventoryServices/MenuManagement';
// import BillingPage from '../MainComponents/BillingServices/Billing';
// import UserManagement from '../MainComponents/UserServices/UserManagement/UserManagement';
// import UserProfile from '../MainComponents/UserServices/ProfileManagement/UserProfile';
// import HeaderShared from '../Constants/Headers/HeaderShared';
// import Header_V3 from '../Multi-Versions/HeaderVersions/Header_V3';
// import Header_V4 from '../Multi-Versions/HeaderVersions/Header_V4';
// import MenuManagement_V4 from '../Multi-Versions/MenuVersions/MenuManagement_V4';

// const RoutesManager = ({ token, onLogout }) => {
//   const navigate = useNavigate();
//   const params = useParams();
//   const location = useLocation();

//   // memoize decoded token so it is stable across renders
//   const decoded = useMemo(() => {
//     try {
//       return token ? jwtDecode(token) || {} : {};
//     } catch (err) {
//       // invalid token — return empty
//       return {};
//     }
//   }, [token]);

//   const realm = decoded?.realm || '';

//   const [screenId, setScreenId] = useState(() => localStorage.getItem('screen_id') || 'default_user');

//   // clientId sourced from route params (single source of truth)
//   const [clientId, setClientId] = useState(() => params.clientId || '');

//   // Sync params.clientId into state — only when it actually changes
//   useEffect(() => {
//     const paramId = params.clientId || '';
//     if (paramId !== clientId) {
//       setClientId(paramId);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [params.clientId]); // intentionally not including clientId to avoid re-check noise

//   // safe handler — memoized and guarded against redundant navigation
//   const handleClientSelect = useCallback((e) => {
//     const selectedId = e?.target?.value;
//     if (!selectedId) return;

//     const targetPath = `/saas/${selectedId}/main/client-details_v4`;

//     // if path already equals targetPath, only update local state
//     if (location.pathname === targetPath) {
//       // avoid unnecessary setState if already same
//       if (selectedId !== clientId) setClientId(selectedId);
//       return;
//     }

//     // update local state and navigate; use replace to prevent history flood
//     if (selectedId !== clientId) setClientId(selectedId);
//     navigate(targetPath, { replace: true });
//   }, [clientId, location.pathname, navigate]);

//   // Header component selection — memoized to avoid recreating on every render
//   const HeaderNode = useMemo(() => {
//     switch (screenId) {
//       case 'default_user':
//         return <HeaderShared clientId={clientId} onLogout={onLogout} />;
//       case 'user_v1':
//         return <Header_V3 clientId={clientId} onLogout={onLogout} />;
//       case 'user_v2':
//         return <Header_V3 clientId={clientId} onLogout={onLogout} />; // adjust if you have NavbarB
//       case 'user_v3':
//         return <Header_V3 clientId={clientId} onLogout={onLogout} />;
//       case 'user_v4':
//         return <Header_V4 clientId={clientId} onLogout={onLogout} />;
//       default:
//         return <HeaderShared clientId={clientId} onLogout={onLogout} />;
//     }
//   }, [screenId, clientId, onLogout]);

//   // Menu selection memoized
//   const MenuNode = useMemo(() => {
//     if (screenId === 'user_v4' || realm === 'v4') {
//       return <MenuManagement_V4 token={token} clientId={clientId} realm={realm} />;
//     }
//     return <MenuManagement token={token} clientId={clientId} realm={realm} />;
//   }, [screenId, realm, token, clientId]);

//   return (
//     <div className="">
//       {HeaderNode}

//       <Routes>
//         <Route path="/" element={<DashBoardPage />} />
//         <Route path="home" element={<DashBoardPage />} />
//         <Route path="managing-tables" element={<TableManagement token={token} clientId={clientId} />} />
//         <Route path="order" element={<TakeOrder token={token} clientId={clientId} realm={realm} />} />
//         <Route path="summary" element={<OrderSummary token={token} clientId={clientId} />} />

//         {/* menu route renders only the menu node */}
//         <Route path="menu" element={MenuNode} />

//         <Route path="billing" element={<BillingPage />} />
//         <Route path="users" element={<UserManagement token={token} clientId={clientId} realm={realm} />} />
//         <Route path="inventory" element={<InventoryManager token={token} clientId={clientId} realm={realm} />} />
//         <Route path="role" element={<div className="p-8">Role Page (placeholder)</div>} />
//         <Route path="kds" element={<Kds />} />
//         <Route path="documents" element={<Documents token={token} clientId={clientId} />} />
//         <Route path="details" element={<div className="p-8">Details Page (placeholder)</div>} />
//         <Route path="user-profile" element={<UserProfile token={token} clientId={clientId} />} />

//         <Route path="*" element={<Navigate to="home" replace />} />
//       </Routes>
//     </div>
//   );
// };

// export default RoutesManager;










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
import UserProfile from '../MainComponents/UserServices/ProfileManagement/UserProfile';


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
      <Route path="billing" element={<BillingPage token={token} clientId={clientId} realm={realm}/>} />
      <Route path="users" element={<UserManagement  token={token} clientId={clientId} realm={realm}/>} />
      <Route path="inventory" element={< InventoryManager token={token} clientId={clientId} realm={realm} />}></Route>
      <Route path="role" element={<div className="p-8">Role Page (placeholder)</div>} />
      <Route path="kds" element={<Kds/>}/>
      <Route path="documents" element={<Documents token={token} clientId={clientId} />}/>
      <Route path="details" element={<div className="p-8">Details Page (placeholder)</div>} />
      <Route path='user-profile'  element={<UserProfile token={token} clientId={clientId}/>} />

      {/* catch-all for unknown client subpaths -> redirect to home */}
      <Route path="*" element={<Navigate to="home" replace />} />
    </Routes>
  );
};

export default RoutesManager;