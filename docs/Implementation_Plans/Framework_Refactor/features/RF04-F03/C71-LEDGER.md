# RF04-F03 C71 organization World source

Knowledge organization composition now calls the existing World source port and new fixed Knowledge record port. The existing Knowledge–World pair binds the same original World record function at startup. The original native rules and legacy root reader remain in place.

Fresh local `rf04-f03-c71.test.mjs` ran once,: 1/1 passed, exit 0, TAP 179.1273 ms. A fake read-only database confirms the organization inbox remains readable before startup, the new record port fails closed before binding, missing and inactive records fail, the active native record is returned unchanged, missing source and undisclosed GM source are rejected, and no writes occur. This does not qualify a positive organization review, actual SQLite transactions or live delivery. Six changed-source/test syntax checks passed. SHA256: contract `02D7318FBED4367C255B363B5BF12979EE2BB67AF63D8D8DAA800A346BD05153`, Knowledge public `28B2FF11861BDC6C32BA73BA394D73750513A8EA924015B07D643BFDE4A36515`, pair `12D7329FE9B826873AEEA6F49208D29B1405D608F2BDC76F6FBF0C88B9EF3EB0`, initializer `DFD3F59035FD26E5FF1CD412C61F66C3DB8DBF6F4C319119B5322C83FAF44ED0`, owned-community `808D606D0D54D4FC7080302C217110B92EED6C60A75B6BC3AFDD0D4256BFB486`, local test `C6E265AA985B46BCCAE6B8DABE4F12C16E81CCA52BABCD399A2F8EDD85291DDC`. Provider calls/tokens/cost 0/0/$0; Codex usage unmeasured.

Architecture gate and transition retirement await coordinated checkpoint. RF04 remains open. RELEASE NOT AUTHORIZED.

Protocol audit: the test directly imports the initializer, Knowledge public API and organization source changed by C71, plus Node standard libraries. The fake-database and positive-review limitations above still apply.
