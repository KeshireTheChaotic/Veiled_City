import test from 'node:test';
import assert from 'node:assert/strict';
import {assertGmOnlyChannel,assertPlayerPrivateChannel} from '../../src/frameworks/discord/privacy.js';
import {assertGmOnlyChannel as publicGm,assertPlayerPrivateChannel as publicPrivate} from '../../src/frameworks/discord/public.js';
const VIEW=1024n,SEND=2048n,ADMIN=8n,MANAGE=32n;
const permissions=(...bits)=>({has:flag=>bits.includes(flag)});
function fixture(){
  const everyone={id:'everyone',name:'everyone'},ordinary={id:'ordinary',name:'players'},gm={id:'gm',name:'GM'},
    bot={id:'bot'},owner={id:'owner'},other={id:'other'},grants=new Map([
      ['gm',permissions(VIEW)],['bot',permissions(VIEW,SEND)],['owner',permissions(VIEW)],['other',permissions()]
    ]);
  const guild={roles:{everyone,cache:new Map([everyone,ordinary,gm].map(role=>[role.id,role]))},members:{me:bot,cache:new Map([owner,other,bot].map(member=>[member.id,member]))}};
  const channel={isTextBased:()=>true,permissionsFor:subject=>grants.get(subject.id)||permissions(),permissionOverwrites:{cache:new Map()},toString:()=>'<synthetic-private-channel>'};
  return {guild,channel,grants,ordinary,gm,owner,other};
}
const rejected=code=>error=>error.name==='PermissionError'&&error.code===code&&error.expected===true;

test('framework/public validators share original function identity after root facade retirement',()=>{
  assert.equal(publicGm,assertGmOnlyChannel);
  assert.equal(publicPrivate,assertPlayerPrivateChannel);

});
test('private owner/GM/bot channel succeeds without changing permission records',()=>{
  const f=fixture(),before=[...f.grants];
  assert.equal(assertPlayerPrivateChannel({...f,userId:'owner',gmRoleId:'gm'}),true);
  assert.deepEqual([...f.grants],before);assert.equal(f.channel.permissionOverwrites.cache.size,0);
});
test('public or ordinary-role visibility is rejected',()=>{
  for(const role of ['everyone','ordinary']){
    const f=fixture();f.grants.set(role,permissions(VIEW));
    assert.throws(()=>assertGmOnlyChannel({...f,gmRoleId:'gm'}),rejected('UNSAFE_GM_CHANNEL'));
  }
});
test('other or unresolved account overwrite rejected; owner and bot overwrite accepted',()=>{
  for(const id of ['other','unknown']){
    const f=fixture();f.channel.permissionOverwrites.cache.set(id,{id,type:1,allow:permissions(VIEW)});
    assert.throws(()=>assertPlayerPrivateChannel({...f,userId:'owner',gmRoleId:'gm'}),rejected('UNSAFE_GM_CHANNEL'));
  }
  const f=fixture();for(const id of ['owner','bot'])f.channel.permissionOverwrites.cache.set(id,{id,type:1,allow:permissions(VIEW)});
  assert.equal(assertPlayerPrivateChannel({...f,userId:'owner',gmRoleId:'gm'}),true);
  assert.throws(()=>assertGmOnlyChannel({...f,gmRoleId:'gm'}),rejected('UNSAFE_GM_CHANNEL'));
});
test('privileged roles and member-specific administrator/manage-guild grants remain allowed',()=>{
  for(const privilege of [ADMIN,MANAGE]){
    const f=fixture();f.ordinary.permissions=permissions(privilege);f.grants.set('ordinary',permissions(VIEW));
    f.other.permissions=permissions(privilege);f.channel.permissionOverwrites.cache.set('other',{id:'other',type:1,allow:permissions(VIEW)});
    assert.equal(assertGmOnlyChannel({...f,gmRoleId:'gm'}),true);
  }
});
test('configured GM, bot send access and owner visibility errors remain distinct',()=>{
  let f=fixture();f.grants.set('gm',permissions());assert.throws(()=>assertGmOnlyChannel({...f,gmRoleId:'gm'}),rejected('GM_CHANNEL_ACCESS'));
  f=fixture();f.grants.set('bot',permissions(VIEW));assert.throws(()=>assertGmOnlyChannel({...f,gmRoleId:'gm'}),rejected('BOT_CHANNEL_ACCESS'));
  f=fixture();f.grants.set('owner',permissions());assert.throws(()=>assertPlayerPrivateChannel({...f,userId:'owner',gmRoleId:'gm'}),rejected('PRIVATE_CHANNEL_ACCESS'));
});
test('non-text channel rejected and permission lookup errors propagate unchanged',()=>{
  let f=fixture();f.channel.isTextBased=()=>false;assert.throws(()=>assertGmOnlyChannel(f),rejected('UNSAFE_GM_CHANNEL'));
  f=fixture();const error=new Error('synthetic permission lookup');f.channel.permissionsFor=()=>{throw error;};assert.throws(()=>assertGmOnlyChannel({...f,gmRoleId:'gm'}),actual=>actual===error);
});
