import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from 'expo-audio';
import { Pause, Volume2, VolumeX } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  source?: AudioSource;
  dhikrId: string;
}

export function AudioButton({ source, dhikrId }: Props) {
  const { palette } = useTheme();
  const player = useAudioPlayer(source ?? null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      try {
        // Pause *before* rewinding — on Android the player is still in a
        // "playing" state at finish, so seekTo(0) alone restarts it (loops).
        player.pause();
        player.seekTo(0);
      } catch (e) {
        if (__DEV__) console.warn('[AudioButton] seekTo failed', e);
      }
    }
  }, [status.didJustFinish, player]);

  useEffect(() => {
    try {
      player.loop = false; // never auto-repeat — play once per press
      player.pause();
      player.seekTo(0);
    } catch {
      // pre-load may not be ready yet; safe to ignore
    }
  }, [dhikrId, player]);

  const playing = status.playing;
  const disabled = !source;

  const toggle = () => {
    if (!source) return;
    try {
      if (playing) {
        player.pause();
        return;
      }
      if (status.duration > 0 && status.currentTime >= status.duration) {
        player.seekTo(0);
      }
      player.play();
    } catch (e) {
      if (__DEV__) console.warn('[AudioButton] playback error', e);
    }
  };

  const Icon = disabled ? VolumeX : playing ? Pause : Volume2;
  const color = disabled ? palette.textDim : palette.accent;

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      hitSlop={10}
      style={[
        styles.btn,
        { backgroundColor: palette.glassBg },
        disabled && styles.disabled,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.borderOverlay,
          { borderColor: palette.glassBorder },
        ]}
      />
      <Icon size={18} color={color} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderOverlay: {
    borderWidth: 1,
    borderRadius: 17,
  },
  disabled: {
    opacity: 0.5,
  },
});
