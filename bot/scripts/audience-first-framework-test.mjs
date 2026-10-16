/** Kickoff-only structural tests; not evidence of integrated production correctness. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudienceAuthority, audienceSurface} from '../src/audience-first-capability.js';
import {compileNarrativeActs} from '../src/narrative-acts-v9.js';
import {projectMechanicalInput, projectMechanicalOutput} from '../src/mechanical-boundary-v9.js';
import {createNarrativeTasks, resolveNarrativeTask, summarizeNarrativeTasks} from '../src/narrative-tasks-v9.js';

const base = {authorized: true, proof_ref: 'verified:1', source_event: 'event:turn',
  scene: 'scene', session: 'session', task_ids: ['t1', 't2'], viewpoint: 'character',
  viewpoint_character_id: 'pc', audience: 'player', recipient_user_id: 'user', recipient_character_id: 'pc'};
const policy = createAudienceAuthority({authorize: req => ({...base, ...req, authorized: req.allow === true})});
const player = policy.issue({audience: 'player', allow: true});

test('model JSON cannot forge an opaque native grant', () => {
  assert.throws(() => policy.inspect({...base}), /unissued_capability/);
  assert.throws(() => policy.issue({audience: 'player', allow: false}), /native_proof/);
});

test('channel and character-addressed public narrative use party surface', () => {
  assert.equal(audienceSurface(policy, player).kind, 'party');
  const channel = policy.issue({audience: 'channel', allow: true, viewpoint: 'camera',
    recipient_user_id: null, recipient_character_id: null, viewpoint_character_id: null});
  assert.equal(audienceSurface(policy, channel).kind, 'party');
});

test('private grant stays private and GM-only stays backend', () => {
  const privateGrant = policy.issue({audience: 'player_private', allow: true});
  assert.deepEqual(audienceSurface(policy, privateGrant), {kind: 'private_user', recipient_user_id: 'user', publish: true});
  const internal = policy.issue({audience: 'gm_internal', allow: true, viewpoint: 'internal',
    recipient_user_id: null, recipient_character_id: null, viewpoint_character_id: null});
  assert.equal(audienceSurface(policy, internal).publish, false);
});

test('creative act needs independent native verification and a current task', () => {
  const proposal = {id: 'a', task_id: 't1', kind: 'player_perception', text: 'You hear the dryer.', source_refs: []};
  assert.equal(compileNarrativeActs({authority: policy, grant: player, proposals: [proposal]})[0].status, 'held');
  const output = compileNarrativeActs({authority: policy, grant: player, proposals: [proposal],
    verifyAct: (act, binding) => ({approved: true, proof_ref: 'native:part', task_id: act.task_id,
      audience: binding.audience, source_event: binding.source_event})});
  assert.equal(output[0].status, 'verified_candidate');
  assert.equal(compileNarrativeActs({authority: policy, grant: player,
    proposals: [{...proposal, task_id: 'invented'}], verifyAct: () => ({approved: true})})[0].status, 'held');
});

test('a held act never suppresses an independent valid act', () => {
  const rows = compileNarrativeActs({authority: policy, grant: player, proposals: [
    {id: 'ok', task_id: 't1', kind: 'npc_offer', text: 'Would you like tea?', source_refs: []},
    {id: 'bad', task_id: 't2', kind: 'artifact_text', text: 'Choose one.', source_refs: []}],
    verifyAct: act => act.id === 'ok' ? {approved: true, proof_ref: 'part:1', task_id: 't1',
      audience: 'player', source_event: 'event:turn'} : {approved: false}});
  assert.deepEqual(rows.map(row => row.status), ['verified_candidate', 'held']);
});

test('mechanical roll request is non-executing input, not inferred dice', () => {
  let calls = 0;
  const result = projectMechanicalInput({authority: policy, grant: player,
    intent: {kind: 'request_roll', typed_intent_key: 'typed:1', task_id: 't1'},
    verifyInput: () => {calls++; return {verified: true, source_event: 'event:turn', typed_intent_key: 'typed:1', proof_ref: 'typed:1',
      actor_character_id: 'pc', owner_user_id: 'user', disposition: 'needs_adjudication'};}});
  assert.equal(calls, 1);
  assert.equal(result.executed, false);
  assert.equal(result.disposition, 'needs_adjudication');
  assert.equal(result.request_ref, null);
});

test('immediate roll submission cannot select an unspecified request', () => {
  assert.throws(() => projectMechanicalInput({authority: policy, grant: player,
    intent: {kind: 'submit_roll', typed_intent_key: 'typed:1', task_id: 't1'},
    verifyInput: () => ({verified: true, source_event: 'event:turn', typed_intent_key: 'typed:1', proof_ref: 'typed:1',
      actor_character_id: 'pc', owner_user_id: 'user', disposition: 'native_pending'})}), /exact_request_selection/);
});

test('mechanical output requires native receipt and matching audience', () => {
  assert.throws(() => projectMechanicalOutput({authority: policy, grant: player, receiptRef: 'roll:1',
    verifyReceipt: () => ({verified: true, ref: 'roll:1', proof_ref: 'native:roll', audience: 'channel',
      request_source_event: 'event:turn', native_source_event: 'event:roll', subject_character_id: 'pc', rendered_text: 'Hope 9 / Fear 4'})}), /native_output_proof/);
  const output = projectMechanicalOutput({authority: policy, grant: player, receiptRef: 'roll:1',
    verifyReceipt: () => ({verified: true, ref: 'roll:1', proof_ref: 'native:roll', audience: 'player',
      request_source_event: 'event:turn', native_source_event: 'event:roll', subject_character_id: 'pc', rendered_text: 'Hope 9 / Fear 4'})});
  assert.equal(output.kind, 'mechanical_output');
});

test('task completeness is specific to each question and native proof', () => {
  const tasks = createNarrativeTasks([{id: 't1', source_event: 'event:turn', operation: 'conversation'},
    {id: 't2', source_event: 'event:turn', operation: 'conversation'}]);
  resolveNarrativeTask(tasks, 't1', {status: 'answered'}, (task, disposition) => ({accepted: true,
    source_event: task.source_event, task_id: task.id, status: disposition.status, proof_ref: 'part:1'}));
  assert.equal(summarizeNarrativeTasks(tasks).complete, false);
  assert.deepEqual(summarizeNarrativeTasks(tasks).outstanding, ['t2']);
});
