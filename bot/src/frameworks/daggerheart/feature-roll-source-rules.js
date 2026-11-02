/** Read-only feature roll identity. This grants no activation, payment, dice or effect. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
const SRD='https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf';
const VERSION='2.0 (2026-08-25)';
// Explicit subclass sources: class alone is insufficient (notably Assassin and Witch).
const subclasses=[
  ['Assassin','Executioners Guild','Agility',8],['Assassin','Poisoners Guild','Knowledge',9],
  ['Bard','Troubadour','Presence',10],['Bard','Wordsmith','Presence',10],
  ['Druid','Warden of the Elements','Instinct',13],['Druid','Warden of Renewal','Instinct',14],
  ['Ranger','Beastbound','Agility',19],['Ranger','Wayfinder','Agility',20],
  ['Rogue','Nightwalker','Finesse',22],['Rogue','Syndicate','Finesse',22],
  ['Seraph','Divine Wielder','Strength',23],['Seraph','Winged Sentinel','Strength',23],
  ['Sorcerer','Elemental Origin','Instinct',24],['Sorcerer','Primal Origin','Instinct',24],
  ['Warlock','Pact of the Endless','Presence',26],['Warlock','Pact of the Wrathful','Presence',26],
  ['Witch','Hedge','Knowledge',28],['Witch','Moon','Instinct',29],
  ['Wizard','School of Knowledge','Knowledge',30],['Wizard','School of War','Knowledge',30]
];
const normalize=s=>typeof s==='string'?s.trim().toLowerCase():'';

/** Source lookup only; the owner/native roll workflow still owns trait selection and use. */
export function spellcastTraitSource(data,{slot='base'}={}){
  if(!['base','multiclass'].includes(slot))throw fail('spellcast_subclass_slot');
  const role=slot==='base'?data:data?.multiclass,
    source=subclasses.find(([cls,sub])=>normalize(cls)===normalize(role?.class)&&normalize(sub)===normalize(role?.subclass));
  if(!source)throw fail('spellcast_subclass_source_unavailable');
  return Object.freeze({slot,class:source[0],subclass:source[1],trait:source[2],authority:'RAW',version:VERSION,source_ref:`${SRD}#page=${source[3]+1}`});
}

/** Qualify a current packaged domain card and its explicit roll clause, never a sheet's prose claims. */
export function featureRollSource(library,pc,input){
  if(!input||Object.keys(input).sort().join()!=='feature,slot,source_hash'||typeof input.feature!=='string'
    ||typeof library?.findDomainCard!=='function')throw fail('feature_roll_source_locators');
  if(!Array.isArray(pc?.data?.domain_cards)||!Array.isArray(pc.data.domains))throw fail('feature_roll_current_owned_source');
  let source;
  try{source=library.findDomainCard(input.feature);}catch{throw fail('feature_roll_source_unavailable');}
  const card=source?.card,owned=pc.data.domain_cards.filter(c=>c&&typeof c==='object'&&c.name===card?.name&&c.active===true);
  if(!source||source.feature!==input.feature||hash(card)!==source.source_hash||source.source_hash!==input.source_hash
    ||owned.length!==1||!Array.isArray(pc.data.domains)||!pc.data.domains.some(d=>normalize(d)===normalize(source.domain))
    ||!Number.isSafeInteger(pc.data.level)||!Number.isSafeInteger(card.level)||card.level>pc.data.level
    ||typeof card.text!=='string')throw fail('feature_roll_current_owned_source');
  // Only the authoritative printed rule is inspected. A Spell type, matching trait,
  // reference to a previous Spellcast result, or free-text declaration is insufficient.
  const clauses=[...card.text.matchAll(/\bmake (?:a|an) Spellcast Roll\b/gi)];
  if(clauses.length!==1)throw fail('feature_roll_explicit_spellcast_clause');
  const subclass=spellcastTraitSource(pc.data,{slot:input.slot}),clause=clauses[0],data={version:1,classification:'spellcast',
    feature:source.feature,source_ref:source.source_ref,source_hash:source.source_hash,subclass,trait:subclass.trait,
    clause:{start:clause.index,end:clause.index+clause[0].length,hash:hash(clause[0])},
    execution_authorized:false,authority:'Roll identity only. Native source/owner/trigger/cost/effect gates remain required.'};
  return Object.freeze({...data,identity_hash:hash(data)});
}

/** Existing reviewed roll sources identify the roll; native conditions supply compulsory odds.
 * No new spell activation or effects are granted by this receipt.
 */
