// import React, { useState } from "react";
// import TableList from "./components/TableList";
// import AddTableForm from "./components/AddTableForm";
// import MenuManager from "./components/MenuManager";
// import ComboManager from "./components/ComboManager";
// import TableOrdersPage from "./pages/TableOrdersPage";
// import KitchenDisplay from "./components/KDS/KitchenDisplay";
// import "./styles/App.css";

// function App() {
//   const [clientId, setClientId] = useState("");
//   const [selectedTableId, setSelectedTableId] = useState("");

//   return (
//     <div className="container">
//       <h1 className="title">Dine-In Management Portal</h1>

//       <input
//         type="text"
//         placeholder="Enter client ID (UUID)"
//         value={clientId}
//         onChange={(e) => {
//           setClientId(e.target.value);
//           setSelectedTableId("");
//         }}
//         className="input"
//       />

//       {clientId && !selectedTableId && (
//         <>
//           <h2 className="section-title">Table Management</h2>
//           <AddTableForm clientId={clientId} />
//           <TableList clientId={clientId} onTableSelect={setSelectedTableId} />

//           <hr className="divider" />

//           <MenuManager clientId={clientId} />

//           <hr className="divider" />

//           <ComboManager clientId={clientId} />

//           <h2 className="section-title">Kitchen Display System</h2>
//           <KitchenDisplay clientId={clientId} />
//         </>
//       )}

//       {clientId && selectedTableId && (
//         <div>
//           <button
//             onClick={() => setSelectedTableId("")}
//             className="back-button"
//           >
//             ← Back to Management Dashboard
//           </button>
//           <TableOrdersPage clientId={clientId} tableId={selectedTableId} />
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;


import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DIneInPage from './components/DineInPage'
import Dashboard from './components/dashboard/Dashboard'
import TitleCard from '../src/components/LoginComponents/TitleCard'
import LoginPage from '../src/components/LoginComponents/Login'
import './App.css'
import RegisterPage from '../src/components/LoginComponents/RegisterPage'
import ForgotPage from '../src/components/LoginComponents/ForgotPage'
import ResetImage from './components/LoginComponents/ResetPage'
// import ResetImage from '../src/components/LoginComponents/ResetImage'

const App = () => {

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path='/' element=
            {<TitleCard />}
          />
          <Route path='/dine' element={<DIneInPage />}></Route>
          <Route path='/dash' element={<Dashboard />}></Route>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/forgot' element={<ForgotPage />} />
          <Route path='/reset' element={<ResetImage />} />
        </Routes>
      </BrowserRouter>

    </div>
  )
}

export default App


// import React, { useState } from 'react'
// import { BrowserRouter, Route, Routes } from 'react-router-dom'
// import Navbar from './components/Navbar'
// import './App.css'
// import Hero from './components/Hero'
// import Footer from './components/Footer'
// import AnimatedLoginPage from '../src/LoginPages/Login'
// import Dinein from './components/Dinein'
// import TableOrdersPage from './pages/TableOrdersPage'
// import ErrorPage from './components/ErrorPage'
// const App = () => {
//   const [selectedPage, setSelectedPage] = useState("dashboard");

//   return (
//     <div>
//       <BrowserRouter>

//         <Routes>
//           <Route path='/' element={<AnimatedLoginPage />} />
//           <Route
//             path="/dash"
//             element={
//               <div className={`Components ${selectedPage === "dashboard" ? "dashboard-layout" : ""}`}>
//                 <Navbar setSelectedPage={setSelectedPage} />
//                 <div className="main-wrapper">

//                   <div className="Secondary-components">
//                     <Hero selectedPage={selectedPage} />
//                     {/* {selectedPage === "dashboard" && (
//                       <div className="Footer-component"><Footer /></div>
//                     )} */}
//                   </div>
//                 </div>
//               </div>

//             }
//           />
//           <Route path="/table-orders/:clientId/:tableId" element={<TableOrdersPage />} />
//           <Route path='*' element={<ErrorPage />} />
//         </Routes>
//       </BrowserRouter>

//     </div>
//   )
// }

// export default App
