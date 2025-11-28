// import React, { useEffect, useState, useRef } from 'react';
// import { FaHamburger } from "react-icons/fa";
// import { RiMoneyRupeeCircleLine } from "react-icons/ri";
// import { PiHamburgerThin } from "react-icons/pi";
// // import { useTheme } from "../ThemeChangerComponent/ThemeProvider";
// import { MdDeliveryDining } from "react-icons/md";
// import { BsPersonCheck } from "react-icons/bs";
// import { MdOutlineTableBar } from "react-icons/md";
// import { GoPackageDependents } from "react-icons/go";
// import { MdOutlineSoupKitchen } from "react-icons/md";
// import { TbToolsKitchen3 } from "react-icons/tb"; 
// import {
//   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
// } from 'recharts';

// import { useNavigate, useParams } from 'react-router-dom';
// import axios from 'axios';
// // import PopupNotification from '../Main_Components/Notification_Services_Components/Popup_Notifications';

// const DashBoardPage = () => {
//   const nav = useNavigate();
//   const { clientId } = useParams();

//   const [showDropdown, setShowDropdown] = useState(false);
//   const dropdownRef = useRef(null);

//   const [totalOrders, setTotalOrders] = useState(0);
//   const [pendingOrders, setPendingOrders] = useState(0);
//   const [totalEarnings, setTotalEarnings] = useState(0);
//   const [totalCustomers, setTotalCustomers] = useState(0);
//   const [newOrders, setNewOrders] = useState(0);
//   const [preparingOrders, setPreparingOrders] = useState(0);
//   const [servedOrders, setServedOrders] = useState(0);
//   const [chartData, setChartData] = useState([]);
//   const [timeFilter, setTimeFilter] = useState("Daily");
//   const token = localStorage.getItem("access_token");
//   const [topItemsData, setTopItemsData] = useState([]);

//   const [tableId, setTableId] = useState(null)
//   useEffect(() => {
//     if (tableId) {
//       document.body.classList.add("sidebar-minimized");
//     } else {
//       document.body.classList.remove("sidebar-minimized");
//     }
//   }, [tableId]);
// //   useEffect(() => {
// //     const body = document.body;
// //     if (darkMode) {
// //       body.classList.add("theme-dark");
// //     } else {
// //       body.classList.remove("theme-dark");
// //     }
// //   }, [darkMode]);

//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setShowDropdown(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // ----------------------------------------------------- //

//   // Fetch and process top ordered items
//   useEffect(() => {
//     const fetchTopItems = async () => {
//       if (!clientId) return;
//       try {
//         const response = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });
//         const allOrders = response.data?.data || [];

//         // Aggregate orders by item name
//         const itemCounts = {};
//         allOrders.forEach(order => {
//           if (!order.items) return; // safeguard if no items array
//           order.items.forEach(item => {
//             const name = item.name || item.itemName || "Unknown";
//             const quantity = item.quantity ? parseInt(item.quantity, 10) : 1;
//             if (!itemCounts[name]) {
//               itemCounts[name] = 0;
//             }
//             itemCounts[name] += quantity;
//           });
//         });

//         // Convert to array and sort descending by quantity
//         const sortedItems = Object.entries(itemCounts)
//           .map(([itemName, orders]) => ({ itemName, orders }))
//           .sort((a, b) => b.orders - a.orders);

//         // Pick top 5 items
//         const topFiveItems = sortedItems.slice(0, 5);

//         setTopItemsData(topFiveItems);

//       } catch (error) {
//         console.error("Failed to fetch top ordered items:", error);
//       }
//     };

//     fetchTopItems();
//   }, [clientId]);

//   // ----------------------------------------------------- //

//   useEffect(() => {
//     const fetchStats = async () => {
//       if (!token || !clientId) return;

//       try {
//         const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });

//         const allOrders = res.data?.data || [];
//         const startDate = getStartDate(timeFilter);
//         const filteredOrders = allOrders.filter(o => new Date(o.created_at) >= startDate);

//         setTotalOrders(filteredOrders.length);
//         setPendingOrders(filteredOrders.filter(o => o.status === "pending" || o.status === "preparing").length);
//         setTotalEarnings(Math.round(filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)));
//         setTotalCustomers(filteredOrders.length);
//         setNewOrders(filteredOrders.filter(o => o.status === "new").length);
//         setPreparingOrders(filteredOrders.filter(o => o.status === "preparing").length);
//         setServedOrders(filteredOrders.filter(o => o.status === "served").length);

//         // Group orders by hour for daily, else group by day
//         const ordersByGroup = {};
//         filteredOrders.forEach(order => {
//           const dateObj = new Date(order.created_at);

