/** Source-linked custody extends handout metadata; physical originals, copies and interpretations never become canon. */
import { cityObject, cityKey, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { personalCharacter } from "./personal-continuity.js";
import { scenePresence } from "./scene-continuity.js";
import { stateRevision } from "./ai-intents.js";
import { motivationKey } from "./simulation-motivation.js";
function available(db,guild,id,user,gm){
  const pc=gm?null:personalCharacter(db,guild,user),row=db.getHandout(id);
  if(row?.guild_id!==guild||row.status!=="active"||!gm&&!(["party","public"].includes(row.visibility)
    ||row.visibility==="player"&&row.subject_user_id===user||row.visibility==="character"&&row.subject_character_id===pc.id))
    throw new Error("Evidence not available to this character.");
  return {row,pc};
}
function holderExists(db,guild,holder){
  if(typeof holder!=="string") return false;
  const [type,...parts]=holder.split(":"),key=parts.join(":");
  return type==="character"?db.getCharacter(key)?.guild_id===guild:type==="npc"?!!db.getNpcProfile(guild,key)
    :type==="institution"?db.getCityRecord(guild,"institution",key)?.status==="active":type==="location"?!!db.getSimulationEntity(guild,"location",key):false;
}
export function evidenceView(db,guild,id,user,{gm=false}={}){
  const {row,pc}=available(db,guild,id,user,gm),e=row.metadata.evidence;
  if(gm) return {id:row.id,title:row.title,evidence:e||null,expected_revision:stateRevision(e)};
  if(!e) return {id:row.id,title:row.title,history:[],guidance:"No authorized custody history is recorded."};
  const history=e.history.filter(item=>item.character===pc.id||sourceVisible(db,guild,item.source_event,user,pc.id));
  return {id:row.id,title:row.title,history:history.slice(-12).map(item=>({state:item.state,copy:item.copy,interpretation:item.interpretation||"",
    authority:"Recorded observation/claim, not proof of guilt or current global truth"})),
    expected_revision:stateRevision(e),pending:e.pending?.to===`character:${pc.id}`||e.pending?.from===`character:${pc.id}`?{key:e.pending.key,copy:e.pending.copy,decision:"Explicit accept or decline required"}:null};
}
function sourceVisible(db,guild,key,user,character){
  const source=db.getWorldEvent(guild,key);return source?.status==="active"&&(["public","party"].includes(source.visibility)
    ||source.visibility==="player"&&source.subject_key===user||source.visibility==="character"&&source.subject_key===character);
}
export function manageEvidence(db,guild,input,user,{gm=false}={}){
  cityObject(input);
  if(db.getCityCalendar(guild).flags.evidence_custody!==true) throw new Error("Evidence custody is opt-in.");
  if(Object.keys(input).some(key=>!["op","id","key","source_event","expected_revision","holder","to","copy","state","interpretation"].includes(key)))
    throw new Error("Closed evidence operation required; authority and owner are application-derived.");
  const {row,pc}=available(db,guild,input.id,user,gm),key=cityKey(input.key),receiptKey=`${row.id}:${key}`;
  const prior=db.getCityRecord(guild,"evidence_receipt",receiptKey);
  if(prior){if(prior.data.actor!==user) throw new Error("Evidence receipt belongs to another controller.");return evidenceView(db,guild,row.id,user,{gm});}
  const before=row.metadata.evidence;
  if(stateRevision(before)!==input.expected_revision) throw new Error("Evidence revision changed; refresh before acting.");
  const source=requireCitySource(db,guild,input.source_event),copy=input.copy||"original";
  if(copy!=="original") cityKey(copy);
  let evidence=before?structuredClone(before):{state:"discovered",original:{key:row.id,holder:null,state:"discovered"},copies:{},history:[],pending:null};
  if(evidence.pending&&!["accept","decline","status","resolved-transfer"].includes(input.op)) throw new Error("Resolve the pending transfer before another custody operation.");
  const item=copy==="original"?evidence.original:evidence.copies[copy];
  if(!item) throw new Error("Explicit existing original or copy required.");
  const owns=!gm&&item.holder===`character:${pc.id}`;
  const proof=source.details.evidence;
  const grounded=(from,to)=>proof?.handout_id===row.id&&(proof.copy||"original")===copy&&proof.from===from&&proof.to===to;
  if(input.op==="register"){
    if(!gm||before||copy!=="original"||!holderExists(db,guild,input.holder)||input.holder.startsWith("character:"))
      throw new Error("GM registration requires a new original and established non-PC custodian/location.");
    if(!grounded(null,input.holder)) throw new Error("Source must establish initial physical custody.");
    item.holder=input.holder;
  }else{
    if(!before) throw new Error("Register the original through human GM review first.");
    if(["destroyed","archived"].includes(item.state)) throw new Error("Closed evidence cannot be used or duplicated.");
    if(input.op==="collect"){
      if(gm||!item.holder?.startsWith("location:")||!grounded(item.holder,`character:${pc.id}`)) throw new Error("Explicit owned collection with grounded physical source required.");
      const presence=scenePresence(db,guild,"character",pc.id);
      if(presence?.data.state!=="actually_present"||presence.location_key!==item.holder.slice(9)) throw new Error("Collection requires actual owner-established presence.");
      item.holder=`character:${pc.id}`;item.state="collected";
    }else if(input.op==="transfer"){
      if(evidence.pending||!holderExists(db,guild,input.to)||!grounded(item.holder,input.to)||!owns&&!gm
        ||gm&&item.holder?.startsWith("character:")) throw new Error("Current controller's explicit grounded transfer required; no GM assent for PCs.");
      if(input.to===item.holder) throw new Error("Transfer needs a different custodian.");
      if(input.to.startsWith("character:")) evidence.pending={key,copy,from:item.holder,to:input.to,source_event:source.event_key};
      else{item.holder=input.to;item.state="transferred";}
    }else if(["accept","decline"].includes(input.op)){
      const pending=evidence.pending;
      if(gm||!pending||pending.to!==`character:${pc.id}`||pending.copy!==copy||pending.from!==item.holder) throw new Error("Only the actual recipient may answer the current transfer.");
      if(input.source_event!==pending.source_event) throw new Error("Confirm the exact grounded transfer source, not a replacement event.");
      requireCitySource(db,guild,pending.source_event);
      if(input.op==="accept"){item.holder=pending.to;item.state="transferred";}
      evidence.pending=null;
    }else if(input.op==="copy"){
      if(!owns&&!gm||gm&&item.holder?.startsWith("character:")||copy!=="original"||!grounded(item.holder,item.holder)
        ||proof.operation!=="copy"||Object.keys(evidence.copies).length>=20||evidence.copies[key]) throw new Error("Controller-authorized sourced copy required (maximum 20); copies are not originals.");
      evidence.copies[key]={holder:item.holder,state:"held",source_event:source.event_key};
    }else if(input.op==="resolved-transfer"){
      if(!gm||source.kind!=="evidence_transfer"||proof?.operation!=="resolved_transfer"||proof.human_reviewed!==true
        ||typeof proof.resolution!=="string"||!proof.resolution.trim()||proof.resolution.length>500
        ||!holderExists(db,guild,input.to)||!grounded(item.holder,input.to)) throw new Error("Human-adjudicated externally caused transfer with explicit resolution provenance required.");
      item.holder=input.to;item.state="transferred";evidence.pending=null;
    }else if(input.op==="status"){
      if(!gm||!["held","analyzed","disputed","altered","missing","destroyed","archived"].includes(input.state)
        ||proof?.handout_id!==row.id||(proof.copy||"original")!==copy||proof.operation!==input.state) throw new Error("Human GM-adjudicated sourced evidence status required.");
      item.state=input.state;
      if(["missing","destroyed"].includes(input.state)) item.holder=null;
      evidence.pending=null;
    }else throw new Error("Unsupported evidence operation.");
  }
  if(input.interpretation!==undefined&&(typeof input.interpretation!=="string"||input.interpretation.length>600)) throw new Error("Bounded subjective interpretation required.");
  evidence.state=evidence.original.state;
  evidence.history.push({key,op:input.op,copy,state:item.state,holder:item.holder,character:pc?.id||null,source_event:source.event_key,
    interpretation:input.interpretation?`Unverified interpretation: ${input.interpretation}`:""});
  evidence.history=evidence.history.slice(-100);
  const physical=!evidence.pending&&input.op!=="decline";
  const effectKey=motivationKey([row.id,input.op==="accept"?before.pending.source_event:source.event_key,copy,proof?.operation||"custody"]);
  if(physical&&db.getCityRecord(guild,"evidence_effect",effectKey)) throw new Error("This physical source has already been resolved; old events cannot be replayed with fresh keys.");
  return db.transaction(()=>{
    db.setHandoutEvidence(guild,row.id,evidence);
    if(physical) db.saveCityRecord(guild,{kind:"evidence_effect",key:effectKey,source_event:source.event_key,data:{handout_id:row.id,operation:input.op,copy}});
    db.saveCityRecord(guild,{kind:"evidence_receipt",key:receiptKey,source_event:source.event_key,data:{actor:user,handout_id:row.id,operation:input.op}});
    cityAudit(db,guild,"evidence_custody",row.id,before,evidence,user);
    return evidenceView(db,guild,row.id,user,{gm});
  });
}
