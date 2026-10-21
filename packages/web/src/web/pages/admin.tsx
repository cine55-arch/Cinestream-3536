import { useState, useRef } from 'react';
import { Upload, Film, ShieldCheck, ArrowLeft, LogOut, Trash2, ImagePlus, CheckCircle2, LockKeyhole, Play, Pencil, X } from 'lucide-react';
import { Link } from 'wouter';
import { Brand } from '../components/header';
import { TopFiveEditor } from '../components/top-five-editor';
import { SeriesAdmin } from '../components/series-admin';
import { authClient, captureEmailToken, clearEmailToken } from '../lib/auth';
import { client } from '../lib/api';
import { useAccess, useMovies, useCreateMovie, useRemoveMovie, useUpdateMovie, type Movie } from '../queries/movies';
function uploadToStorage(file: File, url: string, type: string, progress: (n: number) => void) {
  return new Promise<void>((resolve, reject) => { const xhr = new XMLHttpRequest(); xhr.open('PUT', url); xhr.setRequestHeader('Content-Type', type); xhr.upload.onprogress = e => { if (e.lengthComputable) progress(Math.round(e.loaded / e.total * 100)); }; xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Le stockage a refusé le fichier. Réessayez.')); xhr.onerror = () => reject(new Error('Import interrompu. Vérifiez votre connexion.')); xhr.send(file); });
}
export default function Admin() {
  const { data: session, isPending } = authClient.useSession();
  const access = useAccess(!!session);
  const query = useMovies();
  const create = useCreateMovie();
  const remove = useRemoveMovie();
  const update = useUpdateMovie();
  const [editing, setEditing] = useState<Movie | null>(null);
  const [section, setSection] = useState(new URLSearchParams(location.search).get('section') === 'series' ? 'series' : 'films');
  const [removePoster, setRemovePoster] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Action');
  const [year, setYear] = useState(new Date().getFullYear());
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState('');
  const [drag, setDrag] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const resetEditor = () => {
    setEditing(null); setTitle(''); setDescription(''); setGenre('Action'); setYear(new Date().getFullYear());
    setFile(null); setPoster(null); setRemovePoster(false); setDuration(0); form.current?.reset();
  };
  const editMovie = (movie: Movie) => {
    form.current?.reset(); setEditing(movie); setTitle(movie.title); setDescription(movie.description);
    setGenre(movie.genre); setYear(movie.year || new Date().getFullYear()); setDuration(movie.duration);
    setFile(null); setPoster(null); setRemovePoster(false); setError(''); setSuccess('');
    form.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const chooseFile = (f?: File) => {
    if (!f) return; setError(''); setSuccess('');
    if (!f.name.toLowerCase().endsWith('.mp4') || (f.type && f.type !== 'video/mp4')) { setError('Seuls les fichiers MP4 sont acceptés.'); return; }
    if (f.size > 15 * 1024 ** 3) { setError('Limite : 15 Go par film.'); return; }
    setFile(f); setDuration(0); if (!title) setTitle(f.name.replace(/\.mp4$/i, '').replace(/[_-]/g, ' '));
    const url = URL.createObjectURL(f); const v = document.createElement('video'); v.preload = 'metadata'; v.src = url; v.onloadedmetadata = () => { if (Number.isFinite(v.duration)) setDuration(Math.round(v.duration)); URL.revokeObjectURL(url); }; v.onerror = () => { URL.revokeObjectURL(url); setError('Ce MP4 ne semble pas lisible. Privilégiez le codec H.264/AAC.'); };
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!file && !editing) { setError('Sélectionnez votre fichier MP4.'); return; }
    setBusy(true); setError(''); setSuccess(''); setProgress(0);
    try {
      let videoKey: string | undefined;
      if (file) {
        setStatus('Import du film'); const videoUpload = await client.movies.presign({ name: file.name, type: 'video/mp4', size: file.size });
        await uploadToStorage(file, videoUpload.url, 'video/mp4', setProgress); videoKey = videoUpload.key;
      }
      let posterKey: string | null | undefined = removePoster ? null : undefined;
      if (poster) { setStatus('Import de l’affiche'); const p = await client.movies.presign({ name: poster.name, type: poster.type as 'image/jpeg' | 'image/png' | 'image/webp', size: poster.size }); await uploadToStorage(poster, p.url, poster.type, () => {}); posterKey = p.key; }
      setStatus('Enregistrement');
      if (editing) await update.mutateAsync({ id: editing.id, title, description, genre, year, ...(videoKey ? { videoKey, duration } : {}), ...(posterKey !== undefined ? { posterKey } : {}) });
      else await create.mutateAsync({ title, description, genre, year, duration, videoKey: videoKey!, posterKey: posterKey ?? null });
      setSuccess(`« ${title} » a été ${editing ? 'modifié' : 'publié'}.`); resetEditor();
    } catch (err) { setError(err instanceof Error ? err.message : 'L’import a échoué. Réessayez.'); }
    finally { setBusy(false); }
  };
  const login = async (google = false) => {
    setLoginBusy(true); setError('');
    try { const result = google ? await authClient.managedAuth.signIn({ provider: 'google' }) : await authClient.signIn.email({ email: email.trim().toLowerCase(), password }, { onSuccess: captureEmailToken }); if (result.error) setError(result.error.message || 'Connexion impossible.'); else if (!google) { await authClient.getSession({ fetchOptions: { cache: 'no-store' } }); await authClient.$store.notify('$sessionSignal'); await access.refetch(); } }
    catch { setError('Connexion impossible. Vérifiez vos identifiants.'); } finally { setLoginBusy(false); }
  };
  const logout = async () => { setLoginBusy(true); await authClient.signOut(); clearEmailToken(); setLoginBusy(false); setError(''); };
  return <div className="admin-page"><header className="header"><Brand /><Link href="/" className="back-link"><ArrowLeft size={16} />Retour au cinéma</Link></header>
    {isPending || (session && access.isLoading) ? <div className="auth-loading"><span className="spinner" />Vérification de l’accès…</div> : !session ? <main className="auth-layout"><div className="auth-art"><div className="eyebrow">LES COULISSES DE VOTRE CINÉMA</div><h1>Les films, c’est vous.<br /><em>La séance, c’est nous.</em></h1><p>Importez votre collection et donnez vie à votre cinéma.</p><span><ShieldCheck size={18} />Espace privé · MP4 uniquement</span></div><form className="auth-card" onSubmit={e => { e.preventDefault(); void login(); }}><div className="auth-symbol"><LockKeyhole size={25} /></div><small>ESPACE ADMINISTRATEUR</small><h2>Bienvenue en coulisses.</h2><p>Connectez-vous pour gérer vos films.</p><button type="button" className="btn google-btn" disabled={loginBusy} onClick={() => login(true)}><b>G</b>Continuer avec Google</button><div className="auth-divider"><span />ou avec votre e-mail<span /></div><label>Adresse e-mail<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Votre mot de passe administrateur" /></label>{error && <div role="alert" className="alert error">{error}</div>}<button className="btn primary" disabled={loginBusy}>{loginBusy ? <span className="spinner" /> : <ShieldCheck size={17} />}{loginBusy ? 'Connexion…' : 'Accéder à l’administration'}</button><div className="auth-foot">Accès réservé au propriétaire du site.</div></form></main> : access.isError ? <main className="empty-state"><ShieldCheck /><h2>Accès non autorisé</h2><p>Ce compte n’est pas autorisé à administrer le site.</p><button className="btn secondary" disabled={loginBusy} onClick={logout}>Se déconnecter</button></main> : <main className="admin-main"><div className="admin-title"><div><div className="eyebrow">VOTRE CINÉMA, EN COULISSES</div><h1>Administration<span>.</span></h1><p>Ajoutez vos films. Le reste, c’est du cinéma.</p></div><button className="btn secondary" disabled={loginBusy} onClick={logout}><LogOut size={17} />Déconnexion</button></div><div className="admin-stats"><div><Film size={22} /><span><b>{query.data?.length || 0}</b>Films au catalogue</span></div><div><Play size={22} /><span><b>MP4</b>Format vidéo accepté</span></div><div><ShieldCheck size={22} /><span><b>Espace sécurisé</b>Administration privée</span></div></div>
      <div className="admin-section-tabs" aria-label="Type de contenu"><button type="button" data-section="films" aria-pressed={section === 'films'} disabled={busy} onClick={() => setSection('films')}>Films</button><button type="button" data-section="series" aria-pressed={section === 'series'} disabled={busy} onClick={() => setSection('series')}>Séries</button></div>
      {section === 'series' && <SeriesAdmin />}
      <TopFiveEditor movies={query.data || []} />
      <div className="admin-grid"><form ref={form} className="upload-form" onSubmit={submit}><div className="panel-title"><span className="red-square"><PlusIcon /></span><div><h2>{editing ? "Modifier le film" : "Ajouter un film"}</h2><p>{editing ? "Modifiez la fiche ou remplacez les fichiers." : "De votre appareil au grand écran."}</p></div></div>
        {editing && <div className="edit-notice"><span>Modification de « {editing.title} »</span><button type="button" className="icon-btn" disabled={busy} onClick={resetEditor} aria-label="Annuler la modification"><X size={17} /></button></div>}<fieldset disabled={busy}><label className={`dropzone ${drag ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (!busy) chooseFile(e.dataTransfer.files[0]); }}><input type="file" accept="video/mp4,.mp4" onChange={e => chooseFile(e.target.files?.[0])} /><Upload size={30} /><strong>{file ? file.name : editing ? 'Remplacer la vidéo MP4 (facultatif)' : 'Glissez votre film ici'}</strong><span>{file ? `${(file.size / 1024 ** 2).toFixed(1)} Mo · ${Math.round(duration / 60)} min` : editing ? 'La vidéo actuelle est conservée si vous ne choisissez aucun fichier.' : 'ou cliquez pour parcourir vos fichiers'}</span><small>MP4 UNIQUEMENT · 15 GO MAX · H.264 / AAC RECOMMANDÉ</small></label>
        <label>Titre du film <span className="required">*</span><input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Le titre de votre prochaine séance" /></label><div className="form-row"><label>Genre<select value={genre} onChange={e => setGenre(e.target.value)}>{['Action', 'Aventure', 'Science-fiction', 'Drame', 'Comédie', 'Documentaire', 'Animation', 'Thriller', 'Horreur'].map(g => <option key={g}>{g}</option>)}</select></label><label>Année<input type="number" required min="1888" max="2100" value={year} onChange={e => setYear(+e.target.value)} /></label></div><label>Description<textarea maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Quelques mots pour donner envie de regarder…" /></label><label className="poster-upload"><ImagePlus size={23} /><div><strong>{poster ? poster.name : editing?.posterKey && !removePoster ? 'Remplacer l’affiche actuelle' : 'Ajouter une affiche'}</strong><span>Facultatif · JPG, PNG, WebP · 10 Mo max.</span></div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 10 * 1024 ** 2) { setError('Affiche : JPG, PNG ou WebP, 10 Mo maximum.'); return; } setPoster(f); setRemovePoster(false); }} /></label>{editing?.poster && !poster && !removePoster && <div className="current-poster"><img src={editing.poster} alt="Affiche actuelle" /><button type="button" className="btn secondary" onClick={() => setRemovePoster(true)}>Retirer l’affiche</button></div>}{editing && removePoster && <p className="edit-notice">L’affiche sera retirée à l’enregistrement.<button type="button" className="btn secondary" onClick={() => setRemovePoster(false)}>Conserver</button></p>}<label className="rights-check"><input type="checkbox" required={!editing} /><span>Je détiens les droits de diffusion de ce film.</span></label></fieldset>
        {error && <div className="alert error" role="alert">{error}</div>}{success && <div className="alert success" role="status"><CheckCircle2 size={18} />{success}</div>}{busy && <div className="upload-progress"><div><span>{status}…</span><b>{progress}%</b></div><progress max={100} value={progress} /><small>Gardez cette page ouverte pendant l’import.</small></div>}<button className="btn primary publish" disabled={busy || (!file && !editing)}>{busy ? <span className="spinner" /> : <Upload size={17} />}{busy ? 'Enregistrement en cours…' : editing ? 'Enregistrer les modifications' : 'Importer et publier le film'}</button>
      </form><aside className="library-panel"><div className="panel-title"><Film size={22} /><div><h2>Votre collection</h2><p>Les films disponibles sur votre site.</p></div></div>{query.isLoading ? <p>Chargement…</p> : query.isError ? <div className="alert error">Catalogue indisponible.</div> : !query.data?.length ? <div className="library-empty"><Film size={38} /><h3>La première séance vous attend.</h3><p>Vos films apparaîtront ici dès leur publication.</p></div> : <div className="library-list">{query.data.map(m => <div className="library-item" key={m.id}><img src={m.poster || '/images/hero.jpg'} alt="" /><div><h3>{m.title}</h3><p>{m.year > 0 ? `${m.year} · ` : ""}{m.genre}</p><small>{Math.round(m.duration / 60)} min · MP4</small></div><button className="icon-btn edit-btn" disabled={busy} aria-label={`Modifier ${m.title}`} onClick={() => editMovie(m)}><Pencil size={18} /></button><button className="icon-btn delete" disabled={remove.isPending} aria-label={`Retirer ${m.title} du catalogue`} onClick={async () => { if (confirm(`Retirer « ${m.title} » du catalogue ?`)) try { await remove.mutateAsync({ id: m.id }); } catch { setError('Impossible de retirer le film.'); } }}><Trash2 size={17} /></button></div>)}</div>}<div className="admin-tip"><ShieldCheck size={20} /><div><strong>Vos films, bien gardés.</strong><p>Les imports sont réservés à votre compte. Le catalogue est accessible à tous.</p></div></div></aside></div></main>}
  </div>;
}
function PlusIcon() { return <span style={{ fontSize: 24 }}>+</span>; }