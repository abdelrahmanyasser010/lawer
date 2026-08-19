import type {
  ConditionDefinition,
  ContractDraftData,
  ContractFieldValue,
  ContractTemplateDefinition,
  LegalClauseDefinition,
  ResolvedWizardDefinition,
  WizardFieldDefinition,
  WizardStepDefinition,
} from "./types";
import { numberToArabicWordsBare, numberToEgyptianPoundsWords } from "./formatters";

function primitiveValue(value: ContractFieldValue | undefined): string | number | boolean | null | undefined {
  if (Array.isArray(value)) return undefined;
  return value;
}

export function evaluateCondition(
  condition: ConditionDefinition | undefined,
  fieldValues: ContractDraftData["fieldValues"],
): boolean {
  if (!condition) return true;
  if ("all" in condition) return condition.all.every((item) => evaluateCondition(item, fieldValues));
  if ("any" in condition) return condition.any.some((item) => evaluateCondition(item, fieldValues));
  if ("not" in condition) return !evaluateCondition(condition.not, fieldValues);

  const current = primitiveValue(fieldValues[condition.fieldKey]);
  switch (condition.operator) {
    case "equals":
      return current === condition.value;
    case "not_equals":
      return current !== condition.value;
    case "truthy":
      return Boolean(current);
    case "falsy":
      return !current;
    case "includes":
      return String(current ?? "").includes(String(condition.value ?? ""));
    default:
      return true;
  }
}

function insertStepsBefore(
  steps: WizardStepDefinition[],
  insertedSteps: WizardStepDefinition[],
  beforeKey: string,
): WizardStepDefinition[] {
  const index = steps.findIndex((step) => step.key === beforeKey);
  if (index < 0) return [...steps, ...insertedSteps];
  return [...steps.slice(0, index), ...insertedSteps, ...steps.slice(index)];
}

export function findInvalidOptionalClauseKeys(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[],
): string[] {
  const variant = template.variants.find((item) => item.key === variantKey);
  if (!variant) return [...selectedOptionalClauseKeys];

  return selectedOptionalClauseKeys.filter((clauseKey) => {
    const clause = template.optionalClauses.find((item) => item.key === clauseKey);
    return !clause ||
      !variant.allowedOptionalClauseKeys.includes(clause.key) ||
      !clause.applicableVariantKeys.includes(variant.key);
  });
}

export function resolveWizardDefinition(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[],
  fieldValues: ContractDraftData["fieldValues"],
): ResolvedWizardDefinition {
  const variant = template.variants.find((item) => item.key === variantKey);
  if (!variant) {
    throw new Error(`Variant ${variantKey} is not available for ${template.slug}`);
  }

  let steps = variant.steps.map((step) => ({ ...step, fields: [...step.fields] }));
  const activeClauseKeys = new Set(variant.requiredClauseKeys);
  const effectiveClauseKeys = [...new Set(selectedOptionalClauseKeys)];

  for (const clauseKey of effectiveClauseKeys) {
    const clause = template.optionalClauses.find(
      (item) =>
        item.key === clauseKey &&
        variant.allowedOptionalClauseKeys.includes(item.key) &&
        item.applicableVariantKeys.includes(variant.key),
    );
    if (!clause) continue;
    if (!clause.manualFillAnnex) {
      steps = insertStepsBefore(steps, clause.insertedSteps, clause.insertBeforeStepKey);
    }
    clause.legalClauseKeys.forEach((key) => activeClauseKeys.add(key));
  }

  steps = steps
    .filter((step) => evaluateCondition(step.visibleWhen, fieldValues))
    .map((step) => ({
      ...step,
      fields: step.fields
        .filter((field) => evaluateCondition(field.visibleWhen, fieldValues))
        .map((field) => ({
          ...field,
          required: Boolean(field.required || (field.requiredWhen && evaluateCondition(field.requiredWhen, fieldValues))),
        })),
    }));

  return { template, variant, steps, activeClauseKeys: [...activeClauseKeys] };
}

export interface RenderedLegalClause {
  key: string;
  titleAr: string;
  bodyAr: string;
  sourceDocumentName?: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
}

function formatClauseVariable(
  fieldKey: string,
  value: unknown,
  field: WizardFieldDefinition | undefined,
  fieldValues: Record<string, any>,
): string {
  if (value === "أخرى" || value === "other") {
    const directOther = fieldValues[`${fieldKey}_other`];
    const payerOther = fieldKey.endsWith("_payer")
      ? fieldValues[`${fieldKey.slice(0, -"_payer".length)}_other`]
      : undefined;
    const other = directOther !== undefined && directOther !== null && String(directOther).trim() !== "" ? directOther : payerOther;
    if (other !== undefined && other !== null && String(other).trim() !== "") return String(other).trim();
  }
  const option = field?.options?.find((item) => String(item.value) === String(value));
  if (option) return option.labelAr;
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return value.toLocaleString("ar-EG");
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const row = item as Record<string, unknown>;
        const columns: NonNullable<WizardFieldDefinition["columns"]> = field?.columns ?? Object.keys(row).map((key) => ({ key, labelAr: key, type: "text" as const }));
        return columns.map((column) => {
          const raw = row[column.key];
          if (raw === undefined || raw === null || raw === "") return "";
          // A repeater's `other` choice is represented by its free-text details;
          // print the actual agreed value once rather than the internal enum.
          if (column.key === "details" && String(row.method ?? "") === "other") return "";
          if ((raw === "other" || raw === "أخرى") && row.details !== undefined && row.details !== null && String(row.details).trim() !== "") {
            return String(row.details).trim();
          }
          const columnOption = column.options?.find((option) => String(option.value) === String(raw));
          if (columnOption) return columnOption.labelAr;
          if (typeof raw === "boolean") return raw ? "نعم" : "لا";
          const text = String(raw).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
          return text;
        }).filter(Boolean).join(" — ");
      }
      const option = field?.options?.find((candidate) => String(candidate.value) === String(item));
      return option?.labelAr ?? String(item ?? "");
    }).filter(Boolean).join("، ");
  }
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
  return text;
}


/**
 * Dependency graph for values that are rendered through a derived legal variable.
 *
 * Keep this map beside `derivedClauseVariable`: it is used by the variable-coverage
 * audit to prove that every legally meaningful wizard input reaches the legal text.
 * A new wizard field is intentionally considered uncovered until it is wired here
 * (or used directly in a clause / explicitly bound to a non-clause document section).
 */
