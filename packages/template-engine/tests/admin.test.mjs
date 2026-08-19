import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import engine from "../dist/index.js";
const {
  apartmentSaleTemplateDefinition,
  auditVariantFieldCoverage,
  websiteFieldCoverageExternalBindings,
  visualIdentityFieldCoverageExternalBindings,
  socialMediaFieldCoverageExternalBindings,
  apartmentSaleFieldCoverageExternalBindings,
  rentalFieldCoverageExternalBindings,
  createSampleFieldValues,
  evaluateCondition,
  freelancerTemplateDefinition,
  inspectTemplateDefinition,
  moveArrayItem,
  numberToEgyptianPoundsWords,
  renderLegalClauses,
  resolveWizardDefinition,
  validateDynamicDefinition,
  derivedClauseVariableDependencies,
  rentalTemplateDefinition,
} = engine;

test("published sale and rental definitions have no structural publish errors", () => {
  const sale = inspectTemplateDefinition(apartmentSaleTemplateDefinition);
  const rental = inspectTemplateDefinition(rentalTemplateDefinition);
  assert.deepEqual(sale.errors, []);
  assert.deepEqual(rental.errors, []);
  assert.ok(sale.stats.legalClauses > 0);
  assert.ok(rental.stats.legalClauses > 0);
});

