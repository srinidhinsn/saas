import React, { useEffect } from "react";
import { Routes, Route, useParams, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import HeaderBar from "./HeaderPage";
import AuthModal from "./AuthModel";
import Add_user from "../Main_Components/Add_Users/Add_user";
import DashBoardPage from "./DashBoardPage";
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
import NotificationTable from "../Main_Components/Notification_Services_Components/All_NotificationsPage";
import PopupNotification from "../Main_Components/Notification_Services_Components/Popup_Notifications";
import RoleConfig from '../Main_Components/Role_Configuration/RoleConfig'
import BillingPage from '../Main_Components/Invoice_Services_Components/BillingUI'

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

  // Redirect to login if no token
  if (!token) return <Navigate to={`/saas/${clientId}/login`} />;

  // Decode JWT to get grants and userId
  useEffect(() => {
    try {
      const decoded = jwtDecode(token);
      if (decoded.grants) setGrants(decoded.grants);
      if (decoded.user_id) setUserId(decoded.user_id);
    } catch (err) {
      console.error("❌ Token decode failed", err);
    }},[token]);

    // ✅ Sync clientId and token to localStorage
    useEffect(() => {
        if (clientId) localStorage.setItem("clientId", clientId);
        // if (accessToken) localStorage.setItem("access_token", accessToken);
    }, [clientId]);

    // ❗ Optional: Force logout if different client is loaded
    useEffect(() => {
        const storedClient = localStorage.getItem("clientId");
        if (storedClient && storedClient !== clientId) {
            console.warn("Client mismatch. Resetting session.");
            localStorage.clear();
            window.location.href = `/saas/${clientId}/login`;
        }
    }, [clientId]);
    useEffect(() => {
        if (!clientId) {
            console.error("❌ Missing client ID. Cannot fetch tables.");
            return;
        }
    }, [clientId]);

    return (
        <>

            <HeaderBar />
            <div className="app-wrapper" style={{ display: "flex" }}>
                {!hideNavbar && <Navbar />}
                <div className="main-layout" style={{ flex: 1, overflowY: "auto" }}>
                    <Routes>
                        <Route path="/" element={<DashBoardPage />} />
                        {/* <Route path="update-profile" element={<UpdateProfile />} />
                    <Route path="settings" element={<Settings />} /> */}
                        {/* <Route path="dinein-page" element={<MenuManager clientId={clientId} />} /> */}
                        {/* <Route path="swiggy-page" element={<SwiggyMenuManager clientId={clientId} />} />
                    <Route path="zomato-page" element={<ZomatoMenuManager clientId={clientId} />} /> */}
                        <Route path="menu-page/*" element={<MenuManager clientId={clientId} />} />
                        <Route
                            path="table-selection"
                            element={
                                <TableManagement
                                    clientId={clientId}
                                    onTableAdded={(newTable) => {
                                        setSelectedTableId(newTable.table_number);
                                        fetchTables();
                                    }}
                                />
                            }
                        />
                        <Route
                            path="view-tables/:tableId?"
                            element={<ViewTables clientId={clientId} onOrderUpdate={setLatestOrder} />}
                        />
                        <Route
                            path="order-form"
                            element={<OrderForm tableId={selectedTableId} clientId={clientId} onOrderCreated={() => { }} />}
                        />
                        <Route path="orders-view" element={<OrdersVisiblePage latestOrder={latestOrder} />} />
                        <Route path="invoice" element={<Invoice_Page />} />
                        <Route path="reports" element={<ReportService />} />
                        <Route path="kds-page" element={<KitchenDisplay />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="add-users" element={<Add_user />} />
                        {/* <Route path="documents" element={<OrderSummary />} /> */}
                        <Route path="user-details" element={<PersonForm />} />

                        <Route path="all-notifications" element={<NotificationTable />} />
                        <Route path="popup-notifications" element={<PopupNotification />} />

                        <Route path="/billing" element={<BillingPage />} />

                        {/* <Route path="documents" element={<Documents />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="invoice" element={<InvoicePage />} />
                    <Route path="report-page" element={<ReportsPage />} />
                    <Route path="add-users" element={<ReportsPage />} /> */}
                        {/* <Route
                        path="table-overview"
                        element={<TableOverview clientId={clientId} tables={tables} />}
                    /> */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </div>

        </>

    );
};

export default SaasClientRoutes;