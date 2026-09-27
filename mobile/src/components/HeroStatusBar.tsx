import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';

// Light status-bar text over the navy hero. Only rendered while the screen is
// focused: tab screens stay mounted, and expo-status-bar lets the most
// recently mounted bar win, which would leave light text on light screens.
export function HeroStatusBar() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused ? <StatusBar style="light" /> : null;
}
