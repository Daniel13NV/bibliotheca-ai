import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiConfig, DEFAULT_API_URL } from '../api/client';
import { api } from '../api/endpoints';
import type { User } from '../api/types';
import { storage } from '../services/storage';

const TOKEN_KEY = 'bibliotheca.token';
const SERVER_KEY = 'bibliotheca.server';
/** Dirección de .env vigente cuando se guardó el servidor; si .env cambia, gana la nueva. */
const SERVER_ENV_KEY = 'bibliotheca.server.env';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  serverUrl: string;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; studentId?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [serverUrl, setServer] = useState(DEFAULT_API_URL);

  const logout = useCallback(async () => {
    apiConfig.setToken(null);
    setUser(null);
    await storage.remove(TOKEN_KEY);
  }, []);

  useEffect(() => {
    apiConfig.setUnauthorizedHandler(() => void logout());
    (async () => {
      const savedServer = await storage.get(SERVER_KEY);
      const savedForEnv = await storage.get(SERVER_ENV_KEY);
      if (savedServer && savedForEnv !== DEFAULT_API_URL) {
        // Cambió la IP en mobile/.env (por ejemplo con iniciar.bat): se descarta la guardada.
        await storage.remove(SERVER_KEY);
      } else if (savedServer) {
        apiConfig.setBaseUrl(savedServer);
        setServer(savedServer);
      }
      const token = await storage.get(TOKEN_KEY);
      if (token) {
        apiConfig.setToken(token);
        try {
          setUser(await api.users.me());
        } catch {
          await logout();
        }
      }
      setReady(true);
    })();
    return () => apiConfig.setUnauthorizedHandler(null);
  }, [logout]);

  const persistSession = useCallback(async (accessToken: string, nextUser: User) => {
    apiConfig.setToken(accessToken);
    await storage.set(TOKEN_KEY, accessToken);
    setUser(nextUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      serverUrl,
      isStaff: user?.role === 'LIBRARIAN' || user?.role === 'ADMIN',
      login: async (email, password) => {
        const res = await api.auth.login(email, password);
        await persistSession(res.accessToken, res.user);
      },
      register: async (data) => {
        const res = await api.auth.register(data);
        await persistSession(res.accessToken, res.user);
      },
      logout,
      refresh: async () => setUser(await api.users.me()),
      setServerUrl: async (url) => {
        apiConfig.setBaseUrl(url);
        setServer(apiConfig.getBaseUrl());
        await storage.set(SERVER_KEY, apiConfig.getBaseUrl());
        await storage.set(SERVER_ENV_KEY, DEFAULT_API_URL);
      },
    }),
    [user, ready, serverUrl, logout, persistSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
