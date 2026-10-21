import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Play, Plus, Check, Film, X, SlidersHorizontal, Bookmark } from 'lucide-react';
import { Header } from '../components/header';
import { Player } from '../components/player';
import { TopFiveStrip } from '../components/top-five-strip';
import { useMovies, type Movie } from '../queries/movies';
const genres = ['Tous les films', 'Action', 'Aventure', 'Science-fiction', 'Drame', 'Comédie', 'Documentaire'];
const previews = [
  { title: 'DUNE', subtitle: 'L’APPEL DU DÉSERT', image: '/images/hero.jpg', genre: 'Aventure', style: 'sand' },
  { title: 'NOCTURNE', subtitle: 'AU-DELÀ DU SILENCE', image: '/images/night.jpg', genre: 'Drame', style: 'blue' },
  { title: 'HORIZON', subtitle: 'VERS L’INCONNU', image: '/images/dunes.jpg', genre: 'Science-fiction', style: 'orange' },
  { title: 'IMMERSION', subtitle: 'LE MONDE AUTREMENT', image: '/images/night.jpg', genre: 'Documentaire', style: 'green' },
  { title: 'ÉCHAPPÉE', subtitle: 'RIEN NE NOUS ARRÊTE', image: '/images/hero.jpg', genre: 'Action', style: 'warm' },
];
export default function Catalog() {
  const query = useMovies();
  const [tab, setTab] = useState(new URLSearchParams(location.search).has('saved') ? 'saved' : 'all');
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('Tous les films');
  const [sort, setSort] = useState('recent');
  const [player, setPlayer] = useState<Movie | null>(null);
  const [details, setDetails] = useState<Movie | null>(null);
  const [saved, setSaved] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('cine-saved') || '[]'); } catch { return []; } });
  const toggleSave = (id: string) => { const next = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id]; setSaved(next); localStorage.setItem('cine-saved', JSON.stringify(next)); };
  const movies = query.data || [];
  const featured = movies[0];
  const filtered = movies.filter(m => (tab !== 'saved' || saved.includes(m.id)) && (genre === 'Tous les films' || genre === m.genre) && m.title.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title) : b.createdAt - a.createdAt);
  return <><Header tab={tab} setTab={setTab} search={search} setSearch={setSearch} />
    <main><section className="hero" style={{ backgroundImage: `url('${featured?.poster || '/images/hero.jpg'}')` }}>
      <div className="hero-shade" /><div className="hero-content"><div className="eyebrow"><span />{featured ? 'À LA UNE' : 'LE CINÉMA, SANS COMPROMIS'}</div>
        <h1>{featured ? featured.title : <>Les grandes histoires.<br /><em>À portée de play.</em></>}</h1>
        <div className="hero-meta">{featured ? <>{featured.year > 0 && <><span>{featured.year}</span><i /></>}{featured.genre}<i />{Math.round(featured.duration / 60)} min</> : <><span>Votre cinéma à la maison</span><i /><span className="quality">MP4</span><span>Une expérience immersive</span></>}</div>
        <p>{featured ? featured.description || 'Installez-vous et profitez du film.' : 'Une seule envie : se laisser emporter. Retrouvez vos films, lancez la lecture et faites place au cinéma.'}</p>
        <div className="hero-actions">{featured ? <><button className="btn primary" onClick={() => setPlayer(featured)}><Play size={18} fill="currentColor" />Regarder maintenant</button><button className="btn secondary" onClick={() => setDetails(featured)}>Plus d’infos<ArrowRight size={17} /></button></> : <><a className="btn primary" href="#catalogue"><Play size={18} fill="currentColor" />Explorer le catalogue</a><Link className="btn secondary" href="/admin"><Plus size={18} />Ajouter un film</Link></>}</div>
        <div className="hero-note"><span className="red-line" />{featured ? 'VOTRE SÉLECTION • À REGARDER MAINTENANT' : 'VOS FILMS. VOTRE ÉCRAN. VOTRE MOMENT.'}</div>
      </div><div className="hero-side">CINÉSTREAM — L’EXPÉRIENCE CINÉMA</div><div className="hero-pagination"><b>01</b><span />{featured ? String(movies.length).padStart(2, '0') : '01'}</div>
    </section>
    {tab === 'all' && <TopFiveStrip movies={movies} onPlay={setPlayer} onDetails={setDetails} />}
    <section id="catalogue" className="catalog"><div className="section-heading"><div><div className="eyebrow muted">UNE HISTOIRE VOUS ATTEND</div><h2>{tab === 'saved' ? 'Ma liste' : 'À l’affiche'}<span>{tab === 'saved' ? filtered.length : movies.length} film{movies.length !== 1 ? 's' : ''}</span></h2></div><label className="sort"><SlidersHorizontal size={16} /><select aria-label="Trier les films" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Ajouts récents</option><option value="az">Titre : A–Z</option></select></label></div>
      <div className="filters">{genres.map(g => <button key={g} className={genre === g ? 'selected' : ''} onClick={() => setGenre(g)}>{g}</button>)}</div>
      {query.isLoading ? <div className="posters">{[1, 2, 3, 4, 5].map(n => <div className="poster skeleton" key={n} />)}</div> : query.isError ? <div className="empty-state"><Film /><h3>Le catalogue est indisponible</h3><button className="btn secondary" onClick={() => query.refetch()}>Réessayer</button></div> : movies.length === 0 && tab === 'all' && !search ? <>
        <div className="preview-note"><span className="status-dot" /><span>Le décor est prêt. Ajoutez votre premier film pour lancer la séance.</span><Link href="/admin">Importer un MP4 <ArrowRight size={14} /></Link></div>
        <div className="posters preview-posters">{previews.filter(p => genre === 'Tous les films' || genre === p.genre).map((p, i) => <div className="movie-card" key={p.title}><div className={`poster ${p.style}`}><img src={p.image} alt="Paysage cinématographique d’illustration" /><span className="preview-tag">APERÇU VISUEL</span><div className="poster-type"><small>{p.subtitle}</small><strong>{p.title}</strong><span>UNE NOUVELLE HISTOIRE VOUS ATTEND</span></div><span className="poster-number">0{i + 1}</span></div><div className="card-caption"><h3>{p.title.charAt(0) + p.title.slice(1).toLowerCase()}</h3><span>{p.genre}<i />Illustration</span></div></div>)}</div></> : filtered.length ? <div className="posters">{filtered.map(m => <div className="movie-card" key={m.id}><div className="poster"><img src={m.poster || '/images/hero.jpg'} alt={`Affiche de ${m.title}`} /><span className="preview-tag">MP4</span><button className="poster-watch" aria-label={`Regarder ${m.title}`} onClick={() => setPlayer(m)}><Play fill="currentColor" /></button><button className="save-btn" aria-label={saved.includes(m.id) ? 'Retirer de ma liste' : 'Ajouter à ma liste'} onClick={() => toggleSave(m.id)}>{saved.includes(m.id) ? <Check size={17} /> : <Plus size={17} />}</button>{!m.poster && <div className="poster-type"><strong>{m.title}</strong></div>}</div><button className="card-caption" onClick={() => setDetails(m)}><h3>{m.title}</h3><span>{m.year > 0 && <>{m.year}<i /></>}{m.genre}<i />{Math.round(m.duration / 60)} min</span></button></div>)}</div> : <div className="empty-state"><Bookmark /><h3>{tab === 'saved' ? 'Votre prochaine séance commence ici' : 'Aucun film trouvé'}</h3><p>{tab === 'saved' ? 'Ajoutez des films avec le bouton + pour les retrouver ici.' : 'Essayez un autre titre ou une autre catégorie.'}</p><button className="btn secondary" onClick={() => { setGenre('Tous les films'); setSearch(''); setTab('all'); }}>Voir tous les films</button></div>}
    </section><section className="cinema-strip"><Film size={25} /><div><h3>Le cinéma, simplement.</h3><p>Un lecteur pensé pour vos films. Aucune distraction, juste l’histoire.</p></div><div className="strip-tags"><span>MP4 uniquement</span><span>Plein écran</span><span>À votre rythme</span></div></section></main>
    <footer><span>CINÉSTREAM<span className="footer-dot">.</span></span><p>Votre collection. Votre cinéma.</p><small>Diffusez uniquement les films dont vous détenez les droits.</small><Link href="/admin">Espace admin <ArrowRight size={13} /></Link></footer>
    {player && <Player movie={player} close={() => setPlayer(null)} />}
    {details && <div className="modal" role="dialog" aria-modal="true" aria-label="Détails du film"><div className="detail-panel"><button className="icon-btn close-detail" onClick={() => setDetails(null)} aria-label="Fermer"><X /></button><img src={details.poster || '/images/hero.jpg'} alt="" /><div className="detail-copy"><div className="eyebrow">{details.genre}{details.year > 0 ? ` · ${details.year}` : ""}</div><h2>{details.title}</h2><p>{details.description || 'Aucune description pour ce film.'}</p><button className="btn primary" onClick={() => { setPlayer(details); setDetails(null); }}><Play size={17} fill="currentColor" />Regarder le film</button></div></div></div>}
  </>;
}