export const derivedClauseVariableDependencies: Record<string, readonly string[]> = {
  social_client_party_definition: [
    "social_client_party_type", "social_client_name", "social_client_nationality",
    "social_client_identity_document_type", "social_client_national_id", "social_client_id_issuer",
    "social_client_id_issue_date", "social_client_address", "social_client_phone", "social_client_email",
    "social_client_company_name", "social_client_company_legal_form", "social_client_commercial_register",
    "social_client_tax_number", "social_client_legal_representative", "social_client_representative_capacity",
    "social_client_authority_basis", "social_client_power_of_attorney_number", "social_client_power_of_attorney_year",
    "social_client_power_of_attorney_office", "social_client_company_address", "social_client_company_phone",
    "social_client_company_email",
  ],
  social_provider_party_definition: [
    "social_provider_party_type", "social_provider_name", "social_provider_nationality",
    "social_provider_identity_document_type", "social_provider_national_id", "social_provider_id_issuer",
    "social_provider_id_issue_date", "social_provider_address", "social_provider_phone", "social_provider_email",
    "social_provider_company_name", "social_provider_company_legal_form", "social_provider_commercial_register",
    "social_provider_tax_number", "social_provider_legal_representative", "social_provider_representative_capacity",
    "social_provider_authority_basis", "social_provider_power_of_attorney_number", "social_provider_power_of_attorney_year",
    "social_provider_power_of_attorney_office", "social_provider_company_address", "social_provider_company_phone",
    "social_provider_company_email",
  ],
  social_activity_definition: ["social_project_name", "social_brand_name", "social_business_nature", "social_target_market", "social_target_audience", "social_project_brief"],
  social_accounts_text: ["social_accounts"],
  social_responsible_people_text: [
    "social_project_manager_custom", "social_project_manager", "social_approval_person_custom", "social_approval_person",
    "social_billing_contact_custom", "social_billing_contact", "social_client_party_type", "social_client_name",
    "social_client_company_name", "social_client_legal_representative",
  ],
  social_scope_services_text: [
    "social_service_account_management", "social_service_strategy", "social_service_copywriting", "social_service_design",
    "social_service_content_production", "social_service_publishing", "social_service_paid_ads", "social_service_reports",
    "social_service_community_management", "social_service_coordination", "social_service_photography", "social_service_influencers",
    "social_service_other_enabled", "social_service_other",
  ],
  social_excluded_services_text: [
    "social_service_account_management", "social_service_strategy", "social_service_copywriting", "social_service_design",
    "social_service_content_production", "social_service_publishing", "social_service_paid_ads", "social_service_reports",
    "social_service_community_management", "social_service_coordination", "social_service_photography", "social_service_influencers",
    "social_service_other_enabled", "social_service_other",
  ],
  social_content_plan_text: ["social_content_plan", "social_content_scope_notes"],
  social_ads_terms_text: [
    "social_service_paid_ads", "social_ad_budget_mode", "social_ad_budget_amount", "social_ad_budget_period",
    "social_ad_budget_period_other", "social_ad_budget_payer", "social_ad_budget_included_in_fee", "social_ad_payment_management",
  ],
  social_reports_kpi_text: ["social_service_reports", "social_report_frequency", "social_report_frequency_other", "social_kpi_enabled", "social_kpi_effect", "social_kpis"],
  social_contract_duration_text: ["social_contract_duration_value", "social_contract_duration_unit"],
  social_service_start_text: ["social_service_start_date"],
  social_fee_nature_text: ["social_fee_nature", "social_fee_periodicity", "social_fee_periodicity_other"],
  social_fee_words: ["social_fee"],
  social_payment_schedule_text: ["social_fee_nature", "social_payment_mode", "social_single_payment_due", "social_payment_schedule", "social_periodic_due"],
  social_payment_method_text: ["social_payment_method", "social_payment_method_other"],
  social_review_rounds_text: ["social_review_rounds"],
  social_source_files_text: ["social_source_files_included", "social_source_file_types", "social_source_files_price_mode", "social_source_files_additional_fee"],
  social_portfolio_permission_text: ["social_portfolio_permission"],
  social_ai_permission_text: ["social_ai_external_data_permission"],
  social_email_notices_text: [
    "social_email_notices_enabled", "social_notice_use_party_emails", "social_notice_client_email", "social_notice_provider_email",
    "social_client_party_type", "social_client_email", "social_client_company_email", "social_provider_party_type", "social_provider_email", "social_provider_company_email",
  ],
  social_messaging_notices_text: [
    "social_messaging_apps_enabled", "social_messaging_apps", "social_messaging_apps_other", "social_messaging_use_party_phones",
    "social_messaging_client_number", "social_messaging_provider_number", "social_client_party_type", "social_client_phone",
    "social_client_company_phone", "social_provider_party_type", "social_provider_phone", "social_provider_company_phone",
  ],
  social_competent_court_text: ["social_competent_court", "social_competent_court_other"],
  social_contract_copies_text: ["social_contract_copies"],
  social_legal_fees_text: ["social_legal_fees_enabled"],
  visual_client_party_definition: [
    "visual_client_party_type", "visual_client_name", "visual_client_nationality",
    "visual_client_identity_document_type", "visual_client_national_id", "visual_client_id_issuer",
    "visual_client_id_issue_date", "visual_client_address", "visual_client_phone", "visual_client_email",
    "visual_client_company_name", "visual_client_company_legal_form", "visual_client_commercial_register",
    "visual_client_tax_number", "visual_client_legal_representative", "visual_client_representative_capacity",
    "visual_client_authority_basis", "visual_client_power_of_attorney_number", "visual_client_power_of_attorney_year",
    "visual_client_power_of_attorney_office", "visual_client_company_address", "visual_client_company_phone",
    "visual_client_company_email",
  ],
  visual_provider_party_definition: [
    "visual_provider_party_type", "visual_provider_name", "visual_provider_nationality",
    "visual_provider_identity_document_type", "visual_provider_national_id", "visual_provider_id_issuer",
    "visual_provider_id_issue_date", "visual_provider_address", "visual_provider_phone", "visual_provider_email",
    "visual_provider_company_name", "visual_provider_company_legal_form", "visual_provider_commercial_register",
    "visual_provider_tax_number", "visual_provider_legal_representative", "visual_provider_representative_capacity",
    "visual_provider_authority_basis", "visual_provider_power_of_attorney_number", "visual_provider_power_of_attorney_year",
    "visual_provider_power_of_attorney_office", "visual_provider_company_address", "visual_provider_company_phone",
    "visual_provider_company_email",
  ],
  visual_contract_value_words: ["visual_contract_value"],
  visual_project_definition: ["visual_project_name", "visual_project_brief", "visual_project_purpose"],
  visual_scope_services_text: ["visual_main_scope_services"],
  visual_source_files_text: ["visual_output_formats", "visual_source_files_included", "visual_source_file_types", "visual_source_files_price_mode", "visual_source_files_additional_fee"],
  visual_execution_duration_text: ["visual_execution_duration_value", "visual_execution_duration_unit"],
  visual_execution_start_text: ["visual_execution_start_rule", "visual_execution_start_date"],
  visual_payment_schedule_text: ["visual_payment_mode", "visual_single_payment_due", "visual_main_payment_schedule"],
  visual_ip_rights_text: ["visual_ip_rights_mode", "visual_ip_specific_rights", "visual_ip_license_scope"],
  visual_portfolio_permission_text: ["visual_portfolio_permission"],
  visual_email_notices_text: [
    "visual_email_notices_enabled", "visual_notice_use_party_emails", "visual_notice_client_email", "visual_notice_provider_email",
    "visual_client_party_type", "visual_client_email", "visual_client_company_email",
    "visual_provider_party_type", "visual_provider_email", "visual_provider_company_email",
  ],
  visual_messaging_notices_text: [
    "visual_messaging_apps_enabled", "visual_messaging_apps", "visual_messaging_use_party_phones",
    "visual_messaging_client_number", "visual_messaging_provider_number", "visual_client_party_type",
    "visual_client_phone", "visual_client_company_phone", "visual_provider_party_type", "visual_provider_phone", "visual_provider_company_phone",
  ],
  visual_competent_court_text: ["visual_competent_court", "visual_competent_court_other"],
  website_client_party_definition: [
    "website_client_party_type", "website_client_name", "website_client_nationality",
    "website_client_identity_document_type", "website_client_national_id", "website_client_id_issuer",
    "website_client_id_issue_date", "website_client_address", "website_client_phone", "website_client_email",
    "website_client_company_name", "website_client_company_legal_form", "website_client_commercial_register",
    "website_client_tax_number", "website_client_legal_representative", "website_client_representative_capacity",
    "website_client_company_address", "website_client_company_phone", "website_client_company_email",
  ],
  website_provider_party_definition: [
    "website_provider_party_type", "website_provider_name", "website_provider_nationality",
    "website_provider_identity_document_type", "website_provider_national_id", "website_provider_id_issuer",
    "website_provider_id_issue_date", "website_provider_address", "website_provider_phone", "website_provider_email",
    "website_provider_company_name", "website_provider_company_legal_form", "website_provider_commercial_register",
    "website_provider_tax_number", "website_provider_legal_representative", "website_provider_representative_capacity",
    "website_provider_authority_basis", "website_provider_power_of_attorney_number", "website_provider_power_of_attorney_year",
    "website_provider_power_of_attorney_office", "website_provider_company_address", "website_provider_company_phone",
    "website_provider_company_email",
  ],
  website_total_price_words: ["website_total_price"],
  website_project_definition: [
    "website_project_name", "website_project_type", "website_project_type_other", "website_contact_email",
    "website_project_manager", "website_approval_person", "website_billing_contact",
    "website_client_name", "website_client_company_name", "website_client_legal_representative",
  ],
  website_project_type_text: ["website_project_type", "website_project_type_other"],
  website_execution_duration_text: ["website_execution_duration_value", "website_execution_duration_unit"],
  website_execution_start_text: ["website_execution_start_rule", "website_execution_start_date"],
  website_duration_basis_text: ["website_duration_basis"],
  website_warranty_duration_text: ["website_warranty_duration_value", "website_warranty_duration_unit"],
  website_contract_copies_text: ["website_contract_copies"],
  website_confidentiality_duration_text: ["website_confidentiality_years"],
  website_non_solicitation_duration_text: ["website_non_solicitation_months"],
  website_approval_authority_text: [
    "website_approval_person", "website_client_name", "website_client_company_name", "website_client_legal_representative",
  ],
  website_payment_schedule_text: ["website_payment_mode", "website_single_payment_due", "website_payment_schedule"],
  website_restart_fee_text: ["website_restart_fee_enabled", "website_restart_fee_amount"],
  website_portfolio_permission_text: ["website_portfolio_permission"],
  website_external_services_text: ["website_external_services_enabled", "website_external_services"],
  website_email_notices_text: [
    "website_email_notices_enabled", "website_notice_use_party_emails", "website_notice_client_email",
    "website_notice_provider_email", "website_client_party_type", "website_client_email", "website_client_company_email",
    "website_provider_party_type", "website_provider_email", "website_provider_company_email",
  ],
  website_messaging_notices_text: [
    "website_messaging_apps_enabled", "website_messaging_apps", "website_messaging_use_party_phones",
    "website_messaging_client_number", "website_messaging_provider_number", "website_client_party_type",
    "website_client_phone", "website_client_company_phone", "website_provider_party_type", "website_provider_phone",
    "website_provider_company_phone",
  ],
  website_project_platform_text: ["website_project_platform_enabled", "website_project_platform_name", "website_project_platform_link"],
  website_competent_court_text: ["website_competent_court", "website_competent_court_other"],
  website_legal_fees_text: ["website_legal_fees_enabled", "website_legal_fees_payer", "website_legal_fees_other"],
  rental_landlord_party_definition: [
    "landlord_party_type", "landlord_name", "landlord_nationality", "landlord_identity_document_type", "landlord_national_id",
    "landlord_id_issuer", "landlord_id_issue_date", "landlord_address", "landlord_phone", "landlord_email",
    "landlord_company_name", "landlord_company_legal_form", "landlord_commercial_register", "landlord_tax_card",
    "landlord_legal_representative", "landlord_representative_capacity", "landlord_company_address", "landlord_company_phone", "landlord_company_email",
  ],
  rental_tenant_party_definition: [
    "tenant_party_type", "tenant_name", "tenant_nationality", "tenant_identity_document_type", "tenant_national_id",
    "tenant_id_issuer", "tenant_id_issue_date", "tenant_address", "tenant_phone", "tenant_email",
    "tenant_company_name", "tenant_company_legal_form", "tenant_commercial_register", "tenant_tax_card",
    "tenant_legal_representative", "tenant_representative_capacity", "tenant_company_address", "tenant_company_phone", "tenant_company_email",
  ],
  lease_duration_text: ["lease_duration_value", "lease_duration_unit"],
  deposit_amount_words: ["deposit_amount"],
  rent_amount_words: ["rent_amount"],
  rental_deposit_receipt_text: ["deposit_payment_status", "deposit_due_date"],
  rental_payment_method_text: ["rental_payment_method", "rental_payment_method_other"],
  rental_property_jurisdiction_text: ["property_governorate", "property_city"],
  rental_meter_details_text: [
    "electricity_meter_exists", "electricity_meter", "electricity_meter_type", "electricity_meter_reading",
    "water_meter_exists", "water_meter", "water_meter_type", "water_meter_reading",
    "gas_meter_exists", "gas_meter", "gas_meter_type", "gas_meter_reading",
  ],
  rental_email_notices_text: [
    "rental_email_notices_enabled", "rental_notice_use_party_emails", "rental_notice_landlord_email", "rental_notice_tenant_email",
    "landlord_party_type", "landlord_email", "landlord_company_email", "tenant_party_type", "tenant_email", "tenant_company_email",
  ],
  rental_messaging_notices_text: [
    "rental_messaging_enabled", "rental_messaging_channel", "rental_messaging_channel_other", "rental_messaging_use_party_phones",
    "rental_messaging_landlord_phone", "rental_messaging_tenant_phone", "landlord_party_type", "landlord_phone", "landlord_company_phone",
    "tenant_party_type", "tenant_phone", "tenant_company_phone",
  ],
  residential_pets_text: ["residential_pets_allowed"],
  rental_property_additional_details: [
    "building_number",
    "electricity_meter_exists", "electricity_meter", "electricity_meter_type", "electricity_meter_reading",
    "water_meter_exists", "water_meter", "water_meter_type", "water_meter_reading",
    "gas_meter_exists", "gas_meter", "gas_meter_type", "gas_meter_reading",
    "residential_compound_name", "residential_plot_number", "residential_adjacency_number", "residential_building_name",
    "residential_includes_garage", "residential_includes_storage", "residential_includes_garden", "residential_includes_roof",
    "residential_includes_service_room", "residential_includes_parking", "residential_other_annex_enabled", "residential_other_annex", "residential_management_rules_applicable",
    "commercial_project_name", "commercial_license_number", "commercial_plot_number", "commercial_site_type", "commercial_site_type_other",
    "commercial_has_mezzanine", "commercial_frontage_width", "commercial_frontage_count", "commercial_has_storage", "commercial_has_loading_area",
    "commercial_includes_garage", "commercial_front_yard", "commercial_back_yard", "commercial_service_room", "commercial_toilet",
    "commercial_other_annex_enabled", "commercial_other_annex", "commercial_finishing_level", "commercial_finishing_other",
    "administrative_project_name", "administrative_license_number", "administrative_plot_number", "administrative_site_type", "administrative_site_type_other",
    "administrative_meeting_room", "administrative_reception", "administrative_storage", "administrative_lift", "administrative_parking_count",
    "administrative_server_room", "administrative_ac_system", "administrative_data_network", "administrative_delivery_condition",
  ],
  commercial_guarantee_value_text: ["commercial_guarantee_value_mode", "commercial_guarantee_each_amount", "commercial_guarantee_total_amount"],
  administrative_guarantee_value_text: ["administrative_guarantee_value_mode", "administrative_guarantee_each_amount", "administrative_guarantee_total_amount"],
  sale_seller_party_definition: [
    "seller_party_type", "seller_name", "seller_nationality", "seller_identity_document_type", "seller_national_id",
    "seller_id_issuer", "seller_id_issue_date", "seller_address", "seller_phone", "seller_email",
    "seller_company_name", "seller_company_legal_form", "seller_commercial_register", "seller_tax_card",
    "seller_legal_representative", "seller_representative_capacity", "seller_company_address", "seller_company_email",
  ],
  sale_buyer_party_definition: [
    "buyer_party_type", "buyer_name", "buyer_nationality", "buyer_identity_document_type", "buyer_national_id",
    "buyer_id_issuer", "buyer_id_issue_date", "buyer_address", "buyer_phone", "buyer_email",
    "buyer_company_name", "buyer_company_legal_form", "buyer_commercial_register", "buyer_tax_card",
    "buyer_legal_representative", "buyer_representative_capacity", "buyer_company_address", "buyer_company_email",
  ],
  sale_property_additional_details: [
    "sale_compound_name", "sale_plot_number", "sale_adjacency_number", "sale_building_number", "sale_building_name",
    "sale_electricity_meter_exists", "sale_electricity_meter", "sale_electricity_meter_type", "sale_electricity_meter_reading",
    "sale_water_meter_exists", "sale_water_meter", "sale_water_meter_type", "sale_water_meter_reading",
    "sale_gas_meter_exists", "sale_gas_meter", "sale_gas_meter_type", "sale_gas_meter_reading",
  ],
  sale_total_price_words: ["sale_total_price"],
  sale_remaining_amount: ["sale_total_price", "sale_down_payment"],
  sale_installment_schedule_text: ["sale_installment_schedule_rows"],
  sale_delivery_rule_text: ["sale_payment_plan"],
  sale_inspection_ack_text: ["sale_inspection_acknowledged"],
  sale_occupancy_status_text: ["sale_unit_is_occupied", "sale_occupancy_details"],
  sale_property_jurisdiction_text: ["sale_unit_governorate", "sale_unit_city"],
  sale_email_notices_text: [
    "sale_email_notices_enabled", "sale_notice_use_party_emails", "sale_notice_seller_email", "sale_notice_buyer_email",
    "seller_party_type", "seller_email", "seller_company_email", "buyer_party_type", "buyer_email", "buyer_company_email",
  ],
  sale_messaging_notices_text: [
    "sale_messaging_enabled", "sale_notice_use_party_phones", "sale_notice_seller_phone", "sale_notice_buyer_phone",
    "seller_phone", "buyer_phone",
  ],
  preliminary_disposition_tax_payer_text: ["preliminary_disposition_tax_payer"],
  registrable_disposition_tax_payer_text: ["registrable_disposition_tax_payer"],
  inherited_disposition_tax_payer_text: ["inherited_disposition_tax_payer"],
  preliminary_garage_scope_text: ["preliminary_garage_status"],
  preliminary_reconciliation_legal_text: [
    "preliminary_reconciliation_status", "preliminary_reconciliation_request_number", "preliminary_reconciliation_request_year",
    "preliminary_reconciliation_responsible_party",
  ],
  inheritance_heirs_capacity_text: ["inheritance_no_minors_ack"],
  registrable_negative_certificate_text: ["registrable_negative_certificate_enabled"],
  inherited_contractual_penalty_text: [
    "inherited_contractual_penalty_enabled", "inherited_contractual_penalty_amount", "inherited_contractual_penalty_trigger",
  ],
  preliminary_ownership_detail: [
    "preliminary_ownership_source", "preliminary_contract_date", "custom_contract_date", "ownership_judgment_number",
    "ownership_judgment_year", "ownership_allocation_authority",
  ],
  registrable_ownership_detail: [
    "registered_title_type", "registered_deed_number", "registered_deed_year", "registry_office", "registered_judgment_number",
    "registered_judgment_year", "registered_judgment_court", "registered_allocation_authority", "registered_other_title",
  ],
  inheritance_disposition_detail: [
    "inheritance_disposition_basis", "inheritance_poa_number", "inheritance_poa_year", "inheritance_poa_office", "inheritance_poa_date",
    "inheritance_partition_date", "inheritance_relinquishment_date", "inheritance_heirs_sale_date", "inheritance_other_basis",
    "deceased_owner_name", "inheritance_declaration_number", "inheritance_declaration_court", "inheritance_declaration_date",
  ],
};

