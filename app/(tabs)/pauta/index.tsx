import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch, API_URL } from '@/lib/api';
import { BackButton } from '@/components/BackButton';

interface AgendaItem {
  id: string;
  number: string;
  type: string;
  title: string;
  description?: string;
  authorName: string;
  votingType: string;
  quorumMinimum: number;
  status: string;
  orderIndex: number;
  pdfUrl?: string | null;
}

export default function PautaScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const { session, loading: sessionLoading } = useActiveSession();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const STATUS_COLOR: Record<string, string> = useMemo(() => ({
    pendente:   C.textMuted,
    em_votacao: C.primary,
    aprovado:   C.success,
    rejeitado:  C.danger,
    retirado:   C.warning,
  }), [C]);

  const STATUS_LABEL: Record<string, string> = {
    pendente:   'Pendente',
    em_votacao: 'Em votação',
    aprovado:   'Aprovado',
    rejeitado:  'Reprovado',
    retirado:   'Retirado',
  };

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
    scroll: { padding: 16, gap: 14 },
    card: {
      backgroundColor: C.card, borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: C.border, gap: 12,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    indexBadge: {
      width: 42, height: 42, borderRadius: 12,
      backgroundColor: C.primary + '20', alignItems: 'center', justifyContent: 'center',
    },
    indexText: { color: C.primary, fontSize: 20, fontWeight: '800' },
    itemNumber: { color: C.text, fontSize: 18, fontWeight: '700' },
    itemType:   { color: C.textMuted, fontSize: 18, marginTop: 2 },
    statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    statusText: { fontSize: 18, fontWeight: '700' },
    itemTitle: { color: C.text, fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.3 },
    itemDesc:  { color: C.textMuted, fontSize: 18, lineHeight: 26 },
    itemAuthor:{ color: C.textMuted, fontSize: 20 },
    metaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    metaTag: {
      backgroundColor: C.surface, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 7,
    },
    metaTagText: { color: C.textMuted, fontSize: 18, fontWeight: '500' },
    pdfBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, backgroundColor: C.primary, borderRadius: 14,
      paddingVertical: 18,
      shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    pdfBtnIcon: { fontSize: 22 },
    pdfBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    emptyTitle: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptyText:  { color: C.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  }), [C]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    apiFetch<AgendaItem[]>(`/agenda/session/${session.id}`)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.id]);

  function openPdf(pdfUrl: string) {
    const url = pdfUrl.startsWith('http')
      ? pdfUrl
      : `${API_URL.replace('/api', '')}${pdfUrl}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o PDF. Verifique se há um leitor instalado.'),
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
        <Text style={s.headerTitle}>Ordem do Dia</Text>
      </View>

      {sessionLoading || loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : !session ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
          <Text style={s.emptyTitle}>Nenhuma sessão ativa</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
          <Text style={s.emptyTitle}>Pauta vazia</Text>
          <Text style={s.emptyText}>Nenhum projeto cadastrado nesta sessão.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {items.sort((a, b) => a.orderIndex - b.orderIndex).map((item, i) => {
            const color = STATUS_COLOR[item.status] ?? C.textMuted;
            return (
              <View key={item.id} style={s.card}>
                <View style={s.cardRow}>
                  <View style={s.indexBadge}>
                    <Text style={s.indexText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemNumber}>{item.number}</Text>
                    <Text style={s.itemType}>{item.type}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                    <Text style={[s.statusText, { color }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
                  </View>
                </View>
                <Text style={s.itemTitle}>{item.title}</Text>
                {item.description ? <Text style={s.itemDesc}>{item.description}</Text> : null}
                <Text style={s.itemAuthor}>
                  Autoria: <Text style={{ color: C.text, fontWeight: '700' }}>{item.authorName}</Text>
                </Text>
                <View style={s.metaRow}>
                  <View style={s.metaTag}>
                    <Text style={s.metaTagText}>
                      {item.votingType === 'aberta' ? '🔓 Aberta' : '🔒 Secreta'}
                    </Text>
                  </View>
                  <View style={s.metaTag}>
                    <Text style={s.metaTagText}>Quórum: {item.quorumMinimum}</Text>
                  </View>
                </View>
                {item.pdfUrl ? (
                  <TouchableOpacity style={s.pdfBtn} onPress={() => openPdf(item.pdfUrl!)} activeOpacity={0.85}>
                    <Text style={s.pdfBtnIcon}>📄</Text>
                    <Text style={s.pdfBtnText}>Abrir documento PDF</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
