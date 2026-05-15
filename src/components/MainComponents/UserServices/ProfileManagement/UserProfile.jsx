// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   User, Mail, Phone, Calendar, Lock, Send,
//   MapPin, Shield, Eye, EyeOff, ChevronRight,
//   ChevronLeft, CheckCircle, Home, Key
// } from "lucide-react";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import axios from "axios";

// const STEPS = [
//   { id: 1, label: "Personal", icon: User, desc: "Identity & contact" },
//   { id: 2, label: "Address", icon: Home, desc: "Location details" },
//   { id: 3, label: "Security", icon: Shield, desc: "Password reset" },
// ];

// function Field({ label, icon, children, full }) {
//   return (
//     <div className={full ? "col-span-2" : "col-span-1"}>
//       <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
//         <span className="text-rose-400">{icon}</span>
//         {label}
//       </label>
//       {children}
//     </div>
//   );
// }

// const inp =
//   "w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 outline-none transition-all duration-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/15 placeholder:text-slate-300 font-[inherit] shadow-sm hover:border-slate-300";

// function PwField({ value, onChange, placeholder, show, onToggle }) {
//   return (
//     <div className="relative">
//       <input className={inp} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} />
//       <button
//         type="button"
//         onClick={onToggle}
//         className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-400 transition-colors"
//       >
//         {show ? <EyeOff size={14} /> : <Eye size={14} />}
//       </button>
//     </div>
//   );
// }

// function Spin() {
//   return (
//     <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
//   );
// }

// export default function UserProfile({ clientId, token }) {
//   const navigate = useNavigate();
//   const [step, setStep] = useState(1);
//   const [animKey, setAnimKey] = useState(0);
//   const [dir, setDir] = useState("fwd");
//   const [saved, setSaved] = useState({ 1: false, 2: false, 3: false });

//   const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "", dob: "" });
//   const [addressForm, setAddressForm] = useState({ address_line1: "", address_line2: "", name: "", city: "", state: "", country: "", pincode: "", contact_name: "", contact_number: "" });
//   const [profileLoading, setProfileLoading] = useState(false);
//   const [fetchingProfile, setFetchingProfile] = useState(true);

//   const [passwordForm, setPasswordForm] = useState({ username: "", otp: "", old_password: "", new_password: "", confirm_password: "" });
//   const [otpSent, setOtpSent] = useState(false);
//   const [passwordLoading, setPasswordLoading] = useState(false);
//   const [resetMethod, setResetMethod] = useState("otp");
//   const [showNew, setShowNew] = useState(false);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [showOld, setShowOld] = useState(false);

//   useEffect(() => {
//     const fetchProfile = async () => {
//       if (!clientId || !token) { setFetchingProfile(false); return; }
//       try {
//         const pRes = await axios.get(
//           `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         const p = pRes.data?.data?.person;
//         if (p) setProfileForm({ first_name: p.first_name || "", last_name: p.last_name || "", email: p.email || "", phone: p.phone || "", dob: p.dob || "" });

//         const aRes = await axios.get(
//           `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         const a = aRes.data?.data?.addresses?.[0];
//         if (a) setAddressForm({ address_line1: a.address_line1 || "", address_line2: a.address_line2 || "", name: a.name || "", city: a.city || "", state: a.state || "", country: a.country || "", pincode: a.pincode || "", contact_name: a.contact_name || "", contact_number: a.contact_number || "" });
//       } catch (err) {
//         const s = err?.response?.status;
//         if (s === 403) toast.error("Access denied. Please re-login.");
//         else if (s === 401) toast.error("Session expired.");
//         else toast.error("Failed to fetch profile");
//       } finally { setFetchingProfile(false); }
//     };
//     fetchProfile();
//   }, [clientId, token]);

//   const goTo = (n) => {
//     if (n === step) return;
//     setDir(n > step ? "fwd" : "bwd");
//     setAnimKey(k => k + 1);
//     setStep(n);
//   };

//   const handleProfileSave = async () => {
//     if (!clientId || !token) { toast.error("Missing authentication"); return; }
//     setProfileLoading(true);
//     try {
//       await axios.post(
//         `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
//         profileForm,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       toast.success("Personal info saved!");
//       setSaved(s => ({ ...s, 1: true }));
//     } catch (e) { toast.error(e?.response?.data?.detail || "Failed to save"); }
//     finally { setProfileLoading(false); }
//   };

