import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignAttackActorHash} from '../../src/pvp-attacks.js';

test('native PvP attack provider cold-imports and hashes the current attack actor snapshot',()=>{
  const actor={status:'active',data:{traits:{agility:2},proficiency:2,inventory:[],conditions:[]}};
  const initial=campaignAttackActorHash(actor);
  assert.match(initial,/^[a-f0-9]{64}$/u);
  assert.equal(campaignAttackActorHash(actor),initial);
  assert.notEqual(campaignAttackActorHash({...actor,data:{...actor.data,proficiency:3}}),initial);
});
