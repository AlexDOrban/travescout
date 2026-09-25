import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Lightweight snackbar: show(message) fades a pill in at the bottom for 2.5s.
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function show(text: string) {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), 2500);
  }

  return { message, show };
}

export function Toast({ message, icon = 'checkmark-circle' }: { message: string | null; icon?: keyof typeof Ionicons.glyphMap }) {
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, { toValue: message ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [message, opacity]);

  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      testID="toast"
      style={[styles.toast, { bottom: insets.bottom + 24, opacity }]}
    >
      <Ionicons name={icon} size={18} color="#5eead4" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0b1b33', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    maxWidth: '90%',
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
