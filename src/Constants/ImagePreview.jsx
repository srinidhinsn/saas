// components/ImagePreview.jsx
import React, { useEffect, useState } from "react";
import api from "../Constants/Api";

function ImagePreview({ clientId, imageId, token }) {
    const [imageUrl, setImageUrl] = useState(null);
  
    useEffect(() => {
      const fetchImageFromServer = async () => {
        if (!imageId) {
          setImageUrl(null);
          return;
        }
  
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}/${clientId}/document/download?doc_id=${imageId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
  
          if (!res.ok) throw new Error("Image fetch failed");
          const blob = await res.blob();
          setImageUrl(URL.createObjectURL(blob));
        } catch (err) {
          console.error("Error fetching image:", err);
          setImageUrl(null);
        }
      };
  
      fetchImageFromServer();
      return () => {
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
      };
    }, [clientId, imageId, token]);
  
    return imageUrl ? (
      <img src={imageUrl} alt="Preview" className="menu-image-preview" style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }}/>
    ) : (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#999'
      }}>
        No Image
      </div>
    );
  }
  

export default ImagePreview;
