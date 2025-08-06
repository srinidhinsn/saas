import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import documentServicesPort from "../../Backend_Port_Files/DocumentServices";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";

const DocumentManager = () => {
    const { clientId } = useParams();
    const { darkMode } = useTheme(); // you can use it if needed
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id") || "system";

    const [documents, setDocuments] = useState([]);
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [realm, setRealm] = useState("");
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [latestDocId, setLatestDocId] = useState(null);

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (clientId && token) fetchDocuments();
    }, [clientId, token]);

    const fetchDocuments = async () => {
        try {
            const res = await documentServicesPort.get(
                `/${clientId}/document/read`,
                { headers }
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
            await documentServicesPort.post(
                `/${clientId}/document/upload`,
                formData,
                {
                    headers: {
                        ...headers,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            alert("Upload successful.");
            fetchDocuments();
            resetForm();
            setLatestDocId(null);
        } catch (err) {
            alert("Upload failed.");
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
            await documentServicesPort.post(
                `/${clientId}/document/replace?doc_id=${selectedDocId}`,
                formData,
                {
                    headers: {
                        ...headers,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            alert("Document replaced.");
            setSelectedDocId(null);
            fetchDocuments();
            resetForm();
        } catch (err) {
            alert("Replace failed.");
            console.error(err);
        }
    };

    const handleDownload = async (docId) => {
        try {
            const res = await documentServicesPort.get(
                `/${clientId}/document/download?doc_id=${docId}`,
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

    const resetForm = () => {
        setFile(null);
        setDescription("");
        setCategoryId("");
        setRealm("");
        setSelectedDocId(null);
    };

    return (
        <div className="doc-manager-wrapper">
            <h2 className="doc-header">📄 Document Manager</h2>

            <div className="doc-upload-form">
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                <input
                    type="text"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Category ID"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Realm"
                    value={realm}
                    onChange={(e) => setRealm(e.target.value)}
                />
                <div className="doc-btn-group">
                    <button className="upload-button" onClick={handleUpload}>
                        Upload
                    </button>
                    {selectedDocId && (
                        <button className="replace-button" onClick={handleReplace}>
                            Replace
                        </button>
                    )}
                </div>
            </div>

            <h3 className="doc-subheader">📁 Available Documents</h3>
            <div className="doc-grid-container">
                {documents
                    .filter((doc) => doc.id === latestDocId || latestDocId === null)
                    .map((doc) => (
                        <div className="doc-card" key={doc.id}>
                            <p><strong>📁 {doc.name}</strong></p>
                            <p>📎 Category: {doc.category_id}</p>
                            <p>📝 {doc.description}</p>
                            <p>📦 {doc.size_kb} KB</p>
                            <div className="doc-actions">
                                <button
                                    className="download-button"
                                    onClick={() => handleDownload(doc.id)}
                                >
                                    Download
                                </button>
                                <button
                                    className="replace-button"
                                    onClick={() => setSelectedDocId(doc.id)}
                                >
                                    Replace
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default DocumentManager;
