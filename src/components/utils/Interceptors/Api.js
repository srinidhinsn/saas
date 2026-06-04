import axios from "axios";
import {jwtDecode} from "jwt-decode";

export const getValidToken = () => {
  const delegateToken = localStorage.getItem("delegate_token");
  const accessToken = localStorage.getItem("access_token");
  
  /* -----------------------------------------------------
   1️⃣ Function to get the valid token (delegate > access)
  ------------------------------------------------------*/
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

    const { status, data } = error.response;

    if (status === 403) {
      console.log("403 response:", JSON.stringify(data));  // ← add here
    }
    if (status === 401) {
      localStorage.removeItem("delegate_token");
      localStorage.removeItem("access_token");
      window.location.href = "/";
      return Promise.reject(error);
    }

    if (
      status === 403 &&
      data?.detail?.type === "operation_forbidden"  // ← structured = operation level
    ) {
      window.dispatchEvent(
        new CustomEvent("operation:forbidden", {
          detail: {
            module: data.detail.module,
            operation: data.detail.operation,
          },
        })
      );

      // Suspend the original promise until modal resolves
      return new Promise((resolve, reject) => {
        window.__pendingRetry = { resolve, reject, config: error.config };
      });
    }

    // Plain string 403 (realm/grant issues) → just reject normally
    return Promise.reject(error);
  }
);