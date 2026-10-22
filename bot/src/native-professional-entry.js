/** Source-bound prepared-position evidence and one-per-encounter Professional Entry use. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

export const PROFESSIONAL_ENTRY='adversary:aster-vale-contractor:professional-entry';
const issuer='native:professional-entry';
const positionKinds=['fortified_position','prepared_defense','established_ambush','barricade','other_prepared_position'];
const qualifyingActions=['breach','restrain','surprise'];
const keys=(v,expected)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===expected;

function positionKey(encounter,ref){return `prepared-position:${hash([encounter,ref])}`;}
function useKey(encounter,actor){return `professional-entry-use:${hash([encounter,actor,PROFESSIONAL_ENTRY])}`;}
function currentEncounter(db,guild,binding){
  const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(binding.session);
  if(scene.key!==binding.scene||scene.session_id!==binding.session||encounter?.status!=='active')return null;
  return encounter;
}
function activeSource(db,guild,row){
  const event=row&&db.getWorldEvent(guild,row.source_event),d=row?.data;
  if(row?.status!=='active'||row.kind!=='native_prepared_position'||row.visibility!=='gm'||!d
    ||!['gm_scene_fiction','native_encounter_record'].includes(d.evidence_kind)
    ||event?.status!=='active'||event.session_id!==d.session||event.scene!==d.scene
    ||event.details?.payload_hash!==hash(d))return null;
  if(d.evidence_kind==='gm_scene_fiction'&&(event.kind!=='native_prepared_position_established'||event.source_id!==issuer))return null;
  if(d.evidence_kind==='native_encounter_record'&&event.kind!=='native_encounter_preparation')return null;
  return event;
}

/** Model-authored fiction becomes a GM-private native scene fact; no roll or effect is granted here. */
export function establishPreparedPositions(db,guild,binding,proposals=[]){
  if(!Array.isArray(proposals)||proposals.length>4)throw fail('prepared_position_batch_shape');
  if(!proposals.length)return [];
  const encounter=currentEncounter(db,guild,binding),inputSource=db.getWorldEvent(guild,binding.source);
  if(!encounter||inputSource?.status!=='active'||inputSource.session_id!==binding.session||inputSource.scene!==binding.scene)
    throw fail('prepared_position_current_encounter_source');
  const seen=new Set(),result=[];
  for(const proposal of proposals){
    if(!keys(proposal,'description,kind,position_ref,target_refs')||!positionKinds.includes(proposal.kind)
      ||typeof proposal.position_ref!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(proposal.position_ref)
      ||typeof proposal.description!=='string'||!proposal.description.trim()||proposal.description.length>600
      ||!Array.isArray(proposal.target_refs)||!proposal.target_refs.length||proposal.target_refs.length>8
      ||proposal.target_refs.some(ref=>typeof ref!=='string'||!ref||ref.length>160)
      ||new Set(proposal.target_refs).size!==proposal.target_refs.length||seen.has(proposal.position_ref))
      throw fail('prepared_position_closed_proposal');
    seen.add(proposal.position_ref);
    for(const target of proposal.target_refs){
      const pc=db.getCharacter(target),presence=pc?.guild_id===guild?scenePresence(db,guild,'character',target):scenePresence(db,guild,'npc',target),
        source=presence&&db.getWorldEvent(guild,presence.source_event),entity=!pc&&db.getSimulationEntity(guild,'npc',target);
      const localPlace=target===binding.location&&db.getSimulationEntity(guild,'location',target);
      if(!localPlace&&(!presence||presence.data.state!=='actually_present'||presence.data.scene!==binding.scene
        ||presence.location_key!==binding.location||source?.status!=='active'||pc&&pc.guild_id!==guild
        ||!pc&&(!db.getNpcProfile(guild,target)||!entity||entity.state.location_key!==binding.location||entity.state.removed
          ||['dead','removed'].includes(entity.state.status))))throw fail('prepared_position_target_not_current');
    }
    const key=positionKey(encounter.id,proposal.position_ref),prior=db.getCityRecord(guild,'native_prepared_position',key);
    if(prior){
      const event=activeSource(db,guild,prior);
      if(!event||prior.data.encounter!==encounter.id||prior.data.position_ref!==proposal.position_ref
        ||prior.data.kind!==proposal.kind||prior.data.description!==proposal.description
        ||hash(prior.data.target_refs)!==hash(proposal.target_refs))throw fail('prepared_position_immutable_replay');
      result.push(prior);continue;
    }
    const data={version:1,issuer,evidence_kind:'gm_scene_fiction',position_ref:proposal.position_ref,kind:proposal.kind,
      description:proposal.description.trim(),target_refs:[...proposal.target_refs],encounter:encounter.id,
      session:binding.session,scene:binding.scene,location:binding.location,established_from:binding.source};
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_prepared_position_established',source_id:issuer,
      title:'GM-established prepared position',session_id:binding.session,scene:binding.scene,location_key:binding.location,
      visibility:'gm',details:{input_source:binding.source,payload_hash:hash(data)}},issuer);
    if(event.status!=='active'||event.details.payload_hash!==hash(data))throw fail('prepared_position_source_commit');
    result.push(db.saveCityRecord(guild,{kind:'native_prepared_position',key,status:'active',source_event:event.event_key,
      visibility:'gm',location_key:binding.location,data}));
  }
  return result;
}