//           let groupKey;
//           if (timeFilter === 'Daily') {
//             // Format hour label e.g. "9 AM"
//             const hour = dateObj.getHours();
//             groupKey = `${hour}:00`;
//           } else {
//             // Format date label e.g. "Jul 12"
//             groupKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//           }

//           if (!ordersByGroup[groupKey]) {
//             ordersByGroup[groupKey] = { date: groupKey, sales: 0, count: 0 };
//           }
//           ordersByGroup[groupKey].sales += parseFloat(order.total_price) || 0;
//           ordersByGroup[groupKey].count += 1;
//         });

//         // Sort keys properly: hours numeric order for daily, date order for others
//         let sortedData;
//         if (timeFilter === 'Daily') {
//           sortedData = Object.values(ordersByGroup).sort((a, b) => {
//             return parseInt(a.date) - parseInt(b.date);
//           });
//         } else {
//           sortedData = Object.values(ordersByGroup).sort((a, b) => {
//             return new Date(a.date + ", " + new Date().getFullYear()) - new Date(b.date + ", " + new Date().getFullYear());
//           });
//         }

//         setChartData(sortedData);

//       } catch (err) {
//         console.error("❌ Failed to fetch dashboard stats:", err);
//       }
//     };


//     fetchStats();
//   }, [clientId, timeFilter, token]);

//   const getStartDate = (filter) => {
//     const now = new Date();
//     switch (filter) {
//       case "Daily":
//         return new Date(now.setHours(0, 0, 0, 0));
//       case "Weekly":
//         return new Date(now.setDate(now.getDate() - 7));
//       case "Monthly":
//         return new Date(now.setMonth(now.getMonth() - 1));
//       case "Quarterly":
//         return new Date(now.setMonth(now.getMonth() - 3));
//       case "Half Yearly":
//         return new Date(now.setMonth(now.getMonth() - 6));
//       case "Yearly":
//         return new Date(now.setFullYear(now.getFullYear() - 1));
//       default:
//         return new Date(now.setHours(0, 0, 0, 0));
//     }
//   };
//   const getSalesLabel = () => {
//     switch (timeFilter) {
//       case "Daily":
//         return "Sales today";
//       case "Weekly":
//         return "Sales this week";
//       case "Monthly":
//         return "Sales this month";
//       case "Quarterly":
//         return "Sales this quarter";
//       case "Half Yearly":
//         return "Sales last 6 months";
//       case "Yearly":
//         return "Sales this year";
//       default:
//         return "Sales";
//     }
//   };

//   const getOrdersLabel = () => {
//     switch (timeFilter) {
//       case "Daily":
//         return "Orders today";
//       case "Weekly":
//         return "Orders this week";
//       case "Monthly":
//         return "Orders this month";
//       case "Quarterly":
//         return "Orders this quarter";
//       case "Half Yearly":
//         return "Orders last 6 months";
//       case "Yearly":
//         return "Orders this year";
//       default:
//         return "Orders";
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
//       <main className="max-w-7xl mx-auto space-y-6">

//         {/* Header */}
//         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
//           <div>
//             <h1 className="text-3xl lg:text-4xl font-serif italic">Dashboard</h1>
//             <p className="text-sm text-gray-600 mt-1">Overview of orders, sales and kitchen activity</p>
//           </div>

//           <div className="flex items-center gap-3">
//             <label className="text-sm text-gray-700">Range</label>
//             <select
//               value={timeFilter}
//               onChange={(e) => setTimeFilter(e.target.value)}
//               className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
//             >
//               <option value="Daily">Daily</option>
//               <option value="Weekly">Weekly</option>
//               <option value="Monthly">Monthly</option>
//               <option value="Quarterly">Quarterly</option>
//               <option value="Half Yearly">Half Yearly</option>
//               <option value="Yearly">Yearly</option>
//             </select>
//           </div>
//         </div>

//         {/* KPI Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xl">
//               <FaHamburger />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">{totalOrders}</div>
//               <div className="text-sm text-gray-500">Total Orders</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center text-xl">
//               <PiHamburgerThin />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">{pendingOrders}</div>
//               <div className="text-sm text-gray-500">Pending Orders</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl">
//               <RiMoneyRupeeCircleLine />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">₹{totalEarnings}</div>
//               <div className="text-sm text-gray-500">Total Earnings</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xl">
//               <BsPersonCheck />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">{totalCustomers}</div>
//               <div className="text-sm text-gray-500">Our Customers</div>
//             </div>
//           </div>

