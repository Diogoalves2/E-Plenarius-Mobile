import { Stack } from 'expo-router';
import { C } from '@/lib/colors';

export default function PresidenteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
  );
}