test("all published legal text is free from recurring OCR and court-selection conflicts", () => {
  const definitions = [rentalTemplateDefinition, apartmentSaleTemplateDefinition, freelancerTemplateDefinition];
  const clauses = definitions.flatMap((definition) => definition.legalClauses ?? []);
  assert.equal(clauses.length, 378);
  const forbidden = /(?:^|[\s،؛:.(])و?ال\s+|اال|األ|اإل|اآل|العالقات?|استالم|إخالل|إخالء|إبالغ|خالل|قبولاباستمرار|المع\s+تمدة|جوالات المراجعة|ت\s+نظيم|أ\s+عمال|المحكمة المختصة الواقع في دائرتها العقار|للمحكمة (?:المختصة )?التي يقع في دائرتها العقار/m;
  for (const clause of clauses) {
    assert.doesNotMatch(`${clause.titleAr}\n${clause.bodyAr}`, forbidden, clause.key);
  }
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

test("website manual annexes are active only after explicit user selection and stay out of wizard steps", async () => {
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
  assert.equal(base.activeClauseKeys.some((key) => key.startsWith("website_scope_annex_source_")), false);
  assert.equal(base.activeClauseKeys.some((key) => key.startsWith("website_technical_annex_source_")), false);
  assert.equal(base.activeClauseKeys.some((key) => key.startsWith("website_project_data_annex_source_")), false);
  assert.equal(base.activeClauseKeys.some((key) => key.startsWith("website_delivery_annex_source_")), false);
  assert.ok(withScope.activeClauseKeys.some((key) => key.startsWith("website_scope_annex_source_")));
  assert.equal(withScope.activeClauseKeys.some((key) => key.startsWith("website_technical_annex_source_")), false);
  assert.equal(withScope.steps.some((step) => step.key === "website_scope_overview"), false);
});


test("visual identity semantics remain intact in freelancer v15", () => {
  assert.equal(freelancerTemplateDefinition.version, 15);
  const visual = freelancerTemplateDefinition.variants.find((item) => item.key === "visual_identity_design");
  assert.ok(visual);
  const allFields = visual.steps.flatMap((step) => step.fields);
  const byKey = Object.fromEntries(allFields.map((field) => [field.key, field]));

  assert.equal(byKey.visual_execution_duration_value.required, true);
  assert.equal(byKey.visual_execution_duration_unit.required, true);
  assert.equal(byKey.visual_main_scope_services.required, true);
  assert.equal(byKey.visual_output_formats.required, true);
  assert.equal(byKey.visual_revision_rounds.required, true);
  assert.equal(byKey.visual_ip_rights_mode.required, true);
  assert.equal(byKey.visual_contract_value.required, true);
  assert.equal(Boolean(byKey.visual_contract_value_words), false);
  assert.equal(byKey.visual_competent_court.required, true);
  assert.ok(byKey.visual_competent_court.options.some((option) => option.value === "المنيا"));
  assert.ok(byKey.visual_competent_court.options.some((option) => option.value === "أخرى"));
  assert.ok(byKey.visual_competent_court.options.some((option) => option.value === "القاهرة"));
  assert.equal(Boolean(byKey.visual_project_brief.required), false);
  assert.equal(Boolean(byKey.visual_target_audience), false);
  assert.equal(Boolean(byKey.visual_review_rounds), false);
  assert.equal(Boolean(byKey.visual_client_identity_documents), false);
  assert.equal(Boolean(byKey.visual_provider_identity_documents), false);
});

test("requiredWhen supports nested optional-parent contact rules", () => {
  const off = resolveWizardDefinition(
    freelancerTemplateDefinition,
    "visual_identity_design",
    [],
    { visual_client_party_type: "individual", visual_provider_party_type: "individual", visual_messaging_apps_enabled: false },
  );
  assert.equal(off.steps.flatMap((step) => step.fields).some((field) => field.key === "visual_messaging_client_number"), false);

  const reuseValues = {
    visual_client_party_type: "individual",
    visual_provider_party_type: "individual",
    visual_messaging_apps_enabled: true,
    visual_messaging_use_party_phones: true,
  };
  const reuse = resolveWizardDefinition(freelancerTemplateDefinition, "visual_identity_design", [], reuseValues);
  const reuseFields = Object.fromEntries(reuse.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(reuseFields.visual_messaging_apps.required, true);
  assert.equal(Boolean(reuseFields.visual_messaging_client_number), false);
  assert.equal(Boolean(reuseFields.visual_messaging_provider_number), false);

  const customValues = { ...reuseValues, visual_messaging_use_party_phones: false };
  const custom = resolveWizardDefinition(freelancerTemplateDefinition, "visual_identity_design", [], customValues);
  const customFields = Object.fromEntries(custom.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(customFields.visual_messaging_client_number.required, true);
  assert.equal(customFields.visual_messaging_provider_number.required, true);

  const issues = validateDynamicDefinition(custom, { variantKey: "visual_identity_design", selectedOptionalClauseKeys: [], fieldValues: customValues, attachmentRefs: {} });
  assert.ok(issues.some((issue) => issue.fieldKey === "visual_messaging_apps"));
  assert.ok(issues.some((issue) => issue.fieldKey === "visual_messaging_client_number"));
  assert.ok(issues.some((issue) => issue.fieldKey === "visual_messaging_provider_number"));
});

test("visual identity can reuse party e-mails or require explicit notice e-mails", () => {
  const reuseValues = {
    visual_client_party_type: "individual",
    visual_provider_party_type: "individual",
    visual_email_notices_enabled: true,
    visual_notice_use_party_emails: true,
  };
  const reuse = resolveWizardDefinition(freelancerTemplateDefinition, "visual_identity_design", [], reuseValues);
  const reuseFields = Object.fromEntries(reuse.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(reuseFields.visual_client_email.required, true);
  assert.equal(reuseFields.visual_provider_email.required, true);
  assert.equal(Boolean(reuseFields.visual_notice_client_email), false);

  const customValues = { ...reuseValues, visual_notice_use_party_emails: false };
  const custom = resolveWizardDefinition(freelancerTemplateDefinition, "visual_identity_design", [], customValues);
  const customFields = Object.fromEntries(custom.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(Boolean(customFields.visual_client_email.required), false);
  assert.equal(Boolean(customFields.visual_provider_email.required), false);
  assert.equal(customFields.visual_notice_client_email.required, true);
  assert.equal(customFields.visual_notice_provider_email.required, true);
});

test("visual identity company, POA, court and witness dependencies are enforced", () => {
  const values = {
    visual_client_party_type: "company",
    visual_client_authority_basis: "power_of_attorney",
    visual_provider_party_type: "individual",
    visual_competent_court: "أخرى",
    visual_witness_1_enabled: true,
  };
  const resolved = resolveWizardDefinition(freelancerTemplateDefinition, "visual_identity_design", [], values);
  const fields = Object.fromEntries(resolved.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  for (const key of [
    "visual_client_company_name", "visual_client_company_legal_form", "visual_client_commercial_register",
    "visual_client_tax_number", "visual_client_legal_representative", "visual_client_representative_capacity",
    "visual_client_authority_basis", "visual_client_company_address",
  ]) assert.equal(fields[key].required, true, key);
  assert.equal(Boolean(fields.visual_client_company_email.required), false);
  assert.equal(Boolean(fields.visual_client_company_phone.required), false);
  for (const key of [
    "visual_client_power_of_attorney_number", "visual_client_power_of_attorney_year", "visual_client_power_of_attorney_office",
  ]) assert.equal(fields[key].required, true, key);
  assert.equal(fields.visual_competent_court_other.required, true);
  assert.equal(fields.visual_witness_1_name.required, true);
  assert.equal(fields.visual_witness_1_national_id.required, true);
  assert.equal(Boolean(fields.visual_witness_2_name), false);
});

test("visual identity manual annexes stay out of the wizard but keep complete blank layouts", () => {
  const annexKeys = ["visual_identity_scope_annex", "visual_identity_financial_annex", "visual_identity_approvals_annex"];
  for (const key of annexKeys) {
    const annex = freelancerTemplateDefinition.optionalClauses.find((item) => item.key === key);
    assert.ok(annex, key);
    assert.equal(annex.manualFillAnnex, true);
    assert.ok(annex.insertedSteps.length >= 5, `${key} should carry its printable blank layout`);
    assert.ok(annex.legalClauseKeys.length > 0, `${key} should retain source-backed legal clauses`);
  }
  const resolved = resolveWizardDefinition(
    freelancerTemplateDefinition,
    "visual_identity_design",
    annexKeys,
    { visual_client_party_type: "individual", visual_provider_party_type: "individual" },
  );
  assert.equal(resolved.steps.some((step) => step.key === "visual_scope_project"), false);
  assert.equal(resolved.steps.some((step) => step.key === "visual_financial_terms"), false);
  assert.equal(resolved.steps.some((step) => step.key === "visual_approval_setup"), false);
});


test("social media contract enforces reviewed conditional semantics", () => {
  const social = freelancerTemplateDefinition.variants.find((item) => item.key === "social_media_management");
  assert.ok(social);
  assert.deepEqual(social.allowedOptionalClauseKeys, []);
  const values = {
    ...social.defaultFieldValues,
    social_client_party_type: "company",
    social_client_authority_basis: "power_of_attorney",
    social_provider_party_type: "individual",
    social_competent_court: "أخرى",
    social_messaging_apps_enabled: true,
    social_messaging_use_party_phones: false,
    social_witness_1_enabled: true,
  };
  const resolved = resolveWizardDefinition(freelancerTemplateDefinition, "social_media_management", [], values);
  const fields = Object.fromEntries(resolved.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  for (const key of ["social_client_power_of_attorney_number", "social_client_power_of_attorney_year", "social_client_power_of_attorney_office"]) assert.equal(fields[key].required, true, key);
  assert.equal(fields.social_competent_court_other.required, true);
  assert.equal(fields.social_messaging_client_number.required, true);
  assert.equal(fields.social_messaging_provider_number.required, true);
  assert.equal(fields.social_witness_1_name.required, true);
  assert.equal(fields.social_witness_1_national_id.required, true);
  assert.equal(Boolean(fields.social_witness_2_name), false);
});

test("social media main contract has explicit scope and source-backed commercial fields", () => {
  const social = freelancerTemplateDefinition.variants.find((item) => item.key === "social_media_management");
  const fields = Object.fromEntries(social.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  for (const key of ["social_accounts", "social_contract_duration_value", "social_contract_duration_unit", "social_fee_nature", "social_fee", "social_service_start_date"]) assert.equal(fields[key].required, true, key);
  assert.equal(fields.social_competent_court.required, true);
  assert.ok(fields.social_competent_court.options.some((option) => option.value === "المنيا"));
  assert.ok(fields.social_competent_court.options.some((option) => option.value === "أخرى"));
  assert.equal(Boolean(fields.social_managed_platforms), false);
  assert.equal(Boolean(fields.social_scope_summary), false);
  assert.equal(Boolean(fields.social_contract_duration), false);
  assert.equal(Boolean(fields.social_fee_words), false);
  assert.equal(Boolean(fields.social_account_access_attachment), false);
  assert.equal(Boolean(fields.social_brand_assets_attachment), false);
  assert.equal(Boolean(fields.social_project_type), false, "web-project copy/paste field must not exist in social contract");
});

test("all freelancer variants require an explicit competent court before review", () => {
  const courtKeyByVariant = {
    visual_identity_design: "visual_competent_court",
    website_development: "website_competent_court",
    social_media_management: "social_competent_court",
  };
  for (const variant of freelancerTemplateDefinition.variants) {
    const courtStep = variant.steps.at(-2);
    assert.equal(courtStep?.titleAr, "المحكمة المختصة", `${variant.key}: court step order`);
    const courtField = courtStep.fields.find((field) => field.key === courtKeyByVariant[variant.key]);
    assert.equal(courtField?.required, true, `${variant.key}: court is required`);
    assert.ok(courtField?.options.some((option) => option.value === "القاهرة"), `${variant.key}: Cairo option`);
    assert.ok(courtField?.options.some((option) => option.value === "المنيا"), `${variant.key}: Minya option`);
  }
});

test("social media delay penalty uses exactly one source-backed calculation path", () => {
  const social = freelancerTemplateDefinition.variants.find((item) => item.key === "social_media_management");
  assert.ok(social);
  const baseFields = Object.fromEntries(social.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(baseFields.social_delay_penalty_mode.required, true);
  assert.equal(baseFields.social_delay_penalty_cap_percentage.required, true);
  assert.equal(social.requiredClauseKeys.includes("social_media_management_source_section_16"), false);
  for (const key of [
    "social_media_management_article_14_intro",
    "social_media_delay_penalty_amount_clause",
    "social_media_delay_penalty_percentage_clause",
    "social_media_management_article_14_tail",
  ]) assert.ok(social.requiredClauseKeys.includes(key), key);

  const amountResolved = resolveWizardDefinition(
    freelancerTemplateDefinition,
    "social_media_management",
    [],
    { ...social.defaultFieldValues, social_delay_penalty_mode: "amount" },
  );
  const amountFields = Object.fromEntries(amountResolved.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(amountFields.social_delay_penalty_amount.required, true);
  assert.equal(Boolean(amountFields.social_delay_penalty_percentage), false);

  const percentageResolved = resolveWizardDefinition(
    freelancerTemplateDefinition,
    "social_media_management",
    [],
    { ...social.defaultFieldValues, social_delay_penalty_mode: "percentage" },
  );
  const percentageFields = Object.fromEntries(percentageResolved.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(percentageFields.social_delay_penalty_percentage.required, true);
  assert.equal(Boolean(percentageFields.social_delay_penalty_amount), false);
});

test("full nine-contract publication files stay version-aligned", () => {
  const rentalBackend = JSON.parse(readFileSync(new URL("../../../backend/database/template-definitions/rental.json", import.meta.url), "utf8"));
  const saleBackend = JSON.parse(readFileSync(new URL("../../../backend/database/template-definitions/apartment_sale.json", import.meta.url), "utf8"));
  const freelancerBackend = JSON.parse(readFileSync(new URL("../../../backend/database/template-definitions/freelancer.json", import.meta.url), "utf8"));
  const migration = readFileSync(new URL("../../../backend/database/migrations/2026_08_19_000700_publish_full_nine_contracts_experience.php", import.meta.url), "utf8");
  assert.equal(rentalTemplateDefinition.version, 15);
  assert.equal(apartmentSaleTemplateDefinition.version, 14);
  assert.equal(freelancerTemplateDefinition.version, 15);
  assert.equal(rentalBackend.version, 15);
  assert.equal(saleBackend.version, 14);
  assert.equal(freelancerBackend.version, 15);
  assert.match(migration, /'slug' => 'freelancer'[\s\S]*'version' => 15/);
  assert.match(migration, /'slug' => 'apartment_sale'[\s\S]*'version' => 14/);
  assert.match(migration, /'slug' => 'rental'[\s\S]*'version' => 15/);
});

test("rental v15 exposes three source-specific lease variants with derived legal values and no court dropdown", () => {
  assert.equal(rentalTemplateDefinition.version, 15);
  assert.deepEqual(
    rentalTemplateDefinition.variants.map((variant) => variant.key),
    ["residential_lease", "commercial_lease", "administrative_lease"],
  );
  const forbidden = new Set([
    "landlord_id_card_front", "landlord_id_card_back", "tenant_id_card_front", "tenant_id_card_back",
    "renewal_policy", "sublease_allowed", "competent_court", "rental_jurisdiction_court", "has_deposit", "monthly_rent",
    "pets_policy", "daily_late_penalty_amount", "lease_duration_text", "deposit_amount_words", "rent_amount_words",
  ]);
  for (const variant of rentalTemplateDefinition.variants) {
    const fields = variant.steps.flatMap((step) => step.fields);
    const keys = new Set(fields.map((field) => field.key));
    for (const key of forbidden) assert.equal(keys.has(key), false, `${variant.key}:${key}`);
    assert.equal(variant.requiredClauseKeys.includes("rental_property_jurisdiction_clause"), false, `${variant.key}:no duplicate court clause`);
    assert.equal(fields.find((field) => field.key === "property_governorate")?.required, true);
    assert.equal(fields.find((field) => field.key === "property_city")?.required, true);
  }
});

test("rental v15 core finance, duration and source-specific payment semantics are fail-closed", () => {
  const commonRequired = [
    "contract_date", "lease_duration_value", "lease_duration_unit", "start_date", "end_date", "property_delivery_date",
    "deposit_amount", "deposit_payment_status", "rent_period", "rent_amount", "rent_due_day", "holdover_daily_compensation",
    "property_governorate", "property_city", "property_district", "property_street", "floor_number", "unit_number", "property_area",
    "electricity_meter_exists", "water_meter_exists", "gas_meter_exists",
  ];
  for (const variant of rentalTemplateDefinition.variants) {
    const fields = Object.fromEntries(variant.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
    for (const key of commonRequired) assert.equal(fields[key]?.required, true, `${variant.key}:${key}`);
    assert.equal(Boolean(fields.contract_copies_count), false);
    assert.equal(variant.defaultFieldValues.contract_copies_count, 2);
    assert.equal(Object.hasOwn(variant.defaultFieldValues ?? {}, "deposit_amount"), false);
    assert.equal(Object.hasOwn(variant.defaultFieldValues ?? {}, "rent_amount"), false);
    assert.equal(Object.hasOwn(variant.defaultFieldValues ?? {}, "rent_due_day"), false);
    assert.equal(Object.hasOwn(variant.defaultFieldValues ?? {}, "holdover_daily_compensation"), false);

    if (variant.key === "residential_lease") {
      assert.equal(fields.rental_payment_methods.required, true);
      assert.equal(fields.rental_payment_methods.minRows, 1);
      assert.equal(fields.residential_payment_grace_days.required, true);
      assert.equal(fields.late_payment_daily_compensation.required, true);
      assert.equal(fields.residential_pets_allowed.required, true);
      assert.equal(Boolean(fields.rental_payment_method), false);
    } else {
      assert.equal(fields.rental_payment_method.required, true);
      assert.equal(Boolean(fields.rental_payment_methods), false);
      assert.equal(fields.late_payment_daily_compensation.required, true);
      if (variant.key === "commercial_lease") assert.equal(fields.commercial_nonpayment_termination_days.required, true);
      if (variant.key === "administrative_lease") {
        assert.equal(fields.administrative_rent_grace_days.required, true);
        assert.equal(variant.defaultFieldValues.administrative_rent_grace_days, 7);
      }
    }
  }
});

test("rental company identity and notice contacts are required only on their active branches", () => {
  const base = rentalTemplateDefinition.variants.find((v) => v.key === "residential_lease").defaultFieldValues;
  const explicit = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], {
    ...base,
    landlord_party_type: "company",
    tenant_party_type: "individual",
    rental_email_notices_enabled: true,
    rental_notice_use_party_emails: false,
    rental_messaging_enabled: true,
    rental_messaging_channel: "أخرى",
    rental_messaging_use_party_phones: false,
  });
  const ef = Object.fromEntries(explicit.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  for (const key of [
    "landlord_company_name", "landlord_company_legal_form", "landlord_commercial_register", "landlord_tax_card",
    "landlord_legal_representative", "landlord_representative_capacity", "landlord_company_address",
  ]) assert.equal(ef[key]?.required, true, key);
  assert.equal(Boolean(ef.landlord_company_email?.required), false, "company email is not duplicated when explicit notice addresses are used");
  assert.equal(ef.rental_notice_landlord_email.required, true);
  assert.equal(ef.rental_notice_tenant_email.required, true);
  assert.equal(ef.rental_messaging_channel_other.required, true);
  assert.equal(ef.rental_messaging_landlord_phone.required, true);
  assert.equal(ef.rental_messaging_tenant_phone.required, true);

  const reuse = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], {
    ...base,
    landlord_party_type: "company",
    tenant_party_type: "individual",
    rental_email_notices_enabled: true,
    rental_notice_use_party_emails: true,
    rental_messaging_enabled: true,
    rental_messaging_channel: "WhatsApp",
    rental_messaging_use_party_phones: true,
  });
  const rf = Object.fromEntries(reuse.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(rf.landlord_company_email.required, true);
  assert.equal(rf.landlord_company_phone.required, true);
  assert.equal(Boolean(rf.rental_notice_landlord_email), false);
  assert.equal(Boolean(rf.rental_messaging_landlord_phone), false);
});

test("rental handover annex remains optional and manual-fill even when handover facts are present", () => {
  const residentialValues = { ...createSampleFieldValues(rentalTemplateDefinition, "residential_lease", []), residential_is_furnished: true };
  const residentialResolved = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], residentialValues);
  assert.equal(residentialResolved.activeClauseKeys.includes("rental_handover_inventory_report_source_document"), false);
  let issues = validateDynamicDefinition(residentialResolved, { templateSlug: "rental", variantKey: "residential_lease", selectedOptionalClauseKeys: [], fieldValues: residentialValues, touchedFieldKeys: [], attachmentRefs: {} });
  assert.equal(issues.some((issue) => issue.fieldKey === "rental_handover_inventory_report"), false);

  const adminValues = { ...createSampleFieldValues(rentalTemplateDefinition, "administrative_lease", []), administrative_delivery_condition: "inventory_report" };
  const adminResolved = resolveWizardDefinition(rentalTemplateDefinition, "administrative_lease", [], adminValues);
  assert.equal(adminResolved.activeClauseKeys.includes("rental_handover_inventory_report_source_document"), false);
  issues = validateDynamicDefinition(adminResolved, { templateSlug: "rental", variantKey: "administrative_lease", selectedOptionalClauseKeys: [], fieldValues: adminValues, touchedFieldKeys: [], attachmentRefs: {} });
  assert.equal(issues.some((issue) => issue.fieldKey === "rental_handover_inventory_report"), false);

  const selected = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", ["rental_handover_inventory_report"], residentialValues);
  assert.ok(selected.activeClauseKeys.includes("rental_handover_inventory_report_source_document"));
});

test("commercial and administrative optional legal branches enforce dependent values", () => {
  const commercial = resolveWizardDefinition(rentalTemplateDefinition, "commercial_lease", [], {
    commercial_early_termination_enabled: true,
    commercial_guarantee_checks_enabled: true,
    commercial_guarantee_value_mode: "each",
    commercial_legal_fees_enabled: true,
  });
  const cf = Object.fromEntries(commercial.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(cf.commercial_early_termination_notice_days.required, true);
  assert.equal(cf.commercial_early_termination_compensation.required, true);
  for (const key of ["commercial_guarantee_checks_count", "commercial_guarantee_bank", "commercial_guarantee_check_numbers", "commercial_guarantee_value_mode", "commercial_guarantee_each_amount", "commercial_legal_fees_bearer"]) assert.equal(cf[key]?.required, true, key);
  assert.equal(Boolean(cf.commercial_guarantee_total_amount), false);
  assert.deepEqual(cf.commercial_legal_fees_bearer.options.map((option) => option.value), ["المؤجر", "المستأجر", "الطرفان"]);

  const administrative = resolveWizardDefinition(rentalTemplateDefinition, "administrative_lease", [], {
    administrative_early_termination_enabled: true,
    administrative_guarantee_checks_enabled: true,
    administrative_guarantee_value_mode: "total",
    administrative_legal_fees_enabled: true,
  });
  const af = Object.fromEntries(administrative.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(af.administrative_early_termination_notice_days.required, true);
  assert.equal(af.administrative_early_termination_compensation.required, true);
  for (const key of ["administrative_guarantee_checks_count", "administrative_guarantee_bank", "administrative_guarantee_check_numbers", "administrative_guarantee_value_mode", "administrative_guarantee_total_amount", "administrative_legal_fees_bearer"]) assert.equal(af[key]?.required, true, key);
  assert.equal(Boolean(af.administrative_guarantee_each_amount), false);
});

test("rental annual increase is an explicit editable branch in all three lease variants", () => {
  for (const key of ["residential_lease", "commercial_lease", "administrative_lease"]) {
    const off = resolveWizardDefinition(rentalTemplateDefinition, key, [], { annual_increase_enabled: false });
    const on = resolveWizardDefinition(rentalTemplateDefinition, key, [], { annual_increase_enabled: true });
    assert.equal(off.steps.flatMap((step) => step.fields).some((field) => field.key === "annual_increase_rate"), false, key);
    const rate = on.steps.flatMap((step) => step.fields).find((field) => field.key === "annual_increase_rate");
    assert.equal(rate.required, true, key);
    assert.equal(rentalTemplateDefinition.variants.find((variant) => variant.key === key).defaultFieldValues.annual_increase_rate, 10);
  }
  const clauses = Object.fromEntries(rentalTemplateDefinition.legalClauses.map((clause) => [clause.key, clause]));
  for (const key of ["rental_residential_annual_increase_clause", "rental_commercial_annual_increase_clause", "rental_administrative_annual_increase_clause"]) {
    assert.match(clauses[key].bodyAr, /\{\{annual_increase_rate\}\}/, key);
  }
});

test("rental jurisdiction is derived from the property location inside the source court article", () => {
  const articleByVariant = {
    residential_lease: "residential_lease_source_article_18",
    commercial_lease: "commercial_lease_source_article_19",
    administrative_lease: "administrative_lease_source_article_19",
  };
  for (const variant of rentalTemplateDefinition.variants) {
    const fields = Object.fromEntries(variant.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
    assert.equal(Boolean(fields.rental_jurisdiction_court), false, variant.key);
    const clause = rentalTemplateDefinition.legalClauses.find((item) => item.key === articleByVariant[variant.key]);
    assert.ok(clause.variables.includes("rental_property_jurisdiction_text"), variant.key);
    const values = { ...createSampleFieldValues(rentalTemplateDefinition, variant.key, []), property_city: "طنطا", property_governorate: "الغربية" };
    const text = renderLegalClauses(rentalTemplateDefinition, variant.key, [], values).find((item) => item.key === articleByVariant[variant.key]).bodyAr;
    assert.match(text, /طنطا/);
    assert.match(text, /الغربية/);
  }
});

test("rental v15 reuses delivery date and meter facts in every governing handover and utilities article", () => {
  const articleMap = {
    residential_lease: ["residential_lease_source_article_10", "residential_lease_source_article_11", "residential_lease_source_article_12", "residential_lease_source_article_14"],
    commercial_lease: ["commercial_lease_source_article_10", "commercial_lease_source_article_12", "commercial_lease_source_article_13", "commercial_lease_source_article_14"],
    administrative_lease: ["administrative_lease_source_article_10", "administrative_lease_source_article_12", "administrative_lease_source_article_13", "administrative_lease_source_article_14"],
  };
  for (const variantKey of Object.keys(articleMap)) {
    const values = {
      ...createSampleFieldValues(rentalTemplateDefinition, variantKey, []),
      property_delivery_date: "2026-09-17",
      electricity_meter_exists: "yes",
      electricity_meter: "ELEC-77881",
      electricity_meter_type: "independent",
      electricity_meter_reading: "4321",
      water_meter_exists: "no",
      gas_meter_exists: "no",
    };
    const rendered = Object.fromEntries(renderLegalClauses(rentalTemplateDefinition, variantKey, [], values).map((item) => [item.key, item.bodyAr]));
    for (const key of articleMap[variantKey]) assert.match(rendered[key], /17\/09\/2026/, `${variantKey}:${key}`);
    const utilitiesKey = articleMap[variantKey][1];
    assert.match(rendered[utilitiesKey], /ELEC-77881/, variantKey);
    assert.match(rendered[utilitiesKey], /4321/, variantKey);
    assert.match(rendered[utilitiesKey], /المياه: لا يوجد/, variantKey);
  }
});

test("administrative guarantee replenishment preserves the source ten-day rule without leaking it into commercial lease", () => {
  const admin = rentalTemplateDefinition.legalClauses.find((item) => item.key === "rental_administrative_guarantee_checks_clause");
  const commercial = rentalTemplateDefinition.legalClauses.find((item) => item.key === "rental_commercial_guarantee_checks_clause");
  assert.match(admin.bodyAr, /عشرة \(10\) أيام/);
  assert.doesNotMatch(commercial.bodyAr, /عشرة \(10\) أيام/);
});

test("rental v15 rejects inconsistent dates and mismatched guarantee-check counts", () => {
  const values = { ...createSampleFieldValues(rentalTemplateDefinition, "commercial_lease", []), start_date: "2026-08-10", end_date: "2026-08-09", commercial_guarantee_checks_enabled: true, commercial_guarantee_checks_count: 2, commercial_guarantee_bank: "بنك الاختبار", commercial_guarantee_check_numbers: "1001", commercial_guarantee_value_mode: "total", commercial_guarantee_total_amount: 2000 };
  const resolved = resolveWizardDefinition(rentalTemplateDefinition, "commercial_lease", [], values);
  const issues = validateDynamicDefinition(resolved, { templateSlug: "rental", variantKey: "commercial_lease", selectedOptionalClauseKeys: [], fieldValues: values, touchedFieldKeys: [], attachmentRefs: {} });
  assert.ok(issues.some((issue) => issue.fieldKey === "end_date"));
  assert.ok(issues.some((issue) => issue.fieldKey === "commercial_guarantee_check_numbers"));
});

test("rental v15 variable coverage audit fails closed for all three lease contracts", () => {
  const minimums = { residential_lease: 110, commercial_lease: 125, administrative_lease: 120 };
  for (const variant of rentalTemplateDefinition.variants) {
    const audit = auditVariantFieldCoverage(rentalTemplateDefinition, variant.key, { derivedVariableDependencies: derivedClauseVariableDependencies, externalBindings: rentalFieldCoverageExternalBindings });
    assert.ok(audit.entries.length >= minimums[variant.key], `${variant.key}:${audit.entries.length}`);
    assert.deepEqual(audit.uncoveredFieldKeys, [], `${variant.key}: ${audit.uncoveredFieldKeys.join(", ")}`);
  }
  const mutated = structuredClone(rentalTemplateDefinition);
  mutated.variants[0].steps[0].fields.push({ key: "rental_future_unbound_legal_term", type: "text", labelAr: "حقل قانوني مستقبلي غير مربوط" });
  const inspection = inspectTemplateDefinition(mutated);
  assert.ok(inspection.errors.some((issue) => issue.code === "UNBOUND_LEGAL_FIELD"));
});

test("rental reviewed source clauses contain no extraction markers or unconditioned optional paragraphs", () => {
  for (const clause of rentalTemplateDefinition.legalClauses) {
    assert.equal((clause.bodyAr ?? "").includes("البيان المثبت بجدول بيانات العقد"), false, clause.key);
    if (/_source_article_/.test(clause.key)) assert.equal((clause.bodyAr ?? "").includes("فقرة اختيارية"), false, clause.key);
  }
});

test("rental handover annex mirrors the blank source tables and remains manual-fill", () => {
  const annex = rentalTemplateDefinition.optionalClauses.find((item) => item.key === "rental_handover_inventory_report");
  assert.ok(annex);
  assert.equal(annex.manualFillAnnex, true);
  assert.equal(annex.outputMode, "separate_annex");
  assert.equal(annex.requiredWhen, undefined);
  const byStep = Object.fromEntries(annex.insertedSteps.map((step) => [step.key, step]));
  assert.equal(byStep.rental_handover_condition.fields[0].blankRows, 15);
  assert.equal(byStep.rental_handover_access.fields[0].blankRows, 6);
  assert.equal(byStep.rental_handover_inventory.fields[0].blankRows, 10);
  const allAnnexKeys = annex.insertedSteps.flatMap((step) => step.fields.map((field) => field.key));
  assert.equal(allAnnexKeys.some((key) => /meter_reading/i.test(key)), false);
});

test("administrative e-sign and messaging clauses are truly conditional", () => {
  const admin = rentalTemplateDefinition.variants.find((v) => v.key === "administrative_lease");
  const esign = rentalTemplateDefinition.legalClauses.find((c) => c.key === "rental_administrative_esign_clause");
  assert.equal(esign.visibleWhen.fieldKey, "administrative_esign_enabled");
  assert.equal(admin.requiredClauseKeys.includes(esign.key), true);
  assert.equal(evaluateCondition(esign.visibleWhen, { administrative_esign_enabled: false }), false);
  assert.equal(evaluateCondition(esign.visibleWhen, { administrative_esign_enabled: true }), true);
  const messaging = rentalTemplateDefinition.legalClauses.find((c) => c.key === "rental_administrative_messaging_clause");
  assert.equal(evaluateCondition(messaging.visibleWhen, { rental_messaging_enabled: false }), false);
  assert.equal(evaluateCondition(messaging.visibleWhen, { rental_messaging_enabled: true }), true);
});

test("rental residential repeater makes other payment details required in the same row", () => {
  const values = createSampleFieldValues(rentalTemplateDefinition, "residential_lease", []);
  values.rental_payment_methods = [{ method: "other", details: "" }];
  const resolved = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], values);
  const issues = validateDynamicDefinition(resolved, {
    variantKey: "residential_lease",
    selectedOptionalClauseKeys: [],
    fieldValues: values,
    attachmentRefs: {},
  });
  assert.ok(issues.some((issue) => issue.fieldKey === "rental_payment_methods.0.details"));

  values.rental_payment_methods = [{ method: "cash_receipt", details: "" }];
  const cashResolved = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], values);
  const cashIssues = validateDynamicDefinition(cashResolved, {
    variantKey: "residential_lease",
    selectedOptionalClauseKeys: [],
    fieldValues: values,
    attachmentRefs: {},
  });
  assert.equal(cashIssues.some((issue) => issue.fieldKey === "rental_payment_methods.0.details"), false);
});

test("sale v14 exposes three source-specific variants with fail-closed property logic", () => {
  assert.equal(apartmentSaleTemplateDefinition.version, 14);
  assert.deepEqual(apartmentSaleTemplateDefinition.variants.map((item) => item.key), ["preliminary_sale", "registrable_sale", "inherited_sale"]);
  const forbidden = new Set(["sale_jurisdiction_court", "sale_total_price_words", "sale_remaining_amount", "preliminary_include_benefits_clause"]);
  for (const variant of apartmentSaleTemplateDefinition.variants) {
    const fields = variant.steps.flatMap((step) => step.fields);
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    for (const key of forbidden) assert.equal(Boolean(byKey[key]), false, `${variant.key}:${key}`);
    assert.equal(variant.requiredClauseKeys.includes("sale_jurisdiction_court_clause"), false, `${variant.key}:no duplicate court clause`);
    assert.equal(byKey.sale_contract_city.required, true);
    assert.equal(byKey.sale_unit_governorate.required, true);
    assert.equal(byKey.sale_unit_city.required, true);
  }
  const inherited = apartmentSaleTemplateDefinition.variants.find((item) => item.key === "inherited_sale");
  const inheritedFields = Object.fromEntries(inherited.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(Boolean(inheritedFields.seller_party_type), false);
  assert.equal(Boolean(inheritedFields.buyer_party_type), false);
  assert.equal(inheritedFields.inheritance_no_minors_ack.required, true);
});

test("sale v14 editable timing and payment terms are explicit and variant-specific", () => {
  const byVariant = Object.fromEntries(apartmentSaleTemplateDefinition.variants.map((variant) => [variant.key, Object.fromEntries(variant.steps.flatMap((step) => step.fields).map((field) => [field.key, field]))]));
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "preliminary_sale").defaultFieldValues.sale_installment_grace_days, 15);
  assert.equal(Boolean(byVariant.preliminary_sale.sale_installment_grace_days.requiredWhen), true);
  assert.equal(Boolean(byVariant.registrable_sale.sale_installment_grace_days.requiredWhen), true);
  assert.equal(Boolean(byVariant.inherited_sale.sale_installment_grace_days.requiredWhen), true);
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "registrable_sale").defaultFieldValues.sale_delivery_delay_threshold_days, 30);
  assert.equal(byVariant.registrable_sale.sale_delivery_delay_threshold_days.required, true);
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "inherited_sale").defaultFieldValues.sale_contract_copies_count, 2);
  assert.equal(Boolean(byVariant.inherited_sale.sale_contract_copies_count), false);
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "preliminary_sale").defaultFieldValues.seller_party_type, "individual");
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "preliminary_sale").defaultFieldValues.buyer_party_type, "individual");
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "registrable_sale").defaultFieldValues.seller_party_type, "individual");
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "registrable_sale").defaultFieldValues.buyer_party_type, "individual");
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "registrable_sale").defaultFieldValues.sale_contract_copies_count, 2);
  assert.equal(Boolean(byVariant.registrable_sale.sale_contract_copies_count), false);
  assert.equal(Boolean(byVariant.preliminary_sale.sale_contract_copies_count), false);
  for (const variantKey of ["preliminary_sale", "registrable_sale", "inherited_sale"]) {
    assert.equal(byVariant[variantKey].sale_general_breach_cure_days.required, true);
    assert.equal(byVariant[variantKey].sale_force_majeure_notice_days.required, true);
    assert.equal(byVariant[variantKey].sale_notice_change_days.required, true);
  }
  assert.equal(apartmentSaleTemplateDefinition.variants.find((v) => v.key === "inherited_sale").defaultFieldValues.sale_amicable_settlement_days, 15);
});

