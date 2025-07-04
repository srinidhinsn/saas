// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import "../styles/UpdateProfile.css";

// export default function UpdateProfile() {
//     const navigate = useNavigate();
//     const [form, setForm] = useState({});
//     const [loading, setLoading] = useState(true);
//     const clientId = localStorage.getItem("clientId");

//     useEffect(() => {
//         async function fetchClient() {
//             try {
//                 const res = await axios.get(`http://localhost:9000/clients/${clientId}`);
//                 setForm(res.data);
//                 setLoading(false);
//             } catch (err) {
//                 console.error("Failed to fetch client:", err);
//                 setLoading(false);
//             }
//         }

//         if (clientId) fetchClient();
//         else navigate("/login");
//     }, [clientId, navigate]);

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleUpdate = async (e) => {
//         e.preventDefault();
//         try {
//             await axios.put(`http://localhost:9000/clients/${clientId}`, form);
//             alert("✅ Profile updated successfully!");
//         } catch (err) {
//             console.error("Update failed:", err);
//         }
//     };

//     const handleLogout = () => {
//         localStorage.clear();
//         navigate("/login");
//     };

//     if (loading) return <div className="profile-loading">Loading...</div>;

//     return (
//         <div className="profile-wrapper">
//             <div className="profile-sidebar">
//                 <div className="profile-pic-container">
//                     <img src="/default-avatar.png" alt="profile" className="profile-img" />
//                     <label htmlFor="upload-profile-pic" className="edit-icon">✎</label>
//                     <input type="file" id="upload-profile-pic" hidden />
//                 </div>
//                 <h3 className="profile-name">{form.name} {form.last_name}</h3>
//                 <p className="profile-role">Admin</p>
//                 <nav className="profile-menu">
//                     <button className="active">Personal Information</button>
//                     <button>Login & Password</button>
//                     <button onClick={handleLogout}>Log Out</button>
//                 </nav>
//             </div>
//             <div className="profile-main">
//                 <h2>Personal Information</h2>
//                 <form onSubmit={handleUpdate} className="profile-form">
//                     <div className="gender-select">
//                         <label><input type="radio" name="gender" value="Male" checked={form.gender === "Male"} onChange={handleChange} /> Male</label>
//                         <label><input type="radio" name="gender" value="Female" checked={form.gender === "Female"} onChange={handleChange} /> Female</label>
//                         <label><input type="radio" name="gender" value="Other" checked={form.gender === "Other"} onChange={handleChange} /> Other</label>
//                     </div>
//                     <div className="form-grid">
//                         {[
//                             ["name", "First Name"],
//                             ["last_name", "Last Name"],
//                             ["company_name", "Company Name"],
//                             ["email", "Email"],
//                             ["dob", "Date of Birth", "date"],
//                             ["contact_number", "Contact Number"],
//                             ["company_number", "Company Number"],
//                             ["company_address", "Company Address"],
//                             ["client_address", "Client Address"],
//                             ["fssai_number", "FSSAI Number"],
//                             ["gst_number", "GST Number"],
//                             ["pan_number", "PAN Number"],
//                             ["aadhar_number", "Aadhar Number"],
//                             ["license_number", "License Number"],
//                             ["food_license_number", "Food License Number"],
//                             ["website", "Website"],
//                             ["city", "City"],
//                             ["state", "State"],
//                             ["country", "Country"],
//                             ["password", "Password", "password"],
//                             ["confirm_password", "Confirm Password", "password"]
//                         ].map(([name, label, type = "text"]) => (
//                             <div key={name} className="form-field">
//                                 <label>{label}</label>
//                                 <input
//                                     type={type}
//                                     name={name}
//                                     placeholder={label}
//                                     value={form[name] || ""}
//                                     onChange={handleChange}
//                                 />
//                             </div>
//                         ))}

//                         <div className="form-field full">
//                             <label>Notes</label>
//                             <textarea
//                                 name="note"
//                                 placeholder="Add a note"
//                                 value={form.note || ""}
//                                 onChange={handleChange}
//                             />
//                         </div>
//                     </div>

//                     <div className="form-buttons">
//                         <button type="button" className="btn-discard">Discard Changes</button>
//                         <button type="submit" className="btn-save">Save Changes</button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// }




import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/UpdateProfile.css";
import { ThemeProvider } from '../ThemeChangerComponent/ThemeContext'

export default function UpdateProfile() {
    const navigate = useNavigate();
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const clientId = localStorage.getItem("clientId");

    useEffect(() => {
        async function fetchClient() {
            try {
                const res = await axios.get(`http://localhost:9000/clients/${clientId}`);
                setForm(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch client:", err);
                setLoading(false);
            }
        }

        if (clientId) fetchClient();
        else navigate("/login");
    }, [clientId, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:9000/clients/${clientId}`, form);
            alert("✅ Profile updated successfully!");
        } catch (err) {
            console.error("Update failed:", err);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    if (loading) return <div className="profile-loading">Loading...</div>;

    return (
        <div className="profile-wrapper">
            <div className="profile-sidebar">
                <div className="profile-pic-container">
                    <img src="/default-avatar.png" alt="profile" className="profile-img" />
                    <label htmlFor="upload-profile-pic" className="edit-icon">✎</label>
                    <input type="file" id="upload-profile-pic" hidden />
                </div>
                <h3 className="profile-name">{form.name} {form.last_name}</h3>
                <p className="profile-role">Admin</p>
                <nav className="profile-menu">
                    <button className="active">Personal Information</button>
                    <button onClick={handleLogout}>Log Out</button>
                </nav>
            </div>
            <div className="profile-main">
                <h2>Personal Information</h2>
                <form onSubmit={handleUpdate} className="profile-form">
                    <div className="gender-select">
                        <label><input type="radio" name="gender" value="Male" checked={form.gender === "Male"} onChange={handleChange} /> Male</label>
                        <label><input type="radio" name="gender" value="Female" checked={form.gender === "Female"} onChange={handleChange} /> Female</label>
                        <label><input type="radio" name="other" value="Female" checked={form.gender === "Other"} onChange={handleChange} /> Other</label>
                    </div>
                    <div className="form-grid">
                        {["name", "last_name", "email", "company_name", "contact_number", "dob", "company_number", "company_address", "client_address", "fssai_number", "gst_number", "pan_number", "aadhar_number", "license_number", "food_license_number", "website", "city", "state", "country", "password", "confirm_password"].map((field) => (
                            <div key={field} className="form-field">
                                <label>{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                                <input
                                    type={field.includes("password") ? "password" : field === "dob" ? "date" : "text"}
                                    name={field}
                                    placeholder={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    value={form[field] || ""}
                                    onChange={handleChange}
                                />
                            </div>
                        ))}

                        <div className="form-field full">
                            <label>Note</label>
                            <textarea
                                name="note"
                                placeholder="Add a note"
                                value={form.note || ""}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                    </div>

                    <div className="form-buttons">
                        <button type="button" className="btn-discard">Discard Changes</button>
                        <button type="submit" className="btn-save">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}




