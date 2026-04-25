import React, { useMemo, useState as useLocalState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVotingSocket } from '@/hooks/useVotingSocket';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useTheme } from '@/contexts/ThemeContext';
import { BackButton } from '@/components/BackButton';

const COLOR_SIM     = '#22c55e';
const COLOR_NAO     = '#ef4444';
const COLOR_ABSTAIN = '#f59e0b';

export default function VotacaoScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const { session, loading } = useActiveSession();
  const { connected, activeItem, counts, myVote, votingOpen, vote } = useVotingSocket(session?.id ?? null);
  const [voting, setVoting] = useLocalState(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const total = counts.sim + counts.nao + counts.abstencao;

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
    leftScrollContent: { padding: 28, gap: 20, flexGrow: 1 },
    dividerV: { width: 1, backgroundColor: C.border },
    rightScroll: { width: 380 },
    rightScrollContent: { padding: 28, gap: 18 },
    portraitScroll: { padding: 20, gap: 0 },
    dividerH: { height: 1, backgroundColor: C.border, marginVertical: 24 },
    leftPanel: { flex: 1, gap: 18 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8,
    },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusText: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
    itemMeta: { color: C.textMuted, fontSize: 16, fontWeight: '500' },
    itemTitle: { color: C.text, fontSize: 34, fontWeight: '800', lineHeight: 42, letterSpacing: -0.5 },
    itemDesc: { color: C.textMuted, fontSize: 17, lineHeight: 25 },
    itemAuthor: { color: C.textMuted, fontSize: 17 },
    itemAuthorName: { color: C.text, fontWeight: '700' },
    myVoteCard: { borderRadius: 16, borderWidth: 1.5, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center' },
    myVoteLabel: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    voteRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    voteRowLandscape: { gap: 14 },
    voteBtn: { flex: 1, borderWidth: 2, borderRadius: 16, paddingVertical: 32, alignItems: 'center', gap: 10 },
    voteBtnEmoji: { fontSize: 42 },
    voteBtnLabel: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    rightPanel: { gap: 16 },
    scoreHeading: { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, opacity: 0.5 },
    scoreSub: { color: C.textMuted, fontSize: 16, marginTop: -8 },
    scoreRow: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, padding: 20, gap: 14 },
    scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    scoreEmoji: { fontSize: 32 },
    scoreCount: { fontSize: 52, fontWeight: '900', lineHeight: 56, letterSpacing: -1 },
    scoreLabel: { color: C.textMuted, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
    barTrack: { height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },
    scorePct: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
    resultCard: { borderRadius: 18, borderWidth: 2, paddingVertical: 24, alignItems: 'center', marginTop: 8 },
    resultText: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
    emptyTitle: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
    emptyText: { color: C.textMuted, fontSize: 18, textAlign: 'center', lineHeight: 26 },
  }), [C]);

  async function handleVote(choice: 'sim' | 'nao' | 'abstencao') {
    if (voting || myVote) return;
    setVoting(true);
    try {
      await vote(choice);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível registrar seu voto.');
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!session) {
    return (
      <SafeAreaView style={s.root}>
        <Header router={router} connected={connected} s={s} C={C} />
        <View style={s.center}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🏛️</Text>
          <Text style={s.emptyTitle}>Nenhuma sessão em andamento</Text>
          <Text style={s.emptyText}>Aguarde o presidente iniciar a sessão.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeItem) {
    return (
      <SafeAreaView style={s.root}>
        <Header router={router} connected={connected} session={session} s={s} C={C} />
        <View style={s.center}>
          <Text style={{ fontSize: 64, marginBottom: 20 }}>⏳</Text>
          <Text style={s.emptyTitle}>Aguardando votação</Text>
          <Text style={s.emptyText}>O presidente irá abrir a próxima votação em breve.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = votingOpen ? C.primary : C.success;
  const statusLabel = votingOpen ? 'EM VOTAÇÃO' : 'ENCERRADA';
  const resultColor = activeItem.status === 'aprovado' ? COLOR_SIM : COLOR_NAO;
  const resultLabel = activeItem.status === 'aprovado' ? '✅  APROVADO' : '❌  REPROVADO';

  const leftPanel = (
    <View style={[s.leftPanel, !isLandscape && { flex: 0 }]}>
      <View style={s.statusRow}>
        <View style={[s.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor + '50' }]}>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={s.itemMeta}>{activeItem.number} · {activeItem.type.toUpperCase()}</Text>
      </View>
      <Text style={s.itemTitle}>{activeItem.title}</Text>
      {activeItem.description ? <Text style={s.itemDesc}>{activeItem.description}</Text> : null}
      <Text style={s.itemAuthor}>
        Autoria: <Text style={s.itemAuthorName}>{activeItem.authorName}</Text>
      </Text>
      {myVote ? (
        <View style={[s.myVoteCard, {
          backgroundColor: myVote === 'sim' ? COLOR_SIM + '18' : myVote === 'nao' ? COLOR_NAO + '18' : COLOR_ABSTAIN + '18',
          borderColor: myVote === 'sim' ? COLOR_SIM + '60' : myVote === 'nao' ? COLOR_NAO + '60' : COLOR_ABSTAIN + '60',
        }]}>
          <Text style={[s.myVoteLabel, {
            color: myVote === 'sim' ? COLOR_SIM : myVote === 'nao' ? COLOR_NAO : COLOR_ABSTAIN,
          }]}>
            {myVote === 'sim' ? '✅  Você votou SIM' : myVote === 'nao' ? '❌  Você votou NÃO' : '➖  Você se absteve'}
          </Text>
        </View>
      ) : null}
      {votingOpen && !myVote ? (
        <View style={[s.voteRow, isLandscape && s.voteRowLandscape]}>
          <VoteBtn label="SIM"    emoji="✅" color={COLOR_SIM}     disabled={voting} onPress={() => handleVote('sim')}       s={s} />
          <VoteBtn label="NÃO"    emoji="❌" color={COLOR_NAO}     disabled={voting} onPress={() => handleVote('nao')}       s={s} />
          <VoteBtn label="ABSTER" emoji="➖" color={COLOR_ABSTAIN} disabled={voting} onPress={() => handleVote('abstencao')} s={s} />
        </View>
      ) : null}
    </View>
  );

  const rightPanel = (
    <View style={s.rightPanel}>
      <Text style={s.scoreHeading}>PLACAR AO VIVO</Text>
      <Text style={s.scoreSub}>{total} voto{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</Text>
      <ScoreRow label="SIM"       count={counts.sim}       total={total} color={COLOR_SIM}     emoji="✅" s={s} />
      <ScoreRow label="NÃO"       count={counts.nao}       total={total} color={COLOR_NAO}     emoji="❌" s={s} />
      <ScoreRow label="ABSTENÇÃO" count={counts.abstencao} total={total} color={COLOR_ABSTAIN} emoji="➖" s={s} />
      {!votingOpen && activeItem.status && activeItem.status !== 'em_votacao' && (
        <View style={[s.resultCard, { backgroundColor: resultColor + '18', borderColor: resultColor }]}>
          <Text style={[s.resultText, { color: resultColor }]}>{resultLabel}</Text>
        </View>
      )}
    </View>
  );

  if (isLandscape) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <Header router={router} connected={connected} session={session} s={s} C={C} />
        <View style={s.body}>
          <ScrollView style={s.leftScroll} contentContainerStyle={s.leftScrollContent} showsVerticalScrollIndicator={false}>
            {leftPanel}
          </ScrollView>
          <View style={s.dividerV} />
          <ScrollView style={s.rightScroll} contentContainerStyle={s.rightScrollContent} showsVerticalScrollIndicator={false}>
            {rightPanel}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Header router={router} connected={connected} session={session} s={s} C={C} />
      <ScrollView contentContainerStyle={s.portraitScroll} showsVerticalScrollIndicator={false}>
        {leftPanel}
        <View style={s.dividerH} />
        {rightPanel}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ router, connected, session, s, C }: { router: any; connected: boolean; session?: any; s: any; C: any }) {
  return (
    <View style={s.header}>
      <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle}>Votação</Text>
        {session ? (
          <Text style={s.headerSub}>
            {session.number}ª Sessão {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
          </Text>
        ) : null}
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

function VoteBtn({ label, emoji, color, disabled, onPress, s }: {
  label: string; emoji: string; color: string; disabled: boolean; onPress: () => void; s: any;
}) {
  return (
    <TouchableOpacity
      style={[s.voteBtn, { borderColor: color, backgroundColor: color + '14' }, disabled && { opacity: 0.45 }]}
      onPress={onPress} activeOpacity={0.75} disabled={disabled}
    >
      <Text style={s.voteBtnEmoji}>{emoji}</Text>
      <Text style={[s.voteBtnLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ScoreRow({ label, count, total, color, emoji, s }: {
  label: string; count: number; total: number; color: string; emoji: string; s: any;
}) {
  const pct = total > 0 ? count / total : 0;
  return (
    <View style={[s.scoreRow, { borderColor: color + '30' }]}>
      <View style={s.scoreLeft}>
        <Text style={s.scoreEmoji}>{emoji}</Text>
        <View>
          <Text style={[s.scoreCount, { color }]}>{count}</Text>
          <Text style={s.scoreLabel}>{label}</Text>
        </View>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[s.scorePct, { color }]}>
        {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
      </Text>
    </View>
  );
}
