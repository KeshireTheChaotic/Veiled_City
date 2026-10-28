import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createBackgroundIdentityRules,BACKGROUND_WORLD_KINDS,createWorldIdentityRules,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {listNarrativeRecords,NARRATIVE_RECORD_LIMIT} from '../../src/frameworks/knowledge/narrative-records.js';
import {sceneFictionFailure} from '../../src/scene-fiction-context.js';
import * as original from '../../src/world-background-identities.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-background-')),file=join(dir,'background.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)),db=new VeiledDB(file,schema);db.ensureCampaign('g');const allowed=new Set(),seen=[];
 const api=createBackgroundIdentityRules({listNarrativeRecords,NARRATIVE_RECORD_LIMIT,fail:sceneFictionFailure,worldIdentityOrigin(database,g,row,scope){seen.push({ref:row.record_key,scope});return allowed.has(row.record_key);}}),content={read:()=>''},definition={kind:'faction',key:'brass-circle',name:'Brass Circle',aliases:[],summary:'An ordinary civic association.',role:'association',location_key:'',parent_location_key:''};
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {db,api,content,definition,allowed,seen,save:(kind,key,data)=>{if(!db.getWorldEvent('g','source'))indexWorldEvent(db,'g',{key:'source',title:'Fresh background source',source_id:'gm:fixture'});return db.saveCityRecord('g',{kind,key,source_event:'source',data});}};
}

test('background kind constant retains one frozen identity at original and current readers',()=>{
 assert.equal(original.BACKGROUND_WORLD_KINDS,BACKGROUND_WORLD_KINDS);assert.deepEqual(BACKGROUND_WORLD_KINDS,['faction','organization','district']);assert.equal(Object.isFrozen(BACKGROUND_WORLD_KINDS),true);assert.throws(()=>BACKGROUND_WORLD_KINDS.push('new-type'),TypeError);
});

test('a new ordinary background definition is validated without actor, canon, knowledge or resource writes',t=>{
 const f=fixture(t);assert.doesNotThrow(()=>f.api.validateBackgroundIdentity(f.db,'g',f.definition,f.content));assert.equal(f.db.listSimulationEntities('g','faction').length,0);assert.equal(f.db.listCanon('g',{includeGM:true}).length,0);assert.equal(f.db.listCityRecords('g',{kind:'autonomous_entity',includeGM:true}).length,0);
});

test('background layer does not silently create geography and needs packaged identity evidence',t=>{
 const f=fixture(t);for(const patch of [{location_key:'harbor'},{parent_location_key:'harbor'}])assert.throws(()=>f.api.validateBackgroundIdentity(f.db,'g',{...f.definition,...patch},f.content),/background_identity_only_not_geography/);assert.throws(()=>f.api.validateBackgroundIdentity(f.db,'g',f.definition,null),/packaged_background_identity_authority_required/);
});

test('packaged identity collisions include aliases and malformed package evidence stays held',t=>{
 const f=fixture(t),content={read:path=>path==='GM_PRIVATE/FACTIONS/factions.json'?JSON.stringify([{name:'Other Group',aliases:['Brass Circle']}]):''};assert.throws(()=>f.api.validateBackgroundIdentity(f.db,'g',f.definition,content),/protected_or_existing_world_identity/);assert.throws(()=>f.api.validateBackgroundIdentity(f.db,'g',f.definition,{read:()=>JSON.stringify({name:'not an array'})}),/packaged_identity_shape/);
});

test('current world drafts and protected reference-only identities cannot be replaced',t=>{
 const f=fixture(t);f.save('world_draft','draft',{data:{name:'Brass Circle'}});assert.throws(()=>f.api.validateBackgroundIdentity(f.db,'g',f.definition,f.content),/protected_or_existing_world_identity/);f.db.upsertReference('g',{kind:'npc',key:'hidden',name:'Secret Witness',summary:'protected fixture',visibility:'gm'});assert.throws(()=>f.api.validateBackgroundIdentity(f.db,'g',{...f.definition,key:'other',name:'Secret Witness'},f.content),/protected_or_existing_world_identity/);assert.equal(f.db.getNpcProfile('g','hidden'),null);
});

