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
  saleSourceClauseKeysByVariant,
  saleSourceLegalClauses,
} from "../../legal-content/sourceClauses";
import { contractDateField, courtOptionsWithOther } from "../common";

const partyTypeOptions = [
  { value: "individual", labelAr: "فرد" },
  { value: "company", labelAr: "شركة / منشأة" },
];

const identityDocumentOptions = [
  { value: "national_id", labelAr: "رقم قومي" },
  { value: "passport", labelAr: "جواز سفر" },
];
const meterTypeOptions = [
  { value: "independent", labelAr: "مستقل" },
  { value: "shared", labelAr: "مشترك" },
];
const finishingOptions = [
  { value: "unfinished", labelAr: "بدون تشطيب" },
  { value: "semi_finished", labelAr: "نصف تشطيب" },
  { value: "finished", labelAr: "تشطيب كامل" },
  { value: "lux", labelAr: "لوكس" },
  { value: "super_lux", labelAr: "سوبر لوكس" },
  { value: "super_high_lux", labelAr: "سوبر هاي لوكس" },
];
const installmentCondition: ConditionDefinition = { fieldKey: "sale_payment_plan", operator: "equals", value: "installments" };
const meterExistsOptions = [
  { value: "yes", labelAr: "يوجد" },
  { value: "no", labelAr: "لا يوجد" },
];
const fullPaymentCondition: ConditionDefinition = { fieldKey: "sale_payment_plan", operator: "equals", value: "full" };
const anyConditions = (...items: ConditionDefinition[]): ConditionDefinition => ({ any: items });
const allConditions = (...items: ConditionDefinition[]): ConditionDefinition => ({ all: items });

function partyFields(prefix: "seller" | "buyer", label: string, allowCompany: boolean): WizardFieldDefinition[] {
  const companyCondition: ConditionDefinition = { fieldKey: `${prefix}_party_type`, operator: "equals", value: "company" };
  const individualCondition: ConditionDefinition | undefined = allowCompany
    ? { fieldKey: `${prefix}_party_type`, operator: "equals", value: "individual" }
    : undefined;
  const fields: WizardFieldDefinition[] = [];

  if (allowCompany) {
    fields.push({
      key: `${prefix}_party_type`, type: "radio", labelAr: `صفة ${label}`, required: true,
      options: partyTypeOptions,
    });
  }

  const individualField = (field: WizardFieldDefinition): WizardFieldDefinition => allowCompany
    ? { ...field, required: undefined, requiredWhen: field.required ? individualCondition : field.requiredWhen, visibleWhen: individualCondition }
    : field;

  fields.push(
    individualField({ key: `${prefix}_name`, type: "text", labelAr: `الاسم الكامل لـ${label}`, required: true }),
    individualField({ key: `${prefix}_nationality`, type: "text", labelAr: "الجنسية", required: true }),
    individualField({ key: `${prefix}_identity_document_type`, type: "radio", labelAr: "نوع مستند إثبات الهوية", required: true, options: identityDocumentOptions }),
    individualField({ key: `${prefix}_national_id`, type: "text", labelAr: "رقم مستند إثبات الهوية", required: true }),
    individualField({ key: `${prefix}_id_issuer`, type: "text", labelAr: "جهة الإصدار" }),
    individualField({ key: `${prefix}_id_issue_date`, type: "date", labelAr: "تاريخ الإصدار" }),
    individualField({ key: `${prefix}_address`, type: "text", labelAr: "العنوان", required: true }),
    { key: `${prefix}_phone`, type: "text", labelAr: "رقم الهاتف", required: true },
    individualField({
      key: `${prefix}_email`, type: "text", labelAr: "البريد الإلكتروني",
      requiredWhen: allConditions(
        { fieldKey: "sale_email_notices_enabled", operator: "truthy" },
        { fieldKey: "sale_notice_use_party_emails", operator: "truthy" },
        ...(allowCompany ? [individualCondition as ConditionDefinition] : []),
      ),
    }),
  );

  if (allowCompany) {
    fields.push(
      { key: `${prefix}_company_name`, type: "text", labelAr: "اسم الشركة / المنشأة", visibleWhen: companyCondition, requiredWhen: companyCondition },
      { key: `${prefix}_company_legal_form`, type: "text", labelAr: "الشكل القانوني", visibleWhen: companyCondition, requiredWhen: companyCondition },
      { key: `${prefix}_commercial_register`, type: "text", labelAr: "السجل التجاري رقم", visibleWhen: companyCondition, requiredWhen: companyCondition },
      { key: `${prefix}_tax_card`, type: "text", labelAr: "البطاقة الضريبية رقم", visibleWhen: companyCondition, requiredWhen: companyCondition },
      { key: `${prefix}_legal_representative`, type: "text", labelAr: "يمثله قانونًا السيد", visibleWhen: companyCondition, requiredWhen: companyCondition },
      { key: `${prefix}_representative_capacity`, type: "text", labelAr: "بصفته", visibleWhen: companyCondition, requiredWhen: companyCondition },
      { key: `${prefix}_company_address`, type: "text", labelAr: "مقر الشركة", visibleWhen: companyCondition, requiredWhen: companyCondition },
      {
        key: `${prefix}_company_email`, type: "text", labelAr: "البريد الإلكتروني للشركة", visibleWhen: companyCondition,
        requiredWhen: allConditions(
          companyCondition,
          { fieldKey: "sale_email_notices_enabled", operator: "truthy" },
          { fieldKey: "sale_notice_use_party_emails", operator: "truthy" },
        ),
      },
    );
  }
  return fields;
}

function meterFields(): WizardFieldDefinition[] {
  const result: WizardFieldDefinition[] = [];
  for (const [key, label] of [["electricity", "الكهرباء"], ["water", "المياه"], ["gas", "الغاز الطبيعي"]] as const) {
    const existsKey = `sale_${key}_meter_exists`;
    const exists: ConditionDefinition = { fieldKey: existsKey, operator: "equals", value: "yes" };
    result.push(
      { key: existsKey, type: "radio", labelAr: `هل يوجد عداد ${label}؟`, required: true, printInDocument: false, options: meterExistsOptions },
      { key: `sale_${key}_meter`, type: "text", labelAr: `رقم عداد ${label}`, visibleWhen: exists, requiredWhen: exists },
      { key: `sale_${key}_meter_type`, type: "select", labelAr: `نوع عداد ${label}`, visibleWhen: exists, requiredWhen: exists, options: meterTypeOptions },
      { key: `sale_${key}_meter_reading`, type: "text", labelAr: `قراءة عداد ${label} عند التسليم (إن كانت معلومة وقت التعاقد)`, visibleWhen: exists },
    );
  }
  return result;
}

function unitSteps(): WizardStepDefinition[] {
  return [
    {
      key: "sale_unit", titleAr: "بيانات ووصف الوحدة السكنية", articleRange: "المادة الرابعة",
      fields: [
        { key: "sale_unit_governorate", type: "text", labelAr: "المحافظة", required: true },
        { key: "sale_unit_city", type: "text", labelAr: "المدينة / المركز", required: true },
        { key: "sale_unit_district", type: "text", labelAr: "الحي / المنطقة", required: true },
        { key: "sale_unit_street", type: "text", labelAr: "اسم الشارع", required: true },
        { key: "sale_compound_name", type: "text", labelAr: "اسم الكمبوند" },
        { key: "sale_plot_number", type: "text", labelAr: "رقم القطعة" },
        { key: "sale_adjacency_number", type: "text", labelAr: "رقم المجاورة" },
        { key: "sale_building_number", type: "text", labelAr: "رقم العقار" },
        { key: "sale_building_name", type: "text", labelAr: "اسم البرج / العمارة" },
        { key: "sale_floor_number", type: "text", labelAr: "الدور", required: true },
        { key: "sale_unit_number", type: "text", labelAr: "رقم الوحدة", required: true },
        { key: "sale_unit_area", type: "number", labelAr: "المساحة الإجمالية (م²)", required: true, validation: { min: 1 } },
        { key: "sale_bedrooms_count", type: "number", labelAr: "عدد غرف النوم", required: true, validation: { min: 0 } },
        { key: "sale_reception_count", type: "number", labelAr: "عدد صالات الاستقبال", required: true, validation: { min: 0 } },
        { key: "sale_bathrooms_count", type: "number", labelAr: "عدد الحمامات", required: true, validation: { min: 0 } },
        { key: "sale_balconies_count", type: "number", labelAr: "عدد البلكونات", required: true, validation: { min: 0 } },
        { key: "sale_kitchen_description", type: "text", labelAr: "المطبخ", required: true },
        { key: "sale_finishing_level", type: "select", labelAr: "وصف التشطيب", required: true, options: finishingOptions },
      ],
    },
    {
      key: "sale_meters_boundaries", titleAr: "العدادات والحدود", articleRange: "المادة الرابعة",
      fields: [
        ...meterFields(),
        { key: "sale_north_boundary", type: "text", labelAr: "الحد البحري", required: true },
        { key: "sale_south_boundary", type: "text", labelAr: "الحد القبلي", required: true },
        { key: "sale_east_boundary", type: "text", labelAr: "الحد الشرقي", required: true },
        { key: "sale_west_boundary", type: "text", labelAr: "الحد الغربي", required: true },
      ],
    },
  ];
}

const preliminaryOwnershipStep: WizardStepDefinition = {
  key: "sale_preliminary_ownership", titleAr: "مصدر ملكية البائع", articleRange: "المادة الخامسة",
  fields: [
    {
      key: "preliminary_ownership_source", type: "radio", labelAr: "سند الملكية المعتمد", required: true,
      options: [
        { value: "preliminary_contract", labelAr: "عقد بيع ابتدائي" },
        { value: "custom_contract", labelAr: "عقد بيع عرفي" },
        { value: "court_judgment", labelAr: "حكم قضائي" },
        { value: "allocation", labelAr: "تخصيص من جهة" },
      ],
    },
    { key: "preliminary_contract_date", type: "date", labelAr: "تاريخ عقد البيع الابتدائي", required: true, visibleWhen: { fieldKey: "preliminary_ownership_source", operator: "equals", value: "preliminary_contract" } },
    { key: "custom_contract_date", type: "date", labelAr: "تاريخ عقد البيع العرفي", required: true, visibleWhen: { fieldKey: "preliminary_ownership_source", operator: "equals", value: "custom_contract" } },
    { key: "ownership_judgment_number", type: "text", labelAr: "رقم الحكم القضائي", required: true, visibleWhen: { fieldKey: "preliminary_ownership_source", operator: "equals", value: "court_judgment" } },
    { key: "ownership_judgment_year", type: "number", labelAr: "سنة الحكم", required: true, visibleWhen: { fieldKey: "preliminary_ownership_source", operator: "equals", value: "court_judgment" }, validation: { min: 1900, max: 2200 } },
    { key: "ownership_allocation_authority", type: "text", labelAr: "جهة التخصيص", required: true, visibleWhen: { fieldKey: "preliminary_ownership_source", operator: "equals", value: "allocation" } },
    { key: "sale_ownership_documents", type: "attachment", labelAr: "سند الملكية ومستندات تسلسل التصرف", required: true },
  ],
};

const registrableOwnershipStep: WizardStepDefinition = {
  key: "sale_registrable_ownership", titleAr: "سند الملكية الصالح للتسجيل", articleRange: "المادة الخامسة",
  fields: [
    {
      key: "registered_title_type", type: "radio", labelAr: "اختر سند ملكية واحدًا", required: true,
      options: [
        { value: "registered_contract", labelAr: "عقد بيع مسجل" },
        { value: "final_judgment", labelAr: "حكم نهائي مثبت للملكية" },
        { value: "allocation", labelAr: "عقد تخصيص" },
        { value: "other", labelAr: "سند آخر" },
      ],
    },
    { key: "registered_deed_number", type: "text", labelAr: "رقم العقد المسجل", required: true, visibleWhen: { fieldKey: "registered_title_type", operator: "equals", value: "registered_contract" } },
    { key: "registered_deed_year", type: "number", labelAr: "سنة العقد المسجل", required: true, visibleWhen: { fieldKey: "registered_title_type", operator: "equals", value: "registered_contract" }, validation: { min: 1900, max: 2200 } },
    { key: "registry_office", type: "text", labelAr: "مكتب / مأمورية الشهر العقاري", required: true, visibleWhen: { fieldKey: "registered_title_type", operator: "equals", value: "registered_contract" } },
    { key: "registered_judgment_number", type: "text", labelAr: "رقم الدعوى / الحكم", required: true, visibleWhen: { fieldKey: "registered_title_type", operator: "equals", value: "final_judgment" } },
    { key: "registered_judgment_year", type: "number", labelAr: "سنة الدعوى / الحكم", required: true, visibleWhen: { fieldKey: "registered_title_type", operator: "equals", value: "final_judgment" }, validation: { min: 1900, max: 2200 } },
    { key: "registered_judgment_court", type: "text", labelAr: "المحكمة", required: true, visibleWhen: { fieldKey: "registered_title_type", operator: "equals", value: "final_judgment" } },
    { key: "registered_allocation_authority", type: "text", labelAr: "جهة إصدار عقد التخصيص", required: true, visibleWhen: { fieldKey: "registered_title_type", operator: "equals", value: "allocation" } },
    { key: "registered_other_title", type: "textarea", labelAr: "بيان السند الآخر", required: true, visibleWhen: { fieldKey: "registered_title_type", operator: "equals", value: "other" } },
    { key: "sale_ownership_documents", type: "attachment", labelAr: "أصل / صورة رسمية من سند الملكية ومستنداته", required: true },
  ],
};

