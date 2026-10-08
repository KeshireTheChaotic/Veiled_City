/** Local, fail-closed material-claim checks. Claims propose no mutations and never supply dice. */
export const materialClaimSchema={type:"object",additionalProperties:false,properties:{
  actor:{type:"string"},entity_type:{type:"string",enum:["character","npc","combatant","world"]},entity:{type:"string"},
  action:{type:"string",enum:["damage","movement","disclosure","obligation","status","canon","dice"]},
  prior:{type:"string"},proposed:{type:"string"},visibility:{type:"string",enum:["public","party","player","character","gm"]},
  source_ref:{type:"string"},source_span:{type:"string"},mutation_index:{type:"integer"},
  certainty:{type:"string",enum:["committed","dialogue","rumor","uncertain","forecast","metaphor","intent"]}
},required:["actor","entity_type","entity","action","prior","proposed","visibility","source_ref","source_span","mutation_index","certainty"]};
export const NARRATIVE_CONTRACT="Return narrative_claims for EVERY consequential assertion in narration/private_messages: damage, movement, disclosure, obligations, status, canon, dice. "
  +"Use exact source_span and stable actor/entity IDs; prior/proposed are state values, source_ref identifies existing fact/knowledge/canon/obligation. "
  +"Uncertain observations, quoted lies, hallucinations, metaphors, forecasts and intentions must be explicitly framed as such in prose and tagged, not committed facts. "
  +"mutation_index is a matching events index or -1 for already established state. Never invent dice, PC consent or compensate for a rejected claim. Cosmetic prose needs no claim.";
function deny(category,claim,source=""){
  const error=new Error(`Narrative integrity rejected ${category}; revise to an explicitly uncommitted intent/uncertainty or use established authorized state.`);
  error.code="NARRATIVE_INTEGRITY";
  error.diagnostic={category,entity:claim?.entity||"",source,source_ref:claim?.source_ref||"",recovery:"Inspect authoritative state and ledger; correct the proposal without inventing changes."};
  throw error;
}
function visible(row,scope){
  return ["public","party"].includes(row.visibility)||(scope.mode==="private"&&
    ((row.visibility==="player"&&row.subject_user_id===scope.actorUserId)||(row.visibility==="character"&&row.subject_character_id===scope.actorCharacterId)));
}
export function validateNarrativeClaims(db,guildId,result,scope={mode:"party"}){
  const claims=result.narrative_claims||[];
  if(!Array.isArray(claims)||claims.length>32) deny("claim_budget");
  const narration=[result.narration||result.public_narration||"",...(result.private_messages||[]).map(row=>row.content)].join("\n");
  for(const c of claims){
    if(!c||Object.keys(c).some(key=>!materialClaimSchema.required.includes(key))||
      materialClaimSchema.required.some(key=>!(key in c))) deny("claim_shape",c);
    if(materialClaimSchema.required.filter(key=>key!=="mutation_index").some(key=>typeof c[key]!=="string")) deny("claim_shape",c);
    if(!materialClaimSchema.properties.action.enum.includes(c.action)||!materialClaimSchema.properties.certainty.enum.includes(c.certainty)
      ||!materialClaimSchema.properties.visibility.enum.includes(c.visibility)||!Number.isInteger(c.mutation_index)) deny("claim_shape",c);
    if(Object.values(c).some(value=>typeof value==="string"&&value.length>1000)||!c.source_span||!narration.includes(c.source_span)) deny("source_span",c);
    if(c.certainty!=="committed"){
      if(!/\b(says?|claims?|lies?|rumou?r|might|may|could|seems?|perhaps|imagines?|hallucinates?|like|as if|intends?|proposes?|would|hypothes\w*)\b/i.test(c.source_span)) deny("uncertainty_framing",c);
      // Non-factual framing does not authorize disclosure of a real secret.
      if(c.action!=="disclosure") continue;
    }
    const entity=c.entity_type==="character"?db.getCharacter(c.entity):c.entity_type==="npc"?db.getSimulationEntity(guildId,"npc",c.entity):null;
    if(entity?.guild_id&&entity.guild_id!==guildId) deny("campaign_isolation",c);
    const state=entity?.state||{};
    if(c.action==="dice") deny("model_dice",c);
    if(c.action==="status"&&(!entity||entity.status!==c.proposed&&state.status!==c.proposed)) deny("actor_status",c,"saved lifecycle");
    if(c.entity_type==="npc"&&["dead","removed"].includes(state.status)&&c.proposed==="active") deny("actor_status",c);
    if(c.action==="movement"&&(!entity||String(state.location_key||entity.data?.location||"")!==c.proposed)) deny("uncommitted_movement",c,"saved position");
    if(c.action==="damage"){
      const event=result.events?.[c.mutation_index];
      if(c.entity_type!=="character"||!entity||!event||event.type!=="resource_delta"||event.key!=="hp"
        ||event.target_character_id!==c.entity||String(event.amount)!==c.proposed
        ||(scope.mode==="private"&&scope.actorCharacterId!==c.entity)) deny("uncommitted_damage",c,"PC resource event");
    }
    if(c.action==="disclosure"){
      const fact=db.getFact(guildId,c.source_ref);
      const knowledge=c.actor?db.getNpcKnowledge(guildId,c.actor,c.source_ref):null;
      if(c.actor&&!knowledge) deny("actor_knowledge",c,"NPC knowledge");
      if(!fact||!visible(fact,scope)||fact.archived||c.proposed!==fact.content) deny("scoped_disclosure",c,"scoped fact");
      if(knowledge&&knowledge.content!==c.proposed) deny("actor_knowledge",c);
    }
    if(c.action==="obligation"){
      const row=db.getSimulationRecord(guildId,c.source_ref);
      if(!row||row.kind!=="obligation"||row.status!=="active"||row.data.content!==c.proposed) deny("uncommitted_obligation",c,"existing obligation");
    }
    if(c.action==="canon"){
      const row=db.currentCanon(guildId,c.source_ref);
      if(!row||row.value!==c.proposed||!visible(row,scope)) deny("canon",c,"canon ledger");
    }
  }
  // Conservative local tripwires also catch omitted declarations of common high-risk assertions.
  const risk=/\b(?:you (?:take|suffer) \d+ (?:damage|HP)|(?:teleports?|is now dead|is now bound)|(?:roll(?:ed)? (?:a |an )?\d+))\b/gi;
  for(const match of narration.matchAll(risk)) if(!claims.some(c=>c.source_span.includes(match[0]))) deny("undeclared_material_assertion");
  return {ok:true,claims:claims.length};
}
