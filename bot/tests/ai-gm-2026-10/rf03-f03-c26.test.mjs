import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPvpTerminalRules} from '../../src/frameworks/daggerheart/pvp-terminal-rules.js';
import {createPvpFearGateRules} from '../../src/frameworks/daggerheart/pvp-fear-gate-rules.js';
import {createNativePvpAuthority} from '../../src/frameworks/daggerheart/pvp-authority.js';
import {transitionAction} from '../../src/action-dependency.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';
function fixture(t,{winner='pc-a-c26',pending=false}={}){
 const dir=mkdtempSync(join(tmpdir(),'vc-terminal-c26-')),file=join(dir,'terminal.sqlite');let sql=new DatabaseSync(file),failure='';t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key));');
 const guild='guild-c26',proposal={record_key:'proposal-c26',data:{terms_hash:'terms-c26',accepted_intent:'accepted-c26'}},receipt={kind:'pvp_resolution_receipt',record_key:'resolution-c26',status:'resolved',source_event:'native-pair-source-c26',data:{proposal:proposal.record_key,terms_hash:proposal.data.terms_hash,winner,outcome:winner?'agreed_story_stake':'stalemate'}},windowKey='pvp-window:'+hash([proposal.record_key,proposal.data.terms_hash]).slice(0,40),nodeKey='action:'+createHash('sha256').update(proposal.data.accepted_intent).digest('hex').slice(0,32);
 const db={getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key);return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(v.kind===failure)throw Error('injected '+v.kind);const row={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(row));return row;},listCityRecords(_g,{kind,limit=100,offset=0}){return sql.prepare('SELECT body FROM records WHERE kind=? ORDER BY rowid LIMIT ? OFFSET ?').all(kind,limit,offset).map(r=>JSON.parse(r.body));},transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const result=fn();sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const save=(kind,key,data,status='resolved',extra={})=>db.saveCityRecord(guild,{kind,key,data,status,...extra});save('typed_intent','accepted-c26',{actor:'pc-a-c26'},'resolved',{source_event:'owner-source-c26'});save('scene_action_window',windowKey,{revision:4},'locked');save('compound_action',nodeKey,{status:'pending',action_id:'accepted-c26',interrupt_refs:[],dependencies:[]},'pending',{source_event:'owner-source-c26'});if(pending)save('pvp_fear_trigger','fear-c26',{proposal:proposal.record_key,terms_hash:proposal.data.terms_hash},'awaiting_move');
 const fear=createPvpFearGateRules({capabilities:{validateFearEffect:(_d,_g,key)=>{if(db.getCityRecord(guild,'native_fear_effect',key)?.status!=='resolved')throw Error('native Fear effect missing');},validatePvpAttackRoll:()=>{throw Error('not attack fixture');},validateCampaignPvp:()=>{throw Error('not campaign fixture');}}}),authority=createNativePvpAuthority({getCharacter:()=>null}),rules=createPvpTerminalRules({capabilities:{pvpAttemptKey:authority.pvpAttemptKey,transitionAction,pendingPvpFear:fear.pendingPvpFear}}),settle=()=>db.transaction(()=>rules.settlePvpWindow(db,guild,proposal,receipt));
 return {db,guild,proposal,receipt,windowKey,nodeKey,save,rules,authority,settle,setFailure:v=>failure=v,reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('pending actual native Fear obligation prevents terminal window, attempt and dependency closure',t=>{
 const f=fixture(t,{pending:true}),result=f.settle();assert.equal(result.status,'consequence_pending');assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',f.windowKey).status,'locked');assert.equal(f.db.getCityRecord(f.guild,'compound_action',f.nodeKey).data.status,'pending');assert.equal(f.db.getCityRecord(f.guild,'pvp_attempt',f.authority.pvpAttemptKey(f.guild,'accepted-c26')),null);
});
test('verified Fear effect permits private original-actor terminal projection and replay after restart without another window revision',t=>{
 const f=fixture(t,{pending:true});f.save('native_fear_effect','effect-c26',{},'resolved');f.save('pvp_fear_trigger','fear-c26',{proposal:f.proposal.record_key,terms_hash:f.proposal.data.terms_hash,effect:'effect-c26'},'resolved');f.settle();const attempt=f.db.getCityRecord(f.guild,'pvp_attempt',f.authority.pvpAttemptKey(f.guild,'accepted-c26'));assert.equal(attempt.visibility,'character');assert.equal(attempt.subject_key,'pc-a-c26');assert.equal(attempt.source_event,'owner-source-c26');assert.equal(attempt.data.resolution_receipt,f.receipt.record_key);assert.equal(f.db.getCityRecord(f.guild,'compound_action',f.nodeKey).data.status,'resolved');assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',f.windowKey).data.revision,5);f.reopen();f.settle();assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',f.windowKey).data.revision,5);assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_window_lifecycle'}).length,1);
});
test('native losing and neutral results map to failed or blocked dependencies without manufacturing a player reaction',t=>{
 for(const [winner,expected]of [['pc-b-c26','failed'],[null,'blocked']]){const f=fixture(t,{winner});f.settle();const node=f.db.getCityRecord(f.guild,'compound_action',f.nodeKey),attempt=f.db.getCityRecord(f.guild,'pvp_attempt',f.authority.pvpAttemptKey(f.guild,'accepted-c26'));assert.equal(node.data.status,expected);assert.equal(node.data.receipt,f.receipt.record_key);assert.equal(attempt.data.winner,winner);assert.equal('narration' in attempt.data,false);}
});
test('failed real intent transition rolls window, lifecycle and private attempt back within the caller transaction',t=>{
 const f=fixture(t);f.setFailure('compound_action');assert.throws(f.settle,/injected compound_action/);assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',f.windowKey).status,'locked');assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',f.windowKey).data.revision,4);assert.equal(f.db.listCityRecords(f.guild,{kind:'scene_window_lifecycle'}).length,0);assert.equal(f.db.getCityRecord(f.guild,'pvp_attempt',f.authority.pvpAttemptKey(f.guild,'accepted-c26')),null);
});
test('unresolved native interrupt blocks terminal dependency projection and does not erase the existing window',t=>{
 const f=fixture(t),node=f.db.getCityRecord(f.guild,'compound_action',f.nodeKey);f.save(node.kind,node.record_key,{...node.data,interrupt_refs:['interrupt-c26']},node.status,{source_event:node.source_event});assert.throws(f.settle,/Interrupted action needs native contextual revalidation/);assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',f.windowKey).status,'locked');assert.equal(f.db.getCityRecord(f.guild,'compound_action',f.nodeKey).data.status,'pending');
});
test('foreign or unresolved terminal receipt cannot close the original actor window',t=>{
 const f=fixture(t);f.receipt.data.terms_hash='other-terms';assert.throws(f.settle,/Exact native PvP terminal receipt/);f.receipt.data.terms_hash=f.proposal.data.terms_hash;f.receipt.status='pending';assert.throws(f.settle,/Exact native PvP terminal receipt/);assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',f.windowKey).status,'locked');
});
test('actual terminal provider cold-imports the original window settlement API',async()=>{
 const p=await import('../../src/pvp-terminal.js');assert.equal(typeof p.settlePvpWindow,'function');
});
