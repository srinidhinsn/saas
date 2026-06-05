export const apiFetch = async (url, options = {}) => {
  let accessToken = localStorage.getItem("access_token");

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token");

    const refreshResponse = await fetch(
      `${import.meta.env.VITE_API_USER_SERVICE_URL}/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }
    );

    if (!refreshResponse.ok) {
        const clientId =
          localStorage.getItem("client_id") || "easyfood";
      
        localStorage.clear();
      
        window.location.href =
          `/saas/${clientId}/login`;
      
        throw new Error("Session expired");
      }

    const refreshData = await refreshResponse.json();

    accessToken = refreshData.data.access_token;

    localStorage.setItem("access_token", accessToken);

    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return response;
};