import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Search, Tv } from 'lucide-react';
import { Header } from '../components/header';
import { useSeries } from '../queries/series';

export default function SeriesCatalog() {
  const query = useSeries();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('Tous les genres');
  const shows = query.data || [];
  const genres = ['Tous les genres', ...new Set(shows.map(show => show.genre))];
  const filtered = shows.filter(show => show.title.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')) && (genre === 'Tous les genres' || show.genre === genre));
  return <><Header tab="series" search={search} setSearch={setSearch} /><main className="series-page">
    <section className="series-intro"><div><div className="eyebrow"><span />UN ÉPISODE NE SUFFIT JAMAIS</div><h1>La suite de<br />vos <em>soirées.</em></h1><p>Des histoires qui prennent leur temps. Retrouvez vos séries, saison après saison.</p></div><span className="series-intro-mark" aria-hidden="true">SÉ<br />RIES<span>.</span></span></section>
    <section aria-label="Catalogue des séries" className="series-catalog"><div className="section-heading"><div><div className="eyebrow muted">À SUIVRE, SANS MODÉRATION</div><h2>Les séries<span>{shows.length} série{shows.length !== 1 ? 's' : ''}</span></h2></div></div>
      <label className="series-mobile-search"><Search size={17} /><input aria-label="Rechercher une série dans le catalogue" placeholder="Rechercher une série…" value={search} onChange={e => setSearch(e.target.value)} /></label>
      {shows.length > 0 && <div className="filters">{genres.map(item => <button key={item} className={genre === item ? 'selected' : ''} onClick={() => setGenre(item)}>{item}</button>)}</div>}
      {query.isLoading ? <div className="posters">{[1, 2, 3, 4, 5].map(n => <div className="poster skeleton" key={n} />)}</div> : query.isError ? <div className="empty-state"><Tv /><h2>Les séries sont indisponibles</h2><button className="btn secondary" onClick={() => query.refetch()}>Réessayer</button></div> : !shows.length ? <div className="series-empty"><Tv size={37} /><h2>La première histoire reste à écrire.</h2><p>Ajoutez une série, créez ses saisons et importez vos épisodes depuis l’administration.</p><Link href="/admin?section=series" className="btn primary">Ajouter une série<ArrowRight size={16} /></Link></div> : filtered.length ? <div className="posters">{filtered.map(show => <Link href={`/series/${show.id}`} className="movie-card series-card" key={show.id}><div className="poster"><img src={show.poster || '/images/night.jpg'} alt={`Affiche de ${show.title}`} loading="lazy" /><span className="preview-tag">SÉRIE</span>{!show.poster && <div className="poster-type"><strong>{show.title}</strong></div>}<div className="series-card-action">Voir les épisodes<ArrowRight size={17} /></div></div><div className="card-caption"><h3>{show.title}</h3><span>{show.year}<i />{show.genre}</span><small>{show.seasonCount} saison{show.seasonCount !== 1 ? 's' : ''} · {show.episodeCount} épisode{show.episodeCount !== 1 ? 's' : ''}</small></div></Link>)}</div> : <div className="empty-state"><Search /><h2>Aucune série trouvée</h2><p>Essayez un autre titre ou un autre genre.</p><button className="btn secondary" onClick={() => { setSearch(''); setGenre('Tous les genres'); }}>Voir toutes les séries</button></div>}
    </section>
  </main><footer><span>CINÉSTREAM<span className="footer-dot">.</span></span><p>Une saison. Mille émotions.</p><Link href="/">Retrouver les films<ArrowRight size={13} /></Link></footer></>;
}