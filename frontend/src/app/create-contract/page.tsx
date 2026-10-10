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
  Search,
  Trash2,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { apiRequest, ApiClientError, frontendApi } from "@/lib/apiClient";
import { compressMultipleFiles } from "@/lib/compression";
import type { CommunicationChannel, PublicCatalog } from "@/types/customer";
import { useWizardStore } from "@/store/wizardStore";
import type { ContractSlug } from "@/types/zdraft";
import { normalizePhoneInput, phoneValidationError } from "@/lib/inputValidation";
import GatewayCheckoutModal from "@/components/checkout/GatewayCheckoutModal";
import { formatFileSize } from "@/lib/labels";

const MAX_FILES = 30;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

type CatalogMode = "self_service" | "lawyer_assisted";
type CatalogTemplate = PublicCatalog["templates"][number];
type CatalogVariant = CatalogTemplate["variants"][number];
type SelectedVariant = { template: CatalogTemplate; variant: CatalogVariant };
type ExistingDraft = { id: number; templateSlug: string; variantKey: string; title: string };
type CatalogGroup = { key: string; nameAr: string; description: string; templates: Array<{ template: CatalogTemplate; variants: CatalogVariant[] }> };

const categoryMeta: Record<string, { title: string; subtitle: string; icon: typeof Home }> = {
  rental: { title: "عقود الإيجار", subtitle: "اختر صيغة الإيجار المناسبة لطبيعة استخدام الوحدة.", icon: Home },
  lease: { title: "عقود الإيجار", subtitle: "اختر صيغة الإيجار المناسبة لطبيعة استخدام الوحدة.", icon: Home },
  apartment_sale: { title: "عقود البيع", subtitle: "اختر الصيغة الأقرب لمصدر ملكية الوحدة وطريقة التصرف.", icon: Building2 },
  sale: { title: "عقود البيع", subtitle: "اختر الصيغة الأقرب لمصدر الملكية وطريقة التصرف.", icon: Building2 },
  freelancer: { title: "عقود الخدمات والعمل الحر", subtitle: "عقود مستقلة للخدمات الرقمية والتصميم وإدارة المنصات.", icon: BriefcaseBusiness },
  services: { title: "عقود الخدمات والعمل الحر", subtitle: "عقود مستقلة للخدمات الرقمية والتصميم وإدارة المنصات.", icon: BriefcaseBusiness },
  general: { title: "عقود عامة", subtitle: "قوالب عامة أو لم يتم ربطها بتصنيف متخصص بعد.", icon: FileText },
  other: { title: "عقود عامة", subtitle: "قوالب عامة أو لم يتم ربطها بتصنيف متخصص بعد.", icon: FileText },
};

