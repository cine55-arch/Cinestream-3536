import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { count, eq } from 'drizzle-orm';
import { base } from '../__core/app';
import { db } from '../database';
import { movies, movieViews, topFiveSettings } from '../database/schema';
import { admin } from './movies';

const settingId = 'top5';

export const topFive = {
  get: base.handler(async () => {
    const [setting] = await db.select().from(topFiveSettings).where(eq(topFiveSettings.id, settingId));
    const films = await db.select({ id: movies.id, createdAt: movies.createdAt }).from(movies);
    const totals = await db.select({ movieId: movieViews.movieId, views: count() }).from(movieViews).groupBy(movieViews.movieId);
    const views = Object.fromEntries(totals.map(row => [row.movieId, row.views]));
    const validIds = new Set(films.map(film => film.id));
    let manualIds: string[] = [];
    try {
      const parsed: unknown = JSON.parse(setting?.manualIds || '[]');
      if (Array.isArray(parsed)) manualIds = parsed.filter((id): id is string => typeof id === 'string' && validIds.has(id)).slice(0, 5);
    } catch { /* An invalid saved preference falls back to an empty selection. */ }
    const automaticIds = films.sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0) || b.createdAt - a.createdAt || a.id.localeCompare(b.id)).slice(0, 5).map(film => film.id);
    const mode = setting?.mode === 'manual' ? 'manual' : 'automatic';
    return { mode, manualIds, ids: mode === 'manual' ? manualIds : automaticIds, views };
  }),
  save: admin.input(z.object({ mode: z.enum(['automatic', 'manual']), manualIds: z.array(z.string()).max(5).refine(ids => new Set(ids).size === ids.length, 'Un film ne peut apparaître qu’une fois.') })).handler(async ({ input }) => {
    const valid = await db.select({ id: movies.id }).from(movies);
    const validIds = new Set(valid.map(row => row.id));
    if (input.manualIds.some(id => !validIds.has(id))) throw new ORPCError('BAD_REQUEST', { message: 'Un film sélectionné n’est plus dans le catalogue.' });
    await db.insert(topFiveSettings).values({ id: settingId, mode: input.mode, manualIds: JSON.stringify(input.manualIds) }).onConflictDoUpdate({ target: topFiveSettings.id, set: { mode: input.mode, manualIds: JSON.stringify(input.manualIds) } });
    return { ok: true };
  }),
  recordView: base.input(z.object({ movieId: z.string(), viewerId: z.string().uuid() })).handler(async ({ input }) => {
    const [film] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, input.movieId));
    if (!film) throw new ORPCError('NOT_FOUND', { message: 'Film introuvable.' });
    const day = new Date().toISOString().slice(0, 10);
    await db.insert(movieViews).values({ movieId: input.movieId, viewerId: input.viewerId, day }).onConflictDoNothing();
    return { ok: true };
  }),
};