import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, BarChart2, Share2, Settings, Heart } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { usePrefs } from '@/context/PrefsContext';
import { homeEvents } from '@/lib/homeEvents';
import { getMeta, setMeta } from '@/db/queries';
import { FridayShareModal } from '@/components/FridayShareModal';

// ─── Friday Share Prompt ───────────────────────────────────────────────────
//
// Shows once per Friday at or after 12:00 local time.
const FRIDAY = 5;
const NOON_HOUR = 12;
const META_KEY_LAST_FRIDAY_SHARE = 'last_friday_share_date';
const META_KEY_APP_FIRST_OPEN_DATE = 'app_first_open_date';

function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shouldShowFridayShare(
  now: Date,
  lastShownISO: string | null,
  firstOpenISO: string | null,
): boolean {
  if (now.getDay() !== FRIDAY) return false;
  if (now.getHours() < NOON_HOUR) return false;
  // Suppress on the very first day the user opens the app — even if that day is Friday.
  if (firstOpenISO !== null && firstOpenISO === localDateISO(now)) return false;
  return lastShownISO !== localDateISO(now);
}

function FridayShareScheduler() {
  const { locationPromptShown } = usePrefs();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't show Friday share while first-launch onboarding is in progress
    if (!locationPromptShown) return;

    let cancelled = false;

    const check = async () => {
      try {
        const [last, firstOpenExisting] = await Promise.all([
          getMeta(META_KEY_LAST_FRIDAY_SHARE),
          getMeta(META_KEY_APP_FIRST_OPEN_DATE),
        ]);
        if (cancelled) return;
        const now = new Date();
        const todayISO = localDateISO(now);
        // Stamp first-open date once, so we can suppress Friday modal if today *is* that day.
        let firstOpen = firstOpenExisting;
        if (firstOpen === null) {
          firstOpen = todayISO;
          await setMeta(META_KEY_APP_FIRST_OPEN_DATE, firstOpen);
        }
        if (shouldShowFridayShare(now, last, firstOpen)) {
          setOpen(true);
          await setMeta(META_KEY_LAST_FRIDAY_SHARE, todayISO);
        }
      } catch {
        // db not ready — silently skip this tick
      }
    };

    check();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [locationPromptShown]);

  // Only mount when actually showing — keeping a permanent <Modal visible=false>
  // in the tree can confuse the iOS modal presentation queue.
  if (!open) return null;
  return <FridayShareModal visible onClose={() => setOpen(false)} />;
}

export default function TabsLayout() {
  const { palette } = useTheme();
  const isDark = palette.scheme === 'dark';

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: palette.bgMid,
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderTopWidth: 1,
            position: 'absolute',
          },
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.textDim,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.5} />,
          }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              if (navigation.isFocused()) homeEvents.collapse();
            },
          })}
        />
        <Tabs.Screen
          name="favourites"
          options={{
            title: 'Favourites',
            tabBarIcon: ({ color, size }) => <Heart size={size} color={color} strokeWidth={1.5} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} strokeWidth={1.5} />,
          }}
        />
        <Tabs.Screen
          name="share"
          options={{
            title: 'Share',
            tabBarIcon: ({ color, size }) => <Share2 size={size} color={color} strokeWidth={1.5} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={1.5} />,
          }}
        />
      </Tabs>
      <FridayShareScheduler />
    </>
  );
}
