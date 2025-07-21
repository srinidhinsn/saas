// import React, { useEffect, useState } from "react";
// import axios from "axios";

// const InvoicePage = () => {
//     const [documents, setDocuments] = useState([]);
//     const [grants, setGrants] = useState(null);

//     const token = localStorage.getItem("access_token");
//     const clientId = localStorage.getItem("client_id");

//     useEffect(() => {
//         const storedGrants = JSON.parse(localStorage.getItem("grants")) || [];
//         setGrants(storedGrants);

//         // Ensure "document" (singular) is used for checking
//         if (clientId && token && storedGrants.includes("document")) {
//             axios
//                 .get(`http://localhost:8004/saas/${clientId}/documents/read`, {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 })
//                 .then((res) => {
//                     console.log("Documents fetched:", res.data);
//                     setDocuments(res.data?.data || []);
//                 })
//                 .catch((err) => {
//                     console.error("Failed to fetch documents", err);
//                 });
//         }
//     }, [clientId, token]);
//     if (grants === null) {
//         return <p>Loading permissions...</p>;
//     }

//     // ✅ Proper grant check
//     if (!grants.includes("document")) {
//         return (
//             <div style={{ padding: "20px" }}>
//                 <h2>Download Documents</h2>
//                 <p>You do not have access to view documents.</p>
//             </div>
//         );
//     }

//     return (
//         <div style={{ padding: "20px" }}>
//             <h2>Download Documents</h2>
//             {documents.length === 0 ? (
//                 <p>No documents found.</p>
//             ) : (
//                 <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
//                     <thead>
//                         <tr>
//                             <th>File Name</th>
//                             <th>Download</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {documents.map((doc) => (
//                             <tr key={doc.id}>
//                                 <td>{doc.name}</td>
//                                 <td>
//                                     <a
//                                         href={`http://localhost:8004/saas/documents/download/${doc.id}`}
//                                         target="_blank"
//                                         rel="noopener noreferrer"
//                                         download
//                                     >
//                                         Download
//                                     </a>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             )}
//         </div>
//     );
// };

// export default InvoicePage;

//


// import React, { useEffect, useState } from "react";
// import axios from "axios";

// const Documents = () => {
//     const [hasAccess, setHasAccess] = useState(false);
//     const [documents, setDocuments] = useState([]);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         const grantsRaw = localStorage.getItem("grants");
//         if (grantsRaw) {
//             try {
//                 const grants = JSON.parse(grantsRaw).map(g => g.trim().toLowerCase());
//                 console.log("✅ Grants:", grants);
//                 if (grants.includes("document") || grants.includes("documents")) {
//                     setHasAccess(true);
//                     fetchDocuments();
//                 } else {
//                     setHasAccess(false);
//                     setLoading(false);
//                 }
//             } catch (err) {
//                 console.error("❌ Error parsing grants from localStorage:", err);
//                 setHasAccess(false);
//                 setLoading(false);
//             }
//         } else {
//             console.warn("⚠️ No grants found in localStorage.");
//             setHasAccess(false);
//             setLoading(false);
//         }
//     }, []);

//     const fetchDocuments = async () => {
//         const clientId = localStorage.getItem("clientId");
//         const token = localStorage.getItem("access_token");

//         if (!token || !clientId) {
//             console.warn("⚠️ Missing token or clientId in localStorage.");
//             setLoading(false);
//             return;
//         }

//         try {
//             const response = await axios.get(
//                 `http://localhost:8004/saas/${clientId}/documents/read`,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 }
//             );
//             setDocuments(response.data?.data || []);
//         } catch (error) {
//             console.error("⚠️ Failed to fetch documents:", error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     if (loading) {
//         return <div style={{ padding: "1rem" }}>Loading...</div>;
//     }

//     if (!hasAccess) {
//         return (
//             <div style={{ padding: "1rem", color: "red" }}>
//                 <h2>📁 Download Documents</h2>
//                 <p>You do not have access to view documents.</p>
//             </div>
//         );
//     }

//     return (
//         <div style={{ padding: "1rem" }}>
//             <h2>📁 Download Documents</h2>
//             {documents.length === 0 ? (
//                 <p>No documents available.</p>
//             ) : (
//                 <ul>
//                     {documents.map((doc, index) => (
//                         <li key={index}>
//                             <a href={doc.url} download target="_blank" rel="noopener noreferrer">
//                                 {doc.name}
//                             </a>
//                         </li>
//                     ))}
//                 </ul>
//             )}
//         </div>
//     );
// };

