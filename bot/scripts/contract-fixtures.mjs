/** Hand-authored synthetic service doubles; no recorded player material or network clients. */
import assert from "node:assert/strict";
export class FakeResponses {
  constructor(outputs=[]){this.outputs=[...outputs];this.requests=[];this.responses={create:async request=>{
    this.requests.push(structuredClone(request));assert(this.outputs.length,"Unexpected model call");
    const next=this.outputs.shift();if(next instanceof Error) throw next;
    return typeof next==="string"?{output_text:next}:{output_text:JSON.stringify(next)};
  }};}
}
export function fakeInteraction({gm=true,sub="status",json=null}={}){
  const deliveries=[];
  return {guildId:"contract",user:{id:"gm"},memberPermissions:{has:()=>gm},member:{roles:{cache:new Map()}},deliveries,
    options:{getSubcommand:()=>sub,getString:key=>key==="json"&&json?JSON.stringify(json):null},
    reply:async payload=>deliveries.push(payload),deferReply:async()=>{},editReply:async payload=>deliveries.push(payload)};
}
