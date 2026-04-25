import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch, API_URL } from '@/lib/api';
import { BackButton } from '@/components/BackButton';

const WS_URL = API_URL.replace('/api', '');
const MEDIA_BASE = WS_URL;
const GUEST_COLOR = '#059669';

interface InscricaoUser { id: string; name: string; party?: string | null; initials?: string | null; avatarUrl?: string | null; }
interface Inscricao {
  id: string; userId: string | null;
  tipo: 'grande' | 'pequeno';
  status: 'aguardando' | 'em_andamento' | 'concluido' | 'cancelado';
  user: InscricaoUser | null;
  guestName?: string | null;
  guestCargo?: string | null;
  guestTempo?: number | null;
}
interface ExpedienteAtivo {
  inscricaoId: string; tipo: 'grande' | 'pequeno';
  tempoRestante: number; duracao: number;
  vereador: { id: string; name: string; party?: string | null; avatarUrl?: string | null; initials?: string | null };
  paused: boolean;
}

function VereadorAvatar({ avatarUrl, name, initials, size = 44, isGuest = false }: {
  avatarUrl?: string | null; name: string; initials?: string | null; size?: number; isGuest?: boolean;
}) {
  const colors = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899'];
  const bg = isGuest ? GUEST_COLOR : colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  const ini = initials || name?.split(' ').filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase() || '?';
  if (avatarUrl && !isGuest) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${MEDIA_BASE}${avatarUrl}`;
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center' }}>
      {isGuest
        ? <Text style={{ color: '#fff', fontSize: size * 0.28, fontWeight: '800' }}>🎙</Text>
        : <Text style={{ color: '#fff', fontSize: size * 0.35, fontWeight: '700' }}>{ini}</Text>
      }
    </View>
  );
}

function getDisplayInfo(item: Inscricao) {
  if (item.guestName) {
    const initials = item.guestName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
    return { name: item.guestName, party: item.guestCargo ?? null, avatarUrl: null, initials, isGuest: true };
  }
  return {
    name: item.user?.name ?? '—',
    party: item.user?.party ?? null,
    avatarUrl: item.user?.avatarUrl ?? null,
    initials: item.user?.initials ?? null,
    isGuest: false,
  };
}

export default function PresidenteExpedienteScreen() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useActiveSession();
  const { colors: C } = useTheme();
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [ativo, setAtivo] = useState<ExpedienteAtivo | null>(null);
  const [tab, setTab] = useState<'grande' | 'pequeno'>('grande');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [modalConvidado, setModalConvidado] = useState(false);
  const [convidadoNome, setConvidadoNome] = useState('');
  const [convidadoCargo, setConvidadoCargo] = useState('');
  const [convidadoTempo, setConvidadoTempo] = useState('5');
  const [convidadoTipo, setConvidadoTipo] = useState<'grande' | 'pequeno'>('grande');
  const [convidadoLoading, setConvidadoLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    headerTitle: { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    headerSub: { color: C.textMuted, fontSize: 15, marginTop: 1 },
    convidadoHeaderBtn: {
      backgroundColor: GUEST_COLOR + '20', borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 9,
      borderWidth: 1, borderColor: GUEST_COLOR + '50',
    },
    convidadoHeaderBtnText: { color: GUEST_COLOR, fontSize: 15, fontWeight: '700' },
    scroll: { padding: 16, gap: 12 },
    ativoCard: {
      backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 20, padding: 22,
      borderWidth: 1, borderColor: C.success + '40', gap: 14,
    },
    ativoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    liveBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: C.success + '20', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    },
    liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.success },
    liveBadgeText: { color: C.success, fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
    ativoTipo: { color: C.textMuted, fontSize: 17, fontWeight: '600' },
    ativoNome: { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
    ativoPartido: { color: C.textMuted, fontSize: 18, marginTop: 2 },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    timerText: { color: C.success, fontSize: 68, fontWeight: '800', letterSpacing: -1 },
    pausadoBadge: { color: C.warning, fontSize: 17, fontWeight: '700' },
    timerBar: { height: 8, backgroundColor: C.overlay, borderRadius: 4, overflow: 'hidden' },
    timerBarFill: { height: '100%', borderRadius: 4 },
    controles: { flexDirection: 'row', gap: 10, marginTop: 4 },
    ajusteBtn: {
      flex: 1, backgroundColor: C.overlay, borderRadius: 14,
      paddingVertical: 18, alignItems: 'center',
    },
    ajusteBtnText: { color: C.text, fontSize: 20, fontWeight: '700' },
    encerrarBtn: {
      flex: 1.5, backgroundColor: C.danger + '20', borderRadius: 14,
      paddingVertical: 18, alignItems: 'center',
      borderWidth: 1, borderColor: C.danger + '50',
    },
    encerrarBtnText: { color: C.danger, fontSize: 20, fontWeight: '800' },
    tabs: {
      flexDirection: 'row', backgroundColor: C.card,
      borderRadius: 16, padding: 5,
      borderWidth: 1, borderColor: C.border,
    },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 14, borderRadius: 12 },
    tabAtiva: { backgroundColor: C.warning + '20' },
    tabText: { color: C.textMuted, fontSize: 17, fontWeight: '600' },
    tabTextAtiva: { color: C.warning, fontWeight: '700' },
    tabBadge: { backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
    tabBadgeAtiva: { backgroundColor: C.warning + '30' },
    tabBadgeText: { color: C.textMuted, fontSize: 14, fontWeight: '700' },
    itemCard: {
      backgroundColor: C.card, borderRadius: 18, padding: 18,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    itemCardAtivo: { borderColor: C.warning + '50', backgroundColor: C.warning + '08' },
    itemCardGuest: { borderColor: GUEST_COLOR + '40', backgroundColor: GUEST_COLOR + '08' },
    ordem: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    ordemText: { fontSize: 20, fontWeight: '800' },
    itemNome: { color: C.text, fontSize: 22, fontWeight: '700' },
    itemPartido: { color: C.textMuted, fontSize: 17, marginTop: 3 },
    guestBadge: {
      backgroundColor: GUEST_COLOR + '20', borderRadius: 8,
      paddingHorizontal: 7, paddingVertical: 2,
      borderWidth: 1, borderColor: GUEST_COLOR + '40',
    },
    guestBadgeText: { color: GUEST_COLOR, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    guestTempo: { color: GUEST_COLOR, fontSize: 14, fontWeight: '600', marginTop: 2 },
    liberarBtn: {
      backgroundColor: C.primary, borderRadius: 14,
      paddingHorizontal: 20, paddingVertical: 14,
    },
    liberarBtnText: { color: '#fff', fontSize: 19, fontWeight: '800' },
    removerBtn: {
      backgroundColor: C.danger + '15', borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 12,
      borderWidth: 1, borderColor: C.danger + '30',
    },
    removerBtnText: { color: C.danger, fontSize: 16, fontWeight: '800' },
    ativoBadge: {
      backgroundColor: C.warning + '20', borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, borderColor: C.warning + '40',
    },
    ativoBadgeText: { color: C.warning, fontSize: 16, fontWeight: '700' },
    concluidoBadge: { backgroundColor: C.success + '15', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    concluidoText: { color: C.success, fontSize: 16, fontWeight: '700' },
    emptyCard: {
      backgroundColor: C.card, borderRadius: 18, padding: 36,
      borderWidth: 1, borderColor: C.border, alignItems: 'center',
    },
    emptyText: { color: C.textMuted, fontSize: 18 },
    emptyTitle: { color: C.text, fontSize: 22, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: 36, gap: 12,
    },
    modalTitle: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    modalSubtitle: { color: C.textMuted, fontSize: 15, marginTop: -6 },
    inputLabel: { color: C.textMuted, fontSize: 13, fontWeight: '600', marginBottom: -6, letterSpacing: 0.3 },
    input: {
      backgroundColor: C.card, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: C.border,
      color: C.text, fontSize: 17,
    },
    tipoRow: { flexDirection: 'row', gap: 10 },
    tipoBtn: {
      flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    tipoBtnAtivo: { backgroundColor: GUEST_COLOR + '20', borderColor: GUEST_COLOR + '60' },
    tipoBtnText: { color: C.textMuted, fontSize: 14, fontWeight: '600' },
    tipoBtnTextAtivo: { color: GUEST_COLOR, fontWeight: '700' },
    modalCancelBtn: {
      backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
      paddingVertical: 16, alignItems: 'center',
    },
    modalCancelBtnText: { color: C.textMuted, fontSize: 17, fontWeight: '600' },
    modalConfirmBtn: { backgroundColor: GUEST_COLOR, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    modalConfirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  }), [C]);

  const loadData = useCallback(async (sessionId: string) => {
    try {
      const [lista, ativoData] = await Promise.all([
        apiFetch<Inscricao[]>(`/expediente/sessions/${sessionId}/inscritos`),
        apiFetch<ExpedienteAtivo | null>(`/expediente/sessions/${sessionId}/ativo`).catch(() => null),
      ]);
      setInscricoes(lista);
      if (ativoData) setAtivo(ativoData);
      else setAtivo(null);
    } catch {}
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    loadData(session.id).finally(() => setLoading(false));
    (async () => {
      const token = await SecureStore.getItemAsync('access_token');
      const socket = io(`${WS_URL}/voting`, { auth: { token }, transports: ['websocket'] });
      socketRef.current = socket;
      socket.on('connect', () => socket.emit('session:join', { sessionId: session.id }));
      socket.on('expediente:inscricao_atualizada', () => loadData(session.id));
      socket.on('expediente:iniciado', (data: any) => {
        setAtivo({ inscricaoId: data.inscricaoId, tipo: data.tipo,
          tempoRestante: data.tempoRestante, duracao: data.duracao,
          vereador: data.vereador, paused: false });
        loadData(session.id);
      });
      socket.on('expediente:tick', (data: { tempoRestante: number }) => {
        setAtivo(prev => prev ? { ...prev, tempoRestante: data.tempoRestante } : null);
      });
      socket.on('expediente:ajuste', (data: { tempoRestante: number }) => {
        setAtivo(prev => prev ? { ...prev, tempoRestante: data.tempoRestante } : null);
      });
      socket.on('expediente:encerrado', () => { setAtivo(null); loadData(session.id); });
    })();
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, [session?.id]);

  async function liberar(inscricao: Inscricao) {
    if (!session) return;
    setActionLoading('lib:' + inscricao.id);
    try { await apiFetch(`/expediente/sessions/${session.id}/liberar/${inscricao.id}`, { method: 'POST' }); }
    catch (err: any) { Alert.alert('Erro', err.message || 'Não foi possível liberar o tempo.'); }
    finally { setActionLoading(null); }
  }

  async function encerrar() {
    if (!session) return;
    Alert.alert('Encerrar expediente?', 'O tempo será encerrado imediatamente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: async () => {
        setActionLoading('enc');
        try { await apiFetch(`/expediente/sessions/${session.id}/encerrar`, { method: 'POST' }); }
        catch (err: any) { Alert.alert('Erro', err.message); }
        finally { setActionLoading(null); }
      }},
    ]);
  }

  async function ajustar(delta: 1 | -1) {
    if (!session) return;
    try { await apiFetch(`/expediente/sessions/${session.id}/ajustar`, { method: 'POST', body: JSON.stringify({ delta }) }); }
    catch (err: any) { Alert.alert('Erro', err.message); }
  }

  async function adicionarConvidado() {
    if (!session || !convidadoNome.trim() || !convidadoCargo.trim()) return;
    const tempo = parseInt(convidadoTempo, 10) || 5;
    setConvidadoLoading(true);
    try {
      await apiFetch(`/expediente/sessions/${session.id}/convidado`, {
        method: 'POST',
        body: JSON.stringify({ tipo: convidadoTipo, nome: convidadoNome.trim(), cargo: convidadoCargo.trim(), tempo }),
      });
      setModalConvidado(false);
      setConvidadoNome(''); setConvidadoCargo(''); setConvidadoTempo('5');
    } catch (err: any) { Alert.alert('Erro', err.message || 'Não foi possível adicionar o convidado.'); }
    finally { setConvidadoLoading(false); }
  }

  async function removerConvidado(inscricao: Inscricao) {
    if (!session) return;
    Alert.alert('Remover convidado?', `${inscricao.guestName} será removido da lista.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        setActionLoading('rm:' + inscricao.id);
        try { await apiFetch(`/expediente/sessions/${session.id}/convidado/${inscricao.id}`, { method: 'DELETE' }); }
        catch (err: any) { Alert.alert('Erro', err.message); }
        finally { setActionLoading(null); }
      }},
    ]);
  }

  const lista = inscricoes.filter(i => i.tipo === tab && i.status !== 'cancelado');
  const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(presidente)')} />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Expediente</Text>
          {session && (
            <Text style={s.headerSub}>
              {session.number}ª Sessão {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
            </Text>
          )}
        </View>
        {session && !ativo && (
          <TouchableOpacity
            style={s.convidadoHeaderBtn}
            onPress={() => { setConvidadoTipo(tab); setModalConvidado(true); }}
            activeOpacity={0.7}
          >
            <Text style={s.convidadoHeaderBtnText}>+ Convidado</Text>
          </TouchableOpacity>
        )}
      </View>

      {sessionLoading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} /></View>
      ) : !session ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
          <Text style={s.emptyTitle}>Nenhuma sessão ativa</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {ativo && (
            <View style={s.ativoCard}>
              <View style={s.ativoHeader}>
                <View style={s.liveBadge}>
                  <View style={s.liveDot} />
                  <Text style={s.liveBadgeText}>EM ANDAMENTO</Text>
                </View>
                <Text style={s.ativoTipo}>
                  {ativo.tipo === 'grande' ? 'Grande Expediente' : 'Pequeno Expediente'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <VereadorAvatar avatarUrl={ativo.vereador.avatarUrl} name={ativo.vereador.name}
                  initials={ativo.vereador.initials} size={56} />
                <View style={{ flex: 1 }}>
                  <Text style={s.ativoNome}>{ativo.vereador.name}</Text>
                  {ativo.vereador.party && <Text style={s.ativoPartido}>{ativo.vereador.party}</Text>}
                </View>
              </View>
              <View style={s.timerRow}>
                <Text style={[s.timerText,
                  ativo.tempoRestante <= 60 && { color: C.danger },
                  ativo.paused && { color: C.warning },
                ]}>
                  {fmt(ativo.tempoRestante)}
                </Text>
                {ativo.paused && <Text style={s.pausadoBadge}>⏸ PAUSADO</Text>}
              </View>
              <View style={s.timerBar}>
                <View style={[s.timerBarFill, {
                  width: `${Math.max(0, (ativo.tempoRestante / ativo.duracao) * 100)}%` as any,
                  backgroundColor: ativo.tempoRestante <= 60 ? C.danger
                    : ativo.tempoRestante <= ativo.duracao * 0.4 ? C.warning : C.success,
                }]} />
              </View>
              <View style={s.controles}>
                <TouchableOpacity style={s.ajusteBtn} onPress={() => ajustar(-1)}>
                  <Text style={s.ajusteBtnText}>−1 min</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ajusteBtn} onPress={() => ajustar(1)}>
                  <Text style={s.ajusteBtnText}>+1 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.encerrarBtn, actionLoading === 'enc' && { opacity: 0.6 }]}
                  onPress={encerrar} disabled={actionLoading === 'enc'}
                >
                  {actionLoading === 'enc'
                    ? <ActivityIndicator color={C.danger} size="small" />
                    : <Text style={s.encerrarBtnText}>⏹ Encerrar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.tabs}>
            {(['grande', 'pequeno'] as const).map(tipo => {
              const count = inscricoes.filter(i => i.tipo === tipo && i.status === 'aguardando').length;
              return (
                <TouchableOpacity
                  key={tipo}
                  style={[s.tab, tab === tipo && s.tabAtiva]}
                  onPress={() => setTab(tipo)}
                >
                  <Text style={[s.tabText, tab === tipo && s.tabTextAtiva]}>
                    {tipo === 'grande' ? 'Grande Expediente' : 'Pequeno Expediente'}
                  </Text>
                  {count > 0 && (
                    <View style={[s.tabBadge, tab === tipo && s.tabBadgeAtiva]}>
                      <Text style={[s.tabBadgeText, tab === tipo && { color: C.warning }]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator color={C.primary} style={{ margin: 20 }} />
          ) : lista.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🎤</Text>
              <Text style={s.emptyText}>Nenhum inscrito</Text>
            </View>
          ) : (
            lista.map((item, i) => {
              const isAtivo     = ativo?.inscricaoId === item.id;
              const isConcluido = item.status === 'concluido';
              const info = getDisplayInfo(item);
              return (
                <View key={item.id} style={[s.itemCard, isAtivo && s.itemCardAtivo, info.isGuest && s.itemCardGuest]}>
                  <View style={[s.ordem, { backgroundColor: isAtivo ? C.warning + '30' : info.isGuest ? GUEST_COLOR + '20' : C.primary + '20' }]}>
                    <Text style={[s.ordemText, { color: isAtivo ? C.warning : info.isGuest ? GUEST_COLOR : C.primary }]}>{i + 1}</Text>
                  </View>
                  <VereadorAvatar avatarUrl={info.avatarUrl} name={info.name}
                    initials={info.initials} size={46} isGuest={info.isGuest} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.itemNome}>{info.name}</Text>
                      {info.isGuest && (
                        <View style={s.guestBadge}>
                          <Text style={s.guestBadgeText}>CONVIDADO</Text>
                        </View>
                      )}
                    </View>
                    {info.party && <Text style={s.itemPartido}>{info.party}</Text>}
                    {info.isGuest && item.guestTempo && (
                      <Text style={s.guestTempo}>{item.guestTempo} min</Text>
                    )}
                  </View>
                  {isConcluido ? (
                    <View style={s.concluidoBadge}>
                      <Text style={s.concluidoText}>✓ Concluído</Text>
                    </View>
                  ) : isAtivo ? (
                    <View style={s.ativoBadge}>
                      <Text style={s.ativoBadgeText}>Na tribuna</Text>
                    </View>
                  ) : !ativo && item.status === 'aguardando' ? (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      {info.isGuest && (
                        <TouchableOpacity
                          style={[s.removerBtn, actionLoading === 'rm:' + item.id && { opacity: 0.6 }]}
                          onPress={() => removerConvidado(item)} disabled={!!actionLoading}
                        >
                          <Text style={s.removerBtnText}>✕</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[s.liberarBtn, actionLoading === 'lib:' + item.id && { opacity: 0.6 }]}
                        onPress={() => liberar(item)} disabled={!!actionLoading}
                      >
                        {actionLoading === 'lib:' + item.id
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.liberarBtnText}>🎤 Liberar</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={modalConvidado} transparent animationType="slide" onRequestClose={() => setModalConvidado(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>🎙 Adicionar Convidado</Text>
              <Text style={s.modalSubtitle}>Pessoa convidada para usar a tribuna</Text>

              <Text style={s.inputLabel}>Tipo de Expediente</Text>
              <View style={s.tipoRow}>
                {(['grande', 'pequeno'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.tipoBtn, convidadoTipo === t && s.tipoBtnAtivo]}
                    onPress={() => setConvidadoTipo(t)}
                  >
                    <Text style={[s.tipoBtnText, convidadoTipo === t && s.tipoBtnTextAtivo]}>
                      {t === 'grande' ? 'Grande Expediente' : 'Pequeno Expediente'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.inputLabel}>Nome</Text>
              <TextInput style={s.input} placeholder="Nome completo" placeholderTextColor={C.textMuted}
                value={convidadoNome} onChangeText={setConvidadoNome} />

              <Text style={s.inputLabel}>Cargo / Função</Text>
              <TextInput style={s.input} placeholder="Ex: Secretário Municipal, Diretor..."
                placeholderTextColor={C.textMuted} value={convidadoCargo} onChangeText={setConvidadoCargo} />

              <Text style={s.inputLabel}>Tempo (minutos)</Text>
              <TextInput style={s.input} placeholder="5" placeholderTextColor={C.textMuted}
                value={convidadoTempo} onChangeText={setConvidadoTempo} keyboardType="number-pad" />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={[s.modalCancelBtn, { flex: 1 }]} onPress={() => setModalConvidado(false)}>
                  <Text style={s.modalCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirmBtn, { flex: 2 }, (!convidadoNome.trim() || !convidadoCargo.trim()) && { opacity: 0.5 }]}
                  onPress={adicionarConvidado}
                  disabled={convidadoLoading || !convidadoNome.trim() || !convidadoCargo.trim()}
                >
                  {convidadoLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.modalConfirmBtnText}>Adicionar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
