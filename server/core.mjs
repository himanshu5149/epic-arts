import {createHash} from 'node:crypto';
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
export const hash=value=>createHash('sha256').update(String(value)).digest('hex');
export const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const clean=value=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,''):'';
export function promotion(code){const normalized=clean(code).toUpperCase();if(!normalized)return {code:'',percent:0};if(normalized!=='EPIC10')throw new HttpError(400,'That little code isn’t valid. Try EPIC10 for a 10% welcome.');return {code:normalized,percent:10};}
export function priceCart(ids,products,code=''){
 if(!Array.isArray(ids)||!ids.length||ids.length>32||ids.some(id=>typeof id!=='string'))throw new HttpError(400,'Please choose between 1 and 32 digital editions.');
 const unique=[...new Set(ids)];const items=unique.map(id=>products.find(p=>p.id===id));if(items.some(p=>!p))throw new HttpError(400,'One of those artworks isn’t in the gallery. Please refresh your bag.');
 const promo=promotion(code);const subtotal=items.reduce((a,p)=>a+Math.round(p.price*100),0);const total=items.reduce((a,p)=>a+Math.round(p.price*100*(1-promo.percent/100)),0);
 return {items,ids:unique,subtotal,total,discount:subtotal-total,promo};
}
export function validateGift(value){
 if(value===undefined||value===null||value===false)return null;
 if(typeof value!=='object')throw new HttpError(400,'Those gift details don’t look quite right.');
 const recipient=clean(value.recipient);
 if(recipient.length<2||recipient.length>60)throw new HttpError(400,'Please enter the recipient’s name (2–60 characters).');
 const message=clean(value.message||'');
 if(message.length>280)throw new HttpError(400,'A gift message can hold up to 280 characters.');
 return {recipient,message};
}
export function validateCheckout(body,products,modes=['demo','stripe']){
 if(!body||typeof body!=='object')throw new HttpError(400,'We need a few details to prepare your art.');
 const name=clean(body.name);if(name.length<2||name.length>100)throw new HttpError(400,'Please enter your name (2–100 characters).');
 const email=clean(body.email).toLowerCase();if(!validEmail(email))throw new HttpError(400,'Please enter a valid email address.');
 if(body.accept!==true)throw new HttpError(400,'Please accept the terms and request immediate digital access.');
 if(!Array.isArray(modes)||!modes.includes(body.mode))throw new HttpError(400,'Please choose an available checkout method.');
 const gift=validateGift(body.gift);
 return {...priceCart(body.ids,products,body.code),name,email,mode:body.mode,gift};
}
export function validateReview(body){
 const name=clean(body?.name),title=clean(body?.title),text=clean(body?.text),rating=body?.rating;
 if(name.length<2||name.length>60)throw new HttpError(400,'Please use a name between 2 and 60 characters.');
 if(title.length<3||title.length>100)throw new HttpError(400,'A review title should be 3–100 characters.');
 if(text.length<15||text.length>1500)throw new HttpError(400,'Tell us a little more—between 15 and 1,500 characters.');
 if(!Number.isInteger(rating)||rating<1||rating>5)throw new HttpError(400,'Please choose a rating between 1 and 5.');
 return {name,title,text,rating};
}