test('established entity aliases and NPC display names participate in collision checking',t=>{
 const f=fixture(t);f.db.setSimulationEntity('g','location','old-square',{name:'Old Square',aliases:['Brass Circle']});assert.throws(()=>f.api.validateBackgroundIdentity(f.db,'g',f.definition,f.content),/protected_or_existing_world_identity/);f.db.upsertNpcProfile('g',{npcKey:'porter',displayName:'Gate Keeper'});assert.throws(()=>f.api.validateBackgroundIdentity(f.db,'g',{...f.definition,key:'unrelated',name:'Gate Keeper'},f.content),/protected_or_existing_world_identity/);
});

test('record and NPC scan coverage limits remain explicit holds instead of incomplete collision clearance',t=>{
 const f=fixture(t),limit=5000;const records=createBackgroundIdentityRules({NARRATIVE_RECORD_LIMIT:limit,listNarrativeRecords:()=>Array(limit).fill({}),worldIdentityOrigin:()=>false,fail:sceneFictionFailure});assert.throws(()=>records.validateBackgroundIdentity(f.db,'g',f.definition,f.content),/identity_scan_limit_requires_reconciliation/);
 const profiles=createBackgroundIdentityRules({NARRATIVE_RECORD_LIMIT:limit,listNarrativeRecords:()=>[],worldIdentityOrigin:()=>false,fail:sceneFictionFailure}),view=Object.create(f.db);view.listNpcProfiles=()=>Array(500).fill({npc_key:'fixed',display_name:'Fixed'});assert.throws(()=>profiles.validateBackgroundIdentity(view,'g',f.definition,f.content),/identity_scan_limit_requires_reconciliation/);
});

test('GM context uses supplied origin verifier, favors current anchor and stays identity-only with no hidden-source bypass',t=>{
 const f=fixture(t);for(const [key,anchor] of [['z:local','harbor'],['a:remote','market'],['b:held','harbor']]){f.save('autonomous_entity',key,{kind:'faction',name:key,aliases:[],summary:'Bounded GM identity summary',identity_layer:'background_only',anchor_location:anchor});}f.allowed.add('z:local');f.allowed.add('a:remote');const scope={mode:'party'},rows=f.api.backgroundIdentityContext(f.db,'g',scope,{location:'harbor',limit:1});assert.equal(rows.length,1);assert.equal(rows[0].ref,'z:local');assert.equal(rows[0].authority,'identity_only_not_knowledge_resources_or_control');assert.ok(f.seen.every(r=>r.scope===scope));assert.ok(f.seen.some(r=>r.ref==='b:held'));assert.equal(rows.some(r=>r.ref==='b:held'),false);assert.equal(f.db.listSimulationEntities('g','faction').length,0);
});

test('actual World identity materializer consumes its own background constant and real moved validator',t=>{
 const f=fixture(t);f.db.setCityCalendar('g',{flags:{narrative_authority:true}});indexWorldEvent(f.db,'g',{key:'camera',kind:'native_gm_camera',title:'Fresh camera',source_id:'native:test'});const binding={source:'camera',guild:'g',scene:'scene',session:null,location:'harbor'},scope={mode:'party'},api=createWorldIdentityRules({BACKGROUND_WORLD_KINDS:[],verifiedWorldAuthoringContext:()=>({audience_ref:'audience-v9:mock-source',context:{binding,scope,source:f.db.getWorldEvent('g','camera')}}),currentScene:()=>({key:'scene'}),privateWorldIdentityForGm:()=>false,worldIdentityOrigin:()=>false,assertIndependentWorldIdentity:()=>{},assertWorldIdentityNames:()=>{},validateBackgroundIdentity:f.api.validateBackgroundIdentity,configureSimulationEntity:()=>{throw Error('background must not materialize actor');},validateMinorIdentity:()=>{throw Error('not NPC');},recordScenePresence:()=>{throw Error('no background placement');},activeCityProxy:()=>null,stateRevision:()=>'',fail:message=>{throw Error(message);}});
 const row=api.establishNarrativeEntity(f.db,'g',f.definition,{}, {content:f.content});assert.equal(row.data.kind,'faction');assert.equal(row.data.identity_layer,'background_only');assert.equal(f.db.getSimulationEntity('g','faction','brass-circle'),null);assert.equal(f.db.getReference('g','faction','brass-circle'),undefined);assert.equal(f.db.listCanon('g',{includeGM:true}).length,0);
});

test('original background provider reaches moved validation without certifying unsourced context',t=>{
 const f=fixture(t);assert.throws(()=>original.validateBackgroundIdentity(f.db,'g',{...f.definition,location_key:'harbor'},f.content),/background_identity_only_not_geography/);assert.deepEqual(original.backgroundIdentityContext(f.db,'g',{mode:'party'}),[]);
});
