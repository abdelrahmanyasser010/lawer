import test from "node:test";
import assert from "node:assert/strict";
import {
  apartmentSaleTemplateDefinition,
  createSampleFieldValues,
  freelancerTemplateDefinition,
  inspectTemplateDefinition,
  moveArrayItem,
  rentalTemplateDefinition,
} from "../dist/index.js";

test("published sale and rental definitions have no structural publish errors", () => {
  const sale = inspectTemplateDefinition(apartmentSaleTemplateDefinition);
  const rental = inspectTemplateDefinition(rentalTemplateDefinition);
  assert.deepEqual(sale.errors, []);
  assert.deepEqual(rental.errors, []);
  assert.ok(sale.stats.legalClauses > 0);
  assert.ok(rental.stats.legalClauses > 0);
});

test("freelancer service definitions are publish-ready", () => {
  const result = inspectTemplateDefinition(freelancerTemplateDefinition);
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.variants, 3);
  assert.equal(result.stats.optionalClauses, 11);
  assert.ok(result.stats.legalClauses > 100);
});

test("sample values cover the selected variant fields", () => {
  const variant = rentalTemplateDefinition.variants[0];
  const values = createSampleFieldValues(rentalTemplateDefinition, variant.key, []);
  const fieldKeys = variant.steps.flatMap((step) => step.fields.map((field) => field.key));
  assert.ok(fieldKeys.length > 10);
  assert.ok(fieldKeys.every((key) => Object.hasOwn(values, key)));
});

test("moveArrayItem reorders without mutating source", () => {
  const source = ["a", "b", "c"];
  assert.deepEqual(moveArrayItem(source, 0, 2), ["b", "c", "a"]);
  assert.deepEqual(source, ["a", "b", "c"]);
});

test("freelancer party fields preserve required and optional color rules", () => {
  const visual = freelancerTemplateDefinition.variants.find((item) => item.key === "visual_identity_design");
  assert.ok(visual);
  const clientStep = visual.steps.find((item) => item.key === "visual_client_party");
  assert.ok(clientStep);
  const fields = Object.fromEntries(clientStep.fields.map((field) => [field.key, field]));

  assert.equal(fields.visual_client_name.required, true);
  assert.equal(fields.visual_client_nationality.required, true);
  assert.equal(fields.visual_client_national_id.required, true);
  assert.equal(fields.visual_client_address.required, true);
  assert.equal(fields.visual_client_phone.required, true);

  assert.equal(Boolean(fields.visual_client_id_issuer.required), false);
  assert.equal(Boolean(fields.visual_client_id_issue_date.required), false);
  assert.equal(Boolean(fields.visual_client_email.required), false);

  assert.equal(fields.visual_client_company_name.required, true);
  assert.equal(fields.visual_client_company_name.visibleWhen.fieldKey, "visual_client_party_type");
  assert.equal(fields.visual_client_company_name.visibleWhen.value, "company");
});

test("freelancer annex steps are inserted only when selected", async () => {
  const { resolveWizardDefinition } = await import("../dist/index.js");
  const base = resolveWizardDefinition(
    freelancerTemplateDefinition,
    "website_development",
    [],
    { website_client_party_type: "individual", website_provider_party_type: "individual" },
  );
  const withScope = resolveWizardDefinition(
    freelancerTemplateDefinition,
    "website_development",
    ["website_scope_annex"],
    { website_client_party_type: "individual", website_provider_party_type: "individual" },
  );
  assert.equal(base.steps.some((step) => step.key === "website_scope_overview"), false);
  assert.equal(withScope.steps.some((step) => step.key === "website_scope_overview"), true);
  assert.ok(withScope.activeClauseKeys.length > base.activeClauseKeys.length);
});
