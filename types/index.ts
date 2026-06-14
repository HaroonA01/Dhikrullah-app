export type CategoryId =
  | 'all_day'
  | 'waking_up'
  | 'morning'
  | 'evening'
  | 'fajr'
  | 'dhuhr'
  | 'asr'
  | 'maghrib'
  | 'isha'
  | 'witr'
  | 'before_bed';

const KNOWN_CATEGORY_IDS: readonly CategoryId[] = [
  'all_day', 'morning', 'waking_up', 'evening',
  'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr', 'before_bed',
];

export const isKnownCategoryId = (s: string): s is CategoryId =>
  (KNOWN_CATEGORY_IDS as readonly string[]).includes(s);

export interface Category {
  id: CategoryId;
  label: string;
  sortOrder: number;
}

export interface Dhikr {
  id: string;
  categoryId: CategoryId;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
  description: string | null;
  reference: string | null;
  grade: string | null;
  audioFilename: string | null;
  sortOrder: number;
}

export interface CounterState {
  currentDhikrIndex: number;
  counts: Record<string, number>;
}

export interface Quote {
  text: string;
  source?: string;
}
