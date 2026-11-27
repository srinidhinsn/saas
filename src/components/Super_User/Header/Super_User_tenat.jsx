import React, { useState, useEffect } from "react";
import axios from "axios";

/* ═══════════════════════════════════════════════════════════
   Super_User_Tenant — realm tabs floating at the top centre
═══════════════════════════════════════════════════════════ */
const Super_User_Tenant = ({ clientId, token }) => {
  const [realms, setRealms] = useState([]);
  const [selectedRealm, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  /* fetch realms */
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

        const saved = localStorage.getItem("selected_client_realm");
        const initial = saved && list.includes(saved) ? saved : list[0] || null;
        setSelected(initial);

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

  /* follow realm changes made elsewhere */
  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("selected_client_realm");
      if (saved && realms.includes(saved) && saved !== selectedRealm) setSelected(saved);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [realms, selectedRealm]);

  const handleRealmClick = (r) => {
    setSelected(r);
    localStorage.setItem("selected_client_realm", r);
    localStorage.removeItem("selected_client_id");
    localStorage.removeItem("selected_client_name");
    window.dispatchEvent(new Event("storage"));
  };

  if (!realms.length && !loading) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[1100] font-inter max-w-[calc(100vw-1rem)]">
      <div className="ui-toggle !flex-nowrap !bg-surface !border-brand-line shadow-soft overflow-x-auto scrollbar-hide">
        {loading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="w-[72px] h-7 rounded-seg bg-brand-soft animate-pulse" />
          ))}

        {!loading &&
          realms.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRealmClick(r)}
              className={`ui-toggle-btn whitespace-nowrap capitalize ${
                r === selectedRealm ? "ui-toggle-btn-active" : "hover:bg-brand-light hover:text-brand-dark"
              }`}
              aria-pressed={r === selectedRealm}
            >
              {r}
            </button>
          ))}
      </div>
    </div>
  );
};

export default Super_User_Tenant;