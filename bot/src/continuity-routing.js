/** Read-only natural-language discovery runs before ordinary message persistence or director work. No model calls or campaign writes. */
import { discoverPersonal } from "./personal-continuity.js";
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
  const limit=preferences.response_length==="compact"?900:1900;
  const selected=rows.slice(0,preferences.response_length==="compact"?5:12);
  const coverage=`\nSearch/display limits: ${rows.length-selected.length} additional returned rows; ${(packet.omissions||[]).length} retrieval limit notices. Unknown is not disproven.`;
  return `Your current character's recorded knowledge, not global truth:\n${selected.join("\n")}`.slice(0,limit-coverage.length)+coverage;
}
export async function routeDiscoveryMessage({db,message,text=message.content,deliver,detailed=false}){
  if(db.getCityCalendar(message.guild.id).flags.discovery!==true) return detailed?null:false;
  const question=discoveryQuestion(text);if(!question) return detailed?null:false;
  let output;
  try{
    const packet=discoverPersonal(db,message.guild.id,message.author.id,question);
    output=formatDiscovery(db,message.guild.id,message.author.id,packet);
  }catch{output="Select and attend with an authenticated controlled role. Owner-only personal workflows still require ownership. No world action occurred.";}
  let delivered=true;try{await deliver(output.slice(0,1900));}catch{delivered=false;/* Read-only delivery failure never becomes a mutating turn. */}
  return detailed?{handled:true,committed:false,operation:"discovery",query:question,delivery_status:delivered?"delivered":"failed"}:true;
}
