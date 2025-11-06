import React, { useState,useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CircularText from '../../Util_Components/CircularText';
import axios from "axios";
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
    // useEffect(() => {
    //     if (!clientId) return; 
    //     document.body.classList.forEach(cls => {
    //       if (cls.startsWith("client-")) document.body.classList.remove(cls);
    //     });
    
    //     // Add new class
    //     document.body.classList.add(`client-${clientId.toLowerCase()}`);
    //     console.log("Added body class:", `client-${clientId.toLowerCase()}`);
    //   }, [clientId]);
      
      

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/login`,
                {
                    username: form.username,
                    password: form.password,
                }
            );

            console.log("Login response:", res.data);
            const token = res.data.data.access_token;
            const screen_id = res.data.screen_id || "default_user";
            localStorage.setItem("access_token", token);
            localStorage.setItem("screen_id", screen_id); // ✅ Save for later use

            toast.success("Login successful");
            navigate(`/saas/${clientId}/main`);
        } catch (err) {
            console.error("Login failed:", err);
            let msg = err?.response?.data?.detail || "Login failed";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="avatar-circle">
                    <FaUser className="avatar-icon" />
                    {/* Circular spinning text around avatar */}
                    <CircularText
                        text={`${clientId.split('').join('★')} ♡ `}
                        spinDuration={20}
                        className="circular-clientId"
                    />

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

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {/* <div className="options-row login-link">
                            <span onClick={() => navigate(`/saas/${clientId}/reset`)}>Reset Password?</span>
                        </div> */}
                        <div className="options-row login-link">
                            <span onClick={() => navigate(`/saas/${clientId}/forgot`)}>Forgot Password?</span>
                        </div>
                       
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Logging in..." : "LOGIN"}
                    </button>
                </form>
            </div>
        </div>
    );
}
