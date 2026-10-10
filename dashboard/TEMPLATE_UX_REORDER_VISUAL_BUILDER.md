# Template UX V7 — Reorder + Visual Builders

## Scope
This pass focuses only on the template-authoring experience and keeps the existing API contract and current dashboard colors.

## Implemented

### 1. Reorder mode
- Added a dedicated **ترتيب بالسحب** mode in the structure stage.
- Variants can be reordered by drag and drop.
- Steps can be reordered by drag and drop inside the same variant.
- Questions/fields can be reordered by drag and drop inside the same step.
- Existing `moveToIndex` API behavior is reused; no new endpoint is required.
- Keyboard fallback: focus the drag handle and use Arrow Up / Arrow Down.
- Mobile fallback: the existing أعلى / أسفل actions remain available under إدارة.

### 2. Repeater visual builder
- Removed the visible JSON textarea for repeater columns.
- Columns are now created and edited visually.
- Supports label, data type, placeholder, required state and select options.
- Columns can be reordered by drag and drop.
- The JSON representation remains internal as a hidden form value only so the current backend contract stays unchanged.

### 3. Annex / optional-clause visual builder
- Removed the visible JSON editor for `insertedSteps`.
- Added visual creation of annex steps and their questions.
- Supports question label, type, required state and select/radio choices.
- Added step/question ordering controls.
- Removed the visible JSON editor for annex default values.

### 4. Default-values visual builder
- Replaced the remaining visible default-values JSON editor with a field/value builder.
- Used for contract variants and optional clauses.
- Supports text, number, boolean, and safely preserves existing complex values without exposing raw JSON.

## Verification
- TypeScript/TSX syntax parser: **62 files / 0 syntax errors**.
- Local import resolver: **0 missing local imports**.
- Visible JSON textareas for `columns`, `insertedSteps`, and `defaultFieldValues`: **0**.
- Color literal comparison against V6: **0 colors added / 0 colors removed**.
- Production build cannot run from this standalone ZIP because the repository-local dependency `../packages/template-engine` is not included. The build stops before Next.js at that missing package.
