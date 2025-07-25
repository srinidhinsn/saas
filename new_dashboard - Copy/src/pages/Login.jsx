// // import "../styles/Login.css";
// // import React, { useState } from "react";
// // import { useNavigate } from "react-router-dom";
// // import axios from "axios";

// // export default function Login() {
// //     const navigate = useNavigate();
// //     const [form, setForm] = useState({
// //         client_code: "",
// //         username: "",
// //         password: ""
// //     });

// //     const [error, setError] = useState("");

// //     const handleChange = (e) => {
// //         const { name, value } = e.target;
// //         setForm((prev) => ({ ...prev, [name]: value }));
// //     };

// //     const handleLogin = async (e) => {
// //         e.preventDefault();
// //         setError("");

// //         try {
// //             const response = await axios.post("http://localhost:9000/login", form);

// //             const { client_id, client_code, token, username } = response.data;

// //             localStorage.setItem("authToken", token || "");
// //             localStorage.setItem("clientId", client_id);
// //             localStorage.setItem("clientCode", client_code);
// //             localStorage.setItem("username", username || "");

// //             alert("✅ Login successful");
// //             navigate("/profile");
// //         } catch (err) {
// //             console.error("Login error:", err?.response?.data);
// //             const detail = err?.response?.data?.detail;
// //             const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
// //             setError(msg || "Invalid client code or credentials");
// //         }
// //     };

// //     return (
// //         <div className="Register-pages">
// //             <div className="container">
// //                 <div className="form-container">
// //                     <form onSubmit={handleLogin}>
// //                         <h1>Login</h1>

// //                         <input
// //                             type="text"
// //                             name="client_code"
// //                             placeholder="Client Code"
// //                             value={form.client_code}
// //                             onChange={handleChange}
// //                             required
// //                         />

// //                         <input
// //                             type="text"
// //                             name="username"
// //                             placeholder="Username"
// //                             value={form.username}
// //                             onChange={handleChange}
// //                             required
// //                         />

// //                         <input
// //                             type="password"
// //                             name="password"
// //                             placeholder="Password"
// //                             value={form.password}
// //                             onChange={handleChange}
// //                             required
// //                         />

// //                         {error && <p className="error">{error}</p>}

// //                         <button type="submit">Login</button>

// //                         <p className="login-link">
// //                             Don’t have an account? <a href="/register">Register</a>
// //                         </p>

// //                         <button
// //                             type="button"
// //                             className="ghost"
// //                             onClick={() => navigate("/forgot")}
// //                         >
// //                             Forgot Password?
// //                         </button>
// //                     </form>
// //                 </div>
// //             </div>
// //         </div>
// //     );
// // }


// // //




// import "../styles/Login.css";
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";



// export default function Login() {
//     const navigate = useNavigate();
//     const [form, setForm] = useState({
//         client_code: "",
//         username: "",
//         password: ""
//     });

