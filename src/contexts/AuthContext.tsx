import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  chamberSlug: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithPin: (userId: string, pin: string) => Promise<void>;
  setChamberSlug: (slug: string | null) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

const CHAMBER_SLUG_KEY = 'chamber_slug';

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  async function attempt(timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
  try {
    return await attempt(15000);
  } catch (firstErr: any) {
    if (firstErr?.name !== 'AbortError' && !/network/i.test(firstErr?.message ?? '')) {
      throw firstErr;
    }
    return await attempt(30000);
  }
}

function mapStatusToMessage(status: number, serverMsg: any): string {
  if (status === 401) return typeof serverMsg === 'string' ? serverMsg : 'Credenciais incorretas.';
  if (status === 403) return typeof serverMsg === 'string' ? serverMsg : 'Conta desativada.';
  if (status === 400) {
    const msg = Array.isArray(serverMsg) ? serverMsg.join(' · ') : serverMsg;
    return typeof msg === 'string' ? msg : 'Dados inválidos.';
  }
  if (status === 429) return 'Muitas tentativas. Aguarde alguns segundos.';
  if (status >= 500) return typeof serverMsg === 'string' ? serverMsg : 'Erro no servidor. Tente novamente.';
  return typeof serverMsg === 'string' ? serverMsg : `Erro inesperado (HTTP ${status}).`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [chamberSlug, setChamberSlugState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [stored, token, slug] = await Promise.all([
          SecureStore.getItemAsync('user_data'),
          SecureStore.getItemAsync('access_token'),
          SecureStore.getItemAsync(CHAMBER_SLUG_KEY),
        ]);
        if (stored && token) setUser(JSON.parse(stored));
        if (slug) setChamberSlugState(slug);
      } catch { /* ignora */ }
      finally { setLoading(false); }
    })();
  }, []);

  const setChamberSlug = useCallback(async (slug: string | null) => {
    if (slug) await SecureStore.setItemAsync(CHAMBER_SLUG_KEY, slug);
    else await SecureStore.deleteItemAsync(CHAMBER_SLUG_KEY);
    setChamberSlugState(slug);
  }, []);

  async function login(identifier: string, password: string) {
    let res: Response;
    try {
      res = await fetchWithRetry(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new Error('O servidor demorou demais para responder.');
      throw new Error('Sem conexão com o servidor.');
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({} as any));
      throw new Error(mapStatusToMessage(res.status, (errBody as any)?.message));
    }

    const { accessToken, refreshToken, user: u } = await res.json();
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user_data', JSON.stringify(u));
    setUser(u);
  }

  async function loginWithPin(userId: string, pin: string) {
    let res: Response;
    try {
      res = await fetchWithRetry(`${API_URL}/auth/mobile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin }),
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new Error('O servidor demorou demais para responder.');
      throw new Error('Sem conexão com o servidor.');
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({} as any));
      throw new Error(mapStatusToMessage(res.status, (errBody as any)?.message));
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
    try { await apiFetch('/sessions/leave', { method: 'DELETE' }); } catch {}
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_data');
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, chamberSlug, login, loginWithPin, setChamberSlug, logout, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
