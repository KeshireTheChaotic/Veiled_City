import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
test('reopened registry reconstructs current source proof and rejects later control changes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'vk2-sources-')),path=join(dir,'sources.sqlite');let registry=openSourceRegistry(path);
  const actor={id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'},message={id:'m',campaignId:'c',userId:'u',channelId:'ch',revision:'1',deleted:false,text:'PRIVATE body'};
  const readers={readMessage:()=>message,readActor:()=>actor,readChannel:()=>({id:'ch',campaignId:'c',sceneId:'s',revision:'1',kind:'private',ownerUserId:'u',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}),readScene:()=>({id:'s',campaignId:'c',sessionId:'session',revision:'1',status:'active',participants:[{actorId:'pc',userId:'u',presence:'present'}]}),readSession:()=>({id:'session',campaignId:'c',revision:'1',status:'active'})};
  try{const first=createSourceAuthority({...readers,sourceRegistry:registry}).authenticate({campaignId:'c',messageId:'m',userId:'u',actorId:'pc'});assert.equal(JSON.stringify(registry.get(first.id)).includes('PRIVATE body'),false);registry.close();registry=openSourceRegistry(path);
    const next=createSourceAuthority({...readers,sourceRegistry:registry});assert.deepEqual(next.inspectReference(first.id,first.revision),first);assert.equal(next.revalidate(first),true);actor.controlRevision='2';assert.throws(()=>next.inspectReference(first.id,first.revision));assert.equal(next.revalidate(first),false);
  }finally{registry.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())));rmSync(dir,{recursive:true,force:true});}
});
test('registry entries are immutable even when another authority reuses the reference',()=>{const registry=openSourceRegistry();try{registry.put('ref',{fingerprint:'first'});assert.throws(()=>registry.put('ref',{fingerprint:'changed'}),/Immutable/);assert.equal(registry.get('ref').fingerprint,'first');}finally{registry.close();}});
