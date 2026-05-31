import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useTenant } from "../../../context/TenantContext";

/* ─── icons ────────────────────────────────────────────── */
const Icon = ({ d, size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);

const IC = {
  search      : "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  chevronDown : "M6 9l6 6 6-6",
  chevronUp   : "M18 15l-6-6-6 6",
  enter       : "M13 3h7v7M10 14L20 4M10 5H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-6",
  users       : "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  building    : "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  menu        : "M3 12h18M3 6h18M3 18h18",
  portal      : "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
};

/* ─── Avatar ────────────────────────────────────────────── */
const Avatar = ({ name, size = "md", color = "blue" }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = {
    blue  : "bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300",
    green : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    purple: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    amber : "bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300",
    rose  : "bg-rose-100   text-rose-700   dark:bg-rose-900/40   dark:text-rose-300",
  };
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm" };
  return (
    <div className={`flex items-center justify-center rounded-xl font-bold flex-shrink-0 ${sizes[size]} ${colors[color]}`}>
      {initials}
    </div>
  );
};

/* ─── Toast ─────────────────────────────────────────────── */
const Toast = ({ message, onDone }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl
                    bg-emerald-600 text-white text-sm font-semibold shadow-xl
                    animate-in slide-in-from-top-2 duration-200">
      <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
      {message}
    </div>
  );
};

/* ─── Skeleton ───────────────────────────────────────────── */
const Skeleton = () => (
  <div className="rounded-2xl border border-border-default dark:border-border-default-dark bg-bg-primary overflow-hidden">
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-bg-tertiary dark:bg-bg-tertiary-dark animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/5 rounded bg-bg-tertiary dark:bg-bg-tertiary-dark animate-pulse" />
        <div className="h-3 w-2/5 rounded bg-bg-tertiary dark:bg-bg-tertiary-dark animate-pulse" />
      </div>
    </div>
    <div className="px-4 pb-4 space-y-2">
      <div className="h-9 rounded-xl bg-bg-tertiary dark:bg-bg-tertiary-dark animate-pulse" />
    </div>
  </div>
);

/* ─── Stat card ──────────────────────────────────────────── */
const StatCard = ({ label, value, icon }) => (
  <div className="bg-bg-primary dark:bg-bg-primary-dark rounded-2xl px-4 py-3.5
                  border border-border-default dark:border-border-default-dark flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-action-primary/10 flex items-center justify-center text-action-primary flex-shrink-0">
      <Icon d={icon} size={16} />
    </div>
    <div>
      <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{label}</p>
      <p className="text-xl font-bold text-text-primary dark:text-text-primary-dark leading-tight">{value}</p>
    </div>
  </div>
);

/* ─── User row ───────────────────────────────────────────── */
const UserRow = ({ user }) => {
  const initial = (user.first_name || user.username || "?")[0].toUpperCase();
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                    hover:bg-bg-secondary dark:hover:bg-bg-secondary-dark transition-colors">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      bg-bg-tertiary dark:bg-bg-tertiary-dark border border-border-default
                      dark:border-border-default-dark text-xs font-bold
                      text-text-secondary dark:text-text-secondary-dark">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate leading-tight">
          {user.username}
        </p>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">
          {user.email || "No email"}
        </p>
      </div>
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0
                       bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        {user.roles?.[0] || "user"}
      </span>
    </div>
  );
};

/* ─── Client card ────────────────────────────────────────── */
const PALETTE = ["blue", "purple", "green", "amber", "rose"];

