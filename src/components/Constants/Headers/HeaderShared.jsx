
import { APP_ROOT } from '../../config/pathConfig';

import React, { useEffect, useState } from 'react';

import { useNavigate, useParams, useLocation } from 'react-router-dom';

import { getValidToken } from '../../utils/Interceptors/Api';

import axios from 'axios';

import { NAV_TABS } from './Navtabs';

import logo from '../../../../public/logo.png';

import { LayoutDashboard, ShoppingCart, Monitor, ChartNoAxesCombined, Receipt, Table2, Utensils, Boxes, Users, UserRound, MoreVertical  } from 'lucide-react';



// Replace this with your actual Tekhawk logo PNG path.

const TEKHAWK_LOGO_PATH = logo;



export const navMap = {

  home: (clientId) => `/${APP_ROOT}/${clientId}/home`,

  table: (clientId) => `/${APP_ROOT}/${clientId}/sub-tables`,

  menu: (clientId) => `/${APP_ROOT}/${clientId}/menu`,

  billing: (clientId) => `/${APP_ROOT}/${clientId}/billing`,

  users: (clientId) => `/${APP_ROOT}/${clientId}/users`,

  inventory: (clientId) => `/${APP_ROOT}/${clientId}/inventory`,

  role: (clientId) => `/${APP_ROOT}/${clientId}/role`,

  order: (clientId) => `/${APP_ROOT}/${clientId}/order`,

  summary: (clientId) => `/${APP_ROOT}/${clientId}/summary`,

  kds: (clientId) => `/${APP_ROOT}/${clientId}/kds`,

  details: (clientId) => `/${APP_ROOT}/${clientId}/details`,

  documents: (clientId) => `/${APP_ROOT}/${clientId}/documents`,

  profile: (clientId) => `/${APP_ROOT}/${clientId}/user-profile`,

  counter: (clientId) => `/${APP_ROOT}/${clientId}/counter`,

};



const NAV_ICONS = {

  home: LayoutDashboard,

  order: ShoppingCart,

  kds: Monitor,

  summary: ChartNoAxesCombined,

  billing: Receipt,

  table: Table2,

  menu: Utensils,

  inventory: Boxes,

  users: Users,

  profile: UserRound,

};



const LEFT_NAV_ORDER = ['home', 'order', 'kds', 'summary', 'billing'];

const RIGHT_NAV_ORDER = ['table', 'menu', 'inventory', 'counter', 'users'];

const MOBILE_NAV_ORDER = ['home', 'order', 'kds', 'summary', 'billing', 'table', 'menu', 'inventory', 'users', 'profile'];



