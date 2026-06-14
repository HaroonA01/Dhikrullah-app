import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from './index';
import {
  categories,
  categoryCompletionLog,
  categoryState,
  counters,
  dailyCategoryProgress,
  dailyStats,
  dhikrCompletionLog,
  dhikrTimeLog,
  dhikrs,
  favourites,
  meta,
} from './schema';

export const getCategories = () =>
  db.select().from(categories).orderBy(asc(categories.sortOrder));

export const getAllDhikrs = () =>
  db
    .select()
    .from(dhikrs)
    .orderBy(asc(dhikrs.categoryId), asc(dhikrs.sortOrder));

export const getDhikrsFor = (categoryId: string) =>
  db
    .select()
    .from(dhikrs)
    .where(eq(dhikrs.categoryId, categoryId))
    .orderBy(asc(dhikrs.sortOrder));

export const getAllCounters = () => db.select().from(counters);

export const getAllCategoryState = () => db.select().from(categoryState);

export const getAllFavouriteIds = () =>
  db.select({ id: favourites.dhikrId }).from(favourites);

export const getFavouriteDhikrs = () =>
  db
    .select({
      id: dhikrs.id,
      arabic: dhikrs.arabic,
      transliteration: dhikrs.transliteration,
      categoryId: dhikrs.categoryId,
      categoryLabel: categories.label,
      categorySortOrder: categories.sortOrder,
      dhikrSortOrder: dhikrs.sortOrder,
    })
    .from(favourites)
    .innerJoin(dhikrs, eq(favourites.dhikrId, dhikrs.id))
    .innerJoin(categories, eq(dhikrs.categoryId, categories.id))
    .orderBy(asc(categories.sortOrder), asc(dhikrs.sortOrder));

export const setCount = (dhikrId: string, count: number) =>
  db
    .insert(counters)
    .values({ dhikrId, count, updatedAt: sql`(unixepoch())` })
    .onConflictDoUpdate({
      target: counters.dhikrId,
      set: { count, updatedAt: sql`(unixepoch())` },
    });

export const setCategoryIndex = (categoryId: string, currentDhikrIndex: number) =>
  db
    .insert(categoryState)
    .values({ categoryId, currentDhikrIndex, updatedAt: sql`(unixepoch())` })
    .onConflictDoUpdate({
      target: categoryState.categoryId,
      set: { currentDhikrIndex, updatedAt: sql`(unixepoch())` },
    });

export const addFavourite = (dhikrId: string) =>
  db.insert(favourites).values({ dhikrId }).onConflictDoNothing();

export const removeFavourite = (dhikrId: string) =>
  db.delete(favourites).where(eq(favourites.dhikrId, dhikrId));

export const resetCategoryCounts = (categoryId: string) =>
  db.transaction(async (tx) => {
    const ds = await tx
      .select({ id: dhikrs.id })
      .from(dhikrs)
      .where(eq(dhikrs.categoryId, categoryId));
    if (ds.length) {
      await tx
        .update(counters)
        .set({ count: 0, updatedAt: sql`(unixepoch())` })
        .where(
          inArray(
            counters.dhikrId,
            ds.map((d) => d.id),
          ),
        );
    }
    await tx
      .insert(categoryState)
      .values({ categoryId, currentDhikrIndex: 0, updatedAt: sql`(unixepoch())` })
      .onConflictDoUpdate({
        target: categoryState.categoryId,
        set: { currentDhikrIndex: 0, updatedAt: sql`(unixepoch())` },
      });
  });

