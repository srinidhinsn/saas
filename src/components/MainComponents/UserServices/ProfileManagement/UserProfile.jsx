import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, Mail, Phone, Calendar, Lock, Key, Send, MapPin } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from 'axios';

export default function UserProfile({clientId, token}) {
  const navigate = useNavigate();

  // Active tab state
  const [activeTab, setActiveTab] = useState("profile");

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
  const [fetchingProfile, setFetchingProfile] = useState(true);

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
      if (!clientId || !token) {
        setFetchingProfile(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`;
      console.log("Fetching profile from:", apiUrl);
      console.log("Token available:", !!token);

      try {
        const res = await axios.get(apiUrl, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        console.log("Profile response:", res.data);
        
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
      } catch (error) {
        console.error("Profile fetch error:", error);
        console.error("Error response:", error?.response);
        
        if (error?.response?.status === 403) {
          toast.error("Access denied. Please check your permissions or re-login.");
        } else if (error?.response?.status === 401) {
          toast.error("Session expired. Please login again.");
        } else {
          toast.error(error?.response?.data?.detail || "Failed to fetch profile details");
        }
      } finally {
        setFetchingProfile(false);
      }
    };

    fetchProfile();
  }, [clientId, token]);

  // Profile handlers
  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async () => {
    if (!clientId || !token) {
      toast.error("Missing client ID or authentication token");
      return;
    }

    setProfileLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
        profileForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.data?.message || "Profile saved successfully!");
      setProfileSaved(true);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to save profile");
      console.error("Profile save error:", error);
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

    if (!clientId || !token) {
      toast.error("Missing client ID or authentication token");
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
    } catch (error) {
      const detail = error?.response?.data?.detail || "Failed to send OTP";
      toast.error(detail);
      console.error("OTP send error:", error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
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

    if (!clientId || !token) {
      toast.error("Missing client ID or authentication token");
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
    } catch (error) {
      const detail = error?.response?.data?.detail || "Failed to reset password";
      toast.error(detail);
      console.error("Password reset error:", error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  if (fetchingProfile) {
    return (
      <div className="bg-gray-50 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-gray-50 flex items-center justify-center py-20">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please login to access your profile.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - User Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-bg-primary rounded-xl shadow-card border-default border-border-default overflow-hidden">
              <div className="bg-gradient-to-br from-action-primary to-action-danger h-24"></div>
              <div className="px-6 pb-6">
                <div className="flex flex-col items-center -mt-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-action-primary to-action-danger rounded-full flex items-center justify-center text-text-white text-3xl font-bold border-4 border-border-default shadow-lg">
                    {getInitials(profileForm.first_name, profileForm.last_name)}
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mt-4 text-center">
                    {`${profileForm.first_name} ${profileForm.last_name}`.trim() || "Your Name"}
                  </h2>
                  <p className="text-text-secondary text-sm mt-1">{profileForm.email || "your@email.com"}</p>
                  <div className="mt-3 px-3 py-1 bg-green-100 text-action-success text-xs font-semibold rounded-full">
                    Admin
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t-default border-border-default space-y-4">
                  <div className="flex items-center text-sm text-text-secondary">
                    <div className="w-8 h-8 bg-bg-primary rounded-lg flex items-center justify-center mr-3">
                      <Phone className="w-4 h-4 text-text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Phone</p>
                      <p className="text-sm font-medium text-text-primary">{profileForm.phone || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-text-secondary">
                    <div className="w-8 h-8 bg-bg-tertiary rounded-lg flex items-center justify-center mr-3">
                      <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Date of Birth</p>
                      <p className="text-sm font-medium text-text-primary">{profileForm.dob || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-text-secondary">
                    <div className="w-8 h-8 bg-bg-tertiary rounded-lg flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Client ID</p>
                      <p className="text-sm font-medium text-text-primary">{clientId || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-bg-primary rounded-xl shadow-sm border border-border-default">
              {/* Tabs */}
              <div className="border-b border-border-default">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-all relative ${
                      activeTab === "profile"
                        ? "text-action-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <User className="w-4 h-4 mr-2" />
                      Profile Information
                    </div>
                    {activeTab === "profile" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 text-action-primary"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("password")}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-all relative ${
                      activeTab === "password"
                        ? "text-action-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </div>
                    {activeTab === "password" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 text-action-primary"></div>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "profile" ? (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">Personal Information</h3>
                      <p className="text-sm text-text-secondary">Update your personal details here.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          First Name
                        </label>
                        <input
                          name="first_name"
                          type="text"
                          value={profileForm.first_name}
                          onChange={handleProfileChange}
                          placeholder="Enter your first name"
                          className="w-full px-3 py-2 border-default border-border-default rounded-lg  outline-none transition text-text-primary text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          Last Name
                        </label>
                        <input
                          name="last_name"
                          type="text"
                          value={profileForm.last_name}
                          onChange={handleProfileChange}
                          placeholder="Enter your last name"
                          className="w-full px-3 py-2 border-default border-border-default rounded-lgoutline-none transition text-text-primary text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          Email Address
                        </label>
                        <input
                          name="email"
                          type="email"
                          value={profileForm.email}
                          onChange={handleProfileChange}
                          placeholder="Enter your email"
                          className="w-full px-3 py-2 border-default border-border-default rounded-lg  outline-none transition text-text-primary text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          Phone Number
                        </label>
                        <input
                          name="phone"
                          type="tel"
                          value={profileForm.phone}
                          onChange={handleProfileChange}
                          placeholder="Enter your phone number"
                          className="w-full px-3 py-2 border-default border-border-default rounded-lg outline-none transition text-text-primary text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          Date of Birth
                        </label>
                        <input
                          name="dob"
                          type="date"
                          value={profileForm.dob}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 border-default border-border-default rounded-lg outline-none transition text-text-primary text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t-default border-border-default">
                      <button
                        onClick={handleProfileSubmit}
                        disabled={profileLoading}
                        className="px-6 py-2 bg-action-primary text-text-white font-medium rounded-lg hover:bg-action-danger focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm text-sm"
                      >
                        {profileLoading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">Security Settings</h3>
                      <p className="text-sm text-text-secondary">Update your password to keep your account secure.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          Reset Method
                        </label>
                        <select
                          value={resetMethod}
                          onChange={handleMethodChange}
                          className="w-full px-3 py-2 border-default border-border-default rounded-lg outline-none transition text-text-primary text-sm"
                        >
                          <option value="otp">OTP Verification</option>
                          <option value="old_password">Old Password</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          Username
                        </label>
                        <input
                          name="username"
                          type="text"
                          value={passwordForm.username}
                          onChange={handlePasswordChange}
                          placeholder="Enter your username"
                          className="w-full px-3 py-2 border-default border-border-default rounded-lg outline-none transition text-text-primary text-sm"
                        />
                      </div>

                      {resetMethod === "otp" && (
                        <>
                          {!otpSent ? (
                            <div className="md:col-span-2">
                              <button
                                onClick={handleSendOtp}
                                disabled={passwordLoading}
                                className="w-full px-4 py-2 bg-action-primary text-text-white font-medium rounded-lg hover:bg-action-danger disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center shadow-sm text-sm"
                              >
                                <Send className="w-4 h-4 mr-2" />
                                {passwordLoading ? "Sending..." : "Send OTP"}
                              </button>
                            </div>
                          ) : (
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                Enter OTP
                              </label>
                              <input
                                name="otp"
                                type="text"
                                value={passwordForm.otp}
                                onChange={handlePasswordChange}
                                placeholder="Enter 6-digit OTP"
                                className="w-full px-3 py-2 border-default border-border-default rounded-lg  outline-none transition text-text-primary text-sm"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {resetMethod === "old_password" && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Old Password
                          </label>
                          <input
                            name="old_password"
                            type="password"
                            value={passwordForm.old_password}
                            onChange={handlePasswordChange}
                            placeholder="Enter your old password"
                            className="w-full px-3 py-2 border-default border-border-default rounded-lg  outline-none transition text-text-primary text-sm"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          New Password
                        </label>
                        <input
                          name="new_password"
                          type="password"
                          value={passwordForm.new_password}
                          onChange={handlePasswordChange}
                          placeholder="Enter new password"
                          className="w-full px-3 py-2 border-default border-border-default rounded-lg outline-none transition text-text-primary text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          Confirm New Password
                        </label>
                        <input
                          name="confirm_password"
                          type="password"
                          value={passwordForm.confirm_password}
                          onChange={handlePasswordChange}
                          placeholder="Confirm new password"
                          className="w-full px-3 py-2 border-default border-border-default rounded-lg outline-none transition text-text-primary text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t-default border-border-default">
                      <button
                        onClick={handleResetPassword}
                        disabled={passwordLoading}
                        className="px-6 py-2 bg-action-primary text-text-white font-medium rounded-lg hover:bg-action-danger focus:outline-nonedisabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm text-sm"
                      >
                        {passwordLoading ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}