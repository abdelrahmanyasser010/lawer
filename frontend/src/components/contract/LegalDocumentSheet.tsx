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
  individual: "شخص طبيعي",
  company: "شخص اعتباري (شركة / مؤسسة)",
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
  const partyOneName = fieldValues.sale_seller_name || fieldValues.landlord_name || fieldValues.employer_name || fieldValues.client_name || "الطرف الأول";
  const partyOneType = formatLegalValue("party_type", fieldValues.sale_seller_party_type || fieldValues.landlord_party_type || "individual");
  const partyOneAddress = fieldValues.sale_seller_address || fieldValues.landlord_address || fieldValues.sale_unit_governorate || "القاهرة";

  const partyTwoName = fieldValues.sale_buyer_name || fieldValues.tenant_name || fieldValues.employee_name || fieldValues.provider_name || "الطرف الثاني";
  const partyTwoType = formatLegalValue("party_type", fieldValues.sale_buyer_party_type || fieldValues.tenant_party_type || "individual");
  const partyTwoAddress = fieldValues.sale_buyer_address || fieldValues.tenant_address || "جمهورية مصر العربية";

  const governorate = fieldValues.sale_unit_governorate || fieldValues.property_governorate || "القاهرة";
  const city = fieldValues.sale_unit_city || fieldValues.property_city || "مدينة نصر";
  const street = fieldValues.sale_unit_street || fieldValues.property_street || "شارع رئيسي";
  const area = fieldValues.sale_unit_area_sqm || fieldValues.property_area_sqm || "";

  const priceOrRent = fieldValues.sale_total_price || fieldValues.rent_monthly_amount || fieldValues.salary_amount || 0;
  const formattedFinancial = formatLegalValue("sale_total_price", priceOrRent);
  const paymentPlan = formatLegalValue("sale_payment_plan", fieldValues.sale_payment_plan || fieldValues.payment_method || "full");
  const deposit = fieldValues.deposit_amount ? formatLegalValue("deposit_amount", fieldValues.deposit_amount) : null;

  const docTitle = templateNameAr || (isRental ? "عقد إيجار أملاك خاضع لأحكام القانون المدني" : isEmployment ? "عقد عمل فردي محدد المدة" : "عقد بيع ابتدائي لوحدة سكنية");

  return (
    <div className="relative mx-auto w-full max-w-[820px] rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-12 shadow-xl print:shadow-none print:border-none">

      {/* Official Top Seal & Islamic Header */}
      <div className="text-center pb-6 border-b border-slate-200">
        <p className="text-xs font-serif font-bold text-slate-500 tracking-widest">
          بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#986410]/30 bg-[#986410]/5 px-3 py-1 text-[11px] font-bold text-[#986410]">
          <Scale className="h-3.5 w-3.5" /> وثيقة قانونية معتمدة عبر Z Draft
        </div>
        <h1 className="mt-4 text-xl sm:text-2xl font-black text-[#00102e] tracking-tight">
          {docTitle}
        </h1>
        <div className="mt-2 flex items-center justify-center gap-3 text-xs text-slate-500 font-mono">
          <span>رقم الوثيقة: {serialNumber}</span>
          <span>•</span>
          <span className="font-sans font-bold">الحالة: {status === "issued" ? "نسخة معتمدة صادرة" : "مسودة قيد الإعداد"}</span>
        </div>
      </div>

      {/* Contract Body with Formal Arabic Legal Layout */}
      <div className="mt-8 space-y-6 text-[13px] leading-8 text-slate-800 text-justify font-sans">

        {/* Preamble / Introduction */}
        <p className="font-bold text-slate-900 leading-relaxed">
          إنه في يوم الموافق تحرير هذا العقد، تم الاتفاق والتراضي بين كل من:
        </p>

        {/* Parties Block */}
        <div className="space-y-4 rounded-2xl bg-slate-50/80 p-5 border border-slate-100">
          <div className="space-y-1 border-b border-slate-200/60 pb-3">
            <div className="flex items-center justify-between">
              <strong className="text-sm font-black text-[#00102e]">
                أولاً: {isRental ? "السيد / المؤجر" : isEmployment ? "السيد / صاحب العمل" : "السيد / البائع"} (الطرف الأول):
              </strong>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">{partyOneType}</span>
            </div>
            <p className="text-xs text-slate-700 leading-6">
              <b>الاسم:</b> {partyOneName} — <b>المحل المختار / الإقامة:</b> {partyOneAddress}.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-sm font-black text-[#00102e]">
                ثانياً: {isRental ? "السيد / المستأجر" : isEmployment ? "السيد / العامل" : "السيد / المشتري"} (الطرف الثاني):
              </strong>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">{partyTwoType}</span>
            </div>
            <p className="text-xs text-slate-700 leading-6">
              <b>الاسم:</b> {partyTwoName} — <b>المحل المختار / الإقامة:</b> {partyTwoAddress}.
            </p>
          </div>
        </div>

        {/* Contract Recitals / Tamheed */}
        <div className="space-y-2">
          <h3 className="font-black text-slate-900 text-sm">تمهيد:</h3>
          <p className="leading-7 text-slate-700">
            {isRental ? (
              <>حيث يمتلك الطرف الأول العين الكائنة في ({city}، بمحافظة {governorate})، ورغب الطرف الثاني في استئجارها للانتفاع بها، وبعد أن أقر الطرفان بأهليتهما القانونية المعتبرة شرعاً وقانوناً للتصرف والتعاقد، فقد اتفقا على البنود الآتية:</>
            ) : isEmployment ? (
              <>حيث رغب الطرف الأول في الاستعانة بخبرات الطرف الثاني للعمل لديه، وتلاقت إرادة الطرفين على التعاقد وفقاً لأحكام قانون العمل، فقد اتفقا على البنود الآتية:</>
            ) : (
              <>حيث يمتلك الطرف الأول كامل الوحدة السكنية الكائنة في ({city}، بمحافظة {governorate})، ورغب الطرف الثاني في شرائها وتملكها، وبعد أن أقر الطرفان بكامل أهليتهما للتعاقد وخلوهما من كافة الموانع القانونية، فقد تم الاتفاق على البنود الآتية:</>
            )}
          </p>
        </div>

        {/* Articles / Clauses */}
        <div className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 text-sm text-[#00102e]">البند الأول (التمهيد):</h4>
            <p className="text-slate-700">
              يعتبر التمهيد السابق جزءاً لا يتجزأ من هذا العقد وبنداً من بنوده ومفسراً ومتمماً لكافة أحكامه والتزاماته.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 text-sm text-[#00102e]">البند الثاني (محل التعاقد والمواصفات):</h4>
            <p className="text-slate-700 leading-7">
              {isRental ? (
                <>أجر الطرف الأول للطرف الثاني القابل لذلك العين الكائنة في ({street}، {city}، محافظة {governorate}) {area ? `البالغ مساحتها حوالي ${area} متر مربع` : ""} بغرض الاستعمال السكني المعتاد وفقاً للقوانين واللوائح السارية.</>
              ) : (
                <>باع وأسقط وتنازل الطرف الأول بكافة الضمانات القانونية والفعلية إلى الطرف الثاني القابل لذلك الوحدة السكنية الكائنة في ({street}، {city}، محافظة {governorate}) {area ? `والبالغ مساحتها الإجمالية ${area} متر مربع` : ""} شاملة كافة المرافق والحصص الشائعة في الأرض والأجزاء المشتركة.</>
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 text-sm text-[#00102e]">
              {isRental ? "البند الثالث (القيمة الإيجارية والتأمين):" : "البند الثالث (الثمن المتفق عليه وآلية السداد):"}
            </h4>
            <p className="text-slate-700 leading-7">
              {isRental ? (
                <>تم هذا الإيجار نظير أجرة شهرية متفق عليها قدرها <strong className="text-slate-900 font-black">({formattedFinancial})</strong> تُسدد مقدماً في بداية كل شهر، مع سداد مبلغ تأمين نقدي قدره <strong className="text-slate-900 font-black">({deposit || "مبلغ التأمين المحدد"})</strong> يُرد للمستأجر عند انتهاء العقد وتسليم العين بحالتها الأصلية.</>
              ) : (
                <>تم هذا البيع ورضي الطرفان بثمن إجمالي متفق عليه قدره <strong className="text-slate-900 font-black">({formattedFinancial})</strong> تم الاتفاق على أدائه وفقاً لآلية: <strong className="text-slate-900 font-black">{paymentPlan}</strong>، ويعتبر توقيع الطرف الأول على هذا العقد مخالصة تامة وسنداً باستلام المبالغ المتفق عليها.</>
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 text-sm text-[#00102e]">البند الرابع (المعاينة والالتزامات):</h4>
            <p className="text-slate-700 leading-7">
              يقر الطرف الثاني بأنه قد عاين محل العقد المعاينة التامة النافية للجهالة شرعاً وقانوناً، وقبله بحالته الراهنة دون أي تحفظ، كما يلتزم الطرفان بكافة الالتزامات الجوهرية المنصوص عليها في القوانين السارية.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 text-sm text-[#00102e]">البند الخامس (الاختصاص القضائي):</h4>
            <p className="text-slate-700 leading-7">
              تختص محاكم {governorate} الابتدائية وجزئياتها بنظر أي نزاع قد ينشأ لا قدر الله بشأن تفسير أو تنفيذ أي بند من بنود هذا العقد.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 text-sm text-[#00102e]">البند السادس (النسخ وحجية العقد):</h4>
            <p className="text-slate-700 leading-7">
              حُرر هذا العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها والرجوع إليها عند اللزوم القانوني.
            </p>
          </div>
        </div>

        {/* Signatures Footer Block */}
        <div className="mt-12 pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-center">
          <div className="space-y-4">
            <strong className="block text-sm font-black text-slate-900">
              توقيع الطرف الأول ({isRental ? "المؤجر" : "البائع"})
            </strong>
            <p className="text-xs text-slate-600 font-bold">{partyOneName}</p>
            <div className="h-14 border-b border-dashed border-slate-300 w-4/5 mx-auto" />
          </div>

          <div className="space-y-4">
            <strong className="block text-sm font-black text-slate-900">
              توقيع الطرف الثاني ({isRental ? "المستأجر" : "المشتري"})
            </strong>
            <p className="text-xs text-slate-600 font-bold">{partyTwoName}</p>
            <div className="h-14 border-b border-dashed border-slate-300 w-4/5 mx-auto" />
          </div>
        </div>

      </div>

      {/* Security & Verification Footer Tag */}
      <div className="mt-10 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#986410]" />
          <span>مُعد ومحفوظ إلكترونيًا ومحمي بسجل نسخ رقمي عبر منصة Z Draft</span>
        </div>
        <span className="font-mono font-bold text-slate-500">{serialNumber}</span>
      </div>

    </div>
  );
}
