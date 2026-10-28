# RF04-F05 C135 — Session action-window compatibility correction

Restore `bot/src/scene-action-window.js` as a cold compatibility reader re-exporting the existing Session action-window functions. Restore the exact original RF04 location record from C135-RETIRED.json with its original maximum and deadline. This repairs the removed import path without copying native policy. Existing historical test bodies remain unchanged and are not executed.

Rollback: remove the compatibility reader and the exact restored original record together; doing so again removes the old entrypoint. The existing source-mutating historical test has a separate limitation described in the ledger.
