/** Native environmental provenance/entitlement only; never world fact creation or execution permission. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {environmentEncounterRejection} from './environment-eligibility.js';
export function createEnvironmentBindingRules({capabilities}){
const {EncounterLibrary,currentScene,executableNativeFeatures,nativeActorTaxonomy,nativeFeatureRuleContextsForTemplate,inspectNativeEncounterActivation}=capabilities||{};
if([EncounterLibrary,currentScene,executableNativeFeatures,nativeActorTaxonomy,nativeFeatureRuleContextsForTemplate,inspectNativeEncounterActivation].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native environmental proof capabilities required.');
function nativeEnvironmentBinding(db,guild,{encounter:ref,scene,location},{library=new EncounterLibrary('../content')}={}){
  if([ref,scene,location].some(v=>typeof v!=='string'||!v||v.length>200))
    throw fail('environment_closed_native_locator');
  const actual=currentScene(db,guild),encounter=db.getEncounter(ref),
    binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
    proposal=binding&&db.getCityRecord(guild,'encounter_proposal',binding.data.proposal),
    source=proposal&&db.getWorldEvent(guild,proposal.source_event),
    template=encounter&&library.environments.find(e=>e.name===encounter.environment_name);
  const rejection=environmentEncounterRejection({guild,ref,scene,location,actual,encounter,
    currentEncounter:encounter&&encounter.guild_id===guild&&encounter.session_id===actual.session_id&&encounter.status==='active'
      ?db.getCurrentEncounter(actual.session_id):null,binding,proposal,source,template});
  if(rejection)throw fail(rejection);
  // Delegation is an additive native receipt, not a forged human review string.
  const activation=binding.data.native_activation
    ?inspectNativeEncounterActivation(db,guild,binding.data.native_activation,{current:true}):null;
  const review=db.db.prepare(`SELECT id FROM mutation_ledger WHERE guild_id=? AND source_layer='city'
    AND mutation_type='encounter_review' AND entity_key=? AND actor_id=? AND after_json=? LIMIT 1`)
    .get(guild,proposal.record_key,proposal.data.reviewed_by,JSON.stringify(proposal));
  if(!review)throw fail('environment_actual_native_review_receipt');
  if(proposal.data.reviewed_by==='native:encounter-activation'&&!activation)
    throw fail('environment_native_activation_receipt');
  const actor=nativeActorTaxonomy('environment',template),features=executableNativeFeatures('environment')
    .filter(f=>f.actor_kind==='environment'&&f.template_hash===actor.template_hash),
    authoredFeatureRules=nativeFeatureRuleContextsForTemplate('environment',template);
  const terms={version:1,actor:actor.actor_key,encounter:ref,session:actual.session_id,scene,location,
    template_hash:actor.template_hash,proposal:proposal.record_key,proposal_hash:hash(proposal),
    source:source.event_key,source_hash:hash(source),binding_hash:hash(binding),review:review.id,activation:activation?.record_key||null,
    activation_hash:activation?hash(activation):null,features:features.map(f=>({key:f.feature_key,hash:hash(f)})),authored_feature_rules:authoredFeatureRules};
  return Object.freeze({...terms,fingerprint:hash(terms),execution_authorized:false,
    authority:'GM-private environment provenance only; exact feature prerequisites, costs, owner choices and native receipts remain mandatory.'});
}

/** Revalidate a saved environment locator without accepting caller-supplied rule text or effects. */
function inspectNativeEnvironmentBinding(db,guild,proof,options){
  if(!proof||typeof proof!=='object')throw fail('environment_native_binding_required');
  const current=nativeEnvironmentBinding(db,guild,{encounter:proof.encounter,scene:proof.scene,location:proof.location},options);
  if(hash(current)!==hash(proof))throw fail('environment_source_or_template_changed');
  return current;
}

return Object.freeze({nativeEnvironmentBinding,inspectNativeEnvironmentBinding});
}
