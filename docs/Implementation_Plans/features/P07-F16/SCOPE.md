# P07-F16 — Duplicate-safe coverage loader

Make the actual opt-in fresh delta runner detect duplicate decoded root mapping keys in raw coverage JSON before `JSON.parse` can discard a mapping. Support legal JSON whitespace and escaped key spellings, fail closed on malformed/trailing input, and preserve current unique mapping values and test-selection behavior.

**Exit:** fresh feature tests cover duplicate variants, malformed input, unique registry mappings and the existing GM/bridge test unions; the runner uses the guarded loader. No legacy suite, CI or network activity is invoked.
