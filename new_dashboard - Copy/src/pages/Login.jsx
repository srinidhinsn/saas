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


import "../styles/Login.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";



export default function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        client_code: "",
        username: "",
        password: ""
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        const payload = {
            username: form.username,
            password: form.password
        };

        try {
            const response = await axios.post(
                `http://localhost:8000/saas/${form.client_code}/users/login`,
                payload
            );


            const token = response.data.data.access_token;

            // Decode token
            const decoded = jwtDecode(token);

            console.log("Decoded Token:", decoded);

            // Extract client_id
            const client_id = decoded.client_id;

            // Store in localStorage
            localStorage.setItem("access_token", token);
            localStorage.setItem("client_id", client_id);
            localStorage.setItem("username", decoded.username);



            alert("✅ Login successful");
            navigate("/profile");

        } catch (err) {
            console.error("Login error:", err?.response?.data);
            const detail = err?.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
            setError(msg || "Invalid client code or credentials");
        }
    };


    return (
        <div className="Register-pages">
            <div className="container">
                <div className="form-container">
                    <form onSubmit={handleLogin}>
                        <h1>Login</h1>

                        <input
                            type="text"
                            name="client_code"
                            placeholder="Client Code"
                            value={form.client_code}
                            onChange={handleChange}
                        />

                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />

                        {error && <p className="error">{error}</p>}

                        <button type="submit">Login</button>

                        <p className="login-link">
                            Don’t have an account? <a href="/register">Register</a>
                        </p>

                        <button
                            type="button"
                            className="ghost"
                            onClick={() => navigate("/forgot")}
                        >
                            Forgot Password?
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}


// 

