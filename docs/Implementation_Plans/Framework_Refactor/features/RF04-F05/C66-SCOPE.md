# RF04-F05 C66 — World identity record paging

Move the two C63 deferred World readers from the root Knowledge record shim to the existing World Knowledge consumer. Supply Knowledge's original paging limit through the existing Knowledge–World adapter and retain both readers' original reconciliation boundary. No record authority or scan size changes. The consumer retains support for existing bindings without a limit; requesting the limit without one fails closed.

Rollback: restore the two direct imports, the previous consumer and adapter, and the two exact transition records in C66-RETIRED.json together. No schema or saved data changes.
