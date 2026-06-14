import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePrefs } from '@/context/PrefsContext';
import { CATEGORY_ORDER } from '@/lib/onboarding/order';
import { StepShell } from '@/components/onboarding/StepShell';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';
import { SoundPickerRow } from '@/components/onboarding/SoundPickerRow';
import { NotifCategoryRow } from '@/components/onboarding/NotifCategoryRow';

export function NotificationStep() {
  const { palette } = useTheme();
  const { goNext, setNotifGranted, notifGranted, stopPreview } = useOnboarding();
  const { notifEnabled, setAllNotifEnabled } = usePrefs();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await Notifications.getPermissionsAsync();
        if (cancelled) return;
        if (existing.status === 'granted') {
          setNotifGranted(true);
          setRequested(true);
          return;
        }
        const res = await Notifications.requestPermissionsAsync();
        if (cancelled) return;
        setNotifGranted(res.status === 'granted');
        setRequested(true);
      } catch {
        if (!cancelled) {
          setNotifGranted(false);
          setRequested(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      stopPreview();
    };
  }, [setNotifGranted, stopPreview]);

  const allOn = CATEGORY_ORDER.every((id) => notifEnabled[id]);
  const masterValue = allOn;

  return (
    <StepShell
      footer={<PrimaryButton label="Continue" onPress={goNext} />}
      topPad={12}
    >
      <View style={styles.heading}>
        <Text style={[styles.title, { color: palette.textDark }]}>Reminders</Text>
        <Text style={[styles.subtitle, { color: palette.textMid }]}>
          Pick the ones that fit your day. Tap a sound to hear it.
        </Text>
      </View>

      {requested && notifGranted === false ? (
        <View style={[styles.banner, { backgroundColor: palette.glassBg, borderColor: palette.glassBorder }]}>
          <Text style={[styles.bannerText, { color: palette.textMid }]}>
            Notifications are off. You can enable them in iOS/Android Settings later — your choices below are saved.
          </Text>
        </View>
      ) : null}

      <View style={styles.fixedSound}>
        <Text style={[styles.sectionLabel, { color: palette.textMid }]}>SOUND</Text>
        <SoundPickerRow />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      >
        <Text style={[styles.sectionLabel, { color: palette.textMid }]}>REMINDERS</Text>
        <View style={[styles.masterRow, { borderBottomColor: palette.glassBorder }]}>
          <Text style={[styles.masterLabel, { color: palette.textDark }]}>Turn all on</Text>
          <Switch
            value={masterValue}
            onValueChange={(v) => setAllNotifEnabled(v)}
            trackColor={{ false: palette.glassBorder, true: palette.accent }}
            thumbColor="#fff"
          />
        </View>
        {CATEGORY_ORDER.map((id) => (
          <NotifCategoryRow key={id} id={id} />
        ))}
      </ScrollView>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  fixedSound: {
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  masterLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