//           {/* Second row of KPI cards */}
//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center text-xl">
//               <MdOutlineTableBar />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">{newOrders}</div>
//               <div className="text-sm text-gray-500">New Orders</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-xl">
//               <MdOutlineSoupKitchen />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">{preparingOrders}</div>
//               <div className="text-sm text-gray-500">Preparing Orders</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center text-xl">
//               <TbToolsKitchen3 />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">{servedOrders}</div>
//               <div className="text-sm text-gray-500">Served Orders</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center text-xl">
//               <GoPackageDependents />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">Under Progress</div>
//               <div className="text-sm text-gray-500">Take away</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
//             <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center text-xl">
//               <MdDeliveryDining />
//             </div>
//             <div className="flex-1">
//               <div className="text-2xl font-semibold">Under Progress</div>
//               <div className="text-sm text-gray-500">Delivery</div>
//             </div>
//           </div>
//         </div>

//         {/* Charts Section */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Sales Value Card */}
//           <div className="bg-white rounded-xl shadow p-5 flex flex-col">
//             <div className="flex items-center justify-between">
//               <div>
//                 <h3 className="text-lg font-semibold">Sales value</h3>
//                 <p className="text-sm text-gray-500 mt-1">{getSalesLabel()}</p>
//               </div>
//               <input className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" type="date" />
//             </div>

//             <div className="mt-4 flex items-end justify-between">
//               <div>
//                 <div className="text-3xl font-bold">₹{totalEarnings}</div>
//                 <div className="text-sm text-gray-500 mt-1">Total</div>
//               </div>
//               <div className="text-sm text-green-600 font-semibold">Growth</div>
//             </div>

//             <div className="mt-4 h-40">
//               <ResponsiveContainer width="100%" height="100%">
//                 <BarChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis
//                     dataKey="date"
//                     tick={{ fontSize: 12 }}
//                     tickLine={false}
//                     padding={{ left: 10, right: 10 }}
//                   />
//                   <YAxis
//                     tick={{ fontSize: 12 }}
//                     tickLine={false}
//                     domain={['auto', 'auto']}
//                     allowDecimals={false}
//                   />
//                   <Tooltip formatter={(value) => `₹${value}`} />
//                   <Bar dataKey="sales" fill="#f97316" radius={[6,6,0,0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           </div>

//           {/* Order Sales Card */}
//           <div className="bg-white rounded-xl shadow p-5 flex flex-col">
//             <div className="flex items-center justify-between">
//               <div>
//                 <h3 className="text-lg font-semibold">Order sales</h3>
//                 <p className="text-sm text-gray-500 mt-1">{getOrdersLabel()}</p>
//               </div>
//               <input className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" type="date" />
//             </div>

//             <div className="mt-4 flex items-end justify-between">
//               <div>
//                 <div className="text-3xl font-bold">#{totalOrders} order(s)</div>
//                 <div className="text-sm text-gray-500 mt-1">Total</div>
//               </div>
//               <div className="text-sm text-green-600 font-semibold">Trend</div>
//             </div>

//             <div className="mt-4 h-40">
//               <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis
//                     dataKey="date"
//                     tick={{ fontSize: 12 }}
//                     tickLine={false}
//                     padding={{ left: 10, right: 10 }}
//                   />
//                   <YAxis
//                     tick={{ fontSize: 12 }}
//                     tickLine={false}
//                     domain={['auto', 'auto']}
//                     allowDecimals={false}
//                   />
//                   <Tooltip />
//                   <Line
//                     type="monotone"
//                     dataKey="count"
//                     stroke="#f97316"
//                     strokeWidth={2}
//                     dot={{ r: 3 }}
//                     activeDot={{ r: 6 }}
//                   />
//                 </LineChart>
//               </ResponsiveContainer>
//             </div>
//           </div>
//         </div>

//         {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">\
//           <div className="bg-white rounded-xl shadow p-5">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-semibold">Top Ordered Items</h3>
//             </div>

//             <div className="mt-4 space-y-3">
//               {topItemsData.length > 0 ? (
//                 topItemsData.map((it, idx) => (
//                   <div key={it.itemName || idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
//                     <div>
//                       <div className="font-medium">{it.itemName}</div>
//                       <div className="text-xs text-gray-500">Orders: {it.orders}</div>
//                     </div>
//                     <div className="text-sm font-semibold text-orange-500">{it.orders}</div>
//                   </div>
//                 ))
//               ) : (
//                 <div className="text-center text-gray-500 py-8">No data to display</div>
//               )}
//             </div>
//           </div>


//           <div className="bg-white rounded-xl shadow p-5">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-semibold">Order sales</h3>
//               <input className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" type="date" />
//             </div>

//             <div className="mt-4 flex items-end justify-between">
//               <div>
//                 <div className="text-2xl font-bold">#{totalOrders} order(s)</div>
//                 <div className="text-sm text-gray-500 mt-1">{getOrdersLabel()}</div>
//               </div>
//               <div className="text-sm text-green-600 font-semibold">Trend</div>
//             </div>

