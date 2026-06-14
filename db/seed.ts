import { inArray, sql } from 'drizzle-orm';
import { db } from './index';
import {
  categories,
  categoryState,
  counters,
  dhikrs,
  meta,
} from './schema';
import categoriesJson from './seed/categories.json';
import dhikrsJson from './seed/dhikrs.json';

interface CategorySeed {
  id: string;
  label: string;
  sortOrder: number;
}

interface DhikrSeed {
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
}

const CATEGORIES_SEED = categoriesJson as CategorySeed[];
const DHIKRS_SEED = (dhikrsJson as { dhikrs: DhikrSeed[] }).dhikrs;
const BUNDLED_CONTENT_VERSION = String(
  (dhikrsJson as { contentVersion: number }).contentVersion,
);

function todayLocalISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

// Idempotent INSERT-OR-IGNORE of categories + dhikrs. Ensures FK targets exist
// before inserting user state during the AsyncStorage migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureContentRowsExist(tx: any): Promise<void> {
  for (const c of CATEGORIES_SEED) {
    await tx.insert(categories).values(c).onConflictDoNothing();
  }
  for (const d of DHIKRS_SEED) {
    await tx.insert(dhikrs).values(d).onConflictDoNothing();
  }
}

async function getMetaValue(key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(meta)
    .where(sql`${meta.key} = ${key}`)
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function seedIfNeeded(): Promise<void> {
  const today = todayLocalISO();
  const last = await getMetaValue('last_seed_date');
  const storedVersion = await getMetaValue('content_version');
  // guard disabled — always re-seed during dev

  await db.transaction(async (tx) => {
    // 1. UPSERT categories
    for (const c of CATEGORIES_SEED) {
      await tx
        .insert(categories)
        .values(c)
        .onConflictDoUpdate({
          target: categories.id,
          set: { label: c.label, sortOrder: c.sortOrder },
        });
    }

    // 2. UPSERT dhikrs
    const incomingDhikrIds = new Set<string>();
    for (const d of DHIKRS_SEED) {
      incomingDhikrIds.add(d.id);
      await tx
        .insert(dhikrs)
        .values(d)
        .onConflictDoUpdate({
          target: dhikrs.id,
          set: {
            categoryId: d.categoryId,
            arabic: d.arabic,
            transliteration: d.transliteration,
            translation: d.translation,
            target: d.target,
            description: d.description,
            reference: d.reference,
            grade: d.grade,
            audioFilename: d.audioFilename,
            sortOrder: d.sortOrder,
          },
        });
    }

    // 3. Delete dhikrs no longer in JSON (cascades counters + favourites)
    const existingDhikrs = await tx.select({ id: dhikrs.id }).from(dhikrs);
    const dhikrsToDelete = existingDhikrs
      .filter((r) => !incomingDhikrIds.has(r.id))
      .map((r) => r.id);
    if (dhikrsToDelete.length) {
      await tx.delete(dhikrs).where(inArray(dhikrs.id, dhikrsToDelete));
    }

    // 4. Delete categories no longer in JSON (cascades downstream)
    const incomingCategoryIds = new Set(CATEGORIES_SEED.map((c) => c.id));
    const existingCategories = await tx.select({ id: categories.id }).from(categories);
    const categoriesToDelete = existingCategories
      .filter((r) => !incomingCategoryIds.has(r.id))
      .map((r) => r.id);
    if (categoriesToDelete.length) {
      await tx.delete(categories).where(inArray(categories.id, categoriesToDelete));
    }

    // 5. Ensure category_state rows exist (preserve existing currentDhikrIndex)
    for (const c of CATEGORIES_SEED) {
      await tx
        .insert(categoryState)
        .values({ categoryId: c.id, currentDhikrIndex: 0 })
        .onConflictDoNothing();
    }

    // 6. Clamp any out-of-range currentDhikrIndex after retirements
    await tx.run(sql`
      UPDATE category_state
      SET current_dhikr_index = 0
      WHERE current_dhikr_index >= (
        SELECT COUNT(*) FROM dhikrs WHERE dhikrs.category_id = category_state.category_id
      )
    `);

    // 7. Ensure counters rows exist for every dhikr (preserve existing count)
    for (const d of DHIKRS_SEED) {
      await tx
        .insert(counters)
        .values({ dhikrId: d.id, count: 0 })
        .onConflictDoNothing();
    }

    // 8. Stamp meta
    await tx
      .insert(meta)
      .values({ key: 'last_seed_date', value: today })
      .onConflictDoUpdate({ target: meta.key, set: { value: today } });
    await tx
      .insert(meta)
      .values({ key: 'content_version', value: BUNDLED_CONTENT_VERSION })
      .onConflictDoUpdate({ target: meta.key, set: { value: BUNDLED_CONTENT_VERSION } });
  });
}
