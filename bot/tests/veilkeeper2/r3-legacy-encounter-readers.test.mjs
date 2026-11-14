import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {openLegacyReadOnlyRepository} from '../../src/v2/legacy-readonly-repository.js';
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'vk2-encounter-source-')),file=join(dir,'legacy.sqlite'),db=new DatabaseSync(file);
 db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE campaigns(guild_id TEXT PRIMARY KEY,active_session_id TEXT);
 CREATE TABLE characters(id TEXT PRIMARY KEY,guild_id TEXT,character_json TEXT);
 CREATE TABLE sessions(id TEXT PRIMARY KEY,guild_id TEXT,status TEXT,director_state_json TEXT);
 CREATE TABLE encounters(id TEXT PRIMARY KEY,guild_id TEXT,session_id TEXT,encounter_number INTEGER,status TEXT,composition_json TEXT,adjustment_json TEXT,combat_state_json TEXT,pc_start_state_json TEXT,notes TEXT);
 CREATE TABLE encounter_combatants(id TEXT PRIMARY KEY,guild_id TEXT,session_id TEXT,encounter_id TEXT,base_name TEXT,instance_index INTEGER,status TEXT,conditions_json TEXT,difficulty INTEGER,notes TEXT);`);
 db.exec(`INSERT INTO campaigns VALUES('g','s'),('other','foreign');INSERT INTO sessions VALUES('s','g','active','{"scene_number":1}'),('foreign','other','active','{}');`);
 const add=(id,status='active',n=1,guild='g',session='s')=>db.prepare('INSERT INTO encounters VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,guild,session,n,status,'[{"name":"Watcher"}]','[]','{"spotlight":{"counts":{}}}','[]','GM-private-native-source');
 const combatant=(id,status='active',guild='g',session='s',encounter='e')=>db.prepare('INSERT INTO encounter_combatants VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,guild,session,encounter,'Watcher',1,status,'[]',14,'GM-only-body');
 add('e');add('future','planned',7);add('foreign','active',1,'other','foreign');combatant('target');combatant('removed','removed');
 const repo=openLegacyReadOnlyRepository(file);t.after(()=>{repo.close();db.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
 return {db,repo,add,combatant,file};
}
test('actual campaign active-session pointer and encounter ordering stay campaign-bound',t=>{
 const f=fixture(t);assert.equal(f.repo.getSession('g','s').id,'s');assert.equal(f.repo.getSession('other','s'),null);
 assert.equal(f.repo.getActiveSession('g').id,'s');assert.equal(f.repo.getEncounter('g','foreign'),null);
 assert.equal(f.repo.getCurrentEncounter('g','s').id,'e');assert.equal(f.repo.getCurrentEncounter('other','s'),null);
 f.db.exec("UPDATE encounters SET status='ended' WHERE id='e'");assert.equal(f.repo.getCurrentEncounter('g','s').id,'future');
 f.db.exec("UPDATE campaigns SET active_session_id='foreign' WHERE guild_id='g'");assert.equal(f.repo.getActiveSession('g'),null);
});
test('materialized JSON and explicit removed status are read without mutation or inference projection',t=>{
 const f=fixture(t),before=createHash('sha256').update(readFileSync(f.file)).digest('hex'),e=f.repo.getEncounter('g','e');
 assert.deepEqual(e.composition,[{name:'Watcher'}]);assert.deepEqual(e.combat_state,{spotlight:{counts:{}}});assert.equal(e.notes,'GM-private-native-source');
 assert.deepEqual(f.repo.listCombatants('g','e').map(c=>c.id),['target']);assert.equal(f.repo.listCombatants('g','e',{includeRemoved:true}).length,2);
 assert.deepEqual(f.repo.listCombatants('other','e'),[]);assert.deepEqual(f.repo.listCombatants('g','absent'),[]);
 assert.equal(createHash('sha256').update(readFileSync(f.file)).digest('hex'),before);
 assert.equal(Object.keys(f.repo).some(key=>/^(save|update|delete|exec|run)/i.test(key)),false);
});
test('ambiguous active or newest planned encounters require reconciliation',t=>{
 const f=fixture(t);f.add('also-active');assert.throws(()=>f.repo.getCurrentEncounter('g','s'),/Ambiguous/);
 f.db.exec("UPDATE encounters SET status='ended' WHERE status='active'");f.add('same-plan','planned',7);assert.throws(()=>f.repo.getCurrentEncounter('g','s'),/Ambiguous/);
});
test('missing, null, malformed or wrong-shape JSON never becomes healthy defaults',t=>{
 const f=fixture(t);
 for(const value of [null,'','{','null','{}']){f.db.prepare('UPDATE encounters SET composition_json=? WHERE id=?').run(value,'e');assert.throws(()=>f.repo.getEncounter('g','e'));}
 f.db.exec("UPDATE encounters SET composition_json='[]',combat_state_json='[]' WHERE id='e'");assert.throws(()=>f.repo.getCurrentEncounter('g','s'),/Explicit/);
 for(const value of ['{','null','{}']){f.db.prepare('UPDATE encounter_combatants SET conditions_json=? WHERE id=?').run(value,'target');assert.throws(()=>f.repo.listCombatants('g','e'));}
});
test('orphaned or cross-indexed encounter/combatant rows cannot establish a complete window',t=>{
 const f=fixture(t);f.db.exec("UPDATE encounters SET session_id='foreign' WHERE id='e'");assert.throws(()=>f.repo.getEncounter('g','e'),/session scope/);
 f.db.exec("UPDATE encounters SET session_id='s' WHERE id='e'");f.combatant('misindexed','active','other');assert.throws(()=>f.repo.listCombatants('g','e'),/campaign\/session/);
 f.db.exec("DELETE FROM encounter_combatants WHERE id='misindexed';UPDATE encounter_combatants SET session_id='foreign' WHERE id='target'");assert.throws(()=>f.repo.listCombatants('g','e'),/Complete/);
});
test('oversize combatant window holds instead of returning a truncated roster',t=>{
 const f=fixture(t);for(let i=0;i<256;i++)f.combatant('extra-'+i);assert.throws(()=>f.repo.listCombatants('g','e'),/Complete/);
});
test('a single native validation snapshot preserves encounter and combatant coherence across an external WAL write',t=>{
 const f=fixture(t);
 const first=f.repo.withValidationSnapshot(()=>{const encounter=f.repo.getCurrentEncounter('g','s');f.db.exec("UPDATE encounters SET notes='changed' WHERE id='e';UPDATE encounter_combatants SET difficulty=19 WHERE id='target'");return {encounter,combatants:f.repo.listCombatants('g','e')};});
 assert.equal(first.encounter.notes,'GM-private-native-source');assert.equal(first.combatants[0].difficulty,14);
 assert.equal(f.repo.getEncounter('g','e').notes,'changed');assert.equal(f.repo.listCombatants('g','e')[0].difficulty,19);
});
