# Retained executable evidence

These three files are copied byte-for-byte (apart from normalized newlines) from commit `014bc39dadd4035b43649c2c24ef3508939b1c40`, under its `docs/` directory. The subsequent documentation consolidation removed them while mandatory tests still consumed them.

They are **historical test inputs**, not current project status or current rule policy. In particular the large deprecation evidence file retains every original assertion/hash and registration. No security assertion was removed. The runner and natural-language scope test now read these fixture paths. Current schema-table coverage is still asserted against the complete historical audit; any newly introduced table requires an audit update rather than bypassing the check.

`v95-deprecation-coverage-test.mjs` also explicitly maps the existing scoped-GM-rule prompt assertion to its current strengthened rule hierarchy. This does not change production rules or drop the precedence assertion.
