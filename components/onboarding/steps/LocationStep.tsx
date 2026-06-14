import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePrefs } from '@/context/PrefsContext';
import { requestDeviceLocation, type LocationData } from '@/lib/location';
import { CitySearchModal } from '@/components/CitySearchModal';
import { StepShell } from '@/components/onboarding/StepShell';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';
import { SecondaryButton } from '@/components/onboarding/SecondaryButton';

export function LocationStep() {
  const { palette } = useTheme();
  const { goNext, setLocationGranted, skipNotifications } = useOnboarding();
  const { setLocation, setPrayerMethodId } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const applyLocation = (loc: LocationData) => {
    setLocation(loc);
    if (loc.label.includes('London') && loc.label.includes('United Kingdom')) {
      setPrayerMethodId('ELM');
    }
  };

  const handleAllow = async () => {
    setBusy(true);
    try {
      const result = await requestDeviceLocation();
      if (result) {
        applyLocation(result);
        setLocationGranted(true);
        goNext();
      } else {
        setCityOpen(true);
      }
    } catch {
      setCityOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const handlePickCity = () => {
    setCityOpen(true);
  };

  const handleCitySelect = (loc: LocationData) => {
    applyLocation(loc);
    setCityOpen(false);
    setLocationGranted(true);
    goNext();
  };

  const handleCityClose = () => {
    setCityOpen(false);
  };

  const handleSkip = () => {
    skipNotifications();
  };

  return (
    <StepShell
      footer={
        <View>
          <PrimaryButton label="Use device location" onPress={handleAllow} loading={busy} />
          <View style={styles.btnGap} />
          <PrimaryButton label="Pick a city" onPress={handlePickCity} variant="outline" />
          <SecondaryButton label="Skip" onPress={handleSkip} />
        </View>
      }
    >
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: palette.accentLight }]}>
          <MapPin size={32} color={palette.accent} strokeWidth={2} />
        </View>
        <Text style={[styles.title, { color: palette.textDark }]}>Where are you?</Text>
        <Text style={[styles.body, { color: palette.textMid }]}>
          Used locally on your device to calculate accurate prayer times. Use GPS or pick a city.
        </Text>
      </View>
      <CitySearchModal
        visible={cityOpen}
        onSelect={handleCitySelect}
        onClose={handleCityClose}
      />
    </StepShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnGap: {
    height: 10,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
