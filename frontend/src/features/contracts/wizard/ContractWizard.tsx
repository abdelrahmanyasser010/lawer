"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VodafoneCashModal from "@/components/checkout/VodafoneCashModal";
import ArabicCurrencyInput from "@/components/contract/ArabicCurrencyInput";
import FieldLabel from "@/components/contract/FieldLabel";
import {
  Lock, ArrowRight, ArrowLeft, Upload, FileCheck,
  ShieldCheck, CheckCircle2, Zap, ExternalLink, Camera, Receipt, FileText, Sparkles,
} from "lucide-react";
import { compressUploadFile } from "@/lib/compression";
import { apiRequest, ApiClientError } from "@/lib/apiClient";
import type { ContractSlug, CreationMode } from "@/types/zdraft";
import type { ContractDetails } from "@/types/customer";
import type { ContractFieldValue } from "@/features/contracts/domain/contractTemplate.types";
import { useTemplateDefinition } from "@/features/contracts/hooks/useTemplateDefinition";
import { evaluateCondition, resolveWizardDefinition } from "@/features/contracts/wizard/resolveWizardDefinition";
import { useWizardStore } from "@/store/wizardStore";
import VariantSelector from "@/features/contracts/wizard/VariantSelector";
import OptionalClauseSelector from "@/features/contracts/wizard/OptionalClauseSelector";
import DynamicOptionalStep from "@/features/contracts/wizard/DynamicOptionalStep";
import { validateDynamicDefinition } from "@/features/contracts/validation/validateDraft";
import { saveDraftSnapshot } from "@/features/contracts/data/draftRepository";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import ActionDialog from "@/components/ui/ActionDialog";
import MobileWizardPreview from "./MobileWizardPreview";

/* ── Admin-configurable help text + video per field (from backend/dashboard) ── */
const fieldHelp: Record<string, { help?: string; video?: string }> = {
  landlord_name:        { help: "يُقصد بالاسم الرباعي: الاسم الأول + اسم الأب + اسم الجد + اسم العائلة كما هو مدون في بطاقة الرقم القومي بالضبط." },
  landlord_national_id: { help: "الرقم القومي المكون من 14 رقماً والمدون على وجه بطاقة الرقم القومي. تأكد من عدم وجود مسافات." },
  landlord_phone:       { help: "رقم هاتف محمول مصري يبدأ بـ 01 ومكون من 11 رقماً." },
  landlord_address:     { help: "العنوان كما هو مدون في بطاقة الرقم القومي (المحافظة - المركز - القرية/المدينة - الشارع)." },
  tenant_name:          { help: "اسم المستأجر الرباعي كما هو مدون في بطاقة الرقم القومي." },
  tenant_national_id:   { help: "الرقم القومي للمستأجر مكون من 14 رقماً." },
  tenant_phone:         { help: "رقم هاتف المستأجر للتواصل." },
  tenant_address:       { help: "العنوان الحالي للمستأجر (عنوان إقامته الآن وليس عنوان الشقة المؤجرة)." },
  property_address:     { help: "العنوان الدقيق للعين المؤجرة: الشارع ورقم العمارة والدور ورقم الشقة." },
  property_area:        { help: "المساحة بالمتر المربع كما هي مدونة في عقد الملكية أو رخصة البناء." },
  rent_amount:          { help: "القيمة الإيجارية المتفق عليها عن الفترة المحددة في العقد (شهر أو سنة)، مستقلة عن مبلغ التأمين وأي رسوم خارجية." },
  deposit_amount:       { help: "مبلغ التأمين المسترد عند انتهاء العقد وتسليم العين المؤجرة بحالة سليمة." },
  annual_increase_rate: { help: "تظهر هذه النسبة فقط إذا تم تفعيل الزيادة الدورية، وعندها تصبح النسبة إلزامية." },
};

type WizardFormValue = ContractFieldValue;

const highlightClass = "ring-2 ring-[#986410] bg-[#986410]/5 rounded-xl transition-all duration-300";
const normalClass = "rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300";
const competentCourts = ["القاهرة","شمال القاهرة","جنوب القاهرة","القاهرة الجديدة","شمال الجيزة","جنوب الجيزة","الإسكندرية","طنطا","دمنهور","كفر الشيخ","المنصورة","الزقازيق","بنها","شبين الكوم","بورسعيد","الإسماعيلية","السويس","دمياط","بني سويف","الفيوم","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","شمال سيناء","جنوب سيناء","مرسى مطروح"] as const;

