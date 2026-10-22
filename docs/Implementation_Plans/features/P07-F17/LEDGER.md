# P07-F17 — Ledger

**Status:** PARTIAL — public/private source projection and source-revocation rebuild passed; replay/publication/lifecycle coverage remains unverified.

| Contract | Result |
|---|---|
| Distinct owners and actual presence | Two separately owned PCs are checked into the same active disposable SQLite session; a native scene/presence source places both and the NPC. Accepted typed speech and current NPC hearing memories are produced by production functions. |
| Public/private knowledge | Two public utterances reach the party packet; one character-private utterance reaches only its owner-private packet and is absent from the other owner's packet and party packet. |
| Revocation | A public authored-speech origin is retracted through the native event indexer; rebuilding `worldNarrativeBridgePacket` removes the stale signal, and a newly built Director/writer context exposes only the still-current signal. |
| Test | Final fresh union command recorded in F13/F18; F17 1/1 passed; overall union 6/6 passed. Test hash `CBFCE2A04EC4A9D55A720102A9DCB9B675EF0872C57F3DBB10B4A6A8270FFCD2`. |
| Cost/cache | No real provider, Discord or network. No cache changes. F17 makes no generated-narrative or publication claim. |
| Gaps | No database close/reopen restart replay test; no owner-control revision or scene-switch mutation; no required-response overflow fixture; no actual writer output or exactly-once Discord/outbox acceptance. Privacy/private audience here is bounded to this tested authored-speech path. |
| Rollback | Remove the F17 test and its coverage entries; no production state changed. |