const ClientCard = ({ client, isActive, onEnter, onToggle, expanded }) => {
  const avatarColor = PALETTE[client.name.charCodeAt(0) % PALETTE.length];

  return (
    <div className={`rounded-2xl border bg-bg-primary dark:bg-bg-primary-dark
                    overflow-hidden transition-all duration-200 group
                    ${isActive
                      ? "border-2 border-action-primary shadow-lg shadow-action-primary/10"
                      : "border-border-default dark:border-border-default-dark hover:border-border-medium dark:hover:border-border-medium-dark hover:shadow-md"
                    }`}>

      {/* Header — click to expand */}
      <div className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={onToggle} role="button" aria-expanded={expanded}>
        <Avatar name={client.name} size="md" color={avatarColor} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary dark:text-text-primary-dark truncate leading-snug">
            {client.name || "Unnamed Tenant"}
          </p>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            <span className="font-mono text-action-primary">{client.realm}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                        bg-bg-tertiary dark:bg-bg-tertiary-dark
                        border border-border-default dark:border-border-default-dark
                        text-xs text-text-secondary dark:text-text-secondary-dark flex-shrink-0">
          <Icon d={IC.users} size={11} />
          <span className="font-semibold">{client.users.length}</span>
        </div>
      </div>

      {/* Active badge */}
      {isActive && (
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg
                        bg-action-primary/10 border border-action-primary/20 text-action-primary text-xs font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-action-primary animate-pulse" />
          Currently active workspace
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        {/* Enter button — arrow-into-box icon */}
        <button
          onClick={(e) => { e.stopPropagation(); onEnter(); }}
          title="Switch to this tenant"
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                      text-sm font-semibold transition-all duration-150 active:scale-[0.98]
                      ${isActive
                        ? "bg-action-primary/10 text-action-primary border border-action-primary/30"
                        : "bg-bg-secondary dark:bg-bg-secondary-dark text-text-primary dark:text-text-primary-dark border border-border-default dark:border-border-default-dark hover:bg-action-primary hover:text-white hover:border-action-primary"
                      }`}
        >
          <Icon d={IC.enter} size={15} />
          {isActive ? "Active" : "Switch here"}
        </button>

        {/* Expand / collapse */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={expanded ? "Collapse" : "Show users"}
          className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0
                     border border-border-default dark:border-border-default-dark
                     bg-bg-secondary dark:bg-bg-secondary-dark
                     text-text-secondary dark:text-text-secondary-dark
                     hover:bg-bg-tertiary dark:hover:bg-bg-tertiary-dark transition-colors"
        >
          <Icon d={expanded ? IC.chevronUp : IC.chevronDown} size={16} />
        </button>
      </div>

      {/* Users panel */}
      <div className={`transition-all duration-300 overflow-hidden ${expanded ? "max-h-[480px]" : "max-h-0"}`}>
        <div className="px-3 pb-3">
          <div className="h-px bg-border-default dark:bg-border-default-dark mb-2" />
          {client.users.length === 0
            ? <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark px-3 py-2">No users registered</p>
            : <div className="space-y-0.5">{client.users.map(u => <UserRow key={u.id} user={u} />)}</div>
          }
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Main Data component
═══════════════════════════════════════════════════════════ */
const Data = ({ clientId, token }) => {
  const [clients, setClients]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [expanded, setExpanded]           = useState({});
  const [realms, setRealms]               = useState([]);
  const [selectedRealm, setSelectedRealm] = useState("");
  const [activeClient, setActiveClient]   = useState(null); // { id, name }
  const [toastMsg, setToastMsg]           = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  const { switchTenant } = useTenant();

  /* ── fetch realms ── */
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realms?realm=realm`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const r = res.data.data.realms || [];
        setRealms(r);
        if (r.length > 0) setSelectedRealm(r[0]);
      } catch (e) { console.error(e); }
    };
    fetch();
  }, [clientId, token]);

  /* ── fetch clients ── */
  useEffect(() => {
    if (!selectedRealm) return;
    const fetch = async () => {
      try {
        setLoading(true); setClients([]);
        const res = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realm?realm=${selectedRealm}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const list = res.data.data.clients;
        const full = await Promise.all(list.map(async c => {
          try {
            const pr = await axios.get(
              `${import.meta.env.VITE_API_USER_SERVICE_URL}/${c.id}/users/persons?client_id=${c.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return { ...c, users: pr.data.data.persons || [] };
          } catch { return { ...c, users: [] }; }
        }));
        setClients(full);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [selectedRealm, clientId, token]);

  /* ── sync active client from localStorage (floater writes here) ── */
  useEffect(() => {
    const sync = () => {
      const id   = localStorage.getItem("selected_client_id");
      const name = localStorage.getItem("selected_client_name");
      setActiveClient(id ? { id, name } : null);
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const handleSelectRealm = (realm) => {
    setSelectedRealm(realm);
    setSearchQuery(""); setExpanded({});
    setSidebarOpen(false);
  };

  const handleEnter = useCallback((id, name) => {
    localStorage.setItem("selected_client_id",   id);
    localStorage.setItem("selected_client_name", name);
    window.dispatchEvent(new Event("storage"));
    setActiveClient({ id, name });
    setToastMsg(`Switched to ${name}`);
  }, []);

  const handleReset = () => {
    localStorage.removeItem("selected_client_id");
    localStorage.removeItem("selected_client_name");
    window.dispatchEvent(new Event("storage"));
    setActiveClient(null);
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filtered = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q)
      || c.users.some(u => u.username.toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q));
  });

  const totalUsers = filtered.reduce((a, c) => a + c.users.length, 0);

  /* ── render ── */
  return (
    <div className="flex min-h-screen bg-bg-tertiary dark:bg-bg-tertiary-dark">
      <Toast message={toastMsg} onDone={() => setToastMsg("")} />

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60
        bg-bg-primary dark:bg-bg-primary-dark
        border-r border-border-default dark:border-border-default-dark
        flex flex-col py-6 transition-transform duration-200
        md:static md:translate-x-0 md:min-h-screen md:flex-shrink-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo area */}
        <div className="px-5 mb-6 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-action-primary/10 flex items-center justify-center">
            <Icon d={IC.portal} size={16} className="text-action-primary" />
          </div>
          <span className="text-sm font-bold text-text-primary dark:text-text-primary-dark tracking-tight">
            Super Admin
          </span>
        </div>

        <p className="text-[10px] font-bold tracking-widest uppercase
                      text-text-tertiary dark:text-text-tertiary-dark px-5 mb-3">
          Realms
        </p>

        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {realms.map(realm => (
            <button key={realm} onClick={() => handleSelectRealm(realm)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                          text-left transition-all duration-150 font-medium
                          ${selectedRealm === realm
                            ? "bg-action-primary text-white shadow-sm shadow-action-primary/30"
                            : "text-text-secondary dark:text-text-secondary-dark hover:bg-bg-secondary dark:hover:bg-bg-secondary-dark"
                          }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0
                               ${selectedRealm === realm ? "bg-white" : "bg-current opacity-30"}`} />
              {realm.charAt(0).toUpperCase() + realm.slice(1)}
              {selectedRealm === realm && (
                <span className="ml-auto text-xs bg-white/20 px-1.5 py-0.5 rounded-md">
                  {clients.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 p-5 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl
                       border border-border-default dark:border-border-default-dark
                       bg-bg-primary dark:bg-bg-primary-dark
                       text-text-secondary dark:text-text-secondary-dark"
            onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <Icon d={IC.menu} size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
              Customer Tenants
            </h1>
            {selectedRealm && (
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-0.5">
                Viewing <span className="font-mono font-semibold text-action-primary">{selectedRealm}</span> realm
              </p>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading
          ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} />)}
            </div>
          : filtered.length === 0
          ? <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-tertiary dark:text-text-tertiary-dark">
              <Icon d={IC.building} size={44} />
              <p className="text-sm">{searchQuery ? "No clients match your search" : "No clients in this realm"}</p>
            </div>
          : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(c => (
                <ClientCard key={c.id} client={c}
                  isActive={activeClient?.id === c.id}
                  expanded={!!expanded[c.id]}
                  onEnter={() => handleEnter(c.id, c.name)}
                  onToggle={() => toggleExpand(c.id)} />
              ))}
            </div>
        }
      </div>
    </div>
  );
};

export default Data;
