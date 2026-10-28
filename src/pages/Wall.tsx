import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Copy, Download, Frame, ImagePlus, Plus, Ruler, ShoppingBag, Shuffle, Trash2 } from 'lucide-react';
import { WALL_EDITS, WALL_TONES, FRAME_TONES, WALL_STORAGE_KEY, heritageStyles, planForEdit, normalizeWallPlan, wallGeometry, wallPlanText, wallQuery, wallTotal, isWallProduct, nextHeritageId } from '../../shared/walls.mjs';
import { palettes } from '../../shared/designs.mjs';
import { Eyebrow, SunMark } from '../components/UI';
import { useCatalog } from '../catalog';
import { useStore } from '../store';
import { money, productUrl } from '../data';
// Which original artwork a “shuffle” should keep near when it has no generative recipe.
const ORIGINAL_HINT: Record<string,string> = { 'tree-of-life':'mithila-garden','peacock-pair':'peacock-rhapsody','lotus-pond':'lotus-atelier','warli-dance':'warli-rhythm','surya':'sacred-lotus','sacred-bloom':'temple-lattice' };
export default function Wall(){
  const { resolveProduct } = useCatalog();
  const { addToCart, setCartOpen, notify } = useStore();
  const [params] = useSearchParams();
  const hadQuery = useRef(params.size>0);
  const [plan,setPlan] = useState(()=>normalizeWallPlan(hadQuery.current?Object.fromEntries(params):{},resolveProduct));
  const [photo,setPhoto] = useState('');
  const photoUrl = useRef('');
  const photoInput = useRef<HTMLInputElement>(null);
  // Restore a remembered arrangement only when the visit carried no share-link query.
  useEffect(()=>{ if(hadQuery.current) return; try{ const stored=JSON.parse(localStorage.getItem(WALL_STORAGE_KEY)||'null'); if(stored) setPlan(normalizeWallPlan(stored,resolveProduct)); }catch{} },[resolveProduct]);
  useEffect(()=>{ try{ localStorage.setItem(WALL_STORAGE_KEY,JSON.stringify(plan)); }catch{} },[plan]);
  useEffect(()=>()=>{ if(photoUrl.current) URL.revokeObjectURL(photoUrl.current); },[]);
  const geo = useMemo(()=>wallGeometry(plan),[plan]);
  const pieces = plan.ids.map(id=>resolveProduct(id)).filter((p):p is NonNullable<typeof p>=>!!p);
  const edit = WALL_EDITS.find(e=>e.id===plan.edit)||WALL_EDITS[0];
  const frameTone = FRAME_TONES.find(t=>t.id===plan.frame)||FRAME_TONES[0];
  const wallTone = WALL_TONES.find(t=>t.id===plan.wall)||WALL_TONES[0];
  const total = wallTotal(plan,resolveProduct);
  const set = (patch:Partial<typeof plan>)=>setPlan(p=>normalizeWallPlan({...p,...patch},resolveProduct));
  const applyEdit = (id:string)=>{ const e=WALL_EDITS.find(x=>x.id===id)||WALL_EDITS[0]; setPlan(planForEdit(e,resolveProduct)); };
  const shufflePiece = (index:number)=>{
    const current = resolveProduct(plan.ids[index]); let next:string|null = null;
    if(current?.style&&current.recipe){
      for(let step=1;step<=64&&!next;step++){const edition=((current.recipe.edition||1)-1+step)%64+1;const candidate=`${current.style}-${String(edition).padStart(3,'0')}`;if(!plan.ids.includes(candidate))next=candidate;}
    } else {
      const style = current?.id ? (ORIGINAL_HINT[current.id]||'mithila-garden') : 'mithila-garden';
      next = nextHeritageId(style,'heritage',plan.ids)||nextHeritageId(style,'indigo',plan.ids);
    }
    if(next) setPlan(p=>({...p,ids:p.ids.map((id,i)=>i===index?next:id)}));
  };
  const removePiece = (index:number)=>{ if(plan.ids.length<=1){notify('A wall needs at least one piece of art.');return;} setPlan(p=>({...p,ids:p.ids.filter((_,i)=>i!==index)})); };
  const addPiece = ()=>{
    if(plan.ids.length>=4){notify('Four pieces is plenty for this little wall.');return;}
    let found:string|null=null;
    outer: for(const s of heritageStyles) for(const palette of palettes){ const id=nextHeritageId(s.id,palette.id,plan.ids); if(id){found=id;break outer;} }
    if(found) setPlan(p=>({...p,ids:[...p.ids,found]}));
  };
  const choosePhoto = (e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; e.target.value='';
    if(!file) return;
    if(file.size>8*1024*1024||!/^image\//.test(file.type)){notify('Please choose an image under 8 MB.');return;}
    if(photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current=URL.createObjectURL(file); setPhoto(photoUrl.current);
  };
  const clearPhoto = ()=>{ if(photoUrl.current) URL.revokeObjectURL(photoUrl.current); photoUrl.current=''; setPhoto(''); };
  const copyLink = async ()=>{
    const url = window.location.origin+'/wall?'+wallQuery(plan,resolveProduct);
    try{ await navigator.clipboard.writeText(url); notify('Your wall plan link is ready to share.'); }
    catch{ window.prompt('Copy your wall plan link',url); }
  };
  const downloadPlan = ()=>{
    const text=wallPlanText(plan,resolveProduct,window.location.origin);
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download='epic-arts-wall-plan.txt'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500); notify('Your plan is saved as a little note.');
  };
  const collectAll = ()=>{ let added=0; plan.ids.forEach(id=>{ if(isWallProduct(resolveProduct(id))){ addToCart(id,false); added++; } }); setCartOpen(true); if(!added) notify('These pieces couldn’t be added just now.'); };
  const frameLeft = (x:number)=>((plan.wallCm-geo.widthCm)/2+x)/plan.wallCm*100;
  const frameTop = (y:number)=>Math.min(84,Math.max(4,(plan.hang/100*300-geo.heightCm/2+y)/300*100));
  const size = geo.outerWidthCm;
  return <div className="wall-page section-shell">
    <header className="wall-heading"><div><Eyebrow>A LITTLE PLANNER FROM THE GALLERY</Eyebrow><h1>Design your <em>wall.</em></h1></div><p>Arrange real, downloadable editions on an illustrative wall. Try a size, a gap, a palette — your plan stays on this device, and every piece is still collected individually with its own digital license.</p></header>
    <div className="wall-layout">
      <div className="wall-preview-column">
        <div className="wall-scene" style={{aspectRatio:`${plan.wallCm} / 300`,background:wallTone.color,backgroundImage:photo?`url(${photo})`:undefined,backgroundSize:'cover',backgroundPosition:'center'}}>
          <div className="wall-light" aria-hidden="true"/>
          {photo&&<div className="wall-photo-haze" aria-hidden="true"/>}
          <span className="wall-scene-label">{photo?'YOUR WALL, YOUR RULES':'AN ILLUSTRATIVE WALL · ABOUT 3 M HIGH'}</span>
          {plan.ids.map((id,i)=>{
            const p=resolveProduct(id); const pos=geo.positions[i]; if(!p||!pos) return null;
            const top=frameTop(pos.y), left=frameLeft(pos.x), width=(size/plan.wallCm)*100;
            const matPct=(plan.matCm/(size||1))*100;
            return <span key={id} className="wall-frame" style={{left:left+'%',top:top+'%',width:width+'%',borderColor:frameTone.color,aspectRatio:`${geo.outerWidthCm} / ${geo.outerHeightCm}`}}>
              <span className="wall-frame-mat" style={{padding:matPct+'%'}}><img src={p.image} alt={`${p.name} on an illustrative wall`} draggable={false}/></span>
              <span className="wall-frame-tools">
                <button onClick={()=>shufflePiece(i)} aria-label={`Try a different edition in place of ${p.name}`} title="Try another edition"><Shuffle size={11}/></button>
                <button onClick={()=>removePiece(i)} aria-label={`Remove ${p.name} from the plan`} title="Remove"><Trash2 size={11}/></button>
              </span>
            </span>;
          })}
          <span className="wall-floor" aria-hidden="true"/><span className="wall-console" aria-hidden="true"/>
        </div>
        <div className="wall-readout">
          <span><Ruler size={13}/> Arrangement ≈ {geo.widthCm.toFixed(0)} × {geo.heightCm.toFixed(0)} cm</span>
          <span>Wall width {plan.wallCm} cm</span>
          <span className={geo.fits?'wall-fits':'wall-overflow'}>{geo.fits?'Fits your wall width':'Wider than your wall — make a little room'}</span>
        </div>
        <div className="wall-photo-row">
          <input ref={photoInput} type="file" accept="image/*" className="sr-only" onChange={choosePhoto}/>
          <button className="text-link" onClick={()=>photoInput.current?.click()}><ImagePlus size={15}/> Use a photo of my wall</button>
          {photo&&<button className="text-link" onClick={clearPhoto}>Back to the studio wall <ArrowUpRight size={14}/></button>}
          <span className="small-text muted">Your photo never leaves this browser. It isn’t saved, uploaded, or put in your share link.</span>
        </div>
        <div className="wall-honesty"><SunMark size={30}/><p>This is a thoughtful sketch, not a calibrated room scan: frames and mats are illustrative, artwork ratios (5:4-ish panels in a 4:5-ish frame line) are approximate, and each included PDF adds its own neat border. Prices are checked again at checkout, and every edition downloads separately after an explicit order.</p></div>
      </div>
      <div className="wall-controls">
        <div className="wall-control-group"><span className="mini-label">01 · BEGIN WITH AN EDIT</span><div className="wall-edit-picker">{WALL_EDITS.map(e=><button key={e.id} className={plan.edit===e.id?'selected':''} onClick={()=>applyEdit(e.id)} aria-pressed={plan.edit===e.id}><strong>{e.name}</strong><small>{e.tag}</small></button>)}</div><p className="wall-edit-note">{edit.description} <em>{edit.room}.</em></p><p className="wall-edit-note muted">{edit.note}</p></div>
        <div className="wall-control-group"><span className="mini-label">02 · CHOOSE A PAPER SIZE</span><div className="wall-segment">{['5x7','8x10','a4'].map(s=><button key={s} className={plan.paper===s?'selected':''} onClick={()=>set({paper:s as typeof plan.paper})} aria-pressed={plan.paper===s}>{s==='5x7'?'5 × 7 in':s==='8x10'?'8 × 10 in':'A4'}</button>)}</div><p className="wall-edit-note">The three sizes included with every Epic Arts edition. Frames shown are sized from the paper.</p></div>
        <div className="wall-control-group"><span className="mini-label">03 · A LITTLE ARRANGEMENT</span><div className="wall-segment">{[['row','In a row'],['stepped','Gently stepped'],['grid','2 × 2 grid']].map(([id,label])=><button key={id} disabled={id==='grid'&&plan.ids.length<3} className={plan.layout===id?'selected':''} onClick={()=>set({layout:id as typeof plan.layout})} aria-pressed={plan.layout===id}>{label}</button>)}</div></div>
        <div className="wall-control-group wall-control-split"><div><span className="mini-label">A WALL TONE</span><div className="wall-swatches">{WALL_TONES.map(t=><button key={t.id} title={t.name} aria-label={`Wall tone ${t.name}`} aria-pressed={plan.wall===t.id} className={plan.wall===t.id?'selected':''} style={{background:t.color}} onClick={()=>set({wall:t.id})}/>)}</div></div><div><span className="mini-label">A FRAME FINISH</span><div className="wall-swatches">{FRAME_TONES.map(t=><button key={t.id} title={t.name} aria-label={`Frame finish ${t.name}`} aria-pressed={plan.frame===t.id} className={plan.frame===t.id?'selected':''} style={{background:t.color}} onClick={()=>set({frame:t.id})}/>)}</div></div></div>
        <div className="wall-sliders">
          <label>Wall width<output>{plan.wallCm} cm</output><input type="range" min={80} max={500} step={5} value={plan.wallCm} onChange={e=>set({wallCm:Number(e.target.value)})}/></label>
          <label>Space between pieces<output>{plan.gapCm} cm</output><input type="range" min={2} max={16} step={1} value={plan.gapCm} onChange={e=>set({gapCm:Number(e.target.value)})}/></label>
          <label>Hanging height<output>{plan.hang}% up the wall</output><input type="range" min={20} max={65} step={1} value={plan.hang} onChange={e=>set({hang:Number(e.target.value)})}/></label>
          <label>An illustrative mat<output>{plan.matCm===0?'No mat':plan.matCm+' cm mat'}</output><input type="range" min={0} max={3} step={1} value={plan.matCm} onChange={e=>set({matCm:Number(e.target.value)})}/></label>
        </div>
        <button className="button button-outline" onClick={addPiece} disabled={plan.ids.length>=4}><Plus size={15}/> Add another piece</button>
      </div>
    </div>
    <section className="wall-pieces"><div className="section-heading"><div><Eyebrow>THE PIECES IN YOUR PLAN</Eyebrow><h2>Everything here is <em>real art.</em></h2></div><span className="wall-plan-total">{money(total)} <small>before checkout</small></span></div>
      <div className="wall-piece-list">{pieces.map((p,i)=><div className="wall-piece" key={p.id}><img src={p.image} alt=""/><div><span className="product-tradition">{p.tradition}</span><h3>{p.name}</h3><strong>{money(p.price)} <small>· personal-use license</small></strong></div><div className="wall-piece-actions"><Link to={productUrl(p)} className="text-link">View <ArrowUpRight size={13}/></Link><button className="text-link" onClick={()=>shufflePiece(i)}>Try another <Shuffle size={13}/></button></div></div>)}</div>
      <div className="wall-actions">
        <button className="button button-primary" onClick={collectAll}><ShoppingBag size={17} strokeWidth={1.5}/> Collect these pieces <ArrowRight size={16}/></button>
        <button className="button button-outline" onClick={downloadPlan}><Download size={16}/> Download my plan</button>
        <button className="button button-outline" onClick={copyLink}><Copy size={15}/> Copy a share link</button>
      </div>
      <p className="wall-actions-note small-text muted">Your plan is remembered on this device only. A share link contains artwork choices and sizes — never your photo — and downloading the plan does not create an order. Each piece is added to your bag individually and checked out explicitly.</p>
    </section>
    <section className="wall-guide-callout"><Frame size={25} strokeWidth={1.2}/><div><h2>A good print starts with a good plan.</h2><p>For paper choices, print settings, and an honest note about resolution, our little guide is always close. There’s even a free one-page test sheet to try before you print your art.</p></div><div className="wall-guide-actions"><Link to="/print-guide" className="text-link">Read the printing guide <ArrowUpRight size={15}/></Link><a href="/epic-arts-test-print.pdf" download className="text-link">Try the printer test sheet <ArrowUpRight size={15}/></a></div></section>
  </div>;
}
