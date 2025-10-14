
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const api = axios.create({
  baseURL: "http://localhost:8000/saas",
});

export const getValidToken = () => {
  const delegateToken = localStorage.getItem("delegate_token");
  const accessToken = localStorage.getItem("access_token");
  const token = delegateToken || accessToken;
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      localStorage.removeItem(delegateToken ? "delegate_token" : "access_token");
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

// attach tokens
api.interceptors.request.use((config) => {
  const token = getValidToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) return Promise.reject(error);
    const { status } = error.response;

    if (status === 401) {
      localStorage.removeItem("delegate_token");
      localStorage.removeItem("access_token");
      window.location.href = "/";
    }

    if (status === 403) {
      // 🔥 Dispatch global event when backend denies access
      console.warn("🔥 Access Denied Event Fired from Interceptor");
      window.dispatchEvent(new Event("accessDenied"));
    }

    return Promise.reject(error);
  }
);

export default api;


import orderServicesPort from "../Backend_Port_Files/OrderServices";
import tableServicesPort from "../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../Backend_Port_Files/InventoryServices";

// Apply interceptors to all service ports
const ports = [orderServicesPort, tableServicesPort, inventoryServicesPort];
ports.forEach((port) => {
  port.interceptors.request.use(api.interceptors.request.handlers[0].fulfilled);
  port.interceptors.response.use(
    api.interceptors.response.handlers[0].fulfilled,
    api.interceptors.response.handlers[0].rejected
  );
});
