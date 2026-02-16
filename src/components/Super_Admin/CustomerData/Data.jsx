import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const Data = ({ clientId, token }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const navigate = useNavigate();
    const [realms, setRealms] = useState([]);
    const [selectedRealm, setSelectedRealm] = useState("");
    
    // fetch all clients (realms)
    useEffect(() => {
        if (!selectedRealm) return;
    
        const fetchClientsAndUsers = async () => {
            try {
                setLoading(true);
    
                const res = await axios.get(
                    `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realm?realm=${selectedRealm}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
    
                const clientList = res.data.data.clients;
    
                const fullData = await Promise.all(
                    clientList.map(async (client) => {
                        try {
                            const personRes = await axios.get(
                                `${import.meta.env.VITE_API_USER_SERVICE_URL}/${client.id}/users/persons?client_id=${client.id}`,
                                {
                                    headers: { Authorization: `Bearer ${token}` },
                                }
                            );
    
                            return {
                                ...client,
                                users: personRes.data.data.persons || [],
                            };
                        } catch {
                            return { ...client, users: [] };
                        }
                    })
                );
    
                setClients(fullData);
            } catch (err) {
                console.error("Failed loading super admin data", err);
            } finally {
                setLoading(false);
            }
        };
    
        fetchClientsAndUsers();
    }, [selectedRealm, clientId, token]);
    
    useEffect(() => {
        const fetchRealms = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realms?realm=realm`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
    
                const r = res.data.data.realms || [];
                setRealms(r);
    
                if (r.length > 0) setSelectedRealm(r[0]);
            } catch (err) {
                console.error("Failed loading realms", err);
            }
        };
    
        fetchRealms();
    }, [clientId, token]);
    
    const toggle = (id) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const switchTenant = (selectedClientId) => {
        // store selected tenant
        localStorage.setItem("client_id", selectedClientId);
    
        // navigate to that tenant's dashboard
        navigate(`/saas/${selectedClientId}/home`, { replace: true });
    
        // VERY IMPORTANT → reload app context
        window.location.reload();
    };
    

    return (
        <div className="p-4 md:p-8 min-h-screen bg-bg-primary">
            <h1 className="text-2xl md:text-3xl font-bold mb-8 text-action-primary">
                Customer Tenants
            </h1>
{/* REALM SELECTOR */}
<div className="mb-8 flex flex-wrap gap-3">
    {realms.map((realm) => (
        <button
            key={realm}
            onClick={() => setSelectedRealm(realm)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all
            ${
                selectedRealm === realm
                    ? "bg-action-primary text-white shadow-md scale-105"
                    : "bg-bg-tertiary dark:bg-bg-tertiary-dark hover:scale-105"
            }`}
        >
            {realm.toUpperCase()}
        </button>
    ))}
</div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {clients.map((client) => (
                    <div
                        key={client.id}
                        className="rounded-2xl border border-border-default dark:border-border-default-dark 
                           bg-bg-primary shadow-sm hover:shadow-xl transition-all duration-300"
                    >
                        {/* TENANT HEADER */}
                        <div
                            onClick={() => toggle(client.id)} onDoubleClick={() => switchTenant(client.id)}
                            className="cursor-pointer p-5 flex items-center justify-between"
                        >
                            <div>
                                <div className="text-lg font-semibold tracking-wide">
                                    {client.name || "Unnamed Tenant"}
                                </div>

                                <div className="text-xs mt-1 opacity-70">
                                    Realm:{" "}
                                    <span className="font-mono text-action-primary">
                                        {client.realm}
                                    </span>
                                </div>
                            </div>

                            {/* User count badge */}
                            <div className="px-3 py-1 rounded-full text-xs font-medium 
                                  bg-action-primary text-white">
                                {client.users.length} users
                            </div>
                        </div>

                        {/* USERS SECTION */}
                        <div
                            className={`transition-all duration-300 overflow-hidden ${expanded[client.id] ? "max-h-[600px] pb-5" : "max-h-0"
                                }`}
                        >
                            <div className="px-5 pt-2 space-y-3">
                                {client.users.length === 0 && (
                                    <div className="text-sm opacity-60">
                                        No users registered
                                    </div>
                                )}

                                {client.users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between rounded-xl
                                   bg-bg-tertiary dark:bg-bg-tertiary-dark
                                   px-4 py-3 hover:scale-[1.02] transition-transform"
                                    >
                                        {/* USER INFO */}
                                        <div className="flex items-center gap-3">
                                            {/* avatar circle */}
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center
                                          bg-action-primary text-white font-semibold">
                                                {(user.first_name || user.username)?.[0]?.toUpperCase()}
                                            </div>

                                            <div>
                                                <div className="text-sm font-medium">
                                                    {user.username}
                                                </div>

                                                <div className="text-xs opacity-70">
                                                    {user.email || "No email"}
                                                </div>
                                                <div className="text-xs opacity-70">
                                                    {user.phone || "No contact"}
                                                </div>

                                            </div>
                                        </div>

                                        {/* ROLE BADGE */}
                                        <div className="px-3 py-1 rounded-full text-xs font-semibold
                                        bg-action-success/20 text-action-success">
                                            {user.roles?.[0] || "user"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

};

export default Data;



// =========================================================   Working ========================================================== //
// =========================================================   Working ========================================================== //
// =========================================================   Working ========================================================== //
// =========================================================   Working ========================================================== //
// =========================================================   Working ========================================================== //