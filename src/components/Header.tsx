import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, Menu, ArrowUpRight, Download, X, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { Logo, Modal, SunMark } from './UI';
import { CATALOG_COUNT } from '../../shared/designs.mjs';
export default function Header(){
  const {cart,saved,setCartOpen,setSearchOpen,setSavedOpen}=useStore();
  const [mobile,setMobile]=useState(false);const {pathname}=useLocation();
  useEffect(()=>setMobile(false),[pathname]);
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName)){e.preventDefault();setMobile(false);setSearchOpen(true);}};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[setSearchOpen]);
  return <>
    <div className="announcement"><span><Sparkles size={12}/> {CATALOG_COUNT.toLocaleString('en-US')} editions. A little more possibility.</span><span className="announcement-right"><Download size={12}/> Digital art. Instantly yours. <span className="announcement-dot">✦</span> No shipping, just possibility.</span></div>
    <header className="site-header"><div className="header-inner"><Logo/>
      <nav className="desktop-nav" aria-label="Main navigation"><NavLink to="/shop" className={({isActive})=>isActive||pathname==='/'?'nav-active':''}>Shop the art</NavLink><NavLink to="/collections">Collections</NavLink><NavLink to="/trending">The trend edit</NavLink><NavLink to="/advisor">Art advisor</NavLink><NavLink to="/studio" className="nav-studio"><Sparkles size={14}/> Create your own <span className="nav-dot"/></NavLink></nav>
      <div className="header-actions"><button className="icon-button search-toggle" aria-label="Search artworks" onClick={()=>setSearchOpen(true)}><Search size={20} strokeWidth={1.5}/></button><button className="icon-button saved-toggle" aria-label={`Saved artworks${saved.length?`, ${saved.length} pieces`:''}`} onClick={()=>setSavedOpen(true)}><Heart size={20} strokeWidth={1.5}/>{saved.length>0&&<span className="icon-dot"/>}</button><span className="header-divider"/><button className="bag-toggle" aria-label={`Open bag, ${cart.length} ${cart.length===1?'artwork':'artworks'}`} onClick={()=>setCartOpen(true)}><ShoppingBag size={19} strokeWidth={1.5}/><span>Bag</span><span className="bag-count">{cart.length}</span></button><button className="icon-button mobile-menu-toggle" aria-label="Open navigation" onClick={()=>setMobile(true)}><Menu size={23}/></button></div>
    </div></header>
    {mobile&&<Modal label="Navigation" drawer onClose={()=>setMobile(false)} className="mobile-nav-sheet"><div className="dialog-heading"><Logo/><button className="icon-button" onClick={()=>setMobile(false)} aria-label="Close navigation"><X size={22}/></button></div><nav>{[['Shop the art','/shop'],['The collections','/collections'],['The trend edit','/trending'],['Create your own','/studio'],['Your art advisor','/advisor'],['Design your wall','/wall'],['For celebrations','/celebrations'],['Inspiration shelf','/inspiration'],['Our story','/our-story'],['The journal','/journal'],['My download library','/library']].map(([text,url])=><Link to={url} key={url} onClick={()=>setMobile(false)}>{text}<ArrowUpRight size={22}/></Link>)}<button className="mobile-saved-link" onClick={()=>{setMobile(false);setSavedOpen(true);}}>Your saved pieces{saved.length?` (${saved.length})`:''}<Heart size={21}/></button></nav><div className="mobile-nav-bottom"><SunMark size={58}/><p>Ancient stories.<br/>A new home.</p><span>Digital editions. Always within reach.</span></div></Modal>}
  </>;
}
