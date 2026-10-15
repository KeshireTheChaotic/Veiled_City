/** Local, fail-closed material-claim checks. Claims propose no mutations and never supply dice. */
import { sceneAccess, scenePresence, npcEvidenceActive } from "./scene-continuity.js";
import { objectiveEvidence, activeEvidence, evidenceType } from "./epistemic.js";
import { assertPvpOutput } from "./pvp-authorship.js";
import { candidateNarrative,canQuarantineDisclosure,unattributedChoiceText } from "./pvp-output.js";
import {disclosureFailureReason} from './disclosure-authority.js';
const claimProperties={
  actor:{type:"string"},entity_type:{type:"string",enum:["character","npc","combatant","world"]},entity:{type:"string"},
  action:{type:"string",enum:["damage","movement","access","disclosure","obligation","status","canon","dice","possession"]},
  prior:{type:"string"},proposed:{type:"string"},visibility:{type:"string",enum:["public","party","player","character","gm"]},
  source_ref:{type:"string"},mutation_index:{type:"integer"},
  certainty:{type:"string",enum:["committed","dialogue","rumor","uncertain","forecast","metaphor","intent"]}
};
const claimFields=Object.keys(claimProperties);
const closedClaim=extra=>({type:"object",additionalProperties:false,properties:{...claimProperties,...extra},
  required:[...claimFields,...Object.keys(extra)]});
const separatedClaimSchema=closedClaim({authored_source_span:{type:"string"},output_claim_span:{type:"string",minLength:1}});
const legacyClaimSchema=closedClaim({source_span:{type:"string",minLength:1}});
export const materialClaimSchema={anyOf:[separatedClaimSchema,legacyClaimSchema]};
export const NARRATIVE_CONTRACT="Return narrative_claims for EVERY consequential assertion in narration/private_messages: damage, movement, disclosure, obligations, status, canon, dice. "
  +"Never supply predefined narrative choices, fixed acceptance/decline prompts, A/B/C story answers or scripted PC dialogue. Ask openly. "
  +"Use authored_source_span only for exact player-input evidence and output_claim_span only for the exact claim text on one output surface. Use empty authored_source_span when no human declaration supports the claim. Legacy source_span means output_claim_span only. Stable actor/entity IDs and source_ref identify existing fact/knowledge/canon/obligation evidence. "
  +"actor identifies the observer/speaker: npc:<key>, character:<id>, or empty for GM narration, not an invented NPC. "
  +"A character observing their own saved position needs no NPC witness. An entry declaration alone is not arrival evidence. Create ordinary places/people via world_additions, and arrival/presence via scene_actions before asserting material claims. Atmospheric details need no entity per noun. "
  +"action=status means an existing character/NPC lifecycle, not a generic door, sound or equipment condition. Historical recap text supplies context, not a current lifecycle, repeated event or native consequence receipt. Use current source-grounded GM fiction parts for eligible description; do not manufacture a lifecycle claim for it. "
  +"Separate conversational understanding from authority: resolve ordinary contextual names, pronouns and references using scoped conversation. "
  +"Acknowledging an earlier attempt or clarified destination is not a material state change and needs no movement claim. "
  +"Do not demand a clarification solely because a place is not yet authorized. Ask only when unresolved ambiguity materially affects an action. "
  +"Never infer travel completion, restricted access, encounter resolution, character presence or NPC knowledge from understood intent. "
  +"Disclosure requires an existing audience-visible fact. Narrator/PC knowledge is not NPC knowledge; an NPC additionally needs its own sourced knowledge of that fact. "
  +"Uncertain observations, quoted lies, hallucinations, metaphors, forecasts and intentions must be explicitly framed as such in prose and tagged, not committed facts. "
  +"mutation_index is a matching events index or -1 for already established state. A newly staged fact/clue uses source_ref event:<index>; native receipts supply its actual ID. "
  +"Ordinary new businesses, streets, signs and NPCs are NOT canon-ledger claims. Only existing exact canon keys/values support action=canon; event:<index> is never a canon key. World additions need no human approval absent an authoritative contradiction. "
  +"Never invent dice, PC consent or compensate for a rejected claim. Cosmetic prose needs no claim.";
