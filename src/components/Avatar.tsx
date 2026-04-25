import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { API_URL } from '@/lib/api';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export function Avatar({ name, avatarUrl, size = 44, width, height, borderRadius }: Props) {
  const w = width ?? size;
  const h = height ?? size;
  const br = borderRadius ?? size / 2;
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  if (avatarUrl) {
    const src = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL.replace('/api', '')}${avatarUrl}`;
    return (
      <Image source={{ uri: src }} style={[styles.base, { width: w, height: h, borderRadius: br }]} />
    );
  }

  return (
    <View style={[styles.base, { width: w, height: h, borderRadius: br, backgroundColor: color }]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: Math.min(w, h) * 0.35 }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
