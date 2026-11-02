# RF06-F04 R89 — Audience-filtered handout list presentation

Move only the existing `/vc handout list` text construction into a Discord-owned formatter. Preserve Application-owned GM access, active-character resolution, the exact user-scoped `listHandoutsFor` arguments, private reply, empty-state copy and 1,950-character clipping behavior. No Persistence SQL, content access policy, handout lifecycle or canon authority moves.

Fresh tests cover exact labels, empty output, clipping, actual GM/player command filters and private ephemeral replies. The formatter receives only rows already returned by the existing audience-filtered query.