test("sale installment schedule remains an explicitly selected blank manual-print annex", () => {
  const annex = apartmentSaleTemplateDefinition.optionalClauses.find((item) => item.key === "sale_installment_schedule");
  assert.ok(annex);
  assert.equal(annex.manualFillAnnex, true);
  assert.equal(annex.outputMode, "separate_annex");
  assert.equal(annex.requiredWhen, undefined);
  assert.equal(Boolean(annex.defaultFieldValues), false);
  const rows = annex.insertedSteps.find((step) => step.key === "sale_installment_schedule_rows").fields[0];
  assert.equal(rows.blankRows, 12);
  assert.equal(rows.columns.length, 8);
  const withoutSelection = resolveWizardDefinition(apartmentSaleTemplateDefinition, "preliminary_sale", [], { sale_payment_plan: "installments" });
  assert.equal(withoutSelection.steps.some((step) => step.key.startsWith("sale_installment_schedule_")), false);
  assert.equal(withoutSelection.activeClauseKeys.includes("sale_installment_schedule_manual_clause"), false);
  const selected = resolveWizardDefinition(apartmentSaleTemplateDefinition, "preliminary_sale", ["sale_installment_schedule"], { sale_payment_plan: "installments" });
  assert.equal(selected.steps.some((step) => step.key.startsWith("sale_installment_schedule_")), false);
  assert.ok(selected.activeClauseKeys.includes("sale_installment_schedule_manual_clause"));
});

