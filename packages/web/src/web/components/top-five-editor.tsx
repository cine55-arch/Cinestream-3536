import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Trophy } from 'lucide-react';
import { useSaveTopFive, useTopFive } from '../queries/top-five';
import type { Movie } from '../queries/movies';

export function TopFiveEditor({ movies }: { movies: Movie[] }) {
  const query = useTopFive();
  const save = useSaveTopFive();
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic');
  const [selected, setSelected] = useState<string[]>([]);
  const [nextId, setNextId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (query.data) { setMode(query.data.mode); setSelected(query.data.manualIds); }
  }, [query.data]);
  const filmById = new Map(movies.map(movie => [movie.id, movie]));
  const available = movies.filter(movie => !selected.includes(movie.id));
  const choose = (id: string) => { if (!id || selected.length >= 5) return; setSelected([...selected, id]); setNextId(''); setMessage(''); };
  const move = (index: number, direction: number) => {
    const next = [...selected]; const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    setSelected(next); setMessage('');
  };
  return <section className="top-admin" aria-label="Configurer le Top 5">
    <div className="top-admin-heading"><div className="top-admin-icon"><Trophy size={22} /></div><div><span className="eyebrow muted">VOTRE SÉLECTION</span><h2>Le Top 5</h2><p>Choisissez comment les films sont classés sur l’accueil.</p></div></div>
    {query.isLoading ? <p className="top-admin-loading">Chargement du classement…</p> : query.isError ? <div className="alert error">Le classement est indisponible. <button className="btn secondary" onClick={() => query.refetch()}>Réessayer</button></div> : <>
      <fieldset className="top-mode"><legend className="sr-only">Mode du classement</legend>
        <button type="button" className={mode === 'automatic' ? 'active' : ''} aria-pressed={mode === 'automatic'} onClick={() => { setMode('automatic'); setMessage(''); }}><strong>Automatique</strong><span>Les films les plus regardés</span></button>
        <button type="button" className={mode === 'manual' ? 'active' : ''} aria-pressed={mode === 'manual'} onClick={() => { setMode('manual'); setMessage(''); }}><strong>Manuel</strong><span>Votre sélection, dans votre ordre</span></button>
      </fieldset>
      {mode === 'automatic' ? <div className="top-auto"><p>Une vue est comptée lorsque la lecture démarre, une fois par film et par navigateur chaque jour.</p><ol>{(query.data?.ids || []).map((id, index) => <li key={id}><b>{String(index + 1).padStart(2, '0')}</b><span>{filmById.get(id)?.title || 'Film retiré'}</span><small>{query.data?.views[id] || 0} vue{(query.data?.views[id] || 0) !== 1 ? 's' : ''}</small></li>)}</ol>{!movies.length && <p>Ajoutez des films pour voir apparaître le classement.</p>}</div> : <div className="top-manual"><p>Ajoutez jusqu’à cinq films et déplacez-les pour définir leur place.</p><ol>{selected.map((id, index) => <li key={id}><b>{String(index + 1).padStart(2, '0')}</b><span>{filmById.get(id)?.title || 'Film retiré'}</span><div className="top-row-actions"><button type="button" disabled={index === 0} aria-label={`Monter ${filmById.get(id)?.title || 'le film'}`} onClick={() => move(index, -1)}><ArrowUp size={17} /></button><button type="button" disabled={index === selected.length - 1} aria-label={`Descendre ${filmById.get(id)?.title || 'le film'}`} onClick={() => move(index, 1)}><ArrowDown size={17} /></button><button type="button" aria-label={`Retirer ${filmById.get(id)?.title || 'le film'} du Top 5`} onClick={() => { setSelected(selected.filter(item => item !== id)); setMessage(''); }}><Trash2 size={17} /></button></div></li>)}</ol>{selected.length < 5 && available.length > 0 && <div className="top-add"><select aria-label="Film à ajouter au Top 5" value={nextId} onChange={e => setNextId(e.target.value)}><option value="">Choisir un film…</option>{available.map(movie => <option value={movie.id} key={movie.id}>{movie.title}</option>)}</select><button type="button" className="btn secondary" disabled={!nextId} onClick={() => choose(nextId)}><Plus size={17} />Ajouter</button></div>}{selected.length === 0 && <small>Aucun film sélectionné : le bloc Top 5 ne s’affichera pas.</small>}</div>}
      {error && <div className="alert error" role="alert">{error}</div>}{message && <div className="alert success" role="status">{message}</div>}
      <button type="button" className="btn primary top-save" disabled={save.isPending} onClick={async () => { setError(''); setMessage(''); try { await save.mutateAsync({ mode, manualIds: selected.filter(id => filmById.has(id)) }); setMessage('Le Top 5 a été enregistré.'); } catch (err) { setError(err instanceof Error ? err.message : 'Impossible d’enregistrer le Top 5.'); } }}>{save.isPending ? 'Enregistrement…' : 'Enregistrer le Top 5'}</button>
    </>}
  </section>;
}