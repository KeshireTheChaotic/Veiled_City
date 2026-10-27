import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createNpcEvidenceProjection} from '../../src/frameworks/npc/public.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import {jsonHash} from '../../src/kernel/json-hash.js';
import {sceneFictionHash} from '../../src/scene-fiction-context.js';
import * as original from '../../src/frameworks/npc/public.js';

function evidenceTable(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-actor-proof-c05-')),file=join(folder,'proof.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),allowed=true,principal={kind:'owner',revision:'current-controller'};const seen=[];db.ensureCampaign('stage');db.upsertNpcProfile('stage',{npcKey:'lamplighter',displayName:'Lamplighter'});
 const api=createNpcEvidenceProjection({indexWorldEvent,narrativeSourceVisible:(...args)=>{seen.push(args);return allowed;},conversationPrincipal:()=>{if(principal instanceof Error)throw principal;return principal;}}),scope={mode:'party'};
 const imported=()=>{const ref=api.recordImportedNpcKnowledge(db,'stage','lamplighter','copper-lamp','A copper lamp was delivered');const row=db.upsertNpcKnowledge('stage',{npcKey:'lamplighter',knowledgeKey:'copper-lamp',content:'A copper lamp was delivered',beliefState:'known',confidence:95,sourceType:'seed',sourceRef:ref,isSecret:false});return row;};
 const hearing=({privateScene=false}={})=>{const pc=db.createCharacter('stage','speaker','Speaker'),quote='I saw a blue lamp',raw='Say: '+quote,sourceHash=createHash('sha256').update(raw).digest('hex');indexWorldEvent(db,'stage',{key:'utterance-input',kind:'ai_gm_input',title:'Owner source fixture',source_id:'player:speaker',details:{raw_text:raw,raw_hash:sourceHash}},'speaker');db.saveCityRecord('stage',{kind:'typed_intent',key:'speech-intent',status:'accepted_for_adjudication',source_event:'utterance-input',data:{type:'speak',actor:pc.id,owner_user_id:'speaker',target_key:'lamplighter',utterance:quote,source_hash:sourceHash,start:5,end:raw.length,source_span:quote,actor_principal_revision:'current-controller'}});indexWorldEvent(db,'stage',{key:'heard-lamp',kind:'authored_speech',title:'Native hearing fixture',source_id:'player:speaker',details:{character_id:pc.id,author:'speaker',listeners:['lamplighter'],typed_intent:'speech-intent',quote,input_source:'utterance-input',private_scene:privateScene,principal_revision:'current-controller'}},'speaker');const row=db.addNpcMemory('stage',{npcKey:'lamplighter',content:pc.name+' said: “'+quote+'” (claim unverified; not consent or binding terms)',subjectType:'character',subjectKey:pc.id,sourceType:'heard',sourceRef:'heard-lamp'});return {pc,row};};
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},scope,seen,imported,hearing,setAllowed:v=>allowed=v,setPrincipal:v=>principal=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('imported nonsecret actor testimony has exact same kernel digest and private native source after reopen',t=>{
 const f=evidenceTable(t),row=f.imported(),event=f.db.getWorldEvent('stage',row.source_ref);assert.equal(event.visibility,'gm');assert.equal(event.kind,'native_npc_knowledge_import');assert.equal(event.details.payload_hash,jsonHash(event.details.payload));assert.equal(sceneFictionHash(event.details.payload),jsonHash(event.details.payload));assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),true);f.reopen();assert.equal(original.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),true);assert.equal(f.db.listCanon('stage',{includeGM:true}).length,0);assert.equal(f.db.listWorldEvents('stage').length,0);
});

test('actor import cannot authorize another actor, altered content, belief or secret flag',t=>{
 const f=evidenceTable(t),row=f.imported();for(const changed of [{...row,content:'Different claim'},{...row,belief_state:'suspected'},{...row,is_secret:1},{...row,knowledge_key:'other'}])assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',changed,f.scope),false);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','another',row,f.scope),false);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',null,f.scope),false);
});

test('tampered native import payload hash and retracted native source are rejected without rewriting beliefs',t=>{
 const f=evidenceTable(t),row=f.imported(),event=f.db.getWorldEvent('stage',row.source_ref);f.db.saveWorldEvent('stage',{...event,key:event.event_key,details:{...event.details,payload_hash:'changed'}});assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);indexWorldEvent(f.db,'stage',{key:event.event_key,status:'retracted'});f.reopen();assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);assert.equal(f.db.getNpcKnowledge('stage','lamplighter','copper-lamp').content,row.content);
});

