/** Authenticated, private pending roll breakdowns. Native persistence only; preparation never spends PC resources or rolls dice. */
import { createHash } from "node:crypto";
import { personalCharacter } from "./personal-continuity.js";
import { currentScene } from "./scene-continuity.js";
import { requireCitySource } from "./city-core.js";
import { cityAudit, cityKey } from "./city-calendar.js";
import { TRAITS } from "./character-system.js";
import { StateConflictError, UserInputError } from "./errors.js";
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const signed=value=>`${value>=0?"+":""}${value}`;
export const rollRevision=hash;
function sourceActor(db,guild,input){
  if(db.getCityCalendar(guild).flags.roll_requests!==true) throw new StateConflictError("Roll requests are opt-in.");
  const source=requireCitySource(db,guild,input.source_event),session=db.getActiveSession(guild);
  if(source.kind!=="player_declaration"||source.visibility!=="character"||source.subject_key!==input.character_id
    ||source.details.character_id!==input.character_id||source.source_id!==`player:${source.details.author}`
    ||!session||source.session_id!==session.id||source.scene!==currentScene(db,guild).key)
    throw new StateConflictError("A current authenticated owner declaration in this scene is required.");
  return {source,session,pc:personalCharacter(db,guild,source.details.author,input.character_id)};
}
function breakdown(db,guild,input,pc){
  if(!TRAITS.includes(input.trait)||!["action","reaction","attack"].includes(input.kind)
    ||typeof input.adjudication!=="string"||!input.adjudication.trim()||input.adjudication.length>600)
    throw new UserInputError("Adjudicate the relevant trait and roll kind, with a factual reason.");
  const key=Object.keys(pc.data.traits||{}).find(name=>name.toLowerCase()===input.trait.toLowerCase());
  const trait=key===undefined?null:pc.data.traits[key];
  if(trait!==null&&!Number.isSafeInteger(trait)) throw new StateConflictError("Recorded trait is not a verified integer.");
  if(!Array.isArray(input.modifier_keys)||input.modifier_keys.length>20||new Set(input.modifier_keys).size!==input.modifier_keys.length)
    throw new UserInputError("A unique bounded modifier-source list is required.");
  const modifiers=input.modifier_keys.map(id=>{
    const event=requireCitySource(db,guild,id),mod=event.details.roll_modifier;
    if(event.kind!=="roll_adjudication"||event.source_kind!=="gm"||!event.details.human_reviewed
      ||event.visibility!=="character"||event.subject_key!==pc.id||!mod||mod.trait!==input.trait||mod.roll_kind!==input.kind
      ||!["flat","advantage","disadvantage"].includes(mod.kind)||!Number.isSafeInteger(mod.amount)||Math.abs(mod.amount)>20
      ||!mod.name||typeof mod.name!=="string"||mod.name.length>160
      ||!db.searchRulesRulings(guild).some(row=>row.ruling_key===mod.ruling_key))
      throw new StateConflictError("Modifiers require a current character-scoped human adjudication and saved ruling.");
    if(mod.feature) throw new StateConflictError("Feature activation/ownership needs native adjudication; a name alone is not sufficient authority.");
    if(mod.kind!=="flat"&&mod.amount!==1) throw new UserInputError("Each advantage/disadvantage source contributes one source.");
    return {source:id,name:mod.name,kind:mod.kind,amount:mod.amount,ruling_key:mod.ruling_key};
  });
  let difficulty=null;
  if(input.difficulty_source){
    const event=requireCitySource(db,guild,input.difficulty_source),data=event.details.roll_difficulty;
    if(event.kind!=="roll_adjudication"||event.source_kind!=="gm"||!event.details.human_reviewed||!data
      ||data.declaration!==input.source_event||!Number.isSafeInteger(data.value)||data.value<0||data.value>100
      ||event.visibility!=="character"||event.subject_key!==pc.id)
      throw new StateConflictError("Player-visible Difficulty requires an exact human-adjudicated scoped source.");
    difficulty=data.value;
  }
  const unresolved=[...(trait===null?["Relevant trait is missing from the sheet."]:[]),
    ...(input.kind==="attack"?["Active weapon/feature attack provenance requires native adjudication before resolution."]:[])];
  const flat=modifiers.filter(row=>row.kind==="flat").reduce((sum,row)=>sum+row.amount,0);
  return {trait:input.trait,trait_bonus:trait,modifiers,subtotal:trait===null?null:trait+flat,
    advantage:modifiers.filter(row=>row.kind==="advantage").length,
    disadvantage:modifiers.filter(row=>row.kind==="disadvantage").length,difficulty,unresolved};
}
export function prepareRollRequest(db,guild,input,actor,context={}){
  const {source,pc,session}=sourceActor(db,guild,input);
  if(context.scope?.mode==="private"&&(context.scope.actorUserId!==pc.owner_user_id||context.scope.actorCharacterId!==pc.id))
    throw new StateConflictError("Private requests belong only to the current authenticated actor.");
  const values=breakdown(db,guild,input,pc),key=cityKey(`roll:${source.event_key}`);
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,"roll_request",key);
    if(prior) return prior;
    const after=db.saveCityRecord(guild,{kind:"roll_request",key,actor_key:pc.id,visibility:"character",subject_key:pc.id,
      source_event:source.event_key,status:values.unresolved.length?"needs_review":"pending",
      data:{session_id:session.id,scene:source.scene,character_id:pc.id,owner_user_id:pc.owner_user_id,character_name:pc.name,
        attempt:source.details.text,kind:input.kind,adjudication:input.adjudication,breakdown:values,input,
        sheet_fingerprint:hash(pc.data),revision:1,history:[],authority:"Pending only; no dice, expenditure or outcome."}});
    cityAudit(db,guild,"roll_request_prepared",key,null,after,actor);return after;
  });
}
export function formatRollRequest(row){
  const data=row.data,b=data.breakdown,net=b.advantage-b.disadvantage;
  return [`[Pending Daggerheart ${data.kind} roll — ${row.record_key}]`,
    `Actor: ${data.character_name} (<@${data.owner_user_id}>)`, `Attempt: ${data.attempt}`,
    `Trait: ${b.trait} ${b.trait_bonus===null?"PENDING":signed(b.trait_bonus)} [recorded character sheet at preparation]`,
    ...b.modifiers.map(mod=>`${mod.name}: ${mod.kind==="flat"?signed(mod.amount):mod.kind} [saved ruling ${mod.ruling_key}; ${mod.source}; included]`),
    "Experience: not applied; requires the owner's explicit relevant declaration and authorized Hope spend.",
    `Advantage/disadvantage: ${b.advantage}/${b.disadvantage}; cancel one-for-one; ${net===0?"no ordinary d6":`${net>0?"add":"subtract"} one d6`}.`,
    `Subtotal: ${b.subtotal===null?"PENDING":signed(b.subtotal)}`,
    `Formula: Hope d12 + Fear d12 ${b.subtotal===null?"+ pending values":signed(b.subtotal)}${net===0?"":net>0?" + one d6":" - one d6"}.`,
    `Difficulty: ${b.difficulty===null?"not disclosed / awaiting GM adjudication":b.difficulty}`,
    ...b.unresolved.map(reason=>`Pending clarification: ${reason}`),
    `Status: ${row.status}; no dice rolled or resources spent. Revision: ${rollRevision(row)}`,
    "Describe any clarification or intended contribution in your own words."].join("\n");
}
export function pendingRollRequests(db,guild,user){
  const pc=personalCharacter(db,guild,user),session=db.getActiveSession(guild);
  return db.listCityRecords(guild,{kind:"roll_request",actor:pc.id,includeGM:true,limit:100})
    .filter(row=>row.subject_key===pc.id&&row.data.owner_user_id===user&&row.data.session_id===session.id
      &&row.data.scene===currentScene(db,guild).key&&["pending","needs_review"].includes(row.status));
}
/** Retries reuse stored requests; failed private delivery is recoverable through the read-only pending command. */
export async function publishRollRequests(db,guild,mutation,send){
  for(const receipt of mutation.intents||[]){
    if(receipt.status!=="accepted"||receipt.data.intent?.feature!=="roll"||!receipt.data.result) continue;
    const row=db.getCityRecord(guild,"roll_request",receipt.data.result.record_key);
    if(!row) continue;
    personalCharacter(db,guild,row.data.owner_user_id,row.subject_key);
    if(await send(row.data.owner_user_id,formatRollRequest(row),row.data.session_id,row.subject_key)!==true)
      throw new StateConflictError("Request committed; private delivery failed. Retrieve /vc-roll pending; do not repeat the turn.");
  }
}
