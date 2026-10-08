/** Descriptive pacing and source-linked mystery routes; no new PC mechanics, dice or mutable truth store. */
import { cityObject, cityKey, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { cityVisibility } from "./city-calendar.js";
import { personalCharacter } from "./personal-continuity.js";
import { stateRevision } from "./ai-intents.js";
import { motivationKey } from "./simulation-motivation.js";
export function setPacingCues(db,guildId,input,actorId){
  if(input?.op==="setup") return manageNarrativeSetup(db,guildId,input,actorId);
  cityObject(input);requireCitySource(db,guildId,input.source_event);
  const session=db.getActiveSession(guildId);if(!session) throw new Error("Active session required for scene cues.");
  const fields=["stakes","dramatic_question","objective","pressure","unresolved_beats"];
  const data={session_id:session.id,scene:db.getDirectorState(session.id).scene_label};
  for(const field of fields){if(typeof input[field]!=="string"||input[field].length>500) throw new Error("Bounded descriptive scene cues required.");data[field]=input[field];}
  data.pause_background=input.pause_background===true;data.allow_transition=input.allow_transition!==false;
  const key=`scene:${session.id}`,before=db.getCityRecord(guildId,"pacing",key);
  return db.transaction(()=>{const after=db.saveCityRecord(guildId,{kind:"pacing",key,source_event:input.source_event,data});
    cityAudit(db,guildId,"pacing_cues",key,before,after,actorId);return after;});
}
export function manageNarrativeSetup(db,guild,input,actor){
  cityObject(input);if(db.getCityCalendar(guild).flags.narrative_setups!==true) throw new Error("Narrative setups are opt-in.");
  if(Object.keys(input).some(key=>!["op","action","key","source_event","text","visibility","subject_key","anchor_key","expected_revision","replacement_key"].includes(key)))
    throw new Error("Closed sourced setup operation required; no canon rewriting.");
  const key=cityKey(input.key),before=db.getCityRecord(guild,"story_setup",key);
  if(input.action==="record"&&before) return before;
  const source=requireCitySource(db,guild,input.source_event);
  if(input.action==="record"){
    if(typeof input.text!=="string"||!input.text.trim()||input.text.length>600) throw new Error("Bounded sourced setup text required.");
    const boundary=cityVisibility(db,guild,input.visibility||source.visibility,input.subject_key||source.subject_key);
    if(boundary.visibility!=="gm"&&!['public','party'].includes(source.visibility)
      &&(boundary.visibility!==source.visibility||boundary.subject_key!==source.subject_key)) throw new Error("Private omens/setups cannot be broadened without actual disclosure.");
    const anchor=input.anchor_key?db.currentCanon(guild,input.anchor_key):null;if(input.anchor_key&&!anchor) throw new Error("Existing fixed canon anchor required.");
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{kind:"story_setup",key,status:"open",source_event:source.event_key,...boundary,
        data:{text:input.text,anchor_key:input.anchor_key||"",anchor_value:anchor?.value||null,history:[],authority:"Sourced unresolved setup, not a guaranteed outcome or culprit."}});
      cityAudit(db,guild,"setup_recorded",key,null,after,actor);return after;
    });
  }
  if(!before||before.status!=="open"||stateRevision(before)!==input.expected_revision||!["resolve","abandon","supersede"].includes(input.action))
    throw new Error("Current open setup and explicit lifecycle review required.");
  if(input.action==="supersede"&&(input.replacement_key===key||db.getCityRecord(guild,"story_setup",input.replacement_key)?.status!=="open")) throw new Error("Explicit distinct open replacement setup required.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{...before,key,status:{resolve:"resolved",abandon:"abandoned",supersede:"superseded"}[input.action],
      data:{...before.data,history:[...before.data.history,{source_event:source.event_key,action:input.action,reviewed_by:actor}],replacement_key:input.replacement_key||null}});
    cityAudit(db,guild,"setup_closed",key,before,after,actor);return after;
  });
}
export function suggestSetupPayoff(db,guild,input,actor){
  if(db.getCityCalendar(guild).flags.narrative_setups!==true) throw new Error("Narrative setups are opt-in.");
  const row=db.getCityRecord(guild,"story_setup",input.setup_key),pc=db.getCharacter(input.character_id);
  if(row?.status!=="open"||row.source_event!==input.source_event||pc?.guild_id!==guild||!pc.owner_user_id) throw new Error("Existing open sourced setup and active campaign character required.");
  personalCharacter(db,guild,pc.owner_user_id,pc.id);const origin=requireCitySource(db,guild,row.source_event);
  if(!["public","party"].includes(origin.visibility)&&!(origin.visibility==="character"&&origin.subject_key===pc.id)
    &&!(origin.visibility==="player"&&origin.subject_key===pc.owner_user_id)
    &&!(origin.kind==="authored_speech"&&origin.details.character_id===pc.id&&origin.details.author===pc.owner_user_id))
    throw new Error("Target character has not legitimately witnessed/learned this setup's source.");
  if(row.visibility==="character"&&row.subject_key!==pc.id||row.visibility==="player"&&row.subject_key!==pc.owner_user_id) throw new Error("Private setup belongs to another participant.");
  if(row.data.anchor_key&&db.currentCanon(guild,row.data.anchor_key)?.value!==row.data.anchor_value) throw new Error("Mystery anchor changed; request human reconciliation without rewriting truth.");
  const choice=requireCitySource(db,guild,input.choice_source);
  if(choice.source_id!==`player:${pc.owner_user_id}`||!(choice.kind==="authored_speech"&&choice.details.character_id===pc.id
    ||choice.kind==="player_statement"&&choice.subject_key===pc.id)) throw new Error("Payoff proposal needs an actual authored choice/statement, not inferred PC intent.");
  if(typeof input.suggestion!=="string"||!input.suggestion.trim()||input.suggestion.length>600) throw new Error("Bounded optional development required.");
  const key=`payoff:${motivationKey([row.record_key,pc.id,choice.event_key])}`,prior=db.getCityRecord(guild,"setup_payoff",key);if(prior) return prior;
  return db.saveCityRecord(guild,{kind:"setup_payoff",key,status:"pending",source_event:row.source_event,data:{setup:row.record_key,character:pc.id,choice_source:choice.event_key,
    suggestion:input.suggestion,proposed_by:actor,authority:"GM-private optional proposal, not a completed payoff, NPC knowledge, PC choice, culprit or canon."}});
}
export function pacingAdvice(db,guildId,message=""){
  const session=db.getActiveSession(guildId),scene=session?db.getDirectorState(session.id):null;
  const saved=session?db.getCityRecord(guildId,"pacing",`scene:${session.id}`):null;
  const cues=saved?.data.scene===scene?.scene_label?saved?.data:null;
  const counts={};for(const row of db.recentPartyMessages(guildId,{limit:20})) counts[row.discord_user_id]=(counts[row.discord_user_id]||0)+1;
  const eligible=session?db.roster(session.id).filter(row=>["present","late","guest"].includes(row.presence)):[];
  return {scene:scene?.scene_label||"",cues,least_recently_heard:eligible.map(row=>({user:row.discord_user_id,count:counts[row.discord_user_id]||0}))
    .sort((a,b)=>a.count-b.count),suggested_mode:/^(?:ooc\b|\(\(|to (?:the other|[a-z]+ player)\b)/i.test(message)?"silence":"answer_if_needed",
    guidance:"Descriptive only. Preserve player dialogue; no mandatory threat/cliffhanger/combat or scene change. Spotlight is opportunity, never initiative."};
}
export function validatePacing(db,guildId,result){
  if(db.getCityCalendar(guildId).flags.pacing!==true) return;
  const advice=pacingAdvice(db,guildId),text=result.narration||result.public_narration||"";
  if(text.length>3000) throw new Error("Pacing: shorten narration to preserve PC spotlight.");
  if(advice.cues?.allow_transition===false&&result.state_review?.scene.decision==="transition") throw new Error("Pacing: current scene is held open by GM cues.");
  const last=db.recentPartyMessages(guildId,{limit:8}).filter(row=>row.speaker_name==="Veilkeeper").at(-1);
  const ending=text.trim().split(/[.!?]\s+/).at(-1);
  if(ending&&ending.length>30&&last?.content.trim().endsWith(ending)) throw new Error("Pacing: repeated ending; preserve continuity without repeating a cliffhanger.");
}
export function configureMystery(db,guildId,input,actorId){
  cityObject(input);const key=cityKey(input.key);requireCitySource(db,guildId,input.source_event);
  const anchor=db.currentCanon(guildId,cityKey(input.anchor_key));if(!anchor) throw new Error("An existing fixed canon anchor is required.");
  const before=db.getCityRecord(guildId,"mystery",key);
  if(before&&(before.data.anchor_key!==input.anchor_key||before.data.anchor_value!==anchor.value)) throw new Error("Mystery truth cannot be rewritten through clue configuration.");
  if(!Array.isArray(input.routes)||input.routes.length<3||input.routes.length>12) throw new Error("Three to twelve independent clue routes required.");
  const keys=new Set(),facts=new Set(),methods=new Set();
  for(const route of input.routes){
    cityKey(route.key);cityKey(route.method);
    const fact=db.getFact(guildId,route.fact_id);if(!fact||fact.archived) throw new Error("Clue route needs an existing active sourced fact.");
    if(route.witness&&db.getNpcKnowledge(guildId,route.witness,route.information_key||"")?.content!==fact.content) throw new Error("Witness does not know the cited clue.");
    keys.add(route.key);facts.add(route.fact_id);methods.add(route.method);
  }
  if(keys.size!==input.routes.length||facts.size<3||methods.size<3) throw new Error("Clue routes must be independent, not aliases for one locked clue.");
  if(input.hypotheses&&!Array.isArray(input.hypotheses)) throw new Error("Hypotheses must be a list of subjective interpretations.");
  const hypotheses=(input.hypotheses||[]).slice(0,8).map(h=>({text:cityKey(h),status:"unverified"}));
  const data={anchor_key:input.anchor_key,anchor_value:anchor.value,routes:input.routes,hypotheses,unresolved_question:cityKey(input.question)};
  return db.transaction(()=>{const after=db.saveCityRecord(guildId,{kind:"mystery",key,source_event:input.source_event,data});
    cityAudit(db,guildId,"mystery_routes",key,before,after,actorId);return after;});
}
export function mysteryView(db,guildId,key,{userId="",characterId="",gm=false}={}){
  const row=db.getCityRecord(guildId,"mystery",key);if(!row) throw new Error("Mystery not found.");
  const visible=new Set(db.contextFacts(guildId,{scope:gm?"gm":"character",userId,characterId,limit:50}).map(f=>f.id));
  // Fetch individually before inclusion, so an old clue is not lost to a recent-row limit.
  const routes=row.data.routes.flatMap(route=>{
    const fact=db.getFact(guildId,route.fact_id);
    const allowed=gm||fact&&(["party","public"].includes(fact.visibility)||(fact.visibility==="player"&&fact.subject_user_id===userId)
      ||(fact.visibility==="character"&&fact.subject_character_id===characterId));
    return fact&&!fact.archived&&(allowed||visible.has(fact.id))?[{key:route.key,method:route.method,fact_id:fact.id,content:fact.content,
      source:fact.source,confidence:fact.confidence,authority:fact.category==="rumor"?"unverified":"established evidence, not necessarily interpretation"}]:[];
  });
  return {key,question:gm?row.data.unresolved_question:"Investigate known evidence",routes,
    ...(gm?{anchor:db.currentCanon(guildId,row.data.anchor_key),hypotheses:row.data.hypotheses}:{}),
    guidance:"An unsuccessful check changes timing, clarity, risk or route, never the fixed solution or all essential paths."};
}
export function recordMysteryAttempt(db,guildId,input,actorId){
  cityObject(input);const key=cityKey(input.key),prior=db.getCityRecord(guildId,"clue_attempt",key);if(prior) return prior;
  requireCitySource(db,guildId,input.source_event);
  const mystery=db.getCityRecord(guildId,"mystery",input.mystery),roll=db.getSavedRoll(guildId,input.roll_id);
  if(!mystery||!roll||roll.roll_type!=="duality"||roll.character_id!==input.character_id) throw new Error("Existing character action roll and mystery required; model dice are not accepted.");
  if(!Number.isInteger(input.difficulty)||input.difficulty<0||input.difficulty>100) throw new Error("GM-adjudicated Difficulty required.");
  if(db.currentCanon(guildId,mystery.data.anchor_key)?.value!==mystery.data.anchor_value) throw new Error("Anchor changed under human review; reconcile this mystery explicitly.");
  const view=mysteryView(db,guildId,input.mystery,{characterId:input.character_id,userId:roll.discord_user_id});
  if(!view.routes.some(route=>route.key===input.route)||!view.routes.length) throw new Error("Actor needs a legitimately accessible clue route.");
  const success=roll.payload.duality==="Critical"||roll.payload.total>=input.difficulty;
  const data={mystery:input.mystery,route:input.route,roll_id:roll.id,character_id:input.character_id,success,
    complication:success?"none":"clarity_or_timing_requires_adjudication",viable_routes:view.routes.map(route=>route.key),
    no_automatic_mechanics:true,anchor_unchanged:true};
  return db.transaction(()=>{const after=db.saveCityRecord(guildId,{kind:"clue_attempt",key,source_event:input.source_event,data});
    cityAudit(db,guildId,"mystery_attempt",key,null,after,actorId);return after;});
}
