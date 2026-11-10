import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { menuCache } from '../../utils/Menu-utils/menuCache';
import { getMenuConfig } from '../../utils/menuConfigResolver';

// ─── Config ───────────────────────────────────────────────────────────────────
const PURPLE_LIGHT = '#9B62E1';
const COST_COLOR = '#9B62E1';
const PROFIT_COLOR = '#E07C49';
const GST_RATE = 0.05; // used only when an invoice has no GST field

// Inventory API (your FastAPI router). Set VITE_API_INVENTORY_SERVICE_URL in .env.
// If your gateway mounts the router differently, change this one line.
const INVENTORY_BASE = (clientId) =>
  `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory`;
// User API (your users router). Set VITE_API_USER_SERVICE_URL in .env.
// If the module segment differs in your gateway, change this one line.
const USER_BASE = (clientId) =>
  `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENU_INVENTORY_ID = 'menu';   // menu rows live in the same table; skip them
const LOW_STOCK_THRESHOLD = 10;     // used when an item has no min_stock / reorder_level

const OPEN_STATUSES = ['pending', 'preparing'];
const DONE_STATUSES = ['served', 'completed', 'paid', 'delivered', 'closed'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const num = (v) => parseFloat(v) || 0;
const inr = (n) => `₹${Math.round(num(n)).toLocaleString('en-IN')}`;
const lower = (v) => String(v || '').toLowerCase();

const getStartDate = (filter) => {
  const now = new Date();
  switch (filter) {
    case 'Weekly': return new Date(now.setDate(now.getDate() - 7));
    case 'Monthly': return new Date(now.setMonth(now.getMonth() - 1));
    case 'Quarterly': return new Date(now.setMonth(now.getMonth() - 3));
    case 'Half Yearly': return new Date(now.setMonth(now.getMonth() - 6));
    case 'Yearly': return new Date(now.setFullYear(now.getFullYear() - 1));
    default: return new Date(now.setHours(0, 0, 0, 0));
  }
};

const normalizeService = (raw) => {
  const s = lower(raw).replace(/[^a-z]/g, '');
  if (s.includes('dine')) return 'Dine-in';
  if (s.includes('walk')) return 'Walk-in';
  if (s.includes('deliver')) return 'Delivery';
  if (s.includes('take') || s.includes('pick')) return 'Takeaway';
  return raw ? String(raw) : '';
};

const itemQty = (it) => parseInt(it.quantity, 10) || 1;
const itemName = (it) => it.item_name || it.name || 'Unknown';

// Same unit table as your backend _convert()
const UNIT_BASE = { g: 1, kg: 1000, ml: 1, litre: 1000, pcs: 1 };
const UNIT_GROUP = { g: 'w', kg: 'w', ml: 'v', litre: 'v', pcs: 'c' };
const convertUnit = (qty, from, to) => {
  const f = String(from || '').trim();
  const t = String(to || '').trim();
  if (!f || !t || f === t) return qty;
  if (!UNIT_BASE[f] || !UNIT_BASE[t] || UNIT_GROUP[f] !== UNIT_GROUP[t]) return qty;
  return (qty * UNIT_BASE[f]) / UNIT_BASE[t];
};
const itemLine = (it) =>
  num(it.total_price) || num(it.price ?? it.unit_price) * itemQty(it);

const invoiceGst = (inv) => {
  const total = num(inv.total_amount);
  const g = inv.tax_amount ?? inv.gst_amount ?? inv.total_tax ?? inv.tax;
  return g !== undefined && g !== null && g !== ''
    ? num(g)
    : total - total / (1 + GST_RATE);
};

// ─── UI building blocks ───────────────────────────────────────────────────────
// `fixed` cards keep a constant height; extra rows scroll inside the card
function Card({ title, count, children, className = '', fixed = false }) {
  return (
    <section
      className={`ui-panel !mb-0 ${
        fixed ? 'flex flex-col h-[400px]' : ''
      } ${className}`}
    >
      {title && (
        <h2 className="text-panel-title text-brand-dark mb-item-sm shrink-0">
          {title}
          {count !== undefined && (
            <span className="ml-1.5 font-normal text-ink-muted">({count})</span>
          )}
        </h2>
      )}
      {fixed ? <div className="flex-1 min-h-0 overflow-auto">{children}</div> : children}
    </section>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="ui-metric">
      <span className="ui-metric-label">{label}</span>
      <strong className="ui-metric-value">{value}</strong>
    </div>
  );
}

// Shows `limit` rows with "Showing X of Y" + Show all
function DataTable({ columns, rows, empty = 'No data available', limit = 10, minWidth }) {
  const [all, setAll] = useState(false);
  const visible = all ? rows : rows.slice(0, limit);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="ui-table" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.right ? 'text-right' : ''}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-ink-muted !py-4">
                  {empty}
                </td>
              </tr>
            ) : (
              visible.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.right ? 'text-right' : ''}>
                      {c.render ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <div className="flex items-center justify-between gap-3 pt-2.5 text-ui text-ink-muted">
          <span>Showing {visible.length} of {rows.length} rows</span>
          <button
            onClick={() => setAll((v) => !v)}
            className="ui-btn !h-7"
          >
            {all ? 'Show less' : `Show all ${rows.length}`}
          </button>
        </div>
      )}
    </>
  );
}

const axisTick = { fontSize: 11, fill: '#4B5563' };
const tooltipStyle = { borderRadius: 9, border: '1px solid #e1d4ee', fontSize: 12, color: '#374151', backgroundColor: '#fff' };

// ─── Main ─────────────────────────────────────────────────────────────────────
const DashBoardPage = () => {
  const { clientId } = useParams();
  const token = localStorage.getItem('access_token');
  const { takeawayTableRoot } = getMenuConfig(clientId);

  const [timeFilter, setTimeFilter] = useState('Daily');
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tables, setTables] = useState([]);
  const [userMap, setUserMap] = useState({});         // user id → username
  const [inventory, setInventory] = useState(null); // null = not available
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch (same endpoints as before) ───────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!clientId || !token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [tablesData, ordersRes, billingRes] = await Promise.all([
        menuCache.fetchTables(clientId, token),
        axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers }),
        axios.get(`${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`, {
          headers,
          params: { client_id: clientId },
        }),
      ]);
      setTables(tablesData?.list || []);
      setOrders(ordersRes.data?.data || []);
      // Debug: shows which fields the order API returns (remove when done)
      console.log('Order sample', (ordersRes.data?.data || [])[0]);
      setInvoices(billingRes.data?.data || []);
      setError('');

      if (import.meta.env.VITE_API_INVENTORY_SERVICE_URL) {
        const base = INVENTORY_BASE(clientId);

        // GET /read — same operation your Inventory page already has access to.
        // Returns stock rows (availability, unit, unit_cost) and menu rows (recipe).
        try {
          const invRes = await axios.get(`${base}/read`, {
            headers,
            params: { client_id: clientId },
          });
          setInventory(invRes.data?.data || []);
        } catch (e) {
          console.error('Inventory fetch failed:', e);
          setInventory(null);
        }
      }

      // Usernames for "Employee sales performance"
      if (import.meta.env.VITE_API_USER_SERVICE_URL) {
        const ubase = USER_BASE(clientId);
        const map = {};
        try {
          // GET /persons → { persons: [{ id, username, first_name, ... }] }
          const pr = await axios.get(`${ubase}/persons`, { headers, params: { client_id: clientId } });
          (pr.data?.data?.persons || []).forEach((p) => {
            const pid = p.id ?? p.user_id ?? p.person_id;
            const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ');
            if (pid) map[String(pid)] = fullName || p.username;
          });
        } catch (e) {
          console.error('Persons fetch failed:', e);
        }
        if (Object.keys(map).length === 0) {
          try {
            // GET /users → { users: [{ id, username, ... }] }
            const ur = await axios.get(`${ubase}/users`, { headers, params: { client_id: clientId } });
            (ur.data?.data?.users || []).forEach((u) => {
              if (u.id) map[String(u.id)] = u.username;
            });
          } catch (e) {
            console.error('Users fetch failed:', e);
          }
        }
        setUserMap(map);
      }
    } catch (e) {
      console.error('Dashboard fetch failed:', e);
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 60000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const takeawayIds = useMemo(() => {
    const roots = String(takeawayTableRoot || 'takeaway')
      .split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
    return new Set(
      tables
        .filter((t) => roots.some((r) => lower(t.name).startsWith(r)))
        .map((t) => String(t.id))
    );
  }, [tables, takeawayTableRoot]);

  const d = useMemo(() => {
    const start = getStartDate(timeFilter);
    const inRange = (dt) => new Date(dt) >= start;

    const rangeOrders = orders.filter((o) => inRange(o.created_at) && lower(o.status) !== 'cancelled');
    const completed = rangeOrders.filter((o) => DONE_STATUSES.includes(lower(o.status)));
    const open = rangeOrders.filter((o) => OPEN_STATUSES.includes(lower(o.status)));

    const rangeInvoices = invoices.filter((inv) => inRange(inv.document_date || inv.created_at));
    const validInvoices = rangeInvoices.filter(
      (inv) => lower(inv.payment_status) === 'paid' || lower(inv.status) === 'issued'
    );
    const paidInvoices = rangeInvoices.filter((inv) => lower(inv.payment_status) === 'paid');

    const salesIncl = validInvoices.reduce((s, i) => s + num(i.total_amount), 0);
    const gst = validInvoices.reduce((s, i) => s + invoiceGst(i), 0);
    const salesExcl = salesIncl - gst;

    // Estimated inventory cost = Σ sold portions × recipe cost
    // recipe cost = Σ (quantity_required converted to stock unit × stock unit_cost)
    const stockById = {};
    const recipeById = {};
    (inventory || []).forEach((r) => {
      if (Array.isArray(r.recipe) && r.recipe.length) recipeById[String(r.id)] = r.recipe;
      if (lower(r.inventory_id) !== MENU_INVENTORY_ID) stockById[String(r.id)] = r;
    });
    const recipeCost = {};
    const costPerPortion = (menuId) => {
      const k = String(menuId);
      if (recipeCost[k] !== undefined) return recipeCost[k];
      let c = 0;
      (recipeById[k] || []).forEach((ing) => {
        const st = stockById[String(ing.stock_item_id)];
        if (!st) return;
        c += convertUnit(num(ing.quantity_required), ing.unit, st.unit) * num(st.unit_cost);
      });
      recipeCost[k] = c;
      return c;
    };
    const cost = completed.reduce(
      (s, o) =>
        s +
        (o.items || []).reduce((a, it) => {
          if (lower(it.status) === 'cancelled') return a;
          const menuId = it.item_id ?? it.menu_item_id ?? it.inventory_id;
          return a + itemQty(it) * costPerPortion(menuId);
        }, 0),
      0
    );
    const profit = salesExcl - cost;
    const margin = salesExcl > 0 ? (profit / salesExcl) * 100 : 0;

    // Plates
    const platesPrepared = completed.reduce(
      (s, o) => s + (o.items || []).reduce((a, it) => a + itemQty(it), 0), 0);
    const platesRemaining = open.reduce(
      (s, o) => s + (o.items || []).reduce((a, it) => a + itemQty(it), 0), 0);

    // Sales over time (from invoices)
    const groups = {};
    validInvoices.forEach((inv) => {
      const dt = new Date(inv.document_date || inv.created_at);
      const key =
        timeFilter === 'Daily'
          ? `${String(dt.getHours()).padStart(2, '0')}:00`
          : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = { label: key, sales: 0, t: dt.getTime() };
      groups[key].sales += num(inv.total_amount) - invoiceGst(inv);
    });
    const salesOverTime = Object.values(groups)
      .sort((a, b) => a.t - b.t)
      .map((g) => ({ ...g, sales: Math.round(g.sales) }));

    // Service type
    const serviceOf = (o) =>
      normalizeService(o.order_type || o.service_type || o.type) ||
      (takeawayIds.has(String(o.table_id)) ? 'Takeaway' : 'Dine-in');
    const svc = {};
    completed.forEach((o) => {
      const k = serviceOf(o);
      if (!svc[k]) svc[k] = { service: k, orders: 0, sales: 0 };
      svc[k].orders += 1;
      svc[k].sales += num(o.total_price);
    });
    const services = Object.values(svc).sort((a, b) => b.sales - a.sales);

    // Menu items
    const items = {};
    rangeOrders.forEach((o) =>
      (o.items || []).forEach((it) => {
        if (lower(it.status) === 'cancelled') return;
        const n = itemName(it);
        if (!items[n]) items[n] = { name: n, portions: 0, sales: 0 };
        items[n].portions += itemQty(it);
        items[n].sales += itemLine(it);
      })
    );
    const menuItems = Object.values(items).sort((a, b) => b.sales - a.sales).slice(0, 8);

    // Employees
    const emp = {};
    completed.forEach((o) => {
      // order.created_by holds the user id → resolve to username
      // The person who took the order: created_by (or similar) holds their person/user id
      const key = [o.created_by, o.handler_id, o.updated_by, o.user_id, o.waiter_id, o.employee_id, o.taken_by]
        .find((v) => v !== undefined && v !== null && v !== '');
      const raw = key === undefined ? '' : String(key);
      const n = !raw
        ? 'Unassigned'
        : userMap[raw] ||
          o.created_by_name ||
          (UUID_RE.test(raw) ? `User ${raw.slice(0, 8)}` : raw); // may already be a name
      if (!emp[n]) emp[n] = { name: n, orders: 0, sales: 0 };
      emp[n].orders += 1;
      emp[n].sales += num(o.total_price);
    });
    const employees = Object.values(emp).sort((a, b) => b.sales - a.sales);

    // Dining area occupancy (live, dine-in tables only)
    const activeTableIds = new Set(
      orders
        .filter((o) => ['pending', 'preparing', 'served'].includes(lower(o.status)))
        .map((o) => String(o.table_id))
    );
    const areas = {};
    tables
      .filter((t) => !takeawayIds.has(String(t.id)))
      .forEach((t) => {
        const a = t.area || t.area_name || t.section || t.floor || t.location || t.table_group || 'General';
        if (!areas[a]) areas[a] = { area: a, occupied: 0, vacant: 0 };
        if (activeTableIds.has(String(t.id))) areas[a].occupied += 1;
        else areas[a].vacant += 1;
      });
    const dining = Object.values(areas).map((a) => ({
      ...a,
      coverage: a.occupied + a.vacant ? (a.occupied / (a.occupied + a.vacant)) * 100 : 0,
    }));
    const totOcc = dining.reduce((s, a) => s + a.occupied, 0);
    const totAll = dining.reduce((s, a) => s + a.occupied + a.vacant, 0);
    const occupancy = totAll ? (totOcc / totAll) * 100 : 0;

    // Items requiring preparation attention
    const prep = {};
    open.forEach((o) =>
      (o.items || []).forEach((it) => {
        if (lower(it.status) === 'cancelled') return;
        const n = itemName(it);
        if (!prep[n]) prep[n] = { name: n, plates: 0, orders: 0, oldest: Infinity };
        prep[n].plates += itemQty(it);
        prep[n].orders += 1;
        prep[n].oldest = Math.min(prep[n].oldest, new Date(o.created_at).getTime());
      })
    );
    const prepItems = Object.values(prep)
      .map((p) => ({ ...p, waiting: Math.max(0, Math.round((Date.now() - p.oldest) / 60000)) }))
      .sort((a, b) => b.plates - a.plates);

    return {
      rangeOrders, completed, open, validInvoices, paidInvoices, rangeInvoices,
      salesIncl, gst, salesExcl, cost, profit, margin,
      platesPrepared, platesRemaining, salesOverTime, services, menuItems,
      employees, dining, occupancy, prepItems,
    };
  }, [orders, invoices, tables, takeawayIds, timeFilter, inventory, userMap]);

  // Raw materials needing purchase
  const lowStock = useMemo(() => {
    if (!inventory) return [];
    const seen = new Set(); // same item can repeat per zone
    return inventory
      .filter((r) => lower(r.inventory_id) !== MENU_INVENTORY_ID)
      .filter((r) => {
        const k = String(r.id);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((r) => ({
        name: r.name,
        onHand: Number(num(r.availability).toFixed(2)),
        unit: r.unit || '',
        threshold: num(r.min_stock ?? r.reorder_level ?? r.threshold ?? LOW_STOCK_THRESHOLD),
      }))
      .filter((r) => r.onHand <= r.threshold)
      .sort((a, b) => a.onHand - b.onHand);
  }, [inventory]);

  const rangeLabel = `${getStartDate(timeFilter).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })} – Now`;

  const donutData = [
    { name: 'Estimated inventory cost', value: Math.max(Math.round(d.cost), 0) },
    { name: 'Estimated gross profit', value: Math.max(Math.round(d.profit), 0) },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ui-page">
      <div className="mx-auto">
        {/* Header + filter */}
        <div className="ui-panel flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-state-vacant opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-state-vacant" />
              </span>
              <span className="text-micro font-bold uppercase tracking-wider text-state-vacant">Live</span>
            </div>
            <h1 className="text-page-title text-brand-dark">
              Dashboard
            </h1>
            <p className="text-ui text-ink-muted mt-1">
              Showing <span className="font-semibold text-brand-dark">{timeFilter}</span> data · {rangeLabel}
            </p>
          </div>

          {/* Segmented time filter */}
          <div className="w-full lg:w-auto overflow-x-auto">
            <div className="ui-tabs">
              {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly'].map((f) => {
                const active = timeFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={`ui-tab whitespace-nowrap ${active ? 'ui-tab-active' : ''}`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-stack rounded-button-sm bg-state-occupied-bg border border-state-occupied/30 text-state-occupied text-ui px-4 py-2">{error}</div>
        )}
        {loading && <div className="mb-stack text-ui text-ink-muted">Loading dashboard…</div>}

        {/* KPI row */}
        <div className="ui-metrics">
          <Kpi label="Orders placed" value={d.open.length} />
          <Kpi label="Completed orders" value={d.completed.length} />
          <Kpi label="Sales excluding GST" value={inr(d.salesExcl)} />
          <Kpi label="GST" value={inr(d.gst)} />
          <Kpi label="Estimated gross profit" value={inr(d.profit)} />
          <Kpi label="Gross margin" value={`${d.margin.toFixed(1)}%`} />
          <Kpi label="Invoices recorded" value={d.rangeInvoices.length} />
          <Kpi label="Marked-paid invoices value" value={inr(d.paidInvoices.reduce((s, i) => s + num(i.total_amount), 0))} />
          <Kpi label="Plates prepared" value={d.platesPrepared.toLocaleString('en-IN')} />
          <Kpi label="Plates remaining" value={d.platesRemaining.toLocaleString('en-IN')} />
          <Kpi label="Dine-in Occupancy Coverage" value={`${d.occupancy.toFixed(1)}%`} />
          <Kpi label="Raw materials requiring purchase" value={lowStock.length} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-tiles mb-stack">
          <Card title="Sales over time">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.salesOverTime} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#eee8f5" vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} />
                  <YAxis tick={axisTick} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(v), 'Sales excl. GST']} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#374151' }} />
                  <Line type="monotone" dataKey="sales" name="Sales excl. GST" stroke={PURPLE_LIGHT}
                    strokeWidth={3} dot={{ r: 3, fill: PURPLE_LIGHT }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Sales by service type">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.services} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barG" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#9B62E1" />
                      <stop offset="100%" stopColor="#7136B7" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eee8f5" vertical={false} />
                  <XAxis dataKey="service" tick={axisTick} />
                  <YAxis tick={axisTick} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(v), 'Sales incl. GST']} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#374151' }} />
                  <Bar dataKey="sales" name="Sales incl. GST" fill="url(#barG)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Sales value breakdown" className="lg:col-span-2 xl:col-span-1">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius="35%" outerRadius="70%"
                    paddingAngle={2} stroke="#fff" strokeWidth={2}>
                    <Cell fill={COST_COLOR} />
                    <Cell fill={PROFIT_COLOR} />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [inr(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#374151' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Tables row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-tiles mb-stack">
          <Card fixed title="Menu items driving sales" count={d.menuItems.length}>
            <DataTable
              columns={[
                { key: 'name', label: 'Menu item' },
                { key: 'portions', label: 'Portions' },
                { key: 'sales', label: 'Sales incl. GST', render: (r) => inr(r.sales) },
              ]}
              rows={d.menuItems}
            />
          </Card>

          <Card fixed title="Service performance" count={d.services.length}>
            <DataTable
              columns={[
                { key: 'service', label: 'Service type' },
                { key: 'orders', label: 'Completed orders' },
                { key: 'sales', label: 'Sales incl. GST', render: (r) => inr(r.sales) },
              ]}
              rows={d.services}
            />
          </Card>

          <Card fixed title="Dining area occupancy" count={d.dining.length} className="lg:col-span-2 xl:col-span-1">
            <DataTable
              columns={[
                { key: 'area', label: 'Dining area' },
                { key: 'occupied', label: 'Occupied tables' },
                { key: 'vacant', label: 'Vacant tables' },
                { key: 'coverage', label: 'Coverage', render: (r) => `${r.coverage.toFixed(1)}%` },
              ]}
              rows={d.dining}
            />
          </Card>
        </div>

        {/* Tables row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-tiles mb-stack">
          <Card fixed title="Raw-material stock attention" count={lowStock.length}>
            <DataTable
              columns={[
                { key: 'name', label: 'Ingredient' },
                { key: 'onHand', label: 'On hand' },
                { key: 'unit', label: 'Unit' },
                { key: 'cond', label: 'Stock condition', render: (r) => (r.onHand <= 0 ? 'Out of stock' : 'Purchase required') },
              ]}
              rows={lowStock}
              empty={inventory === null
                ? 'Stock data unavailable (check VITE_API_INVENTORY_SERVICE_URL)'
                : 'All stock levels are healthy'}
            />
          </Card>

          <Card fixed title="Employee sales performance" count={d.employees.length}>
            <DataTable
              columns={[
                { key: 'name', label: 'Employee' },
                { key: 'orders', label: 'Completed orders' },
                { key: 'sales', label: 'Sales incl. GST', render: (r) => inr(r.sales) },
              ]}
              rows={d.employees}
              empty="No employee data on orders"
            />
          </Card>

          <Card fixed title="Items requiring preparation attention" count={d.prepItems.length} className="lg:col-span-2 xl:col-span-1">
            <DataTable
              minWidth={430}
              columns={[
                { key: 'name', label: 'Menu item' },
                { key: 'plates', label: 'Plates remaining' },
                { key: 'batch', label: 'Plates per batch', render: (r) => r.batch ?? '—' },
                { key: 'waiting', label: 'Preparation', render: (r) => `${r.waiting} min waiting` },
              ]}
              rows={d.prepItems}
              empty="Nothing waiting in the kitchen"
            />
          </Card>
        </div>

        {/* GST / profit table */}
        <Card title="Sales, GST and estimated gross profit" count={4}>
          <DataTable
            columns={[
              { key: 'm', label: 'Measure' },
              { key: 'a', label: 'Amount', render: (r) => inr(r.a) },
            ]}
            rows={[
              { m: 'Sales excluding GST', a: d.salesExcl },
              { m: 'GST', a: d.gst },
              { m: 'Estimated inventory cost', a: d.cost },
              { m: 'Estimated gross profit', a: d.profit },
            ]}
          />
        </Card>

        <div className="text-micro tracking-wide text-ink-muted pt-4">TEKHAWK</div>
      </div>
    </div>
  );
};

export default DashBoardPage;