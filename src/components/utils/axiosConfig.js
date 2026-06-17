import axios from 'axios';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

export const setupAxiosInterceptors = () => {
  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // If error is not 401, reject it
      if (error.response?.status !== 401) {
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      const clientId = localStorage.getItem('client_id') || 'easyfood';

      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.clear();
        window.location.href = `/saas/${clientId}/login`;
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = response.data.data.access_token;
        localStorage.setItem('access_token', newAccessToken);

        // Update the failed request's auth header and retry
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Process queued requests
        processQueue(null, newAccessToken);

        // Retry the original request
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = `/saas/${clientId}/login`;
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
};