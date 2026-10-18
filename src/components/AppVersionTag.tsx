import React from 'react';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';

/** Versão em uso no tablet: runtime do APK + atualização OTA aplicada (ou original do APK). */
export function AppVersionTag({ color = '#8A94A2' }: { color?: string }) {
  const insets = useSafeAreaInsets();
  const ota = !Updates.isEmbeddedLaunch && Updates.updateId ? `atualização ${Updates.updateId.slice(0, 8)}` : 'original do APK';
  return (
    // Acima da barra de navegação/gestos do Android
    <Text style={{ position: 'absolute', bottom: insets.bottom + 6, alignSelf: 'center', fontSize: 11, color, opacity: 0.8 }}>
      v{Updates.runtimeVersion ?? '—'} · {ota}
    </Text>
  );
}
