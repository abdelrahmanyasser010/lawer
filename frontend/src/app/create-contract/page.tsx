"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  Home,
  Loader2,
  Phone,
  Receipt,
  Scale,
  Search,
  Trash2,
  Upload,
  User,
  Video,
  WalletCards,
  X,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import { compressMultipleFiles, compressUploadFile } from "@/lib/compression";
import type { CommunicationChannel, PublicCatalog } from "@/types/customer";
import { useWizardStore } from "@/store/wizardStore";
import type { ContractSlug } from "@/types/zdraft";
import { normalizePhoneInput, phoneValidationError } from "@/lib/inputValidation";
import { usePaymentAccess } from "@/hooks/usePaymentAccess";
import { formatFileSize } from "@/lib/labels";

const MAX_FILES = 30;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

type CatalogMode = "self_service" | "lawyer_assisted";
type CatalogTemplate = PublicCatalog["templates"][number];
type CatalogVariant = CatalogTemplate["variants"][number];
type SelectedVariant = { template: CatalogTemplate; variant: CatalogVariant };
type CatalogGroup = { key: string; nameAr: string; description: string; templates: Array<{ template: CatalogTemplate; variants: CatalogVariant[] }> };

const categoryMeta: Record<string, { title: string; subtitle: string; icon: typeof Home }> = {
  rental: { title: "عقود الإيجار", subtitle: "اختر صيغة الإيجار المناسبة لطبيعة استخدام الوحدة.", icon: Home },
  apartment_sale: { title: "عقود البيع", subtitle: "اختر الصيغة الأقرب لمصدر ملكية الوحدة وطريقة التصرف.", icon: Building2 },
  freelancer: { title: "عقود الخدمات والعمل الحر", subtitle: "عقود مستقلة للخدمات الرقمية والتصميم وإدارة المنصات.", icon: BriefcaseBusiness },
};

const variantMeta: Record<string, { tags: string[]; help: string }> = {
  residential_lease: { tags: ["سكني", "شقق", "فيلات"], help: "مناسب لتأجير الشقق والفيلات والوحدات المخصصة للسكن." },
  commercial_lease: { tags: ["تجاري", "محلات", "مخازن"], help: "مناسب للمحال والمعارض والمخازن والوحدات داخل المولات والأسواق." },
  administrative_lease: { tags: ["إداري", "مكاتب", "شركات"], help: "مناسب للمكاتب ومقار الشركات والعيادات والمراكز المهنية." },
  preliminary_sale: { tags: ["بيع", "ابتدائي", "وحدة سكنية"], help: "مناسب للبيع المستند إلى عقد أو سند عرفي/ابتدائي وتسلسل ملكية غير مسجل." },
  registrable_sale: { tags: ["بيع", "تسجيل", "شهر عقاري"], help: "مناسب عندما تكون مستندات الملكية قابلة لاستكمال إجراءات التسجيل بالشهر العقاري." },
  inherited_sale: { tags: ["بيع", "ميراث", "ورثة"], help: "مناسب للوحدة التي آلت ملكيتها للبائع عن طريق الميراث وإعلام الوراثة." },
  visual_identity_design: { tags: ["تصميم", "هوية بصرية", "مخرجات"], help: "مناسب لاتفاقات تصميم أو تطوير الهوية البصرية والشعار والمخرجات المرتبطة بها." },
  website_development: { tags: ["برمجة", "مواقع", "منصات"], help: "مناسب لتطوير موقع أو متجر أو منصة أو نظام ويب وتحديد نطاق العمل والتسليم." },
  social_media_management: { tags: ["تسويق", "سوشيال ميديا", "إدارة"], help: "مناسب لإدارة حسابات التواصل والمحتوى والحملات والتقارير." },
};

const channels: Array<{ key: CommunicationChannel; label: string; icon: typeof Video }> = [
  { key: "whatsapp", label: "WhatsApp", icon: Phone },
  { key: "zoom", label: "Zoom", icon: Video },
];

