import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Image, RefreshControl, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/AuthContext';
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

/* ── Paleta light fixa (ignora tema do sistema) ─────────────── */
const C = {
  bg: '#FFFFFF',
  surface: '#F5F6F8',
  card: '#FFFFFF',
  border: '#E4E7ED',
  text: '#0D1117',
  textMuted: '#8A94A2',
  primary: '#1447E6',
  primaryDark: '#0F37B8',
  warningBg: '#FFFBEB',
  warningBorder: '#FCD34D',
  warningText: '#92400E',
  danger: '#DC2626',
};

export default function LoginGridScreen() {
  const router = useRouter();
  const { chamberSlug, setChamberSlug } = useAuth();
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

  const lastUser = lastUserId ? vereadores.find(v => v.id === lastUserId) : null;

  if (loading) {
    return (
      <View style={[s.root, s.loadingWrap]}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={[s.loadingText, { marginTop: 16 }]}>Carregando…</Text>
      </View>
    );
  }

  /* ─────────────────────────────────────────────────────────── */
  /*  Atalho — vereador salvo                                    */
  /* ─────────────────────────────────────────────────────────── */
  if (lastUser && !showGrid) {
    const allowed = canLogin(lastUser);
    const avatarUri = lastUser.avatarUrl ? `${API_BASE}${lastUser.avatarUrl}` : null;
    const showNoSessionWarn = lastUser.role !== 'presidente' && chamber && !chamber.hasActiveSession;

    return (
      <View style={s.root}>
        <View style={s.splitContainer}>
          {/* ── ESQUERDA — Foto do vereador, altura total ── */}
          <View style={s.leftPhotoWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.leftPhoto} resizeMode="cover" />
            ) : (
              <View style={[s.leftPhoto, s.leftPhotoFallback]}>
                <Text style={s.leftPhotoInitials}>
                  {lastUser.initials || lastUser.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={s.leftPhotoOverlay} />
          </View>

          {/* ── DIREITA — Formulário ── */}
          <View style={s.rightForm}>
            {/* Topo: logo + nome da câmara */}
            <View style={s.chamberHeader}>
              {chamber?.logoUrl ? (
                <Image source={{ uri: `${API_BASE}${chamber.logoUrl}` }} style={s.chamberLogo} resizeMode="contain" />
              ) : (
                <View style={s.chamberLogoFallback}>
                  <Text style={s.chamberLogoFallbackText}>⚖</Text>
                </View>
              )}
              <Text style={s.chamberName} numberOfLines={2}>{chamber?.name ?? 'E-Plenarius'}</Text>
            </View>

            {/* Vereador info */}
            <View style={s.userBlock}>
              <Text style={s.greeting}>Olá,</Text>
              <Text style={s.userName} numberOfLines={2}>{lastUser.name}</Text>
              {lastUser.title ? (
                <Text style={s.userRole}>
                  {lastUser.title.toUpperCase()}{lastUser.party ? ` · ${lastUser.party}` : ''}
                </Text>
              ) : null}
            </View>

            {/* Aviso de sem sessão (somente quando não há sessão) */}
            {showNoSessionWarn && (
              <View style={s.warningBox}>
                <Text style={s.warningIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.warningTitle}>Sem sessão em andamento</Text>
                  <Text style={s.warningText}>
                    Aguarde o presidente iniciar a sessão para entrar.
                  </Text>
                </View>
              </View>
            )}

            {/* Botão entrar */}
            <Pressable
              onPress={() => selectVereador(lastUser)}
              disabled={!allowed}
              style={({ pressed }) => [
                s.primaryBtn,
                !allowed && s.primaryBtnDisabled,
                pressed && allowed && s.primaryBtnPressed,
              ]}
            >
              <Text style={[s.primaryBtnText, !allowed && s.primaryBtnTextDisabled]}>
                {allowed ? 'Entrar' : (lastUser.role === 'presidente' ? 'PIN não cadastrado' : 'Aguardando sessão')}
              </Text>
            </Pressable>

            {/* Trocar usuário */}
            <Pressable
              onPress={() => setShowGrid(true)}
              style={({ pressed }) => [s.switchUserBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={s.switchUserLabel}>Não é você?</Text>
              <Text style={s.switchUserLink}>Trocar usuário</Text>
            </Pressable>

            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  /* ─────────────────────────────────────────────────────────── */
  /*  Grid de vereadores                                         */
  /* ─────────────────────────────────────────────────────────── */
  return (
    <View style={s.root}>
      <View style={s.gridHeader}>
        {chamber?.logoUrl ? (
          <Image source={{ uri: `${API_BASE}${chamber.logoUrl}` }} style={s.gridChamberLogo} resizeMode="contain" />
        ) : null}
        <Text style={s.gridChamberName} numberOfLines={2}>{chamber?.name ?? '…'}</Text>
        <Text style={s.gridSub}>Toque na sua foto para entrar</Text>
      </View>

      {chamber && !chamber.hasActiveSession && (
        <View style={s.warningBox}>
          <Text style={s.warningIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.warningTitle}>Sem sessão em andamento</Text>
            <Text style={s.warningText}>
              Vereadores só podem entrar com uma sessão aberta. Aguarde o presidente iniciar a sessão.
            </Text>
          </View>
        </View>
      )}

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
              <View style={s.cardAvatar}>
                {item.avatarUrl ? (
                  <Image source={{ uri: `${API_BASE}${item.avatarUrl}` }} style={s.cardAvatarImg} resizeMode="cover" />
                ) : (
                  <Text style={s.cardInitials}>{item.initials || item.name.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
              {item.title && <Text style={s.cardRole}>{item.title.toUpperCase()}{item.party ? ` · ${item.party}` : ''}</Text>}
              {!item.hasPin && <Text style={[s.cardBadge, s.cardBadgeWarn]}>SEM PIN</Text>}
              {item.hasPin && item.role === 'vereador' && !chamber?.hasActiveSession && (
                <Text style={[s.cardBadge, s.cardBadgeWarn]}>AGUARDANDO SESSÃO</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: C.textMuted, fontSize: 15 },

  /* ── Layout split (foto esquerda + form direita) ── */
  splitContainer: { flex: 1, flexDirection: 'row' },
  leftPhotoWrap: { flex: 1, backgroundColor: C.surface, overflow: 'hidden' },
  leftPhoto: { width: '100%', height: '100%' },
  leftPhotoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary },
  leftPhotoInitials: { color: '#fff', fontSize: 120, fontWeight: '800' },
  leftPhotoOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: 80, backgroundColor: 'rgba(255,255,255,0.0)',
  },

  rightForm: {
    flex: 1, padding: 56, justifyContent: 'center',
    backgroundColor: C.bg,
  },
  chamberHeader: {
    flexDirection: 'column', alignItems: 'center', gap: 16,
    paddingBottom: 28, marginBottom: 32,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  chamberLogo: { width: 88, height: 88 },
  chamberLogoFallback: {
    width: 88, height: 88, borderRadius: 20,
    backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  chamberLogoFallbackText: { fontSize: 44, color: C.primary },
  chamberName: { color: C.text, fontSize: 36, fontWeight: '800', letterSpacing: -0.8, lineHeight: 42, textAlign: 'center' },

  userBlock: { marginBottom: 32 },
  greeting: { color: C.textMuted, fontSize: 20, fontWeight: '500', marginBottom: 6 },
  userName: { color: C.text, fontSize: 40, fontWeight: '800', letterSpacing: -0.7, lineHeight: 46 },
  userRole: { color: C.textMuted, fontSize: 18, fontWeight: '700', marginTop: 10, letterSpacing: 0.5 },

  warningBox: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: C.warningBg, borderWidth: 1, borderColor: C.warningBorder,
    padding: 18, borderRadius: 14, marginBottom: 28,
  },
  warningIcon: { fontSize: 26 },
  warningTitle: { color: C.warningText, fontSize: 18, fontWeight: '700' },
  warningText: { color: C.warningText, fontSize: 15, marginTop: 6, lineHeight: 21 },

  primaryBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 24, alignItems: 'center',
  },
  primaryBtnPressed: { backgroundColor: C.primaryDark },
  primaryBtnDisabled: { backgroundColor: C.border },
  primaryBtnText: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.3 },
  primaryBtnTextDisabled: { color: C.textMuted },

  switchUserBtn: {
    marginTop: 28, paddingVertical: 14, alignItems: 'center',
  },
  switchUserLabel: { color: C.textMuted, fontSize: 18, fontWeight: '500' },
  switchUserLink: { color: C.primary, fontSize: 22, fontWeight: '700', marginTop: 6 },

  errorBox: {
    marginTop: 16, padding: 14, borderRadius: 12,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: C.danger, fontSize: 13, lineHeight: 19 },

  /* ── Grid ── */
  gridHeader: {
    paddingTop: 56, paddingHorizontal: 24, paddingBottom: 20,
    alignItems: 'center',
  },
  gridChamberLogo: { width: 72, height: 72, marginBottom: 12 },
  gridChamberName: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.7, textAlign: 'center', lineHeight: 38 },
  gridSub: { color: C.textMuted, fontSize: 15, marginTop: 12, textAlign: 'center' },

  grid: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12 },
  card: {
    flex: 1, margin: 8, backgroundColor: C.card,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 18, alignItems: 'center',
    minHeight: 180,
  },
  cardDisabled: { opacity: 0.5 },
  cardAvatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.border, overflow: 'hidden',
  },
  cardAvatarImg: { width: '100%', height: '100%' },
  cardInitials: { color: C.text, fontSize: 24, fontWeight: '700' },
  cardName: { color: C.text, fontSize: 14, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  cardRole: { color: C.textMuted, fontSize: 11, marginTop: 3, fontWeight: '600', letterSpacing: 0.4 },
  cardBadge: { fontSize: 10, marginTop: 6, fontWeight: '700', letterSpacing: 0.4 },
  cardBadgeWarn: { color: C.warningText },

  empty: { padding: 48, alignItems: 'center' },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
});
