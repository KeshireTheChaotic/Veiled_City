# C156 ledger

## 2026-10-28 C156 Session owns opening entry source; Narrative and Publication read it through ports

Opening entry projection and narrative candidate move into Session (reading attendance through the Session slot); Narrative and Publication consume them via existing consumer-owned ports; gm.js uses Session public API. Root opening-entry-context retired. Also repoints stale rf04-f05-c104 for Session-owned slot providers (stale since C155). Test: rf04-f06-c56 (untracked per repo test policy).

Tests: one frozen batch of 44 files: 128 tests, 128 pass, 0 fail. Architecture: 4 exact records retired. RF04 exit 0, 0 active violations, 839 modules; RF05 71 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
