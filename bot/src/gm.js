/** AI GM service: prompt/context assembly, structured schemas, and model calls. It proposes state; state.js/VeiledDB enforce authority. */
import OpenAI from "openai";
import { summarizeRoster } from "./state.js";
import { narrativeContext } from "./character-narrative.js";
import { validatePostTurnStateReview } from "./director.js";

const routerSchema={
  type:"object",
  additionalProperties:false,
  properties:{respond:{type:"boolean"},reason:{type:"string"}},
  required:["respond","reason"]
};

const handoutDraftSchema={
  type:"object",additionalProperties:false,
  properties:{
    title:{type:"string"},kind:{type:"string"},authority:{type:"string",enum:["canonical","partial","unreliable","illustrative"]},
    canonical_facts:{type:"array",items:{type:"string"}},player_visible_text:{type:"string"},
    visibility:{type:"string",enum:["public","party","player","character","gm"]},target_user_id:{type:"string"},target_character_id:{type:"string"},
    case_key:{type:"string"},npc_key:{type:"string"},location_key:{type:"string"}
  },
  required:["title","kind","authority","canonical_facts","player_visible_text","visibility","target_user_id","target_character_id","case_key","npc_key","location_key"]
};

const relationshipDraftSchema={
  type:"object",additionalProperties:false,
  properties:{
    from_type:{type:"string",enum:["character","npc","faction","location","entity","obligation"]},from_key:{type:"string"},from_label:{type:"string"},
    to_type:{type:"string",enum:["character","npc","faction","location","entity","obligation"]},to_key:{type:"string"},to_label:{type:"string"},
    relationship_type:{type:"string",enum:["trust","debt","fear","hostility","affection","authority","obligation","family","ally","rival","contact","important_person","home","suspicion","protective","other"]},
    mode:{type:"string",enum:["set","delta"]},score:{type:"integer"},visibility:{type:"string",enum:["public","party","character","gm"]},note:{type:"string"}
  },
  required:["from_type","from_key","from_label","to_type","to_key","to_label","relationship_type","mode","score","visibility","note"]
};

const canonProposalDraftSchema={
  type:"object",additionalProperties:false,
  properties:{
    key:{type:"string",minLength:1},
    value:{type:"string",minLength:1},
    visibility:{type:"string",enum:["public","party","gm"]},
    reason:{type:"string"}
  },
  required:["key","value","visibility","reason"]
};

const reviewItemSchema={type:"object",additionalProperties:false,properties:{decision:{type:"string",enum:["changed","no_change"]},reason:{type:"string",minLength:1},confidence:{type:"integer",minimum:0,maximum:100}},required:["decision","reason","confidence"]};
const stateReviewSchema={
  type:"object",additionalProperties:false,
  properties:{
    facts_clues:reviewItemSchema,resources:reviewItemSchema,clocks:reviewItemSchema,threads:reviewItemSchema,references:reviewItemSchema,relationships:reviewItemSchema,handouts:reviewItemSchema,canon:reviewItemSchema,veil_exposure:reviewItemSchema,
    scene:{type:"object",additionalProperties:false,properties:{decision:{type:"string",enum:["continue","transition"]},label:{type:"string"},reason:{type:"string",minLength:1}},required:["decision","label","reason"]}
  },
  required:["facts_clues","resources","clocks","threads","references","relationships","handouts","canon","veil_exposure","scene"]
};

const gmSchema={
  type:"object",
  additionalProperties:false,
  properties:{
    respond:{type:"boolean"},
    narration:{type:"string"},
    private_messages:{
      type:"array",
      items:{
        type:"object", additionalProperties:false,
        properties:{discord_user_id:{type:"string"},content:{type:"string"}},
        required:["discord_user_id","content"]
      }
    },
    events:{
      type:"array",
      items:{
        type:"object", additionalProperties:false,
        properties:{
          type:{type:"string",enum:["fact","clue","clock_delta","veil_exposure_delta","resource_delta","thread","npc_update","location_update","canon","log_only"]},
          key:{type:"string"},
          target_user_id:{type:"string"},
          target_character_id:{type:"string"},
          amount:{type:"integer"},
          value:{type:"string"},
          visibility:{type:"string",enum:["public","party","player","character","gm"]},
          note:{type:"string"},
          status:{type:"string",enum:["","active","resolved","failed","dormant"]}
        },
        required:["type","key","target_user_id","target_character_id","amount","value","visibility","note","status"]
      }
    },
    handouts:{type:"array",items:handoutDraftSchema},
    relationships:{type:"array",items:relationshipDraftSchema},
    canon_proposals:{type:"array",items:canonProposalDraftSchema},
    state_review:stateReviewSchema
  },
  required:["respond","narration","private_messages","events","handouts","relationships","canon_proposals","state_review"]
};


const directorSchema={
  type:"object",additionalProperties:false,
  properties:{
    act:{type:"boolean"},
    public_narration:{type:"string"},
    private_messages:gmSchema.properties.private_messages,
    events:gmSchema.properties.events,
    handouts:{type:"array",items:handoutDraftSchema},
    relationships:{type:"array",items:relationshipDraftSchema},
    gm_notes:{type:"string"},
    confidence:{type:"integer",minimum:0,maximum:100}
  },
  required:["act","public_narration","private_messages","events","handouts","relationships","gm_notes","confidence"]
};

const aftermathSchema={
  type:"object",additionalProperties:false,
  properties:{
    player_summary:{type:"string"},gm_notes:{type:"string"},
    events:gmSchema.properties.events,
    handouts:{type:"array",items:handoutDraftSchema},
    relationships:{type:"array",items:relationshipDraftSchema}
  },
  required:["player_summary","gm_notes","events","handouts","relationships"]
};

const assemblySchema={
  type:"object",
  additionalProperties:false,
  properties:{
    public_opening:{type:"string"},
    convergence_goal:{type:"string"},
    character_entries:{
      type:"array",
      items:{
        type:"object",additionalProperties:false,
        properties:{
          discord_user_id:{type:"string"},
          character_name:{type:"string"},
          private_hook:{type:"string"},
          public_cue:{type:"string"},
          stay_reason:{type:"string"}
        },
        required:["discord_user_id","character_name","private_hook","public_cue","stay_reason"]
      }
    },
    bonds:{
      type:"array",
      items:{
        type:"object",additionalProperties:false,
        properties:{from_character:{type:"string"},to_character:{type:"string"},reason:{type:"string"}},
        required:["from_character","to_character","reason"]
      }
    },
    gm_notes:{type:"string"}
  },
  required:["public_opening","convergence_goal","character_entries","bonds","gm_notes"]
};

const arrivalSchema={
  type:"object",
  additionalProperties:false,
  properties:{
    public_entry:{type:"string"},
    private_hook:{type:"string"},
    connection_reason:{type:"string"},
    gm_note:{type:"string"}
  },
  required:["public_entry","private_hook","connection_reason","gm_note"]
};