// export default Documents;


//
//

// import React, { useEffect, useState } from "react";
// import axios from "axios";

// const DocumentManager = () => {
//     const clientId = localStorage.getItem("client_id");
//     const token = localStorage.getItem("access_token");
//     const userId = localStorage.getItem("user_id") || "system";

//     const [documents, setDocuments] = useState([]);
//     const [file, setFile] = useState(null);
//     const [description, setDescription] = useState("");
//     const [categoryId, setCategoryId] = useState("");
//     const [realm, setRealm] = useState("");
//     const [selectedDocId, setSelectedDocId] = useState(null);

//     const headers = {
//         Authorization: `Bearer ${token}`,
//     };

//     useEffect(() => {
//         if (clientId && token) {
//             fetchDocuments();
//         }
//     }, [clientId, token]);

//     const fetchDocuments = async () => {
//         try {
//             const res = await axios.get(
//                 `http://localhost:8004/saas/easyfood/documents/read`,
//                 {
//                     headers,
//                     params: { client_id: clientId },
//                 }
//             );
//             setDocuments(res.data.data);
//         } catch (err) {
//             alert("❌ Failed to fetch documents.");
//             console.error(err);
//         }
//     };

//     const handleUpload = async () => {
//         if (!file) return;

//         const formData = new FormData();
//         formData.append("file", file);
//         formData.append("description", description);
//         formData.append("category_id", categoryId);
//         formData.append("realm", realm);
//         formData.append("created_by", userId);

//         try {
//             await axios.post(
//                 `http://localhost:8004/saas/easyfood/documents/upload`,
//                 formData,
//                 {
//                     headers: { ...headers, "Content-Type": "multipart/form-data" },
//                     params: { client_id: clientId },
//                 }
//             );
//             alert("✅ Upload successful.");
//             fetchDocuments();
//             resetForm();
//         } catch (err) {
//             alert("❌ Upload failed.");
//             console.error(err);
//         }
//     };

//     const handleDownload = async (docId) => {
//         try {
//             const res = await axios.get(
//                 `http://localhost:8004/saas/easyfood/documents/download/${docId}`,
//                 {
//                     headers,
//                     responseType: "blob",
//                 }
//             );
//             const url = window.URL.createObjectURL(new Blob([res.data]));
//             const link = document.createElement("a");
//             link.href = url;
//             link.setAttribute("download", `document_${docId}`);
//             document.body.appendChild(link);
//             link.click();
//             link.remove();
//         } catch (err) {
//             alert("❌ Download failed.");
//             console.error(err);
//         }
//     };

//     const handleReplace = async () => {
//         if (!file || !selectedDocId) return;

//         const formData = new FormData();
//         formData.append("file", file);
//         formData.append("description", description);
//         formData.append("category_id", categoryId);
//         formData.append("realm", realm);
//         formData.append("updated_by", userId);

//         try {
//             await axios.post(
//                 `http://localhost:8004/saas/easyfood/documents/replace/${selectedDocId}`,
//                 formData,
//                 {
//                     headers: { ...headers, "Content-Type": "multipart/form-data" },
//                     params: { client_id: clientId },
//                 }
//             );
//             alert("✅ Document replaced.");
//             fetchDocuments();
//             resetForm();
//         } catch (err) {
//             alert("❌ Replace failed.");
//             console.error(err);
//         }
//     };

//     const resetForm = () => {
//         setFile(null);
//         setDescription("");
//         setCategoryId("");
//         setRealm("");
//         setSelectedDocId(null);
//     };

//     return (
//         <div style={{ padding: 20, fontFamily: "Arial" }}>
//             <h2 style={{ marginBottom: 10 }}>📄 Document Manager</h2>

