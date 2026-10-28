/** Restart-safe, per-part Discord delivery for generated party assembly plans. */
import { createHash } from "node:crypto";
import { splitDiscordText } from './frameworks/discord/public.js';

const digest=value=>createHash("sha256").update(String(value)).digest("hex").slice(0,24);

export function assemblyPartsFor(plan){
  const parts=[];
  for(const entry of plan.character_entries||[]){
    const text=`**Veilkeeper — private opening hook for ${entry.character_name}:**\n${entry.private_hook||""}`;
    splitDiscordText(text).forEach((content,index)=>parts.push({
      key:`private:${entry.discord_user_id}:${index}:${digest(content)}`,surface:"private",
      userId:entry.discord_user_id,characterName:entry.character_name,content
    }));
  }
  splitDiscordText(plan.public_opening||"").filter(Boolean).forEach((content,index)=>parts.push({
    key:`public:${index}:${digest(content)}`,surface:"public",content
  }));
  return parts;
}

/** Mark before I/O; interrupted sends become uncertain and are never blindly duplicated. */
export async function deliverAssemblyParts({plan,savePlan,sendPublic,sendPrivate}){
  const state=plan.delivery_state&&typeof plan.delivery_state==="object"?structuredClone(plan.delivery_state):{};
  const delivered=[],failed=[],uncertain=[];
  for(const part of assemblyPartsFor(plan)){
    const prior=state[part.key];
    if(prior?.status==="delivered")continue;
    if(prior?.status==="delivering"||prior?.status==="uncertain"){
      state[part.key]={...prior,status:"uncertain"};uncertain.push(part.key);continue;
    }
    state[part.key]={status:"delivering",surface:part.surface,attempts:Number(prior?.attempts||0)+1};
    plan={...plan,delivery_state:state};savePlan(plan);
    try{
      const result=part.surface==="public"?await sendPublic(part.content):await sendPrivate(part.userId,part.content,part);
      if(!result||result.ok===false)throw new Error(`Delivery unavailable (${result?.via||"unknown"}).`);
      state[part.key]={...state[part.key],status:"delivered",via:result?.via||part.surface,
        discord_message_id:result?.messageId||result?.id||null,channel_id:result?.channelId||null};
      delivered.push(part.key);
    }catch(error){
      state[part.key]={...state[part.key],status:"uncertain",error:String(error?.message||error).slice(0,500)};
      failed.push({key:part.key,error});uncertain.push(part.key);
      plan={...plan,delivery_state:state};savePlan(plan);break;
    }
    plan={...plan,delivery_state:state};savePlan(plan);
  }
  if(uncertain.length){plan={...plan,delivery_state:state};savePlan(plan);}
  return {plan,delivered,failed,uncertain};
}
