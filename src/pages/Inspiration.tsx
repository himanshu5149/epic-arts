import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CircleAlert, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { CURATED_QUERIES, MUSEUM } from '../../shared/references.mjs';
import { Eyebrow, SunMark } from '../components/UI';
type RefItem={id:number;title:string;artist:string;date:string;imageId:string;museumUrl:string;note:string};
type SearchState={items:RefItem[];source?:string;error?:string;offline?:boolean};
export default function Inspiration(){
  const [query,setQuery]=useState('');
  const [active,setActive]=useState('');
  const [state,setState]=useState<SearchState|null>(null);
  const [busy,setBusy]=useState(false);
  const seq=useRef(0);
  const go=async(q:string)=>{
    const term=q.trim();if(term.length<2)return;
    setBusy(true);setActive(term);const my=++seq.current;
    try{
      const r=await fetch('/api/references/search?q='+encodeURIComponent(term));
      const data=await r.json() as SearchState&{error?:string};
      if(seq.current!==my)return;
      setState(r.ok?{items:data.items||[],source:data.source}:{items:[],error:data.error||'The shelf paused unexpectedly.',offline:(data as SearchState).offline});
    }catch{
      if(seq.current!==my)return;
      setState({items:[],error:'We couldn’t reach the museum from here. The gallery is fine — this shelf is inspiration only.',offline:true});
    }finally{if(seq.current===my)setBusy(false);}
  };
  const submit=(e:FormEvent)=>{e.preventDefault();go(query);};
  useEffect(()=>{go(CURATED_QUERIES[0].q);},[]);
  return <div className="inspiration-page section-shell">
    <header className="inspiration-heading"><div><Eyebrow>AN OPEN WINDOW, NOT A SHOP SHELF</Eyebrow><h1>For the love<br/>of <em>reference.</em></h1></div>
      <p>Before you choose a piece, wander a little. This shelf searches the {MUSEUM.name}’s public-domain collection through its open API — one of the free services listed in the <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer" className="inline-source">public-apis directory</a>. These works belong to history; nothing here is for sale at Epic Arts.</p></header>
    <form className="inspiration-bar" onSubmit={submit} role="search">
      <Search size={17} strokeWidth={1.5}/>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search the museum’s public-domain collection…" aria-label="Search museum references" minLength={2} maxLength={60}/>
      <button className="button button-primary" type="submit" disabled={busy}>{busy?'Searching…':'Search'}<ArrowRight size={15}/></button>
    </form>
    <div className="inspiration-chips" aria-label="Curated starting points">{CURATED_QUERIES.map(c=><button key={c.q} className={active===c.q?'selected':''} onClick={()=>{setQuery(c.q);go(c.q);}}>{c.label}</button>)}</div>
    {busy&&<div className="inspiration-status"><span className="spinner"/> Asking the museum, gently…</div>}
    {!busy&&state?.error&&<div className="inspiration-empty"><CircleAlert size={34} strokeWidth={1.2}/><h2>{state.offline?'The shelf is resting.':'Hmm. Nothing just now.'}</h2><p>{state.error}</p><a className="button button-outline" href={MUSEUM.searchBase+encodeURIComponent(active)} target="_blank" rel="noopener noreferrer">Open the museum’s search directly <ExternalLink size={13}/></a><button className="text-link" onClick={()=>go(active||'Rajput')}><RefreshCw size={13}/> Try again</button></div>}
    {!busy&&state&&!state.error&&state.items.length===0&&<div className="inspiration-empty"><SunMark size={44}/><h2>A rare bird, that one.</h2><p>No public-domain results for “{active}” in this museum’s collection. That’s honest data — try a suggested starting point, or search the museum itself.</p><a className="button button-outline" href={MUSEUM.searchBase+encodeURIComponent(active)} target="_blank" rel="noopener noreferrer">Search at the museum <ExternalLink size={13}/></a></div>}
    {!busy&&state&&!state.error&&state.items.length>0&&<>
      <p className="inspiration-count">Showing {state.items.length} public-domain references for “{active}”. Data: {MUSEUM.name} public API.</p>
      <div className="inspiration-grid">{state.items.map((r,ix)=><a key={r.id} href={r.museumUrl} target="_blank" rel="noopener noreferrer" className="inspiration-card" style={{animationDelay:`${ix*40}ms`}}>
        <span className="inspiration-thumb"><img src={'/api/references/thumb/'+r.imageId} alt={`${r.title} — ${r.artist}`} loading="lazy" width={400}/></span>
        <span className="inspiration-card-copy"><span className="inspiration-badge">MUSEUM REFERENCE · NOT FOR SALE</span><strong>{r.title}</strong><span className="muted">{r.artist}{r.date?' · '+r.date:''}</span></span>
        <span className="inspiration-open"><ExternalLink size={14}/></span>
      </a>)}</div>
    </>}
    <div className="inspiration-honesty"><SunMark size={30}/><p>These references are for learning and inspiration. Epic Arts’ own editions are original contemporary designs — we do not resell, reprint, or claim these museum works. If a painting moves you, learn about its tradition and the artists who keep it alive.</p><Link to="/shop" className="text-link">Back to the gallery <ArrowUpRight size={14}/></Link></div>
  </div>;
}