//   const handleAddressSave = async () => {
//     if (!clientId || !token) { toast.error("Missing authentication"); return; }
//     setProfileLoading(true);
//     try {
//       const headers = { Authorization: `Bearer ${token}` };
//       if (addressForm.id) {
//         await axios.put(
//           `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address/${addressForm.id}`,
//           addressForm, { headers }
//         );
//         toast.success("Address updated!");
//       } else {
//         const res = await axios.post(
//           `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address`,
//           addressForm, { headers }
//         );
//         toast.success("Address saved!");
//         if (res.data?.data?.address_id) {
//           setAddressForm(prev => ({ ...prev, id: res.data.data.address_id }));
//         }
//       }
//       setSaved(s => ({ ...s, 2: true }));
//     } catch (e) { toast.error(e?.response?.data?.detail || "Failed to save"); }
//     finally { setProfileLoading(false); }
//   };

//   const handleSendOtp = async () => {
//     if (!passwordForm.username) { toast.error("Enter username first"); return; }
//     if (!clientId || !token) { toast.error("Missing authentication"); return; }
//     setPasswordLoading(true);
//     try {
//       const res = await axios.post(
//         `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
//         { username: passwordForm.username, otp: "", old_password: "", new_password: "", confirm_password: "" },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       toast.success(res.data.message || "OTP sent!");
//       setOtpSent(true);
//     } catch (e) { toast.error(e?.response?.data?.detail || "Failed to send OTP"); }
//     finally { setPasswordLoading(false); }
//   };

//   const handleResetPassword = async () => {
//     if (!passwordForm.new_password || !passwordForm.confirm_password) { toast.error("Fill all password fields"); return; }
//     if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error("Passwords don't match"); return; }
//     if (resetMethod === "otp" && !passwordForm.otp) { toast.error("Enter OTP"); return; }
//     if (resetMethod === "old_password" && !passwordForm.old_password) { toast.error("Enter old password"); return; }
//     if (!clientId || !token) { toast.error("Missing authentication"); return; }
//     setPasswordLoading(true);
//     try {
//       const res = await axios.post(
//         `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
//         {
//           username: passwordForm.username,
//           new_password: passwordForm.new_password,
//           confirm_password: passwordForm.confirm_password,
//           otp: resetMethod === "otp" ? passwordForm.otp : "",
//           old_password: resetMethod === "old_password" ? passwordForm.old_password : "",
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       toast.success(res.data.message || "Password reset!");
//       setPasswordForm({ username: "", otp: "", old_password: "", new_password: "", confirm_password: "" });
//       setOtpSent(false);
//       setSaved(s => ({ ...s, 3: true }));
//     } catch (e) { toast.error(e?.response?.data?.detail || "Failed to reset"); }
//     finally { setPasswordLoading(false); }
//   };

//   const initials = `${profileForm.first_name?.charAt(0) || ""}${profileForm.last_name?.charAt(0) || ""}`.toUpperCase();
//   const fullName = `${profileForm.first_name} ${profileForm.last_name}`.trim();
//   const pwMatch = passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password === passwordForm.confirm_password;
//   const pwMismatch = passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password;

//   const slideClass = dir === "fwd"
//     ? "animate-[slideInRight_0.28s_cubic-bezier(0.22,1,0.36,1)_both]"
//     : "animate-[slideInLeft_0.28s_cubic-bezier(0.22,1,0.36,1)_both]";

//   if (fetchingProfile) return (
//     <div className="min-h-screen bg-slate-50 flex items-center justify-center">
//       <div className="text-center space-y-4">
//         <div className="relative w-12 h-12 mx-auto">
//           <div className="absolute inset-0 rounded-full border-[3px] border-rose-100 border-t-rose-500 animate-spin" />
//         </div>
//         <p className="text-sm text-slate-400 font-medium tracking-wide">Loading profile…</p>
//       </div>
//     </div>
//   );

//   if (!token) return (
//     <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
//       <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-sm w-full text-center shadow-xl shadow-slate-100">
//         <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
//           <Lock size={22} className="text-rose-500" />
//         </div>
//         <h2 className="text-xl font-bold text-slate-800 mb-2">Authentication Required</h2>
//         <p className="text-sm text-slate-400 mb-6">Please login to access your profile.</p>
//         <button onClick={() => navigate('/login')}
//           className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200">
//           Go to Login
//         </button>
//       </div>
//     </div>
//   );

