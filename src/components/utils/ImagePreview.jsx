import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const DEFAULT_PLACEHOLDER = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2B3oOyF6yyLO9fTb-AWqyPZ6fhSDp8VP1Ag&s";


export default function ImagePreview({
  clientId,
  imageId,
  token,
  alt,
  className,
  baseUrl,
  urlBuilder
}) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(Boolean(imageId));
  const [error, setError] = useState(false);
  const objectUrlRef = useRef(null);
  const controllerRef = useRef(null);

  const defaultBase = (import.meta.env.VITE_API_INVENTORY_SERVICE_URL || "").replace(/\/+$/, "");
  const docBase = (baseUrl || defaultBase).replace(/\/+$/, "");

  // default url builder for inventory service
  const defaultUrlBuilder = ({ baseUrl, clientId, imageId }) =>
    `${baseUrl}/${clientId}/menu/image/${imageId}`;

  useEffect(() => {
    // cleanup when imageId changes or on unmount
    return () => {
      if (controllerRef.current) {
        try { controllerRef.current.abort(); } catch (e) {}
        controllerRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [imageId]);

  useEffect(() => {
    if (!imageId || !clientId) {
      setSrc(DEFAULT_PLACEHOLDER);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    // build url (either custom builder or default)
    const builder = urlBuilder || defaultUrlBuilder;
    const finalUrl = builder({ baseUrl: docBase, clientId, imageId });

    // Debug log — remove in production
    console.debug("[ImagePreview] fetching image:", { finalUrl, tokenPreview: token ? `${token.slice(0,6)}...` : null });

    const controller = new AbortController();
    controllerRef.current = controller;

    axios.get(finalUrl, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: "image/*" } : { Accept: "image/*" },
      responseType: "blob",
      signal: controller.signal,
      timeout: 15000,
    })
    .then(response => {
      if (response.status >= 200 && response.status < 300) {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        const objUrl = URL.createObjectURL(response.data);
        objectUrlRef.current = objUrl;
        setSrc(objUrl);
      } else {
        console.error("[ImagePreview] non-2xx", response.status, finalUrl);
        setSrc(DEFAULT_PLACEHOLDER);
        setError(true);
      }
    })
    .catch(err => {
      if (err.name === "CanceledError" || err.message === "canceled") {
        // aborted
      } else {
        console.error("[ImagePreview] fetch error", {
          status: err?.response?.status,
          data: err?.response?.data,
          finalUrl
        });
        setSrc(DEFAULT_PLACEHOLDER);
        setError(true);
      }
    })
    .finally(() => setLoading(false));

    return () => {
      if (controllerRef.current) {
        try { controllerRef.current.abort(); } catch (e) {}
        controllerRef.current = null;
      }
      // don't revoke here — handled in outer cleanup
    };
  }, [clientId, imageId, token, baseUrl, urlBuilder]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className || ""}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-action-primary" />
      </div>
    );
  }

  return (
    <img
      src={src || DEFAULT_PLACEHOLDER}
      alt={alt || "image"}
      className={className || "w-full h-full object-cover"}
      onError={(e) => { if (e?.currentTarget) e.currentTarget.src = DEFAULT_PLACEHOLDER; }}
    />
  );
}
