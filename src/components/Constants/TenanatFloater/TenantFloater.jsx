import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useTenant } from "../../../context/TenantContext";

/* ─── Icons ─────────────────────────────────────────────── */
const Icon = ({ d, size = 14, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);

const IC = {
  building : "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  chevron  : "M6 9l6 6 6-6",
  check    : "M20 6L9 17l-5-5",
  switch   : "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m10 0h3a2 2 0 0 0 2-2v-3",
  search   : "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  users    : "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  x        : "M18 6L6 18M6 6l12 12",
};

/* ─── Avatar initials ────────────────────────────────────── */
const PALETTE = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4"];
const avatarColor = (name = "") => PALETTE[name.charCodeAt(0) % PALETTE.length];
const initials    = (name = "?") =>
  name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

/* ─── Realm pill colours ─────────────────────────────────── */
const REALM_COLORS = [
  { bg: "#ede9fe", text: "#6d28d9", dot: "#7c3aed" },
  { bg: "#fef3c7", text: "#92400e", dot: "#d97706" },
  { bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
  { bg: "#fee2e2", text: "#991b1b", dot: "#dc2626" },
  { bg: "#e0f2fe", text: "#075985", dot: "#0284c7" },
  { bg: "#fce7f3", text: "#9d174d", dot: "#db2777" },
];
const realmColor = (idx = 0) => REALM_COLORS[idx % REALM_COLORS.length];

/* ═══════════════════════════════════════════════════════════
   TenantSwitcher — always-on-top floating widget
   Props: clientId, token
═══════════════════════════════════════════════════════════ */
const TenantSwitcher = ({ clientId, token }) => {
  // clients grouped by realm: { realmName: [client, ...] }
  const [clientsByRealm, setClientsByRealm] = useState({});
  const [realms, setRealms]                 = useState([]);
  const [selectedRealm, setSelectedRealm]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [open, setOpen]                     = useState(false);
  const [activeClient, setActive]           = useState(null); // { id, name, realm }
  const [search, setSearch]                 = useState("");
  const [toast, setToast]                   = useState("");

  const panelRef  = useRef(null);
  const hoverRef  = useRef(null);
  const searchRef = useRef(null);

  const { switchTenant } = useTenant?.() || {};

  /* ── sync active client from localStorage ── */
  useEffect(() => {
    const sync = () => {
      const id    = localStorage.getItem("selected_client_id");
      const name  = localStorage.getItem("selected_client_name");
      const realm = localStorage.getItem("selected_client_realm");
      setActive(id ? { id, name, realm } : null);
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  /* ── fetch ALL realms + ALL their clients ── */
  useEffect(() => {
    if (!clientId || !token) return;
    const load = async () => {
      try {
        setLoading(true);

        // 1. get all realms (no filter param)
        const rRes = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realms?realm=realm`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const realmList = rRes.data.data.realms || [];
        if (!realmList.length) return;

        setRealms(realmList);
        setSelectedRealm(realmList[0]);

        // 2. fetch clients for every realm in parallel
        const realmResults = await Promise.allSettled(
          realmList.map(r =>
            axios.get(
              `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realm?realm=${r}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            .then(res => ({ realm: r, clients: res.data.data.clients || [] }))
            .catch(() => ({ realm: r, clients: [] }))
          )
        );

        // build grouped map, tag each client with its realm
        const grouped = {};
        realmList.forEach(r => { grouped[r] = []; });
        realmResults.forEach(res => {
          if (res.status === "fulfilled") {
            const { realm: r, clients } = res.value;
            grouped[r] = clients.map(c => ({ ...c, realm: r }));
          }
        });

        // 3. enrich all clients with user count in parallel
        const allClients = Object.values(grouped).flat();
        const enriched = await Promise.allSettled(
          allClients.map(async c => {
            try {
              const pr = await axios.get(
                `${import.meta.env.VITE_API_USER_SERVICE_URL}/${c.id}/users/persons?client_id=${c.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return { ...c, userCount: (pr.data.data.persons || []).length };
            } catch { return { ...c, userCount: 0 }; }
          })
        );

        // re-group enriched clients back by realm
        const finalGrouped = {};
        realmList.forEach(r => { finalGrouped[r] = []; });
        enriched.forEach(res => {
          const c = res.status === "fulfilled" ? res.value : res.reason;
          if (c?.realm && finalGrouped[c.realm]) finalGrouped[c.realm].push(c);
        });

        setClientsByRealm(finalGrouped);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [clientId, token]);

  /* ── switch handler ── */
  const handleSelect = useCallback((c) => {
    if (!c?.id) return;
    localStorage.setItem("selected_client_id",    c.id);
    localStorage.setItem("selected_client_name",  c.name);
    localStorage.setItem("selected_client_realm", c.realm || "");
    window.dispatchEvent(new Event("storage"));
    setActive({ id: c.id, name: c.name, realm: c.realm });
    switchTenant?.(c.id);
    setToast(`Switched to ${c.name}`);
    setTimeout(() => setToast(""), 2600);
    setOpen(false);
    setSearch("");
  }, [switchTenant]);

  /* ── hover open / close with delay ── */
  const openPanel = () => {
    clearTimeout(hoverRef.current);
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 80);
  };
  const scheduleClose = () => {
    hoverRef.current = setTimeout(() => { setOpen(false); setSearch(""); }, 220);
  };
  const cancelClose = () => clearTimeout(hoverRef.current);

  /* ── derived ── */
  const currentRealmClients = clientsByRealm[selectedRealm] || [];
  const filtered = currentRealmClients.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.realm?.toLowerCase().includes(search.toLowerCase())
  );
  const allClients = Object.values(clientsByRealm).flat();
  const current    = allClients.find(c => c.id === activeClient?.id);
  const totalCount = allClients.length;
  const activeRealmIdx = realms.indexOf(activeClient?.realm);

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 10000,
          background: "linear-gradient(135deg,#059669,#047857)",
          color: "#fff", padding: "10px 20px", borderRadius: 14,
          fontSize: 13, fontWeight: 600,
          boxShadow: "0 8px 32px rgba(5,150,105,.35)",
          display: "flex", alignItems: "center", gap: 8,
          pointerEvents: "none",
          animation: "ts-fade-in .18s ease",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6ee7b7", display: "inline-block" }} />
          {toast}
        </div>
      )}

      {/* ── Floating pill ── */}
      <div
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
        style={{
          position: "fixed",
          top: 14,
          left: "40%",
          zIndex: 9999,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>

        {/* Pill trigger */}
        <div
          onClick={() => { open ? (setOpen(false), setSearch("")) : openPanel(); }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 14px 7px 10px",
            borderRadius: 40, cursor: "pointer", userSelect: "none",
            background: open ? "rgba(255,255,255,.97)" : "rgba(255,255,255,.92)",
            backdropFilter: "blur(16px)",
            border: `1.5px solid ${open ? "#6366f1" : "rgba(0,0,0,.1)"}`,
            boxShadow: open
              ? "0 4px 24px rgba(99,102,241,.18), 0 1px 4px rgba(0,0,0,.06)"
              : "0 2px 12px rgba(0,0,0,.08)",
            transition: "all .18s ease",
          }}>

          {/* Avatar */}
          {current ? (
            <span style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: avatarColor(current.name),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff",
            }}>
              {initials(current.name)}
            </span>
          ) : (
            <span style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: "#e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon d={IC.building} size={12} className="" style={{ color: "#9ca3af" }} />
            </span>
          )}

          <span style={{
            fontSize: 13, fontWeight: 600,
            color: current ? "#111827" : "#6b7280",
            maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {current?.name ?? "Select tenant"}
          </span>

          {/* Realm badge on pill */}
          {current?.realm && (() => {
            const rc = realmColor(activeRealmIdx < 0 ? 0 : activeRealmIdx);
            return (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 7px",
                borderRadius: 20, background: rc.bg, color: rc.text,
                border: `1px solid ${rc.dot}44`, flexShrink: 0,
              }}>
                {current.realm}
              </span>
            );
          })()}

          {!current && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px",
              borderRadius: 20, background: "#ecfdf5", color: "#059669",
              border: "1px solid #a7f3d0", flexShrink: 0,
            }}>
              {totalCount} tenants
            </span>
          )}

          <Icon d={IC.chevron} size={13}
            style={{
              color: "#9ca3af", flexShrink: 0, marginLeft: 2,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform .18s ease",
            }} />
        </div>

        {/* ── Dropdown panel ── */}
        <div
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          ref={panelRef}
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 320,
            background: "rgba(255,255,255,.97)",
            backdropFilter: "blur(20px)",
            border: "1.5px solid rgba(99,102,241,.2)",
            borderRadius: 18,
            boxShadow: "0 16px 48px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)",
            overflow: "hidden",
            transformOrigin: "top right",
            transition: "all .18s cubic-bezier(.4,0,.2,1)",
            opacity: open ? 1 : 0,
            transform: open ? "scale(1) translateY(0)" : "scale(.96) translateY(-6px)",
            pointerEvents: open ? "all" : "none",
          }}>

          {/* Panel header */}
          <div style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid #f0f0f6",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827", letterSpacing: .2 }}>
                Tenant Switcher
              </p>
              {selectedRealm && (
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6366f1", fontFamily: "monospace" }}>
                  {selectedRealm}
                </p>
              )}
            </div>
            <span style={{
              fontSize: 11, color: "#6b7280", background: "#f3f4f6",
              padding: "2px 8px", borderRadius: 20, fontWeight: 600,
            }}>
              {(clientsByRealm[selectedRealm] || []).length} clients
            </span>
          </div>

          {/* ── Realm tabs ── */}
          {realms.length > 1 && (
            <div style={{
              display: "flex", gap: 5, padding: "8px 10px",
              borderBottom: "1px solid #f0f0f6",
              overflowX: "auto",
            }}>
              {realms.map((r, idx) => {
                const rc  = realmColor(idx);
                const isS = r === selectedRealm;
                const cnt = (clientsByRealm[r] || []).length;
                return (
                  <button
                    key={r}
                    onClick={() => { setSelectedRealm(r); setSearch(""); }}
                    style={{
                      flexShrink: 0,
                      padding: "4px 11px",
                      borderRadius: 20,
                      border: isS ? `1.5px solid ${rc.dot}` : "1.5px solid #e5e7eb",
                      background: isS ? rc.bg : "#fff",
                      color: isS ? rc.text : "#6b7280",
                      fontSize: 11, fontWeight: 700,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                      transition: "all .12s ease",
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: isS ? rc.dot : "#d1d5db",
                      display: "inline-block", flexShrink: 0,
                    }} />
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      background: isS ? `${rc.dot}22` : "#f3f4f6",
                      color: isS ? rc.dot : "#9ca3af",
                      padding: "1px 5px", borderRadius: 10,
                    }}>
                      {cnt}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #f0f0f6" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#f9fafb", borderRadius: 10,
              padding: "7px 10px", border: "1px solid #e5e7eb",
            }}>
              <Icon d={IC.search} size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search in ${selectedRealm ?? "tenants"}…`}
                style={{
                  border: "none", outline: "none", background: "none",
                  fontSize: 12, color: "#111827", width: "100%", fontFamily: "inherit",
                }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{
                  border: "none", background: "none", cursor: "pointer",
                  padding: 0, color: "#9ca3af", display: "flex",
                }}>
                  <Icon d={IC.x} size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Client list */}
          <div style={{ maxHeight: 280, overflowY: "auto", padding: "6px 8px" }}>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} style={{
                  height: 54, borderRadius: 12, margin: "3px 0",
                  background: "linear-gradient(90deg,#f3f4f6 25%,#e9eaf0 50%,#f3f4f6 75%)",
                  backgroundSize: "200% 100%",
                  animation: "ts-shimmer 1.4s infinite",
                }} />
              ))
            ) : filtered.length === 0 ? (
              <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, padding: "20px 0" }}>
                {search ? "No tenants match" : `No clients in ${selectedRealm}`}
              </p>
            ) : (
              filtered.map(c => {
                const isActive = c.id === activeClient?.id;
                const ac = avatarColor(c.name);
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 10px", borderRadius: 12, border: "none", cursor: "pointer",
                      background: isActive
                        ? "linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.06))"
                        : "transparent",
                      transition: "background .12s ease",
                      textAlign: "left",
                      outline: isActive ? "1.5px solid rgba(99,102,241,.25)" : "none",
                      marginBottom: 2,
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f9fafb"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: ac,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#fff",
                      boxShadow: `0 2px 8px ${ac}55`,
                    }}>
                      {initials(c.name)}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: 12.5, fontWeight: 600,
                        color: isActive ? "#4f46e5" : "#111827",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {c.name}
                      </p>
                      <p style={{
                        margin: "2px 0 0", fontSize: 10.5,
                        color: "#9ca3af", fontFamily: "monospace",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {c.realm}
                      </p>
                    </div>

                    {typeof c.userCount === "number" && (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 3,
                        fontSize: 10.5, color: "#9ca3af", flexShrink: 0,
                      }}>
                        <Icon d={IC.users} size={10} />
                        {c.userCount}
                      </span>
                    )}

                    {isActive && (
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                        background: "#4f46e5",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon d={IC.check} size={10} style={{ color: "#fff" }} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {activeClient && (
            <div style={{ padding: "8px 14px 12px", borderTop: "1px solid #f0f0f6" }}>
              <button
                onClick={() => {
                  localStorage.removeItem("selected_client_id");
                  localStorage.removeItem("selected_client_name");
                  localStorage.removeItem("selected_client_realm");
                  window.dispatchEvent(new Event("storage"));
                  setActive(null);
                  switchTenant?.(null);
                  setOpen(false);
                }}
                style={{
                  width: "100%", padding: "7px", borderRadius: 10, border: "none",
                  cursor: "pointer", fontSize: 12, fontWeight: 600,
                  color: "#ef4444", background: "#fef2f2", transition: "background .12s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}
              >
                Clear active tenant
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes ts-fade-in { from { opacity:0; transform:translateX(-50%) translateY(-6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes ts-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </>
  );
};

export default TenantSwitcher;