//             <div className="mt-4 h-40">
//               <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis
//                     dataKey="date"
//                     tick={{ fontSize: 12 }}
//                     tickLine={false}
//                     padding={{ left: 10, right: 10 }}
//                   />
//                   <YAxis
//                     tick={{ fontSize: 12 }}
//                     tickLine={false}
//                     domain={['auto', 'auto']}
//                     allowDecimals={false}
//                   />
//                   <Tooltip />
//                   <Line
//                     type="monotone"
//                     dataKey="count"
//                     stroke="#f97316"
//                     strokeWidth={2}
//                     dot={{ r: 3 }}
//                     activeDot={{ r: 6 }}
//                   />
//                 </LineChart>
//               </ResponsiveContainer>
//             </div>
//           </div>
//         </div> */}

//       </main>

//       {/* <PopupNotification /> */}
//     </div>
//   );
// };

// export default DashBoardPage;


import React, { useEffect, useState, useRef } from 'react';
import { FaHamburger } from "react-icons/fa";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { PiHamburgerThin } from "react-icons/pi";
import { MdDeliveryDining } from "react-icons/md";
import { BsPersonCheck } from "react-icons/bs";
import { MdOutlineTableBar } from "react-icons/md";
import { GoPackageDependents } from "react-icons/go";
import { MdOutlineSoupKitchen } from "react-icons/md";
import { TbToolsKitchen3 } from "react-icons/tb";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../../../tailwind.config";

const fullConfig = resolveConfig(tailwindConfig);
const ACTION_PRIMARY = fullConfig.theme.colors.action.primary;


/*
  Redesigned Dashboard (white + orange theme)
  - Keeps your original logic & axios calls (option 1)
  - Improved layout, spacing, typography and additional visual components
  - Uses existing `chartData` and `topItemsData` from your original effects
*/

