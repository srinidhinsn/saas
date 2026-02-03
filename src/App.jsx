// import React, { useEffect, useState } from 'react';
// import {
//   BrowserRouter,
//   Routes,
//   Route,
//   Navigate,
//   useParams,
//   useLocation,
//   useNavigate
// } from 'react-router-dom';
// import { ToastContainer } from 'react-toastify';
// import LoginPage from './components/MainComponents/UserServices/Login';
// import HeaderShared from './components/Constants/Headers/HeaderShared';
// import RoutesManager from './components/Routes/RoutesManager';
// import { injectThemeVars } from './components/utils/injectThemeVars';
// import 'react-toastify/dist/ReactToastify.css';
// import { APP_ROOT } from './components/config/pathConfig';
// import { Edit2, Trash2 } from 'lucide-react';

// const buildPath = (clientId, page) => `/${APP_ROOT}/${clientId}/${page}`;

// const ClientLanding = () => {
//   const navigate = useNavigate();
//   const [clientId, setClientId] = useState('');

//   const submit = (e) => {
//     e?.preventDefault();
//     const trimmed = (clientId || '').trim();
//     if (!trimmed) return;
//     navigate(buildPath(trimmed, 'login'));
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
//       <div className="bg-bg-primary p-8 rounded-lg shadow-lg w-full max-w-md" style={{ border: '1px solid var(--color-border-default)' }}>
//         <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Enter your client ID</h2>
//         <form onSubmit={submit} className="space-y-4">
//           <input
//             value={clientId}
//             onChange={(e) => setClientId(e.target.value)}
//             placeholder="e.g. easyfood (no spaces)"
//             className="w-full p-3 rounded-lg border"
//             style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
//             autoFocus
//           />
//           <div className="flex gap-2">
//             <button
//               type="submit"
//               className="flex-1 py-2 rounded-lg"
//               style={{ backgroundColor: 'var(--color-action-primary)', color: 'var(--color-text-white)' }}
//             >
//               Go to Login
//             </button>
//             <button
//               type="button"
//               onClick={() => setClientId('')}
//               className="py-2 px-4 rounded-lg border"
//               style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-primary)' }}
//             >
//               Clear
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// const LoginWrapper = ({ onLoginSuccess }) => {
//   const { clientId } = useParams();
//   // if clientId missing - show landing instead of failing
//   if (!clientId) return <ClientLanding />;
//   return <LoginPage clientId={clientId} onLoginSuccess={onLoginSuccess} />;
// };

// const InnerAuthenticatedApp = ({ token, onLogout }) => {
//   const { clientId } = useParams();
//   if (!clientId) return <ClientLanding />;

//   return (
//     <>
//       <main>
//         <RoutesManager token={token} clientId={clientId}  onLogout={onLogout}/>
//       </main>
//     </>
//   );
// };

// const RedirectToLogin = () => {
//   const { clientId } = useParams();
//   if (!clientId) return <ClientLanding />;
//   return <Navigate to={buildPath(clientId, 'login')} replace />;
// };

// const FallbackPreserveClient = () => {
//   const loc = useLocation();
//   const parts = loc.pathname.split('/').filter(Boolean);
//   if (parts[0] === APP_ROOT && parts[1]) {
//     return <Navigate to={buildPath(parts[1], 'login')} replace />;
//   }
//   return <ClientLanding />;
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
//     localStorage.removeItem('delegated_token');
//     localStorage.removeItem('screen_id');
//   };

//   // context menu items (you can customize these)
//   const menuItems = [
//     { id: 'refresh', label: 'Refresh', onClick: () => window.location.reload() },
//     { id: 'back', label: 'Back', onClick: () => window.history.back() },
//     { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: (e, it) => console.log('edit', it) },
//     { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, onClick: (e, it) => console.log('delete', it) },
//   ];

//   return (
//     <BrowserRouter>
//       <div id="app-main" className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
//         <Routes>
//           {/* public auth routes */}
//           <Route path={`/${APP_ROOT}/:clientId/login`} element={<LoginWrapper onLoginSuccess={handleLoginSuccess} />} />
//           <Route path={`/${APP_ROOT}/:clientId/register`} element={<div className="p-8">Register (placeholder)</div>} />
//           <Route path={`/${APP_ROOT}/:clientId/forgot`} element={<div className="p-8">Forgot Password (placeholder)</div>} />
//           <Route path={`/${APP_ROOT}/:clientId/reset`} element={<div className="p-8">Reset Password (placeholder)</div>} />

