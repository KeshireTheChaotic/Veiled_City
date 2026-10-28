import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {initializeSessionWorldEvents} from '../../src/application/composition/public.js';
import {prepareOpeningEntryOpportunity} from '../../src/session-opening-attendance.js';
import {openingEntryProjection,openingEntryNarrativeCandidate} from '../../src/frameworks/session/opening-entry-source.js';
import {authorNarrativeRequests} from '../../src/narrative-authority.js';
import {prepareOpeningEntryOutput,assertPvpOutput} from '../../src/pvp-output.js';
import {scenePresence} from '../../src/scene-continuity.js';
initializeSessionWorldEvents();
function privateOpening(t){
 const directory=mkdtempSync(join(tmpdir(),'rf04-entry-authoring-c07-')),file=join(directory,'entry.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));const db=new VeiledDB(file,schema);db.ensureCampaign('entries');db.setCityCalendar('entries',{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true,scene_continuity:true}});for(const user of ['ada','noor'])db.upsertPlayer('entries',user,user);const ada=db.createCharacter('entries','ada','Ada'),noor=db.createCharacter('entries','noor','Noor');db.updateCharacterData(ada.id,d=>{d.entry_hooks=['Find the person who replaced the copper lantern.'];d.goals=['Repair the observatory lens'];});db.updateCharacterData(noor.id,d=>{d.entry_hooks=['Protect the sleeping harbor'];});db.upsertCharacterNarrative('entries',ada.id,'player','# Ada private memories\n\nI once heard the bell-maker sing underwater.');db.upsertCharacterNarrative('entries',ada.id,'gm_private','# Hidden GM history\n\nTHE SHADE COUNCIL KEEPS THE BELL');db.upsertCharacterGmHook('entries',ada.id,{key:'gm-hook',title:'Private conspiracy',premise:'GM-HOOK SHADE COUNCIL'}, {source:'fixture'});const session=db.startSession('entries','A city in rain');for(const [user,pc]of[['ada',ada],['noor',noor]]){db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');}const opportunity=prepareOpeningEntryOpportunity(db,'entries','ada',ada.id,'ada-checked-in'),scope={mode:'private',actorUserId:'ada',actorCharacterId:ada.id};
 t.after(()=>{db.close();rmSync(directory,{recursive:true,force:true});});return {db,ada,noor,session,opportunity,scope,file,schema};
}
const answer=(visibility='character')=>({fiction_delta:[],narrative_units:[{id:'paper-lantern',kind:'scene',text:'A paper lantern sways beside a rain-darkened window, and somewhere beyond it a metal bell rings once.',subject_key:'',location_key:'',visibility,epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''}]});
async function author(f,gen){const candidate=openingEntryNarrativeCandidate(f.db,'entries',f.opportunity.record_key,f.scope),packets=[],budget={used:false};await authorNarrativeRequests({db:f.db,guild:'entries',result:candidate.candidate,scope:f.scope,sourceRef:candidate.source.event_key,budget,generate:async packet=>{packets.push(packet);return gen(packet);}});return {candidate,packets,budget};}

test('private entry narrative candidate binds only the checked-in owner and native source, not arrival or PC choice',t=>{
 const f=privateOpening(t),projection=openingEntryProjection(f.db,'entries',f.opportunity.record_key,f.scope),candidate=openingEntryNarrativeCandidate(f.db,'entries',f.opportunity.record_key,f.scope),source=f.db.getWorldEvent('entries',candidate.source.event_key);assert.equal(source.kind,'native_opening_entry_scope');assert.equal(source.source_id,'native:opening-director');assert.equal(source.visibility,'character');assert.equal(source.subject_key,f.ada.id);assert.equal(source.session_id,f.session.id);assert.equal(source.scene,projection.state.material.scene);assert.deepEqual(candidate.view.state,projection.state);assert.equal(f.db.getCharacter(f.ada.id).data.location,undefined);assert.equal(scenePresence(f.db,'entries','character',f.ada.id),null);assert.equal(candidate.candidate.gm_world_parts[0].operation,'describe_scene');assert.equal(candidate.candidate.gm_world_parts[0].source_refs.length,0);assert.equal(candidate.candidate.narration,'');assert.equal(candidate.candidate.private_messages.length,0);
});

test('actual creative authoring packet includes only Ada source material and native authorizer accepts a private scene unit',async t=>{
 const f=privateOpening(t);let packets=0;const {candidate,packets:sent,budget}=await author(f,()=>{packets++;return answer();});assert.equal(packets,1);assert.equal(budget.used,true);assert.equal(sent.length,1);const brief=sent[0].assembly_brief,serialized=JSON.stringify(sent[0]);assert.equal(brief.kind,'private_entry');assert.ok(serialized.includes('Find the person who replaced the copper lantern.'));assert.ok(serialized.includes('Repair the observatory lens'));for(const secret of ['SHADE COUNCIL','GM-HOOK','sleeping harbor','Protect the sleeping harbor','Noor'])assert.equal(serialized.includes(secret),false);assert.equal(sent[0].audience.mode,'private');assert.equal(sent[0].audience.subject_key,f.ada.id);assert.equal(sent[0].viewpoint.pc_witness,false);assert.equal(f.db.getCharacter(f.ada.id).data.location,undefined);const delivered=prepareOpeningEntryOutput(f.db,'entries',f.opportunity.record_key,f.scope);assert.equal(delivered.entry_evidence.narrative_verified,true);assert.equal(delivered.entry_evidence.fallback,false);assert.match(delivered.narration,/paper lantern sways/);assert.equal(delivered.private_messages.length,0);assertPvpOutput(f.db,'entries',delivered,f.scope);assert.equal(f.db.listCityRecords('entries',{kind:'accepted_player_action',includeGM:true}).length,0);assert.equal(f.db.hasCharacterPlacementHistory('entries',f.ada.id),false);assert.equal(f.db.listCityRecords('entries',{kind:'publication_outbox',includeGM:true}).length,0);
});

test('writer returning party-visible text for a private owner scope is rejected before an accepted narrative draft',async t=>{
 const f=privateOpening(t),candidate=openingEntryNarrativeCandidate(f.db,'entries',f.opportunity.record_key,f.scope),result=await authorNarrativeRequests({db:f.db,guild:'entries',result:candidate.candidate,scope:f.scope,sourceRef:candidate.source.event_key,budget:{used:false},generate:async()=>answer('party')});assert.equal(result,undefined);assert.equal(f.db.listCityRecords('entries',{kind:'narrative_unit',includeGM:true}).length,0);assert.equal(f.db.getCharacter(f.ada.id).data.location,undefined);
});

test('changed owner-private narrative source invalidates an earlier authoring scope',async t=>{
 const f=privateOpening(t),prior=openingEntryNarrativeCandidate(f.db,'entries',f.opportunity.record_key,f.scope),source=prior.source.event_key;f.db.upsertCharacterNarrative('entries',f.ada.id,'player','# New owner memory\n\nI keep the blue thread.');const oldResult=await authorNarrativeRequests({db:f.db,guild:'entries',result:prior.candidate,scope:f.scope,sourceRef:source,budget:{used:false},generate:async()=>answer()});assert.equal(oldResult,undefined);assert.equal(f.db.listCityRecords('entries',{kind:'narrative_unit',includeGM:true}).length,0);assert.equal(f.db.getCharacter(f.ada.id).data.location,undefined);
});

test('absent owner or current role cannot create a private authoring source for another player',t=>{
 const f=privateOpening(t),other={mode:'private',actorUserId:'noor',actorCharacterId:f.noor.id};assert.throws(()=>openingEntryProjection(f.db,'entries',f.opportunity.record_key,other));f.db.setPresence(f.session.id,'ada','absent');assert.throws(()=>openingEntryProjection(f.db,'entries',f.opportunity.record_key,f.scope));assert.equal(f.db.getCharacter(f.ada.id).data.location,undefined);
});

test('changed owner material and Director scene make the earlier private scope stale with no automatic position',async t=>{
 const f=privateOpening(t),candidate=openingEntryNarrativeCandidate(f.db,'entries',f.opportunity.record_key,f.scope);f.db.updateCharacterData(f.ada.id,d=>{d.entry_hooks=['Ask where the glassblower went.'];});assert.equal(await authorNarrativeRequests({db:f.db,guild:'entries',result:candidate.candidate,scope:f.scope,sourceRef:candidate.source.event_key,budget:{used:false},generate:async()=>answer()}),undefined);assert.equal(f.db.listCityRecords('entries',{kind:'narrative_unit',includeGM:true}).length,0);assert.equal(f.db.getCharacter(f.ada.id).data.location,undefined);const g=privateOpening(t),old=openingEntryNarrativeCandidate(g.db,'entries',g.opportunity.record_key,g.scope);g.db.setDirectorState(g.session.id,{scene_number:2});assert.equal(await authorNarrativeRequests({db:g.db,guild:'entries',result:old.candidate,scope:g.scope,sourceRef:old.source.event_key,budget:{used:false},generate:async()=>answer()}),undefined);assert.equal(g.db.listCityRecords('entries',{kind:'narrative_unit',includeGM:true}).length,0);assert.notEqual(old.source.event_key,'');
});

test('no accepted creative scene returns honest bounded orientation and does not claim an authored hook or delivered narrative',t=>{
 const f=privateOpening(t),out=prepareOpeningEntryOutput(f.db,'entries',f.opportunity.record_key,f.scope);assert.equal(out.entry_evidence.fallback,true);assert.equal(out.entry_evidence.narrative_verified,false);assert.match(out.narration,/not been certified/);assert.doesNotMatch(out.narration,/THE SHADE|GM-HOOK|sleeping harbor|replaced the copper lantern/);assert.equal(out.private_messages.length,0);assert.equal(f.db.getCharacter(f.ada.id).data.location,undefined);assert.equal(f.db.hasCharacterPlacementHistory('entries',f.ada.id),false);
});

test('owner source replay keeps original immutable scope and another owner cannot receive its private material',t=>{
 const f=privateOpening(t),first=openingEntryNarrativeCandidate(f.db,'entries',f.opportunity.record_key,f.scope),saved=JSON.stringify(first.source);assert.deepEqual(openingEntryNarrativeCandidate(f.db,'entries',f.opportunity.record_key,f.scope).candidate,first.candidate);assert.equal(JSON.stringify(f.db.getWorldEvent('entries',first.source.event_key)),saved);assert.equal(JSON.stringify(first).includes('sleeping harbor'),false);assert.equal(f.db.getCharacter(f.noor.id).data.location,undefined);
});

test('native position is not inferred from attendance after context and output acceptance',async t=>{
 const f=privateOpening(t),before=structuredClone(f.db.getCharacter(f.ada.id).data),source=openingEntryNarrativeCandidate(f.db,'entries',f.opportunity.record_key,f.scope);await authorNarrativeRequests({db:f.db,guild:'entries',result:source.candidate,scope:f.scope,sourceRef:source.source.event_key,budget:{used:false},generate:async()=>answer()});const out=prepareOpeningEntryOutput(f.db,'entries',f.opportunity.record_key,f.scope);assert.equal(out.entry_evidence.narrative_verified,true);assert.equal(f.db.getCharacter(f.ada.id).data.location,undefined);assert.deepEqual(f.db.getCharacter(f.ada.id).data,before);assert.equal(scenePresence(f.db,'entries','character',f.ada.id),null);
});
