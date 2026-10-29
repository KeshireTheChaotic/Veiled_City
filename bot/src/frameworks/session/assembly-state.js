/** Read-only assembly identity, native orientation and legacy-state inspection. */
import {createHash} from 'node:crypto';
import {currentScene,scenePresence} from './scene-source.js';
import {conversationPrincipal} from './conversation-principal.js';
import {sessionAssemblyDeliveryParts} from './contracts/assembly-delivery-parts.js';
import {sessionAssemblyContextSource,sessionAssemblyStateSource,sessionOpeningSource} from './contracts/opening-sources.js';
const {assemblyInputFingerprint}=sessionAssemblyContextSource,{assertSessionOpeningAttempt}=sessionOpeningSource;
function assemblyPartsFor(...args){return sessionAssemblyDeliveryParts.assemblyPartsFor(...args);}
export const assemblyHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const display=value=>JSON.stringify(value).replaceAll('@','@\u200b');
export function assemblyPlanHash(plan){
  const {delivery_state,launch_recorded,...candidate}=plan||{};return assemblyHash(candidate);
}
export function assemblySlots(db,guild,session){
  const plan=db.getAssemblyPlan(session.id)||{},roster=db.roster(session.id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence));
  // One actual public viewpoint, not an inference that check-in places the roster together.
  const viewpoint=db.getCityCalendar(guild).flags.playable_narration===true?roster.find(r=>{
    const p=scenePresence(db,guild,'character',r.character_id);
    return p?.status==='active'&&p.data.state==='actually_present'&&['party','public'].includes(p.visibility)
      &&db.getWorldEvent(guild,p.source_event)?.status==='active';
  }):null;
  return [...roster.map(r=>({name:r.name,scope:{mode:'private',actorUserId:r.discord_user_id,actorCharacterId:r.character_id},
    entry:plan.character_entries?.find(e=>e.discord_user_id===r.discord_user_id)})),{name:'party',scope:{mode:'party',actorUserId:viewpoint?.discord_user_id||null,actorCharacterId:viewpoint?.character_id||null}}]
    .map(slot=>({...slot,key:`assembly:${assemblyHash([session.id,assemblyPlanHash(plan),slot.scope])}`}));
}
export function legacyAssemblyState(plan,scope){
  const expected=assemblyPartsFor(plan).filter(p=>scope.mode==='party'?p.surface==='public':p.userId===scope.actorUserId);
  const states=expected.map(p=>({key:p.key,...plan.delivery_state?.[p.key]}));
  const uncertain=states.filter(p=>['uncertain','delivering'].includes(p.status));
  const delivered=states.filter(p=>p.status==='delivered');
  return {uncertain,delivered,complete:states.length>0&&delivered.length===states.length,
    partial:delivered.length>0&&delivered.length!==states.length};
}
export function assemblyDeliverySummary(db,guild,session){
  const plan=db.getAssemblyPlan(session.id)||{},slots=assemblySlots(db,guild,session);
  return slots.map(slot=>{
    const job=db.getCityRecord(guild,'assembly_delivery',slot.key),rows=job?.data.turn_id?db.listTurnPublications(guild,job.data.turn_id):[];
    const legacy=legacyAssemblyState(plan,slot.scope);
    const status=rows.length?rows.every(r=>r.status==='delivered')?'delivered':rows.some(r=>['uncertain','delivering'].includes(r.status))?'uncertain'
      :rows.some(r=>r.status==='failed')?'failed':'pending':legacy.uncertain.length||legacy.partial?'uncertain':legacy.complete?'legacy_delivered':job?.status==='blocked'?'blocked':'pending';
    const evidence=job?.data.evidence||{},narrative_status=status==='delivered'
      ?evidence.narrative_verified&&evidence.narrative_format==='audience_first_v9'?'VERIFIED_SCENE_DELIVERED':'FALLBACK_DELIVERED':status.toUpperCase();
    return {...slot,status,narrative_status,evidence,previously_delivered:job?.data.retained_acknowledgement===true,rows,job,legacy};
  });
}
export function assemblyOrientation(db,guild,sessionId,scope){
  const session=db.getActiveSession(guild),scene=currentScene(db,guild);
  const resume=session?.id===sessionId&&session.assembly_phase==='party';
  if(!session||session.id!==sessionId||session.assembly_phase!=='assembly'&&!resume)throw Object.assign(new Error('Current assembly session required.'),{code:'ASSEMBLY_SOURCE'});
  if(resume){
    const job=assertSessionOpeningAttempt(db,guild,sessionId);
    if(job.data.origin.kind!=='resume')throw Object.assign(new Error('Native returning-party opening required.'),{code:'ASSEMBLY_SOURCE'});
  }
  const plan=db.getAssemblyPlan(sessionId)||{},roster=db.roster(sessionId).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence));
  if(plan.assembly_contract?.version===2&&plan.assembly_contract.input_fingerprint!==assemblyInputFingerprint(db,guild,session))
    throw Object.assign(new Error('Assembly input revision is stale; reconcile the saved plan before publication.'),{code:'ASSEMBLY_SOURCE',expected:true});
  let principal=null,character=null,quote=null;
  if(scope.mode==='private'){
    character=db.getCharacter(scope.actorCharacterId);
    if(character?.guild_id!==guild||character.owner_user_id!==scope.actorUserId||!['active','reserve','guest'].includes(character.status)
      ||db.activeAssignment(sessionId,scope.actorUserId)?.character_id!==character.id)
      throw Object.assign(new Error('Current attended owner required for private assembly.'),{code:'ASSEMBLY_SOURCE'});
    principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
    if(principal.kind!=='owner'||!roster.some(r=>r.character_id===character?.id&&r.discord_user_id===scope.actorUserId))
      throw Object.assign(new Error('Current attended owner required for private assembly.'),{code:'ASSEMBLY_SOURCE'});
    for(const row of db.listCityRecords(guild,{kind:'typed_intent',includeGM:true,limit:100})){
      const source=db.getWorldEvent(guild,row.source_event),d=source?.details;
      if(row.data.actor!==character.id||source?.status!=='active'||source.kind!=='authored_turn'||source.session_id!==sessionId
        ||source.scene!==scene.key||d.author!==scope.actorUserId||d.principal_revision!==principal.revision
        ||!(['party','public'].includes(source.visibility)||source.visibility==='character'&&source.subject_key===character.id
          ||source.visibility==='player'&&source.subject_key===scope.actorUserId)
        ||!db.ownerAuthoredSource(guild,source.event_key,scope.actorUserId)||typeof d.raw_text!=='string'||d.raw_text.length>1200)continue;
      if(createHash('sha256').update(d.raw_text).digest('hex')!==d.raw_hash)continue;
      quote={ref:source.event_key,hash:assemblyHash(source),text:d.raw_text};break;
    }
  }else if(scope.mode!=='party')throw new Error('Assembly audience required.');
  const state={session:session.id,scene:scene.key,plan:assemblyPlanHash(plan),scope,principal:principal?.revision||null,
    roster:roster.map(r=>({character:r.character_id,user:r.discord_user_id,name:r.name,owner:db.getCharacter(r.character_id)?.owner_user_id})),
    character:character?{id:character.id,location:character.data.location||null,status:character.status}:null,quote,
    ...(plan.assembly_contract?.version===2?{hook_inputs:assemblyInputFingerprint(db,guild,session)}:{})};
  let text=scope.mode==='private'
    ?`**Veilkeeper — private ${resume?'session resume':'assembly'} orientation**\nChecked-in character: ${display(character.name)}.\nSaved position: ${display(character.data.location||'not recorded')}; this is not a new arrival.`
    :`**Session ${session.session_number} — ${resume?'session resume opening':'assembly orientation'}**\nChecked in: ${roster.map(r=>display(r.name)).join(', ')||'none'}. Check-in does not establish shared fictional presence.`;
  if(quote)text+=`\nYour earlier declaration, not an adjudicated outcome: ${display(quote.text)}`;
  text+=scope.mode==='private'?'\nWhat would you like to notice, ask, or do? Your decisions and disclosures remain yours.'
    :'\nYou may compare the observations you choose to share. Cooperation and party formation remain your choices.';
  return {text,state,revision:assemblyHash(state)};
}
// Provide this module's original assembly state functions to the fixed Session slot; no other authority is granted.
sessionAssemblyStateSource.bind({assemblyDeliverySummary,assemblyPlanHash,assemblyHash,assemblySlots,legacyAssemblyState,assemblyOrientation});
