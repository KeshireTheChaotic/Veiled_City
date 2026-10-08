/** Persistent directional relationship dimensions and milestone history shared by all mutation paths. */
function endpointKey(type,key){return String(key).replace(new RegExp(`^${type}:`),"");}
export function relationshipPairKey(row){
  return JSON.stringify([row.from_type,endpointKey(row.from_type,row.from_key),row.to_type,endpointKey(row.to_type,row.to_key)]);
}

export function updateRelationshipDimensions(db,guildId,row){
  const pairKey=relationshipPairKey(row);
  const previous=db.getSimulationEntity(guildId,"relationship",pairKey)?.state||{};
  const dimensions={trust:0,affection:0,fear:0,respect:0,debt:0,suspicion:0,...previous.dimensions};
  const dimension=row.relationship_type==="authority"?"respect":row.relationship_type;
  if(Object.hasOwn(dimensions,dimension)) dimensions[dimension]=Math.max(-5,Math.min(5,Number(row.score)||0));
  const milestone=dimensions.debt>0?"debtor":dimensions.suspicion>=3?"suspicious":dimensions.affection>=4?"romantic_interest":
    dimensions.trust>=4?"trusted":dimensions.trust>=2?"ally":row.relationship_type==="rival"?"rival":
      row.relationship_type==="hostility"&&row.score>=3?"enemy":"acquaintance";
  const state={...previous,from:`${row.from_type}:${endpointKey(row.from_type,row.from_key)}`,
    to:`${row.to_type}:${endpointKey(row.to_type,row.to_key)}`,dimensions,milestone,
    aggregate_score:Object.values(dimensions).reduce((sum,value)=>sum+value,0)/Object.keys(dimensions).length};
  db.setSimulationEntity(guildId,"relationship",pairKey,state);
  if(previous.milestone!==milestone) db.putSimulationRecord(guildId,{kind:"memory",entityKey:`relationship:${pairKey}`,
    data:{memory_type:"relational",content:`Relationship milestone: ${previous.milestone||"unestablished"} → ${milestone}`,dimensions}});
  return state;
}
