/** Read-only natural-language discovery runs before ordinary message persistence or director work. No model calls or campaign writes. */
import { discoverPersonal } from "./frameworks/knowledge/public.js";
export function discoveryQuestion(message){
  const text=String(message||"").replace(/<@!?\d+>/g,"").trim();
  if(/^(?:ooc\b|\(\(|\/\/)|\b(?:if I|hypothetically|for example)\b/i.test(text))return null;
  const recall=/^(?:what (?:was|were) (?:the|our|my) (?:lead|leads|clue|clues|finding|findings)|remind me (?:about|of)|what (?:did we|did I) (?:learn|find|hear|discover)|(?:show|review) (?:our|my) notes)(?:\s+(?:at|in|about|from|regarding))?\s*(.*?)\??$/i.exec(text);
  if(recall)return {mode:"know",query:recall[1].replace(/\?$/,"").trim().slice(0,300)};
  const caseQuery=/^(?:what do we have on|what do I know about the case|show my case notes(?: about)?|review my evidence(?: about)?)\s+(.+?)\??$/i.exec(text);
  if(caseQuery) return {mode:"case",query:caseQuery[1].replace(/\?$/,"").trim().slice(0,300)};
  const extended=/^(?:what (evidence|commitments|organizations|organisations) do I (?:know|have|belong to)|(?:(?:show|list|remind me of) my|what are my) (known evidence|accepted commitments|commitments|organizations|organisations))(?:\s+(?:about|regarding))?\s*(.*?)\??$/i.exec(text);
  if(extended){
    const topic=(extended[1]||extended[2]).toLowerCase();
    return {mode:topic.includes("evidence")?"evidence":topic.includes("commitments")?"commitments":"organizations",query:extended[3].replace(/\?$/,"").trim().slice(0,300)};
  }
  const match=/^(?:what (?:do I know|have I learned|leads do I have|has changed for me)|remind me what I know|who did I witness)(?:\s+(?:about|regarding))?\s*(.*?)\??$/i.exec(text);
  if(!match) return null;
  return {mode:/leads/i.test(text)?"leads":/changed/i.test(text)?"changed":/witness/i.test(text)?"witness":"know",query:match[1].replace(/\?$/,"").trim().slice(0,300)};
}
import {formatDiscovery as nativeFormatDiscovery,discoveryDeliveryProof as nativeDiscoveryDeliveryProof} from './discovery-delivery.js';
// Keep historical named APIs without duplicating scope or transport validation.
export function formatDiscovery(db,guild,user,packet){return nativeFormatDiscovery(db,guild,user,packet);}
export function discoveryDeliveryProof(db,guild,user,query,packet){return nativeDiscoveryDeliveryProof(db,guild,user,query,packet);}
export {deliverDiscoveryMessage} from './discovery-delivery.js';
export async function routeDiscoveryMessage({db,message,text=message.content,deliver,detailed=false}){
  if(db.getCityCalendar(message.guild.id).flags.discovery!==true) return detailed?null:false;
  const question=discoveryQuestion(text);if(!question) return detailed?null:false;
  let output,proof;
  try{
    const packet=discoverPersonal(db,message.guild.id,message.author.id,question);
    output=formatDiscovery(db,message.guild.id,message.author.id,packet);
    proof=discoveryDeliveryProof(db,message.guild.id,message.author.id,question,packet);
  }catch{output="Select and attend with an authenticated controlled role. Owner-only personal workflows still require ownership. No world action occurred.";}
  let delivery;
  try{delivery=await deliver(output,proof);}
  catch{delivery={ok:false,certainty:'uncertain',messages:[]};/* Read-only delivery failure never becomes a mutating turn. */}
  const status=delivery?.ok===true?'delivered':delivery?.certainty==='not_sent'?'not_sent':delivery?.certainty==='uncertain'?'uncertain':'failed';
  return detailed?{handled:true,committed:false,operation:"discovery",query:question,delivery_status:status,delivery}:true;
}
