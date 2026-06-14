import {
  Sun,
  Sunset,
  Sunrise,
  Clock,
  Hourglass,
  Compass,
  Star,
  Sparkles,
  Coffee,
  BedDouble,
  Wind,
} from 'lucide-react-native';
import type { CategoryId } from '@/types';

export type CategoryIconComponent = React.ComponentType<{
  size: number;
  color: string;
  strokeWidth: number;
}>;

export const CATEGORY_ICONS: Record<CategoryId, CategoryIconComponent> = {
  all_day: Sparkles,
  waking_up: Coffee,
  morning: Sun,
  evening: Sunset,
  fajr: Sunrise,
  dhuhr: Clock,
  asr: Hourglass,
  maghrib: Compass,
  isha: Star,
  witr: Wind,
  before_bed: BedDouble,
};
