#!/usr/bin/env node
/** Purposeful source-backed feature-selection scenario using the existing disposable harness. */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runAf07Scenario,createAf07MockAi} from './af07-codex-scene.mjs';
import {createChatGptClient} from '../src/frameworks/ai-provider/public.js';
import {createArbitrationOrigin,arbitrationPromptBoard} from '../src/scene-intent-board.js';
import {worldInputKey} from '../src/frameworks/world/public.js';
import {inspectGroupFeature} from '../src/native-group-features.js';

export async function runAf07FeatureScene({live=false,aiFactory}={}){
  let goalAvailable=false,eligibleFeatureCount=0;
  const modelAttempts=[];
  const result=await runAf07Scenario({live,aiFactory:context=>{
    const {fixture:f,messageId}=context;
    f.db.upsertNpcGoal(f.guild,{npcKey:f.npc,goalKey:'break-contact',title:'Break contact with witnesses',
      objective:'Create an opening to withdraw from the nearby witnesses before they can follow. Avoid unnecessary killing; use current legal capabilities and leave all player responses to their owners.',
      priority:90,acceptableMethods:['disrupt pursuit','protect own withdrawal'],source:'af07:npc-arrival'});
    const origin=createArbitrationOrigin(f.db,f.guild,{mode:'party',actorUserId:'owner-af07',actorCharacterId:f.pc.id},worldInputKey(messageId,f.pc.id)),
      board=arbitrationPromptBoard(f.db,f.guild,origin),candidate=board.npc_candidates.find(n=>n.actor_key===f.npc);
    goalAvailable=candidate?.objective_refs.includes('break-contact')===true;
    eligibleFeatureCount=candidate?.action_features.length||0;
    if(!goalAvailable||!eligibleFeatureCount)throw new Error('Source-backed scenario goal or native capabilities are unavailable.');
    const client=aiFactory?.(context)||(live?createChatGptClient():createAf07MockAi(context));
    return {...client,responses:{...client.responses,async create(request){
      const response=await client.responses.create(request);
      try{
        const output=JSON.parse(response.output_text),claims=output.narrative_claims||[],decisions=output.unified_arbitration?.decisions||[];
        modelAttempts.push({decisions:decisions.length,
          eligibleFeatureSelections:decisions.filter(d=>candidate.action_features.some(f=>f.feature_ref===d.feature_ref)).length,
          lifecycleClaims:claims.filter(c=>c.action==='status').map(c=>({
            actualLifecycleValue:['active','dead','removed','retired'].includes(c.proposed),committed:c.certainty==='committed'}))});
      }catch{modelAttempts.push({structuredOutputParsed:false});}
      return response;
    }}};
  },verifyCommittedScene:({fixture:f,executions})=>({
    sourceVerifiedFeatures:executions.map(e=>{
      const {execution}=inspectGroupFeature(f.db,f.guild,e.record_key);
      return {feature:execution.data.feature,status:execution.status,ownerInvitations:execution.data.children.length};
    })
  })});
  return {...result,goalAvailable,eligibleFeatureCount,modelAttempts,
    featureSelectionProven:result.verification.sourceVerifiedFeatures.length>0,
    authority:'NPC goal and abilities are supplied as context; the model chooses its tactic. Owner reactions remain pending.'};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.slice(2).join(' ')!=='--live-codex'){
    console.error('No action taken. Supply --live-codex for one authorized Codex-backed feature-selection scene.');process.exitCode=2;
  }else{
    try{console.log(JSON.stringify(await runAf07FeatureScene({live:true}),null,2));}
    catch(error){
      const marker=Number.isInteger(error?.status)?`status ${error.status}`:error?.name||'Error';
      console.error(`AF07 feature scene failed (${marker}); no credential or guild details were emitted.`);process.exitCode=1;
    }
  }
}
