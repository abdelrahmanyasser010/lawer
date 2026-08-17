"use client";

import React from "react";
import { CheckCircle2, Copy, FileText, Printer, Scale, ShieldCheck } from "lucide-react";

interface Props {
  serialNumber: string;
  templateSlug?: string;
  templateNameAr?: string;
  fieldValues: Record<string, any>;
  status: string;
  isPaid?: boolean;
}

export const legalLabelDictionary: Record<string, string> = {
  // Parties
  sale_seller_name: "البائع (الطرف الأول)",
  sale_seller_party_type: "الصفة القانونية للبائع",
  sale_seller_national_id: "الرقم القومي للبائع",
  sale_seller_address: "محل إقامة البائع",
  sale_buyer_name: "المشتري (الطرف الثاني)",
  sale_buyer_party_type: "الصفة القانونية للمشتري",
  sale_buyer_national_id: "الرقم القومي للمشتري",
  sale_buyer_address: "محل إقامة المشتري",

  landlord_name: "المؤجر (الطرف الأول)",
  landlord_party_type: "الصفة القانونية للمؤجر",
  landlord_national_id: "الرقم القومي للمؤجر",
  tenant_name: "المستأجر (الطرف الثاني)",
  tenant_party_type: "الصفة القانونية للمستأجر",
  tenant_national_id: "الرقم القومي للمستأجر",

  employer_name: "صاحب العمل (الطرف الأول)",
  employee_name: "العامل (الطرف الثاني)",
  client_name: "العميل (الطرف الأول)",
  provider_name: "مقدم الخدمة (الطرف الثاني)",

  // Subject Details
  sale_unit_governorate: "محافظة الوحدة المبيعة",
  sale_unit_city: "مدينة / حي الوحدة المبيعة",
  sale_unit_street: "عنوان الوحدة المبيعة",
  sale_unit_building_number: "رقم العقار",
  sale_unit_floor: "الطابق",
  sale_unit_area_sqm: "مساحة الوحدة (م²)",
  property_governorate: "محافظة العين المؤجرة",
  property_city: "مدينة / منطقة العين المؤجرة",
  property_street: "عنوان العين المؤجرة",
  property_building_number: "رقم العقار",
  property_floor: "الطابق",
  property_area_sqm: "المساحة الإجمالية (م²)",

  // Financials
  sale_total_price: "الثمن المتفق عليه",
  sale_payment_plan: "آلية سداد الثمن",
  sale_deposit_amount: "مقدم التعاقد",
  rent_monthly_amount: "القيمة الإيجارية الشهرية",
  deposit_amount: "مبلغ التأمين",
  service_fee_amount: "المقابل المالي للخدمة",
  salary_amount: "الأجر الشهري المتفق عليه",

  // Dates & Other
  contract_date: "تاريخ تحرير العقد",
  lease_start_date: "تاريخ بدء سريان العقد",
  lease_duration_years: "مدة سريان العقد",
  handover_date: "تاريخ تسليم المبيع / العين",
};

export const legalValueDictionary: Record<string, string> = {
  individual: "فرد",
  company: "شركة / منشأة",
  full: "سداد كامل القيمة عند توقيع هذا العقد",
  installments: "سداد على أقساط محددة وفق جدول الدفعات",
  cash: "نقدًا مع إيصال مخالصة",
  bank_transfer: "تحويل بنكي معتمد",
  residential: "سكني",
  commercial: "تجاري / إداري",
  residential_lease: "إيجار سكني",
  commercial_lease: "إيجار تجاري",
  preliminary_sale: "بيع ابتدائي",
  final_sale: "بيع نهائي",
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
    key.includes("salary")
  ) {
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) {
      return `${num.toLocaleString("ar-EG")} ج.م`;
    }
  }

  if (key.includes("area") || key.includes("sqm")) {
    return `${value} متر مربع`;
  }

  return strVal;
}

