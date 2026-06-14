import AsyncStorage from '@react-native-async-storage/async-storage';
import { sql } from 'drizzle-orm';
import { db } from './index';
import { categoryState, counters, favourites, meta } from './schema';
import { ensureContentRowsExist } from './seed';

const COUNTER_PREFIX = 'dhikrullah:counter:';
const FAV_KEY = 'dhikrullah:favourites:ids';
const META_FLAG = 'migration_from_asyncstorage_complete';

interface LegacyCounterState {
  currentDhikrIndex?: number;
  counts?: Record<string, number>;
}

export async function migrateFromAsyncStorageIfNeeded(): Promise<void> {
  const flagRows = await db
    .select()
    .from(meta)
    .where(sql`${meta.key} = ${META_FLAG}`)
    .limit(1);
  if (flagRows[0]?.value === '1') return;

  const allKeys = await AsyncStorage.getAllKeys();
  const counterKeys = allKeys.filter((k) => k.startsWith(COUNTER_PREFIX));
  const reads = await Promise.all([
    AsyncStorage.getItem(FAV_KEY),
    ...counterKeys.map((k) => AsyncStorage.getItem(k)),
  ]);
  const favRaw = reads[0];
  const counterRaws = reads.slice(1);

  await db.transaction(async (tx) => {
    await ensureContentRowsExist(tx);

    for (let i = 0; i < counterKeys.length; i++) {
      const key = counterKeys[i];
      const categoryId = key.slice(COUNTER_PREFIX.length);
      const raw = counterRaws[i];
      if (!raw) continue;
      let parsed: LegacyCounterState;
      try {
        parsed = JSON.parse(raw) as LegacyCounterState;
      } catch {
        continue;
      }

      const idx = Math.max(0, parsed.currentDhikrIndex ?? 0);
      await tx
        .insert(categoryState)
        .values({ categoryId, currentDhikrIndex: idx })
        .onConflictDoUpdate({
          target: categoryState.categoryId,
          set: { currentDhikrIndex: idx },
        });

      for (const [dhikrId, count] of Object.entries(parsed.counts ?? {})) {
        const safeCount = Math.max(0, count);
        await tx
          .insert(counters)
          .values({ dhikrId, count: safeCount })
          .onConflictDoUpdate({
            target: counters.dhikrId,
            set: { count: safeCount },
          });
      }
    }

    if (favRaw) {
      try {
        const ids: string[] = JSON.parse(favRaw);
        for (const id of ids) {
          await tx.insert(favourites).values({ dhikrId: id }).onConflictDoNothing();
        }
      } catch {
        // swallow malformed JSON
      }
    }

    await tx
      .insert(meta)
      .values({ key: META_FLAG, value: '1' })
      .onConflictDoUpdate({ target: meta.key, set: { value: '1' } });
  });

  if (counterKeys.length || favRaw) {
    await AsyncStorage.multiRemove([FAV_KEY, ...counterKeys]);
  }
}
