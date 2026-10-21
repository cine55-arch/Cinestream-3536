import { Play, ArrowUpRight } from 'lucide-react';
import type { Movie } from '../queries/movies';
import { useTopFive } from '../queries/top-five';

export function TopFiveStrip({ movies, onPlay, onDetails }: { movies: Movie[]; onPlay: (movie: Movie) => void; onDetails: (movie: Movie) => void }) {
  const query = useTopFive();
  const films = (query.data?.ids || []).map(id => movies.find(movie => movie.id === id)).filter((movie): movie is Movie => !!movie);
  if (query.isError || !films.length) return null;
  return <section className="top-strip" aria-labelledby="top-five-title"><div className="top-strip-head"><div><div className="eyebrow muted">LA SÉLECTION CINÉSTREAM</div><h2 id="top-five-title">Le Top <em>5.</em></h2></div><span>{query.data?.mode === 'automatic' ? 'LES PLUS REGARDÉS' : 'CHOISIS POUR VOUS'}</span></div><div className="top-strip-list">{films.map((movie, index) => <article className="top-film" key={movie.id}><div className="top-art"><span className="top-rank" aria-label={`Numéro ${index + 1}`}>{index + 1}</span><img src={movie.poster || '/images/hero.jpg'} alt={`Affiche de ${movie.title}`} loading="lazy" /><button onClick={() => onPlay(movie)} aria-label={`Regarder ${movie.title}`} className="top-play"><Play size={21} fill="currentColor" /></button></div><button className="top-film-info" onClick={() => onDetails(movie)}><strong>{movie.title}</strong><span>{movie.genre}{movie.year > 0 ? ` · ${movie.year}` : ''} <ArrowUpRight size={14} /></span></button></article>)}</div></section>;
}