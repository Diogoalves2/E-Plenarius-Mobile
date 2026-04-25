import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { C } from '@/lib/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSession } from '@/hooks/useActiveSession';
import { apiFetch } from '@/lib/api';

function useAutoPresence() {
  const { user } = useAuth();
  const { session } = useActiveSession();
  const confirmedSession = useRef<string | null>(null);

  useEffect(() => {
    if (!session || !user) return;
    if (confirmedSession.current === session.id) return;
    confirmedSession.current = session.id;
    apiFetch(`/sessions/${session.id}/presence`, { method: 'POST' }).catch(() => {});
  }, [session?.id, user?.id]);
}

export default function TabsLayout() {
  useAutoPresence();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="votacao/index" />
      <Stack.Screen name="expediente/index" />
      <Stack.Screen name="pauta/index" />
      <Stack.Screen name="presenca/index" />
      <Stack.Screen name="regimento/index" />
      <Stack.Screen name="perfil/index" />
    </Stack>
  );
}
