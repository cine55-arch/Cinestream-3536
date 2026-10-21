import { useState } from 'react';
import { Pencil, Plus, Trash2, Tv } from 'lucide-react';
import { Link } from 'wouter';
import { useCreateSeries, useUpdateSeries, useRemoveSeries, useSeries, type Series } from '../queries/series';
import { uploadMedia, validateMediaFile } from '../lib/media-upload';
import { SeasonsAdmin } from './seasons-admin';

export function SeriesAdmin() {
  const query = useSeries();
  const remove = useRemoveSeries();
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const selected = query.data?.find(show => show.id === selectedId);
  return <section aria-label="Gestion des séries" className="series-admin-grid">
    <aside className="library-panel series-library"><div className="panel-title"><Tv size={23} /><div><h2>Vos séries</h2><p>Une série, plusieurs saisons, tous vos épisodes.</p></div></div><button className="btn primary" onClick={() => setSelectedId('')}><Plus size={17} />Nouvelle série</button>
      {query.isLoading ? <p className="series-admin-note">Chargement des séries…</p> : query.isError ? <div className="alert error">Les séries sont indisponibles.<button className="btn secondary" onClick={() => query.refetch()}>Réessayer</button></div> : !query.data?.length ? <div className="library-empty"><Tv size={34} /><h3>Votre première série commence ici.</h3><p>Créez sa fiche, puis ajoutez ses saisons.</p></div> : <div className="series-library-list">{query.data.map(show => <div className={`series-library-row ${selectedId === show.id ? 'active' : ''}`} key={show.id}><button className="series-select" onClick={() => setSelectedId(show.id)}><img src={show.poster || '/images/night.jpg'} alt="" /><span><strong>{show.title}</strong><small>{show.seasonCount} saison{show.seasonCount !== 1 ? 's' : ''} · {show.episodeCount} épisode{show.episodeCount !== 1 ? 's' : ''}</small></span><Pencil size={15} /></button><button className="icon-btn delete" disabled={remove.isPending} aria-label={`Supprimer la série ${show.title}`} onClick={async () => {
        if (!confirm(`Supprimer « ${show.title} », toutes ses saisons et tous ses épisodes du catalogue ?`)) return;
        setError(''); try { await remove.mutateAsync({ id: show.id }); if (selectedId === show.id) setSelectedId(''); } catch (err) { setError(err instanceof Error ? err.message : 'Suppression impossible.'); }
      }}><Trash2 size={16} /></button></div>)}</div>}{error && <div className="alert error" role="alert">{error}</div>}
    </aside>
    <div className="series-admin-workspace"><SeriesForm key={selected?.id || 'new'} show={selected} onSaved={setSelectedId} />{selected && <><Link className="series-preview-link" href={`/series/${selected.id}`}>Voir la série sur le site →</Link><SeasonsAdmin key={selected.id} seriesId={selected.id} /></>}</div>
  </section>;
}

function SeriesForm({ show, onSaved }: { show?: Series; onSaved: (id: string) => void }) {
  const create = useCreateSeries(); const update = useUpdateSeries();
  const [title, setTitle] = useState(show?.title || '');
  const [description, setDescription] = useState(show?.description || '');
  const [genre, setGenre] = useState(show?.genre || 'Drame');
  const [year, setYear] = useState(show?.year || new Date().getFullYear());
  const [poster, setPoster] = useState<File | null>(null);
  const [removePoster, setRemovePoster] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  return <form className="upload-form series-metadata-form" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const posterKey = poster ? await uploadMedia(poster, false) : removePoster ? null : show?.posterKey || null;
      const fields = { title, description, genre, year, posterKey };
      const result = show ? await update.mutateAsync({ ...fields, id: show.id }) : await create.mutateAsync(fields);
      setMessage('La fiche de la série a été enregistrée.'); onSaved(result.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }}><div className="panel-title"><Tv size={22} /><div><h2>{show ? 'Modifier la série' : 'Créer une série'}</h2><p>{show ? 'La fiche présentée à vos spectateurs.' : 'Commencez par la fiche, puis ajoutez les saisons et les épisodes.'}</p></div></div><fieldset disabled={busy}>
    <label>Titre de la série<input aria-label="Titre de la série" required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Le titre de votre série" /></label>
    <div className="form-row"><label>Genre<select aria-label="Genre de la série" value={genre} onChange={e => setGenre(e.target.value)}>{['Action', 'Aventure', 'Science-fiction', 'Drame', 'Comédie', 'Documentaire', 'Animation', 'Thriller', 'Horreur'].map(value => <option key={value}>{value}</option>)}</select></label><label>Année de début<input aria-label="Année de début" required type="number" min={1888} max={2100} value={year} onChange={e => setYear(+e.target.value)} /></label></div>
    <label>Description de la série<textarea aria-label="Description de la série" rows={4} maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Le point de départ de l’histoire…" /></label>
    <label>Affiche de la série<input aria-label="Affiche de la série" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (!file) return; try { validateMediaFile(file, false); setPoster(file); setRemovePoster(false); setError(''); } catch (err) { e.target.value = ''; setError(err instanceof Error ? err.message : 'Affiche invalide.'); } }} /></label>
    {show?.poster && !poster && !removePoster && <div className="current-poster"><img src={show.poster} alt="Affiche actuelle de la série" /><button type="button" className="btn secondary" onClick={() => setRemovePoster(true)}>Retirer l’affiche</button></div>}
    {removePoster && <button type="button" className="btn secondary" onClick={() => setRemovePoster(false)}>Conserver l’affiche</button>}
  </fieldset>{error && <div className="alert error" role="alert">{error}</div>}{message && <output className="alert success">{message}</output>}<button className="btn primary publish" disabled={busy}>{busy ? 'Enregistrement…' : show ? 'Enregistrer la série' : 'Créer la série'}</button></form>;
}