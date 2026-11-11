import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createNativeActionAuthority} from '../../src/v2/native-action-authority.js';
import {createProviderFromEnv} from '../../src/v2/native-start.js';
import {createRehearsal} from '../../src/v2/rehearsal.js';

// Synthetic in-memory owner decision only. No Discord client, real user, campaign or database.
if(process.env.VK2_SYNTHETIC_ENGINE_TEST!=='1')throw new Error('Explicit synthetic-engine test opt-in required');
const scenes=openSceneStore(),registry=openSourceRegistry(),actions=openActionStore(),check=()=>{};
const control=process.env.VK2_TRANSPORT_CONTROL==='1',discovery=process.env.VK2_DISCOVERY_CHECK==='1';
const report={variant:discovery?(control?'native-discovery-control':'native-discovery'):control?'transport-control':'gm-runtime',model:'qwen3.5:4b',ownerConsent:'synthetic-native-fixture',discordMessages:0,realCampaignEffects:0};
try{
  scenes.commitSnapshot({campaignId:'qualification',principal:'fixture-gm',sourceRef:'setup',records:[
    {kind:'session',data:{id:'session',campaignId:'qualification',status:'active'}},
    {kind:'scene',data:{id:'s',campaignId:'qualification',sessionId:'session',status:'active',participants:[{userId:'fixture-owner',actorId:'pc',presence:'present'}]}},
    {kind:'actor',data:{id:'pc',campaignId:'qualification',sceneId:'s',kind:'pc',status:'active',ownerUserId:'fixture-owner',controllerUserId:'fixture-owner',controlRole:'owner'}},
    {kind:'channel',data:{id:'private',campaignId:'qualification',sceneId:'s',kind:'private',ownerUserId:'fixture-owner',permissionsVerified:true,recipientIds:['fixture-owner'],writerIds:['fixture-owner']}},
    {kind:'message',data:{id:'attempt',campaignId:'qualification',channelId:'private',userId:'fixture-owner',deleted:false,text:'I attempt the fixture action.'}},
    {kind:'message',data:{id:'choice',campaignId:'qualification',channelId:'private',userId:'fixture-owner',deleted:false,text:discovery?'Please process my already accepted Hope cost.': 'Synthetic transport test: process my already accepted native Hope cost. Use action_propose with your current context source_ref, actor_ref pc, action kind hope_cost.commit and parameters action_ref test-cost, consent_ref test-consent. Do not invent any other action or outcome.'}}
  ].map(r=>({...r,expectedRevision:null}))},{check});
  actions.initializeHope({campaignId:'qualification',actorId:'pc',ownerUserId:'fixture-owner',hope:3,cap:6},{check});
  actions.initializePcDefenses({campaignId:'qualification',actorId:'pc',ownerUserId:'fixture-owner',controlRevision:'1',hp:{current:0,max:6},armorSlots:{current:3,max:3}},{check});
  actions.initializePcLife({campaignId:'qualification',actorId:'pc',ownerUserId:'fixture-owner',controlRevision:'1',sourceRef:'fixture-reviewed-profile',sourceRevision:'1',level:2,stress:{current:0,max:6}},{check});
  const character={id:'pc',guild_id:'qualification',owner_user_id:'fixture-owner',status:'active',data:{level:2,resources:{hp:{current:0,max:6},armor:{current:3,max:3},stress:{current:0,max:6},hope:3,hope_max:6}}};
  const canonical=createCanonicalActorReaders({sceneStore:scenes,actionStore:actions,characterRepository:{getCharacter:()=>character}}),readers={...canonical.readers,sourceRegistry:registry},authority=createSourceAuthority(readers),event=id=>({campaignId:'qualification',messageId:id,userId:'fixture-owner',actorId:'pc'}),origin=authority.authenticate(event('attempt')),choice=authority.authenticate(event('choice'));
  const identity={id:'test-cost',kind:'hope_cost',campaignId:'qualification',sceneId:'s',actorId:'pc',ownerUserId:'fixture-owner',sourceRef:origin.id,sourceRevision:origin.revision};
  actions.create(identity,{check});actions.registerHopeTerms({...identity,revision:'terms-1',controlRevision:'1',cost:{resource:'hope',slot:'base',amount:2}},{check});actions.transition({campaignId:'qualification',actionId:'test-cost',sourceRef:'fixture-notice',expectedRevision:1,to:'awaiting_consent'},{check});
  actions.recordHopeConsent({id:'test-consent',campaignId:'qualification',sceneId:'s',actorId:'pc',ownerUserId:'fixture-owner',sourceRef:origin.id,sourceRevision:origin.revision,choiceSourceRef:choice.id,choiceSourceRevision:choice.revision,actionRef:'test-cost',actionRevision:'terms-1',amount:2,costSlot:'base',revision:'1',status:'accepted'},{check});
  const provider=await createProviderFromEnv({VK2_PROVIDER:'ollama',VK2_MODEL:'qwen3.5:4b',VK2_MAX_TURNS:'3'}),native=createNativeActionAuthority({sourceAuthority:authority,readActor:canonical.readActor,actionStore:actions}),app=createRehearsal({readers,records:{metadata:()=>null,readText:()=>null},provider:{generate:async input=>{const result=await provider.generate(control?{...input,instructions:discovery?'This is a synthetic tool transport test, not fiction. First call context_read with topic actions. Then call action_propose using exactly one returned native operation object, without optional fields. Report the final native result in one short sentence. Do not invent references, a result, or narrative.':'This is a synthetic tool transport test, not fiction. First call action_propose with source_ref from the current context, actor_ref pc, action kind hope_cost.commit, and parameters action_ref test-cost, consent_ref test-consent. Omit the optional expected_revision and reason fields entirely; do not use schema placeholder strings. After the native tool result, report its status in one short sentence. Do not invent a result or write narrative.'}:input);(report.toolTrace??=[]).push({calls:result.toolCalls??[],previousNativeResults:input.history?.at(-1)?.toolResults??[]});return result;}},actionAuthority:native});
  const started=performance.now();
  try{const turn=await app.respond(event('choice')),draft=app.inspectPublication(turn.publication.id);Object.assign(report,{modelCalls:provider.used,metrics:turn.metrics,elapsedMs:Math.round(performance.now()-started),output:draft.text,receiptDependencies:draft.receiptDependencies,sent:draft.sent});}
  catch(error){Object.assign(report,{modelCalls:provider.used,elapsedMs:Math.round(performance.now()-started),held:true,errorCode:error?.code??error?.message});}
  report.fixtureHopeAfter=actions.readHope('qualification','pc').hope;report.engineCommitted=actions.readOutcome('qualification','test-cost')?.effectsCommitted===true;
  report.engineOrchestrationPassed=report.engineCommitted&&report.fixtureHopeAfter===1&&report.receiptDependencies?.length===1;
  if(!report.engineOrchestrationPassed)process.exitCode=1;
}finally{
  actions.close();registry.close();scenes.close();
  const directory=fileURLToPath(new URL('../../../.reports/',import.meta.url));mkdirSync(directory,{recursive:true});writeFileSync(directory+(discovery?(control?'ollama-native-cost-discovery-control.json':'ollama-native-cost-discovery.json'):control?'ollama-native-cost-control.json':'ollama-native-cost-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