test("sale conditional company, notices, inheritance and meter rules resolve in the engine", () => {
  const company = resolveWizardDefinition(apartmentSaleTemplateDefinition, "registrable_sale", [], {
    seller_party_type: "company",
    buyer_party_type: "individual",
    sale_email_notices_enabled: true,
    sale_notice_use_party_emails: true,
    sale_electricity_meter_exists: "yes",
  });
  const cf = Object.fromEntries(company.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(cf.seller_company_name.required, true);
  assert.equal(cf.seller_company_email.required, true);
  assert.equal(cf.seller_phone.required, true);
  assert.equal(Boolean(cf.seller_email?.required), false);
  assert.equal(cf.sale_electricity_meter.required, true);
  assert.equal(cf.sale_electricity_meter_type.required, true);
  assert.equal(Boolean(cf.sale_electricity_meter_reading.required), false);

  const noMeter = resolveWizardDefinition(apartmentSaleTemplateDefinition, "registrable_sale", [], {
    seller_party_type: "individual", buyer_party_type: "individual", sale_electricity_meter_exists: "no",
  });
  const nm = Object.fromEntries(noMeter.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(Boolean(nm.sale_electricity_meter?.required), false);
  assert.equal(Boolean(nm.sale_electricity_meter_type?.required), false);

  const inherited = resolveWizardDefinition(apartmentSaleTemplateDefinition, "inherited_sale", [], {
    inheritance_disposition_basis: "power_of_attorney",
    sale_electricity_meter_exists: "yes",
  });
  const inf = Object.fromEntries(inherited.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  for (const key of ["inheritance_poa_number", "inheritance_poa_year", "inheritance_poa_office", "inheritance_poa_date"]) assert.equal(inf[key].required, true, key);
  assert.equal(inf.sale_electricity_meter_type.required, true);
});

test("all nine contracts use an explicit national-ID/passport selector and have no generic optional-terms wizard step", () => {
  const definitions = [freelancerTemplateDefinition, rentalTemplateDefinition, apartmentSaleTemplateDefinition];
  let variants = 0;
  for (const definition of definitions) {
    for (const variant of definition.variants) {
      variants += 1;
      assert.equal(variant.steps.some((step) => step.titleAr.trim() === "بنود اختيارية"), false, `${definition.slug}:${variant.key}`);
      const fields = variant.steps.flatMap((step) => step.fields);
      const identityFields = fields.filter((field) => field.key.endsWith("_identity_document_type"));
      assert.ok(identityFields.length >= 2, `${definition.slug}:${variant.key}:identity selectors`);
      for (const field of identityFields) {
        assert.ok(field.required === true || field.requiredWhen, `${variant.key}:${field.key}:must be required directly or conditionally`);
        assert.deepEqual(field.options.map((option) => option.value), ["national_id", "passport"]);
      }
    }
  }
  assert.equal(variants, 9);
});

test("explicit identity-document choice controls validation instead of nationality", () => {
  const base = { ...rentalTemplateDefinition.variants.find((v) => v.key === "residential_lease").defaultFieldValues, landlord_party_type: "individual" };
  const resolved = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], base);
  const issues = (fieldValues) => validateDynamicDefinition(resolved, {
    templateSlug: "rental",
    variantKey: "residential_lease",
    selectedOptionalClauseKeys: [],
    fieldValues: { ...base, ...fieldValues },
    touchedFieldKeys: [],
    attachmentRefs: {},
  });

  assert.ok(issues({ landlord_nationality: "مصري", landlord_identity_document_type: "national_id", landlord_national_id: "1234567890" })
    .some((issue) => issue.fieldKey === "landlord_national_id" && issue.labelAr.includes("14 رقمًا")));
  assert.equal(issues({ landlord_nationality: "مصري", landlord_identity_document_type: "national_id", landlord_national_id: "29501011234567" })
    .some((issue) => issue.fieldKey === "landlord_national_id"), false);
  assert.equal(issues({ landlord_nationality: "مصري", landlord_identity_document_type: "passport", landlord_national_id: "EGP987654" })
    .some((issue) => issue.fieldKey === "landlord_national_id"), false);
  assert.ok(issues({ landlord_nationality: "سعودي", landlord_identity_document_type: "passport", landlord_national_id: "AB1" })
    .some((issue) => issue.fieldKey === "landlord_national_id" && issue.labelAr.includes("جواز السفر")));
});

test("sample data for every published contract renders without missing legal values or unresolved tokens", () => {
  const definitions = [freelancerTemplateDefinition, rentalTemplateDefinition, apartmentSaleTemplateDefinition];
  let variants = 0;
  for (const definition of definitions) {
    for (const variant of definition.variants) {
      variants += 1;
      const values = createSampleFieldValues(definition, variant.key, []);
      const rendered = renderLegalClauses(definition, variant.key, [], values);
      const text = rendered.map((clause) => `${clause.titleAr}\n${clause.bodyAr}`).join("\n");
      assert.equal(text.includes("{{"), false, `${definition.slug}:${variant.key}: unresolved token`);
      assert.equal(text.includes("بيان مطلوب"), false, `${definition.slug}:${variant.key}: missing legal value`);
      assert.equal(/\.{3,}|…|[ـ_]{4,}/u.test(text), false, `${definition.slug}:${variant.key}: blank placeholder leaked into legal text`);
    }
  }
  assert.equal(variants, 9);
});

test("core wizard values are printed inside their governing legal articles", () => {
  const websiteValues = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "website_development", []),
    website_project_name: "مشروع-ربط-الموقع",
    website_project_manager: "مدير-المشروع-اختبار",
    website_approval_person: "مسؤول-الاعتماد-اختبار",
    website_billing_contact: "مسؤول-المدفوعات-اختبار",
    website_contact_email: "binding@example.test",
    website_total_price_words: "قيمة الاختبار كتابة",
    website_warranty_duration_unit: "شهرًا",
    website_competent_court: "القاهرة",
  };
  const websiteText = renderLegalClauses(freelancerTemplateDefinition, "website_development", [], websiteValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["مشروع-ربط-الموقع", "مدير-المشروع-اختبار", "مسؤول-الاعتماد-اختبار", "مسؤول-المدفوعات-اختبار", "binding@example.test", numberToEgyptianPoundsWords(websiteValues.website_total_price), "القاهرة"]) assert.match(websiteText, new RegExp(sentinel));
  assert.doesNotMatch(websiteText, /قيمة الاختبار كتابة/);

  const socialValues = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "social_media_management", []),
    social_target_market: "السوق-المستهدف-اختبار",
    social_target_audience: "الجمهور-المستهدف-اختبار",
    social_project_manager_custom: true,
    social_project_manager: "مدير-السوشيال-اختبار",
  };
  const socialText = renderLegalClauses(freelancerTemplateDefinition, "social_media_management", [], socialValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["السوق-المستهدف-اختبار", "الجمهور-المستهدف-اختبار", "مدير-السوشيال-اختبار"]) assert.match(socialText, new RegExp(sentinel));

  const rentalValues = {
    ...createSampleFieldValues(rentalTemplateDefinition, "residential_lease", []),
    contract_copies_count: 4,
    residential_compound_name: "كمبوند-اختبار-العقد",
    building_number: "مبنى-77",
    electricity_meter_exists: "yes",
    electricity_meter: "عداد-12345",
    electricity_meter_type: "independent",
  };
  const rentalText = renderLegalClauses(rentalTemplateDefinition, "residential_lease", [], rentalValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["كمبوند-اختبار-العقد", "مبنى-77", "عداد-12345", "نسخ أصلية متطابقة"]) assert.match(rentalText, new RegExp(sentinel));

  const saleValues = {
    ...createSampleFieldValues(apartmentSaleTemplateDefinition, "registrable_sale", []),
    sale_compound_name: "كمبوند-بيع-اختبار",
    sale_building_number: "عقار-991",
    sale_electricity_meter_exists: "yes",
    sale_electricity_meter: "كهرباء-987",
    sale_electricity_meter_type: "independent",
    sale_electricity_meter_reading: "قراءة-456",
    sale_total_price: 50000,
    registered_deed_number: "سند-123",
    registered_deed_year: "2026",
    registry_office: "مأمورية-اختبار",
  };
  const saleText = renderLegalClauses(apartmentSaleTemplateDefinition, "registrable_sale", [], saleValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["كمبوند-بيع-اختبار", "عقار-991", "كهرباء-987", "قراءة-456", "خمسون ألف", "سند-123", "مأمورية-اختبار"]) assert.match(saleText, new RegExp(sentinel));
});

