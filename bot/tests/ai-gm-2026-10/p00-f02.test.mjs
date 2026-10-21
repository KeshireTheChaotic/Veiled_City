import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFreshTests } from '../../src/ai-gm-test-selection.js';
const own = 'bot/tests/ai-gm-2026-10/p00-f02.test.mjs';
test('changed modules select only explicitly mapped fresh tests, deduplicated', () => {
  assert.deepEqual(selectFreshTests(['bot/src/a.js', 'bot/src/b.js', 'README.md'], {
    'bot/src/a.js': [own], 'bot/src/b.js': [own],
  }), { tests: [own], uncovered: [], qualified: true });
});
test('unknown shared source is unqualified without a broad fallback', () => {
  assert.deepEqual(selectFreshTests(['bot/src/shared.js'], {}), {
    tests: [], uncovered: ['bot/src/shared.js'], qualified: false,
  });
});
test('legacy tests and traversal cannot enter the execution set', () => {
  assert.throws(() => selectFreshTests(['bot/src/a.js'], { 'bot/src/a.js': ['bot/scripts/old-test.mjs'] }));
  assert.throws(() => selectFreshTests(['bot/src/../scripts/a.js'], {}));
  assert.throws(() => selectFreshTests(['bot\\src\\a.js'], {}));
});
test('new feature tests are selected directly; historical tests are never selected', () => {
  assert.deepEqual(selectFreshTests([own, 'bot/scripts/old-test.mjs'], {}).tests, [own]);
  assert.equal(selectFreshTests(['bot/scripts/old-test.mjs'], {}).qualified, false);
  assert.equal(selectFreshTests(['bot/scripts/old-test.mjs'], {'bot/scripts/old-test.mjs':[own]}).qualified, false);
});
