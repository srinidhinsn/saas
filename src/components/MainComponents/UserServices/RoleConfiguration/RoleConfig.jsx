import React, { useEffect, useState } from "react";
import axios from "axios";
import { Check, Shield } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  const API = import.meta.env.VITE_API_USER_SERVICE_URL;
  const INVENTORY_API = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

  const getRealmFromToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.realm;
    } catch {
      return null;
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
    if (!realm) {
      console.error("Realm missing in token");
      return;
    }
  
    const fetchCatalog = async () => {
      try {
        const res = await axios.get(
          `${API}/${clientId}/users/permissions/catalog?realm=${realm}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setModules(res.data?.data?.modules || []);
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

  /* ===================== SAVE ===================== */
  const saveConfig = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API}/${clientId}/users/roles/${selectedRole}/config`,
        { modules: roleConfig },
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
              const roleName = typeof role === "string" ? role : role.name || role.id || "UNKNOWN";
              return (
                <li
                key={`${roleName}-${index}`}
                  onClick={() => setSelectedRole(roleName)}
                  className={`p-3 rounded-lg cursor-pointer text-sm font-medium transition
        ${selectedRole === roleName? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}
                >
                  {roleName.toUpperCase()}
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

              <div className="space-y-6">
              {modules 
  .filter(mod => !HIDDEN_MODULES.includes(mod.module))
  .map(mod => (
                  <div key={mod.module}>
                    <h3>
                      {mod.label}
                    </h3>

                    <div>
                      {mod.operations?.map((op,index) => (
                        <label key={`${mod.module}-${op}-${index}`} className="flex items-center gap-2 p-3">
                          <input
                            type="checkbox"
                            checked={(roleConfig[mod.module] || []).includes(op)}
                            onChange={() => toggleOperation(mod.module, op)}
                          />
                          <span >{op}</span>
                        </label>
                      ))}

                    </div>
                  </div>
                ))}
              </div>

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















// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { Check, Shield, ChevronRight, ChevronLeft, Search, Sparkles } from "lucide-react";

// const HIDDEN_MODULES = [
//   "realm",
//   "realms",
//   "restaurant"
// ];

// const RoleConfig = ({ token, clientId }) => {
//   const [roles, setRoles] = useState([]);
//   const [modules, setModules] = useState([]);
//   const [selectedRole, setSelectedRole] = useState(null);
//   const [roleConfig, setRoleConfig] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [searchLeft, setSearchLeft] = useState("");
//   const [searchRight, setSearchRight] = useState("");
//   const [selectedLeft, setSelectedLeft] = useState([]);
//   const [selectedRight, setSelectedRight] = useState([]);

//   const API = import.meta.env.VITE_API_USER_SERVICE_URL;
//   const INVENTORY_API = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

//   const getRealmFromToken = (token) => {
//     try {
//       const payload = JSON.parse(atob(token.split(".")[1]));
//       return payload.realm;
//     } catch {
//       return null;
//     }
//   };
  
//   /* ===================== FETCH ROLES ===================== */
//   useEffect(() => {
//     const fetchRoles = async () => {
//       try {
//         const res = await axios.get(
//           `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );

//         const data = res.data?.data;
//         if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.subCategories)) {
//           setRoles(data[0].subCategories);
//         } else {
//           setRoles([]);
//         }

//       } catch (err) { console.error("Error fetching roles:", err); setRoles([]); }
//     }; if (clientId && token) fetchRoles();
//   }, [clientId, token]);

//   /* ===================== FETCH PERMISSION CATALOG ===================== */
//   useEffect(() => {
//     if (!token || !clientId) return;
  
//     const realm = getRealmFromToken(token);
//     if (!realm) {
//       console.error("Realm missing in token");
//       return;
//     }
  
//     const fetchCatalog = async () => {
//       try {
//         const res = await axios.get(
//           `${API}/${clientId}/users/permissions/catalog?realm=${realm}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setModules(res.data?.data?.modules || []);
//       } catch (e) {
//         console.error("catalog error", e);
//       }
//     };
  
//     fetchCatalog();
//   }, [clientId, token]);

//   /* ===================== FETCH ROLE CONFIG ===================== */
//   useEffect(() => {
//     if (!selectedRole) return;

//     const fetchRoleConfig = async () => {
//       try {
//         const res = await axios.get(
//           `${API}/${clientId}/users/roles/${selectedRole}/config`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setRoleConfig(res.data?.data?.config || {});
//       } catch {
//         console.log("error occured");
//       }
//     };
//     fetchRoleConfig();
//   }, [selectedRole]);

//   /* ===================== GET ALL PERMISSIONS ===================== */
//   const getAllPermissions = () => {
//     const permissions = [];
//     modules
//       .filter(mod => !HIDDEN_MODULES.includes(mod.module))
//       .forEach(mod => {
//         mod.operations?.forEach(op => {
//           permissions.push({
//             module: mod.module,
//             moduleLabel: mod.label,
//             operation: op,
//             id: `${mod.module}:${op}`
//           });
//         });
//       });
//     return permissions;
//   };

//   const getAvailablePermissions = () => {
//     const all = getAllPermissions();
//     return all.filter(perm => {
//       const configOps = roleConfig[perm.module] || [];
//       return !configOps.includes(perm.operation);
//     });
//   };

//   const getConfiguredPermissions = () => {
//     const all = getAllPermissions();
//     return all.filter(perm => {
//       const configOps = roleConfig[perm.module] || [];
//       return configOps.includes(perm.operation);
//     });
//   };

//   const filteredAvailable = getAvailablePermissions().filter(perm =>
//     searchLeft === "" ||
//     perm.moduleLabel.toLowerCase().includes(searchLeft.toLowerCase()) ||
//     perm.operation.toLowerCase().includes(searchLeft.toLowerCase())
//   );

//   const filteredConfigured = getConfiguredPermissions().filter(perm =>
//     searchRight === "" ||
//     perm.moduleLabel.toLowerCase().includes(searchRight.toLowerCase()) ||
//     perm.operation.toLowerCase().includes(searchRight.toLowerCase())
//   );

//   /* ===================== TRANSFER OPERATIONS ===================== */
//   const moveToConfigured = () => {
//     const newConfig = { ...roleConfig };
//     selectedLeft.forEach(permId => {
//       const [module, operation] = permId.split(':');
//       if (!newConfig[module]) {
//         newConfig[module] = [];
//       }
//       if (!newConfig[module].includes(operation)) {
//         newConfig[module].push(operation);
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedLeft([]);
//   };

//   const moveToAvailable = () => {
//     const newConfig = { ...roleConfig };
//     selectedRight.forEach(permId => {
//       const [module, operation] = permId.split(':');
//       if (newConfig[module]) {
//         newConfig[module] = newConfig[module].filter(op => op !== operation);
//         if (newConfig[module].length === 0) {
//           delete newConfig[module];
//         }
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedRight([]);
//   };

//   const moveAllToConfigured = () => {
//     const newConfig = { ...roleConfig };
//     filteredAvailable.forEach(perm => {
//       if (!newConfig[perm.module]) {
//         newConfig[perm.module] = [];
//       }
//       if (!newConfig[perm.module].includes(perm.operation)) {
//         newConfig[perm.module].push(perm.operation);
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedLeft([]);
//   };

//   const moveAllToAvailable = () => {
//     const newConfig = { ...roleConfig };
//     filteredConfigured.forEach(perm => {
//       if (newConfig[perm.module]) {
//         newConfig[perm.module] = newConfig[perm.module].filter(op => op !== perm.operation);
//         if (newConfig[perm.module].length === 0) {
//           delete newConfig[perm.module];
//         }
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedRight([]);
//   };

//   /* ===================== SELECTION HANDLERS ===================== */
//   const toggleLeftSelection = (id) => {
//     setSelectedLeft(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//     );
//   };

//   const toggleRightSelection = (id) => {
//     setSelectedRight(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//     );
//   };

//   /* ===================== SAVE ===================== */
//   const saveConfig = async () => {
//     setLoading(true);
//     try {
//       await axios.post(
//         `${API}/${clientId}/users/roles/${selectedRole}/config`,
//         { modules: roleConfig },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//     } catch {
//       console.log("error occured");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getTotalPermissions = () => {
//     return Object.values(roleConfig).reduce((acc, ops) => acc + ops.length, 0);
//   };

//   /* ===================== UI ===================== */
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
//       <div className="max-w-7xl mx-auto">
        
//         {/* Header */}
//         <div className="mb-8">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
//               <Shield className="text-white" size={28} />
//             </div>
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">Role Configuration</h1>
//               <p className="text-gray-600 text-sm mt-1">Manage permissions and access control</p>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
//           {/* LEFT SIDEBAR - ROLES */}
//           <aside className="lg:col-span-3">
//             <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden sticky top-8">
//               <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
//                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
//                   <Shield size={20} /> 
//                   Available Roles
//                 </h2>
//                 <p className="text-blue-100 text-xs mt-1">{roles.length} roles configured</p>
//               </div>
              
//               <div className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
//                 <ul className="space-y-2">
//                   {roles.map((role, index) => {
//                     const roleName = typeof role === "string" ? role : role.name || role.id || "UNKNOWN";
//                     const isSelected = selectedRole === roleName.toLowerCase();
                    
//                     return (
//                       <li
//                         key={`${roleName}-${index}`}
//                         onClick={() => {
//                           setSelectedRole(roleName.toLowerCase());
//                           setSelectedLeft([]);
//                           setSelectedRight([]);
//                         }}
//                         className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 ${
//                           isSelected 
//                             ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg scale-105" 
//                             : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
//                         }`}
//                       >
//                         <div className="flex items-center justify-between">
//                           <span className={`font-semibold text-sm ${
//                             isSelected ? "text-white" : "text-gray-700"
//                           }`}>
//                             {roleName.toUpperCase()}
//                           </span>
//                           {isSelected && (
//                             <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
//                           )}
//                         </div>
//                         {isSelected && (
//                           <div className="mt-2 pt-2 border-t border-white/20">
//                             <p className="text-xs text-white/90">
//                               {getTotalPermissions()} permissions active
//                             </p>
//                           </div>
//                         )}
//                       </li>
//                     );
//                   })}
//                 </ul>
//               </div>
//             </div>
//           </aside>

//           {/* MAIN CONTENT - TRANSFER LIST */}
//           <main className="lg:col-span-9">
//             {!selectedRole ? (
//               <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
//                 <div className="max-w-md mx-auto">
//                   <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
//                     <Shield className="text-blue-600" size={36} />
//                   </div>
//                   <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a Role</h3>
//                   <p className="text-gray-600">
//                     Choose a role from the sidebar to configure its permissions and access levels
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-6">
                
//                 {/* Role Header Card */}
//                 <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
//                   <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//                     <div>
//                       <div className="flex items-center gap-3 mb-2">
//                         <Sparkles className="text-blue-600" size={24} />
//                         <h2 className="text-2xl font-bold text-gray-900">
//                           {selectedRole.toUpperCase()}
//                         </h2>
//                       </div>
//                       <p className="text-gray-600 text-sm">
//                         {getTotalPermissions()} permissions configured across {Object.keys(roleConfig).length} modules
//                       </p>
//                     </div>
                    
//                     <button
//                       disabled={loading}
//                       onClick={saveConfig}
//                       className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
//                     >
//                       <span className="relative z-10 flex items-center gap-2">
//                         <Check size={20} />
//                         {loading ? "Saving..." : "Save Configuration"}
//                       </span>
//                       <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                     </button>
//                   </div>
//                 </div>

//                 {/* Transfer List Interface */}
//                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
//                   {/* LEFT PANEL - Available Permissions */}
//                   <div className="lg:col-span-5 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
//                     <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-4">
//                       <h3 className="font-bold text-white flex items-center gap-2">
//                         Available Permissions
//                       </h3>
//                       <p className="text-gray-300 text-xs mt-1">
//                         {filteredAvailable.length} permissions available
//                       </p>
//                     </div>

//                     {/* Search */}
//                     <div className="p-4 border-b border-gray-200">
//                       <div className="relative">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
//                         <input
//                           type="text"
//                           placeholder="Search..."
//                           value={searchLeft}
//                           onChange={(e) => setSearchLeft(e.target.value)}
//                           className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//                         />
//                       </div>
//                     </div>

//                     {/* Permission List */}
//                     <div className="p-4 max-h-[500px] overflow-y-auto">
//                       <div className="space-y-1">
//                         {filteredAvailable.map(perm => (
//                           <div
//                             key={perm.id}
//                             onClick={() => toggleLeftSelection(perm.id)}
//                             className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
//                               selectedLeft.includes(perm.id)
//                                 ? 'bg-blue-50 border-blue-300 shadow-sm'
//                                 : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
//                             }`}
//                           >
//                             <div className="flex items-center gap-2">
//                               <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
//                                 selectedLeft.includes(perm.id)
//                                   ? 'bg-blue-600 border-blue-600'
//                                   : 'bg-white border-gray-300'
//                               }`}>
//                                 {selectedLeft.includes(perm.id) && (
//                                   <Check size={14} className="text-white" />
//                                 )}
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <p className="font-medium text-sm text-gray-900 truncate">
//                                   {perm.operation}
//                                 </p>
//                                 <p className="text-xs text-gray-500 truncate">
//                                   {perm.moduleLabel}
//                                 </p>
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                       {filteredAvailable.length === 0 && (
//                         <div className="text-center py-8 text-gray-400 text-sm">
//                           No available permissions
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {/* MIDDLE - TRANSFER BUTTONS */}
//                   <div className="lg:col-span-2 flex flex-col items-center justify-center gap-3 py-8">
//                     <button
//                       onClick={moveAllToConfigured}
//                       disabled={filteredAvailable.length === 0}
//                       className="group p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move all to configured"
//                     >
//                       <ChevronRight size={24} className="transform group-hover:translate-x-1 transition-transform" />
//                       <ChevronRight size={24} className="transform group-hover:translate-x-1 transition-transform -ml-4" />
//                     </button>

//                     <button
//                       onClick={moveToConfigured}
//                       disabled={selectedLeft.length === 0}
//                       className="group p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move selected to configured"
//                     >
//                       <ChevronRight size={24} className="transform group-hover:translate-x-1 transition-transform" />
//                     </button>

//                     <div className="my-2 w-px h-8 bg-gray-300"></div>

//                     <button
//                       onClick={moveToAvailable}
//                       disabled={selectedRight.length === 0}
//                       className="group p-3 bg-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move selected to available"
//                     >
//                       <ChevronLeft size={24} className="transform group-hover:-translate-x-1 transition-transform" />
//                     </button>

//                     <button
//                       onClick={moveAllToAvailable}
//                       disabled={filteredConfigured.length === 0}
//                       className="group p-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move all to available"
//                     >
//                       <ChevronLeft size={24} className="transform group-hover:-translate-x-1 transition-transform" />
//                       <ChevronLeft size={24} className="transform group-hover:-translate-x-1 transition-transform -ml-4" />
//                     </button>
//                   </div>

//                   {/* RIGHT PANEL - Configured Permissions */}
//                   <div className="lg:col-span-5 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
//                     <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4">
//                       <h3 className="font-bold text-white flex items-center gap-2">
//                         Configured Permissions
//                       </h3>
//                       <p className="text-green-100 text-xs mt-1">
//                         {filteredConfigured.length} permissions configured
//                       </p>
//                     </div>

//                     {/* Search */}
//                     <div className="p-4 border-b border-gray-200">
//                       <div className="relative">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
//                         <input
//                           type="text"
//                           placeholder="Search..."
//                           value={searchRight}
//                           onChange={(e) => setSearchRight(e.target.value)}
//                           className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
//                         />
//                       </div>
//                     </div>

//                     {/* Permission List */}
//                     <div className="p-4 max-h-[500px] overflow-y-auto">
//                       <div className="space-y-1">
//                         {filteredConfigured.map(perm => (
//                           <div
//                             key={perm.id}
//                             onClick={() => toggleRightSelection(perm.id)}
//                             className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
//                               selectedRight.includes(perm.id)
//                                 ? 'bg-green-50 border-green-300 shadow-sm'
//                                 : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
//                             }`}
//                           >
//                             <div className="flex items-center gap-2">
//                               <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
//                                 selectedRight.includes(perm.id)
//                                   ? 'bg-green-600 border-green-600'
//                                   : 'bg-white border-gray-300'
//                               }`}>
//                                 {selectedRight.includes(perm.id) && (
//                                   <Check size={14} className="text-white" />
//                                 )}
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <p className="font-medium text-sm text-gray-900 truncate">
//                                   {perm.operation}
//                                 </p>
//                                 <p className="text-xs text-gray-500 truncate">
//                                   {perm.moduleLabel}
//                                 </p>
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                       {filteredConfigured.length === 0 && (
//                         <div className="text-center py-8 text-gray-400 text-sm">
//                           No configured permissions
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                 </div>
//               </div>
//             )}
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RoleConfig;







// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { Check, Shield, ChevronRight, ChevronLeft, Search, Sparkles } from "lucide-react";

// const HIDDEN_MODULES = [
//   "realm",
//   "realms",
//   "restaurant"
// ];

// const RoleConfig = ({ token, clientId }) => {
//   const [roles, setRoles] = useState([]);
//   const [modules, setModules] = useState([]);
//   const [selectedRole, setSelectedRole] = useState(null);
//   const [roleConfig, setRoleConfig] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [searchLeft, setSearchLeft] = useState("");
//   const [searchRight, setSearchRight] = useState("");
//   const [selectedLeft, setSelectedLeft] = useState([]);
//   const [selectedRight, setSelectedRight] = useState([]);

//   const API = import.meta.env.VITE_API_USER_SERVICE_URL;
//   const INVENTORY_API = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

//   const getRealmFromToken = (token) => {
//     try {
//       const payload = JSON.parse(atob(token.split(".")[1]));
//       return payload.realm;
//     } catch {
//       return null;
//     }
//   };
  
//   /* ===================== FETCH ROLES ===================== */
//   useEffect(() => {
//     const fetchRoles = async () => {
//       try {
//         const res = await axios.get(
//           `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );

//         const data = res.data?.data;
//         if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.subCategories)) {
//           setRoles(data[0].subCategories);
//         } else {
//           setRoles([]);
//         }

//       } catch (err) { console.error("Error fetching roles:", err); setRoles([]); }
//     }; if (clientId && token) fetchRoles();
//   }, [clientId, token]);

//   /* ===================== FETCH PERMISSION CATALOG ===================== */
//   useEffect(() => {
//     if (!token || !clientId) return;
  
//     const realm = getRealmFromToken(token);
//     if (!realm) {
//       console.error("Realm missing in token");
//       return;
//     }
  
//     const fetchCatalog = async () => {
//       try {
//         const res = await axios.get(
//           `${API}/${clientId}/users/permissions/catalog?realm=${realm}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setModules(res.data?.data?.modules || []);
//       } catch (e) {
//         console.error("catalog error", e);
//       }
//     };
  
//     fetchCatalog();
//   }, [clientId, token]);

//   /* ===================== FETCH ROLE CONFIG ===================== */
//   useEffect(() => {
//     if (!selectedRole) return;

//     const fetchRoleConfig = async () => {
//       try {
//         const res = await axios.get(
//           `${API}/${clientId}/users/roles/${selectedRole}/config`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setRoleConfig(res.data?.data?.config || {});
//       } catch {
//         console.log("error occured");
//       }
//     };
//     fetchRoleConfig();
//   }, [selectedRole]);

//   /* ===================== GET ALL PERMISSIONS ===================== */
//   const getAllPermissions = () => {
//     const permissions = [];
//     modules
//       .filter(mod => !HIDDEN_MODULES.includes(mod.module))
//       .forEach(mod => {
//         mod.operations?.forEach(op => {
//           permissions.push({
//             module: mod.module,
//             moduleLabel: mod.label,
//             operation: op,
//             id: `${mod.module}:${op}`
//           });
//         });
//       });
//     return permissions;
//   };

//   const getAvailablePermissions = () => {
//     const all = getAllPermissions();
//     return all.filter(perm => {
//       const configOps = roleConfig[perm.module] || [];
//       return !configOps.includes(perm.operation);
//     });
//   };

//   const getConfiguredPermissions = () => {
//     const all = getAllPermissions();
//     return all.filter(perm => {
//       const configOps = roleConfig[perm.module] || [];
//       return configOps.includes(perm.operation);
//     });
//   };

//   const filteredAvailable = getAvailablePermissions().filter(perm =>
//     searchLeft === "" ||
//     perm.moduleLabel.toLowerCase().includes(searchLeft.toLowerCase()) ||
//     perm.operation.toLowerCase().includes(searchLeft.toLowerCase())
//   );

//   const filteredConfigured = getConfiguredPermissions().filter(perm =>
//     searchRight === "" ||
//     perm.moduleLabel.toLowerCase().includes(searchRight.toLowerCase()) ||
//     perm.operation.toLowerCase().includes(searchRight.toLowerCase())
//   );

//   /* ===================== TRANSFER OPERATIONS ===================== */
//   const moveToConfigured = () => {
//     const newConfig = { ...roleConfig };
//     selectedLeft.forEach(permId => {
//       const [module, operation] = permId.split(':');
//       if (!newConfig[module]) {
//         newConfig[module] = [];
//       }
//       if (!newConfig[module].includes(operation)) {
//         newConfig[module].push(operation);
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedLeft([]);
//   };

//   const moveToAvailable = () => {
//     const newConfig = { ...roleConfig };
//     selectedRight.forEach(permId => {
//       const [module, operation] = permId.split(':');
//       if (newConfig[module]) {
//         newConfig[module] = newConfig[module].filter(op => op !== operation);
//         if (newConfig[module].length === 0) {
//           delete newConfig[module];
//         }
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedRight([]);
//   };

//   const moveAllToConfigured = () => {
//     const newConfig = { ...roleConfig };
//     filteredAvailable.forEach(perm => {
//       if (!newConfig[perm.module]) {
//         newConfig[perm.module] = [];
//       }
//       if (!newConfig[perm.module].includes(perm.operation)) {
//         newConfig[perm.module].push(perm.operation);
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedLeft([]);
//   };

//   const moveAllToAvailable = () => {
//     const newConfig = { ...roleConfig };
//     filteredConfigured.forEach(perm => {
//       if (newConfig[perm.module]) {
//         newConfig[perm.module] = newConfig[perm.module].filter(op => op !== perm.operation);
//         if (newConfig[perm.module].length === 0) {
//           delete newConfig[perm.module];
//         }
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedRight([]);
//   };

//   /* ===================== SELECTION HANDLERS ===================== */
//   const toggleLeftSelection = (id) => {
//     setSelectedLeft(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//     );
//   };

//   const toggleRightSelection = (id) => {
//     setSelectedRight(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//     );
//   };

//   /* ===================== SAVE ===================== */
//   const saveConfig = async () => {
//     setLoading(true);
//     try {
//       await axios.post(
//         `${API}/${clientId}/users/roles/${selectedRole}/config`,
//         { modules: roleConfig },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//     } catch {
//       console.log("error occured");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getTotalPermissions = () => {
//     return Object.values(roleConfig).reduce((acc, ops) => acc + ops.length, 0);
//   };

//   // Mobile: Category-based view state
//   const [selectedCategory, setSelectedCategory] = useState(null);

//   const getCategories = () => {
//     return modules
//       .filter(mod => !HIDDEN_MODULES.includes(mod.module))
//       .map(mod => ({
//         module: mod.module,
//         label: mod.label,
//         operations: mod.operations || []
//       }));
//   };

//   const toggleOperationMobile = (module, op) => {
//     setRoleConfig(prev => {
//       const ops = prev[module] || [];
//       return {
//         ...prev,
//         [module]: ops.includes(op)
//           ? ops.filter(o => o !== op)
//           : [...ops, op],
//       };
//     });
//   };

//   /* ===================== UI ===================== */
//   return (
//     <div className="h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
//       <div className="h-full max-w-7xl mx-auto p-4">
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          
//           {/* LEFT SIDEBAR - ROLES */}
//           <aside className="lg:col-span-3">
//             <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full">
//               <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
//                 <h2 className="text-base font-bold text-white flex items-center gap-2">
//                   <Shield size={18} /> 
//                   Available Roles
//                 </h2>
//                 <p className="text-blue-100 text-xs mt-1">{roles.length} roles configured</p>
//               </div>
              
//               <div className="p-3 max-h-[calc(100vh-220px)] overflow-y-auto">
//                 <ul className="space-y-2">
//                   {roles.map((role, index) => {
//                     const roleName = typeof role === "string" ? role : role.name || role.id || "UNKNOWN";
//                     const isSelected = selectedRole === roleName.toLowerCase();
                    
//                     return (
//                       <li
//                         key={`${roleName}-${index}`}
//                         onClick={() => {
//                           setSelectedRole(roleName.toLowerCase());
//                           setSelectedLeft([]);
//                           setSelectedRight([]);
//                         }}
//                         className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-300 ${
//                           isSelected 
//                             ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md" 
//                             : "bg-gray-50 hover:bg-gray-100 hover:shadow-sm"
//                         }`}
//                       >
//                         <div className="flex items-center justify-between">
//                           <span className={`font-semibold text-xs ${
//                             isSelected ? "text-white" : "text-gray-700"
//                           }`}>
//                             {roleName.toUpperCase()}
//                           </span>
//                           {isSelected && (
//                             <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
//                           )}
//                         </div>
//                         {isSelected && (
//                           <div className="mt-1 pt-1 border-t border-white/20">
//                             <p className="text-xs text-white/90">
//                               {getTotalPermissions()} permissions
//                             </p>
//                           </div>
//                         )}
//                       </li>
//                     );
//                   })}
//                 </ul>
//               </div>
//             </div>
//           </aside>

//           {/* MAIN CONTENT - TRANSFER LIST */}
//           <main className="lg:col-span-9">
//             {!selectedRole ? (
//               <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center h-full flex items-center justify-center">
//                 <div className="max-w-md mx-auto">
//                   <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                     <Shield className="text-blue-600" size={28} />
//                   </div>
//                   <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Role</h3>
//                   <p className="text-gray-600 text-sm">
//                     Choose a role from the sidebar to configure its permissions
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-4">
                
//                 {/* Role Header Card */}
//                 <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
//                   <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
//                     <div>
//                       <div className="flex items-center gap-2 mb-1">
//                         <Sparkles className="text-blue-600" size={20} />
//                         <h2 className="text-xl font-bold text-gray-900">
//                           {selectedRole.toUpperCase()}
//                         </h2>
//                       </div>
//                       <p className="text-gray-600 text-xs">
//                         {getTotalPermissions()} permissions configured across {Object.keys(roleConfig).length} modules
//                       </p>
//                     </div>
                    
//                     <button
//                       disabled={loading}
//                       onClick={saveConfig}
//                       className="group relative px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden text-sm"
//                     >
//                       <span className="relative z-10 flex items-center gap-2">
//                         <Check size={16} />
//                         {loading ? "Saving..." : "Save Configuration"}
//                       </span>
//                       <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                     </button>
//                   </div>
//                 </div>

//                 {/* MOBILE VIEW - Category-based selection */}
//                 <div className="lg:hidden space-y-3">
//                   {/* Category Selection */}
//                   <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
//                     <h3 className="font-bold text-gray-800 mb-3 text-base">Select Category</h3>
//                     <div className="grid grid-cols-1 gap-2">
//                       {getCategories().map(cat => (
//                         <button
//                           key={cat.module}
//                           onClick={() => setSelectedCategory(cat.module === selectedCategory ? null : cat.module)}
//                           className={`p-3 rounded-lg text-left transition-all duration-300 border-2 ${
//                             selectedCategory === cat.module
//                               ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md'
//                               : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'
//                           }`}
//                         >
//                           <div className="flex items-center justify-between">
//                             <span className="font-semibold text-sm">{cat.label}</span>
//                             <span className={`text-xs px-2 py-0.5 rounded-full ${
//                               selectedCategory === cat.module
//                                 ? 'bg-white/20 text-white'
//                                 : 'bg-blue-100 text-blue-700'
//                             }`}>
//                               {(roleConfig[cat.module] || []).length}/{cat.operations.length}
//                             </span>
//                           </div>
//                         </button>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Operations for Selected Category */}
//                   {selectedCategory && (
//                     <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
//                       <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3">
//                         <h3 className="font-bold text-white text-sm">
//                           {getCategories().find(c => c.module === selectedCategory)?.label}
//                         </h3>
//                         <p className="text-blue-100 text-xs mt-0.5">
//                           Select operations to configure
//                         </p>
//                       </div>
                      
//                       <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
//                         {getCategories()
//                           .find(c => c.module === selectedCategory)
//                           ?.operations.map((op, idx) => {
//                             const isConfigured = (roleConfig[selectedCategory] || []).includes(op);
                            
//                             return (
//                               <label
//                                 key={`${selectedCategory}-${op}-${idx}`}
//                                 className="relative cursor-pointer"
//                               >
//                                 <input
//                                   type="checkbox"
//                                   checked={isConfigured}
//                                   onChange={() => toggleOperationMobile(selectedCategory, op)}
//                                   className="peer sr-only"
//                                 />
                                
//                                 <div className={`
//                                   relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-300
//                                   ${isConfigured 
//                                     ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm' 
//                                     : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
//                                   }
//                                 `}>
                                  
//                                   <div className={`
//                                     relative flex-shrink-0 w-5 h-5 rounded border-2 transition-all duration-300
//                                     ${isConfigured 
//                                       ? 'bg-gradient-to-br from-green-600 to-emerald-600 border-green-600' 
//                                       : 'bg-white border-gray-300'
//                                     }
//                                   `}>
//                                     {isConfigured && (
//                                       <Check 
//                                         size={14} 
//                                         className="absolute inset-0 m-auto text-white" 
//                                       />
//                                     )}
//                                   </div>

//                                   <span className={`
//                                     font-medium text-xs transition-colors duration-300
//                                     ${isConfigured ? 'text-green-900' : 'text-gray-700'}
//                                   `}>
//                                     {op}
//                                   </span>

//                                   {isConfigured && (
//                                     <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
//                                   )}
//                                 </div>
//                               </label>
//                             );
//                           })}
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {/* DESKTOP VIEW - Transfer List Interface */}
//                 <div className="hidden lg:block">
//                   <div className="grid grid-cols-12 gap-4">
                  
//                   {/* LEFT PANEL - Available Permissions */}
//                   <div className="col-span-5 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
//                     <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-3">
//                       <h3 className="font-bold text-white flex items-center gap-2 text-sm">
//                         Available Permissions
//                       </h3>
//                       <p className="text-gray-300 text-xs mt-0.5">
//                         {filteredAvailable.length} permissions available
//                       </p>
//                     </div>

//                     {/* Search */}
//                     <div className="p-3 border-b border-gray-200">
//                       <div className="relative">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
//                         <input
//                           type="text"
//                           placeholder="Search..."
//                           value={searchLeft}
//                           onChange={(e) => setSearchLeft(e.target.value)}
//                           className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
//                         />
//                       </div>
//                     </div>

//                     {/* Permission List */}
//                     <div className="p-3 max-h-[calc(100vh-400px)] overflow-y-auto">
//                       <div className="space-y-1">
//                         {filteredAvailable.map(perm => (
//                           <div
//                             key={perm.id}
//                             onClick={() => toggleLeftSelection(perm.id)}
//                             className={`p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
//                               selectedLeft.includes(perm.id)
//                                 ? 'bg-blue-50 border-blue-300 shadow-sm'
//                                 : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
//                             }`}
//                           >
//                             <div className="flex items-center gap-2">
//                               <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
//                                 selectedLeft.includes(perm.id)
//                                   ? 'bg-blue-600 border-blue-600'
//                                   : 'bg-white border-gray-300'
//                               }`}>
//                                 {selectedLeft.includes(perm.id) && (
//                                   <Check size={12} className="text-white" />
//                                 )}
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <p className="font-medium text-xs text-gray-900 truncate">
//                                   {perm.operation}
//                                 </p>
//                                 <p className="text-xs text-gray-500 truncate">
//                                   {perm.moduleLabel}
//                                 </p>
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                       {filteredAvailable.length === 0 && (
//                         <div className="text-center py-8 text-gray-400 text-sm">
//                           No available permissions
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {/* MIDDLE - TRANSFER BUTTONS */}
//                   <div className="col-span-2 flex flex-col items-center justify-center gap-2 py-4">
//                     <button
//                       onClick={moveAllToConfigured}
//                       disabled={filteredAvailable.length === 0}
//                       className="group p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move all to configured"
//                     >
//                       <ChevronRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
//                       <ChevronRight size={20} className="transform group-hover:translate-x-1 transition-transform -ml-3" />
//                     </button>

//                     <button
//                       onClick={moveToConfigured}
//                       disabled={selectedLeft.length === 0}
//                       className="group p-2 bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move selected to configured"
//                     >
//                       <ChevronRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
//                     </button>

//                     <div className="my-1 w-px h-6 bg-gray-300"></div>

//                     <button
//                       onClick={moveToAvailable}
//                       disabled={selectedRight.length === 0}
//                       className="group p-2 bg-gray-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move selected to available"
//                     >
//                       <ChevronLeft size={20} className="transform group-hover:-translate-x-1 transition-transform" />
//                     </button>

//                     <button
//                       onClick={moveAllToAvailable}
//                       disabled={filteredConfigured.length === 0}
//                       className="group p-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move all to available"
//                     >
//                       <ChevronLeft size={20} className="transform group-hover:-translate-x-1 transition-transform" />
//                       <ChevronLeft size={20} className="transform group-hover:-translate-x-1 transition-transform -ml-3" />
//                     </button>
//                   </div>

//                   {/* RIGHT PANEL - Configured Permissions */}
//                   <div className="col-span-5 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
//                     <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3">
//                       <h3 className="font-bold text-white flex items-center gap-2 text-sm">
//                         Configured Permissions
//                       </h3>
//                       <p className="text-green-100 text-xs mt-0.5">
//                         {filteredConfigured.length} permissions configured
//                       </p>
//                     </div>

//                     {/* Search */}
//                     <div className="p-3 border-b border-gray-200">
//                       <div className="relative">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
//                         <input
//                           type="text"
//                           placeholder="Search..."
//                           value={searchRight}
//                           onChange={(e) => setSearchRight(e.target.value)}
//                           className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
//                         />
//                       </div>
//                     </div>

//                     {/* Permission List */}
//                     <div className="p-3 max-h-[calc(100vh-400px)] overflow-y-auto">
//                       <div className="space-y-1">
//                         {filteredConfigured.map(perm => (
//                           <div
//                             key={perm.id}
//                             onClick={() => toggleRightSelection(perm.id)}
//                             className={`p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
//                               selectedRight.includes(perm.id)
//                                 ? 'bg-green-50 border-green-300 shadow-sm'
//                                 : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
//                             }`}
//                           >
//                             <div className="flex items-center gap-2">
//                               <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
//                                 selectedRight.includes(perm.id)
//                                   ? 'bg-green-600 border-green-600'
//                                   : 'bg-white border-gray-300'
//                               }`}>
//                                 {selectedRight.includes(perm.id) && (
//                                   <Check size={12} className="text-white" />
//                                 )}
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <p className="font-medium text-xs text-gray-900 truncate">
//                                   {perm.operation}
//                                 </p>
//                                 <p className="text-xs text-gray-500 truncate">
//                                   {perm.moduleLabel}
//                                 </p>
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                       {filteredConfigured.length === 0 && (
//                         <div className="text-center py-6 text-gray-400 text-xs">
//                           No configured permissions
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                 </div>
//                 </div>
//               </div>
//             )}
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RoleConfig;


// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { Check, Shield, ChevronRight, ChevronLeft, Search, Sparkles } from "lucide-react";

// const HIDDEN_MODULES = [
//   "realm",
//   "realms",
//   "restaurant"
// ];

// const RoleConfig = ({ token, clientId }) => {
//   const [roles, setRoles] = useState([]);
//   const [modules, setModules] = useState([]);
//   const [selectedRole, setSelectedRole] = useState(null);
//   const [roleConfig, setRoleConfig] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [searchLeft, setSearchLeft] = useState("");
//   const [searchRight, setSearchRight] = useState("");
//   const [selectedLeft, setSelectedLeft] = useState([]);
//   const [selectedRight, setSelectedRight] = useState([]);

//   const API = import.meta.env.VITE_API_USER_SERVICE_URL;
//   const INVENTORY_API = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

//   const getRealmFromToken = (token) => {
//     try {
//       const payload = JSON.parse(atob(token.split(".")[1]));
//       return payload.realm;
//     } catch {
//       return null;
//     }
//   };
  
//   /* ===================== FETCH ROLES ===================== */
//   useEffect(() => {
//     const fetchRoles = async () => {
//       try {
//         const res = await axios.get(
//           `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );

//         const data = res.data?.data;
//         if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.subCategories)) {
//           setRoles(data[0].subCategories);
//         } else {
//           setRoles([]);
//         }

//       } catch (err) { console.error("Error fetching roles:", err); setRoles([]); }
//     }; if (clientId && token) fetchRoles();
//   }, [clientId, token]);

//   /* ===================== FETCH PERMISSION CATALOG ===================== */
//   useEffect(() => {
//     if (!token || !clientId) return;
  
//     const realm = getRealmFromToken(token);
//     if (!realm) {
//       console.error("Realm missing in token");
//       return;
//     }
  
//     const fetchCatalog = async () => {
//       try {
//         const res = await axios.get(
//           `${API}/${clientId}/users/permissions/catalog?realm=${realm}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setModules(res.data?.data?.modules || []);
//       } catch (e) {
//         console.error("catalog error", e);
//       }
//     };
  
//     fetchCatalog();
//   }, [clientId, token]);

//   /* ===================== FETCH ROLE CONFIG ===================== */
//   useEffect(() => {
//     if (!selectedRole) return;

//     const fetchRoleConfig = async () => {
//       try {
//         const res = await axios.get(
//           `${API}/${clientId}/users/roles/${selectedRole}/config`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setRoleConfig(res.data?.data?.config || {});
//       } catch {
//         console.log("error occured");
//       }
//     };
//     fetchRoleConfig();
//   }, [selectedRole]);

//   /* ===================== GET ALL PERMISSIONS ===================== */
//   const getAllPermissions = () => {
//     const permissions = [];
//     modules
//       .filter(mod => !HIDDEN_MODULES.includes(mod.module))
//       .forEach(mod => {
//         mod.operations?.forEach(op => {
//           permissions.push({
//             module: mod.module,
//             moduleLabel: mod.label,
//             operation: op,
//             id: `${mod.module}:${op}`
//           });
//         });
//       });
//     return permissions;
//   };

//   const getAvailablePermissions = () => {
//     const all = getAllPermissions();
//     return all.filter(perm => {
//       const configOps = roleConfig[perm.module] || [];
//       return !configOps.includes(perm.operation);
//     });
//   };

//   const getConfiguredPermissions = () => {
//     const all = getAllPermissions();
//     return all.filter(perm => {
//       const configOps = roleConfig[perm.module] || [];
//       return configOps.includes(perm.operation);
//     });
//   };

//   const filteredAvailable = getAvailablePermissions().filter(perm =>
//     searchLeft === "" ||
//     perm.moduleLabel.toLowerCase().includes(searchLeft.toLowerCase()) ||
//     perm.operation.toLowerCase().includes(searchLeft.toLowerCase())
//   );

//   const filteredConfigured = getConfiguredPermissions().filter(perm =>
//     searchRight === "" ||
//     perm.moduleLabel.toLowerCase().includes(searchRight.toLowerCase()) ||
//     perm.operation.toLowerCase().includes(searchRight.toLowerCase())
//   );

//   /* ===================== TRANSFER OPERATIONS ===================== */
//   const moveToConfigured = () => {
//     const newConfig = { ...roleConfig };
//     selectedLeft.forEach(permId => {
//       const [module, operation] = permId.split(':');
//       if (!newConfig[module]) {
//         newConfig[module] = [];
//       }
//       if (!newConfig[module].includes(operation)) {
//         newConfig[module].push(operation);
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedLeft([]);
//   };

//   const moveToAvailable = () => {
//     const newConfig = { ...roleConfig };
//     selectedRight.forEach(permId => {
//       const [module, operation] = permId.split(':');
//       if (newConfig[module]) {
//         newConfig[module] = newConfig[module].filter(op => op !== operation);
//         if (newConfig[module].length === 0) {
//           delete newConfig[module];
//         }
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedRight([]);
//   };

//   const moveAllToConfigured = () => {
//     const newConfig = { ...roleConfig };
//     filteredAvailable.forEach(perm => {
//       if (!newConfig[perm.module]) {
//         newConfig[perm.module] = [];
//       }
//       if (!newConfig[perm.module].includes(perm.operation)) {
//         newConfig[perm.module].push(perm.operation);
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedLeft([]);
//   };

//   const moveAllToAvailable = () => {
//     const newConfig = { ...roleConfig };
//     filteredConfigured.forEach(perm => {
//       if (newConfig[perm.module]) {
//         newConfig[perm.module] = newConfig[perm.module].filter(op => op !== perm.operation);
//         if (newConfig[perm.module].length === 0) {
//           delete newConfig[perm.module];
//         }
//       }
//     });
//     setRoleConfig(newConfig);
//     setSelectedRight([]);
//   };

//   /* ===================== SELECTION HANDLERS ===================== */
//   const toggleLeftSelection = (id) => {
//     setSelectedLeft(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//     );
//   };

//   const toggleRightSelection = (id) => {
//     setSelectedRight(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//     );
//   };

//   /* ===================== SAVE ===================== */
//   const saveConfig = async () => {
//     setLoading(true);
//     try {
//       await axios.post(
//         `${API}/${clientId}/users/roles/${selectedRole}/config`,
//         { modules: roleConfig },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//     } catch {
//       console.log("error occured");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getTotalPermissions = () => {
//     return Object.values(roleConfig).reduce((acc, ops) => acc + ops.length, 0);
//   };

//   // Mobile: Category-based view state
//   const [selectedCategory, setSelectedCategory] = useState(null);
//   const [selectedCategoryDesktop, setSelectedCategoryDesktop] = useState(null);

//   const getCategories = () => {
//     return modules
//       .filter(mod => !HIDDEN_MODULES.includes(mod.module))
//       .map(mod => ({
//         module: mod.module,
//         label: mod.label,
//         operations: mod.operations || []
//       }));
//   };

//   const toggleOperationMobile = (module, op) => {
//     setRoleConfig(prev => {
//       const ops = prev[module] || [];
//       return {
//         ...prev,
//         [module]: ops.includes(op)
//           ? ops.filter(o => o !== op)
//           : [...ops, op],
//       };
//     });
//   };

//   // Desktop: Get filtered operations for selected module
//   const getAvailableOperationsForModule = () => {
//     if (!selectedCategoryDesktop) return [];
//     const category = getCategories().find(c => c.module === selectedCategoryDesktop);
//     if (!category) return [];
    
//     const configOps = roleConfig[selectedCategoryDesktop] || [];
//     return category.operations.filter(op => !configOps.includes(op));
//   };

//   const getConfiguredOperationsForModule = () => {
//     if (!selectedCategoryDesktop) return [];
//     const configOps = roleConfig[selectedCategoryDesktop] || [];
//     return configOps;
//   };

//   const filteredAvailableOps = getAvailableOperationsForModule().filter(op =>
//     searchLeft === "" || op.toLowerCase().includes(searchLeft.toLowerCase())
//   );

//   const filteredConfiguredOps = getConfiguredOperationsForModule().filter(op =>
//     searchRight === "" || op.toLowerCase().includes(searchRight.toLowerCase())
//   );

//   // Desktop transfer operations for module-based view
//   const moveOpToConfigured = (op) => {
//     if (!selectedCategoryDesktop) return;
//     const newConfig = { ...roleConfig };
//     if (!newConfig[selectedCategoryDesktop]) {
//       newConfig[selectedCategoryDesktop] = [];
//     }
//     if (!newConfig[selectedCategoryDesktop].includes(op)) {
//       newConfig[selectedCategoryDesktop].push(op);
//     }
//     setRoleConfig(newConfig);
//   };

//   const moveOpToAvailable = (op) => {
//     if (!selectedCategoryDesktop) return;
//     const newConfig = { ...roleConfig };
//     if (newConfig[selectedCategoryDesktop]) {
//       newConfig[selectedCategoryDesktop] = newConfig[selectedCategoryDesktop].filter(o => o !== op);
//       if (newConfig[selectedCategoryDesktop].length === 0) {
//         delete newConfig[selectedCategoryDesktop];
//       }
//     }
//     setRoleConfig(newConfig);
//   };

//   const moveAllOpsToConfigured = () => {
//     if (!selectedCategoryDesktop) return;
//     const newConfig = { ...roleConfig };
//     const available = getAvailableOperationsForModule();
//     newConfig[selectedCategoryDesktop] = [
//       ...(newConfig[selectedCategoryDesktop] || []),
//       ...available
//     ];
//     setRoleConfig(newConfig);
//   };

//   const moveAllOpsToAvailable = () => {
//     if (!selectedCategoryDesktop) return;
//     const newConfig = { ...roleConfig };
//     delete newConfig[selectedCategoryDesktop];
//     setRoleConfig(newConfig);
//   };

//   /* ===================== UI ===================== */
//   return (
//     <div className="bg-bg-primary">
//       <div className=" max-w-7xl mx-auto p-2">
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          
//           {/* LEFT SIDEBAR - ROLES */}
//           <aside className="lg:col-span-3">
//             <div className="bg-bg-primary rounded-xl shadow-lg border-default border-border-default overflow-hidden h-full">
//               <div className="bg-action-primary p-4">
//                 <h2 className="text-base font-bold text-text-white flex items-center gap-1">
//                   <Shield size={18} /> 
//                   Available Roles
//                 </h2>
//                 <p className="text-text-white text-xs">{roles.length} roles configured</p>
//               </div>
              
//               <div className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
//                 <ul className="space-y-2">
//                   {roles.map((role, index) => {
//                     const roleName = typeof role === "string" ? role : role.name || role.id || "UNKNOWN";
//                     const isSelected = selectedRole === roleName;
                    
//                     return (
//                       <li
//                         key={`${roleName}-${index}`}
//                         onClick={() => {
//                           setSelectedRole(roleName);
//                           setSelectedLeft([]);
//                           setSelectedRight([]);
//                         }}
//                         className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-300 ${
//                           isSelected 
//                             ? "bg-action-success shadow-md" 
//                             : "bg-bg-tertiary hover:shadow-sm"
//                         }`}
//                       >
//                         <div className="flex items-center justify-between">
//                           <span className={`font-semibold text-xs ${
//                             isSelected ? "text-text-white" : "text-text-secondary"
//                           }`}>
//                             {roleName.toUpperCase()}
//                           </span>
//                           {/* {isSelected && (
//                             <div className="w-2 h-2 rounded-full bg-bg-primary animate-pulse"></div>
//                           )} */}
//                         </div>
//                         {isSelected && (
//                           <div className="mt-1 pt-1 border-t border-white/20">
//                             <p className="text-xs text-white/90">
//                               {getTotalPermissions()} permissions
//                             </p>
//                           </div>
//                         )}
//                       </li>
//                     );
//                   })}
//                 </ul>
//               </div>
//             </div>
//           </aside>

//           {/* MAIN CONTENT - TRANSFER LIST */}
//           <main className="lg:col-span-9">
//             {!selectedRole ? (
//               <div className="bg-bg-primary rounded-xl shadow-lg border-default border-border-default p-8 text-center h-full flex items-center justify-center">
//                 <div className="max-w-md mx-auto">
//                   <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                     <Shield className="text-blue-600" size={28} />
//                   </div>
//                   <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Role</h3>
//                   <p className="text-gray-600 text-sm">
//                     Choose a role from the sidebar to configure its permissions
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-4">
                
//                 {/* Role Header Card */}
//                 <div className="bg-bg-primary rounded-xl shadow-lg border-default border-border-default p-4">
//                   <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
//                     <div>
//                       <div className="flex items-center gap-2 mb-1">
//                         <Sparkles className="text-action-primary" size={20} />
//                         <h2 className="text-xl font-bold text-text-primary">
//                           {selectedRole.toUpperCase()}
//                         </h2>
//                       </div>
//                       <p className="text-text-secondary text-xs">
//                         {getTotalPermissions()} permissions configured across {Object.keys(roleConfig).length} modules
//                       </p>
//                     </div>
                    
//                     <button
//                       disabled={loading}
//                       onClick={saveConfig}
//                       className="group relative px-6 py-2 text-text-white bg-action-primary rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden text-sm"
//                     >
//                       <span className="relative z-10 flex items-center gap-2">
//                         <Check size={16} />
//                         {loading ? "Saving..." : "Save Configuration"}
//                       </span>
//                       <div className="absolute inset-0 bg-action-success opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                     </button>
//                   </div>
//                 </div>

//                 {/* MOBILE VIEW - Category-based selection */}
//                 <div className="lg:hidden space-y-3">
//                   {/* Category Selection */}
//                   <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
//                     <h3 className="font-bold text-gray-800 mb-3 text-base">Select Category</h3>
//                     <div className="grid grid-cols-1 gap-2">
//                       {getCategories().map(cat => (
//                         <button
//                           key={cat.module}
//                           onClick={() => setSelectedCategory(cat.module === selectedCategory ? null : cat.module)}
//                           className={`p-3 rounded-lg text-left transition-all duration-300 border-2 ${
//                             selectedCategory === cat.module
//                               ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md'
//                               : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'
//                           }`}
//                         >
//                           <div className="flex items-center justify-between">
//                             <span className="font-semibold text-sm">{cat.label}</span>
//                             <span className={`text-xs px-2 py-0.5 rounded-full ${
//                               selectedCategory === cat.module
//                                 ? 'bg-white/20 text-white'
//                                 : 'bg-blue-100 text-blue-700'
//                             }`}>
//                               {(roleConfig[cat.module] || []).length}/{cat.operations.length}
//                             </span>
//                           </div>
//                         </button>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Operations for Selected Category */}
//                   {selectedCategory && (
//                     <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
//                       <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3">
//                         <h3 className="font-bold text-white text-sm">
//                           {getCategories().find(c => c.module === selectedCategory)?.label}
//                         </h3>
//                         <p className="text-blue-100 text-xs mt-0.5">
//                           Select operations to configure
//                         </p>
//                       </div>
                      
//                       <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
//                         {getCategories()
//                           .find(c => c.module === selectedCategory)
//                           ?.operations.map((op, idx) => {
//                             const isConfigured = (roleConfig[selectedCategory] || []).includes(op);
                            
//                             return (
//                               <label
//                                 key={`${selectedCategory}-${op}-${idx}`}
//                                 className="relative cursor-pointer"
//                               >
//                                 <input
//                                   type="checkbox"
//                                   checked={isConfigured}
//                                   onChange={() => toggleOperationMobile(selectedCategory, op)}
//                                   className="peer sr-only"
//                                 />
                                
//                                 <div className={`
//                                   relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-300
//                                   ${isConfigured 
//                                     ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm' 
//                                     : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
//                                   }
//                                 `}>
                                  
//                                   <div className={`
//                                     relative flex-shrink-0 w-5 h-5 rounded border-2 transition-all duration-300
//                                     ${isConfigured 
//                                       ? 'bg-gradient-to-br from-green-600 to-emerald-600 border-green-600' 
//                                       : 'bg-white border-gray-300'
//                                     }
//                                   `}>
//                                     {isConfigured && (
//                                       <Check 
//                                         size={14} 
//                                         className="absolute inset-0 m-auto text-white" 
//                                       />
//                                     )}
//                                   </div>

//                                   <span className={`
//                                     font-medium text-xs transition-colors duration-300
//                                     ${isConfigured ? 'text-green-900' : 'text-gray-700'}
//                                   `}>
//                                     {op}
//                                   </span>

//                                   {isConfigured && (
//                                     <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
//                                   )}
//                                 </div>
//                               </label>
//                             );
//                           })}
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {/* DESKTOP VIEW - Transfer List Interface */}
//                 <div className="hidden lg:block">
                  
//                   {/* Module Selection for Desktop */}
//                   <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 mb-4">
//                     <h3 className="font-bold text-gray-800 mb-3 text-base">Select Module</h3>
//                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
//                       {getCategories().map(cat => (
//                         <button
//                           key={cat.module}
//                           onClick={() => setSelectedCategoryDesktop(cat.module === selectedCategoryDesktop ? null : cat.module)}
//                           className={`p-3 rounded-lg text-left transition-all duration-300 border-2 ${
//                             selectedCategoryDesktop === cat.module
//                               ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md'
//                               : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'
//                           }`}
//                         >
//                           <div className="flex flex-col gap-1">
//                             <span className="font-semibold text-sm">{cat.label}</span>
//                             <span className={`text-xs ${
//                               selectedCategoryDesktop === cat.module
//                                 ? 'text-white/80'
//                                 : 'text-gray-500'
//                             }`}>
//                               {(roleConfig[cat.module] || []).length}/{cat.operations.length}
//                             </span>
//                           </div>
//                         </button>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Transfer Interface - Show only when module selected */}
//                   {!selectedCategoryDesktop ? (
//                     <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
//                       <div className="max-w-md mx-auto">
//                         <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                           <Sparkles className="text-blue-600" size={28} />
//                         </div>
//                         <h3 className="text-lg font-bold text-gray-900 mb-2">Select a Module</h3>
//                         <p className="text-gray-600 text-sm">
//                           Choose a module above to configure its operations
//                         </p>
//                       </div>
//                     </div>
//                   ) : (
//                   <div className="grid grid-cols-12 gap-4">
                  
//                   {/* LEFT PANEL - Available Operations */}
//                   <div className="col-span-5 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
//                     <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-3">
//                       <h3 className="font-bold text-white flex items-center gap-2 text-sm">
//                         Available Operations
//                       </h3>
//                       <p className="text-gray-300 text-xs mt-0.5">
//                         {filteredAvailableOps.length} operations available
//                       </p>
//                     </div>

//                     {/* Search */}
//                     <div className="p-3 border-b border-gray-200">
//                       <div className="relative">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
//                         <input
//                           type="text"
//                           placeholder="Search operations..."
//                           value={searchLeft}
//                           onChange={(e) => setSearchLeft(e.target.value)}
//                           className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
//                         />
//                       </div>
//                     </div>

//                     {/* Operations List */}
//                     <div className="p-3 max-h-[calc(100vh-480px)] overflow-y-auto">
//                       <div className="space-y-1">
//                         {filteredAvailableOps.map((op, idx) => (
//                           <div
//                             key={`available-${op}-${idx}`}
//                             onClick={() => moveOpToConfigured(op)}
//                             className="p-2 rounded-lg cursor-pointer transition-all duration-200 border bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300"
//                           >
//                             <div className="flex items-center justify-between">
//                               <p className="font-medium text-xs text-gray-900">
//                                 {op}
//                               </p>
//                               <ChevronRight size={16} className="text-gray-400" />
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                       {filteredAvailableOps.length === 0 && (
//                         <div className="text-center py-6 text-gray-400 text-xs">
//                           {searchLeft ? 'No operations found' : 'All operations configured'}
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {/* MIDDLE - TRANSFER BUTTONS */}
//                   <div className="col-span-2 flex flex-col items-center justify-center gap-2 py-4">
//                     <button
//                       onClick={moveAllOpsToConfigured}
//                       disabled={filteredAvailableOps.length === 0}
//                       className="group p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Move all to configured"
//                     >
//                       <ChevronRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
//                       <ChevronRight size={20} className="transform group-hover:translate-x-1 transition-transform -ml-3" />
//                     </button>

//                     <div className="my-1 w-px h-6 bg-gray-300"></div>

//                     <button
//                       onClick={moveAllOpsToAvailable}
//                       disabled={filteredConfiguredOps.length === 0}
//                       className="group p-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
//                       title="Remove all from configured"
//                     >
//                       <ChevronLeft size={20} className="transform group-hover:-translate-x-1 transition-transform" />
//                       <ChevronLeft size={20} className="transform group-hover:-translate-x-1 transition-transform -ml-3" />
//                     </button>
//                   </div>

//                   {/* RIGHT PANEL - Configured Operations */}
//                   <div className="col-span-5 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
//                     <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3">
//                       <h3 className="font-bold text-white flex items-center gap-2 text-sm">
//                         Configured Operations
//                       </h3>
//                       <p className="text-green-100 text-xs mt-0.5">
//                         {filteredConfiguredOps.length} operations configured
//                       </p>
//                     </div>

//                     {/* Search */}
//                     <div className="p-3 border-b border-gray-200">
//                       <div className="relative">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
//                         <input
//                           type="text"
//                           placeholder="Search operations..."
//                           value={searchRight}
//                           onChange={(e) => setSearchRight(e.target.value)}
//                           className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
//                         />
//                       </div>
//                     </div>

//                     {/* Operations List */}
//                     <div className="p-3 max-h-[calc(100vh-480px)] overflow-y-auto">
//                       <div className="space-y-1">
//                         {filteredConfiguredOps.map((op, idx) => (
//                           <div
//                             key={`configured-${op}-${idx}`}
//                             onClick={() => moveOpToAvailable(op)}
//                             className="p-2 rounded-lg cursor-pointer transition-all duration-200 border bg-green-50 border-green-200 hover:bg-red-50 hover:border-red-300"
//                           >
//                             <div className="flex items-center justify-between">
//                               <p className="font-medium text-xs text-gray-900">
//                                 {op}
//                               </p>
//                               <ChevronLeft size={16} className="text-gray-400" />
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                       {filteredConfiguredOps.length === 0 && (
//                         <div className="text-center py-6 text-gray-400 text-xs">
//                           {searchRight ? 'No operations found' : 'No operations configured'}
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                 </div>
//                 )}
//                 </div>
//               </div>
//             )}
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RoleConfig;