import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ORPCError } from '@orpc/server';

const storage = new S3Client({
  region: 'auto', endpoint: process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
});
const bucket = process.env.S3_BUCKET!;

export const signMedia = (key: string) => getSignedUrl(storage, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 86400 });

export async function validatePoster(key?: string | null) {
  if (!key) return;
  const head = await storage.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(head.ContentType || '') || (head.ContentLength || 0) > 10 * 1024 ** 2) {
    throw new ORPCError('BAD_REQUEST', { message: 'Affiche invalide : JPG, PNG ou WebP, 10 Mo maximum.' });
  }
}

export async function validateEpisodeVideo(key: string) {
  const head = await storage.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (head.ContentType !== 'video/mp4' || !head.ContentLength || head.ContentLength > 15 * 1024 ** 3) {
    throw new ORPCError('BAD_REQUEST', { message: 'Épisode invalide : MP4 uniquement, 15 Go maximum.' });
  }
  const object = await storage.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-31' }));
  const bytes = await object.Body!.transformToByteArray();
  if (new TextDecoder().decode(bytes.slice(4, 8)) !== 'ftyp') {
    throw new ORPCError('BAD_REQUEST', { message: 'Ce fichier n’est pas un MP4 valide.' });
  }
}