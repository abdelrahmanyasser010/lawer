import type {
  ConditionDefinition,
  ContractTemplateDefinition,
  ContractVariantDefinition,
  LegalClauseDefinition,
  OptionalClauseDefinition,
  WizardFieldDefinition,
  WizardStepDefinition,
} from "../../types";
import { normalizeLegalClauseDefinition } from "../legalText";
import {
  freelanceSourceClauseKeysByAnnex,
  freelanceSourceClauseKeysByVariant,
  freelanceSourceLegalClauses,
} from "../../legal-content/freelanceSourceClauses";
import { competentCourtOptions, contractDateField } from "../common";

const yesNo = [
  { value: "yes", labelAr: "نعم" },
  { value: "no", labelAr: "لا" },
];

const partyTypeOptions = [
  { value: "individual", labelAr: "فرد" },
  { value: "company", labelAr: "شركة / منشأة" },
];

const identityDocumentOptions = [
  { value: "national_id", labelAr: "رقم قومي" },
  { value: "passport", labelAr: "جواز سفر" },
];

const currencyOptions = [
  { value: "egp", labelAr: "جنيه مصري" },
  { value: "usd", labelAr: "دولار أمريكي" },
  { value: "eur", labelAr: "يورو" },
  { value: "sar", labelAr: "ريال سعودي" },
  { value: "aed", labelAr: "درهم إماراتي" },
  { value: "other", labelAr: "عملة أخرى" },
];

const freelancerCourtOptions = [
  ...competentCourtOptions,
  { value: "أخرى", labelAr: "محكمة أخرى" },
];

const allConditions = (...conditions: ConditionDefinition[]): ConditionDefinition => ({ all: conditions });
const anyConditions = (...conditions: ConditionDefinition[]): ConditionDefinition => ({ any: conditions });

function partyFields(
  prefix: string,
  label: string,
  roleLabel: string,
  includeIdentityDocuments = true,
): WizardFieldDefinition[] {
  const companyCondition = { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" };
  const fields: WizardFieldDefinition[] = [
    { key: `${prefix}_party_type`, type: "radio", labelAr: `الصفة القانونية لـ${label}`, required: true, options: partyTypeOptions },
    { key: `${prefix}_name`, type: "text", labelAr: `الاسم الكامل لـ${label}`, required: true },
    { key: `${prefix}_nationality`, type: "text", labelAr: "الجنسية", required: true },
    { key: `${prefix}_identity_document_type`, type: "radio", labelAr: "نوع مستند إثبات الهوية", required: true, printInDocument: false, options: identityDocumentOptions },
    { key: `${prefix}_national_id`, type: "text", labelAr: "رقم مستند إثبات الهوية", required: true },
    { key: `${prefix}_id_issuer`, type: "text", labelAr: "جهة الإصدار" },
    { key: `${prefix}_id_issue_date`, type: "date", labelAr: "تاريخ الإصدار" },
    { key: `${prefix}_address`, type: "text", labelAr: "العنوان", required: true },
    { key: `${prefix}_phone`, type: "text", labelAr: "رقم الهاتف", required: true },
    { key: `${prefix}_email`, type: "text", labelAr: "البريد الإلكتروني" },
    { key: `${prefix}_company_name`, type: "text", labelAr: "اسم الشركة / المنشأة", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_company_legal_form`, type: "text", labelAr: "الشكل القانوني", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_commercial_register`, type: "text", labelAr: "رقم السجل التجاري", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_tax_number`, type: "text", labelAr: "الرقم الضريبي الموحد", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_legal_representative`, type: "text", labelAr: "اسم الممثل القانوني", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_representative_capacity`, type: "text", labelAr: "صفة الممثل القانوني", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_authority_basis`, type: "select", labelAr: "سند التمثيل", required: true, visibleWhen: companyCondition, options: [
      { value: "commercial_register", labelAr: "السجل التجاري" },
      { value: "power_of_attorney", labelAr: "توكيل" },
    ] },
    {
      key: `${prefix}_power_of_attorney_details`,
      type: "text",
      labelAr: "رقم وسنة ومكتب التوكيل",
      requiredWhen: { fieldKey: `${prefix}_authority_basis`, operator: "equals", value: "power_of_attorney" },
      visibleWhen: { fieldKey: `${prefix}_authority_basis`, operator: "equals", value: "power_of_attorney" },
    },
    { key: `${prefix}_company_address`, type: "text", labelAr: "مقر الشركة", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_company_email`, type: "text", labelAr: "البريد الإلكتروني للشركة", required: true, visibleWhen: companyCondition },
  ];
  if (includeIdentityDocuments) {
    fields.push({ key: `${prefix}_identity_documents`, type: "attachment", labelAr: `مستندات هوية وصفة ${roleLabel}` });
  }
  return fields;
}

function commonPartySteps(
  secondPrefix: string,
  secondLabel: string,
  roleLabel: string,
  includeIdentityDocuments = true,
): WizardStepDefinition[] {
  return [
    { key: `${secondPrefix}_client_party`, titleAr: "بيانات الطرف الأول (العميل)", articleRange: "المادة الأولى — تعريف الطرف الأول", fields: partyFields(`${secondPrefix}_client`, "العميل", "العميل", includeIdentityDocuments) },
    { key: `${secondPrefix}_provider_party`, titleAr: `بيانات الطرف الثاني (${secondLabel})`, articleRange: "المادة الأولى — تعريف الطرف الثاني", fields: partyFields(`${secondPrefix}_provider`, secondLabel, roleLabel, includeIdentityDocuments) },
  ];
}

function visualPartySteps(): WizardStepDefinition[] {
  const reusePartyEmails = allConditions(
    { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
    { fieldKey: "visual_notice_use_party_emails", operator: "truthy" },
  );
  const reusePartyPhones = allConditions(
    { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
    { fieldKey: "visual_messaging_use_party_phones", operator: "truthy" },
  );
  const individualSuffixes = ["_name", "_nationality", "_identity_document_type", "_national_id", "_id_issuer", "_id_issue_date", "_address", "_phone", "_email"];
  return commonPartySteps("visual", "المصمم", "المصمم", false).map((step) => ({
    ...step,
    fields: step.fields.flatMap((field): WizardFieldDefinition[] => {
      const prefix = field.key.startsWith("visual_client_") ? "visual_client" : field.key.startsWith("visual_provider_") ? "visual_provider" : "";
      const individualCondition: ConditionDefinition | undefined = prefix
        ? { fieldKey: `${prefix}_party_type`, operator: "equals", value: "individual" }
        : undefined;

      if (field.key.endsWith("_power_of_attorney_details")) {
        const poaPrefix = field.key.slice(0, -"_power_of_attorney_details".length);
        const condition: ConditionDefinition = { fieldKey: `${poaPrefix}_authority_basis`, operator: "equals", value: "power_of_attorney" };
        return [
          { key: `${poaPrefix}_power_of_attorney_number`, type: "text", labelAr: "رقم التوكيل", visibleWhen: condition, requiredWhen: condition },
          { key: `${poaPrefix}_power_of_attorney_year`, type: "number", labelAr: "سنة التوكيل", visibleWhen: condition, requiredWhen: condition, validation: { min: 1900, max: 2200 } },
          { key: `${poaPrefix}_power_of_attorney_office`, type: "text", labelAr: "مكتب الشهر العقاري", visibleWhen: condition, requiredWhen: condition },
        ];
      }

      if (prefix && individualCondition && individualSuffixes.some((suffix) => field.key === `${prefix}${suffix}`)) {
        const optional = field.key.endsWith("_id_issuer") || field.key.endsWith("_id_issue_date") || field.key.endsWith("_email");
        return [{
          ...field,
          required: !optional,
          visibleWhen: individualCondition,
          requiredWhen: field.key.endsWith("_email") ? allConditions(individualCondition, reusePartyEmails) : undefined,
        }];
      }

      if (field.key === "visual_client_company_email" || field.key === "visual_provider_company_email") {
        const companyCondition: ConditionDefinition = { fieldKey: field.key.startsWith("visual_client_") ? "visual_client_party_type" : "visual_provider_party_type", operator: "equals", value: "company" };
        return [{ ...field, required: false, requiredWhen: allConditions(companyCondition, reusePartyEmails) }];
      }

      if (field.key === "visual_client_company_address" || field.key === "visual_provider_company_address") {
        const companyPrefix = field.key.startsWith("visual_client_") ? "visual_client" : "visual_provider";
        const companyCondition: ConditionDefinition = { fieldKey: `${companyPrefix}_party_type`, operator: "equals", value: "company" };
        return [
          field,
          { key: `${companyPrefix}_company_phone`, type: "text", labelAr: "رقم هاتف الشركة / الممثل", visibleWhen: companyCondition, requiredWhen: allConditions(companyCondition, reusePartyPhones) },
        ];
      }

      return [field];
    }),
  }));
}

function websitePartySteps(): WizardStepDefinition[] {
  const reusePartyEmails = allConditions(
    { fieldKey: "website_email_notices_enabled", operator: "truthy" },
    { fieldKey: "website_notice_use_party_emails", operator: "truthy" },
  );
  const reusePartyPhones = allConditions(
    { fieldKey: "website_messaging_apps_enabled", operator: "truthy" },
    { fieldKey: "website_messaging_use_party_phones", operator: "truthy" },
  );
  const individualSuffixes = ["_name", "_nationality", "_identity_document_type", "_national_id", "_id_issuer", "_id_issue_date", "_address", "_phone", "_email"];
  return commonPartySteps("website", "مقدم الخدمة", "مقدم الخدمة", false).map((step) => ({
    ...step,
    fields: step.fields.flatMap((field): WizardFieldDefinition[] => {
      const prefix = field.key.startsWith("website_client_") ? "website_client" : field.key.startsWith("website_provider_") ? "website_provider" : "";
      const individualCondition: ConditionDefinition | undefined = prefix
        ? { fieldKey: `${prefix}_party_type`, operator: "equals", value: "individual" }
        : undefined;

      // The Website source has no "بموجب" / POA row for the client-company table;
      // that row exists only for the provider-company table on page 2.
      if (field.key === "website_client_authority_basis" || field.key === "website_client_power_of_attorney_details") return [];

      if (field.key.endsWith("_power_of_attorney_details")) {
        const poaPrefix = field.key.slice(0, -"_power_of_attorney_details".length);
        const condition: ConditionDefinition = { fieldKey: `${poaPrefix}_authority_basis`, operator: "equals", value: "power_of_attorney" };
        return [
          { key: `${poaPrefix}_power_of_attorney_number`, type: "text", labelAr: "رقم التوكيل", visibleWhen: condition, requiredWhen: condition },
          { key: `${poaPrefix}_power_of_attorney_year`, type: "number", labelAr: "سنة التوكيل", visibleWhen: condition, requiredWhen: condition, validation: { min: 1900, max: 2200 } },
          { key: `${poaPrefix}_power_of_attorney_office`, type: "text", labelAr: "مكتب الشهر العقاري", visibleWhen: condition, requiredWhen: condition },
        ];
      }

      if (prefix && individualCondition && individualSuffixes.some((suffix) => field.key === `${prefix}${suffix}`)) {
        const isOptionalIdentityMeta = field.key.endsWith("_id_issuer") || field.key.endsWith("_id_issue_date") || field.key.endsWith("_email");
        const requiredWhen = field.key.endsWith("_email")
          ? allConditions(individualCondition, reusePartyEmails)
          : undefined;
        return [{ ...field, required: !isOptionalIdentityMeta, visibleWhen: individualCondition, requiredWhen }];
      }

      if (field.key === "website_client_company_email" || field.key === "website_provider_company_email") {
        const companyCondition: ConditionDefinition = { fieldKey: field.key.startsWith("website_client_") ? "website_client_party_type" : "website_provider_party_type", operator: "equals", value: "company" };
        return [{ ...field, required: false, requiredWhen: allConditions(companyCondition, reusePartyEmails) }];
      }

      if (field.key === "website_client_company_address" || field.key === "website_provider_company_address") {
        const companyPrefix = field.key.startsWith("website_client_") ? "website_client" : "website_provider";
        const companyCondition: ConditionDefinition = { fieldKey: `${companyPrefix}_party_type`, operator: "equals", value: "company" };
        return [
          field,
          { key: `${companyPrefix}_company_phone`, type: "text", labelAr: "رقم هاتف الشركة / الممثل", visibleWhen: companyCondition, requiredWhen: allConditions(companyCondition, reusePartyPhones) },
        ];
      }

      return [field];
    }),
  }));
}

function socialPartySteps(): WizardStepDefinition[] {
  const reusePartyEmails = allConditions(
    { fieldKey: "social_email_notices_enabled", operator: "truthy" },
    { fieldKey: "social_notice_use_party_emails", operator: "truthy" },
  );
  const reusePartyPhones = allConditions(
    { fieldKey: "social_messaging_apps_enabled", operator: "truthy" },
    { fieldKey: "social_messaging_use_party_phones", operator: "truthy" },
  );
  const individualSuffixes = ["_name", "_nationality", "_identity_document_type", "_national_id", "_id_issuer", "_id_issue_date", "_address", "_phone", "_email"];

  return commonPartySteps("social", "مقدم الخدمة", "مقدم الخدمة", false).map((step) => ({
    ...step,
    fields: step.fields.flatMap((field): WizardFieldDefinition[] => {
      const prefix = field.key.startsWith("social_client_") ? "social_client" : field.key.startsWith("social_provider_") ? "social_provider" : "";
      const individualCondition: ConditionDefinition | undefined = prefix
        ? { fieldKey: `${prefix}_party_type`, operator: "equals", value: "individual" }
        : undefined;

      if (field.key.endsWith("_power_of_attorney_details")) {
        const poaPrefix = field.key.slice(0, -"_power_of_attorney_details".length);
        const condition: ConditionDefinition = { fieldKey: `${poaPrefix}_authority_basis`, operator: "equals", value: "power_of_attorney" };
        return [
          { key: `${poaPrefix}_power_of_attorney_number`, type: "text", labelAr: "رقم التوكيل", visibleWhen: condition, requiredWhen: condition },
          { key: `${poaPrefix}_power_of_attorney_year`, type: "number", labelAr: "سنة التوكيل", visibleWhen: condition, requiredWhen: condition, validation: { min: 1900, max: 2200 } },
          { key: `${poaPrefix}_power_of_attorney_office`, type: "text", labelAr: "مكتب الشهر العقاري", visibleWhen: condition, requiredWhen: condition },
        ];
      }

      if (prefix && individualCondition && individualSuffixes.some((suffix) => field.key === `${prefix}${suffix}`)) {
        const optional = field.key.endsWith("_id_issuer") || field.key.endsWith("_id_issue_date") || field.key.endsWith("_email");
        return [{
          ...field,
          required: !optional,
          visibleWhen: individualCondition,
          requiredWhen: field.key.endsWith("_email") ? allConditions(individualCondition, reusePartyEmails) : undefined,
        }];
      }

      if (field.key === "social_client_company_email" || field.key === "social_provider_company_email") {
        const companyCondition: ConditionDefinition = { fieldKey: field.key.startsWith("social_client_") ? "social_client_party_type" : "social_provider_party_type", operator: "equals", value: "company" };
        return [{ ...field, required: false, requiredWhen: allConditions(companyCondition, reusePartyEmails) }];
      }

      if (field.key === "social_client_company_address" || field.key === "social_provider_company_address") {
        const companyPrefix = field.key.startsWith("social_client_") ? "social_client" : "social_provider";
        const companyCondition: ConditionDefinition = { fieldKey: `${companyPrefix}_party_type`, operator: "equals", value: "company" };
        return [
          field,
          { key: `${companyPrefix}_company_phone`, type: "text", labelAr: "رقم هاتف الشركة / الممثل", visibleWhen: companyCondition, requiredWhen: allConditions(companyCondition, reusePartyPhones) },
        ];
      }

      return [field];
    }),
  }));
}

const reviewStep = (key: string): WizardStepDefinition => ({ key, titleAr: "المراجعة وإصدار العقد", articleRange: "مراجعة البيانات والبنود والملاحق", fields: [] });

const visualSteps: WizardStepDefinition[] = [
  { key: "visual_contract_meta", titleAr: "بيانات العقد", articleRange: "صدر العقد وتاريخ تحريره", fields: [contractDateField] },
  ...visualPartySteps(),
  { key: "visual_project_scope", titleAr: "بيانات المشروع ونطاق خدمات الهوية", articleRange: "المواد 1 إلى 4 — المشروع ونطاق الخدمات", fields: [
    { key: "visual_project_name", type: "text", labelAr: "اسم المشروع / العلامة التجارية / النشاط", required: true },
    { key: "visual_project_brief", type: "textarea", labelAr: "وصف مختصر للمشروع (اختياري)" },
    { key: "visual_project_purpose", type: "textarea", labelAr: "الغرض من تصميم الهوية البصرية", required: true },
    { key: "visual_main_scope_services", type: "repeater", labelAr: "الخدمات المشمولة في هذا العقد", required: true, minRows: 1, columns: [
      { key: "service", type: "select", labelAr: "الخدمة", required: true, options: [
        { value: "logo", labelAr: "تصميم / تطوير الشعار" },
        { value: "identity", labelAr: "إعداد الهوية البصرية" },
        { value: "colors_fonts", labelAr: "اختيار الألوان والخطوط" },
        { value: "visual_elements", labelAr: "تصميم العناصر والأنماط البصرية" },
        { value: "brand_guidelines", labelAr: "إعداد دليل الهوية البصرية (Brand Guidelines)" },
        { value: "print_digital", labelAr: "مطبوعات / قوالب / أصول رقمية" },
        { value: "other", labelAr: "خدمة أخرى" },
      ] },
      { key: "details", type: "text", labelAr: "تفاصيل الخدمة", visibleWhen: { fieldKey: "service", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "service", operator: "equals", value: "other" } },
    ], helpText: "أضف فقط الخدمات المتفق عليها؛ ما لم يدرج هنا لا يعد ضمن نطاق العقد." },
  ] },
  { key: "visual_delivery", titleAr: "المخرجات والملفات المصدرية", articleRange: "المادة 5 والمادة 11 — التسليم وحقوق الملفات", fields: [
    { key: "visual_output_formats", type: "text", labelAr: "صيغ الملفات النهائية المتفق عليها", required: true, placeholder: "مثال: PDF، PNG، SVG" },
    { key: "visual_source_files_included", type: "radio", labelAr: "هل يشمل الاتفاق تسليم الملفات المصدرية / القابلة للتعديل؟", required: true, options: yesNo },
    { key: "visual_source_file_types", type: "text", labelAr: "أنواع الملفات المصدرية المتفق على تسليمها", visibleWhen: { fieldKey: "visual_source_files_included", operator: "equals", value: "yes" }, requiredWhen: { fieldKey: "visual_source_files_included", operator: "equals", value: "yes" }, placeholder: "مثال: AI، PSD، FIG" },
    { key: "visual_source_files_price_mode", type: "radio", labelAr: "المقابل الخاص بالملفات المصدرية", visibleWhen: { fieldKey: "visual_source_files_included", operator: "equals", value: "yes" }, requiredWhen: { fieldKey: "visual_source_files_included", operator: "equals", value: "yes" }, options: [
      { value: "included", labelAr: "مشمولة في إجمالي المقابل المالي" },
      { value: "additional", labelAr: "لها مقابل مالي إضافي" },
    ] },
    { key: "visual_source_files_additional_fee", type: "money", labelAr: "المقابل الإضافي للملفات المصدرية (جنيه مصري)", visibleWhen: allConditions({ fieldKey: "visual_source_files_included", operator: "equals", value: "yes" }, { fieldKey: "visual_source_files_price_mode", operator: "equals", value: "additional" }), requiredWhen: allConditions({ fieldKey: "visual_source_files_included", operator: "equals", value: "yes" }, { fieldKey: "visual_source_files_price_mode", operator: "equals", value: "additional" }), validation: { min: 1 } },
  ] },
  { key: "visual_execution_finance", titleAr: "مدة التنفيذ والمقابل المالي والمراجعات", articleRange: "المواد 4 و6 و9 و10 — المدة والسداد والمراجعات", fields: [
    { key: "visual_execution_duration_value", type: "number", labelAr: "مدة تنفيذ الخدمات", required: true, validation: { min: 1 } },
    { key: "visual_execution_duration_unit", type: "select", labelAr: "وحدة مدة التنفيذ", required: true, options: [
      { value: "يوم عمل", labelAr: "يوم عمل" }, { value: "يوم تقويمي", labelAr: "يوم تقويمي" }, { value: "أسبوع", labelAr: "أسبوع" }, { value: "شهر", labelAr: "شهر" },
    ] },
    { key: "visual_execution_start_rule", type: "radio", labelAr: "بداية احتساب مدة التنفيذ", required: true, options: [
      { value: "source_rule", labelAr: "من التاريخ المتفق عليه أو استيفاء البيانات/الموافقات/الدفعة — أيهما لاحق" },
      { value: "contract_date", labelAr: "من تاريخ العقد" },
      { value: "specific_date", labelAr: "من تاريخ محدد" },
    ] },
    { key: "visual_execution_start_date", type: "date", labelAr: "تاريخ بدء التنفيذ", visibleWhen: { fieldKey: "visual_execution_start_rule", operator: "equals", value: "specific_date" }, requiredWhen: { fieldKey: "visual_execution_start_rule", operator: "equals", value: "specific_date" } },
    { key: "visual_contract_value", type: "money", labelAr: "إجمالي المقابل المالي (جنيه مصري)", required: true, validation: { min: 1 } },
    { key: "visual_payment_mode", type: "radio", labelAr: "نظام السداد", required: true, options: [
      { value: "single", labelAr: "دفعة واحدة" }, { value: "installments", labelAr: "عدة دفعات / مراحل" },
    ] },
    { key: "visual_single_payment_due", type: "text", labelAr: "موعد / واقعة استحقاق الدفعة الواحدة", visibleWhen: { fieldKey: "visual_payment_mode", operator: "equals", value: "single" }, requiredWhen: { fieldKey: "visual_payment_mode", operator: "equals", value: "single" }, placeholder: "مثال: عند توقيع العقد" },
    { key: "visual_main_payment_schedule", type: "repeater", labelAr: "جدول الدفعات", visibleWhen: { fieldKey: "visual_payment_mode", operator: "equals", value: "installments" }, requiredWhen: { fieldKey: "visual_payment_mode", operator: "equals", value: "installments" }, minRows: 2, columns: [
      { key: "payment", type: "text", labelAr: "الدفعة / المرحلة", required: true },
      { key: "amount", type: "money", labelAr: "القيمة", required: true },
      { key: "due", type: "text", labelAr: "موعد أو سبب الاستحقاق", required: true },
    ] },
    { key: "visual_payment_method", type: "text", labelAr: "وسيلة السداد المتفق عليها", required: true, placeholder: "مثال: تحويل بنكي / محفظة إلكترونية" },
    { key: "visual_revision_rounds", type: "number", labelAr: "عدد جولات المراجعة المتضمنة في المقابل المالي", required: true, validation: { min: 0 } },
  ] },
  { key: "visual_ip_portfolio", titleAr: "الملكية الفكرية وPortfolio", articleRange: "المادتان 11 و12 — الحقوق والاستخدام والسرية", fields: [
    { key: "visual_ip_rights_mode", type: "radio", labelAr: "نطاق الحقوق التي يحصل عليها العميل بعد السداد", required: true, options: [
      { value: "full_transfer", labelAr: "نقل كامل الحقوق على المخرجات النهائية المعتمدة" },
      { value: "specific_transfer", labelAr: "نقل حقوق محددة فقط" },
      { value: "license_only", labelAr: "ترخيص استخدام / استغلال فقط" },
    ] },
    { key: "visual_ip_specific_rights", type: "textarea", labelAr: "الحقوق المحددة التي تنتقل للعميل", visibleWhen: { fieldKey: "visual_ip_rights_mode", operator: "equals", value: "specific_transfer" }, requiredWhen: { fieldKey: "visual_ip_rights_mode", operator: "equals", value: "specific_transfer" } },
    { key: "visual_ip_license_scope", type: "textarea", labelAr: "نطاق ترخيص الاستخدام / الاستغلال", visibleWhen: { fieldKey: "visual_ip_rights_mode", operator: "equals", value: "license_only" }, requiredWhen: { fieldKey: "visual_ip_rights_mode", operator: "equals", value: "license_only" } },
    { key: "visual_portfolio_permission", type: "radio", labelAr: "السماح للمصمم بعرض الأعمال النهائية ضمن Portfolio؟", required: true, options: yesNo },
  ] },
  { key: "visual_termination_terms", titleAr: "مدد الإنهاء والتعليق", articleRange: "المادة 13 — الإنهاء والتعليق وآثاره", fields: [
    { key: "visual_breach_cure_days", type: "number", labelAr: "مهلة معالجة الإخلال الجوهري — يوم", required: true, validation: { min: 1 } },
    { key: "visual_nonpayment_termination_days", type: "number", labelAr: "مدة التأخر في السداد التي تجيز الإنهاء — يوم", required: true, validation: { min: 1 } },
    { key: "visual_client_stoppage_days", type: "number", labelAr: "مدة توقف المشروع بسبب العميل قبل التعليق — يوم", required: true, validation: { min: 1 } },
    { key: "visual_post_notice_termination_days", type: "number", labelAr: "المهلة بعد إخطار العميل بالتوقف قبل الإنهاء — يوم", required: true, validation: { min: 1 } },
  ] },
  { key: "visual_communications", titleAr: "الإخطارات والمراسلات", articleRange: "المادة 16 — وسائل التواصل المعتمدة", fields: [
    { key: "visual_email_notices_enabled", type: "checkbox", labelAr: "اعتماد البريد الإلكتروني للمراسلات المتعلقة بتنفيذ المشروع", printInDocument: false },
    { key: "visual_notice_use_party_emails", type: "checkbox", labelAr: "استخدام نفس البريد الإلكتروني المسجل في بيانات الطرفين", visibleWhen: { fieldKey: "visual_email_notices_enabled", operator: "truthy" }, printInDocument: false },
    { key: "visual_notice_client_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الأول (العميل)", visibleWhen: allConditions({ fieldKey: "visual_email_notices_enabled", operator: "truthy" }, { fieldKey: "visual_notice_use_party_emails", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "visual_email_notices_enabled", operator: "truthy" }, { fieldKey: "visual_notice_use_party_emails", operator: "falsy" }), printInDocument: false },
    { key: "visual_notice_provider_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الثاني (المصمم)", visibleWhen: allConditions({ fieldKey: "visual_email_notices_enabled", operator: "truthy" }, { fieldKey: "visual_notice_use_party_emails", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "visual_email_notices_enabled", operator: "truthy" }, { fieldKey: "visual_notice_use_party_emails", operator: "falsy" }), printInDocument: false },
    { key: "visual_messaging_apps_enabled", type: "checkbox", labelAr: "اعتماد تطبيقات المراسلة الإلكترونية للتعليمات والملاحظات والملفات", printInDocument: false },
    { key: "visual_messaging_apps", type: "text", labelAr: "تطبيقات المراسلة المعتمدة", placeholder: "مثال: WhatsApp", visibleWhen: { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" }, printInDocument: false },
    { key: "visual_messaging_use_party_phones", type: "checkbox", labelAr: "استخدام نفس أرقام الهاتف المسجلة في بيانات الطرفين", visibleWhen: { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" }, printInDocument: false },
    { key: "visual_messaging_client_number", type: "text", labelAr: "رقم المراسلة المعتمد للطرف الأول (العميل)", visibleWhen: allConditions({ fieldKey: "visual_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "visual_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" }), printInDocument: false },
    { key: "visual_messaging_provider_number", type: "text", labelAr: "رقم المراسلة المعتمد للطرف الثاني (المصمم)", visibleWhen: allConditions({ fieldKey: "visual_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "visual_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" }), printInDocument: false },
  ] },
  { key: "visual_witnesses", titleAr: "الشهود (اختياري)", articleRange: "بيانات التوقيع والشهود", fields: [
    { key: "visual_witness_1_enabled", type: "checkbox", labelAr: "إضافة الشاهد الأول", printInDocument: false },
    { key: "visual_witness_1_name", type: "text", labelAr: "اسم الشاهد الأول", visibleWhen: { fieldKey: "visual_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "visual_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "visual_witness_1_national_id", type: "text", labelAr: "الرقم القومي للشاهد الأول", visibleWhen: { fieldKey: "visual_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "visual_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "visual_witness_2_enabled", type: "checkbox", labelAr: "إضافة الشاهد الثاني", printInDocument: false },
    { key: "visual_witness_2_name", type: "text", labelAr: "اسم الشاهد الثاني", visibleWhen: { fieldKey: "visual_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "visual_witness_2_enabled", operator: "truthy" }, printInDocument: false },
    { key: "visual_witness_2_national_id", type: "text", labelAr: "الرقم القومي للشاهد الثاني", visibleWhen: { fieldKey: "visual_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "visual_witness_2_enabled", operator: "truthy" }, printInDocument: false },
  ] },
  { key: "visual_jurisdiction", titleAr: "المحكمة المختصة", articleRange: "المادة 17 — الاختصاص القضائي وتسوية المنازعات", fields: [
    { key: "visual_competent_court", type: "select", labelAr: "المحكمة المختصة", required: true, options: freelancerCourtOptions, helpText: "اختر المحكمة المتفق عليها بين الطرفين، مع مراعاة قواعد الاختصاص القضائي الآمرة." },
    { key: "visual_competent_court_other", type: "text", labelAr: "اسم المحكمة الأخرى", visibleWhen: { fieldKey: "visual_competent_court", operator: "equals", value: "أخرى" }, requiredWhen: { fieldKey: "visual_competent_court", operator: "equals", value: "أخرى" } },
  ] },
  reviewStep("visual_review"),
];

const websiteSteps: WizardStepDefinition[] = [
  { key: "website_contract_meta", titleAr: "بيانات العقد", articleRange: "صدر العقد وتاريخ تحريره", fields: [contractDateField] },
  ...websitePartySteps(),
  { key: "website_project", titleAr: "بيانات المشروع ومدة التنفيذ", articleRange: "المواد 1 و7 و8 و9 — المشروع والمدة والاعتماد", fields: [
    { key: "website_project_name", type: "text", labelAr: "اسم المشروع", required: true },
    { key: "website_project_type", type: "select", labelAr: "نوع المشروع", required: true, options: [
      { value: "corporate", labelAr: "موقع تعريفي" }, { value: "ecommerce", labelAr: "متجر إلكتروني" }, { value: "platform", labelAr: "منصة إلكترونية" },
      { value: "web_app", labelAr: "نظام ويب (Web Application)" }, { value: "landing_page", labelAr: "صفحة هبوط (Landing Page)" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "website_project_type_other", type: "text", labelAr: "نوع المشروع الآخر", visibleWhen: { fieldKey: "website_project_type", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "website_project_type", operator: "equals", value: "other" } },
    { key: "website_contact_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للتواصل التشغيلي مع المشروع" },
    { key: "website_project_manager", type: "text", labelAr: "الشخص المسؤول عن المشروع" },
    { key: "website_approval_person", type: "text", labelAr: "الشخص المسؤول عن الاعتماد", helpText: "إذا تُرك فارغًا، يُعد العميل نفسه أو ممثله القانوني صاحب الاعتماد." },
    { key: "website_billing_contact", type: "text", labelAr: "الشخص المسؤول عن الفواتير أو المدفوعات" },
    { key: "website_execution_duration_value", type: "number", labelAr: "مدة تنفيذ المشروع", required: true, validation: { min: 1 } },
    { key: "website_execution_duration_unit", type: "select", labelAr: "وحدة مدة التنفيذ", required: true, options: [
      { value: "يومًا", labelAr: "يوم" }, { value: "أسبوعًا", labelAr: "أسبوع" }, { value: "شهرًا", labelAr: "شهر" },
    ] },
    { key: "website_execution_start_rule", type: "radio", labelAr: "بداية احتساب مدة التنفيذ", required: true, options: [
      { value: "agreed_or_requirements_later", labelAr: "من التاريخ المتفق عليه أو استيفاء متطلبات البدء — أيهما لاحق" },
      { value: "contract_date", labelAr: "من تاريخ العقد" },
      { value: "specific_date", labelAr: "من تاريخ محدد" },
    ] },
    { key: "website_execution_start_date", type: "date", labelAr: "تاريخ بدء التنفيذ", visibleWhen: { fieldKey: "website_execution_start_rule", operator: "equals", value: "specific_date" }, requiredWhen: { fieldKey: "website_execution_start_rule", operator: "equals", value: "specific_date" } },
    { key: "website_duration_basis", type: "radio", labelAr: "أساس احتساب مدة التنفيذ", required: true, options: [
      { value: "بأيام العمل، ما لم يتفق الطرفان كتابةً على احتسابها بالأيام التقويمية", labelAr: "أيام العمل (الأصل في العقد)" },
      { value: "بالأيام التقويمية بناءً على اتفاق الطرفين", labelAr: "الأيام التقويمية باتفاق الطرفين" },
    ] },
    { key: "website_response_period_days", type: "number", labelAr: "مهلة رد العميل على الاستفسارات — أيام عمل", required: true, validation: { min: 1 } },
    { key: "website_review_period_days", type: "number", labelAr: "مدة مراجعة واعتماد المخرجات — أيام عمل", required: true, validation: { min: 1 } },
  ] },
  { key: "website_finance_acceptance", titleAr: "المقابل المالي والسداد والتسليم", articleRange: "المواد 10 و12 — المقابل والدفعات والمراجعة", fields: [
    { key: "website_total_price", type: "money", labelAr: "إجمالي المقابل المالي (جنيه مصري)", required: true, validation: { min: 1 } },
    { key: "website_payment_mode", type: "radio", labelAr: "طريقة السداد", required: true, options: [
      { value: "single", labelAr: "دفعة واحدة" }, { value: "installments", labelAr: "دفعات" },
    ] },
    { key: "website_single_payment_due", type: "text", labelAr: "موعد / واقعة استحقاق الدفعة الواحدة", visibleWhen: { fieldKey: "website_payment_mode", operator: "equals", value: "single" }, requiredWhen: { fieldKey: "website_payment_mode", operator: "equals", value: "single" }, placeholder: "مثال: عند توقيع العقد" },
    { key: "website_payment_schedule", type: "repeater", labelAr: "جدول الدفعات", visibleWhen: { fieldKey: "website_payment_mode", operator: "equals", value: "installments" }, requiredWhen: { fieldKey: "website_payment_mode", operator: "equals", value: "installments" }, minRows: 2, columns: [
      { key: "payment", type: "text", labelAr: "اسم / رقم الدفعة", required: true },
      { key: "amount", type: "money", labelAr: "قيمة الدفعة", required: true },
      { key: "due", type: "text", labelAr: "موعد أو واقعة الاستحقاق", required: true },
    ] },
    { key: "website_payment_method", type: "text", labelAr: "وسيلة السداد المتفق عليها", required: true, placeholder: "مثال: تحويل بنكي / إنستاباي / نقدًا" },
    { key: "website_payment_grace_days", type: "number", labelAr: "مهلة السداد قبل تعليق التنفيذ — أيام عمل", required: true, validation: { min: 1 } },
    { key: "website_restart_threshold_days", type: "number", labelAr: "مدة التعليق التي قد تستلزم إعادة جدولة المشروع — يوم", required: true, validation: { min: 1 } },
    { key: "website_restart_fee_enabled", type: "checkbox", labelAr: "يوجد اتفاق على رسوم إعادة تشغيل المشروع بعد التعليق", printInDocument: false },
    { key: "website_restart_fee_amount", type: "money", labelAr: "رسوم إعادة تشغيل المشروع (جنيه مصري)", visibleWhen: { fieldKey: "website_restart_fee_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_restart_fee_enabled", operator: "truthy" }, validation: { min: 0 } },
    { key: "website_correction_attempts", type: "number", labelAr: "عدد محاولات معالجة الملاحظات الجوهرية", required: true, validation: { min: 1 } },
  ] },
  { key: "website_warranty_services", titleAr: "الضمان والسرية والخدمات الخارجية", articleRange: "المواد 13 إلى 16 — الملكية والضمان والخدمات والسرية", fields: [
    { key: "website_warranty_duration_value", type: "number", labelAr: "مدة الضمان", required: true, validation: { min: 1 } },
    { key: "website_warranty_duration_unit", type: "select", labelAr: "وحدة مدة الضمان", required: true, options: [
      { value: "يومًا", labelAr: "يوم" }, { value: "أسبوعًا", labelAr: "أسبوع" }, { value: "شهرًا", labelAr: "شهر" }, { value: "سنة", labelAr: "سنة" },
    ] },
    { key: "website_confidentiality_years", type: "number", labelAr: "مدة استمرار السرية بعد انتهاء العقد (بالسنوات)", required: true, validation: { min: 1 } },
    { key: "website_portfolio_permission", type: "radio", labelAr: "هل يسمح لمقدم الخدمة بعرض المشروع ضمن معرض أعماله (Portfolio)؟", required: true, options: yesNo },
    { key: "website_external_services_enabled", type: "checkbox", labelAr: "يشمل الاتفاق خدمات خارجية / استضافة / دومين / تراخيص يديرها مقدم الخدمة", printInDocument: false },
    { key: "website_external_services", type: "repeater", labelAr: "الخدمات الخارجية المتفق عليها", visibleWhen: { fieldKey: "website_external_services_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_external_services_enabled", operator: "truthy" }, minRows: 1, columns: [
      { key: "service", type: "text", labelAr: "نوع الخدمة", required: true },
      { key: "provider", type: "text", labelAr: "مزود الخدمة", required: true },
      { key: "duration", type: "text", labelAr: "مدة الاشتراك", required: true },
      { key: "amount", type: "money", labelAr: "القيمة", required: true },
      { key: "payer", type: "select", labelAr: "جهة السداد", required: true, options: [
        { value: "client", labelAr: "الطرف الأول (العميل)" }, { value: "provider", labelAr: "الطرف الثاني (مقدم الخدمة)" }, { value: "shared", labelAr: "الطرفان مناصفة" },
      ] },
    ] },
  ] },
  { key: "website_communications", titleAr: "الإخطارات ووسائل التواصل", articleRange: "المادة 20 — وسائل التواصل والإخطارات", fields: [
    { key: "website_email_notices_enabled", type: "checkbox", labelAr: "اعتماد البريد الإلكتروني للإخطارات والمراسلات", printInDocument: false },
    { key: "website_notice_use_party_emails", type: "checkbox", labelAr: "استخدام نفس البريد الإلكتروني المسجل في بيانات الطرفين", visibleWhen: { fieldKey: "website_email_notices_enabled", operator: "truthy" }, printInDocument: false },
    { key: "website_notice_client_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الأول (العميل)", visibleWhen: allConditions({ fieldKey: "website_email_notices_enabled", operator: "truthy" }, { fieldKey: "website_notice_use_party_emails", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "website_email_notices_enabled", operator: "truthy" }, { fieldKey: "website_notice_use_party_emails", operator: "falsy" }) },
    { key: "website_notice_provider_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الثاني (مقدم الخدمة)", visibleWhen: allConditions({ fieldKey: "website_email_notices_enabled", operator: "truthy" }, { fieldKey: "website_notice_use_party_emails", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "website_email_notices_enabled", operator: "truthy" }, { fieldKey: "website_notice_use_party_emails", operator: "falsy" }) },
    { key: "website_messaging_apps_enabled", type: "checkbox", labelAr: "اعتماد تطبيقات المراسلة الإلكترونية (مثل WhatsApp)", printInDocument: false },
    { key: "website_messaging_apps", type: "text", labelAr: "تطبيقات المراسلة المعتمدة", placeholder: "مثال: WhatsApp", visibleWhen: { fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_messaging_apps_enabled", operator: "truthy" } },
    { key: "website_messaging_use_party_phones", type: "checkbox", labelAr: "استخدام نفس أرقام الهاتف المسجلة في بيانات الطرفين", visibleWhen: { fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, printInDocument: false },
    { key: "website_messaging_client_number", type: "text", labelAr: "رقم المراسلة المعتمد للطرف الأول (العميل)", visibleWhen: allConditions({ fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "website_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "website_messaging_use_party_phones", operator: "falsy" }) },
    { key: "website_messaging_provider_number", type: "text", labelAr: "رقم المراسلة المعتمد للطرف الثاني (مقدم الخدمة)", visibleWhen: allConditions({ fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "website_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "website_messaging_use_party_phones", operator: "falsy" }) },
    { key: "website_project_platform_enabled", type: "checkbox", labelAr: "اعتماد منصة إلكترونية لإدارة المشروع", printInDocument: false },
    { key: "website_project_platform_name", type: "text", labelAr: "اسم منصة إدارة المشروع", visibleWhen: { fieldKey: "website_project_platform_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_project_platform_enabled", operator: "truthy" } },
    { key: "website_project_platform_link", type: "text", labelAr: "رابط المشروع أو الحساب على المنصة", visibleWhen: { fieldKey: "website_project_platform_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_project_platform_enabled", operator: "truthy" } },
    { key: "website_contact_change_notice_days", type: "number", labelAr: "مهلة الإخطار بتغيير بيانات الاتصال — يوم", required: true, validation: { min: 1 } },
  ] },
  { key: "website_general_terms", titleAr: "الإنهاء والقوة القاهرة والأحكام العامة", articleRange: "المواد 18 و19 و22 — المهل والآثار والنسخ والرسوم", fields: [
    { key: "website_breach_cure_days", type: "number", labelAr: "مهلة معالجة الإخلال الجوهري — يوم", required: true, validation: { min: 1 } },
    { key: "website_nonpayment_termination_days", type: "number", labelAr: "مدة التأخر في السداد التي تجيز الإنهاء — يوم", required: true, validation: { min: 1 } },
    { key: "website_client_stoppage_days", type: "number", labelAr: "مدة توقف المشروع بسبب تقصير العميل قبل التعليق — يوم", required: true, validation: { min: 1 } },
    { key: "website_force_majeure_notice_days", type: "number", labelAr: "مهلة الإخطار بالقوة القاهرة — يوم", required: true, validation: { min: 1 } },
    { key: "website_force_majeure_termination_days", type: "number", labelAr: "مدة استمرار القوة القاهرة التي تجيز الإنهاء — يوم", required: true, validation: { min: 1 } },
    { key: "website_hardship_duration_days", type: "number", labelAr: "مدة استمرار الظروف الطارئة قبل إعادة التفاوض — يوم", required: true, validation: { min: 1 } },
    { key: "website_hardship_negotiation_days", type: "number", labelAr: "مدة التفاوض بعد الظروف الطارئة — يوم", required: true, validation: { min: 1 } },
    { key: "website_contract_copies", type: "number", labelAr: "عدد نسخ العقد الأصلية أو الإلكترونية", required: true, validation: { min: 1 } },
    { key: "website_non_solicitation_months", type: "number", labelAr: "مدة عدم استقطاب العاملين بعد انتهاء العقد — شهر", required: true, validation: { min: 1 } },
    { key: "website_legal_fees_enabled", type: "checkbox", labelAr: "يوجد اتفاق خاص على تحمل رسوم الدمغة أو الرسوم القانونية", printInDocument: false },
    { key: "website_legal_fees_payer", type: "radio", labelAr: "يتحمل الرسوم", visibleWhen: { fieldKey: "website_legal_fees_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_legal_fees_enabled", operator: "truthy" }, options: [
      { value: "الطرف الأول (العميل)", labelAr: "الطرف الأول (العميل)" }, { value: "الطرف الثاني (مقدم الخدمة)", labelAr: "الطرف الثاني (مقدم الخدمة)" }, { value: "الطرفان مناصفة", labelAr: "الطرفان مناصفة" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "website_legal_fees_other", type: "text", labelAr: "الاتفاق الآخر لتحمل الرسوم", visibleWhen: allConditions({ fieldKey: "website_legal_fees_enabled", operator: "truthy" }, { fieldKey: "website_legal_fees_payer", operator: "equals", value: "أخرى" }), requiredWhen: allConditions({ fieldKey: "website_legal_fees_enabled", operator: "truthy" }, { fieldKey: "website_legal_fees_payer", operator: "equals", value: "أخرى" }) },
  ] },
  { key: "website_witnesses", titleAr: "الشهود (اختياري)", articleRange: "بيانات التوقيع والشهود", fields: [
    { key: "website_witness_1_enabled", type: "checkbox", labelAr: "إضافة الشاهد الأول", printInDocument: false },
    { key: "website_witness_1_name", type: "text", labelAr: "اسم الشاهد الأول", visibleWhen: { fieldKey: "website_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "website_witness_1_national_id", type: "text", labelAr: "الرقم القومي للشاهد الأول", visibleWhen: { fieldKey: "website_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "website_witness_2_enabled", type: "checkbox", labelAr: "إضافة الشاهد الثاني", printInDocument: false },
    { key: "website_witness_2_name", type: "text", labelAr: "اسم الشاهد الثاني", visibleWhen: { fieldKey: "website_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_witness_2_enabled", operator: "truthy" }, printInDocument: false },
    { key: "website_witness_2_national_id", type: "text", labelAr: "الرقم القومي للشاهد الثاني", visibleWhen: { fieldKey: "website_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_witness_2_enabled", operator: "truthy" }, printInDocument: false },
  ] },
  { key: "website_jurisdiction", titleAr: "المحكمة المختصة", articleRange: "المادة 21 — الاختصاص القضائي وتسوية المنازعات", fields: [
    { key: "website_competent_court", type: "select", labelAr: "المحكمة المختصة", required: true, options: freelancerCourtOptions, helpText: "اختر المحكمة المتفق عليها بين الطرفين، مع مراعاة قواعد الاختصاص القضائي الآمرة." },
    { key: "website_competent_court_other", type: "text", labelAr: "اسم المحكمة الأخرى", visibleWhen: { fieldKey: "website_competent_court", operator: "equals", value: "أخرى" }, requiredWhen: { fieldKey: "website_competent_court", operator: "equals", value: "أخرى" } },
  ] },
  reviewStep("website_review"),
];

const socialContentServicesCondition = anyConditions(
  { fieldKey: "social_service_copywriting", operator: "truthy" },
  { fieldKey: "social_service_design", operator: "truthy" },
  { fieldKey: "social_service_content_production", operator: "truthy" },
  { fieldKey: "social_service_publishing", operator: "truthy" },
  { fieldKey: "social_service_photography", operator: "truthy" },
);

const socialSteps: WizardStepDefinition[] = [
  { key: "social_contract_meta", titleAr: "بيانات العقد", articleRange: "صدر العقد وتاريخ تحريره", fields: [contractDateField] },
  ...socialPartySteps(),
  { key: "social_activity_accounts", titleAr: "بيانات النشاط والحسابات", articleRange: "المواد 1 و3 و4 و6 — تعريف النشاط والمنصات والحسابات", fields: [
    { key: "social_project_name", type: "text", labelAr: "اسم المشروع أو النشاط التجاري", required: true },
    { key: "social_brand_name", type: "text", labelAr: "اسم العلامة التجارية — إن وجدت" },
    { key: "social_business_nature", type: "text", labelAr: "طبيعة النشاط", required: true },
    { key: "social_target_market", type: "text", labelAr: "الدولة أو النطاق الجغرافي المستهدف", required: true },
    { key: "social_target_audience", type: "textarea", labelAr: "الفئة المستهدفة", required: true },
    { key: "social_project_brief", type: "textarea", labelAr: "نبذة مختصرة عن النشاط أو المشروع (اختياري)" },
    { key: "social_accounts", type: "repeater", labelAr: "الحسابات والمنصات المشمولة بالخدمة", required: true, minRows: 1, columns: [
      { key: "platform", type: "select", labelAr: "المنصة", required: true, options: [
        { value: "facebook", labelAr: "Facebook" }, { value: "instagram", labelAr: "Instagram" }, { value: "tiktok", labelAr: "TikTok" },
        { value: "x", labelAr: "X" }, { value: "linkedin", labelAr: "LinkedIn" }, { value: "youtube", labelAr: "YouTube" },
        { value: "snapchat", labelAr: "Snapchat" }, { value: "threads", labelAr: "Threads" }, { value: "other", labelAr: "أخرى" },
      ] },
      { key: "platform_other", type: "text", labelAr: "اسم المنصة الأخرى", visibleWhen: { fieldKey: "platform", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "platform", operator: "equals", value: "other" } },
      { key: "account", type: "text", labelAr: "اسم / رابط / Handle الحساب", required: true },
    ] },
    { key: "social_project_manager_custom", type: "checkbox", labelAr: "تعيين مسؤول مشروع مختلف عن العميل / ممثله القانوني", printInDocument: false },
    { key: "social_project_manager", type: "text", labelAr: "اسم مسؤول المشروع", visibleWhen: { fieldKey: "social_project_manager_custom", operator: "truthy" }, requiredWhen: { fieldKey: "social_project_manager_custom", operator: "truthy" } },
    { key: "social_approval_person_custom", type: "checkbox", labelAr: "تعيين مسؤول اعتماد مختلف عن العميل / ممثله القانوني", printInDocument: false },
    { key: "social_approval_person", type: "text", labelAr: "اسم المسؤول عن الاعتماد", visibleWhen: { fieldKey: "social_approval_person_custom", operator: "truthy" }, requiredWhen: { fieldKey: "social_approval_person_custom", operator: "truthy" } },
    { key: "social_billing_contact_custom", type: "checkbox", labelAr: "تعيين مسؤول فواتير / مدفوعات مختلف عن العميل / ممثله القانوني", printInDocument: false },
    { key: "social_billing_contact", type: "text", labelAr: "اسم مسؤول الفواتير أو المدفوعات", visibleWhen: { fieldKey: "social_billing_contact_custom", operator: "truthy" }, requiredWhen: { fieldKey: "social_billing_contact_custom", operator: "truthy" } },
  ] },
  { key: "social_services", titleAr: "نطاق الخدمات", articleRange: "المادتان 4 و6 — الخدمات المشمولة والمستبعدة", fields: [
    { key: "social_service_account_management", type: "checkbox", labelAr: "إدارة الحسابات والصفحات" },
    { key: "social_service_strategy", type: "checkbox", labelAr: "استراتيجية / خطة المحتوى والتقويم التحريري" },
    { key: "social_service_copywriting", type: "checkbox", labelAr: "كتابة المحتوى" },
    { key: "social_service_design", type: "checkbox", labelAr: "تصميم المنشورات والمواد البصرية" },
    { key: "social_service_content_production", type: "checkbox", labelAr: "إنتاج / تنسيق / مراجعة المحتوى الرقمي" },
    { key: "social_service_publishing", type: "checkbox", labelAr: "جدولة ونشر المحتوى" },
    { key: "social_service_paid_ads", type: "checkbox", labelAr: "إدارة أو متابعة الحملات الإعلانية" },
    { key: "social_service_reports", type: "checkbox", labelAr: "التقارير والتحليلات ومتابعة مؤشرات الأداء" },
    { key: "social_service_community_management", type: "checkbox", labelAr: "الرد على الرسائل والتعليقات وإدارة المجتمع الرقمي" },
    { key: "social_service_coordination", type: "checkbox", labelAr: "التنسيق مع مقدمي الخدمات أو الجهات ذات الصلة" },
    { key: "social_service_photography", type: "checkbox", labelAr: "التصوير / إنتاج الفيديو أو التسجيلات" },
    { key: "social_service_influencers", type: "checkbox", labelAr: "التنسيق أو الإدارة مع المؤثرين" },
    { key: "social_service_other_enabled", type: "checkbox", labelAr: "خدمة أخرى" },
    { key: "social_service_other", type: "textarea", labelAr: "وصف الخدمة الأخرى", visibleWhen: { fieldKey: "social_service_other_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_service_other_enabled", operator: "truthy" } },
  ] },
  { key: "social_content_scope", titleAr: "المحتوى والكميات ووتيرة التنفيذ", articleRange: "المادة 6 — أنواع المحتوى والمخرجات ووتيرة النشر", visibleWhen: socialContentServicesCondition, fields: [
    { key: "social_content_plan", type: "repeater", labelAr: "أنواع المحتوى والكميات المتفق عليها", required: true, minRows: 1, columns: [
      { key: "content_type", type: "select", labelAr: "نوع المحتوى", required: true, options: [
        { value: "posts", labelAr: "منشورات Posts" }, { value: "stories", labelAr: "قصص Stories" }, { value: "reels", labelAr: "Reels" },
        { value: "videos", labelAr: "فيديوهات" }, { value: "designs", labelAr: "تصميمات" }, { value: "articles", labelAr: "مقالات / نصوص طويلة" }, { value: "other", labelAr: "أخرى" },
      ] },
      { key: "content_type_other", type: "text", labelAr: "نوع المحتوى الآخر", visibleWhen: { fieldKey: "content_type", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "content_type", operator: "equals", value: "other" } },
      { key: "quantity", type: "number", labelAr: "الكمية", required: true },
      { key: "frequency", type: "select", labelAr: "الدورية / الوتيرة", required: true, options: [
        { value: "weekly", labelAr: "أسبوعيًا" }, { value: "biweekly", labelAr: "كل أسبوعين" }, { value: "monthly", labelAr: "شهريًا" }, { value: "campaign", labelAr: "لكل حملة" }, { value: "once", labelAr: "مرة واحدة" }, { value: "other", labelAr: "أخرى" },
      ] },
      { key: "frequency_other", type: "text", labelAr: "الدورية الأخرى", visibleWhen: { fieldKey: "frequency", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "frequency", operator: "equals", value: "other" } },
    ] },
    { key: "social_content_scope_notes", type: "textarea", labelAr: "ملاحظات تنفيذية على خطة المحتوى — إن وجدت" },
  ] },
  { key: "social_ads", titleAr: "الحملات الإعلانية والميزانية", articleRange: "المواد 4 و6 و10 — الحملات والميزانية الإعلانية", visibleWhen: { fieldKey: "social_service_paid_ads", operator: "truthy" }, fields: [
    { key: "social_ad_budget_mode", type: "radio", labelAr: "طريقة تحديد ميزانية الإعلانات", required: true, options: [
      { value: "fixed", labelAr: "ميزانية محددة في العقد" }, { value: "per_campaign", labelAr: "تحدد لكل حملة باعتماد مستقل" },
    ] },
    { key: "social_ad_budget_amount", type: "money", labelAr: "قيمة الميزانية الإعلانية", visibleWhen: { fieldKey: "social_ad_budget_mode", operator: "equals", value: "fixed" }, requiredWhen: { fieldKey: "social_ad_budget_mode", operator: "equals", value: "fixed" }, validation: { min: 1 } },
    { key: "social_ad_budget_period", type: "select", labelAr: "دورية الميزانية", visibleWhen: { fieldKey: "social_ad_budget_mode", operator: "equals", value: "fixed" }, requiredWhen: { fieldKey: "social_ad_budget_mode", operator: "equals", value: "fixed" }, options: [
      { value: "monthly", labelAr: "شهريًا" }, { value: "weekly", labelAr: "أسبوعيًا" }, { value: "campaign", labelAr: "لكل حملة" }, { value: "contract", labelAr: "طوال مدة العقد" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "social_ad_budget_period_other", type: "text", labelAr: "دورية الميزانية الأخرى", visibleWhen: allConditions({ fieldKey: "social_ad_budget_mode", operator: "equals", value: "fixed" }, { fieldKey: "social_ad_budget_period", operator: "equals", value: "other" }), requiredWhen: allConditions({ fieldKey: "social_ad_budget_mode", operator: "equals", value: "fixed" }, { fieldKey: "social_ad_budget_period", operator: "equals", value: "other" }) },
    { key: "social_ad_budget_payer", type: "select", labelAr: "الطرف الذي يتحمل ميزانية الإعلانات", required: true, options: [
      { value: "client", labelAr: "الطرف الأول (العميل)" }, { value: "provider", labelAr: "الطرف الثاني (مقدم الخدمة)" }, { value: "shared", labelAr: "الطرفان وفق اتفاق مشترك" },
    ] },
    { key: "social_ad_budget_included_in_fee", type: "radio", labelAr: "هل ميزانية الإعلانات داخلة ضمن المقابل المالي للخدمات؟", required: true, options: yesNo },
    { key: "social_ad_payment_management", type: "select", labelAr: "إدارة وسيلة الدفع الإعلانية", required: true, options: [
      { value: "client_direct", labelAr: "العميل يسدد مباشرة للمنصة" }, { value: "provider_managed", labelAr: "مقدم الخدمة يدير وسيلة الدفع / الميزانية نيابةً عن العميل" },
    ] },
  ] },
  { key: "social_reports_kpis", titleAr: "التقارير ومؤشرات الأداء", articleRange: "المواد 3 و6 و8 — التقارير وKPIs", fields: [
    { key: "social_report_frequency", type: "select", labelAr: "وتيرة التقارير الدورية", visibleWhen: { fieldKey: "social_service_reports", operator: "truthy" }, requiredWhen: { fieldKey: "social_service_reports", operator: "truthy" }, options: [
      { value: "weekly", labelAr: "أسبوعيًا" }, { value: "biweekly", labelAr: "كل أسبوعين" }, { value: "monthly", labelAr: "شهريًا" }, { value: "quarterly", labelAr: "ربع سنوي" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "social_report_frequency_other", type: "text", labelAr: "وتيرة التقارير الأخرى", visibleWhen: allConditions({ fieldKey: "social_service_reports", operator: "truthy" }, { fieldKey: "social_report_frequency", operator: "equals", value: "other" }), requiredWhen: allConditions({ fieldKey: "social_service_reports", operator: "truthy" }, { fieldKey: "social_report_frequency", operator: "equals", value: "other" }) },
    { key: "social_kpi_enabled", type: "checkbox", labelAr: "يوجد مؤشرات أداء (KPIs) متفق عليها", printInDocument: false },
    { key: "social_kpi_effect", type: "radio", labelAr: "الأثر التعاقدي لمؤشرات الأداء", visibleWhen: { fieldKey: "social_kpi_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_kpi_enabled", operator: "truthy" }, options: [
      { value: "guidance", labelAr: "مؤشرات قياس وإرشاد وليست ضمان نتيجة" }, { value: "contractual", labelAr: "التزام تعاقدي بالمستويات المحددة" },
    ] },
    { key: "social_kpis", type: "repeater", labelAr: "مؤشرات الأداء المتفق عليها", visibleWhen: { fieldKey: "social_kpi_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_kpi_enabled", operator: "truthy" }, minRows: 1, columns: [
      { key: "indicator", type: "text", labelAr: "المؤشر", required: true }, { key: "target", type: "text", labelAr: "المستهدف / طريقة القياس", required: true },
    ] },
  ] },
  { key: "social_term_finance", titleAr: "مدة العقد والمقابل المالي والسداد", articleRange: "المادتان 9 و10 — المدة والبدء والمقابل وآلية السداد", fields: [
    { key: "social_service_start_date", type: "date", labelAr: "تاريخ بدء تقديم الخدمات", required: true },
    { key: "social_contract_duration_value", type: "number", labelAr: "مدة العقد", required: true, validation: { min: 1 } },
    { key: "social_contract_duration_unit", type: "select", labelAr: "وحدة مدة العقد", required: true, options: [
      { value: "days", labelAr: "يوم" }, { value: "weeks", labelAr: "أسبوع" }, { value: "months", labelAr: "شهر" }, { value: "years", labelAr: "سنة" },
    ] },
    { key: "social_fee_nature", type: "select", labelAr: "طبيعة المقابل المالي", required: true, options: [
      { value: "total", labelAr: "إجمالي" }, { value: "periodic", labelAr: "دوري" },
    ] },
    { key: "social_fee", type: "money", labelAr: "المقابل المالي المتفق عليه (جنيه مصري)", required: true, validation: { min: 1 } },
    { key: "social_fee_periodicity", type: "select", labelAr: "دورية المقابل المالي", visibleWhen: { fieldKey: "social_fee_nature", operator: "equals", value: "periodic" }, requiredWhen: { fieldKey: "social_fee_nature", operator: "equals", value: "periodic" }, options: [
      { value: "weekly", labelAr: "أسبوعيًا" }, { value: "monthly", labelAr: "شهريًا" }, { value: "quarterly", labelAr: "كل ثلاثة أشهر" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "social_fee_periodicity_other", type: "text", labelAr: "الدورية الأخرى", visibleWhen: allConditions({ fieldKey: "social_fee_nature", operator: "equals", value: "periodic" }, { fieldKey: "social_fee_periodicity", operator: "equals", value: "other" }), requiredWhen: allConditions({ fieldKey: "social_fee_nature", operator: "equals", value: "periodic" }, { fieldKey: "social_fee_periodicity", operator: "equals", value: "other" }) },
    { key: "social_payment_mode", type: "radio", labelAr: "طريقة سداد المقابل الإجمالي", visibleWhen: { fieldKey: "social_fee_nature", operator: "equals", value: "total" }, requiredWhen: { fieldKey: "social_fee_nature", operator: "equals", value: "total" }, options: [
      { value: "single", labelAr: "دفعة واحدة" }, { value: "installments", labelAr: "عدة دفعات / مراحل" },
    ] },
    { key: "social_single_payment_due", type: "text", labelAr: "موعد أو واقعة استحقاق الدفعة الواحدة", visibleWhen: allConditions({ fieldKey: "social_fee_nature", operator: "equals", value: "total" }, { fieldKey: "social_payment_mode", operator: "equals", value: "single" }), requiredWhen: allConditions({ fieldKey: "social_fee_nature", operator: "equals", value: "total" }, { fieldKey: "social_payment_mode", operator: "equals", value: "single" }) },
    { key: "social_payment_schedule", type: "repeater", labelAr: "جدول الدفعات", visibleWhen: allConditions({ fieldKey: "social_fee_nature", operator: "equals", value: "total" }, { fieldKey: "social_payment_mode", operator: "equals", value: "installments" }), requiredWhen: allConditions({ fieldKey: "social_fee_nature", operator: "equals", value: "total" }, { fieldKey: "social_payment_mode", operator: "equals", value: "installments" }), minRows: 1, columns: [
      { key: "payment", type: "text", labelAr: "اسم الدفعة / المرحلة", required: true }, { key: "amount", type: "money", labelAr: "القيمة", required: true }, { key: "due", type: "text", labelAr: "موعد / سبب الاستحقاق", required: true },
    ] },
    { key: "social_periodic_due", type: "text", labelAr: "موعد استحقاق المقابل الدوري", visibleWhen: { fieldKey: "social_fee_nature", operator: "equals", value: "periodic" }, requiredWhen: { fieldKey: "social_fee_nature", operator: "equals", value: "periodic" }, helpText: "مثال: اليوم الأول من كل شهر." },
    { key: "social_payment_method", type: "select", labelAr: "وسيلة السداد", required: true, options: [
      { value: "bank", labelAr: "تحويل بنكي" }, { value: "electronic", labelAr: "دفع إلكتروني / محفظة / Instapay" }, { value: "cash", labelAr: "نقدًا بموجب إيصال" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "social_payment_method_other", type: "text", labelAr: "وسيلة السداد الأخرى", visibleWhen: { fieldKey: "social_payment_method", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "social_payment_method", operator: "equals", value: "other" } },
    { key: "social_payment_grace_days", type: "number", labelAr: "مهلة السداد قبل تعليق التنفيذ — أيام عمل", required: true, validation: { min: 1 } },
    { key: "social_legal_fees_enabled", type: "checkbox", labelAr: "إدراج الحكم الخاص بالرسوم والضرائب القانونية", printInDocument: false },
  ] },
  { key: "social_review_ip", titleAr: "المراجعة والملفات والملكية وPortfolio", articleRange: "المواد 12 و13 و16 و18", fields: [
    { key: "social_content_review_days", type: "number", labelAr: "مدة مراجعة واعتماد المحتوى — أيام عمل", required: true, validation: { min: 1 } },
    { key: "social_review_rounds", type: "number", labelAr: "عدد جولات المراجعة المشمولة — اختياري", validation: { min: 1 } },
    { key: "social_source_files_included", type: "radio", labelAr: "هل يشمل العقد تسليم الملفات الأصلية / المفتوحة / القابلة للتعديل؟", required: true, options: yesNo },
    { key: "social_source_file_types", type: "text", labelAr: "أنواع الملفات الأصلية التي سيتم تسليمها", visibleWhen: { fieldKey: "social_source_files_included", operator: "equals", value: "yes" }, requiredWhen: { fieldKey: "social_source_files_included", operator: "equals", value: "yes" }, helpText: "مثال: PSD، AI، Canva، ملفات المشروع الأصلية." },
    { key: "social_source_files_price_mode", type: "radio", labelAr: "المقابل المالي للملفات الأصلية", visibleWhen: { fieldKey: "social_source_files_included", operator: "equals", value: "yes" }, requiredWhen: { fieldKey: "social_source_files_included", operator: "equals", value: "yes" }, options: [
      { value: "included", labelAr: "مشمولة في المقابل المالي للعقد" }, { value: "additional", labelAr: "لها مقابل إضافي" },
    ] },
    { key: "social_source_files_additional_fee", type: "money", labelAr: "المقابل الإضافي للملفات الأصلية", visibleWhen: allConditions({ fieldKey: "social_source_files_included", operator: "equals", value: "yes" }, { fieldKey: "social_source_files_price_mode", operator: "equals", value: "additional" }), requiredWhen: allConditions({ fieldKey: "social_source_files_included", operator: "equals", value: "yes" }, { fieldKey: "social_source_files_price_mode", operator: "equals", value: "additional" }), validation: { min: 1 } },
    { key: "social_portfolio_permission", type: "radio", labelAr: "هل يسمح لمقدم الخدمة بعرض نماذج من الأعمال في Portfolio؟", required: true, options: yesNo },
    { key: "social_ai_external_data_permission", type: "radio", labelAr: "هل يسمح باستخدام بيانات أو محتوى غير منشور في أدوات ذكاء اصطناعي خارجية لا تضمن عدم التدريب على البيانات؟", required: true, options: yesNo, helpText: "الافتراضي الأكثر حماية هو لا." },
  ] },
  { key: "social_delay_termination", titleAr: "الجزاء ومدد الإنهاء والقوة القاهرة والأحكام العامة", articleRange: "المواد 14 و18 و19 و22", fields: [
    { key: "social_delay_penalty_mode", type: "radio", labelAr: "طريقة احتساب الجزاء عن كل يوم تأخير", required: true, options: [
      { value: "amount", labelAr: "مبلغ ثابت بالجنيه المصري عن كل يوم تأخير" }, { value: "percentage", labelAr: "نسبة من قيمة المرحلة عن كل يوم تأخير" },
    ] },
    { key: "social_delay_penalty_amount", type: "money", labelAr: "قيمة الجزاء عن كل يوم تأخير (جنيه مصري)", visibleWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "amount" }, requiredWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "amount" }, validation: { min: 1 } },
    { key: "social_delay_penalty_percentage", type: "number", labelAr: "نسبة الجزاء من قيمة المرحلة عن كل يوم تأخير (%)", visibleWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "percentage" }, requiredWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "percentage" }, validation: { min: 0.01, max: 100 } },
    { key: "social_delay_penalty_cap_percentage", type: "number", labelAr: "الحد الأقصى لإجمالي الجزاء (%)", required: true, validation: { min: 0.01, max: 100 } },
    { key: "social_delay_penalty_cure_days", type: "number", labelAr: "مهلة معالجة التأخير قبل استحقاق الجزاء — أيام عمل", required: true, validation: { min: 1 } },
    { key: "social_breach_cure_days", type: "number", labelAr: "مهلة معالجة الإخلال الجوهري — يوم", required: true, validation: { min: 1 } },
    { key: "social_nonpayment_termination_days", type: "number", labelAr: "استمرار عدم السداد قبل حق الإنهاء — أيام عمل", required: true, validation: { min: 1 } },
    { key: "social_client_stoppage_days", type: "number", labelAr: "توقف المشروع بسبب العميل قبل التعليق — أيام عمل", required: true, validation: { min: 1 } },
    { key: "social_client_post_notice_termination_days", type: "number", labelAr: "المهلة بعد إخطار العميل قبل حق الإنهاء — أيام عمل", required: true, validation: { min: 1 } },
    { key: "social_force_majeure_notice_days", type: "number", labelAr: "مهلة إخطار القوة القاهرة / الظروف الطارئة — أيام عمل", required: true, validation: { min: 1 } },
    { key: "social_contract_copies", type: "number", labelAr: "عدد نسخ العقد الأصلية أو الإلكترونية", required: true, validation: { min: 1 } },
  ] },
  { key: "social_communications", titleAr: "الإخطارات ووسائل الاتصال المعتمدة", articleRange: "المادة 20 — الإخطارات والمراسلات", fields: [
    { key: "social_email_notices_enabled", type: "checkbox", labelAr: "اعتماد البريد الإلكتروني للمراسلات والاعتمادات", printInDocument: false },
    { key: "social_notice_use_party_emails", type: "checkbox", labelAr: "استخدام نفس البريد المسجل في بيانات الطرفين", visibleWhen: { fieldKey: "social_email_notices_enabled", operator: "truthy" }, printInDocument: false },
    { key: "social_notice_client_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الأول", visibleWhen: allConditions({ fieldKey: "social_email_notices_enabled", operator: "truthy" }, { fieldKey: "social_notice_use_party_emails", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "social_email_notices_enabled", operator: "truthy" }, { fieldKey: "social_notice_use_party_emails", operator: "falsy" }) },
    { key: "social_notice_provider_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الثاني", visibleWhen: allConditions({ fieldKey: "social_email_notices_enabled", operator: "truthy" }, { fieldKey: "social_notice_use_party_emails", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "social_email_notices_enabled", operator: "truthy" }, { fieldKey: "social_notice_use_party_emails", operator: "falsy" }) },
    { key: "social_messaging_apps_enabled", type: "checkbox", labelAr: "اعتماد WhatsApp / تطبيق مراسلة لتنفيذ المشروع", printInDocument: false },
    { key: "social_messaging_apps", type: "select", labelAr: "تطبيق المراسلة المعتمد", visibleWhen: { fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, options: [
      { value: "whatsapp", labelAr: "WhatsApp" }, { value: "telegram", labelAr: "Telegram" }, { value: "whatsapp_telegram", labelAr: "WhatsApp وTelegram" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "social_messaging_apps_other", type: "text", labelAr: "تطبيق المراسلة الآخر", visibleWhen: allConditions({ fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "social_messaging_apps", operator: "equals", value: "other" }), requiredWhen: allConditions({ fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "social_messaging_apps", operator: "equals", value: "other" }) },
    { key: "social_messaging_use_party_phones", type: "checkbox", labelAr: "استخدام نفس أرقام الهاتف المسجلة في بيانات الطرفين", visibleWhen: { fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, printInDocument: false },
    { key: "social_messaging_client_number", type: "text", labelAr: "رقم المراسلة المعتمد للطرف الأول", visibleWhen: allConditions({ fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "social_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "social_messaging_use_party_phones", operator: "falsy" }) },
    { key: "social_messaging_provider_number", type: "text", labelAr: "رقم المراسلة المعتمد للطرف الثاني", visibleWhen: allConditions({ fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "social_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "social_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "social_messaging_use_party_phones", operator: "falsy" }) },
  ] },
  { key: "social_witnesses", titleAr: "الشهود (اختياري)", articleRange: "بيانات التوقيع والشهود", fields: [
    { key: "social_witness_1_enabled", type: "checkbox", labelAr: "إضافة الشاهد الأول", printInDocument: false },
    { key: "social_witness_1_name", type: "text", labelAr: "اسم الشاهد الأول", visibleWhen: { fieldKey: "social_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "social_witness_1_national_id", type: "text", labelAr: "الرقم القومي للشاهد الأول", visibleWhen: { fieldKey: "social_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "social_witness_2_enabled", type: "checkbox", labelAr: "إضافة الشاهد الثاني", printInDocument: false },
    { key: "social_witness_2_name", type: "text", labelAr: "اسم الشاهد الثاني", visibleWhen: { fieldKey: "social_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_witness_2_enabled", operator: "truthy" }, printInDocument: false },
    { key: "social_witness_2_national_id", type: "text", labelAr: "الرقم القومي للشاهد الثاني", visibleWhen: { fieldKey: "social_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_witness_2_enabled", operator: "truthy" }, printInDocument: false },
  ] },
  { key: "social_jurisdiction", titleAr: "المحكمة المختصة", articleRange: "المادة 21 — الاختصاص القضائي وتسوية المنازعات", fields: [
    { key: "social_competent_court", type: "select", labelAr: "المحكمة المختصة", required: true, options: freelancerCourtOptions, helpText: "اختر المحكمة المتفق عليها بين الطرفين، مع مراعاة قواعد الاختصاص القضائي الآمرة." },
    { key: "social_competent_court_other", type: "text", labelAr: "اسم المحكمة الأخرى", visibleWhen: { fieldKey: "social_competent_court", operator: "equals", value: "أخرى" }, requiredWhen: { fieldKey: "social_competent_court", operator: "equals", value: "أخرى" } },
  ] },
  reviewStep("social_review"),
];

function serviceCheckboxFields(prefix: string, services: Array<[string, string]>): WizardFieldDefinition[] {
  return services.map(([key, label]) => ({ key: `${prefix}_${key}`, type: "checkbox", labelAr: label }));
}

const visualScopeSteps: WizardStepDefinition[] = [
  { key: "visual_scope_contract_link", titleAr: "بيانات ارتباط الملحق بالعقد", fields: [
    { key: "visual_scope_original_contract_date", type: "date", labelAr: "تاريخ العقد الأصلي" },
    { key: "visual_scope_client_name", type: "text", labelAr: "الطرف الأول (العميل)" },
    { key: "visual_scope_designer_name", type: "text", labelAr: "الطرف الثاني (المصمم)" },
  ] },
  { key: "visual_scope_project", titleAr: "المادة الأولى: بيانات المشروع", fields: [
    { key: "visual_scope_project_name", type: "text", labelAr: "اسم المشروع أو العلامة التجارية" },
    { key: "visual_scope_activity", type: "text", labelAr: "طبيعة النشاط" },
    { key: "visual_scope_purpose", type: "textarea", labelAr: "الغرض من المشروع" },
    { key: "visual_scope_target_audience", type: "textarea", labelAr: "الفئة المستهدفة" },
    { key: "visual_scope_special_requirements", type: "textarea", labelAr: "بيانات أو متطلبات خاصة بالمشروع" },
    { key: "visual_scope_approver_name", type: "text", labelAr: "اسم الشخص المعتمد من الطرف الأول لاعتماد الأعمال" },
    { key: "visual_scope_approver_contact", type: "text", labelAr: "وسيلة التواصل المعتمدة معه" },
  ] },
  { key: "visual_scope_services", titleAr: "المادة الثانية: نطاق الخدمات — يحدد المشمول بعلامة ✓", fields: [
    ...serviceCheckboxFields("visual_service", [
      ["new_logo", "تصميم شعار جديد"], ["develop_logo", "تطوير شعار قائم"], ["arabic_logo", "تصميم الشعار العربي"],
      ["english_logo", "تصميم الشعار الإنجليزي"], ["icon", "تصميم نسخة أيقونة (Icon)"], ["colors", "اختيار الألوان الرسمية"],
      ["fonts", "اختيار الخطوط الرسمية"], ["patterns", "تصميم العناصر والأنماط البصرية"], ["icons", "تصميم الأيقونات"],
      ["guideline", "إعداد دليل الهوية البصرية"], ["business_card", "تصميم بطاقة أعمال"], ["letterhead", "تصميم ورق المراسلات"],
      ["envelope", "تصميم المظروف"], ["invoice", "تصميم الفاتورة"], ["email_signature", "تصميم توقيع البريد الإلكتروني"],
      ["social_files", "تصميم ملفات السوشيال ميديا"], ["social_covers", "تصميم أغلفة صفحات التواصل الاجتماعي"],
      ["post_templates", "تصميم قوالب منشورات"], ["presentation", "تصميم عروض تقديمية"],
      ["print_files", "تصميم ملفات للطباعة"], ["digital_files", "تصميم ملفات رقمية"],
    ]),
    { key: "visual_service_other", type: "text", labelAr: "خدمات أخرى", manualCheckbox: true },
  ] },
  { key: "visual_scope_outputs", titleAr: "المادة الثالثة: المخرجات والمقابل المالي", fields: [
    { key: "visual_outputs", type: "repeater", labelAr: "جدول المخرجات", blankRows: 12, blankRowLabels: [
      "عدد مقترحات الشعار الأولية", "عدد التصميمات النهائية للشعار", "بطاقة أعمال", "ورق مراسلات", "مظروف", "توقيع بريد إلكتروني",
      "قوالب منشورات", "أغلفة صفحات", "دليل الهوية البصرية", "ملفات للطباعة", "ملفات رقمية", "مخرجات أخرى",
    ], columns: [
      { key: "output", type: "text", labelAr: "المخرج" },
      { key: "quantity", type: "number", labelAr: "الكمية" },
      { key: "value", type: "money", labelAr: "القيمة (إن وجدت)" },
    ] },
  ] },
  { key: "visual_scope_reviews", titleAr: "المادة الرابعة: المراجعات والاعتماد", fields: [
    { key: "visual_included_review_rounds", type: "number", labelAr: "عدد جولات المراجعة المتفق عليها" },
    { key: "visual_approval_days", type: "number", labelAr: "المدة المحددة لإرسال ملاحظات كل جولة — أيام عمل" },
  ] },
  { key: "visual_scope_delivery", titleAr: "المادة الخامسة: التسليم والملفات المصدرية", fields: [
    ...serviceCheckboxFields("visual_delivery_format", [
      ["pdf", "PDF"], ["png", "PNG"], ["jpg", "JPG"], ["svg", "SVG"], ["eps", "EPS"],
      ["print_ready", "ملفات جاهزة للطباعة"], ["digital_ready", "ملفات مهيأة للاستخدام الرقمي"],
    ]),
    { key: "visual_delivery_format_other", type: "text", labelAr: "صيغ أخرى", manualCheckbox: true },
    ...serviceCheckboxFields("visual_source_file", [
      ["ai", "AI"], ["psd", "PSD"], ["fig", "FIG"], ["indd", "INDD"], ["canva", "Canva"],
    ]),
    { key: "visual_source_file_other", type: "text", labelAr: "ملفات مصدرية أخرى", manualCheckbox: true },
    { key: "visual_source_files_extra_price", type: "money", labelAr: "المقابل المالي الإضافي للملفات المصدرية (إن وجد)" },
    { key: "visual_source_files_delivery_date", type: "text", labelAr: "موعد تسليم الملفات المصدرية (إن وجد)" },
    ...serviceCheckboxFields("visual_delivery_method", [
      ["email", "البريد الإلكتروني"], ["download", "رابط تحميل إلكتروني"], ["cloud", "خدمة تخزين سحابي"], ["digital_storage", "وسيط تخزين رقمي"],
    ]),
    { key: "visual_delivery_method_other", type: "text", labelAr: "وسيلة تسليم أخرى", manualCheckbox: true },
  ] },
  { key: "visual_scope_client_materials", titleAr: "المادة السادسة: العناصر المقدمة من الطرف الأول والتراخيص والخدمات المقدمة من الغير", fields: [
    ...serviceCheckboxFields("visual_client_material", [
      ["current_logo", "الشعار الحالي"], ["current_brand_guide", "دليل الهوية البصرية الحالي"], ["content", "النصوص والمحتوى"],
      ["images", "الصور"], ["trademarks", "الشعارات أو العلامات التجارية"], ["licensed_fonts", "الخطوط المرخصة"],
      ["approved_colors", "الألوان المعتمدة"], ["previous_designs", "ملفات التصميم السابقة"], ["print_files", "ملفات الطباعة"],
      ["accounts", "بيانات الحسابات والمنصات"],
    ]),
    { key: "visual_client_material_other", type: "text", labelAr: "عناصر أخرى", manualCheckbox: true },
    { key: "visual_third_party_items", type: "repeater", labelAr: "العناصر أو الخدمات المقدمة من الغير", blankRows: 5, columns: [
      { key: "item", type: "text", labelAr: "العنصر أو الخدمة" },
      { key: "provider", type: "text", labelAr: "مقدم الخدمة" },
      { key: "cost_bearer", type: "select", labelAr: "يتحمل التكلفة", options: [
        { value: "client", labelAr: "العميل" }, { value: "designer", labelAr: "المصمم" }, { value: "shared", labelAr: "مشترك" },
      ] },
      { key: "share", type: "text", labelAr: "نسبة التحمل" },
      { key: "license", type: "text", labelAr: "مدة أو نطاق الترخيص" },
    ] },
  ] },
  { key: "visual_scope_schedule", titleAr: "المادة السابعة: الجدول الزمني للمشروع وبيانات الملحق", fields: [
    { key: "visual_schedule", type: "repeater", labelAr: "الجدول الزمني", blankRows: 6, blankRowLabels: [
      "المرحلة الأولى", "المرحلة الثانية", "المرحلة الثالثة", "المرحلة الرابعة", "المرحلة الخامسة", "التسليم النهائي",
    ], columns: [
      { key: "stage", type: "text", labelAr: "المرحلة" }, { key: "start_date", type: "date", labelAr: "تاريخ البدء" },
      { key: "delivery_date", type: "date", labelAr: "تاريخ التسليم" }, { key: "approval_date", type: "date", labelAr: "تاريخ الاعتماد" },
    ] },
    { key: "visual_scope_annex_number", type: "text", labelAr: "رقم الملحق" },
    { key: "visual_scope_annex_date", type: "date", labelAr: "تاريخ تحرير الملحق" },
    { key: "visual_scope_annex_pages", type: "number", labelAr: "عدد صفحات الملحق" },
  ] },
];

const visualFinancialSteps: WizardStepDefinition[] = [
  { key: "visual_financial_header", titleAr: "بيانات الملحق", fields: [
    { key: "visual_financial_original_contract_date", type: "date", labelAr: "تاريخ العقد الأصلي" },
    { key: "visual_financial_annex_reference", type: "text", labelAr: "رقم الملحق المرجعي" },
    { key: "visual_financial_annex_date", type: "date", labelAr: "تاريخ تحرير الملحق" },
  ] },
  { key: "visual_financial_terms", titleAr: "المادة الأولى: المقابل المالي", fields: [
    { key: "visual_financial_total", type: "money", labelAr: "القيمة الإجمالية للمشروع" },
    { key: "visual_financial_currency", type: "select", labelAr: "العملة", options: currencyOptions },
    { key: "visual_financial_other_currency", type: "text", labelAr: "عملة أخرى" },
  ] },
  { key: "visual_payment_table", titleAr: "المادة الثانية: جدول الدفعات", fields: [
    { key: "visual_payment_schedule", type: "repeater", labelAr: "جدول الدفعات", blankRows: 4, blankRowLabels: ["الدفعة الأولى", "الدفعة الثانية", "الدفعة الثالثة", "الدفعة الأخيرة"], columns: [
      { key: "payment", type: "text", labelAr: "الدفعة" }, { key: "percentage", type: "number", labelAr: "نسبة الدفعة %" },
      { key: "amount", type: "money", labelAr: "القيمة" }, { key: "due_date", type: "date", labelAr: "تاريخ الاستحقاق" },
      { key: "status", type: "select", labelAr: "حالة السداد", options: [
        { value: "not_due", labelAr: "لم تستحق" }, { value: "due", labelAr: "مستحقة" }, { value: "paid", labelAr: "مسددة" }, { value: "late", labelAr: "متأخرة" },
      ] },
    ] },
  ] },
  { key: "visual_payment_methods", titleAr: "المادة الثالثة: وسائل السداد وإثبات الوفاء", fields: [
    ...serviceCheckboxFields("visual_payment_method", [
      ["cash", "نقدًا"], ["bank", "تحويل بنكي"], ["instapay", "إنستاباي (Instapay)"], ["wallet", "محفظة إلكترونية"],
      ["card", "بطاقة دفع إلكتروني"], ["cheque", "شيك"],
    ]),
    { key: "visual_payment_method_other", type: "text", labelAr: "وسيلة سداد أخرى", manualCheckbox: true },
  ] },
  { key: "visual_start_conditions", titleAr: "المادة الرابعة: شروط بدء التنفيذ — يحدد المشترط بعلامة ✓", fields: [
    ...serviceCheckboxFields("visual_start_condition", [
      ["contract_signed", "توقيع العقد"], ["annex_signed", "توقيع هذا الملحق"], ["advance_paid", "سداد الدفعة المقدمة"],
      ["scope_approved", "اعتماد نطاق العمل النهائي"], ["content_received", "استلام المحتوى أو البيانات أو الملفات اللازمة"],
      ["previous_identity_received", "استلام الشعارات أو الهوية السابقة — إن وجدت"], ["access_received", "استلام التراخيص أو الحسابات أو وسائل الوصول اللازمة"],
    ]),
    { key: "visual_start_condition_other", type: "text", labelAr: "شرط آخر", manualCheckbox: true },
  ] },
  { key: "visual_excluded_works", titleAr: "المادة الخامسة: الأعمال غير المشمولة بالمقابل المالي", fields: [
    ...serviceCheckboxFields("visual_excluded_work", [
      ["extra_reviews", "جولات مراجعة إضافية"], ["redesign", "إعادة تصميم المشروع أو أي جزء جوهري منه"], ["extra_outputs", "تصميمات أو مخرجات إضافية"],
      ["source_files", "الملفات المصدرية أو الملفات القابلة للتعديل"], ["post_approval_changes", "تعديل الأعمال بعد اعتمادها"],
      ["extra_consulting", "خدمات استشارية إضافية"], ["third_party_purchases", "شراء الخطوط أو الصور أو العناصر أو التراخيص المقدمة من الغير"],
      ["conversion", "تحويل الهوية البصرية إلى قوالب أو مواقع أو تطبيقات أو منتجات أخرى"],
    ]),
    { key: "visual_excluded_work_other", type: "text", labelAr: "أعمال أخرى غير مشمولة", manualCheckbox: true },
  ] },
  { key: "visual_suspension_reasons", titleAr: "المادة الثامنة: تعليق المشروع", fields: [
    ...serviceCheckboxFields("visual_suspension_reason", [
      ["late_payment", "تأخر الطرف الأول في سداد أي دفعة مستحقة"], ["missing_materials", "عدم تقديم البيانات أو المحتوى أو الملفات اللازمة"],
      ["stage_not_approved", "عدم اعتماد مرحلة من مراحل المشروع"], ["no_response", "عدم الرد على الطلبات أو الملاحظات الجوهرية اللازمة لاستمرار التنفيذ"],
      ["client_pause", "طلب الطرف الأول وقف المشروع مؤقتًا"], ["legal_technical_block", "وجود مانع قانوني أو فني أو تقني يحول دون استمرار التنفيذ"],
      ["force_majeure", "حالة من حالات القوة القاهرة أو الظروف الطارئة وفقًا للعقد"],
    ]),
    { key: "visual_suspension_reason_other", type: "text", labelAr: "سبب آخر", manualCheckbox: true },
  ] },
];

const visualApprovalsSteps: WizardStepDefinition[] = [
  { key: "visual_approval_setup", titleAr: "المادة الأولى: بيانات المشروع والاعتماد", fields: [
    { key: "visual_approval_annex_number", type: "text", labelAr: "رقم الملحق" },
    { key: "visual_approval_version", type: "text", labelAr: "رقم الإصدار" },
    { key: "visual_approval_date", type: "date", labelAr: "تاريخ تحرير الإصدار" },
    { key: "visual_approval_project_name", type: "text", labelAr: "اسم المشروع" },
    { key: "visual_approval_brand_name", type: "text", labelAr: "اسم العلامة التجارية (إن وجدت)" },
    { key: "visual_approval_original_contract_number", type: "text", labelAr: "رقم العقد الأصلي" },
    { key: "visual_approval_original_contract_date", type: "date", labelAr: "تاريخ العقد الأصلي" },
    { key: "visual_authorized_approver", type: "text", labelAr: "اسم المسؤول المخول بالاعتماد من الطرف الأول (إن وجد)" },
    { key: "visual_authorized_capacity", type: "text", labelAr: "الصفة الوظيفية" },
    { key: "visual_approval_channel", type: "select", labelAr: "وسيلة الاعتماد الرسمية", options: [
      { value: "email", labelAr: "البريد الإلكتروني المعتمد" }, { value: "platform", labelAr: "المنصة الإلكترونية" },
      { value: "electronic_form", labelAr: "نموذج اعتماد إلكتروني" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "visual_approval_channel_other", type: "text", labelAr: "وسيلة الاعتماد الأخرى" },
  ] },
  { key: "visual_stage_approvals_section", titleAr: "المادة الثانية: سجل اعتماد مراحل المشروع", fields: [
    { key: "visual_stage_approvals", type: "repeater", labelAr: "سجل اعتماد المراحل", blankRows: 4, columns: [
      { key: "stage_no", type: "number", labelAr: "رقم المرحلة" }, { key: "description", type: "text", labelAr: "وصف المرحلة وفقًا للملحق (1)" },
      { key: "delivery_date", type: "date", labelAr: "تاريخ التسليم" }, { key: "approval_date", type: "date", labelAr: "تاريخ الاعتماد" },
      { key: "status", type: "select", labelAr: "حالة المرحلة", options: [
        { value: "approved", labelAr: "معتمدة" }, { value: "approved_with_notes", labelAr: "معتمدة مع ملاحظات" }, { value: "rejected", labelAr: "غير معتمدة" },
      ] },
    ] },
  ] },
  { key: "visual_review_record_form", titleAr: "المادة الثالثة: سجل جولة مراجعة", fields: [
    { key: "visual_review_stage_no", type: "text", labelAr: "رقم المرحلة" }, { key: "visual_review_round_no", type: "text", labelAr: "رقم جولة المراجعة" },
    { key: "visual_review_stage_sent_date", type: "date", labelAr: "تاريخ إرسال المرحلة" }, { key: "visual_review_deadline", type: "date", labelAr: "آخر موعد لإرسال الملاحظات" },
    { key: "visual_review_notes_received_date", type: "date", labelAr: "تاريخ استلام الملاحظات" },
    { key: "visual_review_send_method", type: "select", labelAr: "وسيلة إرسال الملاحظات", options: [
      { value: "email", labelAr: "البريد الإلكتروني المعتمد" }, { value: "platform", labelAr: "المنصة الإلكترونية" }, { value: "form", labelAr: "النموذج الإلكتروني" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "visual_review_send_method_other", type: "text", labelAr: "وسيلة أخرى" },
    { key: "visual_review_notes", type: "textarea", labelAr: "الملاحظات" },
  ] },
  { key: "visual_change_request_form", titleAr: "المادة الرابعة: سجل طلب تعديل", fields: [
    { key: "visual_change_request_no", type: "text", labelAr: "رقم الطلب" }, { key: "visual_change_stage_no", type: "text", labelAr: "رقم المرحلة المرتبط بها" },
    { key: "visual_change_date", type: "date", labelAr: "تاريخ الطلب" }, { key: "visual_change_description", type: "textarea", labelAr: "وصف الطلب" },
    { key: "visual_change_reason", type: "textarea", labelAr: "سبب الطلب" },
    { key: "visual_change_outside_scope", type: "radio", labelAr: "هل يخرج الطلب عن نطاق العمل؟", options: yesNo },
    { key: "visual_change_decision", type: "select", labelAr: "قرار الطرف الثاني", options: [
      { value: "accepted", labelAr: "مقبول" }, { value: "rejected", labelAr: "مرفوض" }, { value: "study", labelAr: "يحتاج دراسة" },
    ] },
    { key: "visual_change_provider_notes", type: "textarea", labelAr: "ملاحظات الطرف الثاني" },
  ] },
  { key: "visual_decisions_register", titleAr: "المادة الخامسة: سجل القرارات والاعتمادات", fields: [
    { key: "visual_decision_records", type: "repeater", labelAr: "سجل القرارات والاعتمادات", blankRows: 4, columns: [
      { key: "date", type: "date", labelAr: "التاريخ" }, { key: "stage_or_request", type: "text", labelAr: "رقم المرحلة / رقم الطلب" },
      { key: "decision", type: "text", labelAr: "البيان أو القرار" }, { key: "method", type: "text", labelAr: "وسيلة الاعتماد" },
      { key: "issuer", type: "text", labelAr: "الجهة المصدرة" }, { key: "reference", type: "text", labelAr: "المرجع" },
    ] },
  ] },
  { key: "visual_stage_acceptance", titleAr: "المادة السابعة: محضر اعتماد المرحلة", fields: [
    { key: "visual_accept_stage_no", type: "text", labelAr: "رقم المرحلة وفقًا للملحق رقم (1)" }, { key: "visual_accept_stage_name", type: "text", labelAr: "اسم المرحلة" },
    { key: "visual_accept_review_round", type: "text", labelAr: "رقم جولة المراجعة المرتبطة بها" }, { key: "visual_accept_delivery_date", type: "date", labelAr: "تاريخ التسليم" },
    { key: "visual_accept_reply_date", type: "date", labelAr: "تاريخ الاعتماد أو الرد" }, { key: "visual_accept_approver_name", type: "text", labelAr: "اسم الشخص الذي قام بالاعتماد" },
    { key: "visual_accept_approver_capacity", type: "text", labelAr: "صفته" },
    { key: "visual_accept_status", type: "select", labelAr: "حالة المرحلة", options: [
      { value: "approved", labelAr: "معتمدة نهائيًا" }, { value: "approved_with_notes", labelAr: "معتمدة مع الملاحظات" }, { value: "rejected", labelAr: "غير معتمدة" },
    ] },
    { key: "visual_accept_notes", type: "textarea", labelAr: "الملاحظات (إن وجدت)" },
  ] },
  { key: "visual_final_delivery", titleAr: "المادة الثامنة: محضر التسليم النهائي", fields: [
    { key: "visual_final_project_name", type: "text", labelAr: "اسم المشروع" }, { key: "visual_final_version", type: "text", labelAr: "رقم الإصدار النهائي" },
    { key: "visual_final_delivery_date", type: "date", labelAr: "تاريخ التسليم النهائي" },
    { key: "visual_final_all_outputs", type: "checkbox", labelAr: "جميع المخرجات المحددة بالملحق رقم (1)" },
    { key: "visual_final_outputs", type: "textarea", labelAr: "المخرجات التي تم تسليمها — عند عدم اختيار جميع المخرجات" },
    ...serviceCheckboxFields("visual_final_file", [
      ["pdf", "PDF"], ["png", "PNG"], ["jpg", "JPG"], ["svg", "SVG"], ["ai", "AI"], ["psd", "PSD"], ["fig", "FIG"],
      ["indd", "INDD"], ["canva", "Canva"], ["zip", "ZIP"], ["repository", "رابط مستودع المشروع (Repository)"],
    ]),
    { key: "visual_final_file_other", type: "text", labelAr: "ملفات أخرى", manualCheckbox: true },
    ...serviceCheckboxFields("visual_final_delivery_method", [
      ["email", "البريد الإلكتروني"], ["download", "رابط تحميل"], ["project_platform", "منصة إدارة المشروع"], ["storage", "وحدة تخزين إلكترونية"],
    ]),
    { key: "visual_final_delivery_method_other", type: "text", labelAr: "وسيلة تسليم أخرى", manualCheckbox: true },
  ] },
  { key: "visual_ip_transfer", titleAr: "المادة التاسعة: محضر انتقال حقوق الملكية الفكرية أو منح الترخيص", fields: [
    { key: "visual_ip_paid", type: "select", labelAr: "شرط انتقال الحقوق", options: [
      { value: "paid", labelAr: "تم سداد كامل المقابل المالي" }, { value: "not_paid", labelAr: "لم يتم سداد كامل المقابل المالي" },
    ] },
    { key: "visual_ip_right_type", type: "select", labelAr: "نوع الحق الموثق", options: [
      { value: "ownership", labelAr: "انتقال ملكية كاملة وفقًا للعقد" }, { value: "exclusive", labelAr: "ترخيص حصري وفقًا للعقد أو ملحق مستقل" },
      { value: "nonexclusive", labelAr: "ترخيص غير حصري وفقًا للعقد أو ملحق مستقل" }, { value: "use", labelAr: "حق استخدام فقط وفقًا للعقد" },
      { value: "other", labelAr: "وفقًا لما تم الاتفاق عليه بالعقد أو بملحق مستقل" },
    ] },
    ...serviceCheckboxFields("visual_ip_scope", [
      ["logo", "الشعار"], ["identity", "الهوية البصرية"], ["guide", "دليل الهوية البصرية"], ["print_materials", "المطبوعات"],
      ["social_templates", "قوالب وسائل التواصل الاجتماعي"], ["source_files", "الملفات المصدرية"], ["print_files", "ملفات الطباعة"], ["digital_files", "ملفات الاستخدام الرقمي"],
    ]),
    { key: "visual_ip_scope_other", type: "text", labelAr: "عناصر أخرى يشملها الحق", manualCheckbox: true },
    ...serviceCheckboxFields("visual_ip_exclusion", [
      ["drafts", "المسودات"], ["prototypes", "النماذج الأولية"], ["unapproved", "الأعمال غير المعتمدة"], ["unpaid", "الأعمال غير المسددة"],
      ["unagreed_source", "الملفات المصدرية غير المتفق على تسليمها"], ["fonts", "الخطوط"], ["images", "الصور"],
      ["third_party", "العناصر أو التراخيص المملوكة للغير"], ["third_party_code", "البرمجيات أو الأكواد أو الأدوات المملوكة للغير"],
    ]),
    { key: "visual_ip_exclusion_other", type: "text", labelAr: "استثناءات أخرى", manualCheckbox: true },
  ] },
];


const websiteScopeSteps: WizardStepDefinition[] = [
  { key: "website_scope_basic", titleAr: "أولًا وثانيًا: البيانات الأساسية وأهداف المشروع", fields: [
    { key: "website_scope_project_name", type: "text", labelAr: "اسم المشروع" },
    { key: "website_scope_description", type: "textarea", labelAr: "وصف مختصر للمشروع" },
    { key: "website_scope_project_type", type: "radio", labelAr: "نوع المشروع", options: [
      { value: "موقع تعريفي", labelAr: "موقع تعريفي" }, { value: "متجر إلكتروني", labelAr: "متجر إلكتروني" }, { value: "منصة إلكترونية", labelAr: "منصة إلكترونية" },
      { value: "نظام إدارة", labelAr: "نظام إدارة" }, { value: "لوحة تحكم", labelAr: "لوحة تحكم" }, { value: "موقع حجوزات", labelAr: "موقع حجوزات" }, { value: "SaaS", labelAr: "SaaS" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "website_scope_project_type_other", type: "text", labelAr: "نوع مشروع آخر", manualCheckbox: true },
    { key: "website_scope_objectives", type: "textarea", labelAr: "أهداف المشروع" },
  ] },
  { key: "website_scope_work", titleAr: "ثالثًا: نطاق الأعمال المشمولة", fields: [
    ...serviceCheckboxFields("website_work", [
      ["requirements", "تحليل المتطلبات"], ["ui", "تصميم واجهات المستخدم (UI)"], ["ux", "تجربة المستخدم (UX)"],
      ["brand", "تصميم الهوية البصرية للموقع"], ["frontend", "برمجة الواجهة الأمامية (Front-End)"], ["backend", "برمجة الواجهة الخلفية (Back-End)"],
      ["database", "إنشاء قاعدة البيانات"], ["admin_dashboard", "لوحة تحكم الإدارة"], ["user_dashboard", "لوحة تحكم المستخدم"],
      ["registration", "نظام تسجيل المستخدمين"], ["login", "نظام تسجيل الدخول"], ["password_reset", "استعادة كلمة المرور"],
      ["permissions", "إدارة الصلاحيات"], ["search", "نظام البحث"], ["notifications", "نظام الإشعارات"], ["messages", "نظام الرسائل"],
      ["uploads", "رفع الملفات"], ["reports", "التقارير"], ["analytics", "لوحة الإحصائيات"], ["payment", "نظام الدفع"], ["integrations", "التكامل مع خدمات خارجية"],
    ]),
    { key: "website_scope_other_work", type: "text", labelAr: "أعمال أخرى", manualCheckbox: true },
  ] },
  { key: "website_scope_deliverables", titleAr: "رابعًا: المخرجات (Deliverables)", fields: [
    ...serviceCheckboxFields("website_deliverable", [
      ["website", "الموقع الإلكتروني"], ["admin_dashboard", "لوحة الإدارة"], ["database", "قاعدة البيانات"], ["design_files", "ملفات التصميم"],
      ["project_files", "ملفات المشروع"], ["setup_files", "ملفات الإعداد"], ["user_manual", "دليل الاستخدام"], ["admin_manual", "دليل المدير"],
      ["installation_guide", "دليل التثبيت"], ["api_document", "وثيقة API"],
    ]),
    { key: "website_deliverable_other", type: "text", labelAr: "مخرجات أخرى", manualCheckbox: true },
  ] },
  { key: "website_scope_functions_pages", titleAr: "خامسًا وسادسًا: الوظائف الرئيسية وصفحات الموقع", fields: [
    { key: "website_main_functions", type: "repeater", labelAr: "الوظائف الرئيسية للموقع", blankRows: 4, columns: [{ key: "function", type: "text", labelAr: "الوظيفة الرئيسية" }] },
    { key: "website_pages_count", type: "number", labelAr: "عدد الصفحات" },
    { key: "website_pages", type: "repeater", labelAr: "أسماء الصفحات", blankRows: 6, blankRowLabels: ["1", "2", "3", "4", "5", "6"], columns: [
      { key: "page_no", type: "text", labelAr: "م" }, { key: "page_name", type: "text", labelAr: "اسم الصفحة" },
    ] },
  ] },
  { key: "website_scope_admin_integrations", titleAr: "سابعًا وثامنًا: لوحة الإدارة والتكاملات الخارجية", fields: [
    ...serviceCheckboxFields("website_admin", [
      ["users", "إدارة المستخدمين"], ["content", "إدارة المحتوى"], ["orders", "إدارة الطلبات"], ["products", "إدارة المنتجات"], ["payments", "إدارة المدفوعات"],
      ["reports", "إدارة التقارير"], ["permissions", "إدارة الصلاحيات"], ["settings", "إدارة الإعدادات"], ["notifications", "إدارة الإشعارات"],
    ]),
    { key: "website_admin_other", type: "text", labelAr: "وظائف إدارة أخرى", manualCheckbox: true },
    ...serviceCheckboxFields("website_integration", [
      ["paymob", "Paymob"], ["stripe", "Stripe"], ["paypal", "PayPal"], ["fawry", "Fawry"], ["google_maps", "Google Maps"], ["firebase", "Firebase"],
      ["whatsapp", "WhatsApp"], ["chatgpt", "ChatGPT API"], ["gemini", "Gemini API"], ["claude", "Claude API"], ["email", "البريد الإلكتروني"], ["sms", "SMS Gateway"],
    ]),
    { key: "website_integration_other", type: "text", labelAr: "تكامل آخر", manualCheckbox: true },
  ] },
  { key: "website_scope_client_data_exclusions", titleAr: "تاسعًا وعاشرًا: بيانات العميل والأعمال غير المشمولة", fields: [
    ...serviceCheckboxFields("website_client_input", [
      ["texts", "النصوص"], ["images", "الصور"], ["videos", "الفيديوهات"], ["logos", "الشعارات"], ["products", "بيانات المنتجات"], ["users", "بيانات المستخدمين"],
      ["legal_policies", "السياسات القانونية"], ["contacts", "بيانات التواصل"], ["files", "الملفات"], ["accounts", "الحسابات اللازمة"], ["api_keys", "مفاتيح API"],
    ]),
    { key: "website_client_input_other", type: "text", labelAr: "بيانات أخرى", manualCheckbox: true },
    { key: "website_scope_excluded_work", type: "textarea", labelAr: "الأعمال غير المشمولة — إنشاء محتوى تسويقي، كتابة مقالات، SEO، حملات إعلانية، إدارة وسائل التواصل، إدارة السيرفر والبريد، الأمن السيبراني، النسخ الاحتياطي الدوري، تطبيقات الهاتف، التطويرات المستقبلية وأي أعمال لم ينص عليها الملحق" },
  ] },
  { key: "website_scope_training", titleAr: "الحادي عشر: التدريب (اختياري)", fields: [
    { key: "website_training_mode", type: "radio", labelAr: "التدريب", options: [{ value: "لا يشمل المشروع أي تدريب", labelAr: "لا يشمل المشروع أي تدريب" }, { value: "يشمل المشروع تدريبًا", labelAr: "يشمل المشروع تدريبًا" }] },
    { key: "website_training_sessions", type: "number", labelAr: "عدد الجلسات" },
    { key: "website_training_session_duration", type: "text", labelAr: "مدة كل جلسة" },
    { key: "website_training_method", type: "radio", labelAr: "طريقة التدريب", options: [
      { value: "حضوري", labelAr: "حضوري" }, { value: "عن بعد", labelAr: "عن بعد" }, { value: "فيديوهات", labelAr: "فيديوهات" }, { value: "دليل استخدام فقط", labelAr: "دليل استخدام فقط" },
    ] },
  ] },
  { key: "website_scope_acceptance", titleAr: "الثاني عشر والثالث عشر: الاعتماد والاختبارات والملاحظات", fields: [
    { key: "website_acceptance_tests", type: "repeater", labelAr: "اختبارات قبول إضافية", blankRows: 3, columns: [
      { key: "test", type: "text", labelAr: "اسم الاختبار" }, { key: "result", type: "radio", labelAr: "نتيجة الاختبار", options: [{ value: "مقبول", labelAr: "مقبول" }, { value: "يحتاج تعديل", labelAr: "يحتاج تعديل" }] },
    ] },
    { key: "website_scope_notes_exceptions", type: "textarea", labelAr: "الملاحظات والاستثناءات الخاصة بالمشروع" },
  ] },
];

const websiteTechnicalSteps: WizardStepDefinition[] = [
  { key: "website_ts_project", titleAr: "أولًا وثانيًا: بيانات ووصف المشروع", fields: [
    { key: "website_ts_project_name", type: "text", labelAr: "اسم المشروع" }, { key: "website_ts_contract_no", type: "text", labelAr: "رقم العقد" },
    { key: "website_ts_version", type: "text", labelAr: "رقم إصدار هذا الملحق (إن وجد)" }, { key: "website_ts_date", type: "date", labelAr: "تاريخ إصدار الملحق" },
    { key: "website_ts_sow_date", type: "date", labelAr: "تاريخ إصدار ملحق نطاق العمل المرتبط" },
    { key: "website_ts_project_type", type: "radio", labelAr: "نوع المشروع", options: [
      { value: "موقع إلكتروني تعريفي", labelAr: "موقع إلكتروني تعريفي" }, { value: "متجر إلكتروني", labelAr: "متجر إلكتروني" }, { value: "منصة إلكترونية", labelAr: "منصة إلكترونية" },
      { value: "نظام إدارة", labelAr: "نظام إدارة" }, { value: "لوحة تحكم", labelAr: "لوحة تحكم" }, { value: "نظام حجز", labelAr: "نظام حجز" }, { value: "موقع خدمي", labelAr: "موقع خدمي" }, { value: "نظام SaaS", labelAr: "نظام SaaS" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "website_ts_project_type_other", type: "text", labelAr: "نوع مشروع آخر", manualCheckbox: true }, { key: "website_ts_description", type: "textarea", labelAr: "وصف المشروع" },
  ] },
  { key: "website_ts_arch_stack", titleAr: "ثالثًا ورابعًا: البنية التقنية والتقنيات المستخدمة", fields: [
    { key: "website_architecture", type: "radio", labelAr: "نوع البنية", options: [
      { value: "Monolithic", labelAr: "Monolithic" }, { value: "Modular", labelAr: "Modular" }, { value: "Microservices", labelAr: "Microservices" }, { value: "Serverless", labelAr: "Serverless" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "website_architecture_other", type: "text", labelAr: "بنية أخرى", manualCheckbox: true },
    ...serviceCheckboxFields("website_ts_language", [["php","PHP"],["python","Python"],["java","Java"],["javascript","JavaScript"],["typescript","TypeScript"],["csharp","C#"],["go","Go"]]),
    { key: "website_ts_language_other", type: "text", labelAr: "لغة برمجة أخرى", manualCheckbox: true },
    ...serviceCheckboxFields("website_ts_framework", [["laravel","Laravel"],["django","Django"],["aspnet","ASP.NET Core"],["node","Node.js"],["express","Express"],["nest","NestJS"],["spring","Spring Boot"]]),
    { key: "website_ts_framework_other", type: "text", labelAr: "إطار عمل آخر", manualCheckbox: true },
    ...serviceCheckboxFields("website_ts_frontend", [["html5","HTML5"],["css3","CSS3"],["bootstrap","Bootstrap"],["tailwind","Tailwind CSS"],["react","React"],["vue","Vue"],["angular","Angular"],["next","Next.js"],["nuxt","Nuxt.js"]]),
    { key: "website_ts_frontend_other", type: "text", labelAr: "تقنية واجهة أخرى", manualCheckbox: true },
    ...serviceCheckboxFields("website_ts_db", [["mysql","MySQL"],["mariadb","MariaDB"],["postgresql","PostgreSQL"],["sqlserver","SQL Server"],["mongodb","MongoDB"],["firebase","Firebase"],["sqlite","SQLite"]]),
    { key: "website_ts_db_other", type: "text", labelAr: "قاعدة بيانات أخرى", manualCheckbox: true },
    ...serviceCheckboxFields("website_ts_storage", [["local","Local Storage"],["cloud","Cloud Storage"],["s3","AWS S3"],["azure","Azure Blob"],["gcs","Google Cloud Storage"]]),
    { key: "website_ts_storage_other", type: "text", labelAr: "إدارة ملفات أخرى", manualCheckbox: true },
  ] },
  { key: "website_ts_integrations_third_party", titleAr: "خامسًا وسادسًا: واجهات البرمجة وخدمات الغير", fields: [
    ...serviceCheckboxFields("website_ts_api", [["payment","بوابة دفع إلكتروني"],["sms","خدمة رسائل SMS"],["email","بريد إلكتروني"],["firebase","Firebase"],["maps","Google Maps"],["whatsapp","WhatsApp API"],["facebook","Facebook API"],["google_oauth","Google OAuth"],["apple","Apple Sign In"],["openai","OpenAI API"]]),
    { key: "website_ts_api_other", type: "text", labelAr: "تكامل API آخر", manualCheckbox: true },
    { key: "website_ts_third_party", type: "repeater", labelAr: "الخدمات والبرامج المقدمة من الغير", blankRows: 5, columns: [
      { key: "service", type: "text", labelAr: "اسم الخدمة" }, { key: "purpose", type: "text", labelAr: "الغرض" }, { key: "provider", type: "text", labelAr: "مقدم الخدمة" },
    ] },
  ] },
  { key: "website_ts_hosting_domain_ssl", titleAr: "سابعًا إلى تاسعًا: الاستضافة واسم النطاق وSSL", fields: [
    { key: "website_ts_hosting", type: "radio", labelAr: "الاستضافة", options: [{ value: "غير مشمولة", labelAr: "لا يشمل العقد توفير الاستضافة" }, { value: "مشمولة", labelAr: "يشمل العقد توفير الاستضافة" }] },
    { key: "website_ts_hosting_provider", type: "text", labelAr: "مزود الاستضافة" },
    { key: "website_ts_server_type", type: "radio", labelAr: "نوع الخادم", options: [{ value: "Shared", labelAr: "Shared" }, { value: "VPS", labelAr: "VPS" }, { value: "Dedicated", labelAr: "Dedicated" }, { value: "Cloud", labelAr: "Cloud" }] },
    { key: "website_ts_hosting_country", type: "text", labelAr: "دولة الاستضافة" }, { key: "website_ts_hosting_period", type: "text", labelAr: "مدة الاشتراك" },
    { key: "website_ts_hosting_cost", type: "radio", labelAr: "يتحمل رسوم الاستضافة", options: [{ value: "الطرف الأول", labelAr: "الطرف الأول" }, { value: "الطرف الثاني", labelAr: "الطرف الثاني" }] },
    { key: "website_ts_domain", type: "text", labelAr: "اسم النطاق" }, { key: "website_ts_domain_registrar", type: "text", labelAr: "المسجل لدى" }, { key: "website_ts_domain_period", type: "text", labelAr: "مدة التسجيل" },
    { key: "website_ts_domain_renewal", type: "radio", labelAr: "يتحمل رسوم تجديد النطاق", options: [{ value: "الطرف الأول", labelAr: "الطرف الأول" }, { value: "الطرف الثاني", labelAr: "الطرف الثاني" }, { value: "وفق الاتفاق", labelAr: "وفق الاتفاق" }] },
    { key: "website_ts_ssl", type: "radio", labelAr: "شهادة SSL", options: [{ value: "غير مشمولة", labelAr: "لا يشمل المشروع" }, { value: "مجانية", labelAr: "مجانية" }, { value: "مدفوعة", labelAr: "مدفوعة" }] },
    { key: "website_ts_ssl_provider", type: "text", labelAr: "مزود شهادة SSL" }, { key: "website_ts_ssl_cost", type: "radio", labelAr: "يتحمل تكلفة SSL", options: [{ value: "الطرف الأول", labelAr: "الطرف الأول" }, { value: "الطرف الثاني", labelAr: "الطرف الثاني" }, { value: "حسب الاتفاق", labelAr: "حسب الاتفاق" }] },
  ] },
  { key: "website_ts_versions_performance", titleAr: "عاشرًا إلى الثالث عشر: الإصدارات والأداء والتوافر", fields: [
    { key: "website_ts_versions", type: "repeater", labelAr: "الإصدارات الفنية المحددة", blankRows: 5, blankRowLabels: ["لغة البرمجة","Framework","Database","Server","Runtime / PHP Version"], columns: [{ key: "component", type: "text", labelAr: "المكون" }, { key: "version", type: "text", labelAr: "الإصدار" }] },
    { key: "website_ts_page_load_mode", type: "radio", labelAr: "سرعة تحميل الصفحات", options: [{ value: "لا يشترط معيار محدد", labelAr: "لا يشترط معيار محدد" }, { value: "يتم الاتفاق", labelAr: "يتم الاتفاق على معيار" }] },
    { key: "website_ts_home_load", type: "number", labelAr: "زمن تحميل الصفحة الرئيسية — ثانية" }, { key: "website_ts_inner_load", type: "number", labelAr: "زمن تحميل الصفحات الداخلية — ثانية" },
    { key: "website_ts_concurrent_users", type: "text", labelAr: "الحد الأدنى المستهدف للمستخدمين المتزامنين / غير محدد" }, { key: "website_ts_server_response", type: "text", labelAr: "زمن استجابة الخادم / غير محدد" },
    { key: "website_ts_expected_users", type: "number", labelAr: "عدد المستخدمين المتوقع" }, { key: "website_ts_expected_records", type: "number", labelAr: "عدد السجلات المتوقع" }, { key: "website_ts_expected_files", type: "text", labelAr: "حجم الملفات المتوقع" },
    { key: "website_ts_availability", type: "radio", labelAr: "مستوى التوافر المستهدف", options: [{ value: "لا يوجد SLA", labelAr: "لا يوجد SLA" }, { value: "99%", labelAr: "99%" }, { value: "99.5%", labelAr: "99.5%" }, { value: "99.9%", labelAr: "99.9%" }, { value: "99.95%", labelAr: "99.95%" }, { value: "99.99%", labelAr: "99.99%" }] },
    { key: "website_ts_availability_effect", type: "radio", labelAr: "أثر عدم تحقيق مستوى التوافر", options: [{ value: "لا أثر تعاقدي", labelAr: "لا يترتب أثر تعاقدي" }, { value: "تمديد الدعم", labelAr: "تمديد مدة الدعم الفني" }, { value: "تمديد الضمان", labelAr: "تمديد مدة الضمان" }, { value: "خصم مالي", labelAr: "خصم مالي" }, { value: "اتفاق مستقل", labelAr: "وفق اتفاق مستقل" }] },
  ] },
  { key: "website_ts_compat_security", titleAr: "الرابع عشر إلى السابع عشر: التوافق والأمن وحماية البيانات", fields: [
    ...serviceCheckboxFields("website_ts_browser", [["chrome","Google Chrome"],["edge","Microsoft Edge"],["firefox","Firefox"],["safari","Safari"],["opera","Opera"]]),
    ...serviceCheckboxFields("website_ts_device", [["desktop","Desktop"],["laptop","Laptop"],["tablet","Tablet"],["mobile","Mobile"]]),
    { key: "website_ts_device_other", type: "text", labelAr: "جهاز آخر", manualCheckbox: true },
    ...serviceCheckboxFields("website_ts_security", [["passwords","تشفير كلمات المرور"],["https","HTTPS"],["ssl","SSL"],["csrf","حماية CSRF"],["xss","حماية XSS"],["sql_injection","حماية SQL Injection"],["file_upload","حماية File Upload"],["rate_limit","Rate Limiting"],["session","Session Security"],["input_validation","Input Validation"]]),
    { key: "website_ts_security_other", type: "text", labelAr: "تدبير أمني آخر", manualCheckbox: true },
    { key: "website_ts_data_roles", type: "radio", labelAr: "صفة معالجة البيانات الشخصية", options: [{ value: "الطرف الأول متحكم", labelAr: "الطرف الأول هو المتحكم في البيانات" }, { value: "الطرف الثاني معالج", labelAr: "الطرف الثاني هو معالج البيانات" }, { value: "ملحق مستقل", labelAr: "وفق ملحق مستقل" }] },
  ] },
  { key: "website_ts_logs_monitoring", titleAr: "الثامن عشر إلى الثالث والعشرين: بيانات الاختبار والسجلات والمراقبة وإدارة الأخطاء", fields: [
    { key: "website_ts_test_data", type: "textarea", labelAr: "بيانات الاختبار — تجريبية/مجهلة أو بيانات فعلية باتفاق مكتوب" },
    ...serviceCheckboxFields("website_ts_log", [["error","Error Logs"],["security","Security Logs"],["activity","Activity Logs"],["audit","Audit Logs"]]),
    { key: "website_ts_log_other", type: "text", labelAr: "سجل آخر", manualCheckbox: true },
    ...serviceCheckboxFields("website_ts_monitor", [["analytics","Google Analytics"],["search_console","Google Search Console"],["cloudwatch","CloudWatch"],["grafana","Grafana"],["sentry","Sentry"]]),
    { key: "website_ts_monitor_other", type: "text", labelAr: "أداة مراقبة أخرى", manualCheckbox: true },
    { key: "website_ts_bug_classes", type: "textarea", labelAr: "تصنيف الأخطاء — Critical / Major / Minor / Cosmetic" },
    { key: "website_ts_coding_standards", type: "textarea", labelAr: "معايير البرمجة المتفق عليها (إن وجدت)" },
    { key: "website_ts_version_management", type: "textarea", labelAr: "اشتراطات خاصة بإدارة الإصدارات (إن وجدت)" },
  ] },
  { key: "website_ts_environments_deploy", titleAr: "الرابع والعشرون والخامس والعشرون: بيئات العمل والنشر", fields: [
    ...serviceCheckboxFields("website_ts_env", [["development","بيئة التطوير (Development)"],["testing","بيئة الاختبار (Testing)"],["staging","بيئة ما قبل الإنتاج (Staging)"],["production","بيئة الإنتاج (Production)"]]),
    { key: "website_ts_env_table", type: "repeater", labelAr: "بيانات البيئات", blankRows: 4, blankRowLabels: ["التطوير","الاختبار","Staging","الإنتاج"], columns: [
      { key: "environment", type: "text", labelAr: "البيئة" }, { key: "url", type: "text", labelAr: "الرابط" }, { key: "hosting", type: "text", labelAr: "جهة الاستضافة" }, { key: "manager", type: "text", labelAr: "مسؤول الإدارة" },
    ] },
    ...serviceCheckboxFields("website_ts_deploy", [["manual","النشر اليدوي (Manual Deployment)"],["git","النشر باستخدام Git"],["cicd","النشر الآلي (CI/CD)"],["docker","النشر باستخدام الحاويات (Docker)"],["kubernetes","النشر باستخدام Kubernetes"]]),
    { key: "website_ts_deploy_other", type: "text", labelAr: "طريقة نشر أخرى", manualCheckbox: true },
  ] },
  { key: "website_ts_repo_source", titleAr: "السادس والعشرون إلى الثامن والعشرون: المستودع وإدارة الإصدارات والشفرة المصدرية", fields: [
    { key: "website_ts_repo_type", type: "radio", labelAr: "نوع المستودع", options: [{ value: "GitHub", labelAr: "GitHub" }, { value: "GitLab", labelAr: "GitLab" }, { value: "Bitbucket", labelAr: "Bitbucket" }, { value: "Azure DevOps", labelAr: "Azure DevOps" }, { value: "آخر", labelAr: "آخر" }] },
    { key: "website_ts_repo_other", type: "text", labelAr: "مستودع آخر" }, { key: "website_ts_repo_url", type: "text", labelAr: "رابط المستودع" },
    { key: "website_ts_repo_ownership", type: "radio", labelAr: "ملكية المستودع", options: [
      { value: "مملوك للطرف الأول", labelAr: "مستودع مملوك للطرف الأول" }, { value: "مملوك للطرف الثاني", labelAr: "مستودع مملوك للطرف الثاني" },
      { value: "باسم الطرف الأول ويديره الطرف الثاني", labelAr: "ينشأ باسم الطرف الأول ويديره الطرف الثاني أثناء التنفيذ" }, { value: "باسم الطرف الثاني وينقل للطرف الأول", labelAr: "ينشأ باسم الطرف الثاني وتنقل ملكيته/صلاحياته عند التسليم إذا اتفق" },
    ] },
    { key: "website_ts_vcs", type: "radio", labelAr: "نظام إدارة الإصدارات", options: [{ value: "Git", labelAr: "Git" }, { value: "SVN", labelAr: "SVN" }, { value: "Mercurial", labelAr: "Mercurial" }, { value: "غير ذلك", labelAr: "غير ذلك" }] },
    ...serviceCheckboxFields("website_ts_branch", [["main","مستودع رئيسي (Main Branch)"],["feature","فروع تطوير (Feature Branches)"],["hotfix","فروع إصلاحات (Hotfix Branches)"]]),
    { key: "website_ts_branch_other", type: "text", labelAr: "سياسة فروع أخرى", manualCheckbox: true }, { key: "website_ts_vcs_notes", type: "textarea", labelAr: "ملاحظات فنية" },
    { key: "website_ts_source_delivery", type: "text", labelAr: "وسيلة تسليم الشفرة المصدرية الكاملة بعد سداد كامل المستحقات (وفق المادة 13)" },
  ] },
  { key: "website_ts_licenses_backup", titleAr: "التاسع والعشرون إلى الثاني والثلاثين: المكتبات والتراخيص والنسخ والاستعادة", fields: [
    { key: "website_ts_open_source_notes", type: "textarea", labelAr: "مكتبات أو مكونات مفتوحة المصدر — ملاحظات (إن وجدت)" },
    { key: "website_ts_commercial_tools", type: "repeater", labelAr: "البرامج والأدوات التجارية", blankRows: 5, columns: [
      { key: "tool", type: "text", labelAr: "الأداة" }, { key: "license", type: "text", labelAr: "نوع الترخيص" }, { key: "owner", type: "text", labelAr: "المالك" }, { key: "period", type: "text", labelAr: "مدة الترخيص" },
    ] },
    { key: "website_ts_license_cost", type: "radio", labelAr: "يتحمل تكلفة التراخيص", options: [{ value: "الطرف الأول", labelAr: "الطرف الأول" }, { value: "الطرف الثاني", labelAr: "الطرف الثاني" }] },
    { key: "website_ts_backup_frequency", type: "radio", labelAr: "دورية النسخ الاحتياطي", options: [{ value: "يومية", labelAr: "يومية" }, { value: "أسبوعية", labelAr: "أسبوعية" }, { value: "شهرية", labelAr: "شهرية" }, { value: "أخرى", labelAr: "أخرى" }] },
    { key: "website_ts_backup_other", type: "text", labelAr: "دورية أخرى" }, { key: "website_ts_backup_count", type: "number", labelAr: "عدد النسخ المحتفظ بها" },
    { key: "website_ts_backup_location", type: "radio", labelAr: "مكان التخزين", options: [{ value: "نفس الخادم", labelAr: "نفس الخادم" }, { value: "خادم منفصل", labelAr: "خادم منفصل" }, { value: "تخزين سحابي", labelAr: "تخزين سحابي" }, { value: "آخر", labelAr: "آخر" }] },
    { key: "website_ts_backup_location_other", type: "text", labelAr: "مكان تخزين آخر" }, { key: "website_ts_backup_cost", type: "radio", labelAr: "يتحمل تكلفة التخزين", options: [{ value: "الطرف الأول", labelAr: "الطرف الأول" }, { value: "الطرف الثاني", labelAr: "الطرف الثاني" }] },
    { key: "website_ts_rto", type: "text", labelAr: "مدة الاستعادة المستهدفة (RTO)" }, { key: "website_ts_rpo", type: "text", labelAr: "الحد الأقصى لفقد البيانات (RPO)" },
    { key: "website_ts_no_dr", type: "checkbox", labelAr: "لا يشمل المشروع خطة استعادة بيانات" },
  ] },
  { key: "website_ts_docs_approval", titleAr: "الثالث والثلاثون والرابع والثلاثون: التوثيق واعتماد الملحق", fields: [
    ...serviceCheckboxFields("website_ts_doc", [["user","دليل المستخدم"],["admin","دليل لوحة التحكم"],["install","دليل التثبيت"],["operation","دليل التشغيل"],["api","توثيق واجهات برمجة التطبيقات"],["er","ER Diagram"],["schema","Database Schema"],["uml","UML"]]),
    { key: "website_ts_doc_other", type: "text", labelAr: "توثيق آخر", manualCheckbox: true },
    { key: "website_ts_approval_version", type: "text", labelAr: "رقم إصدار الملحق" }, { key: "website_ts_approval_date", type: "date", labelAr: "تاريخ الاعتماد" },
  ] },
];

const websiteProjectDataSteps: WizardStepDefinition[] = [
  { key: "website_project_data_basic", titleAr: "أولًا: بيانات المشروع", fields: [
    { key: "website_pd_basic", type: "repeater", labelAr: "البيانات الأساسية للمشروع", blankRows: 11, blankRowLabels: [
      "اسم المشروع", "نوع المشروع", "وصف مختصر للمشروع", "الهدف من المشروع", "الفئة المستهدفة", "الدولة أو الدول المستهدفة", "لغة أو لغات المشروع", "العملة المستخدمة", "المنطقة الزمنية", "اسم النطاق (إن وجد)", "ملاحظات",
    ], columns: [{ key: "item", type: "text", labelAr: "البيان" }, { key: "details", type: "text", labelAr: "التفاصيل" }] },
  ] },
  { key: "website_project_data_contact", titleAr: "ثانيًا: بيانات التواصل الخاصة بالمشروع", fields: [
    { key: "website_pd_contact", type: "repeater", labelAr: "بيانات التواصل", blankRows: 9, blankRowLabels: [
      "مسؤول المشروع لدى الطرف الأول", "الشخص المسؤول عن الاعتماد", "الشخص المسؤول عن الفواتير أو المدفوعات", "الصفة", "البريد الإلكتروني", "رقم الهاتف", "وسائل التواصل المعتمدة", "أوقات التواصل المفضلة", "ملاحظات",
    ], columns: [{ key: "item", type: "text", labelAr: "البيان" }, { key: "details", type: "text", labelAr: "التفاصيل" }] },
  ] },
  { key: "website_project_data_files", titleAr: "ثالثًا: البيانات والملفات التي يلتزم الطرف الأول بتوفيرها", fields: [
    { key: "website_pd_files", type: "repeater", labelAr: "البيانات والملفات", blankRows: 17, blankRowLabels: [
      "الشعار (Logo)", "الهوية البصرية", "دليل الهوية البصرية", "الصور", "الفيديوهات", "النصوص", "بيانات المنتجات أو الخدمات", "الأسعار", "بيانات التواصل", "الخرائط والمواقع", "سياسة الخصوصية", "الشروط والأحكام", "بيانات الشركة", "السجل التجاري", "البطاقة الضريبية", "أي مستندات قانونية أخرى", "ملفات أو بيانات أخرى",
    ], columns: [
      { key: "item", type: "text", labelAr: "العنصر" }, { key: "delivered", type: "checkbox", labelAr: "تم التسليم" }, { key: "delivery_date", type: "text", labelAr: "تاريخ التسليم" }, { key: "later", type: "checkbox", labelAr: "سيتم التسليم لاحقًا" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
  ] },
  { key: "website_project_data_accounts", titleAr: "رابعًا: الحسابات الرقمية وبيانات الوصول", fields: [
    { key: "website_pd_accounts", type: "repeater", labelAr: "الحسابات الرقمية", blankRows: 17, blankRowLabels: [
      "Domain", "Hosting", "DNS", "Cloudflare", "البريد الإلكتروني", "cPanel / Plesk", "FTP / SFTP", "قاعدة البيانات", "Git Repository", "Firebase", "Google Workspace", "Google Play Console", "Apple Developer", "Meta Business", "بوابة الدفع", "خدمات الرسائل / البريد الإلكتروني", "أي حسابات أخرى",
    ], columns: [
      { key: "service", type: "text", labelAr: "الخدمة" }, { key: "account", type: "text", labelAr: "اسم الحساب" }, { key: "owner", type: "text", labelAr: "المالك المسجل" }, { key: "access", type: "text", labelAr: "وسيلة حفظ / تسليم بيانات الدخول" }, { key: "delivered", type: "checkbox", labelAr: "تم التسليم" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
  ] },
  { key: "website_project_data_content", titleAr: "خامسًا: المحتوى والبيانات المطلوب توفيرها أثناء التنفيذ", fields: [
    { key: "website_pd_content", type: "repeater", labelAr: "عناصر المحتوى", blankRows: 9, blankRowLabels: [
      "الصفحة الرئيسية", "صفحات الخدمات", "المنتجات", "المقالات", "الصور", "الفيديوهات", "ملفات التحميل", "بيانات التواصل", "أي عناصر أخرى",
    ], columns: [
      { key: "item", type: "text", labelAr: "العنصر" }, { key: "owner", type: "text", labelAr: "المسؤول عن توفيره" }, { key: "delivery_date", type: "text", labelAr: "تاريخ التسليم" }, { key: "commitment_date", type: "text", labelAr: "تاريخ الالتزام" },
      { key: "status", type: "radio", labelAr: "الحالة", options: [{ value: "جاهز", labelAr: "جاهز" }, { value: "غير جاهز", labelAr: "غير جاهز" }] }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
  ] },
  { key: "website_project_data_update", titleAr: "سادسًا إلى تاسعًا: التأخير وصحة البيانات واعتمادها وتحديث الملحق", fields: [
    { key: "website_pd_delay_notes", type: "textarea", labelAr: "ملاحظات خاصة بتأخر تقديم البيانات أو المحتوى (إن وجدت)" },
    { key: "website_pd_update_notes", type: "textarea", labelAr: "تحديثات أو ملاحظات إضافية على الملحق" },
  ] },
];

const websiteDeliverySteps: WizardStepDefinition[] = [
  { key: "website_dar_header", titleAr: "أولًا: بيانات محضر التسليم", fields: [
    { key: "website_dar_record_date", type: "date", labelAr: "تاريخ تحرير المحضر" }, { key: "website_dar_contract_date", type: "date", labelAr: "تاريخ عقد تطوير الموقع" },
    { key: "website_dar_client_name", type: "text", labelAr: "الطرف الأول — الاسم / الشركة" }, { key: "website_dar_client_capacity", type: "text", labelAr: "صفة الطرف الأول" },
    { key: "website_dar_provider_name", type: "text", labelAr: "الطرف الثاني — الاسم" }, { key: "website_dar_provider_capacity", type: "text", labelAr: "صفة الطرف الثاني" },
    { key: "website_dar_project_name", type: "text", labelAr: "اسم المشروع" }, { key: "website_dar_project_type", type: "text", labelAr: "نوع المشروع" }, { key: "website_dar_contract_no", type: "text", labelAr: "رقم العقد (إن وجد)" },
    { key: "website_dar_no", type: "text", labelAr: "رقم هذا المحضر" }, { key: "website_dar_version", type: "text", labelAr: "رقم إصدار المشروع (Version)" },
    { key: "website_dar_start", type: "date", labelAr: "تاريخ بدء التنفيذ" }, { key: "website_dar_actual_end", type: "date", labelAr: "تاريخ الانتهاء الفعلي" }, { key: "website_dar_delivery_date", type: "date", labelAr: "تاريخ التسليم" },
    { key: "website_dar_environment", type: "radio", labelAr: "بيئة التسليم", options: [{ value: "Production", labelAr: "بيئة الإنتاج (Production)" }, { value: "Staging", labelAr: "بيئة الاختبار (Staging)" }, { value: "أخرى", labelAr: "بيئة أخرى" }] },
    { key: "website_dar_environment_other", type: "text", labelAr: "بيئة تسليم أخرى", manualCheckbox: true },
  ] },
  { key: "website_dar_work", titleAr: "ثانيًا: الأعمال محل التسليم وحالة المشروع", fields: [
    { key: "website_dar_work_items", type: "repeater", labelAr: "الأعمال محل التسليم", blankRows: 12, blankRowLabels: [
      "الموقع الإلكتروني", "لوحة التحكم", "قاعدة البيانات", "واجهة المستخدم (UI)", "التصميم المتجاوب", "واجهات برمجة التطبيقات (APIs)", "نظام تسجيل المستخدمين", "نظام تسجيل الدخول", "نظام إدارة المحتوى", "بوابة الدفع الإلكتروني (إن وجدت)", "نظام الإشعارات", "التقارير والإحصاءات / عناصر أخرى",
    ], columns: [
      { key: "item", type: "text", labelAr: "العنصر" }, { key: "status", type: "radio", labelAr: "الحالة", options: [{ value: "تم التسليم", labelAr: "تم التسليم" }, { value: "تسليم جزئي", labelAr: "تسليم جزئي" }, { value: "غير مشمول", labelAr: "غير مشمول" }] }, { key: "date", type: "text", labelAr: "تاريخ التسليم" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_dar_excluded", type: "repeater", labelAr: "الأعمال غير المشمولة بالتسليم", blankRows: 4, columns: [{ key: "item", type: "text", labelAr: "العنصر" }, { key: "reason", type: "text", labelAr: "سبب الاستبعاد" }] },
    { key: "website_dar_project_state", type: "radio", labelAr: "حالة المشروع وقت التسليم", options: [
      { value: "مكتمل وجاهز للاعتماد", labelAr: "تم تنفيذ المشروع بالكامل وهو جاهز للاعتماد النهائي" }, { value: "مكتمل مع ملاحظات غير جوهرية", labelAr: "تم التنفيذ مع ملاحظات غير جوهرية" }, { value: "تسليم جزئي", labelAr: "تم التسليم الجزئي" }, { value: "لم يكتمل التسليم النهائي", labelAr: "لم يكتمل التسليم النهائي" },
    ] },
  ] },
  { key: "website_dar_tests", titleAr: "ثالثًا ورابعًا: الاختبارات الفنية واعتماد المشروع", fields: [
    { key: "website_dar_tests", type: "repeater", labelAr: "نتائج الاختبارات الفنية", blankRows: 12, blankRowLabels: [
      "تشغيل الموقع", "لوحة الإدارة", "واجهة المستخدم (UI)", "قواعد البيانات", "صلاحيات المستخدمين", "النماذج (Forms)", "البريد الإلكتروني والإشعارات", "التكامل مع الخدمات الخارجية", "بوابات الدفع (إن وجدت)", "الأداء الفني", "عناصر الأمن الأساسية", "عناصر أخرى",
    ], columns: [
      { key: "test", type: "text", labelAr: "بند الاختبار" }, { key: "result", type: "radio", labelAr: "النتيجة", options: [{ value: "مطابق", labelAr: "مطابق" }, { value: "غير مطابق", labelAr: "غير مطابق" }] }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_dar_test_result", type: "radio", labelAr: "نتيجة الاختبارات", options: [
      { value: "مطابق", labelAr: "المشروع مطابق ويستحق الاعتماد النهائي" }, { value: "مطابق مع ملاحظات غير جوهرية", labelAr: "مطابق مع ملاحظات غير جوهرية" }, { value: "غير مطابق", labelAr: "غير مطابق ويستلزم معالجة ملاحظات جوهرية" },
    ] },
  ] },
  { key: "website_dar_punch", titleAr: "خامسًا: الملاحظات المتبقية (Punch List)", fields: [
    { key: "website_dar_punch_list", type: "repeater", labelAr: "سجل الملاحظات", blankRows: 5, blankRowLabels: ["1","2","3","4","5"], columns: [
      { key: "no", type: "text", labelAr: "رقم الملاحظة" }, { key: "classification", type: "radio", labelAr: "التصنيف", options: [{ value: "جوهرية", labelAr: "جوهرية" }, { value: "غير جوهرية", labelAr: "غير جوهرية" }] }, { key: "owner", type: "text", labelAr: "المسؤول عن المعالجة" }, { key: "target", type: "text", labelAr: "تاريخ الإنجاز المستهدف" }, { key: "closed", type: "text", labelAr: "تاريخ الإغلاق" },
    ] },
    { key: "website_dar_closure_register", type: "repeater", labelAr: "سجل اعتماد معالجة الملاحظات", blankRows: 3, columns: [
      { key: "no", type: "text", labelAr: "رقم الملاحظة" }, { key: "notice_date", type: "text", labelAr: "تاريخ إخطار المعالجة" }, { key: "approved", type: "radio", labelAr: "اعتماد العميل", options: [{ value: "تم", labelAr: "تم" }, { value: "لم يتم", labelAr: "لم يتم" }] }, { key: "approval_date", type: "text", labelAr: "تاريخ الاعتماد" }, { key: "signature", type: "text", labelAr: "توقيع / اعتماد إلكتروني" },
    ] },
  ] },
  { key: "website_dar_files", titleAr: "سادسًا: الملفات والمخرجات المسلمة", fields: [
    { key: "website_dar_files", type: "repeater", labelAr: "الملفات والمخرجات", blankRows: 11, blankRowLabels: [
      "ملفات المشروع النهائية", "النسخة التشغيلية (Deployment / Build)", "ملفات التصميم", "ملفات قواعد البيانات", "نسخة احتياطية (Backup)", "دليل الاستخدام", "دليل مدير النظام", "التوثيق الفني (Documentation)", "ملفات الإعداد (Configuration)", "مفاتيح API الخاصة بالمشروع (إن وجدت)", "عناصر أخرى",
    ], columns: [
      { key: "item", type: "text", labelAr: "العنصر" }, { key: "delivered", type: "radio", labelAr: "تم التسليم", options: [{ value: "نعم", labelAr: "نعم" }, { value: "لا", labelAr: "لا" }] }, { key: "method", type: "text", labelAr: "وسيلة التسليم" }, { key: "date", type: "text", labelAr: "تاريخ التسليم" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
  ] },
  { key: "website_dar_accounts", titleAr: "سابعًا: الحسابات والخدمات التقنية", fields: [
    { key: "website_dar_accounts", type: "repeater", labelAr: "الحسابات والخدمات التقنية", blankRows: 8, blankRowLabels: ["الاستضافة","اسم النطاق (Domain)","شهادة SSL","البريد الإلكتروني","مستودع Git","التخزين السحابي","منصة إدارة المشروع","أدوات التحليلات / خدمات أخرى"], columns: [
      { key: "service", type: "text", labelAr: "الخدمة" }, { key: "delivered", type: "radio", labelAr: "تم التسليم", options: [{ value: "نعم", labelAr: "نعم" }, { value: "لا", labelAr: "لا" }] }, { key: "account", type: "text", labelAr: "اسم الحساب" }, { key: "owner", type: "text", labelAr: "المالك المسجل" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_dar_not_delivered", type: "repeater", labelAr: "العناصر غير المسلمة (إن وجدت)", blankRows: 4, columns: [{ key: "item", type: "text", labelAr: "العنصر" }, { key: "reason", type: "text", labelAr: "سبب عدم التسليم" }] },
  ] },
  { key: "website_dar_warranty_rights", titleAr: "ثامنًا وتاسعًا: بدء الضمان وانتقال الحقوق", fields: [
    { key: "website_dar_warranty_start", type: "date", labelAr: "تاريخ بدء الضمان" }, { key: "website_dar_warranty_duration", type: "text", labelAr: "مدة الضمان" },
    { key: "website_dar_rights_notes", type: "textarea", labelAr: "ملاحظات خاصة بانتقال حق الاستخدام أو الشفرة المصدرية (إن وجدت)" },
  ] },
  { key: "website_dar_declarations", titleAr: "عاشرًا إلى الثامن عشر: الإقرارات وحجية المحضر", fields: [
    { key: "website_dar_declaration_notes", type: "textarea", labelAr: "ملاحظات أو إقرارات إضافية (إن وجدت)" }, { key: "website_dar_copies", type: "number", labelAr: "عدد النسخ الأصلية أو الإلكترونية" },
  ] },
];

const websiteSlaSteps: WizardStepDefinition[] = [
  { key: "website_sla_scope_start", titleAr: "البنود الأول إلى الثالث: نطاق الصيانة وبدء الخدمة والخدمات المشمولة", fields: [
    { key: "website_sla_start_mode", type: "radio", labelAr: "بداية خدمات الصيانة", options: [
      { value: "after_warranty", labelAr: "بعد انتهاء مدة الضمان مباشرة" },
      { value: "specific_date", labelAr: "اعتبارًا من تاريخ محدد" },
      { value: "parallel", labelAr: "بالتوازي مع مدة الضمان" },
    ] },
    { key: "website_sla_start_date", type: "date", labelAr: "تاريخ بدء الصيانة (عند اختيار تاريخ محدد)" },
    ...serviceCheckboxFields("website_sla_service", [
      ["bug_fix", "إصلاح العيوب البرمجية غير المشمولة بالضمان"], ["security", "تحديثات الأمان"], ["framework", "تحديثات إطار العمل (Framework)"],
      ["libraries", "تحديث المكتبات البرمجية (Libraries)"], ["cms", "تحديث نظام إدارة المحتوى"], ["performance", "تحسينات الأداء"],
      ["monitoring", "مراقبة تشغيل الموقع"], ["backup", "النسخ الاحتياطي"], ["restore", "استعادة النسخ الاحتياطية"],
      ["user_support", "الدعم الفني للمستخدمين"], ["consulting", "الاستشارات الفنية"],
    ]),
    { key: "website_sla_other_services", type: "text", labelAr: "خدمات أخرى", manualCheckbox: true },
  ] },
  { key: "website_sla_hours_channels", titleAr: "البنود الرابع إلى السادس: ساعات العمل وقنوات الدعم ورصيد الدعم الفني", fields: [
    { key: "website_sla_work_days", type: "text", labelAr: "أيام العمل" },
    { key: "website_sla_work_from", type: "text", labelAr: "ساعات العمل - من" },
    { key: "website_sla_work_to", type: "text", labelAr: "ساعات العمل - إلى" },
    ...serviceCheckboxFields("website_sla_channel", [
      ["ticket", "نظام التذاكر (Ticket System)"], ["email", "البريد الإلكتروني"], ["project_platform", "منصة إدارة المشروع"],
      ["phone", "الهاتف"], ["messaging", "تطبيقات المراسلة الإلكترونية"],
    ]),
    { key: "website_sla_channel_other", type: "text", labelAr: "وسيلة دعم أخرى", manualCheckbox: true },
    { key: "website_sla_balance_mode", type: "radio", labelAr: "آلية رصيد الدعم", options: [
      { value: "hours", labelAr: "عدد ساعات دعم شهري" }, { value: "unlimited_tickets", labelAr: "عدد غير محدود من البلاغات" },
      { value: "limited_tickets", labelAr: "عدد محدد من البلاغات شهريًا" }, { value: "service_table", labelAr: "وفق جدول خدمات مستقل" },
    ] },
    { key: "website_sla_monthly_hours", type: "number", labelAr: "عدد ساعات الدعم الشهري" },
    { key: "website_sla_monthly_tickets", type: "number", labelAr: "عدد البلاغات الشهري" },
    { key: "website_sla_rollover", type: "radio", labelAr: "آلية ترحيل الرصيد", options: [
      { value: "no", labelAr: "لا يتم الترحيل" }, { value: "yes", labelAr: "يتم الترحيل إلى الفترة التالية" },
    ] },
    { key: "website_sla_rollover_hours", type: "number", labelAr: "الحد الأقصى للساعات المرحلة" },
    { key: "website_sla_rollover_tickets", type: "number", labelAr: "الحد الأقصى للبلاغات المرحلة" },
    { key: "website_sla_rollover_period", type: "text", labelAr: "أقصى مدة للترحيل" },
  ] },
  { key: "website_sla_exclusions_training", titleAr: "البندان السابع والثامن: الخدمات غير المشمولة والتدريب الفني", fields: [
    { key: "website_sla_exclusions_note", type: "textarea", labelAr: "الخدمات غير المشمولة (وفق النص القانوني أدناه)" },
    { key: "website_sla_training_mode", type: "radio", labelAr: "التدريب الفني", options: [
      { value: "none", labelAr: "لا يشمل الملحق خدمات تدريب" }, { value: "included", labelAr: "يشمل خدمات تدريب" },
    ] },
    { key: "website_sla_training_sessions", type: "number", labelAr: "عدد جلسات التدريب" },
    { key: "website_sla_training_session_duration", type: "text", labelAr: "مدة كل جلسة" },
    { key: "website_sla_training_method", type: "radio", labelAr: "طريقة التدريب", options: [
      { value: "حضوري", labelAr: "حضوري" }, { value: "عن بعد", labelAr: "عن بُعد" }, { value: "تسجيلات مرئية", labelAr: "تسجيلات مرئية" },
      { value: "دليل استخدام", labelAr: "دليل استخدام" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "website_sla_training_method_other", type: "text", labelAr: "طريقة تدريب أخرى" },
    ...serviceCheckboxFields("website_sla_training_audience", [
      ["users", "مستخدمو النظام"], ["admins", "مسؤولو النظام"], ["project_manager", "مدير المشروع"],
    ]),
    { key: "website_sla_training_audience_other", type: "text", labelAr: "فئة مستهدفة أخرى", manualCheckbox: true },
  ] },
  { key: "website_sla_financial", titleAr: "البنود التاسع إلى الحادي عشر: المقابل المالي ومدة الملحق ورسوم الخدمات الخارجية", fields: [
    { key: "website_sla_fee_model", type: "radio", labelAr: "نموذج المقابل المالي", options: [
      { value: "monthly", labelAr: "اشتراك شهري" }, { value: "quarterly", labelAr: "اشتراك ربع سنوي" },
      { value: "semiannual", labelAr: "اشتراك نصف سنوي" }, { value: "annual", labelAr: "اشتراك سنوي" },
      { value: "hour", labelAr: "بالساعة" }, { value: "ticket", labelAr: "لكل بلاغ" }, { value: "quote", labelAr: "وفق عرض سعر مستقل" },
    ] },
    { key: "website_sla_fee_amount", type: "money", labelAr: "قيمة المقابل المالي (جنيه)" },
    { key: "website_sla_quote_number", type: "text", labelAr: "رقم عرض السعر (إن وجد)" },
    { key: "website_sla_quote_date", type: "date", labelAr: "تاريخ عرض السعر" },
    ...serviceCheckboxFields("website_sla_payment_method", [
      ["cash", "نقدًا (كاش)"], ["bank", "تحويل بنكي"], ["instapay", "إنستاباي (InstaPay)"], ["wallet", "محفظة إلكترونية"],
      ["card", "بطاقة ائتمان / بطاقة خصم"], ["check", "شيك"], ["gateway", "بوابة دفع إلكتروني"], ["all", "جميع الوسائل السابقة"],
    ]),
    { key: "website_sla_payment_due", type: "text", labelAr: "ميعاد السداد" },
    { key: "website_sla_duration", type: "text", labelAr: "مدة الملحق" },
    { key: "website_sla_renewal", type: "radio", labelAr: "التجديد", options: [
      { value: "auto", labelAr: "يتجدد تلقائيًا لمدة مماثلة" }, { value: "written", labelAr: "يجدد باتفاق كتابي جديد" },
      { value: "no_auto", labelAr: "لا يتجدد تلقائيًا" },
    ] },
    { key: "website_sla_external_fees_notes", type: "textarea", labelAr: "ملاحظات رسوم الخدمات الخارجية (إن وجدت)" },
  ] },
  { key: "website_sla_incidents", titleAr: "البنود الثاني عشر إلى الخامس عشر: تصنيف البلاغات ومستويات الخدمة", fields: [
    { key: "website_sla_incident_definitions", type: "repeater", labelAr: "تصنيف البلاغات الفنية", blankRows: 4, blankRowLabels: ["حرج (Critical)", "مرتفع (High)", "متوسط (Medium)", "منخفض (Low)"], columns: [
      { key: "severity", type: "text", labelAr: "مستوى البلاغ" }, { key: "description", type: "text", labelAr: "الوصف / الأثر" },
    ] },
    { key: "website_sla_levels", type: "repeater", labelAr: "مستويات الخدمة المستهدفة", blankRows: 4, blankRowLabels: ["حرج (Critical)", "مرتفع (High)", "متوسط (Medium)", "منخفض (Low)"], columns: [
      { key: "severity", type: "text", labelAr: "مستوى البلاغ" }, { key: "start", type: "text", labelAr: "زمن بدء المعالجة" }, { key: "resolution", type: "text", labelAr: "الزمن المستهدف للحل" },
    ] },
  ] },
  { key: "website_sla_maintenance_backup", titleAr: "البنود السادس عشر إلى التاسع عشر: الصيانة الوقائية والنسخ الاحتياطي وحماية البيانات", fields: [
    { key: "website_sla_maintenance_notes", type: "textarea", labelAr: "ملاحظات التحديثات الدورية / الصيانة الوقائية / Rollback" },
    { key: "website_sla_backup_frequency", type: "radio", labelAr: "دورية النسخ الاحتياطي", options: [
      { value: "يومية", labelAr: "يومية" }, { value: "أسبوعية", labelAr: "أسبوعية" }, { value: "شهرية", labelAr: "شهرية" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "website_sla_backup_frequency_other", type: "text", labelAr: "دورية أخرى" },
    { key: "website_sla_backup_retention", type: "text", labelAr: "مدة الاحتفاظ بالنسخ" },
    { key: "website_sla_backup_location", type: "text", labelAr: "مكان التخزين" },
    { key: "website_sla_backup_cost_bearer", type: "radio", labelAr: "الجهة التي تتحمل تكلفة التخزين", options: [
      { value: "الطرف الأول", labelAr: "الطرف الأول" }, { value: "الطرف الثاني", labelAr: "الطرف الثاني" }, { value: "وفق الاتفاق", labelAr: "وفق ما يتفق عليه الطرفان" },
    ] },
    { key: "website_sla_data_environment_notes", type: "textarea", labelAr: "ملاحظات حماية البيانات وبيئات التشغيل" },
  ] },
  { key: "website_sla_reports_end", titleAr: "البندان العشرون والحادي والعشرون: التقارير الدورية وانتهاء الملحق", fields: [
    { key: "website_sla_report_frequency", type: "radio", labelAr: "دورية التقرير", options: [
      { value: "أسبوعيًا", labelAr: "أسبوعيًا" }, { value: "شهريًا", labelAr: "شهريًا" }, { value: "ربع سنويًا", labelAr: "ربع سنويًا" }, { value: "عند الطلب", labelAr: "عند الطلب" },
    ] },
    { key: "website_sla_end_notes", type: "textarea", labelAr: "ملاحظات خاصة بانتهاء الملحق أو استمرار معالجة بلاغ قائم" },
  ] },
];

const websiteFutureSteps: WizardStepDefinition[] = [
  { key: "website_future_request", titleAr: "أولًا إلى خامسًا: نطاق الملحق وطلب التطوير والدراسة الفنية", fields: [
    { key: "website_future_request_description", type: "textarea", labelAr: "وصف التطوير المطلوب" },
    { key: "website_future_purpose", type: "textarea", labelAr: "الغرض من التطوير" },
    { key: "website_future_priority", type: "text", labelAr: "الأولوية المطلوبة للتنفيذ" },
    { key: "website_future_requested_date", type: "date", labelAr: "الموعد المطلوب للتسليم (إن وجد)" },
    { key: "website_future_requirements", type: "textarea", labelAr: "المتطلبات أو البيانات أو الملفات أو المستندات اللازمة للدراسة" },
    { key: "website_future_extra_info", type: "textarea", labelAr: "معلومات أخرى" },
    { key: "website_future_study_decision", type: "radio", labelAr: "الرد على طلب الدراسة", options: [
      { value: "قبول دراسة الطلب", labelAr: "قبول دراسة الطلب" }, { value: "طلب استكمال البيانات", labelAr: "طلب استكمال البيانات أو المتطلبات" }, { value: "الاعتذار", labelAr: "الاعتذار عن تنفيذ التطوير" },
    ] },
    { key: "website_future_study_notes", type: "textarea", labelAr: "ملاحظات الدراسة الفنية / الحلول والبدائل والمخاطر" },
  ] },
  { key: "website_future_study_fee", titleAr: "سادسًا وسابعًا: مقابل الدراسة الفنية ونتائجها", fields: [
    { key: "website_future_study_fee_required", type: "radio", labelAr: "هل للدراسة الفنية مقابل مستقل؟", options: yesNo },
    { key: "website_future_study_fee", type: "money", labelAr: "مقابل الدراسة الفنية" },
    { key: "website_future_study_result", type: "radio", labelAr: "نتيجة الدراسة الفنية", options: [
      { value: "يوصى بالتنفيذ", labelAr: "يوصى بتنفيذ التطوير" }, { value: "التنفيذ مع تعديلات", labelAr: "التنفيذ مع تعديلات أو بدائل فنية" },
      { value: "التجزئة", labelAr: "تجزئة التطوير إلى مراحل مستقلة" }, { value: "عدم التنفيذ", labelAr: "يوصى بعدم التنفيذ" },
    ] },
    { key: "website_future_study_result_notes", type: "textarea", labelAr: "تفاصيل نتيجة الدراسة" },
  ] },
  { key: "website_future_offer", titleAr: "ثامنًا إلى عاشرًا: العرض الفني والمالي وصلاحيته والأعمال المستعجلة", fields: [
    { key: "website_future_offer_scope", type: "textarea", labelAr: "وصف الأعمال ونطاق التطوير" },
    { key: "website_future_offer_parties", type: "textarea", labelAr: "حدود مسؤولية كل طرف" },
    { key: "website_future_offer_milestones", type: "textarea", labelAr: "مراحل التنفيذ" },
    { key: "website_future_offer_schedule", type: "textarea", labelAr: "الجدول الزمني المتوقع" },
    { key: "website_future_offer_acceptance", type: "textarea", labelAr: "معايير قبول كل مرحلة" },
    { key: "website_future_offer_technical_requirements", type: "textarea", labelAr: "المتطلبات الفنية والبيانات والصلاحيات اللازمة" },
    { key: "website_future_offer_price", type: "money", labelAr: "المقابل المالي للتطوير" },
    { key: "website_future_offer_payment", type: "textarea", labelAr: "طريقة السداد والدفعات المقدمة أو المرحلية" },
    { key: "website_future_offer_warranty", type: "text", labelAr: "مدة الضمان الخاصة بالتطوير (إن اختلفت)" },
    { key: "website_future_offer_third_party", type: "textarea", labelAr: "متطلبات الاستضافة أو التراخيص أو خدمات الغير" },
    { key: "website_future_offer_validity_days", type: "number", labelAr: "مدة صلاحية العرض بالأيام (بحد أقصى 30 يومًا)" },
    { key: "website_future_urgent", type: "radio", labelAr: "هل الطلب مستعجل؟", options: yesNo },
    { key: "website_future_urgent_notes", type: "textarea", labelAr: "أثر الاستعجال والمقابل الإضافي (إن وجد)" },
  ] },
  { key: "website_future_approval_start", titleAr: "الحادي عشر والثاني عشر: اعتماد أعمال التطوير وشروط بدء المدة", fields: [
    { key: "website_future_approval", type: "repeater", labelAr: "بيانات الاعتماد", blankRows: 5, blankRowLabels: ["نطاق التطوير", "المقابل المالي", "مدة التنفيذ", "آلية السداد", "الشروط الخاصة"], columns: [
      { key: "item", type: "text", labelAr: "العنصر" }, { key: "approved_value", type: "text", labelAr: "البيان المعتمد" },
    ] },
    { key: "website_future_start_conditions", type: "repeater", labelAr: "شروط بدء التنفيذ", blankRows: 4, blankRowLabels: ["اعتماد العرض الفني والمالي", "سداد الدفعة المستحقة (إن وجدت)", "استلام البيانات والملفات والصلاحيات", "إزالة أي عائق فني أو إداري"], columns: [
      { key: "condition", type: "text", labelAr: "الشرط" }, { key: "status", type: "radio", labelAr: "متحقق", options: [{ value: "نعم", labelAr: "نعم" }, { value: "لا", labelAr: "لا" }] }, { key: "date", type: "text", labelAr: "تاريخ التحقق" },
    ] },
  ] },
  { key: "website_future_execution", titleAr: "الثالث عشر إلى التاسع عشر: التنفيذ والتسليم والضمان والتعليق والإلغاء", fields: [
    { key: "website_future_execution_notes", type: "textarea", labelAr: "ملاحظات تنفيذ أعمال التطوير" },
    { key: "website_future_delivery_notes", type: "textarea", labelAr: "ملاحظات التسليم ومعايير القبول" },
    { key: "website_future_warranty_notes", type: "textarea", labelAr: "ملاحظات الضمان" },
    { key: "website_future_suspension_notes", type: "textarea", labelAr: "ملاحظات تعليق التنفيذ" },
    { key: "website_future_cancellation_notes", type: "textarea", labelAr: "ملاحظات إلغاء الطلب وتسوية الأعمال المنجزة" },
    { key: "website_future_ip_notes", type: "textarea", labelAr: "ملاحظات حقوق الملكية الفكرية" },
    { key: "website_future_support_notes", type: "textarea", labelAr: "ملاحظات الدعم الفني والصيانة" },
  ] },
  { key: "website_future_end", titleAr: "العشرون إلى الرابع والعشرين: انتهاء الملحق وآثاره والتوقيعات", fields: [
    { key: "website_future_end_notes", type: "textarea", labelAr: "ملاحظات انتهاء الملحق أو الأعمال القائمة عند انتهائه" },
    { key: "website_future_copies", type: "number", labelAr: "عدد النسخ الأصلية أو الإلكترونية" },
  ] },
];

const socialScopeSteps: WizardStepDefinition[] = [
  { key: "social_scope_accounts", titleAr: "المنصات والحسابات المشمولة", fields: [
    { key: "social_platforms", type: "repeater", labelAr: "المنصات والحسابات", required: true, minRows: 1, columns: [
      { key: "platform", type: "text", labelAr: "المنصة", required: true },
      { key: "included", type: "select", labelAr: "مشمولة", required: true, options: yesNo },
      { key: "existing", type: "select", labelAr: "الحساب قائم", options: yesNo },
      { key: "create", type: "select", labelAr: "سيتم إنشاؤه", options: yesNo },
      { key: "account", type: "text", labelAr: "رابط الحساب / اسم المستخدم" },
    ] },
    ...serviceCheckboxFields("social_service", [
      ["strategy", "إعداد استراتيجية المحتوى"], ["calendar", "إعداد خطة النشر"], ["copywriting", "كتابة المحتوى"],
      ["proofreading", "التدقيق اللغوي"], ["posts", "تصميم المنشورات"], ["stories", "تصميم القصص"],
      ["ads_design", "تصميم الإعلانات"], ["covers", "تصميم الأغلفة والصور الشخصية"], ["photo_edit", "تعديل الصور"],
      ["video_edit", "مونتاج الفيديوهات"], ["reels", "تصميم الريلز"], ["publishing", "نشر المحتوى"],
      ["scheduling", "جدولة المنشورات"], ["messages", "إدارة الرسائل الخاصة"], ["comments", "إدارة التعليقات"],
      ["ad_campaigns", "إدارة الحملات الإعلانية"], ["campaign_results", "متابعة نتائج الحملات"],
      ["reports", "إعداد التقارير الدورية"], ["optimization", "تحسين الحسابات"],
    ]),
    { key: "social_service_other", type: "text", labelAr: "خدمات أخرى" },
  ] },
  { key: "social_scope_outputs", titleAr: "المخرجات وخطة النشر والاعتماد", fields: [
    { key: "social_outputs", type: "repeater", labelAr: "المخرجات المتفق عليها", required: true, minRows: 1, columns: [
      { key: "output", type: "text", labelAr: "المخرج", required: true }, { key: "quantity", type: "number", labelAr: "الكمية" },
      { key: "frequency", type: "text", labelAr: "الدورية" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "social_content_types", type: "text", labelAr: "أنواع المحتوى", required: true },
    { key: "social_monthly_volume", type: "text", labelAr: "حجم المحتوى الشهري أو الدوري", required: true },
    { key: "social_approval_method", type: "select", labelAr: "وسيلة الاعتماد", required: true, options: [
      { value: "email", labelAr: "البريد الإلكتروني" }, { value: "platform", labelAr: "المنصة" }, { value: "project_tool", labelAr: "أداة إدارة المشروع" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "social_approval_method_other", type: "text", labelAr: "وسيلة الاعتماد الأخرى", required: true, visibleWhen: { fieldKey: "social_approval_method", operator: "equals", value: "other" } },
    { key: "social_approval_days", type: "number", labelAr: "مدة الرد والاعتماد بالأيام", required: true, validation: { min: 1 } },
    { key: "social_report_frequency", type: "text", labelAr: "دورية التقارير", required: true },
    { key: "social_scope_exclusions", type: "textarea", labelAr: "الخدمات غير المشمولة", required: true },
  ] },
];

const socialFinancialSteps: WizardStepDefinition[] = [
  { key: "social_financial", titleAr: "المقابل المالي وآلية السداد", fields: [
    { key: "social_financial_amount", type: "money", labelAr: "قيمة المقابل المالي", required: true, validation: { min: 1 } },
    { key: "social_financial_currency", type: "select", labelAr: "عملة السداد", required: true, options: currencyOptions },
    { key: "social_financial_nature", type: "text", labelAr: "طبيعة المقابل المالي", required: true },
    { key: "social_payment_plan", type: "repeater", labelAr: "خطة السداد", required: true, minRows: 1, columns: [
      { key: "payment_no", type: "number", labelAr: "رقم الدفعة" }, { key: "amount", type: "money", labelAr: "قيمة الدفعة", required: true },
      { key: "due", type: "text", labelAr: "تاريخ أو واقعة الاستحقاق", required: true }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "social_payment_beneficiary", type: "text", labelAr: "اسم المستفيد", required: true },
    { key: "social_payment_provider", type: "text", labelAr: "البنك أو مقدم خدمة الدفع", required: true },
    { key: "social_payment_account", type: "text", labelAr: "رقم الحساب أو المحفظة أو وسيلة السداد", required: true },
    { key: "social_payment_iban", type: "text", labelAr: "IBAN - إن وجد" },
    { key: "social_invoice_issuer", type: "text", labelAr: "جهة إصدار الفاتورة", required: true },
    { key: "social_invoice_email", type: "text", labelAr: "البريد الإلكتروني للفواتير", required: true },
    { key: "social_has_ad_budget", type: "radio", labelAr: "هل توجد ميزانية إعلانية ممولة؟", required: true, options: yesNo },
    { key: "social_ad_budget", type: "money", labelAr: "قيمة الميزانية الإعلانية", required: true, visibleWhen: { fieldKey: "social_has_ad_budget", operator: "equals", value: "yes" } },
    { key: "social_ad_budget_currency", type: "select", labelAr: "عملة الميزانية الإعلانية", required: true, visibleWhen: { fieldKey: "social_has_ad_budget", operator: "equals", value: "yes" }, options: currencyOptions },
    { key: "social_ad_account", type: "text", labelAr: "الحساب الإعلاني المستخدم", required: true, visibleWhen: { fieldKey: "social_has_ad_budget", operator: "equals", value: "yes" } },
    { key: "social_ad_budget_funder", type: "text", labelAr: "جهة تمويل الميزانية", required: true, visibleWhen: { fieldKey: "social_has_ad_budget", operator: "equals", value: "yes" } },
  ] },
];

function optionalClause(input: {
  key: string;
  nameAr: string;
  description: string;
  title: string;
  source: string;
  variant: string;
  steps: WizardStepDefinition[];
}): OptionalClauseDefinition {
  return {
    key: input.key,
    nameAr: input.nameAr,
    description: `ملحق اختياري بالكامل وقالب فارغ للطباعة والتعبئة اليدوية؛ لا يُضاف تلقائيًا ولا تُنقل إليه بيانات الـWizard. ${input.description}`,
    documentTitleAr: input.title,
    sourceDocumentName: input.source,
    outputMode: "separate_annex",
    manualFillAnnex: true,
    applicableVariantKeys: [input.variant],
    insertedSteps: input.steps,
    insertBeforeStepKey: `${input.variant === "visual_identity_design" ? "visual" : input.variant === "website_development" ? "website" : "social"}_review`,
    legalClauseKeys: [...freelanceSourceClauseKeysByAnnex[input.key as keyof typeof freelanceSourceClauseKeysByAnnex]],
  };
}

const optionalClauses: OptionalClauseDefinition[] = [
  optionalClause({ key: "visual_identity_scope_annex", nameAr: "ملحق نطاق العمل والمخرجات الفنية", description: "يُستكمل فيه نطاق الخدمات والمخرجات والمراجعات وجدول التنفيذ.", title: "ملحق نطاق العمل والمخرجات الفنية", source: "ملحق رقم (1).pdf", variant: "visual_identity_design", steps: visualScopeSteps }),
  optionalClause({ key: "visual_identity_financial_annex", nameAr: "ملحق المقابل المالي وخطة التنفيذ", description: "يُستكمل فيه المقابل والدفعات ووسائل السداد وشروط بدء التنفيذ.", title: "ملحق المقابل المالي وآلية السداد وخطة التنفيذ", source: "ملحق المقابل المالي وآلية السداد وخطة التنفيذ.pdf", variant: "visual_identity_design", steps: visualFinancialSteps }),
  optionalClause({ key: "visual_identity_approvals_annex", nameAr: "ملحق الاعتمادات وإدارة التنفيذ", description: "يُستكمل فيه سجل المراحل والمراجعات والتعديلات والتسليم.", title: "ملحق الاعتمادات وإدارة التنفيذ", source: "الملحق رقم (3).pdf", variant: "visual_identity_design", steps: visualApprovalsSteps }),
  optionalClause({ key: "website_scope_annex", nameAr: "ملحق نطاق العمل SOW", description: "الأعمال والمخرجات والوظائف والصفحات المشمولة.", title: "ملحق نطاق العمل (Scope of Work)", source: "الملحق (أ)  نطاق العمل (Scope of Work).pdf", variant: "website_development", steps: websiteScopeSteps }),
  optionalClause({ key: "website_technical_annex", nameAr: "ملحق المواصفات الفنية TS", description: "البنية والتقنيات والتكاملات والاستضافة والأمان.", title: "ملحق المواصفات الفنية (Technical Specifications)", source: "الملحق (ب).pdf", variant: "website_development", steps: websiteTechnicalSteps }),
  optionalClause({ key: "website_project_data_annex", nameAr: "ملحق بيانات المشروع", description: "بيانات المشروع والملفات والحسابات المطلوب توفيرها.", title: "ملحق بيانات المشروع", source: "Document 8.pdf", variant: "website_development", steps: websiteProjectDataSteps }),
  optionalClause({ key: "website_delivery_annex", nameAr: "محضر التسليم والاعتماد النهائي", description: "توثيق الأعمال المسلمة والاختبارات والاعتماد والضمان.", title: "محضر التسليم والاعتماد النهائي للمشروع", source: "الملحق رقم (د).pdf", variant: "website_development", steps: websiteDeliverySteps }),
  optionalClause({ key: "website_sla_annex", nameAr: "اتفاقية الصيانة والدعم الفني SLA", description: "خدمات الصيانة وقنوات الدعم ومستويات الاستجابة.", title: "اتفاقية الصيانة والدعم الفني ومستويات الخدمة (SLA)", source: "الملحق الاختياري رقم (1).pdf", variant: "website_development", steps: websiteSlaSteps }),
  optionalClause({ key: "website_future_development_annex", nameAr: "اتفاقية التطويرات المستقبلية", description: "تنظيم طلبات التطوير والأعمال الإضافية بعد أو أثناء التنفيذ.", title: "اتفاقية التطويرات المستقبلية والأعمال الإضافية", source: "اتفاقية التطويرات المستقبلية والأعمال الإضافية.pdf", variant: "website_development", steps: websiteFutureSteps }),
  optionalClause({ key: "social_media_scope_annex", nameAr: "ملحق نطاق الخدمات وبيانات المشروع SOS", description: "المنصات والخدمات والمخرجات وخطة الاعتماد والتقارير.", title: "ملحق نطاق الخدمات وبيانات المشروع (SOS)", source: "الملحق رقم (1).pdf", variant: "social_media_management", steps: socialScopeSteps }),
  optionalClause({ key: "social_media_financial_annex", nameAr: "ملحق المقابل المالي وآلية السداد", description: "المقابل وخطة السداد وبيانات الدفع والفواتير والميزانية الإعلانية.", title: "ملحق المقابل المالي وآلية السداد", source: "الملحق رقم (2).pdf", variant: "social_media_management", steps: socialFinancialSteps }),
];

const variants: ContractVariantDefinition[] = [
  {
    key: "visual_identity_design",
    nameAr: "عقد تصميم الهوية البصرية",
    description: "تنظيم تصميم أو تطوير الهوية البصرية والمخرجات وحقوق الاستخدام.",
    documentTitleAr: "عقد تصميم الهوية البصرية",
    sourceDocumentName: "عقد الهوية البصرية.pdf",
    steps: visualSteps,
    requiredClauseKeys: [
      ...freelanceSourceClauseKeysByVariant.visual_identity_design,
    ],
    allowedOptionalClauseKeys: ["visual_identity_scope_annex", "visual_identity_financial_annex", "visual_identity_approvals_annex"],
    defaultFieldValues: {
      visual_client_party_type: "individual",
      visual_provider_party_type: "individual",
      visual_client_nationality: "مصري",
      visual_provider_nationality: "مصري",
      visual_client_identity_document_type: "national_id",
      visual_provider_identity_document_type: "national_id",
      visual_source_files_included: "no",
      visual_execution_start_rule: "source_rule",
      visual_payment_mode: "single",
      visual_revision_rounds: 3,
      visual_portfolio_permission: "yes",
      visual_breach_cure_days: 15,
      visual_nonpayment_termination_days: 10,
      visual_client_stoppage_days: 7,
      visual_post_notice_termination_days: 7,
      visual_email_notices_enabled: false,
      visual_notice_use_party_emails: true,
      visual_messaging_apps_enabled: false,
      visual_messaging_use_party_phones: true,
      visual_witness_1_enabled: false,
      visual_witness_2_enabled: false,
    },
  },
  {
    key: "website_development",
    nameAr: "عقد تطوير موقع إلكتروني",
    description: "تنظيم تطوير المواقع والمنصات والأنظمة وملحقاتها الفنية والتنفيذية.",
    documentTitleAr: "عقد تطوير موقع إلكتروني",
    sourceDocumentName: "عقد برمجة ويب سيت.pdf",
    steps: websiteSteps,
    requiredClauseKeys: freelanceSourceClauseKeysByVariant.website_development.flatMap((key) =>
      key === "website_development_source_section_12" ? ["website_development_restored_section_11", key] : [key],
    ),
    allowedOptionalClauseKeys: ["website_scope_annex", "website_technical_annex", "website_project_data_annex", "website_delivery_annex", "website_sla_annex", "website_future_development_annex"],
    defaultFieldValues: {
      website_client_party_type: "individual",
      website_provider_party_type: "individual",
      website_client_nationality: "مصري",
      website_provider_nationality: "مصري",
      website_client_identity_document_type: "national_id",
      website_provider_identity_document_type: "national_id",
      website_execution_start_rule: "agreed_or_requirements_later",
      website_duration_basis: "بأيام العمل، ما لم يتفق الطرفان كتابةً على احتسابها بالأيام التقويمية",
      website_response_period_days: 5,
      website_review_period_days: 5,
      website_payment_mode: "single",
      website_payment_grace_days: 5,
      website_restart_threshold_days: 30,
      website_restart_fee_enabled: false,
      website_correction_attempts: 3,
      website_confidentiality_years: 3,
      website_portfolio_permission: "no",
      website_external_services_enabled: false,
      website_contact_change_notice_days: 15,
      website_breach_cure_days: 15,
      website_nonpayment_termination_days: 10,
      website_client_stoppage_days: 7,
      website_force_majeure_notice_days: 7,
      website_force_majeure_termination_days: 60,
      website_hardship_duration_days: 30,
      website_hardship_negotiation_days: 15,
      website_contract_copies: 2,
      website_non_solicitation_months: 6,
      website_email_notices_enabled: false,
      website_notice_use_party_emails: true,
      website_messaging_apps_enabled: false,
      website_messaging_use_party_phones: true,
      website_project_platform_enabled: false,
      website_legal_fees_enabled: false,
      website_witness_1_enabled: false,
      website_witness_2_enabled: false,
    },
  },
  {
    key: "social_media_management",
    nameAr: "عقد إدارة حسابات ومنصات التواصل الاجتماعي",
    description: "تنظيم إدارة الحسابات والمحتوى والحملات والتقارير والمقابل المالي.",
    documentTitleAr: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي",
    sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf",
    steps: socialSteps,
    requiredClauseKeys: [
      ...freelanceSourceClauseKeysByVariant.social_media_management.flatMap((key) =>
        key === "social_media_management_source_section_16"
          ? [
              "social_media_management_article_14_intro",
              "social_media_delay_penalty_amount_clause",
              "social_media_delay_penalty_percentage_clause",
              "social_media_management_article_14_tail",
            ]
          : [key],
      ),
      "social_media_legal_fees_clause",
    ],
    // The main source lists social-media annexes as optional, but the reviewed PDF does not include
    // authoritative blank annex forms. Keep internal definitions for future source reconciliation,
    // but do not expose unverified annex text to customers in v14.
    allowedOptionalClauseKeys: [],
    defaultFieldValues: {
      social_client_party_type: "individual",
      social_provider_party_type: "individual",
      social_client_nationality: "مصري",
      social_provider_nationality: "مصري",
      social_client_identity_document_type: "national_id",
      social_provider_identity_document_type: "national_id",
      social_project_manager_custom: false,
      social_approval_person_custom: false,
      social_billing_contact_custom: false,
      social_service_account_management: true,
      social_service_strategy: false,
      social_service_copywriting: false,
      social_service_design: false,
      social_service_content_production: false,
      social_service_publishing: false,
      social_service_paid_ads: false,
      social_service_reports: false,
      social_service_community_management: false,
      social_service_coordination: false,
      social_service_photography: false,
      social_service_influencers: false,
      social_service_other_enabled: false,
      social_ad_budget_mode: "per_campaign",
      social_ad_budget_payer: "client",
      social_ad_budget_included_in_fee: "no",
      social_ad_payment_management: "client_direct",
      social_kpi_enabled: false,
      social_fee_nature: "periodic",
      social_fee_periodicity: "monthly",
      social_payment_mode: "single",
      social_payment_method: "bank",
      social_payment_grace_days: 5,
      social_content_review_days: 5,
      social_source_files_included: "no",
      social_portfolio_permission: "no",
      social_ai_external_data_permission: "no",
      social_delay_penalty_mode: "amount",
      social_delay_penalty_cure_days: 5,
      social_breach_cure_days: 15,
      social_nonpayment_termination_days: 10,
      social_client_stoppage_days: 7,
      social_client_post_notice_termination_days: 15,
      social_force_majeure_notice_days: 7,
      social_contract_copies: 2,
      social_email_notices_enabled: false,
      social_notice_use_party_emails: true,
      social_messaging_apps_enabled: false,
      social_messaging_apps: "whatsapp",
      social_messaging_use_party_phones: true,
      social_legal_fees_enabled: false,
      social_witness_1_enabled: false,
      social_witness_2_enabled: false,
    },
  },
];

function cleanIdentityExtractedText(text: string): string {
  const cleanedLines = text
    .split("اال").join("الا")
    .split("إال").join("إلا")
    .replace(/\s+([\u064B-\u0652])([\u0621-\u064A])/g, "$2$1")
    .split("يلتز م").join("يلتزم")
    .split("م باشرة").join("مباشرة")
    .split("إقرارهم ا").join("إقرارهما")
    .split("\n")
    .map((rawLine: string) => {
      let line = rawLine.trim();
      line = line.replace(/^\.(\d+)\s*/, "$1. ");
      const suffixNumber = line.match(/^(.*)\s+\.(\d+)$/);
      if (suffixNumber) line = `${suffixNumber[2]}. ${suffixNumber[1].trim()}`;
      line = line.replace(/\s+([،؛:.])/g, "$1");
      line = line.replace(/([،؛:])(?=\S)/g, "$1 ");
      return line;
    })
    .filter((line: string) => line !== "ً" && line !== "ٌ" && line !== "ٍ");
  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}


function cleanWebsiteExtractedText(text: string): string {
  return cleanIdentityExtractedText(text)
    .split("البيان المثبت بجدول بيانات العقد أو الملحق").join("")
    .split("البيان المثبت بجدول بيانات العقد").join("")
    .split("األ").join("الأ")
    .split("اإل").join("الإ")
    .split("مراسالت").join("مراسلات")
    .split("آلثار").join("لآثار")
    .split("استالم").join("استلام")
    .split("يف يد").join("يفيد")
    .split("يق تصر").join("يقتصر")
    .split("اس تراتيجيات").join("استراتيجيات")
    .split("مس بقة").join("مسبقة")
    .split("مشم ًوال").join("مشمولًا")
    // Conservative fixes for PDF text-layer word splits observed in the
    // website source. These repair extraction artifacts only; they do not
    // rewrite or reconcile substantive legal provisions.
    .split("يث إن").join("حيث إن")
    .split("شخصاً\nصا").join("شخصًا")
    .split("شخصاً").join("شخصًا")
    .split("ترخي ً\nصا").join("ترخيصًا")
    .split("ترخي ً صا").join("ترخيصًا")
    .split("مرخ ً\nصا").join("مرخصًا")
    .split("مرخ ً صا").join("مرخصًا")
    .split("المال ية").join("المالية")
    .split("تق صير").join("تقصير")
    .split("غ يره").join("غيره")
    .split("وسي لة").join("وسيلة")
    .split("الع قد").join("العقد")
    .split("اآلخر").join("الآخر")
    .split("اآلتية").join("الآتية")
    .split("اآلتي").join("الآتي")
    .split("إلدارة").join("لإدارة")
    .split("خالل").join("خلال")
    .split("مسؤوال").join("مسؤولًا")
    .split("معدال").join("معدلًا")
    .replace(/يقتض\s+سياق/g, "يقتضي سياق")
    .replace(/\(،\s*\)\s*(SOW|TS|DAR|SLA)/g, "($1)")
    .replace(/(SOW|TS|DAR|SLA)\s*\(،\s*\)/g, "$1")
    .replace(/^(\d+)\.\s*-\s*(\d+)\s*/gm, "$1-$2 ")
    .replace(/خمسة\s+5\s*أيام/g, "خمسة (5) أيام")
    .replace(/سبعة\s+7\s*أيام/g, "سبعة (7) أيام")
    .replace(/عشرة\s+10\s*أيام/g, "عشرة (10) أيام")
    .replace(/خمسة عشر\s+15\s*يوم/g, "خمسة عشر (15) يوم")
    .replace(/ثلاثين\s+30\s*يوم/g, "ثلاثين (30) يوم")
    .replace(/ستين\s+60\s*يوم/g, "ستين (60) يوم")
    .replace(/(SOW|TS|DAR|SLA|WhatsApp|API|APIs)(?=[\u0600-\u06FF])/g, "$1 ")
    .replace(/(\d)(?=[\u0600-\u06FF])/g, "$1 ")
    .replace(/\s*ً\./g, ".")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([،؛:.])/g, "$1")
    .replace(/([،؛:])(?=\S)/g, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


function reviewedWebsiteAnnexClause(clause: LegalClauseDefinition): LegalClauseDefinition {
  const base: LegalClauseDefinition = {
    ...clause,
    titleAr: cleanWebsiteExtractedText(clause.titleAr),
    bodyAr: cleanWebsiteExtractedText(clause.bodyAr),
  };

  const formOnlyLine = (line: string): boolean => {
    const compact = line.replace(/\s+/g, " ").trim();
    if (!compact) return false;
    if (compact.includes("☐")) return true;
    if (/\.{5,}/.test(compact)) return true;
    if (/^(?:التفاصيل البيان|البيان التفاصيل|العنصر الحالة|الخدمة اسم الحساب|مقدم الخدمة الغرض اسم الخدمة|البيئة الرابط جهة الاستضافة مسؤول الإدارة|األداة نوع الترخيص المالك مدة الترخيص|الدفعة نسبة الدفعة القيمة تاريخ الاستحقاق حالة السداد|مستوى البالغ زمن بدء المعالجة الزمن المستهدف للحل)$/u.test(compact)) return true;
    if (compact.length <= 90 && /^(?:اسم المشروع|رقم العقد|رقم إصدار|تاريخ إصدار|تاريخ االعتماد|وصف المشروع|نوع المشروع|أيام العمل|ساعات العمل|عدد الجلسات|مدة كل جلسة|اسم االختبار|نتيجة االختبار|مدة هذا الملحق|ميعاد السداد|رقم عرض السعر|تاريخه|دورية النسخ|مدة الاحتفاظ بالنسخ|مكان التخزين|اسم المنصة|رابط المشروع أو الحساب|عدد النسخ)(?:\s*[:：].*)?$/u.test(compact)) return true;
    return false;
  };

  let body = base.bodyAr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !formOnlyLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Manual-fill annexes print the structured blank tables separately. Keep the
  // legal narrative here and remove only duplicate paper-form scaffolding.
  const signatureMarkers = [
    "الطرف الأول (العميل / مالك المشروع) الطرف الثاني (مقدم الخدمة / المطور)",
    "الطرف الأول (العميل / مالك المشروع) الطرف الثاني ( مقدم الخدمة / المطور)",
  ];
  for (const marker of signatureMarkers) {
    const at = body.indexOf(marker);
    if (at >= 0) body = body.slice(0, at).trim();
  }

  if (clause.key === "website_scope_annex_source_preface") {
    return { ...base, titleAr: "ملحق نطاق العمل (Scope of Work)", bodyAr: body.replace(/^نطاق العمل\s*Scope of Work\s*/u, "").trim() };
  }
  if (clause.key === "website_scope_annex_source_section_02") {
    return {
      ...base,
      titleAr: "الحادي عشر: التدريب (اختياري)",
      bodyAr: "التدريب بند اختياري؛ يحدد الطرفان في النموذج المخصص ما إذا كان المشروع يشمل تدريبًا، وعند شمول التدريب تُحدد عدد الجلسات ومدة كل جلسة وطريقة التدريب.",
    };
  }
  if (clause.key === "website_technical_annex_source_preface") {
    return { ...base, titleAr: "ملحق المواصفات الفنية (Technical Specifications)", bodyAr: body.replace(/^المواصفات الفنية\s*Technical Specifications\s*/u, "").trim() };
  }
  if (clause.key === "website_project_data_annex_source_preface") {
    return { ...base, titleAr: "ملحق بيانات المشروع", bodyAr: body.replace(/^بيانات المشروع\s*/u, "").trim() };
  }
  if (clause.key === "website_delivery_annex_source_preface") {
    return { ...base, titleAr: "محضر التسليم والاعتماد النهائي للمشروع", bodyAr: body.replace(/^محضر التسليم والاعتماد النهائي للمشروع\s*/u, "").trim() };
  }
  if (clause.key === "website_sla_annex_source_preface") {
    return { ...base, titleAr: "اتفاقية الصيانة والدعم الفني ومستويات الخدمة (SLA)", bodyAr: "اتفاقية الصيانة والدعم الفني ومستويات الخدمة (SLA)." };
  }
  if (clause.key === "website_future_development_annex_source_preface") {
    body = body.replace(/^اتفاقية التطويرات المستقبلية والأعمال الإضافية\s*/u, "").trim();
    return { ...base, titleAr: "اتفاقية التطويرات المستقبلية والأعمال الإضافية", bodyAr: body };
  }

  return { ...base, bodyAr: body };
}

function reviewedWebsiteMainClause(clause: LegalClauseDefinition): LegalClauseDefinition {
  const base: LegalClauseDefinition = {
    ...clause,
    titleAr: cleanWebsiteExtractedText(clause.titleAr),
    bodyAr: cleanWebsiteExtractedText(clause.bodyAr),
  };
  switch (clause.key) {
    case "website_development_source_preface":
      return {
        ...base,
        titleAr: "بيانات وتمهيد المستند",
        variables: ["contract_date"],
        bodyAr: "عقد تطوير موقع إلكتروني (Website Development Agreement)\nإنه بتاريخ {{contract_date}}، تم إبرام هذا العقد بين الطرفين المبينة بياناتهما وتعريفهما القانوني في المادة الأولى.",
      };
    case "website_development_source_section_02":
      return {
        ...base,
        titleAr: "المادة الأولى: أطراف العقد وبيانات المشروع",
        variables: ["website_client_party_definition", "website_provider_party_definition", "website_project_definition"],
        bodyAr: `أولًا: {{website_client_party_definition}}
ثانيًا: {{website_provider_party_definition}}
ثالثًا: بيانات المشروع والاعتماد: {{website_project_definition}}
وتُعد البيانات السابقة جزءًا جوهريًا من هذا العقد، ويلتزم كل طرف بإخطار الطرف الآخر بأي تغيير جوهري يطرأ على بياناته أو صفته أو وسائل الاتصال المعتمدة وفقًا للمادة العشرين من هذا العقد.`,
      };
    case "website_development_source_section_03":
      return {
        ...base,
        titleAr: "المادة الثانية: التمهيد والإقرارات العامة",
        variables: ["website_project_name", "website_project_type_text"],
        bodyAr: `حيث إن الطرف الأول يرغب في التعاقد مع الطرف الثاني لتطوير المشروع الإلكتروني «{{website_project_name}}» من نوع {{website_project_type_text}} وفقًا للمتطلبات والمواصفات ونطاق العمل المتفق عليها، وحيث إن الطرف الثاني يقر بامتلاكه الخبرة الفنية والقدرة المهنية اللازمة للتنفيذ، فقد اتفق الطرفان على أحكام هذا العقد.
يُعد هذا العقد نافذًا ومستقلًا بذاته، ولا يتوقف انعقاده أو نفاذه على اختيار أي ملحق. وتكون الملاحق اختيارية، ولا يصبح أي ملحق جزءًا من العقد إلا بعد اختياره واستكماله واعتماده من الطرفين.
ويقر كل طرف بصحة البيانات والمستندات التي قدمها، وبأهليته وصفته وسلطته اللازمة لإبرام العقد وتنفيذه، كما يقر الطرف الأول بمشروعية البيانات والمحتوى والمواد والحقوق التي يقدمها لتنفيذ المشروع، ويلتزم الطرفان بالتعاون المتبادل وتقديم البيانات والاعتمادات والقرارات في المواعيد المقررة.
ويقر الطرفان بأن إبرام العقد تم بإرادة حرة وسليمة، وأنه أتيحت لكل منهما فرصة كافية لمراجعة أحكامه وآثاره والاستعانة بمن يراه من المختصين قبل التوقيع عليه.`,
      };
    case "website_development_source_section_04":
      return {
        ...base,
        titleAr: "المادة الثالثة: التعريفات",
        variables: ["website_project_name", "website_project_type_text"],
        bodyAr: `لأغراض تطبيق هذا العقد، تكون للمصطلحات الآتية المعاني المبينة قرين كل منها ما لم يقتض السياق غير ذلك:
العقد: هذا العقد ببياناته ومواده، وأي تعديل أو ملحق اختياري يستكمله الطرفان ويعتمدانه كتابةً.
المشروع: المشروع الإلكتروني «{{website_project_name}}» من نوع {{website_project_type_text}} محل التطوير بموجب هذا العقد.
نطاق العمل: الأعمال والخدمات والمخرجات التي اتفق عليها الطرفان صراحةً في بيانات العقد أو في اتفاق مكتوب أو ملحق اختياري معتمد.
المخرجات: الأعمال أو الملفات أو الأكواد أو التصاميم أو قواعد البيانات أو المستندات الداخلة صراحةً في نطاق العمل المتفق عليه.
معايير القبول: المعايير والمواصفات والاختبارات والنتائج المتفق عليها لتقييم الأعمال والمخرجات، وتثبت في نطاق العمل أو المواصفات الفنية أو أي مستند معتمد بين الطرفين؛ ولا يلزم وجود ملحق مستقل لها.
الاعتماد: قبول الطرف الأول للأعمال أو المخرجات كتابةً أو بإحدى وسائل الاعتماد المقررة في العقد.
الأعمال الإضافية: كل عمل أو خدمة أو تطوير أو خاصية أو تعديل لا يدخل صراحةً في نطاق العمل المتفق عليه.
طلب التعديل: أي طلب يترتب عليه إضافة أو حذف أو تعديل في نطاق العمل أو المواصفات أو المدة أو المقابل المالي بعد بدء التنفيذ، ويخضع للمادة الحادية عشرة.
الملحق الاختياري: نموذج مستقل لا يُضاف إلى العقد تلقائيًا، ولا ينتج أثرًا تعاقديًا إلا بعد اختياره واستكماله واعتماده من الطرفين.`,
      };
    case "website_development_source_section_05":
      return {
        ...base,
        titleAr: "المادة الرابعة: محل العقد",
        variables: ["website_project_name", "website_project_type_text"],
        bodyAr: `يتمثل محل هذا العقد في التزام الطرف الثاني بتطوير المشروع الإلكتروني «{{website_project_name}}» من نوع {{website_project_type_text}}، وتنفيذ الأعمال والمخرجات التي اتفق عليها الطرفان صراحةً، مقابل التزام الطرف الأول بسداد المقابل المالي والوفاء بالتزاماته المبينة في العقد.
يُحدد نطاق العمل من بيانات المشروع المثبتة في العقد وما يعتمد كتابةً بين الطرفين. ويجوز للطرفين، دون إلزام، اختيار واستكمال واعتماد ملحق نطاق عمل أو مواصفات فنية أو بيانات مشروع أو محضر تسليم لتفصيل بعض الجوانب الفنية أو التشغيلية.
لا يمتد التزام الطرف الثاني إلى أعمال أو خدمات أو خصائص أو تكاملات أو تراخيص أو خدمات خارجية لم يتفق عليها الطرفان صراحةً، ولا تُعد الطلبات الإضافية مشمولة بالمقابل المالي أو مدة التنفيذ إلا باتفاق مكتوب.
هذا العقد عقد مقاولة لتقديم خدمات فنية مستقلة، ولا يُعد عقد عمل أو شراكة أو وكالة أو مشروعًا مشتركًا، ولا يضمن الطرف الثاني تحقيق نتيجة تجارية أو مالية أو تسويقية ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
      };
    case "website_development_source_section_06":
      return {
        ...base,
        titleAr: "المادة الخامسة: الملاحق الاختيارية",
        bodyAr: `5-1 جميع ملاحق هذا العقد اختيارية بالكامل، ولا يُضاف أي ملحق تلقائيًا، ولا يلتزم أي من الطرفين باختيار ملحق معين لمجرد إبرام العقد.
5-2 يجوز للطرفين اختيار واستكمال واعتماد ملحق أو أكثر عند الحاجة، ومن ذلك ملحق نطاق العمل (SOW)، وملحق المواصفات الفنية (TS)، وملحق بيانات المشروع، ومحضر التسليم والاعتماد النهائي (DAR)، واتفاقية الصيانة والدعم الفني (SLA)، واتفاقية التطويرات المستقبلية والأعمال الإضافية.
5-3 لا يُعد الملحق جزءًا من العقد ولا ينتج أثرًا إلا بعد استكمال بياناته واعتماده أو توقيعه من الطرفين. ومجرد ظهور قالب الملحق أو طباعته لا يُعد اختيارًا له أو موافقةً على محتواه.
5-4 أي إشارة في مواد العقد إلى ملحق معين تُفهم على أنها إشارة مشروطة بوجود هذا الملحق واعتماده. وعند عدم اعتماده، تسري بيانات العقد والاتفاقات الكتابية الأخرى بين الطرفين دون أن ينشأ التزام بإعداد الملحق.
5-5 عند تعارض ملحق معتمد مع العقد، تكون الأولوية لأحكام العقد ما لم يتضمن الملحق نصًا صريحًا معتمدًا من الطرفين يعدل حكمًا محددًا، وفي حدود ذلك التعديل فقط، وبما لا يخالف الأحكام الآمرة في القانون.`,
      };
    case "website_development_source_section_07":
      return {
        ...base,
        titleAr: "المادة السادسة: نطاق العمل",
        variables: ["website_project_name"],
        bodyAr: `6-1 يلتزم الطرف الثاني بتنفيذ الأعمال والخدمات والمخرجات المتفق عليها صراحةً للمشروع «{{website_project_name}}» في بيانات العقد أو في اتفاق كتابي معتمد بين الطرفين.
6-2 إذا اختار الطرفان ملحق نطاق العمل (SOW) أو ملحق المواصفات الفنية (TS) واستكملاه واعتمداه، استُخدم الملحق لتفصيل الأعمال والمخرجات والصفحات والوظائف والتقنيات والتكاملات ومعايير القبول، دون أن يكون اختياره شرطًا لنفاذ العقد.
6-3 عند عدم اعتماد أي ملحق، يُحدد نطاق العمل من بيانات المشروع المثبتة في العقد، والعروض أو المراسلات أو الموافقات الكتابية الصريحة المعتمدة بين الطرفين.
6-4 كل عمل أو خدمة أو تطوير أو خاصية أو تكامل لم يرد ضمن نطاق العمل المتفق عليه يُعد عملًا إضافيًا، ولا يلتزم الطرف الثاني بتنفيذه إلا بعد اتفاق كتابي يحدد أثره على المقابل المالي ومدة التنفيذ وفقًا للمادة الحادية عشرة.
6-5 يرتبط بدء كل مرحلة بتسلم الطرف الثاني للبيانات والمحتوى والاعتمادات ووسائل الوصول اللازمة لها، ويترتب على تأخر الطرف الأول في تقديمها امتداد المدة بقدر التأخير وآثاره الفعلية.
6-6 لا يجوز التوسع في تفسير نطاق العمل على نحو يضيف التزامات لم يتفق عليها الطرفان صراحةً.`,
      };
    case "website_development_source_section_08":
      return {
        ...base,
        titleAr: "المادة السابعة: التزامات الطرف الأول (العميل)",
        variables: ["website_response_period_days", "website_review_period_days", "website_approval_authority_text"],
        bodyAr: `7-1 تقديم البيانات ومدخلات المشروع: يلتزم الطرف الأول بتزويد الطرف الثاني، قبل بدء التنفيذ وكل مرحلة بحسب الحاجة، بالبيانات والمعلومات والمحتوى والمستندات والملفات وبيانات الوصول والتصاريح والاعتمادات اللازمة، على أن تكون صحيحة وكاملة وحديثة ومشروعة وقابلة للاستخدام.
7-2 التعاون والرد على الاستفسارات: يلتزم الطرف الأول بالتعاون وتقديم الإيضاحات والقرارات والاعتمادات المطلوبة والرد على الاستفسارات الفنية أو الإدارية خلال مدة لا تجاوز {{website_response_period_days}} أيام عمل من تاريخ الطلب، ما لم يتفق الطرفان على مدة أخرى. وإذا تسبب التأخير في تعطيل التنفيذ، امتدت مدة المشروع بقدر التأخير وآثاره الفعلية.
7-3 مراجعة واعتماد المخرجات: يلتزم الطرف الأول بمراجعة الأعمال أو المخرجات المسلمة وإرسال قبول صريح أو رفض مسبب ومحدد خلال {{website_review_period_days}} أيام عمل من تاريخ التسليم. ويجب أن يبين الرفض أوجه عدم المطابقة لنطاق العمل أو المواصفات أو معايير القبول. وإذا انقضت المدة دون اعتراض جوهري مسبب، تطبق حالات الاعتماد المنصوص عليها في المادة الثانية عشرة.
7-4 سداد المقابل المالي: يلتزم الطرف الأول بسداد المبالغ المستحقة في المواعيد ووفق آلية السداد المبينة في المادة العاشرة، ولا يجوز له حسم مبلغ أو إجراء مقاصة من تلقاء نفسه إلا إذا أجاز العقد أو القانون ذلك.
7-5 ممثل المشروع والاعتماد: {{website_approval_authority_text}}
7-6 مشروعية المحتوى والمواد: يلتزم الطرف الأول بالحصول على الحقوق والتراخيص والتصاريح اللازمة لأي بيانات أو محتوى أو صور أو شعارات أو علامات أو ملفات أو مواد يسلمها للطرف الثاني، ويتحمل مسؤولية مشروعيتها وعدم اعتدائها على حقوق الغير، ما لم يكن الضرر ناشئًا عن استخدام الطرف الثاني لها بالمخالفة لتعليمات الطرف الأول أو العقد.
7-7 الأعمال الإضافية: لا يجوز مطالبة الطرف الثاني بعمل أو خاصية أو تكامل أو تعديل خارج نطاق العمل إلا وفق إجراءات المادة الحادية عشرة، ولا ينشأ عن مجرد طلب التعديل التزام بالتنفيذ قبل اعتماده.
7-8 توفير بيئة التنفيذ: يلتزم الطرف الأول، متى كان ذلك لازمًا، بتوفير أو تمكين الطرف الثاني من الوصول إلى الحسابات أو الخوادم أو الاستضافة أو أسماء النطاق أو واجهات البرمجة أو مفاتيح الوصول أو الأدوات اللازمة للتنفيذ، ولا يكون الطرف الثاني مسؤولًا عن تأخير سببه عدم توفيرها في الوقت المطلوب.
7-9 آثار الإخلال بالتزامات الطرف الأول: إذا أدى إخلال الطرف الأول بالتزاماته إلى تعطيل المشروع أو زيادة مدته أو تكلفته أو تعذر تنفيذ جزء منه، جاز للطرف الثاني تعليق الأعمال المتأثرة أو طلب تمديد المدة أو تعديل الجدول أو المقابل بالقدر الذي يعكس الأثر الفعلي، مع مراعاة إجراءات التعديل والإنهاء المقررة في العقد.`,
      };
    case "website_development_source_section_09":
      return {
        ...base,
        titleAr: "المادة الثامنة: التزامات الطرف الثاني (مقدم الخدمة)",
        variables: ["website_execution_duration_text", "website_execution_start_text", "website_duration_basis_text", "website_warranty_duration_text"],
        bodyAr: `8-1 تنفيذ الأعمال: يلتزم الطرف الثاني بتنفيذ الأعمال والخدمات والمخرجات المتفق عليها وفقًا لنطاق العمل والمواصفات ومعايير القبول المعتمدة بين الطرفين، وبذل العناية المهنية المعتادة وبما يتفق مع الأصول الفنية والمهنية المتعارف عليها في مجال تطوير البرمجيات والمواقع الإلكترونية.
8-2 مدة التنفيذ: يلتزم الطرف الثاني بتنفيذ الأعمال خلال مدة قدرها {{website_execution_duration_text}}، وتبدأ {{website_execution_start_text}}، وتُحتسب {{website_duration_basis_text}}، مع مراعاة حالات الوقف أو التمديد أو تعديل الجدول الزمني المنصوص عليها في هذا العقد.
8-3 إدارة المشروع والتواصل: يلتزم الطرف الثاني بإدارة التنفيذ والتنسيق مع الطرف الأول من خلال ممثل أو مسؤول اتصال يحدده عند الحاجة، وتُوجه إليه الملاحظات والتعليمات التشغيلية المتعلقة بالمشروع، مع إخطار الطرف الأول بأي تغيير جوهري في جهة الاتصال المعتمدة لدى الطرف الثاني.
8-4 الإخطار بالمخاطر والمعوقات: يلتزم الطرف الثاني بإخطار الطرف الأول دون تأخير غير مبرر بأي واقعة أو ظرف يعلم به من شأنه التأثير جوهريًا في سير المشروع أو مدة التنفيذ أو جودة المخرجات، مع بيان الأثر المتوقع والإجراء المقترح لمعالجته متى كان ذلك ممكنًا.
8-5 حماية البيانات والمعلومات: يلتزم الطرف الثاني بالمحافظة على البيانات والمعلومات والمستندات وبيانات الوصول التي يتسلمها من الطرف الأول، وعدم استخدامها إلا بالقدر اللازم لتنفيذ العقد، واتخاذ التدابير الفنية والتنظيمية المعقولة لحمايتها، دون إخلال بأحكام السرية.
8-6 تسليم المخرجات: يلتزم الطرف الثاني بتسليم المخرجات وفق آلية ومواعيد ومعايير التسليم المتفق عليها. ويكون تسليم الشفرة المصدرية أو ملفات المشروع أو بيانات الوصول النهائية، بالقدر المتفق على تسليمه، مرتبطًا باستيفاء شروط التسليم والسداد المقررة في هذا العقد.
8-7 إصلاح العيوب البرمجية: يلتزم الطرف الثاني بإصلاح العيوب البرمجية الداخلة في نطاق الضمان لمدة {{website_warranty_duration_text}} وفق أحكام المادة الرابعة عشرة، ولا يمتد هذا الالتزام إلى تطويرات أو تحسينات أو إضافات جديدة خارجة عن النطاق.
8-8 الاستعانة بالغير: يجوز للطرف الثاني الاستعانة بموظفين أو متعاقدين من الباطن أو مستقلين لتنفيذ بعض الأعمال تحت مسؤوليته، وبما لا يخل بالتزاماته المتعلقة بالسرية وحماية البيانات وجودة التنفيذ.
8-9 الامتناع عن الأعمال غير المشروعة: لا يلتزم الطرف الثاني بتنفيذ أي عمل يعلم أنه يخالف القانون أو يعتدي على حقوق الغير أو يخالف شروط استخدام خدمة أو برنامج من الغير، ويجوز له الامتناع عنه بعد إخطار الطرف الأول بسبب الامتناع.
8-10 تعليق التنفيذ: لا يجوز للطرف الثاني تعليق التنفيذ إلا في الحالات المقررة في العقد أو باتفاق مكتوب، أو إذا كان التعليق ناشئًا عن إخلال الطرف الأول بالتزاماته أو عدم السداد أو قوة قاهرة أو ظرف طارئ أو سبب آخر يجيزه العقد أو القانون.`,
      };
    case "website_development_source_section_10":
      return {
        ...base,
        titleAr: "المادة التاسعة: مدة التنفيذ",
        variables: ["website_execution_duration_text", "website_execution_start_text", "website_duration_basis_text"],
        bodyAr: `تبدأ مدة تنفيذ المشروع {{website_execution_start_text}}.
مدة تنفيذ المشروع المتفق عليها هي {{website_execution_duration_text}}، وتُحتسب {{website_duration_basis_text}}.
إذا تأخر الطرف الأول في تقديم البيانات أو المحتوى أو الاعتمادات أو وسائل الوصول أو أي متطلبات لازمة للتنفيذ، أو في سداد دفعة مستحقة يرتبط بها التنفيذ، توقفت مدة التنفيذ أو امتدت بقدر مدة التأخير وآثاره الفعلية دون أن يُعد ذلك إخلالًا من الطرف الثاني.
وتمتد مدة التنفيذ كذلك بقدر الأثر الفعلي لأي أمر تعديل معتمد أو عمل إضافي أو قوة قاهرة أو ظرف طارئ أو أي سبب آخر يجيز العقد أو القانون بسببه وقف التنفيذ أو تمديده.
ويلتزم الطرف الثاني بإخطار الطرف الأول دون تأخير غير مبرر إذا تبين له وجود سبب جوهري يؤثر في المدة المتفق عليها، مع بيان أثره المتوقع على الجدول الزمني متى كان ذلك ممكنًا.`,
      };
    case "website_development_source_section_11":
      return {
        ...base,
        titleAr: "المادة العاشرة: المقابل المالي وآلية السداد",
        variables: ["website_total_price", "website_total_price_words", "website_payment_schedule_text", "website_payment_method", "website_payment_grace_days", "website_restart_threshold_days", "website_restart_fee_text"],
        bodyAr: `10-1 قيمة العقد: يلتزم الطرف الأول بسداد مبلغ إجمالي قدره {{website_total_price}} جنيه مصري ({{website_total_price_words}}) مقابل تنفيذ الأعمال والخدمات والمخرجات محل هذا العقد.
10-2 جدول الدفعات واستحقاقها: {{website_payment_schedule_text}}
10-3 وسائل السداد وإثبات الوفاء: اتفق الطرفان على أن تكون وسيلة السداد {{website_payment_method}}. ويُعد السداد منتجًا لآثاره من تاريخ قيد المبلغ فعليًا في الوسيلة المالية المتفق عليها أو ثبوت استلامه بموجب إيصال أو مخالصة أو فاتورة أو مستند يفيد الاستلام. وتكون رسوم التحويل والعمولات والمصروفات المصرفية على عاتق الطرف الذي تفرضها عليه الجهة المالية ما لم يتفق الطرفان كتابةً على خلاف ذلك.
10-4 التأخر في السداد وحق تعليق التنفيذ: إذا تأخر الطرف الأول في سداد مبلغ مستحق، جاز للطرف الثاني بعد إخطاره ومنحه مهلة {{website_payment_grace_days}} أيام عمل للوفاء تعليق التنفيذ إلى حين السداد. ولا تدخل مدة التعليق ضمن مدة التنفيذ، وتمتد المدد والجدول الزمني بقدر التعليق وآثاره. وإذا استمر التعليق بسبب عدم السداد مدة تجاوز {{website_restart_threshold_days}} يومًا ثم طلب استئناف المشروع بعد السداد، جاز إعادة جدولة المشروع وفقًا لتوافر الموارد. {{website_restart_fee_text}}
10-5 الأعمال الإضافية والمقابل المالي: لا يشمل المقابل المالي أي أعمال أو خصائص أو تكاملات أو تعديلات أو خدمات خارج نطاق العمل المتفق عليه. ولا يلتزم الطرف الثاني بتنفيذ عمل إضافي قبل اعتماده وفق المادة الحادية عشرة وتحديد أثره المالي وأثره على مدة التنفيذ وآلية سداده.
10-6 حبس المخرجات المرتبطة بالسداد: إذا كان تسليم الشفرة المصدرية أو ملفات المشروع أو بيانات الوصول أو مخرج نهائي مرتبطًا بسداد مستحق مالي، فلا يلتزم الطرف الثاني بتسليمه نهائيًا قبل الوفاء بالمستحق المرتبط به. ولا يعد تمكين الطرف الأول من الاختبار أو التشغيل التجريبي أو المراجعة تنازلًا عن هذا الحق.
10-7 الضرائب والرسوم: ما لم يتفق الطرفان صراحةً على أن المقابل شامل لضريبة أو رسم معين، تُضاف إلى المقابل الضرائب والرسوم التي يوجب القانون إضافتها على المعاملة، ويتحمل كل طرف ما يفرضه القانون عليه بسبب صفته أو نشاطه أو دخله، دون إخلال بأي اتفاق مكتوب جائز قانونًا بين الطرفين بشأن توزيع تكلفة معينة.
10-8 الفواتير والمطالبات المالية: لا يترتب على إصدار فاتورة أو مطالبة مالية وحده استحقاق مبلغ لم تتحقق واقعة استحقاقه وفق جدول الدفعات أو أمر تعديل معتمد. وتظل قيمة كل دفعة وموعدها مرتبطة بواقعة الاستحقاق المتفق عليها.
10-9 البيانات المالية اللاحقة: يجوز للطرفين اعتماد تعديل مالي أو أمر تغيير مكتوب يحدد مبلغًا أو دفعة أو وسيلة سداد أو تكلفة إضافية ناشئة بعد إبرام العقد، ويكون نافذًا في حدود ما تم اعتماده وفق المادة الحادية عشرة دون أن يلغي البيانات المالية الأصلية فيما لم يعدله صراحةً.`,
      };
    case "website_development_source_section_12":
      return {
        ...base,
        titleAr: "المادة الثانية عشرة: التسليم واعتماد الأعمال",
        variables: ["website_review_period_days", "website_correction_attempts", "website_warranty_duration_text"],
        bodyAr: `12-1 تسليم الأعمال: يلتزم الطرف الثاني بتسليم الأعمال أو المخرجات وفقًا للجدول الزمني ومراحل التنفيذ وآلية التسليم المتفق عليها، ويجوز أن يتم التسليم على مرحلة واحدة أو مراحل مستقلة بحسب الاتفاق.
12-2 مراجعة الأعمال: يلتزم الطرف الأول بمراجعة الأعمال المسلمة وإخطار الطرف الثاني بقبولها أو رفضها مسببًا خلال {{website_review_period_days}} أيام عمل من تاريخ التسليم. ويجب أن تتضمن الملاحظات أوجه عدم المطابقة لنطاق العمل أو المواصفات الفنية أو معايير القبول المتفق عليها، ولا يُعتد بالملاحظات العامة أو غير المحددة.
12-3 معالجة الملاحظات الجوهرية: يلتزم الطرف الثاني بمعالجة الملاحظات الجوهرية الداخلة في نطاق العمل وإعادة التسليم، ويكون عدد محاولات معالجة الملاحظات الجوهرية المتفق عليه {{website_correction_attempts}} محاولات. وتسري على كل إعادة تسليم ذات مدة وإجراءات المراجعة الواردة في هذه المادة.
12-4 الملاحظات غير الجوهرية: لا يجوز الامتناع عن اعتماد الأعمال أو تأخير الدفعة بسبب ملاحظة طفيفة لا تؤثر في التشغيل أو الغرض المتفق عليه، ويلتزم الطرف الثاني بمعالجتها خلال مدة معقولة أو خلال الضمان إذا كانت داخلة في نطاقه.
12-5 الأعمال الإضافية: لا تُعد طلبات الخصائص الجديدة أو التحسينات أو التعديلات الخارجة عن نطاق العمل من ملاحظات التسليم، وإنما تخضع للمادة الحادية عشرة الخاصة بتعديل نطاق العمل.
12-6 حالات الاعتماد: تُعد الأعمال أو المرحلة معتمدة إذا اعتمدها الطرف الأول صراحةً، أو أخطر الطرف الثاني بخلوها من ملاحظات جوهرية، أو انقضت مدة المراجعة البالغة {{website_review_period_days}} أيام عمل دون اعتراض جوهري مسبب، أو اقتصر الاعتراض على ملاحظات غير جوهرية أو أعمال إضافية، أو استُخدمت الأعمال فعليًا بما يدل على القبول خارج نطاق الاختبارات المتفق عليها.
12-7 أثر الاعتماد: يترتب على الاعتماد اعتبار المرحلة منجزة واستحقاق الدفعة المرتبطة بها إن وجدت والانتقال للمرحلة التالية متى كان ذلك مقررًا، وتبدأ من تاريخ الاعتماد مدة الضمان البالغة {{website_warranty_duration_text}}. ولا يخل الاعتماد بحق الطرف الأول في المطالبة بإصلاح العيوب الداخلة في الضمان.
12-8 إثبات التسليم والاعتماد: يجوز إثبات التسليم والاعتماد والملاحظات بمحضر التسليم والاعتماد النهائي (DAR) إذا تم اعتماده، أو بمحضر مستقل، أو بالبريد الإلكتروني أو منصة إدارة المشروع أو أي وسيلة تقنية معتمدة يمكن التحقق من صدورها ونسبتها إلى الطرف المعني.`,
      };
    case "website_development_source_section_13":
      return {
        ...base,
        titleAr: "المادة الثالثة عشرة: حقوق الملكية الفكرية",
        variables: ["website_portfolio_permission_text"],
        bodyAr: `13-1 الملكية الفكرية السابقة للطرف الثاني: تظل الأدوات والأطر والمكتبات والقوالب والمكونات والخوارزميات والأكواد العامة وطرق العمل والحقوق التي كانت مملوكة للطرف الثاني أو مرخصة له قبل المشروع أو طُورت بصورة مستقلة عنه مملوكة له أو لأصحابها. وإذا دُمج أي منها في المشروع، يكون للطرف الأول حق استخدامها بالقدر اللازم لتشغيل المشروع للغرض المتفق عليه ما لم يتفق كتابةً على نطاق أوسع.
13-2 انتقال حقوق المشروع: بعد سداد كامل المقابل المالي والمستحقات المرتبطة بالمشروع، تنتقل إلى الطرف الأول الحقوق القابلة للانتقال قانونًا في المخرجات التي طُورت خصيصًا له بموجب هذا العقد، بما في ذلك الشفرة المصدرية والتصاميم وقواعد البيانات والملفات الفنية التي تدخل صراحةً في نطاق التسليم، مع استثناء الملكية السابقة للطرف الثاني وحقوق الغير.
13-3 تسليم الشفرة المصدرية: يلتزم الطرف الثاني بتسليم الشفرة المصدرية والملفات والموارد اللازمة لتشغيل المشروع وتعديله بالقدر الداخل في نطاق العمل، بعد تحقق شروط التسليم وسداد المستحقات المرتبطة بها، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
13-4 البرمجيات والتراخيص الخاصة بالغير: لا ينقل هذا العقد ملكية أي برنامج أو مكتبة أو إطار أو خدمة أو منصة أو API أو عنصر مملوك للغير أو مفتوح المصدر، وتظل هذه العناصر خاضعة لتراخيصها وشروط مزوديها.
13-5 المحتوى المقدم من الطرف الأول: تظل حقوق البيانات والنصوص والصور والعلامات والشعارات والمواد التي يقدمها الطرف الأول مملوكة له أو لأصحابها، ولا يكتسب الطرف الثاني حقًا فيها إلا بالقدر اللازم لتنفيذ العقد.
13-6 إعادة استخدام الخبرات والأدوات: لا يعد إخلالًا بحقوق الطرف الأول إعادة استخدام الطرف الثاني لخبراته أو أفكاره العامة أو أدواته أو مكوناته العامة التي لا تتضمن شفرة المشروع الخاصة أو بياناته أو أسراره أو مخرجاته المملوكة للطرف الأول.
13-7 عرض المشروع ضمن الأعمال السابقة: {{website_portfolio_permission_text}}
13-8 القيود على الاستغلال: لا يجوز لأي طرف استغلال حق ملكية فكرية خاص بالطرف الآخر خارج الحدود التي يقررها العقد أو القانون أو موافقة كتابية صريحة من صاحب الحق.
13-9 أثر انتهاء العقد: إذا انتهى العقد قبل اكتمال المشروع أو قبل سداد كامل المستحقات، فلا تنتقل للطرف الأول حقوق المخرجات غير المسددة إلا في الحدود التي يقابلها السداد أو اتفاق مكتوب. وإذا كان قد سدد كامل المستحقات وانتقلت إليه الحقوق، فلا يؤدي انتهاء العقد لاحقًا إلى زوالها.`,
      };
    case "website_development_source_section_14":
      return {
        ...base,
        titleAr: "المادة الرابعة عشرة: الضمان والدعم الفني",
        variables: ["website_warranty_duration_text"],
        bodyAr: `14-1 ضمان مطابقة الأعمال: يضمن الطرف الثاني أن الأعمال والمخرجات وقت اعتمادها مطابقة لنطاق العمل والمواصفات الفنية ومعايير القبول المتفق عليها، ويقتصر الضمان على إصلاح العيوب التي تجعل المخرجات غير مطابقة لما تم الاتفاق عليه ولا يعد ضمانًا لنتيجة تجارية أو مالية.
14-2 مدة الضمان: تبدأ مدة الضمان من تاريخ اعتماد الأعمال أو المرحلة محل التسليم وتكون مدتها {{website_warranty_duration_text}}، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
14-3 نطاق الضمان: يلتزم الطرف الثاني خلال مدة الضمان بإصلاح العيب البرمجي أو الفني الناتج عن عدم المطابقة دون مقابل إضافي، وله فحص العيب والتحقق من سببه قبل اعتباره مشمولًا بالضمان.
14-4 الإبلاغ عن العيوب: يلتزم الطرف الأول بإخطار الطرف الثاني بالعيب خلال مدة الضمان مع وصفه والبيانات اللازمة لإعادة إنتاجه، ويبدأ الطرف الثاني معالجته خلال مدة معقولة بعد التحقق من دخوله في نطاق الضمان.
14-5 ما لا يشمله الضمان: لا يشمل الضمان أعمال التطوير أو التحسين أو الخصائص الجديدة، ولا الأعطال الناتجة عن تدخل غير مصرح به أو سوء الاستخدام أو خدمات الغير أو الاستضافة أو التحديثات اللاحقة أو المحتوى المقدم من الطرف الأول أو القوة القاهرة، ما لم يكن الطرف الثاني مسؤولًا عنها بموجب اتفاق صريح.
14-6 الدعم الفني والصيانة: لا يلتزم الطرف الثاني بخدمات دعم أو صيانة أو تحديثات بعد انتهاء مدة الضمان إلا إذا اعتمد الطرفان اتفاقية صيانة ودعم فني (SLA) تحدد النطاق والمدة والمقابل ومستويات الخدمة.
14-7 أثر أعمال الضمان: لا يترتب على إصلاح عيب تمديد مدة الضمان الأصلية أو تجديدها ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
      };
    case "website_development_source_section_15":
      return {
        ...base,
        titleAr: "المادة الخامسة عشرة: الاستضافة واسم النطاق والخدمات المقدمة من الغير",
        variables: ["website_external_services_text"],
        bodyAr: `15-1 نطاق الخدمات: ما لم يتفق الطرفان صراحةً على خلاف ذلك، لا يشمل المقابل المالي توفير أو شراء أو إدارة أو تجديد الاستضافة أو اسم النطاق أو شهادات SSL أو البريد الاحترافي أو خدمات DNS وCDN أو الخدمات السحابية أو الذكاء الاصطناعي أو واجهات البرمجة أو بوابات الدفع أو أي تراخيص أو اشتراكات من الغير.
15-2 شراء أو إدارة الخدمات: {{website_external_services_text}}
15-3 خدمات الغير: تخضع الخدمات المقدمة من الغير لشروط وسياسات وأسعار مزوديها، ولا يضمن الطرف الثاني استمرارها أو ثبات أسعارها أو خصائصها أو شروطها ما لم يكن قد التزم صراحةً بضمان محدد يقع تحت سيطرته.
15-4 حدود المسؤولية: لا يكون الطرف الثاني مسؤولًا عن توقف أو انخفاض أداء أو فقد بيانات أو ضرر سببه المباشر مزود استضافة أو نطاق أو DNS أو CDN أو SSL أو بريد إلكتروني أو بوابة دفع أو API أو خدمة سحابية أو ذكاء اصطناعي أو أي خدمة من الغير، ما لم يكن الضرر ناشئًا عن خطأ جسيم أو إخلال تعاقدي مباشر من الطرف الثاني.
15-5 سداد الاشتراكات والتجديد: يلتزم الطرف المحدد بصفته جهة السداد في البند 15-2 بسداد رسوم الاشتراك أو التجديد أو الترخيص في مواعيدها. ولا يتحمل الطرف الثاني آثار عدم السداد إذا كانت جهة السداد المتفق عليها هي الطرف الأول.
15-6 بيانات الدخول وملكية الحسابات: تكون الحسابات الخاصة بالاستضافة والنطاق والخدمات الخارجية مسجلة باسم الطرف الأول كلما كان ذلك ممكنًا. وإذا سُجلت مؤقتًا باسم الطرف الثاني لأسباب فنية أو تنظيمية، يلتزم بنقلها إلى الطرف الأول عند إمكان ذلك وبعد الوفاء بالمستحقات المرتبطة بها.
15-7 النسخ الاحتياطية: لا يلتزم الطرف الثاني بإجراء أو حفظ أو استعادة نسخ احتياطية بعد التسليم إلا إذا كان ذلك داخل نطاق العمل أو اتفاقية صيانة ودعم فني معتمدة تحدد دورية النسخ ومدة الاحتفاظ وآلية الاسترجاع.
15-8 انتهاء العلاقة التعاقدية: عند انتهاء العقد، يتعاون الطرفان في نقل الخدمات والحسابات وبيانات الوصول التي يستحق الطرف الأول استلامها بعد تنفيذ الالتزامات المالية والتعاقدية المستحقة، ولا يلتزم الطرف الثاني باستمرار إدارة أو تجديد خدمة بعد انتهاء العقد إلا باتفاق مكتوب.
15-9 حجية بيانات الخدمات: تُعد تفاصيل الخدمات الخارجية المثبتة في البند 15-2 أو في اتفاق أو ملحق مكتوب معتمد جزءًا من تنظيم العلاقة بين الطرفين في حدود تلك الخدمة، ويعمل بها في تحديد المزود والمدة والتكلفة وجهة السداد.`,
      };
    case "website_development_source_section_16":
      return {
        ...base,
        titleAr: "المادة السادسة عشرة: السرية وعدم الإفصاح",
        variables: ["website_confidentiality_duration_text", "website_portfolio_permission_text"],
        bodyAr: `16-1 الالتزام بالسرية: يلتزم كل طرف بالمحافظة على سرية المعلومات والبيانات والمستندات والملفات والأكواد والتصاميم وقواعد البيانات وبيانات الدخول والمعلومات التجارية والمالية وغيرها مما يطلع عليه بسبب التفاوض على العقد أو تنفيذه متى كانت طبيعته أو ظروف الإفصاح عنه تدل على سريته.
16-2 نطاق الاستخدام: لا تُستخدم المعلومات السرية إلا بالقدر اللازم لتنفيذ العقد، ولا يجوز نسخها أو تداولها أو الإفصاح عنها أو إتاحتها للغير خارج هذا الغرض إلا بموافقة كتابية أو في الحدود التي يوجبها القانون.
16-3 حماية المعلومات: يلتزم كل طرف باتخاذ التدابير الفنية والإدارية والتنظيمية المعقولة لحماية المعلومات السرية من الفقد أو التلف أو الوصول أو الاستخدام أو الإفصاح غير المصرح به.
16-4 الأشخاص المصرح لهم: يجوز الإفصاح للموظفين أو المستشارين أو المتعاقدين أو مقدمي الخدمات الذين تستلزم مهامهم الاطلاع على المعلومات لتنفيذ العقد، بشرط إلزامهم بسرية مناسبة، ويظل الطرف الذي أتاح المعلومات مسؤولًا عن إخلال من أفصح لهم في الحدود القانونية.
16-5 الاستثناءات: لا تشمل السرية المعلومات التي يثبت أنها كانت معلومة بصورة مشروعة قبل الإفصاح، أو أصبحت عامة دون مخالفة، أو وردت من طرف ثالث يملك حق الإفصاح، أو طُورت بصورة مستقلة، أو وجب الإفصاح عنها بحكم القانون أو قرار جهة مختصة.
16-6 بيانات الدخول والبيانات الشخصية: يلتزم الطرفان بحماية كلمات المرور ومفاتيح الوصول ورموز المصادقة والبيانات الشخصية وعدم استخدامها أو الاحتفاظ بها إلا بالقدر اللازم لتنفيذ الالتزامات أو وفقًا للقانون.
16-7 إعادة وتسليم المعلومات: عند انتهاء العقد أو فسخه، يلتزم كل طرف برد أو حذف أو إتلاف المعلومات والملفات السرية الخاصة بالطرف الآخر عند الطلب متى كان ذلك جائزًا، مع جواز الاحتفاظ بما يلزم قانونًا أو لإثبات الحقوق والدفاع عنها.
16-8 مدة السرية: يبقى الالتزام بالسرية قائمًا طوال مدة العقد ولمدة {{website_confidentiality_duration_text}} من تاريخ انتهائه أو فسخه أو انقضائه، ما لم تستوجب طبيعة المعلومات أو القانون مدة أطول.
16-9 استخدام اسم المشروع أو العلامة التجارية: {{website_portfolio_permission_text}}
16-10 الحقوق الأخرى: لا يخل الالتزام بالسرية بحقوق الملكية الفكرية أو التعويض أو اتخاذ الإجراءات القضائية أو التحفظية اللازمة لحماية المعلومات أو البيانات أو الحقوق.`,
      };
    case "website_development_source_section_17":
      return {
        ...base,
        titleAr: "المادة السابعة عشرة: المسؤولية وحدودها",
        bodyAr: `17-1 المسؤولية التعاقدية: يتحمل كل طرف المسؤولية عن الأضرار المباشرة التي تلحق بالطرف الآخر بسبب إخلال ثابت بالتزام جوهري من التزاماته، في حدود الخطأ وعلاقة السببية والقواعد القانونية واجبة التطبيق.
17-2 حدود مسؤولية الطرف الثاني: لا يكون الطرف الثاني مسؤولًا عن ضرر ناشئ عن استخدام المشروع بالمخالفة للغرض أو النطاق المتفق عليه، أو تدخل غير مصرح به من الطرف الأول أو الغير، أو تعطل خدمة خارجية، أو فقد بيانات بسبب عدم وجود نسخ احتياطية خارجة عن نطاق التزامه، أو محتوى غير مشروع قدمه الطرف الأول، أو هجوم أو انقطاع خارجي لا يرجع إلى خطأ جسيم أو إخلال مباشر من الطرف الثاني، أو تحديثات لاحقة خارج نطاق الضمان والدعم.
17-3 الأضرار غير المباشرة: مع مراعاة الأحكام الآمرة، لا يتحمل أي طرف الأضرار غير المباشرة أو التبعية أو العرضية أو الخاصة، ومنها خسارة الأرباح أو الفرص أو السمعة أو الاستخدام، إلا إذا كان التعويض عنها واجبًا بنص قانوني آمر.
17-4 الحد الأقصى للمسؤولية: ما لم يكن الضرر ناشئًا عن غش أو تدليس أو خطأ جسيم أو تعد عمدي أو إخلال بالسرية أو اعتداء على الملكية الفكرية أو حالة لا يجوز قانونًا الحد من المسؤولية عنها، لا تتجاوز المسؤولية المالية الإجمالية للطرف الثاني مجموع المبالغ التي سددها الطرف الأول فعليًا للطرف الثاني بموجب العقد.
17-5 واجب الحد من الضرر: يلتزم الطرف المتضرر باتخاذ التدابير المعقولة للحد من الضرر، ولا يستحق تعويضًا عن الجزء الذي كان يمكن تجنبه باتخاذ الإجراءات المعتادة.
17-6 مطالبات الغير: يلتزم الطرف الأول بتعويض الطرف الثاني عن المطالبات والمصروفات التي تنشأ مباشرةً بسبب بيانات أو محتوى أو حقوق قدمها الطرف الأول وثبت عدم مشروعيتها أو اعتداؤها على حقوق الغير، ما لم يكن الضرر ناشئًا عن غش أو خطأ جسيم أو تعد مباشر من الطرف الثاني.
17-7 حماية الأنظمة وبيانات الدخول: يتحمل الطرف الأول مسؤولية المحافظة على بيانات الدخول والحسابات التي تقع تحت سيطرته بعد تسليمها إليه، ولا يسأل الطرف الثاني عن ضرر ناشئ عن إخلال الطرف الأول بهذا الالتزام.
17-8 المسؤولية الآمرة: لا يفسر أي حكم في هذه المادة على أنه إعفاء من مسؤولية لا يجوز قانونًا الاتفاق على إعفائها أو الحد منها.`,
      };
    case "website_development_source_section_18":
      return {
        ...base,
        titleAr: "المادة الثامنة عشرة: إنهاء العقد وآثاره",
        variables: ["website_breach_cure_days", "website_nonpayment_termination_days", "website_client_stoppage_days"],
        bodyAr: `18-1 انتهاء العقد: ينتهي هذا العقد بتنفيذ جميع الالتزامات الناشئة عنه، أو باتفاق الطرفين كتابةً، أو بتحقق سبب من أسباب الإنهاء أو الفسخ أو الانقضاء المقررة فيه أو في القانون.
18-2 الإنهاء بسبب الإخلال الجوهري: يجوز لأي من الطرفين إنهاء العقد إذا أخل الطرف الآخر بالتزام جوهري ولم يقم بمعالجة الإخلال خلال {{website_breach_cure_days}} يومًا من تاريخ إخطاره كتابةً بطبيعة الإخلال، ما لم يكن الإخلال غير قابل للإصلاح، ففي هذه الحالة يجوز اتخاذ الإجراء الذي يجيزه العقد أو القانون دون انتظار انقضاء المهلة، مع عدم الإخلال بالحقوق أو التعويضات المستحقة.
18-3 عدم السداد: إذا تأخر الطرف الأول في سداد مبلغ مستحق، جاز للطرف الثاني بعد الإخطار تعليق التنفيذ حتى تمام السداد، ولا تدخل مدة التعليق ضمن مدة التنفيذ وتمتد المدد والجدول الزمني بقدر التعليق وآثاره. فإذا استمر عدم السداد مدة {{website_nonpayment_termination_days}} يومًا من تاريخ الإخطار، جاز للطرف الثاني إنهاء العقد مع الاحتفاظ بالمستحقات المالية والحقوق المقررة له.
18-4 توقف المشروع بسبب الطرف الأول: إذا توقف التنفيذ بسبب امتناع الطرف الأول عن تقديم البيانات أو المحتوى أو الاعتمادات أو الموافقات أو متطلبات التنفيذ أو بسبب عدم الرد لمدة تجاوز {{website_client_stoppage_days}} أيام، جاز للطرف الثاني تعليق المشروع. وإذا استمر سبب التوقف بعد إخطار الطرف الأول وانقضاء المهلة، جاز إنهاء العقد مع إجراء التسوية النهائية للحسابات.
18-5 إنهاء العقد من جانب الطرف الأول: يجوز للطرف الأول إنهاء العقد إذا ثبت إخلال الطرف الثاني إخلالًا جوهريًا بتنفيذ الأعمال أو عدم مطابقتها لنطاق العمل أو المواصفات أو معايير القبول، ولم يقم بمعالجة الإخلال خلال مهلة المعالجة المقررة في البند 18-2 بعد إخطاره كتابةً، دون إخلال بحق الطرف الأول في الحقوق أو التعويضات المستحقة وفق العقد أو القانون.
18-6 آثار الإنهاء والتسوية المالية: يلتزم الطرف الأول بسداد قيمة جميع الأعمال والخدمات والمراحل التي نُفذت حتى تاريخ الإنهاء، وكذلك المصروفات والالتزامات والرسوم والاشتراكات التي تكبدها الطرف الثاني بصورة مشروعة ومباشرة لتنفيذ هذا العقد وكانت مستحقة أو غير قابلة للاسترداد. وإذا سبق للطرف الأول سداد مبالغ عن أعمال لم يبدأ تنفيذها أو لم تصبح مستحقة، فتتم تسويتها ورد ما يستحق رده بعد خصم ما يقابل الأعمال المنفذة والمبالغ المستحقة. ويلتزم كل طرف برد أو حذف أو إتلاف المعلومات والمواد الخاصة بالطرف الآخر بالقدر الذي تقضي به أحكام السرية والقانون، ولا يؤثر الإنهاء على الحقوق والمطالبات التي نشأت قبله.
18-7 المخرجات وحقوق الملكية: لا يسقط بالإنهاء حق الطرف الأول في استلام المخرجات أو الملفات أو بيانات الوصول التي اكتسب حقًا في استلامها وأوفى بالمستحقات المالية المتعلقة بها. وإذا انتهى العقد قبل اكتمال المشروع، يلتزم الطرف الثاني بتسليم الأعمال والمراحل المكتملة التي أصبحت مستحقة التسليم بعد سداد مستحقاتها، ولا يلتزم بتسليم مراحل غير مكتملة أو غير مسددة إلا باتفاق مكتوب.
18-8 استمرار بعض الأحكام: تستمر بعد انتهاء العقد الأحكام التي يقتضي نصها أو طبيعتها البقاء، وعلى الأخص السرية وحقوق الملكية الفكرية وحدود المسؤولية والالتزامات المالية وتسوية المنازعات.`,
      };
    case "website_development_source_section_19":
      return {
        ...base,
        titleAr: "المادة التاسعة عشرة: القوة القاهرة والظروف الطارئة",
        variables: ["website_force_majeure_notice_days", "website_force_majeure_termination_days", "website_hardship_duration_days", "website_hardship_negotiation_days"],
        bodyAr: `19-1 القوة القاهرة: يقصد بها الحادث الاستثنائي العام غير المتوقع عند إبرام العقد والخارج عن إرادة الطرف المتأثر، الذي لا يمكن دفعه بوسائل معقولة ويترتب عليه استحالة تنفيذ الالتزام كليًا أو جزئيًا بصورة مؤقتة أو نهائية، وذلك وفقًا للقانون.
19-2 الظروف الطارئة: يقصد بها الحادث الاستثنائي العام غير المتوقع الذي يجعل تنفيذ الالتزام ممكنًا ولكنه مرهقًا إرهاقًا جسيمًا يهدد الطرف الملتزم بخسارة فادحة دون أن يبلغ حد الاستحالة، وذلك وفقًا للقانون.
19-3 أمثلة الوقائع المؤثرة: تشمل بحسب طبيعة الواقعة وأثرها الفعلي الحروب والاضطرابات العامة والكوارث والأوبئة والانقطاعات العامة واسعة النطاق للبنية الرقمية، والتوقف الجوهري لخدمات تقنية يعتمد عليها المشروع، والقرارات السيادية أو التنظيمية، والهجمات الإلكترونية واسعة النطاق، متى كانت خارجة عن السيطرة المعقولة للطرف المتأثر.
19-4 ما لا يعد قوة قاهرة أو ظرفًا طارئًا: لا يدخل في ذلك سوء الإدارة أو نقص الموارد المعتاد أو الأخطاء الفنية الناتجة عن التقصير أو تأخر الطرف الأول في مدخلاته أو التعثر المالي أو الزيادات المعتادة في الأسعار أو فقد التراخيص بسبب مخالفة الطرف المعني، ما لم تكن الواقعة نفسها جزءًا من حدث عام مستوفٍ للشروط القانونية.
19-5 التزامات الطرف المتأثر: يلتزم الطرف الذي يتمسك بالقوة القاهرة أو الظروف الطارئة بإخطار الطرف الآخر كتابةً خلال {{website_force_majeure_notice_days}} أيام من تاريخ علمه بالواقعة متى كان ذلك ممكنًا، مع بيان طبيعتها وأثرها ومدتها التقديرية، واتخاذ الإجراءات المعقولة للحد من آثارها واستئناف التنفيذ عند زوال السبب أو إمكان التنفيذ الجزئي.
19-6 آثار القوة القاهرة: إذا ترتب على القوة القاهرة استحالة مؤقتة، يوقف الالتزام المتأثر وتمتد المدد بقدر التوقف الفعلي دون جزاءات عن هذا التأخير. وإذا استمرت القوة القاهرة مدة تجاوز {{website_force_majeure_termination_days}} يومًا متصلة وكان استمرارها يمنع تحقيق الغرض الأساسي من العقد، جاز لأي من الطرفين إنهاء العقد بإخطار كتابي مع تسوية الأعمال المنفذة والحقوق المالية المستحقة حتى تاريخ الإنهاء، دون تعويض عن الجزء الذي استحال تنفيذه ما لم يقضِ القانون بغير ذلك.
19-7 آثار الظروف الطارئة: إذا استمرت الظروف الطارئة مدة تجاوز {{website_hardship_duration_days}} يومًا وأخلت إخلالًا جسيمًا بالتوازن الاقتصادي للعقد، جاز لأي من الطرفين دعوة الآخر إلى إعادة التفاوض بحسن نية بشأن المدة أو المقابل أو الالتزامات المتأثرة. وإذا لم يتوصل الطرفان إلى اتفاق خلال {{website_hardship_negotiation_days}} يومًا من بدء التفاوض، جاز لكل منهما مباشرة الحقوق المقررة في العقد أو القانون، ولا يترتب على مجرد طلب التفاوض وقف الالتزامات إلا باتفاق أو نص قانوني.`,
      };
    case "website_development_source_section_20":
      return {
        ...base,
        titleAr: "المادة العشرون: الإخطارات والموطن المختار",
        variables: ["website_email_notices_text", "website_messaging_notices_text", "website_project_platform_text", "website_contact_change_notice_days"],
        bodyAr: `20-1 وسائل الإخطار: تكون الإخطارات والإنذارات والمراسلات والاعتمادات المتعلقة بهذا العقد صحيحة ومنتجة لآثارها إذا تمت بإحدى الوسائل المعتمدة في هذه المادة وفي الحدود التي يجيزها القانون.
20-2 الموطن المختار: يُعد عنوان كل طرف المبين في المادة الأولى موطنًا مختارًا له، وتوجه إليه المراسلات الرسمية وفقًا للقواعد القانونية المنظمة.
20-3 البريد الإلكتروني المعتمد: {{website_email_notices_text}}
20-4 تطبيقات المراسلة الإلكترونية: {{website_messaging_notices_text}}
20-5 منصة إدارة المشروع: {{website_project_platform_text}}
20-6 تغيير بيانات الاتصال: يلتزم كل طرف بإخطار الطرف الآخر كتابةً بأي تغيير في عنوانه أو بريده أو هاتفه أو وسيلة الاتصال أو المنصة المعتمدة خلال {{website_contact_change_notice_days}} يومًا من تاريخ التغيير؛ وإلى حين الإخطار تظل البيانات السابقة منتجة لآثارها القانونية في الحدود التي يجيزها القانون.
20-7 وسائل الاتصال الأخرى: يجوز للطرفين اعتماد وسيلة اتصال إلكترونية أو تقنية أخرى كتابةً أثناء سريان العقد، وتكون نافذة من تاريخ اعتمادها.
20-8 حجية وسائل الاتصال الإلكترونية: لا يخل اعتماد الوسائل الإلكترونية بأي متطلبات شكلية يفرضها القانون لإجراء معين، وتكون المراسلات والاعتمادات الإلكترونية حجة متى أمكن التحقق من صدورها ونسبتها وسلامة محتواها وفي الحدود التي يجيزها القانون.`,
      };
    case "website_development_source_section_21":
      return {
        ...base,
        titleAr: "المادة الحادية والعشرون: القانون الواجب التطبيق وتسوية المنازعات",
        variables: ["website_competent_court_text"],
        bodyAr: `21-1 القانون الواجب التطبيق: يخضع هذا العقد وما ينشأ عنه أو يرتبط به من حقوق والتزامات ومنازعات للقوانين السارية في جمهورية مصر العربية، بما في ذلك القواعد المدنية وقواعد الإثبات والتوقيع الإلكتروني والملكية الفكرية وحماية البيانات متى كانت واجبة التطبيق.
21-2 التسوية الودية: يجوز للطرفين السعي إلى تسوية أي نزاع وديًا بالتفاوض أو الوساطة أو الاستعانة بخبير فني أو قانوني، ولا تعد هذه الإجراءات شرطًا لازمًا للجوء إلى القضاء ما لم يوجب القانون أو اتفاق مكتوب صحيح خلاف ذلك، ولا توقف المواعيد القانونية بذاتها.
21-3 الاختصاص القضائي: مع مراعاة قواعد الاختصاص الولائي والنوعي والمكاني المتعلقة بالنظام العام، اتفق الطرفان على أن تختص {{website_competent_court_text}} بنظر المنازعات الناشئة عن العقد أو المرتبطة به، وذلك في الحدود التي يجيزها القانون. وإذا تعذر انعقاد الاختصاص للمحكمة المختارة قانونًا، ينعقد الاختصاص للمحكمة المصرية المختصة وفقًا للقواعد الآمرة.
21-4 المنازعات الفنية: إذا تعلق النزاع بمسألة فنية، مثل مطابقة الأعمال لنطاق العمل أو المواصفات أو معايير القبول، أو وجود عيب برمجي، أو نسبة الإنجاز، أو اعتبار طلب ما عملًا إضافيًا، جاز الاستعانة بخبير فني، ولا يكون رأيه ملزمًا إلا باتفاق الطرفين كتابةً أو إذا كان خبيرًا منتدبًا وفق الإجراءات القانونية.
21-5 الإجراءات الوقتية والتحفظية: لا يمنع ما سبق أي طرف من طلب إجراء وقتي أو تحفظي أو مستعجل لحماية حق أو دليل أو معلومات سرية أو ملكية فكرية أو شفرة مصدرية أو بيانات أو وسائل وصول، متى توافرت شروطه القانونية.`,
      };
    case "website_development_source_section_22":
      return {
        ...base,
        titleAr: "المادة الثانية والعشرون: الأحكام العامة",
        variables: ["website_contract_copies_text", "website_non_solicitation_duration_text", "website_legal_fees_text"],
        bodyAr: `22-1 وحدة العقد: يُعد هذا العقد وبياناته وأي ملاحق أو جداول أو أوامر تعديل أو محاضر تسليم واعتماد تم اعتمادها وفق أحكامه وحدة قانونية متكاملة، وتُفسر بما يحقق القصد المشترك للطرفين.
22-2 ترتيب الأولوية: عند التعارض تكون الأولوية لأحكام هذا العقد، ثم أوامر التعديل المعتمدة، ثم الملاحق الفنية والمالية المعتمدة، ثم محاضر التسليم والاعتماد، ثم المستندات الأخرى التي اتفق الطرفان صراحةً على اعتبارها جزءًا من العقد، ما لم يتضمن مستند لاحق معتمد نصًا صريحًا يعدل حكمًا محددًا.
22-3 تعديل العقد أو التنازل عن الحقوق: لا يجوز تعديل حكم جوهري أو إضافة التزام أو التنازل عن حق ناشئ عن العقد إلا باتفاق كتابي أو إلكتروني معتبر قانونًا ومعتمد ممن يملك الصفة، ولا يعد السكوت أو التأخر في استعمال الحق أو قبول تنفيذ جزئي تعديلًا أو تنازلًا ضمنيًا.
22-4 التنازل عن العقد أو إحالة الحقوق: لا يجوز لأي طرف إحالة العقد أو حقوقه أو التزاماته إلى الغير كليًا أو جزئيًا دون موافقة كتابية مسبقة من الطرف الآخر، إلا في الحالات التي يجيزها أو يقررها القانون.
22-5 استقلال الأحكام: إذا قضي ببطلان أو عدم نفاذ حكم من أحكام العقد كليًا أو جزئيًا، فلا يؤثر ذلك في باقي الأحكام متى كان العقد صالحًا للاستمرار قانونًا.
22-6 الاتفاق الكامل: يمثل هذا العقد وما يعتمد وفقه الاتفاق النهائي بين الطرفين بشأن موضوعه، ويلغي ما سبقه من تفاهمات أو مراسلات غير مدمجة فيه، دون المساس بحقوق نشأت أو نُفذت قبل توقيعه.
22-7 الإقرار بالعلم والرضا: يقر الطرفان بأنهما اطلعا على العقد وفهما مضمونه وآثاره ووقعاه بإرادة حرة وبعد إتاحة فرصة كافية للمراجعة والاستعانة بالمختصين.
22-8 حساب المدد: تُحسب المدد بالأيام التقويمية ما لم ينص الحكم المعني صراحةً على أيام العمل أو يحدد الطرفان أساسًا آخر جائزًا قانونًا، وإذا صادف آخر يوم عطلة رسمية امتد الميعاد إلى أول يوم عمل تالٍ ما لم يقضِ القانون أو الاتفاق الصحيح بغير ذلك.
22-9 التوقيع والإثبات الإلكتروني: يجوز استخدام التوقيع الإلكتروني أو تبادل واعتماد النسخ والمستندات الإلكترونية متى استوفت المتطلبات القانونية وأمكن التحقق من نسبتها إلى مصدرها وسلامة محتواها.
22-10 الوفاة والخلف العام: إذا كان أحد الطرفين شخصًا طبيعيًا، فلا تنقضي الحقوق والالتزامات المالية بمجرد وفاته في الحدود التي يقررها القانون، ومع ذلك يجوز إنهاء الالتزام الذي يقوم بطبيعته على اعتباره الشخصي إذا تعذر تنفيذه مع تسوية الحقوق المستحقة حتى تاريخ الانتهاء.
22-11 عدد النسخ: حُرر هذا العقد في {{website_contract_copies_text}}، وتكون كل نسخة أصلية أو إلكترونية صحيحة متطابقة في الحجية مع غيرها، وتكون لجميع النسخ ذات الحجية القانونية متى ثبتت صحتها ونسبتها إلى أطرافها، ويجوز توقيعها على نسخ مستقلة ويُعد مجموعها عقدًا واحدًا.
22-12 اللغة المعتمدة: إذا حُرر العقد بأكثر من لغة، تكون النسخة العربية هي المرجع في التفسير والتنفيذ ما لم يتفق الطرفان كتابةً على خلاف ذلك وفي الحدود التي يجيزها القانون.
22-13 عدم استقطاب العاملين: يلتزم كل طرف بعدم استقطاب أو التعاقد مباشرة أو بطريق غير مباشر مع الموظفين أو المتعاقدين الرئيسيين لدى الطرف الآخر ممن شاركوا في تنفيذ المشروع طوال مدة العقد ولمدة {{website_non_solicitation_duration_text}} من تاريخ انتهائه أو فسخه، ما لم يحصل على موافقة كتابية مسبقة من الطرف الآخر.
22-14 استمرار بعض الأحكام: تستمر بعد انتهاء العقد الأحكام التي يقتضي نصها أو طبيعتها البقاء، وعلى الأخص السرية والملكية الفكرية وحدود المسؤولية والالتزامات المالية وتسوية المنازعات.
22-15 رسوم الدمغة والرسوم القانونية: {{website_legal_fees_text}}`,
      };
    case "website_development_source_section_23":
      return {
        ...base,
        titleAr: "المادة الثالثة والعشرون: التوقيعات",
        bodyAr: `يقر الطرفان بأنهما اطلعا على هذا العقد وبياناته ومواده وأي ملاحق أو أوامر تعديل أو محاضر معتمدة مرتبطة به، وفهما الحقوق والالتزامات والآثار القانونية والفنية المترتبة عليه، وأن توقيعهما تم بإرادتهما الحرة وبعد التحقق من صحة البيانات التي تخص كلًا منهما.
23-1 حجية التوقيع: يُعد توقيع كل طرف إقرارًا بقبوله والتزامه بأحكام العقد، ويمتد أثره إلى المستندات التي تصبح جزءًا منه متى تم توقيعها أو اعتمادها وفق الإجراءات المقررة.
23-2 التوقيع والاعتماد الإلكتروني: يكون للتوقيع الإلكتروني أو الاعتماد الإلكتروني أو التوقيع على النسخ الإلكترونية الأثر القانوني المقرر له متى استوفى الشروط والمتطلبات التي يقررها القانون وأمكن التحقق من نسبته إلى صاحبه وسلامة المحتوى.
23-3 حجية النسخ: تكون النسخ الأصلية أو الإلكترونية الصحيحة والمعتمدة من الطرفين متساوية في الحجية في الحدود التي يجيزها القانون.
23-4 الشهود: إذا اختار الطرفان إضافة شهود، يقتصر توقيع الشاهد على إثبات واقعة الحضور والتوقيع، ولا يعد كفالة أو ضمانًا أو إقرارًا منه بحق أو التزام ناشئ عن العقد ما لم يوقع بصفة قانونية أخرى صريحة.`,
      };
    default:
      return base;
  }
}

function cleanSocialExtractedText(text: string): string {
  return cleanWebsiteExtractedText(text)
    .replace(/االجتماعي/g, "الاجتماعي")
    .replace(/االعتماد/g, "الاعتماد")
    .replace(/االلتزام/g, "الالتزام")
    .replace(/االتصال/g, "الاتصال")
    .replace(/االختصاص/g, "الاختصاص")
    .replace(/االسم/g, "الاسم")
    .replace(/االستمرار/g, "الاستمرار")
    .replace(/االسترداد/g, "الاسترداد")
    .replace(/ثال[ثث]\s*\(?3\)?\s*سنوات/g, "ثلاث (3) سنوات")
    .replace(/االثني عشر\s*\(?12\)?\s*شه(?:رًا|را|ًرا)/g, "الاثني عشر (12) شهرًا")
    .replace(/ستة\s*\(?6\)?\s*أشهر/g, "ستة (6) أشهر")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function reviewedSocialMainClause(clause: LegalClauseDefinition): LegalClauseDefinition {
  const base: LegalClauseDefinition = {
    ...clause,
    titleAr: cleanSocialExtractedText(clause.titleAr).replace(/^_?\s*\d+\s*/, ""),
    bodyAr: cleanSocialExtractedText(clause.bodyAr),
  };
  switch (clause.key) {
    case "social_media_management_source_preface":
      return {
        ...base,
        titleAr: "بيانات وتمهيد المستند",
        variables: ["contract_date"],
        bodyAr: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي (Social Media Management Services Agreement)\nإنه بتاريخ {{contract_date}}، تم إبرام هذا العقد بين الطرفين المبينة بياناتهما وتعريفهما في المادة الأولى.",
      };
    case "social_media_management_source_section_02":
      return {
        ...base,
        titleAr: "المادة الأولى: أطراف العقد وبيانات الخدمة",
        variables: ["social_client_party_definition", "social_provider_party_definition", "social_activity_definition", "social_accounts_text", "social_responsible_people_text"],
        bodyAr: `أولًا: {{social_client_party_definition}}
ثانيًا: {{social_provider_party_definition}}
ثالثًا: بيانات النشاط والحسابات: {{social_activity_definition}}
الحسابات والمنصات المشمولة بالخدمة: {{social_accounts_text}}
رابعًا: المسؤولون المعتمدون: {{social_responsible_people_text}}
ويقر كل طرف بأنه يتمتع بالأهلية والصفة القانونية اللازمة لإبرام هذا العقد، وأن جميع البيانات والمستندات المقدمة منه صحيحة وسارية وقت التوقيع، ويلتزم بإخطار الطرف الآخر كتابةً بأي تعديل جوهري يطرأ عليها خلال مدة سريان العقد.`,
      };
    case "social_media_management_source_section_05":
      return {
        ...base,
        titleAr: "المادة الرابعة: محل العقد",
        variables: ["social_activity_definition", "social_accounts_text", "social_scope_services_text", "social_excluded_services_text", "social_ads_terms_text"],
        bodyAr: `4-1 محل العقد: يتمثل محل هذا العقد في التزام الطرف الثاني بتقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي الخاصة بالنشاط المحدد في المادة الأولى، وذلك على الحسابات والمنصات المتفق عليها ووفقًا لنطاق الخدمات المحدد صراحةً في هذا العقد.
4-2 الحسابات محل الإدارة: الحسابات والمنصات المشمولة هي: {{social_accounts_text}}
4-3 الخدمات المشمولة: اتفق الطرفان على أن نطاق الخدمات الفعلي يشمل حصريًا: {{social_scope_services_text}}. ولا يُعد ورود أي خدمة أخرى في التعريفات أو الأمثلة الواردة بالعقد التزامًا على الطرف الثاني ما لم تُدرج صراحةً ضمن النطاق أو يعتمدها الطرفان بأمر تعديل.
4-4 الأعمال الإضافية: كل خدمة أو عمل أو نشاط أو مخرج أو تعديل لا يدخل ضمن نطاق الخدمات المبين أعلاه يُعد عملًا إضافيًا، ولا يلتزم الطرف الثاني بتنفيذه إلا بعد اعتماد نطاقه ومقابله ومدته وأثره على الخطة الزمنية كتابةً أو إلكترونيًا وفقًا لوسائل الاعتماد المعتمدة.
4-5 الخدمات غير المشمولة: {{social_excluded_services_text}}
4-6 المصروفات والخدمات المقدمة من الغير والحملات الإعلانية: لا يشمل المقابل المالي رسوم المنصات أو الاشتراكات أو التراخيص أو خدمات الغير أو الميزانيات الإعلانية إلا إذا نص العقد صراحةً على خلاف ذلك. {{social_ads_terms_text}}
4-7 استخدام خدمات الغير: يخضع استخدام منصات التواصل والأدوات والبرامج والخدمات السحابية وأدوات الذكاء الاصطناعي وشروطها وسياساتها لما يصدر عن مزوديها، ولا يضمن الطرف الثاني استمرارها أو ثبات سياساتها أو أسعارها أو خوارزمياتها، ما لم يكن الضرر ناشئًا عن غش أو خطأ جسيم أو إخلال تعاقدي مباشر منه.
4-8 التزامات التعاون: يلتزم الطرف الأول بتقديم البيانات والمحتوى والموافقات وصلاحيات الوصول اللازمة في المواعيد المناسبة، ويمتد الجدول الزمني بالقدر الذي يتناسب مع أي تأخير راجع إليه.
4-9 التكييف القانوني: هذا العقد عقد تقديم خدمات مهنية مستقلة، ولا ينشئ علاقة عمل أو شراكة أو وكالة أو مشروعًا مشتركًا بين الطرفين.`,
      };
    case "social_media_management_source_section_07":
      return {
        ...base,
        titleAr: "المادة السادسة: نطاق الخدمات",
        variables: ["social_scope_services_text", "social_accounts_text", "social_content_plan_text", "social_reports_kpi_text", "social_ads_terms_text"],
        bodyAr: `6-1 نطاق الالتزام: يلتزم الطرف الثاني بتقديم الخدمات المشمولة صراحةً في هذا العقد على الحسابات والمنصات المحددة، وبما يتفق مع الأصول المهنية والممارسات الفنية المتعارف عليها.
6-2 الخدمات المشمولة: الخدمات المتفق عليها هي: {{social_scope_services_text}}.
6-3 الحسابات والمنصات: {{social_accounts_text}}
6-4 المحتوى والمخرجات: {{social_content_plan_text}}
6-5 الحملات الإعلانية: {{social_ads_terms_text}}
6-6 حدود نطاق الخدمات والأعمال الإضافية: لا يمتد نطاق الالتزام إلى أي خدمة أو حساب أو منصة أو مخرج أو نوع محتوى أو وتيرة نشر أو حملة لم يعتمدها الطرفان. وكل إضافة أو حذف أو تعديل جوهري بعد بدء التنفيذ يخضع لإجراءات تعديل النطاق ويجوز أن يترتب عليه تعديل المقابل أو المدة.
6-7 التزامات الطرف الأول اللازمة للتنفيذ: يلتزم الطرف الأول بتوفير البيانات والمحتوى والشعارات والعلامات التجارية وصلاحيات الوصول والتعليمات والموافقات والتراخيص اللازمة، والرد على الاستفسارات ومراجعة الأعمال واعتمادها خلال المدد المحددة بالعقد.
6-8 التقارير ومؤشرات الأداء: {{social_reports_kpi_text}}
6-9 تفسير النطاق: عند الغموض تكون الأولوية لأحكام العقد ثم أوامر التعديل ثم الملاحق المعتمدة ثم الاعتمادات الكتابية أو الإلكترونية، ولا يجوز التوسع في إنشاء التزامات لم يتفق عليها الطرفان صراحةً.`,
      };
    case "social_media_management_source_section_10":
      return {
        ...base,
        titleAr: "المادة التاسعة: مدة العقد وبدء تقديم الخدمات",
        variables: ["social_contract_duration_text", "social_service_start_text"],
        bodyAr: `9-1 نفاذ العقد: يدخل هذا العقد حيز النفاذ من تاريخ توقيعه أو التاريخ الذي يتفق عليه الطرفان كتابةً.
9-2 بدء تقديم الخدمات: {{social_service_start_text}}، وتبدأ المدة التعاقدية للخدمات من هذا التاريخ ما لم يتفق الطرفان كتابةً على خلاف ذلك.
9-3 مدة العقد: تكون مدة هذا العقد {{social_contract_duration_text}} من تاريخ بدء تقديم الخدمات.
9-4 استمرار تقديم الخدمات: يلتزم الطرف الثاني بتقديم الخدمات طوال مدة العقد في حدود النطاق والخطة والمواعيد المعتمدة، مع مراعاة حالات التعليق والتمديد المقررة بالعقد.
9-5 التجديد أو التمديد: لا يُفترض تجديد العقد أو تمديده ضمنيًا بمجرد استمرار التعامل، ويستلزم أي تجديد أو تمديد اتفاقًا كتابيًا أو إلكترونيًا صريحًا يحدد مدته وأثره المالي والتنفيذي.
9-6 تعليق التنفيذ وامتداد المدد: إذا تعذر البدء أو الاستمرار بسبب تأخر الطرف الأول في تقديم البيانات أو المحتوى أو الاعتمادات أو صلاحيات الوصول، أو بسبب قوة قاهرة أو ظرف طارئ أو سبب يجيزه العقد أو القانون، تمتد المواعيد بالقدر الذي يقابل مدة التعذر وآثاره الفعلية.`,
      };
    case "social_media_management_source_section_11":
      return {
        ...base,
        titleAr: "المادة العاشرة: المقابل المالي وآلية السداد",
        variables: ["social_fee_nature_text", "social_fee", "social_fee_words", "social_payment_schedule_text", "social_payment_method_text", "social_payment_grace_days", "social_ads_terms_text", "social_source_files_text"],
        bodyAr: `10-1 قيمة المقابل المالي: يلتزم الطرف الأول بسداد مقابل مالي {{social_fee_nature_text}} قدره {{social_fee}} جنيه مصري ({{social_fee_words}}) نظير الخدمات والمخرجات المشمولة في نطاق هذا العقد.
10-2 الاستحقاق وجدول السداد: {{social_payment_schedule_text}}
10-3 وسيلة السداد وإثبات الوفاء: {{social_payment_method_text}}. ويُعد السداد منتجًا لآثاره من تاريخ قيد المبلغ فعليًا في وسيلة السداد المعتمدة أو استلامه بموجب إيصال أو مخالصة صحيحة.
10-4 التأخر في السداد: إذا تأخر الطرف الأول عن سداد مبلغ مستحق، جاز للطرف الثاني بعد إخطار الطرف الأول ومنحه مهلة {{social_payment_grace_days}} أيام عمل للسداد تعليق تنفيذ الخدمات أو وقف تسليم المخرجات أو الامتناع عن بدء أعمال جديدة، وتمتد المدد الزمنية بالقدر الذي يعادل التأخير وآثاره الفعلية.
10-5 الأعمال والخدمات الإضافية: لا يشمل المقابل أي خدمات أو تعديلات أو زيادة في الحسابات أو المنصات أو الحملات أو المخرجات خارج النطاق المعتمد، وتستلزم اتفاقًا يحدد نطاقها ومقابلها وأثرها الزمني.
10-6 الميزانيات الإعلانية والخدمات المقدمة من الغير: {{social_ads_terms_text}}
10-7 التسوية عند إدارة ميزانية إعلانية: إذا كانت وسيلة الدفع أو الميزانية الإعلانية تحت إدارة الطرف الثاني، يلتزم عند انتهاء العلاقة أو عند طلب الطرف الأول بتقديم بيان بالمبالغ المنفقة والمتبقية وفقًا للسجلات المتاحة من المنصات ومزودي الخدمة، وتسوية أي رصيد مستحق وفقًا للاتفاق.
10-8 الملفات الأصلية والقابلة للتعديل: {{social_source_files_text}}`,
      };
    case "social_media_management_source_section_12":
      return { ...base, titleAr: "المادة الحادية عشرة: تعديل نطاق الخدمات وإجراءات التعديل" };
    case "social_media_management_source_section_13":
      return { ...base, titleAr: "المادة الحادية عشرة: تعديل نطاق الخدمات وإجراءات التعديل (تابع)" };
    case "social_media_management_source_section_14":
      return {
        ...base,
        titleAr: "المادة الثانية عشرة: تسليم الخدمات واعتماد الأعمال والمحتوى",
        variables: ["social_content_review_days", "social_review_rounds_text"],
        bodyAr: `12-1 التسليم والمراجعة: يلتزم الطرف الثاني بإتاحة المحتوى أو التصميم أو الخطة أو التقرير أو أي مخرج للطرف الأول من خلال وسيلة التواصل أو الاعتماد المعتمدة.
12-2 مدة المراجعة: يلتزم الطرف الأول بمراجعة كل مخرج وإرسال ملاحظاته مجمعة خلال {{social_content_review_days}} أيام عمل من تاريخ تسلمه، ما لم يتفق الطرفان كتابةً على مدة مختلفة لمخرج بعينه. وإذا انقضت المدة دون رد جاز للطرف الثاني الاستناد إلى الأثر المقرر بالعقد أو مواصلة التنفيذ في الحدود التي لا تتطلب اعتمادًا صريحًا بحكم طبيعتها.
12-3 الاعتماد: يُعد اعتماد الطرف الأول للمخرج موافقة عليه في حدود النطاق الذي تم عرضه واعتماده، ولا يتحمل الطرف الثاني بعد الاعتماد مسؤولية الملاحظات التي كان يمكن اكتشافها بصورة معتادة قبل الاعتماد، ما لم يخالف التنفيذ صراحةً النسخة المعتمدة.
12-4 جولات المراجعة: {{social_review_rounds_text}}
12-5 حدود التعديل: لا تشمل المراجعات إعادة بناء الاستراتيجية أو إعادة تصميم الاتجاه المعتمد أو إضافة خدمات أو حسابات أو منصات أو مخرجات جديدة؛ وتخضع هذه الطلبات لإجراءات تعديل نطاق الخدمات والأعمال الإضافية.
12-6 أثر التأخر في الاعتماد: أي تأخر من الطرف الأول في المراجعة أو الاعتماد يمتد معه الجدول الزمني بالقدر المتأثر دون مسؤولية على الطرف الثاني عن مدة التأخير الراجعة للطرف الأول.`,
      };
    case "social_media_management_source_section_15":
      return {
        ...base,
        titleAr: "المادة الثالثة عشرة: حقوق الملكية الفكرية",
        variables: ["social_source_files_text", "social_portfolio_permission_text"],
        bodyAr: `13-1 حقوق الطرف الأول السابقة: تظل العلامات التجارية والشعارات والمواد والبيانات والمحتوى والحقوق التي قدمها الطرف الأول أو كان يملكها قبل العقد مملوكة له أو لأصحابها، ولا يكتسب الطرف الثاني عليها حقًا يتجاوز ما يلزم لتنفيذ الخدمات.
13-2 حقوق الطرف الثاني السابقة: تظل الأدوات والقوالب والمنهجيات والعمليات والأصول العامة والحقوق السابقة للطرف الثاني مملوكة له، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
13-3 المخرجات النهائية: تنتقل أو تُرخص الحقوق المتعلقة بالمخرجات النهائية المعتمدة والمدفوعة للطرف الأول في الحدود التي يقررها العقد وطبيعة المخرج والاتفاق المكتوب بين الطرفين، مع بقاء حقوق الغير وشروط التراخيص الخارجية نافذة.
13-4 الملفات الأصلية والقابلة للتعديل: {{social_source_files_text}}
13-5 محتوى الطرف الأول وحقوق الغير: يتحمل الطرف الأول مسؤولية مشروعية المواد والعلامات والتراخيص التي يقدمها أو يطلب استخدامها، بينما يلتزم الطرف الثاني بعدم تعمد الاعتداء على حقوق الغير في العناصر التي ينتجها بنفسه.
13-6 استخدام خدمات أو عناصر الغير: تبقى الخطوط والصور والموسيقى والقوالب والبرمجيات وأي عناصر مرخصة من الغير خاضعة لشروط أصحابها ولا تنتقل حقوق تتجاوز نطاق الترخيص.
13-7 العرض في معرض الأعمال والتسويق: {{social_portfolio_permission_text}}
13-8 أثر انتهاء العقد: لا يسقط انتهاء العقد الحقوق التي اكتسبها أي طرف قبل انتهائه، ويظل تسليم المخرجات والملفات مرتبطًا بنطاق الاتفاق والوفاء بالمستحقات المالية.`,
      };
    case "social_media_management_source_section_18":
      return {
        ...base,
        titleAr: "المادة السادسة عشرة: السرية وعدم الإفصاح",
        variables: ["social_portfolio_permission_text", "social_ai_permission_text"],
        bodyAr: `16-1 الالتزام بالسرية: يلتزم كل طرف بالمحافظة على سرية البيانات والمعلومات والمستندات وبيانات الدخول والخطط والمحتوى غير المنشور والمواد التي يطلع عليها بسبب العقد وعدم استخدامها إلا في حدود تنفيذ الالتزامات.
16-2 الأشخاص المصرح لهم: يجوز الإفصاح للموظفين أو المتعاونين أو مقدمي الخدمات بالقدر اللازم للتنفيذ، بشرط خضوعهم لالتزامات حماية مناسبة، ويظل الطرف الذي استعان بهم مسؤولًا في حدود القانون والعقد.
16-3 الاستثناءات: لا تشمل السرية ما كان معلومًا بصورة مشروعة قبل الإفصاح، أو أصبح متاحًا للجمهور دون مخالفة، أو حصل عليه الطرف من مصدر مشروع مستقل، أو وجب الإفصاح عنه بحكم القانون أو أمر جهة مختصة.
16-4 بيانات الدخول والبيانات الشخصية: يلتزم الطرفان باتخاذ التدابير المعقولة لحماية كلمات المرور ورموز التحقق وصلاحيات الوصول والبيانات الشخصية وعدم مشاركتها خارج نطاق التنفيذ.
16-5 مدة السرية: يستمر الالتزام بالسرية طوال مدة العقد ولمدة ثلاث (3) سنوات بعد انتهائه أو فسخه، أو طوال بقاء المعلومة محتفظة بطبيعتها السرية إذا أوجب القانون أو طبيعتها حماية أطول.
16-6 Portfolio واستخدام اسم العميل: {{social_portfolio_permission_text}}
16-7 استخدام أدوات الذكاء الاصطناعي والبيانات غير المنشورة: {{social_ai_permission_text}}
16-8 إعادة أو حذف المعلومات: عند انتهاء العقد يلتزم كل طرف برد أو حذف ما لدى حيازته من بيانات سرية تخص الطرف الآخر متى كان ذلك ممكنًا، مع جواز الاحتفاظ بما يفرض القانون الاحتفاظ به أو يلزم لإثبات الحقوق والدفاع عنها.`,
      };
    case "social_media_management_source_section_20":
      return {
        ...base,
        titleAr: "المادة الثامنة عشرة: انتهاء العقد وآثاره",
        variables: ["social_breach_cure_days", "social_payment_grace_days", "social_nonpayment_termination_days", "social_client_stoppage_days", "social_client_post_notice_termination_days", "social_source_files_text"],
        bodyAr: `18-1 انتهاء العقد: ينتهي العقد بانتهاء مدته أو بتنفيذ الالتزامات أو باتفاق الطرفين أو بأي سبب إنهاء أو فسخ يقرره العقد أو القانون.
18-2 الإخلال الجوهري: يجوز للطرف المتضرر إنهاء العقد إذا لم يعالج الطرف المخل إخلاله الجوهري خلال {{social_breach_cure_days}} يومًا من تاريخ إخطاره كتابةً، ما لم يكن الإخلال غير قابل للإصلاح فيجوز الإنهاء فورًا في الحدود التي يجيزها القانون.
18-3 عدم السداد: إذا تأخر الطرف الأول عن سداد مبلغ مستحق، يجوز للطرف الثاني بعد منحه مهلة {{social_payment_grace_days}} أيام عمل تعليق الخدمات. وإذا استمر التأخر لمدة {{social_nonpayment_termination_days}} أيام عمل من تاريخ الإخطار، جاز للطرف الثاني إنهاء العقد مع الاحتفاظ بمستحقاته.
18-4 توقف المشروع بسبب الطرف الأول: إذا توقف التنفيذ بسبب عدم تقديم البيانات أو المحتوى أو الاعتمادات أو صلاحيات الوصول أو عدم الرد لمدة تجاوز {{social_client_stoppage_days}} أيام عمل، جاز للطرف الثاني تعليق الخدمات. وإذا استمر سبب التوقف بعد إخطار الطرف الأول وانقضاء {{social_client_post_notice_termination_days}} أيام عمل من تاريخ الإخطار، جاز للطرف الثاني إنهاء العقد وتسوية الحسابات.
18-5 إنهاء العقد بسبب إخلال الطرف الثاني: يجوز للطرف الأول إنهاء العقد إذا ثبت إخلال الطرف الثاني إخلالًا جوهريًا بنطاق الخدمات ولم يعالجه خلال مهلة معالجة الإخلال المحددة في البند 18-2.
18-6 آثار الإنهاء: يلتزم الطرف الأول بسداد قيمة الخدمات والمراحل المنفذة حتى تاريخ الإنهاء والمصروفات والالتزامات المعتمدة، وتسوّى المبالغ المدفوعة عن خدمات غير منفذة، ولا يؤثر الإنهاء على الحقوق أو المطالبات التي نشأت قبل تاريخه.
18-7 المخرجات والملفات عند الإنهاء: يستحق الطرف الأول المخرجات النهائية التي اكتمل تنفيذها واستحق تسليمها بعد سداد مستحقاتها. وبالنسبة للملفات الأصلية أو المفتوحة: {{social_source_files_text}}
18-8 استمرار الأحكام: تستمر بعد انتهاء العقد الأحكام التي تقتضي طبيعتها ذلك، وعلى الأخص السرية والملكية الفكرية والالتزامات المالية وتسوية المنازعات وحدود المسؤولية.`,
      };
    case "social_media_management_source_section_21": {
      const body = base.bodyAr.replace(/19-5\s*التزامات الطرف المتمسك بالقوة القاهرة أو الظروف الطارئة:[\s\S]*?(?=19-6\s*آثار القوة القاهرة)/u,
        `19-5 التزامات الطرف المتمسك بالقوة القاهرة أو الظروف الطارئة: يلتزم الطرف المتأثر بإخطار الطرف الآخر كتابةً خلال {{social_force_majeure_notice_days}} أيام عمل من تاريخ علمه بالواقعة متى كان ذلك ممكنًا، مع بيان طبيعتها وأثرها المتوقع ومدتها التقديرية، واتخاذ التدابير المعقولة للحد من آثارها وتقديم ما يتوافر من مستندات مؤيدة عند الطلب.\n`);
      return { ...base, titleAr: "المادة التاسعة عشرة: القوة القاهرة والظروف الطارئة", variables: ["social_force_majeure_notice_days"], bodyAr: body };
    }
    case "social_media_management_source_section_22":
      return {
        ...base,
        titleAr: "المادة العشرون: الإخطارات ووسائل الاتصال والموطن المختار",
        variables: ["social_email_notices_text", "social_messaging_notices_text"],
        bodyAr: `20-1 الموطن المختار: يُعد العنوان المبين في تعريف كل طرف موطنًا مختارًا له، وتوجه إليه الإخطارات الرسمية ما لم يتم إخطار الطرف الآخر كتابةً بتغييره.
20-2 البريد الإلكتروني: {{social_email_notices_text}}
20-3 تطبيقات المراسلة: {{social_messaging_notices_text}}
20-4 حجية المراسلات الإلكترونية: تكون المراسلات والاعتمادات المتبادلة عبر الوسائل المعتمدة وسيلة إثبات متى أمكن التحقق من صدورها ونسبتها إلى مرسلها وسلامة محتواها. ولا يترتب عليها بذاتها تعديل نطاق الخدمات أو المقابل المالي أو المدة إلا بموافقة صريحة وفق إجراءات تعديل العقد.
20-5 تغيير بيانات الاتصال: يلتزم كل طرف بإخطار الطرف الآخر بأي تغيير في بيانات التواصل، وإلى حين تمام الإخطار تظل البيانات السابقة منتجة لآثارها في الحدود التي يجيزها القانون.`,
      };
    case "social_media_management_source_section_23":
      return {
        ...base,
        titleAr: "المادة الحادية والعشرون: القانون الواجب التطبيق وتسوية المنازعات",
        variables: [...new Set([...(base.variables ?? []), "social_competent_court_text"])],
        bodyAr: base.bodyAr.replace(/21-3\s*الاختصاص القضائي:[\s\S]*?(?=21-4\s*المنازعات الفنية)/u,
          `21-3 الاختصاص القضائي: مع مراعاة قواعد الاختصاص المتعلقة بالنظام العام، اتفق الطرفان على اختصاص {{social_competent_court_text}} بنظر المنازعات الناشئة عن هذا العقد أو المرتبطة به، وذلك في الحدود التي يجيزها القانون. وإذا تعذر انعقاد الاختصاص للمحكمة المختارة قانونًا، ينعقد الاختصاص للمحكمة المصرية المختصة وفقًا للقواعد الآمرة.\n`),
      };
    case "social_media_management_source_section_24": {
      let body = base.bodyAr
        .replace(/22-11\s*عدد النسخ:[\s\S]*?(?=22-12\s*اللغة المعتمدة)/u, "22-11 عدد النسخ: حُرر هذا العقد من {{social_contract_copies_text}} أصلية أو إلكترونية متطابقة، ويحتفظ كل طرف بنسخة للعمل بموجبها، وتكون لجميع النسخ ذات الحجية القانونية متى ثبتت صحتها ونسبتها إلى أطرافها. ويجوز توقيع العقد على نسخ منفصلة أو إلكترونية ويُعد مجموعها عقدًا واحدًا منتجًا لجميع آثاره القانونية.\n")
        .replace(/22-16\s*الرسوم والضرائب القانونية[\s\S]*$/u, "")
        .trim();
      return { ...base, titleAr: "المادة الثانية والعشرون: الأحكام العامة", variables: [...new Set([...(base.variables ?? []), "social_contract_copies_text"])], bodyAr: body };
    }
    case "social_media_management_source_section_25": {
      const markers = ["وتوقيعات الأطراف", "وتوقيعات األطراف", "الطرف الثاني (مقدم الخدمة)", "الطرف الثاني ( مقدم الخدمة )"];
      let body = base.bodyAr;
      for (const marker of markers) { const at = body.indexOf(marker); if (at >= 0) body = body.slice(0, at).trim(); }
      return { ...base, titleAr: "المادة الثالثة والعشرون: التوقيعات", bodyAr: body };
    }
    default:
      return base;
  }
}

const reviewedIdentityMainClauseOverrides: Record<string, Partial<LegalClauseDefinition>> = {
  visual_identity_design_source_section_26: {
    titleAr: "ثالثًا: الاختصاص القضائي — رابعًا: المنازعات الفنية — خامسًا: الإجراءات الوقتية",
    variables: ["visual_competent_court_text"],
    bodyAr: `ثالثًا: مع مراعاة قواعد الاختصاص الولائي والنوعي المتعلقة بالنظام العام، اتفق الطرفان على اختصاص {{visual_competent_court_text}} بنظر المنازعات الناشئة عن هذا العقد أو المرتبطة به، وذلك في الحدود التي يجيزها القانون.
رابعًا: إذا تعلق النزاع بمسألة فنية، بما في ذلك مدى مطابقة الأعمال لنطاق الخدمات أو تقييم المراحل أو تحديد ما إذا كان العمل داخل النطاق أو عملًا إضافيًا، جاز الاستعانة بخبير فني متخصص، ولا يكون رأيه ملزمًا إلا باتفاق مكتوب أو إذا كان منتدبًا من المحكمة المختصة.
خامسًا: لا يخل ما تقدم بحق أي طرف في اتخاذ الإجراءات الوقتية أو التحفظية أو المستعجلة التي يجيزها القانون لحماية حقوقه أو الأدلة أو منع ضرر يتعذر تداركه.`,
  },
  visual_identity_design_source_section_23: {
    titleAr: "المادة السادسة عشرة: الإخطارات والمراسلات",
    variables: ["visual_email_notices_text", "visual_messaging_notices_text"],
    bodyAr: `تكون الإخطارات والمراسلات والاعتمادات المتعلقة بهذا العقد صحيحة ومنتجة لآثارها متى تمت بإحدى الوسائل المعتمدة بين الطرفين وفي الحدود التي يجيزها القانون. ويُعد العنوان المبين في تعريف كل طرف موطنًا مختارًا له إلى أن يخطر الطرف الآخر كتابةً بتغييره.
{{visual_email_notices_text}}
{{visual_messaging_notices_text}}
ولا يترتب على المراسلات الإلكترونية بذاتها تعديل نطاق الخدمات أو المقابل المالي أو مدة التنفيذ أو أي التزام جوهري إلا إذا تضمنت اتفاقًا صريحًا وفق إجراءات تعديل العقد. ويلتزم كل طرف بإخطار الآخر بأي تغيير في بيانات التواصل الخاصة به.`,
  },
  visual_identity_design_source_section_09: {
    titleAr: "المادة التاسعة: المقابل المالي وآلية السداد",
    variables: ["visual_contract_value", "visual_contract_value_words", "visual_payment_schedule_text", "visual_payment_method", "visual_source_files_text"],
    bodyAr: `يلتزم الطرف الأول بسداد إجمالي مقابل مالي قدره {{visual_contract_value}} جنيه مصري ({{visual_contract_value_words}}) نظير الخدمات والمخرجات المشمولة بهذا العقد.
{{visual_payment_schedule_text}}
وتكون وسيلة السداد المتفق عليها: {{visual_payment_method}}. ويُعد إيصال السداد أو إشعار التحويل أو أي وسيلة إثبات مقبولة قانونًا دليلًا على الوفاء بالمبلغ المسدد.
ولا يلتزم الطرف الثاني بالبدء أو الاستمرار أو تسليم المرحلة التي اشترط العقد سداد دفعتها قبل تمام السداد، ويجوز له تعليق التنفيذ عند التأخر دون أن يُعد ذلك تأخيرًا منسوبًا إليه. ولا يشمل المقابل أعمالًا إضافية خارج نطاق الخدمات إلا باتفاق مكتوب.
وفيما يتعلق بالملفات المصدرية: {{visual_source_files_text}}`,
  },
  visual_identity_design_source_preface: {
    titleAr: "المادة الأولى: أطراف العقد وبيانات المشروع",
    variables: ["contract_date", "visual_client_party_definition", "visual_provider_party_definition", "visual_project_definition"],
    bodyAr: `إنه في تاريخ {{contract_date}}، تم إبرام هذا العقد بين كل من:
أولًا: {{visual_client_party_definition}}
ثانيًا: {{visual_provider_party_definition}}
{{visual_project_definition}}
وقد اتفق الطرفان، وهما بكامل الأهلية والصفة القانونية، على أن تكون البيانات والتعريفات السابقة أساسًا لتفسير وتنفيذ أحكام هذا العقد.`,
  },
  visual_identity_design_source_section_03: {
    titleAr: "المادة الثالثة: محل العقد",
    variables: ["visual_project_name", "visual_project_purpose", "visual_scope_services_text"],
    bodyAr: `يتمثل محل هذا العقد في التزام الطرف الثاني بتقديم خدمات تصميم الهوية البصرية الخاصة بـ «{{visual_project_name}}» لتحقيق الغرض الآتي: {{visual_project_purpose}}.
{{visual_scope_services_text}}
ويقتصر التزام الطرف الثاني على الخدمات والمخرجات المحددة أعلاه، ولا تمتد التزاماته إلى أعمال أو خدمات إضافية إلا باتفاق مكتوب يحدد أثرها — إن وجد — على المقابل المالي ومدة التنفيذ وسائر الالتزامات.`,
  },
  visual_identity_design_source_section_10: {
    titleAr: "المادة العاشرة: المراجعات والتعديلات",
    variables: ["visual_revision_rounds", "visual_scope_services_text"],
    bodyAr: `يشمل المقابل المالي عدد {{visual_revision_rounds}} جولة/جولات مراجعة على الأعمال الداخلة ضمن نطاق الخدمات المتفق عليه. ويقدم الطرف الأول ملاحظاته بصورة واضحة ومجمعة قدر الإمكان لكل جولة.
{{visual_scope_services_text}}
وتقتصر المراجعات على تحسين أو تعديل الأعمال الداخلة ضمن النطاق، ولا تشمل إعادة تصميم المشروع بالكامل أو تغيير الاتجاه الأساسي بعد اعتماده أو إضافة خدمات جديدة. وأي طلب يتجاوز عدد الجولات أو النطاق المتفق عليه ويؤثر في حجم الأعمال أو التكلفة أو المدة يُعد عملًا إضافيًا لا يلتزم الطرف الثاني بتنفيذه إلا بعد اتفاق مكتوب يحدد أثره المالي والزمني. ويُعد اعتماد أي مرحلة موافقة عليها في حدودها.`,
  },
  visual_identity_design_source_section_11: {
    titleAr: "المادة الحادية عشرة: حقوق الملكية الفكرية وحقوق الاستخدام",
    variables: ["visual_ip_rights_text", "visual_source_files_text", "visual_portfolio_permission_text"],
    bodyAr: `تظل المسودات والنماذج الأولية والأفكار والمقترحات والأعمال غير المعتمدة أو غير المدفوعة مملوكة للطرف الثاني، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
{{visual_ip_rights_text}}
{{visual_source_files_text}}
ولا تشمل الحقوق الممنوحة للطرف الأول عناصر مملوكة للغير أو خاضعة لتراخيص مستقلة، مثل الخطوط أو الصور أو الأدوات، إلا في حدود تراخيصها. ويضمن الطرف الثاني في حدود ما أنشأه بنفسه عدم تعمد الاعتداء على حقوق الغير، بينما يتحمل الطرف الأول مسؤولية المواد التي يزوده بها أو يطلب استخدامها.
{{visual_portfolio_permission_text}}`,
  },
  visual_identity_design_source_section_12: {
    titleAr: "المادة الثانية عشرة: السرية وعدم الإفصاح",
    variables: ["visual_portfolio_permission_text"],
    bodyAr: `يلتزم كل طرف بالحفاظ على سرية المعلومات والبيانات والمستندات والملفات والرسومات والتصميمات والمراسلات ذات الطبيعة السرية التي يطلع عليها بمناسبة تنفيذ هذا العقد، وعدم استخدامها أو الإفصاح عنها إلا بالقدر اللازم للتنفيذ أو بموافقة كتابية أو تنفيذًا لالتزام قانوني.
ولا تشمل السرية المعلومات المتاحة للكافة بصورة مشروعة، أو المعلومة سابقًا للطرف المتلقي، أو المتلقاة من مصدر مستقل مشروع، أو التي أذن صاحبها كتابةً بالإفصاح عنها. ويلتزم كل طرف باتخاذ التدابير المعقولة للمحافظة عليها وضمان التزام من يستعين بهم في حدود مسؤوليته.
ويظل الالتزام بالسرية قائمًا طوال مدة العقد ولمدة سنة واحدة بعد انتهائه أو فسخه أو انقضائه، أو طالما ظلت المعلومات محتفظة بطبيعتها السرية، أيهما أطول، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
وفيما يتعلق بعرض الأعمال: {{visual_portfolio_permission_text}}`,
  },
  visual_identity_design_source_section_25: {
    titleAr: "ثانيًا: التسوية الودية",
    bodyAr: `يجوز للطرفين، عند نشوء أي خلاف أو نزاع يتعلق بهذا العقد أو بتفسيره أو تنفيذه أو تعديله أو إنهائه أو آثاره، السعي إلى تسويته وديًا بحسن نية، سواء عن طريق التفاوض المباشر أو الاستعانة بوسيط قانوني أو خبير فني أو أي شخص يتفقان عليه، وذلك بقصد الوصول إلى حل رضائي متى كان ذلك ممكنًا.
ولا تُعد إجراءات التفاوض أو التسوية الودية أو الوساطة أو الاستعانة بخبير شرطًا سابقًا أو لازمًا للجوء إلى القضاء، ولا يجوز لأي من الطرفين الدفع بعدم قبول أي دعوى أو طلب أو دفع أو التمسك بعدم سلوك تلك الإجراءات أو عدم استكمالها أو عدم نجاحها، وذلك ما لم يوجب القانون صراحةً خلاف ذلك.
كما لا يترتب على مباشرة إجراءات التفاوض أو التسوية الودية أو الوساطة أو الخبرة وقف المواعيد القانونية أو التقادم أو سقوط أي حق، ولا تمنع أيًا من الطرفين من اللجوء إلى القضاء أو اتخاذ أي إجراء وقتي أو تحفظي أو مستعجل يجيزه القانون متى اقتضت الضرورة ذلك.`,
  },
  visual_identity_design_source_section_02: {
    titleAr: "المادة الثانية: التمهيد",
    variables: ["visual_project_name", "visual_project_purpose"],
    bodyAr: `يُعد التمهيد السابق جزءًا لا يتجزأ من هذا العقد ومكمّلًا ومفسرًا لأحكامه. وحيث إن الطرف الأول يرغب في التعاقد مع الطرف الثاني لتنفيذ خدمات تصميم الهوية البصرية الخاصة بـ «{{visual_project_name}}» لتحقيق الغرض الآتي: {{visual_project_purpose}}، وحيث إن الطرف الثاني لديه الخبرة والقدرة الفنية اللازمة لتقديم تلك الخدمات، فقد اتفقت إرادة الطرفين على تنظيم العلاقة بينهما وفقًا لأحكام هذا العقد.
ويلتزم الطرفان بتنفيذ العقد بحسن نية وفي حدود نطاق الخدمات والحقوق والالتزامات المحددة فيه، ويُعد العقد وما يعتمد تنفيذًا له كتابةً كامل الاتفاق بينهما بشأن موضوعه.`,
  },
  visual_identity_design_source_section_07: {
    titleAr: "المادة السابعة: التزامات الطرف الثاني (المصمم)",
    bodyAr: `1. يلتزم الطرف الثاني بتنفيذ خدمات تصميم الهوية البصرية محل هذا العقد بنفسه، أو بالاستعانة بمن يساهم في التنفيذ تحت إشرافه ومسؤوليته، ويظل مسؤولًا أمام الطرف الأول عن تنفيذ الأعمال المتفق عليها وفقًا لأحكام هذا العقد.
2. يلتزم الطرف الثاني ببذل العناية التي يقتضيها الشخص المهني المعتاد في مجال تصميم الهوية البصرية، وتنفيذ الخدمات وفقًا للأصول المهنية المتعارف عليها ونطاق العمل المتفق عليه، وذلك دون أن يضمن تحقيق أي نتائج أو آثار تجارية أو تسويقية أو مالية معينة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
3. يلتزم الطرف الثاني بتنفيذ الخدمات وفقًا لنطاق العمل المتفق عليه، ولا يجوز له إجراء أي تعديل جوهري عليه أو تنفيذ أعمال إضافية يترتب عليها تغيير في نطاق الخدمات أو المقابل المالي أو مدة التنفيذ إلا بعد اتفاق الطرفين كتابةً على ذلك.
4. يلتزم الطرف الثاني بإخطار الطرف الأول، دون تأخير غير مبرر، بأي ظرف أو معوق يعلمه ويكون من شأنه التأثير بصورة جوهرية على تنفيذ الخدمات أو مواعيدها، مع بيان أثر ذلك - متى أمكن - على سير التنفيذ.
5. يلتزم الطرف الثاني، في حدود الأعمال والعناصر التي يقوم بإنتاجها أو إعدادها بنفسه، بعدم تعمد استخدام أو نسخ أو تقليد أعمال الغير أو الاعتداء على حقوق الملكية الفكرية الخاصة بهم، ولا تمتد مسؤوليته إلى أي مواد أو ملفات أو بيانات أو عناصر أو محتوى يقدمه الطرف الأول أو يطلب استخدامه.
6. يلتزم الطرف الثاني بالمحافظة على البيانات والمعلومات والملفات التي يتسلمها من الطرف الأول، وعدم استخدامها أو الإفصاح عنها إلا في الحدود اللازمة لتنفيذ هذا العقد، وذلك مع مراعاة الأحكام الخاصة بالسرية الواردة فيه.
7. يلتزم الطرف الثاني بإخطار الطرف الأول إذا تبين له وجود مانع ظاهر أو مخالفة محتملة ناشئة عن البيانات أو المواد أو العناصر التي يقدمها الطرف الأول أو يطلب استخدامها، ولا يُعد ذلك التزامًا على الطرف الثاني بإجراء فحص قانوني أو بحث عن حقوق الغير أو ضمان سلامة تلك المواد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
  },
  visual_identity_design_source_section_08: {
    titleAr: "المادة الثامنة: التزامات الطرف الأول (العميل)",
    bodyAr: `1. يلتزم الطرف الأول بتزويد الطرف الثاني بجميع البيانات والمعلومات والمحتوى والملفات والمستندات والتعليمات اللازمة لتنفيذ الخدمات محل هذا العقد، على أن تكون صحيحة وكاملة ومقدمة بحسن نية، وألا يترتب على استخدامها اعتداء على حقوق الغير في حدود علم ومسؤولية الطرف الأول، وذلك في المواعيد التي يتفق عليها الطرفان.
2. يلتزم الطرف الأول بالتعاون مع الطرف الثاني بالقدر اللازم لتنفيذ المشروع، وذلك من خلال تقديم البيانات والردود والملاحظات والاعتمادات المطلوبة في المواعيد المناسبة، ويترتب على تأخره في تقديم أي منها أو عدم توفير أي متطلبات لازمة للتنفيذ امتداد مدة التنفيذ بالقدر الذي يتأثر به المشروع، دون أن يُعد ذلك إخلالًا من الطرف الثاني بالتزاماته.
3. يلتزم الطرف الأول بتحديد الشخص أو الجهة المخولة بالتواصل مع الطرف الثاني واعتماد الأعمال أو إبداء الملاحظات عليها، متى كان ذلك لازمًا لطبيعة المشروع، وتُعد التعليمات أو الاعتمادات الصادرة من الشخص المعتمد ملزمة للطرف الأول في حدود الصلاحيات الممنوحة له.
4. يلتزم الطرف الأول بسداد المقابل المالي المستحق للطرف الثاني في المواعيد ووفقًا للطريقة المتفق عليها في هذا العقد.
5. يتحمل الطرف الأول مسؤولية صحة ودقة ومشروعية جميع البيانات أو النصوص أو الصور أو الشعارات أو العلامات التجارية أو الملفات أو أي مواد أو عناصر أخرى يقدمها للطرف الثاني أو يطلب استخدامها في تنفيذ المشروع، كما يتحمل المسؤولية عن أي مطالبة أو نزاع ينشأ بسبب استخدامها، ما لم يكن ذلك ناشئًا عن خطأ أو مخالفة من الطرف الثاني.
6. يلتزم الطرف الأول بإخطار الطرف الثاني، دون تأخير غير مبرر، بأي واقعة أو ظرف يعلمه ويكون من شأنه التأثير في تنفيذ المشروع أو نطاق الخدمات أو المواعيد المتفق عليها.
7. يلتزم الطرف الأول باستخدام الأعمال والمخرجات النهائية وفقًا لأحكام هذا العقد والحقوق أو التراخيص الممنوحة له بموجبه، ودون إجراء أي استخدام أو تصرف يتجاوز الحدود المتفق عليها أو يخالف الأحكام المنظمة للملكية الفكرية الواردة في هذا العقد.`,
  },
  visual_identity_design_source_section_22: {
    titleAr: "المادة الخامسة عشرة: الأحكام العامة",
    bodyAr: `1. يُعد هذا العقد كامل الاتفاق بين الطرفين بشأن موضوعه، ويحل محل أي تفاهمات أو مراسلات أو اتفاقات أو ترتيبات سابقة تتعلق بذات الموضوع، سواء كانت شفهية أو مكتوبة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
2. تُعد أي ملاحق أو نماذج أو جداول أو محاضر أو مستندات يتم تحريرها تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ العقد جزءًا لا يتجزأ منه، وتفسر وتطبق في حدود ما تتضمنه من بيانات أو مواصفات أو أحكام تفصيلية، وذلك دون الإخلال بالأحكام الأساسية الواردة في هذا العقد.
3. لا يجوز لأي من الطرفين التنازل عن هذا العقد أو عن أي من حقوقه أو التزاماته الناشئة عنه، كليًا أو جزئيًا، أو إحلال الغير محله في تنفيذ التزاماته، إلا بموافقة كتابية مسبقة من الطرف الآخر، ولا تُعد استعانة الطرف الثاني بمن يساعده في تنفيذ الخدمات وفقًا لأحكام هذا العقد تنازلًا عن العقد أو نقلًا للالتزامات، ويظل مسؤولًا عن الأعمال المنفذة تحت إشرافه ومسؤوليته.
4. لا يُعد امتناع أي من الطرفين عن استعمال أي حق مقرر له بموجب هذا العقد، أو تأخره في استعماله، تنازلًا عن هذا الحق، كما لا يمنع ذلك من استعماله لاحقًا أو استعمال أي حق آخر مقرر بموجب العقد أو القانون.
5. إذا تقرر بطلان أو عدم صحة أو عدم قابلية تنفيذ أي حكم من أحكام هذا العقد، فلا يؤثر ذلك على صحة أو نفاذ باقي الأحكام، ويلتزم الطرفان باستبدال الحكم غير القابل للتنفيذ بحكم آخر يحقق أقرب أثر قانوني ممكن للغرض المقصود منه، وذلك في حدود ما يسمح به القانون.
6. لا يجوز تعديل هذا العقد أو إضافة أي أحكام جديدة إليه إلا بموجب اتفاق مكتوب وموقع من الطرفين، ويُعد أي تعديل أو إضافة أو ملحق أو نموذج أو جدول أو محضر محرر وفقًا لذلك جزءًا لا يتجزأ من العقد.
7. لا ينشأ عن هذا العقد أي علاقة شراكة أو وكالة أو عمل أو تبعية بين الطرفين، وإنما تظل العلاقة بينهما علاقة تعاقدية مستقلة لتنفيذ الخدمات محل هذا العقد.
8. تُعد عناوين المواد والبنود الواردة في هذا العقد لأغراض التنظيم والتيسير فقط، ولا يكون لها أثر في تفسير أو تقييد أو توسيع مضمون أي حكم من أحكامه.`,
  },
  visual_identity_design_source_section_04: {
    titleAr: "المادة الرابعة: نطاق الخدمات",
    variables: ["visual_scope_services_text"],
    bodyAr: `يلتزم الطرف الثاني بتنفيذ خدمات تصميم الهوية البصرية المتفق عليها وفقًا للأصول المهنية وفي حدود هذا العقد.
{{visual_scope_services_text}}
ولا تُعد المقترحات أو الأفكار الأولية أو المناقشات أو النماذج التجريبية جزءًا من المخرجات النهائية ما لم يعتمدها الطرفان كتابةً. ويجوز تعديل نطاق الخدمات باتفاق مكتوب يحدد أثر التعديل على المقابل المالي أو المدة أو غيرهما.
ويلتزم الطرف الأول بإرسال قائمة ملاحظاته المجمعة الخاصة بكل جولة مراجعة خلال مدة لا تجاوز ثلاثة (3) أيام عمل من تاريخ تسلمه المرحلة محل المراجعة؛ فإذا انقضت المدة دون ملاحظات أو اعتراض، عُدت المرحلة معتمدة في حدودها، ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
  },
  visual_identity_design_source_section_05: {
    titleAr: "المادة الخامسة: المخرجات النهائية والتسليم",
    variables: ["visual_scope_services_text", "visual_source_files_text"],
    bodyAr: `يلتزم الطرف الثاني بتسليم المخرجات النهائية التي تدخل ضمن نطاق الخدمات المتفق عليه، ولا تشمل المسودات أو الأفكار الأولية أو الأعمال غير المعتمدة ما لم يتفق الطرفان كتابةً على خلاف ذلك.
{{visual_scope_services_text}}
{{visual_source_files_text}}
ويجوز التسليم دفعة واحدة أو على مراحل بحسب طبيعة المشروع، ويُعتد بالتسليم الإلكتروني متى تم عبر وسيلة معتمدة وأمكن إثبات إرسال الملفات أو إتاحتها للطرف الأول. ولا يُعد مجرد استلام الملفات قبولًا نهائيًا أو انتقالًا للحقوق إلا وفقًا لأحكام المراجعات والملكية الفكرية بهذا العقد.`,
  },
  visual_identity_design_source_section_06: {
    titleAr: "المادة السادسة: مدة التنفيذ",
    variables: ["visual_execution_duration_text", "visual_execution_start_text"],
    bodyAr: `تكون مدة تنفيذ الخدمات محل هذا العقد {{visual_execution_duration_text}}، وتبدأ {{visual_execution_start_text}}.
وتُحتسب المدة على أساس التزام كل طرف بتنفيذ التزاماته في المواعيد المتفق عليها، ويترتب على تأخر الطرف الأول في تقديم البيانات أو المواد أو الملاحظات أو الاعتمادات أو الدفعات اللازمة امتداد مدة التنفيذ بالقدر اللازم لتدارك أثر التأخير. كما يجوز تعديل المدة إذا تم اعتماد تغيير في نطاق الخدمات أو أعمال إضافية، وذلك بموجب اتفاق مكتوب. ولا يُسأل الطرف الثاني عن التأخير الناشئ عن سبب خارج عن إرادته وفقًا لأحكام هذا العقد.`,
  },
  visual_identity_design_source_section_13: {
    titleAr: "المادة الثالثة عشرة: إنهاء العقد وآثاره",
    bodyAr: `أولًا: انتهاء العقد: ينتهي هذا العقد بانتهاء مدته، أو بتنفيذ جميع الالتزامات الناشئة عنه، أو باتفاق الطرفين كتابةً على إنهائه، أو بتحقق أي سبب من أسباب الإنهاء أو الفسخ أو الانقضاء المنصوص عليها في هذا العقد أو في القانون.`,
  },
  visual_identity_design_source_section_14: {
    titleAr: "ثانيًا: الإنهاء بسبب الإخلال الجوهري",
    variables: ["visual_breach_cure_days"],
    bodyAr: `يجوز لأي من الطرفين إنهاء هذا العقد إذا أخل الطرف الآخر بالتزام جوهري ولم يقم بإزالة الإخلال أو تداركه خلال {{visual_breach_cure_days}} يومًا من تاريخ إخطاره كتابةً بذلك. أما إذا كان الإخلال بطبيعته غير قابل للإصلاح، فيجوز للطرف المتضرر إنهاء العقد فورًا دون حاجة إلى إعذار أو إنذار، مع احتفاظه بالحقوق التي يقررها العقد والقانون.`,
  },
  visual_identity_design_source_section_15: {
    titleAr: "ثالثًا: تعليق التنفيذ بسبب عدم السداد",
    variables: ["visual_nonpayment_termination_days"],
    bodyAr: `إذا تأخر الطرف الأول عن سداد أي مبلغ مستحق، جاز للطرف الثاني بعد إخطاره كتابةً تعليق تنفيذ الخدمات كليًا أو جزئيًا حتى تمام السداد، ولا تُحتسب مدة التعليق ضمن مدة التنفيذ. وإذا استمر التأخير لمدة {{visual_nonpayment_termination_days}} يومًا من تاريخ الإخطار، جاز للطرف الثاني إنهاء العقد مع احتفاظه بمستحقاته وحقوقه وفقًا للعقد والقانون.`,
  },
  visual_identity_design_source_section_16: {
    titleAr: "رابعًا: تعليق المشروع بسبب الطرف الأول — خامسًا: إنهاء العقد من جانب الطرف الأول",
    variables: ["visual_client_stoppage_days", "visual_post_notice_termination_days", "visual_breach_cure_days"],
    bodyAr: `رابعًا: إذا توقف تنفيذ المشروع بسبب امتناع الطرف الأول عن تقديم البيانات أو المواد أو الاعتمادات أو الموافقات أو الردود اللازمة لمدة تجاوز {{visual_client_stoppage_days}} يومًا من تاريخ طلبها، جاز للطرف الثاني تعليق التنفيذ. فإذا استمر سبب التوقف بعد إخطار الطرف الأول كتابةً وانقضاء {{visual_post_notice_termination_days}} يومًا من تاريخ الإخطار، جاز للطرف الثاني إنهاء العقد مع إجراء التسوية المالية وفقًا لأحكامه.
خامسًا: يجوز للطرف الأول إنهاء العقد إذا ثبت إخلال الطرف الثاني إخلالًا جوهريًا بتنفيذ الخدمات أو عدم مطابقتها للنطاق المتفق عليه ولم يقم بمعالجة الإخلال خلال {{visual_breach_cure_days}} يومًا من تاريخ إخطاره كتابةً، دون إخلال بحقوق الطرف الأول الأخرى.`,
  },
  visual_identity_design_source_section_17: {
    titleAr: "سادسًا: آثار الإنهاء",
    bodyAr: `يترتب على انتهاء أو إنهاء هذا العقد لأي سبب ما يأتي:
أ. يلتزم الطرف الأول بسداد قيمة جميع الأعمال والخدمات والمراحل التي نفذها الطرف الثاني حتى تاريخ الإنهاء، وجميع المصروفات أو الرسوم أو الالتزامات التي تحملها بصورة مشروعة تنفيذًا لهذا العقد، وذلك في الحدود المتفق عليها.
ب. إذا كان الطرف الأول قد سدد مبالغ عن أعمال أو خدمات لم يبدأ تنفيذها أو لم تستحق بعد، فتتم تسوية تلك المبالغ وفقًا لما تم تنفيذه فعليًا وما يقضي به هذا العقد أو ما يتفق عليه الطرفان كتابةً.
ج. يلتزم كل طرف برد أو حذف أو إتلاف ما يكون بحوزته من مستندات أو بيانات أو ملفات أو مواد تخص الطرف الآخر، متى كان ذلك ممكنًا ولا يتعارض مع التزام قانوني أو مع ضرورة الاحتفاظ بها لإثبات حق أو الدفاع عنه.
د. لا يؤثر انتهاء أو إنهاء هذا العقد على الحقوق أو الالتزامات أو المطالبات التي نشأت قبل تاريخ انتهائه، ولا على أي حقوق في التعويض أو التنفيذ أو المطالبة القضائية.`,
  },
  visual_identity_design_source_section_18: {
    titleAr: "سابعًا: المخرجات وحقوق الملكية الفكرية عند الإنهاء",
    variables: ["visual_source_files_text", "visual_ip_rights_text"],
    bodyAr: `لا يترتب على انتهاء أو إنهاء العقد سقوط أي حق اكتسبه الطرف الأول فعلًا وفقًا لأحكام الملكية الفكرية والسداد. وإذا انتهى العقد قبل اكتمال المشروع، يلتزم الطرف الثاني بتسليم الأعمال والمخرجات المكتملة التي استحق تسليمها بعد سداد مستحقاتها.
وتظل طبيعة الحقوق التي يحصل عليها الطرف الأول محكومة بالاتفاق الآتي: {{visual_ip_rights_text}}
كما يظل تسليم الملفات المصدرية محكومًا بالاتفاق الآتي: {{visual_source_files_text}}`,
  },
  visual_identity_design_source_section_19: {
    titleAr: "ثامنًا: استمرار بعض الأحكام",
    bodyAr: `تبقى نافذة وملزمة للطرفين بعد انتهاء أو إنهاء هذا العقد جميع الأحكام التي يقتضي بطبيعتها أو بنصها الصريح استمرار نفاذها، وعلى الأخص الأحكام المتعلقة بالسرية وعدم الإفصاح، وحقوق الملكية الفكرية وحقوق الاستخدام، والالتزامات المالية المستحقة، وتسوية المنازعات، وأي أحكام أخرى يقضي هذا العقد أو القانون باستمرارها بعد انتهائه.`,
  },
  visual_identity_design_source_section_20: {
    titleAr: "تاسعًا: الملاحق",
    bodyAr: `إذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_21: {
    titleAr: "المادة الرابعة عشرة: القوة القاهرة والظروف الطارئة",
    bodyAr: `يقصد بالقوة القاهرة كل حادث استثنائي عام، خارج عن إرادة الطرف المتأثر، لم يكن متوقعًا عند إبرام هذا العقد، ولا يمكن دفعه أو تلافي آثاره بوسائل معقولة، ويترتب عليه استحالة تنفيذ الالتزام كليًا أو جزئيًا، بصورة مؤقتة أو نهائية، وذلك وفقًا لأحكام القانون.
ويقصد بالظروف الطارئة كل حادث استثنائي عام لم يكن في الوسع توقعه عند إبرام العقد، ويجعل تنفيذ الالتزام ممكنًا ولكن مرهقًا إرهاقًا جسيمًا للطرف الملتزم، دون أن يصل إلى حد الاستحالة، وذلك وفقًا للقواعد القانونية المنظمة لذلك.
لا يُعد من قبيل القوة القاهرة أو الظروف الطارئة أي سبب يرجع إلى خطأ أو إهمال أو تقصير من الطرف المتمسك بها، أو إلى عدم اتخاذه الإجراءات المعقولة لتجنب آثارها أو الحد منها.
تشمل القوة القاهرة أو الظروف الطارئة - بحسب طبيعة الواقعة ومدى تأثيرها الفعلي - كل حدث عام خارج عن إرادة الطرف المتأثر، ومن ذلك على سبيل المثال لا الحصر: الكوارث الطبيعية، الأوبئة، الحروب أو الاضطرابات العامة، القرارات أو الإجراءات الحكومية المؤثرة بصورة مباشرة على تنفيذ العقد، الأعطال العامة واسعة النطاق في خدمات الاتصالات أو الخدمات الرقمية أو التقنية اللازمة للتنفيذ، أو أي أحداث استثنائية أخرى تجعل تنفيذ الالتزامات متعذرًا أو مرهقًا بصورة غير معتادة.
ولا تشمل القوة القاهرة أو الظروف الطارئة بوجه خاص: 1. نقص الموظفين أو المتعاونين أو سوء الإدارة أو ضعف التخطيط. 2. الأخطاء الناتجة عن الإهمال أو مخالفة الأصول المهنية. 3. تأخر أي طرف في تقديم البيانات أو المستندات أو الموافقات أو المتطلبات اللازمة للتنفيذ. 4. التعثر المالي أو انخفاض الأرباح أو تغير الظروف التجارية المعتادة. 5. الزيادات المعتادة في تكاليف التشغيل أو الأدوات أو الخدمات. 6. أي توقف ناتج عن مخالفة القوانين أو شروط استخدام الخدمات المقدمة من الغير.
يلتزم الطرف الذي يتمسك بالقوة القاهرة أو الظروف الطارئة بإخطار الطرف الآخر كتابةً أو عبر وسيلة الاتصال المعتمدة بينهما خلال مدة مناسبة من تاريخ علمه بالواقعة، مع بيان طبيعتها ومدى تأثيرها المتوقع على تنفيذ الالتزامات، وتقديم ما يتوافر لديه من مستندات أو بيانات مؤيدة متى كان ذلك ممكنًا.
يلتزم الطرف المتأثر باتخاذ الإجراءات المعقولة للحد من آثار الواقعة واستئناف تنفيذ التزاماته فور زوال السبب أو إمكانية التنفيذ، ولا يستفيد من أحكام هذه المادة إلا في الحدود التي تعذر فيها التنفيذ رغم اتخاذ تلك الإجراءات.
إذا ترتب على القوة القاهرة توقف تنفيذ أحد الالتزامات المتأثرة بصورة مؤقتة، تُعلق تلك الالتزامات طوال مدة استمرار السبب، وتمتد المدد التعاقدية بالقدر الذي يتناسب مع مدة التأثير الفعلي، دون ترتيب مسؤولية أو جزاءات عن هذا التأخير.
إذا استمرت القوة القاهرة لمدة تجعل تنفيذ العقد مستحيلًا أو تفقده الغرض الأساسي الذي أُبرم من أجله، جاز لأي من الطرفين إنهاء العقد بإخطار كتابي للطرف الآخر، مع تسوية الحقوق والالتزامات الناشئة عن الأعمال التي تم تنفيذها حتى تاريخ الإنهاء، ولا يؤثر ذلك على استحقاق المقابل المالي عن الأعمال المنفذة قبل تحقق سبب القوة القاهرة.
إذا ترتب على الظروف الطارئة إخلال جسيم بالتوازن الاقتصادي للعقد، جاز لأي من الطرفين طلب إعادة التفاوض بحسن نية بشأن تعديل بعض الالتزامات أو المدد أو المقابل المالي بما يحقق إعادة التوازن العقدي، وذلك دون أن يترتب على مجرد طلب إعادة التفاوض وقف تنفيذ الالتزامات أو التحلل منها، ما لم يتفق الطرفان كتابةً على خلاف ذلك أو يقضي القانون بغيره.
وإذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_24: {
    titleAr: "المادة السابعة عشرة: القانون الواجب التطبيق وتسوية المنازعات",
    bodyAr: `أولًا: القانون الواجب التطبيق: يخضع هذا العقد في إبرامه وتفسيره وتنفيذه وإنهائه، وجميع ما ينشأ عنه أو يرتبط به من حقوق أو التزامات أو منازعات، لأحكام القوانين السارية في جمهورية مصر العربية، ويُفسر وفقًا لها، وعلى الأخص أحكام القانون المدني المصري، وقانون الإثبات، وقانون تنظيم التوقيع الإلكتروني وإنشاء هيئة تنمية صناعة تكنولوجيا المعلومات، وقانون حماية حقوق الملكية الفكرية، وقانون حماية البيانات الشخصية - متى كان واجب التطبيق - وغيرها من التشريعات ذات الصلة، وذلك فيما لم يرد بشأنه نص خاص في هذا العقد.
ويظل القانون المصري هو القانون الواجب التطبيق ولو كان أحد الطرفين غير مصري، أو تم تنفيذ جزء من الخدمات خارج جمهورية مصر العربية، ما لم يوجب القانون أو يتفق الطرفان كتابةً، وفي الحدود التي يجيزها القانون، على خلاف ذلك.`,
  },
  visual_identity_design_source_section_27: {
    titleAr: "سادسًا: الملاحق",
    bodyAr: `إذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_28: {
    titleAr: "المادة الثامنة عشرة: التوقيعات",
    bodyAr: `حُرر هذا العقد من نسختين أصليتين باللغة العربية، تسلم كل طرف نسخة للعمل بموجبها، ويجوز تحرير أو تبادل نسخ إضافية أو إلكترونية منه بالوسائل التي يتفق عليها الطرفان، وذلك في الحدود التي يجيزها القانون.
يقر الطرفان بأنهما قد قرآ جميع أحكام هذا العقد وفهما مضمونه وآثاره القانونية، وأن قبولهما له قد تم بإرادتهما الحرة دون غش أو تدليس أو إكراه، وبعد الاطلاع على كافة البيانات والمستندات والملاحق — إن وجدت — المرتبطة به.
يقر كل طرف بصحة البيانات والمعلومات والمستندات التي قدمها للطرف الآخر، ويتحمل مسؤولية صحتها، كما يقر بأن توقيعه على هذا العقد يُعد قبولًا نهائيًا بجميع أحكامه والتزامًا بتنفيذ ما ورد به.
وتُعد التوقيعات الواردة في قسم التوقيعات جزءًا لا يتجزأ من هذا العقد، ويُعمل بها لإثبات موافقة الطرفين على جميع أحكامه.`,
  },
};


const reviewedIdentityAnnexClauseOverrides: Record<string, Pick<LegalClauseDefinition, "titleAr" | "bodyAr">> = {
  visual_identity_scope_annex_source_preface: {
    titleAr: "تمهيد ملحق نطاق العمل والمخرجات الفنية",
    bodyAr: `يلحق هذا الملحق بعقد تصميم الهوية البصرية ("العقد") المبرم بين الطرفين، ويُعد جزءًا لا يتجزأ من العقد، ومكمّلًا ومفسرًا له، وتسري عليه جميع أحكامه فيما لم يرد بشأنه نص خاص في هذا الملحق.
ويهدف هذا الملحق إلى تحديد نطاق الخدمات والمخرجات الفنية والمواصفات التنفيذية والجدول الزمني والبيانات الخاصة بالمشروع محل العقد.
وفي حال وجود أي تعارض بين البيانات أو المواصفات الواردة في هذا الملحق وبين الوصف العام الوارد بالعقد، تكون الأولوية لما ورد في هذا الملحق باعتباره البيان التنفيذي التفصيلي للمشروع، وذلك دون الإخلال بالأحكام الأساسية للعقد.`,
  },
  visual_identity_scope_annex_source_section_02: {
    titleAr: "المادة الأولى: بيانات المشروع",
    bodyAr: `ويُعد الشخص المعتمد من الطرف الأول لاعتماد الأعمال — متى تم تحديده في البيانات المخصصة بهذا الملحق — ممثلًا للطرف الأول في اعتماد الأعمال وإبداء الملاحظات وإصدار التعليمات المتعلقة بالمشروع، وذلك في حدود التفويض الممنوح له، وتكون جميع الموافقات أو الملاحظات أو الاعتمادات الصادرة عنه ملزمة للطرف الأول، ما لم يخطر الطرف الثاني كتابةً بتغييره.`,
  },
  visual_identity_scope_annex_source_section_03: {
    titleAr: "المادة الثانية: نطاق الخدمات",
    bodyAr: `يقتصر نطاق الخدمات محل هذا المشروع على الخدمات التي يتم تحديدها بعلامة (✓) في هذا الملحق، ولا يلتزم الطرف الثاني بتنفيذ أي خدمة أخرى لم يتم تحديدها صراحةً أو الاتفاق عليها كتابةً بين الطرفين.
ولا تمتد الخدمات المشمولة إلى أي أعمال إضافية أو تطويرات مستقبلية أو خدمات لاحقة، إلا إذا تم الاتفاق عليها كتابةً بين الطرفين.
ولا تُعد المقترحات أو الأفكار الأولية أو المناقشات أو الاستشارات أو الرسومات المبدئية أو النماذج التجريبية أو المراسلات المتبادلة جزءًا من نطاق الخدمات، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
ولا تُعد أي خدمة أو مخرج أو التزام أو خيار أو بيان مشمولًا بهذا الملحق إلا إذا تم تحديده أو التأشير عليه أو إثباته بصورة واضحة، وفي حال ترك أي خانة أو خيار دون تعبئة أو تحديد، عُد غير مشمول بنطاق العمل، ما لم يثبت اتفاق الطرفين كتابةً على خلاف ذلك.`,
  },
  visual_identity_scope_annex_source_section_04: {
    titleAr: "المادة الثالثة: المخرجات والمقابل المالي",
    bodyAr: `يلتزم الطرف الثاني بتسليم المخرجات المحددة في جدول هذا الملحق فقط، وذلك وفقًا لما يتم الاتفاق عليه بين الطرفين.
ويقصد بعدد التصميمات النهائية عدد الأعمال النهائية المختلفة التي يلتزم الطرف الثاني بتسليمها، ولا يشمل ذلك اختلافات الألوان أو الأحجام أو الاتجاهات أو الامتدادات أو طرق الحفظ أو التصدير الخاصة بالمخرج ذاته، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
وتُعد جميع الأعمال أو المخرجات أو النماذج أو المقترحات أو الرسومات أو الأفكار التي لم يتفق على تسليمها أو لم تعتمد أو لم تدخل ضمن الجدول خارج نطاق التزام الطرف الثاني.
وتمثل القيم المالية المبينة في هذا الملحق — متى تم تحديدها — توزيعًا أو تفصيلًا للمقابل المالي المنصوص عليه في العقد، ولا يجوز تعديلها إلا باتفاق مكتوب بين الطرفين.
وإذا لم تُحدد قيمة مستقلة لأي بند من البنود المبينة في الجدول، اعتبر هذا البند داخلًا ضمن المقابل المالي الإجمالي المتفق عليه في العقد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
ولا يجوز للطرف الأول المطالبة بأي مخرج أو زيادة في الكميات أو إضافة أعمال جديدة تتجاوز ما هو محدد في هذا الملحق إلا بعد اتفاق الطرفين كتابةً على نطاق الأعمال الإضافية والمقابل المالي ومدة التنفيذ المترتبة عليها.`,
  },
  visual_identity_scope_annex_source_section_05: {
    titleAr: "المادة الرابعة: المراجعات والاعتماد",
    bodyAr: `يحق للطرف الأول طلب إجراء المراجعات أو التعديلات على الأعمال محل هذا المشروع في حدود عدد جولات المراجعة المتفق عليها في هذا الملحق، وذلك خلال مراحل التنفيذ أو خلال مدة المراجعة المقررة لكل مرحلة، وفقًا لأحكام العقد وهذا الملحق.
ويقصد بجولة المراجعة قائمة واحدة مجمعة وواضحة من جميع الملاحظات أو التعديلات الخاصة بالمرحلة محل المراجعة، يرسلها الطرف الأول دفعة واحدة خلال مدة المراجعة المحددة، بما يتيح للطرف الثاني تنفيذها بصورة منظمة.
ولا تُعد الرسائل أو الملاحظات أو الطلبات المتفرقة أو المتتابعة أو المرسلة في أوقات مختلفة جزءًا من الجولة ذاتها، ويجوز للطرف الثاني اعتبارها جولة مراجعة جديدة أو أعمالًا إضافية بحسب طبيعتها، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
ويلتزم الطرف الأول بإرسال قائمة الملاحظات الخاصة بكل جولة مراجعة خلال مدة المراجعة المحددة في هذا الملحق من تاريخ تسلمه المرحلة محل المراجعة.
وتُرسل الملاحظات عبر إحدى وسائل التواصل المعتمدة بين الطرفين وفقًا لأحكام العقد، ويجب أن تكون واضحة ومحددة وقابلة للتنفيذ، ويجوز للطرف الثاني طلب توضيح أي ملاحظة يكتنفها الغموض قبل البدء في تنفيذها.
فإذا انقضت مدة المراجعة دون أن يتلقى الطرف الثاني أي ملاحظات أو اعتراضات من الطرف الأول، عُدت المرحلة معتمدة ضمنيًا، ويجوز للطرف الثاني الانتقال إلى المرحلة التالية أو اعتماد الأعمال في حدود تلك المرحلة، وذلك دون الإخلال بأي حقوق أخرى مقررة بموجب العقد.
ولا تشمل جولات المراجعة أو التعديلات إعادة تصميم المشروع بالكامل، أو تغيير الفكرة أو الاتجاه الإبداعي بعد اعتماده، أو تغيير الهوية أو الأسلوب الفني المتفق عليه، أو إضافة خدمات أو مخرجات جديدة، أو زيادة عدد الأعمال أو الكميات المتفق عليها، أو أي أعمال تخرج عن نطاق العقد أو هذا الملحق.
وإذا طلب الطرف الأول أعمالًا أو تعديلات يترتب عليها تغيير جوهري في نطاق المشروع أو زيادة حجم الأعمال أو مدة التنفيذ أو المقابل المالي، فلا يلتزم الطرف الثاني بتنفيذها إلا بعد اتفاق الطرفين كتابةً على نطاقها وآثارها المالية والزمنية.
ويُعد اعتماد الطرف الأول لأي مرحلة أو لأي مخرج نهائي موافقة نهائية على الجزء المعتمد، ولا يلتزم الطرف الثاني بإجراء أي تعديلات جوهرية عليه بعد ذلك إلا باتفاق مكتوب بين الطرفين.`,
  },
  visual_identity_scope_annex_source_section_06: {
    titleAr: "المادة الخامسة: التسليم والملفات المصدرية",
    bodyAr: `يلتزم الطرف الثاني بتسليم المخرجات النهائية المتفق عليها وفقًا للصيغ المحددة بعلامة (✓) في هذا الملحق، وبالوسيلة المتفق عليها بين الطرفين.
ويقصد بصيغ الملفات النهائية الملفات الجاهزة للاستخدام أو الطباعة أو النشر أو العرض، ولا يترتب على اختيار أي منها التزام الطرف الثاني بتسليم ملفات العمل المفتوحة أو الملفات المصدرية، إلا وفقًا لأحكام هذه المادة.
والأصل أن الملفات المصدرية وملفات العمل المفتوحة غير مشمولة ضمن المقابل المالي الأساسي للعقد، ولا يلتزم الطرف الثاني بتسليمها إلا إذا تم الاتفاق عليها صراحةً في هذا الملحق أو بموجب اتفاق مكتوب لاحق بين الطرفين.
ويُحسب موعد تسليم الملفات المصدرية بصورة مستقلة عن مدة تنفيذ المشروع المنصوص عليها بالعقد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
ولا يترتب على تسليم الملفات المصدرية انتقال أي حق من حقوق الملكية الفكرية أو منح أي ترخيص يتجاوز ما هو مقرر بموجب العقد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
ويتم تسليم الأعمال بإحدى أو كل الوسائل المحددة بعلامة (✓) في هذا الملحق أو غيرها مما يتفق عليه الطرفان، ويُعتد بالتسليم الإلكتروني متى تم عبر الوسيلة المعتمدة بينهما، ويُعد تاريخ إرسال الملفات أو إتاحتها للطرف الأول هو تاريخ التسليم، ما لم يثبت خلاف ذلك.
ويُعد كل تسليم مرحلي أو نهائي منتجًا لآثاره في حدود الجزء الذي يشمله، ويخضع لأحكام المراجعة والاعتماد المنصوص عليها في هذا الملحق والعقد.
ولا يلتزم الطرف الثاني بالاحتفاظ بنسخ المشروع أو الملفات أو روابط التحميل أو إتاحتها للطرف الأول لمدة غير محددة بعد التسليم، ويجوز للطرفين الاتفاق كتابةً على مدة الاحتفاظ أو خدمة الأرشفة أو إعادة الإرسال، وما يقابلها من مقابل مالي — إن وجد.`,
  },
  visual_identity_scope_annex_source_section_07: {
    titleAr: "المادة السادسة: العناصر المقدمة من الطرف الأول والتراخيص والخدمات المقدمة من الغير",
    bodyAr: `يلتزم الطرف الأول بتقديم جميع البيانات والمعلومات والمحتوى والملفات والعناصر اللازمة لتنفيذ المشروع، وذلك بالمواصفات والجودة المناسبة وفي المواعيد المتفق عليها، ويتحمل مسؤولية صحتها ودقتها ومشروعية استخدامها.
ويلتزم الطرف الأول بأن تكون جميع الصور والمواد البصرية صالحة للاستخدام وفقًا لطبيعة المشروع، وأن تكون النصوص والمحتوى نهائية ومدققة قبل اعتمادها للتصميم، ويتحمل وحده مسؤولية أي أخطاء أو تأخير أو تكاليف إضافية تنشأ بسبب عدم اكتمالها أو عدم صلاحيتها أو عدم مشروعيتها.
وإذا استلزم تنفيذ المشروع استخدام أي خطوط أو صور أو عناصر تصميمية أو اشتراكات أو تراخيص أو خدمات مقدمة من الغير، فيتم بيانها في الجدول المخصص بهذا الملحق.
وفي حال اختيار تحمل التكلفة بصورة مشتركة، تُحدد نسبة مساهمة كل طرف في هذا الملحق، فإذا لم تُحدد النسبة صراحةً اعتُبرت مناصفةً بنسبة (50%) لكل طرف.
وتظل جميع الخطوط والصور والعناصر التصميمية والاشتراكات والتراخيص والخدمات المقدمة من الغير خاضعة لشروط وأحكام الجهات المالكة أو المرخصة لها، ولا يترتب على هذا العقد أو هذا الملحق انتقال أي حقوق تتجاوز حدود تلك التراخيص.`,
  },
  visual_identity_scope_annex_source_section_08: {
    titleAr: "المادة السابعة: الجدول الزمني للمشروع وبيانات الملحق",
    bodyAr: `تُنفذ مراحل المشروع وفقًا للجدول الزمني المحدد في هذا الملحق، مع مراعاة أحكام مدة التنفيذ الواردة في العقد.
وتُحسب المدد المبينة في هذا الجدول وفقًا لأحكام العقد، وتمتد تلقائيًا في الحالات التي يجيز فيها العقد ذلك، وعلى الأخص عند تأخر الطرف الأول في تقديم البيانات أو المواد أو الاعتمادات أو الردود، أو عند تعليق التنفيذ، أو في حالات القوة القاهرة أو الظروف الطارئة، أو عند الاتفاق على تنفيذ أعمال إضافية أو إجراء تعديلات جوهرية.
ولا يبدأ احتساب أي مدة تنفيذ أو مراجعة أو اعتماد إلا من تاريخ استيفاء المتطلبات الخاصة بالمرحلة محل التنفيذ، وذلك وفقًا لأحكام العقد.
ويُعد هذا الملحق المرجع التنفيذي للمشروع محل العقد، ويحل محل أي مواصفات أو بيانات أو جداول أو مخرجات أو نطاق عمل سابق يتعلق بذات المشروع، وذلك في حدود ما ورد به.
ولا يجوز تعديل أي حكم أو بيان أو جدول أو مواصفة واردة في هذا الملحق إلا بموجب اتفاق مكتوب وموقع من الطرفين.
ويُعتد بأحدث ملحق أو تعديل أو جدول أو بيان موقع من الطرفين عند تعدد الملاحق أو التعديلات الخاصة بالمشروع، وذلك في حدود الموضوع الذي يتناوله كل منها.
وفيما لم يرد بشأنه نص خاص في هذا الملحق، تُطبق أحكام العقد، وتظل جميع أحكامه نافذة ومكملة لهذا الملحق.
ويقر الطرفان عند توقيع الملحق بأنهما قد اطلعا على جميع بياناته وفهما مضمونه وآثاره، وأن جميع البيانات والاختيارات والجداول المحددة به تعبر عن إرادتهما واتفاقهما النهائي بشأن نطاق العمل والمخرجات الفنية للمشروع.`,
  },

  visual_identity_financial_annex_source_preface: {
    titleAr: "تمهيد ملحق المقابل المالي وآلية السداد وخطة التنفيذ",
    bodyAr: `يرتبط هذا الملحق بعقد تصميم الهوية البصرية المبرم بين الطرفين، ويُعد جزءًا لا يتجزأ منه ومكملًا ومفسرًا لأحكامه، ويُعمل به في الحدود التي ينظمها، وتظل باقي أحكام العقد الأصلي سارية فيما لم يرد بشأنه نص خاص في هذا الملحق.`,
  },
  visual_identity_financial_annex_source_section_02: {
    titleAr: "المادة الأولى: المقابل المالي",
    bodyAr: `اتفق الطرفان على أن يكون إجمالي المقابل المالي المستحق للطرف الثاني مقابل تنفيذ الخدمات محل العقد وملحقاته هو المبلغ والعملة المحددان في البيانات المخصصة بهذا الملحق.
ويمثل هذا المبلغ إجمالي المقابل المالي المستحق عن جميع الخدمات والمخرجات الداخلة ضمن نطاق العقد وملحقاته، ولا يشمل أي أعمال أو خدمات أو تعديلات إضافية لم يتفق عليها الطرفان كتابةً.
وفي حال الاتفاق على السداد بعملة أجنبية، يتم السداد بذات العملة أو بما يعادلها بالعملة المحلية وفقًا لسعر الصرف الذي يتفق عليه الطرفان كتابةً، أو وفقًا لسعر الصرف المعلن من الجهة المصرفية أو المالية المعتمدة في تاريخ السداد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
  },
  visual_identity_financial_annex_source_section_03: {
    titleAr: "المادة الثانية: جدول الدفعات",
    bodyAr: `يتم سداد المقابل المالي وفقًا لجدول الدفعات المبين في هذا الملحق.
ويجب أن يساوي مجموع نسب الدفعات (100%)، وأن يساوي مجموع قيمها إجمالي المقابل المالي المبين بالمادة الأولى من هذا الملحق، وإلا عُد جدول الدفعات غير مكتمل لحين استيفائه أو تصحيحه كتابةً واعتماده من الطرفين، ويجوز للطرفين إضافة أو حذف دفعات أو تعديل مواعيد استحقاقها بموجب اتفاق مكتوب وموقع منهما.`,
  },
  visual_identity_financial_annex_source_section_04: {
    titleAr: "المادة الثالثة: وسائل السداد وإثبات الوفاء",
    bodyAr: `يجوز سداد المقابل المالي بإحدى أو كل وسائل السداد المحددة في هذا الملحق أو بأي وسيلة أخرى يتفق عليها الطرفان.
ويُعد إيصال السداد أو إشعار التحويل أو كشف الحساب البنكي أو إشعار الدفع الإلكتروني أو أي وسيلة إثبات أخرى مقبولة قانونًا دليلًا على الوفاء بالمبلغ المسدد.
وفي حال استخدام وسيلة دفع إلكترونية، يُعتد بتاريخ قيد المبلغ فعليًا بالحساب أو الوسيلة المتفق عليها، أو بتاريخ تأكيد عملية الدفع من الجهة المالية المختصة، بحسب الأحوال، وذلك ما لم يتفق الطرفان كتابةً على خلاف ذلك.
وإذا كانت وسيلة السداد المختارة لا تدعم العملة المحددة بالمادة الأولى، يلتزم الطرفان باستخدام وسيلة سداد أخرى تحقق ذات الغرض، دون أن يؤثر ذلك على استحقاق الدفعات أو مواعيدها.`,
  },
  visual_identity_financial_annex_source_section_05: {
    titleAr: "المادة الرابعة: شروط بدء التنفيذ",
    bodyAr: `لا يلتزم الطرف الثاني ببدء تنفيذ الأعمال إلا بعد تحقق الشروط التي يحددها الطرفان بعلامة (✓) في هذا الملحق.
ولا يُعتد إلا بالشروط التي تم تحديدها بعلامة (✓)، وتُعد الشروط غير المحددة غير مشترطة لبدء التنفيذ.
وتبدأ مدة التنفيذ اعتبارًا من تاريخ تحقق آخر شرط من الشروط المحددة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
  },
  visual_identity_financial_annex_source_section_06: {
    titleAr: "المادة الخامسة: الأعمال غير المشمولة بالمقابل المالي",
    bodyAr: `لا تدخل الأعمال أو الخدمات المحددة في هذا الملحق باعتبارها غير مشمولة ضمن المقابل المالي المتفق عليه، إلا إذا تم الاتفاق عليها كتابةً.
ولا يلتزم الطرف الثاني بتنفيذ أي من تلك الأعمال إلا بعد اتفاق الطرفين كتابةً على نطاقها والمقابل المالي المستحق عنها وأثرها على مدة التنفيذ، إن وجد.`,
  },
  visual_identity_financial_annex_source_section_07: {
    titleAr: "المادة السادسة: التأخر في السداد وآثاره",
    bodyAr: `يلتزم الطرف الأول بسداد جميع الدفعات المستحقة في المواعيد المحددة بهذا الملحق أو وفقًا لما يتفق عليه الطرفان كتابةً.
وإذا تأخر الطرف الأول عن سداد أي مبلغ مستحق، جاز للطرف الثاني، بعد إخطاره وفقًا لأحكام الإخطارات والمراسلات الواردة بالعقد، تعليق تنفيذ الأعمال كليًا أو جزئيًا، أو الامتناع عن البدء في تنفيذها، أو وقف تسليم أي مرحلة أو مخرج أو ملف مستحق التسليم حتى تمام السداد، وذلك دون أن يُعد هذا التعليق إخلالًا من جانبه بالتزاماته التعاقدية.
ولا يخل تعليق التنفيذ بحق الطرفين في الاتفاق على إعادة جدولة الدفعات أو منح مهلة إضافية أو تعديل مواعيد السداد كتابةً.`,
  },
  visual_identity_financial_annex_source_section_08: {
    titleAr: "المادة السابعة: آثار تعليق التنفيذ بسبب التأخر في السداد",
    bodyAr: `إذا عُلّق تنفيذ المشروع بسبب تأخر الطرف الأول في الوفاء بالتزاماته المالية، ترتبت الآثار الآتية:
• تمتد مدة التنفيذ والجدول الزمني للمشروع تلقائيًا بما يعادل مدة التعليق الفعلية.
• يضاف إلى مدة التنفيذ الوقت اللازم لإعادة تنظيم جدول الأعمال واستئناف التنفيذ، على ألا تجاوز مدة إعادة الاستئناف خمسة (5) أيام عمل من تاريخ زوال سبب التعليق، ما لم تستلزم طبيعة المشروع أو حجم الأعمال مدة أطول يتفق عليها الطرفان كتابةً.
• لا يُسأل الطرف الثاني عن أي تأخير في مواعيد التسليم يكون سببه المباشر أو غير المباشر تعليق التنفيذ وفقًا لأحكام هذا الملحق أو العقد الأصلي.
• لا يترتب على تعليق التنفيذ سقوط أي حق مالي للطرف الثاني أو تعديل المقابل المالي أو المدد التعاقدية، ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
  },
  visual_identity_financial_annex_source_section_09: {
    titleAr: "المادة الثامنة: تعليق المشروع",
    bodyAr: `يجوز للطرف الثاني تعليق تنفيذ المشروع كليًا أو جزئيًا في أي من الحالات التي يتم تحديدها بعلامة (✓) في هذا الملحق أو يتحقق سببها.
ويبدأ التعليق من تاريخ تحقق سببه أو من التاريخ المحدد في الإخطار الموجه للطرف الآخر، بحسب الأحوال.
ولا تدخل مدة التعليق ضمن مدة التنفيذ أو الجدول الزمني للمشروع.
وإذا استمر التعليق بسبب يرجع إلى الطرف الأول لمدة تجاوز ثلاثين (30) يومًا متصلة، جاز للطرف الثاني إنهاء العقد وإجراء التسوية النهائية للحقوق والالتزامات المالية وفقًا لأحكام العقد، وذلك بعد إخطار الطرف الأول.
ولا يخل الحكم السابق بحق الطرف الأول في مباشرة حقوقه المقررة بالعقد إذا كان سبب التعليق أو التأخير أو عدم استئناف التنفيذ راجعًا إلى الطرف الثاني، وذلك وفقًا لأحكام إنهاء العقد والفسخ الواردة بالعقد الأصلي.`,
  },
  visual_identity_financial_annex_source_section_10: {
    titleAr: "المادة التاسعة: استئناف التنفيذ",
    bodyAr: `يستأنف تنفيذ المشروع بعد زوال سبب التعليق واستيفاء جميع المتطلبات اللازمة لاستكمال التنفيذ.
ويلتزم الطرف الثاني باستئناف الأعمال خلال مدة لا تجاوز خمسة (5) أيام عمل من تاريخ تحقق جميع شروط الاستئناف، ما لم يتفق الطرفان كتابةً على مدة أخرى أو تستلزم طبيعة المشروع مدة أطول بصورة مبررة.
ولا يترتب على استئناف التنفيذ إسقاط أي حق أو مطالبة أو جزاء أو تعويض نشأ لأي من الطرفين قبل تاريخ الاستئناف.`,
  },
  visual_identity_financial_annex_source_section_11: {
    titleAr: "المادة العاشرة: التسوية المالية",
    bodyAr: `عند انتهاء المشروع أو إنهاء العقد لأي سبب، تتم التسوية المالية بين الطرفين وفقًا لأحكام العقد، وعلى الأخص ما يأتي:
• يستحق الطرف الثاني قيمة جميع الأعمال والخدمات والمراحل التي تم تنفيذها حتى تاريخ انتهاء أو إنهاء العقد.
• تخصم من تلك المستحقات جميع المبالغ التي سبق للطرف الأول سدادها عن ذات الأعمال.
• إذا كان الطرف الأول قد سدد مبالغ عن أعمال أو مراحل لم يبدأ تنفيذها أو لم تستحق بعد، فتتم تسوية تلك المبالغ وفقًا لما تم تنفيذه فعليًا أو وفقًا لما يتفق عليه الطرفان كتابةً.
• لا يلتزم الطرف الثاني بتسليم أي أعمال أو مخرجات أو ملفات أو حقوق لم تصبح مستحقة التسليم أو لم يتم الوفاء بالمستحقات المالية المتعلقة بها، وذلك دون الإخلال بأي حق آخر يقرره العقد أو القانون.`,
  },
  visual_identity_financial_annex_source_section_12: {
    titleAr: "المادة الحادية عشرة: أحكام خاصة بهذا الملحق",
    bodyAr: `يُعد هذا الملحق جزءًا لا يتجزأ من العقد الأصلي، ويُفسر ويُطبق معه باعتباره مكملًا ومفصلًا للأحكام المتعلقة بالمقابل المالي وآلية السداد وخطة التنفيذ.
وفي حال وجود أكثر من نسخة تحمل الرقم ذاته، تكون الأولوية للنسخة الأحدث تاريخًا والموقعة من الطرفين صراحةً على أنها تحل محل النسخة السابقة، وذلك دون الإخلال بالحقوق التي نشأت قبل اعتماد النسخة الجديدة.
ويجب أن يتطابق تاريخ هذا الملحق مع تاريخ العقد الأصلي أو يكون لاحقًا له، كما يجب أن تتطابق بيانات أطراف العقد والبيانات الجوهرية الواردة فيه مع البيانات الواردة بالعقد الأصلي، وأي اختلاف جوهري لا يكون منتجًا لأثره إلا إذا تم بموجب اتفاق مكتوب وموقع من الطرفين.
ولا يجوز تعديل أي مبلغ أو نسبة أو جدول أو موعد أو بيان وارد بهذا الملحق إلا بموجب اتفاق مكتوب وموقع من الطرفين.
وإذا تُرك أي حقل أو خانة أو جدول بهذا الملحق دون استكمال أو تحديد، فلا يُفترض أي بيان أو التزام بشأنه، ويُرجع في تفسيره إلى أحكام العقد الأصلي أو إلى ما يتفق عليه الطرفان كتابةً، بحسب الأحوال.`,
  },
  visual_identity_financial_annex_source_section_13: {
    titleAr: "المادة الثانية عشرة: التوقيعات",
    bodyAr: `يقر الطرفان بأنهما اطلعا على جميع أحكام هذا الملحق وفهما مضمونه وآثاره القانونية، وأنهما وافقا عليه بإرادتهما الحرة، ويُعد توقيعهما عليه قبولًا نهائيًا لجميع ما ورد به، ويصبح هذا الملحق جزءًا لا يتجزأ من العقد الأصلي اعتبارًا من تاريخ توقيعه.`,
  },

  visual_identity_approvals_annex_source_preface: {
    titleAr: "تمهيد ملحق الاعتمادات وإدارة التنفيذ",
    bodyAr: `يرتبط هذا الملحق بعقد تصميم الهوية البصرية المبرم بين الطرفين، ويُعد جزءًا لا يتجزأ منه ومكملًا ومفسرًا لأحكامه، ويُقرأ ويُطبق بالاشتراك مع العقد الأصلي والملحقين رقمي (1) و(2).
ويقتصر الغرض من هذا الملحق على توثيق وإثبات إجراءات تنفيذ المشروع، واعتماد المراحل، وإثبات المراجعات، وطلبات التعديل، والقرارات التنفيذية، وسجل الاعتمادات أثناء سير المشروع، ولا ينشئ بذاته أي حق أو التزام أو تعديل في نطاق العمل أو المقابل المالي أو مدة التنفيذ أو انتقال حقوق الملكية الفكرية إلا إذا تم ذلك وفقًا للإجراءات والأحكام المنصوص عليها بالعقد وملحقاته.
وفي حال تحرير أكثر من إصدار لهذا الملحق، يُعتد بآخر إصدار موقع من الطرفين أو معتمد بالوسائل الإلكترونية المنصوص عليها بالعقد، وذلك في حدود البيانات التي تناولها بالتعديل أو الإضافة فقط، مع بقاء باقي البيانات السابقة صحيحة ونافذة فيما لم يرد بشأنه تعديل.`,
  },
  visual_identity_approvals_annex_source_section_02: {
    titleAr: "المادة الأولى: بيانات المشروع",
    bodyAr: `ولا يُعتد بأي اعتماد أو تعديل أو تعليمات أو ملاحظات أو طلبات تصدر من غير الشخص أو الجهة المخولة بالاعتماد، إلا إذا وافق عليها الطرف الثاني كتابةً، أو ثبت صدورها من ممثل يملك قانونًا أو تعاقدًا سلطة الاعتماد.`,
  },
  visual_identity_approvals_annex_source_section_03: {
    titleAr: "المادة الثانية: سجل اعتماد مراحل المشروع",
    bodyAr: `تُعتمد مراحل المشروع وفقًا للمراحل المحددة بملحق نطاق العمل (الملحق رقم 1)، ويُثبت اعتماد كل مرحلة في السجل المخصص بهذا الملحق.
ويُعد اعتماد المرحلة قبولًا لها في حدود الأعمال التي شملها الاعتماد فقط.
وإذا كانت حالة المرحلة «معتمدة مع ملاحظات»، فتقتصر الملاحظات على ما يُثبت بسجل جولات المراجعة الوارد بالمادة الثالثة، ولا يترتب على هذا الاعتماد إعادة فتح المرحلة فيما يجاوز تلك الملاحظات.
أما إذا كانت حالة المرحلة «غير معتمدة»، فلا يبدأ تنفيذ المرحلة التالية إلا بعد إعادة تقديم المرحلة محل الاعتماد، أو باتفاق الطرفين كتابةً على خلاف ذلك، وذلك دون إخلال بأحكام المراجعات ومدد التنفيذ الواردة بالعقد والملحق رقم (1).`,
  },
  visual_identity_approvals_annex_source_section_04: {
    titleAr: "المادة الثالثة: سجل جوالات المراجعة",
    bodyAr: `تثبت جميع جولات المراجعة الخاصة بكل مرحلة وفقًا للبيانات المخصصة في هذا الملحق.
ويقصد بجولة المراجعة قائمة واحدة مجمعة وواضحة تتضمن جميع الملاحظات الخاصة بالمرحلة محل المراجعة، وترسل دفعة واحدة عبر وسيلة الاعتماد الرسمية المحددة بالعقد.
ولا تُعد الرسائل المتفرقة أو الملاحظات اللاحقة أو التعليقات الجديدة جولة مراجعة واحدة، ما لم يقبل الطرف الثاني كتابيًا احتسابها كذلك.
ويلتزم الطرف الأول بإرسال قائمة الملاحظات خلال المدة المحددة بملحق نطاق العمل (الملحق رقم 1)، ويُعد انقضاء تلك المدة دون إرسال الملاحظات اعتمادًا نهائيًا للمرحلة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
  },
  visual_identity_approvals_annex_source_section_05: {
    titleAr: "المادة الرابعة: سجل طلبات التعديل",
    bodyAr: `إذا طلب الطرف الأول تعديلًا أو خدمة إضافية أثناء تنفيذ المشروع، يثبت الطلب وفقًا للنموذج المخصص بهذا الملحق.
ويقتصر هذا النموذج على إثبات واقعة تقديم الطلب والقرار الصادر بشأنه.
أما إذا ترتب على الطلب تعديل نطاق العمل أو المقابل المالي أو مدة التنفيذ أو أي التزام تعاقدي آخر، فلا ينتج هذا الطلب أثره بمجرد إثباته بهذا الملحق، وإنما يجب إجراء التعديل وفقًا للإجراءات والأحكام المنصوص عليها بالعقد والملحق رقم (2)، ويظل هذا السجل مجرد وسيلة لإثبات الواقعة وتسلسلها الزمني.`,
  },
  visual_identity_approvals_annex_source_section_06: {
    titleAr: "المادة الخامسة: سجل القرارات والاعتمادات",
    bodyAr: `يخصص هذا السجل لإثبات جميع القرارات أو التعليمات أو الاعتمادات أو الموافقات أو التوجيهات التنفيذية الصادرة أثناء تنفيذ المشروع.
ويُعد هذا السجل المرجع الرسمي لجميع القرارات والتعليمات والاعتمادات المتعلقة بتنفيذ المشروع، ويُعتد بآخر قرار أو اعتماد ثابت به متى كان صادرًا أو معتمدًا وفقًا لأحكام العقد.
ولا يترتب على أي بيان أو قرار أو اعتماد مثبت بهذا السجل تعديل المقابل المالي أو مدة التنفيذ أو انتقال الحقوق أو تعديل نطاق العمل، إلا إذا تم ذلك صراحةً وفقًا للإجراءات والأحكام المنصوص عليها بالعقد والملحقين رقمي (1) و(2).`,
  },
  visual_identity_approvals_annex_source_section_07: {
    titleAr: "المادة السادسة: أحكام خاصة بهذا الجزء",
    bodyAr: `يُعد هذا الجزء سجلًا تنفيذيًا لتوثيق مراحل تنفيذ المشروع، ولا ينشئ بذاته أي حقوق أو التزامات جديدة تخلاف ما ورد بالعقد أو ملحقاته.
وتُفسر جميع البيانات والنماذج الواردة به في ضوء أحكام العقد الأصلي، وعلى الأخص الأحكام المتعلقة بنطاق العمل، والمراجعات، ومدد التنفيذ، والإخطارات، والأعمال الإضافية، والمقابل المالي.
وفي حال وجود تعارض يتعلق بطريقة إثبات أو توثيق أي إجراء تنفيذي، تُطبق أحكام هذا الملحق بوصفه السجل التنفيذي للمشروع، أما إذا تعلق التعارض بنطاق العمل أو المقابل المالي أو مدة التنفيذ أو انتقال الحقوق أو أي حكم موضوعي آخر، فتطبق الأحكام المنظمة لذلك بالعقد الأصلي والملحقين رقمي (1) و(2)، كل في نطاقه.
ولا يُعتد بأي اعتماد أو تعديل أو قرار أو طلب أو محضر أو بيان يرد بهذا الملحق ما لم يكن موقعًا من الطرفين، أو صادرًا أو معتمدًا بالوسائل الإلكترونية المتفق عليها في العقد، وفي الحدود التي يجيزها القانون.
كما لا يترتب على هذا الملحق إلغاء أو تعديل أي حكم من أحكام العقد أو الملحقين السابقين إلا بالقدر الذي يتم فيه التعديل صراحةً ووفقًا للإجراءات المنصوص عليها فيهما.`,
  },
  visual_identity_approvals_annex_source_section_08: {
    titleAr: "المادة السابعة: محضر اعتماد المرحلة",
    bodyAr: `يُحرر هذا المحضر عند انتهاء تنفيذ أي مرحلة من مراحل المشروع المحددة بالملحق رقم (1)، ويُستخدم لإثبات اعتماد المرحلة أو رفضها أو اعتمادها مع الملاحظات. وتُستكمل بيانات المرحلة والشخص الذي قام بالاعتماد في النموذج المخصص بهذا الملحق.`,
  },
  visual_identity_approvals_annex_source_section_09: {
    titleAr: "ثانيًا: حالة المرحلة",
    bodyAr: `تُحدد حالة المرحلة في النموذج بإحدى الحالات الآتية: معتمدة نهائيًا، أو معتمدة مع الملاحظات، أو غير معتمدة.`,
  },
  visual_identity_approvals_annex_source_section_10: {
    titleAr: "رابعًا: آثار الاعتماد",
    bodyAr: `إذا تم اعتماد المرحلة نهائيًا، أو اعتمادها مع الملاحظات، فيُعد ذلك قبولًا للأعمال التي شملها الاعتماد في حدود ما ورد بهذا المحضر فقط.
أما إذا كانت المرحلة «معتمدة مع ملاحظات»، فتقتصر المراجعات اللاحقة على الملاحظات المثبتة بهذا المحضر، ولا يجوز إضافة ملاحظات جديدة تتعلق بذات المرحلة إلا إذا وافق الطرف الثاني كتابةً.
أما إذا كانت المرحلة «غير معتمدة»، فتطبق عليها أحكام المراجعات المنصوص عليها بالعقد والملحق رقم (1)، ولا يبدأ تنفيذ المرحلة التالية إلا بعد إعادة تقديم المرحلة محل الاعتماد أو باتفاق الطرفين كتابةً على خلاف ذلك.
ولا يترتب على اعتماد المرحلة بذاته انتقال أي من حقوق الملكية الفكرية، أو استحقاق أي دفعة مالية، أو تعديل مدة التنفيذ، أو تعديل نطاق العمل، إلا إذا نص العقد أو الملحق رقم (2) أو هذا المحضر صراحةً على خلاف ذلك.`,
  },
  visual_identity_approvals_annex_source_section_11: {
    titleAr: "المادة الثامنة: محضر التسليم النهائي",
    bodyAr: `يُحرر هذا المحضر عند انتهاء المشروع بالكامل أو انتهاء الجزء المتفق على تسليمه، وتُستكمل بيانات المشروع والتسليم في النموذج المخصص بهذا الملحق.`,
  },
  visual_identity_approvals_annex_source_section_12: {
    titleAr: "ثانيًا: المخرجات المسلمة",
    bodyAr: `يُحدد في النموذج ما إذا كان التسليم يشمل جميع المخرجات المحددة بالملحق رقم (1)، أو تُبيّن المخرجات التي تم تسليمها على وجه التحديد.`,
  },
  visual_identity_approvals_annex_source_section_13: {
    titleAr: "ثالثًا: الملفات المسلمة",
    bodyAr: `تُحدد أنواع الملفات المسلمة بعلامة (✓) في النموذج المخصص بهذا الملحق، بما في ذلك الملفات الرقمية أو المصدرية أو رابط مستودع المشروع متى كان مشمولًا بالتسليم.`,
  },
  visual_identity_approvals_annex_source_section_14: {
    titleAr: "رابعًا: وسيلة التسليم",
    bodyAr: `تُحدد وسيلة أو وسائل التسليم المعتمدة بعلامة (✓) في النموذج المخصص بهذا الملحق.`,
  },
  visual_identity_approvals_annex_source_section_15: {
    titleAr: "خامسًا: إقرار الاستلام",
    bodyAr: `يقر الطرف الأول بأنه استلم المخرجات والملفات الموضحة بهذا المحضر بالحالة المتفق عليها، ويعد هذا المحضر قرينة على استلامها بالحالة الظاهرة وقت التسليم.
ولا يخل هذا الإقرار بحق الطرف الأول في التمسك بأي عيب خفي أو مخالفة جوهرية يثبت وجودها وفقًا لأحكام العقد أو القانون.
ولا يعد هذا المحضر بذاته دليلًا على انتقال حقوق الملكية الفكرية أو تسليم الملفات المصدرية أو منح أي ترخيص يتجاوز ما ورد بالعقد أو الملحقات المرتبطة به.`,
  },
  visual_identity_approvals_annex_source_section_16: {
    titleAr: "المادة التاسعة: محضر انتقال حقوق الملكية الفكرية أو منح الترخيص",
    bodyAr: `يُستخدم هذا المحضر لتوثيق الحقوق التي انتقلت إلى الطرف الأول أو التراخيص التي مُنحت له بعد تحقق الشروط المنصوص عليها بالعقد.
ولا تنتقل أي حقوق أو تراخيص قبل تحقق الشروط المقررة بالعقد. ويُحدد في النموذج شرط انتقال الحقوق ونوع الحق الموثق وفقًا لما تم الاتفاق عليه بالعقد أو بملحق مستقل.`,
  },
  visual_identity_approvals_annex_source_section_17: {
    titleAr: "ثالثًا: نطاق الحق والاستثناءات",
    bodyAr: `يُحدد بعلامة (✓) نطاق العناصر التي يشملها الحق أو الترخيص في النموذج المخصص بهذا الملحق.
ولا يشمل هذا المحضر أي حقوق أو عناصر أو ملفات أو تراخيص لم يشملها الاتفاق، وتُحدد الاستثناءات ذات الصلة بعلامة (✓) في النموذج.`,
  },
  visual_identity_approvals_annex_source_section_18: {
    titleAr: "المادة العاشرة: الأحكام العامة الخاصة بهذا الجزء",
    bodyAr: `يُعد هذا الجزء سجلًا تنفيذيًا للمشروع، ويهدف إلى توثيق جميع إجراءات الاعتماد والتسليم وانتقال الحقوق وغيرها من الوقائع التنفيذية التي تتم أثناء تنفيذ العقد.
ولا يجوز تعديل نطاق العمل أو المقابل المالي أو مدة التنفيذ أو انتقال الحقوق أو أي من الالتزامات الجوهرية الواردة بالعقد أو بالملحقين رقمي (1) و(2) من خلال أي نموذج من النماذج الواردة بهذا الملحق، إلا إذا تضمن النموذج اتفاقًا كتابيًا صريحًا موقعًا من الطرفين، أو تم اعتماده بالوسائل الإلكترونية المنصوص عليها بالعقد، وفي الحدود التي يجيزها القانون.
وتُعد النماذج الواردة بهذا الملحق وسائل لإثبات الوقائع التي دونت بها، ويجوز استخدامها ورقيًا أو إلكترونيًا أو من خلال المنصة الإلكترونية أو أي وسيلة تواصل معتمدة بين الطرفين وفقًا لأحكام الإخطارات والمراسلات الواردة بالعقد.
وتقتصر قواعد الأولوية الواردة في هذه المادة على النماذج والإجراءات التنفيذية المثبتة بهذا الملحق، ولا تمس قواعد الأولوية الخاصة بنطاق العمل أو المقابل المالي أو مدة التنفيذ أو غيرها من الأحكام الموضوعية المنظمة بالعقد أو بالملحقين رقمي (1) و(2).
وفي حال تحرير إصدار لاحق لهذا الملحق، يُعتد بآخر إصدار موقع من الطرفين أو معتمد بالوسائل الإلكترونية المنصوص عليها بالعقد، وذلك في حدود ما تضمنه من تعديل أو استكمال، مع بقاء جميع الوقائع والإجراءات السابقة صحيحة ومنتجة لآثارها فيما لم يرد بشأنه تعديل.
ويقر الطرفان عند توقيع الملحق بأن جميع البيانات والمحاضر والنماذج المثبتة به قد تمت مراجعتها واعتمادها، وأن توقيعهما أو اعتمادهما الإلكتروني عليها يُعد موافقة نهائية على ما ورد بها في حدود ما توثقه من وقائع وإجراءات، وذلك دون إخلال بأحكام العقد وملحقاته.`,
  },
};


const restoredWebsiteArticle11: LegalClauseDefinition = {
  key: "website_development_restored_section_11",
  titleAr: "المادة الحادية عشرة: تعديل نطاق العمل وإجراءات التعديل",
  sourceDocumentName: "مستعادة لضبط اتساق عقد برمجة ويب سيت.pdf بالاستناد إلى إحالاته واتفاقية التطويرات المستقبلية والأعمال الإضافية.pdf",
  bodyAr: `11-1 طلب التعديل: يقصد بطلب التعديل أي طلب بإضافة أو حذف أو تعديل في نطاق العمل أو المواصفات الفنية أو مدة التنفيذ أو المقابل المالي بعد بدء تنفيذ المشروع.
11-2 تقديم الطلب ودراسته: يقدم طلب التعديل كتابةً أو بإحدى وسائل الاتصال الإلكترونية المعتمدة، ويبين - بقدر الإمكان - وصف التعديل والغرض منه والمتطلبات المرتبطة به. وللطرف الثاني طلب البيانات أو الملفات أو الصلاحيات اللازمة لدراسة الطلب وتحديد أثره الفني والتنفيذي.
11-3 بيان أثر التعديل: قبل بدء تنفيذ أي تعديل خارج النطاق، يحدد الطرفان كتابةً نطاقه وأثره على المخرجات ومدة التنفيذ والمقابل المالي وآلية السداد والمتطلبات أو الخدمات المقدمة من الغير وأي شروط خاصة لازمة لتنفيذه.
11-4 الاعتماد: لا يصبح طلب التعديل ملزمًا لأي من الطرفين، ولا يعد جزءًا من نطاق العمل الأصلي، إلا بعد اعتماده كتابةً أو إلكترونيًا من الطرفين وفق وسائل الاعتماد المنصوص عليها في هذا العقد. ولا يُعد مجرد المناقشات أو الاجتماعات أو تبادل المراسلات أو النماذج الأولية اعتمادًا للتعديل.
11-5 بدء التنفيذ: لا يلتزم الطرف الثاني ببدء أعمال التعديل قبل تحقق شروط البدء المعتمدة، بما في ذلك سداد أي دفعة مستحقة واستلام البيانات أو الملفات أو الصلاحيات اللازمة، متى كان أي منها مطلوبًا. وتمتد مدة المشروع بالقدر الذي يترتب على التعديل المعتمد وآثاره الفعلية.
11-6 اتفاقية التطويرات المستقبلية والأعمال الإضافية: إذا اعتمد الطرفان هذه الاتفاقية الاختيارية، فتعد تنظيمًا تفصيليًا للإجراءات الواردة في هذه المادة، وتطبق في حدود ما تنظمه دون المساس بالأحكام الجوهرية للعقد.` ,
  enabled: true,
};

const socialArticle14Source = freelanceSourceLegalClauses.find((clause) => clause.key === "social_media_management_source_section_16");
const socialArticle14Reviewed = socialArticle14Source ? reviewedSocialMainClause(socialArticle14Source) : undefined;

const socialArticle14IntroClause: LegalClauseDefinition = {
  key: "social_media_management_article_14_intro",
  titleAr: "المادة الرابعة عشرة: ضمان جودة الخدمات والدعم والجزاء الاتفاقي",
  bodyAr: socialArticle14Reviewed?.bodyAr.replace(/14-3\s*الجزاء الاتفاقي عن التأخير في التنفيذ:[\s\S]*$/u, "").trim() ?? "",
  sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf",
  sourcePageStart: 15,
  sourcePageEnd: 15,
  enabled: true,
};

const socialArticle14TailClause: LegalClauseDefinition = {
  key: "social_media_management_article_14_tail",
  titleAr: "المادة الرابعة عشرة: ضمان جودة الخدمات والدعم (تابع)",
  bodyAr: socialArticle14Reviewed?.bodyAr.match(/14-4\s*ما (?:لا|ال) يشمله ضمان الخدمات:[\s\S]*$/u)?.[0]?.trim() ?? "",
  sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf",
  sourcePageStart: 16,
  sourcePageEnd: 16,
  enabled: true,
};

const socialDelayPenaltyCommonTail = `ولا يستحق هذا الجزاء إلا بعد قيام الطرف الأول بإخطار الطرف الثاني كتابةً بواقعة التأخير ومنحه مهلة لا تقل عن {{social_delay_penalty_cure_days}} أيام عمل لمعالجة التأخير أو اتخاذ الإجراءات اللازمة للتنفيذ.
ويكون الحد الأقصى لإجمالي الجزاء الاتفاقي المستحق عن أي واقعة تأخير مبلغًا لا يتجاوز {{social_delay_penalty_cap_percentage}}% من قيمة المقابل المالي للخدمة أو المرحلة محل التأخير، ولا يجوز أن يترتب على هذا الجزاء تجاوز إجمالي الالتزامات المالية للطرف الثاني الحدود المقررة بموجب هذا العقد.
ولا يطبق الجزاء الاتفاقي في أي من الحالات الآتية:
أ. إذا كان التأخير ناتجًا عن تأخر الطرف الأول في تقديم البيانات أو المواد أو المحتوى أو الموافقات أو الاعتمادات أو صلاحيات الوصول اللازمة للتنفيذ.
ب. إذا كان التأخير ناتجًا عن طلبات تعديل أو أعمال إضافية لم تكن ضمن نطاق الخدمات الأصلي.
ج. إذا كان التأخير بسبب قوة قاهرة أو ظرف استثنائي أو سبب خارج عن إرادة الطرف الثاني.
د. إذا كان التأخير متعلقًا بنتائج الحملات أو معدلات الوصول أو التفاعل أو المشاهدات أو عدد المتابعين أو أي مؤشرات أداء تسويقية أو تجارية.
ولا يخل استحقاق الجزاء الاتفاقي بحق الطرف الثاني في استكمال تنفيذ التزاماته متى كان التنفيذ لا يزال ممكنًا، كما لا يخل بحق أي من الطرفين في ممارسة الحقوق الأخرى المقررة له بموجب هذا العقد أو القانون.`;

const socialDelayPenaltyAmountClause: LegalClauseDefinition = {
  key: "social_media_delay_penalty_amount_clause",
  titleAr: "14-3 الجزاء الاتفاقي عن التأخير في التنفيذ",
  bodyAr: `إذا تأخر الطرف الثاني، دون سبب مشروع أو عذر مقبول، عن تنفيذ الالتزامات التي يحدد هذا العقد أو ملحقاته المعتمدة أن لها موعدًا نهائيًا ملزمًا، وكان التأخير ناشئًا عن تقصيره وحده رغم قيام الطرف الأول بتنفيذ جميع التزاماته؛ يلتزم الطرف الثاني بأداء جزاء اتفاقي قدره {{social_delay_penalty_amount}} جنيه مصري عن كل يوم تأخير.
${socialDelayPenaltyCommonTail}`,
  variables: ["social_delay_penalty_mode", "social_delay_penalty_amount", "social_delay_penalty_cap_percentage", "social_delay_penalty_cure_days"],
  visibleWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "amount" },
  sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf",
  sourcePageStart: 15,
  sourcePageEnd: 16,
  enabled: true,
};

const socialDelayPenaltyPercentageClause: LegalClauseDefinition = {
  key: "social_media_delay_penalty_percentage_clause",
  titleAr: "14-3 الجزاء الاتفاقي عن التأخير في التنفيذ",
  bodyAr: `إذا تأخر الطرف الثاني، دون سبب مشروع أو عذر مقبول، عن تنفيذ الالتزامات التي يحدد هذا العقد أو ملحقاته المعتمدة أن لها موعدًا نهائيًا ملزمًا، وكان التأخير ناشئًا عن تقصيره وحده رغم قيام الطرف الأول بتنفيذ جميع التزاماته؛ يلتزم الطرف الثاني بأداء جزاء اتفاقي يعادل {{social_delay_penalty_percentage}}% من قيمة المرحلة عن كل يوم تأخير.
${socialDelayPenaltyCommonTail}`,
  variables: ["social_delay_penalty_mode", "social_delay_penalty_percentage", "social_delay_penalty_cap_percentage", "social_delay_penalty_cure_days"],
  visibleWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "percentage" },
  sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf",
  sourcePageStart: 15,
  sourcePageEnd: 16,
  enabled: true,
};

const freelancerLegalClauses: LegalClauseDefinition[] = [
  ...freelanceSourceLegalClauses.map((clause): LegalClauseDefinition => {
    const identitySource = clause.key.startsWith("visual_identity_design_source_");
    const websiteMainSource = clause.key.startsWith("website_development_source_");
    const socialMainSource = clause.key.startsWith("social_media_management_source_");
    const websiteAnnexSource = clause.key.startsWith("website_scope_annex_source_")
      || clause.key.startsWith("website_technical_annex_source_")
      || clause.key.startsWith("website_project_data_annex_source_")
      || clause.key.startsWith("website_delivery_annex_source_")
      || clause.key.startsWith("website_sla_annex_source_")
      || clause.key.startsWith("website_future_development_annex_source_");
    const baseClause = identitySource
      ? { ...clause, titleAr: cleanIdentityExtractedText(clause.titleAr), bodyAr: cleanIdentityExtractedText(clause.bodyAr) }
      : websiteMainSource
        ? reviewedWebsiteMainClause(clause)
        : socialMainSource
          ? reviewedSocialMainClause(clause)
          : websiteAnnexSource
            ? reviewedWebsiteAnnexClause(clause)
            : clause;
    const reviewedMain = reviewedIdentityMainClauseOverrides[clause.key];
    if (reviewedMain) return { ...baseClause, ...reviewedMain } as LegalClauseDefinition;
    const reviewedAnnex = reviewedIdentityAnnexClauseOverrides[clause.key];
    if (reviewedAnnex) return { ...baseClause, ...reviewedAnnex };
    if (clause.key === "visual_identity_design_source_section_09") {
      return {
        ...baseClause,
        variables: ["visual_contract_value", "visual_contract_value_words"],
        bodyAr: `يلتزم الطرف الأول بسداد المقابل المالي المستحق للطرف الثاني نظير تنفيذ الخدمات محل هذا العقد، وذلك بإجمالي مبلغ وقدره: {{visual_contract_value}} جنيه مصري ({{visual_contract_value_words}})، أو وفقًا للدفعات أو المراحل أو الآلية المالية المحددة والمتفق عليها بين الطرفين.
يتم سداد المقابل المالي بالطريقة والمواعيد المتفق عليها بين الطرفين، سواء كان ذلك نقدًا أو عن طريق التحويل البنكي أو المحافظ الإلكترونية أو أي وسيلة دفع أخرى يتفق عليها الطرفان، ويُعد إيصال السداد أو إشعار التحويل أو أي وسيلة إثبات أخرى مقبولة قانونًا دليلًا على الوفاء بالمبلغ المسدد.
إذا اتفق الطرفان على سداد المقابل المالي دفعة واحدة، يلتزم الطرف الأول بسدادها في الموعد المحدد، وإذا تم الاتفاق على السداد على عدة دفعات أو مراحل، يلتزم الطرف الأول بسداد كل دفعة في تاريخ استحقاقها وفقًا لما تم الاتفاق عليه.
لا يلتزم الطرف الثاني بالبدء في تنفيذ الخدمات أو الاستمرار فيها أو تسليم المخرجات أو مراحل التنفيذ المستحقة إلا في حدود سداد الدفعات المستحقة في مواعيدها، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
في حال تأخر الطرف الأول عن سداد أي مبلغ مستحق في موعده، يحق للطرف الثاني تعليق تنفيذ الخدمات أو تأجيل المراحل أو مواعيد التسليم إلى حين السداد، ولا يُعد ذلك إخلالًا من الطرف الثاني بالتزاماته أو تأخيرًا منسوبًا إليه.
لا يشمل المقابل المالي المتفق عليه أي أعمال أو خدمات أو تعديلات إضافية تخرج عن نطاق الخدمات المحددة في هذا العقد، ولا يلتزم الطرف الثاني بتنفيذها إلا بعد اتفاق الطرفين كتابةً على نطاقها ومقابلها المالي وما يترتب عليها من آثار على مدة التنفيذ أو غيرها من الالتزامات.
يتحمل كل طرف ما يخصه من رسوم أو مصروفات أو التزامات مالية ناشئة عن تنفيذ هذا العقد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
وإذا وجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
      };
    }
    if (clause.key === "visual_identity_design_source_section_23") {
      return {
        ...baseClause,
        bodyAr: `تكون جميع الإخطارات والمراسلات والاعتمادات والطلبات المتعلقة بهذا العقد أو الناشئة عن تنفيذه صحيحة ومنتجة لآثارها متى تمت كتابةً بإحدى الوسائل المتفق عليها بين الطرفين وفقًا لأحكام هذه المادة، وذلك في الحدود التي يجيزها القانون.
يُعد العنوان المبين في صدر هذا العقد موطنًا مختارًا لكل طرف، وتوجه إليه الإخطارات والمراسلات الرسمية، ما لم يُخطر أحد الطرفين الطرف الآخر كتابةً بتغييره، وتظل البيانات السابقة منتجة لآثارها إلى حين تمام الإخطار بالتعديل.
يجوز للطرفين تبادل المراسلات والمستندات والملفات والاعتمادات المتعلقة بتنفيذ المشروع عبر البريد الإلكتروني المتفق عليه بينهما أو أي وسيلة إلكترونية أخرى يتفقان عليها.
يجوز للطرفين استخدام تطبيقات المراسلة الإلكترونية التي يتفقان عليها لتبادل التعليمات الفنية والملاحظات والملفات والمستندات المتعلقة بتنفيذ الخدمات.
تُعد المراسلات والملفات والاعتمادات المتبادلة عبر الوسائل الإلكترونية المتفق عليها وسيلة إثبات بين الطرفين متى أمكن التحقق من صدورها ونسبتها إلى مرسلها وسلامة محتواها، وذلك دون أن يترتب عليها تعديل نطاق الخدمات أو المقابل المالي أو مدة التنفيذ أو أي التزام جوهري، إلا إذا تضمنت اتفاقًا صريحًا بين الطرفين أو تمت وفقًا لإجراءات تعديل العقد المنصوص عليها فيه.
يلتزم كل طرف بإخطار الطرف الآخر كتابةً بأي تغيير يطرأ على بيانات التواصل الخاصة به، وإلى حين تمام هذا الإخطار تظل المراسلات المرسلة إلى البيانات السابقة صحيحة ومنتجة لآثارها، ما لم يثبت خلاف ذلك.
لا يخل اعتماد الوسائل الإلكترونية وفقًا لهذه المادة بأي متطلبات شكلية يفرضها القانون لبعض الإجراءات، ولا يجوز التمسك بعدم صحة أو عدم حجية المراسلات الإلكترونية لمجرد كونها تمت بوسيلة إلكترونية، متى أمكن التحقق من صدورها وسلامة محتواها، وذلك في الحدود التي يجيزها القانون.`,
      };
    }
    if (clause.key === "visual_identity_design_source_section_26") {
      return {
        ...baseClause,
        titleAr: "ثالثًا: الاختصاص القضائي والمنازعات الفنية والإجراءات الوقتية",
        variables: [...new Set([...(baseClause.variables ?? []), "visual_competent_court"])],
        bodyAr: `مع مراعاة قواعد الاختصاص الولائي والنوعي والمكاني المتعلقة بالنظام العام، اتفق الطرفان على أن تختص محكمة {{visual_competent_court}} الابتدائية ودوائرها الجزئية بحسب الأحوال بنظر المنازعات الناشئة عن هذا العقد أو المرتبطة به، وذلك في الحدود التي يجيزها القانون. وإذا تعذر انعقاد الاختصاص للمحكمة المختارة قانونًا، ينعقد الاختصاص للمحكمة المصرية المختصة وفقًا للقواعد الآمرة.
رابعًا: المنازعات الفنية: إذا تعلق النزاع بمسألة فنية، بما في ذلك مدى مطابقة الأعمال أو المخرجات لنطاق الخدمات أو المواصفات أو معايير القبول المتفق عليها، أو تقييم مراحل التنفيذ أو نسب الإنجاز، أو تحديد ما إذا كان العمل يدخل ضمن نطاق الخدمات أو يُعد عملًا إضافيًا، جاز لأي من الطرفين الاستعانة بخبير فني متخصص قبل اللجوء إلى القضاء أو أثناء نظر النزاع، كما يجوز للمحكمة المختصة ندب خبير وفقًا للإجراءات المقررة قانونًا. ولا تكون لتقارير أو آراء الخبراء الذين يختارهم الطرفان أو أحدهما حجية ملزمة إلا إذا اتفق الطرفان كتابةً على ذلك، أو إذا كان الخبير معينًا أو منتدبًا من المحكمة المختصة وفقًا لأحكام القانون.
خامسًا: الإجراءات الوقتية والتحفظية: لا يخل ما ورد في هذه المادة بحق أي من الطرفين في اللجوء إلى المحكمة المختصة لطلب اتخاذ أي إجراء وقتي أو تحفظي أو مستعجل يهدف إلى حماية حقوقه أو المحافظة على الأدلة أو منع وقوع ضرر يتعذر تداركه، بما في ذلك الإجراءات المتعلقة بحماية حقوق الملكية الفكرية، أو سرية المعلومات أو البيانات، أو المخرجات، أو أي حق آخر ناشئ عن هذا العقد، وذلك دون أن يُعد اتخاذ هذه الإجراءات تنازلًا عن أي حق آخر مقرر بموجب هذا العقد أو القانون.`,
      };
    }
    return baseClause;
  }),
  socialArticle14IntroClause,
  socialDelayPenaltyAmountClause,
  socialDelayPenaltyPercentageClause,
  socialArticle14TailClause,
  restoredWebsiteArticle11,
  {
    key: "social_media_email_contacts",
    titleAr: "بيانات البريد الإلكتروني المعتمد للمراسلات",
    bodyAr: "بريد الطرف الأول (العميل): {{social_client_email}}\nبريد الطرف الثاني (مقدم الخدمة): {{social_provider_email}}",
    variables: ["social_client_email", "social_provider_email"],
    visibleWhen: { fieldKey: "social_notice_use_party_emails", operator: "truthy" },
    sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf", sourcePageStart: 22, sourcePageEnd: 22, enabled: true,
  },
  {
    key: "social_media_email_contacts_custom",
    titleAr: "بيانات البريد الإلكتروني المعتمد للمراسلات",
    bodyAr: "بريد الطرف الأول (العميل): {{social_notice_client_email}}\nبريد الطرف الثاني (مقدم الخدمة): {{social_notice_provider_email}}",
    variables: ["social_notice_client_email", "social_notice_provider_email"],
    visibleWhen: { fieldKey: "social_notice_use_party_emails", operator: "falsy" },
    sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf", sourcePageStart: 22, sourcePageEnd: 22, enabled: true,
  },
  {
    key: "social_media_messaging_contacts",
    titleAr: "بيانات تطبيقات المراسلة الإلكترونية المعتمدة",
    bodyAr: "هاتف الطرف الأول (العميل): {{social_client_phone}}\nهاتف الطرف الثاني (مقدم الخدمة): {{social_provider_phone}}",
    variables: ["social_client_phone", "social_provider_phone"],
    visibleWhen: { fieldKey: "social_messaging_use_party_phones", operator: "truthy" },
    sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf", sourcePageStart: 22, sourcePageEnd: 22, enabled: true,
  },
  {
    key: "social_media_messaging_contacts_custom",
    titleAr: "بيانات تطبيقات المراسلة الإلكترونية المعتمدة",
    bodyAr: "هاتف الطرف الأول (العميل): {{social_messaging_client_number}}\nهاتف الطرف الثاني (مقدم الخدمة): {{social_messaging_provider_number}}",
    variables: ["social_messaging_client_number", "social_messaging_provider_number"],
    visibleWhen: { fieldKey: "social_messaging_use_party_phones", operator: "falsy" },
    sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf", sourcePageStart: 22, sourcePageEnd: 22, enabled: true,
  },
  {
    key: "social_media_legal_fees_clause",
    titleAr: "المادة 22-16: الرسوم والضرائب القانونية",
    bodyAr: "{{social_legal_fees_text}}",
    variables: ["social_legal_fees_text"],
    visibleWhen: { fieldKey: "social_legal_fees_enabled", operator: "truthy" },
    sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf", sourcePageStart: 25, sourcePageEnd: 25, enabled: true,
  },
  {
    key: "visual_identity_email_contacts",
    titleAr: "بيانات البريد الإلكتروني المعتمد للمراسلات",
    bodyAr: "بريد الطرف الأول (العميل): {{visual_client_email}}\nبريد الطرف الثاني (المصمم): {{visual_provider_email}}",
    variables: ["visual_client_email", "visual_provider_email"],
    visibleWhen: allConditions(
      { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
      { fieldKey: "visual_notice_use_party_emails", operator: "truthy" },
    ),
    sourceDocumentName: "عقد الهوية البصرية.pdf",
    sourcePageStart: 9,
    sourcePageEnd: 10,
    enabled: true,
  },
  {
    key: "visual_identity_email_contacts_custom",
    titleAr: "بيانات البريد الإلكتروني المعتمد للمراسلات",
    bodyAr: "بريد الطرف الأول (العميل): {{visual_notice_client_email}}\nبريد الطرف الثاني (المصمم): {{visual_notice_provider_email}}",
    variables: ["visual_notice_client_email", "visual_notice_provider_email"],
    visibleWhen: allConditions(
      { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
      { fieldKey: "visual_notice_use_party_emails", operator: "falsy" },
    ),
    sourceDocumentName: "عقد الهوية البصرية.pdf",
    sourcePageStart: 9,
    sourcePageEnd: 10,
    enabled: true,
  },
  {
    key: "visual_identity_messaging_contacts",
    titleAr: "بيانات تطبيقات المراسلة الإلكترونية المعتمدة",
    bodyAr: "تطبيقات المراسلة المعتمدة: {{visual_messaging_apps}}\nرقم الطرف الأول (العميل): {{visual_client_phone}}\nرقم الطرف الثاني (المصمم): {{visual_provider_phone}}",
    variables: ["visual_messaging_apps", "visual_client_phone", "visual_provider_phone"],
    visibleWhen: allConditions(
      { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
      { fieldKey: "visual_messaging_use_party_phones", operator: "truthy" },
    ),
    sourceDocumentName: "عقد الهوية البصرية.pdf",
    sourcePageStart: 9,
    sourcePageEnd: 10,
    enabled: true,
  },
  {
    key: "visual_identity_messaging_contacts_custom",
    titleAr: "بيانات تطبيقات المراسلة الإلكترونية المعتمدة",
    bodyAr: "تطبيقات المراسلة المعتمدة: {{visual_messaging_apps}}\nرقم الطرف الأول (العميل): {{visual_messaging_client_number}}\nرقم الطرف الثاني (المصمم): {{visual_messaging_provider_number}}",
    variables: ["visual_messaging_apps", "visual_messaging_client_number", "visual_messaging_provider_number"],
    visibleWhen: allConditions(
      { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
      { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" },
    ),
    sourceDocumentName: "عقد الهوية البصرية.pdf",
    sourcePageStart: 9,
    sourcePageEnd: 10,
    enabled: true,
  },
];

export const freelancerTemplateDefinition: ContractTemplateDefinition = {
  slug: "freelancer",
  version: 15,
  nameAr: "عقود الخدمات والعمل الحر",
  description: "عقود الهوية البصرية وتطوير المواقع وإدارة منصات التواصل مع ملاحق اختيارية مستقلة وفارغة قابلة للطباعة والتعبئة اليدوية.",
  priceEgp: 0,
  variantPricing: {
    visual_identity_design: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 0 },
    website_development: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 0 },
    social_media_management: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 0 },
  },
  variants,
  optionalClauses,
  legalClauses: freelancerLegalClauses.map(normalizeLegalClauseDefinition),
};