const inheritedOwnershipStep: WizardStepDefinition = {
  key: "sale_inheritance_ownership", titleAr: "الميراث وسند حق التصرف", articleRange: "المادتان الخامسة والتاسعة",
  fields: [
    { key: "deceased_owner_name", type: "text", labelAr: "اسم المورث", required: true },
    { key: "inheritance_declaration_number", type: "text", labelAr: "رقم إعلام الوراثة", required: true },
    { key: "inheritance_declaration_court", type: "text", labelAr: "المحكمة الصادر منها إعلام الوراثة", required: true },
    { key: "inheritance_declaration_date", type: "date", labelAr: "تاريخ إعلام الوراثة", required: true },
    { key: "deceased_title_description", type: "textarea", labelAr: "بيان سند ملكية المورث / المستند المثبت لحقه", required: true, placeholder: "مثال: عقد مسجل رقم ... لسنة ... / حكم نهائي / عقد تخصيص ..." },
    {
      key: "inheritance_disposition_basis", type: "radio", labelAr: "السند القانوني الذي يثبت حق البائع في التصرف", required: true,
      options: [
        { value: "power_of_attorney", labelAr: "توكيل رسمي من باقي الورثة" },
        { value: "partition_contract", labelAr: "عقد قسمة وتراضٍ بين الورثة" },
        { value: "relinquishment_contract", labelAr: "عقد تخارج أو تنازل" },
        { value: "sale_from_heirs", labelAr: "عقد بيع أو تصرف من باقي الورثة" },
        { value: "sole_heir", labelAr: "البائع هو الوارث الوحيد" },
        { value: "other", labelAr: "سند قانوني آخر" },
      ],
    },
    { key: "inheritance_poa_number", type: "text", labelAr: "رقم التوكيل", required: true, visibleWhen: { fieldKey: "inheritance_disposition_basis", operator: "equals", value: "power_of_attorney" } },
    { key: "inheritance_poa_year", type: "number", labelAr: "سنة التوكيل", required: true, visibleWhen: { fieldKey: "inheritance_disposition_basis", operator: "equals", value: "power_of_attorney" }, validation: { min: 1900, max: 2200 } },
    { key: "inheritance_poa_office", type: "text", labelAr: "مكتب التوثيق", required: true, visibleWhen: { fieldKey: "inheritance_disposition_basis", operator: "equals", value: "power_of_attorney" } },
    { key: "inheritance_poa_date", type: "date", labelAr: "تاريخ التوكيل", required: true, visibleWhen: { fieldKey: "inheritance_disposition_basis", operator: "equals", value: "power_of_attorney" } },
    { key: "inheritance_partition_date", type: "date", labelAr: "تاريخ عقد القسمة والتراضي", required: true, visibleWhen: { fieldKey: "inheritance_disposition_basis", operator: "equals", value: "partition_contract" } },
    { key: "inheritance_relinquishment_date", type: "date", labelAr: "تاريخ عقد التخارج أو التنازل", required: true, visibleWhen: { fieldKey: "inheritance_disposition_basis", operator: "equals", value: "relinquishment_contract" } },
    { key: "inheritance_heirs_sale_date", type: "date", labelAr: "تاريخ عقد البيع أو التصرف من باقي الورثة", required: true, visibleWhen: { fieldKey: "inheritance_disposition_basis", operator: "equals", value: "sale_from_heirs" } },
    { key: "inheritance_other_basis", type: "textarea", labelAr: "بيان السند القانوني الآخر", required: true, visibleWhen: { fieldKey: "inheritance_disposition_basis", operator: "equals", value: "other" } },
    {
      key: "inheritance_no_minors_ack", type: "checkbox",
      labelAr: "أقر بأن جميع الورثة كاملو الأهلية ولا يوجد بينهم قاصر أو ناقص/عديم أهلية أو حالة تستوجب إذنًا قضائيًا خاصًا",
      required: true,
    },
  ],
};

function pricePaymentSteps(includeRescissionPercent: boolean): WizardStepDefinition[] {
  const paymentFields: WizardFieldDefinition[] = [
    {
      key: "sale_payment_plan", type: "radio", labelAr: "طريقة سداد ثمن البيع", required: true,
      options: [
        { value: "full", labelAr: "سداد كامل الثمن" },
        { value: "installments", labelAr: "تقسيط / دفعات" },
      ],
    },
    { key: "sale_payment_method", type: "text", labelAr: "وسيلة / وسائل السداد المتفق عليها", required: true, placeholder: "مثال: تحويل بنكي / نقدًا بموجب إيصال / إنستاباي" },
    { key: "sale_down_payment", type: "money", labelAr: "الدفعة المقدمة المسددة", visibleWhen: installmentCondition, requiredWhen: installmentCondition, validation: { min: 0 } },
    {
      key: "sale_installment_schedule_rows", type: "repeater", labelAr: "جدول الأقساط المتفق عليه",
      visibleWhen: installmentCondition, requiredWhen: installmentCondition, minRows: 1,
      columns: [
        { key: "installment_no", type: "text", labelAr: "رقم / وصف القسط", required: true },
        { key: "amount", type: "money", labelAr: "قيمة القسط", required: true },
        { key: "due_date", type: "date", labelAr: "تاريخ الاستحقاق", required: true },
        { key: "payment_method", type: "text", labelAr: "وسيلة السداد", required: true },
      ],
      helpText: "مجموع الأقساط يجب أن يساوي باقي الثمن بعد خصم الدفعة المقدمة.",
    },
    {
      key: "sale_installment_grace_days", type: "number", labelAr: "فترة السماح عند التأخر في سداد القسط (يوم)",
      visibleWhen: installmentCondition, requiredWhen: installmentCondition, validation: { min: 1, max: 365 },
    },
  ];
  if (includeRescissionPercent) {
    paymentFields.push({
      key: "sale_installment_rescission_compensation_percent", type: "number",
      labelAr: "نسبة التعويض الاتفاقي عند تحقق الفسخ بسبب التأخر في الأقساط (%)",
      visibleWhen: installmentCondition, requiredWhen: installmentCondition, validation: { min: 0, max: 100 },
    });
  }
  return [
    {
      key: "sale_price", titleAr: "ثمن البيع", articleRange: "المادة السادسة",
      fields: [{ key: "sale_total_price", type: "money", labelAr: "إجمالي ثمن البيع", required: true, validation: { min: 1 } }],
    },
    { key: "sale_payment", titleAr: "طريقة سداد الثمن", articleRange: "المادة السادسة", fields: paymentFields },
  ];
}

function deliveryStep(): WizardStepDefinition {
  return {
    key: "sale_handover", titleAr: "تسليم الوحدة والحيازة", articleRange: "المادتان السابعة والثامنة",
    fields: [
      { key: "sale_delivery_delay_daily_compensation", type: "money", labelAr: "التعويض الاتفاقي عن كل يوم تأخير في التسليم", required: true, validation: { min: 0 } },
      { key: "sale_delivery_delay_threshold_days", type: "number", labelAr: "عدد أيام تأخر التسليم التي بعدها يعد الإخلال جوهريًا", required: true, validation: { min: 1, max: 3650 } },
      { key: "sale_unit_is_occupied", type: "checkbox", labelAr: "الوحدة مؤجرة أو مشغولة بعلاقة قانونية قائمة" },
      { key: "sale_occupancy_details", type: "textarea", labelAr: "بيانات الإشغال / العلاقة القانونية القائمة", required: true, visibleWhen: { fieldKey: "sale_unit_is_occupied", operator: "truthy" } },
      { key: "sale_occupancy_documents", type: "attachment", labelAr: "مستندات الحيازة أو العلاقة القانونية القائمة", required: true, visibleWhen: { fieldKey: "sale_unit_is_occupied", operator: "truthy" } },
      { key: "sale_inspection_acknowledged", type: "checkbox", labelAr: "أقر بأن المشتري عاين الوحدة معاينة تامة نافية للجهالة الظاهرة", required: true },
    ],
  };
}

