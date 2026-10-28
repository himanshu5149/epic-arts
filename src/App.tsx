import { useEffect, Component, type ReactNode } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Overlays from './components/Overlays';
import SEO from './components/SEO';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductPage from './pages/Product';
import Checkout, { CheckoutHeader } from './pages/Checkout';
import Library from './pages/Library';
import Studio from './pages/Studio';
import Collections from './pages/Collections';
import Trending from './pages/Trending';
import Wall from './pages/Wall';
import Celebrations from './pages/Celebrations';
import Inspiration from './pages/Inspiration';
import Advisor from './pages/Advisor';
import { OurStory, PrintGuide, FAQ, Policy, NotFound } from './pages/Info';
import { Journal, JournalArticle } from './pages/Journal';
function ScrollManager(){const {pathname,hash}=useLocation();useEffect(()=>{if(hash){const id=decodeURIComponent(hash.slice(1));const timer=setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),80);return()=>clearTimeout(timer);}window.scrollTo({top:0,behavior:'instant'});},[pathname,hash]);return null;}
class ErrorBoundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<div className="not-found section-shell"><h1>A little pause.</h1><p>Something unexpected happened. Your cart is safely saved on this device.</p><a className="button button-primary" href="/">Open the gallery again</a></div>:this.props.children;}}
export default function App(){const {pathname}=useLocation();const checkout=pathname==='/checkout';return <ErrorBoundary><a className="skip-link" href="#main-content">Skip to content</a><SEO/><ScrollManager/>{checkout?<CheckoutHeader/>:<Header/>}<main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/advisor" element={<Advisor/>}/><Route path="/studio" element={<Studio/>}/><Route path="/collections" element={<Collections/>}/><Route path="/trending" element={<Trending/>}/><Route path="/wall" element={<Wall/>}/><Route path="/celebrations" element={<Celebrations/>}/><Route path="/inspiration" element={<Inspiration/>}/><Route path="/art/:slug" element={<ProductPage/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/library" element={<Library/>}/><Route path="/our-story" element={<OurStory/>}/><Route path="/print-guide" element={<PrintGuide/>}/><Route path="/faq" element={<FAQ/>}/><Route path="/policies/:type" element={<Policy/>}/><Route path="/journal" element={<Journal/>}/><Route path="/journal/:slug" element={<JournalArticle/>}/><Route path="*" element={<NotFound/>}/></Routes></main>{!checkout&&<Footer/>}<Overlays/></ErrorBoundary>;}