function derivedClauseVariable(fieldKey: string, fieldValues: Record<string, any>): string | undefined {
  const valueText = (key: string): string | undefined => {
    const value = fieldValues[key];
    if (value === undefined || value === null || String(value).trim() === "") return undefined;
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
    return text;
  };


  if (fieldKey === "social_client_party_definition" || fieldKey === "social_provider_party_definition") {
    const prefix = fieldKey.startsWith("social_client_") ? "social_client" : "social_provider";
    const role = prefix === "social_client" ? "الطرف الأول (العميل)" : "الطرف الثاني (مقدم الخدمة)";
    const type = valueText(`${prefix}_party_type`);
    if (type === "company") {
      const company = valueText(`${prefix}_company_name`);
      const legalForm = valueText(`${prefix}_company_legal_form`);
      const register = valueText(`${prefix}_commercial_register`);
      const tax = valueText(`${prefix}_tax_number`);
      const rep = valueText(`${prefix}_legal_representative`);
      const capacity = valueText(`${prefix}_representative_capacity`);
      const address = valueText(`${prefix}_company_address`);
      const basis = valueText(`${prefix}_authority_basis`);
      if (!company || !legalForm || !register || !tax || !rep || !capacity || !address || !basis) return undefined;
      let authority = basis === "commercial_register" ? "، بموجب الصفة الثابتة بالسجل التجاري" : "";
      if (basis === "power_of_attorney") {
        const no = valueText(`${prefix}_power_of_attorney_number`); const year = valueText(`${prefix}_power_of_attorney_year`); const office = valueText(`${prefix}_power_of_attorney_office`);
        if (!no || !year || !office) return undefined;
        authority = `، بموجب توكيل رقم ${no} لسنة ${year} موثق لدى ${office}`;
      }
      const phone = valueText(`${prefix}_company_phone`); const email = valueText(`${prefix}_company_email`);
      return `شركة/منشأة «${company}»، شكلها القانوني ${legalForm}، سجل تجاري رقم ${register}، والرقم الضريبي الموحد ${tax}، ومقرها ${address}، ويمثلها قانونًا السيد/ ${rep} بصفته ${capacity}${authority}${phone ? `، ورقم الهاتف ${phone}` : ""}${email ? `، والبريد الإلكتروني ${email}` : ""}، ويشار إليها في هذا العقد بـ «${role}».`;
    }
    const name = valueText(`${prefix}_name`); const nationality = valueText(`${prefix}_nationality`); const identityType = valueText(`${prefix}_identity_document_type`); const identity = valueText(`${prefix}_national_id`); const address = valueText(`${prefix}_address`); const phone = valueText(`${prefix}_phone`);
    if (!name || !nationality || !identityType || !identity || !address || !phone) return undefined;
    const identityLabel = identityType === "passport" ? "رقم جواز السفر" : "الرقم القومي";
    const issuer = valueText(`${prefix}_id_issuer`); const issueDate = valueText(`${prefix}_id_issue_date`); const email = valueText(`${prefix}_email`);
    const issueText = issuer || issueDate ? `، ${issuer ? `صادر من ${issuer}` : ""}${issuer && issueDate ? " " : ""}${issueDate ? `بتاريخ ${issueDate}` : ""}` : "";
    return `السيد/ ${name}، ${nationality} الجنسية، يحمل ${identityLabel} رقم ${identity}${issueText}، وعنوانه ${address}، ورقم هاتفه ${phone}${email ? `، وبريده الإلكتروني ${email}` : ""}، ويشار إليه في هذا العقد بـ «${role}».`;
  }

  if (fieldKey === "social_activity_definition") {
    const name = valueText("social_project_name"); const nature = valueText("social_business_nature"); const market = valueText("social_target_market"); const audience = valueText("social_target_audience");
    if (!name || !nature || !market || !audience) return undefined;
    const brand = valueText("social_brand_name"); const brief = valueText("social_project_brief");
    return `النشاط/المشروع محل الخدمة هو «${name}»${brand ? `، والعلامة التجارية «${brand}»` : ""}، وطبيعة النشاط: ${nature}، والنطاق الجغرافي أو السوق المستهدف: ${market}، والفئة المستهدفة: ${audience}${brief ? `، ووصف النشاط المختصر: ${brief}` : ""}.`;
  }

  if (fieldKey === "social_accounts_text") {
    const rows = Array.isArray(fieldValues.social_accounts) ? fieldValues.social_accounts : [];
    if (!rows.length) return undefined;
    const map: Record<string,string> = { facebook:"Facebook", instagram:"Instagram", tiktok:"TikTok", x:"X", linkedin:"LinkedIn", youtube:"YouTube", snapchat:"Snapchat", threads:"Threads" };
    const parts = rows.map((row: Record<string, any>) => {
      const platformRaw = String(row.platform ?? "").trim();
      const platform = platformRaw === "other" ? String(row.platform_other ?? "").trim() : (map[platformRaw] ?? platformRaw);
      const account = String(row.account ?? "").trim();
      return platform && account ? `${platform}: ${account}` : "";
    }).filter(Boolean);
    return parts.length === rows.length ? `${parts.join("؛ ")} (إجمالي ${rows.length.toLocaleString("ar-EG")} حساب/صفحة).` : undefined;
  }

  if (fieldKey === "social_responsible_people_text") {
    const fallback = valueText("social_client_legal_representative") || valueText("social_client_name") || valueText("social_client_company_name") || "الطرف الأول";
    const project = Boolean(fieldValues.social_project_manager_custom) ? valueText("social_project_manager") : fallback;
    const approval = Boolean(fieldValues.social_approval_person_custom) ? valueText("social_approval_person") : fallback;
    const billing = Boolean(fieldValues.social_billing_contact_custom) ? valueText("social_billing_contact") : fallback;
    if (!project || !approval || !billing) return undefined;
    return `مسؤول إدارة المشروع: ${project}؛ مسؤول اعتماد المحتوى والمخرجات: ${approval}؛ مسؤول الفواتير والمدفوعات: ${billing}. وتُعد الاعتمادات الصادرة من مسؤول الاعتماد ملزمة للطرف الأول في حدود صلاحياته حتى إخطار الطرف الثاني كتابةً بتغييره.`;
  }

  const socialServiceLabels: Record<string,string> = {
    social_service_account_management: "إدارة الحسابات والصفحات",
    social_service_strategy: "إعداد أو تطوير استراتيجية وخطة المحتوى والتقويم التحريري",
    social_service_copywriting: "كتابة المحتوى",
    social_service_design: "تصميم المنشورات والمواد البصرية",
    social_service_content_production: "إنتاج أو تنسيق أو مراجعة المحتوى الرقمي",
    social_service_publishing: "جدولة ونشر المحتوى",
    social_service_paid_ads: "إدارة أو متابعة الحملات الإعلانية",
    social_service_reports: "إعداد التقارير والتحليلات ومتابعة مؤشرات الأداء",
    social_service_community_management: "الرد على الرسائل والتعليقات وإدارة المجتمع الرقمي",
    social_service_coordination: "التنسيق مع مقدمي الخدمات أو الجهات ذات الصلة",
    social_service_photography: "التصوير أو إنتاج الفيديو أو التسجيلات",
    social_service_influencers: "التنسيق أو الإدارة مع المؤثرين",
  };
  if (fieldKey === "social_scope_services_text") {
    const selected = Object.entries(socialServiceLabels).filter(([key]) => Boolean(fieldValues[key])).map(([,label]) => label);
    if (Boolean(fieldValues.social_service_other_enabled)) { const other = valueText("social_service_other"); if (other) selected.push(other); else return undefined; }
    return selected.length ? selected.join("، ") : undefined;
  }
  if (fieldKey === "social_excluded_services_text") {
    const excluded: string[] = [];
    if (!fieldValues.social_service_photography) excluded.push("التصوير وإنتاج الفيديو أو التسجيلات الصوتية أو البث المباشر");
    excluded.push("شراء الصور أو الفيديوهات أو الخطوط أو القوالب أو التراخيص أو الاشتراكات المقدمة من الغير", "إدارة المواقع الإلكترونية أو المتاجر أو التطبيقات", "تحسين محركات البحث (SEO)", "إدارة العلاقات العامة أو التواصل الإعلامي");
    if (!fieldValues.social_service_influencers) excluded.push("التعاقد مع المؤثرين أو إدارة التعاون معهم");
    if (!fieldValues.social_service_community_management) excluded.push("الرد على الرسائل أو التعليقات أو إدارة خدمة العملاء / المجتمع الرقمي");
    if (!fieldValues.social_service_paid_ads) excluded.push("إنشاء أو إدارة أو تمويل الحملات الإعلانية");
    return excluded.length ? `الخدمات غير المشمولة ما لم يعتمد الطرفان إضافتها كتابةً هي: ${excluded.join("، ")}.` : "لا توجد خدمات مستبعدة إضافية بخلاف ما يخرجه العقد صراحة من نطاق الالتزام.";
  }

  if (fieldKey === "social_content_plan_text") {
    const rows = Array.isArray(fieldValues.social_content_plan) ? fieldValues.social_content_plan : [];
    if (!rows.length) return "لا توجد كميات محتوى دورية محددة في هذا العقد.";
    const typeMap: Record<string,string> = { posts:"منشورات", stories:"Stories", reels:"Reels", videos:"فيديوهات", designs:"تصميمات", articles:"مقالات / نصوص طويلة" };
    const freqMap: Record<string,string> = { weekly:"أسبوعيًا", biweekly:"كل أسبوعين", monthly:"شهريًا", campaign:"لكل حملة", once:"مرة واحدة" };
    const parts = rows.map((row: Record<string, any>) => {
      const typeRaw=String(row.content_type??"").trim(); const type=typeRaw==="other"?String(row.content_type_other??"").trim():(typeMap[typeRaw]??typeRaw);
      const qty=Number(row.quantity??0); const fRaw=String(row.frequency??"").trim(); const freq=fRaw==="other"?String(row.frequency_other??"").trim():(freqMap[fRaw]??fRaw);
      return type && Number.isFinite(qty) && qty>0 && freq ? `${qty.toLocaleString("ar-EG")} ${type} ${freq}` : "";
    }).filter(Boolean);
    if (parts.length !== rows.length) return undefined;
    const notes=valueText("social_content_scope_notes");
    return `خطة المخرجات المتفق عليها: ${parts.join("؛ ")}${notes ? `؛ ملاحظات التنفيذ: ${notes}` : ""}.`;
  }

  if (fieldKey === "social_ads_terms_text") {
    if (!Boolean(fieldValues.social_service_paid_ads)) return "لا تشمل الخدمات إدارة أو متابعة حملات إعلانية مدفوعة، ولا تدخل أي ميزانية إعلانية ضمن المقابل المالي.";
    const mode=valueText("social_ad_budget_mode"); const payer=valueText("social_ad_budget_payer"); const included=valueText("social_ad_budget_included_in_fee"); const management=valueText("social_ad_payment_management");
    if (!mode || !payer || !included || !management) return undefined;
    const payerMap: Record<string,string>={client:"الطرف الأول (العميل)", provider:"الطرف الثاني (مقدم الخدمة)", shared:"الطرفان وفق الاتفاق المشترك"};
    let budget="تحدد ميزانية كل حملة بموافقة مستقلة قبل إطلاقها";
    if (mode==="fixed") { const amount=Number(fieldValues.social_ad_budget_amount??0); const periodRaw=valueText("social_ad_budget_period"); const periodMap:Record<string,string>={monthly:"شهريًا",weekly:"أسبوعيًا",campaign:"لكل حملة",contract:"طوال مدة العقد"}; const period=periodRaw==="other"?valueText("social_ad_budget_period_other"):(periodRaw?periodMap[periodRaw]:undefined); if(!Number.isFinite(amount)||amount<=0||!period)return undefined; budget=`ميزانية الإعلانات المحددة هي ${amount.toLocaleString("ar-EG")} جنيه مصري ${period}`; }
    const feeText=included==="yes"?"وقد اتفق الطرفان صراحةً على دخول هذه الميزانية ضمن المقابل المالي المذكور بالعقد":"ولا تدخل ميزانية الإعلانات ضمن أتعاب مقدم الخدمة أو المقابل المالي للخدمات";
    const paymentText=management==="provider_managed"?"ويتولى مقدم الخدمة إدارة وسيلة الدفع أو الميزانية نيابةً عن العميل، ويلتزم بتقديم بيان بالتسوية والمبالغ المنفقة والمتبقية عند الطلب أو انتهاء العقد":"ويتولى العميل السداد مباشرةً للمنصة أو مزود الخدمة";
    return `${budget}، ويتحملها ${payerMap[payer]??payer}. ${feeText}. ${paymentText}.`;
  }

  if (fieldKey === "social_reports_kpi_text") {
    const parts:string[]=[];
    if (Boolean(fieldValues.social_service_reports)) { const raw=valueText("social_report_frequency"); const map:Record<string,string>={weekly:"أسبوعيًا",biweekly:"كل أسبوعين",monthly:"شهريًا",quarterly:"ربع سنوي"}; const freq=raw==="other"?valueText("social_report_frequency_other"):(raw?map[raw]:undefined); if(!freq)return undefined; parts.push(`تقدم التقارير الدورية ${freq}`); }
    if (Boolean(fieldValues.social_kpi_enabled)) { const rows=Array.isArray(fieldValues.social_kpis)?fieldValues.social_kpis:[]; const effect=valueText("social_kpi_effect"); if(!rows.length||!effect)return undefined; const list=rows.map((r:Record<string,any>)=>{const i=String(r.indicator??"").trim(),t=String(r.target??"").trim();return i&&t?`${i}: ${t}`:""}).filter(Boolean); if(list.length!==rows.length)return undefined; parts.push(`مؤشرات الأداء المتفق عليها: ${list.join("؛ ")}. ${effect==="contractual"?"واتفق الطرفان صراحةً على اعتبار المستويات المحددة التزامًا تعاقديًا في حدود ما ورد بها، دون ضمان ما يتوقف على خوارزميات أو قرارات منصات الغير إلا بنص صريح":"وتستخدم هذه المؤشرات للقياس والمتابعة ولا تعد بذاتها ضمانًا لنتيجة أو نمو أو مبيعات أو أرباح"}`); }
    return parts.length?`${parts.join(". ")}.`:"لم يتفق الطرفان على مؤشرات أداء تعاقدية خاصة أو تقارير دورية إضافية بخلاف ما يقتضيه تنفيذ الخدمات المشمولة.";
  }

  if (fieldKey === "social_contract_duration_text") {
    const n=Number(fieldValues.social_contract_duration_value??0); const unit=valueText("social_contract_duration_unit"); if(!Number.isFinite(n)||n<=0||!unit)return undefined;
    const d=n.toLocaleString("ar-EG"); const forms:Record<string,[string,string,string,string]>={days:["يوم واحد","يومين","أيام","يومًا"],weeks:["أسبوع واحد","أسبوعين","أسابيع","أسبوعًا"],months:["شهر واحد","شهرين","أشهر","شهرًا"],years:["سنة واحدة","سنتين","سنوات","سنة"]}; const f=forms[unit]; if(!f)return undefined; if(n===1)return f[0]; if(n===2)return f[1]; if(Number.isInteger(n)&&n>=3&&n<=10)return `${d} ${f[2]}`; return `${d} ${f[3]}`;
  }
  if (fieldKey === "social_service_start_text") { const d=valueText("social_service_start_date"); return d?`تبدأ الخدمات في ${d}`:undefined; }
  if (fieldKey === "social_fee_nature_text") {
    const nature=valueText("social_fee_nature"); if(nature==="total")return "إجمالي"; if(nature==="periodic"){const raw=valueText("social_fee_periodicity");const map:Record<string,string>={weekly:"أسبوعي",monthly:"شهري",quarterly:"كل ثلاثة أشهر"};const period=raw==="other"?valueText("social_fee_periodicity_other"):(raw?map[raw]:undefined);return period?`دوري (${period})`:undefined;} return undefined;
  }
  if (fieldKey === "social_fee_words") return numberToEgyptianPoundsWords(fieldValues.social_fee) || undefined;
  if (fieldKey === "social_payment_schedule_text") {
    const nature=valueText("social_fee_nature");
    if(nature==="periodic"){const due=valueText("social_periodic_due");return due?`يستحق المقابل الدوري ${due}.`:undefined;}
    const mode=valueText("social_payment_mode"); if(mode==="single"){const due=valueText("social_single_payment_due");return due?`يسدد المقابل الإجمالي دفعة واحدة وتستحق ${due}.`:undefined;}
    if(mode==="installments"){const rows=Array.isArray(fieldValues.social_payment_schedule)?fieldValues.social_payment_schedule:[];if(!rows.length)return undefined;const parts=rows.map((r:Record<string,any>,i:number)=>{const label=String(r.payment??"").trim()||`الدفعة ${i+1}`;const amount=Number(r.amount??0);const due=String(r.due??"").trim();return Number.isFinite(amount)&&amount>0&&due?`${label}: ${amount.toLocaleString("ar-EG")} جنيه مصري، وتستحق ${due}`:""}).filter(Boolean);return parts.length===rows.length?`يسدد المقابل الإجمالي على الدفعات الآتية: ${parts.join("؛ ")}.`:undefined;} return undefined;
  }
  if (fieldKey === "social_payment_method_text") { const raw=valueText("social_payment_method");const map:Record<string,string>={bank:"التحويل البنكي إلى الحساب المعتمد للطرف الثاني",electronic:"وسيلة دفع إلكتروني / محفظة إلكترونية / Instapay معتمدة",cash:"الدفع النقدي بموجب إيصال أو مخالصة"};if(raw==="other"){const other=valueText("social_payment_method_other");return other?`وسيلة السداد المعتمدة: ${other}`:undefined;}return raw&&map[raw]?`وسيلة السداد المعتمدة: ${map[raw]}`:undefined; }
  if (fieldKey === "social_review_rounds_text") { const n=Number(fieldValues.social_review_rounds??0); return Number.isFinite(n)&&n>0?`يشمل المقابل المالي عدد ${n.toLocaleString("ar-EG")} جولات مراجعة لكل مخرج أو مرحلة بحسب طبيعتها، وما يجاوز ذلك يعد عملًا إضافيًا ما لم يتفق الطرفان كتابةً على خلاف ذلك.`:"لم يحدد الطرفان عددًا ثابتًا لجولات المراجعة؛ فتقتصر المراجعات على القدر المعقول اللازم لمطابقة المخرجات لنطاق الخدمات المعتمد دون إعادة تصميم أو تغيير جوهري في الاتجاه بعد اعتماده."; }
  if (fieldKey === "social_source_files_text") { const inc=valueText("social_source_files_included");if(inc==="no")return "لا يشمل العقد تسليم الملفات الأصلية أو المفتوحة أو القابلة للتعديل، وتبقى لدى الطرف الثاني ما لم يعتمد الطرفان كتابةً خلاف ذلك.";if(inc==="yes"){const types=valueText("social_source_file_types");const mode=valueText("social_source_files_price_mode");if(!types||!mode)return undefined;const fee=Number(fieldValues.social_source_files_additional_fee??0);const price=mode==="included"?"وهي مشمولة في المقابل المالي للعقد":Number.isFinite(fee)&&fee>0?`ويستحق عن تسليمها مقابل إضافي قدره ${fee.toLocaleString("ar-EG")} جنيه مصري`:undefined;return price?`اتفق الطرفان على تسليم الملفات الأصلية/القابلة للتعديل من الأنواع الآتية: ${types}، ${price}.`:undefined;}return undefined; }
  if (fieldKey === "social_portfolio_permission_text") { const v=valueText("social_portfolio_permission");if(v==="yes")return "وافق الطرف الأول على عرض الطرف الثاني نماذج من الأعمال النهائية المنشورة أو المعتمدة ضمن معرض أعماله (Portfolio) وأغراضه التسويقية، بشرط عدم كشف معلومات سرية أو بيانات غير منشورة أو نتائج داخلية غير معلنة.";if(v==="no")return "لا يجوز للطرف الثاني استخدام اسم الطرف الأول أو علامته أو أعماله أو حملاته أو عرض أي منها في معرض الأعمال (Portfolio) أو التسويق إلا بموافقة كتابية مستقلة لاحقة من الطرف الأول.";return undefined; }
  if (fieldKey === "social_ai_permission_text") { const v=valueText("social_ai_external_data_permission");if(v==="yes")return "وافق الطرف الأول صراحةً على جواز استخدام البيانات أو المحتوى غير المنشور في أدوات ذكاء اصطناعي خارجية عند الحاجة لتنفيذ الخدمات، بشرط الالتزام بإعدادات الحماية المتاحة وعدم تجاوز نطاق الخدمة وعدم إفشاء البيانات لغير غرض التنفيذ.";if(v==="no")return "لا يجوز رفع البيانات السرية أو المحتوى غير المنشور أو بيانات الدخول الخاصة بالطرف الأول إلى أدوات ذكاء اصطناعي خارجية تسمح باستخدام المدخلات للتدريب أو الاحتفاظ بها خارج نطاق تنفيذ الخدمة، إلا بموافقة كتابية مستقلة من الطرف الأول أو باستخدام أداة توفر ضمانات حماية مناسبة.";return undefined; }
  if (fieldKey === "social_email_notices_text") { if(!Boolean(fieldValues.social_email_notices_enabled))return "لم يعتمد الطرفان البريد الإلكتروني كوسيلة تعاقدية مستقلة للمراسلات والاعتمادات.";const reuse=Boolean(fieldValues.social_notice_use_party_emails);const partyEmail=(prefix:string)=>String(fieldValues[`${prefix}_party_type`]??"")==="company"?valueText(`${prefix}_company_email`):valueText(`${prefix}_email`);const c=reuse?partyEmail("social_client"):valueText("social_notice_client_email");const p=reuse?partyEmail("social_provider"):valueText("social_notice_provider_email");return c&&p?`اعتمد الطرفان البريد الإلكتروني للمراسلات والاعتمادات؛ بريد الطرف الأول: ${c}، وبريد الطرف الثاني: ${p}.`:undefined; }
  if (fieldKey === "social_messaging_notices_text") { if(!Boolean(fieldValues.social_messaging_apps_enabled))return "لم يعتمد الطرفان تطبيقات المراسلة الإلكترونية كوسيلة تعاقدية مستقلة للمراسلات والاعتمادات.";const raw=valueText("social_messaging_apps");const map:Record<string,string>={whatsapp:"WhatsApp",telegram:"Telegram",whatsapp_telegram:"WhatsApp وTelegram"};const apps=raw==="other"?valueText("social_messaging_apps_other"):(raw?map[raw]:undefined);const reuse=Boolean(fieldValues.social_messaging_use_party_phones);const partyPhone=(prefix:string)=>String(fieldValues[`${prefix}_party_type`]??"")==="company"?valueText(`${prefix}_company_phone`):valueText(`${prefix}_phone`);const c=reuse?partyPhone("social_client"):valueText("social_messaging_client_number");const p=reuse?partyPhone("social_provider"):valueText("social_messaging_provider_number");return apps&&c&&p?`اعتمد الطرفان ${apps} للمراسلات المتعلقة بتنفيذ الخدمات؛ رقم الطرف الأول: ${c}، ورقم الطرف الثاني: ${p}. ولا تعد تلك المراسلات بذاتها تعديلًا لنطاق الخدمات أو المقابل أو المدة إلا باعتماد صريح وفقًا للعقد.`:undefined; }
  if (fieldKey === "social_competent_court_text") { const raw=valueText("social_competent_court");if(!raw)return undefined;const court=raw==="أخرى"?valueText("social_competent_court_other"):raw;if(!court)return undefined;const clean=court.trim();return clean.startsWith("محكمة")?clean:`محكمة ${clean}`; }
  if (fieldKey === "social_contract_copies_text") { const n=Number(fieldValues.social_contract_copies??0);if(!Number.isFinite(n)||n<=0)return undefined;const d=n.toLocaleString("ar-EG");if(n===1)return "نسخة واحدة";if(n===2)return "نسختين";if(Number.isInteger(n)&&n>=3&&n<=10)return `${d} نسخ`;return `${d} نسخة`; }
  if (fieldKey === "social_legal_fees_text") { return Boolean(fieldValues.social_legal_fees_enabled)?"ما لم يتفق الطرفان كتابةً على خلاف ذلك، يتحمل كل طرف الرسوم والضرائب والمصروفات القانونية التي تفرض عليه بحكم صفته أو التزاماته أو التصرفات الصادرة عنه وفقًا للقوانين واللوائح السارية. ولا يشمل المقابل المالي المتفق عليه أي ضرائب أو رسوم تستحق قانونًا على الطرف الثاني بصفته مقدم الخدمة، بما في ذلك ضريبة القيمة المضافة متى كانت واجبة التطبيق، وتضاف إلى المقابل المالي وفقًا لأحكام القانون.":""; }

  if (fieldKey === "rental_landlord_party_definition" || fieldKey === "rental_tenant_party_definition") {
    const prefix = fieldKey.startsWith("rental_landlord") ? "landlord" : "tenant";
    const role = prefix === "landlord" ? "الطرف الأول (المؤجر)" : "الطرف الثاني (المستأجر)";
    const type = valueText(`${prefix}_party_type`);
    if (type === "company") {
      const company = valueText(`${prefix}_company_name`); const legalForm = valueText(`${prefix}_company_legal_form`);
      const register = valueText(`${prefix}_commercial_register`); const tax = valueText(`${prefix}_tax_card`);
      const rep = valueText(`${prefix}_legal_representative`); const capacity = valueText(`${prefix}_representative_capacity`);
      const address = valueText(`${prefix}_company_address`); const phone = valueText(`${prefix}_company_phone`); const email = valueText(`${prefix}_company_email`);
      if (!company || !legalForm || !register || !tax || !rep || !capacity || !address) return undefined;
      return `شركة/منشأة «${company}»، شكلها القانوني ${legalForm}، سجل تجاري رقم ${register}، والبطاقة الضريبية رقم ${tax}، ومقرها ${address}، ويمثلها قانونًا السيد/ ${rep} بصفته ${capacity}${phone ? `، ورقم الهاتف ${phone}` : ""}${email ? `، والبريد الإلكتروني ${email}` : ""}، ويشار إليها في هذا العقد بـ «${role}».`;
    }
    const name = valueText(`${prefix}_name`); const nationality = valueText(`${prefix}_nationality`); const identityType = valueText(`${prefix}_identity_document_type`);
    const identity = valueText(`${prefix}_national_id`); const address = valueText(`${prefix}_address`); const phone = valueText(`${prefix}_phone`);
    if (!name || !nationality || !identityType || !identity || !address || !phone) return undefined;
    const identityLabel = identityType === "passport" ? "رقم جواز السفر" : "الرقم القومي";
    const issuer = valueText(`${prefix}_id_issuer`); const issueDate = valueText(`${prefix}_id_issue_date`); const email = valueText(`${prefix}_email`);
    const issueText = issuer || issueDate ? `، ${issuer ? `صادر من ${issuer}` : ""}${issuer && issueDate ? " " : ""}${issueDate ? `بتاريخ ${issueDate}` : ""}` : "";
    return `السيد/ ${name}، ${nationality} الجنسية، يحمل ${identityLabel} رقم ${identity}${issueText}، وعنوانه ${address}، ورقم هاتفه ${phone}${email ? `، وبريده الإلكتروني ${email}` : ""}، ويشار إليه في هذا العقد بـ «${role}».`;
  }

  if (fieldKey === "lease_duration_text") {
    const n = Number(fieldValues.lease_duration_value ?? 0); const unit = valueText("lease_duration_unit");
    if (!Number.isFinite(n) || n <= 0 || !unit) return undefined;
    const d = n.toLocaleString("ar-EG");
    if (unit === "months") { if (n === 1) return "شهر واحد"; if (n === 2) return "شهرين"; if (Number.isInteger(n) && n >= 3 && n <= 10) return `${d} أشهر`; return `${d} شهرًا`; }
    if (unit === "years") { if (n === 1) return "سنة واحدة"; if (n === 2) return "سنتين"; if (Number.isInteger(n) && n >= 3 && n <= 10) return `${d} سنوات`; return `${d} سنة`; }
    return undefined;
  }
  if (fieldKey === "deposit_amount_words") return numberToEgyptianPoundsWords(fieldValues.deposit_amount) || undefined;
  if (fieldKey === "rent_amount_words") return numberToEgyptianPoundsWords(fieldValues.rent_amount) || undefined;
  if (fieldKey === "rental_deposit_receipt_text") {
    const status = valueText("deposit_payment_status");
    if (status === "received") return "ويقر المؤجر باستلام مبلغ التأمين كاملًا عند توقيع العقد.";
    if (status === "due_later") { const due = valueText("deposit_due_date"); return due ? `ويلتزم المستأجر بسداد مبلغ التأمين للمؤجر في موعد أقصاه ${due}، ولا يعد المؤجر مستلمًا له قبل ثبوت السداد.` : undefined; }
    return undefined;
  }
  if (fieldKey === "rental_payment_method_text") {
    const raw = valueText("rental_payment_method");
    const labels: Record<string, string> = { cash_receipt: "نقدًا بموجب إيصال", bank_transfer: "تحويل بنكي", bank_deposit: "إيداع بالحساب البنكي", electronic_wallet: "محفظة إلكترونية", instapay: "إنستاباي" };
    if (raw === "other") return valueText("rental_payment_method_other");
    return raw ? labels[raw] ?? raw : undefined;
  }
  if (fieldKey === "rental_property_jurisdiction_text") {
    const governorate = valueText("property_governorate"); const city = valueText("property_city");
    return governorate && city ? `تختص محليًا المحاكم المصرية التي تقع العين المؤجرة في دائرتها، والكائنة بمدينة/مركز ${city} بمحافظة ${governorate}، مع مراعاة قواعد الاختصاص الولائي والنوعي والقيمي الآمرة.` : undefined;
  }
  if (fieldKey === "rental_email_notices_text") {
    if (!Boolean(fieldValues.rental_email_notices_enabled)) return "";
    const reuse = Boolean(fieldValues.rental_notice_use_party_emails);
    const partyEmail = (prefix: "landlord" | "tenant") => String(fieldValues[`${prefix}_party_type`] ?? "") === "company" ? valueText(`${prefix}_company_email`) : valueText(`${prefix}_email`);
    const landlord = reuse ? partyEmail("landlord") : valueText("rental_notice_landlord_email"); const tenant = reuse ? partyEmail("tenant") : valueText("rental_notice_tenant_email");
    return landlord && tenant ? `اعتمد الطرفان البريد الإلكتروني للإخطارات والمراسلات؛ بريد المؤجر: ${landlord}، وبريد المستأجر: ${tenant}.` : undefined;
  }
  if (fieldKey === "rental_messaging_notices_text") {
    if (!Boolean(fieldValues.rental_messaging_enabled)) return "";
    const raw = valueText("rental_messaging_channel"); const channel = raw === "أخرى" ? valueText("rental_messaging_channel_other") : raw;
    const reuse = Boolean(fieldValues.rental_messaging_use_party_phones);
    const partyPhone = (prefix: "landlord" | "tenant") => String(fieldValues[`${prefix}_party_type`] ?? "") === "company" ? valueText(`${prefix}_company_phone`) : valueText(`${prefix}_phone`);
    const landlord = reuse ? partyPhone("landlord") : valueText("rental_messaging_landlord_phone"); const tenant = reuse ? partyPhone("tenant") : valueText("rental_messaging_tenant_phone");
    return channel && landlord && tenant ? `اعتمد الطرفان ${channel} للمراسلات المتعلقة بتنفيذ العقد؛ رقم المؤجر: ${landlord}، ورقم المستأجر: ${tenant}. وتكون المراسلات قابلة للاحتجاج بها متى أمكن التحقق من صدورها وسلامة محتواها، دون أن تعد بذاتها تعديلًا للعقد إلا باعتماد صريح.` : undefined;
  }
  if (fieldKey === "rental_meter_details_text") {
    const lines: string[] = [];
    const meterType = (value?: string) => value === "independent" ? "مستقل" : value === "shared" ? "مشترك" : value;
    for (const [prefix, label] of [["electricity", "الكهرباء"], ["water", "المياه"], ["gas", "الغاز الطبيعي"]] as const) {
      const exists = valueText(`${prefix}_meter_exists`);
      if (exists === "no") { lines.push(`عداد ${label}: لا يوجد`); continue; }
      if (exists !== "yes") continue;
      const number = valueText(`${prefix}_meter`);
      const type = meterType(valueText(`${prefix}_meter_type`));
      const reading = valueText(`${prefix}_meter_reading`);
      const parts = [number ? `رقم ${number}` : undefined, type ? `نوعه ${type}` : undefined, reading ? `قراءته عند التسليم ${reading}` : undefined].filter(Boolean);
      lines.push(`عداد ${label}: ${parts.length ? parts.join(" — ") : "موجود"}`);
    }
    return lines.length ? lines.join("؛ ") : "لا توجد عدادات مثبتة ضمن بيانات العقد وقت إبرامه";
  }
  if (fieldKey === "residential_pets_text") {
    const value = valueText("residential_pets_allowed");
    if (value === "yes") return "اتفق الطرفان على السماح بتربية الحيوانات الأليفة داخل العين، بشرط الالتزام بالقوانين ولوائح العقار أو الكمبوند وعدم إحداث ضرر أو إزعاج، ويتحمل المستأجر مسؤولية ما ينشأ عنها من أضرار أو مطالبات.";
    if (value === "no") return "اتفق الطرفان على عدم السماح بتربية أو إيواء الحيوانات أو الطيور داخل العين المؤجرة إلا بموافقة كتابية لاحقة من المؤجر.";
    return undefined;
  }

  if (fieldKey === "rental_property_additional_details") {
    const parts: string[] = [];
    const add = (label: string, key: string) => { const value = valueText(key); if (value) parts.push(`${label}: ${value}`); };
    const addYesNo = (label: string, key: string) => { const value = valueText(key); if (value) parts.push(`${label}: ${value === "yes" ? "نعم" : value === "no" ? "لا" : value}`); };
    const meterType = (value?: string) => value === "independent" ? "مستقل" : value === "shared" ? "مشترك" : value;

    add("رقم العقار/المبنى", "building_number");
    for (const [prefix, label] of [["electricity", "الكهرباء"], ["water", "المياه"], ["gas", "الغاز الطبيعي"]] as const) {
      const exists = valueText(`${prefix}_meter_exists`);
      if (exists === "no") { parts.push(`عداد ${label}: لا يوجد`); continue; }
      if (exists !== "yes") continue;
      const number = valueText(`${prefix}_meter`); const type = meterType(valueText(`${prefix}_meter_type`)); const reading = valueText(`${prefix}_meter_reading`);
      if (number || type) parts.push(`عداد ${label}: ${number ? `رقم ${number}` : ""}${number && type ? " — " : ""}${type ? `نوعه ${type}` : ""}${reading ? ` — القراءة عند التسليم ${reading}` : ""}`);
    }
    if (fieldValues.residential_property_type !== undefined) {
      add("اسم الكمبوند", "residential_compound_name"); add("رقم القطعة", "residential_plot_number"); add("رقم المجاورة", "residential_adjacency_number"); add("اسم البرج/العمارة", "residential_building_name");
      const annexes: string[] = [];
      if (fieldValues.residential_includes_garage) annexes.push("جراج"); if (fieldValues.residential_includes_storage) annexes.push("مخزن"); if (fieldValues.residential_includes_garden) annexes.push("حديقة"); if (fieldValues.residential_includes_roof) annexes.push("سطح/رووف"); if (fieldValues.residential_includes_service_room) annexes.push("غرفة خدمات"); if (fieldValues.residential_includes_parking) annexes.push("مكان انتظار سيارة");
      const other = valueText("residential_other_annex"); if (other) annexes.push(other); if (annexes.length) parts.push(`ملحقات العين: ${annexes.join("، ")}`);
      if (Boolean(fieldValues.residential_management_rules_applicable)) parts.push("تخضع العين للوائح إدارة العقار/الكمبوند أو اتحاد الشاغلين في حدود ما لا يخالف العقد أو القانون");
    } else if (fieldValues.commercial_activity_name !== undefined) {
      add("اسم المول/المشروع التجاري", "commercial_project_name"); add("رقم الترخيص", "commercial_license_number"); add("رقم القطعة", "commercial_plot_number");
      const siteRaw = valueText("commercial_site_type"); const site = siteRaw === "أخرى" ? valueText("commercial_site_type_other") : siteRaw; if (site) parts.push(`موقع الوحدة: ${site}`);
      addYesNo("وجود ميزانين", "commercial_has_mezzanine"); add("عرض الواجهة بالمتر", "commercial_frontage_width"); add("عدد الواجهات", "commercial_frontage_count"); addYesNo("مخزن تابع", "commercial_has_storage"); addYesNo("مكان تحميل وتنزيل", "commercial_has_loading_area");
      const annexes: string[] = []; if (valueText("commercial_has_storage") === "yes") annexes.push("مخزن"); if (valueText("commercial_has_loading_area") === "yes") annexes.push("مكان تحميل وتنزيل"); if (valueText("commercial_includes_garage") === "yes") annexes.push("جراج"); if (valueText("commercial_front_yard") === "yes") annexes.push("ساحة أمامية"); if (valueText("commercial_back_yard") === "yes") annexes.push("ساحة خلفية"); if (valueText("commercial_service_room") === "yes") annexes.push("غرفة خدمات"); if (valueText("commercial_toilet") === "yes") annexes.push("دورة مياه"); const commercialOther = valueText("commercial_other_annex"); if (commercialOther) annexes.push(commercialOther); if (annexes.length) parts.push(`ملحقات الوحدة التجارية: ${annexes.join("، ")}`);
      if (String(fieldValues.commercial_finishing_level ?? "") === "أخرى") add("وصف التشطيب", "commercial_finishing_other");
    } else if (fieldValues.administrative_activity_name !== undefined) {
      add("اسم المشروع/البرج الإداري", "administrative_project_name"); add("رقم الترخيص", "administrative_license_number"); add("رقم القطعة", "administrative_plot_number");
      const siteRaw = valueText("administrative_site_type"); const site = siteRaw === "أخرى" ? valueText("administrative_site_type_other") : siteRaw; if (site) parts.push(`موقع العين: ${site}`);
      addYesNo("قاعة اجتماعات", "administrative_meeting_room"); addYesNo("استقبال", "administrative_reception"); addYesNo("مخزن تابع", "administrative_storage"); addYesNo("مصعد", "administrative_lift"); add("عدد أماكن الانتظار", "administrative_parking_count"); addYesNo("غرفة خوادم", "administrative_server_room"); add("نظام التكييف", "administrative_ac_system"); add("شبكة البيانات", "administrative_data_network");
      const deliveryMap: Record<string, string> = { vacant: "خالية", furnished: "مؤثثة", fully_equipped: "مجهزة بالكامل", inventory_report: "وفقًا لمحضر الجرد" }; const delivery = valueText("administrative_delivery_condition"); if (delivery) parts.push(`حالة العين عند التسليم: ${deliveryMap[delivery] ?? delivery}`);
    }
    return parts.length ? `وتُستكمل بيانات وصف العين بما يلي: ${parts.join("؛ ")}.` : "ولا توجد بيانات تعريفية إضافية للعين بخلاف ما تقدم.";
  }

  if (fieldKey === "sale_property_additional_details") {
    const parts: string[] = [];
    const add = (label: string, key: string) => { const value = valueText(key); if (value) parts.push(`${label}: ${value}`); };
    add("اسم الكمبوند", "sale_compound_name"); add("رقم القطعة", "sale_plot_number"); add("رقم المجاورة", "sale_adjacency_number"); add("رقم العقار", "sale_building_number"); add("اسم البرج/العمارة", "sale_building_name");
    const meterType = (value?: string) => value === "independent" ? "مستقل" : value === "shared" ? "مشترك" : value;
    for (const [prefix, label] of [["electricity", "الكهرباء"], ["water", "المياه"], ["gas", "الغاز الطبيعي"]] as const) {
      const exists = valueText(`sale_${prefix}_meter_exists`);
      if (exists === "no") { parts.push(`عداد ${label}: لا يوجد`); continue; }
      if (exists !== "yes") continue;
      const number = valueText(`sale_${prefix}_meter`); const type = meterType(valueText(`sale_${prefix}_meter_type`)); const reading = valueText(`sale_${prefix}_meter_reading`);
      if (!number || !type) return undefined;
      parts.push(`عداد ${label}: رقم ${number} — ${type}${reading ? ` — القراءة عند التسليم ${reading}` : ""}`);
    }
    return parts.length ? `وتشمل البيانات التعريفية الإضافية للوحدة: ${parts.join("؛ ")}.` : "ولا توجد بيانات تعريفية إضافية للوحدة بخلاف ما تقدم.";
  }

  if (fieldKey === "sale_seller_party_definition" || fieldKey === "sale_buyer_party_definition") {
    const prefix = fieldKey.startsWith("sale_seller") ? "seller" : "buyer";
    const role = prefix === "seller" ? "الطرف الأول (البائع)" : "الطرف الثاني (المشتري)";
    const type = valueText(`${prefix}_party_type`);
    if (type === "company") {
      const company = valueText(`${prefix}_company_name`); const legalForm = valueText(`${prefix}_company_legal_form`);
      const register = valueText(`${prefix}_commercial_register`); const tax = valueText(`${prefix}_tax_card`);
      const rep = valueText(`${prefix}_legal_representative`); const capacity = valueText(`${prefix}_representative_capacity`);
      const address = valueText(`${prefix}_company_address`); const phone = valueText(`${prefix}_phone`); const email = valueText(`${prefix}_company_email`);
      if (!company || !legalForm || !register || !tax || !rep || !capacity || !address || !phone) return undefined;
      return `شركة/منشأة «${company}»، شكلها القانوني ${legalForm}، سجل تجاري رقم ${register}، والبطاقة الضريبية رقم ${tax}، ومقرها ${address}، ويمثلها قانونًا السيد/ ${rep} بصفته ${capacity}، ورقم الهاتف ${phone}${email ? `، والبريد الإلكتروني ${email}` : ""}، ويشار إليها في هذا العقد بـ «${role}».`;
    }
    const name = valueText(`${prefix}_name`); const nationality = valueText(`${prefix}_nationality`); const identityType = valueText(`${prefix}_identity_document_type`); const identity = valueText(`${prefix}_national_id`); const address = valueText(`${prefix}_address`); const phone = valueText(`${prefix}_phone`);
    if (!name || !nationality || !identityType || !identity || !address || !phone) return undefined;
    const identityLabel = identityType === "passport" ? "رقم جواز السفر" : "الرقم القومي";
    const issuer = valueText(`${prefix}_id_issuer`); const issueDate = valueText(`${prefix}_id_issue_date`); const email = valueText(`${prefix}_email`);
    const issueText = issuer || issueDate ? `، ${issuer ? `صادر من ${issuer}` : ""}${issuer && issueDate ? " " : ""}${issueDate ? `بتاريخ ${issueDate}` : ""}` : "";
    return `السيد/ ${name}، ${nationality} الجنسية، يحمل ${identityLabel} رقم ${identity}${issueText}، وعنوانه ${address}، ورقم هاتفه ${phone}${email ? `، وبريده الإلكتروني ${email}` : ""}، ويشار إليه في هذا العقد بـ «${role}».`;
  }

  if (fieldKey === "sale_total_price_words") return numberToEgyptianPoundsWords(fieldValues.sale_total_price) || undefined;

  if (fieldKey === "sale_remaining_amount") {
    const total = Number(fieldValues.sale_total_price ?? 0); const down = Number(fieldValues.sale_down_payment ?? 0);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(down) || down < 0 || down > total) return undefined;
    return (total - down).toLocaleString("ar-EG");
  }

  if (fieldKey === "sale_installment_schedule_text") {
    const rows = Array.isArray(fieldValues.sale_installment_schedule_rows) ? fieldValues.sale_installment_schedule_rows : [];
    if (!rows.length) return undefined;
    const parts = rows.map((row: Record<string, any>, index: number) => {
      const no = String(row.installment_no ?? "").trim() || String(index + 1);
      const amount = Number(row.amount ?? 0); const due = String(row.due_date ?? "").trim(); const method = String(row.payment_method ?? "").trim();
      if (!Number.isFinite(amount) || amount <= 0 || !due || !method) return "";
      const dueText = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due.split("-").reverse().join("/") : due;
      return `القسط ${no}: ${amount.toLocaleString("ar-EG")} جنيه مصري، يستحق في ${dueText}، ويسدد عن طريق ${method}`;
    }).filter(Boolean);
    return parts.length === rows.length ? parts.join("؛ ") : undefined;
  }

  if (fieldKey === "sale_delivery_rule_text") {
    const mode = valueText("sale_payment_plan");
    if (mode === "full") return "يستحق تسليم الوحدة فعليًا عند توقيع العقد وبعد الوفاء بكامل الثمن، ويثبت التسليم بالتوقيع أو بمحضر استلام بحسب الأحوال";
    if (mode === "installments") return "يستحق تسليم الوحدة فعليًا بعد سداد كامل الثمن ومن تاريخ سداد آخر قسط، ويثبت التسليم بمحضر استلام أو محرر كتابي معتمد";
    return undefined;
  }

  if (fieldKey === "sale_inspection_ack_text") {
    return Boolean(fieldValues.sale_inspection_acknowledged) ? "ويقر المشتري بأنه عاين الوحدة معاينة فعلية نافية للجهالة بالقدر الممكن، واطلع على بياناتها ومستنداتها المتاحة قبل التعاقد." : undefined;
  }

  if (fieldKey === "sale_occupancy_status_text") {
    if (!Boolean(fieldValues.sale_unit_is_occupied)) return "ويقر البائع بأن الوحدة تُسلّم خالية من الشواغل والأشخاص والحقوق التي تمنع التسليم، ما لم يثبت خلاف ذلك في مستند معتمد.";
    const details = valueText("sale_occupancy_details");
    return details ? `ويقر المشتري بعلمه بأن الوحدة مؤجرة أو مشغولة بعلاقة قائمة، وبيانات الإشغال: ${details}، ويلتزم البائع بتسليم ما تحت يده من مستندات هذه العلاقة.` : undefined;
  }

  if (fieldKey === "sale_property_jurisdiction_text") {
    const governorate = valueText("sale_unit_governorate"); const city = valueText("sale_unit_city");
    if (!governorate || !city) return undefined;
    return `تختص محليًا المحكمة التي يقع في دائرتها العقار محل البيع، والكائن بمدينة/مركز ${city} بمحافظة ${governorate}، وذلك مع مراعاة قواعد الاختصاص الولائي والنوعي والقيمي الآمرة.`;
  }

  if (fieldKey === "sale_email_notices_text") {
    if (!Boolean(fieldValues.sale_email_notices_enabled)) return "لم يعتمد الطرفان البريد الإلكتروني كوسيلة مستقلة للإخطارات التعاقدية.";
    const reuse = Boolean(fieldValues.sale_notice_use_party_emails);
    const partyEmail = (prefix: "seller" | "buyer") => String(fieldValues[`${prefix}_party_type`] ?? "") === "company" ? valueText(`${prefix}_company_email`) : valueText(`${prefix}_email`);
    const seller = reuse ? partyEmail("seller") : valueText("sale_notice_seller_email"); const buyer = reuse ? partyEmail("buyer") : valueText("sale_notice_buyer_email");
    return seller && buyer ? `اعتمد الطرفان البريد الإلكتروني للمراسلات والإخطارات؛ بريد البائع: ${seller}، وبريد المشتري: ${buyer}.` : undefined;
  }

  if (fieldKey === "sale_messaging_notices_text") {
    if (!Boolean(fieldValues.sale_messaging_enabled)) return "لم يعتمد الطرفان تطبيقات المراسلة الإلكترونية كوسيلة مستقلة للإخطارات التعاقدية.";
    const reuse = Boolean(fieldValues.sale_notice_use_party_phones);
    const seller = reuse ? valueText("seller_phone") : valueText("sale_notice_seller_phone"); const buyer = reuse ? valueText("buyer_phone") : valueText("sale_notice_buyer_phone");
    return seller && buyer ? `اعتمد الطرفان رقم البائع ${seller} ورقم المشتري ${buyer} لتبادل مراسلات WhatsApp/وسائل المراسلة الإلكترونية المتعلقة بتنفيذ العقد، دون أن يعد ذلك بذاته تعديلًا للعقد إلا باعتماد صريح.` : undefined;
  }

  if (fieldKey === "preliminary_disposition_tax_payer_text" || fieldKey === "registrable_disposition_tax_payer_text" || fieldKey === "inherited_disposition_tax_payer_text") {
    const sourceKey = fieldKey.replace("_text", "");
    const value = valueText(sourceKey);
    if (value === "seller") return "الطرف الأول (البائع)";
    if (value === "buyer") return "الطرف الثاني (المشتري)";
    if (value === "shared") return "الطرفان مناصفةً فيما بينهما";
    return undefined;
  }

  if (fieldKey === "preliminary_garage_scope_text") {
    const value = valueText("preliminary_garage_status");
    if (value === "included") return "ويشمل البيع حق المشتري في مكان سيارة واحد بالجراج باعتباره حقًا تابعًا للوحدة في الحدود المتفق عليها وبما لا يخالف سند البائع أو نظام العقار.";
    if (value === "not_included") return "ولا يشمل البيع أي حصة أو حق مستقل للمشتري في جراج العقار، ويظل الجراج خارج نطاق البيع.";
    return undefined;
  }

  if (fieldKey === "preliminary_reconciliation_legal_text") {
    const status = valueText("preliminary_reconciliation_status");
    if (status === "none") return "أقر البائع، وفق المستندات المتاحة لديه حتى تاريخ التوقيع، بعدم وجود مخالفات بناء تستوجب طلب تصالح قائمًا، ويتحمل مسؤولية ما يثبت خلاف ذلك إذا كان سابقًا على البيع وأخفاه.";
    if (status === "submitted") {
      const no = valueText("preliminary_reconciliation_request_number"); const year = valueText("preliminary_reconciliation_request_year"); const responsible = valueText("preliminary_reconciliation_responsible_party");
      if (!no || !year || !responsible) return undefined;
      if (responsible === "seller") return `يوجد طلب تصالح رقم ${no} لسنة ${year}، ويلتزم البائع باستكمال إجراءاته في الحدود الواجبة عليه وتسليم المشتري ما يصدر بشأنه من مستندات أو قرارات مرتبطة بالوحدة.`;
      if (responsible === "buyer") return `يوجد طلب تصالح رقم ${no} لسنة ${year}، واتفق الطرفان على أن يستكمل المشتري إجراءاته بعد أن يقوم البائع بما يلزم قانونًا لتمكينه من ذلك أو التنازل/التفويض متى كان جائزًا، مع بقاء مسؤولية البائع عن البيانات والوقائع السابقة على البيع.`;
    }
    return undefined;
  }

  if (fieldKey === "inheritance_heirs_capacity_text") {
    return Boolean(fieldValues.inheritance_no_minors_ack) ? "ويقر البائع بأن جميع الورثة ذوي الصلة بالتصرف كاملو الأهلية، ولا توجد - بحسب المستندات المقدمة - حالة قاصر أو ناقص أهلية أو حمل مستكن أو وصاية أو قوامة تستلزم إذنًا قضائيًا خاصًا لهذا التصرف." : undefined;
  }

  if (fieldKey === "registrable_negative_certificate_text") {
    return Boolean(fieldValues.registrable_negative_certificate_enabled) ? "وقد اختار الطرفان الاعتماد على شهادة تصرفات عقارية سلبية حديثة (نموذج 19)، ويكون إصدار النسخة النهائية مشروطًا بإرفاقها ضمن المستندات المعتمدة." : "ولم يشترط الطرفان إرفاق شهادة تصرفات عقارية سلبية ضمن مستندات هذا العقد.";
  }

  if (fieldKey === "inherited_contractual_penalty_text") {
    if (!Boolean(fieldValues.inherited_contractual_penalty_enabled)) return "ولم يتفق الطرفان على شرط جزائي عام مستقل، مع بقاء الجزاءات أو التعويضات الخاصة المنصوص عليها في العقد والقانون.";
    const amount = Number(fieldValues.inherited_contractual_penalty_amount ?? 0); const trigger = valueText("inherited_contractual_penalty_trigger");
    return Number.isFinite(amount) && amount > 0 && trigger ? `واتفق الطرفان على شرط جزائي عام قدره ${amount.toLocaleString("ar-EG")} جنيه مصري، يستحق عند تحقق الحالة الآتية: ${trigger}، وذلك مع خضوعه للقواعد القانونية المنظمة للتعويض الاتفاقي.` : undefined;
  }


  if (fieldKey === "website_contract_copies_text") {
    const n = Number(fieldValues.website_contract_copies ?? 0);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    const d = n.toLocaleString("ar-EG");
    if (n === 1) return "نسخة واحدة";
    if (n === 2) return "نسختين";
    if (Number.isInteger(n) && n >= 3 && n <= 10) return `${d} نسخ`;
    return `${d} نسخة`;
  }

  if (fieldKey === "website_confidentiality_duration_text" || fieldKey === "website_non_solicitation_duration_text") {
    const key = fieldKey === "website_confidentiality_duration_text" ? "website_confidentiality_years" : "website_non_solicitation_months";
    const n = Number(fieldValues[key] ?? 0);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    const d = n.toLocaleString("ar-EG");
    const isYears = key.endsWith("years");
    if (n === 1) return isYears ? "سنة واحدة" : "شهر واحد";
    if (n === 2) return isYears ? "سنتين" : "شهرين";
    if (Number.isInteger(n) && n >= 3 && n <= 10) return `${d} ${isYears ? "سنوات" : "أشهر"}`;
    return `${d} ${isYears ? "سنة" : "شهرًا"}`;
  }

  if (fieldKey === "website_execution_duration_text" || fieldKey === "website_warranty_duration_text") {
    const prefix = fieldKey === "website_execution_duration_text" ? "website_execution_duration" : "website_warranty_duration";
    const rawValue = Number(fieldValues[`${prefix}_value`] ?? 0);
    const unit = valueText(`${prefix}_unit`);
    if (!Number.isFinite(rawValue) || rawValue <= 0 || !unit) return undefined;
    const n = rawValue;
    const display = n.toLocaleString("ar-EG");
    const unitForms: Record<string, [string, string, string, string]> = {
      "يومًا": ["يوم واحد", "يومين", "أيام", "يومًا"],
      "أسبوعًا": ["أسبوع واحد", "أسبوعين", "أسابيع", "أسبوعًا"],
      "شهرًا": ["شهر واحد", "شهرين", "أشهر", "شهرًا"],
      "سنة": ["سنة واحدة", "سنتين", "سنوات", "سنة"],
    };
    const forms = unitForms[unit];
    if (!forms) return `${display} ${unit}`;
    if (n === 1) return forms[0];
    if (n === 2) return forms[1];
    if (Number.isInteger(n) && n >= 3 && n <= 10) return `${display} ${forms[2]}`;
    return `${display} ${forms[3]}`;
  }

  if (fieldKey === "website_execution_start_text") {
    const rule = valueText("website_execution_start_rule");
    if (rule === "contract_date") return "من تاريخ إبرام هذا العقد";
    if (rule === "specific_date") {
      const date = valueText("website_execution_start_date");
      return date ? `من تاريخ ${date}` : undefined;
    }
    if (rule === "agreed_or_requirements_later") return "من التاريخ الذي يتفق عليه الطرفان أو من تاريخ استيفاء جميع متطلبات بدء التنفيذ، أيهما لاحق";
    return undefined;
  }

  if (fieldKey === "website_duration_basis_text") {
    const raw = valueText("website_duration_basis");
    if (!raw) return undefined;
    return raw === "بأيام العمل، ما لم يتفق الطرفان كتابةً على احتسابها بالأيام التقويمية"
      ? "بأيام العمل، ما لم يتفق الطرفان كتابةً على احتسابها بالأيام التقويمية"
      : raw === "بالأيام التقويمية بناءً على اتفاق الطرفين"
        ? "بالأيام التقويمية بناءً على اتفاق الطرفين"
        : raw;
  }

  if (fieldKey === "website_project_type_text") {
    const map: Record<string, string> = {
      corporate: "موقع تعريفي",
      ecommerce: "متجر إلكتروني",
      platform: "منصة إلكترونية",
      web_app: "نظام ويب (Web Application)",
      landing_page: "صفحة هبوط (Landing Page)",
    };
    const raw = valueText("website_project_type");
    if (!raw) return undefined;
    if (raw === "other") return valueText("website_project_type_other");
    return map[raw] ?? raw;
  }

  if (fieldKey === "visual_client_party_definition" || fieldKey === "visual_provider_party_definition") {
    const prefix = fieldKey.startsWith("visual_client_") ? "visual_client" : "visual_provider";
    const role = prefix === "visual_client" ? "الطرف الأول (العميل)" : "الطرف الثاني (المصمم)";
    const type = valueText(`${prefix}_party_type`);
    if (type === "company") {
      const company = valueText(`${prefix}_company_name`);
      const legalForm = valueText(`${prefix}_company_legal_form`);
      const register = valueText(`${prefix}_commercial_register`);
      const tax = valueText(`${prefix}_tax_number`);
      const rep = valueText(`${prefix}_legal_representative`);
      const capacity = valueText(`${prefix}_representative_capacity`);
      const address = valueText(`${prefix}_company_address`);
      const basis = valueText(`${prefix}_authority_basis`);
      if (!company || !legalForm || !register || !tax || !rep || !capacity || !address || !basis) return undefined;
      let authority = basis === "commercial_register" ? "، بموجب الصفة الثابتة بالسجل التجاري" : "";
      if (basis === "power_of_attorney") {
        const no = valueText(`${prefix}_power_of_attorney_number`);
        const year = valueText(`${prefix}_power_of_attorney_year`);
        const office = valueText(`${prefix}_power_of_attorney_office`);
        if (!no || !year || !office) return undefined;
        authority = `، بموجب توكيل رقم ${no} لسنة ${year} موثق لدى ${office}`;
      }
      const phone = valueText(`${prefix}_company_phone`);
      const email = valueText(`${prefix}_company_email`);
      return `شركة/منشأة «${company}»، شكلها القانوني ${legalForm}، سجل تجاري رقم ${register}، والرقم الضريبي الموحد ${tax}، ومقرها ${address}، ويمثلها قانونًا السيد/ ${rep} بصفته ${capacity}${authority}${phone ? `، ورقم الهاتف ${phone}` : ""}${email ? `، والبريد الإلكتروني ${email}` : ""}، ويشار إليها في هذا العقد بـ «${role}».`;
    }
    const name = valueText(`${prefix}_name`);
    const nationality = valueText(`${prefix}_nationality`);
    const identityType = valueText(`${prefix}_identity_document_type`);
    const identity = valueText(`${prefix}_national_id`);
    const address = valueText(`${prefix}_address`);
    const phone = valueText(`${prefix}_phone`);
    if (!name || !nationality || !identityType || !identity || !address || !phone) return undefined;
    const identityLabel = identityType === "passport" ? "رقم جواز السفر" : "الرقم القومي";
    const issuer = valueText(`${prefix}_id_issuer`);
    const issueDate = valueText(`${prefix}_id_issue_date`);
    const email = valueText(`${prefix}_email`);
    const issueText = issuer || issueDate ? `، ${issuer ? `صادر من ${issuer}` : ""}${issuer && issueDate ? " " : ""}${issueDate ? `بتاريخ ${issueDate}` : ""}` : "";
    return `السيد/ ${name}، ${nationality} الجنسية، يحمل ${identityLabel} رقم ${identity}${issueText}، وعنوانه ${address}، ورقم هاتفه ${phone}${email ? `، وبريده الإلكتروني ${email}` : ""}، ويشار إليه في هذا العقد بـ «${role}».`;
  }

  if (fieldKey === "visual_contract_value_words") return numberToEgyptianPoundsWords(fieldValues.visual_contract_value) || undefined;

  if (fieldKey === "visual_project_definition") {
    const name = valueText("visual_project_name");
    const purpose = valueText("visual_project_purpose");
    if (!name || !purpose) return undefined;
    const brief = valueText("visual_project_brief");
    return `المشروع/العلامة/النشاط محل هذا العقد هو «${name}»، والغرض من تصميم هويته البصرية هو: ${purpose}${brief ? `، ووصفه المختصر: ${brief}` : ""}.`;
  }

  if (fieldKey === "visual_scope_services_text") {
    const rows = Array.isArray(fieldValues.visual_main_scope_services) ? fieldValues.visual_main_scope_services : [];
    if (!rows.length) return undefined;
    const labels: Record<string, string> = { logo: "تصميم أو تطوير الشعار (Logo)", identity: "إعداد الهوية البصرية للعـلامة التجارية", colors_fonts: "اختيار الألوان والخطوط المعتمدة", visual_elements: "تصميم العناصر والأنماط البصرية", brand_guidelines: "إعداد دليل الهوية البصرية (Brand Guidelines)", print_digital: "تصميم المطبوعات أو القوالب أو الأصول الرقمية" };
    const services = rows.map((row: Record<string, any>) => {
      const key = String(row.service ?? "").trim();
      if (key === "other") return String(row.details ?? "").trim();
      return labels[key] ?? key;
    }).filter(Boolean);
    return services.length === rows.length ? `اتفق الطرفان على أن نطاق الخدمات المشمولة في هذا العقد يقتصر على: ${services.join("، ")}. ولا يُعد أي عمل آخر داخلًا في نطاق العقد إلا باتفاق مكتوب لاحق.` : undefined;
  }

  if (fieldKey === "visual_source_files_text") {
    const formats = valueText("visual_output_formats");
    const included = valueText("visual_source_files_included");
    if (!formats || !included) return undefined;
    if (included === "no") return `تُسلم المخرجات النهائية بالصيغ المتفق عليها: ${formats}. ولا يشمل هذا العقد تسليم الملفات المصدرية أو ملفات العمل الأصلية أو الملفات القابلة للتعديل.`;
    const types = valueText("visual_source_file_types");
    const priceMode = valueText("visual_source_files_price_mode");
    if (!types || !priceMode) return undefined;
    if (priceMode === "additional") {
      const fee = Number(fieldValues.visual_source_files_additional_fee ?? 0);
      if (!fee) return undefined;
      return `تُسلم المخرجات النهائية بالصيغ المتفق عليها: ${formats}، ويشمل الاتفاق كذلك تسليم الملفات المصدرية/القابلة للتعديل من نوع ${types} مقابل مبلغ إضافي قدره ${fee.toLocaleString("ar-EG")} جنيه مصري.`;
    }
    return `تُسلم المخرجات النهائية بالصيغ المتفق عليها: ${formats}، ويشمل إجمالي المقابل المالي تسليم الملفات المصدرية/القابلة للتعديل من نوع ${types} دون مقابل إضافي مستقل.`;
  }

  if (fieldKey === "visual_execution_duration_text") {
    const value = valueText("visual_execution_duration_value");
    const unit = valueText("visual_execution_duration_unit");
    return value && unit ? `${value} ${unit}` : undefined;
  }

  if (fieldKey === "visual_execution_start_text") {
    const rule = valueText("visual_execution_start_rule");
    if (rule === "contract_date") return "من تاريخ إبرام هذا العقد";
    if (rule === "specific_date") { const date = valueText("visual_execution_start_date"); return date ? `من تاريخ ${date}` : undefined; }
    if (rule === "source_rule") return "من التاريخ المتفق عليه بين الطرفين أو من تاريخ استيفاء الطرف الأول للبيانات والمواد والموافقات وسداد الدفعة المستحقة لبدء التنفيذ — إن وجدت — أيهما لاحق";
    return undefined;
  }

  if (fieldKey === "visual_payment_schedule_text") {
    const mode = valueText("visual_payment_mode");
    if (mode === "single") { const due = valueText("visual_single_payment_due"); return due ? `يُسدد المقابل المالي دفعة واحدة وتستحق ${due}.` : undefined; }
    if (mode === "installments") {
      const rows = Array.isArray(fieldValues.visual_main_payment_schedule) ? fieldValues.visual_main_payment_schedule : [];
      if (!rows.length) return undefined;
      const parts = rows.map((row: Record<string, any>, i: number) => { const label = String(row.payment ?? "").trim() || `الدفعة ${i+1}`; const amount = Number(row.amount ?? 0); const due = String(row.due ?? "").trim(); return amount && due ? `${label}: ${amount.toLocaleString("ar-EG")} جنيه مصري، وتستحق ${due}` : ""; }).filter(Boolean);
      return parts.length === rows.length ? `يُسدد المقابل المالي على الدفعات الآتية: ${parts.join("؛ ")}.` : undefined;
    }
    return undefined;
  }

  if (fieldKey === "visual_ip_rights_text") {
    const mode = valueText("visual_ip_rights_mode");
    if (mode === "full_transfer") return "بعد سداد كامل المقابل المالي، تنتقل إلى الطرف الأول كامل الحقوق المالية القابلة للنقل قانونًا على المخرجات النهائية المعتمدة والمدفوعة التي أُنتجت خصيصًا له، مع بقاء حقوق الغير والعناصر السابقة للمصمم خاضعة لأحكامها الخاصة.";
    if (mode === "specific_transfer") { const rights = valueText("visual_ip_specific_rights"); return rights ? `بعد سداد كامل المقابل المالي، تنتقل إلى الطرف الأول الحقوق الآتية فقط على المخرجات النهائية المعتمدة والمدفوعة: ${rights}. وما عدا ذلك يبقى للطرف الثاني أو لصاحبه بحسب الأحوال.` : undefined; }
    if (mode === "license_only") { const scope = valueText("visual_ip_license_scope"); return scope ? `بعد سداد كامل المقابل المالي، لا تنتقل ملكية الحقوق إلى الطرف الأول، وإنما يُمنح ترخيص استخدام/استغلال في الحدود الآتية: ${scope}.` : undefined; }
    return undefined;
  }

  if (fieldKey === "visual_portfolio_permission_text") {
    const v = valueText("visual_portfolio_permission");
    if (v === "yes") return "وافق الطرف الأول على عرض الطرف الثاني للأعمال النهائية المعتمدة ضمن معرض أعماله (Portfolio) أو ملفه المهني أو أغراضه التسويقية، بشرط عدم كشف معلومات سرية أو غير معلنة.";
    if (v === "no") return "لا يجوز للطرف الثاني عرض الأعمال أو اسم المشروع أو العلامة ضمن معرض أعماله (Portfolio) أو أغراضه التسويقية إلا بعد موافقة كتابية مستقلة لاحقة من الطرف الأول.";
    return undefined;
  }

  if (fieldKey === "visual_email_notices_text") {
    if (!Boolean(fieldValues.visual_email_notices_enabled)) return "لم يعتمد الطرفان البريد الإلكتروني كوسيلة تعاقدية مستقلة للمراسلات والاعتمادات، دون إخلال بجواز استخدامه للتواصل التشغيلي غير المنشئ لتعديل جوهري على العقد.";
    const reuse = Boolean(fieldValues.visual_notice_use_party_emails);
    const partyEmail = (prefix: string) => String(fieldValues[`${prefix}_party_type`] ?? "") === "company" ? valueText(`${prefix}_company_email`) : valueText(`${prefix}_email`);
    const client = reuse ? partyEmail("visual_client") : valueText("visual_notice_client_email");
    const provider = reuse ? partyEmail("visual_provider") : valueText("visual_notice_provider_email");
    return client && provider ? `اعتمد الطرفان البريد الإلكتروني للمراسلات والملفات والاعتمادات المتعلقة بتنفيذ العقد؛ بريد الطرف الأول: ${client}، وبريد الطرف الثاني: ${provider}.` : undefined;
  }

  if (fieldKey === "visual_messaging_notices_text") {
    if (!Boolean(fieldValues.visual_messaging_apps_enabled)) return "لم يعتمد الطرفان تطبيقات مراسلة إلكترونية كوسيلة تعاقدية للمراسلات والاعتمادات.";
    const apps = valueText("visual_messaging_apps");
    const reuse = Boolean(fieldValues.visual_messaging_use_party_phones);
    const partyPhone = (prefix: string) => String(fieldValues[`${prefix}_party_type`] ?? "") === "company" ? valueText(`${prefix}_company_phone`) : valueText(`${prefix}_phone`);
    const client = reuse ? partyPhone("visual_client") : valueText("visual_messaging_client_number");
    const provider = reuse ? partyPhone("visual_provider") : valueText("visual_messaging_provider_number");
    return apps && client && provider ? `اعتمد الطرفان تطبيق/تطبيقات ${apps} للمراسلات المتعلقة بتنفيذ الخدمات؛ رقم الطرف الأول: ${client}، ورقم الطرف الثاني: ${provider}. ولا تعد هذه المراسلات بذاتها تعديلًا لنطاق الخدمات أو المقابل أو المدة إلا باتفاق صريح وفقًا للعقد.` : undefined;
  }

  if (fieldKey === "visual_competent_court_text") {
    const raw = valueText("visual_competent_court");
    if (!raw) return undefined;
    const court = raw === "أخرى" ? valueText("visual_competent_court_other") : raw;
    if (!court) return undefined;
    const clean = court.trim();
    const normalized = clean.startsWith("محكمة") ? clean : `محكمة ${clean}`;
    return /اقتصادية|ابتدائية|استئناف|إدارية|دستورية/.test(clean) ? normalized : `${normalized} الابتدائية ودوائرها الجزئية بحسب الأحوال`;
  }

  if (fieldKey === "website_client_party_definition" || fieldKey === "website_provider_party_definition") {
    const prefix = fieldKey.startsWith("website_client_") ? "website_client" : "website_provider";
    const role = prefix === "website_client" ? "الطرف الأول (العميل)" : "الطرف الثاني (مقدم الخدمة)";
    const type = valueText(`${prefix}_party_type`);
    const optional = (label: string, key: string) => { const value = valueText(key); return value ? `، ${label} ${value}` : ""; };
    if (type === "company") {
      const company = valueText(`${prefix}_company_name`);
      const legalForm = valueText(`${prefix}_company_legal_form`);
      const register = valueText(`${prefix}_commercial_register`);
      const tax = valueText(`${prefix}_tax_number`);
      const rep = valueText(`${prefix}_legal_representative`);
      const capacity = valueText(`${prefix}_representative_capacity`);
      const address = valueText(`${prefix}_company_address`);
      if (!company || !legalForm || !register || !tax || !rep || !capacity || !address) return undefined;
      let authority = "";
      if (prefix === "website_provider") {
        const basis = valueText(`${prefix}_authority_basis`);
        if (basis === "power_of_attorney") {
          const no = valueText(`${prefix}_power_of_attorney_number`);
          const year = valueText(`${prefix}_power_of_attorney_year`);
          const office = valueText(`${prefix}_power_of_attorney_office`);
          if (no && year && office) authority = `، بموجب توكيل رقم ${no} لسنة ${year} موثق لدى ${office}`;
        } else if (basis === "commercial_register") {
          authority = "، بموجب الصفة الثابتة بالسجل التجاري";
        }
      }
      const email = valueText(`${prefix}_company_email`);
      const phone = valueText(`${prefix}_company_phone`);
      return `شركة/منشأة «${company}»، الشكل القانوني ${legalForm}، سجل تجاري رقم ${register}، والرقم الضريبي الموحد ${tax}، ومقرها ${address}، ويمثلها قانونًا السيد/ ${rep} بصفته ${capacity}${authority}${phone ? `، ورقم الهاتف ${phone}` : ""}${email ? `، والبريد الإلكتروني ${email}` : ""}، ويشار إليها في هذا العقد بـ «${role}».`;
    }

    const name = valueText(`${prefix}_name`);
    const nationality = valueText(`${prefix}_nationality`);
    const identityType = valueText(`${prefix}_identity_document_type`);
    const identity = valueText(`${prefix}_national_id`);
    const address = valueText(`${prefix}_address`);
    const phone = valueText(`${prefix}_phone`);
    if (!name || !nationality || !identityType || !identity || !address || !phone) return undefined;
    const identityLabel = identityType === "passport" ? "رقم جواز السفر" : "الرقم القومي";
    const issuer = valueText(`${prefix}_id_issuer`);
    const issueDate = valueText(`${prefix}_id_issue_date`);
    const email = valueText(`${prefix}_email`);
    const issueText = issuer || issueDate ? `، ${issuer ? `صادر من ${issuer}` : ""}${issuer && issueDate ? " " : ""}${issueDate ? `بتاريخ ${issueDate}` : ""}` : "";
    return `السيد/ ${name}، ${nationality} الجنسية، يحمل ${identityLabel} رقم ${identity}${issueText}، وعنوانه ${address}، ورقم هاتفه ${phone}${email ? `، وبريده الإلكتروني ${email}` : ""}، ويشار إليه في هذا العقد بـ «${role}».`;
  }

  if (fieldKey === "website_total_price_words") return numberToEgyptianPoundsWords(fieldValues.website_total_price) || undefined;

  if (fieldKey === "website_project_definition") {
    const name = valueText("website_project_name");
    if (!name) return undefined;
    const typeRaw = valueText("website_project_type");
    const typeMap: Record<string, string> = { corporate: "موقع تعريفي", ecommerce: "متجر إلكتروني", platform: "منصة إلكترونية", web_app: "نظام ويب (Web Application)", landing_page: "صفحة هبوط (Landing Page)" };
    const type = typeRaw === "other" ? valueText("website_project_type_other") : (typeRaw ? (typeMap[typeRaw] ?? typeRaw) : undefined);
    if (!type) return undefined;
    const contactEmail = valueText("website_contact_email");
    const manager = valueText("website_project_manager");
    const approval = valueText("website_approval_person") || valueText("website_client_legal_representative") || valueText("website_client_name") || valueText("website_client_company_name") || "الطرف الأول";
    const billing = valueText("website_billing_contact");
    const parts = [`اسم المشروع «${name}»`, `نوع المشروع ${type}`];
    if (contactEmail) parts.push(`البريد التشغيلي المعتمد ${contactEmail}`);
    if (manager) parts.push(`مسؤول إدارة المشروع ${manager}`);
    parts.push(`صاحب صلاحية اعتماد الأعمال والمخرجات ${approval}`);
    if (billing) parts.push(`مسؤول الفواتير أو المدفوعات ${billing}`);
    return `${parts.join("، ")}. وتعتبر الموافقات الصادرة من صاحب صلاحية الاعتماد نافذة في حدود نطاق المشروع.`;
  }

  if (fieldKey === "website_approval_authority_text") {
    const approval = valueText("website_approval_person");
    if (approval) return `اعتمد الطرف الأول السيد/ ${approval} ممثلًا مخولًا بإصدار الموافقات والاعتمادات المتعلقة بالمشروع في حدود صلاحياته، وتظل موافقاته ملزمة للطرف الأول إلى أن يتم إخطار الطرف الثاني كتابةً بتغيير هذا التعيين.`;
    const fallback = valueText("website_client_legal_representative") || valueText("website_client_name") || valueText("website_client_company_name");
    return `لم يعيّن الطرف الأول مسؤول اعتماد مستقلًا، ولذلك يتولى ${fallback ? `السيد/ ${fallback}` : "الطرف الأول أو ممثله القانوني"} إصدار الموافقات والاعتمادات المتعلقة بالمشروع إلى أن يتم تعيين ممثل آخر كتابةً.`;
  }

  if (fieldKey === "website_payment_schedule_text") {
    const mode = valueText("website_payment_mode");
    if (mode === "single") {
      const due = valueText("website_single_payment_due");
      return due ? `يُسدد المقابل المالي كاملًا دفعة واحدة، وتستحق ${due}.` : undefined;
    }
    if (mode === "installments") {
      const rows = Array.isArray(fieldValues.website_payment_schedule) ? fieldValues.website_payment_schedule : [];
      if (!rows.length) return undefined;
      const rendered = rows.map((row: Record<string, any>, index: number) => {
        const label = String(row.payment ?? "").trim() || `الدفعة ${index + 1}`;
        const amount = Number(row.amount ?? 0);
        const due = String(row.due ?? "").trim();
        if (!amount || !due) return "";
        return `${label}: ${amount.toLocaleString("ar-EG")} جنيه مصري، وتستحق ${due}`;
      }).filter(Boolean);
      return rendered.length === rows.length ? `يُسدد المقابل المالي على دفعات على النحو الآتي: ${rendered.join("؛ ")}.` : undefined;
    }
    return undefined;
  }

  if (fieldKey === "website_restart_fee_text") {
    if (!Boolean(fieldValues.website_restart_fee_enabled)) return "ولا تستحق أي رسوم مستقلة لإعادة تشغيل المشروع ما لم يتفق الطرفان عليها كتابةً لاحقًا.";
    const amount = valueText("website_restart_fee_amount");
    return amount ? `واتفق الطرفان على أن تكون رسوم إعادة تشغيل المشروع ${Number(amount).toLocaleString("ar-EG")} جنيه مصري عند تحقق شروط استحقاقها.` : undefined;
  }

  if (fieldKey === "website_portfolio_permission_text") {
    return String(fieldValues.website_portfolio_permission ?? "") === "yes"
      ? "وافق الطرف الأول على أن يجوز للطرف الثاني، بعد إطلاق المشروع أو إتاحته للجمهور، الإشارة إلى قيامه بتطويره وعرض اسم المشروع أو شعاره أو لقطات عامة منه ضمن معرض أعماله (Portfolio) وأغراضه التسويقية، بشرط عدم إفشاء أي معلومات سرية أو بيانات غير معلنة وعدم تجاوز حدود هذه الموافقة."
      : String(fieldValues.website_portfolio_permission ?? "") === "no"
        ? "لا يجوز للطرف الثاني استخدام اسم الطرف الأول أو علامته التجارية أو شعاره أو اسم المشروع أو أي جزء من مخرجاته أو عرضه ضمن معرض الأعمال (Portfolio) أو الأغراض التسويقية إلا بعد موافقة كتابية مستقلة لاحقة من الطرف الأول."
        : undefined;
  }

  if (fieldKey === "website_external_services_text") {
    if (!Boolean(fieldValues.website_external_services_enabled)) return "لم يتفق الطرفان ضمن هذا العقد على أن يتولى الطرف الثاني شراء أو إدارة أو تجديد خدمات خارجية، وأي اتفاق لاحق على ذلك يجب أن يكون مكتوبًا ومحددًا لنطاق الخدمة وتكلفتها وجهة سدادها.";
    const rows = Array.isArray(fieldValues.website_external_services) ? fieldValues.website_external_services : [];
    if (!rows.length) return undefined;
    const payerMap: Record<string, string> = { client: "الطرف الأول (العميل)", provider: "الطرف الثاني (مقدم الخدمة)", shared: "الطرفان مناصفة" };
    const rendered = rows.map((row: Record<string, any>) => {
      const service = String(row.service ?? "").trim();
      const provider = String(row.provider ?? "").trim();
      const duration = String(row.duration ?? "").trim();
      const amount = Number(row.amount ?? 0);
      const payer = payerMap[String(row.payer ?? "")] ?? String(row.payer ?? "").trim();
      if (!service || !provider || !duration || !amount || !payer) return "";
      return `${service} من مزود الخدمة ${provider} لمدة ${duration} بقيمة ${amount.toLocaleString("ar-EG")} جنيه مصري ويتحمل سدادها ${payer}`;
    }).filter(Boolean);
    return rendered.length === rows.length ? `اتفق الطرفان على أن يتولى الطرف الثاني شراء أو إدارة الخدمات الخارجية الآتية: ${rendered.join("؛ ")}. ويقتصر التزام الطرف الثاني بشأنها على ما ورد هنا ولا يعد ضامنًا لمزودي الخدمات من الغير.` : undefined;
  }

  if (fieldKey === "website_email_notices_text") {
    if (!Boolean(fieldValues.website_email_notices_enabled)) return "لم يعتمد الطرفان البريد الإلكتروني كوسيلة تعاقدية مستقلة للإخطارات، دون إخلال بجواز استخدامه للتواصل التشغيلي الذي لا يرتب تعديلًا جوهريًا على العقد.";
    const reuse = Boolean(fieldValues.website_notice_use_party_emails);
    const partyEmail = (prefix: string) => String(fieldValues[`${prefix}_party_type`] ?? "") === "company" ? valueText(`${prefix}_company_email`) : valueText(`${prefix}_email`);
    const client = reuse ? partyEmail("website_client") : valueText("website_notice_client_email");
    const provider = reuse ? partyEmail("website_provider") : valueText("website_notice_provider_email");
    if (!client || !provider) return undefined;
    return `اعتمد الطرفان البريد الإلكتروني وسيلة للإخطارات والمراسلات والاعتمادات؛ بريد الطرف الأول: ${client}، وبريد الطرف الثاني: ${provider}. وتنتج المراسلات آثارها متى أمكن التحقق من صدورها ونسبتها وسلامة محتواها وفي الحدود التي يجيزها القانون.`;
  }

  if (fieldKey === "website_messaging_notices_text") {
    if (!Boolean(fieldValues.website_messaging_apps_enabled)) return "لم يعتمد الطرفان تطبيقات المراسلة الإلكترونية كوسيلة تعاقدية للإخطارات أو الاعتمادات.";
    const apps = valueText("website_messaging_apps");
    const reuse = Boolean(fieldValues.website_messaging_use_party_phones);
    const partyPhone = (prefix: string) => String(fieldValues[`${prefix}_party_type`] ?? "") === "company" ? valueText(`${prefix}_company_phone`) : valueText(`${prefix}_phone`);
    const client = reuse ? partyPhone("website_client") : valueText("website_messaging_client_number");
    const provider = reuse ? partyPhone("website_provider") : valueText("website_messaging_provider_number");
    if (!apps || !client || !provider) return undefined;
    return `اعتمد الطرفان تطبيق/تطبيقات ${apps} للمراسلات المتعلقة بتنفيذ المشروع؛ رقم الطرف الأول: ${client}، ورقم الطرف الثاني: ${provider}. ولا يترتب على هذه المراسلات بذاتها تعديل نطاق العمل أو المقابل المالي أو مدة التنفيذ إلا بموافقة صريحة وفق إجراءات التعديل.`;
  }

  if (fieldKey === "website_project_platform_text") {
    if (!Boolean(fieldValues.website_project_platform_enabled)) return "لم يعتمد الطرفان منصة إلكترونية محددة لإدارة المشروع، ويجوز اعتمادها لاحقًا كتابةً.";
    const name = valueText("website_project_platform_name");
    const link = valueText("website_project_platform_link");
    if (!name || !link) return undefined;
    return `اعتمد الطرفان منصة ${name} لإدارة المشروع ومتابعة التنفيذ وتبادل الملفات والاعتمادات، ورابط المشروع أو الحساب هو ${link}. وتعد السجلات والموافقات القابلة للتحقق الصادرة من خلالها وسيلة إثبات في الحدود المتفق عليها.`;
  }

  if (fieldKey === "website_competent_court_text") {
    const raw = valueText("website_competent_court");
    if (!raw) return undefined;
    const court = raw === "أخرى" ? valueText("website_competent_court_other") : raw;
    if (!court) return undefined;
    const cleanCourt = court.trim();
    const normalized = cleanCourt.startsWith("محكمة") ? cleanCourt : `محكمة ${cleanCourt}`;
    if (/اقتصادية|ابتدائية|استئناف|إدارية|دستورية/.test(cleanCourt)) return normalized;
    return `${normalized} الابتدائية ودوائرها الجزئية بحسب الأحوال`;
  }

  if (fieldKey === "website_legal_fees_text") {
    if (Boolean(fieldValues.website_legal_fees_enabled)) {
      const rawPayer = fieldValues.website_legal_fees_payer;
      let payer = rawPayer === "أخرى" || rawPayer === "other"
        ? valueText("website_legal_fees_other")
        : valueText("website_legal_fees_payer");
      if (!payer) return undefined;
      return `اتفق الطرفان على أن يتحمل ${payer} رسوم الدمغة أو الضرائب أو المصروفات القانونية الخاصة بهذا العقد أو تحريره أو إثبات تاريخه أو توثيقه أو أي إجراء قانوني مرتبط به، وذلك في الحدود التي تجيزها القوانين واللوائح السارية ودون إخلال بما يفرضه القانون على أي طرف بصفته.`;
    }
    return "ما لم يتفق الطرفان كتابةً على خلاف ذلك، يتحمل كل طرف الرسوم والضرائب والمصروفات التي يفرضها عليه القانون بحكم صفته أو التزاماته أو التصرفات الصادرة عنه.";
  }

  if (fieldKey === "preliminary_ownership_detail") {
    switch (String(fieldValues.preliminary_ownership_source ?? "")) {
      case "preliminary_contract": {
        const date = valueText("preliminary_contract_date");
        return date ? `عقد بيع ابتدائي مؤرخ ${date}` : undefined;
      }
      case "custom_contract": {
        const date = valueText("custom_contract_date");
        return date ? `عقد بيع عرفي مؤرخ ${date}` : undefined;
      }
      case "court_judgment": {
        const number = valueText("ownership_judgment_number");
        const year = valueText("ownership_judgment_year");
        return number && year ? `حكم قضائي رقم ${number} لسنة ${year}` : undefined;
      }
      case "allocation": {
        const authority = valueText("ownership_allocation_authority");
        return authority ? `تخصيص صادر من ${authority}` : undefined;
      }
    }
  }

  if (fieldKey === "registrable_ownership_detail") {
    switch (String(fieldValues.registered_title_type ?? "")) {
      case "registered_contract": {
        const number = valueText("registered_deed_number");
        const year = valueText("registered_deed_year");
        const office = valueText("registry_office");
        return number && year && office ? `عقد مسجل رقم ${number} لسنة ${year} لدى ${office}` : undefined;
      }
      case "final_judgment": {
        const number = valueText("registered_judgment_number");
        const year = valueText("registered_judgment_year");
        const court = valueText("registered_judgment_court");
        return number && year && court ? `حكم نهائي رقم ${number} لسنة ${year} صادر من ${court}` : undefined;
      }
      case "allocation": {
        const authority = valueText("registered_allocation_authority");
        return authority ? `عقد تخصيص صادر من ${authority}` : undefined;
      }
      case "other": {
        const other = valueText("registered_other_title");
        return other ? `سند آخر: ${other}` : undefined;
      }
    }
  }

  if (fieldKey === "inheritance_disposition_detail") {
    switch (String(fieldValues.inheritance_disposition_basis ?? "")) {
      case "power_of_attorney": {
        const number = valueText("inheritance_poa_number");
        const year = valueText("inheritance_poa_year");
        const office = valueText("inheritance_poa_office");
        const date = valueText("inheritance_poa_date");
        return number && year && office && date ? `توكيل رسمي رقم ${number} لسنة ${year} موثق لدى ${office} بتاريخ ${date}` : undefined;
      }
      case "partition_contract": {
        const date = valueText("inheritance_partition_date");
        return date ? `عقد قسمة وتراضٍ بين الورثة مؤرخ ${date}` : undefined;
      }
      case "relinquishment_contract": {
        const date = valueText("inheritance_relinquishment_date");
        return date ? `عقد تخارج أو تنازل مؤرخ ${date}` : undefined;
      }
      case "sale_from_heirs": {
        const date = valueText("inheritance_heirs_sale_date");
        return date ? `عقد بيع أو تصرف من باقي الورثة مؤرخ ${date}` : undefined;
      }
      case "sole_heir":
        return "البائع هو الوارث الوحيد وفق إعلام الوراثة المثبت بالعقد";
      case "other": {
        const other = valueText("inheritance_other_basis");
        return other ? `سند قانوني آخر: ${other}` : undefined;
      }
    }
  }

  if (fieldKey === "commercial_guarantee_value_text") {
    const mode = String(fieldValues.commercial_guarantee_value_mode ?? "");
    const amount = valueText(mode === "each" ? "commercial_guarantee_each_amount" : mode === "total" ? "commercial_guarantee_total_amount" : "");
    if (!amount) return undefined;
    return mode === "each" ? `وقيمة كل شيك ${amount} جنيه مصري` : `وإجمالي قيمة الشيكات ${amount} جنيه مصري`;
  }

  if (fieldKey === "administrative_guarantee_value_text") {
    const mode = String(fieldValues.administrative_guarantee_value_mode ?? "");
    const amount = valueText(mode === "each" ? "administrative_guarantee_each_amount" : mode === "total" ? "administrative_guarantee_total_amount" : "");
    if (!amount) return undefined;
    return mode === "each" ? `وقيمة كل شيك ${amount} جنيه مصري` : `وإجمالي قيمة الشيكات ${amount} جنيه مصري`;
  }

  return undefined;
}

