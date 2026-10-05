# Veiled City v3.2.3 — JSON Reliability Hotfix

- Fixed `/vc-character concept` failures caused by quoted text in descriptions.
- Added detection for malformed and **unexpected-end/truncated JSON** responses.
- Structured AI responses now automatically retry once with a larger output budget when parsing fails.
- Character concepts now use at least **3200 output tokens**; retry cap defaults to **6000**.
- Added the same structured-response protection to GM turns, routing, assembly, NPC proxy packets, rules answers, and downtime.
- No database migration, Discord permission change, channel change, or command re-registration is required from v3.2.2.
