import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SplashIntro } from '@/components/SplashIntro';

function RootGuard() {
  const { user, loading, chamberSlug } = useAuth();
  const { colors: C } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (!splashDone || loading) return;
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
  }, [user, loading, chamberSlug, segments, splashDone]);

  if (!splashDone || loading) {
    return <SplashIntro onFinish={() => setSplashDone(true)} />;
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
