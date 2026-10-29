/** Native scoped discovery formatting and delivery revalidation. */
import { discoverPersonal } from "./personal-continuity.js";
import {publicationSessionPrincipal} from './frameworks/publication/public.js';
function conversationPrincipal(...args){return publicationSessionPrincipal.conversationPrincipal(...args);}
import {sendPlayerPrivate} from './publishing.js';
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
