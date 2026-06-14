import * as Notifications from 'expo-notifications';

const STALE_NOTIF_AGE_MS = 12 * 60 * 60 * 1000;

// Dismiss every delivered notif whose data targets this category. Called when
// the user opens a category's counter — that reminder has served its purpose.
// Combined-pair notifs carry `categoryIds: [primary, secondary]`, so opening
// either side dismisses them.
export const dismissCategoryNotifications = async (
  categoryId: string,
): Promise<void> => {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const n of presented) {
      const data = n.request.content.data as
        | { categoryId?: unknown; categoryIds?: unknown }
        | null
        | undefined;
      const ids = Array.isArray(data?.categoryIds) ? data!.categoryIds : null;
      const matches =
        data?.categoryId === categoryId ||
        (ids ? ids.includes(categoryId) : false);
      if (matches) {
        await Notifications.dismissNotificationAsync(n.request.identifier).catch(
          () => {},
        );
      }
    }
  } catch {}
};

// Dismiss any delivered notif older than STALE_NOTIF_AGE_MS. Called on app
// foreground (and initial mount). Applies to all types — prayer, streak, Friday.
export const dismissStaleNotifications = async (): Promise<void> => {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    const cutoff = Date.now() - STALE_NOTIF_AGE_MS;
    for (const n of presented) {
      const raw = n.date;
      if (typeof raw !== 'number') continue;
      // iOS reports Notification.date in seconds (NSDate.timeIntervalSince1970);
      // Android reports milliseconds. Normalise: anything below 1e11 is treated
      // as seconds and scaled up, otherwise it's already in ms.
      const deliveredMs = raw < 1e11 ? raw * 1000 : raw;
      if (deliveredMs < cutoff) {
        await Notifications.dismissNotificationAsync(n.request.identifier).catch(
          () => {},
        );
      }
    }
  } catch {}
};
