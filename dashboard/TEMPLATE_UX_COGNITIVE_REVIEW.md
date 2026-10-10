# Template UX Review — Cognitive Walkthrough V6

## Review method
This pass intentionally did **not** repeat the previous typography/accessibility audit. It reviewed the feature as a first-time admin completing concrete tasks:

1. Create a contract from scratch.
2. Create a contract by copying an existing one.
3. Resume a draft.
4. Start an update for a published contract.
5. Build variants, steps and questions.
6. Write legal clauses using customer data.
7. Review readiness errors and submit for legal review.
8. Recover safely from accidental close/delete actions.

The review focused on decision count, visible action density, technical terminology, error prevention, next-step clarity and recovery.

## Main findings and changes

### 1. Template library was too dense for scanning
Before, each contract card exposed pricing, editing, new-version actions, three metric boxes, category editing and version history at the same time.

Changed to:
- One primary action based on the current lifecycle state.
- Compact inline metadata instead of three large metric boxes.
- Pricing, category movement and version history moved under **إدارة العقد والإصدارات**.
- Draft and legal-review state are visible directly on the card.

### 2. Creation mixed content design with commercial pricing
Price already has a dedicated Pricing area, so asking for it while creating the legal template adds an unrelated decision.

Changed to:
- Step 1 focuses on name, category and customer-facing description.
- Step 2 chooses blank vs copy.
- Step 3 reviews the setup and starts building.
- Pricing remains managed separately.
- Closing the wizard after entering data now warns before discarding it.
- When possible, the created template ID returned by the API is used directly before falling back to list-diff detection.

### 3. The editor exposed too many actions at every hierarchy level
Variants, steps and fields each showed move/edit/add/delete controls simultaneously.

Changed to:
- Variant: **إضافة خطوة** + **تعديل النوع** stay visible; ordering/delete move under **إدارة**.
- Step: **إضافة سؤال** + **تعديل الخطوة** stay visible; ordering/delete move under **إدارة**.
- Field: **تعديل السؤال** and contextual help stay visible; ordering/delete move under **إدارة**.
- The explanatory “type → step → question” guide is collapsible after the user understands it.

### 4. Empty states did not always tell the user what to do next
Changed to action-oriented empty states:
- Add first contract type.
- Add first step.
- Add first question.

### 5. Draft submission could happen before the user reached the review stage
The top-level draft action previously allowed direct submission from anywhere in the editor.

Changed to:
- Header action now opens **فحص الجاهزية**.
- The actual **إرسال للمراجعة القانونية** action remains at the end of the workflow.
- This preserves the intended sequence: build → preview → validate → submit.

### 6. Legal clause editing required remembering technical field keys
Changed to:
- Legal clause editor now has **إدراج بيانات من إجابات العميل**.
- Admin selects a human-readable question and inserts its variable at the cursor position.
- Variables written in `{{...}}` are detected automatically when saving.
- Manual variable entry remains only in advanced settings for edge cases.

### 7. Technical identifiers were too visible in normal work
Changed to:
- Clause keys hidden under **تفاصيل تقنية**.
- Optional-clause keys hidden under **تفاصيل تقنية**.
- Validation code/path hidden under **تفاصيل تقنية**.
- Preview missing-variable output maps field keys back to customer-facing field labels when possible.
- Clause search no longer asks normal users to search by technical key.

### 8. Readiness editing needed better destructive-action protection
Changed to:
- Confirmation before deleting a readiness section.
- Confirmation before deleting a readiness requirement.
- Existing unsaved-change warning when switching variants remains in place.

## Static QA performed after this pass
- Parsed all 61 TS/TSX source files with the TypeScript parser: **0 syntax errors**.
- Checked local and `@/` imports: **0 missing local imports**.
- Compared project hex color tokens against V5: **0 colors added / 0 colors removed**.
- Cairo typography and the existing color palette were left unchanged.

## Remaining items worth a future pass
- Repeater-column configuration still uses JSON in Advanced Settings.
- Complex inserted-step definitions for optional annexes still use JSON in Advanced Settings.
- Reordering still uses Up/Down controls; a dedicated reorder mode or drag-and-drop could improve very large templates.
- A full browser/production build still requires the parent `../packages/template-engine` package and the complete project dependency installation.
