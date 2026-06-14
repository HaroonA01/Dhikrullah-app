import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type { Category, CategoryId, CounterState, Dhikr } from '@/types';
import { isKnownCategoryId } from '@/types';
import {
  getAllCategoryState,
  getAllCounters,
  getAllDhikrs,
  getCategories,
  getMeta,
  incrementAndGetDhikrsCompletedForDate,
  incrementCategoriesCompletedForDate,
  incrementDhikrCountForDate,
  logCategoryCompletion,
  logDhikrCompletion,
  resetCategoryCounts,
  setCategoryIndex,
  setCount,
  setMeta,
  upsertCategoryProgress,
} from '@/db/queries';
import { hapticsLight, hapticsStrong } from '@/lib/haptics';
import {
  bumpStreak,
  getDisplayStreak,
  META_KEY_LIFETIME_DHIKR,
  STREAK_DHIKR_THRESHOLD,
  todayKey,
} from '@/lib/stats';
import { streakBumpEvents } from '@/lib/streakBumpEvents';
import { categoryCompletionEvents } from '@/lib/categoryCompletionEvents';
import {
  shuffleDhikrVariants,
  type DhikrVariantId,
} from '@/lib/dhikrCompletionVariants';
import { computeExtendedTimes } from '@/lib/prayer';
import { refreshStreakNotifications } from '@/lib/notifications';
import { usePrefs } from '@/context/PrefsContext';

type AllState = Record<string, CounterState>;
type TickMap = Record<string, number>;

interface ContextValue {
  hydrated: boolean;
  categories: Category[];
  dhikrsByCategory: Record<string, Dhikr[]>;
  states: AllState;
  confettiTicks: TickMap;
  confettiVariants: Record<string, DhikrVariantId>;
  incrementCurrent: (id: CategoryId) => void;
  decrementCurrent: (id: CategoryId) => void;
  nextDhikr: (id: CategoryId) => void;
  prevDhikr: (id: CategoryId) => void;
  resetAll: (id: CategoryId) => void;
  resetAllCategories: () => void;
  seekToDhikr: (id: CategoryId, dhikrId: string) => void;
  // Tutorial sandbox: while active for a category, count/index changes update
  // the in-memory state for live feedback but write nothing to the DB. End
  // restores the snapshot and jumps to the first dhikr.
  beginTutorialSandbox: (id: CategoryId) => void;
  endTutorialSandbox: (id: CategoryId) => void;
  // Restore the snapshot + jump to the first dhikr while STAYING in the sandbox
  // (used when the user finishes every dhikr mid-tutorial).
  resetTutorialSandbox: (id: CategoryId) => void;
}

const CounterContext = createContext<ContextValue | null>(null);

const ADVANCE_DELAY_MS = 2250;
const WRITE_DEBOUNCE_MS = 150;
const STATS_FLUSH_DEBOUNCE_MS = 1000;

function toCategory(row: { id: string; label: string; sortOrder: number }): Category {
  return {
    id: isKnownCategoryId(row.id) ? row.id : (row.id as CategoryId),
    label: row.label,
    sortOrder: row.sortOrder,
  };
}

function toDhikr(row: {
  id: string;
  categoryId: string;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
  description: string | null;
  reference: string | null;
  grade: string | null;
  audioFilename: string | null;
  sortOrder: number;
}): Dhikr {
  return {
    id: row.id,
    categoryId: isKnownCategoryId(row.categoryId)
      ? row.categoryId
      : (row.categoryId as CategoryId),
    arabic: row.arabic,
    transliteration: row.transliteration,
    translation: row.translation,
    target: row.target,
    description: row.description,
    reference: row.reference,
    grade: row.grade,
    audioFilename: row.audioFilename,
    sortOrder: row.sortOrder,
  };
}

