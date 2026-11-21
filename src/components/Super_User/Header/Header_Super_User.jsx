import { APP_ROOT } from '../../config/pathConfig';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getValidToken } from '../../utils/Interceptors/Api';
import axios from 'axios';

export const navMap = {
  data: (clientId) => `/${APP_ROOT}/${clientId}/super-user-data`,
  home: (clientId) => `/${APP_ROOT}/${clientId}/home`,
  menu: (clientId) => `/${APP_ROOT}/${clientId}/menu`,
  billing: (clientId) => `/${APP_ROOT}/${clientId}/billing-super-user`,
  users: (clientId) => `/${APP_ROOT}/${clientId}/users`,
  inventory: (clientId) => `/${APP_ROOT}/${clientId}/inventory`,
  role: (clientId) => `/${APP_ROOT}/${clientId}/role`,
  order: (clientId) => `/${APP_ROOT}/${clientId}/order-place`,
  summary: (clientId) => `/${APP_ROOT}/${clientId}/order-summary`,
  kds: (clientId) => `/${APP_ROOT}/${clientId}/kds`,
  details: (clientId) => `/${APP_ROOT}/${clientId}/details`,
  documents: (clientId) => `/${APP_ROOT}/${clientId}/documents`,
  profile: (clientId) => `/${APP_ROOT}/${clientId}/user-profile`,
};

const Header_Super_User = ({ onLogout }) => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const deriveActive = () => {
    if (!clientId) return 'data';
    const path = location.pathname.replace(/\/+$/, '');
    const pair = Object.entries(navMap).find(([, fn]) => {
      try { return fn(clientId) === path; } catch { return false; }
    });
    if (pair) return pair[0];
    if (path.includes('/order-summary')) return 'summary';
    if (path.includes('/order-place')) return 'order';
    return 'data';
  };
  const active = deriveActive();

  const handleNavigate = (id) => {
    const fn = navMap[id];
    if (!fn) return;
    setMobileOpen(false);
    setProfileOpen(false);
    navigate(fn(clientId));
  };

  useEffect(() => {
    if (!clientId) return;
    const token = getValidToken();
    if (!token) return;
    axios
      .get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realm`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const clients = res.data?.data?.clients || [];
        const match = clients.find((c) => c.id === clientId);
        if (match?.name) setClientName(match.name);
      })
      .catch(() => {});
  }, [clientId]);

  const displayLabel = clientName || (clientId || 'APP').toUpperCase();

  const tabClass = (id) => `ui-tab ${active === id ? 'ui-tab-active' : ''}`;

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-line shadow-tabs font-inter">
      <div className="max-w-page mx-auto px-page-x py-2 flex items-center justify-between">
        {/* Brand */}
        <button
          type="button"
          onClick={() => handleNavigate('data')}
          className="text-[1.25rem] leading-tight font-bold text-brand-dark tracking-tight hover:text-brand transition-colors"
        >
          {displayLabel}
        </button>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-tabs">
          <button type="button" className={tabClass('summary')} onClick={() => handleNavigate('summary')}>
            Summary
          </button>

          <div className="relative group">
            <button
              type="button"
              className={tabClass('profile')}
              onClick={() => setProfileOpen((p) => !p)}
              aria-expanded={profileOpen}
            >
              Profile
            </button>
            <div
              className={`absolute right-0 mt-1 w-32 ui-panel !p-1 !mb-0 shadow-soft transition-all duration-fast
                          opacity-0 invisible translate-y-1
                          group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
                          ${profileOpen ? '!opacity-100 !visible !translate-y-0' : ''}`}
            >
              <button
                type="button"
                onClick={() => handleNavigate('profile')}
                className="w-full text-left px-3 py-2 rounded-button-sm text-ui font-semibold text-ink-soft hover:bg-brand-light hover:text-brand-dark"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => onLogout?.()}
                className="w-full text-left px-3 py-2 rounded-button-sm text-ui font-semibold text-ink-soft hover:bg-brand-light hover:text-brand-dark"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((p) => !p)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="lg:hidden ui-btn !px-2"
        >
          <span className="relative block w-5 h-4">
            <span className={`absolute left-0 right-0 h-0.5 bg-current transition-all duration-normal ${mobileOpen ? 'rotate-45 top-[7px]' : 'top-0'}`} />
            <span className={`absolute left-0 right-0 h-0.5 bg-current transition-all duration-normal top-[7px] ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`absolute left-0 right-0 h-0.5 bg-current transition-all duration-normal ${mobileOpen ? '-rotate-45 top-[7px]' : 'top-[14px]'}`} />
          </span>
        </button>
      </div>

      {/* Mobile overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-backdrop transition-opacity duration-normal ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      {/* Mobile drawer */}
      <nav
        className={`lg:hidden fixed right-0 top-0 z-50 w-full max-w-xs h-full bg-surface shadow-modal-lg transform transition-transform duration-normal ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!mobileOpen}
      >
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="text-body-sm font-bold text-brand-dark uppercase truncate">{displayLabel}</div>
          <button type="button" className="ui-btn !px-2" onClick={() => setMobileOpen(false)} aria-label="Close menu">✕</button>
        </div>

        <div className="p-3 space-y-1 overflow-y-auto h-full">
          {[
            ['order', 'Order'],
            ['summary', 'Summary'],
            ['kds', 'KDS'],
            ['profile', 'Profile'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleNavigate(id)}
              className={`w-full text-left ${tabClass(id)}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { onLogout?.(); setMobileOpen(false); }}
            className="w-full text-left ui-tab"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header_Super_User;