function deny(category,claim,source="",reasonCode=null){
  const error=new Error(`Narrative integrity rejected ${category}; revise to an explicitly uncommitted intent/uncertainty or use established authorized state.`);
  error.code="NARRATIVE_INTEGRITY";
  error.diagnostic={category,actor:claim?.actor||"",entity:claim?.entity||"",action:claim?.action||"",source,source_ref:claim?.source_ref||"",
    ...(reasonCode?{reason_code:reasonCode}:{}),
    source_span:claim?.output_claim_span||claim?.source_span||"",authored_source_span:claim?.authored_source_span||"",
    recovery:"Inspect authoritative state and ledger; correct the proposal without inventing changes."};
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
function occurrenceCount(text,span){
  let count=0;
  for(let at=String(text||"").indexOf(span);at>=0;at=String(text||"").indexOf(span,at+Math.max(1,span.length)))count++;
  return count;
}
function claimAudiences(db,guild,result,claim,scope){
  const span=claim.source_span,surfaces=[];
  for(const [kind,text,audience] of [
    ["narration",result.narration||"",scope],
    ["public_narration",result.public_narration||"",{mode:"party"}],
    ["player_summary",result.player_summary||"",scope]
  ]) if(occurrenceCount(text,span))surfaces.push({kind,text,audience,count:occurrenceCount(text,span)});
  for(const [index,message] of (result.private_messages||[]).entries()) if(occurrenceCount(message.content,span)){
    if(typeof message.discord_user_id!=="string"||!message.discord_user_id) deny("scoped_disclosure",claim,"Actual private-message recipient required.");
    const session=db.getActiveSession(guild),assignment=session?db.activeAssignment(session.id,message.discord_user_id):null;
    surfaces.push({kind:`private:${index}`,text:message.content,count:occurrenceCount(message.content,span),
      audience:{mode:"private",actorUserId:message.discord_user_id,actorCharacterId:assignment?.character_id||null}});
  }
  if(surfaces.length!==1||surfaces[0].count!==1)deny("output_claim_surface",claim,
    "A claim span must occur exactly once on exactly one published surface.");
  const surface=surfaces[0],privateClaim=["player","character","gm"].includes(claim.visibility);
  if(surface.audience.mode!=="private"&&privateClaim)deny("output_claim_surface",claim,
    "Private claim visibility cannot be attached to a public or party output surface.");
  return [surface.audience];
}
function validClaimShape(value){
  if(!value||typeof value!=="object")return false;
  const fields=Object.keys(value).sort().join(","),legacy=[...claimFields,"source_span"].sort().join(","),
    separated=[...claimFields,"authored_source_span","output_claim_span"].sort().join(",");
  return fields===legacy||fields===separated;
}
function authoredSpanActive(db,guild,claim,scope){
  if(!claim.authored_source_span)return true;
  const key=String(claim.source_ref||"").replace(/^event:/,""),direct=db.getWorldEvent(guild,key);
  const events=direct?[direct]:db.listCityRecords(guild,{kind:"typed_intent",includeGM:true,limit:500})
    .filter(row=>row.data.source_span===claim.authored_source_span).map(row=>db.getWorldEvent(guild,row.source_event)).filter(Boolean);
  return events.some(event=>event.status==="active"&&["player_declaration","authored_turn","ai_gm_input"].includes(event.kind)
    &&String(event.details.raw_text||event.details.text||"").includes(claim.authored_source_span)
    &&(!scope.actorUserId||event.details.author===scope.actorUserId)
    &&(!scope.actorCharacterId||event.details.character_id===scope.actorCharacterId)
    &&db.ownerAuthoredSource(guild,event.event_key,event.details.author));
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
function canonEvidence(db,guild,claim,audiences){
  const row=db.currentCanon(guild,claim.source_ref);
  if(!row||row.value!==claim.proposed||!audiences.every(audience=>visible(row,audience)))
    deny('canon',claim,/^event:\d+$/.test(claim.source_ref)
      ?'event:<index> is a staged event, not an existing canon-ledger key; use ordinary world additions'
      :'canon ledger requires an existing exact audience-visible key and matching value');
}
/** Canon annotations retain their native ledger gate even if other candidate prose will be quarantined. */
export function validateCanonAnnotations(db,guild,result,scope){
  const claims=result.narrative_claims||[];
  if(!Array.isArray(claims)||claims.length>32)deny('claim_budget');
  for(const raw of claims){
    if(!validClaimShape(raw))deny('claim_shape',raw);
    if(raw?.action!=='canon'||raw.certainty!=='committed')continue;
    if(!validClaimShape(raw))deny('claim_shape',raw);
    const claim={...raw,source_span:raw.output_claim_span??raw.source_span};
    canonEvidence(db,guild,claim,claimAudiences(db,guild,result,claim,scope));
  }
}
export function validateNarrativeClaims(db,guildId,result,scope={mode:"party"},{staged=false,eventResults=[]}={}){
  return validateClaims(db,guildId,result,scope,{staged,eventResults},true);
}
/** Private candidate audit only. It validates annotations against native state, never grants publication authority. */
export function validateCandidateClaims(db,guildId,result,scope,eventResults,{output=null}={}){
  if(!(result.narrative_claims||[]).length)return;
  if(!output)return validateClaims(db,guildId,result,scope,{staged:true,eventResults},false);
  // Only an actual native-prepared projection can separate an unpublished annotation
  // from published assertions. A model flag, empty claims or forged output cannot.
  assertPvpOutput(db,guildId,output,scope,{publication:true});
  if(JSON.stringify(candidateNarrative(output))!==JSON.stringify(result))deny('candidate_output_binding');
  const claims=result.narrative_claims;
  if(!Array.isArray(claims)||claims.length>32)deny('claim_budget');
  const diagnostics=[],remaining=[...claims];
  for(let attempt=0;attempt<=claims.length;attempt++){
    try{
      validateClaims(db,guildId,{...result,narrative_claims:remaining},scope,{staged:true,eventResults},false);
      return {ok:true,diagnostics};
    }
    catch(error){
      // status is actor lifecycle, not a generic door/sound/equipment-description
      // handler. These rejected world annotations remain private, never facts.
      if(error.code!=='NARRATIVE_INTEGRITY')throw error;
      const disclosure=error.diagnostic?.category==='scoped_disclosure';
      if(!disclosure&&!['actor_status','uncertainty_framing'].includes(error.diagnostic?.category))throw error;
      const index=remaining.findIndex(raw=>raw?.entity_type==='world'&&raw.action===(disclosure?'disclosure':'status')&&!raw.authored_source_span
        &&raw.entity===error.diagnostic.entity&&raw.actor===error.diagnostic.actor
        &&(raw.output_claim_span??raw.source_span)===error.diagnostic.source_span);
      if(index<0)throw error;
      if(disclosure&&!canQuarantineDisclosure(db,guildId,output,remaining[index],scope,eventResults))throw error;
      diagnostics.push({index:claims.indexOf(remaining[index]),...error.diagnostic});remaining.splice(index,1);
    }
  }
  deny('claim_budget');
}
function validateClaims(db,guildId,result,scope,{staged=false,eventResults=[]},checkOutput){
  const outputAuthority=checkOutput?assertPvpOutput(db,guildId,result,scope):null;
  const claims=result.narrative_claims||[];
  if(!Array.isArray(claims)||claims.length>32) deny("claim_budget");
  const narration=[result.narration||"",result.public_narration||"",result.player_summary||"",...(result.private_messages||[]).map(row=>row.content)].join("\n");
  const flags=db.getCityCalendar(guildId).flags;
  const names=flags.semantic_integrity===true||claims.some(claim=>claim?.certainty!=="committed")
    ?[...db.listGuildCharacters(guildId).map(row=>row.name),...db.listNpcProfiles(guildId,{limit:100}).map(row=>row.display_name)]:[];
  if(flags.natural_language===true||flags.semantic_integrity===true){
    const choiceText=checkOutput?(unattributedChoiceText(db,guildId,result,scope)??narration):narration;
    if(/\b(?:choose|pick|select) (?:one of|from the following|an option)|\b(?:reply|answer|respond) (?:with )?(?:yes or no|accept or decline)\b/i.test(choiceText)
      ||/(?:^|\n)\s*A[).:].*\n\s*B[).:]/i.test(choiceText)) deny("predefined_narrative_choices");
  }
  for(const raw of claims){
    if(!validClaimShape(raw))deny("claim_shape",raw);
    const outputSpan=raw.output_claim_span??raw.source_span,c={...raw,source_span:outputSpan};
    if(claimFields.filter(key=>key!=="mutation_index").some(key=>typeof c[key]!=="string")
      ||raw.authored_source_span!==undefined&&typeof raw.authored_source_span!=="string")deny("claim_shape",c);
    if(!claimProperties.action.enum.includes(c.action)||!claimProperties.certainty.enum.includes(c.certainty)
      ||!claimProperties.visibility.enum.includes(c.visibility)||!claimProperties.entity_type.enum.includes(c.entity_type)
      ||!Number.isInteger(c.mutation_index)) deny("claim_shape",c);
    if(Object.values(c).some(value=>typeof value==="string"&&value.length>1000)||!c.source_span||!narration.includes(c.source_span))
      deny(raw.output_claim_span!==undefined?"output_claim_span":"source_span",c);
    if(raw.authored_source_span!==undefined&&!authoredSpanActive(db,guildId,raw,scope))deny("authored_source_span",c);
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
    if(c.action==="movement"){
      const presence=scenePresence(db,guildId,c.entity_type,c.entity),source=presence&&db.getWorldEvent(guildId,presence.source_event);
      if(!entity||String(state.location_key||entity.data?.location||"")!==c.proposed||presence?.location_key!==c.proposed
        ||!source||source.status!=="active"||!["arrival","travel"].includes(source.kind))
        deny("uncommitted_movement",c,"Native arrival/travel receipt required.");
    }
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
      const reason=disclosureFailureReason(fact,c.proposed,audiences);
      if(reason)deny("scoped_disclosure",c,"scoped fact",reason);
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
      canonEvidence(db,guildId,c,audiences);
    }
  }
  // Independently reconstructed native parts have already checked their complete payload and receipt/audience chain.
  // Their receipt-backed wording need not carry a model annotation; candidate annotations were audited separately.
  if(outputAuthority?.publicationAuthorized===true&&!claims.length)return {ok:true,claims:0,publication_authorized:true};
  // Conservative local tripwires also catch omitted declarations of common high-risk assertions in unprepared candidates.
  const risk=/\b(?:you (?:take|suffer) \d+ (?:damage|HP)|(?:teleports?|is now dead|is now bound)|(?:roll(?:ed)? (?:a |an )?\d+))\b/gi;
  for(const match of narration.matchAll(risk)) if(!claims.some(c=>(c.output_claim_span||c.source_span||"").includes(match[0]))) deny("undeclared_material_assertion");
  if(db.getCityCalendar(guildId).flags.semantic_integrity===true){
    for(const hit of materialParaphrases(narration,names))
      if(!claims.some(c=>c.action===hit.action&&c.certainty==="committed"&&(c.output_claim_span||c.source_span||"").includes(hit.span)))
        deny("unverified_material_paraphrase",null,hit.action);
  }
  return {ok:true,claims:claims.length,publication_authorized:outputAuthority?.publicationAuthorized===true};
}

export function assertNarrativeApplied(result,eventResults){
  for(const claim of result.narrative_claims||[]){
    if(claim.certainty!=="committed"||claim.action!=="damage") continue;
    const row=eventResults[claim.mutation_index];
    if(!row?.ok||row.blocked||String(row.before?.current??"")!==claim.prior||Number(row.after?.current)-Number(row.before?.current)!==Number(claim.proposed))
      deny("committed_result_mismatch",claim,"actual resource mutation");
  }
}
