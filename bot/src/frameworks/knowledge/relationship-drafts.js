import {createHash} from 'node:crypto';
import {relationshipProvenance,inferredSource} from './presentation-evidence-service.js';
import {knowledgeWorldEvents} from './contracts/world-events.js';
const {indexWorldEvent}=knowledgeWorldEvents;

function resolveRelationshipEndpoint(db,guildId,type,key,label=""){
  if(type==="character"){
    const c=db.getCharacter(key)||db.findGuildCharacter(guildId,key,{includeClosed:true})||db.findGuildCharacter(guildId,label,{includeClosed:true});
    if(c) return {key:c.id,label:c.name};
    throw new Error(`Relationship character endpoint not found: ${key||label||"(empty)"}.`);
  }
  const raw=String(key||label||"").trim();
  if(!raw) throw new Error(`Relationship ${type||"entity"} endpoint is empty.`);
  return {key:raw.includes(":")?raw:db.relationshipEntityKey(type,raw),label:String(label||raw)};
}

export function applyRelationshipDrafts(db,guildId,relationships=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},source="ai_gm"){
  const out=[];
  for(const r of relationships||[]){
    try{
      const from=resolveRelationshipEndpoint(db,guildId,r.from_type,r.from_key,r.from_label);
      const to=resolveRelationshipEndpoint(db,guildId,r.to_type,r.to_key,r.to_label);
      if(scope.mode==="private"&&scope.actorCharacterId){
        const characterEndpoints=[r.from_type==="character"?from.key:null,r.to_type==="character"?to.key:null].filter(Boolean);
        if(characterEndpoints.some(id=>id!==scope.actorCharacterId)){
          out.push({ok:false,blocked:true,error:"Private relationship draft cannot mutate another player character's relationship state.",draft:r});
          continue;
        }
      }
      let visibility=r.visibility||"party";
      if(scope.mode==="private") visibility=scope.actorCharacterId?"character":"gm";
      const existing=db.findRelationship(guildId,{fromType:r.from_type,fromKey:from.key,toType:r.to_type,toKey:to.key,relationshipType:r.relationship_type||"other"});
      const provenance=inferredSource(source)?relationshipProvenance(db,guildId,r,scope,existing):null;
      if(provenance&&(r.from_type==="character"||["debt","obligation"].includes(r.relationship_type))){
        const key=`relationship-interpretation:${createHash("sha256").update(JSON.stringify([db.getActiveSession(guildId)?.id,scope,r])).digest("hex").slice(0,40)}`;
        const cause=indexWorldEvent(db,guildId,{key,source_id:source,kind:"relationship_interpretation",title:"Nonbinding directional relationship interpretation",
          visibility,subject_key:scope.actorCharacterId||undefined,details:{epistemic:provenance.epistemic,authority:"Interpretation only; not PC feelings, debt or agreement"}},source);
        const proposal=db.getCityRecord(guildId,"relationship_interpretation",key)||db.saveCityRecord(guildId,{kind:"relationship_interpretation",key,status:"pending",source_event:cause.event_key,visibility,subject_key:scope.actorCharacterId||undefined,
          data:{draft:r,provenance,authority:"Nonbinding interpretation only; no PC feelings, debt, consent or authoritative score"}});
        out.push({ok:true,row:{...proposal,id:proposal.record_key},before:existing||null,after:proposal,interpretation_only:true});continue;
      }
      const score=r.mode==="delta"?Math.max(-5,Math.min(5,Number(existing?.score||0)+Number(r.score||0))):Math.max(-5,Math.min(5,Number(r.score||0)));
      const row=db.upsertRelationship(guildId,{fromType:r.from_type,fromKey:from.key,fromLabel:from.label,toType:r.to_type,toKey:to.key,toLabel:to.label,relationshipType:r.relationship_type||"other",score,visibility,note:r.note||"",source,sourceCharacterId:scope.actorCharacterId||null,provenance});
      out.push({ok:true,row,before:existing||null,after:row});
    }catch(err){out.push({ok:false,error:String(err.message||err),draft:r});}
  }
  return out;
}
