# RF04-F03 K01 — Knowledge personal owner reader

Extract the original owner assignment and attendance reader from the Knowledge personal-continuity factory into a single Knowledge module and export it through Knowledge's public API. The original root compatibility reader remains and continues to invoke the same factory method; saved and pre-bootstrap callers retain the original check. This prepares a native source for future Session/Knowledge adapters without adding any cross-framework dependency or changing authorization.

Rollback: restore the original factory-local function, remove its public export, new module, fresh test and evidence together. No transition is added or renewed.
