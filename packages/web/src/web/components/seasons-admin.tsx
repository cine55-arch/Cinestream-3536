import { useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useSeriesDetail, useSaveSeason, useRemoveSeason, useRemoveEpisode, type Episode, type Season } from '../queries/series';
import { EpisodeForm } from './series-episode-form';

export function SeasonsAdmin({ seriesId }: { seriesId: string }) {
  const query = useSeriesDetail(seriesId);
  const removeSeason = useRemoveSeason(); const removeEpisode = useRemoveEpisode();
  const [selectedId, setSelectedId] = useState('');
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [error, setError] = useState('');
  const season = query.data?.seasons.find(item => item.id === selectedId) || query.data?.seasons[0];
  const nextSeason = Math.max(0, ...(query.data?.seasons.map(item => item.number) || [])) + 1;
  return <section className="seasons-admin"><div className="panel-title"><Layers size={22} /><div><h2>Saisons et épisodes</h2><p>Organisez les épisodes avant de les publier.</p></div></div>
    {query.isLoading ? <p>Chargement des saisons…</p> : query.isError ? <div className="alert error">Impossible de charger les saisons.<button className="btn secondary" onClick={() => query.refetch()}>Réessayer</button></div> : <>
      <SeasonForm key={editingSeason?.id || `new-${nextSeason}`} seriesId={seriesId} season={editingSeason} nextNumber={nextSeason} onCancel={() => setEditingSeason(null)} onSaved={id => { setSelectedId(id); setEditingSeason(null); setEditingEpisode(null); }} />
      {season ? <><div className="admin-season-picker"><label>Saison à gérer<select aria-label="Saison à gérer" value={season.id} onChange={e => { setSelectedId(e.target.value); setEditingEpisode(null); setEditingSeason(null); }}>{query.data?.seasons.map(item => <option key={item.id} value={item.id}>Saison {item.number}{item.title ? ` — ${item.title}` : ''}</option>)}</select></label><button type="button" className="icon-btn" aria-label="Modifier la saison" onClick={() => setEditingSeason(season)}><Pencil size={17} /></button><button type="button" className="icon-btn delete" aria-label="Supprimer la saison" disabled={removeSeason.isPending} onClick={async () => {
        if (!confirm(`Supprimer la saison ${season.number} et tous ses épisodes ?`)) return;
        setError(''); try { await removeSeason.mutateAsync({ id: season.id }); setSelectedId(''); setEditingSeason(null); setEditingEpisode(null); } catch (err) { setError(err instanceof Error ? err.message : 'Suppression impossible.'); }
      }}><Trash2 size={17} /></button></div>
        <div className="admin-episode-list">{season.episodes.length ? season.episodes.map(episode => <div className="admin-episode-row" key={episode.id}><b>{String(episode.number).padStart(2, '0')}</b><div><strong>{episode.title}</strong><small>{Math.round(episode.duration / 60)} min · MP4</small></div><button type="button" className="icon-btn" aria-label={`Modifier l’épisode ${episode.title}`} onClick={() => setEditingEpisode(episode)}><Pencil size={17} /></button><button type="button" className="icon-btn delete" disabled={removeEpisode.isPending} aria-label={`Supprimer l’épisode ${episode.title}`} onClick={async () => {
          if (!confirm(`Retirer l’épisode « ${episode.title} » du catalogue ?`)) return;
          setError(''); try { await removeEpisode.mutateAsync({ id: episode.id }); if (editingEpisode?.id === episode.id) setEditingEpisode(null); } catch (err) { setError(err instanceof Error ? err.message : 'Suppression impossible.'); }
        }}><Trash2 size={17} /></button></div>) : <p className="series-admin-note">Cette saison n’a pas encore d’épisode. Importez le premier ci-dessous.</p>}</div>
        <EpisodeForm key={editingEpisode?.id || `${season.id}-new-${Math.max(0, ...season.episodes.map(item => item.number)) + 1}`} seasonId={season.id} seasonNumber={season.number} episode={editingEpisode} nextNumber={Math.max(0, ...season.episodes.map(item => item.number)) + 1} onSaved={() => setEditingEpisode(null)} onCancel={() => setEditingEpisode(null)} />
      </> : <p className="series-admin-note">Créez une première saison pour pouvoir importer ses épisodes.</p>}
    </>}{error && <div className="alert error" role="alert">{error}</div>}
  </section>;
}

function SeasonForm({ seriesId, season, nextNumber, onSaved, onCancel }: { seriesId: string; season: Season | null; nextNumber: number; onSaved: (id: string) => void; onCancel: () => void }) {
  const save = useSaveSeason();
  const [number, setNumber] = useState(season?.number || nextNumber);
  const [title, setTitle] = useState(season?.title || '');
  const [error, setError] = useState('');
  return <form className="season-form" onSubmit={async e => {
    e.preventDefault(); setError('');
    try { const result = await save.mutateAsync({ seriesId, number, title, ...(season ? { id: season.id } : {}) }); onSaved(result.id); }
    catch (err) { setError(err instanceof Error ? err.message : 'Enregistrement impossible.'); }
  }}><h3>{season ? 'Modifier la saison' : 'Ajouter une saison'}</h3><fieldset disabled={save.isPending}><label>Numéro de saison<input aria-label="Numéro de saison" type="number" required min={1} max={999} value={number} onChange={e => setNumber(+e.target.value)} /></label><label>Nom de la saison (facultatif)<input aria-label="Nom de la saison (facultatif)" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. : Les origines" /></label><button className="btn secondary" disabled={save.isPending}><Plus size={16} />{save.isPending ? 'Enregistrement…' : season ? 'Enregistrer la saison' : 'Ajouter la saison'}</button>{season && <button type="button" className="btn secondary" onClick={onCancel}>Annuler</button>}</fieldset>{error && <div className="alert error" role="alert">{error}</div>}</form>;
}