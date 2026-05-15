import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';

/* Paleta light fixa (mesma das outras telas de auth) */
const C = {
  bg: '#FFFFFF',
  surface: '#F5F6F8',
  card: '#FFFFFF',
  border: '#E4E7ED',
  text: '#0D1117',
  textMuted: '#8A94A2',
  primary: '#1447E6',
  primaryDark: '#0F37B8',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#047857',
};

export default function SetupScreen() {
  const { setChamberSlug } = useAuth();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [chamberName, setChamberName] = useState<string | null>(null);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
    logoWrap: { alignItems: 'center', marginBottom: 48 },
    logo: {
      width: 88, height: 88, borderRadius: 8,
      backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: 1 },
    title: { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
    sub: { color: C.textMuted, fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
    form: {
      backgroundColor: C.card,
      borderRadius: 8, padding: 24,
      borderWidth: 1, borderColor: C.border,
    },
    label: {
      color: C.textMuted, fontSize: 11,
      fontWeight: '700', letterSpacing: 1.2, marginBottom: 8,
    },
    input: {
      backgroundColor: C.surface, borderRadius: 6,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 18, paddingVertical: 16,
      color: C.text, fontSize: 17,
    },
    hint: { color: C.textMuted, fontSize: 12, marginTop: 8, lineHeight: 18 },
    btn: {
      marginTop: 28, backgroundColor: C.primary, borderRadius: 8,
      paddingVertical: 17, alignItems: 'center',
    },
    btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    confirmBox: {
      marginTop: 18, padding: 16, borderRadius: 8,
      backgroundColor: C.successBg, borderWidth: 1, borderColor: C.successBorder,
    },
    confirmText: { color: C.successText, fontSize: 14, fontWeight: '600' },
  }), []);

  async function validate() {
    const cleaned = slug.trim().toLowerCase();
    if (!cleaned) {
      Alert.alert('Atenção', 'Digite o código da câmara.');
      return;
    }
    setLoading(true);
    setChamberName(null);
    try {
      const res = await fetch(`${API_URL}/chambers/by-slug/${cleaned}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.message || 'Câmara não encontrada.');
      }
      const data = await res.json();
      setChamberName(data.name);
    } catch (err: any) {
      Alert.alert('Câmara não encontrada', err.message || 'Verifique o código e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    await setChamberSlug(slug.trim().toLowerCase());
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <View style={s.logoWrap}>
          <View style={s.logo}>
            <Text style={s.logoText}>EP</Text>
          </View>
          <Text style={s.title}>Configurar tablet</Text>
          <Text style={s.sub}>
            Digite o código da sua câmara para vincular este dispositivo. Você só precisa fazer isso uma vez.
          </Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>CÓDIGO DA CÂMARA</Text>
          <TextInput
            style={s.input}
            value={slug}
            onChangeText={t => { setSlug(t.toLowerCase().replace(/[^a-z0-9-]/g, '')); setChamberName(null); }}
            placeholder="ex: vila-aurora"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <Text style={s.hint}>
            Esse é o "slug" da câmara. Peça ao presidente ou ao administrador do sistema.
          </Text>

          {chamberName && (
            <View style={s.confirmBox}>
              <Text style={s.confirmText}>✓ {chamberName}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.btn, (loading || !slug.trim()) && { opacity: 0.6 }]}
            onPress={chamberName ? confirm : validate}
            disabled={loading || !slug.trim()}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>{chamberName ? 'Confirmar e continuar' : 'Verificar câmara'}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
