import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import LoginPage from './components/MainComponents/UserServices/Login';
import HeaderShared from './components/Constants/Headers/HeaderShared';
import RoutesManager from './components/Routes/RoutesManager';
import { injectThemeVars } from './components/utils/injectThemeVars';
import 'react-toastify/dist/ReactToastify.css';
import Headers_V1 from './components/V1_Components/Headers/Headers_V1';
import Super_Admin_Header from './components/Super_Admin/Headers/Super_Admin_Header';
import { setupAuthInterceptor } from './components/utils/authInterceptor';
import Header_Super_User from './components/Super_User/Header/Header_Super_User';

// ─── Screen → Route mapping (keep in sync with Login.jsx) ───────────────────
const screenRouteMap = {
  super_admin_v1: 'customer-data',
  default_user: 'home',
  ecommerce_user_v1: 'home',
  super_user_v1: 'home',
};

// ─── Login wrapper ────────────────────────────────────────────────────────────
const LoginWrapper = ({ onLoginSuccess }) => {
  const { clientId } = useParams();
  return <LoginPage clientId={clientId || 'easyfood'} onLoginSuccess={onLoginSuccess} />;
};


const NavigateAfterLogin = ({ authState }) => {
  const { clientId } = useParams();
  const finalClientId = clientId || authState.clientId || 'easyfood';
  const route = screenRouteMap[authState.screenId] || 'home';
  return <Navigate to={`/saas/${finalClientId}/${route}`} replace />;
};

const HeaderSwitcher = ({ clientId, onLogout }) => {
  const screenId = localStorage.getItem('screen_id');

  if (screenId === 'ecommerce_user_v1') {
    return <Headers_V1 clientId={clientId} onLogout={onLogout} />;
  }
  if (screenId === 'super_admin_v1') {
    return <Super_Admin_Header clientId={clientId} onLogout={onLogout} />;
  }
  if (screenId === 'super_user_v1') {
    return <Header_Super_User clientId={clientId} onLogout={onLogout} />;
  }
  // default fallback
  return <HeaderShared clientId={clientId} onLogout={onLogout} />;
};

// ─── Authenticated app shell ──────────────────────────────────────────────────
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
  const location = useLocation();
  const match = location.pathname.match(/^\/saas\/([^/]+)/);
  const urlClientId = match?.[1];
  const finalClientId = urlClientId || localStorage.getItem('client_id') || 'easyfood';
  localStorage.setItem('client_id', finalClientId);
  return <Navigate to={`/saas/${finalClientId}/login`} replace state={{ from: location }} />;
};

const FallbackPreserveClient = () => {
  const loc = useLocation();
  const parts = loc.pathname.split('/').filter(Boolean);

  if (parts[0] === 'saas' && parts[1]) {
    localStorage.setItem('client_id', parts[1]);
    return <Navigate to={`/saas/${parts[1]}/login`} replace />;
  }

  return <Navigate to={`/saas/${localStorage.getItem('client_id') || 'easyfood'}/login`} replace />;
};

// ─── Root App ─────────────────────────────────────────────────────────────────
const App = () => {
  const [authState, setAuthState] = useState(() => {
   const token= localStorage.getItem('access_token');
   const screenId= localStorage.getItem('screen_id');
   const clientId= localStorage.getItem('client_id');
    return {
      token,
      screenId,
      clientId,
      isAuthenticated: !!token,
    };
  });

  useEffect(() => {
    injectThemeVars();
  }, []);

  useEffect(() => {
    setupAuthInterceptor(handleLogout);
  }, []);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/saas\/([^/]+)/);
    if (match?.[1]) localStorage.setItem('client_id', match[1]);
  }, []);

  const handleLoginSuccess = (accessToken, screenId, clientId) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('screen_id', screenId || '');
    localStorage.setItem('client_id', clientId);

    setAuthState({
      token: accessToken,
      screenId,
      clientId,
      isAuthenticated: true,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('screen_id');

    setAuthState(prev => ({
      token: null,
      screenId: null,
      clientId: prev.clientId, // keep clientId so redirect lands on correct tenant login
      isAuthenticated: false,
    }));
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <Routes>

          <Route
            path="/saas/:clientId/login"
            element={
              authState.isAuthenticated
                ? <NavigateAfterLogin authState={authState} />
                : <LoginWrapper onLoginSuccess={handleLoginSuccess} />
            }
          />

          <Route path="/saas/:clientId/register" element={<div className="p-8">Register (placeholder)</div>} />
          <Route path="/saas/:clientId/forgot" element={<div className="p-8">Forgot Password (placeholder)</div>} />
          <Route path="/saas/:clientId/reset" element={<div className="p-8">Reset Password (placeholder)</div>} />

          <Route
            path="/saas/:clientId/*"
            element={
              authState.isAuthenticated
                ? <InnerAuthenticatedApp token={authState.token} onLogout={handleLogout} />
                : <RedirectToLogin />
            }
          />

          <Route
            path="/"
            element={
              <Navigate
                to={`/saas/${authState.clientId || 'easyfood'}/login`}
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

export default App;