test("execution, warranty, financial, delivery and court values are rendered inside governing articles across all nine contracts", () => {
  const visualValues = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "visual_identity_design", []),
    visual_execution_duration_value: 47,
    visual_execution_duration_unit: "يوم عمل",
    visual_contract_value: 47321,
    visual_contract_value_words: "سبعة وأربعون ألفًا وثلاثمائة وواحد وعشرون",
    visual_competent_court: "القاهرة",
  };
  const visualText = renderLegalClauses(freelancerTemplateDefinition, "visual_identity_design", [], visualValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["47 يوم عمل", numberToEgyptianPoundsWords(visualValues.visual_contract_value), "القاهرة"]) assert.match(visualText, new RegExp(sentinel));
  assert.doesNotMatch(visualText, /سبعة وأربعون ألفًا وثلاثمائة وواحد وعشرون/);

  const websiteValues = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "website_development", []),
    website_execution_duration_value: 37,
    website_execution_duration_unit: "يومًا",
    website_duration_basis: "بأيام العمل، ما لم يتفق الطرفان كتابةً على احتسابها بالأيام التقويمية",
    website_total_price: 37421,
    website_total_price_words: "سبعة وثلاثون ألفًا وأربعمائة وواحد وعشرون",
    website_warranty_duration_value: 19,
    website_warranty_duration_unit: "شهرًا",
    website_confidentiality_years: 11,
    website_competent_court: "الجيزة",
  };
  const websiteText = renderLegalClauses(freelancerTemplateDefinition, "website_development", [], websiteValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["٣٧ يوم", numberToEgyptianPoundsWords(websiteValues.website_total_price), "١٩ شهر", "١١ سنة", "الجيزة"]) assert.match(websiteText, new RegExp(sentinel));
  assert.doesNotMatch(websiteText, /سبعة وثلاثون ألفًا وأربعمائة وواحد وعشرون/);

  const socialValues = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "social_media_management", []),
    social_contract_duration_value: 17,
    social_contract_duration_unit: "months",
    social_fee: 17891,
    social_delay_penalty_mode: "amount",
    social_delay_penalty_amount: 731,
    social_delay_penalty_cap_percentage: 17,
    social_competent_court: "الإسكندرية",
  };
  const socialText = renderLegalClauses(freelancerTemplateDefinition, "social_media_management", [], socialValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["١٧ شهرًا", "سبعة عشر ألف", "٧٣١", "١٧", "الإسكندرية"]) assert.match(socialText, new RegExp(sentinel));

  for (const variantKey of ["residential_lease", "commercial_lease", "administrative_lease"]) {
    const values = {
      ...createSampleFieldValues(rentalTemplateDefinition, variantKey, []),
      lease_duration_value: 27,
      lease_duration_unit: "months",
      start_date: "2027-02-03",
      end_date: "2029-05-03",
      property_delivery_date: "2027-02-11",
      property_city: "المنصورة",
      property_governorate: "الدقهلية",
      deposit_amount: 27111,
      rent_amount: 27891,
      rent_due_day: 23,
      holdover_daily_compensation: 927,
      late_payment_daily_compensation: 619,
    };
    const text = renderLegalClauses(rentalTemplateDefinition, variantKey, [], values).map((c) => c.bodyAr).join("\n");
    for (const sentinel of ["٢٧ شهرًا", "03/02/2027", "03/05/2029", "11/02/2027", "سبعة وعشرون ألف", "المنصورة", "الدقهلية"]) assert.match(text, new RegExp(sentinel), `${variantKey}:${sentinel}`);
  }

  for (const variantKey of ["preliminary_sale", "registrable_sale", "inherited_sale"]) {
    const values = {
      ...createSampleFieldValues(apartmentSaleTemplateDefinition, variantKey, []),
      sale_total_price: 987654,
      sale_payment_plan: "installments",
      sale_down_payment: 234567,
      sale_installment_schedule_rows: [
        { installment_no: "1", amount: 300000, due_date: "2026-10-01", payment_method: "تحويل بنكي" },
        { installment_no: "2", amount: 453087, due_date: "2027-01-01", payment_method: "تحويل بنكي" },
      ],
      sale_delivery_delay_daily_compensation: 813,
      sale_delivery_delay_threshold_days: 29,
      sale_unit_city: "طنطا",
      sale_unit_governorate: "الغربية",
    };
    if (variantKey === "preliminary_sale") values.preliminary_hidden_defect_warranty_years = 7;
    const text = renderLegalClauses(apartmentSaleTemplateDefinition, variantKey, [], values).map((c) => c.bodyAr).join("\n");
    for (const sentinel of ["تسعمائة", "٢٣٤٬٥٦٧", "٧٥٣٬٠٨٧", "٨١٣", "طنطا", "الغربية"]) assert.match(text, new RegExp(sentinel), `${variantKey}:${sentinel}`);
    if (variantKey === "preliminary_sale") assert.match(text, /٧ سنوات/);
  }
});

test("sale v14 variable coverage audit fails closed for all three sale contracts", () => {
  const expectedMinimums = { preliminary_sale: 120, registrable_sale: 115, inherited_sale: 108 };
  for (const variant of apartmentSaleTemplateDefinition.variants) {
    const audit = auditVariantFieldCoverage(apartmentSaleTemplateDefinition, variant.key, {
      derivedVariableDependencies: derivedClauseVariableDependencies,
      externalBindings: apartmentSaleFieldCoverageExternalBindings,
    });
    assert.ok(audit.entries.length >= expectedMinimums[variant.key], `${variant.key}:unexpected coverage count ${audit.entries.length}`);
    assert.deepEqual(audit.uncoveredFieldKeys, [], `${variant.key}: حقول بدون أثر: ${audit.uncoveredFieldKeys.join(", ")}`);
  }

  const mutated = structuredClone(apartmentSaleTemplateDefinition);
  mutated.variants[0].steps[0].fields.push({ key: "sale_future_unbound_field", type: "text", labelAr: "حقل بيع غير مربوط" });
  const audit = auditVariantFieldCoverage(mutated, "preliminary_sale", {
    derivedVariableDependencies: derivedClauseVariableDependencies,
    externalBindings: apartmentSaleFieldCoverageExternalBindings,
  });
  assert.ok(audit.uncoveredFieldKeys.includes("sale_future_unbound_field"));
  const inspected = inspectTemplateDefinition(mutated);
  assert.ok(inspected.errors.some((issue) => issue.code === "UNBOUND_LEGAL_FIELD" && issue.messageAr.includes("sale_future_unbound_field")));
});

test("sale v14 installment delivery controls possession, risk, utilities and final text consistently", () => {
  for (const variantKey of ["preliminary_sale", "registrable_sale", "inherited_sale"]) {
    const values = {
      ...createSampleFieldValues(apartmentSaleTemplateDefinition, variantKey, []),
      sale_payment_plan: "installments",
      sale_total_price: 1000000,
      sale_down_payment: 250000,
      sale_installment_schedule_rows: [
        { installment_no: "1", amount: 250000, due_date: "2026-10-01", payment_method: "تحويل بنكي" },
        { installment_no: "2", amount: 500000, due_date: "2027-02-01", payment_method: "تحويل بنكي" },
      ],
    };
    const clauses = renderLegalClauses(apartmentSaleTemplateDefinition, variantKey, [], values);
    const byKey = Object.fromEntries(clauses.map((clause) => [clause.key, clause.bodyAr]));
    const delivery = byKey[`${variantKey}_source_article_07`];
    const possession = byKey[`${variantKey}_source_article_08`];
    assert.match(delivery, /بعد سداد كامل الثمن.*آخر قسط/s, `${variantKey}:installment delivery`);
    assert.match(possession, /من تاريخ التسليم الفعلي/, `${variantKey}:risk follows delivery`);
    assert.doesNotMatch(possession, /تنتقل.*من (?:لحظة|تاريخ) التوقيع/s, `${variantKey}:no premature risk transfer`);
  }
});

