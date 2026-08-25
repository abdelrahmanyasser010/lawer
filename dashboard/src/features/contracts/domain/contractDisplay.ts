import type {
  ContractFieldValue,
  FieldOptionDefinition,
  WizardFieldDefinition,
} from "./contractTemplate.types";

const fallbackValueLabels: Record<string, string> = {
  individual: "فرد",
  company: "شركة / منشأة",
  independent: "عداد مستقل",
  shared: "عداد مشترك",
  full: "سداد كامل القيمة عند توقيع العقد",
  cash_full: "سداد نقدي كامل",
  installments: "سداد على أقساط وفق جدول الدفعات",
  cash_receipt: "نقدًا بموجب إيصال مخالصة",
  cash: "نقدًا مع إيصال مخالصة",
  bank_transfer: "تحويل بنكي معتمد",
  bank_deposit: "إيداع بالحساب البنكي",
  electronic_wallet: "محفظة إلكترونية",
  instapay: "إنستاباي (InstaPay)",
  residential: "سكني",
  commercial: "تجاري / إداري",
  residential_lease: "إيجار سكني",
  commercial_lease: "إيجار تجاري",
  administrative_lease: "إيجار إداري",
  preliminary_sale: "بيع ابتدائي",
  registrable_sale: "بيع قابل للتسجيل بالشهر العقاري",
  inherited_sale: "بيع وحدة آلت بالميراث",
  visual_identity_design: "تصميم الهوية البصرية",
  website_development: "تطوير موقع إلكتروني",
  social_media_management: "إدارة منصات التواصل الاجتماعي",
  amount: "مبلغ مالي ثابت",
  percentage: "نسبة مئوية",
  registered: "مسجل بالشهر العقاري",
  unregistered: "غير مسجل",
  registered_contract: "عقد مسجل",
  sole_heir: "وارث منفرد",
  power_of_attorney: "توكيل",
  inventory_report: "محضر جرد",
  corporate: "موقع تعريفي",
  ecommerce: "متجر إلكتروني",
  platform: "منصة إلكترونية",
  web_app: "نظام ويب (Web Application)",
  landing_page: "صفحة هبوط (Landing Page)",
  yes: "نعم",
  no: "لا",
  true: "نعم / مشمول",
  false: "غير مشمول",
};

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function formatCollection(value: unknown[]): string {
  return value
    .map((item) => {
      if (item && typeof item === "object") {
        return Object.values(item)
          .filter((entry) => !isEmpty(entry))
          .map(String)
          .join(" — ");
      }
      return String(item ?? "").trim();
    })
    .filter(Boolean)
    .join("، ");
}

export function formatContractFieldValue(
  key: string,
  value: unknown,
  options: FieldOptionDefinition[] = [],
  type?: WizardFieldDefinition["type"] | string,
): string {
  if (isEmpty(value)) return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) return formatCollection(value);

  const raw = String(value).trim();
  const option = options.find((item) => String(item.value) === raw);
  if (option) return option.labelAr;
  if (fallbackValueLabels[raw]) return fallbackValueLabels[raw];

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.split("-").reverse().join("/");
  }

  const isMoney = type === "money" || (
    /(price|amount|deposit|fee|salary|compensation|rent)/.test(key) &&
    !/(words|mode|payer|bearer|nature|method|type)/.test(key)
  );
  if (isMoney) {
    const amount = Number(value);
    if (!Number.isNaN(amount)) return `${amount.toLocaleString("ar-EG")} ج.م`;
  }

  if (/(area|sqm)/.test(key) && !Number.isNaN(Number(value))) {
    return `${Number(value).toLocaleString("ar-EG")} متر مربع`;
  }

  // A select/radio value must always be backed by its schema. Never expose a
  // raw implementation enum to the customer when metadata is available.
  if (options.length > 0 && /^[a-z][a-z0-9_]*$/i.test(raw)) {
    return "قيمة غير معتمدة — يرجى إعادة الاختيار";
  }

  return raw;
}


export function resolveWizardFieldLabel(
  field: WizardFieldDefinition,
  fieldValues: Record<string, ContractFieldValue | unknown>,
): string {
  if (!field.key.endsWith("_national_id")) return field.labelAr;

  const typeKey = field.key.replace(/_national_id$/, "_identity_document_type");
  const selectedType = String(fieldValues[typeKey] ?? "").trim();
  if (selectedType === "passport") return "رقم جواز السفر";
  if (selectedType === "national_id") return "الرقم القومي";

  // Backward compatibility for drafts created before the explicit identity-document selector.
  const nationalityKey = field.key.replace(/_national_id$/, "_nationality");
  const nationality = String(fieldValues[nationalityKey] ?? "").trim().toLowerCase();
  if (["مصري", "مصرية", "مصري الجنسية", "egyptian"].includes(nationality)) return "الرقم القومي";
  if (nationality) return "رقم جواز السفر";

  return "رقم مستند إثبات الهوية";
}

export function formatWizardFieldValue(
  field: WizardFieldDefinition,
  value: ContractFieldValue | undefined,
  fieldValues: Record<string, ContractFieldValue>,
): string {
  if (value === "أخرى" || value === "other") {
    const directOther = fieldValues[`${field.key}_other`];
    const payerOther = field.key.endsWith("_payer")
      ? fieldValues[`${field.key.slice(0, -"_payer".length)}_other`]
      : undefined;
    const otherValue = !isEmpty(directOther) ? directOther : payerOther;
    if (!isEmpty(otherValue)) return String(otherValue);
  }
  return formatContractFieldValue(field.key, value, field.options ?? [], field.type);
}

