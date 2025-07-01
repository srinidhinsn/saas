import React, { useState } from "react";
import api from "../PortExportingPage/api";
import "../styles/ForgotPassword.css";

export default function ForgotPassword() {
    const [form, setForm] = useState({ Clientid: '', Username: '', Role: '', ContactMethod: 'email' });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPass, setNewPass] = useState('');
    const [showReset, setShowReset] = useState(false);

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < otp.length - 1) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleSendOtp = async () => {
        try {
            await sendForgotPasswordOtp({
                clientid: form.Clientid,
                username: form.Username,
                role: form.Role,
                method: form.ContactMethod
            });
            setShowReset(true);
            alert("OTP sent");
        } catch {
            alert("Failed to send OTP");
        }
    };

    const handleResetPassword = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length !== 6 || !newPass) {
            alert("Enter valid OTP and new password");
            return;
        }
        try {
            await resetPassword({
                clientid: form.Clientid,
                username: form.Username,
                role: form.Role,
                otp: fullOtp,
                new_password: newPass
            });
            alert("Password reset successful");
        } catch {
            alert("Password reset failed");
        }
    };

    return (
        <div className="Register-pages">
            <div className="container">
                <div className="form-container">
                    {!showReset ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
                            <h1>Forgot Password</h1>
                            <input type="text" placeholder="Client ID" value={form.Clientid}
                                onChange={e => setForm({ ...form, Clientid: e.target.value })} />
                            <input type="text" placeholder="Username" value={form.Username}
                                onChange={e => setForm({ ...form, Username: e.target.value })} />
                            <select value={form.Role} onChange={e => setForm({ ...form, Role: e.target.value })}>
                                <option value="">Select Role</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="staff">Staff</option>
                                <option value="waiter">Waiter</option>
                            </select>
                            <select value={form.ContactMethod} onChange={e => setForm({ ...form, ContactMethod: e.target.value })}>
                                <option value="email">Email</option>
                                <option value="sms">Mobile</option>
                            </select>
                            <button type="submit">Send OTP</button>
                        </form>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }}>
                            <h1>Reset Password</h1>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                {otp.map((val, idx) => (
                                    <input
                                        key={idx}
                                        id={`otp-${idx}`}
                                        type="text"
                                        maxLength="1"
                                        className="otp-box"
                                        value={val}
                                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    />
                                ))}
                            </div>
                            <input type="password" placeholder="New Password" value={newPass}
                                onChange={e => setNewPass(e.target.value)} />
                            <button type="submit">Reset Password</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