test("sale v14 enforces installment totals and the inheritance full-capacity gate", () => {
  const bad = {
    ...createSampleFieldValues(apartmentSaleTemplateDefinition, "registrable_sale", []),
    sale_total_price: 100000,
    sale_payment_plan: "installments",
    sale_down_payment: 20000,
    sale_installment_schedule_rows: [
      { installment_no: "1", amount: 30000, due_date: "2026-10-01", payment_method: "تحويل" },
      { installment_no: "2", amount: 40000, due_date: "2026-11-01", payment_method: "تحويل" },
    ],
  };
  const resolved = resolveWizardDefinition(apartmentSaleTemplateDefinition, "registrable_sale", [], bad);
  const issues = validateDynamicDefinition(resolved, { variantKey: "registrable_sale", selectedOptionalClauseKeys: [], fieldValues: bad, attachmentRefs: {} });
  assert.ok(issues.some((issue) => issue.fieldKey === "sale_installment_schedule_rows"));

  const inherited = { ...createSampleFieldValues(apartmentSaleTemplateDefinition, "inherited_sale", []), inheritance_no_minors_ack: false };
  const inheritedResolved = resolveWizardDefinition(apartmentSaleTemplateDefinition, "inherited_sale", [], inherited);
  const inheritedIssues = validateDynamicDefinition(inheritedResolved, { variantKey: "inherited_sale", selectedOptionalClauseKeys: [], fieldValues: inherited, attachmentRefs: {} });
  assert.ok(inheritedIssues.some((issue) => issue.fieldKey === "inheritance_no_minors_ack"));
});

test("website v12 binds party identity and every editable legal term into the governing clauses", () => {
  const values = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "website_development", []),
    website_client_party_type: "individual",
    website_client_name: "أحمد اختبار العميل",
    website_client_nationality: "مصري",
    website_client_identity_document_type: "passport",
    website_client_national_id: "P-CLIENT-2026",
    website_client_address: "عنوان العميل للاختبار",
    website_client_phone: "01000000111",
    website_provider_party_type: "individual",
    website_provider_name: "محمود مقدم الخدمة",
    website_provider_nationality: "مصري",
    website_provider_identity_document_type: "national_id",
    website_provider_national_id: "29901011234567",
    website_provider_address: "عنوان مقدم الخدمة للاختبار",
    website_provider_phone: "01000000222",
    website_project_name: "مشروع ربط ويب",
    website_project_type: "other",
    website_project_type_other: "بوابة خدمات متخصصة",
    website_execution_duration_value: 14,
    website_execution_duration_unit: "يومًا",
    website_execution_start_rule: "specific_date",
    website_execution_start_date: "2026-09-01",
    website_duration_basis: "بأيام العمل، ما لم يتفق الطرفان كتابةً على احتسابها بالأيام التقويمية",
    website_response_period_days: 4,
    website_review_period_days: 6,
    website_total_price: 50000,
    website_total_price_words: "خمسون ألفًا",
    website_payment_mode: "installments",
    website_payment_schedule: [
      { payment: "الدفعة الأولى", amount: 20000, due: "عند توقيع العقد" },
      { payment: "الدفعة الثانية", amount: 30000, due: "عند اعتماد التسليم النهائي" },
    ],
    website_payment_method: "تحويل بنكي",
    website_payment_grace_days: 8,
    website_restart_threshold_days: 35,
    website_restart_fee_enabled: true,
    website_restart_fee_amount: 1500,
    website_correction_attempts: 4,
    website_warranty_duration_value: 3,
    website_warranty_duration_unit: "شهرًا",
    website_confidentiality_years: 5,
    website_portfolio_permission: "no",
    website_external_services_enabled: true,
    website_external_services: [
      { service: "استضافة", provider: "مزود استضافة اختباري", duration: "سنة", amount: 1200, payer: "client" },
    ],
    website_email_notices_enabled: true,
    website_notice_use_party_emails: false,
    website_notice_client_email: "client@example.com",
    website_notice_provider_email: "provider@example.com",
    website_messaging_apps_enabled: true,
    website_messaging_apps: "WhatsApp",
    website_messaging_use_party_phones: true,
    website_project_platform_enabled: true,
    website_project_platform_name: "Trello",
    website_project_platform_link: "https://example.com/project",
    website_contact_change_notice_days: 12,
    website_breach_cure_days: 17,
    website_nonpayment_termination_days: 11,
    website_client_stoppage_days: 9,
    website_force_majeure_notice_days: 8,
    website_force_majeure_termination_days: 61,
    website_hardship_duration_days: 31,
    website_hardship_negotiation_days: 16,
    website_contract_copies: 3,
    website_non_solicitation_months: 8,
    website_legal_fees_enabled: true,
    website_legal_fees_payer: "الطرف الأول (العميل)",
    website_competent_court: "أخرى",
    website_competent_court_other: "اقتصادية القاهرة",
  };

  const clauses = renderLegalClauses(freelancerTemplateDefinition, "website_development", [], values);
  const byTitle = (needle) => clauses.find((clause) => clause.titleAr.includes(needle))?.bodyAr ?? "";
  const all = clauses.map((clause) => clause.bodyAr).join("\n");

  const article1 = byTitle("المادة الأولى");
  assert.match(article1, /أحمد اختبار العميل/);
  assert.match(article1, /رقم جواز السفر رقم P-CLIENT-2026/);
  assert.match(article1, /مشروع ربط ويب/);
  assert.match(article1, /بوابة خدمات متخصصة/);

  const article8 = byTitle("المادة الثامنة:");
  assert.match(article8, /١٤ يومًا/);
  assert.match(article8, /01\/09\/2026/);
  assert.match(article8, /٣ أشهر/);

  const article10 = byTitle("المادة العاشرة:");
  for (const sentinel of [numberToEgyptianPoundsWords(values.website_total_price), "٢٠٬٠٠٠", "٣٠٬٠٠٠", "تحويل بنكي", "٨ أيام عمل", "٣٥ يومًا", "١٬٥٠٠"]) {
    assert.match(article10, new RegExp(sentinel));
  }

  const article12 = byTitle("المادة الثانية عشرة");
  assert.match(article12, /٦ أيام عمل/);
  assert.match(article12, /٤ محاولات/);
  assert.match(article12, /٣ أشهر/);

  const article13 = byTitle("المادة الثالثة عشرة");
  const article16 = byTitle("المادة السادسة عشرة");
  assert.match(article13, /لا يجوز للطرف الثاني.*Portfolio/s);
  assert.match(article16, /لا يجوز للطرف الثاني.*Portfolio/s);
  assert.match(article16, /٥ سنوات/);

  const article15 = byTitle("المادة الخامسة عشرة");
  for (const sentinel of ["استضافة", "مزود استضافة اختباري", "١٬٢٠٠"]) assert.match(article15, new RegExp(sentinel));
  assert.match(article15, /الطرف الأول \(العميل\)/);

  const article18 = byTitle("المادة الثامنة عشرة");
  for (const sentinel of ["١٧ يومًا", "١١ يومًا", "٩ أيام"]) assert.match(article18, new RegExp(sentinel));
  assert.doesNotMatch(article18, /خمسة عشر \(15\)|\(10\)|\(7\)/);

  const article19 = byTitle("المادة التاسعة عشرة");
  for (const sentinel of ["٨ أيام", "٦١ يومًا", "٣١ يومًا", "١٦ يومًا"]) assert.match(article19, new RegExp(sentinel));

  const article20 = byTitle("المادة العشرون");
  for (const sentinel of ["client@example.com", "provider@example.com", "01000000111", "01000000222", "WhatsApp", "Trello", "example.com/project", "١٢ يومًا"]) assert.match(article20, new RegExp(sentinel));

  const article21 = byTitle("المادة الحادية والعشرون");
  assert.match(article21, /اقتصادية القاهرة/);

  const article22 = byTitle("المادة الثانية والعشرون");
  assert.match(article22, /٣ نسخ/);
  assert.match(article22, /٨ أشهر/);
  assert.match(article22, /يتحمل الطرف الأول \(العميل\) رسوم الدمغة/);

  for (const forbidden of ["{{", "بيان مطلوب", "مدة السرية بعد انتهاء العقد يفضل", "محرر تعاقدي"]) assert.doesNotMatch(all, new RegExp(forbidden.replace(/[{}]/g, "\\$&")));
});

test("website v12 enforces execution-start and installment dependencies", () => {
  const base = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "website_development", []),
    website_execution_start_rule: "specific_date",
    website_execution_start_date: "",
    website_payment_mode: "installments",
    website_total_price: 10000,
    website_payment_schedule: [
      { payment: "أولى", amount: 3000, due: "عند التوقيع" },
      { payment: "ثانية", amount: 6000, due: "عند التسليم" },
    ],
  };
  const resolved = resolveWizardDefinition(freelancerTemplateDefinition, "website_development", [], base);
  const issues = validateDynamicDefinition(resolved, { variantKey: "website_development", selectedOptionalClauseKeys: [], fieldValues: base, attachmentRefs: {} });
  assert.ok(issues.some((issue) => issue.fieldKey === "website_execution_start_date"));
  assert.ok(issues.some((issue) => issue.fieldKey === "website_payment_schedule"));
});


test("website v12 variable coverage audit fails closed for every wizard input", () => {
  const audit = auditVariantFieldCoverage(freelancerTemplateDefinition, "website_development", {
    derivedVariableDependencies: derivedClauseVariableDependencies,
    externalBindings: websiteFieldCoverageExternalBindings,
  });

  assert.equal(audit.entries.length, 105, "عدد حقول عقد الموقع تغير؛ راجع خريطة الـcoverage قبل النشر");
  assert.deepEqual(audit.uncoveredFieldKeys, [], `حقول بدون أثر في العقد: ${audit.uncoveredFieldKeys.join(", ")}`);

  const byKey = Object.fromEntries(audit.entries.map((entry) => [entry.fieldKey, entry]));
  assert.ok(byKey.website_client_name.clauseTitlesAr.some((title) => title.includes("المادة الأولى")));
  assert.ok(byKey.website_execution_duration_value.clauseTitlesAr.some((title) => title.includes("المادة الثامنة")));
  assert.ok(byKey.website_execution_duration_value.clauseTitlesAr.some((title) => title.includes("المادة التاسعة")));
  assert.ok(byKey.website_warranty_duration_value.clauseTitlesAr.some((title) => title.includes("المادة الثامنة")));
  assert.ok(byKey.website_warranty_duration_value.clauseTitlesAr.some((title) => title.includes("المادة الثانية عشرة")));
  assert.ok(byKey.website_warranty_duration_value.clauseTitlesAr.some((title) => title.includes("المادة الرابعة عشرة")));
  assert.ok(byKey.website_portfolio_permission.clauseTitlesAr.some((title) => title.includes("المادة الثالثة عشرة")));
  assert.ok(byKey.website_portfolio_permission.clauseTitlesAr.some((title) => title.includes("المادة السادسة عشرة")));
  assert.ok(byKey.website_legal_fees_payer.clauseTitlesAr.some((title) => title.includes("المادة الثانية والعشرون")));
  assert.equal(byKey.website_witness_1_name.status, "external_bound");

  const mutated = structuredClone(freelancerTemplateDefinition);
  const website = mutated.variants.find((variant) => variant.key === "website_development");
  website.steps[0].fields.push({ key: "website_future_unbound_field", type: "text", labelAr: "حقل جديد غير مربوط" });
  const futureAudit = auditVariantFieldCoverage(mutated, "website_development", {
    derivedVariableDependencies: derivedClauseVariableDependencies,
    externalBindings: websiteFieldCoverageExternalBindings,
  });
  assert.ok(futureAudit.uncoveredFieldKeys.includes("website_future_unbound_field"), "أي حقل جديد غير مربوط يجب أن يفشل الـcoverage audit");
  const inspected = inspectTemplateDefinition(mutated);
  assert.ok(inspected.errors.some((issue) => issue.code === "UNBOUND_LEGAL_FIELD" && issue.messageAr.includes("website_future_unbound_field")));
});


