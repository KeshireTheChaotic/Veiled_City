/** Offline regression for disabled candidate extraction and staged ordinary-world vs canon claim recovery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VeiledDB } from '../src/db.js';
import { GMService } from '../src/gm.js';
import { ContentIndex } from '../src/content.js';
import { FakeResponses } from './contract-fixtures.mjs';
import { POST_TURN_REVIEW_CATEGORIES } from '../src/director.js';
import { captureWorldInput } from '../src/autonomous-world.js';
import { applyAuthoritativeMutation } from '../src/state.js';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-gm-recovery-'));
const db = new VeiledDB(path.join(temp, 'test.sqlite'), path.resolve('sql/schema.sql'));
try {
  const guild = 'gm-recovery-regression';
  db.ensureCampaign(guild);
  const session = db.startSession(guild, 'Rain');
  db.upsertPlayer(guild, 'owner', 'Owner');
  const pc = db.createCharacter(guild, 'owner', 'Billy', {});
  db.assignCharacter(session.id, 'owner', pc.id);
  db.setPresence(session.id, 'owner', 'present');
  const assignment = db.controlledAssignment(session.id, 'owner');
  const calendar = db.getCityCalendar(guild);
  db.setCityCalendar(guild, {...calendar, flags: {...calendar.flags, natural_language: false}});
  const content = new ContentIndex(path.resolve('../content'));
  const gm = new GMService({db, content, config: {
    openaiApiKey:'offline-dummy', gmModel:'fixture', routineGmModel:'fixture', routerModel:'fixture',
    maxRecentMessages:16, maxContentChunks:2, contextInputBudget:100000,
    gmTurnDeadlineMs:5000, aiOperationDeadlineMs:5000
  }, ai: new FakeResponses([])});
  const review = Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k =>
    [k, {decision:'no_change', reason:'No additional structured state change.', confidence:95}]));
  review.scene = {decision:'continue', label:'', reason:'The scene continues.'};
  const empty = {
    respond:true, narration:'The rain continues against the shopfronts. What do you do?',
    world_additions:[], scene_actions:[], world_conflicts:[], narrative_interpretation:null,
    authored_candidates:null, narrative_claims:[], private_messages:[], events:[],
    handouts:[], relationships:[], npc_memories:[], npc_knowledge:[], npc_goals:[],
    canon_proposals:[], simulation_updates:[], ai_intents:[], decision_advisory:null,
    state_review:review
  };
  const extraction = {kind:'action', source_ref:'event:nonexistent', source_span:'I look around', target:'', quote:''};
  assert.throws(() => applyAuthoritativeMutation(db, {guildId:guild, sessionId:session.id,
    narrative:{...empty, authored_candidates:[extraction]},
    scope:{mode:'party', actorUserId:'owner', actorCharacterId:pc.id}}), /opt-in/,
  'Direct mutation still refuses authored-candidate persistence when disabled');
  gm.ai = new FakeResponses([{...empty, authored_candidates:[extraction]}]);
  const ignored = await gm.runTurn({guildId:guild, actorUserId:'owner', actorName:'Billy', actorAssignment:assignment,
    messageText:'I look around', messageId:'off-feature'});
  assert.equal(ignored.authored_candidates, null,
    'Disabled optional candidate extraction should be quarantined at the model boundary');
  assert.equal(gm.ai.requests.length, 1, 'No model retry is needed to discard disabled optional metadata');

  const search = 'I look for a place hiring overnight workers.';
  captureWorldInput(db, guild, 'owner', pc.id, 'relay', search);
  const narration = 'Billy spots Relay Night Staffing, a small storefront with an OPEN hiring placard.';
  const located = {
    ...empty, narration,
    player_intents:[{type:'search',source_span:search,target_name:'Relay Night Staffing',target_key:'relay-night-staffing',
      destination:'unspecified',operation:'search',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',reason:''}],
    world_additions:[{kind:'location', key:'relay-night-staffing', name:'Relay Night Staffing',
      summary:'An ordinary public overnight staffing storefront with an open hiring notice.',
      parent_location_key:'', visibility:'party'}],
    scene_actions:[{kind:'reveal_nearby_place', entity_ref:'relay-night-staffing', source_span:search, zone:''}]
  };
  const falseCanonClaim = {
    actor:`character:${pc.id}`, entity_type:'world', entity:'relay-night-staffing', action:'canon', prior:'',
    proposed:'Relay Night Staffing advertises overnight hiring', visibility:'party', source_ref:'event:0',
    source_span:narration, mutation_index:-1, certainty:'committed'
  };
  const misclassified = {...located, narrative_claims:[falseCanonClaim]};
  gm.ai = new FakeResponses([misclassified, misclassified, located]);
  const repaired = await gm.runTurn({guildId:guild, actorUserId:'owner', actorName:'Billy', actorAssignment:assignment,
    messageText:search, messageId:'relay'});
  assert.equal(repaired.world_additions[0].key, 'relay-night-staffing');
  assert.equal(repaired.narrative_claims.length, 0);
  assert.equal(gm.ai.requests.length, 3, 'Repeated mistaken canon annotation receives bounded fail-safe recovery');
  assert.match(gm.ai.requests[2].input, /CANON CLAIM RECOVERY/);
  assert.equal(db.getSimulationEntity(guild, 'location', 'relay-night-staffing'), null,
    'Generation previews must not commit even the corrected location');

  gm.ai = new FakeResponses([misclassified, misclassified, misclassified]);
  await assert.rejects(() => gm.runTurn({guildId:guild, actorUserId:'owner', actorName:'Billy',
    actorAssignment:assignment, messageText:search, messageId:'relay'}),
    error => error?.code === 'NARRATIVE_INTEGRITY' && error?.diagnostic?.category === 'canon',
    'Three invalid canon claims must ultimately fail rather than bypass canon');
  assert.equal(db.getSimulationEntity(guild, 'location', 'relay-night-staffing'), null);
  console.log('GM recovery regression PASS: disabled extraction quarantined, ordinary place recovered, real canon enforcement retained.');
} finally {
  db.close();
  fs.rmSync(temp, {recursive:true, force:true});
}
