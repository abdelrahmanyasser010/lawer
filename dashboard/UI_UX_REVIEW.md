# Z Draft Dashboard — UI/UX Audit Pass 2

## Scope
Second-pass audit of the complete dashboard source supplied in chat, covering 26 dashboard route pages and shared admin/contract components (62 TypeScript/TSX files in `src`). The focus was consistency, readability, mobile comfort, accessibility, and the contract-template/office-contract authoring flows.

## Automated/static checks run
- TypeScript parser scan across all 62 `.ts/.tsx` files: **0 syntax diagnostics**.
- Relative and `@/` import resolution scan: **0 missing local imports**.
- Typography scan across dashboard/admin/office-contract UI: **0 remaining 8–11px arbitrary text utilities**.
- Secondary-text contrast cleanup: **0 remaining `text-slate-400` usages** in the audited admin/office UI scope.
- Form-control naming scan: **0 standalone unlabeled controls** outside reusable field-editor abstractions that render their own labels.
- Touch-target pass: dashboard buttons now have a **40px minimum height**, with 40px minimum width for aria-labelled icon actions.
- Brand-color scan: alternate legacy gold values removed from admin UI. Required-field indicators use semantic rose/red rather than an off-brand orange.

## Design system decisions
- Font: Cairo retained as the dashboard font.
- Primary navy: `#00102e`.
- Primary gold on light surfaces: `#986410`.
- High-contrast gold on navy: `#d7a94f`.
- Dashboard background: `#f6f8fb`.
- Small admin copy normalised to 13px through the dashboard scope.
- Cairo `font-black` is normalised to weight 800 inside the dashboard to reduce visual heaviness while preserving hierarchy.
- Low-contrast slate-400 copy was promoted to slate-500 in the audited admin surfaces.

## UX changes in this pass
### Global/dashboard
- Increased minimum interactive target size for buttons.
- Improved focus/disabled behaviour and reduced-motion handling.
- Improved secondary-text contrast.
- Added accessible names to standalone filters, payment/manual-entry controls, work-request controls, contract actions, and office-contract customer fields.
- Dialogs now support Escape-to-close, lock background scrolling while open, and use tighter mobile padding.

### Template management
- Kept the 3-stage template-creation flow: basics → starting point → review/create.
- Template creation stepper stacks on narrow phones instead of forcing three cramped columns.
- Template editor remains a six-stage legal workflow: structure → client readiness → clauses → optional additions → preview → validation/publish.
- Fixed the editor side workflow so its sticky position sits below the global dashboard header rather than being covered by it.
- Raw optional-clause JSON is hidden inside an explicitly labelled advanced technical disclosure instead of being part of the default editing surface.
- Fixed a duplicate responsive heading class in the template editor.

### Office contract creation
- Removed all 8–11px microcopy in the workflow.
- Variant/step/client/billing choices have larger touch targets.
- Selection buttons expose `aria-pressed`; current wizard step exposes `aria-current`.
- Three-way customer/billing controls stack on narrow screens instead of becoming cramped.
- Added accessible names for customer and waiver inputs.

## Important verification limitation
A full `npm run build` / browser-based visual regression run cannot be completed from the supplied ZIP because the dashboard depends on the sibling package `../packages/template-engine`, which was not included, and this environment cannot fetch the missing npm dependency tree. Therefore this pass verifies source integrity and UI/UX rules statically, but does **not** claim a successful production build or pixel-level browser verification.

## Recommended final QA in the original monorepo
Run:

```powershell
npm run lint
npm run build
npm run dev
```

Then verify at 360px, 768px, 1024px and desktop widths, focusing on Templates, Template Editor, Office Contract Creation, Contracts, Payments, Work, Users, Settings, and all dialogs.


## Typography reference pass (V4)
- Kept the existing color system unchanged.
- Confirmed Cairo as the dashboard typeface and retained it.
- Dashboard UI now uses Cairo 400/500/600/700 only; heavy 800/900 UI weights were removed.
- Compact scale aligned to the supplied reference: 12px secondary, 14px body/navigation, 16–22px hierarchy.
- Admin inputs are 13px / 40px high and tables remain 13px for a denser but readable desktop dashboard.
- Legal-document typography remains untouched and continues to use its dedicated print font stack.

## Template authoring UX audit — V5

A focused third-pass audit was run on the template catalog, create-template flow, template-version editor, readiness editor, legal clauses, optional annexes, preview, and validation flow.

### High-impact issues fixed

- Creating a template no longer ends on the catalog after a button that promises to open the editor. The flow refreshes the catalog, ensures an initial draft version exists when necessary, and routes directly into the new draft editor.
- Creating a new version no longer leaves the administrator on the catalog. If a draft already exists it is resumed instead of creating a duplicate draft; otherwise the new draft is created and opened.
- Template cards now distinguish **continue editing**, **view legal review**, **view published**, and **create update draft** instead of treating every version state as a generic edit/view action.
- Added a clear route back to the template catalog from the version editor.
- Readiness editing now exposes an explicit unsaved state. Switching variants or leaving the readiness stage warns before discarding changes, and legal-review submission is blocked while readiness changes remain unsaved.
- Validation errors now include a direct “go to problem” action that routes the admin to the relevant authoring stage.
- Legal clauses required by a contract variant are now selected visually by clause title instead of entering clause keys manually.
- Optional annexes now use visual variant selection, visual legal-clause selection, and a human-readable insert-position select instead of key entry for normal workflows.
- Field validation rules are collapsed by default unless the field already has validation, reducing noise for ordinary question editing.
- Template-editor modals now lock background scrolling, support Escape, expose dialog semantics, and use a 40px close target.
- The admin visual weight is kept at Cairo 700 maximum, preventing synthetic 900-weight text while preserving the existing brand colors exactly.

### Intentionally still advanced

Two capabilities remain raw JSON only inside explicitly collapsed advanced areas: repeater/table column definitions and complex optional-annex inserted steps/default field values. These are not part of the normal template authoring path, but a future visual nested-step/table-column builder would remove the final technical escape hatches.

### Verification

- TypeScript/TSX syntax transpile check: 61 source files, 0 syntax diagnostics.
- Local `@/` import resolution scan: 0 missing local imports.
- Brand-color token comparison against V4: 0 colors added, 0 colors removed.
- Full browser/build verification is still blocked by the supplied archive not including the sibling `../packages/template-engine` package and installed dependency tree.

## V6 — Cognitive walkthrough of Templates
A second review method was applied using task-based cognitive walkthrough rather than another visual/static pass. See `TEMPLATE_UX_COGNITIVE_REVIEW.md` for the task scenarios, friction findings, implemented fixes, and remaining advanced-only technical areas.

## V7 — Reorder mode and no-JSON authoring

- Added drag/drop reorder mode for variants, steps, and questions, with keyboard and mobile fallbacks.
- Replaced repeater column JSON editing with a visual column builder.
- Replaced optional-clause inserted-step JSON editing with a visual nested step/question builder.
- Replaced default-field-values JSON editing with a visual field/value builder.
- Kept the backend serialization internal, so current request payloads and endpoints remain compatible.
- Rechecked syntax and local imports; no source parsing errors or missing local imports were found.
- Dashboard color literals are unchanged from V6.
