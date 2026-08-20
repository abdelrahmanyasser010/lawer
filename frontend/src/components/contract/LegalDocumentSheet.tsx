"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
function CursorIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
    </svg>
  );
}
import {
  localTemplateRegistry,
  renderLegalClauses,
  resolveWizardDefinition,
  type FieldOptionDefinition,
  type OptionalClauseDefinition,
  type RenderedLegalClause,
  type WizardFieldDefinition,
  type WizardStepDefinition,
} from "@zdraft/template-engine";
import { formatContractFieldValue, resolveWizardFieldLabel } from "@/features/contracts/domain/contractDisplay";

interface Props {
  serialNumber: string;
  templateSlug?: string | null;
  templateNameAr?: string | null;
  variantKey?: string | null;
  selectedOptionalClauseKeys?: string[] | null;
  fieldValues?: Record<string, any>;
  status?: string;
  isPaid?: boolean;
  activeFieldKey?: string | null;
  activeFieldLabel?: string | null;
}

const A4_PREVIEW_WIDTH_PX = 794;
const A4_PREVIEW_MIN_HEIGHT_PX = 1123;

function A4PreviewScaler({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ scale: 1, height: A4_PREVIEW_MIN_HEIGHT_PX });

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;

    const update = () => {
      const availableWidth = Math.max(1, viewport.clientWidth);
      const scale = Math.min(1, availableWidth / A4_PREVIEW_WIDTH_PX);
      const height = Math.max(A4_PREVIEW_MIN_HEIGHT_PX, canvas.scrollHeight);
      setLayout((current) => current.scale === scale && current.height === height ? current : { scale, height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={viewportRef} className="relative w-full overflow-hidden" data-a4-preview-scaler="true">
      <div className="relative w-full" style={{ height: `${layout.height * layout.scale}px` }}>
        <div
          ref={canvasRef}
          className="absolute left-1/2 top-0"
          style={{
            width: `${A4_PREVIEW_WIDTH_PX}px`,
            transform: `translateX(-50%) scale(${layout.scale})`,
            transformOrigin: "top center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export const legalLabelDictionary: Record<string, string> = {
  // Parties
  seller_name: "البائع (الطرف الأول)",
  seller_party_type: "الصفة القانونية للبائع",
  seller_national_id: "الرقم القومي للبائع",
  seller_address: "محل إقامة البائع",
  seller_phone: "هاتف البائع",
  seller_email: "بريد البائع",
  buyer_name: "المشتري (الطرف الثاني)",
  buyer_party_type: "الصفة القانونية للمشتري",
  buyer_national_id: "الرقم القومي للمشتري",
  buyer_address: "محل إقامة المشتري",
  buyer_phone: "هاتف المشتري",
  buyer_email: "بريد المشتري",
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
  sale_building_number: "رقم العقار",
  sale_floor_number: "الطابق",
  sale_unit_area: "مساحة الوحدة (م²)",
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
  commercial_site_type: "نوع الموقع التجاري",
  commercial_frontage_width: "عرض الواجهة التجارية",
  commercial_has_storage: "وجود مخزن ملحق",
  commercial_project_name: "اسم المشروع / المول",
  administrative_activity_name: "النشاط الإداري المتفق عليه",
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
  rental_competent_court: "المحكمة المختصة",
  rental_competent_court_other: "اسم المحكمة الأخرى",
  sale_jurisdiction_court: "المحكمة المختصة",
  sale_competent_court: "المحكمة المختصة",
  sale_competent_court_other: "اسم المحكمة الأخرى",
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
  registrable_sale: "بيع قابل للتسجيل بالشهر العقاري",
  inherited_sale: "بيع وحدة آلت بالميراث",
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

export function formatLegalValue(
  key: string,
  value: any,
  options: FieldOptionDefinition[] = [],
  type?: WizardFieldDefinition["type"] | string,
): string {
  return formatContractFieldValue(key, value, options, type);
}

function normalizeInlineLegalSubclauses(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  const firstSubclause = normalized.match(/(?:^|\s)(\d{1,3})-\d{1,3}[.)]?(?=\s)/);
  if (!firstSubclause) return normalized;

  // Legal source PDFs frequently keep 7-1 / 7-2 / 22-1 style subclauses
  // in a single extracted paragraph. The article prefix lets us split only
  // genuine subclauses and avoid touching dates, amounts, or phone numbers.
  const articlePrefix = firstSubclause[1];
  return normalized.replace(
    new RegExp("[^\\S\\n]+(?=" + articlePrefix + "-\\d{1,3}[.)]?(?=\\s))", "g"),
    "\n",
  );
}

function LegalTextBody({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = normalizeInlineLegalSubclauses(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex} className="text-justify leading-[1.46]">
          {paragraph.split("\n").map((line, lineIndex) => {
            const trimmed = line.trim();
            const subclause = trimmed.match(/^(\d{1,3}-\d{1,3}[.)]?)(?:\s+|$)(.*)$/);
            if (subclause) {
              const rest = subclause[2] ?? "";
              const heading = rest.match(/^([^:：]{1,120}:)(.*)$/);
              return (
                <span key={lineIndex} dir="rtl" className="zd-doc-subclause">
                  <span className="zd-doc-subclause-heading">
                    <bdi dir="ltr" className="zd-doc-subclause-number">{subclause[1]}</bdi>
                    {heading ? <span>{heading[1]}</span> : null}
                  </span>
                  {heading ? (heading[2] ? <span>{heading[2]}</span> : null) : (rest ? <span>{rest}</span> : null)}
                </span>
              );
            }

            const numbered = trimmed.match(/^(\d{1,3})\.(?:\s+|$)(.*)$/) || trimmed.match(/^\.(\d{1,3})(?:\s+|$)(.*)$/);
            return numbered ? (
              <span key={lineIndex} dir="rtl" className="flex items-start gap-1">
                <bdi dir="ltr" className="w-[1.9rem] shrink-0 text-right font-semibold [unicode-bidi:isolate]">{numbered[1]}.</bdi>
                {numbered[2] ? <span dir="rtl" className="min-w-0 flex-1">{numbered[2]}</span> : null}
              </span>
            ) : (
              <span key={lineIndex} className="block">{trimmed || "\u00a0"}</span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

function LiveFieldMarker({ label: _label }: { label?: string | null }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20 rounded-sm ring-2 ring-[#d9a84e] ring-offset-0" aria-hidden="true" />
  );
}

function hasDocumentValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
}

function isPartyStepKey(stepKey: string): boolean {
  return ["rental_landlord", "rental_tenant", "sale_seller", "sale_buyer"].includes(stepKey)
    || stepKey.endsWith("_client_party")
    || stepKey.endsWith("_provider_party");
}

function isLtrDocumentField(key: string, type: string): boolean {
  return ["number", "money", "date"].includes(type)
    || /(?:phone|email|national_id|passport|register|tax|meter|serial|url|link|iban|account|code|number)$/.test(key);
}

function formatPrintDocumentValue(
  field: { key: string; type?: string; options?: FieldOptionDefinition[] },
  value: unknown,
): string {
  if (!hasDocumentValue(value)) return "....................";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object") return Object.values(item).filter(hasDocumentValue).join(" | ");
      const option = field.options?.find((candidate) => String(candidate.value) === String(item));
      const rawItem = String(item ?? "");
      if (option) return option.labelAr;
      if ((field.options?.length ?? 0) > 0 && /^[a-z][a-z0-9_]*$/i.test(rawItem)) return "قيمة غير معتمدة — يرجى إعادة الاختيار";
      return rawItem;
    }).filter(Boolean).join("، ");
  }

  const raw = String(value).trim();
  const option = field.options?.find((candidate) => String(candidate.value) === raw);
  if (option) return option.labelAr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.split("-").reverse().join("/");
  if ((field.options?.length ?? 0) > 0 && /^[a-z][a-z0-9_]*$/i.test(raw)) {
    return "قيمة غير معتمدة — يرجى إعادة الاختيار";
  }
  return raw;
}

function DocumentDataSections({
  steps,
  fieldValues,
  activeFieldKey,
  activeFieldLabel,
}: {
  steps: WizardStepDefinition[];
  fieldValues: Record<string, any>;
  activeFieldKey?: string | null;
  activeFieldLabel?: string | null;
}) {
  return (
    <div className="zd-doc-contract-data">
      {steps.map((step) => {
        const partyPresentation = isPartyStepKey(step.key);
        const printableFields = step.fields.filter((field) => field.printInDocument !== false && field.type !== "attachment" && !/(?:copies|contract_copies)/i.test(field.key) && !/(?:عدد.*نسخ)/i.test(field.labelAr));
        const itemFields = printableFields.filter((field) => {
          const value = fieldValues[field.key];
          const active = field.key === activeFieldKey;
          if (partyPresentation) return field.type !== "repeater";
          return field.type !== "repeater" && (hasDocumentValue(value) || active) && !(field.type === "checkbox" && value !== true && !active);
        });
        const repeaterFields = printableFields.filter((field) => field.type === "repeater" && (hasDocumentValue(fieldValues[field.key]) || field.key === activeFieldKey));
        if (!itemFields.length && !repeaterFields.length) return null;
        return (
          <section id={`doc-step-${step.key}`} data-step-preview-key={step.key} key={step.key} className="zd-doc-data-section-block scroll-mt-28">
            <h2 className="zd-doc-section-title">{step.titleAr}</h2>

            {partyPresentation ? (
              <p className="zd-doc-party-line">
                {itemFields.map((field) => {
                  const active = field.key === activeFieldKey;
                  const displayLabel = resolveWizardFieldLabel(field, fieldValues);
                  return (
                    <span
                      key={field.key}
                      data-field-preview-key={field.key}
                      data-active-preview={active ? "exact" : undefined}
                      className={`zd-doc-party-item ${active ? "relative rounded-sm outline outline-2 outline-[#d9a84e]" : ""}`}
                    >
                      {active && <LiveFieldMarker label={activeFieldLabel ?? displayLabel} />}
                      <span className="zd-doc-data-label">{displayLabel}:</span>{" "}
                      <span className={`zd-doc-data-value ${isLtrDocumentField(field.key, field.type) ? "inline-block" : ""}`} dir={isLtrDocumentField(field.key, field.type) ? "ltr" : undefined}>
                        {formatPrintDocumentValue(field, fieldValues[field.key])}
                      </span>
                    </span>
                  );
                })}
              </p>
            ) : itemFields.length > 0 ? (
              <table className="zd-doc-data-grid">
                <tbody>
                  {Array.from({ length: Math.ceil(itemFields.length / 2) }, (_, rowIndex) => {
                    const pair = itemFields.slice(rowIndex * 2, rowIndex * 2 + 2);
                    return (
                      <tr key={`${step.key}-${rowIndex}`}>
                        {pair.map((field) => {
                          const active = field.key === activeFieldKey;
                          const ltr = isLtrDocumentField(field.key, field.type);
                          const displayLabel = resolveWizardFieldLabel(field, fieldValues);
                          return (
                            <td
                              key={field.key}
                              data-field-preview-key={field.key}
                              data-active-preview={active ? "exact" : undefined}
                              className={active ? "relative outline outline-2 outline-[#d9a84e]" : ""}
                            >
                              {active && <LiveFieldMarker label={activeFieldLabel ?? displayLabel} />}
                              <div className="zd-doc-data-label">{displayLabel}</div>
                              <div className="zd-doc-data-value" dir={ltr ? "ltr" : undefined}>
                                {formatPrintDocumentValue(field, fieldValues[field.key])}
                              </div>
                            </td>
                          );
                        })}
                        {pair.length === 1 && <td className="empty" />}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}

            {repeaterFields.map((field) => {
              const active = field.key === activeFieldKey;
              const rows = Array.isArray(fieldValues[field.key]) ? fieldValues[field.key] : [];
              return (
                <div
                  key={field.key}
                  data-field-preview-key={field.key}
                  data-active-preview={active ? "exact" : undefined}
                  className={`zd-doc-repeater-wrap ${active ? "relative rounded-sm outline outline-2 outline-[#d9a84e]" : ""}`}
                >
                  {active && <LiveFieldMarker label={activeFieldLabel ?? field.labelAr} />}
                  <div className="zd-doc-repeater-title">{field.labelAr}</div>
                  <table className="zd-doc-repeater">
                    <thead>
                      <tr>{field.columns?.map((column) => <th key={column.key}>{column.labelAr}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.map((row: Record<string, any>, rowIndex: number) => (
                        <tr key={rowIndex}>
                          {field.columns?.map((column) => (
                            <td key={column.key}>
                              {formatPrintDocumentValue(column, row?.[column.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function DraftWatermark({ serialNumber }: { serialNumber: string }) {
  const text = `معاينة غير صالحة للاستخدام • ${serialNumber}`;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex select-none flex-col justify-around overflow-hidden opacity-[0.075]">
      {Array.from({ length: 14 }, (_, row) => (
        <div key={row} className="-mx-32 flex -rotate-[24deg] items-center justify-center gap-16 whitespace-nowrap text-[20px] font-black tracking-wide text-[#00102e] sm:text-[24px]">
          <span>{text}</span><span>{text}</span>
        </div>
      ))}
    </div>
  );
}

function blankFieldValue(field: WizardFieldDefinition): string {
  if (field.manualCheckbox || field.type === "checkbox") return "□";
  if ((field.type === "select" || field.type === "radio") && field.options?.length) {
    return field.options.map((option) => `□ ${option.labelAr}`).join("   ");
  }
  return "........................................................";
}

function BlankDocumentDataSections({ steps }: { steps: WizardStepDefinition[] }) {
  return (
    <div className="zd-doc-contract-data">
      {steps.map((step) => {
        const printableFields = step.fields.filter((field) => field.type !== "attachment");
        const itemFields = printableFields.filter((field) => field.type !== "repeater");
        const repeaterFields = printableFields.filter((field) => field.type === "repeater");
        if (!itemFields.length && !repeaterFields.length) return null;

        return (
          <section key={step.key} className="zd-doc-data-section-block">
            <h2 className="zd-doc-section-title">{step.titleAr}</h2>
            {itemFields.length > 0 && (
              <table className="zd-doc-data-grid">
                <tbody>
                  {Array.from({ length: Math.ceil(itemFields.length / 2) }, (_, rowIndex) => {
                    const pair = itemFields.slice(rowIndex * 2, rowIndex * 2 + 2);
                    return (
                      <tr key={`${step.key}-${rowIndex}`}>
                        {pair.map((field) => (
                          <td key={field.key}>
                            <div className="zd-doc-data-label">{field.labelAr}</div>
                            <div className="zd-doc-data-value">{blankFieldValue(field)}</div>
                          </td>
                        ))}
                        {pair.length === 1 && <td className="empty" />}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {repeaterFields.map((field) => {
              const rowLabels = field.blankRowLabels ?? [];
              const rowCount = Math.max(1, Math.min(20, field.blankRows ?? (rowLabels.length || 3)));
              return (
                <div key={field.key} className="zd-doc-repeater-wrap">
                  <div className="zd-doc-repeater-title">{field.labelAr}</div>
                  <table className="zd-doc-repeater">
                    <thead><tr>{field.columns?.map((column) => <th key={column.key}>{column.labelAr}</th>)}</tr></thead>
                    <tbody>
                      {Array.from({ length: rowCount }, (_, rowIndex) => (
                        <tr key={rowIndex}>
                          {field.columns?.map((column, columnIndex) => (
                            <td key={column.key}>
                              {columnIndex === 0 && rowLabels[rowIndex]
                                ? rowLabels[rowIndex]
                                : (column.type === "select" || column.type === "radio") && column.options?.length
                                  ? column.options.map((option) => `□ ${option.labelAr}`).join("   ")
                                  : "................................"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function AnnexPreviewSheet({
  annex,
  clauses,
  serialNumber,
  isDraft,
  annexNumber,
  partyOneRole,
  partyTwoRole,
}: {
  annex: OptionalClauseDefinition;
  clauses: RenderedLegalClause[];
  serialNumber: string;
  isDraft: boolean;
  annexNumber: number;
  partyOneRole: string;
  partyTwoRole: string;
}) {
  return (
    <article
      data-annex-number={annexNumber}
      className={`zdraft-document-page relative mx-auto min-h-[297mm] w-[210mm] min-w-[210mm] overflow-hidden border border-slate-200 bg-white px-[13mm] pb-[14mm] pt-[12mm] text-[#1a1a1a] shadow-sm print:break-before-page print:border-none print:shadow-none ${isDraft ? "select-none print:hidden" : "select-text"}`}
      onCopy={isDraft ? (event) => event.preventDefault() : undefined}
      onCut={isDraft ? (event) => event.preventDefault() : undefined}
      onContextMenu={isDraft ? (event) => event.preventDefault() : undefined}
      onDragStart={isDraft ? (event) => event.preventDefault() : undefined}
    >
      {isDraft && <DraftWatermark serialNumber={serialNumber} />}
      <div className="relative z-10">
        <div className="zd-doc-masthead">
          <div>
            <div className="zd-doc-office">Z draft</div>
            <div className="zd-doc-kind">ملحق تعاقدي — قالب فارغ للتعبئة اليدوية</div>
          </div>
          <img src="/logo.png" alt="Z draft" className="zd-doc-logo" />
        </div>
        <h2 className="zd-doc-title">{annex.documentTitleAr ?? annex.nameAr}</h2>
        <div className="zd-doc-meta">
          رقم الملحق: <span dir="ltr">................................</span>
          <span className="mx-2">|</span>
          تابع للعقد رقم: <span dir="ltr">................................</span>
          <span className="mx-2">|</span>
          تاريخ العقد: <span dir="ltr">.... / .... / ........</span>
        </div>

        <div className="zd-doc-annex-ref">
          هذا الملحق قالب فارغ للطباعة والتعبئة اليدوية؛ لم تُنقل إليه أي بيانات من العقد أو الـWizard، ويُستكمل بالكامل قبل اعتماده وتوقيعه.
        </div>

        <BlankDocumentDataSections steps={annex.insertedSteps} />

        {clauses.length > 0 && (
          <div className="zd-doc-clauses">
            {clauses.map((clause) => (
              <section key={clause.key} className="zd-doc-clause">
                <h3 className="zd-doc-clause-title">{clause.titleAr}</h3>
                <LegalTextBody text={clause.bodyAr} className="zd-doc-clause-body" />
              </section>
            ))}
          </div>
        )}

        <div className="zd-doc-signatures">
          <div className="zd-doc-signatures-title">التوقيعات على الملحق</div>
          <div className="zd-doc-signature-grid grid grid-cols-2 text-center">
            {[partyOneRole, partyTwoRole].map((role) => (
              <div key={role} className="zd-doc-signature-box space-y-1.5">
                <strong className="zd-doc-signature-role block">{role}</strong>
                <p>الاسم: ................................................</p>
                <p>الصفة: ................................................</p>
                <p>التوقيع: ................................................</p>
                <p>البصمة: ................................................</p>
              </div>
            ))}
          </div>
        </div>

        <footer className="zd-doc-final-note">
          هذا الملحق قالب فارغ؛ لم تُدرج فيه بيانات المستخدم تلقائيًا، ويجب استكماله يدويًا قبل اعتماده.
        </footer>
      </div>
    </article>
  );
}

export default function LegalDocumentSheet({
  serialNumber,
  templateSlug,
  templateNameAr,
  variantKey,
  selectedOptionalClauseKeys = [],
  fieldValues = {},
  status,
  activeFieldKey,
  activeFieldLabel,
}: Props) {
  const missingPreviewValue = "....................";

  const effectiveSlug =
    templateSlug ||
    (fieldValues.landlord_name || fieldValues.property_city
      ? "rental"
      : fieldValues.seller_name || fieldValues.sale_seller_name || fieldValues.sale_unit_city
        ? "apartment_sale"
        : "freelancer");

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
      return "preliminary_sale";
    }
    return templateDef.variants[0]?.key || "visual_identity_design";
  }, [variantKey, effectiveSlug, fieldValues, templateDef]);

  const resolvedDefinition = useMemo(() => {
    try {
      return resolveWizardDefinition(
        templateDef,
        effectiveVariantKey,
        selectedOptionalClauseKeys || [],
        fieldValues,
      );
    } catch {
      return null;
    }
  }, [effectiveVariantKey, fieldValues, selectedOptionalClauseKeys, templateDef]);

  const fieldDefinitionMap = useMemo(() => new Map<string, WizardFieldDefinition>(
    (resolvedDefinition?.steps ?? []).flatMap((step) => step.fields).map((field) => [field.key, field] as const),
  ), [resolvedDefinition]);

  const previewValue = (key: string, value: unknown) => {
    const definition = fieldDefinitionMap.get(key);
    return formatLegalValue(key, value, definition?.options ?? [], definition?.type);
  };

  const isRental = effectiveSlug === "rental";
  const isSale = effectiveSlug === "apartment_sale";
  const isFreelancer = effectiveSlug === "freelancer";
  const freelancerPartyTwoRole = effectiveVariantKey === "visual_identity_design"
    ? "المصمم"
    : effectiveVariantKey === "website_development"
      ? "مقدم الخدمة / المطور"
      : "مقدم الخدمة";
  const partyOneRole = isRental ? "الطرف الأول – المؤجر" : isSale ? "الطرف الأول – البائع" : "الطرف الأول – العميل";
  const partyTwoRole = isRental ? "الطرف الثاني – المستأجر" : isSale ? "الطرف الثاني – المشتري" : `الطرف الثاني – ${freelancerPartyTwoRole}`;

  // ─── Party 1 (Landlord / Seller / Client) ──────────────────────────────────
  const isPartyOneCompany = (fieldValues.landlord_party_type || fieldValues.seller_party_type || fieldValues.sale_seller_party_type || fieldValues.client_party_type || fieldValues.visual_client_party_type || fieldValues.website_client_party_type || fieldValues.social_client_party_type) === "company";
  const p1Name = isPartyOneCompany
    ? (fieldValues.landlord_company_name || fieldValues.seller_company_name || fieldValues.sale_seller_company_name || fieldValues.client_company_name || fieldValues.visual_client_company_name || fieldValues.website_client_company_name || fieldValues.social_client_company_name || "الشركة (الطرف الأول)")
    : (fieldValues.landlord_name || fieldValues.seller_name || fieldValues.sale_seller_name || fieldValues.client_name || fieldValues.visual_client_name || fieldValues.website_client_name || fieldValues.social_client_name || "الطرف الأول");
  const p1Nationality = fieldValues.landlord_nationality || fieldValues.seller_nationality || fieldValues.sale_seller_nationality || fieldValues.client_nationality || fieldValues.visual_client_nationality || fieldValues.website_client_nationality || fieldValues.social_client_nationality || missingPreviewValue;
  const isP1NonEgyptian = p1Nationality !== "مصري" && p1Nationality !== "مصري الجنسية" && p1Nationality !== "egyptian" && p1Nationality !== "مصرية" && p1Nationality !== missingPreviewValue;
  const p1NationalId = fieldValues.landlord_national_id || fieldValues.seller_national_id || fieldValues.sale_seller_national_id || fieldValues.client_national_id || fieldValues.visual_client_national_id || fieldValues.website_client_national_id || fieldValues.social_client_national_id || "";
  const p1IdIssuer = fieldValues.landlord_id_issuer || fieldValues.seller_id_issuer || fieldValues.sale_seller_id_issuer || fieldValues.visual_client_id_issuer || fieldValues.website_client_id_issuer || fieldValues.social_client_id_issuer || "";
  const p1IdIssueDateRaw = fieldValues.landlord_id_issue_date || fieldValues.seller_id_issue_date || fieldValues.sale_seller_id_issue_date || fieldValues.visual_client_id_issue_date || fieldValues.website_client_id_issue_date || fieldValues.social_client_id_issue_date;
  const p1IdIssueDate = p1IdIssueDateRaw ? formatLegalValue("date", p1IdIssueDateRaw) : "";
  const p1Address = isPartyOneCompany
    ? (fieldValues.landlord_company_address || fieldValues.seller_company_address || fieldValues.sale_seller_company_address || fieldValues.client_company_address || fieldValues.visual_client_company_address || fieldValues.website_client_company_address || fieldValues.social_client_company_address || fieldValues.landlord_address || fieldValues.seller_address || missingPreviewValue)
    : (fieldValues.landlord_address || fieldValues.seller_address || fieldValues.sale_seller_address || fieldValues.client_address || fieldValues.visual_client_address || fieldValues.website_client_address || fieldValues.social_client_address || missingPreviewValue);
  const p1Phone = fieldValues.landlord_phone || fieldValues.seller_phone || fieldValues.sale_seller_phone || fieldValues.client_phone || fieldValues.visual_client_phone || fieldValues.website_client_phone || fieldValues.social_client_phone || "";
  const p1Email = isPartyOneCompany
    ? (fieldValues.landlord_company_email || fieldValues.seller_company_email || fieldValues.sale_seller_company_email || fieldValues.client_company_email || fieldValues.visual_client_company_email || fieldValues.website_client_company_email || fieldValues.social_client_company_email || "")
    : (fieldValues.landlord_email || fieldValues.seller_email || fieldValues.sale_seller_email || fieldValues.client_email || fieldValues.visual_client_email || fieldValues.website_client_email || fieldValues.social_client_email || "");
  const p1Rep = isPartyOneCompany ? (fieldValues.landlord_legal_representative || fieldValues.seller_legal_representative || fieldValues.sale_seller_legal_representative || fieldValues.client_legal_representative || fieldValues.visual_client_legal_representative || fieldValues.website_client_legal_representative || fieldValues.social_client_legal_representative || "") : "";
  const p1RepCapacity = isPartyOneCompany ? (fieldValues.landlord_representative_capacity || fieldValues.seller_representative_capacity || fieldValues.sale_seller_representative_capacity || fieldValues.visual_client_representative_capacity || fieldValues.website_client_representative_capacity || fieldValues.social_client_representative_capacity || "") : "";
  const p1CommercialRegister = isPartyOneCompany ? (fieldValues.landlord_commercial_register || fieldValues.seller_commercial_register || fieldValues.sale_seller_commercial_register || fieldValues.visual_client_commercial_register || fieldValues.website_client_commercial_register || fieldValues.social_client_commercial_register || "") : "";
  const p1TaxCard = isPartyOneCompany ? (fieldValues.landlord_tax_card || fieldValues.seller_tax_card || fieldValues.sale_seller_tax_card || fieldValues.visual_client_tax_number || fieldValues.website_client_tax_number || fieldValues.social_client_tax_number || "") : "";
  const p1LegalForm = isPartyOneCompany ? (fieldValues.landlord_company_legal_form || fieldValues.seller_company_legal_form || fieldValues.sale_seller_company_legal_form || fieldValues.visual_client_company_legal_form || fieldValues.website_client_company_legal_form || fieldValues.social_client_company_legal_form || "") : "";

  // ─── Party 2 (Tenant / Buyer / Provider) ───────────────────────────────────
  const isPartyTwoCompany = (fieldValues.tenant_party_type || fieldValues.buyer_party_type || fieldValues.sale_buyer_party_type || fieldValues.provider_party_type || fieldValues.visual_provider_party_type || fieldValues.website_provider_party_type || fieldValues.social_provider_party_type) === "company";
  const p2Name = isPartyTwoCompany
    ? (fieldValues.tenant_company_name || fieldValues.buyer_company_name || fieldValues.sale_buyer_company_name || fieldValues.provider_company_name || fieldValues.visual_provider_company_name || fieldValues.website_provider_company_name || fieldValues.social_provider_company_name || "الشركة (الطرف الثاني)")
    : (fieldValues.tenant_name || fieldValues.buyer_name || fieldValues.sale_buyer_name || fieldValues.provider_name || fieldValues.visual_provider_name || fieldValues.website_provider_name || fieldValues.social_provider_name || "الطرف الثاني");
  const p2Nationality = fieldValues.tenant_nationality || fieldValues.buyer_nationality || fieldValues.sale_buyer_nationality || fieldValues.provider_nationality || fieldValues.visual_provider_nationality || fieldValues.website_provider_nationality || fieldValues.social_provider_nationality || missingPreviewValue;
  const isP2NonEgyptian = p2Nationality !== "مصري" && p2Nationality !== "مصري الجنسية" && p2Nationality !== "egyptian" && p2Nationality !== "مصرية" && p2Nationality !== missingPreviewValue;
  const p2NationalId = fieldValues.tenant_national_id || fieldValues.buyer_national_id || fieldValues.sale_buyer_national_id || fieldValues.provider_national_id || fieldValues.visual_provider_national_id || fieldValues.website_provider_national_id || fieldValues.social_provider_national_id || "";
  const p2IdIssuer = fieldValues.tenant_id_issuer || fieldValues.buyer_id_issuer || fieldValues.sale_buyer_id_issuer || fieldValues.visual_provider_id_issuer || fieldValues.website_provider_id_issuer || fieldValues.social_provider_id_issuer || "";
  const p2IdIssueDateRaw = fieldValues.tenant_id_issue_date || fieldValues.buyer_id_issue_date || fieldValues.sale_buyer_id_issue_date || fieldValues.visual_provider_id_issue_date || fieldValues.website_provider_id_issue_date || fieldValues.social_provider_id_issue_date;
  const p2IdIssueDate = p2IdIssueDateRaw ? formatLegalValue("date", p2IdIssueDateRaw) : "";
  const p2Address = isPartyTwoCompany
    ? (fieldValues.tenant_company_address || fieldValues.buyer_company_address || fieldValues.sale_buyer_company_address || fieldValues.provider_company_address || fieldValues.visual_provider_company_address || fieldValues.website_provider_company_address || fieldValues.social_provider_company_address || fieldValues.tenant_address || fieldValues.buyer_address || missingPreviewValue)
    : (fieldValues.tenant_address || fieldValues.buyer_address || fieldValues.sale_buyer_address || fieldValues.provider_address || fieldValues.visual_provider_address || fieldValues.website_provider_address || fieldValues.social_provider_address || missingPreviewValue);
  const p2Phone = fieldValues.tenant_phone || fieldValues.buyer_phone || fieldValues.sale_buyer_phone || fieldValues.provider_phone || fieldValues.visual_provider_phone || fieldValues.website_provider_phone || fieldValues.social_provider_phone || "";
  const p2Email = isPartyTwoCompany
    ? (fieldValues.tenant_company_email || fieldValues.buyer_company_email || fieldValues.sale_buyer_company_email || fieldValues.provider_company_email || fieldValues.visual_provider_company_email || fieldValues.website_provider_company_email || fieldValues.social_provider_company_email || "")
    : (fieldValues.tenant_email || fieldValues.buyer_email || fieldValues.sale_buyer_email || fieldValues.provider_email || fieldValues.visual_provider_email || fieldValues.website_provider_email || fieldValues.social_provider_email || "");
  const p2Rep = isPartyTwoCompany ? (fieldValues.tenant_legal_representative || fieldValues.buyer_legal_representative || fieldValues.sale_buyer_legal_representative || fieldValues.provider_legal_representative || fieldValues.visual_provider_legal_representative || fieldValues.website_provider_legal_representative || fieldValues.social_provider_legal_representative || "") : "";
  const p2RepCapacity = isPartyTwoCompany ? (fieldValues.tenant_representative_capacity || fieldValues.buyer_representative_capacity || fieldValues.sale_buyer_representative_capacity || fieldValues.visual_provider_representative_capacity || fieldValues.website_provider_representative_capacity || fieldValues.social_provider_representative_capacity || "") : "";
  const p2CommercialRegister = isPartyTwoCompany ? (fieldValues.tenant_commercial_register || fieldValues.buyer_commercial_register || fieldValues.sale_buyer_commercial_register || fieldValues.visual_provider_commercial_register || fieldValues.website_provider_commercial_register || fieldValues.social_provider_commercial_register || "") : "";
  const p2TaxCard = isPartyTwoCompany ? (fieldValues.tenant_tax_card || fieldValues.buyer_tax_card || fieldValues.sale_buyer_tax_card || fieldValues.visual_provider_tax_number || fieldValues.website_provider_tax_number || fieldValues.social_provider_tax_number || "") : "";
  const p2LegalForm = isPartyTwoCompany ? (fieldValues.tenant_company_legal_form || fieldValues.buyer_company_legal_form || fieldValues.sale_buyer_company_legal_form || fieldValues.visual_provider_company_legal_form || fieldValues.website_provider_company_legal_form || fieldValues.social_provider_company_legal_form || "") : "";

  // ─── Real Estate & Subject Details ─────────────────────────────────────────
  const governorate = fieldValues.property_governorate || fieldValues.sale_unit_governorate || missingPreviewValue;
  const city = fieldValues.property_city || fieldValues.sale_unit_city || "";
  const district = fieldValues.property_district || fieldValues.sale_unit_district || "";
  const street = fieldValues.property_street || fieldValues.sale_unit_street || "";
  const buildingNum = fieldValues.building_number || fieldValues.property_building_number || fieldValues.sale_building_number || fieldValues.sale_unit_building_number || "";
  const floorNum = fieldValues.floor_number || fieldValues.property_floor || fieldValues.sale_floor_number || fieldValues.sale_unit_floor || "";
  const unitNum = fieldValues.unit_number || fieldValues.property_unit_number || fieldValues.sale_unit_number || "";
  const area = fieldValues.property_area || fieldValues.property_area_sqm || fieldValues.sale_unit_area || fieldValues.sale_unit_area_sqm || "";
  const resPropertyType = fieldValues.residential_property_type || fieldValues.commercial_unit_type || "وحدة";
  const compoundName = fieldValues.residential_compound_name || fieldValues.sale_compound_name || fieldValues.commercial_project_name || fieldValues.administrative_project_name || fieldValues.commercial_mall_name || "";
  
  // Specific Commercial / Purpose Handling
  const commercialActivityName = fieldValues.commercial_activity_name || fieldValues.trade_name || fieldValues.commercial_activity_type || "";
  const commercialUnitType = fieldValues.commercial_unit_type || "";
  const displayPurpose = isRental
    ? (effectiveVariantKey === "commercial_lease"
        ? [commercialUnitType, commercialActivityName].filter(Boolean).join(" — ") || "وحدة تجارية"
        : effectiveVariantKey === "administrative_lease"
        ? [fieldValues.administrative_activity_name, fieldValues.administrative_purpose, fieldValues.administrative_activity_type].filter(Boolean).join(" — ") || "مقر إداري"
        : resPropertyType || "سكن خاص")
    : isSale
    ? fieldValues.sale_unit_type || resPropertyType || "وحدة سكنية"
    : "خدمات مهنية";

  const mezzanine = fieldValues.commercial_has_mezzanine;
  const facadeMeters = fieldValues.commercial_frontage_width || fieldValues.commercial_facade_length_meters;
  const hasStorage = fieldValues.commercial_has_storage ?? fieldValues.commercial_has_attached_storage;
  const hasLoading = fieldValues.commercial_has_loading_area;
  const rawLocationType = fieldValues.commercial_site_type || fieldValues.commercial_location_type;
  const locationType = rawLocationType ? previewValue("commercial_site_type", rawLocationType) : "";

  // Freelancer project variables
  const projectName = fieldValues.visual_project_name || fieldValues.website_project_name || fieldValues.social_project_name || "";
  const projectType = fieldValues.website_project_type ? previewValue("website_project_type", fieldValues.website_project_type) : fieldValues.social_business_nature || fieldValues.visual_project_brief || "";
  const managedPlatforms = fieldValues.social_managed_platforms || "";
  const scopeSummary = fieldValues.visual_project_purpose || fieldValues.visual_project_scope_summary || fieldValues.website_project_scope_summary || fieldValues.social_scope_summary || "";
  const duration = fieldValues.visual_execution_duration || fieldValues.website_contract_duration || fieldValues.social_contract_duration || (fieldValues.website_execution_duration_value ? `${fieldValues.website_execution_duration_value} ${fieldValues.website_execution_duration_unit || 'يوم عمل'}` : "");
  const durationBasis = fieldValues.website_duration_basis ? previewValue("website_duration_basis", fieldValues.website_duration_basis) : "";
  const feeAmount = fieldValues.visual_contract_value || fieldValues.website_total_price || fieldValues.social_fee || "";
  const feeNature = fieldValues.visual_fee_nature || fieldValues.social_fee_nature || "";
  const projectManager = fieldValues.website_project_manager || fieldValues.visual_project_manager || fieldValues.social_project_manager || "";
  const projectContactEmail = fieldValues.website_contact_email || fieldValues.visual_contact_email || fieldValues.social_contact_email || "";
  const approvalPerson = fieldValues.website_approval_person || fieldValues.visual_approval_person || fieldValues.social_approval_person || "";
  const billingContact = fieldValues.website_billing_contact || fieldValues.visual_billing_contact || fieldValues.social_billing_contact || "";

  // Jurisdiction Court
  const propertyCourt = city && governorate
    ? `محكمة ${city} الابتدائية (${governorate})`
    : city
    ? `محكمة ${city} الابتدائية`
    : governorate
    ? `محكمة ${governorate} الابتدائية`
    : "";

  const jurisdictionCourt =
    (fieldValues.rental_competent_court === "أخرى" ? fieldValues.rental_competent_court_other : fieldValues.rental_competent_court) ||
    (fieldValues.sale_competent_court === "أخرى" ? fieldValues.sale_competent_court_other : fieldValues.sale_competent_court) ||
    (fieldValues.visual_competent_court === "أخرى" ? fieldValues.visual_competent_court_other : fieldValues.visual_competent_court) ||
    (fieldValues.website_competent_court === "أخرى" ? fieldValues.website_competent_court_other : fieldValues.website_competent_court) ||
    (fieldValues.social_competent_court === "أخرى" ? fieldValues.social_competent_court_other : fieldValues.social_competent_court) ||
    fieldValues.rental_jurisdiction_court ||
    fieldValues.sale_jurisdiction_court ||
    (isRental || isSale ? propertyCourt : "") ||
    "";
  const isCustomJurisdictionCourt = [
    fieldValues.rental_competent_court,
    fieldValues.sale_competent_court,
    fieldValues.visual_competent_court,
    fieldValues.website_competent_court,
    fieldValues.social_competent_court,
  ].includes("أخرى");
  const jurisdictionCourtLabel = jurisdictionCourt
    ? (String(jurisdictionCourt).trim().startsWith("محكمة") ? String(jurisdictionCourt).trim() : `محكمة ${String(jurisdictionCourt).trim()}`)
    : "";
  const jurisdictionCourtDisplay = jurisdictionCourtLabel
    ? (isCustomJurisdictionCourt ? jurisdictionCourtLabel : `${jurisdictionCourtLabel} الابتدائية ودوائرها الجزئية بحسب الأحوال`)
    : "";

  // Meters
  const electricityMeter = fieldValues.electricity_meter || fieldValues.sale_electricity_meter || "";
  const electricityMeterTypeKey = fieldValues.electricity_meter_type ? "electricity_meter_type" : "sale_electricity_meter_type";
  const electricityMeterType = previewValue(electricityMeterTypeKey, fieldValues[electricityMeterTypeKey] || "");
  const waterMeter = fieldValues.water_meter || fieldValues.sale_water_meter || "";
  const waterMeterTypeKey = fieldValues.water_meter_type ? "water_meter_type" : "sale_water_meter_type";
  const waterMeterType = previewValue(waterMeterTypeKey, fieldValues[waterMeterTypeKey] || "");
  const gasMeter = fieldValues.gas_meter || fieldValues.sale_gas_meter || "";
  const gasMeterTypeKey = fieldValues.gas_meter_type ? "gas_meter_type" : "sale_gas_meter_type";
  const gasMeterType = previewValue(gasMeterTypeKey, fieldValues[gasMeterTypeKey] || "");

  // ─── Financials & Duration ────────────────────────────────────────────────
  const rawContractDate = String(fieldValues.contract_date || fieldValues.visual_contract_date || fieldValues.website_contract_date || fieldValues.social_contract_date || "");
  const formattedContractDate = rawContractDate && /^\d{4}-\d{2}-\d{2}$/.test(rawContractDate)
    ? rawContractDate.split("-").reverse().join("/")
    : rawContractDate || missingPreviewValue;

  // ─── Witnesses ────────────────────────────────────────────────────────────
  const witnessPrefix = isRental ? "rental" : isSale ? "sale" : effectiveVariantKey === "visual_identity_design" ? "visual" : effectiveVariantKey === "website_development" ? "website" : "social";
  const witness1Enabled = fieldValues[`${witnessPrefix}_witness_1_enabled`] === true;
  const witness2Enabled = fieldValues[`${witnessPrefix}_witness_2_enabled`] === true;
  const witness1Name = fieldValues[`${witnessPrefix}_witness_1_name`] || "";
  const witness1Id = fieldValues[`${witnessPrefix}_witness_1_national_id`] || "";
  const witness2Name = fieldValues[`${witnessPrefix}_witness_2_name`] || "";
  const witness2Id = fieldValues[`${witnessPrefix}_witness_2_national_id`] || "";

  // ─── Render All Authoritative Legal Clauses ───────────────────────────────
  const renderedClauses: RenderedLegalClause[] = useMemo(() => {
    try {
      return renderLegalClauses(templateDef, effectiveVariantKey, selectedOptionalClauseKeys || [], fieldValues);
    } catch (e) {
      console.warn("Could not render legal clauses dynamically:", e);
      return [];
    }
  }, [templateDef, effectiveVariantKey, selectedOptionalClauseKeys, fieldValues]);

  const separateAnnexes = useMemo<OptionalClauseDefinition[]>(() => {
    const variant = resolvedDefinition?.variant;
    if (!variant) return [];
    return templateDef.optionalClauses.filter((annex) => {
      if (annex.outputMode !== "separate_annex") return false;
      if (!variant.allowedOptionalClauseKeys.includes(annex.key) || !annex.applicableVariantKeys.includes(variant.key)) return false;
      return Boolean(selectedOptionalClauseKeys?.includes(annex.key));
    });
  }, [resolvedDefinition, selectedOptionalClauseKeys, templateDef]);

  const separateClauseKeys = useMemo(
    () => new Set(separateAnnexes.flatMap((annex) => annex.legalClauseKeys)),
    [separateAnnexes],
  );
  const mainRenderedClauses = useMemo(
    () => renderedClauses.filter((clause) => !separateClauseKeys.has(clause.key)),
    [renderedClauses, separateClauseKeys],
  );

  const activeKey = (activeFieldKey ?? "").toLowerCase();
  const activePreamble = Boolean(activeKey) && /(?:^|_)contract_date$/.test(activeKey);
  const activePartyOne = Boolean(activeKey) && (
    activeKey.startsWith("landlord_") ||
    activeKey.startsWith("seller_") ||
    activeKey.startsWith("sale_seller_") ||
    activeKey.includes("_client_") ||
    activeKey.startsWith("client_")
  );
  const activePartyTwo = Boolean(activeKey) && (
    activeKey.startsWith("tenant_") ||
    activeKey.startsWith("buyer_") ||
    activeKey.startsWith("sale_buyer_") ||
    activeKey.includes("_provider_") ||
    activeKey.startsWith("provider_")
  );
  const activeJurisdiction = Boolean(activeKey) && (activeKey.includes("court") || activeKey.includes("jurisdiction"));
  const activeWitnesses = Boolean(activeKey) && activeKey.includes("witness");
  const activeCommunications = Boolean(activeKey) && /(notice|messaging|communication|email_notices|project_platform)/.test(activeKey);
  const activeOptionalTerms = Boolean(activeKey) && /(optional|legal_fees|tax|vat|penalty)/.test(activeKey);
  const activeUnit = Boolean(activeKey) && !isFreelancer && /(?:^|_)(?:property|building|floor|unit|rooms|reception|bathrooms|balconies|electricity|water|gas|commercial|administrative|residential)(?:_|$)|meter/.test(activeKey);
  const activeProject = Boolean(activeKey) && isFreelancer && /project_name|project_type|project_brief|project_purpose|scope_summary|managed_platforms|business_nature|execution_duration|duration_basis|contract_duration|contract_value|total_price|social_fee|fee_nature|project_manager|contact_email|approval_person|billing_contact/.test(activeKey);

  const activeClauseKeys = useMemo(() => {
    if (!activeFieldKey) return new Set<string>();
    return new Set(
      (templateDef.legalClauses ?? [])
        .filter((clause) => clause.variables?.includes(activeFieldKey))
        .map((clause) => clause.key),
    );
  }, [activeFieldKey, templateDef]);
  const primaryActiveClauseKey = mainRenderedClauses.find((clause) => activeClauseKeys.has(clause.key))?.key;
  const activeBlockClass = "relative rounded-sm ring-2 ring-[#d9a84e] ring-offset-2 ring-offset-white transition-shadow duration-200";

  const docTitle =
    resolvedDefinition?.variant.documentTitleAr ||
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
  const isDraft = status !== "issued";

  return (
    <A4PreviewScaler>
    <div className="space-y-5">
      {isDraft && (
        <div className="hidden border-2 border-red-700 p-8 text-center text-xl font-black text-red-800 print:block">
          هذه معاينة محمية وغير صالحة للطباعة أو الاستخدام. تُتاح النسخة النهائية بعد إصدار العقد.
        </div>
      )}
      <article
        className={`zdraft-document-page relative mx-auto min-h-[297mm] w-[210mm] min-w-[210mm] overflow-hidden border border-slate-200 bg-white px-[13mm] pb-[14mm] pt-[12mm] text-[#1a1a1a] shadow-sm print:border-none print:shadow-none ${isDraft ? "select-none print:hidden" : "select-text"}`}
        onCopy={isDraft ? (event) => event.preventDefault() : undefined}
        onCut={isDraft ? (event) => event.preventDefault() : undefined}
        onContextMenu={isDraft ? (event) => event.preventDefault() : undefined}
        onDragStart={isDraft ? (event) => event.preventDefault() : undefined}
      >

      {isDraft && <DraftWatermark serialNumber={serialNumber} />}

      {/* Print-faithful header: matches the WeasyPrint document hierarchy. */}
      <div
        id="doc-preamble"
        data-active-preview={activePreamble ? "exact" : undefined}
        className={`relative z-10 scroll-mt-28 ${activePreamble ? activeBlockClass : ""}`}
      >
        {activePreamble && <LiveFieldMarker label={activeFieldLabel} />}
        <div className="zd-doc-masthead">
          <div>
            <div className="zd-doc-office">Z draft</div>
          </div>
          <img src="/logo.png" alt="Z draft" className="zd-doc-logo" />
        </div>
        <h1 className="zd-doc-title">{docTitle}</h1>
        <div className="zd-doc-meta">
          رقم المستند: <span dir="ltr" className="font-bold">{serialNumber}</span>
          <span className="mx-2">|</span>
          تاريخ العقد: <span dir="ltr">{formattedContractDate}</span>
        </div>
      </div>

      {/* Contract Body */}
      <div className="zd-doc-body relative z-10 text-justify text-slate-800">

        {/* Parties Block */}
        <div className="space-y-2 border-b border-slate-200 pb-3 pt-0.5 mb-3">
          {/* Party 1 */}
          <div
            id="doc-party-1"
            data-active-preview={activePartyOne ? "exact" : undefined}
            className={`space-y-1 scroll-mt-28 ${activePartyOne ? activeBlockClass : ""}`}
          >
            {activePartyOne && <LiveFieldMarker label={activeFieldLabel} />}
            <strong className="zd-doc-party-title block">
              أولاً: {isPartyOneCompany ? "السادة / " : "السيد / "}{isRental ? "المؤجر" : isSale ? "البائع" : "العميل"} (الطرف الأول):
            </strong>
            {isPartyOneCompany ? (
              <p className="zd-doc-party-line">
                <b>الشركة:</b> {p1Name} {p1LegalForm ? `(${p1LegalForm})` : ""}
                {p1CommercialRegister && <> — <b>سجل تجاري:</b> <span dir="ltr" className="font-mono font-bold">{p1CommercialRegister}</span></>}
                {p1TaxCard && <> — <b>بطاقة ضريبية:</b> <span dir="ltr" className="font-mono font-bold">{p1TaxCard}</span></>}
                {p1Rep && <> — <b>يمثلها قانونًا:</b> {p1Rep} {p1RepCapacity ? `(بصفته ${p1RepCapacity})` : ""}</>}
                {p1Address && <> — <b>المقر الرئيسي:</b> {p1Address}</>}
                {p1Phone && <> — <b>الهاتف:</b> <span dir="ltr" className="font-mono">{p1Phone}</span></>}
                {p1Email && <> — <b>البريد:</b> <span dir="ltr">{p1Email}</span></>}.
              </p>
            ) : (
              <p className="zd-doc-party-line">
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
          <div
            id="doc-party-2"
            data-active-preview={activePartyTwo ? "exact" : undefined}
            className={`space-y-1 scroll-mt-28 pt-1 ${activePartyTwo ? activeBlockClass : ""}`}
          >
            {activePartyTwo && <LiveFieldMarker label={activeFieldLabel} />}
            <strong className="zd-doc-party-title block">
              ثانياً: {isPartyTwoCompany ? "السادة / " : "السيد / "}{isRental ? "المستأجر" : isSale ? "المشتري" : freelancerPartyTwoRole} (الطرف الثاني):
            </strong>
            {isPartyTwoCompany ? (
              <p className="zd-doc-party-line">
                <b>الشركة:</b> {p2Name} {p2LegalForm ? `(${p2LegalForm})` : ""}
                {p2CommercialRegister && <> — <b>سجل تجاري:</b> <span dir="ltr" className="font-mono font-bold">{p2CommercialRegister}</span></>}
                {p2TaxCard && <> — <b>بطاقة ضريبية:</b> <span dir="ltr" className="font-mono font-bold">{p2TaxCard}</span></>}
                {p2Rep && <> — <b>يمثلها قانونًا:</b> {p2Rep} {p2RepCapacity ? `(بصفته ${p2RepCapacity})` : ""}</>}
                {p2Address && <> — <b>المقر الرئيسي:</b> {p2Address}</>}
                {p2Phone && <> — <b>الهاتف:</b> <span dir="ltr" className="font-mono">{p2Phone}</span></>}
                {p2Email && <> — <b>البريد:</b> <span dir="ltr">{p2Email}</span></>}.
              </p>
            ) : (
              <p className="zd-doc-party-line">
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

        {/* ─── FULL OFFICIAL LEGAL CLAUSES (المواد القانونية الرسمية الكاملة) ─── */}
        <div className="zd-doc-clauses">
          {mainRenderedClauses.length > 0 ? (
            mainRenderedClauses.map((clause) => {
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
                  : k.includes("jurisdiction") || k.includes("court") || k.endsWith("_source_article_21")
                  ? "jurisdiction"
                  : k.includes("optional") || k.includes("fees") || k.includes("vat")
                  ? "optional-clauses"
                  : undefined;

              const groupActive =
                (activeCommunications && dataTarget === "communications") ||
                (activeOptionalTerms && (dataTarget === "optional-clauses" || dataTarget === "delay-penalty")) ||
                (activeJurisdiction && dataTarget === "jurisdiction");
              const clauseActive = activeClauseKeys.has(clause.key) || groupActive;
              const showClauseMarker = clauseActive && (clause.key === primaryActiveClauseKey || (!primaryActiveClauseKey && groupActive));

              return (
                <div
                  key={clause.key}
                  id={`doc-clause-${clause.key}`}
                  data-target={dataTarget}
                  data-active-preview={activeClauseKeys.has(clause.key) ? "exact" : clauseActive ? "true" : undefined}
                  className={`zd-doc-clause scroll-mt-28 ${clauseActive ? activeBlockClass : ""}`}
                >
                  {showClauseMarker && <LiveFieldMarker label={activeFieldLabel} />}
                  <h3 className="zd-doc-clause-title">
                    {clause.titleAr}
                  </h3>

                  {/* Render Article Body */}
                  <LegalTextBody text={clause.bodyAr} className="zd-doc-clause-body" />
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
        <div
          id="doc-signatures"
          data-active-preview={activeWitnesses ? "exact" : undefined}
          className={`zd-doc-signatures scroll-mt-28 ${activeWitnesses ? activeBlockClass : ""}`}
        >
          {activeWitnesses && <LiveFieldMarker label={activeFieldLabel} />}
          <div className="zd-doc-signatures-title">التوقيعات</div>
          <div className="zd-doc-signature-grid grid grid-cols-2 text-center">
            <div className="zd-doc-signature-box space-y-1.5">
              <strong className="zd-doc-signature-role block">
                {partyOneRole}
              </strong>
              <p className="text-[11px] text-slate-700 font-bold">{p1Rep ? `${p1Rep} (عن ${p1Name})` : p1Name}</p>
              <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            </div>

            <div className="zd-doc-signature-box space-y-1.5">
              <strong className="zd-doc-signature-role block">
                {partyTwoRole}
              </strong>
              <p className="text-[11px] text-slate-700 font-bold">{p2Rep ? `${p2Rep} (عن ${p2Name})` : p2Name}</p>
              <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            </div>
          </div>

          {(witness1Enabled || witness2Enabled) && (
          <div className="grid grid-cols-2 gap-8 pt-1 text-center">
            {witness1Enabled && <div className="space-y-1 rounded-sm border border-slate-200 p-2.5 text-[11px]">
              <strong className="block font-bold text-slate-900">الشاهد الأول:</strong>
              <p className="text-slate-700">{witness1Name || missingPreviewValue}</p>
              <p className="font-mono text-[10px] text-slate-500">الرقم القومي: {witness1Id || missingPreviewValue}</p>
              <div className="h-6 border-b border-dotted border-slate-400 w-1/2 mx-auto mt-1" />
            </div>}
            {witness2Enabled && <div className="space-y-1 rounded-sm border border-slate-200 p-2.5 text-[11px]">
              <strong className="block font-bold text-slate-900">الشاهد الثاني:</strong>
              <p className="text-slate-700">{witness2Name || missingPreviewValue}</p>
              <p className="font-mono text-[10px] text-slate-500">الرقم القومي: {witness2Id || missingPreviewValue}</p>
              <div className="h-6 border-b border-dotted border-slate-400 w-1/2 mx-auto mt-1" />
            </div>}
          </div>
          )}
        </div>

      </div>

      <div className="zd-doc-final-note relative z-10">
        النسخة الإلكترونية المرجعية لهذا العقد محفوظة في سجل العقد برقم المستند المبين أعلاه.
      </div>

      </article>

      {separateAnnexes.map((annex, index) => (
        <AnnexPreviewSheet
          key={annex.key}
          annex={annex}
          clauses={renderedClauses.filter((clause) => annex.legalClauseKeys.includes(clause.key))}
          serialNumber={serialNumber}
          isDraft={isDraft}
          annexNumber={index + 1}
          partyOneRole={partyOneRole}
          partyTwoRole={partyTwoRole}
        />
      ))}
    </div>
    </A4PreviewScaler>
  );
}
