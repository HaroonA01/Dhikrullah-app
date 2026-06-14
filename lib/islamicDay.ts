import { dateKeyFor } from '@/lib/stats';
import {
  computeExtendedTimes,
  type Madhab,
  type MethodId,
} from '@/lib/prayer';
import type { LocationData } from '@/lib/location';

// Islamic day = fajr → fajr. If `now` is before today's fajr, the current
// Islamic day started yesterday at fajr, so we key by yesterday's civil date.
// Without location/method we cannot derive fajr, so fall back to civil today
// (midnight → midnight) per product spec.
export function islamicDayKey(
  now: Date,
  location: LocationData | null,
  methodId: MethodId,
  madhab: Madhab,
): string {
  if (!location) return dateKeyFor(now);
  try {
    const todayFajr = computeExtendedTimes(
      { lat: location.lat, lon: location.lon },
      now,
      methodId,
      madhab,
    ).fajr;
    if (now.getTime() < todayFajr.getTime()) {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return dateKeyFor(y);
    }
    return dateKeyFor(now);
  } catch {
    return dateKeyFor(now);
  }
}
