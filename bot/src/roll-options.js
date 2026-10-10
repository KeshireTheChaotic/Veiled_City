/** Owner-private roll option discovery. Candidates never spend or alter the roll request. */
import { createHash } from "node:crypto";
import { ownedRollRequest } from "./roll-requests.js";
import { StateConflictError, UserInputError } from "./errors.js";

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const states=new Set(["available","requires_owner_choice","requires_additional_authorization","blocked","applied"]);

function context(db,guild,row){
  const accepted=row.data.input.accepted_intent
    ?db.getCityRecord(guild,"typed_intent",row.data.input.accepted_intent):null;
  return {operation:accepted?.data.operation||row.data.input.operation||"",trait:row.data.breakdown.trait,rollKind:row.data.kind};
}
function applicability(value,ctx){
  if(value==null)return "unknown";
  if(typeof value!=="object"||Array.isArray(value))return "invalid";
  for(const [field,actual] of [["operations",ctx.operation],["traits",ctx.trait],["roll_kinds",ctx.rollKind]]){
    if(value[field]!==undefined&&(!Array.isArray(value[field])||!value[field].length
      ||value[field].some(item=>typeof item!=="string"||!item.trim())))return "invalid";
    if(value[field]&&!value[field].includes(actual))return "irrelevant";
  }
  return Object.keys(value).length?"applicable":"unknown";
}
function mechanic(value){
  if(!value||typeof value!=="object"||Array.isArray(value)
    ||!["flat","advantage","disadvantage"].includes(value.kind)
    ||!Number.isSafeInteger(value.amount)||value.amount<0||value.amount>20
    ||value.kind!=="flat"&&value.amount!==1)return null;
  const cost=value.cost==null?null:value.cost;
  if(cost&&(!["hope","stress"].includes(cost.resource)||!Number.isSafeInteger(cost.amount)||cost.amount<1||cost.amount>20))return null;
  return {kind:value.kind,amount:value.amount,cost,exclusive_group:typeof value.exclusive_group==="string"?value.exclusive_group:"",
    frequency:typeof value.frequency==="string"?value.frequency:"",applies_to:value.applies_to};
}
function participationProof(db,guild,row,name){
  return db.listWorldEvents(guild,{includeGM:true,limit:200}).find(event=>{
    const p=event.details?.roll_participation;
    return event.status==="active"&&event.kind==="roll_adjudication"&&event.source_kind==="gm"
      &&event.details.human_reviewed===true&&event.session_id===row.data.session_id&&event.scene===row.data.scene
      &&event.visibility==="character"&&event.subject_key===row.subject_key&&p?.request===row.record_key
      &&p.character_id===row.subject_key&&p.kind==="experience"&&p.experience===name
      &&db.getRulesRuling(guild,event.details.ruling_key||p.ruling_key);
  })||null;
}
function option(value){
  if(!states.has(value.state))throw new Error("Internal roll option state is invalid.");
  return {cost:null,exclusive_group:"",frequency:"",reason:"",...value};
}

