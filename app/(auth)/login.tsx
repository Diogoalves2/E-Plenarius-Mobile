import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors: C } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
    logoWrap: { alignItems: 'center', marginBottom: 40 },
    logo: {
      width: 72, height: 72, borderRadius: 20,
      backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, shadowColor: C.primary, shadowOpacity: 0.4,
      shadowRadius: 20, elevation: 10,
    },
    logoText: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 1 },
    appName: { color: C.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    appSub: { color: C.textMuted, fontSize: 13, marginTop: 4 },
    form: {
      backgroundColor: C.card,
      borderRadius: 20, padding: 24,
      borderWidth: 1, borderColor: C.border,
    },
    label: {
      color: C.textMuted, fontSize: 11,
      fontWeight: '600', letterSpacing: 1, marginBottom: 6,
    },
    input: {
      backgroundColor: C.surface, borderRadius: 12,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 16, paddingVertical: 14,
      color: C.text, fontSize: 15,
    },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: 12,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 16,
    },
    eyeBtn: { paddingLeft: 12, paddingVertical: 14 },
    eyeText: { color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    btn: {
      marginTop: 24, backgroundColor: C.primary, borderRadius: 14,
      paddingVertical: 15, alignItems: 'center',
      shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    footer: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginTop: 32 },
  }), [C]);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha usuário e senha.');
      return;
    }
    setLoading(true);
    try {
      await login(identifier.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert('Erro ao entrar', err.message || 'Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        <View style={s.logoWrap}>
          <View style={s.logo}>
            <Text style={s.logoText}>EP</Text>
          </View>
          <Text style={s.appName}>E-Plenarius</Text>
          <Text style={s.appSub}>Sistema de Gestão de Sessões</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>USUÁRIO OU E-MAIL</Text>
          <TextInput
            style={s.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="pedro ou pedro@camara.leg.br"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[s.label, { marginTop: 16 }]}>SENHA</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={[s.input, { flex: 1, borderWidth: 0, paddingRight: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={s.eyeBtn}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.eyeText}>{showPassword ? 'OCULTAR' : 'VER'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>v1.0.0 · E-Plenarius</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
