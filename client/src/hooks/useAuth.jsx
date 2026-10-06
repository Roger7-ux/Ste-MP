import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setSessionExpiredHandler } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // While the session cookie is being checked, anything that depends on the
  // session shows a placeholder instead of the signed-out state.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // `role` is the screen being used: 'PATIENT', or 'STAFF' for doctors and staff.
  const login = useCallback(async (email, password, role) => {
    const data = await api.post('/auth/login', { email, password, role });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (values) => {
    const data = await api.patch('/auth/me', values);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, updateProfile }),
    [user, loading, login, logout, updateProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
