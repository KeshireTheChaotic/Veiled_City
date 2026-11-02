# RF05-F04 C149 — Character export serializer ownership

The Character export projection, private-scope builders, Markdown formatters,
DOCX serializer, and player/GM file assembly now live in
`frameworks/character/character-export.js`. The original functions are exposed
through Character public, and the root module re-exports the same function
objects for existing callers. Function bodies remain byte-identical after the
import-path changes.

Fresh focused qualification passed 2/2; changed-file syntax passed 4/4. The
checks cover export API identity, player/private field separation, output
formats, original database read arguments, and input immutability. Exact
terminal outcomes are in `C149-TEST.log`, `C149-SYNTAX.log`, and
`C149-ARCHITECTURE.log`.

The root compatibility path remains present for command and handout callers,
so its existing transition entries are retained. The ownership/crosswalk rows
describe the moved implementation; the callers remain a separate migration.
