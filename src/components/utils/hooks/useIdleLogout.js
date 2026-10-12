import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
const STORAGE_KEY = 'last_activity_at';

export const clearIdleActivity = () => localStorage.removeItem('last_activity_at');
export const markIdleActivity = () => localStorage.setItem('last_activity_at', Date.now().toString());
export function useIdleLogout(isAuthenticated, onIdleLogout, timeoutMs = 60 * 1000) {
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onIdleLogout, timeoutMs);
  }, [onIdleLogout, timeoutMs]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Covers reload / app reopened after being idle in the background
    const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    if (lastActivity && Date.now() - lastActivity >= timeoutMs) {
      onIdleLogout();
      return;
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetTimer));

    // Cross-tab sync: if one tab goes idle, all tabs log out together
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const elapsed = Date.now() - parseInt(e.newValue || '0', 10);
        if (elapsed >= timeoutMs) onIdleLogout();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Catches laptop sleep / backgrounded tab
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      Date.now() - last >= timeoutMs ? onIdleLogout() : resetTimer();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer));
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, resetTimer, onIdleLogout, timeoutMs]);
}