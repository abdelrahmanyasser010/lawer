import type {
  ContractTemplateDefinition,
  ContractVariantDefinition,
  OptionalClauseDefinition,
  WizardFieldDefinition,
  WizardStepDefinition,
} from "../../types";
import {
  freelanceSourceClauseKeysByAnnex,
  freelanceSourceClauseKeysByVariant,
  freelanceSourceLegalClauses,
} from "../../legal-content/freelanceSourceClauses";

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

function partyFields(prefix: string, label: string, roleLabel: string): WizardFieldDefinition[] {
  const companyCondition = { fieldKey: `${prefix}_party_type`, operator: "equals" as const, value: "company" };
  return [
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
    { key: `${prefix}_power_of_attorney_details`, type: "text", labelAr: "رقم وسنة ومكتب التوكيل", required: true, visibleWhen: { fieldKey: `${prefix}_authority_basis`, operator: "equals", value: "power_of_attorney" } },
    { key: `${prefix}_company_address`, type: "text", labelAr: "مقر الشركة", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_company_email`, type: "text", labelAr: "البريد الإلكتروني للشركة", required: true, visibleWhen: companyCondition },
    { key: `${prefix}_identity_documents`, type: "attachment", labelAr: `مستندات هوية وصفة ${roleLabel}` },
  ];
}

function commonPartySteps(secondPrefix: string, secondLabel: string, roleLabel: string): WizardStepDefinition[] {
  return [
    { key: `${secondPrefix}_client_party`, titleAr: "بيانات الطرف الأول (العميل)", fields: partyFields(`${secondPrefix}_client`, "العميل", "العميل") },
    { key: `${secondPrefix}_provider_party`, titleAr: `بيانات الطرف الثاني (${secondLabel})`, fields: partyFields(`${secondPrefix}_provider`, secondLabel, roleLabel) },
  ];
}

const reviewStep = (key: string): WizardStepDefinition => ({ key, titleAr: "المراجعة وإصدار العقد", fields: [] });

const visualSteps: WizardStepDefinition[] = [
  ...commonPartySteps("visual", "المصمم", "المصمم"),
  { key: "visual_project", titleAr: "بيانات مشروع الهوية البصرية", fields: [
    { key: "visual_project_name", type: "text", labelAr: "اسم المشروع / العلامة التجارية / النشاط", required: true },
    { key: "visual_project_brief", type: "textarea", labelAr: "وصف مختصر للمشروع (اختياري)" },
    { key: "visual_project_purpose", type: "textarea", labelAr: "الغرض من تصميم الهوية البصرية", required: true },
    { key: "visual_target_audience", type: "textarea", labelAr: "الفئة المستهدفة", required: true },
    { key: "visual_execution_duration", type: "text", labelAr: "مدة التنفيذ المتفق عليها", required: true },
    { key: "visual_review_rounds", type: "number", labelAr: "عدد جولات المراجعة المشمولة", required: true, validation: { min: 0 } },
    { key: "visual_competent_court", type: "text", labelAr: "المحكمة المختصة", required: true },
  ] },
  { key: "visual_attachments", titleAr: "المستندات والمواد المتاحة", fields: [
    { key: "visual_existing_brand_files", type: "attachment", labelAr: "الشعار أو الهوية السابقة - إن وجدت" },
    { key: "visual_reference_files", type: "attachment", labelAr: "المراجع والمواد والمحتوى المقدم من العميل" },
  ] },
  reviewStep("visual_review"),
];

const websiteSteps: WizardStepDefinition[] = [
  ...commonPartySteps("website", "مقدم الخدمة", "مقدم الخدمة"),
  { key: "website_project", titleAr: "بيانات مشروع الموقع الإلكتروني", fields: [
    { key: "website_project_name", type: "text", labelAr: "اسم المشروع", required: true },
    { key: "website_project_type", type: "select", labelAr: "نوع المشروع", required: true, options: [
      { value: "corporate", labelAr: "موقع تعريفي" },
      { value: "ecommerce", labelAr: "متجر إلكتروني" },
      { value: "platform", labelAr: "منصة إلكترونية" },
      { value: "web_app", labelAr: "نظام ويب" },
      { value: "landing_page", labelAr: "صفحة هبوط" },
      { value: "other", labelAr: "أخرى" },
    ] },
    { key: "website_project_type_other", type: "text", labelAr: "نوع المشروع الآخر", required: true, visibleWhen: { fieldKey: "website_project_type", operator: "equals", value: "other" } },
    { key: "website_contact_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للتواصل", required: true },
    { key: "website_project_manager", type: "text", labelAr: "مسؤول المشروع لدى العميل", required: true },
    { key: "website_approval_person", type: "text", labelAr: "المسؤول عن الاعتماد", required: true },
    { key: "website_billing_contact", type: "text", labelAr: "المسؤول عن الفواتير أو المدفوعات", required: true },
    { key: "website_execution_duration", type: "text", labelAr: "مدة التنفيذ", required: true },
    { key: "website_total_price", type: "money", labelAr: "إجمالي المقابل المالي", required: true, validation: { min: 1 } },
    { key: "website_payment_currency", type: "select", labelAr: "عملة السداد", required: true, options: currencyOptions },
    { key: "website_competent_court", type: "text", labelAr: "المحكمة المختصة", required: true },
  ] },
  { key: "website_core_documents", titleAr: "الملفات الأساسية للمشروع", fields: [
    { key: "website_requirements_attachment", type: "attachment", labelAr: "ملف المتطلبات أو العرض الفني" },
    { key: "website_content_attachment", type: "attachment", labelAr: "المحتوى والهوية والملفات المقدمة من العميل" },
  ] },
  reviewStep("website_review"),
];

const socialSteps: WizardStepDefinition[] = [
  ...commonPartySteps("social", "مقدم الخدمة", "مقدم الخدمة"),
  { key: "social_project", titleAr: "بيانات خدمة إدارة الحسابات", fields: [
    { key: "social_project_name", type: "text", labelAr: "اسم المشروع أو النشاط التجاري", required: true },
    { key: "social_brand_name", type: "text", labelAr: "العلامة التجارية - إن وجدت" },
    { key: "social_business_nature", type: "text", labelAr: "طبيعة النشاط", required: true },
    { key: "social_target_market", type: "text", labelAr: "الدولة أو النطاق الجغرافي المستهدف", required: true },
    { key: "social_target_audience", type: "textarea", labelAr: "الفئة المستهدفة", required: true },
    { key: "social_project_brief", type: "textarea", labelAr: "نبذة مختصرة عن المشروع (اختياري)" },
    { key: "social_contact_email", type: "text", labelAr: "البريد الإلكتروني المعتمد للتواصل", required: true },
    { key: "social_project_manager", type: "text", labelAr: "المسؤول عن المشروع", required: true },
    { key: "social_approval_person", type: "text", labelAr: "المسؤول عن الاعتماد", required: true },
    { key: "social_billing_contact", type: "text", labelAr: "المسؤول عن الفواتير أو المدفوعات", required: true },
    { key: "social_contract_duration", type: "text", labelAr: "مدة العقد / تقديم الخدمات", required: true },
    { key: "social_fee", type: "money", labelAr: "المقابل المالي الإجمالي أو الدوري", required: true, validation: { min: 1 } },
    { key: "social_fee_nature", type: "select", labelAr: "طبيعة المقابل المالي", required: true, options: [
      { value: "monthly", labelAr: "شهري" },
      { value: "project", labelAr: "إجمالي للمشروع" },
      { value: "periodic", labelAr: "دوري وفق الخطة" },
    ] },
    { key: "social_competent_court", type: "text", labelAr: "المحكمة المختصة", required: true },
  ] },
  { key: "social_materials", titleAr: "مواد وحسابات العميل", fields: [
    { key: "social_account_access_attachment", type: "attachment", labelAr: "بيانات أو إثباتات ملكية الحسابات" },
    { key: "social_brand_assets_attachment", type: "attachment", labelAr: "الهوية والمحتوى والمواد التسويقية" },
  ] },
  reviewStep("social_review"),
];

function serviceCheckboxFields(prefix: string, services: Array<[string, string]>): WizardFieldDefinition[] {
  return services.map(([key, label]) => ({ key: `${prefix}_${key}`, type: "checkbox", labelAr: label }));
}

const visualScopeSteps: WizardStepDefinition[] = [
  { key: "visual_scope_project", titleAr: "بيانات مشروع ونطاق الهوية", fields: [
    { key: "visual_scope_activity", type: "text", labelAr: "طبيعة النشاط", required: true },
    { key: "visual_scope_special_requirements", type: "textarea", labelAr: "بيانات أو متطلبات خاصة بالمشروع", required: true },
    { key: "visual_scope_approver_name", type: "text", labelAr: "الشخص المعتمد لاعتماد الأعمال", required: true },
    { key: "visual_scope_approver_contact", type: "text", labelAr: "وسيلة التواصل المعتمدة معه", required: true },
    ...serviceCheckboxFields("visual_service", [
      ["new_logo", "تصميم شعار جديد"], ["develop_logo", "تطوير شعار قائم"], ["arabic_logo", "تصميم الشعار العربي"],
      ["english_logo", "تصميم الشعار الإنجليزي"], ["icon", "تصميم نسخة أيقونة"], ["colors", "اختيار الألوان الرسمية"],
      ["fonts", "اختيار الخطوط الرسمية"], ["patterns", "تصميم العناصر والأنماط البصرية"], ["icons", "تصميم الأيقونات"],
      ["guideline", "إعداد دليل الهوية البصرية"], ["business_card", "تصميم بطاقة أعمال"], ["letterhead", "تصميم ورق المراسلات"],
      ["envelope", "تصميم المظروف"], ["invoice", "تصميم الفاتورة"], ["email_signature", "تصميم توقيع البريد الإلكتروني"],
      ["social_files", "تصميم ملفات السوشيال ميديا"], ["social_covers", "تصميم أغلفة صفحات التواصل"],
      ["post_templates", "تصميم قوالب منشورات"], ["presentation", "تصميم عروض تقديمية"],
      ["print_files", "تصميم ملفات للطباعة"], ["digital_files", "تصميم ملفات رقمية"],
    ]),
    { key: "visual_service_other", type: "text", labelAr: "خدمات أخرى" },
  ] },
  { key: "visual_scope_outputs", titleAr: "المخرجات والمراجعات والتسليم", fields: [
    { key: "visual_outputs", type: "repeater", labelAr: "المخرجات المتفق عليها", required: true, minRows: 1, columns: [
      { key: "output", type: "text", labelAr: "المخرج", required: true },
      { key: "quantity", type: "number", labelAr: "الكمية", required: true },
      { key: "value", type: "money", labelAr: "القيمة - إن وجدت" },
    ] },
    { key: "visual_initial_concepts", type: "number", labelAr: "عدد المقترحات الأولية", required: true, validation: { min: 1 } },
    { key: "visual_included_review_rounds", type: "number", labelAr: "عدد جولات المراجعة المشمولة", required: true, validation: { min: 0 } },
    { key: "visual_approval_days", type: "number", labelAr: "مدة مراجعة واعتماد كل مرحلة بالأيام", required: true, validation: { min: 1 } },
    { key: "visual_delivery_formats", type: "text", labelAr: "صيغ الملفات النهائية", required: true },
    { key: "visual_source_files_included", type: "radio", labelAr: "هل تشمل المخرجات الملفات المصدرية القابلة للتعديل؟", required: true, options: yesNo },
    { key: "visual_schedule", type: "repeater", labelAr: "مراحل وجدول التنفيذ", required: true, minRows: 1, columns: [
      { key: "stage", type: "text", labelAr: "المرحلة", required: true },
      { key: "duration", type: "text", labelAr: "المدة", required: true },
      { key: "delivery_date", type: "date", labelAr: "موعد التسليم" },
    ] },
  ] },
];

const visualFinancialSteps: WizardStepDefinition[] = [
  { key: "visual_financial_terms", titleAr: "المقابل المالي وآلية السداد", fields: [
    { key: "visual_financial_total", type: "money", labelAr: "القيمة الإجمالية للمشروع", required: true, validation: { min: 1 } },
    { key: "visual_financial_currency", type: "select", labelAr: "العملة", required: true, options: currencyOptions },
    { key: "visual_financial_other_currency", type: "text", labelAr: "العملة الأخرى", required: true, visibleWhen: { fieldKey: "visual_financial_currency", operator: "equals", value: "other" } },
    { key: "visual_payment_schedule", type: "repeater", labelAr: "جدول الدفعات", required: true, minRows: 1, columns: [
      { key: "payment", type: "text", labelAr: "الدفعة", required: true },
      { key: "percentage", type: "number", labelAr: "النسبة %" },
      { key: "amount", type: "money", labelAr: "القيمة", required: true },
      { key: "due_date", type: "date", labelAr: "تاريخ الاستحقاق" },
      { key: "status", type: "select", labelAr: "حالة السداد", options: [
        { value: "not_due", labelAr: "لم تستحق" }, { value: "due", labelAr: "مستحقة" },
        { value: "paid", labelAr: "مسددة" }, { value: "late", labelAr: "متأخرة" },
      ] },
    ] },
    ...serviceCheckboxFields("visual_payment_method", [
      ["cash", "نقدًا"], ["bank", "تحويل بنكي"], ["instapay", "إنستاباي"], ["wallet", "محفظة إلكترونية"],
      ["card", "بطاقة دفع إلكتروني"], ["cheque", "شيك"],
    ]),
    { key: "visual_payment_method_other", type: "text", labelAr: "وسيلة سداد أخرى" },
    { key: "visual_start_conditions", type: "textarea", labelAr: "شروط بدء التنفيذ المحددة", required: true },
  ] },
];

const visualApprovalsSteps: WizardStepDefinition[] = [
  { key: "visual_approval_setup", titleAr: "بيانات الاعتماد وإدارة التنفيذ", fields: [
    { key: "visual_approval_annex_number", type: "text", labelAr: "رقم الملحق", required: true },
    { key: "visual_approval_version", type: "text", labelAr: "رقم الإصدار", required: true },
    { key: "visual_approval_date", type: "date", labelAr: "تاريخ تحرير الإصدار", required: true },
    { key: "visual_authorized_approver", type: "text", labelAr: "المسؤول المخول بالاعتماد", required: true },
    { key: "visual_authorized_capacity", type: "text", labelAr: "الصفة الوظيفية", required: true },
    { key: "visual_approval_channel", type: "select", labelAr: "وسيلة الاعتماد الرسمية", required: true, options: [
      { value: "email", labelAr: "البريد الإلكتروني المعتمد" },
      { value: "platform", labelAr: "المنصة الإلكترونية" },
      { value: "electronic_form", labelAr: "نموذج اعتماد إلكتروني" },
      { value: "other", labelAr: "أخرى" },
    ] },
    { key: "visual_approval_channel_other", type: "text", labelAr: "وسيلة الاعتماد الأخرى", required: true, visibleWhen: { fieldKey: "visual_approval_channel", operator: "equals", value: "other" } },
  ] },
  { key: "visual_approval_records", titleAr: "سجلات المراحل والمراجعات والتعديلات", fields: [
    { key: "visual_stage_approvals", type: "repeater", labelAr: "سجل اعتماد مراحل المشروع", columns: [
      { key: "stage_no", type: "number", labelAr: "رقم المرحلة" }, { key: "description", type: "text", labelAr: "وصف المرحلة", required: true },
      { key: "delivery_date", type: "date", labelAr: "تاريخ التسليم" }, { key: "approval_date", type: "date", labelAr: "تاريخ الاعتماد" },
      { key: "status", type: "select", labelAr: "الحالة", options: [
        { value: "approved", labelAr: "معتمدة" }, { value: "approved_with_notes", labelAr: "معتمدة مع ملاحظات" }, { value: "rejected", labelAr: "غير معتمدة" },
      ] },
    ] },
    { key: "visual_review_records", type: "repeater", labelAr: "سجل جولات المراجعة", columns: [
      { key: "round", type: "number", labelAr: "الجولة" }, { key: "notes", type: "text", labelAr: "الملاحظات", required: true },
      { key: "received_at", type: "date", labelAr: "تاريخ الاستلام" }, { key: "resolved_at", type: "date", labelAr: "تاريخ التنفيذ" },
    ] },
    { key: "visual_change_requests", type: "repeater", labelAr: "طلبات التعديل", columns: [
      { key: "request_no", type: "text", labelAr: "رقم الطلب" }, { key: "request", type: "text", labelAr: "وصف التعديل", required: true },
      { key: "impact", type: "text", labelAr: "أثره على الوقت/السعر" }, { key: "decision", type: "text", labelAr: "القرار" },
    ] },
  ] },
];

const websiteScopeSteps: WizardStepDefinition[] = [
  { key: "website_scope_overview", titleAr: "نطاق عمل الموقع", fields: [
    { key: "website_scope_description", type: "textarea", labelAr: "وصف مختصر للمشروع", required: true },
    { key: "website_scope_objectives", type: "textarea", labelAr: "أهداف المشروع", required: true },
    ...serviceCheckboxFields("website_work", [
      ["requirements", "تحليل المتطلبات"], ["ui", "تصميم واجهات المستخدم UI"], ["ux", "تجربة المستخدم UX"],
      ["brand", "تصميم الهوية البصرية للموقع"], ["frontend", "برمجة الواجهة الأمامية"], ["backend", "برمجة الواجهة الخلفية"],
      ["database", "إنشاء قاعدة البيانات"], ["admin_dashboard", "لوحة تحكم الإدارة"], ["user_dashboard", "لوحة تحكم المستخدم"],
      ["registration", "تسجيل المستخدمين"], ["login", "تسجيل الدخول"], ["password_reset", "استعادة كلمة المرور"],
      ["permissions", "إدارة الصلاحيات"], ["search", "البحث"], ["notifications", "الإشعارات"], ["messages", "الرسائل"],
      ["uploads", "رفع الملفات"], ["reports", "التقارير"], ["analytics", "لوحة الإحصائيات"], ["payment", "نظام الدفع"],
      ["integrations", "التكامل مع خدمات خارجية"],
    ]),
    { key: "website_scope_other_work", type: "text", labelAr: "أعمال أخرى" },
  ] },
  { key: "website_scope_deliverables", titleAr: "المخرجات والوظائف والصفحات", fields: [
    { key: "website_deliverables", type: "repeater", labelAr: "المخرجات", required: true, minRows: 1, columns: [
      { key: "deliverable", type: "text", labelAr: "المخرج", required: true },
      { key: "included", type: "select", labelAr: "مشمول", required: true, options: yesNo },
      { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_main_functions", type: "repeater", labelAr: "الوظائف الرئيسية", required: true, minRows: 1, columns: [
      { key: "function", type: "text", labelAr: "الوظيفة", required: true }, { key: "acceptance", type: "text", labelAr: "معيار القبول" },
    ] },
    { key: "website_pages", type: "repeater", labelAr: "صفحات الموقع", required: true, minRows: 1, columns: [
      { key: "page_no", type: "number", labelAr: "م" }, { key: "page_name", type: "text", labelAr: "اسم الصفحة", required: true },
      { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_training_included", type: "radio", labelAr: "هل يشمل المشروع تدريبًا؟", required: true, options: yesNo },
    { key: "website_training_details", type: "textarea", labelAr: "تفاصيل التدريب", required: true, visibleWhen: { fieldKey: "website_training_included", operator: "equals", value: "yes" } },
  ] },
];

const websiteTechnicalSteps: WizardStepDefinition[] = [
  { key: "website_technical_architecture", titleAr: "البنية والتقنيات", fields: [
    { key: "website_architecture", type: "select", labelAr: "نوع البنية", required: true, options: [
      { value: "monolithic", labelAr: "Monolithic" }, { value: "modular", labelAr: "Modular" },
      { value: "microservices", labelAr: "Microservices" }, { value: "serverless", labelAr: "Serverless" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "website_architecture_other", type: "text", labelAr: "البنية الأخرى", required: true, visibleWhen: { fieldKey: "website_architecture", operator: "equals", value: "other" } },
    { key: "website_programming_languages", type: "text", labelAr: "لغات البرمجة", required: true },
    { key: "website_backend_framework", type: "text", labelAr: "إطار العمل الخلفي", required: true },
    { key: "website_frontend_stack", type: "text", labelAr: "تقنيات الواجهة الأمامية", required: true },
    { key: "website_database", type: "text", labelAr: "قاعدة البيانات", required: true },
    { key: "website_file_storage", type: "text", labelAr: "إدارة الملفات", required: true },
    { key: "website_integrations", type: "repeater", labelAr: "التكاملات الخارجية", columns: [
      { key: "service", type: "text", labelAr: "الخدمة", required: true }, { key: "purpose", type: "text", labelAr: "الغرض", required: true },
      { key: "provider", type: "text", labelAr: "المزود" },
    ] },
  ] },
  { key: "website_technical_operations", titleAr: "الاستضافة والأمان والأداء", fields: [
    { key: "website_hosting_included", type: "radio", labelAr: "هل يشمل العقد الاستضافة؟", required: true, options: yesNo },
    { key: "website_hosting_provider", type: "text", labelAr: "مزود الاستضافة", required: true, visibleWhen: { fieldKey: "website_hosting_included", operator: "equals", value: "yes" } },
    { key: "website_server_type", type: "text", labelAr: "نوع الخادم", visibleWhen: { fieldKey: "website_hosting_included", operator: "equals", value: "yes" } },
    { key: "website_security_requirements", type: "textarea", labelAr: "متطلبات الأمان", required: true },
    { key: "website_performance_requirements", type: "textarea", labelAr: "متطلبات الأداء", required: true },
    { key: "website_supported_browsers", type: "text", labelAr: "المتصفحات والأجهزة المدعومة", required: true },
    { key: "website_backup_policy", type: "textarea", labelAr: "سياسة النسخ الاحتياطي", required: true },
  ] },
];

const websiteProjectDataSteps: WizardStepDefinition[] = [
  { key: "website_project_data", titleAr: "بيانات المشروع والتنفيذ", fields: [
    { key: "website_target_countries", type: "text", labelAr: "الدولة أو الدول المستهدفة", required: true },
    { key: "website_languages", type: "text", labelAr: "لغة أو لغات المشروع", required: true },
    { key: "website_operating_currency", type: "text", labelAr: "العملة المستخدمة", required: true },
    { key: "website_timezone", type: "text", labelAr: "المنطقة الزمنية", required: true },
    { key: "website_domain_name", type: "text", labelAr: "اسم النطاق - إن وجد" },
    { key: "website_project_notes", type: "textarea", labelAr: "ملاحظات" },
  ] },
  { key: "website_assets_accounts", titleAr: "البيانات والملفات والحسابات", fields: [
    { key: "website_assets", type: "repeater", labelAr: "البيانات والملفات المطلوب توفيرها", columns: [
      { key: "item", type: "text", labelAr: "العنصر", required: true },
      { key: "status", type: "select", labelAr: "الحالة", required: true, options: [
        { value: "delivered", labelAr: "تم التسليم" }, { value: "later", labelAr: "سيتم التسليم لاحقًا" }, { value: "not_required", labelAr: "غير مطلوب" },
      ] },
      { key: "delivery_date", type: "date", labelAr: "تاريخ التسليم" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_accounts", type: "repeater", labelAr: "الحسابات الرقمية وبيانات الوصول", columns: [
      { key: "account", type: "text", labelAr: "الحساب / الخدمة", required: true }, { key: "owner", type: "text", labelAr: "المالك" },
      { key: "access_method", type: "text", labelAr: "طريقة منح الوصول" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
  ] },
];

const websiteDeliverySteps: WizardStepDefinition[] = [
  { key: "website_delivery_data", titleAr: "بيانات التسليم النهائي", fields: [
    { key: "website_contract_date", type: "date", labelAr: "تاريخ العقد الأصلي", required: true },
    { key: "website_delivery_record_number", type: "text", labelAr: "رقم محضر التسليم", required: true },
    { key: "website_release_version", type: "text", labelAr: "رقم إصدار المشروع", required: true },
    { key: "website_execution_start", type: "date", labelAr: "تاريخ بدء التنفيذ", required: true },
    { key: "website_actual_completion", type: "date", labelAr: "تاريخ الانتهاء الفعلي", required: true },
    { key: "website_delivery_date", type: "date", labelAr: "تاريخ التسليم", required: true },
    { key: "website_delivery_environment", type: "select", labelAr: "بيئة التسليم", required: true, options: [
      { value: "production", labelAr: "بيئة الإنتاج" }, { value: "staging", labelAr: "بيئة الاختبار" }, { value: "other", labelAr: "بيئة أخرى" },
    ] },
    { key: "website_delivery_environment_other", type: "text", labelAr: "البيئة الأخرى", required: true, visibleWhen: { fieldKey: "website_delivery_environment", operator: "equals", value: "other" } },
  ] },
  { key: "website_delivery_items", titleAr: "العناصر والاختبارات والاعتماد", fields: [
    { key: "website_delivered_items", type: "repeater", labelAr: "الأعمال محل التسليم", required: true, minRows: 1, columns: [
      { key: "item", type: "text", labelAr: "العنصر", required: true },
      { key: "status", type: "select", labelAr: "الحالة", required: true, options: [
        { value: "delivered", labelAr: "تم التسليم" }, { value: "partial", labelAr: "تسليم جزئي" }, { value: "not_included", labelAr: "غير مشمول" },
      ] },
      { key: "date", type: "date", labelAr: "تاريخ التسليم" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_test_results", type: "repeater", labelAr: "نتائج الاختبارات الفنية", columns: [
      { key: "test", type: "text", labelAr: "الاختبار", required: true }, { key: "result", type: "select", labelAr: "النتيجة", options: [
        { value: "passed", labelAr: "ناجح" }, { value: "passed_with_notes", labelAr: "ناجح مع ملاحظات" }, { value: "failed", labelAr: "غير ناجح" },
      ] }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_acceptance_status", type: "select", labelAr: "حالة الاعتماد النهائي", required: true, options: [
      { value: "accepted", labelAr: "معتمد نهائيًا" }, { value: "accepted_with_notes", labelAr: "معتمد مع ملاحظات" }, { value: "not_accepted", labelAr: "غير معتمد" },
    ] },
    { key: "website_acceptance_notes", type: "textarea", labelAr: "الملاحظات أو التحفظات" },
    { key: "website_warranty_start", type: "date", labelAr: "تاريخ بدء الضمان", required: true },
  ] },
];

const websiteSlaSteps: WizardStepDefinition[] = [
  { key: "website_sla_scope", titleAr: "نطاق الصيانة والدعم", fields: [
    { key: "website_sla_start_mode", type: "select", labelAr: "موعد بدء خدمات الصيانة", required: true, options: [
      { value: "after_warranty", labelAr: "بعد انتهاء الضمان" }, { value: "specific_date", labelAr: "من تاريخ محدد" }, { value: "parallel", labelAr: "بالتوازي مع الضمان" },
    ] },
    { key: "website_sla_start_date", type: "date", labelAr: "تاريخ بدء الصيانة", required: true, visibleWhen: { fieldKey: "website_sla_start_mode", operator: "equals", value: "specific_date" } },
    ...serviceCheckboxFields("website_sla_service", [
      ["bug_fix", "إصلاح العيوب غير المشمولة بالضمان"], ["security", "تحديثات الأمان"], ["framework", "تحديث إطار العمل"],
      ["libraries", "تحديث المكتبات"], ["cms", "تحديث نظام إدارة المحتوى"], ["performance", "تحسينات الأداء"],
      ["monitoring", "مراقبة التشغيل"], ["backup", "النسخ الاحتياطي"], ["restore", "استعادة النسخ"],
      ["user_support", "الدعم الفني للمستخدمين"], ["consulting", "الاستشارات الفنية"],
    ]),
    { key: "website_sla_other_services", type: "text", labelAr: "خدمات صيانة أخرى" },
    { key: "website_sla_work_days", type: "text", labelAr: "أيام العمل", required: true },
    { key: "website_sla_work_hours", type: "text", labelAr: "ساعات العمل", required: true },
    { key: "website_sla_channels", type: "text", labelAr: "قنوات استقبال البلاغات", required: true },
  ] },
  { key: "website_sla_levels", titleAr: "مستويات الخدمة والمقابل المالي", fields: [
    { key: "website_sla_levels", type: "repeater", labelAr: "مستويات الاستجابة والمعالجة", required: true, minRows: 1, columns: [
      { key: "severity", type: "text", labelAr: "التصنيف", required: true }, { key: "response_time", type: "text", labelAr: "زمن الاستجابة", required: true },
      { key: "target_resolution", type: "text", labelAr: "المدة المستهدفة للمعالجة" }, { key: "notes", type: "text", labelAr: "ملاحظات" },
    ] },
    { key: "website_sla_support_balance", type: "text", labelAr: "رصيد الدعم الفني", required: true },
    { key: "website_sla_fee", type: "money", labelAr: "مقابل الصيانة والدعم", required: true, validation: { min: 0 } },
    { key: "website_sla_payment_frequency", type: "select", labelAr: "دورية السداد", required: true, options: [
      { value: "monthly", labelAr: "شهري" }, { value: "quarterly", labelAr: "ربع سنوي" }, { value: "annual", labelAr: "سنوي" }, { value: "other", labelAr: "أخرى" },
    ] },
    { key: "website_sla_duration", type: "text", labelAr: "مدة الملحق وتجديده", required: true },
    { key: "website_backup_details", type: "textarea", labelAr: "تفاصيل النسخ الاحتياطي والاستعادة", required: true },
  ] },
];

const websiteFutureSteps: WizardStepDefinition[] = [
  { key: "website_future_request", titleAr: "طلب تطوير أو عمل إضافي", fields: [
    { key: "website_future_request_description", type: "textarea", labelAr: "وصف التطوير المطلوب", required: true },
    { key: "website_future_purpose", type: "textarea", labelAr: "الغرض من التطوير", required: true },
    { key: "website_future_priority", type: "select", labelAr: "الأولوية", required: true, options: [
      { value: "low", labelAr: "منخفضة" }, { value: "medium", labelAr: "متوسطة" }, { value: "high", labelAr: "عالية" }, { value: "urgent", labelAr: "عاجلة" },
    ] },
    { key: "website_future_requested_date", type: "date", labelAr: "الموعد المطلوب للتسليم" },
    { key: "website_future_requirements", type: "attachment", labelAr: "المتطلبات والملفات اللازمة للدراسة" },
    { key: "website_future_feasibility", type: "textarea", labelAr: "نتيجة الدراسة الفنية", required: true },
    { key: "website_future_price", type: "money", labelAr: "المقابل المالي الإضافي", required: true, validation: { min: 0 } },
    { key: "website_future_duration", type: "text", labelAr: "مدة التنفيذ الإضافية", required: true },
    { key: "website_future_approved", type: "radio", labelAr: "هل تم اعتماد طلب التطوير؟", required: true, options: yesNo },
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
    applicableVariantKeys: [input.variant],
    insertedSteps: input.steps,
    insertBeforeStepKey: `${input.variant === "visual_identity_design" ? "visual" : input.variant === "website_development" ? "website" : "social"}_review`,
    legalClauseKeys: [...freelanceSourceClauseKeysByAnnex[input.key as keyof typeof freelanceSourceClauseKeysByAnnex]],
  };
}

const optionalClauses: OptionalClauseDefinition[] = [
  optionalClause({ key: "visual_identity_scope_annex", nameAr: "ملحق نطاق العمل والمخرجات الفنية", description: "تحديد الخدمات والمخرجات والمراجعات وجدول التنفيذ.", title: "ملحق نطاق العمل والمخرجات الفنية", source: "ملحق رقم (1).pdf", variant: "visual_identity_design", steps: visualScopeSteps }),
  optionalClause({ key: "visual_identity_financial_annex", nameAr: "ملحق المقابل المالي وخطة التنفيذ", description: "القيمة والدفعات ووسائل السداد وشروط بدء التنفيذ.", title: "ملحق المقابل المالي وآلية السداد وخطة التنفيذ", source: "ملحق المقابل المالي وآلية السداد وخطة التنفيذ.pdf", variant: "visual_identity_design", steps: visualFinancialSteps }),
  optionalClause({ key: "visual_identity_approvals_annex", nameAr: "ملحق الاعتمادات وإدارة التنفيذ", description: "سجل المراحل والمراجعات والتعديلات والتسليم.", title: "ملحق الاعتمادات وإدارة التنفيذ", source: "الملحق رقم (3).pdf", variant: "visual_identity_design", steps: visualApprovalsSteps }),
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
    requiredClauseKeys: [...freelanceSourceClauseKeysByVariant.visual_identity_design],
    allowedOptionalClauseKeys: ["visual_identity_scope_annex", "visual_identity_financial_annex", "visual_identity_approvals_annex"],
    defaultFieldValues: { visual_client_party_type: "individual", visual_provider_party_type: "individual", visual_client_nationality: "مصري", visual_provider_nationality: "مصري", visual_review_rounds: 2 },
  },
  {
    key: "website_development",
    nameAr: "عقد تطوير موقع إلكتروني",
    description: "تنظيم تطوير المواقع والمنصات والأنظمة وملحقاتها الفنية والتنفيذية.",
    documentTitleAr: "عقد تطوير موقع إلكتروني",
    sourceDocumentName: "عقد برمجة ويب سيت.pdf",
    steps: websiteSteps,
    requiredClauseKeys: [...freelanceSourceClauseKeysByVariant.website_development],
    allowedOptionalClauseKeys: ["website_scope_annex", "website_technical_annex", "website_project_data_annex", "website_delivery_annex", "website_sla_annex", "website_future_development_annex"],
    defaultFieldValues: { website_client_party_type: "individual", website_provider_party_type: "individual", website_client_nationality: "مصري", website_provider_nationality: "مصري", website_payment_currency: "egp" },
  },
  {
    key: "social_media_management",
    nameAr: "عقد إدارة حسابات ومنصات التواصل الاجتماعي",
    description: "تنظيم إدارة الحسابات والمحتوى والحملات والتقارير والمقابل المالي.",
    documentTitleAr: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي",
    sourceDocumentName: "عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf",
    steps: socialSteps,
    requiredClauseKeys: [...freelanceSourceClauseKeysByVariant.social_media_management],
    allowedOptionalClauseKeys: ["social_media_scope_annex", "social_media_financial_annex"],
    defaultFieldValues: { social_client_party_type: "individual", social_provider_party_type: "individual", social_client_nationality: "مصري", social_provider_nationality: "مصري", social_fee_nature: "monthly" },
  },
];

export const freelancerTemplateDefinition: ContractTemplateDefinition = {
  slug: "freelancer",
  version: 2,
  nameAr: "عقود الخدمات والعمل الحر",
  description: "عقود الهوية البصرية وتطوير المواقع وإدارة منصات التواصل مع ملاحق مستقلة قابلة للاختيار.",
  priceEgp: 59,
  variants,
  optionalClauses,
  legalClauses: freelanceSourceLegalClauses,
};