const lawyerDocumentGuides: Record<string, string[]> = {
  residential_lease: [
    "بطاقة المؤجر - وجه",
    "بطاقة المؤجر - ظهر",
    "بطاقة المستأجر - وجه",
    "بطاقة المستأجر - ظهر",
    "سند الملكية أو ما يثبت حق التأجير",
    "آخر إيصال مرافق إن وجد",
  ],
  commercial_lease: [
    "بطاقة المؤجر - وجه",
    "بطاقة المؤجر - ظهر",
    "بطاقة المستأجر أو ممثل الشركة - وجه",
    "بطاقة المستأجر أو ممثل الشركة - ظهر",
    "سند الملكية أو ما يثبت حق التأجير",
    "السجل التجاري أو البطاقة الضريبية إن وجدت",
  ],
  administrative_lease: [
    "بطاقة المؤجر - وجه",
    "بطاقة المؤجر - ظهر",
    "بطاقة المستأجر أو ممثل الجهة - وجه",
    "بطاقة المستأجر أو ممثل الجهة - ظهر",
    "سند الملكية أو ما يثبت حق التأجير",
    "مستندات النشاط أو الجهة إن وجدت",
  ],
  preliminary_sale: [
    "بطاقة البائع - وجه",
    "بطاقة البائع - ظهر",
    "بطاقة المشتري - وجه",
    "بطاقة المشتري - ظهر",
    "عقد البيع أو تسلسل الملكية",
    "آخر إيصالات مرافق متاحة",
  ],
  registrable_sale: [
    "بطاقة البائع - وجه",
    "بطاقة البائع - ظهر",
    "بطاقة المشتري - وجه",
    "بطاقة المشتري - ظهر",
    "سند الملكية القابل للتسجيل",
    "بيانات التسجيل أو الشهر العقاري إن وجدت",
  ],
  inherited_sale: [
    "بطاقة البائع أو الورثة - وجه",
    "بطاقة البائع أو الورثة - ظهر",
    "بطاقة المشتري - وجه",
    "بطاقة المشتري - ظهر",
    "إعلام الوراثة",
    "توكيلات أو موافقات الورثة إن وجدت",
  ],
  visual_identity_design: [
    "بيانات الطرفين",
    "وصف الهوية المطلوبة",
    "قائمة المخرجات المتفق عليها",
    "مراجع بصرية أو ملفات العلامة الحالية إن وجدت",
  ],
  website_development: [
    "بيانات الطرفين",
    "وصف المشروع ونطاق الصفحات",
    "أي تصميمات أو مراجع مطلوبة",
    "بيانات الاستضافة أو الدومين إن وجدت",
  ],
  social_media_management: [
    "بيانات الطرفين",
    "روابط الحسابات المطلوب إدارتها",
    "نطاق الإدارة وخطة المحتوى",
    "صلاحيات الإعلانات أو مدير الأعمال إن وجدت",
  ],
};

function isPreviewableImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
}

function CreateContractContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { catalog, loading, loadError } = usePublicCatalog();
  const resetWizard = useWizardStore((state) => state.resetWizard);
  const mode: CatalogMode = searchParams.get("mode") === "lawyer_assisted" ? "lawyer_assisted" : "self_service";
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedVariant | null>(null);
  // resume draft prompt
  const [resumePrompt, setResumePrompt] = useState<{ template: CatalogTemplate; variant: CatalogVariant; draftId: number; draftTitle: string } | null>(null);
  const [myDrafts, setMyDrafts] = useState<Array<{ id: number; templateSlug: string; variantKey: string; title: string }>>([]);

  useEffect(() => {
    frontendApi.contracts().then((rows) => {
      setMyDrafts(
        rows
          .filter((c) => c.status === "draft" && c.templateSlug)
          .map((c) => ({ id: c.id, templateSlug: c.templateSlug!, variantKey: c.variantKey || "", title: c.title || c.templateNameAr || "" }))
      );
    }).catch(() => {/* ignore, user might not be logged in */});
  }, []);

  const grouped = useMemo<CatalogGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const groups = new Map<string, CatalogGroup>();
    catalog.templates.forEach((template) => {
      const variants = template.variants.filter((variant) => {
        if (!q) return true;
        const meta = variantMeta[variant.key];
        return [variant.nameAr, variant.description, meta?.help, ...(meta?.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(q);
      });
      if (!variants.length) return;
      const key = template.categorySlug || template.slug;
      const fallback = categoryMeta[template.slug];
      const group = groups.get(key) || { key, nameAr: template.categoryNameAr || fallback?.title || template.nameAr, description: template.categoryDescription || fallback?.subtitle || template.description, templates: [] };
      group.templates.push({ template, variants });
      groups.set(key, group);
    });
    return Array.from(groups.values());
  }, [catalog.templates, query]);

  function choose(template: CatalogTemplate, variant: CatalogVariant) {
    if (mode === "self_service") {
      // Check if there's an existing draft for this template+variant
      const existingDraft = myDrafts.find(
        (d) => d.templateSlug === template.slug && (!d.variantKey || d.variantKey === variant.key)
      );
      if (existingDraft) {
        setResumePrompt({ template, variant, draftId: existingDraft.id, draftTitle: existingDraft.title });
        return;
      }
      resetWizard(template.slug as ContractSlug);
      router.push(`/wizard/${template.slug}?mode=self_service&variant=${encodeURIComponent(variant.key)}`);
      return;
    }
    setSelected({ template, variant });
  }

  function resumeDraft() {
    if (!resumePrompt) return;
    router.push(`/wizard/${resumePrompt.template.slug}?contractId=${resumePrompt.draftId}`);
  }

  function startFresh() {
    if (!resumePrompt) return;
    const { template, variant } = resumePrompt;
    setResumePrompt(null);
    resetWizard(template.slug as ContractSlug);
    router.push(`/wizard/${template.slug}?mode=self_service&variant=${encodeURIComponent(variant.key)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />

      {/* Resume Draft Modal */}
      {resumePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#00102e]">لديك مسودة غير مكتملة</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{resumePrompt.draftTitle}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              يوجد عقد من هذا النوع محفوظ كمسودة في حسابك. هل تريد استئنافه من حيث توقفت، أم تريد إنشاء عقد جديد؟
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={resumeDraft}
                className="w-full rounded-xl bg-[#00102e] py-2.5 text-xs font-black text-white hover:bg-[#00102e]/90 transition"
              >
                استئناف المسودة الموجودة
              </button>
              <button
                type="button"
                onClick={startFresh}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                إنشاء عقد جديد
              </button>
              <button
                type="button"
                onClick={() => setResumePrompt(null)}
                className="w-full rounded-xl py-2 text-[11px] text-slate-400 hover:text-slate-600 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white pt-8 pb-4 sm:pt-10 sm:pb-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-xl font-black text-[#00102e] sm:text-2xl">اختر العقد الذي تريد إعداده</h1>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-500">
                  {mode === "self_service"
                    ? "ابحث باسم العقد أو استخدامه، ثم ابدأ إدخال بياناته خطوة بخطوة. السعر الظاهر هو سعر هذا العقد تحديدًا."
                    : "اختر نوع العقد، ثم ارفع المستندات اللازمة. يظهر لك السعر الكامل والعربون المطلوب قبل إرسال الطلب للمكتب."}
                </p>
              </div>

              <div className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <Link href="/create-contract?mode=self_service" className={`inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${mode === "self_service" ? "bg-[#00102e] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  إعداد بنفسي
                </Link>
                <Link href="/create-contract?mode=lawyer_assisted" className={`inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${mode === "lawyer_assisted" ? "bg-[#00102e] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  إعداد بواسطة محامٍ
                </Link>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
              <div className="flex items-center gap-5 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide text-xs font-bold text-slate-500">
                {grouped.map((group) => <a key={group.key} href={`#category-${group.key}`} className="hover:text-[#00102e] whitespace-nowrap transition-colors">{group.nameAr}</a>)}
              </div>

              <div className="relative flex items-center shrink-0">
                {isSearchOpen ? (
                  <div className="relative animate-in slide-in-from-left-4 fade-in duration-200 w-[220px] sm:w-[280px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setIsSearchOpen(false)}
                      placeholder="ابحث باسم العقد..."
                      className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs font-bold text-[#00102e] outline-none transition focus:border-[#986410] focus:ring-1 focus:ring-[#986410]"
                    />
                    <button onClick={() => { setIsSearchOpen(false); setQuery(""); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsSearchOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition">
                    <Search className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#986410]" /><p className="mt-2 text-xs font-bold text-slate-500">جاري تحميل العقود والأسعار...</p></div>
          ) : loadError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-xs font-bold text-amber-900">تعذر تحميل العقود والأسعار مؤقتًا. حاول مرة أخرى بعد قليل.</div>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-xs font-black text-slate-600">لا توجد عقود مطابقة للبحث.</p></div>
          ) : grouped.map((group) => {
            const iconMeta = categoryMeta[group.templates[0]?.template.slug] || { icon: FileText };
            const Icon = iconMeta.icon;
            return <section key={group.key} id={`category-${group.key}`}>
              <header className="mb-5 flex items-start gap-2.5"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00102e] text-[#d9a84e]"><Icon className="h-3.5 w-3.5" /></div><div><h2 className="text-base sm:text-lg font-black text-[#00102e]">{group.nameAr}</h2><p className="mt-0.5 text-[11px] leading-5 text-slate-500">{group.description}</p></div></header>
              <div className="space-y-6">{group.templates.map(({ template, variants }) => <div key={template.slug}><h3 className="mb-2 text-sm font-black text-[#00102e]">{template.nameAr}</h3><div className="flex snap-x snap-mandatory overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 hide-scrollbar after:content-[''] after:w-px after:shrink-0">{variants.map((variant) => <VariantCard key={variant.key} mode={mode} template={template} variant={variant} onChoose={() => choose(template, variant)} />)}</div></div>)}</div>
            </section>;
          })}
        </section>
      </main>
      <Footer />
      {selected && <LawyerRequestModal selected={selected} catalog={catalog} onClose={() => setSelected(null)} />}
    </div>
  );
}

function VariantCard({ mode, template, variant, onChoose }: { mode: CatalogMode; template: CatalogTemplate; variant: CatalogVariant; onChoose: () => void }) {
  const meta = variantMeta[variant.key] || { tags: [], help: variant.description };
  const total = variant.lawyerAssistedPriceEgp;
  const selfPrice = variant.selfServicePriceEgp;
  const deposit = Math.min(variant.lawyerDepositEgp, total || variant.lawyerDepositEgp);
  const remaining = total > 0 ? Math.max(0, total - deposit) : 0;
  const disabled = mode === "lawyer_assisted" ? total <= 0 : selfPrice <= 0;
  return (
    <article className="flex min-h-[200px] w-[200px] sm:min-h-[240px] shrink-0 snap-center sm:w-full sm:shrink sm:snap-align-none flex-col rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 transition hover:border-[#d9a84e]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-slate-100 text-[#00102e]"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
        {mode === "self_service" ? (
          selfPrice > 0 ? <div className="text-left"><span className="block text-[9px] font-bold text-slate-400">السعر</span><strong className="text-xs sm:text-base font-black text-[#00102e]">{selfPrice.toLocaleString("ar-EG")} ج.م</strong></div> : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-black text-amber-700">السعر غير محدد</span>
        ) : total > 0 ? (
          <div className="text-left"><span className="block text-[9px] font-bold text-slate-400">السعر الكامل</span><strong className="text-xs sm:text-base font-black text-[#00102e]">{total.toLocaleString("ar-EG")} ج.م</strong></div>
        ) : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-black text-amber-700">السعر غير محدد</span>}
      </div>
      <h3 className="mt-2.5 sm:mt-3 text-xs sm:text-sm font-black text-[#00102e]">{variant.nameAr}</h3>
      <p className="mt-1 text-[10px] sm:text-[11px] leading-5 text-slate-600">{meta.help || variant.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">{meta.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{tag}</span>)}</div>
      {mode === "lawyer_assisted" && total > 0 && (
        <div className="mt-2.5 sm:mt-3 grid grid-cols-2 gap-2 rounded-lg border border-[#986410]/15 bg-[#986410]/5 p-2 text-[9px]">
          <div><span className="block text-slate-500">العربون الآن</span><strong className="mt-0.5 block text-[11px] sm:text-xs font-black text-[#986410]">{deposit.toLocaleString("ar-EG")} ج.م</strong></div>
          <div><span className="block text-slate-500">المتبقي</span><strong className="mt-0.5 block text-[11px] sm:text-xs font-black text-[#00102e]">{remaining.toLocaleString("ar-EG")} ج.م</strong></div>
        </div>
      )}
      <div className="mt-auto pt-5 w-full">
        <button type="button" disabled={disabled} onClick={onChoose} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-3 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          {disabled ? "انتظر تحديد السعر" : mode === "self_service" ? "ابدأ إعداد العقد" : "اطلب إعداد العقد"}<ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
      {mode === "lawyer_assisted" && <p className="mt-2 text-center text-[8px] sm:text-[9px] leading-4 text-slate-400">ترفع مستندات العقد أولًا، ثم يبدأ المكتب المراجعة بعد اعتماد العربون.</p>}
    </article>
  );
}

function LawyerRequestModal({ selected, catalog, onClose }: { selected: SelectedVariant; catalog: PublicCatalog; onClose: () => void }) {
  const router = useRouter();
  const { template, variant } = selected;
  const { paymentAccess, paymentVerified, paymentCashNumber, requireVerified } = usePaymentAccess("/create-contract?mode=lawyer_assisted");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [senderWalletPhone, setSenderWalletPhone] = useState("");
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const enabledChannels = useMemo(() => channels.filter((item) => catalog.policies.communicationChannels.includes(item.key)), [catalog.policies.communicationChannels]);
  const documentGuide = lawyerDocumentGuides[variant.key] ?? [];
  const total = variant.lawyerAssistedPriceEgp;
  const deposit = Math.min(variant.lawyerDepositEgp, total);
  const remaining = Math.max(0, total - deposit);
  const cashNumber = paymentCashNumber;

  async function addDocuments(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files);
    if (documents.length + picked.length > MAX_FILES) return setError(`الحد الأقصى ${MAX_FILES} ملفًا للطلب.`);
    setPreparing(true); setError("");
    try {
      const results = await compressMultipleFiles(picked);
      const compressed = results.map((item) => item.file);
      const tooLarge = compressed.find((file) => file.size > MAX_FILE_BYTES);
      if (tooLarge) return setError(`الملف ${tooLarge.name} أكبر من الحد المسموح 20MB.`);
      setDocuments((current) => [...current, ...compressed]);
    } catch {
      setError("تعذر قراءة بعض الملفات. حاول مرة أخرى.");
    } finally { setPreparing(false); }
  }

  async function chooseReceipt(file: File | null) {
    if (!file) return setReceipt(null);
    setPreparing(true); setError("");
    try {
      const result = await compressUploadFile(file);
      if (result.file.size > MAX_FILE_BYTES) return setError("إثبات الدفع أكبر من 20MB.");
      setReceipt(result.file);
    } catch { setReceipt(file); }
    finally { setPreparing(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!(await requireVerified())) { onClose(); return; }
    if (!fullName.trim()) return setError("اكتب الاسم الكامل.");
    const phoneError = phoneValidationError(phone, true); if (phoneError) return setError(phoneError);
    if (!documents.length) return setError("ارفع مستندًا واحدًا على الأقل ليستطيع المحامي بدء مراجعة الطلب.");
    if (!enabledChannels.some((item) => item.key === channel)) return setError("اختر وسيلة تواصل متاحة.");
    if (deposit > 0 && !cashNumber) return setError("بيانات الدفع غير متاحة حاليًا من إدارة المكتب.");
    const senderPhoneError = deposit > 0 ? phoneValidationError(senderWalletPhone, true) : "";
    if (senderPhoneError) return setError(`رقم المحفظة التي تم التحويل منها: ${senderPhoneError}`);
    if (deposit > 0 && !receipt) return setError("ارفع إثبات دفع العربون المطلوب الآن.");

    setSubmitting(true);
    let requestId: number | null = null;
    try {
      const attachmentIds: number[] = [];
      for (const file of documents) {
        const body = new FormData(); body.append("file", file);
        const uploaded = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body });
        attachmentIds.push(uploaded.id);
      }
      const request = await apiRequest<{ id: number; serialNumber: string; paymentAmountEgp: number }>("/api/v1/service-requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: "contract_drafting",
          title: `إعداد ${variant.nameAr} بواسطة محامٍ مختص`,
          description: notes.trim() || `أرغب في أن يتولى محامٍ مختص إعداد ${variant.nameAr}.`,
          communicationChannel: channel,
          attachmentIds,
          templateSlug: template.slug,
          variantKey: variant.key,
          paymentRequired: deposit > 0,
          clientContactSnapshot: { fullName: fullName.trim(), phone: normalizePhoneInput(phone), paymentSenderPhone: normalizePhoneInput(senderWalletPhone), lawyerTotalPriceEgp: total, lawyerDepositEgp: deposit, lawyerRemainingEgp: remaining },
        }),
      });
      requestId = request.id;
      if (request.paymentAmountEgp > 0 && receipt) {
        const body = new FormData(); body.append("file", receipt);
        const uploadedReceipt = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body });
        await apiRequest("/api/v1/payments/receipts", { method: "POST", body: JSON.stringify({ serviceRequestId: request.id, amountEgp: request.paymentAmountEgp, senderPhone: normalizePhoneInput(senderWalletPhone), attachmentId: uploadedReceipt.id }) });
      }
      router.push(`/requests/${request.id}`);
    } catch (caught) {
      if (requestId) { router.push(`/requests/${requestId}?payment=retry`); return; }
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/create-contract?mode=lawyer_assisted`)}`);
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر إرسال طلب إعداد العقد الآن.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#00102e]/80 p-3 backdrop-blur-sm" dir="rtl">
      <form onSubmit={submit} className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        <span className="text-xs font-black text-[#986410]">إعداد بواسطة محامٍ مختص</span>
        <h2 className="mt-2 pr-0 text-xl font-black text-[#00102e] sm:text-2xl">{variant.nameAr}</h2>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">ارفع المستندات المتاحة المرتبطة بالعقد، ثم ارفع إثبات العربون ليبدأ المحامي مراجعة الطلب بعد اعتماد الدفع.</p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[#986410]/20 bg-[#986410]/5 p-4 sm:grid-cols-3">
          <PriceStat label="السعر الكامل" value={total} strong />
          <PriceStat label="العربون الآن" value={deposit} />
          <PriceStat label="المتبقي بعد العربون" value={remaining} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-black text-slate-600">الاسم الكامل<div className="relative mt-2"><User className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pr-10 pl-3 text-sm outline-none focus:border-[#986410]" /></div></label>
          <label className="text-xs font-black text-slate-600">رقم الهاتف أو WhatsApp<div className="relative mt-2"><Phone className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input dir="ltr" value={phone} onChange={(e) => setPhone(normalizePhoneInput(e.target.value))} placeholder="01XXXXXXXXX" className="w-full rounded-xl border border-slate-200 py-3 pr-10 pl-3 text-left text-sm outline-none focus:border-[#986410]" /></div></label>
        </div>

        <div className="mt-5"><p className="text-xs font-black text-slate-600">طريقة التواصل المفضلة</p><div className="mt-2 flex flex-wrap gap-2">{enabledChannels.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => setChannel(item.key)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black ${channel === item.key ? "border-[#986410] bg-[#986410]/10 text-[#986410]" : "border-slate-200 text-slate-600"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div></div>

        <label className="mt-5 block text-xs font-black text-slate-600">ملاحظات للمحامي <span className="font-normal text-slate-400">(اختياري)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="اكتب أي تفاصيل تساعد المحامي على فهم المطلوب." className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#986410]" /></label>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-[#00102e]">مستندات العقد</h3><p className="mt-1 text-[10px] leading-5 text-slate-500">ارفع ملفًا واحدًا على الأقل الآن. يمكن إضافة ملفات أخرى بعد فتح الطلب من صفحة المتابعة.</p></div><span className="shrink-0 text-xs font-black text-slate-500">{documents.length}/{MAX_FILES}</span></div>
          {documentGuide.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-black text-[#00102e]">يفضل تجهيز هذه المستندات</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {documentGuide.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-black text-slate-600"><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(e) => void addDocuments(e.target.files)} />{preparing ? <Loader2 className="h-4 w-4 animate-spin text-[#986410]" /> : <Upload className="h-4 w-4 text-[#986410]" />}اختيار المستندات</label>
          {documents.length > 0 && <div className="mt-3 grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2">{documents.map((file, index) => <UploadedFileCard key={`${file.name}-${index}`} file={file} onRemove={() => setDocuments((current) => current.filter((_, i) => i !== index))} />)}</div>}
        </div>

        {deposit > 0 && !paymentVerified && <button type="button" onClick={() => void requireVerified().then((ok) => { if (!ok) onClose(); })} className="mt-5 w-full rounded-2xl border border-[#986410]/20 bg-[#986410]/5 p-4 text-xs font-black text-[#986410]">{paymentAccess === "unverified" ? "أكد بريدك الإلكتروني لعرض تعليمات دفع العربون" : "سجّل الدخول وأكد بريدك لعرض تعليمات دفع العربون"}</button>}
        {deposit > 0 && paymentVerified && (
          <div className="mt-5 rounded-2xl border border-[#986410]/20 bg-[#986410]/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#986410]"><WalletCards className="h-5 w-5" /></div>
              <div>
                <h3 className="text-sm font-black text-[#00102e]">إثبات دفع العربون</h3>
                <p className="mt-1 text-[10px] leading-5 text-slate-500">حوّل {deposit.toLocaleString("ar-EG")} ج.م إلى رقم الدفع، ثم اكتب رقم المحفظة التي تم التحويل منها وارفع صورة واضحة للإثبات.</p>
              </div>
            </div>
            {cashNumber && <div dir="ltr" className="mt-3 w-fit rounded-lg bg-white px-3 py-2 font-mono text-sm font-black text-[#00102e]">{cashNumber}</div>}
            <label className="mt-3 block text-xs font-black text-slate-600">
              رقم المحفظة التي تم التحويل منها
              <div className="relative mt-2">
                <Phone className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  dir="ltr"
                  type="tel"
                  value={senderWalletPhone}
                  onChange={(e) => setSenderWalletPhone(normalizePhoneInput(e.target.value))}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-xl border border-slate-200 py-3 pr-10 pl-3 text-left text-sm outline-none focus:border-[#986410]"
                />
              </div>
              <span className="mt-1 block text-[10px] font-bold leading-5 text-slate-500">هذا الرقم يساعدنا على مطابقة التحويل ورد المبلغ عند حدوث مشكلة.</span>
            </label>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#986410]/30 bg-white p-4 text-xs font-black text-[#986410]"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => void chooseReceipt(e.target.files?.[0] || null)} /><Upload className="h-4 w-4" />{receipt ? "تغيير إثبات العربون" : "رفع إثبات العربون"}</label>
            {receipt && <div className="mt-3"><UploadedFileCard file={receipt} label="إثبات العربون" onRemove={() => setReceipt(null)} /></div>}
          </div>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        <button type="submit" disabled={submitting || preparing || total <= 0} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" />جاري رفع المستندات وإرسال الطلب...</> : <><CheckCircle2 className="h-4 w-4" />إرسال الطلب للمراجعة</>}</button>
      </form>
    </div>
  );
}

function PriceStat({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div><span className="block text-[10px] font-bold text-slate-500">{label}</span><strong className={`mt-1 block font-black ${strong ? "text-xl text-[#00102e]" : "text-base text-[#986410]"}`}>{value.toLocaleString("ar-EG")} ج.م</strong></div>;
}

function UploadedFileCard({ file, onRemove, label }: { file: File; onRemove: () => void; label?: string }) {
  const canPreview = isPreviewableImage(file);
  const previewUrl = useMemo(() => {
    if (!canPreview || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return "";
    return URL.createObjectURL(file);
  }, [canPreview, file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div
        className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 bg-cover bg-center"
        style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}
      >
        {!previewUrl && (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            {label ? <Receipt className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
            <span className="text-[10px] font-bold">ملف مرفوع</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {label && <span className="block text-[10px] font-black text-[#986410]">{label}</span>}
          <p className="truncate text-[10px] font-black text-[#00102e]" title={file.name}>{file.name}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">{formatFileSize(file.size)}</p>
        </div>
        <button type="button" onClick={onRemove} aria-label={`حذف ${file.name}`} className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}


export default function CreateContractPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}><CreateContractContent /></Suspense>;
}