//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
//         * { font-family: 'Sora', sans-serif; }
//         @keyframes slideInRight { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
//         @keyframes slideInLeft  { from { opacity:0; transform:translateX(-22px); } to { opacity:1; transform:translateX(0); } }
//         @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
//         @keyframes spinRing { to { transform:rotate(360deg); } }
//         .ring-spin { animation: spinRing 6s linear infinite; }
//         .fade-up-1 { animation: fadeUp 0.4s 0.05s cubic-bezier(0.22,1,0.36,1) both; }
//         .fade-up-2 { animation: fadeUp 0.4s 0.15s cubic-bezier(0.22,1,0.36,1) both; }
//       `}</style>

//       <div className="bg-slate-50 min-h-[calc(100vh-64px)] p-4 sm:p-5 lg:p-6 flex flex-col gap-4 overflow-x-hidden">

//         {/* ══ PROFILE HEADER ══ */}
//         <div className="fade-up-1 flex flex-wrap gap-3 items-stretch">

//           {/* Avatar card */}
//           <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm shadow-slate-100 shrink-0">
//             <div className="ring-spin p-[2.5px] rounded-full shrink-0"
//               style={{ background: "conic-gradient(from 0deg, #fb7185, #f43f5e, #fb7185)" }}>
//               <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 border-2 border-white flex items-center justify-center text-white font-bold text-sm shadow-inner">
//                 {initials || <User size={18} />}
//               </div>
//             </div>
//             <div>
//               <p className="text-[15px] font-bold text-slate-800 leading-tight">{fullName || "Your Name"}</p>
//               <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{profileForm.email || "your@email.com"}</p>
//               <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5">
//                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
//                 Admin
//               </span>
//             </div>
//           </div>

//           {/* Stat chips */}
//           <div className="flex flex-wrap gap-3 items-stretch flex-1 min-w-0">
//             {[
//               { icon: <Phone size={13} />, label: "Phone", val: profileForm.phone || "—", color: "bg-blue-50 text-blue-500 border-blue-100" },
//               { icon: <Calendar size={13} />, label: "Date of Birth", val: profileForm.dob || "—", color: "bg-violet-50 text-violet-500 border-violet-100" },
//               { icon: <Key size={13} />, label: "Client ID", val: clientId || "—", color: "bg-amber-50 text-amber-500 border-amber-100" },
//             ].map(({ icon, label, val, color }) => (
//               <div key={label} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm shadow-slate-100 flex-1 min-w-[120px]">
//                 <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
//                 <div className="min-w-0">
//                   <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
//                   <p className="text-sm font-semibold text-slate-700 truncate">{val}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* ══ WIZARD CARD ══ */}
//         <div className="fade-up-2 flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100 flex flex-col overflow-hidden">

//           {/* ── Step tabs ── */}
//           <div className="flex items-center px-4 sm:px-6 py-0 border-b border-slate-100 shrink-0 overflow-x-auto scrollbar-hide">
//             {STEPS.map((s, i) => {
//               const active = step === s.id;
//               const done = saved[s.id];
//               return (
//                 <React.Fragment key={s.id}>
//                   <button
//                     onClick={() => goTo(s.id)}
//                     className={`group flex items-center gap-2.5 px-3 sm:px-4 py-4 border-b-2 transition-all duration-200 whitespace-nowrap shrink-0
//                       ${active
//                         ? "border-rose-500 text-rose-500"
//                         : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200 cursor-pointer"}`}
//                   >
//                     <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0
//                       ${active
//                         ? "bg-rose-500 text-white shadow-md shadow-rose-200"
//                         : done
//                           ? "bg-emerald-500 text-white"
//                           : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"}`}
//                     >
//                       {done && !active ? <CheckCircle size={13} /> : <s.icon size={13} />}
//                     </div>
//                     <div className="text-left hidden sm:flex flex-col">
//                       <span className={`text-[12px] font-semibold leading-tight transition-colors
//                         ${active ? "text-rose-500" : done ? "text-emerald-500" : "text-slate-400 group-hover:text-slate-600"}`}>
//                         {s.label}
//                       </span>
//                       <span className="text-[10px] text-slate-400">{s.desc}</span>
//                     </div>
//                     <span className="sm:hidden text-[12px] font-semibold">{s.label}</span>
//                   </button>
//                   {i < STEPS.length - 1 && (
//                     <div className={`w-6 sm:w-10 h-px mx-1 transition-all duration-500 shrink-0
//                       ${saved[s.id] ? "bg-emerald-300" : "bg-slate-100"}`} />
//                   )}
//                 </React.Fragment>
//               );
//             })}
//           </div>

//           {/* ── Step content ── */}
//           <div className="flex-1 overflow-y-auto overflow-x-hidden">
//             <div key={animKey} className={`${slideClass} p-4 sm:p-6 flex flex-col gap-5 min-h-full`}>

