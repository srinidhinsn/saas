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
        otp: "",
        new_password: "",
        confirm_password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false); // Track if OTP has been sent

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Step 1: Send OTP
    const handleSendOtp = async () => {
        setError("");
        if (!form.username) {
            toast.error("Enter username first");
            return;
        }

        setLoading(true);
        try {
            await userServicesPort.post(`/${clientId}/users/forgot-password`, {
                username: form.username
            });
            toast.success("OTP sent to your registered email");
            setOtpSent(true);
        } catch (err) {
            console.error("Send OTP failed:", err);
            const detail = err?.response?.data?.detail || "Failed to send OTP";
            setError(detail);
            toast.error(detail);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Reset Password using OTP
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");

        if (form.new_password !== form.confirm_password) {
            setError("Passwords do not match");
            toast.error("Passwords do not match");
            return;
        }

        if (!form.otp) {
            setError("Enter OTP");
            toast.error("Enter OTP");
            return;
        }

        setLoading(true);
        try {
            await userServicesPort.post(`/${clientId}/users/reset-password`, {
                username: form.username,
                otp: form.otp,
                new_password: form.new_password,
                confirm_password: form.confirm_password
            });
            toast.success("Password reset successfully. Please login.");
            navigate(`/saas/${clientId}/login`);
        } catch (err) {
            console.error("Reset password failed:", err);
            const detail = err?.response?.data?.detail || "Failed to reset password";
            setError(detail);
            toast.error(detail);
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

                {!otpSent ? (
                    // Step 1: Send OTP form
                    <div>
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

                        {error && <p className="error-text">{error}</p>}

                        <button
                            className="login-button"
                            onClick={handleSendOtp}
                            disabled={loading}
                        >
                            {loading ? "Sending OTP..." : "SEND OTP"}
                        </button>
                    </div>
                ) : (
                    // Step 2: Reset Password form
                    <form onSubmit={handleResetPassword}>
                        <div className="input-group">
                            <FaUser className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                placeholder="Username"
                                value={form.username}
                                onChange={handleChange}
                                disabled
                            />
                        </div>

                        <div className="input-group">
                            <FaLock className="input-icon" />
                            <input
                                type="text"
                                name="otp"
                                placeholder="Enter OTP"
                                value={form.otp}
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
                    </form>
                )}

                <p className="login-link">
                    Remembered your password?{" "}
                    <span onClick={() => navigate(`/saas/${clientId}/login`)}>Login here</span>
                </p>
            </div>
        </div>
    );
}
