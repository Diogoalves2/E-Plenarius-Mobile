import * as SecureStore from 'expo-secure-store';
import { authEvents } from './auth-events';

export const API_URL = 'https://e-plenarius-backend.onrender.com/api';

async function fetchWithTimeout(url: string, options: RequestInit, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Servidor não respondeu (timeout).');
    throw new Error('Erro de rede.');
  }

  if (res.status === 401) {
    // Captura mensagem do 401 inicial — backend retorna mensagem específica
    // quando é device-conflict (mobileDevice mismatch).
    const initialBody = await res.clone().json().catch(() => ({}));
    const initialMsg: string = (initialBody as any)?.message ?? '';
    const isDeviceConflict = /outro dispositivo|outro device|sessão encerrada/i.test(initialMsg);

    if (isDeviceConflict) {
      // Não adianta refresh — o backend já invalidou tudo. Sinaliza logout.
      authEvents.emitSessionTerminated('device-conflict', initialMsg);
      throw new Error(initialMsg);
    }

    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (refreshToken) {
      try {
        const rr = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (rr.ok) {
          const { accessToken, refreshToken: newRefresh } = await rr.json();
          await SecureStore.setItemAsync('access_token', accessToken);
          await SecureStore.setItemAsync('refresh_token', newRefresh);
          headers['Authorization'] = `Bearer ${accessToken}`;
          const retry = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });
          if (!retry.ok) {
            const retryBody = await retry.json().catch(() => ({}));
            throw new Error((retryBody as any)?.message || `HTTP ${retry.status}`);
          }
          if (retry.status === 204) return undefined as T;
          return retry.json() as Promise<T>;
        }
      } catch { /* fallthrough */ }
    }

    // Refresh falhou: sessão expirou ou foi revogada (outro device logou).
    authEvents.emitSessionTerminated('expired', initialMsg || 'Sua sessão expirou.');
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
