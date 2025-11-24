// import { APP_ROOT } from '../../config/pathConfig';
// import React, { useEffect, useState } from 'react';
// import { useNavigate, useParams, useLocation } from 'react-router-dom';
// import { injectThemeVars } from '../../utils/injectThemeVars';

// export const navMap = {
//     home:      (clientId) => `/${APP_ROOT}/${clientId}/home`,
//     table:     (clientId) => `/${APP_ROOT}/${clientId}/managing-tables`,
//     menu:      (clientId) => `/${APP_ROOT}/${clientId}/menu`,
//     billing:   (clientId) => `/${APP_ROOT}/${clientId}/billing`,
//     users:     (clientId) => `/${APP_ROOT}/${clientId}/users`,
//     inventory: (clientId) => `/${APP_ROOT}/${clientId}/inventory`,
//     role:      (clientId) => `/${APP_ROOT}/${clientId}/role`,
//     order:     (clientId) => `/${APP_ROOT}/${clientId}/order`,
//     summary:   (clientId) => `/${APP_ROOT}/${clientId}/summary`,
//     kds:       (clientId) => `/${APP_ROOT}/${clientId}/kds`,
//     details:   (clientId) => `/${APP_ROOT}/${clientId}/details`,
//   };

// const HeaderShared = ({ onLogout }) => {
//   const navigate = useNavigate();
//   const { clientId } = useParams();
//   const location = useLocation();
//   const [mobileOpen, setMobileOpen] = useState(false);

//   useEffect(() => {
//     injectThemeVars(); // ensure theme variables injected once header mounts
//   }, []);

//   useEffect(() => {
//     if (mobileOpen) document.body.style.overflow = 'hidden';
//     else document.body.style.overflow = '';
//     return () => { document.body.style.overflow = ''; };
//   }, [mobileOpen]);

//   // Derive active key from pathname
//   const deriveActive = () => {
//     if (!clientId) return 'home';
//     const path = location.pathname.replace(/\/+$/, '');
//     const pair = Object.entries(navMap).find(([key, fn]) => {
//       try { return fn(clientId) === path; } catch (e) { return false; }
//     });
//     return pair ? pair[0] : (path.includes('/managing-tables') ? 'table' : (path.includes('/order') ? 'order' : (path.includes('/summary') ? 'summary' : 'home')));
//   };

//   const active = deriveActive();

//   const handleNavigate = (id) => {
//     const fn = navMap[id];
//     if (!fn) return;
//     setMobileOpen(false);
//     navigate(fn(clientId));
//   };

//   const NavLink = ({ id, children }) => {
//     const isActive = active === id;
//     return (
//       <button
//         onClick={() => handleNavigate(id)}
//         className={`px-2 py-1 rounded transition-colors ${isActive ? 'text-action-primary font-semibold' : 'text-text-secondary hover:text-action-primary'}`}
//         aria-current={isActive ? 'page' : undefined}
//       >
//         {children}
//       </button>
//     );
//   };

//   return (
//     <header className="shadow-md sticky top-0 z-50 bg-bg-primary border-b border-border-default">
//       <div className="container mx-auto px-4 md:px-2 py-3 lg:py-4 flex items-center justify-between">
//         <div className="hidden lg:flex items-center space-x-8 md:space-x-2">
//           <NavLink id="home">DashBoard</NavLink>
//           <NavLink id="table">Table</NavLink>
//           <NavLink id="menu">Menu</NavLink>
//           <NavLink id="billing">Billing</NavLink>
//           <NavLink id="users">Users</NavLink>
//         </div>

//         <div className="text-2xl lg:text-3xl font-serif italic text-action-primary">
//           {(clientId || 'APP').toUpperCase()}
//         </div>

//         <div className="hidden lg:flex items-center space-x-8">
//           <NavLink id="inventory">Inventory</NavLink>
//           <NavLink id="role">Role</NavLink>
//           <NavLink id="order">Order</NavLink>
//           <NavLink id="summary">Summary</NavLink>
//           <NavLink id="kds">KDS</NavLink>
//           <NavLink id="details">Details</NavLink>

//           <button
//             onClick={() => onLogout?.()}
//             className="px-2 py-1 rounded text-text-secondary hover:text-action-primary transition-colors"
//             aria-label="Logout"
//           >
//             Logout
//           </button>
//         </div>

