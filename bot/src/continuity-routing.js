/** Read-only natural-language discovery runs before ordinary message persistence or director work. No model calls or campaign writes. */
import { discoverPersonal } from "./personal-continuity.js";
export function discoveryQuestion(message){
  const text=String(message||"").replace(/<@!?\d+>/g,"").trim();
  const match=/^(?:what (?:do I know|have I learned|leads do I have|has changed for me)|remind me what I know|who did I witness)(?:\s+(?:about|regarding))?\s*(.*?)\??$/i.exec(text);
  if(!match) return null;
  return {mode:/leads/i.test(text)?"leads":/changed/i.test(text)?"changed":/witness/i.test(text)?"witness":"know",query:match[1].replace(/\?$/,"").trim().slice(0,300)};
}
export async function routeDiscoveryMessage({db,message,deliver}){
  if(db.getCityCalendar(message.guild.id).flags.discovery!==true) return false;
  const question=discoveryQuestion(message.content);if(!question) return false;
  let text;
  try{
    const packet=discoverPersonal(db,message.guild.id,message.author.id,question);
    const facts=packet.facts.map(row=>`${row.content} (${row.confidence}% confidence; ${row.source||"recorded source"})`);
    const events=packet.events.map(row=>`${row.title} (${row.truth_status}; minute ${row.minute})`);
    text=packet.unknown?"Your current character has no matching recorded knowledge. No new discovery or world action occurred."
      :`Your current character's recorded knowledge, not global truth:\n${[...facts,...events].slice(0,12).join("\n")}`;
  }catch{text="Select and attend as your own character to query private continuity. No world action occurred.";}
  try{await deliver(text.slice(0,1900));}catch{/* Delivery failure must never turn a read-only query into a mutating turn. */}
  return true;
}
