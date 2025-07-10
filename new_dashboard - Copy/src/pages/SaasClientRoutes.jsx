import React, { useEffect, useState } from "react";
import { Routes, Route, useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../NavbarComponent/Navbar";

import MainPage from "../MainComponent/MainPage";
import UpdateProfile from "../MainComponent/UpdateProfile";
import Settings from "../MainComponent/Settings";
import MenuManager from "../MenuComponents/MenuManager";
import SwiggyMenuManager from "../MenuComponents/SwiggyMenuManager";
import ZomatoMenuManager from "../MenuComponents/ZomatoManager";
import MenuTypeSelector from "../MenuComponents/MenuTypeSelector";
import TableSelection from "../TableSelectionComponent/TableSelection";
import ViewTables from "../TableSelectionComponent/ViewTables";
import OrderForm from "../OrderComponents/OrderForm";
import OrdersVisiblePage from "../OrderComponents/OrdersVisiblePage";
import ComboPage from "../ComboComponents/ComboPage";
import KitchenDisplay from "../KDS/KitchenDisplay";
import InvoicePage from "../InvoiceComponents/InvoicePage";
import ReportsPage from "../ReportComponents/ReportsPage";
import TableOverview from "../TableOverviewComponents/TableOverview";

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
    const Navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem("clientId", clientId);
    }, [clientId]);

    // const fetchTables = async () => {
    //     try {
    //         const res = await axios.get(`http://localhost:8000/api/v1/${clientId}/tables`);
    //         setTables(res.data);
    //     } catch (error) {
    //         console.error("❌ Error fetching tables:", error);
    //     }
    // };

    // useEffect(() => {
    //     fetchTables();
    // }, [clientId]);

    return (
        <div style={{ display: 'flex' }}>
            {!hideNavbar && <Navbar />}
            <div style={{ flex: 1 }}>
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="update-profile" element={<UpdateProfile />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="dinein-page" element={<MenuManager clientId={clientId} />} />
                    <Route path="swiggy-page" element={<SwiggyMenuManager clientId={clientId} />} />
                    <Route path="zomato-page" element={<ZomatoMenuManager clientId={clientId} />} />
                    <Route path="menu-page" element={<MenuTypeSelector clientId={clientId} />} />
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
                    <Route path="combo-page" element={<ComboPage />} />
                    <Route path="kds-page" element={<KitchenDisplay />} />
                    <Route path="invoice" element={<InvoicePage />} />
                    <Route path="report-page" element={<ReportsPage />} />
                    <Route path="add-users" element={<ReportsPage />} />
                    <Route
                        path="table-overview"
                        element={<TableOverview clientId={clientId} tables={tables} />}
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
        </div>
    );
};


export default SaasClientRoutes;
