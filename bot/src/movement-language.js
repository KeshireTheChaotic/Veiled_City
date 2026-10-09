/** Semantic movement candidates preserve authored meaning while native validators retain all travel authority. */
import { currentScene } from "./scene-continuity.js";
import { stateRevision } from "./ai-intents.js";

const movement=/\b(?:duck|slip|head|cut|go|walk|step|move|return|enter|leave|take)\b/i;
const conditional=/\b(?:if|might|would|could|hypothetically|suppose|imagine|planning)\b/i;

function quotedAt(text,index){return (text.slice(0,index).match(/["“”]/g)||[]).length%2===1;}

/** Persist only exact model-selected intended-action spans from the authenticated current message. */
export function persistMovementCandidates(db,guild,interpretation,scope,provenance={}){
  if(!interpretation||!provenance.messageId)return [];
  const source=db.getWorldEvent(guild,String(interpretation.source_ref).replace(/^event:/,""));
  if(!source||source.details.message_id!==provenance.messageId)return [];
  const text=String(source.details.text||""),pc=db.getCharacter(scope.actorCharacterId),scene=currentScene(db,guild),rows=[];
  for(const [index,span] of (interpretation.intended_actions||[]).entries()){
    const offset=text.indexOf(span);
    if(offset<0||!movement.test(span)||conditional.test(span)||quotedAt(text,offset))continue;
    const refs=(interpretation.references||[]).filter(ref=>ref.entity_type==="location"
      &&["resolved","candidate"].includes(ref.status)&&span.toLowerCase().includes(ref.phrase.toLowerCase()));
    const target=refs.length===1?refs[0].entity_key:"";
    const targetDescription=refs.length===1?refs[0].phrase:span.replace(/^.*?\b(?:into|inside|to|for|toward|towards|back|through)\s+/i,"").trim();
    const key=`movement:${source.event_key}:${index}`,prior=db.getCityRecord(guild,"movement_candidate",key);
    if(prior){rows.push(prior);continue;}
    rows.push(db.saveCityRecord(guild,{kind:"movement_candidate",key,status:"candidate",source_event:source.event_key,
      visibility:source.visibility,subject_key:source.subject_key||null,data:{intent:"move",source_span:span,
        from_ref:pc?.data.location||null,from_revision:pc?.data.location?stateRevision(db.getSimulationEntity(guild,"location",pc.data.location)):"absent",
        target_ref:target,target_description:targetDescription,tense:"present",conditional:false,actor:pc?.id||"",
        context_refs:refs.flatMap(ref=>ref.source_refs).slice(0,8),session_id:scene.session_id,scene:scene.key,
        authority:"Semantic candidate only; native ownership, geography, access, encounter and cost checks still required."}}));
  }
  return rows;
}

export function currentMovementCandidate(db,guild,pc,sourceSpan,target,scope){
  const scene=currentScene(db,guild),rows=db.listCityRecords(guild,{kind:"movement_candidate",includeGM:true,limit:100})
    .filter(row=>["public","party"].includes(row.visibility)||scope.mode==="private"&&row.visibility==="character"&&row.subject_key===pc.id);
  const matches=rows.filter(row=>row.status==="candidate"&&row.data.actor===pc.id&&row.data.source_span===sourceSpan
    &&row.data.session_id===scene.session_id&&row.data.scene===scene.key&&(row.data.from_ref??null)===(pc.data.location??null)
    &&(!row.data.target_ref||row.data.target_ref===target));
  return matches.length===1?matches[0]:null;
}