const channels: Array<{ key: CommunicationChannel; label: string; icon: typeof Video }> = [
  { key: "whatsapp", label: "WhatsApp", icon: Phone },
  { key: "zoom", label: "Zoom", icon: Video },
];

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
  const [suitabilitySelection, setSuitabilitySelection] = useState<SelectedVariant | null>(null);
  const [myDrafts, setMyDrafts] = useState<ExistingDraft[]>([]);

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
      const variants = template.variants
        .filter((variant) => mode === "lawyer_assisted" ? variant.lawyerDraftingEnabled !== false : variant.selfServiceEnabled !== false)
        .filter((variant) => {
          if (!q) return true;
          const suitability = variant.suitability;
          return [
            variant.nameAr,
            variant.description,
            suitability?.shortDescription,
            ...(variant.tags || []),
            ...(suitability?.suitableFor || []),
            ...(suitability?.notSuitableFor || []),
          ].filter(Boolean).join(" ").toLowerCase().includes(q);
        });
      if (!variants.length) return;
      const key = template.categorySlug || "general";
      const fallback = categoryMeta[key] || categoryMeta[template.slug] || categoryMeta.general;
      const group = groups.get(key) || { key, nameAr: template.categoryNameAr || fallback.title, description: template.categoryDescription || fallback.subtitle, templates: [] };
      group.templates.push({ template, variants });
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === "general" || a.key === "other") return 1;
      if (b.key === "general" || b.key === "other") return -1;
      return 0;
    });
  }, [catalog.templates, mode, query]);

  function choose(template: CatalogTemplate, variant: CatalogVariant) {
    if (mode === "self_service") {
      setSuitabilitySelection({ template, variant });
      return;
    }
    setSelected({ template, variant });
  }

  function existingDraftFor(template: CatalogTemplate, variant: CatalogVariant): ExistingDraft | null {
    return myDrafts.find((draft) => draft.templateSlug === template.slug && (!draft.variantKey || draft.variantKey === variant.key)) ?? null;
  }

  function startSelfService(template: CatalogTemplate, variant: CatalogVariant) {
    setSuitabilitySelection(null);
    resetWizard(template.slug as ContractSlug);
    router.push(`/wizard/${template.slug}?mode=self_service&variant=${encodeURIComponent(variant.key)}`);
  }


  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white pt-8 pb-4 sm:pt-10 sm:pb-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-xl font-black text-[#00102e] sm:text-2xl">اختر العقد الذي تريد إعداده</h1>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-500">
                  {mode === "self_service"
                    ? "ابحث باسم العقد أو استخدامه، ثم ابدأ إدخال بياناته خطوة بخطوة. السعر الظاهر هو سعر هذا العقد تحديدًا."
                    : "اختر نوع العقد واحكيلنا محتاجه في إيه. لو عندك مستندات تساعد المحامي تقدر ترفقها بشكل اختياري."}
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
            const iconMeta = categoryMeta[group.key] || categoryMeta[group.templates[0]?.template.slug] || { icon: FileText };
            const Icon = iconMeta.icon;
            return <section key={group.key} id={`category-${group.key}`}>
              <header className="mb-5 flex items-start gap-2.5"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00102e] text-[#d9a84e]"><Icon className="h-3.5 w-3.5" /></div><div><h2 className="text-base sm:text-lg font-black text-[#00102e]">{group.nameAr}</h2><p className="mt-0.5 text-[11px] leading-5 text-slate-500">{group.description}</p></div></header>
              <div className="space-y-6">{group.templates.map(({ template, variants }) => <div key={template.slug}><h3 className="mb-2 text-sm font-black text-[#00102e]">{template.nameAr}</h3><div className="flex snap-x snap-mandatory overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 hide-scrollbar after:content-[''] after:w-px after:shrink-0">{variants.map((variant) => <VariantCard key={variant.key} mode={mode} variant={variant} onChoose={() => choose(template, variant)} />)}</div></div>)}</div>
            </section>;
          })}
        </section>
      </main>
      <Footer />
      {suitabilitySelection && (
        <ContractSuitabilityModal
          selected={suitabilitySelection}
          existingDraft={existingDraftFor(suitabilitySelection.template, suitabilitySelection.variant)}
          onClose={() => setSuitabilitySelection(null)}
          onStartFresh={() => startSelfService(suitabilitySelection.template, suitabilitySelection.variant)}
          onResume={(draftId) => router.push(`/wizard/${suitabilitySelection.template.slug}?contractId=${draftId}`)}
        />
      )}
      {selected && <LawyerRequestModal selected={selected} catalog={catalog} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ContractSuitabilityModal({
  selected,
  existingDraft,
  onClose,
  onStartFresh,
  onResume,
}: {
  selected: SelectedVariant;
  existingDraft: ExistingDraft | null;
  onClose: () => void;
  onStartFresh: () => void;
  onResume: (draftId: number) => void;
}) {
  const { variant } = selected;
  const suitability = variant.suitability;
  const suitableFor = suitability?.suitableFor ?? [];
  const notSuitableFor = suitability?.notSuitableFor ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00102e]/55 px-4 py-6 backdrop-blur-sm" dir="rtl">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-[#986410]/10 px-3 py-1 text-[10px] font-black text-[#986410]">قبل ما تبدأ</span>
            <h2 className="mt-3 text-xl font-black text-[#00102e]">العقد ده مناسب ليك؟</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{suitability?.shortDescription || variant.description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        {suitableFor.length > 0 && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <h3 className="text-xs font-black text-emerald-900">العقد ده مناسب ليك لو...</h3>
            <div className="mt-3 space-y-2">{suitableFor.map((item) => <div key={item} className="flex items-start gap-2 text-xs font-bold leading-6 text-emerald-900"><CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0" /><span>{item}</span></div>)}</div>
          </div>
        )}

        {notSuitableFor.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <h3 className="text-xs font-black text-amber-900">العقد ده مش مناسب ليك لو...</h3>
            <div className="mt-3 space-y-2">{notSuitableFor.map((item) => <div key={item} className="flex items-start gap-2 text-xs font-bold leading-6 text-amber-900"><span className="mt-1 text-amber-700">•</span><span>{item}</span></div>)}</div>
          </div>
        )}

        {existingDraft && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-black text-[#00102e]">عندك عقد من النوع ده لسه مخلصتوش</h3>
            <p className="mt-1 text-xs font-bold text-slate-600">{existingDraft.title}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => onResume(existingDraft.id)} className="flex-1 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white">كمّل المسودة</button>
              <button type="button" onClick={onStartFresh} className="flex-1 rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs font-black text-[#00102e]">ابدأ عقد جديد</button>
            </div>
          </div>
        )}

        {!existingDraft && (
          <button type="button" onClick={onStartFresh} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3.5 text-sm font-black text-white">أيوه، ابدأ العقد <ArrowLeft className="h-4 w-4" /></button>
        )}
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-50">رجوع واختيار عقد تاني</button>
      </section>
    </div>
  );
}

