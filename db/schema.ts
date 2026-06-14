import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const dhikrs = sqliteTable(
  'dhikrs',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    arabic: text('arabic').notNull(),
    transliteration: text('transliteration').notNull(),
    translation: text('translation').notNull(),
    target: integer('target').notNull(),
    description: text('description'),
    reference: text('reference'),
    grade: text('grade'),
    audioFilename: text('audio_filename'),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => ({
    byCategoryOrder: index('dhikrs_category_sort_idx').on(t.categoryId, t.sortOrder),
  }),
);

export const counters = sqliteTable('counters', {
  dhikrId: text('dhikr_id')
    .primaryKey()
    .references(() => dhikrs.id, { onDelete: 'cascade' }),
  count: integer('count').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const categoryState = sqliteTable('category_state', {
  categoryId: text('category_id')
    .primaryKey()
    .references(() => categories.id, { onDelete: 'cascade' }),
  currentDhikrIndex: integer('current_dhikr_index').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const favourites = sqliteTable('favourites', {
  dhikrId: text('dhikr_id')
    .primaryKey()
    .references(() => dhikrs.id, { onDelete: 'cascade' }),
  addedAt: integer('added_at').notNull().default(sql`(unixepoch())`),
});

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const dailyStats = sqliteTable('daily_stats', {
  date: text('date').primaryKey(),
  dhikrCount: integer('dhikr_count').notNull().default(0),
  timeSeconds: integer('time_seconds').notNull().default(0),
  categoriesCompleted: integer('categories_completed').notNull().default(0),
  dhikrsCompleted: integer('dhikrs_completed').notNull().default(0),
});

export const categoryCompletionLog = sqliteTable(
  'category_completion_log',
  {
    date: text('date').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    completedAt: integer('completed_at').notNull().default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.date, t.categoryId] })],
);

export const dailyCategoryProgress = sqliteTable(
  'daily_category_progress',
  {
    date: text('date').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    percent: integer('percent').notNull().default(0),
    updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.date, t.categoryId] })],
);

// Records each (date, dhikrId) pair the first time the dhikr hits its target
// that day. Streak progress is gated on this table so that decrementing and
// re-incrementing a single dhikr cannot be used to inflate the daily count.
export const dhikrCompletionLog = sqliteTable(
  'dhikr_completion_log',
  {
    date: text('date').notNull(),
    dhikrId: text('dhikr_id')
      .notNull()
      .references(() => dhikrs.id, { onDelete: 'cascade' }),
    completedAt: integer('completed_at').notNull().default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.date, t.dhikrId] })],
);

// Accumulated seconds the user has spent on each dhikr within a given Islamic
// day (fajr → fajr), keyed by the date of the Islamic day's *start*. Falls
// back to civil date when location is not set. Feeds the counter-page timer
// pill (per-dhikr + today-total readouts).
export const dhikrTimeLog = sqliteTable(
  'dhikr_time_log',
  {
    date: text('date').notNull(),
    dhikrId: text('dhikr_id')
      .notNull()
      .references(() => dhikrs.id, { onDelete: 'cascade' }),
    seconds: integer('seconds').notNull().default(0),
    updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.date, t.dhikrId] })],
);

export type DhikrRow = typeof dhikrs.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type CounterRow = typeof counters.$inferSelect;
export type CategoryStateRow = typeof categoryState.$inferSelect;
export type FavouriteRow = typeof favourites.$inferSelect;
export type DailyStatsRow = typeof dailyStats.$inferSelect;
export type CategoryCompletionLogRow = typeof categoryCompletionLog.$inferSelect;
export type DailyCategoryProgressRow = typeof dailyCategoryProgress.$inferSelect;
export type DhikrCompletionLogRow = typeof dhikrCompletionLog.$inferSelect;
export type DhikrTimeLogRow = typeof dhikrTimeLog.$inferSelect;