function LiveField({ value, placeholder = "_______________" }: { value: WizardFormValue; placeholder?: string }) {
  const display = value && String(value).trim() !== "" ? String(value) : placeholder;
  const isPlaceholder = !value || String(value).trim() === "";
  return (
    <strong className={isPlaceholder ? "text-slate-400 font-normal" : "text-[#00102e] font-bold"}>
      {display}
    </strong>
  );
}

function contractDurationText(amountValue: WizardFormValue, unitValue: WizardFormValue) {
  const amount = Number(amountValue);
  const unit = String(unitValue || "month");
  if (!amount || amount <= 0) return "";

  const months = unit === "year" ? amount * 12 : amount;
  if (months === 1) return "شهر واحد";
  if (months === 2) return "شهران";
  if (months === 6) return "ستة أشهر";
  if (months === 12) return "سنة واحدة (12 شهراً)";
  if (months === 24) return "سنتان (24 شهراً)";
  if (months === 36) return "ثلاث سنوات (36 شهراً)";
  return `${months.toLocaleString("ar-EG")} شهراً`;
}

export default function WizardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const requestedContractId = Number(searchParams.get("contractId") || 0);
  const requestedVariantKey = searchParams.get("variant")?.trim() || "";

  const contractSlug: ContractSlug = slug;
  const { definition: templateDefinition, loading: templateLoading, error: templateError } =
    useTemplateDefinition(contractSlug);
  const { catalog } = usePublicCatalog();
  const editHours = catalog.policies.selfServiceEditHours;

  const draft = useWizardStore((state) => state.drafts[contractSlug]);
  const ensureDraft = useWizardStore((state) => state.ensureDraft);
  const selectVariant = useWizardStore((state) => state.selectVariant);
  const setStoredFieldValue = useWizardStore((state) => state.setFieldValue);
  const setStoredStepKey = useWizardStore((state) => state.setCurrentStepKey);
  const toggleStoredOptionalClause = useWizardStore((state) => state.toggleOptionalClause);
  const setStoredAttachmentRefs = useWizardStore((state) => state.setAttachmentRefs);
  const setBackendDraftReference = useWizardStore((state) => state.setBackendDraftReference);
  const hydrateBackendDraft = useWizardStore((state) => state.hydrateBackendDraft);
  const resetWizard = useWizardStore((state) => state.resetWizard);

  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ title: string; message: string; confirmOnly: boolean; confirmLabel?: string; onConfirm?: () => void } | null>(null);
  const showNotice = (message: string, title = "تنبيه") => setActionDialog({ title, message, confirmOnly: true });
  const [autoSaveStatus, setAutoSaveStatus] = useState("تم الحفظ التلقائي ✓");
  const [backendContract, setBackendContract] = useState<ContractDetails | null>(null);
  const [checkoutContract, setCheckoutContract] = useState<{ id: number; serialNumber: string } | null>(null);
  const loadedContractId = useRef<number | null>(null);

  useEffect(() => {
    if (!templateDefinition) return;
    const requestedVariant = requestedVariantKey
      ? templateDefinition.variants.find((variant) => variant.key === requestedVariantKey)
      : undefined;
    const defaultVariant = requestedVariant?.key ?? (templateDefinition.variants.length === 1
      ? templateDefinition.variants[0]?.key ?? null
      : null);
    const selectedVariant = defaultVariant
      ? templateDefinition.variants.find((variant) => variant.key === defaultVariant)
      : undefined;
    const firstStepKey = selectedVariant?.steps[0]?.key ?? `${contractSlug}_start`;
    ensureDraft({
      slug: contractSlug,
      templateVersion: templateDefinition.version,
      variantKey: defaultVariant,
      creationMode: "self_service",
      firstStepKey,
      defaultFieldValues: selectedVariant?.defaultFieldValues,
    });
  }, [contractSlug, ensureDraft, requestedVariantKey, templateDefinition]);

  useEffect(() => {
    if (!templateDefinition || !Number.isInteger(requestedContractId) || requestedContractId <= 0) return;
    if (loadedContractId.current === requestedContractId) return;
    loadedContractId.current = requestedContractId;
    apiRequest<ContractDetails>(`/api/v1/contracts/${requestedContractId}`)
      .then((contract) => {
        if (contract.template_slug !== contractSlug) throw new Error("العقد لا يتبع هذا القالب");
        const selectedVariant = templateDefinition.variants.find((variant) => variant.key === contract.variant_key);
        hydrateBackendDraft(contractSlug, {
          id: contract.id,
          versionId: contract.current_version_id,
          serialNumber: contract.serial_number,
          templateVersion: contract.template_version ?? templateDefinition.version,
          variantKey: contract.variant_key,
          selectedOptionalClauseKeys: contract.selected_optional_clause_keys ?? [],
          fieldValues: contract.field_values_json ?? {},
          touchedFieldKeys: contract.touched_field_keys_json ?? [],
          attachmentRefs: contract.attachment_refs_json ?? {},
          currentStepKey: contract.current_step_key || selectedVariant?.steps[0]?.key || `${contractSlug}_start`,
          creationMode: (contract.creation_mode || "self_service") as CreationMode,
          coreIdentityLocked: Boolean(contract.core_identity_locked),
        });
        setBackendContract(contract);
      })
      .catch((caught) => {
        loadedContractId.current = null;
        if (caught instanceof ApiClientError && caught.status === 401) {
          router.replace(`/login?next=/wizard/${contractSlug}?contractId=${requestedContractId}`);
          return;
        }
        showNotice(caught instanceof Error ? caught.message : "تعذر تحميل بيانات العقد");
      });
  }, [contractSlug, hydrateBackendDraft, requestedContractId, router, templateDefinition]);

  const resolvedWizard = useMemo(() => {
    if (!templateDefinition || !draft?.variantKey) return null;
    return resolveWizardDefinition(
      templateDefinition,
      draft.variantKey,
      draft.selectedOptionalClauseKeys,
      draft.fieldValues,
    );
  }, [draft, templateDefinition]);

  const activeSteps = useMemo(() => resolvedWizard?.steps ?? [], [resolvedWizard]);
  const progressSteps = useMemo(() => activeSteps.map((step, index) => ({
    step: index + 1,
    key: step.key,
    label: step.titleAr,
    articleRange: step.articleRange ?? "",
  })), [activeSteps]);
  const currentStepKey = draft?.currentStepKey ?? activeSteps[0]?.key ?? "";
  const currentStepIndex = Math.max(0, activeSteps.findIndex((step) => step.key === currentStepKey));
  const currentStep = activeSteps.length > 0 ? currentStepIndex + 1 : 1;
  const activeStep = activeSteps[currentStepIndex];
  const formData = draft?.fieldValues ?? {};
  const touchedFieldKeys = useMemo(() => new Set(draft?.touchedFieldKeys ?? []), [draft?.touchedFieldKeys]);
  const progressRequiredFields = useMemo(
    () => resolvedWizard?.steps.flatMap((step) => step.fields.filter((field) => field.required)) ?? [],
    [resolvedWizard],
  );


  const displaySerial = draft?.serialNumber || "رقم المسودة يظهر بعد الحفظ";

  const setCurrentStep = (next: number | ((previous: number) => number)) => {
    if (activeSteps.length === 0) return;
    const requested = typeof next === "function" ? next(currentStep) : next;
    const normalized = Math.min(activeSteps.length, Math.max(1, requested));
    setStoredStepKey(contractSlug, activeSteps[normalized - 1].key);
  };

  useEffect(() => {
    if (!draft || activeSteps.length === 0) return;
    if (!activeSteps.some((step) => step.key === draft.currentStepKey)) {
      setStoredStepKey(contractSlug, activeSteps[0].key);
    }
  }, [activeSteps, contractSlug, draft, setStoredStepKey]);



  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Privacy migration: old browser-persistent caches may contain identity data.
  // Delete them instead of importing them into the new short-lived session draft.
  useEffect(() => {
    localStorage.removeItem("zdraft-wizard-storage-v2");
    localStorage.removeItem(`zdraft_saved_draft_${slug}`);
  }, [slug]);

  // Zustand persistence is the single source of truth; this status is only UX feedback.
  useEffect(() => {
    if (!draft?.updatedAt) return;
    const savingTimer = window.setTimeout(() => setAutoSaveStatus("جاري الحفظ..."), 0);
    const savedTimer = window.setTimeout(() => setAutoSaveStatus("تم الحفظ التلقائي ✓"), 350);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(savedTimer);
    };
  }, [draft?.updatedAt]);



  const selectedVariantDefinition = templateDefinition?.variants.find((variant) => variant.key === draft?.variantKey);
  const contractTitle = selectedVariantDefinition?.documentTitleAr
    ?? selectedVariantDefinition?.nameAr
    ?? templateDefinition?.nameAr
    ?? (slug === "rental" ? "عقد إيجار" : slug === "apartment_sale" ? "عقد بيع وحدة سكنية" : "عقود الخدمات والعمل الحر");

  const priceEgp = draft?.variantKey
    ? (templateDefinition?.variantPricing?.[draft.variantKey]?.selfServicePriceEgp ?? 0)
    : 0;
  const selfServicePriceConfigured = priceEgp > 0;

  const field = (key: string) => {
    const v = formData[key];
    return typeof v === "string" || typeof v === "number" ? v : "";
  };


  const coreIdentityLocked = Boolean(backendContract?.core_identity_locked || draft?.coreIdentityLocked);

  const toggleOptionalClause = (clauseKey: string) => {
    if (coreIdentityLocked) {
      showNotice("لا يمكن تغيير نوع العقد أو ملاحقه بعد اعتماد الدفع.");
      return;
    }
    const clauseDefinition = templateDefinition?.optionalClauses.find((clause) => clause.key === clauseKey);
    toggleStoredOptionalClause(contractSlug, clauseKey, clauseDefinition?.defaultFieldValues);
  };




  const handleChangeVariant = () => {
    setActionDialog({
      title: "تغيير نوع العقد",
      message: "تغيير نوع العقد سيبدأ مسودة جديدة لهذا القالب. هل تريد المتابعة؟",
      confirmOnly: false,
      confirmLabel: "بدء مسودة جديدة",
      onConfirm: () => { resetWizard(contractSlug); setActionDialog(null); },
    });
  };

  const renderReviewLifecycleAndShare = () => (
    <div className="rounded-2xl border border-[#986410]/30 bg-[#00102e] p-5 text-white shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#986410] p-2 text-[#00102e]"><ShieldCheck className="h-5 w-5" /></div>
        <div>
          <h4 className="text-sm font-extrabold">المسودة محفوظة داخل حسابك</h4>
          <p className="mt-1 text-[11px] leading-6 text-slate-300">يمكنك إدخال البيانات وحفظ المسودة قبل الدفع. التنزيل والمشاركة لا يتاحان إلا بعد اعتماد الدفع وإصدار النسخة النهائية.</p>
        </div>
      </div>
    </div>
  );

  const renderDeclarationConsent = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 shrink-0">
          <input type="checkbox" checked={declarationAccepted} onChange={(event) => setDeclarationAccepted(event.target.checked)} className="sr-only" />
          <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${declarationAccepted ? "bg-[#00102e] border-[#00102e]" : "border-slate-300 bg-white group-hover:border-[#986410]"}`}>
            {declarationAccepted && <CheckCircle2 className="h-3.5 w-3.5 text-[#986410]" />}
          </div>
        </div>
        <span className="text-xs text-slate-700 leading-relaxed">
          أقر بأنني قرأت وفهمت ووافقت على{" "}
          <a href="/declaration" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="font-bold text-[#986410] underline underline-offset-2 hover:text-[#00102e] transition-colors inline-flex items-center gap-0.5">
            وثيقة الإقرار والموافقة القانونية الكاملة <ExternalLink className="h-3 w-3" />
          </a>{" "}
          وأن البيانات والمستندات التي أدخلتها صحيحة حسب علمي.
        </span>
      </label>
      {!declarationAccepted && <p className="mr-8 flex items-center gap-1 text-[10px] font-bold text-amber-700">⚠ يجب قبول الإقرار قبل الانتقال للدفع</p>}
    </div>
  );

  const propertyLocationText = [
    field("property_governorate"),
    field("property_city"),
    field("property_district"),
    field("residential_compound_name") ? `كمبوند ${field("residential_compound_name")}` : "",
    field("commercial_project_name") ? `مشروع/مول ${field("commercial_project_name")}` : "",
    field("administrative_project_name") ? `مشروع/برج ${field("administrative_project_name")}` : "",
    field("residential_plot_number") ? `قطعة ${field("residential_plot_number")}` : field("commercial_plot_number") ? `قطعة ${field("commercial_plot_number")}` : field("administrative_plot_number") ? `قطعة ${field("administrative_plot_number")}` : "",
    field("residential_adjacency_number") ? `مجاورة ${field("residential_adjacency_number")}` : "",
    field("property_street") ? `شارع ${field("property_street")}` : "",
    field("building_number") ? `عقار ${field("building_number")}` : "",
    field("building_name"),
    field("floor_number") ? `دور ${field("floor_number")}` : "",
    field("unit_number") ? `وحدة ${field("unit_number")}` : "",
  ].filter(Boolean).join(" - ");

  const requiredReviewItems = [
    { key: "landlord_name", label: "الطرف الأول (المؤجر)", value: field("landlord_party_type") === "company" ? field("landlord_company_name") : field("landlord_name") },
    { key: "tenant_name", label: "الطرف الثاني (المستأجر)", value: field("tenant_party_type") === "company" ? field("tenant_company_name") : field("tenant_name") },
    { key: "property_location", label: "العين المؤجرة", value: propertyLocationText },
    { key: "lease_duration_text", label: "مدة العقد", value: field("lease_duration_text") },
    { key: "start_date", label: "تاريخ البداية", value: field("start_date") },
    { key: "end_date", label: "تاريخ الانتهاء", value: field("end_date") },
    { key: "rent_amount", label: "القيمة الإيجارية", value: field("rent_amount") ? `${field("rent_amount")} ج.م` : "" },
    { key: "deposit_amount", label: "مبلغ التأمين", value: field("deposit_amount") ? `${field("deposit_amount")} ج.م` : "" },
  ];
  const dynamicValidationIssues = resolvedWizard && draft
    ? validateDynamicDefinition(resolvedWizard, draft)
    : [];
  const isContractReadyForPayment = dynamicValidationIssues.length === 0;

  const persistDraft = async () => {
    if (!draft) throw new Error("لا توجد مسودة قابلة للحفظ");
    const saved = await saveDraftSnapshot(draft);
    setBackendDraftReference(contractSlug, saved);
    setCheckoutContract({ id: saved.id, serialNumber: saved.serialNumber });
    return saved;
  };

  const openCheckoutIfReady = async () => {
    if (!isContractReadyForPayment) {
      showNotice(["يرجى استكمال البيانات المطلوبة قبل الدفع:", ...dynamicValidationIssues.map((item) => `- ${item.labelAr}`)].join("\n"));
      const firstIssue = dynamicValidationIssues[0];
      if (firstIssue) setStoredStepKey(contractSlug, firstIssue.stepKey);
      return;
    }
    if (!declarationAccepted) {
      showNotice("يرجى الموافقة أولاً على إقرار صحة البيانات والمسؤولية القانونية ثم المتابعة للدفع.");
      return;
    }
    try {
      await persistDraft();
      setIsCheckoutOpen(true);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.push(`/login?next=/wizard/${contractSlug}`);
        return;
      }
      showNotice(caught instanceof Error ? caught.message : "تعذر حفظ المسودة قبل الدفع");
    }
  };






  const requiredAnnexKeys = new Set(selectedVariantDefinition?.requiredAnnexKeys ?? []);
  const selectedAnnexDefinitions = templateDefinition?.optionalClauses.filter(
    (clause) => (requiredAnnexKeys.has(clause.key) || Boolean(clause.requiredWhen && evaluateCondition(clause.requiredWhen, draft?.fieldValues ?? {})) || draft?.selectedOptionalClauseKeys.includes(clause.key)) && clause.outputMode === "separate_annex",
  ) ?? [];


  const renderSelectedAnnexCards = () => {
    if (selectedAnnexDefinitions.length === 0) return null;
    return (
      <div className="space-y-3 border-t border-dashed border-[#986410]/40 pt-4">
        <div className="text-[10px] font-black text-[#986410]">ملاحق ستُطبع مع العقد</div>
        {selectedAnnexDefinitions.map((annex) => (
          <div key={annex.key} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[11px] leading-6 text-emerald-950">
            <div className="flex items-center justify-between gap-3">
              <strong className="font-black">{annex.documentTitleAr ?? annex.nameAr}</strong>
              <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-emerald-800">قالب فارغ</span>
            </div>
            <p className="mt-1 text-[10px] text-emerald-800">سيصدر هذا الملحق مع العقد كقالب جاهز للطباعة، ويُستكمل يدويًا بعد الطباعة. لا نطلب بياناته داخل المنصة.</p>
          </div>
        ))}
      </div>
    );
  };

  const mobileCourtKey = contractSlug === "rental" || contractSlug === "apartment_sale" ? "" : draft?.variantKey === "visual_identity_design" ? "visual_competent_court" : draft?.variantKey === "website_development" ? "website_competent_court" : "social_competent_court";
  const mobilePreviewRows = activeSteps.flatMap((step) => step.fields).filter((item) => !["contract_date", mobileCourtKey].includes(item.key) && !["attachment", "repeater"].includes(item.type)).map((item) => {
    const raw = formData[item.key];
    const value = typeof raw === "boolean" ? (raw ? "نعم" : "لا") : typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
    return { label: item.labelAr, value };
  }).filter((item) => item.value.trim() !== "");
  const mobilePreviewControls = <>
    <div className="fixed bottom-5 right-4 z-40 xl:hidden">
      <button type="button" onClick={() => setIsMobilePreviewOpen(true)} className="inline-flex items-center gap-2 rounded-full border-2 border-[#986410] bg-[#00102e] px-5 py-3 text-xs font-black text-[#d9a84e] shadow-2xl"><FileText className="h-4 w-4"/>معاينة العقد</button>
    </div>
    <MobileWizardPreview open={isMobilePreviewOpen} onClose={() => setIsMobilePreviewOpen(false)} title={contractTitle} serial={displaySerial} contractDate={String(field("contract_date") || "")} court={String(field(mobileCourtKey) || "")} rows={mobilePreviewRows} annexes={selectedAnnexDefinitions.map((item) => item.documentTitleAr ?? item.nameAr)} />
  </>;


  if (templateError) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="max-w-xl rounded-2xl border border-red-200 bg-white p-6 text-sm font-bold leading-7 text-red-700 shadow-sm">
            تعذر تحميل تعريف القالب: {templateError}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (templateLoading || !templateDefinition || !draft) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-sm font-black text-[#00102e] shadow-sm">
            جاري تحميل تعريف القالب والمسودة...
          </div>
        </main>
        <Footer />
      </div>
    );
  }



  if (!draft.variantKey && templateDefinition.variants.length > 0) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="rounded-full bg-[#986410]/10 px-3 py-1 text-xs font-black text-[#986410]">اختيار نوع العقد</span>
            <h1 className="mt-3 text-2xl font-black text-[#00102e]">{contractTitle}</h1>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">
              اختر نوع العقد الأقرب لحالتك قبل بدء إدخال البيانات. ستظهر لك الحقول المطلوبة لهذا النوع فقط.
            </p>
          </div>
          <VariantSelector
            template={templateDefinition}
            selectedVariantKey={draft.variantKey}
            onSelect={(variantKey) => {
              if (coreIdentityLocked) {
                showNotice("لا يمكن تغيير نوع العقد بعد اعتماد الدفع.");
                return;
              }
              const variant = templateDefinition.variants.find((item) => item.key === variantKey);
              if (!variant) return;
              selectVariant(
                contractSlug,
                variant.key,
                variant.steps[0]?.key ?? `${contractSlug}_start`,
                variant.defaultFieldValues,
              );
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

    const isReviewStep = activeStep?.fields.length === 0;



  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 mx-auto max-w-[1400px] w-full px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-12">

        {/* Header Box with clean top spacing */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border border-slate-200 bg-white p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-[#00102e]/10 px-2.5 py-0.5 text-xs font-bold text-[#00102e] border border-[#00102e]/20">
                إعداد العقد خطوة بخطوة
              </span>
              <span className="text-xs text-slate-400 font-mono">{displaySerial}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#00102e]">{contractTitle}</h1>
            <button type="button" onClick={handleChangeVariant} className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-600 hover:border-[#986410]/40 hover:text-[#986410]">
              تغيير نوع عقد الإيجار
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {autoSaveStatus}
            </span>
            <span className="rounded-xl bg-[#00102e] px-3.5 py-1.5 text-xs font-bold text-[#986410]">
              {priceEgp} ج.م
            </span>
          </div>
        </div>

        {/* Immutability Notice */}
        <div className="rounded-xl border border-[#986410]/30 bg-[#986410]/5 p-3.5 mb-6 flex items-start gap-3">
          <Lock className="h-4 w-4 text-[#986410] shrink-0 mt-0.5" />
          <div className="text-xs text-[#00102e] leading-relaxed">
            <strong className="block font-bold mb-0.5">تنبيه حماية البيانات الأساسية</strong>
            بيانات الأطراف الأساسية والعين المؤجرة تُقفل نهائياً بعد اعتماد العقد ودفع رسوم Z draft.
          </div>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          {progressSteps.map((s, i) => (
            <React.Fragment key={s.step}>
              <button
                onClick={() => setCurrentStep(s.step)}
                className={`flex shrink-0 flex-col items-center gap-1 px-3 py-2 rounded-xl text-center transition-all cursor-pointer whitespace-nowrap ${
                  currentStep === s.step
                    ? "bg-[#00102e] text-white shadow-md"
                    : currentStep > s.step
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-white text-slate-400 border border-slate-200"
                }`}
              >
                <span className={`text-[10px] font-extrabold rounded-full w-5 h-5 shrink-0 flex items-center justify-center ${
                  currentStep === s.step ? "bg-[#986410] text-white" : currentStep > s.step ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}>{s.step}</span>
                <span className="hidden text-[10px] font-bold leading-tight sm:block">{s.label}</span>
                <span className="hidden text-[9px] opacity-70 sm:block">{s.articleRange}</span>
              </button>
              {i < progressSteps.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[12px] shrink-0 rounded-full ${currentStep > s.step ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* SPLIT: LEFT = live preview, RIGHT = form */}
        <div className="grid grid-cols-1 xl:grid-cols-11 gap-6 items-start">

          {/* ─── RIGHT: FORM ─── */}
          <div id="wizard-form" className="xl:col-span-5 space-y-5 scroll-mt-24">
            {activeStep && !isReviewStep && (
              <DynamicOptionalStep
                step={activeStep}
                fieldValues={formData}
                onFieldChange={(fieldKey, value) => setStoredFieldValue(contractSlug, fieldKey, value)}
              />
            )}
            {/* Rental fields are rendered directly from the reviewed template schema.
                This keeps required/optional/conditional rules identical to the backend definition. */}

            {/* REVIEW STEP */}
            {isReviewStep && (
              <div className="rounded-2xl border border-[#986410]/30 bg-[#986410]/5 p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-[#986410]/20 pb-3">
                  <ShieldCheck className="h-6 w-6 text-[#00102e]" />
                  <div>
                    <h3 className="text-sm font-extrabold text-[#00102e]">مراجعة واعتماد العقد</h3>
                    <p className="text-xs text-slate-600 mt-0.5">راجع بيانات العقد ثم اقرأ الإقرار وادفع</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4"><h4 className="text-xs font-black text-[#00102e]">اختر الملاحق المطلوبة</h4><p className="mt-1 text-[10px] leading-5 text-slate-500">يمكن اختيار أكثر من ملحق. يصدر الملحق كقالب فارغ مع العقد لتعبئته يدويًا بعد الطباعة.</p><div className="mt-3"><OptionalClauseSelector template={templateDefinition} variantKey={draft.variantKey!} selectedClauseKeys={draft.selectedOptionalClauseKeys} fieldValues={draft.fieldValues} onToggle={toggleOptionalClause} /></div></div>
                {selectedAnnexDefinitions.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-[10px] font-black text-emerald-800">الملاحق المختارة</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedAnnexDefinitions.map((clause) => <span key={clause.key} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-emerald-800">{clause.nameAr}</span>)}
                    </div>
                  </div>
                )}
                <div className="space-y-2 text-xs">
                  {requiredReviewItems.map(({ label, value }) => {
                    const ok = !!String(value || "").trim();
                    return (
                    <div key={label} className={`flex items-center justify-between rounded-lg px-3 py-2 ${ok ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                      <span className="text-slate-700">{label}</span>
                      <span className={`font-bold ${ok ? "text-emerald-800" : "text-red-600"}`}>{ok ? value : "⚠ مطلوب"}</span>
                    </div>
                    );
                  })}
                </div>

                {renderReviewLifecycleAndShare()}

                {renderDeclarationConsent()}

                <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs text-slate-500">رسوم الصياغة والاعتماد:</span>
                    <div className="text-xl font-extrabold text-[#00102e]">
                      {selfServicePriceConfigured ? `${priceEgp} ج.م فقط` : "السعر غير محدد"}
                    </div>
                  </div>
                  <button
                    onClick={() => void openCheckoutIfReady()}
                    disabled={!declarationAccepted || !isContractReadyForPayment || !selfServicePriceConfigured}
                    className={`w-full rounded-xl px-5 py-3 text-xs font-bold transition-colors shadow-md sm:w-auto whitespace-nowrap ${
                      declarationAccepted && isContractReadyForPayment && selfServicePriceConfigured
                        ? "bg-[#00102e] text-[#986410] hover:bg-[#0a1f4d] cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {!selfServicePriceConfigured ? "السعر غير محدد من الإدارة" : isContractReadyForPayment ? `حفظ المسودة والمتابعة للدفع — ${priceEgp} ج.م` : "استكمل المطلوب"}
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <button disabled={currentStep === 1} onClick={() => setCurrentStep(p => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 shadow-xs">
                <ArrowRight className="h-4 w-4" />خطوة سابقة
              </button>
              {currentStep < progressSteps.length && (
                <button onClick={() => setCurrentStep(p => Math.min(progressSteps.length, p + 1))}
                  className="rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0a1f4d] flex items-center gap-1.5 shadow-sm transition-colors">
                  خطوة تالية<ArrowLeft className="h-4 w-4 text-[#986410]" />
                </button>
              )}
            </div>
          </div>

          {/* ─── LEFT: LIVE CONTRACT PREVIEW ─── */}
          <div id="wizard-preview" className="hidden xl:col-span-6 xl:block sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
              {/* Preview Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-[#00102e]">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#986410]" />
                  معاينة حية ومباشرة للعقد — تحديث فوري
                </span>
                <span className="rounded-full bg-[#986410]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#986410] border border-[#986410]/30">
                  تحديث مباشر
                </span>
              </div>

              {/* Contract Document */}
              <div className="p-5 sm:p-7 space-y-4 text-xs leading-relaxed text-[#00102e] font-sans" dir="rtl">
                <div className="text-center pb-4 border-b-2 border-[#00102e]">
                  <div className="text-[10px] text-[#986410] font-bold uppercase tracking-widest mb-1">منصة Z draft لإعداد العقود</div>
                  <h2 className="text-lg font-extrabold text-[#00102e]">{contractTitle}</h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{displaySerial} — مسودة قيد الإعداد</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-[11px] font-black text-[#00102e]">ملخص البيانات المدخلة</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {mobilePreviewRows.length ? mobilePreviewRows.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <div className="text-[9px] font-bold text-slate-500">{item.label}</div>
                        <div className="mt-1 text-[11px] font-extrabold text-[#00102e] break-words">{item.value}</div>
                      </div>
                    )) : <div className="text-[10px] text-slate-400">ابدأ بإدخال بيانات العقد لتظهر هنا.</div>}
                  </div>
                </div>
                {renderSelectedAnnexCards()}
                <div className="pt-4 border-t-2 border-[#00102e] grid grid-cols-2 gap-4 text-center text-[10px]">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="font-extrabold text-[#00102e] mb-1">الطرف الأول</div>
                    <div className="text-slate-500 text-[9px] mb-4"><span className="text-slate-300">________________________</span></div>
                    <div className="border-b border-slate-400 w-3/4 mx-auto" /><div className="text-slate-400 mt-1 text-[9px]">التوقيع والبصمة</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="font-extrabold text-[#00102e] mb-1">الطرف الثاني</div>
                    <div className="text-slate-500 text-[9px] mb-4"><span className="text-slate-300">________________________</span></div>
                    <div className="border-b border-slate-400 w-3/4 mx-auto" /><div className="text-slate-400 mt-1 text-[9px]">التوقيع والبصمة</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5 text-[#986410]" />Z draft — معاينة بيانات العقد قبل الإصدار</span>
                  <span className="font-mono">{displaySerial}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {mobilePreviewControls}

      <ActionDialog
        open={Boolean(actionDialog)}
        title={actionDialog?.title}
        message={actionDialog?.message || ""}
        confirmOnly={actionDialog?.confirmOnly}
        confirmLabel={actionDialog?.confirmLabel}
        onClose={() => setActionDialog(null)}
        onConfirm={() => { const callback = actionDialog?.onConfirm; if (callback) callback(); else setActionDialog(null); }}
      />
      <Footer />
      <VodafoneCashModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} orderTitle={contractTitle} amountEgp={priceEgp} contractId={checkoutContract?.id ?? draft?.backendContractId} serialNumber={checkoutContract?.serialNumber ?? draft?.serialNumber} />
    </div>
  );
}
