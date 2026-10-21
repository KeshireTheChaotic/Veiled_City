import test from 'node:test';import assert from 'node:assert/strict';
import {buildPlayerExport,buildGmHooksExport,playerMarkdown,playerCharacterProjection} from '../../src/character-export.js';
test('player export excludes embedded GM infrastructure while preserving player choices and mechanics',()=>{
 const pc={id:'pc',name:'Neri',owner_user_id:'owner',status:'active',data:{background:'I left the harbor.',resources:{hope:3},gm_hooks:['SECRET HOOK'],canon_suggestions:['SECRET CANON'],extension:{gm_private:{secret:'SECRET CORE'},owner_note:'I dislike crowds.'}}};
 const db={playerFactsFor:()=>[],listRelationships:()=>[],listCharacterGmHooks:()=>[]};
 const output=buildPlayerExport(db,'g',pc);assert.equal(JSON.stringify(output).includes('SECRET'),false);assert.equal(playerMarkdown(output).includes('SECRET'),false);
 assert.equal(output.resources.hope,3);assert.equal(output.extension.owner_note,'I dislike crowds.');assert.equal(pc.data.gm_hooks[0],'SECRET HOOK');
 assert.deepEqual(buildGmHooksExport(pc,db,'g').gm_hooks,['SECRET HOOK']);
});
test('nested arrays and unknown player sheet fields survive without shared mutable objects',()=>{
 const original={inventory:[{name:'Lantern',gm_secrets:'Hidden origin',charges:2}],custom_trait:{value:7}};
 const projected=playerCharacterProjection(original);projected.inventory[0].charges=1;
 assert.equal(original.inventory[0].charges,2);assert.equal(projected.inventory[0].gm_secrets,undefined);assert.equal(projected.custom_trait.value,7);
});
test('explicitly GM-private nested records stay hidden while owner-private character details remain',()=>{
 const output=playerCharacterProjection({notes:[{visibility:'gm_private',content:'hidden truth'},{visibility:'character',content:'my journal'}],extra:{export_meta:{visibility:'gm_private'},content:'hidden relationship'}});
 assert.deepEqual(output,{notes:[{visibility:'character',content:'my journal'}]});
});
