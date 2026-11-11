import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createNativeRoot} from '../../src/v2/native-root.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(t,{bootstrap=true,proposeKnowledge=false}={}){
  const directory=mkdtempSync(join(tmpdir(),'vk2-conversation-life-')),client=new EventEmitter(),packets=[];
  const character={id:'pc',guild_id:'c',owner_user_id:'u',name:'Mercer',status:'active',data:{level:2,resources:{hp:{current:0,max:6},armor:{current:3,max:3},stress:{current:0,max:6},hope:3,hope_max:6},gm_private:'private-hook-must-not-reach-inference'}};
  const repository={getCharacter:()=>structuredClone(character),listCharacters:()=>[structuredClone(character)]},members=new Map(['bot','u'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}]));
  const channel={id:'private',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),messages:{fetch:async({message})=>({id:message,guildId:'c',channelId:'private',author:{id:'u',bot:false},webhookId:null,system:false,content:'Interesting.',editedTimestamp:null})}};
  const guild={id:'c',memberCount:2,members:{list:async()=>members},roles:{fetch:async()=>new Map([['gm',{}]])},channels:{fetch:async()=>channel}};
  client.user={id:'bot'};client.guilds={fetch:async()=>guild};
  const root=createNativeRoot({client,directory,characterRepository:repository,campaignRepository:{getCampaign:()=>({guild_id:'c',gm_role_id:'gm'})},rng:()=>1,provider:{generate:async input=>{packets.push(input);if(proposeKnowledge&&!input.history.length)return {toolCalls:[{id:'testimony',name:'knowledge_propose',arguments:{source_ref:input.context.source_ref,kind:'testimony',claim:'The clerk claims the tunnel is haunted.'}},{id:'canon',name:'knowledge_propose',arguments:{source_ref:input.context.source_ref,kind:'canon_proposal',claim:'The tunnel is haunted.'}}]};return {text:'The clerk waits for your answer.'};}}});
  t.after(()=>{root.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  root.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'setup',records:[
    {kind:'session',data:{id:'session',campaignId:'c',status:'active'}},
    {kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},
    {kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},
    {kind:'channel',data:{id:'private',campaignId:'c',sceneId:'s',kind:'private',permissionsVerified:true,recipientIds:['u'],writerIds:['u'],ownerUserId:'u'}},
    ...['attempt','armor','review','choice'].map(id=>({kind:'message',data:{id,campaignId:'c',channelId:'private',userId:'u',deleted:false,text:`Owner ${id}`}}))
  ].map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  const check=()=>{};
  if(bootstrap){root.actionStore.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:5,max:6},armorSlots:{current:0,max:3}},{check});root.actionStore.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:3,cap:6},{check});root.actionStore.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'reviewed-profile',sourceRevision:'1',level:2,stress:{current:3,max:6}},{check});}
  const projection=createCanonicalActorReaders({sceneStore:root.sceneStore,actionStore:root.actionStore,characterRepository:repository}),authority=createSourceAuthority(projection.readers);
  function die(){
    const sources=Object.fromEntries(['attempt','armor','review','choice'].map(id=>[id,authority.authenticate({campaignId:'c',messageId:id,userId:'u',actorId:'pc'})]));
    const attack={id:'attack',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'saved-hit',resultHash:'native-hit',termsHash:'terms',sourceRef:sources.attempt.id,sourceRevision:sources.attempt.revision,damage:10,major:8,severe:16,defenses:{resistance:'none',armorReduction:1,armorAllowed:true}},armor={id:'armor',kind:'incoming_armor_choice',campaignId:'c',sceneId:'s',attackRef:'attack',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'saved-hit',resultHash:'native-hit',termsHash:'terms',sourceRef:sources.armor.id,sourceRevision:sources.armor.revision,useArmor:false};
    root.actionStore.commitIncomingDamage({campaignId:'c',attackRef:'attack',expectedRevision:1},{check,readAttack:()=>attack,readArmorChoice:()=>armor});
    const eligible=root.actionStore.readIncomingDeath('c','attack'),base={campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',requestRef:eligible.id,eligibilityHash:hash(eligible),resourceRevision:2,actorSnapshotHash:hash(projection.readActorSnapshot('c','pc'))},review={...base,id:'review',kind:'incoming_death_review',sequence:1,sourceRef:sources.review.id,sourceRevision:sources.review.revision},choice={...base,id:'choice',kind:'incoming_death_choice',sequence:2,reviewRef:'review',move:'risk_it_all',sourceRef:sources.choice.id,sourceRevision:sources.choice.revision};
    root.actionStore.recordIncomingDeathReview('c','attack',{check,sourceAuthority:authority,readEvidence:()=>review});root.actionStore.recordIncomingDeathChoice('c','attack',{check,sourceAuthority:authority,readEvidence:()=>choice});const faces=[1,12];
    return root.actionStore.resolveIncomingDeath('c','attack',{check,sourceAuthority:authority,readActorSnapshot:projection.readActorSnapshot,rng:()=>faces.shift()});
  }
  const request=messageId=>({guildId:'c',channelId:'private',sceneId:'s',messageId,userId:'u',actorId:'pc',mode:'private',ownerUserId:'u',gmRoleId:'gm'});
  return {root,character,packets,request,die};
}

