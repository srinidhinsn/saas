// import React from 'react'
// import Working from './components/Working'
// import OrderSummaryVisible from './components/order-modals/OrderActionsModal'
// import TakeAnOrder from './components/TakeOrder'

// const App = () => {
//   return (
//     <div>
//       <Working />
//     </div>
//   )
// }

// export default App



// // App.jsx - Shared Header + simple client-side navigation
// import React, { useState } from 'react';
// import Working from './components/Working';
// import OrderSummaryVisible from './components/order-modals/OrderActionsModal';

// // Reusable Header that notifies parent when a link is clicked
// export const HeaderShared = ({ active, onNavigate ,clientId}) => {
//   const Link = ({ id, children }) => (
//     <button
//       onClick={() => onNavigate(id)}
//       className={`px-3 py-1 rounded ${active === id ? 'text-orange-500 font-semibold' : 'text-gray-700 hover:text-orange-500'}`}
//     >
//       {children}
//     </button>
//   );

//   return (
//     <header className="bg-white shadow-md sticky top-0 z-50">
//       <div className="container mx-auto px-4 py-3 lg:py-4 flex items-center justify-between">
//         <div className="hidden lg:flex items-center space-x-8">
//           <Link id="home">DashBoard</Link>
//           <Link id="table">Table</Link>
//           <Link id="menu">Menu</Link>
//           <Link id="billing">Billing</Link>
//           <Link id="users">Users</Link>
//         </div>

//         <div className="text-2xl lg:text-3xl font-serif italic">{clientId}</div>

//         <div className="hidden lg:flex items-center space-x-8">

//           <Link id="inventory">Inventory</Link>
//           <Link id="role">Role</Link>
//           <Link id="order">Order</Link>
//           <Link id="summary">Summary</Link>
//           <Link id="kds">KDS</Link>
//         </div>

//         <button className="lg:hidden text-gray-700" aria-label="open-menu"> 
//           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
//           </svg>
//         </button>
//       </div>
//     </header>
//   );
// };

// const App = () => {
// const clientId='easyfood'
// const token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNDYxZThjYzYtYTg5Ny01OWIzLTlmMGUtMWYyZTE5Y2QxNzljIiwicm9sZXMiOlsiQWRtaW4iXSwiY2xpZW50X2lkIjoiZWFzeWZvb2QiLCJncmFudHMiOlsicmVzdGF1cmFudCIsImVsZWN0cm9uaWNzIl0sInJlYWxtIjoicmVzdGF1cmFudCIsImV4cCI6MTc2MzQ1MDExMH0.CQUHYtsQ7uvfLXwx-e5A5xfsEF-wR1fLDR-lLhVzcBc'
//   const [activePage, setActivePage] = useState('order');

//   const handleNavigate = (pageId) => {
//     // map legacy ids to our pages
//     if (pageId === 'order') setActivePage('order');
//     else if (pageId === 'summary') setActivePage('summary');
//     else if (pageId === 'home') setActivePage('home');
//     else setActivePage(pageId);
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <HeaderShared active={activePage} onNavigate={handleNavigate} token={token} clientId={clientId}/>

//       <main>
//         {activePage === 'order' && <Working token={token} clientId={clientId}/>}
//         {activePage === 'summary' && <OrderSummaryVisible token={token} clientId={clientId}/>}
//         {activePage === 'home' && (
//           <div className="container mx-auto px-4 py-12 text-center">
//             <h2 className="text-2xl font-semibold">Welcome to {clientId}</h2>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// };

// export default App;





// import React, { useState, useEffect } from 'react';
// import Working from './components/Working';
// import OrderSummaryVisible from './components/order-modals/OrderActionsModal';
// import RestaurantManagement from './components/TableManagement';
// import { injectThemeVars } from '../src/components/utils/injectThemeVars';
// import LoginPage from './components/MainComponents/UserServices/Login';

// export const HeaderShared = ({ active, onNavigate, clientId, onLogout }) => {
//   const [mobileOpen, setMobileOpen] = useState(false);

