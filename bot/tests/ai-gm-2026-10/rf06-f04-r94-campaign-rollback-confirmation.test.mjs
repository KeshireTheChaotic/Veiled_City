import assert from 'node:assert/strict';
import test from 'node:test';
import {campaignRollbackConfirmationText} from '../../src/frameworks/discord/public.js';

test('campaign rollback confirmation preserves the original identifier, label and safety notice',()=>{
  assert.equal(campaignRollbackConfirmationText({id:'12345678-90ab-cdef',label:'Before the crossing'}),
    'Restored snapshot `12345678` **Before the crossing**. A pre-rollback safety snapshot was created automatically.');
});

test('campaign rollback confirmation preserves the existing empty-label interpolation',()=>{
  assert.equal(campaignRollbackConfirmationText({id:'abcdefgh',label:''}),
    'Restored snapshot `abcdefgh` ****. A pre-rollback safety snapshot was created automatically.');
});
