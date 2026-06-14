export type NotifSoundId =
  | 'default'
  | 'chime'
  | 'bell'
  | 'glow'
  | 'tap'
  | 'breeze'
  | 'ring'
  | 'dot'
  | 'none';

export const NOTIF_SOUND_LABELS: Record<NotifSoundId, string> = {
  default: 'Default',
  chime: 'Chime',
  bell: 'Bell',
  glow: 'Glow',
  tap: 'Tap',
  breeze: 'Breeze',
  ring: 'Ring',
  dot: 'Dot',
  none: 'None',
};

export const NOTIF_SOUND_ASSETS: Record<NotifSoundId, number | null> = {
  default: null,
  chime: require('@/assets/sounds/chime.wav'),
  bell: require('@/assets/sounds/bell.wav'),
  glow: require('@/assets/sounds/glow.wav'),
  tap: require('@/assets/sounds/tap.wav'),
  breeze: require('@/assets/sounds/breeze.wav'),
  ring: require('@/assets/sounds/ring.wav'),
  dot: require('@/assets/sounds/dot.wav'),
  none: null,
};

// Bundle filename for each sound — used by the notification scheduler.
export const NOTIF_SOUND_FILENAME: Partial<Record<NotifSoundId, string>> = {
  chime: 'chime.wav',
  bell: 'bell.wav',
  glow: 'glow.wav',
  tap: 'tap.wav',
  breeze: 'breeze.wav',
  ring: 'ring.wav',
  dot: 'dot.wav',
};