const KPICard = ({ icon, bg, value, label, accent }) => (
  <div className="bg-bg-primary rounded-2xl shadow-sm p-4 flex items-center gap-4 border border-transparent hover:shadow-lg transition-shadow duration-200">
    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${bg} text-orange-600 text-2xl`}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-2xl font-semibold text-gray-800">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
    {accent && <div className="text-sm font-medium text-orange-500">{accent}</div>}
  </div>
);

const SmallStat = ({ title, value }) => (
  <div className="bg-bg-primary rounded-lg p-3 text-center shadow-sm">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-lg font-semibold text-gray-800">{value}</div>
  </div>
);

const COLORS = ["#fb923c", "#f97316", "#fb7185", "#34d399", "#60a5fa"];

const DashBoardPage = () => {
  const nav = useNavigate();
  const { clientId } = useParams();

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

  const [tableId, setTableId] = useState(null);
  useEffect(() => {
    if (tableId) {
      document.body.classList.add("sidebar-minimized");
    } else {
      document.body.classList.remove("sidebar-minimized");
    }
  }, [tableId]);

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
  // Fetch and process top ordered items (kept as-is)
  useEffect(() => {
    const fetchTopItems = async () => {
      if (!clientId) return;
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allOrders = response.data?.data || [];

        const itemCounts = {};
        allOrders.forEach(order => {
          if (!order.items) return;
          order.items.forEach(item => {
            const name = item.name || item.itemName || "Unknown";
            const quantity = item.quantity ? parseInt(item.quantity, 10) : 1;
            if (!itemCounts[name]) {
              itemCounts[name] = 0;
            }
            itemCounts[name] += quantity;
          });
        });

        const sortedItems = Object.entries(itemCounts)
          .map(([itemName, orders]) => ({ itemName, orders }))
          .sort((a, b) => b.orders - a.orders);

        const topFiveItems = sortedItems.slice(0, 5);

        setTopItemsData(topFiveItems);

      } catch (error) {
        console.error("Failed to fetch top ordered items:", error);
      }
    };

    fetchTopItems();
  }, [clientId]);

  // ----------------------------------------------------- //
  // Fetch stats (kept as-is)
  useEffect(() => {
    const fetchStats = async () => {
      if (!token || !clientId) return;

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
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

        const ordersByGroup = {};
        filteredOrders.forEach(order => {
          const dateObj = new Date(order.created_at);

          let groupKey;
          if (timeFilter === 'Daily') {
            const hour = dateObj.getHours();
            groupKey = `${hour}:00`;
          } else {
            groupKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }

          if (!ordersByGroup[groupKey]) {
            ordersByGroup[groupKey] = { date: groupKey, sales: 0, count: 0 };
          }
          ordersByGroup[groupKey].sales += parseFloat(order.total_price) || 0;
          ordersByGroup[groupKey].count += 1;
        });

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

  // Derived pie data from your status counters (keeps logic local)
  const statusPieData = [
    { name: 'New', value: newOrders },
    { name: 'Preparing', value: preparingOrders },
    { name: 'Pending', value: pendingOrders },
    { name: 'Served', value: servedOrders },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <main className="max-w-7xl mx-auto space-y-8">

        {/* Top header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Clean overview of orders, sales and kitchen performance</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <SmallStat title={getSalesLabel()} value={`₹${totalEarnings}`} />
              <SmallStat title={getOrdersLabel()} value={`${totalOrders} orders`} />
            </div>

            <label className="text-sm text-gray-700">Range</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half Yearly">Half Yearly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard icon={<FaHamburger />} bg="bg-cardBackgrounds-bg1" value={totalOrders} label="Total Orders" accent={null} />
          <KPICard icon={<PiHamburgerThin />} bg="bg-cardBackgrounds-bg2" value={pendingOrders} label="Pending Orders" accent={null} />
          <KPICard icon={<RiMoneyRupeeCircleLine />} bg="bg-cardBackgrounds-bg1" value={`₹${totalEarnings}`} label="Total Earnings" accent="Updated" />
          <KPICard icon={<BsPersonCheck />} bg="bg-cardBackgrounds-bg3" value={totalCustomers} label="Customers" accent={null} />

          <KPICard icon={<MdOutlineTableBar />} bg="bg-cardBackgrounds-bg4" value={newOrders} label="New Orders" />
          <KPICard icon={<MdOutlineSoupKitchen />} bg="bg-cardBackgrounds-bg5" value={preparingOrders} label="Preparing" />
          <KPICard icon={<TbToolsKitchen3 />} bg="bg-cardBackgrounds-bg6" value={servedOrders} label="Served" />
          <KPICard icon={<GoPackageDependents />} bg="bg-cardBackgrounds-bg7" value={'—'} label="Takeaway" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Bar Chart */}
          <div className="col-span-2 bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Sales value</h3>
                <p className="text-sm text-gray-500 mt-1">{getSalesLabel()}</p>
              </div>
              <div className="flex items-center gap-2">
                <input className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" type="date" />
                <button className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm">Export</button>
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">₹{totalEarnings}</div>
                <div className="text-sm text-gray-500 mt-1">Total</div>
              </div>
              <div className="text-sm text-green-600 font-semibold">Growth</div>
            </div>

            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} padding={{ left: 10, right: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} domain={["auto", "auto"]} allowDecimals={false} />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Bar dataKey="sales" fill={ACTION_PRIMARY} radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Pie + Top Items */}
          <div className="bg-bg-primary rounded-2xl shadow p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Order Status</h3>
              <div className="text-sm text-gray-500">Realtime</div>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-4">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={28}>
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Top Items</h4>
                <div className="space-y-2">
                  {topItemsData.length > 0 ? (
                    topItemsData.map((it, idx) => (
                      <div key={it.itemName || idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div>
                          <div className="font-medium text-gray-800">{it.itemName}</div>
                          <div className="text-xs text-gray-500">Orders: {it.orders}</div>
                        </div>
                        <div className="text-sm font-semibold text-orange-500">{it.orders}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">No data to display</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Line chart + small widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-bg-primary rounded-2xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Order sales</h3>
                <p className="text-sm text-gray-500 mt-1">{getOrdersLabel()}</p>
              </div>
              <input className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" type="date" />
            </div>

            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} padding={{ left: 10, right: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} domain={["auto", "auto"]} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Quick Insights</h3>
            <div className="grid grid-cols-2 gap-3">
              <SmallStat title="New Orders" value={newOrders} />
              <SmallStat title="Preparing" value={preparingOrders} />
              <SmallStat title="Pending" value={pendingOrders} />
              <SmallStat title="Served" value={servedOrders} />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Occupancy</h4>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="h-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" style={{ width: `${Math.min(100, (totalOrders || 0) % 100)}%` }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-2">Current active tables: {totalOrders}</div>
            </div>

            <div className="flex gap-2 mt-2">
              <button className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200">Details</button>
              <button className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white">View Reports</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default DashBoardPage;



// import React, { useEffect, useState, useRef, useMemo } from 'react';
// import { FaHamburger } from "react-icons/fa";
// import { RiMoneyRupeeCircleLine } from "react-icons/ri";
// import { PiHamburgerThin } from "react-icons/pi";
// import { MdDeliveryDining } from "react-icons/md";
// import { BsPersonCheck } from "react-icons/bs";
// import { MdOutlineTableBar } from "react-icons/md";
// import { GoPackageDependents } from "react-icons/go";
// import { MdOutlineSoupKitchen } from "react-icons/md";
// import { TbToolsKitchen3 } from "react-icons/tb";
// import {
//   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
// } from 'recharts';

// import { useNavigate, useParams } from 'react-router-dom';
// import axios from 'axios';

// /*
//   Professional Dashboard — white + orange theme
//   - Keeps your original data logic (API calls and derived values) intact
//   - Adds a modern layout, refined KPIs, charts, table, and export/search utilities
//   - Tailwind-first styling, responsive, accessible
// */

// const COLORS = ["#ff7a00", "#ff9a3c", "#f97316", "#fb923c", "#ffb37a"];

// const IconCircle = ({ children, className = 'bg-orange-50 text-orange-600' }) => (
//   <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${className} shadow-sm`}>{children}</div>
// );

