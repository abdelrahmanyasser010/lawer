"use client";

import Link from "next/link";
import { BriefcaseBusiness, Building2, FileText, Home, Scale, WalletCards } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

const categoryMeta: Record<string, { title: string; icon: typeof Home }> = {
  rental: { title: "عقود الإيجار", icon: Home },
  apartment_sale: { title: "عقود البيع", icon: Building2 },
  freelancer: { title: "عقود الخدمات والعمل الحر", icon: BriefcaseBusiness },
};

export default function PricingPage() {
  const { catalog, loading, loadError } = usePublicCatalog();
  const templates = catalog.templates.filter((item) => categoryMeta[item.slug]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#986410]/20 bg-[#986410]/10 px-4 py-2 text-xs font-black text-[#986410]"><WalletCards className="h-4 w-4" /> الأسعار</div>
          <h1 className="mt-5 text-3xl font-black text-[#00102e] sm:text-4xl">اختر الطريقة واعرف التكلفة قبل البدء</h1>
          <p className="mt-4 text-sm leading-8 text-slate-600">لكل عقد سعر مستقل عند إعداده بنفسك، وسعر مستقل عند تكليف محامي المكتب. في مسار المحامي تدفع العربون أولًا ثم المتبقي عند اكتمال إعداد العقد.</p>
        </header>

        {loadError ? (
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-bold text-amber-900">تعذر تحميل الأسعار حاليًا. حاول مرة أخرى بعد قليل.</div>
        ) : loading ? (
          <div className="mt-10 text-center text-sm font-bold text-slate-400">جاري تحميل الأسعار…</div>
        ) : (
          <div className="mt-12 space-y-10">
            {templates.map((template) => {
              const meta = categoryMeta[template.slug];
              const Icon = meta?.icon || FileText;
              return (
                <section key={template.slug} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <header className="flex items-start gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00102e] text-[#d9a84e]"><Icon className="h-5 w-5" /></div>
                    <div><h2 className="text-xl font-black text-[#00102e]">{meta?.title || template.nameAr}</h2><p className="mt-1 text-xs leading-6 text-slate-500">{template.description}</p></div>
                  </header>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {template.variants.map((variant) => {
                      const total = Number(variant.lawyerAssistedPriceEgp || 0);
                      const deposit = total > 0 ? Math.min(Number(variant.lawyerDepositEgp || 0), total) : Number(variant.lawyerDepositEgp || 0);
                      const remaining = total > 0 ? Math.max(0, total - deposit) : 0;
                      return (
                        <article key={variant.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                          <h3 className="font-black text-[#00102e]">{variant.nameAr}</h3>
                          <p className="mt-1 min-h-10 text-[11px] leading-5 text-slate-500">{variant.description}</p>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <PriceBox label="إعداد بنفسي" value={variant.selfServicePriceEgp} unavailable={Number(variant.selfServicePriceEgp || 0) <= 0} />
                            <PriceBox label="بواسطة محامي" value={total} unavailable={total <= 0} />
                          </div>
                          {total > 0 && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-xl border border-[#986410]/15 bg-white px-3 py-2 text-[10px] font-bold text-slate-600"><span>العربون الآن: <b className="text-[#986410]">{deposit.toLocaleString("ar-EG")} ج.م</b></span><span>المتبقي: <b>{remaining.toLocaleString("ar-EG")} ج.م</b></span></div>}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Link href="/create-contract?mode=self_service" className="rounded-2xl bg-[#00102e] p-5 text-white"><FileText className="h-5 w-5 text-[#d9a84e]"/><h3 className="mt-3 font-black">إنشاء عقد بنفسي</h3><p className="mt-2 text-xs leading-6 text-slate-300">اختر العقد ثم أدخل بياناته خطوة بخطوة.</p></Link>
          <Link href="/create-contract?mode=lawyer_assisted" className="rounded-2xl border border-[#986410]/30 bg-white p-5"><Scale className="h-5 w-5 text-[#986410]"/><h3 className="mt-3 font-black text-[#00102e]">إنشاء عقد بواسطة محامي المكتب</h3><p className="mt-2 text-xs leading-6 text-slate-500">اختر نوع العقد وارفع المستندات ثم ادفع العربون.</p></Link>
          <Link href="/#consultation" className="rounded-2xl border border-slate-200 bg-white p-5"><Scale className="h-5 w-5 text-blue-700"/><h3 className="mt-3 font-black text-[#00102e]">استشارة قانونية</h3><p className="mt-2 text-xs leading-6 text-slate-500">السعر الحالي: <b>{Number(catalog.services.consultationFeeEgp || 0).toLocaleString("ar-EG")} ج.م</b></p></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function PriceBox({ label, value, unavailable = false }: { label: string; value: number; unavailable?: boolean }) {
  return <div className="rounded-xl bg-white p-3"><span className="block text-[10px] font-bold text-slate-500">{label}</span><strong className="mt-1 block text-base font-black text-[#00102e]">{unavailable ? "غير محدد" : `${Number(value).toLocaleString("ar-EG")} ج.م`}</strong></div>;
}
