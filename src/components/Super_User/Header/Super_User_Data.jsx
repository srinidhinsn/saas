import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
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
  search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  export: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5m0 0l5-5m-5 5V3",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  store: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight: "M9 6l6 6-6 6",
};

const SIDEBAR_W = 256;

/* ─── Export (logic unchanged) ───────────────────────────── */
const exportToExcel = (clients, realm, activeClientId) => {
  try {
    const today = new Date().toLocaleDateString();
    const mainSheetData = [
      ["Realm", realm],
      ["Total Tenants", clients.length],
      ["Total Users", clients.reduce((sum, c) => sum + c.users.length, 0)],
      ["Export Date", today],
      [],
      ["Tenant Name", "Realm", "User Count", "Status", "Users"],
    ];
    clients.forEach((client) => {
      mainSheetData.push([
        client.name, client.realm, client.users.length,
        activeClientId === client.id ? "Active" : "Inactive",
        client.users.map((u) => u.username).join(", ") || "—",
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(mainSheetData);
    ws["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 40 }];

    const usersSheetData = [
      ["USERS DETAILED REPORT"], ["Realm", realm], ["Report Date", today], [],
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
const Avatar = ({ name }) => {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-button-sm flex items-center justify-center flex-shrink-0
                    bg-brand-soft text-brand-dark border border-brand-line text-micro font-bold">
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
    <div className="fixed top-5 right-5 z-[1400] flex items-center gap-item px-4 py-3 rounded-panel
                    bg-brand-light border border-brand-line shadow-soft text-brand-dark text-ui font-bold">
      <span className="w-dot h-dot rounded-full bg-brand" />
      {message}
    </div>
  );
};

/* ─── Skeleton ───────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="flex items-center gap-item px-2.5 py-2">
    <div className="w-7 h-7 rounded-button-sm bg-brand-soft animate-pulse flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-2.5 rounded bg-brand-soft animate-pulse w-3/4" />
      <div className="h-2 rounded bg-brand-light animate-pulse w-1/2" />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   Super_User_Data — tenant list (left) + POS (right)
═══════════════════════════════════════════════════════════ */
const Super_User_Data = ({ clientId, token, screenIds }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedRealm, setSelectedRealm] = useState("");
  const [activeClient, setActiveClient] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const itemsPerPage = 15;

  /* realm comes from the floating realm tabs (Super_User_Tenant) */
  useEffect(() => {
    const handleRealmChange = () => {
      const r = localStorage.getItem("selected_client_realm");
      setSelectedRealm(r || "all");
    };
    handleRealmChange();
    window.addEventListener("storage", handleRealmChange);
    return () => window.removeEventListener("storage", handleRealmChange);
  }, []);

  /* clients of the selected realm */
  useEffect(() => {
    if (!selectedRealm) return;
    const load = async () => {
      try {
        setLoading(true);
        setClients([]);
        setCurrentPage(1);
        const base = import.meta.env.VITE_API_USER_SERVICE_URL;
        const headers = { Authorization: `Bearer ${token}` };
        let list = [];

        if (selectedRealm === "all") {
          // every realm -> merge all clients
          const rr = await axios.get(`${base}/${clientId}/users/realms?realm=realm`, { headers });
          const allRealms = rr.data.data.realms || [];
          const results = await Promise.all(
            allRealms.map((r) =>
              axios
                .get(`${base}/${clientId}/users/realm?realm=${r}`, { headers })
                .then((x) => x.data.data.clients || [])
                .catch(() => [])
            )
          );
          // de-duplicate by id
          list = [...new Map(results.flat().map((c) => [c.id, c])).values()];
        } else {
          const res = await axios.get(
            `${base}/${clientId}/users/realm?realm=${selectedRealm}`,
            { headers }
          );
          list = res.data.data.clients || [];
        }
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

  /* active client from localStorage */
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
  }, []);

  /* filtering & pagination */
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        c.users.some(
          (u) =>
            (u.username || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q)
        )
    );
  }, [clients, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedClients = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalUsers = filtered.reduce((a, c) => a + c.users.length, 0);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const ok = exportToExcel(filtered, selectedRealm, activeClient?.id);
      setToastMsg(ok ? "Excel file downloaded" : "Export failed. Please try again.");
      setExporting(false);
    }, 300);
  };

  /* POS must always open with super_user_v1 */
  const posScreenIds = screenIds?.includes("super_user_v1")
    ? screenIds
    : [...(screenIds || []), "super_user_v1"];

  return (
    <div className="relative h-[calc(100vh-4rem)] bg-canvas font-inter text-ink flex overflow-hidden">
      <Toast message={toastMsg} onDone={() => setToastMsg("")} />

      {/* ══════════ LEFT: tenant list ══════════ */}
      <aside
        className="flex-shrink-0 flex flex-col bg-surface border-r border-line
                   transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width: sidebarOpen ? SIDEBAR_W : 0 }}
      >
        <div style={{ width: SIDEBAR_W }} className="flex flex-col h-full">
          {/* Header */}
          <div className="px-panel pt-3 pb-2 border-b border-line-soft flex-shrink-0">
            <div className="flex items-start justify-between gap-item-sm">
              <div className="min-w-0">
                <h2 className="ui-panel-title !m-0 capitalize truncate">
                  {selectedRealm || "Tenants"}
                </h2>
                <p className="text-micro text-ink-muted mt-0.5">
                  {filtered.length} tenant{filtered.length !== 1 ? "s" : ""} · {totalUsers} user{totalUsers !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                className="ui-btn ui-btn-config !h-7 !px-2"
                onClick={handleExport}
                disabled={exporting || loading || filtered.length === 0}
                title="Export to Excel"
              >
                <Icon d={IC.export} size={13} />
              </button>
            </div>

            <div className="relative mt-2">
              <Icon d={IC.search} size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
              <input
                type="text"
                placeholder="Search tenants"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="ui-input"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto py-1">
            {loading ? (
              <div className="px-1.5 pt-1 space-y-0.5">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-brand-light border border-brand-line flex items-center justify-center mb-item">
                  <Icon d={IC.store} size={18} className="text-brand" />
                </div>
                <p className="text-ui font-bold text-brand-dark">No tenants found</p>
                <p className="ui-hint">Pick a realm or clear the search.</p>
              </div>
            ) : (
              <div className="px-1.5 pb-2 space-y-0.5">
                {paginatedClients.map((client) => {
                  const isActive = activeClient?.id === client.id;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleEnter(client.id, client.name)}
                      className={`w-full flex items-center gap-item px-2.5 py-2 rounded-button-sm text-left
                                  border transition-colors duration-fast group
                                  ${isActive
                                    ? "bg-brand-light border-brand-line"
                                    : "border-transparent hover:bg-brand-light"}`}
                    >
                      <Avatar name={client.name} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-ui font-bold truncate leading-tight ${isActive ? "text-brand-dark" : "text-ink"}`}>
                          {client.name}
                        </p>
                        <p className="text-micro text-ink-muted mt-0.5 truncate">
                          {selectedRealm === "all" && client.realm ? `${client.realm} · ` : ""}
                          {client.users.length} user{client.users.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {isActive ? (
                        <span className="w-dot h-dot rounded-full bg-state-vacant flex-shrink-0" />
                      ) : (
                        <Icon d={IC.arrowRight} size={12}
                          className="text-ink-faint group-hover:text-brand flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-panel py-2 border-t border-line-soft flex items-center justify-between flex-shrink-0">
              <button type="button" className="ui-btn !h-7 !px-2"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1} aria-label="Previous page">
                <Icon d={IC.chevronLeft} size={13} />
              </button>
              <span className="text-micro text-ink-muted font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button type="button" className="ui-btn !h-7 !px-2"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages} aria-label="Next page">
                <Icon d={IC.chevronRight} size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════ Sidebar toggle ══════════ */}
      <button
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-30 w-5 h-10 bg-surface border border-line
                   rounded-r-button-sm flex items-center justify-center shadow-panel
                   text-ink-muted hover:text-brand hover:bg-brand-light"
        style={{ left: sidebarOpen ? SIDEBAR_W : 0, transition: "left .3s ease" }}
        title={sidebarOpen ? "Collapse tenant list" : "Expand tenant list"}
      >
        <Icon d={sidebarOpen ? IC.chevronLeft : IC.chevronRight} size={11} />
      </button>

      {/* ══════════ RIGHT: POS ══════════ */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {activeClient?.id ? (
          <Order_Place
            key={activeClient.id}              /* remount on tenant switch */
            clientId={activeClient.id}
            token={token}
            onOrderUpdate={() => {}}
            realm={clients.find((c) => c.id === activeClient.id)?.realm || (selectedRealm === "all" ? undefined : selectedRealm)}
            screenIds={posScreenIds}
          />
        ) : (
          <div className="h-full flex items-center justify-center px-page-x">
            <div className="ui-panel !mb-0 max-w-sm w-full text-center py-section">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-light border border-brand-line flex items-center justify-center mb-item">
                <Icon d={IC.store} size={22} className="text-brand" />
              </div>
              <h3 className="ui-panel-title !mb-1">No tenant selected</h3>
              <p className="ui-hint !mt-0">
                {selectedRealm
                  ? `Pick a tenant from the ${selectedRealm === "all" ? "" : selectedRealm + " "}list to open the POS.`
                  : "Choose a realm at the top, then pick a tenant."}
              </p>
              {!sidebarOpen && (
                <button type="button" className="ui-btn ui-btn-primary mt-item"
                  onClick={() => setSidebarOpen(true)}>
                  Show tenant list
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Super_User_Data;