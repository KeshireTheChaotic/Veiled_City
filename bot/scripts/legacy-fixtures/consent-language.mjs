/** OFFLINE COMPATIBILITY FIXTURE ONLY. Current commands use the native consent service. */
import {consentOffers,respondConsent} from '../../src/consent-native.js';
export {consentOffers,respondConsent} from '../../src/consent-native.js';
export async function routeConsentMessage({db,message,characterId,text=message.content,deliver,detailed=false}){
  if(message.author.bot||db.getCityCalendar(message.guild.id).flags.natural_language!==true||!characterId) return detailed?null:false;
  const match=/^Regarding ([^,@\n]+)(?:@([^,\n]+))?, ([\s\S]+)$/.exec(text);if(!match) return detailed?null:false;
  let committed=false,failure="",row=null;
  try{
    const offer=consentOffers(db,message.guild.id,message.author.id,characterId).find(row=>row.record_key===match[1]);
    if(!offer) return detailed?null:false;
    row=respondConsent(db,message.guild.id,message.author.id,{characterId,messageId:message.id,text,proposal:offer.record_key,
      revision:match[2]||offer.revision,authorize:!!match[2]});
    if(!["applied","authorized"].includes(row.status)) return detailed?null:false;
    committed=true;
    await deliver(["applied","authorized"].includes(row.status)?"Your exact response was recorded by the native owner-consent service. It does not spend resources, force attendance or bypass GM review.":
      "Your reply is preserved without agreement or changing the terms. What needs to be clarified or changed?");
  }catch(error){failure=String(error?.message||error);try{await deliver(committed?"Response saved; private delivery failed. Inspect your existing continuity inbox; do not repeat a world action.":
    "No consent was applied. The current terms or ownership need clarification. What did you intend?");}catch{/* Never retry a committed mutation after delivery failure. */}}
  return detailed?{handled:true,committed,operation:"consent",record_key:row?.record_key||null,error:failure||null}:true;
}
