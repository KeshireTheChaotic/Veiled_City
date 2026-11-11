import {createHash} from 'node:crypto';
import {featureRollSource} from './feature-roll-source.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Compulsory Spellcast odds only. Condition inspection must validate committed ancestry;
 * this adapter never treats sheet strings or model classifications as native evidence.
 */
export function createSpellcastConditionModifiers({catalog,readRollIdentity,readConditionRefs,inspectCondition}){
 if(typeof catalog?.findDomainCard!=='function'||[readRollIdentity,readConditionRefs,inspectCondition].some(f=>typeof f!=='function'))throw new TypeError('Native card, roll identity and complete condition authorities required');
 function capture(source,a,actor){
  if(a.campaignId!==source.campaign||a.sceneId!==source.scene||a.sourceRef!==source.id||a.sourceRevision!==source.revision||a.actorId!==actor.actorId||actor.ownerUserId!==source.principal||!source.actors.includes(a.actorId))throw new Error('Native Spellcast actor/source scope required');
  const binding=readRollIdentity(source.campaign,a.id);
  if(!binding||Object.keys(binding).sort().join(',')!=='adjudicationHash,feature,slot,source_hash'||binding.adjudicationHash!==hash(a))throw new Error('Exact reviewed native Spellcast locator required');
  const {adjudicationHash,...locator}=binding,identity=featureRollSource(catalog,{id:actor.actorId,data:actor.data},locator);
  if(identity.trait.toLowerCase()!==a.trait.toLowerCase())throw new Error('Actual Spellcast subclass trait required');
  const listing=readConditionRefs(source.campaign,actor.actorId);
  if(listing?.complete!==true||!Array.isArray(listing.refs)||listing.refs.length>256||listing.refs.some(r=>typeof r!=='string'||!r||r.length>256)||new Set(listing.refs).size!==listing.refs.length)throw new Error('Complete unique native condition discovery required');
  const conditions=listing.refs.map(ref=>{
   const row=inspectCondition(source.campaign,ref);
   if(!row||row.record_key!==ref||row.subject_key!==actor.actorId||!['active','expired','cleared'].includes(row.status)||!row.data)throw new Error('Ancestry-qualified native actor condition required');
   if(row.status!=='active'||row.data.cause?.spellcast_disadvantage!==true)return null;
   if(row.data.cause.condition!=='Restrained'||row.data.cause.expiry!=='until_freed')throw new Error('Native compulsory Spellcast condition required');
   return {ref,fingerprint:hash(row.data)};
  }).filter(Boolean).sort((x,y)=>x.ref.localeCompare(y.ref));
  const material={adjudicationHash,identityHash:identity.identity_hash,conditions},fingerprint=hash(material),ref=`spellcast-condition-odds:${hash([source.campaign,a.id,a.revision,actor.actorId])}`;
  return {refs:conditions.length?[ref]:[],modifier:{id:ref,revision:fingerprint,stackKey:`spellcast-condition:${a.id}`,kind:'disadvantage',amount:1,evidenceHash:fingerprint}};
 }
 function current(source,a,actor){const first=capture(source,a,actor);if(hash(capture(source,a,actor))!==hash(first))throw new Error('Native Spellcast condition evidence changed');return first;}
 return Object.freeze({readMandatoryRefs:(s,a,actor)=>current(s,a,actor).refs,inspectModifier(s,a,ref,actor){const value=current(s,a,actor);if(value.refs.length!==1||value.refs[0]!==ref)throw new Error('Current compulsory Spellcast modifier reference required');return value.modifier;}});
}
