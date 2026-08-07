"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, FileSearch, FileText, Home, Scale, ShieldCheck } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CreationModeModal from "@/components/home/CreationModeModal";
import LegalConsultationCard from "@/components/home/LegalConsultationCard";
import { fetchContractTemplates } from "@/lib/api";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import type { ContractTemplate } from "@/types/zdraft";

const FALLBACK_TEMPLATES: ContractTemplate[] = [
  {
    id: 1,
    name: "Rental Contract",
    nameAr: "عقود الإيجار",
    slug: "rental",
    description: "إيجار سكني أو تجاري أو إداري، مع إمكانية إضافة محضر استلام وجرد كمستند مستقل.",
    priceEgp: 59,
    icon: "home",
    sections: [],
  },
  {
    id: 2,
    name: "Apartment Sale Contract",
    nameAr: "عقود بيع الوحدات",
    slug: "apartment_sale",
    description: "بيع ابتدائي أو صالح للتسجيل أو بيع آلت الملكية فيه بالميراث، مع ملحق أقساط اختياري.",
    priceEgp: 149,
    icon: "building",
    sections: [],
  },
];

function TemplateIcon({ icon }: { icon: string }) {
  return icon === "building" ? <Building2 className="h-6 w-6" /> : <Home className="h-6 w-6" />;
}

export default function HomePage() {
  const { catalog } = usePublicCatalog();
  const editHours = catalog.policies.selfServiceEditHours;
  const [templates, setTemplates] = useState<ContractTemplate[]>(FALLBACK_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchContractTemplates()
      .then((items) => {
        if (cancelled) return;
        const available = items.filter((item) => item.slug === "rental" || item.slug === "apartment_sale");
        setTemplates(available.length ? available : FALLBACK_TEMPLATES);
      })
      .catch(() => {
        if (!cancelled) setTemplates(FALLBACK_TEMPLATES);
      });
    return () => { cancelled = true; };
  }, []);

  const orderedTemplates = useMemo(
    () => [...templates].sort((a, b) => (a.slug === "rental" ? -1 : b.slug === "rental" ? 1 : 0)),
    [templates],
  );

  function openTemplate(template: ContractTemplate) {
    setSelectedTemplate(template);
    setIsModeModalOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#986410]/25 bg-[#986410]/10 px-4 py-2 text-xs font-black text-[#986410]">
              <Scale className="h-4 w-4" /> عقود وخدمات قانونية من مكتب محاماة
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-black leading-tight text-[#00102e] sm:text-5xl">
              أنشئ عقدك بنفسك، أو اطلب من محامٍ إعداده ومراجعته
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
              اختر نوع العقد وأدخل البيانات المطلوبة، أو ارفع مستنداتك واطلب خدمة من المكتب. التواصل مع المحامي يتم عبر مقابلة في المكتب أو Zoom أو WhatsApp، بينما تظل الملفات والنسخ محفوظة داخل حسابك.
            </p>

            <div className="mx-auto mt-9 grid max-w-4xl gap-4 text-right md:grid-cols-2">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-blue-700" /><h2 className="font-black text-blue-950">إنشاء ذاتي</h2></div>
                <p className="mt-3 text-xs leading-6 text-blue-900">تملأ البيانات بنفسك. بعد اعتماد الدفع تتاح لك {editHours} ساعة لتعديل البيانات غير الأساسية، ثم تُثبت النسخة وتبدأ إجراءات إصدار الملف النهائي.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                <div className="flex items-center gap-3"><Scale className="h-5 w-5 text-[#986410]" /><h2 className="font-black text-amber-950">خدمة محامٍ</h2></div>
                <p className="mt-3 text-xs leading-6 text-amber-900">يراجع المكتب الطلب والدفع، ثم يُسند لمحامٍ. وعند تجهيز أي نسخة أو تقرير يظهر تلقائيًا داخل حسابك.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="templates" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-black text-[#986410]">العقود المتاحة حاليًا</span>
              <h2 className="mt-2 text-2xl font-black text-[#00102e] sm:text-3xl">اختر نوع العقد</h2>
              <p className="mt-2 text-sm text-slate-500">عقود العمل الحر ستضاف بعد اعتماد أنواعها وصياغاتها.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {orderedTemplates.map((template) => (
              <article key={template.slug} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00102e] text-[#986410]"><TemplateIcon icon={template.icon} /></div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">من {template.priceEgp} ج.م</span>
                </div>
                <h3 className="mt-5 text-xl font-black text-[#00102e]">{template.nameAr}</h3>
                <p className="mt-3 min-h-14 text-sm leading-7 text-slate-600">{template.description}</p>
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-5 text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> معاينة البيانات قبل الدفع</div>
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> تثبيت بيانات الأطراف ومحل العقد بعد اعتماد الدفع</div>
                </div>
                <button type="button" onClick={() => openTemplate(template)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-sm font-black text-white">
                  اختيار طريقة إعداد العقد <ArrowLeft className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-12">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-3">
            {[
              [FileSearch, "مراجعة عقد مرفوع", "ارفع ملف Word أو PDF. يمكن للمحامي رفع تقرير ملاحظات أو نسخة معدلة حتى لو لم يكن للعقد قالب داخل المنصة."],
              [Scale, "استشارة مع محامٍ", "اختر وسيلة التواصل المناسبة، ثم تابع الموعد والملفات الناتجة من حسابك."],
              [FileText, "إنشاء عقد مع محامٍ", "يعد المحامي العقد من لوحة المكتب، وتظهر النسخ الجاهزة داخل حسابك دون وجود محادثة داخلية."],
            ].map(([Icon, title, text]) => {
              const ItemIcon = Icon as typeof FileSearch;
              return <div key={String(title)} className="rounded-2xl border border-slate-200 p-5"><ItemIcon className="h-5 w-5 text-[#986410]" /><h3 className="mt-3 font-black text-[#00102e]">{String(title)}</h3><p className="mt-2 text-xs leading-6 text-slate-600">{String(text)}</p></div>;
            })}
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"><LegalConsultationCard /></div>
      </main>
      <Footer />
      <CreationModeModal template={selectedTemplate} isOpen={isModeModalOpen} onClose={() => setIsModeModalOpen(false)} />
    </div>
  );
}
