import OpenAI from "openai";
import { summarizeRoster } from "./state.js";

const routerSchema={
  type:"object",
  additionalProperties:false,
  properties:{respond:{type:"boolean"},reason:{type:"string"}},
  required:["respond","reason"]
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
          type:{type:"string",enum:["fact","clue","clock_delta","veil_exposure_delta","resource_delta","thread","relationship","npc_update","location_update","log_only"]},
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
    }
  },
  required:["respond","narration","private_messages","events"]
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

function cleanQuestion(text,botId=""){
  return String(text||"").replaceAll(`<@${botId}>`,"").replaceAll(`<@!${botId}>`,"").trim();
}

export class GMService{
  constructor({db,content,config}){
    this.db=db; this.content=content; this.config=config;
    this.ai=new OpenAI({apiKey:config.openaiKey});
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
    const r=await this.ai.responses.create({
      model:this.config.routerModel,
      input:prompt,
      text:{format:{type:"json_schema",name:"route",strict:true,schema:routerSchema}}
    });
    return JSON.parse(r.output_text).respond;
  }

  buildContext(guildId,actorUserId,messageText,actorAssignmentOverride=null){
    const campaign=this.db.getCampaign(guildId);
    const session=this.db.getActiveSession(guildId);
    const roster=session?this.db.roster(session.id):[];
    const actorAssignment=actorAssignmentOverride ?? (session?this.db.controlledAssignment(session.id,actorUserId):null);
    const npcProxy=actorAssignment?.npc_proxy?this.db.getNpcProxyById(actorAssignment.id):null;
    const actorKnowledgeId=npcProxy?.knowledge_id||actorAssignment?.character_id||null;
    const recent=this.db.recentMessagesFor(guildId,actorUserId,{characterId:actorKnowledgeId,limit:this.config.maxRecentMessages});
    const actorFacts=this.db.factsFor(guildId,actorUserId,{characterId:actorKnowledgeId,includeGM:false,limit:60});
    const gmFacts=this.db.factsFor(guildId,actorUserId,{includeGM:true,limit:100});
    const clocks=this.db.clocksFor(guildId,{includeGM:true});
    const query=[messageText,...recent.slice(-6).map(x=>x.content)].join(" ");
    const chunks=this.content.search(query,this.config.maxContentChunks,{gm:true});
    const constitution=this.content.read("ENGINE/AI_GM_CONSTITUTION.md");
    const multi=this.content.read("ENGINE/MULTIPLAYER_GM_RULES.md");
    const assembly=session?this.db.getAssemblyPlan(session.id):{};
    const partyState=this.db.getPartyState(guildId);
    const currentEncounter=session?this.db.getCurrentEncounter(session.id):null;
    return {
      campaign,session,assembly,party_state:partyState,current_encounter:currentEncounter,
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
      "If CURRENT ENCOUNTER is active, its objective, environment, tier, and adversary composition are authoritative GM state. Do not silently add full adversaries beyond that composition except when an explicitly listed adversary/environment feature summons them. Never reveal Battle Point totals, hidden composition, or unused budget to players.",
      "Daggerheart encounter balance is multiplayer-only in this package. Do not use legacy one-PC/solo encounter assumptions.",
      "Use events for newly established facts/clues, resource consequences, clocks, threads, Veil exposure, and player-known NPC/location reference changes.",
      "For npc_update/location_update: key is the entity's display name and value is a concise PLAYER-SAFE reference summary. Only emit these when the entity or updated fact has actually been learned.",
      "For thread events: status must be active/resolved/failed/dormant; note holds concise player-safe case-board notes.",
      "Do not mark a character dead; death/retirement is a human-controlled lifecycle action.",
      "Respect SESSION assembly_phase. 'assembly' means unrelated PCs may only share an incident and must not be treated as friends/allies by assumption. 'converged' means their immediate objectives overlap but long-term cooperation is still voluntary. 'party' means the current PCs may be treated as an established working group unless fiction says otherwise.",
      "The saved assembly plan is GM-private planning. Never reveal another character's private_hook or hidden reason unless that player shares it or the fiction independently reveals it.",
      "During assembly/convergence, offer reasons to cooperate but never decide that a PC trusts, joins, follows, confesses to, or remains with the group.",
      privateMode
        ?"THIS IS A PRIVATE PLAYER→GM SCENE. Narration is visible only to the acting player. Do not assume anything said/discovered here was shared with the party. New clue/fact/thread/NPC/location knowledge will be automatically scoped to this player/character by the application."
        :"THIS IS A PARTY TABLE SCENE. Public narration is visible to all present players. Do not reveal another player's private knowledge unless it has been explicitly shared in play.",
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
    const r=await this.ai.responses.create(req);
    return JSON.parse(r.output_text);
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
      `Relevant Veiled City references (GM context; protect secrets): ${JSON.stringify(chunks.map(c=>({source:c.file,text:c.body})))}`,
    ].join("\n\n");
    const r=await this.ai.responses.create({
      model:this.config.assemblyModel,
      input:prompt,
      max_output_tokens:this.config.assemblyMaxOutputTokens,
      text:{format:{type:"json_schema",name:"veiled_city_party_assembly",strict:true,schema:assemblySchema}}
    });
    return JSON.parse(r.output_text);
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
      `Relevant setting references: ${JSON.stringify(chunks.map(c=>({source:c.file,text:c.body})))}`,
    ].join("\n\n");
    const r=await this.ai.responses.create({
      model:this.config.assemblyModel,
      input:prompt,
      max_output_tokens:Math.min(this.config.assemblyMaxOutputTokens,700),
      text:{format:{type:"json_schema",name:"veiled_city_arrival",strict:true,schema:arrivalSchema}}
    });
    return JSON.parse(r.output_text);
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
    const r=await this.ai.responses.create({
      model:this.config.npcProxyModel,
      input:prompt,
      max_output_tokens:this.config.npcProxyMaxOutputTokens,
      text:{format:{type:"json_schema",name:"veiled_city_npc_proxy_packet",strict:true,schema:npcProxyPacketSchema}}
    });
    const packet=JSON.parse(r.output_text);
    if(objective?.trim()) packet.current_objective=objective.trim();
    return packet;
  }

  async answerRulesQuestion({guildId,userId,userName,question,characterId=null}){
    const q=cleanQuestion(question);
    const chunks=this.content.search(q,this.config.maxRulesChunks,{gm:false})
      .filter(c=>!c.file.startsWith("GM_PRIVATE"));
    const character=characterId?this.db.getCharacter(characterId):null;
    const prompt=[
      "You are Veilkeeper's low-cost rules desk for a Veiled City Daggerheart campaign.",
      "Answer the rules question directly and concisely. This is NOT a GM scene and MUST NOT advance fiction, mutate state, spend resources, reveal secrets, or invent dice results.",
      "Priority: supplied Veiled City/Daggerheart reference excerpts > explicit campaign house rules > cautious general Daggerheart knowledge.",
      "If the supplied material does not establish the answer, label the uncertain part 'Provisional ruling' and recommend checking the official Daggerheart SRD or human GM rather than pretending certainty.",
      "Never mention or infer GM_PRIVATE content. Never reveal hidden campaign facts.",
      "Prefer 2-6 short sentences. Include relevant mechanical steps when useful.",
      `Asking player: ${userName} (${userId})`,
      `Current player-safe character sheet: ${JSON.stringify(character?.data||null)}`,
      `Player-safe reference excerpts: ${JSON.stringify(chunks.map(c=>({source:c.file,text:c.body})))}`,
      `Question: ${q}`
    ].join("\n\n");
    const r=await this.ai.responses.create({
      model:this.config.rulesModel,
      input:prompt,
      max_output_tokens:this.config.rulesMaxOutputTokens
    });
    const sources=[...new Set(chunks.slice(0,3).map(c=>c.file))];
    return {answer:r.output_text?.trim()||"I couldn't produce a rules answer.",sources};
  }

  async summarizeSession(guildId){
    const s=this.db.getActiveSession(guildId);
    if(!s) return "";
    const transcript=this.db.recentMessages(guildId,160).filter(x=>["public","party"].includes(x.visibility));
    const roster=this.db.roster(s.id);
    const npcProxies=this.db.listNpcProxies(s.id,{statuses:["active","released"]}).map(p=>({npc_name:p.npc_name,controller_user_id:p.discord_user_id,control_level:p.control_level,status:p.status}));
    const encounters=this.db.listEncounters(s.id).map(e=>({encounter_number:e.encounter_number,status:e.status,tier:e.tier,objective:e.objective,environment:e.environment_name}));
    const facts=this.db.factsFor(guildId,"",{includeGM:false,limit:120}).filter(x=>["public","party"].includes(x.visibility));
    const prompt=[
      "Create a PLAYER-SAFE end-of-session recap for Veiled City.",
      "Never include GM-only, player-private, character-private facts, unrevealed motives, hidden clocks, or secrets not shared with the party.",
      "Summarize: major events, discoveries, NPC relationship changes, injuries/resources only when important, unresolved leads, and where the session ended.",
      "Use concise Markdown.",
      `Roster: ${JSON.stringify(summarizeRoster(roster))}`,
      `Guest-controlled NPCs this session: ${JSON.stringify(npcProxies)}`,
      `Combat encounters this session (player-safe objective/environment only): ${JSON.stringify(encounters)}`,
      `Party-safe facts: ${JSON.stringify(facts)}`,
      `Party transcript: ${JSON.stringify(transcript.map(x=>({speaker:x.speaker_name,content:x.content})))}`,
    ].join("\n\n");
    const r=await this.ai.responses.create({model:this.config.summaryModel,input:prompt});
    return r.output_text;
  }
}
