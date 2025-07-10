// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import { GiHamburgerMenu } from "react-icons/gi";
// import { FaHamburger, FaCashRegister } from "react-icons/fa";
// import { MdOutlineMenuBook, MdOutlineRateReview } from "react-icons/md";
// import { FcComboChart } from "react-icons/fc";
// import { FaKitchenSet, FaFileInvoiceDollar } from "react-icons/fa6";
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useTheme } from "../ThemeChangerComponent/ThemeContext";
// import { MdOutlineTableBar } from "react-icons/md";
// import { FaUserPlus } from "react-icons/fa6";
// import { FaTableCells } from "react-icons/fa6";
// import { FaRegMoneyBillAlt } from "react-icons/fa";



// const Navbar = () => {
//     const nav = useNavigate();
//     const location = useLocation();
//     const { darkMode } = useTheme();
//     const [enabledFeatures, setEnabledFeatures] = useState(() => {
//         const stored = localStorage.getItem("enabledFeatures");
//         return stored ? JSON.parse(stored) : [];
//     });

//     useEffect(() => {
//         document.body.classList.toggle("theme-dark", darkMode);
//     }, [darkMode]);

//     useEffect(() => {
//         const clientId = localStorage.getItem("clientId");
//         if (!clientId) return;

//         console.log("📦 Fetching features for clientId:", clientId);

//         axios.get(`http://localhost:8000/api/v1/client/${clientId}/assigned-services`)
//             .then(res => {
//                 const raw = res.data?.features || [];
//                 const cleaned = Array.from(new Set(raw.map(f => f.trim())));

//                 if (cleaned.length) {
//                     localStorage.setItem("enabledFeatures", JSON.stringify(cleaned));
//                     setEnabledFeatures(cleaned);
//                 } else {
//                     localStorage.removeItem("enabledFeatures");
//                     setEnabledFeatures([]);
//                 }
//             })
//             .catch(err => {
//                 console.error("❌ Failed to fetch assigned features:", err?.response?.data || err.message);
//                 const fallback = JSON.parse(localStorage.getItem("enabledFeatures") || "[]");
//                 setEnabledFeatures(fallback);
//             });
//     }, []);

//     const isEnabled = (feature) => enabledFeatures.includes(feature);

//     return (
//         <aside className="sidebar">
//             <div className="brand">DineIn Software</div>
//             <ul className="menu">
//                 {isEnabled("Dashboard") && (
//                     <li title='Dashboard' onClick={() => nav('/')} className={location.pathname === '/' ? 'page-active' : ''}>
//                         <GiHamburgerMenu /><span>Dashboard</span>
//                     </li>
//                 )}
//                 {isEnabled("Order") && (
//                     <li title='Order' onClick={() => nav('/orders-view')} className={location.pathname === '/orders-view' ? 'page-active' : ''}>
//                         <FaHamburger /><span>Order</span>
//                     </li>
//                 )}
//                 <li className="menu-header"><span>Admin</span></li>
//                 {isEnabled("Table Management") && (
//                     <li title='Table Management' onClick={() => nav('/table-selection')} className={location.pathname === '/table-selection' ? 'page-active' : ''}>
//                         <MdOutlineTableBar /><span>Table Management</span>
//                     </li>
//                 )}
//                 {isEnabled("Table Selection") && (
//                     <li title='Table Selection' onClick={() => nav('/view-tables')} className={location.pathname.startsWith('/view-tables') ? 'page-active' : ''}>
//                         <FaTableCells /><span>Table Selection</span>
//                     </li>
//                 )}
//                 {isEnabled("Menu") && (
//                     <li title='Menu' onClick={() => nav('/menu-page')} className={location.pathname === '/menu-page' ? 'page-active' : ''}>
//                         <MdOutlineMenuBook /><span>Menu</span>
//                     </li>
//                 )}
//                 {isEnabled("Combos") && (
//                     <li title='Combos' onClick={() => nav('/combo-page')} className={location.pathname === '/combo-page' ? 'page-active' : ''}>
//                         <FcComboChart /><span>Combos</span>
//                     </li>
//                 )}
//                 {isEnabled("KDS") && (
//                     <li title='KDS' onClick={() => nav('/kds-page')} className={location.pathname === '/kds-page' ? 'page-active' : ''}>
//                         <FaKitchenSet /><span>KDS</span>
//                     </li>
//                 )}
//                 {isEnabled("Invoice") && (
//                     <li title='Invoice' onClick={() => nav('/invoice')} className={location.pathname === '/invoice' ? 'page-active' : ''}>
//                         <FaFileInvoiceDollar /><span>Invoice</span>
//                     </li>
//                 )}
//                 {isEnabled("Transaction") && (
//                     <li title='Transaction' onClick={() => nav('/transaction')} className={location.pathname === '/transaction' ? 'page-active' : ''}>
//                         <FaCashRegister /><span>Transaction</span>
//                     </li>
//                 )}
//                 {isEnabled("Customer Reviews") && (
//                     <li title='Customer Reviews' onClick={() => nav('/customer-reviews')} className={location.pathname === '/customer-reviews' ? 'page-active' : ''}>
//                         <MdOutlineRateReview /><span>Customer Reviews</span>
//                     </li>
//                 )}
//                 {isEnabled("KOT bill") && (
//                     <li title='KOT bill' onClick={() => nav('/customer-reviews')} className={location.pathname === '/customer-reviews' ? 'page-active' : ''}>
//                         <FaRegMoneyBillAlt /><span>KOT bill</span>
//                     </li>
//                 )}
//                 {isEnabled("Add Users") && (
//                     <li title='Add Users' onClick={() => nav('/add-users')} className={location.pathname === '/add-users' ? 'page-active' : ''}>
//                         <FaUserPlus /><span>Add Users</span>
//                     </li>
//                 )}
//             </ul>
//         </aside>
//     );
// };

