import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  useWindowDimensions, ScrollView, Alert, Image, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useVotingSocket } from '@/hooks/useVotingSocket';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch, API_URL } from '@/lib/api';
import { Avatar } from '@/components/Avatar';

const TYPE_LABEL: Record<string, string> = {
  ordinaria: 'Ordinária',
  extraordinaria: 'Extraordinária',
  solene: 'Solene',
  especial: 'Especial',
};

interface Chamber {
  id: string; name: string; city: string; logoUrl: string | null;
  bienioInicio: number | null; bienioFim: number | null; anoBienio: number | null;
}

const API_BASE = API_URL.replace('/api', '');

function sessionTitle(number: number, type: string, ch: Chamber | null): string {
  const tipo = TYPE_LABEL[type] ?? type;
  const base = `${number}ª Sessão ${tipo}`;
  if (!ch?.bienioInicio || !ch?.bienioFim || !ch?.anoBienio) return base;
  const ord = ch.anoBienio === 1 ? '1º' : '2º';
  return `${base} do ${ord} Ano do Biênio ${ch.bienioInicio}–${ch.bienioFim}`;
}

const ROLE_LABEL: Record<string, string> = {
  presidente: 'Presidente', vereador: 'Vereador(a)',
  secretaria: 'Secretaria', superadmin: 'Super Admin',
};

interface NavCard {
  route: string; emoji: string; title: string; desc: string;
  color: string; liveKey?: 'voting';
}

