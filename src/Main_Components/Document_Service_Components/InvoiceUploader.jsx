import React, { useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function InvoiceUploader({  documentMeta = {}, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const {clientId}=useParams()
  const token = localStorage.getItem("access_token");
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("client_id", clientId);
    form.append("description", documentMeta.description || "Invoice PDF");
    form.append("category_id", documentMeta.category_id || "invoice");
    form.append("realm", documentMeta.realm || "");
    form.append("created_by", documentMeta.created_by || "");

    setUploading(true);
    try {
       // or similar
      const res = await axios.post(
        `${import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}/${clientId}/document/upload`,
        form,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (onUploadSuccess) onUploadSuccess(res.data);
      alert("Invoice uploaded and stored successfully!");
    } catch (err) {
      alert("Failed to upload invoice: " + (err?.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{margin:"1em 0"}}>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? "Uploading..." : "Store Invoice"}
      </button>
    </div>
  );
}