//         {/* Mobile hamburger */}
//         <div className="lg:hidden flex items-center">
//           <button
//             onClick={() => setMobileOpen(prev => !prev)}
//             aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
//             aria-expanded={mobileOpen}
//             className="p-2 rounded-md hover:bg-bg-hover transition-all text-text-secondary"
//           >
//             <div className="relative w-6 h-6">
//               <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? 'rotate-45 top-2.5' : 'top-1'}`} />
//               <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? 'opacity-0' : 'top-2.5'}`} />
//               <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? '-rotate-45 top-2.5' : 'top-4'}`} />
//             </div>
//           </button>
//         </div>
//       </div>

//       {/* overlay */}
//       <div
//         className={`lg:hidden fixed inset-0 z-40 pointer-events-none transition-opacity duration-300 ${mobileOpen ? 'opacity-60 pointer-events-auto' : 'opacity-0'}`}
//         onClick={() => setMobileOpen(false)}
//         aria-hidden={!mobileOpen}
//         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
//       />

//       {/* Sliding panel */}
//       <nav
//         className={`lg:hidden fixed right-0 top-0 z-50 w-full max-w-xs h-full shadow-lg transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
//         aria-hidden={!mobileOpen}
//       >
//         <div className="p-4 border-b flex items-center justify-between border-border-default bg-bg-primary">
//           <div className="text-lg font-semibold text-text-primary">{clientId}</div>
//           <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md hover:bg-bg-hover text-text-secondary">✕</button>
//         </div>

//         <div className="p-4 space-y-3 bg-bg-primary">
//           <div className="flex flex-col space-y-1">
//             <NavLink id="home">DashBoard</NavLink>
//             <NavLink id="table">Table</NavLink>
//             <NavLink id="menu">Menu</NavLink>
//             <NavLink id="billing">Billing</NavLink>
//             <NavLink id="users">Users</NavLink>
//           </div>

//           <hr className="my-2 border-border-default" />

//           <div className="flex flex-col space-y-1">
//             <NavLink id="inventory">Inventory</NavLink>
//             <NavLink id="role">Role</NavLink>
//             <NavLink id="order">Order</NavLink>
//             <NavLink id="summary">Summary</NavLink>
//             <NavLink id="kds">KDS</NavLink>
//             <button
//               onClick={() => { onLogout?.(); setMobileOpen(false); }}
//               className="px-2 py-1 rounded text-text-secondary text-left hover:text-action-primary"
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//       </nav>
//     </header>
//   );
// };

// export default HeaderShared;





// ========================================================== // ========================================================= //
// ========================================================== // ========================================================= //
// ========================================================== // ========================================================= //

import { APP_ROOT } from '../../config/pathConfig';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';

export const navMap = {
    home:      (clientId) => `/${APP_ROOT}/${clientId}/home`,
    table:     (clientId) => `/${APP_ROOT}/${clientId}/managing-tables`,
    menu:      (clientId) => `/${APP_ROOT}/${clientId}/menu`,
    billing:   (clientId) => `/${APP_ROOT}/${clientId}/billing`,
    users:     (clientId) => `/${APP_ROOT}/${clientId}/users`,
    inventory: (clientId) => `/${APP_ROOT}/${clientId}/inventory`,
    role:      (clientId) => `/${APP_ROOT}/${clientId}/role`,
    order:     (clientId) => `/${APP_ROOT}/${clientId}/order`,
    summary:   (clientId) => `/${APP_ROOT}/${clientId}/summary`,
    kds:       (clientId) => `/${APP_ROOT}/${clientId}/kds`,
    details:   (clientId) => `/${APP_ROOT}/${clientId}/details`,
};

