import {createHash} from 'node:crypto';
import {createRehearsal} from '../../../src/v2/rehearsal.js';
import {createProseMaterialReview} from '../../../src/v2/prose-material-review.js';

/** Synthetic scenes, actual source/context/gateway/queue. Never sends or writes gameplay. */
export function conversationFixture(scenario,provider){
  const canary='GM-PRIVATE-conversation-canary-71c4',bodies=new Map([
    ['scene',scenario.facts],['voice',scenario.portrayal],['claim',scenario.testimony],['private',canary]
  ].filter(([,text])=>text));
  const textReads=[],requests=[];
  const actor={id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'};
  const channel={id:'ch',campaignId:'c',sceneId:'s',revision:'1',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']};
  const records={metadata:(_c,ref)=>bodies.has(ref)?{id:ref,campaignId:'c',revision:'1',status:'active',kind:ref==='claim'?'testimony':'observation',scope:'scene',sceneId:'s',visibility:ref==='private'?'gm':'recipients',disclosure:'observed',sourceRefs:[],recipientIds:['u'],knownBy:[],contentHash:createHash('sha256').update(bodies.get(ref)).digest('hex')}:null,
    readText:(_c,ref)=>{textReads.push(ref);return {revision:'1',text:bodies.get(ref)};}};
  const app=createRehearsal({provider:{async generate(input){requests.push(input);return provider.generate(input);}},
    readers:{readMessage:()=>({id:scenario.id,campaignId:'c',userId:'u',channelId:'ch',revision:'1',deleted:false,text:scenario.utterance}),readChannel:()=>channel,readActor:()=>actor,
      readScene:()=>({id:'s',campaignId:'c',sessionId:'session',status:'active',revision:'1',participants:[{userId:'u',actorId:'pc',presence:'present'}]}),readSession:()=>({id:'session',campaignId:'c',status:'active',revision:'1'})},
    records,selectContext:()=>[...bodies.keys()],
    proseReview:createProseMaterialReview({readControlledNames:()=>['Mira','Rook','Tamsin'],readIndependentSpeakers:()=>['Iona','Nessa','Venn','Ada','Bram','Pell','Sal','Jules']})});
  return {app,event:{campaignId:'c',messageId:scenario.id,userId:'u',actorId:'pc'},canary,textReads,requests,channel};
}
