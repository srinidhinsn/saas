import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

/* ─── Realm pill colours ─────────────────────────────────── */
const REALM_STYLES = [
  { pill: "#ddd6fe", text: "#5b21b6", dot: "#7c3aed", glow: "rgba(124,58,237,0.25)" },
  { pill: "#fde68a", text: "#78350f", dot: "#d97706", glow: "rgba(217,119,6,0.25)"  },
  { pill: "#bbf7d0", text: "#14532d", dot: "#16a34a", glow: "rgba(22,163,74,0.25)"  },
  { pill: "#fecaca", text: "#7f1d1d", dot: "#dc2626", glow: "rgba(220,38,38,0.25)"  },
  { pill: "#bae6fd", text: "#0c4a6e", dot: "#0284c7", glow: "rgba(2,132,199,0.25)"  },
  { pill: "#fbcfe8", text: "#831843", dot: "#db2777", glow: "rgba(219,39,119,0.25)" },
];
const rs = (idx = 0) => REALM_STYLES[idx % REALM_STYLES.length];

/* ═══════════════════════════════════════════════════════════
   TenantSwitcher — shows only realm tabs in a floating pill
═══════════════════════════════════════════════════════════ */
const Super_User_Tenant = ({ clientId, token }) => {
  const [realms, setRealms]          = useState([]);
  const [selectedRealm, setSelected] = useState(null);
  const [loading, setLoading]        = useState(false);

  /* ── fetch realms only ── */
  useEffect(() => {
    if (!clientId || !token) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realms?realm=realm`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const list = res.data.data.realms || [];
        setRealms(list);

        // restore last selected realm from localStorage
        const saved = localStorage.getItem("selected_client_realm");
        const initial = saved && list.includes(saved) ? saved : list[0] || null;
        setSelected(initial);

        // ensure localStorage is set on first load
        if (initial && !saved) {
          localStorage.setItem("selected_client_realm", initial);
          window.dispatchEvent(new Event("storage"));
        }
      } catch (e) {
        console.error("Failed to fetch realms:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId, token]);

  /* ── sync if another part of the app changes the realm ── */
  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("selected_client_realm");
      if (saved && realms.includes(saved) && saved !== selectedRealm) {
        setSelected(saved);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [realms, selectedRealm]);

  const handleRealmClick = (r) => {
    setSelected(r);
    localStorage.setItem("selected_client_realm", r);
    // clear selected client when realm changes
    localStorage.removeItem("selected_client_id");
    localStorage.removeItem("selected_client_name");
    window.dispatchEvent(new Event("storage"));
  };

  if (!realms.length && !loading) return null;

  return (
    <>
      <div style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          padding: "4px 5px",
          borderRadius: 50,
          background: "rgba(255,255,255,0.93)",
          backdropFilter: "blur(20px) saturate(180%)",
          border: "1.5px solid rgba(0,0,0,0.07)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        }}>

          {/* Loading shimmer pills */}
          {loading && [1, 2, 3].map(i => (
            <div key={i} style={{
              width: 72, height: 28, borderRadius: 20,
              background: "linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%)",
              backgroundSize: "200% 100%",
              animation: "tf-shimmer 1.2s ease infinite",
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}

          {/* Realm pills */}
          {!loading && realms.map((r, idx) => {
            const style  = rs(idx);
            const active = r === selectedRealm;
            return (
              <button
                key={r}
                onClick={() => handleRealmClick(r)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 14px",
                  borderRadius: 50,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.02em",
                  transition: "all .18s cubic-bezier(.4,0,.2,1)",
                  background: active ? style.dot : "transparent",
                  color: active ? "#fff" : "#6b7280",
                  boxShadow: active ? `0 2px 12px ${style.glow}` : "none",
                  transform: active ? "scale(1.04)" : "scale(1)",
                  outline: "none",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = style.pill;
                    e.currentTarget.style.color = style.text;
                    e.currentTarget.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#6b7280";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                {/* Dot indicator */}
                <span style={{
                  width: 6, height: 6,
                  borderRadius: "50%",
                  background: active ? "rgba(255,255,255,0.75)" : style.dot,
                  flexShrink: 0,
                  boxShadow: active ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
                  transition: "all .18s ease",
                }} />
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes tf-shimmer {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};

export default Super_User_Tenant;