const HeaderShared = ({ onLogout }) => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setDarkMode(isDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle theme when clicking clientId
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Derive active key from pathname
  const deriveActive = () => {
    if (!clientId) return 'home';
    const path = location.pathname.replace(/\/+$/, '');
    const pair = Object.entries(navMap).find(([key, fn]) => {
      try { return fn(clientId) === path; } catch (e) { return false; }
    });
    return pair ? pair[0] : (path.includes('/managing-tables') ? 'table' : (path.includes('/order') ? 'order' : (path.includes('/summary') ? 'summary' : 'home')));
  };

  const active = deriveActive();

  const handleNavigate = (id) => {
    const fn = navMap[id];
    if (!fn) return;
    setMobileOpen(false);
    navigate(fn(clientId));
  };

  const NavLink = ({ id, children }) => {
    const isActive = active === id;
    return (
      <button
        onClick={() => handleNavigate(id)}
        className={`px-2 py-1 rounded transition-colors ${isActive ? 'text-action-primary font-semibold' : 'text-text-primary dark:text-text-secondary-dark hover:text-action-primary'}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {children}
      </button>
    );
  };

  return (
    <header className="shadow-md sticky top-0 z-50 bg-bg-primary dark:bg-bg-primary-dark border-b border-border-default dark:border-border-default-dark transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-2 py-3 lg:py-4 flex items-center justify-between">
        <div className="hidden lg:flex items-center space-x-8 md:space-x-2 text-text-primary">
          <NavLink id="home">DashBoard</NavLink>
          <NavLink id="table">Manage-Table</NavLink>
          <NavLink id="menu">Manage-Menu</NavLink>
          <NavLink id="billing">Billing</NavLink>
          <NavLink id="users">Users-Data</NavLink>
        </div>

        {/* ClientId with Theme Toggle - Click to change theme */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 text-2xl lg:text-3xl font-serif italic text-action-primary hover:text-action-primary-hover transition-colors duration-300 group"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span>{(clientId || 'APP').toUpperCase()}</span>
          {/* {darkMode ? (
            <Sun size={24} className="text-yellow-400 group-hover:rotate-180 transition-transform duration-500" />
          ) : (
            <Moon size={24} className="text-action-primary group-hover:-rotate-12 transition-transform duration-300" />
          )} */}
        </button>

        <div className="hidden lg:flex items-center space-x-8 text-text-primary">
          <NavLink id="inventory">Inventory</NavLink>
          <NavLink id="role">Role</NavLink>
          <NavLink id="order">Order</NavLink>
          <NavLink id="summary">Summary</NavLink>
          <NavLink id="kds">KDS</NavLink>
          <NavLink id="details">Details</NavLink>

          <button
            onClick={() => onLogout?.()}
            className="px-2 py-1 rounded text-text-primary dark:text-text-secondary-dark hover:text-action-primary transition-colors"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="p-2 rounded-md hover:bg-bg-tertiary dark:hover:bg-bg-tertiary-dark transition-all text-text-secondary dark:text-text-secondary-dark"
          >
            <div className="relative w-6 h-6">
              <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? 'rotate-45 top-2.5' : 'top-1'}`} />
              <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? 'opacity-0' : 'top-2.5'}`} />
              <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? '-rotate-45 top-2.5' : 'top-4'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 pointer-events-none transition-opacity duration-300 bg-black ${mobileOpen ? 'opacity-60 pointer-events-auto' : 'opacity-0'}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      {/* Sliding panel */}
      <nav
        className={`lg:hidden fixed right-0 top-0 z-50 w-full max-w-xs h-full shadow-lg transform transition-transform duration-300 bg-bg-primary dark:bg-bg-primary-dark ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!mobileOpen}
      >
        <div className="p-4 border-b flex items-center justify-between border-border-default dark:border-border-default-dark">
          <div className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">{clientId}</div>
          <button 
            onClick={() => setMobileOpen(false)} 
            className="p-2 rounded-md hover:bg-bg-tertiary dark:hover:bg-bg-tertiary-dark text-text-secondary dark:text-text-secondary-dark"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3 h-full overflow-y-auto">
          <div className="flex flex-col space-y-1">
            <NavLink id="home">DashBoard</NavLink>
            <NavLink id="table">Table</NavLink>
            <NavLink id="menu">Menu</NavLink>
            <NavLink id="billing">Billing</NavLink>
            <NavLink id="users">Users</NavLink>
          </div>

          <hr className="my-2 border-border-default dark:border-border-default-dark" />

          <div className="flex flex-col space-y-1">
            <NavLink id="inventory">Inventory</NavLink>
            <NavLink id="role">Role</NavLink>
            <NavLink id="order">Order</NavLink>
            <NavLink id="summary">Summary</NavLink>
            <NavLink id="kds">KDS</NavLink>
            <NavLink id="details">Details</NavLink>
            
            <button
              onClick={() => { onLogout?.(); setMobileOpen(false); }}
              className="px-2 py-1 rounded text-text-primary dark:text-text-secondary-dark text-left hover:text-action-primary"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default HeaderShared;