test("visual identity v13 binds every negotiated term into its governing clauses", () => {
  const values = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "visual_identity_design", []),
    contract_date: "2026-08-19",
    visual_client_party_type: "individual",
    visual_client_name: "عميل-الهوية-اختبار",
    visual_client_nationality: "مصري",
    visual_client_identity_document_type: "passport",
    visual_client_national_id: "PASS-VIS-999",
    visual_client_address: "عنوان-العميل-اختبار",
    visual_client_phone: "01011111111",
    visual_provider_party_type: "individual",
    visual_provider_name: "مصمم-الهوية-اختبار",
    visual_provider_nationality: "مصري",
    visual_provider_identity_document_type: "national_id",
    visual_provider_national_id: "29801010101010",
    visual_provider_address: "عنوان-المصمم-اختبار",
    visual_provider_phone: "01022222222",
    visual_project_name: "علامة-بصرية-اختبار",
    visual_project_brief: "وصف-بصري-اختبار",
    visual_project_purpose: "غرض-بصري-اختبار",
    visual_main_scope_services: [
      { service: "logo", details: "" },
      { service: "brand_guidelines", details: "" },
      { service: "other", details: "تغليف-مخصص-اختبار" },
    ],
    visual_output_formats: "PDF, SVG, PNG",
    visual_source_files_included: "yes",
    visual_source_file_types: "AI, FIG",
    visual_source_files_price_mode: "additional",
    visual_source_files_additional_fee: 1234,
    visual_execution_duration_value: 21,
    visual_execution_duration_unit: "يوم عمل",
    visual_execution_start_rule: "specific_date",
    visual_execution_start_date: "2026-09-01",
    visual_contract_value: 50000,
    visual_contract_value_words: "خمسون ألفًا",
    visual_payment_mode: "installments",
    visual_main_payment_schedule: [
      { payment: "الدفعة الأولى", amount: 20000, due: "عند التوقيع" },
      { payment: "الدفعة الثانية", amount: 30000, due: "عند التسليم" },
    ],
    visual_payment_method: "تحويل بنكي",
    visual_revision_rounds: 3,
    visual_ip_rights_mode: "specific_transfer",
    visual_ip_specific_rights: "حق الاستعمال والتعديل والنشر",
    visual_portfolio_permission: "no",
    visual_breach_cure_days: 17,
    visual_nonpayment_termination_days: 11,
    visual_client_stoppage_days: 8,
    visual_post_notice_termination_days: 6,
    visual_email_notices_enabled: true,
    visual_notice_use_party_emails: false,
    visual_notice_client_email: "client-vis@example.com",
    visual_notice_provider_email: "designer-vis@example.com",
    visual_messaging_apps_enabled: true,
    visual_messaging_apps: "WhatsApp",
    visual_messaging_use_party_phones: true,
    visual_competent_court: "أخرى",
    visual_competent_court_other: "القاهرة الاقتصادية",
  };
  const resolved = resolveWizardDefinition(freelancerTemplateDefinition, "visual_identity_design", [], values);
  assert.deepEqual(validateDynamicDefinition(resolved, { variantKey: "visual_identity_design", selectedOptionalClauseKeys: [], fieldValues: values, attachmentRefs: {} }), []);
  const clauses = renderLegalClauses(freelancerTemplateDefinition, "visual_identity_design", [], values);
  const byKey = Object.fromEntries(clauses.map((clause) => [clause.key, clause.bodyAr]));
  const all = clauses.map((clause) => clause.bodyAr).join("\n");
  for (const sentinel of [
    "عميل-الهوية-اختبار", "PASS-VIS-999", "علامة-بصرية-اختبار", "غرض-بصري-اختبار",
    "تغليف-مخصص-اختبار", "AI, FIG", "21 يوم عمل", "01/09/2026", numberToEgyptianPoundsWords(values.visual_contract_value),
    "٢٠٬٠٠٠", "تحويل بنكي", "٣ جولة", "حق الاستعمال والتعديل والنشر",
    "client-vis@example.com", "WhatsApp", "القاهرة الاقتصادية",
  ]) assert.match(all, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), sentinel);
  assert.match(byKey.visual_identity_design_source_section_03, /تغليف-مخصص-اختبار/);
  assert.match(byKey.visual_identity_design_source_section_04, /تغليف-مخصص-اختبار/);
  assert.match(byKey.visual_identity_design_source_section_05, /AI, FIG/);
  assert.match(byKey.visual_identity_design_source_section_11, /AI, FIG/);
  assert.match(byKey.visual_identity_design_source_section_11, /لا يجوز للطرف الثاني عرض/);
  assert.match(byKey.visual_identity_design_source_section_12, /لا يجوز للطرف الثاني عرض/);
  assert.match(byKey.visual_identity_design_source_section_14, /١٧ يوم/);
  assert.match(byKey.visual_identity_design_source_section_15, /١١ يوم/);
  assert.match(byKey.visual_identity_design_source_section_16, /٨ يوم/);
  assert.match(byKey.visual_identity_design_source_section_16, /٦ يوم/);
  assert.doesNotMatch(all, /{{|بيان مطلوب|\.\.\.\.|في الحدود التي يتفق عليها الطرفان/);
});

test("visual identity v13 installment schedule must equal total contract value", () => {
  const values = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "visual_identity_design", []),
    visual_payment_mode: "installments",
    visual_contract_value: 50000,
    visual_main_payment_schedule: [
      { payment: "الأولى", amount: 20000, due: "عند التوقيع" },
      { payment: "الثانية", amount: 25000, due: "عند التسليم" },
    ],
  };
  const resolved = resolveWizardDefinition(freelancerTemplateDefinition, "visual_identity_design", [], values);
  const issues = validateDynamicDefinition(resolved, { variantKey: "visual_identity_design", selectedOptionalClauseKeys: [], fieldValues: values, attachmentRefs: {} });
  assert.ok(issues.some((issue) => issue.fieldKey === "visual_main_payment_schedule"));
});

test("visual identity v13 variable coverage audit fails closed for every wizard input", () => {
  const coverage = auditVariantFieldCoverage(freelancerTemplateDefinition, "visual_identity_design", {
    derivedVariableDependencies: derivedClauseVariableDependencies,
    externalBindings: visualIdentityFieldCoverageExternalBindings,
  });
  assert.equal(coverage.uncoveredFieldKeys.length, 0, coverage.uncoveredFieldKeys.join(", "));
  assert.ok(coverage.entries.length > 80);

  const clone = structuredClone(freelancerTemplateDefinition);
  const visual = clone.variants.find((variant) => variant.key === "visual_identity_design");
  visual.steps.find((step) => step.key === "visual_project_scope").fields.push({ key: "visual_unbound_probe", type: "text", labelAr: "حقل اختبار غير مربوط" });
  const inspection = inspectTemplateDefinition(clone);
  assert.ok(inspection.errors.some((issue) => issue.code === "UNBOUND_LEGAL_FIELD" && issue.messageAr.includes("visual_unbound_probe")));
});

test("social media v14 binds negotiated services, commercial terms and legal choices into governing clauses", () => {
  const values = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "social_media_management", []),
    contract_date: "2026-08-19",
    social_client_party_type: "individual",
    social_client_name: "عميل-السوشيال-اختبار",
    social_client_nationality: "مصري",
    social_client_identity_document_type: "passport",
    social_client_national_id: "PASS-SOC-777",
    social_client_address: "عنوان-عميل-السوشيال",
    social_client_phone: "01011112222",
    social_provider_party_type: "individual",
    social_provider_name: "مقدم-خدمة-اختبار",
    social_provider_nationality: "مصري",
    social_provider_identity_document_type: "national_id",
    social_provider_national_id: "29801010101010",
    social_provider_address: "عنوان-مقدم-الخدمة",
    social_provider_phone: "01033334444",
    social_project_name: "نشاط-سوشيال-اختبار",
    social_brand_name: "علامة-سوشيال-اختبار",
    social_business_nature: "تجارة إلكترونية",
    social_target_market: "مصر والخليج",
    social_target_audience: "رواد الأعمال",
    social_accounts: [
      { platform: "instagram", account: "@brand-test" },
      { platform: "other", platform_other: "Pinterest", account: "brand-pin" },
    ],
    social_project_manager_custom: true,
    social_project_manager: "مدير-سوشيال-اختبار",
    social_approval_person_custom: true,
    social_approval_person: "معتمد-سوشيال-اختبار",
    social_billing_contact_custom: true,
    social_billing_contact: "فواتير-سوشيال-اختبار",
    social_service_account_management: true,
    social_service_copywriting: true,
    social_service_design: true,
    social_service_publishing: true,
    social_service_paid_ads: true,
    social_service_reports: true,
    social_service_community_management: true,
    social_content_plan: [
      { content_type: "posts", quantity: 12, frequency: "monthly" },
      { content_type: "other", content_type_other: "Carousels", quantity: 4, frequency: "monthly" },
    ],
    social_ad_budget_mode: "fixed",
    social_ad_budget_amount: 15000,
    social_ad_budget_period: "monthly",
    social_ad_budget_payer: "client",
    social_ad_budget_included_in_fee: "no",
    social_ad_payment_management: "client_direct",
    social_report_frequency: "monthly",
    social_kpi_enabled: true,
    social_kpi_effect: "guidance",
    social_kpis: [{ indicator: "معدل التفاعل", target: "5%" }],
    social_service_start_date: "2026-09-01",
    social_contract_duration_value: 6,
    social_contract_duration_unit: "months",
    social_fee_nature: "periodic",
    social_fee: 20000,
    social_fee_periodicity: "monthly",
    social_periodic_due: "في اليوم الأول من كل شهر",
    social_payment_method: "bank",
    social_payment_grace_days: 5,
    social_content_review_days: 4,
    social_review_rounds: 3,
    social_source_files_included: "yes",
    social_source_file_types: "PSD, AI",
    social_source_files_price_mode: "additional",
    social_source_files_additional_fee: 2500,
    social_portfolio_permission: "no",
    social_ai_external_data_permission: "no",
    social_delay_penalty_mode: "percentage",
    social_delay_penalty_percentage: 1.5,
    social_delay_penalty_cap_percentage: 12,
    social_delay_penalty_cure_days: 6,
    social_breach_cure_days: 14,
    social_nonpayment_termination_days: 9,
    social_client_stoppage_days: 8,
    social_client_post_notice_termination_days: 13,
    social_force_majeure_notice_days: 6,
    social_email_notices_enabled: true,
    social_notice_use_party_emails: false,
    social_notice_client_email: "client-social@example.test",
    social_notice_provider_email: "provider-social@example.test",
    social_messaging_apps_enabled: true,
    social_messaging_apps: "whatsapp",
    social_messaging_use_party_phones: true,
    social_competent_court: "أخرى",
    social_competent_court_other: "القاهرة الاقتصادية",
    social_contract_copies: 3,
  };
  const resolved = resolveWizardDefinition(freelancerTemplateDefinition, "social_media_management", [], values);
  assert.deepEqual(validateDynamicDefinition(resolved, { variantKey: "social_media_management", selectedOptionalClauseKeys: [], fieldValues: values, attachmentRefs: {} }), []);
  const clauses = renderLegalClauses(freelancerTemplateDefinition, "social_media_management", [], values);
  const byKey = Object.fromEntries(clauses.map((clause) => [clause.key, clause.bodyAr]));
  const all = clauses.map((clause) => clause.bodyAr).join("\n");
  for (const sentinel of [
    "عميل-السوشيال-اختبار", "PASS-SOC-777", "نشاط-سوشيال-اختبار", "@brand-test", "Pinterest",
    "مدير-سوشيال-اختبار", "معتمد-سوشيال-اختبار", "فواتير-سوشيال-اختبار", "كتابة المحتوى",
    "إدارة المجتمع الرقمي", "Carousels", "١٥٬٠٠٠", "معدل التفاعل", "01/09/2026", "٦ أشهر",
    "عشرون ألف", "في اليوم الأول من كل شهر", "PSD, AI", "٢٬٥٠٠", "client-social@example.test",
    "WhatsApp", "القاهرة الاقتصادية", "٣ نسخ",
  ]) assert.match(all, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), sentinel);
  assert.match(byKey.social_media_management_source_section_05, /إدارة المجتمع الرقمي/);
  assert.doesNotMatch(byKey.social_media_management_source_section_05, /الرد على الرسائل أو التعليقات أو إدارة خدمة العملاء[^.]*غير مشمول/u);
  assert.match(byKey.social_media_management_source_section_11, /PSD, AI/);
  assert.match(byKey.social_media_management_source_section_15, /لا يجوز للطرف الثاني استخدام اسم الطرف الأول|لا يجوز للطرف الثاني.*Portfolio/su);
  assert.match(byKey.social_media_management_source_section_18, /لا يجوز للطرف الثاني استخدام اسم الطرف الأول|لا يجوز للطرف الثاني.*Portfolio/su);
  assert.match(byKey.social_media_management_source_section_20, /١٤ يوم/);
  assert.match(byKey.social_media_management_source_section_20, /٩ أيام عمل/);
  assert.match(byKey.social_media_management_source_section_20, /٨ أيام عمل/);
  assert.match(byKey.social_media_management_source_section_20, /١٣ أيام عمل/);
  assert.match(byKey.social_media_management_source_section_21, /٦ أيام عمل/);
  assert.doesNotMatch(all, /موقع تعريفي|متجر إلكتروني|Web Application|Landing Page|{{|بيان مطلوب|\.\.\.\./);
});

