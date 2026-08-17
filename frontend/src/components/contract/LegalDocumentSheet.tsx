"use client";

import React, { useMemo } from "react";
import { ShieldCheck, FileCheck } from "lucide-react";
import { localTemplateRegistry, renderLegalClauses, RenderedLegalClause } from "@zdraft/template-engine";

interface Props {
  serialNumber: string;
  templateSlug?: string | null;
  templateNameAr?: string | null;
  variantKey?: string | null;
  selectedOptionalClauseKeys?: string[] | null;
  fieldValues?: Record<string, any>;
  status?: string;
  isPaid?: boolean;
}

export const legalLabelDictionary: Record<string, string> = {
  // Parties
  sale_seller_name: "البائع (الطرف الأول)",
  sale_seller_party_type: "الصفة القانونية للبائع",
  sale_seller_national_id: "الرقم القومي للبائع",
  sale_seller_address: "محل إقامة البائع",
  sale_seller_phone: "هاتف البائع",
  sale_seller_email: "بريد البائع",
  sale_buyer_name: "المشتري (الطرف الثاني)",
  sale_buyer_party_type: "الصفة القانونية للمشتري",
  sale_buyer_national_id: "الرقم القومي للمشتري",
  sale_buyer_address: "محل إقامة المشتري",
  sale_buyer_phone: "هاتف المشتري",
  sale_buyer_email: "بريد المشتري",

  landlord_name: "المؤجر (الطرف الأول)",
  landlord_party_type: "الصفة القانونية للمؤجر",
  landlord_national_id: "الرقم القومي للمؤجر",
  landlord_nationality: "جنسية المؤجر",
  landlord_address: "محل إقامة المؤجر",
  landlord_phone: "هاتف المؤجر",
  landlord_email: "بريد المؤجر",
  tenant_name: "المستأجر (الطرف الثاني)",
  tenant_party_type: "الصفة ",
  client_name: "العميل (الطرف الأول)",
  provider_name: "مقدم الخدمة (الطرف الثاني)",

  // Freelancer Parties
  visual_client_name: "العميل (الطرف الأول)",
  visual_client_nationality: "جنسية العميل",
  visual_client_national_id: "الرقم القومي للعميل",
  visual_client_address: "محل إقامة العميل",
  visual_client_phone: "هاتف العميل",
  visual_client_email: "بريد العميل",
  visual_provider_name: "المصمم (الطرف الثاني)",
  visual_provider_nationality: "جنسية المصمم",
  visual_provider_national_id: "الرقم القومي للمصمم",
  visual_provider_address: "محل إقامة المصمم",
  visual_provider_phone: "هاتف المصمم",
  visual_provider_email: "بريد المصمم",

  website_client_name: "العميل (الطرف الأول)",
  website_client_nationality: "جنسية العميل",
  website_client_national_id: "الرقم القومي للعميل",
  website_client_address: "محل إقامة العميل",
  website_client_phone: "هاتف العميل",
  website_client_email: "بريد العميل",
  website_provider_name: "المطور (الطرف الثاني)",
  website_provider_nationality: "جنسية المطور",
  website_provider_national_id: "الرقم القومي للمطور",
  website_provider_address: "محل إقامة المطور",
  website_provider_phone: "هاتف المطور",
  website_provider_email: "بريد المطور",

  social_client_name: "العميل (الطرف الأول)",
  social_client_nationality: "جنسية العميل",
  social_client_national_id: "الرقم القومي للعميل",
  social_client_address: "محل إقامة العميل",
  social_client_phone: "هاتف العميل",
  social_client_email: "بريد العميل",
  social_provider_name: "مقدم الخدمة (الطرف الثاني)",
  social_provider_nationality: "جنسية مقدم الخدمة",
  social_provider_national_id: "الرقم القومي لمقدم الخدمة",
  social_provider_address: "محل إقامة مقدم الخدمة",
  social_provider_phone: "هاتف مقدم الخدمة",
  social_provider_email: "بريد مقدم الخدمة",

  // Freelancer Projects & Finance
  visual_project_name: "اسم المشروع / العلامة",
  visual_project_brief: "نبذة عن المشروع",
  visual_execution_duration: "مدة التنفيذ",
  visual_contract_value: "المقابل المالي المتفق عليه",
  visual_contract_value_words: "المقابل المالي كتابةً",
  visual_competent_court: "المحكمة المختصة",

  website_project_name: "اسم المشروع",
  website_project_type: "نوع المشروع",
  website_total_price: "المقابل المالي الإجمالي",
  website_total_price_words: "المقابل المالي كتابةً",
  website_confidentiality_years: "مدة استمرار السرية (بالسنوات)",
  website_competent_court: "المحكمة المختصة",

  social_project_name: "اسم المشروع / النشاط",
  social_brand_name: "العلامة التجارية",
  social_business_nature: "طبيعة النشاط",
  social_target_market: "النطاق الجغرافي المستهدف",
  social_target_audience: "الفئة المستهدفة",
  social_managed_platforms: "المنصات والحسابات المشمولة",
  social_scope_summary: "الخدمات والمخرجات المتفق عليها",
  social_contract_duration: "مدة تقديم الخدمات",
  social_fee: "المقابل المالي المتفق عليه",
  social_fee_words: "المقابل المالي كتابةً",
  social_fee_nature: "طبيعة المقابل المالي",
  social_delay_penalty_mode: "طريقة احتساب الجزاء",
  social_delay_penalty_amount: "قيمة الجزاء اليومي",
  social_delay_penalty_percentage: "نسبة الجزاء اليومي (%)",
  social_delay_penalty_cap_percentage: "الحد الأقصى للجزاء (%)",
  social_competent_court: "المحكمة المختصة",

  // Real Estate & Subject
  sale_unit_governorate: "محافظة الوحدة المبيعة",
  sale_unit_city: "مدينة / حي الوحدة المبيعة",
  sale_unit_street: "عنوان الوحدة المبيعة",
  sale_unit_building_number: "رقم العقار",
  sale_unit_floor: "الطابق",
  sale_unit_area_sqm: "مساحة الوحدة (م²)",
  property_governorate: "محافظة العين المؤجرة",
  property_city: "المدينة / المركز",
  property_district: "الحي / المنطقة",
  property_street: "اسم الشارع",
  building_number: "رقم العقار / المبنى",
  floor_number: "الدور",
  unit_number: "رقم الوحدة",
  property_area: "المساحة الإجمالية (م²)",
  residential_property_type: "نوع العين السكنية",
  commercial_unit_type: "نوع الوحدة التجارية",
  commercial_activity_name: "اسم النشاط التجاري",
  commercial_activity_type: "نوع النشاط التجاري",
  rooms_count: "عدد الغرف",
  reception_count: "صالات الاستقبال",
  bathrooms_count: "عدد الحمامات",
  balconies_count: "عدد البلكونات",
  residential_finishing_level: "مستوى التشطيب",
  residential_use_purpose: "الغرض من الإيجار",

  // Meters
  electricity_meter: "رقم عداد الكهرباء",
  electricity_meter_type: "نوع عداد الكهرباء",
  water_meter: "رقم عداد المياه",
  water_meter_type: "نوع عداد المياه",
  gas_meter: "رقم عداد الغاز",
  gas_meter_type: "نوع عداد الغاز",

  // Financials & Terms
  contract_date: "تاريخ تحرير العقد",
  contract_copies_count: "عدد النسخ الأصلية",
  lease_duration_text: "مدة العقد",
  start_date: "تاريخ بداية الإيجار",
  end_date: "تاريخ انتهاء الإيجار",
  property_delivery_date: "تاريخ تسليم العين",
  rent_amount: "القيمة الإيجارية",
  rent_amount_words: "القيمة الإيجارية كتابةً",
  rent_period: "دورية السداد",
  rent_due_day: "أقصى يوم للسداد",
  deposit_amount: "مبلغ التأمين",
  deposit_amount_words: "مبلغ التأمين كتابةً",
  holdover_daily_compensation: "تعويض التأخير اليومي",
  rental_jurisdiction_court: "المحكمة المختصة",
  sale_jurisdiction_court: "المحكمة المختصة",
  sale_total_price: "الثمن الإجمالي المتفق عليه",
  sale_payment_plan: "آلية سداد الثمن",
  sale_deposit_amount: "مقدم التعاقد",
};

