
import React, { useState } from "react";
import api from "./Api";
import userServicesPort from "../Backend_Port_Files/UserServices";

const AuthModal = ({ isOpen, onClose, onSuccess, clientId, requesterId, page }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(
        `/${clientId}/users/delegate-access?client_id=${clientId}`,
        {
          admin_username: username,
          admin_password: password,
          requester_id: requesterId || "",
          page: page || ""
        }
      );

      localStorage.setItem("delegate_token", res.data.delegated_token);
      console.log("delegated token",res.data.delegated_token)
      onSuccess(res.data.delegated_token, new Date(res.data.expires_at).getTime());
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid admin credentials");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Admin Authorization Required</h2>
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
};

export default AuthModal;

