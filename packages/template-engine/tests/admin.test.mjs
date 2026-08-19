import test from "node:test";
import assert from "node:assert/strict";
import {
  apartmentSaleTemplateDefinition,
  createSampleFieldValues,
  evaluateCondition,
  freelancerTemplateDefinition,
  inspectTemplateDefinition,
  moveArrayItem,
  renderLegalClauses,
  resolveWizardDefinition,
  validateDynamicDefinition,
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


test("visual identity semantics remain intact in freelancer v11", () => {
  assert.equal(freelancerTemplateDefinition.version, 11);
  const visual = freelancerTemplateDefinition.variants.find((item) => item.key === "visual_identity_design");
  assert.ok(visual);
  const allFields = visual.steps.flatMap((step) => step.fields);
  const byKey = Object.fromEntries(allFields.map((field) => [field.key, field]));

  assert.equal(byKey.visual_execution_duration.required, true);
  assert.equal(byKey.visual_contract_value.required, true);
  assert.equal(byKey.visual_contract_value_words.required, true);
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
    "visual_client_authority_basis", "visual_client_company_address", "visual_client_company_email",
  ]) assert.equal(fields[key].required, true, key);
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
  for (const key of ["social_managed_platforms", "social_scope_summary", "social_contract_duration", "social_fee", "social_fee_words"]) assert.equal(fields[key].required, true, key);
  assert.equal(fields.social_competent_court.required, true);
  assert.ok(fields.social_competent_court.options.some((option) => option.value === "المنيا"));
  assert.ok(fields.social_competent_court.options.some((option) => option.value === "أخرى"));
  assert.equal(Boolean(fields.social_account_access_attachment), false);
  assert.equal(Boolean(fields.social_brand_assets_attachment), false);
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

test("rental v13 exposes the three reviewed lease variants without legacy fields", () => {
  assert.equal(rentalTemplateDefinition.version, 13);
  assert.deepEqual(
    rentalTemplateDefinition.variants.map((variant) => variant.key),
    ["residential_lease", "commercial_lease", "administrative_lease"],
  );
  const legacy = new Set([
    "landlord_id_card_front", "landlord_id_card_back", "tenant_id_card_front", "tenant_id_card_back",
    "renewal_policy", "sublease_allowed", "competent_court", "has_deposit", "monthly_rent",
    "pets_policy", "daily_late_penalty_amount",
  ]);
  for (const variant of rentalTemplateDefinition.variants) {
    const keys = variant.steps.flatMap((step) => step.fields.map((field) => field.key));
    for (const key of legacy) assert.equal(keys.includes(key), false, `${variant.key}:${key}`);
  }
});

test("rental v13 core finance, duration and source-specific payment fields are required with no fake defaults", () => {
  const coreRequiredKeys = [
    "contract_date", "contract_copies_count", "lease_duration_text", "start_date", "end_date", "property_delivery_date",
    "deposit_amount", "deposit_amount_words", "rent_period", "rent_amount", "rent_amount_words", "rent_due_day",
    "holdover_daily_compensation", "rental_jurisdiction_court",
  ];
  for (const variant of rentalTemplateDefinition.variants) {
    const fields = Object.fromEntries(variant.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
    for (const key of coreRequiredKeys) assert.equal(fields[key]?.required, true, `${variant.key}:${key}`);
    assert.equal(fields.rental_jurisdiction_court.type, "select");
    assert.ok(fields.rental_jurisdiction_court.options.some((option) => option.value === "القاهرة"));
    assert.ok(variant.requiredClauseKeys.includes("rental_jurisdiction_court_clause"));
    assert.equal(fields.contract_copies_count.validation.min, 2);
    for (const key of ["deposit_amount", "rent_amount", "annual_increase_rate", "rent_due_day", "late_payment_daily_compensation", "holdover_daily_compensation"]) {
      assert.equal(Object.hasOwn(variant.defaultFieldValues ?? {}, key), false, `${variant.key}:${key} must not have a fake default`);
    }
    if (variant.key === "residential_lease") {
      assert.equal(fields.rental_payment_methods.required, true);
      assert.equal(fields.rental_payment_methods.minRows, 1);
      assert.equal(fields.rental_payment_methods.columns.find((column) => column.key === "method").required, true);
      assert.equal(fields.residential_payment_grace_days.required, true);
      assert.equal(fields.residential_payment_grace_days.validation.min, 1);
      assert.equal(fields.late_payment_daily_compensation.required, true);
      assert.equal(Boolean(fields.rental_payment_method), false);
    } else {
      assert.equal(fields.rental_payment_method.required, true);
      assert.equal(Boolean(fields.rental_payment_methods), false);
      if (variant.key === "commercial_lease") assert.equal(fields.late_payment_daily_compensation.required, true);
      if (variant.key === "administrative_lease") assert.equal(Boolean(fields.late_payment_daily_compensation), false);
    }
  }
});

test("rental company and optional contact children become required only when their parent condition is active", () => {
  const companyValues = {
    landlord_party_type: "company",
    tenant_party_type: "individual",
    rental_email_notices_enabled: true,
    rental_notice_use_party_emails: false,
    rental_messaging_enabled: true,
    rental_messaging_channel: "أخرى",
    rental_messaging_use_party_phones: false,
  };
  const resolved = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], companyValues);
  const fields = Object.fromEntries(resolved.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  for (const key of [
    "landlord_company_name", "landlord_company_legal_form", "landlord_commercial_register", "landlord_tax_card",
    "landlord_legal_representative", "landlord_representative_capacity", "landlord_company_address", "landlord_company_email",
  ]) assert.equal(fields[key]?.required, true, key);
  assert.equal(fields.rental_notice_landlord_email.required, true);
  assert.equal(fields.rental_notice_tenant_email.required, true);
  assert.equal(fields.rental_messaging_channel_other.required, true);
  assert.equal(fields.rental_messaging_landlord_phone.required, true);
  assert.equal(fields.rental_messaging_tenant_phone.required, true);
});

test("furnished residential lease never auto-adds the optional handover inventory annex", () => {
  const baseValues = { ...rentalTemplateDefinition.variants.find((v) => v.key === "residential_lease").defaultFieldValues };
  const without = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], { ...baseValues, residential_is_furnished: false });
  assert.equal(without.activeClauseKeys.includes("rental_handover_inventory_report_source_document"), false);
  const withFurnished = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], { ...baseValues, residential_is_furnished: true });
  assert.equal(withFurnished.activeClauseKeys.includes("rental_handover_inventory_report_source_document"), false);
  const selected = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", ["rental_handover_inventory_report"], { ...baseValues, residential_is_furnished: true });
  assert.equal(selected.activeClauseKeys.includes("rental_handover_inventory_report_source_document"), true);
});

