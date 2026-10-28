import {createHash} from 'node:crypto';
import {generateCatalog,generatedProduct,ENGINE_VERSION,styles} from '../shared/designs.mjs';
export function createCatalog(db,originals){
 // 100k-edition storage strategy: public generative editions store only their recipe and
 // are rehydrated deterministically on read (recipes byte-define the document). Originals,
 // private studio pieces and order snapshots keep full documents. Search words skip the
 // long description — the curated tag vocabulary covers discovery.
 const docFor=p=>p.kind==='generative'&&!p.isPrivate?JSON.stringify({g:1,id:p.id}):JSON.stringify(p);
 const expand=document=>{const d=JSON.parse(document);return d&&d.g?generatedProduct(d.id):d;};
 const wordsFor=p=>[p.name,p.tradition,p.category,p.color,p.tags||''].join(' ');
 db.exec(`CREATE TABLE IF NOT EXISTS catalog_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS catalog_products(id TEXT PRIMARY KEY,document TEXT NOT NULL,visibility TEXT NOT NULL DEFAULT 'public',owner_hash TEXT,access_hash TEXT,category TEXT NOT NULL,color TEXT NOT NULL,style TEXT NOT NULL,price_cents INTEGER NOT NULL,created TEXT NOT NULL,curated INTEGER NOT NULL,trend INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS catalog_filter ON catalog_products(visibility,category,color,price_cents);
 CREATE INDEX IF NOT EXISTS catalog_sort ON catalog_products(visibility,curated);
 CREATE INDEX IF NOT EXISTS catalog_owner ON catalog_products(owner_hash);
 CREATE VIRTUAL TABLE IF NOT EXISTS catalog_fts USING fts5(id UNINDEXED,words,tokenize='unicode61 remove_diacritics 2');`);
 // The family roster is part of the seed identity: appending a family re-seeds public
 // rows (private Studio products and purchased snapshots are never touched). Existing
 // recipe versions and deterministic outputs stay byte-identical.
 const version=createHash('sha256').update(ENGINE_VERSION+JSON.stringify(originals)+styles.map(s=>s.id).join(',')).digest('hex');
 const write=db.prepare(`INSERT INTO catalog_products(id,document,visibility,owner_hash,access_hash,category,color,style,price_cents,created,curated,trend) VALUES(@id,@document,@visibility,@owner_hash,@access_hash,@category,@color,@style,@price_cents,@created,@curated,@trend) ON CONFLICT(id) DO UPDATE SET document=excluded.document,category=excluded.category,color=excluded.color,price_cents=excluded.price_cents,curated=excluded.curated,trend=excluded.trend`);
 function insert(p,{visibility='public',owner=null,accessHash=null,rank=10000,freshFts=false}={}){
  // Public generative rows are definitionally immutable: recipes derive them, so any write
  // re-canonicalizes from the recipe. A forged price/name/category cannot enter the catalog.
  if(p.kind==='generative'&&!p.isPrivate){const canon=generatedProduct(p.id);if(canon)p=canon;}
  const trend=['color-rhythm','mithila-garden','neo-deco','meadow-study','blockprint-bloom','quiet-horizons'].indexOf(p.style);
  write.run({id:p.id,document:docFor(p),visibility,owner_hash:owner,access_hash:accessHash,category:p.category,color:p.color,style:p.style||'original',price_cents:Math.round(p.price*100),created:p.created,curated:rank,trend:trend<0?100:trend});
  // FTS5 per-row deletes rewrite index segments — catastrophically slow at 100k scale.
  // After a full-table clear (seeding) the delete is provably a no-op, so skip it there.
  if(!freshFts)db.prepare('DELETE FROM catalog_fts WHERE id=?').run(p.id);
  if(visibility==='public')db.prepare('INSERT INTO catalog_fts(id,words) VALUES(?,?)').run(p.id,wordsFor(p));
 }
 if(db.prepare("SELECT value FROM catalog_meta WHERE key='seed-version'").get()?.value!==version)db.transaction(()=>{
  db.exec("DELETE FROM catalog_products WHERE visibility='public'; DELETE FROM catalog_fts;");
  originals.forEach((p,i)=>insert(p,{rank:i,freshFts:true}));let i=0;
  for(const p of generateCatalog()){const styleIndex=styles.findIndex(s=>s.id===p.style);insert(p,{rank:100+(p.recipe.edition-1)*16+styleIndex,freshFts:true});i++;}
  db.prepare("INSERT OR REPLACE INTO catalog_meta(key,value) VALUES('seed-version',?)").run(version);
  db.exec("INSERT INTO catalog_fts(catalog_fts) VALUES('optimize')");console.log(`Catalog indexed: ${originals.length+i} real digital editions.`);
 })();
 const row=id=>db.prepare('SELECT * FROM catalog_products WHERE id=?').get(id);
 const get=id=>{const found=row(id);return found?expand(found.document):undefined;};
 const publicProducts=()=>db.prepare("SELECT document FROM catalog_products WHERE visibility='public' ORDER BY curated LIMIT 200000").all().map(x=>expand(x.document)).filter(Boolean);
 function search(input={}){
  const q=String(input.q||'').trim().slice(0,100),collection=String(input.collection||''),color=String(input.color||''),style=String(input.style||''),sort=String(input.sort||'curated');
  const limit=Math.max(1,Math.min(48,Math.floor(Number(input.limit)||24))),requestedPage=Math.max(1,Math.min(100000,Math.floor(Number(input.page)||1)));
  const where=["p.visibility='public'"],values=[];
  if(collection&&collection!=='All artworks'){where.push('p.category=?');values.push(collection);}
  if(color&&color!=='All colors'){where.push('p.color=?');values.push(color);}
  if(style){where.push('p.style=?');values.push(style);}
  if(input.max!==undefined&&input.max!==''&&Number.isFinite(Number(input.max))){where.push('p.price_cents<=?');values.push(Math.max(0,Math.min(100000,Math.round(Number(input.max)*100))));}
  const terms=q.match(/[\p{L}\p{N}]+/gu)?.slice(0,10)||[];
  if(terms.length){where.push('p.id IN (SELECT id FROM catalog_fts WHERE catalog_fts MATCH ?)');values.push(terms.map(x=>'"'+x+'"*').join(' AND '));}
  const from=' FROM catalog_products p WHERE '+where.join(' AND '),total=db.prepare('SELECT count(*) AS n'+from).get(...values).n,pages=Math.max(1,Math.ceil(total/limit)),page=Math.min(requestedPage,pages);
  const order=({'price-low':'p.price_cents ASC,p.curated','price-high':'p.price_cents DESC,p.curated',newest:'p.created DESC,p.curated',rating:'(SELECT coalesce(avg(r.rating),0) FROM reviews r JOIN orders o ON o.id=r.order_id WHERE r.product_id=p.id AND o.status=\'paid\') DESC,p.curated',popular:"(SELECT count(*) FROM orders o,json_each(o.ids_json) j WHERE o.status='paid' AND j.value=p.id) DESC,p.curated",trending:"CASE WHEN p.style='original' THEN 999 ELSE ((p.curated-100)/16) END,p.trend,p.curated"})[sort]||'p.curated';
  const items=db.prepare('SELECT p.document'+from+' ORDER BY '+order+' LIMIT ? OFFSET ?').all(...values,limit,(page-1)*limit).map(r=>expand(r.document)).filter(Boolean);
  return {items,total,page,pages,limit,catalogTotal:db.prepare("SELECT count(*) AS n FROM catalog_products WHERE visibility='public'").get().n,sort,query:q};
 }
 // Sitemap identity list stays bounded: beyond the curated top slice, product pages remain
 // crawlable through paginated /shop links — a 100k-URL sitemap would harm crawl budgeting.
 const sitemapIds=limit=>db.prepare("SELECT id FROM catalog_products WHERE visibility='public' ORDER BY curated LIMIT ?").all(Math.max(0,Math.min(50000,limit)));
 const publicCount=()=>db.prepare("SELECT count(*) AS n FROM catalog_products WHERE visibility='public'").get().n;
 return {insert:(p,options)=>db.transaction(()=>insert(p,options))(),get,row,search,publicProducts,sitemapIds,publicCount};
}
