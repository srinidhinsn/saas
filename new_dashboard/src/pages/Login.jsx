import "../styles/Login.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        client_code: "",
        username: "",
        password: ""
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const response = await axios.post("http://localhost:9000/login", form);

            const { client_id, client_code, token, username } = response.data;

            localStorage.setItem("authToken", token || "");
            localStorage.setItem("clientId", client_id);
            localStorage.setItem("clientCode", client_code);
            localStorage.setItem("username", username || "");

            alert("✅ Login successful");
            navigate("/profile");
        } catch (err) {
            console.error("Login error:", err?.response?.data);
            const detail = err?.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
            setError(msg || "Invalid client code or credentials");
        }
    };

    return (
        <div className="Register-pages">
            <div className="container">
                <div className="form-container">
                    <form onSubmit={handleLogin}>
                        <h1>Login</h1>

                        <input
                            type="text"
                            name="client_code"
                            placeholder="Client Code"
                            value={form.client_code}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />

                        {error && <p className="error">{error}</p>}

                        <button type="submit">Login</button>

                        <p className="login-link">
                            Don’t have an account? <a href="/register">Register</a>
                        </p>

                        <button
                            type="button"
                            className="ghost"
                            onClick={() => navigate("/forgot")}
                        >
                            Forgot Password?
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}


// 

