import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, Calendar, Lock, Send,
  MapPin, Shield, Eye, EyeOff, ChevronRight,
  ChevronLeft, CheckCircle, Home, Key
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const STEPS = [
  { id: 1, label: "Personal", icon: User, desc: "Identity & contact" },
  { id: 2, label: "Address", icon: Home, desc: "Location details" },
  { id: 3, label: "Security", icon: Shield, desc: "Password reset" },
];

/* ── Field wrapper ── */
function Field({ label, icon, children, full }) {
  return (
    <div className={full ? "col-span-2" : "col-span-1"}>
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1.5">
        <span className="text-action-primary">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Input base class ── */
const inp = "w-full px-3 py-2 rounded-xl text-sm border border-border-default bg-bg-primary text-text-primary outline-none transition-all duration-200 focus:border-action-primary focus:ring-2 focus:ring-action-primary/10 placeholder:text-gray-300 font-[inherit]";

/* ── Password field ── */
function PwField({ value, onChange, placeholder, show, onToggle }) {
  return (
    <div className="relative">
      <input className={inp} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-action-primary transition-colors">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

/* ── Spinner ── */
function Spin() {
  return <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />;
}

export default function UserProfile({ clientId, token }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [animKey, setAnimKey] = useState(0);
  const [dir, setDir] = useState("fwd");

  /* track which steps have been saved */
  const [saved, setSaved] = useState({ 1: false, 2: false, 3: false });

  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "", dob: "" });
  const [addressForm, setAddressForm] = useState({ address_line1: "", address_line2: "", city: "", state: "", country: "", pincode: "", contact_name: "", contact_number: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);

  const [passwordForm, setPasswordForm] = useState({ username: "", otp: "", old_password: "", new_password: "", confirm_password: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetMethod, setResetMethod] = useState("otp");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOld, setShowOld] = useState(false);

  /* ── Fetch on mount ── */
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
        const a = aRes.data?.data?.addresses?.[0];
        if (a) setAddressForm({ address_line1: a.address_line1 || "", address_line2: a.address_line2 || "", city: a.city || "", state: a.state || "", country: a.country || "", pincode: a.pincode || "", contact_name: a.contact_name || "", contact_number: a.contact_number || "" });
      } catch (err) {
        const s = err?.response?.status;
        if (s === 403) toast.error("Access denied. Please re-login.");
        else if (s === 401) toast.error("Session expired.");
        else toast.error("Failed to fetch profile");
      } finally { setFetchingProfile(false); }
    };
    fetchProfile();
  }, [clientId, token]);

  /* ── Free navigation — always allowed ── */
  const goTo = (n) => {
    if (n === step) return;
    setDir(n > step ? "fwd" : "bwd");
    setAnimKey(k => k + 1);
    setStep(n);
  };

  /* ── Save personal (no navigation) ── */
  const handleProfileSave = async () => {
    if (!clientId || !token) { toast.error("Missing authentication"); return; }
    setProfileLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
        profileForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Personal info saved!");
      setSaved(s => ({ ...s, 1: true }));
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to save"); }
    finally { setProfileLoading(false); }
  };

  const handleAddressSave = async () => {
    if (!clientId || !token) {
      toast.error("Missing authentication");
      return;
    }

    setProfileLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (addressForm.id) {
        // UPDATE
        await axios.put(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address/${addressForm.id}`,
          addressForm,
          { headers }
        );

        toast.success("Address updated!");
      } else {
        // CREATE
        const res = await axios.post(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address`,
          addressForm,
          { headers }
        );

        toast.success("Address saved!");

        // store returned id
        if (res.data?.data?.address_id) {
          setAddressForm(prev => ({
            ...prev,
            id: res.data.data.address_id
          }));
        }
      }

      setSaved(s => ({ ...s, 2: true }));

    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setProfileLoading(false);
    }
  };

  /* ── OTP ── */
  const handleSendOtp = async () => {
    if (!passwordForm.username) { toast.error("Enter username first"); return; }
    if (!clientId || !token) { toast.error("Missing authentication"); return; }
    setPasswordLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
        { username: passwordForm.username, otp: "", old_password: "", new_password: "", confirm_password: "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || "OTP sent!");
      setOtpSent(true);
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to send OTP"); }
    finally { setPasswordLoading(false); }
  };

  /* ── Reset password ── */
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
        {
          username: passwordForm.username,
          new_password: passwordForm.new_password,
          confirm_password: passwordForm.confirm_password,
          otp: resetMethod === "otp" ? passwordForm.otp : "",
          old_password: resetMethod === "old_password" ? passwordForm.old_password : "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || "Password reset!");
      setPasswordForm({ username: "", otp: "", old_password: "", new_password: "", confirm_password: "" });
      setOtpSent(false);
      setSaved(s => ({ ...s, 3: true }));
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to reset"); }
    finally { setPasswordLoading(false); }
  };

  const initials = `${profileForm.first_name?.charAt(0) || ""}${profileForm.last_name?.charAt(0) || ""}`.toUpperCase();
  const fullName = `${profileForm.first_name} ${profileForm.last_name}`.trim();
  const pwMatch = passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password === passwordForm.confirm_password;
  const pwMismatch = passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password;

  const slideClass = dir === "fwd"
    ? "animate-[slideInRight_0.3s_cubic-bezier(0.22,1,0.36,1)_both]"
    : "animate-[slideInLeft_0.3s_cubic-bezier(0.22,1,0.36,1)_both]";

  /* ── Loading ── */
  if (fetchingProfile) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-14 h-14 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-action-primary/10 border-t-action-primary animate-spin" />
        </div>
        <p className="text-sm text-text-secondary font-semibold tracking-wide">Loading your profile…</p>
      </div>
    </div>
  );

  /* ── Auth guard ── */
  if (!token) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="bg-bg-primary border border-border-default rounded-3xl p-10 max-w-sm w-full text-center shadow-xl">
        <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock size={24} className="text-action-primary" />
        </div>
        <h2 className="text-xl font-extrabold text-text-primary mb-2">Authentication Required</h2>
        <p className="text-sm text-text-secondary mb-6">Please login to access your profile.</p>
        <button onClick={() => navigate('/login')}
          className="w-full py-3 rounded-xl bg-action-primary text-text-white font-bold text-sm hover:bg-action-danger transition-colors">
          Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp       { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spinRing     { to { transform:rotate(360deg); } }
        .ring-spin { animation: spinRing 5s linear infinite; }
        .fade-up   { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="bg-bg-primary min-h-[calc(100vh-64px)] flex flex-col gap-4 p-5 lg:p-6 overflow-hidden">

        {/* ══ TOP ROW ══ */}
        <div className="fade-up flex flex-wrap items-center gap-3">

          {/* Avatar card */}
          <div className="flex items-center gap-3 bg-bg-primary border border-border-default rounded-2xl px-4 py-3 shadow-md shrink-0">
            <div className="ring-spin p-[2.5px] rounded-full shrink-0"
              style={{ background: "conic-gradient(from 0deg,#ef4444,#f97316,#ef4444)" }}>
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-action-primary to-action-danger border-2 border-white flex items-center justify-center text-text-white font-extrabold text-sm">
                {initials || <User size={18} />}
              </div>
            </div>
            <div>
              <p className="text-sm font-extrabold text-text-primary leading-tight">{fullName || "Your Name"}</p>
              <p className="text-[11px] text-text-secondary truncate max-w-[180px]">{profileForm.email || "your@email.com"}</p>
              <span className="inline-block mt-1 text-[9px] font-extrabold uppercase tracking-wider bg-green-50 text-green-600 border border-green-100 rounded-full px-2 py-0.5">
                ✓ Admin
              </span>
            </div>
          </div>

          {/* Info chips */}
          {[
            { icon: <Phone size={12} />, label: "Phone", val: profileForm.phone || "—" },
            { icon: <Calendar size={12} />, label: "DOB", val: profileForm.dob || "—" },
            { icon: <Key size={12} />, label: "Client ID", val: clientId || "—" },
          ].map(({ icon, label, val }) => (
            <div key={label} className="flex items-center gap-2.5 bg-bg-primary border border-border-default rounded-2xl px-3.5 py-2.5 shadow-sm min-w-[100px]">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-action-primary flex items-center justify-center shrink-0">{icon}</div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-text-secondary">{label}</p>
                <p className="text-xs font-bold text-text-primary">{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══ WIZARD CARD ══ */}
        <div className="fade-up flex-1 bg-bg-primary border border-border-default rounded-3xl shadow-lg flex flex-col overflow-hidden">

          {/* ── Step progress — ALL always clickable ── */}
          <div className="flex items-center px-6 py-4 border-b border-border-default bg-gradient-to-r from-red-50/50 to-transparent shrink-0 gap-0">
            {STEPS.map((s, i) => {
              const active = step === s.id;
              const done = saved[s.id];
              return (
                <React.Fragment key={s.id}>
                  {/* Every step is always a clickable button */}
                  <button
                    onClick={() => goTo(s.id)}
                    className={`group flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all duration-200
                      ${active ? "bg-red-50/70" : "hover:bg-gray-50 cursor-pointer"}`}
                  >
                    {/* Circle */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0
                      ${active
                        ? "bg-gradient-to-br from-action-primary to-action-danger text-text-white shadow-lg shadow-red-200 scale-110"
                        : done
                          ? "bg-gradient-to-br from-action-primary to-action-danger text-text-white"
                          : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                      }`}
                    >
                      {done && !active ? <CheckCircle size={14} /> : <s.icon size={13} />}
                    </div>
                    {/* Labels */}
                    <div className="hidden sm:flex flex-col text-left">
                      <span className={`text-[11px] font-bold leading-tight transition-colors
                        ${active ? "text-action-primary" : done ? "text-action-primary" : "text-gray-400 group-hover:text-gray-600"}`}>
                        {s.label}
                      </span>
                      <span className="text-[9px] text-gray-400">{s.desc}</span>
                    </div>
                    {/* Active underline dot */}
                    {active && <span className="hidden sm:block w-1 h-1 rounded-full bg-action-primary ml-1" />}
                  </button>

                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500
                      ${saved[s.id] ? "bg-gradient-to-r from-action-primary to-action-danger" : "bg-gray-200"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── Step body ── */}
          <div className="flex-1 overflow-hidden relative">
            <div key={animKey} className={`${slideClass} p-5 lg:p-6 h-full flex flex-col`}>

              {/* ════ STEP 1 — Personal ════ */}
              {step === 1 && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <User size={16} className="text-action-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-text-primary">Personal Information</h3>
                      <p className="text-[11px] text-text-secondary">Update your identity &amp; contact details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1">
                    <Field label="First Name" icon={<User size={11} />}>
                      <input className={inp} name="first_name" value={profileForm.first_name}
                        onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} placeholder="John" />
                    </Field>
                    <Field label="Last Name" icon={<User size={11} />}>
                      <input className={inp} name="last_name" value={profileForm.last_name}
                        onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} placeholder="Doe" />
                    </Field>
                    <Field label="Email Address" icon={<Mail size={11} />}>
                      <input className={inp} type="email" name="email" value={profileForm.email}
                        onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="john@example.com" />
                    </Field>
                    <Field label="Phone Number" icon={<Phone size={11} />}>
                      <input className={inp} type="tel" name="phone" value={profileForm.phone}
                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 98765 43210" />
                    </Field>
                    <Field label="Date of Birth" icon={<Calendar size={11} />} full>
                      <input className={inp} type="date" name="dob" value={profileForm.dob}
                        onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })} />
                    </Field>
                  </div>

                  <div className="flex justify-between items-center pt-4 mt-auto border-t border-border-default">
                    {/* Step hint */}
                    <p className="text-[11px] text-text-secondary hidden sm:block">
                      Click any step above to switch sections
                    </p>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => goTo(2)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-default text-text-secondary text-sm font-semibold hover:bg-gray-50 hover:text-text-primary transition-all">
                        <span>Address</span><ChevronRight size={14} />
                      </button>
                      <button onClick={handleProfileSave} disabled={profileLoading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-action-primary to-action-danger text-text-white text-sm font-bold shadow-md shadow-red-200 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {profileLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save</span></>}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ════ STEP 2 — Address ════ */}
              {step === 2 && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-action-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-text-primary">Address Information</h3>
                      <p className="text-[11px] text-text-secondary">Shipping &amp; billing address</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1">
                    <Field label="Address Line 1" icon={<Home size={11} />} full>
                      <input className={inp} name="address_line1" value={addressForm.address_line1}
                        onChange={e => setAddressForm({ ...addressForm, address_line1: e.target.value })} placeholder="Street address" />
                    </Field>
                    <Field label="Address Line 2" icon={<Home size={11} />} full>
                      <input className={inp} name="address_line2" value={addressForm.address_line2}
                        onChange={e => setAddressForm({ ...addressForm, address_line2: e.target.value })} placeholder="Apt, suite, floor (optional)" />
                    </Field>
                    <Field label="City" icon={<MapPin size={11} />}>
                      <input className={inp} name="city" value={addressForm.city}
                        onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="Mumbai" />
                    </Field>
                    <Field label="State" icon={<MapPin size={11} />}>
                      <input className={inp} name="state" value={addressForm.state}
                        onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="Maharashtra" />
                    </Field>
                    <Field label="Country" icon={<MapPin size={11} />}>
                      <input className={inp} name="country" value={addressForm.country}
                        onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} placeholder="India" />
                    </Field>
                    <Field label="Pincode" icon={<Key size={11} />}>
                      <input className={inp} name="pincode" value={addressForm.pincode}
                        onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} placeholder="400001" />
                    </Field>
                    <Field label="Contact Person" icon={<User size={11} />}>
                      <input className={inp} name="contact_name" value={addressForm.contact_name}
                        onChange={e => setAddressForm({ ...addressForm, contact_name: e.target.value })} placeholder="Full name" />
                    </Field>
                    <Field label="Contact Number" icon={<Phone size={11} />}>
                      <input className={inp} name="contact_number" value={addressForm.contact_number}
                        onChange={e => setAddressForm({ ...addressForm, contact_number: e.target.value })} placeholder="+91 98765 43210" />
                    </Field>
                  </div>

                  <div className="flex justify-between items-center pt-4 mt-auto border-t border-border-default">
                    <p className="text-[11px] text-text-secondary hidden sm:block">
                      Click any step above to switch sections
                    </p>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => goTo(1)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-default text-text-secondary text-sm font-semibold hover:bg-gray-50 hover:text-text-primary transition-all">
                        <ChevronLeft size={14} /><span>Personal</span>
                      </button>
                      <button onClick={() => goTo(3)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-default text-text-secondary text-sm font-semibold hover:bg-gray-50 hover:text-text-primary transition-all">
                        <span>Security</span><ChevronRight size={14} />
                      </button>
                      <button onClick={handleAddressSave} disabled={profileLoading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-action-primary to-action-danger text-text-white text-sm font-bold shadow-md shadow-red-200 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {profileLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save</span></>}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ════ STEP 3 — Security ════ */}
              {step === 3 && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <Shield size={16} className="text-action-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-text-primary">Security Settings</h3>
                      <p className="text-[11px] text-text-secondary">Update your account password</p>
                    </div>
                  </div>

                  {/* Method pill */}
                  <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-4 gap-1">
                    {[["otp", "OTP Verification"], ["old_password", "Old Password"]].map(([m, lbl]) => (
                      <button key={m}
                        onClick={() => { setResetMethod(m); setPasswordForm(p => ({ ...p, otp: "", old_password: "" })); setOtpSent(m === "old_password"); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all
                          ${resetMethod === m ? "bg-white text-action-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1">
                    <Field label="Username" icon={<User size={11} />} full>
                      <input className={inp} name="username" value={passwordForm.username}
                        onChange={e => setPasswordForm({ ...passwordForm, username: e.target.value })} placeholder="Your username" />
                    </Field>

                    {resetMethod === "otp" && !otpSent && (
                      <div className="col-span-2">
                        <button onClick={handleSendOtp} disabled={passwordLoading}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-action-primary to-action-danger text-text-white text-sm font-bold shadow-md shadow-red-200 hover:brightness-105 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          {passwordLoading ? <Spin /> : <><Send size={14} /><span>Send OTP to Email</span></>}
                        </button>
                      </div>
                    )}

                    {resetMethod === "otp" && otpSent && (
                      <Field label="Enter OTP" icon={<Key size={11} />} full>
                        <div className="flex gap-2">
                          <input className={`${inp} flex-1 text-center tracking-[0.3em] text-base font-bold`}
                            name="otp" value={passwordForm.otp} maxLength={6}
                            onChange={e => setPasswordForm({ ...passwordForm, otp: e.target.value })} placeholder="— — — — — —" />
                          <button onClick={handleSendOtp}
                            className="shrink-0 px-3 py-2 rounded-xl border border-action-primary text-action-primary text-xs font-bold hover:bg-red-50 transition-colors">
                            Resend
                          </button>
                        </div>
                      </Field>
                    )}

                    {resetMethod === "old_password" && (
                      <Field label="Old Password" icon={<Lock size={11} />} full>
                        <PwField value={passwordForm.old_password} show={showOld} onToggle={() => setShowOld(v => !v)}
                          onChange={e => setPasswordForm({ ...passwordForm, old_password: e.target.value })} placeholder="Current password" />
                      </Field>
                    )}

                    <Field label="New Password" icon={<Lock size={11} />}>
                      <PwField value={passwordForm.new_password} show={showNew} onToggle={() => setShowNew(v => !v)}
                        onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} placeholder="New password" />
                    </Field>

                    <Field label="Confirm Password" icon={<Lock size={11} />}>
                      <div>
                        <PwField value={passwordForm.confirm_password} show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                          onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} placeholder="Confirm password" />
                        {pwMatch && <p className="text-[10px] text-green-500 font-bold mt-1">✓ Passwords match</p>}
                        {pwMismatch && <p className="text-[10px] text-action-primary font-bold mt-1">✗ Don't match</p>}
                      </div>
                    </Field>
                  </div>

                  <div className="flex justify-between items-center pt-4 mt-auto border-t border-border-default">
                    <p className="text-[11px] text-text-secondary hidden sm:block">
                      Click any step above to switch sections
                    </p>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => goTo(2)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-default text-text-secondary text-sm font-semibold hover:bg-gray-50 hover:text-text-primary transition-all">
                        <ChevronLeft size={14} /><span>Address</span>
                      </button>
                      <button onClick={handleResetPassword} disabled={passwordLoading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-action-primary to-action-danger text-text-white text-sm font-bold shadow-md shadow-red-200 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {passwordLoading ? <Spin /> : <><Shield size={14} /><span>Reset Password</span></>}
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
