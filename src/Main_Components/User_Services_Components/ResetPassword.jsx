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
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSendOtp = async () => {
        if (!form.username) {
            toast.error("Enter username first");
            return;
        }
        setLoading(true);
        try {
            const res = await userServicesPort.post(`/${clientId}/users/reset-password`, {
                username: form.username,
                otp: "", // empty triggers OTP send
                new_password: "",
                confirm_password: ""
            });
            toast.success(res.data.message);
            setOtpSent(true);
        } catch (err) {
            const detail = err?.response?.data?.detail || "Failed to send OTP";
            toast.error(detail);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (form.new_password !== form.confirm_password) {
            toast.error("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const res = await userServicesPort.post(`/${clientId}/users/reset-password`, form);
            toast.success(res.data.message);
            navigate(`/saas/${clientId}/login`);
        } catch (err) {
            const detail = err?.response?.data?.detail || "Failed to reset password";
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
                    <div>
                        <div className="input-group">
                            <FaUser className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                placeholder="Username"
                                value={form.username}
                                onChange={handleChange}
                            />
                        </div>
                        <button onClick={handleSendOtp} disabled={loading}>
                            {loading ? "Sending OTP..." : "SEND OTP"}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div className="input-group">
                            <FaUser className="input-icon" />
                            <input type="text" value={form.username} disabled />
                        </div>
                        <div className="input-group">
                            <FaLock className="input-icon" />
                            <input
                                type="text"
                                name="otp"
                                placeholder="Enter OTP"
                                value={form.otp}
                                onChange={handleChange}
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
                            />
                        </div>
                        <button type="submit" disabled={loading}>
                            {loading ? "Resetting..." : "RESET PASSWORD"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
