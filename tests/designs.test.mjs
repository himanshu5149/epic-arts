import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import sharp from 'sharp';
import {unzipSync} from 'fflate';
import {generateCatalog,generatedProduct,recipeForId,styles,palettes,productFromRecipe,suggestRecipe,ENGINE_VERSION,GENERATED_COUNT,EDITIONS_PER_FAMILY,CATALOG_COUNT} from '../shared/designs.mjs';
import {renderArt} from '../server/art-engine.mjs';
import {createCatalog} from '../server/catalog.mjs';
import {openDatabase} from '../server/db.mjs';
import {createRenderer,WorkPool} from '../server/renderer.mjs';
import {metaFor,sitemapFor} from '../shared/seo.mjs';
const originals=JSON.parse(readFileSync(new URL('../shared/catalog.json',import.meta.url)));
const GENERATED=GENERATED_COUNT,CATALOG=CATALOG_COUNT,PAGE_TOTAL=Math.ceil(CATALOG/48);
const visual=svg=>svg.replace(/<title>.*?<\/title>/,'').replace(/<desc>.*?<\/desc>/,'').replace(/<g opacity="0.055">.*?<\/g>/,'');
const editionsFor=s=>[1,2,63,64,65,123,999,1000,2500,EDITIONS_PER_FAMILY].filter(e=>e<=EDITIONS_PER_FAMILY);
test(`${GENERATED.toLocaleString('en-US')} distinct compositions: unique seeds across the whole catalog, rendered divergence on boundary editions`,()=>{
 assert.equal(EDITIONS_PER_FAMILY,3600);assert.equal(GENERATED,styles.length*EDITIONS_PER_FAMILY);assert.ok(CATALOG>100000,'catalog exceeds 100,000 editions');
 // Full-catalog uniqueness is proven by recipe math (seed space), cheaply and exactly.
 const seeds=new Set();for(const s of styles)for(let e=1;e<=EDITIONS_PER_FAMILY;e++){const r=recipeForId(`${s.id}-${String(e).padStart(3,'0')}`);seeds.add(r.seed);assert.equal(r.version,ENGINE_VERSION);}
 assert.equal(seeds.size,GENERATED);
 const ids=new Set(),hashes=new Set();
 for(const s of styles)for(const e of editionsFor(s)){const id=`${s.id}-${String(e).padStart(3,'0')}`;const p=generatedProduct(id);ids.add(id);const svg=renderArt(p.recipe);assert.ok(!/NaN|Infinity|undefined/.test(svg));hashes.add(createHash('sha256').update(visual(svg)).digest('hex'));assert.equal(p.rating,0);assert.equal(p.reviewCount,0);assert.deepEqual(p.reviews,[]);}
 assert.equal(hashes.size,ids.size,'rendered boundary editions are structurally distinct, not unique-title duplicates');
});
test('appended motif families preserve every existing 1.0.0 recipe',()=>{
 assert.deepEqual(styles.slice(16,20).map(s=>s.motif),['turtle','elephant','scroll','diya']);
 assert.ok(styles.slice(0,20).every(s=>!s.master),'first twenty families keep their original identity');
 const legacy=generatedProduct('mithila-garden-001');
 assert.equal(legacy.recipe.seed,1729+0*104729+1*7919,'existing recipes must stay byte-stable');
 assert.equal(legacy.recipe.version,'1.0.0');
 for(const id of ['pond-turtle-001','royal-elephant-032','scroll-garden-048','diya-glow-064','diya-glow-3600']){
  const p=generatedProduct(id);assert.ok(p,`${id} should exist`);const svg=renderArt(p.recipe);
  assert.ok(svg.startsWith('<svg')&&!/NaN|undefined/.test(svg),`${id} svg valid`);
 }
 assert.equal(recipeForId('diya-glow-3601'),null);
 assert.equal(recipeForId('elephant-001'),null);
});
test('master homages are public-domain only, honestly labeled, and indexed last',()=>{
 const masters=styles.slice(20);
 assert.deepEqual(masters.map(s=>s.motif),['wave','nocturne','adele','orb','munch','lilies','window','muse']);
 assert.ok(masters.every(s=>s.master&&/1[0-9]{3}/.test(s.master)),'every master credit names a long-deceased (public-domain) artist');
 for(const s of masters){const p=generatedProduct(s.id+'-001');
  assert.ok(p.story.includes('public domain')&&p.story.includes('not a reproduction'),`${s.id} story is honest`);
  assert.ok(p.story.includes('no endorsement'),`${s.id} disclaims endorsement`);
  assert.ok(!p.story.includes('original artwork by'),'does not claim to BE the master work');
  assert.ok(p.category==='World masters');
 }
 assert.deepEqual(suggestRecipe('something like the great wave of kanagawa').style,'hokusai-current');
 assert.deepEqual(suggestRecipe('a van gogh starry mood').style,'starry-nocturne');
 assert.deepEqual(suggestRecipe('klimt gold mosaic').style,'golden-adele');
 assert.deepEqual(suggestRecipe('vermeer pearl earring light').style,'vermeer-window');
});
test('recipes are reproducible, versioned, bounded, and reject fabricated inventory IDs',()=>{
 const p=generatedProduct('mithila-garden-003');assert.equal(renderArt(p.recipe),renderArt({...p.recipe}));assert.equal(p.recipe.version,ENGINE_VERSION);
 for(const id of ['mithila-garden-000','mithila-garden-3601','mithila-garden-99999','../../etc/passwd','unknown-001','studio-anything'])assert.equal(recipeForId(id),null);
 assert.throws(()=>renderArt({...p.recipe,seed:Infinity}));assert.throws(()=>renderArt({...p.recipe,version:'99.0.0'}));assert.throws(()=>renderArt({...p.recipe,style:'<script>'}));
 assert.notEqual(renderArt(p.recipe),renderArt({...p.recipe,seed:p.recipe.seed+1}));
});
test('all families render actual images without external assets',async()=>{
 for(const s of styles){const p=generatedProduct(s.id+'-001'),svg=renderArt(p.recipe);assert.ok(!/https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')));const m=await sharp(Buffer.from(svg)).resize(80,100).png().toBuffer().then(b=>sharp(b).metadata());assert.equal(m.width,80);assert.equal(m.height,100);}
});
test('mood suggestions are explicit keyword matching, not a hidden AI dependency',()=>{
 assert.deepEqual(suggestRecipe('A peacock in midnight gold'),{style:'peacock-rhapsody',palette:'midnight'});
 assert.deepEqual(suggestRecipe('a quiet landscape in sand'),{style:'quiet-horizons',palette:'sand'});
 assert.deepEqual(suggestRecipe('anything unknown',{style:'sacred-lotus',palette:'indigo'}),{style:'sacred-lotus',palette:'indigo'});
});
test('indexed catalog pagination, filters, FTS, and private-product exclusion at 100k scale',()=>{
 const dir=resolve('.cache/test-catalog');rmSync(dir,{recursive:true,force:true});const db=openDatabase(dir);try{const repo=createCatalog(db,originals);
 const first=repo.search({limit:48});assert.equal(first.total,CATALOG);assert.equal(first.items.length,48);assert.equal(first.pages,PAGE_TOTAL);
 const ids=new Set();for(let page=1;page<=PAGE_TOTAL;page++)for(const p of repo.search({page,limit:48}).items)ids.add(p.id);assert.equal(ids.size,CATALOG);
 const blue=repo.search({color:'Blue',max:16,limit:48});assert.ok(blue.total>0);assert.ok(blue.items.every(p=>p.color==='Blue'&&p.price<=16));
 assert.equal(repo.search({style:'neo-deco'}).total,EDITIONS_PER_FAMILY);assert.ok(repo.search({q:'gallery prints'}).total>64);assert.equal(repo.search({q:'zzzznoartworks'}).total,0);
 assert.equal(repo.search({limit:100000}).items.length,48);assert.ok(repo.search({q:'" OR * /../../'}).items.length<=48);
 const privateProduct=productFromRecipe('studio-00000000000000000000000000000001',generatedProduct('mithila-garden-003').recipe,'A PRIVATE SECRET');repo.insert(privateProduct,{visibility:'private',owner:'test',accessHash:'hashed'});
 assert.ok(repo.get(privateProduct.id));assert.equal(repo.search({q:'PRIVATE SECRET'}).total,0);assert.equal(repo.publicCount(),CATALOG);
 const idsSlice=repo.sitemapIds(50000);assert.ok(!idsSlice.some(x=>x.id===privateProduct.id));assert.ok(idsSlice.some(x=>x.id==='mithila-garden-001'));assert.ok(idsSlice.length<=50000);
 assert.ok(!sitemapFor(idsSlice,'https://shop.example').includes(privateProduct.id));
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('generation-aware SEO has no invented ratings or AI-upscaling claim',()=>{
 const p=generatedProduct('sacred-lotus-006'),meta=metaFor('/art/'+p.id,[p],'https://shop.example');const json=JSON.stringify(meta.jsonLd);assert.ok(json.includes('Native vector generative design'));assert.ok(!json.includes('aggregateRating'));assert.ok(!json.includes('AI-assisted contemporary interpretation'));
 assert.equal(metaFor('/art/studio-private',[{...p,id:'studio-private',isPrivate:true}]).robots,'noindex, nofollow');assert.ok(metaFor('/studio').title.includes('Create Your Own'));
});
test('bounded work pool never exceeds its configured concurrency',async()=>{
 const pool=new WorkPool(2,50);let current=0,peak=0;await Promise.all(Array.from({length:24},()=>pool.run(async()=>{current++;peak=Math.max(peak,current);await new Promise(r=>setTimeout(r,3));current--;return true;})));assert.equal(peak,2);assert.equal(pool.active,0);assert.equal(pool.queue.length,0);
});
test('all families export real ZIPs, native-vector PDFs, 300-DPI raster files, recipes and licenses',async()=>{
 const dir=resolve('.cache/test-exports');rmSync(dir,{recursive:true,force:true});process.env.CACHE_DIR=dir;const renderer=createRenderer(process.cwd());try{
  for(const s of styles){const p=generatedProduct(s.id+'-006'),path=await renderer.archive(p),files=unzipSync(readFileSync(path)),prefix=p.id+'/';assert.equal(Object.keys(files).length,9);
   assert.equal(Buffer.from(files[prefix+'print-8x10-inch.pdf']).subarray(0,5).toString(),'%PDF-');const pdf=Buffer.from(files[prefix+'print-8x10-inch.pdf']).toString('latin1');assert.ok(pdf.includes('/MediaBox [0 0 576 720]'));assert.ok(!pdf.includes('/Subtype /Image'));
   const png=await sharp(files[prefix+'artwork-2400x3000.png']).metadata();assert.equal(png.width,2400);assert.equal(png.height,3000);assert.equal(png.density,300);
   assert.equal(Buffer.from(files[prefix+'artwork-scalable.svg']).toString(),renderArt(p.recipe,{title:p.name}));assert.deepEqual(JSON.parse(Buffer.from(files[prefix+'edition.json'])).recipe,p.recipe);assert.ok(files[prefix+'LICENSE.txt'].length>200);
   assert.equal(await renderer.archive(p),path);
  }
 }finally{delete process.env.CACHE_DIR;rmSync(dir,{recursive:true,force:true});}
});
