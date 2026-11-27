import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../../../context/TenantContext";

/* ─── Icons ────────────────────────────────────────────── */
const Icon = ({ d, size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const IC = {
  search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  export: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5m0 0l5-5m-5 5V3",
  plus: "M12 5v14M5 12h14",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight: "M9 6l6 6-6 6",
};

/* ─── Export (unchanged logic) ──────────────────────────── */
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
        client.name,
        client.realm,
        client.users.length,
        activeClientId === client.id ? "Active" : "Inactive",
        client.users.map((u) => u.username).join(", ") || "—",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(mainSheetData);
    ws["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 40 }];

    const usersSheetData = [
      ["USERS DETAILED REPORT"],
      ["Realm", realm],
      ["Report Date", today],
      [],
      ["Tenant", "Username", "Email", "Role", "Status"],
    ];

    clients.forEach((client) => {
      client.users.forEach((user) => {
        usersSheetData.push([
          client.name,
          user.username,
          user.email || "—",
          user.roles?.[0] || "user",
          activeClientId === client.id ? "Tenant Active" : "Inactive",
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
  } catch (error) {
    console.error("Export failed:", error);
    return false;
  }
};

/* ─── Avatar (brand tint, matches pills / filters) ──────── */
const Avatar = ({ name }) => {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                 bg-brand-soft text-brand-dark border border-brand-line text-micro font-bold"
    >
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
    <div
      className="fixed top-5 right-5 z-[1400] flex items-center gap-item
                 px-4 py-3 rounded-panel bg-brand-light border border-brand-line
                 shadow-soft text-brand-dark text-ui font-bold"
    >
      <span className="w-dot h-dot rounded-full bg-brand" />
      {message}
    </div>
  );
};

/* ─── Skeleton row ──────────────────────────────────────── */
const SkeletonRow = () => (
  <tr>
    <td>
      <div className="flex items-center gap-item">
        <div className="w-8 h-8 rounded-full bg-brand-soft animate-pulse" />
        <div className="space-y-1.5">
          <div className="w-28 h-3 rounded bg-brand-soft animate-pulse" />
          <div className="w-20 h-2.5 rounded bg-brand-light animate-pulse" />
        </div>
      </div>
    </td>
    <td><div className="w-16 h-3 rounded bg-brand-soft animate-pulse" /></td>
    <td><div className="w-10 h-4 rounded-badge bg-brand-soft animate-pulse" /></td>
    <td><div className="w-14 h-4 rounded-badge bg-brand-soft animate-pulse" /></td>
    <td><div className="w-14 h-6 rounded-button-sm bg-brand-soft animate-pulse ml-auto" /></td>
  </tr>
);

/* ─── KPI tile ──────────────────────────────────────────── */
const Metric = ({ label, value, note }) => (
  <div className="ui-metric">
    <span className="ui-metric-label">{label}</span>
    <span className="ui-metric-value">{value}</span>
    {note && <span className="ui-metric-note">{note}</span>}
  </div>
);

const STATUS_OPTIONS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const itemsPerPage = 10;

  useTenant(); // kept so the tenant context stays mounted for this screen
  const nav = useNavigate();

  /* ── fetch realms ── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realms?realm=realm`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const r = res.data.data.realms || [];
        setRealms(r);
        if (r.length > 0) setSelectedRealm((prev) => prev || r[0]);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [clientId, token, reloadKey]);

  /* ── fetch clients of the selected realm ── */
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
  }, [selectedRealm, clientId, token, reloadKey]);

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
    setToastMsg(`Switched to ${name}`);
  }, []);

  const navigation = () => nav(`/saas/${clientId}/register`);

  /* ── Filtering & pagination ── */
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        (c.name || "").toLowerCase().includes(q) ||
        c.users.some(
          (u) =>
            (u.username || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q)
        );
      const isActive = activeClient?.id === c.id;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter, activeClient]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedClients = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalUsers = filtered.reduce((a, c) => a + c.users.length, 0);
  const activeCount = filtered.filter((c) => activeClient?.id === c.id).length;

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const ok = exportToExcel(filtered, selectedRealm, activeClient?.id);
      setToastMsg(ok ? "Excel file downloaded" : "Export failed. Please try again.");
      setExporting(false);
    }, 300);
  };

  /* windowed page numbers (max 5 around current) */
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  /* ── render ── */
  return (
    <div className="min-h-screen bg-canvas font-inter text-ink">
      <Toast message={toastMsg} onDone={() => setToastMsg("")} />

      {/* Title bar */}
      <header className="bg-surface border-b border-line-soft">
        <div className="max-w-page mx-auto px-page-x py-3 flex items-center justify-between gap-item flex-wrap">
          <h1 className="text-[1.5rem] leading-tight font-bold text-brand-dark">
            TEKHAWK Tenant Management
          </h1>
          <div className="flex items-center gap-item-sm">
            <button
              type="button"
              className="ui-btn ui-btn-add"
              onClick={navigation}
            >
              <Icon d={IC.plus} size={14} />
              Register
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-config"
              onClick={handleExport}
              disabled={exporting || loading || filtered.length === 0}
            >
              <Icon d={IC.export} size={14} />
              {exporting ? "Exporting…" : "Export"}
            </button>
            <button
              type="button"
              className="ui-btn"
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loading}
            >
              <Icon d={IC.refresh} size={14} className={loading ? "animate-spin-slow" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Filter row */}
      <section className="bg-surface">
        <div className="max-w-page mx-auto px-page-x py-3 grid gap-tiles grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <label className="ui-filter">
            <span className="ui-filter-label">Realm</span>
            <select
              className="ui-filter-control capitalize"
              value={selectedRealm}
              onChange={(e) => setSelectedRealm(e.target.value)}
            >
              {realms.map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
          </label>

          <label className="ui-filter">
            <span className="ui-filter-label">Search</span>
            <input
              type="text"
              className="ui-filter-control"
              placeholder="Tenant, username or email"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          <label className="ui-filter">
            <span className="ui-filter-label">Status</span>
            <select
              className="ui-filter-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>

          <div className="ui-filter">
            <span className="ui-filter-label">Active tenant</span>
            <div className="ui-filter-control truncate">
              {activeClient?.name || "None selected"}
            </div>
          </div>
        </div>

        {/* Realm tabs */}
        <div className="max-w-page mx-auto border-t border-brand-tab-line">
          <div className="ui-tabs !mb-0">
            {realms.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRealm(r)}
                className={`ui-tab capitalize ${selectedRealm === r ? "ui-tab-active" : ""}`}
              >
                <Icon d={IC.grid} size={16} />
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-page mx-auto px-page-x pt-page-y pb-page-b">
        {/* KPI band */}
        <div className="ui-metrics !mt-0">
          <Metric label="Tenants" value={loading ? "—" : filtered.length} />
          <Metric label="Users" value={loading ? "—" : totalUsers} />
          <Metric label="Active tenants" value={loading ? "—" : activeCount} />
          <Metric
            label="Inactive tenants"
            value={loading ? "—" : filtered.length - activeCount}
          />
        </div>

        {/* Tenants panel */}
        <div className="ui-panel">
          <div className="flex items-center justify-between gap-item flex-wrap">
            <h3 className="ui-panel-title !mb-0 capitalize">
              {selectedRealm ? `${selectedRealm} tenants` : "Tenants"}
            </h3>
            <div className="ui-toggle">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s.key);
                    setCurrentPage(1);
                  }}
                  className={`ui-toggle-btn ${statusFilter === s.key ? "ui-toggle-btn-active" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Realm</th>
                    <th>Users</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-section-lg text-center">
              <div className="w-12 h-12 rounded-full bg-brand-light border border-brand-line flex items-center justify-center mb-item">
                <Icon d={IC.users} size={22} className="text-brand" />
              </div>
              <p className="text-body-sm font-bold text-brand-dark">No tenants found</p>
              <p className="ui-hint">Change the search or status filter to see more tenants.</p>
            </div>
          ) : (
            <>
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Realm</th>
                      <th>Users</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClients.map((client) => {
                      const isActive = activeClient?.id === client.id;
                      return (
                        <tr key={client.id}>
                          <td className="!align-middle">
                            <div className="flex items-center gap-item">
                              <Avatar name={client.name} />
                              <div className="min-w-0">
                                <p className="font-bold text-ink text-ui leading-tight">{client.name}</p>
                                <p className="text-micro text-ink-muted break-all">{client.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="!align-middle">
                            <span className="font-semibold text-ink-soft">{client.realm}</span>
                          </td>
                          <td className="!align-middle">
                            <span className="ui-pill inline-flex items-center gap-1.5">
                              <Icon d={IC.users} size={12} />
                              {client.users.length}
                            </span>
                          </td>
                          <td className="!align-middle">
                            {isActive ? (
                              <span className="ui-chip bg-state-vacant-bg text-state-vacant">Active</span>
                            ) : (
                              <span className="ui-chip bg-brand-pill text-ink-muted">Inactive</span>
                            )}
                          </td>
                          <td className="!align-middle text-right">
                            <button
                              type="button"
                              className="ui-btn ui-btn-primary !h-7"
                              onClick={() => handleEnter(client.id, client.name)}
                            >
                              Visit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer: row count + pagination */}
              <div className="flex items-center justify-between gap-item flex-wrap mt-item">
                <span className="ui-hint !m-0">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} rows
                </span>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="ui-btn !h-7 !px-2"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <Icon d={IC.chevronLeft} size={14} />
                    </button>

                    {pageNumbers[0] > 1 && (
                      <>
                        <button type="button" className="ui-btn !h-7 !px-2.5" onClick={() => setCurrentPage(1)}>1</button>
                        {pageNumbers[0] > 2 && <span className="text-ink-muted text-ui px-1">…</span>}
                      </>
                    )}

                    {pageNumbers.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCurrentPage(n)}
                        className={`ui-btn !h-7 !px-2.5 ${currentPage === n ? "ui-btn-primary" : ""}`}
                      >
                        {n}
                      </button>
                    ))}

                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                      <>
                        {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                          <span className="text-ink-muted text-ui px-1">…</span>
                        )}
                        <button
                          type="button"
                          className="ui-btn !h-7 !px-2.5"
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="ui-btn !h-7 !px-2"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <Icon d={IC.chevronRight} size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Data;