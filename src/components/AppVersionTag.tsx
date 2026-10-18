import React from 'react';
import { Text } from 'react-native';
import * as Updates from 'expo-updates';

/** Versão em uso no tablet: runtime do APK + atualização OTA aplicada (ou original do APK). */
export function AppVersionTag({ color = '#8A94A2' }: { color?: string }) {
  const ota = !Updates.isEmbeddedLaunch && Updates.updateId ? `atualização ${Updates.updateId.slice(0, 8)}` : 'original do APK';
  return (
    <Text style={{ position: 'absolute', bottom: 8, alignSelf: 'center', fontSize: 11, color, opacity: 0.8 }}>
      v{Updates.runtimeVersion ?? '—'} · {ota}
    </Text>
  );
}
