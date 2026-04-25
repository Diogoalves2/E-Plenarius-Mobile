import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Session {
  id: string;
  number: number;
  type: string;
  date: string;
  status: string;
}

export function useActiveSession() {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user?.chamberId) return;
    apiFetch<Session | null>(`/sessions/active/${user.chamberId}`)
      .then(s => setSession(s?.id ? s : null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [user?.chamberId, tick]);

  function refresh() { setTick(t => t + 1); }

  return { session, loading, refresh };
}
