/** Local, fail-closed material-claim checks. Claims propose no mutations and never supply dice. */
import { sceneAccess, scenePresence, npcEvidenceActive } from "./scene-continuity.js";
import { objectiveEvidence, activeEvidence, evidenceType } from "./epistemic.js";
export const materialClaimSchema={type:"object",additionalProperties:false,properties:{
  actor:{type:"string"},entity_type:{type:"string",enum:["character","npc","combatant","world"]},entity:{type:"string"},
  action:{type:"string",enum:["damage","movement","access","disclosure","obligation","status","canon","dice","possession"]},
  prior:{type:"string"},proposed:{type:"string"},visibility:{type:"string",enum:["public","party","player","character","gm"]},
  source_ref:{type:"string"},source_span:{type:"string"},mutation_index:{type:"integer"},
  certainty:{type:"string",enum:["committed","dialogue","rumor","uncertain","forecast","metaphor","intent"]}
},required:["actor","entity_type","entity","action","prior","proposed","visibility","source_ref","source_span","mutation_index","certainty"]};
export const NARRATIVE_CONTRACT="Return narrative_claims for EVERY consequential assertion in narration/private_messages: damage, movement, disclosure, obligations, status, canon, dice. "
  +"Never supply predefined narrative choices, fixed acceptance/decline prompts, A/B/C story answers or scripted PC dialogue. Ask openly. "
  +"Use exact source_span and stable actor/entity IDs; prior/proposed are state values, source_ref identifies existing fact/knowledge/canon/obligation. "
  +"actor identifies the observer/speaker: npc:<key>, character:<id>, or empty for GM narration, not an invented NPC. "
  +"A character observing their own saved position needs no NPC witness. An entry declaration is not arrival evidence. Never invent unknown places or occupants. "
  +"Separate conversational understanding from authority: resolve ordinary contextual names, pronouns and references using scoped conversation. "
  +"Acknowledging an earlier attempt or clarified destination is not a material state change and needs no movement claim. "
  +"Do not demand a clarification solely because a place is not yet authorized. Ask only when unresolved ambiguity materially affects an action. "
  +"Never infer travel completion, restricted access, encounter resolution, character presence or NPC knowledge from understood intent. "
  +"Disclosure requires an existing audience-visible fact. Narrator/PC knowledge is not NPC knowledge; an NPC additionally needs its own sourced knowledge of that fact. "
  +"Uncertain observations, quoted lies, hallucinations, metaphors, forecasts and intentions must be explicitly framed as such in prose and tagged, not committed facts. "
  +"mutation_index is a matching events index or -1 for already established state. A newly staged fact/clue uses source_ref event:<index>; native receipts supply its actual ID. "
  +"Never invent dice, PC consent or compensate for a rejected claim. Cosmetic prose needs no claim.";
