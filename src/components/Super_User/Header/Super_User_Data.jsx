import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useTenant } from "../../../context/TenantContext";
import * as XLSX from "xlsx";
import Order_Place from "../../Super_User/Order_Place/Order_Place";

/* ─── Icons ────────────────────────────────────────────── */
const Icon = ({ d, size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);

const IC = {
  search:     "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  users:      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  export:     "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5m0 0l5-5m-5 5V3",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  chevronD:   "M6 9l6 6 6-6",
  store:      "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
};

/* ─── Export ─────────────────────────────────────────────── */
const exportToExcel = (clients, realm, activeClientId) => {
  try {
    const mainSheetData = [
      ["Realm", realm],
      ["Total Tenants", clients.length],
      ["Total Users", clients.reduce((sum, c) => sum + c.users.length, 0)],
      ["Export Date", new Date().toLocaleDateString()],
      [],
      ["Tenant Name", "Realm", "User Count", "Status", "Users"],
    ];
    clients.forEach((client) => {
      const status = activeClientId === client.id ? "Active" : "Inactive";
      const userNames = client.users.map((u) => u.username).join(", ") || "—";
      mainSheetData.push([client.name, client.realm, client.users.length, status, userNames]);
    });
    const ws = XLSX.utils.aoa_to_sheet(mainSheetData);
    ws["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 40 }];

    const usersSheetData = [
      ["USERS DETAILED REPORT"],
      ["Realm", realm],
      ["Report Date", new Date().toLocaleDateString()],
      [],
      ["Tenant", "Username", "Email", "Role", "Status"],
    ];
    clients.forEach((client) => {
      client.users.forEach((user) => {
        usersSheetData.push([
          client.name, user.username, user.email || "—",
          user.roles?.[0] || "user",
          activeClientId === client.id ? "Active" : "Inactive",
        ]);
      });
    });
    const usersWs = XLSX.utils.aoa_to_sheet(usersSheetData);
    usersWs["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tenants Summary");
    XLSX.utils.book_append_sheet(wb, usersWs, "Users Details");
    XLSX.writeFile(wb, `Tenants_${realm}_${new Date().toISOString().split("T")[0]}.xlsx`);
    return true;
  } catch (err) {
    console.error("Export failed:", err);
    return false;
  }
};

/* ─── Avatar ─────────────────────────────────────────────── */
const Avatar = ({ name, size = "md" }) => {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "from-orange-400 to-red-500",
    "from-blue-400 to-indigo-600",
    "from-emerald-400 to-teal-600",
    "from-purple-400 to-fuchsia-600",
    "from-pink-400 to-rose-600",
    "from-amber-400 to-orange-500",
    "from-cyan-400 to-blue-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 bg-gradient-to-br ${color} shadow-sm`}>
      {initials}
    </div>
  );
};

/* ─── Toast ──────────────────────────────────────────────── */
const Toast = ({ message, onDone }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-white border border-emerald-200 shadow-xl text-emerald-800 text-sm font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
      {message}
    </div>
  );
};

/* ─── Skeleton ───────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg">
    <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════ */
