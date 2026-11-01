# RF05-F04 C137 — Operations reads public Intent context through the existing pair

Replace Operations review's intentContext root compatibility import with a fixed Operations-owned context reader. Bind the unchanged Intent public reader through the existing Intent–Operations pair in existing runtime composition. Keep its GM-only result, database/guild arguments, source freshness, omitted-record metrics, query order and errors. Expose no review, configuration or execution capability through this port. reviewAiIntent remains a separately scoped root dependency.

Fresh focused coverage exercises fail-closed binding, actual reviewInbox output using the public Intent reader, current policy/source updates, exact GM query arguments and error propagation. Run affected earlier Operations review tests, changed-file syntax and the RF05 ratchet. No SQL/schema, gameplay, audience, native authority or external service change.
