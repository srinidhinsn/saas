import axios from "axios";

export const setupAuthInterceptor = (logout) => {
  axios.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        logout();
        const clientId =
        localStorage.getItem("client_id") || "easyfood";

        window.location.href = `/saas/${clientId}/login`;
      }
      return Promise.reject(err);
    }
  );
};
