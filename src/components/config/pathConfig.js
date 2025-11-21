// ===== Root path for the application (change this once for all routes) =====
export const APP_ROOT = "saas";

// ===== Default client when URL does not contain one =====
export const DEFAULT_CLIENT = "easyfood";

// Utility: safely join segments into a valid URL
export const joinParts = (...parts) => {
  return (
    "/" +
    parts
      .filter(Boolean)
      .map(p => p.replace(/^\/+|\/+$/g, "")) // trim slashes
      .join("/")
  );
};

// Generate any path easily
export const pathFor = (clientId, page) => {
  return joinParts(APP_ROOT, clientId, page);
};