export const CounterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { location, prayerMethodId, madhab } = usePrefs();
  const [categories, setCategories] = useState<Category[]>([]);
  const [dhikrsByCategory, setDhikrsByCategory] = useState<Record<string, Dhikr[]>>({});
  const [states, setStates] = useState<AllState>({});
  const [confettiTicks, setConfettiTicks] = useState<TickMap>({});
  const [confettiVariants, setConfettiVariants] = useState<
    Record<string, DhikrVariantId>
  >({});
  // Shuffled bag of dhikr-completion variant IDs. Rotates through all once
  // before reshuffling so every variant appears within one cycle.
  const variantBagRef = useRef<DhikrVariantId[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Live mirror of `states` for synchronous reads (sandbox snapshot).
  const statesRef = useRef(states);
  useEffect(() => { statesRef.current = states; }, [states]);
  // Tutorial sandbox bookkeeping.
  const sandboxCategoryRef = useRef<CategoryId | null>(null);
  const sandboxSnapshotRef = useRef<{ currentDhikrIndex: number; counts: Record<string, number> } | null>(null);
  const countWriteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const indexWriteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const advanceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingDhikrCount = useRef(0);
  const statsFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressWriteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingProgress = useRef<Record<string, number>>({});
  // Latest streak determination promise — recordCategoryCompletion awaits this
  // so the category celebration can yield to the streak celebration when both
  // fire from the same dhikr completion.
  const lastStreakPromiseRef = useRef<Promise<boolean>>(Promise.resolve(false));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [catRows, dhikrRows, counterRows, stateRows] = await Promise.all([
        getCategories(),
        getAllDhikrs(),
        getAllCounters(),
        getAllCategoryState(),
      ]);
      if (cancelled) return;

      const cats = catRows.map(toCategory);
      const grouped: Record<string, Dhikr[]> = {};
      for (const r of dhikrRows) {
        const d = toDhikr(r);
        (grouped[d.categoryId] ??= []).push(d);
      }

      const countByDhikr = new Map(counterRows.map((c) => [c.dhikrId, c.count]));
      const idxByCategory = new Map(stateRows.map((s) => [s.categoryId, s.currentDhikrIndex]));

      const nextStates: AllState = {};
      for (const c of cats) {
        const list = grouped[c.id] ?? [];
        const counts: Record<string, number> = {};
        for (const d of list) {
          counts[d.id] = countByDhikr.get(d.id) ?? 0;
        }
        const rawIdx = idxByCategory.get(c.id) ?? 0;
        const maxIdx = Math.max(list.length - 1, 0);
        nextStates[c.id] = {
          currentDhikrIndex: Math.min(Math.max(rawIdx, 0), maxIdx),
          counts,
        };
      }

      setCategories(cats);
      setDhikrsByCategory(grouped);
      setStates(nextStates);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const aTimers = advanceTimers.current;
    const cTimers = countWriteTimers.current;
    const iTimers = indexWriteTimers.current;
    const pTimers = progressWriteTimers.current;
    return () => {
      for (const k of Object.keys(aTimers)) clearTimeout(aTimers[k]);
      for (const k of Object.keys(cTimers)) clearTimeout(cTimers[k]);
      for (const k of Object.keys(iTimers)) clearTimeout(iTimers[k]);
      for (const k of Object.keys(pTimers)) clearTimeout(pTimers[k]);
      if (statsFlushTimer.current) clearTimeout(statsFlushTimer.current);
    };
  }, []);

  const scheduleCountWrite = useCallback((dhikrId: string, count: number) => {
    const existing = countWriteTimers.current[dhikrId];
    if (existing) clearTimeout(existing);
    countWriteTimers.current[dhikrId] = setTimeout(() => {
      setCount(dhikrId, count).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
  }, []);

  const scheduleIndexWrite = useCallback((categoryId: string, index: number) => {
    const existing = indexWriteTimers.current[categoryId];
    if (existing) clearTimeout(existing);
    indexWriteTimers.current[categoryId] = setTimeout(() => {
      setCategoryIndex(categoryId, index).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
  }, []);

  const scheduleStatsFlush = useCallback(() => {
    if (statsFlushTimer.current) clearTimeout(statsFlushTimer.current);
    statsFlushTimer.current = setTimeout(async () => {
      const n = pendingDhikrCount.current;
      if (n <= 0) return;
      pendingDhikrCount.current = 0;
      try {
        await incrementDhikrCountForDate(todayKey(), n);
        const lifetime = Number((await getMeta(META_KEY_LIFETIME_DHIKR)) ?? '0');
        await setMeta(META_KEY_LIFETIME_DHIKR, String(lifetime + n));
      } catch {}
    }, STATS_FLUSH_DEBOUNCE_MS);
  }, []);

  const scheduleProgressWrite = useCallback((categoryId: string, percent: number) => {
    pendingProgress.current[categoryId] = Math.max(
      pendingProgress.current[categoryId] ?? 0,
      percent,
    );
    const existing = progressWriteTimers.current[categoryId];
    if (existing) clearTimeout(existing);
    progressWriteTimers.current[categoryId] = setTimeout(() => {
      const p = pendingProgress.current[categoryId] ?? 0;
      pendingProgress.current[categoryId] = 0;
      upsertCategoryProgress(todayKey(), categoryId, p).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
  }, []);

  const recordCategoryCompletion = useCallback(async (categoryId: string) => {
    try {
      const today = todayKey();
      const firstToday = await logCategoryCompletion(today, categoryId);
      if (firstToday) {
        await incrementCategoriesCompletedForDate(today);
      }
      // Yield to the streak celebration when both fire from the same dhikr.
      const streakBumped = await lastStreakPromiseRef.current;
      if (!streakBumped && isKnownCategoryId(categoryId)) {
        categoryCompletionEvents.emit({ categoryId });
      }
    } catch {}
  }, []);

  const recordIndividualDhikrCompletion = useCallback(
    (dhikrId: string): Promise<boolean> => {
      const promise = (async (): Promise<boolean> => {
        try {
          const today = todayKey();
          // Dedupe: each dhikr counts toward the daily threshold at most once
          // per day, so decrement + re-increment cannot inflate the streak.
          const firstToday = await logDhikrCompletion(today, dhikrId);
          if (!firstToday) return false;
          const newCount = await incrementAndGetDhikrsCompletedForDate(today);
          let result = false;
          if (newCount >= STREAK_DHIKR_THRESHOLD) {
            const beforeStreak = await getDisplayStreak();
            await bumpStreak();
            const afterStreak = await getDisplayStreak();
            if (afterStreak > beforeStreak) {
              streakBumpEvents.emit({ from: beforeStreak, to: afterStreak });
              result = true;
            }
          }
          // Recompute streak warnings: today's remaining count just changed,
          // and a just-secured streak flips today's warning into tomorrow's.
          void refreshStreakNotifications();
          return result;
        } catch {
          return false;
        }
      })();
      lastStreakPromiseRef.current = promise;
      return promise;
    },
    [],
  );

  const bumpConfetti = useCallback((id: string) => {
    if (variantBagRef.current.length === 0) {
      variantBagRef.current = shuffleDhikrVariants();
    }
    const variant = variantBagRef.current.pop()!;
    setConfettiVariants((prev) => ({ ...prev, [id]: variant }));
    setConfettiTicks((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, []);

  const clearAdvance = useCallback((id: string) => {
    const t = advanceTimers.current[id];
    if (t) {
      clearTimeout(t);
      delete advanceTimers.current[id];
    }
  }, []);

  const scheduleAdvance = useCallback(
    (id: string) => {
      clearAdvance(id);
      advanceTimers.current[id] = setTimeout(() => {
        setStates((prev) => {
          const list = dhikrsByCategory[id] ?? [];
          const cur = prev[id];
          if (!cur) return prev;
          const dhikr = list[cur.currentDhikrIndex];
          if (!dhikr) return prev;
          if ((cur.counts[dhikr.id] ?? 0) < dhikr.target) return prev;
          const allComplete = list.every(
            (d) => (cur.counts[d.id] ?? 0) >= d.target,
          );
          if (allComplete) return prev;
          const nextIdx = (cur.currentDhikrIndex + 1) % list.length;
          const nextD = list[nextIdx];
          const counts = { ...cur.counts, [nextD.id]: cur.counts[nextD.id] ?? 0 };
          // In-memory advance during the tutorial; no index write.
          if (sandboxCategoryRef.current !== id) scheduleIndexWrite(id, nextIdx);
          return { ...prev, [id]: { currentDhikrIndex: nextIdx, counts } };
        });
      }, ADVANCE_DELAY_MS);
    },
    [dhikrsByCategory, scheduleIndexWrite, clearAdvance],
  );

  const incrementCurrent = useCallback(
    (id: CategoryId) => {
      setStates((prev) => {
        const list = dhikrsByCategory[id] ?? [];
        const cur = prev[id];
        if (!cur) return prev;
        const dhikr = list[cur.currentDhikrIndex];
        if (!dhikr) return prev;
        const currentCount = cur.counts[dhikr.id] ?? 0;
        if (currentCount >= dhikr.target) return prev;
        const newCount = currentCount + 1;
        const counts = { ...cur.counts };
        const sb = sandboxCategoryRef.current === id;

        if (!sb) {
          pendingDhikrCount.current += 1;
          scheduleStatsFlush();
        }

        if (newCount >= dhikr.target) {
          counts[dhikr.id] = dhikr.target;
          hapticsStrong();
          const allComplete = list.every(
            (d) => (counts[d.id] ?? 0) >= d.target,
          );
          // Skip per-dhikr confetti when this completion finalises the whole
          // category — the category-completion celebration owns that moment.
          if (!allComplete) {
            bumpConfetti(id);
          }
          // Advance to the next dhikr on completion in both real and sandbox
          // modes (sandbox advance is in-memory only — see scheduleAdvance).
          scheduleAdvance(id);
          if (!sb) {
            scheduleCountWrite(dhikr.id, dhikr.target);
            recordIndividualDhikrCompletion(dhikr.id);
            if (allComplete) {
              recordCategoryCompletion(id);
            }
          }
        } else {
          counts[dhikr.id] = newCount;
          hapticsLight();
          if (!sb) scheduleCountWrite(dhikr.id, newCount);
        }

        if (!sb) {
          let totalTarget = 0;
          let totalCount = 0;
          for (const d of list) {
            totalTarget += d.target;
            totalCount += Math.min(counts[d.id] ?? 0, d.target);
          }
          if (totalTarget > 0) {
            scheduleProgressWrite(id, (totalCount / totalTarget) * 100);
          }
        }

        return {
          ...prev,
          [id]: { currentDhikrIndex: cur.currentDhikrIndex, counts },
        };
      });
    },
    [
      dhikrsByCategory,
      bumpConfetti,
      scheduleAdvance,
      scheduleCountWrite,
      scheduleStatsFlush,
      scheduleProgressWrite,
      recordCategoryCompletion,
      recordIndividualDhikrCompletion,
    ],
  );

  const decrementCurrent = useCallback(
    (id: CategoryId) => {
      setStates((prev) => {
        const list = dhikrsByCategory[id] ?? [];
        const cur = prev[id];
        if (!cur) return prev;
        const dhikr = list[cur.currentDhikrIndex];
        if (!dhikr) return prev;
        const currentCount = cur.counts[dhikr.id] ?? 0;
        if (currentCount <= 0) return prev;
        const newCount = currentCount - 1;
        const counts = { ...cur.counts, [dhikr.id]: newCount };
        hapticsLight();
        if (sandboxCategoryRef.current !== id) scheduleCountWrite(dhikr.id, newCount);
        return { ...prev, [id]: { ...cur, counts } };
      });
    },
    [dhikrsByCategory, scheduleCountWrite],
  );

  const nextDhikr = useCallback(
    (id: CategoryId) => {
      clearAdvance(id);
      setStates((prev) => {
        const list = dhikrsByCategory[id] ?? [];
        const cur = prev[id];
        if (!cur) return prev;
        if (list.length === 0) return prev;
        const nextIdx = (cur.currentDhikrIndex + 1) % list.length;
        if (nextIdx === cur.currentDhikrIndex) return prev;
        if (sandboxCategoryRef.current !== id) scheduleIndexWrite(id, nextIdx);
        return { ...prev, [id]: { ...cur, currentDhikrIndex: nextIdx } };
      });
    },
    [dhikrsByCategory, scheduleIndexWrite, clearAdvance],
  );

  const prevDhikr = useCallback(
    (id: CategoryId) => {
      clearAdvance(id);
      setStates((prev) => {
        const list = dhikrsByCategory[id] ?? [];
        const cur = prev[id];
        if (!cur) return prev;
        if (list.length === 0) return prev;
        const nextIdx =
          (cur.currentDhikrIndex - 1 + list.length) % list.length;
        if (nextIdx === cur.currentDhikrIndex) return prev;
        if (sandboxCategoryRef.current !== id) scheduleIndexWrite(id, nextIdx);
        return { ...prev, [id]: { ...cur, currentDhikrIndex: nextIdx } };
      });
    },
    [dhikrsByCategory, scheduleIndexWrite, clearAdvance],
  );

  const seekToDhikr = useCallback(
    (id: CategoryId, dhikrId: string) => {
      clearAdvance(id);
      setStates((prev) => {
        const list = dhikrsByCategory[id] ?? [];
        const idx = list.findIndex((d) => d.id === dhikrId);
        if (idx < 0) return prev;
        const cur = prev[id];
        if (!cur) return prev;
        if (cur.currentDhikrIndex === idx) return prev;
        scheduleIndexWrite(id, idx);
        return { ...prev, [id]: { ...cur, currentDhikrIndex: idx } };
      });
    },
    [dhikrsByCategory, scheduleIndexWrite, clearAdvance],
  );

  const resetAll = useCallback(
    (id: CategoryId) => {
      clearAdvance(id);
      setStates((prev) => {
        const list = dhikrsByCategory[id] ?? [];
        const counts: Record<string, number> = {};
        for (const d of list) counts[d.id] = 0;
        return { ...prev, [id]: { currentDhikrIndex: 0, counts } };
      });
      resetCategoryCounts(id).catch(() => {});
    },
    [dhikrsByCategory, clearAdvance],
  );

  const beginTutorialSandbox = useCallback((id: CategoryId) => {
    const cur = statesRef.current[id];
    sandboxSnapshotRef.current = cur
      ? { currentDhikrIndex: cur.currentDhikrIndex, counts: { ...cur.counts } }
      : { currentDhikrIndex: 0, counts: {} };
    sandboxCategoryRef.current = id;
  }, []);

  const endTutorialSandbox = useCallback(
    (id: CategoryId) => {
      const snap = sandboxSnapshotRef.current;
      sandboxCategoryRef.current = null;
      sandboxSnapshotRef.current = null;
      clearAdvance(id);
      // Restore the pre-tutorial counts but jump back to the first dhikr.
      setStates((prev) => ({
        ...prev,
        [id]: { currentDhikrIndex: 0, counts: snap ? { ...snap.counts } : {} },
      }));
    },
    [clearAdvance],
  );

  const resetTutorialSandbox = useCallback(
    (id: CategoryId) => {
      const snap = sandboxSnapshotRef.current;
      clearAdvance(id);
      setStates((prev) => ({
        ...prev,
        [id]: { currentDhikrIndex: 0, counts: snap ? { ...snap.counts } : {} },
      }));
    },
    [clearAdvance],
  );

  const resetAllCategories = useCallback(() => {
    for (const cat of categories) {
      clearAdvance(cat.id);
      resetCategoryCounts(cat.id).catch(() => {});
    }
    setStates((prev) => {
      const next = { ...prev };
      for (const cat of categories) {
        const list = dhikrsByCategory[cat.id] ?? [];
        const counts: Record<string, number> = {};
        for (const d of list) counts[d.id] = 0;
        next[cat.id] = { currentDhikrIndex: 0, counts };
      }
      return next;
    });
  }, [categories, dhikrsByCategory, clearAdvance]);

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  useEffect(() => {
    if (!hydrated) return;

    const doCheck = async () => {
      const today = todayKey();
      const lastReset = await getMeta('lastFajrResetDate').catch(() => null);
      if (lastReset === today) return;

      const now = new Date();
      let shouldReset = false;

      if (location) {
        try {
          const ext = computeExtendedTimes(location, now, prayerMethodId, madhab);
          if (now >= ext.fajr) shouldReset = true;
        } catch {
          shouldReset = true;
        }
      } else {
        // No location: reset at device midnight. Guard above prevents repeat resets within a day.
        shouldReset = true;
      }

      if (shouldReset) {
        // Persist reset-date FIRST so a crash mid-reset cannot trigger a double-reset on next open.
        await setMeta('lastFajrResetDate', today).catch(() => {});
        const cats = categoriesRef.current;
        for (const cat of cats) {
          clearAdvance(cat.id);
          resetCategoryCounts(cat.id).catch(() => {});
        }
        setStates((prev) => {
          const next = { ...prev };
          for (const cat of cats) {
            const list = dhikrsByCategory[cat.id] ?? [];
            const counts: Record<string, number> = {};
            for (const d of list) counts[d.id] = 0;
            next[cat.id] = { currentDhikrIndex: 0, counts };
          }
          return next;
        });
        // Day rolled over (possibly while foregrounded, so no AppState 'active'
        // fires) — recompute today's/tomorrow's streak warnings for the new day.
        void refreshStreakNotifications();
      }
    };

    doCheck();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') doCheck();
    });
    return () => sub.remove();
  }, [hydrated, location, prayerMethodId, madhab, dhikrsByCategory, clearAdvance]);

  return (
    <CounterContext.Provider
      value={{
        hydrated,
        categories,
        dhikrsByCategory,
        states,
        confettiTicks,
        confettiVariants,
        incrementCurrent,
        decrementCurrent,
        nextDhikr,
        prevDhikr,
        resetAll,
        resetAllCategories,
        seekToDhikr,
        beginTutorialSandbox,
        endTutorialSandbox,
        resetTutorialSandbox,
      }}
    >
      {children}
    </CounterContext.Provider>
  );
};

export const useCounterContext = (): ContextValue => {
  const ctx = useContext(CounterContext);
  if (!ctx) throw new Error('useCounterContext must be used inside CounterProvider');
  return ctx;
};

export const useDhikrContent = () => {
  const { categories, dhikrsByCategory, hydrated, states } = useCounterContext();
  return { categories, dhikrsByCategory, hydrated, states };
};
