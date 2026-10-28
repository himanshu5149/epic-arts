// Canonical request keys keep SSR and client pagination in agreement.
export function catalogQuery(input={},limit=24){
 const get=key=>input instanceof URLSearchParams?input.get(key):input[key];
 const p=new URLSearchParams();
 for(const key of ['q','collection','color','style','max']){const value=get(key);if(value&&value!=='All artworks'&&value!=='All colors')p.set(key,String(value));}
 p.set('sort',String(get('sort')||'curated'));p.set('page',String(get('page')||1));p.set('limit',String(limit));return p.toString();
}
