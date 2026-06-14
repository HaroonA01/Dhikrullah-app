import * as Haptics from 'expo-haptics';

interface HapticPrefs {
  individual: boolean;
  complete: boolean;
}

let prefs: HapticPrefs = { individual: true, complete: true };

export const setHapticPrefs = (next: Partial<HapticPrefs>): void => {
  prefs = { ...prefs, ...next };
};

export const hapticsLight = (): void => {
  if (!prefs.individual) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const hapticsStrong = (): void => {
  if (!prefs.complete) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
