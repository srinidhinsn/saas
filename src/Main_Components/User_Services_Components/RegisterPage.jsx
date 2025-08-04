import React, { useState } from "react";
import userServicesPort from '../../Backend_Port_Files/UserServices'
import { useNavigate, useParams } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";

export default function Register() {
    const navigate = useNavigate();
    const { clientId } = useParams();

    const [form, setForm] = useState({
        username: "",
        password: "",
        confirm_password: "",
        role: "",
        grants: []
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "role") {
            const defaultGrants =
                value === "admin"
                    ? ['invoice', 'inventory', 'billing', 'tables', 'order', 'menu', 'users', 'document']
                    : [];

            setForm((prev) => ({
                ...prev,
                role: value,
                grants: defaultGrants,
            }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };


    const handleGrantChange = (e) => {
        const { value, checked } = e.target;
        setForm((prev) => {
            const grants = checked
                ? [...prev.grants, value]
                : prev.grants.filter((g) => g !== value);
            return { ...prev, grants };
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirm_password) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const payload = {
                username: form.username,
                password: form.password,
                roles: [form.role],
                grants: form.grants
            };

            const response = await userServicesPort.post(
                `/${clientId}/users/register`,
                payload
            );

            alert("\uD83C\uDF89 Registered successfully!");
            navigate(`/saas/${clientId}/login`);
        } catch (err) {
            console.error("\u274C Registration failed:", err?.response?.data);
            const detail = err?.response?.data?.detail;
            setError(Array.isArray(detail) ? detail[0]?.msg : detail || "Registration failed.");
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="avatar-circle">
                    <FaUser className="avatar-icon" />
                </div>
                <form onSubmit={handleRegister}>
                    <div className="input-group">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            placeholder="Username"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            name="confirm_password"
                            value={form.confirm_password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <label htmlFor="role">Role:</label>
                    <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        required
                        className="form-input"
                    >
                        <option value="">Select Role</option>
                        <option value="Admin">Admin</option>
                        <option value="Waiter">Waiter</option>
                    </select>

                    <label>Grants Service:</label>
                    <div className="checkbox-group">
                        {['invoice', 'inventory', 'billing', 'tables'].map((g) => (
                            <label key={g}>
                                <input
                                    type="checkbox"
                                    value={g}
                                    checked={form.grants.includes(g)}
                                    onChange={handleGrantChange}
                                />
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                            </label>
                        ))}
                    </div>

                    {error && (
                        <p className="error">
                            {typeof error === "string" ? error : error.msg || "An error occurred."}
                        </p>
                    )}

                    <button type="submit" className="login-button">Sign Up</button>
                    <p className="login-link">
                        Already registered? <a href={`/saas/${clientId}/login`}>Log in here</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