//               {/* ════ STEP 1 — Personal ════ */}
//               {step === 1 && (
//                 <>
//                   <div className="flex items-center gap-3">
//                     <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
//                       <User size={16} className="text-rose-500" />
//                     </div>
//                     <div>
//                       <h3 className="text-[14px] font-bold text-slate-800">Personal Information</h3>
//                       <p className="text-[11px] text-slate-400 mt-0.5">Update your identity & contact details</p>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                     <Field label="First Name" icon={<User size={10} />}>
//                       <input className={inp} name="first_name" value={profileForm.first_name}
//                         onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} placeholder="John" />
//                     </Field>
//                     <Field label="Last Name" icon={<User size={10} />}>
//                       <input className={inp} name="last_name" value={profileForm.last_name}
//                         onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} placeholder="Doe" />
//                     </Field>
//                     <Field label="Email Address" icon={<Mail size={10} />}>
//                       <input className={inp} type="email" name="email" value={profileForm.email}
//                         onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="john@example.com" />
//                     </Field>
//                     <Field label="Phone Number" icon={<Phone size={10} />}>
//                       <input className={inp} type="tel" name="phone" value={profileForm.phone}
//                         onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 98765 43210" />
//                     </Field>
//                     <Field label="Date of Birth" icon={<Calendar size={10} />} full>
//                       <input className={inp} type="date" name="dob" value={profileForm.dob}
//                         onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })} />
//                     </Field>
//                   </div>

//                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 mt-auto border-t border-slate-100">
//                     <p className="text-[11px] text-slate-400 hidden sm:block">Click any tab above to switch sections</p>
//                     <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
//                       <button onClick={() => goTo(2)}
//                         className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all">
//                         <span>Address</span><ChevronRight size={14} />
//                       </button>
//                       <button onClick={handleProfileSave} disabled={profileLoading}
//                         className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-200 hover:bg-rose-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
//                         {profileLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save Changes</span></>}
//                       </button>
//                     </div>
//                   </div>
//                 </>
//               )}

//               {/* ════ STEP 2 — Address ════ */}
//               {step === 2 && (
//                 <>
//                   <div className="flex items-center gap-3">
//                     <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
//                       <MapPin size={16} className="text-blue-500" />
//                     </div>
//                     <div>
//                       <h3 className="text-[14px] font-bold text-slate-800">Address Information</h3>
//                       <p className="text-[11px] text-slate-400 mt-0.5">Shipping & billing address</p>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                     <Field label="Address Line 1" icon={<Home size={10} />} full>
//                       <input className={inp} name="address_line1" value={addressForm.address_line1}
//                         onChange={e => setAddressForm({ ...addressForm, address_line1: e.target.value })} placeholder="Street address" />
//                     </Field>
//                     <Field label="Address Line 2" icon={<Home size={10} />} full>
//                       <input className={inp} name="address_line2" value={addressForm.address_line2}
//                         onChange={e => setAddressForm({ ...addressForm, address_line2: e.target.value })} placeholder="Apt, suite, floor (optional)" />
//                     </Field>
//                     <Field label="Address Name" icon={<Home size={10} />} full>
//                       <input className={inp} name="name" value={addressForm.name}
//                         onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} placeholder="Home / Work / Office" />
//                     </Field>
//                     <Field label="City" icon={<MapPin size={10} />}>
//                       <input className={inp} name="city" value={addressForm.city}
//                         onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="Mumbai" />
//                     </Field>
//                     <Field label="State" icon={<MapPin size={10} />}>
//                       <input className={inp} name="state" value={addressForm.state}
//                         onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="Maharashtra" />
//                     </Field>
//                     <Field label="Country" icon={<MapPin size={10} />}>
//                       <input className={inp} name="country" value={addressForm.country}
//                         onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} placeholder="India" />
//                     </Field>
//                     <Field label="Pincode" icon={<Key size={10} />}>
//                       <input className={inp} name="pincode" value={addressForm.pincode}
//                         onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} placeholder="400001" />
//                     </Field>
//                     <Field label="Contact Person" icon={<User size={10} />}>
//                       <input className={inp} name="contact_name" value={addressForm.contact_name}
//                         onChange={e => setAddressForm({ ...addressForm, contact_name: e.target.value })} placeholder="Full name" />
//                     </Field>
//                     <Field label="Contact Number" icon={<Phone size={10} />}>
//                       <input className={inp} name="contact_number" value={addressForm.contact_number}
//                         onChange={e => setAddressForm({ ...addressForm, contact_number: e.target.value })} placeholder="+91 98765 43210" />
//                     </Field>
//                   </div>

