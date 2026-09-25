
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, Calendar, Lock, Send,
  MapPin, Shield, Eye, EyeOff, CheckCircle,
  Home, Key, Fingerprint, Building2, Hash
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const inp =
  "w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-black outline-none transition-colors focus:border-red-500 placeholder:text-gray-300";

function Label({ icon, children }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {icon}{children}
    </label>
  );
}

function PwField({ value, onChange, placeholder, show, onToggle }) {
  return (
    <div className="relative">
      <input className={inp} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function Spin() {
  return <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />;
}

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 text-gray-600">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-black">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function UserProfile({ clientId, token, realm, screenIds }) {
  const navigate = useNavigate();

  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "", dob: "" });
  const [addressForm, setAddressForm] = useState({ address_line1: "", address_line2: "", name: "", city: "", state: "", country: "", pincode: "", contact_name: "", contact_number: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ username: "", otp: "", old_password: "", new_password: "", confirm_password: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetMethod, setResetMethod] = useState("otp");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [savedSections, setSavedSections] = useState({ personal: false, address: false, security: false });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    try {
      const decoded = jwtDecode(token);
      setUserRole(decoded?.roles || decoded?.role || "");
    } catch {
      console.warn("JWT decode failed");
    }
  }, [token]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!clientId || !token) { setFetchingProfile(false); return; }
      try {
        const pRes = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const p = pRes.data?.data?.person;
        if (p) setProfileForm({ first_name: p.first_name || "", last_name: p.last_name || "", email: p.email || "", phone: p.phone || "", dob: p.dob || "" });

        const aRes = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const addresses = aRes.data?.data?.addresses || [];

        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          setAddressForm(addresses[0]);
        } } catch (err) {
        const s = err?.response?.status;
        if (s === 403) toast.error("Access denied. Please re-login.");
        else if (s === 401) toast.error("Session expired.");
        else toast.error("Failed to fetch profile");
      } finally { setFetchingProfile(false); }
    };
    fetchProfile();
  }, [clientId, token]);

  const handleProfileSave = async () => {
    if (!clientId || !token) { toast.error("Missing authentication"); return; }
    setProfileLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
        profileForm, { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedSections(s => ({ ...s, personal: true }));
    } catch (e) { console.log(e?.response?.data?.detail || "Failed to save"); }
    finally { setProfileLoading(false); }
  };

  const fetchAddresses = async () => {
    const aRes = await axios.get(
      `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const addresses = aRes.data?.data?.addresses || [];
    setSavedAddresses(addresses);
    if (addresses.length > 0 && !addressForm.id) {
      setAddressForm(addresses[addresses.length - 1]);
    }
  };

  const handleAddressSave = async () => {
    if (!clientId || !token) { toast.error("Missing authentication"); return; }
    setAddressLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (addressForm.id) {
        await axios.put(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address/${addressForm.id}`, addressForm, { headers });
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address`, addressForm, { headers });
        if (res.data?.data?.address_id) setAddressForm(prev => ({ ...prev, id: res.data.data.address_id }));
      }
      setSavedSections(s => ({ ...s, address: true })); await fetchAddresses();
    } catch (e) { console.log(e?.response?.data?.detail || "Failed to save"); }
    finally { setAddressLoading(false); }
  };

  const handleSendOtp = async () => {
    if (!passwordForm.username) { toast.error("Enter username first"); return; }
    if (!clientId || !token) { toast.error("Missing authentication"); return; }
    setPasswordLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
        { username: passwordForm.username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(res.data.message || "OTP sent!")
      setOtpSent(true);
    } catch (e) { console.log(e?.response?.data?.detail || "Failed to send OTP"); }
    finally { setPasswordLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!passwordForm.new_password || !passwordForm.confirm_password) { toast.error("Fill all password fields"); return; }
    if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error("Passwords don't match"); return; }
    if (resetMethod === "otp" && !passwordForm.otp) { toast.error("Enter OTP"); return; }
    if (resetMethod === "old_password" && !passwordForm.old_password) { toast.error("Enter old password"); return; }
    if (!clientId || !token) { toast.error("Missing authentication"); return; }
    setPasswordLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
        { username: passwordForm.username, new_password: passwordForm.new_password, confirm_password: passwordForm.confirm_password, otp: resetMethod === "otp" ? passwordForm.otp : "", old_password: resetMethod === "old_password" ? passwordForm.old_password : "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || "Password reset!");
      setPasswordForm({ username: "", otp: "", old_password: "", new_password: "", confirm_password: "" });
      setOtpSent(false);
      setSavedSections(s => ({ ...s, security: true }));
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to reset"); }
    finally { setPasswordLoading(false); }
  };

  const handleSetPrimary = async (addressId) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address/${addressId}/set-primary`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedAddresses(prev => {
        const reordered = [...prev];
        const idx = reordered.findIndex(a => a.id === addressId);
        const [selected] = reordered.splice(idx, 1);
        reordered.unshift(selected);
        return reordered;
      });
      toast.success("Primary address updated!");
    } catch (e) {
      toast.error("Failed to set primary address");
    }
  };

  const initials = `${profileForm.first_name?.charAt(0) || ""}${profileForm.last_name?.charAt(0) || ""}`.toUpperCase();
  const fullName = `${profileForm.first_name} ${profileForm.last_name}`.trim();
  const pwMatch = passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password === passwordForm.confirm_password;
  const pwMismatch = passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password;

  if (fetchingProfile) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-9 h-9 mx-auto rounded-full border-2 border-gray-200 border-t-red-500 animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading profile…</p>
      </div>
    </div>
  );

  if (!token) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-5">
          <Lock size={22} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-black mb-2">Authentication required</h2>
        <p className="text-sm text-gray-400 mb-6">Please login to access your profile.</p>
        <button onClick={() => navigate('/login')} className="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors">
          Go to login
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-[calc(100vh-64px)] p-4 sm:p-5 lg:p-6 xl:p-8">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">

        {/* ══ LEFT SIDEBAR ══ */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6">

          {/* Profile identity card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white font-bold text-lg mb-3">
              {initials || <User size={20} />}
            </div>
            <p className="text-[15px] font-bold text-black leading-tight">{fullName || "Your name"}</p>
            <p className="text-xs text-gray-400 mt-0.5 break-all">{profileForm.email || "your@email.com"}</p>
            {userRole && (
              <span className="inline-flex items-center gap-1.5 mt-2.5 text-[10px] font-bold uppercase tracking-wide bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5">
                {userRole}
              </span>
            )}
          </div>

          {/* Meta chips */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {[
              { icon: <Phone size={13} />, label: "Phone", val: profileForm.phone || "—" },
              { icon: <Calendar size={13} />, label: "Date of birth", val: profileForm.dob || "—" },
              { icon: <Hash size={13} />, label: "Client ID", val: clientId || "—", mono: true },
            ].map(({ icon, label, val, mono }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center shrink-0 text-gray-500">{icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className={`text-[13px] font-semibold text-black truncate ${mono ? "font-mono" : ""}`}>{val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Save status tracker */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Unsaved changes</p>
            <div className="space-y-2">
              {[
                { key: "personal", label: "Personal info", icon: <User size={12} /> },
                { key: "address", label: "Address", icon: <Home size={12} /> },
                { key: "security", label: "Security", icon: <Shield size={12} /> },
              ].map(({ key, label, icon }) => {
                const done = savedSections[key];
                return (
                  <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${done ? "bg-gray-50 border-gray-200" : "border-gray-200"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-black text-white" : "text-gray-400"}`}>
                      {done ? <CheckCircle size={11} /> : icon}
                    </div>
                    <span className={`text-[12px] font-semibold flex-1 ${done ? "text-black" : "text-gray-400"}`}>{label}</span>
                    {done
                      ? <span className="text-[10px] text-gray-500 font-bold">Saved</span>
                      : <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ RIGHT — All sections stacked ══ */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* ── Personal ── */}
          <SectionCard title="Personal information" subtitle="Your identity and contact details" icon={<User size={15} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label icon={<User size={11} />}>First name</Label>
                <input className={inp} value={profileForm.first_name}
                  onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} placeholder="John" />
              </div>
              <div>
                <Label icon={<User size={11} />}>Last name</Label>
                <input className={inp} value={profileForm.last_name}
                  onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} placeholder="Doe" />
              </div>
              <div>
                <Label icon={<Mail size={11} />}>Email address</Label>
                <input className={inp} type="email" value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="john@example.com" />
              </div>
              <div>
                <Label icon={<Phone size={11} />}>Phone number</Label>
                <input className={inp} type="tel" value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div className="sm:col-span-2">
                <Label icon={<Calendar size={11} />}>Date of birth</Label>
                <input className={inp} type="date" value={profileForm.dob}
                  onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end mt-5 pt-4 border-t border-gray-200">
              <button onClick={handleProfileSave} disabled={profileLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {profileLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save personal info</span></>}
              </button>
            </div>
          </SectionCard>

          {/* ── Address ── */}
          <SectionCard title="Address information" subtitle="Shipping and billing address" icon={<MapPin size={15} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <div className="flex flex-wrap gap-2 mb-5">
                  {savedAddresses.map((addr, index) => (
                    <div key={addr.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAddressForm(addr)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors
                          ${addressForm.id === addr.id
                            ? "bg-black text-white border-black"
                            : "bg-white border-gray-200 hover:border-gray-400"
                          }`}
                      >
                        {index === 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1
                            ${addressForm.id === addr.id ? "bg-white/20 text-white border border-white/30" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                            Primary
                          </span>)}
                        {addr.name}
                      </button>

                      {addressForm.id === addr.id && index !== 0 && (
                        <button type="button" onClick={() => handleSetPrimary(addr.id)}
                          className="px-3 py-2 rounded-lg text-xs border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                          Set as primary
                        </button>)}
                    </div>))}

                  <button
                    type="button"
                    onClick={() =>
                      setAddressForm({
                        id: undefined,
                        address_line1: "",
                        address_line2: "",
                        name: "",
                        city: "",
                        state: "",
                        country: "",
                        pincode: "",
                        contact_name: "",
                        contact_number: ""
                      })
                    }
                    className="px-4 py-2 rounded-lg border border-dashed border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                  >
                    + Add address
                  </button>
                </div>
                <Label icon={<Home size={11} />}>Address line 1</Label>
                <input className={inp} value={addressForm.address_line1}
                  onChange={e => setAddressForm({ ...addressForm, address_line1: e.target.value })} placeholder="Street address" />
              </div>
              <div className="sm:col-span-2">
                <Label icon={<Home size={11} />}>Address line 2</Label>
                <input className={inp} value={addressForm.address_line2}
                  onChange={e => setAddressForm({ ...addressForm, address_line2: e.target.value })} placeholder="Apt, suite, floor (optional)" />
              </div>
              <div className="sm:col-span-2">
                <Label icon={<Building2 size={11} />}>Address name</Label>
                <input className={inp} value={addressForm.name}
                  onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} placeholder="Home / Work / Office" />
              </div>
              <div>
                <Label icon={<MapPin size={11} />}>City</Label>
                <input className={inp} value={addressForm.city}
                  onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="Mumbai" />
              </div>
              <div>
                <Label icon={<MapPin size={11} />}>State</Label>
                <input className={inp} value={addressForm.state}
                  onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="Maharashtra" />
              </div>
              <div>
                <Label icon={<MapPin size={11} />}>Country</Label>
                <input className={inp} value={addressForm.country}
                  onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} placeholder="India" />
              </div>
              <div>
                <Label icon={<Key size={11} />}>Pincode</Label>
                <input className={inp} value={addressForm.pincode}
                  onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} placeholder="400001" />
              </div>
              <div>
                <Label icon={<User size={11} />}>Contact person</Label>
                <input className={inp} value={addressForm.contact_name}
                  onChange={e => setAddressForm({ ...addressForm, contact_name: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <Label icon={<Phone size={11} />}>Contact number</Label>
                <input className={inp} value={addressForm.contact_number}
                  onChange={e => setAddressForm({ ...addressForm, contact_number: e.target.value })} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="flex justify-end mt-5 pt-4 border-t border-gray-200">
              <button onClick={handleAddressSave} disabled={addressLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {addressLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save address</span></>}
              </button>
            </div>
          </SectionCard>

          {/* ── Security ── */}
          <SectionCard title="Security settings" subtitle="Reset your account password" icon={<Fingerprint size={15} />}>
            <div className="inline-flex bg-gray-50 border border-gray-200 rounded-lg p-1 mb-5 gap-1">
              {[["otp", "OTP verification"], ["old_password", "Old password"]].map(([m, lbl]) => (
                <button key={m}
                  onClick={() => { setResetMethod(m); setPasswordForm(p => ({ ...p, otp: "", old_password: "" })); setOtpSent(false); }}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors
                    ${resetMethod === m ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}>
                  {lbl}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label icon={<User size={11} />}>Username</Label>
                <input className={inp} value={passwordForm.username}
                  onChange={e => setPasswordForm({ ...passwordForm, username: e.target.value })} placeholder="Your username" disabled={otpSent} />
              </div>

              {resetMethod === "otp" && !otpSent && (
                <div className="sm:col-span-2">
                  <button onClick={handleSendOtp} disabled={passwordLoading}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                    {passwordLoading ? <Spin /> : <><Send size={13} /><span>Send OTP to email</span></>}
                  </button>
                </div>
              )}

              {resetMethod === "otp" && otpSent && (
                <div className="sm:col-span-2">
                  <Label icon={<Key size={11} />}>Enter OTP</Label>
                  <div className="flex gap-2">
                    <input className={`${inp} flex-1 text-center tracking-[0.4em] text-base font-bold`}
                      value={passwordForm.otp} maxLength={6}
                      onChange={e => setPasswordForm({ ...passwordForm, otp: e.target.value })}
                      placeholder="------" />
                    <button onClick={handleSendOtp}
                      className="shrink-0 px-4 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">
                      Resend
                    </button>
                  </div>
                </div>
              )}

              {resetMethod === "old_password" && (
                <div className="sm:col-span-2">
                  <Label icon={<Lock size={11} />}>Old password</Label>
                  <PwField value={passwordForm.old_password} show={showOld} onToggle={() => setShowOld(v => !v)}
                    onChange={e => setPasswordForm({ ...passwordForm, old_password: e.target.value })} placeholder="Current password" />
                </div>
              )}

              <div>
                <Label icon={<Lock size={11} />}>New password</Label>
                <PwField value={passwordForm.new_password} show={showNew} onToggle={() => setShowNew(v => !v)}
                  onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} placeholder="New password" />
              </div>

              <div>
                <Label icon={<Lock size={11} />}>Confirm password</Label>
                <div>
                  <PwField value={passwordForm.confirm_password} show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} placeholder="Confirm password" />
                  {pwMatch && <p className="text-[11px] text-black font-semibold mt-1.5 flex items-center gap-1"><CheckCircle size={11} /> Passwords match</p>}
                  {pwMismatch && <p className="text-[11px] text-red-600 font-semibold mt-1.5">Passwords don't match</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-gray-200">
              <button onClick={handleResetPassword} disabled={passwordLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {passwordLoading ? <Spin /> : <><Shield size={14} /><span>Reset password</span></>}
              </button>
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
}