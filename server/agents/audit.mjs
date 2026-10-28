// SPDX-License-Identifier: Apache-2.0
// Hash-chain pattern adapted from trust_gated_agent_team/trust_gated_agents.py,
// awesome-llm-apps commit 6c16b23f1bacd0fdf240bb5141ef45e59e82c306.
// This is a consistency check, not a signed/independently anchored security guarantee.
import {createHash} from 'node:crypto';
import {agentTeam} from '../../shared/agents.mjs';
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const GENESIS='0'.repeat(64);
export function assertTool(role,tool){
 const identity=agentTeam.find(a=>a.id===role);
 if(!identity?.tools.includes(tool))throw new Error('Agent capability not granted.');
 return identity;
}
const chainHash=e=>digest([e.runId,e.sequence,e.timestamp,e.agent,e.action,e.inputHash,e.outputHash,e.summary,e.previousHash]);
export function createAudit(db){
 db.exec(`CREATE TABLE IF NOT EXISTS agent_events(run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,seq INTEGER NOT NULL,timestamp TEXT NOT NULL,agent TEXT NOT NULL,action TEXT NOT NULL,input_hash TEXT NOT NULL,output_hash TEXT NOT NULL,summary TEXT NOT NULL,previous_hash TEXT NOT NULL,entry_hash TEXT NOT NULL,PRIMARY KEY(run_id,seq));`);
 const entries=id=>db.prepare('SELECT * FROM agent_events WHERE run_id=? ORDER BY seq').all(id).map(e=>({runId:e.run_id,sequence:e.seq,timestamp:e.timestamp,agent:e.agent,action:e.action,inputHash:e.input_hash,outputHash:e.output_hash,summary:JSON.parse(e.summary),previousHash:e.previous_hash,hash:e.entry_hash}));
 function record(runId,agent,action,input,output,summary){
  return db.transaction(()=>{const last=db.prepare('SELECT seq,entry_hash FROM agent_events WHERE run_id=? ORDER BY seq DESC LIMIT 1').get(runId);
   const entry={runId,sequence:last?last.seq+1:0,timestamp:new Date().toISOString(),agent,action,inputHash:digest(input),outputHash:digest(output),summary,previousHash:last?.entry_hash||GENESIS};entry.hash=chainHash(entry);
   db.prepare('INSERT INTO agent_events VALUES(?,?,?,?,?,?,?,?,?,?)').run(runId,entry.sequence,entry.timestamp,agent,action,entry.inputHash,entry.outputHash,JSON.stringify(summary),entry.previousHash,entry.hash);
   db.prepare('UPDATE agent_runs SET head_hash=?,updated_at=? WHERE id=?').run(entry.hash,entry.timestamp,runId);return entry;
  })();
 }
 function verify(runId){const log=entries(runId);let previous=GENESIS;
  for(let i=0;i<log.length;i++){const e=log[i];if(e.sequence!==i||e.previousHash!==previous||chainHash(e)!==e.hash)return {valid:false,entries:log,head:previous};previous=e.hash;}
  const run=db.prepare('SELECT head_hash FROM agent_runs WHERE id=?').get(runId);
  return {valid:!!run&&run.head_hash===previous,entries:log,head:previous};
 }
 return {record,verify,entries};
}
