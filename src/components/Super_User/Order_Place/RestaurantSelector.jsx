import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTenant } from "../../../context/TenantContext";

const RestaurantSelector = ({ token, superClientId }) => {
  const { clientId, switchTenant } = useTenant();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !superClientId) return;

    let isMounted = true;

    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${superClientId}/users/realm`,
          {
            params: { realm: "restaurant" },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!isMounted) return;

        const allClients = res.data?.data?.clients || [];

        const filteredClients = allClients.filter(
          (c) => c.id !== superClientId
        );

        setClients(filteredClients);

      } catch (err) {
        console.error("Restaurant fetch error:", err);
        if (isMounted) setError("Failed to load restaurants");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRestaurants();

    return () => {
      isMounted = false;
    };

  }, [token, superClientId]);

  return (
    <select
      value={clientId || ""}
      onChange={(e) => switchTenant(e.target.value)}
      className="min-w-[180px] border-none outline-none rounded-lg px-3 py-2 bg-bg-primary"
      disabled={loading}
    >
      {loading && <option>Loading restaurants...</option>}

      {!loading && error && (
        <option value="">{error}</option>
      )}

      {!loading && !error && (
        <>
          <option value="">Select Restaurant</option>

          {clients.length === 0 ? (
            <option disabled>No restaurants available</option>
          ) : (
            clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
        </>
      )}
    </select>
  );
};

export default RestaurantSelector;