test('generic actor evidence independently asks Narrative audience policy and denies secret, unknown and missing sources first',t=>{
 const f=evidenceTable(t);indexWorldEvent(f.db,'stage',{key:'ordinary',title:'Ordinary source',source_id:'gm:ordinary'});const row={source_ref:'ordinary',content:'An attributed observation',belief_state:'known'};f.setAllowed(false);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);assert.equal(f.seen[0][2],'ordinary');assert.equal(f.seen[0][3],f.scope);f.setAllowed(true);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),true);for(const patch of [{is_secret:1},{belief_state:'unknown'},{source_ref:'missing'}])assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',{...row,...patch},f.scope),false);
});

test('an actor-relative narrative certificate is not recursively promoted as new actor evidence',t=>{
 const f=evidenceTable(t);indexWorldEvent(f.db,'stage',{key:'derived',kind:'native_narrative_unit',title:'Derived speech',source_id:'native:narrative-authority',details:{actor_evidence_refs:['some-other-certificate']}});assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',{source_ref:'derived',belief_state:'known'},f.scope),false);assert.equal(f.seen.length,0);
});

test('authored hearing requires exact native typed intent, owner source and original quotation rather than agreement',t=>{
 const f=evidenceTable(t),{row}=f.hearing();assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),true);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',{...row,content:'Speaker accepted a binding contract'},f.scope),false);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','another',row,f.scope),false);const typed=f.db.getCityRecord('stage','typed_intent','speech-intent');f.db.saveCityRecord('stage',{...typed,key:typed.record_key,data:{...typed.data,source_span:'I accepted'}});assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);
});

test('private hearing remains scoped to its original owner character and does not become party or cross-owner knowledge',t=>{
 const f=evidenceTable(t),{row,pc}=f.hearing({privateScene:true});assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,{mode:'private',actorUserId:'speaker',actorCharacterId:pc.id}),true);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,{mode:'private',actorUserId:'another',actorCharacterId:pc.id}),false);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,{mode:'private',actorUserId:'speaker',actorCharacterId:'other-pc'}),false);
});

test('changed principal, proxy control or unavailable principal denies previously eligible hearing',t=>{
 const f=evidenceTable(t),{row}=f.hearing();f.setPrincipal({kind:'owner',revision:'new-control'});assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);f.setPrincipal({kind:'pc_proxy',revision:'current-controller'});assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);f.setPrincipal(Error('no active assignment'));assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);
});

test('hearing cannot bypass current source visibility, retraction or changed raw source hash',t=>{
 const f=evidenceTable(t),{row}=f.hearing();f.setAllowed(false);assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);f.setAllowed(true);const input=f.db.getWorldEvent('stage','utterance-input');f.db.saveWorldEvent('stage',{...input,key:input.event_key,details:{...input.details,raw_text:'Replaced owner text'}});assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);indexWorldEvent(f.db,'stage',{key:'utterance-input',status:'retracted'});f.reopen();assert.equal(f.api.actorEvidenceVisible(f.db,'stage','lamplighter',row,f.scope),false);
});

test('actor reference eligibility requires that actor actual known testimony or native hearing memory',t=>{
 const f=evidenceTable(t),row=f.imported();assert.equal(f.api.actorReferenceVisible(f.db,'stage','lamplighter',row.source_ref,f.scope),true);assert.equal(f.api.actorReferenceVisible(f.db,'stage','another',row.source_ref,f.scope),false);const heard=f.hearing();assert.equal(f.api.actorReferenceVisible(f.db,'stage','lamplighter',heard.row.source_ref,f.scope),true);assert.equal(f.api.actorReferenceVisible(f.db,'stage','lamplighter','missing',f.scope),false);
});

test('original imported-knowledge source provider reaches the same native payload without audience or canon mutation',t=>{
 const f=evidenceTable(t),ref=original.recordImportedNpcKnowledge(f.db,'stage','lamplighter','street-sign','A street sign points north'),event=f.db.getWorldEvent('stage',ref);assert.equal(event.details.payload.npc,'lamplighter');assert.equal(event.details.payload.disclosure,'nonsecret_actor_testimony');assert.equal(event.visibility,'gm');assert.equal(f.db.getNpcKnowledge('stage','lamplighter','street-sign'),undefined);assert.equal(f.db.listCanon('stage',{includeGM:true}).length,0);
});
