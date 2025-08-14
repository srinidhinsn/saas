import React, { useEffect, useState, useRef } from 'react';
import { FaHamburger } from "react-icons/fa";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { PiHamburgerThin } from "react-icons/pi";
import { useTheme } from "../ThemeChangerComponent/ThemeProvider";
import { MdDeliveryDining } from "react-icons/md";
import { BsPersonCheck } from "react-icons/bs";
import { MdOutlineTableBar } from "react-icons/md";
import { GoPackageDependents } from "react-icons/go";
import { MdOutlineSoupKitchen } from "react-icons/md";
import { TbToolsKitchen3 } from "react-icons/tb"; import orderServicesPort from "../Backend_Port_Files/OrderServices";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const DashBoardPage = () => {
    const nav = useNavigate();
    const { clientId } = useParams();
    const { darkMode } = useTheme();

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

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
    const [topItemsData, setTopItemsData] = useState([]);

    const [tableId, setTableId] = useState(null)
    useEffect(() => {
        if (tableId) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableId]);
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

    // ----------------------------------------------------- //



    // Fetch and process top ordered items
    useEffect(() => {
        const fetchTopItems = async () => {
            if (!clientId) return;
            try {
                const response = await orderServicesPort.get(`/${clientId}/dinein/table`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const allOrders = response.data?.data || [];

                // Aggregate orders by item name
                const itemCounts = {};
                allOrders.forEach(order => {
                    if (!order.items) return; // safeguard if no items array
                    order.items.forEach(item => {
                        const name = item.name || item.itemName || "Unknown";
                        const quantity = item.quantity ? parseInt(item.quantity, 10) : 1;
                        if (!itemCounts[name]) {
                            itemCounts[name] = 0;
                        }
                        itemCounts[name] += quantity;
                    });
                });

                // Convert to array and sort descending by quantity
                const sortedItems = Object.entries(itemCounts)
                    .map(([itemName, orders]) => ({ itemName, orders }))
                    .sort((a, b) => b.orders - a.orders);

                // Pick top 5 items
                const topFiveItems = sortedItems.slice(0, 5);

                setTopItemsData(topFiveItems);

            } catch (error) {
                console.error("Failed to fetch top ordered items:", error);
            }
        };

        fetchTopItems();
    }, [clientId]);

    // ----------------------------------------------------- //


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
                setPendingOrders(filteredOrders.filter(o => o.status === "pending" || o.status === "preparing").length);
                setTotalEarnings(Math.round(filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)));
                setTotalCustomers(filteredOrders.length);
                setNewOrders(filteredOrders.filter(o => o.status === "new").length);
                setPreparingOrders(filteredOrders.filter(o => o.status === "preparing").length);
                setServedOrders(filteredOrders.filter(o => o.status === "served").length);

                // Group orders by hour for daily, else group by day
                const ordersByGroup = {};
                filteredOrders.forEach(order => {
                    const dateObj = new Date(order.created_at);

                    let groupKey;
                    if (timeFilter === 'Daily') {
                        // Format hour label e.g. "9 AM"
                        const hour = dateObj.getHours();
                        groupKey = `${hour}:00`;
                    } else {
                        // Format date label e.g. "Jul 12"
                        groupKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }

                    if (!ordersByGroup[groupKey]) {
                        ordersByGroup[groupKey] = { date: groupKey, sales: 0, count: 0 };
                    }
                    ordersByGroup[groupKey].sales += parseFloat(order.total_price) || 0;
                    ordersByGroup[groupKey].count += 1;
                });

                // Sort keys properly: hours numeric order for daily, date order for others
                let sortedData;
                if (timeFilter === 'Daily') {
                    sortedData = Object.values(ordersByGroup).sort((a, b) => {
                        return parseInt(a.date) - parseInt(b.date);
                    });
                } else {
                    sortedData = Object.values(ordersByGroup).sort((a, b) => {
                        return new Date(a.date + ", " + new Date().getFullYear()) - new Date(b.date + ", " + new Date().getFullYear());
                    });
                }

                setChartData(sortedData);

            } catch (err) {
                console.error("❌ Failed to fetch dashboard stats:", err);
            }
        };


        fetchStats();
    }, [clientId, timeFilter, token]);

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
    const getSalesLabel = () => {
        switch (timeFilter) {
            case "Daily":
                return "Sales today";
            case "Weekly":
                return "Sales this week";
            case "Monthly":
                return "Sales this month";
            case "Quarterly":
                return "Sales this quarter";
            case "Half Yearly":
                return "Sales last 6 months";
            case "Yearly":
                return "Sales this year";
            default:
                return "Sales";
        }
    };

    const getOrdersLabel = () => {
        switch (timeFilter) {
            case "Daily":
                return "Orders today";
            case "Weekly":
                return "Orders this week";
            case "Monthly":
                return "Orders this month";
            case "Quarterly":
                return "Orders this quarter";
            case "Half Yearly":
                return "Orders last 6 months";
            case "Yearly":
                return "Orders this year";
            default:
                return "Orders";
        }
    };

    return (
        <div className="Dashboard-container">
            <div className="dashboard">
                <main className="main">
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

                        <div className="grid-layout">
                            <div className="grids dash-cards">
                                <div className="card-icons"><FaHamburger /></div>
                                <div className='card-values'>
                                    <div className="value">{totalOrders}</div>
                                    <div className="title">Total Orders</div>
                                </div>
                                <div className="sub">Active: {totalOrders}</div>
                            </div>

                            <div className="grids dash-cards">
                                <div className="card-icons"><PiHamburgerThin /></div>
                                <div>
                                    <div className="value">{pendingOrders}</div>
                                    <div className="title">Pending Orders</div>
                                </div>
                                <div className="sub">Active: {pendingOrders}</div>
                            </div>

                            <div className="grids dash-cards">
                                <div className="card-icons"><RiMoneyRupeeCircleLine /></div>
                                <div>
                                    <div className="value">₹{totalEarnings}</div>
                                    <div className="title">Total Earnings</div>
                                </div>
                                <div className="sub">Bill</div>
                            </div>

                            <div className="grids dash-cards">
                                <div className="card-icons"><BsPersonCheck /></div>
                                <div>
                                    <div className="value">{totalCustomers}</div>
                                    <div className="title">Customers</div>
                                </div>
                                <div className="sub">Active: {totalCustomers}</div>
                            </div>

                            <div className="grids dash-cards">
                                <div className="card-icons"><MdOutlineTableBar /></div>
                                <div>
                                    <div className="value">{newOrders}</div>
                                    <div className="title">New</div>
                                </div>
                                <div className="sub">Active: {newOrders}</div>
                            </div>

                            <div className="grids dash-cards">
                                <div className="card-icons"><MdOutlineSoupKitchen /></div>
                                <div>
                                    <div className="value">{preparingOrders}</div>
                                    <div className="title">Preparing</div>
                                </div>
                                <div className="sub">Active: {preparingOrders}</div>
                            </div>

                            <div className="grids dash-cards">
                                <div className="card-icons"><TbToolsKitchen3 /></div>
                                <div>
                                    <div className="value">{servedOrders}</div>
                                    <div className="title">Served</div>
                                </div>
                                <div className="sub">Active: {servedOrders}</div>
                            </div>

                            <div className="grids dash-cards">
                                <div className="card-icons"><GoPackageDependents /></div>
                                <div>
                                    <div className="value">0</div>
                                    <div className="title">Take away</div>
                                </div>
                                <div className="sub">Active:0(under progress)</div>
                            </div>

                            <div className="grids dash-cards">
                                <div className="card-icons"><MdDeliveryDining /></div>
                                <div>
                                    <div className="value">0</div>
                                    <div className="title">Delivery</div>
                                </div>
                                <div className="sub">Active:0(under progress)</div>
                            </div>
                        </div>

                        <div className="charts">

                            {/* Sales Value Chart */}
                            <div className="chart">
                                <div className="chart-header">
                                    <h3>Sales value</h3>
                                    <input type="date" />
                                </div>
                                <div className="amount">₹{totalEarnings}</div>
                                <div className="growth">{getSalesLabel()}</div>
                                <ResponsiveContainer width="100%" height={150}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12 }}
                                            tickLine={false}
                                            padding={{ left: 10, right: 10 }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            tickLine={false}
                                            domain={['auto', 'auto']}
                                            allowDecimals={false}
                                            label={{ value: 'Profit', angle: -90, position: 'insideLeft', fontSize: 14 }}
                                        />
                                        <Tooltip formatter={(value) => `₹${value}`} />
                                        <Bar dataKey="sales" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>


                            {/* Order Sales Chart */}
                            <div className="chart">
                                <div className="chart-header">
                                    <h3>Order sales</h3>
                                    <input type="date" />
                                </div>
                                <div className="amount">#{totalOrders} order(s)</div>
                                <div className="growth">{getOrdersLabel()}</div>
                                <ResponsiveContainer width="100%" height={150}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12 }}
                                            tickLine={false}
                                            padding={{ left: 10, right: 10 }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            tickLine={false}
                                            domain={['auto', 'auto']}
                                            allowDecimals={false}
                                            label={{ value: 'Orders', angle: -90, position: 'insideLeft', fontSize: 14 }}
                                        />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#82ca9d"
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                        </div>
                        <br />
                        <div className="charts">

                            {/* High sales items */}
                            <div className="chart">
                                <div className="chart-header">
                                    <h3>Top Ordered Items</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={350}>
                                    {topItemsData.length > 0 ? (
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={topItemsData}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="itemName" />
                                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                                            <Radar
                                                name="Orders"
                                                dataKey="orders"
                                                stroke="#8884d8"
                                                fill="#8884d8"
                                                fillOpacity={0.6}
                                            />
                                            <Tooltip />
                                        </RadarChart>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: 30, color: '#666' }}>
                                            No data to display
                                        </div>
                                    )}
                                </ResponsiveContainer>
                            </div>



                            {/* Order Sales Chart */}
                            <div className="chart">
                                <div className="chart-header">
                                    <h3>Order sales</h3>
                                    <input type="date" />
                                </div>
                                <div className="amount">#{totalOrders} order(s)</div>
                                <div className="growth">{getOrdersLabel()}</div>
                                <ResponsiveContainer width="100%" height={150}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12 }}
                                            tickLine={false}
                                            padding={{ left: 10, right: 10 }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            tickLine={false}
                                            domain={['auto', 'auto']}
                                            allowDecimals={false}
                                            label={{ value: 'Orders', angle: -90, position: 'insideLeft', fontSize: 14 }}
                                        />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#82ca9d"
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                        </div>
                        <br />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashBoardPage;


// DashboardPage .jsx
//
//
//
//
// /////////////////////

// import React, { useEffect, useState, useRef } from 'react';
// import { FaHamburger } from "react-icons/fa";
// import { RiMoneyRupeeCircleLine } from "react-icons/ri";
// import { PiHamburgerThin } from "react-icons/pi";
// import { useTheme } from "../ThemeChangerComponent/ThemeProvider";
// import { MdDeliveryDining } from "react-icons/md";
// import { BsPersonCheck } from "react-icons/bs";
// import { MdOutlineTableBar } from "react-icons/md";
// import { GoPackageDependents } from "react-icons/go";
// import { MdOutlineSoupKitchen } from "react-icons/md";
// import { TbToolsKitchen3 } from "react-icons/tb";
// import {
//     ScatterChart, Scatter,
//     BarChart, Bar,
//     XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
// } from 'recharts';

// import { useNavigate, useParams } from 'react-router-dom';
// import axios from 'axios';

// const DashBoardPage = () => {
//     const nav = useNavigate();
//     const { clientId } = useParams();
//     const { darkMode } = useTheme();

//     const dropdownRef = useRef(null);
//     const [showDropdown, setShowDropdown] = useState(false);

//     const [totalOrders, setTotalOrders] = useState(0);
//     const [pendingOrders, setPendingOrders] = useState(0);
//     const [totalEarnings, setTotalEarnings] = useState(0);
//     const [totalCustomers, setTotalCustomers] = useState(0);
//     const [newOrders, setNewOrders] = useState(0);
//     const [preparingOrders, setPreparingOrders] = useState(0);
//     const [servedOrders, setServedOrders] = useState(0);
//     const [chartData, setChartData] = useState([]);
//     const [timeFilter, setTimeFilter] = useState("Daily");
//     const [mounted, setMounted] = useState(false);
//     const token = localStorage.getItem("access_token");

//     // Chart type states limited to Bar and Scatter charts for stability
//     const [salesChartType, setSalesChartType] = useState("bar");
//     const [ordersChartType, setOrdersChartType] = useState("bar");

//     useEffect(() => {
//         if (mounted) {
//             setMounted(true);
//         }

//     }, []);

//     useEffect(() => {
//         const body = document.body;
//         if (darkMode) {
//             body.classList.add("theme-dark");
//         } else {
//             body.classList.remove("theme-dark");
//         }
//     }, [darkMode]);

//     useEffect(() => {
//         const handleClickOutside = (e) => {
//             if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//                 setShowDropdown(false);
//             }
//         };
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     const handleAvatarClick = () => setShowDropdown(!showDropdown);
//     const handleUpdateProfile = () => {
//         setShowDropdown(false);
//         nav('/update-profile');
//     };
//     const handleLogout = () => {
//         setShowDropdown(false);
//         localStorage.clear();
//         nav('/login');
//     };
//     function settings() {
//         nav('/settings');
//     }

//     useEffect(() => {
//         const fetchStats = async () => {
//             if (!token || !clientId) return;

//             try {
//                 const res = await axios.get(`http://localhost:8003/saas/${clientId}/dinein/table`, {
//                     headers: { Authorization: `Bearer ${token}` }
//                 });

//                 const allOrders = res.data?.data || [];
//                 const startDate = getStartDate(timeFilter);
//                 const filteredOrders = allOrders.filter(o => new Date(o.created_at) >= startDate);

//                 setTotalOrders(filteredOrders.length);
//                 setPendingOrders(filteredOrders.filter(o => o.status === "pending" || o.status === "preparing").length);
//                 setTotalEarnings(Math.round(filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)));
//                 setTotalCustomers(filteredOrders.length);
//                 setNewOrders(filteredOrders.filter(o => o.status === "new").length);
//                 setPreparingOrders(filteredOrders.filter(o => o.status === "preparing").length);
//                 setServedOrders(filteredOrders.filter(o => o.status === "served").length);

//                 const ordersByDate = {};
//                 filteredOrders.forEach(order => {
//                     const dateObj = new Date(order.created_at);
//                     const date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//                     if (!ordersByDate[date]) {
//                         ordersByDate[date] = { date, sales: 0, count: 0 };
//                     }
//                     ordersByDate[date].sales += parseFloat(order.total_price) || 0;
//                     ordersByDate[date].count += 1;
//                 });

//                 const sortedData = Object.values(ordersByDate).sort((a, b) =>
//                     new Date(a.date + ", " + new Date().getFullYear()) - new Date(b.date + ", " + new Date().getFullYear())
//                 );

//                 setChartData(sortedData);
//             } catch (err) {
//                 console.error("❌ Failed to fetch dashboard stats:", err);
//             }
//         };

//         fetchStats();
//     }, [clientId, timeFilter, token]);

//     const getStartDate = (filter) => {
//         const now = new Date();
//         switch (filter) {
//             case "Daily": return new Date(now.setHours(0, 0, 0, 0));
//             case "Weekly": return new Date(now.setDate(now.getDate() - 7));
//             case "Monthly": return new Date(now.setMonth(now.getMonth() - 1));
//             case "Quarterly": return new Date(now.setMonth(now.getMonth() - 3));
//             case "Half Yearly": return new Date(now.setMonth(now.getMonth() - 6));
//             case "Yearly": return new Date(now.setFullYear(now.getFullYear() - 1));
//             default: return new Date(now.setHours(0, 0, 0, 0));
//         }
//     };

//     return (
//         <div className="Dashboard-container">
//             <div className="dashboard">
//                 <main className="main">
//                     <div className="main-content">

//                         <div className="main-title">
//                             <h2>Dashboard</h2>
//                             <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
//                                 <option value="Daily">Daily</option>
//                                 <option value="Weekly">Weekly</option>
//                                 <option value="Monthly">Monthly</option>
//                                 <option value="Quarterly">Quarterly</option>
//                                 <option value="Half Yearly">Half Yearly</option>
//                                 <option value="Yearly">Yearly</option>
//                             </select>
//                         </div>

//                         <div className="grid-layout">
//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><FaHamburger /></div>
//                                 <div className="card-values">
//                                     <div className="value">{totalOrders}</div>
//                                     <div className="title">Total Orders</div>
//                                 </div>
//                                 <div className="sub">Active: {totalOrders}</div>
//                             </div>

//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><PiHamburgerThin /></div>
//                                 <div>
//                                     <div className="value">{pendingOrders}</div>
//                                     <div className="title">Pending Orders</div>
//                                 </div>
//                                 <div className="sub">Active: {pendingOrders}</div>
//                             </div>

//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><RiMoneyRupeeCircleLine /></div>
//                                 <div>
//                                     <div className="value">₹{totalEarnings}</div>
//                                     <div className="title">Total Earnings</div>
//                                 </div>
//                                 <div className="sub">Bill</div>
//                             </div>

//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><BsPersonCheck /></div>
//                                 <div>
//                                     <div className="value">{totalCustomers}</div>
//                                     <div className="title">Customers</div>
//                                 </div>
//                                 <div className="sub">Active: {totalCustomers}</div>
//                             </div>

//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><MdOutlineTableBar /></div>
//                                 <div>
//                                     <div className="value">{newOrders}</div>
//                                     <div className="title">New</div>
//                                 </div>
//                                 <div className="sub">Active: {newOrders}</div>
//                             </div>

//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><MdOutlineSoupKitchen /></div>
//                                 <div>
//                                     <div className="value">{preparingOrders}</div>
//                                     <div className="title">Preparing</div>
//                                 </div>
//                                 <div className="sub">Active: {preparingOrders}</div>
//                             </div>

//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><TbToolsKitchen3 /></div>
//                                 <div>
//                                     <div className="value">{servedOrders}</div>
//                                     <div className="title">Served</div>
//                                 </div>
//                                 <div className="sub">Active: {servedOrders}</div>
//                             </div>

//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><GoPackageDependents /></div>
//                                 <div>
//                                     <div className="value">0</div>
//                                     <div className="title">Take away</div>
//                                 </div>
//                                 <div className="sub">Active:0(under progress)</div>
//                             </div>

//                             <div className="grids dash-cards">
//                                 <div className="card-icons"><MdDeliveryDining /></div>
//                                 <div>
//                                     <div className="value">0</div>
//                                     <div className="title">Delivery</div>
//                                 </div>
//                                 <div className="sub">Active:0(under progress)</div>
//                             </div>
//                         </div>

//                         <div className="charts">

//                             {/* Sales Value Chart */}
//                             <div className="chart">
//                                 <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                                     <h3>Sales value</h3>
//                                     <select value={salesChartType} onChange={e => setSalesChartType(e.target.value)}>
//                                         <option value="bar">Bar Chart</option>
//                                         <option value="scatter">Scatter Chart</option>
//                                     </select>
//                                 </div>

//                                 <div style={{ width: '100%', height: 200 }}>
//                                     {mounted && chartData.length > 0 ? (
//                                         <ResponsiveContainer>
//                                             {salesChartType === 'bar' && (
//                                                 <BarChart data={chartData}>
//                                                     <CartesianGrid strokeDasharray="3 3" />
//                                                     <XAxis dataKey="date" tick={{ fontSize: 12 }} />
//                                                     <YAxis tick={{ fontSize: 12 }} allowDecimals={false} label={{ value: 'Profit', angle: -90, position: 'insideLeft', fontSize: 14 }} />
//                                                     <Tooltip formatter={value => `₹${value}`} />
//                                                     <Bar dataKey="sales" fill="#8884d8" />
//                                                 </BarChart>
//                                             )}
//                                             {salesChartType === 'scatter' && (
//                                                 <ScatterChart>
//                                                     <CartesianGrid />
//                                                     <XAxis dataKey="date" type="category" tick={{ fontSize: 12 }} />
//                                                     <YAxis dataKey="sales" type="number" tick={{ fontSize: 12 }} label={{ value: 'Profit', angle: -90, position: 'insideLeft', fontSize: 14 }} />
//                                                     <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={value => `₹${value}`} />
//                                                     <Scatter name="Sales" data={chartData} fill="#8884d8" />
//                                                 </ScatterChart>
//                                             )}
//                                         </ResponsiveContainer>
//                                     ) : (
//                                         <div style={{ textAlign: 'center', padding: 30, color: '#666' }}>
//                                             No data to display
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>

//                             {/* Order Sales Chart */}
//                             <div className="chart">
//                                 <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                                     <h3>Order sales</h3>
//                                     <select value={ordersChartType} onChange={e => setOrdersChartType(e.target.value)}>
//                                         <option value="bar">Bar Chart</option>
//                                         <option value="scatter">Scatter Chart</option>
//                                     </select>
//                                 </div>
//                                 <div className="amount">₹{totalEarnings}</div>
//                                 <div className="growth">+5.1k this week</div>

//                                 <div style={{ width: '100%', height: 200 }}>
//                                     {mounted && chartData.length > 0 ? (
//                                         <ResponsiveContainer>
//                                             {ordersChartType === 'bar' && (
//                                                 <BarChart data={chartData}>
//                                                     <CartesianGrid strokeDasharray="3 3" />
//                                                     <XAxis dataKey="date" tick={{ fontSize: 12 }} />
//                                                     <YAxis tick={{ fontSize: 12 }} allowDecimals={false} label={{ value: 'Orders', angle: -90, position: 'insideLeft', fontSize: 14 }} />
//                                                     <Tooltip />
//                                                     <Bar dataKey="count" fill="#82ca9d" />
//                                                 </BarChart>
//                                             )}
//                                             {ordersChartType === 'scatter' && (
//                                                 <ScatterChart>
//                                                     <CartesianGrid />
//                                                     <XAxis dataKey="date" type="category" tick={{ fontSize: 12 }} />
//                                                     <YAxis dataKey="count" type="number" tick={{ fontSize: 12 }} label={{ value: 'Orders', angle: -90, position: 'insideLeft', fontSize: 14 }} />
//                                                     <Tooltip cursor={{ strokeDasharray: '3 3' }} />
//                                                     <Scatter name="Orders" data={chartData} fill="#82ca9d" />
//                                                 </ScatterChart>
//                                             )}
//                                         </ResponsiveContainer>
//                                     ) : (
//                                         <div style={{ textAlign: 'center', padding: 30, color: '#666' }}>
//                                             No data to display
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>

//                         </div>

//                     </div>
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default DashBoardPage;
