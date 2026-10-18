import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_URL, apiFetch } from '@/lib/api';

const WS_URL = API_URL.replace(/\/api\/?$/, '');

export interface ActiveItem {
  id: string;
  number: string;
  type: string;
  title: string;
  description?: string;
  authorName: string;
  votingType: 'aberta' | 'secreta';
  quorumMinimum: number;
  status: string;
  /** true = votação secreta em andamento: placar parcial oculto pelo backend. */
  countsHidden?: boolean;
  votesTotal?: number;
}

export interface VoteCounts { sim: number; nao: number; abstencao: number; }

export function useVotingSocket(sessionId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [counts, setCounts] = useState<VoteCounts>({ sim: 0, nao: 0, abstencao: 0 });
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [countsHidden, setCountsHidden] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);

  // Reabriu o app no meio da votação: descobre se já votou (escolha não é retornada).
  async function syncHasVoted(itemId: string) {
    try {
      const voted = await apiFetch<boolean>(`/voting/item/${itemId}/has-voted`);
      if (voted) setMyVote(prev => prev ?? 'registrado');
    } catch { /* ignora */ }
  }

  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      const token = await SecureStore.getItemAsync('access_token');
      const socket = io(`${WS_URL}/voting`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
      });
      socketRef.current = socket;

      // Access token expira em 15 min: reconexão deve levar o token atual, senão vira "guest".
      socket.io.on('reconnect_attempt', async () => {
        socket.auth = { token: await SecureStore.getItemAsync('access_token') };
      });

      socket.on('connect', () => {
        setConnected(true);
        // Backend escuta 'session:join' com objeto { sessionId }
        socket.emit('session:join', { sessionId });
      });

      socket.on('disconnect', () => setConnected(false));

      // Backend emite 'voting:opened' com { agendaItem, openedBy }
      socket.on('voting:opened', (data: { agendaItem: ActiveItem }) => {
        setActiveItem(data.agendaItem);
        setCounts({ sim: 0, nao: 0, abstencao: 0 });
        setCountsHidden(data.agendaItem.countsHidden ?? data.agendaItem.votingType === 'secreta');
        setTotalVotes(0);
        setMyVote(null);
        setVotingOpen(true);
      });

      // Backend emite 'vote:cast' com { counts: { sim, nao, abstencao }, ... }
      // Secreta em andamento: counts=null, só o total.
      socket.on('vote:cast', (data: { counts: VoteCounts | null; totalVotes?: number }) => {
        if (data.counts) setCounts(data.counts);
        setTotalVotes(data.totalVotes ?? (data.counts ? data.counts.sim + data.counts.nao + data.counts.abstencao : 0));
      });

      // Backend emite 'voting:closed' com { agendaItem, result, counts }
      socket.on('voting:closed', (data: { agendaItem: ActiveItem; counts: VoteCounts; totalVotes?: number }) => {
        setActiveItem(data.agendaItem);
        setCounts(data.counts);
        setCountsHidden(false);
        setTotalVotes(data.totalVotes ?? data.counts.sim + data.counts.nao + data.counts.abstencao);
        setVotingOpen(false);
      });

      // Estado atual ao reconectar (caso o backend implemente)
      socket.on('voting:state', (data: { item: ActiveItem | null; counts: VoteCounts | null; totalVotes?: number; open: boolean }) => {
        setActiveItem(data.item);
        if (data.counts) setCounts(data.counts);
        setCountsHidden(!!data.item?.countsHidden);
        setTotalVotes(data.totalVotes ?? 0);
        setVotingOpen(data.open);
        if (data.open && data.item) syncHasVoted(data.item.id);
      });
    })();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setActiveItem(null);
      setVotingOpen(false);
      setMyVote(null);
    };
  }, [sessionId]);

  async function vote(choice: 'sim' | 'nao' | 'abstencao', pin?: string) {
    if (!activeItem) return;
    setMyVote(choice);
    try {
      await apiFetch('/voting/cast', {
        method: 'POST',
        body: JSON.stringify({ agendaItemId: activeItem.id, choice, ...(pin ? { pin } : {}) }),
      });
    } catch (err: any) {
      if (/já votou/i.test(err?.message ?? '')) { setMyVote('registrado'); return; }
      setMyVote(null);
      throw err;
    }
  }

  return { connected, activeItem, counts, countsHidden, totalVotes, myVote, votingOpen, vote };
}