//   useEffect(() => {
//     if (mobileOpen) {
//       document.body.style.overflow = 'hidden';
//     } else {
//       document.body.style.overflow = '';
//     }
//     return () => { document.body.style.overflow = ''; };
//   }, [mobileOpen]);

//   const Link = ({ id, children }) => {
//     const isActive = active === id;
//     const style = {
//       color: isActive ? 'var(--color-action-primary)' : 'var(--color-text-secondary)',
//     };

//     return (
//       <button
//         onClick={() => {
//           onNavigate(id);
//           setMobileOpen(false);
//         }}
//         className="px-2 py-1 rounded transition-colors"
//         style={style}
//         aria-current={isActive ? 'page' : undefined}
//       >
//         <span style={{ fontWeight: isActive ? 600 : 400 }}>{children}</span>
//       </button>
//     );
//   };

//   return (
//     <header
//       className="shadow-md sticky top-0 z-50"
//       style={{ backgroundColor: 'var(--color-bg-primary)' }}
//     >
//       <div className="container mx-auto px-4 md:px-2 py-3 lg:py-4 flex items-center justify-between">
//         {/* left links - visible on lg and above */}
//         <div className="hidden lg:flex items-center space-x-8 md:space-x-2">
//           <Link id="home">DashBoard</Link>
//           <Link id="table">Table</Link>
//           <Link id="menu">Menu</Link>
//           <Link id="inventory">Inventory</Link> 
//           <Link id="users">Users</Link>
//           <Link id="role">Role</Link>

//         </div>

//         <div
//           className="text-2xl lg:text-3xl font-serif italic"
//           style={{ color: 'var(--color-action-primary)' }}
//         >
//           {clientId.toUpperCase()}
//         </div>

//         {/* right links - visible on lg and above */}
//         <div className="hidden lg:flex items-center space-x-8">

//           <Link id="order">Order</Link>
//           <Link id="summary">Summary</Link>
//           <Link id="kds">KDS</Link>
//           <Link id="billing">Billing</Link>
//           <Link id="details">Details</Link>
//           <button
//             onClick={onLogout}
//             className="px-2 py-1 rounded transition-colors"
//             style={{ color: 'var(--color-text-secondary)' }}
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
//             className="p-2 rounded-md hover:bg-gray-100 transition-all"
//             style={{ color: 'var(--color-text-secondary)' }}
//           >
//             <div className="relative w-6 h-6" style={{ color: 'currentColor' }}>
//               <span
//                 className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? 'rotate-45 top-2.5' : 'top-1'}`}
//               />
//               <span
//                 className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? 'opacity-0' : 'top-2.5'}`}
//               />
//               <span
//                 className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? '-rotate-45 top-2.5' : 'top-4'}`}
//               />
//             </div>
//           </button>
//         </div>
//       </div>

//       {/* overlay */}
//       <div
//         className={`lg:hidden fixed inset-0 z-40 pointer-events-none transition-opacity duration-300 ${mobileOpen ? 'opacity-60 pointer-events-auto' : 'opacity-0'}`}
//         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
//         onClick={() => setMobileOpen(false)}
//         aria-hidden={!mobileOpen}
//       />

//       {/* Sliding panel */}
//       <nav
//         className={`lg:hidden fixed right-0 top-0 z-50 w-full max-w-xs h-full shadow-lg transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
//         aria-hidden={!mobileOpen}
//         style={{ backgroundColor: 'var(--color-bg-primary)', borderLeft: `1px solid var(--color-border-default)` }}
//       >
//         <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-default)' }}>
//           <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{clientId}</div>
//           <button
//             onClick={() => setMobileOpen(false)}
//             aria-label="Close menu"
//             className="p-2 rounded-md hover:bg-gray-100 transition-colors"
//             style={{ color: 'var(--color-text-secondary)' }}
//           >
//             ✕
//           </button>
//         </div>

//         <div className="p-4 space-y-3">
//           <div className="flex flex-col space-y-1">
//             <Link id="home">DashBoard</Link>
//             <Link id="table">Table</Link>
//             <Link id="menu">Menu</Link>
//             <Link id="billing">Billing</Link>
//             <Link id="users">Users</Link>
//           </div>

