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
        const profile = await api.getCurrentUser(token);
        if (!cancelled) {
          setUser(profile);
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
    const nextUser = {
      id: session.id,
      email: session.email,
      username: session.username,
      fullName: session.fullName,
      role: session.role,
    };

    setToken(session.token);
    setUser(nextUser);
    persistSession(session.token, nextUser);
    return nextUser;
  }

  async function register(payload) {
    await api.register(payload);
    return {
      message: 'Registration successful. Log in with the account you just created.',
    };
  }

  async function updateProfile(payload) {
    const profile = await api.updateProfile(payload);
    const nextUser = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      fullName: profile.fullName,
      role: profile.role,
    };

    setUser(nextUser);
    persistSession(token, nextUser);
    return nextUser;
  }

  async function logout() {
    setToken('');
    setUser(null);
    clearPersistedSession();
    setReady(true);
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
        updateProfile,
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
