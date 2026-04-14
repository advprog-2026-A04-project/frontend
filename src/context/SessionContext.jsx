import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const SessionContext = createContext(null);

function persistSession(token, user) {
  localStorage.setItem('json.sessionToken', token);
  localStorage.setItem('json.sessionUser', JSON.stringify(user));
}

function clearPersistedSession() {
  localStorage.removeItem('json.sessionToken');
  localStorage.removeItem('json.sessionUser');
}

export function SessionProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('json.sessionToken') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('json.sessionUser');
    return raw ? JSON.parse(raw) : null;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!token) {
        setReady(true);
        return;
      }

      try {
        const data = await api.getSession();
        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setToken('');
          setUser(null);
          clearPersistedSession();
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(credentials) {
    const session = await api.login(credentials);
    setToken(session.token);
    setUser(session.user);
    persistSession(session.token, session.user);
    return session;
  }

  async function register(payload) {
    return api.register(payload);
  }

  async function logout() {
    try {
      if (token) {
        await api.logout();
      }
    } catch {
      // Ignore stale server sessions and always clear local state.
    } finally {
      setToken('');
      setUser(null);
      clearPersistedSession();
      setReady(true);
    }
  }

  return (
    <SessionContext.Provider
      value={{
        ready,
        token,
        user,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider.');
  }

  return context;
}
