/** Conservative free-form mechanical declarations. Authenticated exact text authorizes only its current request; ambiguity never spends. */
import { createHash } from "node:crypto";
import { personalCharacter } from "./personal-continuity.js";
import { currentScene } from "./scene-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { rollRevision, pendingRollRequests, formatRollRequest, publishRollAmendment } from "./roll-requests.js";
import { contributeRoll, adjudicateRollSource } from "./roll-collaboration.js";
import { StateConflictError } from "./errors.js";
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
export function rollDeclaration(text){
  const exact=String(text||"").trim();
  if(!exact||exact.length>2000||/^(?:ooc|\(\(|\/\/)|\b(?:if I|I might|I would|I could|hypothetically|suppose I)\b/i.test(exact)) return null;
  let match=/^I spend 1 Hope to help (.+?) by (.+)$/i.exec(exact);
  if(match) return {op:"help",target:match[1].trim(),description:exact,pay_hope:true};
  match=/^I spend 1 Hope to use (?:my )?(.+?) Experience (?:on this roll )?by (.+)$/i.exec(exact);
  if(match) return {op:"experience",experience:match[1].trim(),description:exact,pay_hope:true};
  match=/^I spend 3 Hope to (?:initiate |start )?Tag Team with (.+?) by (.+)$/i.exec(exact);
  if(match) return {op:"tag",target:match[1].trim(),description:exact,pay_hope:true};
  match=/^I (?:join|participate in) the Tag Team by (.+)$/i.exec(exact);
  if(match) return {op:"participate",description:exact};
  if(/^I roll(?: (?:my|the) (?:pending )?(?:roll|request))?\.?$/i.test(exact)) return {op:"roll"};
  if(/^I roll (?:my )?damage\.?$/i.test(exact)) return {op:"damage"};
  match=/^I (?:choose|use) (.+?)(?:'s|’s) (?:roll|result) for both(?: actions)?\.?$/i.exec(exact);
  if(match) return {op:"select",target:match[1].trim()};
  match=/^I (?:choose|use) (physical|magic) damage for (?:our|the) Tag Team\.?$/i.exec(exact);
  if(match) return {op:"damage-type",damage_type:match[1].toLowerCase()};
  return null;
}
/** Human review acts on the owner's persisted exact preauthorization, never on a model-supplied user or consent boolean. */
export function reviewRollDeclaration(db,guild,input,reviewer,context={}){
  if(!reviewer||reviewer==="ai_policy") throw new StateConflictError("Human feasibility/rules review required.");
  const source=requireCitySource(db,guild,input.source_event),a=source.details.authorization;
  if(source.kind!=="roll_contribution"||source.source_id!==`player:${source.details.author}`||!a
    ||source.visibility!=="character"||source.subject_key!==source.details.character_id)
    throw new StateConflictError("An authenticated captured owner authorization is required.");
  const pc=personalCharacter(db,guild,source.details.author,source.subject_key);
  if(context.scope?.mode==="private"&&(context.scope.actorUserId!==pc.owner_user_id||context.scope.actorCharacterId!==pc.id))
    throw new StateConflictError("Private contribution belongs only to its actual author.");
  return db.transaction(()=>{
  const proof=adjudicateRollSource(db,guild,{key:`roll-proof:${hash(source.event_key)}`,character_id:pc.id,kind:"participation",ruling_key:input.ruling_key,
    data:{request:a.request,character_id:pc.id,kind:a.op,description:a.description,experience:a.experience||""}},reviewer);
  return contributeRoll(db,guild,pc.owner_user_id,{...a,proof:proof.event_key});
  });
}
export async function routeRollMessage({db,message,text=message.content,characterId,deliver,sendAmendment}){
  const guild=message.guild.id,flags=db.getCityCalendar(guild).flags;
  if(flags.natural_language!==true||flags.roll_collaboration!==true||!characterId||!message.id||message.author.bot) return false;
  const parsed=rollDeclaration(text);if(!parsed) return false;
  let row,committed=false;
  try{
    const pc=personalCharacter(db,guild,message.author.id,characterId),session=db.getActiveSession(guild);
    const own=pendingRollRequests(db,guild,message.author.id),scene=currentScene(db,guild).key;
    let matches=own;
    if(parsed.op==="help") matches=db.currentRollRequests(guild,session.id,scene).filter(item=>item.data.character_name.toLowerCase()===parsed.target.toLowerCase());
    if(parsed.op==="participate") matches=own.filter(item=>item.status==="awaiting_partner"&&item.data.tag?.partner_user===pc.owner_user_id);
    if(parsed.op==="roll") matches=own.filter(item=>item.status==="pending");
    if(parsed.op==="damage") matches=own.filter(item=>item.status==="awaiting_damage");
    if(parsed.op==="select") matches=own.filter(item=>item.status==="awaiting_selection");
    if(parsed.op==="damage-type") matches=own.filter(item=>item.status==="awaiting_damage_type");
    if(matches.length!==1) throw new StateConflictError("Clarify the specific unresolved attempt in your own words; no dice or resources changed.");
    row=matches[0];const authorization={...parsed,request:row.record_key,expected_revision:rollRevision(row),key:`utterance:${hash([message.id,pc.id])}`};
    delete authorization.target;
    if(parsed.op==="tag"){
      const partners=db.currentRollRequests(guild,session.id,scene).filter(item=>item.data.character_name.toLowerCase()===parsed.target.toLowerCase());
      if(partners.length!==1) throw new StateConflictError("The other PC needs their own adjudicated pending attempt; participation is never inferred.");
      authorization.partner_request=partners[0].record_key;
    }
    if(parsed.op==="select"){
      const chosen=row.data.tag.participants.filter(item=>item.name.toLowerCase()===parsed.target.toLowerCase());
      if(chosen.length!==1||!chosen[0].roll_id) throw new StateConflictError("Clarify the actual saved result you intend to apply to both actions.");
      authorization.roll_id=chosen[0].roll_id;
    }
    if(["help","experience","tag","participate"].includes(parsed.op)){
      indexWorldEvent(db,guild,{key:`roll-declaration:${hash([message.id,pc.id])}`,kind:"roll_contribution",source_id:`player:${message.author.id}`,
        title:"Owner-authored proposed roll contribution",session_id:session.id,scene,visibility:"character",subject_key:pc.id,
        details:{author:message.author.id,character_id:pc.id,exact_text:String(text),authorization}},message.author.id);
      // Continue through the existing GM request so it can propose a reviewed adjudication. No extra provider request is added here.
      return false;
    }
    const after=contributeRoll(db,guild,message.author.id,authorization);
    committed=true;
    await deliver(formatRollRequest(after,{user:message.author.id}));
    if(sendAmendment) await publishRollAmendment(db,guild,after,sendAmendment);
  }catch(error){await deliver(`${committed?"Roll was committed; private delivery needs recovery. Do not repeat the roll; retrieve /vc-roll pending.":"Roll declaration remains uncommitted or needs review:"} ${error.message}`).catch(()=>{});}
  return true;
}
