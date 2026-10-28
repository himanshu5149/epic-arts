import { Link } from 'react-router-dom';
import { Download, ArrowRight } from 'lucide-react';
import ProductCatalog from '../components/ProductCatalog';
export default function Shop(){return <><div className="breadcrumb section-shell"><Link to="/">Home</Link><span>/</span><span>The gallery</span></div><ProductCatalog standalone/><div className="shop-bottom-note section-shell"><Download size={20}/><p>All the art. None of the waiting.<span>Every piece is a downloadable digital edition. No physical products are shipped.</span></p><Link to="/print-guide">See how it works <ArrowRight size={16}/></Link></div></>;}
