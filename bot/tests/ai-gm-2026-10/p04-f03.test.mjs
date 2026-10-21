import test from 'node:test';import assert from 'node:assert/strict';
import {retainedAssemblyDelivery} from '../../src/assembly-planning.js';
test('new or late-entry assembly without a prior plan has no invented delivery',()=>{
 assert.equal(retainedAssemblyDelivery({getAssemblyPlan:()=>null},'g',{id:'s'},{mode:'private',actorUserId:'late'}),null);
});
test('malformed prior record cannot discard an independently acknowledged private fallback',()=>{
 const scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'},item={scope,turn_id:'t',evidence:{fallback:true}};
 const db={getAssemblyPlan:()=>({assembly_contract:{previous_deliveries:[null,{scope},item]}}),listTurnPublications:()=>[{status:'delivered'}]};
 assert.equal(retainedAssemblyDelivery(db,'g',{id:'s'},scope,{fallback:true}),item);
 assert.equal(retainedAssemblyDelivery(db,'g',{id:'s'},{...scope,actorUserId:'proxy'},{fallback:true}),null);
 db.listTurnPublications=()=>[{status:'uncertain'}];assert.equal(retainedAssemblyDelivery(db,'g',{id:'s'},scope,{fallback:true}),null);
});
