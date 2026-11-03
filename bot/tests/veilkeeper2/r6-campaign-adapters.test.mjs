import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignGmPolicyReader,createOwnerSessionReader} from '../../src/v2/native-campaign-adapters.js';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {createDiscordGmAuthority} from '../../src/v2/discord-gm-authority.js';
import {EventEmitter} from 'node:events';
const chars=[{id:'pc',name:'Mira',guild_id:'c',owner_user_id:'u',status:'active'},{id:'pc2',name:'Oren',guild_id:'c',owner_user_id:'u',status:'reserve'}];
const repository={getCampaign:g=>g==='c'?{guild_id:'c',gm_role_id:'gm'}:g==='none'?{guild_id:'none',gm_role_id:null}:undefined,listCharacters:(g,u)=>chars.filter(c=>c.guild_id===g&&c.owner_user_id===u)};
function store(t,{session='active'}={}){
  const s=openSceneStore();t.after(()=>s.close());s.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'fx',records:[{kind:'session',expectedRevision:null,data:{id:'sess',campaignId:'c',status:session}},{kind:'scene',expectedRevision:null,data:{id:'sc',campaignId:'c',sessionId:'sess',status:'active',participants:[]}},{kind:'actor',expectedRevision:null,data:{id:'pc',campaignId:'c',sceneId:'sc',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}]},{check:()=>{}});return s;
}
test('policy reader is closed: configured role only, no administrator fallback, accepted by GM authority',t=>{
  const read=createCampaignGmPolicyReader({repository}),p=read('c');assert.deepEqual({...p,revision:null},{campaignId:'c',revision:null,gmRoleId:'gm',gmUserIds:[],allowAdministrators:false});assert.throws(()=>read('none'));assert.throws(()=>read('missing'));
  const client=new EventEmitter();client.guilds={fetch:async()=>({})};const a=createDiscordGmAuthority({client,readPolicy:read});a.close();
});
test('owner reader resolves one registered PC in the single active session',t=>{
  const scenes=store(t),read=createOwnerSessionReader({sceneStore:scenes,repository,readPolicy:createCampaignGmPolicyReader({repository})});
  assert.deepEqual(read('c','u','Mira'),{campaignId:'c',ownerUserId:'u',actorId:'pc',sessionId:'sess',sceneId:'sc',gmRoleId:'gm'});assert.equal(read('c','u','pc').actorId,'pc');
  assert.equal(read('c','u',''),null);assert.equal(read('c','u','Oren'),null);assert.equal(read('c','other','Mira'),null);assert.equal(read('c','u','Nobody'),null);
});
test('owner reader refuses when no session is active',t=>{
  const scenes=store(t,{session:'ended'});assert.equal(createOwnerSessionReader({sceneStore:scenes,repository,readPolicy:createCampaignGmPolicyReader({repository})})('c','u','Mira'),null);
});
test('explicit GM configuration supplements a campaign with no GM role and nothing else',t=>{
  const noRole={getCampaign:g=>g==='c'?{guild_id:'c',gm_role_id:null}:undefined};
  assert.throws(()=>createCampaignGmPolicyReader({repository:noRole})('c'),/Configured campaign GM role/);
  assert.deepEqual({...createCampaignGmPolicyReader({repository:noRole,allowAdministrators:true})('c'),revision:null},{campaignId:'c',revision:null,gmRoleId:null,gmUserIds:[],allowAdministrators:true});
  assert.deepEqual(createCampaignGmPolicyReader({repository:noRole,gmUserIds:['123456']})('c').gmUserIds,['123456']);assert.equal(createCampaignGmPolicyReader({repository:noRole,gmRoleId:'99999'})('c').gmRoleId,'99999');
  assert.equal(createCampaignGmPolicyReader({repository,allowAdministrators:true})('c').gmRoleId,'gm','the campaign role wins over the explicit one');
  assert.notEqual(createCampaignGmPolicyReader({repository:noRole,allowAdministrators:true})('c').revision,createCampaignGmPolicyReader({repository:noRole,gmUserIds:['1']})('c').revision);
  for(const bad of [{gmUserIds:'x'},{gmUserIds:[1]},{allowAdministrators:'yes'},{gmRoleId:5}])assert.throws(()=>createCampaignGmPolicyReader({repository:noRole,...bad}),/Valid explicit GM configuration/);
});
