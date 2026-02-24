import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTenant } from "../../../context/TenantContext";

const RestaurantSelector = ({ token, superClientId }) => {
  const { clientId, switchTenant } = useTenant();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${superClientId}/users/realm?realm=restaurant`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allClients = res.data.data.clients || [];

      // remove platform tenant
      const filtered = allClients.filter(c => c.id !== superClientId);
      
      setClients(filtered);
    };
    load();
  }, []);

  return (
    <select
      value={clientId || ""}
      onChange={(e) => switchTenant(e.target.value)}
      className="border rounded-lg px-3 py-2 bg-white"
    >
      <option value="">Select Restaurant</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
};

export default RestaurantSelector;