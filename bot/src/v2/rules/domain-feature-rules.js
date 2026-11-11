import {createHash} from 'node:crypto';
import {featureRollSource} from './feature-roll-source.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const JINX='domain:hex:jinx';
const jinxText='Make a Spellcast Roll against an adversary within Close range. On a success, they are **Vulnerable** until they succeed on an action against you or an ally. Once per target per scene.';
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

/** Source-owned baseline rules, not a permissive prose interpreter or activation authority.
 * More card definitions must be added from their actual rules; unknown cards hold.
 */
export function domainFeatureRule(catalog,pc,locator){
  const identity=featureRollSource(catalog,pc,locator),source=catalog.findDomainCard(locator.feature),card=source?.card;
  if(identity.feature!==JINX||source.feature!==JINX||source.source_hash!==identity.source_hash||hash(card)!==identity.source_hash||Object.keys(card).sort().join(',')!=='level,name,recall_cost,text,type'||card.level!==1||card.type!=='Spell'||card.recall_cost!==1||card.text!==jinxText)throw new Error('Native domain feature rule source unavailable or changed');
  const rule={version:1,kind:'domain_spellcast',feature:JINX,sourceRef:source.source_ref,sourceHash:source.source_hash,
    roll:{family:'duality',classification:'spellcast',trait:identity.trait,difficultyFrom:'target_adversary'},
    target:{kind:'adversary',maximumRange:'Close'},limit:{scope:'actor_target_scene',uses:1,perTarget:true,perScene:true},
    printedActivationCosts:[],recallCost:1,
    success:{condition:'Vulnerable',duration:{until:'target_action_success_against_caster_or_ally'}},failure:{condition:null},
    requires:['current_owner_control','current_owned_active_card','current_target_identity_presence_range','current_target_difficulty','native_target_scene_usage','applicable_house_rules','complete_action_terms_owner_confirmation','current_native_execution_readiness']};
  return freeze({identity,rule,ruleHash:hash(rule),baselineOnly:true,activationAuthorized:false,effectsCommitted:false});
}

/** Pure consequence plan for a separately verified result. No target, roll or state is trusted here. */
export function domainFeatureOutcome(catalog,pc,locator,{success}={}){
  if(typeof success!=='boolean')throw new Error('Verified native feature success/failure required');
  const definition=domainFeatureRule(catalog,pc,locator),branch=success?definition.rule.success:definition.rule.failure;
  return freeze({feature:definition.rule.feature,ruleHash:definition.ruleHash,condition:branch.condition,duration:branch.duration??null,
    activationAuthorized:false,effectsCommitted:false});
}
