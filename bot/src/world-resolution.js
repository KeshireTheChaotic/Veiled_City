/** Derived coarse-to-fine Director state. Snapshots confer no execution, knowledge or disclosure authority. */
import {jsonHash as hash} from './kernel/json-hash.js';
import {worldIdentityOrigin,privateWorldIdentityForGm} from './world-authorship.js';
import {worldSessionScene,worldKnowledgeSources} from './frameworks/world/public.js';
const listNarrativeRecords=(...args)=>worldKnowledgeSources.listNarrativeRecords(...args);
function currentScene(...args){return worldSessionScene.currentScene(...args);}function scenePresence(...args){return worldSessionScene.scenePresence(...args);}
import {worldActorControl} from './frameworks/world/public.js';
import {indexWorldEvent} from './frameworks/world/public.js';
import {worldNarrativeSources} from './frameworks/world/public.js';
function narrativeImportance(...args){return worldNarrativeSources.narrativeImportance(...args);}function nativeSalienceAvailable(...args){return worldNarrativeSources.nativeSalienceAvailable(...args);}

const issuer='native:world-resolution';
const MAX_SCOPES=4,MAX_ACTORS=8;
const fail=reason=>Object.assign(new Error(`World resolution held: ${reason}`),{code:'WORLD_RESOLUTION',diagnostic:{reason}});
const capability=new WeakMap();
const boundary=row=>({visibility:row.visibility,subject:row.subject_key||null});
const resourceBands=state=>Object.fromEntries(Object.entries(state.resources||{})
  .filter(([,n])=>Number.isInteger(n)&&n>=0&&n<=100)
  .map(([key,n])=>[key,n===0?'empty':n<4?'low':n<=10?'available':'high']));
