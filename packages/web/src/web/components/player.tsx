import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw } from 'lucide-react';
import { usePlayback, type Movie } from '../queries/movies';
import { useRecordView } from '../queries/top-five';
import { useEpisodePlayback } from '../queries/series';
import { readProgress, saveProgress } from '../lib/watch-progress';
const time = (n: number) => `${Math.floor(n / 60)}:${Math.floor(n % 60).toString().padStart(2, '0')}`;
export type PlayerMedia = Pick<Movie, 'id' | 'title' | 'duration' | 'videoKey'> & { kind?: 'movie' | 'episode' };
export function Player({ movie, close }: { movie: PlayerMedia; close: () => void }) {
  const movieQuery = usePlayback(movie.id, movie.kind !== 'episode');
  const episodeQuery = useEpisodePlayback(movie.id, movie.kind === 'episode');
  const query = movie.kind === 'episode' ? episodeQuery : movieQuery;
  const recordView = useRecordView();
  const video = useRef<HTMLVideoElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const viewReported = useRef(false);
  const latestPosition = useRef(readProgress(movie.id, movie.videoKey));
  const latestDuration = useRef(movie.duration);
  const persist = useCallback(() => {
    if (restored.current) saveProgress(movie.id, movie.videoKey, latestPosition.current, latestDuration.current);
  }, [movie.id, movie.videoKey]);
  useEffect(() => {
    const onHidden = () => { if (document.visibilityState === 'hidden') persist(); };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onHidden);
    return () => { persist(); window.removeEventListener('pagehide', persist); document.removeEventListener('visibilitychange', onHidden); };
  }, [persist]);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(latestPosition.current);
  const [duration, setDuration] = useState(movie.duration);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealControls = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControlsVisible(true);
    if (fullscreen && playing) hideTimer.current = setTimeout(() => setControlsVisible(false), 2500);
  };
  useEffect(() => {
    const changed = () => { const active = document.fullscreenElement === shell.current; setFullscreen(active); setControlsVisible(!active || !!video.current?.paused); };
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControlsVisible(!(fullscreen && playing && !error));
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [fullscreen, playing, error]);
  const toggle = () => { const v = video.current; if (!v) return; if (!v.paused) { v.pause(); return; } setError(''); setNeedsGesture(false); v.play().catch((err: DOMException) => { setPlaying(false); setWaiting(false); if (err.name === 'NotAllowedError') setNeedsGesture(true); else if (err.name !== 'AbortError') setError('La lecture a échoué. Réessayez ; si le problème persiste sur ce téléphone, le fichier 4K peut nécessiter une version 1080p.'); }); };
  const retry = async () => { setError(''); setWaiting(true); setPlaying(false); setNeedsGesture(false); persist(); restored.current = false; await query.refetch(); video.current?.load(); };
  const full = () => { if (document.fullscreenElement) void document.exitFullscreen(); else shell.current?.requestFullscreen().catch(() => setError('Le plein écran n’est pas autorisé par ce navigateur.')); };
  useEffect(() => {
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); return; } if ((e.target as HTMLElement).tagName === 'INPUT') return; if (e.key === 'Escape') close(); if (e.code === 'Space') { e.preventDefault(); toggle(); } if (e.key === 'f') full(); if (video.current && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); video.current.currentTime += e.key === 'ArrowLeft' ? -10 : 10; } };
    document.addEventListener('keydown', key); return () => { document.body.style.overflow = old; document.removeEventListener('keydown', key); };
  }, [close]);
  return <div className="modal" role="dialog" aria-modal="true" aria-label={`Lecture de ${movie.title}`} onContextMenu={e => e.preventDefault()}><div className={`player-shell ${fullscreen ? "is-fullscreen" : ""} ${fullscreen && !controlsVisible ? "controls-hidden" : ""}`} ref={shell} onPointerMove={e => { if (e.pointerType === "mouse") revealControls(); }} onKeyDown={revealControls}>
    <div className="player-heading" inert={fullscreen && !controlsVisible}><button autoFocus className="icon-btn" onClick={close} aria-label="Fermer le lecteur"><X /></button></div>
    <div className="video-stage" onClick={() => { if (!fullscreen) toggle(); else if (controlsVisible && playing) { setControlsVisible(false); if (hideTimer.current) clearTimeout(hideTimer.current); } else revealControls(); }}>
      {query.data && <video ref={video} src={query.data.url} preload="metadata" playsInline controlsList="nodownload noremoteplayback" draggable={false} onDragStart={e => e.preventDefault()} aria-label={`Vidéo ${movie.title}`} onTimeUpdate={() => { const v = video.current; if (!v || !restored.current) return; latestPosition.current = v.currentTime; latestDuration.current = v.duration; setCurrent(v.currentTime); persist(); }} onLoadedMetadata={() => {
        const v = video.current; if (!v) return;
        const total = Number.isFinite(v.duration) ? v.duration : movie.duration;
        latestDuration.current = total; setDuration(total);
        if (!restored.current) {
          const saved = readProgress(movie.id, movie.videoKey);
          const position = saved < total - 5 ? saved : 0;
          restored.current = true; latestPosition.current = position; setCurrent(position);
          if (position > 0) v.currentTime = position;
        }
        setWaiting(false);
      }} onPlay={() => { setPlaying(true); setNeedsGesture(false); if (!viewReported.current && movie.kind !== 'episode') { viewReported.current = true; try { let viewerId = localStorage.getItem('cine-viewer-id'); if (!viewerId || !/^[a-f0-9-]{36}$/i.test(viewerId)) { viewerId = crypto.randomUUID(); localStorage.setItem('cine-viewer-id', viewerId); } void recordView.mutateAsync({ movieId: movie.id, viewerId }).catch(() => { viewReported.current = false; }); } catch { viewReported.current = false; } } }} onPause={() => { setPlaying(false); persist(); }} onWaiting={() => setWaiting(true)} onCanPlay={() => setWaiting(false)} onEnded={() => { setPlaying(false); latestPosition.current = 0; saveProgress(movie.id, movie.videoKey, 0, latestDuration.current, true); }} onError={() => { setWaiting(false); setPlaying(false); const code = video.current?.error?.code; setError(code === 2 ? 'Le téléchargement de la vidéo a été interrompu. Vérifiez votre connexion et réessayez.' : code === 3 || code === 4 ? 'Ce téléphone ne parvient pas à décoder cette vidéo 4K. Une version 1080p peut être nécessaire.' : 'La vidéo est indisponible. Réessayez avec un nouveau lien de lecture.'); }} />}
      {(query.isLoading || (waiting && !error)) && <div className="stage-status"><span className="spinner" />Chargement de la vidéo…</div>}
      {(query.isError || error) && <div className="stage-status player-error"><p>{error || 'La vidéo est indisponible.'}</p><button className="btn secondary" onClick={e => { e.stopPropagation(); void retry(); }}>Réessayer</button></div>}
      {!playing && (!waiting || needsGesture) && !error && <button className="big-play" aria-label="Lancer la lecture" onClick={e => { e.stopPropagation(); toggle(); }}><Play fill="currentColor" /></button>}
    </div>
    <div className="player-controls" inert={fullscreen && !controlsVisible} onPointerDown={revealControls}><input aria-label="Position de lecture" type="range" min={0} max={duration || 1} step="0.1" value={current} onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value); }} /><div className="control-row">
      <button className="icon-btn" aria-label={playing ? 'Pause' : 'Lire'} onClick={toggle}>{playing ? <Pause /> : <Play />}</button>
      <button className="icon-btn" aria-label="Reculer de 10 secondes" onClick={() => { if (video.current) video.current.currentTime = Math.max(0, current - 10); }}><RotateCcw size={19} /></button>
      <button className="icon-btn" aria-label="Avancer de 10 secondes" onClick={() => { if (video.current) video.current.currentTime = Math.min(duration, current + 10); }}><RotateCw size={19} /></button>
      <button className="icon-btn" aria-label="Recommencer le film" title="Recommencer le film" onClick={() => { if (video.current) video.current.currentTime = 0; latestPosition.current = 0; setCurrent(0); persist(); }}><RotateCcw size={17} /><span style={{ fontSize: 9, marginLeft: 4 }}>0:00</span></button><span className="timestamp">{time(current)} <span>/ {time(duration)}</span></span><div className="control-spacer" />
      <button className="icon-btn" aria-label="Couper ou activer le son" onClick={() => { const val = volume ? 0 : 1; setVolume(val); if (video.current) video.current.volume = val; }}>{volume ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      <input className="volume" aria-label="Volume" type="range" min={0} max={1} step="0.05" value={volume} onChange={e => { setVolume(+e.target.value); if (video.current) video.current.volume = +e.target.value; }} />
      <select aria-label="Vitesse de lecture" defaultValue="1" onChange={e => { if (video.current) video.current.playbackRate = +e.target.value; }}>{[0.5, 1, 1.25, 1.5, 2].map(x => <option key={x} value={x}>{x}×</option>)}</select><button className="icon-btn" aria-label="Plein écran" onClick={full}><Maximize size={20} /></button>
    </div></div>
  </div></div>;
}