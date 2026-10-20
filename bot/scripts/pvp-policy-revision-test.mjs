import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setCampaignPvpMode,campaignPvpPolicy} from '../src/pvp-campaign-policy.js';
import {indexWorldEvent} from '../src/city-calendar.js';

// 1. Enable then disable, replay the enable without changes.
test('policy: enable, disable, replay enable unchanged', async () => nativeFixture(async f => {
  setCampaignPvpMode(f.db, f.guild, 'gm', {enabled: true}, {gm: true, interactionId: 'enable-1'});
  setCampaignPvpMode(f.db, f.guild, 'gm', {enabled: false}, {gm: true, interactionId: 'disable-1'});
  assert.deepEqual(campaignPvpPolicy(f.db, f.guild), {enabled: false, revision: 2});
  const row1 = f.db.getCityRecord(f.guild, 'pvp_campaign_policy', 'campaign');
  assert.strictEqual(row1.data.history.length, 2);
  setCampaignPvpMode(f.db, f.guild, 'gm', {enabled: true}, {gm: true, interactionId: 'enable-1'});
  assert.deepEqual(campaignPvpPolicy(f.db, f.guild), {enabled: false, revision: 2});
  const row2 = f.db.getCityRecord(f.guild, 'pvp_campaign_policy', 'campaign');
  assert.strictEqual(row2.data.history.length, 2);
  assert.deepEqual(row2.data.history,row1.data.history);
}));

// 2. Enable once, then replay with false and with a different GM author.
test('policy: replay differs throws', async () => nativeFixture(async f => {
  setCampaignPvpMode(f.db, f.guild, 'gm', {enabled: true}, {gm: true, interactionId: 'enable-2'});
  const before=f.db.getCityRecord(f.guild,'pvp_campaign_policy','campaign').data.history;
  assert.deepEqual(campaignPvpPolicy(f.db, f.guild), {enabled: true, revision: 1});
  assert.throws(
    () => setCampaignPvpMode(f.db, f.guild, 'gm', {enabled: false}, {gm: true, interactionId: 'enable-2'}),
    /replay differs/i
  );
  assert.throws(
    () => setCampaignPvpMode(f.db, f.guild, 'another-gm', {enabled: true}, {gm: true, interactionId: 'enable-2'}),
    /replay differs/i
  );
  assert.deepEqual(campaignPvpPolicy(f.db, f.guild), {enabled: true, revision: 1});
  const row = f.db.getCityRecord(f.guild, 'pvp_campaign_policy', 'campaign');
  assert.strictEqual(row.data.history.length, 1);
  assert.deepEqual(row.data.history,before);
}));

// 3. Enable, disable, retract first source and ensure validation error.
test('policy: retract source causes error', async () => nativeFixture(async f => {
  setCampaignPvpMode(f.db, f.guild, 'gm', {enabled: true}, {gm: true, interactionId: 'enable-3'});
  setCampaignPvpMode(f.db, f.guild, 'gm', {enabled: false}, {gm: true, interactionId: 'disable-3'});
  const rowBefore = f.db.getCityRecord(f.guild, 'pvp_campaign_policy', 'campaign');
  const firstSource = rowBefore.data.history[0].source_event;
  indexWorldEvent(f.db, f.guild, {key: firstSource, status: 'retracted'}, 'gm');
  assert.throws(() => campaignPvpPolicy(f.db, f.guild), /policy|source|invalid/i);
  const rowAfter = f.db.getCityRecord(f.guild, 'pvp_campaign_policy', 'campaign');
  assert.strictEqual(rowAfter.data.history.length, 2);
  assert.deepEqual(rowAfter.data.history,rowBefore.data.history);
}));