test('canonical native death revokes existing conversation drafts and prevents new inference despite stale active registration',async t=>{
  const f=fixture(t),turn=await f.root.turns.respond(f.request('speech'));assert.equal(f.packets.length,1);assert.equal(JSON.stringify(f.packets).includes('private-hook'),false);
  assert.equal(f.die().result,'dead');assert.equal(f.root.sceneStore.readers.readActor('c','pc').status,'active');assert.equal(f.character.status,'active');
  await assert.rejects(f.root.turns.inspectPublication(turn.publication.id),/authority|source/);await assert.rejects(f.root.turns.respond(f.request('after-death')),/source/);assert.equal(f.packets.length,1);
});

test('missing canonical migration and changed repository owner cannot create conversational actor grants',async t=>{
  const missing=fixture(t,{bootstrap:false});await assert.rejects(missing.root.turns.respond(missing.request('speech')),/no healthy defaults/);assert.equal(missing.packets.length,0);
  const changed=fixture(t);await changed.root.turns.respond(changed.request('speech'));changed.character.owner_user_id='other';await assert.rejects(changed.root.turns.respond(changed.request('changed-owner')),/migration or identity/);assert.equal(changed.packets.length,1);
});


test('native root selects entitled established knowledge with testimony labels and excludes private ancestry before bodies',async t=>{
  const f=fixture(t),store=f.root.knowledgeStore;
  function add(id,body,over={}){store.append({campaignId:'c',id,expectedRevision:null,evidenceRef:'fixture-'+id,metadata:{kind:'observation',status:'active',scope:'scene',sceneId:'s',visibility:'public',recipientIds:[],knownBy:[],sourceRefs:[],disclosure:'public',...over},body});}
  add('public','The clerk is behind the rain-streaked counter.');add('rumor','The clerk claims the tunnel is haunted.',{kind:'testimony'});add('private','The owner knows a private address.',{visibility:'recipients',recipientIds:['u'],disclosure:'observed'});
  add('gm','gm-secret-canary',{visibility:'gm',disclosure:'private'});add('other-owner','other-owner-canary',{visibility:'recipients',recipientIds:['v'],disclosure:'observed'});add('blocked-parent','ancestry-secret-canary',{sourceRefs:['gm']});add('other-scene','other-scene-canary',{sceneId:'elsewhere'});add('pending','pending-delivery-canary',{visibility:'recipients',recipientIds:['u'],disclosure:'pending'});
  const turn=await f.root.turns.respond(f.request('knowledge-speech')),packet=f.packets[0].context;
  assert.deepEqual(packet.records.map(r=>r.ref),['private','public','rumor']);assert.equal(packet.records.find(r=>r.ref==='rumor').kind,'testimony');assert.equal(JSON.stringify(f.packets).includes('canary'),false);assert.equal(JSON.stringify(f.packets).includes('private-hook'),false);assert.equal(turn.metrics.modelCalls,1);assert.equal((await f.root.turns.inspectPublication(turn.publication.id)).sent,false);
});


test('native root retains model testimony proposals privately without truth promotion or unauthorized canon',async t=>{
  const f=fixture(t,{proposeKnowledge:true}),turn=await f.root.turns.respond(f.request('proposal-speech')),results=f.packets[1].history[0].toolResults;
  assert.equal(results[0].result.status,'proposed');assert.equal(results[0].result.effects_committed,false);assert.equal(results[1].result.code,'explicit_private_owner_request_required');
  const proposal=f.root.knowledgeStore.proposal('c',results[0].result.proposal_ref);assert.equal(proposal.claim,'The clerk claims the tunnel is haunted.');assert.equal(proposal.authorship,'model_proposal');assert.equal(proposal.status,'proposed');assert.equal(proposal.visibility,'gm');assert.equal(proposal.principal,'u');assert.equal(proposal.sourceRef,f.packets[0].context.source_ref);assert.equal(f.root.knowledgeStore.metadata('c',proposal.id),null);assert.deepEqual(f.root.knowledgeStore.candidateRefs('c','s'),[]);assert.equal(turn.metrics.modelCalls,2);assert.equal((await f.root.turns.inspectPublication(turn.publication.id)).sent,false);
});
