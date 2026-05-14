import React, { useEffect, useState, useMemo } from 'react';
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { FaHamburger } from "react-icons/fa";
import { PiHamburgerThin } from "react-icons/pi";
import { MdOutlineSoupKitchen } from "react-icons/md";
import { TbToolsKitchen3 } from "react-icons/tb";
import { GoPackageDependents } from "react-icons/go";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend,
} from 'recharts';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../../../tailwind.config";

const fullConfig = resolveConfig(tailwindConfig);
const ACTION_PRIMARY = fullConfig.theme.colors.action?.primary || "#f97316";

const PIE_COLORS = ["#a855f7", "#f59e0b", "#10b981"];
const ITEM_COLORS = ["#f97316", "#fb923c", "#fbbf24", "#34d399", "#60a5fa"];
const DINEIN_COLOR = "#f97316";
const TAKEAWAY_COLOR = "#8b5cf6";

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ label, sub }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-7 rounded-full bg-action-primary shrink-0" />
      <div>
        <h2 className="text-[15px] font-bold text-gray-900 leading-tight">{label}</h2>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Sales KPI card ───────────────────────────────────────────────────────────
function SalesKPI({ icon, value, label, sub }) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-orange-50 pointer-events-none" />
      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-action-primary text-xl relative z-10">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="text-[22px] font-extrabold text-gray-900 leading-none tracking-tight">{value}</div>
        <div className="text-sm font-medium text-gray-600 mt-1">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Ops stat card ────────────────────────────────────────────────────────────
function OpsCard({ icon, value, label, bg, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[20px] shrink-0 ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
      </div>
    </div>
  );
}

// ─── Split KPI card ───────────────────────────────────────────────────────────
function SplitKPI({ label, dinein, takeaway, icon, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-action-primary text-lg">{icon}</span>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 rounded-xl p-3">
          <div className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-1">Dine-in</div>
          <div className="text-lg font-extrabold text-gray-900">{dinein}</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <div className="text-[11px] font-bold text-purple-500 uppercase tracking-wider mb-1">Takeaway</div>
          <div className="text-lg font-extrabold text-gray-900">{takeaway}</div>
        </div>
      </div>
      {sub && <div className="text-xs text-gray-400 mt-2">{sub}</div>}
    </div>
  );
}

// ─── Tooltip shell ────────────────────────────────────────────────────────────
function TT({ children }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #f3f4f6", borderRadius: 12,
      padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    }}>
      {children}
    </div>
  );
}

function SalesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <TT>
      <p style={{ fontWeight: 600, color: "#374151", marginBottom: 2 }}>{label}</p>
      <p style={{ color: ACTION_PRIMARY, fontWeight: 700 }}>{fmt(payload[0].value)}</p>
    </TT>
  );
}

function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <TT>
      <p style={{ fontWeight: 600, color: "#374151", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#8b5cf6", fontWeight: 700 }}>{payload[0].value} orders</p>
    </TT>
  );
}

function SplitLineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <TT>
      <p style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 700, marginBottom: 2 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </TT>
  );
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TT>
      <p style={{ fontWeight: 600, color: "#374151", marginBottom: 2 }}>{d.fullName}</p>
      <p style={{ color: ACTION_PRIMARY, fontWeight: 700 }}>{d.orders} orders</p>
    </TT>
  );
}

// ─── Transaction row ───────────────────────────────────────────────────────────
function TxRow({ tx }) {
  const isOut = tx.movement_type === "OUT";
  const typeColors = {
    ORDER_DEDUCTION: "bg-blue-100 text-blue-700",
    STOCK_IN: "bg-green-100 text-green-700",
    ADJUSTMENT: "bg-yellow-100 text-yellow-700",
    WASTAGE: "bg-red-100 text-red-700",
    ITEM_CANCELLED: "bg-orange-100 text-orange-700",
    ORDER_CANCELLED: "bg-red-100 text-red-700",
    item_cancelled: "bg-orange-100 text-orange-700",
    wastage: "bg-red-100 text-red-700",
  };
  const typeKey = tx.transaction_type || tx.type || "";
  const colorClass = typeColors[typeKey] || "bg-gray-100 text-gray-600";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className={`w-2 h-2 rounded-full shrink-0 ${isOut ? "bg-red-400" : "bg-green-400"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-800 truncate">
          {tx.remarks || tx.item_name || typeKey || "Transaction"}
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          {tx.created_at ? new Date(tx.created_at).toLocaleString() : "—"}
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${colorClass}`}>
        {typeKey.replace(/_/g, " ")}
      </span>
      <span className={`text-sm font-bold shrink-0 ${isOut ? "text-red-500" : "text-green-600"}`}>
        {isOut ? "−" : "+"}{Number(tx.quantity || 0).toFixed(1)}
      </span>
    </div>
  );
}

