import React, { useEffect, useState } from "react";

const ExportOrdersButton = ({ clientId }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("served");
  const [orderCount, setOrderCount] = useState(null);

  const applyDateFilter = (range) => {
    const today = new Date();
    const end = today.toISOString().split("T")[0];

    let start = new Date();
    switch (range) {
      case "today":
        start = today;
        break;
      case "month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "6months":
        start.setMonth(start.getMonth() - 6);
        break;
      case "1year":
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start = null;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end);
  };

  const fetchOrderCount = async () => {
    if (!clientId) return;

    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/${clientId}/orders/count?${params.toString()}`
      );
      const data = await res.json();
      setOrderCount(data.count);
    } catch (err) {
      console.error("Failed to fetch count", err);
      setOrderCount(null);
    }
  };

  useEffect(() => {
    fetchOrderCount();
  }, [clientId, status, startDate, endDate]);

  const handleDownload = async () => {
    if (!clientId) {
      alert("Client ID required");
      return;
    }

    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/${clientId}/orders/export?${params.toString()}`
      );

      if (!response.ok) {
        alert("Export failed.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_${status}_${clientId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="border p-4 rounded-md mt-6 shadow-md max-w-xl">
      <h3 className="text-md font-semibold mb-2">📤 Export Orders to Excel</h3>

      <div className="flex flex-wrap gap-4 mb-2">
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border px-2 py-1 rounded w-40"
          >
            <option value="served">Served</option>
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Start Date</label>
          <input
            type="date"
            className="border px-2 py-1 rounded w-40"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">End Date</label>
          <input
            type="date"
            className="border px-2 py-1 rounded w-40"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-2">
        <button onClick={() => applyDateFilter("today")} className="text-xs border px-2 py-1 rounded">
          Today
        </button>
        <button onClick={() => applyDateFilter("month")} className="text-xs border px-2 py-1 rounded">
          This Month
        </button>
        <button onClick={() => applyDateFilter("6months")} className="text-xs border px-2 py-1 rounded">
          Last 6 Months
        </button>
        <button onClick={() => applyDateFilter("1year")} className="text-xs border px-2 py-1 rounded">
          Last 1 Year
        </button>
      </div>

      {orderCount !== null && (
        <div className="text-sm text-gray-700 mb-2">
          Matching Orders: <strong>{orderCount}</strong>
        </div>
      )}

      <button
        onClick={handleDownload}
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
      >
        ⬇ Download Excel
      </button>
    </div>
  );
};

export default ExportOrdersButton;
