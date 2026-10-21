import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useSaveEpisode, type Episode } from '../queries/series';
import { uploadMedia, validateMediaFile, videoDuration } from '../lib/media-upload';

export function EpisodeForm({ seasonId, seasonNumber, episode, nextNumber, onSaved, onCancel }: { seasonId: string; seasonNumber: number; episode: Episode | null; nextNumber: number; onSaved: () => void; onCancel: () => void }) {
  const save = useSaveEpisode();
  const [number, setNumber] = useState(episode?.number || nextNumber);
  const [title, setTitle] = useState(episode?.title || '');
  const [description, setDescription] = useState(episode?.description || '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  return <form className="upload-form episode-form" onSubmit={async e => {
    e.preventDefault(); setError('');
    if (!file && !episode) { setError('Sélectionnez le fichier MP4 de l’épisode.'); return; }
    setBusy(true); setProgress(0);
    try {
      let key: string | undefined; let duration = episode?.duration || 0;
      if (file) { setStatus('Vérification du MP4'); duration = await videoDuration(file); setStatus('Import de l’épisode'); key = await uploadMedia(file, true, setProgress); }
      setStatus('Publication de l’épisode');
      await save.mutateAsync({ seasonId, number, title, description, duration, ...(episode ? { id: episode.id } : {}), ...(key ? { videoKey: key } : {}) });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Import impossible.'); }
    finally { setBusy(false); }
  }}><div className="panel-title"><Upload size={21} /><div><h3>{episode ? 'Modifier un épisode' : 'Ajouter un épisode'}</h3><p>Saison {seasonNumber} · MP4 uniquement · 15 Go maximum</p></div>{episode && <button type="button" className="icon-btn" aria-label="Annuler la modification de l’épisode" disabled={busy} onClick={onCancel}><X size={18} /></button>}</div><fieldset disabled={busy}>
    <div className="form-row"><label>Numéro de l’épisode<input aria-label="Numéro de l’épisode" required type="number" min={1} max={9999} value={number} onChange={e => setNumber(+e.target.value)} /></label><label>Titre de l’épisode<input aria-label="Titre de l’épisode" required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="Le titre de l’épisode" /></label></div>
    <label>Description de l’épisode<textarea aria-label="Description de l’épisode" rows={3} maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Quelques mots, sans dévoiler la suite…" /></label>
    <label>{episode ? 'Remplacer le MP4 (facultatif)' : 'Fichier MP4 de l’épisode'}<input aria-label={episode ? 'Remplacer le MP4 (facultatif)' : 'Fichier MP4 de l’épisode'} type="file" accept="video/mp4,.mp4" required={!episode} onChange={e => {
      const selected = e.target.files?.[0]; if (!selected) { setFile(null); return; }
      try { validateMediaFile(selected, true); setFile(selected); setError(''); if (!title) setTitle(selected.name.replace(/\.mp4$/i, '').replace(/[_-]/g, ' ')); }
      catch (err) { e.target.value = ''; setFile(null); setError(err instanceof Error ? err.message : 'Fichier invalide.'); }
    }} /></label>{file && <p className="series-admin-note">{file.name} · {(file.size / 1024 ** 2).toFixed(1)} Mo</p>}
    <label className="rights-check"><input aria-label="Je détiens les droits de diffusion de cet épisode." type="checkbox" required={!episode} /><span>Je détiens les droits de diffusion de cet épisode.</span></label>
  </fieldset>{error && <div className="alert error" role="alert">{error}</div>}{busy && <div className="upload-progress"><div><span>{status}…</span><b>{progress}%</b></div><progress max={100} value={progress} /><small>Gardez cette page ouverte pendant l’import.</small></div>}<button className="btn primary publish" disabled={busy}>{busy ? <span className="spinner" /> : <Upload size={17} />}{busy ? 'Enregistrement en cours…' : episode ? 'Enregistrer l’épisode' : 'Importer et publier l’épisode'}</button></form>;
}