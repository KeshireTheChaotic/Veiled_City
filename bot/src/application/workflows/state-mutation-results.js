/** Aggregate native mutation receipts without accepting failed writes. */
export function assertMutationSuccess({events=[],relationships=[],handouts=[],npcMemories=[],npcKnowledge=[],npcGoals=[]}={}){
  const failures=[];
  for(const [kind,rows] of [["event",events],["relationship",relationships],["handout",handouts],["npc_memory",npcMemories],["npc_knowledge",npcKnowledge],["npc_goal",npcGoals]]){
    rows.forEach((row,index)=>{
      // Canon conflicts are expected control-flow and remain committed for GM resolution.
      if(row?.ok===false&&!row?.expectedConflict&&!row?.blocked) failures.push({kind,index,error:row.error||"mutation failed",row});
    });
  }
  if(failures.length){
    const err=new Error(`Authoritative state mutation rejected: ${failures.map(f=>`${f.kind}[${f.index}]: ${f.error}`).join("; ")}`);
    err.code="STATE_MUTATION_REJECTED";
    err.failures=failures;
    throw err;
  }
  return true;
}
