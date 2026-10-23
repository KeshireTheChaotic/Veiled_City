# RF03-F02 C05 — Native device-use eligibility

Move the existing bounded check that prevents an already disabled electronic device from being used into Daggerheart-owned policy. Preserve exact behavior and diagnostic code: non-device actions and unmarked devices return no issue; a device with `disabled_by` returns `NATIVE_DEVICE_RESET_REQUIRED`. The provider continues to locate the selected inventory item and delegates the eligibility decision. No new reset capability, state change, cost, or device classification is introduced.

Write fresh deterministic cases in `bot/tests/ai-gm-2026-10/`. Run only the frozen changed-code test, syntax checks on changed JS/MJS, and RF03 architecture ratchet. Do not run legacy suites or broad validation. Rollback only the native policy, provider delegation, focused test, and this C05 evidence.
