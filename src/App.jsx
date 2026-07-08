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
import { OperationGuardProvider } from './components/utils/Interceptors/OperationGaurdProvider';
import { jwtDecode } from 'jwt-decode';
import { setupAxiosInterceptors } from './components/utils/axiosConfig'
import { menuCache } from './components/utils/Menu-utils/menuCache';
import { NAV_TABS } from './components/Constants/Headers/Navtabs';
import RegisterPage from './components/MainComponents/UserServices/ClientRegister/Register';

const getVisibleNav = (token) => {
  try {
    const decoded = jwtDecode(token);
    const subscription = decoded.subscription || [];
    const allowedScreenIds = new Set(decoded.allowed_screen_ids || []);
    return allowedScreenIds.size > 0
      ? subscription.filter(tabId => {
          const tab = NAV_TABS.find(t => t.id === tabId);
          return tab && allowedScreenIds.has(tab.screen_id);
        })
      : subscription;
  } catch {
    return [];
  }
};

const screenRouteMap = {
  super_admin_v1: 'customer-data',  
  default_user: 'home',
  ecommerce_user_v1: 'home',
  super_user_v1: 'super-user-data',
};

// ─── Login wrapper ────────────────────────────────────────────────────────────
const LoginWrapper = ({ onLoginSuccess }) => {
  const { clientId } = useParams();
  return <LoginPage clientId={clientId || 'easyfood'} onLoginSuccess={onLoginSuccess} />;
};

const NavigateAfterLogin = ({ authState }) => {
  const { clientId } = useParams();
  const finalClientId = clientId || authState.clientId || 'easyfood';
  const specialRoute = screenRouteMap[authState.screenId];
  const visibleNav = getVisibleNav(authState.token);
  const firstAllowedTab = visibleNav[0] || 'home';
  const route = specialRoute || firstAllowedTab;
  return <Navigate to={`/saas/${finalClientId}/${route}`} replace />;
};

const HeaderSwitcher = ({ clientId, onLogout, subscription }) => {
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
  return <HeaderShared clientId={clientId} onLogout={onLogout} subscription={subscription} />;  {/* ← NEW */}
};

// ─── Authenticated app shell ──────────────────────────────────────────────────
const InnerAuthenticatedApp = ({ token, onLogout }) => {
  const decoded=jwtDecode(token);
  const { clientId } = useParams();
  const finalClientId = clientId || 'easyfood';
  const visibleNav = getVisibleNav(token);

  return (
    <OperationGuardProvider clientId={finalClientId} requesterId={decoded.user_id}>
      <HeaderSwitcher
        clientId={finalClientId}
        onLogout={onLogout}
        subscription={visibleNav}
      />

      <main>
        <RoutesManager
          token={token}
          clientId={finalClientId}
        />
      </main>
    </OperationGuardProvider>
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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authState, setAuthState] = useState(() => {
   const token= localStorage.getItem('access_token');
   let validToken = null;

if (token) {
  try {
    const decoded = jwtDecode(token);

    if (decoded.exp * 1000 > Date.now()) {
      validToken = token;
    } else {
      localStorage.removeItem("access_token");
      validToken = null;
    }
  } catch (e) {
    localStorage.removeItem("access_token");
    validToken = null;
  }
}
   const screenId= localStorage.getItem('screen_id');
   const clientId= localStorage.getItem('client_id');
    return {
      token: validToken,
      screenId,
      clientId,
      isAuthenticated: !!validToken,
    };
  });

  useEffect(() => {
    injectThemeVars();
    setupAxiosInterceptors();  setupAuthInterceptor(handleLogout);
  }, []);

  useEffect(() => {
    setupAuthInterceptor(handleLogout);
  }, []);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/saas\/([^/]+)/);
    if (match?.[1]) localStorage.setItem('client_id', match[1]);
  }, []);
  useEffect(() => {
    const refreshAccessToken = async () => {
      const refreshToken = localStorage.getItem("refresh_token");
  
      if (!refreshToken) {
        setCheckingAuth(false);
        return;
      }
      const clientId = localStorage.getItem("client_id") || "easyfood";

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/refresh`,
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
  
        if (!response.ok) {
          handleLogout();
          setCheckingAuth(false);
          return;
        }
  
        const data = await response.json();
  
        const newAccessToken = data.data.access_token;
  
        localStorage.setItem(
          "access_token",
          newAccessToken
        );
  
        setAuthState({
          token: newAccessToken,
          screenId: localStorage.getItem("screen_id"),
          clientId: localStorage.getItem("client_id"),
          isAuthenticated: true,
        });
      } catch (err) {
        handleLogout();
      } finally {
        setCheckingAuth(false);
      }
    };
    if (
      !authState.token &&
      localStorage.getItem("refresh_token")
    ) {
      refreshAccessToken();
    } else {
      setCheckingAuth(false);
    }
  }, []);
  const handleLoginSuccess = (accessToken, refreshToken,screenId, clientId, client) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem('screen_id', screenId || '');
    localStorage.setItem('client_id', clientId);
    localStorage.setItem('client', JSON.stringify(client || {}));

    setAuthState({
      token: accessToken,
      screenId,
      clientId,
      isAuthenticated: true,
    });
  };

  const handleLogout = () => {
    const clientId = localStorage.getItem('client_id');
    if (clientId) menuCache.invalidate(clientId);
    localStorage.removeItem('access_token');
    localStorage.removeItem('screen_id');
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("selected_client_id");
    localStorage.removeItem('menu_selected_category'); 
    localStorage.removeItem('client');   
    setAuthState(prev => ({
      token: null,
      screenId: null,
      clientId: prev.clientId, // keep clientId so redirect lands on correct tenant login
      isAuthenticated: false,
    }));
  };
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }
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

          <Route path="/saas/:clientId/register" element={<RegisterPage/>} />
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