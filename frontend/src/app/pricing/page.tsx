"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileCheck,
  FileText,
  Home,
  Scale,
  ShieldCheck,
  Sparkles,
  WalletCards,
  ArrowLeft,
  Search,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";

function getCategoryIcon(catSlug?: string | null, slug?: string) {
  const target = (catSlug || slug || "").toLowerCase();
  if (target.includes("rent") || target.includes("إيجار")) return Home;
  if (target.includes("sale") || target.includes("بيع") || target.includes("apartment")) return Building2;
  if (target.includes("service") || target.includes("freelance") || target.includes("عمل")) return BriefcaseBusiness;
  return FileText;
}

export default function PricingPage() {
  const { catalog, loading, loadError } = usePublicCatalog();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    catalog.templates.forEach((t) => {
      const catKey = t.categorySlug || "general";
      const catTitle = t.categoryNameAr || "عقود قانونية متخصصة";
      if (!map.has(catKey)) map.set(catKey, catTitle);
    });
    return Array.from(map.entries()).map(([slug, title]) => ({ slug, title }));
  }, [catalog.templates]);

  const filteredTemplates = useMemo(() => {
    return catalog.templates.filter((t) => {
      const matchCat = selectedCategory === "all" || (t.categorySlug || "general") === selectedCategory;
      const matchSearch =
        !searchTerm.trim() ||
        t.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.variants.some(
          (v) =>
            v.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchCat && matchSearch;
    });
  }, [catalog.templates, selectedCategory, searchTerm]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-right font-sans" dir="rtl">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {/* Header Hero */}
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#986410]/20 bg-[#986410]/10 px-4 py-1.5 text-xs font-black text-[#986410]">
            <WalletCards className="h-4 w-4" /> أسعار الخدمات والعقود الرسمية
          </div>
          <h1 className="mt-4 text-3xl font-black text-[#00102e] sm:text-4xl lg:text-5xl">
            خدمات قانونية محددة وأسعار معلنة بكل شفافية
          </h1>
          <p className="mt-4 text-xs font-bold leading-relaxed text-slate-600 sm:text-sm">
            اختر العقد أو الخدمة واعرف التكلفة الدقيقة بالجنيه المصري (EGP) قبل البدء. يمكنك إعداد العقد بنفسك فورياً أو تكليف محامي المكتب بالصياغة والمراجعة.
          </p>
        </header>

        {/* Category & Search Filter Bar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Categories Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                selectedCategory === "all"
                  ? "bg-[#00102e] text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              جميع العقود ({catalog.templates.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setSelectedCategory(c.slug)}
                className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                  selectedCategory === c.slug
                    ? "bg-[#00102e] text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن اسم العقد أو الخدمة..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-xs font-bold text-slate-800 outline-none focus:border-[#986410]"
            />
          </div>
        </div>

        {/* Catalog List */}
        {loadError ? (
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-bold text-amber-900">
            تعذر تحميل الأسعار حاليًا. حاول مرة أخرى بعد قليل.
          </div>
        ) : loading ? (
          <div className="mt-14 text-center text-sm font-bold text-slate-400">جاري تحميل قائمة الأسعار والخدمات…</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-500">
            لا توجد عقود مطابقة لبحثك. جرب البحث بكلمات أخرى.
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {filteredTemplates.map((template) => {
              const Icon = getCategoryIcon(template.categorySlug, template.slug);
              return (
                <section
                  key={template.slug}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                >
                  <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00102e] text-[#d9a84e]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-[#00102e] sm:text-2xl">{template.nameAr}</h2>
                          {template.categoryNameAr && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-600">
                              {template.categoryNameAr}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-6 text-slate-500 max-w-2xl">{template.description}</p>
                      </div>
                    </div>
                  </header>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {template.variants.map((variant) => {
                      const totalLawyer = Number(variant.lawyerAssistedPriceEgp || 0);
                      const deposit =
                        totalLawyer > 0
                          ? Math.min(Number(variant.lawyerDepositEgp || 0), totalLawyer)
                          : Number(variant.lawyerDepositEgp || 0);
                      const remaining = totalLawyer > 0 ? Math.max(0, totalLawyer - deposit) : 0;
                      const selfPrice = Number(variant.selfServicePriceEgp || 0);

                      return (
                        <article
                          key={variant.key}
                          className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-[#986410]/40 hover:bg-white hover:shadow-md"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-black text-[#00102e] text-base">{variant.nameAr}</h3>
                              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                                معتمد
                              </span>
                            </div>
                            <p className="mt-2 min-h-10 text-[11px] leading-5 text-slate-600 font-medium">
                              {variant.description}
                            </p>

                            {/* Prices comparison boxes */}
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <PriceBox
                                label="إعداد ذاتي (فوري)"
                                value={selfPrice}
                                unavailable={selfPrice <= 0}
                                highlight={selfPrice > 0}
                              />
                              <PriceBox
                                label="بواسطة محامٍ مختص"
                                value={totalLawyer}
                                unavailable={totalLawyer <= 0}
                              />
                            </div>

                            {totalLawyer > 0 && (
                              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 rounded-xl border border-[#986410]/20 bg-amber-50/60 px-3 py-2 text-[10px] font-bold text-slate-700">
                                <span>
                                  عربون الحجز: <b className="text-[#986410] font-black">{deposit.toLocaleString("ar-EG")} ج.م</b>
                                </span>
                                <span>
                                  المتبقي عند التسليم: <b>{remaining.toLocaleString("ar-EG")} ج.م</b>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-5 flex items-center gap-2 border-t border-slate-200/80 pt-4">
                            {variant.selfServiceEnabled && selfPrice > 0 ? (
                              <Link
                                href={`/create-contract?mode=self_service&template=${template.slug}&variant=${variant.key}`}
                                className="flex-1 rounded-xl bg-[#00102e] py-2.5 text-center text-xs font-black text-[#d9a84e] transition hover:bg-[#001a42]"
                              >
                                صياغة ذاتية
                              </Link>
                            ) : null}
                            {variant.lawyerDraftingEnabled && totalLawyer > 0 ? (
                              <Link
                                href={`/create-contract?mode=lawyer_assisted&template=${template.slug}&variant=${variant.key}`}
                                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-center text-xs font-black text-[#00102e] transition hover:bg-slate-100"
                              >
                                طلب من محامٍ
                              </Link>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Specialized Legal Services Section */}
        <section className="mt-12 rounded-3xl border border-[#986410]/30 bg-gradient-to-br from-amber-50/60 via-white to-slate-50 p-6 sm:p-10 shadow-sm">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#986410]/10 px-3 py-1 text-xs font-black text-[#986410]">
              <Scale className="h-4 w-4" /> خدمات المراجعة والاستشارات القانونية
            </span>
            <h2 className="mt-3 text-2xl font-black text-[#00102e] sm:text-3xl">
              هل لديك عقد وتريد تدقيقه أو استشارة محامٍ مختص؟
            </h2>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-600 sm:text-sm">
              نوفر خدمة مراجعة وفحص العقود القائمة وتحديد البنود الخطرة، بالإضافة لجلسات استشارة قانونية مباشرة مع محامين مقيدين بنقابة المحامين.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Service 1: Contract Review */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileCheck className="h-5 w-5" />
                </div>
                <span className="text-lg font-black text-[#986410]">
                  {(catalog.services.contractReviewFeeEgp || 100).toLocaleString("ar-EG")} ج.م
                </span>
              </div>
              <h3 className="mt-3 text-base font-black text-[#00102e]">مراجعة وتدقيق عقد قائم</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                ارفع عقدك وسيقوم محامٍ مختص بفحصه وتقديم تقرير مفصل بالثغرات والتعديلات الموصى بها خلال 24-48 ساعة.
              </p>
              <Link
                href="/request-review"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#00102e] py-2.5 text-xs font-black text-white hover:bg-[#001a42]"
              >
                طلب مراجعة عقد الآن <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Service 2: Lawyer Consultation */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Scale className="h-5 w-5" />
                </div>
                <span className="text-lg font-black text-[#986410]">
                  {(catalog.services.contractDraftingDepositEgp || 100).toLocaleString("ar-EG")} ج.م <span className="text-[10px] text-slate-400 font-bold">عربون</span>
                </span>
              </div>
              <h3 className="mt-3 text-base font-black text-[#00102e]">صياغة عقد خاص من الصفر</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                احكِ لمحامينا تفاصيل اتفاقك وسيصيغ لك عقداً فريداً محكماً وفق الأنظمة المعمول بها.
              </p>
              <Link
                href="/create-contract?mode=lawyer_assisted"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-black text-[#00102e] hover:bg-slate-100"
              >
                بدء طلب الصياغة <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Service 3: Checkout or Contact */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[#986410]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  تسليم فوري
                </span>
              </div>
              <h3 className="mt-3 text-base font-black text-[#00102e]">صفحة إتمام الطلب والدفع</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                استعرض تفاصيل طلبك وطرق الدفع المقبولة (بطاقات فيزا/ماستركارد/ميزة/فودافون كاش) وأكمل الشراء بأمان.
              </p>
              <Link
                href="/checkout"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-xs font-black text-white hover:bg-emerald-800"
              >
                الدخول لصفحة الدفع <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Guarantees Footer Bar */}
        <section className="mt-12 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <strong className="block text-xs font-black text-[#00102e]">أسعار نهائية دون رسوم خفية</strong>
              <span className="text-[11px] text-slate-500 font-bold">معلنة بالجنيه المصري شاملة كافة الميزات</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <strong className="block text-xs font-black text-[#00102e]">دفع إلكتروني آمن ومشفر</strong>
              <span className="text-[11px] text-slate-500 font-bold">بوابات دفع معتمدة من البنك المركزي المصري</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-[#986410] shrink-0" />
            <div>
              <strong className="block text-xs font-black text-[#00102e]">ضمان الصياغة القانونية</strong>
              <span className="text-[11px] text-slate-500 font-bold">بإشراف محامين مقيدين بنقابة المحامين</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PriceBox({
  label,
  value,
  unavailable = false,
  highlight = false,
}: {
  label: string;
  value: number;
  unavailable?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center border ${
        highlight
          ? "bg-white border-[#986410]/30 shadow-xs"
          : "bg-white/80 border-slate-200"
      }`}
    >
      <span className="block text-[10px] font-bold text-slate-500">{label}</span>
      <strong
        className={`mt-1 block text-base font-black ${
          unavailable ? "text-slate-400" : highlight ? "text-[#986410]" : "text-[#00102e]"
        }`}
      >
        {unavailable ? "غير محدد" : `${Number(value).toLocaleString("ar-EG")} ج.م`}
      </strong>
    </div>
  );
}
