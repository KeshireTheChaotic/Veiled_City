/** Native GM-owned nonbinding local prop text. Not a PC decision or a mechanical adapter. */
import {sceneFictionHash as hash,sceneFictionFailure as fail} from './scene-fiction-context.js';
import {quoteNpcWords} from './fresh-npc-authoring.js';
import {narrativeWorldPrimitives} from './frameworks/narrative/public.js';
const {indexWorldEvent}=narrativeWorldPrimitives;
const issuer='native:narrative-artifact';
export const narrativeArtifactKey=(binding,u)=>`narrative-artifact:${hash([binding,u])}`;
export const hasNarrativeChoices=text=>/\b(?:choose|pick|select) (?:one of|from the following|an option)|\b(?:reply|answer|respond) (?:with )?(?:yes or no|accept or decline)\b/i.test(text)
  ||/(?:^|\n)\s*A[).:].*\n\s*B[).:]/i.test(text);
// Compatibility input grammar for a WHOLE local authored prop. The prefix is
// discarded; native attribution and escaping own the final presentation.
// Ordinary surrounding prose is never exempted by a quoted substring or label.
function proposal(u,ctx){
  if(u.kind!=='scene'||u.subject_key||!ctx.binding.location||(u.location_key||ctx.binding.location)!==ctx.binding.location)return null;
  const m=/^(?:A|An|The) (sign|notice|menu|document) reads: ([^\r\n]+)$/u.exec(u.text);
  if(!m)return null;
  return {version:1,issuer,kind:m[1],words:m[2],binding:ctx.binding,unit_hash:hash(u),authority:'nonbinding_GM_prop_text_only'};
}
export function projectNarrativeArtifact(db,guild,u,ctx,{establish=false,historical=false}={}){
  const d=proposal(u,ctx);if(!d)return null;
  if(!db.getSimulationEntity(guild,'location',ctx.binding.location))throw fail('held_scope');
  const key=narrativeArtifactKey(ctx.binding,u),row=db.getCityRecord(guild,'narrative_artifact',key);
  if(historical&&!row)return null; // Do not reinterpret or rewrite old accepted v8 rows.
  if(establish&&!row){
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_narrative_artifact',source_id:issuer,
      title:'GM-authored local nonbinding prop',visibility:u.visibility,subject_key:ctx.scope.mode==='private'?ctx.scope.actorCharacterId:null,
      session_id:ctx.binding.session,scene:ctx.binding.scene,location_key:ctx.binding.location,
      details:{input_source:ctx.sourceRef,payload_hash:hash(d)}},issuer);
    db.saveCityRecord(guild,{kind:'narrative_artifact',key,status:'established',source_event:event.event_key,
      visibility:u.visibility,subject_key:event.subject_key,location_key:event.location_key,data:d});
  }else if(row){
    const e=db.getWorldEvent(guild,row.source_event);
    if(row.status!=='established'||hash(row.data)!==hash(d)||e?.status!=='active'||e.source_id!==issuer||e.details.payload_hash!==hash(d))throw fail('held_scope');
  }
  return `A local ${d.kind} reads (nonbinding text):\n${quoteNpcWords(d.words)}`;
}
