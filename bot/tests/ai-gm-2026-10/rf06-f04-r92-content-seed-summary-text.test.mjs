import assert from 'node:assert/strict';
import test from 'node:test';
import {contentSeedSummaryText} from '../../src/frameworks/discord/public.js';

test('content seed summary preserves counts, review guidance and privacy statement',()=>{
  const counts={files:3,party:1,character:2,gm:1,binary:4,catalog:5,entities:6,references:7,narratives:8,
    cognition:{profiles:9},bulk:{sources:10,entries:11,library:12,drafts:13,fields:14},skipped:15,changed:16,unmatched:17,narrativeConflicts:18};
  assert.equal(contentSeedSummaryText(counts),[
    '**Content seed complete.** A pre-seed safety snapshot was created.',
    'Files imported: **3** (shared **1**, character-only **2**, GM-only **1**).',
    'Structured entries: **5**; runtime entities: **6**; references: **7**; narratives: **8**.',
    'New NPC profiles: **9**; binary files archived: **4**.',
    'Bulk projections: **10** files / **11** entries; library entries: **12**; review drafts: **13**.',
    'Missing dossier fields backfilled: **14**.',
    'Review inferred/typed drafts with /vc-admin seed-drafts; use seed-edit, seed-add, seed-remove, seed-approve, or seed-reject.',
    'Existing files skipped: **15**; changed sources requiring review: **16**.',
    'Unmatched character files retained GM-only: **17**; narrative conflicts/oversize: **18**.',
    'Existing campaign state is preserved. GM sources never become party knowledge or canon automatically.'
  ].join('\n'));
});

test('content seed summary retains the no-profile default',()=>{
  const counts={files:0,party:0,character:0,gm:0,binary:0,catalog:0,entities:0,references:0,narratives:0,
    bulk:{sources:0,entries:0,library:0,drafts:0,fields:0},skipped:0,changed:0,unmatched:0,narrativeConflicts:0};
  assert.match(contentSeedSummaryText(counts),/New NPC profiles: \*\*0\*\*; binary files archived: \*\*0\*\*\./);
});