// const KPI = ({ title, value, sub, icon }) => (
//   <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-50">
//     <div className="flex items-start gap-4">
//       {icon}
//       <div className="flex-1">
//         <div className="text-xs text-gray-500">{title}</div>
//         <div className="text-xl font-semibold text-gray-900 mt-1">{value}</div>
//         {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
//       </div>
//     </div>
//   </div>
// );

// const TinyBadge = ({ children }) => (
//   <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-orange-50 text-orange-600 font-medium">{children}</span>
// );

// const formatCurrency = (v) => `₹${v.toLocaleString()}`;

// const DashBoardPage = () => {
//   const nav = useNavigate();
//   const { clientId } = useParams();

//   // states (kept from original)
//   const [totalOrders, setTotalOrders] = useState(0);
//   const [pendingOrders, setPendingOrders] = useState(0);
//   const [totalEarnings, setTotalEarnings] = useState(0);
//   const [totalCustomers, setTotalCustomers] = useState(0);
//   const [newOrders, setNewOrders] = useState(0);
//   const [preparingOrders, setPreparingOrders] = useState(0);
//   const [servedOrders, setServedOrders] = useState(0);
//   const [chartData, setChartData] = useState([]);
//   const [timeFilter, setTimeFilter] = useState('Daily');
//   const token = localStorage.getItem('access_token');
//   const [topItemsData, setTopItemsData] = useState([]);

//   const [query, setQuery] = useState('');
//   const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

//   useEffect(() => {
//     // top items fetch — same logic
//     const fetchTopItems = async () => {
//       if (!clientId) return;
//       try {
//         const response = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });
//         const allOrders = response.data?.data || [];

//         const itemCounts = {};
//         allOrders.forEach(order => {
//           if (!order.items) return;
//           order.items.forEach(item => {
//             const name = item.name || item.itemName || 'Unknown';
//             const quantity = item.quantity ? parseInt(item.quantity, 10) : 1;
//             if (!itemCounts[name]) itemCounts[name] = 0;
//             itemCounts[name] += quantity;
//           });
//         });

//         const sortedItems = Object.entries(itemCounts)
//           .map(([itemName, orders]) => ({ itemName, orders }))
//           .sort((a, b) => b.orders - a.orders)
//           .slice(0, 10);

//         setTopItemsData(sortedItems);
//       } catch (err) {
//         console.error('Top items fetch failed', err);
//       }
//     };

//     fetchTopItems();
//   }, [clientId]);

//   useEffect(() => {
//     const fetchStats = async () => {
//       if (!token || !clientId) return;
//       try {
//         const res = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });
//         const allOrders = res.data?.data || [];
//         const startDate = getStartDate(timeFilter);
//         const filteredOrders = allOrders.filter(o => new Date(o.created_at) >= startDate);

//         setTotalOrders(filteredOrders.length);
//         setPendingOrders(filteredOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length);
//         setTotalEarnings(Math.round(filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)));
//         setTotalCustomers(filteredOrders.length);
//         setNewOrders(filteredOrders.filter(o => o.status === 'new').length);
//         setPreparingOrders(filteredOrders.filter(o => o.status === 'preparing').length);
//         setServedOrders(filteredOrders.filter(o => o.status === 'served').length);

//         // prepare grouped chart data
//         const ordersByGroup = {};
//         filteredOrders.forEach(order => {
//           const dateObj = new Date(order.created_at);
//           let groupKey;
//           if (timeFilter === 'Daily') {
//             const hour = dateObj.getHours();
//             groupKey = `${hour}:00`;
//           } else {
//             groupKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//           }
//           if (!ordersByGroup[groupKey]) ordersByGroup[groupKey] = { date: groupKey, sales: 0, count: 0 };
//           ordersByGroup[groupKey].sales += parseFloat(order.total_price) || 0;
//           ordersByGroup[groupKey].count += 1;
//         });

