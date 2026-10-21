import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { base } from '../__core/app';
import { admin } from './movies';
import { db } from '../database';
import { series as shows, seasons, episodes } from '../database/schema';
import { signMedia, validatePoster, validateEpisodeVideo } from '../media-storage';

const idInput = z.object({ id: z.string().min(1) });
const posterKey = z.string().regex(/^cinestream\/posters\/[a-f0-9-]+\.(jpeg|png|webp)$/).nullable();
const videoKey = z.string().regex(/^cinestream\/videos\/[a-f0-9-]+\.mp4$/);
const showFields = z.object({
  title: z.string().trim().min(1).max(120), description: z.string().max(4000),
  genre: z.string().trim().min(1).max(40), year: z.number().int().min(1888).max(2100), posterKey,
});
const seasonFields = z.object({ seriesId: z.string().min(1), number: z.number().int().min(1).max(999), title: z.string().trim().max(120) });
const episodeFields = z.object({
  seasonId: z.string().min(1), number: z.number().int().min(1).max(9999),
  title: z.string().trim().min(1).max(160), description: z.string().max(4000), duration: z.number().int().nonnegative(),
});

async function requireShow(id: string) {
  const [row] = await db.select().from(shows).where(eq(shows.id, id));
  if (!row) throw new ORPCError('NOT_FOUND', { message: 'Série introuvable.' });
  return row;
}
async function requireSeason(id: string) {
  const [row] = await db.select().from(seasons).where(eq(seasons.id, id));
  if (!row) throw new ORPCError('NOT_FOUND', { message: 'Saison introuvable.' });
  return row;
}

export const series = {
  list: base.handler(async () => {
    const rows = await db.select().from(shows).orderBy(desc(shows.createdAt));
    const seasonRows = await db.select({ id: seasons.id, seriesId: seasons.seriesId }).from(seasons);
    const episodeRows = await db.select({ seasonId: episodes.seasonId }).from(episodes);
    return Promise.all(rows.map(async row => {
      const ids = new Set(seasonRows.filter(season => season.seriesId === row.id).map(season => season.id));
      return { ...row, poster: row.posterKey ? await signMedia(row.posterKey) : null, seasonCount: ids.size, episodeCount: episodeRows.filter(episode => ids.has(episode.seasonId)).length };
    }));
  }),
  get: base.input(idInput).handler(async ({ input }) => {
    const row = await requireShow(input.id);
    const seasonRows = await db.select().from(seasons).where(eq(seasons.seriesId, row.id)).orderBy(asc(seasons.number));
    const episodeRows = seasonRows.length ? await db.select().from(episodes).where(inArray(episodes.seasonId, seasonRows.map(season => season.id))).orderBy(asc(episodes.number)) : [];
    return { ...row, poster: row.posterKey ? await signMedia(row.posterKey) : null, seasons: seasonRows.map(season => ({ ...season, episodes: episodeRows.filter(episode => episode.seasonId === season.id) })) };
  }),
  create: admin.input(showFields).handler(async ({ input }) => {
    await validatePoster(input.posterKey);
    const [row] = await db.insert(shows).values({ ...input, id: crypto.randomUUID(), createdAt: Date.now() }).returning();
    return row;
  }),
  update: admin.input(showFields.extend({ id: z.string() })).handler(async ({ input }) => {
    await requireShow(input.id); await validatePoster(input.posterKey);
    const { id, ...fields } = input;
    const [row] = await db.update(shows).set(fields).where(eq(shows.id, id)).returning();
    return row;
  }),
  remove: admin.input(idInput).handler(async ({ input }) => {
    await requireShow(input.id);
    const children = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.seriesId, input.id));
    await db.transaction(async tx => {
      if (children.length) await tx.delete(episodes).where(inArray(episodes.seasonId, children.map(row => row.id)));
      await tx.delete(seasons).where(eq(seasons.seriesId, input.id));
      await tx.delete(shows).where(eq(shows.id, input.id));
    });
    return { ok: true };
  }),
  saveSeason: admin.input(seasonFields.extend({ id: z.string().optional() })).handler(async ({ input }) => {
    await requireShow(input.seriesId);
    if (input.id) {
      const existing = await requireSeason(input.id);
      if (existing.seriesId !== input.seriesId) throw new ORPCError('BAD_REQUEST');
    }
    const [duplicate] = await db.select().from(seasons).where(and(eq(seasons.seriesId, input.seriesId), eq(seasons.number, input.number)));
    if (duplicate && duplicate.id !== input.id) throw new ORPCError('CONFLICT', { message: 'Ce numéro de saison existe déjà pour cette série.' });
    const { id, ...fields } = input;
    if (id) return (await db.update(seasons).set(fields).where(eq(seasons.id, id)).returning())[0];
    return (await db.insert(seasons).values({ ...fields, id: crypto.randomUUID() }).returning())[0];
  }),
  removeSeason: admin.input(idInput).handler(async ({ input }) => {
    await requireSeason(input.id);
    await db.transaction(async tx => {
      await tx.delete(episodes).where(eq(episodes.seasonId, input.id));
      await tx.delete(seasons).where(eq(seasons.id, input.id));
    });
    return { ok: true };
  }),
  saveEpisode: admin.input(episodeFields.extend({ id: z.string().optional(), videoKey: videoKey.optional() })).handler(async ({ input }) => {
    await requireSeason(input.seasonId);
    const [existing] = input.id ? await db.select().from(episodes).where(eq(episodes.id, input.id)) : [];
    if (input.id && !existing) throw new ORPCError('NOT_FOUND', { message: 'Épisode introuvable.' });
    if (existing && existing.seasonId !== input.seasonId) throw new ORPCError('BAD_REQUEST', { message: 'Cet épisode appartient à une autre saison.' });
    if (!existing && !input.videoKey) throw new ORPCError('BAD_REQUEST', { message: 'Sélectionnez le MP4 de l’épisode.' });
    const [duplicate] = await db.select().from(episodes).where(and(eq(episodes.seasonId, input.seasonId), eq(episodes.number, input.number)));
    if (duplicate && duplicate.id !== input.id) throw new ORPCError('CONFLICT', { message: 'Ce numéro d’épisode existe déjà dans cette saison.' });
    if (input.videoKey) await validateEpisodeVideo(input.videoKey);
    const { id, videoKey: replacement, ...fields } = input;
    if (id && existing) return (await db.update(episodes).set({ ...fields, duration: replacement ? fields.duration : existing.duration, ...(replacement ? { videoKey: replacement } : {}) }).where(eq(episodes.id, id)).returning())[0];
    return (await db.insert(episodes).values({ ...fields, videoKey: replacement!, id: crypto.randomUUID(), createdAt: Date.now() }).returning())[0];
  }),
  removeEpisode: admin.input(idInput).handler(async ({ input }) => {
    await db.delete(episodes).where(eq(episodes.id, input.id));
    return { ok: true };
  }),
  playback: base.input(idInput).handler(async ({ input }) => {
    const [row] = await db.select().from(episodes).where(eq(episodes.id, input.id));
    if (!row) throw new ORPCError('NOT_FOUND', { message: 'Épisode introuvable.' });
    return { url: await signMedia(row.videoKey) };
  }),
};