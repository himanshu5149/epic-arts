// Inspiration-shelf service: read-only, keyless queries against the Art Institute of
// Chicago public API (discovered via public-apis/public-apis). These are museum
// references for inspiration only — never imported as Epic Arts products.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { HttpError } from './core.mjs';

const TTL=6*3600e3, MAX_CACHE=240, UPSTREAM='https://api.artic.edu';
export function validateQuery(q){
  const s=String(q??'').trim().replace(/\s+/g,' ');
  return s.length>=2&&s.length<=60&&/^[\p{L}\p{N} '&.,()-]+$/u.test(s)?s:null;
}
export const validImageId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
// Pure, testable transform: public-domain works with usable imagery only.
export function refCards(body,limit=12){
  const data=Array.isArray(body?.data)?body.data:[];
  return data.filter(a=>a&&a.is_public_domain===true&&validImageId(a.image_id)&&typeof a.id==='number'&&typeof a.title==='string')
    .slice(0,limit).map(a=>({id:a.id,title:String(a.title).slice(0,140),artist:typeof a.artist_title==='string'?a.artist_title.slice(0,120):'Unknown artist',date:typeof a.date_display==='string'?a.date_display.slice(0,60):'',imageId:a.image_id,museumUrl:`https://www.artic.edu/artworks/${a.id}`,note:'Public-domain reference — not an Epic Arts product'}));
}
export function createReferenceService(root){
  const cacheDir=resolve(root,'.cache/reference-thumbs');mkdirSync(cacheDir,{recursive:true});
  const memory=new Map();
  const search=async(q,{fetchImpl=fetch}={})=>{
    const key=q.toLowerCase();const hit=memory.get(key);
    if(hit&&Date.now()-hit.at<TTL)return hit.items;
    if(hit)memory.delete(key);
    const url=UPSTREAM+'/api/v1/artworks/search?'+new URLSearchParams({q,fields:'id,title,artist_title,date_display,image_id,is_public_domain',limit:'18'});
    const r=await fetchImpl(url,{signal:AbortSignal.timeout(9000),headers:{accept:'application/json','user-agent':'epic-arts-inspiration/1.0'}});
    if(!r.ok)throw new HttpError(502,'The museum answered unexpectedly.');
    const items=refCards(await r.json());
    memory.set(key,{at:Date.now(),items});
    if(memory.size>MAX_CACHE){const oldest=memory.keys().next().value;memory.delete(oldest);}
    return items;
  };
  const thumb=async(imageId,{fetchImpl=fetch}={})=>{
    if(!validImageId(imageId))throw new HttpError(400,'That museum reference isn’t valid.');
    const file=resolve(cacheDir,imageId+'.jpg');
    if(existsSync(file))return readFileSync(file);
    const r=await fetchImpl(`https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`,{signal:AbortSignal.timeout(9000)});
    if(!r.ok)throw new HttpError(404,'That reference image isn’t available.');
    const buf=Buffer.from(await r.arrayBuffer());
    if(buf.length>900*1024)throw new HttpError(502,'That reference image was unexpectedly large.');
    writeFileSync(file,buf);return buf;
  };
  return {search,thumb};
}
