import { sqliteTable, text, integer, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
export * from './auth-schema';
export const movies = sqliteTable('movies', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  genre: text('genre').notNull(),
  year: integer('year').notNull(),
  duration: integer('duration').notNull(),
  videoKey: text('video_key').notNull(),
  posterKey: text('poster_key'),
  createdAt: integer('created_at').notNull(),
});

export const topFiveSettings = sqliteTable('top_five_settings', {
  id: text('id').primaryKey(),
  mode: text('mode', { enum: ['automatic', 'manual'] }).notNull(),
  manualIds: text('manual_ids').notNull(),
});

export const movieViews = sqliteTable('movie_views', {
  movieId: text('movie_id').notNull().references(() => movies.id, { onDelete: 'cascade' }),
  viewerId: text('viewer_id').notNull(),
  day: text('day').notNull(),
}, (table) => [primaryKey({ columns: [table.movieId, table.viewerId, table.day] })]);

export const series = sqliteTable('series', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  genre: text('genre').notNull(),
  year: integer('year').notNull(),
  posterKey: text('poster_key'),
  createdAt: integer('created_at').notNull(),
});

export const seasons = sqliteTable('seasons', {
  id: text('id').primaryKey(),
  seriesId: text('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  title: text('title').notNull(),
}, table => [uniqueIndex('season_series_number').on(table.seriesId, table.number)]);

export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(),
  seasonId: text('season_id').notNull().references(() => seasons.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  duration: integer('duration').notNull(),
  videoKey: text('video_key').notNull(),
  createdAt: integer('created_at').notNull(),
}, table => [uniqueIndex('episode_season_number').on(table.seasonId, table.number)]);

/**
 * Define your database schema here, then apply it with `bun run db:push`
 * (from packages/web). Re-export any generated schema from this file
 * (e.g. Better Auth's auth-schema.ts) so drizzle generates complete migrations.
 * Table patterns and conventions: skills/app/references/api.md
 */
