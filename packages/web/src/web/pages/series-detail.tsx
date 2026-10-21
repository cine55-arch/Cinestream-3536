import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Play, Tv } from 'lucide-react';
import { Header } from '../components/header';
import { Player, type PlayerMedia } from '../components/player';
import { useSeriesDetail } from '../queries/series';
import { readProgress } from '../lib/watch-progress';

export default function SeriesDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const query = useSeriesDetail(id);
  const [seasonId, setSeasonId] = useState('');
  const [playing, setPlaying] = useState<PlayerMedia | null>(null);
  const show = query.data;
  const season = show?.seasons.find(item => item.id === seasonId) || show?.seasons[0];
  return <><Header tab="series" /><main className="series-detail-page">
    <Link href="/series" className="series-back"><ArrowLeft size={16} />Toutes les séries</Link>
    {query.isLoading ? <div className="auth-loading"><span className="spinner" />Chargement de la série…</div> : query.isError || !show ? <div className="empty-state"><Tv /><h1>Série indisponible</h1><p>Cette série n’existe plus ou ne peut pas être chargée.</p><button className="btn secondary" onClick={() => query.refetch()}>Réessayer</button></div> : <>
      <section className="show-overview"><div className="show-poster"><img src={show.poster || '/images/night.jpg'} alt={`Affiche de ${show.title}`} /></div><div className="show-copy"><div className="eyebrow"><span />UNE SÉRIE CINÉSTREAM</div><h1>{show.title}</h1><div className="hero-meta">{show.year}<i />{show.genre}<i />{show.seasons.length} saison{show.seasons.length !== 1 ? 's' : ''}</div><p>{show.description || 'Découvrez cette série, épisode après épisode.'}</p><a href="#episodes" className="btn primary"><Play size={17} fill="currentColor" />Choisir un épisode</a></div></section>
      <section id="episodes" className="episode-section"><div className="episode-section-head"><div><div className="eyebrow muted">LA SUITE VOUS ATTEND</div><h2>Les épisodes<span>.</span></h2></div>{show.seasons.length > 0 && <label className="season-picker">Saison<select aria-label="Choisir une saison" value={season?.id || ''} onChange={e => setSeasonId(e.target.value)}>{show.seasons.map(item => <option key={item.id} value={item.id}>Saison {item.number}{item.title ? ` — ${item.title}` : ''}</option>)}</select></label>}</div>
        {!season ? <div className="series-empty"><Tv size={30} /><h3>Les saisons arrivent bientôt.</h3><p>Aucune saison n’a encore été ajoutée à cette série.</p></div> : !season.episodes.length ? <div className="series-empty"><Tv size={30} /><h3>Cette saison se prépare.</h3><p>Les épisodes apparaîtront ici dès leur publication.</p></div> : <div className="episode-list">{season.episodes.map(episode => {
          const progress = readProgress(episode.id, episode.videoKey);
          return <article className="episode-row" key={episode.id}><span className="episode-number">{String(episode.number).padStart(2, '0')}</span><div className="episode-copy"><small>SAISON {season.number} · ÉPISODE {episode.number}</small><h3>{episode.title}</h3>{episode.description && <p>{episode.description}</p>}<span>{Math.round(episode.duration / 60)} min{progress > 5 ? ` · Reprendre à ${Math.floor(progress / 60)}:${String(Math.floor(progress % 60)).padStart(2, '0')}` : ''}</span></div><button className="btn secondary" aria-label={`${progress > 5 ? 'Reprendre' : 'Regarder'} ${episode.title}`} onClick={() => setPlaying({ ...episode, title: `${show.title} — S${season.number} E${episode.number} : ${episode.title}`, kind: 'episode' })}><Play size={17} fill="currentColor" /><span>{progress > 5 ? 'Reprendre' : 'Regarder'}</span></button></article>;
        })}</div>}
      </section>
    </>}
  </main>{playing && <Player key={playing.id} movie={playing} close={() => setPlaying(null)} />}</>;
}