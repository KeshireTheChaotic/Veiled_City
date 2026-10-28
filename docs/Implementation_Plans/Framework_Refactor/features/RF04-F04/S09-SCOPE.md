# RF04-F04 S09 — Negotiation World sources

Replace Session negotiation's direct World source and institution imports with its existing Session–World source interface and a separate fixed institution consumer supplied through the same pair. The separate interface preserves the existing consumer's binding contract. The original World source, institution and delegation rules remain authoritative. The sole exported negotiation operation already required the existing Session–World port before reaching these functions, preserving its pre-bootstrap failure ordering.

Rollback all five changed source modules and the new Session institution contract together; restore exact retired transition records from S09-RETIRED.json. No gameplay rule, schema, provider or authority is added.
