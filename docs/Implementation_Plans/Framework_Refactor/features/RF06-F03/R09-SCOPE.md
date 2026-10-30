# RF06-F03 R09 — Publication delivery receipt primitives

Frozen after R08. Requested exclusive publication-outbox.js and Publication public window; no transaction/queue/reconciliation redesign. Move only original notSent, validatePublicationAcknowledgement and outboxSummary into Publication delivery-receipts.js. Preserve root exported names and function identity, exact return/error/summary shapes, required nonempty message/channel receipt and queued channel comparison. Preserve status/attempt/uncertainty/legacy null defaults. Source/recipient proof remains with existing native validators, not these transport receipt helpers.

Fresh synthetic rows/receipts/error cases and original-body equality. No DB, provider, live Discord or saved-shape migration. Root facade exports remain until exact active callers migrate; no blanket root retirement.
