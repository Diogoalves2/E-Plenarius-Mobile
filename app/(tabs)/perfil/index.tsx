import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsPhone } from '@/hooks/useIsPhone';
import { Avatar } from '@/components/Avatar';
import { apiFetch } from '@/lib/api';
import { BackButton } from '@/components/BackButton';

const ROLE_LABEL: Record<string, string> = {
  presidente: 'Presidente da Câmara',
  vereador: 'Vereador(a)',
  secretaria: 'Secretaria',
  superadmin: 'Super Admin',
};

export default function PerfilScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { colors: C, isDark, toggleTheme } = useTheme();
  const isPhone = useIsPhone();

  const [usernameInput, setUsernameInput] = useState(user?.username ?? '');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { color: C.text, fontSize: isPhone ? 16 : 22, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
    headerSub: { color: C.textMuted, fontSize: isPhone ? 12 : 15, marginTop: 1 },
    scroll: { padding: 20, gap: 20, alignItems: 'center' },
    avatarWrap: { alignItems: 'center', gap: 8, paddingTop: 8 },
    name: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
    title: { color: C.textMuted, fontSize: 17 },
    roleBadge: {
      backgroundColor: C.primary + '20', borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: C.primary + '40',
    },
    roleText: { color: C.primary, fontSize: 15, fontWeight: '700' },
    card: {
      backgroundColor: C.card, borderRadius: 16, padding: 4,
      borderWidth: 1, borderColor: C.border, width: '100%',
    },
    row: {
      paddingHorizontal: 16, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: C.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    rowLabel: { color: C.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
    rowValue: { color: C.text, fontSize: 17, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
    section: { width: '100%', gap: 10 },
    sectionTitle: { color: C.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
    inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    input: {
      backgroundColor: C.card, borderRadius: 12,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 14, paddingVertical: 14,
      color: C.text, fontSize: 17,
    },
    saveBtn: {
      backgroundColor: C.primary, borderRadius: 12,
      paddingHorizontal: 18, paddingVertical: 14,
    },
    saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    feedback: { fontSize: 15, fontWeight: '500', marginTop: -2 },
    pwdInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
    pwdInput: {
      color: C.text, fontSize: 17, fontWeight: '500',
      minWidth: 110, textAlign: 'right',
    },
    pwdToggle: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
    pwdBtn: {
      width: '100%', backgroundColor: C.primary,
      borderRadius: 16, paddingVertical: 17, alignItems: 'center',
    },
    pwdBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    themeToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: C.card, borderRadius: 16, padding: 18,
      borderWidth: 1, borderColor: C.border,
    },
    themeIcon: { fontSize: 26 },
    themeLabel: { color: C.text, fontSize: 17, fontWeight: '600', flex: 1 },
    themeArrow: { color: C.textMuted, fontSize: 22, fontWeight: '300' },
  }), [C, isPhone]);

  async function handleSaveUsername() {
    const val = usernameInput.trim().toLowerCase().replace(/\s/g, '');
    if (val.length > 0 && val.length < 3) {
      setUsernameMsg({ ok: false, text: 'Mínimo 3 caracteres.' });
      return;
    }
    setUsernameSaving(true);
    setUsernameMsg(null);
    try {
      const updated = await apiFetch<any>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ username: val || null }),
      });
      await updateUser({ username: updated.username });
      setUsernameMsg({ ok: true, text: 'Usuário atualizado com sucesso.' });
    } catch (err: any) {
      setUsernameMsg({ ok: false, text: err.message || 'Erro ao salvar.' });
    } finally {
      setUsernameSaving(false);
    }
  }

  async function handleSavePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ ok: false, text: 'Preencha todos os campos.' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ ok: false, text: 'Nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: 'Nova senha e confirmação não coincidem.' });
      return;
    }
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      await apiFetch('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      setPwdMsg({ ok: true, text: 'Senha alterada com sucesso.' });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      setPwdMsg({ ok: false, text: err.message || 'Erro ao alterar senha.' });
    } finally {
      setPwdSaving(false);
    }
  }

  if (!user) return null;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
        <View>
          <Text style={s.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>Perfil do Parlamentar</Text>
          <Text style={s.headerSub}>Seus dados e senha</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={s.avatarWrap}>
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={96} />
          <Text style={s.name}>{user.name}</Text>
          {user.title && <Text style={s.title}>{user.title}</Text>}
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{ROLE_LABEL[user.role] ?? user.role}</Text>
          </View>
        </View>

        <View style={s.card}>
          <InfoRow label="E-MAIL" value={user.email} s={s} C={C} />
          <InfoRow label="USUÁRIO" value={user.username ?? '—'} s={s} C={C} last={!user.party && !user.chamberId} />
          {user.party && <InfoRow label="PARTIDO" value={user.party} s={s} C={C} last={!user.chamberId} />}
          {user.chamberId && <InfoRow label="CÂMARA" value={`ID: ${user.chamberId.slice(0, 8)}…`} s={s} C={C} last />}
        </View>

        {/* ── Tema ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>APARÊNCIA</Text>
          <TouchableOpacity style={s.themeToggle} onPress={toggleTheme} activeOpacity={0.8}>
            <Text style={s.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
            <Text style={s.themeLabel}>{isDark ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}</Text>
            <Text style={s.themeArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Alterar usuário ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>NOME DE USUÁRIO</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={usernameInput}
              onChangeText={v => { setUsernameInput(v.toLowerCase().replace(/\s/g, '')); setUsernameMsg(null); }}
              placeholder="ex: pedro"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[s.saveBtn, { opacity: usernameSaving ? 0.6 : 1 }]}
              onPress={handleSaveUsername}
              disabled={usernameSaving}
              activeOpacity={0.8}
            >
              <Text style={s.saveBtnText}>{usernameSaving ? 'Salvando…' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
          {usernameMsg && (
            <Text style={[s.feedback, { color: usernameMsg.ok ? C.success : C.danger }]}>
              {usernameMsg.text}
            </Text>
          )}
        </View>

        {/* ── Alterar senha ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ALTERAR SENHA</Text>
          <View style={s.card}>
            <PwdRow
              label="SENHA ATUAL"
              value={currentPwd}
              onChangeText={v => { setCurrentPwd(v); setPwdMsg(null); }}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              s={s} C={C}
            />
            <PwdRow
              label="NOVA SENHA"
              value={newPwd}
              onChangeText={v => { setNewPwd(v); setPwdMsg(null); }}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
              s={s} C={C}
            />
            <PwdRow
              label="CONFIRMAR NOVA SENHA"
              value={confirmPwd}
              onChangeText={v => { setConfirmPwd(v); setPwdMsg(null); }}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              s={s} C={C}
              last
            />
          </View>
          {pwdMsg && (
            <Text style={[s.feedback, { color: pwdMsg.ok ? C.success : C.danger }]}>
              {pwdMsg.text}
            </Text>
          )}
          <TouchableOpacity
            style={[s.pwdBtn, { opacity: pwdSaving ? 0.6 : 1 }]}
            onPress={handleSavePassword}
            disabled={pwdSaving}
            activeOpacity={0.8}
          >
            <Text style={s.pwdBtnText}>{pwdSaving ? 'Salvando…' : 'Alterar Senha'}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last, s, C }: {
  label: string; value: string; last?: boolean; s: any; C: any;
}) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function PwdRow({ label, value, onChangeText, show, onToggle, last, s, C }: {
  label: string; value: string; onChangeText: (v: string) => void;
  show: boolean; onToggle: () => void; last?: boolean; s: any; C: any;
}) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }, { paddingVertical: 10 }]}>
      <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
      <View style={s.pwdInputWrap}>
        <TextInput
          style={s.pwdInput}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          placeholder="••••••••"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.pwdToggle}>{show ? 'OCULTAR' : 'VER'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