const COLS = 2;

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors: C, isDark } = useTheme();
  const { session } = useActiveSession();
  const { votingOpen, connected } = useVotingSocket(session?.id ?? null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isPhone = Math.min(width, height) < 600;
  const [chamber, setChamber] = useState<Chamber | null>(null);

  const CARDS = useMemo<NavCard[]>(() => [
    { route: 'votacao',    emoji: '🗳️', title: 'Votação',               desc: 'Acompanhe e vote nas matérias',  color: C.primary,  liveKey: 'voting' },
    { route: 'expediente', emoji: '🎤', title: 'Expediente',            desc: 'Inscrição e uso da tribuna',     color: '#8B5CF6' },
    { route: 'pauta',      emoji: '📋', title: 'Ordem do Dia',          desc: 'Matérias da sessão',             color: '#F59E0B' },
    { route: 'presenca',   emoji: '✅', title: 'Presença',              desc: 'Confirme sua presença',          color: C.success },
    { route: 'regimento',  emoji: '📜', title: 'Regimento Interno',     desc: 'Consulte o regimento da câmara', color: '#EC4899' },
    { route: 'perfil',     emoji: '👤', title: 'Perfil do Parlamentar', desc: 'Seus dados e senha',             color: '#6366F1' },
  ], [C]);

  /* Divide CARDS em linhas de COLS */
  const ROWS = useMemo(() => {
    const r: NavCard[][] = [];
    for (let i = 0; i < CARDS.length; i += COLS) r.push(CARDS.slice(i, i + COLS));
    return r;
  }, [CARDS]);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    landscapeContainer: { flex: 1, flexDirection: 'row' },
    landscapeLeft: {
      width: 320, borderRightWidth: 1, borderRightColor: C.border,
      padding: 28, justifyContent: 'center', backgroundColor: C.surface,
    },
    userCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    userCardLandscape: { alignItems: 'stretch', gap: 14 },
    userInfo: { flex: 1, gap: 6 },
    userName: { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 },
    userParty: { color: C.primary, fontSize: 17, fontWeight: '600' },
    roleBadge: {
      backgroundColor: C.primary + '20', alignSelf: 'flex-start',
      borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: C.primary + '40',
    },
    roleText: { color: C.primary, fontSize: 15, fontWeight: '700' },
    sessionBlock: {
      backgroundColor: C.card, borderRadius: 8,
      borderWidth: 1, borderColor: C.success + '30', padding: 12, gap: 8,
    },
    chamberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    chamberLogo: {
      width: 40, height: 40, borderRadius: 8,
      backgroundColor: C.success + '18', borderWidth: 1, borderColor: C.success + '50',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    chamberLogoImg: { width: 40, height: 40, borderRadius: 8, flexShrink: 0 },
    chamberLogoStar: { fontSize: 20, color: C.success },
    chamberName: { color: C.text, fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 20, textTransform: 'uppercase' },
    sessionFullTitle: { color: C.success, fontSize: isPhone ? 12 : 15, fontWeight: '600', lineHeight: isPhone ? 17 : 21, textTransform: 'uppercase' },
    sessionStatus: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7,
    },
    sessionDot: { width: 9, height: 9, borderRadius: 5 },
    sessionStatusText: { fontSize: 16, fontWeight: '600' },
    connBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7,
    },
    connDot: { width: 9, height: 9, borderRadius: 5 },
    connText: { fontSize: 16, fontWeight: '600' },
    divider: { height: 1, backgroundColor: C.border },
    leaveSessionBtn: {
      borderRadius: 8, paddingVertical: 16,
      backgroundColor: '#DC2626',
      alignItems: 'center',
    },
    leaveSessionBtnPressed: { backgroundColor: '#B91C1C' },
    leaveSessionText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    /* Cards */
    card: {
      flex: 1, backgroundColor: C.card, borderRadius: 8,
      borderWidth: 1, overflow: 'hidden', position: 'relative', flexDirection: 'column',
    },
    cardIconWrap: { flex: 1.4, alignItems: 'center', justifyContent: 'center', minHeight: isPhone ? 60 : 80 },
    cardEmoji: { fontSize: isPhone ? 40 : 56 },
    cardBody: {
      flex: 1, paddingHorizontal: 8, paddingVertical: isPhone ? 10 : 16,
      alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: {
      fontSize: isPhone ? 18 : 30, fontWeight: '800',
      letterSpacing: -0.5, textAlign: 'center',
    },
    liveBadge: {
      position: 'absolute', top: 8, right: 8,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, zIndex: 1,
    },
    liveText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
    phoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    phoneName: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    phoneMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    phoneParty: { color: C.warning, fontSize: 13, fontWeight: '700' },
    phoneRoleBadge: {
      backgroundColor: C.warning + '20', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
      borderWidth: 1, borderColor: C.warning + '40',
    },
    phoneRoleText: { color: C.warning, fontSize: 11, fontWeight: '700' },
    phoneStatusRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    phoneStatusPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5,
      flexShrink: 1, flexGrow: 1, minWidth: 0,
    },
    phoneStatusText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  }), [C]);

  useEffect(() => {
    if (!user?.chamberId) return;
    apiFetch<Chamber>(`/chambers/${user.chamberId}`).then(c => setChamber(c)).catch(() => {});
  }, [user?.chamberId]);

  useEffect(() => {
    if (votingOpen) router.push('/(tabs)/votacao' as any);
  }, [votingOpen]);

  // Auto-confirma presença na sessão ativa ao entrar no app
  useEffect(() => {
    if (!session?.id) return;
    apiFetch(`/sessions/${session.id}/presence`, { method: 'POST' }).catch(() => {});
  }, [session?.id]);

  function go(route: string) { router.push(`/(tabs)/${route}` as any); }

  function handleLeaveSession() {
    Alert.alert('Sair da Sessão', 'Deseja sair da sessão atual? Sua presença será removida e você será desconectado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair da Sessão', style: 'destructive', onPress: logout },
    ]);
  }

  const PANEL_INNER = 264;

  const sessionBlock = session ? (
    <View style={s.sessionBlock}>
      <View style={s.chamberRow}>
        {chamber?.logoUrl ? (
          <Image source={{ uri: `${API_BASE}${chamber.logoUrl}` }} style={s.chamberLogoImg} resizeMode="contain" />
        ) : (
          <View style={s.chamberLogo}><Text style={s.chamberLogoStar}>⚖</Text></View>
        )}
        <Text style={s.chamberName} numberOfLines={2}>{chamber?.name ?? 'Câmara Municipal'}</Text>
      </View>
      <Text style={s.sessionFullTitle}>{sessionTitle(session.number, session.type, chamber)}</Text>
    </View>
  ) : (
    <View style={[s.sessionStatus, { borderColor: C.border }]}>
      <View style={[s.sessionDot, { backgroundColor: C.textMuted }]} />
      <Text style={[s.sessionStatusText, { color: C.textMuted }]}>Sem sessão</Text>
    </View>
  );

  function handleLogout() {
    Alert.alert('Sair', 'Deseja sair do app? Você precisará digitar seu PIN novamente para entrar.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  const leaveBtn = (
    <Pressable
      onPress={session ? handleLeaveSession : handleLogout}
      style={({ pressed }) => [s.leaveSessionBtn, pressed && s.leaveSessionBtnPressed]}
    >
      <Text style={s.leaveSessionText}>{session ? 'Sair da Sessão' : 'Sair'}</Text>
    </Pressable>
  );

  let userCard: React.ReactNode;
  if (isPhone) {
    userCard = (
      <View>
        <View style={s.phoneHeader}>
          <Avatar name={user?.name ?? ''} avatarUrl={user?.avatarUrl} width={64} height={64} borderRadius={32} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.phoneName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{user?.name}</Text>
            <View style={s.phoneMetaRow}>
              {user?.party ? <Text style={s.phoneParty}>{user.party}</Text> : null}
              <View style={s.phoneRoleBadge}>
                <Text style={s.phoneRoleText}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={s.phoneStatusRow}>
          {session ? (
            <View style={[s.phoneStatusPill, { borderColor: C.success + '40', backgroundColor: C.success + '10', flex: 2 }]}>
              <View style={[s.sessionDot, { backgroundColor: C.success }]} />
              <Text style={[s.phoneStatusText, { color: C.success }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
                {sessionTitle(session.number, session.type, chamber)}
              </Text>
            </View>
          ) : (
            <View style={[s.phoneStatusPill, { borderColor: C.border, flex: 2 }]}>
              <View style={[s.sessionDot, { backgroundColor: C.textMuted }]} />
              <Text style={[s.phoneStatusText, { color: C.textMuted }]}>Sem sessão</Text>
            </View>
          )}
          <View style={[s.phoneStatusPill, { borderColor: connected ? C.primary + '40' : C.border, backgroundColor: (connected ? C.primary : C.textMuted) + '10' }]}>
            <View style={[s.sessionDot, { backgroundColor: connected ? C.primary : C.textMuted }]} />
            <Text style={[s.phoneStatusText, { color: connected ? C.primary : C.textMuted }]} numberOfLines={1}>
              {connected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>
    );
  } else if (isLandscape) {
    userCard = (
      <View style={s.userCardLandscape}>
        {sessionBlock}
        <Avatar name={user?.name ?? ''} avatarUrl={user?.avatarUrl} width={PANEL_INNER} height={320} borderRadius={18} />
        <Text style={[s.userName, { textAlign: 'center' }]} numberOfLines={2}>{user?.name}</Text>
        {user?.party ? <Text style={[s.userParty, { textAlign: 'center' }]}>{user.party}</Text> : null}
        <View style={[s.roleBadge, { alignSelf: 'center' }]}>
          <Text style={s.roleText}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
        </View>
        <View style={[s.connBadge, { borderColor: connected ? C.primary + '40' : C.border, alignSelf: 'center' }]}>
          <View style={[s.connDot, { backgroundColor: connected ? C.primary : C.textMuted }]} />
          <Text style={[s.connText, { color: connected ? C.primary : C.textMuted }]}>
            {connected ? 'Conectado' : 'Offline'}
          </Text>
        </View>
        {leaveBtn}
      </View>
    );
  } else {
    userCard = (
      <View style={s.userCard}>
        <Avatar name={user?.name ?? ''} avatarUrl={user?.avatarUrl} width={96} height={110} borderRadius={14} />
        <View style={s.userInfo}>
          <Text style={s.userName} numberOfLines={2}>{user?.name}</Text>
          {user?.party ? <Text style={s.userParty}>{user.party}</Text> : null}
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
          </View>
          {sessionBlock}
          <View style={[s.connBadge, { borderColor: connected ? C.primary + '40' : C.border }]}>
            <View style={[s.connDot, { backgroundColor: connected ? C.primary : C.textMuted }]} />
            <Text style={[s.connText, { color: connected ? C.primary : C.textMuted }]}>
              {connected ? 'Conectado' : 'Offline'}
            </Text>
          </View>
          {leaveBtn}
        </View>
      </View>
    );
  }

  /* Grid de cards com flex — ocupa toda a altura disponível */
  const cardsGrid = (
    <View style={{ flex: isPhone ? undefined : 1, gap: 12 }}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={{ flex: isPhone ? undefined : 1, height: isPhone ? 130 : undefined, flexDirection: 'row', gap: 12 }}>
          {row.map(card => {
            const isLive = card.liveKey === 'voting' && votingOpen;
            return (
              <TouchableOpacity
                key={card.route}
                style={[s.card, { borderColor: isLive ? card.color + '70' : C.border }]}
                onPress={() => go(card.route)}
                activeOpacity={0.75}
              >
                {isLive && (
                  <View style={[s.liveBadge, { backgroundColor: card.color }]}>
                    <Text style={s.liveText}>AO VIVO</Text>
                  </View>
                )}
                <View style={[s.cardIconWrap, { backgroundColor: isDark ? card.color + '18' : card.color }]}>
                  <Text style={s.cardEmoji}>{card.emoji}</Text>
                </View>
                <View style={s.cardBody}>
                  <Text
                    style={[s.cardTitle, { color: isLive ? card.color : C.text }]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.55}
                  >
                    {card.title}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {row.length < COLS && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );

  /* ── Landscape ── */
  if (isLandscape && !isPhone) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <View style={s.landscapeContainer}>
          <View style={s.landscapeLeft}>{userCard}</View>
          <View style={{ flex: 1, padding: 20 }}>
            {cardsGrid}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Portrait ── */
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {isPhone ? (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 14 }}>
          {userCard}
          <View style={s.divider} />
          {cardsGrid}
          {leaveBtn}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 20, gap: 20 }}>
          {userCard}
          <View style={s.divider} />
          {cardsGrid}
        </View>
      )}
    </SafeAreaView>
  );
}
