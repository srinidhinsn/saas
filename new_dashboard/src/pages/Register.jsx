import React, { useState } from "react";
import axios from "axios";
import "../styles/Register.css";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        company_name: "",
        email: "",
        password: "",
        confirm_password: "",
        contact_number: ""
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirm_password) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const response = await axios.post("http://localhost:9000/clients", form);

            const { client_id, client_code } = response.data;

            localStorage.setItem("clientId", client_id);
            localStorage.setItem("clientCode", client_code);

            alert(`🎉 Registered! Your Client Code: ${client_code}`);
            navigate("/login");
        } catch (err) {
            console.error("❌ Registration failed:", err?.response?.data);

            const detail = err?.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail[0]?.msg || "Invalid input.");
            } else {
                setError(detail || "Registration failed.");
            }
        }
    };

    return (
        <div className="Register-pages">
            <div className="container">
                <div className="form-container">
                    <form onSubmit={handleRegister}>
                        <h1>Register</h1>

                        <input
                            type="text"
                            placeholder="Full Name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Company Name"
                            name="company_name"
                            value={form.company_name}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Contact Number"
                            name="contact_number"
                            value={form.contact_number}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            name="confirm_password"
                            value={form.confirm_password}
                            onChange={handleChange}
                            required
                        />

                        {error && (
                            <p className="error">
                                {typeof error === "string" ? error : error.msg || "An error occurred."}
                            </p>
                        )}

                        <button type="submit">Sign Up</button>
                        <p className="login-link">
                            Already registered? <a href="/login">Log in here</a>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