const npcProxyPacketSchema={
  type:"object",
  additionalProperties:false,
  properties:{
    npc_name:{type:"string"},
    public_identity:{type:"string"},
    portrayal:{type:"string"},
    current_objective:{type:"string"},
    known_information:{type:"array",items:{type:"string"}},
    relationships:{type:"array",items:{type:"string"}},
    capabilities:{type:"array",items:{type:"string"}},
    limitations:{type:"array",items:{type:"string"}},
    scene_cues:{type:"array",items:{type:"string"}},
    gm_note:{type:"string"}
  },
  required:["npc_name","public_identity","portrayal","current_objective","known_information","relationships","capabilities","limitations","scene_cues","gm_note"]
};


const downtimeSchema={
  type:"object",additionalProperties:false,
  properties:{
    project_results:{type:"array",items:{type:"object",additionalProperties:false,properties:{project_id:{type:"string"},progress_delta:{type:"integer"},status:{type:"string",enum:["active","completed","failed"]},result:{type:"string"}},required:["project_id","progress_delta","status","result"]}},
    world_moves:{type:"array",items:{type:"string"}},
    events:gmSchema.properties.events,
    handouts:{type:"array",items:handoutDraftSchema},
    relationships:{type:"array",items:relationshipDraftSchema},
    summary:{type:"string"}
  },required:["project_results","world_moves","events","handouts","relationships","summary"]
};

const rulesAnswerSchema={
  type:"object",additionalProperties:false,
  properties:{classification:{type:"string",enum:["RAW","VEILED_CITY_HOUSE_RULE","HOMEBREW_CONTENT","GM_RULING","PROVISIONAL_RULING"]},answer:{type:"string"},basis:{type:"string"},sources:{type:"array",items:{type:"string"}}},
  required:["classification","answer","basis","sources"]
};

function cleanQuestion(text,botId=""){
  return String(text||"").replaceAll(`<@${botId}>`,"").replaceAll(`<@!${botId}>`,"").trim();
}

export function parseStructuredJsonText(text,{label="structured response"}={}){
  let raw=String(text??"").trim();
  if(raw.startsWith("```")){
    raw=raw.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim();
  }
  if(!raw){
    const e=new SyntaxError(`${label}: empty structured response.`);
    e.code="STRUCTURED_JSON_EMPTY";
    throw e;
  }
  try{return JSON.parse(raw);}catch(cause){
    const msg=String(cause?.message||cause);
    const looksTruncated=/unexpected end|end of json|unterminated/i.test(msg) || (!/[}\]]\s*$/.test(raw));
    const e=new SyntaxError(`${label}: ${looksTruncated?"response appears truncated or incomplete":"invalid JSON"}. ${msg}`);
    e.code=looksTruncated?"STRUCTURED_JSON_TRUNCATED":"STRUCTURED_JSON_INVALID";
    e.outputLength=raw.length;
    e.cause=cause;
    throw e;
  }
}

export function looksLikeExplicitCanonProposalRequest(text){
  const t=String(text||"").trim();
  if(!/\bcanon(?:ical)?\b/i.test(t)) return false;
  return /\b(?:make|set|establish|declare|record|add|submit|propose|treat|mark)\b[\s\S]{0,100}\b(?:campaign\s+)?canon(?:ical)?\b/i.test(t)
    || /\b(?:as|into)\s+(?:campaign\s+)?canon\b/i.test(t)
    || /\b(?:campaign\s+)?canon\b[\s\S]{0,100}\b(?:inform|tell|notify)\s+(?:the\s+)?gm\b/i.test(t);
}

export class GMService{
  constructor({db,content,config,ai=null}){
    this.db=db; this.content=content; this.config=config;
    this.ai=ai||new OpenAI({apiKey:config.openaiKey});
  }

  async requestStructured(req,{label="structured response"}={}){
    let lastError=null;
    for(let attempt=1;attempt<=2;attempt++){
      const request={...req};
      if(attempt===2){
        const base=Number(req.max_output_tokens||0);
        const retryCap=Number(this.config.structuredRetryMaxTokens||6000);
        request.max_output_tokens=Math.min(retryCap,Math.max(base?base*2:3000,3000));
        request.input=`${String(req.input||"")}

STRUCTURED OUTPUT RETRY: The previous response was malformed or incomplete. Return one COMPLETE JSON object matching the schema. Be concise. Do not use Markdown fences or commentary. Preserve quotation marks and other punctuation from user-provided text as ordinary JSON string content.`;
      }
      const response=await this.ai.responses.create(request);
      try{
        return parseStructuredJsonText(response.output_text,{label});
      }catch(err){
        lastError=err;
        if(attempt===1) continue;
        const reason=response?.incomplete_details?.reason||response?.status||"unknown";
        const final=new Error(`${label} could not be parsed as complete JSON after 2 attempts (${err.code||"JSON_ERROR"}; provider status: ${reason}). If this repeats, increase the relevant *_MAX_OUTPUT_TOKENS setting.`);
        final.code="STRUCTURED_JSON_RETRY_FAILED";
        final.cause=err;
        throw final;
      }
    }
    throw lastError||new Error(`${label}: structured response failed.`);
  }

