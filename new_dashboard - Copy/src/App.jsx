// import './App.css';
// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate, useLocation, BrowserRouter } from 'react-router-dom';
// import axios from 'axios';
// import Navbar from './NavbarComponent/Navbar';
// import MainPage from './MainComponent/MainPage';
// import TableSelection from './TableSelectionComponent/TableSelection';
// import ComboPage from './ComboComponents/ComboPage';
// import OrderForm from './OrderComponents/OrderForm';
// import KitchenDisplay from './KDS/KitchenDisplay';
// import InvoicePage from './InvoiceComponents/InvoicePage';
// import ReportsPage from './ReportComponents/ReportsPage';
// import ViewTables from './TableSelectionComponent/ViewTables';
// import TableOverview from './TableOverviewComponents/TableOverview';
// import OrdersVisiblePage from './OrderComponents/OrdersVisiblePage';
// import DisplayMenuManager from './MenuComponents/DisplayMenuManager';
// import Login from './pages/Login';
// import Register from './pages/Register';
// import ForgotPassword from './pages/ForgotPassword';
// import './styles/MenuStylings.css'
// import MenuManager from './MenuComponents/MenuManager';
// import SwiggyMenuManager from './MenuComponents/SwiggyMenuManager';
// import ZomatoMenuManager from './MenuComponents/ZomatoManager';

// import MenuTypeSelector from './MenuComponents/MenuTypeSelector'



// const App = () => {
//   const [clientId, setClientId] = useState(() => localStorage.getItem("clientId") || "");
//   const [tables, setTables] = useState([]);
//   const [selectedTableId, setSelectedTableId] = useState("");
//   const [latestOrder, setLatestOrder] = useState(null);
//   const [enabledFeatures, setEnabledFeatures] = useState([]);
//   const location = useLocation();
//   const hideNavbar = ["/login", "/register", "/forgot"].includes(location.pathname);

//   const fetchTables = async () => {
//     if (!clientId) return;
//     try {
//       const res = await axios.get(`http://localhost:8000/api/v1/${clientId}/tables`);
//       setTables(res.data);
//     } catch (error) {
//       console.error("❌ Error fetching tables:", error);
//       localStorage.removeItem("clientId");
//       setClientId("");
//     }
//   };

//   const fetchFeatures = async () => {
//     if (!clientId) return;
//     try {
//       const res = await axios.get(`http://localhost:8000/api/v1/client/${clientId}/assigned-services`);
//       const cleaned = Array.from(new Set((res.data?.features || []).map(f => f.trim())));
//       setEnabledFeatures(cleaned);
//       console.log("✅ Features fetched:", cleaned);
//     } catch (err) {
//       console.error("❌ Failed to fetch assigned features", err);
//       setEnabledFeatures([]);
//     }
//   };

//   useEffect(() => {
//     const savedId = localStorage.getItem("clientId");
//     if (savedId) setClientId(savedId);
//   }, []);

//   useEffect(() => {
//     if (clientId) {
//       fetchTables();
//       fetchFeatures();
//     }
//   }, [clientId]);

//   const isEnabled = (feature) => enabledFeatures.includes(feature);

//   return (
//     <div style={{ display: 'flex' }}>
//       {!hideNavbar && <Navbar />}
//       <div style={{ flex: 1 }}>
//         <Routes>
//           <Route path="/" element={<MainPage />} />
//           <Route path="/register" element={<Register />} />
//           <Route path="/login" element={<Login />} />
//           <Route path="/forgot" element={<ForgotPassword />} />
//           {/* <Route  /> */}
//           <Route path="/dinein-page" element={<MenuManager clientId={clientId} />} />
//           <Route path="/swiggy-page" element={<SwiggyMenuManager clientId={clientId} />} />
//           <Route path="/zomato-page" element={<ZomatoMenuManager clientId={clientId} />} />

//           {isEnabled("Table Management") && (
//             <Route
//               path="/table-selection"
//               element={
//                 <TableSelection
//                   clientId={clientId}
//                   onTableAdded={(newTable) => {
//                     setSelectedTableId(newTable.table_number);
//                     fetchTables();
//                   }}
//                 />
//               }
//             />
//           )}

//           {isEnabled("Menu") && (
//             <>
//               <Route
//                 path="/menu-page"
//                 element={<MenuTypeSelector clientId={clientId} onAdd={() => { }} />}
//               />

//             </>
//           )}

//           {isEnabled("Combos") && (
//             <Route path="/combo-page" element={<ComboPage />} />
//           )}

//           {isEnabled("Order") && (
//             <>
//               <Route
//                 path="/order-form"
//                 element={
//                   <OrderForm
//                     tableId={selectedTableId}
//                     onOrderCreated={() => console.log("Order created")}
//                   />
//                 }
//               />
//               <Route
//                 path="/orders-view"
//                 element={<OrdersVisiblePage latestOrder={latestOrder} />}
//               />
//             </>
//           )}