const HeaderShared = ({ onLogout, subscription = [] }) => {

  const navigate = useNavigate();

  const { clientId } = useParams();

  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);



  const subscribedSet = new Set(subscription);

  const visibleTabs = NAV_TABS.filter(tab => subscribedSet.has(tab.id));

  const isVisible = (id) => subscribedSet.has(id);



  const leftTabs = visibleTabs

    .filter(tab => LEFT_NAV_ORDER.includes(tab.id))

    .sort((a, b) => LEFT_NAV_ORDER.indexOf(a.id) - LEFT_NAV_ORDER.indexOf(b.id));



  const rightTabs = visibleTabs

    .filter(tab => RIGHT_NAV_ORDER.includes(tab.id))

    .sort((a, b) => RIGHT_NAV_ORDER.indexOf(a.id) - RIGHT_NAV_ORDER.indexOf(b.id));



  const mobileTabs = visibleTabs

    .filter(tab => MOBILE_NAV_ORDER.includes(tab.id))

    .sort((a, b) => MOBILE_NAV_ORDER.indexOf(a.id) - MOBILE_NAV_ORDER.indexOf(b.id));



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

    setProfileOpen(false);

    navigate(fn(clientId));

  };



  const NavLink = ({ id, children }) => {

    const isActive = active === id;

    const Icon = NAV_ICONS[id];

    return (

      <button

        type="button"

        onClick={() => handleNavigate(id)}

        className={`

          ui-tab

          !px-2 !py-[2.5px] !text-base !leading-6

          inline-flex items-center gap-1.5 whitespace-nowrap

          ${isActive ? 'ui-tab-active' : ''}

        `}

        aria-current={isActive ? 'page' : undefined}

      >

        {Icon && <Icon size={17} strokeWidth={1.9} className="shrink-0" />}

        {children}

      </button>

    );

  };



  const clientData = JSON.parse(localStorage.getItem('client') || 'null');

  const displayLabel = clientData?.name || (clientId || 'APP').toUpperCase();



  return (

    <>

      <header className="sticky top-0 z-50 bg-bg-primary dark:bg-bg-primary-dark border-b border-brand-tab-line shadow-tabs transition-colors duration-300">



        {/* Desktop Header */}

        <div className="mx-auto px-4 md:px-2 py-3 lg:py-4 flex items-center justify-between">



          {/* Left Navigation Tabs */}

          <div className="hidden lg:flex items-center space-x-8 md:space-x-2 text-ink-tab">

            {leftTabs.map(tab => (

              <NavLink key={tab.id} id={tab.id}>{tab.label}</NavLink>

            ))}

          </div>



          {/* Client Name - Centre */}

          <button

            type="button"

            onClick={() => handleNavigate('home')}

            className="text-xl lg:text-xl font-semibold tracking-tight text-brand-dark hover:text-brand transition-colors duration-200 shrink-0"

          >

            <span>{displayLabel}</span>

          </button>



          {/* Right Navigation Tabs */}

          <div className="hidden lg:flex items-center space-x-8 text-ink-tab">

            {rightTabs.map(tab => (

              <NavLink key={tab.id} id={tab.id}>{tab.label}</NavLink>

            ))}



            {isVisible('profile') && (

              <div className="relative">

                <button

                  type="button"

                  onClick={() => setProfileOpen(prev => !prev)}

                  className={`ui-tab !px-2 !py-[2.5px] !text-base !leading-6 inline-flex items-center justify-center ${active === 'profile' || profileOpen ? 'ui-tab-active' : ''}`}

                  aria-label="More options"

                  aria-expanded={profileOpen}

                >

                  <MoreVertical size={20} strokeWidth={2} />

                </button>



                {profileOpen && (

                  <>

                    <button

                      type="button"

                      className="fixed inset-0 z-40 cursor-default"

                      onClick={() => setProfileOpen(false)}

                      aria-label="Close menu"

                    />



                    <div className="absolute right-0 top-full mt-2 z-50 w-44 bg-surface border border-brand-line rounded-panel shadow-soft overflow-hidden">

                      <button

                        type="button"

                        onClick={() => handleNavigate('profile')}

                        className={`w-full px-4 py-3 text-left text-ui font-semibold transition-colors ${active === 'profile'

                            ? 'bg-brand-light text-brand-dark'

                            : 'text-ink-soft hover:bg-brand-light hover:text-brand-dark'

                          }`}

                      >

                        My Profile

                      </button>



                      <div className="border-t border-line-soft" />



                      <button

                        type="button"

                        onClick={() => {

                          setProfileOpen(false);

                          onLogout?.();

                        }}

                        className="w-full px-4 py-3 text-left text-ui font-semibold text-action-danger hover:bg-brand-light transition-colors"

                      >

                        Logout

                      </button>

                    </div>

                  </>

                )}

              </div>

            )}

          </div>



          {/* Mobile Menu Button */}

          <div className="lg:hidden flex items-center">

            <button

              type="button"

              onClick={() => setMobileOpen(prev => !prev)}

              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}

              aria-expanded={mobileOpen}

              className="p-2 rounded-button border border-brand-line bg-brand-light text-brand-dark hover:bg-brand-soft transition-all"

            >

              <div className="relative w-6 h-6">

                <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? 'rotate-45 top-2.5' : 'top-1'}`} />

                <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? 'opacity-0' : 'top-2.5'}`} />

                <span className={`block absolute left-0 right-0 h-0.5 bg-current transform transition-all duration-300 ${mobileOpen ? '-rotate-45 top-2.5' : 'top-4'}`} />

              </div>

            </button>

          </div>

        </div>



        {/* Mobile Backdrop */}

        <div

          className={`lg:hidden fixed inset-0 z-40 pointer-events-none transition-opacity duration-300 bg-black ${mobileOpen ? 'opacity-60 pointer-events-auto' : 'opacity-0'}`}

          onClick={() => setMobileOpen(false)}

          aria-hidden={!mobileOpen}

        />



        {/* Mobile Navigation Drawer */}

        <nav

          className={`lg:hidden fixed right-0 top-0 z-50 w-full max-w-xs h-full shadow-soft transform transition-transform duration-300 bg-bg-primary dark:bg-bg-primary-dark border-l border-brand-line ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}

          aria-hidden={!mobileOpen}

        >

          <div className="p-4 border-b border-brand-line flex items-center justify-between">

            <div className="text-lg font-semibold text-brand-dark dark:text-text-primary-dark uppercase">

              {displayLabel}

            </div>

            <button

              type="button"

              onClick={() => setMobileOpen(false)}

              className="p-2 rounded-button text-brand-dark hover:bg-brand-light transition-colors"

              aria-label="Close menu"

            >

              ✕

            </button>

          </div>



          <div className="p-4 space-y-3 h-full overflow-y-auto">

            <div className="flex flex-col space-y-1">

              {mobileTabs.map(tab => (

                <NavLink key={tab.id} id={tab.id}>{tab.label}</NavLink>

              ))}

            </div>



            <hr className="my-2 border-brand-tab-line" />



            <div className="flex flex-col space-y-1">

              <button

                type="button"

                onClick={() => { onLogout?.(); setMobileOpen(false); }}

                className="ui-tab !px-2 !py-[2.5px] !text-base !leading-6 w-full justify-start text-left text-action-danger hover:bg-red-50"

              >

                Logout

              </button>

            </div>

          </div>

        </nav>

      </header>

    </>

  );

};



export default HeaderShared;
