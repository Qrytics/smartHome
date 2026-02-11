import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_SESSION_KEY = 'smarthome.dashboard.authSession.v1';
const SESSION_DURATION_MS = 30 * 60 * 1000;

const AuthContext = createContext(null);

function loadStoredSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.username || !parsed?.expiresAt) return null;

    const expiresAt = new Date(parsed.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return {
      username: parsed.username,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  } catch (error) {
    return null;
  }
}

function persistSession(session) {
  try {
    if (!session) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    // Ignore storage errors (private mode, quota, etc).
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadStoredSession());
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const expiresAtMs = new Date(session.expiresAt).getTime();
    if (expiresAtMs <= tick) {
      setSession(null);
      persistSession(null);
    }
  }, [session, tick]);

  const value = useMemo(() => {
    const adminUsername = process.env.REACT_APP_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD || 'changeme';

    const isAuthenticated = Boolean(session);
    const expiresAtMs = session ? new Date(session.expiresAt).getTime() : 0;
    const remainingSeconds = Math.max(0, Math.round((expiresAtMs - tick) / 1000));

    async function login(username, password) {
      const submittedUsername = String(username || '').trim();
      const submittedPassword = String(password || '');

      if (submittedUsername !== adminUsername || submittedPassword !== adminPassword) {
        return {
          ok: false,
          error: 'Invalid username or password.',
        };
      }

      const nextSession = {
        username: submittedUsername,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
      };

      setSession(nextSession);
      persistSession(nextSession);
      return { ok: true };
    }

    function logout() {
      setSession(null);
      persistSession(null);
    }

    function extendSession() {
      if (!session) return;
      const extended = {
        ...session,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
      };
      setSession(extended);
      persistSession(extended);
    }

    return {
      isAuthenticated,
      username: session?.username || null,
      sessionExpiresAt: session?.expiresAt || null,
      sessionRemainingSeconds: remainingSeconds,
      login,
      logout,
      extendSession,
    };
  }, [session, tick]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