//                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 mt-auto border-t border-slate-100">
//                     <p className="text-[11px] text-slate-400 hidden sm:block">Click any tab above to switch sections</p>
//                     <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
//                       <button onClick={() => goTo(1)}
//                         className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-all">
//                         <ChevronLeft size={14} /><span>Personal</span>
//                       </button>
//                       <button onClick={() => goTo(3)}
//                         className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-all">
//                         <span>Security</span><ChevronRight size={14} />
//                       </button>
//                       <button onClick={handleAddressSave} disabled={profileLoading}
//                         className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-200 hover:bg-rose-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
//                         {profileLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save Changes</span></>}
//                       </button>
//                     </div>
//                   </div>
//                 </>
//               )}

//               {/* ════ STEP 3 — Security ════ */}
//               {step === 3 && (
//                 <>
//                   <div className="flex items-center gap-3">
//                     <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
//                       <Shield size={16} className="text-violet-500" />
//                     </div>
//                     <div>
//                       <h3 className="text-[14px] font-bold text-slate-800">Security Settings</h3>
//                       <p className="text-[11px] text-slate-400 mt-0.5">Update your account password</p>
//                     </div>
//                   </div>

//                   {/* Method pills */}
//                   <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1 self-start">
//                     {[["otp", "OTP Verification"], ["old_password", "Old Password"]].map(([m, lbl]) => (
//                       <button key={m}
//                         onClick={() => { setResetMethod(m); setPasswordForm(p => ({ ...p, otp: "", old_password: "" })); setOtpSent(m === "old_password"); }}
//                         className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all
//                           ${resetMethod === m ? "bg-white text-rose-500 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
//                         {lbl}
//                       </button>
//                     ))}
//                   </div>

//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                     <Field label="Username" icon={<User size={10} />} full>
//                       <input className={inp} name="username" value={passwordForm.username}
//                         onChange={e => setPasswordForm({ ...passwordForm, username: e.target.value })} placeholder="Your username" />
//                     </Field>

//                     {resetMethod === "otp" && !otpSent && (
//                       <div className="col-span-1 sm:col-span-2">
//                         <button onClick={handleSendOtp} disabled={passwordLoading}
//                           className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-200 hover:bg-rose-600 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
//                           {passwordLoading ? <Spin /> : <><Send size={14} /><span>Send OTP to Email</span></>}
//                         </button>
//                       </div>
//                     )}

//                     {resetMethod === "otp" && otpSent && (
//                       <div className="col-span-1 sm:col-span-2">
//                         <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
//                           <span className="text-rose-400"><Key size={10} /></span>
//                           Enter OTP
//                         </label>
//                         <div className="flex gap-2">
//                           <input
//                             className={`${inp} flex-1 text-center tracking-[0.4em] text-base font-bold`}
//                             name="otp" value={passwordForm.otp} maxLength={6}
//                             onChange={e => setPasswordForm({ ...passwordForm, otp: e.target.value })}
//                             placeholder="— — — — — —" />
//                           <button onClick={handleSendOtp}
//                             className="shrink-0 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-500 text-xs font-semibold hover:bg-rose-50 transition-colors">
//                             Resend
//                           </button>
//                         </div>
//                       </div>
//                     )}

//                     {resetMethod === "old_password" && (
//                       <div className="col-span-1 sm:col-span-2">
//                         <Field label="Old Password" icon={<Lock size={10} />} full>
//                           <PwField value={passwordForm.old_password} show={showOld} onToggle={() => setShowOld(v => !v)}
//                             onChange={e => setPasswordForm({ ...passwordForm, old_password: e.target.value })} placeholder="Current password" />
//                         </Field>
//                       </div>
//                     )}

//                     <Field label="New Password" icon={<Lock size={10} />}>
//                       <PwField value={passwordForm.new_password} show={showNew} onToggle={() => setShowNew(v => !v)}
//                         onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} placeholder="New password" />
//                     </Field>

//                     <Field label="Confirm Password" icon={<Lock size={10} />}>
//                       <div>
//                         <PwField value={passwordForm.confirm_password} show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
//                           onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} placeholder="Confirm password" />
//                         {pwMatch && <p className="text-[10px] text-emerald-500 font-semibold mt-1.5 flex items-center gap-1"><CheckCircle size={10} /> Passwords match</p>}
//                         {pwMismatch && <p className="text-[10px] text-rose-500 font-semibold mt-1.5">✗ Passwords don't match</p>}
//                       </div>
//                     </Field>
//                   </div>

