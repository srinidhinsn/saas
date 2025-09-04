import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaLock, FaUser } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import userServicesPort from "../../Backend_Port_Files/UserServices";

export default function ResetPassword() {
    const navigate = useNavigate();
    const { clientId } = useParams();
    const [form, setForm] = useState({
        username: "",
        old_password: "",
        new_password: "",
        confirm_password: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");

        if (form.new_password !== form.confirm_password) {
            setError("Passwords do not match");
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            await userServicesPort.post(`/${clientId}/users/reset-password`, {
                username: form.username,
                old_password: form.old_password,
                new_password: form.new_password,
            });

            toast.success("Password changed successfully. Please login again.");
            navigate(`/saas/${clientId}/login`);
        } catch (err) {
            console.error("Reset password failed:", err);

            let msg = "An unexpected error occurred";
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;

            if (status === 400) {
                msg = detail || "Invalid old password";
            } else if (status === 401) {
                msg = "Unauthorized. Please login again.";
                navigate(`/saas/${clientId}/login`);
            } else if (status === 500) {
                msg = "Internal Server Error. Please try again later.";
            } else if (detail && typeof detail === "string") {
                msg = detail;
            }

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
                    <FaLock className="avatar-icon" />
                </div>

                <form onSubmit={handleResetPassword}>
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
                            name="old_password"
                            placeholder="Old Password"
                            value={form.old_password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="new_password"
                            placeholder="New Password"
                            value={form.new_password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="confirm_password"
                            placeholder="Confirm Password"
                            value={form.confirm_password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && <p className="error-text">{error}</p>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Resetting..." : "RESET PASSWORD"}
                    </button>

                    <p className="login-link">
                        Forgot your old password?{" "}
                        <span onClick={() => navigate(`/saas/${clientId}/forgot`)}>Click here</span>
                    </p>
                </form>
            </div>
        </div>
    );
}
