// import React from 'react';
// import { GiHamburgerMenu } from "react-icons/gi";
// import { FaHamburger } from "react-icons/fa";
// import { BiSolidSelectMultiple } from "react-icons/bi";
// import { MdOutlineMenuBook } from "react-icons/md";
// import { FcComboChart } from "react-icons/fc";
// import { RiMoneyRupeeCircleLine } from "react-icons/ri";
// import { PiHamburgerThin } from "react-icons/pi";
// import { FaKitchenSet } from "react-icons/fa6";
// import { FaFileInvoiceDollar } from "react-icons/fa6";
// import { TbReportSearch } from "react-icons/tb";
// import { MdDeliveryDining } from "react-icons/md";
// import { FaCashRegister } from "react-icons/fa";
// import { MdOutlineRateReview } from "react-icons/md";
// import { BsPersonCheck } from "react-icons/bs";
// import { MdOutlineTableBar } from "react-icons/md";
// import { GoPackageDependents } from "react-icons/go";
// import '../App.css';
// import Input from '../InputComponent/Input';
// import { useNavigate } from 'react-router-dom';

// const MainPage = () => {

//     const nav = useNavigate()

//     function tableSelection() {
//         nav('/table-selection')
//     }
//     function menuPage() {
//         nav('/menu-page')
//     }
//     function viewTable() {
//         nav('/view-tables')
//     }
//     return (
//         <div className="dashboard">
//             <aside className="sidebar">
//                 <div className="brand">DineIn Software</div>
//                 <ul className="menu">
//                     <li className="active"> <GiHamburgerMenu /><span>Dashboard</span></li>
//                     <li> <FaHamburger /><span>Order</span></li>
//                     <li className="menu-header"><span>Admin</span></li>
//                     <li onClick={tableSelection}> <BiSolidSelectMultiple /><span>Create Table</span></li>
//                     <li onClick={viewTable} > <BiSolidSelectMultiple /><span>Select Table</span></li>
//                     <li onClick={menuPage}> <MdOutlineMenuBook /><span>Menu</span> </li>
//                     <li><FcComboChart /><span>Combos</span></li>
//                     <li><FaKitchenSet /><span>KDS</span></li>
//                     <li><FaFileInvoiceDollar /><span>Invoice</span></li>
//                     <li><TbReportSearch /><span>Report</span></li>
//                     <li><FaCashRegister /><span>Transaction</span></li>
//                     <li><MdOutlineRateReview /><span>Customer Reviews</span></li>
//                 </ul>
//             </aside>
//             <main className="main">
//                 <header className="main-header">
//                     <div className="actions">
//                         <Input />
//                         <div className="avatar">👤</div>
//                     </div>
//                 </header>
//                 <div className="main-content">
//                     <div className="main-title">
//                         <h2>Dashboard</h2>
//                         <select>
//                             <option>Daily</option>
//                             <option>Weekly</option>
//                             <option>Monthly</option>
//                             <option>Quarterly</option>
//                             <option>Half Yearly</option>
//                             <option>Yearly</option>
//                         </select>
//                     </div>
//                     <div className="stats">
//                         <div className="stat-card">
//                             <div className="flexible" >
//                                 <div className="card-icons" ><FaHamburger /></div>
//                                 <div >
//                                     <div className="value">30</div>
//                                     <div className="title">Total Orders</div>
//                                 </div>
//                             </div>
//                             <div className="sub">Active: 50 </div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible">
//                                 <div className="card-icons"><PiHamburgerThin /></div>
//                                 <div >
//                                     <div className="value">10</div>
//                                     <div className="title">Pending Orders</div>
//                                 </div>
//                             </div>

//                             <div className="sub">Active: 50</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible">
//                                 <div className="card-icons">
//                                     <RiMoneyRupeeCircleLine />
//                                 </div>
//                                 <div> <div className="value">5000</div>
//                                     <div className="title">Total Earnings</div></div>
//                             </div>

//                             <div className="sub">Bill</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible">
//                                 <div className="card-icons"><BsPersonCheck /></div>
//                                 <div >  <div className="value">30</div>
//                                     <div className="title">Customers</div></div>
//                             </div>

