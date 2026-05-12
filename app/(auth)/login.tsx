import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Image, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
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
}

const API_BASE = API_URL.replace(/\/api$/, '');

export default function LoginGridScreen() {
  const router = useRouter();
  const { chamberSlug, setChamberSlug } = useAuth();
  const { colors: C } = useTheme();
  const [vereadores, setVereadores] = useState<Vereador[]>([]);
  const [chamberName, setChamberName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!chamberSlug) return;
    setError(null);
    try {
      const [chamRes, vereRes] = await Promise.all([
        fetch(`${API_URL}/chambers/by-slug/${chamberSlug}`),
        fetch(`${API_URL}/chambers/by-slug/${chamberSlug}/vereadores`),
      ]);
      if (!chamRes.ok || !vereRes.ok) throw new Error('Câmara não encontrada.');
      const cham = await chamRes.json();
      const vers = await vereRes.json();
      setChamberName(cham.name);
      setVereadores(vers);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar lista de vereadores.');
    } finally {
      setLoading(false);
    }
  }, [chamberSlug]);

  useEffect(() => { loadData(); }, [loadData]);

  function selectVereador(v: Vereador) {
    if (!v.hasPin) {
      // Mostra alerta amigável ao invés de só silenciar
      // — usando setError pra aparecer abaixo do grid
      setError(`${v.name} ainda não tem PIN cadastrado. Solicite ao presidente que configure no painel web.`);
      return;
    }
    router.push({ pathname: '/(auth)/pin', params: { userId: v.id, name: v.name, initials: v.initials, avatarUrl: v.avatarUrl ?? '', title: v.title ?? '', party: v.party ?? '' } });
  }

  async function changeChamber() {
    await setChamberSlug(null);
  }

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      paddingTop: 56, paddingHorizontal: 24, paddingBottom: 20,
      alignItems: 'center', backgroundColor: C.bg,
    },
    title: { color: C.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
    chamber: { color: C.primary, fontSize: 13, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
    sub: { color: C.textMuted, fontSize: 14, marginTop: 12, textAlign: 'center' },
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
    noPin: { color: '#f59e0b', fontSize: 10, marginTop: 6, fontWeight: '700', letterSpacing: 0.4 },
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
        <Text style={[s.sub, { marginTop: 16 }]}>Carregando vereadores…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>{chamberName ?? '…'}</Text>
        <Text style={s.chamber}>{chamberSlug?.toUpperCase()}</Text>
        <Text style={s.sub}>Toque na sua foto para entrar</Text>
      </View>

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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, !item.hasPin && s.cardDisabled]}
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
            {!item.hasPin && <Text style={s.noPin}>SEM PIN</Text>}
          </TouchableOpacity>
        )}
      />

      <View style={s.footer}>
        <TouchableOpacity style={s.changeBtn} onPress={changeChamber} activeOpacity={0.6}>
          <Text style={s.changeText}>Trocar câmara</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