//           <hr className="my-2" style={{ borderColor: 'var(--color-border-default)' }} />

//           <div className="flex flex-col space-y-1">
//             <Link id="inventory">Inventory</Link>
//             <Link id="role">Role</Link>
//             <Link id="order">Order</Link>
//             <Link id="summary">Summary</Link>
//             <Link id="kds">KDS</Link>
//             <button
//               onClick={() => {
//                 onLogout();
//                 setMobileOpen(false);
//               }}
//               className="px-2 py-1 rounded transition-colors text-left"
//               style={{ color: 'var(--color-text-secondary)' }}
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//       </nav>
//     </header>
//   );
// };

// const App = () => {
//   const clientId = 'easyfood';
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [token, setToken] = useState(null);
//   const [activePage, setActivePage] = useState('home');

//   // Check for existing token on mount
//   useEffect(() => {
//     const storedToken = localStorage.getItem('access_token');
//     if (storedToken) {
//       setToken(storedToken);
//       setIsAuthenticated(true);
//     }
//   }, []);

//   useEffect(() => {
//     injectThemeVars();
//   }, []);

//   const handleLoginSuccess = (accessToken, screenId) => {
//     setToken(accessToken);
//     setIsAuthenticated(true);
//     localStorage.setItem('access_token', accessToken);
//     localStorage.setItem('screen_id', screenId);
//   };

//   const handleLogout = () => {
//     setIsAuthenticated(false);
//     setToken(null);
//     setActivePage('home');
//     localStorage.removeItem('access_token');
//     localStorage.removeItem('screen_id');
//   };

//   const handleNavigate = (pageId) => {
//     setActivePage(pageId);
//   };

//   // If not authenticated, show login page
//   if (!isAuthenticated) {
//     return <LoginPage clientId={clientId} onLoginSuccess={handleLoginSuccess} />;
//   }

//   // If authenticated, show the main app
//   return (
//     <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
//       <HeaderShared 
//         active={activePage} 
//         onNavigate={handleNavigate} 
//         clientId={clientId}
//         onLogout={handleLogout}
//       />

//       <main>
//         {activePage === 'order' && <Working token={token} clientId={clientId} />}
//         {activePage === 'summary' && <OrderSummaryVisible token={token} clientId={clientId} />}
//         {activePage === 'table' && <RestaurantManagement token={token} clientId={clientId} />}
//         {activePage === 'home' && (
//           <div className="container mx-auto px-4 py-12 text-center">
//             <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
//               Welcome to {clientId}
//             </h2>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// };

// export default App;





// import React, { useEffect, useState } from 'react';
// import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
// import { ToastContainer } from 'react-toastify';
// import LoginPage from './components/MainComponents/UserServices/Login';
// import HeaderShared from './components/Constants/Headers/HeaderShared';
// import RoutesManager from './components/Routes/RoutesManager';
// import { injectThemeVars } from './components/utils/injectThemeVars';
// import 'react-toastify/dist/ReactToastify.css';

// const LoginWrapper = ({ onLoginSuccess }) => {
//   const { clientId } = useParams();
//   return <LoginPage clientId={clientId || 'easyfood'} onLoginSuccess={onLoginSuccess} />;
// };

// const InnerAuthenticatedApp = ({ token, onLogout }) => {
//   const { clientId } = useParams();

//   return (
//     <>
//       <HeaderShared clientId={clientId || 'easyfood'} onLogout={onLogout} />
//       <main>
//         <RoutesManager token={token} clientId={clientId || 'easyfood'} />
//       </main>
//     </>
//   );
// };
// const RedirectToLogin = () => {
//   const { clientId } = useParams();
//   const target = `/saas/${clientId || 'easyfood'}/login`;
//   return <Navigate to={target} replace />;
// };

// const App = () => {
//   const [token, setToken] = useState(() => localStorage.getItem('access_token'));
//   const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('access_token'));

//   useEffect(() => {
//     injectThemeVars();
//   }, []);