export function discoverRollOptions(db,guild,user,request){
  const row=ownedRollRequest(db,guild,user,request),pc=db.getCharacter(row.subject_key),ctx=context(db,guild,row),options=[];
  options.push(option({key:`trait:${ctx.trait}`,type:"trait",label:ctx.trait,state:"applied",effect:{kind:"flat",amount:row.data.breakdown.trait_bonus},
    source:{kind:"character_sheet",character_id:pc.id,path:`traits.${ctx.trait}`},reason:"Recorded trait used by the prepared request."}));
  for(const mod of row.data.breakdown.modifiers||[])options.push(option({key:`modifier:${mod.source}`,type:"modifier",label:mod.name,state:"applied",
    effect:{kind:mod.kind,amount:mod.amount},source:{kind:"reviewed_modifier",event:mod.source,ruling_key:mod.ruling_key},
    reason:"Already included by a current human-reviewed scoped modifier."}));
  for(const event of db.listWorldEvents(guild,{includeGM:true,limit:200})){
    const choice=event.details?.roll_alternate_trait;
    if(event.status!=="active"||event.kind!=="roll_adjudication"||event.source_kind!=="gm"||event.details.human_reviewed!==true
      ||event.session_id!==row.data.session_id||event.scene!==row.data.scene||event.visibility!=="character"||event.subject_key!==pc.id
      ||choice?.request!==row.record_key||choice.from_trait!==ctx.trait||!choice.reason?.trim()
      ||!db.getRulesRuling(guild,event.details.ruling_key||choice.ruling_key))continue;
    const value=pc.data.traits?.[choice.to_trait];
    if(!Number.isSafeInteger(value))continue;
    options.push(option({key:`alternate_trait:${choice.to_trait}`,type:"alternate_trait",label:choice.to_trait,
      state:"requires_owner_choice",effect:{kind:"alternate_trait",amount:value,trait:choice.to_trait},
      source:{kind:"reviewed_alternate_trait",event:event.event_key,ruling_key:event.details.ruling_key||choice.ruling_key},
      reason:choice.reason}));
  }
  if(row.data.kind==="action"){
    const net=(row.data.breakdown.advantage||0)-(row.data.breakdown.disadvantage||0);
    options.push(option({key:"party_aid:help",type:"party_aid",label:"Help from an ally",
      state:net<0?"blocked":"requires_additional_authorization",effect:{kind:"helper_die",amount:1},
      cost:{resource:"helper_hope",amount:1},source:{kind:"SRD",ref:"srd:help-an-ally",version:"2.0 (2026-08-25)"},
      reason:net<0?"Help alongside net disadvantage requires an exact saved GM ruling for this combination.":
        "A separate present owner must affirm participation, receive a reviewed feasibility source and authorize 1 Hope."}));
    options.push(option({key:"party_aid:tag_team",type:"party_aid",label:"Tag Team Roll",
      state:"requires_additional_authorization",effect:{kind:"tag_team",amount:1},cost:{resource:"hope",amount:3},
      frequency:"once per session as initiator",source:{kind:"SRD",ref:"srd:tag-team-rolls",version:"2.0 (2026-08-25)"},
      reason:"Requires another owner's separate pending request and affirmative native participation; proposal does not spend."}));
  }
  for(const item of pc.data.experiences||[]){
    const name=typeof item==="string"?item:item?.name,bonus=typeof item==="string"?2:item?.modifier;
    if(typeof name!=="string"||!name.trim())continue;
    const applies=applicability(typeof item==="object"?item.applies_to:null,ctx);
    if(applies==="irrelevant")continue;
    const proof=participationProof(db,guild,row,name),valid=Number.isSafeInteger(bonus)&&bonus>=0&&bonus<=20;
    const applied=(row.data.experiences||[]).some(value=>value.name===name);
    const state=applied?"applied":!valid||applies==="invalid"?"blocked":proof&&applies==="applicable"?"requires_owner_choice":"requires_additional_authorization";
    options.push(option({key:`experience:${name}`,type:"experience",label:name,state,effect:valid?{kind:"flat",amount:bonus}:null,
      cost:{resource:"hope",amount:1},exclusive_group:typeof item==="object"&&typeof item.exclusive_group==="string"?item.exclusive_group:"",
      source:{kind:"character_sheet",character_id:pc.id,path:`experiences.${name}`,proof:proof?.event_key||null,
        proof_description:proof?.details.roll_participation?.description||null,ruling_key:proof?.details.ruling_key||null},
      reason:state==="requires_owner_choice"?"Applicable reviewed Experience; owner choice and Hope authorization remain required.":
        state==="blocked"?"The recorded Experience mechanic is invalid.":"Applicability needs an exact reviewed source before owner selection."}));
  }
  const addSheetOptions=(items,type,prefix)=>{
    for(const item of items||[]){
      if(!item||typeof item!=="object"||typeof item.name!=="string"||!item.roll_option)continue;
      const effect=mechanic(item.roll_option),applies=applicability(item.roll_option.applies_to,ctx);
      if(applies==="irrelevant")continue;
      const inactive=(type==="feature"||type==="asset")&&item.equipped!==true&&item.active!==true;
      const state=!effect||applies==="invalid"||inactive?"blocked":"requires_additional_authorization";
      options.push(option({key:`${prefix}:${item.name}`,type,label:item.name,state,
        effect:effect?{kind:effect.kind,amount:effect.amount}:null,cost:effect?.cost||null,
        exclusive_group:effect?.exclusive_group||"",frequency:effect?.frequency||"",
        source:{kind:"character_sheet",character_id:pc.id,path:`${prefix}.${item.name}`},
        reason:inactive?"The recorded feature or asset is not equipped/active.":state==="blocked"?"The recorded mechanic or applicability is invalid.":
          "Owned and context-matched, but a native reviewed modifier source is still required before application."}));
    }
  };
  addSheetOptions(pc.data.domain_cards,"feature","feature");
  addSheetOptions(pc.data.inventory,"asset","asset");
  addSheetOptions(pc.data.conditions,"condition","condition");
  return {row,pc,options,context:ctx};
}

export function arbitrateRollOptions(db,guild,user,input={}){
  if(!Array.isArray(input.proposed_keys)||input.proposed_keys.length>40||new Set(input.proposed_keys).size!==input.proposed_keys.length
    ||input.proposed_keys.some(key=>typeof key!=="string"||!key||key.length>200))
    throw new UserInputError("Roll option proposals must be a unique bounded key list.");
  const {row,pc,options,context:rollContext}=discoverRollOptions(db,guild,user,input.request);
  if(!["pending","needs_review","awaiting_selection"].includes(row.status))throw new StateConflictError("Roll options require a current unsettled owned request.");
  const found=new Set(options.map(item=>item.key));
  const rejected=input.proposed_keys.filter(key=>!found.has(key)).map(key=>({key,reason:"Not an applicable option on the authenticated owner's current sheet/request."}));
  const key=row.record_key,registry=db.saveCityRecord(guild,{kind:"roll_option_registry",key,status:"available",
    source_event:row.source_event,visibility:"character",subject_key:pc.id,data:{version:1,request:row.record_key,
      request_revision:row.data.revision,owner_user_id:user,character_id:pc.id,context:rollContext,options,rejected,
      sheet_fingerprint:hash(pc.data),authority:"Private candidates only; owner selection and native receipts own costs/effects."}});
  return {...registry.data,record_key:registry.record_key};
}
