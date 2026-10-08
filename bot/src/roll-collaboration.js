/** Owner-authorized collaboration uses native RNG, roll persistence, transactions and receipts. No model may call this as a PC. */
import { personalCharacter } from "./personal-continuity.js";
import { currentScene, sceneAccess } from "./scene-continuity.js";
import { requireCitySource } from "./city-core.js";
import { cityAudit, cityKey, cityObject, indexWorldEvent } from "./city-calendar.js";
import { rollRevision, rollBreakdown } from "./roll-requests.js";
import { dualityRoll, parseDice, d } from "./dice.js";
import { hpMarksForDamage } from "./combat.js";
import { StateConflictError, PermissionError, UserInputError } from "./errors.js";
function fail(message){throw new StateConflictError(message);}
/** Called only by the authenticated GM command/review boundary, never by model-supplied identity. */
export function adjudicateRollSource(db,guild,input,reviewer){
  cityObject(input);const session=db.getActiveSession(guild),pc=db.getCharacter(input.character_id);
  if(!session||pc?.guild_id!==guild||!reviewer) fail("Current campaign character, session and authenticated GM review required.");
  if(!["participation","modifier","difficulty","attack"].includes(input.kind)) throw new UserInputError("Unsupported adjudication kind.");
  if(Object.keys(input).some(key=>!["key","character_id","kind","data","ruling_key"].includes(key))) throw new UserInputError("Closed GM adjudication required.");
  if(!db.getRulesRuling(guild,input.ruling_key)) fail("Save the actual human GM ruling first.");
  const field={participation:"roll_participation",modifier:"roll_modifier",difficulty:"roll_difficulty",attack:"roll_attack"}[input.kind];
  return indexWorldEvent(db,guild,{key:cityKey(input.key),kind:"roll_adjudication",source_id:reviewer,title:"Human-reviewed roll adjudication",
    session_id:session.id,scene:currentScene(db,guild).key,visibility:"character",subject_key:pc.id,
    details:{human_reviewed:true,reviewed_by:reviewer,ruling_key:input.ruling_key,[field]:{...cityObject(input.data),ruling_key:input.ruling_key}}},reviewer);
}
function live(db,guild,row){
  const session=db.getActiveSession(guild);
  if(!session||row.data.session_id!==session.id||row.data.scene!==currentScene(db,guild).key) fail("Request belongs to another session or scene.");
  requireCitySource(db,guild,row.source_event);
  const pc=personalCharacter(db,guild,row.data.owner_user_id,row.subject_key);
  const checkResources=character=>{
    const r=character.data.resources;
    if(!Number.isSafeInteger(r?.hope)||r.hope<0||r.hope>6||!Number.isSafeInteger(r.stress?.current)
      ||!Number.isSafeInteger(r.stress?.max)||r.stress.current<0||r.stress.current>r.stress.max)
      fail("Current Hope/Stress values are unverified; seek human correction before dice or spending.");
  };
  checkResources(pc);
  const actual=rollBreakdown(db,guild,row.data.input,pc);
  if(JSON.stringify(actual)!==JSON.stringify(row.data.breakdown)||actual.unresolved.length) fail("Sheet or authority changed, or mechanics need review; no dice or spending.");
  if(row.data.tag){
    requireCitySource(db,guild,row.data.tag.proof);
    for(const participant of row.data.tag.participants){
      const other=personalCharacter(db,guild,participant.user,participant.character);
      checkResources(other);
      if(participant.proof) requireCitySource(db,guild,participant.proof);
      if(participant.source_event) requireCitySource(db,guild,participant.source_event);
      if(participant.input&&JSON.stringify(rollBreakdown(db,guild,participant.input,other))!==JSON.stringify(participant.breakdown))
        fail("Partner's sheet/source changed; preserve saved dice for human review.");
    }
  }
  for(const helper of row.data.helpers||[]){
    requireCitySource(db,guild,helper.proof);
    personalCharacter(db,guild,helper.user,helper.character);
    if(!sceneAccess(db,guild,{observer_type:"character",observer_key:helper.character,target_type:"character",target_key:pc.id,sense:"sound"}))
      fail("Confirmed helper no longer has scene access; human correction required without reroll/refund.");
  }
  return pc;
}
function save(db,guild,before,data,status,actor){
  const after=db.saveCityRecord(guild,{...before,key:before.record_key,status,data:{...data,revision:(before.data.revision||0)+1,
    history:[...(before.data.history||[]),{revision:before.data.revision,status:before.status,breakdown:before.data.breakdown}].slice(-40)}});
  cityAudit(db,guild,"roll_request_amended",before.record_key,before,after,actor);return after;
}
function spend(db,pc,amount){
  const hope=pc.data.resources?.hope;
  if(!Number.isSafeInteger(hope)||hope<amount||hope>6) fail("Insufficient verified Hope; no charge or dice.");
  return db.updateCharacterData(pc.id,data=>{data.resources.hope-=amount;});
}
function proof(db,guild,row,pc,input,kind){
  const event=requireCitySource(db,guild,input.proof),p=event.details.roll_participation;
  if(event.kind!=="roll_adjudication"||event.source_kind!=="gm"||event.details.human_reviewed!==true
    ||event.session_id!==row.data.session_id||event.scene!==row.data.scene||event.visibility!=="character"||event.subject_key!==pc.id||!p||p.request!==row.record_key
    ||p.character_id!==pc.id||p.kind!==kind||p.description!==input.description||!input.description?.trim())
    fail("Exact human-adjudicated feasibility source and owner-authored contribution required; keep proposal pending.");
  if(pc.id!==row.subject_key&&!sceneAccess(db,guild,{observer_type:"character",observer_key:pc.id,target_type:"character",target_key:row.subject_key,sense:"sound"}))
    fail("No actual scene/communication access for this contribution.");
  return p;
}
function resultStatus(data){
  const attack=data.breakdown.attack;
  if(!attack) return "resolved";
  const success=data.result.duality==="Critical"||data.result.total>=attack.difficulty;
  return success?"awaiting_damage":"resolved";
}
function finishDamage(db,guild,row,data){
  const participants=data.tag?.participants||[{character:data.character_id,damage:data.damage,breakdown:data.breakdown}];
  if(!participants.every(item=>item.damage)) return "awaiting_damage";
  const types=new Set(participants.map(item=>(item.breakdown||data.breakdown).attack.damage_type));
  const type=types.size===1?[...types][0]:data.damage_type;
  if(!type) return "awaiting_damage_type";
  const attack=data.breakdown.attack,encounter=db.getCurrentEncounter(data.session_id);
  if(encounter?.id!==attack.encounter_id||encounter.status!=="active") fail("Attack encounter changed; human correction required.");
  const target=db.listCombatants(encounter.id).find(item=>item.id===attack.target_id);
  if(!target||target.status!=="active") fail("Target is no longer active; do not apply a second consequence.");
  const total=participants.reduce((sum,item)=>sum+item.damage.total,0),marks=hpMarksForDamage(target,total);
  const hp=Math.max(0,target.hp_current-marks);
  const after=db.updateCombatant(target.id,{hp_current:hp,status:hp===0?"defeated":target.status});
  data.damage_result={total,type,marks,target_id:target.id,before:target.hp_current,after:after.hp_current,source_count:1};
  cityAudit(db,guild,"combined_attack_damage",row.record_key,target,after,"native_roll");return "resolved";
}
/** Same native action/reaction metacurrency semantics used by raw and request-bound rolls. */
export function applyRollOutcome(db,guild,session,characterIds,result,{reaction=false}={}){
  if(reaction) return;
  if(["Hope","Critical"].includes(result.duality)){
    for(const id of characterIds) db.updateCharacterData(id,data=>{
      data.resources=data.resources||{};data.resources.hope=Math.min(6,Number(data.resources.hope||0)+1);
      if(result.duality==="Critical"){
        data.resources.stress=data.resources.stress||{current:0,max:6};
        data.resources.stress.current=Math.max(0,Number(data.resources.stress.current||0)-1);
      }
    });
  }else if(result.duality==="Fear") db.changeFear(guild,Math.max(1,characterIds.length));
  const encounter=db.getCurrentEncounter(session);
  if(encounter?.status==="active"&&characterIds.length) db.recordSpotlight(encounter.id,characterIds[0]); // One action, not one per participant.
}
/** Bound only to the actual interaction/message author. expected_revision is mandatory; receipts protect redelivery before stale checks. */
export function contributeRoll(db,guild,user,input,{rng=d}={}){
  if(db.getCityCalendar(guild).flags.roll_collaboration!==true||db.getCityCalendar(guild).flags.roll_requests!==true)
    fail("Native roll collaboration is opt-in.");
  const pc=personalCharacter(db,guild,user),key=cityKey(input.request),row=db.getCityRecord(guild,"roll_request",key);
  if(!row) fail("Pending request not found.");
  const operation=cityKey(input.key),receiptKey=cityKey(`${operation}:${pc.id}`);
  const prior=db.getCityRecord(guild,"roll_operation",receiptKey);
  if(prior){if(prior.data.user!==user||prior.data.request!==key) throw new PermissionError("Receipt does not belong to this request owner.");return row;}
  if(rollRevision(row)!==input.expected_revision) fail("Request changed; read the current revision before authorizing a contribution.");
  return db.transaction(()=>{
    if(["resolved","superseded","cancelled"].includes(row.status)) fail("Committed/closed rolls cannot be reopened; use human saved-result review.");
    live(db,guild,row);
    const affected=[...new Set([pc.id,row.subject_key,...(row.data.tag?.participants||[]).map(item=>item.character)])];
    const beforeResources=new Map(affected.map(id=>[id,structuredClone(db.getCharacter(id).data.resources)]));
    let data=structuredClone(row.data),status=row.status;
    const mine=pc.id===row.subject_key;
    if(input.op==="help"){
      if(mine||data.tag||data.kind!=="action"||row.status!=="pending") fail("Help requires another PC's unsettled action, not a reaction/group/Tag Team.");
      if((data.helpers||[]).some(helper=>helper.character===pc.id)) fail("This character has already helped; no second charge or die.");
      if(data.breakdown.disadvantage>data.breakdown.advantage) fail("Help with net disadvantage requires a saved GM ruling; no charge.");
      proof(db,guild,row,pc,input,"help");if(input.pay_hope!==true) fail("Helper's explicit authorization to spend 1 Hope required.");
      spend(db,pc,1);const die=rng(6);if(!Number.isInteger(die)||die<1||die>6) fail("Native helper die out of range.");
      const rollId=db.addRoll(guild,data.session_id,user,pc.id,"help",{die,request:key,proof:input.proof,hope_spent:1});
      data.helpers=[...(data.helpers||[]),{character:pc.id,name:pc.name,user,die,roll_id:rollId,proof:input.proof,description:input.description}];
    }else if(input.op==="experience"){
      if(!mine||data.tag||row.status!=="pending") fail("Only the acting owner may amend their unrolled single-PC request.");
      const p=proof(db,guild,row,pc,input,"experience");
      if(p.experience!==input.experience||input.pay_hope!==true) fail("Exact relevant owned Experience and explicit 1 Hope authorization required.");
      const found=(pc.data.experiences||[]).find(item=>(typeof item==="string"?item:item.name)===input.experience);
      const bonus=typeof found==="string"?2:found?.modifier;
      if(!found||!Number.isSafeInteger(bonus)||bonus<0||bonus>20||(data.experiences||[]).some(item=>item.name===input.experience))
        fail("Experience is missing, unverified or already invoked.");
      spend(db,pc,1);data.experiences=[...(data.experiences||[]),{name:input.experience,bonus,proof:input.proof,hope_spent:1}];
    }else if(input.op==="tag"){
      if(!mine||data.kind==="reaction"||data.tag||(data.helpers||[]).length||(data.experiences||[]).length||row.status!=="pending")
        fail("Tag Team initiation requires the actor's untouched unsettled action; paid prior amendments need human review.");
      const other=db.getCityRecord(guild,"roll_request",input.partner_request);
      if(!other||other.subject_key===pc.id||other.status!=="pending"||other.data.kind!==data.kind||other.data.tag
        ||other.data.helpers?.length||other.data.experiences?.length) fail("A separate compatible pending request from the other PC is required.");
      live(db,guild,other);proof(db,guild,row,pc,input,"tag");
      if(data.kind==="attack"&&data.breakdown.attack.target_id!==other.data.breakdown.attack.target_id)
        fail("Combined Tag Team attack damage requires one established common target; other cases need human adjudication.");
      if(input.pay_hope!==true||pc.data.resources.hope<3) fail("Initiator must explicitly authorize 3 Hope and have it available.");
      if(db.getCityRecord(guild,"tag_usage",`${data.session_id}:${pc.id}`)||db.playerInitiatedTagTeam(guild,data.session_id,user))
        fail("This PC/player already initiated a Tag Team this session; character switching does not reset usage.");
      data.tag={initiator:pc.id,partner_request:other.record_key,partner_user:other.data.owner_user_id,partner_revision:rollRevision(other),proof:input.proof,authorized_by:user,
        participants:[{character:pc.id,user,name:pc.name,request:key,roll_id:null}],selections:{}};status="awaiting_partner";
    }else if(input.op==="withdraw"){
      const other=data.tag&&db.getCityRecord(guild,"roll_request",data.tag.partner_request);
      if(row.status!=="awaiting_partner"||!data.tag||!mine&&other?.subject_key!==pc.id)
        fail("Only an actual proposed participant may withdraw an uncharged Tag Team proposal.");
      data.withdrawn_tag=data.tag;delete data.tag;status="pending";
    }else if(input.op==="participate"){
      if(!data.tag||row.status!=="awaiting_partner"||mine) fail("Only the proposed other PC can authorize their participation.");
      const other=db.getCityRecord(guild,"roll_request",data.tag.partner_request);
      if(other?.subject_key!==pc.id||rollRevision(other)!==data.tag.partner_revision||other.status!=="pending") fail("Other participant's request changed.");
      live(db,guild,other);proof(db,guild,row,pc,input,"participate");
      const initiator=personalCharacter(db,guild,data.owner_user_id,data.tag.initiator),usageKey=`${data.session_id}:${initiator.id}`;
      if(db.getCityRecord(guild,"tag_usage",usageKey)||db.playerInitiatedTagTeam(guild,data.session_id,data.owner_user_id))
        fail("Initiator has already used Tag Team this session.");
      spend(db,initiator,3);
      db.saveCityRecord(guild,{kind:"tag_usage",key:usageKey,visibility:"character",subject_key:initiator.id,source_event:row.source_event,
        data:{request:key,user:data.owner_user_id,hope_spent:3,proof:data.tag.proof}});
      data.tag.participants.push({character:pc.id,user,name:pc.name,request:other.record_key,roll_id:null,proof:input.proof,
        input:other.data.input,breakdown:other.data.breakdown,source_event:other.source_event});
      save(db,guild,other,{...other.data,superseded_by:key},"superseded",user);status="pending";
    }else if(input.op==="roll"){
      if(row.status!=="pending") fail("Request is awaiting another authorization or adjudication.");
      let target=data.tag?.participants.find(item=>item.user===user&&item.character===pc.id);
      if(!mine&&!target) throw new PermissionError("Only the actual rolling participant can roll.");
      if(target?.roll_id) fail("This participant has already rolled; saved dice cannot be replaced.");
      if(data.tag) for(const participant of data.tag.participants){
        personalCharacter(db,guild,participant.user,participant.character);
        if(participant.proof) requireCitySource(db,guild,participant.proof);
        if(participant.source_event) requireCitySource(db,guild,participant.source_event);
      }
      const b=target?.breakdown||data.breakdown;
      if(target?.input&&JSON.stringify(rollBreakdown(db,guild,target.input,pc))!==JSON.stringify(b)) fail("Participant's trait/modifier authority changed.");
      for(const item of data.experiences||[]){
        requireCitySource(db,guild,item.proof);
        const current=pc.data.experiences.find(e=>(typeof e==="string"?e:e.name)===item.name);
        if((typeof current==="string"?2:current?.modifier)!==item.bonus) fail("Invoked Experience changed; human correction required.");
      }
      const rolled=dualityRoll({modifier:b.subtotal,experience:(data.experiences||[]).reduce((n,item)=>n+item.bonus,0),
        advantage:b.advantage,disadvantage:b.disadvantage,helperDice:(data.helpers||[]).map(helper=>helper.die)},rng);
      const id=db.addRoll(guild,data.session_id,user,pc.id,data.tag?"tag_team_action":data.kind,{...rolled,request:key,revision:input.expected_revision});
      if(data.tag){target.roll_id=id;target.result=rolled;status=data.tag.participants.every(item=>item.roll_id)?"awaiting_selection":"pending";}
      else{data.roll_id=id;data.result=rolled;status=resultStatus(data);applyRollOutcome(db,guild,data.session_id,[pc.id],rolled,{reaction:data.kind==="reaction"});}
    }else if(input.op==="select"){
      const tag=data.tag;
      if(!tag||row.status!=="awaiting_selection"||!tag.participants.some(item=>item.user===user&&item.character===pc.id)
        ||!tag.participants.some(item=>item.roll_id===input.roll_id)) fail("Both actual participants must select an actual stored roll.");
      for(const participant of tag.participants) personalCharacter(db,guild,participant.user,participant.character);
      tag.selections[user]=input.roll_id;
      if(tag.participants.every(item=>tag.selections[item.user]===input.roll_id)){
        const selected=tag.participants.find(item=>item.roll_id===input.roll_id);
        const saved=db.getSavedRoll(guild,selected.roll_id);
        if(saved?.character_id!==selected.character||saved.session_id!==data.session_id||saved.payload.request!==key)
          fail("The selected result is not an actual saved participant roll.");
        data.result=saved.payload;data.roll_id=selected.roll_id;
        applyRollOutcome(db,guild,data.session_id,tag.participants.map(item=>item.character),saved.payload);
        status=resultStatus(data);
      }
    }else if(input.op==="damage"){
      if(row.status!=="awaiting_damage"||!data.result||data.kind!=="attack") fail("Only a successful committed attack can request damage.");
      const participant=data.tag?.participants.find(item=>item.user===user&&item.character===pc.id);
      if(!mine&&!participant) throw new PermissionError("Only the attacking owner can roll their damage.");
      if(participant?.damage||!data.tag&&data.damage) fail("Damage already rolled; saved dice cannot be replaced.");
      const b=participant?.breakdown||data.breakdown;
      if(participant?.input&&JSON.stringify(rollBreakdown(db,guild,participant.input,pc))!==JSON.stringify(b)) fail("Attack authority changed.");
      const rolled=parseDice(b.attack.damage,rng),match=/^(\d+)d(\d+)/i.exec(b.attack.damage);
      if(data.result.duality==="Critical") rolled.total+=Number(match[1])*Number(match[2]);
      rolled.roll_id=db.addRoll(guild,data.session_id,user,pc.id,"attack_damage",{...rolled,request:key,type:b.attack.damage_type});
      if(data.tag) participant.damage=rolled;else data.damage=rolled;
      status=finishDamage(db,guild,row,data);
    }else if(input.op==="damage-type"){
      if(row.status!=="awaiting_damage_type"||!data.tag||!data.tag.participants.some(item=>item.user===user&&item.character===pc.id))
        fail("Only participating players can choose the combined damage type.");
      const types=data.tag.participants.map(item=>(item.breakdown||data.breakdown).attack.damage_type);
      if(!types.includes(input.damage_type)) fail("Choose an actual damage type from these attacks in your own words.");
      data.tag.type_selections={...data.tag.type_selections,[user]:input.damage_type};
      if(data.tag.participants.every(item=>data.tag.type_selections[item.user]===input.damage_type)){
        data.damage_type=input.damage_type;status=finishDamage(db,guild,row,data);
      }
    }else throw new UserInputError("Unsupported mechanical contribution. Describe your intent freely; no narrative response menu is required.");
    const after=save(db,guild,row,data,status,user);
    const resource_deltas=affected.map(id=>{
      const before=beforeResources.get(id),current=db.getCharacter(id).data.resources;
      return {character:id,hope:{before:before.hope,after:current.hope,delta:current.hope-before.hope},
        stress:{before:before.stress.current,after:current.stress.current,delta:current.stress.current-before.stress.current}};
    });
    db.saveCityRecord(guild,{kind:"roll_operation",key:receiptKey,visibility:"character",subject_key:pc.id,source_event:row.source_event,
      data:{user,request:key,op:input.op,authorization:input,resource_deltas,result:after}});
    return after;
  });
}
