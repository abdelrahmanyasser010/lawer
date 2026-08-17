import type {
  ConditionDefinition,
  ContractTemplateDefinition,
  ContractVariantDefinition,
  LegalClauseDefinition,
  OptionalClauseDefinition,
  WizardFieldDefinition,
  WizardStepDefinition,
} from "../../types";
import {
  freelanceSourceClauseKeysByAnnex,
  freelanceSourceClauseKeysByVariant,
  freelanceSourceLegalClauses,
} from "../../legal-content/freelanceSourceClauses";
import { contractDateField } from "../common";

const yesNo = [
  { value: "yes", labelAr: "نعم" },
  { value: "no", labelAr: "لا" },
];

const partyTypeOptions = [
  { value: "individual", labelAr: "فرد" },
  { value: "company", labelAr: "شركة / منشأة" },
];

const currencyOptions = [
  { value: "egp", labelAr: "جنيه مصري" },
  { value: "usd", labelAr: "دولار أمريكي" },
  { value: "eur", labelAr: "يورو" },
  { value: "sar", labelAr: "ريال سعودي" },
  { value: "aed", labelAr: "درهم إماراتي" },
  { value: "other", labelAr: "عملة أخرى" },
];

const visualIdentityCourtOptions = [
  "شمال القاهرة", "جنوب القاهرة", "القاهرة الجديدة", "شمال الجيزة", "جنوب الجيزة", "الإسكندرية", "طنطا",
  "دمنهور", "كفر الشيخ", "المنصورة", "الزقازيق", "بنها", "شبين الكوم", "بورسعيد", "الإسماعيلية", "السويس",
  "دمياط", "المنيا", "بني سويف", "الفيوم", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر",
  "الوادي الجديد", "مرسى مطروح", "شمال سيناء", "جنوب سيناء", "أخرى",
].map((value) => ({ value, labelAr: value }));

const allConditions = (...conditions: ConditionDefinition[]): ConditionDefinition => ({ all: conditions });

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
    { key: `${prefix}_national_id`, type: "text", labelAr: "الرقم القومي / رقم جواز السفر", required: true },
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
    { key: `${secondPrefix}_client_party`, titleAr: "بيانات الطرف الأول (العميل)", fields: partyFields(`${secondPrefix}_client`, "العميل", "العميل", includeIdentityDocuments) },
    { key: `${secondPrefix}_provider_party`, titleAr: `بيانات الطرف الثاني (${secondLabel})`, fields: partyFields(`${secondPrefix}_provider`, secondLabel, roleLabel, includeIdentityDocuments) },
  ];
}

