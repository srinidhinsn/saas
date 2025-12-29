// axiosInterceptor.js
import axios from "axios";
import {jwtDecode} from "jwt-decode";

/* -----------------------------------------------------
   1️⃣ Function to get the valid token (delegate > access)
------------------------------------------------------*/
export const getValidToken = () => {
  const delegateToken = localStorage.getItem("delegate_token");
  const accessToken = localStorage.getItem("access_token");

  const isTokenValid = (token) => {
    if (!token) return false;
    try {
      const decoded = jwtDecode(token);
      return !decoded.exp || decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  // 1️⃣ Use delegate token if valid  
  if (delegateToken && isTokenValid(delegateToken)) {
    return delegateToken;
  } else if (delegateToken) {
    // expired → remove it
    localStorage.removeItem("delegate_token");
  }

  // 2️⃣ fallback to main access token if valid
  if (accessToken && isTokenValid(accessToken)) {
    return accessToken;
  } else if (accessToken) {
    localStorage.removeItem("access_token");
  }

  // 3️⃣ no valid token left
  return null;
};

/* -----------------------------------------------------
   2️⃣ Axios request interceptor
      → Automatically attach valid token to all requests
------------------------------------------------------*/
axios.interceptors.request.use(
  (config) => {
    const token = getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* -----------------------------------------------------
   3️⃣ Axios response interceptor
      → Handle 401 / 403
------------------------------------------------------*/
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) return Promise.reject(error);

    const status = error.response.status;

    // 401 → invalid/expired token → logout
    if (status === 401) {
      localStorage.removeItem("delegate_token");
      localStorage.removeItem("access_token");
      window.location.href = "/";
    }

    // 403 → RBAC violation → trigger access denied
   

    return Promise.reject(error);
  }
);
