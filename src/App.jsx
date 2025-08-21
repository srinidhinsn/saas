import './App.css';
import './index.css';
import './Styles/StyleSheet1.css'
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Login from './Main_Components/User_Services_Components/LoginPage';
import Register from './Main_Components/User_Services_Components/RegisterPage';
import ForgotPassword from './Main_Components/User_Services_Components/ForgotPasswordPage';
import ProtectedRoute from './Constants/ProtectedRoute';
import SaasClientRoutes from './Constants/SaasClientRoutes';

const App = () => {
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [latestOrder, setLatestOrder] = useState(null);

  const location = useLocation();
  const hideNavbar = /\/saas\/[^/]+\/(login|register|forgot)/.test(location.pathname);


  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <Routes>

          {/* Public routes */}
          <Route path="/saas/:clientId/login" element={<Login />} />
          <Route path="/saas/:clientId/register" element={<Register />} />
          <Route path="/saas/:clientId/forgot" element={<ForgotPassword />} />

          {/* Protected routes with accessToken in URL */}
          <Route
            path="/saas/:clientId/:pageName/*"
            element={
              <ProtectedRoute>
                <SaasClientRoutes
                  selectedTableId={selectedTableId}
                  setSelectedTableId={setSelectedTableId}
                  latestOrder={latestOrder}
                  setLatestOrder={setLatestOrder}
                  tables={tables}
                  setTables={setTables}
                  hideNavbar={hideNavbar}
                />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/saas/:clientId/login" />} />



        </Routes>
        <ToastContainer position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          theme="light" />
      </div>
    </div>
  );
};

export default App;
