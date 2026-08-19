import React, { useEffect, useState } from "react";
import axios from "axios";
import { Check, Shield } from "lucide-react";
import { jwtDecode } from "jwt-decode";
const HIDDEN_MODULES = [
  "realm",
  "realms", 
  "restaurant"
];

const RoleConfig = ({ token, clientId }) => {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleConfig, setRoleConfig] = useState({});
  const [screenIds, setScreenIds] = useState({});
  const [loading, setLoading] = useState(false);

  const API = import.meta.env.VITE_API_USER_SERVICE_URL;
  const INVENTORY_API = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

  const getRealmFromToken = (token) => {
    try {
      const payload = jwtDecode(token);
      return payload.realm;
    } catch {
      return null;
    }
  };
  const [savingModule, setSavingModule] = useState(null);

/* ===================== SAVE (per module) ===================== */
const saveModuleScreenId = async (mod) => {
  setSavingModule(mod);
  try {
    const modulesPayload = {};
    const normalizedScreenIds = {};

    modules.forEach(({ module: m }) => {
      modulesPayload[m] = roleConfig[m] || [];           
      normalizedScreenIds[m] = screenIds[m]?.trim() || `default_${m}`;
    });

    await axios.post(
      `${API}/${clientId}/users/roles/${selectedRole}/config`,
      { modules: modulesPayload, screen_ids: normalizedScreenIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    console.log("error occured");
  } finally {
    setSavingModule(null);
  }
};
  /* ===================== FETCH ROLES ===================== */
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = res.data?.data;
        if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.subCategories)) {
          setRoles(data[0].subCategories);
        } else {
          setRoles([]);
        }

      } catch (err) { console.error("Error fetching roles:", err); setRoles([]); }
    }; if (clientId && token) fetchRoles();
  }, [clientId, token]);



  /* ===================== FETCH PERMISSION CATALOG ===================== */
  useEffect(() => {
    if (!token || !clientId) return;
    const realm = getRealmFromToken(token);
    if (!realm) { console.error("Realm missing in token"); return; }
  
    const fetchCatalog = async () => {
      try {
        const res = await axios.get(
          `${API}/${clientId}/users/permissions/catalog?realm=${realm}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const mods = res.data?.data?.modules || [];
        setModules(mods);
        setScreenIds(prev => {
          const defaults = {};
          mods.forEach(m => { defaults[m.module] = m.screen_id || `default_${m.module}`; });
          return { ...defaults, ...prev };
        });
      } catch (e) {
        console.error("catalog error", e);
      }
    };
  
    fetchCatalog();
  }, [clientId, token]);
  

  /* ===================== FETCH ROLE CONFIG ===================== */
  useEffect(() => {
    if (!selectedRole) return;
  
    const fetchRoleConfig = async () => {
      try {
        const res = await axios.get(
          `${API}/${clientId}/users/roles/${selectedRole}/config`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRoleConfig(res.data?.data?.config || {});
        setScreenIds(prev => ({ ...prev, ...(res.data?.data?.screen_ids || {}) }));
      } catch {
        console.log("error occured");
      }
    };
    fetchRoleConfig();
  }, [selectedRole]);

  /* ===================== TOGGLE OPERATION ===================== */
  const toggleOperation = (module, op) => {
    setRoleConfig(prev => {
      const ops = prev[module] || [];
      return {
        ...prev,
        [module]: ops.includes(op)
          ? ops.filter(o => o !== op)
          : [...ops, op],
      };
    });
  };
  const toggleSelectAll = (module, allOps) => {
    setRoleConfig(prev => {
      const current = prev[module] || [];
      const isAllSelected = allOps.length > 0 && allOps.every(op => current.includes(op));
  
      return {
        ...prev,
        [module]: isAllSelected ? [] : [...allOps],
      };
    });
  };
  /* ===================== SAVE ===================== */
  const saveConfig = async () => {
    setLoading(true);
    try {
      const modulesPayload = {};
      const normalizedScreenIds = {};
  
      modules.forEach(({ module: m }) => {
        modulesPayload[m] = roleConfig[m] || [];
        normalizedScreenIds[m] = screenIds[m]?.trim() || `default_${m}`;
      });
  
      await axios.post(
        `${API}/${clientId}/users/roles/${selectedRole}/config`,
        { modules: modulesPayload, screen_ids: normalizedScreenIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      console.log("error occured");
    } finally {
      setLoading(false);
    }
  };
  // console.log("ROLES STATE 👉", roles);
  // console.log("MODULES STATE 👉", modules);

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg grid grid-cols-1  overflow-hidden">

        {/* LEFT – ROLES */}
        <aside className="border-r p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield size={18} /> Roles
          </h2>
          <ul className="space-y-4">
            {roles.map((role,index) => {
              const roleName = typeof role === "string" ? role : role.id || role.name || "UNKNOWN";
              return (
                <li
                key={`${roleName}-${index}`}
                  onClick={() => setSelectedRole(roleName)}
                  className={`p-3 rounded-lg cursor-pointer text-sm font-medium transition
        ${selectedRole === roleName? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}
                >
                  {roleName}
                </li>
              );
            })}

          </ul>
        </aside>

        {/* RIGHT – MODULES & OPS */}
        <main className=" p-6">
          {!selectedRole ? (
            <div >
              Select a role to configure permissions
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-6">
                Permissions for <span className="text-blue-600">{selectedRole}</span>
              </h2>

              {modules
  .filter(mod => !HIDDEN_MODULES.includes(mod.module))
  .map(mod => {
    const allOps = mod.operations || [];
    const selectedOps = roleConfig[mod.module] || [];
    const isAllSelected = allOps.length > 0 && allOps.every(op => selectedOps.includes(op));

    return (
      <div key={mod.module}>
        <div className="flex items-center justify-between">
          <h3>{mod.label}</h3>
          <button
            type="button"
            onClick={() => toggleSelectAll(mod.module, allOps)}
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
          >
            {isAllSelected ? "Deselect All" : "Select All"}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">screen_id:</span>
          <input
            type="text"
            value={screenIds[mod.module] ?? ""}
            onChange={(e) =>
              setScreenIds(prev => ({ ...prev, [mod.module]: e.target.value }))
            }
            placeholder={`default_${mod.module}`}
            className="text-xs font-mono px-2 py-1 border border-gray-300 rounded w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            disabled={savingModule === mod.module}
            onClick={() => saveModuleScreenId(mod.module)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Check size={12} />
            {savingModule === mod.module ? "Saving..." : "Save"}
          </button>
        </div>

        <div>
          {allOps.map((op, index) => (
            <label key={`${mod.module}-${op}-${index}`} className="flex items-center gap-2 p-3">
              <input
                type="checkbox"
                checked={selectedOps.includes(op)}
                onChange={() => toggleOperation(mod.module, op)}
              />
              <span>{op}</span>
            </label>
          ))}
        </div>
      </div>
    );
  })}
              <div className="mt-8 flex justify-end">
                <button
                  disabled={loading}
                  onClick={saveConfig}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={18} />
                  Save Configuration
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default RoleConfig;
