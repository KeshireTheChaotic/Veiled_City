/** Local, fail-closed material-claim checks. Claims propose no mutations and never supply dice. */
import { sceneAccess } from "./scene-continuity.js";
export const materialClaimSchema={type:"object",additionalProperties:false,properties:{
  actor:{type:"string"},entity_type:{type:"string",enum:["character","npc","combatant","world"]},entity:{type:"string"},
  action:{type:"string",enum:["damage","movement","disclosure","obligation","status","canon","dice","possession"]},
  prior:{type:"string"},proposed:{type:"string"},visibility:{type:"string",enum:["public","party","player","character","gm"]},
  source_ref:{type:"string"},source_span:{type:"string"},mutation_index:{type:"integer"},
  certainty:{type:"string",enum:["committed","dialogue","rumor","uncertain","forecast","metaphor","intent"]}
},required:["actor","entity_type","entity","action","prior","proposed","visibility","source_ref","source_span","mutation_index","certainty"]};
export const NARRATIVE_CONTRACT="Return narrative_claims for EVERY consequential assertion in narration/private_messages: damage, movement, disclosure, obligations, status, canon, dice. "
  +"Never supply predefined narrative choices, fixed acceptance/decline prompts, A/B/C story answers or scripted PC dialogue. Ask openly. "
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
/** Bounded hand-authored paraphrases are review tripwires, not a claim of general semantic understanding. */
export function materialParaphrases(text,names=[]){
  const escaped=names.filter(Boolean).slice(0,100).map(name=>String(name).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const subject=`(?:you${escaped.length?`|${escaped.join("|")}`:""})`;
  const patterns=[
    ["status",`${subject} (?:is dead|are dead|lies? lifeless|has died|have died|breathes? (?:his|her|their|your) last)`],
    ["damage",`${subject} (?:bleeds?|are bleeding|is bleeding|sustains? (?:an? )?(?:injury|wound)|suffers? (?:an? )?(?:injury|wound)|loses? \\d+ (?:HP|hit points?))`],
    ["movement",`${subject} (?:arrives? at|has entered|have entered|reaches? the|has crossed into|have crossed into)`],
    ["possession",`${subject} (?:pockets?|has acquired|have acquired|takes? possession of|now owns?)`],
    ["obligation",`${subject} (?:is bound to|are bound to|has sworn|have sworn|owes? (?:a debt|allegiance))`],
    ["disclosure",`${subject} (?:now knows?|has learned|have learned|discovers? the truth)`],
    ["dice",`${subject} (?:rolled? a|rolled? an|scored? a|scored? an) \\d+`]
  ];
  const hits=[];
  for(const sentence of String(text||"").split(/(?<=[.!?])\s+|\n/)){
    const quotes=[...sentence.matchAll(/["“][^"”]*["”]/g)];
    for(const [action,expression] of patterns) for(const match of sentence.matchAll(new RegExp(`\\b${expression}\\b`,"gi"))){
      const prefix=sentence.slice(0,match.index).split(/[,;]/).at(-1);
      if(/\b(?:might|may|could|perhaps|rumou?r|claims?|as if|imagines?|intends?|hypothes\w*|would|seems?|looks? like)\b/i.test(prefix)) continue;
      if(quotes.some(quote=>match.index>quote.index&&match.index<quote.index+quote[0].length)&&/\b(?:says?|said|claims?)\b/i.test(sentence)) continue;
      if(action==="status"&&/dead to (?:me|you|him|her|them)/i.test(sentence.slice(match.index))) continue;
      if(action==="damage"&&/bleeds? (?:money|secrets|time)\b/i.test(sentence.slice(match.index))) continue;
      hits.push({action,span:match[0]});
    }
  }
  return hits;
}
export function validateNarrativeClaims(db,guildId,result,scope={mode:"party"}){
  const claims=result.narrative_claims||[];
  if(!Array.isArray(claims)||claims.length>32) deny("claim_budget");
  const narration=[result.narration||"",result.public_narration||"",result.player_summary||"",...(result.private_messages||[]).map(row=>row.content)].join("\n");
  const flags=db.getCityCalendar(guildId).flags;
  if(flags.natural_language===true||flags.semantic_integrity===true){
    if(/\b(?:choose|pick|select) (?:one of|from the following|an option)|\b(?:reply|answer|respond) (?:with )?(?:yes or no|accept or decline)\b/i.test(narration)
      ||/(?:^|\n)\s*A[).:].*\n\s*B[).:]/i.test(narration)) deny("predefined_narrative_choices");
  }
  for(const c of claims){
    if(!c||Object.keys(c).some(key=>!materialClaimSchema.required.includes(key))||
      materialClaimSchema.required.some(key=>!(key in c))) deny("claim_shape",c);
    if(materialClaimSchema.required.filter(key=>key!=="mutation_index").some(key=>typeof c[key]!=="string")) deny("claim_shape",c);
    if(!materialClaimSchema.properties.action.enum.includes(c.action)||!materialClaimSchema.properties.certainty.enum.includes(c.certainty)
      ||!materialClaimSchema.properties.visibility.enum.includes(c.visibility)||!materialClaimSchema.properties.entity_type.enum.includes(c.entity_type)
      ||!Number.isInteger(c.mutation_index)) deny("claim_shape",c);
    if(Object.values(c).some(value=>typeof value==="string"&&value.length>1000)||!c.source_span||!narration.includes(c.source_span)) deny("source_span",c);
    if(c.certainty!=="committed"){
      if(!/\b(says?|claims?|lies?|rumou?r|might|may|could|seems?|perhaps|imagines?|hallucinates?|like|as if|intends?|proposes?|would|hypothes\w*)\b/i.test(c.source_span)) deny("uncertainty_framing",c);
      // Non-factual framing does not authorize disclosure of a real secret.
      if(c.action!=="disclosure") continue;
    }
    const entity=c.entity_type==="character"?db.getCharacter(c.entity):c.entity_type==="npc"?db.getSimulationEntity(guildId,"npc",c.entity):null;
    if(entity?.guild_id&&entity.guild_id!==guildId) deny("campaign_isolation",c);
    const state=entity?.state||{};
    if(c.actor&&["movement","status"].includes(c.action)&&db.getCityCalendar(guildId).flags.scene_continuity===true
      &&!sceneAccess(db,guildId,{observer_type:"npc",observer_key:c.actor,target_type:c.entity_type,target_key:c.entity,sense:"sight"}))
      deny("not_witnessed",c,"actual scene access");
    if(c.certainty==="committed"&&((entity?.status&&["dead","retired"].includes(entity.status))||state.removed||["dead","removed"].includes(state.status))
      &&!(c.action==="status"&&[entity?.status,state.status].includes(c.proposed))) deny("inactive_actor",c);
    if(c.action==="dice") deny("model_dice",c);
    if(c.action==="possession"){
      const artifact=db.getHandout(c.source_ref);
      if(!artifact||artifact.guild_id!==guildId||artifact.status!=="active"||!visible(artifact,scope)
        ||artifact.metadata?.evidence?.original?.holder!==`character:${c.entity}`||c.proposed!==artifact.id)
        deny("uncommitted_possession",c,"native artifact custody");
    }
    if(c.action==="status"&&(!entity||entity.status!==c.proposed&&state.status!==c.proposed)) deny("actor_status",c,"saved lifecycle");
    if(c.entity_type==="npc"&&["dead","removed"].includes(state.status)&&c.proposed==="active") deny("actor_status",c);
    if(c.action==="movement"&&(!entity||String(state.location_key||entity.data?.location||"")!==c.proposed)) deny("uncommitted_movement",c,"saved position");
    if(c.action==="damage"){
      const event=result.events?.[c.mutation_index];
      if(c.entity_type!=="character"||!entity||!event||event.type!=="resource_delta"||event.key!=="hp"
        ||event.target_character_id!==c.entity||String(event.amount)!==c.proposed
        ||(scope.mode==="private"&&scope.actorCharacterId!==c.entity)) deny("uncommitted_damage",c,"PC resource event");
      if(String(entity.data?.resources?.hp?.current??"")!==c.prior) deny("stale_prior_state",c,"saved PC resources");
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
  if(db.getCityCalendar(guildId).flags.semantic_integrity===true){
    const names=[...db.listGuildCharacters(guildId).map(row=>row.name),...db.listNpcProfiles(guildId,{limit:100}).map(row=>row.display_name)];
    for(const hit of materialParaphrases(narration,names))
      if(!claims.some(c=>c.action===hit.action&&c.certainty==="committed"&&c.source_span.includes(hit.span)))
        deny("unverified_material_paraphrase",null,hit.action);
  }
  return {ok:true,claims:claims.length};
}

export function assertNarrativeApplied(result,eventResults){
  for(const claim of result.narrative_claims||[]){
    if(claim.certainty!=="committed"||claim.action!=="damage") continue;
    const row=eventResults[claim.mutation_index];
    if(!row?.ok||row.blocked||Number(row.after?.current)-Number(row.before?.current)!==Number(claim.proposed))
      deny("committed_result_mismatch",claim,"actual resource mutation");
  }
}
