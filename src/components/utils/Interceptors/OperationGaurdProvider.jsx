import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import AuthModal from '../Modals/AuthModal';

const OperationGuardContext = createContext(null);
export const useOperationGuard = () => useContext(OperationGuardContext);

export const OperationGuardProvider = ({ clientId, requesterId, children }) => {
  const [modalState, setModalState] = useState({
    open: false,
    module: null,
    operation: null,
  });

  useEffect(() => {
    const handler = (e) => {
      setModalState({
        open: true,
        module: e.detail.module,
        operation: e.detail.operation,
      });
    };
    window.addEventListener("operation:forbidden", handler);
    return () => window.removeEventListener("operation:forbidden", handler);
  }, []);

  const handleClose = () => {
    setModalState({ open: false, module: null, operation: null });
    if (window.__pendingRetry) {
      window.__pendingRetry.reject(new Error("User cancelled authorization"));
      window.__pendingRetry = null;
    }
  };

  const handleSuccess = useCallback(async (token) => {
    setModalState({ open: false, module: null, operation: null });

    if (window.__pendingRetry) {
      const { resolve, reject, config } = window.__pendingRetry;
      window.__pendingRetry = null;

      try {
        const retryResponse = await axios({
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          },
        });
        resolve(retryResponse);
      } catch (retryError) {
        reject(retryError);
      }
    }
  }, []);

  return (
    <OperationGuardContext.Provider value={{}}>
      {children}
      <AuthModal
        open={modalState.open}
        onClose={handleClose}
        onSuccess={handleSuccess}
        clientId={clientId}
        requesterId={requesterId}
      />
    </OperationGuardContext.Provider>
  );
};