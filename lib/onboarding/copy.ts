import type { CategoryId } from '@/types';

export const CATEGORY_DESCRIPTIONS: Record<CategoryId, { label: string; description: string }> = {
  fajr: { label: 'Fajr', description: 'A reminder at dawn prayer.' },
  dhuhr: { label: 'Dhuhr', description: 'A reminder at midday prayer.' },
  asr: { label: 'Asr', description: 'A reminder at afternoon prayer.' },
  maghrib: { label: 'Maghrib', description: 'A reminder at sunset prayer.' },
  isha: { label: 'Isha', description: 'A reminder at night prayer.' },
  witr: { label: 'Witr', description: 'A nudge for the witr prayer.' },
  all_day: { label: 'All-Day', description: 'A daily nudge for general dhikr.' },
  waking_up: { label: 'Waking Up', description: 'Adhkar for after waking up.' },
  morning: { label: 'Morning', description: 'Morning remembrance after Fajr.' },
  evening: { label: 'Evening', description: 'Evening remembrance after Asr.' },
  before_bed: { label: 'Before Bed', description: 'Adhkar to recite before sleep.' },
};

export const ARABIC_PREVIEW_PHRASE = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
export const ENGLISH_PREVIEW_PHRASE = 'In the name of Allah, the Most Gracious, the Most Merciful.';
