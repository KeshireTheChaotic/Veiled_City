# R1/R4 — owner-selected 27B testing profile

Implementation slice complete; no major phase gate or live quality qualification.

The opt-in native backend now defaults to local qwen3.5:27b with thinking enabled, 4096 output tokens and a 90000ms request limit, matching the profile the owner accepted for continued testing. Explicit native model/environment overrides and the hard call budget remain; there is no automatic retry or remote fallback. Production was not restarted. This configuration is not a claim that the model's recorded responses meet R4 quality requirements.

Files: model-config.json, native-start.js and r1-ollama-provider.test.mjs. The new focused check captures the actual provider request with simulated fetch, verifies the selected model/thinking/output budget, and proves a second call cannot exceed the budget. Five focused checks passed (5772.4094ms). The two other changed-import dependent files, native-start and runtime-resume, contributed 19 passing checks in the shared dependency run. The shared run had 129/129 checks across 14 files, 43019.0876ms, concurrency4, Node v26.13.0; it also covers the separate encounter-reader slice. No completed unchanged test needs another run. Exact selected paths and source/test hashes accompany this report.

Migration/rollback: no database or gameplay changes. Restore the previous configuration/forwarding to return to the earlier profile; preserve all prior evaluation artifacts and downloaded models. No Discord call, inference request, production action, legacy retirement or phase merge/push occurred. The focused transport is simulated and establishes configuration behavior, not model quality.

Next: continue R3 native action terms/readiness and R0–R8 acceptance; use 27B for changed, informative model scenarios when those integrations require inference. Do not rerun the previous eight-case suite unchanged to seek better samples.
