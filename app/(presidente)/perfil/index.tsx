import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar } from '@/components/Avatar';
import { BackButton } from '@/components/BackButton';

const ROLE_LABEL: Record<string, string> = {
  presidente: 'Presidente da Câmara',
  vereador: 'Vereador(a)',
  secretaria: 'Secretaria',
  superadmin: 'Super Admin',
};

export default function PresidentePerfilScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors: C, isDark, toggleTheme } = useTheme();

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    headerTitle: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    scroll: { padding: 20, gap: 20, alignItems: 'center' },
    avatarWrap: { alignItems: 'center', gap: 8, paddingTop: 8 },
    name: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
    title: { color: C.textMuted, fontSize: 14 },
    roleBadge: {
      backgroundColor: C.warning + '20', borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 5,
      borderWidth: 1, borderColor: C.warning + '40',
    },
    roleText: { color: C.warning, fontSize: 13, fontWeight: '700' },
    card: {
      backgroundColor: C.card, borderRadius: 16, padding: 4,
      borderWidth: 1, borderColor: C.border, width: '100%',
    },
    row: {
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    rowLabel: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    rowValue: { color: C.text, fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
    section: { width: '100%', gap: 10 },
    sectionTitle: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    themeToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: C.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: C.border,
    },
    themeIcon: { fontSize: 24 },
    themeLabel: { color: C.text, fontSize: 15, fontWeight: '600', flex: 1 },
    themeArrow: { color: C.textMuted, fontSize: 20, fontWeight: '300' },
    logoutBtn: {
      width: '100%', backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: 16, paddingVertical: 16, alignItems: 'center',
      borderWidth: 1, borderColor: C.danger + '40',
    },
    logoutText: { color: C.danger, fontSize: 15, fontWeight: '700' },
  }), [C]);

  function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  if (!user) return null;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(presidente)')} />
        <Text style={s.headerTitle}>Perfil</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.avatarWrap}>
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={96} />
          <Text style={s.name}>{user.name}</Text>
          {user.title && <Text style={s.title}>{user.title}</Text>}
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{ROLE_LABEL[user.role] ?? user.role}</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>E-MAIL</Text>
            <Text style={s.rowValue}>{user.email}</Text>
          </View>
          {user.party && (
            <View style={s.row}>
              <Text style={s.rowLabel}>PARTIDO</Text>
              <Text style={s.rowValue}>{user.party}</Text>
            </View>
          )}
          {user.chamberId && (
            <View style={[s.row, { borderBottomWidth: 0 }]}>
              <Text style={s.rowLabel}>CÂMARA</Text>
              <Text style={s.rowValue}>ID: {user.chamberId.slice(0, 8)}…</Text>
            </View>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>APARÊNCIA</Text>
          <TouchableOpacity style={s.themeToggle} onPress={toggleTheme} activeOpacity={0.8}>
            <Text style={s.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
            <Text style={s.themeLabel}>{isDark ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}</Text>
            <Text style={s.themeArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={s.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
