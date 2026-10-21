const key = (id: string, videoKey: string) => `cinestream.progress:${id}:${videoKey}`;
export function readProgress(id: string, videoKey: string): number {
  try {
    const value = Number(localStorage.getItem(key(id, videoKey)) || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch { return 0; }
}
export function saveProgress(id: string, videoKey: string, position: number, duration: number, ended = false) {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
  try {
    if (ended || position <= 0 || position >= duration - 5) localStorage.removeItem(key(id, videoKey));
    else localStorage.setItem(key(id, videoKey), String(position));
  } catch { /* Playback still works when browser storage is unavailable. */ }
}