//             <div style={{ marginBottom: 20 }}>
//                 <input
//                     type="file"
//                     onChange={(e) => setFile(e.target.files[0])}
//                     style={{ marginRight: 10 }}
//                 />
//                 <input
//                     type="text"
//                     placeholder="Description"
//                     value={description}
//                     onChange={(e) => setDescription(e.target.value)}
//                     style={{ marginRight: 10 }}
//                 />
//                 <input
//                     type="text"
//                     placeholder="Category ID"
//                     value={categoryId}
//                     onChange={(e) => setCategoryId(e.target.value)}
//                     style={{ marginRight: 10 }}
//                 />
//                 <input
//                     type="text"
//                     placeholder="Realm"
//                     value={realm}
//                     onChange={(e) => setRealm(e.target.value)}
//                     style={{ marginRight: 10 }}
//                 />

//                 <button
//                     onClick={handleUpload}
//                     style={{
//                         padding: "6px 12px",
//                         marginRight: 10,
//                         backgroundColor: "#4CAF50",
//                         color: "white",
//                         border: "none",
//                     }}
//                 >
//                     Upload
//                 </button>

//                 {selectedDocId && (
//                     <button
//                         onClick={handleReplace}
//                         style={{
//                             padding: "6px 12px",
//                             backgroundColor: "#2196F3",
//                             color: "white",
//                             border: "none",
//                         }}
//                     >
//                         Replace
//                     </button>
//                 )}
//             </div>

//             <h3 style={{ marginBottom: 10 }}>📁 Available Documents</h3>
//             <table
//                 style={{
//                     width: "100%",
//                     borderCollapse: "collapse",
//                     marginTop: 10,
//                     fontSize: 14,
//                 }}
//             >
//                 <thead>
//                     <tr style={{ backgroundColor: "#f2f2f2" }}>
//                         <th style={th}>Name</th>
//                         <th style={th}>Type</th>
//                         <th style={th}>Size</th>
//                         <th style={th}>Actions</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     {documents.map((doc) => (
//                         <tr key={doc.id}>
//                             <td style={td}>{doc.name}</td>
//                             <td style={td}>{doc.filetype}</td>
//                             <td style={td}>{doc.size_kb} KB</td>
//                             <td style={td}>
//                                 <button
//                                     onClick={() => handleDownload(doc.id)}
//                                     style={btnStyle}
//                                 >
//                                     Download
//                                 </button>
//                                 <button
//                                     onClick={() => setSelectedDocId(doc.id)}
//                                     style={{ ...btnStyle, backgroundColor: "#ff9800" }}
//                                 >
//                                     Replace
//                                 </button>
//                             </td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//     );
// };

// const th = {
//     border: "1px solid #ddd",
//     padding: 8,
//     textAlign: "left",
// };

// const td = {
//     border: "1px solid #ddd",
//     padding: 8,
// };

// const btnStyle = {
//     marginRight: 5,
//     padding: "4px 8px",
//     backgroundColor: "#008CBA",
//     color: "white",
//     border: "none",
//     cursor: "pointer",
// };

// export default DocumentManager;



//import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import React, { useState, useEffect } from 'react'

const InvoicePage = () => {
    const [documents, setDocuments] = useState([]);
    const [hasAccess, setHasAccess] = useState(false);
    const token = localStorage.getItem("access_token");
    const clientId = localStorage.getItem("clientId");

    const extractGrants = () => {
        try {
            if (!token) return [];

            const decoded = jwtDecode(token);
            console.log("🔓 Decoded token:", decoded);

            const grants = Array.isArray(decoded?.grants) ? decoded.grants : [];
            console.log("✅ Grants:\n", grants);
            return grants;
        } catch (error) {
            console.error("❌ Failed to decode token:", error);
            return [];
        }
    };

    const fetchDocuments = async () => {
        try {
            const grants = extractGrants();

            if (!Array.isArray(grants) || !grants.includes("document")) {
                console.log("🚫 No document grant");
                setHasAccess(false);
                return;
            }

            setHasAccess(true);

            const response = await axios.get(
                `http://localhost:8004/saas/${clientId}/documents/read`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setDocuments(response.data.data || []);
        } catch (error) {
            console.error("❌ Error fetching documents:", error);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    if (!hasAccess) {
        return (
            <div className="invoice-page">
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="invoice-page">
            <h2>Documents</h2>
            {documents.length === 0 ? (
                <p>No documents found.</p>
            ) : (
                <ul>
                    {documents.map((doc) => (
                        <li key={doc.id}>
                            <strong>{doc.name}</strong> — {doc.type}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default InvoicePage;