//                             <div className="sub">Active: 15</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible">
//                                 <div className="card-icons"><MdOutlineTableBar /></div>
//                                 <div>
//                                     <div className="value">20</div>
//                                     <div className="title">Dine In</div>
//                                 </div>
//                             </div>
//                             <div className="sub">Active: 10</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible">
//                                 <div className="card-icons"><GoPackageDependents /></div>
//                                 <div>
//                                     <div className="value">5</div>
//                                     <div className="title">Take Away</div>
//                                 </div>
//                             </div>

//                             <div className="sub">Active: 10</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible"><div className="card-icons"><MdDeliveryDining /></div>
//                                 <div> <div className="value">5</div>
//                                     <div className="title">Delivery</div></div></div>

//                             <div className="sub">Active: 10</div>
//                         </div>
//                     </div>

//                     <div className="charts">
//                         <div className="chart">
//                             <div className="chart-header">
//                                 <h3>Sales value</h3>
//                                 <input type="date" />
//                             </div>
//                             <div className="chart-placeholder">[Chart]</div>
//                         </div>
//                         <div className="chart">
//                             <div className="chart-header">
//                                 <h3>Order sales</h3>
//                                 <input type="date" />
//                             </div>
//                             <div className="amount">€10,090.34</div>
//                             <div className="growth">+5.1k this week</div>
//                             <div className="chart-placeholder">[Chart]</div>
//                         </div>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default MainPage;



// import React, { useEffect, useState } from 'react';
// import { FaHamburger } from "react-icons/fa";
// import { RiMoneyRupeeCircleLine } from "react-icons/ri";
// import { PiHamburgerThin } from "react-icons/pi";
// import { FiSun, FiMoon } from 'react-icons/fi';
// import { useTheme } from "../ThemeChangerComponent/ThemeContext";
// import { MdDeliveryDining } from "react-icons/md";
// import { BsPersonCheck } from "react-icons/bs";
// import { MdOutlineTableBar } from "react-icons/md";
// import { GoPackageDependents } from "react-icons/go";
// import Input from '../InputComponent/Input';
// import { useNavigate } from 'react-router-dom';

// const MainPage = () => {
//     const nav = useNavigate();
//     const { darkMode, toggleTheme } = useTheme();
//     function tableSelection() { nav('/table-selection'); }
//     function menuPage() { nav('/menu-page'); }
//     function viewTable() { nav('/view-tables'); }

//     const handleThemeToggle = () => setDarkMode(prev => !prev);
//     useEffect(() => {
//         const body = document.body;
//         if (darkMode) {
//             body.classList.add("theme-dark");
//         } else {
//             body.classList.remove("theme-dark");
//         }
//     }, [darkMode]);


//     return (
//         <div className="dashboard">


//             <main className="main">
//                 <header className="main-header">
//                     <div className="actions">
//                         <Input />
//                         <div className="avatar">👤</div>

//                         <div className="theme-toggle-icon" onClick={toggleTheme}>
//                             {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
//                         </div>
//                     </div>
//                 </header>

//                 <div className="main-content">
//                     <div className="main-title">
//                         <h2>Dashboard</h2>
//                         <select>
//                             <option>Daily</option>
//                             <option>Weekly</option>
//                             <option>Monthly</option>
//                             <option>Quarterly</option>
//                             <option>Half Yearly</option>
//                             <option>Yearly</option>
//                         </select>
//                     </div>

//                     <div className="stats">
//                         <div className="stat-card">
//                             <div className="flexible"><div className="card-icons"><FaHamburger /></div>
//                                 <div><div className="value">30</div><div className="title">Total Orders</div></div>
//                             </div><div className="sub">Active: 50</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible"><div className="card-icons"><PiHamburgerThin /></div>
//                                 <div><div className="value">10</div><div className="title">Pending Orders</div></div>
//                             </div><div className="sub">Active: 50</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible"><div className="card-icons"><RiMoneyRupeeCircleLine /></div>
//                                 <div><div className="value">5000</div><div className="title">Total Earnings</div></div>
//                             </div><div className="sub">Bill</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible"><div className="card-icons"><BsPersonCheck /></div>
//                                 <div><div className="value">30</div><div className="title">Customers</div></div>
//                             </div><div className="sub">Active: 15</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible"><div className="card-icons"><MdOutlineTableBar /></div>
//                                 <div><div className="value">20</div><div className="title">Dine In</div></div>
//                             </div><div className="sub">Active: 10</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible"><div className="card-icons"><GoPackageDependents /></div>
//                                 <div><div className="value">5</div><div className="title">Take Away</div></div>
//                             </div><div className="sub">Active: 10</div>
//                         </div>