//           {/* protected client app routes */}
//           <Route
//             path={`/${APP_ROOT}/:clientId/*`}
//             element={
//               isAuthenticated ? (
//                 <InnerAuthenticatedApp token={token} onLogout={handleLogout} />
//               ) : (
//                 <RedirectToLogin />
//               )
//             }
//           />

//           <Route path="/" element={<ClientLanding />} />

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

// export default App;


















import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import LoginPage from './components/MainComponents/UserServices/Login';
import HeaderShared from './components/Constants/Headers/HeaderShared';
import RoutesManager from './components/Routes/RoutesManager';
import { injectThemeVars } from './components/utils/injectThemeVars';
import 'react-toastify/dist/ReactToastify.css';
import Headers_V1 from './components/V1_Components/Headers/Headers_V1';

const LoginWrapper = ({ onLoginSuccess }) => {
  const { clientId } = useParams();
  return <LoginPage clientId={clientId || 'easyfood'} onLoginSuccess={onLoginSuccess} />;
};

const HeaderSwitcher = ({ clientId, onLogout }) => {
  const layoutScreen = localStorage.getItem('layout_screen');

  if (layoutScreen === 'user_v1') {
    return <Headers_V1 clientId={clientId} onLogout={onLogout} />;
  }

  return <HeaderShared clientId={clientId} onLogout={onLogout} />;
};

const InnerAuthenticatedApp = ({ token, onLogout }) => {
  const { clientId } = useParams();
  const finalClientId = clientId || 'easyfood';

  return (
    <>
      <HeaderSwitcher
        clientId={finalClientId}
        onLogout={onLogout}
      />

      <main>
        <RoutesManager
          token={token}
          clientId={finalClientId}
        />
      </main>
    </>
  );
};

const RedirectToLogin = () => {
  const { clientId } = useParams();
  const storedClientId = localStorage.getItem('client_id');
  const finalClientId = clientId || storedClientId || 'easyfood';

  return <Navigate to={`/saas/${finalClientId}/login`} replace />;
};


const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('access_token'));

  useEffect(() => {
    injectThemeVars();
  }, []);

  const handleLoginSuccess = (accessToken, screenId, clientId) => {
    localStorage.setItem('access_token', accessToken);
  
    // 🔥 FIX
    localStorage.setItem('layout_screen', screenId); 
    localStorage.setItem('client_id', clientId);
  
    setToken(accessToken);
    setIsAuthenticated(true);
  };
  

  
  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('screen_id');
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <Routes>
          {/* public auth routes: login/register/forgot/reset */}
          <Route path="/saas/:clientId/login" element={<LoginWrapper onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/saas/:clientId/register" element={<div className="p-8">Register (placeholder)</div>} />
          <Route path="/saas/:clientId/forgot" element={<div className="p-8">Forgot Password (placeholder)</div>} />
          <Route path="/saas/:clientId/reset" element={<div className="p-8">Reset Password (placeholder)</div>} />

          {/* Protected client app routes: any /saas/:clientId/* path (after login) */}
          <Route
            path="/saas/:clientId/*"
            element={
              isAuthenticated ? (
                <InnerAuthenticatedApp token={token} onLogout={handleLogout} />
              ) : (

                <RedirectToLogin />
              )
            }
          />

          {/* default: if path doesn't match, try to preserve clientId in url (if present) */}
          <Route
            path="/"
            element={
              <Navigate
                to={`/saas/${localStorage.getItem('client_id') || 'easyfood'}/login`}
                replace
              />
            }
          />

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

const FallbackPreserveClient = () => {
  const loc = useLocation();
  const parts = loc.pathname.split('/').filter(Boolean);

  if (parts[0] === 'saas' && parts[1]) {
    localStorage.setItem('client_id', parts[1]); // ✅ persist
    return <Navigate to={`/saas/${parts[1]}/login`} replace />;
  }

  const storedClientId = localStorage.getItem('client_id') || 'easyfood';
  return <Navigate to={`/saas/${storedClientId}/login`} replace />;
};


export default App;