// ─── Cancellation row ──────────────────────────────────────────────────────────
function CancelRow({ order }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-800">
          Order #{order.dinein_order_id || order.id}
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
          {order.table_id ? ` · Table ${order.table_id}` : ""}
        </div>
      </div>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
        Cancelled
      </span>
      <span className="text-sm font-bold text-red-500 shrink-0">
        {fmt(order.total_price || 0)}
      </span>
    </div>
  );
}

// ─── 2hr Sales card ────────────────────────────────────────────────────────────
function TwoHrSalesCard({
  dineinSales,
  takeawaySales,
  salesDuration,
  setSalesDuration
}) {
  const total = dineinSales + takeawaySales || 1;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="card-title">Sales Record</p>
          <p className="card-sub">Revenue based on selected timing</p>
        </div>

        <select
          value={salesDuration}
          onChange={(e) => setSalesDuration(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white outline-none"
        >
          <option value={1}>Last 1 Hour</option>
          <option value={2}>Last 2 Hours</option>
          <option value={3}>Last 3 Hours</option>
          <option value={4}>Last 4 Hours</option>
          <option value={5}>Last 5 Hours</option>
          <option value={6}>Last 6 Hours</option>
          <option value={12}>Last 12 Hours</option>
          <option value={24}>Last 24 Hours</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-orange-50 rounded-xl p-4">
          <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">
            Dine-in
          </div>

          <div className="text-2xl font-extrabold text-gray-900">
            {fmt(Math.round(dineinSales))}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            {pct(dineinSales, total)}% of total
          </div>

          <div className="prog-track mt-2">
            <div
              className="prog-fill"
              style={{
                width: `${pct(dineinSales, total)}%`,
                background: DINEIN_COLOR
              }}
            />
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4">
          <div className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">
            Takeaway
          </div>

          <div className="text-2xl font-extrabold text-gray-900">
            {fmt(Math.round(takeawaySales))}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            {pct(takeawaySales, total)}% of total
          </div>

          <div className="prog-track mt-2">
            <div
              className="prog-fill"
              style={{
                width: `${pct(takeawaySales, total)}%`,
                background: TAKEAWAY_COLOR
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-3">
        <span>Total Revenue</span>

        <span className="font-extrabold text-gray-900 text-base">
          {fmt(Math.round(dineinSales + takeawaySales))}
        </span>
      </div>
    </div>
  );
}
function InventoryInsightRow({ tx }) {

  const type = String(tx.transaction_type || "TRANSACTION");

  // auto-format label from DB value
  const formattedLabel = type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());

  // dynamic color generation
  const getTypeStyles = (value) => {

    const v = value.toLowerCase();

    if (v.includes("cancel")) {
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        dot: "bg-red-500",
      };
    }

    if (v.includes("wast")) {
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        dot: "bg-yellow-500",
      };
    }

    if (v.includes("stock") || v.includes("in")) {
      return {
        bg: "bg-green-100",
        text: "text-green-700",
        dot: "bg-green-500",
      };
    }

    if (v.includes("deduction") || v.includes("order")) {
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        dot: "bg-blue-500",
      };
    }

    return {
      bg: "bg-gray-100",
      text: "text-gray-700",
      dot: "bg-gray-400",
    };
  };

  const styles = getTypeStyles(type);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">

      <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${styles.dot}`} />

      <div className="flex-1 min-w-0">

        {/* header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">

          <div className="flex items-center gap-2 flex-wrap">

            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${styles.bg} ${styles.text}`}
            >
              {formattedLabel}
            </span>

            <span className="text-[10px] text-gray-400">
              {tx.created_at
                ? new Date(tx.created_at).toLocaleString()
                : "—"}
            </span>

          </div>

          <div className="text-xs font-bold text-gray-700">
            {Number(tx.quantity || 0).toFixed(2)}
            {tx.unit ? ` ${tx.unit}` : ""}
          </div>

        </div>

        {/* item name */}
        <div className="mt-1 text-xs font-semibold text-gray-800">
          {tx.name || "Inventory Item"}
        </div>

        {/* remarks */}
        {tx.remarks && (
          <div className="mt-1 text-[11px] text-gray-500 break-words leading-relaxed">
            {tx.remarks}
          </div>
        )}

      </div>
    </div>
  );
}
// ─── Main ─────────────────────────────────────────────────────────────────────
const DashBoardPage = () => {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  const [timeFilter, setTimeFilter] = useState("Daily");
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [preparingOrders, setPreparingOrders] = useState(0);
  const [servedOrders, setServedOrders] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [topItemsData, setTopItemsData] = useState([]);

  // Split dine-in / takeaway state
  const [dineinOrders, setDineinOrders] = useState(0);
  const [takeawayOrders, setTakeawayOrders] = useState(0);
  const [dineinSales, setDineinSales] = useState(0);
  const [takeawaySales, setTakeawaySales] = useState(0);
  const [dineinPending, setDineinPending] = useState(0);
  const [dineinPreparing, setDineinPreparing] = useState(0);
  const [dineinServed, setDineinServed] = useState(0);
  const [takeawayPending, setTakeawayPending] = useState(0);
  const [takeawayPreparing, setTakeawayPreparing] = useState(0);
  const [takeawayServed, setTakeawayServed] = useState(0);
  const [splitChartData, setSplitChartData] = useState([]);

  // Insights split
  const [topDineinItems, setTopDineinItems] = useState([]);
  const [topTakeawayItems, setTopTakeawayItems] = useState([]);

  // Timed sales
  const [salesDuration, setSalesDuration] = useState(2);

  const [twoHrDineinSales, setTwoHrDineinSales] = useState(0);
  const [twoHrTakeawaySales, setTwoHrTakeawaySales] = useState(0);
  // 2hr sales
  // const [twoHrDineinSales, setTwoHrDineinSales]     = useState(0);
  // const [twoHrTakeawaySales, setTwoHrTakeawaySales] = useState(0);

  // Cancellations & transactions
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [inventoryInsights, setInventoryInsights] = useState([]); const [loadingTx, setLoadingTx] = useState(false);
  const [txTab, setTxTab] = useState("cancellations"); // "cancellations" | "transactions"

  // Takeaway table IDs (loaded once)
  const [takeawayTableIds, setTakeawayTableIds] = useState(new Set());

  const getStartDate = (filter) => {
    const now = new Date();
    switch (filter) {
      case "Daily": return new Date(now.setHours(0, 0, 0, 0));
      case "Weekly": return new Date(now.setDate(now.getDate() - 7));
      case "Monthly": return new Date(now.setMonth(now.getMonth() - 1));
      case "Quarterly": return new Date(now.setMonth(now.getMonth() - 3));
      case "Half Yearly": return new Date(now.setMonth(now.getMonth() - 6));
      case "Yearly": return new Date(now.setFullYear(now.getFullYear() - 1));
      default: return new Date(now.setHours(0, 0, 0, 0));
    }
  };

  // ── Fetch takeaway table IDs ──────────────────────────────────────────────
  useEffect(() => {
    if (!clientId || !token) return;
    const run = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const takeawayRoots = (import.meta.env.VITE_EASYFOOD_TAKEAWAY_TABLE_DEFAULT_ROOT || "takeaway")
          .split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
        const ids = new Set(
          (res.data?.data || [])
            .filter(t => takeawayRoots.some(r => (t.name || "").toLowerCase().startsWith(r)))
            .map(t => String(t.id))
        );
        setTakeawayTableIds(ids);
      } catch (e) {
        console.error("Table fetch failed:", e);
      }
    };
    run();
  }, [clientId, token]);

  // ── Fetch top ordered items (split dine-in / takeaway) ───────────────────
  useEffect(() => {
    if (!clientId) return;
    const run = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const allOrders = res.data?.data || [];
        const dineinCounts = {};
        const takeawayCounts = {};

        allOrders.forEach(order => {
          const isTakeaway = takeawayTableIds.has(String(order.table_id));
          const counts = isTakeaway ? takeawayCounts : dineinCounts;
          (order.items || []).forEach(item => {
            const name = item.item_name || item.name || item.itemName || "Unknown";
            const qty = parseInt(item.quantity, 10) || 1;
            counts[name] = (counts[name] || 0) + qty;
          });
        });

        const sortTop5 = (counts) =>
          Object.entries(counts)
            .map(([itemName, orders]) => ({ itemName, orders }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        setTopDineinItems(sortTop5(dineinCounts));
        setTopTakeawayItems(sortTop5(takeawayCounts));

        // combined for existing topItemsData
        const combined = {};
        [...Object.entries(dineinCounts), ...Object.entries(takeawayCounts)].forEach(([k, v]) => {
          combined[k] = (combined[k] || 0) + v;
        });
        setTopItemsData(sortTop5(combined));
      } catch (e) {
        console.error("Top items fetch failed:", e);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, takeawayTableIds]);

  // ── Fetch stats + chart data ──────────────────────────────────────────────
  useEffect(() => {
    if (!token || !clientId) return;
    const run = async () => {
      try {
        const [ordersRes, billingRes] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
            { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId } }
          ),
        ]);

        const allOrders = ordersRes.data?.data || [];
        const allInvoices = billingRes.data?.data || [];
        const startDate = getStartDate(timeFilter);

        const filteredOrders = allOrders.filter(o => new Date(o.created_at) >= startDate);
        const filteredInvoices = allInvoices.filter(inv =>
          new Date(inv.document_date || inv.created_at) >= startDate
        );

        // ── Split dine-in vs takeaway ──────────────────────────────────────
        const isDinein = (o) => !takeawayTableIds.has(String(o.table_id));
        const isTakeaway = (o) => takeawayTableIds.has(String(o.table_id));

        const dineinFiltered = filteredOrders.filter(isDinein);
        const takeawayFiltered = filteredOrders.filter(isTakeaway);

        setDineinOrders(dineinFiltered.length);
        setTakeawayOrders(takeawayFiltered.length);

        // Cancelled orders for records section
        const cancelledFiltered = allOrders.filter(o =>
          o.status?.toLowerCase() === "cancelled" &&
          new Date(o.created_at) >= startDate
        );
        setCancelledOrders(cancelledFiltered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

        // Ops stats split
        setDineinPending(dineinFiltered.filter(o => o.status === "pending").length);
        setDineinPreparing(dineinFiltered.filter(o => o.status === "preparing").length);
        setDineinServed(dineinFiltered.filter(o => o.status === "served").length);
        setTakeawayPending(takeawayFiltered.filter(o => o.status === "pending").length);
        setTakeawayPreparing(takeawayFiltered.filter(o => o.status === "preparing").length);
        setTakeawayServed(takeawayFiltered.filter(o => o.status === "served").length);

        // Sales from invoices
        const earnings = filteredInvoices
          .filter(inv =>
            inv.payment_status?.toLowerCase() === "paid" ||
            inv.status?.toLowerCase() === "issued"
          )
          .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

        // Approximate split by summing order total_price
        const dSales = dineinFiltered.reduce((s, o) => s + (parseFloat(o.total_price) || 0), 0);
        const tSales = takeawayFiltered.reduce((s, o) => s + (parseFloat(o.total_price) || 0), 0);
        const splitRatio = (dSales + tSales) > 0 ? dSales / (dSales + tSales) : 0.5;
        setDineinSales(earnings * splitRatio);
        setTakeawaySales(earnings * (1 - splitRatio));

        setTotalOrders(filteredOrders.length);
        setPendingOrders(filteredOrders.filter(o => o.status === "pending").length);
        setTotalEarnings(Math.round(earnings));
        setPreparingOrders(filteredOrders.filter(o => o.status === "preparing").length);
        setServedOrders(filteredOrders.filter(o => o.status === "served").length);

        // ── 2-hour sales ──────────────────────────────────────────────────
        // ── Timed sales ──────────────────────────────────────────────────
        const selectedTimeAgo = new Date(Date.now() - salesDuration * 60 * 60 * 1000);

        const twoHrDinein = dineinFiltered
          .filter(o => new Date(o.created_at) >= selectedTimeAgo)
          .reduce((s, o) => s + (parseFloat(o.total_price) || 0), 0);

        const twoHrTakeaway = takeawayFiltered
          .filter(o => new Date(o.created_at) >= selectedTimeAgo)
          .reduce((s, o) => s + (parseFloat(o.total_price) || 0), 0);

        setTwoHrDineinSales(twoHrDinein);
        setTwoHrTakeawaySales(twoHrTakeaway);

        // ── Build chart groups ────────────────────────────────────────────
        const groups = {};
        filteredOrders.forEach(order => {
          const d = new Date(order.created_at);
          const key = timeFilter === "Daily"
            ? `${d.getHours()}:00`
            : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (!groups[key]) groups[key] = { date: key, sales: 0, count: 0, dinein: 0, takeaway: 0 };
          groups[key].sales += parseFloat(order.total_price) || 0;
          groups[key].count += 1;
          if (isTakeaway(order)) groups[key].takeaway += 1;
          else groups[key].dinein += 1;
        });

        const sorted = timeFilter === "Daily"
          ? Object.values(groups).sort((a, b) => parseInt(a.date) - parseInt(b.date))
          : Object.values(groups).sort((a, b) =>
            new Date(`${a.date}, ${new Date().getFullYear()}`) -
            new Date(`${b.date}, ${new Date().getFullYear()}`)
          );
        setChartData(sorted);
        setSplitChartData(sorted);
      } catch (e) {
        console.error("Stats fetch failed:", e);
      }
    };
    run();
  }, [clientId, timeFilter, token, takeawayTableIds, salesDuration]);

  // ── Fetch transactions ────────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId || !token) return;
  
    const run = async () => {
      setLoadingTx(true);
  
      try {
  
        const res = await axios.get(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
  
        const orders = res.data?.data || [];
  
        const insights = [];
  
        orders.forEach(order => {
  
          // cancelled orders
          if (
            String(order.status || "").toLowerCase() === "cancelled"
          ) {
            insights.push({
              transaction_type: "ORDER_CANCELLED",
              movement_type: "OUT",
              quantity: order.total_price || 0,
              unit: "₹",
              name: `Order #${order.dinein_order_id || order.id}`,
              remarks: "Customer cancelled order",
              created_at: order.created_at,
            });
          }
  
          // cancelled items
          (order.items || []).forEach(item => {
  
            if (
              String(item.status || "").toLowerCase() === "cancelled"
            ) {
              insights.push({
                transaction_type: "ITEM_CANCELLED",
                movement_type: "OUT",
                quantity: item.quantity || 0,
                unit: "qty",
                name: item.item_name,
                remarks: "Item removed from order",
                created_at: order.created_at,
              });
            }
  
          });
  
        });
  
        setInventoryInsights(
          insights.sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at)
          )
        );
  
      } catch (e) {
        console.error("Insights fetch failed:", e);
      } finally {
        setLoadingTx(false);
      }
    };
  
    run();
  
  }, [clientId, token]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalActive = preparingOrders + pendingOrders + servedOrders || 1;
  const dineinActive = dineinPending + dineinPreparing + dineinServed || 1;
  const takeawayActive = takeawayPending + takeawayPreparing + takeawayServed || 1;

  const pieData = [
    { name: "Preparing", value: preparingOrders },
    { name: "Pending", value: pendingOrders },
    { name: "Served", value: servedOrders },
  ];

  const radarData = topItemsData.map(it => ({
    subject: it.itemName.length > 11 ? it.itemName.slice(0, 11) + "…" : it.itemName,
    fullName: it.itemName,
    orders: it.orders,
  }));

  const maxDineinItem = topDineinItems[0]?.orders || 1;
  const maxTakeawayItem = topTakeawayItems[0]?.orders || 1;

  const filterLabel = {
    Daily: "today", Weekly: "this week", Monthly: "this month",
    Quarterly: "this quarter", "Half Yearly": "last 6 months", Yearly: "this year",
  }[timeFilter] || "";
