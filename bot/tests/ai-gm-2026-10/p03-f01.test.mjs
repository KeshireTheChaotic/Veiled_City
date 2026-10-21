import test from 'node:test';import assert from 'node:assert/strict';
import {assertWorldIdentityNames,assertIndependentWorldIdentity} from '../../src/world-authorship.js';
const db={getActiveSession:()=>null,listGuildCharacters:()=>[{name:'Mara',data:{aliases:['']}}]};
test('missing optional protected aliases do not veto independent ordinary invention',()=>{
 assert.doesNotThrow(()=>assertWorldIdentityNames(db,'g',{key:'lamp-seller',name:'Corin',aliases:['']}));
 assert.doesNotThrow(()=>assertIndependentWorldIdentity({name:'Corin',key:'lamp-seller',aliases:[]},{kind:'ai_gm_input',details:{text:'Someone selling lamps would help.'}}));
});
test('protected PC collision and player naming remain non-authoritative',()=>{
 assert.throws(()=>assertWorldIdentityNames(db,'g',{key:'mara',name:'Ｍａｒａ',aliases:[]}),{code:'SCENE_FICTION'});
 assert.throws(()=>assertIndependentWorldIdentity({name:'Corin',key:'lamp-seller',aliases:[]},{kind:'ai_gm_input',details:{text:'Corin owns this shop.'}}),{code:'SCENE_FICTION'});
});
