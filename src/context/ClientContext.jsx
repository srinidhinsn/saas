// src/context/ClientContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const ClientContext = createContext(null);

export function ClientProvider({ children }) {
  const [clientDetails, setClientDetails] = useState(null);
  // shape: { id, name, realm, email, phone, logo, subscription, gst_number }

  useEffect(() => {
  }, [clientDetails]);

  return (
    <ClientContext.Provider value={{ clientDetails, setClientDetails }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return ctx;
}