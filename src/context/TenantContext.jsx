import React, { createContext, useContext, useState, useEffect } from "react";

const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem("client_id") || null;
  });

  const switchTenant = (newClientId) => {
    localStorage.setItem("client_id", newClientId);
    setClientId(newClientId);
  };

  return (
    <TenantContext.Provider value={{ clientId, switchTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);