function VariantCard({ mode, variant, onChoose }: { mode: CatalogMode; variant: CatalogVariant; onChoose: () => void }) {
  const total = variant.lawyerAssistedPriceEgp;
  const selfPrice = variant.selfServicePriceEgp;
  const deposit = Math.min(variant.lawyerDepositEgp, total || variant.lawyerDepositEgp);
  const remaining = total > 0 ? Math.max(0, total - deposit) : 0;
  const disabled = mode === "lawyer_assisted"
    ? variant.lawyerDraftingEnabled === false || total <= 0
    : variant.selfServiceEnabled === false || selfPrice <= 0;
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
      <p className="mt-1 text-[10px] sm:text-[11px] leading-5 text-slate-600">{variant.suitability?.shortDescription || variant.description}</p>
      {(variant.tags || []).length > 0 && <div className="mt-2 flex flex-wrap gap-1">{(variant.tags || []).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{tag}</span>)}</div>}
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
      {mode === "lawyer_assisted" && <p className="mt-2 text-center text-[8px] sm:text-[9px] leading-4 text-slate-400">بعد إرسال الطلب، المحامي هيتواصل معاك ويكمل التفاصيل.</p>}
    </article>
  );
}

function LawyerRequestModal({ selected, catalog, onClose }: { selected: SelectedVariant; catalog: PublicCatalog; onClose: () => void }) {
  const router = useRouter();
  const { template, variant } = selected;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [needDescription, setNeedDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdRequest, setCreatedRequest] = useState<{ id: number; serialNumber: string } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const enabledChannels = useMemo(() => channels.filter((item) => catalog.policies.communicationChannels.includes(item.key)), [catalog.policies.communicationChannels]);
  const documentGuide = variant.lawyerDrafting?.helpfulDocuments ?? [];
  const total = variant.lawyerAssistedPriceEgp;
  const deposit = Math.min(variant.lawyerDepositEgp, total);
  const remaining = Math.max(0, total - deposit);

  useEffect(() => {
    frontendApi.profile().then((profile) => {
      setFullName((current) => current || profile.name || "");
      setPhone((current) => current || normalizePhoneInput(profile.whatsappNumber || profile.phone || ""));
    }).catch(() => { /* guest can be redirected after submit */ });
  }, []);

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!fullName.trim()) return setError("اكتب الاسم الكامل.");
    const phoneError = phoneValidationError(phone, true); if (phoneError) return setError(phoneError);
    if (!needDescription.trim()) return setError("احكيلنا بشكل بسيط محتاج العقد في إيه.");
    if (!enabledChannels.some((item) => item.key === channel)) return setError("اختر وسيلة تواصل متاحة.");

    setSubmitting(true);
    try {
      const attachmentIds: number[] = [];
      for (const file of documents) {
        const body = new FormData(); body.append("file", file);
        const uploaded = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body });
        attachmentIds.push(uploaded.id);
      }
      const request = await apiRequest<{ id: number; serialNumber: string; paymentAmountEgp?: number }>("/api/v1/service-requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: "contract_drafting",
          title: `صياغة ${variant.nameAr}`,
          description: needDescription.trim(),
          customerNote: notes.trim() || null,
          communicationChannel: channel,
          attachmentIds,
          templateSlug: template.slug,
          variantKey: variant.key,
          paymentRequired: deposit > 0,
          clientContactSnapshot: {
            fullName: fullName.trim(),
            phone: normalizePhoneInput(phone),
            lawyerTotalPriceEgp: total,
            lawyerDepositEgp: deposit,
            lawyerRemainingEgp: remaining,
          },
        }),
      });
      const created = { id: request.id, serialNumber: request.serialNumber };
      setCreatedRequest(created);
      if (deposit > 0) setCheckoutOpen(true);
      else router.push(`/requests/${request.id}`);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/create-contract?mode=lawyer_assisted`)}`);
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر إرسال طلب إعداد العقد الآن.");
    } finally { setSubmitting(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#00102e]/80 p-3 backdrop-blur-sm" dir="rtl">
        <form onSubmit={submit} className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
          <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          <span className="text-xs font-black text-[#986410]">صياغة بواسطة محامي</span>
          <h2 className="mt-2 text-xl font-black text-[#00102e] sm:text-2xl">{variant.nameAr}</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">قولنا محتاج العقد في إيه، والمحامي هيتواصل معاك ويجمع باقي التفاصيل على وسيلة التواصل اللي تختارها لحد النسخة النهائية.</p>

          <div className="mt-5 grid gap-3 rounded-2xl border border-[#986410]/20 bg-[#986410]/5 p-4 sm:grid-cols-3">
            <PriceStat label="السعر الكامل" value={total} strong />
            <PriceStat label="هتدفع دلوقتي" value={deposit} />
            <PriceStat label="المتبقي بعد كده" value={remaining} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-black text-slate-600">الاسم الكامل<div className="relative mt-2"><User className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pr-10 pl-3 text-sm outline-none focus:border-[#986410]" /></div></label>
            <label className="text-xs font-black text-slate-600">رقم الهاتف أو WhatsApp<div className="relative mt-2"><Phone className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input dir="ltr" value={phone} onChange={(e) => setPhone(normalizePhoneInput(e.target.value))} placeholder="01XXXXXXXXX" className="w-full rounded-xl border border-slate-200 py-3 pr-10 pl-3 text-left text-sm outline-none focus:border-[#986410]" /></div></label>
          </div>

          <div className="mt-5"><p className="text-xs font-black text-slate-600">طريقة التواصل المفضلة</p><div className="mt-2 flex flex-wrap gap-2">{enabledChannels.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => setChannel(item.key)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black ${channel === item.key ? "border-[#986410] bg-[#986410]/10 text-[#986410]" : "border-slate-200 text-slate-600"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div></div>

          <label className="mt-5 block text-xs font-black text-slate-600">محتاج العقد في إيه؟ <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] text-orange-800">مطلوب</span><textarea value={needDescription} onChange={(e) => setNeedDescription(e.target.value)} rows={4} placeholder="احكيلنا بشكل بسيط عن الاتفاق أو المعاملة اللي عايز تعمل لها عقد." className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#986410]" /></label>

          <label className="mt-5 block text-xs font-black text-slate-600">في حاجة معينة حابب تقولها للمحامي؟ <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-500">اختياري</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="اكتب أي ملاحظة إضافية لو موجودة." className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#986410]" /></label>

          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-[#00102e]">عندك مستندات ممكن تساعد المحامي؟ <span className="text-[10px] font-bold text-slate-400">اختياري</span></h3><p className="mt-1 text-[10px] leading-5 text-slate-500">لو متوفرة ارفعها دلوقتي علشان نبدأ أسرع. لو مش موجودة عادي؛ المحامي هيتواصل معاك.</p></div><span className="shrink-0 text-xs font-black text-slate-500">{documents.length}/{MAX_FILES}</span></div>
            {documentGuide.length > 0 && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black text-[#00102e]">ممكن تساعد في النوع ده</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{documentGuide.map((item) => <div key={item} className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span>{item}</span></div>)}</div></div>}
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-black text-slate-600"><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(e) => void addDocuments(e.target.files)} />{preparing ? <Loader2 className="h-4 w-4 animate-spin text-[#986410]" /> : <Upload className="h-4 w-4 text-[#986410]" />}اختيار المستندات</label>
            {documents.length > 0 && <div className="mt-3 grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2">{documents.map((file, index) => <UploadedFileCard key={`${file.name}-${index}`} file={file} onRemove={() => setDocuments((current) => current.filter((_, i) => i !== index))} />)}</div>}
          </div>

          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-[11px] font-bold leading-6 text-blue-900">بعد إرسال الطلب هتدفع المبلغ المطلوب من خلال بوابة الدفع الإلكترونية، وبعد تأكيد الدفع يبدأ مسار الخدمة تلقائيًا.</div>
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
          <button type="submit" disabled={submitting || preparing || total <= 0 || Boolean(createdRequest)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" />جاري إنشاء الطلب...</> : <><CheckCircle2 className="h-4 w-4" />{deposit > 0 ? "أنشئ الطلب وادفع العربون" : "أنشئ الطلب"}</>}</button>
        </form>
      </div>

      {createdRequest && deposit > 0 && (
        <GatewayCheckoutModal
          isOpen={checkoutOpen}
          onClose={() => { setCheckoutOpen(false); router.push(`/requests/${createdRequest.id}`); }}
          orderTitle={`صياغة ${variant.nameAr}`}
          amountEgp={deposit}
          serviceRequestId={createdRequest.id}
          serialNumber={createdRequest.serialNumber}
          purpose="lawyer_drafting_initial"
          lineItems={[{ key: "initial", label: "الدفعة المطلوبة الآن", amountEgp: deposit }]}
          metadata={{ templateSlug: template.slug, variantKey: variant.key, totalPriceEgp: total, remainingEgp: remaining }}
          onPaid={() => router.push(`/requests/${createdRequest.id}?payment=success`)}
        />
      )}
    </>
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
            <FileText className="h-6 w-6" />
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
