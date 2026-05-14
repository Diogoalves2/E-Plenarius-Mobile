import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/lib/api';

const API_BASE = API_URL.replace(/\/api$/, '');
const CHAMBER_SLUG_KEY = 'chamber_slug';
const MIN_TOTAL_MS = 1800;

interface ChamberInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string | null;
}

interface Props { onFinish: () => void; }

export function SplashIntro({ onFinish }: Props) {
  const [chamber, setChamber] = useState<ChamberInfo | null>(null);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY       = useRef(new Animated.Value(20)).current;
  const taglineOp   = useRef(new Animated.Value(0)).current;
  const outOpacity  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const start = Date.now();

    // Sequência de entrada
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(nameY,       { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 450);

    setTimeout(() => {
      Animated.timing(taglineOp, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 750);

    // Carrega dados da câmara em paralelo
    (async () => {
      try {
        const slug = await SecureStore.getItemAsync(CHAMBER_SLUG_KEY);
        if (slug) {
          const res = await fetch(`${API_URL}/chambers/by-slug/${slug}`);
          if (res.ok) {
            const data = await res.json();
            setChamber({
              id: data.id, name: data.name, city: data.city, state: data.state,
              logoUrl: data.logoUrl ?? null,
            });
          }
        }
      } catch { /* ignora — usa fallback */ }
    })();

    // Fade-out + finish
    const elapsed = Date.now() - start;
    const wait = Math.max(0, MIN_TOTAL_MS - elapsed);
    const timer = setTimeout(() => {
      Animated.timing(outOpacity, { toValue: 0, duration: 350, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        .start(() => onFinish());
    }, wait);

    return () => clearTimeout(timer);
  }, []);

  const hasCustomLogo = !!chamber?.logoUrl;

  return (
    <Animated.View style={[s.root, { opacity: outOpacity }]}>
      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        {hasCustomLogo ? (
          <Image source={{ uri: `${API_BASE}${chamber!.logoUrl}` }} style={s.logoImg} resizeMode="contain" />
        ) : (
          <View style={s.epBadge}>
            <Text style={s.epText}>EP</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameY }] }}>
        <Text style={s.title}>{chamber?.name ?? 'E-Plenarius'}</Text>
        {chamber && (
          <Text style={s.location}>{chamber.city} · {chamber.state}</Text>
        )}
      </Animated.View>

      <Animated.View style={[s.taglineWrap, { opacity: taglineOp }]}>
        <View style={s.dot} />
        <Text style={s.tagline}>SISTEMA DE PLENÁRIO ELETRÔNICO</Text>
        <View style={s.dot} />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    width: 160, height: 160, marginBottom: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  logoImg: { width: 160, height: 160 },
  epBadge: {
    width: 140, height: 140, borderRadius: 34,
    backgroundColor: '#0B1220',
    alignItems: 'center', justifyContent: 'center',
  },
  epText: { color: '#FFFFFF', fontSize: 52, fontWeight: '800', letterSpacing: 2 },
  title: {
    color: '#0B1220', fontSize: 28, fontWeight: '800',
    textAlign: 'center', letterSpacing: -0.5, lineHeight: 34,
  },
  location: {
    color: '#8A94A2', fontSize: 14, fontWeight: '600',
    textAlign: 'center', marginTop: 6, letterSpacing: 0.3,
  },
  taglineWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 48,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1447E6' },
  tagline: {
    color: '#1447E6', fontSize: 11, fontWeight: '700',
    letterSpacing: 2.5,
  },
});
