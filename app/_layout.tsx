import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

function RootGuard() {
  const { user, loading, chamberSlug } = useAuth();
  const { colors: C } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const currentScreen = segments[1];

    if (!user) {
      if (!chamberSlug && currentScreen !== 'setup') {
        router.replace('/(auth)/setup');
      } else if (chamberSlug && (!inAuth || currentScreen === 'setup')) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (user && inAuth) {
      if (user.role === 'presidente') router.replace('/(presidente)');
      else router.replace('/(tabs)');
    }
  }, [user, loading, chamberSlug, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(presidente)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <StatusBar hidden />
        <RootGuard />
      </ThemeProvider>
    </AuthProvider>
  );
}
