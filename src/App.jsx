import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, useNavigate } from 'react-router-dom';
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

const LoginWrapper = ({ onLoginSuccess }) => {
  const { clientId } = useParams();
  return <LoginPage clientId={clientId || 'easyfood'} onLoginSuccess={onLoginSuccess} />;
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

  // extract tenant directly from URL
  const match = location.pathname.match(/^\/saas\/([^\/]+)/);
  const urlClientId = match?.[1];

  const storedClientId = localStorage.getItem('client_id');

  const finalClientId = urlClientId || storedClientId || 'easyfood';

  // ALWAYS repair storage
  localStorage.setItem('client_id', finalClientId);

  return <Navigate to={`/saas/${finalClientId}/login`} replace state={{ from: location }} />;
};

const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('access_token'));


  useEffect(() => {
    injectThemeVars();
  }, []);

  const handleLoginSuccess = (accessToken, screenId, clientId) => {
    setToken(accessToken);
    setIsAuthenticated(true);

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('screen_id', screenId || '');
    localStorage.setItem('client_id', clientId);
  };

  const handleLogout = () => {
    const match = location.pathname.match(/^\/saas\/([^\/]+)/);
    const urlClientId = match?.[1];
    const storedClientId = localStorage.getItem('client_id');

    const finalClientId = urlClientId || storedClientId || 'easyfood';

    localStorage.removeItem('access_token');
    localStorage.removeItem('screen_id');

    setToken(null);
    setIsAuthenticated(false);
  };
  useEffect(() => {
    setupAuthInterceptor(handleLogout);
  }, []);
  useEffect(() => {
    const match = window.location.pathname.match(/^\/saas\/([^\/]+)/);
    if (match?.[1]) {
      localStorage.setItem('client_id', match[1]);
    }
  }, []);

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



