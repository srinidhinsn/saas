// import React, { useState, useRef } from "react";
// import { toast } from "react-toastify";
// import userServicesPort from "../Backend_Port_Files/UserServices";
// import { useParams } from "react-router-dom";

// export default function UserProfileForm() {
//   const { clientId } = useParams();
//   const [form, setForm] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     phone: "",
//     dob: "",
//     gender: "",
//     address: "",
//     bio: "",
//     image: "",
//   });
//   const [imagePreview, setImagePreview] = useState("");
//   const [loading, setLoading] = useState(false);
//   const fileInputRef = useRef();

//   const handleChange = (e) =>
//     setForm({ ...form, [e.target.name]: e.target.value });

//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (ev) => {
//         setImagePreview(ev.target.result);
//         setForm((prev) => ({ ...prev, image: ev.target.result }));
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     const payload = {
//       client_id: clientId,
//       ...form,
//     };

//     try {
//       const res = await userServicesPort.post(
//         `/${clientId}/users/person-details?client_id=${clientId}`,
//         payload
//       );
//       toast.success(res.data.message || "Profile saved!");
//       setForm({
//         first_name: "",
//         last_name: "",
//         email: "",
//         phone: "",
//         dob: "",
//         gender: "",
//         address: "",
//         bio: "",
//         image: "",
//       });
//       setImagePreview("");
//       fileInputRef.current.value = null;
//     } catch (err) {
//       const detail = err?.response?.data?.detail;
//       toast.error(detail || "Failed to save user profile");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const triggerUpload = () => fileInputRef.current.click();

//   return (
//     <div className="container">
//       <div className="form-card">
//         <h2>User Details</h2>
//         <form className="user-form" onSubmit={handleSubmit}>
//           {/* Profile Image */}
//           <div className="profile-img-section">
//             <img
//               src={
//                 imagePreview ||
//                 "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23f3f4f6'/%3E%3Cpath d='M60 55c-8.284 0-15-6.716-15-15s6.716-15 15-15 15 6.716 15 15-6.716 15-15 15zm0-25c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10z' fill='%23d1d5db'/%3E%3Cpath d='M85 85c0-13.807-11.193-25-25-25s-25 11.193-25 25' fill='none' stroke='%23d1d5db' stroke-width='2'/%3E%3C/svg%3E"
//               }
//               alt="Profile Preview"
//               className="profile-image-preview"
//               onClick={triggerUpload}
//             />
//             <div className="upload-area" onClick={triggerUpload}>
//               <svg
//                 className="upload-icon"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth="2"
//                   d="M12 6v6m0 0v6m0-6h6m-6 0H6"
//                 />
//               </svg>
//               <p className="upload-text">
//                 Click to upload profile image <br />
//                 (PNG, JPG up to 5MB)
//               </p>
//             </div>
//             <input
//               type="file"
//               accept="image/*"
//               className="hidden-input"
//               ref={fileInputRef}
//               onChange={handleImageChange}
//             />
//           </div>

//           {/* Name */}
//           <div className="form-columns">
//             <div className="form-group">
//               <label htmlFor="first_name">First Name</label>
//               <input
//                 type="text"
//                 name="first_name"
//                 id="first_name"
//                 required
//                 value={form.first_name}
//                 onChange={handleChange}
//                 placeholder="Enter first name"
//               />
//             </div>
//             <div className="form-group">
//               <label htmlFor="last_name">Last Name</label>
//               <input
//                 type="text"
//                 name="last_name"
//                 id="last_name"
//                 required
//                 value={form.last_name}
//                 onChange={handleChange}
//                 placeholder="Enter last name"
//               />
//             </div>
//           </div>

//           {/* Email + Phone */}
//           <div className="form-columns">
//             <div className="form-group">
//               <label htmlFor="email">Email Address</label>
//               <input
//                 type="email"
//                 name="email"
//                 id="email"
//                 required
//                 value={form.email}
//                 onChange={handleChange}
//                 placeholder="Enter email address"
//               />
//             </div>
//             <div className="form-group">
//               <label htmlFor="phone">Phone Number</label>
//               <input
//                 type="tel"
//                 name="phone"
//                 id="phone"
//                 value={form.phone}
//                 onChange={handleChange}
//                 placeholder="Enter phone number"
//               />
//             </div>
//           </div>

//           {/* DOB + Gender */}
//           <div className="form-columns">
//             <div className="form-group">
//               <label htmlFor="dob">Date of Birth</label>
//               <input
//                 type="date"
//                 name="dob"
//                 id="dob"
//                 value={form.dob}
//                 onChange={handleChange}
//               />
//             </div>
//             <div className="form-group">
//               <label htmlFor="gender">Gender</label>
//               <select
//                 name="gender"
//                 id="gender"
//                 value={form.gender}
//                 onChange={handleChange}
//               >
//                 <option value="">Select gender</option>
//                 <option value="male">Male</option>
//                 <option value="female">Female</option>
//                 <option value="other">Other</option>
//                 <option value="prefer-not-to-say">
//                   Prefer not to say
//                 </option>
//               </select>
//             </div>
//           </div>

//           {/* Address */}
//           <div className="form-group">
//             <label htmlFor="address">Address</label>
//             <textarea
//               name="address"
//               id="address"
//               rows="3"
//               value={form.address}
//               onChange={handleChange}
//               placeholder="Enter full address"
//             />
//           </div>

//           {/* Bio */}
//           <div className="form-group">
//             <label htmlFor="bio">Bio</label>
//             <textarea
//               name="bio"
//               id="bio"
//               rows="4"
//               value={form.bio}
//               onChange={handleChange}
//               placeholder="Tell us about yourself..."
//             />
//           </div>

//           <div className="form-actions">
//             <button type="submit" disabled={loading}>
//               {loading ? "Saving..." : "Save Profile"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }




//============================================================================================================================================//
//============================================================================================================================================//
//============================================================================================================================================//
//============================================================================================================================================//
//============================================================================================================================================//
//============================================================================================================================================//


// import React, { useState, useEffect } from "react";
// import { toast } from "react-toastify";
// import userServicesPort from "../Backend_Port_Files/UserServices";
// import { useParams } from "react-router-dom";
// import { FaEdit, FaCheckCircle } from "react-icons/fa";

// export default function UserProfileForm() {
//   const { clientId } = useParams();
//   const [form, setForm] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     phone: "",
//     dob: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [editMode, setEditMode] = useState({});
//   const [profileSaved, setProfileSaved] = useState(false);
//   const token = localStorage.getItem("access_token")
//   // Fetch user data
//   useEffect(() => {
//     fetchProfile();
//     // eslint-disable-next-line
//   }, [clientId, profileSaved]);

//   const fetchProfile = async () => {
//     try {
//       const res = await userServicesPort.get(
//         `/${clientId}/users/person-details`, {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       }
//       );
//       if (res.data && res.data.data) {
//         setForm(res.data.data);
//         setProfileSaved(true);
//       }
//     } catch (err) {
//       // no profile exists yet
//     }
//   };

//   const handleChange = (e) =>
//     setForm({ ...form, [e.target.name]: e.target.value });

//   const handleEdit = (field) => setEditMode({ ...editMode, [field]: true });

//   const handleSaveEdit = (field) => setEditMode({ ...editMode, [field]: false });

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const res = await userServicesPort.post(
//         `/${clientId}/users/person-details`,
//         form, {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       }
//       );
//       toast.success(res.data.message || "Profile saved!");
//       setProfileSaved(true);
//       setEditMode({});
//     } catch (err) {
//       const detail = err?.response?.data?.detail;
//       toast.error(detail || "Failed to save user profile");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderField = (field, label, type = "text") => (
//     <div className="form-group">
//       <label htmlFor={field}>{label}</label>
//       <div className="profile-field-row">
//         {profileSaved && !editMode[field] ? (
//           <>
//             <span className="profile-text">{form[field] || "Not set"}</span>
//             <FaEdit
//               className="edit-icon"
//               title="Edit"
//               onClick={() => handleEdit(field)}
//             />
//           </>
//         ) : (
//           <>
//             <input
//               type={type}
//               name={field}
//               id={field}
//               required={field === "first_name" || field === "last_name" || field === "email"}
//               value={form[field] || ""}
//               onChange={handleChange}
//               placeholder={`Enter ${label.toLowerCase()}`}
//             />
//             {editMode[field] && (
//               <FaCheckCircle
//                 className="save-icon"
//                 title="Save"
//                 onClick={() => handleSaveEdit(field)}
//               />
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );

//   return (
//     <div className="container profile-container">
//       <div className="form-card profile-card">
//         <h2>User Profile</h2>
//         <form className="user-form" onSubmit={handleSubmit}>
//           <div className="form-columns">
//             {renderField("first_name", "First Name")}
//             {renderField("last_name", "Last Name")}
//           </div>

//           <div className="form-columns">
//             {renderField("email", "Email Address", "email")}
//             {renderField("phone", "Phone Number", "tel")}
//           </div>

//           {renderField("dob", "Date of Birth", "date")}

//           <div className="form-actions">
//             <button type="submit" disabled={loading}>
//               {profileSaved
//                 ? loading
//                   ? "Updating..."
//                   : "Update Profile"
//                 : loading
//                   ? "Saving..."
//                   : "Save Profile"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }


// ===================================================================================================================================== 
// ===================================================================================================================================== 
// ===================================================================================================================================== 



// import React, { useState, useEffect } from "react";
// import { FaEdit, FaCheckCircle } from "react-icons/fa";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import userServicesPort from "../Backend_Port_Files/UserServices";

// const FIELD_MAP = [
//   { field: "first_name", label: "First Name", type: "text" },
//   { field: "last_name", label: "Last Name", type: "text" },
//   { field: "email", label: "Email", type: "email" },
//   { field: "phone", label: "Phone", type: "tel" },
//   { field: "dob", label: "Date of Birth", type: "date" },
// ];

// export default function UserProfileForm() {
//   const { clientId } = useParams();
//   const [form, setForm] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     phone: "",
//     dob: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [editField, setEditField] = useState("");
//   const [profileSaved, setProfileSaved] = useState(false);
//   const [lastUpdated, setLastUpdated] = useState("Never updated");
//   const token = localStorage.getItem("access_token");

//   useEffect(() => {
//     fetchProfile();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [clientId, profileSaved]);

//   const fetchProfile = async () => {
//     try {
//       const res = await userServicesPort.get(
//         `/${clientId}/users/person-details`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (res.data && res.data.data && res.data.data.person) {
//         const p = res.data.data.person;
//         setForm({
//           first_name: p.first_name || "",
//           last_name: p.last_name || "",
//           email: p.email || "",
//           phone: p.phone || "",
//           dob: p.dob || "",
//         });
      
      
//         setProfileSaved(true);
//         setLastUpdated(
//           "Updated at " +
//             new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//         );
//       }
//     } catch (err) {
//       setProfileSaved(false);
//       setLastUpdated("Never updated");
//     }
//   };

//   const handleChange = (e) =>
//     setForm({ ...form, [e.target.name]: e.target.value });

//   const handleEdit = (field) => setEditField(field);

//   const handleSaveEdit = (field, value) => {
//     setForm({ ...form, [field]: value });
//     setEditField("");
//     setLastUpdated(
//       "Updated at " +
//         new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//     );
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const payload = { ...form };
//       const res = await userServicesPort.post(
//         `/${clientId}/users/person-details`,
//         payload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       toast.success(res.data.message || "Profile saved!");
//       setProfileSaved(true);
//       setEditField("");
//       setLastUpdated(
//         "Updated at " +
//           new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//       );
//     } catch (err) {
//       toast.error("Failed to save user profile");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Modal component for editing
//   const EditModal = ({ field, type, value, onSave, onCancel }) => {
//     const [localValue, setLocalValue] = useState(value);

//     return (
//       <div className="edit-modal-overlay" onClick={onCancel}>
//         <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
//           <h3 className="edit-modal-title">
//             Edit {FIELD_MAP.find((f) => f.field === field)?.label}
//           </h3>
//           {type === "textarea" ? (
//             <textarea
//               value={localValue}
//               onChange={(e) => setLocalValue(e.target.value)}
//               rows={3}
//               autoFocus
//             />
//           ) : (
//             <input
//               type={type}
//               value={localValue}
//               onChange={(e) => setLocalValue(e.target.value)}
//               autoFocus
//             />
//           )}
//           <div className="edit-modal-actions">
//             <button type="button" className="btn" onClick={() => onSave(field, localValue)}>
//               Save
//             </button>
//             <button type="button" className="btn cancel" onClick={onCancel}>
//               Cancel
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="Profile-page-Container">
//       <div className="profile-page">
//         <div className="profile-header">
//           <div className="profile-header-left">
//             <div className="profile-avatar">
//               <span className="profile-avatar-icon">
//                 <FaCheckCircle size={28} />
//               </span>
//             </div>
//             <div>
//               <h1 className="profile-title">Profile Settings</h1>
//               <p className="profile-subtitle">Update your personal information</p>
//             </div>
//           </div>
//           <div className="profile-header-right">
//             <span className="profile-last-updated">{lastUpdated}</span>
//           </div>
//         </div>
//         <form className="profile-card-grid" onSubmit={handleSubmit}>
//           {FIELD_MAP.map(({ field, label, type }) => (
//             <div key={field} className="profile-card card-hover">
//               <div className="profile-card-header">
//                 <span className="profile-card-label">{label}</span>
//                 <button
//                   type="button"
//                   className="edit-btn"
//                   onClick={() => handleEdit(field)}
//                 >
//                   <FaEdit />
//                   Edit
//                 </button>
//               </div>
//               <div className="profile-card-value">
//                 <span>{form[field] ? form[field] : "Not set"}</span>
//               </div>
//               {editField === field && (
//                 <EditModal
//                   field={field}
//                   type={type}
//                   value={form[field] || ""}
//                   onSave={handleSaveEdit}
//                   onCancel={() => setEditField("")}
//                 />
//               )}
//             </div>
//           ))}
//           <div className="profile-actions">
//             <button type="submit" className="btn" disabled={loading}>
//               {profileSaved
//                 ? loading
//                   ? "Updating..."
//                   : "Update Profile"
//                 : loading
//                 ? "Saving..."
//                 : "Save Profile"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }



// import React, { useState, useEffect } from "react";
// import { FaEdit, FaCheckCircle } from "react-icons/fa";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import userServicesPort from "../Backend_Port_Files/UserServices";

// const FIELD_MAP = [
//   { field: "first_name", label: "First Name", type: "text" },
//   { field: "last_name", label: "Last Name", type: "text" },
//   { field: "email", label: "Email", type: "email" },
//   { field: "phone", label: "Phone", type: "tel" },
//   { field: "dob", label: "Date of Birth", type: "date" },
// ];

// export default function UserProfileForm() {
//   const { clientId } = useParams();
//   const token = localStorage.getItem("access_token");

//   const [form, setForm] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     phone: "",
//     dob: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [editField, setEditField] = useState("");
//   const [profileSaved, setProfileSaved] = useState(false);
//   const [lastUpdated, setLastUpdated] = useState("Never updated");

//   useEffect(() => {
//     // Fetch current user person details
//     const fetchProfile = async () => {
//       try {
//         const res = await userServicesPort.get(`/${clientId}/users/person-details`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data && res.data.data && res.data.data.person) {
//           const p = res.data.data.person;
//           setForm({
//             first_name: p.first_name || "",
//             last_name: p.last_name || "",
//             email: p.email || "",
//             phone: p.phone || "",
//             dob: p.dob || "",
//           });
//           setProfileSaved(true);
//           setLastUpdated(
//             "Updated at " +
//               new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//           );
//         }
//       } catch (err) {
//         setProfileSaved(false);
//         setLastUpdated("Never updated");
//         toast.error("Failed to fetch profile details");
//       }
//     };
//     if (clientId && token) fetchProfile();
//   }, [clientId, profileSaved, token]);

//   const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

//   const handleEdit = (field) => setEditField(field);

//   const handleSaveEdit = (field, value) => {
//     setForm({ ...form, [field]: value });
//     setEditField("");
//     setLastUpdated(
//       "Updated at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//     );
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const payload = { ...form };
//       const res = await userServicesPort.post(`/${clientId}/users/person-details`, payload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       toast.success(res.data.data?.message || "Profile saved!");
//       setProfileSaved(true);
//       setEditField("");
//       setLastUpdated(
//         "Updated at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//       );
//     } catch (err) {
//       toast.error("Failed to save user profile");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Modal component for editing
//   const EditModal = ({ field, type, value, onSave, onCancel }) => {
//     const [localValue, setLocalValue] = useState(value);

//     return (
//       <div className="edit-modal-overlay" onClick={onCancel}>
//         <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
//           <h3 className="edit-modal-title">
//             Edit {FIELD_MAP.find((f) => f.field === field)?.label}
//           </h3>
//           {type === "textarea" ? (
//             <textarea
//               value={localValue}
//               onChange={(e) => setLocalValue(e.target.value)}
//               rows={3}
//               autoFocus
//             />
//           ) : (
//             <input
//               type={type}
//               value={localValue}
//               onChange={(e) => setLocalValue(e.target.value)}
//               autoFocus
//             />
//           )}
//           <div className="edit-modal-actions">
//             <button type="button" className="btn" onClick={() => onSave(field, localValue)}>
//               Save
//             </button>
//             <button type="button" className="btn cancel" onClick={onCancel}>
//               Cancel
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="Profile-page-Container">
//       <div className="profile-page">
//         <div className="profile-header">
//           <div className="profile-header-left">
//             <div className="profile-avatar">
//               <span className="profile-avatar-icon">
//                 <FaCheckCircle size={28} />
//               </span>
//             </div>
//             <div>
//               <h1 className="profile-title">Profile Settings</h1>
//               <p className="profile-subtitle">Update your personal information</p>
//             </div>
//           </div>
//           <div className="profile-header-right">
//             <span className="profile-last-updated">{lastUpdated}</span>
//           </div>
//         </div>
//         <form className="profile-card-grid" onSubmit={handleSubmit}>
//           {FIELD_MAP.map(({ field, label, type }) => (
//             <div key={field} className="profile-card card-hover">
//               <div className="profile-card-header">
//                 <span className="profile-card-label">{label}</span>
//                 <button type="button" className="edit-btn" onClick={() => handleEdit(field)}>
//                   <FaEdit />
//                   Edit
//                 </button>
//               </div>
//               <div className="profile-card-value">
//                 <span>{form[field] ? form[field] : "Not set"}</span>
//               </div>
//               {editField === field && (
//                 <EditModal
//                   field={field}
//                   type={type}
//                   value={form[field] || ""}
//                   onSave={handleSaveEdit}
//                   onCancel={() => setEditField("")}
//                 />
//               )}
//             </div>
//           ))}
//           <div className="profile-actions">
//             <button type="submit" className="btn" disabled={loading}>
//               {profileSaved ? (loading ? "Updating..." : "Update Profile") : loading ? "Saving..." : "Save Profile"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }



// ============================



import React, { useState, useEffect } from "react";
import { FaUserEdit } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import userServicesPort from "../Backend_Port_Files/UserServices";

const FIELD_MAP = [
  { field: "first_name", label: "Full Name", type: "text" },
  { field: "last_name", label: "Nick Name", type: "text" },
  { field: "email", label: "Email", type: "email" },
  { field: "phone", label: "Phone", type: "tel" },
  { field: "dob", label: "Date of Birth", type: "date" },
];

export default function UserProfileForm() {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    dob: "",
  });
  const [loading, setLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await userServicesPort.get(`/${clientId}/users/person-details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.data?.person) {
          const p = res.data.data.person;
          setForm({
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userServicesPort.post(`/${clientId}/users/person-details`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.data?.message || "Profile saved!");
      setProfileSaved(true);
    } catch {
      toast.error("Failed to save user profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mpc-backdrop">
      <div className="mpc-card">
        <div className="mpc-profile-header">
          <img
            src="" // or your user's avatar
            alt="avatar"
            className="mpc-avatar"
          />
          <div>
            <div className="mpc-name">{`${form.first_name || ""} ${form.last_name || ""}`.trim() || "Your name"}</div>
            <div className="mpc-email">{form.email || "your@email.com"}</div>
          </div>
          <button className="mpc-edit-btn" disabled>
            <FaUserEdit /> Edit
          </button>
        </div>
        <form className="mpc-details-grid" onSubmit={handleSubmit}>
          <div className="mpc-field-group">
            <label className="mpc-label">Full Name</label>
            <input
              className="mpc-input"
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleChange}
              placeholder="Your First Name"
            />
          </div>
          <div className="mpc-field-group">
            <label className="mpc-label">Nick Name</label>
            <input
              className="mpc-input"
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Your Nick Name"
            />
          </div>
          <div className="mpc-field-group">
            <label className="mpc-label">Email</label>
            <input
              className="mpc-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Your Email"
            />
          </div>
          <div className="mpc-field-group">
            <label className="mpc-label">Phone</label>
            <input
              className="mpc-input"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="Your Phone"
            />
          </div>
          <div className="mpc-field-group">
            <label className="mpc-label">Date of Birth</label>
            <input
              className="mpc-input"
              name="dob"
              type="date"
              value={form.dob}
              onChange={handleChange}
              placeholder="Your Birthday"
            />
          </div>
          <div className="mpc-actions">
            <button type="submit" className="mpc-btn" disabled={loading}>
              {loading ? "Updating..." : profileSaved ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
