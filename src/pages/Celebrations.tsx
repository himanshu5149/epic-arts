import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Gift, Heart, Sparkles } from 'lucide-react';
import { OCCASIONS, occasionsFor } from '../../shared/celebrations.mjs';
import { getProduct, money } from '../data';
import { useStore } from '../store';
import { Eyebrow, SunMark } from '../components/UI';
import ProductCard from '../components/ProductCard';
export default function Celebrations(){
  const { addToCart, setCartOpen, notify } = useStore();
  const collectSuite = (occ:(typeof OCCASIONS)[number])=>{
    const ids=occ.ids.filter(id=>getProduct(id)); ids.forEach(id=>addToCart(id,false)); setCartOpen(true);
    if(!ids.length) notify('Those pieces could not be added right now.');
  };
  return <div className="celebrations-page section-shell">
    <header className="celebrations-heading"><div><Eyebrow>MOMENTS THAT ASK FOR ART</Eyebrow><h1>Celebrations,<br/><em>printed with love.</em></h1></div>
      <p>Some occasions deserve more than a message. Collect a small suite of real digital editions, send them as a sealed gift, or print them beautifully for a day that matters. Everything here is digital — instant, personal, and no envelope stuffing required.</p></header>
    {occasionsFor(getProduct).map((occ,oi)=><section className="occasion-section" key={occ.id}>
      <div className="occasion-intro">
        <span className="mini-label">{occ.eyebrow}</span>
        <h2>{occ.name}.</h2>
        <p className="occasion-tagline">{occ.tagline}</p>
        <p className="occasion-story">{occ.story}</p>
        <p className="occasion-note small-text muted">{occ.note}</p>
        <div className="occasion-actions">
          <button className="button button-primary" onClick={()=>collectSuite(occ)}><Gift size={16} strokeWidth={1.5}/> Collect this suite · {money(occ.products.reduce((a,p)=>a+p.price,0))}<ArrowRight size={15}/></button>
          <Link className="text-link" to={'/wall?edit='+(oi===1?'pond-and-petal':oi===2?'indigo-stories':'mithila-morning')}>See it on a wall <ArrowUpRight size={14}/></Link>
        </div>
      </div>
      <div className="occasion-grid product-grid">{occ.products.map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}</div>
    </section>)}
    <section className="celebrations-gift-callout">
      <SunMark size={60}/>
      <div><Eyebrow>A LITTLE CEREMONY, EVEN DIGITALLY</Eyebrow><h2>Send it <em>sealed.</em></h2>
      <p>Mark any order as a gift at checkout: add their name and a short line from you, then share the private gift link. They open a sealed envelope, read your note, and find their art waiting inside — real files, kept forever, printed wherever they are.</p></div>
      <Link to="/shop" className="button button-outline">Choose their piece <ArrowRight size={16}/></Link>
    </section>
    <div className="collection-provenance-note"><p>Celebration edits are curatorial combinations of existing Epic Arts editions — contemporary generative interpretations, not ritual objects, artisan-made originals, or proofs of cultural authenticity. Any order can be given as a gift; a personal-use license journeys with it.</p><Link to="/our-story" className="text-link">A little more on provenance <ArrowUpRight size={14}/></Link></div>
  </div>;
}
