import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {styles,palettes,ENGINE_VERSION,productFromRecipe} from '../shared/designs.mjs';
import {HttpError,hash} from './core.mjs';
export function createStudio(db,catalog,renderer){
 db.exec(`CREATE TABLE IF NOT EXISTS studio_jobs(id TEXT PRIMARY KEY,owner_hash TEXT NOT NULL,access_hash TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('queued','rendering','complete','failed')),mode TEXT NOT NULL,request_json TEXT NOT NULL,product_id TEXT,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS studio_job_owner ON studio_jobs(owner_hash,created_at);
 CREATE INDEX IF NOT EXISTS studio_job_queue ON studio_jobs(state,created_at);`);
 const aiEnabled=process.env.AI_GENERATION_ENABLED==='true'&&!!process.env.OPENAI_API_KEY;
 const quota=Math.max(1,Math.min(20,Number(process.env.AI_DAILY_LIMIT)||5));let running=false,closed=false;
 db.prepare("UPDATE studio_jobs SET state='queued' WHERE state='rendering'").run();
 function validate(body){
  if(!body||!['design','ai'].includes(body.mode))throw new HttpError(400,'Choose the design engine or the optional image AI.');
  if(!styles.some(s=>s.id===body.style)||!palettes.some(p=>p.id===body.palette))throw new HttpError(400,'Choose a valid art family and palette.');
  const seed=Number(body.seed),detail=Number(body.detail);
  if(!Number.isInteger(seed)||seed<0||seed>2147483647||!Number.isInteger(detail)||detail<1||detail>5)throw new HttpError(400,'Use a seed from 0 to 2147483647 and a detail level from 1 to 5.');
  const clean=s=>typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,'').trim():'';
  const prompt=clean(body.prompt),title=clean(body.title);if(prompt.length>400||title.length>80)throw new HttpError(400,'Keep your mood to 400 characters and title to 80.');
  if(body.mode==='ai'&&!aiEnabled)throw new HttpError(503,'Image AI is not connected. The built-in design engine works without an API key.');
  if(body.mode==='ai'&&prompt.length<10)throw new HttpError(400,'Describe the artwork you want in at least 10 characters.');
  return {mode:body.mode,prompt,title,recipe:{version:ENGINE_VERSION,style:body.style,palette:body.palette,seed,detail}};
 }
 async function aiSource(input){
  const headers={Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'};
  const moderation=await fetch('https://api.openai.com/v1/moderations',{method:'POST',headers,body:JSON.stringify({model:'omni-moderation-latest',input:input.prompt}),signal:AbortSignal.timeout(20000)});
  if(!moderation.ok)throw new Error('The image provider could not validate this request. Please try the design engine.');
  if((await moderation.json()).results?.[0]?.flagged)throw new Error('This description cannot be used for image generation. Try a botanical, geometric, or heritage-inspired composition.');
  const style=styles.find(s=>s.id===input.recipe.style),palette=palettes.find(p=>p.id===input.recipe.palette);
  const prompt=`Create one original premium printable wall artwork, not a room mockup. Portrait composition. Design direction: ${style.tradition}. Palette: ${palette.colors.join(', ')}. Buyer mood: ${input.prompt}. No text, signatures, logos, trademarks, copyrighted characters, identifiable people, or imitation of any named artist. A respectful contemporary interpretation, not an antique or an artisan-made artifact.`;
  const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers,body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',prompt,size:'1024x1536',quality:'medium',n:1,output_format:'png'}),signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error(response.status===429?'The image provider quota is unavailable. Please try again later.':'The image provider could not complete this edition. No storefront payment was collected.');
  const encoded=(await response.json()).data?.[0]?.b64_json;if(typeof encoded!=='string'||encoded.length>40000000)throw new Error('The image provider returned an invalid file.');return Buffer.from(encoded,'base64');
 }
 async function drain(){if(running||closed)return;running=true;try{
  let job;while(!closed&&(job=db.prepare("SELECT * FROM studio_jobs WHERE state='queued' ORDER BY created_at LIMIT 1").get())){
   const time=new Date().toISOString();db.prepare("UPDATE studio_jobs SET state='rendering',updated_at=? WHERE id=?").run(time,job.id);
   try{const input=JSON.parse(job.request_json),id='studio-'+job.id,s=styles.find(s=>s.id===input.recipe.style);let product=productFromRecipe(id,input.recipe,input.title||s.name+' · Your edition');
    product.created=time.slice(0,10);product.isPrivate=true;
    if(input.mode==='ai'){
     const source=await aiSource(input);await mkdir(renderer.source,{recursive:true});await writeFile(resolve(renderer.source,id+'.png'),source,{mode:0o600});
     product={...product,kind:'ai',price:24,recipe:undefined,formats:'PNG + JPG + PDF',description:input.title?`An original AI-generated digital interpretation: ${input.title}.`:`An AI-generated ${s.tradition.toLowerCase()} edition, created from your description.`,story:'Created with the optional OpenAI image provider from your description and selected design direction. This is AI-generated raster imagery, not handmade art or a native vector. No exclusive rights or guarantee of copyright protection. The original source is included; 2400 × 3000 exports are resized. We recommend small prints (5×7 inches or smaller) for best detail.'};
    }
    catalog.insert(product,{visibility:'private',owner:job.owner_hash,accessHash:job.access_hash});await renderer.preview(product);
    db.prepare("UPDATE studio_jobs SET state='complete',product_id=?,updated_at=? WHERE id=?").run(id,new Date().toISOString(),job.id);
   }catch(error){console.error('Studio generation failed:',job.id,error.message);db.prepare("UPDATE studio_jobs SET state='failed',error=?,updated_at=? WHERE id=?").run(job.mode==='ai'?error.message:'The studio could not draw this edition. Please try a new seed.',new Date().toISOString(),job.id);}
  }
 }finally{running=false;}}
 function create(body,owner){const input=validate(body),day=new Date().toISOString().slice(0,10);
  if(db.prepare("SELECT count(*) AS n FROM studio_jobs WHERE state IN ('queued','rendering')").get().n>=12)throw new HttpError(503,'The studio queue is full. Please return in a moment.');
  if(db.prepare('SELECT count(*) AS n FROM studio_jobs WHERE owner_hash=? AND created_at>=?').get(owner,day).n>=40)throw new HttpError(429,'You’ve reached today’s studio allowance. Your saved editions are still available.');
  if(input.mode==='ai'&&(db.prepare("SELECT count(*) AS n FROM studio_jobs WHERE mode='ai' AND created_at>=?").get(day).n>=quota||db.prepare("SELECT count(*) AS n FROM studio_jobs WHERE mode='ai' AND owner_hash=? AND created_at>=?").get(owner,day).n>=2))throw new HttpError(429,'Today’s image AI allowance is used. The built-in engine is still available.');
  const id=randomBytes(16).toString('hex'),token=randomBytes(32).toString('hex'),time=new Date().toISOString();
  db.prepare("INSERT INTO studio_jobs(id,owner_hash,access_hash,state,mode,request_json,created_at,updated_at) VALUES(?,?,?,'queued',?,?,?,?)").run(id,owner,hash(token),input.mode,JSON.stringify(input),time,time);setImmediate(drain);return {id,token,state:'queued'};
 }
 function result(id,owner,token){const row=db.prepare('SELECT * FROM studio_jobs WHERE id=?').get(id);if(!row||(row.owner_hash!==owner&&!(typeof token==='string'&&hash(token)===row.access_hash)))throw new HttpError(404,'That studio session isn’t available.');
  const p=row.product_id?catalog.get(row.product_id):null;return {id:row.id,state:row.state,error:row.error,product:p?{...p,...(typeof token==='string'&&hash(token)===row.access_hash?{accessToken:token}:{})}:null};}
 setImmediate(drain);
 return {create,result,aiEnabled,quota,close:()=>{closed=true;},health:()=>({worker:running?'active':'idle',queued:db.prepare("SELECT count(*) AS n FROM studio_jobs WHERE state IN ('queued','rendering')").get().n})};
}
