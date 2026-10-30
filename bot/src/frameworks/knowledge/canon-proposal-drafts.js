import {ownerSemanticSource,semanticCandidateHash} from './semantic-candidate-service.js';

export function applyCanonProposalDrafts(db,guildId,sessionId,drafts=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},meta={}){
  const out=[];
  for(const d of drafts||[]){
    if(scope.mode!=="private"){
      out.push({ok:false,blocked:true,error:"Player canon proposals are accepted only from a private player→GM scene.",draft:d});
      continue;
    }
    if(!scope.actorUserId||!scope.actorCharacterId){
      out.push({ok:false,blocked:true,error:"A private player canon proposal requires an acting player character so its origin can be recorded.",draft:d});
      continue;
    }
    const key=String(d?.key||"").trim().toLowerCase();
    const value=String(d?.value||"").trim();
    if(!key||!value) throw new Error("Canon proposal draft requires key and value.");
    const visibility=["public","party","gm"].includes(String(d?.visibility||"").toLowerCase())?String(d.visibility).toLowerCase():"party";
    let verified;
    for(const intent of meta.typedIntents||[]){
      if(intent.data?.operation!=='proposal_campaign_canon')continue;
      try{
        const candidate=ownerSemanticSource(db,guildId,intent.record_key,scope,'proposal_campaign_canon',meta.messageId);
        if(candidate.statement.includes(value)){verified=candidate;break;}
      }catch(error){if(error.code!=='SEMANTIC_PROPOSAL')throw error;}
    }
    if(!verified){out.push({ok:false,blocked:true,error:'Canon draft lacks its current typed private owner request and exact authored value.',draft:d});continue;}
    const before=db.findCanonProposalByCharacterValue(scope.actorCharacterId,key,value);
    const row=db.upsertCanonProposal(guildId,scope.actorCharacterId,null,{
      key,value,visibility,reason:String(d?.reason||"").trim()
    },{
      source:"typed_private_proposal_v2",
      proposedByUserId:scope.actorUserId,
      proposedByCharacterId:scope.actorCharacterId,
      sessionId:sessionId||null,
      channelId:meta.channelId||null,
      messageId:meta.messageId||null
    });
    if(!['accepted','rejected'].includes(row.status))db.saveCityRecord(guildId,{kind:'canon_proposal_source',key:row.id,
      status:'verified',visibility:'gm',source_event:verified.source.event_key,data:{version:1,proof:verified.proof,
        terms_hash:semanticCandidateHash([row.character_id,row.proposed_by_user_id,row.canon_key,row.proposed_value,row.proposed_visibility])}});
    out.push({ok:true,row,created:!before,source:"player_private_scene"});
  }
  return out;
}
