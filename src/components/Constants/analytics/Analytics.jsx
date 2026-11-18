import React, { useEffect, useState, useContext, createContext, useMemo  } from 'react';
import axios from 'axios';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, UtensilsCrossed, Package, ReceiptText, ClipboardList, RefreshCw, ChevronDown } from 'lucide-react';

// ══ API LAYER ════════════════════════════════════════════════════════════════
const BASE_URL = (import.meta.env.VITE_API_ANALYTICS_SERVICE_URL || 'http://127.0.0.1:8006/saas').replace(/\/$/, '');
const MENU_INVENTORY_ID = import.meta.env.VITE_MENU_INVENTORY_ID ?? 'menu';
const STOCK_INVENTORY_ID = import.meta.env.VITE_STOCK_INVENTORY_ID ?? 'ration_inventory';

// Credentials are read lazily on every request (never frozen at import time).
const auth = { token: null, clientId: null };
const setAuth = ({ token, clientId } = {}) => {
  if (token !== undefined) auth.token = token || null;
  if (clientId !== undefined) auth.clientId = clientId || null;
};
const getAccessToken = () => auth.token || localStorage.getItem('access_token') || '';
const getClientId = () => auth.clientId || localStorage.getItem('client_id') || '';

class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}
const isCancel = axios.isCancel;
const STATUS_MESSAGES = { 401: 'Not signed in: the access token is missing or expired', 403: 'Client ID does not match the access token' };

const toApiError = (err) => {
  if (axios.isCancel(err)) return err; // aborted on purpose, not a failure
  if (!err.response) return new ApiError('Unable to reach the analytics service');
  const { status, data } = err.response;
  const detail = typeof data?.detail === 'string' ? data.detail : Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(', ') : null;
  return new ApiError(detail || STATUS_MESSAGES[status] || `Request failed (${status})`, status);
};

const http = axios.create({ baseURL: BASE_URL, timeout: 30000 });
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Backend wraps every payload in ResponseModel { screen_id, status, message, data }.
const unwrap = (res) => {
  const body = res.data;
  return body && typeof body === 'object' && 'screen_id' in body && 'data' in body ? body.data : body;
};

/** GET {BASE_URL}/{client_id}/analytics{path}?client_id=...&...params */
async function apiGet(path, params = {}, signal) {
  const clientId = params.client_id || getClientId();
  if (!clientId) throw new ApiError('Client ID is not set');
  try {
    const res = await http.get(`/${encodeURIComponent(clientId)}/analytics${path}`, { params: { ...params, client_id: clientId }, signal });
    return unwrap(res);
  } catch (err) {
    throw toApiError(err);
  }
}

const ENDPOINTS = {
  // filter-scoped: { client_id, start, end, area, time_of_day, order_type, weekday, menu_category, menu_recipe }
  overview: '/overview', intelligence: '/owner/intelligence', operations: '/operations', demandTrends: '/orders/demand-trends',
  services: '/services/analytics', menu: '/menu/analytics', billing: '/billing/analytics', billingLive: '/billing/live',
  sales: '/sales/v32', inventoryPlan: '/inventory/v24', inventoryLive: '/inventory/live', trace: '/owner/trace',
  // client-scoped / whole history
  filters: '/filters', insights: '/insights/v40', billingItems: '/billing/live/items', inventoryItems: '/inventory/items',
};
/** analyticsApi.operations(params, signal) -> Promise<payload> */
const analyticsApi = Object.fromEntries(Object.entries(ENDPOINTS).map(([name, path]) => [name, (params, signal) => apiGet(path, params, signal)]));

/**
 * Load an endpoint and reload when params change; cancels in-flight requests.
 * Returns { data, error, loading }.
 */
function useAnalytics(endpoint, params, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: '', loading: enabled });
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    if (!enabled) { setState({ data: null, error: '', loading: false }); return undefined; }
    const controller = new AbortController();
    setState({ data: null, error: '', loading: true });
    analyticsApi[endpoint](params, controller.signal)
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((err) => { if (!isCancel(err)) setState({ data: null, error: err.message, loading: false }); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, enabled]);
  return state;
}

// ══ SHARED CONSTANTS / FORMATTERS ════════════════════════════════════════════
const money = (x) => '₹' + Math.round(Number(x) || 0).toLocaleString('en-IN');
const number = (x) => Number(x || 0).toLocaleString('en-IN');
const CHART_COLORS = ['#9B62E1', '#E07C49', '#F3B54A', '#1D9E9A', '#2879BD', '#46B8A9', '#D65C91', '#6A9DE0'];
const CHART_DARK = ['#7136B7', '#B94F26', '#C68A1C', '#11716E', '#175B91', '#258A7D', '#A83270', '#4275BA'];
const ORDER_STATUSES = ['Served', 'Pending', 'Preparing', 'Ready', 'Cancelled'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TAB_ACCESS = {
  'Business at a glance': ['order', 'table', 'menu', 'billing', 'inventory'], // cross-service summary; widgets hide per service
  'Orders': ['order'],
  'Tables': ['table'],
  'Menu': ['menu'],
  'Billing': ['billing'],
  'Inventory': ['inventory'],
  'Sales': ['order'],                          // sales are computed from orders
  'Insights & Recommended Actions': ['order'], // built on order history
};

// Read the `subscription` claim from the access token (same list the header uses)
const readSubscription = (token) => {
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Array.isArray(payload.subscription) ? payload.subscription : null;
  } catch {
    return null;
  }
};

// ── Shared theme class strings / tiny building blocks ────────────────────────
const FIELD =
  'w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink ' +
  'outline-none placeholder:text-ink-faint transition-colors focus:border-brand-ring focus:shadow-focus-ring';
const SELECT = FIELD + ' !w-auto min-w-[200px]';

const MetricGrid = ({ items }) => (
  <div className="ui-metrics">
    {items.map(([label, value]) => (
      <div className="ui-metric" key={String(label)}>
        <span className="ui-metric-label">{label}</span>
        <strong className="ui-metric-value">{value}</strong>
      </div>
    ))}
  </div>
);

// Segmented toggle: options = [[value, label], ...]
const Seg = ({ options, value, onChange, small = false, label }) => (
  <div className={`ui-toggle ${small ? '!p-px !gap-px' : ''}`} role="group" aria-label={label}>
    {options.map(([k, l]) => (
      <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
        className={`ui-toggle-btn ${small ? '!px-1.5 !py-0.5 !text-micro' : ''} ${value === k ? 'ui-toggle-btn-active' : ''}`}>{l}</button>
    ))}
  </div>
);
const ViewToggle = ({ view, setView, small = true }) => (
  <Seg small={small} value={view} onChange={setView} options={[['table', 'Table'], ['chart', 'Chart']]} />
);

