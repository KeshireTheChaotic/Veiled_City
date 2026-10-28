# RF04-F05 C121 — World simulation receipt source

Move the World simulation receipt implementation into the World framework, preserving the original root reader as a direct re-export of its three existing functions. The Narrative–World bridge uses the World public API. Replace each former compatibility import with the same original World source or owned port and retain all function bodies, source authority and saved record formats. The source is loaded through the World public API, requiring no newly bound provider slot for a standalone saved reader.

Rollback the moved source, World public exports, root re-export and bridge import together and restore any retired transitions. No schema or persisted data migration is involved.