// export default Navbar;




//
import React, { useEffect } from 'react';
import axios from 'axios';
import { GiHamburgerMenu } from "react-icons/gi";
import { FaHamburger, FaCashRegister } from "react-icons/fa";
import { MdOutlineMenuBook, MdOutlineRateReview } from "react-icons/md";
import { FcComboChart } from "react-icons/fc";
import { FaKitchenSet, FaFileInvoiceDollar, FaUserPlus, FaTableCells } from "react-icons/fa6";
import { MdOutlineTableBar } from "react-icons/md";
import { FaRegMoneyBillAlt } from "react-icons/fa";
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTheme } from "../ThemeChangerComponent/ThemeContext";

const Navbar = () => {
    const nav = useNavigate();
    const location = useLocation();
    const { clientId } = useParams()
    const { darkMode } = useTheme();

    useEffect(() => {
        document.body.classList.toggle("theme-dark", darkMode);
    }, [darkMode]);

    const go = (path) => nav(`/saas/${clientId}${path}`);
    const isActive = (path) => location.pathname === `/saas/${clientId}${path}`;
    const startsWith = (path) => location.pathname.startsWith(`/saas/${clientId}${path}`);

    return (
        <aside className="sidebar">
            <div className="brand">DineIn Software</div>
            <ul className="menu">
                <li title='Dashboard' onClick={() => go('/')} className={isActive('/') ? 'page-active' : ''}>
                    <GiHamburgerMenu /><span>Dashboard</span>
                </li>
                <li title='Order' onClick={() => go('/orders-view')} className={isActive('/orders-view') ? 'page-active' : ''}>
                    <FaHamburger /><span>Order</span>
                </li>
                <li className="menu-header"><span>Admin</span></li>
                <li title='Table Management' onClick={() => go('/table-selection')} className={isActive('/table-selection') ? 'page-active' : ''}>
                    <MdOutlineTableBar /><span>Table Management</span>
                </li>
                <li title='Table Selection' onClick={() => go('/view-tables')} className={startsWith('/view-tables') ? 'page-active' : ''}>
                    <FaTableCells /><span>Table Selection</span>
                </li>
                <li title='Menu' onClick={() => go('/menu-page')} className={isActive('/menu-page') ? 'page-active' : ''}>
                    <MdOutlineMenuBook /><span>Menu</span>
                </li>
                <li title='Combos' onClick={() => go('/combo-page')} className={isActive('/combo-page') ? 'page-active' : ''}>
                    <FcComboChart /><span>Combos</span>
                </li>
                <li title='KDS' onClick={() => go('/kds-page')} className={isActive('/kds-page') ? 'page-active' : ''}>
                    <FaKitchenSet /><span>KDS</span>
                </li>
                <li title='Invoice' onClick={() => go('/invoice')} className={isActive('/invoice') ? 'page-active' : ''}>
                    <FaFileInvoiceDollar /><span>Invoice</span>
                </li>
                <li title='Transaction' onClick={() => go('/transaction')} className={isActive('/transaction') ? 'page-active' : ''}>
                    <FaCashRegister /><span>Transaction</span>
                </li>
                <li title='Customer Reviews' onClick={() => go('/customer-reviews')} className={isActive('/customer-reviews') ? 'page-active' : ''}>
                    <MdOutlineRateReview /><span>Customer Reviews</span>
                </li>
                <li title='KOT bill' onClick={() => go('/kot-bill')} className={isActive('/kot-bill') ? 'page-active' : ''}>
                    <FaRegMoneyBillAlt /><span>KOT bill</span>
                </li>
                <li title='Add Users' onClick={() => go('/add-users')} className={isActive('/add-users') ? 'page-active' : ''}>
                    <FaUserPlus /><span>Add Users</span>
                </li>
            </ul>
        </aside>
    );
};

export default Navbar;
