import React, { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTheme } from "../ThemeChangerComponent/ThemeProvider";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaHamburger, FaCashRegister, FaRegMoneyBillAlt } from "react-icons/fa";
import { MdOutlineMenuBook, MdOutlineRateReview, MdOutlineTableBar } from "react-icons/md";
import { FcComboChart } from "react-icons/fc";
import { FaKitchenSet, FaFileInvoiceDollar, FaUserPlus, FaTableCells } from "react-icons/fa6";
import { MdKeyboardArrowRight } from "react-icons/md";
import { IoDocumentTextOutline } from "react-icons/io5";
const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { clientId: paramClientId } = useParams();
    const { darkMode } = useTheme();

    const clientId = paramClientId || localStorage.getItem("clientId");
    const accessToken = localStorage.getItem("access_token");

    useEffect(() => {
        document.body.classList.toggle("theme-dark", darkMode);
    }, [darkMode]);

    const go = (path) => {
        if (!clientId) {
            alert("⚠️ Client ID not found. Please log in again.");
            window.location.href = "/";
            return;
        }

        if (!accessToken) {
            alert("⚠️ Access token missing. Please log in again.");
            navigate(`/saas/${clientId}/login`);
            return;
        }

        const trimmedPath = path.startsWith("/") ? path.slice(1) : path;

        // Force dashboard path to use 'main'
        // const pageName = path === "/" ? "main" : trimmedPath.split("/")[0];
        navigate(`/saas/${clientId}/main/${trimmedPath}`);

    };
    const basePath = `/saas/${clientId}`;
    const currentPath = location.pathname;

    // const isActive = (targetPath) => currentPath === `${basePath}${targetPath}`;
    const startsWith = (targetPath) => currentPath.startsWith(`${basePath}${targetPath}`);
    const isActive = (targetPath) => {
        const normalize = (path) => path.replace(/\/+$/, ''); // remove trailing slashes
        const current = normalize(currentPath);
        const target = normalize(`${basePath}${targetPath}`);

        if (targetPath === '/main') {
            return current === target;
        }

        return current === target || current.startsWith(`${target}/`);
    };


    return (
        <aside className="sidebar">
            {/* <div className="brand">DineIn Software</div> */}
            <ul className="menu">
                <li title="Dashboard" onClick={() => go('/')} className={isActive('/main') ? 'page-active' : ''}>
                    <GiHamburgerMenu />
                    <span>Dashboard</span>
                    {!isActive('/main') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>

                <li title="Order" onClick={() => go('/orders-view')} className={isActive('/main/orders-view') ? 'page-active' : ''}>
                    <FaHamburger /><span>Order </span>
                    {!isActive('/main/orders-view') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>
                <li title="Table Management" onClick={() => go('/table-selection')} className={isActive('/main/table-selection') ? 'page-active' : ''}>
                    <MdOutlineTableBar /><span>Table Management</span>
                    {!isActive('/main/table-selection') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>
                <li title="Table Selection" onClick={() => go('/view-tables')} className={isActive('/main/view-tables') ? 'page-active' : ''}>
                    <FaTableCells /><span>Table Selection</span>
                    {!isActive('/main/view-tables') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>
                <li title="Menu" onClick={() => go('/menu-page')} className={isActive('/main/menu-page') ? 'page-active' : ''}>
                    <MdOutlineMenuBook /><span>Menu</span>
                    {!isActive('/main/menu-page') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>
                <li title="KDS" onClick={() => go('/kds-page')} className={isActive('/main/kds-page') ? 'page-active' : ''}>
                    <FaKitchenSet /><span>KDS</span>
                    {!isActive('/main/kds-page') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>

                <li title="Documents" onClick={() => go('/documents')} className={isActive('/main/documents') ? 'page-active' : ''}>
                    <IoDocumentTextOutline /><span>Documents</span>
                    {!isActive('/main/documents') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>
                <li title="Invoice" onClick={() => go('/invoice')} className={isActive('/main/invoice') ? 'page-active' : ''}>
                    <IoDocumentTextOutline /><span>Invoice</span>
                    {!isActive('/main/invoice') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>
                <li title="Report" onClick={() => go('/reports')} className={isActive('/main/reports') ? 'page-active' : ''}>
                    <FaFileInvoiceDollar /><span>Report</span>
                    {!isActive('/main/reports') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>
                <li title="Add Users" onClick={() => go('/add-users')} className={isActive('/main/add-users') ? 'page-active' : ''}>
                    <FaUserPlus /><span>Add Users</span>
                    {!isActive('/main/add-users') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                </li>
            </ul>
        </aside>
    );
};

export default Navbar;
