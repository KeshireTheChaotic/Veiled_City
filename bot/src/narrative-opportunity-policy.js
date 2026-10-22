/** Deterministic preference among opportunities that native code has already authorized. */
const ORDER=Object.freeze({mandatory_response:0,causal_consequence:1,autonomous_world:2,personal_opportunity:3,ambient:4,unknown:5});
const validClass=value=>Object.hasOwn(ORDER,value)?value:'unknown';
const validUrgency=value=>Number.isFinite(value)?Math.max(0,Math.min(3,Math.trunc(value))):0;
function overlapKey(value){
  if(!Array.isArray(value))return '';
  const keys=[...new Set(value.filter(key=>typeof key==='string'&&key.length>0&&key.length<=160))].sort();
  return keys.length>=2?keys.join('\u0000'):'';
}

/**
 * Sort opaque signal references from caller-verified metadata only. No signal is
 * created or edited. Missing/insufficient evidence preserves original order.
 */
export function rankWorldNarrativeOpportunities(signals,metadata=[]){
  if(!Array.isArray(signals))return [];
  const byIndex=new Map(metadata.filter(row=>Number.isSafeInteger(row?.index)&&row.index>=0)
    .map(row=>[row.index,row]));
  return signals.map((signal,index)=>({signal,index,meta:byIndex.get(index)||{}}))
    .sort((a,b)=>{
      const ac=validClass(a.meta.classification),bc=validClass(b.meta.classification);
      if(ORDER[ac]!==ORDER[bc])return ORDER[ac]-ORDER[bc];
      const au=validUrgency(a.meta.urgency),bu=validUrgency(b.meta.urgency);
      if(au!==bu)return bu-au;
      const ao=overlapKey(a.meta.verifiedActorLinks),bo=overlapKey(b.meta.verifiedActorLinks);
      // Organic overlap is only a tie-break when class and urgency are identical.
      if(ao!==bo){if(ao)return -1;if(bo)return 1;}
      return a.index-b.index;
    }).map(row=>row.signal).slice(0,4);
}

export const WORLD_NARRATIVE_OPPORTUNITY_ORDER=ORDER;
