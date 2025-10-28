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
  }, [selectedRealm, token,clientId]);


  const handleClientSelect = (selected) => {
    setClientId(selected.id);
  };


  return (
    <div style={{height:'89vh',overflow:'auto'}}>
      <div>
  <div style={{
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1.5rem"
  }}>
    {clients.map(client => (
      <button
        key={client.id}
        onClick={() => handleClientSelect(client)}
        style={{
          padding: "1rem 2rem",
          border: client.id === clientId ? "2px solid #2874f0" : "1px solid #ccc",
          borderRadius: 14,
          background: client.id === clientId ? "#f0f6ff" : "#fff",
          color: "#222",
          fontWeight: client.id === clientId ? 700 : 500,
          fontSize: "1rem",
          boxShadow: client.id === clientId
            ? "0 2px 12px rgba(40,116,240,0.10)"
            : "0 1px 4px rgba(0,0,0,0.03)",
          cursor: "pointer",
          outline: "none",
          transition: "border 0.2s, box-shadow 0.2s, background 0.2s"
        }}
      >
        {client.name}
      </button>
    ))}
  </div>
</div>


      {clientId && (
        <MenuManager clientId={clientId} realm={selectedRealm} />
      )}
    </div>
  );
}  