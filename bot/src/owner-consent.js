/** Exact native offer terms and authenticated owner receipts, shared by native consent consumers; no inferred assent. */
import { stateRevision } from "./ai-intents.js";
export function externalConsentTerms(row){
  if(row.kind==="negotiation") return JSON.stringify({terms:row.data.terms,parties:row.data.participants.map(p=>`${p.type}:${p.key}`)});
  if(row.kind==="commitment_offer") return JSON.stringify(row.data.proposal);
  if(row.kind==="long_project") return JSON.stringify({title:row.data.title,phase:row.data.phases[row.data.index]&&
    Object.fromEntries(Object.entries(row.data.phases[row.data.index]).filter(([key])=>["key","title","duration_minutes","prerequisites","requires"].includes(key)))});
  throw new Error("Unsupported native external consent terms.");
}
export function externalConsentKey(row){return `${row.kind}:${row.record_key}`;}
export function hasOwnerConsent(db,guild,row,character,user){
  return db.hasOwnerConsent(guild,{proposal:externalConsentKey(row),revision:stateRevision(row),terms:externalConsentTerms(row),character,user});
}
