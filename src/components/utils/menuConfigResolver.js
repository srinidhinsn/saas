export function getMenuConfig(clientId) {

    // console.log("------ FULL ENV ------");
    // console.log(import.meta.env);
    // console.log("EASYFOOD LEVEL =", import.meta.env.VITE_EASYFOOD_MENU_HIERARCHY_LEVEL);
    // console.log("DEFAULT LEVEL =", import.meta.env.VITE_MENU_HIERARCHY_LEVEL);
  
    const normalizedClient = String(clientId)
      .trim()
      .toLowerCase()
      .split("/")
      .pop()
      .replace(/[^a-z0-9]/g, "_");
  
    const prefix = normalizedClient.toUpperCase();
  
    const root =
      import.meta.env[`VITE_${prefix}_MENU_DEFAULT_ROOT`] ??
      import.meta.env.VITE_MENU_DEFAULT_ROOT ??
      "dietery";
  
    const level =
      Number(import.meta.env[`VITE_${prefix}_MENU_HIERARCHY_LEVEL`]) ||
      Number(import.meta.env.VITE_MENU_HIERARCHY_LEVEL) ||
      2;
  
    console.log("RESOLVED CONFIG =", { root, level });
  
    return { root, level };
  }
  