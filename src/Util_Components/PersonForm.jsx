
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaUserEdit, FaKey } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CircularText from '../Util_Components/CircularText';
import axios from 'axios';

export default function PersonForm() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  // Active tab state
  const [activeTab, setActiveTab] = useState("profile"); // "profile" or "password"

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    dob: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password reset form state
  const [passwordForm, setPasswordForm] = useState({
    username: "",
    otp: "",
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetMethod, setResetMethod] = useState("otp");

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.data?.person) {
          const p = res.data.data.person;
          setProfileForm({
            first_name: p.first_name || "",
            last_name: p.last_name || "",
            email: p.email || "",
            phone: p.phone || "",
            dob: p.dob || "",
          });
        }
      } catch {
        toast.error("Failed to fetch profile details");
      }
    };
    if (clientId && token) fetchProfile();
  }, [clientId, token]);

  // Profile handlers
  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
        profileForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.data?.message || "Profile saved successfully!");
      setProfileSaved(true);
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // Password handlers
  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleMethodChange = (e) => {
    setResetMethod(e.target.value);
    setPasswordForm((prev) => ({ ...prev, otp: "", old_password: "" }));
    if (e.target.value === "old_password") setOtpSent(true);
    else setOtpSent(false);
  };

  const handleSendOtp = async () => {
    if (!passwordForm.username) {
      toast.error("Enter username first");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
        {
          username: passwordForm.username,
          otp: "",
          old_password: "",
          new_password: "",
          confirm_password: "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || "OTP sent successfully");
      setOtpSent(true);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Failed to send OTP";
      toast.error(detail);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error("Enter new password and confirm password");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (resetMethod === "otp" && !passwordForm.otp) {
      toast.error("Enter OTP");
      return;
    }

    if (resetMethod === "old_password" && !passwordForm.old_password) {
      toast.error("Enter old password");
      return;
    }

    setPasswordLoading(true);

    try {
      const payload = {
        username: passwordForm.username,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
        otp: resetMethod === "otp" ? passwordForm.otp : "",
        old_password: resetMethod === "old_password" ? passwordForm.old_password : "",
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data.message || "Password reset successfully");
      setPasswordForm({
        username: "",
        otp: "",
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
      setOtpSent(false);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Failed to reset password";
      toast.error(detail);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
   <div className="Person-Details-Updation">
     <div className="person-form-container">
      <div className="person-form-card">
        {/* Header with Avatar */}
        <div className="person-form-header">
          <div className="avatar-wrapper">
            <div className="avatar-circle">
              <FaUser className="avatar-icon" />
              <CircularText
                text={`${clientId.split('').join('★')} ♡ `}
                spinDuration={20}
                className="circular-clientId"
              />
            </div>
          </div>
          <div className="user-info">
            <h2 className="user-name">
              {`${profileForm.first_name || ""} ${profileForm.last_name || ""}`.trim() || "Your Name"}
            </h2>
            <p className="user-email">{profileForm.email || "your@email.com"}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <FaUserEdit /> Profile
          </button>
          <button
            className={`tab-button ${activeTab === "password" ? "active" : ""}`}
            onClick={() => setActiveTab("password")}
          >
            <FaKey /> Password
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "profile" ? (
            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      name="first_name"
                      type="text"
                      value={profileForm.first_name}
                      onChange={handleProfileChange}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nick Name</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      name="last_name"
                      type="text"
                      value={profileForm.last_name}
                      onChange={handleProfileChange}
                      placeholder="Enter your nick name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      name="email"
                      type="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      name="phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Date of Birth</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      name="dob"
                      type="date"
                      value={profileForm.dob}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="submit-button" disabled={profileLoading}>
                {profileLoading ? "Saving..." : profileSaved ? "Update Profile" : "Save Profile"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="password-form">
              <div className="form-group">
                <label className="form-label">Reset Method</label>
                <select
                  className="form-select"
                  value={resetMethod}
                  onChange={handleMethodChange}
                >
                  <option value="otp">OTP</option>
                  <option value="old_password">Old Password</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrapper">
                  <input
                    className="form-input"
                    name="username"
                    type="text"
                    value={passwordForm.username}
                    onChange={handlePasswordChange}
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              {resetMethod === "otp" && (
                <>
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="otp-button"
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? "Sending OTP..." : "Send OTP"}
                    </button>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">OTP</label>
                      <div className="input-wrapper">
                        <input
                          className="form-input"
                          name="otp"
                          type="text"
                          value={passwordForm.otp}
                          onChange={handlePasswordChange}
                          placeholder="Enter OTP"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {resetMethod === "old_password" && (
                <div className="form-group">
                  <label className="form-label">Old Password</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      name="old_password"
                      type="password"
                      value={passwordForm.old_password}
                      onChange={handlePasswordChange}
                      placeholder="Enter old password"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-wrapper">
                  <input
                    className="form-input"
                    name="new_password"
                    type="password"
                    value={passwordForm.new_password}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    className="form-input"
                    name="confirm_password"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="submit-button" disabled={passwordLoading}>
                {passwordLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
   </div>
  );
}