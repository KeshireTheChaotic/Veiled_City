import {transitionBaselineHash} from './boundary-checker.mjs';

const featureCounts={RF03:6,RF04:7,RF05:6,RF06:7};
const stable=entry=>JSON.stringify(Object.fromEntries(Object.entries(entry).filter(([key])=>!['remove_in_feature','expires_after'].includes(key)).sort(([a],[b])=>a.localeCompare(b))));

/** Apply an individually reviewed, owner-authorized audit. No baseline acceptance or source execution. */
export function reconcileTransitions(manifest,audit,{baseline,currentViolationIds}={}){
  if(manifest.baseline_sha256!==transitionBaselineHash(baseline)||!audit?.owner_authorization||!Array.isArray(audit.records)||!(currentViolationIds instanceof Set))
    throw new TypeError('Pinned baseline, owner authorization, exact audit and current violations required.');
  const original=new Map(manifest.entries.map(e=>[e.id,e]));
  if(original.size!==manifest.entries.length)throw new Error('Duplicate original transition.');
  const expected=new Set(manifest.entries.filter(e=>e.expires_after==='RF02').map(e=>e.id)),reviewed=new Map(),holds=[];
  for(const record of audit.records){
    if(!expected.has(record.id)||reviewed.has(record.id)||!record.original||JSON.stringify(record.original)!==JSON.stringify(original.get(record.id)))
      throw new Error('Audit must identify each original RF02 transition exactly once.');
    if(!record.justification||!record.evidence?.length||!record.intended_owner)throw new Error('Per-record source evidence, justification and intended owner required.');
    reviewed.set(record.id,record);
  }
  if(reviewed.size!==expected.size)throw new Error('Incomplete RF02 audit.');
  const removed=new Set(),replacements=new Map();
  for(const record of reviewed.values()){
    const prior=original.get(record.id);
    if(record.classification==='RF02_OUTSTANDING'){
      if(record.resolution!=='RESOLVED'||currentViolationIds.has(record.id)){holds.push(record.id);continue;}
      removed.add(record.id);
    }else if(record.classification==='VALIDATED_FUTURE_DEPENDENCY'){
      if(!currentViolationIds.has(record.id))throw new Error('Future dependency must still be an observed exact violation.');
      const phase=record.remove_in_feature?.slice(0,4),feature=Number(record.remove_in_feature?.slice(6));
      if(!/^RF0[3-6]-F0[1-7]$/.test(record.remove_in_feature||'')||feature>featureCounts[phase]||record.expires_after!==phase)
        throw new Error('A real accountable future feature and matching phase are required.');
      const updated={...prior,remove_in_feature:record.remove_in_feature,expires_after:record.expires_after};
      if(stable(updated)!==stable(prior))throw new Error('Transition identity and occurrence limit must remain immutable.');
      replacements.set(record.id,updated);
    }else if(record.classification==='UNJUSTIFIED_OR_UNCERTAIN')holds.push(record.id);
    else throw new Error('Unknown audit classification.');
  }
  for(const record of audit.additional_resolutions||[]){
    if(!original.has(record.id)||expected.has(record.id)||removed.has(record.id)||currentViolationIds.has(record.id)||!record.justification||!record.evidence?.length)
      throw new Error('Additional resolved edges require exact original identity and absence proof.');
    removed.add(record.id);
  }
  const entries=manifest.entries.filter(e=>!removed.has(e.id)).map(e=>replacements.get(e.id)||structuredClone(e));
  return {manifest:{...structuredClone(manifest),entries},held_ids:holds,removed_ids:[...removed],reassigned_ids:[...replacements.keys()]};
}
