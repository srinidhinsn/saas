import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaUser, FaLock, FaKey } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import userServicesPort from "../../Backend_Port_Files/UserServices";
import CircularText from '../../Util_Components/CircularText'; 
export default function ForgotPassword() {
    const navigate = useNavigate();
    const { clientId } = useParams();

    const [form, setForm] = useState({
        username: "",
        otp: "",
        new_password: "",
        confirm_password: ""
    });

    const [step, setStep] = useState(1); // 1 = request OTP, 2 = verify OTP & reset
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Step 1: Request OTP
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await userServicesPort.post(`/${clientId}/users/forgot-password`, {
                username: form.username
            });

            toast.success("OTP sent to your registered email");
            setStep(2);
        } catch (err) {
            console.error("OTP request failed:", err);
            let msg = err?.response?.data?.detail || "Failed to send OTP";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Reset Password with OTP
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
                otp: form.otp,
                new_password: form.new_password,
                confirm_password: form.confirm_password,
            });

            toast.success("Password reset successfully");
            navigate(`/saas/${clientId}/login`);
        } catch (err) {
            console.error("Reset password failed:", err);
            let msg = err?.response?.data?.detail || "Failed to reset password";
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
                    <CircularText
  text={`${clientId.split('').join('★')} ♡ `}
  spinDuration={20}
  className="circular-clientId"
/>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleRequestOtp}>
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

                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? "Sending OTP..." : "SEND OTP"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div className="input-group">
                            <FaKey className="input-icon" />
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

                <p className="options-row login-link">
                    Remembered your password?{" "}
                    <span onClick={() => navigate(`/saas/${clientId}/login`)}>Login here</span>
                </p>
            </div>
        </div>
    );
}
