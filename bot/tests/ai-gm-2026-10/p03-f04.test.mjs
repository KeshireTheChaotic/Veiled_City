import test from 'node:test';import assert from 'node:assert/strict';
import {canonicalNarrativeCause} from '../../src/world-narrative-bridge.js';
test('missing, retired and GM-private causes confer no audience persistence credit',()=>{
 for(const source of [null,{status:'retracted'},{status:'active',kind:'clock',visibility:'gm',details:{}}]){
 const db={getWorldEvent:()=>source,getFact:()=>null};assert.equal(canonicalNarrativeCause(db,'g','s',{mode:'party'}),null);
 }
});
test('an active audience-visible event retains its causal identity without becoming an effect',()=>{
 const source={status:'active',kind:'world_event',visibility:'party',details:{}};
 const db={getWorldEvent:()=>source,getFact:()=>null};assert.equal(canonicalNarrativeCause(db,'g','s',{mode:'party'}),'s');
});
