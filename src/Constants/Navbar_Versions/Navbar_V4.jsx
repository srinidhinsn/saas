import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { GiHamburgerMenu } from "react-icons/gi"; import { MdOutlineTableBar } from "react-icons/md";
import { FaHamburger } from "react-icons/fa";
import { MdKeyboardArrowRight } from "react-icons/md";
import { IoDocumentTextOutline } from "react-icons/io5";
import ClickSpark from '../../Sub_Components/SparkArrow';
import axios from 'axios';
const Navbar = ({ setClientId, selectedRealm }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { clientId } = useParams();
    const { darkMode } = useTheme();
    const [clients, setClients] = useState([]);
const token=localStorage.getItem("access_token")

    useEffect(() => {
        document.body.classList.toggle("theme-dark", darkMode);
    }, [darkMode]);
    useEffect(() => {
        if (!token) return;
        axios.get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realm`, {  params: { realm: selectedRealm },
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => setClients(res.data.data.clients))
            .catch(console.error);
    }, [token, selectedRealm]);



    const handleClientChange = (e) => {
        const newClientId = e.target.value;
        navigate(`/saas/${newClientId}/main/client-details_v4`);
    };


    // Navigation helper: you can enhance this to keep current path + new clientId as needed.
    const go = (path) => {
        if (!clientId) {
            alert("⚠️ Client ID not found. Please log in again.");
            window.location.href = "/";
            return;
        }


        if (!token) {
            alert("⚠️ Access token missing. Please log in again.");
            navigate(`/saas/${clientId}/login`);
            return;
        }


        const trimmedPath = path.startsWith("/") ? path.slice(1) : path;


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
        <div className="Navbar-container">
            <aside className="sidebar">
                <ul className="menu">
                    <ClickSpark>
                        <li title="Dashboard" onClick={() => go('/')} className={isActive('/main') ? 'page-active' : ''}>
                            <GiHamburgerMenu />
                            <span>Dashboard</span>
                            {!isActive('/main') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                        </li>
                    </ClickSpark>
                    <ClickSpark>
                        <li title="Realm" onClick={() => go('/client-details_v4')} className={isActive('/main/client-details_v4') ? 'page-active' : ''}>
                            <FaHamburger /><span>Menu</span>
                            {!isActive('/main/client-details_v4') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                        </li>
                    </ClickSpark>
                    <ClickSpark>
                        <li title="Order" onClick={() => go('/orders-view')} className={isActive('/main/orders-view') ? 'page-active' : ''}>
                            <FaHamburger /><span>Order Summary </span>
                            {!isActive('/main/orders-view') && <span className="arrow-indicator"><MdKeyboardArrowRight /></span>}
                        </li>
                    </ClickSpark>
                </ul>
            </aside>
        </div>
    );
};


export default Navbar;   