//         let sortedData;
//         if (timeFilter === 'Daily') {
//           sortedData = Object.values(ordersByGroup).sort((a, b) => parseInt(a.date) - parseInt(b.date));
//         } else {
//           sortedData = Object.values(ordersByGroup).sort((a, b) => new Date(a.date + ', ' + new Date().getFullYear()) - new Date(b.date + ', ' + new Date().getFullYear()));
//         }
//         setChartData(sortedData);
//       } catch (err) {
//         console.error('Stats fetch failed', err);
//       }
//     };
//     fetchStats();
//   }, [clientId, timeFilter, token]);

//   const getStartDate = (filter) => {
//     const now = new Date();
//     switch (filter) {
//       case 'Daily': return new Date(now.setHours(0,0,0,0));
//       case 'Weekly': return new Date(now.setDate(now.getDate() - 7));
//       case 'Monthly': return new Date(now.setMonth(now.getMonth() - 1));
//       case 'Quarterly': return new Date(now.setMonth(now.getMonth() - 3));
//       case 'Half Yearly': return new Date(now.setMonth(now.getMonth() - 6));
//       case 'Yearly': return new Date(now.setFullYear(now.getFullYear() - 1));
//       default: return new Date(now.setHours(0,0,0,0));
//     }
//   };

//   // Pie data
//   const statusPieData = useMemo(() => ([
//     { name: 'New', value: newOrders },
//     { name: 'Preparing', value: preparingOrders },
//     { name: 'Pending', value: pendingOrders },
//     { name: 'Served', value: servedOrders },
//   ]), [newOrders, preparingOrders, pendingOrders, servedOrders]);

//   // Export CSV helper
//   const exportTopItemsCSV = () => {
//     const headers = ['Item', 'Orders'];
//     const rows = topItemsData.map(r => [r.itemName, r.orders]);
//     const csvContent = [headers, ...rows].map(e => e.join(',')).join('');
//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url; a.download = `top_items_${new Date().toISOString().slice(0,10)}.csv`; a.click();
//     URL.revokeObjectURL(url);
//   };

//   // filtered top items for search
//   const filteredTopItems = topItemsData.filter(t => t.itemName.toLowerCase().includes(query.toLowerCase()));

//   return (
//     <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
//       <main className="max-w-7xl mx-auto space-y-8">

//         {/* Header */}
//         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
//           <div>
//             <div className="flex items-center gap-3">
//               <div className="w-2.5 h-8 rounded bg-gradient-to-b from-orange-400 to-orange-600"></div>
//               <h1 className="text-3xl font-extrabold text-gray-900">Business Dashboard</h1>
//             </div>
//             <p className="text-sm text-gray-500 mt-1">Actionable metrics for operations — updated live from your orders</p>
//           </div>

//           <div className="flex items-center gap-3 w-full sm:w-auto">
//             <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100">
//               <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search top items..." className="outline-none text-sm" />
//               <button onClick={() => setQuery('')} className="text-sm text-gray-400">Clear</button>
//             </div>

//             <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-300">
//               <option value="Daily">Daily</option>
//               <option value="Weekly">Weekly</option>
//               <option value="Monthly">Monthly</option>
//               <option value="Quarterly">Quarterly</option>
//               <option value="Half Yearly">Half Yearly</option>
//               <option value="Yearly">Yearly</option>
//             </select>

//             <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-lg shadow" onClick={exportTopItemsCSV}>Export</button>
//           </div>
//         </div>

//         {/* KPI strip */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <KPI title="Total Orders" value={totalOrders} sub="All orders in period" icon={<IconCircle><FaHamburger /></IconCircle>} />
//           <KPI title="Pending / Preparing" value={`${pendingOrders} / ${preparingOrders}`} sub="Need attention" icon={<IconCircle className='bg-yellow-50 text-yellow-600'><PiHamburgerThin /></IconCircle>} />
//           <KPI title="Earnings" value={formatCurrency(totalEarnings)} sub="Gross sales" icon={<IconCircle className='bg-orange-50 text-orange-700'><RiMoneyRupeeCircleLine /></IconCircle>} />
//           <KPI title="Customers" value={totalCustomers} sub="Unique customers" icon={<IconCircle className='bg-indigo-50 text-indigo-600'><BsPersonCheck /></IconCircle>} />
//         </div>

//         {/* Main content: charts + side panel */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Sales (big) */}
//           <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
//             <div className="flex items-center justify-between">
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-800">Revenue & Orders</h3>
//                 <p className="text-sm text-gray-500 mt-0.5">{timeFilter === 'Daily' ? 'Hourly breakdown' : 'Period breakdown'}</p>
//               </div>
//               <div className="flex items-center gap-2">
//                 <TinyBadge>Live</TinyBadge>
//                 <div className="text-sm text-gray-500">Compare</div>
//               </div>
//             </div>

