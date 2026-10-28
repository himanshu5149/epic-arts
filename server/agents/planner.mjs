// Specialist-role + retrieve/validate/present workflow adapted from awesome-llm-apps.
// This no-key path is deterministic catalog retrieval, not simulated LLM intelligence.
import {styles,palettes,ENGINE_VERSION} from '../../shared/designs.mjs';
import {directions,rooms} from '../../shared/agents.mjs';
import {HttpError} from '../core.mjs';
import {assertTool,digest} from './audit.mjs';
const clean=s=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();
export function validateBrief(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new HttpError(400,'Please send a gallery brief.');
 if(typeof raw.brief!=='string'||clean(raw.brief).length<5||raw.brief.length>700)throw new HttpError(400,'Tell us a little more, in 5–700 characters.');
 const budget=raw.budget===undefined?60:Number(raw.budget),count=raw.count===undefined?3:Number(raw.count);
 if(!Number.isFinite(budget)||budget<1||budget>300||Math.abs(Math.round(budget*100)-budget*100)>0.000001)throw new HttpError(400,'Choose a total artwork budget from $1 to $300 USD, with at most two decimal places.');
 if(![1,2,3,4].includes(count))throw new HttpError(400,'A little wall can hold 1–4 editions.');
 const palette=raw.palette||'auto',direction=raw.direction||'heritage',room=raw.room||'living',intent=raw.intent||'collection';
 if(palette!=='auto'&&!palettes.some(p=>p.id===palette))throw new HttpError(400,'Choose one of the gallery palettes.');
 if(!directions.some(d=>d.id===direction)||!rooms.some(r=>r.id===room)||!['collection','question'].includes(intent))throw new HttpError(400,'Those gallery settings are not supported.');
 if(raw.useLlm!==undefined&&typeof raw.useLlm!=='boolean')throw new HttpError(400,'Connected-model consent must be an explicit choice.');
 if(raw.exclude!==undefined&&(!Array.isArray(raw.exclude)||raw.exclude.length>16||raw.exclude.some(id=>typeof id!=='string'||!/^[a-z0-9-]{1,90}$/.test(id)||id.startsWith('studio-'))))throw new HttpError(400,'Only public edition references can be excluded.');
 return {brief:clean(raw.brief),budgetCents:Math.round(budget*100),count,palette,direction,room,intent,exclude:[...new Set(raw.exclude||[])],useLlm:raw.useLlm===true};
}
export function preferences(input){
 const text=input.brief.toLowerCase();let palette=input.palette;
 if(palette==='auto'){
  const hints=[[/\b(?:midnight|gold|dark)\b/,'midnight'],[/\b(?:patina|teal)\b/,'patina'],[/\b(?:indigo|blue)\b/,'indigo'],[/\b(?:green|forest|sage)\b/,'forest'],[/\b(?:rose|pink|clay|terracotta)\b/,'rose'],[/\b(?:bright|saffron|yellow)\b/,'saffron'],[/\b(?:neutral|sand|beige)\b/,'sand']];
  palette=hints.find(([re])=>re.test(text))?.[1]||(['minimal'].includes(input.direction)?'sand':'heritage');
 }
 const budgetMention=/\b(?:under|within|budget(?:\s+of)?|up\s+to|maximum)\s*\$?\s*(\d+(?:\.\d{1,2})?)(?!\d|\.)(?:\s*(?:usd|dollars?))?(?!\s*(?:each|per\s*(?:piece|print|artwork)))/i.exec(text);
 const mentioned=budgetMention?Math.round(Number(budgetMention[1])*100):input.budgetCents;
 const budgetCents=Math.max(0,Math.min(input.budgetCents,mentioned));
 const notMithila=/\b(?:no|not|without)\s+(?:mithila|madhubani)\b/.test(text);
 const category=!notMithila&&/\bmithila|madhubani\b/.test(text)?'Mithila':null;
 let eligible=styles.filter(s=>!category||s.category===category);
 if(notMithila)eligible=eligible.filter(s=>s.category!=='Mithila');
 if(!category){const filters={heritage:s=>s.heritage,botanical:s=>s.category==='Botanical',minimal:s=>['quiet-horizons','desert-arches','cosmic-orbit'].includes(s.id),bold:s=>['color-rhythm','neo-deco','moonlit-garden'].includes(s.id),open:()=>true};eligible=eligible.filter(filters[input.direction]);}
 const motifHints=[[/\bpeacock|feather\b/,'peacock-rhapsody'],[/\bfish\b/,'fish-fables'],[/\bwarli\b/,'warli-rhythm'],[/\bblock.?print\b/,'blockprint-bloom'],[/\bmandala\b/,'sacred-lotus'],[/\bpalace\b/,'palace-botanicals'],[/\bdeco\b/,'neo-deco'],[/\blotus\b/,'lotus-atelier'],[/\bmeadow|wildflower\b/,'meadow-study']];
 const preferred=motifHints.filter(([re])=>re.test(text)).map(([,id])=>id);
 // A named family is an explicit cue. Never silently broaden a Mithila request into another tradition.
 if(preferred.length&&!category)eligible=styles.filter(s=>preferred.includes(s.id)||eligible.some(e=>e.id===s.id));
 return {palette,budgetCents,category,styles:eligible.map(s=>s.id),preferred};
}
export function createPlanner(catalog,knowledge){
 async function prepare(input,record){
  const pref=preferences(input),palette=palettes.find(p=>p.id===pref.palette);
  assertTool('curator','search_catalog');
  const candidates=[];
  // At most 16 indexed, 16-row reads; at most 128 matching products before ranking.
  for(const style of pref.styles){const page=catalog.search({style,color:palette.color,limit:16,max:pref.budgetCents/100});for(const p of page.items){if(p.kind==='generative'&&p.recipe?.version===ENGINE_VERSION&&p.recipe?.palette===pref.palette&&!input.exclude.includes(p.id)&&p.artworks.length===1&&!p.isPrivate)candidates.push(p);}}
  const meaningful=input.brief.toLowerCase().match(/\b(?:peacock|fish|lotus|tree|garden|warli|palace|deco|meadow|wildflower|arch|moon|celestial|mandala|lattice|blockprint|bold|abstract|botanical|geometric)\b/g)||[];
  const ranked=candidates.map(p=>{const s=styles.find(s=>s.id===p.style);const words=[p.name,p.tags,p.tradition].join(' ').toLowerCase();return {...p,_score:(s?.heritage?8:0)+(pref.preferred.includes(p.style)?16:0)+meaningful.filter(w=>words.includes(w)).length*6+parseInt(digest(input.brief+p.id).slice(0,4),16)/65536};}).sort((a,b)=>b._score-a._score);
  // Preserve low-cost and less-prominent families rather than letting high scores starve the budget solver.
  const fair=[];for(let round=0;round<4;round++)for(const style of pref.styles){const p=ranked.filter(p=>p.style===style)[round];if(p)fair.push(p);}
  for(const p of ranked)if(fair.length<64&&!fair.some(q=>q.id===p.id))fair.push(p);
  ranked.splice(0,ranked.length,...fair.sort((a,b)=>b._score-a._score).slice(0,64));
  // Budget-solver guarantee: score-based curation must not starve cheaper families out of
  // the pool at large family counts — always anchor the cheapest candidates per price tier.
  const anchors=new Map();for(const p of candidates){const price=Math.round(p.price*100);const arr=anchors.get(price)||[];if(arr.length<4&&!arr.some(q=>q.id===p.id))arr.push(p);anchors.set(price,arr);}
  for(const p of [...anchors.values()].flat())if(!ranked.some(q=>q.id===p.id))ranked.push(p);
  record('curator','search_catalog',{styles:pref.styles,palette:pref.palette,maxCents:pref.budgetCents},{ids:ranked.map(p=>p.id)},{text:`Retrieved ${ranked.length} eligible public editions in ${palette.name}.`,matches:ranked.length});
  assertTool('heritage','search_guides');
  const guides=input.intent==='question'?questionGuides(input.brief):[knowledge.read('provenance'),knowledge.read('digital-only')];
  const trend=/\b(?:trends?|popular(?:ity)?|best.?sell(?:ers?|ing)?|demand|search volumes?|etsy|pinterest)\b/i.test(input.brief)?knowledge.evidence():null;
  if(trend){assertTool('heritage','trend_evidence');if(!guides.some(g=>g.id==='trend-method'))guides.push(knowledge.read('trend-method'));}
  record('heritage','search_guides',{query:input.brief},{ids:guides.map(g=>g.id),trend:trend?.reviewed||null},{text:input.intent==='question'?`Retrieved ${guides.length} reviewed guide passages.`:'Checked contemporary provenance. No handmade or antique claim.',sources:guides.length});
  return {pref,palette,candidates:ranked,guides,trend};
 }
 function questionGuides(text){
  // A confidence gate: ordinary overlap with words like “today” must not manufacture an answer.
  const topics=[[/refund|return|faulty|non.?delivery|cancel/i,['refunds']], [/license|licence|commercial|sell|resale|copyright|exclusive|gift|business|copies|redistribut/i,['personal-license']], [/hand.?paint|handmade|artisan|authentic|antique|tradition|mithila|madhubani|warli|heritage|provenance/i,['provenance']], [/where.*(?:order|download|file)|lost|my order|access link|missing|unzip|zip|recover/i,['download-library']], [/resolution|upscal|pixels|raster|original eight|large.?print/i,['raster-files','vector-files']], [/file|format|svg|png|pdf|jpg|vector/i,['vector-files','raster-files']], [/paper|printer|printing|frame|print size|print.*size|a4|8.?10|5.?7|print my|print these/i,['paper-settings','vector-files']], [/physical|ship|delivery/i,['digital-only']], [/trend|popular|best.?sell|demand|search volume|etsy|pinterest/i,['trend-method']], [/privacy|personal data|delete|model|api key|openai/i,['privacy']], [/studio|creat|seed|custom|matching/i,['studio']], [/pay|checkout|stripe|demo|tax|price|bag|cart/i,['checkout']]];
  const ids=[...new Set(topics.filter(([re])=>re.test(text)).flatMap(([,ids])=>ids))].slice(0,4);
  if(!ids.length)return [];
  // Always perform retrieval first; topic routing selects among the reviewed corpus, never model facts.
  const retrieved=knowledge.search(text,4);return ids.map(id=>retrieved.find(g=>g.id===id)||knowledge.read(id)).filter(Boolean);
 }
 function fit(input,prepared,preferredIds=[]){
  assertTool('stylist','fit_collection');
  const {candidates,pref}=prepared;const byId=new Map(candidates.map(p=>[p.id,p]));
  if(preferredIds.length){
   if(preferredIds.length!==input.count||new Set(preferredIds).size!==input.count||preferredIds.some(id=>!byId.has(id)))throw new Error('Unverified model product selection.');
   const selection=preferredIds.map(id=>byId.get(id));if(selection.reduce((n,p)=>n+Math.round(p.price*100),0)>pref.budgetCents)throw new Error('Model selection exceeds budget.');return selection;
  }
  let beam=[{items:[],cost:0,score:0,index:-1,styles:[]}];
  for(let depth=0;depth<input.count;depth++){
   const next=[];
   for(const state of beam)for(let i=state.index+1;i<candidates.length;i++){const p=candidates[i],cost=state.cost+Math.round(p.price*100);if(cost>pref.budgetCents)continue;const remaining=input.count-depth-1,cheapest=candidates.slice(i+1).map(p=>Math.round(p.price*100)).sort((a,b)=>a-b).slice(0,remaining);if(cheapest.length<remaining||cost+cheapest.reduce((a,b)=>a+b,0)>pref.budgetCents)continue;const fresh=!state.styles.includes(p.style);next.push({items:[...state.items,p],cost,score:state.score+p._score+(fresh?30:-12),index:i,styles:[...state.styles,p.style]});}
   beam=next.sort((a,b)=>b.score-a.score||a.cost-b.cost).slice(0,96);if(!beam.length)break;
  }
  return beam.find(s=>s.items.length===input.count)?.items||[];
 }
 async function finish(input,prepared,selection,record,execution){
  // catalog.get rehydrates compact public-edition rows into full product documents.
  const {pref,palette,trend}=prepared;const items=input.intent==='collection'?selection.map(p=>{const row=catalog.row(p.id);if(row?.visibility!=='public')throw new Error('Edition no longer public.');const product=catalog.get(p.id);if(!product)throw new Error('Edition could not be expanded.');return product;}):[],totalCents=items.reduce((n,p)=>n+Math.round(p.price*100),0);
  // Authoritative gate, repeated after all optional model output. Model prices and URLs are never accepted.
  if(items.some(p=>catalog.row(p.id)?.visibility!=='public'||p.isPrivate||p.kind!=='generative'||p.recipe?.version!==ENGINE_VERSION||p.recipe?.palette!==pref.palette||!pref.styles.includes(p.style))||totalCents>pref.budgetCents||new Set(items.map(p=>p.id)).size!==items.length)throw new Error('Collection validation failed.');
  record('stylist','fit_collection',{count:input.count,budgetCents:pref.budgetCents},{ids:items.map(p=>p.id),totalCents},{text:input.intent==='question'?'No bag or order changes were made.':items.length?`${items.length} editions checked at $${(totalCents/100).toFixed(2)} total. Within your artwork budget.`:'No complete collection fits these constraints. Your budget was not exceeded.',totalCents,budgetCents:pref.budgetCents});
  assertTool('print','search_guides');
  const printGuide=knowledge.read('vector-files');const guides=[...prepared.guides];
  if(input.intent==='collection'&&!guides.some(g=>g.id===printGuide.id))guides.push(printGuide);
  record('print','search_guides',{ids:items.map(p=>p.id)},{guideIds:guides.map(g=>g.id)},{text:input.intent==='collection'?(items.length?'Confirmed native vector files, three PDF sizes, and digital-only delivery.':'No editions selected; retrieved the standard vector-file guide.'):'Answers are quoted from reviewed gallery guides. No private order lookup.',sources:guides.length});
  const noMatch=input.intent==='collection'&&!items.length;
  const summary=input.intent==='question'?(guides.length?'Here is what the gallery can confirm.':'I can help with Epic Arts editions, printing, licenses, provenance and published art research. I could not verify an answer to that question from our gallery guides.'):(noMatch?`I couldn’t find a complete ${input.count}-edition collection within $${(pref.budgetCents/100).toFixed(2)} in this direction and palette. Try a smaller wall, another direction, or a higher budget. I haven’t substituted more expensive work.`:`A ${items.length}-edition collection in ${palette.name}, with ${new Set(items.map(p=>p.style)).size} complementary ${new Set(items.map(p=>p.style)).size===1?'family':'families'}. $${(totalCents/100).toFixed(2)} in digital artwork, within your $${(pref.budgetCents/100).toFixed(2)} total budget.`);
  const style=items[0]?.style||pref.preferred[0]||pref.styles[0]||'mithila-garden',seed=parseInt(digest(input.brief+items.map(p=>p.id).join(',')).slice(0,8),16)&0x7fffffff;
  const studioUrl='/studio?'+new URLSearchParams({from:'advisor',style,palette:pref.palette,seed:String(seed)}).toString();
  return {version:'1.0.0',intent:input.intent,title:input.intent==='question'?'A little clarity.':noMatch?'A little adjustment.':'A wall with a little soul.',summary,items,totalCents,budgetCents:pref.budgetCents,palette:palette.id,paletteName:palette.name,room:input.room,count:input.count,noMatch,guides:guides.map(({keywords,...g})=>g),trend:trend?{reviewed:trend.reviewed,liveSearchVolumeAvailable:false,signals:trend.signals,sources:trend.sources}:null,recipe:{version:ENGINE_VERSION,style,palette:pref.palette,seed,detail:3},studioUrl,execution,checkedAt:new Date().toISOString(),notes:['Contemporary inspired editions, not artisan-made originals.','Digital files only. Printing and frames are separate.','USD artwork value before discounts or any checkout taxes. Prices are checked again at checkout.']};
 }
 return {prepare,fit,finish};
}