function visualPartySteps(): WizardStepDefinition[] {
  const reusePartyEmails = allConditions(
    { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
    { fieldKey: "visual_notice_use_party_emails", operator: "truthy" },
  );
  return commonPartySteps("visual", "المصمم", "المصمم", false).map((step) => ({
    ...step,
    fields: step.fields.flatMap((field): WizardFieldDefinition[] => {
      if (field.key === "visual_client_email" || field.key === "visual_provider_email") {
        return [{ ...field, requiredWhen: reusePartyEmails }];
      }
      if (field.key.endsWith("_power_of_attorney_details")) {
        const prefix = field.key.slice(0, -"_power_of_attorney_details".length);
        const condition: ConditionDefinition = { fieldKey: `${prefix}_authority_basis`, operator: "equals", value: "power_of_attorney" };
        return [
          { key: `${prefix}_power_of_attorney_number`, type: "text", labelAr: "رقم التوكيل", visibleWhen: condition, requiredWhen: condition },
          { key: `${prefix}_power_of_attorney_year`, type: "number", labelAr: "سنة التوكيل", visibleWhen: condition, requiredWhen: condition },
          { key: `${prefix}_power_of_attorney_office`, type: "text", labelAr: "مكتب الشهر العقاري", visibleWhen: condition, requiredWhen: condition },
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
  return commonPartySteps("website", "مقدم الخدمة", "مقدم الخدمة", false).map((step) => ({
    ...step,
    fields: step.fields.flatMap((field): WizardFieldDefinition[] => {
      if (field.key === "website_client_email" || field.key === "website_provider_email") {
        return [{ ...field, requiredWhen: reusePartyEmails }];
      }
      // The Website source has no "بموجب" / POA row for the client-company table;
      // that row exists only for the provider-company table on page 2.
      if (field.key === "website_client_authority_basis" || field.key === "website_client_power_of_attorney_details") {
        return [];
      }
      if (field.key.endsWith("_power_of_attorney_details")) {
        const prefix = field.key.slice(0, -"_power_of_attorney_details".length);
        const condition: ConditionDefinition = { fieldKey: `${prefix}_authority_basis`, operator: "equals", value: "power_of_attorney" };
        return [
          { key: `${prefix}_power_of_attorney_number`, type: "text", labelAr: "رقم التوكيل", visibleWhen: condition, requiredWhen: condition },
          { key: `${prefix}_power_of_attorney_year`, type: "number", labelAr: "سنة التوكيل", visibleWhen: condition, requiredWhen: condition, validation: { min: 1900, max: 2200 } },
          { key: `${prefix}_power_of_attorney_office`, type: "text", labelAr: "مكتب الشهر العقاري", visibleWhen: condition, requiredWhen: condition },
        ];
      }
      return [field];
    }),
  }));
}

function socialPartySteps(): WizardStepDefinition[] {
  const reusePartyEmails: ConditionDefinition = { fieldKey: "social_notice_use_party_emails", operator: "truthy" };
  return commonPartySteps("social", "مقدم الخدمة", "مقدم الخدمة", false).map((step) => ({
    ...step,
    fields: step.fields.flatMap((field): WizardFieldDefinition[] => {
      if (field.key === "social_client_email" || field.key === "social_provider_email") {
        return [{ ...field, requiredWhen: reusePartyEmails }];
      }
      if (field.key.endsWith("_power_of_attorney_details")) {
        const prefix = field.key.slice(0, -"_power_of_attorney_details".length);
        const condition: ConditionDefinition = { fieldKey: `${prefix}_authority_basis`, operator: "equals", value: "power_of_attorney" };
        return [
          { key: `${prefix}_power_of_attorney_number`, type: "text", labelAr: "رقم التوكيل", visibleWhen: condition, requiredWhen: condition },
          { key: `${prefix}_power_of_attorney_year`, type: "number", labelAr: "سنة التوكيل", visibleWhen: condition, requiredWhen: condition, validation: { min: 1900, max: 2200 } },
          { key: `${prefix}_power_of_attorney_office`, type: "text", labelAr: "مكتب الشهر العقاري", visibleWhen: condition, requiredWhen: condition },
        ];
      }
      return [field];
    }),
  }));
}

const reviewStep = (key: string): WizardStepDefinition => ({ key, titleAr: "المراجعة وإصدار العقد", fields: [] });

const visualSteps: WizardStepDefinition[] = [
  { key: "visual_contract_meta", titleAr: "بيانات العقد", fields: [contractDateField] },
  ...visualPartySteps(),
  { key: "visual_project", titleAr: "بيانات مشروع الهوية البصرية", fields: [
    { key: "visual_project_name", type: "text", labelAr: "اسم المشروع / العلامة التجارية / النشاط", required: true },
    { key: "visual_project_brief", type: "textarea", labelAr: "وصف مختصر للمشروع (اختياري)" },
    { key: "visual_project_purpose", type: "textarea", labelAr: "الغرض من تصميم الهوية البصرية", required: true },
    {
      key: "visual_execution_duration",
      type: "text",
      labelAr: "مدة التنفيذ المتفق عليها",
      required: true,
      helpText: "اكتب المدة كما اتفق عليها الطرفان، مثال: 30 يوم عمل.",
    },
    {
      key: "visual_contract_value",
      type: "money",
      labelAr: "المقابل المالي المتفق عليه بين العميل والمصمم",
      required: true,
      validation: { min: 1 },
      helpText: "هذا مبلغ التعاقد بين الطرفين وليس سعر شراء القالب من منصة Z draft.",
    },
    {
      key: "visual_contract_value_words",
      type: "text",
      labelAr: "المقابل المالي كتابةً (بدون اسم العملة)",
      required: true,
      helpText: "اكتب قيمة المبلغ بالحروف فقط، مثال: خمسة آلاف. سيضيف العقد عبارة جنيه مصري تلقائيًا.",
    },
    {
      key: "visual_competent_court",
      type: "select",
      labelAr: "المحكمة المختصة (اختياري)",
      options: visualIdentityCourtOptions,
      helpText: "إذا لم تُحدد محكمة بعينها تُطبق قواعد الاختصاص النوعي والمكاني المقررة قانونًا.",
    },
    {
      key: "visual_competent_court_other",
      type: "text",
      labelAr: "اسم المحكمة الأخرى",
      visibleWhen: { fieldKey: "visual_competent_court", operator: "equals", value: "أخرى" },
      requiredWhen: { fieldKey: "visual_competent_court", operator: "equals", value: "أخرى" },
    },
  ] },
  { key: "visual_communications", titleAr: "الإخطارات والمراسلات", fields: [
    {
      key: "visual_email_notices_enabled",
      type: "checkbox",
      labelAr: "اعتماد البريد الإلكتروني للمراسلات المتعلقة بتنفيذ المشروع",
      printInDocument: false,
    },
    {
      key: "visual_notice_use_party_emails",
      type: "checkbox",
      labelAr: "استخدام نفس البريد الإلكتروني المسجل في بيانات الطرفين",
      helpText: "إذا ألغيت هذا الاختيار ستظهر حقول بريد مخصصة للمراسلات الرسمية.",
      visibleWhen: { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
      printInDocument: false,
    },
    {
      key: "visual_notice_client_email",
      type: "text",
      labelAr: "البريد الإلكتروني المعتمد للطرف الأول (العميل)",
      printInDocument: false,
      visibleWhen: allConditions(
        { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
        { fieldKey: "visual_notice_use_party_emails", operator: "falsy" },
      ),
      requiredWhen: allConditions(
        { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
        { fieldKey: "visual_notice_use_party_emails", operator: "falsy" },
      ),
    },
    {
      key: "visual_notice_provider_email",
      type: "text",
      labelAr: "البريد الإلكتروني المعتمد للطرف الثاني (المصمم)",
      printInDocument: false,
      visibleWhen: allConditions(
        { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
        { fieldKey: "visual_notice_use_party_emails", operator: "falsy" },
      ),
      requiredWhen: allConditions(
        { fieldKey: "visual_email_notices_enabled", operator: "truthy" },
        { fieldKey: "visual_notice_use_party_emails", operator: "falsy" },
      ),
    },
    {
      key: "visual_messaging_apps_enabled",
      type: "checkbox",
      labelAr: "اعتماد تطبيقات المراسلة الإلكترونية للتعليمات والملاحظات والملفات",
      printInDocument: false,
    },
    {
      key: "visual_messaging_apps",
      type: "text",
      labelAr: "تطبيقات المراسلة المعتمدة",
      printInDocument: false,
      placeholder: "مثال: WhatsApp",
      visibleWhen: { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
      requiredWhen: { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
    },
    {
      key: "visual_messaging_use_party_phones",
      type: "checkbox",
      labelAr: "استخدام نفس أرقام الهاتف المسجلة في بيانات الطرفين",
      helpText: "إذا ألغيت هذا الاختيار ستظهر أرقام مخصصة لتطبيقات المراسلة.",
      visibleWhen: { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
      printInDocument: false,
    },
    {
      key: "visual_messaging_client_number",
      type: "text",
      labelAr: "رقم المراسلة المعتمد للطرف الأول (العميل)",
      printInDocument: false,
      visibleWhen: allConditions(
        { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
        { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" },
      ),
      requiredWhen: allConditions(
        { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
        { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" },
      ),
    },
    {
      key: "visual_messaging_provider_number",
      type: "text",
      labelAr: "رقم المراسلة المعتمد للطرف الثاني (المصمم)",
      printInDocument: false,
      visibleWhen: allConditions(
        { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
        { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" },
      ),
      requiredWhen: allConditions(
        { fieldKey: "visual_messaging_apps_enabled", operator: "truthy" },
        { fieldKey: "visual_messaging_use_party_phones", operator: "falsy" },
      ),
    },
  ] },
  { key: "visual_witnesses", titleAr: "الشهود (اختياري)", fields: [
    { key: "visual_witness_1_enabled", type: "checkbox", labelAr: "إضافة الشاهد الأول", printInDocument: false },
    {
      key: "visual_witness_1_name",
      type: "text",
      labelAr: "اسم الشاهد الأول",
      visibleWhen: { fieldKey: "visual_witness_1_enabled", operator: "truthy" },
      requiredWhen: { fieldKey: "visual_witness_1_enabled", operator: "truthy" },
      printInDocument: false,
    },
    {
      key: "visual_witness_1_national_id",
      type: "text",
      labelAr: "الرقم القومي للشاهد الأول",
      visibleWhen: { fieldKey: "visual_witness_1_enabled", operator: "truthy" },
      requiredWhen: { fieldKey: "visual_witness_1_enabled", operator: "truthy" },
      printInDocument: false,
    },
    { key: "visual_witness_2_enabled", type: "checkbox", labelAr: "إضافة الشاهد الثاني", printInDocument: false },
    {
      key: "visual_witness_2_name",
      type: "text",
      labelAr: "اسم الشاهد الثاني",
      visibleWhen: { fieldKey: "visual_witness_2_enabled", operator: "truthy" },
      requiredWhen: { fieldKey: "visual_witness_2_enabled", operator: "truthy" },
      printInDocument: false,
    },
    {
      key: "visual_witness_2_national_id",
      type: "text",
      labelAr: "الرقم القومي للشاهد الثاني",
      visibleWhen: { fieldKey: "visual_witness_2_enabled", operator: "truthy" },
      requiredWhen: { fieldKey: "visual_witness_2_enabled", operator: "truthy" },
      printInDocument: false,
    },
  ] },
  reviewStep("visual_review"),
];

const websiteSteps: WizardStepDefinition[] = [
  { key: "website_contract_meta", titleAr: "بيانات العقد", fields: [contractDateField] },
  ...websitePartySteps(),
  { key: "website_project", titleAr: "بيانات مشروع الموقع الإلكتروني", fields: [
    { key: "website_project_name", type: "text", labelAr: "اسم المشروع", required: true },
    { key: "website_project_type", type: "select", labelAr: "نوع المشروع", required: true, options: [
      { value: "corporate", labelAr: "موقع تعريفي" },
      { value: "ecommerce", labelAr: "متجر إلكتروني" },
      { value: "platform", labelAr: "منصة إلكترونية" },
      { value: "web_app", labelAr: "نظام ويب (Web Application)" },
      { value: "landing_page", labelAr: "صفحة هبوط (Landing Page)" },
      { value: "other", labelAr: "أخرى" },
    ] },
    { key: "website_project_type_other", type: "text", labelAr: "نوع المشروع الآخر", visibleWhen: { fieldKey: "website_project_type", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "website_project_type", operator: "equals", value: "other" } },
    { key: "website_contact_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للتواصل مع المشروع", required: true },
    { key: "website_project_manager", type: "text", labelAr: "الشخص المسؤول عن المشروع", required: true },
    { key: "website_approval_person", type: "text", labelAr: "الشخص المسؤول عن الاعتماد", required: true },
    { key: "website_billing_contact", type: "text", labelAr: "الشخص المسؤول عن الفواتير أو المدفوعات", required: true },
    { key: "website_execution_duration_value", type: "number", labelAr: "مدة تنفيذ المشروع", required: true, validation: { min: 1 } },
    { key: "website_execution_duration_unit", type: "select", labelAr: "وحدة مدة التنفيذ", required: true, options: [
      { value: "يومًا", labelAr: "يوم" }, { value: "أسبوعًا", labelAr: "أسبوع" }, { value: "شهرًا", labelAr: "شهر" },
    ] },
    { key: "website_duration_basis", type: "radio", labelAr: "أساس احتساب مدة التنفيذ", required: true, options: [
      { value: "بأيام العمل، ما لم يتفق الطرفان كتابةً على احتسابها بالأيام التقويمية", labelAr: "أيام العمل (الأصل في العقد)" },
      { value: "بالأيام التقويمية بناءً على اتفاق الطرفين", labelAr: "الأيام التقويمية باتفاق الطرفين" },
    ] },
    { key: "website_total_price", type: "money", labelAr: "إجمالي المقابل المالي بين العميل ومقدم الخدمة (جنيه مصري)", required: true, validation: { min: 1 }, helpText: "هذا مبلغ التعاقد بين الطرفين وليس سعر شراء القالب من منصة Z draft." },
    { key: "website_total_price_words", type: "text", labelAr: "إجمالي المقابل المالي كتابةً (بدون اسم العملة)", required: true, helpText: "مثال: خمسون ألفًا. سيضيف العقد عبارة جنيه مصري تلقائيًا." },
    { key: "website_warranty_duration_value", type: "number", labelAr: "مدة الضمان", required: true, validation: { min: 1 } },
    { key: "website_warranty_duration_unit", type: "select", labelAr: "وحدة مدة الضمان", required: true, options: [
      { value: "يومًا", labelAr: "يوم" }, { value: "أسبوعًا", labelAr: "أسبوع" }, { value: "شهرًا", labelAr: "شهر" }, { value: "سنة", labelAr: "سنة" },
    ] },
    { key: "website_confidentiality_years", type: "number", labelAr: "مدة استمرار السرية بعد انتهاء العقد (بالسنوات)", required: true, validation: { min: 1 }, helpText: "النموذج الأصلي يذكر 3 سنوات كمدة مفضلة؛ يمكنك الاتفاق على مدة أخرى." },
    { key: "website_competent_court", type: "select", labelAr: "المحكمة المختصة (اختياري)", options: visualIdentityCourtOptions, helpText: "إذا لم تُحدد محكمة بعينها تُطبق قواعد الاختصاص النوعي والمكاني المقررة قانونًا." },
    { key: "website_competent_court_other", type: "text", labelAr: "اسم المحكمة الأخرى", visibleWhen: { fieldKey: "website_competent_court", operator: "equals", value: "أخرى" }, requiredWhen: { fieldKey: "website_competent_court", operator: "equals", value: "أخرى" } },
  ] },
  { key: "website_communications", titleAr: "الإخطارات ووسائل التواصل", fields: [
    { key: "website_email_notices_enabled", type: "checkbox", labelAr: "اعتماد البريد الإلكتروني للإخطارات والمراسلات", printInDocument: false },
    { key: "website_notice_use_party_emails", type: "checkbox", labelAr: "استخدام نفس البريد الإلكتروني المسجل في بيانات الطرفين", visibleWhen: { fieldKey: "website_email_notices_enabled", operator: "truthy" }, printInDocument: false, helpText: "إذا ألغيت هذا الاختيار ستظهر حقول بريد مخصصة للإخطارات." },
    { key: "website_notice_client_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الأول (العميل)", visibleWhen: allConditions({ fieldKey: "website_email_notices_enabled", operator: "truthy" }, { fieldKey: "website_notice_use_party_emails", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "website_email_notices_enabled", operator: "truthy" }, { fieldKey: "website_notice_use_party_emails", operator: "falsy" }) },
    { key: "website_notice_provider_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الثاني (مقدم الخدمة)", visibleWhen: allConditions({ fieldKey: "website_email_notices_enabled", operator: "truthy" }, { fieldKey: "website_notice_use_party_emails", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "website_email_notices_enabled", operator: "truthy" }, { fieldKey: "website_notice_use_party_emails", operator: "falsy" }) },
    { key: "website_messaging_apps_enabled", type: "checkbox", labelAr: "اعتماد تطبيقات المراسلة الإلكترونية (مثل WhatsApp)", printInDocument: false },
    { key: "website_messaging_apps", type: "text", labelAr: "تطبيقات المراسلة المعتمدة", placeholder: "مثال: WhatsApp", visibleWhen: { fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_messaging_apps_enabled", operator: "truthy" } },
    { key: "website_messaging_use_party_phones", type: "checkbox", labelAr: "استخدام نفس أرقام الهاتف المسجلة في بيانات الطرفين", visibleWhen: { fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, printInDocument: false, helpText: "إذا ألغيت هذا الاختيار ستظهر أرقام مخصصة لتطبيقات المراسلة." },
    { key: "website_messaging_client_number", type: "text", labelAr: "رقم المراسلة المعتمد للطرف الأول (العميل)", visibleWhen: allConditions({ fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "website_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "website_messaging_use_party_phones", operator: "falsy" }) },
    { key: "website_messaging_provider_number", type: "text", labelAr: "رقم المراسلة المعتمد للطرف الثاني (مقدم الخدمة)", visibleWhen: allConditions({ fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "website_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "website_messaging_apps_enabled", operator: "truthy" }, { fieldKey: "website_messaging_use_party_phones", operator: "falsy" }) },
    { key: "website_project_platform_enabled", type: "checkbox", labelAr: "اعتماد منصة إلكترونية لإدارة المشروع", printInDocument: false },
    { key: "website_project_platform_name", type: "text", labelAr: "اسم منصة إدارة المشروع", visibleWhen: { fieldKey: "website_project_platform_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_project_platform_enabled", operator: "truthy" } },
    { key: "website_project_platform_link", type: "text", labelAr: "رابط المشروع أو الحساب على المنصة", visibleWhen: { fieldKey: "website_project_platform_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_project_platform_enabled", operator: "truthy" } },
  ] },
  { key: "website_optional_terms", titleAr: "بنود اختيارية", fields: [
    { key: "website_legal_fees_enabled", type: "checkbox", labelAr: "تحديد من يتحمل رسوم الدمغة والرسوم القانونية", printInDocument: false },
    { key: "website_legal_fees_payer", type: "radio", labelAr: "يتحمل الرسوم", visibleWhen: { fieldKey: "website_legal_fees_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_legal_fees_enabled", operator: "truthy" }, options: [
      { value: "الطرف الأول (العميل)", labelAr: "الطرف الأول (العميل)" }, { value: "الطرف الثاني (مقدم الخدمة)", labelAr: "الطرف الثاني (مقدم الخدمة)" }, { value: "الطرفان مناصفة", labelAr: "الطرفان مناصفة" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "website_legal_fees_other", type: "text", labelAr: "اتفاق آخر لتحمل الرسوم", visibleWhen: allConditions({ fieldKey: "website_legal_fees_enabled", operator: "truthy" }, { fieldKey: "website_legal_fees_payer", operator: "equals", value: "أخرى" }), requiredWhen: allConditions({ fieldKey: "website_legal_fees_enabled", operator: "truthy" }, { fieldKey: "website_legal_fees_payer", operator: "equals", value: "أخرى" }) },
  ] },
  { key: "website_witnesses", titleAr: "الشهود (اختياري)", fields: [
    { key: "website_witness_1_enabled", type: "checkbox", labelAr: "إضافة الشاهد الأول", printInDocument: false },
    { key: "website_witness_1_name", type: "text", labelAr: "اسم الشاهد الأول", visibleWhen: { fieldKey: "website_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "website_witness_1_national_id", type: "text", labelAr: "الرقم القومي للشاهد الأول", visibleWhen: { fieldKey: "website_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "website_witness_2_enabled", type: "checkbox", labelAr: "إضافة الشاهد الثاني", printInDocument: false },
    { key: "website_witness_2_name", type: "text", labelAr: "اسم الشاهد الثاني", visibleWhen: { fieldKey: "website_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_witness_2_enabled", operator: "truthy" }, printInDocument: false },
    { key: "website_witness_2_national_id", type: "text", labelAr: "الرقم القومي للشاهد الثاني", visibleWhen: { fieldKey: "website_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "website_witness_2_enabled", operator: "truthy" }, printInDocument: false },
  ] },
  reviewStep("website_review"),
];

const socialSteps: WizardStepDefinition[] = [
  { key: "social_contract_meta", titleAr: "بيانات العقد", fields: [contractDateField] },
  ...socialPartySteps(),
  { key: "social_project", titleAr: "بيانات ونطاق خدمة إدارة الحسابات", fields: [
    { key: "social_project_name", type: "text", labelAr: "اسم المشروع أو النشاط التجاري", required: true },
    { key: "social_brand_name", type: "text", labelAr: "العلامة التجارية - إن وجدت" },
    { key: "social_business_nature", type: "text", labelAr: "طبيعة النشاط", required: true },
    { key: "social_target_market", type: "text", labelAr: "الدولة أو النطاق الجغرافي المستهدف", required: true },
    { key: "social_target_audience", type: "textarea", labelAr: "الفئة المستهدفة", required: true },
    { key: "social_project_brief", type: "textarea", labelAr: "نبذة مختصرة عن المشروع (اختياري)" },
    { key: "social_managed_platforms", type: "textarea", labelAr: "المنصات والحسابات المشمولة بالخدمة", required: true, helpText: "حدد المنصات والحسابات التي اتفق الطرفان على إدارتها، مثل Facebook وInstagram وTikTok." },
    { key: "social_scope_summary", type: "textarea", labelAr: "الخدمات والمخرجات المتفق عليها", required: true, helpText: "حدد بوضوح الخدمات المشمولة مثل كتابة المحتوى، التصميم، النشر، التقارير، إدارة الرسائل أو الحملات. لا تُفترض أي خدمة غير مذكورة." },
    { key: "social_contact_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للتواصل مع المشروع", required: true },
    { key: "social_project_manager", type: "text", labelAr: "الشخص المسؤول عن المشروع", required: true },
    { key: "social_approval_person", type: "text", labelAr: "الشخص المسؤول عن الاعتماد", required: true },
    { key: "social_billing_contact", type: "text", labelAr: "الشخص المسؤول عن الفواتير أو المدفوعات", required: true },
    { key: "social_contract_duration", type: "text", labelAr: "مدة العقد / تقديم الخدمات", required: true, helpText: "مثال: 6 أشهر أو 12 شهرًا." },
    { key: "social_fee_nature", type: "select", labelAr: "طبيعة المقابل المالي", required: true, options: [
      { value: "إجمالي", labelAr: "إجمالي" },
      { value: "دوري", labelAr: "دوري" },
    ] },
    { key: "social_fee", type: "money", labelAr: "المقابل المالي المتفق عليه (جنيه مصري)", required: true, validation: { min: 1 }, helpText: "هذا هو المقابل بين العميل ومقدم الخدمة، وليس سعر شراء القالب من المنصة." },
    { key: "social_fee_words", type: "text", labelAr: "المقابل المالي كتابةً (بدون اسم العملة)", required: true, helpText: "مثال: عشرة آلاف. سيضيف العقد عبارة جنيه مصري تلقائيًا." },
    { key: "social_competent_court", type: "select", labelAr: "المحكمة المختصة (اختياري)", options: visualIdentityCourtOptions, helpText: "إذا لم تُحدد محكمة بعينها تُطبق قواعد الاختصاص المقررة قانونًا." },
    { key: "social_competent_court_other", type: "text", labelAr: "اسم المحكمة الأخرى", visibleWhen: { fieldKey: "social_competent_court", operator: "equals", value: "أخرى" }, requiredWhen: { fieldKey: "social_competent_court", operator: "equals", value: "أخرى" } },
  ] },
  { key: "social_delay_penalty", titleAr: "الجزاء الاتفاقي عن التأخير", fields: [
    { key: "social_delay_penalty_mode", type: "radio", labelAr: "طريقة احتساب الجزاء عن كل يوم تأخير", required: true, options: [
      { value: "amount", labelAr: "مبلغ ثابت بالجنيه المصري عن كل يوم تأخير" },
      { value: "percentage", labelAr: "نسبة من قيمة المرحلة عن كل يوم تأخير" },
    ], helpText: "النموذج الأصلي يوجب تحديد مبلغ ثابت أو نسبة من قيمة المرحلة، وليس الاثنين معًا." },
    { key: "social_delay_penalty_amount", type: "money", labelAr: "قيمة الجزاء عن كل يوم تأخير (جنيه مصري)", visibleWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "amount" }, requiredWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "amount" }, validation: { min: 1 } },
    { key: "social_delay_penalty_percentage", type: "number", labelAr: "نسبة الجزاء من قيمة المرحلة عن كل يوم تأخير (%)", visibleWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "percentage" }, requiredWhen: { fieldKey: "social_delay_penalty_mode", operator: "equals", value: "percentage" }, validation: { min: 0.01, max: 100 } },
    { key: "social_delay_penalty_cap_percentage", type: "number", labelAr: "الحد الأقصى لإجمالي الجزاء من قيمة الخدمة أو المرحلة (%)", required: true, validation: { min: 0.01, max: 100 } },
  ] },
  { key: "social_communications", titleAr: "الإخطارات وبيانات الاتصال المعتمدة", fields: [
    { key: "social_notice_use_party_emails", type: "checkbox", labelAr: "استخدام نفس البريد الإلكتروني المسجل في بيانات الطرفين", printInDocument: false, helpText: "البريد المعتمد للإخطارات إلزامي في العقد. إذا ألغيت هذا الاختيار تظهر حقول بريد مخصصة للطرفين وتصبح إلزامية." },
    { key: "social_notice_client_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الأول (العميل)", visibleWhen: { fieldKey: "social_notice_use_party_emails", operator: "falsy" }, requiredWhen: { fieldKey: "social_notice_use_party_emails", operator: "falsy" } },
    { key: "social_notice_provider_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للطرف الثاني (مقدم الخدمة)", visibleWhen: { fieldKey: "social_notice_use_party_emails", operator: "falsy" }, requiredWhen: { fieldKey: "social_notice_use_party_emails", operator: "falsy" } },
    { key: "social_messaging_use_party_phones", type: "checkbox", labelAr: "استخدام نفس أرقام الهاتف المسجلة في بيانات الطرفين للمراسلات الإلكترونية", printInDocument: false, helpText: "أرقام الاتصال المعتمدة إلزامية في العقد. إذا ألغيت هذا الاختيار تظهر أرقام مخصصة وتصبح إلزامية." },
    { key: "social_messaging_client_number", type: "text", labelAr: "رقم الاتصال المعتمد للطرف الأول (العميل)", visibleWhen: { fieldKey: "social_messaging_use_party_phones", operator: "falsy" }, requiredWhen: { fieldKey: "social_messaging_use_party_phones", operator: "falsy" } },
    { key: "social_messaging_provider_number", type: "text", labelAr: "رقم الاتصال المعتمد للطرف الثاني (مقدم الخدمة)", visibleWhen: { fieldKey: "social_messaging_use_party_phones", operator: "falsy" }, requiredWhen: { fieldKey: "social_messaging_use_party_phones", operator: "falsy" } },
  ] },
  { key: "social_optional_terms", titleAr: "بنود اختيارية", fields: [
    { key: "social_legal_fees_enabled", type: "checkbox", labelAr: "إضافة بند الرسوم والضرائب القانونية الاختياري", printInDocument: false },
  ] },
  { key: "social_witnesses", titleAr: "الشهود (اختياري)", fields: [
    { key: "social_witness_1_enabled", type: "checkbox", labelAr: "إضافة الشاهد الأول", printInDocument: false },
    { key: "social_witness_1_name", type: "text", labelAr: "اسم الشاهد الأول", visibleWhen: { fieldKey: "social_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "social_witness_1_national_id", type: "text", labelAr: "الرقم القومي للشاهد الأول", visibleWhen: { fieldKey: "social_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_witness_1_enabled", operator: "truthy" }, printInDocument: false },
    { key: "social_witness_2_enabled", type: "checkbox", labelAr: "إضافة الشاهد الثاني", printInDocument: false },
    { key: "social_witness_2_name", type: "text", labelAr: "اسم الشاهد الثاني", visibleWhen: { fieldKey: "social_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_witness_2_enabled", operator: "truthy" }, printInDocument: false },
    { key: "social_witness_2_national_id", type: "text", labelAr: "الرقم القومي للشاهد الثاني", visibleWhen: { fieldKey: "social_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "social_witness_2_enabled", operator: "truthy" }, printInDocument: false },
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
    { key: "website_pd_contact", type: "repeater", labelAr: "بيانات التواصل", blankRows: 7, blankRowLabels: [
      "مسؤول المشروع لدى الطرف الأول", "الصفة", "البريد الإلكتروني", "رقم الهاتف", "وسائل التواصل المعتمدة", "أوقات التواصل المفضلة", "ملاحظات",
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
    description: input.description,
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
  optionalClause({ key: "visual_identity_scope_annex", nameAr: "ملحق نطاق العمل والمخرجات الفنية", description: "قالب مستقل فارغ من بيانات المستخدم لتحديد الخدمات والمخرجات والمراجعات وجدول التنفيذ يدويًا.", title: "ملحق نطاق العمل والمخرجات الفنية", source: "ملحق رقم (1).pdf", variant: "visual_identity_design", steps: visualScopeSteps }),
  optionalClause({ key: "visual_identity_financial_annex", nameAr: "ملحق المقابل المالي وخطة التنفيذ", description: "قالب مستقل فارغ من بيانات المستخدم للقيمة والدفعات ووسائل السداد وشروط بدء التنفيذ.", title: "ملحق المقابل المالي وآلية السداد وخطة التنفيذ", source: "ملحق المقابل المالي وآلية السداد وخطة التنفيذ.pdf", variant: "visual_identity_design", steps: visualFinancialSteps }),
  optionalClause({ key: "visual_identity_approvals_annex", nameAr: "ملحق الاعتمادات وإدارة التنفيذ", description: "قالب مستقل فارغ من بيانات المستخدم لسجل المراحل والمراجعات والتعديلات والتسليم.", title: "ملحق الاعتمادات وإدارة التنفيذ", source: "الملحق رقم (3).pdf", variant: "visual_identity_design", steps: visualApprovalsSteps }),
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
      ...freelanceSourceClauseKeysByVariant.visual_identity_design.filter((key) => key !== "visual_identity_design_source_preface"),
      "visual_identity_email_contacts",
      "visual_identity_email_contacts_custom",
      "visual_identity_messaging_contacts",
      "visual_identity_messaging_contacts_custom",
    ],
    allowedOptionalClauseKeys: ["visual_identity_scope_annex", "visual_identity_financial_annex", "visual_identity_approvals_annex"],
    defaultFieldValues: {
      visual_client_party_type: "individual",
      visual_provider_party_type: "individual",
      visual_client_nationality: "مصري",
      visual_provider_nationality: "مصري",
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
    requiredAnnexKeys: ["website_scope_annex", "website_technical_annex", "website_project_data_annex", "website_delivery_annex"],
    defaultFieldValues: {
      website_client_party_type: "individual",
      website_provider_party_type: "individual",
      website_client_nationality: "مصري",
      website_provider_nationality: "مصري",
      website_duration_basis: "بأيام العمل، ما لم يتفق الطرفان كتابةً على احتسابها بالأيام التقويمية",
      website_confidentiality_years: 3,
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
      "social_media_email_contacts",
      "social_media_email_contacts_custom",
      "social_media_messaging_contacts",
      "social_media_messaging_contacts_custom",
      "social_media_legal_fees_clause",
    ],
    // The main source lists social-media annexes as optional. The PDF set supplied for this review
    // does not contain their authoritative originals; similarly named attachments belong to the
    // visual-identity contract. Keep the internal definitions for later source reconciliation,
    // but do not expose unverified legal annex text to customers in v6.
    allowedOptionalClauseKeys: [],
    defaultFieldValues: {
      social_client_party_type: "individual",
      social_provider_party_type: "individual",
      social_client_nationality: "مصري",
      social_provider_nationality: "مصري",
      social_fee_nature: "دوري",
      social_notice_use_party_emails: true,
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
        bodyAr: "عقد تطوير موقع إلكتروني (Website Development Agreement)\nإنه بتاريخ {{contract_date}}، تم إبرام هذا العقد بين الطرفين المبينة بياناتهما في صدر هذا العقد.",
      };
    case "website_development_source_section_02":
      return {
        ...base,
        titleAr: "المادة الأولى: أطراف العقد وبيانات المشروع",
        bodyAr: `تثبت بيانات الطرف الأول (العميل) والطرف الثاني (مقدم الخدمة / المطور) وبيانات المشروع في قسم بيانات العقد أعلاه، وتُعد جزءًا لا يتجزأ منه.
ويشار إلى الطرف الأول في هذا العقد بـ «الطرف الأول» أو «العميل»، وإلى الطرف الثاني بـ «الطرف الثاني» أو «مقدم الخدمة».
ويقر الطرف الأول بأن الشخص المحدد للاعتماد مخول بإصدار الموافقات المتعلقة بالمشروع، وتعتبر موافقاته نافذة في حدود نطاق المشروع.`,
      };
    case "website_development_source_section_10":
      return {
        ...base,
        titleAr: "المادة التاسعة: مدة التنفيذ",
        variables: ["website_execution_duration_value", "website_execution_duration_unit", "website_duration_basis"],
        bodyAr: `تبدأ مدة تنفيذ المشروع من التاريخ الذي يتفق عليه الطرفان، أو من تاريخ استيفاء جميع متطلبات بدء التنفيذ المنصوص عليها في هذا العقد وملحق بيانات المشروع وملحق نطاق العمل (SOW)، أيهما لاحق.
مدة تنفيذ المشروع هي ({{website_execution_duration_value}} {{website_execution_duration_unit}}).
تُحسب مدة التنفيذ {{website_duration_basis}}.
إذا تأخر الطرف الأول في تنفيذ أي من التزاماته، أو في تقديم البيانات أو المحتوى أو الاعتمادات أو بيانات الوصول أو أي متطلبات لازمة لبدء التنفيذ أو استكماله، أو في سداد أي دفعة مستحقة، توقفت مدة التنفيذ أو امتدت تلقائيًا بالقدر الذي يقابل مدة التأخير وآثاره الفعلية، دون أن يُعد ذلك إخلالًا من الطرف الثاني.
تمتد مدة التنفيذ كذلك إذا طرأت أوامر تعديل أو طلبات تطوير معتمدة، أو تم اعتماد اتفاقية التطويرات المستقبلية والأعمال الإضافية، إن وجدت، أو في حالات القوة القاهرة أو الظروف الطارئة، أو لأي سبب آخر يجيز هذا العقد أو القانون بسببه وقف التنفيذ أو تمديد مدته.
يلتزم الطرف الثاني بإخطار الطرف الأول، دون تأخير غير مبرر، إذا تبين له وجود أي سبب قد يؤثر في الالتزام بالمدة المتفق عليها، مع بيان أسبابه وآثاره المتوقعة على الجدول الزمني والإجراءات المقترحة للحد من أثره متى كان ذلك ممكنًا.
ولا يُعد الطرف الثاني متأخرًا في التنفيذ إذا كان التأخير ناشئًا عن سبب يرجع إلى الطرف الأول، أو إلى قوة قاهرة، أو إلى ظرف طارئ، أو إلى أي سبب آخر يجيز هذا العقد أو القانون معه وقف التنفيذ أو تمديد مدته.`,
      };
    case "website_development_source_section_11": {
      const rest = base.bodyAr.replace(/^[\s\S]*?(?=10-2\s*جدول الدفعات)/, "");
      return {
        ...base,
        titleAr: "المادة العاشرة: المقابل المالي وآلية السداد",
        variables: ["website_total_price", "website_total_price_words"],
        bodyAr: `10-1 قيمة العقد: يلتزم الطرف الأول بسداد مبلغ إجمالي قدره {{website_total_price}} جنيه مصري (فقط {{website_total_price_words}} جنيه مصري لا غير) مقابل تنفيذ الأعمال والخدمات والمخرجات محل هذا العقد، وذلك وفقًا لأحكام هذا العقد، وملحق نطاق العمل (SOW)، وملحق المواصفات الفنية (TS)، وسائر الملحقات المعتمدة وأوامر التعديل، إن وجدت.\n${rest}`,
      };
    }
    case "website_development_source_section_12":
      return {
        ...base,
        titleAr: "المادة الثانية عشرة: التسليم واعتماد الأعمال",
        bodyAr: `12-1 تسليم الأعمال: يلتزم الطرف الثاني بتسليم الأعمال أو المخرجات محل هذا العقد وفقًا للجدول الزمني ومراحل التنفيذ وآلية التسليم المتفق عليها في هذا العقد، وملحق نطاق العمل (SOW)، وملحق المواصفات الفنية (TS)، ومعايير القبول المحددة فيهما، وملحق محضر التسليم والاعتماد النهائي (DAR)، وذلك بالوسيلة المحددة فيها أو بأي وسيلة أخرى يعتمدها الطرفان كتابةً أو عبر البريد الإلكتروني المعتمد.
ويجوز أن يتم التسليم على مرحلة واحدة أو على مراحل مستقلة، بحسب ما هو مبين في ملحق نطاق العمل (SOW) أو الجدول الزمني المعتمد.
12-2 مراجعة الأعمال: يلتزم الطرف الأول بمراجعة الأعمال أو المخرجات المسلمة وإخطار الطرف الثاني كتابةً أو عبر البريد الإلكتروني المعتمد بقبولها أو برفضها، مع بيان جميع الملاحظات الجوهرية بصورة واضحة ومحددة، وذلك خلال المدة المتفق عليها، أو خلال خمسة (5) أيام عمل من تاريخ التسليم إذا لم يتفق الطرفان على مدة أخرى.
ويجب أن تتضمن الملاحظات بيانًا واضحًا لأوجه عدم المطابقة لملحق نطاق العمل (SOW) أو ملحق المواصفات الفنية (TS) أو معايير القبول والاختبارات المثبتة فيهما أو في محضر التسليم والاعتماد النهائي (DAR)، ولا يُعتد بأي اعتراض أو ملاحظات عامة أو غير محددة أو غير مبررة فنيًا.
ويلتزم الطرف الأول بإبداء جميع الملاحظات الجوهرية التي وقف عليها خلال مدة المراجعة، ولا يجوز له تجزئتها أو تقديمها على دفعات متتابعة إذا كانت معلومة له وقت الفحص، ويستثنى من ذلك العيوب الخفية التي يتعذر اكتشافها بالفحص المعتاد.
12-3 معالجة الملاحظات الجوهرية: إذا أبدى الطرف الأول، خلال المدة المقررة، ملاحظات تتعلق بعدم مطابقة الأعمال لملحق نطاق العمل (SOW) أو ملحق المواصفات الفنية (TS) أو معايير القبول والاختبارات المعتمدة، التزم الطرف الثاني بمعالجتها خلال مدة معقولة تتناسب مع طبيعتها، ثم إعادة تسليم الأعمال أو الجزء محل الملاحظات. وتسري على كل إعادة تسليم ذات إجراءات المراجعة والاعتماد المنصوص عليها في هذه المادة وملحق محضر التسليم والاعتماد النهائي (DAR)، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
ويجوز للطرفين الاتفاق في هذا العقد أو في ملحق محضر التسليم والاعتماد النهائي (DAR) على تحديد عدد محاولات معالجة الملاحظات الجوهرية، على أن يكون عددها ثلاث (3) محاولات. فإذا استنفد الطرف الثاني عدد محاولات المعالجة المتفق عليها واستمرت الملاحظات الجوهرية المتعلقة بذات الأعمال أو المرحلة محل التسليم، جاز للطرف الأول، بعد إخطار الطرف الثاني، ممارسة الحقوق المقررة له بموجب هذا العقد أو القانون، بحسب الأحوال.
12-4 الملاحظات غير الجوهرية: إذا اقتصرت الملاحظات على عيوب أو ملاحظات طفيفة لا تؤثر في تشغيل المشروع أو استخدام المرحلة محل التسليم للغرض المتفق عليه، ولا تمثل مخالفة جوهرية لنطاق العمل أو المواصفات الفنية أو معايير القبول المعتمدة، فلا يجوز للطرف الأول الامتناع عن اعتماد الأعمال أو تأخير استحقاق الدفعة المالية بسببها. ويلتزم الطرف الثاني بمعالجة تلك الملاحظات خلال مدة معقولة يتفق عليها الطرفان، أو خلال مدة الضمان إذا كانت داخلة في نطاقها، دون أن يؤثر ذلك على اعتماد المرحلة أو استحقاق المقابل المالي المرتبط بها.
12-5 الأعمال الإضافية: لا تُعد طلبات إضافة خصائص جديدة، أو تحسينات، أو تعديلات على التصميم أو تجربة المستخدم أو الأداء، أو أي تغيير يجاوز ملحق نطاق العمل (SOW) أو ملحق المواصفات الفنية (TS) أو معايير القبول المعتمدة، من قبيل ملاحظات التسليم، وإنما تُعد أعمالًا إضافية تخضع لأحكام المادة الحادية عشرة الخاصة بتعديل نطاق العمل وإجراءات التعديل، واتفاقية التطويرات المستقبلية والأعمال الإضافية إن تم اعتمادها. ولا يجوز للطرف الأول رفض اعتماد الأعمال بسبب طلبات أو ملاحظات لا تدخل ضمن نطاق العمل المتفق عليه.
12-6 حالات الاعتماد: تُعد الأعمال أو المرحلة محل التسليم معتمدة إذا اعتمدها الطرف الأول صراحةً كتابةً أو عبر البريد الإلكتروني المعتمد، أو أخطر الطرف الثاني بخلوها من ملاحظات جوهرية، أو انقضت مدة المراجعة دون اعتراض جوهري مسبب، أو اقتصر الاعتراض على ملاحظات غير جوهرية أو أعمال إضافية، أو قام الطرف الأول بتشغيل الأعمال أو نشرها في بيئة الإنتاج أو إتاحتها للمستخدمين النهائيين أو استغلالها فعليًا بما يدل على قبولها، ما لم يكن الاستخدام للاختبارات أو التجارب المتفق عليها خلال مدة المراجعة.
12-7 أثر الاعتماد: يترتب على اعتماد الأعمال أو المرحلة اعتبارها منجزة وفقًا للعقد، واستحقاق الدفعة المرتبطة بها إن وجدت، والانتقال إلى المرحلة التالية متى كان ذلك مقررًا، وبدء مدة الضمان وفقًا لأحكام العقد وما يثبته محضر التسليم والاعتماد النهائي (DAR). ولا يخل الاعتماد بحق الطرف الأول في المطالبة بإصلاح العيوب البرمجية التي تظهر خلال مدة الضمان في حدود أحكام العقد أو اتفاقية الصيانة والدعم الفني ومستويات الخدمة (SLA) إن تم اعتمادها.
12-8 إثبات التسليم والاعتماد: يتم إثبات واقعة التسليم والاعتماد والملاحظات والإجراءات المتعلقة بها من خلال محضر التسليم والاعتماد النهائي (DAR)، ويجوز استكمال أو توثيق تلك الإجراءات بمحضر مستقل أو عبر البريد الإلكتروني المعتمد أو نظام إدارة المشروع أو أي منصة إلكترونية أو وسيلة تقنية يعتمدها الطرفان متى أمكن التحقق من صدورها ونسبتها إلى الطرف المعني.`,
      };
    case "website_development_source_section_13": {
      const body = base.bodyAr.replace(
        /13-7\s*عرض المشروع ضمن الأعمال السابقة:[\s\S]*?(?=13-8)/,
        "13-7 عرض المشروع ضمن الأعمال السابقة: لا يجوز للطرف الثاني استخدام اسم الطرف الأول أو علامته التجارية أو شعاره أو اسم المشروع أو أي جزء من مخرجاته، أو عرض اسم المشروع أو شعاره أو لقطات منه ضمن معرض الأعمال (Portfolio) أو الأغراض التسويقية، إلا بعد الحصول على موافقة كتابية مسبقة من الطرف الأول، ودون الإفصاح عن أي معلومات سرية أو بيانات غير معلنة تخصه.\n",
      );
      return { ...base, titleAr: "المادة الثالثة عشرة: حقوق الملكية الفكرية", bodyAr: body };
    }
    case "website_development_source_section_14":
      return {
        ...base,
        titleAr: "المادة الرابعة عشرة: الضمان والدعم الفني",
        variables: ["website_warranty_duration_value", "website_warranty_duration_unit"],
        bodyAr: `14-1 ضمان مطابقة الأعمال: يضمن الطرف الثاني أن الأعمال والمخرجات محل هذا العقد، وقت اعتمادها وتسليمها، مطابقة لنطاق العمل والمواصفات الفنية ومعايير القبول وأحكام هذا العقد وملحقاته، وأنها قد نُفذت وفقًا للأصول الفنية والمهنية المتعارف عليها في مجال تطوير المواقع الإلكترونية. ويقتصر هذا الضمان على إصلاح العيوب البرمجية أو الفنية التي تجعل المخرجات غير مطابقة لما تم الاتفاق عليه، ولا يُعد ضمانًا لتحقيق أي نتائج تجارية أو مالية أو تسويقية أو تشغيلية للطرف الأول.
14-2 مدة الضمان: تبدأ مدة الضمان من تاريخ اعتماد الأعمال أو المرحلة محل التسليم وفقًا لأحكام هذا العقد، وتكون مدتها ({{website_warranty_duration_value}} {{website_warranty_duration_unit}})، ما لم يتفق الطرفان كتابةً على مدة أخرى. ويجوز الاتفاق على مدد ضمان مختلفة لمراحل المشروع إذا تم النص على ذلك صراحةً في ملحق نطاق العمل (SOW) أو ملحق بيانات المشروع.
14-3 نطاق الضمان: يلتزم الطرف الثاني، خلال مدة الضمان، بإصلاح أي عيب برمجي أو فني يثبت أنه ناتج عن عدم مطابقة الأعمال لنطاق العمل أو المواصفات الفنية أو معايير القبول المتفق عليها، وذلك دون مقابل إضافي. ويحق للطرف الثاني فحص العيب المبلغ عنه والتحقق من سببه قبل اعتباره مشمولًا بالضمان.
14-4 الإبلاغ عن العيوب: يلتزم الطرف الأول بإخطار الطرف الثاني بأي عيب يكتشفه خلال مدة الضمان، مع بيان وصف العيب وكيفية ظهوره والبيانات اللازمة لإعادة إنتاجه، وذلك وفقًا لوسائل الإخطار المنصوص عليها في هذا العقد. ويلتزم الطرف الثاني، بعد التحقق من أن العيب مشمول بالضمان، بالبدء في معالجته خلال مدة معقولة تتناسب مع طبيعة العيب ودرجة تأثيره، أو وفقًا لما هو منصوص عليه في اتفاقية الصيانة والدعم الفني ومستويات الخدمة (SLA)، إن وجدت.
14-5 ما لا يشمله الضمان: لا يشمل الضمان: أ. أي أعمال إضافية أو تطويرات أو تحسينات أو خصائص جديدة أو تعديلات على التصميم أو تجربة المستخدم أو الأداء لم تدخل ضمن نطاق العمل أو المواصفات الفنية. ب. أي أعطال أو أخطاء أو تلف ينشأ عن تعديل أو حذف أو إضافة أو إعادة برمجة أو تدخل في المخرجات من قبل الطرف الأول أو أي شخص أو جهة غير مصرح لها من الطرف الثاني. ج. الأعطال الناتجة عن سوء الاستخدام أو مخالفة تعليمات التشغيل أو استخدام المشروع على نحو يخالف الغرض المتفق عليه. د. الأعطال الناتجة عن بيئة الاستضافة أو الخوادم أو قواعد البيانات أو الشبكات أو خدمات الإنترنت أو أسماء النطاقات أو شهادات الحماية (SSL) أو خدمات البريد الإلكتروني أو الخدمات السحابية أو أي خدمات مقدمة من الغير، ما لم يكن الطرف الثاني مسؤولًا عنها بموجب هذا العقد أو اتفاقية الصيانة والدعم الفني ومستويات الخدمة (SLA)، إن وجدت. هـ. الأعطال الناتجة عن تحديثات أنظمة التشغيل أو المتصفحات أو الأجهزة أو خدمات الطرف الثالث أو واجهات برمجة التطبيقات (APIs) أو خدمات الذكاء الاصطناعي أو أي تغييرات لاحقة لا يملك الطرف الثاني السيطرة عليها. و. الأعطال الناتجة عن بيانات أو محتوى أو ملفات أو برامج أو إضافات أو مكونات أو أدوات قدمها الطرف الأول أو ألزم باستخدامها. ز. الأعطال أو الأضرار الناتجة عن القوة القاهرة أو الظروف الطارئة أو أي سبب أجنبي لا يد للطرف الثاني فيه.
14-6 الدعم الفني والصيانة: لا يلتزم الطرف الثاني بتقديم أي خدمات دعم فني أو صيانة أو تحديثات أو تطويرات أو مراقبة تشغيلية بعد انتهاء مدة الضمان، إلا إذا اتفق الطرفان على ذلك صراحةً بموجب اتفاقية الصيانة والدعم الفني ومستويات الخدمة (SLA)، إن وجدت، والتي تحدد نطاق الخدمات ومدتها ومستويات الخدمة والمقابل المالي وأي شروط أخرى يتفق عليها الطرفان.
14-7 أثر أعمال الضمان: لا يترتب على تنفيذ أعمال الضمان أو إصلاح أي عيب تمديد مدة الضمان الأصلية أو تجديدها، ما لم يتفق الطرفان كتابةً على خلاف ذلك. كما لا يُعد تنفيذ أعمال الضمان أو إصلاح أي عيب إقرارًا من الطرف الثاني بمسؤوليته عن أي أعمال أو خدمات أو أضرار لا يشملها نطاق الضمان المنصوص عليه في هذا العقد.`,
      };
    case "website_development_source_section_16":
      return {
        ...base,
        titleAr: "المادة السادسة عشرة: السرية وعدم الإفصاح",
        variables: ["website_confidentiality_years"],
        bodyAr: base.bodyAr.replace(/\(مدة السرية بعد انتهاء العقد[^)]*\)/g, "({{website_confidentiality_years}} سنوات)"),
      };
    case "website_development_source_section_20": {
      let body = base.bodyAr
        .replace(/بريد الطرف الأول\s*\(العميل\)[^\n]*\n?/g, "")
        .replace(/بريد الطرف الثاني\s*\(مقدم الخدمة\)[^\n]*\n?/g, "")
        .replace(/هاتف الطرف الأول\s*\(العميل\)[^\n]*\n?/g, "")
        .replace(/هاتف الطرف الثاني\s*\(مقدم الخدمة\)[^\n]*\n?/g, "")
        .replace(/اسم المنصة[^\n]*\n?/g, "")
        .replace(/رابط المشروع أو الحساب[^\n]*\n?/g, "")
        .replace(/^\)+\s*\(:?\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n");
      body += "\nوتُثبت بيانات البريد الإلكتروني أو تطبيقات المراسلة أو منصة إدارة المشروع التي يعتمدها الطرفان - إن وجدت - في قسم «الإخطارات ووسائل التواصل» من بيانات هذا العقد.";
      return { ...base, titleAr: "المادة العشرون: الإخطارات والموطن المختار", bodyAr: body.trim() };
    }
    case "website_development_source_section_21": {
      const replacement = `21-3 الاختصاص القضائي: مع مراعاة قواعد الاختصاص الولائي والنوعي المتعلقة بالنظام العام، إذا حدد الطرفان محكمة مختصة ضمن بيانات هذا العقد فتختص المحكمة المحددة الابتدائية وجزئياتها بنظر والفصل في جميع المنازعات الناشئة عن هذا العقد أو المرتبطة به، وذلك في الحدود التي يجيزها القانون. وفي حال عدم تحديد محكمة بعينها، تختص المحاكم المصرية المختصة نوعيًا ومكانيًا وفقًا لقواعد الاختصاص المقررة قانونًا.\n`;
      const body = base.bodyAr.replace(/21-3\s*الاختصاص القضائي:[\s\S]*?(?=21-4\s*المنازعات الفنية:)/, replacement);
      return { ...base, titleAr: "المادة الحادية والعشرون: القانون الواجب التطبيق وتسوية المنازعات", bodyAr: body.trim() };
    }
    case "website_development_source_section_22": {
      let body = base.bodyAr.replace(/22-15\s*رسوم الدمغة والرسوم القانونية[\s\S]*$/m, "").trim();
      body += `\n22-15 رسوم الدمغة والرسوم القانونية (بند اختياري): إذا اتفق الطرفان على تفعيل هذا البند، يلتزمان بسداد الرسوم أو الضرائب أو المصروفات القانونية التي قد تفرض على هذا العقد أو على تحريره أو إثبات تاريخه أو توثيقه أو أي إجراء قانوني مرتبط به، وذلك وفقًا للقوانين واللوائح السارية، ويكون توزيع تحمل تلك الرسوم وفق الاختيار المثبت في قسم «بنود اختيارية» من بيانات العقد.`;
      return { ...base, titleAr: "المادة الثانية والعشرون: الأحكام العامة", bodyAr: body };
    }
    case "website_development_source_section_23": {
      const markers = ["الطرف الثاني (مقدم الخدمة / المطور)", "الطرف الثاني ( مقدم الخدمة /المطور)"];
      let body = base.bodyAr;
      for (const marker of markers) {
        const at = body.indexOf(marker);
        if (at >= 0) body = body.slice(0, at).trim();
      }
      return { ...base, titleAr: "المادة الثالثة والعشرون: التوقيعات", bodyAr: body };
    }
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
      return { ...base, titleAr: "بيانات وتمهيد المستند", variables: ["contract_date"], bodyAr: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي (Social Media Management Services Agreement)\nإنه بتاريخ {{contract_date}}، تم إبرام هذا العقد بين الطرفين المبينة بياناتهما في صدر هذا العقد." };
    case "social_media_management_source_section_02":
      return { ...base, titleAr: "المادة الأولى: أطراف العقد وبيانات الخدمة", bodyAr: `تثبت بيانات الطرف الأول (العميل) والطرف الثاني (مقدم الخدمة)، وبيانات المشروع أو النشاط، والمنصات والحسابات المشمولة، ونطاق الخدمات والمخرجات المتفق عليها في قسم بيانات العقد أعلاه، وتُعد جزءًا لا يتجزأ منه.
ويشار إلى الطرف الأول في هذا العقد بـ «الطرف الأول» أو «العميل»، وإلى الطرف الثاني بـ «الطرف الثاني» أو «مقدم الخدمة».
ويُقر كل طرف بأنه يتمتع بالأهلية والصفة القانونية اللازمة لإبرام هذا العقد، وأن جميع البيانات والمستندات المقدمة منه صحيحة وسارية وقت التوقيع، ويلتزم بإخطار الطرف الآخر كتابةً بأي تعديل يطرأ عليها خلال مدة سريان العقد.
ويقر الطرف الأول بأن الشخص المحدد للاعتماد مخول بإصدار الموافقات المتعلقة بالخدمات محل العقد في حدود صلاحياته.
وتُحدد طبيعة هذا العقد حصريًا بخدمات إدارة حسابات ومنصات التواصل الاجتماعي؛ ولا تُعتد قائمة أنواع مشروعات الويب الواردة بطريق الخطأ في نموذج المصدر لتحديد موضوع هذا العقد.` };
    case "social_media_management_source_section_10":
      return { ...base, titleAr: "المادة التاسعة: مدة العقد وبدء تقديم الخدمات", variables: ["social_contract_duration"], bodyAr: base.bodyAr.replace(/9-2\s*مدة العقد:[\s\S]*?(?=9-3\s*استمرار تقديم الخدمات)/, `9-2 مدة العقد: تكون مدة هذا العقد ({{social_contract_duration}})، تبدأ من تاريخ بدء تقديم الخدمات، ما لم يتفق الطرفان كتابةً على تاريخ آخر، وتظل جميع أحكام هذا العقد نافذة طوال مدة سريانه وحتى انتهاء جميع الالتزامات الناشئة عنه أو تسويتها وفقًا لأحكامه.\n`) };
    case "social_media_management_source_section_11": {
      const rest = base.bodyAr.replace(/^[\s\S]*?(?=10-2\s*استحقاق المقابل المالي)/, "");
      return { ...base, titleAr: "المادة العاشرة: المقابل المالي وآلية السداد", variables: ["social_fee_nature", "social_fee", "social_fee_words"], bodyAr: `10-1 قيمة المقابل المالي: يلتزم الطرف الأول بسداد مقابل مالي {{social_fee_nature}} قدره {{social_fee}} جنيه مصري، فقط ({{social_fee_words}} جنيه مصري لا غير)، نظير تنفيذ الخدمات والمخرجات المحددة في هذا العقد وفي نطاق الخدمات المتفق عليه بين الطرفين. ولا يشمل المقابل أي أعمال أو خدمات إضافية غير متفق عليها إلا بموجب اعتماد كتابي وفقًا لأحكام هذا العقد.\n${rest}` };
    }
    case "social_media_management_source_section_12": return { ...base, titleAr: "المادة الحادية عشرة: تعديل نطاق الخدمات وإجراءات التعديل" };
    case "social_media_management_source_section_13": return { ...base, titleAr: "المادة الحادية عشرة: تعديل نطاق الخدمات وإجراءات التعديل (تابع)" };
    case "social_media_management_source_section_15": {
      const body = base.bodyAr.replace(/13-8\s*عرض الأعمال في معرض الأعمال والتسويق:[\s\S]*?(?=13-9)/, "13-8 عرض الأعمال في معرض الأعمال والتسويق: لا يجوز للطرف الثاني استخدام اسم الطرف الأول أو علامته التجارية أو شعاره أو محتواه أو حملاته أو نتائجه، أو الإشارة إلى العلاقة التعاقدية أو عرض الأعمال أو النماذج أو المواد المنفذة ضمن معرض الأعمال (Portfolio) أو الموقع الإلكتروني أو وسائل التسويق أو العروض التجارية، إلا بعد الحصول على موافقة كتابية مسبقة من الطرف الأول، ودون الإفصاح عن أي معلومات سرية أو بيانات غير معلنة تخصه.\n");
      return { ...base, titleAr: "المادة الثالثة عشرة: حقوق الملكية الفكرية", bodyAr: body };
    }
    case "social_media_management_source_section_18": return { ...base, titleAr: "المادة السادسة عشرة: السرية وعدم الإفصاح" };
    case "social_media_management_source_section_22":
      return { ...base, titleAr: "المادة العشرون: الإخطارات ووسائل الاتصال والموطن المختار", bodyAr: `20-1 الموطن المختار: يُعد العنوان المبين في صدر هذا العقد موطنًا مختارًا لكل طرف، وتوجه إليه جميع الإخطارات والإنذارات والمراسلات الرسمية المتعلقة بهذا العقد، وتنتج آثارها القانونية وفقًا للقواعد والإجراءات المقررة قانونًا.
20-2 وسائل الإخطار المعتمدة: يجوز للطرفين تبادل الإخطارات والمراسلات والاعتمادات والمستندات المتعلقة بتنفيذ هذا العقد من خلال الموطن المختار، والبريد الإلكتروني المعتمد، وتطبيقات المراسلة الإلكترونية المعتمدة بين الطرفين، وأي وسيلة اتصال أخرى يتفق عليها الطرفان كتابةً. وتكون المراسلات المتبادلة عبر الوسائل المعتمدة منتجة لآثارها متى أمكن التحقق من صدورها ونسبتها إلى مرسلها وسلامة محتواها.
20-3 بيانات الاتصال المعتمدة: تثبت بيانات البريد الإلكتروني وأرقام الهاتف المعتمدة للطرفين في قسم «الإخطارات وبيانات الاتصال المعتمدة» من بيانات العقد، ويلتزم كل طرف بإخطار الطرف الآخر بأي تغيير يطرأ عليها وفقًا لأحكام هذا العقد.
20-4 استخدام المراسلات الإلكترونية: يجوز استخدام البريد الإلكتروني وتطبيقات المراسلة الإلكترونية المتفق عليها بين الطرفين لتبادل التعليمات الفنية والملاحظات والملفات والاعتمادات المتعلقة بتنفيذ الخدمات. ولا يترتب على تلك المراسلات تعديل أي حكم جوهري في هذا العقد أو نطاق الخدمات أو المقابل المالي أو مدة التنفيذ إلا بموافقة صريحة من الطرفين وفقًا لإجراءات التعديل الواردة بالعقد.
20-5 وقت استلام الإخطار الإلكتروني: يُعد الإخطار أو المراسلة الإلكترونية مستلمة ومنتجة لآثارها من تاريخ إرسالها إلى وسيلة الاتصال المعتمدة، ما لم يثبت تعذر وصولها بسبب عطل فني خارج عن إرادة المرسل إليه. ولا يؤثر عدم فتح الرسالة أو عدم الاطلاع عليها، متى ثبت إرسالها إلى وسيلة الاتصال المعتمدة، على آثارها القانونية، مع مراعاة أي إجراءات خاصة يوجبها القانون لبعض الإخطارات.` };
    case "social_media_management_source_section_23":
      return { ...base, titleAr: "المادة الحادية والعشرون: القانون الواجب التطبيق وتسوية المنازعات", bodyAr: base.bodyAr.replace(/21-3\s*الاختصاص القضائي:[\s\S]*?(?=21-4\s*المنازعات الفنية)/, `21-3 الاختصاص القضائي: مع مراعاة قواعد الاختصاص الولائي والنوعي والمكاني المتعلقة بالنظام العام، إذا حدد الطرفان محكمة مختصة في بيانات هذا العقد فتختص المحكمة المحددة الابتدائية وجزئياتها — بحسب الأحوال — بنظر المنازعات الناشئة عن العقد أو المرتبطة به في الحدود التي يجيزها القانون. وفي حال عدم تحديد محكمة بعينها، أو تعذر انعقاد الاختصاص للمحكمة المختارة قانونًا، يكون الاختصاص للمحاكم المصرية المختصة وفقًا لقواعد الاختصاص المقررة في التشريعات النافذة.\n`) };
    case "social_media_management_source_section_24": {
      const body = base.bodyAr
        .replace(/22-11\s*عدد النسخ:[\s\S]*?(?=22-12\s*اللغة المعتمدة)/u, "22-11 عدد النسخ: يجوز تحرير هذا العقد من نسخ أصلية أو إلكترونية متطابقة، ويحتفظ كل طرف بنسخة للعمل بموجبها، وتكون لجميع النسخ ذات الحجية القانونية متى ثبتت صحتها ونسبتها إلى أطرافها. ويجوز توقيع العقد على نسخ منفصلة أو إلكترونية، ويُعد مجموعها عقدًا واحدًا منتجًا لجميع آثاره القانونية.\n")
        .replace(/22-16\s*الرسوم والضرائب القانونية[\s\S]*$/u, "")
        .trim();
      return { ...base, titleAr: "المادة الثانية والعشرون: الأحكام العامة", bodyAr: body };
    }
    case "social_media_management_source_section_25": {
      const markers = ["وتوقيعات الأطراف", "وتوقيعات األطراف", "الطرف الثاني (مقدم الخدمة)", "الطرف الثاني ( مقدم الخدمة )"];
      let body = base.bodyAr;
      for (const marker of markers) { const at = body.indexOf(marker); if (at >= 0) body = body.slice(0, at).trim(); }
      return { ...base, titleAr: "المادة الثالثة والعشرون: التوقيعات", bodyAr: body };
    }
    default: return base;
  }
}

const reviewedIdentityMainClauseOverrides: Record<string, Partial<LegalClauseDefinition>> = {
  visual_identity_design_source_section_03: {
    titleAr: "المادة الثالثة: محل العقد",
    bodyAr: `يتمثل محل هذا العقد في التزام الطرف الثاني بتقديم خدمات تصميم الهوية البصرية الخاصة بالمشروع أو العلامة التجارية أو النشاط محل الاتفاق، وذلك وفقًا لأحكام هذا العقد وفي حدود نطاق الخدمات المتفق عليها بين الطرفين.
تشمل خدمات تصميم الهوية البصرية، بحسب ما يتم الاتفاق عليه بين الطرفين، تصميم أو تطوير الشعار، واختيار الألوان والخطوط، وإعداد العناصر والأنماط البصرية، وتصميم المطبوعات أو القوالب أو الأصول الرقمية، وإعداد دليل الهوية البصرية، وأي خدمات أخرى مرتبطة بالهوية البصرية يتفق الطرفان كتابةً على إدراجها ضمن نطاق هذا العقد.
يقتصر التزام الطرف الثاني على تنفيذ الخدمات والمخرجات المتفق عليها، ولا يمتد التزامه إلى أي أعمال أو خدمات أو متطلبات إضافية لم يرد النص عليها في هذا العقد أو لم يتم الاتفاق عليها كتابةً بين الطرفين.
ولا تُعد الطلبات أو التعليمات أو الملاحظات أو المراسلات المتبادلة أثناء تنفيذ المشروع، بذاتها، سببًا في إضافة خدمات جديدة أو تعديل نطاق الخدمات أو ترتيب أي التزامات إضافية، إلا إذا تضمنت اتفاقًا واضحًا ومكتوبًا بين الطرفين يحدد أثرها على نطاق العمل أو المقابل المالي أو مدة التنفيذ.
ويجوز للطرفين أثناء تنفيذ العقد الاتفاق كتابةً على إضافة أو استبعاد أو تعديل أي من الخدمات محل العقد، على أن يحدد الاتفاق ما يترتب على ذلك — إن وجد — من آثار على المقابل المالي أو مدة التنفيذ أو أي التزامات أخرى.
وإذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_10: {
    titleAr: "المادة العاشرة: المراجعات والتعديلات",
    bodyAr: `يحق للطرف الأول طلب إجراء المراجعات أو التعديلات على الأعمال محل هذا العقد في الحدود المتفق عليها بين الطرفين، وذلك خلال مراحل التنفيذ أو خلال المدة المحددة للمراجعة والاعتماد، بحسب طبيعة المشروع وما يتم الاتفاق عليه.
يلتزم الطرف الأول بتقديم ملاحظاته وطلباته المتعلقة بالمراجعة بصورة واضحة ومجمعة قدر الإمكان لكل مرحلة من مراحل العمل، بما يسمح للطرف الثاني بتنفيذها بصورة منظمة، ولا تُعد الطلبات الجديدة أو الملاحظات التي تختلف جوهريًا عن الملاحظات السابقة ضمن نطاق المراجعة ذاتها.
تقتصر المراجعات والتعديلات على تحسين أو تعديل الأعمال الداخلة ضمن نطاق الخدمات المتفق عليها، ولا تشمل إعادة تصميم المشروع بالكامل، أو تغيير الاتجاه الأساسي أو الرؤية التصميمية بعد اعتمادها، أو إضافة خدمات أو أعمال جديدة غير مشمولة بالعقد.
إذا طلب الطرف الأول إجراء تعديلات أو إضافات يترتب عليها زيادة جوهرية في حجم الأعمال، أو تغيير نطاق الخدمات، أو تمديد مدة التنفيذ، أو زيادة التكلفة، فلا يلتزم الطرف الثاني بتنفيذها إلا بعد اتفاق الطرفين كتابةً على نطاقها وما يترتب عليها من آثار على المقابل المالي أو مدة التنفيذ أو أي التزامات أخرى.
يُعد اعتماد الطرف الأول لأي مرحلة من مراحل العمل أو لأي مخرج من المخرجات المتفق عليها موافقةً على الجزء الذي تم اعتماده في حدود نطاقه، ولا يلتزم الطرف الثاني بإجراء تعديلات جوهرية لاحقة عليه إلا بموجب اتفاق مكتوب بين الطرفين.
لا يترتب على طلب المراجعات أو تنفيذ التعديلات أي أثر على أحكام الملكية الفكرية أو انتقال الحقوق أو التراخيص المقررة بموجب هذا العقد، وتظل تلك الحقوق خاضعة للأحكام المنظمة لها.
وإذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_11: {
    titleAr: "المادة الحادية عشرة: حقوق الملكية الفكرية وحقوق الاستخدام",
    bodyAr: `تظل حقوق الملكية الفكرية المتعلقة بالأعمال والتصميمات والملفات والمقترحات والمسودات التي يقوم الطرف الثاني بإنتاجها أو إعدادها أثناء تنفيذ هذا العقد مملوكة له، ولا تنتقل أي حقوق عليها إلى الطرف الأول إلا في حدود ما يتم الاتفاق عليه صراحةً بين الطرفين وبعد سداد كامل المقابل المالي المستحق، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
بعد سداد الطرف الأول كامل المقابل المالي المستحق، تنتقل إليه الحقوق المتعلقة بالمخرجات النهائية المعتمدة والمدفوعة فقط، وذلك في الحدود التي يتفق عليها الطرفان، سواء كان ذلك بنقل بعض أو كل الحقوق أو بمنحه حق استخدام أو استغلال، وفقًا لأحكام هذا العقد.
لا تشمل الحقوق الممنوحة للطرف الأول أي مسودات أو نماذج أولية أو أفكار أو مقترحات أو أعمال غير معتمدة أو غير مدفوعة، وتظل تلك العناصر مملوكة للطرف الثاني ما لم يتفق الطرفان كتابةً على خلاف ذلك.
لا يلتزم الطرف الثاني بتسليم الملفات المصدر أو ملفات العمل الأصلية أو الملفات القابلة للتعديل أو الأدوات المستخدمة في إنتاج التصميم، إلا إذا تم الاتفاق كتابةً على ذلك، ويحدد هذا الاتفاق نطاق التسليم وأثره المالي — إن وجد.
لا يجوز للطرف الأول قبل انتقال الحقوق إليه استخدام أو نشر أو تعديل أو إعادة إنتاج أو التصرف في الأعمال محل العقد إلا في الحدود المسموح بها بموجب هذا العقد أو بموافقة كتابية من الطرف الثاني.
يضمن الطرف الثاني، في حدود الأعمال والعناصر التي قام بإنتاجها بنفسه، عدم تعمد استخدام أو نسخ أعمال الغير على نحو يشكل اعتداءً على حقوق الملكية الفكرية الخاصة بهم، ولا تمتد هذه المسؤولية إلى أي مواد أو ملفات أو عناصر أو محتوى يقدمه الطرف الأول أو يطلب استخدامه.
إذا تطلب تنفيذ المشروع استخدام أي خطوط أو صور أو عناصر تصميمية أو تراخيص أو خدمات مقدمة من الغير، فتظل هذه العناصر خاضعة لشروط وأحكام الجهات المالكة أو المرخصة لها، ولا تنتقل إلى الطرف الأول أي حقوق تتجاوز نطاق تلك التراخيص، ويتحمل كل طرف مسؤولياته وفقًا لما يتم الاتفاق عليه بينهما.
يجوز للطرف الثاني عرض الأعمال النهائية المعتمدة ضمن معرض أعماله أو ملفه المهني أو لأغراضه التسويقية، ما لم يتفق الطرفان كتابةً على خلاف ذلك أو تتطلب طبيعة المشروع أو التزامات السرية عدم عرضها.
وإذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_12: {
    titleAr: "المادة الثانية عشرة: السرية وعدم الإفصاح",
    bodyAr: `يلتزم كل طرف بالحفاظ على سرية جميع المعلومات والبيانات والمستندات والملفات والرسومات والتصميمات والمراسلات وأي معلومات أخرى ذات طبيعة سرية يطلع عليها أو يحصل عليها بمناسبة تنفيذ هذا العقد، وعدم استخدامها أو الإفصاح عنها أو تمكين الغير من الاطلاع عليها إلا بالقدر اللازم لتنفيذ هذا العقد، أو بموافقة كتابية مسبقة من الطرف الآخر، أو تنفيذًا لالتزام قانوني أو أمر صادر من جهة قضائية أو إدارية مختصة.
تشمل المعلومات السرية — على سبيل المثال لا الحصر — المعلومات المتعلقة بالمشروع أو العلامة التجارية أو النشاط التجاري أو الخطط أو البيانات الفنية أو الملفات أو المواد غير المعلنة التي يتم تبادلها بين الطرفين أثناء تنفيذ العقد.
لا تسري أحكام السرية على المعلومات التي أصبحت متاحة للكافة بطريقة مشروعة دون مخالفة لالتزام بالسرية، أو كان الطرف المتلقي يعلمها قبل حصوله عليها من الطرف الآخر، أو حصل عليها من مصدر مشروع مستقل لا يخضع لالتزام بالسرية، أو وافق الطرف الآخر كتابةً على الإفصاح عنها. ويتحمل الطرف الذي يتمسك بأي من هذه الاستثناءات مسؤولية إثبات تحققها.
يلتزم الطرفان باتخاذ التدابير المعقولة للمحافظة على سرية المعلومات محل هذا العقد، كما يلتزمان بضمان التزام العاملين أو المتعاونين أو الأشخاص الذين يستعينان بهم في تنفيذ العقد بهذه الالتزامات في حدود مسؤولية كل طرف.
يظل الالتزام بالسرية قائمًا طوال مدة تنفيذ هذا العقد وبعد انتهائه أو فسخه أو انقضائه لمدة (سنة)، أو طالما ظلت المعلومات محتفظة بطبيعتها السرية، أيهما أطول، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
لا يُعد عرض الطرف الثاني للأعمال النهائية المعتمدة ضمن معرض أعماله أو ملفه المهني أو لأغراضه التسويقية إفشاءً للمعلومات السرية، وذلك في الحدود التي لا تكشف عن معلومات غير معلنة تخص الطرف الأول، وما لم يتفق الطرفان كتابةً على خلاف ذلك.
وإذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_25: {
    titleAr: "ثانيًا: التسوية الودية",
    bodyAr: `يجوز للطرفين، عند نشوء أي خلاف أو نزاع يتعلق بهذا العقد أو بتفسيره أو تنفيذه أو تعديله أو إنهائه أو آثاره، السعي إلى تسويته وديًا بحسن نية، سواء عن طريق التفاوض المباشر أو الاستعانة بوسيط قانوني أو خبير فني أو أي شخص يتفقان عليه، وذلك بقصد الوصول إلى حل رضائي متى كان ذلك ممكنًا.
ولا تُعد إجراءات التفاوض أو التسوية الودية أو الوساطة أو الاستعانة بخبير شرطًا سابقًا أو لازمًا للجوء إلى القضاء، ولا يجوز لأي من الطرفين الدفع بعدم قبول أي دعوى أو طلب أو دفع أو التمسك بعدم سلوك تلك الإجراءات أو عدم استكمالها أو عدم نجاحها، وذلك ما لم يوجب القانون صراحةً خلاف ذلك.
كما لا يترتب على مباشرة إجراءات التفاوض أو التسوية الودية أو الوساطة أو الخبرة وقف المواعيد القانونية أو التقادم أو سقوط أي حق، ولا تمنع أيًا من الطرفين من اللجوء إلى القضاء أو اتخاذ أي إجراء وقتي أو تحفظي أو مستعجل يجيزه القانون متى اقتضت الضرورة ذلك.`,
  },
  visual_identity_design_source_section_02: {
    titleAr: "المادة الثانية: التمهيد",
    bodyAr: `يُعد التمهيد السابق جزءًا لا يتجزأ من هذا العقد ومكمّلًا ومفسرًا لأحكامه، وتُقرأ نصوص العقد وتُفسر في ضوء ما ورد به.
وحيث إن الطرف الأول يرغب في التعاقد مع الطرف الثاني لتنفيذ خدمات تصميم الهوية البصرية الخاصة بمشروعه أو علامته أو نشاطه، وحيث إن الطرف الثاني لديه الخبرة والقدرة الفنية اللازمة لتقديم تلك الخدمات وفقًا لأحكام هذا العقد، فقد اتفقت إرادة الطرفين، بعد إقرارهما بأهليتهما القانونية للتعاقد والتصرف، على إبرام هذا العقد لتنظيم العلاقة بينهما وتحديد حقوق والتزامات كل طرف.
ويلتزم الطرفان بتنفيذ هذا العقد وفقًا لمبدأ حسن النية والتعاون المتبادل، وفي حدود الالتزامات والحقوق المنصوص عليها فيه، وبما يحقق الغرض الذي أُبرم من أجله.
ويقر الطرفان بأن هذا العقد يمثل الإطار القانوني المنظم للعلاقة بينهما فيما يتعلق بالخدمات محل العقد، وأن أي تفسير أو تطبيق لأحكامه يكون في حدود هذا الغرض وما تضمنه من التزامات متبادلة.
ويُعد هذا العقد، وما قد يُحرر تنفيذًا له من ملاحق أو نماذج أو جداول أو محاضر موقعة من الطرفين، كامل الاتفاق بينهما بشأن موضوعه، ويلغي ويحل محل أي تفاهمات أو مراسلات أو اتفاقات سابقة تتعلق بذات الموضوع، سواء كانت شفهية أو مكتوبة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.`,
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
    bodyAr: `يلتزم الطرف الثاني بتنفيذ خدمات تصميم الهوية البصرية المتفق عليها بين الطرفين، وذلك وفقًا للأصول المهنية المتعارف عليها وفي حدود أحكام هذا العقد ونطاق العمل المحدد به.
تشمل خدمات تصميم الهوية البصرية، بحسب ما يتم تحديده والاتفاق عليه بين الطرفين، أيًا من الأعمال الآتية: تصميم أو تطوير الشعار (Logo)، وإعداد الهوية البصرية للعلامة التجارية، واختيار الألوان والخطوط المعتمدة، وتصميم العناصر والأنماط البصرية (Visual Elements)، وإعداد دليل الهوية البصرية (Brand Guidelines)، وتصميم المطبوعات أو القوالب أو الملفات أو الأصول الرقمية المرتبطة بالهوية البصرية، وأي خدمات أخرى يتفق الطرفان على إضافتها كتابةً.
يقتصر نطاق التزام الطرف الثاني على الأعمال والخدمات التي تم الاتفاق عليها بين الطرفين، ولا يمتد إلى أي أعمال أو خدمات أو متطلبات أخرى لم يتم إدراجها ضمن نطاق العقد أو الاتفاق عليها كتابةً.
ولا تُعد المقترحات أو الأفكار الأولية أو المناقشات أو النماذج التجريبية أو المراسلات المتبادلة بين الطرفين، بذاتها، جزءًا من الخدمات النهائية أو من نطاق الالتزام التعاقدي، ما لم يتفق الطرفان كتابةً على اعتمادها أو إدراجها ضمن نطاق الخدمات.
ويجوز للطرفين أثناء تنفيذ العقد الاتفاق كتابةً على تعديل أو إضافة أو استبعاد أي من الخدمات، وفقًا لما يتم الاتفاق عليه بشأن آثار ذلك على المقابل المالي أو مدة التنفيذ أو أي التزامات أخرى.
ويلتزم الطرف الأول بإرسال قائمة الملاحظات المجمعة الخاصة بكل جولة مراجعة خلال مدة لا تجاوز ثلاثة (3) أيام عمل من تاريخ تسلمه المرحلة محل المراجعة، وذلك عبر وسيلة التواصل المعتمدة وفقًا للعقد. فإذا انقضت هذه المدة دون إرسال الملاحظات أو الاعتراض، عُدت المرحلة معتمدة من الطرف الأول، ويجوز للطرف الثاني الانتقال إلى المرحلة التالية أو اعتبار الأعمال مقبولة في حدود تلك المرحلة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
وإذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_05: {
    titleAr: "المادة الخامسة: المخرجات النهائية والتسليم",
    bodyAr: `يلتزم الطرف الثاني بتسليم المخرجات النهائية المتفق عليها للطرف الأول، وفقًا لنطاق الخدمات المحدد في هذا العقد، وبالمواصفات والصيغ ووسائل التسليم التي يتم الاتفاق عليها بين الطرفين.
تشمل المخرجات النهائية، بحسب ما يحدده الطرفان، ملفات التصميم النهائية أو الأدلة أو النماذج أو القوالب أو أي أعمال أخرى تدخل ضمن نطاق الخدمات محل العقد، وذلك بالصيغة أو الصيغ المتفق عليها، ولا تشمل أي مسودات أو أفكار أولية أو نماذج غير معتمدة ما لم يتفق الطرفان على خلاف ذلك.
لا يلتزم الطرف الثاني بتسليم الملفات المصدر أو ملفات العمل الأصلية أو الملفات القابلة للتعديل أو أي أدوات أو عناصر أو مواد استخدمت في إعداد التصميم، إلا إذا تم الاتفاق كتابةً على تسليمها وتحديد أثر ذلك على المقابل المالي أو نطاق الخدمات.
يجوز للطرفين الاتفاق على تنفيذ وتسليم الأعمال على مرحلة واحدة أو عدة مراحل وفقًا لطبيعة المشروع، ويُعد كل تسليم مرحلي منتجًا لآثاره في حدود الأعمال التي يشملها.
يتم تسليم الأعمال من خلال الوسيلة المتفق عليها بين الطرفين، ويُعتد بالتسليم الإلكتروني متى تم عبر الوسيلة المعتمدة بينهما وأمكن إثبات إرسال الملفات أو إتاحتها للطرف الأول.
يلتزم الطرف الأول بمراجعة الأعمال المسلمة وإبداء ملاحظاته أو طلب تعديلها أو اعتمادها وفقًا لأحكام هذا العقد، ولا يُعد مجرد استلام الأعمال أو الملفات قبولًا نهائيًا لها أو انتقالًا لأي حق من حقوق الملكية الفكرية أو منح أي ترخيص باستخدامها إلا وفقًا للأحكام المنظمة لذلك في هذا العقد.
إذا لم يبدِ الطرف الأول أي ملاحظات أو اعتراضات على الأعمال المسلمة خلال المدة المتفق عليها بين الطرفين، أو خلال مدة معقولة تتناسب مع طبيعة المشروع، فيُعمل بالأثر الذي يتفق عليه الطرفان أو يقرره العقد بشأن ذلك، دون الإخلال بحقوق أي منهما المقررة قانونًا.
وإذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_06: {
    titleAr: "المادة السادسة: مدة التنفيذ",
    variables: ["visual_execution_duration"],
    bodyAr: `يلتزم الطرف الثاني بالبدء في تنفيذ الخدمات محل هذا العقد اعتبارًا من التاريخ المتفق عليه بين الطرفين، أو من تاريخ استيفاء الطرف الأول للبيانات أو المواد أو المستندات أو الموافقات اللازمة لبدء التنفيذ، أو سداد الدفعة المتفق عليها — إن وجدت — أيهما لاحق، ما لم يتفق الطرفان كتابةً على خلاف ذلك.
تكون مدة تنفيذ الخدمات محل هذا العقد ({{visual_execution_duration}})، ويجوز للطرفين الاتفاق كتابةً على تعديلها أو تمديدها كلما اقتضت طبيعة المشروع أو نطاق الخدمات أو ظروف التنفيذ ذلك.
تُحتسب مدة التنفيذ على أساس التزام كل طرف بتنفيذ التزاماته في المواعيد المتفق عليها، ويترتب على أي تأخير أو امتناع أو تأخر في تقديم البيانات أو المواد أو الملاحظات أو الاعتمادات المطلوبة من أحد الطرفين امتداد مدة التنفيذ بالقدر اللازم لتدارك أثر هذا التأخير، دون أن يُعد ذلك إخلالًا من الطرف الآخر بالتزاماته.
إذا طرأ أثناء تنفيذ العقد أي تعديل على نطاق الخدمات، أو طلب الطرف الأول تنفيذ أعمال إضافية، أو إجراء تعديلات جوهرية تؤثر في حجم الأعمال أو مراحل التنفيذ، جاز تعديل مدة التنفيذ بما يتناسب مع تلك الأعمال أو التعديلات، وذلك وفقًا لما يتفق عليه الطرفان كتابةً.
لا يُسأل الطرف الثاني عن أي تأخير يكون سببه عدم قيام الطرف الأول بتقديم البيانات أو المواد أو الردود أو الاعتمادات اللازمة في الوقت المناسب، أو أي سبب خارج عن إرادة الطرف الثاني، وذلك دون الإخلال بالأحكام الخاصة بالقوة القاهرة والظروف الاستثنائية الواردة في هذا العقد.
وإذا وُجدت أي ملاحق أو نماذج أو جداول أو محاضر محررة تنفيذًا لهذا العقد وموقعة من الطرفين بتاريخ معاصر أو لاحق لتاريخ هذا العقد، فتُعد جزءًا لا يتجزأ منه، وتُستكمل أو تُفسر أو تُفصل الأحكام الواردة في هذه المادة في حدود ما ورد بها، وذلك دون الإخلال بالأحكام الأساسية لهذا العقد.`,
  },
  visual_identity_design_source_section_13: {
    titleAr: "المادة الثالثة عشرة: إنهاء العقد وآثاره",
    bodyAr: `أولًا: انتهاء العقد: ينتهي هذا العقد بانتهاء مدته، أو بتنفيذ جميع الالتزامات الناشئة عنه، أو باتفاق الطرفين كتابةً على إنهائه، أو بتحقق أي سبب من أسباب الإنهاء أو الفسخ أو الانقضاء المنصوص عليها في هذا العقد أو في القانون.`,
  },
  visual_identity_design_source_section_14: {
    titleAr: "ثانيًا: الإنهاء بسبب الإخلال الجوهري",
    bodyAr: `يجوز لأي من الطرفين إنهاء هذا العقد إذا أخل الطرف الآخر بأي التزام جوهري من التزاماته الناشئة عنه، ولم يقم بإزالة هذا الإخلال أو تداركه خلال خمسة عشر (15) يومًا من تاريخ إخطاره كتابةً بذلك. أما إذا كان الإخلال بطبيعته غير قابل للإصلاح، فيجوز للطرف المتضرر إنهاء العقد فورًا دون حاجة إلى إعذار أو إنذار أو اتخاذ أي إجراء آخر، وذلك دون إخلال بما قد يقرره القانون، ومع احتفاظه بحقه في المطالبة بالتعويض أو مباشرة أي حق آخر يقرره هذا العقد أو القانون.`,
  },
  visual_identity_design_source_section_15: {
    titleAr: "ثالثًا: تعليق التنفيذ بسبب عدم السداد",
    bodyAr: `إذا تأخر الطرف الأول عن سداد أي مبلغ مستحق بموجب هذا العقد، جاز للطرف الثاني، بعد إخطاره كتابةً، تعليق تنفيذ الخدمات أو الأعمال كليًا أو جزئيًا حتى تمام السداد، ولا تُحتسب مدة التعليق ضمن مدة التنفيذ، وتمتد المدد التعاقدية والجدول الزمني للمشروع بما يعادل مدة التعليق. وإذا استمر التأخير في السداد لمدة عشرة (10) أيام من تاريخ الإخطار، جاز للطرف الثاني إنهاء هذا العقد، مع احتفاظه بحقه في المطالبة بجميع مستحقاته المالية والتعويضات المستحقة — إن وجدت — وفقًا لأحكام هذا العقد والقانون.`,
  },
  visual_identity_design_source_section_16: {
    titleAr: "رابعًا: تعليق المشروع بسبب الطرف الأول — خامسًا: إنهاء العقد من جانب الطرف الأول",
    bodyAr: `رابعًا: تعليق المشروع بسبب الطرف الأول: إذا توقف تنفيذ المشروع بسبب امتناع الطرف الأول عن تقديم البيانات أو المحتوى أو المواد أو الاعتمادات أو الموافقات أو أي متطلبات لازمة للتنفيذ، أو بسبب عدم الرد على المراسلات أو الطلبات أو الملاحظات الفنية، لمدة تجاوز سبعة (7) أيام من تاريخ طلبها، جاز للطرف الثاني تعليق تنفيذ المشروع. فإذا استمر سبب التوقف بعد إخطار الطرف الأول كتابةً وانقضاء مدة سبعة (7) أيام من تاريخ الإخطار، جاز للطرف الثاني إنهاء هذا العقد، مع تسوية الحقوق والالتزامات المالية بين الطرفين وفقًا لأحكام هذا العقد.
خامسًا: إنهاء العقد من جانب الطرف الأول: يجوز للطرف الأول إنهاء هذا العقد إذا ثبت إخلال الطرف الثاني إخلالًا جوهريًا بتنفيذ الخدمات أو عدم مطابقتها لنطاق العمل أو المواصفات أو معايير القبول المتفق عليها، ولم يقم بمعالجة هذا الإخلال خلال خمسة عشر (15) يومًا من تاريخ إخطاره كتابةً بذلك، وذلك دون إخلال بحق الطرف الأول في المطالبة بالتعويض أو بأي حقوق أخرى يقررها هذا العقد أو القانون.`,
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
    bodyAr: `لا يترتب على انتهاء أو إنهاء هذا العقد سقوط حق الطرف الأول في استلام المخرجات النهائية أو الملفات أو أي حقوق أخرى يكون قد اكتسبها بموجب هذا العقد، متى كان قد أوفى بجميع التزاماته المالية والتعاقدية. وإذا انتهى أو أُنهي العقد قبل اكتمال تنفيذ المشروع، يلتزم الطرف الثاني بتسليم جميع الأعمال والمخرجات والمراحل التي اكتمل تنفيذها واستحق تسليمها وفقًا لأحكام هذا العقد، وذلك بعد سداد المستحقات المالية المتعلقة بها. ولا يلتزم الطرف الثاني بتسليم أي أعمال أو مخرجات أو ملفات مصدر أو ملفات عمل أصلية أو أي عناصر أخرى لم يتفق على تسليمها أو لم تستحق التسليم أو لم يتم الوفاء بالمستحقات المالية الخاصة بها، وذلك دون إخلال بحق الطرفين في تسوية الحقوق والالتزامات المالية أو الاتفاق كتابةً على خلاف ذلك.`,
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

const socialDelayPenaltyCommonTail = `ولا يستحق هذا الجزاء إلا بعد قيام الطرف الأول بإخطار الطرف الثاني كتابةً بواقعة التأخير ومنحه مهلة لا تقل عن خمسة (5) أيام عمل لمعالجة التأخير أو اتخاذ الإجراءات اللازمة للتنفيذ.
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
  variables: ["social_delay_penalty_amount", "social_delay_penalty_cap_percentage"],
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
  variables: ["social_delay_penalty_percentage", "social_delay_penalty_cap_percentage"],
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
        bodyAr: `يلتزم الطرف الأول بسداد المقابل المالي المستحق للطرف الثاني نظير تنفيذ الخدمات محل هذا العقد، وذلك بإجمالي مبلغ وقدره: {{visual_contract_value}} جنيه مصري (فقط {{visual_contract_value_words}} جنيه مصري لا غير)، أو وفقًا للدفعات أو المراحل أو الآلية المالية المحددة والمتفق عليها بين الطرفين.
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
        bodyAr: `مع مراعاة قواعد الاختصاص الولائي والنوعي المتعلقة بالنظام العام، إذا حدد الطرفان محكمة مختصة ضمن بيانات هذا العقد فتختص المحكمة المحددة الابتدائية وجزئياتها بنظر والفصل في جميع المنازعات الناشئة عن هذا العقد أو المرتبطة به، وذلك في الحدود التي يجيزها القانون. وفي حال عدم تحديد محكمة بعينها، تختص المحاكم المصرية المختصة نوعيًا ومكانيًا وفقًا لقواعد الاختصاص المقررة قانونًا.
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
    titleAr: "المادة 22-16: الرسوم والضرائب القانونية (بند اختياري)",
    bodyAr: "ما لم يتفق الطرفان كتابةً على خلاف ذلك، يتحمل كل طرف الرسوم والضرائب والمصروفات القانونية التي تفرض عليه بحكم صفته أو التزاماته أو التصرفات الصادرة عنه وفقًا للقوانين واللوائح السارية. ولا يشمل المقابل المالي المتفق عليه أي ضرائب أو رسوم تستحق قانونًا على الطرف الثاني بصفته مقدم الخدمة، بما في ذلك ضريبة القيمة المضافة متى كانت واجبة التطبيق، وتضاف إلى المقابل المالي وفقًا لأحكام القانون.",
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
  version: 6,
  nameAr: "عقود الخدمات والعمل الحر",
  description: "عقود الهوية البصرية وتطوير المواقع وإدارة منصات التواصل مع ملاحق مستقلة قابلة للاختيار.",
  priceEgp: 0,
  variantPricing: {
    visual_identity_design: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 0 },
    website_development: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 0 },
    social_media_management: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 0 },
  },
  variants,
  optionalClauses,
  legalClauses: freelancerLegalClauses,
};