test("social media v14 total-fee installment schedule must equal total contract value", () => {
  const values = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "social_media_management", []),
    social_fee_nature: "total",
    social_fee: 50000,
    social_payment_mode: "installments",
    social_payment_schedule: [
      { payment: "الأولى", amount: 20000, due: "عند التوقيع" },
      { payment: "الثانية", amount: 25000, due: "عند التسليم" },
    ],
  };
  const resolved = resolveWizardDefinition(freelancerTemplateDefinition, "social_media_management", [], values);
  const issues = validateDynamicDefinition(resolved, { variantKey: "social_media_management", selectedOptionalClauseKeys: [], fieldValues: values, attachmentRefs: {} });
  assert.ok(issues.some((issue) => issue.fieldKey === "social_payment_schedule"));
});

test("social media v14 requires at least one explicitly selected service", () => {
  const social = freelancerTemplateDefinition.variants.find((item) => item.key === "social_media_management");
  const values = { ...createSampleFieldValues(freelancerTemplateDefinition, "social_media_management", []) };
  for (const field of social.steps.flatMap((step) => step.fields).filter((field) => field.key.startsWith("social_service_") && field.type === "checkbox")) values[field.key] = false;
  const resolved = resolveWizardDefinition(freelancerTemplateDefinition, "social_media_management", [], values);
  const issues = validateDynamicDefinition(resolved, { variantKey: "social_media_management", selectedOptionalClauseKeys: [], fieldValues: values, attachmentRefs: {} });
  assert.ok(issues.some((issue) => issue.fieldKey === "social_service_account_management"));
});

test("social media v14 variable coverage audit fails closed for every wizard input", () => {
  const coverage = auditVariantFieldCoverage(freelancerTemplateDefinition, "social_media_management", {
    derivedVariableDependencies: derivedClauseVariableDependencies,
    externalBindings: socialMediaFieldCoverageExternalBindings,
  });
  assert.equal(coverage.entries.length, 139, "عدد حقول عقد السوشيال تغير؛ راجع خريطة الـcoverage قبل النشر");
  assert.equal(coverage.entries.filter((entry) => entry.status === "clause_bound").length, 133);
  assert.equal(coverage.entries.filter((entry) => entry.status === "external_bound").length, 6);
  assert.deepEqual(coverage.uncoveredFieldKeys, [], coverage.uncoveredFieldKeys.join(", "));
  const byKey = Object.fromEntries(coverage.entries.map((entry) => [entry.fieldKey, entry]));
  assert.ok(byKey.social_client_name.clauseTitlesAr.some((title) => title.includes("المادة الأولى")));
  assert.ok(byKey.social_accounts.clauseTitlesAr.some((title) => title.includes("المادة الرابعة")));
  assert.ok(byKey.social_service_community_management.clauseTitlesAr.some((title) => title.includes("المادة الرابعة")));
  assert.ok(byKey.social_service_community_management.clauseTitlesAr.some((title) => title.includes("المادة السادسة")));
  assert.ok(byKey.social_portfolio_permission.clauseTitlesAr.some((title) => title.includes("المادة الثالثة عشرة")));
  assert.ok(byKey.social_portfolio_permission.clauseTitlesAr.some((title) => title.includes("المادة السادسة عشرة")));
  assert.equal(byKey.social_witness_1_name.status, "external_bound");

  const clone = structuredClone(freelancerTemplateDefinition);
  const social = clone.variants.find((variant) => variant.key === "social_media_management");
  social.steps[0].fields.push({ key: "social_future_unbound_field", type: "text", labelAr: "حقل جديد غير مربوط" });
  const inspection = inspectTemplateDefinition(clone);
  assert.ok(inspection.errors.some((issue) => issue.code === "UNBOUND_LEGAL_FIELD" && issue.messageAr.includes("social_future_unbound_field")));
});



test("all nine contracts derive legal money wording from the numeric source of truth", () => {
  const variants = [
    [freelancerTemplateDefinition, "website_development", "website_total_price", "website_total_price_words"],
    [freelancerTemplateDefinition, "visual_identity_design", "visual_contract_value", "visual_contract_value_words"],
    [freelancerTemplateDefinition, "social_media_management", "social_fee", "social_fee_words"],
    [apartmentSaleTemplateDefinition, "preliminary_sale", "sale_total_price", "sale_total_price_words"],
    [apartmentSaleTemplateDefinition, "registrable_sale", "sale_total_price", "sale_total_price_words"],
    [apartmentSaleTemplateDefinition, "inherited_sale", "sale_total_price", "sale_total_price_words"],
    [rentalTemplateDefinition, "residential_lease", "rent_amount", "rent_amount_words"],
    [rentalTemplateDefinition, "commercial_lease", "rent_amount", "rent_amount_words"],
    [rentalTemplateDefinition, "administrative_lease", "rent_amount", "rent_amount_words"],
  ];
  for (const [definition, variantKey, numericKey, wordsKey] of variants) {
    const values = createSampleFieldValues(definition, variantKey, []);
    values[numericKey] = 1000;
    values[wordsKey] = "قيمة خاطئة يجب تجاهلها";
    const fields = definition.variants.find((v) => v.key === variantKey).steps.flatMap((step) => step.fields);
    assert.equal(fields.some((field) => field.key === wordsKey), false, `${variantKey}: no manual words input`);
    const text = renderLegalClauses(definition, variantKey, [], values).map((clause) => clause.bodyAr).join("\n");
    assert.match(text, /ألف جنيه مصري فقط لا غير/, variantKey);
    assert.doesNotMatch(text, /قيمة خاطئة يجب تجاهلها/, variantKey);
    assert.doesNotMatch(text, /\(فقط\s/u, `${variantKey}: do not duplicate فقط around derived money words`);
  }
});

test("party names entered once appear in the opening legal article of all nine contracts", () => {
  const cases = [
    [freelancerTemplateDefinition, "website_development", "website_client_name", "عميل الموقع التجريبي", "website_provider_name", "مطور الموقع التجريبي"],
    [freelancerTemplateDefinition, "visual_identity_design", "visual_client_name", "عميل الهوية التجريبي", "visual_provider_name", "مصمم الهوية التجريبي"],
    [freelancerTemplateDefinition, "social_media_management", "social_client_name", "عميل التواصل التجريبي", "social_provider_name", "مقدم التواصل التجريبي"],
    [apartmentSaleTemplateDefinition, "preliminary_sale", "seller_name", "بائع ابتدائي تجريبي", "buyer_name", "مشتري ابتدائي تجريبي"],
    [apartmentSaleTemplateDefinition, "registrable_sale", "seller_name", "بائع تسجيل تجريبي", "buyer_name", "مشتري تسجيل تجريبي"],
    [apartmentSaleTemplateDefinition, "inherited_sale", "seller_name", "بائع ميراث تجريبي", "buyer_name", "مشتري ميراث تجريبي"],
    [rentalTemplateDefinition, "residential_lease", "landlord_name", "مؤجر سكني تجريبي", "tenant_name", "مستأجر سكني تجريبي"],
    [rentalTemplateDefinition, "commercial_lease", "landlord_name", "مؤجر تجاري تجريبي", "tenant_name", "مستأجر تجاري تجريبي"],
    [rentalTemplateDefinition, "administrative_lease", "landlord_name", "مؤجر إداري تجريبي", "tenant_name", "مستأجر إداري تجريبي"],
  ];
  for (const [definition, variantKey, firstKey, firstName, secondKey, secondName] of cases) {
    const values = createSampleFieldValues(definition, variantKey, []);
    values[firstKey] = firstName;
    values[secondKey] = secondName;
    const openingText = renderLegalClauses(definition, variantKey, [], values)
      .slice(0, 3)
      .map((clause) => clause.bodyAr)
      .join("\n");
    assert.match(openingText, new RegExp(firstName), `${variantKey}: first party`);
    assert.match(openingText, new RegExp(secondName), `${variantKey}: second party`);
  }
});

test("customer-facing legal text contains no wizard placeholders or product-editor wording", () => {
  const all = [freelancerTemplateDefinition, apartmentSaleTemplateDefinition, rentalTemplateDefinition]
    .flatMap((definition) => definition.legalClauses ?? [])
    .map((clause) => `${clause.titleAr}\n${clause.bodyAr}`)
    .join("\n");
  for (const forbidden of ["محرر تعاقدي", "بيان مطلوب", "قسم بيانات العقد أعلاه", "عبر المنصة"]) {
    assert.doesNotMatch(all, new RegExp(forbidden), forbidden);
  }
});

test("preview A4 typography stays aligned with the WeasyPrint PDF hierarchy", () => {
  const compact = (value) => value.replace(/\s+/g, "");
  const css = compact(readFileSync(new URL("../../../frontend/src/app/globals.css", import.meta.url), "utf8"));
  const blade = compact(readFileSync(new URL("../../../backend/resources/views/pdf/contract.blade.php", import.meta.url), "utf8"));
  for (const token of ["font-size:11.35pt", "line-height:1.44", "min-height:18mm", "font-size:17.5pt", "font-size:11.25pt", "font-size:9.4pt"]) {
    assert.ok(css.includes(token), `preview ${token}`);
    assert.ok(blade.includes(token), `pdf ${token}`);
  }
});
