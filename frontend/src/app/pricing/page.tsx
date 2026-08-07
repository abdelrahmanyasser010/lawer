"use client";

import Link from "next/link";
import { CheckCircle2, FileSearch, FileText, Scale, WalletCards } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

const fallbackTemplates = [
  { id: 1, slug: "rental", nameAr: "عقود الإيجار", description: "إيجار سكني أو تجاري أو إداري.", priceEgp: 59, version: 1 },
  { id: 2, slug: "apartment_sale", nameAr: "عقود بيع الوحدات", description: "بيع ابتدائي أو صالح للتسجيل أو بيع آلت الملكية فيه بالميراث.", priceEgp: 149, version: 1 },
];

export default function PricingPage() {
  const { catalog, loading } = usePublicCatalog();
  const templates = catalog.templates.length ? catalog.templates.filter((item) => item.slug !== "freelance") : fallbackTemplates;
  const services = [
    {
      key: "contract_review",
      title: "مراجعة عقد مرفوع",
      text: "يراجع المحامي الملف المرفوع، ثم يتيح تقرير الملاحظات أو النسخة المعدلة داخل حسابك.",
      price: catalog.services.contractReviewDepositEgp,
      icon: FileSearch,
    },
    {
      key: "consultation",
      title: "استشارة قانونية",
      text: "تحدد طريقة التواصل المناسبة، ويؤكد المكتب الموعد بعد مراجعة الطلب.",
      price: catalog.services.consultationDepositEgp,
      icon: Scale,
    },
    {
      key: "contract_drafting",
      title: "إعداد عقد مع محامٍ",
      text: "يتواصل معك المحامي، ثم يعد العقد من لوحة المكتب وتظهر نسخه داخل حسابك.",
      price: catalog.services.contractDraftingDepositEgp,
      icon: FileText,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#986410]/20 bg-[#986410]/10 px-4 py-2 text-xs font-black text-[#986410]"><WalletCards className="h-4 w-4" /> أسعار العقود والخدمات</div>
          <h1 className="mt-5 text-3xl font-black text-[#00102e] sm:text-4xl">السعر يظهر قبل بدء الدفع</h1>
          <p className="mt-4 text-sm leading-8 text-slate-600">أسعار العقود تُدار من لوحة المكتب وتظهر هنا من قاعدة البيانات. خدمات المحامي تبدأ بعربون فتح الطلب، ويحدد المكتب أي تكلفة إضافية بعد الاطلاع على المستندات ونطاق العمل.</p>
        </header>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-black text-[#986410]">إنشاء ذاتي</p><h2 className="mt-2 text-2xl font-black text-[#00102e]">أسعار قوالب العقود</h2></div>
            {loading && <span className="text-xs font-bold text-slate-400">جاري تحديث الأسعار…</span>}
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {templates.map((template) => (
              <article key={template.slug} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4"><FileText className="h-7 w-7 text-[#986410]" /><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{template.priceEgp} ج.م</span></div>
                <h3 className="mt-5 text-xl font-black text-[#00102e]">{template.nameAr}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{template.description}</p>
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-5 text-xs font-bold text-slate-600">
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> معاينة البيانات قبل رفع إثبات الدفع</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {catalog.policies.selfServiceEditHours} ساعة لتعديل البيانات غير الأساسية بعد اعتماد الدفع</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> النسخة النهائية تظهر داخل حسابك عند اكتمال الإصدار</p>
                </div>
                <Link href={`/#templates`} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#00102e] px-5 py-3 text-sm font-black text-white">اختيار العقد</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <p className="text-xs font-black text-[#986410]">خدمات المكتب</p>
          <h2 className="mt-2 text-2xl font-black text-[#00102e]">عربون فتح الطلب</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">العربون يتيح للإدارة مراجعة الطلب وإسناده للمحامي المناسب. لا نَعِد بمدة ثابتة قبل معرفة تفاصيل الطلب والمستندات.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <Icon className="h-7 w-7 text-[#986410]" />
                  <h3 className="mt-4 text-lg font-black text-[#00102e]">{service.title}</h3>
                  <p className="mt-3 min-h-20 text-xs leading-7 text-slate-600">{service.text}</p>
                  <div className="mt-5 border-t border-slate-100 pt-5"><span className="text-2xl font-black text-[#00102e]">{service.price}</span><span className="mr-1 text-xs font-bold text-slate-500">ج.م عربون فتح الطلب</span></div>
                </article>
              );
            })}
          </div>
          <Link href="/#consultation" className="mx-auto mt-7 block w-fit rounded-xl bg-[#986410] px-6 py-3 text-sm font-black text-white">بدء طلب خدمة</Link>
        </section>

        <aside className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-7 text-amber-950">
          الدفع لا يعني أن البريد الإلكتروني أو هوية الأطراف قد تم التحقق منها قانونيًا، ولا يُعد توقيعًا إلكترونيًا. شروط الاسترداد والتكلفة النهائية للخدمات القانونية تُعرض وتُثبت بحسب نوع الطلب وسياسة المكتب.
        </aside>
      </main>
      <Footer />
    </div>
  );
}
