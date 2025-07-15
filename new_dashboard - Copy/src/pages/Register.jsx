// import React, { useState } from "react";
// import axios from "axios";
// import "../styles/Register.css";
// import { useNavigate } from "react-router-dom";

// export default function Register() {
//     const navigate = useNavigate();
//     const [form, setForm] = useState({
//         name: "",
//         company_name: "",
//         email: "",
//         password: "",
//         confirm_password: "",
//         contact_number: ""
//     });

//     const [error, setError] = useState("");

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleRegister = async (e) => {
//         e.preventDefault();
//         setError("");

//         if (form.password !== form.confirm_password) {
//             setError("Passwords do not match.");
//             return;
//         }

//         try {
//             const response = await axios.post("http://localhost:9000/clients", form);

//             const { client_id, client_code } = response.data;

//             localStorage.setItem("clientId", client_id);
//             localStorage.setItem("clientCode", client_code);

//             alert(`🎉 Registered! Your Client Code: ${client_code}`);
//             navigate("/login");
//         } catch (err) {
//             console.error("❌ Registration failed:", err?.response?.data);

//             const detail = err?.response?.data?.detail;
//             if (Array.isArray(detail)) {
//                 setError(detail[0]?.msg || "Invalid input.");
//             } else {
//                 setError(detail || "Registration failed.");
//             }
//         }
//     };

//     return (
//         <div className="Register-pages">
//             <div className="container">
//                 <div className="form-container">
//                     <form onSubmit={handleRegister}>
//                         <h1>Register</h1>

//                         <input
//                             type="text"
//                             placeholder="Full Name"
//                             name="name"
//                             value={form.name}
//                             onChange={handleChange}
//                             required
//                         />
//                         <input
//                             type="text"
//                             placeholder="Company Name"
//                             name="company_name"
//                             value={form.company_name}
//                             onChange={handleChange}
//                             required
//                         />
//                         <input
//                             type="email"
//                             placeholder="Email"
//                             name="email"
//                             value={form.email}
//                             onChange={handleChange}
//                             required
//                         />
//                         <input
//                             type="text"
//                             placeholder="Contact Number"
//                             name="contact_number"
//                             value={form.contact_number}
//                             onChange={handleChange}
//                             required
//                         />
//                         <input
//                             type="password"
//                             placeholder="Password"
//                             name="password"
//                             value={form.password}
//                             onChange={handleChange}
//                             required
//                         />
//                         <input
//                             type="password"
//                             placeholder="Confirm Password"
//                             name="confirm_password"
//                             value={form.confirm_password}
//                             onChange={handleChange}
//                             required
//                         />

//                         {error && (
//                             <p className="error">
//                                 {typeof error === "string" ? error : error.msg || "An error occurred."}
//                             </p>
//                         )}

//                         <button type="submit">Sign Up</button>
//                         <p className="login-link">
//                             Already registered? <a href="/login">Log in here</a>
//                         </p>
//                     </form>
//                 </div>
//             </div>
//         </div>
//     );
// }

//

// import "../styles/Register.css";
// import React, { useState } from "react";
// import axios from "axios";
// import { useNavigate, useParams } from "react-router-dom";

// export default function Register() {
//     const navigate = useNavigate();
//     const { clientId } = useParams();

//     const [form, setForm] = useState({
//         username: "",
//         password: "",
//         confirm_password: "",
//         role: "",
//         grants: []
//     });

//     const [error, setError] = useState("");

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleGrantChange = (e) => {
//         const { value, checked } = e.target;
//         setForm((prev) => {
//             const grants = checked
//                 ? [...prev.grants, value]
//                 : prev.grants.filter((g) => g !== value);
//             return { ...prev, grants };
//         });
//     };

//     const handleRegister = async (e) => {
//         e.preventDefault();
//         setError("");

//         if (form.password !== form.confirm_password) {
//             setError("Passwords do not match.");
//             return;
//         }

//         try {
//             const payload = {
//                 username: form.username,
//                 password: form.password,
//                 roles: [form.role],
//                 grants: form.grants
//             };

//             const response = await axios.post(
//                 `http://localhost:8000/saas/${clientId}/users/register`,
//                 payload
//             );

//             alert("🎉 Registered successfully!");
//             navigate(`/saas/${clientId}/login`);
//         } catch (err) {
//             console.error("❌ Registration failed:", err?.response?.data);
//             const detail = err?.response?.data?.detail;
//             setError(Array.isArray(detail) ? detail[0]?.msg : detail || "Registration failed.");
//         }
//     };

//     return (
//         <div className="Register-pages">
//             <div className="container">
//                 <div className="form-container">
//                     <form onSubmit={handleRegister}>
//                         <h1>Register</h1>

//                         <input
//                             type="text"
//                             placeholder="Username"
//                             name="username"
//                             value={form.username}
//                             onChange={handleChange}
//                             required
//                         />
//                         <input
//                             type="password"
//                             placeholder="Password"
//                             name="password"
//                             value={form.password}
//                             onChange={handleChange}
//                             required
//                         />
//                         <input
//                             type="password"
//                             placeholder="Confirm Password"
//                             name="confirm_password"
//                             value={form.confirm_password}
//                             onChange={handleChange}
//                             required
//                         />

//                         {/* Role Dropdown */}
//                         <label htmlFor="role">Role:</label>
//                         <select
//                             name="role"
//                             value={form.role}
//                             onChange={handleChange}
//                             required
//                             className="form-input"
//                         >
//                             <option value="">Select Role</option>
//                             <option value="admin">Admin</option>
//                             <option value="waiter">Waiter</option>
//                         </select>

//                         {/* Grants Checkboxes */}
//                         <label>Grants:</label>
//                         <div className="checkbox-group">
//                             <label>
//                                 <input
//                                     type="checkbox"
//                                     value="invoice"
//                                     checked={form.grants.includes("invoice")}
//                                     onChange={handleGrantChange}
//                                 />
//                                 Invoice
//                             </label>
//                             <label>
//                                 <input
//                                     type="checkbox"
//                                     value="inventory"
//                                     checked={form.grants.includes("inventory")}
//                                     onChange={handleGrantChange}
//                                 />
//                                 Inventory
//                             </label>
//                             <label>
//                                 <input
//                                     type="checkbox"
//                                     value="billing"
//                                     checked={form.grants.includes("billing")}
//                                     onChange={handleGrantChange}
//                                 />
//                                 Billing
//                             </label>
//                         </div>

//                         {error && (
//                             <p className="error">
//                                 {typeof error === "string" ? error : error.msg || "An error occurred."}
//                             </p>
//                         )}

//                         <button type="submit">Sign Up</button>
//                         <p className="login-link">
//                             Already registered? <a href={`/saas/${clientId}/login`}>Log in here</a>
//                         </p>
//                     </form>
//                 </div>
//             </div>
//         </div>
//     );
// }



// =========================================================================================================================================== //


import "../styles/Register.css";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";

export default function Register() {
    const navigate = useNavigate();
    const { clientId } = useParams();

    const [form, setForm] = useState({
        username: "",
        password: "",
        confirm_password: "",
        role: "",
        grants: []
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "role") {
            const defaultGrants =
                value === "admin"
                    ? ['invoice', 'inventory', 'billing', 'tables', 'order', 'menu', 'users', 'document']
                    : [];

            setForm((prev) => ({
                ...prev,
                role: value,
                grants: defaultGrants,
            }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };


    const handleGrantChange = (e) => {
        const { value, checked } = e.target;
        setForm((prev) => {
            const grants = checked
                ? [...prev.grants, value]
                : prev.grants.filter((g) => g !== value);
            return { ...prev, grants };
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirm_password) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const payload = {
                username: form.username,
                password: form.password,
                roles: [form.role],
                grants: form.grants
            };

            const response = await axios.post(
                `http://localhost:8000/saas/${clientId}/users/register`,
                payload
            );

            alert("\uD83C\uDF89 Registered successfully!");
            navigate(`/saas/${clientId}/login`);
        } catch (err) {
            console.error("\u274C Registration failed:", err?.response?.data);
            const detail = err?.response?.data?.detail;
            setError(Array.isArray(detail) ? detail[0]?.msg : detail || "Registration failed.");
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="avatar-circle">
                    <FaUser className="avatar-icon" />
                </div>
                <form onSubmit={handleRegister}>
                    <div className="input-group">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            placeholder="Username"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            name="confirm_password"
                            value={form.confirm_password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <label htmlFor="role">Role:</label>
                    <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        required
                        className="form-input"
                    >
                        <option value="">Select Role</option>
                        <option value="admin">Admin</option>
                        <option value="waiter">Waiter</option>
                    </select>

                    <label>Grants Service:</label>
                    <div className="checkbox-group">
                        {['invoice', 'inventory', 'billing', 'tables'].map((g) => (
                            <label key={g}>
                                <input
                                    type="checkbox"
                                    value={g}
                                    checked={form.grants.includes(g)}
                                    onChange={handleGrantChange}
                                />
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                            </label>
                        ))}
                    </div>

                    {error && (
                        <p className="error">
                            {typeof error === "string" ? error : error.msg || "An error occurred."}
                        </p>
                    )}

                    <button type="submit" className="login-button">Sign Up</button>
                    <p className="login-link">
                        Already registered? <a href={`/saas/${clientId}/login`}>Log in here</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
