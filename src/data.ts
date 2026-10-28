import catalog from '../shared/catalog.json';
import type { Product } from './types';
import {generatedProduct} from '../shared/designs.mjs';
export {categories} from '../shared/designs.mjs';
export const products = catalog as Product[];
export const money = (amount: number, decimals = false) => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD', maximumFractionDigits:decimals?2:0, minimumFractionDigits:decimals?2:0}).format(amount);
export const getProduct = (id: string) => products.find(p => p.id === id) || generatedProduct(id) as Product | undefined;

export const productUrl=(p:Product)=>'/art/'+p.id+(p.isPrivate&&p.accessToken?'?studio_token='+encodeURIComponent(p.accessToken):'');
