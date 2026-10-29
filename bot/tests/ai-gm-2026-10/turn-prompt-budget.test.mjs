import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetTurnPrompt} from '../../src/frameworks/ai-provider/prompt-budget.js';
import {loadConfig} from '../../src/config.js';

// Shaped like the live 2026-10-28 overflow: ~81k chars of mandatory context with ~52k chars of instructions.
const sections = [{label: 'MANDATORY', required: true, value: 'x'.repeat(80940)}];
const instructions = 'i'.repeat(52000);

test('the old 120000 budget overflows with every AI GM flag on; the configured budget fits', () => {
  assert.throws(() => budgetTurnPrompt(sections, {instructions, maxChars: 120000}), {code: 'CONTEXT_OVERFLOW'});
  assert.doesNotThrow(() => budgetTurnPrompt(sections, {instructions, maxChars: 200000}));
});

test('TURN_PROMPT_MAX_CHARS defaults to 200000 and is range-checked', () => {
  const saved = {...process.env};
  try {
    Object.assign(process.env, {DISCORD_TOKEN: 't', DISCORD_CLIENT_ID: 'c', OPENAI_API_KEY: 'k'});
    delete process.env.TURN_PROMPT_MAX_CHARS;
    assert.equal(loadConfig().turnPromptMaxChars, 200000);
    process.env.TURN_PROMPT_MAX_CHARS = '300000';
    assert.equal(loadConfig().turnPromptMaxChars, 300000);
    process.env.TURN_PROMPT_MAX_CHARS = '1000';
    assert.throws(() => loadConfig(), /TURN_PROMPT_MAX_CHARS/);
  } finally { process.env = saved; }
});
