import React, { useState, useEffect } from "react";
import axios from "axios";
import MenuManager from '../Inventory_Services_Components/MenuManager';
import { useNavigate, useParams } from "react-router-dom";

export default function ClientDetails_V4() {
  const token = localStorage.getItem("access_token");
  const { clientId: clientIdFromParams } = useParams(); 
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(clientIdFromParams); 
  const selectedRealm = "restaurant";
  const navigate = useNavigate();

  useEffect(() => {
    if (!clientId) return;
    axios.get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realm?realm=${selectedRealm}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setClients(res.data.data.clients);
    })
    .catch(err => {
      console.error("Failed to fetch clients list", err);
    });
  }, [selectedRealm, token, clientId]);

  const handleClientSelect = (e) => {
    const selectedId = e.target.value;
    setClientId(selectedId);
    navigate(`/saas/${selectedId}/main/client-details_v4`);
  };

  return (
    <div style={{ height: '89vh', overflow: 'auto' }}>
      <div style={{position:'fixed',left:'30%'}}>

        <select
          id="client-select"
          value={clientId || ""}
          onChange={handleClientSelect}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            border: "2px solid #2874f0",
            borderRadius: "8px",
            background: "#fff",
            color: "#222",
            fontWeight: 500,
            cursor: "pointer",
            outline: "none",
            boxShadow: "0 2px 8px rgba(40, 116, 240, 0.1)",
            transition: "border-color 0.2s, box-shadow 0.2s"
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#1557b0";
            e.target.style.boxShadow = "0 2px 12px rgba(40, 116, 240, 0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#2874f0";
            e.target.style.boxShadow = "0 2px 8px rgba(40, 116, 240, 0.1)";
          }}
        >
          <option value="" disabled>
            -- Choose a client --
          </option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {clientId && (
        <MenuManager clientId={clientId} realm={selectedRealm} />
      )}
    </div>
  );
}