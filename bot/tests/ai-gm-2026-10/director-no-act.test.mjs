import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {queueDirectorPublications} from '../../src/publication-outbox.js';

test('a director pass that chose not to act queues nothing and does not throw', () => {
  const f = createP07NativeFixture();
  try {
    const before = f.db.listCityRecords(f.guild, {includeGM: true, limit: 500}).length;
    const turnId = queueDirectorPublications(f.db, {guild: {id: f.guild}, session: {id: f.session.id}, scope: f.scope, key: 'no-act',
      result: {act: false, public_narration: '', private_messages: [], events: []}});
    assert.equal(turnId, null);
    assert.equal(f.db.listCityRecords(f.guild, {includeGM: true, limit: 500}).length, before);
  } finally { f.close(); }
});

test('unprepared director output that carries narration is still refused at the publication boundary', () => {
  const f = createP07NativeFixture();
  try {
    assert.throws(() => queueDirectorPublications(f.db, {guild: {id: f.guild}, session: {id: f.session.id}, scope: f.scope, key: 'no-act-text',
      result: {act: false, public_narration: 'Unchecked prose.', private_messages: []}}), {code: 'NARRATIVE_PVP'});
  } finally { f.close(); }
});
