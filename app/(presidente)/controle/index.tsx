import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useVotingSocket } from '@/hooks/useVotingSocket';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/lib/api';
import { BackButton } from '@/components/BackButton';

const COLOR_SIM     = '#22c55e';
const COLOR_NAO     = '#ef4444';
const COLOR_ABSTAIN = '#f59e0b';

interface AgendaItem {
  id: string; number: string; type: string; title: string;
  authorName: string; status: string; orderIndex: number;
}

export default function ControleScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const { session, loading: sessionLoading } = useActiveSession();
  const { connected, activeItem, counts, votingOpen } = useVotingSocket(session?.id ?? null);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    headerTitle: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    headerSub: { color: C.textMuted, fontSize: 14, marginTop: 1 },
    connBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    },
    connDot: { width: 8, height: 8, borderRadius: 4 },
    connText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
    body: { flex: 1, flexDirection: 'row' },
    leftScroll: { flex: 1 },
    leftScrollContent: { padding: 20, gap: 16, flexGrow: 1 },
    dividerV: { width: 1, backgroundColor: C.border },
    rightScroll: { width: 360 },
    rightScrollContent: { padding: 20, gap: 12 },
    scroll: { padding: 20, gap: 0 },
    dividerH: { height: 1, backgroundColor: C.border, marginVertical: 20 },
    leftPanel: { flex: 1, gap: 16 },
    rightPanel: { gap: 12 },
    activeCard: {
      backgroundColor: C.card, borderRadius: 20, padding: 20,
      borderWidth: 1, borderColor: C.primary + '30', gap: 14,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8,
    },
    statusDot: { width: 9, height: 9, borderRadius: 5 },
    statusText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
    itemMeta: { color: C.textMuted, fontSize: 15, fontWeight: '500' },
    activeTitle: { color: C.text, fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
    activeAuthor: { color: C.textMuted, fontSize: 19 },
    scoreRow: { flexDirection: 'row', gap: 10 },
    scoreChip: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 18, alignItems: 'center', gap: 6 },
    scoreChipCount: { fontSize: 52, fontWeight: '900', lineHeight: 56, letterSpacing: -1 },
    scoreChipLabel: { color: C.textMuted, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    scoreSub: { color: C.textMuted, fontSize: 16, textAlign: 'center', marginTop: -4 },
    resultCard: { borderRadius: 18, borderWidth: 2, paddingVertical: 22, alignItems: 'center' },
    resultText: { fontSize: 30, fontWeight: '900', letterSpacing: -0.3 },
    closeBtn: {
      backgroundColor: COLOR_NAO, borderRadius: 20,
      paddingVertical: 28, alignItems: 'center', justifyContent: 'center', marginTop: 4,
    },
    closeBtnText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 0.3 },
    waitingCard: {
      backgroundColor: C.card, borderRadius: 20, padding: 36,
      borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 10,
    },
    waitingTitle: { color: C.text, fontSize: 24, fontWeight: '800' },
    waitingText: { color: C.textMuted, fontSize: 18, textAlign: 'center', lineHeight: 26 },
    sectionTitle: { color: C.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4, opacity: 0.7 },
    itemCard: {
      backgroundColor: C.card, borderRadius: 18, padding: 18,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    itemCardActive: { borderColor: C.primary + '50', backgroundColor: C.primary + '08' },
    itemNumber: { color: C.textMuted, fontSize: 16, fontWeight: '600' },
    itemType: { color: C.textMuted, fontSize: 16, fontWeight: '400' },
    itemTitle: { color: C.text, fontSize: 20, fontWeight: '700', lineHeight: 27, marginTop: 2 },
    itemAuthor: { color: C.textMuted, fontSize: 17, marginTop: 2 },
    openBtn: { backgroundColor: C.warning, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 20 },
    openBtnText: { color: '#fff', fontSize: 22, fontWeight: '900' },
    statusChip: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
    statusChipText: { fontSize: 20, fontWeight: '800' },
    emptyTitle: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
    emptyText: { color: C.textMuted, fontSize: 18, textAlign: 'center', lineHeight: 26 },
  }), [C]);

  useEffect(() => {
    if (!session) return;
    setLoadingItems(true);
    apiFetch<AgendaItem[]>(`/agenda/session/${session.id}`)
      .then(d => setItems(d.sort((a, b) => a.orderIndex - b.orderIndex)))
      .catch(() => {})
      .finally(() => setLoadingItems(false));
  }, [session?.id]);

  async function openVoting(item: AgendaItem) {
    setActionLoading('open:' + item.id);
    try { await apiFetch(`/voting/open/${item.id}`, { method: 'PATCH' }); }
    catch (err: any) { Alert.alert('Erro', err.message); }
    finally { setActionLoading(null); }
  }

  async function closeVoting() {
    if (!activeItem) return;
    setActionLoading('close');
    try { await apiFetch(`/voting/close/${activeItem.id}`, { method: 'PATCH' }); }
    catch (err: any) { Alert.alert('Erro', err.message); }
    finally { setActionLoading(null); }
  }

  function confirmClose() {
    Alert.alert('Encerrar votação?', 'O resultado será calculado automaticamente. Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: closeVoting },
    ]);
  }

  const total = counts.sim + counts.nao + counts.abstencao;
  const isApproved  = activeItem?.status === 'aprovado';
  const isReprovado = activeItem?.status === 'rejeitado';

  if (sessionLoading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!session) {
    return (
      <SafeAreaView style={s.root}>
        <Header router={router} connected={connected} s={s} C={C} />
        <View style={s.center}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🏛️</Text>
          <Text style={s.emptyTitle}>Nenhuma sessão em andamento</Text>
          <Text style={s.emptyText}>Inicie uma sessão pelo painel web.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const votingPanel = (
    <View style={[s.leftPanel, !isLandscape && { flex: 0 }]}>
      {activeItem ? (
        <View style={s.activeCard}>
          <View style={s.statusRow}>
            <View style={[s.statusBadge, {
              backgroundColor: (votingOpen ? C.primary : C.success) + '18',
              borderColor: (votingOpen ? C.primary : C.success) + '50',
            }]}>
              <View style={[s.statusDot, { backgroundColor: votingOpen ? C.primary : C.success }]} />
              <Text style={[s.statusText, { color: votingOpen ? C.primary : C.success }]}>
                {votingOpen ? 'EM VOTAÇÃO' : 'ENCERRADA'}
              </Text>
            </View>
            <Text style={s.itemMeta}>{activeItem.number} · {activeItem.type.toUpperCase()}</Text>
          </View>
          <Text style={s.activeTitle}>{activeItem.title}</Text>
          <Text style={s.activeAuthor}>
            Autoria: <Text style={{ color: C.text, fontWeight: '700' }}>{activeItem.authorName}</Text>
          </Text>
          <View style={s.scoreRow}>
            <ScoreChip label="SIM"   count={counts.sim}       color={COLOR_SIM}     s={s} />
            <ScoreChip label="NÃO"   count={counts.nao}       color={COLOR_NAO}     s={s} />
            <ScoreChip label="ABST." count={counts.abstencao} color={COLOR_ABSTAIN} s={s} />
          </View>
          <Text style={s.scoreSub}>{total} voto{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</Text>
          {!votingOpen && (isApproved || isReprovado) && (
            <View style={[s.resultCard, {
              backgroundColor: isApproved ? COLOR_SIM + '18' : COLOR_NAO + '18',
              borderColor: isApproved ? COLOR_SIM : COLOR_NAO,
            }]}>
              <Text style={[s.resultText, { color: isApproved ? COLOR_SIM : COLOR_NAO }]}>
                {isApproved ? '✅  APROVADO' : '❌  REPROVADO'}
              </Text>
            </View>
          )}
          {votingOpen && (
            <TouchableOpacity
              style={[s.closeBtn, actionLoading === 'close' && { opacity: 0.6 }]}
              onPress={confirmClose} disabled={!!actionLoading} activeOpacity={0.8}
            >
              {actionLoading === 'close'
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.closeBtnText}>⏹  Encerrar Votação</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={s.waitingCard}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>⏳</Text>
          <Text style={s.waitingTitle}>Nenhuma votação aberta</Text>
          <Text style={s.waitingText}>Selecione um projeto abaixo para iniciar a votação.</Text>
        </View>
      )}
    </View>
  );

  const agendaPanel = (
    <View style={s.rightPanel}>
      <Text style={s.sectionTitle}>ORDEM DO DIA</Text>
      {loadingItems ? (
        <ActivityIndicator color={C.primary} style={{ margin: 20 }} />
      ) : items.length === 0 ? (
        <Text style={s.emptyText}>Nenhum projeto na pauta.</Text>
      ) : (
        items.map(item => {
          const isPending = item.status === 'pendente';
          const isActive  = activeItem?.id === item.id;
          return (
            <View key={item.id} style={[s.itemCard, isActive && s.itemCardActive]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.itemNumber}>{item.number} · <Text style={s.itemType}>{item.type}</Text></Text>
                <Text style={s.itemTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={s.itemAuthor}>{item.authorName}</Text>
              </View>
              {isPending && !activeItem ? (
                <TouchableOpacity
                  style={[s.openBtn, actionLoading === 'open:' + item.id && { opacity: 0.6 }]}
                  onPress={() => openVoting(item)} disabled={!!actionLoading} activeOpacity={0.8}
                >
                  {actionLoading === 'open:' + item.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.openBtnText}>Abrir ▶</Text>
                  }
                </TouchableOpacity>
              ) : !isPending ? (
                <StatusChip status={item.status} C={C} s={s} />
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );

  if (isLandscape) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <Header router={router} connected={connected} session={session} s={s} C={C} />
        <View style={s.body}>
          <ScrollView style={s.leftScroll} contentContainerStyle={s.leftScrollContent} showsVerticalScrollIndicator={false}>
            {votingPanel}
          </ScrollView>
          <View style={s.dividerV} />
          <ScrollView style={s.rightScroll} contentContainerStyle={s.rightScrollContent} showsVerticalScrollIndicator={false}>
            {agendaPanel}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Header router={router} connected={connected} session={session} s={s} C={C} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {votingPanel}
        <View style={s.dividerH} />
        {agendaPanel}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ router, connected, session, s, C }: { router: any; connected: boolean; session?: any; s: any; C: any }) {
  return (
    <View style={s.header}>
      <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(presidente)')} />
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle}>Controle de Votação</Text>
        {session && (
          <Text style={s.headerSub}>
            {session.number}ª Sessão {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
          </Text>
        )}
      </View>
      <View style={[s.connBadge, { borderColor: connected ? COLOR_SIM + '80' : C.textMuted + '60' }]}>
        <View style={[s.connDot, { backgroundColor: connected ? COLOR_SIM : C.textMuted }]} />
        <Text style={[s.connText, { color: connected ? COLOR_SIM : C.textMuted }]}>
          {connected ? 'AO VIVO' : 'OFFLINE'}
        </Text>
      </View>
    </View>
  );
}

function ScoreChip({ label, count, color, s }: { label: string; count: number; color: string; s: any }) {
  return (
    <View style={[s.scoreChip, { borderColor: color + '40', backgroundColor: color + '12' }]}>
      <Text style={[s.scoreChipCount, { color }]}>{count}</Text>
      <Text style={s.scoreChipLabel}>{label}</Text>
    </View>
  );
}

function StatusChip({ status, C, s }: { status: string; C: any; s: any }) {
  const map: Record<string, [string, string]> = {
    aprovado:   [COLOR_SIM,     'Aprovado'],
    rejeitado:  [COLOR_NAO,     'Reprovado'],
    em_votacao: [C.primary,     'Em votação'],
    retirado:   [COLOR_ABSTAIN, 'Retirado'],
  };
  const [color, label] = map[status] ?? [C.textMuted, status];
  return (
    <View style={[s.statusChip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Text style={[s.statusChipText, { color }]}>{label}</Text>
    </View>
  );
}