/** Exact current encounter positions for the GM-only arbitration context. */
export function preparedPositionCandidates(db,guild,binding){
  const encounter=currentEncounter(db,guild,binding);if(!encounter)return [];
  return db.listCityRecords(guild,{kind:'native_prepared_position',includeGM:true,limit:200})
    .filter(row=>row.data?.encounter===encounter.id&&row.data.session===binding.session&&row.data.scene===binding.scene
      &&row.data.location===binding.location&&activeSource(db,guild,row))
    .sort((a,b)=>Number(b.data.evidence_kind==='native_encounter_record')-Number(a.data.evidence_kind==='native_encounter_record'))
    .map(row=>({position_ref:row.data.position_ref,kind:row.data.kind,description:row.data.description,
      target_refs:[...row.data.target_refs],evidence_kind:row.data.evidence_kind,source_ref:row.source_event}));
}

/** Returns proof for a native roll; an absent or stale condition holds only this modifier. */
export function qualifyProfessionalEntry(db,guild,encounter,entry,proposal){
  if(proposal?.feature_ref!==PROFESSIONAL_ENTRY)return null;
  const intent=proposal.feature_intent;
  if(proposal.proposal_version!==4||proposal.advantage!==false||!intent||!qualifyingActions.includes(intent.action)
    ||typeof intent.position_ref!=='string'||entry?.actor?.type!=='npc'||!['attack','exceptional_action'].includes(entry.operation)
    ||!Array.isArray(entry.target_refs)||entry.target_refs.length!==1)return null;
  const records=db.listCityRecords(guild,{kind:'native_prepared_position',includeGM:true,limit:200})
    .filter(row=>row.data?.position_ref===intent.position_ref&&row.data.encounter===encounter?.id
      &&row.data.scene===entry.scene_ref&&activeSource(db,guild,row))
    .sort((a,b)=>Number(b.data.evidence_kind==='native_encounter_record')-Number(a.data.evidence_kind==='native_encounter_record'));
  const position=records[0];
  if(!position||!position.data.target_refs.includes(entry.target_refs[0]))return null;
  return {version:1,feature:PROFESSIONAL_ENTRY,action:intent.action,actor:entry.actor.key,target:entry.target_refs[0],
    encounter:encounter.id,position:position.record_key,position_hash:hash(position.data),position_source:position.source_event,
    position_source_hash:hash(db.getWorldEvent(guild,position.source_event)),evidence_kind:position.data.evidence_kind};
}

/** Recheck saved proposal evidence against current state immediately before a GM roll. */
export function professionalEntryRollState(db,guild,decision,entry){
  const proof=decision?.data?.native?.professional_entry;
  if(!proof)return {advantage:false,use_ref:null,proof:null};
  const n=decision.data.native,encounter=currentEncounter(db,guild,decision.data.origin),position=db.getCityRecord(guild,'native_prepared_position',proof.position),
    source=activeSource(db,guild,position),key=encounter&&useKey(encounter.id,proof.actor),used=key&&db.getCityRecord(guild,'native_feature_use_receipt',key);
  if(!encounter||encounter.id!==proof.encounter||proof.feature!==PROFESSIONAL_ENTRY
    ||n.professional_entry!==proof||!source||position.data.position_ref!==decision.data.proposal.feature_intent.position_ref
    ||position.data.encounter!==encounter.id||!position.data.target_refs.includes(proof.target)
    ||proof.position_hash!==hash(position.data)||proof.position_source_hash!==hash(source)
    ||proof.position_source!==source.event_key||proof.actor!==entry?.actor?.key||proof.target!==entry?.target_refs?.[0]
    ||proof.action!==decision.data.proposal.feature_intent?.action)
    return {advantage:false,use_ref:null,proof:null};
  if(used){
    const priorDecision=used.data?.decision&&db.getCityRecord(guild,'gm_arbitration_decision',used.data.decision);
    inspectProfessionalEntryUse(db,guild,key,priorDecision,used.data?.roll_ref,used.data?.roll_id);
    if(used.data.encounter!==encounter.id||used.data.actor!==proof.actor||used.data.feature!==PROFESSIONAL_ENTRY)
      throw fail('professional_entry_use_conflict');
    return {advantage:false,use_ref:null,proof};
  }
  return {advantage:true,use_ref:key,proof};
}

