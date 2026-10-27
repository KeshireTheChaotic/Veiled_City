import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {jsonHash} from '../../src/kernel/json-hash.js';
import {factVisibleTo} from '../../src/frameworks/knowledge/public.js';
import {createNarrativeSourceVisibility} from '../../src/frameworks/narrative/public.js';
import {indexWorldEvent} from '../../src/city-calendar.js';
import {activeEvidence,evidenceType} from '../../src/epistemic.js';
import {narrativeSourceVisible as compatibilitySourceVisible} from '../../src/scene-fiction-context.js';

test('Narrative-owned source capability preserves recursive audience and active-source checks',t=>{
 const dir=mkdtempSync(join(tmpdir(),'rf04-narrative-source-p01-')),file=join(dir,'sources.sqlite'),
  schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)),db=new VeiledDB(file,schema),guild='source-scope';
 db.ensureCampaign(guild);db.upsertPlayer(guild,'ada','Ada');db.upsertPlayer(guild,'noor','Noor');
 const ada=db.createCharacter(guild,'ada','Ada'),noor=db.createCharacter(guild,'noor','Noor');
 const scopeAda={mode:'private',actorUserId:'ada',actorCharacterId:ada.id},scopeNoor={mode:'private',actorUserId:'noor',actorCharacterId:noor.id},party={mode:'party',actorUserId:null,actorCharacterId:null};
 const event=(key,{visibility='party',subject_key,details={}}={})=>indexWorldEvent(db,guild,{key,kind:'observation',title:key,source_id:'fixture',
   visibility,subject_key,truth_status:'observed',details});
 const capabilities=createNarrativeSourceVisibility({sceneFictionHash:jsonHash,
  visible:(row,scope)=>!!row&&factVisibleTo({...row,subject_character_id:row.subject_character_id||row.subject_key,
   subject_user_id:row.subject_user_id||row.subject_key},scope),
  activeEvidence,evidenceType,actorReferenceVisible:()=>false});
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 const publicRoot=event('public-root'),privateRoot=event('ada-root',{visibility:'character',subject_key:ada.id}),
  child=event('party-child',{details:{source_refs:[`event:${privateRoot.event_key}`]}});
 assert.equal(capabilities.narrativeSourceVisible(db,guild,publicRoot.event_key,party),true);
 assert.equal(capabilities.narrativeSourceVisible(db,guild,publicRoot.event_key,party),compatibilitySourceVisible(db,guild,publicRoot.event_key,party));
 assert.equal(capabilities.narrativeSourceVisible(db,guild,privateRoot.event_key,scopeAda),true);
 assert.equal(capabilities.narrativeSourceVisible(db,guild,privateRoot.event_key,scopeNoor),false);
 assert.equal(capabilities.narrativeSourceVisible(db,guild,privateRoot.event_key,party),false);
 assert.equal(capabilities.narrativeSourceVisible(db,guild,child.event_key,scopeAda),true);
 assert.equal(capabilities.narrativeSourceVisible(db,guild,child.event_key,scopeNoor),false);
 assert.equal(capabilities.narrativeSourceVisible(db,guild,child.event_key,party),false);
 const cycleA=event('cycle-a',{details:{source_refs:['event:cycle-b']}}),cycleB=event('cycle-b',{details:{source_refs:[`event:${cycleA.event_key}`]}});
 assert.equal(capabilities.narrativeSourceVisible(db,guild,cycleA.event_key,party),false);
 assert.equal(capabilities.narrativeSourceVisible(db,guild,cycleB.event_key,party),false);
 indexWorldEvent(db,guild,{key:publicRoot.event_key,status:'retracted'});
 assert.equal(capabilities.narrativeSourceVisible(db,guild,publicRoot.event_key,party),false);
 assert.equal(compatibilitySourceVisible(db,guild,publicRoot.event_key,party),false);
 assert.throws(()=>createNarrativeSourceVisibility({sceneFictionHash:jsonHash}),/Complete narrative source visibility capabilities required/);
});
