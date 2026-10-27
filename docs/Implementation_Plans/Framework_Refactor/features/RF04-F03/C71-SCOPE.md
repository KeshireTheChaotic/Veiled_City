# RF04-F03 C71 — Organization World record and source adoption

Replace Knowledge's owned-community direct World root reader with its existing source port and a separate fixed World record consumer. The existing Knowledge–World pair and startup bind the original World `requireCityRecord` and `requireCitySource` functions. Preserve independent initialization-free historical inbox reads and all owner, source, record and receipt policies. Coordinate retirement of exact direct-import transition `cabe7b289e1d153efb45f79bb58d296460691333b076988925ea4ce3827d169f` and review graph cycle changes.

Rollback original source import, new contract, pair and startup together; restore retired exact transition. No persisted format changes.