/** Called within the same native transaction as the actual d20; replay never reaches this writer. */
export function commitProfessionalEntryUse(db,guild,decision,state,rollRef,rollId){
  if(!state?.advantage||!state.use_ref||!state.proof||typeof rollRef!=='string'||typeof rollId!=='string')return null;
  if(db.getCityRecord(guild,'native_feature_use_receipt',state.use_ref))throw fail('professional_entry_already_consumed');
  const p=state.proof,position=db.getCityRecord(guild,'native_prepared_position',p.position),source=position&&activeSource(db,guild,position);
  if(!source||p.position_hash!==hash(position.data)||p.position_source_hash!==hash(source))throw fail('professional_entry_evidence_changed_before_roll');
  const data={version:1,feature:PROFESSIONAL_ENTRY,decision:decision.record_key,actor:p.actor,target:p.target,action:p.action,
    encounter:p.encounter,position:p.position,position_hash:p.position_hash,position_source:p.position_source,
    position_source_hash:p.position_source_hash,evidence_kind:p.evidence_kind,roll_ref:rollRef,roll_id:rollId};
  const event=indexWorldEvent(db,guild,{key:`${state.use_ref}:source`,kind:'native_feature_use',source_id:issuer,
    title:'Professional Entry used on first qualifying roll',session_id:decision.data.origin.session,scene:decision.data.origin.scene,
    location_key:decision.data.origin.location,visibility:'gm',details:{input_source:decision.source_event,payload_hash:hash(data)}},issuer);
  if(event.status!=='active'||event.details.payload_hash!==hash(data))throw fail('professional_entry_use_source');
  return db.saveCityRecord(guild,{kind:'native_feature_use_receipt',key:state.use_ref,status:'committed',source_event:event.event_key,
    visibility:'gm',data});
}

export function inspectProfessionalEntryUse(db,guild,ref,decision,rollRef,rollId){
  const row=db.getCityRecord(guild,'native_feature_use_receipt',ref),event=row&&db.getWorldEvent(guild,row.source_event),d=row?.data,
    p=decision?.data?.native?.professional_entry;
  if(!row||row.status!=='committed'||row.visibility!=='gm'||row.record_key!==ref||!p||!d||d.feature!==PROFESSIONAL_ENTRY
    ||d.decision!==decision.record_key||d.actor!==p.actor||d.target!==p.target||d.action!==p.action||d.encounter!==p.encounter
    ||d.position!==p.position||d.position_hash!==p.position_hash||d.position_source!==p.position_source
    ||d.position_source_hash!==p.position_source_hash
    ||d.evidence_kind!==p.evidence_kind||d.roll_ref!==rollRef||d.roll_id!==rollId
    ||ref!==useKey(d.encounter,d.actor)||event?.status!=='active'||event.kind!=='native_feature_use'||event.source_id!==issuer
    ||event.details?.payload_hash!==hash(d)||event.details?.input_source!==decision.source_event)
    throw fail('professional_entry_use_ancestry');
  const position=db.getCityRecord(guild,'native_prepared_position',d.position),source=position&&db.getWorldEvent(guild,position.source_event),
    expectedKind=d.evidence_kind==='gm_scene_fiction'?'native_prepared_position_established':'native_encounter_preparation',
    expectedIssuer=d.evidence_kind==='gm_scene_fiction'?issuer:'native:encounter-preparation';
  if(!position||!['active','retracted'].includes(position.status)||position.record_key!==d.position||hash(position.data)!==d.position_hash
    ||position.data.evidence_kind!==d.evidence_kind||source?.event_key!==d.position_source||!['active','retracted'].includes(source.status)
    ||hash({...source,status:'active'})!==d.position_source_hash||source.kind!==expectedKind||source.source_id!==expectedIssuer
    ||source.details?.payload_hash!==hash(position.data)||source.session_id!==position.data.session||source.scene!==position.data.scene)
    throw fail('professional_entry_use_position_ancestry');
  return row;
}