// Chip row (stage / dimension pickers): options = [[value, label], ...]
const Chips = ({ options, value, onChange, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
    {options.map(([k, l]) => (
      <button key={k} type="button" onClick={() => onChange(k)}
        className={`ui-btn ${value === k ? '!bg-brand-soft !border-brand-ring' : ''}`}>{l}</button>
    ))}
  </div>
);

const Lead = ({ title, children }) => (
  <section className="pt-1 pb-2 mb-2">
    <h2 className="text-page-title text-brand-dark">{title}</h2>
    {children && <p className="text-ui text-ink-muted max-w-[900px]">{children}</p>}
  </section>
);
const Question = ({ children }) => (
  <div className="text-body-sm font-bold text-brand-dark mt-5 mb-2.5 pb-2 border-b border-line-divider">{children}</div>
);
const Note = ({ children, className = '' }) => (
  <p className={`border-l-bar border-l-brand pl-3 py-2.5 bg-surface text-ui text-ink-muted my-3 ${className}`}>{children}</p>
);
const SectionHead = ({ children }) => (
  <div className="flex items-center justify-between gap-2.5"><h3 className="ui-panel-title">{children}</h3></div>
);

const TraceContext = createContext({ start: '2025-10-01', end: '2026-09-30', client_id: getClientId(), area: 'all', time_of_day: 'all', order_type: 'all', weekday: 'all', menu_category: 'all', menu_recipe: 'all' });

function ChartPanel({ title, subtitle, data, keys, x = 'date', bar = false, kind, compact = false }) {
  const mode = kind || (bar ? 'bar' : 'area');
  const series = keys[0];
  const neutralTick = { fontSize: 11, fill: '#4B5563' };
  const neutralLegend = { color: '#374151', fontSize: 11 };
  const tipStyle = { color: '#374151', backgroundColor: '#fff' };
  const pieData = (data || []).map(d => ({ name: String(d[x] ?? 'Other'), value: Math.max(0, Number(d[series?.key]) || 0) })).filter(d => d.value > 0).slice(0, 8);
  const chart = (
    <div className={compact ? 'h-[215px] w-full min-w-0' : 'h-[255px] w-full mt-2.5'}>
      <ResponsiveContainer width="100%" height="100%">
        {mode === 'pie' ? (
          <PieChart>
            <defs>{CHART_COLORS.map((c, i) => <linearGradient id={'pieShade' + i} key={i} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={CHART_DARK[i]} /><stop offset="100%" stopColor={c} /></linearGradient>)}</defs>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="46%" outerRadius="70%" innerRadius="35%" paddingAngle={2} labelLine={false}>
              {pieData.map((_, i) => <Cell key={i} fill={'url(#pieShade' + (i % CHART_COLORS.length) + ')'} stroke="#fff" strokeWidth={2} />)}
            </Pie>
            <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} contentStyle={{ color: '#374151' }} itemStyle={{ color: '#374151' }} labelStyle={{ color: '#111827' }} />
            <Legend verticalAlign="bottom" height={32} wrapperStyle={neutralLegend} />
          </PieChart>
        ) : mode === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid stroke="#eee8f5" vertical={false} /><XAxis dataKey={x} tick={neutralTick} minTickGap={20} /><YAxis tick={neutralTick} />
            <Tooltip contentStyle={tipStyle} labelStyle={{ color: '#111827' }} itemStyle={{ color: '#374151' }} /><Legend wrapperStyle={neutralLegend} />
            {keys.map((k, i) => <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={3} dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }} activeDot={{ r: 5 }} />)}
          </LineChart>
        ) : mode === 'bar' ? (
          <BarChart data={data}>
            <defs>{keys.map((k, i) => <linearGradient id={'barShade' + i} key={k.key} x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} /><stop offset="100%" stopColor={CHART_DARK[i % CHART_DARK.length]} /></linearGradient>)}</defs>
            <CartesianGrid stroke="#eee8f5" vertical={false} /><XAxis dataKey={x} tick={neutralTick} /><YAxis tick={neutralTick} />
            <Tooltip contentStyle={tipStyle} labelStyle={{ color: '#111827' }} itemStyle={{ color: '#374151' }} /><Legend wrapperStyle={neutralLegend} />
            {keys.map((k, i) => <Bar key={k.key} dataKey={k.key} name={k.label} fill={'url(#barShade' + i + ')'} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <CartesianGrid stroke="#eee8f5" vertical={false} /><XAxis dataKey={x} tick={neutralTick} minTickGap={36} /><YAxis tick={neutralTick} />
            <Tooltip contentStyle={tipStyle} labelStyle={{ color: '#111827' }} itemStyle={{ color: '#374151' }} /><Legend wrapperStyle={neutralLegend} />
            {keys.map((k, i) => <Area key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={.32} strokeWidth={2.5} />)}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
  if (compact) return chart;
  return (
    <section className="ui-panel">
      <div><h3 className="ui-panel-title">{title}</h3>{subtitle && <p className="text-ui-sm text-ink-muted">{subtitle}</p>}</div>
      {chart}
    </section>
  );
}

function DataTable({ title, columns, rows, limit = 10, toolbar, compact = false }) {
  const ctx = useContext(TraceContext);
  const [expanded, setExpanded] = useState(false), [selected, setSelected] = useState(null), [trace, setTrace] = useState(null), [traceError, setTraceError] = useState('');
  useEffect(() => { setExpanded(false); setSelected(null); setTrace(null); }, [rows, title]);
  useEffect(() => {
    if (!selected) return undefined;
    setTrace(null); setTraceError('');
    const candidates = [['channel', 'channel'], ['item', 'item'], ['item', 'dish'], ['category', 'category'], ['table', 'table'], ['area', 'area'], ['status', 'status'], ['hour', 'hour'], ['month', 'month'], ['day', 'date'], ['handler', 'handler'], ['weekday', 'day'], ['invoice', 'number'], ['stock', 'item']];
    let found = candidates.find(([kind, key]) => selected[key] !== undefined && (kind !== 'stock' || title.toLowerCase().includes('stock')));
    if (found && found[0] === 'item' && /stock|raw material|ingredient|finished.food|received|used/i.test(title)) found = ['stock', 'item'];
    if (found && found[0] === 'item' && /recipe composition|recipe cost|recipe.level|menu recipe/i.test(title)) found = ['recipe', 'item'];
    if (!found) { setTraceError('This summary has no reliable transaction key.'); return undefined; }
    const [kind, key] = found;
    const controller = new AbortController();
    analyticsApi.trace({ ...ctx, kind, value: String(selected[key]) }, controller.signal)
      .then(setTrace)
      .catch((e) => { if (!isCancel(e)) setTraceError(e.message || 'Transactions unavailable'); });
    return () => controller.abort();
  }, [selected, ctx.start, ctx.end, ctx.client_id, ctx.area, ctx.time_of_day, ctx.order_type, ctx.weekday, ctx.menu_category, ctx.menu_recipe, title]);
  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [selected]);
  const Wrapper = compact ? 'div' : 'section';
  const fmtCell = (c, row) => c.format ? c.format(row[c.key]) : (typeof row[c.key] === 'object' && row[c.key] !== null ? JSON.stringify(row[c.key]) : row[c.key] ?? '—');
  return (
    <Wrapper className={compact ? '' : 'ui-panel'}>
      {!compact && (
        <div className="flex items-center justify-between gap-2.5">
          {title && <h3 className="ui-panel-title">{title} <span className="font-normal text-ink-muted">({number(rows.length)})</span></h3>}
          {toolbar}
        </div>
      )}
      <div className={`ui-table-wrap ${compact ? '!max-h-[225px]' : ''}`}>
        <table className="ui-table">
          <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.slice(0, expanded ? rows.length : 10).map((row, i) => (
              <tr key={i} className="cursor-pointer" tabIndex={0} onClick={() => setSelected(row)} onKeyDown={e => { if (e.key === 'Enter') setSelected(row); }} title="Open full record details">
                {columns.map(c => <td key={c.key}>{fmtCell(c, row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <div className="flex items-center justify-between gap-3 pt-2.5 text-ui text-ink-muted">
          <span>Showing {Math.min(rows.length, expanded ? rows.length : 10)} of {rows.length} rows</span>
          <button className="ui-btn !h-7" disabled={rows.length <= 10} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show first 10' : 'Show all ' + rows.length} <ChevronDown size={14} /></button>
        </div>
      )}
      {selected && (
        <div className="ui-backdrop !z-[1200] !justify-end !p-0" onMouseDown={() => setSelected(null)}>
          <aside className="bg-surface w-[min(740px,96vw)] h-full overflow-y-auto p-6 shadow-modal-lg text-ink" role="dialog" aria-modal="true" aria-label={title + ' record details'} onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-5 border-b border-line-divider pb-5 mb-4">
              <div><small className="text-micro tracking-widest text-ink-muted">RECORD DETAILS</small><h2 className="text-page-title text-brand-dark mt-2">{title}</h2></div>
              <button className="ui-btn !h-7" onClick={() => setSelected(null)} aria-label="Close details">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(selected).map(([key, value]) => (
                <div className="border-b border-line-soft py-3 min-w-0 break-words" key={key}>
                  <span className="block text-ui-sm text-ink-muted capitalize mb-1">{columns.find(c => c.key === key)?.label || key.replace(/_/g, ' ')}</span>
                  <strong className="text-ui font-semibold">{columns.find(c => c.key === key)?.format?.(value) ?? (typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—'))}</strong>
                </div>
              ))}
            </div>
            <h3 className="text-body-sm font-bold text-brand-dark mt-6 mb-2.5">Related source transactions</h3>
            {traceError && <p className="ui-hint">{traceError}</p>}
            {!trace && !traceError && <p className="ui-hint">Loading underlying transactions…</p>}
            {trace && (
              <>
                <p className="ui-hint">{number(trace.total)} matching records · showing up to 100. {trace.note}</p>
                <div className="grid gap-2">
                  {(trace.transactions || []).map((t, i) => (
                    <details key={i} className="border border-line rounded-button bg-brand-tint p-2.5">
                      <summary className="cursor-pointer flex flex-wrap justify-between gap-2 text-ui"><b>{t.order || t.transaction_id || 'Transaction'}</b><span className="text-ink-muted">{t.date?.slice(0, 16)} · {t.status || t.movement || ''} · {t.order_value !== undefined ? money(t.order_value) : t.quantity + ' ' + (t.unit || '')}</span></summary>
                      <div className="pt-2.5 px-1 pb-0.5 text-ui text-ink-soft space-y-1">
                        {t.table && <p>Table: {t.table} · Area: {t.area || '—'} · Handler: {t.handler || '—'}</p>}
                        {t.invoice && <p>Invoice: {t.invoice} · Payment: {t.payment_status || '—'}</p>}
                        {t.items?.map((i, j) => <p key={j}>{i.item} × {i.quantity} · {i.status || '—'} · {i.line_total !== undefined ? money(i.line_total) : ''}</p>)}
                        {t.reference && <p>Reference: {t.reference} · Before: {t.before ?? '—'} · After: {t.after ?? '—'}</p>}
                        {t.movements?.map((m, j) => <p key={j}>{m.id} · {m.type} · {m.quantity} {m.unit} · Order/reference {m.order}</p>)}
                      </div>
                    </details>
                  ))}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </Wrapper>
  );
}

function HRSelect({ label, value, options, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const chosen = value === 'all' ? 'All' : (options.find(o => o.value === value)?.label || value);
  return (
    <div className="ui-filter relative">
      <small className="ui-filter-label">{label}</small>
      <button type="button" className="ui-filter-control flex items-center justify-between gap-2 text-left cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis disabled:cursor-default disabled:opacity-60" disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>{chosen}<span className="ml-auto text-brand">▾</span></button>
      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1 max-h-80 min-w-[190px] w-max max-w-[280px] overflow-auto bg-surface border border-brand-line rounded-panel shadow-modal-lg p-1.5 z-[5000]" role="listbox">
          {options.map(o => (
            <button type="button" role="option" aria-selected={value === o.value} key={o.value}
              className={`block w-full text-left px-2 py-1.5 rounded-seg text-ui cursor-pointer hover:bg-brand-light hover:text-brand-dark ${value === o.value ? 'bg-brand-light text-brand-dark' : 'text-ink'}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ── Reusable card grids ──────────────────────────────────────────────────────
const SummaryGrid = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-tiles mt-3">{children}</div>;
const StatusGrid = ({ children }) => <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start mt-3.5">{children}</div>;
const CardHead = ({ title, children }) => (
  <div className="flex items-start justify-between gap-1.5 mb-2">
    <h4 className="text-ui font-bold text-ink flex-1 min-w-0">{title}</h4>
    {children}
  </div>
);
const Block = ({ children, className = '' }) => <section className={`my-4 ${className}`}>{children}</section>;

// Layout: analytics body with a right-hand rail of analytics modes (stacks on small screens)
const ModeLayout = ({ rail, children }) => (
  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_120px] gap-3.5 items-stretch">
    {rail}
    <div className="min-w-0 lg:order-1">{children}</div>
  </div>
);

// Loading / error banner shared by every dashboard
const LoadState = ({ loading, error, children = 'Loading…' }) => (
  <>
    {loading && !error && <section className="ui-panel text-ui text-ink-muted">{children}</section>}
    {error && <section className="ui-error">{error}</section>}
  </>
);

// ── ORDERS ───────────────────────────────────────────────────────────────────
function OrdersDimensionSummary({ title, rows, itemLevel, categoryColumn, defaultView = 'table', chartKind = 'bar' }) {
  const [view, setView] = useState(defaultView);
  const columns = [{ key: 'name', label: categoryColumn ? 'Menu items' : 'Group' }, ...(categoryColumn ? [{ key: 'category', label: 'Category' }] : []), { key: 'total', label: itemLevel ? 'Ordered menu items' : 'Orders', format: number }];
  return (
    <section className="ui-card p-2.5 min-w-0 overflow-hidden">
      <CardHead title={title}><ViewToggle view={view} setView={setView} /></CardHead>
      {view === 'table' ? <DataTable compact title={title} rows={rows} columns={columns} limit={10} /> : <ChartPanel compact title={title} data={rows.slice(0, 12)} x="name" kind={chartKind} keys={[{ key: 'total', label: itemLevel ? 'Ordered menu items' : 'Orders', color: CHART_COLORS[0] }]} />}
    </section>
  );
}

function OrdersStatusCard({ title, rows, itemLevel, categoryColumn, defaultView = 'table', chartKind = 'bar' }) {
  const [view, setView] = useState(defaultView);
  const [measure, setMeasure] = useState('count');
  const states = ORDER_STATUSES;
  const columns = [{ key: 'name', label: categoryColumn ? 'Menu items' : title.replace('Orders by ', '') }, ...(categoryColumn ? [{ key: 'category', label: 'Category' }] : []), { key: 'total', label: itemLevel ? 'Ordered menu items' : 'Orders', format: number }, ...states.map(st => measure === 'count' ? { key: st, label: st, format: number } : { key: st + '_pct', label: st + ' %', format: (v) => Number(v || 0).toFixed(1) + '%' })];
  const chartData = measure === 'count' ? rows : rows.map(r => ({ ...r, ...Object.fromEntries(states.map(st => [st, r[st + '_pct']])) }));
  return (
    <section className="ui-card p-2.5 min-w-0 overflow-hidden">
      <CardHead title={title}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Seg small value={measure} onChange={setMeasure} options={[['count', 'Count'], ['percent', '%']]} />
          <ViewToggle view={view} setView={setView} />
        </div>
      </CardHead>
      {view === 'table' ? <DataTable compact title={title} rows={rows} columns={columns} limit={10} /> : <ChartPanel compact title={title} data={chartData.slice(0, 12)} x="name" kind={chartKind} keys={states.map((st, i) => ({ key: st, label: st, color: CHART_COLORS[i % CHART_COLORS.length] }))} />}
    </section>
  );
}

const TIMING_DIMS = [['service', 'Service type'], ['area', 'Dining area'], ['table', 'Tables'], ['category', 'Menu category'], ['item', 'Menu item'], ['kitchen', 'Kitchen counter'], ['employee', 'Employees']];
const STAGES = [['pending_to_served', 'Pending → Served'], ['preparing_to_ready', 'Preparing → Ready']];
const minutesFmt = (v) => v == null ? '—' : Number(v).toFixed(1);

function OrdersTimingDetails({ data }) {
  const [stage, setStage] = useState('pending_to_served');
  const [dimension, setDimension] = useState('service');
  const [view, setView] = useState('table');
  const key = dimension;
  const rows = data.synthetic_timing_dimensions?.[stage]?.[key] || [];
  const columns = [{ key: 'name', label: key === 'item' ? 'Menu items' : 'Group' }, ...(key === 'item' ? [{ key: 'category', label: 'Category' }] : []), { key: 'count', label: 'Orders', format: number }, { key: 'avg_minutes', label: 'Average (min)', format: minutesFmt }, { key: 'median_minutes', label: 'Median (min)', format: minutesFmt }, { key: 'min_minutes', label: 'Shortest (min)', format: minutesFmt }, { key: 'max_minutes', label: 'Longest (min)', format: minutesFmt }];
  return (
    <section className="ui-panel">
      <SectionHead>Order Processing Times</SectionHead>
      <div className="flex flex-wrap items-center justify-between gap-6 my-2 mb-3">
        <Chips options={STAGES} value={stage} onChange={setStage} />
        <Chips className="ml-auto justify-end" options={TIMING_DIMS} value={dimension} onChange={setDimension} />
        <Seg value={view} onChange={setView} options={[['table', 'Table'], ['chart', 'Chart']]} />
      </div>
      {view === 'table' ? <DataTable title={stage === 'pending_to_served' ? 'Pending to Served by ' + dimension : 'Preparing to Ready by ' + dimension} rows={rows} columns={columns} limit={10} /> : <ChartPanel title="Average processing minutes" data={rows} x="name" kind="bar" keys={[{ key: 'avg_minutes', label: 'Average (min)', color: CHART_COLORS[0] }]} />}
    </section>
  );
}

function MenuItemsProcessingTimes({ data }) {
  const [stage, setStage] = useState('pending_to_served');
  const [dimension, setDimension] = useState('item');
  const [view, setView] = useState('table');
  const dims = TIMING_DIMS.map(([k, l]) => k === 'item' ? ['item', 'Orders'] : [k, l]);
  const key = dimension;
  const rows = data?.item_timing_dimensions?.[stage]?.[key] || [];
  const columns = [{ key: 'name', label: key === 'item' ? 'Menu item' : 'Group' }, ...(key === 'item' ? [{ key: 'category', label: 'Category' }] : []), { key: 'count', label: 'Items', format: number }, { key: 'avg_minutes', label: 'Average (min)', format: minutesFmt }, { key: 'median_minutes', label: 'Median (min)', format: minutesFmt }, { key: 'min_minutes', label: 'Shortest (min)', format: minutesFmt }, { key: 'max_minutes', label: 'Longest (min)', format: minutesFmt }];
  return (
    <section className="ui-panel">
      <SectionHead>Items Processing Times</SectionHead>
      <p className="ui-hint">Item preparation durations are not recorded. Average, median, shortest and longest times are unavailable until item-level stage timestamps are captured.</p>
      <div className="flex flex-wrap items-center justify-between gap-6 my-2 mb-3">
        <Chips options={STAGES} value={stage} onChange={setStage} />
        <Chips className="ml-auto justify-end" options={dims} value={dimension} onChange={setDimension} />
        <Seg value={view} onChange={setView} options={[['table', 'Table'], ['chart', 'Chart']]} />
      </div>
      {view === 'table' ? <DataTable title={(stage === 'pending_to_served' ? 'Pending to Served' : 'Preparing to Ready') + ' by ' + dimension} rows={rows} columns={columns} limit={10} /> : <ChartPanel title="Item processing minutes" data={rows.filter(r => r.avg_minutes != null)} x="name" kind="bar" keys={[{ key: 'avg_minutes', label: 'Average (min)', color: CHART_COLORS[0] }]} />}
    </section>
  );
}

function OrdersActionQueues({ data }) {
  const [focus, setFocus] = useState('Preparing');
  const [expanded, setExpanded] = useState(null);
  const cases = data.diagnostic_cases || [];
  const queueFor = (c) => c.kind === 'cancel' || String(c.status).toLowerCase() === 'cancelled' ? 'Cancelled' : (['Pending', 'Preparing', 'Ready'].find(s => s.toLowerCase() === String(c.status || '').toLowerCase()) || 'Other');
  const queues = ['Ready', 'Preparing', 'Pending', 'Cancelled'];
  const grouped = Object.fromEntries(queues.map(q => [q, cases.filter(c => queueFor(c) === q)]));
  const visible = grouped[focus] || [];
  const itemState = (i) => String(i.status || 'Unknown').toLowerCase();
  const activeItems = (c) => (c.items || []).filter(i => !['served', 'cancelled'].includes(itemState(i)));
  const counterText = (items) => [...new Set(items.map(i => i.counter).filter(Boolean))].join(', ') || 'Not recorded';
  const priority = (c) => {
    const items = activeItems(c);
    const counterCount = new Set(items.map(i => i.counter).filter(Boolean)).size;
    const age = c.age_minutes == null ? NaN : Number(c.age_minutes);
    const ageText = Number.isFinite(age) && age >= 0 ? (age < 60 ? `${Math.round(age)} min` : (age < 1440 ? `${Math.floor(age / 60)} hr ${Math.round(age % 60)} min` : `${Math.floor(age / 1440)} d ${Math.floor((age % 1440) / 60)} hr`)) + ' old' : 'Age unavailable';
    return [ageText, counterCount > 1 ? 'Multiple counters' : null].filter(Boolean).join(' · ');
  };
  const attention = (c) => {
    const items = activeItems(c);
    const ready = items.filter(i => itemState(i) === 'ready');
    const preparing = items.filter(i => itemState(i) === 'preparing');
    const pending = items.filter(i => itemState(i) === 'pending');
    const named = (list) => list.slice(0, 2).map(i => i.name).join(', ') + (list.length > 2 ? ` +${list.length - 2} more` : '');
    if (queueFor(c) === 'Ready') return `Confirm pickup and service for ${named(ready.length ? ready : items) || 'the ready order'} at ${c.table && c.table !== 'Unknown' ? 'table ' + c.table : 'the recorded service location'}.`;
    if (queueFor(c) === 'Preparing') return `${ready.length ? `${ready.length} item(s) recorded Ready; coordinate service where permitted. ` : ''}${preparing.length ? `Follow up on ${named(preparing)} at ${counterText(preparing)}.` : `Confirm current preparation status with ${counterText(items)}.`}${pending.length ? ` ${pending.length} item(s) still recorded Pending.` : ''}`;
    if (queueFor(c) === 'Pending') return `Confirm kitchen receipt and start of preparation for ${named(pending.length ? pending : items) || 'this order'} at ${counterText(items)}.`;
    return 'Review the cancellation record and establish the reason; no cause is recorded in these case details.';
  };
  const allCount = queues.reduce((n, q) => n + grouped[q].length, 0);
  return (
    <section className="mt-4">
      <MetricGrid items={[['Order-level cases', number(allCount)], ['Open Orders', number(grouped.Ready.length + grouped.Preparing.length + grouped.Pending.length)], ['Cancelled Orders', number(grouped.Cancelled.length)]]} />
      <div className="flex flex-wrap items-center justify-between gap-3 my-3">
        <h4 className="text-body-sm font-bold text-brand-dark">Action queues</h4>
        <Seg value={focus} onChange={(q) => { setFocus(q); setExpanded(null); }} options={queues.map(q => [q, `${q} (${number(grouped[q].length)})`])} />
      </div>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead><tr><th>Order / status</th><th>Service / area / table</th><th>Items requiring attention</th><th>Kitchen counter</th><th>Recorded staff</th><th>Priority indicators</th><th>Attention</th><th>Details</th></tr></thead>
          <tbody>
            {visible.map(c => {
              const items = activeItems(c);
              const shown = items.length ? items : (c.items || []);
              const id = String(c.id);
              return (
                <React.Fragment key={id}>
                  <tr>
                    <td><strong>{id}</strong><div>{c.status}</div></td>
                    <td>{[c.service, c.area, c.table && c.table !== 'Unknown' ? `Table ${c.table}` : null].filter(Boolean).join(' · ')}</td>
                    <td>{shown.slice(0, 3).map(i => `${i.name} (${i.status || 'Unknown'})`).join(', ') || 'Not recorded'}{shown.length > 3 ? ` +${shown.length - 3} more` : ''}</td>
                    <td>{counterText(shown)}</td>
                    <td>Order taken: {c.order_taker || 'Unknown'}{c.assigned_handler && c.assigned_handler !== 'Unassigned' ? ` · Assigned: ${c.assigned_handler}` : ''}</td>
                    <td>{priority(c)}</td>
                    <td>{attention(c)}</td>
                    <td><button className="ui-btn !h-7" onClick={() => setExpanded(expanded === id ? null : id)} aria-expanded={expanded === id}>{expanded === id ? 'Hide' : 'View'}</button></td>
                  </tr>
                  {expanded === id && (
                    <tr><td colSpan={8} className="!bg-brand-tint !p-3.5 text-ui space-y-1.5">
                      <strong>Order {id} — recorded details</strong>
                      <p className="text-ink-soft"><b>Items and statuses:</b> {(c.items || []).map(i => `${i.name} (${i.status || 'Unknown'})`).join(', ') || 'No linked items'}</p>
                      <p className="text-ink-soft"><b>Counter routing:</b> {counterText(c.items || [])}</p>
                      <p className="text-ink-soft"><b>Order taker:</b> {c.order_taker || 'Unknown'} · <b>Assigned handler:</b> {c.assigned_handler || 'Not recorded'} · <b>Last updated by:</b> {c.last_updated_by || 'Not recorded'}</p>
                      <p className="text-ink-soft"><b>Placed:</b> {c.created_at || 'Not recorded'} · <b>Latest update:</b> {c.updated_at || 'Not recorded'}</p>
                      <p className="text-ink-soft"><b>Age:</b> {c.age_minutes == null ? 'Not available' : `${Math.round(Number(c.age_minutes))} minutes`}</p>
                    </td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && <div className="ui-panel text-ui text-ink-muted">No {focus.toLowerCase()} orders in the selected filters.</div>}
    </section>
  );
}

function OrdersDiagnostic({ data }) {
  const cases = data.diagnostic_cases || [];
  const dimensionName = (c) => [c.service, c.area, c.table && c.table !== 'Unknown' ? `Table ${c.table}` : null].filter(Boolean).join(' · ');
  const itemCount = (c) => (c.items || []).length;
  const elapsed = (c) => {
    const a = Date.parse(String(c.created_at || ''));
    const b = Date.parse(String(c.updated_at || ''));
    return Number.isFinite(a) && Number.isFinite(b) && b >= a ? (b - a) / 60000 : null;
  };
  const insights = data.diagnostic_insights || [];
  return (
    <section className="mt-4">
      <SectionHead>Diagnostic Analytics — What is driving these order patterns?</SectionHead>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3.5">
        {insights.map(f => (
          <article className="ui-card p-4 min-w-0" key={f.key}>
            <span className="text-micro font-bold tracking-widest text-brand">{f.label}</span>
            <h4 className="text-body-sm font-bold text-ink mt-2 mb-1.5">{f.title}</h4>
            <p className="text-ui text-ink-soft leading-relaxed">{f.finding}</p>
            <div className="text-ui leading-relaxed py-2 border-t border-line-soft mt-2 text-ink-soft"><strong>What the records suggest:</strong> {f.basis}</div>
            <div className="text-ui leading-relaxed py-2 border-t border-line-soft mt-2 text-ink-muted"><strong>What we still cannot explain:</strong> {f.question}</div>
            <details className="mt-3 border-t border-line-soft pt-2.5">
              <summary className="cursor-pointer text-ui font-bold text-brand-dark hover:underline">See orders behind this finding ({f.rows.length} shown)</summary>
              {f.rows.length ? (
                <div className="ui-table-wrap !max-h-[245px]">
                  <table className="ui-table">
                    <thead><tr><th>Order</th><th>Status</th><th>Location</th><th>Items</th><th>Recorded interval</th></tr></thead>
                    <tbody>{f.rows.map((c, i) => <tr key={String(c.id) + i}><td>{c.id}</td><td>{c.status}</td><td>{dimensionName(c)}</td><td>{itemCount(c)}</td><td>{elapsed(c) == null ? '—' : `${elapsed(c).toFixed(0)} min`}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <p className="ui-hint">No individual records meet the evidence rule.</p>}
            </details>
          </article>
        ))}
      </div>
      {!cases.length && <div className="ui-panel text-ui text-ink-muted">No recorded orders match the selected filters.</div>}
    </section>
  );
}

function OrdersPredictive({ data }) {
  const hourly = data.order_dimensions?.hour || [];
  const services = data.order_dimensions?.service || [];
  const counters = data.item_dimensions?.kitchen || [];
  const cases = data.diagnostic_cases || [];
  const positive = (rows) => rows.filter(r => Number(r.total) > 0).map(r => ({ name: String(r.name || 'Not recorded'), total: Number(r.total) })).sort((a, b) => b.total - a.total);
  const hours = positive(hourly), channels = positive(services), kitchen = positive(counters);
  const topHour = hours[0], topKitchen = kitchen[0], topChannel = channels[0];
  const open = cases.filter(c => ['pending', 'preparing', 'ready'].includes(String(c.status || '').toLowerCase()));
  const multicounter = open.filter(c => new Set((c.items || []).map(i => i.counter).filter(Boolean)).size > 1);
  const totalHours = hours.reduce((sum, h) => sum + h.total, 0);
  const totalKitchen = kitchen.reduce((sum, k) => sum + k.total, 0);
  const share = (part, total) => total ? `${Math.round(part * 100 / total)}%` : '';
  const cards = [
    { tag: 'BUSY HOURS', heading: topHour ? `Expect more orders around ${topHour.name} on similar days` : 'Busy-hour pattern not available', detail: topHour ? `This hour accounted for ${number(topHour.total)} orders (${share(topHour.total, totalHours)} of orders with an hour recorded). It is a past pattern, not a guaranteed rush.` : 'There are no recorded hourly orders for the selected filters.', focus: 'Check whether enough staff and kitchen capacity are available around this hour.', evidence: hours.map(h => ({ name: h.name, count: h.total, percent: share(h.total, totalHours) })), first: 'Hour', second: 'Orders' },
    { tag: 'KITCHEN WORKLOAD', heading: topKitchen ? `${topKitchen.name} may need the most kitchen capacity` : 'Kitchen workload pattern not available', detail: topKitchen ? `This counter handled ${number(topKitchen.total)} recorded item lines (${share(topKitchen.total, totalKitchen)} of routed item lines). A similar menu mix could put more work here.` : 'No kitchen-counter item activity is available for the selected filters.', focus: 'Review preparation capacity for this counter before a similar busy period.', evidence: kitchen.map(k => ({ name: k.name, count: k.total, percent: share(k.total, totalKitchen) })), first: 'Kitchen counter', second: 'Item lines' },
    { tag: 'ORDERS THAT MAY NEED COORDINATION', heading: open.length ? `${number(open.length)} unfinished orders in the selected records` : 'No unfinished orders in the selected records', detail: open.length ? `${number(multicounter.length)} of them involve more than one kitchen counter. These are recorded unfinished orders, not a prediction of future delays.` : 'No Pending, Preparing or Ready orders were found in the selected records.', focus: open.length ? 'Review the current operational queues to understand whether the same pattern is recurring.' : 'Continue checking comparable periods as more orders are recorded.', evidence: [{ name: 'Pending', count: open.filter(c => String(c.status || '').toLowerCase() === 'pending').length }, { name: 'Preparing', count: open.filter(c => String(c.status || '').toLowerCase() === 'preparing').length }, { name: 'Ready', count: open.filter(c => String(c.status || '').toLowerCase() === 'ready').length }, { name: 'Across multiple counters', count: multicounter.length }], first: 'Recorded group', second: 'Orders' },
  ];
  return (
    <section>
      <SectionHead>Predictive Analytics — What should we prepare for?</SectionHead>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
        {cards.map(c => (
          <article className="ui-card p-4 min-w-0" key={c.tag}>
            <span className="text-micro font-bold tracking-widest text-brand">{c.tag}</span>
            <h4 className="text-body font-bold text-ink my-2.5">{c.heading}</h4>
            <p className="text-ui text-ink-soft leading-relaxed mb-3.5">{c.detail}</p>
            <div className="text-ui leading-relaxed bg-brand-tint border border-brand-line rounded-button p-2.5 text-ink-soft"><strong>What this means:</strong> {c.focus}</div>
            <details className="mt-3 border-t border-line-soft pt-2.5">
              <summary className="cursor-pointer text-ui font-bold text-brand-dark hover:underline">View supporting evidence</summary>
              <p className="ui-hint">Recorded data behind this finding (not proof of future demand).</p>
              <div className="ui-table-wrap !max-h-[280px]">
                <table className="ui-table">
                  <thead><tr><th>{c.first}</th><th>{c.second}</th>{c.evidence.some(r => r.percent !== undefined) && <th>Share</th>}</tr></thead>
                  <tbody>{c.evidence.length ? c.evidence.map(r => <tr key={r.name}><td>{r.name}</td><td>{number(r.count)}</td>{c.evidence.some(v => v.percent !== undefined) && <td>{r.percent || '—'}</td>}</tr>) : <tr><td colSpan={3}>No supporting records for the selected filters.</td></tr>}</tbody>
                </table>
              </div>
            </details>
          </article>
        ))}
      </div>
      {topChannel && <div className="ui-panel mt-3 text-ui text-ink-soft"><strong>Service pattern:</strong> {topChannel.name} had the most recorded orders ({number(topChannel.total)}). This can help plan staffing for a comparable service period.</div>}
    </section>
  );
}

function OrdersPrescriptive({ data }) {
  return <section><SectionHead>Prescriptive Analytics — What should we do?</SectionHead><OrdersActionQueues data={data} /></section>;
}

function OrderDemandTrends({ params }) {
  const { data } = useAnalytics('demandTrends', params);
  return <MenuDemandTrends trends={data?.trends || {}} title="Order demand over time" measure="orders" />;
}

function OperationsDashboard({ params }) {
  const [analyticsMode, setAnalyticsMode] = useState('descriptive');
  const { data, error, loading: busy } = useAnalytics('operations', params);
  const k = data?.kpis || {};
  const rowsFor = (key) => (['category', 'item', 'kitchen'].includes(key) ? data.item_dimensions?.[key] : data.order_dimensions?.[key]) || [];
  const isItem = (key) => ['category', 'item', 'kitchen'].includes(key);
  const summaryCards = [
    { key: 'service', title: 'Orders by Service type', view: 'chart', kind: 'pie' },
    { key: 'area', title: 'Orders by Dining Area', view: 'table', kind: 'bar' },
    { key: 'table', title: 'Orders by Tables', view: 'chart', kind: 'bar' },
    { key: 'item', title: 'Orders by Menu item', view: 'table', kind: 'bar' },
    { key: 'category', title: 'Orders by Menu category', view: 'chart', kind: 'pie' },
    { key: 'kitchen', title: 'Orders by kitchen counters', view: 'table', kind: 'pie' },
    { key: 'employee', title: 'Orders by Employees', view: 'chart', kind: 'bar' },
    { key: 'hour', title: 'Orders by Time', view: 'chart', kind: 'line' },
  ];
  const statusCards = [
    { key: 'service', title: 'Orders by Service type', view: 'chart', kind: 'bar' },
    { key: 'area', title: 'Orders by Dining Area', view: 'table', kind: 'bar' },
    { key: 'table', title: 'Orders by Tables', view: 'table', kind: 'bar' },
    { key: 'category', title: 'Orders by Menu category', view: 'chart', kind: 'bar' },
    { key: 'item', title: 'Orders by Menu item', view: 'chart', kind: 'bar' },
    { key: 'kitchen', title: 'Orders by Kitchen counter', view: 'table', kind: 'bar' },
    { key: 'employee', title: 'Orders by Employees', view: 'table', kind: 'bar' },
    { key: 'hour', title: 'Orders by Time', view: 'chart', kind: 'line' },
  ];
  const modes = [['descriptive', 'Descriptive'], ['diagnostic', 'Diagnostic'], ['predictive', 'Predictive'], ['prescriptive', 'Prescriptive']];
  const status = (msg) => <LoadState loading={busy} error={error}>{msg}</LoadState>;
  return (
    <ModeLayout rail={
      <aside className="flex flex-row lg:flex-col gap-2 p-2.5 bg-surface border border-line rounded-panel shadow-panel lg:order-2" aria-label="Orders analytics views">
        {modes.map(([m, label]) => <button key={m} type="button" aria-pressed={analyticsMode === m} onClick={() => setAnalyticsMode(m)} className={`ui-btn flex-1 lg:flex-none !h-auto py-2.5 ${analyticsMode === m ? 'ui-btn-add' : ''}`}>{label}</button>)}
      </aside>}>
      {analyticsMode === 'descriptive' && (
        <>
          <MetricGrid items={[['Orders', number(k.orders)], ['Orders Served', number(k.served)], ['Orders Pending', number(k.pending)], ['Orders Preparing', number(k.preparing)], ['Orders Ready', number(k.ready)], ['Orders Cancelled', number(k.cancelled)]]} />
          {status('Loading operational status…')}
          {data && (
            <>
              <Block><SectionHead>Orders across restaurant operations</SectionHead><SummaryGrid>{summaryCards.map(card => <OrdersDimensionSummary key={card.key} defaultView={card.view} chartKind={card.kind} title={card.title} rows={rowsFor(card.key)} itemLevel={isItem(card.key)} categoryColumn={card.key === 'item'} />)}</SummaryGrid></Block>
              <Block><SectionHead>Operational status by business dimension</SectionHead><StatusGrid>{statusCards.map(card => <OrdersStatusCard key={card.key} defaultView={card.view} chartKind={card.kind} title={card.title} rows={rowsFor(card.key)} itemLevel={isItem(card.key)} categoryColumn={card.key === 'item'} />)}</StatusGrid></Block>
              <OrderDemandTrends params={params} /><OrdersTimingDetails data={data} />
            </>
          )}
        </>
      )}
      {analyticsMode === 'diagnostic' && <>{status('Loading diagnostic analysis…')}{data && <OrdersDiagnostic data={data} />}</>}
      {analyticsMode === 'predictive' && <>{status('Loading predictive planning signals…')}{data && <OrdersPredictive data={data} />}</>}
      {analyticsMode === 'prescriptive' && <>{status('Loading suggested next steps…')}{data && <OrdersPrescriptive data={data} />}</>}
    </ModeLayout>
  );
}

// ── SERVICES ─────────────────────────────────────────────────────────────────
function ServicesDashboard({ params }) {
  const { data, error, loading } = useAnalytics('services', params);
  const seats = (v) => v == null ? 'Unknown' : number(v);
  return (
    <ModeLayout>
      <LoadState loading={loading} error={error}>Loading services analytics…</LoadState>
      {data && (
        <>
          <MetricGrid items={[['Total Service Types', number(4)], ['Dine-in Areas', number(data.kpis.dining_areas)], ['Total Dine-in Tables', number(data.kpis.configured_tables)], ['Dine-in Occupancy Coverage', String(data.kpis.occupancy_pct) + '%'], ['Occupied Tables', number(data.kpis.occupied_tables)], ['Vacant Tables', number(data.kpis.vacant_tables)]]} />
          <section className="ui-panel"><SectionHead>Dining Area Availability</SectionHead><DataTable title="" rows={data.floor_capacity || []} columns={[{ key: 'area', label: 'Dining area' }, { key: 'total_tables', label: 'Tables', format: number }, { key: 'seating_capacity', label: 'Seats', format: seats }, { key: 'occupied', label: 'Occupied', format: number }, { key: 'vacant', label: 'Vacant', format: number }, { key: 'other', label: 'Other status', format: number }, { key: 'occupancy_pct', label: 'Occupancy %', format: (v) => v + '%' }]} compact /></section>
          <section className="ui-panel"><SectionHead>Table Occupancy & Availability</SectionHead><DataTable title="" rows={data.table_availability || []} columns={[{ key: 'area', label: 'Dining area' }, { key: 'table', label: 'Table name' }, { key: 'seats', label: 'Seats', format: seats }, { key: 'status', label: 'Status' }, { key: 'usage_time', label: 'Usage time', format: (v) => v == null ? 'Not recorded' : String(v) }, { key: 'expected_available', label: 'Expected availability' }]} compact /></section>
          <section className="ui-panel"><SectionHead>Vacant Dine-in Tables</SectionHead><DataTable title="" rows={data.vacant_table_list || []} columns={[{ key: 'area', label: 'Dining area' }, { key: 'table', label: 'Table name' }, { key: 'seats', label: 'Seats', format: seats }]} compact /></section>
        </>
      )}
    </ModeLayout>
  );
}

// ── BILLING ──────────────────────────────────────────────────────────────────
function BillingStatusCard({ title, rows, statuses }) {
  const [view, setView] = useState('table');
  const [measure, setMeasure] = useState('count');
  const columns = [{ key: 'name', label: 'Group' }, { key: 'total', label: 'Invoices', format: number }, ...statuses.map(st => measure === 'count' ? { key: st, label: st, format: number } : { key: st + '_pct', label: st + ' %', format: (v) => Number(v || 0).toFixed(1) + '%' })];
  const chartRows = measure === 'count' ? rows : rows.map(r => ({ ...r, ...Object.fromEntries(statuses.map(st => [st, r[st + '_pct']])) }));
  return (
    <section className="ui-card p-2.5 min-w-0 overflow-hidden">
      <CardHead title={title}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Seg small value={measure} onChange={setMeasure} options={[['count', 'Count'], ['percent', '%']]} />
          <ViewToggle view={view} setView={setView} />
        </div>
      </CardHead>
      {view === 'table' ? <DataTable compact title="" rows={rows} columns={columns} /> : <ChartPanel compact title={title} data={chartRows} x="name" kind="bar" keys={statuses.map((st, i) => ({ key: measure === 'count' ? st : st + '_pct', label: st, color: CHART_COLORS[i % CHART_COLORS.length] }))} />}
    </section>
  );
}

function BillingDimensionCard({ title, rows }) {
  const [view, setView] = useState(title === 'Invoices by Service type' || title === 'Invoices by Payment method' ? 'chart' : 'table');
  return (
    <section className="ui-card p-2.5 min-w-0 overflow-hidden">
      <CardHead title={title}><ViewToggle view={view} setView={setView} /></CardHead>
      {view === 'table' ? <DataTable compact title="" rows={rows} columns={[{ key: 'name', label: 'Group' }, { key: 'total', label: 'Invoices', format: number }, { key: 'amount', label: 'Billed amount', format: money }]} /> : <ChartPanel compact title={title} data={rows} x="name" kind={title === 'Invoices by Payment method' ? 'pie' : 'bar'} keys={[{ key: 'total', label: 'Invoices', color: CHART_COLORS[0] }]} />}
    </section>
  );
}

function BillingLive({ params }) {
  const [status, setStatus] = useState('all');
  const [docId, setDocId] = useState('');
  const { data, error } = useAnalytics('billingLive', { ...params, ...(status !== 'all' ? { status } : {}) });
  const { data: itemsData, error: itemsError } = useAnalytics('billingItems', { client_id: params.client_id, document_id: docId }, { enabled: !!docId });
  const items = itemsData ? (itemsData.items || []) : null;
  if (error) return <section className="ui-error">{error}</section>;
  if (!data) return <section className="ui-panel text-ui text-ink-muted">Loading billing records…</section>;
  const k = data.kpis || {};
  const docs = data.documents || [];
  const itemCols = items && items.length ? Object.keys(items[0]).filter(c => !['client_id'].includes(c)).slice(0, 10).map(c => ({ key: c, label: c.replace(/_/g, ' ') })) : [];
  return (
    <Block>
      <SectionHead>Billing records (live)</SectionHead>
      <p className="ui-hint">{data.note}</p>
      <MetricGrid items={[['Billing documents', number(k.documents)], ['Document value', money(k.amount)], ['Marked paid', money(k.paid_amount)], ['Outstanding', money(k.outstanding)], ['Awaiting approval', number(k.pending_approval)]]} />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-tiles mb-stack">
        <ChartPanel title="Documents by payment status" data={data.by_payment_status || []} x="name" kind="pie" keys={[{ key: 'total', label: 'Documents', color: CHART_COLORS[0] }]} />
        <ChartPanel title="Documents by payment method" data={data.by_payment_method || []} x="name" kind="bar" keys={[{ key: 'amount', label: 'Value', color: CHART_COLORS[1] }]} />
      </div>
      <DataTable title="Billing documents" toolbar={<select className={SELECT} aria-label="Payment status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All payment statuses</option>{(data.statuses || []).map(s => <option key={s} value={s}>{s}</option>)}</select>} rows={docs} columns={[{ key: 'number', label: 'Document' }, { key: 'date', label: 'Date' }, { key: 'type', label: 'Type' }, { key: 'order_id', label: 'Order' }, { key: 'payment_status', label: 'Payment status' }, { key: 'payment_method', label: 'Method' }, { key: 'payment_due_date', label: 'Due' }, { key: 'approval_status', label: 'Approval' }, { key: 'amount', label: 'Amount', format: money }]} limit={20} />
      <section className="ui-panel">
        <div className="flex items-center justify-between gap-2.5"><h3 className="ui-panel-title">Items on a document</h3><select className={SELECT} aria-label="Billing document" value={docId} onChange={e => setDocId(e.target.value)}><option value="">Choose a document…</option>{docs.slice(0, 200).map(x => <option key={x.id} value={String(x.id)}>{x.number} · {x.date} · {money(x.amount)}</option>)}</select></div>
        {itemsError && <p className="ui-hint">{itemsError}</p>}
        {docId && !items && !itemsError && <p className="ui-hint">Loading items…</p>}
        {items && (items.length ? <DataTable compact title="" rows={items} columns={itemCols} limit={20} /> : <p className="ui-hint">No line items recorded for this document.</p>)}
      </section>
    </Block>
  );
}

function BillingDashboard({ params }) {
  const { data, error, loading } = useAnalytics('billing', params);
  const [grain, setGrain] = useState('day');
  const [trendView, setTrendView] = useState('chart');
  const dimensions = [['service', 'Service type'], ['area', 'Dining area'], ['table', 'Tables'], ['employee', 'Employees'], ['method', 'Payment method']];
  const trendRows = data?.trends?.[grain] || [];
  return (
    <ModeLayout>
      <LoadState loading={loading} error={error}>Loading billing analytics…</LoadState>
      {data && (
        <>
          <MetricGrid items={[['Total Invoices', number(data.kpis.invoices)], ['Billed Amount', money(data.kpis.billed)], ['Marked Paid', money(data.kpis.paid_recorded)], ['Not Marked Paid', money(data.kpis.not_marked_paid)], ['Average Bill', money(data.kpis.average_bill)], ['Tax Amount', money(data.kpis.tax)], ['Discount Amount', money(data.kpis.discount)]]} />
          <Block><SectionHead>Billing across restaurant operations</SectionHead><SummaryGrid>{dimensions.map(([key, label]) => <BillingDimensionCard key={key} title={'Invoices by ' + label} rows={data.dimensions[key] || []} />)}</SummaryGrid></Block>
          <Block><SectionHead>Operational status by business dimension</SectionHead><StatusGrid>{dimensions.map(([key, label]) => <BillingStatusCard key={key} title={'Invoices by ' + label} rows={data.dimensions[key] || []} statuses={data.statuses || []} />)}</StatusGrid></Block>
          <Block>
            <SectionHead>Billing demand over time</SectionHead>
            <div className="flex flex-wrap items-center justify-between gap-6 my-2 mb-3">
              <Chips options={[['hour', 'Hour on hour'], ['weekday', 'Weekday on weekday'], ['day', 'Day on day'], ['week', 'Week on week'], ['month', 'Month on month']]} value={grain} onChange={setGrain} />
              <Seg value={trendView} onChange={setTrendView} options={[['table', 'Table'], ['chart', 'Chart']]} />
            </div>
            {trendView === 'table' ? <DataTable title="" rows={trendRows} columns={[{ key: 'name', label: 'Period' }, { key: 'invoices', label: 'Invoices', format: number }, { key: 'amount', label: 'Billed amount', format: money }, { key: 'previous', label: 'Previous period', format: (v) => v == null ? '—' : money(v) }, { key: 'change_pct', label: 'Change %', format: (v) => v == null ? '—' : Number(v).toFixed(1) + '%' }]} /> : <ChartPanel title="Billed amount by period" data={trendRows} x="name" kind="line" keys={[{ key: 'amount', label: 'Billed amount', color: CHART_COLORS[0] }]} />}
          </Block>
          <section className="ui-panel"><SectionHead>Invoice Evidence</SectionHead><DataTable title="" compact rows={data.invoices || []} columns={[{ key: 'number', label: 'Invoice' }, { key: 'order_id', label: 'Order' }, { key: 'date', label: 'Date' }, { key: 'service', label: 'Service' }, { key: 'method', label: 'Payment method' }, { key: 'status', label: 'Payment status' }, { key: 'amount', label: 'Amount', format: money }]} limit={20} /></section>
          <BillingLive params={params} />
        </>
      )}
    </ModeLayout>
  );
}

// ── SALES ────────────────────────────────────────────────────────────────────
function SalesDimensionCard({ title, rows, defaultView = 'table', financial = false, chartKind = 'bar' }) {
  const [view, setView] = useState(defaultView);
  const [measure, setMeasure] = useState('amount');
  const parts = [['net', 'Sales excl. GST'], ['gst', 'GST'], ['cost', 'Estimated inventory cost'], ['profit', 'Estimated gross profit']];
  const cols = financial ? [{ key: 'name', label: 'Business dimension' }, ...parts.map(([key, label]) => ({ key: measure === 'amount' ? key : key + '_pct', label: measure === 'amount' ? label : label + ' %', format: measure === 'amount' ? money : (v) => Number(v || 0).toFixed(1) + '%' }))] : [{ key: 'name', label: 'Business dimension' }, { key: 'sales', label: 'Sales incl. GST', format: money }, { key: 'orders', label: 'Completed orders', format: number }];
  return (
    <section className="ui-card p-2.5 min-w-0 overflow-hidden">
      <CardHead title={title}>
        <div className="flex flex-wrap items-center gap-1.5">
          {financial && <Seg small value={measure} onChange={setMeasure} options={[['amount', '₹'], ['percent', '%']]} />}
          <ViewToggle view={view} setView={setView} />
        </div>
      </CardHead>
      {view === 'table' ? <DataTable compact title={title} rows={rows} columns={cols} /> : <ChartPanel compact title={title} data={rows.slice(0, 12)} x="name" kind={financial ? 'bar' : chartKind} keys={financial ? parts.map(([key, label], i) => ({ key: measure === 'amount' ? key : key + '_pct', label, color: CHART_COLORS[i] })) : [{ key: 'sales', label: 'Sales', color: CHART_COLORS[0] }]} />}
    </section>
  );
}

function SalesDashboard({ params }) {
  const { data, error, loading } = useAnalytics('sales', params);
  const [grain, setGrain] = useState('day');
  const [view, setView] = useState('table');
  const k = data?.kpis || {};
  const dimensions = [{ key: 'service', label: 'Service type', view: 'chart', kind: 'pie' }, { key: 'area', label: 'Dining Area', view: 'table', kind: 'bar' }, { key: 'table', label: 'Tables', view: 'chart', kind: 'bar' }, { key: 'item', label: 'Menu item', view: 'table', kind: 'bar' }, { key: 'category', label: 'Menu category', view: 'chart', kind: 'pie' }, { key: 'kitchen', label: 'kitchen counters', view: 'table', kind: 'bar' }, { key: 'employee', label: 'Employees', view: 'chart', kind: 'bar' }, { key: 'hour', label: 'Time', view: 'chart', kind: 'line' }];
  const periods = {};
  (data?.daily || []).forEach((x) => {
    const dt = new Date(String(x.date) + 'T12:00:00');
    const key = grain === 'day' ? String(x.date) : grain === 'month' ? String(x.date).slice(0, 7) : (() => { const t = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); const y = t.getUTCFullYear(); return y + '-W' + String(Math.ceil((((t.getTime() - Date.UTC(y, 0, 1)) / 86400000) + 1) / 7)).padStart(2, '0'); })();
    const p = periods[key] || (periods[key] = { name: key, sales: 0, net: 0, gst: 0, cost: 0, orders: 0 });
    for (const field of ['sales', 'net', 'gst', 'cost', 'orders']) p[field] += Number(x[field] || 0);
  });
  const trends = Object.values(periods).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return (
    <ModeLayout>
      <LoadState loading={loading} error={error}>Loading sales analytics…</LoadState>
      {data && (
        <>
          <MetricGrid items={[['Sales incl. GST', money(k.sales_including_gst)], ['Sales excl. GST', money(k.sales_excluding_gst)], ['GST', money(k.gst)], ['Estimated inventory cost', money(k.estimated_inventory_cost)], ['Estimated gross profit', money(k.estimated_gross_profit)], ['Estimated gross margin', k.estimated_gross_margin == null ? '—' : Number(k.estimated_gross_margin).toFixed(1) + '%']]} />
          <Block><SectionHead>Sales across restaurant operations</SectionHead><SummaryGrid>{dimensions.map(x => <SalesDimensionCard key={x.key} title={'Sales by ' + x.label} rows={data.dimensions?.[x.key] || []} defaultView={x.view} chartKind={x.kind} />)}</SummaryGrid></Block>
          <Block><SectionHead>Sales value and gross profit by business dimension</SectionHead><StatusGrid>{dimensions.map(x => <SalesDimensionCard key={x.key} title={'Sales by ' + x.label} rows={data.financial?.[x.key] || []} defaultView={x.view} chartKind={x.kind} financial />)}</StatusGrid></Block>
          <Block>
            <SectionHead>Sales demand over time</SectionHead>
            <div className="flex flex-wrap items-center justify-between gap-6 my-2 mb-3">
              <Chips options={[['day', 'Day on day'], ['week', 'Week on week'], ['month', 'Month on month']]} value={grain} onChange={setGrain} />
              <Seg value={view} onChange={setView} options={[['table', 'Table'], ['chart', 'Chart']]} />
            </div>
            {view === 'table' ? <DataTable title="Sales demand over time" rows={trends} columns={[{ key: 'name', label: 'Period' }, { key: 'orders', label: 'Completed orders', format: number }, { key: 'sales', label: 'Sales incl. GST', format: money }, { key: 'net', label: 'Sales excl. GST', format: money }, { key: 'gst', label: 'GST', format: money }]} /> : <ChartPanel title="Sales demand over time" data={trends} x="name" kind="line" keys={[{ key: 'sales', label: 'Sales incl. GST', color: CHART_COLORS[0] }]} />}
          </Block>
          <Block><DataTable title="Gross profit and GST summary" rows={[{ name: 'Completed sales including GST', amount: k.sales_including_gst }, { name: 'GST recorded', amount: k.gst }, { name: 'Sales excluding GST (order price less discounts)', amount: k.sales_excluding_gst }, { name: 'Estimated inventory cost of items sold', amount: k.estimated_inventory_cost }, { name: 'Estimated gross profit before operating expenses', amount: k.estimated_gross_profit }]} columns={[{ key: 'name', label: 'Measure' }, { key: 'amount', label: 'Amount', format: money }]} /></Block>
        </>
      )}
    </ModeLayout>
  );
}

// ── INVENTORY ────────────────────────────────────────────────────────────────
function InventoryLive({ params }) {
  const { data, error } = useAnalytics('inventoryLive', params);
  if (error) return <section className="ui-error">{error}</section>;
  if (!data) return <section className="ui-panel text-ui text-ink-muted">Loading inventory records…</section>;
  const k = data.kpis || {};
  const beforeAfter = (v) => v == null ? '—' : number(v);
  return (
    <Block>
      <SectionHead>Stock records (live)</SectionHead>
      <p className="ui-hint">{data.note}</p>
      <MetricGrid items={[['Inventory items', number(k.items)], ['Out of stock', number(k.out_of_stock)], ['Stock transactions (selected dates)', number(k.transactions_in_period)], ['Items with a recipe', number(k.items_with_recipe)], ['Ledger differences', number(k.ledger_mismatches)]]} />
      <DataTable title="Transactions by type" rows={data.by_type || []} columns={[{ key: 'type', label: 'Transaction type' }, { key: 'movement', label: 'In / out' }, { key: 'transactions', label: 'Transactions', format: number }, { key: 'items', label: 'Items affected', format: number }]} />
      <DataTable title="Recent stock transactions" rows={data.recent || []} columns={[{ key: 'date', label: 'When' }, { key: 'item', label: 'Item' }, { key: 'movement', label: 'In / out' }, { key: 'type', label: 'Type' }, { key: 'quantity', label: 'Quantity', format: number }, { key: 'unit', label: 'Unit' }, { key: 'before', label: 'Before', format: beforeAfter }, { key: 'after', label: 'After', format: beforeAfter }, { key: 'remarks', label: 'Remarks' }]} limit={15} />
      <DataTable title="Stock ledger vs item record" rows={data.ledger || []} columns={[{ key: 'item', label: 'Item' }, { key: 'unit', label: 'Unit' }, { key: 'received', label: 'Total in', format: number }, { key: 'used', label: 'Total out', format: number }, { key: 'ledger_balance', label: 'Ledger balance', format: number }, { key: 'row_availability', label: 'Item record', format: number }, { key: 'difference', label: 'Difference', format: number }]} limit={15} />
      <DataTable title="Inventory items" rows={data.items || []} columns={[{ key: 'name', label: 'Item' }, { key: 'inventory_id', label: 'Group' }, { key: 'realm', label: 'Realm' }, { key: 'availability', label: 'Available', format: number }, { key: 'unit', label: 'Unit' }, { key: 'unit_cost', label: 'Unit cost', format: money }, { key: 'unit_price', label: 'Unit price', format: money }, { key: 'has_recipe', label: 'Recipe', format: (v) => v ? 'Yes' : 'No' }]} limit={15} />
    </Block>
  );
}

function ItemCatalog({ params, kind }) {
  const inventoryId = kind === 'menu' ? MENU_INVENTORY_ID : STOCK_INVENTORY_ID;
  const { data, error } = useAnalytics('inventoryItems', { client_id: params.client_id, inventory_id: inventoryId });
  if (error) return <section className="ui-error">{error}</section>;
  if (!data) return <section className="ui-panel text-ui text-ink-muted">Loading…</section>;
  const rows = data.items || [];
  const cols = kind === 'menu'
    ? [{ key: 'name', label: 'Menu item' }, { key: 'category', label: 'Category' }, { key: 'unit_price', label: 'Price', format: money }, { key: 'unit_cost', label: 'Cost', format: money }, { key: 'has_recipe', label: 'Recipe', format: (v) => v ? 'Yes' : 'No' }]
    : [{ key: 'name', label: 'Ingredient' }, { key: 'category', label: 'Category' }, { key: 'availability', label: 'Available', format: number }, { key: 'unit', label: 'Unit' }, { key: 'unit_cost', label: 'Unit cost', format: money }, { key: 'unit_price', label: 'Unit price', format: money }];
  return <Block><DataTable title={`${kind === 'menu' ? 'Menu items' : 'Inventory items'} (inventory_id = ${inventoryId})`} rows={rows} columns={cols} limit={15} /></Block>;
}

function InventoryDashboard({ params, stockRows = [] }) {
  const { data, error, loading } = useAnalytics('inventoryPlan', params);
  const [selected, setSelected] = useState('');
  const [purchaseIngredient, setPurchaseIngredient] = useState('all');
  const plans = data?.plans || [];
  const chosen = plans.find(x => x.name === selected) || plans[0];
  const rawItems = data?.raw || [];
  const totals = { prepared: plans.reduce((s, x) => s + Number(x.prepared || 0), 0), served: plans.reduce((s, x) => s + Number(x.served || 0), 0), remaining: plans.reduce((s, x) => s + Number(x.remaining || 0), 0) };
  const preparationRate = totals.prepared ? Math.round(1000 * totals.served / totals.prepared) / 10 : 0;
  const pricingRows = plans.map(x => ({ ...x, plate_cost: Number(x.cost_per_plate || 0), price: Number(x.selling_price || 0), cost_share: Number(x.ingredient_cost_pct || 0) })).sort((a, b) => b.cost_share - a.cost_share);
  const stockGroups = ['Purchase required', 'Healthy stock', 'Excess stock'].map(status => ({ name: status, items: rawItems.filter(x => x.status === status).length, investment: rawItems.filter(x => x.status === status).reduce((s, x) => s + Number(x.stock_value || 0), 0) }));
  const rawStock = stockRows.filter(x => x.kind === 'Raw material');
  const ingredientSelect = (label) => <select className={SELECT} aria-label={label} value={purchaseIngredient} onChange={e => setPurchaseIngredient(e.target.value)}><option value="all">All raw materials</option>{(data.purchase_prices?.ingredients || []).map(v => <option key={v} value={v}>{v}</option>)}</select>;
  return (
    <ModeLayout>
      <LoadState loading={loading} error={error}>Loading inventory analytics…</LoadState>
      {data && (
        <>
          <MetricGrid items={[['Menu items', number(data.kpis.menu_items)], ['Production batches', number(data.kpis.batches)], ['Plates prepared', number(data.kpis.plates_prepared)], ['Ingredients to purchase', number(data.kpis.purchase_items)], ['Excess-stock ingredients', number(data.kpis.excess_items)], ['Raw-material stock value', money(data.kpis.raw_stock_value)], ['Plates still ready', number(totals.remaining)], ['Prepared food consumed', preparationRate + '%']]} />
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-tiles mb-stack">
            <ChartPanel title="Highest ingredient consumption" data={rawStock.slice().sort((a, b) => Number(b.consumed || 0) - Number(a.consumed || 0)).slice(0, 12)} x="item" bar keys={[{ key: 'consumed', label: 'Quantity in item unit', color: '#7142b2' }]} />
            <ChartPanel title="Most received ingredients" data={rawStock.slice().sort((a, b) => Number(b.received || 0) - Number(a.received || 0)).slice(0, 12)} x="item" bar keys={[{ key: 'received', label: 'Quantity in item unit', color: '#7142b2' }]} />
          </div>
          <Block><DataTable title="Raw materials by stock condition" rows={stockGroups} columns={[{ key: 'name', label: 'Stock condition' }, { key: 'items', label: 'Ingredients', format: number }, { key: 'investment', label: 'Stock value', format: money }]} /></Block>
          <Block><DataTable title="Menu pricing and ingredient cost analysis" rows={pricingRows} columns={[{ key: 'name', label: 'Menu item' }, { key: 'batch_plates', label: 'Plates per batch', format: number }, { key: 'batch_cost', label: 'Batch ingredient cost', format: money }, { key: 'plate_cost', label: 'Ingredient cost / plate', format: money }, { key: 'price', label: 'Selling price / plate', format: money }, { key: 'cost_share', label: 'Ingredient cost share', format: (v) => Number(v).toFixed(1) + '%' }]} /></Block>
          <Block><DataTable title="Raw Materials : Requiring Action" rows={rawItems.filter(x => x.status !== 'Healthy stock')} columns={[{ key: 'name', label: 'Ingredient' }, { key: 'available', label: 'Available', format: number }, { key: 'unit', label: 'Unit' }, { key: 'monthly_use', label: 'Estimated monthly use', format: number }, { key: 'days_cover', label: 'Days of stock', format: (v) => v == null ? 'Not established' : number(v) }, { key: 'status', label: 'Stock condition' }, { key: 'stock_value', label: 'Stock value', format: money }]} /></Block>
          <Block><DataTable title="Item Preparation and batch planning" rows={plans} columns={[{ key: 'name', label: 'Menu item' }, { key: 'batch_plates', label: 'Plates per batch', format: number }, { key: 'batches', label: 'Batches prepared', format: number }, { key: 'prepared', label: 'Plates prepared', format: number }, { key: 'served', label: 'Plates served', format: number }, { key: 'remaining', label: 'Plates remaining', format: number }, { key: 'status', label: 'What to do' }]} /></Block>
          <Block>{chosen && <DataTable title="Recipe and ingredient details" toolbar={<select className={SELECT} aria-label="Choose menu item" value={chosen.name} onChange={e => setSelected(e.target.value)}>{plans.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}</select>} rows={chosen.ingredients} columns={[{ key: 'ingredient', label: 'Ingredient' }, { key: 'needed', label: 'Required for batch', format: number }, { key: 'available', label: 'Available now', format: number }, { key: 'unit', label: 'Unit' }, { key: 'cost', label: 'Batch ingredient cost', format: money }, { key: 'status', label: 'Readiness' }]} />}</Block>
          {(data.shared || []).length > 0 && <Block><DataTable title="Sides for Menu Items" rows={data.shared} columns={[{ key: 'name', label: 'Prepared component' }, { key: 'batch_size', label: 'Litres per batch', format: number }, { key: 'prepared', label: 'Litres prepared', format: number }, { key: 'served', label: 'Litres served', format: number }, { key: 'remaining', label: 'Litres remaining', format: number }, { key: 'cost_per_batch', label: 'Ingredient cost per batch', format: money }]} /></Block>}
          <Block><DataTable title="Raw-material purchase price history" toolbar={ingredientSelect('Raw material')} rows={(data.purchase_prices?.history || []).filter(x => (purchaseIngredient === 'all' || x.ingredient === purchaseIngredient) && x.grain === 'Month')} columns={[{ key: 'ingredient', label: 'Raw material' }, { key: 'period', label: 'Purchase period' }, { key: 'quantity', label: 'Quantity bought', format: number }, { key: 'lowest', label: 'Lowest ₹/unit', format: money }, { key: 'highest', label: 'Highest ₹/unit', format: money }, { key: 'weighted_price', label: 'Average paid ₹/unit', format: money }, { key: 'purchases', label: 'Purchase entries', format: number }]} /></Block>
          <Block><DataTable title="Most frequent purchase prices" toolbar={ingredientSelect('Raw material for purchase price frequency')} rows={(data.purchase_prices?.frequency || []).filter(x => (purchaseIngredient === 'all' || x.ingredient === purchaseIngredient))} columns={[{ key: 'ingredient', label: 'Raw material' }, { key: 'price', label: 'Price paid per unit', format: money }, { key: 'count', label: 'Number of purchases', format: number }, { key: 'share', label: 'Share of purchase entries', format: (v) => Number(v).toFixed(1) + '%' }]} /></Block>
          <ItemCatalog params={params} kind="stock" />
          <InventoryLive params={params} />
        </>
      )}
    </ModeLayout>
  );
}

// ── MENU ─────────────────────────────────────────────────────────────────────
function MenuQuantityRanking({ data }) {
  const [dimension, setDimension] = useState('service');
  const [view, setView] = useState('table');
  const [timeGrain, setTimeGrain] = useState('month');
  const dimensionKey = dimension === 'time' ? timeGrain : dimension;
  const source = data?.quantity_dimensions?.[dimensionKey] || [];
  const preferred = dimension === 'service' ? ['Dine-in', 'Walk-in', 'Takeaway', 'Delivery'] : [];
  const observed = Array.from(new Set(source.map(x => String(x.group))));
  const groups = dimension === 'all' ? [] : dimension === 'service' ? [...preferred, ...observed.filter(x => !preferred.includes(x)).sort()] : dimension === 'time' && timeGrain === 'weekday' ? WEEKDAYS.filter(x => observed.includes(x)) : [...observed].sort();
  const lookup = new Map();
  source.forEach(x => {
    const key = JSON.stringify([x.item, x.category]);
    let row = lookup.get(key);
    if (!row) { row = { item: x.item, category: x.category, quantity: 0 }; lookup.set(key, row); }
    const q = Number(x.quantity) || 0; row.quantity += q;
    if (dimension !== 'all') row[x.group] = (row[x.group] || 0) + q;
  });
  const rows = Array.from(lookup.values()).sort((a, b) => b.quantity - a.quantity || String(a.item).localeCompare(String(b.item)));
  const totals = { item: 'Grand total', category: '', quantity: rows.reduce((sum, r) => sum + r.quantity, 0) };
  groups.forEach(g => totals[g] = rows.reduce((sum, r) => sum + (Number(r[g]) || 0), 0));
  const columns = [{ key: 'item', label: 'Menu item' }, { key: 'category', label: 'Category' }, ...groups.map(g => ({ key: g, label: g, format: number })), { key: 'quantity', label: 'Ordered quantity', format: number }];
  const chartRows = rows.slice(0, 15).map(r => ({ item: r.item, quantity: r.quantity, ...Object.fromEntries(groups.map(g => [g, r[g] || 0])) }));
  return (
    <Block>
      <SectionHead>Menu items by ordered quantity</SectionHead>
      <div className="flex flex-wrap items-center justify-between gap-6 my-2 mb-3">
        <Chips options={[['all', 'All menu items'], ['service', 'Service type'], ['area', 'Dining area'], ['time', 'By time']]} value={dimension} onChange={setDimension} />
        <Seg value={view} onChange={setView} options={[['table', 'Table'], ['chart', 'Chart']]} />
      </div>
      {dimension === 'time' && <Chips className="mb-3" options={[['hour', 'Hour'], ['weekday', 'Weekday'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month']]} value={timeGrain} onChange={setTimeGrain} />}
      {view === 'table' ? <DataTable title="" rows={[...rows, totals]} limit={rows.length + 1} columns={columns} /> : <ChartPanel title="Ordered quantity by menu item" data={chartRows} x="item" kind="bar" keys={groups.length && groups.length <= 8 ? groups.map((g, i) => ({ key: g, label: g, color: CHART_COLORS[i % CHART_COLORS.length] })) : [{ key: 'quantity', label: 'Ordered quantity', color: CHART_COLORS[0] }]} />}
    </Block>
  );
}

function MenuDemandTrends({ trends, title = 'Menu demand over time', measure = 'portions' }) {
  const [grain, setGrain] = useState('day');
  const [view, setView] = useState('chart');
  const opts = [['hour', 'Hour on hour'], ['weekday', 'Weekday on weekday'], ['day', 'Day on day'], ['week', 'Week on week'], ['month', 'Month on month']];
  const rows = trends[grain] || [];
  const label = measure === 'orders' ? 'Orders' : 'Ordered portions';
  return (
    <Block>
      <SectionHead>{title}</SectionHead>
      <div className="flex flex-wrap items-center justify-between gap-6 my-2 mb-3">
        <Chips options={opts} value={grain} onChange={setGrain} />
        <Seg value={view} onChange={setView} options={[['table', 'Table'], ['chart', 'Chart']]} />
      </div>
      {view === 'table' ? <DataTable title="" rows={rows} columns={[{ key: 'name', label: 'Period' }, { key: measure, label, format: number }, { key: 'previous', label: 'Previous period', format: (v) => v == null ? '—' : number(v) }, { key: 'change_pct', label: 'Change %', format: (v) => v == null ? '—' : Number(v).toFixed(1) + '%' }]} /> : <ChartPanel title={measure === 'orders' ? 'Orders by period' : 'Ordered portions by period'} data={rows} x="name" kind="line" keys={[{ key: measure, label, color: CHART_COLORS[0] }]} />}
    </Block>
  );
}

function MenuDashboard({ params, hasOrders = true }) {
  const mode = 'descriptive';
  const { data, error: menuError } = useAnalytics('menu', params);
  const { data: operations, error: opsError } = useAnalytics('operations', params, { enabled: hasOrders });
  const error = menuError || opsError;
  const col = (key, label) => ({ key, label });
  const qty = (key, label) => ({ key, label, format: number });
  const dims = [{ key: 'service', title: 'Service type', view: 'chart', kind: 'pie' }, { key: 'area', title: 'Dining area', view: 'table', kind: 'bar' }, { key: 'table', title: 'Tables', view: 'chart', kind: 'bar' }, { key: 'category', title: 'Menu category', view: 'chart', kind: 'pie' }, { key: 'kitchen', title: 'Kitchen counters', view: 'table', kind: 'bar' }, { key: 'employee', title: 'Employees', view: 'table', kind: 'bar' }, { key: 'hour', title: 'Time', view: 'chart', kind: 'line' }];
  const dimRows = (key) => operations?.item_dimensions?.[key] || [];
  return (
    <ModeLayout>
      <LoadState loading={!data || (hasOrders && !operations)} error={error}>Loading menu analytics…</LoadState>
      {data && operations && (
        <>
          {mode === 'descriptive' && (
            <>
              <MetricGrid items={[['Menu Categories', number(data.kpis.categories)], ['Menu Items', number(data.kpis.items)], ['Items Ordered', number(data.kpis.ordered_items)], ['Portions Served', number(data.kpis.portions_served)], ['Items Not Ordered', number(data.kpis.not_ordered)], ['Cancelled Item Lines', number(data.kpis.cancelled_lines)]]} />
               {hasOrders && (
                <>
                  <Block><SectionHead>Menu across restaurant operations</SectionHead><SummaryGrid>{dims.map(d => <OrdersDimensionSummary key={d.key} title={'Menu items by ' + d.title} rows={dimRows(d.key)} defaultView={d.view} chartKind={d.kind} itemLevel={true} categoryColumn={false} />)}</SummaryGrid></Block>
                  <Block><SectionHead>Operational status by business dimension</SectionHead><StatusGrid>{dims.map(d => <OrdersStatusCard key={d.key} title={'Menu items by ' + d.title} rows={dimRows(d.key)} defaultView={d.view} chartKind="bar" itemLevel={true} categoryColumn={false} />)}</StatusGrid></Block>
                </>
              )}
              <MenuQuantityRanking data={data} />
              <MenuDemandTrends trends={data.trends || {}} />
              <MenuItemsProcessingTimes data={data} />
              <ItemCatalog params={params} kind="menu" />
            </>
          )}
          {mode !== 'descriptive' && (
            <>
              <Question>Which menu items have demand or fulfilment exceptions?</Question>
              <StatusGrid>
                <DataTable title="Items without recorded orders" rows={data.diagnostic.not_ordered} columns={[col('category', 'Category'), col('item', 'Menu item'), col('code', 'Item code')]} />
                <DataTable title="Menu item cancellations" rows={data.diagnostic.cancellation_items} columns={[col('category', 'Category'), col('item', 'Menu item'), qty('orders', 'Orders'), qty('cancelled_lines', 'Cancelled lines')]} />
              </StatusGrid>
              {(data.recommendations || []).map((x, i) => <section className="ui-panel" key={i}><h3 className="ui-panel-title">{x.title}</h3><p className="text-ui text-ink-soft">{x.action}</p><Note>{x.evidence}</Note></section>)}
            </>
          )}
        </>
      )}
    </ModeLayout>
  );
}

// ── BUSINESS AT A GLANCE ─────────────────────────────────────────────────────
function BusinessGlance({ params, summary, access }) {
  // Independent calls: one failing endpoint never blanks the others; a service
  // the user has not purchased is not even requested.
  const { data: sales } = useAnalytics('sales', params, { enabled: access.order });
  const { data: inventory } = useAnalytics('inventoryPlan', params, { enabled: access.inventory });
  const { data: billing } = useAnalytics('billing', params, { enabled: access.billing });
  const { data: servicesData } = useAnalytics('services', params, { enabled: access.table });
  const k = sales?.kpis || {}, order = summary?.kpis || {}, plans = inventory?.plans || [], raw = inventory?.raw || [];
  const topItems = (sales?.dimensions?.item || []).slice(0, 8);
  const services = (sales?.dimensions?.service || []);
  const employees = (sales?.dimensions?.employee || []).filter(x => x.name && x.name !== 'Unassigned').sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0));
  const preparationAttention = plans.filter(x => x.status === 'Prepare next batch' || (Number(x.served || 0) > 0 && Number(x.remaining || 0) <= Number(x.batch_plates || 0) * 0.2)).sort((a, b) => Number(a.remaining || 0) - Number(b.remaining || 0));
  const salesComposition = [{ name: 'Estimated inventory cost', amount: Math.max(0, Number(k.estimated_inventory_cost || 0)) }, { name: 'Estimated gross profit', amount: Math.max(0, Number(k.estimated_gross_profit || 0)) }];
  const daily = sales?.daily || [];
  const stockAlerts = raw.filter(x => x.status === 'Purchase required');
  const excess = raw.filter(x => x.status === 'Excess stock');
  const available = plans.reduce((n, x) => n + Number(x.remaining || 0), 0);
  const prepared = plans.reduce((n, x) => n + Number(x.prepared || 0), 0);
  // [label, value, shown?]
  const metrics = [
    ['Orders placed', number(order.orders || 0), access.order],
    ['Completed orders', number(k.completed_orders || 0), access.order],
    ['Sales excluding GST', money(k.sales_excluding_gst || 0), access.order],
    ['GST', money(k.gst || 0), access.order],
    ['Estimated gross profit', money(k.estimated_gross_profit || 0), access.order],
    ['Gross margin', k.estimated_gross_margin == null ? '—' : Number(k.estimated_gross_margin).toFixed(1) + '%', access.order],
    ['Invoices recorded', number(billing?.kpis?.invoices || 0), access.billing],
    ['Marked-paid invoices value', money(billing?.kpis?.paid_recorded || 0), access.billing],
    ['Plates prepared', number(prepared), access.inventory],
    ['Plates remaining', number(available), access.inventory],
    ['Dine-in Occupancy Coverage', servicesData?.kpis?.occupancy_pct == null ? '—' : Number(servicesData.kpis.occupancy_pct).toFixed(1) + '%', access.table],
    ['Raw materials requiring purchase', number(stockAlerts.length), access.inventory],
  ].filter(([, , show]) => show).map(([label, value]) => [label, value]);
  return (
    <div className="min-w-0">
      <MetricGrid items={metrics} />
      {access.order && (
        <SummaryGrid>
          <ChartPanel title="Sales over time" data={daily} x="date" kind="line" keys={[{ key: 'net', label: 'Sales excl. GST', color: CHART_COLORS[0] }]} />
          <ChartPanel title="Sales by service type" data={services} x="name" kind="bar" keys={[{ key: 'sales', label: 'Sales incl. GST', color: CHART_COLORS[1] }]} />
          <ChartPanel title="Sales value breakdown" data={salesComposition} x="name" kind="pie" keys={[{ key: 'amount', label: 'Amount excluding GST', color: CHART_COLORS[2] }]} />
        </SummaryGrid>
      )}
      {(access.order || access.table) && (
        <SummaryGrid>
          {access.order && <DataTable title="Menu items driving sales" rows={topItems} columns={[{ key: 'name', label: 'Menu item' }, { key: 'quantity', label: 'Portions', format: number }, { key: 'sales', label: 'Sales incl. GST', format: money }]} />}
          {access.order && <DataTable title="Service performance" rows={services} columns={[{ key: 'name', label: 'Service type' }, { key: 'orders', label: 'Completed orders', format: number }, { key: 'sales', label: 'Sales incl. GST', format: money }]} />}
          {access.table && <DataTable title="Dining area occupancy" rows={servicesData?.floor_capacity || []} columns={[{ key: 'area', label: 'Dining area' }, { key: 'occupied', label: 'Occupied tables', format: number }, { key: 'vacant', label: 'Vacant tables', format: number }, { key: 'occupancy_pct', label: 'Coverage', format: (v) => Number(v || 0).toFixed(1) + '%' }]} />}
        </SummaryGrid>
      )}
      {(access.order || access.inventory) && (
        <SummaryGrid>
          {access.inventory && <DataTable title="Raw-material stock attention" rows={[...stockAlerts, ...excess].slice(0, 12)} columns={[{ key: 'name', label: 'Ingredient' }, { key: 'available', label: 'On hand', format: number }, { key: 'unit', label: 'Unit' }, { key: 'status', label: 'Stock condition' }]} />}
          {access.order && <DataTable title="Employee sales performance" rows={employees} columns={[{ key: 'name', label: 'Employee' }, { key: 'orders', label: 'Completed orders', format: number }, { key: 'sales', label: 'Sales incl. GST', format: money }]} />}
          {access.inventory && <DataTable title="Items requiring preparation attention" rows={preparationAttention} columns={[{ key: 'name', label: 'Menu item' }, { key: 'remaining', label: 'Plates remaining', format: number }, { key: 'batch_plates', label: 'Plates per batch', format: number }, { key: 'status', label: 'Preparation status' }]} />}
        </SummaryGrid>
      )}
      {access.order && <Block><DataTable title="Sales, GST and estimated gross profit" rows={[{ name: 'Sales excluding GST', amount: k.sales_excluding_gst }, { name: 'GST', amount: k.gst }, { name: 'Estimated inventory cost', amount: k.estimated_inventory_cost }, { name: 'Estimated gross profit', amount: k.estimated_gross_profit }]} columns={[{ key: 'name', label: 'Measure' }, { key: 'amount', label: 'Amount', format: money }]} /></Block>}
    </div>
  );
}
// ── INSIGHTS ─────────────────────────────────────────────────────────────────
function InsightsActions({ params }) {
  const { data: report, loading, error } = useAnalytics('insights', { client_id: params.client_id || getClientId() });
  const [open, setOpen] = useState(null);
  const history = report?.history || {};
  const findings = report?.findings || [];
  const decisions = report?.decisions || [];
  const figures = (v) => (
    <div className="ui-table-wrap"><table className="ui-table"><tbody>{Object.entries(v || {}).map(([key, value]) => <tr key={key}><th className="!static">{key.replace(/_/g, ' ')}</th><td>{Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</td></tr>)}</tbody></table></div>
  );
  const toggleBtn = (id, on, off) => <button type="button" className="ui-btn !h-7" onClick={() => setOpen(open === id ? null : id)}>{open === id ? off : on}</button>;
  return (
    <div className="min-w-0">
      <Lead title="Insights & Recommended Actions">First, see what your restaurant records reveal. Then see the decisions those findings support and what could happen next.</Lead>
      <LoadState loading={loading} error={error}>Looking through all available restaurant records…</LoadState>
      {report && (
        <>
          <section className="ui-panel">
            <h3 className="ui-panel-title">1. What we found across your complete records</h3>
            <p className="ui-hint">From {history.start} to {history.end} — {history.calendar_days} calendar days. This analysis uses all available records, regardless of the dates selected in other tabs.</p>
            <MetricGrid items={[['Completed orders', number(history.completed_orders)], ['Sales before GST', money(history.sales_ex_gst)], ['Estimated food/item cost', money(history.estimated_cost)], ['Amount left after item cost', money(history.estimated_amount_after_cost)]]} />
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead><tr><th>What we discovered</th><th>What it tells the owner</th><th>Supporting figures</th></tr></thead>
                <tbody>{findings.map(x => <tr key={x.id}><td><strong>{x.headline}</strong><div className="ui-hint">{x.topic}</div></td><td>{x.detail}</td><td>{toggleBtn(x.id, 'See the figures', 'Hide figures')}{open === x.id && figures(x.evidence)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <section className="ui-panel">
            <h3 className="ui-panel-title">2. What the owner can do — and what may happen</h3>
            <p className="ui-hint">Only actions supported by the findings above are shown. We do not recommend arbitrary percentage cuts or promise additional sales.</p>
            {decisions.length ? (
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead><tr><th>Business opportunity</th><th>Recommended action</th><th>What may happen next</th><th>Evidence</th></tr></thead>
                  <tbody>{decisions.map(x => (
                    <tr key={x.id}>
                      <td><strong>{x.headline}</strong><p className="ui-hint">{x.reason}</p></td>
                      <td>{x.action}<p className="ui-hint"><strong>How to check success:</strong> {x.measure}</p></td>
                      <td>{x.outcome}</td>
                      <td>{toggleBtn(x.id, 'See evidence', 'Hide evidence')}{open === x.id && <div><strong>Actual figures</strong>{figures(x.evidence)}<strong>Assumptions and limits</strong><ul className="list-disc pl-5 text-ui text-ink-soft">{x.assumptions.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="text-ui text-ink-soft">There is not enough reliable evidence for a specific business action yet. The findings above remain available without inventing recommendations.</p>}
          </section>
          <section className="ui-panel">
            <h3 className="ui-panel-title">What the figures cannot tell us yet</h3>
            <ul className="list-disc pl-5 text-ui text-ink-soft">{(report.limitations || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
        </>
      )}
    </div>
  );
}

// ══ APP ══════════════════════════════════════════════════════════════════════
function Analytics({ clientId: propClientId, token: propToken, subscription: propSubscription }) {
  const [dateDialog, setDateDialog] = useState(false), [weekday, setWeekday] = useState('all'), [menuCategory, setMenuCategory] = useState('all'), [menuRecipe, setMenuRecipe] = useState('all');
  const [tab, setTab] = useState('Business at a glance'), [orderType, setOrderType] = useState('all'), [clientId, setClientId] = useState(propClientId || getClientId()), [start, setStart] = useState(() => localDay(new Date())), [end, setEnd] = useState(() => localDay(new Date())), [period, setPeriod] = useState('today'), [area, setArea] = useState('all'), [timeOfDay, setTimeOfDay] = useState('all');
  const [intel, setIntel] = useState(null);
  const [filterData, setFilterData] = useState(null), [d, setD] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [applied, setApplied] = useState({ start: localDay(new Date()), end: localDay(new Date()), client_id: propClientId || getClientId(), area: 'all', time_of_day: 'all', order_type: 'all', weekday: 'all', menu_category: 'all', menu_recipe: 'all' });

  // Keep the API client in sync with props / selected restaurant. Done during render
  // (idempotent) so it is set before any child effect issues a request.
  setAuth({ token: propToken, clientId });
  useEffect(() => { if (propClientId) setClientId(propClientId); }, [propClientId]);

  // ── Service access: prop → JWT `subscription` claim → no restriction ──────
  const subscription = useMemo(() => propSubscription ?? readSubscription(propToken || getAccessToken()), [propSubscription, propToken]);
  const has = (id) => !subscription || subscription.includes(id);
  const canView = (name) => { const need = TAB_ACCESS[name]; return !need || need.some(has); };

  const load = async () => {
    if (!clientId) { setError('Client ID is not set. Pass it as a prop or store it in localStorage as "client_id".'); return; }
    setLoading(true); setError('');
    try {
      const params = { start, end, client_id: clientId, area, time_of_day: timeOfDay, order_type: orderType, weekday, menu_category: menuCategory, menu_recipe: menuRecipe };
      const overview = await analyticsApi.overview(params);
      setD(overview);
      setApplied(params);
      if (has('inventory')) analyticsApi.intelligence(params).then(setIntel).catch(() => setIntel(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect');
    } finally {
      setLoading(false);
    }
  };

  // Filters are loaded per restaurant so dropdown values always belong to the selected client.
  useEffect(() => {
    if (!clientId) return undefined;
    const controller = new AbortController();
    analyticsApi.filters({ client_id: clientId }, controller.signal)
      .then((f) => {
        setFilterData(f);
        if (f.default_client_id && f.default_client_id !== clientId) setClientId(f.default_client_id);
        setArea('all'); setMenuCategory('all'); setMenuRecipe('all');
      })
      .catch(() => { });
    return () => controller.abort();
  }, [clientId]);

  useEffect(() => {
    if (dateDialog) return undefined;
    const timer = setTimeout(() => { void load(); }, 220);
    return () => clearTimeout(timer);
  }, [clientId, start, end, area, timeOfDay, orderType, weekday, menuCategory, menuRecipe, dateDialog]);

  const choosePeriod = (p) => {
    setPeriod(p);
    if (p === 'custom') { setDateDialog(true); return; }
    const now = new Date(); const today = localDay(now);
    if (p === 'today') { setStart(today); setEnd(today); return; }
    if (p === 'thisMonth') { setStart(localDay(new Date(now.getFullYear(), now.getMonth(), 1))); setEnd(today); return; }
    const anchor = filterData?.max_date || today; const dt = new Date(anchor + 'T12:00:00');
    if (p === 'last7') dt.setDate(dt.getDate() - 6);
    else if (p === 'last30') dt.setDate(dt.getDate() - 29);
    else if (p === 'last90') dt.setDate(dt.getDate() - 89);
    else if (p === 'last365') dt.setDate(dt.getDate() - 364);
    setStart(p === 'all' ? (filterData?.min_date || '2025-10-01') : localDay(dt)); setEnd(anchor);
  };

  const allSections = [['Business at a glance', LayoutDashboard], ['Orders', ClipboardList], ['Tables', UtensilsCrossed], ['Menu', UtensilsCrossed], ['Billing', ReceiptText], ['Inventory', Package], ['Sales', ReceiptText], ['Insights & Recommended Actions', LayoutDashboard]];
  const sections = allSections.filter(([name]) => canView(name));
  // If the selected tab is not allowed (e.g. subscription changed), fall back to the first allowed one
  const activeTab = sections.some(([name]) => name === tab) ? tab : sections[0]?.[0];

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <main className="max-w-page mx-auto px-page-x pb-page-b">
        <div className="sticky top-0 z-[1000] bg-surface -mx-page-x">
          <header className="h-[54px] flex items-center justify-between px-6 border-b border-line-divider bg-surface">
            <h1 className="text-page-title text-brand-dark">TEKHAWK Intelligent Analytics</h1>
            <div className="flex items-center gap-3">
              <button className="ui-btn" onClick={() => { setPeriod('today'); setClientId(propClientId || getClientId()); setArea('all'); setTimeOfDay('all'); setOrderType('all'); setWeekday('all'); setMenuCategory('all'); setMenuRecipe('all'); setDateDialog(false); setStart(localDay(new Date())); setEnd(localDay(new Date())); void load(); }}><RefreshCw size={15} /> Refresh</button>
            </div>
          </header>
        </div>
        {/* Filters follow the services too: a filter for a service the user has not bought is hidden */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5 px-5 pt-3 pb-3 bg-surface border-b border-line-divider relative z-[1100]">
          <HRSelect label="Restaurant" value={clientId} onChange={setClientId} options={(filterData?.clients || [{ id: clientId, name: 'My Restaurant' }]).map(i => ({ value: i.id, label: i.name }))} />
          <HRSelect label="When" value={period} onChange={choosePeriod} options={[{ value: 'today', label: 'Today' }, { value: 'thisMonth', label: 'This Month' }, { value: 'all', label: 'All' }, { value: 'last7', label: 'Last 7 days' }, { value: 'last30', label: 'Last 30 days' }, { value: 'last90', label: 'Last 3 months' }, { value: 'last365', label: 'Last 12 months' }, { value: 'custom', label: 'Choose dates' }]} />
          {has('table') && <HRSelect label="Dining Area" value={area} onChange={setArea} options={[{ value: 'all', label: 'All' }, ...(filterData?.areas || []).map(i => ({ value: i, label: i }))]} />}
          {has('order') && <HRSelect label="Order Type" value={orderType} onChange={setOrderType} options={(filterData?.order_types || [{ id: 'all', name: 'All' }]).map(i => ({ value: i.id, label: i.name }))} />}
          <HRSelect label="Day of Week" value={weekday} onChange={setWeekday} options={[{ value: 'all', label: 'All' }, ...(filterData?.weekdays || WEEKDAYS).map(v => ({ value: v, label: v }))]} />
          {has('menu') && <HRSelect label="Menu Category" value={menuCategory} onChange={setMenuCategory} options={[{ value: 'all', label: 'All' }, ...(filterData?.categories || []).map(v => ({ value: v, label: v }))]} />}
          {has('menu') && <HRSelect label="Menu Recipe" value={menuRecipe} onChange={setMenuRecipe} options={[{ value: 'all', label: 'All' }, ...(filterData?.recipes || []).map(v => ({ value: v, label: v }))]} />}
          <HRSelect label="Time of Day" value={timeOfDay} onChange={setTimeOfDay} options={(filterData?.time_of_day || [{ id: 'all', name: 'All' }]).map(i => ({ value: i.id, label: i.name }))} />
        </div>

        <nav className="ui-tabs shadow-tabs" aria-label="Analytics sections">
          {sections.map(([name, Icon]) => <button key={name} className={`ui-tab ${activeTab === name ? 'ui-tab-active' : ''}`} onClick={() => setTab(name)}><Icon size={16} />{name}</button>)}
        </nav>
        {dateDialog && (
          <div className="ui-backdrop !z-[5000]" onMouseDown={() => setDateDialog(false)}>
            <section className="ui-modal grid gap-3.5" role="dialog" aria-modal="true" aria-label="Choose dates" onMouseDown={e => e.stopPropagation()}>
              <header className="flex items-center justify-between"><h3 className="text-panel-title text-brand-dark">Choose dates</h3><button className="ui-btn !h-7" onClick={() => setDateDialog(false)} aria-label="Close">✕</button></header>
              <label className="grid gap-1.5 text-ui text-ink-muted">From<input className={FIELD} type="date" value={start} max={end} onChange={e => setStart(e.target.value)} /></label>
              <label className="grid gap-1.5 text-ui text-ink-muted">To<input className={FIELD} type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} /></label>
              <button className="ui-btn ui-btn-add" disabled={start > end} onClick={() => setDateDialog(false)}>Apply dates</button>
            </section>
          </div>
        )}
        {error && <section className="ui-error">{error}</section>}
        {loading && <div className="text-ui text-brand-dark p-2">Loading business details…</div>}
        {sections.length === 0 && <section className="ui-panel text-ui text-ink-muted">No analytics are available for your current subscription.</section>}
        {d && sections.length > 0 && (
          <TraceContext.Provider value={applied}>
            <div>
              {activeTab === 'Business at a glance' ? <BusinessGlance params={applied} summary={d} access={{ order: has('order'), table: has('table'), billing: has('billing'), inventory: has('inventory') }} /> : activeTab === 'Orders' ? <OperationsDashboard params={applied} /> : activeTab === 'Tables' ? <ServicesDashboard params={applied} /> : activeTab === 'Menu' ? <MenuDashboard params={applied} hasOrders={has('order')} /> : activeTab === 'Billing' ? <BillingDashboard params={applied} /> : activeTab === 'Inventory' ? <InventoryDashboard params={applied} stockRows={intel?.stock || []} /> : activeTab === 'Sales' ? <SalesDashboard params={applied} /> : <InsightsActions params={applied} />}
            </div>
          </TraceContext.Provider>
        )}
      </main>
    </div>
  );
}



export default Analytics;