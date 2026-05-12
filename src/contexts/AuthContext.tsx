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
    const url = `${API_URL}/auth/login`;
    const body = JSON.stringify({ identifier, password });

    async function attempt(timeoutMs: number): Promise<Response> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    }

    let res: Response;
    try {
      // 1ª tentativa: 15s. Se falhar por rede/timeout, tenta de novo com 30s
      // (cobre cold start do Render após inatividade).
      try {
        res = await attempt(15000);
      } catch (firstErr: any) {
        if (firstErr?.name !== 'AbortError' && !/network/i.test(firstErr?.message ?? '')) {
          throw firstErr;
        }
        res = await attempt(30000);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('O servidor demorou demais para responder. Tente novamente em alguns segundos.');
      }
      throw new Error('Sem conexão com o servidor. Verifique sua internet.');
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({} as any));
      const serverMsg = (errBody as any)?.message;

      if (res.status === 401) throw new Error('Usuário ou senha incorretos.');
      if (res.status === 403) throw new Error(serverMsg || 'Sua conta está desativada. Contate o administrador.');
      if (res.status === 400) {
        const msg = Array.isArray(serverMsg) ? serverMsg.join(' · ') : serverMsg;
        throw new Error(msg || 'Dados inválidos. Verifique os campos.');
      }
      if (res.status === 429) throw new Error('Muitas tentativas. Aguarde um instante e tente novamente.');
      if (res.status >= 500) throw new Error(serverMsg || 'Erro no servidor. Tente novamente em alguns instantes.');
      throw new Error(serverMsg || `Erro inesperado (HTTP ${res.status}).`);
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
