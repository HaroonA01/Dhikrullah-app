import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, type AudioSource } from 'expo-audio';
import { NOTIF_SOUND_ASSETS, type NotifSoundId } from '@/lib/soundMap';

export type StepKey =
  | 'preview'
  | 'location'
  | 'prayerMethod'
  | 'notifications'
  | 'arabicFont'
  | 'englishFont'
  | 'done';

interface OnboardingValue {
  steps: StepKey[];
  stepIndex: number;
  currentStep: StepKey;
  totalSteps: number;
  locationGranted: boolean | null;
  setLocationGranted: (v: boolean) => void;
  notifGranted: boolean | null;
  setNotifGranted: (v: boolean) => void;
  goNext: () => void;
  goBack: () => void;
  skipNotifications: () => void;
  previewingSoundId: NotifSoundId | null;
  playPreview: (id: NotifSoundId) => void;
  stopPreview: () => void;
}

const OnboardingContext = createContext<OnboardingValue | null>(null);

const ALL_STEPS: StepKey[] = [
  'preview',
  'location',
  'prayerMethod',
  'notifications',
  'arabicFont',
  'englishFont',
  'done',
];

const STEPS_NO_NOTIF: StepKey[] = [
  'preview',
  'location',
  'arabicFont',
  'englishFont',
  'done',
];

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [locationGranted, setLocGranted] = useState<boolean | null>(null);
  const [notifGranted, setNotGranted] = useState<boolean | null>(null);
  const [previewingSoundId, setPreviewingSoundId] = useState<NotifSoundId | null>(null);
  const [previewSource, setPreviewSource] = useState<AudioSource | null>(null);

  const player = useAudioPlayer(previewSource);
  const playerRef = useRef(player);
  playerRef.current = player;

  const steps = useMemo<StepKey[]>(
    () => (locationGranted === false ? STEPS_NO_NOTIF : ALL_STEPS),
    [locationGranted],
  );

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const totalSteps = steps.length;

  const goNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      playerRef.current?.pause();
    } catch {}
    setPreviewingSoundId(null);
    setStepIndex((i) => Math.min(i + 1, ALL_STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      playerRef.current?.pause();
    } catch {}
    setPreviewingSoundId(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const skipNotifications = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLocGranted(false);
    setStepIndex((i) => i + 1);
  }, []);

  const setLocationGranted = useCallback((v: boolean) => {
    setLocGranted(v);
  }, []);

  const setNotifGranted = useCallback((v: boolean) => {
    setNotGranted(v);
  }, []);

  const stopPreview = useCallback(() => {
    try {
      playerRef.current?.pause();
    } catch {}
    setPreviewingSoundId(null);
  }, []);

  const playPreview = useCallback((id: NotifSoundId) => {
    Haptics.selectionAsync().catch(() => {});
    if (id === 'default' || id === 'none') {
      try {
        playerRef.current?.pause();
      } catch {}
      setPreviewingSoundId(null);
      return;
    }
    const asset = NOTIF_SOUND_ASSETS[id];
    if (!asset) {
      setPreviewingSoundId(null);
      return;
    }
    setPreviewSource(asset as AudioSource);
    setPreviewingSoundId(id);
  }, []);

  useEffect(() => {
    if (!previewSource || !previewingSoundId) return;
    try {
      playerRef.current?.seekTo(0);
      playerRef.current?.play();
    } catch {}
  }, [previewSource, previewingSoundId]);

  useEffect(() => {
    return () => {
      try {
        playerRef.current?.pause();
      } catch {}
    };
  }, []);

  const value = useMemo<OnboardingValue>(
    () => ({
      steps,
      stepIndex,
      currentStep,
      totalSteps,
      locationGranted,
      setLocationGranted,
      notifGranted,
      setNotifGranted,
      goNext,
      goBack,
      skipNotifications,
      previewingSoundId,
      playPreview,
      stopPreview,
    }),
    [
      steps,
      stepIndex,
      currentStep,
      totalSteps,
      locationGranted,
      setLocationGranted,
      notifGranted,
      setNotifGranted,
      goNext,
      goBack,
      skipNotifications,
      previewingSoundId,
      playPreview,
      stopPreview,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export const useOnboarding = (): OnboardingValue => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
};
