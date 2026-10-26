# RF04-F04 C13 — Session-opening workflow public imports

## Objective

Switch five imports across four opening workflows to their owning framework public APIs for the World calendar event, Session entry-evidence functions, and Operations metrics. Preserve runtime behavior and compatibility re-export paths.

## Changed production modules

- `bot/src/opening-cohort-runner.js`
- `bot/src/opening-entry.js`
- `bot/src/session-opening-recovery.js`
- `bot/src/session-opening-runner.js`

## Acceptance

- The owning public modules and compatibility paths retain the expected export routes.
- The four workflows continue to load.
- Each changed cross-framework dependency targets World, Session, or Operations public API.
- Fresh test imports only the changed workflow modules; it reads source text for the unchanged public and compatibility export routes.
- No gameplay, narrative, publication, or persistence behavior changes.

## Exclusions and holds

No inherited P08/P10 suites or broad test union is part of this slice. The previous draft run listed inherited files and failed; only the new C13-specific test is admissible for qualification. The detached 96-failure full-union log was not available in the checkout, so those failures remain ungrouped and unqualified.