//           {isEnabled("KDS") && <Route path="/kds-page" element={<KitchenDisplay />} />}
//           {isEnabled("Invoice") && <Route path="/invoice" element={<InvoicePage />} />}
//           {isEnabled("Transaction") && <Route path="/report-page" element={<ReportsPage />} />}
//           {isEnabled("Add Users") && <Route path="/add-users" element={<ReportsPage />} />}

//           {isEnabled("Table Selection") && (
//             <Route
//               path="/view-tables/:tableId?"
//               element={
//                 <ViewTables
//                   clientId={clientId}
//                   onOrderUpdate={(order) => setLatestOrder(order)}
//                 />
//               }
//             />
//           )}

//           {isEnabled("Dashboard") && (
//             <Route
//               path="/table-overview"
//               element={<TableOverview clientId={clientId} tables={tables} />}
//             />
//           )}

//           <Route path="*" element={<Navigate to="/" />} />
//         </Routes>

//       </div>
//     </div>
//   );
// };

// export default App;


// 

// no connection with dashboard

import './App.css';
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import Navbar from './NavbarComponent/Navbar';
import MainPage from './MainComponent/MainPage';
import TableSelection from './TableSelectionComponent/TableSelection';
import ComboPage from './ComboComponents/ComboPage';
import OrderForm from './OrderComponents/OrderForm';
import KitchenDisplay from './KDS/KitchenDisplay';
import InvoicePage from './InvoiceComponents/InvoicePage';
import ReportsPage from './ReportComponents/ReportsPage';
import ViewTables from './TableSelectionComponent/ViewTables';
import TableOverview from './TableOverviewComponents/TableOverview';
import OrdersVisiblePage from './OrderComponents/OrdersVisiblePage';
import MenuManager from './MenuComponents/MenuManager';
import SwiggyMenuManager from './MenuComponents/SwiggyMenuManager';
import ZomatoMenuManager from './MenuComponents/ZomatoManager';
import MenuTypeSelector from './MenuComponents/MenuTypeSelector';
import './styles/MenuStylings.css'
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import './styles/MenuStylings.css';
import UpdateProfile from './MainComponent/UpdateProfile';
import Settings from './MainComponent/Settings';

const App = () => {
  const [clientId, setClientId] = useState(() => localStorage.getItem("clientId") || "");
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [latestOrder, setLatestOrder] = useState(null);

  const location = useLocation();
  const hideNavbar = ["/login", "/register", "/forgot"].includes(location.pathname);

  const fetchTables = async () => {
    if (!clientId) return;
    try {
      const res = await axios.get(`http://localhost:8000/saas/${clientId}/tables/read`, {

      });
      setTables(res.data);

    } catch (error) {
      console.error("❌ Error fetching tables:", error);
      localStorage.removeItem("clientId");
      setClientId("");
    }
  };

  useEffect(() => {
    const savedId = localStorage.getItem("clientId");
    if (savedId) setClientId(savedId);
  }, []);

  useEffect(() => {
    if (clientId) {
      fetchTables();
    }
  }, [clientId]);

  return (
    <div style={{ display: 'flex' }}>
      {!hideNavbar && <Navbar />}
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path='/update-profile' element={<UpdateProfile />} />
          <Route path='/settings' element={<Settings />} />

          {/* Menu pages */}
          <Route path="/dinein-page" element={<MenuManager clientId={clientId} />} />
          <Route path="/swiggy-page" element={<SwiggyMenuManager clientId={clientId} />} />
          <Route path="/zomato-page" element={<ZomatoMenuManager clientId={clientId} />} />
          <Route path="/menu-page" element={<MenuTypeSelector clientId={clientId} onAdd={() => { }} />} />

          {/* Tables and orders */}
          <Route
            path="/table-selection"
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
            path="/view-tables/:tableId?"
            element={
              <ViewTables
                clientId={clientId}
                onOrderUpdate={(order) => setLatestOrder(order)}
              />
            }
          />
          <Route
            path="/order-form"
            element={
              <OrderForm
                tableId={selectedTableId}
                onOrderCreated={() => console.log("Order created")}
              />
            }
          />
          <Route path="/orders-view" element={<OrdersVisiblePage latestOrder={latestOrder} />} />

          {/* Other modules */}
          <Route path="/combo-page" element={<ComboPage />} />
          <Route path="/kds-page" element={<KitchenDisplay />} />
          <Route path="/invoice" element={<InvoicePage />} />
          <Route path="/report-page" element={<ReportsPage />} />
          <Route path="/add-users" element={<ReportsPage />} />
          <Route path="/table-overview" element={<TableOverview clientId={clientId} tables={tables} />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
