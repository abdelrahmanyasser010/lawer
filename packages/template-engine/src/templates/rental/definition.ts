import type {
  ContractTemplateDefinition,
  ContractVariantDefinition,
  WizardStepDefinition,
} from "../../types";
import { rentalSourceClauseKeysByVariant, rentalSourceLegalClauses } from "../../legal-content/sourceClauses";

const partyTypeOptions = [
  { value: "individual", labelAr: "فرد" },
  { value: "company", labelAr: "شركة / منشأة" },
];

const rentalPartyFields = (prefix: "landlord" | "tenant", partyLabel: string) => [
  { key: `${prefix}_party_type`, type: "radio" as const, labelAr: `صفة ${partyLabel}`, required: true, options: partyTypeOptions },
  { key: `${prefix}_name`, type: "text" as const, labelAr: `الاسم الكامل لـ${partyLabel}`, required: true, validation: { minLength: 3 } },
  { key: `${prefix}_nationality`, type: "text" as const, labelAr: "الجنسية", required: true },
  { key: `${prefix}_national_id`, type: "text" as const, labelAr: "الرقم القومي / جواز السفر", required: true },
  { key: `${prefix}_id_issuer`, type: "text" as const, labelAr: "جهة إصدار الهوية" },
  { key: `${prefix}_id_issue_date`, type: "date" as const, labelAr: "تاريخ إصدار الهوية" },
  { key: `${prefix}_phone`, type: "text" as const, labelAr: "رقم الهاتف", required: true },
  { key: `${prefix}_email`, type: "text" as const, labelAr: "البريد الإلكتروني" },
  { key: `${prefix}_address`, type: "text" as const, labelAr: "العنوان", required: true },
  { key: `${prefix}_company_name`, type: "text" as const, labelAr: "اسم الشركة / المنشأة", required: true, visibleWhen: { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" } },
  { key: `${prefix}_company_legal_form`, type: "text" as const, labelAr: "الشكل القانوني", required: true, visibleWhen: { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" } },
  { key: `${prefix}_commercial_register`, type: "text" as const, labelAr: "رقم السجل التجاري", required: true, visibleWhen: { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" } },
  { key: `${prefix}_tax_card`, type: "text" as const, labelAr: "رقم البطاقة الضريبية", required: true, visibleWhen: { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" } },
  { key: `${prefix}_legal_representative`, type: "text" as const, labelAr: "الممثل القانوني", required: true, visibleWhen: { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" } },
  { key: `${prefix}_representative_capacity`, type: "text" as const, labelAr: "صفة الممثل القانوني", required: true, visibleWhen: { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" } },
  { key: `${prefix}_company_address`, type: "text" as const, labelAr: "مقر الشركة", required: true, visibleWhen: { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" } },
  { key: `${prefix}_company_email`, type: "text" as const, labelAr: "البريد الإلكتروني للشركة", required: true, visibleWhen: { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" } },
  { key: `${prefix}_id_card_front`, type: "attachment" as const, labelAr: `وجه بطاقة ${partyLabel}`, required: true },
  { key: `${prefix}_id_card_back`, type: "attachment" as const, labelAr: `ظهر بطاقة ${partyLabel}`, required: true },
];

const rentalCommonSteps: WizardStepDefinition[] = [
  { key: "rental_landlord", titleAr: "بيانات المؤجر", articleRange: "هوية وصفة الطرف", fields: rentalPartyFields("landlord", "المؤجر") },
  { key: "rental_tenant", titleAr: "بيانات المستأجر", articleRange: "هوية وصفة الطرف", fields: rentalPartyFields("tenant", "المستأجر") },
  {
    key: "rental_property", titleAr: "العين المؤجرة", articleRange: "الموقع والمواصفات", fields: [
      { key: "property_governorate", type: "text", labelAr: "المحافظة", required: true },
      { key: "property_city", type: "text", labelAr: "المدينة / المركز", required: true },
      { key: "property_district", type: "text", labelAr: "الحي / المنطقة", required: true },
      { key: "property_street", type: "text", labelAr: "اسم الشارع", required: true },
      { key: "property_compound_name", type: "text", labelAr: "اسم الكمبوند", visibleWhen: { fieldKey: "rental_purpose", operator: "equals", value: "residential" } },
      { key: "property_plot_number", type: "text", labelAr: "رقم القطعة" },
      { key: "property_adjacency_number", type: "text", labelAr: "رقم المجاورة", visibleWhen: { fieldKey: "rental_purpose", operator: "equals", value: "residential" } },
      { key: "building_number", type: "text", labelAr: "رقم العقار", visibleWhen: { fieldKey: "rental_purpose", operator: "not_equals", value: "administrative" } },
      { key: "building_name", type: "text", labelAr: "اسم البرج / العمارة", visibleWhen: { fieldKey: "rental_purpose", operator: "equals", value: "residential" } },
      { key: "floor_number", type: "text", labelAr: "الدور", required: true },
      { key: "unit_number", type: "text", labelAr: "رقم الوحدة", required: true },
      { key: "property_area", type: "number", labelAr: "المساحة التقريبية بالمتر", required: true, validation: { min: 1 } },
      { key: "rooms_count", type: "number", labelAr: "عدد غرف النوم", required: true, visibleWhen: { fieldKey: "rental_purpose", operator: "equals", value: "residential" }, validation: { min: 0 } },
      { key: "bathrooms_count", type: "number", labelAr: "عدد الحمامات", required: true, visibleWhen: { fieldKey: "rental_purpose", operator: "equals", value: "residential" }, validation: { min: 0 } },
      { key: "balconies_count", type: "number", labelAr: "عدد البلكونات", required: true, visibleWhen: { fieldKey: "rental_purpose", operator: "equals", value: "residential" }, validation: { min: 0 } },
      { key: "reception_count", type: "number", labelAr: "عدد صالات الاستقبال", required: true, visibleWhen: { fieldKey: "rental_purpose", operator: "equals", value: "residential" }, validation: { min: 0 } },
      { key: "has_kitchen", type: "radio", labelAr: "هل يوجد مطبخ؟", required: true, visibleWhen: { fieldKey: "rental_purpose", operator: "equals", value: "residential" }, options: [{ value: "yes", labelAr: "نعم" }, { value: "no", labelAr: "لا" }] },
      { key: "finishing_level", type: "select", labelAr: "حالة التشطيب", required: true, visibleWhen: { fieldKey: "rental_purpose", operator: "not_equals", value: "administrative" }, options: [
        { value: "unfinished", labelAr: "بدون تشطيب" }, { value: "semi_finished", labelAr: "نصف تشطيب" },
        { value: "finished", labelAr: "تشطيب كامل" }, { value: "lux", labelAr: "لوكس" },
        { value: "super_lux", labelAr: "سوبر لوكس" }, { value: "super_high_lux", labelAr: "سوبر هاي لوكس" },
      ] },
    ]
  },
  {
    key: "rental_terms", titleAr: "الغرض والمدة", articleRange: "الاستخدام والتجديد", fields: [
      { key: "start_date", type: "date", labelAr: "تاريخ بداية الإيجار", required: true },
      { key: "end_date", type: "date", labelAr: "تاريخ نهاية الإيجار", required: true },
      { key: "contract_duration_amount", type: "number", labelAr: "مدة العقد", required: true, validation: { min: 1 } },
      { key: "contract_duration_unit", type: "select", labelAr: "وحدة المدة", required: true, options: [{ value: "month", labelAr: "شهر" }, { value: "year", labelAr: "سنة" }] },
      { key: "sublease_allowed", type: "radio", labelAr: "السماح بالتأجير من الباطن", required: true, options: [{ value: "no", labelAr: "غير مسموح" }, { value: "written_approval", labelAr: "بموافقة كتابية" }] },
      { key: "renewal_policy", type: "select", labelAr: "سياسة التجديد", required: true, options: [{ value: "mutual_agreement", labelAr: "بعقد أو اتفاق جديد" }, { value: "automatic", labelAr: "تجديد تلقائي وفق الشرط" }, { value: "none", labelAr: "لا يتجدد" }] },
      { key: "non_renewal_notice_days", type: "number", labelAr: "مدة الإخطار قبل عدم التجديد (يوم)", required: true, validation: { min: 0 } },
    ]
  },
  {
    key: "rental_financial", titleAr: "القيمة والتأمين", articleRange: "الدفع والزيادة", fields: [
      { key: "monthly_rent", type: "money", labelAr: "القيمة الإيجارية الشهرية", required: true, validation: { min: 1 } },
      { key: "rent_due_day", type: "number", labelAr: "يوم استحقاق الإيجار من كل شهر", required: true, validation: { min: 1, max: 31 } },
      { key: "payment_method", type: "select", labelAr: "طريقة السداد", required: true, options: [{ value: "cash", labelAr: "نقدًا بإيصال" }, { value: "bank", labelAr: "تحويل بنكي" }, { value: "wallet", labelAr: "محفظة إلكترونية" }] },
      { key: "bank_name", type: "text", labelAr: "اسم البنك", required: true, visibleWhen: { fieldKey: "payment_method", operator: "equals", value: "bank" } },
      { key: "bank_account_number", type: "text", labelAr: "رقم الحساب البنكي", required: true, visibleWhen: { fieldKey: "payment_method", operator: "equals", value: "bank" } },
      { key: "wallet_number", type: "text", labelAr: "رقم المحفظة", required: true, visibleWhen: { fieldKey: "payment_method", operator: "equals", value: "wallet" } },
      { key: "has_deposit", type: "radio", labelAr: "هل يوجد مبلغ تأمين؟", required: true, options: [{ value: "yes", labelAr: "نعم" }, { value: "no", labelAr: "لا" }] },
      { key: "deposit_amount", type: "money", labelAr: "قيمة التأمين", required: true, visibleWhen: { fieldKey: "has_deposit", operator: "equals", value: "yes" }, validation: { min: 0 } },
      { key: "deposit_return_days", type: "number", labelAr: "مدة رد التأمين بعد التسليم (يوم)", required: true, visibleWhen: { fieldKey: "has_deposit", operator: "equals", value: "yes" }, validation: { min: 0 } },
      { key: "annual_increase_enabled", type: "radio", labelAr: "هل توجد زيادة دورية؟", required: true, options: [{ value: "yes", labelAr: "نعم" }, { value: "no", labelAr: "لا" }] },
      { key: "annual_increase", type: "number", labelAr: "نسبة الزيادة السنوية %", required: true, visibleWhen: { fieldKey: "annual_increase_enabled", operator: "equals", value: "yes" }, validation: { min: 0, max: 100 } },
      { key: "annual_increase_type", type: "select", labelAr: "نوع الزيادة", required: true, visibleWhen: { fieldKey: "annual_increase_enabled", operator: "equals", value: "yes" }, options: [{ value: "simple", labelAr: "بسيطة" }, { value: "compound", labelAr: "مركبة" }] },
    ]
  },
  {
    key: "rental_utilities", titleAr: "المرافق", articleRange: "عدادات والتزامات", fields: [
      { key: "electricity_meter", type: "text", labelAr: "رقم عداد الكهرباء" },
      { key: "electricity_meter_type", type: "select", labelAr: "نوع عداد الكهرباء", options: [{ value: "prepaid_card", labelAr: "كارت شحن" }, { value: "invoice", labelAr: "فاتورة" }, { value: "shared", labelAr: "مشترك" }] },
      { key: "water_meter", type: "text", labelAr: "رقم عداد المياه" },
      { key: "water_meter_type", type: "select", labelAr: "نوع عداد المياه", options: [{ value: "separate", labelAr: "مستقل" }, { value: "shared", labelAr: "مشترك" }] },
      { key: "gas_meter", type: "text", labelAr: "رقم عداد الغاز" },
      { key: "gas_meter_type", type: "select", labelAr: "نوع عداد الغاز", options: [{ value: "independent", labelAr: "مستقل" }, { value: "shared", labelAr: "مشترك" }, { value: "none", labelAr: "غير موجود" }] },
      { key: "internet_available", type: "radio", labelAr: "خدمة إنترنت موجودة", options: [{ value: "yes", labelAr: "نعم" }, { value: "no", labelAr: "لا" }] },
      { key: "tenant_pays_electricity", type: "checkbox", labelAr: "المستأجر يتحمل استهلاك الكهرباء" },
      { key: "tenant_pays_water", type: "checkbox", labelAr: "المستأجر يتحمل استهلاك المياه" },
      { key: "tenant_pays_gas", type: "checkbox", labelAr: "المستأجر يتحمل استهلاك الغاز" },
      { key: "tenant_pays_internet", type: "checkbox", labelAr: "المستأجر يتحمل خدمة الإنترنت" },
    ]
  },
  {
    key: "rental_practical", titleAr: "الشروط العملية", articleRange: "حظر وغرامات", fields: [
      { key: "pets_policy", type: "select", labelAr: "سياسة الحيوانات الأليفة", options: [{ value: "prohibited", labelAr: "ممنوعة" }, { value: "allowed", labelAr: "مسموحة" }, { value: "conditional", labelAr: "مسموحة بشروط" }] },
      { key: "late_penalty_enabled", type: "radio", labelAr: "إضافة تعويض عن التأخير", required: true, options: [{ value: "yes", labelAr: "نعم" }, { value: "no", labelAr: "لا" }] },
      { key: "daily_late_penalty_amount", type: "money", labelAr: "قيمة التعويض اليومي", required: true, visibleWhen: { fieldKey: "late_penalty_enabled", operator: "equals", value: "yes" }, validation: { min: 0 } },
      { key: "late_payment_action", type: "select", labelAr: "الإجراء عند التأخر", required: true, options: [{ value: "grace_period", labelAr: "مهلة ثم إجراء" }, { value: "termination", labelAr: "تفعيل الشرط الفاسخ وفق العقد" }, { value: "notice", labelAr: "إنذار كتابي" }] },
      { key: "competent_court", type: "text", labelAr: "المحكمة المختصة", required: true },
      { key: "rental_supporting_documents", type: "attachment", labelAr: "المستندات والمرفقات الداعمة" },
    ]
  },
];

const rentalReviewStep: WizardStepDefinition = {
  key: "rental_review",
  titleAr: "المراجعة والاعتماد",
  articleRange: "ملخص نهائي",
  fields: [],
};

const commonRentalDefaults = {
  landlord_party_type: "individual",
  tenant_party_type: "individual",
  landlord_nationality: "مصر",
  tenant_nationality: "مصر",
  property_area: "120",
  reception_count: "1",
  has_kitchen: "yes",
  finishing_level: "lux",
  sublease_allowed: "no",
  renewal_policy: "mutual_agreement",
  non_renewal_notice_days: "30",
  deposit_return_days: "15",
  electricity_meter_type: "prepaid_card",
  water_meter_type: "separate",
  gas_meter_type: "independent",
  internet_available: "no",
  tenant_pays_electricity: true,
  tenant_pays_water: true,
  tenant_pays_gas: true,
  tenant_pays_internet: true,
  pets_policy: "prohibited",
  contract_duration_amount: "12",
  contract_duration_unit: "month",
  monthly_rent: "5000",
  rent_due_day: "5",
  payment_method: "cash",
  has_deposit: "yes",
  annual_increase: "10",
  annual_increase_enabled: "yes",
  annual_increase_type: "simple",
  deposit_amount: "10000",
  late_penalty_enabled: "yes",
  daily_late_penalty_amount: "100",
  late_payment_action: "grace_period",
  competent_court: "القاهرة",
};


const residentialVariantStep: WizardStepDefinition = {
  key: "rental_residential_details",
  titleAr: "تفاصيل الإيجار السكني",
  articleRange: "نوع السكن والملحقات",
  sourceClauseKey: "rental_residential_variant",
  fields: [
    {
      key: "residential_property_type",
      type: "select",
      labelAr: "نوع العين السكنية",
      required: true,
      options: [
        { value: "apartment", labelAr: "شقة" },
        { value: "villa", labelAr: "فيلا" },
        { value: "duplex", labelAr: "دوبلكس" },
        { value: "studio", labelAr: "استوديو" },
        { value: "room", labelAr: "غرفة" },
      ],
    },
    { key: "residential_is_furnished", type: "checkbox", labelAr: "العين مؤجرة مفروشة أو بها منقولات" },
    { key: "residential_includes_garage", type: "checkbox", labelAr: "يشمل الإيجار جراج/مكان سيارة" },
    { key: "residential_includes_storage", type: "checkbox", labelAr: "يشمل مخزنًا" },
    { key: "residential_includes_garden", type: "checkbox", labelAr: "يشمل حديقة" },
    { key: "residential_includes_roof", type: "checkbox", labelAr: "يشمل سطحًا/روف" },
    { key: "residential_occupancy_notes", type: "text", labelAr: "وصف شاغلي العين أو أفراد الأسرة (اختياري)" },
  ],
};

const commercialVariantStep: WizardStepDefinition = {
  key: "rental_commercial_details",
  titleAr: "تفاصيل الإيجار التجاري",
  articleRange: "الموقع والنشاط والتراخيص",
  sourceClauseKey: "rental_commercial_variant",
  fields: [
    {
      key: "commercial_site_type",
      type: "select",
      labelAr: "نوع موقع الوحدة التجارية",
      required: true,
      options: [
        { value: "mall", labelAr: "داخل مول" },
        { value: "main_street", labelAr: "على شارع رئيسي" },
        { value: "side_street", labelAr: "على شارع فرعي" },
        { value: "market", labelAr: "داخل سوق تجاري" },
        { value: "commercial_project", labelAr: "داخل مشروع تجاري" },
        { value: "other", labelAr: "غير ذلك" },
      ],
    },
    { key: "commercial_project_name", type: "text", labelAr: "اسم المول/المشروع التجاري" },
    { key: "commercial_license_number", type: "text", labelAr: "رقم ترخيص الوحدة أو النشاط إن وجد" },
    { key: "commercial_plot_number", type: "text", labelAr: "رقم القطعة" },
    { key: "commercial_has_mezzanine", type: "checkbox", labelAr: "يوجد ميزانين" },
    { key: "commercial_frontage_width", type: "number", labelAr: "عرض الواجهة بالمتر", validation: { min: 0 } },
    { key: "commercial_frontage_count", type: "number", labelAr: "عدد الواجهات", validation: { min: 0 } },
    { key: "commercial_has_storage", type: "checkbox", labelAr: "يوجد مخزن تابع" },
    { key: "commercial_has_loading_area", type: "checkbox", labelAr: "يوجد مكان تحميل وتنزيل" },
    { key: "commercial_activity_name", type: "text", labelAr: "النشاط التجاري المحدد", required: true },
    {
      key: "commercial_license_responsibility",
      type: "select",
      labelAr: "مسؤولية استخراج وتجديد تراخيص النشاط",
      required: true,
      options: [
        { value: "tenant", labelAr: "المستأجر" },
        { value: "landlord", labelAr: "المؤجر" },
        { value: "shared", labelAr: "بحسب المستندات المتفق عليها" },
      ],
    },
    { key: "commercial_signage_allowed", type: "checkbox", labelAr: "يسمح بتركيب لافتة بعد الموافقات اللازمة" },
  ],
};

const administrativeVariantStep: WizardStepDefinition = {
  key: "rental_administrative_details",
  titleAr: "تفاصيل الإيجار الإداري",
  articleRange: "نوع المقر والنشاط الإداري",
  sourceClauseKey: "rental_administrative_variant",
  fields: [
    {
      key: "administrative_site_type",
      type: "select",
      labelAr: "موقع العين الإدارية",
      required: true,
      options: [
        { value: "office_tower", labelAr: "داخل برج إداري" },
        { value: "mixed_use", labelAr: "داخل مبنى متعدد الاستخدامات" },
        { value: "administrative_project", labelAr: "داخل مشروع إداري" },
        { value: "compound", labelAr: "داخل كمبوند" },
        { value: "main_street", labelAr: "على شارع رئيسي" },
        { value: "side_street", labelAr: "على شارع فرعي" },
        { value: "other", labelAr: "أخرى" },
      ],
    },
    { key: "administrative_project_name", type: "text", labelAr: "اسم المشروع/البرج/المجمع الإداري" },
    { key: "administrative_license_number", type: "text", labelAr: "رقم الترخيص إن وجد" },
    { key: "administrative_plot_number", type: "text", labelAr: "رقم القطعة" },
    {
      key: "administrative_use_type",
      type: "select",
      labelAr: "نوع الاستخدام الإداري",
      required: true,
      options: [
        { value: "office", labelAr: "مكتب إداري" },
        { value: "company_hq", labelAr: "مقر شركة" },
        { value: "clinic", labelAr: "عيادة/مركز مهني" },
        { value: "professional_office", labelAr: "مكتب مهني" },
        { value: "training_center", labelAr: "مركز تدريب" },
        { value: "other", labelAr: "نشاط إداري آخر" },
      ],
    },
    { key: "administrative_activity_name", type: "text", labelAr: "وصف النشاط الإداري المحدد", required: true },
    { key: "administrative_visitors_allowed", type: "checkbox", labelAr: "يسمح باستقبال عملاء/زوار وفق لوائح المبنى" },
    { key: "administrative_signage_allowed", type: "checkbox", labelAr: "يسمح بلافتة تعريفية بعد الموافقات اللازمة" },
    { key: "administrative_working_hours", type: "text", labelAr: "مواعيد العمل المتفق عليها إن وجدت" },
  ],
};

function createRentalVariant(input: {
  key: string;
  nameAr: string;
  documentTitleAr: string;
  description: string;
  sourceDocumentName: string;
  purpose: "residential" | "commercial" | "administrative";
  step: WizardStepDefinition;
  requiredClauseKeys: string[];
  defaults: Record<string, string | number | boolean | null>;
}): ContractVariantDefinition {
  return {
    key: input.key,
    nameAr: input.nameAr,
    documentTitleAr: input.documentTitleAr,
    description: input.description,
    sourceDocumentName: input.sourceDocumentName,
    steps: [
      ...rentalCommonSteps.flatMap((step) => step.key === "rental_property" ? [step, input.step] : [step]),
      rentalReviewStep,
    ],
    requiredClauseKeys: [...input.requiredClauseKeys],
    allowedOptionalClauseKeys: ["rental_handover_inventory_report"],
    defaultFieldValues: {
      ...commonRentalDefaults,
      rental_purpose: input.purpose,
      ...input.defaults,
    },
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

export const rentalTemplateDefinition: ContractTemplateDefinition = {
  slug: "rental",
  version: 4,
  nameAr: "عقود إيجار الوحدات",
  description: "قالب إيجار رئيسي بثلاث صيغ مستقلة، مع إمكانية إصدار محضر استلام وجرد كمستند منفصل.",
  priceEgp: 59,
  variants: [
    createRentalVariant({
      key: "residential_lease",
      nameAr: "عقد إيجار سكني",
      documentTitleAr: "عقد إيجار وحدة سكنية",
      description: "للشقق والفيلات والدوبلكس والاستوديو والغرف المخصصة للسكن.",
      sourceDocumentName: "عقد ايجار سكني (Z DRAFT).pdf",
      purpose: "residential",
      step: residentialVariantStep,
      requiredClauseKeys: [...rentalSourceClauseKeysByVariant.residential_lease],
      defaults: {
        rooms_count: "3",
        bathrooms_count: "1",
        balconies_count: "1",
        residential_property_type: "apartment",
        residential_is_furnished: false,
      },
    }),
    createRentalVariant({
      key: "commercial_lease",
      nameAr: "عقد إيجار تجاري",
      documentTitleAr: "عقد إيجار تجاري",
      description: "للمحال والمعارض والمخازن والوحدات داخل المولات والأسواق والمشروعات التجارية.",
      sourceDocumentName: "عقد ايجار تجاري ( Z DRAFT ).pdf",
      purpose: "commercial",
      step: commercialVariantStep,
      requiredClauseKeys: [...rentalSourceClauseKeysByVariant.commercial_lease],
      defaults: {
        property_area: "80",
        commercial_site_type: "main_street",
        commercial_license_responsibility: "tenant",
        commercial_signage_allowed: false,
      },
    }),
    createRentalVariant({
      key: "administrative_lease",
      nameAr: "عقد إيجار إداري",
      documentTitleAr: "عقد إيجار إداري",
      description: "للمكاتب ومقار الشركات والعيادات والمراكز المهنية داخل الأبراج والمجمعات الإدارية.",
      sourceDocumentName: "إداري عقد ايجار Z DRAFT().pdf",
      purpose: "administrative",
      step: administrativeVariantStep,
      requiredClauseKeys: [...rentalSourceClauseKeysByVariant.administrative_lease],
      defaults: {
        property_area: "100",
        administrative_site_type: "office_tower",
        administrative_use_type: "office",
        administrative_visitors_allowed: true,
        administrative_signage_allowed: false,
      },
    }),
  ],
  optionalClauses: [
    {
      key: "rental_handover_inventory_report",
      nameAr: "إصدار محضر استلام وجرد",
      documentTitleAr: "محضر استلام وجرد العين المؤجرة",
      sourceDocumentName: "محضر استلام وجرد العين المؤجرة Z DRAFT.pdf",
      outputMode: "separate_annex",
      description: "يصدر كمستند مستقل ملحق بعقد الإيجار، ويجمع حالة العين والمفاتيح والعدادات والمنقولات.",
      applicableVariantKeys: ["residential_lease", "commercial_lease", "administrative_lease"],
      insertBeforeStepKey: "rental_review",
      legalClauseKeys: [...rentalSourceClauseKeysByVariant.rental_handover_inventory_report],
      defaultFieldValues: {
        handover_condition_items: [
          { item: "الدهانات", condition: "good", notes: "" },
          { item: "الأسقف", condition: "good", notes: "" },
          { item: "الأرضيات", condition: "good", notes: "" },
          { item: "الأبواب", condition: "good", notes: "" },
          { item: "الأقفال", condition: "good", notes: "" },
          { item: "الشبابيك", condition: "good", notes: "" },
          { item: "الزجاج", condition: "good", notes: "" },
          { item: "الأعمال الكهربائية", condition: "good", notes: "" },
          { item: "وحدات الإضاءة", condition: "good", notes: "" },
          { item: "أعمال السباكة", condition: "good", notes: "" },
          { item: "المطبخ", condition: "good", notes: "" },
          { item: "الحمامات", condition: "good", notes: "" },
          { item: "التكييفات الثابتة", condition: "good", notes: "" },
          { item: "السخان", condition: "good", notes: "" }
        ],
        handover_access_items: [
          { item: "مفتاح الباب الرئيسي", quantity: "", notes: "" },
          { item: "المفاتيح الداخلية", quantity: "", notes: "" },
          { item: "ريموت البوابة", quantity: "", notes: "" },
          { item: "ريموت الجراج", quantity: "", notes: "" },
          { item: "كارت الدخول", quantity: "", notes: "" },
          { item: "جهاز تحكم آخر", quantity: "", notes: "" }
        ],
        inventory_items: [],
        handover_media_capture_mode: "none",
        handover_copies_count: "2",
        handover_parties_acknowledged: false,
      },
      insertedSteps: [
        {
          key: "rental_handover_inventory_report",
          titleAr: "محضر الاستلام والجرد",
          articleRange: "مستند منفصل",
          sourceClauseKey: rentalSourceClauseKeysByVariant.rental_handover_inventory_report[0],
          description: "تُستخدم هذه البيانات لإصدار محضر مستقل مرتبط برقم عقد الإيجار.",
          fields: [
            { key: "handover_contract_reference_number", type: "text", labelAr: "رقم عقد الإيجار أو مرجعه (إن وجد)" },
            { key: "handover_original_contract_date", type: "date", labelAr: "تاريخ عقد الإيجار الأصلي", required: true },
            { key: "handover_date", type: "date", labelAr: "تاريخ الاستلام", required: true },
            { key: "handover_time", type: "text", labelAr: "وقت الاستلام", placeholder: "مثال: 02:30 مساءً" },
            {
              key: "handover_condition_items",
              type: "repeater",
              labelAr: "بيان حالة العين المؤجرة",
              required: true,
              minRows: 1,
              columns: [
                { key: "item", type: "text", labelAr: "البيان", required: true },
                { key: "condition", type: "select", labelAr: "الحالة", required: true, options: standardConditionOptions },
                { key: "notes", type: "text", labelAr: "ملاحظات" },
              ],
            },
            {
              key: "handover_access_items",
              type: "repeater",
              labelAr: "وسائل الدخول المسلمة",
              columns: [
                { key: "item", type: "text", labelAr: "الوسيلة", required: true, placeholder: "مفتاح رئيسي / ريموت / كارت" },
                { key: "quantity", type: "number", labelAr: "العدد", required: true },
                { key: "notes", type: "text", labelAr: "ملاحظات" },
              ],
            },
            {
              key: "inventory_items",
              type: "repeater",
              labelAr: "جرد المنقولات والتجهيزات",
              columns: [
                { key: "name", type: "text", labelAr: "البيان", required: true },
                { key: "quantity", type: "number", labelAr: "الكمية", required: true },
                { key: "condition", type: "select", labelAr: "الحالة", required: true, options: standardConditionOptions },
                { key: "notes", type: "text", labelAr: "ملاحظات" },
              ],
            },
            { key: "handover_electricity_meter_number", type: "text", labelAr: "رقم عداد الكهرباء" },
            { key: "handover_electricity_reading", type: "text", labelAr: "قراءة عداد الكهرباء" },
            { key: "handover_water_meter_number", type: "text", labelAr: "رقم عداد المياه" },
            { key: "handover_water_reading", type: "text", labelAr: "قراءة عداد المياه" },
            { key: "handover_gas_meter_number", type: "text", labelAr: "رقم عداد الغاز" },
            { key: "handover_gas_reading", type: "text", labelAr: "قراءة عداد الغاز" },
            {
              key: "handover_media_capture_mode",
              type: "select",
              labelAr: "توثيق حالة العين وقت الاستلام",
              required: true,
              options: [
                { value: "photos", labelAr: "تم التقاط صور" },
                { value: "video", labelAr: "تم تصوير فيديو" },
                { value: "photos_and_video", labelAr: "صور وفيديو" },
                { value: "none", labelAr: "لم يتم التقاط صور أو تسجيلات" },
              ],
            },
            {
              key: "handover_media_files",
              type: "attachment",
              labelAr: "صور أو تسجيلات حالة العين",
              visibleWhen: { fieldKey: "handover_media_capture_mode", operator: "not_equals", value: "none" },
              helpText: "هذه الملفات تخص المحضر المنفصل ولا تُدرج داخل صفحات العقد الأساسي.",
            },
            { key: "handover_general_notes", type: "textarea", labelAr: "ملاحظات عامة وتحفظات الاستلام" },
            { key: "handover_copies_count", type: "number", labelAr: "عدد نسخ المحضر", required: true, validation: { min: 2, max: 20 } },
            { key: "handover_parties_acknowledged", type: "checkbox", labelAr: "يقر الطرفان بصحة بيانات المحضر والجرد", required: true },
          ],
        },
      ],
    },
  ],
  legalClauses: rentalSourceLegalClauses,
};
