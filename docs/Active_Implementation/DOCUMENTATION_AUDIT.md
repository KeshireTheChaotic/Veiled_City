# Audit findings — current active engineering docs

## Source / extraction

- Inspected `codex/audience-first-narrative-v9` at `014bc39dadd4035b43649c2c24ef3508939b1c40` via connected GitHub content and recursive tree.
- Audited live source or tests including `gm-arbitration-contract.js`, `gm-unified-arbitration.js`, `pc-incoming.js`, `native-group-features.js`, `native-feature-definitions.json`, `native-feature-catalog.js`, `assembly-*` services, command definitions and validator scripts.
- Compared current later branch to audience-first core qualification commit `c600349b15a057bfde582cb864b52acf12d37c41`; the branch was **22 commits ahead** with **67 changed files**, including native feature, shared arbitration and assembly work.
- Original `docs/` had **242 files / 221 Markdown** among 756 tracked blobs. Large milestone diaries and plans are deliberately **not copied** to this distribution.

## Rebuild decisions

| Finding | Repair |
| --- | --- |
| Existing `docs/README.md` emphasizes early F/AR core more than current open work | New Active README/index pinned to latest source and independent setup package |
| Old 126/126 release receipt is easy to overapply to later feature tree | Strict prior SHA versus current UA17 gate separation |
| Advanced ledger mixes finished historical incident chronology, worktree coordination and active backlog | Condensed present-state ledger with latest passing **scoped** evidence and explicit open states |
| Feature coverage file is a long per-occurrence history with version comments | Bounded handler crosswalk and exact key/status counts, including special-case negatives |
| UA13 authority migration inventory lists current human gate consumers but could be read as implementation | Explicit present/pending/retained matrix with producer **and reader** verification requirement |
| Older UA12 detached-worktree blocker is no longer a present branch integration assertion | Treat subsequent integrated source/targeted tests as current, but do not elevate to whole-UA12/UA17 proof |
| Assembly fix is already source-integrated, though live usability has not been demonstrated | Keep it in scope/operational behavior; only new gaps remain in active implementation plan |

## Non-preservation rule

No historical plan, old kickoff, changelog, upgrade file, original progress diary, source audit archive, past incomplete execution log or completed migration plan is carried into this ZIP. This is an **output packaging decision**, not an instruction to delete Git repository evidence, test fixtures, saved campaign history or native compatibility readers. Source files and GitHub branch were not modified.

## Limits and validation

The repository could not be cloned into the sandbox by `git` due to unavailable network DNS there; the source audit used the connected GitHub repository tools instead. The rebuilt Markdown was subjected to local file/link/package structural checks only. No Node/unit/full validation, CI, live provider/Discord or production database inspection was run as part of this documentation rebuild. Current branch status is as documented in the inspected repository, not independently re-executed.
