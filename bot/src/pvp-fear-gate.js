/** Immediate PvP consequence obligations, separate from saved scores and campaign Fear currency. */
import { createHash } from "node:crypto";
import { validateFearEffect } from "./pvp-fear-moves.js";
import { validatePvpAttackRoll } from "./pvp-attacks.js";
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0,40);
const triggerKey=(p,r)=>`pvp-fear:${hash([p.record_key,p.data.terms_hash,r.data.round,r.record_key])}`;
export function fearGateKey(p,round){return `pvp-exchange:${hash([p.record_key,p.data.terms_hash,round])}`;}
function fail(){throw Object.assign(new Error("Exact current native Fear roll/terms/gate required."),{code:"NARRATIVE_PVP",expected:true});}
/** A damage action is not a sealed paired contest. Fear is due immediately, even on a miss. */
export function captureAttackFear(db,guild,p,receipt){
  const proof=validatePvpAttackRoll(db,guild,receipt.record_key),r=proof.receipt;
  if(proof.contract.record_key!==p.record_key)fail();
  if(r.data.result.duality!=="Fear")return null;
  const key=triggerKey(p,{...r,data:{...r.data,round:r.data.attack}}),prior=db.getCityRecord(guild,"pvp_fear_trigger",key);
  if(prior)return prior;
  const s=db.getWorldEvent(guild,r.source_event),round=r.data.attack;
  const t=db.saveCityRecord(guild,{kind:"pvp_fear_trigger",key,status:"awaiting_move",visibility:"gm",source_event:r.source_event,
    data:{version:2,trigger_id:key,guild,session:p.data.session_id,scene:p.data.scene,proposal:p.record_key,terms_hash:p.data.terms_hash,
      round,attack_receipt:r.record_key,roll_id:r.data.roll_id,roller_character:r.subject_key,
      roller_principal_revision:proof.offer.snapshot.actor_principal,source_event:s.event_key,duality:"Fear",paired_comparison_ref:r.record_key,
      trigger_ordinal:0,revision:1}});
  db.saveCityRecord(guild,{kind:"pvp_exchange_gate",key:fearGateKey(p,round),status:"pending_fear",visibility:"gm",source_event:p.source_event,
    data:{version:2,proposal:p.record_key,terms_hash:p.data.terms_hash,round,pair_ref:r.record_key,
      expected_fear_trigger_ids:[key],resolved_effect_ids:[],partial:false,revision:1}});
  return t;
}
export function capturePvpFear(db,guild,p,receipt){
  if(receipt.data.result.duality!=="Fear")return null;
  const native=db.getSavedRoll(guild,receipt.data.roll_id),s=db.getWorldEvent(guild,receipt.source_event);
  if(receipt.status!=="resolved"||native?.roll_type!=="narrative_pvp"||s?.status!=="active"
    ||s.kind!=="pvp_roll_authorization"||s.details.proposal!==p.record_key||s.details.terms_hash!==p.data.terms_hash
    ||JSON.stringify(native.payload)!==JSON.stringify(receipt.data.result)||native.character_id!==receipt.data.character
    ||!db.ownerAuthoredSource(guild,s.event_key,s.details.author))fail();
  const key=triggerKey(p,receipt),prior=db.getCityRecord(guild,"pvp_fear_trigger",key);if(prior)return prior;
  return db.saveCityRecord(guild,{kind:"pvp_fear_trigger",key,status:"awaiting_pair",visibility:"gm",source_event:s.event_key,
    data:{version:1,trigger_id:key,guild,session:p.data.session_id,scene:p.data.scene,proposal:p.record_key,
      terms_hash:p.data.terms_hash,round:receipt.data.round,round_receipt:receipt.record_key,roll_id:receipt.data.roll_id,
      roller_character:receipt.data.character,roller_principal_revision:s.details.principal_revision,source_event:s.event_key,
      duality:"Fear",paired_comparison_ref:null,trigger_ordinal:p.data.participants.findIndex(w=>w.character===receipt.data.character),revision:1}});
}
export function gatePvpExchange(db,guild,p,round,rows,pairRef,{partial=false}={}){
  const key=fearGateKey(p,round),prior=db.getCityRecord(guild,"pvp_exchange_gate",key);
  if(prior)return prior;
  const triggers=rows.filter(Boolean).filter(r=>r.data.result.duality==="Fear").map(r=>{
    const t=db.getCityRecord(guild,"pvp_fear_trigger",triggerKey(p,r));if(!t)fail();return t;
  }).sort((a,b)=>a.data.trigger_ordinal-b.data.trigger_ordinal||a.record_key.localeCompare(b.record_key));
  for(const t of triggers)db.saveCityRecord(guild,{...t,key:t.record_key,status:"awaiting_move",
    data:{...t.data,paired_comparison_ref:pairRef,revision:t.data.revision+1}});
  return db.saveCityRecord(guild,{kind:"pvp_exchange_gate",key,status:triggers.length?"pending_fear":"ready",visibility:"gm",
    source_event:p.source_event,data:{version:1,proposal:p.record_key,terms_hash:p.data.terms_hash,round,pair_ref:pairRef,
      expected_fear_trigger_ids:triggers.map(t=>t.record_key),resolved_effect_ids:[],partial,revision:1}});
}
export function pendingPvpFear(db,guild,p){
  // Never silently truncate an authority boundary.
  const rows=[];
  for(let offset=0;offset<10000;offset+=100){
    const page=db.listCityRecords(guild,{kind:"pvp_fear_trigger",includeGM:true,limit:100,offset});
    for(const t of page.filter(t=>t.data.proposal===p.record_key&&t.data.terms_hash===p.data.terms_hash&&t.status==="resolved")){
      if(!t.data.effect)fail();
      validateFearEffect(db,guild,t.data.effect);
    }
    rows.push(...page.filter(t=>t.data.proposal===p.record_key&&t.data.terms_hash===p.data.terms_hash&&t.status!=="resolved"));
    if(page.length<100)return rows;
  }
  fail();
}
export function closePartialFearGate(db,guild,p,receipt){
  const triggers=pendingPvpFear(db,guild,p),rounds=[...new Set(triggers.filter(t=>t.status==="awaiting_pair").map(t=>t.data.round))];
  for(const round of rounds){
    const rows=triggers.filter(t=>t.data.round===round).map(t=>db.getCityRecord(guild,"pvp_round_receipt",t.data.round_receipt));
    gatePvpExchange(db,guild,p,round,rows,receipt.record_key,{partial:true});
  }
}