  async shouldRespond({guildId,message,mode,directMention=false}){
    if(directMention) return true;
    if(mode==="mention") return false;
    const text=message.content.trim();
    const actionish=/^(\*|>|i\b|we\b|my character\b|elias\b|\[[^\]]+\]\s*|[^:\n]{1,60}:\s+)|\?$|^\[[^\]]*gm[^\]]*\]/i.test(text);
    if(mode==="assisted" && !actionish) return false;
    const roster=this.db.roster(this.db.getActiveSession(guildId)?.id||"");
    const prompt=[
      "You route messages for a multiplayer tabletop RPG Discord.",
      "Return respond=true only when the AI GM should act: a player takes an in-world action requiring world reaction, directly addresses an NPC/GM, asks about the environment, makes a consequential roll request, or the world clearly needs to answer.",
      "Rules-only questions belong in the configured rules channel and should not normally interrupt the scene unless they directly affect an action happening now.",
      "Return false for player-to-player banter, planning, jokes, reactions, OOC chatter, or roleplay that needs no world response.",
      "Do not answer the RPG message itself.",
      `Current roster: ${JSON.stringify(summarizeRoster(roster))}`,
      `Message from ${message.member?.displayName||message.author.username}: ${text}`
    ].join("\n");
    const out=await this.requestStructured({
      model:this.config.routerModel,
      input:prompt,
      max_output_tokens:200,
      text:{format:{type:"json_schema",name:"route",strict:true,schema:routerSchema}}
    },{label:"message router"});
    return out.respond;
  }

  buildContext(guildId,actorUserId,messageText,actorAssignmentOverride=null){
    const campaign=this.db.getCampaign(guildId);
    const session=this.db.getActiveSession(guildId);
    const roster=session?this.db.roster(session.id):[];
    const actorAssignment=actorAssignmentOverride ?? (session?this.db.controlledAssignment(session.id,actorUserId):null);
    const npcProxy=actorAssignment?.npc_proxy?this.db.getNpcProxyById(actorAssignment.id):null;
    const actorKnowledgeId=npcProxy?.knowledge_id||actorAssignment?.character_id||null;
    const recent=this.db.recentMessagesFor(guildId,actorUserId,{characterId:actorKnowledgeId,limit:this.config.maxRecentMessages});
    const actorFacts=this.db.playerFactsFor(guildId,actorUserId,{characterId:actorKnowledgeId,limit:60});
    const gmFacts=this.db.factsFor(guildId,actorUserId,{includeGM:true,limit:100});
    const clocks=this.db.clocksFor(guildId,{includeGM:true});
    const query=[messageText,...recent.slice(-6).map(x=>x.content)].join(" ");
    const chunks=this.content.search(query,this.config.maxContentChunks,{gm:true});
    const constitution=this.content.read("ENGINE/AI_GM_CONSTITUTION.md");
    const multi=this.content.read("ENGINE/MULTIPLAYER_GM_RULES.md");
    const assembly=session?this.db.getAssemblyPlan(session.id):{};
    const partyState=this.db.getPartyState(guildId);
    const currentEncounter=session?this.db.getCurrentEncounter(session.id):null;
    const currentCombatants=currentEncounter?.status==="active"?this.db.listCombatants(currentEncounter.id,{includeRemoved:true}):[];
    const canon=this.db.listCanon(guildId,{includeGM:true,limit:120});
    const rulings=this.db.searchRulesRulings(guildId,messageText);
    const actorRelationships=this.db.listRelationships(guildId,{includeGM:false,characterId:actorKnowledgeId,userId:actorUserId});
    const gmRelationships=this.db.listRelationships(guildId,{includeGM:true});
    const gmCharacterHooks=roster.filter(r=>r.character_id).flatMap(r=>this.db.listCharacterGmHooks(guildId,r.character_id).map(h=>({character_id:r.character_id,character_name:r.name,key:h.hook_key,title:h.title,type:h.hook_type,premise:h.premise,permission:h.permission,suggested_entry:h.suggested_entry,payload:h.payload})));
    const narrativeIds=[...new Set([...roster.map(r=>r.character_id).filter(Boolean),actorKnowledgeId].filter(Boolean))];
    const characterNarratives=narrativeContext(this.db,guildId,narrativeIds,{includeGM:true,maxChars:8000});
    const visibleHandouts=this.db.listHandoutsFor(guildId,actorUserId,{characterId:actorKnowledgeId,includeGM:false,limit:40}).map(h=>({id:h.id,title:h.title,kind:h.kind,authority:h.authority,visibility:h.visibility,case_key:h.case_key,npc_key:h.npc_key,location_key:h.location_key}));
    return {
      campaign,session,assembly,party_state:partyState,current_encounter:currentEncounter,current_combatants:currentCombatants,canon,rulings,actor_relationships:actorRelationships,gm_relationships:gmRelationships,gm_character_hooks:gmCharacterHooks,character_narratives:characterNarratives,visible_handouts:visibleHandouts,
      actor_assignment:actorAssignment?(actorAssignment.npc_proxy?{
        assignment_kind:"npc_proxy",controller_user_id:actorUserId,npc_proxy_id:actorAssignment.id,
        npc_name:actorAssignment.npc_name,knowledge_id:actorAssignment.knowledge_id,control_level:actorAssignment.control_level,
        control_policy:actorAssignment.control_policy,player_packet:actorAssignment.player_packet
      }:{controller_user_id:actorUserId,owner_user_id:actorAssignment.discord_user_id,character_id:actorAssignment.character_id,character_name:actorAssignment.name,control_policy:actorAssignment.control_policy}):null,
      active_npc_proxies:session?this.db.listNpcProxies(session.id,{statuses:["active"]}).map(p=>({npc_name:p.npc_name,controller_user_id:p.discord_user_id,control_level:p.control_level})):[],
      roster:summarizeRoster(roster),
      recent:recent.map(m=>({speaker:m.speaker_name,user_id:m.discord_user_id,visibility:m.visibility,subject_user_id:m.subject_user_id,character_id:m.character_id,content:m.content})),
      actor_visible_facts:actorFacts,
      gm_all_facts:gmFacts,
      clocks,
      reference_chunks:chunks.map(c=>({source:c.file,text:c.body})),
      constitution,multi
    };
  }

  async runTurn({guildId,actorUserId,actorName,messageText,actorAssignment=null,scope="party"}){
    const ctx=this.buildContext(guildId,actorUserId,messageText,actorAssignment);
    const privateMode=scope==="private";
    const instructions=[
      ctx.constitution,
      ctx.multi,
      "\n# RUNTIME SECURITY",
      "GM-private facts/clocks/reference content may be used to simulate the world but MUST NOT appear in narration until legitimately discovered.",
      "PLAYER visibility applies only to target_user_id. CHARACTER visibility applies to target_character_id and persists with that character even if the human later changes PCs.",
      "Never choose voluntary actions, dialogue, beliefs, resource spends, or secrets for a player-controlled character.",
      "Absent/offscreen PCs do not appear. background_safe PCs may be atmospherically present but cannot make choices, spend resources, roll, reveal secrets, take avoidable damage, or solve problems. proxy PCs are controlled only by the named human proxy.",
      "An active NPC proxy is a human-controlled NPC. Do not choose that NPC's voluntary dialogue, tactics, bargains, movement, or decisions while the proxy is active. React to the proxy player's declared actions as GM and adjudicate consequences normally.",
      "NPC proxy knowledge is LIMITED to the sanitized player_packet, NPC-scoped facts visible in ACTING PLAYER facts, and information the NPC legitimately observes during play. Never reveal additional GM-private motives, mystery answers, faction plans, clocks, or abilities merely because the human controls an antagonist.",
      "Control levels: portrayal = dialogue/personality only unless the GM invites more; tactical = dialogue plus movement, listed abilities and tactical choices; full_npc = all voluntary decisions of that NPC only. None grants co-GM authority or omniscience.",
      "Never use resource_delta to represent damage/resources on an NPC proxy. PC resource_delta remains valid when an NPC's action affects a player character; NPC consequences should be narrated or logged through GM state.",
      "The application, not you, rolls dice. Never invent a dice result. Ask for a roll narratively when required.",
      "If CURRENT ENCOUNTER is active, its objective, environment, tier, adversary composition, COMBATANT STATE, and spotlight counts are authoritative GM state. Do not silently change HP, Stress, conditions, status, or add full adversaries outside deterministic state. Ask/use bot mechanics to update them. Never reveal Battle Point totals, hidden composition, or unused budget to players.",
      "Daggerheart final/SRD 2.0 has no mandatory action tracker or initiative. Spotlight counts are a fairness aid only; never enforce them as turns. Campaign Fear in CAMPAIGN STATE is authoritative and capped at 12.",
      "Daggerheart encounter balance is multiplayer-only in this package. Do not use legacy one-PC/solo encounter assumptions.",
      "Use events for newly established facts/clues, resource consequences, clocks, threads, Veil exposure, player-known NPC/location reference changes, and durable canon.",
      "Use relationships for durable changes between characters, NPCs, factions, locations, obligations, or other entities. Relationship score ranges -5 to +5; delta changes an existing score, set establishes it. Do not manufacture emotional commitments for PCs.",
      "Imported GM-only character hook proposals are optional seeds, not authoritative truth. Use them only when they fit established canon and current fiction; never reveal a proposed hidden answer merely because it exists in the hook list. Canon suggestions remain suggestions until the human GM promotes them to the canon ledger.",
      "CHARACTER NARRATIVES are supplemental freeform context. PLAYER narrative is player-safe character prose; GM_PRIVATE narrative is secret GM context. Structured character JSON controls mechanics/resources, and the canon ledger controls durable world truth when narrative prose conflicts with either. Never expose GM_PRIVATE narrative until discovered in play.",
      "Use handouts only when the fiction produces an actual piece of evidence or artifact worth preserving. First list canonical_facts, then render player_visible_text from only those facts plus deliberately unreliable/illustrative framing. Do not add hidden canon accidentally through decorative details.",
      "Handout authority: canonical=deliberately shown details are true; partial=genuine but incomplete/uncertain; unreliable=may be forged/corrupted/lying; illustrative=visual/text aid whose incidental details are not canon.",
      "For canon events: key must be a stable normalized concept (example npc.mara-voss.surname or location.hollow-street.access-rule); value is the newly established durable fact. The application will refuse silent contradictions and queue a GM conflict instead.",
      "CANON LEDGER is authoritative. Never contradict a current canon value. If new fiction appears to conflict, avoid resolving the contradiction in narration and let the application queue it for the human GM.",
      "SAVED GM RULINGS have precedence over model memory for campaign-specific interpretations unless the human GM changes them.",
      "For npc_update/location_update: key is the entity's display name and value is a concise PLAYER-SAFE reference summary. Only emit these when the entity or updated fact has actually been learned.",
      "For thread events: status must be active/resolved/failed/dormant; note holds concise player-safe case-board notes.",
      "Do not mark a character dead; death/retirement is a human-controlled lifecycle action.",
      "Respect SESSION assembly_phase. 'assembly' means unrelated PCs may only share an incident and must not be treated as friends/allies by assumption. 'converged' means their immediate objectives overlap but long-term cooperation is still voluntary. 'party' means the current PCs may be treated as an established working group unless fiction says otherwise.",
      "The saved assembly plan is GM-private planning. Never reveal another character's private_hook or hidden reason unless that player shares it or the fiction independently reveals it.",
      "During assembly/convergence, offer reasons to cooperate but never decide that a PC trusts, joins, follows, confesses to, or remains with the group.",
      privateMode
        ?[
          "THIS IS A PRIVATE PLAYER→GM SCENE. Narration is visible only to the acting player.",
          "Do not assume anything said or discovered here was shared with the party.",
          "New clue/fact/thread/NPC/location knowledge and clock changes are automatically isolated to this player/character.",
          "resource_delta may target only the acting character. Do not emit veil_exposure_delta or a canon event from a private scene.",
          "When the player explicitly asks to establish/record campaign canon or submit it for GM approval, put that claim in canon_proposals instead.",
          "Use one proposal per independent claim with a stable normalized key, exact intended durable value, requested visibility, and concise reason.",
          "A canon proposal is not a canon-ledger mutation, so state_review.canon remains no_change unless an actual canon event was emitted (which is forbidden here).",
          "Never claim in narration that a proposal was recorded, approved, or delivered to the GM; the application sends deterministic confirmation after commit.",
          "Any private_messages must target only the acting player's Discord user ID."
        ].join(" ")
        :"THIS IS A PARTY TABLE SCENE. Public narration is visible to all present players. Do not reveal another player's private knowledge unless it has been explicitly shared in play. private_messages may target only players on the current session roster. canon_proposals must be an empty array; the player canon-proposal workflow is reserved for private player→GM scenes.",
      "canon_proposals is a GM-review queue, not authoritative canon. Never use it for speculative ideas or ordinary discoveries; use it only for an explicit player request to propose a durable canon statement from a private scene.",
      "MANDATORY POST-TURN STATE REVIEW: before returning, explicitly review facts/clues, PC resources, clocks, threads, references, relationships, handouts, canon, Veil Exposure, and scene continuity. Every category must be marked changed or no_change with a concrete reason and a confidence score from 0-100. If marked changed, emit the matching structured mutation; if no mutation is emitted, mark no_change. A canon_proposals entry does not count as a canon change. Never hide a mechanical consequence only in prose. Confidence below 55 means the proposed change is ambiguous enough that Veilkeeper should avoid committing it and instead preserve it in rationale/GM-visible context for review.",
      "For scene continuity, choose transition only when fictional location, objective, time frame, or dramatic scene boundary actually changes. Provide a short new-scene label when transitioning; otherwise use continue with an empty label.",
      "Keep narration suitable for Discord. Prefer 1-4 compact paragraphs unless a longer scene is genuinely needed."
    ].join("\n\n");
    const input=[
      `CAMPAIGN STATE:\n${JSON.stringify(ctx.campaign)}`,
      `SESSION:\n${JSON.stringify(ctx.session)}`,
      `ASSEMBLY PLAN (GM-PRIVATE; protect per-character hooks):\n${JSON.stringify(ctx.assembly)}`,
      `ESTABLISHED PARTY STATE:\n${JSON.stringify(ctx.party_state)}`,
      `CURRENT ENCOUNTER (GM-PRIVATE; do not expose BP math/composition unless learned in fiction):\n${JSON.stringify(ctx.current_encounter)}`,
      `ACTING CHARACTER/NPC ASSIGNMENT:\n${JSON.stringify(ctx.actor_assignment)}`,
      `ACTIVE HUMAN-CONTROLLED NPC PROXIES:\n${JSON.stringify(ctx.active_npc_proxies)}`,
      `ROSTER/PRESENCE:\n${JSON.stringify(ctx.roster)}`,
      `RECENT TRANSCRIPT VISIBLE TO THIS PLAYER:\n${JSON.stringify(ctx.recent)}`,
      `FACTS VISIBLE TO ACTING PLAYER:\n${JSON.stringify(ctx.actor_visible_facts)}`,
      `GM-PRIVATE + ALL KNOWN FACTS:\n${JSON.stringify(ctx.gm_all_facts)}`,
      `CLOCKS (MAY BE SECRET):\n${JSON.stringify(ctx.clocks)}`,
      `RELATIONSHIP GRAPH VISIBLE TO ACTOR:\n${JSON.stringify(ctx.actor_relationships)}`,
      `GM RELATIONSHIP GRAPH (MAY BE SECRET):\n${JSON.stringify(ctx.gm_relationships)}`,
      `IMPORTED GM-ONLY CHARACTER HOOK PROPOSALS (OPTIONAL; DO NOT REVEAL DIRECTLY):\n${JSON.stringify(ctx.gm_character_hooks)}`,
      `FREEFORM CHARACTER NARRATIVES (PLAYER + GM_PRIVATE; PROTECT GM_PRIVATE):\n${JSON.stringify(ctx.character_narratives)}`,
      `KNOWN HANDOUT/EVIDENCE INDEX VISIBLE TO ACTOR:\n${JSON.stringify(ctx.visible_handouts)}`,
      `RELEVANT VEILED CITY REFERENCE:\n${JSON.stringify(ctx.reference_chunks)}`,
      `CURRENT PLAYER INPUT:\nuser_id=${actorUserId}\nname=${actorName}\nscope=${scope}\n${messageText}`
    ].join("\n\n---\n\n");
    const req={
      model:this.config.gmModel,
      instructions,
      input,
      text:{format:{type:"json_schema",name:"veiled_city_gm_turn",strict:true,schema:gmSchema}}
    };
    if(this.config.reasoningEffort) req.reasoning={effort:this.config.reasoningEffort};
    const validateTurn=(result)=>{
      validatePostTurnStateReview(result);
      const proposals=Array.isArray(result?.canon_proposals)?result.canon_proposals:[];
      const attemptedCanon=(result?.events||[]).some(e=>e?.type==="canon");
      if(privateMode && looksLikeExplicitCanonProposalRequest(messageText)){
        if(!result?.respond) throw new Error("The player explicitly requested a campaign-canon proposal, but the GM turn was marked respond=false.");
        if(!proposals.length && !attemptedCanon) throw new Error("The player explicitly requested a campaign-canon proposal, but no canon_proposals entry or canon attempt was emitted.");
      }
      if(!privateMode && proposals.length) throw new Error("Party-table GM turns may not emit player canon_proposals.");
      return true;
    };
    let result=await this.requestStructured(req,{label:"GM turn"});
    try{ validateTurn(result); return result; }
    catch(err){
      const retry={...req,input:`${input}\n\nSTRUCTURED TURN CORRECTION: The prior response failed required state/proposal consistency: ${String(err.message||err)}. Return a complete replacement response. Every state-review category must agree exactly with mutations. If this private player explicitly requested campaign canon, emit canon_proposals; do not claim application-side recording or notification in narration.`};
      result=await this.requestStructured(retry,{label:"GM turn state-review retry"});
      validateTurn(result);
      return result;
    }
  }

  async runWorldDirector({guildId,layer,trigger={},cycle=null,projects=[],actorAssignment=null}){
    if(!["round","scene","downtime","manual"].includes(layer)) throw new Error(`Unsupported world-director layer: ${layer}`);
    const directorActor=trigger?.scope==="private"&&trigger?.actor_user_id?String(trigger.actor_user_id):"__world_director__";
    const ctx=this.buildContext(guildId,directorActor,`${layer} ${JSON.stringify(trigger)}`,actorAssignment);
    const layerRules={
      round:[
        "END-OF-PLAYER-ROUND DIRECTOR PASS. This is a pacing cadence, never initiative. Do not restrict player actions or mention rounds unless fiction itself uses them.",
        "Make at most one meaningful offscreen/world response: advance justified pressure, let an NPC/faction react, tick an existing clock, expose a consequence, or do nothing.",
        "Do not create noise merely because the pass fired. If no world move is warranted, return act=false with empty outputs."
      ],
      scene:[
        "SCENE-TRANSITION DIRECTOR PASS. The prior player turn crossed a real scene boundary.",
        "Reconcile offscreen NPC/faction positioning, clocks, consequences of leaving/arriving, and newly relevant pressure for the new scene. Do not replay the transition already narrated.",
        "Prefer continuity and consequences over surprise twists. Return act=false if nothing additional should move."
      ],
      downtime:[
        "EXTENDED IN-GAME MECHANICAL DOWNTIME DIRECTOR PASS. This is triggered only by an explicit fictional/mechanical downtime interval, never by real-world elapsed time.",
        "Advance factions, threats, obligations, investigations, and clocks proportionally to the fictional duration/opportunity represented by the downtime cycle.",
        "Do not punish players merely for taking downtime. Use established motives, clocks, canon, and opportunities. Return act=false if the world reasonably remains stable."
      ],
      manual:[
        "MANUAL GM-REQUESTED WORLD DIRECTOR PASS. A human GM explicitly requested a one-time review of whether the world should move now.",
        "Use the supplied reason as context, but do not manufacture change merely because the command was invoked.",
        "Return act=false with empty outputs when no justified move follows from established campaign state."
      ]
    }[layer];
    const prompt=[
      ctx.constitution,ctx.multi,"# AUTONOMOUS WORLD DIRECTOR",...layerRules,
      "You may autonomously emit the same authoritative campaign events, relationships, handouts, private_messages, and player-facing narration available to the normal GM, subject to all security/canon/player-agency restrictions.",
      "Never invent dice results or alter deterministic encounter combat state. Never choose voluntary PC actions. Never contradict canon. Use private_messages only for information a specific current player legitimately perceives.",
      "Return confidence 0-100 for the proposed world move as a whole. If confidence is below 55, return act=false with empty outputs and explain the ambiguity in gm_notes instead of committing a speculative world mutation.",
      trigger?.scope==="private"?"PRIVATE SCENE DIRECTOR: this scene transition is visible only to the acting player. Treat public_narration as a transport field that the application will deliver privately. Do not emit global canon or Veil Exposure changes; private-scope guards will block them and report the attempt.":"PARTY/WORLD DIRECTOR: public_narration may be posted to the party when there is a player-visible world consequence.",
      `Layer: ${layer}`,`Trigger: ${JSON.stringify(trigger)}`,`Campaign: ${JSON.stringify(ctx.campaign)}`,`Session: ${JSON.stringify(ctx.session)}`,`Director state: ${JSON.stringify(ctx.session?this.db.getDirectorState(ctx.session.id):null)}`,
      `Roster: ${JSON.stringify(ctx.roster)}`,`Recent party transcript: ${JSON.stringify(this.db.recentPartyMessages(guildId,{limit:50}))}`,`Actor-visible recent transcript (includes private context only when this is a private-scene director pass): ${JSON.stringify(ctx.recent)}`,`Actor-visible facts: ${JSON.stringify(ctx.actor_visible_facts)}`,`Facts (GM-private/all): ${JSON.stringify(ctx.gm_all_facts)}`,`Clocks: ${JSON.stringify(ctx.clocks)}`,`Canon: ${JSON.stringify(ctx.canon)}`,`Relationships: ${JSON.stringify(ctx.gm_relationships)}`,
      `Current encounter: ${JSON.stringify(ctx.current_encounter)}`,`Downtime cycle: ${JSON.stringify(cycle)}`,`Downtime projects: ${JSON.stringify(projects)}`,`Reference: ${JSON.stringify(ctx.reference_chunks)}`
    ].join("\n\n");
    const req={model:layer==="downtime"?this.config.downtimeModel:this.config.gmModel,input:prompt,max_output_tokens:layer==="downtime"?this.config.downtimeMaxOutputTokens:Math.min(this.config.structuredRetryMaxTokens||6000,2200),text:{format:{type:"json_schema",name:`world_director_${layer}`,strict:true,schema:directorSchema}}};
    if(this.config.reasoningEffort) req.reasoning={effort:this.config.reasoningEffort};
    return this.requestStructured(req,{label:`world director ${layer}`});
  }

  async planAssembly({guildId,mode=null}){
    const session=this.db.getActiveSession(guildId);
    if(!session) throw new Error("No active session.");
    const requested=mode||session.assembly_mode||"auto";
    if(requested==="manual") throw new Error("This session uses manual assembly; no AI convergence plan will be generated.");
    if(requested==="already_together"){
      return {public_opening:"",convergence_goal:"Established party resumes play.",character_entries:[],bonds:[],gm_notes:"No convergence scene required."};
    }
    const roster=this.db.roster(session.id).filter(r=>["present","guest","late"].includes(r.presence) && r.character_id);
    if(roster.length<2) throw new Error("At least two present characters are required to generate a convergence scene.");
    const partyState=this.db.getPartyState(guildId);
    const facts=this.db.factsFor(guildId,"",{includeGM:true,limit:120});
    const importedHooks=roster.filter(r=>r.character_id).flatMap(r=>this.db.listCharacterGmHooks(guildId,r.character_id).map(h=>({character_id:r.character_id,character_name:r.name,title:h.title,type:h.hook_type,premise:h.premise,permission:h.permission,suggested_entry:h.suggested_entry,payload:h.payload})));
    const narratives=narrativeContext(this.db,guildId,roster.map(r=>r.character_id).filter(Boolean),{includeGM:true,maxChars:6000});
    const query=roster.map(r=>`${r.name} ${JSON.stringify(r.data||{})}`).join(" ");
    const chunks=this.content.search(`party convergence ${requested} ${query}`,Math.min(this.config.maxContentChunks,6),{gm:true});
    const prompt=[
      "You are Veilkeeper's multiplayer party-convergence planner.",
      "Create ONE credible Veiled City opening that gives every present character an independent reason to enter the same situation.",
      "Do not assume unrelated PCs already know, trust, like, or work for one another. Do not choose any PC's dialogue, thoughts, promises, or decision to join.",
      "Use each character's background, Home, Person, Obligation, Opening Status, goals, unresolved incident, GM hooks, faction connections, entry hooks, notes, and existing campaign facts when present.",
      "The convergence should progress from ASSEMBLY (same incident) toward CONVERGED (overlapping immediate objectives). The players decide whether it becomes a lasting PARTY.",
      "Prefer crossed cases/shared incident in investigative urban fantasy unless the requested mode says otherwise.",
      "Each character gets a private_hook containing only information that character could know at scene start. public_cue is what others can visibly perceive about their arrival, without revealing secrets.",
      "stay_reason is an opportunity/reason for continued cooperation, not a compulsory motivation.",
      "Bonds are proposed practical connections such as 'A knows something B needs'; they are not emotional commitments.",
      "Do not reveal mystery solutions, GM-only truths, hidden motives, or future twists in public_opening/private_hook.",
      `Requested assembly mode: ${requested}`,
      `Session: ${JSON.stringify(session)}`,
      `Previously established party state: ${JSON.stringify(partyState)}`,
      `Present roster: ${JSON.stringify(summarizeRoster(roster))}`,
      `Known campaign facts (GM context; protect secrets): ${JSON.stringify(facts)}`,
      `Imported GM-only character hook proposals (optional seeds; protect secrets): ${JSON.stringify(importedHooks)}`,
      `Freeform character narratives (player + GM-private; protect GM-private): ${JSON.stringify(narratives)}`,
      `Relevant Veiled City references (GM context; protect secrets): ${JSON.stringify(chunks.map(c=>({source:c.file,text:c.body})))}`,
    ].join("\n\n");
    return this.requestStructured({
      model:this.config.assemblyModel,
      input:prompt,
      max_output_tokens:this.config.assemblyMaxOutputTokens,
      text:{format:{type:"json_schema",name:"veiled_city_party_assembly",strict:true,schema:assemblySchema}}
    },{label:"party assembly plan"});
  }

  async planArrival({guildId,userId,characterId,reason="late arrival"}){
    const session=this.db.getActiveSession(guildId);
    if(!session) throw new Error("No active session.");
    const character=this.db.getCharacter(characterId);
    if(!character) throw new Error("Character not found.");
    const roster=this.db.roster(session.id);
    const partyState=this.db.getPartyState(guildId);
    const plan=this.db.getAssemblyPlan(session.id)||{};
    const recent=this.db.recentMessages(guildId,40).filter(x=>["public","party"].includes(x.visibility)).slice(-18);
    const facts=this.db.factsFor(guildId,userId,{characterId,includeGM:true,limit:80});
    const importedHooks=this.db.listCharacterGmHooks(guildId,characterId).map(h=>({title:h.title,type:h.hook_type,premise:h.premise,permission:h.permission,suggested_entry:h.suggested_entry,payload:h.payload}));
    const narratives=narrativeContext(this.db,guildId,[characterId],{includeGM:true,maxChars:8000});
    const query=`arrival ${character.name} ${reason} ${JSON.stringify(character.data||{})}`;
    const chunks=this.content.search(query,Math.min(this.config.maxContentChunks,4),{gm:true});
    const prompt=[
      "You are Veilkeeper's drop-in character entry planner.",
      "Create a plausible entry for ONE late, guest, replacement, or newly selected character into an ongoing Veiled City scene.",
      "Never retcon that the character was present all along unless the existing fiction explicitly supports it.",
      "Do not choose the arriving PC's dialogue, feelings, trust, commitments, or voluntary actions.",
      "public_entry should present an opening/circumstance the player can respond to; do not make the character automatically walk in, agree, attack, reveal a secret, or join the party.",
      "private_hook tells only that player why their character is at/near the scene or what they know. It must not contain another PC's private information.",
      "connection_reason explains to the GM why this arrival can plausibly intersect the current group.",
      `Arrival reason: ${reason}`,
      `Session: ${JSON.stringify(session)}`,
      `Current assembly plan: ${JSON.stringify(plan)}`,
      `Established party: ${JSON.stringify(partyState)}`,
      `Arriving character: ${JSON.stringify({id:character.id,name:character.name,data:character.data})}`,
      `Current roster: ${JSON.stringify(summarizeRoster(roster))}`,
      `Recent party transcript: ${JSON.stringify(recent.map(x=>({speaker:x.speaker_name,content:x.content})))}`,
      `Known facts (GM context; protect secrets): ${JSON.stringify(facts)}`,
      `Imported GM-only hook proposals for this character (optional seeds; protect secrets): ${JSON.stringify(importedHooks)}`,
      `Freeform character narrative for this character (player + GM-private; protect GM-private): ${JSON.stringify(narratives)}`,
      `Relevant setting references: ${JSON.stringify(chunks.map(c=>({source:c.file,text:c.body})))}`,
    ].join("\n\n");
    return this.requestStructured({
      model:this.config.assemblyModel,
      input:prompt,
      max_output_tokens:Math.min(this.config.assemblyMaxOutputTokens,700),
      text:{format:{type:"json_schema",name:"veiled_city_arrival",strict:true,schema:arrivalSchema}}
    },{label:"character arrival plan"});
  }

  async createNpcProxyPacket({guildId,userId,npcName,controlLevel="tactical",objective="",gmNotes=""}){
    const session=this.db.getActiveSession(guildId);
    if(!session) throw new Error("No active session.");
    const allFacts=this.db.factsFor(guildId,userId,{includeGM:true,limit:180}).filter(f=>["public","party","gm"].includes(f.visibility));
    const publicRef=this.db.getReference(guildId,"npc",String(npcName||"").trim().toLowerCase());
    const query=`NPC antagonist proxy ${npcName} ${objective} ${gmNotes}`;
    const chunks=this.content.search(query,Math.min(this.config.maxContentChunks,8),{gm:true});
    const recent=this.db.recentMessages(guildId,80).filter(m=>["public","party"].includes(m.visibility)).slice(-24);
    const prompt=[
      "You prepare a SANITIZED player-facing NPC proxy packet for Veiled City.",
      "A guest human will temporarily portray/control one NPC antagonist. The player is NOT a co-GM and must receive only information this NPC is allowed to know/use plus details necessary to portray them fairly.",
      "You may consult GM-private context to understand the NPC, but aggressively compartmentalize it. Omit mystery solutions, future scenes, unrelated NPC secrets, hidden faction strategy, secret clocks, and any GM knowledge this NPC would not possess.",
      "If a hidden motive/objective belongs to this NPC and is necessary for the guest to portray them, it MAY be included. Do not include secrets merely because they are interesting.",
      "Do not invent major powers, resources, relationships, or hidden truths that are not supported by supplied context. If information is uncertain, keep the packet conservative and say so in gm_note, which is GM-only and will not be sent to the player.",
      "The packet's capabilities must be concise and player-operable; do not expose raw unrevealed stat blocks unless needed for the selected control level.",
      "portrayal control: provide personality, voice, knowledge, objective, and social cues; mechanics/tactics remain GM-run.",
      "tactical control: also provide the listed combat/tactical capabilities the guest may choose among; Veilkeeper still adjudicates mechanics and dice.",
      "full_npc control: provide enough sanitized information for all voluntary decisions of this NPC, but no authority over other NPCs, PCs, clocks, world truth, or GM narration.",
      `NPC requested: ${npcName}`,
      `Control level: ${controlLevel}`,
      `Human GM objective override (authoritative when nonblank): ${objective||"none"}`,
      `Human GM notes (GM-only source; sanitize before output): ${gmNotes||"none"}`,
      `Player-safe NPC reference if any: ${JSON.stringify(publicRef||null)}`,
      `Campaign facts (mixed visibility; use only what this NPC should know): ${JSON.stringify(allFacts)}`,
      `Recent transcript (mixed visibility; protect private information): ${JSON.stringify(recent.map(x=>({speaker:x.speaker_name,visibility:x.visibility,content:x.content})))}`,
      `Relevant Veiled City source excerpts (GM context; sanitize): ${JSON.stringify(chunks.map(c=>({source:c.file,text:c.body})))}`
    ].join("\n\n");
    const packet=await this.requestStructured({
      model:this.config.npcProxyModel,
      input:prompt,
      max_output_tokens:this.config.npcProxyMaxOutputTokens,
      text:{format:{type:"json_schema",name:"veiled_city_npc_proxy_packet",strict:true,schema:npcProxyPacketSchema}}
    },{label:"NPC proxy packet"});
    if(objective?.trim()) packet.current_objective=objective.trim();
    return packet;
  }

  async answerRulesQuestion({guildId,userId,userName,question,characterId=null}){
    const q=cleanQuestion(question);
    const chunks=this.content.search(q,this.config.maxRulesChunks,{gm:false}).filter(c=>!c.file.startsWith("GM_PRIVATE"));
    const character=characterId?this.db.getCharacter(characterId):null;
    const rulings=this.db.searchRulesRulings(guildId,q);
    const classify=(file)=>{
      if(file==="ENGINE/DAGGERHEART_MULTIPLAYER_CORE.md"||file==="PLAYER/QUICK_REFERENCE.md"||file==="ENGINE/MULTIPLAYER_ENCOUNTER_GUIDE.md") return "RAW-DERIVED";
      if(file.startsWith("CARDS/")) return "VEILED CITY HOMEBREW";
      if(file.startsWith("PLAYER/")||file.startsWith("ENGINE/")) return "VEILED CITY HOUSE RULE";
      return "PLAYER-SAFE REFERENCE";
    };
    const excerpts=chunks.map(c=>({source:c.file,authority:classify(c.file),text:c.body}));
    const prompt=[
      "You are Veilkeeper's low-cost rules desk for a Veiled City Daggerheart campaign.",
      "Return a structured answer classified as exactly one of RAW, VEILED_CITY_HOUSE_RULE, HOMEBREW_CONTENT, GM_RULING, or PROVISIONAL_RULING.",
      "Authority order: saved human GM rulings for this campaign > supplied RAW-derived Daggerheart SRD 2.0 material > explicit Veiled City house rules > Veiled City homebrew card text > provisional ruling.",
      "If two sources conflict, call that out and follow the higher-authority source. Never use GM_PRIVATE material.",
      "RAW means the supplied SRD-derived material directly establishes the result. Do not label something RAW merely because you remember it from training.",
      "If the excerpts do not establish the answer, use PROVISIONAL_RULING and say what needs human-GM/SRD confirmation.",
      "This is NOT a GM scene: do not advance fiction, spend resources, mutate state, or reveal secrets.",
      `Saved GM rulings: ${JSON.stringify(rulings)}`,
      `Asking player: ${userName} (${userId})`,
      `Current player-safe character sheet: ${JSON.stringify(character?.data||null)}`,
      `Player-safe reference excerpts: ${JSON.stringify(excerpts)}`,
      `Question: ${q}`
    ].join("\n\n");
    const out=await this.requestStructured({model:this.config.rulesModel,input:prompt,max_output_tokens:this.config.rulesMaxOutputTokens,text:{format:{type:"json_schema",name:"rules_answer",strict:true,schema:rulesAnswerSchema}}},{label:"rules answer"});
    const retrieved=[...new Set(chunks.slice(0,4).map(c=>`${classify(c.file)}: ${c.file}`))];
    return {...out,sources:out.sources?.length?out.sources:retrieved};
  }

  async generateHandout({guildId,userId=null,characterId=null,title,kind="document",facts,authority="canonical",visibility="party",caseKey="",npcKey="",locationKey=""}){
    const factList=Array.isArray(facts)?facts:String(facts||"").split(/\n|;/).map(x=>x.trim()).filter(Boolean);
    if(!factList.length) throw new Error("At least one canonical/source fact is required to generate a handout.");
    const chunks=this.content.search(`evidence handout ${kind} ${title} ${factList.join(" ")}`,Math.min(this.config.maxContentChunks,4),{gm:true});
    const prompt=[
      "Generate one concise Veiled City player-facing evidence handout.",
      "The supplied fact list is authoritative input. Do not invent additional hidden facts, names, dates, symbols, relationships, or conclusions unless they are explicitly contained in those facts.",
      "The artifact may contain ambiguity appropriate to its authority classification, but ambiguity must not create new canon.",
      "Write the artifact itself, not commentary about how to generate it. Modern formats should feel plausible: report, email, call log, transcript, memo, note, technical log, evidence card, etc.",
      `Title: ${title}`,
      `Kind: ${kind}`,
      `Authority: ${authority}`,
      `Visibility: ${visibility}`,
      `Canonical/source facts: ${JSON.stringify(factList)}`,
      `Links: ${JSON.stringify({caseKey,npcKey,locationKey})}`,
      `Relevant setting style references: ${JSON.stringify(chunks.map(c=>({source:c.file,text:c.body})))}`
    ].join("\n\n");
    const out=await this.requestStructured({model:this.config.handoutModel,input:prompt,max_output_tokens:this.config.handoutMaxOutputTokens,text:{format:{type:"json_schema",name:"veiled_city_handout",strict:true,schema:handoutDraftSchema}}},{label:"evidence handout"});
    return {...out,title:title||out.title,kind:kind||out.kind,authority,visibility,target_user_id:userId||out.target_user_id||"",target_character_id:characterId||out.target_character_id||"",case_key:caseKey||out.case_key||"",npc_key:npcKey||out.npc_key||"",location_key:locationKey||out.location_key||"",canonical_facts:factList};
  }

  async buildEncounterAftermath({guildId,encounter}){
    const session=this.db.getSession(encounter.session_id);
    const combatants=this.db.listCombatants(encounter.id,{includeRemoved:true});
    const roster=this.db.roster(encounter.session_id).filter(r=>r.character_id);
    const recent=this.db.recentMessages(guildId,100).filter(m=>m.session_id===encounter.session_id).slice(-40);
    const relationships=this.db.listRelationships(guildId,{includeGM:true});
    const narratives=narrativeContext(this.db,guildId,roster.map(r=>r.character_id).filter(Boolean),{includeGM:true,maxChars:5000});
    const facts=this.db.factsFor(guildId,"",{includeGM:true,limit:100});
    const clocks=this.db.clocksFor(guildId,{includeGM:true});
    const prompt=[
      "Build a concise post-encounter aftermath proposal for Veiled City.",
      "The deterministic combat state is authoritative. Do not retroactively change adversary defeat/escape status or PC resources.",
      "Compare pc_start_state with current roster resources to summarize important resource changes; do not emit duplicate resource_delta events for changes already recorded.",
      "Propose only downstream consequences justified by the transcript and encounter: evidence recovered, witnesses/casualties, Veil Exposure, faction clocks, new/changed relationships, NPC/location reference updates, threads, or durable canon.",
      "Handouts may be proposed for actual evidence recovered. Their canonical_facts must be explicitly supported by the encounter/transcript/facts; do not invent mystery answers.",
      "player_summary must be safe to post to the party. gm_notes may mention hidden implications.",
      `Encounter: ${JSON.stringify(encounter)}`,
      `Combatants: ${JSON.stringify(combatants)}`,
      `PC resources at start: ${JSON.stringify(encounter.pc_start_state||[])}`,
      `Current roster/resources: ${JSON.stringify(summarizeRoster(roster))}`,
      `Recent transcript: ${JSON.stringify(recent.map(m=>({speaker:m.speaker_name,visibility:m.visibility,content:m.content})))}`,
      `Facts: ${JSON.stringify(facts)}`,
      `Clocks: ${JSON.stringify(clocks)}`,
      `Relationships: ${JSON.stringify(relationships)}`,
      `Freeform character narratives (supplemental; GM-private must remain secret): ${JSON.stringify(narratives)}`,
      `Session: ${JSON.stringify(session)}`
    ].join("\n\n");
    return this.requestStructured({model:this.config.aftermathModel,input:prompt,max_output_tokens:this.config.aftermathMaxOutputTokens,text:{format:{type:"json_schema",name:"veiled_city_aftermath",strict:true,schema:aftermathSchema}}},{label:"encounter aftermath"});
  }

  async resolveDowntime({guildId,cycle,projects}){
    const facts=this.db.factsFor(guildId,"",{includeGM:true,limit:120});
    const clocks=this.db.clocksFor(guildId,{includeGM:true});
    const canon=this.db.listCanon(guildId,{includeGM:true,limit:120});
    const narratives=narrativeContext(this.db,guildId,[...new Set(projects.map(p=>p.character_id).filter(Boolean))],{includeGM:true,maxChars:5000});
    const chunks=this.content.search(`downtime ${projects.map(p=>`${p.project_type} ${p.title} ${p.objective}`).join(" ")}`,this.config.maxContentChunks,{gm:true});
    const prompt=[
      "Resolve a formal between-session Veiled City downtime cycle.",
      "Only resolve projects submitted in this cycle. Respect Daggerheart downtime/project rules and established campaign canon.",
      "Recovery projects should follow the explicit Daggerheart rest mechanics in the supplied rules; do not grant arbitrary healing.",
      "Investigation, crafting, ritual, relationship, income, surveillance, research, and other projects should advance proportionally and may create costs/complications.",
      "This pass resolves PLAYER PROJECTS ONLY. Set world_moves to an empty array. A separate autonomous downtime world-director pass handles faction/world movement after you return.",
      "Return state events only for facts that genuinely become established as direct consequences of submitted downtime projects.",
      "Relationship projects should update the structured relationship graph when a durable relationship change is actually established. Evidence recovered during downtime may produce handouts, using only established facts.",
      "Project visibility is authoritative. The summary must be GM-safe and concise; do not assume private project results are party knowledge. Public delivery is handled by the application.",
      `Cycle: ${JSON.stringify(cycle)}`,
      `Projects: ${JSON.stringify(projects)}`,
      `Canon: ${JSON.stringify(canon)}`,
      `Facts: ${JSON.stringify(facts)}`,
      `Clocks: ${JSON.stringify(clocks)}`,
      `Freeform character narratives for project owners (supplemental; protect GM-private): ${JSON.stringify(narratives)}`,
      `Reference: ${JSON.stringify(chunks.map(c=>({source:c.file,text:c.body})))}`
    ].join("\n\n");
    return this.requestStructured({model:this.config.downtimeModel,input:prompt,max_output_tokens:this.config.downtimeMaxOutputTokens,text:{format:{type:"json_schema",name:"downtime_resolution",strict:true,schema:downtimeSchema}}},{label:"downtime resolution"});
  }

  async summarizeSession(guildId){
    const s=this.db.getActiveSession(guildId);
    if(!s) return "";
    const transcript=this.db.recentMessages(guildId,160).filter(x=>["public","party"].includes(x.visibility));
    const roster=this.db.roster(s.id);
    const npcProxies=this.db.listNpcProxies(s.id,{statuses:["active","released"]}).map(p=>({npc_name:p.npc_name,controller_user_id:p.discord_user_id,control_level:p.control_level,status:p.status}));
    const encounters=this.db.listEncounters(s.id).map(e=>({encounter_number:e.encounter_number,status:e.status,tier:e.tier,objective:e.objective,environment:e.environment_name}));
    const facts=this.db.playerFactsFor(guildId,"",{limit:120}).filter(x=>["public","party"].includes(x.visibility));
    const handouts=this.db.listSessionPublicHandouts(guildId,s.id);
    const prompt=[
      "Create a PLAYER-SAFE end-of-session recap for Veiled City.",
      "Never include GM-only, player-private, character-private facts, unrevealed motives, hidden clocks, or secrets not shared with the party.",
      "Summarize: major events, discoveries, NPC relationship changes, injuries/resources only when important, unresolved leads, and where the session ended.",
      "Use concise Markdown.",
      `Roster: ${JSON.stringify(summarizeRoster(roster))}`,
      `Guest-controlled NPCs this session: ${JSON.stringify(npcProxies)}`,
      `Combat encounters this session (player-safe objective/environment only): ${JSON.stringify(encounters)}`,
      `Party-safe facts: ${JSON.stringify(facts)}`,
      `Evidence/handouts discovered this session: ${JSON.stringify(handouts)}`,
      `Party transcript: ${JSON.stringify(transcript.map(x=>({speaker:x.speaker_name,content:x.content})))}`,
    ].join("\n\n");
    const r=await this.ai.responses.create({model:this.config.summaryModel,input:prompt});
    return r.output_text;
  }
}
