import axios from "axios";

export const setupAuthInterceptor = (logout) => {
  axios.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        logout();
      }
      return Promise.reject(err);
    }
  );
};
