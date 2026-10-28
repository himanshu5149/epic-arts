import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ChevronDown, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';
export function SunMark({size=40,className=''}:{size?:number;className?:string}){
  return <svg width={size} height={size} viewBox="0 0 60 60" fill="none" aria-hidden="true" className={className}><g stroke="currentColor" strokeWidth="1.5">{Array.from({length:12},(_,i)=><ellipse key={i} cx="30" cy="12" rx="3.7" ry="7.7" transform={`rotate(${i*30} 30 30)`}/>)}<circle cx="30" cy="30" r="8"/><circle cx="30" cy="30" r="2.2" fill="currentColor"/></g></svg>;
}
export function Logo({light=false}:{light?:boolean}){return <Link to="/" aria-label="Epic Arts home" className={`brand ${light?'brand-light':''}`}><SunMark size={43}/><span>epic arts<span className="brand-dot">.</span></span></Link>;}
export function Eyebrow({children,className=''}:{children:ReactNode;className?:string}){return <div className={`eyebrow ${className}`}><span/>{children}</div>;}
export function Stars({rating=5,small=false}:{rating?:number;small?:boolean}){return <span role="img" className={`stars ${small?'stars-small':''}`} aria-label={`${rating} out of 5 stars`}>{[1,2,3,4,5].map(x=><Star key={x} size={small?11:14} strokeWidth={1.4} fill={x<=Math.round(rating)?'currentColor':'none'}/>)}</span>;}
export function TextLink({to,children,className=''}:{to:string;children:ReactNode;className?:string}){return <Link to={to} className={`text-link ${className}`}>{children}<ArrowUpRight size={17}/></Link>;}
export function Modal({children,onClose,label,drawer=false,className=''}:{children:ReactNode;onClose:()=>void;label:string;drawer?:boolean;className?:string}){
  const ref=useRef<HTMLDivElement>(null);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    const prior=document.activeElement as HTMLElement;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const root=document.getElementById('root');const wasInert=root?.inert||false;if(root)root.inert=true;
    const panel=ref.current;
    const t=setTimeout(()=>panel?.querySelector<HTMLElement>('[autofocus], input, button, a')?.focus(),50);
    function key(e:KeyboardEvent){
      if(e.key==='Escape')closeRef.current();
      if(e.key==='Tab'&&panel){
        const focusable=Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]')).filter(el=>el.offsetParent!==null);
        const first=focusable[0],last=focusable[focusable.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    }
    document.addEventListener('keydown',key);
    return()=>{clearTimeout(t);document.body.style.overflow=overflow;if(root)root.inert=wasInert;document.removeEventListener('keydown',key);prior?.focus();};
  },[]);
  return createPortal(<div className={`overlay ${drawer?'drawer-overlay':''}`} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={`${drawer?'drawer':'modal'} ${className}`} tabIndex={-1}>{children}</div></div>,document.body);
}
export function DialogHeader({title,onClose,subtitle}:{title:string;onClose:()=>void;subtitle?:string}){return <div className="dialog-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22}/></button></div>;}
export function Accordion({title,children,open=false}:{title:string;children:ReactNode;open?:boolean}){return <details className="accordion" open={open}><summary>{title}<ChevronDown size={17}/></summary><div className="accordion-content">{children}</div></details>;}
export function Loading({text='Finding your little piece of art…'}:{text?:string}){return <div className="loading-state"><SunMark size={48}/><p>{text}</p></div>;}
