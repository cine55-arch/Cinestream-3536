import { client } from './api';

export function validateMediaFile(file: File, video: boolean) {
  if (video && (!file.name.toLowerCase().endsWith('.mp4') || (file.type && file.type !== 'video/mp4'))) throw new Error('Les épisodes doivent être au format MP4.');
  if (video && file.size > 15 * 1024 ** 3) throw new Error('Limite : 15 Go par épisode.');
  if (!video && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 ** 2)) throw new Error('Affiche : JPG, PNG ou WebP, 10 Mo maximum.');
}

export async function uploadMedia(file: File, video: boolean, onProgress: (n: number) => void = () => {}) {
  validateMediaFile(file, video);
  const type = video ? 'video/mp4' : file.type as 'image/jpeg' | 'image/png' | 'image/webp';
  const signed = await client.movies.presign({ name: file.name, type, size: file.size });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signed.url); xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Le stockage a refusé le fichier. Réessayez.'));
    xhr.onerror = () => reject(new Error('Import interrompu. Vérifiez votre connexion.'));
    xhr.send(file);
  });
  return signed.key;
}

export function videoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const finish = () => { video.onloadedmetadata = null; video.onerror = null; URL.revokeObjectURL(url); video.removeAttribute('src'); video.load(); clearTimeout(timer); };
    const timer = setTimeout(() => { finish(); reject(new Error('Impossible de lire les informations de ce MP4.')); }, 20000);
    video.preload = 'metadata'; video.src = url;
    video.onloadedmetadata = () => { const seconds = video.duration; finish(); if (Number.isFinite(seconds) && seconds > 0) resolve(Math.round(seconds)); else reject(new Error('La durée de ce MP4 est invalide.')); };
    video.onerror = () => { finish(); reject(new Error('Ce MP4 n’est pas lisible. Privilégiez H.264/AAC.')); };
  });
}