//     const [error, setError] = useState("");

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleLogin = async (e) => {
//         e.preventDefault();
//         setError("");

//         const payload = {
//             username: form.username,
//             password: form.password
//         };

//         try {
//             const response = await axios.post(
//                 `http://localhost:8000/saas/${form.client_id}/users/login`,
//                 payload
//             );


//             const token = response.data.data.access_token;

//             // Decode token
//             const decoded = jwtDecode(token);

//             console.log("Decoded Token:", decoded);

//             // Extract client_id
//             const client_id = decoded.client_id;

//             // Store in localStorage
//             localStorage.setItem("access_token", token);
//             localStorage.setItem("client_id", client_id);



//             alert("✅ Login successful");
//             navigate("/profile");

//         } catch (err) {
//             console.error("Login error:", err?.response?.data);
//             const detail = err?.response?.data?.detail;
//             const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
//             setError(msg || "Invalid client code or credentials");
//         }
//     };


//     return (
//         <div className="Register-pages">
//             <div className="container">
//                 <div className="form-container">
//                     <form onSubmit={handleLogin}>
//                         <h1>Login</h1>

//                         <input
//                             type="text"
//                             name="client_code"
//                             placeholder="Client Code"
//                             value={form.client_code}
//                             onChange={handleChange}
//                         />

//                         <input
//                             type="text"
//                             name="username"
//                             placeholder="Username"
//                             value={form.username}
//                             onChange={handleChange}
//                             required
//                         />

//                         <input
//                             type="password"
//                             name="password"
//                             placeholder="Password"
//                             value={form.password}
//                             onChange={handleChange}
//                             required
//                         />

//                         {error && <p className="error">{error}</p>}

//                         <button type="submit">Login</button>

//                         <p className="login-link">
//                             Don’t have an account? <a href="/register">Register</a>
//                         </p>

//                         <button
//                             type="button"
//                             className="ghost"
//                             onClick={() => navigate("/forgot")}
//                         >
//                             Forgot Password?
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         </div>
//     );
// }


// //

// import "../styles/Login.css";
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";

// export default function Login() {
//     const navigate = useNavigate();
//     const [form, setForm] = useState({
//         client_code: "",
//         username: "",
//         password: ""
//     });

//     const [error, setError] = useState("");

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleLogin = async (e) => {
//         e.preventDefault();
//         setError("");

//         const payload = {
//             username: form.username,
//             password: form.password
//         };

//         try {
//             const response = await axios.post(
//                 `http://localhost:8000/saas/${form.client_code}/users/login`,
//                 payload
//             );

//             const token = response.data.data.access_token;
//             const decoded = jwtDecode(token);

//             const client_id = decoded.client_id;

//             // ✅ Save to localStorage
//             localStorage.setItem("access_token", token);
//             localStorage.setItem("clientId", client_id);
//             localStorage.setItem("username", decoded.username);

//             alert("✅ Login successful");

//             // ✅ Navigate to client-specific route
//             navigate(`/saas/${client_id}`);
//         } catch (err) {
//             console.error("Login error:", err?.response?.data);
//             const detail = err?.response?.data?.detail;
//             const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
//             setError(msg || "Invalid client code or credentials");
//         }
//     };

//     const dynamicBase = form.client_code ? `/saas/${form.client_code}` : "#";

//     return (
//         <div className="Register-pages">
//             <div className="container">
//                 <div className="form-container">
//                     <form onSubmit={handleLogin}>
//                         <h1>Login</h1>

//                         <input
//                             type="text"
//                             name="client_code"
//                             placeholder="Client Code"
//                             value={form.client_code}
//                             onChange={handleChange}
//                             required
//                         />

//                         <input
//                             type="text"
//                             name="username"
//                             placeholder="Username"
//                             value={form.username}
//                             onChange={handleChange}
//                             required
//                         />

//                         <input
//                             type="password"
//                             name="password"
//                             placeholder="Password"
//                             value={form.password}
//                             onChange={handleChange}
//                             required
//                         />

//                         {error && <p className="error">{error}</p>}

//                         <button type="submit">Login</button>

//                         <p className="login-link">
//                             Don’t have an account?{" "}
//                             <span
//                                 onClick={() => {
//                                     if (form.client_code) {
//                                         navigate(`/saas/${form.client_code}/register`);
//                                     } else {
//                                         setError("⚠️ Please enter Client Code before registering.");
//                                     }
//                                 }}
//                                 style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}
//                             >
//                                 Register
//                             </span>

//                         </p>


//                         <button
//                             type="button"
//                             className="ghost"
//                             onClick={() => {
//                                 if (form.client_code) {
//                                     navigate(`/saas/${form.client_code}/forgot`);
//                                 } else {
//                                     setError("⚠️ Please enter Client Code to continue.");
//                                 }
//                             }}
//                         >
//                             Forgot Password?
//                         </button>

//                     </form>
//                 </div>
//             </div>
//         </div>
//     );
// }


//


// //

// import "../styles/Login.css";
// import React, { useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";

// export default function Login() {
//     const navigate = useNavigate();
//     const { clientId } = useParams(); // ✅ get from URL
//     const [form, setForm] = useState({ username: "", password: "" });
//     const [error, setError] = useState("");

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleLogin = async (e) => {
//         e.preventDefault();
//         setError("");

//         if (!clientId) {
//             setError("⚠️ Client ID missing in URL.");
//             return;
//         }

//         const payload = {
//             username: form.username,
//             password: form.password
//         };

//         try {
//             const response = await axios.post(
//                 `http://localhost:8000/saas/${clientId}/users/login`,
//                 payload
//             );

//             const token = response.data.data.access_token;
//             const decoded = jwtDecode(token);

//             // ✅ Save to localStorage
//             localStorage.setItem("access_token", token);
//             localStorage.setItem("clientId", decoded.client_id);
//             localStorage.setItem("username", decoded.username);

//             alert("✅ Login successful");

//             navigate(`/saas/${clientId}/main/${token}`);

//         } catch (err) {
//             console.error("Login error:", err?.response?.data);
//             const detail = err?.response?.data?.detail;
//             const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
//             setError(msg || "Invalid credentials");
//         }
//     };

//     return (
//         <div className="Register-pages">
//             <div className="container">
//                 <div className="form-container">
//                     <form onSubmit={handleLogin}>
//                         <h1>Login</h1>

//                         <input
//                             type="text"
//                             name="username"
//                             placeholder="Username"
//                             value={form.username}
//                             onChange={handleChange}
//                             required
//                         />

//                         <input
//                             type="password"
//                             name="password"
//                             placeholder="Password"
//                             value={form.password}
//                             onChange={handleChange}
//                             required
//                         />

//                         {error && <p className="error">{error}</p>}

//                         <button type="submit">Login</button>

//                         <p className="login-link">
//                             Don’t have an account?{" "}
//                             <span
//                                 onClick={() => navigate(`/saas/${clientId}/register`)}
//                                 style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}
//                             >
//                                 Register
//                             </span>
//                         </p>

//                         <button
//                             type="button"
//                             className="ghost"
//                             onClick={() => navigate(`/saas/${clientId}/forgot`)}
//                         >
//                             Forgot Password?
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         </div>
//     );
// }


//
//

// import "../styles/Login.css";
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";

// export default function Login() {
//     const navigate = useNavigate();
//     const [form, setForm] = useState({ username: "", password: "" });
//     const [error, setError] = useState("");
//     const [loading, setLoading] = useState(false);

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleLogin = async (e) => {
//         e.preventDefault();
//         setError("");
//         setLoading(true);

//         try {
//             const clientRes = await axios.post(
//                 `http://localhost:8000/saas/demo/users/client-id-by-credentials`,
//                 {
//                     username: form.username,
//                     password: form.password
//                 }
//             );
//             const clientId = clientRes.data.client_id;


//             // Step 2: Login using real clientId
//             const loginRes = await axios.post(
//                 `http://localhost:8000/saas/${clientId}/users/login`,
//                 {
//                     username: form.username,
//                     password: form.password,
//                 }
//             );

//             const token = loginRes.data.data.access_token;
//             const decoded = jwtDecode(token);

//             localStorage.setItem("access_token", token);
//             localStorage.setItem("clientId", decoded.client_id);
//             localStorage.setItem("username", decoded.username);

//             alert("✅ Login successful");
//             navigate(`/saas/${clientId}/main/${token}`);
//         } catch (err) {
//             console.error("Login error:", err?.response?.data);
//             const msg = err?.response?.data?.detail;
//             setError(msg || "Invalid credentials");
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="Register-pages">
//             <div className="container">
//                 <div className="form-container">
//                     <form onSubmit={handleLogin}>
//                         <h1>Login</h1>

//                         <input
//                             type="text"
//                             name="username"
//                             placeholder="Username"
//                             value={form.username}
//                             onChange={handleChange}
//                             required
//                         />

//                         <input
//                             type="password"
//                             name="password"
//                             placeholder="Password"
//                             value={form.password}
//                             onChange={handleChange}
//                             required
//                         />

//                         {error && <p className="error">{error}</p>}

//                         <button type="submit" disabled={loading}>
//                             {loading ? "Logging in..." : "Login"}
//                         </button>
//                         <p className="login-link">
//                             Don’t have an account?{" "}
//                             <span
//                                 onClick={() => navigate("/saas/demo/register")}
//                                 style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}
//                             >
//                                 Register
//                             </span>
//                         </p>

//                         <button
//                             type="button"
//                             className="ghost"
//                             onClick={() => navigate("/saas/demo/forgot")}
//                         >
//                             Forgot Password?
//                         </button>

//                     </form>
//                 </div>
//             </div>
//         </div>
//     );
// }



// ======================================================================================================================= //

// import "../styles/Login.css";
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";
// import { FaUser, FaLock } from "react-icons/fa";
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';


// export default function Login() {
//     const navigate = useNavigate();
//     const [form, setForm] = useState({ username: "", password: "" });
//     const [error, setError] = useState("");
//     const [loading, setLoading] = useState(false);

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleLogin = async (e) => {
//         e.preventDefault();
//         setError("");
//         setLoading(true);

//         try {
//             const clientCode = form.clientCode;
//             const clientRes = await axios.post(
//                 `http://localhost:8000/saas/${clientCode}/users/client-id-by-credentials`,
//                 {
//                     username: form.username,
//                     password: form.password,
//                 }
//             );
//             const clientId = clientRes.data.client_id;

//             const loginRes = await axios.post(
//                 `http://localhost:8000/saas/${clientId}/users/login`,
//                 {
//                     username: form.username,
//                     password: form.password,
//                 }
//             );

//             const token = loginRes.data.data.access_token;
//             const decoded = jwtDecode(token);

//             localStorage.setItem("access_token", token);
//             localStorage.setItem("clientId", decoded.client_id);
//             localStorage.setItem("username", decoded.username);

//             if (decoded.grants) {
//                 localStorage.setItem("grants", JSON.stringify(decoded.grants));
//                 console.log("Grants saved:", decoded.grants);
//             } else {
//                 localStorage.setItem("grants", JSON.stringify([]));
//                 console.warn("No grants found in token");
//             }
//             toast.success("Login successful", {
//                 position: "top-right",
//                 autoClose: 3000,
//                 hideProgressBar: false,
//                 closeOnClick: true,
//                 pauseOnHover: true,
//                 draggable: true,
//                 progress: undefined,
//             });

//             navigate(`/saas/${clientId}/main`);
//         } catch (err) {
//             console.error("Login error:", err?.response?.data);
//             const msg = err?.response?.data?.detail;
//             setError(msg || "Invalid credentials");
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="login-page">
//             <div className="login-card">
//                 <div className="avatar-circle">
//                     <FaUser className="avatar-icon" />
//                 </div>
//                 <form onSubmit={handleLogin}>
//                     <div className="input-group">
//                         <FaUser className="input-icon" />
//                         <input
//                             type="text"
//                             name="username"
//                             placeholder="Username"
//                             value={form.username}
//                             onChange={handleChange}
//                             required
//                         />
//                     </div>
//                     <div className="input-group">
//                         <FaLock className="input-icon" />
//                         <input
//                             type="password"
//                             name="password"
//                             placeholder="Password"
//                             value={form.password}
//                             onChange={handleChange}
//                             required
//                         />
//                     </div>

//                     <div className="options-row">

//                         <span onClick={() => navigate(`/saas/${form.username || "demo"}/forgot`)}>Forgot Password?</span>
//                     </div>

//                     {error && <p className="error">{error}</p>}

//                     <button type="submit" className="login-button" disabled={loading}>
//                         {loading ? "Logging in..." : "LOGIN"}
//                     </button>
//                     <p className="login-link">
//                         Don’t have an account?{" "}
//                         <span onClick={() => navigate(`/saas/${form.clientCode || ":clientId"}/register`)}>Register here</span>
//                     </p>
//                 </form>
//             </div>
//         </div>
//     );
// }




//



// import "../styles/Login.css";
// import React, { useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";
// import { FaUser, FaLock } from "react-icons/fa";
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// export default function Login() {
//     const navigate = useNavigate();
//     const { clientId } = useParams();
//     const [form, setForm] = useState({ username: "", password: "" });
//     const [error, setError] = useState("");
//     const [loading, setLoading] = useState(false);

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleLogin = async (e) => {
//         e.preventDefault();
//         setError("");
//         setLoading(true);

//         try {
//             const loginRes = await axios.post(
//                 `http://localhost:8000/saas/${clientId}/users/login`,
//                 {
//                     username: form.username,
//                     password: form.password,
//                 }
//             );

//             const token = loginRes.data.data.access_token;
//             const decoded = jwtDecode(token);

//             localStorage.setItem("access_token", token);
//             localStorage.setItem("clientId", decoded.client_id);
//             localStorage.setItem("username", decoded.username);

//             if (decoded.grants) {
//                 localStorage.setItem("grants", JSON.stringify(decoded.grants));
//                 console.log("Grants saved:", decoded.grants);
//             } else {
//                 localStorage.setItem("grants", JSON.stringify([]));
//                 console.warn("No grants found in token");
//             }

//             toast.success("Login successful");

//             navigate(`/saas/${clientId}/main`);
//         } catch (err) {
//             console.error("Login error:", err?.response?.data);
//             const msg = err?.response?.data?.detail;
//             setError(msg || "Invalid credentials");
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="login-page">
//             <div className="login-card">
//                 <div className="avatar-circle">
//                     <FaUser className="avatar-icon" />
//                 </div>
//                 <form onSubmit={handleLogin}>
//                     <div className="input-group">
//                         <FaUser className="input-icon" />
//                         <input
//                             type="text"
//                             name="username"
//                             placeholder="Username"
//                             value={form.username}
//                             onChange={handleChange}
//                             required
//                         />
//                     </div>
//                     <div className="input-group">
//                         <FaLock className="input-icon" />
//                         <input
//                             type="password"
//                             name="password"
//                             placeholder="Password"
//                             value={form.password}
//                             onChange={handleChange}
//                             required
//                         />
//                     </div>

//                     <div className="options-row">
//                         <span onClick={() => navigate(`/saas/${clientId}/forgot`)}>Forgot Password?</span>
//                     </div>

//                     {error && <p className="error">{error}</p>}

//                     <button type="submit" className="login-button" disabled={loading}>
//                         {loading ? "Logging in..." : "LOGIN"}
//                     </button>
//                     <p className="login-link">
//                         Don’t have an account?{" "}
//                         <span onClick={() => navigate(`/saas/${clientId}/register`)}>Register here</span>
//                     </p>
//                 </form>
//             </div>
//         </div>
//     );
// }

// 


import "../styles/Login.css";
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FaUser, FaLock } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; import { TiArrowRightThick } from "react-icons/ti";

export default function Login() {
    const navigate = useNavigate();
    const { clientId } = useParams();
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await axios.post(
                `http://localhost:8000/saas/${clientId}/users/login`,
                {
                    username: form.username,
                    password: form.password,
                }
            );

            const token = res.data.data.access_token;
            const decoded = jwtDecode(token);

            localStorage.setItem("access_token", token);
            localStorage.setItem("clientId", decoded.client_id);
            localStorage.setItem("username", decoded.username);
            localStorage.setItem("grants", JSON.stringify(decoded.grants || []));

            toast.success("Login successful");

            navigate(`/saas/${clientId}/main`);
        } catch (err) {
            console.error("Login failed:", err);

            let msg = "An unexpected error occurred";
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;

            if (status === 401) {
                msg = detail || "Unauthorized: Invalid credentials";
            } else if (status === 404) {
                msg = detail || "Not Found: API endpoint or client not found";
            } else if (status === 500) {
                msg = "Internal Server Error. Please try again later.";
            } else if (detail && typeof detail === "string") {
                msg = detail;
            }

            setError(msg);
            toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="avatar-circle">
                    <FaUser className="avatar-icon" />
                </div>

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="options-row">
                        <span onClick={() => navigate(`/saas/${clientId}/forgot`)}>Forgot Password?</span>
                    </div>

                    {/* {error && <p className="error">{error}</p>} */}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Logging in..." : "LOGIN"}
                    </button>

                    <p className="login-link">
                        Don’t have an account?{" "}
                        <span onClick={() => navigate(`/saas/${clientId}/register`)}>Register here</span>
                    </p>
                </form>
            </div>
        </div>
    );
}