export const legalValueDictionary: Record<string, string> = {
  individual: "فرد",
  company: "شركة / منشأة",
  independent: "عداد مستقل",
  shared: "عداد مشترك",
  full: "سداد كامل القيمة عند توقيع هذا العقد",
  installments: "سداد على أقساط محددة وفق جدول الدفعات",
  cash_receipt: "نقدًا بموجب إيصال مخالصة",
  cash: "نقدًا مع إيصال مخالصة",
  bank_transfer: "تحويل بنكي معتمد",
  bank_deposit: "إيداع بالحساب البنكي",
  electronic_wallet: "محفظة إلكترونية",
  instapay: "إنستاباي (InstaPay)",
  other: "وسيلة أخرى متفق عليها كتابةً",
  residential: "سكني",
  commercial: "تجاري / إداري",
  residential_lease: "إيجار سكني",
  commercial_lease: "إيجار تجاري",
  administrative_lease: "إيجار إداري",
  preliminary_sale: "بيع ابتدائي",
  final_sale: "بيع نهائي",
  visual_identity_design: "تصميم الهوية البصرية",
  website_development: "تصميم وتطوير المواقع",
  social_media_management: "إدارة منصات التواصل",
  amount: "مبلغ مالي ثابت",
  percentage: "نسبة مئوية",
  true: "نعم / مشمول",
  false: "غير مشمول",
  yes: "نعم",
  no: "لا",
};

export function formatLegalValue(key: string, value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "مشمول بالاتفاق" : "غير مشمول";

  const strVal = String(value).trim();
  if (legalValueDictionary[strVal]) {
    return legalValueDictionary[strVal];
  }

  if (
    key.includes("price") ||
    key.includes("amount") ||
    key.includes("deposit") ||
    key.includes("fee") ||
    key.includes("salary") ||
    key.includes("compensation") ||
    key.includes("value")
  ) {
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) {
      return `${num.toLocaleString("ar-EG")} ج.م`;
    }
  }

  if (key.includes("area") || key.includes("sqm")) {
    return `${value} متر مربع`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
    return strVal.split("-").reverse().join("/");
  }

  return strVal;
}

