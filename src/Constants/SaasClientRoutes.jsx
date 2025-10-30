import React, { useEffect, useState } from "react";
import { Routes, Route, useParams, Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api, { getValidToken } from "./Api";
import Navbar from "./Navbar";
import NavbarA from "./Navbar_Versions/Navbar1";
import NavbarB from "./Navbar_Versions/Navbar2";
import NavbarC from "./Navbar_Versions/Navbar3";
import Navbar_V4 from "./Navbar_Versions/Navbar_V4";
import HeaderBar from "./HeaderPage";
import AuthModal from "./AuthModel";
import Add_user from "../Main_Components/Add_Users/Add_user";
import DashBoardPage from "./DashBoardPage";
import DashBoard_V3 from "./DashBoard_Versions/DashBoard_V3";
import DashBoard_V4 from "./DashBoard_Versions/DashBoard_V4";
import MenuManager from "../Main_Components/Inventory_Services_Components/MenuManager";
import ViewTables from "../Main_Components/Table_Service_Components/Table_Inventory_Order";
import TableManagement from "../Main_Components/Table_Service_Components/TableManagement";
import OrderForm from "../Main_Components/Order_Service_Components/OrderForm";
import OrdersVisiblePage from "../Main_Components/Order_Service_Components/OrdersVisiblePage";
import Invoice_Page from "../Main_Components/Invoice_Services_Components/Invoice_Page";
import KitchenDisplay from "../Main_Components/Order_Service_Components/KDS_Component/KitchenDisplay";
import ReportService from "../Main_Components/Report_Service_Components/ReportService";
import Notifications from "./Notifications";
import PersonForm from "../Util_Components/PersonForm";
import Documents from '../Main_Components/Document_Service_Components/Document'
import NotificationTable from "../Main_Components/Notification_Services_Components/All_NotificationsPage";
import PopupNotification from "../Main_Components/Notification_Services_Components/Popup_Notifications";
import RoleConfig from '../Main_Components/Role_Configuration/RoleConfig'
import BillingPage from '../Main_Components/Invoice_Services_Components/BillingUI'
import ClientDetails_V3 from "../Main_Components/Client-Services/ClientDetails_V3";
import ClientDetails_V4 from "../Main_Components/Client-Services/ClientDetails_V4";
import Document from "../Main_Components/Document_Service_Components/Document";

const AccessDenied = ({ onAuthClick }) => (
  <div style={{ textAlign: "center", padding: "2rem" }}>
    <h2>🚫 Access Denied</h2>
    <p>You do not have permission to view this page.</p>
    <button onClick={onAuthClick} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
      Request Admin Access
    </button>
  </div>
);

const SaasClientRoutes = ({
  selectedTableId,
  setSelectedTableId,
  latestOrder,
  setLatestOrder,
  hideNavbar,
}) => {
  const { clientId } = useParams();
  const location = useLocation();
  const token = getValidToken();

  const [accessDenied, setAccessDenied] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [grants, setGrants] = useState([]);
  const [userId, setUserId] = useState(null);
  const [screenId, setScreenId] = useState(() => {
    return localStorage.getItem("screen_id") || "default_user";
  });
  const [selectedRealm, setSelectedRealm] = useState(() => localStorage.getItem("selected_realm") || "");

  useEffect(() => {
    const handleStorageChange = () => {
      const newRealm = localStorage.getItem("selected_realm") || "";
      setSelectedRealm(newRealm);
    };
  
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  

  useEffect(() => {
    localStorage.setItem("screen_id", screenId); 
  }, [screenId]); 
  
  if (!token) return <Navigate to={`/saas/${clientId}/login`} />;

  useEffect(() => {
    try {
      const decoded = jwtDecode(token);
      if (decoded.grants) setGrants(decoded.grants);
      if (decoded.user_id) setUserId(decoded.user_id);
    } catch (err) {
      console.error("❌ Token decode failed", err);
    }
  }, [token]);

  // useEffect(() => {
  //   const storedClient = localStorage.getItem("clientId");
  //   if (storedClient && storedClient !== clientId) {
  //     localStorage.clear();
  //     window.location.href = `/saas/${clientId}/login`;
  //   } else if (clientId) {
  //     localStorage.setItem("clientId", clientId);
  //   }
  // }, [clientId]);

  useEffect(() => {
    const handleDenied = () => setAccessDenied(true);
    window.addEventListener("accessDenied", handleDenied);
    return () => window.removeEventListener("accessDenied", handleDenied);
  }, []);

  useEffect(() => {
    setAccessDenied(false);
  }, [location.pathname]);

  const handleAuthSuccess = (delegatedToken, expiresAt) => {
    console.log("Delegated token received:", delegatedToken);
    localStorage.setItem("delegated_token", delegatedToken);
    setAccessDenied(false);
  };

  // ✅ Decide which Navbar to show
  const renderNavbar = () => {
    if (hideNavbar) return null;

    switch (screenId) {
      case "default_user":
        return <Navbar/>;
      case "user_v1":
        return <NavbarA />;
      case "user_v2":
        return <NavbarB />;
      case "user_v3":
        return <NavbarC />;
      case "user_v4":
        return <Navbar_V4/>  
      default:
        return <Navbar />; // fallback
    }
  };
  const renderDashboard = () => {
    switch (screenId) {
      case "user_v3":
        return <DashBoard_V3 realm={selectedRealm} />;
      case "user_v2":
        return <DashBoardPage version="v2" realm={selectedRealm} />;
      case "user_v4":
        return <DashBoard_V4 realm={selectedRealm}  /> 
      default:
        return <DashBoardPage realm={selectedRealm} />;
    }
  };
  
  
  // const renderNavbar = () => {
  //   if (hideNavbar) return null;
  //   const currentScreenId = "user_v3";
  //   if (screenId !== currentScreenId) {
  //     setScreenId(currentScreenId);
  //   }
  //   return <NavbarC />; 
  // };
  // const renderNavbar = () => {
  //   if (hideNavbar) return null;
  //   const currentScreenId = "default_user";
  //   if (screenId !== currentScreenId) {
  //     setScreenId(currentScreenId);
  //   }
    
  //   return <Navbar />; 
  // };
  
  return (
    <>
      <HeaderBar   screenId={screenId} selectedRealm={selectedRealm} setSelectedRealm={setSelectedRealm} />
      <div className="app-wrapper" style={{ display: "flex" }}>
        {renderNavbar()}
        <div className="main-layout" style={{ flex: 1, overflowY: "auto" }}>
          {accessDenied ? (
            <AccessDenied onAuthClick={() => setAuthModalOpen(true)} />
          ) : (
            <Routes>
              <Route path="/" element={renderDashboard(selectedRealm)}/>
              <Route path="menu-page/*" element={<MenuManager clientId={clientId} />} />
              <Route path="table-selection" element={<TableManagement clientId={clientId} />} />
              <Route
                path="view-tables/:tableId?"
                element={<ViewTables clientId={clientId} onOrderUpdate={setLatestOrder} />}
              />
              <Route path="order-form" element={<OrderForm tableId={selectedTableId} clientId={clientId} />} />
              <Route path="orders-view" element={<OrdersVisiblePage latestOrder={latestOrder} />} />
              <Route path="invoice" element={<Invoice_Page />} />
              <Route path="reports" element={<ReportService />} />
              <Route path="kds-page" element={<KitchenDisplay />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="user-details" element={<PersonForm />} />
              <Route path="all-notifications" element={<NotificationTable />} />
              <Route path="popup-notifications" element={<PopupNotification />} />
              <Route path="role-config" element={<RoleConfig />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="add-users" element={<Add_user />} />
              <Route path="documents" element={<Documents />} />
              <Route path="client-details_v3" element={<ClientDetails_V3 selectedRealm={selectedRealm} />} />
              <Route path="client-details_v4" element={<ClientDetails_V4 selectedRealm={selectedRealm} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        clientId={clientId}
        requesterId={userId}
        page={location.pathname}
      />
    </>
  );
};

export default SaasClientRoutes;
// ======= ===================== ======================= ==================== ===================== //