import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsPhone } from '@/hooks/useIsPhone';
import { API_URL } from '@/lib/api';
import { BackButton } from '@/components/BackButton';

// Leitor de PDF do painel (pdf.js): o documento abre aqui mesmo, sem sair do app.
const FRONTEND_URL = process.env.EXPO_PUBLIC_FRONTEND_URL ?? 'https://e-plenarius-frontend.vercel.app';
const FRONTEND_ORIGIN = FRONTEND_URL.replace(/\/+$/, '');
const MEDIA = API_URL.replace(/\/api\/?$/, '');

export default function LeitorPdfScreen() {
  const { src = '', titulo = 'Documento' } = useLocalSearchParams<{ src: string; titulo?: string }>();
  const router = useRouter();
  const { colors: C } = useTheme();
  const isPhone = useIsPhone();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const path = src.startsWith('http') ? src.replace(MEDIA, '') : src;
  const viewerUrl = `${FRONTEND_ORIGIN}/leitor-pdf?src=${encodeURIComponent(path)}`;

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { color: C.text, fontSize: isPhone ? 16 : 20, fontWeight: '700', letterSpacing: -0.4, flexShrink: 1 },
    body: { flex: 1, backgroundColor: '#E9EDF2' },
    overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#E9EDF2' },
    msg: { color: '#475569', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
    btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: C.primary },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    link: { color: C.primary, fontWeight: '600', fontSize: 14, paddingVertical: 8 },
  }), [C, isPhone]);

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <BackButton label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text style={s.headerTitle} numberOfLines={1}>{titulo}</Text>
      </View>

      <View style={s.body}>
        {!failed && (
          <WebView
            key={attempt}
            source={{ uri: viewerUrl }}
            originWhitelist={[FRONTEND_ORIGIN]}
            // Nada de sair do leitor: links externos não navegam dentro do app
            onShouldStartLoadWithRequest={req => req.url.startsWith(FRONTEND_ORIGIN)}
            setSupportMultipleWindows={false}
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess={false}
            allowsBackForwardNavigationGestures={false}
            setBuiltInZoomControls
            setDisplayZoomControls={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setFailed(true); setLoading(false); }}
            onHttpError={() => { setFailed(true); setLoading(false); }}
            style={{ flex: 1, backgroundColor: '#E9EDF2' }}
          />
        )}

        {loading && !failed && (
          <View style={s.overlay} pointerEvents="none">
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.msg}>Abrindo documento…</Text>
          </View>
        )}

        {failed && (
          <View style={s.overlay}>
            <Text style={s.msg}>Não foi possível abrir o documento. Verifique a conexão com a internet.</Text>
            <TouchableOpacity style={s.btn} onPress={() => { setFailed(false); setLoading(true); setAttempt(a => a + 1); }}>
              <Text style={s.btnText}>Tentar de novo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(`${MEDIA}${path}`).catch(() => {})}>
              <Text style={s.link}>Abrir em outro aplicativo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
