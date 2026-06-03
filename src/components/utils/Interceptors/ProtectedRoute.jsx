import React, { useState } from "react";
import axios from "axios";

const AccessGuard = ({
  screenIds = [],
  requiredScreenId,
  clientId,
  requesterId,
  children,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!screenIds.includes(requiredScreenId)) {

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/delegate-access`,
          { admin_username: username, admin_password: password, requester_id: requesterId }
        );
        localStorage.setItem("delegate_token", res.data.delegated_token);
        window.location.reload();
      } catch (err) {
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) setError(detail.map((d) => d.msg).join(", "));
        else if (typeof detail === "string") setError(detail);
        else setError("Invalid admin credentials");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 px-10 py-10 flex flex-col items-center max-w-md w-full mx-4">
          
          {/* Icon + Heading */}
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Access Denied</h1>
          <p className="text-gray-500 text-center text-sm leading-relaxed mb-6">
            You don't have permission to view this page.
            <br />
            Enter admin credentials to get temporary access.
          </p>

          {/* Divider */}
          <div className="w-full border-t border-gray-100 mb-6" />

          {/* Error */}
          {error && (
            <div className="w-full mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Inline form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Admin Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Admin Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-orange-500 text-white text-sm font-medium
                         hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? "Authorizing…" : "Authorize"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AccessGuard;