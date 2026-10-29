export const claimProperties={
  actor:{type:"string"},entity_type:{type:"string",enum:["character","npc","combatant","world"]},entity:{type:"string"},
  action:{type:"string",enum:["damage","movement","access","disclosure","obligation","status","canon","dice","possession"]},
  prior:{type:"string"},proposed:{type:"string"},visibility:{type:"string",enum:["public","party","player","character","gm"]},
  source_ref:{type:"string"},mutation_index:{type:"integer"},
  certainty:{type:"string",enum:["committed","dialogue","rumor","uncertain","forecast","metaphor","intent"]}
};
export const claimFields=Object.keys(claimProperties);
const closedClaim=extra=>({type:"object",additionalProperties:false,properties:{...claimProperties,...extra},
  required:[...claimFields,...Object.keys(extra)]});
const separatedClaimSchema=closedClaim({authored_source_span:{type:"string"},output_claim_span:{type:"string",minLength:1}});
const legacyClaimSchema=closedClaim({source_span:{type:"string",minLength:1}});
export const materialClaimSchema={anyOf:[separatedClaimSchema,legacyClaimSchema]};
