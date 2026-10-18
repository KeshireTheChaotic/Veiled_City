/** Delegated ordinary GM fiction; independent typed units, native receipts for effects, no arbitrary raw-output waiver. */
import {buildNarrativeContext,narrativeVisible} from './narrative-authority-context.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail,narrativeSourceVisible} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
import {establishNarrativeEntity} from './autonomous-world.js';
import {activeCityProxy,assertNpcAvailability} from './city-constraints.js';
import {materialParaphrases} from './narrative-integrity.js';
import {nativeOutcomeProjection} from './native-outcome-output.js';
import {narrativeUnitKinds} from './gm-fiction-schema.js';
import {objectiveEvidence} from './epistemic.js';
import {retainEstablishedNarrative} from './narrative-memory.js';
import {noteNarrativeReuse} from './narrative-salience.js';
import {creativeBrief} from './narrative-delegation.js';
import {withoutVerifiedVocative} from './narrative-speakers.js';
import {actorReferenceVisible} from './npc-cognition-projection.js';
import {projectNarrativeArtifact,hasNarrativeChoices,narrativeArtifactKey} from './narrative-artifacts.js';
import {mintNarrativeAudience,revalidateNarrativeAudience} from './audience-native-v9.js';
import {compileWriterV9,actToNativeUnit} from './narrative-writer-v9.js';
import {constructNativeClause} from './narrative-clauses-v9.js';
import {worldIdentityOrigin} from './world-authorship.js';
export {narrativeResponseSchema} from './gm-fiction-schema.js';
const issuer='native:narrative-authority';
export const NARRATIVE_AUTHORITY_INSTRUCTIONS='You are the creative GM for this audience-isolated packet. Invent interesting ordinary places, people, sensory surroundings, '
  +'believable NPC self-knowledge/motives/ordinary plans/dialogue, soft leads and attributed rumors. No older ledger fact is required for new ordinary fiction. '
  +'Respect existing fiction and canon. Do not reveal hidden causes or infer NPC omniscience. NPC rumors/claims are not objective truth. '
  +'Return independently meaningful acts plus compact fiction_delta for meaningful named NPC/place identities, in this SAME call. '
  +'Use creative_brief.source_tasks to address each exact requested target separately. Set speaker_key to the native NPC key for its visual description as well as speech; one speaker does not answer another speaker\'s task. '
  +'Prioritize an NPC answer over optional atmosphere. Scene-only detail needs no separate entity. Use exact stable IDs. Reuse existing locations/NPCs without redeclaring them in fiction_delta; never replace their identity or summary. '
  +'Use speaker_brief direction and only that speaker\'s entitled knowledge. A native-known PC address may begin NPC dialogue as Name, or Mr./Ms./Mx. Name,; it permits only the address, never that PC\'s answer or action. '
  +'In protected combat, contests and PvP, portray atmosphere and NPC attempts freely within these same boundaries. Native_results are already resolved evidence, never permission for an additional hit or reaction. '
  +'NPCs may refuse, lie, speculate, pursue their own ordinary goals and attempt local actions. Do not convert an attempt into completed travel, success or a PC effect. Offscreen progression needs native world-time authority. '
  +'Never choose PC/proxy actions, reactions, dialogue, thoughts, feelings, consent, commitments or disclosures; never assert native damage, custody, movement, costs, success or inventory without a matching receipt. '
  +'Model receipt/safe/authority labels cannot authorize anything. native_outcome_render is projected from a real receipt; its text field confers no authority. '
  +'Second-person sensory POV is allowed only for a proven character viewpoint, never for a camera. Camera openings do not place or grant in-world knowledge to PCs. '
  +'Human-controlled NPCs cannot be authored by you. Audience is fixed by the server; do not supply visibility fields. Party is not character-private. References must be entitled native evidence. '
  +'Assembly/input source refs authenticate a request, not NPC knowledge. NPC speech may cite only the speaker\'s entitled known knowledge sources; ordinary new self-dialogue/speculation uses source_refs: []. Never copy assembly refs into NPC recall. '
  +'For assembly_brief, connect a private ordinary opportunity to its supplied owner thread without asserting a new personal event. Public camera fiction contains no private motivations. Only genuinely placed PCs get sensory POV; camera openings invite participation, never assert arrival. '
  +'A lead may be a new observed oddity; its explanation stays unknown. No automatic binding contracts, locked access, hazards or other PC effects. '
  +'Use typed unit boundaries, not a mixed paragraph containing unauthorized PC assertions. No policy disclaimers. Generated English retains semantic risk; do not certify your own output as safe.';
