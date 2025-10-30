import React, { useEffect, useState } from "react";
import axios from "axios";

const DocumentPickerModal = ({ isOpen, onClose, clientId, token, onSelect }) => {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (isOpen && clientId && token) {
      fetchDocuments();
    }
  }, [isOpen]);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}/${clientId}/document/read`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const docList = res.data.data || [];

      // Fetch blob URLs for image previews
      const docsWithPreviews = await Promise.all(
        docList.map(async (doc) => {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}/${clientId}/document/download?doc_id=${doc.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            return { ...doc, previewUrl: objectUrl };
          } catch (err) {
            console.error("Failed to fetch preview for doc:", doc.id);
            return { ...doc, previewUrl: null };
          }
        })
      );

      setDocs(docsWithPreviews);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="document-picker-backdrop">
      <div className="document-picker-modal">
        <h3>Select The File</h3>
        <div className="document-grid">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="document-card"
              onClick={() => onSelect(doc)}
            >
              {doc.previewUrl ? (
                <img
                  src={doc.previewUrl}
                  alt={doc.name}
                  className="document-thumbnail"
                />
              ) : (
                <div className="no-preview">No Preview</div>
              )}
              <p>{doc.name}</p>
            </div>
          ))}
        </div>
        <button className="btn-close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default DocumentPickerModal;
