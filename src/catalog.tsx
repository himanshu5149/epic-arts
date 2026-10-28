import {createContext,useContext,useState,useEffect,useCallback,useRef,type ReactNode} from 'react';
import {getProduct,products} from './data';
import type {Product} from './types';
import {CATALOG_COUNT} from '../shared/designs.mjs';
export type Listing={items:Product[];total:number;page:number;pages:number;limit:number;catalogTotal:number;sort:string;query:string};
export type BootData={listing?:{key:string;data:Listing};product?:Product};
type CatalogContext={initial:BootData;resolveProduct:(id:string)=>Product|undefined;registerProduct:(p:Product)=>void;custom:Product[]};
const Context=createContext<CatalogContext|null>(null);
export function CatalogProvider({children,initial={}}:{children:ReactNode;initial?:BootData}){
 const [registry,setRegistry]=useState<Record<string,Product>>(()=>initial.product?{[initial.product.id]:initial.product}:{}),[hydrated,setHydrated]=useState(false);
 const publicCache=useRef(new Map(products.map(p=>[p.id,p])));
 useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem('epic-studio-v1')||'[]');if(Array.isArray(stored)){const entries=stored.filter((p:Product)=>p&&/^studio-[a-f0-9]{32}$/.test(p.id)&&typeof p.name==='string'&&p.image?.startsWith('/media/art/'+p.id+'.webp')&&(!p.accessToken||/^[a-f0-9]{64}$/.test(p.accessToken))).slice(-128);setRegistry(old=>{const next={...old};for(const p of entries)next[p.id]={...p,...old[p.id],accessToken:old[p.id]?.accessToken||p.accessToken};return next;});}}catch{}setHydrated(true);},[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem('epic-studio-v1',JSON.stringify(Object.values(registry).filter(p=>p.isPrivate).slice(-128)));}catch{}},[registry,hydrated]);
 useEffect(()=>{if(!hydrated)return;let active=true;try{const ids=[...new Set([...JSON.parse(localStorage.getItem('epic-cart-v1')||'[]'),...JSON.parse(localStorage.getItem('epic-saved-v1')||'[]')])].filter((id):id is string=>typeof id==='string'&&/^studio-[a-f0-9]{32}$/.test(id)&&!registry[id]).slice(0,96);
 for(const id of ids)fetch('/api/catalog/'+encodeURIComponent(id)).then(r=>r.ok?r.json():null).then((p:Product|null)=>{if(active&&p)setRegistry(old=>({...old,[p.id]:p}));}).catch(()=>{});
 }catch{}return()=>{active=false;};},[hydrated]);
 const resolveProduct=useCallback((id:string)=>{if(registry[id])return registry[id];let p=publicCache.current.get(id);if(!p){p=getProduct(id);if(p)publicCache.current.set(id,p);}return p;},[registry]);
 const registerProduct=useCallback((p:Product)=>setRegistry(old=>({...old,[p.id]:p})),[]);
 return <Context.Provider value={{initial,resolveProduct,registerProduct,custom:Object.values(registry).filter(p=>p.isPrivate)}}>{children}</Context.Provider>;
}
export function useCatalog(){const c=useContext(Context);if(!c)throw new Error('CatalogProvider missing');return c;}
export function useListing(key:string){
 const {initial}=useCatalog();const [response,setResponse]=useState<{key:string;data:Listing}|undefined>(()=>initial.listing),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{if(initial.listing?.key===key&&refresh===0){setResponse(initial.listing);setError('');return;}
  const abort=new AbortController();const timer=setTimeout(()=>{setError('');fetch('/api/catalog?'+key,{signal:abort.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'The gallery could not be loaded.');return d as Listing;}).then(data=>setResponse({key,data})).catch(e=>{if(e.name!=='AbortError')setError('We couldn’t reach the gallery. Check your connection and try again.');});},180);
  return()=>{clearTimeout(timer);abort.abort();};
 },[key,initial.listing,refresh]);
 const data=response?.key===key?response.data:undefined;
 return {data,loading:!data&&!error,error,retry:()=>setRefresh(n=>n+1),catalogTotal:data?.catalogTotal||CATALOG_COUNT};
}
