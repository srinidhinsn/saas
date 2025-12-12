import React, { useState } from "react";
import axios from "axios";

export default function AuthModal({ open, onClose, onSuccess, clientId, requesterId }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const payload = {
      admin_username: username || "",
      admin_password: password || "",
      requester_id: requesterId || ""
    };
    console.log("Sending payload to API:", JSON.stringify(payload, null, 2));
  
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/delegate-access`,
        payload,
      );
  
      const token = res.data.delegated_token;
      localStorage.setItem("delegate_token", token);
      onSuccess(token);
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(", "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Invalid admin credentials");
      }
    }
  };
  

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Admin Authorization Required</h2>

        {error && (
          <div className="error">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Admin Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Authorize</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
}
