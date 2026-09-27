import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Haptics are a nicety: never let a missing native module or web break a tap.
function run(fn: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
}

export const haptic = {
  tap: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