const Super_User_Data = ({ clientId, token, screenIds }) => {
  const [clients, setClients]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [selectedRealm, setSelectedRealm] = useState("");
  const [activeClient, setActiveClient] = useState(null);
  const [toastMsg, setToastMsg]         = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [currentPage, setCurrentPage]   = useState(1);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const itemsPerPage = 15;

  // ── Sync realm from TenantSwitcher ──
  useEffect(() => {
    const handleRealmChange = () => {
      const r = localStorage.getItem("selected_client_realm");
      if (r) setSelectedRealm(r);
    };
    handleRealmChange();
    window.addEventListener("storage", handleRealmChange);
    return () => window.removeEventListener("storage", handleRealmChange);
  }, []);

  // ── Fetch clients for selected realm ──
  useEffect(() => {
    if (!selectedRealm) return;
    const load = async () => {
      try {
        setLoading(true);
        setClients([]);
        setCurrentPage(1);
        const res = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realm?realm=${selectedRealm}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const list = res.data.data.clients;
        const full = await Promise.all(
          list.map(async (c) => {
            try {
              const pr = await axios.get(
                `${import.meta.env.VITE_API_USER_SERVICE_URL}/${c.id}/users/persons?client_id=${c.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return { ...c, users: pr.data.data.persons || [] };
            } catch {
              return { ...c, users: [] };
            }
          })
        );
        setClients(full);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedRealm, clientId, token]);

  // ── Sync active client from localStorage ──
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

  const handleEnter = useCallback((id, name) => {
    localStorage.setItem("selected_client_id",   id);
    localStorage.setItem("selected_client_name", name);
    window.dispatchEvent(new Event("storage"));
    setActiveClient({ id, name });
  }, []);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const ok = exportToExcel(filtered, selectedRealm, activeClient?.id);
      setToastMsg(ok ? "📊 Excel downloaded!" : "❌ Export failed.");
      setExporting(false);
    }, 300);
  };

  // ── Filtering & Pagination ──
  const filtered = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.users.some(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      )
    );
  });

  const totalPages      = Math.ceil(filtered.length / itemsPerPage);
  const paginatedClients = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalUsers = filtered.reduce((a, c) => a + c.users.length, 0);

  // ── Build screenIds for Order_Place ──
  // Pass through whatever screenIds came from RoutesManager,
  // but always ensure super_user_v1 is included so POS opens in takeaway mode
  const posScreenIds = screenIds?.includes("super_user_v1")
    ? screenIds
    : [...(screenIds || []), "super_user_v1"];

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-100 flex overflow-hidden">
      <Toast message={toastMsg} onDone={() => setToastMsg("")} />

      {/* ══════════ LEFT SIDEBAR ══════════ */}
      <div
        className={`
          flex-shrink-0 flex flex-col bg-bg-primary border-r border-border-default
          transition-all duration-300 ease-in-out overflow-hidden
          ${sidebarOpen ? "w-64" : "w-0"}
        `}
      >
        {/* Header */}
        <div className="px-3 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="text-sm font-bold text-gray-800 capitalize leading-tight">
                {selectedRealm || "Tenants"}
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {filtered.length} tenant{filtered.length !== 1 ? "s" : ""} · {totalUsers} user{totalUsers !== 1 ? "s" : ""}
              </p>
            </div>
            {/* <button
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              title="Export to Excel"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Icon d={IC.export} size={13} />
            </button> */}
          </div>

          {/* Search */}
          <div className="relative">
            <Icon d={IC.search} size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 bg-gray-50"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="space-y-0.5 px-1 pt-1">
              {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <Icon d={IC.store} size={20} className="text-gray-300" />
              </div>
              <p className="text-xs font-semibold text-gray-500">No tenants found</p>
              <p className="text-[10px] text-gray-400 mt-1">Select a realm or clear search</p>
            </div>
          ) : (
            <div className="px-1.5 space-y-0.5 pb-2">
              {paginatedClients.map((client) => {
                const isActive = activeClient?.id === client.id;
                return (
                  <button
                    key={client.id}
                    onClick={() => handleEnter(client.id, client.name)}
                    className={`
                      w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left
                      transition-all duration-150 group
                      ${isActive
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50 border border-transparent hover:border-gray-200"
                      }
                    `}
                  >
                    <Avatar name={client.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate leading-tight ${isActive ? "text-blue-700" : "text-gray-800"}`}>
                        {client.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {client.users.length} user{client.users.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    ) : (
                      <Icon
                        d={IC.arrowRight}
                        size={12}
                        className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination — compact */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-[10px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-gray-100 transition"
            >
              ← Prev
            </button>
            <span className="text-[10px] text-gray-400 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="text-[10px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-gray-100 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ══════════ TOGGLE BUTTON ══════════ */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-5 h-10 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all"
        style={{ left: sidebarOpen ? "256px" : "0px", transition: "left 0.3s ease" }}
        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <Icon
          d={sidebarOpen ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"}
          size={11}
          className="text-gray-400"
        />
      </button>

      {/* ══════════ RIGHT: POS ══════════ */}
      <div className="flex-1 overflow-hidden">
        {activeClient?.id ? (
          <Order_Place
            key={activeClient.id}          /* ← forces full remount on tenant switch */
            clientId={activeClient.id}     /* ← selected tenant's client ID */
            token={token}
            onOrderUpdate={() => {}}
            realm={selectedRealm}
            screenIds={posScreenIds}       /* ← always includes super_user_v1 */
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shadow-sm">
              <Icon d={IC.store} size={32} className="text-blue-400" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-700">No tenant selected</p>
              <p className="text-sm text-gray-400 mt-1">
                {selectedRealm
                  ? `Pick a tenant from the ${selectedRealm} list to open the POS`
                  : "Select a realm from the floater, then pick a tenant"}
              </p>
            </div>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Show Tenant List
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Super_User_Data;
