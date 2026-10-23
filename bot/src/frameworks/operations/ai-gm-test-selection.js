// Independent delta selection. No inherited registry or fallback suite execution.
const freshTest = /^bot\/tests\/ai-gm-2026-10\/p\d{2}-f\d{2}(?:-[a-z0-9-]+)?\.test\.mjs$/;
export function selectFreshTests(changedPaths, coverage) {
  const tests = new Set();
  const uncovered = [];
  for (const path of changedPaths) {
    if (typeof path !== 'string' || !path || path.includes('\\') || path.startsWith('/') || path.includes(':')
      || path.split('/').some(segment=>!segment||segment==='.'||segment==='..')) throw new Error('Use repository-relative canonical paths');
    if (freshTest.test(path)) { tests.add(path); continue; }
    if (!/^bot\/(src|scripts)\/.*\.(?:js|mjs|json)$/.test(path)) continue;
    if(path.startsWith('bot/scripts/')&&path!=='bot/scripts/ai-gm-delta.mjs'){uncovered.push(path);continue;}
    const mapped = Object.hasOwn(coverage, path) ? coverage[path] : [];
    if (!Array.isArray(mapped) || !mapped.length) { uncovered.push(path); continue; }
    for (const test of mapped) {
      if (!freshTest.test(test)) throw new Error(`Non-fresh test rejected: ${test}`);
      tests.add(test);
    }
  }
  return { tests: [...tests].sort(), uncovered, qualified: uncovered.length === 0 };
}
