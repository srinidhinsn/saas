import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useTenant } from "../../../context/TenantContext";
import * as XLSX from "xlsx";

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
  search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  calendar: "M3 9l0 12a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2l0 -12a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2m9 -5l0 4m-5 -4v4",
  filters: "M4 6h16M4 12h16M4 18h16",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 18l-6-6 6-6",
  menu: "M4 6h16M4 12h16M4 18h16",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  export: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5m0 0l5-5m-5 5V3",
  plus: "M12 5v14M5 12h14",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  x: "M18 6L6 18M6 6l12 12",
};

/* ─── Export Function ────────────────────────────────────── */
const exportToExcel = (clients, realm, activeClientId) => {
  try {
    const mainSheetData = [
      ["Realm", realm],
      ["Total Tenants", clients.length],
      ["Total Users", clients.reduce((sum, c) => sum + c.users.length, 0)],
      ["Export Date", new Date().toLocaleDateString()],
      [],
      ["Tenant Name", "Realm", "User Count", "Status", "Users"]
    ];

    clients.forEach((client, idx) => {
      const status = activeClientId === client.id ? "Active" : "Inactive";
      const userNames = client.users.map(u => u.username).join(", ") || "—";
      mainSheetData.push([
        client.name,
        client.realm,
        client.users.length,
        status,
        userNames
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(mainSheetData);
    ws["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 40 }
    ];

    const usersSheetData = [
      ["USERS DETAILED REPORT"],
      ["Realm", realm],
      ["Report Date", new Date().toLocaleDateString()],
      [],
      ["Tenant", "Username", "Email", "Role", "Status"]
    ];

    clients.forEach(client => {
      if (client.users.length > 0) {
        client.users.forEach(user => {
          usersSheetData.push([
            client.name,
            user.username,
            user.email || "—",
            user.roles?.[0] || "user",
            activeClientId === client.id ? "Tenant Active" : "Inactive"
          ]);
        });
      }
    });

    const usersWs = XLSX.utils.aoa_to_sheet(usersSheetData);
    usersWs["!cols"] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tenants Summary");
    XLSX.utils.book_append_sheet(wb, usersWs, "Users Details");

    const fileName = `Tenants_${realm}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return true;
  } catch (error) {
    console.error("Export failed:", error);
    return false;
  }
};

/* ─── Avatar ────────────────────────────────────────────── */
const Avatar = ({ name }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "bg-gradient-to-br from-orange-400 to-red-500",
    "bg-gradient-to-br from-blue-400 to-indigo-600",
    "bg-gradient-to-br from-emerald-400 to-teal-600",
    "bg-gradient-to-br from-purple-400 to-fuchsia-600",
    "bg-gradient-to-br from-pink-400 to-rose-600",
  ];
  const colorClass = colors[name.charCodeAt(0) % colors.length];

  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${colorClass} shadow-sm`}>
      {initials}
    </div>
  );
};

/* ─── Toast ─────────────────────────────────────────────── */
const Toast = ({ message, onDone }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 duration-300
                    px-6 py-4 rounded-lg
                    bg-gradient-to-r from-emerald-50 to-teal-50
                    border border-emerald-200 shadow-lg
                    text-emerald-900 text-sm font-semibold
                    flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      {message}
    </div>
  );
};

/* ─── Loading Skeleton ──────────────────────────────────── */
const SkeletonRow = () => (
  <tr className="border-b border-gray-100 hover:bg-gray-50">
    <td className="px-6 py-4"><div className="w-5 h-5 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" /><div className="space-y-2"><div className="w-24 h-4 bg-gray-200 rounded animate-pulse" /><div className="w-20 h-3 bg-gray-100 rounded animate-pulse" /></div></div></td>
    <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-6 py-4"><div className="w-24 h-4 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-6 py-4"><div className="w-16 h-6 bg-blue-200 rounded animate-pulse" /></td>
  </tr>
);

/* ═══════════════════════════════════════════════════════════
   Sidebar Navigation Component
═══════════════════════════════════════════════════════════ */
const Sidebar = ({ realms, selectedRealm, onSelectRealm, isOpen, onClose }) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative
        top-0 left-0 bottom-0
        w-64 bg-white border-r border-gray-200
        overflow-y-auto z-40 lg:z-0
        transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Realms</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon d={IC.x} size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Realms List */}
        <div className="px-3 py-4 space-y-2">
          {realms.map((realm) => (
            <button
              key={realm}
              onClick={() => {
                onSelectRealm(realm);
                onClose();
              }}
              className={`
                w-full text-left px-4 py-3 rounded-lg font-medium text-sm
                transition-all duration-200 capitalize
                flex items-center justify-between
                ${selectedRealm === realm
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                  : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <span>{realm}</span>
              {selectedRealm === realm && (
                <Icon d={IC.chevronRight} size={18} />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   Main Dashboard Component
═══════════════════════════════════════════════════════════ */
const Data = ({ clientId, token }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [realms, setRealms] = useState([]);
  const [selectedRealm, setSelectedRealm] = useState("");
  const [activeClient, setActiveClient] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const itemsPerPage = 10;

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
        setLoading(true); 
        setClients([]);
        setCurrentPage(1);
        
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

  /* ── sync active client ── */
  useEffect(() => {
    const sync = () => {
      const id = localStorage.getItem("selected_client_id");
      const name = localStorage.getItem("selected_client_name");
      setActiveClient(id ? { id, name } : null);
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const handleEnter = useCallback((id, name) => {
    localStorage.setItem("selected_client_id", id);
    localStorage.setItem("selected_client_name", name);
    window.dispatchEvent(new Event("storage"));
    setActiveClient({ id, name });
    setToastMsg(`✨ Switched to ${name}`);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      setTimeout(() => {
        const success = exportToExcel(filtered, selectedRealm, activeClient?.id);
        if (success) {
          setToastMsg(`📊 Excel file downloaded successfully!`);
        } else {
          setToastMsg(`❌ Export failed. Please try again.`);
        }
        setExporting(false);
      }, 300);
    } catch (error) {
      console.error(error);
      setToastMsg(`❌ Export error: ${error.message}`);
      setExporting(false);
    }
  };

  /* ── Filtering & Pagination ── */
  const filtered = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q)
      || c.users.some(u => u.username.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedClients = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalUsers = filtered.reduce((a, c) => a + c.users.length, 0);

  /* ── render ── */
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toast message={toastMsg} onDone={() => setToastMsg("")} />

      {/* Sidebar */}
      <Sidebar 
        realms={realms}
        selectedRealm={selectedRealm}
        onSelectRealm={setSelectedRealm}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon d={IC.menu} size={20} className="text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 capitalize">{selectedRealm}</h1>
                <p className="text-xs text-gray-500">
                  {filtered.length} tenant{filtered.length !== 1 ? 's' : ''} • {totalUsers} user{totalUsers !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Search & Export Bar */}
            <div className="flex items-center gap-3 flex-1 max-w-md ml-auto">
              <div className="flex-1 relative">
                <Icon d={IC.search} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder-gray-500"
                />
              </div>

              <button 
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Icon d={IC.export} size={18} />
                {exporting ? "..." : "Export"}
              </button>
            </div>
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left"><input type="checkbox" className="rounded" /></th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tenant Info</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Realm</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Users</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array(8).fill(0).map((_, i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Icon d={IC.users} size={32} className="text-gray-400" />
                </div>
                <p className="text-lg font-semibold text-gray-900">No tenants found</p>
                <p className="text-sm text-gray-600">Try adjusting your search filters</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left"><input type="checkbox" className="rounded" /></th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tenant Info</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Realm</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Users</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedClients.map((client, idx) => (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors animate-in fade-in duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                        <td className="px-6 py-4">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={client.name} />
                            <div>
                              <p className="font-semibold text-gray-900">{client.name}</p>
                              <p className="text-xs text-gray-500">{client.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-700 font-bold">{client.realm}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-700 text-white">
                            <Icon d={IC.users} size={14} />
                            {client.users.length}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {activeClient?.id === client.id ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEnter(client.id, client.name)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                                     bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                                     font-semibold text-sm hover:shadow-lg
                                     transition-all duration-200 active:scale-95"
                          >
                            Visit
                            <Icon d={IC.arrowRight} size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      ← Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg font-semibold text-sm transition-all duration-200 ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white"
                                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="text-gray-500">...</span>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            className="w-8 h-8 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-all duration-200"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Data;