export function protectedNarrativeNames(db,guild){
  const session=db.getActiveSession(guild),proxies=session?db.listNpcProxies(session.id,{statuses:['active']}):[];
  return [...new Set([...db.listGuildCharacters(guild).flatMap(pc=>[pc.id,pc.name,...String(pc.name).split(/\s+/),
    ...(Array.isArray(pc.data.aliases)?pc.data.aliases:[]),...(Array.isArray(pc.data.nicknames)?pc.data.nicknames:[])])
    ,...proxies.flatMap(p=>[p.npc_key,p.npc_name,db.getNpcProfile(guild,p.npc_key)?.display_name])]
    .filter(n=>typeof n==='string'&&n.trim().length>=3))];
}
function mentions(text,names){
  const tokens=new Set(String(text).toLocaleLowerCase().match(/[\p{L}\p{N}-]+/gu)||[]),low=String(text).toLocaleLowerCase();
  return names.some(n=>n.includes(' ')?low.includes(n.toLocaleLowerCase()):tokens.has(n.toLocaleLowerCase()));
}
function request(input){
  if(!input||Object.keys(input).sort().join()!=='kind,operation,source_refs,version'||input.version!==8||input.kind!=='narrative_request'
    ||!['describe_scene','current_situation','conversation','combat','continuation'].includes(input.operation)
    ||!Array.isArray(input.source_refs)||input.source_refs.length>12)throw fail('narrative_request');
}
const draftKey=(input,scope,sourceRef)=>`narrative-draft:${hash([input,scope,sourceRef])}`;
function context(db,guild,input,scope,sourceRef){
  request(input);const ctx=buildNarrativeContext(db,guild,scope,sourceRef,{operation:input.operation});
  if(input.source_refs.some(ref=>!narrativeSourceVisible(db,guild,ref,scope)))throw fail('request_source');return ctx;
}
function shape(answer){
  if(!answer||Object.keys(answer).sort().join()!=='fiction_delta,narrative_units'||!Array.isArray(answer.narrative_units)||answer.narrative_units.length>8
    ||!Array.isArray(answer.fiction_delta)||answer.fiction_delta.length>4)throw fail('narrative_response');
  const ids=new Set();for(const u of answer.narrative_units){
    if(!u||Object.keys(u).sort().join()!=='epistemic,id,kind,location_key,receipt_kind,receipt_ref,source_refs,subject_key,text,visibility'
      ||typeof u.id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(u.id)||ids.has(u.id)||!narrativeUnitKinds.includes(u.kind)
      ||typeof u.text!=='string'||!u.text.trim()||u.text.length>1800||/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(u.text)
      ||!Array.isArray(u.source_refs)||u.source_refs.length>8||u.source_refs.some(x=>typeof x!=='string'||x.length>200)
      ||!['party','character','gm'].includes(u.visibility)||!['observation','testimony','hypothesis','attempt','native_outcome'].includes(u.epistemic)
      ||['subject_key','location_key','receipt_kind','receipt_ref'].some(k=>typeof u[k]!=='string'||u[k].length>200))throw fail('narrative_unit_shape');
    ids.add(u.id);
  }
}
function validateUnit(db,guild,u,ctx,entities=[],historical=false,act=null){
  // Citing public evidence privately is allowed; authoring a new party unit from a
  // private writer packet is not. This check also runs on every deferred read.
  if(u.visibility!==(ctx.scope.mode==='private'?'character':'party'))throw fail('held_scope');
  if(!narrativeVisible({visibility:u.visibility,subject_key:ctx.scope.actorCharacterId},ctx.scope))throw fail(u.visibility==='gm'?'held_secret':'held_scope');
  if(u.source_refs.some(ref=>!(u.kind==='npc_speech'?actorReferenceVisible(db,guild,u.subject_key,ref,ctx.scope)
    :narrativeSourceVisible(db,guild,ref,ctx.scope))))throw fail('held_secret');
  if(u.location_key){
    const place=db.getSimulationEntity(guild,'location',u.location_key),proposed=entities.find(e=>e.kind==='location'&&e.key===u.location_key),
      identity=db.getCityRecord(guild,'autonomous_entity',`location:${u.location_key}`);
    if(!place&&!proposed||place&&(place.state.hidden||place.state.removed
      ||!narrativeVisible({visibility:place.state.visibility||'party',subject_key:place.state.subject_character_id},ctx.scope)
      ||identity&&!narrativeSourceVisible(db,guild,identity.source_event,ctx.scope)))throw fail('held_scope');
    if(identity?.data.authorship_ref&&!worldIdentityOrigin(db,guild,identity,ctx.scope))throw fail('held_scope');
  }
  if(u.kind==='native_outcome_render'){
    try{return nativeOutcomeProjection(db,guild,{version:4,kind:'native_outcome',receipt_kind:u.receipt_kind,ref:u.receipt_ref},ctx.scope).text;}
    catch(error){if(error.code==='NATIVE_NOTICE')throw fail('held_secret');throw error;}
  }
  // A location's visibility proves entitlement, not local presence. Do not let
  // mutually consistent remote speaker/unit fields mint a remote conversation.
  const local=u.location_key||ctx.binding.location;
  if(local!==ctx.binding.location){
    const proposed=entities.find(e=>e.kind==='location'&&e.key===local),
      created=db.getCityRecord(guild,'autonomous_entity',`location:${local}`);
    const newCamera=ctx.binding.viewpoint==='camera'&&!ctx.binding.location
      &&(proposed||created?.data?.narrative_origin===ctx.sourceRef);
    // Native new adjacent geography may be introduced from here; this is NOT
    // remote NPC hearing/speech, PC travel, access or an established remote view.
    const adjacentSetting=u.kind==='scene'&&ctx.binding.location
      &&(proposed?.parent_location_key===ctx.binding.location||created?.data?.narrative_origin===ctx.sourceRef
        &&db.getSimulationEntity(guild,'location',local)?.state.parent_location_key===ctx.binding.location);
    if(!newCamera&&!adjacentSetting)throw fail('held_scope');
  }
  if(u.receipt_kind||u.receipt_ref||u.epistemic==='native_outcome')throw fail('held_material');
  if(act?.construction){
    const b=mintNarrativeAudience(ctx).proof,text=constructNativeClause(db,guild,act,b);
    if(hash(actToNativeUnit(act,b,{db,guild}))!==hash(u))throw fail('native_clause_binding');
    return u.kind==='npc_speech'?`${db.getNpcProfile(guild,u.subject_key).display_name}: “${text}”`:text;
  }
  const names=protectedNarrativeNames(db,guild);
  const assertions=withoutVerifiedVocative(db,guild,u,ctx);
  if(mentions(assertions,names)||materialParaphrases(assertions,names).length)throw fail('held_material');
  // Native NPC speech renders as attributed, unverified testimony, never a binding PC obligation/history receipt.
  // Agreement allegations may remain attributed; other retrospective PC actions keep their original tripwires.
  // A verified personal vocative waives ONLY the address/name check, never the original second-person agency guard.
  // A whole modal interrogative can propose an offer; it cannot answer it. All
  // remaining words still pass the same material and protected-reference guards.
  const speechAssertions=u.kind==='npc_speech'&&/^(?:would|could|will|can) you\b[^\r\n]*\?$/i.test(assertions)
    ?assertions.replace(/^(?:would|could|will|can) you (?:accept|agree)\b/i,'the proposed offer'):assertions;
  if(u.kind==='npc_speech'&&(/\b(?:you (?:agree|accept|accepted|obey|obeyed|surrender|surrendered|decide|decided|confess|confessed)|your (?:consent|agreement) is)\b/i.test(speechAssertions)
    ||assertions!==u.text&&/\b(?:you (?:agree|agreed|accept|accepted|obey|obeyed|surrender|surrendered|decide|decided|confess|confessed)|your (?:consent|agreement) is)\b/i.test(assertions)))throw fail('held_material');
  // Narrow POV allowance is perception, never a player choice. These finite tripwires are not universal semantics.
  const pov=u.text.replace(/\byou (?:can )?(?:see|hear|smell|notice)\b/gi,'the view').replace(/\byour (?:view|surroundings)\b/gi,'the view');
  if(ctx.binding.viewpoint==='camera'&&/\b(?:you|your|yours|yourself)\b/i.test(u.text)&&u.kind!=='npc_speech')throw fail('held_viewpoint');
  if(/\b(?:you|your|yours|yourself)\b/i.test(pov)&&u.kind!=='npc_speech')throw fail('held_material');
  if(/\b(?:HP|hit points?|armor slots?|stress (?:marks?|slots?)|marks? \d+|takes? \d+ damage|is (?:captured|restrained|arrested)|has surrendered)\b/i.test(u.text))throw fail('held_material');
  for(const f of db.listFactsForGM(guild,{limit:500}))if(f.content?.length>=12&&u.text.includes(f.content)
    &&(!narrativeVisible(f,ctx.scope)||!narrativeSourceVisible(db,guild,f.id,ctx.scope)))throw fail('held_secret');
  if(['npc_speech','npc_action_attempt'].includes(u.kind)||u.subject_key&&(db.getNpcProfile(guild,u.subject_key)
    ||entities.some(e=>e.kind==='npc'&&e.key===u.subject_key))){
    const entity=db.getSimulationEntity(guild,'npc',u.subject_key),proposed=entities.find(e=>e.kind==='npc'&&e.key===u.subject_key);
    // A scene/rumor label cannot authorize a known remote/proxy actor. Exact
    // established observations still require their independent native proof.
    if(ctx.binding.location&&(u.location_key||ctx.binding.location)!==ctx.binding.location
      ||db.getCharacter(u.subject_key)||activeCityProxy(db,guild,u.subject_key)&&u.kind!=='established_observation'
      ||!entity&&!proposed||entity&&(entity.state.hidden||entity.state.removed
      ||!narrativeVisible({visibility:entity.state.visibility||'party',subject_key:entity.state.subject_character_id},ctx.scope)
      ||entity.state.location_key!==(u.location_key||ctx.binding.location)))throw fail('held_scope');
    const identity=db.getCityRecord(guild,'autonomous_entity',`npc:${u.subject_key}`);
    if(identity?.data.authorship_ref&&!worldIdentityOrigin(db,guild,identity,ctx.scope))throw fail('held_scope');
    if(identity&&!narrativeSourceVisible(db,guild,identity.source_event,ctx.scope)||db.getNpcProfile(guild,u.subject_key)?.activity_tier==='dormant')throw fail('held_scope');
    if(entity&&['npc_speech','npc_action_attempt'].includes(u.kind))try{assertNpcAvailability(db,guild,u.subject_key,{type:'contact',location_key:u.location_key||ctx.binding.location});}
    catch(error){if(!error.code&&error.constructor===Error)throw fail('held_scope');throw error;}
    if(['npc_speech','npc_action_attempt'].includes(u.kind)&&u.source_refs.length
      &&!u.source_refs.every(ref=>actorReferenceVisible(db,guild,u.subject_key,ref,ctx.scope)))throw fail('held_secret');
  }
  if(u.kind==='established_observation'){
    if(u.source_refs.length!==1)throw fail('held_scope');
    const fact=db.getFact(guild,u.source_refs[0]),event=db.getWorldEvent(guild,u.source_refs[0]);
    if(fact&&!objectiveEvidence(db,guild,fact)||event&&!(event.kind==='observation'&&event.truth_status==='observed'
      ||event.kind==='native_narrative_unit'&&event.details.epistemic==='observation'))throw fail('held_scope');
    if(u.text!==(fact?.content||event?.details.description||event?.details.quote))throw fail('held_scope');
  }
  if(u.kind==='rumor'&&!['testimony','hypothesis'].includes(u.epistemic)||u.kind==='npc_action_attempt'&&u.epistemic!=='attempt')throw fail('held_material');
  const artifact=projectNarrativeArtifact(db,guild,u,ctx,{historical});
  if(!historical&&u.kind!=='npc_speech'&&!artifact&&hasNarrativeChoices(u.text))throw fail('held_material');
  if(artifact)return artifact;
  return u.kind==='rumor'?`Rumor — ${u.text}`:u.kind==='npc_speech'
    ?`${db.getNpcProfile(guild,u.subject_key)?.display_name||entities.find(e=>e.key===u.subject_key)?.name||'An NPC'}: “${u.text}”`:u.text;
}
function review(db,guild,key,sourceRef,scope,reason){
  return db.saveCityRecord(guild,{kind:'narrative_unit_review',key,status:'needs_review',visibility:'gm',source_event:sourceRef,
    data:{version:1,reason,scope,canonical:false}});
}
export async function authorNarrativeRequests({db,guild,result,scope,sourceRef,budget,generate,viewProvider=null}){
  if(result.respond===false||result.act===false)return;
  for(const input of (result.gm_world_parts||[]).filter(p=>p?.version===8)){
    const key=draftKey(input,scope,sourceRef),attempt=`scene-authoring-attempt:${hash([sourceRef,scope])}`;
    try{
      const ctx=viewProvider?viewProvider(input):context(db,guild,input,scope,sourceRef);request(input);
      ctx.packet.creative_brief=creativeBrief(ctx,result,input);ctx.packet.protected_scene=ctx.protectedScene;
      const generic=mintNarrativeAudience(ctx).proof.task_ids;
      const audience=mintNarrativeAudience(ctx,{taskIds:[...new Set([...generic,...ctx.packet.creative_brief.source_tasks.map(t=>t.id)])].slice(0,24)});
      ctx.packet.audience_v9=audience.proof;
      const nativeResults=[];
      for(const proposed of (result.gm_world_parts||[]).filter(part=>part.version===4)){
        try{const projection=nativeOutcomeProjection(db,guild,proposed,scope);nativeResults.push({kind:proposed.receipt_kind,ref:proposed.ref,text:projection.text});}
        catch(error){if(!['NARRATIVE_PVP','NATIVE_NOTICE','ORDINARY_EFFECT','TYPED_ROLL_PROOF'].includes(error.code))throw error;}
      }
      ctx.packet.native_results=nativeResults.slice(0,4);
      const prior=db.getCityRecord(guild,'narrative_draft',key);if(prior){if(hash(prior.data.binding)!==hash(ctx.binding))throw fail('stale_draft');continue;}
      if(budget.used||db.getCityRecord(guild,'scene_authoring_attempt',attempt)
        ||db.getCityRecord(guild,'npc_authoring_attempt',`npc-authoring-attempt:${hash([sourceRef,scope])}`))throw fail('writer_budget');
      budget.used=true;db.saveCityRecord(guild,{kind:'scene_authoring_attempt',key:attempt,status:'authoring',visibility:'gm',source_event:sourceRef,
        data:{version:3,draft:key,packet_hash:hash(ctx.packet)}});
      const generated=await generate(ctx.packet);
      const v9=generated?.version===9?compileWriterV9(generated,audience,(u,entities,act)=>validateUnit(db,guild,u,ctx,entities,false,act),{db,guild}):null;
      const answer=v9?v9.answer:generated;shape(answer);
      const data={version:v9?9:1,issuer,input,binding:ctx.binding,answer,audience_v9:audience.proof,
        ...(v9?{acts_v9:v9.acts,compiled_v9:v9.compiled}:{}),creative_brief:ctx.packet.creative_brief,packet_hash:hash(ctx.packet),semantic_verification:false};
      db.saveCityRecord(guild,{kind:'narrative_draft',key,status:'drafted_private',visibility:'gm',source_event:sourceRef,data});
      db.saveCityRecord(guild,{...db.getCityRecord(guild,'scene_authoring_attempt',attempt),key:attempt,status:'authored'});
    }catch(error){
      if(error.code!=='SCENE_FICTION')throw error;
      review(db,guild,key,sourceRef,scope,error.diagnostic?.category||'authoring_unavailable');
    }
  }
}
/** Existing authoritative transaction owns creation and unit establishment; raw combined narration is never consumed. */
export function establishNarrativeUnits(db,guild,input,scope,sourceRef,{content=null}={}){
  const ctx=context(db,guild,input,scope,sourceRef),draft=db.getCityRecord(guild,'narrative_draft',draftKey(input,scope,sourceRef)),d=draft?.data;
  if(draft?.status!=='drafted_private'||d?.issuer!==issuer||hash(d.binding)!==hash(ctx.binding)||d.semantic_verification!==false)throw fail('isolated_draft_required');
  if(d.audience_v9)revalidateNarrativeAudience(db,guild,d.audience_v9,scope);
  shape(d.answer);const units=[],fates=(d.compiled_v9||[]).filter(a=>a.status==='held').map(a=>({id:a.id,fate:a.reason})),entities=d.answer.fiction_delta.filter(e=>e&&typeof e==='object'&&!Array.isArray(e));
  for(const u of d.answer.narrative_units){
    try{validateUnit(db,guild,u,ctx,entities,false,d.acts_v9?.find(a=>a.id===u.id));units.push(u);}
    catch(error){if(!['SCENE_FICTION','NARRATIVE_PVP'].includes(error.code))throw error;fates.push({id:u.id,fate:error.diagnostic?.category||'held_material'});}
  }
  const failedEntities=new Set(),entityResults=[];
  const identityKey=e=>`${e.kind}:${e.key}`;
  for(const e of [...entities].sort((a,b)=>Number(a.kind==='npc')-Number(b.kind==='npc'))){
    const newLocalPlace=e.kind==='npc'&&entities.some(p=>p.kind==='location'&&p.key===e.location_key
      &&p.parent_location_key===ctx.binding.location&&units.some(u=>u.kind==='scene'&&u.location_key===p.key));
    if(!units.some(u=>u.subject_key===e.key||u.location_key===e.key)&&!newLocalPlace)continue;
    try{
      // A redundant creation proposal cannot replace an existing identity or poison its independently valid prose.
      // Actual unit placement/visibility/proxy checks still run both before and after this step.
      if(['location','npc'].includes(e.kind)&&db.getSimulationEntity(guild,e.kind,e.key)){
        entityResults.push({kind:e.kind,key:e.key,status:'reused_existing',reason:'creation_ignored_no_overwrite'});continue;
      }
      if(mentions(`${e.name} ${e.summary} ${(e.aliases||[]).join(' ')}`,protectedNarrativeNames(db,guild)))throw fail('held_material');
      validateUnit(db,guild,{id:'identity',kind:'scene',text:`${e.name} ${e.summary} ${e.role}`,subject_key:'',location_key:ctx.binding.location||'',
        visibility:scope.mode==='private'?'character':'party',epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''},ctx,entities);
      db.transaction(()=>establishNarrativeEntity(db,guild,e,ctx,{content}));
      entityResults.push({kind:e.kind,key:e.key,status:'created'});
    }catch(error){if(!['SCENE_FICTION','AUTONOMOUS_WORLD'].includes(error.code))throw error;
      failedEntities.add(identityKey(e));entityResults.push({kind:e.kind,key:e.key,status:'rejected',reason:error.diagnostic?.category||'native_identity_validation'});}
  }
  const rows=[];
  for(const u of units){
    const key=`narrative-unit:${hash([d.binding,u])}`,prior=db.getCityRecord(guild,'narrative_unit',key);
    // Only structured identity dependencies confer placement/speaker authority; a name appearing in prose is not a dependency.
    if(failedEntities.has(`location:${u.location_key}`)||entities.some(e=>e.key===u.subject_key&&failedEntities.has(identityKey(e)))){
      fates.push({id:u.id,fate:'held_scope'});continue;
    }
    try{
      const text=validateUnit(db,guild,u,ctx,[],false,d.acts_v9?.find(a=>a.id===u.id)),data={version:d.version===9?9:1,issuer,binding:d.binding,unit:u,text,semantic_verification:false,
        ...(d.audience_v9?{audience_v9:d.audience_v9}:{}),
        ...(d.version===9?{act_v9:d.acts_v9.find(a=>a.id===u.id)}:{}),
        epistemic:u.kind==='rumor'?'testimony':u.kind==='npc_speech'?'attributed':u.kind==='native_outcome_render'?'native_outcome':u.epistemic};
      projectNarrativeArtifact(db,guild,u,ctx,{establish:true});
      if(prior){renderNarrativeUnit(db,guild,key,scope);rows.push(prior);fates.push({id:u.id,fate:'published'});continue;}
      const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_narrative_unit',title:'Source-bound delegated GM fiction',source_id:issuer,
        scene:ctx.binding.scene,session_id:ctx.binding.session,location_key:u.location_key||ctx.binding.location||'',visibility:u.visibility,
        subject_key:scope.mode==='private'?scope.actorCharacterId:null,details:{input_source:sourceRef,
          source_refs:u.source_refs.filter(ref=>narrativeSourceVisible(db,guild,ref,scope)),
          ...(u.kind==='npc_speech'?{actor_evidence_refs:u.source_refs,actor:u.subject_key}:{}),
          ...(db.getCityRecord(guild,'narrative_artifact',narrativeArtifactKey(ctx.binding,u))?{artifact_ref:narrativeArtifactKey(ctx.binding,u)}:{}),
          payload_hash:hash(data),epistemic:data.epistemic}},issuer);
      const accepted=db.saveCityRecord(guild,{kind:'narrative_unit',key,status:'accepted_established',visibility:u.visibility,subject_key:scope.mode==='private'?scope.actorCharacterId:null,
        source_event:event.event_key,location_key:event.location_key,data});
      retainEstablishedNarrative(db,guild,accepted);noteNarrativeReuse(db,guild,accepted);rows.push(accepted);fates.push({id:u.id,fate:'published'});
    }catch(error){if(!['SCENE_FICTION','NARRATIVE_PVP'].includes(error.code))throw error;fates.push({id:u.id,fate:error.diagnostic?.category||'held_scope'});}
  }
  db.saveCityRecord(guild,{kind:'narrative_unit_fates',key:draft.record_key,status:'evaluated',visibility:'gm',source_event:sourceRef,
    data:{version:2,fates,entity_results:entityResults,scope,source:sourceRef}});
  for(const fate of fates.filter(f=>f.fate!=='published'))review(db,guild,`${draft.record_key}:${fate.id}`,sourceRef,scope,fate.fate);
  return rows;
}
export function renderNarrativeUnit(db,guild,key,scope){
  const row=db.getCityRecord(guild,'narrative_unit',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.status!=='accepted_established'||d?.issuer!==issuer||event?.status!=='active'||event.source_id!==issuer
    ||event.details.payload_hash!==hash(d)||key!==`narrative-unit:${hash([d.binding,d.unit])}`||hash(d.binding.scope)!==hash(scope))throw fail('unit_receipt');
  const ctx=context(db,guild,{version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]},scope,d.binding.source);
  if(hash(ctx.binding)!==hash(d.binding)||validateUnit(db,guild,d.unit,ctx,[],true,d.act_v9)!==d.text)throw fail('unit_revalidation');
  if(d.audience_v9)revalidateNarrativeAudience(db,guild,d.audience_v9,scope);
  if(d.act_v9&&(!d.audience_v9.task_ids.includes(d.act_v9.task_id)||hash(actToNativeUnit(d.act_v9,d.audience_v9,{db,guild}))!==hash(d.unit)))throw fail('v9_act_revalidation');
  return d.text;
}