//                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 mt-auto border-t border-slate-100">
//                     <p className="text-[11px] text-slate-400 hidden sm:block">Click any tab above to switch sections</p>
//                     <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
//                       <button onClick={() => goTo(2)}
//                         className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-all">
//                         <ChevronLeft size={14} /><span>Address</span>
//                       </button>
//                       <button onClick={handleResetPassword} disabled={passwordLoading}
//                         className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-200 hover:bg-rose-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
//                         {passwordLoading ? <Spin /> : <><Shield size={14} /><span>Reset Password</span></>}
//                       </button>
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }




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

const inp =
  "w-full px-3.5 py-2.5 rounded-lg text-sm border border-zinc-200 bg-zinc-50 text-zinc-800 outline-none transition-all duration-150 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/10 placeholder:text-zinc-300 font-[inherit]";

function Label({ icon, children }) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 mb-1.5">
      <span className="text-orange-400">{icon}</span>{children}
    </label>
  );
}

function PwField({ value, onChange, placeholder, show, onToggle }) {
  return (
    <div className="relative">
      <input className={inp} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-orange-400 transition-colors">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function Spin() {
  return <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />;
}

function SectionCard({ title, subtitle, icon, accentClass, children }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-3.5 border-b border-zinc-100 ${accentClass}`}>
        <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shrink-0 shadow-sm border border-white/60">
          {icon}
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-zinc-800">{title}</h3>
          <p className="text-[11px] text-zinc-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function UserProfile({ clientId, token }) {
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
        if (a) setAddressForm({ address_line1: a.address_line1 || "", address_line2: a.address_line2 || "", name: a.name || "", city: a.city || "", state: a.state || "", country: a.country || "", pincode: a.pincode || "", contact_name: a.contact_name || "", contact_number: a.contact_number || "" });
      } catch (err) {
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
      setSavedSections(s => ({ ...s, address: true }));
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

  const initials = `${profileForm.first_name?.charAt(0) || ""}${profileForm.last_name?.charAt(0) || ""}`.toUpperCase();
  const fullName = `${profileForm.first_name} ${profileForm.last_name}`.trim();
  const pwMatch = passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password === passwordForm.confirm_password;
  const pwMismatch = passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password;

  if (fetchingProfile) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="relative w-11 h-11 mx-auto">
          <div className="absolute inset-0 rounded-full border-[3px] border-orange-100 border-t-orange-500 animate-spin" />
        </div>
        <p className="text-sm text-zinc-400 font-medium">Loading profile…</p>
      </div>
    </div>
  );

  if (!token) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="bg-white border border-zinc-200 rounded-2xl p-10 max-w-sm w-full text-center shadow-xl">
        <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock size={22} className="text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-zinc-800 mb-2">Authentication Required</h2>
        <p className="text-sm text-zinc-400 mb-6">Please login to access your profile.</p>
        <button onClick={() => navigate('/login')} className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors">
          Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .mono { font-family: 'DM Mono', monospace; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spinRing { to { transform:rotate(360deg); } }
        .ring-spin { animation: spinRing 7s linear infinite; }
        .s1 { animation: fadeUp 0.4s 0.04s both; }
        .s2 { animation: fadeUp 0.4s 0.10s both; }
        .s3 { animation: fadeUp 0.4s 0.16s both; }
        .s4 { animation: fadeUp 0.4s 0.22s both; }
      `}</style>

      <div className="bg-zinc-50 min-h-[calc(100vh-64px)] p-4 sm:p-5 lg:p-6 xl:p-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">

          {/* ══ LEFT SIDEBAR ══ */}
          <div className="s1 w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6">

            {/* Profile identity card */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="h-20 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #f97316 0%, #fb7185 50%, #e879f9 100%)" }}>
                <div className="absolute inset-0 opacity-[0.15]"
                  style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)", backgroundSize: "12px 12px" }} />
              </div>
              <div className="px-5 pb-5 -mt-7 relative">
                <div className="ring-spin w-fit p-[2.5px] rounded-full mb-3"
                  style={{ background: "conic-gradient(from 0deg, #f97316, #fb7185, #f97316)" }}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 border-[3px] border-white flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {initials || <User size={20} />}
                  </div>
                </div>
                <p className="text-[15px] font-bold text-zinc-800 leading-tight">{fullName || "Your Name"}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 break-all leading-relaxed">{profileForm.email || "your@email.com"}</p>
                <span className="inline-flex items-center gap-1.5 mt-2.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />Admin
                </span>
              </div>
            </div>

            {/* Meta chips */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden divide-y divide-zinc-50">
              {[
                { icon: <Phone size={12} className="text-orange-400" />, label: "Phone", val: profileForm.phone || "—", bg: "bg-orange-50 border-orange-100" },
                { icon: <Calendar size={12} className="text-rose-400" />, label: "Date of Birth", val: profileForm.dob || "—", bg: "bg-rose-50 border-rose-100" },
                { icon: <Hash size={12} className="text-violet-400" />, label: "Client ID", val: clientId || "—", bg: "bg-violet-50 border-violet-100", mono: true },
              ].map(({ icon, label, val, bg, mono }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50/80 transition-colors">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${bg}`}>{icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-300">{label}</p>
                    <p className={`text-[12px] font-semibold text-zinc-700 truncate ${mono ? "mono" : ""}`}>{val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Save status tracker */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-300 mb-3">Unsaved Changes</p>
              <div className="space-y-2">
                {[
                  { key: "personal", label: "Personal Info", icon: <User size={11} />, color: "orange" },
                  { key: "address", label: "Address", icon: <Home size={11} />, color: "rose" },
                  { key: "security", label: "Security", icon: <Shield size={11} />, color: "violet" },
                ].map(({ key, label, icon, color }) => {
                  const done = savedSections[key];
                  return (
                    <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 ${done ? "bg-emerald-50 border border-emerald-100" : "bg-zinc-50 border border-zinc-100"}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all
                        ${done ? "bg-emerald-500 text-white" : `bg-${color}-100 text-${color}-400`}`}>
                        {done ? <CheckCircle size={11} /> : icon}
                      </div>
                      <span className={`text-[11px] font-semibold flex-1 ${done ? "text-emerald-700" : "text-zinc-400"}`}>{label}</span>
                      {done
                        ? <span className="text-[10px] text-emerald-500 font-bold">✓ Saved</span>
                        : <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
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
            <div className="s2">
              <SectionCard title="Personal Information" subtitle="Your identity and contact details"
                icon={<User size={15} className="text-orange-500" />} accentClass="bg-orange-50/70">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label icon={<User size={10} />}>First Name</Label>
                    <input className={inp} value={profileForm.first_name}
                      onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} placeholder="John" />
                  </div>
                  <div>
                    <Label icon={<User size={10} />}>Last Name</Label>
                    <input className={inp} value={profileForm.last_name}
                      onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} placeholder="Doe" />
                  </div>
                  <div>
                    <Label icon={<Mail size={10} />}>Email Address</Label>
                    <input className={inp} type="email" value={profileForm.email}
                      onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                  <div>
                    <Label icon={<Phone size={10} />}>Phone Number</Label>
                    <input className={inp} type="tel" value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 98765 43210" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label icon={<Calendar size={10} />}>Date of Birth</Label>
                    <input className={inp} type="date" value={profileForm.dob}
                      onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end mt-5 pt-4 border-t border-zinc-100">
                  <button onClick={handleProfileSave} disabled={profileLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold shadow-lg shadow-orange-100 hover:bg-orange-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {profileLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save Personal Info</span></>}
                  </button>
                </div>
              </SectionCard>
            </div>

            {/* ── Address ── */}
            <div className="s3">
              <SectionCard title="Address Information" subtitle="Shipping & billing address"
                icon={<MapPin size={15} className="text-rose-500" />} accentClass="bg-rose-50/70">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label icon={<Home size={10} />}>Address Line 1</Label>
                    <input className={inp} value={addressForm.address_line1}
                      onChange={e => setAddressForm({ ...addressForm, address_line1: e.target.value })} placeholder="Street address" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label icon={<Home size={10} />}>Address Line 2</Label>
                    <input className={inp} value={addressForm.address_line2}
                      onChange={e => setAddressForm({ ...addressForm, address_line2: e.target.value })} placeholder="Apt, suite, floor (optional)" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label icon={<Building2 size={10} />}>Address Name</Label>
                    <input className={inp} value={addressForm.name}
                      onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} placeholder="Home / Work / Office" />
                  </div>
                  <div>
                    <Label icon={<MapPin size={10} />}>City</Label>
                    <input className={inp} value={addressForm.city}
                      onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="Mumbai" />
                  </div>
                  <div>
                    <Label icon={<MapPin size={10} />}>State</Label>
                    <input className={inp} value={addressForm.state}
                      onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="Maharashtra" />
                  </div>
                  <div>
                    <Label icon={<MapPin size={10} />}>Country</Label>
                    <input className={inp} value={addressForm.country}
                      onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} placeholder="India" />
                  </div>
                  <div>
                    <Label icon={<Key size={10} />}>Pincode</Label>
                    <input className={inp} value={addressForm.pincode}
                      onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} placeholder="400001" />
                  </div>
                  <div>
                    <Label icon={<User size={10} />}>Contact Person</Label>
                    <input className={inp} value={addressForm.contact_name}
                      onChange={e => setAddressForm({ ...addressForm, contact_name: e.target.value })} placeholder="Full name" />
                  </div>
                  <div>
                    <Label icon={<Phone size={10} />}>Contact Number</Label>
                    <input className={inp} value={addressForm.contact_number}
                      onChange={e => setAddressForm({ ...addressForm, contact_number: e.target.value })} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="flex justify-end mt-5 pt-4 border-t border-zinc-100">
                  <button onClick={handleAddressSave} disabled={addressLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-100 hover:bg-rose-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {addressLoading ? <Spin /> : <><CheckCircle size={14} /><span>Save Address</span></>}
                  </button>
                </div>
              </SectionCard>
            </div>

            {/* ── Security ── */}
            <div className="s4">
              <SectionCard title="Security Settings" subtitle="Reset your account password"
                icon={<Fingerprint size={15} className="text-violet-500" />} accentClass="bg-violet-50/70">
                <div className="inline-flex bg-zinc-100 rounded-xl p-1 mb-5 gap-1">
                  {[["otp", "OTP Verification"], ["old_password", "Old Password"]].map(([m, lbl]) => (
                    <button key={m}
                      onClick={() => { setResetMethod(m); setPasswordForm(p => ({ ...p, otp: "", old_password: "" })); setOtpSent(false); }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all
                        ${resetMethod === m ? "bg-white text-violet-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>
                      {lbl}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label icon={<User size={10} />}>Username</Label>
                    <input className={inp} value={passwordForm.username}
                      onChange={e => setPasswordForm({ ...passwordForm, username: e.target.value })} placeholder="Your username"disabled={otpSent}  />
                  </div>

                  {resetMethod === "otp" && !otpSent && (
                    <div className="sm:col-span-2">
                      <button onClick={handleSendOtp} disabled={passwordLoading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-100 hover:bg-violet-600 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                        {passwordLoading ? <Spin /> : <><Send size={13} /><span>Send OTP to Email</span></>}
                      </button>
                    </div>
                  )}

                  {resetMethod === "otp" && otpSent && (
                    <div className="sm:col-span-2">
                      <Label icon={<Key size={10} />}>Enter OTP</Label>
                      <div className="flex gap-2">
                        <input className={`${inp} flex-1 text-center tracking-[0.4em] text-base font-bold mono`}
                          value={passwordForm.otp} maxLength={6}
                          onChange={e => setPasswordForm({ ...passwordForm, otp: e.target.value })}
                          placeholder="– – – – – –" />
                        <button onClick={handleSendOtp}
                          className="shrink-0 px-4 rounded-xl border border-violet-200 text-violet-500 text-xs font-semibold hover:bg-violet-50 transition-colors">
                          Resend
                        </button>
                      </div>
                    </div>
                  )}

                  {resetMethod === "old_password" && (
                    <div className="sm:col-span-2">
                      <Label icon={<Lock size={10} />}>Old Password</Label>
                      <PwField value={passwordForm.old_password} show={showOld} onToggle={() => setShowOld(v => !v)}
                        onChange={e => setPasswordForm({ ...passwordForm, old_password: e.target.value })} placeholder="Current password" />
                    </div>
                  )}

                  <div>
                    <Label icon={<Lock size={10} />}>New Password</Label>
                    <PwField value={passwordForm.new_password} show={showNew} onToggle={() => setShowNew(v => !v)}
                      onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} placeholder="New password" />
                  </div>

                  <div>
                    <Label icon={<Lock size={10} />}>Confirm Password</Label>
                    <div>
                      <PwField value={passwordForm.confirm_password} show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                        onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} placeholder="Confirm password" />
                      {pwMatch && <p className="text-[10px] text-emerald-500 font-bold mt-1.5 flex items-center gap-1"><CheckCircle size={10} /> Passwords match</p>}
                      {pwMismatch && <p className="text-[10px] text-rose-500 font-bold mt-1.5">✗ Passwords don't match</p>}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-5 pt-4 border-t border-zinc-100">
                  <button onClick={handleResetPassword} disabled={passwordLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-100 hover:bg-violet-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {passwordLoading ? <Spin /> : <><Shield size={14} /><span>Reset Password</span></>}
                  </button>
                </div>
              </SectionCard>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}