# C120 — saved-reader compatibility hold

Reviewed latest committed C119 `b816b014`. The inherited C120 proposal replaced three direct bridge provider imports with load-time slots. Its original 908-test batch recorded 905 pass and three failures. The startup architecture failure passed in a focused rerun after 23 obsolete records were temporarily retired; C42 and C73 local fixture repairs passed in split filtered runs. Those runs do not requalify the full batch; C42 is diagnostic under the direct-import protocol.

Fresh changed-code-only cold-process tests demonstrated an observation and encounter sidecar saved-read behavior difference: importing the bridge alone now threw an uncomposed-slot error, while loading the original provider allowed the same invalid proof to return null. Final tests passed 1/1 each, TAP 135.6886 ms and 274.6877 ms. They use fake visibility, Session and storage; they establish the new provider prerequisite rather than real SQLite compatibility. The main GM imports providers separately, while independent Narrative salience readers can reach this bridge.

The proposal and its exact temporary manifest retirement are preserved in `C120-PROPOSED.patch`; the eight production files and the 23 transition records were restored to C119 behavior. `C120-RETIRED.json` is historical attempted retirement evidence only: those entries remain active. The inherited `C120-RUN.json` is retained unchanged. C120 remains locally held pending a compatibility-preserving provider migration; it is not completed or a global blocker.

Observation test SHA256 `30CC7AC1030AC5BBE17E9CA05E0093CEC754B9050D9B52E71FE41F0068D4FF03`; encounter test `16831132ADDC06569F30B0D6369F2E04CD4F6B47816E798F6B08572462E9169B`. Tests/logs are local only. No provider, live service or production database use. Release unauthorized.

C121 subsequently resolves only the World receipt boundary by moving the original implementation into World and retaining its root re-export; it avoids the receipt provider slot. C120's Narrative unit and encounter parts remain held.
