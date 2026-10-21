import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { eq, desc } from 'drizzle-orm';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { base } from '../__core/app';
import { auth, ADMIN_EMAIL } from '../auth';
import { db } from '../database';
import { movies as table } from '../database/schema';

const s3 = new S3Client({ region: 'auto', endpoint: process.env.S3_ENDPOINT, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
const bucket = process.env.S3_BUCKET!;
export const admin = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session || session.user.email.toLowerCase() !== ADMIN_EMAIL) throw new ORPCError('FORBIDDEN', { message: 'Accès réservé à l’administrateur.' });
  return next({ context: { user: session.user } });
});
const signed = (key: string) => getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 86400 });
export const movies = {
  list: base.handler(async () => {
    const rows = await db.select().from(table).orderBy(desc(table.createdAt));
    return Promise.all(rows.map(async row => ({ ...row, poster: row.posterKey ? await signed(row.posterKey) : null })));
  }),
  access: admin.handler(({ context }) => ({ email: context.user.email })),
  presign: admin.input(z.object({ name: z.string(), type: z.enum(['video/mp4', 'image/jpeg', 'image/png', 'image/webp']), size: z.number().positive().max(15 * 1024 ** 3) })).handler(async ({ input }) => {
    if (input.type === 'video/mp4' && !input.name.toLowerCase().endsWith('.mp4')) throw new ORPCError('BAD_REQUEST', { message: 'Les vidéos doivent être au format MP4.' });
    if (input.type !== 'video/mp4' && input.size > 10 * 1024 ** 2) throw new ORPCError('BAD_REQUEST', { message: 'Affiche : 10 Mo maximum.' });
    const key = `cinestream/${input.type === 'video/mp4' ? 'videos' : 'posters'}/${crypto.randomUUID()}.${input.type.split('/')[1]}`;
    const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: input.type }), { expiresIn: 3600 });
    return { key, url };
  }),
  create: admin.input(z.object({ title: z.string().trim().min(1).max(120), description: z.string().max(2000), genre: z.string().max(40), year: z.number().min(1888).max(2100), duration: z.number().nonnegative(), videoKey: z.string().regex(/^cinestream\/videos\/[a-f0-9-]+\.mp4$/), posterKey: z.string().regex(/^cinestream\/posters\/[a-f0-9-]+\.(jpeg|png|webp)$/).nullable() })).handler(async ({ input }) => {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: input.videoKey }));
    if (head.ContentType !== 'video/mp4') throw new ORPCError('BAD_REQUEST', { message: 'Format vidéo incorrect.' });
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: input.videoKey, Range: 'bytes=0-31' }));
    const bytes = await object.Body!.transformToByteArray();
    if (new TextDecoder().decode(bytes.slice(4, 8)) !== 'ftyp') throw new ORPCError('BAD_REQUEST', { message: 'Ce fichier n’est pas un MP4 valide.' });
    if (input.posterKey) await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: input.posterKey }));
    const [row] = await db.insert(table).values({ ...input, id: crypto.randomUUID(), createdAt: Date.now() }).returning();
    return row;
  }),
  update: admin.input(z.object({
    id: z.string(), title: z.string().trim().min(1).max(120), description: z.string().max(2000),
    genre: z.string().min(1).max(40), year: z.number().int().min(1888).max(2100),
    duration: z.number().nonnegative().optional(),
    videoKey: z.string().regex(/^cinestream\/videos\/[a-f0-9-]+\.mp4$/).optional(),
    posterKey: z.string().regex(/^cinestream\/posters\/[a-f0-9-]+\.(jpeg|png|webp)$/).nullable().optional(),
  })).handler(async ({ input }) => {
    const [existing] = await db.select().from(table).where(eq(table.id, input.id));
    if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Film introuvable.' });
    if (input.videoKey) {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: input.videoKey }));
      if (head.ContentType !== 'video/mp4' || !head.ContentLength || head.ContentLength > 15 * 1024 ** 3) throw new ORPCError('BAD_REQUEST', { message: 'MP4 invalide ou supérieur à 15 Go.' });
      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: input.videoKey, Range: 'bytes=0-31' }));
      const bytes = await object.Body!.transformToByteArray();
      if (new TextDecoder().decode(bytes.slice(4, 8)) !== 'ftyp') throw new ORPCError('BAD_REQUEST', { message: 'Ce fichier n’est pas un MP4 valide.' });
    }
    if (input.posterKey) {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: input.posterKey }));
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(head.ContentType || '') || (head.ContentLength || 0) > 10 * 1024 ** 2) throw new ORPCError('BAD_REQUEST', { message: 'Affiche invalide.' });
    }
    const { id, duration, ...fields } = input;
    const [row] = await db.update(table).set({ ...fields, ...(input.videoKey ? { duration: duration ?? existing.duration } : {}) }).where(eq(table.id, id)).returning();
    return row;
  }),
  playback: base.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const [row] = await db.select().from(table).where(eq(table.id, input.id));
    if (!row) throw new ORPCError('NOT_FOUND');
    return { url: await signed(row.videoKey) };
  }),
  remove: admin.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    await db.delete(table).where(eq(table.id, input.id));
    return { ok: true };
  }),
};