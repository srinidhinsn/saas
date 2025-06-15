// utils/handleApiError.js

export const getErrorMessage = (status) => {
    switch (status) {
      case 403:
        return "403 - Restricted Access or Restricted Grant";
      case 500:
        return "500 - Server internal error. Please contact administrator";
      case 503:
        return "503 - Service Unavailable. Please try again later";
      default:
        return "We are facing technical issues. Please contact administrator";
    }
  };
  