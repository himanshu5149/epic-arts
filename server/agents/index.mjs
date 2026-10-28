import {readFileSync} from 'node:fs';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {HttpError} from '../core.mjs';
import {agentTeam,AGENT_VERSION} from '../../shared/agents.mjs';
import {createKnowledge} from './knowledge.mjs';
import {createPlanner,validateBrief} from './planner.mjs';
import {createAudit,digest,GENESIS} from './audit.mjs';
import {runConnectedModel} from './provider.mjs';
const bounded=(v,f,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(v)||f)));
export function createAgentService(db,catalog,{env=process.env,fetchImpl=fetch,autoStart=true}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS agent_runs(id TEXT PRIMARY KEY,owner_hash TEXT NOT NULL,request_key TEXT NOT NULL UNIQUE,access_hash TEXT NOT NULL,request_hash TEXT NOT NULL,input_json TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('queued','running','complete','failed')),mode TEXT NOT NULL,llm_reserved INTEGER NOT NULL DEFAULT 0,output_json TEXT,error TEXT,attempts INTEGER NOT NULL DEFAULT 0,head_hash TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,expires_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS agent_queue ON agent_runs(state,created_at);
 CREATE INDEX IF NOT EXISTS agent_owner_quota ON agent_runs(owner_hash,created_at);
 CREATE INDEX IF NOT EXISTS agent_expiry ON agent_runs(expires_at);`);
 const audit=createAudit(db),knowledge=createKnowledge(db),planner=createPlanner(catalog,knowledge);
 const llmConnected=env.AGENT_LLM_ENABLED==='true'&&!!env.OPENAI_API_KEY;
 const dailyLimit=bounded(env.AGENT_DAILY_LLM_LIMIT,20,1,50),workers=bounded(env.AGENT_WORKERS,2,1,3),maxQueue=12;
 const skills=agentTeam.map(a=>{const text=readFileSync(new URL(`../../skills/${a.skill}/SKILL.md`,import.meta.url),'utf8');return {...a,sha256:digest(text),text};});
 const skillText=skills.map(s=>s.text).join('\n\n').slice(0,12000);
 let active=0,closed=false,submitted=0;const controllers=new Set();
 const now=()=>new Date().toISOString();
 function cleanup(){db.prepare('DELETE FROM agent_runs WHERE expires_at<? AND state IN (\'complete\',\'failed\')').run(now());}
 cleanup();const cleanupTimer=setInterval(cleanup,15*60*1000);cleanupTimer.unref();
 // One process owns this SQLite worker pool. Interrupted requests are recoverable, with at most two attempts.
 db.prepare("UPDATE agent_runs SET state=CASE WHEN attempts<2 THEN 'queued' ELSE 'failed' END,error=CASE WHEN attempts>=2 THEN 'This brief was interrupted twice. Please make a fresh request.' ELSE NULL END WHERE state='running'").run();
 db.prepare("UPDATE agent_runs SET state='failed',error='This brief expired. Please start a new one.' WHERE expires_at<? AND state='queued'").run(now());
 function authorize(id,owner,token){
  if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))throw new HttpError(404,'That private brief is not available.');
  const run=db.prepare('SELECT * FROM agent_runs WHERE id=?').get(id);
  const validToken=typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)&&run&&timingSafeEqual(Buffer.from(digest(token),'hex'),Buffer.from(run.access_hash,'hex'));
  if(!run||run.expires_at<now()||(!validToken&&run.owner_hash!==owner))throw new HttpError(404,'That private brief is not available.');
  return run;
 }
 function create(raw,owner){
  if(closed)throw new HttpError(503,'The advisor is pausing. Please try again shortly.');
  const input=validateBrief(raw),key=raw.requestKey,token=raw.token;
  if(!owner||typeof key!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(key)||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new HttpError(400,'Refresh the advisor to prepare a private, retry-safe brief.');
  const fingerprint=digest(input),accessHash=digest(token);
  const answer=db.transaction(()=>{
   const existing=db.prepare('SELECT * FROM agent_runs WHERE request_key=?').get(key);
   if(existing){if(existing.request_hash!==fingerprint||existing.access_hash!==accessHash)throw new HttpError(409,'This request reference belongs to a different brief. Please start a new one.');if(existing.expires_at<now())throw new HttpError(410,'That brief has expired. Start a fresh one.');return {id:existing.id,state:existing.state,mode:existing.mode,reused:true};}
   const pending=db.prepare("SELECT count(*) AS n FROM agent_runs WHERE state IN ('queued','running')").get().n;
   if(pending>=maxQueue+workers)throw new HttpError(503,'The art advisors have a full table. Please try again shortly.');
   if(db.prepare("SELECT count(*) AS n FROM agent_runs WHERE owner_hash=? AND state IN ('queued','running')").get(owner).n>=2)throw new HttpError(429,'Two briefs are already on your table. Let those finish first.');
   const day=now().slice(0,10),quota=db.prepare('SELECT count(*) AS n FROM agent_runs WHERE owner_hash=? AND created_at>=?').get(owner,day).n;
   if(quota>=60)throw new HttpError(429,'Your daily allowance of 60 private briefs is used. Come back tomorrow.');
   let mode='no-key',reserved=0;
   if(input.useLlm&&llmConnected){const global=db.prepare('SELECT count(*) AS n FROM agent_runs WHERE llm_reserved=1 AND created_at>=?').get(day).n,personal=db.prepare('SELECT count(*) AS n FROM agent_runs WHERE llm_reserved=1 AND owner_hash=? AND created_at>=?').get(owner,day).n;if(global<dailyLimit&&personal<6){mode='connected-model';reserved=1;}else mode='no-key-fallback';}
   const id=randomBytes(16).toString('hex'),time=now();
   db.prepare('INSERT INTO agent_runs(id,owner_hash,request_key,access_hash,request_hash,input_json,state,mode,llm_reserved,head_hash,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,\'queued\',?,?,?,?,?,?)').run(id,owner,key,accessHash,fingerprint,JSON.stringify(input),mode,reserved,GENESIS,time,time,new Date(Date.now()+7*86400000).toISOString());
   return {id,state:'queued',mode,reused:false};
  })();
  if(++submitted%30===0)cleanup();if(autoStart)kick();return answer;
 }
 const claim=db.transaction(()=>{const job=db.prepare("SELECT * FROM agent_runs WHERE state='queued' ORDER BY created_at,id LIMIT 1").get();if(!job)return;db.prepare("UPDATE agent_runs SET state='running',attempts=attempts+1,updated_at=? WHERE id=? AND state='queued'").run(now(),job.id);return job;});
 async function execute(job){
  const input=JSON.parse(job.input_json),controller=new AbortController();controllers.add(controller);
  const record=(role,tool,args,out,summary)=>audit.record(job.id,role,tool,args,out,summary);
  try{
   const prepared=await planner.prepare(input,record);let selection=input.intent==='collection'?planner.fit(input,prepared):[];
   let execution={mode:job.mode==='connected-model'&&!llmConnected?'no-key-fallback':job.mode,llmCalls:0,modelToolCalls:0,tokens:0,message:job.mode==='connected-model'&&!llmConnected?'The connected model is no longer enabled. Used the no-key catalog workflow.':job.mode==='no-key-fallback'?'The connected-model quota was reached. Used the no-key catalog workflow.':'No external model request. Rules, indexed retrieval and server-side validation.'};
   if(job.mode==='connected-model'&&llmConnected){
    try{const suggestion=await runConnectedModel({input,prepared,knowledge,skillText,record,apiKey:env.OPENAI_API_KEY,model:env.OPENAI_AGENT_MODEL||'gpt-4.1-mini',fetchImpl,signal:controller.signal});
     const proposedSelection=input.intent==='collection'?planner.fit(input,prepared,suggestion.productIds):[];
     if(input.intent==='question'&&suggestion.productIds.length)throw new Error('Question mode cannot select products.');
     if(suggestion.guideIds.some(id=>!prepared.guides.some(g=>g.id===id)))throw new Error('Model guide choice outside reviewed context.');
     selection=proposedSelection;
     execution={mode:'connected-model',llmCalls:suggestion.calls,modelToolCalls:suggestion.toolCalls,tokens:suggestion.tokens,message:'A connected language model used read-only retrieval tools. Product, price and provenance checks remained on the server.'};
    }catch{execution={mode:'no-key-fallback',llmCalls:null,modelToolCalls:audit.entries(job.id).filter(e=>e.summary.modelTool).length,tokens:null,message:'The model was unavailable or its suggestion failed a guard. Used the verified no-key selection. Provider calls may still have incurred cost.'};}
   }
   const output=await planner.finish(input,prepared,selection,record,execution);
   db.prepare("UPDATE agent_runs SET state='complete',mode=?,output_json=?,updated_at=?,error=NULL WHERE id=?").run(execution.mode,JSON.stringify(output),now(),job.id);
  }catch{db.prepare("UPDATE agent_runs SET state='failed',error='This brief couldn’t be completed safely. Try adjusting your request.',updated_at=? WHERE id=?").run(now(),job.id);}
  finally{controllers.delete(controller);}
 }
 function kick(){if(closed)return;while(active<workers){const job=claim();if(!job)break;active++;setImmediate(()=>execute(job).finally(()=>{active--;kick();}));}}
 if(autoStart)setImmediate(kick);
 function result(id,owner,token){const run=authorize(id,owner,token),log=audit.verify(id);return {id:run.id,state:run.state,mode:run.mode,createdAt:run.created_at,expiresAt:run.expires_at,result:run.output_json?JSON.parse(run.output_json):null,error:run.error||null,activity:log.entries.map(e=>({agent:e.agent,action:e.action,...e.summary})),audit:{valid:log.valid,head:log.head,events:log.entries.length}};}
 return {create,result,audit:(id,owner,token)=>{authorize(id,owner,token);return {...audit.verify(id),notice:'Hash-linked consistency check; not signed, immutable, or independently anchored.'};},config:()=>({version:AGENT_VERSION,llmConnected,defaultMode:'no-key',dailyLlmLimit:dailyLimit,workers,maxQueued:maxQueue,retentionDays:7,team:skills.map(({text,...s})=>s)}),health:()=>({workers,active,queued:db.prepare("SELECT count(*) AS n FROM agent_runs WHERE state='queued'").get().n,llmConnected}),close:()=>{closed=true;clearInterval(cleanupTimer);for(const c of controllers)c.abort();},kick};
}
