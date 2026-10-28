import {styles,palettes,generatedProduct,ENGINE_VERSION} from './designs.mjs';
import {printSize} from './printing.mjs';

// Original curatorial combinations of existing Epic Arts editions, not new SKUs,
// licensed third-party images, discounts, or claims about a single cultural origin.
export const WALL_EDITS=[
  {id:'mithila-morning',name:'A Mithila morning',tag:'MITHILA-INSPIRED · EARTH',description:'A tree, a feather, a quiet little pond. Three contemporary Mithila-inspired compositions, connected by a warm earth palette.',room:'A living-room nook',ids:['mithila-garden-001','peacock-rhapsody-001','fish-fables-001'],wall:'chalk',layout:'row',note:'Contemporary generative interpretations, not traditional hand-painted originals.'},
  {id:'indigo-stories',name:'Stories in indigo',tag:'MITHILA-INSPIRED · BLUE',description:'Botanical lines and paired birds, brought together by a shared indigo palette. A thoughtful starting point for an entrance or reading corner.',room:'An entrance or reading corner',ids:['mithila-garden-002','fish-fables-010','peacock-rhapsody-018'],wall:'linen',layout:'stepped',note:'Three individual native-vector editions. No frame or print is included.'},
  {id:'pond-and-petal',name:'Pond & petal',tag:'BOTANICAL PAIRING · FOREST',description:'A Mithila-inspired fish study beside a contemporary lotus composition. Two distinct ideas, gently connected through Forest Linen.',room:'A bedside or quiet study',ids:['fish-fables-003','lotus-atelier-011'],wall:'sage',layout:'row',note:'A cross-family botanical pairing; the lotus study is not represented as an authenticated Mithila work.'},
  {id:'palace-after-dark',name:'The palace after dark',tag:'ARCHITECTURAL EDIT · MIDNIGHT',description:'Garden arches, lattice and repeat pattern in Midnight Gold. A contemporary conversation between architecture and ornament.',room:'A dining-room wall',ids:['palace-botanicals-006','temple-lattice-014','blockprint-bloom-022'],wall:'clay',layout:'row',note:'Architectural and blockprint-inspired digital designs; not historical artifacts or religious objects.'},
  {id:'folk-in-clay',name:'A rhythm in clay',tag:'FOLK-INSPIRED PAIRING · ROSE',description:'Warli-inspired geometry and a blockprint-inspired floral pattern. Paired through color, without treating distinct living traditions as interchangeable.',room:'A creative corner',ids:['warli-rhythm-005','blockprint-bloom-013'],wall:'linen',layout:'row',note:'These are different inspirations, paired by palette. No claim of artisan authorship or cultural authenticity.'},
  {id:'garden-quartet',name:'A small garden, together',tag:'HERITAGE GARDEN · FOUR EDITIONS',description:'Four complementary digital pieces for a little more possibility: a garden, peacocks, fish and lotus. Warm, detailed, and easy to make your own.',room:'A compact gallery wall',ids:['mithila-garden-009','peacock-rhapsody-017','fish-fables-025','lotus-atelier-033'],wall:'chalk',layout:'grid',note:'A coordinated edit of four separately licensed digital editions, including a contemporary lotus study.'},
];
export const WALL_TONES=[{id:'chalk',name:'Soft chalk',color:'#ede9df'},{id:'linen',name:'Warm linen',color:'#ded5c5'},{id:'sage',name:'Quiet sage',color:'#bac5b4'},{id:'clay',name:'Rose clay',color:'#b88f7c'},{id:'ink',name:'Deep olive',color:'#35473b'}];
export const FRAME_TONES=[{id:'walnut',name:'Walnut',color:'#634c37'},{id:'oak',name:'Light oak',color:'#bb9871'},{id:'ink',name:'Soft black',color:'#2b302c'}];
export const WALL_STORAGE_KEY='epic-wall-plan-v1';
export const heritageStyles=styles.filter(s=>s.heritage);
const legacyIds=new Set(['tree-of-life','peacock-pair','lotus-pond','warli-dance','surya','sacred-bloom']);
export function isWallProduct(p){return !!p&&typeof p.id==='string'&&!p.id.startsWith('studio-')&&!p.isPrivate&&p.artworks?.length===1&&((!p.kind&&legacyIds.has(p.id))||(p.kind==='generative'&&p.recipe?.version===ENGINE_VERSION&&heritageStyles.some(s=>s.id===p.style)));}
const pick=(value,values,fallback)=>values.includes(value)?value:fallback;
const bounded=(value,min,max,fallback)=>{if(value===null||value===undefined||value==='')return fallback;const n=Number(value);return Number.isFinite(n)?Math.round(Math.min(max,Math.max(min,n))*100)/100:fallback;};
/** @param {any} raw @param {(id:string)=>any} resolve */
export function normalizeWallPlan(raw={},resolve=generatedProduct){
  if(!raw||typeof raw!=='object'||(raw.version!==undefined&&raw.version!==1))raw={};
  const get=key=>typeof raw.get==='function'?raw.get(key):raw[key];
  const edit=WALL_EDITS.find(e=>e.id===get('edit'))||WALL_EDITS[0];
  const list=Array.isArray(get('ids'))?get('ids'):typeof get('art')==='string'&&get('art').length<=400?get('art').split(','):[];
  const ids=[...new Set(list.filter(id=>typeof id==='string'&&id.length<90&&isWallProduct(resolve(id))))].slice(0,4);
  return {version:1,edit:edit.id,ids:ids.length?ids:[...edit.ids],paper:pick(get('paper'),['5x7','8x10','a4'],'8x10'),layout:pick(get('layout'),['row','stepped','grid'],edit.layout),wall:pick(get('wall'),WALL_TONES.map(t=>t.id),edit.wall),frame:pick(get('frame'),FRAME_TONES.map(t=>t.id),'walnut'),wallCm:bounded(get('wallCm'),80,500,160),gapCm:bounded(get('gapCm'),2,16,6),matCm:pick(Number(get('matCm')??2),[0,2,3],2),hang:bounded(get('hang'),20,65,38)};
}
/** @param {any} edit @param {(id:string)=>any} resolve */
export function planForEdit(edit,resolve=generatedProduct){return normalizeWallPlan({edit:edit.id,ids:edit.ids,wall:edit.wall,layout:edit.layout},resolve);}
export function wallGeometry(plan){
  const size=printSize(plan.paper),outerWidthCm=size.widthCm+2*(plan.matCm+0.6),outerHeightCm=size.heightCm+2*(plan.matCm+0.6),n=plan.ids.length;
  const columns=plan.layout==='grid'&&n>2?2:n,rows=plan.layout==='grid'?Math.ceil(n/columns):1;
  const widthCm=columns*outerWidthCm+(columns-1)*plan.gapCm,heightCm=rows*outerHeightCm+(rows-1)*plan.gapCm+(plan.layout==='stepped'&&n>1?6:0);
  const positions=plan.ids.map((id,i)=>{const row=plan.layout==='grid'?Math.floor(i/columns):0;const itemsInRow=Math.min(columns,n-row*columns);return {id,x:(widthCm-(itemsInRow*outerWidthCm+(itemsInRow-1)*plan.gapCm))/2+(i%columns)*(outerWidthCm+plan.gapCm)+outerWidthCm/2,y:row*(outerHeightCm+plan.gapCm)+outerHeightCm/2+(plan.layout==='stepped'&&i%2?6:0)};});
  return {widthCm,heightCm,outerWidthCm,outerHeightCm,fits:widthCm<=plan.wallCm,positions};
}
/** @param {any} plan @param {(id:string)=>any} resolve */
export function wallTotal(plan,resolve=generatedProduct){return plan.ids.reduce((sum,id)=>{const p=resolve(id);return sum+(isWallProduct(p)?Math.round(p.price*100):0);},0)/100;}
/** @param {any} plan @param {(id:string)=>any} resolve */
export function wallQuery(plan,resolve=generatedProduct){const safe=normalizeWallPlan(plan,resolve);const out=new URLSearchParams();out.set('edit',safe.edit);out.set('art',safe.ids.join(','));for(const key of ['paper','layout','wall','frame','wallCm','gapCm','matCm','hang'])out.set(key,String(safe[key]));return out.toString();}
/** @param {any} plan @param {(id:string)=>any} resolve @param {string} origin */
export function wallPlanText(plan,resolve=generatedProduct,origin=''){
  const clean=normalizeWallPlan(plan,resolve),geo=wallGeometry(clean);const total=wallTotal(clean,resolve);
  return ['EPIC ARTS — MY DIGITAL GALLERY WALL','A layout plan, not an artwork download or an order.','',...clean.ids.map((id,i)=>{const p=resolve(id);return `${i+1}. ${p.name} — USD ${p.price.toFixed(2)}\n   ${origin}/art/${p.id}`;}),'',`Artwork total: USD ${total.toFixed(2)} (before checkout promotions/tax; free demo charges USD 0).`,`Paper size per edition: ${printSize(clean.paper).label}`,`Illustrative outside frame arrangement: ${geo.widthCm.toFixed(1)} × ${geo.heightCm.toFixed(1)} cm.`,`Entered wall width: ${clean.wallCm} cm. Gap: ${clean.gapCm} cm. Illustrative mat: ${clean.matCm} cm.`,geo.fits?'The arrangement fits the entered wall width.':'CAUTION: The arrangement is wider than the entered wall width.','Frames/mats are illustrations, not physical products or a calibrated room measurement.','Paper borders in the included PDFs may differ from this mockup.','All products are digital only, with a personal-use license. Each edition downloads separately after explicit checkout.','Room photos stay in memory on your device and are not included in this plan, local storage or the share link.','Prices are checked again by checkout; this plan does not reserve an edition or price.'].join('\n');
}
export function nextHeritageId(style,palette='heritage',exclude=[]){
  if(!heritageStyles.some(s=>s.id===style))return null;
  const index=palettes.findIndex(p=>p.id===palette);if(index<0)return null;
  for(let edition=index+1;edition<=64;edition+=8){const id=`${style}-${String(edition).padStart(3,'0')}`;if(!exclude.includes(id))return id;}return null;
}
