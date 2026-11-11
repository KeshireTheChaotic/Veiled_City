import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openLegacyReadOnlyRepository} from '../../src/v2/legacy-readonly-repository.js';
import {inspectCommittedGmDecision} from '../../src/v2/rules/committed-gm-decision.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function fixture(t,{version=2}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk2-historical-gm-')),file=join(dir,'source.sqlite'),db=new DatabaseSync(file);
  db.exec(`CREATE TABLE characters(id TEXT,guild_id TEXT,owner_user_id TEXT,character_json TEXT);CREATE TABLE campaigns(guild_id TEXT);
    CREATE TABLE city_records(guild_id TEXT,kind TEXT,record_key TEXT,status TEXT,visibility TEXT,source_event TEXT,data_json TEXT);
    CREATE TABLE world_events(guild_id TEXT,event_key TEXT,status TEXT,kind TEXT,source_id TEXT,details_json TEXT);`);
  const origin={source:'human-input',scene:'old-scene',session:'old-session',location:'old-location'};
  const material={intent_ref:'npc-intent',actor:{type:'npc',key:'npc',...(version===2?{owner_control_type:'ai_world'}:{})},operation:'feature',snapshot:'original-native-snapshot',knowledge_refs:[]};
  const proposalDetails={entry_hash:hash(material),input_source:'human-input'},entry={...material,source_ref:'npc-source',source_hash:hash(proposalDetails)};
  const board={version,origin,entries:[entry]},proposal={feature_ref:'feature'},decision={board:'board',entry:'npc-intent',entry_hash:hash(entry),origin,proposal,proposal_hash:hash(proposal),native:{operation:'commit_group_feature'}};
  const city=(kind,key,source,data)=>db.prepare('INSERT INTO city_records VALUES(?,?,?,?,?,?,?)').run('g',kind,key,'resolved','gm',source,JSON.stringify(data));
  const world=(key,kind,source,data)=>db.prepare('INSERT INTO world_events VALUES(?,?,?,?,?,?)').run('g',key,'active',kind,source,JSON.stringify(data));
  city('scene_intent_board','board','board-source',board);city('gm_arbitration_decision','decision','decision-source',decision);
  world('board-source','native_scene_intent_board','native:unified-gm',{payload_hash:hash(board)});world('decision-source','native_gm_arbitration','native:unified-gm',{payload_hash:hash(decision)});
  world('npc-source','native_npc_scene_intent','native:unified-gm',proposalDetails);world('human-input','authored_turn','player:old-owner',{private:'native-only'});
  const repo=openLegacyReadOnlyRepository(file);t.after(()=>{repo.close();db.close();rmSync(dir,{recursive:true,force:true});});
  const read=()=>repo.withValidationSnapshot(()=>inspectCommittedGmDecision(repo,'g','decision'));
  const update=(kind,key,edit)=>{const row=repo.getCityRecord('g',kind,key);edit(row.data);db.prepare('UPDATE city_records SET data_json=? WHERE kind=? AND record_key=?').run(JSON.stringify(row.data),kind,key);};
  const reseal=()=>{for(const [kind,key,source] of [['scene_intent_board','board','board-source'],['gm_arbitration_decision','decision','decision-source']]){const row=repo.getCityRecord('g',kind,key);db.prepare('UPDATE world_events SET details_json=? WHERE event_key=?').run(JSON.stringify({payload_hash:hash(row.data)}),source);}};
  return {db,repo,file,read,update,reseal};
}
test('historical v1/v2 NPC decision provenance reads native source closure without current-world authority',t=>{
  for(const version of [1,2]){const f=fixture(t,{version}),before=fileHash(f.file),r=f.read();assert.equal(r.row.record_key,'decision');assert.equal(r.entry.actor.key,'npc');assert.equal(r.board.record_key,'board');assert.equal(fileHash(f.file),before);}
  // Deliberately no calendar, scene, actor-control or proxy tables: those authorize future actions, not history.
});
for(const [name,sql] of [
  ['decision source',"UPDATE world_events SET status='revoked' WHERE event_key='decision-source'"],
  ['board source',"DELETE FROM world_events WHERE event_key='board-source'"],
  ['NPC proposal source',"UPDATE world_events SET status='revoked' WHERE event_key='npc-source'"],
  ['original input',"UPDATE world_events SET status='revoked' WHERE event_key='human-input'"],
  ['decision visibility',"UPDATE city_records SET visibility='party' WHERE kind='gm_arbitration_decision'"],
  ['native source identity',"UPDATE world_events SET source_id='player:owner' WHERE event_key='npc-source'"],
  ['native source kind',"UPDATE world_events SET kind='authored_turn' WHERE event_key='npc-source'"],
  ['foreign guild board',"UPDATE city_records SET guild_id='other' WHERE kind='scene_intent_board'"]
])test(`historical decision rejects altered ${name}`,t=>{const f=fixture(t);f.db.exec(sql);assert.throws(f.read);});
test('resealed proposal cannot hide mismatched proposal hash or origin',t=>{
  const proposal=fixture(t);proposal.update('gm_arbitration_decision','decision',d=>{d.proposal.feature_ref='changed';});proposal.reseal();assert.throws(proposal.read,/decision_provenance/);
  const origin=fixture(t);origin.update('gm_arbitration_decision','decision',d=>{d.origin.scene='changed';});origin.reseal();assert.throws(origin.read,/entry_provenance/);
});
test('v2 historical player/proxy control cannot be resealed into an AI-owned NPC operation',t=>{
  const f=fixture(t);f.update('scene_intent_board','board',d=>{d.entries[0].actor.owner_control_type='player';});
  f.update('gm_arbitration_decision','decision',d=>{d.entry_hash=hash(f.repo.getCityRecord('g','scene_intent_board','board').data.entries[0]);});f.reseal();assert.throws(f.read,/actor_control_class/);
});
test('NPC entry still requires matching native material and input-source hashes',t=>{
  const f=fixture(t);f.update('scene_intent_board','board',d=>{d.entries[0].operation='different-operation';});f.update('gm_arbitration_decision','decision',d=>{d.entry_hash=hash(f.repo.getCityRecord('g','scene_intent_board','board').data.entries[0]);});f.reseal();assert.throws(f.read,/npc_source_provenance/);
  const foreign=fixture(t);assert.throws(()=>foreign.repo.withValidationSnapshot(()=>inspectCommittedGmDecision(foreign.repo,'other','decision')),/decision_provenance/);
});
