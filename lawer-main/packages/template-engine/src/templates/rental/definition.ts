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
import { rentalSourceClauseKeysByVariant, rentalSourceLegalClauses } from "../../legal-content/sourceClauses";
import { competentCourtField, contractDateField } from "../common";

const yesNo = [
  { value: "yes", labelAr: "نعم" },
  { value: "no", labelAr: "لا" },
];

const partyTypeOptions = [
  { value: "individual", labelAr: "فرد" },
  { value: "company", labelAr: "شركة / منشأة" },
];

const allConditions = (...conditions: ConditionDefinition[]): ConditionDefinition => ({ all: conditions });
const anyConditions = (...conditions: ConditionDefinition[]): ConditionDefinition => ({ any: conditions });

function partyFields(prefix: "landlord" | "tenant", label: string): WizardFieldDefinition[] {
  const companyCondition: ConditionDefinition = { fieldKey: `${prefix}_party_type`, operator: "equals", value: "company" };
  const emailReuseCondition = allConditions(
    { fieldKey: "rental_email_notices_enabled", operator: "truthy" },
    { fieldKey: "rental_notice_use_party_emails", operator: "truthy" },
  );
  return [
    { key: `${prefix}_party_type`, type: "radio", labelAr: `الصفة القانونية لـ${label}`, required: true, printInDocument: false, options: partyTypeOptions },
    { key: `${prefix}_name`, type: "text", labelAr: `الاسم الكامل لـ${label}`, required: true, validation: { minLength: 3 } },
    { key: `${prefix}_nationality`, type: "text", labelAr: "الجنسية", required: true },
    { key: `${prefix}_national_id`, type: "text", labelAr: "الرقم القومي / رقم جواز السفر", required: true },
    { key: `${prefix}_id_issuer`, type: "text", labelAr: "جهة الإصدار" },
    { key: `${prefix}_id_issue_date`, type: "date", labelAr: "تاريخ الإصدار" },
    { key: `${prefix}_address`, type: "text", labelAr: "العنوان", required: true },
    { key: `${prefix}_phone`, type: "text", labelAr: "رقم الهاتف", required: true },
    { key: `${prefix}_email`, type: "text", labelAr: "البريد الإلكتروني", requiredWhen: emailReuseCondition },
    { key: `${prefix}_company_name`, type: "text", labelAr: "اسم الشركة / المنشأة", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_company_legal_form`, type: "text", labelAr: "الشكل القانوني", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_commercial_register`, type: "text", labelAr: "رقم السجل التجاري", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_tax_card`, type: "text", labelAr: "رقم البطاقة الضريبية", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_legal_representative`, type: "text", labelAr: "يمثله قانونًا السيد", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_representative_capacity`, type: "text", labelAr: "بصفته", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_company_address`, type: "text", labelAr: "مقر الشركة", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_company_email`, type: "text", labelAr: "البريد الإلكتروني للشركة", required: true, visibleWhen: companyCondition },
  ];
}

const meterTypeOptions = [
  { value: "independent", labelAr: "مستقل" },
  { value: "shared", labelAr: "مشترك" },
];

const paymentMethodOptions = [
  { value: "cash_receipt", labelAr: "نقدًا بموجب إيصال" },
  { value: "bank_transfer", labelAr: "تحويل بنكي" },
  { value: "bank_deposit", labelAr: "إيداع بالحساب البنكي" },
  { value: "electronic_wallet", labelAr: "محفظة إلكترونية" },
  { value: "instapay", labelAr: "إنستاباي" },
  { value: "other", labelAr: "وسيلة أخرى متفق عليها كتابةً" },
];

const rentalCommonSteps: WizardStepDefinition[] = [
  {
    key: "rental_contract_meta",
    titleAr: "بيانات العقد",
    articleRange: "تاريخ تحرير العقد وعدد النسخ",
    fields: [
      contractDateField,
      { key: "contract_copies_count", type: "number", labelAr: "عدد النسخ الأصلية للعقد", required: true, validation: { min: 2 }, placeholder: "2" },
    ],
  },
  { key: "rental_landlord", titleAr: "بيانات الطرف الأول (المؤجر)", articleRange: "المادة الأولى", fields: partyFields("landlord", "المؤجر") },
  { key: "rental_tenant", titleAr: "بيانات الطرف الثاني (المستأجر)", articleRange: "المادة الأولى", fields: partyFields("tenant", "المستأجر") },
  {
    key: "rental_property",
    titleAr: "البيانات الأساسية للعين المؤجرة",
    articleRange: "المادتان الثالثة والرابعة",
    fields: [
      { key: "property_governorate", type: "text", labelAr: "المحافظة", required: true },
      { key: "property_city", type: "text", labelAr: "المدينة / المركز", required: true },
      { key: "property_district", type: "text", labelAr: "الحي / المنطقة", required: true },
      { key: "property_street", type: "text", labelAr: "اسم الشارع", required: true },
      { key: "building_number", type: "text", labelAr: "رقم العقار / المبنى" },
      { key: "floor_number", type: "text", labelAr: "الدور", required: true },
      { key: "unit_number", type: "text", labelAr: "رقم الوحدة / المقر", required: true },
      { key: "property_area", type: "number", labelAr: "المساحة الإجمالية (م²)", required: true, validation: { min: 1 } },
      { key: "electricity_meter", type: "text", labelAr: "رقم عداد الكهرباء", requiredWhen: { fieldKey: "electricity_meter_type", operator: "truthy" } },
      { key: "electricity_meter_type", type: "select", labelAr: "نوع عداد الكهرباء", requiredWhen: { fieldKey: "electricity_meter", operator: "truthy" }, options: meterTypeOptions },
      { key: "water_meter", type: "text", labelAr: "رقم عداد المياه", requiredWhen: { fieldKey: "water_meter_type", operator: "truthy" } },
      { key: "water_meter_type", type: "select", labelAr: "نوع عداد المياه", requiredWhen: { fieldKey: "water_meter", operator: "truthy" }, options: meterTypeOptions },
      { key: "gas_meter", type: "text", labelAr: "رقم عداد الغاز الطبيعي", requiredWhen: { fieldKey: "gas_meter_type", operator: "truthy" } },
      { key: "gas_meter_type", type: "select", labelAr: "نوع عداد الغاز الطبيعي", requiredWhen: { fieldKey: "gas_meter", operator: "truthy" }, options: meterTypeOptions },
    ],
  },
  {
    key: "rental_terms",
    titleAr: "مدة الإيجار والتسليم",
    articleRange: "مدة العقد وتسليم العين",
    fields: [
      { key: "lease_duration_text", type: "text", labelAr: "مدة العقد (بالشهور أو السنوات)", required: true, placeholder: "مثال: 12 شهرًا / 3 سنوات" },
      { key: "start_date", type: "date", labelAr: "تاريخ بداية الإيجار", required: true },
      { key: "end_date", type: "date", labelAr: "تاريخ انتهاء الإيجار", required: true },
      { key: "property_delivery_date", type: "date", labelAr: "تاريخ تسليم العين المؤجرة", required: true },
    ],
  },
  {
    key: "rental_financial",
    titleAr: "التأمين والأجرة وآلية السداد",
    articleRange: "التأمين والأجرة",
    fields: [
      { key: "deposit_amount", type: "money", labelAr: "مبلغ التأمين", required: true, validation: { min: 0 } },
      { key: "deposit_amount_words", type: "text", labelAr: "مبلغ التأمين كتابةً", required: true },
      { key: "rent_period", type: "radio", labelAr: "الفترة التي تستحق عنها الأجرة", required: true, options: [{ value: "شهر", labelAr: "شهر" }, { value: "سنة", labelAr: "سنة" }] },
      { key: "rent_amount", type: "money", labelAr: "القيمة الإيجارية", required: true, validation: { min: 0 } },
      { key: "rent_amount_words", type: "text", labelAr: "القيمة الإيجارية كتابةً", required: true },
      { key: "annual_increase_enabled", type: "checkbox", labelAr: "تطبيق الزيادة الدورية المنصوص عليها في هذا النوع من العقد", printInDocument: false },
      { key: "rent_due_day", type: "number", labelAr: "أقصى يوم للسداد من كل فترة إيجارية", required: true, validation: { min: 1, max: 31 } },
      { key: "holdover_daily_compensation", type: "money", labelAr: "التعويض الاتفاقي عن كل يوم تأخير في الإخلاء بعد انتهاء العقد", required: true, validation: { min: 0 } },
    ],
  },
  {
    key: "rental_notices",
    titleAr: "الإخطارات ووسائل الاتصال",
    articleRange: "الإخطارات والموطن المختار",
    fields: [
      { key: "rental_email_notices_enabled", type: "checkbox", labelAr: "اعتماد البريد الإلكتروني للإخطارات والمراسلات", printInDocument: false },
      { key: "rental_notice_use_party_emails", type: "checkbox", labelAr: "استخدام البريد المسجل للطرفين", printInDocument: false, visibleWhen: { fieldKey: "rental_email_notices_enabled", operator: "truthy" } },
      {
        key: "rental_notice_landlord_email",
        type: "text",
        labelAr: "بريد المؤجر المعتمد للإخطارات",
        visibleWhen: allConditions({ fieldKey: "rental_email_notices_enabled", operator: "truthy" }, { fieldKey: "rental_notice_use_party_emails", operator: "falsy" }),
        requiredWhen: allConditions({ fieldKey: "rental_email_notices_enabled", operator: "truthy" }, { fieldKey: "rental_notice_use_party_emails", operator: "falsy" }),
      },
      {
        key: "rental_notice_tenant_email",
        type: "text",
        labelAr: "بريد المستأجر المعتمد للإخطارات",
        visibleWhen: allConditions({ fieldKey: "rental_email_notices_enabled", operator: "truthy" }, { fieldKey: "rental_notice_use_party_emails", operator: "falsy" }),
        requiredWhen: allConditions({ fieldKey: "rental_email_notices_enabled", operator: "truthy" }, { fieldKey: "rental_notice_use_party_emails", operator: "falsy" }),
      },
      { key: "rental_messaging_enabled", type: "checkbox", labelAr: "اعتماد واتساب أو وسيلة مراسلة إلكترونية", printInDocument: false },
      { key: "rental_messaging_channel", type: "select", labelAr: "وسيلة المراسلة المعتمدة", visibleWhen: { fieldKey: "rental_messaging_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "rental_messaging_enabled", operator: "truthy" }, options: [{ value: "واتساب", labelAr: "واتساب" }, { value: "أخرى", labelAr: "وسيلة أخرى" }] },
      { key: "rental_messaging_channel_other", type: "text", labelAr: "اسم وسيلة المراسلة الأخرى", visibleWhen: allConditions({ fieldKey: "rental_messaging_enabled", operator: "truthy" }, { fieldKey: "rental_messaging_channel", operator: "equals", value: "أخرى" }), requiredWhen: allConditions({ fieldKey: "rental_messaging_enabled", operator: "truthy" }, { fieldKey: "rental_messaging_channel", operator: "equals", value: "أخرى" }) },
      { key: "rental_messaging_use_party_phones", type: "checkbox", labelAr: "استخدام أرقام الهاتف المسجلة للطرفين", printInDocument: false, visibleWhen: { fieldKey: "rental_messaging_enabled", operator: "truthy" } },
      { key: "rental_messaging_landlord_phone", type: "text", labelAr: "رقم المؤجر المعتمد للمراسلة", visibleWhen: allConditions({ fieldKey: "rental_messaging_enabled", operator: "truthy" }, { fieldKey: "rental_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "rental_messaging_enabled", operator: "truthy" }, { fieldKey: "rental_messaging_use_party_phones", operator: "falsy" }) },
      { key: "rental_messaging_tenant_phone", type: "text", labelAr: "رقم المستأجر المعتمد للمراسلة", visibleWhen: allConditions({ fieldKey: "rental_messaging_enabled", operator: "truthy" }, { fieldKey: "rental_messaging_use_party_phones", operator: "falsy" }), requiredWhen: allConditions({ fieldKey: "rental_messaging_enabled", operator: "truthy" }, { fieldKey: "rental_messaging_use_party_phones", operator: "falsy" }) },
    ],
  },
  {
    key: "rental_witnesses",
    titleAr: "الشهود والمستندات الداعمة",
    articleRange: "التوقيعات",
    fields: [
      { key: "rental_witness_1_enabled", type: "checkbox", labelAr: "إضافة الشاهد الأول", printInDocument: false },
      { key: "rental_witness_1_name", type: "text", labelAr: "اسم الشاهد الأول", visibleWhen: { fieldKey: "rental_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "rental_witness_1_enabled", operator: "truthy" }, printInDocument: false },
      { key: "rental_witness_1_national_id", type: "text", labelAr: "الرقم القومي للشاهد الأول", visibleWhen: { fieldKey: "rental_witness_1_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "rental_witness_1_enabled", operator: "truthy" }, printInDocument: false },
      { key: "rental_witness_2_enabled", type: "checkbox", labelAr: "إضافة الشاهد الثاني", printInDocument: false },
      { key: "rental_witness_2_name", type: "text", labelAr: "اسم الشاهد الثاني", visibleWhen: { fieldKey: "rental_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "rental_witness_2_enabled", operator: "truthy" }, printInDocument: false },
      { key: "rental_witness_2_national_id", type: "text", labelAr: "الرقم القومي للشاهد الثاني", visibleWhen: { fieldKey: "rental_witness_2_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "rental_witness_2_enabled", operator: "truthy" }, printInDocument: false },
      { key: "rental_supporting_documents", type: "attachment", labelAr: "مستندات داعمة للعقد (اختياري)" },
    ],
  },
];

const residentialVariantStep: WizardStepDefinition = {
  key: "rental_residential_details",
  titleAr: "تفاصيل العين السكنية والغرض من الإيجار",
  articleRange: "المواد الثالثة والرابعة والسادسة",
  fields: [
    { key: "residential_property_type", type: "select", labelAr: "نوع العين السكنية", required: true, options: [
      { value: "شقة", labelAr: "شقة" }, { value: "فيلا", labelAr: "فيلا" }, { value: "دوبلكس", labelAr: "دوبلكس" }, { value: "استوديو", labelAr: "استوديو" }, { value: "غرفة", labelAr: "غرفة" },
    ] },
    { key: "residential_compound_name", type: "text", labelAr: "اسم الكمبوند (إن وجد)" },
    { key: "residential_plot_number", type: "text", labelAr: "رقم القطعة" },
    { key: "residential_adjacency_number", type: "text", labelAr: "رقم المجاورة" },
    { key: "residential_building_name", type: "text", labelAr: "اسم البرج / العمارة" },
    { key: "rooms_count", type: "number", labelAr: "عدد غرف النوم", required: true, validation: { min: 0 } },
    { key: "reception_count", type: "number", labelAr: "عدد صالات الاستقبال", required: true, validation: { min: 0 } },
    { key: "bathrooms_count", type: "number", labelAr: "عدد الحمامات", required: true, validation: { min: 0 } },
    { key: "balconies_count", type: "number", labelAr: "عدد البلكونات", required: true, validation: { min: 0 } },
    { key: "residential_finishing_level", type: "select", labelAr: "وصف التشطيب", required: true, options: [
      { value: "بدون تشطيب", labelAr: "بدون تشطيب" }, { value: "نصف تشطيب", labelAr: "نصف تشطيب" }, { value: "تشطيب كامل", labelAr: "تشطيب كامل" }, { value: "لوكس", labelAr: "لوكس" }, { value: "سوبر لوكس", labelAr: "سوبر لوكس" }, { value: "سوبر هاي لوكس", labelAr: "سوبر هاي لوكس" },
    ] },
    { key: "residential_kitchen_description", type: "text", labelAr: "المطبخ", required: true },
    { key: "residential_use_purpose", type: "text", labelAr: "الغرض من الإيجار", required: true, placeholder: "مثال: السكن الخاص للمستأجر وأسرته" },
    { key: "residential_is_furnished", type: "checkbox", labelAr: "العين مفروشة أو مشتملة على منقولات", printInDocument: false },
    { key: "residential_includes_garage", type: "checkbox", labelAr: "ملحق: جراج" },
    { key: "residential_includes_storage", type: "checkbox", labelAr: "ملحق: مخزن" },
    { key: "residential_includes_garden", type: "checkbox", labelAr: "ملحق: حديقة" },
    { key: "residential_includes_roof", type: "checkbox", labelAr: "ملحق: سطح / رووف" },
    { key: "residential_includes_service_room", type: "checkbox", labelAr: "ملحق: غرفة خدمات" },
    { key: "residential_includes_parking", type: "checkbox", labelAr: "ملحق: مكان انتظار سيارة" },
    { key: "residential_other_annex_enabled", type: "checkbox", labelAr: "يوجد ملحق آخر", printInDocument: false },
    { key: "residential_other_annex", type: "text", labelAr: "وصف الملحق الآخر", visibleWhen: { fieldKey: "residential_other_annex_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "residential_other_annex_enabled", operator: "truthy" } },
    { key: "residential_management_rules_applicable", type: "checkbox", labelAr: "العين داخل كمبوند أو عقار يخضع لإدارة / اتحاد شاغلين", printInDocument: false },
    {
      key: "rental_payment_methods",
      type: "repeater",
      labelAr: "وسائل السداد المتفق عليها (واحدة أو أكثر)",
      required: true,
      minRows: 1,
      columns: [
        { key: "method", type: "select", labelAr: "وسيلة السداد", required: true, options: paymentMethodOptions },
        { key: "details", type: "text", labelAr: "بيانات/تفاصيل الوسيلة", visibleWhen: { fieldKey: "method", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "method", operator: "equals", value: "other" } },
      ],
    },
    { key: "residential_payment_grace_days", type: "number", labelAr: "مهلة السماح بعد استحقاق الأجرة قبل احتساب تعويض التأخير (بالأيام)", required: true, validation: { min: 1 }, placeholder: "مثال: 3 أو 5 أو 7" },
    { key: "late_payment_daily_compensation", type: "money", labelAr: "التعويض الاتفاقي عن كل يوم تأخير في سداد الأجرة", required: true, validation: { min: 0 } },
  ],
};

const commercialVariantStep: WizardStepDefinition = {
  key: "rental_commercial_details",
  titleAr: "تفاصيل الوحدة التجارية والنشاط",
  articleRange: "المواد الرابعة حتى الحادية عشرة",
  fields: [
    { key: "commercial_project_name", type: "text", labelAr: "اسم المول / المشروع التجاري (إن وجد)" },
    { key: "commercial_license_number", type: "text", labelAr: "رقم الترخيص (إن وجد)" },
    { key: "commercial_plot_number", type: "text", labelAr: "رقم القطعة" },
    { key: "commercial_site_type", type: "select", labelAr: "نوع الموقع", options: [
      { value: "داخل مول", labelAr: "داخل مول" }, { value: "على شارع رئيسي", labelAr: "على شارع رئيسي" }, { value: "على شارع فرعي", labelAr: "على شارع فرعي" }, { value: "داخل سوق تجاري", labelAr: "داخل سوق تجاري" }, { value: "داخل مشروع تجاري", labelAr: "داخل مشروع تجاري" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "commercial_site_type_other", type: "text", labelAr: "وصف الموقع الآخر", visibleWhen: { fieldKey: "commercial_site_type", operator: "equals", value: "أخرى" }, requiredWhen: { fieldKey: "commercial_site_type", operator: "equals", value: "أخرى" } },
    { key: "commercial_has_mezzanine", type: "radio", labelAr: "هل يوجد ميزانين؟", options: yesNo },
    { key: "commercial_frontage_width", type: "number", labelAr: "واجهة الوحدة بالمتر", validation: { min: 0 } },
    { key: "commercial_frontage_count", type: "number", labelAr: "عدد الواجهات", validation: { min: 0 } },
    { key: "commercial_has_storage", type: "radio", labelAr: "هل يوجد مخزن تابع؟", options: yesNo },
    { key: "commercial_has_loading_area", type: "radio", labelAr: "هل يوجد مكان مخصص للتحميل والتنزيل؟", options: yesNo },
    { key: "commercial_finishing_level", type: "select", labelAr: "وصف التشطيب", required: true, options: [
      { value: "بدون تشطيب", labelAr: "بدون تشطيب" }, { value: "نصف تشطيب", labelAr: "نصف تشطيب" }, { value: "تشطيب كامل", labelAr: "تشطيب كامل" }, { value: "مجهزة تجاريًا", labelAr: "مجهزة تجاريًا" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "commercial_finishing_other", type: "text", labelAr: "وصف التشطيب الآخر", visibleWhen: { fieldKey: "commercial_finishing_level", operator: "equals", value: "أخرى" }, requiredWhen: { fieldKey: "commercial_finishing_level", operator: "equals", value: "أخرى" } },
    { key: "commercial_activity_name", type: "text", labelAr: "النشاط التجاري المحدد", required: true },
    { key: "annual_increase_rate", type: "number", labelAr: "نسبة الزيادة السنوية (%)", visibleWhen: { fieldKey: "annual_increase_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "annual_increase_enabled", operator: "truthy" }, validation: { min: 0, max: 100 } },
    { key: "rental_payment_method", type: "select", labelAr: "وسيلة سداد الأجرة", required: true, options: paymentMethodOptions },
    { key: "rental_payment_method_other", type: "text", labelAr: "وسيلة السداد الأخرى", visibleWhen: { fieldKey: "rental_payment_method", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "rental_payment_method", operator: "equals", value: "other" } },
    { key: "late_payment_daily_compensation", type: "money", labelAr: "التعويض الاتفاقي عن كل يوم تأخير في سداد الأجرة", required: true, validation: { min: 0 } },
    { key: "commercial_early_termination_enabled", type: "checkbox", labelAr: "السماح بإنهاء العقد قبل انتهاء مدته وفق البند الاختياري", printInDocument: false },
    { key: "commercial_early_termination_compensation", type: "money", labelAr: "مقابل الإنهاء المبكر", visibleWhen: { fieldKey: "commercial_early_termination_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "commercial_early_termination_enabled", operator: "truthy" }, validation: { min: 0 } },
    { key: "commercial_safety_enabled", type: "checkbox", labelAr: "تطبيق فقرة اشتراطات الدفاع المدني والسلامة", printInDocument: false },
    { key: "commercial_guarantee_checks_enabled", type: "checkbox", labelAr: "إضافة شيكات ضمان", printInDocument: false },
    { key: "commercial_guarantee_checks_count", type: "number", labelAr: "عدد شيكات الضمان", visibleWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, validation: { min: 1 } },
    { key: "commercial_guarantee_bank", type: "text", labelAr: "اسم البنك", visibleWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" } },
    { key: "commercial_guarantee_check_numbers", type: "text", labelAr: "أرقام الشيكات", visibleWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" } },
    { key: "commercial_guarantee_value_mode", type: "radio", labelAr: "طريقة إثبات قيمة الشيكات", visibleWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, options: [{ value: "each", labelAr: "قيمة كل شيك" }, { value: "total", labelAr: "إجمالي قيمة الشيكات" }] },
    { key: "commercial_guarantee_each_amount", type: "money", labelAr: "قيمة كل شيك", visibleWhen: allConditions({ fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, { fieldKey: "commercial_guarantee_value_mode", operator: "equals", value: "each" }), requiredWhen: allConditions({ fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, { fieldKey: "commercial_guarantee_value_mode", operator: "equals", value: "each" }), validation: { min: 0 } },
    { key: "commercial_guarantee_total_amount", type: "money", labelAr: "إجمالي قيمة الشيكات", visibleWhen: allConditions({ fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, { fieldKey: "commercial_guarantee_value_mode", operator: "equals", value: "total" }), requiredWhen: allConditions({ fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, { fieldKey: "commercial_guarantee_value_mode", operator: "equals", value: "total" }), validation: { min: 0 } },
    { key: "commercial_vat_enabled", type: "checkbox", labelAr: "الأجرة خاضعة لضريبة القيمة المضافة", printInDocument: false },
    { key: "commercial_public_customers_enabled", type: "checkbox", labelAr: "النشاط يستقبل الجمهور أو العملاء", printInDocument: false },
    { key: "commercial_insurance_enabled", type: "checkbox", labelAr: "تطبيق فقرة التأمين على النشاط والمسؤولية المدنية", printInDocument: false },
    { key: "commercial_signage_enabled", type: "checkbox", labelAr: "السماح باللافتات والعلامات التجارية والإعلانات وفق الضوابط", printInDocument: false },
    { key: "commercial_legal_fees_enabled", type: "checkbox", labelAr: "تضمين فقرة رسوم الدمغة والرسوم القانونية", printInDocument: false },
    { key: "commercial_legal_fees_bearer", type: "radio", labelAr: "من يتحمل رسوم الدمغة والرسوم القانونية؟", visibleWhen: { fieldKey: "commercial_legal_fees_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "commercial_legal_fees_enabled", operator: "truthy" }, options: [{ value: "المؤجر", labelAr: "المؤجر" }, { value: "المستأجر", labelAr: "المستأجر" }, { value: "الطرفان", labelAr: "الطرفان" }] },
  ],
};

const administrativeVariantStep: WizardStepDefinition = {
  key: "rental_administrative_details",
  titleAr: "تفاصيل العين الإدارية والنشاط",
  articleRange: "المواد الرابعة حتى الحادية عشرة",
  fields: [
    { key: "administrative_project_name", type: "text", labelAr: "اسم المشروع / البرج الإداري / المجمع الإداري / الكمبوند" },
    { key: "administrative_license_number", type: "text", labelAr: "رقم الترخيص (إن وجد)" },
    { key: "administrative_plot_number", type: "text", labelAr: "رقم القطعة" },
    { key: "administrative_site_type", type: "select", labelAr: "موقع العين المؤجرة", options: [
      { value: "داخل برج إداري", labelAr: "داخل برج إداري" }, { value: "داخل مبنى متعدد الاستخدامات", labelAr: "داخل مبنى متعدد الاستخدامات" }, { value: "داخل مشروع إداري", labelAr: "داخل مشروع إداري" }, { value: "داخل كمبوند", labelAr: "داخل كمبوند" }, { value: "على شارع رئيسي", labelAr: "على شارع رئيسي" }, { value: "على شارع فرعي", labelAr: "على شارع فرعي" }, { value: "أخرى", labelAr: "أخرى" },
    ] },
    { key: "administrative_site_type_other", type: "text", labelAr: "وصف الموقع الآخر", visibleWhen: { fieldKey: "administrative_site_type", operator: "equals", value: "أخرى" }, requiredWhen: { fieldKey: "administrative_site_type", operator: "equals", value: "أخرى" } },
    { key: "administrative_meeting_room", type: "radio", labelAr: "قاعة اجتماعات", options: yesNo },
    { key: "administrative_reception", type: "radio", labelAr: "استقبال (Reception)", options: yesNo },
    { key: "administrative_storage", type: "radio", labelAr: "مخزن تابع", options: yesNo },
    { key: "administrative_lift", type: "radio", labelAr: "مصعد بالمبنى", options: yesNo },
    { key: "administrative_parking_count", type: "number", labelAr: "عدد أماكن انتظار السيارات المخصصة", validation: { min: 0 } },
    { key: "administrative_server_room", type: "radio", labelAr: "غرفة خوادم (Server Room)", options: yesNo },
    { key: "administrative_ac_system", type: "select", labelAr: "نظام التكييف", options: [{ value: "سبليت", labelAr: "سبليت" }, { value: "مركزي", labelAr: "مركزي" }, { value: "بدون", labelAr: "بدون" }] },
    { key: "administrative_data_network", type: "radio", labelAr: "شبكة البيانات (Data Network)", options: [{ value: "موجودة", labelAr: "موجودة" }, { value: "غير موجودة", labelAr: "غير موجودة" }] },
    { key: "administrative_delivery_condition", type: "select", labelAr: "حالة العين عند التسليم", options: [{ value: "vacant", labelAr: "خالية" }, { value: "furnished", labelAr: "مؤثثة" }, { value: "fully_equipped", labelAr: "مجهزة بالكامل" }, { value: "inventory_report", labelAr: "وفقًا لمحضر الجرد" }] },
    { key: "administrative_electricity_reading", type: "text", labelAr: "قراءة عداد الكهرباء عند التسليم", requiredWhen: anyConditions({ fieldKey: "electricity_meter", operator: "truthy" }, { fieldKey: "electricity_meter_type", operator: "truthy" }) },
    { key: "administrative_water_reading", type: "text", labelAr: "قراءة عداد المياه عند التسليم", requiredWhen: anyConditions({ fieldKey: "water_meter", operator: "truthy" }, { fieldKey: "water_meter_type", operator: "truthy" }) },
    { key: "administrative_gas_reading", type: "text", labelAr: "قراءة عداد الغاز عند التسليم", requiredWhen: anyConditions({ fieldKey: "gas_meter", operator: "truthy" }, { fieldKey: "gas_meter_type", operator: "truthy" }) },
    { key: "administrative_activity_name", type: "text", labelAr: "النشاط الإداري المحدد", required: true },
    { key: "rental_payment_method", type: "select", labelAr: "وسيلة سداد الأجرة", required: true, options: paymentMethodOptions },
    { key: "rental_payment_method_other", type: "text", labelAr: "وسيلة السداد الأخرى", visibleWhen: { fieldKey: "rental_payment_method", operator: "equals", value: "other" }, requiredWhen: { fieldKey: "rental_payment_method", operator: "equals", value: "other" } },
    { key: "administrative_early_termination_enabled", type: "checkbox", labelAr: "السماح بإنهاء العقد قبل انتهاء مدته وفق البند الاختياري", printInDocument: false },
    { key: "administrative_early_termination_compensation", type: "money", labelAr: "مقابل الإنهاء المبكر", visibleWhen: { fieldKey: "administrative_early_termination_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "administrative_early_termination_enabled", operator: "truthy" }, validation: { min: 0 } },
    { key: "administrative_safety_enabled", type: "checkbox", labelAr: "تطبيق فقرة اشتراطات السلامة والدفاع المدني", printInDocument: false },
    { key: "administrative_guarantee_checks_enabled", type: "checkbox", labelAr: "إضافة شيكات ضمان", printInDocument: false },
    { key: "administrative_guarantee_checks_count", type: "number", labelAr: "عدد شيكات الضمان", visibleWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, validation: { min: 1 } },
    { key: "administrative_guarantee_bank", type: "text", labelAr: "اسم البنك", visibleWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" } },
    { key: "administrative_guarantee_check_numbers", type: "text", labelAr: "أرقام الشيكات", visibleWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" } },
    { key: "administrative_guarantee_value_mode", type: "radio", labelAr: "طريقة إثبات قيمة الشيكات", visibleWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, options: [{ value: "each", labelAr: "قيمة كل شيك" }, { value: "total", labelAr: "إجمالي قيمة الشيكات" }] },
    { key: "administrative_guarantee_each_amount", type: "money", labelAr: "قيمة كل شيك", visibleWhen: allConditions({ fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, { fieldKey: "administrative_guarantee_value_mode", operator: "equals", value: "each" }), requiredWhen: allConditions({ fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, { fieldKey: "administrative_guarantee_value_mode", operator: "equals", value: "each" }), validation: { min: 0 } },
    { key: "administrative_guarantee_total_amount", type: "money", labelAr: "إجمالي قيمة الشيكات", visibleWhen: allConditions({ fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, { fieldKey: "administrative_guarantee_value_mode", operator: "equals", value: "total" }), requiredWhen: allConditions({ fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, { fieldKey: "administrative_guarantee_value_mode", operator: "equals", value: "total" }), validation: { min: 0 } },
    { key: "administrative_vat_enabled", type: "checkbox", labelAr: "الأجرة خاضعة لضريبة القيمة المضافة", printInDocument: false },
    { key: "administrative_visitors_enabled", type: "checkbox", labelAr: "النشاط يستقبل العملاء أو الزائرين", printInDocument: false },
    { key: "administrative_insurance_enabled", type: "checkbox", labelAr: "تطبيق فقرة التأمين على النشاط والمسؤولية المدنية", printInDocument: false },
    { key: "administrative_signage_enabled", type: "checkbox", labelAr: "السماح بلافتة أو لوحة تعريفية وفق الضوابط", printInDocument: false },
    { key: "administrative_esign_enabled", type: "checkbox", labelAr: "اعتماد التوقيع الإلكتروني أو منصة رقمية", printInDocument: false },
    { key: "administrative_legal_fees_enabled", type: "checkbox", labelAr: "تضمين فقرة رسوم الدمغة والرسوم القانونية", printInDocument: false },
    { key: "administrative_legal_fees_bearer", type: "radio", labelAr: "من يتحمل رسوم الدمغة والرسوم القانونية؟", visibleWhen: { fieldKey: "administrative_legal_fees_enabled", operator: "truthy" }, requiredWhen: { fieldKey: "administrative_legal_fees_enabled", operator: "truthy" }, options: [{ value: "المؤجر", labelAr: "المؤجر" }, { value: "المستأجر", labelAr: "المستأجر" }, { value: "وفقًا لما يحدده القانون", labelAr: "وفقًا لما يحدده القانون" }] },
  ],
};

const rentalJurisdictionStep: WizardStepDefinition = {
  key: "rental_jurisdiction",
  titleAr: "المحكمة المختصة",
  articleRange: "الاختصاص القضائي وتسوية المنازعات",
  fields: [competentCourtField("rental_jurisdiction_court")],
};

const rentalReviewStep: WizardStepDefinition = { key: "rental_review", titleAr: "المراجعة وإصدار العقد", articleRange: "المراجعة النهائية", fields: [] };

const commonRentalDefaults = {
  landlord_party_type: "individual",
  tenant_party_type: "individual",
  landlord_nationality: "مصر",
  tenant_nationality: "مصر",
  annual_increase_enabled: false,
  rental_email_notices_enabled: false,
  rental_notice_use_party_emails: true,
  rental_messaging_enabled: false,
  rental_messaging_use_party_phones: true,
  rental_witness_1_enabled: false,
  rental_witness_2_enabled: false,
};

const residentialCustomKeys = [
  "rental_residential_furnished_clause",
  "rental_residential_annual_increase_clause", "rental_residential_article08_tail",
  "rental_residential_email_notice_clause",
  "rental_residential_messaging_clause",
];
const commercialCustomKeys = [
  "rental_commercial_early_termination_clause", "rental_commercial_safety_clause", "rental_commercial_guarantee_checks_clause",
  "rental_commercial_annual_increase_clause", "rental_commercial_article08_tail", "rental_commercial_vat_clause", "rental_commercial_public_customers_clause",
  "rental_commercial_insurance_clause", "rental_commercial_signage_clause", "rental_commercial_email_notice_clause",
  "rental_commercial_messaging_clause", "rental_commercial_legal_fees_clause",
];
const administrativeCustomKeys = [
  "rental_administrative_early_termination_clause", "rental_administrative_safety_clause", "rental_administrative_guarantee_checks_clause",
  "rental_administrative_annual_increase_clause", "rental_administrative_article08_tail", "rental_administrative_vat_clause", "rental_administrative_visitors_clause",
  "rental_administrative_insurance_clause", "rental_administrative_signage_clause", "rental_administrative_email_notice_clause",
  "rental_administrative_messaging_clause", "rental_administrative_esign_clause", "rental_administrative_legal_fees_clause",
];

function orderedRentalClauseKeys(
  variantKey: "residential_lease" | "commercial_lease" | "administrative_lease",
  extraClauseKeys: string[],
): string[] {
  const base = [...rentalSourceClauseKeysByVariant[variantKey]];
  const after: Record<string, string[]> = variantKey === "residential_lease"
    ? {
        residential_lease_source_article_04: ["rental_residential_furnished_clause"],
        residential_lease_source_article_08: ["rental_residential_annual_increase_clause", "rental_residential_article08_tail"],
        residential_lease_source_article_17: ["rental_residential_email_notice_clause", "rental_residential_messaging_clause"],
      }
    : variantKey === "commercial_lease"
      ? {
          commercial_lease_source_article_05: ["rental_commercial_early_termination_clause"],
          commercial_lease_source_article_06: ["rental_commercial_safety_clause"],
          commercial_lease_source_article_07: ["rental_commercial_guarantee_checks_clause"],
          commercial_lease_source_article_08: ["rental_commercial_annual_increase_clause", "rental_commercial_article08_tail", "rental_commercial_vat_clause"],
          commercial_lease_source_article_09: ["rental_commercial_public_customers_clause"],
          commercial_lease_source_article_10: ["rental_commercial_insurance_clause"],
          commercial_lease_source_article_11: ["rental_commercial_signage_clause"],
          commercial_lease_source_article_18: ["rental_commercial_email_notice_clause", "rental_commercial_messaging_clause"],
          commercial_lease_source_article_20: ["rental_commercial_legal_fees_clause"],
        }
      : {
          administrative_lease_source_article_05: ["rental_administrative_early_termination_clause"],
          administrative_lease_source_article_06: ["rental_administrative_safety_clause"],
          administrative_lease_source_article_07: ["rental_administrative_guarantee_checks_clause"],
          administrative_lease_source_article_08: ["rental_administrative_annual_increase_clause", "rental_administrative_article08_tail", "rental_administrative_vat_clause"],
          administrative_lease_source_article_09: ["rental_administrative_visitors_clause"],
          administrative_lease_source_article_10: ["rental_administrative_insurance_clause"],
          administrative_lease_source_article_11: ["rental_administrative_signage_clause"],
          administrative_lease_source_article_18: ["rental_administrative_email_notice_clause", "rental_administrative_messaging_clause", "rental_administrative_esign_clause"],
          administrative_lease_source_article_20: ["rental_administrative_legal_fees_clause"],
        };

  const allowed = new Set(extraClauseKeys);
  const ordered: string[] = [];
  for (const key of base) {
    ordered.push(key);
    for (const extra of after[key] ?? []) if (allowed.has(extra)) ordered.push(extra);
  }
  for (const extra of extraClauseKeys) if (!ordered.includes(extra)) ordered.push(extra);
  return ordered;
}

function createRentalVariant(input: {
  key: "residential_lease" | "commercial_lease" | "administrative_lease";
  nameAr: string;
  documentTitleAr: string;
  description: string;
  sourceDocumentName: string;
  step: WizardStepDefinition;
  extraClauseKeys: string[];
  defaults?: Record<string, string | number | boolean | null>;
}): ContractVariantDefinition {
  return {
    key: input.key,
    nameAr: input.nameAr,
    documentTitleAr: input.documentTitleAr,
    description: input.description,
    sourceDocumentName: input.sourceDocumentName,
    steps: [
      ...rentalCommonSteps.flatMap((step) => step.key === "rental_property" ? [step, input.step] : [step]),
      rentalJurisdictionStep,
      rentalReviewStep,
    ],
    requiredClauseKeys: orderedRentalClauseKeys(input.key, [...input.extraClauseKeys, "rental_jurisdiction_court_clause"]),
    allowedOptionalClauseKeys: ["rental_handover_inventory_report"],
    defaultFieldValues: { ...commonRentalDefaults, ...(input.defaults ?? {}) },
  };
}

const standardConditionOptions = [
  { value: "excellent", labelAr: "ممتاز" },
  { value: "very_good", labelAr: "جيد جدًا" },
  { value: "good", labelAr: "جيد" },
  { value: "with_notes", labelAr: "به ملاحظات" },
  { value: "unusable", labelAr: "غير صالح للاستعمال" },
  { value: "not_present", labelAr: "غير موجود" },
];

const handoverOptionalClause: OptionalClauseDefinition = {
  key: "rental_handover_inventory_report",
  nameAr: "محضر استلام وجرد العين المؤجرة",
  documentTitleAr: "محضر استلام وجرد العين المؤجرة",
  sourceDocumentName: "محضر استلام وجرد العين المؤجرة Z DRAFT.pdf",
  outputMode: "separate_annex",
  manualFillAnnex: true,
  description: "ملحق اختياري بالكامل وقالب فارغ للطباعة والتعبئة اليدوية؛ لا يُضاف تلقائيًا ولا تُنقل إليه بيانات الـWizard. يناسب توثيق حالة العين والمنقولات ووسائل الدخول عند التسليم.",
  applicableVariantKeys: ["residential_lease", "commercial_lease", "administrative_lease"],
  insertBeforeStepKey: "rental_review",
  legalClauseKeys: [...rentalSourceClauseKeysByVariant.rental_handover_inventory_report],
  insertedSteps: [
    {
      key: "rental_handover_inventory_report",
      titleAr: "بيانات المحضر والعين المؤجرة",
      articleRange: "محضر مستقل — للتعبئة اليدوية",
      fields: [
        { key: "handover_contract_reference_number", type: "text", labelAr: "رقم عقد الإيجار" },
        { key: "handover_annex_date", type: "date", labelAr: "تاريخ تحرير المحضر" },
        { key: "handover_original_contract_date", type: "date", labelAr: "تاريخ عقد الإيجار" },
        { key: "handover_landlord_name", type: "text", labelAr: "الطرف الأول (المؤجر)" },
        { key: "handover_tenant_name", type: "text", labelAr: "الطرف الثاني (المستأجر)" },
        { key: "handover_governorate", type: "text", labelAr: "المحافظة" },
        { key: "handover_city", type: "text", labelAr: "المدينة / المركز / الحي" },
        { key: "handover_area", type: "text", labelAr: "المنطقة / المجاورة / الحي (إن وجد)" },
        { key: "handover_complex", type: "text", labelAr: "اسم المول / البرج / الكمبوند (إن وجد)" },
        { key: "handover_property_number", type: "text", labelAr: "رقم العقار / القطعة" },
        { key: "handover_entrance_number", type: "text", labelAr: "رقم المدخل (إن وجد)" },
        { key: "handover_floor", type: "text", labelAr: "الدور" },
        { key: "handover_unit", type: "text", labelAr: "رقم الوحدة" },
        { key: "handover_property_area", type: "text", labelAr: "المساحة" },
        { key: "handover_approx_area", type: "text", labelAr: "المساحة التقريبية (إن وجدت)" },
        { key: "handover_property_type", type: "select", labelAr: "نوع العين المؤجرة", options: [
          { value: "residential_apartment", labelAr: "شقة سكنية" }, { value: "villa", labelAr: "فيلا" }, { value: "commercial_shop", labelAr: "محل تجاري" }, { value: "administrative_office", labelAr: "مكتب إداري" }, { value: "clinic", labelAr: "عيادة" }, { value: "storage", labelAr: "مخزن" }, { value: "showroom", labelAr: "معرض" }, { value: "factory", labelAr: "مصنع" }, { value: "workshop", labelAr: "ورشة" }, { value: "land", labelAr: "قطعة أرض" }, { value: "other", labelAr: "أخرى" },
        ] },
        { key: "handover_use_purpose", type: "text", labelAr: "الغرض من الاستعمال (وفقًا للعقد)" },
        { key: "handover_date", type: "date", labelAr: "تاريخ الاستلام" },
        { key: "handover_time", type: "text", labelAr: "وقت الاستلام" },
      ],
    },
    {
      key: "rental_handover_condition",
      titleAr: "بيان حالة العين المؤجرة",
      fields: [{
        key: "handover_condition_items",
        type: "repeater",
        labelAr: "حالة مكونات العين",
        blankRows: 15,
        blankRowLabels: ["الدهانات", "الأسقف", "الأرضيات", "الأبواب", "الأقفال", "الشبابيك", "الزجاج", "الأعمال الكهربائية", "وحدات الإضاءة", "أعمال السباكة", "المطبخ", "الحمامات", "التكييفات الثابتة (إن وجدت)", "السخان (إن وجد)", "أخرى"],
        columns: [
          { key: "item", type: "text", labelAr: "البيان" },
          { key: "condition", type: "select", labelAr: "الحالة", options: standardConditionOptions },
          { key: "notes", type: "text", labelAr: "الملاحظات" },
        ],
      }],
    },
    {
      key: "rental_handover_access",
      titleAr: "وسائل الدخول",
      fields: [{
        key: "handover_access_items", type: "repeater", labelAr: "وسائل الدخول المسلمة", blankRows: 6,
        blankRowLabels: ["مفتاح الباب الرئيسي", "المفاتيح الداخلية", "ريموت البوابة", "ريموت الجراج", "كارت الدخول", "جهاز تحكم آخر"],
        columns: [{ key: "item", type: "text", labelAr: "البيان" }, { key: "quantity", type: "number", labelAr: "العدد" }, { key: "notes", type: "text", labelAr: "ملاحظات" }],
      }],
    },
    {
      key: "rental_handover_inventory",
      titleAr: "جرد المنقولات (إن وجدت)",
      fields: [{
        key: "inventory_items", type: "repeater", labelAr: "جرد المنقولات", blankRows: 10,
        columns: [{ key: "name", type: "text", labelAr: "البيان" }, { key: "quantity", type: "number", labelAr: "الكمية" }, { key: "condition", type: "select", labelAr: "الحالة", options: standardConditionOptions }, { key: "notes", type: "text", labelAr: "ملاحظات" }],
      }],
    },
    {
      key: "rental_handover_media",
      titleAr: "الصور والتسجيلات والملاحظات",
      fields: [
        { key: "handover_photos_taken", type: "checkbox", labelAr: "تم التقاط صور لحالة العين المؤجرة" },
        { key: "handover_video_taken", type: "checkbox", labelAr: "تم تصوير تسجيل مرئي (فيديو) لحالة العين المؤجرة" },
        { key: "handover_no_media", type: "checkbox", labelAr: "لم يتم التقاط صور أو تسجيلات" },
        { key: "handover_general_notes", type: "textarea", labelAr: "الملاحظات العامة" },
        { key: "handover_copies_count", type: "number", labelAr: "عدد النسخ الأصلية" },
      ],
    },
  ],
};

function clause(key: string): LegalClauseDefinition {
  const found = rentalSourceLegalClauses.find((item) => item.key === key);
  if (!found) throw new Error(`Missing rental source clause ${key}`);
  return { ...found };
}

function removeRange(body: string, start: string, end?: string): string {
  const startIndex = body.indexOf(start);
  if (startIndex < 0) return body;
  const endIndex = end ? body.indexOf(end, startIndex) : body.length;
  if (end && endIndex < 0) return body;
  return `${body.slice(0, startIndex)}${body.slice(endIndex)}`.trim();
}

function sliceRange(body: string, start: string, end?: string): string {
  const startIndex = body.indexOf(start);
  if (startIndex < 0) return "";
  const endIndex = end ? body.indexOf(end, startIndex) : body.length;
  if (end && endIndex < 0) return body.slice(startIndex).trim();
  return body.slice(startIndex, endIndex).trim();
}

const sourceByKey = new Map(rentalSourceLegalClauses.map((item) => [item.key, item]));
function sourceBody(key: string): string { return sourceByKey.get(key)?.bodyAr ?? ""; }

/**
 * The source extraction pipeline intentionally replaced handwritten blanks with a marker.
 * In the rental PDFs that marker also landed inside fixed statutory/article references.
 * Keep runtime text readable while the actual user-entered values remain in the structured
 * contract-data section rendered from the schema.
 */
function cleanRentalSourceArtifacts(body: string): string {
  const marker = "البيان المثبت بجدول بيانات العقد(?: أو الملحق)?";
  return body
    .replace(new RegExp(`\\(${marker}\\)\\s*(\\d+)`, "g"), "($1)")
    .replace(new RegExp(`\\(${marker}\\)WhatsApp`, "g"), "(WhatsApp)")
    .replace(new RegExp(`\\(${marker}\\)`, "g"), "(كما هو مثبت ببيانات العقد)")
    .replace(new RegExp(marker, "g"), "كما هو مثبت ببيانات العقد")
    .replace(/كما هو مثبت ببيانات العقدجنيه/g, "كما هو مثبت ببيانات العقد جنيه")
    .replace(/كما هو مثبت ببيانات العقدجني/g, "كما هو مثبت ببيانات العقد جني")
    .replace(/كما هو مثبت ببيانات العقدنسخة/g, "كما هو مثبت ببيانات العقد نسخة")
    .replace(/\)لسنة/g, ") لسنة")
    .replace(/\)من هذا/g, ") من هذا")
    .replace(/\)يو/g, ") يو")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const reviewedSourceClauses = rentalSourceLegalClauses.map((item): LegalClauseDefinition => {
  let body = item.bodyAr;
  const key = item.key;

  if (key.endsWith("_source_article_01")) {
    body = "تثبت بيانات الطرف الأول (المؤجر) والطرف الثاني (المستأجر) وصفتهما ووسائل الاتصال وبيانات الشخص الاعتباري – إن وجد – في قسم بيانات العقد، وتُعد تلك البيانات جزءًا لا يتجزأ منه. ويقر كل طرف بصحة البيانات التي قدمها وبأهليته وصفته القانونية اللازمة لإبرام العقد، ويلتزم بإخطار الطرف الآخر بأي تعديل جوهري يطرأ عليها وفقًا لأحكام العقد.";
  }

  if (key === "residential_lease_source_article_04") {
    const raw = sourceBody(key);
    const inspection = raw.slice(raw.indexOf("يقر الطرف الثاني"));
    body = removeRange(inspection, "(فقرة اختيارية – إذا كانت العين المؤجرة مفروشة", "هل يوجد ملحقات للعين المؤجرة؟");
  }
  if (key === "residential_lease_source_article_05") body = removeRange(body, "((فقرة اختيارية – انتقال ملكية العين المؤجرة أثناء سريان العقد))");
  if (key === "residential_lease_source_article_08") body = removeRange(body, ".2الزيادة الدورية", ".3ميعاد السداد");
  if (key === "residential_lease_source_article_17") body = removeRange(body, ".2البريد اإللكتروني", ".4تغيير بيانات االتصال");

  if (key === "commercial_lease_source_article_05") body = removeRange(body, "(فقرة اختيارية – إذا اتفق الطرفان على جواز إنهاء العقد قبل انتهاء مدته)", ".4البقاء في الوحدة المؤجرة");
  if (key === "commercial_lease_source_article_06") body = removeRange(body, ".7اشتراطات الدفاع المدني والسالمة");
  if (key === "commercial_lease_source_article_07") body = removeRange(body, "(فقرة اختيارية – شيكات الضمان)", ".3رد مبلغ التأمين");
  if (key === "commercial_lease_source_article_08") {
    body = removeRange(body, ".2الزيادة الدورية", ".3ميعاد استحقاق األجرة");
    body = removeRange(body, "(فقرة اختيارية – إذا كانت األجرة خاضعة لضريبة القيمة المضافة)");
  }
  if (key === "commercial_lease_source_article_09") body = removeRange(body, "(فقرة اختيارية – إذا كان النشاط يستقبل الجمهور أو العمالء)", ".7اإلخالل بالتزامات هذه المادة");
  if (key === "commercial_lease_source_article_10") body = removeRange(body, "(فقرة اختيارية – التأمين على النشاط والمسؤولية المدنية)", ".5دخول الوحدة المؤجرة إلجراء الصيانة");
  if (key === "commercial_lease_source_article_11") body = removeRange(body, "(فقرة اختيارية – الالفتات والعالمات التجارية واإلعالنات)", ".5إزالة األعمال المخالفة");
  if (key === "commercial_lease_source_article_18") body = removeRange(body, ".2البريد اإللكتروني", ".4تغيير بيانات االتصال");
  if (key === "commercial_lease_source_article_20") body = removeRange(body, "(فقرة اختيارية – رسوم الدمغة والرسوم المقررة على العقد)");

  if (key === "administrative_lease_source_article_05") body = removeRange(body, "(فقرة اختيارية – إذا اتفق الطرفان على جواز اانهاء عقد االجار قبل ميعاده)", "4 .البقاء في العين المؤجرة");
  if (key === "administrative_lease_source_article_06") body = removeRange(body, "(فقرة اختيارية – إذا كان النشاط يستلزم اشتراطات خاصة للسالمة أو الدفاع المدني)");
  if (key === "administrative_lease_source_article_07") body = removeRange(body, "(فقرة اختيارية – شيكات الضمان)", ".3رد مبلغ التأمين");
  if (key === "administrative_lease_source_article_08") {
    body = removeRange(body, ".2الزيادة الدورية", ".3ميعاد استحقاق األجرة");
    body = removeRange(body, "(فقرة اختيارية – إذا كانت األجرة خاضعة لضريبة القيمة المضافة)");
  }
  if (key === "administrative_lease_source_article_09") body = removeRange(body, "(فقرة اختيارية – إذا كانت طبيعة النشاط تستلزم استقبال العمالء أو الزائرين)", ".7اإلخالل بالتزامات هذه المادة");
  if (key === "administrative_lease_source_article_10") body = removeRange(body, "(فقرة اختيارية – التأمين على النشاط والمسؤولية المدنية)", ".5دخول العين المؤجرة إلجراء الصيانة");
  if (key === "administrative_lease_source_article_11") body = removeRange(body, "(فقرة اختيارية – الالفتات ولوحات التعريف بالشركة)", ".5إزالة األعمال المخالفة");
  if (key === "administrative_lease_source_article_18") {
    body = removeRange(body, ".2البريد اإللكتروني", ".3وسائل المراسلة اإللكترونية");
    body = removeRange(body, ".3وسائل المراسلة اإللكترونية", ".4األشخاص المفوضون");
    body = removeRange(body, ".7التوقيع اإللكتروني والمنصات الرقمية");
  }
  if (key === "administrative_lease_source_article_20") body = removeRange(body, ".11رسوم الدمغة والرسوم والمصروفات القانونية");

  // Clean duration and cash-deposit articles from extraction-order artifacts while preserving source meaning.
  if (key === "residential_lease_source_article_05") {
    body = `.1 مدة الإيجار: مدة هذا العقد هي {{lease_duration_text}}، تبدأ اعتبارًا من {{start_date}} وتنتهي في {{end_date}}، ما لم يتفق الطرفان كتابةً على غير ذلك.

.2 انتهاء العقد: ينتهي العقد بانتهاء مدته المحددة دون حاجة إلى تنبيه أو إنذار، ويلتزم المستأجر برد العين المؤجرة وفقًا لأحكام العقد.

.3 التجديد: لا يتجدد العقد تلقائيًا أو ضمنيًا، ولا ينشأ أي تجديد أو امتداد إلا بموجب محرر كتابي موقع من الطرفين يحدد مدة التجديد والقيمة الإيجارية وما يتفقان عليه.

.4 البقاء في العين بعد انتهاء العقد: إذا استمر المستأجر في شغل العين أو الانتفاع بها بعد انتهاء مدة العقد دون سند قانوني أو موافقة كتابية من المؤجر، يلتزم بإخلائها فورًا وبأداء تعويض اتفاقي قدره {{holdover_daily_compensation}} جنيهًا مصريًا عن كل يوم تأخير في الإخلاء، دون إخلال بالحقوق الأخرى المقررة بالعقد والقانون. ولا يُعد تقاضي هذا التعويض أو استلام مبالغ بعد انتهاء المدة تجديدًا للعقد أو تنازلاً عن أي حق.`;
  }
  if (key === "commercial_lease_source_article_05") {
    body = `.1 مدة العقد: مدة هذا العقد هي {{lease_duration_text}}، تبدأ اعتبارًا من {{start_date}} وتنتهي في {{end_date}}، ولا يجوز تعديلها أو مدها أو تقصيرها إلا باتفاق كتابي صريح موقع من الطرفين.

.2 انتهاء العقد: ينتهي العقد بانتهاء مدته المحددة دون حاجة إلى تنبيه أو إنذار، ويلتزم المستأجر بإخلاء الوحدة وردها وفقًا لأحكام العقد.

.3 تجديد العقد: لا يتجدد العقد تلقائيًا أو ضمنيًا، ولا ينشأ أي تجديد أو امتداد إلا باتفاق كتابي مستقل موقع من الطرفين. ولا يُستدل على التجديد بمجرد استمرار الانتفاع أو سداد الأجرة أو استلام مبالغ بعد انتهاء المدة.

.4 البقاء في الوحدة بعد انتهاء العقد: إذا استمر المستأجر في شغل الوحدة أو الانتفاع بها بعد انتهاء العلاقة الإيجارية دون سند قانوني أو موافقة كتابية صريحة من المؤجر، يلتزم بإخلائها فورًا وبأداء تعويض اتفاقي قدره {{holdover_daily_compensation}} جنيهًا مصريًا عن كل يوم تأخير في الإخلاء، دون إخلال بالحقوق الأخرى. ولا يترتب على استلام مبالغ بعد انتهاء العقد قيام علاقة إيجارية جديدة أو تجديد أو امتداد ما لم يوجد اتفاق كتابي صريح.

.5 انتقال ملكية الوحدة المؤجرة: إذا انتقلت ملكية الوحدة إلى الغير أثناء سريان العقد، فلا يترتب على ذلك بذاته انتهاء العقد، ويحل الخلف الخاص محل المؤجر في الحقوق والالتزامات في الحدود المقررة قانونًا.`;
  }
  if (key === "administrative_lease_source_article_05") {
    body = `.1 مدة العقد: مدة هذا العقد هي {{lease_duration_text}}، تبدأ اعتبارًا من {{start_date}} وتنتهي في {{end_date}}، ولا يجوز تعديلها أو مدها أو تقصيرها إلا باتفاق كتابي صريح موقع من الطرفين.

.2 انتهاء العقد: ينتهي العقد بانتهاء مدته المحددة دون حاجة إلى تنبيه أو إنذار، ويلتزم المستأجر بإخلاء العين وردها وفقًا لأحكام العقد.

.3 تجديد العقد: لا يتجدد العقد تلقائيًا أو ضمنيًا، ولا ينشأ أي تجديد أو امتداد إلا باتفاق كتابي مستقل موقع من الطرفين. ولا يُعد استمرار الانتفاع أو سداد الأجرة أو قبول مبالغ بعد انتهاء المدة بذاته دليلاً على التجديد.

.4 البقاء في العين بعد انتهاء العقد: إذا بقي المستأجر شاغلاً للعين أو استمر في الانتفاع بها بعد انتهاء العلاقة الإيجارية دون سند قانوني أو موافقة كتابية صريحة من المؤجر، يلتزم بإخلائها فورًا وبأداء تعويض اتفاقي قدره {{holdover_daily_compensation}} جنيهًا مصريًا عن كل يوم تأخير في الإخلاء وحتى الرد الفعلي، دون إخلال بالحقوق الأخرى. ولا يترتب على استلام مبالغ بعد انتهاء العقد تجديده أو امتداده دون اتفاق كتابي صريح.

.5 انتقال ملكية العين المؤجرة: إذا انتقلت ملكية العين إلى الغير أثناء سريان العقد، فلا يترتب على ذلك بذاته انتهاء العقد، ويحل الخلف الخاص محل المؤجر في الحقوق والالتزامات في الحدود المقررة قانونًا مع مراعاة الحقوق المكتسبة للمستأجر.`;
  }
  if (key === "residential_lease_source_article_07") {
    body = `.1 مبلغ التأمين: أودع المستأجر لدى المؤجر عند توقيع هذا العقد مبلغًا وقدره {{deposit_amount}} جنيهًا مصريًا، فقط ({{deposit_amount_words}} جنيهًا مصريًا لا غير)، على سبيل التأمين النقدي لضمان تنفيذ التزاماته.

.2 الغرض من مبلغ التأمين: يظل مبلغ التأمين مودعًا طوال مدة العقد ضمانًا للالتزامات، وعلى الأخص مستحقات المرافق والخدمات وإصلاح التلفيات أو الأضرار التي تجاوز الاستهلاك المعتاد وأي مبالغ مالية ثابتة ومستحقة وفقًا للعقد أو القانون.

.3 رد مبلغ التأمين: يلتزم المؤجر برد مبلغ التأمين أو المتبقي منه خلال مدة أقصاها خمسة عشر (15) يومًا من تاريخ انتهاء العقد ورد العين، بعد التحقق من تنفيذ المستأجر لالتزاماته وتسوية المستحقات.

.4 حق الخصم من مبلغ التأمين: يجوز للمؤجر خصم المبالغ الثابتة والمستحقة، بما في ذلك التلفيات غير الناشئة عن الاستعمال المعتاد ومستحقات المرافق والخدمات، مع رد الرصيد المتبقي - إن وجد - وبيان أوجه الخصم عند الطلب. وإذا تجاوزت المستحقات مبلغ التأمين، يلتزم المستأجر بسداد الفرق.

.5 عدم اعتبار مبلغ التأمين أجرة: لا يجوز للمستأجر اعتبار مبلغ التأمين وفاءً بالأجرة أو بأي قسط منها، ويظل ملتزمًا بسداد الأجرة حتى انتهاء العلاقة الإيجارية وتسوية الالتزامات.`;
  }
  if (key === "commercial_lease_source_article_07") {
    body = `.1 مبلغ التأمين: اتفق الطرفان على أن يودع المستأجر لدى المؤجر مبلغ تأمين وقدره {{deposit_amount}} جنيهًا مصريًا، فقط ({{deposit_amount_words}} جنيهًا مصريًا لا غير)، ضمانًا لتنفيذ جميع التزاماته الناشئة عن العقد، ويقر المؤجر باستلامه.

.2 الغرض من مبلغ التأمين: يظل مبلغ التأمين مودعًا طوال مدة العقد ضمانًا لتنفيذ جميع التزامات المستأجر، بما في ذلك الأجرة والمرافق والخدمات والرسوم والمصروفات والتعويضات وإصلاح التلف أو الضرر الذي يجاوز الاستهلاك المعتاد وأي التزام مالي آخر.

.3 رد مبلغ التأمين: يلتزم المؤجر برد مبلغ التأمين أو المتبقي منه خلال مدة لا تجاوز خمسة عشر (15) يومًا من تاريخ انتهاء العقد وإخلاء الوحدة وردها، بعد التحقق من تنفيذ المستأجر لالتزاماته وتسوية المستحقات.

.4 حق الخصم: يجوز للمؤجر خصم المبالغ الثابتة والمستحقة، بما في ذلك الأجرة والمرافق والخدمات والرسوم والمصروفات والتعويضات وقيمة التلف غير الناشئ عن الاستعمال المعتاد، مع رد الرصيد المتبقي - إن وجد - وبيان أوجه الخصم عند الطلب.

.5 استقالل مبلغ التأمين عن الأجرة: يظل مبلغ التأمين ضمانًا مستقلاً ولا يجوز اعتباره أجرة أو إجراء مقاصة به أثناء سريان العقد.

.6 عدم جواز اعتبار مبلغ التأمين أو شيكات الضمان وفاءً: يظل كل منهما - إن وجد - ضمانًا لتنفيذ الالتزامات ولا يعفي المستأجر من سداد الأجرة وسائر المستحقات في مواعيدها.`;
  }
  if (key === "administrative_lease_source_article_07") {
    body = `.1 مبلغ التأمين: اتفق الطرفان على أن يودع المستأجر لدى المؤجر مبلغ تأمين وقدره {{deposit_amount}} جنيهًا مصريًا، فقط ({{deposit_amount_words}} جنيهًا مصريًا لا غير)، ضمانًا لتنفيذ جميع الالتزامات الناشئة عن العقد، ويقر المؤجر باستلامه.

.2 الغرض من مبلغ التأمين: يظل مبلغ التأمين مودعًا طوال مدة العقد ضمانًا لتنفيذ التزامات المستأجر، بما في ذلك الأجرة واستهلاك المرافق والخدمات والرسوم والمصروفات والتعويضات وإصلاح التلف أو الضرر الذي يجاوز الاستعمال المعتاد وأي التزام مالي آخر. ولا يجوز المطالبة برده قبل انتهاء العلاقة الإيجارية وتنفيذ الالتزامات.

.3 رد مبلغ التأمين: يلتزم المؤجر برد مبلغ التأمين أو المتبقي منه خلال مدة لا تجاوز خمسة عشر (15) يومًا من تاريخ انتهاء العقد وإخلاء العين وردها، بعد التحقق من تنفيذ الالتزامات وتسوية المرافق والخدمات والرسوم، ويُرد دون فوائد أو عوائد ما لم يتفق الطرفان كتابةً على خلاف ذلك.

.4 حق الخصم: يجوز للمؤجر خصم المبالغ المستحقة، بما فيها الأجرة والمرافق والخدمات والرسوم والمصروفات والتعويضات وقيمة التلف غير الناشئ عن الاستعمال المعتاد، مع رد الرصيد المتبقي - إن وجد - وبيان أوجه الخصم عند الطلب.

.5 استقالل مبلغ التأمين عن الأجرة: يظل مبلغ التأمين ضمانًا مستقلاً ولا يجوز اعتباره أجرة أو إجراء مقاصة به أثناء سريان العقد.

.6 عدم جواز اعتبار مبلغ التأمين أو شيكات الضمان وفاءً: لا يعفي وجود أي منهما المستأجر من سداد الأجرة وسائر الالتزامات المالية في مواعيدها.`;
  }

  // Article 8 in the three source PDFs contains colored hand-fill placeholders and, in the
  // administrative PDF, visually split fixed values (10%, 7 days, 3x daily rent). Rebuild
  // this article from the source wording so the generated legal text is clean and cannot
  // accidentally turn a fixed source value into a user-editable field.
  if (key === "residential_lease_source_article_08") {
    body = `.1 القيمة الإيجارية: اتفق الطرفان على أن القيمة الإيجارية المستحقة عن كل {{rent_period}} مبلغ وقدره {{rent_amount}} جنيهًا مصريًا، فقط ({{rent_amount_words}} جنيهًا مصريًا لا غير)، ويلتزم المستأجر بسدادها في المواعيد ووفقًا لآلية السداد المبينة بهذا العقد.`;
  }
  if (key === "commercial_lease_source_article_08") {
    body = `.1 القيمة الإيجارية: اتفق الطرفان على أن القيمة الإيجارية المستحقة عن كل {{rent_period}} مبلغ وقدره {{rent_amount}} جنيهًا مصريًا، فقط ({{rent_amount_words}} جنيهًا مصريًا لا غير)، ويلتزم المستأجر بسدادها في المواعيد ووفقًا لآلية السداد المنصوص عليها في هذا العقد.`;
  }
  if (key === "administrative_lease_source_article_08") {
    body = `.1 القيمة الإيجارية: اتفق الطرفان على أن القيمة الإيجارية المستحقة عن كل {{rent_period}} مبلغ وقدره {{rent_amount}} جنيهًا مصريًا، فقط ({{rent_amount_words}} جنيهًا مصريًا لا غير)، ويلتزم المستأجر بسدادها في المواعيد ووفقًا لآلية السداد المنصوص عليها في هذا العقد.`;
  }

  if (["residential_lease_source_article_22", "commercial_lease_source_article_21", "administrative_lease_source_article_21"].includes(key)) {
    body = "يقر الطرفان بأنهما اطلعا على العقد وملاحقه ومحاضره – إن وجدت – وفهما الحقوق والالتزامات الناشئة عنه، وأن توقيعهما عليه تم بإرادتهما الحرة وبعد التحقق من بياناته. وتثبت بيانات التوقيع والبصمة والشهود – إن وجدوا – في قسم التوقيعات المخصص بنهاية الوثيقة، ويقتصر توقيع الشاهد على إثبات حضور واقعة التوقيع ما لم يوقع بصفة قانونية أخرى صراحةً.";
  }

  if (key === "rental_handover_inventory_report_source_document") {
    body = "يرتبط هذا المحضر بعقد الإيجار المشار إليه أعلاه، ويُعد جزءًا لا يتجزأ منه متى تم اعتماده والتوقيع عليه من الطرفين. يقر المؤجر بتسليم العين المؤجرة للمستأجر في التاريخ المبين بالمحضر، ويقر المستأجر بمعاينتها واستلامها بالحالة المثبتة فيه دون تحفظ إلا ما يُدوّن صراحة في خانة الملاحظات. وفي حالة وجود صور أو تسجيلات، يجوز إرفاقها بالمحضر أو حفظها بوسيلة يتفق عليها الطرفان ويُعتد بها في الإثبات في الحدود التي يجيزها القانون متى أمكن التحقق من سلامتها ونسبتها. ويقر الطرفان بصحة البيانات المثبتة بالمحضر ومطابقتها للحالة الظاهرة للعين وقت الاستلام، ويُحرر من عدد النسخ المبين به وتكون النسخ متساوية في الحجية القانونية.";
  }

  const variables = ["residential_lease_source_article_05", "commercial_lease_source_article_05", "administrative_lease_source_article_05"].includes(key)
    ? ["lease_duration_text", "start_date", "end_date", "holdover_daily_compensation"]
    : (["residential_lease_source_article_07", "commercial_lease_source_article_07", "administrative_lease_source_article_07"].includes(key)
      ? ["deposit_amount", "deposit_amount_words"]
      : (["residential_lease_source_article_08", "commercial_lease_source_article_08", "administrative_lease_source_article_08"].includes(key)
        ? ["rent_period", "rent_amount", "rent_amount_words"]
        : item.variables));
  return { ...item, ...(variables ? { variables } : {}), bodyAr: cleanRentalSourceArtifacts(body) };
});

function customClause(input: LegalClauseDefinition): LegalClauseDefinition { return input; }

const conditionalClauses: LegalClauseDefinition[] = [
  customClause({
    key: "rental_jurisdiction_court_clause",
    titleAr: "المحكمة المختصة",
    variables: ["rental_jurisdiction_court"],
    bodyAr: "تختص محكمة {{rental_jurisdiction_court}} الابتدائية ودوائرها الجزئية بحسب الأحوال بنظر المنازعات الناشئة عن هذا العقد أو المتعلقة بتنفيذه أو تفسيره، وذلك مع عدم الإخلال بقواعد الاختصاص الولائي والنوعي والمكاني الآمرة.",
  }),
  customClause({ key: "rental_residential_furnished_clause", titleAr: "فقرة العين المفروشة والمنقولات", bodyAr: "إذا كانت العين المؤجرة مفروشة أو مشتملة على منقولات: يقر الطرفان بأن العين المؤجرة تشتمل على منقولات وأثاث وأجهزة وتجهيزات مبينة تفصيلاً بمحضر الجرد المرفق بهذا العقد، والذي يُعد جزءاً لا يتجزأ منه ومكملاً ومفسراً لأحكامه. ويلتزم الطرف الثاني (المستأجر) بالمحافظة على جميع تلك المنقولات واستعمالها بعناية الشخص المعتاد، وردها عند انتهاء العلاقة الإيجارية بذات الحالة التي تسلمها عليها، مع مراعاة الاستهلاك المعتاد الناشئ عن الاستعمال المألوف. وفي حال فقد أو إتلاف أي من تلك المنقولات أو الأجهزة، كلياً أو جزئياً، بسبب فعل الطرف الثاني أو تابعيه أو من سمح لهم باستعمال العين، التزم بإصلاحها أو استبدالها بمثلها أو بسداد قيمتها السوقية وقت وقوع الضرر، وذلك دون إخلال بحق الطرف الأول في الرجوع بالتعويض عما يجاوز تلك القيمة إن كان له مقتضى.", visibleWhen: { fieldKey: "residential_is_furnished", operator: "truthy" }, sourceDocumentName: "عقد ايجار سكني (Z DRAFT).pdf", sourcePageStart: 4, sourcePageEnd: 4 }),
  customClause({ key: "rental_residential_annual_increase_clause", titleAr: "الزيادة الدورية في الأجرة (إن وجدت)", bodyAr: "إذا اتفق الطرفان على تطبيق الزيادة الدورية المنصوص عليها في العقد، تُزاد القيمة الإيجارية بنسبة عشرة بالمائة (10%) اعتبارًا من بداية كل سنة إيجارية جديدة، وتُحسب الزيادة على آخر أجرة مستحقة، وفقًا للنص الأصلي للعقد.", visibleWhen: { fieldKey: "annual_increase_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار سكني (Z DRAFT).pdf", sourcePageStart: 5, sourcePageEnd: 5 }),
  customClause({ key: "rental_residential_article08_tail", titleAr: "ميعاد وآلية سداد الأجرة", variables: ["rent_due_day", "residential_payment_grace_days", "late_payment_daily_compensation"], bodyAr: ".3 ميعاد السداد: تستحق الأجرة مقدمًا، ويلتزم المستأجر بسدادها في موعد أقصاه يوم {{rent_due_day}} من كل فترة إيجارية، فإذا وافق هذا اليوم عطلة رسمية امتد ميعاد السداد إلى أول يوم عمل تالٍ لها. ويُمنح المستأجر بعد حلول ميعاد الاستحقاق مهلة سماح قدرها {{residential_payment_grace_days}} يومًا قبل بدء احتساب التعويض الاتفاقي عن التأخير.\n\n.4 طريقة السداد: يتم سداد القيمة الإيجارية بإحدى أو أكثر من وسائل السداد المتفق عليها والمثبتة في بيانات العقد، وتشمل السداد النقدي بموجب إيصال، أو التحويل البنكي، أو الإيداع بالحساب البنكي، أو المحافظ الإلكترونية، أو إنستاباي، أو أي وسيلة أخرى يتفق عليها الطرفان كتابةً.\n\n.5 التعويض الاتفاقي عن التأخير في السداد: إذا تأخر المستأجر عن سداد الأجرة أو أي جزء منها بعد حلول ميعاد استحقاقها وانقضاء مهلة السماح المحددة أعلاه دون تمام السداد، يلتزم بأداء تعويض اتفاقي قدره {{late_payment_daily_compensation}} جنيهًا مصريًا عن كل يوم تأخير، ويبدأ احتسابه من اليوم التالي لانتهاء مهلة السماح وحتى تمام السداد، دون إخلال بالحقوق الأخرى المقررة بالعقد والقانون.\n\n.6 الالتزام بسداد الأجرة: يلتزم المستأجر بسداد القيمة الإيجارية كاملة في مواعيد استحقاقها، ولا يجوز له الامتناع عن سدادها أو حبسها أو خصم أي جزء منها أو إجراء مقاصة عليها إلا بموافقة كتابية من المؤجر أو بحكم قضائي.", sourceDocumentName: "عقد ايجار سكني (Z DRAFT).pdf", sourcePageStart: 6, sourcePageEnd: 6 }),
  customClause({ key: "rental_residential_email_notice_clause", titleAr: "البريد الإلكتروني المعتمد (إن وجد)", bodyAr: "يجوز للطرفين تبادل الإخطارات والمراسلات والمستندات عبر البريد الإلكتروني المعتمد المثبت في بيانات العقد، ويُعتد بهذه المراسلات في الإثبات في الحدود التي تقررها القوانين المنظمة للإثبات والمعاملات الإلكترونية متى أمكن التحقق من صدورها ونسبتها وسلامة محتواها.", visibleWhen: { fieldKey: "rental_email_notices_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار سكني (Z DRAFT).pdf", sourcePageStart: 11, sourcePageEnd: 11 }),
  customClause({ key: "rental_residential_messaging_clause", titleAr: "واتساب / المراسلة الإلكترونية (إن وجد)", bodyAr: "يجوز للطرفين تبادل الإخطارات والمراسلات والمستندات والصور والملفات والتسجيلات الصوتية عبر وسيلة المراسلة الإلكترونية وأرقام الاتصال المعتمدة المثبتة في بيانات العقد، ويجوز الاستناد إليها في الإثبات متى أمكن التحقق من صدورها وسلامتها ونسبتها إلى مرسلها وفقًا للقانون.", visibleWhen: { fieldKey: "rental_messaging_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار سكني (Z DRAFT).pdf", sourcePageStart: 11, sourcePageEnd: 11 }),

  customClause({ key: "rental_commercial_early_termination_clause", titleAr: "الإنهاء المبكر (فقرة اختيارية)", bodyAr: "إذا اتفق الطرفان على جواز إنهاء العقد قبل انتهاء مدته، جاز لأي منهما إنهاؤه بعد إخطار الطرف الآخر كتابةً قبل موعد الإنهاء بمدة لا تقل عن ثلاثين (30) يومًا، مع سداد جميع الحقوق والالتزامات المستحقة حتى تاريخ الإنهاء وأداء مقابل الإنهاء المبكر المثبت في بيانات العقد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.", visibleWhen: { fieldKey: "commercial_early_termination_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 4, sourcePageEnd: 4 }),
  customClause({ key: "rental_commercial_safety_clause", titleAr: "اشتراطات الدفاع المدني والسلامة (فقرة اختيارية)", bodyAr: "إذا كان النشاط الممارس بالوحدة المؤجرة يستلزم اشتراطات خاصة للدفاع المدني أو السلامة والصحة المهنية أو الوقاية من الحريق أو أنظمة الإنذار أو مخارج الطوارئ أو غيرها، يلتزم المستأجر باستيفائها والحصول على التراخيص أو الموافقات اللازمة على نفقته والمحافظة على صلاحية تجهيزاتها طوال مدة العقد، ولا يجري تعديلًا يؤثر على الوحدة أو العقار إلا وفقًا للمادة (11) وبعد استيفاء الموافقات اللازمة، ويتحمل مسؤولية الإخلال بتلك الاشتراطات.", visibleWhen: { fieldKey: "commercial_safety_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 5, sourcePageEnd: 5 }),
  customClause({ key: "rental_commercial_guarantee_checks_clause", titleAr: "شيكات الضمان (فقرة اختيارية)", bodyAr: "إذا اتفق الطرفان على تقديم شيكات ضمان، يقر المستأجر بتسليم المؤجر شيكات الضمان بالعدد والبنك والأرقام والقيمة المبينة في بيانات العقد، ضمانًا لتنفيذ الالتزامات المالية الناشئة عنه دون أن تُعد وفاءً بأي مبلغ مستحق. ولا يجوز تقديمها للتحصيل إلا عند تحقق سبب استحقاقها قانونًا، ويلتزم المؤجر برد ما تبقى منها بعد انتهاء العلاقة الإيجارية وتسوية الالتزامات المضمونة بها، ما لم يوجد مانع قانوني أو اتفاق كتابي يقضي بغير ذلك.", visibleWhen: { fieldKey: "commercial_guarantee_checks_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 6, sourcePageEnd: 6 }),
  customClause({ key: "rental_commercial_annual_increase_clause", titleAr: "الزيادة الدورية في الأجرة (إن وجدت)", variables: ["annual_increase_rate"], bodyAr: "إذا اتفق الطرفان على زيادة دورية في القيمة الإيجارية، تُزاد الأجرة بنسبة {{annual_increase_rate}}% اعتبارًا من بداية كل سنة إيجارية جديدة، وتُحتسب الزيادة على آخر قيمة إيجارية مستحقة، ما لم يتفق الطرفان كتابةً على غير ذلك.", visibleWhen: { fieldKey: "annual_increase_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 7, sourcePageEnd: 7 }),
  customClause({ key: "rental_commercial_article08_tail", titleAr: "ميعاد وآلية سداد الأجرة", variables: ["rent_due_day", "late_payment_daily_compensation"], bodyAr: ".3 ميعاد استحقاق الأجرة: تستحق الأجرة مقدمًا عن كل فترة إيجارية، ويلتزم المستأجر بسدادها في موعد أقصاه يوم {{rent_due_day}} من كل فترة إيجارية، فإذا صادف هذا اليوم عطلة رسمية امتد ميعاد السداد إلى أول يوم عمل تالٍ لها.\n\n.4 آلية السداد: تُسدد الأجرة بإحدى وسائل السداد المتفق عليها والمثبتة في بيانات العقد، وتشمل السداد النقدي بموجب إيصال، أو التحويل البنكي، أو الإيداع بالحساب البنكي، أو المحافظ الإلكترونية، أو إنستاباي، أو أي وسيلة أخرى يتفق عليها الطرفان كتابةً. ولا تُعد الأجرة مسددة إلا بتمام استلام المؤجر لقيمتها أو قيدها بحسابه أو ثبوت الوفاء بها وفقًا لوسيلة السداد المتفق عليها.\n\n.5 التأخير في سداد الأجرة: إذا تأخر المستأجر عن سداد الأجرة أو أي جزء منها بعد حلول ميعاد استحقاقها، التزم بأداء تعويض اتفاقي قدره {{late_payment_daily_compensation}} جنيهًا مصريًا عن كل يوم تأخير، يبدأ احتسابه من اليوم التالي لتاريخ الاستحقاق وحتى تمام السداد، دون إخلال بحق المؤجر في المطالبة بالأجرة أو تطبيق أحكام الفسخ أو المطالبة بالتعويض في الحدود التي يجيزها القانون.\n\n.6 الالتزام بسداد الأجرة: يلتزم المستأجر بسداد الأجرة كاملة في مواعيد استحقاقها، ولا يجوز له الامتناع عن سدادها أو حبسها أو خصم أي جزء منها أو إجراء مقاصة عليها إلا بموافقة كتابية صريحة من المؤجر أو بموجب حكم قضائي نهائي واجب النفاذ. ويظل مبلغ التأمين ضمانًا مستقلاً ولا يُعد وفاءً بالأجرة.", sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 7, sourcePageEnd: 7 }),
  customClause({
    key: "rental_commercial_vat_clause",
    titleAr: "ضريبة القيمة المضافة (فقرة اختيارية)",
    bodyAr: "إذا كانت القيمة الإيجارية أو أي مبالغ مستحقة بموجب هذا العقد خاضعة لضريبة القيمة المضافة أو لأي ضريبة مماثلة تُفرض قانونًا، يلتزم الطرف الثاني (المستأجر) بسداد الضريبة المستحقة بالإضافة إلى القيمة الإيجارية، وذلك وفقًا للنسبة المقررة قانونًا وقت استحقاقها، ما لم يتفق الطرفان كتابةً على خلاف ذلك. ويلتزم الطرف الأول (المؤجر)، متى كان خاضعًا قانونًا لأحكام الضريبة على القيمة المضافة، بإصدار الفاتورة أو المستند الضريبي الذي يوجبه القانون وتسليمه للطرف الثاني وفقًا للإجراءات والمواعيد المقررة قانونًا.",
    visibleWhen: { fieldKey: "commercial_vat_enabled", operator: "truthy" },
    sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf",
    sourcePageStart: 7,
    sourcePageEnd: 7,
  }),
  customClause({ key: "rental_commercial_public_customers_clause", titleAr: "استقبال الجمهور أو العملاء (فقرة اختيارية)", bodyAr: "إذا كانت طبيعة النشاط تستلزم استقبال الجمهور أو العملاء أو المترددين على الوحدة المؤجرة، يلتزم المستأجر بتنظيم حركة الدخول والخروج والمحافظة على نظافة الوحدة وواجهتها ومحيطها واتخاذ التدابير اللازمة لعدم إعاقة استعمال الأجزاء المشتركة أو الإضرار بباقي الشاغلين أو مرتادي العقار أو المركز التجاري، وفقًا للقوانين واللوائح والتعليمات المنظمة.", visibleWhen: { fieldKey: "commercial_public_customers_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 8, sourcePageEnd: 8 }),
  customClause({ key: "rental_commercial_insurance_clause", titleAr: "التأمين على النشاط والمسؤولية المدنية (فقرة اختيارية)", bodyAr: "يلتزم المستأجر طوال مدة العقد وعلى نفقته الخاصة بإبرام والحفاظ على سريان وثيقة أو وثائق التأمين اللازمة لتغطية المخاطر المرتبطة بالنشاط، وبوجه خاص الحريق والانفجار والمسؤولية المدنية تجاه الغير وأي أخطار أخرى تفرضها طبيعة النشاط أو القوانين أو اللوائح أو الجهات المختصة، لدى شركة تأمين مرخص لها. ويلتزم بتجديدها وسداد أقساطها وتقديم ما يثبت سريانها عند الطلب، ولا تعفيه التغطية من مسؤولياته العقدية أو القانونية.", visibleWhen: { fieldKey: "commercial_insurance_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 9, sourcePageEnd: 9 }),
  customClause({
    key: "rental_commercial_signage_clause",
    titleAr: "اللافتات والعلامات التجارية والإعلانات (فقرة اختيارية)",
    bodyAr: "يجوز للمستأجر وضع اللافتات أو اللوحات الإعلانية أو العلامات التجارية الخاصة بنشاطه على واجهة الوحدة المؤجرة أو في الأماكن المخصصة لذلك، بعد الحصول على موافقة المؤجر الكتابية المسبقة واستيفاء جميع التراخيص والموافقات وسداد الرسوم المقررة قانونًا، مع الالتزام بضوابط السلامة والمظهر العام ولوائح إدارة العقار أو المركز التجاري. ويلتزم بإزالتها وإعادة المكان إلى حالته عند انتهاء العقد على نفقته الخاصة.",
    visibleWhen: { fieldKey: "commercial_signage_enabled", operator: "truthy" },
    sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf",
    sourcePageStart: 10,
    sourcePageEnd: 10,
  }),
  customClause({ key: "rental_commercial_email_notice_clause", titleAr: "البريد الإلكتروني المعتمد (إن وجد)", bodyAr: "يجوز للطرفين تبادل الإخطارات والمراسلات والمستندات عبر البريد الإلكتروني المعتمد المثبت في بيانات العقد، ويجوز الاستناد إلى هذه المراسلات في الإثبات متى أمكن التحقق من صدورها وسلامة محتواها ونسبتها إلى مرسلها، في الحدود التي تجيزها القوانين المنظمة للإثبات والمعاملات الإلكترونية.", visibleWhen: { fieldKey: "rental_email_notices_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 16, sourcePageEnd: 16 }),
  customClause({ key: "rental_commercial_messaging_clause", titleAr: "واتساب / وسائل المراسلة الإلكترونية (إن وجد)", bodyAr: "يجوز للطرفين تبادل الإخطارات والمراسلات والمستندات والصور والملفات والتسجيلات الصوتية عبر واتساب أو وسيلة المراسلة الإلكترونية وأرقام الاتصال المعتمدة المثبتة في بيانات العقد، ويجوز الاستناد إليها في الإثبات متى أمكن التحقق من صدورها وسلامتها ونسبتها إلى مرسلها وفقًا للقانون.", visibleWhen: { fieldKey: "rental_messaging_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 16, sourcePageEnd: 16 }),
  customClause({ key: "rental_commercial_legal_fees_clause", titleAr: "رسوم الدمغة والرسوم القانونية (فقرة اختيارية)", bodyAr: "تُسدد رسوم الدمغة وأي رسوم أو ضرائب أو مصروفات قانونية تُفرض على العقد أو تحريره أو إثبات تاريخه أو توثيقه أو تسجيله وفقًا للقوانين واللوائح السارية، ويتحملها الطرف المحدد في بيانات العقد، ما لم يوجب القانون توزيعًا مختلفًا.", visibleWhen: { fieldKey: "commercial_legal_fees_enabled", operator: "truthy" }, sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf", sourcePageStart: 18, sourcePageEnd: 18 }),

  customClause({ key: "rental_administrative_early_termination_clause", titleAr: "الإنهاء المبكر (فقرة اختيارية)", bodyAr: "إذا اتفق الطرفان على جواز إنهاء العقد قبل انتهاء مدته، جاز لأي منهما إنهاؤه بعد إخطار الطرف الآخر كتابةً قبل موعد الإنهاء بمدة لا تقل عن ثلاثين (30) يومًا، مع سداد جميع الحقوق والالتزامات المستحقة حتى تاريخ الإنهاء ورد العين المؤجرة وأداء مقابل الإنهاء المبكر المثبت في بيانات العقد، ما لم يتفق الطرفان كتابةً على خلاف ذلك.", visibleWhen: { fieldKey: "administrative_early_termination_enabled", operator: "truthy" }, sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 4, sourcePageEnd: 4 }),
  customClause({
    key: "rental_administrative_safety_clause",
    titleAr: "اشتراطات السلامة والدفاع المدني (فقرة اختيارية)",
    bodyAr: "إذا كان النشاط الممارس بالعين المؤجرة يستلزم وفقًا للقوانين أو اللوائح أو قرارات الجهات المختصة التزامًا باشتراطات أو تجهيزات خاصة تتعلق بالدفاع المدني أو السلامة والصحة المهنية أو الوقاية من الحريق أو أنظمة الإنذار أو مخارج الطوارئ أو غيرها من الاشتراطات الفنية أو التنظيمية، التزم الطرف الثاني باستيفاء جميع تلك الاشتراطات والحصول على التراخيص أو الموافقات اللازمة – إن وجدت – على نفقته الخاصة، كما يلتزم بالمحافظة على صلاحية تلك التجهيزات طوال مدة العقد.",
    visibleWhen: { fieldKey: "administrative_safety_enabled", operator: "truthy" },
    sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf",
    sourcePageStart: 5,
    sourcePageEnd: 6,
  }),
  customClause({ key: "rental_administrative_guarantee_checks_clause", titleAr: "شيكات الضمان (فقرة اختيارية)", bodyAr: "إذا اتفق الطرفان على تقديم شيكات ضمان، يقر المستأجر بتسليم المؤجر شيكات الضمان بالعدد والبنك والأرقام والقيمة المبينة في بيانات العقد، ضمانًا للالتزامات المالية الناشئة عنه ودون أن تُعد وفاءً بأي مبلغ مستحق. ولا يجوز تقديمها للتحصيل إلا عند تحقق سبب استحقاقها قانونًا. وإذا استُوفي منها مبلغ أثناء سريان العقد، تُستكمل الضمانات وفقًا لأحكام العقد، وتُرد الشيكات أو ما تبقى منها بعد انتهاء العلاقة الإيجارية وتسوية الالتزامات المضمونة بها.", visibleWhen: { fieldKey: "administrative_guarantee_checks_enabled", operator: "truthy" }, sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 6, sourcePageEnd: 7 }),
  customClause({ key: "rental_administrative_annual_increase_clause", titleAr: "الزيادة الدورية في الأجرة (إن وجدت)", bodyAr: "إذا اتفق الطرفان على تطبيق الزيادة الدورية المنصوص عليها في العقد، تُزاد القيمة الإيجارية بنسبة عشرة بالمائة (10%) اعتبارًا من بداية كل سنة إيجارية جديدة، وتُحتسب الزيادة على آخر قيمة إيجارية مستحقة، ما لم يتفق الطرفان كتابةً على خلاف ذلك.", visibleWhen: { fieldKey: "annual_increase_enabled", operator: "truthy" }, sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 7, sourcePageEnd: 8 }),
  customClause({ key: "rental_administrative_article08_tail", titleAr: "ميعاد وآلية سداد الأجرة", variables: ["rent_due_day"], bodyAr: ".3 ميعاد استحقاق الأجرة: تستحق الأجرة مقدمًا عن كل فترة إيجارية، ويلتزم المستأجر بسدادها في موعد أقصاه يوم {{rent_due_day}} من كل فترة إيجارية، وإذا صادف ميعاد الاستحقاق عطلة رسمية امتد إلى أول يوم عمل تالٍ لها.\n\n.4 آلية السداد: تُسدد الأجرة بإحدى وسائل السداد المتفق عليها والمثبتة في بيانات العقد، وتشمل السداد النقدي بموجب إيصال، أو التحويل البنكي، أو الإيداع بالحساب البنكي، أو المحافظ الإلكترونية، أو إنستاباي، أو أي وسيلة أخرى يتفق عليها الطرفان كتابةً. ولا تُعد الأجرة مسددة إلا بتمام استلام المؤجر لقيمتها أو بقيدها في حسابه أو بثبوت الوفاء بها وفقًا لوسيلة السداد المتفق عليها.\n\n.5 التأخير في سداد الأجرة: إذا تأخر المستأجر عن سداد الأجرة أو أي جزء منها بعد حلول ميعاد استحقاقها، تُمنح مهلة سماح قدرها سبعة (7) أيام من تاريخ الاستحقاق. فإذا انقضت دون تمام السداد، التزم بأداء تعويض اتفاقي قدره ثلاثة (3) أضعاف الأجرة اليومية عن كل يوم تأخير، يبدأ احتسابه من اليوم التالي لانتهاء مهلة السماح وحتى تمام السداد، دون إخلال بالحقوق الأخرى المقررة بالعقد والقانون.\n\n.6 الالتزام بسداد الأجرة: يلتزم المستأجر بسداد الأجرة كاملة في مواعيد استحقاقها، ولا يجوز له الامتناع عن سدادها أو حبسها أو خصم أي جزء منها أو إجراء مقاصة عليها إلا بموافقة كتابية صريحة من المؤجر أو بموجب حكم قضائي واجب النفاذ. ويظل مبلغ التأمين ضمانًا مستقلاً ولا يُعد وفاءً بالأجرة.", sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 7, sourcePageEnd: 8 }),
  customClause({
    key: "rental_administrative_vat_clause",
    titleAr: "ضريبة القيمة المضافة (فقرة اختيارية)",
    bodyAr: "إذا كانت القيمة الإيجارية أو أي مبالغ مستحقة بموجب هذا العقد خاضعة لضريبة القيمة المضافة أو لأي ضريبة مماثلة تُفرض قانونًا، التزم الطرف الثاني (المستأجر) بسداد الضريبة المستحقة بالإضافة إلى القيمة الإيجارية، وذلك وفقًا للنسبة المقررة قانونًا وقت استحقاقها، ما لم يتفق الطرفان كتابةً على خلاف ذلك. ويلتزم الطرف الأول (المؤجر)، متى كان خاضعًا قانونًا لأحكام الضريبة على القيمة المضافة، بإصدار الفاتورة أو المستند الضريبي الذي يوجبه القانون وتسليمه للطرف الثاني وفقًا للإجراءات والمواعيد المقررة قانونًا.",
    visibleWhen: { fieldKey: "administrative_vat_enabled", operator: "truthy" },
    sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf",
    sourcePageStart: 8,
    sourcePageEnd: 8,
  }),
  customClause({ key: "rental_administrative_visitors_clause", titleAr: "استقبال العملاء أو الزائرين (فقرة اختيارية)", bodyAr: "إذا كانت طبيعة النشاط تستلزم استقبال العملاء أو الزائرين أو المترددين على العين المؤجرة، يلتزم المستأجر بتنظيم حركة الدخول والخروج والمحافظة على نظافة العين ومحيطها واتخاذ التدابير اللازمة لعدم إعاقة استعمال الأجزاء المشتركة أو الإضرار بباقي الشاغلين أو مرتادي العقار، وفقًا للقوانين واللوائح والتعليمات المنظمة.", visibleWhen: { fieldKey: "administrative_visitors_enabled", operator: "truthy" }, sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 9, sourcePageEnd: 9 }),
  customClause({ key: "rental_administrative_insurance_clause", titleAr: "التأمين على النشاط والمسؤولية المدنية (فقرة اختيارية)", bodyAr: "إذا كانت طبيعة النشاط أو القوانين أو اللوائح أو اشتراطات الجهات المختصة أو اتفاق الطرفين تستوجب تغطية تأمينية، يلتزم المستأجر وعلى نفقته بإبرام والحفاظ على سريان وثائق التأمين اللازمة لتغطية المخاطر المرتبطة بالنشاط، وبوجه خاص الحريق والانفجار والمسؤولية المدنية تجاه الغير، لدى شركة تأمين مرخص لها. ويلتزم بتجديدها وسداد أقساطها وتقديم ما يثبت سريانها عند الطلب، ولا تعفيه التغطية من مسؤولياته العقدية أو القانونية.", visibleWhen: { fieldKey: "administrative_insurance_enabled", operator: "truthy" }, sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 10, sourcePageEnd: 10 }),
  customClause({
    key: "rental_administrative_signage_clause",
    titleAr: "اللافتات ولوحات التعريف بالشركة (فقرة اختيارية)",
    bodyAr: "يجوز للطرف الثاني (المستأجر) وضع اللافتات أو اللوحات الإعلانية أو العلامات التجارية الخاصة بنشاطه على واجهة العين المؤجرة أو في الأماكن المخصصة لذلك، بعد الحصول على موافقة الطرف الأول الكتابية المسبقة واستيفاء جميع التراخيص والموافقات وسداد الرسوم المقررة قانونًا، مع الالتزام بضوابط السلامة والمظهر العام ولوائح إدارة العقار، ويلتزم بإزالتها وإعادة المكان إلى حالته عند انتهاء العقد على نفقته الخاصة.",
    visibleWhen: { fieldKey: "administrative_signage_enabled", operator: "truthy" },
    sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf",
    sourcePageStart: 11,
    sourcePageEnd: 11,
  }),
  customClause({ key: "rental_administrative_email_notice_clause", titleAr: "البريد الإلكتروني المعتمد (إن وجد)", bodyAr: "يجوز للطرفين تبادل الإخطارات والمراسلات والمستندات عبر البريد الإلكتروني المعتمد المثبت في بيانات العقد، وتكون المراسلات الإلكترونية حجة في الإثبات متى أمكن التحقق من صدورها وسلامة محتواها ونسبتها إلى مرسلها، في الحدود التي تقررها القوانين المنظمة للإثبات والمعاملات الإلكترونية.", visibleWhen: { fieldKey: "rental_email_notices_enabled", operator: "truthy" }, sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 20, sourcePageEnd: 20 }),
  customClause({ key: "rental_administrative_messaging_clause", titleAr: "وسائل المراسلة الإلكترونية (واتساب أو غيره)", bodyAr: "يجوز للطرفين استخدام واتساب أو وسيلة المراسلة الإلكترونية وأرقام الاتصال المعتمدة المثبتة في بيانات العقد لتبادل الإخطارات والمراسلات والمستندات والصور والملفات المتعلقة بتنفيذ العقد، وتكون قابلة للاحتجاج بها في الإثبات متى أمكن التحقق من صدورها وسلامتها ونسبتها إلى صاحبها وفقًا للقواعد القانونية المنظمة للإثبات.", visibleWhen: { fieldKey: "rental_messaging_enabled", operator: "truthy" }, sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 20, sourcePageEnd: 20 }),
  customClause({
    key: "rental_administrative_esign_clause",
    titleAr: "التوقيع الإلكتروني والمنصات الرقمية (إن وجد)",
    bodyAr: "يجوز للطرفين توقيع هذا العقد أو أي ملحق أو تعديل له باستخدام التوقيع الإلكتروني أو عبر المنصات الرقمية المعتمدة وفقًا لأحكام القوانين واللوائح المنظمة للتوقيع والمعاملات الإلكترونية، ويكون للتوقيع الإلكتروني المستوفي للشروط القانونية ذات الحجية المقررة للتوقيع اليدوي في الإثبات.",
    visibleWhen: { fieldKey: "administrative_esign_enabled", operator: "truthy" },
    sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf",
    sourcePageStart: 21,
    sourcePageEnd: 21,
  }),
  customClause({ key: "rental_administrative_legal_fees_clause", titleAr: "رسوم الدمغة والرسوم والمصروفات القانونية (إن وجدت)", bodyAr: "تُسدد رسوم الدمغة وأي ضرائب أو رسوم أو مصروفات قانونية تُفرض على العقد أو تحريره أو إثبات تاريخه أو توثيقه أو تسجيله وفقًا للقانون، ويتحملها الطرف المحدد في بيانات العقد في الحدود التي يسمح بها القانون.", visibleWhen: { fieldKey: "administrative_legal_fees_enabled", operator: "truthy" }, sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf", sourcePageStart: 23, sourcePageEnd: 23 }),
];

export const rentalTemplateDefinition: ContractTemplateDefinition = {
  slug: "rental",
  version: 12,
  nameAr: "عقود إيجار الوحدات",
  description: "ثلاثة عقود إيجار مستقلة مطابقة للنماذج السكنية والتجارية والإدارية، مع محضر استلام وجرد اختياري وفارغ قابل للطباعة والتعبئة اليدوية.",
  priceEgp: 0,
  variantPricing: {
    residential_lease: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 599 },
    commercial_lease: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 599 },
    administrative_lease: { selfServicePriceEgp: 59, lawyerAssistedPriceEgp: 599 },
  },
  variants: [
    createRentalVariant({
      key: "residential_lease",
      nameAr: "عقد إيجار سكني",
      documentTitleAr: "عقد إيجار وحدة سكنية",
      description: "للشقق والفيلات والدوبلكس والاستوديو والغرف المخصصة للسكن.",
      sourceDocumentName: "عقد ايجار سكني (Z DRAFT).pdf",
      step: residentialVariantStep,
      extraClauseKeys: residentialCustomKeys,
      defaults: { residential_is_furnished: false, residential_management_rules_applicable: false, residential_other_annex_enabled: false },
    }),
    createRentalVariant({
      key: "commercial_lease",
      nameAr: "عقد إيجار تجاري",
      documentTitleAr: "عقد إيجار تجاري",
      description: "للمحال والمعارض والمخازن والوحدات داخل المولات والأسواق والمشروعات التجارية.",
      sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf",
      step: commercialVariantStep,
      extraClauseKeys: commercialCustomKeys,
      defaults: {
        commercial_early_termination_enabled: false, commercial_safety_enabled: false, commercial_guarantee_checks_enabled: false,
        commercial_vat_enabled: false, commercial_public_customers_enabled: false, commercial_insurance_enabled: false,
        commercial_signage_enabled: false, commercial_legal_fees_enabled: false,
      },
    }),
    createRentalVariant({
      key: "administrative_lease",
      nameAr: "عقد إيجار إداري",
      documentTitleAr: "عقد إيجار إداري",
      description: "للمكاتب ومقار الشركات والعيادات والمراكز المهنية داخل الأبراج والمجمعات الإدارية.",
      sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf",
      step: administrativeVariantStep,
      extraClauseKeys: administrativeCustomKeys,
      defaults: {
        administrative_early_termination_enabled: false, administrative_safety_enabled: false, administrative_guarantee_checks_enabled: false,
        administrative_vat_enabled: false, administrative_visitors_enabled: false, administrative_insurance_enabled: false,
        administrative_signage_enabled: false, administrative_esign_enabled: false, administrative_legal_fees_enabled: false,
      },
    }),
  ],
  optionalClauses: [handoverOptionalClause],
  legalClauses: [...reviewedSourceClauses, ...conditionalClauses]
    .map(normalizeLegalClauseDefinition),
};
