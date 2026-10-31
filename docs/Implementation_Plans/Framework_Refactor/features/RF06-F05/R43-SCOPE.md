# RF06-F05 R43 — Original shutdown signal registration

After R42 checkpoint, move only final SIGINT/SIGTERM registration statements from index.js into bootstrap helper. Same registration point before client.login and after all event handlers, same two distinct callbacks and same voice.destroy→db.close→client.destroy→process.exit(0) synchronous invocation order. Preserve thrown failures stopping later steps, ignored return values/promises, repeat-signal behavior and process receiver. No added timeout, retry, catch, async wait, cleanup or shutdown policy.

Request exclusive index.js source slot for these two statements and one import only. No shared API/registry/db/native/GM/turn edits. Fresh fake lifecycle/voice/DB/client cases plus exact callback-body/root proof and syntax/checker; never emit real signals/exit/close a real DB/client. One frozen suite, no prior unrelated passes rerun. Full RF06/release unqualified.
