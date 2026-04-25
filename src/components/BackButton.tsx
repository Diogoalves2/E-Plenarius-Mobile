import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  onPress: () => void;
  label?: string;
}

export function BackButton({ onPress, label = 'Início' }: Props) {
  const { colors: C } = useTheme();
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
        borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10 }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10,
        backgroundColor: C.primary + '25', borderWidth: 1,
        borderColor: C.primary + '50', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.primary, fontSize: 24, fontWeight: '800', lineHeight: 28, marginTop: -2 }}>
          ‹
        </Text>
      </View>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}