export async function getMeta(key: string): Promise<string | null> {
  const rows = await db.select().from(meta).where(eq(meta.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db
    .insert(meta)
    .values({ key, value })
    .onConflictDoUpdate({ target: meta.key, set: { value } });
}

export const getDailyStatsRange = (startDate: string, endDate: string) =>
  db
    .select()
    .from(dailyStats)
    .where(and(gte(dailyStats.date, startDate), lte(dailyStats.date, endDate)))
    .orderBy(asc(dailyStats.date));

export const getDailyStatsForDate = (date: string) =>
  db.select().from(dailyStats).where(eq(dailyStats.date, date)).limit(1);

export const incrementDhikrCountForDate = (date: string, delta: number) =>
  db
    .insert(dailyStats)
    .values({ date, dhikrCount: delta })
    .onConflictDoUpdate({
      target: dailyStats.date,
      set: { dhikrCount: sql`${dailyStats.dhikrCount} + ${delta}` },
    });

export const incrementTimeSecondsForDate = (date: string, deltaSeconds: number) =>
  db
    .insert(dailyStats)
    .values({ date, timeSeconds: deltaSeconds })
    .onConflictDoUpdate({
      target: dailyStats.date,
      set: { timeSeconds: sql`${dailyStats.timeSeconds} + ${deltaSeconds}` },
    });

export const incrementCategoriesCompletedForDate = (date: string) =>
  db
    .insert(dailyStats)
    .values({ date, categoriesCompleted: 1 })
    .onConflictDoUpdate({
      target: dailyStats.date,
      set: {
        categoriesCompleted: sql`${dailyStats.categoriesCompleted} + 1`,
      },
    });

export async function incrementAndGetDhikrsCompletedForDate(date: string): Promise<number> {
  await db
    .insert(dailyStats)
    .values({ date, dhikrsCompleted: 1 })
    .onConflictDoUpdate({
      target: dailyStats.date,
      set: { dhikrsCompleted: sql`${dailyStats.dhikrsCompleted} + 1` },
    });
  const rows = await db
    .select({ count: dailyStats.dhikrsCompleted })
    .from(dailyStats)
    .where(eq(dailyStats.date, date))
    .limit(1);
  return rows[0]?.count ?? 0;
}

export const getCompletionsInRange = (startDate: string, endDate: string) =>
  db
    .select({
      date: categoryCompletionLog.date,
      categoryId: categoryCompletionLog.categoryId,
    })
    .from(categoryCompletionLog)
    .where(
      and(
        gte(categoryCompletionLog.date, startDate),
        lte(categoryCompletionLog.date, endDate),
      ),
    );

export const getCompletionTimestampsInRange = (startDate: string, endDate: string) =>
  db
    .select({
      date: categoryCompletionLog.date,
      categoryId: categoryCompletionLog.categoryId,
      completedAt: categoryCompletionLog.completedAt,
    })
    .from(categoryCompletionLog)
    .where(
      and(
        gte(categoryCompletionLog.date, startDate),
        lte(categoryCompletionLog.date, endDate),
      ),
    );

export const getCategoryProgressInRange = (
  startDate: string,
  endDate: string,
) =>
  db
    .select({
      date: dailyCategoryProgress.date,
      categoryId: dailyCategoryProgress.categoryId,
      percent: dailyCategoryProgress.percent,
    })
    .from(dailyCategoryProgress)
    .where(
      and(
        gte(dailyCategoryProgress.date, startDate),
        lte(dailyCategoryProgress.date, endDate),
      ),
    );

export const upsertCategoryProgress = (
  date: string,
  categoryId: string,
  percent: number,
) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return db
    .insert(dailyCategoryProgress)
    .values({ date, categoryId, percent: clamped })
    .onConflictDoUpdate({
      target: [dailyCategoryProgress.date, dailyCategoryProgress.categoryId],
      set: {
        percent: sql`MAX(${dailyCategoryProgress.percent}, ${clamped})`,
        updatedAt: sql`(unixepoch())`,
      },
    });
};

export async function backfillCategoryProgressIfNeeded(): Promise<void> {
  const done = await getMeta('category_progress_backfill_done');
  if (done === '1') return;
  const rows = await db
    .select({
      date: categoryCompletionLog.date,
      categoryId: categoryCompletionLog.categoryId,
    })
    .from(categoryCompletionLog);
  for (const r of rows) {
    await db
      .insert(dailyCategoryProgress)
      .values({ date: r.date, categoryId: r.categoryId, percent: 100 })
      .onConflictDoUpdate({
        target: [dailyCategoryProgress.date, dailyCategoryProgress.categoryId],
        set: { percent: 100 },
      });
  }
  await setMeta('category_progress_backfill_done', '1');
}

export async function logCategoryCompletion(
  date: string,
  categoryId: string,
): Promise<boolean> {
  const result = await db
    .insert(categoryCompletionLog)
    .values({ date, categoryId })
    .onConflictDoNothing()
    .returning({ date: categoryCompletionLog.date });
  return result.length > 0;
}

// Returns true the first time a given (date, dhikrId) pair is recorded.
// Subsequent calls in the same day for the same dhikr are no-ops — used to
// dedupe streak credit when a user decrements past target then re-increments.
export async function logDhikrCompletion(
  date: string,
  dhikrId: string,
): Promise<boolean> {
  const result = await db
    .insert(dhikrCompletionLog)
    .values({ date, dhikrId })
    .onConflictDoNothing()
    .returning({ date: dhikrCompletionLog.date });
  return result.length > 0;
}

export const incrementDhikrTime = (
  date: string,
  dhikrId: string,
  deltaSeconds: number,
) =>
  db
    .insert(dhikrTimeLog)
    .values({ date, dhikrId, seconds: deltaSeconds })
    .onConflictDoUpdate({
      target: [dhikrTimeLog.date, dhikrTimeLog.dhikrId],
      set: {
        seconds: sql`${dhikrTimeLog.seconds} + ${deltaSeconds}`,
        updatedAt: sql`(unixepoch())`,
      },
    });

export async function getDhikrTimeForDate(
  date: string,
  dhikrId: string,
): Promise<number> {
  const rows = await db
    .select({ seconds: dhikrTimeLog.seconds })
    .from(dhikrTimeLog)
    .where(and(eq(dhikrTimeLog.date, date), eq(dhikrTimeLog.dhikrId, dhikrId)))
    .limit(1);
  return rows[0]?.seconds ?? 0;
}

export async function getDhikrTimeTotalForDate(date: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${dhikrTimeLog.seconds}), 0)` })
    .from(dhikrTimeLog)
    .where(eq(dhikrTimeLog.date, date));
  return Number(rows[0]?.total ?? 0);
}

export async function getCategoryTimeForDate(
  date: string,
  dhikrIds: string[],
): Promise<number> {
  if (dhikrIds.length === 0) return 0;
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${dhikrTimeLog.seconds}), 0)` })
    .from(dhikrTimeLog)
    .where(
      and(
        eq(dhikrTimeLog.date, date),
        inArray(dhikrTimeLog.dhikrId, dhikrIds),
      ),
    );
  return Number(rows[0]?.total ?? 0);
}

export async function backfillLifetimeIfNeeded(): Promise<void> {
  const done = await getMeta('lifetime_backfill_done');
  if (done === '1') return;
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${counters.count}), 0)` })
    .from(counters);
  const total = Number(rows[0]?.total ?? 0);
  await setMeta('lifetime_total_dhikr', String(total));
  await setMeta('lifetime_backfill_done', '1');
}
