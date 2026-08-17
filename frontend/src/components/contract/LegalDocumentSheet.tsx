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
  tenant_party_type: "الصفة القانونية للمستأجر",
  tenant_national_id: "الرقم القومي للمستأجر",
  tenant_nationality: "جنسية المستأجر",
  tenant_address: "محل إقامة المستأجر",
  tenant_phone: "هاتف المستأجر",
  tenant_email: "بريد المستأجر",

  employer_name: "صاحب العمل (الطرف الأول)",
  employee_name: "العامل (الطرف الثاني)",
  client_name: "العميل (الطرف الأول)",
  provider_name: "مقدم الخدمة (الطرف الثاني)",

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
  commercial_activity_type: "النشاط التجاري",
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
    key.includes("compensation")
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
    (Boolean(fieldValues.landlord_name) || Boolean(fieldValues.rent_amount)
      ? "rental"
      : Boolean(fieldValues.sale_seller_name) || Boolean(fieldValues.sale_total_price)
      ? "apartment_sale"
      : "freelancer");

  const templateDef = localTemplateRegistry[effectiveSlug] || localTemplateRegistry.rental;

  // Resolve effective variantKey
  const effectiveVariantKey = useMemo(() => {
    if (variantKey) return variantKey;
    if (effectiveSlug === "rental") {
      if (fieldValues.commercial_unit_type || fieldValues.commercial_activity_type) {
        return "commercial_lease";
      }
      if (fieldValues.administrative_purpose) {
        return "administrative_lease";
      }
      return "residential_lease";
    }
    if (effectiveSlug === "apartment_sale") {
      return fieldValues.sale_payment_plan === "installments" ? "preliminary_sale" : "final_sale";
    }
    return templateDef.variants[0]?.key || "visual_identity_contract";
  }, [variantKey, effectiveSlug, fieldValues, templateDef]);

  const isRental = effectiveSlug === "rental";
  const isSale = effectiveSlug === "apartment_sale";
  const isFreelancer = effectiveSlug === "freelancer";

  // ─── Party 1 (Landlord / Seller / Client) ──────────────────────────────────
  const isPartyOneCompany = (fieldValues.landlord_party_type || fieldValues.sale_seller_party_type || fieldValues.client_party_type) === "company";
  const p1Name = isPartyOneCompany
    ? (fieldValues.landlord_company_name || fieldValues.sale_seller_company_name || fieldValues.client_company_name || "الشركة (الطرف الأول)")
    : (fieldValues.landlord_name || fieldValues.sale_seller_name || fieldValues.client_name || "الطرف الأول");
  const p1Nationality = fieldValues.landlord_nationality || fieldValues.sale_seller_nationality || fieldValues.client_nationality || missingPreviewValue;
  const isP1NonEgyptian = p1Nationality !== "مصري" && p1Nationality !== "مصري الجنسية" && p1Nationality !== "egyptian" && p1Nationality !== "مصرية" && p1Nationality !== missingPreviewValue;
  const p1NationalId = fieldValues.landlord_national_id || fieldValues.sale_seller_national_id || fieldValues.client_national_id || "";
  const p1IdIssuer = fieldValues.landlord_id_issuer || fieldValues.sale_seller_id_issuer || "";
  const p1IdIssueDate = fieldValues.landlord_id_issue_date ? formatLegalValue("date", fieldValues.landlord_id_issue_date) : "";
  const p1Address = isPartyOneCompany
    ? (fieldValues.landlord_company_address || fieldValues.sale_seller_company_address || fieldValues.client_company_address || fieldValues.landlord_address || missingPreviewValue)
    : (fieldValues.landlord_address || fieldValues.sale_seller_address || fieldValues.client_address || missingPreviewValue);
  const p1Phone = fieldValues.landlord_phone || fieldValues.sale_seller_phone || fieldValues.client_phone || "";
  const p1Email = isPartyOneCompany
    ? (fieldValues.landlord_company_email || fieldValues.sale_seller_company_email || fieldValues.client_company_email || "")
    : (fieldValues.landlord_email || fieldValues.sale_seller_email || fieldValues.client_email || "");
  const p1Rep = isPartyOneCompany ? (fieldValues.landlord_legal_representative || fieldValues.sale_seller_legal_representative || fieldValues.client_legal_representative || "") : "";
  const p1RepCapacity = isPartyOneCompany ? (fieldValues.landlord_representative_capacity || fieldValues.sale_seller_representative_capacity || "") : "";
  const p1CommercialRegister = isPartyOneCompany ? (fieldValues.landlord_commercial_register || fieldValues.sale_seller_commercial_register || "") : "";
  const p1TaxCard = isPartyOneCompany ? (fieldValues.landlord_tax_card || fieldValues.sale_seller_tax_card || "") : "";
  const p1LegalForm = isPartyOneCompany ? (fieldValues.landlord_company_legal_form || fieldValues.sale_seller_company_legal_form || "") : "";

  // ─── Party 2 (Tenant / Buyer / Provider) ───────────────────────────────────
  const isPartyTwoCompany = (fieldValues.tenant_party_type || fieldValues.sale_buyer_party_type || fieldValues.provider_party_type) === "company";
  const p2Name = isPartyTwoCompany
    ? (fieldValues.tenant_company_name || fieldValues.sale_buyer_company_name || fieldValues.provider_company_name || "الشركة (الطرف الثاني)")
    : (fieldValues.tenant_name || fieldValues.sale_buyer_name || fieldValues.provider_name || "الطرف الثاني");
  const p2Nationality = fieldValues.tenant_nationality || fieldValues.sale_buyer_nationality || fieldValues.provider_nationality || missingPreviewValue;
  const isP2NonEgyptian = p2Nationality !== "مصري" && p2Nationality !== "مصري الجنسية" && p2Nationality !== "egyptian" && p2Nationality !== "مصرية" && p2Nationality !== missingPreviewValue;
  const p2NationalId = fieldValues.tenant_national_id || fieldValues.sale_buyer_national_id || fieldValues.provider_national_id || "";
  const p2IdIssuer = fieldValues.tenant_id_issuer || fieldValues.sale_buyer_id_issuer || "";
  const p2IdIssueDate = fieldValues.tenant_id_issue_date ? formatLegalValue("date", fieldValues.tenant_id_issue_date) : "";
  const p2Address = isPartyTwoCompany
    ? (fieldValues.tenant_company_address || fieldValues.sale_buyer_company_address || fieldValues.provider_company_address || fieldValues.tenant_address || missingPreviewValue)
    : (fieldValues.tenant_address || fieldValues.sale_buyer_address || fieldValues.provider_address || missingPreviewValue);
  const p2Phone = fieldValues.tenant_phone || fieldValues.sale_buyer_phone || fieldValues.provider_phone || "";
  const p2Email = isPartyTwoCompany
    ? (fieldValues.tenant_company_email || fieldValues.sale_buyer_company_email || fieldValues.provider_company_email || "")
    : (fieldValues.tenant_email || fieldValues.sale_buyer_email || fieldValues.provider_email || "");
  const p2Rep = isPartyTwoCompany ? (fieldValues.tenant_legal_representative || fieldValues.sale_buyer_legal_representative || fieldValues.provider_legal_representative || "") : "";
  const p2RepCapacity = isPartyTwoCompany ? (fieldValues.tenant_representative_capacity || fieldValues.sale_buyer_representative_capacity || "") : "";
  const p2CommercialRegister = isPartyTwoCompany ? (fieldValues.tenant_commercial_register || fieldValues.sale_buyer_commercial_register || "") : "";
  const p2TaxCard = isPartyTwoCompany ? (fieldValues.tenant_tax_card || fieldValues.sale_buyer_tax_card || "") : "";
  const p2LegalForm = isPartyTwoCompany ? (fieldValues.tenant_company_legal_form || fieldValues.sale_buyer_company_legal_form || "") : "";

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
  const tradeName = fieldValues.trade_name || fieldValues.commercial_activity_type || "";
  const mezzanine = fieldValues.commercial_has_mezzanine;
  const facadeMeters = fieldValues.commercial_facade_length_meters;
  const facadeCount = fieldValues.commercial_facades_count;
  const hasStorage = fieldValues.commercial_has_attached_storage;
  const hasLoading = fieldValues.commercial_has_loading_area;
  const locationType = fieldValues.commercial_location_type ? formatLegalValue("location", fieldValues.commercial_location_type) : "";

  // Annexes
  const annexList: string[] = [];
  if (fieldValues.residential_includes_garage || fieldValues.commercial_annex_garage) annexList.push("جراج");
  if (fieldValues.residential_includes_storage || fieldValues.commercial_annex_storage) annexList.push("مخزن");
  if (fieldValues.residential_includes_garden) annexList.push("حديقة خاصة");
  if (fieldValues.residential_includes_roof) annexList.push("سطح / رووف");
  if (fieldValues.residential_includes_service_room || fieldValues.commercial_annex_service_room) annexList.push("غرفة خدمات");
  if (fieldValues.residential_includes_parking || fieldValues.commercial_annex_loading_area) annexList.push("مكان تحميل / انتظار");
  if (fieldValues.commercial_annex_front_yard) annexList.push("ساحة أمامية");
  if (fieldValues.commercial_annex_rear_yard) annexList.push("ساحة خلفية");
  if (fieldValues.commercial_annex_restroom) annexList.push("دورة مياه خاصة");
  if (fieldValues.residential_other_annex) annexList.push(fieldValues.residential_other_annex);

  // Meters
  const electricityMeter = fieldValues.electricity_meter || fieldValues.sale_electricity_meter || "";
  const electricityMeterType = formatLegalValue("meter_type", fieldValues.electricity_meter_type || fieldValues.sale_electricity_meter_type || "");
  const waterMeter = fieldValues.water_meter || fieldValues.sale_water_meter || "";
  const waterMeterType = formatLegalValue("meter_type", fieldValues.water_meter_type || fieldValues.sale_water_meter_type || "");
  const gasMeter = fieldValues.gas_meter || fieldValues.sale_gas_meter || "";
  const gasMeterType = formatLegalValue("meter_type", fieldValues.gas_meter_type || fieldValues.sale_gas_meter_type || "");

  // ─── Financials & Duration ────────────────────────────────────────────────
  const rawContractDate = String(fieldValues.contract_date || "");
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
    <div className="relative mx-auto w-full max-w-[840px] rounded-2xl border border-slate-300 bg-white p-6 sm:p-10 shadow-lg print:shadow-none print:border-none font-sans select-text overflow-hidden">

      {/* Repeating Watermark in Draft Mode */}
      {status !== "issued" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-around overflow-hidden opacity-5 select-none z-0 rotate-[-25deg] scale-125">
          <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-widest whitespace-nowrap">
            مسودة معاينة غير مخصصة للتداول • Z DRAFT
          </div>
          <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-widest whitespace-nowrap">
            نسخة للمعاينة فقط • DRAFT PREVIEW
          </div>
          <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-widest whitespace-nowrap">
            مسودة معاينة غير مخصصة للتداول • Z DRAFT
          </div>
        </div>
      )}

      {/* Official Islamic Header & Seal */}
      <div id="doc-preamble" className="relative z-10 text-center pb-3 border-b-2 border-[#00102e] scroll-mt-28">
        <p className="text-[11px] font-serif font-bold text-slate-600 tracking-widest">
          بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ
        </p>
        <h1 className="mt-2 text-base sm:text-xl font-black text-[#00102e] tracking-tight">
          {docTitle}
        </h1>
        <div className="mt-1 flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono">
          <span>رقم الوثيقة: {serialNumber}</span>
          <span>•</span>
          <span className="font-sans font-bold text-[#986410]">
            {status === "issued" ? "نسخة معتمدة صادرة" : "مسودة معاينة حية (الصياغة الكاملة)"}
          </span>
        </div>
      </div>

      {/* Contract Body */}
      <div className="relative z-10 mt-4 space-y-4 text-[11px] sm:text-[11.5px] leading-6 text-slate-800 text-justify">

        {/* Preamble Date & Agreement */}
        <p className="font-bold text-slate-900 leading-relaxed bg-slate-50/90 p-2.5 rounded-xl border border-slate-200">
          إنه في يوم الموافق <strong className="text-[#00102e] font-black underline decoration-[#986410] underline-offset-4">{formattedContractDate}</strong>، بجمهورية مصر العربية، تم الاتفاق والتراضي بين كل من:
        </p>

        {/* Parties Box */}
        <div className="space-y-2.5 rounded-xl bg-slate-50/90 p-3.5 border border-slate-200">
          {/* Party 1 */}
          <div id="doc-party-1" className="space-y-1 border-b border-slate-200 pb-2 scroll-mt-28">
            <strong className="block text-xs font-black text-[#00102e]">
              أولاً: {isPartyOneCompany ? "السادة / " : "السيد / "}{isRental ? "المؤجر" : isSale ? "البائع" : "العميل"} (الطرف الأول):
            </strong>
            {isPartyOneCompany ? (
              <p className="text-[11px] text-slate-700 leading-5">
                <b>الشركة:</b> {p1Name} {p1LegalForm ? `(${p1LegalForm})` : ""}
                {p1CommercialRegister && <> — <b>سجل تجاري:</b> <span dir="ltr" className="font-mono font-bold">{p1CommercialRegister}</span></>}
                {p1TaxCard && <> — <b>بطاقة ضريبية:</b> <span dir="ltr" className="font-mono font-bold">{p1TaxCard}</span></>}
                {p1Rep && <> — <b>يمثلها قانونًا:</b> {p1Rep} {p1RepCapacity ? `(بصفته ${p1RepCapacity})` : ""}</>}
                {p1Address && <> — <b>المقر الرئيسي:</b> {p1Address}</>}
                {p1Phone && <> — <b>الهاتف:</b> <span dir="ltr" className="font-mono">{p1Phone}</span></>}
                {p1Email && <> — <b>البريد:</b> <span dir="ltr">{p1Email}</span></>}.
              </p>
            ) : (
              <p className="text-[11px] text-slate-700 leading-5">
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
          <div id="doc-party-2" className="space-y-1 scroll-mt-28">
            <strong className="block text-xs font-black text-[#00102e]">
              ثانياً: {isPartyTwoCompany ? "السادة / " : "السيد / "}{isRental ? "المستأجر" : isSale ? "المشتري" : "مقدم الخدمة"} (الطرف الثاني):
            </strong>
            {isPartyTwoCompany ? (
              <p className="text-[11px] text-slate-700 leading-5">
                <b>الشركة:</b> {p2Name} {p2LegalForm ? `(${p2LegalForm})` : ""}
                {p2CommercialRegister && <> — <b>سجل تجاري:</b> <span dir="ltr" className="font-mono font-bold">{p2CommercialRegister}</span></>}
                {p2TaxCard && <> — <b>بطاقة ضريبية:</b> <span dir="ltr" className="font-mono font-bold">{p2TaxCard}</span></>}
                {p2Rep && <> — <b>يمثلها قانونًا:</b> {p2Rep} {p2RepCapacity ? `(بصفته ${p2RepCapacity})` : ""}</>}
                {p2Address && <> — <b>المقر الرئيسي:</b> {p2Address}</>}
                {p2Phone && <> — <b>الهاتف:</b> <span dir="ltr" className="font-mono">{p2Phone}</span></>}
                {p2Email && <> — <b>البريد:</b> <span dir="ltr">{p2Email}</span></>}.
              </p>
            ) : (
              <p className="text-[11px] text-slate-700 leading-5">
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

        {/* ─── DATA GRID SECTION (Matching PDF Structure Before Clauses) ─── */}
        {(isRental || isSale) && hasPropertyData && (
          <div id="doc-unit-specs" className="space-y-2 rounded-xl bg-slate-50/90 p-3.5 border border-slate-200 scroll-mt-28">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <strong className="text-xs font-black text-[#00102e]">
                {isRental ? "بيانات العين المؤجرة ومواصفاتها (البيان المعتمد بصدر العقد)" : "بيانات الوحدة المبيعة ومواصفاتها"}
              </strong>
              {compoundName && <span className="text-[10px] text-slate-500 font-bold">{compoundName}</span>}
            </div>
            <table className="w-full text-[10.5px] text-slate-700 border-collapse">
              <tbody>
                <tr className="border-b border-slate-200/70">
                  <td className="py-1.5 px-2 w-1/2 align-top">
                    <span className="text-slate-500 text-[10px] block">المحافظة:</span>
                    <span className="font-bold">{governorate}</span>
                  </td>
                  <td className="py-1.5 px-2 w-1/2 align-top">
                    <span className="text-slate-500 text-[10px] block">المدينة / المركز:</span>
                    <span className="font-bold">{city || "—"}</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200/70">
                  <td className="py-1.5 px-2 w-1/2 align-top">
                    <span className="text-slate-500 text-[10px] block">الحي / المنطقة:</span>
                    <span className="font-bold">{district || "—"}</span>
                  </td>
                  <td className="py-1.5 px-2 w-1/2 align-top">
                    <span className="text-slate-500 text-[10px] block">اسم الشارع:</span>
                    <span className="font-bold">{street || "—"}</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200/70">
                  <td className="py-1.5 px-2 w-1/2 align-top">
                    <span className="text-slate-500 text-[10px] block">رقم العقار / المبنى:</span>
                    <span className="font-bold">{buildingNum || "—"}</span>
                  </td>
                  <td className="py-1.5 px-2 w-1/2 align-top">
                    <span className="text-slate-500 text-[10px] block">الدور / رقم الوحدة:</span>
                    <span className="font-bold">{floorNum ? `الدور ${floorNum}` : ""} {unitNum ? `(رقم ${unitNum})` : "—"}</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200/70">
                  <td className="py-1.5 px-2 w-1/2 align-top">
                    <span className="text-slate-500 text-[10px] block">المساحة الإجمالية:</span>
                    <span className="font-bold">{area ? `${area} م²` : "—"}</span>
                  </td>
                  <td className="py-1.5 px-2 w-1/2 align-top">
                    <span className="text-slate-500 text-[10px] block">{isRental ? "النشاط / الغرض:" : "نوع الوحدة:"}</span>
                    <span className="font-bold">{tradeName || resPropertyType || "—"}</span>
                  </td>
                </tr>
                {isRental && (locationType || mezzanine || facadeMeters || hasStorage || hasLoading) && (
                  <tr className="border-b border-slate-200/70">
                    <td className="py-1.5 px-2 w-1/2 align-top">
                      <span className="text-slate-500 text-[10px] block">نوع الموقع والواجهة:</span>
                      <span className="font-bold">{locationType || "—"} {facadeMeters ? `(طول الواجهة: ${facadeMeters} م)` : ""}</span>
                    </td>
                    <td className="py-1.5 px-2 w-1/2 align-top">
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
                {(electricityMeter || waterMeter || gasMeter) && (
                  <tr>
                    <td colSpan={2} className="py-1.5 px-2 text-[10px] text-slate-600 bg-slate-100/60 rounded-b-lg">
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
        )}

        {/* ─── FULL OFFICIAL LEGAL CLAUSES (المواد القانونية الرسمية الكاملة) ─── */}
        <div className="space-y-4 pt-2">
          {renderedClauses.length > 0 ? (
            renderedClauses.map((clause) => {
              // Skip raw source article 01 text since the parties box above formats it professionally
              if (clause.key.endsWith("_source_article_01")) {
                return null;
              }

              return (
                <div key={clause.key} id={`doc-clause-${clause.key}`} className="space-y-1.5 pt-1.5 scroll-mt-28">
                  <h4 className="font-black text-[#00102e] text-xs sm:text-[12.5px] border-r-3 border-[#986410] pr-2">
                    {clause.titleAr}
                  </h4>

                  {/* Render Article Body */}
                  <p className="text-slate-700 leading-6 text-justify whitespace-pre-line text-[11px] sm:text-[11.5px]">
                    {clause.bodyAr}
                  </p>
                </div>
              );
            })
          ) : (
            /* Fallback in case template resolver is loading */
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              جارٍ تحميل وتجميع مواد العقد القانونية...
            </div>
          )}
        </div>

        {/* ─── SIGNATURES & WITNESSES BLOCK ─── */}
        <div id="doc-signatures" className="mt-8 pt-6 border-t-2 border-slate-300 space-y-6 scroll-mt-28">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="space-y-2 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
              <strong className="block text-xs font-black text-slate-900">
                توقيع وبصمة الطرف الأول ({isRental ? "المؤجر" : isSale ? "البائع" : "العميل"})
              </strong>
              <p className="text-[11px] text-slate-600 font-bold">{p1Rep ? `${p1Rep} (عن ${p1Name})` : p1Name}</p>
              <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            </div>

            <div className="space-y-2 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
              <strong className="block text-xs font-black text-slate-900">
                توقيع وبصمة الطرف الثاني ({isRental ? "المستأجر" : isSale ? "المشتري" : "مقدم الخدمة"})
              </strong>
              <p className="text-[11px] text-slate-600 font-bold">{p2Rep ? `${p2Rep} (عن ${p2Name})` : p2Name}</p>
              <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            </div>
          </div>

          {/* Witnesses Block (if filled or rental standard) */}
          <div className="grid grid-cols-2 gap-6 text-center pt-2">
            <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
              <strong className="block font-bold text-slate-900">الشاهد الأول:</strong>
              <p className="text-slate-700">{witness1Name || missingPreviewValue}</p>
              <p className="font-mono text-[10px] text-slate-500">الرقم القومي: {witness1Id || missingPreviewValue}</p>
              <div className="h-6 border-b border-dotted border-slate-400 w-1/2 mx-auto mt-2" />
            </div>
            <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
              <strong className="block font-bold text-slate-900">الشاهد الثاني:</strong>
              <p className="text-slate-700">{witness2Name || missingPreviewValue}</p>
              <p className="font-mono text-[10px] text-slate-500">الرقم القومي: {witness2Id || missingPreviewValue}</p>
              <div className="h-6 border-b border-dotted border-slate-400 w-1/2 mx-auto mt-2" />
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
