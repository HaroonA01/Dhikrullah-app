import * as Location from 'expo-location';

export interface LocationData {
  lat: number;
  lon: number;
  label: string;
  source: 'gps' | 'manual';
}

export const reverseGeocodeLabel = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const r = res[0];
    if (!r) return 'Current location';
    const parts = [r.city ?? r.subregion, r.country].filter(Boolean) as string[];
    return parts.length ? parts.join(', ') : 'Current location';
  } catch {
    return 'Current location';
  }
};

export const requestDeviceLocation = async (): Promise<LocationData | null> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const label = await reverseGeocodeLabel(pos.coords.latitude, pos.coords.longitude);
  return {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    label,
    source: 'gps',
  };
};

// Open-Meteo geocoding API: free, no API key, no native permission required.
// We previously used Location.geocodeAsync which on Android needs foreground
// location permission (defeats the point of "search instead of GPS") and on
// recent Expo SDKs is a no-op on iOS — so the modal returned no results.
const GEOCODE_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

interface OpenMeteoHit {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string; // state / region
  admin2?: string; // county / district
}

const buildLabel = (h: OpenMeteoHit, fallback: string): string => {
  const parts: string[] = [];
  if (h.name) parts.push(h.name);
  if (h.admin1 && h.admin1 !== h.name) parts.push(h.admin1);
  if (h.country && h.country !== h.admin1) parts.push(h.country);
  return parts.length ? parts.join(', ') : fallback;
};

export const geocodeCity = async (query: string): Promise<LocationData | null> => {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const results = await searchCities(trimmed, 1);
  return results[0] ?? null;
};

export const searchCities = async (
  query: string,
  limit = 5,
): Promise<LocationData[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `${GEOCODE_ENDPOINT}?name=${encodeURIComponent(trimmed)}&count=${limit}&language=en&format=json`;
  let payload: { results?: OpenMeteoHit[] } | null = null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    payload = (await res.json()) as { results?: OpenMeteoHit[] };
  } catch {
    return [];
  }

  const hits = payload?.results ?? [];
  if (!hits.length) return [];

  const seen = new Set<string>();
  const out: LocationData[] = [];
  for (const h of hits) {
    if (typeof h.latitude !== 'number' || typeof h.longitude !== 'number') continue;
    const key = `${h.latitude.toFixed(3)},${h.longitude.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      lat: h.latitude,
      lon: h.longitude,
      label: buildLabel(h, trimmed),
      source: 'manual',
    });
  }
  return out;
};