export function createFeatureRollConditionRules({resolveFeatureRollSource,activeNativeConditions,validateNativeCondition,indexWorldEvent}){
  if([resolveFeatureRollSource,activeNativeConditions,validateNativeCondition,indexWorldEvent].some(fn=>typeof fn!=='function'))
    throw new TypeError('Native feature roll-condition capabilities required.');
  const keyFor=request=>`native-roll-conditions:${hash(request)}`;
  function markedSources(db,guild,input){
    return [...new Set([input.difficulty_source,input.attack_source].filter(Boolean))].flatMap(ref=>{
      const event=db.getWorldEvent(guild,ref),body=event?.details?.[ref===input.attack_source?'roll_attack':'roll_difficulty'];
      return body?.feature_roll_source?[{event,body}]:[];
    });
  }
  function rollConditionContext(db,guild,input,pc){
    const sources=markedSources(db,guild,input);if(!sources.length)return null;
    if(sources.length!==1)throw fail('feature_roll_unique_classification_source');
    const {event,body}=sources[0],declaration=db.getWorldEvent(guild,input.source_event);
    if(event.status!=='active'||event.kind!=='roll_adjudication'||event.source_kind!=='gm'||event.details.human_reviewed!==true
      ||event.visibility!=='character'||event.subject_key!==pc.id||event.session_id!==declaration?.session_id||event.scene!==declaration?.scene
      ||!db.getRulesRuling(guild,body.ruling_key)||event.event_key===input.difficulty_source&&body.declaration!==input.source_event)
      throw fail('feature_roll_reviewed_classification_scope');
    const identity=resolveFeatureRollSource(pc,body.feature_roll_source);
    if(identity.classification!=='spellcast'||identity.execution_authorized!==false||identity.trait!==input.trait)throw fail('feature_roll_actual_trait');
    const conditions=activeNativeConditions(db,guild,pc.id).filter(r=>r.data.cause?.spellcast_disadvantage===true).map(row=>{
      if(row.status!=='active'||row.subject_key!==pc.id||row.data.cause.condition!=='Restrained'||row.data.cause.expiry!=='until_freed')
        throw fail('feature_roll_condition_source');
      return {ref:row.record_key,fingerprint:hash(row.data)};
    });
    return {feature_roll_source:{identity,event:event.event_key,event_hash:hash(event)},
      native_condition_odds:{conditions,disadvantage:Number(conditions.length>0)}};
  }
  function binding(request){
    const d=request.data;
    return {version:1,request:request.record_key,source:request.source_event,character:d.character_id,owner:d.owner_user_id,
      accepted_intent:d.input.accepted_intent||null,session:d.session_id,scene:d.scene,kind:d.kind,trait:d.input.trait,
      feature_roll_source:d.breakdown.feature_roll_source,native_condition_odds:d.breakdown.native_condition_odds};
  }
  function persistRollConditionContext(db,guild,request){
    if(!request.data.breakdown.feature_roll_source&&!request.data.breakdown.native_condition_odds)return null;
    const data=binding(request),key=keyFor(request.record_key),prior=db.getWorldEvent(guild,key);
    if(prior){if(prior.status!=='active'||prior.details.payload_hash!==hash(data))throw fail('feature_roll_immutable_preparation');return prior;}
    return indexWorldEvent(db,guild,{key,kind:'native_roll_conditions',source_id:'native:roll-conditions',
      title:'Source-qualified roll identity and native condition odds',session_id:data.session,scene:data.scene,visibility:'character',subject_key:data.character,
      details:{payload_hash:hash(data),binding:data}},'native:roll-conditions');
  }
  /** Read immutable preparation history, including conditions legitimately cleared after the dice. */
  function inspectSavedRollConditionContext(db,guild,request){
    const d=request.data,event=db.getWorldEvent(guild,keyFor(request.record_key)),marked=markedSources(db,guild,d.input);
    if(!event&&!d.breakdown.feature_roll_source&&!d.breakdown.native_condition_odds&&!marked.length)return null;
    const data=binding(request),context=data.feature_roll_source,odds=data.native_condition_odds,
      source=context&&db.getWorldEvent(guild,context.event),identity=context?.identity;
    if(event?.status!=='active'||event.kind!=='native_roll_conditions'||event.source_id!=='native:roll-conditions'
      ||event.visibility!=='character'||event.subject_key!==data.character||event.scene!==data.scene||event.session_id!==data.session
      ||event.details.payload_hash!==hash(data)||hash(event.details.binding)!==hash(data)||source?.status!=='active'||hash(source)!==context.event_hash
      ||marked.length!==1||marked[0].event.event_key!==context.event||!identity||identity.classification!=='spellcast'||identity.trait!==data.trait
      ||identity.execution_authorized!==false||!Array.isArray(odds?.conditions)||odds.disadvantage!==Number(odds.conditions.length>0)
      ||d.breakdown.disadvantage!==d.breakdown.modifiers.filter(m=>m.kind==='disadvantage').length+odds.disadvantage
      ||d.breakdown.advantage!==d.breakdown.modifiers.filter(m=>m.kind==='advantage').length)throw fail('feature_roll_saved_condition_context');
    const {identity_hash,...material}=identity;
    if(identity_hash!==hash(material))throw fail('feature_roll_saved_identity');
    for(const proof of odds.conditions){
      const row=validateNativeCondition(db,guild,proof.ref);
      if(row.subject_key!==data.character||hash(row.data)!==proof.fingerprint||row.data.cause?.spellcast_disadvantage!==true
        ||row.data.cause.condition!=='Restrained'||row.data.cause.expiry!=='until_freed')throw fail('feature_roll_saved_condition_source');
    }
    return event;
  }
  return Object.freeze({rollConditionContext,persistRollConditionContext,inspectSavedRollConditionContext});
}
