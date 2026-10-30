import {intentNativeEncounter} from './frameworks/intent/public.js';
const {nativeEnvironmentBinding}=intentNativeEncounter;
/** Immutable scoped scene inputs. Accepted PC sources and native GM NPC proposals never impersonate each other. */
import {intentNarrativeContext} from './frameworks/intent/public.js';
const {buildNarrativeContext,narrativeSourceVisible}=intentNarrativeContext;
import {jsonHash as hash} from './kernel/json-hash.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {intentWorldConstraints} from './frameworks/intent/public.js';
const {activeCityProxy,assertNpcAvailability}=intentWorldConstraints;
import {intentSessionScene} from './frameworks/intent/public.js';
const {scenePresence}=intentSessionScene;
import {intentNpcEvidence} from './frameworks/intent/public.js';
const {actorReferenceVisible}=intentNpcEvidence;
import {matchesArbitrationSchema,npcSceneIntentSchema,arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {intentWorldPrimitives} from './frameworks/intent/public.js';
const {indexWorldEvent}=intentWorldPrimitives;
import {featureWindowChoices,inspectFeatureWindow} from './native-feature-windows.js';
import {executableNativeFeatures,compileNativeActors} from './native-feature-catalog.js';

import {isGroupFeature,groupFeatureStakes,groupReactionRules} from './native-group-features.js';
import {nativeActorControl} from './native-actor-control.js';
import {preRollFearCandidates} from './pre-roll-fear.js';

import {intentNativeEnvironment} from './frameworks/intent/public.js';
function nativeEnvironmentInstanceForScope(...args){return intentNativeEnvironment.nativeEnvironmentInstanceForScope(...args);}
import {nativeAdversaryFeatureContext} from './native-adversary-context.js';
import {preparedPositionCandidates} from './native-professional-entry.js';
import {intentArbitrationOrigin} from './frameworks/intent/public.js';
const bindings=new WeakMap();
const deepFreeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(deepFreeze);Object.freeze(v);}return v;};
import {createArbitrationOrigins} from './frameworks/intent/public.js';
export const {createArbitrationOrigin,inspectArbitrationOrigin}=createArbitrationOrigins({nativeActorControl});
/** Read-only pre-prompt packet; excludes NPC motives, private sheets and unentitled evidence. */
export function arbitrationPromptBoard(db,guild,origin){
  const o=inspectArbitrationOrigin(db,guild,origin);
  const encounter=db.getCurrentEncounter(o.binding.session),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
    combatants=encounter?db.listCombatants(encounter.id):[],library=new intentNativeEncounter.EncounterLibrary('../content'),features=executableNativeFeatures('adversary');
  let environment=null,localEnvironment=null;
  try{localEnvironment=nativeEnvironmentInstanceForScope(db,guild,o.scope,o.binding.location);}
  catch(error){if(!['GM_ARBITRATION','SCENE_FICTION'].includes(error.code))throw error;}
  if(encounter?.status==='active'){
    try{environment=nativeEnvironmentBinding(db,guild,{encounter:encounter.id,scene:o.binding.scene,location:o.binding.location},{library});}
    catch(error){if(!['GM_ARBITRATION','NATIVE_ENCOUNTER_ACTIVATION'].includes(error.code))throw error;}
  }
  return {version:1,source:o.binding.source,scene:o.binding.scene,location:o.binding.location,audience:o.scope.mode,
    environment_context:environment,
    local_environment_context:localEnvironment,
    environment_candidates:compileNativeActors().filter(a=>a.actor_kind==='environment'
      &&executableNativeFeatures('environment').some(f=>f.template_hash===a.template_hash))
      .map(a=>({environment:a.actor_key,location:o.binding.location,template_hash:a.template_hash,
        authority:'Supported capabilities only; establishing a profile does not execute a feature or disclose private evidence.'})),
    equipped_attack_sources:db.scopedRollAttackSources(guild,o.scope.actorCharacterId,o.binding.session,o.binding.scene,null)
      .filter(e=>(db.getCharacter(o.scope.actorCharacterId)?.data.inventory||[]).some(i=>typeof i==='object'&&i.equipped===true&&i.name===e.details.roll_attack?.weapon))
      .slice(0,20).map(e=>({source_ref:e.event_key,weapon:e.details.roll_attack.weapon,trait:e.details.roll_attack.trait,
        target_id:e.details.roll_attack.target_id,authority:'Existing exact approval only; native source/item/target/scene validation still required.'})),
    collaboration_requests:db.listCityRecords(guild,{kind:'roll_request',includeGM:true,limit:100})
      .filter(q=>q.status==='pending'&&q.data.scene===o.binding.scene&&q.data.session_id===o.binding.session
        &&q.data.input?.accepted_intent&&narrativeSourceVisible(db,guild,q.source_event,o.scope))
      .map(q=>({request:q.record_key,actor:q.subject_key,accepted_intent:q.data.input.accepted_intent,kind:q.data.kind})),
    pre_roll_fear:preRollFearCandidates(db,guild,origin),
    prepared_positions:preparedPositionCandidates(db,guild,o.binding),
    feature_windows:featureWindowChoices(db,guild,o.scope),
    npc_candidates:o.eligible.map(n=>{
      const c=combatants.find(c=>c.status==='active'&&binding?.data.combatants.some(b=>b.actor===n.key&&b.id===c.id)),template=c&&library.findAdversary(c.base_name);
      let provenance=null;
      if(template){try{provenance=nativeAdversaryFeatureContext(db,guild,origin,n.key,{library});}
        catch(error){if(error.code!=='GM_ARBITRATION')throw error;}}
      return {actor_key:n.key,owner_control_type:'ai_world',intent_refs:n.intents,objective_refs:n.objectives,known_source_refs:n.source_refs,
        adversary_context:provenance,
        action_features:features.filter(f=>provenance&&provenance.features.some(p=>p.key===f.feature_key)
          &&(f.native_handler==='coordinated_volley'||isGroupFeature(f.feature_key))&&f.template_hash===hash(template)).map(f=>isGroupFeature(f.feature_key)?{feature_ref:f.feature_key,
          disposition:'native_feature_resolution',operation:'feature',proposal_shape:'v1 default: omit proposal_version and trigger_ref',target_policy:f.target_policy,rule_basis_refs:['srd:reaction-rolls'],
          ...groupReactionRules(f.feature_key),costs:f.costs,stakes:groupFeatureStakes(f.feature_key)}:({feature_ref:f.feature_key,
          disposition:'gm_attack_roll',operation:'attack',target_policy:f.target_policy,rule_basis_refs:['srd:adversary-attacks'],difficulty:null,
          costs:f.costs,stakes:'Declare the attempted attack before dice. Each owner controls their own defenses.'}))};
    }),
    shared_player_inputs:sharedSceneInputs(db,guild,o).map(row=>({intent_ref:row.record_key,actor:row.data.actor,source_span:row.data.source_span,operation:row.data.operation})),
    player_input_refs:'player:0..15 select exact current player_intents index, then native accepted source; not an outcome or dice authorization'};
}
export function bindArbitrationTurn(result,origin){bindings.set(result,origin);return result;}
export const arbitrationTurnOrigin=result=>bindings.get(result)||null;
function sharedSceneInputs(db,guild,o){
  if(o.scope.mode==='private')return [];
  return db.listCityRecords(guild,{kind:'typed_intent',includeGM:true,limit:100}).filter(row=>{
    const p=scenePresence(db,guild,'character',row.data.actor);
    return row.status==='accepted_for_adjudication'&&['party','public'].includes(row.visibility)&&row.data.scene===o.binding.scene
      &&row.data.session_id===o.binding.session&&p?.data.state==='actually_present'&&p.location_key===o.binding.location
      &&narrativeSourceVisible(db,guild,p.source_event,o.scope);
  }).slice(0,12);
}
export function currentScenePlayerInputs(db,guild,origin,rows){
  const o=inspectArbitrationOrigin(db,guild,origin);
  return [...new Map([...rows,...sharedSceneInputs(db,guild,o)].map(row=>[row.record_key,row])).values()].slice(0,16);
}
export function buildSceneIntentBoard(db,guild,origin,playerRows=[],npcProposals=[],nativeChildWindow=null){
  const o=inspectArbitrationOrigin(db,guild,origin),entries=[];
  const child=nativeChildWindow&&inspectFeatureWindow(db,guild,nativeChildWindow);
  const key=`intent-board:${hash(child?[o.binding.source,o.scope,child.record_key]:[o.binding.source,o.scope])}`,
    prior=db.getCityRecord(guild,'scene_intent_board',key),legacy=prior?.data.version===1;
  if(child&&(child.data.origin_source!==o.binding.source||child.data.scene!==o.binding.scene||playerRows.length||npcProposals.length!==1
    ||npcProposals[0].actor_key!==child.data.actor||npcProposals[0].operation!=='reaction'
    ||npcProposals[0].target_refs.length!==1||npcProposals[0].target_refs[0]!==child.data.target))throw fail('native_child_board_scope');
  if(playerRows.length>16||npcProposals.length>4)throw fail('board_budget');
  for(const row of playerRows){
    const proof=row.status==='resolved'?historicalActionSource(db,guild,row.record_key,{resolved:true}):consentAction(db,guild,row.record_key);
    const triggering=row.data.world_source_event===o.binding.source&&row.data.actor===o.scope.actorCharacterId&&row.data.owner_user_id===o.scope.actorUserId;
    if(!narrativeSourceVisible(db,guild,row.source_event,o.scope)||!triggering&&!sharedSceneInputs(db,guild,o).some(r=>r.record_key===row.record_key))throw fail('player_source_audience');
    if(!Number.isSafeInteger(row.data.sequence_index))throw fail('player_occurrence_index');
    entries.push({intent_ref:row.record_key,proposal_ref:triggering?`player:${row.data.sequence_index}`:row.record_key,actor:{type:'character',key:row.data.actor,controller:'owner',...(!legacy?{owner_control_type:'player'}:{})},
      source_ref:row.source_event,source_hash:row.data.source_hash,scene_ref:row.data.scene,session:row.data.session_id,
      operation:row.data.operation,target_refs:row.data.target_key?[row.data.target_key]:[],dependencies:row.data.dependencies||[],
      snapshot:hash([proof.source,proof.principal.user,proof.principal.revision,row.data.start,row.data.end,row.data.accepted_scope]),visibility:row.visibility,subject:row.subject_key||null});
  }
  const seen=new Set();
  for(const p of npcProposals){
    if(!matchesArbitrationSchema(npcSceneIntentSchema,p))throw fail('npc_proposal_shape');
    const actor=o.eligible.find(n=>n.key===p.actor_key),entity=db.getSimulationEntity(guild,'npc',p.actor_key);
    if(!actor||nativeActorControl(db,guild,'npc',p.actor_key).owner_control_type!=='ai_world'||activeCityProxy(db,guild,p.actor_key)||entity?.state.location_key!==o.binding.location)throw fail('npc_current_local_control');
    assertNpcAvailability(db,guild,p.actor_key,{type:'contact',location_key:o.binding.location});
    if(p.objective_ref&&!actor.objectives.includes(p.objective_ref)||p.source_refs.some(ref=>!actorReferenceVisible(db,guild,p.actor_key,ref,o.scope)))throw fail('npc_objective_or_knowledge');
    if(new Set(p.target_refs).size!==p.target_refs.length||p.target_refs.some(key=>!db.getCharacter(key)&&!db.getNpcProfile(guild,key)
      &&!db.getSimulationEntity(guild,'location',key)))throw fail('npc_native_target');
    const ref=child?`npc-intent:${hash([o.binding.source,p.actor_key,p.operation,child.record_key])}`:actor.intents[p.operation];if(seen.has(ref))throw fail('duplicate_npc_intent');seen.add(ref);
    const entry={intent_ref:ref,proposal_ref:ref,actor:{type:'npc',key:p.actor_key,controller:'ai_gm',...(!legacy?{owner_control_type:'ai_world'}:{})},
      scene_ref:o.binding.scene,session:o.binding.session,operation:p.operation,
      target_refs:[...p.target_refs],dependencies:p.dependencies.map(ref=>entries.find(e=>e.proposal_ref===ref)?.intent_ref||ref),snapshot:actor.snapshot,visibility:o.scope.mode==='private'?'character':'party',
      subject:o.scope.mode==='private'?o.scope.actorCharacterId:null,objective_ref:p.objective_ref,knowledge_refs:[...p.source_refs]};
    const details={input_source:o.binding.source,proposal:p,entry_hash:hash(entry),authority:'GM-owned proposal, never a player declaration or established NPC success.'};
    const source=indexWorldEvent(db,guild,{key:`${ref}:source`,kind:'native_npc_scene_intent',source_id:'native:unified-gm',title:'Native GM-owned NPC intent proposal',
      session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,visibility:'gm',details},'native:unified-gm');
    if(source.status!=='active'||hash(source.details)!==hash(details))throw fail('immutable_npc_proposal_changed');
    entries.push({...entry,source_ref:source.event_key,source_hash:hash(source.details)});
  }
  for(const e of entries)if(e.dependencies.some(ref=>!entries.some(other=>other.intent_ref===ref)))throw fail('unverified_dependency');
  const data={version:legacy?1:2,origin:o.binding,entries,...(child?{parent_window:child.record_key}:{} )};
  if(prior){if(hash(prior.data)!==hash(data))throw fail('immutable_board_changed');return prior;}
  const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_scene_intent_board',source_id:'native:unified-gm',title:'Native sourced scene intent board',
    session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location||'',visibility:'gm',details:{input_source:o.binding.source,payload_hash:hash(data)}},'native:unified-gm');
  return db.saveCityRecord(guild,{kind:'scene_intent_board',key,status:'active',source_event:source.event_key,visibility:'gm',data:deepFreeze(data)});
}
// Provide this module's original inspectArbitrationOrigin to the fixed port; no other authority is granted.
intentArbitrationOrigin.bind({inspectArbitrationOrigin});
