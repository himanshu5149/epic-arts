import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useCatalog } from './catalog';
import {getProduct} from './data';
function restore(key: string): string[] {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? [...new Set(value.filter(id => typeof id==='string' && (getProduct(id)||/^studio-[a-f0-9]{32}$/.test(id))))].slice(0,64) : []; } catch { return []; }
}
type Store = {
  cart: string[]; saved: string[]; cartOpen: boolean; searchOpen: boolean; savedOpen: boolean;
  setCartOpen: (v:boolean)=>void; setSearchOpen: (v:boolean)=>void; setSavedOpen: (v:boolean)=>void;
  addToCart: (id:string, open?:boolean)=>void; removeFromCart: (id:string)=>void; clearCart: ()=>void;
  toggleSaved: (id:string)=>void; toast: string; notify:(text:string)=>void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({children}:{children:ReactNode}) {
  const {resolveProduct}=useCatalog();
  const [cart,setCart] = useState<string[]>([]);
  const [saved,setSaved] = useState<string[]>([]);
  const [hydrated,setHydrated] = useState(false);
  useEffect(()=>{setCart(restore('epic-cart-v1'));setSaved(restore('epic-saved-v1'));setHydrated(true);},[]);
  const [cartOpen,setCartOpen] = useState(false);
  const [searchOpen,setSearchOpen] = useState(false);
  const [savedOpen,setSavedOpen] = useState(false);
  const [toast,setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text:string)=>{setToast(text); if(timer.current) clearTimeout(timer.current); timer.current=setTimeout(()=>setToast(''),4200);},[]);
  useEffect(()=>{if(hydrated)try { localStorage.setItem('epic-cart-v1',JSON.stringify(cart)); } catch {}},[cart,hydrated]);
  useEffect(()=>{if(hydrated)try { localStorage.setItem('epic-saved-v1',JSON.stringify(saved)); } catch {}},[saved,hydrated]);
  useEffect(()=>()=>{if(timer.current) clearTimeout(timer.current);},[]);
  const addToCart = useCallback((id:string,open=true)=>{
    if(!resolveProduct(id)) return;
    if(cart.length>=32&&!cart.includes(id)){notify('Your bag holds up to 32 editions. Collect these first, then make a little more room.');return;}
    setCart(old=>old.includes(id)?old:old.length<32?[...old,id]:old);
    if(open){setSavedOpen(false);setSearchOpen(false);setCartOpen(true);}else notify('A little art, added to your bag.');
  },[notify,resolveProduct,cart]);
  const toggleSaved = useCallback((id:string)=>setSaved(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id].slice(-64)),[]);
  const openCart=useCallback((value:boolean)=>{setCartOpen(value);if(value){setSearchOpen(false);setSavedOpen(false);}},[]);
  const openSearch=useCallback((value:boolean)=>{setSearchOpen(value);if(value){setCartOpen(false);setSavedOpen(false);}},[]);
  const openSaved=useCallback((value:boolean)=>{setSavedOpen(value);if(value){setCartOpen(false);setSearchOpen(false);}},[]);
  return <Context.Provider value={{cart,saved,cartOpen,searchOpen,savedOpen,setCartOpen:openCart,setSearchOpen:openSearch,setSavedOpen:openSaved,addToCart,removeFromCart:id=>setCart(old=>old.filter(x=>x!==id)),clearCart:()=>setCart([]),toggleSaved,toast,notify}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('StoreProvider missing');return value;}
