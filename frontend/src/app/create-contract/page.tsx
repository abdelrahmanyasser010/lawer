"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, type FormEvent } from "react";
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
  Scale,
  Search,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { apiRequest, ApiClientError } from "@/lib/apiClient";
import { compressMultipleFiles, compressUploadFile } from "@/lib/compression";
import type { CommunicationChannel, PublicCatalog } from "@/types/customer";
import { useWizardStore } from "@/store/wizardStore";
import type { ContractSlug } from "@/types/zdraft";
import { normalizePhoneInput, phoneValidationError } from "@/lib/inputValidation";

const MAX_FILES = 30;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

type CatalogMode = "self_service" | "lawyer_assisted";
type CatalogTemplate = PublicCatalog["templates"][number];
type CatalogVariant = CatalogTemplate["variants"][number];
type SelectedVariant = { template: CatalogTemplate; variant: CatalogVariant };

const categoryOrder = ["rental", "apartment_sale", "freelancer"];
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

function CreateContractContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { catalog, loading, loadError } = usePublicCatalog();
  const resetWizard = useWizardStore((state) => state.resetWizard);
  const mode: CatalogMode = searchParams.get("mode") === "lawyer_assisted" ? "lawyer_assisted" : "self_service";
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedVariant | null>(null);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categoryOrder.map((slug) => {
      const template = catalog.templates.find((item) => item.slug === slug);
      if (!template) return null;
      const variants = template.variants.filter((variant) => {
        if (!q) return true;
        const meta = variantMeta[variant.key];
        return [variant.nameAr, variant.description, meta?.help, ...(meta?.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(q);
      });
      return variants.length ? { template, variants } : null;
    }).filter(Boolean) as Array<{ template: CatalogTemplate; variants: CatalogVariant[] }>;
  }, [catalog.templates, query]);

  function choose(template: CatalogTemplate, variant: CatalogVariant) {
    if (mode === "self_service") {
      resetWizard(template.slug as ContractSlug);
      router.push(`/wizard/${template.slug}?mode=self_service&variant=${encodeURIComponent(variant.key)}`);
      return;
    }
    setSelected({ template, variant });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white pt-8 pb-4 sm:pt-10 sm:pb-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">

            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#00102e] sm:text-3xl">اختر العقد الذي تريد إعداده</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                  {mode === "self_service"
                    ? "ابحث باسم العقد أو استخدامه، ثم ابدأ إدخال بياناته خطوة بخطوة. السعر الظاهر هو سعر هذا العقد تحديدًا."
                    : "اختر نوع العقد، ثم ارفع المستندات اللازمة. يظهر لك السعر الكامل والعربون المطلوب قبل إرسال الطلب للمكتب."}
                </p>
              </div>

              <div className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <Link href="/create-contract?mode=self_service" className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition-all ${mode === "self_service" ? "bg-[#00102e] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  إعداد بنفسي
                </Link>
                <Link href="/create-contract?mode=lawyer_assisted" className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition-all ${mode === "lawyer_assisted" ? "bg-[#00102e] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  إعداد بواسطة محامٍ
                </Link>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-6 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide text-sm font-bold text-slate-500">
                {categoryOrder.map(slug => {
                  const m = categoryMeta[slug];
                  if (!m) return null;
                  return (
                    <a key={slug} href={`#category-${slug}`} className="hover:text-[#00102e] whitespace-nowrap transition-colors">{m.title}</a>
                  );
                })}
              </div>

              <div className="relative flex items-center shrink-0">
                {isSearchOpen ? (
                  <div className="relative animate-in slide-in-from-left-4 fade-in duration-200 w-[240px] sm:w-[320px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setIsSearchOpen(false)}
                      placeholder="ابحث باسم العقد..."
                      className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm font-bold text-[#00102e] outline-none transition focus:border-[#986410] focus:ring-1 focus:ring-[#986410]"
                    />
                    <button onClick={() => { setIsSearchOpen(false); setQuery(""); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition">
                    <Search className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#986410]" /><p className="mt-3 text-sm font-bold text-slate-500">جاري تحميل العقود والأسعار...</p></div>
          ) : loadError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm font-bold text-amber-900">تعذر تحميل العقود والأسعار مؤقتًا. حاول مرة أخرى بعد قليل.</div>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-black text-slate-600">لا توجد عقود مطابقة للبحث.</p></div>
          ) : grouped.map(({ template, variants }) => {
            const meta = categoryMeta[template.slug] || { title: template.nameAr, subtitle: template.description, icon: FileText };
            const Icon = meta.icon;
            return (
              <section key={template.slug} id={`category-${template.slug}`}>
                <header className="mb-6 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00102e] text-[#d9a84e]"><Icon className="h-4 w-4" /></div>
                  <div><h2 className="text-xl font-black text-[#00102e]">{meta.title}</h2><p className="mt-1 text-xs leading-6 text-slate-500">{meta.subtitle}</p></div>
                </header>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {variants.map((variant) => (
                    <VariantCard key={variant.key} mode={mode} template={template} variant={variant} onChoose={() => choose(template, variant)} />
                  ))}
                </div>
              </section>
            );
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
    <article className="flex min-h-[260px] flex-col rounded-2xl border border-slate-200 bg-white p-[24px] transition hover:border-[#d9a84e]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#00102e]"><FileText className="h-5 w-5" /></div>
        {mode === "self_service" ? (
          selfPrice > 0 ? <div className="text-left"><span className="block text-[10px] font-bold text-slate-400">السعر</span><strong className="text-lg font-black text-[#00102e]">{selfPrice.toLocaleString("ar-EG")} ج.م</strong></div> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">السعر غير محدد</span>
        ) : total > 0 ? (
          <div className="text-left"><span className="block text-[10px] font-bold text-slate-400">السعر الكامل</span><strong className="text-lg font-black text-[#00102e]">{total.toLocaleString("ar-EG")} ج.م</strong></div>
        ) : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">السعر غير محدد</span>}
      </div>
      <h3 className="mt-4 text-lg font-black text-[#00102e]">{variant.nameAr}</h3>
      <p className="mt-2 text-xs leading-6 text-slate-600">{meta.help || variant.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{meta.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{tag}</span>)}</div>
      {mode === "lawyer_assisted" && total > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#986410]/15 bg-[#986410]/5 p-3 text-[10px]">
          <div><span className="block text-slate-500">العربون الآن</span><strong className="mt-0.5 block text-sm font-black text-[#986410]">{deposit.toLocaleString("ar-EG")} ج.م</strong></div>
          <div><span className="block text-slate-500">المتبقي</span><strong className="mt-0.5 block text-sm font-black text-[#00102e]">{remaining.toLocaleString("ar-EG")} ج.م</strong></div>
        </div>
      )}
      <button type="button" disabled={disabled} onClick={onChoose} className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
        {disabled ? "انتظر تحديد السعر" : mode === "self_service" ? "ابدأ إعداد العقد" : "اطلب إعداد العقد"}<ArrowLeft className="h-4 w-4" />
      </button>
      {mode === "lawyer_assisted" && <p className="mt-2 text-center text-[9px] leading-4 text-slate-400">ترفع مستندات العقد أولًا، ثم يبدأ المكتب المراجعة بعد اعتماد العربون.</p>}
    </article>
  );
}

function LawyerRequestModal({ selected, catalog, onClose }: { selected: SelectedVariant; catalog: PublicCatalog; onClose: () => void }) {
  const router = useRouter();
  const { template, variant } = selected;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const enabledChannels = useMemo(() => channels.filter((item) => catalog.policies.communicationChannels.includes(item.key)), [catalog.policies.communicationChannels]);
  const total = variant.lawyerAssistedPriceEgp;
  const deposit = Math.min(variant.lawyerDepositEgp, total);
  const remaining = Math.max(0, total - deposit);
  const cashNumber = catalog.payment.vodafoneCashNumber;

  async function addDocuments(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files);
    if (documents.length + picked.length > MAX_FILES) return setError(`الحد الأقصى ${MAX_FILES} ملفًا للطلب.`);
    setPreparing(true); setError("");
    try {
      const results = await compressMultipleFiles(picked);
      const compressed = results.map((item) => item.file);
      const tooLarge = compressed.find((file) => file.size > MAX_FILE_BYTES);
      if (tooLarge) return setError(`الملف ${tooLarge.name} أكبر من 20MB بعد التجهيز.`);
      setDocuments((current) => [...current, ...compressed]);
    } catch {
      setError("تعذر تجهيز بعض الملفات. حاول مرة أخرى.");
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
    if (!fullName.trim()) return setError("اكتب الاسم الكامل.");
    const phoneError = phoneValidationError(phone, true); if (phoneError) return setError(phoneError);
    if (!documents.length) return setError("ارفع مستندًا واحدًا على الأقل ليستطيع المحامي بدء مراجعة الطلب.");
    if (!enabledChannels.some((item) => item.key === channel)) return setError("اختر وسيلة تواصل متاحة.");
    if (deposit > 0 && !cashNumber) return setError("بيانات الدفع غير متاحة حاليًا من إدارة المكتب.");
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
          title: `إعداد ${variant.nameAr} بواسطة محامي المكتب`,
          description: notes.trim() || `أرغب في أن يتولى محامي المكتب إعداد ${variant.nameAr}.`,
          communicationChannel: channel,
          attachmentIds,
          templateSlug: template.slug,
          variantKey: variant.key,
          paymentRequired: deposit > 0,
          clientContactSnapshot: { fullName: fullName.trim(), phone: normalizePhoneInput(phone), lawyerTotalPriceEgp: total, lawyerDepositEgp: deposit, lawyerRemainingEgp: remaining },
        }),
      });
      requestId = request.id;
      if (request.paymentAmountEgp > 0 && receipt) {
        const body = new FormData(); body.append("file", receipt);
        const uploadedReceipt = await apiRequest<{ id: number }>("/api/v1/attachments", { method: "POST", body });
        await apiRequest("/api/v1/payments/receipts", { method: "POST", body: JSON.stringify({ serviceRequestId: request.id, amountEgp: request.paymentAmountEgp, senderPhone: normalizePhoneInput(phone), attachmentId: uploadedReceipt.id }) });
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
        <span className="text-xs font-black text-[#986410]">إعداد بواسطة محامي المكتب</span>
        <h2 className="mt-2 pr-0 text-xl font-black text-[#00102e] sm:text-2xl">{variant.nameAr}</h2>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">ارفع المستندات المتاحة المرتبطة بالعقد. في مرحلة مراجعة القوالب سنحدد قائمة المستندات الإلزامية الخاصة بكل نوع عقد بدقة.</p>

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
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-[#00102e]">مستندات العقد</h3><p className="mt-1 text-[10px] text-slate-500">إلزامي حاليًا ملف واحد على الأقل · حد أقصى {MAX_FILES} ملفًا · 20MB للملف · الصور تُضغط تلقائيًا.</p></div><span className="text-xs font-black text-slate-500">{documents.length}/{MAX_FILES}</span></div>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-black text-slate-600"><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="hidden" disabled={preparing} onChange={(e) => void addDocuments(e.target.files)} />{preparing ? <Loader2 className="h-4 w-4 animate-spin text-[#986410]" /> : <Upload className="h-4 w-4 text-[#986410]" />}اختيار المستندات</label>
          {documents.length > 0 && <div className="mt-3 flex max-h-32 flex-wrap gap-2 overflow-y-auto">{documents.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600"><span className="max-w-44 truncate">{file.name}</span><button type="button" onClick={() => setDocuments((current) => current.filter((_, i) => i !== index))}><X className="h-3 w-3 text-red-500" /></button></span>)}</div>}
        </div>

        {deposit > 0 && <div className="mt-5 rounded-2xl border border-[#986410]/20 bg-[#986410]/5 p-4"><h3 className="text-sm font-black text-[#00102e]">إثبات دفع العربون</h3><p className="mt-1 text-[10px] leading-5 text-slate-500">حوّل {deposit.toLocaleString("ar-EG")} ج.م إلى رقم الدفع الظاهر في المنصة، ثم ارفع صورة أو PDF للإثبات.</p>{cashNumber && <div dir="ltr" className="mt-2 w-fit rounded-lg bg-white px-3 py-2 font-mono text-sm font-black text-[#00102e]">{cashNumber}</div>}<label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#986410]/30 bg-white p-4 text-xs font-black text-[#986410]"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => void chooseReceipt(e.target.files?.[0] || null)} /><Upload className="h-4 w-4" />{receipt ? receipt.name : "رفع إثبات العربون"}</label></div>}

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
        <button type="submit" disabled={submitting || preparing || total <= 0} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" />جاري رفع المستندات وإرسال الطلب...</> : <><CheckCircle2 className="h-4 w-4" />إرسال الطلب للمكتب</>}</button>
      </form>
    </div>
  );
}

function PriceStat({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div><span className="block text-[10px] font-bold text-slate-500">{label}</span><strong className={`mt-1 block font-black ${strong ? "text-xl text-[#00102e]" : "text-base text-[#986410]"}`}>{value.toLocaleString("ar-EG")} ج.م</strong></div>;
}


export default function CreateContractPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}><CreateContractContent /></Suspense>;
}
