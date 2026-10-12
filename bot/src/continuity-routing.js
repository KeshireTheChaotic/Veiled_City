/** Read-only natural-language discovery runs before ordinary message persistence or director work. No model calls or campaign writes. */
import { discoverPersonal } from "./personal-continuity.js";
import {conversationPrincipal} from './conversation-principal.js';
import {sendPlayerPrivate} from './publishing.js';
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
export function formatDiscovery(db,guild,user,packet){
  if(packet.unknown) return "There was no matching knowledge retrieved within your current role's authorized sources and search limits. Unknown is not disproven. No new discovery or world action occurred.";
  let preferences={};try{preferences=JSON.parse(db.getPlayer(guild,user)?.accessibility_json||"{}");}catch{/* Legacy malformed preferences use plain defaults. */}
  const rows=[
    ...packet.facts.map(row=>`${row.content} (${row.epistemic?.kind==="hypothesis"?"private hypothesis; not proof":row.epistemic?.kind||`${row.confidence}% confidence`}; ${row.evidence_active===false?"source retracted; historical only":row.source||"recorded source"})`),
    ...packet.events.map(row=>`${row.title} (${row.truth_status}; minute ${row.minute})`),
    ...(packet.personal||[]).map(row=>`${row.data.statement||row.data.invitation||row.key} (${row.status}; personal continuity, not world truth)`),
    ...(packet.evidence||[]).map(row=>`${row.title} (${row.authority} artifact; ${row.id}): ${row.content}`),
    ...(packet.case_view?.evidence||[]).flatMap(row=>row.custody.map(item=>`${row.title}: ${item.state} (${item.authority})`)),
    ...(packet.organizations||[]).map(row=>`${row.name} (${row.role}; explicit participation, no inferred votes or funds)`),
    ...(packet.commitments||[]).map(row=>`${row.text} (${row.status})`)
  ];
  // Plain lines are screen-reader friendly; do not render grids, icons, spoilers or buttons implying consent.
  const selected=rows.slice(0,preferences.response_length==="compact"?5:12);
  const coverage=`\nSearch/display limits: ${rows.length-selected.length} additional returned rows; ${(packet.omissions||[]).length} retrieval limit notices. Unknown is not disproven.`;
  return `Your current character's recorded knowledge, not global truth:\n${selected.join("\n")}`+coverage;
}
/** Revalidate the same authenticated read scope and selected evidence before every awaited send. */
export function discoveryDeliveryProof(db,guild,user,query,packet){
  const principal=conversationPrincipal(db,guild,user,packet.character_id),snapshot=JSON.stringify(packet);
  return ()=>{
    const current=conversationPrincipal(db,guild,user,query.character_id);
    if(current.revision!==principal.revision||current.character_id!==principal.character_id||current.kind!==principal.kind
      ||JSON.stringify(discoverPersonal(db,guild,user,query))!==snapshot)throw new Error('Discovery source or current controlled role changed; request a fresh private lookup.');
  };
}
export async function deliverDiscoveryMessage({db,message,text,proof}){
  return sendPlayerPrivate({db,guild:message.guild,userId:message.author.id,content:text,beforeSend:proof,
    recordMessage:false,allowedMentions:{parse:[]}});
}
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
