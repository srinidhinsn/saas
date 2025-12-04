
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const DEFAULT_PLACEHOLDER =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-PcqZ-z4phrEqORLLF0wdr7a6Ji25v4-lsdiYyNsWaMVE6STO9mNYzPc&s";

export default function ImagePreview({clientId,imageId,token,alt,className,urlBuilder,}) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(Boolean(imageId));
  const [error, setError] = useState(false);
  const objectUrlRef = useRef(null);
  const controllerRef = useRef(null);

  // Preferred backend for downloadable images
  const docService = (import.meta.env.VITE_API_DOCUMENT_SERVICE_URL || "").replace(/\/+$/, "");
  // Fallback (older) inventory service
  const invService = (import.meta.env.VITE_API_INVENTORY_SERVICE_URL || "").replace(/\/+$/, "");
  // Choose base: prefer document service, else inventory
  const base = docService || invService;

  // Default url building behaviour (document service style first)
  const defaultUrlBuilder = ({ baseUrl, clientId, imageId }) => {
    if (!baseUrl) return "";
    // If doc service exists, use document/download?doc_id=...
    if (docService) {
      return `${baseUrl}/${clientId}/document/download?doc_id=${encodeURIComponent(imageId)}`;
    }
    // Fallback to old inventory path
    return `${baseUrl}/${clientId}/menu/image/${encodeURIComponent(imageId)}`;
  };

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

    const builder = typeof urlBuilder === "function" ? urlBuilder : defaultUrlBuilder;
    const finalUrl = builder({ baseUrl: base, clientId, imageId });

    if (!finalUrl) {
      console.warn("[ImagePreview] no base URL available to fetch image. Falling back to placeholder.");
      setSrc(DEFAULT_PLACEHOLDER);
      setLoading(false);
      setError(true);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    axios
      .get(finalUrl, {
        headers: token ? { Authorization: `Bearer ${token}`, Accept: "image/*" } : { Accept: "image/*" },
        responseType: "blob",
        signal: controller.signal,
        timeout: 15000,
      })
      .then((response) => {
        if (response.status >= 200 && response.status < 300) {
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          const objUrl = URL.createObjectURL(response.data);
          objectUrlRef.current = objUrl;
          setSrc(objUrl);
        } else {
          console.error("[ImagePreview] non-2xx status", response.status, finalUrl);
          setSrc(DEFAULT_PLACEHOLDER);
          setError(true);
        }
      })
      .catch((err) => {
        // axios 1.x throws an error with `name === "CanceledError"` when aborted
        if (err?.name === "CanceledError" || err?.message?.toLowerCase()?.includes("canceled")) {
          // aborted -> ignore
        } else {
          console.error("[ImagePreview] fetch error", { status: err?.response?.status, finalUrl, err });
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
    };
  }, [clientId, imageId, token, urlBuilder, base]);

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
