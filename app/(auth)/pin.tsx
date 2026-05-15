import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Image, Vibration, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';

const API_BASE = API_URL.replace(/\/api$/, '');
const PIN_LENGTH = 4;
const LAST_USER_KEY = 'last_vereador_id';

/* Paleta light fixa (mesma do login) */
const C = {
  bg: '#FFFFFF',
  surface: '#F5F6F8',
  card: '#FFFFFF',
  border: '#E4E7ED',
  text: '#0D1117',
  textMuted: '#8A94A2',
  primary: '#1447E6',
  primaryDark: '#0F37B8',
  danger: '#DC2626',
};

export default function PinScreen() {
  const router = useRouter();
  const { loginWithPin } = useAuth();
  const params = useLocalSearchParams<{
    userId: string; name: string; initials: string;
    avatarUrl: string; title: string; party: string;
  }>();

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
    if (pin.length === PIN_LENGTH && !loading) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await loginWithPin(params.userId, pin);
      await SecureStore.setItemAsync(LAST_USER_KEY, String(params.userId));
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

  return (
    <View style={s.root}>
      <View style={s.splitContainer}>
        {/* ── ESQUERDA — Foto do vereador ── */}
        <View style={s.leftPhotoWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={s.leftPhoto} resizeMode="cover" />
          ) : (
            <View style={[s.leftPhoto, s.leftPhotoFallback]}>
              <Text style={s.leftPhotoInitials}>
                {params.initials || (params.name ?? '').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* ── DIREITA — PIN ── */}
        <View style={s.rightForm}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Voltar</Text>
          </Pressable>

          <View style={s.userBlock}>
            <Text style={s.greeting}>Olá,</Text>
            <Text style={s.userName} numberOfLines={2}>{params.name}</Text>
            {params.title ? (
              <Text style={s.userRole}>
                {params.title.toUpperCase()}{params.party ? ` · ${params.party}` : ''}
              </Text>
            ) : null}
          </View>

          <Text style={s.instructions}>Digite seu PIN de {PIN_LENGTH} dígitos</Text>

          <View style={s.pinDots} key={shake}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
            ))}
          </View>

          <View style={s.feedbackArea}>
            {loading ? (
              <ActivityIndicator color={C.primary} size="small" />
            ) : (
              <Text style={s.errorText}>{error ?? ''}</Text>
            )}
          </View>

          {/* Numpad */}
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
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  splitContainer: { flex: 1, flexDirection: 'row' },

  /* Esquerda — foto */
  leftPhotoWrap: { flex: 1, backgroundColor: C.surface, overflow: 'hidden' },
  leftPhoto: { width: '100%', height: '100%' },
  leftPhotoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary },
  leftPhotoInitials: { color: '#fff', fontSize: 120, fontWeight: '800' },

  /* Direita — form */
  rightForm: {
    flex: 1, paddingHorizontal: 48, paddingTop: 32, paddingBottom: 32,
    backgroundColor: C.bg,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 6, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 20,
  },
  backText: { color: C.text, fontSize: 16, fontWeight: '600' },

  userBlock: { marginBottom: 24 },
  greeting: { color: C.textMuted, fontSize: 20, fontWeight: '500', marginBottom: 6 },
  userName: { color: C.text, fontSize: 36, fontWeight: '800', letterSpacing: -0.5, lineHeight: 42 },
  userRole: { color: C.textMuted, fontSize: 17, fontWeight: '700', marginTop: 8, letterSpacing: 0.5 },

  instructions: { color: C.textMuted, fontSize: 18, marginBottom: 18, fontWeight: '500' },

  pinDots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, height: 28, gap: 20 },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.border,
    backgroundColor: C.bg,
  },
  dotFilled: { backgroundColor: C.primary, borderColor: C.primary },

  feedbackArea: { height: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center', fontWeight: '600' },

  pad: { alignSelf: 'center' },
  padRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 },
  key: {
    width: 92, height: 92, borderRadius: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  keyPressed: { backgroundColor: C.border, transform: [{ scale: 0.96 }] },
  keyTxt: { color: C.text, fontSize: 38, fontWeight: '600' },
  keyEmpty: { backgroundColor: 'transparent', borderWidth: 0 },
  bsTxt: { color: C.text, fontSize: 32, fontWeight: '600' },
});
