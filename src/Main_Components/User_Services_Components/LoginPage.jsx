import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FaUser, FaLock } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import userServicesPort from '../../Backend_Port_Files/UserServices'

export default function Login() {
    const navigate = useNavigate();
    const { clientId } = useParams();
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await userServicesPort.post(
                `/${clientId}/users/login`,
                {
                    username: form.username,
                    password: form.password,
                }
            );

            const token = res.data.data.access_token;
            const decoded = jwtDecode(token);

            localStorage.setItem("access_token", token);
            localStorage.setItem("clientId", decoded.client_id);
            localStorage.setItem("username", decoded.username);
            localStorage.setItem("grants", JSON.stringify(decoded.grants || []));

            toast.success("Login successful");

            navigate(`/saas/${clientId}/main`);
        } catch (err) {
            console.error("Login failed:", err);

            let msg = "An unexpected error occurred";
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;

            if (status === 401) {
                msg = detail || "Unauthorized: Invalid credentials";
            } else if (status === 404) {
                msg = detail || "Not Found: API endpoint or client not found";
            } else if (status === 500) {
                msg = "Internal Server Error. Please try again later.";
            } else if (detail && typeof detail === "string") {
                msg = detail;
            }

            setError(msg);
            toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="avatar-circle">
                    <FaUser className="avatar-icon" />
                </div>

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="options-row">
                        <span onClick={() => navigate(`/saas/${clientId}/forgot`)}>Forgot Password?</span>
                    </div>

                    {/* {error && <p className="error">{error}</p>} */}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Logging in..." : "LOGIN"}
                    </button>

                    <p className="login-link">
                        Don’t have an account?{" "}
                        <span onClick={() => navigate(`/saas/${clientId}/register`)}>Register here</span>
                    </p>
                </form>
            </div>
        </div>
    );
}
