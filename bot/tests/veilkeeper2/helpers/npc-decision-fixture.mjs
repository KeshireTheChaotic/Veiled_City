import {openSceneStore} from '../../../src/v2/scene-store.js';
import {openKnowledgeStore} from '../../../src/v2/knowledge-store.js';
import {createSourceAuthority} from '../../../src/v2/source-authority.js';
import {createContextAuthority} from '../../../src/v2/context-authority.js';
export function npcDecisionFixture(){
 const sceneStore=openSceneStore(),knowledge=openKnowledgeStore(),check=()=>{},reads=[];
 sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'native-fixture',records:[
  {kind:'session',data:{id:'session',campaignId:'c',status:'active'}},
  {kind:'scene',data:{id:'scene',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},
  {kind:'channel',data:{id:'private',campaignId:'c',sceneId:'scene',kind:'private',permissionsVerified:true,recipientIds:['u'],writerIds:['u'],ownerUserId:'u'}},
  {kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'scene',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},
  {kind:'actor',data:{id:'clerk',campaignId:'c',sceneId:'scene',kind:'npc',status:'active',controllerUserId:null,name:'Ilex'}},
  {kind:'message',data:{id:'message',campaignId:'c',channelId:'private',userId:'u',deleted:false,text:'OOC private thought: I suspect the clerk. CURRENT-PLAYER-SECRET-CANARY'}}
 ].map(r=>({...r,expectedRevision:null}))},{check});
 const authority=createSourceAuthority(sceneStore.readers),source=authority.authenticate({campaignId:'c',messageId:'message',actorId:'pc',userId:'u'}),records={metadata:knowledge.metadata,readText:(...args)=>{reads.push(args[1]);return knowledge.readText(...args);}};
 const context=createContextAuthority({sourceAuthority:authority,records,readActor:sceneStore.readers.readActor});
 function add(id,body,patch={}){return knowledge.append({campaignId:'c',id,expectedRevision:null,evidenceRef:'e:'+id,metadata:{status:'active',kind:'fact',scope:'scene',sceneId:'scene',visibility:'recipients',disclosure:'acknowledged',recipientIds:['u'],knownBy:['clerk'],sourceRefs:[],...patch},body});}
 add('clerk-portrait','Ilex is the night clerk. His voice is dry and precise; he uses ledger metaphors and short sentences. He wants to close the counter before the last tram and dislikes owing favors.');
 add('observed-scene','At the tram-depot counter, rain ticks on the glass. A stamped parcel remains on the counter. Ilex has not offered it yet. Mira is nearby; Mira has not agreed to take the parcel.');
 add('heard-rumor','A courier told Ilex there is a sleeper beneath the viaduct. Ilex has no independent confirmation.',{kind:'testimony'});
 add('gm-secret','The parcel is actually an occult decoy. GM-MYSTERY-CANARY',{visibility:'gm',disclosure:'private',recipientIds:[]});
 add('other-pc-secret','OTHER-PLAYER-CANARY',{recipientIds:['v'],knownBy:[]});
 add('unheard','UNHEARD-CANARY: secret whispered elsewhere.',{knownBy:[]});
 return {sceneStore,knowledge,authority,source,context,reads,add,grant:()=>context.issue(source,['clerk-portrait','observed-scene','heard-rumor','gm-secret','other-pc-secret','unheard'],{actorId:'clerk'}),close(){knowledge.close();sceneStore.close();}};
}
