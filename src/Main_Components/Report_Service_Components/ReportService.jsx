import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const baseURL = "http://localhost:8000/saas";

const ReportDashboard = () => {
  const { clientId } = useParams(); // ✅ comes from route param
  const [accessToken, setAccessToken] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [totalOrders, setTotalOrders] = useState("-");
  const [todayOrders, setTodayOrders] = useState("-");
  const [lastUpdated, setLastUpdated] = useState("-");

  // 📥 Generate Order Report
  const generateReport = async () => {
    if (!clientId || !accessToken) {
      alert("Please enter both Client ID and Access Token");
      return;
    }

    const url = `${baseURL}/${clientId}/reports/orders?client_id=${clientId}${
      dateRange ? `&date_range=${dateRange}` : ""
    }`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to generate report: ${err}`);
      }

      const blob = await res.blob();
      const downloadURL = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadURL;
      link.download = `order_report_${clientId}_${dateRange || "all"}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert("✅ Report downloaded!");
    } catch (err) {
      alert(err.message);
    }
  };

  // 📊 Load Dashboard
  const loadDashboard = async () => {
    if (!clientId || !accessToken) return;

    try {
      const url = `${baseURL}/${clientId}/reports/dashboard?client_id=${clientId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error("Dashboard fetch failed");

      const data = await res.json();

      setTotalOrders(data.data?.total_orders ?? "-");
      setTodayOrders(data.data?.today_orders ?? "-");
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Dashboard error:", err.message);
    }
  };

  // ⏱ Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadDashboard, 60000);
    const timeout = setTimeout(loadDashboard, 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [clientId, accessToken]);

  return (
    <div className="page">
      <div className="container">
        <h1 className="title">📊 Report Service Dashboard</h1>

        {/* Input Section */}
        <div className="card">
          <div className="form-group">
            <label>Access Token</label>
            <input
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Paste your JWT token here"
            />
          </div>
          <div className="form-group">
            <label>Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="">-- All Dates --</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_week">Last Week</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="last_year">Last Year</option>
              <option value="current_month">Current Month</option>
              <option value="current_year">Current Year</option>
            </select>
          </div>
          <button onClick={generateReport} className="btn">
            📥 Generate Order Report
          </button>
        </div>

        {/* Live Dashboard */}
        <div className="card">
          <h2 className="subtitle">📈 Live Dashboard</h2>
          <p>
            <strong>Total Orders:</strong> {totalOrders}
          </p>
          <p>
            <strong>Today's Orders:</strong> {todayOrders}
          </p>
          <p>
            <strong>Last Updated:</strong> {lastUpdated}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportDashboard;
