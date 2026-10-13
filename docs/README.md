# Veiled City v9.5 — compact offline-validation reporting

**Target:** local V95-04 completion `194a64a6405a0068eb1c0a13d7ff0e38b18d1b11`; start of **V95-05**. No remote push, commit, deployment, production access, or model calls are performed by this package.

## What changes

The installed patch enhances the existing `bot/scripts/validate-offline.mjs` **without replacing its suite definitions or existing acceptance checks**. It retains the full, network-denied mandatory validator, but captures passing test output rather than printing it. It writes `bot/.reports/offline-validation.json` **atomically after each suite** and emits one terminal line on success. On failure, it exits nonzero, prints a short diagnostic, and writes the status/elapsed time/exit code/failure tail; never-reached suites remain `not_run`.

A small `.reports/` entry is added to `bot/.gitignore`. Reports and error tails stay local; **do not commit them or paste private test contents into public channels**. The diagnostic tail is bounded and common token-shaped credentials are redacted, but arbitrary fixture text cannot be guaranteed free of sensitive content. Only share the summary or explicitly reviewed failure lines.

### Apply in the Windows 11 local checkout

From PowerShell, after extracting the package:

```powershell
python .\apply_validation_reporter.py --repo 'D:\Library\Development\Veiled_City'
# Dry-run must report that the runner structure is recognized.
python .\apply_validation_reporter.py --repo 'D:\Library\Development\Veiled_City' --apply
cd 'D:\Library\Development\Veiled_City\bot'
node --check scripts\validate-offline.mjs
cd ..
python .\self_test_reporter.py --repo .
```

The script is **guarded**: if V95-04 changed the old runner loop or final acceptance logic, it stops with `NOT APPLIED` and leaves the checkout untouched. Ask Codex to integrate its reporting logic into the local runner rather than overwriting new registrations or checks. Running it twice is harmless; it recognizes its own marker.

### Run and inspect

```powershell
cd 'D:\Library\Development\Veiled_City\bot'
npm run validate
$r = Get-Content '.\.reports\offline-validation.json' -Raw | ConvertFrom-Json
$r.summary | Format-List
$r.suites | Where-Object status -ne 'passed' | Select-Object id,status,duration_ms,exit_code,signal,failure
```

One report is created per invocation. To preserve historical evidence, copy it under a unique external path after the run; never depend on overwritten previous results. `VC_VALIDATION_REPORT_PATH` optionally changes the output path. The default `npm run validate` continues to run **all mandatory suites**.

### JSON fields

```json
{
  "fixture_only": true,
  "network": "denied",
  "billable_tokens": 0,
  "live_requests": 0,
  "started_at": "ISO 8601 timestamp",
  "finished_at": "ISO 8601 timestamp (once terminal)",
  "summary": {"status":"passed|failed|running","total":130,"passed":130,"failed":0,"not_run":0,"duration_ms":98765},
  "suites": [
    {"id":"d08-window-security-test","status":"passed","duration_ms":122,"exit_code":0,"signal":null,"failure":null},
    {"id":"example-failing-test","status":"failed","duration_ms":210,"exit_code":1,"signal":null,"failure":{"message":"","stderr_tail":"...","stdout_tail":"..."}}
  ],
  "acceptance": ["existing unchanged acceptance mapping"]
}
```

The example is **illustrative**, not a claim that the V95-04 checkout was run. The actual suite count, names, and statuses come from the local test registry.

## Mandatory verification / change boundary

- First verify current local Git HEAD is `194a64a...` and that `git status` is clean; preserve any newer work.
- Run `node --check` on the modified runner. Use a tiny offline reporter regression (passing suite, failing suite, early exit, invalid acceptance, interrupted report, redacted secret, and all-suites registration) before the expensive phase gate. Confirm failure exit status is nonzero and `not_run` rows appear on early exit.
- Do **not** run the entire 130-suite validator merely to check JSON formatting. Run it once at the **V95-05 phase boundary**, after code/test/manifest changes and coverage-preserving deprecations are complete.
- Confirm mandatory D08, PVP30q, FH40, OBS21, native damage/death, Fear, and published-outcome suites remain registered. A shorter console output is not permission to drop behavior coverage.
- The user-reported V95-04 green baseline is 15/15 MET, 130/130 offline suites and both D08 gates; do not claim this package has reproduced that local run.
