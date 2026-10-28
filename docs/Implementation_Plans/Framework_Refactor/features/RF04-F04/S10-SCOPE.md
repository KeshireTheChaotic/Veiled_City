# RF04-F04 S10 — Negotiation World actor state

Session negotiation reads the original World actor resource state through a separate Session-owned, fail-closed source and existing Session–World pair, replacing the simulation compatibility import. The existing Session–World bootstrap binds it. The negotiation entry already requires Session–World composition before this reader is reached; its pre-bootstrap ordering and root module remain intact. World continues to own state and resource defaults; no action, resource spend or PC authority changes.

Rollback the new port, public export, pair/bootstrap wiring and negotiation import together, restoring the exact S10-RETIRED.json record. No transition is added or renewed.
