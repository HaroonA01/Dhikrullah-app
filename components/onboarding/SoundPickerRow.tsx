import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Volume2, VolumeX } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePrefs } from '@/context/PrefsContext';
import { NOTIF_SOUND_LABELS, type NotifSoundId } from '@/lib/soundMap';

const SOUND_ORDER: NotifSoundId[] = [
  'default',
  'none',
  'chime',
  'bell',
  'glow',
  'tap',
  'breeze',
  'ring',
  'dot',
];

function Chip({
  id,
  selected,
  playing,
  onPress,
}: {
  id: NotifSoundId;
  selected: boolean;
  playing: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (playing) {
      pulse.value = withRepeat(
        withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 180 });
    }
  }, [playing, pulse]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const Icon = id === 'none' ? VolumeX : Volume2;
  const bg = selected ? palette.accentLight : palette.glassBg;
  const border = selected ? palette.accent : palette.glassBorder;
  const txt = selected ? palette.accent : palette.textMid;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        style={[styles.chip, { backgroundColor: bg, borderColor: border }]}
      >
        <Icon size={14} color={txt} strokeWidth={2.2} />
        <Text style={[styles.chipLabel, { color: txt }]}>{NOTIF_SOUND_LABELS[id]}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function SoundPickerRow() {
  const { notifSound, setNotifSound } = usePrefs();
  const { previewingSoundId, playPreview } = useOnboarding();

  const handleTap = (id: NotifSoundId) => {
    setNotifSound(id);
    playPreview(id);
  };

  const visibleSounds = SOUND_ORDER;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {visibleSounds.map((id) => (
          <Chip
            key={id}
            id={id}
            selected={notifSound === id}
            playing={previewingSoundId === id}
            onPress={() => handleTap(id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -24,
  },
  scroll: {
    paddingHorizontal: 24,
    gap: 10,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
