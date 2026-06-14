import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { setAudioModeAsync } from 'expo-audio';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { PrefsProvider, usePrefs } from '@/context/PrefsContext';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import { CounterProvider } from '@/context/CounterContext';
import { FavouritesProvider } from '@/context/FavouritesContext';
import { scheduleAllNotifications } from '@/lib/notifications';
import { dismissStaleNotifications } from '@/lib/notificationCleanup';
import { GOOGLE_FONT_ASSETS } from '@/lib/fonts';
import { pendingDeepLink } from '@/lib/pendingDeepLink';
import { isKnownCategoryId } from '@/types';
import { StreakBumpHost } from '@/components/StreakBumpModal';
import { CategoryCompletionHost } from '@/components/categoryCompletion/CategoryCompletionHost';

function StatusBarReactive() {
  const { palette } = useTheme();
  return (
    <StatusBar
      style={palette.scheme === 'dark' ? 'light' : 'dark'}
      backgroundColor="transparent"
      translucent
    />
  );
}

function NotificationScheduler() {
  const {
    location,
    prayerMethodId,
    madhab,
    wakingUpMinutes,
    beforeBedMinutes,
    notifEnabled,
    notifOffset,
    notifSound,
    allDayMinutes,
    hydrated,
  } = usePrefs();

  useEffect(() => {
    if (!hydrated) return;

    const schedule = () => {
      scheduleAllNotifications(
        notifEnabled,
        notifOffset,
        location,
        prayerMethodId,
        madhab,
        wakingUpMinutes,
        beforeBedMinutes,
        notifSound,
        allDayMinutes,
      ).catch(() => {});
      // Sweep delivered notifs older than 12h from the tray on every foreground.
      dismissStaleNotifications().catch(() => {});
    };

    schedule();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });
    return () => sub.remove();
  }, [hydrated, location, prayerMethodId, madhab, wakingUpMinutes, beforeBedMinutes, notifEnabled, notifOffset, notifSound, allDayMinutes]);

  return null;
}

function extractCategoryId(response: Notifications.NotificationResponse | null): string | null {
  if (!response) return null;
  const data = response.notification.request.content.data as { categoryId?: unknown } | null;
  const categoryId = data?.categoryId;
  if (typeof categoryId !== 'string' || !isKnownCategoryId(categoryId)) return null;
  return categoryId;
}

function NotificationTapHandler() {
  const router = useRouter();
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    // Cold-start path: app launched by a notification tap.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (cancelled || !response) return;
        const reqId = response.notification.request.identifier;
        if (handledRef.current.has(reqId)) return;
        handledRef.current.add(reqId);
        const categoryId = extractCategoryId(response);
        if (!categoryId) return;
        // Splash is still mounted at this point — queue, let splash consume.
        pendingDeepLink.set(categoryId);
      })
      .catch(() => {});

    // Runtime path: foreground or background-but-running taps.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const reqId = response.notification.request.identifier;
      if (handledRef.current.has(reqId)) return;
      handledRef.current.add(reqId);
      const categoryId = extractCategoryId(response);
      if (!categoryId) return;
      if (pendingDeepLink.isSplashDone()) {
        router.push(`/counter/${categoryId}`);
      } else {
        pendingDeepLink.set(categoryId);
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(GOOGLE_FONT_ASSETS);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch((e) => {
      if (__DEV__) console.warn('[audio] setAudioModeAsync failed', e);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DatabaseProvider>
            <PrefsProvider>
              <FavouritesProvider>
                <CounterProvider>
                  <StatusBarReactive />
                  <NotificationScheduler />
                  <NotificationTapHandler />
                  <StreakBumpHost />
                  <CategoryCompletionHost />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: 'transparent' },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="(onboarding)" />
                    <Stack.Screen name="counter/[category]" />
                  </Stack>
                </CounterProvider>
              </FavouritesProvider>
            </PrefsProvider>
          </DatabaseProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
