# Template UX V8 — Simple Customer Preview

- Added one `معاينة كعميل` action in the template editor header.
- Opens a side drawer rather than a permanent split-screen.
- Shows the selected contract variant, step order, question order, required state, helper text, and lightweight previews for text, textarea, select, radio, checkbox, attachment, date, number, money, and repeater fields.
- Reuses the existing variant selector state; no new API or backend contract was added.
- Escape and backdrop click close the drawer; background scrolling is locked while it is open.
- Existing legal-output preview remains in `تجربة العقد` so the quick preview does not duplicate that workflow.
- Existing color literals are unchanged from V7.

## Verification
- TypeScript/TSX syntax parse: 62 files, 0 errors.
- Color literal diff versus V7: 0 added / 0 removed.
- Full Next.js production build is still blocked in the standalone ZIP by the missing repository-local `../packages/template-engine` package.
