# RF06-F03 R67 and RF05-F04 C129 — shared transition manifest

`docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` was changed once during R67's coordinated manifest window. Commit `4bda0a6b` removed exactly two R67 edges for the qualified Native–Publication reservation port and also removed C129's legacy-location record `776dd180485471324d144fc0572b8aa54db765b4fca4da923331686e81bbce76` for `bot/src/movement-language.js`.

Agent A subsequently committed C129 implementation, public entrypoint, scope, hash/retirement evidence and phase/crosswalk updates in `f15dbee3`. Those files were not staged in R67. The exact removed C129 transition is documented in [C129-RETIRED.json](../../RF05-F04/C129-RETIRED.json); its implementation and qualification remain separately accounted by the Agent A commit. Do not attempt to remove the same transition again.