//             <div className="mt-4 flex items-center justify-between">
//               <div>
//                 <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalEarnings)}</div>
//                 <div className="text-sm text-gray-500 mt-1">Total sales in selected range</div>
//               </div>

//               <div className="space-y-1 text-right">
//                 <div className="text-sm text-gray-500">Orders</div>
//                 <div className="text-xl font-semibold">{totalOrders}</div>
//               </div>
//             </div>

//             <div className="mt-6 h-64">
//               <ResponsiveContainer width="100%" height="100%">
//                 <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
//                   <YAxis tickLine={false} />
//                   <Tooltip formatter={(val) => formatCurrency(Math.round(val))} />
//                   <Bar dataKey="sales" fill="#ff8a00" radius={[8,8,0,0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>

//             <div className="mt-4 grid grid-cols-3 gap-3">
//               <div className="bg-gray-50 rounded-lg p-3 text-center">
//                 <div className="text-xs text-gray-500">Avg order value</div>
//                 <div className="text-lg font-semibold">{totalOrders ? formatCurrency(Math.round(totalEarnings / totalOrders)) : '-'} </div>
//               </div>
//               <div className="bg-gray-50 rounded-lg p-3 text-center">
//                 <div className="text-xs text-gray-500">Conversion</div>
//                 <div className="text-lg font-semibold">{totalOrders ? `${Math.min(100, Math.round((totalOrders / Math.max(1, totalCustomers)) * 100))}%` : '-'}</div>
//               </div>
//               <div className="bg-gray-50 rounded-lg p-3 text-center">
//                 <div className="text-xs text-gray-500">Return rate</div>
//                 <div className="text-lg font-semibold">—</div>
//               </div>
//             </div>
//           </div>

//           {/* Right side: status pie + top items */}
//           <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 flex flex-col">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-semibold text-gray-800">Order status</h3>
//               <div className="text-sm text-gray-500">Snapshot</div>
//             </div>

//             <div className="mt-4 grid grid-cols-1 gap-4">
//               <div className="h-48">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <PieChart>
//                     <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} paddingAngle={2}>
//                       {statusPieData.map((entry, idx) => (
//                         <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
//                       ))}
//                     </Pie>
//                     <Legend verticalAlign="bottom" height={36} />
//                   </PieChart>
//                 </ResponsiveContainer>
//               </div>

//               <div>
//                 <div className="flex items-center justify-between mb-2">
//                   <div className="text-sm text-gray-500">Top ordered items</div>
//                   <div className="text-xs text-gray-400">Last 30 days</div>
//                 </div>

//                 <div className="space-y-2 max-h-52 overflow-auto">
//                   {filteredTopItems.length ? (
//                     filteredTopItems.map((it, i) => (
//                       <div key={it.itemName + i} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-gray-50">
//                         <div className="flex-1">
//                           <div className="font-medium text-gray-800">{it.itemName}</div>
//                           <div className="text-xs text-gray-400">Orders: {it.orders}</div>
//                         </div>
//                         <div className="w-20 text-right font-semibold text-orange-600">{it.orders}</div>
//                       </div>
//                     ))
//                   ) : (
//                     <div className="text-sm text-gray-400">No top items found</div>
//                   )}
//                 </div>

//                 <div className="mt-3 flex gap-2">
//                   <button onClick={exportTopItemsCSV} className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white">Export CSV</button>
//                   <button className="px-3 py-2 rounded-lg border border-gray-200">Details</button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Footer small widgets */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
//             <h4 className="text-sm font-medium text-gray-700">Kitchen load</h4>
//             <div className="mt-3 space-y-2">
//               <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
//                 <div className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" style={{ width: `${Math.min(100, (preparingOrders * 8))}%` }}></div>
//               </div>
//               <div className="text-xs text-gray-400">Preparing orders: {preparingOrders}</div>
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
//             <h4 className="text-sm font-medium text-gray-700">Delivery / Takeaway</h4>
//             <div className="mt-3 text-sm text-gray-500">Under progress / Delivery streams — monitor orders in transit</div>
//             <div className="mt-4 flex gap-2">
//               <button className="px-3 py-2 rounded-lg bg-white border border-gray-200">View map</button>
//               <button className="px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white">Manage</button>
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
//             <h4 className="text-sm font-medium text-gray-700">Quick actions</h4>
//             <div className="mt-3 grid grid-cols-3 gap-2">
//               <button className="px-2 py-2 text-xs rounded-lg bg-white border border-gray-200">New order</button>
//               <button className="px-2 py-2 text-xs rounded-lg bg-white border border-gray-200">Refund</button>
//               <button className="px-2 py-2 text-xs rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white">Reports</button>
//             </div>
//           </div>
//         </div>

//       </main>
//     </div>
//   );
// };

// export default DashBoardPage;