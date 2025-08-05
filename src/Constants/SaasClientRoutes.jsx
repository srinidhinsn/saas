import React, { useEffect } from "react";
import { Routes, Route, useParams, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "./Navbar";

// import MainPage from "../MainComponent/MainPage";
// import UpdateProfile from "../MainComponent/UpdateProfile";
// import Settings from "../MainComponent/Settings";
import MenuManager from "../Main_Components/Inventory_Services_Components/MenuManager";
// import SwiggyMenuManager from "../MenuComponents/SwiggyMenuManager";
// import ZomatoMenuManager from "../MenuComponents/ZomatoManager";
// import MenuTypeSelector from "../MenuComponents/MenuTypeSelector";
import TableSelection from "../Main_Components/Table_Service_Components/TableManagement";
import ViewTables from "../Main_Components/Table_Service_Components/Table_Inventory_Order";
import OrderForm from "../Main_Components/Order_Service_Components/OrderForm";
import OrdersVisiblePage from "../Main_Components/Order_Service_Components/OrdersVisiblePage";
import DashBoardPage from "./DashBoardPage";
import Invoice_Page from "../Main_Components/Invoice_Services_Components/Invoice_Page";
// import ComboPage from "../ComboComponents/ComboPage";
import KitchenDisplay from "../Main_Components/Order_Service_Components/KDS_Component/KitchenDisplay";
import Add_user from "../Main_Components/Add_Users/Add_user";
import HeaderBar from "./HeaderPage";
import ReportService from "../Main_Components/Report_Service_Components/ReportService";
// import InvoicePage from "../InvoiceComponents/InvoicePage";
// import ReportsPage from "../ReportComponents/ReportsPage";
// import TableOverview from "../TableOverviewComponents/TableOverview";
// import Documents from "../DocumentsComponents/Documents";
// import BillingPage from "../BillingComponent/BillingPage";

const SaasClientRoutes = ({
    selectedTableId,
    setSelectedTableId,
    latestOrder,
    setLatestOrder,
    tables,
    setTables,
    hideNavbar
}) => {
    const { clientId } = useParams();
    const navigate = useNavigate();

    const token = localStorage.getItem("access_token");

    // 🔒 Redirect to login if not authenticated
    if (!token) {
        return <Navigate to={`/saas/${clientId}/login`} />;
    }

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

    // ✅ Load tables only for this client
    // const fetchTables = async () => {
    //     try {
    //         const token = localStorage.getItem("access_token");
    //         const res = await axios.get(`http://localhost:8000/saas/${clientId}/tables/read`, {
    //             headers: {
    //                 Authorization: `Bearer ${token}`
    //             }
    //         });
    //         setTables(res.data);
    //     } catch (error) {
    //         console.error("❌ Failed to fetch tables:", error);
    //     }
    // };

    useEffect(() => {
        // if (clientId) {
        //     fetchTables();
        // }
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
                                <TableSelection
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
                        <Route path="add-users" element={<Add_user />} />
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
