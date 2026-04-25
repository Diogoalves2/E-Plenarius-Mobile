import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_URL, apiFetch } from '@/lib/api';

const WS_URL = API_URL.replace('/api', '');

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
}

export interface VoteCounts { sim: number; nao: number; abstencao: number; }

export function useVotingSocket(sessionId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [counts, setCounts] = useState<VoteCounts>({ sim: 0, nao: 0, abstencao: 0 });
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votingOpen, setVotingOpen] = useState(false);

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
        setMyVote(null);
        setVotingOpen(true);
      });

      // Backend emite 'vote:cast' com { counts: { sim, nao, abstencao }, ... }
      socket.on('vote:cast', (data: { counts: VoteCounts }) => {
        setCounts(data.counts);
      });

      // Backend emite 'voting:closed' com { agendaItem, result, counts }
      socket.on('voting:closed', (data: { agendaItem: ActiveItem; counts: VoteCounts }) => {
        setActiveItem(data.agendaItem);
        setCounts(data.counts);
        setVotingOpen(false);
      });

      // Estado atual ao reconectar (caso o backend implemente)
      socket.on('voting:state', (data: { item: ActiveItem | null; counts: VoteCounts; open: boolean }) => {
        setActiveItem(data.item);
        setCounts(data.counts);
        setVotingOpen(data.open);
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

  async function vote(choice: 'sim' | 'nao' | 'abstencao') {
    if (!activeItem) return;
    setMyVote(choice);
    try {
      await apiFetch('/voting/cast', {
        method: 'POST',
        body: JSON.stringify({ agendaItemId: activeItem.id, choice }),
      });
    } catch (err: any) {
      setMyVote(null);
      throw err;
    }
  }

  return { connected, activeItem, counts, myVote, votingOpen, vote };
}