function deny(category,claim,source=""){
  const error=new Error(`Narrative integrity rejected ${category}; revise to an explicitly uncommitted intent/uncertainty or use established authorized state.`);
  error.code="NARRATIVE_INTEGRITY";
  error.diagnostic={category,actor:claim?.actor||"",entity:claim?.entity||"",action:claim?.action||"",source,source_ref:claim?.source_ref||"",
    source_span:claim?.source_span||"",recovery:"Inspect authoritative state and ledger; correct the proposal without inventing changes."};
  throw error;
}
function visible(row,scope){
  return ["public","party"].includes(row.visibility)||(scope.mode==="private"&&
    ((row.visibility==="player"&&row.subject_user_id===scope.actorUserId)||(row.visibility==="character"&&row.subject_character_id===scope.actorCharacterId)));
}
/** Narrow compatibility for redundant claims on non-material acknowledgements, not an uncertainty bypass. */
function contextualEntryAcknowledgement(db,guild,claim,audiences){
  if(claim.action!=="movement"||claim.entity_type!=="character"||claim.certainty!=="intent"||claim.actor
    ||claim.mutation_index!==-1||!/^That clarifies (?:the destination of your earlier entry attempt|where you intend to go)\.$/i.test(claim.source_span)) return false;
  const key=claim.source_ref.replace(/^event:/,"");
  const source=db.getWorldEvent(guild,key),pc=db.getCharacter(claim.entity),session=db.getActiveSession(guild);
  return !!(session&&pc?.guild_id===guild&&source?.status==="active"&&source.kind==="player_declaration"
    &&source.session_id===session.id&&source.details.character_id===pc.id&&source.details.author===pc.owner_user_id
    &&db.ownerAuthoredSource(guild,key,pc.owner_user_id)
    &&audiences.every(audience=>visible({visibility:source.visibility,subject_user_id:source.subject_key,
      subject_character_id:source.subject_key},audience)));
}
function claimActor(db,guild,claim){
  const raw=claim.actor;
  if(!raw||raw==="narrator"||raw==="world") return {type:"world",key:""};
  const pc=db.getCharacter(raw.startsWith("character:")?raw.slice(10):raw);
  if(pc&&(!raw.includes(":")||raw.startsWith("character:"))){
    if(pc.guild_id!==guild) deny("campaign_isolation",claim);
    return {type:"character",key:pc.id,owner:pc.owner_user_id};
  }
  const key=raw.startsWith("npc:")?raw.slice(4):raw;
  if(db.getNpcProfile(guild,key)) return {type:"npc",key};
  deny("actor_knowledge",claim,"Unknown observer/speaker; use stable character/NPC identity or empty narrator actor.");
}
function claimAudiences(db,guild,result,claim,scope){
  const publicText=[result.narration||"",result.public_narration||"",result.player_summary||""];
  const audiences=publicText.some(text=>text.includes(claim.source_span))?[scope]:[];
  for(const message of result.private_messages||[]) if(String(message.content||"").includes(claim.source_span)){
    if(typeof message.discord_user_id!=="string"||!message.discord_user_id) deny("scoped_disclosure",claim,"Actual private-message recipient required.");
    const session=db.getActiveSession(guild),assignment=session?db.activeAssignment(session.id,message.discord_user_id):null;
    audiences.push({mode:"private",actorUserId:message.discord_user_id,actorCharacterId:assignment?.character_id||null});
  }
  return audiences;
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
      const prefix=sentence.slice(0,match.index).split(/[,;]|\b(?:and|but|while|yet|then)\b/i).at(-1);
      if(/\b(?:might|may|could|perhaps|rumou?r|claims?|as if|imagines?|intends?|hypothes\w*|would|seems?|looks? like)\b/i.test(prefix)) continue;
      if(quotes.some(quote=>match.index>quote.index&&match.index<quote.index+quote[0].length)&&/\b(?:says?|said|claims?)\b/i.test(sentence)) continue;
      if(action==="status"&&/dead to (?:me|you|him|her|them)/i.test(sentence.slice(match.index))) continue;
      if(action==="damage"&&/bleeds? (?:money|secrets|time)\b/i.test(sentence.slice(match.index))) continue;
      hits.push({action,span:match[0]});
    }
  }
  return hits;
}
export function validateNarrativeClaims(db,guildId,result,scope={mode:"party"},{staged=false,eventResults=[]}={}){
  const claims=result.narrative_claims||[];
  if(!Array.isArray(claims)||claims.length>32) deny("claim_budget");
  const narration=[result.narration||"",result.public_narration||"",result.player_summary||"",...(result.private_messages||[]).map(row=>row.content)].join("\n");
  const flags=db.getCityCalendar(guildId).flags;
  const names=flags.semantic_integrity===true||claims.some(claim=>claim?.certainty!=="committed")
    ?[...db.listGuildCharacters(guildId).map(row=>row.name),...db.listNpcProfiles(guildId,{limit:100}).map(row=>row.display_name)]:[];
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
    const audiences=claimAudiences(db,guildId,result,c,scope);
    if(!audiences.length) deny("source_span",c,"A claim span must occur wholly within an actual output surface.");
    if(c.certainty!=="committed"){
      if(materialParaphrases(c.source_span,names).length)deny("uncertainty_framing",c,"Uncertainty in one clause cannot launder a completed consequence in another.");
      if(!/\b(says?|claims?|lies?|rumou?r|might|may|could|seems?|perhaps|imagines?|hallucinates?|like|as if|intends?|proposes?|would|hypothes\w*)\b/i.test(c.source_span)
        &&!contextualEntryAcknowledgement(db,guildId,c,audiences)) deny("uncertainty_framing",c);
      // Non-factual framing does not authorize disclosure of a real secret.
      if(c.action!=="disclosure") continue;
    }
    const entity=c.entity_type==="character"?db.getCharacter(c.entity):c.entity_type==="npc"?db.getSimulationEntity(guildId,"npc",c.entity):null;
    if(entity?.guild_id&&entity.guild_id!==guildId) deny("campaign_isolation",c);
    const state=entity?.state||{};
    const actor=claimActor(db,guildId,c);
    const self=actor.type==="character"&&c.entity_type==="character"&&actor.key===c.entity;
    if(actor.type!=="world"&&!self&&["movement","access","status"].includes(c.action)&&flags.scene_continuity===true
      &&!sceneAccess(db,guildId,{observer_type:actor.type,observer_key:actor.key,target_type:c.entity_type,target_key:c.entity,sense:"sight"}))
      deny("not_witnessed",c,"actual scene access");
    if(c.certainty==="committed"&&((entity?.status&&["dead","retired"].includes(entity.status))||state.removed||["dead","removed"].includes(state.status))
      &&!(c.action==="status"&&[entity?.status,state.status].includes(c.proposed))) deny("inactive_actor",c);
    if(c.action==="dice") deny("model_dice",c);
    if(c.action==="possession"){
      const artifact=db.getHandout(c.source_ref);
      if(!artifact||artifact.guild_id!==guildId||artifact.status!=="active"||!audiences.every(audience=>visible(artifact,audience))
        ||artifact.metadata?.evidence?.original?.holder!==`character:${c.entity}`||c.proposed!==artifact.id)
        deny("uncommitted_possession",c,"native artifact custody");
    }
    if(c.action==="status"&&(!entity||entity.status!==c.proposed&&state.status!==c.proposed)) deny("actor_status",c,"saved lifecycle");
    if(c.entity_type==="npc"&&["dead","removed"].includes(state.status)&&c.proposed==="active") deny("actor_status",c);
    if(c.action==="movement"&&(!entity||String(state.location_key||entity.data?.location||"")!==c.proposed)) deny("uncommitted_movement",c,"saved position");
    if(c.action==="access"){
      const presence=scenePresence(db,guildId,c.entity_type,c.entity),source=presence&&db.getWorldEvent(guildId,presence.source_event);
      if(!entity||String(state.location_key||entity.data?.location||"")!==c.proposed||presence?.location_key!==c.proposed
        ||!source||source.status!=="active"||!["arrival","travel"].includes(source.kind))deny("uncommitted_access",c,"Native arrival/access resolution required.");
    }
    if(["movement","access"].includes(c.action)&&flags.scene_continuity===true){
      const presence=scenePresence(db,guildId,c.entity_type,c.entity);
      if(presence&&!audiences.every(audience=>["public","party"].includes(presence.visibility)
        ||audience.mode==="private"&&(presence.visibility==="character"&&presence.subject_key===audience.actorCharacterId
          ||presence.visibility==="player"&&presence.subject_key===audience.actorUserId)))
        deny("scoped_movement",c,"Private scene presence cannot be disclosed to another audience.");
    }
    if(c.action==="damage"){
      const event=result.events?.[c.mutation_index];
      if(c.entity_type!=="character"||!entity||!event||event.type!=="resource_delta"||event.key!=="hp"
        ||event.target_character_id!==c.entity||String(event.amount)!==c.proposed
        ||(scope.mode==="private"&&scope.actorCharacterId!==c.entity)) deny("uncommitted_damage",c,"PC resource event");
      if(!staged&&String(entity.data?.resources?.hp?.current??"")!==c.prior) deny("stale_prior_state",c,"saved PC resources");
    }
    if(c.action==="disclosure"){
      const receipt=staged&&c.source_ref===`event:${c.mutation_index}`?eventResults[c.mutation_index]:null;
      const fact=db.getFact(guildId,c.source_ref)||(receipt?.ok&&["fact","clue"].includes(receipt.type)?db.getFact(guildId,receipt.id):null);
      if(!fact||fact.archived||c.proposed!==fact.content||!audiences.every(audience=>visible(fact,audience)))
        deny("scoped_disclosure",c,"scoped fact");
      if(!activeEvidence(db,guildId,fact.id)||c.certainty==="committed"&&!objectiveEvidence(db,guildId,fact))
        deny("epistemic_authority",c,"Hypothesis/testimony or retracted ancestry is not objective truth.");
      if(actor.type==="character"&&!visible(fact,{mode:"private",actorUserId:actor.owner,actorCharacterId:actor.key}))
        deny("actor_knowledge",c,"Character-scoped fact");
      if(actor.type==="npc"){
        const ancestry=evidenceType(fact).source_refs;
        const candidates=[...db.npcKnowledgeForFact(guildId,actor.key,fact.id),
          ...db.listNpcKnowledge(guildId,actor.key,{limit:200}).filter(row=>ancestry.includes(row.source_ref))];
        const knowledge=candidates.find(row=>row.content===c.proposed
          &&row.belief_state!=="unknown"&&(c.certainty!=="committed"||row.belief_state==="known"));
        if(!knowledge) deny("actor_knowledge",c,"NPC's own fact key/source reference");
        if(!npcEvidenceActive(db,guildId,actor.key,knowledge.knowledge_key))deny("actor_knowledge",c,"Missing or retracted NPC evidence ancestry");
      }
    }
    if(c.action==="obligation"){
      const row=db.getSimulationRecord(guildId,c.source_ref);
      if(!row||row.kind!=="obligation"||row.status!=="active"||row.data.content!==c.proposed) deny("uncommitted_obligation",c,"existing obligation");
      if(![c.entity,`${c.entity_type}:${c.entity}`].includes(row.data.debtor||row.entity_key))deny("uncommitted_obligation",c,"Obligation belongs to a different debtor.");
      const source=row.data.source_event&&db.getWorldEvent(guildId,row.data.source_event);
      if(!audiences.every(audience=>source?.status==="active"&&visible({...source,subject_user_id:source.subject_key,
        subject_character_id:source.subject_key},audience)||audience.mode==="private"
          &&[row.data.debtor,row.data.creditor].includes(`character:${audience.actorCharacterId}`)
          &&row.data.accepted_by?.includes(audience.actorUserId)))deny("scoped_obligation",c,"Audience-visible commitment or this owner's native accepted terms required.");
    }
    if(c.action==="canon"){
      const row=db.currentCanon(guildId,c.source_ref);
      if(!row||row.value!==c.proposed||!audiences.every(audience=>visible(row,audience))) deny("canon",c,"canon ledger");
    }
  }
  // Conservative local tripwires also catch omitted declarations of common high-risk assertions.
  const risk=/\b(?:you (?:take|suffer) \d+ (?:damage|HP)|(?:teleports?|is now dead|is now bound)|(?:roll(?:ed)? (?:a |an )?\d+))\b/gi;
  for(const match of narration.matchAll(risk)) if(!claims.some(c=>c.source_span.includes(match[0]))) deny("undeclared_material_assertion");
  if(db.getCityCalendar(guildId).flags.semantic_integrity===true){
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
    if(!row?.ok||row.blocked||String(row.before?.current??"")!==claim.prior||Number(row.after?.current)-Number(row.before?.current)!==Number(claim.proposed))
      deny("committed_result_mismatch",claim,"actual resource mutation");
  }
}
