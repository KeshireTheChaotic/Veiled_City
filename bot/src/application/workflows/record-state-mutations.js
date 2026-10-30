/** Record original correlated mutation evidence inside the caller transaction; no independent commit. */
export function recordStateMutations(db,guildId,{sessionId,provenance,scope,source,events,eventResults,relationships,relationshipResults,handouts,handoutResults,cognition}){
    const base={sessionId,actorType:provenance.actorType||"ai",actorId:provenance.actorId||scope.actorUserId||"veilkeeper",sourceLayer:source,sourceInteractionId:provenance.interactionId||null,sourceMessageId:provenance.messageId||null,confidence:provenance.confidence??100,rationale:provenance.rationale||"",triggerText:provenance.triggerText||""};
    eventResults.forEach((result,index)=>{
      if(!result?.ok&&!result?.expectedConflict) return;
      db.recordMutation(guildId,{...base,
        mutationType:`event:${events[index]?.type||result.type||"unknown"}`,
        entityKey:events[index]?.key||result.key||result.id||"",
        visibility:result.visibility||result.after?.visibility||events[index]?.visibility||"gm",
        before:result.before??{},after:result.after??result,payload:events[index]||{}
      });
    });
    relationshipResults.forEach((result,index)=>{
      if(!result?.ok) return;
      db.recordMutation(guildId,{...base,mutationType:"relationship",entityKey:result.row?.id||"",
        visibility:result.row?.visibility||"gm",before:result.before??{},after:result.after??result.row??result,payload:relationships[index]||{}
      });
    });
    handoutResults.forEach((result,index)=>{
      if(!result?.ok) return;
      db.recordMutation(guildId,{...base,mutationType:"handout",entityKey:result.row?.id||"",
        visibility:result.row?.visibility||"gm",after:result.row||result,payload:handouts[index]||{}
      });
    });
    cognition.memories.filter(x=>x?.ok).forEach(result=>db.recordMutation(guildId,{...base,mutationType:"npc_memory",entityKey:`${result.row?.npc_key||""}:${result.row?.id||""}`,visibility:"gm",before:result.before??{},after:result.after??result.row,payload:result.draft||{}}));
    cognition.knowledge.filter(x=>x?.ok).forEach(result=>db.recordMutation(guildId,{...base,mutationType:"npc_knowledge",entityKey:`${result.row?.npc_key||""}:${result.row?.knowledge_key||""}`,visibility:"gm",before:result.before??{},after:result.after??result.row,payload:result.draft||{}}));
    cognition.goals.filter(x=>x?.ok).forEach(result=>db.recordMutation(guildId,{...base,mutationType:"npc_goal",entityKey:`${result.row?.npc_key||""}:${result.row?.goal_key||""}`,visibility:"gm",before:result.before??{},after:result.after??result.row,payload:result.draft||{}}));
}
