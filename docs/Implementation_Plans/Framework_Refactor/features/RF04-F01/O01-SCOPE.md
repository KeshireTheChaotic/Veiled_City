# RF04-F01 O01 — World simulation overview source

Move the original read-only `simulationOverview` function to a World-owned source and export it through World's public API. The original `simulation.js` reader re-exports that exact function, preserving standalone calls, saved consumers and identity. This is a prerequisite for Operations adoption; it does not itself remove the Operations cross-framework dependency.

Rollback the World source/public export and restore the original function declaration in `simulation.js` together. No transition is changed or renewed.
