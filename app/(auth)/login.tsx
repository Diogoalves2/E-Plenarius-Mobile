import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Image, RefreshControl, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { API_URL } from '@/lib/api';

interface Vereador {
  id: string;
  name: string;
  initials: string;
  party: string | null;
  title: string | null;
  avatarUrl: string | null;
  hasPin: boolean;
  role?: 'presidente' | 'vereador';
}

interface ChamberInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string | null;
  hasActiveSession: boolean;
}

const API_BASE = API_URL.replace(/\/api$/, '');
const LAST_USER_KEY = 'last_vereador_id';

export default function LoginGridScreen() {
  const router = useRouter();
  const { chamberSlug, setChamberSlug } = useAuth();
  const { colors: C } = useTheme();
  const [vereadores, setVereadores] = useState<Vereador[]>([]);
  const [chamber, setChamber] = useState<ChamberInfo | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!chamberSlug) return;
    setError(null);
    try {
      const [chamRes, vereRes, savedLast] = await Promise.all([
        fetch(`${API_URL}/chambers/by-slug/${chamberSlug}`),
        fetch(`${API_URL}/chambers/by-slug/${chamberSlug}/vereadores`),
        SecureStore.getItemAsync(LAST_USER_KEY),
      ]);
      if (!chamRes.ok || !vereRes.ok) throw new Error('Câmara não encontrada.');
      const cham: ChamberInfo = await chamRes.json();
      const vers: Vereador[] = await vereRes.json();
      setChamber(cham);
      setVereadores(vers);
      // Se há último usuário salvo E ele ainda existe na lista E tem PIN → mostra atalho
      if (savedLast && vers.some(v => v.id === savedLast && v.hasPin)) {
        setLastUserId(savedLast);
        setShowGrid(false);
      } else {
        setLastUserId(null);
        setShowGrid(true);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados da câmara.');
    } finally {
      setLoading(false);
    }
  }, [chamberSlug]);

  useEffect(() => { loadData(); }, [loadData]);

  function canLogin(v: Vereador) {
    if (!v.hasPin) return false;
    if (v.role === 'presidente') return true;
    return chamber?.hasActiveSession ?? false;
  }

  function selectVereador(v: Vereador) {
    if (!v.hasPin) {
      setError(`${v.name} ainda não tem PIN cadastrado. Solicite ao presidente que configure no painel web.`);
      return;
    }
    if (!canLogin(v)) {
      setError(`A sessão não está em andamento. Aguarde o presidente abrir a sessão para entrar.`);
      return;
    }
    router.push({
      pathname: '/(auth)/pin',
      params: {
        userId: v.id, name: v.name, initials: v.initials,
        avatarUrl: v.avatarUrl ?? '', title: v.title ?? '',
        party: v.party ?? '', role: v.role ?? 'vereador',
      },
    });
  }

  async function changeChamber() {
    await SecureStore.deleteItemAsync(LAST_USER_KEY);
    await setChamberSlug(null);
  }

  const lastUser = lastUserId ? vereadores.find(v => v.id === lastUserId) : null;

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16,
      alignItems: 'center', backgroundColor: C.bg,
    },
    title: { color: C.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
    chamberBadge: { color: C.primary, fontSize: 13, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
    sub: { color: C.textMuted, fontSize: 14, marginTop: 10, textAlign: 'center' },

    /* Banner de aviso */
    banner: {
      marginHorizontal: 16, marginTop: 8, padding: 16, borderRadius: 14,
      flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    },
    bannerWarning: {
      backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    },
    bannerSuccess: {
      backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
    },
    bannerIcon: { fontSize: 22 },
    bannerBody: { flex: 1 },
    bannerTitleWarn: { color: '#92400e', fontSize: 15, fontWeight: '700' },
    bannerTitleOk:   { color: '#047857', fontSize: 15, fontWeight: '700' },
    bannerText: { color: C.text, fontSize: 13, marginTop: 4, lineHeight: 18 },

    /* Atalho do último usuário */
    quickCard: {
      marginHorizontal: 24, marginTop: 20, padding: 20,
      backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border,
      alignItems: 'center',
    },
    quickAvatar: {
      width: 110, height: 110, borderRadius: 55,
      backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: C.primary, overflow: 'hidden',
    },
    quickAvatarImg: { width: '100%', height: '100%' },
    quickInitials: { color: C.text, fontSize: 38, fontWeight: '700' },
    quickName: { color: C.text, fontSize: 20, fontWeight: '700', marginTop: 14, textAlign: 'center' },
    quickRole: { color: C.textMuted, fontSize: 13, marginTop: 4, fontWeight: '600', letterSpacing: 0.4 },
    quickBtn: {
      marginTop: 20, paddingHorizontal: 40, paddingVertical: 16,
      backgroundColor: C.primary, borderRadius: 14, alignSelf: 'stretch', alignItems: 'center',
    },
    quickBtnDisabled: { backgroundColor: C.border },
    quickBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    quickBtnTextDisabled: { color: C.textMuted },
    quickSwitchBtn: { marginTop: 14, paddingVertical: 8 },
    quickSwitchText: { color: C.primary, fontSize: 14, fontWeight: '600' },

    /* Grid */
    grid: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12 },
    card: {
      flex: 1, margin: 8, backgroundColor: C.card,
      borderRadius: 18, borderWidth: 1, borderColor: C.border,
      padding: 18, alignItems: 'center',
      minHeight: 180,
    },
    cardDisabled: { opacity: 0.45 },
    avatar: {
      width: 76, height: 76, borderRadius: 38,
      backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: C.border, overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    initials: { color: C.text, fontSize: 24, fontWeight: '700' },
    name: { color: C.text, fontSize: 14, fontWeight: '700', marginTop: 12, textAlign: 'center' },
    role: { color: C.textMuted, fontSize: 11, marginTop: 3, fontWeight: '600', letterSpacing: 0.4 },
    badge: { fontSize: 10, marginTop: 6, fontWeight: '700', letterSpacing: 0.4 },
    badgeNoPin: { color: '#f59e0b' },
    badgeWait: { color: '#f59e0b' },

    footer: { paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
    changeBtn: { paddingVertical: 12, paddingHorizontal: 20 },
    changeText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },

    errorBox: {
      margin: 16, padding: 14, borderRadius: 12,
      backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    },
    errorText: { color: '#dc2626', fontSize: 13, lineHeight: 19 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { padding: 48, alignItems: 'center' },
    emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
  }), [C]);

  if (loading) {
    return (
      <View style={[s.root, s.loadingWrap]}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={[s.sub, { marginTop: 16 }]}>Carregando…</Text>
      </View>
    );
  }

  const sessionBanner = chamber && !chamber.hasActiveSession ? (
    <View style={[s.banner, s.bannerWarning]}>
      <Text style={s.bannerIcon}>⚠️</Text>
      <View style={s.bannerBody}>
        <Text style={s.bannerTitleWarn}>Sem sessão em andamento</Text>
        <Text style={s.bannerText}>
          Vereadores só podem entrar com uma sessão aberta. Aguarde o presidente iniciar a sessão.
        </Text>
      </View>
    </View>
  ) : chamber?.hasActiveSession ? (
    <View style={[s.banner, s.bannerSuccess]}>
      <Text style={s.bannerIcon}>🟢</Text>
      <View style={s.bannerBody}>
        <Text style={s.bannerTitleOk}>Sessão em andamento</Text>
        <Text style={s.bannerText}>Toque na sua foto para entrar.</Text>
      </View>
    </View>
  ) : null;

  /* ── Atalho do último vereador ── */
  if (lastUser && !showGrid) {
    const allowed = canLogin(lastUser);
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Text style={s.title}>{chamber?.name ?? '…'}</Text>
          <Text style={s.chamberBadge}>{chamberSlug?.toUpperCase()}</Text>
        </View>

        {sessionBanner}

        <View style={s.quickCard}>
          <View style={s.quickAvatar}>
            {lastUser.avatarUrl ? (
              <Image source={{ uri: `${API_BASE}${lastUser.avatarUrl}` }} style={s.quickAvatarImg} resizeMode="cover" />
            ) : (
              <Text style={s.quickInitials}>{lastUser.initials || lastUser.name.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <Text style={s.quickName}>{lastUser.name}</Text>
          {lastUser.title ? (
            <Text style={s.quickRole}>
              {lastUser.title.toUpperCase()}{lastUser.party ? ` · ${lastUser.party}` : ''}
            </Text>
          ) : null}

          <Pressable
            onPress={() => selectVereador(lastUser)}
            style={({ pressed }) => [s.quickBtn, !allowed && s.quickBtnDisabled, pressed && allowed && { opacity: 0.85 }]}
            disabled={!allowed}
          >
            <Text style={[s.quickBtnText, !allowed && s.quickBtnTextDisabled]}>
              {allowed ? 'Entrar' : (lastUser.role === 'presidente' ? 'Sem PIN' : 'Aguardando sessão')}
            </Text>
          </Pressable>

          <TouchableOpacity onPress={() => setShowGrid(true)} style={s.quickSwitchBtn} activeOpacity={0.6}>
            <Text style={s.quickSwitchText}>Não é você? Trocar usuário</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={[s.footer, { marginTop: 'auto' }]}>
          <TouchableOpacity style={s.changeBtn} onPress={changeChamber} activeOpacity={0.6}>
            <Text style={s.changeText}>Trocar câmara</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Grid ── */
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>{chamber?.name ?? '…'}</Text>
        <Text style={s.chamberBadge}>{chamberSlug?.toUpperCase()}</Text>
        <Text style={s.sub}>Toque na sua foto para entrar</Text>
      </View>

      {sessionBanner}

      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={vereadores}
        numColumns={2}
        keyExtractor={v => v.id}
        contentContainerStyle={s.grid}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadData} tintColor={C.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Nenhum vereador encontrado nessa câmara.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const allowed = canLogin(item);
          return (
            <TouchableOpacity
              style={[s.card, !allowed && s.cardDisabled]}
              onPress={() => selectVereador(item)}
              activeOpacity={0.7}
            >
              <View style={s.avatar}>
                {item.avatarUrl ? (
                  <Image source={{ uri: `${API_BASE}${item.avatarUrl}` }} style={s.avatarImg} resizeMode="cover" />
                ) : (
                  <Text style={s.initials}>{item.initials || item.name.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <Text style={s.name} numberOfLines={2}>{item.name}</Text>
              {item.title && <Text style={s.role}>{item.title.toUpperCase()}{item.party ? ` · ${item.party}` : ''}</Text>}
              {!item.hasPin && <Text style={[s.badge, s.badgeNoPin]}>SEM PIN</Text>}
              {item.hasPin && item.role === 'vereador' && !chamber?.hasActiveSession && (
                <Text style={[s.badge, s.badgeWait]}>AGUARDANDO SESSÃO</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <View style={s.footer}>
        <TouchableOpacity style={s.changeBtn} onPress={changeChamber} activeOpacity={0.6}>
          <Text style={s.changeText}>Trocar câmara</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
