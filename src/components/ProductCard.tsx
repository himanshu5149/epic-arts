import { Heart, ArrowUpRight, Plus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { money,productUrl } from '../data';
import type { Product } from '../types';
import { Stars } from './UI';
export function ArtDisplay({product,className='',detail=false}:{product:Product;className?:string;detail?:boolean}){
  return <div className={`art-display ${product.artworks.length>1?'art-display-bundle':''} ${detail?'art-display-detail':''} ${className}`} style={{background:product.background}}><div className="art-shadow"/><img src={product.image} alt={`${product.name}, ${product.tradition} digital artwork`} loading="lazy" width="900" height="1125" className={product.artworks.length>1?'bundle-image':'framed-art'}/>{detail&&<span className="art-caption">A contemporary digital edition. Frame for inspiration only.</span>}</div>;
}
export default function ProductCard({product,index=0}:{product:Product;index?:number}){
  const {saved,toggleSaved,addToCart,cart}=useStore();
  return <article className="product-card" style={{animationDelay:`${index%4*70}ms`}}>
    <div className="product-image-wrap">
      <Link to={productUrl(product)} className="product-image-link" aria-label={`View ${product.name}`}><ArtDisplay product={product}/></Link>
      {product.badge&&<span className={`product-badge ${product.badge.includes('New')?'badge-new':''}`}>{product.badge}</span>}
      <button className={`save-button ${saved.includes(product.id)?'is-saved':''}`} aria-label={`${saved.includes(product.id)?'Unsave':'Save'} ${product.name}`} aria-pressed={saved.includes(product.id)} onClick={()=>toggleSaved(product.id)}><Heart size={17} fill={saved.includes(product.id)?'currentColor':'none'} strokeWidth={1.6}/></button>
      <Link to={productUrl(product)} className="quick-view">Discover this piece <ArrowUpRight size={16}/></Link>
    </div>
    <div className="product-card-info">
      <span className="product-tradition">{product.tradition}</span>
      <div className="product-title-line"><h3><Link to={productUrl(product)}>{product.name}</Link></h3><div className="product-price">{product.compareAt&&<s>{money(product.compareAt)}</s>}{money(product.price)}</div></div>
      <div className="product-bottom-line"><span className="product-format">Digital download <span>·</span> {product.kind==='generative'?'SVG + PNG + PDF':'JPG + PDF'}</span><button className={`quick-add ${cart.includes(product.id)?'in-bag':''}`} onClick={()=>addToCart(product.id)} aria-label={`Add ${product.name} to bag`}>{cart.includes(product.id)?<Check size={17}/>:<Plus size={17}/>}</button></div>
      <div className="product-rating">{product.reviewCount>0?<><Stars rating={product.rating} small/><span>{product.rating.toFixed(1)} <span className="muted">({product.reviewCount})</span></span></>:<span className="edition-card-note">Generative edition <span>·</span> {product.color} palette</span>}</div>
    </div>
  </article>;
}
