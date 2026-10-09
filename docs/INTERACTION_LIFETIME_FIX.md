# Rules interaction lifetime fix

Rules commands acknowledge Discord before the per-delivery queue, player storage,
permission checks, campaign snapshots or AI requests. `ask` retains its public
answer; `ruling` and `rulings` remain private. Subsequent answers and operation
receipt replays edit that acknowledgement instead of sending another initial reply.

Failed acknowledgements stop execution before database or model work. Discord
10062 (unknown interaction), 10015 (unknown webhook) and 40060 (already acknowledged)
are terminal response failures: neither command handling nor the outer event handler
attempts another response. If sending an error message itself fails, the original
error is preserved and the delivery failure is recorded separately.

State-error audits include command/subcommand, acknowledgement start/completion age,
handler duration, acknowledgement state and secondary response failure. Interaction
tokens and command arguments are not included in this new diagnostic metadata.

The required offline regression suite covers public/private responses, legacy routing,
permission denial, expired initial/final responses, original-error preservation,
already-deferred delivery and sequential/concurrent saved-ruling receipt replay.
Synthetic tests do not verify live Discord latency. Early acknowledgement cannot
recover an interaction already expired before the handler runs (for example after
an event-loop stall); timing diagnostics make that condition distinguishable.

No feature flags, AI delegations or Discord command registration changes are required.
The running bot must be restarted after deploying this code to load it.
