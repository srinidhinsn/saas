import React, { useEffect, useState } from "react";
import axios from "axios";

const DocumentManager = () => {
    const clientId = localStorage.getItem("client_id");
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id") || "system";

    const [documents, setDocuments] = useState([]);
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [realm, setRealm] = useState("");
    const [selectedDocId, setSelectedDocId] = useState(null);

    const headers = {
        Authorization: `Bearer ${token}`,
    };

    useEffect(() => {
        if (clientId && token) {
            fetchDocuments();
        }
    }, [clientId, token]);

    const fetchDocuments = async () => {
        try {
            const res = await axios.get(
                `http://localhost:8004/saas/${clientId}/document/read`,
                {
                    headers,
                    params: { client_id: clientId },
                }
            );
            setDocuments(res.data.data);
        } catch (err) {
            alert("Unable to fetch documents.");
            console.error(err);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("description", description);
        formData.append("category_id", categoryId);
        formData.append("realm", realm);
        formData.append("created_by", userId);

        try {
            await axios.post(
                `http://localhost:8004/saas/${clientId}/documents/upload`,
                formData,
                {
                    headers: { ...headers, "Content-Type": "multipart/form-data" },
                    params: { client_id: clientId },
                }
            );
            alert(" Upload successful.");
            fetchDocuments();
            resetForm();
        } catch (err) {
            alert(" Upload failed.");
            console.error(err);
        }
    };

    const handleDownload = async (docId) => {
        try {
            const res = await axios.get(
                `http://localhost:8004/saas/${clientId}/documents/download/${docId}`,
                {
                    headers,
                    responseType: "blob",
                }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `document_${docId}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Download failed.");
            console.error(err);
        }
    };

    const handleReplace = async () => {
        if (!file || !selectedDocId) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("description", description);
        formData.append("category_id", categoryId);
        formData.append("realm", realm);
        formData.append("updated_by", userId);

        try {
            await axios.post(
                `http://localhost:8004/saas/${clientId}/documents/replace/${selectedDocId}`,
                formData,
                {
                    headers: { ...headers, "Content-Type": "multipart/form-data" },
                    params: { client_id: clientId },
                }
            );
            alert(" Document replaced.");
            fetchDocuments();
            resetForm();
        } catch (err) {
            alert(" Replace failed.");
            console.error(err);
        }
    };

    const resetForm = () => {
        setFile(null);
        setDescription("");
        setCategoryId("");
        setRealm("");
        setSelectedDocId(null);
    };

    return (
        <div style={{ padding: 20, fontFamily: "Arial" }}>
            <h2 style={{ marginBottom: 10 }}>📄 Document Manager</h2>

            <div style={{ marginBottom: 20 }}>
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{ marginRight: 10 }}
                />
                <input
                    type="text"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ marginRight: 10 }}
                />
                <input
                    type="text"
                    placeholder="Category ID"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    style={{ marginRight: 10 }}
                />
                <input
                    type="text"
                    placeholder="Realm"
                    value={realm}
                    onChange={(e) => setRealm(e.target.value)}
                    style={{ marginRight: 10 }}
                />

                <button
                    onClick={handleUpload}
                    style={{
                        padding: "6px 12px",
                        marginRight: 10,
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                    }}
                >
                    Upload
                </button>

                {selectedDocId && (
                    <button
                        onClick={handleReplace}
                        style={{
                            padding: "6px 12px",
                            backgroundColor: "#2196F3",
                            color: "white",
                            border: "none",
                        }}
                    >
                        Replace
                    </button>
                )}
            </div>

            <h3 style={{ marginBottom: 10 }}>📁 Available Documents</h3>
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 10,
                    fontSize: 14,
                }}
            >
                <thead>
                    <tr style={{ backgroundColor: "#f2f2f2" }}>
                        <th style={th}>Name</th>
                        <th style={th}>Type</th>
                        <th style={th}>Size</th>
                        <th style={th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {documents.map((doc) => (
                        <tr key={doc.id}>
                            <td style={td}>{doc.name}</td>
                            <td style={td}>{doc.filetype}</td>
                            <td style={td}>{doc.size_kb} KB</td>
                            <td style={td}>
                                <button
                                    onClick={() => handleDownload(doc.id)}
                                    style={btnStyle}
                                >
                                    Download
                                </button>
                                <button
                                    onClick={() => setSelectedDocId(doc.id)}
                                    style={{ ...btnStyle, backgroundColor: "#ff9800" }}
                                >
                                    Replace
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const th = {
    border: "1px solid #ddd",
    padding: 8,
    textAlign: "left",
};

const td = {
    border: "1px solid #ddd",
    padding: 8,
};

const btnStyle = {
    marginRight: 5,
    padding: "4px 8px",
    backgroundColor: "#008CBA",
    color: "white",
    border: "none",
    cursor: "pointer",
};

export default DocumentManager;

