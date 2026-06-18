import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch, API_URL } from '@/lib/api';
import { BackButton } from '@/components/BackButton';

const WS_URL = API_URL.replace('/api', '');
const MEDIA_BASE = WS_URL;

interface InscricaoUser { id: string; name: string; party?: string | null; }
interface Inscricao {
  id: string; userId: string;
  tipo: 'grande' | 'pequeno';
  status: 'aguardando' | 'em_andamento' | 'concluido' | 'cancelado';
  user: InscricaoUser;
}
interface ExpedienteAtivo {
  inscricaoId: string; tipo: 'grande' | 'pequeno';
  tempoRestante: number; duracao: number;
  vereador: { id: string; name: string; party?: string | null; avatarUrl?: string | null; initials?: string | null };
  paused: boolean;
}

export default function ExpedienteScreen() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useActiveSession();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const { width, height } = useWindowDimensions();
  const isPhone = Math.min(width, height) < 600;
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [ativo, setAtivo] = useState<ExpedienteAtivo | null>(null);
  const [inscricoesAbertas, setInscricoesAbertas] = useState<{ grande: boolean; pequeno: boolean }>({ grande: false, pequeno: false });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const st = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 14, paddingVertical: isPhone ? 10 : 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
      backgroundColor: C.bg,
    },
    headerTitle: { color: C.text, fontSize: isPhone ? 16 : 20, fontWeight: '700', letterSpacing: -0.3, flex: 1 },
    scroll: { padding: isPhone ? 12 : 16, gap: isPhone ? 12 : 16 },
    sectionsRow: { flexDirection: isPhone ? 'column' : 'row', gap: isPhone ? 12 : 14 },
    ativoCard: {
      backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 20, padding: 24,
      borderWidth: 1, borderColor: C.success + '40', gap: 14,
    },
    ativoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    liveBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: C.success + '20', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    },
    liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.success },
    liveBadgeText: { color: C.success, fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
    ativoTipo: { color: C.textMuted, fontSize: 15, fontWeight: '600' },
    ativoVereadorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    ativoNome: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    ativoPartido: { color: C.textMuted, fontSize: 16 },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    timerText: { color: C.success, fontSize: 64, fontWeight: '800', letterSpacing: -1 },
    pausedBadge: { color: C.warning, fontSize: 15, fontWeight: '700' },
    timerBar: { height: 8, backgroundColor: C.overlay, borderRadius: 4, overflow: 'hidden' },
    timerBarFill: { height: '100%', borderRadius: 4 },
    section: {
      backgroundColor: C.card, borderRadius: 20, padding: 20,
      borderWidth: 1, gap: 16, minHeight: 360, flexDirection: 'column',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
    sectionIcon: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    sectionTitulo: { color: C.text, fontSize: 20, fontWeight: '800' },
    sectionDuracao: { fontSize: 15, fontWeight: '600', marginTop: 3 },
    actionBtn: { borderRadius: 16, paddingVertical: 22, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
    inscritoBadge: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
    inscritoBadgeText: { fontSize: 16, fontWeight: '700' },
    lista: { gap: 0, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
    listaItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
    listaItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    listaOrdem: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    listaOrdemText: { fontSize: 16, fontWeight: '800' },
    listaNome: { color: C.text, fontSize: 18, fontWeight: '600' },
    listaPartido: { color: C.textMuted, fontSize: 15, marginTop: 2 },
    emptyList: { color: C.textMuted, fontSize: 16, textAlign: 'center', paddingVertical: 8 },
    emptyTitle: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptyText: { color: C.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  }), [C]);

  async function loadData(sessionId: string) {
    setLoading(true);
    try {
      const [lista, ativoData] = await Promise.all([
        apiFetch<Inscricao[]>(`/expediente/sessions/${sessionId}/inscritos`),
        apiFetch<any>(`/expediente/sessions/${sessionId}/ativo`).catch(() => null),
      ]);
      setInscricoes(lista);
      if (ativoData?.inscricoesAbertas) setInscricoesAbertas(ativoData.inscricoesAbertas);
      if (ativoData && (ativoData.inscricaoId || ativoData.vereador)) setAtivo(ativoData);
      else setAtivo(null);
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    loadData(session.id);
    (async () => {
      const token = await SecureStore.getItemAsync('access_token');
      const socket = io(`${WS_URL}/voting`, { auth: { token }, transports: ['websocket'] });
      socketRef.current = socket;
      socket.on('connect', () => socket.emit('session:join', { sessionId: session.id }));
      socket.on('expediente:iniciado', (data: any) => {
        setAtivo({ inscricaoId: data.inscricaoId, tipo: data.tipo,
          tempoRestante: data.tempoRestante, duracao: data.duracao, vereador: data.vereador, paused: false });
        loadData(session.id);
      });
      socket.on('expediente:tick', (data: { tempoRestante: number }) => {
        setAtivo(prev => prev ? { ...prev, tempoRestante: data.tempoRestante } : null);
      });
      socket.on('expediente:ajuste', (data: { tempoRestante: number }) => {
        setAtivo(prev => prev ? { ...prev, tempoRestante: data.tempoRestante } : null);
      });
      socket.on('expediente:encerrado', () => { setAtivo(null); loadData(session.id); });
      socket.on('expediente:inscricoes_status', (data: any) => {
        if (!data || (data.tipo !== 'grande' && data.tipo !== 'pequeno')) return;
        setInscricoesAbertas(prev => ({ ...prev, [data.tipo]: !!data.aberta }));
      });
    })();
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, [session?.id]);

  async function inscrever(tipo: 'grande' | 'pequeno') {
    if (!session) return;
    setSubmitting(tipo);
    try {
      await apiFetch(`/expediente/sessions/${session.id}/inscrever`, { method: 'POST', body: JSON.stringify({ tipo }) });
      await loadData(session.id);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível realizar a inscrição.');
    } finally { setSubmitting(null); }
  }

  async function cancelar(tipo: 'grande' | 'pequeno') {
    Alert.alert('Cancelar inscrição?',
      `Deseja remover sua inscrição no ${tipo === 'grande' ? 'Grande' : 'Pequeno'} Expediente?`,
      [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim, cancelar', style: 'destructive', onPress: async () => {
          if (!session) return;
          setSubmitting('cancel:' + tipo);
          try {
            await apiFetch(`/expediente/sessions/${session.id}/cancelar/${tipo}`, { method: 'DELETE' });
            await loadData(session.id);
          } catch (err: any) {
            Alert.alert('Erro', err.message || 'Não foi possível cancelar.');
          } finally { setSubmitting(null); }
        }},
      ],
    );
  }

  const grandeList = inscricoes.filter(i => i.tipo === 'grande' && i.status === 'aguardando');
  const pequenoList = inscricoes.filter(i => i.tipo === 'pequeno' && i.status === 'aguardando');
  const minhaGrande = inscricoes.find(i => i.userId === user?.id && i.tipo === 'grande' && i.status === 'aguardando');
  const minhaPequeno = inscricoes.find(i => i.userId === user?.id && i.tipo === 'pequeno' && i.status === 'aguardando');
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={st.root}>
      <View style={st.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
        <Text style={st.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Expediente</Text>
      </View>

      {sessionLoading ? (
        <View style={st.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : !session ? (
        <View style={st.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
          <Text style={st.emptyTitle}>Nenhuma sessão ativa</Text>
          <Text style={st.emptyText}>Aguarde o presidente iniciar a sessão.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          {ativo && (
            <View style={st.ativoCard}>
              <View style={st.ativoHeader}>
                <View style={st.liveBadge}>
                  <View style={st.liveDot} />
                  <Text style={st.liveBadgeText}>EM ANDAMENTO</Text>
                </View>
                <Text style={st.ativoTipo}>
                  {ativo.tipo === 'grande' ? 'Grande Expediente' : 'Pequeno Expediente'}
                </Text>
              </View>
              <View style={st.ativoVereadorRow}>
                <VereadorAvatar avatarUrl={ativo.vereador.avatarUrl} name={ativo.vereador.name}
                  initials={ativo.vereador.initials} size={72} />
                <View style={{ flex: 1 }}>
                  <Text style={st.ativoNome}>{ativo.vereador.name}</Text>
                  {ativo.vereador.party && <Text style={st.ativoPartido}>{ativo.vereador.party}</Text>}
                </View>
              </View>
              <View style={st.timerRow}>
                <Text style={[st.timerText,
                  ativo.tempoRestante <= 60 && { color: C.danger },
                  ativo.paused && { color: C.warning },
                ]}>
                  {fmt(ativo.tempoRestante)}
                </Text>
                {ativo.paused && <Text style={st.pausedBadge}>⏸ PAUSADO</Text>}
              </View>
              <View style={st.timerBar}>
                <View style={[st.timerBarFill, {
                  width: `${Math.max(0, (ativo.tempoRestante / ativo.duracao) * 100)}%` as any,
                  backgroundColor: ativo.tempoRestante <= 60 ? C.danger
                    : ativo.tempoRestante <= ativo.duracao * 0.4 ? C.warning : C.success,
                }]} />
              </View>
            </View>
          )}

          <View style={st.sectionsRow}>
            <ExpedienteSection
              tipo="grande" titulo="Grande Expediente" duracao="10 minutos" emoji="🎤" color={C.primary}
              lista={grandeList} inscrito={!!minhaGrande} submitting={submitting} aberta={inscricoesAbertas.grande}
              onInscrever={() => inscrever('grande')} onCancelar={() => cancelar('grande')}
              userId={user?.id ?? ''} flex={!isPhone} C={C} st={st}
            />
            <ExpedienteSection
              tipo="pequeno" titulo="Pequeno Expediente" duracao="5 minutos" emoji="🗣️" color="#8B5CF6"
              lista={pequenoList} inscrito={!!minhaPequeno} submitting={submitting} aberta={inscricoesAbertas.pequeno}
              onInscrever={() => inscrever('pequeno')} onCancelar={() => cancelar('pequeno')}
              userId={user?.id ?? ''} flex={!isPhone} C={C} st={st}
            />
          </View>

          {loading && <ActivityIndicator color={C.primary} style={{ marginTop: 8 }} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function VereadorAvatar({ avatarUrl, name, initials, size = 44 }: {
  avatarUrl?: string | null; name: string; initials?: string | null; size?: number;
}) {
  const colors = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899'];
  const bg = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  const ini = initials || name?.split(' ').filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase() || '?';
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${MEDIA_BASE}${avatarUrl}`;
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.35, fontWeight: '700' }}>{ini}</Text>
    </View>
  );
}

function ExpedienteSection({
  tipo, titulo, duracao, emoji, color, lista, inscrito, submitting, aberta,
  onInscrever, onCancelar, userId, flex, C, st,
}: {
  tipo: 'grande' | 'pequeno'; titulo: string; duracao: string; emoji: string; color: string;
  lista: Inscricao[]; inscrito: boolean; submitting: string | null; aberta: boolean;
  onInscrever: () => void; onCancelar: () => void; userId: string; flex?: boolean; C: any; st: any;
}) {
  const isLoading = submitting === tipo || submitting === 'cancel:' + tipo;
  return (
    <View style={[st.section, { borderColor: color + '30' }, flex && { flex: 1 }]}>
      <View style={st.sectionHeader}>
        <View style={[st.sectionIcon, { backgroundColor: color + '20' }]}>
          <Text style={{ fontSize: 30 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.sectionTitulo}>{titulo}</Text>
          <Text style={[st.sectionDuracao, { color }]}>
            {duracao} · {lista.length} inscrito{lista.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {inscrito && (
        <View style={[st.inscritoBadge, { backgroundColor: color + '15', borderColor: color + '40' }]}>
          <Text style={[st.inscritoBadgeText, { color }]}>✓ Você está inscrito</Text>
        </View>
      )}

      {lista.length > 0 && (
        <View style={st.lista}>
          {lista.map((item, i) => (
            <View key={item.id} style={[st.listaItem, i < lista.length - 1 && st.listaItemBorder]}>
              <View style={[st.listaOrdem, { backgroundColor: color + '20' }]}>
                <Text style={[st.listaOrdemText, { color }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.listaNome, item.userId === userId && { color }]}>
                  {item.user?.name ?? '—'}{item.userId === userId ? ' (você)' : ''}
                </Text>
                {item.user?.party ? <Text style={st.listaPartido}>{item.user.party}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {lista.length === 0 && <Text style={st.emptyList}>Nenhum inscrito ainda.</Text>}

      {flex && <View style={{ flex: 1 }} />}

      {inscrito ? (
        <TouchableOpacity
          style={[st.actionBtn, { borderColor: C.danger + '60', borderWidth: 1.5 }]}
          onPress={onCancelar} disabled={isLoading} activeOpacity={0.8}
        >
          {isLoading
            ? <ActivityIndicator color={C.danger} size="small" />
            : <Text style={[st.actionBtnText, { color: C.danger }]}>Cancelar inscrição</Text>
          }
        </TouchableOpacity>
      ) : !aberta ? (
        <View style={[st.actionBtn, { backgroundColor: C.border, opacity: 0.7 }]}>
          <Text style={[st.actionBtnText, { color: C.textMuted, fontSize: 14 }]}>
            Aguardando presidente abrir
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: color }]}
          onPress={onInscrever} disabled={isLoading} activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={[st.actionBtnText, { color: '#fff' }]}>Inscrever-se</Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}
