import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Image, Vibration, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { API_URL } from '@/lib/api';

const API_BASE = API_URL.replace(/\/api$/, '');
const PIN_LENGTH = 4;

export default function PinScreen() {
  const router = useRouter();
  const { loginWithPin } = useAuth();
  const { colors: C } = useTheme();
  const params = useLocalSearchParams<{ userId: string; name: string; initials: string; avatarUrl: string; title: string; party: string }>();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  function appendDigit(d: string) {
    if (loading || pin.length >= PIN_LENGTH) return;
    setError(null);
    setPin(prev => prev + d);
  }

  function backspace() {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
  }

  useEffect(() => {
    if (pin.length === PIN_LENGTH && !loading) {
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await loginWithPin(params.userId, pin);
      // sucesso: RootGuard redireciona
    } catch (err: any) {
      Vibration.vibrate(300);
      setError(err.message || 'PIN incorreto.');
      setPin('');
      setShake(k => k + 1);
    } finally {
      setLoading(false);
    }
  }

  const avatarUri = params.avatarUrl ? `${API_BASE}${params.avatarUrl}` : null;

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    backBtn: {
      position: 'absolute', top: 56, left: 24, zIndex: 10,
      paddingVertical: 10, paddingHorizontal: 12,
      borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    backText: { color: C.text, fontSize: 14, fontWeight: '600' },
    top: { paddingTop: 80, alignItems: 'center' },
    avatar: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: C.primary, overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    initials: { color: C.text, fontSize: 32, fontWeight: '700' },
    name: { color: C.text, fontSize: 22, fontWeight: '700', marginTop: 16, textAlign: 'center', paddingHorizontal: 40 },
    role: { color: C.textMuted, fontSize: 13, marginTop: 4, fontWeight: '600', letterSpacing: 0.4 },
    instructions: { color: C.textMuted, fontSize: 14, marginTop: 28 },

    pinDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, height: 24 },
    dot: {
      width: 16, height: 16, borderRadius: 8,
      marginHorizontal: 10,
      borderWidth: 2, borderColor: C.border,
    },
    dotFilled: { backgroundColor: C.primary, borderColor: C.primary },

    errorText: { color: '#dc2626', fontSize: 14, marginTop: 20, textAlign: 'center', fontWeight: '600', minHeight: 22 },

    pad: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 40, paddingBottom: 40 },
    padRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
    key: {
      width: 84, height: 84, borderRadius: 42,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    keyPressed: { backgroundColor: C.surface, transform: [{ scale: 0.95 }] },
    keyTxt: { color: C.text, fontSize: 30, fontWeight: '600' },
    keyEmpty: { backgroundColor: 'transparent', borderWidth: 0 },
    bsTxt: { color: C.text, fontSize: 22, fontWeight: '600' },
  }), [C]);

  return (
    <View style={s.root}>
      <Pressable style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← Voltar</Text>
      </Pressable>

      <View style={s.top}>
        <View style={s.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={s.avatarImg} resizeMode="cover" />
          ) : (
            <Text style={s.initials}>{params.initials || (params.name ?? '').slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <Text style={s.name}>{params.name}</Text>
        {params.title ? <Text style={s.role}>{params.title.toUpperCase()}{params.party ? ` · ${params.party}` : ''}</Text> : null}
        <Text style={s.instructions}>Digite seu PIN de {PIN_LENGTH} dígitos</Text>

        <View style={s.pinDots} key={shake}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} size="small" style={{ marginTop: 18 }} />
        ) : (
          <Text style={s.errorText}>{error ?? ''}</Text>
        )}
      </View>

      <View style={s.pad}>
        {[['1','2','3'], ['4','5','6'], ['7','8','9']].map(row => (
          <View key={row.join()} style={s.padRow}>
            {row.map(d => (
              <Pressable key={d} onPress={() => appendDigit(d)} disabled={loading}>
                {({ pressed }) => (
                  <View style={[s.key, pressed && s.keyPressed]}>
                    <Text style={s.keyTxt}>{d}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ))}
        <View style={s.padRow}>
          <View style={[s.key, s.keyEmpty]} />
          <Pressable onPress={() => appendDigit('0')} disabled={loading}>
            {({ pressed }) => (
              <View style={[s.key, pressed && s.keyPressed]}>
                <Text style={s.keyTxt}>0</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={backspace} disabled={loading || pin.length === 0}>
            {({ pressed }) => (
              <View style={[s.key, pressed && s.keyPressed, pin.length === 0 && { opacity: 0.3 }]}>
                <Text style={s.bsTxt}>⌫</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