test("administrative inventory-report delivery condition never auto-adds the optional handover annex", () => {
  const variant = rentalTemplateDefinition.variants.find((v) => v.key === "administrative_lease");
  const base = { ...variant.defaultFieldValues, administrative_delivery_condition: "vacant" };
  const without = resolveWizardDefinition(rentalTemplateDefinition, "administrative_lease", [], base);
  assert.equal(without.activeClauseKeys.includes("rental_handover_inventory_report_source_document"), false);
  const withReport = resolveWizardDefinition(rentalTemplateDefinition, "administrative_lease", [], { ...base, administrative_delivery_condition: "inventory_report" });
  assert.equal(withReport.activeClauseKeys.includes("rental_handover_inventory_report_source_document"), false);
  const selected = resolveWizardDefinition(rentalTemplateDefinition, "administrative_lease", ["rental_handover_inventory_report"], { ...base, administrative_delivery_condition: "inventory_report" });
  assert.equal(selected.activeClauseKeys.includes("rental_handover_inventory_report_source_document"), true);
});

test("commercial and administrative optional legal paragraphs enforce dependent values", () => {
  const commercial = resolveWizardDefinition(rentalTemplateDefinition, "commercial_lease", [], {
    commercial_early_termination_enabled: true,
    commercial_guarantee_checks_enabled: true,
    commercial_guarantee_value_mode: "each",
    commercial_legal_fees_enabled: true,
  });
  const cf = Object.fromEntries(commercial.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(cf.commercial_early_termination_compensation.required, true);
  for (const key of ["commercial_guarantee_checks_count", "commercial_guarantee_bank", "commercial_guarantee_check_numbers", "commercial_guarantee_value_mode", "commercial_guarantee_each_amount", "commercial_legal_fees_bearer"]) assert.equal(cf[key]?.required, true, key);
  assert.equal(Boolean(cf.commercial_guarantee_total_amount), false);

  const administrative = resolveWizardDefinition(rentalTemplateDefinition, "administrative_lease", [], {
    administrative_early_termination_enabled: true,
    administrative_guarantee_checks_enabled: true,
    administrative_guarantee_value_mode: "total",
    administrative_legal_fees_enabled: true,
  });
  const af = Object.fromEntries(administrative.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(af.administrative_early_termination_compensation.required, true);
  for (const key of ["administrative_guarantee_checks_count", "administrative_guarantee_bank", "administrative_guarantee_check_numbers", "administrative_guarantee_value_mode", "administrative_guarantee_total_amount", "administrative_legal_fees_bearer"]) assert.equal(af[key]?.required, true, key);
  assert.equal(Boolean(af.administrative_guarantee_each_amount), false);
});

test("rental annual increase follows each source: fixed 10% for residential/admin, editable rate only for commercial", () => {
  for (const key of ["residential_lease", "administrative_lease"]) {
    const off = resolveWizardDefinition(rentalTemplateDefinition, key, [], { annual_increase_enabled: false });
    const on = resolveWizardDefinition(rentalTemplateDefinition, key, [], { annual_increase_enabled: true });
    assert.equal(off.steps.flatMap((step) => step.fields).some((field) => field.key === "annual_increase_rate"), false, key);
    assert.equal(on.steps.flatMap((step) => step.fields).some((field) => field.key === "annual_increase_rate"), false, key);
  }
  const off = resolveWizardDefinition(rentalTemplateDefinition, "commercial_lease", [], { annual_increase_enabled: false });
  assert.equal(off.steps.flatMap((step) => step.fields).some((field) => field.key === "annual_increase_rate"), false);
  const on = resolveWizardDefinition(rentalTemplateDefinition, "commercial_lease", [], { annual_increase_enabled: true });
  const rate = on.steps.flatMap((step) => step.fields).find((field) => field.key === "annual_increase_rate");
  assert.equal(rate.required, true);
  const clauses = Object.fromEntries(rentalTemplateDefinition.legalClauses.map((clause) => [clause.key, clause]));
  assert.match(clauses.rental_residential_annual_increase_clause.bodyAr, /10%/);
  assert.match(clauses.rental_administrative_annual_increase_clause.bodyAr, /10%/);
  assert.match(clauses.rental_commercial_annual_increase_clause.bodyAr, /\{\{annual_increase_rate\}\}/);
});

test("rental jurisdiction uses an explicit selected court field and required clause", () => {
  for (const variant of rentalTemplateDefinition.variants) {
    const fields = Object.fromEntries(variant.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
    assert.equal(fields.rental_jurisdiction_court.required, true, `${variant.key}:rental_jurisdiction_court`);
    assert.equal(fields.rental_jurisdiction_court.type, "select");
    assert.ok(fields.rental_jurisdiction_court.options.some((option) => option.value === "القاهرة"));
    assert.ok(variant.requiredClauseKeys.includes("rental_jurisdiction_court_clause"));
  }
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

test("sale v12 exposes three source-specific variants without legacy sale fields", () => {
  assert.equal(apartmentSaleTemplateDefinition.version, 12);
  assert.deepEqual(apartmentSaleTemplateDefinition.variants.map((item) => item.key), ["preliminary_sale", "registrable_sale", "inherited_sale"]);
  const legacy = new Set(["sale_competent_court", "sale_payment_method", "sale_installment_rows", "sale_seller_id_front", "sale_buyer_id_front"]);
  for (const variant of apartmentSaleTemplateDefinition.variants) {
    const fields = variant.steps.flatMap((step) => step.fields);
    for (const field of fields) assert.equal(legacy.has(field.key), false, `${variant.key}:${field.key}`);
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    assert.equal(byKey.sale_jurisdiction_court.required, true, `${variant.key}:sale_jurisdiction_court`);
    assert.equal(byKey.sale_jurisdiction_court.type, "select");
    assert.ok(byKey.sale_jurisdiction_court.options.some((option) => option.value === "القاهرة"));
    assert.ok(variant.requiredClauseKeys.includes("sale_jurisdiction_court_clause"));
  }
  const inherited = apartmentSaleTemplateDefinition.variants.find((item) => item.key === "inherited_sale");
  const inheritedFields = Object.fromEntries(inherited.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(Boolean(inheritedFields.seller_party_type), false);
  assert.equal(Boolean(inheritedFields.buyer_party_type), false);
  assert.equal(inheritedFields.inheritance_no_minors_ack.required, true);
});

test("sale source-fixed terms stay fixed while only true blanks remain editable", () => {
  const byVariant = Object.fromEntries(apartmentSaleTemplateDefinition.variants.map((variant) => [variant.key, Object.fromEntries(variant.steps.flatMap((step) => step.fields).map((field) => [field.key, field]))]));
  assert.equal(Boolean(byVariant.preliminary_sale.sale_installment_grace_days), false);
  assert.equal(byVariant.registrable_sale.sale_installment_grace_days.required, true);
  assert.equal(byVariant.inherited_sale.sale_installment_grace_days.required, true);
  assert.equal(Boolean(byVariant.registrable_sale.sale_delivery_delay_threshold_days), false);
  assert.equal(byVariant.preliminary_sale.sale_delivery_delay_threshold_days.required, true);
  assert.equal(byVariant.inherited_sale.sale_delivery_delay_threshold_days.required, true);
  assert.equal(Boolean(byVariant.inherited_sale.sale_contract_copies_count), false);
  const clauses = Object.fromEntries(apartmentSaleTemplateDefinition.legalClauses.map((clause) => [clause.key, clause]));
  assert.match(clauses.preliminary_installment_payment_clause.bodyAr, /خمسة عشر \(15\) يومًا/);
  assert.match(clauses.registrable_full_delivery_clause.bodyAr, /ثلاثين \(30\) يومًا/);
  assert.match(clauses.inherited_sale_source_article_23.bodyAr, /\(2\).*نسختين/);
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
  });
  const cf = Object.fromEntries(company.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  assert.equal(cf.seller_company_name.required, true);
  assert.equal(cf.seller_company_email.required, true);
  assert.equal(Boolean(cf.seller_email.required), false);
  for (const key of ["sale_electricity_meter", "sale_electricity_meter_type", "sale_electricity_meter_reading"]) assert.equal(cf[key].required, true, key);

  const inherited = resolveWizardDefinition(apartmentSaleTemplateDefinition, "inherited_sale", [], {
    inheritance_disposition_basis: "power_of_attorney",
    sale_electricity_meter: "12345",
  });
  const inf = Object.fromEntries(inherited.steps.flatMap((step) => step.fields).map((field) => [field.key, field]));
  for (const key of ["inheritance_poa_number", "inheritance_poa_year", "inheritance_poa_office", "inheritance_poa_date"]) assert.equal(inf[key].required, true, key);
  assert.equal(inf.sale_electricity_meter_type.required, true);
  assert.equal(inf.sale_electricity_meter_reading.required, true);
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
        assert.equal(field.required, true, `${variant.key}:${field.key}`);
        assert.deepEqual(field.options.map((option) => option.value), ["national_id", "passport"]);
      }
    }
  }
  assert.equal(variants, 9);
});

test("explicit identity-document choice controls validation instead of nationality", () => {
  const resolved = resolveWizardDefinition(rentalTemplateDefinition, "residential_lease", [], {});
  const issues = (fieldValues) => validateDynamicDefinition(resolved, {
    templateSlug: "rental",
    variantKey: "residential_lease",
    selectedOptionalClauseKeys: [],
    fieldValues,
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
  for (const sentinel of ["مشروع-ربط-الموقع", "مدير-المشروع-اختبار", "مسؤول-الاعتماد-اختبار", "مسؤول-المدفوعات-اختبار", "binding@example.test", "قيمة الاختبار كتابة", "القاهرة"]) assert.match(websiteText, new RegExp(sentinel));

  const socialValues = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "social_media_management", []),
    social_target_market: "السوق-المستهدف-اختبار",
    social_target_audience: "الجمهور-المستهدف-اختبار",
    social_project_manager: "مدير-السوشيال-اختبار",
  };
  const socialText = renderLegalClauses(freelancerTemplateDefinition, "social_media_management", [], socialValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["السوق-المستهدف-اختبار", "الجمهور-المستهدف-اختبار", "مدير-السوشيال-اختبار"]) assert.match(socialText, new RegExp(sentinel));

  const rentalValues = {
    ...createSampleFieldValues(rentalTemplateDefinition, "residential_lease", []),
    contract_copies_count: 4,
    residential_compound_name: "كمبوند-اختبار-العقد",
    building_number: "مبنى-77",
    electricity_meter: "عداد-12345",
    electricity_meter_type: "independent",
  };
  const rentalText = renderLegalClauses(rentalTemplateDefinition, "residential_lease", [], rentalValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["كمبوند-اختبار-العقد", "مبنى-77", "عداد-12345", "نسخ أصلية متطابقة"]) assert.match(rentalText, new RegExp(sentinel));

  const saleValues = {
    ...createSampleFieldValues(apartmentSaleTemplateDefinition, "registrable_sale", []),
    sale_compound_name: "كمبوند-بيع-اختبار",
    sale_building_number: "عقار-991",
    sale_electricity_meter: "كهرباء-987",
    sale_electricity_meter_type: "independent",
    sale_electricity_meter_reading: "قراءة-456",
    sale_total_price_words: "ثمن البيع كتابة اختبار",
    registered_deed_number: "سند-123",
    registered_deed_year: "2026",
    registry_office: "مأمورية-اختبار",
  };
  const saleText = renderLegalClauses(apartmentSaleTemplateDefinition, "registrable_sale", [], saleValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["كمبوند-بيع-اختبار", "عقار-991", "كهرباء-987", "قراءة-456", "ثمن البيع كتابة اختبار", "سند-123", "مأمورية-اختبار"]) assert.match(saleText, new RegExp(sentinel));
});

test("execution, warranty, financial, delivery and court values are rendered inside governing articles across all nine contracts", () => {
  const visualValues = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "visual_identity_design", []),
    visual_execution_duration: "سبعة وأربعون يوم عمل",
    visual_contract_value: 47321,
    visual_contract_value_words: "سبعة وأربعون ألفًا وثلاثمائة وواحد وعشرون",
    visual_competent_court: "القاهرة",
  };
  const visualText = renderLegalClauses(freelancerTemplateDefinition, "visual_identity_design", [], visualValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["سبعة وأربعون يوم عمل", "سبعة وأربعون ألفًا وثلاثمائة وواحد وعشرون", "القاهرة"]) assert.match(visualText, new RegExp(sentinel));

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
  for (const sentinel of ["٣٧ يوم", "سبعة وثلاثون ألفًا وأربعمائة وواحد وعشرون", "١٩ شهر", "١١ سنوات", "الجيزة"]) assert.match(websiteText, new RegExp(sentinel));

  const socialValues = {
    ...createSampleFieldValues(freelancerTemplateDefinition, "social_media_management", []),
    social_contract_duration: "سبعة عشر شهرًا",
    social_fee: 17891,
    social_fee_words: "سبعة عشر ألفًا وثمانمائة وواحد وتسعون",
    social_delay_penalty_mode: "amount",
    social_delay_penalty_amount: 731,
    social_delay_penalty_cap_percentage: 17,
    social_competent_court: "الإسكندرية",
  };
  const socialText = renderLegalClauses(freelancerTemplateDefinition, "social_media_management", [], socialValues).map((c) => c.bodyAr).join("\n");
  for (const sentinel of ["سبعة عشر شهرًا", "سبعة عشر ألفًا وثمانمائة وواحد وتسعون", "٧٣١", "١٧", "الإسكندرية"]) assert.match(socialText, new RegExp(sentinel));

  for (const variantKey of ["residential_lease", "commercial_lease", "administrative_lease"]) {
    const values = {
      ...createSampleFieldValues(rentalTemplateDefinition, variantKey, []),
      lease_duration_text: "سبعة وعشرون شهرًا",
      start_date: "2027-02-03",
      end_date: "2029-05-03",
      property_delivery_date: "2027-02-11",
      deposit_amount: 27111,
      deposit_amount_words: "سبعة وعشرون ألفًا ومائة وأحد عشر",
      rent_amount: 27891,
      rent_amount_words: "سبعة وعشرون ألفًا وثمانمائة وواحد وتسعون",
      rent_due_day: 23,
      holdover_daily_compensation: 927,
      late_payment_daily_compensation: 619,
      rental_jurisdiction_court: "المنصورة",
    };
    const text = renderLegalClauses(rentalTemplateDefinition, variantKey, [], values).map((c) => c.bodyAr).join("\n");
    for (const sentinel of ["سبعة وعشرون شهرًا", "03/02/2027", "03/05/2029", "11/02/2027", "سبعة وعشرون ألفًا ومائة وأحد عشر", "سبعة وعشرون ألفًا وثمانمائة وواحد وتسعون", "المنصورة"]) assert.match(text, new RegExp(sentinel), `${variantKey}:${sentinel}`);
  }

  for (const variantKey of ["preliminary_sale", "registrable_sale", "inherited_sale"]) {
    const values = {
      ...createSampleFieldValues(apartmentSaleTemplateDefinition, variantKey, []),
      sale_total_price: 987654,
      sale_total_price_words: "تسعمائة وسبعة وثمانون ألفًا وستمائة وأربعة وخمسون",
      sale_payment_plan: "installments",
      sale_down_payment: 234567,
      sale_remaining_amount: 753087,
      sale_delivery_delay_daily_compensation: 813,
      sale_delivery_delay_threshold_days: 29,
      sale_jurisdiction_court: "طنطا",
    };
    if (variantKey === "preliminary_sale") values.preliminary_hidden_defect_warranty_years = 7;
    const text = renderLegalClauses(apartmentSaleTemplateDefinition, variantKey, [], values).map((c) => c.bodyAr).join("\n");
    for (const sentinel of ["تسعمائة وسبعة وثمانون ألفًا وستمائة وأربعة وخمسون", "٢٣٤٬٥٦٧", "٧٥٣٬٠٨٧", "٨١٣", "طنطا"]) assert.match(text, new RegExp(sentinel), `${variantKey}:${sentinel}`);
    if (variantKey === "preliminary_sale") assert.match(text, /٧ سنوات/);
  }
});