function identityProof(db,guild,row){
  if(!row)return null;
  if(row.visibility==='gm')return privateWorldIdentityForGm(db,guild,row);
  const scope=row.visibility==='character'?{mode:'private',actorCharacterId:row.subject_key,
    actorUserId:db.getCharacter(row.subject_key)?.owner_user_id}:{mode:'party'};
  return worldIdentityOrigin(db,guild,row,scope);
}
function derivedScopes(db,guild){
  const rows=listNarrativeRecords(db,guild,'autonomous_entity');
  if(rows.length>=worldKnowledgeSources.narrativeRecordLimit())throw fail('identity_scan_requires_reconciliation');
  const salient=nativeSalienceAvailable(db,guild)?new Set(listNarrativeRecords(db,guild,'narrative_salience').map(r=>r.data.entity)):new Set();
  const session=db.getActiveSession(guild),scene=session?currentScene(db,guild):null,
    encounter=session&&db.getCurrentEncounter(session.id),
    combatants=encounter?.status==='active'?db.listCombatants(encounter.id):[],
    encounterBinding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),groups=new Map();
  for(const row of rows){
    const origin=identityProof(db,guild,row),d=row.data;
    if(!origin||!['npc','location','faction','organization','district'].includes(d.kind))continue;
    const state=db.getSimulationEntity(guild,d.kind,d.key)?.state||{};
    const presence=d.kind==='npc'&&scene?scenePresence(db,guild,'npc',d.key):null;
    const presenceSource=presence&&db.getWorldEvent(guild,presence.source_event);
    const present=presence?.status==='active'&&presence.data.state==='actually_present'&&presence.data.scene===scene?.key
      &&presence.data.session_id===scene?.session_id&&presenceSource?.status==='active';
    // Encounter membership is read from actual combatants, never inferred from a dramatic label.
    const mapping=d.kind==='npc'&&encounterBinding?.data.combatants?.find(c=>c.actor===d.key),
      combatant=mapping&&combatants.find(c=>c.id===mapping.id&&c.status!=='removed');
    const scope=row.visibility==='character'?{mode:'private',actorCharacterId:row.subject_key,
      actorUserId:db.getCharacter(row.subject_key)?.owner_user_id}:{mode:'party'};
    // Existing source/audience-qualified interest changes detail only, never actor resources or combat membership.
    const importance=salient.has(row.record_key)?narrativeImportance(db,guild,row.record_key,scope):null;
    const weighted=!!importance&&(importance.pins.length>0||importance.score>=4);
    const tier=combatant?'L3':present?'L2':state.activity_tier==='active'||weighted?'L1':'L0';
    const area=d.kind==='district'?row.record_key:d.anchor_location||state.location_key||'unplaced';
    const audience=boundary(row),scopeKey=`world-scope:${hash([area,audience])}`;
    if(!groups.has(scopeKey))groups.set(scopeKey,{key:scopeKey,area,audience,actors:[],tier_counts:{L0:0,L1:0,L2:0,L3:0}});
    const group=groups.get(scopeKey);group.tier_counts[tier]++;
    group.actors.push({ref:row.record_key,kind:d.kind,key:d.key,tier,source:row.source_event,identity_hash:origin.identity_hash||hash(row),
      source_hash:hash(db.getWorldEvent(guild,row.source_event)),
      // A proxy or a background identity is not an autonomous executor. Actual operations recheck native capability separately.
      owner_control_type:worldActorControl(db,guild,d.kind,d.key),
      operation_authority:d.kind==='npc'&&worldActorControl(db,guild,d.kind,d.key)==='ai_world'?'requires_native_actor_validation':'identity_only',
      resource_bands:resourceBands(state),state_revision:hash(state),
      detail_basis:combatant?'native_encounter':present?'native_presence':weighted?'source_qualified_interest':state.activity_tier==='active'?'native_activity':'aggregate',
      location:present?presence.location_key:state.location_key||d.anchor_location||null,
      presence:present?{ref:presence.record_key,hash:hash(presence),source:presence.source_event,source_hash:hash(presenceSource)}:null,
      encounter:combatant?{ref:encounter.id,combatant:combatant.id}:null});
  }
  return [...groups.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(group=>{
    group.actors.sort((a,b)=>b.tier.localeCompare(a.tier)||a.ref.localeCompare(b.ref));
    return {...group,actor_count:group.actors.length,actors:group.actors.slice(0,MAX_ACTORS),
      omitted_actors:Math.max(0,group.actors.length-MAX_ACTORS)};
  });
}
/** Shared provider context only. No raw NPC memories or source prose; no extra request and no writes. */
export function worldResolutionContext(db,guild,{scope=null}={}){
  const all=derivedScopes(db,guild).filter(row=>!scope||['public','party'].includes(row.audience.visibility)
    ||scope.mode==='private'&&row.audience.visibility==='character'&&row.audience.subject===scope.actorCharacterId
      &&db.getCharacter(scope.actorCharacterId)?.owner_user_id===scope.actorUserId);
  const tick=db.getSimulationClock(guild).tick,start=all.length?tick%all.length:0,
    ordered=all.slice(start).concat(all.slice(0,start));
  return {version:1,clock:db.getSimulationClock(guild),scopes:ordered.slice(0,MAX_SCOPES),eligible_scopes:all.length,
    omitted_scopes:Math.max(0,all.length-MAX_SCOPES),budgets:{scopes:MAX_SCOPES,actors_per_scope:MAX_ACTORS},
    authority:'Derived native identity/tier context only; no new fact, capability, knowledge, resource, encounter or publication grant.'};
}
/** In-process cycle capability. Neither a model nor a deserialized prepared object can mint a new pulse. */
export function bindWorldResolutionCycle(db,guild,prepared){
  if(!['round','scene','downtime'].includes(prepared.layer)||typeof prepared.cycleId!=='string'||!prepared.cycleId
    ||prepared.guildId!==guild||!prepared.cycleKey)throw fail('native_fictional_cycle_required');
  capability.set(prepared,{db,guild,cycle:prepared.cycleId,key:prepared.cycleKey,layer:prepared.layer,
    clock:structuredClone(db.getSimulationClock(guild)),minutes:prepared.minutes||0});
  return prepared;
}
/** Run inside the existing native cycle transaction AFTER its operation receipts commit. Not a world-effect engine. */
export function commitWorldResolutionPulse(db,guild,prepared){
  const bound=capability.get(prepared),cycle=db.getSimulationRecord(guild,prepared.cycleId);
  const clock=db.getSimulationClock(guild);
  if(!bound||bound.db!==db||bound.guild!==guild||bound.cycle!==prepared.cycleId||bound.key!==prepared.cycleKey
    ||bound.layer!==prepared.layer||cycle?.kind!=='cycle'||cycle.status!=='completed')throw fail('committed_native_cycle_required');
  const key=`world-pulse:${hash([guild,prepared.cycleId])}`,prior=db.getCityRecord(guild,'world_pulse',key);
  if(prior)return readWorldResolutionPulse(db,guild,key);
  if(clock.tick!==bound.clock.tick+1||clock.minute!==bound.clock.minute+bound.minutes)throw fail('fictional_cycle_clock_changed');
  const packet=worldResolutionContext(db,guild),changed=[];
  for(const scope of packet.scopes){
    const old=db.getCityRecord(guild,'world_scope_snapshot',scope.key),fingerprint=hash(scope);
    if(old?.data.fingerprint===fingerprint)continue;
    changed.push({key:scope.key,fingerprint,previous:old?.source_event||null,snapshot:scope});
  }
  // Idle time is not an event per actor/tick. Keep no-op deliberation transient.
  if(!changed.length)return {version:1,status:'unchanged',changes:[],writes:0};
  const data={version:1,issuer,cycle:prepared.cycleId,cycle_hash:hash(cycle),clock:packet.clock,
    changes:changed,omitted_scopes:packet.omitted_scopes,execution_authority:false,publication_authority:false};
  const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_world_pulse',title:'Derived fictional-world aggregate changeset',
    source_id:issuer,visibility:'gm',details:{payload_hash:hash(data),cycle:prepared.cycleId}},issuer);
  for(const change of changed)db.saveCityRecord(guild,{kind:'world_scope_snapshot',key:change.key,status:'derived',visibility:'gm',
    source_event:source.event_key,data:{version:1,fingerprint:change.fingerprint,snapshot:change.snapshot}});
  return db.saveCityRecord(guild,{kind:'world_pulse',key,status:'committed',visibility:'gm',source_event:source.event_key,data});
}
/** Historical aggregate receipt is NOT permission to execute or disclose. Revoked source suppresses projection, not past mechanics. */
export function readWorldResolutionPulse(db,guild,key){
  const row=db.getCityRecord(guild,'world_pulse',key),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.status!=='committed'||row.visibility!=='gm'||d?.version!==1||d.issuer!==issuer
    ||d.execution_authority!==false||d.publication_authority!==false||row.source_event!==`${key}:source`
    ||source?.status!=='active'||source.kind!=='native_world_pulse'||source.source_id!==issuer||source.details.payload_hash!==hash(d)
    ||hash(db.getSimulationRecord(guild,d.cycle))!==d.cycle_hash)throw fail('stale_pulse_receipt');
  for(const change of d.changes){
    if(hash(change.snapshot)!==change.fingerprint)throw fail('snapshot_fingerprint');
    for(const actor of change.snapshot.actors){
      const identity=db.getCityRecord(guild,'autonomous_entity',actor.ref),event=db.getWorldEvent(guild,actor.source);
      if(!identityProof(db,guild,identity)||event?.status!=='active'||hash(event)!==actor.source_hash)throw fail('revoked_identity_source');
    }
  }
  return row;
}

/** A derived-cache hold never rolls back independent native operations. Only this adapter's exact hold is recoverable here. */
export function finishWorldResolutionCycle(db,guild,prepared,result){
  try{return {...result,world_pulse:commitWorldResolutionPulse(db,guild,prepared)};}
  catch(error){if(error.code!=='WORLD_RESOLUTION')throw error;
    return {...result,world_pulse:{version:1,status:'held_source',reason:error.diagnostic.reason,execution_authority:false,publication_authority:false}};}
}
