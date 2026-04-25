import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { BackButton } from '@/components/BackButton';

interface Presence {
  userId: string;
  confirmedAt: string;
  user: { id: string; name: string; party?: string; avatarUrl?: string; };
}

export default function QuorumScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const { session, loading: sessionLoading } = useActiveSession();
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    headerTitle: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    headerSub: { color: C.textMuted, fontSize: 14, marginTop: 1 },
    refreshBtn: {
      backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, borderColor: C.border,
    },
    refreshText: { color: C.primary, fontSize: 18, fontWeight: '700' },
    scoreCard: { margin: 16, borderRadius: 16, padding: 20, borderWidth: 1, alignItems: 'center', gap: 4 },
    scoreNumber: { fontSize: 56, fontWeight: '800', lineHeight: 60 },
    scoreLabel: { color: C.textMuted, fontSize: 14 },
    quorumStatus: { fontSize: 14, fontWeight: '700', marginTop: 4 },
    list: { padding: 16, gap: 10 },
    presenceItem: {
      backgroundColor: C.card, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    presenceName: { color: C.text, fontSize: 15, fontWeight: '600' },
    presenceParty: { color: C.textMuted, fontSize: 12, marginTop: 2 },
    presenceTime: { color: C.textMuted, fontSize: 12 },
    emptyTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
    emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
  }), [C]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await apiFetch<Presence[]>(`/sessions/${session.id}/presences`);
      setPresences(data);
    } catch {}
    finally { setLoading(false); }
  }, [session?.id]);

  useEffect(() => { load(); }, [load]);

  const total = presences.length;
  const quorumMin = Math.floor(total / 2) + 1;
  const quorumOk = total >= quorumMin;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(presidente)')} />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Quórum</Text>
          {session && (
            <Text style={s.headerSub}>
              {session.number}ª Sessão {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={load} style={s.refreshBtn}>
          <Text style={s.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      {sessionLoading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} /></View>
      ) : !session ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
          <Text style={s.emptyTitle}>Nenhuma sessão ativa</Text>
        </View>
      ) : (
        <>
          <View style={[s.scoreCard, {
            backgroundColor: quorumOk ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
            borderColor: quorumOk ? C.success + '40' : C.danger + '30',
          }]}>
            <Text style={[s.scoreNumber, { color: quorumOk ? C.success : C.danger }]}>{total}</Text>
            <Text style={s.scoreLabel}>presentes</Text>
            <Text style={[s.quorumStatus, { color: quorumOk ? C.success : C.danger }]}>
              {quorumOk ? `✅ Quórum atingido (mín. ${quorumMin})` : `⚠️ Quórum insuficiente (necessário ${quorumMin})`}
            </Text>
          </View>

          {loading ? (
            <View style={s.center}><ActivityIndicator color={C.primary} /></View>
          ) : (
            <FlatList
              data={presences}
              keyExtractor={p => p.userId}
              contentContainerStyle={s.list}
              ListEmptyComponent={
                <View style={s.center}>
                  <Text style={s.emptyText}>Nenhum vereador confirmou presença ainda.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={s.presenceItem}>
                  <Avatar name={item.user.name} avatarUrl={item.user.avatarUrl} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.presenceName}>{item.user.name}</Text>
                    {item.user.party && <Text style={s.presenceParty}>{item.user.party}</Text>}
                  </View>
                  <Text style={s.presenceTime}>
                    {new Date(item.confirmedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
