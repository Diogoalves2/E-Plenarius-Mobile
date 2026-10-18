import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DEVICE_KEY = 'device_key';

/**
 * Chave secreta deste tablet (256 bits), gerada na primeira execução e guardada no SecureStore.
 * O backend só guarda o hash; o presidente autoriza o tablet pelo código exibido no login.
 */
export async function getDeviceKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DEVICE_KEY, key);
  return key;
}

/** Nome legível do aparelho para o painel (ex.: "samsung SM-X200"). */
export function getDeviceName(): string {
  const c = (Platform as any).constants ?? {};
  const name = [c.Manufacturer ?? c.Brand, c.Model].filter(Boolean).join(' ');
  return (name || `${Platform.OS} ${Platform.Version}`).slice(0, 100);
}
