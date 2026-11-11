import {createHash} from 'node:crypto';
import {featureRollSource} from './feature-roll-source.js';
import {createHistoricalConditionReader} from './condition-history.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Compulsory Spellcast odds only. Condition inspection must validate committed ancestry;
 * this adapter never treats sheet strings or model classifications as native evidence.
 */
export function createSpellcastConditionModifiers({catalog,readRollIdentity,readConditionRefs,inspectCondition,readConditionWindow=null}){
 if(typeof catalog?.findDomainCard!=='function'||typeof readRollIdentity!=='function'||(readConditionWindow===null?[readConditionRefs,inspectCondition].some(f=>typeof f!=='function'):typeof readConditionWindow!=='function'))throw new TypeError('Native card, roll identity and complete condition authorities required');
 function capture(source,a,actor,previewBinding=null){
  if(a.campaignId!==source.campaign||a.sceneId!==source.scene||a.sourceRef!==source.id||a.sourceRevision!==source.revision||a.actorId!==actor.actorId||actor.ownerUserId!==source.principal||!source.actors.includes(a.actorId))throw new Error('Native Spellcast actor/source scope required');
  const binding=previewBinding??readRollIdentity(source.campaign,a.id);
  if(!binding||Object.keys(binding).sort().join(',')!=='adjudicationHash,feature,slot,source_hash'||binding.adjudicationHash!==hash(a))throw new Error('Exact reviewed native Spellcast locator required');
  const {adjudicationHash,...locator}=binding,identity=featureRollSource(catalog,{id:actor.actorId,data:actor.data},locator);
  if(identity.trait.toLowerCase()!==a.trait.toLowerCase())throw new Error('Actual Spellcast subclass trait required');
  const window=readConditionWindow?.(source.campaign,actor.actorId),listing=readConditionWindow?window:readConditionRefs(source.campaign,actor.actorId);
  if(readConditionWindow&&(window?.family!=='pc_native_condition'||!Array.isArray(window.conditions)||window.conditions.length!==window.refs?.length))throw new Error('Complete native condition snapshot required');
  if(listing?.complete!==true||!Array.isArray(listing.refs)||listing.refs.length>256||listing.refs.some(r=>typeof r!=='string'||!r||r.length>256)||new Set(listing.refs).size!==listing.refs.length)throw new Error('Complete unique native condition discovery required');
  const conditions=listing.refs.map((ref,index)=>{
   const row=window?window.conditions[index]:inspectCondition(source.campaign,ref);
   if(!row||row.record_key!==ref||row.subject_key!==actor.actorId||!['active','expired','cleared'].includes(row.status)||!row.data)throw new Error('Ancestry-qualified native actor condition required');
   if(row.status!=='active'||row.data.cause?.spellcast_disadvantage!==true)return null;
   if(row.data.cause.condition!=='Restrained'||row.data.cause.expiry!=='until_freed')throw new Error('Native compulsory Spellcast condition required');
   return {ref,fingerprint:hash(row.data)};
  }).filter(Boolean).sort((x,y)=>x.ref.localeCompare(y.ref));
  const material={adjudicationHash,identityHash:identity.identity_hash,conditions},fingerprint=hash(material),ref=`spellcast-condition-odds:${hash([source.campaign,a.id,a.revision,actor.actorId])}`;
  return {refs:conditions.length?[ref]:[],modifier:{id:ref,revision:fingerprint,stackKey:`spellcast-condition:${a.id}`,kind:'disadvantage',amount:1,evidenceHash:fingerprint}};
 }
 function current(source,a,actor,binding=null){const first=capture(source,a,actor,binding);if(hash(capture(source,a,actor,binding))!==hash(first))throw new Error('Native Spellcast condition evidence changed');return first;}
 return Object.freeze({readMandatoryRefs:(s,a,actor)=>current(s,a,actor).refs,inspectModifier(s,a,ref,actor){const value=current(s,a,actor);if(value.refs.length!==1||value.refs[0]!==ref)throw new Error('Current compulsory Spellcast modifier reference required');return value.modifier;},
  // Native preflight only: current roll terms still require the persisted identity.
  previewMandatoryRefs(source,a,actor,locator){if(!locator||Object.keys(locator).sort().join(',')!=='feature,slot,source_hash')throw new Error('Exact native Spellcast locator required');return current(source,a,actor,{adjudicationHash:hash(a),...structuredClone(locator)}).refs;}
 });
}

/** Actual legacy family binding. Native snapshots never leave this adapter as model context. */
export function createLegacySpellcastConditionModifiers({repository,catalog,adjudications,sourceAuthority,readActorSnapshot}){
 if(typeof adjudications?.readRollIdentity!=='function'||typeof sourceAuthority?.revalidate!=='function'||typeof readActorSnapshot!=='function')throw new TypeError('Native persisted roll identity, source and actor authorities required');
 const history=createHistoricalConditionReader(repository),modifiers=createSpellcastConditionModifiers({catalog,readRollIdentity:adjudications.readRollIdentity,readConditionWindow:history.inspectPcConditionWindow});
 function run(source,a,actor,inspect){
  if(!sourceAuthority.revalidate(source))throw new Error('Current native roll source required');
  const current=readActorSnapshot(source.campaign,a.actorId);
  if(actor&&hash(actor)!==hash(current))throw new Error('Exact current native roll actor required');
  const result=inspect(current);
  if(!sourceAuthority.revalidate(source)||hash(readActorSnapshot(source.campaign,a.actorId))!==hash(current))throw new Error('Native roll source or actor changed');
  return result;
 }
 return Object.freeze({
  readMandatoryRefs:(s,a,actor)=>run(s,a,actor,current=>modifiers.readMandatoryRefs(s,a,current)),
  inspectModifier:(s,a,ref,actor)=>run(s,a,actor,current=>modifiers.inspectModifier(s,a,ref,current)),
  previewMandatoryRefs:(s,a,locator)=>run(s,a,null,current=>modifiers.previewMandatoryRefs(s,a,current,locator))
 });
}
