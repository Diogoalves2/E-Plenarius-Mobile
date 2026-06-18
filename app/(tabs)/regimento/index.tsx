import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsPhone } from '@/hooks/useIsPhone';
import { apiFetch, API_URL } from '@/lib/api';
import { BackButton } from '@/components/BackButton';

interface Regimento {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileSize?: number;
  version?: string;
  createdAt: string;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RegimentoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const isPhone = useIsPhone();
  const [regimento, setRegimento] = useState<Regimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { color: C.text, fontSize: isPhone ? 16 : 22, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    emptyTitle: { color: C.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
    emptyText: { color: C.textMuted, fontSize: 22, textAlign: 'center', lineHeight: 30 },
    errorText: { color: C.danger, fontSize: 17, textAlign: 'center' },
    retryBtn: {
      marginTop: 8, paddingHorizontal: 24, paddingVertical: 14,
      backgroundColor: C.primary + '20', borderRadius: 14,
      borderWidth: 1, borderColor: C.primary + '40',
    },
    retryText: { color: C.primary, fontWeight: '700', fontSize: 17 },
    content: { padding: 20, gap: 20 },
    card: {
      backgroundColor: C.card, borderRadius: 20,
      borderWidth: 1, borderColor: C.border,
      padding: 28, alignItems: 'center', gap: 14,
    },
    docIcon: {
      width: 96, height: 96, borderRadius: 24,
      backgroundColor: C.primary + '15',
      borderWidth: 1, borderColor: C.primary + '30',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 4,
    },
    docTitle: {
      color: C.text, fontSize: 32, fontWeight: '800',
      textAlign: 'center', letterSpacing: -0.5,
    },
    docDesc: { color: C.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 23 },
    metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    metaBadge: {
      backgroundColor: C.primary + '15', borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 6,
      borderWidth: 1, borderColor: C.primary + '30',
    },
    metaBadgeText: { color: C.primary, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
    docDate: { color: C.textMuted, fontSize: 20, marginTop: 4 },
    openBtn: {
      backgroundColor: C.primary, borderRadius: 18,
      paddingVertical: 20, paddingHorizontal: 28,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
      shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    openBtnIcon: { fontSize: 24 },
    openBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
    hint: {
      color: C.textMuted, fontSize: 14, textAlign: 'center',
      lineHeight: 21, paddingHorizontal: 16,
    },
  }), [C, isPhone]);

  const load = useCallback(async () => {
    if (!user?.chamberId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<Regimento | null>(`/regimento/chamber/${user.chamberId}`);
      setRegimento(data ?? null);
    } catch {
      setError('Não foi possível carregar o regimento.');
    } finally {
      setLoading(false);
    }
  }, [user?.chamberId]);

  useEffect(() => { load(); }, [load]);

  function openPdf() {
    if (!regimento) return;
    const url = regimento.fileUrl.startsWith('http')
      ? regimento.fileUrl
      : `${API_URL.replace('/api', '')}${regimento.fileUrl}`;
    Linking.openURL(url).catch(() => {
      setError('Não foi possível abrir o PDF. Verifique se há um leitor de PDF instalado.');
    });
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
        <Text style={s.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Regimento Interno</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : !regimento ? (
        <View style={s.center}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>📜</Text>
          <Text style={s.emptyTitle}>Nenhum regimento cadastrado</Text>
          <Text style={s.emptyText}>O presidente ainda não publicou o Regimento Interno.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <View style={s.docIcon}>
              <Text style={{ fontSize: 52 }}>📄</Text>
            </View>
            <Text style={s.docTitle}>{regimento.title}</Text>
            {regimento.description ? <Text style={s.docDesc}>{regimento.description}</Text> : null}
            <View style={s.metaRow}>
              {regimento.version ? (
                <View style={s.metaBadge}><Text style={s.metaBadgeText}>v{regimento.version}</Text></View>
              ) : null}
              {regimento.fileSize ? (
                <View style={s.metaBadge}><Text style={s.metaBadgeText}>{formatBytes(regimento.fileSize)}</Text></View>
              ) : null}
              <View style={s.metaBadge}><Text style={s.metaBadgeText}>PDF</Text></View>
            </View>
            <Text style={s.docDate}>
              Publicado em {new Date(regimento.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>

          <TouchableOpacity style={s.openBtn} onPress={openPdf} activeOpacity={0.85}>
            <Text style={s.openBtnIcon}>📖</Text>
            <Text style={s.openBtnText}>Abrir Regimento Interno</Text>
          </TouchableOpacity>

          <Text style={s.hint}>
            O documento será aberto no leitor de PDF do seu dispositivo.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
