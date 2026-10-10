/** Shared production turn commit boundary: native state, proposals and intent receipts commit before publication. */
import { applyAuthoritativeMutation, applyCanonProposalDrafts } from "./state.js";
import { validateDecisionAdvisory } from "./decision-advisory.js";
import { queueTurnPublications } from "./publication-outbox.js";
import { resolveTypedNativeRolls } from "./typed-mechanics.js";
export function commitGmTurn({db,guild,session,result,scope,speaker,label,meta={},content=null}){
  const decision_advisory=validateDecisionAdvisory(db,guild.id,result);
  const mutates=(result.ai_intents||[]).length||(result.events||[]).some(e=>e.type!=="log_only")||(result.relationships||[]).length||(result.handouts||[]).length||(result.npc_memories||[]).length||(result.npc_knowledge||[]).length||(result.npc_goals||[]).length||(result.simulation_updates||[]).length;
  if(mutates||(result.context_memories||[]).some(x=>x.retention==="durable")||(result.world_additions||[]).length||(result.scene_actions||[]).length||(result.world_conflicts||[]).length)
    db.snapshotCampaign(guild.id,{label,reason:`Automatic snapshot before eventful GM turn by ${speaker}`,createdBy:"veilkeeper"});
  return db.transaction(()=>{
    if(decision_advisory) db.audit(guild.id,session.id,"ai",scope.actorUserId||"veilkeeper","gm_decision_advisory",decision_advisory);
    const mutation=applyAuthoritativeMutation(db,{
      guildId:guild.id,
      sessionId:session.id,
      narrative:result,
      events:result.events||[],
      relationships:result.relationships||[],
      handouts:result.handouts||[],
      npcMemories:result.npc_memories||[],
      npcKnowledge:result.npc_knowledge||[],
      npcGoals:result.npc_goals||[],simulationUpdates:result.simulation_updates||[],
      scope,
      source:"ai_gm",
      content,
      provenance:{actorType:"ai",actorId:scope.actorUserId||"veilkeeper",messageId:meta.messageId||null,triggerText:meta.triggerText||"",rationale:Object.values(result.state_review||{}).filter(x=>x&&x.reason).map(x=>x.reason).join(" | "),confidence:Math.min(...Object.values(result.state_review||{}).filter(x=>x&&Number.isFinite(Number(x.confidence))).map(x=>Number(x.confidence)),100)}
    });
    // Dice RNG occurs only in final commit. Preview never samples dice and cannot accidentally reroll.
    const nativeRolls=resolveTypedNativeRolls(db,guild.id,scope,result.player_intents||[],meta.messageId||'');
    mutation.intents=[...(mutation.intents||[]),...nativeRolls];
    const proposalMap=new Map();
    const addProposal=(d)=>{
      const key=String(d?.key||"").trim().toLowerCase();
      const value=String(d?.value||"").trim();
      if(!key||!value) return;
      const id=`${key}\u0000${value}`;
      if(!proposalMap.has(id)) proposalMap.set(id,{key,value,visibility:d.visibility||"party",reason:d.reason||""});
    };
    for(const d of result.canon_proposals||[]) addProposal(d);
    if(scope.mode==="private"){
      for(const r of mutation.events||[]){
        if(r?.blocked&&r.type==="canon"&&r.event?.key&&String(r.event?.value||"").trim()){
          addProposal({key:r.event.key,value:r.event.value,visibility:["public","party","gm"].includes(String(r.event.visibility||"").toLowerCase())?r.event.visibility:"party",reason:r.event.note||"Converted from a blocked private-scene canon attempt."});
        }
      }
    }
    const canonProposals=applyCanonProposalDrafts(db,guild.id,session.id,[...proposalMap.values()],scope,meta);
    for(const r of mutation.events||[]){
      if(!(r?.blocked&&r.type==="canon"&&r.event?.key)) continue;
      const key=String(r.event.key||"").trim().toLowerCase();
      const value=String(r.event.value||"").trim();
      const p=canonProposals.find(x=>x?.ok&&x.row?.canon_key===key&&x.row?.proposed_value===value);
      if(p){ r.proposal_id=p.row.id; r.proposal_status=p.row.status; }
    }
    if(meta.turnId){
      db.updateTurnAttempt(meta.turnId,{stage:"committed",committed:"yes",nativeCommitId:`turn:${meta.turnId}`});
      queueTurnPublications(db,{guild,session,result,scope,turnId:meta.turnId,channelId:meta.channelId||null});
    }
    return {...mutation,canonProposals,decision_advisory};
  });
}