export function renderLegalClauses(
  template: ContractTemplateDefinition,
  variantKey: string,
  selectedOptionalClauseKeys: string[] = [],
  fieldValues: Record<string, any> = {},
): RenderedLegalClause[] {
  const resolved = resolveWizardDefinition(template, variantKey, selectedOptionalClauseKeys, fieldValues);
  const variant = resolved.variant;

  const availableClauseMap = new Map<string, LegalClauseDefinition>();
  for (const clause of template.legalClauses || []) {
    if (clause.enabled !== false) {
      availableClauseMap.set(clause.key, clause);
    }
  }

  const manualClauseKeys = new Set<string>();
  const effectiveClauseKeys = [...new Set(selectedOptionalClauseKeys)];
  for (const optional of template.optionalClauses) {
    if (effectiveClauseKeys.includes(optional.key) && optional.manualFillAnnex) {
      for (const k of optional.legalClauseKeys) {
        manualClauseKeys.add(k);
      }
    }
  }

  const rendered: RenderedLegalClause[] = [];
  const fieldMap = new Map<string, WizardFieldDefinition>(
    resolved.steps.flatMap((step) => step.fields).map((field) => [field.key, field] as const),
  );

  for (const key of resolved.activeClauseKeys) {
    const clause = availableClauseMap.get(key);
    if (!clause) continue;
    if (clause.visibleWhen && !evaluateCondition(clause.visibleWhen, fieldValues)) continue;

    let body = clause.bodyAr || "";
    const isManual = manualClauseKeys.has(key);
    const variables = isManual ? [] : (clause.variables || []);

    for (const v of variables) {
      const token = `{{${v}}}`;
      const derived = derivedClauseVariable(v, fieldValues);
      let val = derived;
      const usingDerived = derived !== undefined && derived !== null && derived !== "";
      if (!usingDerived) val = fieldValues[v];
      if (val === undefined || val === null || val === "") {
        val = "بيان مطلوب";
      } else if (!usingDerived) {
        val = formatClauseVariable(v, val, fieldMap.get(v), fieldValues);
      }
      body = body.split(token).join(String(val));
    }

    rendered.push({
      key,
      titleAr: clause.titleAr || key,
      bodyAr: body,
      sourceDocumentName: clause.sourceDocumentName,
      sourcePageStart: clause.sourcePageStart,
      sourcePageEnd: clause.sourcePageEnd,
    });
  }

  return rendered;
}
