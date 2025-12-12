import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';
import axios from 'axios';
import TakeOrder from '../MainComponents/OrderServices/TakeOrder';
import OrderSummary from '../MainComponents/OrderServices/OrderSummary';
import TableManagement from '../MainComponents/TableServices/TableManagement';
import DashBoardPage from '../Constants/DashBoards/DashBoard';
import MenuManagement from '../MainComponents/InventoryServices/MenuManagement';
import BillingPage from '../MainComponents/BillingServices/Billing';
import UserManagement from '../MainComponents/UserServices/UserManagement/UserManagement';
import UserProfile from '../MainComponents/UserServices/ProfileManagement/UserProfile';
import {getValidToken} from '../utils/Interceptors/Api'
import InventoryManager from '../MainComponents/InventoryServices/InventoryManagement'

const RoutesManager = () => {
  const { clientId } = useParams();
  const [token, setToken] = useState(getValidToken());
  const [role, setRole] = useState(null);
  const [realm,setRealm]= useState();
  const [screenIds, setScreenIds] = useState([]);
  const [userId,setUserId]=useState();

  useEffect(() => {
    const t = getValidToken();
    if (!t) return;
    setToken(t);

    // Decode token
    try {
      const decoded = jwtDecode(t);
      const userRole = decoded.roles && decoded.roles[0]; // pick first role
      setRole(userRole);
      setRealm(decoded.realm)
      setUserId(decoded.user_id)

      // Fetch all screens for this role
      axios
        .get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/screens?client_id=${clientId}&role=${userRole}`, {
          headers: { Authorization: `Bearer ${t}` },
        })
        .then((res) => {
          if (res.data && res.data.data && res.data.data.screens) {
            // Extract screen_ids
            const ids = res.data.data.screens.map((s) => s.screen_id);
            console.log("The screenIds are",ids)
            setScreenIds(ids);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch screens:', err);
        });
    } catch (err) {
      console.error('Invalid token:', err);
      setRole(null);
    }
  }, [clientId]);

  if (!token) return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route
        path="/"
        element={<DashBoardPage clientId={clientId} token={token} realm={realm} screenIds={screenIds} />}
      />
      <Route
        path="home"
        element={<DashBoardPage clientId={clientId} token={token} realm={realm} screenIds={screenIds} />}
      />
      <Route
        path="managing-tables"
        element={<TableManagement clientId={clientId} token={token} userId={userId} realm={realm} screenIds={screenIds} />}
      />
      <Route
        path="order"
        element={<TakeOrder clientId={clientId} token={token} realm={realm} screenIds={screenIds} />}
      />
      <Route
        path="menu"
        element={<MenuManagement clientId={clientId} token={token} realm={realm} screenIds={screenIds} />}
      />
      <Route
        path="billing"
        element={<BillingPage clientId={clientId} token={token} realm={realm} screenIds={screenIds} />}
      />
      <Route
        path="users"
        element={<UserManagement clientId={clientId} token={token} realm={realm} screenIds={screenIds} />}
      />
      <Route
        path="inventory"
        element={<InventoryManager clientId={clientId} token={token} realm={realm} screenIds={screenIds} />}
      />
      <Route path="*" element={<Navigate to="home" replace />} />
      <Route path='user-profile'  element={<UserProfile token={token} clientId={clientId}/>} />
    </Routes>
  );
};

export default RoutesManager;
