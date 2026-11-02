# R1/R2 — concrete Responses provider adapter

Completed provider translation/integration slice; full R1/R2 and live acceptance remain open.

`openai-provider.js` maps the provider-neutral contract to the installed OpenAI SDK's Responses API. It requires an explicitly supplied client/model, bounds timeout/output tokens, disables automatic retries and sets `store:false`. It reads no environment secrets. The only function definitions are the four generic native contracts, with explicit non-strict API schemas and separate strict native argument validation. The ordinary response remains free-form prose.

Tool continuation preserves original output/reasoning items and exact call IDs using an opaque native continuation handle, bound to the same prompt/context/tool inventory and prior history. Reasoning payloads are not tool results or audience prose. Context changes, forged continuation handles and mismatched call results fail before dispatch. Incomplete responses, refusals, malformed tool arguments and unsupported output types fail closed. Provider errors are bounded; usage translates to the existing gateway metrics. `model-gateway.js` passes the opaque continuation only back to the provider.

## Contract sources and evidence

Checked the official [function-calling guide](https://developers.openai.com/api/docs/guides/function-calling), including Responses function definitions, string tool outputs, non-strict mode and replay of reasoning items. Also inspected installed `openai` 6.6.0 response types for encrypted reasoning, storage and output-token fields. `store:false` is a response-storage setting, not a claim of zero retention across every provider policy.

Six fresh provider cases and the changed gateway's existing tool-loop/rehearsal/private-boundary checks: **28/28 passed**, zero failures/skips, 832.115 ms. The new cases exercise the actual installed SDK with a local fake fetch response: exact request serialization, context isolation, four tools, bounded settings, usage, opaque reasoning continuation, forged scope/history, refusal/truncation/malformed arguments, cancellation and sanitized errors. No production key, network inference or paid request was used. No unrelated passing suite was rerun.

Artifacts: R1_PROVIDER_TEST_OUTPUT.txt, R1_PROVIDER_TEST_EVIDENCE.json and R1_PROVIDER_HASHES.json. These prove offline SDK translation/composition, not live model availability, quality, latency, real credentials or provider reliability. Model selection remains explicit deployment configuration.

## Holds, recovery and next work

Native scene/state/recall adapters, actual provider/Discord composition, live authorization and prose evaluation remain pending. Continuation state is in-memory and must not be reused across audiences; durable turn recovery remains R7 work. No rule handlers, native game outcomes or transport sends were added. Existing production code, schema and content remain untouched; no migration, deployment or push occurred. Rollback is to leave the opt-in adapter unused.

**Next exact work:** native scene/context and recall adapters, then R3 deterministic rules and subsequent live qualification. R0–R2 still have open gates; R3–R8 remain outstanding. The unrelated README edit remains untouched. Phase publication is authorized only to the rebuild branch after the phase gates pass.
