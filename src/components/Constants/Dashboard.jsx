import React, { useEffect, useState, useRef } from 'react';
import { FaHamburger } from "react-icons/fa";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { PiHamburgerThin } from "react-icons/pi";
// import { useTheme } from "../ThemeChangerComponent/ThemeProvider";
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
// import PopupNotification from '../Main_Components/Notification_Services_Components/Popup_Notifications';

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

  const [tableId, setTableId] = useState(null)
  useEffect(() => {
    if (tableId) {
      document.body.classList.add("sidebar-minimized");
    } else {
      document.body.classList.remove("sidebar-minimized");
    }
  }, [tableId]);
//   useEffect(() => {
//     const body = document.body;
//     if (darkMode) {
//       body.classList.add("theme-dark");
//     } else {
//       body.classList.remove("theme-dark");
//     }
//   }, [darkMode]);

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
        const response = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, {
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
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <main className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-serif italic">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Overview of orders, sales and kitchen activity</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Range</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xl">
              <FaHamburger />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">{totalOrders}</div>
              <div className="text-sm text-gray-500">Total Orders</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center text-xl">
              <PiHamburgerThin />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">{pendingOrders}</div>
              <div className="text-sm text-gray-500">Pending Orders</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl">
              <RiMoneyRupeeCircleLine />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">₹{totalEarnings}</div>
              <div className="text-sm text-gray-500">Total Earnings</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xl">
              <BsPersonCheck />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">{totalCustomers}</div>
              <div className="text-sm text-gray-500">Our Customers</div>
            </div>
          </div>

          {/* Second row of KPI cards */}
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center text-xl">
              <MdOutlineTableBar />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">{newOrders}</div>
              <div className="text-sm text-gray-500">New Orders</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-xl">
              <MdOutlineSoupKitchen />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">{preparingOrders}</div>
              <div className="text-sm text-gray-500">Preparing Orders</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center text-xl">
              <TbToolsKitchen3 />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">{servedOrders}</div>
              <div className="text-sm text-gray-500">Served Orders</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center text-xl">
              <GoPackageDependents />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">Under Progress</div>
              <div className="text-sm text-gray-500">Take away</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center text-xl">
              <MdDeliveryDining />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold">Under Progress</div>
              <div className="text-sm text-gray-500">Delivery</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Value Card */}
          <div className="bg-white rounded-xl shadow p-5 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Sales value</h3>
                <p className="text-sm text-gray-500 mt-1">{getSalesLabel()}</p>
              </div>
              <input className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" type="date" />
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold">₹{totalEarnings}</div>
                <div className="text-sm text-gray-500 mt-1">Total</div>
              </div>
              <div className="text-sm text-green-600 font-semibold">Growth</div>
            </div>

            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
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
                  />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Bar dataKey="sales" fill="#f97316" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Sales Card */}
          <div className="bg-white rounded-xl shadow p-5 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Order sales</h3>
                <p className="text-sm text-gray-500 mt-1">{getOrdersLabel()}</p>
              </div>
              <input className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" type="date" />
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold">#{totalOrders} order(s)</div>
                <div className="text-sm text-gray-500 mt-1">Total</div>
              </div>
              <div className="text-sm text-green-600 font-semibold">Trend</div>
            </div>

            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
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
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">\
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Top Ordered Items</h3>
            </div>

            <div className="mt-4 space-y-3">
              {topItemsData.length > 0 ? (
                topItemsData.map((it, idx) => (
                  <div key={it.itemName || idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <div className="font-medium">{it.itemName}</div>
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


          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Order sales</h3>
              <input className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" type="date" />
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">#{totalOrders} order(s)</div>
                <div className="text-sm text-gray-500 mt-1">{getOrdersLabel()}</div>
              </div>
              <div className="text-sm text-green-600 font-semibold">Trend</div>
            </div>

            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
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
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div> */}

      </main>

      {/* <PopupNotification /> */}
    </div>
  );
};

export default DashBoardPage;
