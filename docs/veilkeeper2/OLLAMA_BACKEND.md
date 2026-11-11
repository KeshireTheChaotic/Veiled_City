# Local Ollama backend — complete

The rebuild native backend defaults to `http://localhost:11434`, model `qwen3.5:4b`, selected in `bot/src/v2/model-config.json`. This is the model observed loaded in Ollama on 2026-11-10. No API key or Codex login is needed for this provider.

Use the existing native startup configuration and `npm run start:v2:native` from `bot`. Set `VK2_INFERENCE=1` to enable inference. The default ceiling remains ten provider calls; `VK2_MAX_TURNS` accepts 1–100. Optional overrides: `VK2_PROVIDER=ollama`, `OLLAMA_HOST=http://localhost:11434`, `VK2_MODEL=qwen3.5:4b` (or `OLLAMA_MODEL`). Remove stale `VK2_MODEL` overrides when using the checked-in default. Existing Discord authorization, new native store directory and read-only legacy database requirements remain in force.

The Ollama adapter uses non-streamed `/api/chat`, disables thinking output, bounds output to 1,024 tokens and times out after 120 seconds. Exactly the four generic capabilities remain available. Tool continuations retain their private provider message, validate original packet/history/results and translate native tool outputs back to Ollama. No automatic retries, cloud fallback or arbitrary remote endpoint is introduced. Loopback endpoints only.

For an explicit return to the previous provider, set `VK2_PROVIDER=openai`; existing API-key or `AI_AUTH_MODE=chatgpt` settings then apply. This affects the rebuild only; deprecated/production code is unchanged.

Validation: 13/13 focused provider/startup tests passed, 618.4223 ms (Node v26.13.0). Covers transport payload, generic tools, source-bound continuation, errors/truncation/unknown tools, cancellation, local endpoint restriction, default selection and budget. One real synthetic request through the backend factory returned nonempty scene prose in 865 ms, with 706 input/28 output tokens and one of two allowed calls consumed. The response described rain rather than the specifically requested NPC dialogue, so this confirms connectivity, not GM behavioral quality. No campaign data, database or Discord message was involved. No bot process was restarted.

Files: ollama-provider.js, model-config.json, native-start.js, r1-ollama-provider.test.mjs, this document and source/test hashes. Native startup selection is complete for this request, not an R1/R4 phase gate. Broader rebuild stays paused, including unrelated uncommitted prose-review changes. Rollback: select `VK2_PROVIDER=openai` or revert this scoped change; no database migration required.

Protocol reference: [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md). Next rebuild work remains the paused R4 segment-review review/qualification; do not resume it implicitly.
