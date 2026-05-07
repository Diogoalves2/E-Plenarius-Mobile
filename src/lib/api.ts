import * as SecureStore from 'expo-secure-store';

export const API_URL = 'https://eplenarius-backend.onrender.com/api';

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
          if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
          return retry.json() as Promise<T>;
        }
      } catch {}
    }
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
