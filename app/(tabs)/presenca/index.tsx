import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsPhone } from '@/hooks/useIsPhone';
import { apiFetch } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { BackButton } from '@/components/BackButton';

interface Presence { userId: string; confirmedAt: string; }

export default function PresencaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const isPhone = useIsPhone();
  const { session, loading: sessionLoading } = useActiveSession();
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isConfirmed = presences.some(p => p.userId === user?.id);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { color: C.text, fontSize: isPhone ? 16 : 20, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
    content: { flex: 1, padding: 20, gap: 16 },
    userCard: {
      backgroundColor: C.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center', gap: 16,
    },
    userName: { color: C.text, fontSize: 17, fontWeight: '700' },
    userTitle: { color: C.textMuted, fontSize: 13, marginTop: 2 },
    userParty: { color: C.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },
    statusCard: { borderRadius: 16, padding: 24, borderWidth: 1, alignItems: 'center', gap: 6 },
    statusTitle: { fontSize: 18, fontWeight: '800' },
    statusDesc: { color: C.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 4 },
    sessionInfo: {
      backgroundColor: C.card, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: C.border,
    },
    sessionInfoLabel: { color: C.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
    sessionInfoValue: { color: C.text, fontSize: 16, fontWeight: '700' },
    sessionInfoDate: { color: C.textMuted, fontSize: 13, marginTop: 2 },
    countCard: {
      backgroundColor: C.card, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: C.border, alignItems: 'center',
    },
    countNumber: { color: C.primary, fontSize: 40, fontWeight: '800' },
    countLabel: { color: C.textMuted, fontSize: 14, marginTop: 2 },
    confirmBtn: {
      backgroundColor: C.success, borderRadius: 16, paddingVertical: 18,
      alignItems: 'center', shadowColor: C.success, shadowOpacity: 0.3,
      shadowRadius: 12, elevation: 6,
    },
    confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    emptyTitle: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
  }), [C, isPhone]);

  async function loadPresences() {
    if (!session) return;
    const data = await apiFetch<Presence[]>(`/sessions/${session.id}/presences`);
    setPresences(data);
  }

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    loadPresences().finally(() => setLoading(false));
  }, [session?.id]);

  async function confirmPresence() {
    if (!session) return;
    setConfirming(true);
    try {
      await apiFetch(`/sessions/${session.id}/presence`, { method: 'POST' });
      await loadPresences();
      Alert.alert('Presença confirmada!', 'Você está registrado como presente nesta sessão.');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível confirmar presença.');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
        <Text style={s.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Minha Presença</Text>
      </View>

      {sessionLoading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} /></View>
      ) : !session ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
          <Text style={s.emptyTitle}>Nenhuma sessão ativa</Text>
          <Text style={s.emptyText}>Aguarde o presidente iniciar a sessão.</Text>
        </View>
      ) : (
        <View style={s.content}>
          <View style={s.userCard}>
            <Avatar name={user?.name ?? ''} avatarUrl={user?.avatarUrl} size={72} />
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{user?.name}</Text>
              {user?.title && <Text style={s.userTitle}>{user.title}</Text>}
              {user?.party && <Text style={s.userParty}>{user.party}</Text>}
            </View>
          </View>

          <View style={[s.statusCard, {
            backgroundColor: isConfirmed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
            borderColor: isConfirmed ? C.success + '50' : C.danger + '30',
          }]}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>
              {isConfirmed ? '✅' : '⏳'}
            </Text>
            <Text style={[s.statusTitle, { color: isConfirmed ? C.success : C.danger }]}>
              {isConfirmed ? 'Presença Confirmada' : 'Presença Não Confirmada'}
            </Text>
            <Text style={s.statusDesc}>
              {isConfirmed
                ? 'Você está registrado como presente nesta sessão.'
                : 'Toque no botão abaixo para confirmar sua presença.'}
            </Text>
          </View>

          <View style={s.sessionInfo}>
            <Text style={s.sessionInfoLabel}>SESSÃO ATUAL</Text>
            <Text style={s.sessionInfoValue}>
              {session.number}ª Sessão {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
            </Text>
            <Text style={s.sessionInfoDate}>
              {new Date(session.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {!loading && (
            <View style={s.countCard}>
              <Text style={s.countNumber}>{presences.length}</Text>
              <Text style={s.countLabel}>vereadores presentes</Text>
            </View>
          )}

          {!isConfirmed && (
            <TouchableOpacity
              style={[s.confirmBtn, confirming && { opacity: 0.6 }]}
              onPress={confirmPresence}
              disabled={confirming}
              activeOpacity={0.85}
            >
              {confirming
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.confirmBtnText}>Confirmar Minha Presença</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