//                         <div className="stat-card">
//                             <div className="flexible"><div className="card-icons"><MdDeliveryDining /></div>
//                                 <div><div className="value">5</div><div className="title">Delivery</div></div>
//                             </div><div className="sub">Active: 10</div>
//                         </div>
//                     </div>

//                     <div className="charts">
//                         <div className="chart">
//                             <div className="chart-header"><h3>Sales value</h3><input type="date" /></div>
//                             <div className="chart-placeholder">[Chart]</div>
//                         </div>
//                         <div className="chart">
//                             <div className="chart-header"><h3>Order sales</h3><input type="date" /></div>
//                             <div className="amount">€10,090.34</div>
//                             <div className="growth">+5.1k this week</div>
//                             <div className="chart-placeholder">[Chart]</div>
//                         </div>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default MainPage;


// 
import React, { useEffect, useState, useRef } from 'react';
import { FaHamburger } from "react-icons/fa";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { PiHamburgerThin } from "react-icons/pi";
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from "../ThemeChangerComponent/ThemeContext";
import { MdDeliveryDining } from "react-icons/md";
import { BsPersonCheck } from "react-icons/bs";
import { MdOutlineTableBar } from "react-icons/md";
import { GoPackageDependents } from "react-icons/go";
import { MdOutlineSoupKitchen } from "react-icons/md";
import { TbToolsKitchen3 } from "react-icons/tb";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const MainPage = () => {
    const nav = useNavigate();
    const { clientId } = useParams(); // Extract clientId from route
    const { darkMode, toggleTheme } = useTheme();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // 📊 Dashboard stats
    const [totalOrders, setTotalOrders] = useState(0);
    const [pendingOrders, setPendingOrders] = useState(0);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [totalCustomers, setTotalCustomers] = useState(0);

    const [newOrders, setNewOrders] = useState(0);
    const [preparingOrders, setPreparingOrders] = useState(0);
    const [servedOrders, setServedOrders] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [timeFilter, setTimeFilter] = useState("Daily");




    const token = localStorage.getItem("access_token");

    useEffect(() => {
        const body = document.body;
        if (darkMode) {
            body.classList.add("theme-dark");
        } else {
            body.classList.remove("theme-dark");
        }
    }, [darkMode]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAvatarClick = () => setShowDropdown(!showDropdown);

    const handleUpdateProfile = () => {
        setShowDropdown(false);
        nav('/update-profile');
    };

    const handleLogout = () => {
        setShowDropdown(false);
        localStorage.clear();
        nav('/login');
    };

    function settings() {
        nav('/settings');
    }

    // 🔄 Fetch orders & calculate dashboard stats
    useEffect(() => {
        const fetchStats = async () => {
            if (!token || !clientId) return;

            try {
                const res = await axios.get(`http://localhost:8003/saas/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const allOrders = res.data?.data || [];

                const startDate = getStartDate(timeFilter);
                const filteredOrders = allOrders.filter(o => new Date(o.created_at) >= startDate);


                setTotalOrders(filteredOrders.length);
                setPendingOrders(
                    filteredOrders.filter(o => o.status === "pending" || o.status === "preparing").length
                );
                setTotalEarnings(
                    Math.round(
                        filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)
                    )
                );

                setTotalCustomers(filteredOrders.length);
                setNewOrders(filteredOrders.filter(o => o.status === "new").length);
                setPreparingOrders(filteredOrders.filter(o => o.status === "preparing").length);
                setServedOrders(filteredOrders.filter(o => o.status === "served").length);

                //
                const ordersByDate = {};
                filteredOrders.forEach(order => {
                    const date = new Date(order.created_at).toISOString().split('T')[0]; // 'YYYY-MM-DD'
                    if (!ordersByDate[date]) {
                        ordersByDate[date] = { date, sales: 0, count: 0 };
                    }
                    ordersByDate[date].sales += parseFloat(order.total_price) || 0;
                    ordersByDate[date].count += 1;
                });

                const chartData = Object.values(ordersByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
                setChartData(chartData);
                //

            } catch (err) {
                console.error("❌ Failed to fetch dashboard stats:", err);
            }
        };

        fetchStats();
    }, [clientId, timeFilter]);
    const getStartDate = (filter) => {
        const now = new Date();
        switch (filter) {
            case "Daily":
                return new Date(now.setHours(0, 0, 0, 0));
            case "Weekly":
                return new Date(now.setDate(now.getDate() - 7));
            case "Monthly":
                return new Date(now.setMonth(now.getMonth() - 1));
            case "Quarterly":
                return new Date(now.setMonth(now.getMonth() - 3));
            case "Half Yearly":
                return new Date(now.setMonth(now.getMonth() - 6));
            case "Yearly":
                return new Date(now.setFullYear(now.getFullYear() - 1));
            default:
                return new Date(now.setHours(0, 0, 0, 0));
        }
    };


    return (
        <div className="dashboard">
            <main className="main">
                <header className="main-header">
                    <div className="actions">
                        <div className="avatar" onClick={handleAvatarClick} ref={dropdownRef} style={{ cursor: 'pointer', position: 'relative' }}>
                            👤
                            {showDropdown && (
                                <div style={{
                                    position: 'absolute',
                                    top: '110%',
                                    right: 0,
                                    background: 'var(--card-bg)',
                                    color: 'var(--text-color)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    zIndex: 1000,
                                    minWidth: '150px',
                                }}>
                                    <div onClick={handleUpdateProfile} style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #ccc', fontSize: '14px', background: 'var(--card-bg)' }}>
                                        Update Profile
                                    </div>
                                    <div onClick={settings} style={{ padding: '10px 15px', cursor: 'pointer', fontSize: '14px', background: 'var(--card-bg)' }}>
                                        Settings
                                    </div>
                                    <div onClick={handleLogout} style={{ padding: '10px 15px', cursor: 'pointer', fontSize: '14px', background: 'var(--card-bg)' }}>
                                        Logout
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="theme-toggle-icon" onClick={toggleTheme}>
                            {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
                        </div>
                    </div>
                </header>

                <div className="main-content">
                    <div className="main-title">
                        <h2>Dashboard</h2>
                        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Half Yearly">Half Yearly</option>
                            <option value="Yearly">Yearly</option>
                        </select>

                    </div>

                    <div className="stats">
                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><FaHamburger /></div>
                                <div><div className="value">{totalOrders}</div><div className="title">Total Orders</div></div>
                            </div><div className="sub">Active: {totalOrders}</div>
                        </div>

                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><PiHamburgerThin /></div>
                                <div><div className="value">{pendingOrders}</div><div className="title">Pending Orders</div></div>
                            </div><div className="sub">Active: {pendingOrders}</div>
                        </div>

                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><RiMoneyRupeeCircleLine /></div>
                                <div><div className="value">₹{totalEarnings}</div>
                                    <div className="title">Total Earnings</div></div>
                            </div><div className="sub">Bill</div>
                        </div>

                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><BsPersonCheck /></div>
                                <div><div className="value">{totalCustomers}</div><div className="title">Customers</div></div>
                            </div><div className="sub">Active: {totalCustomers}</div>
                        </div>

                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><MdOutlineTableBar /></div>
                                <div><div className="value">{newOrders}</div><div className="title">New</div></div>
                            </div><div className="sub">Active: {newOrders}</div>
                        </div>

                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><MdOutlineSoupKitchen /></div>
                                <div><div className="value">{preparingOrders}</div><div className="title">Preparing</div></div>
                            </div><div className="sub">Active: {preparingOrders}</div>
                        </div>

                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><TbToolsKitchen3 /></div>
                                <div><div className="value">{servedOrders}</div><div className="title">Served</div></div>
                            </div><div className="sub">Active: {servedOrders}</div>
                        </div>
                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><GoPackageDependents /></div>
                                <div><div className="value">0</div><div className="title">Take away</div></div>
                            </div><div className="sub">Active:0(under progress)</div>
                        </div>

                        <div className="stat-card">
                            <div className="flexible"><div className="card-icons"><MdDeliveryDining /></div>
                                <div><div className="value">0</div><div className="title">Delivery</div></div>
                            </div><div className="sub">Active:0(under progress)</div>
                        </div>

                    </div>

                    <div className="charts">
                        <div className="chart">
                            <div className="chart-header"><h3>Sales value</h3><input type="date" /></div>
                            <div className="chart-placeholder">[Chart]</div>
                        </div>
                        <div className="chart">
                            <div className="chart-header"><h3>Order sales</h3><input type="date" /></div>
                            <div className="amount">₹{totalEarnings}</div>
                            <div className="growth">+5.1k this week</div>
                            <div className="chart-placeholder">[Chart]</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MainPage;