//   const handleLoginSuccess = (accessToken, screenId) => {
//     setToken(accessToken);
//     setIsAuthenticated(true);
//     localStorage.setItem('access_token', accessToken);
//     localStorage.setItem('screen_id', screenId || '');
//   };

//   const handleLogout = () => {
//     setToken(null);
//     setIsAuthenticated(false);
//     localStorage.removeItem('access_token');
//     localStorage.removeItem('screen_id');
//   };

//   return (
//     <BrowserRouter>
//       <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
//         <Routes>
//           {/* public auth routes: login/register/forgot/reset */}
//           <Route path="/saas/:clientId/login" element={<LoginWrapper onLoginSuccess={handleLoginSuccess} />} />
//           <Route path="/saas/:clientId/register" element={<div className="p-8">Register (placeholder)</div>} />
//           <Route path="/saas/:clientId/forgot" element={<div className="p-8">Forgot Password (placeholder)</div>} />
//           <Route path="/saas/:clientId/reset" element={<div className="p-8">Reset Password (placeholder)</div>} />

//           {/* Protected client app routes: any /saas/:clientId/* path (after login) */}
//           <Route
//             path="/saas/:clientId/*"
//             element={
//               isAuthenticated ? (
//                 <InnerAuthenticatedApp token={token} onLogout={handleLogout} />
//               ) : (
              
//                 <RedirectToLogin />
//               )
//             }
//           />

//           {/* default: if path doesn't match, try to preserve clientId in url (if present) */}
//           <Route path="/" element={<Navigate to="/saas/easyfood/login" replace />} />
//           <Route path="*" element={<FallbackPreserveClient />} />
//         </Routes>

//         <ToastContainer
//           position="top-right"
//           autoClose={2500}
//           hideProgressBar={false}
//           newestOnTop={false}
//           closeOnClick
//           rtl={false}
//           pauseOnFocusLoss
//           draggable
//           theme="light"
//         />
//       </div>
//     </BrowserRouter>
//   );
// };

// const FallbackPreserveClient = () => {
//   const loc = useLocation();
//   const parts = loc.pathname.split('/').filter(Boolean);
//   if (parts[0] === 'saas' && parts[1]) {
//     return <Navigate to={`/saas/${parts[1]}/login`} replace />;
//   }
//   return <Navigate to={`/saas/easyfood/login`} replace />;
// };

// export default App;


















// src/App.jsx
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import LoginPage from './components/MainComponents/UserServices/Login';
import HeaderShared from './components/Constants/Headers/HeaderShared';
import RoutesManager from './components/Routes/RoutesManager';
import { injectThemeVars } from './components/utils/injectThemeVars';
import 'react-toastify/dist/ReactToastify.css';
import { APP_ROOT } from './components/config/pathConfig';
// import CustomContextMenu from './components/customizations/CustomContextMenu';
import { Edit2, Trash2 } from 'lucide-react';

/**
 * Build a path for a client and page using APP_ROOT.
 * Example: buildPath('easyfood', 'login') -> '/saas/application/easyfood/login'
 */
const buildPath = (clientId, page) => `/${APP_ROOT}/${clientId}/${page}`;

/* ---------------------------
   Small landing page to ask for clientId
   --------------------------- */
