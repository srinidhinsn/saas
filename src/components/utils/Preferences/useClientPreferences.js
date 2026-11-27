import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_USER_SERVICE_URL;

export const DEFAULT_PREFERENCES = {
  kds: { default_view: 'order' },
  table_management: { default_view: 'floor' },
};

const withDefaults = (p = {}) => ({
  kds: { ...DEFAULT_PREFERENCES.kds, ...(p?.kds || {}) },
  table_management: { ...DEFAULT_PREFERENCES.table_management, ...(p?.table_management || {}) },
});

// One shared object, so the "not loaded yet" value never changes identity between renders.
const FALLBACK = withDefaults();

const cache = {};          // clientId -> preferences
const inflight = {};       // clientId -> true while a request is running
const listeners = new Set();
const publish = () => listeners.forEach((fn) => fn());

export const useClientPreferences = (clientId, token) => {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  useEffect(() => {
    if (!clientId || !token || cache[clientId] || inflight[clientId]) return;
    inflight[clientId] = true;

    axios
      .get(`${API}/${clientId}/users/preferences`, {
        params: { client_id: clientId },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => { cache[clientId] = withDefaults(res.data?.data); })
      .catch((err) => {
        console.error('Failed to load preferences:', err);
        cache[clientId] = withDefaults();
      })
      .finally(() => {
        delete inflight[clientId];
        publish();
      });
  }, [clientId, token]);

  const save = useCallback(async (next) => {
    const res = await axios.post(`${API}/${clientId}/users/preferences`, next, {
      params: { client_id: clientId },
      headers: { Authorization: `Bearer ${token}` },
    });
    cache[clientId] = withDefaults(res.data?.data);
    publish();
    return cache[clientId];
  }, [clientId, token]);

  return {
    preferences: cache[clientId] || FALLBACK,
    loaded: !!cache[clientId],
    save,
  };
};