export default function LegalDocumentSheet({
  serialNumber,
  templateSlug,
  templateNameAr,
  variantKey,
  selectedOptionalClauseKeys = [],
  fieldValues = {},
  status,
}: Props) {
  const missingPreviewValue = "....................";

  const effectiveSlug =
    templateSlug ||
    (fieldValues.landlord_name || fieldValues.property_city ? "rental" : fieldValues.sale_seller_name || fieldValues.sale_unit_city ? "apartment_sale" : "freelancer");

  const templateDef = useMemo(() => {
    return (
      localTemplateRegistry[effectiveSlug] ||
      localTemplateRegistry.rental ||
      localTemplateRegistry.freelancer
    );
  }, [effectiveSlug]);

  const effectiveVariantKey = useMemo(() => {
    if (variantKey && templateDef.variants.some((v) => v.key === variantKey)) {
      return variantKey;
    }
    if (effectiveSlug === "rental") {
      return "residential_lease";
    }
    if (effectiveSlug === "apartment_sale") {
      return fieldValues.sale_payment_plan === "installments" ? "preliminary_sale" : "final_sale";
    }
    return templateDef.variants[0]?.key || "visual_identity_design";
  }, [variantKey, effectiveSlug, fieldValues, templateDef]);

  const isRental = effectiveSlug === "rental";
  const isSale = effectiveSlug === "apartment_sale";
  const isFreelancer = effectiveSlug === "freelancer";

  // ─── Party 1 (Landlord / Seller / Client) ──────────────────────────────────
  const isPartyOneCompany = (fieldValues.landlord_party_type || fieldValues.sale_seller_party_type || fieldValues.client_party_type || fieldValues.visual_client_party_type || fieldValues.website_client_party_type || fieldValues.social_client_party_type) === "company";
  const p1Name = isPartyOneCompany
    ? (fieldValues.landlord_company_name || fieldValues.sale_seller_company_name || fieldValues.client_company_name || fieldValues.visual_client_company_name || fieldValues.website_client_company_name || fieldValues.social_client_company_name || "الشركة (الطرف الأول)")
    : (fieldValues.landlord_name || fieldValues.sale_seller_name || fieldValues.client_name || fieldValues.visual_client_name || fieldValues.website_client_name || fieldValues.social_client_name || "الطرف الأول");
  const p1Nationality = fieldValues.landlord_nationality || fieldValues.sale_seller_nationality || fieldValues.client_nationality || fieldValues.visual_client_nationality || fieldValues.website_client_nationality || fieldValues.social_client_nationality || missingPreviewValue;
  const isP1NonEgyptian = p1Nationality !== "مصري" && p1Nationality !== "مصري الجنسية" && p1Nationality !== "egyptian" && p1Nationality !== "مصرية" && p1Nationality !== missingPreviewValue;
  const p1NationalId = fieldValues.landlord_national_id || fieldValues.sale_seller_national_id || fieldValues.client_national_id || fieldValues.visual_client_national_id || fieldValues.website_client_national_id || fieldValues.social_client_national_id || "";
  const p1IdIssuer = fieldValues.landlord_id_issuer || fieldValues.sale_seller_id_issuer || fieldValues.visual_client_id_issuer || fieldValues.website_client_id_issuer || fieldValues.social_client_id_issuer || "";
  const p1IdIssueDate = fieldValues.landlord_id_issue_date || fieldValues.visual_client_id_issue_date || fieldValues.website_client_id_issue_date || fieldValues.social_client_id_issue_date ? formatLegalValue("date", fieldValues.landlord_id_issue_date || fieldValues.visual_client_id_issue_date || fieldValues.website_client_id_issue_date || fieldValues.social_client_id_issue_date) : "";
  const p1Address = isPartyOneCompany
    ? (fieldValues.landlord_company_address || fieldValues.sale_seller_company_address || fieldValues.client_company_address || fieldValues.visual_client_company_address || fieldValues.website_client_company_address || fieldValues.social_client_company_address || fieldValues.landlord_address || missingPreviewValue)
    : (fieldValues.landlord_address || fieldValues.sale_seller_address || fieldValues.client_address || fieldValues.visual_client_address || fieldValues.website_client_address || fieldValues.social_client_address || missingPreviewValue);
  const p1Phone = fieldValues.landlord_phone || fieldValues.sale_seller_phone || fieldValues.client_phone || fieldValues.visual_client_phone || fieldValues.website_client_phone || fieldValues.social_client_phone || "";
  const p1Email = isPartyOneCompany
    ? (fieldValues.landlord_company_email || fieldValues.sale_seller_company_email || fieldValues.client_company_email || fieldValues.visual_client_company_email || fieldValues.website_client_company_email || fieldValues.social_client_company_email || "")
    : (fieldValues.landlord_email || fieldValues.sale_seller_email || fieldValues.client_email || fieldValues.visual_client_email || fieldValues.website_client_email || fieldValues.social_client_email || "");
  const p1Rep = isPartyOneCompany ? (fieldValues.landlord_legal_representative || fieldValues.sale_seller_legal_representative || fieldValues.client_legal_representative || fieldValues.visual_client_legal_representative || fieldValues.website_client_legal_representative || fieldValues.social_client_legal_representative || "") : "";
  const p1RepCapacity = isPartyOneCompany ? (fieldValues.landlord_representative_capacity || fieldValues.sale_seller_representative_capacity || fieldValues.visual_client_representative_capacity || fieldValues.website_client_representative_capacity || fieldValues.social_client_representative_capacity || "") : "";
  const p1CommercialRegister = isPartyOneCompany ? (fieldValues.landlord_commercial_register || fieldValues.sale_seller_commercial_register || fieldValues.visual_client_commercial_register || fieldValues.website_client_commercial_register || fieldValues.social_client_commercial_register || "") : "";
  const p1TaxCard = isPartyOneCompany ? (fieldValues.landlord_tax_card || fieldValues.sale_seller_tax_card || fieldValues.visual_client_tax_number || fieldValues.website_client_tax_number || fieldValues.social_client_tax_number || "") : "";
  const p1LegalForm = isPartyOneCompany ? (fieldValues.landlord_company_legal_form || fieldValues.sale_seller_company_legal_form || fieldValues.visual_client_company_legal_form || fieldValues.website_client_company_legal_form || fieldValues.social_client_company_legal_form || "") : "";

  // ─── Party 2 (Tenant / Buyer / Provider) ───────────────────────────────────
  const isPartyTwoCompany = (fieldValues.tenant_party_type || fieldValues.sale_buyer_party_type || fieldValues.provider_party_type || fieldValues.visual_provider_party_type || fieldValues.website_provider_party_type || fieldValues.social_provider_party_type) === "company";
  const p2Name = isPartyTwoCompany
    ? (fieldValues.tenant_company_name || fieldValues.sale_buyer_company_name || fieldValues.provider_company_name || fieldValues.visual_provider_company_name || fieldValues.website_provider_company_name || fieldValues.social_provider_company_name || "الشركة (الطرف الثاني)")
    : (fieldValues.tenant_name || fieldValues.sale_buyer_name || fieldValues.provider_name || fieldValues.visual_provider_name || fieldValues.website_provider_name || fieldValues.social_provider_name || "الطرف الثاني");
  const p2Nationality = fieldValues.tenant_nationality || fieldValues.sale_buyer_nationality || fieldValues.provider_nationality || fieldValues.visual_provider_nationality || fieldValues.website_provider_nationality || fieldValues.social_provider_nationality || missingPreviewValue;
  const isP2NonEgyptian = p2Nationality !== "مصري" && p2Nationality !== "مصري الجنسية" && p2Nationality !== "egyptian" && p2Nationality !== "مصرية" && p2Nationality !== missingPreviewValue;
  const p2NationalId = fieldValues.tenant_national_id || fieldValues.sale_buyer_national_id || fieldValues.provider_national_id || fieldValues.visual_provider_national_id || fieldValues.website_provider_national_id || fieldValues.social_provider_national_id || "";
  const p2IdIssuer = fieldValues.tenant_id_issuer || fieldValues.sale_buyer_id_issuer || fieldValues.visual_provider_id_issuer || fieldValues.website_provider_id_issuer || fieldValues.social_provider_id_issuer || "";
  const p2IdIssueDate = fieldValues.tenant_id_issue_date || fieldValues.visual_provider_id_issue_date || fieldValues.website_provider_id_issue_date || fieldValues.social_provider_id_issue_date ? formatLegalValue("date", fieldValues.tenant_id_issue_date || fieldValues.visual_provider_id_issue_date || fieldValues.website_provider_id_issue_date || fieldValues.social_provider_id_issue_date) : "";
  const p2Address = isPartyTwoCompany
    ? (fieldValues.tenant_company_address || fieldValues.sale_buyer_company_address || fieldValues.provider_company_address || fieldValues.visual_provider_company_address || fieldValues.website_provider_company_address || fieldValues.social_provider_company_address || fieldValues.tenant_address || missingPreviewValue)
    : (fieldValues.tenant_address || fieldValues.sale_buyer_address || fieldValues.provider_address || fieldValues.visual_provider_address || fieldValues.website_provider_address || fieldValues.social_provider_address || missingPreviewValue);
  const p2Phone = fieldValues.tenant_phone || fieldValues.sale_buyer_phone || fieldValues.provider_phone || fieldValues.visual_provider_phone || fieldValues.website_provider_phone || fieldValues.social_provider_phone || "";
  const p2Email = isPartyTwoCompany
    ? (fieldValues.tenant_company_email || fieldValues.sale_buyer_company_email || fieldValues.provider_company_email || fieldValues.visual_provider_company_email || fieldValues.website_provider_company_email || fieldValues.social_provider_company_email || "")
    : (fieldValues.tenant_email || fieldValues.sale_buyer_email || fieldValues.provider_email || fieldValues.visual_provider_email || fieldValues.website_provider_email || fieldValues.social_provider_email || "");
  const p2Rep = isPartyTwoCompany ? (fieldValues.tenant_legal_representative || fieldValues.sale_buyer_legal_representative || fieldValues.provider_legal_representative || fieldValues.visual_provider_legal_representative || fieldValues.website_provider_legal_representative || fieldValues.social_provider_legal_representative || "") : "";
  const p2RepCapacity = isPartyTwoCompany ? (fieldValues.tenant_representative_capacity || fieldValues.sale_buyer_representative_capacity || fieldValues.visual_provider_representative_capacity || fieldValues.website_provider_representative_capacity || fieldValues.social_provider_representative_capacity || "") : "";
  const p2CommercialRegister = isPartyTwoCompany ? (fieldValues.tenant_commercial_register || fieldValues.sale_buyer_commercial_register || fieldValues.visual_provider_commercial_register || fieldValues.website_provider_commercial_register || fieldValues.social_provider_commercial_register || "") : "";
  const p2TaxCard = isPartyTwoCompany ? (fieldValues.tenant_tax_card || fieldValues.sale_buyer_tax_card || fieldValues.visual_provider_tax_number || fieldValues.website_provider_tax_number || fieldValues.social_provider_tax_number || "") : "";
  const p2LegalForm = isPartyTwoCompany ? (fieldValues.tenant_company_legal_form || fieldValues.sale_buyer_company_legal_form || fieldValues.visual_provider_company_legal_form || fieldValues.website_provider_company_legal_form || fieldValues.social_provider_company_legal_form || "") : "";

  // ─── Real Estate & Subject Details ─────────────────────────────────────────
  const governorate = fieldValues.property_governorate || fieldValues.sale_unit_governorate || missingPreviewValue;
  const city = fieldValues.property_city || fieldValues.sale_unit_city || "";
  const district = fieldValues.property_district || fieldValues.sale_unit_district || "";
  const street = fieldValues.property_street || fieldValues.sale_unit_street || "";
  const buildingNum = fieldValues.building_number || fieldValues.property_building_number || fieldValues.sale_unit_building_number || "";
  const floorNum = fieldValues.floor_number || fieldValues.property_floor || fieldValues.sale_unit_floor || "";
  const unitNum = fieldValues.unit_number || fieldValues.property_unit_number || fieldValues.sale_unit_number || "";
  const area = fieldValues.property_area || fieldValues.property_area_sqm || fieldValues.sale_unit_area_sqm || "";
  const resPropertyType = fieldValues.residential_property_type || fieldValues.commercial_unit_type || "وحدة";
  const compoundName = fieldValues.residential_compound_name || fieldValues.commercial_mall_name || "";
  
  // Specific Commercial / Purpose Handling
  const commercialActivityName = fieldValues.commercial_activity_name || fieldValues.trade_name || fieldValues.commercial_activity_type || "";
  const commercialUnitType = fieldValues.commercial_unit_type || "";
  const displayPurpose = isRental
    ? (effectiveVariantKey === "commercial_lease"
        ? [commercialUnitType, commercialActivityName].filter(Boolean).join(" — ") || "وحدة تجارية"
        : effectiveVariantKey === "administrative_lease"
        ? [fieldValues.administrative_purpose, fieldValues.administrative_activity_type].filter(Boolean).join(" — ") || "مقر إداري"
        : resPropertyType || "سكن خاص")
    : isSale
    ? fieldValues.sale_unit_type || resPropertyType || "وحدة سكنية"
    : "خدمات مهنية";

  const mezzanine = fieldValues.commercial_has_mezzanine;
  const facadeMeters = fieldValues.commercial_facade_length_meters;
  const hasStorage = fieldValues.commercial_has_attached_storage;
  const hasLoading = fieldValues.commercial_has_loading_area;
  const locationType = fieldValues.commercial_location_type ? formatLegalValue("location", fieldValues.commercial_location_type) : "";

  // Freelancer project variables
  const projectName = fieldValues.visual_project_name || fieldValues.website_project_name || fieldValues.social_project_name || "";
  const projectType = fieldValues.website_project_type ? formatLegalValue("project_type", fieldValues.website_project_type) : fieldValues.social_business_nature || fieldValues.visual_project_brief || "";
  const managedPlatforms = fieldValues.social_managed_platforms || "";
  const scopeSummary = fieldValues.visual_project_scope_summary || fieldValues.website_project_scope_summary || fieldValues.social_scope_summary || "";
  const duration = fieldValues.visual_execution_duration || fieldValues.website_contract_duration || fieldValues.social_contract_duration || (fieldValues.website_execution_duration_value ? `${fieldValues.website_execution_duration_value} ${fieldValues.website_execution_duration_unit || 'يوم عمل'}` : "");
  const feeAmount = fieldValues.visual_contract_value || fieldValues.website_total_price || fieldValues.social_fee || "";
  const feeNature = fieldValues.visual_fee_nature || fieldValues.social_fee_nature || "";

  // Jurisdiction Court
  const jurisdictionCourt =
    fieldValues.rental_jurisdiction_court ||
    fieldValues.sale_jurisdiction_court ||
    (fieldValues.visual_competent_court === "أخرى" ? fieldValues.visual_competent_court_other : fieldValues.visual_competent_court) ||
    (fieldValues.website_competent_court === "أخرى" ? fieldValues.website_competent_court_other : fieldValues.website_competent_court) ||
    (fieldValues.social_competent_court === "أخرى" ? fieldValues.social_competent_court_other : fieldValues.social_competent_court) ||
    "";

  // Meters
  const electricityMeter = fieldValues.electricity_meter || fieldValues.sale_electricity_meter || "";
  const electricityMeterType = formatLegalValue("meter_type", fieldValues.electricity_meter_type || fieldValues.sale_electricity_meter_type || "");
  const waterMeter = fieldValues.water_meter || fieldValues.sale_water_meter || "";
  const waterMeterType = formatLegalValue("meter_type", fieldValues.water_meter_type || fieldValues.sale_water_meter_type || "");
  const gasMeter = fieldValues.gas_meter || fieldValues.sale_gas_meter || "";
  const gasMeterType = formatLegalValue("meter_type", fieldValues.gas_meter_type || fieldValues.sale_gas_meter_type || "");

  // ─── Financials & Duration ────────────────────────────────────────────────
  const rawContractDate = String(fieldValues.contract_date || fieldValues.visual_contract_date || fieldValues.website_contract_date || fieldValues.social_contract_date || "");
  const formattedContractDate = rawContractDate && /^\d{4}-\d{2}-\d{2}$/.test(rawContractDate)
    ? rawContractDate.split("-").reverse().join("/")
    : rawContractDate || missingPreviewValue;

  // ─── Witnesses ────────────────────────────────────────────────────────────
  const witness1Name = fieldValues.rental_witness_1_name || fieldValues.sale_witness_1_name || "";
  const witness1Id = fieldValues.rental_witness_1_national_id || fieldValues.sale_witness_1_national_id || "";
  const witness2Name = fieldValues.rental_witness_2_name || fieldValues.sale_witness_2_name || "";
  const witness2Id = fieldValues.rental_witness_2_national_id || fieldValues.sale_witness_2_national_id || "";

  // ─── Render All Authoritative Legal Clauses ───────────────────────────────
  const renderedClauses: RenderedLegalClause[] = useMemo(() => {
    try {
      return renderLegalClauses(templateDef, effectiveVariantKey, selectedOptionalClauseKeys || [], fieldValues);
    } catch (e) {
      console.warn("Could not render legal clauses dynamically:", e);
      return [];
    }
  }, [templateDef, effectiveVariantKey, selectedOptionalClauseKeys, fieldValues]);

  const docTitle =
    templateNameAr ||
    (effectiveVariantKey === "commercial_lease"
      ? "عقد إيجار تجاري خاضع لأحكام القانون المدني"
      : effectiveVariantKey === "administrative_lease"
      ? "عقد إيجار إداري خاضع لأحكام القانون المدني"
      : effectiveVariantKey === "residential_lease"
      ? "عقد إيجار سكني خاضع لأحكام القانون رقم 4 لسنة 1996"
      : isSale
      ? "عقد بيع ابتدائي لوحدة سكنية"
      : isFreelancer
      ? "عقد تقديم خدمات مستقلة"
      : "عقد رسمي معتمد");

  const hasPropertyData = Boolean(governorate !== missingPreviewValue || street || area || unitNum || buildingNum);

  return (
    <div className="relative mx-auto w-full max-w-[850px] rounded-none sm:rounded-lg border border-slate-200 bg-white p-8 sm:p-14 shadow-sm print:shadow-none print:border-none font-sans select-text overflow-hidden text-[#1a1a1a]">

      {/* Repeating Subtle Watermark in Draft Mode */}
      {status !== "issued" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-around overflow-hidden opacity-[0.035] select-none z-0 rotate-[-28deg] scale-125">
          <div className="text-5xl sm:text-6xl font-black text-slate-900 tracking-widest whitespace-nowrap">
            مسودة عقد • DRAFT PREVIEW
          </div>
          <div className="text-5xl sm:text-6xl font-black text-slate-900 tracking-widest whitespace-nowrap">
            نسخة للمعاينة فقط • NOT OFFICIAL
          </div>
          <div className="text-5xl sm:text-6xl font-black text-slate-900 tracking-widest whitespace-nowrap">
            مسودة عقد • DRAFT PREVIEW
          </div>
        </div>
      )}

      {/* Official Islamic Header & Seal */}
      <div id="doc-preamble" className="relative z-10 text-center pb-4 border-b border-slate-300 scroll-mt-28">
        <p className="text-[11.5px] sm:text-[12px] font-serif font-bold text-slate-600 tracking-widest">
          بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ
        </p>
        <h1 className="mt-2.5 text-lg sm:text-[21px] font-bold text-[#00102e] tracking-tight">
          {docTitle}
        </h1>
        <div className="mt-2 flex items-center justify-center gap-3 text-[10.5px] text-slate-500 font-mono">
          <span>رقم الوثيقة: {serialNumber}</span>
          <span>•</span>
          <span>تاريخ التحرير: {formattedContractDate}</span>
        </div>
      </div>

      {/* Contract Body */}
      <div className="relative z-10 mt-5 space-y-4 text-[11.5px] sm:text-[12px] leading-[1.85] text-slate-800 text-justify">

        {/* Preamble Opening */}
        <p className="font-semibold text-slate-900 leading-relaxed pt-1">
          إنه في يوم الموافق <strong className="text-[#00102e] font-bold underline decoration-[#986410]/50 underline-offset-4">{formattedContractDate}</strong>، بجمهورية مصر العربية، تم الاتفاق والتراضي بين كل من:
        </p>

        {/* Parties Block */}
        <div className="space-y-3 pt-1 border-b border-slate-200 pb-4">
          {/* Party 1 */}
          <div id="doc-party-1" className="space-y-1 scroll-mt-28">
            <strong className="block text-[12.5px] sm:text-[13px] font-bold text-[#00102e]">
              أولاً: {isPartyOneCompany ? "السادة / " : "السيد / "}{isRental ? "المؤجر" : isSale ? "البائع" : "العميل"} (الطرف الأول):
            </strong>
            {isPartyOneCompany ? (
              <p className="text-[11.5px] text-slate-700 leading-6">
                <b>الشركة:</b> {p1Name} {p1LegalForm ? `(${p1LegalForm})` : ""}
                {p1CommercialRegister && <> — <b>سجل تجاري:</b> <span dir="ltr" className="font-mono font-bold">{p1CommercialRegister}</span></>}
                {p1TaxCard && <> — <b>بطاقة ضريبية:</b> <span dir="ltr" className="font-mono font-bold">{p1TaxCard}</span></>}
                {p1Rep && <> — <b>يمثلها قانونًا:</b> {p1Rep} {p1RepCapacity ? `(بصفته ${p1RepCapacity})` : ""}</>}
                {p1Address && <> — <b>المقر الرئيسي:</b> {p1Address}</>}
                {p1Phone && <> — <b>الهاتف:</b> <span dir="ltr" className="font-mono">{p1Phone}</span></>}
                {p1Email && <> — <b>البريد:</b> <span dir="ltr">{p1Email}</span></>}.
              </p>
            ) : (
              <p className="text-[11.5px] text-slate-700 leading-6">
                <b>الاسم:</b> {p1Name} — <b>الجنسية:</b> {p1Nationality}
                {p1NationalId && <> — <b>{isP1NonEgyptian ? "رقم جواز السفر" : "الرقم القومي"}:</b> <span dir="ltr" className="font-mono font-bold">{p1NationalId}</span></>}
                {p1IdIssuer && <> (صادر من: {p1IdIssuer}{p1IdIssueDate ? ` بتاريخ ${p1IdIssueDate}` : ""})</>}
                {p1Address && <> — <b>المحل المختار / الإقامة:</b> {p1Address}</>}
                {p1Phone && <> — <b>الهاتف:</b> <span dir="ltr" className="font-mono">{p1Phone}</span></>}
                {p1Email && <> — <b>البريد:</b> <span dir="ltr">{p1Email}</span></>}.
              </p>
            )}
          </div>

          {/* Party 2 */}
          <div id="doc-party-2" className="space-y-1 scroll-mt-28 pt-1">
            <strong className="block text-[12.5px] sm:text-[13px] font-bold text-[#00102e]">
              ثانياً: {isPartyTwoCompany ? "السادة / " : "السيد / "}{isRental ? "المستأجر" : isSale ? "المشتري" : "مقدم الخدمة"} (الطرف الثاني):
            </strong>
            {isPartyTwoCompany ? (
              <p className="text-[11.5px] text-slate-700 leading-6">
                <b>الشركة:</b> {p2Name} {p2LegalForm ? `(${p2LegalForm})` : ""}
                {p2CommercialRegister && <> — <b>سجل تجاري:</b> <span dir="ltr" className="font-mono font-bold">{p2CommercialRegister}</span></>}
                {p2TaxCard && <> — <b>بطاقة ضريبية:</b> <span dir="ltr" className="font-mono font-bold">{p2TaxCard}</span></>}
                {p2Rep && <> — <b>يمثلها قانونًا:</b> {p2Rep} {p2RepCapacity ? `(بصفته ${p2RepCapacity})` : ""}</>}
                {p2Address && <> — <b>المقر الرئيسي:</b> {p2Address}</>}
                {p2Phone && <> — <b>الهاتف:</b> <span dir="ltr" className="font-mono">{p2Phone}</span></>}
                {p2Email && <> — <b>البريد:</b> <span dir="ltr">{p2Email}</span></>}.
              </p>
            ) : (
              <p className="text-[11.5px] text-slate-700 leading-6">
                <b>الاسم:</b> {p2Name} — <b>الجنسية:</b> {p2Nationality}
                {p2NationalId && <> — <b>{isP2NonEgyptian ? "رقم جواز السفر" : "الرقم القومي"}:</b> <span dir="ltr" className="font-mono font-bold">{p2NationalId}</span></>}
                {p2IdIssuer && <> (صادر من: {p2IdIssuer}{p2IdIssueDate ? ` بتاريخ ${p2IdIssueDate}` : ""})</>}
                {p2Address && <> — <b>المحل المختار / الإقامة:</b> {p2Address}</>}
                {p2Phone && <> — <b>الهاتف:</b> <span dir="ltr" className="font-mono">{p2Phone}</span></>}
                {p2Email && <> — <b>البريد:</b> <span dir="ltr">{p2Email}</span></>}.
              </p>
            )}
          </div>
        </div>

        {/* ─── DATA GRID SECTION (جدول المواصفات والبيانات المعتمدة) ─── */}
        {(isRental || isSale) && hasPropertyData && (
          <div id="doc-unit-specs" className="mt-3 mb-4 scroll-mt-28">
            <div className="border border-slate-300 rounded-sm overflow-hidden bg-white">
              <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
                <strong className="text-[11.5px] font-bold text-[#00102e]">
                  {isRental ? "جدول بيانات ومواصفات العين المؤجرة وملحقاتها" : "جدول بيانات ومواصفات الوحدة المبيعة"}
                </strong>
                {compoundName && <span className="text-[10.5px] text-slate-600 font-bold">{compoundName}</span>}
              </div>
              <table className="w-full text-[11px] text-slate-800 border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">المحافظة:</span>
                      <span className="font-bold">{governorate}</span>
                    </td>
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">المدينة / المركز:</span>
                      <span className="font-bold">{city || "—"}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">الحي / المنطقة:</span>
                      <span className="font-bold">{district || "—"}</span>
                    </td>
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">اسم الشارع:</span>
                      <span className="font-bold">{street || "—"}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">رقم العقار / المبنى:</span>
                      <span className="font-bold">{buildingNum || "—"}</span>
                    </td>
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">الدور / رقم الوحدة:</span>
                      <span className="font-bold">{floorNum ? `الدور ${floorNum}` : ""} {unitNum ? `(رقم ${unitNum})` : "—"}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">المساحة الإجمالية:</span>
                      <span className="font-bold">{area ? `${area} م²` : "—"}</span>
                    </td>
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">{isRental ? "النشاط / الغرض:" : "نوع الوحدة:"}</span>
                      <span className="font-bold text-[#00102e]">{displayPurpose}</span>
                    </td>
                  </tr>

                  {/* Commercial Lease Specific Details */}
                  {isRental && (locationType || mezzanine || facadeMeters || hasStorage || hasLoading) && (
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 px-3 w-1/2 align-top">
                        <span className="text-slate-500 text-[10px] block">نوع الموقع والواجهة:</span>
                        <span className="font-bold">{locationType || "—"} {facadeMeters ? `(طول الواجهة: ${facadeMeters} م)` : ""}</span>
                      </td>
                      <td className="py-1.5 px-3 w-1/2 align-top">
                        <span className="text-slate-500 text-[10px] block">الميزانين والملحقات التجارية:</span>
                        <span className="font-bold">
                          {mezzanine ? `ميزانين: ${formatLegalValue("mezzanine", mezzanine)}` : ""}
                          {hasStorage ? ` • مخزن: ${formatLegalValue("storage", hasStorage)}` : ""}
                          {hasLoading ? ` • تحميل: ${formatLegalValue("loading", hasLoading)}` : ""}
                          {!mezzanine && !hasStorage && !hasLoading ? "—" : ""}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* Court Jurisdiction Row in Specs Table */}
                  <tr className="border-b border-slate-200 bg-slate-50/40">
                    <td colSpan={2} className="py-1.5 px-3 align-top">
                      <span className="text-slate-500 text-[10px] block">المحكمة المختصة بنظر أي نزاع:</span>
                      <span className="font-bold text-[#00102e]">
                        {jurisdictionCourt ? `محكمة ${jurisdictionCourt} الابتدائية وجزئياتها` : "المحكمة المختصة التابع لها العقار"}
                      </span>
                    </td>
                  </tr>

                  {/* Meter Details */}
                  {(electricityMeter || waterMeter || gasMeter) && (
                    <tr>
                      <td colSpan={2} className="py-1.5 px-3 text-[10px] text-slate-700 bg-slate-50/60">
                        <b>العدادات المعتمدة:</b>{" "}
                        {electricityMeter && <>كهرباء (<span dir="ltr" className="font-mono font-bold">{electricityMeter}</span> - {electricityMeterType}) • </>}
                        {waterMeter && <>مياه (<span dir="ltr" className="font-mono font-bold">{waterMeter}</span> - {waterMeterType}) • </>}
                        {gasMeter && <>غاز (<span dir="ltr" className="font-mono font-bold">{gasMeter}</span> - {gasMeterType})</>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── FREELANCER PROJECT & SERVICES SPECIFICATIONS TABLE ─── */}
        {isFreelancer && Boolean(projectName || scopeSummary || managedPlatforms || feeAmount) && (
          <div id="doc-project-specs" className="mt-3 mb-4 scroll-mt-28">
            <div className="border border-slate-300 rounded-sm overflow-hidden bg-white">
              <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
                <strong className="text-[11.5px] font-bold text-[#00102e]">
                  جدول بيانات المشروع ونطاق الخدمات المعتمد
                </strong>
                {projectName && <span className="text-[10.5px] text-slate-700 font-bold">{projectName}</span>}
              </div>
              <table className="w-full text-[11px] text-slate-800 border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">اسم المشروع / العلامة:</span>
                      <span className="font-bold">{projectName || "—"}</span>
                    </td>
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">طبيعة النشاط / نوع المشروع:</span>
                      <span className="font-bold">{projectType || "—"}</span>
                    </td>
                  </tr>
                  {managedPlatforms && (
                    <tr className="border-b border-slate-200">
                      <td colSpan={2} className="py-1.5 px-3 align-top">
                        <span className="text-slate-500 text-[10px] block">المنصات والحسابات المشمولة بالخدمة:</span>
                        <span className="font-bold text-[#00102e]">{managedPlatforms}</span>
                      </td>
                    </tr>
                  )}
                  {scopeSummary && (
                    <tr className="border-b border-slate-200">
                      <td colSpan={2} className="py-1.5 px-3 align-top">
                        <span className="text-slate-500 text-[10px] block">الخدمات والمخرجات المتفق عليها:</span>
                        <span className="text-[10.5px] leading-relaxed text-slate-800 whitespace-pre-line">{scopeSummary}</span>
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">مدة العقد والتنفيذ:</span>
                      <span className="font-bold">{duration || "—"}</span>
                    </td>
                    <td className="py-1.5 px-3 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">المقابل المالي المتفق عليه:</span>
                      <span className="font-bold text-[#00102e]">
                        {feeAmount ? `${Number(feeAmount).toLocaleString("ar-EG")} ج.م` : "—"}{" "}
                        {feeNature ? `(${feeNature})` : ""}
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-slate-50/40">
                    <td colSpan={2} className="py-1.5 px-3 align-top">
                      <span className="text-slate-500 text-[10px] block">المحكمة المختصة بنظر أي نزاع:</span>
                      <span className="font-bold text-[#00102e]">
                        {jurisdictionCourt
                          ? `محكمة ${jurisdictionCourt} الابتدائية وجزئياتها`
                          : "المحكمة المختصة وفق قواعد الاختصاص المقررة قانونًا"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── FULL OFFICIAL LEGAL CLAUSES (المواد القانونية الرسمية الكاملة) ─── */}
        <div className="space-y-4 pt-1">
          {renderedClauses.length > 0 ? (
            renderedClauses.map((clause) => {
              // Skip raw source article 01 text since the parties box above formats it professionally
              if (clause.key.endsWith("_source_article_01")) {
                return null;
              }

              const k = clause.key.toLowerCase();
              const dataTarget =
                k.includes("delay_penalty") || k.endsWith("_source_article_05") || k.includes("penalty")
                  ? "delay-penalty"
                  : k.includes("notice") || k.includes("messaging") || k.includes("communication") || k.endsWith("_source_article_19") || k.endsWith("_source_article_18")
                  ? "communications"
                  : k.endsWith("_source_article_02") || k.endsWith("_source_article_03") || k.includes("scope") || k.includes("project")
                  ? "project-scope"
                  : k.endsWith("_source_article_04") || k.includes("financial") || k.includes("payment") || k.includes("fee") || k.includes("deposit")
                  ? "financials"
                  : k.includes("optional") || k.includes("fees") || k.includes("vat")
                  ? "optional-clauses"
                  : undefined;

              return (
                <div key={clause.key} id={`doc-clause-${clause.key}`} data-target={dataTarget} className="space-y-1 pt-2 scroll-mt-28">
                  <h3 className="font-bold text-[#00102e] text-[13px] sm:text-[13.5px] pb-0.5">
                    {clause.titleAr}
                  </h3>

                  {/* Render Article Body */}
                  <p className="text-slate-800 leading-[1.85] text-justify whitespace-pre-line text-[11.5px] sm:text-[12px]">
                    {clause.bodyAr}
                  </p>
                </div>
              );
            })
          ) : (
            /* Fallback in case template resolver is loading */
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200">
              جارٍ تحميل وتجميع مواد العقد القانونية...
            </div>
          )}
        </div>

        {/* ─── SIGNATURES & WITNESSES BLOCK ─── */}
        <div id="doc-signatures" className="mt-10 pt-6 border-t border-slate-300 space-y-6 scroll-mt-28">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div className="space-y-1.5 p-3 border border-slate-200 rounded-sm">
              <strong className="block text-[12px] font-bold text-slate-900">
                توقيع وبصمة الطرف الأول ({isRental ? "المؤجر" : isSale ? "البائع" : "العميل"})
              </strong>
              <p className="text-[11px] text-slate-700 font-bold">{p1Rep ? `${p1Rep} (عن ${p1Name})` : p1Name}</p>
              <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            </div>

            <div className="space-y-1.5 p-3 border border-slate-200 rounded-sm">
              <strong className="block text-[12px] font-bold text-slate-900">
                توقيع وبصمة الطرف الثاني ({isRental ? "المستأجر" : isSale ? "المشتري" : "مقدم الخدمة"})
              </strong>
              <p className="text-[11px] text-slate-700 font-bold">{p2Rep ? `${p2Rep} (عن ${p2Name})` : p2Name}</p>
              <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            </div>
          </div>

          {/* Witnesses Block (if filled or rental standard) */}
          <div className="grid grid-cols-2 gap-8 text-center pt-1">
            <div className="space-y-1 p-2.5 border border-slate-200 rounded-sm text-[11px]">
              <strong className="block font-bold text-slate-900">الشاهد الأول:</strong>
              <p className="text-slate-700">{witness1Name || missingPreviewValue}</p>
              <p className="font-mono text-[10px] text-slate-500">الرقم القومي: {witness1Id || missingPreviewValue}</p>
              <div className="h-6 border-b border-dotted border-slate-400 w-1/2 mx-auto mt-1" />
            </div>
            <div className="space-y-1 p-2.5 border border-slate-200 rounded-sm text-[11px]">
              <strong className="block font-bold text-slate-900">الشاهد الثاني:</strong>
              <p className="text-slate-700">{witness2Name || missingPreviewValue}</p>
              <p className="font-mono text-[10px] text-slate-500">الرقم القومي: {witness2Id || missingPreviewValue}</p>
              <div className="h-6 border-b border-dotted border-slate-400 w-1/2 mx-auto mt-1" />
            </div>
          </div>
        </div>

      </div>

      {/* Security & Verification Footer */}
      <div className="mt-8 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[#986410]" />
          <span>مُعد ومحفوظ إلكترونيًا ومحمي بسجل نسخ رقمي وفق أحكام القانون عبر منصة Z Draft</span>
        </div>
        <div className="flex items-center gap-2">
          <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-mono font-bold text-slate-500">{serialNumber}</span>
        </div>
      </div>

    </div>
  );
}
