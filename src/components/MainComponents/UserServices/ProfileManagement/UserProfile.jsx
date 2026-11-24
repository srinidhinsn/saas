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
  "w-full h-control px-item rounded-button-sm text-ui border border-brand-line bg-surface text-ink outline-none transition-colors focus:border-brand-ring focus:shadow-focus-ring placeholder:text-ink-faint disabled:opacity-50 disabled:cursor-not-allowed";

function Label({ icon, children }) {
  return (
    <label className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wide text-ink-muted mb-1">
      {icon}{children}
    </label>
  );
}

function PwField({ value, onChange, placeholder, show, onToggle }) {
  return (
    <div className="relative">
      <input className={inp} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-brand-dark transition-colors">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function Spin() {
  return <span className="inline-block w-4 h-4 rounded-badge border-2 border-white/30 border-t-white animate-spin-slow" />;
}

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <div className="ui-card !p-0 !mb-0">
      <div className="flex items-center gap-3 px-card py-item border-b border-line-divider">
        <div className="w-8 h-8 rounded-button-sm bg-brand-light border border-brand-line flex items-center justify-center shrink-0 text-brand-dark">
          {icon}
        </div>
        <div>
          <h3 className="text-panel-title text-brand-dark">{title}</h3>
          <p className="text-ui-sm text-ink-muted">{subtitle}</p>
        </div>
      </div>
      <div className="p-card">{children}</div>
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
      setSavedSections(s => ({ ...s, personal: true }));
      window.dispatchEvent(new Event('user-profile-updated'));
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
    <div className="min-h-screen bg-canvas font-sans flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-9 h-9 mx-auto rounded-badge border-2 border-brand-soft border-t-brand animate-spin-slow" />
        <p className="text-ui text-ink-muted font-semibold">Loading profile…</p>
      </div>
    </div>
  );

  if (!token) return (
    <div className="min-h-screen bg-canvas font-sans flex items-center justify-center px-4">
      <div className="ui-panel !mb-0 !p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-brand-light border border-brand-line rounded-panel flex items-center justify-center mx-auto mb-5">
          <Lock size={22} className="text-brand" />
        </div>
        <h2 className="text-page-title text-brand-dark mb-2">Authentication required</h2>
        <p className="text-ui text-ink-muted mb-6">Please login to access your profile.</p>
        <button onClick={() => navigate('/login')} className="ui-btn ui-btn-add w-full">
          Go to login
        </button>
      </div>
    </div>
  );

  return (
    <div className="ui-page">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">

        {/* ══ LEFT SIDEBAR ══ */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6">

          {/* Profile identity card */}
          <div className="ui-card p-4">
            <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-text-white font-bold text-lg mb-3">
              {initials || <User size={20} />}
            </div>
            <p className="text-body-sm font-bold text-brand-dark leading-tight">{fullName || "Your name"}</p>
            <p className="text-ui-sm text-ink-muted mt-0.5 break-all">{profileForm.email || "your@email.com"}</p>
            {userRole && (
              <span className="ui-pill mt-2.5 border border-brand-line uppercase tracking-wide">
                {userRole}
              </span>
            )}
          </div>

          {/* Meta chips */}
          <div className="ui-card divide-y divide-line-soft">
            {[
              { icon: <Phone size={13} />, label: "Phone", val: profileForm.phone || "—" },
              { icon: <Calendar size={13} />, label: "Date of birth", val: profileForm.dob || "—" },
              { icon: <Hash size={13} />, label: "Client ID", val: clientId || "—", mono: true },
            ].map(({ icon, label, val, mono }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-button-sm border border-brand-line bg-brand-light flex items-center justify-center shrink-0 text-brand-dark">{icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-micro font-bold uppercase tracking-wide text-ink-muted">{label}</p>
                  <p className={`text-ui font-semibold text-ink truncate ${mono ? "font-mono" : ""}`}>{val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Save status tracker */}
          <div className="ui-card p-4">
            <p className="text-micro font-bold uppercase tracking-wide text-ink-muted mb-3">Unsaved changes</p>
            <div className="space-y-2">
              {[
                { key: "personal", label: "Personal info", icon: <User size={12} /> },
                { key: "address", label: "Address", icon: <Home size={12} /> },
                { key: "security", label: "Security", icon: <Shield size={12} /> },
              ].map(({ key, label, icon }) => {
                const done = savedSections[key];
                return (
                  <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-button-sm border ${done ? "bg-brand-light border-brand-line" : "border-line"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-brand text-text-white" : "text-ink-faint"}`}>
                      {done ? <CheckCircle size={11} /> : icon}
                    </div>
                    <span className={`text-ui font-semibold flex-1 ${done ? "text-brand-dark" : "text-ink-muted"}`}>{label}</span>
                    {done
                      ? <span className="text-micro text-brand-dark font-bold">Saved</span>
                      : <span className="w-1.5 h-1.5 rounded-full bg-state-reserved" />
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
            <div className="flex justify-end mt-5 pt-4 border-t border-line">
              <button onClick={handleProfileSave} disabled={profileLoading}
                className="ui-btn ui-btn-add">
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
                        className={`ui-btn
                          ${addressForm.id === addr.id
                            ? "ui-btn-add"
                            : ""
                          }`}
                      >
                        {index === 0 && (
                          <span className={`text-micro font-bold px-1.5 py-0.5 rounded-badge mr-1
                            ${addressForm.id === addr.id ? "bg-white/20 text-white border border-white/30" : "bg-brand-light text-brand-dark border border-brand-line"}`}>
                            Primary
                          </span>)}
                        {addr.name}
                      </button>

                      {addressForm.id === addr.id && index !== 0 && (
                        <button type="button" onClick={() => handleSetPrimary(addr.id)}
                          className="ui-btn !h-7 !border-dashed">
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
                    className="ui-btn !border-dashed"
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
            <div className="flex justify-end mt-5 pt-4 border-t border-line">
              <button onClick={handleAddressSave} disabled={addressLoading}
                className="ui-btn ui-btn-add">
                {addressLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save address</span></>}
              </button>
            </div>
          </SectionCard>

          {/* ── Security ── */}
          <SectionCard title="Security settings" subtitle="Reset your account password" icon={<Fingerprint size={15} />}>
            <div className="ui-toggle mb-5">
              {[["otp", "OTP verification"], ["old_password", "Old password"]].map(([m, lbl]) => (
                <button key={m}
                  onClick={() => { setResetMethod(m); setPasswordForm(p => ({ ...p, otp: "", old_password: "" })); setOtpSent(false); }}
                  className={`ui-toggle-btn
                    ${resetMethod === m ? "ui-toggle-btn-active" : ""}`}>
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
                    className="ui-btn ui-btn-add">
                    {passwordLoading ? <Spin /> : <><Send size={13} /><span>Send OTP to email</span></>}
                  </button>
                </div>
              )}

              {resetMethod === "otp" && otpSent && (
                <div className="sm:col-span-2">
                  <Label icon={<Key size={11} />}>Enter OTP</Label>
                  <div className="flex gap-2">
                    <input className={`${inp} flex-1 text-center tracking-[0.4em] !text-body font-bold`}
                      value={passwordForm.otp} maxLength={6}
                      onChange={e => setPasswordForm({ ...passwordForm, otp: e.target.value })}
                      placeholder="------" />
                    <button onClick={handleSendOtp}
                      className="ui-btn shrink-0">
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
                  {pwMatch && <p className="text-ui-sm text-state-vacant font-semibold mt-1.5 flex items-center gap-1"><CheckCircle size={11} /> Passwords match</p>}
                  {pwMismatch && <p className="text-ui-sm text-state-occupied font-semibold mt-1.5">Passwords don't match</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-line">
              <button onClick={handleResetPassword} disabled={passwordLoading}
                className="ui-btn ui-btn-add">
                {passwordLoading ? <Spin /> : <><Shield size={14} /><span>Reset password</span></>}
              </button>
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
}