const preliminarySpecialStep: WizardStepDefinition = {
  key: "sale_preliminary_special", titleAr: "الجراج والتصالح والضمانات والضرائب", articleRange: "المواد الثالثة والعاشرة حتى الثالثة عشرة والتاسعة عشرة",
  fields: [
    {
      key: "preliminary_garage_status", type: "radio", labelAr: "موقف الجراج / مكان السيارة", required: true,
      options: [
        { value: "included", labelAr: "يشمل مكانًا لسيارة واحدة" },
        { value: "not_included", labelAr: "لا يشمل الجراج" },
      ],
    },
    { key: "preliminary_hidden_defect_warranty_years", type: "number", labelAr: "مدة الضمان التعاقدي للعيوب الخفية (سنة)", required: true, validation: { min: 1, max: 100 } },
    {
      key: "preliminary_disposition_tax_payer", type: "radio", labelAr: "من يتحمل ضريبة التصرفات العقارية؟", required: true,
      options: [
        { value: "seller", labelAr: "البائع" },
        { value: "buyer", labelAr: "المشتري" },
        { value: "shared", labelAr: "مناصفة" },
      ],
    },
    {
      key: "preliminary_reconciliation_status", type: "radio", labelAr: "موقف التصالح على مخالفات البناء", required: true,
      options: [
        { value: "none", labelAr: "لا توجد مخالفات تستوجب التصالح وفق المستندات المتوافرة" },
        { value: "submitted", labelAr: "يوجد طلب تصالح مقدم" },
      ],
    },
    { key: "preliminary_reconciliation_request_number", type: "text", labelAr: "رقم طلب التصالح", required: true, visibleWhen: { fieldKey: "preliminary_reconciliation_status", operator: "equals", value: "submitted" } },
    { key: "preliminary_reconciliation_request_year", type: "number", labelAr: "سنة طلب التصالح", required: true, visibleWhen: { fieldKey: "preliminary_reconciliation_status", operator: "equals", value: "submitted" }, validation: { min: 1900, max: 2200 } },
    { key: "preliminary_reconciliation_documents", type: "attachment", labelAr: "مستندات طلب التصالح", required: true, visibleWhen: { fieldKey: "preliminary_reconciliation_status", operator: "equals", value: "submitted" } },
    {
      key: "preliminary_reconciliation_responsible_party", type: "radio", labelAr: "من يستكمل إجراءات التصالح؟", required: true,
      visibleWhen: { fieldKey: "preliminary_reconciliation_status", operator: "equals", value: "submitted" },
      options: [
        { value: "seller", labelAr: "البائع" },
        { value: "buyer", labelAr: "المشتري بعد التنازل الرسمي عن الطلب" },
      ],
    },
    { key: "preliminary_contractual_penalty_enabled", type: "checkbox", labelAr: "إضافة الشرط الجزائي الاتفاقي الاختياري" },
    { key: "preliminary_contractual_penalty_amount", type: "money", labelAr: "قيمة الشرط الجزائي الاتفاقي", visibleWhen: { fieldKey: "preliminary_contractual_penalty_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "preliminary_contractual_penalty_enabled", operator: "truthy" }, validation: { min: 1 } },
    { key: "preliminary_contractual_penalty_trigger", type: "textarea", labelAr: "الحالة / الإخلال الذي يستحق عنده الشرط الجزائي", visibleWhen: { fieldKey: "preliminary_contractual_penalty_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "preliminary_contractual_penalty_enabled", operator: "truthy" } },
  ],
};

const registrablePenaltyStep: WizardStepDefinition = {
  key: "sale_registrable_penalty", titleAr: "الشرط الجزائي الاتفاقي", articleRange: "المادة السابعة عشرة",
  fields: [
    { key: "registrable_contractual_penalty_enabled", type: "checkbox", labelAr: "إضافة الشرط الجزائي الاتفاقي الاختياري" },
    {
      key: "registrable_contractual_penalty_amount", type: "money", labelAr: "قيمة الشرط الجزائي الاتفاقي",
      visibleWhen: { fieldKey: "registrable_contractual_penalty_enabled", operator: "truthy" },
      requiredWhen: { fieldKey: "registrable_contractual_penalty_enabled", operator: "truthy" }, validation: { min: 1 },
    },
    {
      key: "registrable_contractual_penalty_trigger", type: "textarea", labelAr: "الحالة / الإخلال الذي يستحق عنده الشرط الجزائي",
      visibleWhen: { fieldKey: "registrable_contractual_penalty_enabled", operator: "truthy" },
      requiredWhen: { fieldKey: "registrable_contractual_penalty_enabled", operator: "truthy" },
    },
  ],
};

const inheritedPenaltyStep: WizardStepDefinition = {
  key: "sale_inherited_penalty", titleAr: "الشرط الجزائي الاتفاقي", articleRange: "المادة السابعة عشرة",
  fields: [
    { key: "inherited_contractual_penalty_enabled", type: "checkbox", labelAr: "إضافة شرط جزائي عام متفق عليه" },
    { key: "inherited_contractual_penalty_amount", type: "money", labelAr: "قيمة الشرط الجزائي الاتفاقي", visibleWhen: { fieldKey: "inherited_contractual_penalty_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "inherited_contractual_penalty_enabled", operator: "truthy" }, validation: { min: 1 } },
    { key: "inherited_contractual_penalty_trigger", type: "textarea", labelAr: "الحالة / الإخلال الذي يستحق عنده الشرط الجزائي", visibleWhen: { fieldKey: "inherited_contractual_penalty_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "inherited_contractual_penalty_enabled", operator: "truthy" } },
  ],
};

function taxStep(variant: "preliminary" | "registrable" | "inherited"): WizardStepDefinition {
  const payerOptions = variant === "preliminary"
    ? [{ value: "seller", labelAr: "البائع" }, { value: "buyer", labelAr: "المشتري" }, { value: "shared", labelAr: "مناصفة" }]
    : [{ value: "seller", labelAr: "البائع" }, { value: "buyer", labelAr: "المشتري" }];
  return {
    key: `sale_${variant}_taxes`, titleAr: "الضرائب والرسوم", articleRange: variant === "preliminary" ? "المادة الثانية عشرة" : "الضرائب والرسوم",
    fields: variant === "preliminary" ? [] : [
      { key: `${variant}_disposition_tax_payer`, type: "radio", labelAr: "الطرف المحدد لسداد ضريبة التصرفات العقارية بين الطرفين", required: true, options: payerOptions },
    ],
  };
}

function noticesStep(): WizardStepDefinition {
  return {
    key: "sale_notices", titleAr: "الإخطارات ووسائل الاتصال", articleRange: "الإخطارات والموطن المختار",
    fields: [
      { key: "sale_email_notices_enabled", type: "checkbox", labelAr: "اعتماد البريد الإلكتروني في الإخطارات (اختياري)" },
      { key: "sale_notice_use_party_emails", type: "checkbox", labelAr: "استخدام البريد الإلكتروني المسجل للطرفين", visibleWhen: { fieldKey: "sale_email_notices_enabled", operator: "truthy" } },
      {
        key: "sale_notice_seller_email", type: "text", labelAr: "البريد المعتمد للبائع", required: true,
        visibleWhen: allConditions({ fieldKey: "sale_email_notices_enabled", operator: "truthy" }, { fieldKey: "sale_notice_use_party_emails", operator: "falsy" }),
      },
      {
        key: "sale_notice_buyer_email", type: "text", labelAr: "البريد المعتمد للمشتري", required: true,
        visibleWhen: allConditions({ fieldKey: "sale_email_notices_enabled", operator: "truthy" }, { fieldKey: "sale_notice_use_party_emails", operator: "falsy" }),
      },
      { key: "sale_messaging_enabled", type: "checkbox", labelAr: "اعتماد واتساب / المراسلة الإلكترونية (اختياري)" },
      { key: "sale_notice_use_party_phones", type: "checkbox", labelAr: "استخدام أرقام الهاتف المسجلة للطرفين", visibleWhen: { fieldKey: "sale_messaging_enabled", operator: "truthy" } },
      {
        key: "sale_notice_seller_phone", type: "text", labelAr: "رقم واتساب / المراسلة المعتمد للبائع", required: true,
        visibleWhen: allConditions({ fieldKey: "sale_messaging_enabled", operator: "truthy" }, { fieldKey: "sale_notice_use_party_phones", operator: "falsy" }),
      },
      {
        key: "sale_notice_buyer_phone", type: "text", labelAr: "رقم واتساب / المراسلة المعتمد للمشتري", required: true,
        visibleWhen: allConditions({ fieldKey: "sale_messaging_enabled", operator: "truthy" }, { fieldKey: "sale_notice_use_party_phones", operator: "falsy" }),
      },
    ],
  };
}

function saleJurisdictionStep(): WizardStepDefinition {
  return {
    key: "sale_jurisdiction", titleAr: "المحكمة المختصة", articleRange: "الاختصاص القضائي",
    fields: [
      {
        key: "sale_competent_court", type: "select", labelAr: "المحكمة المختصة", required: true,
        options: courtOptionsWithOther,
        helpText: "اختر المحكمة المتفق عليها بين الطرفين لنظر أي نزاع، مع مراعاة قواعد الاختصاص القضائي الآمرة.",
      },
      {
        key: "sale_competent_court_other", type: "text", labelAr: "اسم المحكمة الأخرى",
        visibleWhen: { fieldKey: "sale_competent_court", operator: "equals", value: "أخرى" },
        requiredWhen: { fieldKey: "sale_competent_court", operator: "equals", value: "أخرى" },
      },
    ],
  };
}

function witnessesStep(): WizardStepDefinition {
  return {
    key: "sale_witnesses", titleAr: "الشهود", articleRange: "التوقيعات",
    fields: [
      { key: "sale_witness_1_enabled", type: "checkbox", labelAr: "إضافة الشاهد الأول (إن وجد)" },
      { key: "sale_witness_1_name", type: "text", labelAr: "اسم الشاهد الأول", required: true, visibleWhen: { fieldKey: "sale_witness_1_enabled", operator: "truthy" } },
      { key: "sale_witness_1_national_id", type: "text", labelAr: "الرقم القومي للشاهد الأول", required: true, visibleWhen: { fieldKey: "sale_witness_1_enabled", operator: "truthy" } },
      { key: "sale_witness_2_enabled", type: "checkbox", labelAr: "إضافة الشاهد الثاني (إن وجد)" },
      { key: "sale_witness_2_name", type: "text", labelAr: "اسم الشاهد الثاني", required: true, visibleWhen: { fieldKey: "sale_witness_2_enabled", operator: "truthy" } },
      { key: "sale_witness_2_national_id", type: "text", labelAr: "الرقم القومي للشاهد الثاني", required: true, visibleWhen: { fieldKey: "sale_witness_2_enabled", operator: "truthy" } },
    ],
  };
}

function legalTimingStep(variant: "preliminary" | "registrable" | "inherited"): WizardStepDefinition {
  const fields: WizardFieldDefinition[] = [
    { key: "sale_general_breach_cure_days", type: "number", labelAr: "مهلة إزالة الإخلال الجوهري بعد الإعذار (يوم)", required: true, validation: { min: 1, max: 365 } },
    { key: "sale_force_majeure_notice_days", type: "number", labelAr: "مهلة إخطار القوة القاهرة / الظرف الطارئ (يوم)", required: true, validation: { min: 1, max: 365 } },
    { key: "sale_notice_change_days", type: "number", labelAr: "مهلة إخطار الطرف الآخر بتغيير بيانات الاتصال (يوم)", required: true, validation: { min: 1, max: 365 } },
  ];
  if (variant === "inherited") {
    fields.push({ key: "sale_amicable_settlement_days", type: "number", labelAr: "مدة محاولة التسوية الودية قبل التقاضي (يوم)", required: true, validation: { min: 1, max: 365 } });
  }
  return { key: `sale_${variant}_legal_timings`, titleAr: "المدد القانونية والإخطارات", articleRange: "الفسخ والقوة القاهرة والإخطارات", fields };
}

function attachmentStep(variant: "preliminary" | "registrable" | "inherited"): WizardStepDefinition {
  const common: WizardFieldDefinition[] = [
    { key: "sale_seller_identity_copy", type: "attachment", labelAr: "صورة بطاقة الرقم القومي أو جواز السفر للبائع / ممثله القانوني عند كون البائع شركة", required: true },
    { key: "sale_buyer_identity_copy", type: "attachment", labelAr: "صورة بطاقة الرقم القومي أو جواز السفر للمشتري / ممثله القانوني عند كون المشتري شركة", required: true },
  ];
  if (variant === "preliminary") common.push(
    { key: "sale_utility_receipts", type: "attachment", labelAr: "آخر إيصالات / بيانات المرافق (إن توافرت)" },
    { key: "sale_building_docs", type: "attachment", labelAr: "رخصة البناء / مستندات التصالح / المستندات التنظيمية (إن وجدت)" },
    { key: "sale_handover_report", type: "attachment", labelAr: "محضر استلام الوحدة (إن تم تحريره)" },
    { key: "sale_engineering_docs", type: "attachment", labelAr: "رسومات هندسية / مخططات / شهادة بيانات (إن وجدت)" },
    { key: "sale_extra_docs", type: "attachment", labelAr: "مستندات أخرى متفق عليها" },
  );
  if (variant === "registrable") common.push(
    { key: "sale_utility_receipts", type: "attachment", labelAr: "آخر إيصالات / مخالصات المرافق (إن وجدت)" },
    { key: "sale_building_docs", type: "attachment", labelAr: "رخصة البناء / النماذج المشهرة / مستندات التصالح أو المستندات الهندسية (إن وجدت)" },
    { key: "registrable_negative_certificate_enabled", type: "checkbox", labelAr: "إرفاق شهادة تصرفات عقارية سلبية حديثة (نموذج 19)" },
    { key: "registrable_negative_certificate", type: "attachment", labelAr: "شهادة التصرفات العقارية السلبية", required: true, visibleWhen: { fieldKey: "registrable_negative_certificate_enabled", operator: "truthy" } },
    { key: "sale_extra_docs", type: "attachment", labelAr: "مستندات أو خرائط أو إقرارات أخرى متفق عليها" },
  );
  if (variant === "inherited") common.push(
    { key: "inheritance_declaration_attachment", type: "attachment", labelAr: "صورة إعلام الوراثة", required: true },
    { key: "deceased_death_certificate", type: "attachment", labelAr: "صورة شهادة وفاة المورث", required: true },
    { key: "deceased_title_document", type: "attachment", labelAr: "صورة سند ملكية المورث أو المستند المثبت لحقه", required: true },
    { key: "inheritance_disposition_basis_attachment", type: "attachment", labelAr: "صورة سند حق البائع في التصرف بحسب الحالة المختارة", required: true },
    { key: "sale_utility_receipts", type: "attachment", labelAr: "آخر إيصالات / بيانات المرافق (إن وجدت)" },
    { key: "sale_building_docs", type: "attachment", labelAr: "رخصة البناء / مستندات التصالح / المستندات التنظيمية أو الهندسية (إن وجدت)" },
    { key: "sale_handover_report", type: "attachment", labelAr: "محضر استلام الوحدة (إن تم تحريره)" },
    { key: "sale_extra_docs", type: "attachment", labelAr: "مستندات أو خرائط أو رسومات أخرى متفق عليها" },
  );
  return { key: `sale_${variant}_attachments`, titleAr: "المرفقات", articleRange: "المرفقات", fields: common };
}

function metaStep(variant: "preliminary" | "registrable" | "inherited"): WizardStepDefinition {
  const fields: WizardFieldDefinition[] = [contractDateField, { key: "sale_contract_city", type: "text", labelAr: "مدينة تحرير العقد", required: true }];
  return { key: "sale_contract_meta", titleAr: "بيانات العقد", articleRange: "التاريخ ومكان التحرير", fields };
}

function partySteps(allowCompany: boolean): WizardStepDefinition[] {
  return [
    { key: "sale_seller", titleAr: "الطرف الأول (البائع)", articleRange: "المادة الأولى", fields: partyFields("seller", "البائع", allowCompany) },
    { key: "sale_buyer", titleAr: "الطرف الثاني (المشتري)", articleRange: "المادة الأولى", fields: partyFields("buyer", "المشتري", allowCompany) },
  ];
}

const saleReviewStep: WizardStepDefinition = { key: "sale_review", titleAr: "المراجعة والاعتماد", articleRange: "مراجعة نهائية", fields: [] };

const sharedDefaults: Record<string, string | number | boolean | null> = {
  seller_party_type: "individual",
  buyer_party_type: "individual",
  seller_nationality: "مصري",
  buyer_nationality: "مصري",
  seller_identity_document_type: "national_id",
  buyer_identity_document_type: "national_id",
  sale_contract_copies_count: 2,
  sale_email_notices_enabled: false,
  sale_notice_use_party_emails: true,
  sale_messaging_enabled: false,
  sale_notice_use_party_phones: true,
  sale_witness_1_enabled: false,
  sale_witness_2_enabled: false,
  sale_competent_court: "القاهرة الجديدة",
  sale_unit_is_occupied: false,
  sale_electricity_meter_exists: "no",
  sale_water_meter_exists: "no",
  sale_gas_meter_exists: "no",
};

function createVariant(input: {
  key: "preliminary_sale" | "registrable_sale" | "inherited_sale";
  nameAr: string; documentTitleAr: string; description: string; sourceDocumentName: string;
  allowCompany: boolean; ownershipStep: WizardStepDefinition;
  includeRescissionPercent: boolean; specialSteps?: WizardStepDefinition[]; postTaxSteps?: WizardStepDefinition[]; taxVariant: "preliminary" | "registrable" | "inherited";
  defaults?: Record<string, string | number | boolean | null>;
}): ContractVariantDefinition {
  return {
    key: input.key,
    nameAr: input.nameAr,
    documentTitleAr: input.documentTitleAr,
    description: input.description,
    sourceDocumentName: input.sourceDocumentName,
    steps: [
      metaStep(input.taxVariant),
      ...partySteps(input.allowCompany),
      ...unitSteps(),
      input.ownershipStep,
      ...pricePaymentSteps(input.includeRescissionPercent),
      deliveryStep(),
      ...(input.specialSteps ?? []),
      ...(input.taxVariant === "preliminary" ? [] : [taxStep(input.taxVariant)]),
      ...(input.postTaxSteps ?? []),
      legalTimingStep(input.taxVariant),
      noticesStep(),
      saleJurisdictionStep(),
      attachmentStep(input.taxVariant),
      witnessesStep(),
      saleReviewStep,
    ],
    requiredClauseKeys: orderedSaleClauseKeys(input.key),
    allowedOptionalClauseKeys: ["sale_installment_schedule"],
    defaultFieldValues: { ...sharedDefaults, ...(input.defaults ?? {}) },
  };
}

function cleanSourceBody(body: string): string {
  return body
    .replace(/البيان المثبت بجدول بيانات العقد/g, "كما هو مثبت ببيانات العقد")
    .replace(/\(كما هو مثبت ببيانات العقد\)15/g, "(15)")
    .replace(/\(كما هو مثبت ببيانات العقد\)30/g, "(30)")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function removeRange(body: string, start: string, end?: string): string {
  const startAt = body.indexOf(start);
  if (startAt < 0) return body;
  if (!end) return body.slice(0, startAt).trim();
  const endAt = body.indexOf(end, startAt + start.length);
  if (endAt < 0) return body.slice(0, startAt).trim();
  return `${body.slice(0, startAt)}${body.slice(endAt)}`.trim();
}
function replaceRange(body: string, start: string, end: string, replacement: string): string {
  const startAt = body.indexOf(start);
  if (startAt < 0) return body;
  const endAt = body.indexOf(end, startAt + start.length);
  if (endAt < 0) return body;
  return `${body.slice(0, startAt)}${replacement}${body.slice(endAt)}`.trim();
}
function customClause(input: LegalClauseDefinition): LegalClauseDefinition { return input; }

const reviewedSourceClauses = saleSourceLegalClauses.map((item): LegalClauseDefinition => {
  const key = item.key;
  let body = cleanSourceBody(item.bodyAr);
  let variables = [...(item.variables ?? [])];
  if (key.endsWith("_source_article_01")) {
    body = `إنه بتاريخ {{contract_date}} تم إبرام هذا العقد بين كل من:

أولًا: {{sale_seller_party_definition}}

ثانيًا: {{sale_buyer_party_definition}}

ويُشار إلى كل منهما منفردًا بـ«الطرف» وإليهما معًا بـ«الطرفين»، وتُعد بيانات التعريف السابقة جزءًا لا يتجزأ من هذا العقد.`;
    variables.push("contract_date", "sale_seller_party_definition", "sale_buyer_party_definition");
  }
  if (key.endsWith("_source_article_04")) {
    body = "محل البيع هو الوحدة رقم {{sale_unit_number}} بالدور {{sale_floor_number}}، الكائنة بشارع {{sale_unit_street}}، حي/منطقة {{sale_unit_district}}، بمدينة/مركز {{sale_unit_city}}، محافظة {{sale_unit_governorate}}، وتبلغ مساحتها الإجمالية {{sale_unit_area}} مترًا مربعًا تقريبًا بحسب المستندات. وتتكون من {{sale_bedrooms_count}} غرف نوم، و{{sale_reception_count}} صالات استقبال، و{{sale_bathrooms_count}} حمامات، و{{sale_balconies_count}} بلكونات، والمطبخ موصوف بأنه {{sale_kitchen_description}}، ومستوى التشطيب {{sale_finishing_level}}. وحدود الوحدة: البحري {{sale_north_boundary}}، والقبلي {{sale_south_boundary}}، والشرقي {{sale_east_boundary}}، والغربي {{sale_west_boundary}}. {{sale_property_additional_details}}";
    variables.push(
      "sale_unit_number", "sale_floor_number", "sale_unit_street", "sale_unit_district", "sale_unit_city", "sale_unit_governorate", "sale_unit_area",
      "sale_bedrooms_count", "sale_reception_count", "sale_bathrooms_count", "sale_balconies_count", "sale_kitchen_description", "sale_finishing_level",
      "sale_north_boundary", "sale_south_boundary", "sale_east_boundary", "sale_west_boundary", "sale_property_additional_details",
    );
  }
  if (key === "preliminary_sale_source_article_03") {
    body = `باع الطرف الأول (البائع) إلى الطرف الثاني (المشتري)، القابل لذلك، الوحدة السكنية المحددة تفصيلًا بالمادة الرابعة من هذا العقد، وذلك لقاء الثمن المبين بالمادة السادسة وبالشروط والضمانات الواردة فيه. ويشمل محل البيع ما يثبت للبائع من حقوق وملحقات ومنافع وحصة شائعة وأجزاء مشتركة تتبع الوحدة وفق سند تصرفه وأحكام المادة العاشرة، دون أن يفهم من هذا العقد بذاته أنه نقل للملكية العينية في السجلات إذا كانت إجراءات التسجيل لم تستكمل بعد.

وينشئ هذا البيع بين طرفيه الحقوق والالتزامات التعاقدية المقررة بهذا العقد، ويكون التسليم وانتقال الحيازة وتبعة المخاطر وفق المادتين السابعة والثامنة وطريقة السداد المختارة.

{{preliminary_garage_scope_text}}`;
    variables.push("preliminary_garage_scope_text");
  }
  if (key === "preliminary_sale_source_article_05") {
    body = "يستند البائع في ملكيته وحقه في التصرف إلى السند المختار: {{preliminary_ownership_source}}، وبياناته: {{preliminary_ownership_detail}}. ويلتزم بصحة وسريان ونفاذ هذا السند وبإتاحة مستنداته للمشتري واتخاذ الإجراءات التي يوجبها العقد والقانون لإتمام آثار البيع.";
    variables.push("preliminary_ownership_source", "preliminary_ownership_detail");
  }
  if (key === "registrable_sale_source_article_05") {
    body = "يستند البائع في ملكيته وحقه في التصرف إلى سند صالح للتسجيل من النوع: {{registered_title_type}}، وبياناته: {{registrable_ownership_detail}}. ويلتزم بصحة وسريان ونفاذ هذا السند وبإتاحة مستنداته للمشتري واتخاذ الإجراءات اللازمة للشهر أو التسجيل وفقًا للعقد والقانون.";
    variables.push("registered_title_type", "registrable_ownership_detail");
  }
  if (key === "inherited_sale_source_article_05") {
    body = "آلت الحقوق محل التصرف بطريق الميراث عن المرحوم {{deceased_owner_name}} بموجب إعلام الوراثة رقم {{inheritance_declaration_number}} الصادر من {{inheritance_declaration_court}} بتاريخ {{inheritance_declaration_date}}. وسند ملكية المورث أو المستند المثبت لحقه هو: {{deceased_title_description}}. ويستند البائع في حقه في التصرف إلى {{inheritance_disposition_basis}}، وبيانات هذا السند: {{inheritance_disposition_detail}}. ويلتزم بصحة وسريان المستندات المؤيدة لذلك وبإتاحتها للمشتري وفقًا للعقد والقانون.";
    variables.push("deceased_owner_name", "inheritance_declaration_number", "inheritance_declaration_court", "inheritance_declaration_date", "deceased_title_description", "inheritance_disposition_basis", "inheritance_disposition_detail");
  }
  if (key === "inherited_sale_source_article_03") {
    body = `باع الطرف الأول (البائع) إلى الطرف الثاني (المشتري)، القابل لذلك، الوحدة السكنية المبينة أوصافها وحدودها بالمادة الرابعة، وما يتبعها من الحقوق والملحقات والمرافق والحصة الشائعة والأجزاء المشتركة في الحدود التي تثبت للبائع بطريق الميراث وبسند حقه في التصرف المبين بهذا العقد، وذلك لقاء الثمن المتفق عليه.

وتنتقل إلى المشتري الحقوق والالتزامات التعاقدية الناشئة عن هذا البيع من تاريخ نفاذ العقد، أما التسليم الفعلي وانتقال الحيازة وتبعة المخاطر فتخضع للمادتين السابعة والثامنة وطريقة السداد المختارة، ولا يعد مجرد التوقيع إقرارًا بالتسليم إذا كان مستحقًا في تاريخ لاحق.

وأما انتقال الملكية العينية أو استكمال آثارها في السجلات فيتم وفقًا للإجراءات التي يقررها القانون وبالمستندات الدالة على الميراث وسند ملكية المورث وسند حق البائع في التصرف.`;
  }
  if (key.endsWith("_source_article_06")) {
    body = "اتفق الطرفان على أن إجمالي ثمن البيع هو {{sale_total_price}} جنيه مصري ({{sale_total_price_words}}). ووسيلة/وسائل السداد المتفق عليها هي: {{sale_payment_method}}. ويُعمل في طريقة السداد بالحالة المختارة أدناه دون غيرها.";
    variables.push("sale_total_price", "sale_total_price_words", "sale_payment_method");
  }
  if (key.endsWith("_source_article_07")) {
    body = "يتم تسليم الوحدة ونقل الحيازة وفق القاعدة الآتية: {{sale_delivery_rule_text}}. ويكون انتقال الحيازة وتبعة الهلاك والمسؤولية عن الاستهلاك من تاريخ تحقق التسليم الفعلي، لا من مجرد توقيع العقد إذا كان التسليم مؤجلًا. {{sale_inspection_ack_text}} {{sale_occupancy_status_text}}";
    variables.push("sale_delivery_rule_text", "sale_inspection_ack_text", "sale_occupancy_status_text");
  }
  if (key === "preliminary_sale_source_article_08") {
    body = "تنتقل الحيازة الفعلية والقانونية والهادئة للوحدة السكنية إلى المشتري من تاريخ التسليم الفعلي وفق المادة السابعة: {{sale_delivery_rule_text}}. ومن تاريخ التسليم وحده تنتقل إلى المشتري تبعة المحافظة على الوحدة والمسؤولية عن استعمالها والمخاطر اللاحقة للتسليم، مع بقاء مسؤولية البائع عن أي سبب سابق على التسليم أو عيب خفي أو ضمان يلتزم به بموجب العقد أو القانون. وتبرأ ذمة البائع من التزام التسليم عند تحقق التسليم الفعلي، لا بمجرد التوقيع إذا كان التسليم مؤجلًا إلى ما بعد سداد كامل الثمن.";
    variables.push("sale_delivery_rule_text");
  }
  if (key === "registrable_sale_source_article_08" || key === "inherited_sale_source_article_08") {
    body = "تنتقل الحيازة الفعلية والقانونية والهادئة للوحدة السكنية وحقوق الانتفاع والاستعمال إلى المشتري عند تحقق التسليم الفعلي وفق المادة السابعة: {{sale_delivery_rule_text}}. فإذا تم التسليم في يوم توقيع العقد كان توقيع الطرفين قرينة على تمام التسليم، أما إذا كان التسليم مستحقًا في تاريخ لاحق فيثبت بمحضر استلام أو محرر كتابي أو وسيلة إثبات معتمدة. ومن تاريخ التسليم الفعلي وحده تنتقل إلى المشتري تبعة الهلاك والمخاطر والمسؤولية عن استعمال الوحدة، وتبرأ ذمة البائع من التزام التسليم مع بقاء ضماناته والتزاماته الأخرى.";
    variables.push("sale_delivery_rule_text");
  }

  if (key === "preliminary_sale_source_article_09") {
    body = `${body}

ولأغراض هذا العقد، سند تصرف البائع المعتمد هو: {{preliminary_ownership_detail}}.`;
    variables.push("preliminary_ownership_detail");
  }
  if (key === "registrable_sale_source_article_09") {
    body = `${body}

وسند الملكية المعتمد لإجراءات الشهر والتسجيل هو: {{registrable_ownership_detail}}.`;
    variables.push("registrable_ownership_detail");
  }
  if (key === "inherited_sale_source_article_09") {
    body = "يثبت سند حق البائع في التصرف في المال الموروث بالحالة المختارة: {{inheritance_disposition_detail}}. {{inheritance_heirs_capacity_text}} ويقر البائع بصحة وسريان سند ملكية المورث المبين بالمادة الخامسة وسند حقه في التصرف، وبأنهما يخوّلانه التصرف في الوحدة محل البيع، ويلتزم بتقديم المستندات المؤيدة لذلك وفقًا لأحكام العقد والقانون.";
    variables.push("inheritance_disposition_detail", "inheritance_heirs_capacity_text");
  }
  if (key === "preliminary_sale_source_article_10") {
    body = removeRange(body, ".4الموقف العرفي للجراج");
    body = `${body}

{{preliminary_garage_scope_text}}`;
    variables.push("preliminary_garage_scope_text");
  }
  if (key === "preliminary_sale_source_article_13") {
    body = removeRange(body, "(في حالة وجود طلب تصالح عن مخالفات بناء)");
  }
  if (key === "preliminary_sale_source_article_13" || key === "registrable_sale_source_article_11" || key === "inherited_sale_source_article_11") {
    body = `${body}

ولحسم تاريخ انتقال مسؤولية المرافق دون تعارض، يكون تاريخ التسليم المشار إليه في هذه المادة هو تاريخ التسليم الفعلي الناتج عن قاعدة التسليم المتفق عليها: {{sale_delivery_rule_text}}.`;
    variables.push("sale_delivery_rule_text");
  }
  if (key === "preliminary_sale_source_article_14") {
    body = `${body}

وفيما يتعلق بالموقف التنظيمي والتصالح: {{preliminary_reconciliation_legal_text}} كما يقر البائع بأن سند تصرفه المعتمد هو {{preliminary_ownership_detail}}.`;
    variables.push("preliminary_reconciliation_legal_text", "preliminary_ownership_detail");
  }
  if (key === "preliminary_sale_source_article_17") {
    body = `${body}

ويؤكد البائع أن سند تصرفه الذي يلتزم بتسليمه والاستناد إليه في تنفيذ هذه المادة هو: {{preliminary_ownership_detail}}.`;
    variables.push("preliminary_ownership_detail");
    body = body.replace("كما يجوز للطرف الثاني حبس أي جزء متب وفقا", "كما يجوز للطرف الثاني حبس أي جزء متبقٍ من الثمن - إن وجد - وذلك وفقًا");
  }
  if (key === "registrable_sale_source_article_12") {
    body = `${body}

ولأغراض هذه الضمانات، سند ملكية البائع المعتمد هو: {{registrable_ownership_detail}}، ويعد إقرار البائع بصحته وسريانه وقابليته للاستناد إليه في إجراءات الشهر والتسجيل جزءًا جوهريًا من ضماناته.`;
    variables.push("registrable_ownership_detail");
  }
  if (key === "registrable_sale_source_article_15") {
    body = `${body}

ويلتزم البائع في تنفيذ التزاماته المتعلقة بالشهر والتسجيل بتقديم سند الملكية المعتمد وبياناته: {{registrable_ownership_detail}}، وما يتصل به من مستندات لازمة بحسب الحالة.`;
    variables.push("registrable_ownership_detail");
  }
  if (key === "inherited_sale_source_article_15") {
    body = `${body}

ويكون سند حق البائع في التصرف الذي يلتزم بالمحافظة على نفاذه وتقديم مستنداته هو: {{inheritance_disposition_detail}}، مع سند ملكية المورث: {{deceased_title_description}}.`;
    variables.push("inheritance_disposition_detail", "deceased_title_description");
  }
  if (key === "preliminary_sale_source_article_19" || key === "registrable_sale_source_article_17" || key === "inherited_sale_source_article_17") {
    if (key === "preliminary_sale_source_article_19") body = removeRange(body, ".4الشرط الجزائي االتفاقي (إن تم االتفاق عليه)", "وال يخل ما تقدم");
    if (key === "registrable_sale_source_article_17") body = removeRange(body, ".4الشرط الجزائي االتفاقي (إن تم االتفاق عليه)", "وال يخل ما تقدم");
    if (key === "inherited_sale_source_article_17") body = removeRange(body, "رابعا: الشرط الجزائي (إن تم الاتفاق عليه)", "خامسا: استقالل الأحكام الخاصة");
    body = body.split("\n").map((line) => line.trim().startsWith(".7 وفي غير الحالات التي ورد بشأنها شرط فاسخ صريح")
      ? ".7 وفي غير الحالات التي ورد بشأنها شرط فاسخ صريح أو جزاء خاص في هذا العقد، إذا استمر الإخلال الجوهري بعد إعذار الطرف المخل كتابةً ومنحه مهلة قدرها {{sale_general_breach_cure_days}} يومًا من تاريخ وصول الإعذار لإزالة أسباب الإخلال، جاز للطرف الآخر طلب الفسخ أو التنفيذ أو التعويض بحسب الأحوال ووفقًا لأحكام العقد والقانون."
      : line).join("\n");
    variables.push("sale_general_breach_cure_days");
    if (key === "inherited_sale_source_article_17") {
      body = `${body}

{{inherited_contractual_penalty_text}}`;
      variables.push("inherited_contractual_penalty_text");
    }
  }
  if (key === "preliminary_sale_source_article_21" || key === "registrable_sale_source_article_19" || key === "inherited_sale_source_article_19") {
    body = `تكون الإخطارات والإنذارات والمراسلات والطلبات المتعلقة بهذا العقد صحيحة ومنتجة لآثارها متى تمت بإحدى الوسائل المعتمدة قانونًا أو المتفق عليها بين الطرفين.

1. الموطن المختار: يُعد عنوان كل طرف المثبت في المادة الأولى موطنًا مختارًا له، وتوجه إليه المكاتبات والإنذارات الرسمية ما لم يُخطر الطرف الآخر بتغييره وفقًا لهذه المادة.

2. الوسائل الإلكترونية: إذا فعّل الطرفان البريد الإلكتروني أو تطبيقات المراسلة في بيانات هذا العقد، تُعد البيانات المحددة في البنود الإضافية التالية وسائل اتصال معتمدة في حدود ما يسمح به القانون، ولا يترتب على المراسلة الإلكترونية وحدها تعديل جوهر العقد إلا إذا تضمنت اتفاقًا صريحًا مستوفيًا لشروط التعديل.

3. تغيير بيانات الاتصال: يلتزم كل طرف بإخطار الطرف الآخر كتابةً بأي تعديل في عنوانه أو بيانات الاتصال المعتمدة خلال مدة لا تجاوز {{sale_notice_change_days}} يومًا من تاريخ حدوث التعديل، وتظل البيانات السابقة منتجة لآثارها إلى حين تمام الإخطار بالتغيير.

4. وسائل أخرى: يجوز للطرفين اعتماد وسيلة اتصال إضافية كتابةً بعد التوقيع، وتنتج آثارها من تاريخ اعتمادها.`;
    variables.push("sale_notice_change_days");
  }

  if (key === "preliminary_sale_source_article_11") {
    body = body
      .replace("وأنه قبل الشراء والاستالم الفوري لها بحالتها الراهنة وقت التوقيع.", "وأنه قبل شراءها بالحالة الظاهرة وقت التعاقد، على أن يتم الاستلام وفق المادة السابعة وطريقة السداد المختارة.")
      .replace("معاينته وقبوله الفوري", "معاينته وقبوله للمبيع");
    body = body.replace(/ويمتد هذا الضمان التعاقدي[\s\S]*?سنوات من تاريخ\s*االستالم\./, "ويمتد هذا الضمان التعاقدي من البائع للمشتري لمدة {{preliminary_hidden_defect_warranty_years}} سنوات من تاريخ الاستلام الفعلي.");
    variables.push("preliminary_hidden_defect_warranty_years");
  }
  if (key === "preliminary_sale_source_article_12") {
    body = body.replace("يلتزم الطرف المحدد في بيانات العقد بسداد ضريبة التصرفات العقارية", "اتفق الطرفان فيما بينهما على أن يتحمل {{preliminary_disposition_tax_payer_text}} ضريبة التصرفات العقارية");
    variables.push("preliminary_disposition_tax_payer_text");
  }
  if (key === "registrable_sale_source_article_10") {
    body = body.replace("يلتزم الطرف المحدد في بيانات العقد بسداد ضريبة التصرفات العقارية", "اتفق الطرفان فيما بينهما على أن يتحمل {{registrable_disposition_tax_payer_text}} ضريبة التصرفات العقارية");
    variables.push("registrable_disposition_tax_payer_text");
  }
  if (key === "inherited_sale_source_article_10") {
    body = body.replace("يلتزم الطرف المحدد في بيانات العقد بسداد ضريبة التصرفات العقارية", "اتفق الطرفان فيما بينهما على أن يتحمل {{inherited_disposition_tax_payer_text}} ضريبة التصرفات العقارية");
    variables.push("inherited_disposition_tax_payer_text");
  }
  if (key === "inherited_sale_source_article_12") {
    body = `يقر الطرف الأول (البائع) ويضمن للطرف الثاني (المشتري) ما يأتي:

1. أن جميع البيانات والمعلومات والمستندات المتعلقة بالوحدة أو بالميراث أو بصفته في التصرف صحيحة ومطابقة - بحسب المستندات المقدمة - ويتحمل المسؤولية القانونية عن عدم صحتها أو إخفاء ما كان يجب الإفصاح عنه.

2. أن الوحدة محل البيع هي ذاتها المبينة بالمادة الرابعة، وأن أوصافها وحدودها وملحقاتها مطابقة للحالة الظاهرة وقت التعاقد.

3. أن حقه في التصرف مستمد من الميراث عن المرحوم {{deceased_owner_name}} بموجب إعلام الوراثة رقم {{inheritance_declaration_number}} الصادر من {{inheritance_declaration_court}} بتاريخ {{inheritance_declaration_date}}، وأن سند ملكية المورث هو: {{deceased_title_description}}.

4. أن السند الذي يثبت صفته وسلطته في التصرف هو: {{inheritance_disposition_detail}}، وأنه صحيح وساري ونافذ وقت التوقيع في الحدود اللازمة لهذا البيع.

5. أن الوحدة - في حدود ما يضمنه قانونًا - خالية من أي تصرف أو حق أو قيد صادر منه أو مترتب بسببه يتعارض مع حقوق المشتري، وأنه لم يسبق له التصرف فيها بما يتعارض مع هذا العقد.

6. أنه يضمن عدم التعرض والاستحقاق في الحدود المقررة بهذا العقد والقانون، ويلتزم بإخطار المشتري بأي نزاع أو مطالبة يعلم بها وتتعلق بالميراث أو بالوحدة أو بحقوق باقي الورثة.

7. {{inheritance_heirs_capacity_text}} وإذا ظهرت حالة تستلزم إذنًا قضائيًا أو وصائيًا أو مسارًا قانونيًا خاصًا، فلا يجوز الاعتماد على هذا الإقرار لإتمام التصرف على خلاف الحقيقة أو القانون.`;
    variables.push("deceased_owner_name", "inheritance_declaration_number", "inheritance_declaration_court", "inheritance_declaration_date", "deceased_title_description", "inheritance_disposition_detail", "inheritance_heirs_capacity_text");
  }
  if (key === "inherited_sale_source_article_13") {
    body = replaceRange(body, "رابعا", "خامسا", "رابعا: يقر المشتري بأن استلام الوحدة وانتقال حيازتها إليه يكونان وفق المادة السابعة وطريقة السداد المختارة، ولا يعد توقيع العقد وحده إقرارًا بالاستلام إذا كان التسليم مستحقًا في تاريخ لاحق.\n\n");
    body = removeRange(body, "( في حالة البيع بالتقسيط )");
  }
  if (key === "preliminary_sale_source_article_20" || key === "registrable_sale_source_article_18" || key === "inherited_sale_source_article_18") {
    const inheritanceExtra = key === "inherited_sale_source_article_18"
      ? "\n\n6. منازعات الميراث: لا تُعد من قبيل القوة القاهرة أو الظرف الطارئ أي منازعة تتعلق بصحة إعلام الوراثة أو ظهور وارث أو صاحب حق أو الطعن على سند حق البائع في التصرف، وتظل خاضعة لأحكام الضمان والإقرارات والمسؤولية الواردة بالعقد والقانون."
      : "";
    body = `اتفق الطرفان على تنظيم آثار القوة القاهرة والظروف الطارئة وفقًا للقواعد الآتية:

1. القوة القاهرة والظرف الطارئ: يقصد بهما الحوادث الاستثنائية العامة الخارجة عن إرادة الطرف المتأثر والتي يستحيل دفعها أو يترتب عليها استحالة التنفيذ أو إرهاقه على النحو الذي يعتد به القانون، ولا يدخل فيها ما يرجع إلى خطأ أو تقصير من يتمسك بها.

2. تبعة الهلاك والمخاطر: تنتقل تبعة الهلاك أو التلف اللاحق للتسليم إلى المشتري من تاريخ التسليم الفعلي المحدد وفق المادة السابعة، لا من مجرد تاريخ توقيع العقد إذا كان التسليم مؤجلًا. وتظل مسؤولية البائع قائمة عن الأسباب السابقة على التسليم والعيوب والضمانات التي يلتزم بها بموجب العقد أو القانون.

3. القرارات الإدارية ونزع الملكية: لا يُعفى البائع من المسؤولية عن قرار أو إجراء سببه واقعة أو مخالفة أو وضع قانوني سابق على البيع كان يعلم به أو كان يلزمه الإفصاح عنه. أما نزع الملكية للمنفعة العامة اللاحق للتعاقد ولسبب لا يرجع إلى إخلال أحد الطرفين فتسري بشأنه الحقوق والتعويضات المقررة قانونًا لصاحب الحق.

4. الإخطار: يلتزم الطرف الذي يتمسك بالقوة القاهرة أو الظرف الطارئ بإخطار الطرف الآخر خلال مدة لا تجاوز {{sale_force_majeure_notice_days}} يومًا من تاريخ علمه بالواقعة، مع بيان طبيعتها وأثرها وتقديم ما يتوافر من مستندات مؤيدة واتخاذ الإجراءات المعقولة للحد من آثارها.

5. عدم الإخلال بالضمانات: لا يترتب على تطبيق هذه المادة إعفاء أي طرف من مسؤولية ناشئة عن سبب سابق أو عن غش أو خطأ جسيم أو ضمان أو التزام مستقل يظل نافذًا وفق العقد أو القانون.${inheritanceExtra}`;
    variables.push("sale_force_majeure_notice_days");
  }

  if (key === "preliminary_sale_source_article_22" || key === "registrable_sale_source_article_20" || key === "inherited_sale_source_article_20") {
    const amicable = key === "inherited_sale_source_article_20"
      ? "{{sale_amicable_settlement_days}}"
      : "خمسة عشر (15)";
    body = `1. القانون الواجب التطبيق: يخضع هذا العقد في تفسيره وتنفيذه وآثاره لأحكام القوانين السارية في جمهورية مصر العربية.

2. الاختصاص المحلي: {{sale_property_jurisdiction_text}}

3. التسوية الودية: يسعى الطرفان - دون أن يكون ذلك شرطًا لقبول الدعوى - إلى تسوية أي نزاع ينشأ عن العقد وديًا خلال مدة ${amicable} يومًا من تاريخ إخطار أحدهما للآخر بقيام النزاع. ولا يترتب على محاولة التسوية وقف المواعيد القانونية أو منع أي طرف من اتخاذ إجراء وقتي أو تحفظي أو اللجوء إلى القضاء المختص.`;
    variables.push("sale_property_jurisdiction_text");
    if (key === "inherited_sale_source_article_20") variables.push("sale_amicable_settlement_days");
  }

  if (key === "preliminary_sale_source_article_23" || key === "registrable_sale_source_article_21") {
    body = body.replace(/ثامنا\s*:مكان تحرير العقد[\s\S]*$/, "ثامنا: مكان تحرير العقد: حُرر هذا العقد بمدينة {{sale_contract_city}}، في تاريخ {{contract_date}}.");
    variables.push("sale_contract_city", "contract_date");
  }
  if (key === "inherited_sale_source_article_21") {
    body = body.replace(/سابعا\s*:مكان تحرير العقد[\s\S]*?(?=ثامنا)/, "سابعا: مكان تحرير العقد: حُرر هذا العقد بمدينة {{sale_contract_city}}، في تاريخ {{contract_date}}.\n\n");
    variables.push("sale_contract_city", "contract_date");
  }
  if (key === "registrable_sale_source_article_23") {
    body = "حُرر هذا العقد من {{sale_contract_copies_count}} نسخ أصلية متطابقة، بيد كل طرف نسخة للعمل بموجبها عند اللزوم، ويتسلم كل طرف نسخته عقب التوقيع على هذا العقد.";
    variables.push("sale_contract_copies_count");
  }
  if (key === "inherited_sale_source_article_23") {
    body = "حُرر هذا العقد من {{sale_contract_copies_count}} نسخ أصلية متطابقة تتمتع بذات الحجية القانونية، ويتسلم كل طرف نسخة أصلية للعمل بموجبها عند اللزوم، ويجوز تحرير نسخ إضافية عند الحاجة للإجراءات القانونية وفقًا لأحكام العقد.";
    variables.push("sale_contract_copies_count");
  }
  if (key === "preliminary_sale_source_article_24") {
    body = "تعد المستندات التي تم إرفاقها فعليًا واعتمادها مع هذا العقد مكملة ومفسرة له في حدود ما ورد بها. ويلزم لإصدار العقد إرفاق هوية الطرفين وسند تصرف البائع ومستندات تسلسل التصرف بحسب الحالة المختارة. وإذا كان هناك طلب تصالح قائم فيلزم إرفاق مستنداته. أما إيصالات المرافق ورخصة البناء أو مستندات التصالح الأخرى ومحضر الاستلام والرسومات أو المستندات الإضافية فلا توصف بأنها مرفقة إلا إذا تم رفعها أو اعتمادها فعليًا. وفي حالة التقسيط يجوز للطرفين اعتماد ملحق جدول الأقساط المستقل وفق القالب الاختياري.";
  }
  if (key === "registrable_sale_source_article_22") {
    body = "تعد المستندات التي تم إرفاقها فعليًا واعتمادها مع هذا العقد مكملة ومفسرة له في حدود ما ورد بها. ويلزم لإصدار العقد إرفاق هوية الطرفين وسند ملكية البائع ومستنداته اللازمة بحسب الحالة المختارة. {{registrable_negative_certificate_text}} ولا توصف إيصالات المرافق أو رخصة البناء أو مستندات التصالح أو الخرائط أو المستندات الإضافية بأنها مرفقة إلا إذا تم رفعها أو اعتمادها فعليًا. وفي حالة التقسيط يجوز للطرفين اعتماد ملحق جدول الأقساط المستقل وفق القالب الاختياري.";
    variables.push("registrable_negative_certificate_text");
  }
  if (key === "inherited_sale_source_article_22") {
    body = "تعد المستندات التي تم إرفاقها فعليًا واعتمادها مع هذا العقد مكملة ومفسرة له في حدود ما ورد بها. ويلزم لإصدار العقد إرفاق هوية الطرفين، وإعلام الوراثة، وشهادة وفاة المورث، وسند ملكية المورث، وسند حق البائع في التصرف بحسب الحالة المختارة. ولا توصف إيصالات المرافق أو رخصة البناء أو مستندات التصالح أو محضر الاستلام أو الخرائط أو المستندات الإضافية بأنها مرفقة إلا إذا تم رفعها أو اعتمادها فعليًا. وفي حالة التقسيط يجوز للطرفين اعتماد ملحق جدول الأقساط المستقل وفق القالب الاختياري.";
  }
  if (false && key === "registrable_sale_source_article_22") {
    body = removeRange(body, "( هل يوجد شهادة سلبية )", "(في حالة اختيار جدول اقساط )");
    body = removeRange(body, "(في حالة اختيار جدول اقساط )", "أي مستندات أو ملاحق");
  }
  if (false && (key === "preliminary_sale_source_article_24" || key === "inherited_sale_source_article_22")) {
    body = body.replace(/جدول سداد األقساط[\s\S]*?(?=\n\n|$)/g, "");
    body = body.replace(/(?:\( في حالة البيع بالتقسيط \)\s*)?\.10\s*(?=\n|$)/g, "").replace(/–\s*\.8\s*$/g, "").trim();
  }
  return { ...item, bodyAr: body, variables: [...new Set(variables)] };
});

const conditionalClauses: LegalClauseDefinition[] = [
  customClause({
    key: "sale_jurisdiction_court_clause",
    titleAr: "تحديد الاختصاص المحلي بحسب موقع العقار",
    variables: ["sale_property_jurisdiction_text"],
    bodyAr: "{{sale_property_jurisdiction_text}} ولا ينشئ هذا البيان اختصاصًا مخالفًا لقواعد الاختصاص الولائي أو النوعي أو القيمي الآمرة.",
  }),
  customClause({ key: "sale_full_payment_clause", titleAr: "السداد الكامل في مجلس العقد", variables: ["sale_total_price", "sale_total_price_words"], bodyAr: "يقر البائع بأنه تسلم من المشتري قبل التوقيع وفي مجلس العقد كامل ثمن البيع وقدره {{sale_total_price}} جنيه مصري ({{sale_total_price_words}})، ويُعد توقيعه مخالصة نهائية باستلام كامل الثمن وإبراءً لذمة المشتري من الالتزام المالي الناشئ عن الثمن، دون إخلال بأي التزامات أخرى ناشئة عن العقد أو القانون.", visibleWhen: fullPaymentCondition }),
  customClause({ key: "sale_installment_payment_clause", titleAr: "السداد بالتقسيط أو على دفعات", variables: ["sale_down_payment", "sale_remaining_amount", "sale_installment_grace_days", "sale_installment_schedule_text", "sale_payment_method"], bodyAr: `يقر البائع باستلام مقدم قدره {{sale_down_payment}} جنيه مصري، ويكون باقي الثمن المستحق {{sale_remaining_amount}} جنيه مصري. واتفق الطرفان على جدول السداد الآتي: {{sale_installment_schedule_text}} وتكون وسيلة/وسائل السداد: {{sale_payment_method}}.

إذا تأخر المشتري عن سداد أي قسط في موعد استحقاقه لمدة تتجاوز {{sale_installment_grace_days}} يومًا (فترة سماح)، حلت واستحقت باقي الأقساط المؤجلة فورًا بقوة الاتفاق ودون حاجة لتوجيه إنذار، ويلتزم بسداد كامل المتبقي من الثمن فورًا كدفعة واحدة. وإذا تأخر عن سداد قسطين متتاليين أو أي ثلاثة أقساط متفرقة، يُعتبر العقد مفسوخًا من تلقاء نفسه وبمرتبة الشرط الفاسخ الصريح، دون حاجة إلى إعذار أو الحصول على حكم قضائي بالفسخ، وفق الصياغة الواردة بالمصدر.

ولا يُعد قبول البائع لقسط متأخر تنازلاً عن حقوقه ما لم يثبت اتفاق كتابي صريح على خلاف ذلك، ولا يجوز للمشتري التصرف في الوحدة بتصرف ناقل للملكية قبل سداد كامل الثمن إلا بموافقة كتابية صريحة من البائع وفي الحدود المبينة بالعقد.`, visibleWhen: installmentCondition }),
  customClause({ key: "preliminary_installment_payment_clause", titleAr: "السداد بالتقسيط أو على دفعات", variables: ["sale_down_payment", "sale_remaining_amount", "sale_installment_schedule_text", "sale_payment_method", "sale_installment_grace_days"], bodyAr: `يقر البائع باستلام مقدم قدره {{sale_down_payment}} جنيه مصري، ويكون باقي الثمن المستحق {{sale_remaining_amount}} جنيه مصري. واتفق الطرفان على جدول السداد الآتي: {{sale_installment_schedule_text}} وتكون وسيلة/وسائل السداد: {{sale_payment_method}}.

إذا تأخر المشتري عن سداد أي قسط في موعد استحقاقه لمدة تتجاوز {{sale_installment_grace_days}} يومًا، حلت واستحقت باقي الأقساط المؤجلة فورًا بقوة الاتفاق ودون حاجة لتوجيه إنذار، ويلتزم بسداد كامل المتبقي من الثمن فورًا كدفعة واحدة. وإذا تأخر عن سداد قسطين متتاليين أو أي ثلاثة أقساط متفرقة، يُعتبر العقد مفسوخًا من تلقاء نفسه وبمرتبة الشرط الفاسخ الصريح، دون حاجة إلى إعذار أو الحصول على حكم قضائي بالفسخ، وفق الصياغة الواردة بالمصدر.

ولا يُعد قبول البائع لقسط متأخر تنازلاً عن حقوقه ما لم يثبت اتفاق كتابي صريح على خلاف ذلك، ولا يجوز للمشتري التصرف في الوحدة بتصرف ناقل للملكية قبل سداد كامل الثمن إلا بموافقة كتابية صريحة من البائع وفي الحدود المبينة بالعقد.`, visibleWhen: installmentCondition, sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", sourcePageStart: 5, sourcePageEnd: 5 }),
  customClause({ key: "sale_installment_rescission_penalty_clause", titleAr: "أثر الفسخ في حالة التقسيط", variables: ["sale_installment_rescission_compensation_percent"], bodyAr: "في النوع الذي ينص على تعويض اتفاقي عند تحقق الفسخ بسبب التأخر في الأقساط، تكون النسبة المتفق عليها {{sale_installment_rescission_compensation_percent}}% من إجمالي الثمن، وذلك في الحدود ووفقًا للشروط الواردة بالعقد والقانون.", visibleWhen: allConditions(installmentCondition, anyConditions({ fieldKey: "sale_installment_rescission_compensation_percent", operator: "truthy" })) }),
  customClause({ key: "sale_full_delivery_clause", titleAr: "التسليم في حالة السداد الكامل", variables: ["sale_delivery_delay_daily_compensation", "sale_delivery_delay_threshold_days"], bodyAr: "يلتزم البائع بتسليم الوحدة للمشتري تسليم الحيازة القانونية والهادئة فور التوقيع على العقد في حالة السداد الكامل. وإذا تخلف عن التسليم، يطبق التعويض الاتفاقي المبين ببيانات العقد وقدره {{sale_delivery_delay_daily_compensation}} جنيه مصري عن كل يوم تأخير، ويعد تجاوز مدة {{sale_delivery_delay_threshold_days}} يومًا إخلالًا جوهريًا وفق أحكام العقد.", visibleWhen: fullPaymentCondition }),
  customClause({ key: "sale_installment_delivery_clause", titleAr: "التسليم في حالة التقسيط", variables: ["sale_delivery_delay_daily_compensation", "sale_delivery_delay_threshold_days"], bodyAr: "في حالة التقسيط، يلتزم البائع بتسليم الوحدة للمشتري بعد سداد كامل الثمن ومن تاريخ سداد آخر قسط. وإذا تخلف عن التسليم بعد استحقاقه، يطبق التعويض الاتفاقي المبين ببيانات العقد وقدره {{sale_delivery_delay_daily_compensation}} جنيه مصري عن كل يوم تأخير، ويعد تجاوز مدة {{sale_delivery_delay_threshold_days}} يومًا إخلالًا جوهريًا وفق أحكام العقد.", visibleWhen: installmentCondition }),
  customClause({ key: "registrable_full_delivery_clause", titleAr: "التسليم في حالة السداد الكامل", variables: ["sale_delivery_delay_daily_compensation", "sale_delivery_delay_threshold_days"], bodyAr: "يلتزم البائع بتسليم الوحدة للمشتري تسليم الحيازة القانونية والهادئة فور التوقيع على العقد في حالة السداد الكامل. وإذا تخلف عن التسليم، يطبق التعويض الاتفاقي وقدره {{sale_delivery_delay_daily_compensation}} جنيه مصري عن كل يوم تأخير، وإذا تجاوز التأخير {{sale_delivery_delay_threshold_days}} يومًا عُد ذلك إخلالًا جوهريًا وفق أحكام العقد.", visibleWhen: fullPaymentCondition, sourceDocumentName: "عقد بيع قابل للتسجيل في الشهر العقاري Z DRAFT.pdf", sourcePageStart: 6, sourcePageEnd: 6 }),
  customClause({ key: "registrable_installment_delivery_clause", titleAr: "التسليم في حالة التقسيط", variables: ["sale_delivery_delay_daily_compensation", "sale_delivery_delay_threshold_days"], bodyAr: "في حالة التقسيط، يلتزم البائع بتسليم الوحدة للمشتري بعد سداد كامل الثمن ومن تاريخ سداد آخر قسط. وإذا تخلف عن التسليم بعد استحقاقه، يطبق التعويض الاتفاقي وقدره {{sale_delivery_delay_daily_compensation}} جنيه مصري عن كل يوم تأخير، وإذا تجاوز التأخير {{sale_delivery_delay_threshold_days}} يومًا عُد ذلك إخلالًا جوهريًا وفق أحكام العقد.", visibleWhen: installmentCondition, sourceDocumentName: "عقد بيع قابل للتسجيل في الشهر العقاري Z DRAFT.pdf", sourcePageStart: 6, sourcePageEnd: 6 }),
  customClause({ key: "sale_occupied_unit_clause", titleAr: "الوحدة المؤجرة أو المشغولة", variables: ["sale_occupancy_status_text"], bodyAr: "{{sale_occupancy_status_text}}", visibleWhen: { fieldKey: "sale_unit_is_occupied", operator: "truthy" } }),
  customClause({ key: "preliminary_benefits_clause", titleAr: "المنافع والملحقات والحصة الشائعة — بند مرجعي قديم", bodyAr: "تم دمج حكم المنافع والملحقات والحصة الشائعة في المواد الأساسية للعقد لمنع ازدواج القرار أو تعارضه.", enabled: false, sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", sourcePageStart: 2, sourcePageEnd: 2 }),
  customClause({ key: "preliminary_garage_included_clause", titleAr: "الموقف العرفي للجراج — يشمل مكان سيارة", bodyAr: "يشمل البيع حق المشتري في تخصيص حيازة مكان لسيارة واحدة (باركينج) بالجراج الخاص بالعقار كحق تابع للوحدة وفق ما ورد بالعقد.", visibleWhen: { fieldKey: "preliminary_garage_status", operator: "equals", value: "included" }, sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", sourcePageStart: 6, sourcePageEnd: 7 }),
  customClause({ key: "preliminary_garage_excluded_clause", titleAr: "الموقف العرفي للجراج — غير مشمول", bodyAr: "اتفق الطرفان على أن البيع لا يشمل أي حصة أو حق للمشتري في استعمال أو حيازة جراج العقار، ويظل الجراج خارج نطاق التعاقد.", visibleWhen: { fieldKey: "preliminary_garage_status", operator: "equals", value: "not_included" }, sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", sourcePageStart: 6, sourcePageEnd: 7 }),
  customClause({ key: "preliminary_reconciliation_submitted_seller_clause", titleAr: "طلب التصالح القائم — استكماله بواسطة البائع", variables: ["preliminary_reconciliation_request_number", "preliminary_reconciliation_request_year"], bodyAr: "يقر البائع بوجود طلب تصالح عن مخالفات بناء مقيد برقم {{preliminary_reconciliation_request_number}} لسنة {{preliminary_reconciliation_request_year}}، وباطلاع المشتري على مستنداته. واتفق الطرفان على أن يستكمل البائع إجراءات الطلب والمستندات والرسوم التي تقع عليه حتى الوصول إلى الموقف النهائي وفق أحكام القانون والعقد، مع التزامه بتسليم المشتري ما يصدر بشأن الطلب من مستندات أو قرارات متى كانت متعلقة بالوحدة محل البيع.", visibleWhen: allConditions({ fieldKey: "preliminary_reconciliation_status", operator: "equals", value: "submitted" }, { fieldKey: "preliminary_reconciliation_responsible_party", operator: "equals", value: "seller" }), sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", sourcePageStart: 7, sourcePageEnd: 8 }),
  customClause({ key: "preliminary_reconciliation_submitted_buyer_clause", titleAr: "طلب التصالح القائم — استكماله بواسطة المشتري", variables: ["preliminary_reconciliation_request_number", "preliminary_reconciliation_request_year"], bodyAr: "يقر البائع بوجود طلب تصالح عن مخالفات بناء مقيد برقم {{preliminary_reconciliation_request_number}} لسنة {{preliminary_reconciliation_request_year}}، وباطلاع المشتري على مستنداته. واتفق الطرفان على أن يستكمل المشتري الإجراءات بعد قيام البائع بما يلزم قانونًا لتمكينه من ذلك أو التنازل/التفويض عن الطلب متى كان ذلك جائزًا، مع بقاء مسؤولية البائع عن أي سبب أو بيان سابق على البيع يثبت أنه أخفاه أو قدمه على غير الحقيقة وفق أحكام العقد والقانون.", visibleWhen: allConditions({ fieldKey: "preliminary_reconciliation_status", operator: "equals", value: "submitted" }, { fieldKey: "preliminary_reconciliation_responsible_party", operator: "equals", value: "buyer" }), sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", sourcePageStart: 7, sourcePageEnd: 8 }),
  customClause({ key: "preliminary_reconciliation_none_clause", titleAr: "عدم وجود مخالفات تستوجب التصالح", bodyAr: "يقر البائع بعدم وجود مخالفات بناء تستوجب التصالح وفقًا للمستندات المتوافرة لديه حتى تاريخ التوقيع، ويتحمل مسؤولية ما يثبت خلاف ذلك إذا كان سابقًا على البيع وأخفاه عن المشتري.", visibleWhen: { fieldKey: "preliminary_reconciliation_status", operator: "equals", value: "none" }, sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", sourcePageStart: 8, sourcePageEnd: 8 }),
  customClause({ key: "preliminary_contractual_penalty_clause", titleAr: "الشرط الجزائي الاتفاقي", variables: ["preliminary_contractual_penalty_amount", "preliminary_contractual_penalty_trigger"], bodyAr: "اتفق الطرفان صراحةً على شرط جزائي قيمته {{preliminary_contractual_penalty_amount}} جنيه مصري، ويستحق عند تحقق الحالة الآتية: {{preliminary_contractual_penalty_trigger}}، وذلك مع خضوعه للأحكام المنظمة للشرط الجزائي في القانون المدني.", visibleWhen: { fieldKey: "preliminary_contractual_penalty_enabled", operator: "truthy" }, sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", sourcePageStart: 11, sourcePageEnd: 11 }),
  customClause({ key: "registrable_contractual_penalty_clause", titleAr: "الشرط الجزائي الاتفاقي", variables: ["registrable_contractual_penalty_amount", "registrable_contractual_penalty_trigger"], bodyAr: "اتفق الطرفان صراحةً على شرط جزائي قيمته {{registrable_contractual_penalty_amount}} جنيه مصري ويستحق عند تحقق الحالة الآتية: {{registrable_contractual_penalty_trigger}}، باعتباره تعويضًا اتفاقيًا، مع خضوعه للأحكام المنظمة للشرط الجزائي في القانون المدني ودون إخلال بحقوق الطرفين المقررة قانونًا.", visibleWhen: { fieldKey: "registrable_contractual_penalty_enabled", operator: "truthy" }, sourceDocumentName: "عقد بيع قابل للتسجيل في الشهر العقاري Z DRAFT.pdf", sourcePageStart: 12, sourcePageEnd: 12 }),
  customClause({ key: "sale_email_notice_clause", titleAr: "البريد الإلكتروني المعتمد", variables: ["sale_email_notices_text"], bodyAr: "{{sale_email_notices_text}}", visibleWhen: { fieldKey: "sale_email_notices_enabled", operator: "truthy" } }),
  customClause({ key: "sale_messaging_clause", titleAr: "واتساب / وسائل المراسلة الإلكترونية المعتمدة", variables: ["sale_messaging_notices_text"], bodyAr: "{{sale_messaging_notices_text}}", visibleWhen: { fieldKey: "sale_messaging_enabled", operator: "truthy" } }),
  customClause({ key: "registrable_negative_certificate_clause", titleAr: "شهادة التصرفات العقارية السلبية (نموذج 19)", bodyAr: "تم اختيار إرفاق شهادة تصرفات عقارية سلبية حديثة، ويلتزم البائع بتقديمها وفق الغرض والإجراءات الواردة بالعقد.", visibleWhen: { fieldKey: "registrable_negative_certificate_enabled", operator: "truthy" }, sourceDocumentName: "عقد بيع قابل للتسجيل في الشهر العقاري Z DRAFT.pdf", sourcePageStart: 15, sourcePageEnd: 15 }),
];

function orderedSaleClauseKeys(variantKey: "preliminary_sale" | "registrable_sale" | "inherited_sale"): string[] {
  const signatureSourceKeys = new Set(["preliminary_sale_source_article_25", "registrable_sale_source_article_24", "inherited_sale_source_article_24"]);
  const base = [...saleSourceClauseKeysByVariant[variantKey]].filter((key) => !signatureSourceKeys.has(key));
  const after: Record<string, string[]> = variantKey === "preliminary_sale" ? {
    preliminary_sale_source_article_06: ["sale_full_payment_clause", "preliminary_installment_payment_clause", "sale_installment_rescission_penalty_clause"],
    preliminary_sale_source_article_07: ["sale_full_delivery_clause", "sale_installment_delivery_clause", "sale_occupied_unit_clause"],
    preliminary_sale_source_article_13: ["preliminary_reconciliation_submitted_seller_clause", "preliminary_reconciliation_submitted_buyer_clause", "preliminary_reconciliation_none_clause"],
    preliminary_sale_source_article_19: ["preliminary_contractual_penalty_clause"],
    preliminary_sale_source_article_21: ["sale_email_notice_clause", "sale_messaging_clause"],
  } : variantKey === "registrable_sale" ? {
    registrable_sale_source_article_06: ["sale_full_payment_clause", "sale_installment_payment_clause"],
    registrable_sale_source_article_07: ["registrable_full_delivery_clause", "registrable_installment_delivery_clause", "sale_occupied_unit_clause"],
    registrable_sale_source_article_17: ["registrable_contractual_penalty_clause"],
    registrable_sale_source_article_19: ["sale_email_notice_clause", "sale_messaging_clause"],
    registrable_sale_source_article_22: ["registrable_negative_certificate_clause"],
  } : {
    inherited_sale_source_article_06: ["sale_full_payment_clause", "sale_installment_payment_clause", "sale_installment_rescission_penalty_clause"],
    inherited_sale_source_article_07: ["sale_full_delivery_clause", "sale_installment_delivery_clause", "sale_occupied_unit_clause"],
    inherited_sale_source_article_19: ["sale_email_notice_clause", "sale_messaging_clause"],
  };
  const result: string[] = [];
  for (const key of base) {
    result.push(key);
    result.push(...(after[key] ?? []));
  }
  return result;
}

const installmentAnnex: OptionalClauseDefinition = {
  key: "sale_installment_schedule",
  nameAr: "ملحق جدول سداد الأقساط",
  documentTitleAr: "جدول سداد الأقساط",
  sourceDocumentName: "ملحق ( جدول الاقساط ) Z DRAFT.pdf",
  outputMode: "separate_annex",
  manualFillAnnex: true,
  description: "ملحق اختياري بالكامل وقالب فارغ للطباعة والتعبئة اليدوية؛ لا يُضاف تلقائيًا ولا تُنقل إليه بيانات الـWizard، ويظهر للاختيار عند البيع بالتقسيط.",
  applicableVariantKeys: ["preliminary_sale", "registrable_sale", "inherited_sale"],
  insertBeforeStepKey: "sale_review",
  legalClauseKeys: ["sale_installment_schedule_manual_clause"],
  insertedSteps: [
    {
      key: "sale_installment_schedule_header", titleAr: "بيانات الملحق والعقد", articleRange: "ملحق مستقل — يعبأ يدويًا بعد الطباعة",
      fields: [
        { key: "annex_manual_date", type: "date", labelAr: "تاريخ تحرير الملحق" },
        { key: "annex_manual_contract_date", type: "date", labelAr: "تاريخ عقد البيع الأصلي" },
        { key: "annex_manual_contract_number", type: "text", labelAr: "رقم العقد (إن وجد)" },
      ],
    },
    {
      key: "sale_installment_schedule_price", titleAr: "أولاً: بيانات الثمن", articleRange: "ملحق مستقل — يعبأ يدويًا",
      fields: [
        { key: "annex_manual_total_price", type: "text", labelAr: "إجمالي ثمن البيع" },
        { key: "annex_manual_down_payment", type: "text", labelAr: "المقدم المسدد" },
        { key: "annex_manual_remaining", type: "text", labelAr: "إجمالي المبلغ المتبقي" },
        { key: "annex_manual_installment_count", type: "text", labelAr: "عدد الأقساط" },
        { key: "annex_manual_installment_amount", type: "text", labelAr: "قيمة كل قسط" },
        { key: "annex_manual_frequency", type: "text", labelAr: "دورية السداد (شهرية / ربع سنوية / نصف سنوية / سنوية)" },
        { key: "annex_manual_first_due_date", type: "text", labelAr: "أول موعد استحقاق" },
        { key: "annex_manual_last_due_date", type: "text", labelAr: "آخر موعد استحقاق" },
      ],
    },
    {
      key: "sale_installment_schedule_rows", titleAr: "ثانيًا: جدول الأقساط", articleRange: "يمكن زيادة أو تخفيض عدد الصفوف بحسب عدد الأقساط",
      fields: [
        {
          key: "annex_manual_installment_rows", type: "repeater", labelAr: "جدول الأقساط", minRows: 12, blankRows: 12,
          columns: [
            { key: "installment_no", type: "text", labelAr: "م" },
            { key: "payment_method", type: "text", labelAr: "طريقة السداد" },
            { key: "due_date", type: "text", labelAr: "تاريخ الاستحقاق" },
            { key: "amount", type: "text", labelAr: "قيمة القسط" },
            { key: "payment_date", type: "text", labelAr: "تاريخ السداد" },
            { key: "receipt_reference", type: "text", labelAr: "رقم الإيصال / التحويل" },
            { key: "seller_receipt_signature", type: "text", labelAr: "توقيع البائع باستلام القسط" },
            { key: "buyer_signature", type: "text", labelAr: "توقيع المشتري" },
          ],
        },
      ],
    },
    {
      key: "sale_installment_schedule_signatures", titleAr: "التوقيعات", articleRange: "توقيعات الملحق",
      fields: [
        { key: "annex_manual_seller_name", type: "text", labelAr: "اسم البائع" },
        { key: "annex_manual_seller_capacity", type: "text", labelAr: "صفة البائع" },
        { key: "annex_manual_seller_signature", type: "text", labelAr: "توقيع البائع" },
        { key: "annex_manual_seller_fingerprint", type: "text", labelAr: "بصمة البائع" },
        { key: "annex_manual_buyer_name", type: "text", labelAr: "اسم المشتري" },
        { key: "annex_manual_buyer_capacity", type: "text", labelAr: "صفة المشتري" },
        { key: "annex_manual_buyer_signature", type: "text", labelAr: "توقيع المشتري" },
        { key: "annex_manual_buyer_fingerprint", type: "text", labelAr: "بصمة المشتري" },
      ],
    },
  ],
};

const installmentAnnexClause: LegalClauseDefinition = {
  key: "sale_installment_schedule_manual_clause",
  titleAr: "أحكام ملحق جدول سداد الأقساط",
  bodyAr: `هذا الملحق نموذج فارغ مكمل ومفسر لعقد بيع الوحدة السكنية، ويصبح جزءًا لا يتجزأ منه بعد استكمال بياناته يدويًا واعتماده والتوقيع عليه من الطرفين.

ثالثًا: طريقة السداد: يتم سداد قيمة الأقساط من خلال إحدى أو أكثر من وسائل السداد التي يحددها الطرفان، وتشمل النقد بموجب إيصال استلام موقع من البائع أو من يمثله قانونًا، أو التحويل البنكي، أو الإيداع بالحساب البنكي، أو الشيكات، أو المحافظ الإلكترونية أو تطبيق إنستاباي، أو أي وسيلة أخرى يتفق عليها الطرفان كتابةً.

رابعًا: أولوية سداد المبالغ: إذا سدد المشتري مبلغًا دون بيان القسط المقصود، يخصم أولًا من المصروفات إن وجدت، ثم من التعويضات أو الغرامات الاتفاقية إن وجدت، ثم من أقدم قسط مستحق غير مسدد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.

خامسًا: إثبات السداد: يثبت سداد القسط بإيصال استلام موقع، أو إشعار تحويل أو إيداع بنكي، أو كشف حساب بنكي، أو إشعار من محفظة إلكترونية أو إنستاباي، أو أي وسيلة إثبات كتابية أخرى يقبلها الطرفان.

سادسًا: السداد المبكر: يجوز للمشتري سداد قسط أو أكثر قبل استحقاقه أو سداد كامل المتبقي دفعة واحدة، ما لم يتفق الطرفان كتابةً على خلاف ذلك، ولا يترتب على السداد المبكر زيادة في الثمن أو جزاء إلا إذا نص العقد أو ملحقاته صراحةً على غير ذلك.

سابعًا: التأخر في السداد: يخضع التأخر في سداد أي قسط للآثار القانونية والاتفاقية المنصوص عليها في عقد البيع، وعلى الأخص ما يتعلق بحلول الأجل أو الشرط الفاسخ أو الشرط الجزائي أو التعويض إن وجد.

ثامنًا: تعديل جدول الأقساط: لا يجوز تعديل مواعيد أو قيم الأقساط أو طريقة السداد إلا بموجب ملحق كتابي موقع من الطرفين.

تاسعًا: الإقرارات: يقر الطرفان بعد استكمال هذا الملحق ومراجعته بأنهما وافقا على جميع بياناته، ويثبت ذلك بتوقيعهما في الخانات المخصصة.`,
  sourceDocumentName: "ملحق ( جدول الاقساط ) Z DRAFT.pdf",
  sourcePageStart: 1,
  sourcePageEnd: 3,
};

export const apartmentSaleTemplateDefinition: ContractTemplateDefinition = {
  slug: "apartment_sale",
  version: 16,
  nameAr: "عقود بيع الوحدات السكنية",
  description: "ثلاثة عقود بيع مستقلة مطابقة للنماذج: بيع ابتدائي، بيع قابل للتسجيل بالشهر العقاري، وبيع لوحدة آلت بالميراث، مع ملحق أقساط اختياري وفارغ قابل للطباعة والتعبئة اليدوية.",
  priceEgp: 0,
  variantPricing: {
    preliminary_sale: { selfServicePriceEgp: 139, lawyerAssistedPriceEgp: 999 },
    registrable_sale: { selfServicePriceEgp: 139, lawyerAssistedPriceEgp: 999 },
    inherited_sale: { selfServicePriceEgp: 139, lawyerAssistedPriceEgp: 999 },
  },
  variants: [
    createVariant({
      key: "preliminary_sale", nameAr: "عقد بيع ابتدائي", documentTitleAr: "عقد بيع ابتدائي لوحدة سكنية",
      description: "بيع ابتدائي مع سند ملكية عرفي/ابتدائي أو حكم أو تخصيص، وموقف الجراج والتصالح والضمانات الخاصة بالنموذج.",
      sourceDocumentName: "عقد بيع ابتدائي Z DRAFT.pdf", allowCompany: true,
      ownershipStep: preliminaryOwnershipStep, includeRescissionPercent: true, specialSteps: [preliminarySpecialStep], taxVariant: "preliminary",
      defaults: { sale_installment_grace_days: 15, sale_general_breach_cure_days: 15, sale_force_majeure_notice_days: 15, sale_notice_change_days: 15, preliminary_contractual_penalty_enabled: false },
    }),
    createVariant({
      key: "registrable_sale", nameAr: "عقد بيع قابل للتسجيل بالشهر العقاري", documentTitleAr: "عقد بيع وحدة سكنية قابل للتسجيل بالشهر العقاري",
      description: "بيع يستند إلى سند صالح للشهر والتسجيل، مع بيانات السند المطلوبة والمرفقات الخاصة بالتسجيل.",
      sourceDocumentName: "عقد بيع قابل للتسجيل في الشهر العقاري Z DRAFT.pdf", allowCompany: true,
      ownershipStep: registrableOwnershipStep, includeRescissionPercent: false, taxVariant: "registrable", postTaxSteps: [registrablePenaltyStep],
      defaults: { sale_delivery_delay_threshold_days: 30, sale_general_breach_cure_days: 30, sale_force_majeure_notice_days: 15, sale_notice_change_days: 15, sale_contract_copies_count: 2, registrable_contractual_penalty_enabled: false },
    }),
    createVariant({
      key: "inherited_sale", nameAr: "عقد بيع وحدة آلت بالميراث", documentTitleAr: "عقد بيع وحدة سكنية عن طريق الميراث",
      description: "بيع وحدة آلت للبائع بطريق الميراث، مع إعلام الوراثة وسند حق البائع في التصرف وإقرار عدم وجود قُصّر أو ناقصي أهلية وفق النموذج.",
      sourceDocumentName: "عقد بيع وحدة عن طريق الورث (Z DRAFT).pdf", allowCompany: false,
      ownershipStep: inheritedOwnershipStep, includeRescissionPercent: true, taxVariant: "inherited", postTaxSteps: [inheritedPenaltyStep],
      defaults: { sale_general_breach_cure_days: 30, sale_force_majeure_notice_days: 15, sale_notice_change_days: 15, sale_amicable_settlement_days: 15, sale_contract_copies_count: 2, inherited_contractual_penalty_enabled: false },
    }),
  ],
  optionalClauses: [installmentAnnex],
  legalClauses: [...reviewedSourceClauses, ...conditionalClauses, installmentAnnexClause]
    .map(normalizeLegalClauseDefinition),
};
