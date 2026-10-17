# OpenAI API configuration and request budget

The bot uses the OpenAI JavaScript SDK and Responses API. A ChatGPT subscription does not fund its API requests. Create a dedicated API project with billing/spend alerts and an appropriately scoped key; store it **only** in `bot/.env`.

## Model lanes in the pinned `bot/.env.example`

```dotenv
OPENAI_ROUTINE_GM_MODEL=gpt-6-luna
OPENAI_GM_MODEL=gpt-6.1-sol
OPENAI_NARRATIVE_MODEL=
OPENAI_NARRATIVE_FAST_MODEL=
OPENAI_ROUTER_MODEL=gpt-6-luna
OPENAI_SUMMARY_MODEL=gpt-6-luna
OPENAI_RULES_MODEL=gpt-6-luna
OPENAI_ASSEMBLY_MODEL=gpt-6-luna
OPENAI_NPC_PROXY_MODEL=gpt-6-luna
OPENAI_REASONING_EFFORT=low
OPENAI_REQUEST_TIMEOUT_MS=60000
OPENAI_MAX_RETRIES=1
AI_OPERATION_DEADLINE_MS=120000
GM_TURN_DEADLINE_MS=120000
ROUTER_DEADLINE_MS=20000
GM_PROGRESS_AFTER_MS=20000
GM_PROGRESS_ENABLED=true
GM_TYPING_REFRESH_MS=8000
```

These are checked-in **configuration examples**, not guarantees of model availability, current API price or service compatibility. Confirm permitted model IDs in the actual API project. Keep advanced/core GM and economical routine/router/writer lanes distinct where the code supports them; do not silently downgrade core reasoning to solve a failing native adjudication.

The isolated narrative writer uses native audience/task packets; it is not allowed to see arbitrary GM secrets and cannot create mechanical outcomes. Normal NPC/scene work may require a combined GM call plus a bounded writer call. Assembly can involve a GM-private planner and audience-specific writers. Fake-provider test counts are not live latency or billable token measurements.

## Cost, privacy and timeout controls

The bot uses bounded recent conversation and locally retrieved scope-relevant content rather than uploading the full campaign on every turn. Lowering context or disabling optional lanes can affect narrative quality; verify with tests. Ordinary native commands/dice operate without an OpenAI generation request unless the workflow explicitly invokes narrative authoring.

Use spend alerts and API limits. Treat API generation during live sessions as potentially billable. Limit access to `.env`, GM secret context and logs. Never treat the model's textual claim that a rule is valid, an owner approved, or a message was sent as native proof.

## Optional voice

Voice is **off** in the example configuration. Install FFmpeg and enable `VOICE_ENABLED=true` only if voice access, channel permissions and costs are approved. The example uses `OPENAI_VOICE_MODEL=gpt-4o-mini-tts`, `VOICE_MODE=narrative` and `VOICE_NAME=cedar`; confirm supported model and voice settings at runtime. `/vc-voice join`, `status`, `configure`, `repeat` and `leave` manage voice. The Discord text/native receipt remains the campaign record; private material must not leak to public speech.
