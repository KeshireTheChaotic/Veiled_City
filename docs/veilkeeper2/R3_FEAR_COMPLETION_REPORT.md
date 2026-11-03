# R3 — close native interruptions from terminal evidence (slice complete)

Added native completion to the Fear store/coordinator. A saved miss can complete; a hit requires the exact committed action-store damage receipt bound to result hash, offer, owner/control, actor and scene. Pending death eligibility blocks completion. Receipt evidence is reread before commit. Completed replay preserves one history entry and never reapplies damage or spends Fear.

Completion deliberately retains the original PC roll hold and marks `requiresOriginalActionReview`. Ending the NPC interruption does not prove that the original PC action remains legal after changed fiction, resources or conditions. A separate validated continuation route remains required; no general unlock is added.

Modified files: `rules/fear-reservations.js`, `rules/pre-roll-fear-coordinator.js`, `r3-fear-coordinator.test.mjs`, this report and hash manifest.

Verification complete, from `bot`: `node --test tests/veilkeeper2/r3-discord-fear-announcements.test.mjs tests/veilkeeper2/r3-fear-coordinator.test.mjs tests/veilkeeper2/r3-fear-reservations.test.mjs tests/veilkeeper2/r3-fear-durability.test.mjs tests/veilkeeper2/r3-fear-opportunity-reader.test.mjs`: 49 passed, zero failures/skips, 3134.333 ms. Parent output: `fear-completion-test.log`. New real file-backed cases cover native miss/reopen/replay, committed nonlethal damage completion without duplicate effects, retained original action hold, pending owner death exclusion and mismatched receipt rejection. Other unchanged suites did not rerun.

Known holds: lawful original-action continuation; owner death choice/outcome settlement before lethal completion; native Armor/death ingress; feature and condition legality; canonical actor migration; process races and abrupt-crash qualification. Source/choice/delivery fixtures remain synthetic; this does not establish live Discord or full rules parity.

Migration/rollback: optional completion evidence in existing reservation JSON, no schema or production migration. Preserve completion/receipt/hold histories on rollback; do not erase a committed effect to replay. R3 and R0–R8 remain incomplete. Next exact phase: R3 current owner/source/action validation for a completed interruption before allowing its original pending roll; retain an explicit hold for incapacitated or stale actions. No production change, live send, deployment, retirement or completed-major-phase push occurred. Publishing target remains the rebuild branch.