// ── Cancellation insights ─────────────────────────────
const cancellationCount = cancelledOrders.length;

const cancellationRate = totalOrders
  ? ((cancellationCount / totalOrders) * 100).toFixed(1)
  : 0;

const cancellationLoss = cancelledOrders.reduce(
  (sum, o) => sum + (parseFloat(o.total_price) || 0),
  0
);

const latestCancellation =
  cancelledOrders[0]?.dinein_order_id ||
  cancelledOrders[0]?.id;
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .dash-root * { font-family: 'Plus Jakarta Sans', sans-serif !important; }

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .s1{animation:fadeUp .36s .03s both;}
        .s2{animation:fadeUp .36s .09s both;}
        .s3{animation:fadeUp .36s .15s both;}
        .s4{animation:fadeUp .36s .22s both;}
        .s5{animation:fadeUp .36s .28s both;}

        .live-dot {
          display:inline-block; width:7px; height:7px; border-radius:50%;
          background:#10b981; box-shadow:0 0 0 0 rgba(16,185,129,.5);
          animation:ring 1.8s ease-out infinite;
        }
        @keyframes ring {
          0%  { box-shadow:0 0 0 0   rgba(16,185,129,.5); }
          70% { box-shadow:0 0 0 7px rgba(16,185,129,0);  }
          100%{ box-shadow:0 0 0 0   rgba(16,185,129,0);  }
        }

        .filter-strip {
          display:inline-flex; border-radius:999px;
          border:1px solid #e5e7eb; background:#f9fafb; padding:3px;
          flex-wrap:wrap; gap:2px;
        }
        .filter-strip button {
          padding:4px 12px; font-size:11px; font-weight:600; cursor:pointer;
          border:none; border-radius:999px; color:#6b7280;
          background:transparent; transition:all .15s;
          white-space:nowrap;
        }
        .filter-strip button.active { background:#f97316; color:#fff; }

        .prog-track { height:6px; border-radius:4px; background:#f3f4f6; overflow:hidden; flex:1; }
        .prog-fill  { height:100%; border-radius:4px; transition:width .5s ease; }

        .card {
          background:#fff; border-radius:16px;
          border:1px solid #f3f4f6;
          box-shadow:0 1px 3px rgba(0,0,0,.05);
          padding:20px;
        }
        .card-title { font-size:13px; font-weight:700; color:#111827; }
        .card-sub   { font-size:11px; color:#9ca3af; margin-top:2px; margin-bottom:14px; }

        .tab-btn { padding:6px 14px; font-size:12px; font-weight:600; border-radius:999px; border:none; cursor:pointer; transition:all .15s; }
        .tab-btn.active { background:#f97316; color:#fff; }
        .tab-btn:not(.active) { background:#f3f4f6; color:#6b7280; }
        .tab-btn:not(.active):hover { background:#e5e7eb; }
      `}</style>

      <div className="dash-root bg-gray-50 min-h-[calc(100vh-64px)] p-5 lg:p-7">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* ── Top bar ─────────────────────────────────────────── */}
          <div className="s1 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="live-dot" />
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                Restaurant Dashboard
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Showing data for&nbsp;
                <span className="font-semibold text-gray-700">{filterLabel}</span>
              </p>
            </div>

            <div className="filter-strip">
              {["Daily", "Weekly", "Monthly", "Quarterly", "Half Yearly", "Yearly"].map(f => (
                <button key={f} className={timeFilter === f ? "active" : ""} onClick={() => setTimeFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
               SECTION 1 — SALES
          ══════════════════════════════════════════════════ */}
          <section className="s2">
            <SectionHeading label="Sales" sub="Revenue and earnings overview" />

            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <SalesKPI
                icon={<RiMoneyRupeeCircleLine />}
                value={fmt(totalEarnings)}
                label="Total Earnings"
                sub={`Revenue ${filterLabel}`}
              />
              <SalesKPI
                icon={<FaHamburger />}
                value={totalOrders}
                label="Total Orders"
                sub={`Orders ${filterLabel}`}
              />
              {/* Avg Order Value */}
              <div className="card flex flex-col justify-between gap-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Order Value</p>
                <div>
                  <div className="text-[22px] font-extrabold text-gray-900 tracking-tight">
                    {totalOrders ? fmt(Math.round(totalEarnings / totalOrders)) : "₹0"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Per order</div>
                </div>
              </div>
              {/* Served Rate */}
              <div className="card flex flex-col justify-between gap-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Served Rate</p>
                <div>
                  <div className="text-[22px] font-extrabold text-gray-900 tracking-tight">
                    {pct(servedOrders, totalOrders)}%
                  </div>
                  <div className="prog-track mt-2">
                    <div
                      className="prog-fill"
                      style={{ width: `${pct(servedOrders, totalOrders)}%`, background: ACTION_PRIMARY }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sales charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Revenue — bar chart */}
              <div className="card">
                <p className="card-title">Revenue Trend</p>
                <p className="card-sub">Sales value {filterLabel}</p>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={26}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                        tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                      />
                      <Tooltip content={<SalesTooltip />} cursor={{ fill: "#fff7ed", radius: 6 }} />
                      <Bar dataKey="sales" fill={ACTION_PRIMARY} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Order count — smooth area chart */}
              <div className="card">
                <p className="card-title">Order Volume</p>
                <p className="card-sub">Count of orders {filterLabel}</p>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<AreaTooltip />} />
                      <Area
                        type="monotone" dataKey="count"
                        stroke="#8b5cf6" strokeWidth={2.5}
                        fill="url(#areaGrad)"
                        dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#8b5cf6" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
               SECTION 2 — OPERATIONS  (with dine-in / takeaway split)
          ══════════════════════════════════════════════════ */}
          <section className="s3">
            <SectionHeading label="Operations" sub="Live kitchen and order status — Dine-in vs Takeaway" />

            {/* Split KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
              <SplitKPI
                label="Orders"
                icon={<FaHamburger />}
                dinein={dineinOrders}
                takeaway={takeawayOrders}
                sub={`Total orders ${filterLabel}`}
              />
              <SplitKPI
                label="Revenue (approx)"
                icon={<RiMoneyRupeeCircleLine />}
                dinein={fmt(Math.round(dineinSales))}
                takeaway={fmt(Math.round(takeawaySales))}
                sub="Based on order totals"
              />
              <SplitKPI
                label="Served"
                icon={<TbToolsKitchen3 />}
                dinein={dineinServed}
                takeaway={takeawayServed}
                sub="Completed orders"
              />
            </div>

            {/* Ops KPI row (overall) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
              <OpsCard icon={<MdOutlineSoupKitchen />} value={preparingOrders} label="Total Preparing"
                bg="bg-purple-50" color="text-purple-500" />
              <OpsCard icon={<PiHamburgerThin />} value={pendingOrders} label="Total Pending"
                bg="bg-amber-50" color="text-amber-500" />
              <OpsCard icon={<TbToolsKitchen3 />} value={servedOrders} label="Total Served"
                bg="bg-emerald-50" color="text-emerald-500" />
            </div>

            {/* Ops charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Split order volume line chart */}
              <div className="card">
                <p className="card-title">Dine-in vs Takeaway Orders</p>
                <p className="card-sub">Order count split over time</p>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={splitChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<SplitLineTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        formatter={(value) => value === "dinein" ? "Dine-in" : "Takeaway"}
                      />
                      <Line type="monotone" dataKey="dinein" stroke={DINEIN_COLOR} strokeWidth={2.5}
                        dot={{ r: 3, fill: DINEIN_COLOR }} activeDot={{ r: 5 }} name="dinein" />
                      <Line type="monotone" dataKey="takeaway" stroke={TAKEAWAY_COLOR} strokeWidth={2.5}
                        dot={{ r: 3, fill: TAKEAWAY_COLOR }} activeDot={{ r: 5 }} name="takeaway" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side-by-side kitchen load for dine-in and takeaway */}
              <div className="card">
                <p className="card-title">Kitchen Load Split</p>
                <p className="card-sub">Status breakdown — Dine-in & Takeaway</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Dine-in side */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                      <span className="text-xs font-bold text-orange-600">Dine-in</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Preparing", value: dineinPreparing, color: "#a855f7" },
                        { label: "Pending", value: dineinPending, color: "#f59e0b" },
                        { label: "Served", value: dineinServed, color: "#10b981" },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-600">{label}</span>
                            <span className="font-bold" style={{ color }}>{value} ({pct(value, dineinActive)}%)</span>
                          </div>
                          <div className="prog-track">
                            <div className="prog-fill" style={{ width: `${pct(value, dineinActive)}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Takeaway side */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                      <span className="text-xs font-bold text-purple-600">Takeaway</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Preparing", value: takeawayPreparing, color: "#a855f7" },
                        { label: "Pending", value: takeawayPending, color: "#f59e0b" },
                        { label: "Served", value: takeawayServed, color: "#10b981" },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-600">{label}</span>
                            <span className="font-bold" style={{ color }}>{value} ({pct(value, takeawayActive)}%)</span>
                          </div>
                          <div className="prog-track">
                            <div className="prog-fill" style={{ width: `${pct(value, takeawayActive)}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pie donut below */}
                <div className="mt-5 pt-4 border-t border-gray-50">
                  <p className="text-xs font-bold text-gray-400 mb-2">Overall Status Distribution</p>
                  <div className="flex items-center gap-4">
                    <div style={{ height: 110, flex: 1 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" outerRadius={50} innerRadius={28} strokeWidth={2} stroke="#fff">
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]}
                            contentStyle={{ borderRadius: 10, border: "1px solid #f3f4f6", fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-xs text-gray-500 w-14">{d.name}</span>
                          <span className="text-xs font-bold text-gray-800">{d.value}</span>
                          <span className="text-[10px] text-gray-400">({pct(d.value, totalActive)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
               SECTION 3 — INSIGHTS  (split dine-in + takeaway top items)
          ══════════════════════════════════════════════════ */}
          <section className="s4">
            <SectionHeading label="Insights" sub="Most ordered items — Dine-in & Takeaway" />

            {/* Split top items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

              {/* Dine-in top items */}
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  <p className="card-title">Dine-in Top Items</p>
                </div>
                <p className="card-sub">Top 5 most ordered in dine-in</p>
                {topDineinItems.length > 0 ? (
                  <div className="space-y-3 mt-1">
                    {topDineinItems.map((item, idx) => (
                      <div key={item.itemName} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ background: ITEM_COLORS[idx] }}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-800 truncate pr-2">{item.itemName}</span>
                            <span className="font-bold shrink-0" style={{ color: ITEM_COLORS[idx] }}>{item.orders}</span>
                          </div>
                          <div className="prog-track">
                            <div className="prog-fill"
                              style={{ width: `${pct(item.orders, maxDineinItem)}%`, background: ITEM_COLORS[idx] }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-sm text-gray-400">No data available</div>
                )}
              </div>

              {/* Takeaway top items */}
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <p className="card-title">Takeaway Top Items</p>
                </div>
                <p className="card-sub">Top 5 most ordered in takeaway</p>
                {topTakeawayItems.length > 0 ? (
                  <div className="space-y-3 mt-1">
                    {topTakeawayItems.map((item, idx) => (
                      <div key={item.itemName} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ background: ITEM_COLORS[idx] }}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-800 truncate pr-2">{item.itemName}</span>
                            <span className="font-bold shrink-0" style={{ color: ITEM_COLORS[idx] }}>{item.orders}</span>
                          </div>
                          <div className="prog-track">
                            <div className="prog-fill"
                              style={{ width: `${pct(item.orders, maxTakeawayItem)}%`, background: ITEM_COLORS[idx] }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-sm text-gray-400">No data available</div>
                )}
              </div>
            </div>

            {/* Radar chart (combined) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

              {/* 2-hour sales snapshot */}
              <TwoHrSalesCard dineinSales={twoHrDineinSales} takeawaySales={twoHrTakeawaySales} salesDuration={salesDuration}
                setSalesDuration={setSalesDuration} />
                
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

export default DashBoardPage;