export default function LegalDocumentSheet({
  serialNumber,
  templateSlug,
  templateNameAr,
  fieldValues = {},
  status,
  isPaid,
}: Props) {
  const isRental = templateSlug === "rental" || Boolean(fieldValues.landlord_name);
  const isEmployment = templateSlug === "employment" || Boolean(fieldValues.employer_name);

  // Extract Key Parties & Values safely
  const isCompanyPartyOne = (fieldValues.sale_seller_party_type || fieldValues.landlord_party_type) === "company";
  const partyOneName = isCompanyPartyOne
    ? (fieldValues.landlord_company_name || fieldValues.sale_seller_company_name || fieldValues.client_company_name || fieldValues.sale_seller_name || fieldValues.landlord_name || "الطرف الأول (شركة)")
    : (fieldValues.sale_seller_name || fieldValues.landlord_name || fieldValues.employer_name || fieldValues.client_name || "الطرف الأول");
  const partyOneType = formatLegalValue("party_type", fieldValues.sale_seller_party_type || fieldValues.landlord_party_type || "individual");
  const partyOneAddress = fieldValues.sale_seller_address || fieldValues.landlord_address || fieldValues.sale_unit_governorate || "جمهورية مصر العربية";
  const partyOneNationalId = fieldValues.landlord_national_id || fieldValues.sale_seller_national_id || fieldValues.client_national_id || "";

  const isCompanyPartyTwo = (fieldValues.sale_buyer_party_type || fieldValues.tenant_party_type) === "company";
  const partyTwoName = isCompanyPartyTwo
    ? (fieldValues.tenant_company_name || fieldValues.sale_buyer_company_name || fieldValues.provider_company_name || fieldValues.sale_buyer_name || fieldValues.tenant_name || "الطرف الثاني (شركة)")
    : (fieldValues.sale_buyer_name || fieldValues.tenant_name || fieldValues.employee_name || fieldValues.provider_name || "الطرف الثاني");
  const partyTwoType = formatLegalValue("party_type", fieldValues.sale_buyer_party_type || fieldValues.tenant_party_type || "individual");
  const partyTwoAddress = fieldValues.sale_buyer_address || fieldValues.tenant_address || "جمهورية مصر العربية";
  const partyTwoNationalId = fieldValues.tenant_national_id || fieldValues.sale_buyer_national_id || fieldValues.provider_national_id || "";

  const governorate = fieldValues.sale_unit_governorate || fieldValues.property_governorate || "القاهرة";
  const city = fieldValues.sale_unit_city || fieldValues.property_city || "مدينة نصر";
  const street = fieldValues.sale_unit_street || fieldValues.property_street || "";
  const buildingNumber = fieldValues.property_building_number || fieldValues.sale_unit_building_number || "";
  const floorNumber = fieldValues.property_floor || fieldValues.sale_unit_floor || "";
  const unitNumber = fieldValues.property_unit_number || fieldValues.sale_unit_number || "";
  const area = fieldValues.sale_unit_area_sqm || fieldValues.property_area_sqm || "";
  const activityType = fieldValues.commercial_activity_type || fieldValues.property_usage_purpose || "";

  const priceOrRent = fieldValues.sale_total_price || fieldValues.rent_monthly_amount || fieldValues.salary_amount || 0;
  const formattedFinancial = formatLegalValue("sale_total_price", priceOrRent);
  const paymentPlan = formatLegalValue("sale_payment_plan", fieldValues.sale_payment_plan || fieldValues.payment_method || "full");
  const deposit = fieldValues.deposit_amount ? formatLegalValue("deposit_amount", fieldValues.deposit_amount) : null;

  // Format Dates
  const rawContractDate = String(fieldValues.contract_date || "");
  const formattedContractDate = rawContractDate && /^\d{4}-\d{2}-\d{2}$/.test(rawContractDate)
    ? rawContractDate.split("-").reverse().join("/")
    : rawContractDate || "....................";

  const rawStartDate = String(fieldValues.start_date || "");
  const formattedStartDate = rawStartDate && /^\d{4}-\d{2}-\d{2}$/.test(rawStartDate)
    ? rawStartDate.split("-").reverse().join("/")
    : rawStartDate || "";

  const rawEndDate = String(fieldValues.end_date || "");
  const formattedEndDate = rawEndDate && /^\d{4}-\d{2}-\d{2}$/.test(rawEndDate)
    ? rawEndDate.split("-").reverse().join("/")
    : rawEndDate || "";

  const durationText = String(fieldValues.lease_duration_text || fieldValues.duration_months || "");

  const docTitle = templateNameAr || (isRental ? "عقد إيجار خاضع لأحكام القانون المدني" : isEmployment ? "عقد عمل فردي محدد المدة" : "عقد بيع ابتدائي لوحدة سكنية");

  return (
    <div className="relative mx-auto w-full max-w-[820px] rounded-2xl border border-slate-300 bg-white p-6 sm:p-10 shadow-lg print:shadow-none print:border-none font-sans select-text overflow-hidden">

      {/* Repeating Diagonal Watermark for Draft Mode */}
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

      {/* Official Top Seal & Header */}
      <div className="relative z-10 text-center pb-4 border-b-2 border-[#00102e]">
        <p className="text-xs font-serif font-bold text-slate-600 tracking-widest">
          بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ
        </p>
        <h1 className="mt-2.5 text-lg sm:text-2xl font-black text-[#00102e] tracking-tight">
          {docTitle}
        </h1>
        <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] text-slate-500 font-mono">
          <span>رقم الوثيقة: {serialNumber}</span>
          <span>•</span>
          <span className="font-sans font-bold text-[#986410]">
            {status === "issued" ? "نسخة معتمدة صادرة" : "مسودة معاينة حية"}
          </span>
        </div>
      </div>

      {/* Contract Body with Formal Arabic Legal Layout */}
      <div className="relative z-10 mt-5 space-y-5 text-xs sm:text-[12.5px] leading-7 text-slate-800 text-justify">

        {/* Preamble / Introduction */}
        <p className="font-bold text-slate-900 leading-relaxed bg-slate-50/90 p-3 rounded-xl border border-slate-200">
          إنه في يوم الموافق <strong className="text-[#00102e] font-black underline decoration-[#986410] underline-offset-4">{formattedContractDate}</strong>، بجمهورية مصر العربية، تم الاتفاق والتراضي بين كل من:
        </p>

        {/* Parties Block */}
        <div className="space-y-3 rounded-xl bg-slate-50/90 p-4 border border-slate-200">
          <div className="space-y-1 border-b border-slate-200 pb-2.5">
            <div className="flex items-center justify-between">
              <strong className="text-xs sm:text-sm font-black text-[#00102e]">
                أولاً: {isRental ? "السيد / المؤجر" : isEmployment ? "السيد / صاحب العمل" : "السيد / البائع"} (الطرف الأول):
              </strong>
              <span className="rounded-md bg-white border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-[#986410]">{partyOneType}</span>
            </div>
            <p className="text-xs text-slate-700 leading-6">
              <b>الاسم / الكيان:</b> {partyOneName}
              {partyOneNationalId && <> — <b>الرقم القومي / السجل:</b> <span dir="ltr" className="font-mono font-bold">{partyOneNationalId}</span></>}
              {partyOneAddress && <> — <b>المحل المختار / الإقامة:</b> {partyOneAddress}</>}.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-xs sm:text-sm font-black text-[#00102e]">
                ثانياً: {isRental ? "السيد / المستأجر" : isEmployment ? "السيد / العامل" : "السيد / المشتري"} (الطرف الثاني):
              </strong>
              <span className="rounded-md bg-white border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-[#986410]">{partyTwoType}</span>
            </div>
            <p className="text-xs text-slate-700 leading-6">
              <b>الاسم / الكيان:</b> {partyTwoName}
              {partyTwoNationalId && <> — <b>الرقم القومي / السجل:</b> <span dir="ltr" className="font-mono font-bold">{partyTwoNationalId}</span></>}
              {partyTwoAddress && <> — <b>المحل المختار / الإقامة:</b> {partyTwoAddress}</>}.
            </p>
          </div>
        </div>

        {/* Contract Recitals / Tamheed */}
        <div className="space-y-1.5">
          <h3 className="font-black text-slate-900 text-xs sm:text-[13px] border-r-3 border-[#986410] pr-2">تمهيد:</h3>
          <p className="leading-7 text-slate-700">
            {isRental ? (
              <>حيث يمتلك الطرف الأول العين الكائنة في ({city}، بمحافظة {governorate})، ورغب الطرف الثاني في استئجارها للانتفاع بها، وبعد أن أقر الطرفان بأهليتهما القانونية المعتبرة شرعاً وقانوناً للتصرف والتعاقد وخلوهما من كافة الموانع، فقد اتفقا على البنود الآتية:</>
            ) : isEmployment ? (
              <>حيث رغب الطرف الأول في الاستعانة بخبرات الطرف الثاني للعمل لديه، وتلاقت إرادة الطرفين على التعاقد وفقاً لأحكام قانون العمل المصري، فقد اتفقا على البنود الآتية:</>
            ) : (
              <>حيث يمتلك الطرف الأول كامل الوحدة السكنية الكائنة في ({city}، بمحافظة {governorate})، ورغب الطرف الثاني في شرائها وتملكها، وبعد أن أقر الطرفان بكامل أهليتهما للتعاقد وخلوهما من كافة الموانع القانونية، فقد تم الاتفاق على البنود الآتية:</>
            )}
          </p>
        </div>

        {/* Articles / Clauses */}
        <div className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <h4 className="font-black text-slate-900 text-xs sm:text-[13px] text-[#00102e]">البند الأول (التمهيد):</h4>
            <p className="text-slate-700 leading-6">
              يعتبر التمهيد السابق جزءاً لا يتجزأ من هذا العقد وبنداً من بنوده ومفسراً ومتمماً لكافة أحكامه والتزاماته.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-black text-slate-900 text-xs sm:text-[13px] text-[#00102e]">البند الثاني (محل التعاقد والمواصفات):</h4>
            <p className="text-slate-700 leading-6">
              {isRental ? (
                <>أجر الطرف الأول للطرف الثاني القابل لذلك العين الكائنة في ({street ? `${street}، ` : ""}{city}، محافظة {governorate}) {buildingNumber ? `عقار رقم (${buildingNumber}) ` : ""}{floorNumber ? `بالدور (${floorNumber}) ` : ""}{unitNumber ? `وحدة رقم (${unitNumber}) ` : ""}{area ? `البالغ مساحتها حوالي (${area}) متر مربع ` : ""}{activityType ? `والمخصصة بغرض (${activityType}) ` : "بغرض الاستعمال المعتاد "}وفقاً للقوانين واللوائح السارية والشروط الواردة بهذا العقد.</>
              ) : (
                <>باع وأسقط وتنازل الطرف الأول بكافة الضمانات القانونية والفعلية إلى الطرف الثاني القابل لذلك الوحدة السكنية الكائنة في ({street ? `${street}، ` : ""}{city}، محافظة {governorate}) {buildingNumber ? `عقار رقم (${buildingNumber}) ` : ""}{floorNumber ? `بالدور (${floorNumber}) ` : ""}{area ? `والبالغ مساحتها الإجمالية (${area}) متر مربع ` : ""}شاملة كافة المرافق والحصص الشائعة في الأرض والأجزاء المشتركة.</>
              )}
            </p>
          </div>

          {isRental && (durationText || formattedStartDate) && (
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-xs sm:text-[13px] text-[#00102e]">البند الثالث (مدة العقد):</h4>
              <p className="text-slate-700 leading-6">
                مدة هذا الإيجار هي {durationText ? <strong className="text-slate-900 font-black">({durationText})</strong> : "المدة المحددة بالعقد"}
                {formattedStartDate && <> تبدأ من تاريخ <strong className="text-slate-900 font-black">{formattedStartDate}</strong></>}
                {formattedEndDate && <> وتنتهي في <strong className="text-slate-900 font-black">{formattedEndDate}</strong></>}
                ، وتُعد العين مسلمة للطرف الثاني بحالة صالحة للاستعمال المتفق عليه، ويلتزم بتسليمها عند انتهاء المدة بذات الحالة.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <h4 className="font-black text-slate-900 text-xs sm:text-[13px] text-[#00102e]">
              {isRental ? "البند الرابع (القيمة الإيجارية والتأمين):" : "البند الثالث (الثمن المتفق عليه وآلية السداد):"}
            </h4>
            <p className="text-slate-700 leading-6">
              {isRental ? (
                <>تم هذا الإيجار نظير أجرة شهرية متفق عليها قدرها <strong className="text-slate-900 font-black">({formattedFinancial})</strong> تُسدد مقدماً في الموعد المحدد، مع سداد مبلغ تأمين نقدي قدره <strong className="text-slate-900 font-black">({deposit || "مبلغ التأمين المحدد"})</strong> يُرد للمستأجر عند انتهاء العقد وتسليم العين بحالتها الأصلية وخلو طرفه من فواتير المرافق.</>
              ) : (
                <>تم هذا البيع ورضي الطرفان بثمن إجمالي متفق عليه قدره <strong className="text-slate-900 font-black">({formattedFinancial})</strong> تم الاتفاق على أدائه وفقاً لآلية: <strong className="text-slate-900 font-black">{paymentPlan}</strong>، ويعتبر توقيع الطرف الأول على هذا العقد مخالصة تامة وسنداً باستلام المبالغ المتفق عليها.</>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-black text-slate-900 text-xs sm:text-[13px] text-[#00102e]">
              {isRental ? "البند الخامس (المعاينة والمحافظة على العين):" : "البند الرابع (المعاينة والالتزامات):"}
            </h4>
            <p className="text-slate-700 leading-6">
              يقر الطرف الثاني بأنه قد عاين محل العقد المعاينة التامة النافية للجهالة شرعاً وقانوناً، وقبله بحالته الراهنة دون أي تحفظ، كما يلتزم الطرفان بكافة الالتزامات الجوهرية المنصوص عليها في القوانين السارية.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-black text-slate-900 text-xs sm:text-[13px] text-[#00102e]">
              {isRental ? "البند السادس (المحكمة المختصة):" : "البند الخامس (الاختصاص القضائي):"}
            </h4>
            <p className="text-slate-700 leading-6">
              تختص محاكم {governorate} الابتدائية وجزئياتها بنظر أي نزاع قد ينشأ لا قدر الله بشأن تفسير أو تنفيذ أي بند من بنود هذا العقد.
            </p>
          </div>
        </div>

        {/* Signatures Footer Block */}
        <div className="mt-7 pt-5 border-t-2 border-slate-300 grid grid-cols-2 gap-6 text-center">
          <div className="space-y-2 bg-slate-50/90 p-3 rounded-xl border border-slate-200">
            <strong className="block text-xs font-black text-slate-900">
              توقيع وبصمة الطرف الأول ({isRental ? "المؤجر" : "البائع"})
            </strong>
            <p className="text-[11px] text-slate-600 font-bold">{partyOneName}</p>
            <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
          </div>

          <div className="space-y-2 bg-slate-50/90 p-3 rounded-xl border border-slate-200">
            <strong className="block text-xs font-black text-slate-900">
              توقيع وبصمة الطرف الثاني ({isRental ? "المستأجر" : "المشتري"})
            </strong>
            <p className="text-[11px] text-slate-600 font-bold">{partyTwoName}</p>
            <div className="h-10 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
          </div>
        </div>

      </div>

      {/* Security & Verification Footer Tag */}
      <div className="mt-8 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[#986410]" />
          <span>مُعد ومحفوظ إلكترونيًا ومحمي بسجل نسخ رقمي عبر منصة Z Draft</span>
        </div>
        <span className="font-mono font-bold text-slate-500">{serialNumber}</span>
      </div>

    </div>
  );
}
