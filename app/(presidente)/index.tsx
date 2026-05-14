import React, { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  useWindowDimensions, Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useVotingSocket } from '@/hooks/useVotingSocket';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar } from '@/components/Avatar';

const ROLE_LABEL: Record<string, string> = {
  presidente: 'Presidente',
  vereador: 'Vereador(a)',
  secretaria: 'Secretaria',
  superadmin: 'Super Admin',
};

interface NavCard { route: string; emoji: string; title: string; desc: string; color: string; liveKey?: 'voting'; }

const COLS = 2;

export default function PresidenteHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors: C, isDark } = useTheme();
  const { session } = useActiveSession();
  const { votingOpen, connected } = useVotingSocket(session?.id ?? null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const CARDS = useMemo<NavCard[]>(() => [
    { route: 'controle',   emoji: '🎛️', title: 'Controle de Votação', desc: 'Abrir e fechar votações',   color: C.warning, liveKey: 'voting' },
    { route: 'expediente', emoji: '🎤', title: 'Expediente',          desc: 'Gerenciar o uso da tribuna', color: '#8B5CF6' },
    { route: 'pauta',      emoji: '📋', title: 'Ordem do Dia',        desc: 'Matérias da sessão',         color: '#F59E0B' },
    { route: 'quorum',     emoji: '👥', title: 'Quórum',              desc: 'Presenças confirmadas',      color: C.success },
    { route: 'perfil',     emoji: '👤', title: 'Perfil',              desc: 'Seus dados e sair da conta', color: C.textMuted },
  ], [C]);

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
    userCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    userCardLandscape: { alignItems: 'center', gap: 14 },
    userInfo: { flex: 1, gap: 6 },
    userName: { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 },
    userParty: { color: C.warning, fontSize: 17, fontWeight: '600' },
    roleBadge: {
      backgroundColor: C.warning + '20', alignSelf: 'flex-start',
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
      borderWidth: 1, borderColor: C.warning + '40',
    },
    roleText: { color: C.warning, fontSize: 15, fontWeight: '700' },
    sessionStatus: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    },
    sessionDot: { width: 9, height: 9, borderRadius: 5 },
    sessionStatusText: { fontSize: 16, fontWeight: '600' },
    connBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    },
    connDot: { width: 9, height: 9, borderRadius: 5 },
    connText: { fontSize: 16, fontWeight: '600' },
    logoutBtn: {
      borderRadius: 14,
      paddingVertical: 18, paddingHorizontal: 24,
      backgroundColor: '#DC2626',
      alignItems: 'center', alignSelf: 'stretch',
      marginTop: 4,
    },
    logoutBtnPressed: { backgroundColor: '#B91C1C' },
    logoutText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
    divider: { height: 1, backgroundColor: C.border },
    card: {
      flex: 1, backgroundColor: C.card, borderRadius: 20,
      borderWidth: 1, overflow: 'hidden', position: 'relative', flexDirection: 'column',
    },
    cardIconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 80 },
    cardEmoji: { fontSize: 48 },
    cardBody: { paddingHorizontal: 14, paddingBottom: 20, paddingTop: 10, gap: 6, alignItems: 'center' },
    cardTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
    cardDesc: { color: C.textMuted, fontSize: 16, lineHeight: 22, textAlign: 'center' },
    liveBadge: {
      position: 'absolute', top: 8, right: 8,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, zIndex: 1,
    },
    liveText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  }), [C]);

  useEffect(() => {
    if (votingOpen) router.push('/(presidente)/controle' as any);
  }, [votingOpen]);

  function go(route: string) { router.push(`/(presidente)/${route}` as any); }

  function handleLogout() {
    Alert.alert('Sair', 'Deseja sair do app? Você precisará digitar seu PIN novamente para entrar.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  const logoutBtn = (
    <Pressable
      onPress={handleLogout}
      style={({ pressed }) => [s.logoutBtn, pressed && s.logoutBtnPressed]}
    >
      <Text style={s.logoutText}>Sair</Text>
    </Pressable>
  );

  const PANEL_INNER = 264;

  const userCard = isLandscape ? (
    <View style={s.userCardLandscape}>
      <View style={[s.sessionStatus, { borderColor: session ? C.success + '40' : C.border, alignSelf: 'center' }]}>
        <View style={[s.sessionDot, { backgroundColor: session ? C.success : C.textMuted }]} />
        <Text style={[s.sessionStatusText, { color: session ? C.success : C.textMuted }]}>
          {session ? `${session.number}ª Sessão` : 'Sem sessão'}
        </Text>
      </View>
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
      {logoutBtn}
    </View>
  ) : (
    <View style={s.userCard}>
      <Avatar name={user?.name ?? ''} avatarUrl={user?.avatarUrl} width={96} height={110} borderRadius={14} />
      <View style={s.userInfo}>
        <Text style={s.userName} numberOfLines={2}>{user?.name}</Text>
        {user?.party ? <Text style={s.userParty}>{user.party}</Text> : null}
        <View style={s.roleBadge}>
          <Text style={s.roleText}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
        </View>
        <View style={[s.sessionStatus, { borderColor: session ? C.success + '40' : C.border }]}>
          <View style={[s.sessionDot, { backgroundColor: session ? C.success : C.textMuted }]} />
          <Text style={[s.sessionStatusText, { color: session ? C.success : C.textMuted }]}>
            {session ? `${session.number}ª Sessão` : 'Sem sessão'}
          </Text>
        </View>
        <View style={[s.connBadge, { borderColor: connected ? C.primary + '40' : C.border }]}>
          <View style={[s.connDot, { backgroundColor: connected ? C.primary : C.textMuted }]} />
          <Text style={[s.connText, { color: connected ? C.primary : C.textMuted }]}>
            {connected ? 'Conectado' : 'Offline'}
          </Text>
        </View>
        {logoutBtn}
      </View>
    </View>
  );

  const cardsGrid = (
    <View style={{ flex: 1, gap: 12 }}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
          {row.map(card => {
            const isLive = card.liveKey === 'voting' && votingOpen;
            return (
              <TouchableOpacity
                key={card.route}
                style={[s.card, { borderColor: isLive ? card.color + '70' : C.border }]}
                onPress={() => go(card.route)} activeOpacity={0.75}
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
                  <Text style={[s.cardTitle, { color: isLive ? card.color : C.text }]} numberOfLines={2}>
                    {card.title}
                  </Text>
                  <Text style={s.cardDesc} numberOfLines={2}>{card.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {row.length < COLS && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );

  if (isLandscape) {
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

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={{ flex: 1, padding: 20, gap: 20 }}>
        {userCard}
        <View style={s.divider} />
        {cardsGrid}
      </View>
    </SafeAreaView>
  );
}
