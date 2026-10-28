import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatGptClient } from '../../src/frameworks/ai-provider/chatgpt-client.js';
const auth = JSON.stringify({ tokens: { access_token: 'test-access', account_id: 'acct-1' } });
const sse = (...events) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
const completed = { type: 'response.completed', response: { status: 'completed', usage: { input_tokens: 3, output_tokens: 2 },
  output: [{ type: 'message', content: [{ type: 'output_text', text: '{"hi":"there"}' }] }] } };
function client(reply, calls = []) {
  return createChatGptClient({ authPath: 'auth.json', readFile: () => auth,
    fetchImpl: async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return reply; } });
}

test('sends a streamed, unstored Responses request signed with the ChatGPT login', async () => {
  const calls = [];
  const response = await client(new Response(sse({ type: 'response.output_text.delta', delta: 'x' }, completed)), calls)
    .responses.create({ model: 'gpt-6-luna', input: 'hello', max_output_tokens: 200, text: { format: { type: 'json_schema' } } });
  const [{ url, init, body }] = calls;
  assert.equal(url, 'https://chatgpt.com/backend-api/codex/responses');
  assert.equal(init.headers.authorization, 'Bearer test-access');
  assert.equal(init.headers['chatgpt-account-id'], 'acct-1');
  assert.equal(body.stream, true); assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 200);
  assert.equal('instructions' in body, false);
  assert.deepEqual(body.input, [{ role: 'user', content: [{ type: 'input_text', text: 'hello' }] }]);
  assert.deepEqual(body.text, { format: { type: 'json_schema' } });
  assert.equal(response.output_text, '{"hi":"there"}');
  assert.equal(response.usage.output_tokens, 2);
});

test('falls back to streamed text deltas when the final response omits output', async () => {
  const response = await client(new Response(sse({ type: 'response.output_text.delta', delta: 'a' },
    { type: 'response.output_text.delta', delta: 'b' }, { type: 'response.completed', response: { status: 'completed', output: [] } })))
    .responses.create({ model: 'm', input: 'x', instructions: 'given' });
  assert.equal(response.output_text, 'ab');
});

test('HTTP errors keep status and headers so the transport can classify retries', async () => {
  const error = await client(new Response('{"error":"limit"}', { status: 429, headers: { 'retry-after': '2' } }))
    .responses.create({ model: 'm', input: 'x' }).catch((e) => e);
  assert.equal(error.status, 429);
  assert.equal(error.headers.get('retry-after'), '2');
});

test('a missing ChatGPT login fails with sign-in guidance before any request', async () => {
  const calls = [];
  const noLogin = createChatGptClient({ authPath: 'auth.json', readFile: () => '{}', fetchImpl: async () => calls.push(1) });
  await assert.rejects(noLogin.responses.create({ model: 'm', input: 'x' }), /codex login/);
  assert.equal(calls.length, 0);
});