const ClientLanding = () => {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState('');

  const submit = (e) => {
    e?.preventDefault();
    const trimmed = (clientId || '').trim();
    if (!trimmed) return;
    navigate(buildPath(trimmed, 'login'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="bg-bg-primary p-8 rounded-lg shadow-lg w-full max-w-md" style={{ border: '1px solid var(--color-border-default)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Enter your client ID</h2>
        <form onSubmit={submit} className="space-y-4">
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="e.g. easyfood (no spaces)"
            className="w-full p-3 rounded-lg border"
            style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--color-action-primary)', color: 'var(--color-text-white)' }}
            >
              Go to Login
            </button>
            <button
              type="button"
              onClick={() => setClientId('')}
              className="py-2 px-4 rounded-lg border"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-primary)' }}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------------------------
   Login wrapper - reads clientId from params
   --------------------------- */
const LoginWrapper = ({ onLoginSuccess }) => {
  const { clientId } = useParams();
  // if clientId missing - show landing instead of failing
  if (!clientId) return <ClientLanding />;
  return <LoginPage clientId={clientId} onLoginSuccess={onLoginSuccess} />;
};

/* ---------------------------
   Component rendered when authenticated.
   Reads clientId from params and passes it down.
   --------------------------- */
const InnerAuthenticatedApp = ({ token, onLogout }) => {
  const { clientId } = useParams();
  if (!clientId) return <ClientLanding />;

  return (
    <>
      <HeaderShared clientId={clientId} onLogout={onLogout} />
      <main>
        <RoutesManager token={token} clientId={clientId} />
      </main>
    </>
  );
};

/* ---------------------------
   Redirect to the client login using clientId from params.
   If clientId missing, show landing (so user provides one).
   --------------------------- */
const RedirectToLogin = () => {
  const { clientId } = useParams();
  if (!clientId) return <ClientLanding />;
  return <Navigate to={buildPath(clientId, 'login')} replace />;
};

/* ---------------------------
   Fallback route: try to preserve clientId from current path segments.
   If path looks like /<APP_ROOT>/<clientId>/..., redirect to that client's login.
   Else show landing.
   --------------------------- */
const FallbackPreserveClient = () => {
  const loc = useLocation();
  const parts = loc.pathname.split('/').filter(Boolean);
  if (parts[0] === APP_ROOT && parts[1]) {
    return <Navigate to={buildPath(parts[1], 'login')} replace />;
  }
  return <ClientLanding />;
};

/* ---------------------------
   App (Router root)
   - does not hardcode any clientId anywhere
   - uses params and landing screen to obtain clientId if missing
   - mounts CustomContextMenu targeted at the app root (#app-main)
   --------------------------- */
const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('access_token'));

  useEffect(() => {
    injectThemeVars();
  }, []);

  const handleLoginSuccess = (accessToken, screenId) => {
    setToken(accessToken);
    setIsAuthenticated(true);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('screen_id', screenId || '');
  };

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('screen_id');
  };

  // context menu items (you can customize these)
  const menuItems = [
    { id: 'refresh', label: 'Refresh', onClick: () => window.location.reload() },
    { id: 'back', label: 'Back', onClick: () => window.history.back() },
    { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: (e, it) => console.log('edit', it) },
    { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, onClick: (e, it) => console.log('delete', it) },
  ];

  return (
    <BrowserRouter>
      {/* Mount custom menu and target the main app container via selector="#app-main" */}
      {/* <CustomContextMenu items={menuItems} selector="#app-main" /> */}

      {/* IMPORTANT: add id="app-main" so the CustomContextMenu selector matches */}
      <div id="app-main" className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <Routes>
          {/* public auth routes */}
          <Route path={`/${APP_ROOT}/:clientId/login`} element={<LoginWrapper onLoginSuccess={handleLoginSuccess} />} />
          <Route path={`/${APP_ROOT}/:clientId/register`} element={<div className="p-8">Register (placeholder)</div>} />
          <Route path={`/${APP_ROOT}/:clientId/forgot`} element={<div className="p-8">Forgot Password (placeholder)</div>} />
          <Route path={`/${APP_ROOT}/:clientId/reset`} element={<div className="p-8">Reset Password (placeholder)</div>} />

          {/* protected client app routes */}
          <Route
            path={`/${APP_ROOT}/:clientId/*`}
            element={
              isAuthenticated ? (
                <InnerAuthenticatedApp token={token} onLogout={handleLogout} />
              ) : (
                <RedirectToLogin />
              )
            }
          />

          {/* root path -> landing (user provides clientId) */}
          <Route path="/" element={<ClientLanding />} />

          {/* catch all -> try to preserve clientId otherwise landing */}
          <Route path="*" element={<FallbackPreserveClient />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={2500}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          theme="light"
        />
      </div>
    </BrowserRouter>
  );
};

export default App;
