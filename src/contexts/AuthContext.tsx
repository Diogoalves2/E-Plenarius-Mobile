import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiFetch, API_URL } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: 'presidente' | 'vereador' | 'secretaria' | 'superadmin';
  chamberId: string | null;
  party: string | null;
  title: string | null;
  avatarUrl: string | null;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync('user_data');
        const token = await SecureStore.getItemAsync('access_token');
        if (stored && token) setUser(JSON.parse(stored));
      } catch {
        // ignora
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(identifier: string, password: string) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
    } catch (err: any) {
      throw new Error(`Erro de rede: ${err?.message ?? String(err)}\n\nURL: ${API_URL}/auth/login`);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any)?.message || `HTTP ${res.status}`);
    }

    const { accessToken, refreshToken, user: u } = await res.json();
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user_data', JSON.stringify(u));
    setUser(u);
  }

  async function updateUser(updates: Partial<User>) {
    const updated = { ...user!, ...updates };
    await SecureStore.setItemAsync('user_data', JSON.stringify(updated));
    setUser(updated);
  }

  async function logout() {
    // Remove presence from active session before clearing tokens
    // Uses apiFetch for automatic token refresh and timeout handling
    try {
      await apiFetch('/sessions/leave', { method: 'DELETE' });
    } catch { /* proceed with logout regardless of leave result */ }

    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_data');
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, logout, updateUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
