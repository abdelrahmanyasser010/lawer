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
  ShieldCheck, CheckCircle2, Zap, ExternalLink, Camera, Receipt, FileText, Share2, Sparkles,
} from "lucide-react";
import { compressUploadFile } from "@/lib/compression";
import { apiRequest, ApiClientError } from "@/lib/apiClient";
import type { ContractSlug, CreationMode } from "@/types/zdraft";
import type { ContractDetails } from "@/types/customer";
import type { ContractFieldValue, RepeaterRowValue } from "@/features/contracts/domain/contractTemplate.types";
import { useTemplateDefinition } from "@/features/contracts/hooks/useTemplateDefinition";
import { resolveWizardDefinition } from "@/features/contracts/wizard/resolveWizardDefinition";
import { useWizardStore } from "@/store/wizardStore";
import VariantSelector from "@/features/contracts/wizard/VariantSelector";
import OptionalClauseSelector from "@/features/contracts/wizard/OptionalClauseSelector";
import DynamicOptionalStep from "@/features/contracts/wizard/DynamicOptionalStep";
import { validateDynamicDefinition } from "@/features/contracts/validation/validateDraft";
import { saveDraftSnapshot } from "@/features/contracts/data/draftRepository";

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
  monthly_rent:         { help: "قيمة الإيجار الشهري بالجنيه المصري بدون الضرائب أو رسوم الصيانة." },
  deposit_amount:       { help: "مبلغ التأمين المسترد عند انتهاء العقد وتسليم العين المؤجرة بحالة سليمة." },
  annual_increase:      { help: "نسبة الزيادة السنوية المتفق عليها (مثال: 10% تعني أن الإيجار يزيد بنسبة 10% كل سنة)." },
};

type WizardFormValue = ContractFieldValue;

interface SavedWizardDraft {
  step?: number;
  formData?: Record<string, ContractFieldValue>;
}

const highlightClass = "ring-2 ring-[#986410] bg-[#986410]/5 rounded-xl transition-all duration-300";
const normalClass = "rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300";

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

  const contractSlug: ContractSlug = slug;
  const { definition: templateDefinition, loading: templateLoading, error: templateError } =
    useTemplateDefinition(contractSlug);

  const draft = useWizardStore((state) => state.drafts[contractSlug]);
  const ensureDraft = useWizardStore((state) => state.ensureDraft);
  const selectVariant = useWizardStore((state) => state.selectVariant);
  const setStoredFieldValue = useWizardStore((state) => state.setFieldValue);
  const setStoredStepKey = useWizardStore((state) => state.setCurrentStepKey);
  const toggleStoredOptionalClause = useWizardStore((state) => state.toggleOptionalClause);
  const setStoredAttachmentRefs = useWizardStore((state) => state.setAttachmentRefs);
  const setBackendDraftReference = useWizardStore((state) => state.setBackendDraftReference);
  const hydrateBackendDraft = useWizardStore((state) => state.hydrateBackendDraft);
  const hydrateLegacyDraft = useWizardStore((state) => state.hydrateLegacyDraft);
  const resetWizard = useWizardStore((state) => state.resetWizard);

  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("تم الحفظ التلقائي ✓");
  const [backendContract, setBackendContract] = useState<ContractDetails | null>(null);
  const [checkoutContract, setCheckoutContract] = useState<{ id: number; serialNumber: string } | null>(null);
  const loadedContractId = useRef<number | null>(null);

  useEffect(() => {
    if (!templateDefinition) return;
    const defaultVariant = templateDefinition.variants.length === 1
      ? templateDefinition.variants[0]?.key ?? null
      : null;
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
  }, [contractSlug, ensureDraft, templateDefinition]);

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
        alert(caught instanceof Error ? caught.message : "تعذر تحميل بيانات العقد");
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
  }, [draft?.fieldValues, draft?.selectedOptionalClauseKeys, draft?.variantKey, templateDefinition]);

  const activeSteps = resolvedWizard?.steps ?? [];
  const progressSteps = activeSteps.map((step, index) => ({
    step: index + 1,
    key: step.key,
    label: step.titleAr,
    articleRange: step.articleRange ?? "",
  }));
  const currentStepKey = draft?.currentStepKey ?? activeSteps[0]?.key ?? "";
  const currentStepIndex = Math.max(0, activeSteps.findIndex((step) => step.key === currentStepKey));
  const currentStep = activeSteps.length > 0 ? currentStepIndex + 1 : 1;
  const activeStep = activeSteps[currentStepIndex];
  const formData = draft?.fieldValues ?? {};
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

  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [uploadPreviews, setUploadPreviews] = useState<Record<string, string[]>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [shareZId, setShareZId] = useState("");
  const [sharePermission, setSharePermission] = useState<"review_only" | "review_edit">("review_only");
  const [generatedShareLink, setGeneratedShareLink] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

  // One-time migration from the pre-engine per-template localStorage draft.
  useEffect(() => {
    if (!draft || activeSteps.length === 0) return;
    const legacyKey = `zdraft_saved_draft_${slug}`;
    const saved = localStorage.getItem(legacyKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as SavedWizardDraft;
      const legacyStepKey = activeSteps[Math.max(0, Math.min(activeSteps.length - 1, (parsed.step ?? 1) - 1))]?.key;
      if (parsed.formData && legacyStepKey) {
        hydrateLegacyDraft(contractSlug, parsed.formData, legacyStepKey);
      }
      localStorage.removeItem(legacyKey);
    } catch (error) {
      console.error("Unable to migrate legacy wizard draft", error);
    }
  }, [activeSteps, contractSlug, draft, hydrateLegacyDraft, slug]);

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

  useEffect(() => {
    if (!draft?.attachmentRefs) return;
    setUploads(
      Object.fromEntries(
        Object.entries(draft.attachmentRefs).map(([key, refs]) => [key, refs.length ? `${refs.length} ملف مرفوع` : ""]),
      ),
    );
  }, [draft?.attachmentRefs]);

  useEffect(() => {
    return () => {
      Object.values(uploadPreviews).flat().forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadPreviews]);

  const selectedVariantDefinition = templateDefinition?.variants.find((variant) => variant.key === draft?.variantKey);
  const contractTitle = selectedVariantDefinition?.documentTitleAr
    ?? selectedVariantDefinition?.nameAr
    ?? templateDefinition?.nameAr
    ?? (slug === "rental" ? "عقد إيجار" : slug === "apartment_sale" ? "عقد بيع وحدة سكنية" : "عقود الخدمات والعمل الحر");

  const priceEgp = templateDefinition?.priceEgp ?? (slug === "apartment_sale" ? 149 : 59);

  const field = (key: string) => {
    const v = formData[key];
    return typeof v === "string" || typeof v === "number" ? v : "";
  };

  const lockedCoreFieldKeys = new Set(backendContract?.coreIdentityFieldKeys ?? []);
  const coreIdentityLocked = Boolean(backendContract?.core_identity_locked || draft?.coreIdentityLocked);
  const set = (key: string, value: WizardFormValue) => {
    if (coreIdentityLocked && lockedCoreFieldKeys.has(key)) {
      alert("هذه البيانات ثبتت بعد اعتماد الدفع. لطلب تصحيحها استخدم خدمة المراجعة أو تواصل مع المكتب.");
      return;
    }
    setStoredFieldValue(contractSlug, key, value);
  };

  const toggleOptionalClause = (clauseKey: string) => {
    if (coreIdentityLocked) {
      alert("لا يمكن تغيير نوع العقد أو ملاحقه بعد اعتماد الدفع.");
      return;
    }
    const isSelected = draft?.selectedOptionalClauseKeys.includes(clauseKey) ?? false;
    const clauseDefinition = templateDefinition?.optionalClauses.find((clause) => clause.key === clauseKey);
    toggleStoredOptionalClause(contractSlug, clauseKey, clauseDefinition?.defaultFieldValues);
    if (clauseKey === "sale_installment_schedule") {
      setStoredFieldValue(contractSlug, "sale_payment_method", isSelected ? "cash_full" : "installments");
    }
  };

  const selectSalePaymentMethod = (method: string) => {
    const hasInstallmentClause = draft?.selectedOptionalClauseKeys.includes("sale_installment_schedule") ?? false;
    if (method === "installments" && !hasInstallmentClause) {
      toggleStoredOptionalClause(
        contractSlug,
        "sale_installment_schedule",
        templateDefinition?.optionalClauses.find((clause) => clause.key === "sale_installment_schedule")?.defaultFieldValues,
      );
    }
    if (method !== "installments" && hasInstallmentClause) {
      toggleStoredOptionalClause(
        contractSlug,
        "sale_installment_schedule",
        templateDefinition?.optionalClauses.find((clause) => clause.key === "sale_installment_schedule")?.defaultFieldValues,
      );
    }
    setStoredFieldValue(contractSlug, "sale_payment_method", method);
  };

  const saleOwnershipLabels: Record<string, string> = {
    initial_sale_contract: "عقد بيع ابتدائي",
    customary_sale_contract: "عقد بيع عرفي",
    court_judgment: "حكم قضائي",
    inheritance_declaration: "إعلام وراثة",
    registered_sale_contract: "عقد بيع مسجل",
    allocation: "تخصيص من جهة",
    other: "أخرى",
  };

  const saleFinishingLabels: Record<string, string> = {
    brick: "طوب",
    plaster: "محارة",
    lux: "لوكس",
    fully_finished: "تشطيب كامل",
    super_lux: "سوبر لوكس",
    super_high_lux: "سوبر هاي لوكس",
  };

  const salePaymentLabels: Record<string, string> = {
    cash_full: "نقداً بالكامل",
    bank_transfer: "تحويل بنكي",
    down_payment_later: "دفعة مقدمة والباقي لاحقاً",
    installments: "أقساط",
  };

  const registrationLabels: Record<string, string> = {
    yes: "مسجل بالشهر العقاري",
    no: "غير مسجل",
    unknown: "لم يتم تحديد حالة التسجيل بعد",
  };

  const payerLabels: Record<string, string> = {
    seller: "البائع",
    buyer: "المشتري",
    split: "مناصفة",
    shared: "مناصفة",
  };

  const rentalSummaryArticles = draft?.variantKey === "commercial_lease"
    ? [
        "وصف الوحدة التجارية وملحقاتها وموقعها وواجهاتها والتجهيزات التابعة لها.",
        "تحديد النشاط التجاري المرخص وعدم تغييره أو إضافة نشاط آخر دون موافقة.",
        "مدة الإيجار والتجديد الكتابي والأجرة والتأمين وآلية السداد.",
        "مسؤولية المستأجر عن التراخيص والدفاع المدني والسجل والبطاقة الضريبية.",
        "تنظيم اللافتات والتجهيزات والمخزن والتحميل والتنزيل وساعات التشغيل.",
        "المرافق والصيانة والتسليم والإخلاء والفسخ والإخطارات والاختصاص القضائي.",
      ]
    : draft?.variantKey === "administrative_lease"
      ? [
          "وصف المقر الإداري وموقعه داخل البرج أو المجمع وطبيعة استعماله.",
          "تحديد النشاط الإداري أو المهني ومنع تحويله إلى نشاط تجاري أو سكني.",
          "مدة الإيجار والأجرة والتأمين والزيادة وآلية السداد.",
          "التراخيص ولوائح المبنى واستقبال الزوار واللافتات والتجهيزات.",
          "المرافق والصيانة الجوهرية والبسيطة والتسليم والإخلاء.",
          "الفسخ والقوة القاهرة والإخطارات والقانون والمحكمة المختصة.",
        ]
      : [
          "وصف العين السكنية وملحقاتها وحالتها والغرض السكني المحدد.",
          "مدة الإيجار والتجديد الكتابي والأجرة والتأمين وآلية السداد.",
          "الصيانة البسيطة على المستأجر والصيانة الجوهرية على المؤجر.",
          "المرافق والعدادات والخدمات المشتركة وتسوية المستحقات.",
          "المحظورات والتأجير من الباطن والتسليم والإخلاء والفسخ.",
          "القوة القاهرة والإخطارات والقانون والمحكمة والمرفقات.",
        ];

  const saleLabel = (value: WizardFormValue, labels: Record<string, string>, fallback = "لم يتم التحديد") =>
    labels[String(value || "")] || fallback;

  const handleChangeVariant = () => {
    if (!window.confirm("تغيير نوع العقد سيبدأ مسودة جديدة لهذا القالب. هل تريد المتابعة؟")) return;
    resetWizard(contractSlug);
  };

  const handleCreateShareLink = async () => {
    if (!draft || !resolvedWizard) return;
    const normalizedZId = shareZId.trim().toUpperCase().replace(/\s+/g, "");
    if (normalizedZId.length < 6 || normalizedZId.length > 32 || !/^[A-Z0-9_-]+$/.test(normalizedZId)) {
      alert("أدخل Z-ID صحيحًا للطرف الآخر (حروف وأرقام، من 6 إلى 32 رمزًا).");
      return;
    }

    try {
      const saved = await saveDraftSnapshot(draft);
      setBackendDraftReference(contractSlug, saved);
      const editableFieldKeys = sharePermission === "review_edit"
        ? [...new Set(resolvedWizard.steps.flatMap((step) => step.fields.filter((item) => item.type !== "attachment").map((item) => item.key)))]
        : [];
      const result = await apiRequest<{ shareUrl: string }>(`/api/v1/contracts/${saved.id}/shares`, {
        method: "POST",
        body: JSON.stringify({
          permission: sharePermission === "review_edit" ? "edit" : "view_only",
          targetPublicId: normalizedZId,
          editableFieldKeys,
          expiresInDays: 7,
        }),
      });
      setGeneratedShareLink(result.shareUrl);
      setShareCopied(true);
      await navigator.clipboard?.writeText(result.shareUrl);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (error) {
      alert(error instanceof Error ? error.message : "تعذر إنشاء رابط المشاركة. تأكد من تسجيل الدخول وصحة Z-ID.");
    }
  };

  const propertyLocationText = [
    field("property_governorate"),
    field("property_city"),
    field("property_district"),
    field("property_compound_name") ? `مشروع/كمبوند ${field("property_compound_name")}` : "",
    field("property_plot_number") ? `قطعة ${field("property_plot_number")}` : "",
    field("property_adjacency_number") ? `مجاورة ${field("property_adjacency_number")}` : "",
    field("property_street") ? `شارع ${field("property_street")}` : "",
    field("building_number") ? `عقار ${field("building_number")}` : "",
    field("building_name"),
    field("floor_number") ? `دور ${field("floor_number")}` : "",
    field("unit_number") ? `وحدة ${field("unit_number")}` : "",
  ].filter(Boolean).join(" - ");

  const companyRequiredItems = (prefix: string, partyTypeField: string, partyLabel: string) =>
    field(partyTypeField) === "company"
      ? [
          { key: `${prefix}_company_name`, label: `اسم شركة ${partyLabel}`, value: field(`${prefix}_company_name`) },
          { key: `${prefix}_company_legal_form`, label: `الشكل القانوني لـ${partyLabel}`, value: field(`${prefix}_company_legal_form`) },
          { key: `${prefix}_commercial_registry`, label: `السجل التجاري لـ${partyLabel}`, value: field(`${prefix}_commercial_registry`) },
          { key: `${prefix}_tax_card_number`, label: `البطاقة الضريبية لـ${partyLabel}`, value: field(`${prefix}_tax_card_number`) },
          { key: `${prefix}_legal_representative_name`, label: `الممثل القانوني لـ${partyLabel}`, value: field(`${prefix}_legal_representative_name`) },
          { key: `${prefix}_legal_representative_capacity`, label: `صفة ممثل ${partyLabel}`, value: field(`${prefix}_legal_representative_capacity`) },
          { key: `${prefix}_company_headquarters`, label: `مقر شركة ${partyLabel}`, value: field(`${prefix}_company_headquarters`) },
        ]
      : [];

  const rentalCompanyRequiredItems = [
    ...companyRequiredItems("landlord", "landlord_party_type", "المؤجر"),
    ...companyRequiredItems("tenant", "tenant_party_type", "المستأجر"),
  ];

  const requiredReviewItems = [
    { key: "landlord_name", label: "الطرف الأول (المؤجر)", value: field("landlord_party_type") === "company" ? field("landlord_company_name") : field("landlord_name") },
    { key: "landlord_national_id", label: "رقم هوية المؤجر", value: field("landlord_national_id") },
    { key: "landlord_phone", label: "هاتف المؤجر", value: field("landlord_phone") },
    { key: "tenant_name", label: "الطرف الثاني (المستأجر)", value: field("tenant_party_type") === "company" ? field("tenant_company_name") : field("tenant_name") },
    { key: "tenant_national_id", label: "رقم هوية المستأجر", value: field("tenant_national_id") },
    { key: "tenant_phone", label: "هاتف المستأجر", value: field("tenant_phone") },
    { key: "property_location", label: "بيانات العين المؤجرة", value: propertyLocationText },
    { key: "monthly_rent", label: "قيمة الإيجار الشهري", value: field("monthly_rent") ? `${field("monthly_rent")} ج.م` : "" },
    { key: "deposit_amount", label: "مبلغ التأمين", value: field("has_deposit") === "no" ? "لا يوجد تأمين" : field("deposit_amount") ? `${field("deposit_amount")} ج.م` : "" },
    { key: "rent_due_day", label: "موعد دفع الإيجار", value: field("rent_due_day") },
    { key: "payment_method", label: "طريقة الدفع", value: field("payment_method") },
    { key: "start_date", label: "تاريخ البدء", value: field("start_date") || "" },
    { key: "end_date", label: "تاريخ الانتهاء", value: field("end_date") || "" },
    { key: "non_renewal_notice_days", label: "مهلة الإخطار", value: field("non_renewal_notice_days") ? `${field("non_renewal_notice_days")} يوم` : "" },
    { key: "deposit_return_days", label: "مدة رد التأمين", value: field("has_deposit") === "no" ? "لا يوجد تأمين" : field("deposit_return_days") ? `${field("deposit_return_days")} يوم` : "" },
    { key: "competent_court", label: "المحكمة المختصة", value: field("competent_court") || "" },
  ];
  const rentalRequiredAttachmentItems = [
    { key: "landlord_id_card_front", label: "وجه بطاقة المؤجر" },
    { key: "landlord_id_card_back", label: "ظهر بطاقة المؤجر" },
    { key: "tenant_id_card_front", label: "وجه بطاقة المستأجر" },
    { key: "tenant_id_card_back", label: "ظهر بطاقة المستأجر" },
  ];
  const missingRentalAttachments = rentalRequiredAttachmentItems.filter((item) => !uploads[item.key]);
  const dynamicValidationIssues = resolvedWizard && draft
    ? validateDynamicDefinition(resolvedWizard, draft)
    : [];
  const freelancerDynamicIssues = contractSlug === "freelancer" ? dynamicValidationIssues : [];
  const freelancerRequiredFieldCount = resolvedWizard?.steps.reduce(
    (total, step) => total + step.fields.filter((field) => field.required).length,
    0,
  ) ?? 0;
  const freelancerCompletionPercent = Math.max(
    0,
    Math.round(((freelancerRequiredFieldCount - freelancerDynamicIssues.length) / Math.max(1, freelancerRequiredFieldCount)) * 100),
  );
  const isFreelancerReadyForPayment = freelancerDynamicIssues.length === 0;
  const rentalDynamicIssues = contractSlug === "rental" ? dynamicValidationIssues : [];
  const missingRequiredItems = [
    ...requiredReviewItems.filter((item) => !String(item.value || "").trim()),
    ...rentalCompanyRequiredItems.filter((item) => !String(item.value || "").trim()),
    ...missingRentalAttachments.map((item) => ({ ...item, value: "" })),
    ...rentalDynamicIssues.map((item) => ({ key: item.fieldKey, label: item.labelAr, value: "" })),
  ];
  const isContractReadyForPayment = missingRequiredItems.length === 0;
  const dynamicRequiredFieldCount = resolvedWizard?.steps.reduce(
    (total, step) => total + step.fields.filter((field) => field.required).length,
    0,
  ) ?? 0;
  const rentalCompletionTotal = requiredReviewItems.length + rentalCompanyRequiredItems.length + rentalRequiredAttachmentItems.length + (contractSlug === "rental" ? dynamicRequiredFieldCount : 0);
  const rentalCompletionPercent = Math.max(0, Math.round(((rentalCompletionTotal - missingRequiredItems.length) / Math.max(1, rentalCompletionTotal)) * 100));
  const rentalNeedsLawyerReview =
    field("late_payment_action") === "immediate_termination" ||
    field("annual_increase_type") === "compound";
  const rentalRiskNotes = [
    field("late_payment_action") === "immediate_termination" ? "إنهاء العقد عند التأخر يحتاج مراجعة صياغة الشرط." : "",
    field("annual_increase_type") === "compound" ? "الزيادة المركبة يفضل مراجعتها قبل الاعتماد." : "",
  ].filter(Boolean);

  const saleLocationText = [
    field("sale_unit_governorate"),
    field("sale_unit_city"),
    field("sale_unit_district"),
    field("sale_compound_name") ? `كمبوند ${field("sale_compound_name")}` : "",
    field("sale_plot_number") ? `قطعة ${field("sale_plot_number")}` : "",
    field("sale_adjacency_number") ? `مجاورة ${field("sale_adjacency_number")}` : "",
    field("sale_unit_street") ? `شارع ${field("sale_unit_street")}` : "",
    field("sale_building_number") ? `عقار ${field("sale_building_number")}` : "",
    field("sale_building_name"),
    field("sale_floor_number") ? `دور ${field("sale_floor_number")}` : "",
    field("sale_unit_number") ? `وحدة ${field("sale_unit_number")}` : "",
  ].filter(Boolean).join(" - ");

  const saleCompanyRequiredItems = [
    ...companyRequiredItems("seller", "seller_party_type", "البائع"),
    ...companyRequiredItems("buyer", "buyer_party_type", "المشتري"),
  ];

  const saleRequiredReviewItems = [
    { label: "اسم البائع", value: field("seller_party_type") === "company" ? field("seller_company_name") : field("seller_name") },
    { label: "رقم هوية البائع", value: field("seller_national_id") },
    { label: "هاتف البائع", value: field("seller_phone") },
    { label: "اسم المشتري", value: field("buyer_party_type") === "company" ? field("buyer_company_name") : field("buyer_name") },
    { label: "رقم هوية المشتري", value: field("buyer_national_id") },
    { label: "هاتف المشتري", value: field("buyer_phone") },
    { label: "بيانات الوحدة", value: saleLocationText },
    { label: "مساحة الوحدة", value: field("sale_unit_area") },
    { label: "سند الملكية", value: field("ownership_source_type") === "other" ? field("ownership_source_other") : saleLabel(field("ownership_source_type"), saleOwnershipLabels) },
    { label: "ثمن البيع", value: field("sale_total_price") ? `${field("sale_total_price")} ج.م` : "" },
    { label: "طريقة السداد", value: saleLabel(field("sale_payment_method"), salePaymentLabels) },
    { label: "حالة إشغال الوحدة", value: field("sale_occupancy_status") },
    { label: "ضريبة التصرفات العقارية", value: saleLabel(field("real_estate_disposition_tax_payer"), payerLabels) },
    { label: "رسوم التسجيل", value: saleLabel(field("registration_fees_payer"), payerLabels) },
    { label: "إقرار معاينة المشتري", value: formData.sale_inspection_acknowledged === true ? "تم الإقرار" : "" },
    { label: "المحكمة المختصة", value: field("sale_competent_court") },
  ];
  const saleRequiredAttachmentItems = [
    { key: "sale_seller_id_front", label: "وجه بطاقة البائع" },
    { key: "sale_seller_id_back", label: "ظهر بطاقة البائع" },
    { key: "sale_buyer_id_front", label: "وجه بطاقة المشتري" },
    { key: "sale_buyer_id_back", label: "ظهر بطاقة المشتري" },
    { key: "sale_ownership_documents", label: "سند الملكية" },
  ];
  const saleMissingAttachments = saleRequiredAttachmentItems.filter((item) => !uploads[item.key]);
  const saleDynamicIssues = contractSlug === "apartment_sale" ? dynamicValidationIssues : [];
  const saleInstallmentAnnexSelected = draft?.selectedOptionalClauseKeys.includes("sale_installment_schedule") ?? false;
  const saleInstallmentRows = Array.isArray(formData.sale_installment_rows) &&
    formData.sale_installment_rows.every((row) => typeof row === "object" && row !== null)
    ? (formData.sale_installment_rows as RepeaterRowValue[])
    : [];
  const saleInstallmentBusinessIssues: Array<{ label: string; value: string }> = [];

  if (saleInstallmentAnnexSelected) {
    const totalPrice = Number(field("sale_total_price"));
    const downPayment = Number(field("sale_down_payment"));
    const remainingAmount = Number(field("sale_remaining_amount"));
    const installmentsCount = Number(field("sale_installments_count"));
    const rowsTotal = saleInstallmentRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    if ([totalPrice, downPayment, remainingAmount].every(Number.isFinite) && totalPrice > 0 && downPayment + remainingAmount !== totalPrice) {
      saleInstallmentBusinessIssues.push({ label: "إجمالي الثمن يجب أن يساوي المقدم + المبلغ المتبقي", value: "" });
    }
    if (Number.isFinite(installmentsCount) && installmentsCount > 0 && saleInstallmentRows.length !== installmentsCount) {
      saleInstallmentBusinessIssues.push({ label: "عدد صفوف جدول الأقساط يجب أن يطابق عدد الأقساط", value: "" });
    }
    if (remainingAmount > 0 && saleInstallmentRows.length > 0 && rowsTotal !== remainingAmount) {
      saleInstallmentBusinessIssues.push({ label: "مجموع قيم الأقساط يجب أن يساوي المبلغ المتبقي", value: "" });
    }
    const firstDueDate = String(field("sale_first_installment_date") || "");
    const lastDueDate = String(field("sale_installment_final_date") || "");
    if (firstDueDate && lastDueDate && firstDueDate > lastDueDate) {
      saleInstallmentBusinessIssues.push({ label: "آخر موعد استحقاق يجب ألا يسبق أول موعد", value: "" });
    }
  }

  const saleMissingRequiredItems = [
    ...saleRequiredReviewItems.filter((item) => !String(item.value || "").trim()),
    ...saleCompanyRequiredItems.filter((item) => !String(item.value || "").trim()),
    ...saleMissingAttachments.map((item) => ({ ...item, value: "" })),
    ...saleDynamicIssues.map((item) => ({ label: item.labelAr, value: "" })),
    ...saleInstallmentBusinessIssues,
  ];
  const isSaleReadyForPayment = saleMissingRequiredItems.length === 0;
  const saleCompletionTotal = saleRequiredReviewItems.length + saleCompanyRequiredItems.length + saleRequiredAttachmentItems.length + (contractSlug === "apartment_sale" ? dynamicRequiredFieldCount : 0);
  const saleCompletionPercent = Math.max(0, Math.round(((saleCompletionTotal - saleMissingRequiredItems.length) / Math.max(1, saleCompletionTotal)) * 100));
  const saleNeedsLawyerReview =
    field("sale_payment_method") === "down_payment_later" ||
    field("is_unit_registered") === "no" ||
    !!(formData.sale_has_mortgage || formData.sale_has_dispute || formData.sale_has_attachment || formData.sale_has_usufruct);
  const saleRiskNotes = [
    field("sale_payment_method") === "down_payment_later" ? "السداد المؤجل بدون جدول تفصيلي يحتاج مراجعة صياغة." : "",
    field("is_unit_registered") === "no" ? "العقار غير مسجل، وسيتم توضيح ذلك في بنود الملكية." : "",
    formData.sale_has_mortgage || formData.sale_has_dispute || formData.sale_has_attachment || formData.sale_has_usufruct ? "توجد قيود أو ملاحظات يجب كتابتها بدقة في العقد." : "",
  ].filter(Boolean);

  const persistDraft = async () => {
    if (!draft) throw new Error("لا توجد مسودة قابلة للحفظ");
    const saved = await saveDraftSnapshot(draft);
    setBackendDraftReference(contractSlug, saved);
    setCheckoutContract({ id: saved.id, serialNumber: saved.serialNumber });
    return saved;
  };

  const openCheckoutIfReady = async () => {
    if (!isContractReadyForPayment) {
      alert(["يرجى استكمال البيانات المطلوبة قبل الدفع:", ...missingRequiredItems.map((item) => `- ${item.label}`)].join("\n"));
      return;
    }
    if (!declarationAccepted) {
      alert("يرجى الموافقة أولاً على إقرار صحة البيانات والمسؤولية القانونية ثم المتابعة للدفع.");
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
      alert(caught instanceof Error ? caught.message : "تعذر حفظ المسودة قبل الدفع");
    }
  };

  const openSaleCheckoutIfReady = async () => {
    if (!isSaleReadyForPayment) {
      alert(["يرجى استكمال بيانات عقد البيع المطلوبة قبل الدفع:", ...saleMissingRequiredItems.map((item) => `- ${item.label}`)].join("\n"));
      return;
    }
    if (!declarationAccepted) {
      alert("يرجى الموافقة أولاً على إقرار صحة البيانات والمسؤولية القانونية ثم المتابعة للدفع.");
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
      alert(caught instanceof Error ? caught.message : "تعذر حفظ المسودة قبل الدفع");
    }
  };

  const openFreelancerCheckoutIfReady = async () => {
    if (!isFreelancerReadyForPayment) {
      alert(["يرجى استكمال البيانات المطلوبة قبل الدفع:", ...freelancerDynamicIssues.map((item) => `- ${item.labelAr}`)].join("\n"));
      const firstIssue = freelancerDynamicIssues[0];
      if (firstIssue) setStoredStepKey(contractSlug, firstIssue.stepKey);
      return;
    }
    if (!declarationAccepted) {
      alert("يرجى الموافقة على إقرار صحة البيانات قبل المتابعة للدفع.");
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
      alert(caught instanceof Error ? caught.message : "تعذر حفظ المسودة قبل الدفع");
    }
  };

  const uploadFilesForField = async (fieldKey: string, files: File[]) => {
    if (files.length === 0) return;
    setUploadingField(fieldKey);
    setUploadPreviews((prev) => {
      prev[fieldKey]?.forEach((url) => URL.revokeObjectURL(url));
      return {
        ...prev,
        [fieldKey]: files
          .filter((file) => file.type.startsWith("image/"))
          .map((file) => URL.createObjectURL(file)),
      };
    });
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressUploadFile(file);
          const body = new FormData();
          body.append("file", compressed.file, compressed.file.name);
          return apiRequest<{ id: number; fileName: string }>("/api/v1/attachments", { method: "POST", body });
        }),
      );
      const fileNames = uploaded.map((item) => item.fileName);
      setUploads((prev) => ({ ...prev, [fieldKey]: fileNames.join("، ") }));
      setStoredAttachmentRefs(contractSlug, fieldKey, uploaded.map((item) => String(item.id)));
      setStoredFieldValue(contractSlug, fieldKey, fileNames);
    } catch (error) {
      setUploads((prev) => ({ ...prev, [fieldKey]: "" }));
      setStoredAttachmentRefs(contractSlug, fieldKey, []);
      setStoredFieldValue(contractSlug, fieldKey, []);
      alert(error instanceof Error ? error.message : "تعذر رفع الملفات. سجّل الدخول وتأكد من نوع الملف وحجمه ثم حاول مرة أخرى.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleFile = async (fieldKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFilesForField(fieldKey, Array.from(e.target.files || []));
  };

  const renderDigitCounter = (val: string | number | undefined, expected: number) => {
    const len = String(val || "").replace(/\D/g, "").length;
    const isComplete = len === expected;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold mr-2 ${
        isComplete
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : len > 0
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-slate-100 text-slate-500"
      }`}>
        {isComplete ? "✓ " : "⚠ "}
        [{len}/{expected} رقماً]
      </span>
    );
  };

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#00102e] focus:outline-none focus:ring-1 focus:ring-[#986410]/30 transition-all";
  const labelClass = "block text-xs font-bold text-slate-700 mb-1";

  const uploadBox = (fieldKey: string, label: string, icon: React.ReactNode, optional = false, multiple = false) => {
    const previews = uploadPreviews[fieldKey] || [];

    return (
    <label className={`cursor-pointer flex min-h-[118px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
      uploads[fieldKey]
        ? "border-emerald-300 bg-emerald-50"
        : "border-slate-300 bg-slate-50 hover:bg-[#986410]/5 hover:border-[#986410]/40"
    }`}>
      <div className="mb-1">{icon}</div>
      <span className="text-xs font-bold text-slate-800">{label}</span>
      <span className="text-[10px] text-slate-500 mt-0.5">
        {uploadingField === fieldKey ? "جاري الضغط والرفع..."
          : uploads[fieldKey] ? <span className="text-emerald-700 font-bold">تم الرفع بنجاح</span>
          : optional ? "اختياري — صورة أو PDF" : "إلزامي — صورة أو PDF"}
      </span>
      {uploads[fieldKey] && (
        <span className="mt-2 max-w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-800 break-all">
          {uploads[fieldKey]}
        </span>
      )}
      {previews.length > 0 && (
        <div className={`mt-3 grid w-full gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {previews.slice(0, 4).map((src, index) => (
            <div key={src} className="relative overflow-hidden rounded-lg border border-emerald-200 bg-white">
              <img
                src={src}
                alt={`${label} ${index + 1}`}
                className="h-24 w-full object-cover"
              />
            </div>
          ))}
          {previews.length > 4 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-emerald-200 bg-white text-[10px] font-black text-emerald-700">
              +{previews.length - 4} صور أخرى
            </div>
          )}
        </div>
      )}
      <input type="file" accept="image/*,.pdf" multiple={multiple} onChange={(e) => handleFile(fieldKey, e)} className="hidden" />
    </label>
    );
  };

  const selectedAnnexDefinitions = templateDefinition?.optionalClauses.filter(
    (clause) => draft?.selectedOptionalClauseKeys.includes(clause.key) && clause.outputMode === "separate_annex",
  ) ?? [];

  const repeaterCount = (key: string) => Array.isArray(formData[key]) ? formData[key].length : 0;

  const renderSelectedAnnexCards = () => {
    if (selectedAnnexDefinitions.length === 0) return null;
    return (
      <div className="space-y-3 border-t border-dashed border-[#986410]/40 pt-4">
        <div className="text-[10px] font-black text-[#986410]">مستندات ستصدر منفصلة عن العقد الأساسي</div>
        {selectedAnnexDefinitions.map((annex) => (
          <div key={annex.key} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[11px] leading-6 text-emerald-950">
            <div className="flex items-center justify-between gap-3">
              <strong className="font-black">{annex.documentTitleAr ?? annex.nameAr}</strong>
              <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-emerald-800">ملحق مستقل</span>
            </div>
            {annex.key === "sale_installment_schedule" && (
              <div className="mt-2 grid grid-cols-2 gap-x-3">
                <span>المقدم: {field("sale_down_payment") || "—"} ج.م</span>
                <span>المتبقي: {field("sale_remaining_amount") || "—"} ج.م</span>
                <span>عدد الأقساط: {field("sale_installments_count") || "—"}</span>
                <span>صفوف الجدول: {repeaterCount("sale_installment_rows")}</span>
              </div>
            )}
            {annex.key === "rental_handover_inventory_report" && (
              <div className="mt-2 grid grid-cols-2 gap-x-3">
                <span>تاريخ الاستلام: {field("handover_date") || "—"}</span>
                <span>حالة العين: {repeaterCount("handover_condition_items")} بند</span>
                <span>وسائل الدخول: {repeaterCount("handover_access_items")} بند</span>
                <span>المنقولات: {repeaterCount("inventory_items")} بند</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPartyTypeSelector = (fieldKey: string, individualLabel: string, companyLabel: string) => (
    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label className={labelClass}>صفة الطرف في العقد</label>
      <div className="grid grid-cols-2 gap-2">
        {[["individual", individualLabel], ["company", companyLabel]].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => set(fieldKey, value)}
            className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
              field(fieldKey) === value
                ? "border-[#986410] bg-[#986410]/10 text-[#986410]"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCompanyFields = (prefix: string, partyTypeField: string, representativeRole: string) => {
    if (field(partyTypeField) !== "company") return null;
    return (
      <div className="mt-5 rounded-xl border border-[#986410]/20 bg-[#986410]/5 p-4">
        <h4 className="mb-3 text-xs font-black text-[#00102e]">بيانات الشركة/المنشأة</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={inputClass} value={field(`${prefix}_company_name`)} onChange={e => set(`${prefix}_company_name`, e.target.value)} placeholder="اسم الشركة / المنشأة *" />
          <input className={inputClass} value={field(`${prefix}_company_legal_form`)} onChange={e => set(`${prefix}_company_legal_form`, e.target.value)} placeholder="الشكل القانوني *" />
          <input className={`${inputClass} text-left font-mono`} dir="ltr" value={field(`${prefix}_commercial_registry`)} onChange={e => set(`${prefix}_commercial_registry`, e.target.value)} placeholder="رقم السجل التجاري *" />
          <input className={`${inputClass} text-left font-mono`} dir="ltr" value={field(`${prefix}_tax_card_number`)} onChange={e => set(`${prefix}_tax_card_number`, e.target.value)} placeholder="رقم البطاقة الضريبية *" />
          <input className={inputClass} value={field(`${prefix}_legal_representative_name`)} onChange={e => set(`${prefix}_legal_representative_name`, e.target.value)} placeholder={`اسم ${representativeRole} القانوني *`} />
          <input className={inputClass} value={field(`${prefix}_legal_representative_capacity`)} onChange={e => set(`${prefix}_legal_representative_capacity`, e.target.value)} placeholder="الصفة / المسمى *" />
          <input className={inputClass} value={field(`${prefix}_company_headquarters`)} onChange={e => set(`${prefix}_company_headquarters`, e.target.value)} placeholder="مقر الشركة *" />
          <input className={`${inputClass} text-left`} dir="ltr" value={field(`${prefix}_company_email`)} onChange={e => set(`${prefix}_company_email`, e.target.value)} placeholder="البريد الإلكتروني للشركة" />
        </div>
      </div>
    );
  };

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

  const saleAttachmentItems = [
    { key: "sale_seller_id_front", label: "وجه بطاقة البائع" },
    { key: "sale_seller_id_back", label: "ظهر بطاقة البائع" },
    { key: "sale_buyer_id_front", label: "وجه بطاقة المشتري" },
    { key: "sale_buyer_id_back", label: "ظهر بطاقة المشتري" },
    { key: "sale_ownership_documents", label: "سند الملكية" },
    { key: "sale_electricity_receipt", label: "إيصال الكهرباء" },
    { key: "sale_water_receipt", label: "إيصال المياه" },
    { key: "sale_gas_receipt", label: "إيصال الغاز" },
    { key: "sale_extra_docs", label: "مستندات أخرى" },
  ];

  if (!draft.variantKey && templateDefinition.variants.length > 0) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="rounded-full bg-[#986410]/10 px-3 py-1 text-xs font-black text-[#986410]">Parent Template</span>
            <h1 className="mt-3 text-2xl font-black text-[#00102e]">{contractTitle}</h1>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">
              اختر الصيغة القانونية المناسبة قبل بدء المعالج. كل صيغة مرتبطة بالقالب القانوني المرسل وحقولها الخاصة.
            </p>
          </div>
          <VariantSelector
            template={templateDefinition}
            selectedVariantKey={draft.variantKey}
            onSelect={(variantKey) => {
              if (coreIdentityLocked) {
                alert("لا يمكن تغيير نوع العقد بعد اعتماد الدفع.");
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

  if (slug === "freelancer") {
    const isReviewStep = activeStep?.fields.length === 0;
    const allFreelancerFields = resolvedWizard?.steps.flatMap((step) => step.fields) ?? [];
    const filledFreelancerFields = allFreelancerFields.filter((item) => {
      const value = item.type === "attachment"
        ? (draft.attachmentRefs[item.key] ?? draft.fieldValues[item.key])
        : draft.fieldValues[item.key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return value;
      return value !== undefined && value !== null && String(value).trim() !== "";
    }).length;
    const reviewIssuesByStep = new Map<string, typeof freelancerDynamicIssues>();
    freelancerDynamicIssues.forEach((issue) => {
      const current = reviewIssuesByStep.get(issue.stepKey) ?? [];
      current.push(issue);
      reviewIssuesByStep.set(issue.stepKey, current);
    });

    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#986410]/10 px-3 py-1 text-xs font-black text-[#986410]">
                    {selectedVariantDefinition?.nameAr ?? "عقد خدمات"}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{displaySerial}</span>
                </div>
                <h1 className="mt-3 text-2xl font-black text-[#00102e]">{contractTitle}</h1>
                <p className="mt-1 max-w-3xl text-xs font-semibold leading-6 text-slate-500">
                  أدخل بيانات الطرفين والمشروع، واختر الملاحق التي تحتاجها. يصدر العقد الأساسي والملاحق المختارة كمستندات قانونية منفصلة ومترابطة.
                </p>
                <button
                  type="button"
                  onClick={handleChangeVariant}
                  className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-600 hover:border-[#986410]/40 hover:text-[#986410]"
                >
                  تغيير نوع عقد الخدمات
                </button>
              </div>
              <div className="w-full space-y-2 lg:w-72">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {autoSaveStatus}
                  </span>
                  <span className="rounded-xl bg-[#00102e] px-3.5 py-2 text-xs font-black text-[#986410]">{priceEgp} ج.م</span>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-black text-slate-500">
                    <span>اكتمال البيانات المطلوبة</span>
                    <span>{freelancerCompletionPercent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${freelancerCompletionPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-[#986410]/30 bg-[#986410]/5 p-3.5 text-xs font-semibold leading-6 text-[#00102e]">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#986410]" />
              <div>
                <strong className="block font-black">حماية بيانات الأطراف</strong>
                بعد اعتماد الدفع تُثبت البيانات الأساسية للطرفين. أي تصحيح جوهري بعد ذلك يتم بطلب مراجعة وإصدار نسخة جديدة، وليس بتغيير النسخة الصادرة.
              </div>
            </div>
          </div>

          <div className="mb-6">
            <OptionalClauseSelector
              template={templateDefinition}
              variantKey={draft.variantKey ?? ""}
              selectedClauseKeys={draft.selectedOptionalClauseKeys}
              onToggle={toggleOptionalClause}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
              <div className="mb-3 text-[11px] font-black text-[#00102e]">خطوات إعداد العقد</div>
              <div className="space-y-2">
                {progressSteps.map((item, index) => {
                  const selected = item.key === currentStepKey;
                  const complete = index < currentStepIndex;
                  const issueCount = reviewIssuesByStep.get(item.key)?.length ?? 0;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStoredStepKey(contractSlug, item.key)}
                      className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-right transition ${
                        selected
                          ? "border-[#986410] bg-[#986410]/10 text-[#00102e]"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[#986410]/40"
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${complete ? "bg-emerald-500 text-white" : selected ? "bg-[#986410] text-white" : "bg-white text-slate-500"}`}>
                        {complete ? "✓" : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-black leading-5">{item.label}</span>
                        {issueCount > 0 && <span className="block text-[9px] font-bold text-rose-600">{issueCount} حقل مطلوب</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="min-w-0 space-y-4">
              {!isReviewStep && activeStep && (
                <DynamicOptionalStep
                  step={activeStep}
                  fieldValues={formData}
                  onFieldChange={(key, value) => set(key, value)}
                  onFilesSelected={uploadFilesForField}
                  uploadingField={uploadingField}
                />
              )}

              {isReviewStep && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="rounded-full bg-[#986410]/10 px-3 py-1 text-[10px] font-black text-[#986410]">المراجعة النهائية</span>
                    <h2 className="mt-3 text-xl font-black text-[#00102e]">راجع المستندات قبل الدفع والإصدار</h2>
                    <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
                      سيستخدم النظام البيانات التي أدخلتها والنصوص القانونية المعتمدة لتكوين العقد والملاحق المختارة.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <span className="text-[10px] font-black text-slate-500">نوع العقد</span>
                      <strong className="mt-1 block text-xs leading-6 text-[#00102e]">{selectedVariantDefinition?.nameAr}</strong>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <span className="text-[10px] font-black text-slate-500">البيانات المكتملة</span>
                      <strong className="mt-1 block text-xl text-[#00102e]">{filledFreelancerFields} / {allFreelancerFields.length}</strong>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <span className="text-[10px] font-black text-slate-500">الملاحق المختارة</span>
                      <strong className="mt-1 block text-xl text-[#00102e]">{selectedAnnexDefinitions.length}</strong>
                    </div>
                  </div>

                  {freelancerDynamicIssues.length > 0 ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-6 text-rose-900">
                      <strong className="block font-black">البيانات التالية ما زالت مطلوبة:</strong>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {freelancerDynamicIssues.map((issue) => (
                          <button
                            key={`${issue.stepKey}-${issue.fieldKey}`}
                            type="button"
                            onClick={() => setStoredStepKey(contractSlug, issue.stepKey)}
                            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-right text-[10px] font-bold hover:border-rose-400"
                          >
                            {issue.labelAr}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold leading-6 text-emerald-900">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                      البيانات الإلزامية مكتملة، ويمكن حفظ المسودة والانتقال إلى الدفع.
                    </div>
                  )}

                  {renderSelectedAnnexCards()}

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={declarationAccepted}
                      onChange={(event) => setDeclarationAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#986410]"
                    />
                    <span className="text-xs font-semibold leading-6 text-slate-700">
                      أقر بصحة البيانات والمستندات التي أدخلتها، وأفهم أن النص النهائي سيُنشأ وفق نوع العقد والملاحق المحددة.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={openFreelancerCheckoutIfReady}
                    disabled={!isFreelancerReadyForPayment}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-sm font-black text-[#986410] transition hover:bg-[#001b4d] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Receipt className="h-4 w-4" /> حفظ المسودة والمتابعة للدفع — {priceEgp} ج.م
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep((previous) => previous - 1)}
                  disabled={currentStep <= 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRight className="h-4 w-4" /> السابق
                </button>
                {!isReviewStep && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((previous) => previous + 1)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#986410]"
                  >
                    التالي <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
              </div>
            </section>

            <aside className="h-fit space-y-4 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="h-4 w-4 text-[#986410]" />
                  <h3 className="text-xs font-black text-[#00102e]">ملخص المسودة</h3>
                </div>
                <div className="mt-4 space-y-3 text-[11px] leading-6 text-slate-600">
                  <div><span className="block text-[9px] font-black text-slate-400">المستند</span><strong className="text-[#00102e]">{contractTitle}</strong></div>
                  <div><span className="block text-[9px] font-black text-slate-400">المرحلة الحالية</span><strong className="text-[#00102e]">{activeStep?.titleAr}</strong></div>
                  <div><span className="block text-[9px] font-black text-slate-400">رقم المسودة</span><span className="font-mono">{displaySerial}</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-black text-[#00102e]">الملاحق</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">{selectedAnnexDefinitions.length}</span>
                </div>
                {selectedAnnexDefinitions.length === 0 ? (
                  <p className="text-[10px] font-semibold leading-5 text-slate-500">لم يتم اختيار ملاحق. يمكنك إضافتها من أعلى الصفحة.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAnnexDefinitions.map((annex) => (
                      <div key={annex.key} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold leading-5 text-emerald-900">
                        {annex.documentTitleAr ?? annex.nameAr}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#986410]/30 bg-[#986410]/5 p-4 text-[10px] font-semibold leading-5 text-[#00102e]">
                <div className="mb-1 flex items-center gap-2 font-black"><Sparkles className="h-3.5 w-3.5 text-[#986410]" /> كيف يعمل؟</div>
                أنت تدخل الوقائع والاختيارات فقط، والنظام يركب النص القانوني والملاحق المعتمدة دون أن يطلب منك كتابة البنود القانونية.
              </div>
            </aside>
          </div>
        </main>
        <Footer />
        <VodafoneCashModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          orderTitle={contractTitle}
          amountEgp={priceEgp}
          contractId={checkoutContract?.id ?? draft.backendContractId}
          serialNumber={checkoutContract?.serialNumber ?? draft.serialNumber}
        />
      </div>
    );
  }

  if (slug === "apartment_sale") {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-full bg-[#986410]/10 px-3 py-1 text-xs font-black text-[#986410]">{selectedVariantDefinition?.nameAr ?? "صياغة عقد بيع"}</span>
                <h1 className="mt-3 text-2xl font-black text-[#00102e]">{contractTitle}</h1>
                <p className="mt-1 text-xs font-semibold text-slate-500">املأ بيانات الأطراف والوحدة والسداد، ثم راجع المسودة قبل الاعتماد.</p>
                <button type="button" onClick={handleChangeVariant} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-600 hover:border-[#986410]/40 hover:text-[#986410]">
                  تغيير نوع عقد البيع
                </button>
              </div>
              <div className="w-full space-y-2 sm:w-64">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-xl bg-[#00102e] px-4 py-2 text-xs font-black text-[#986410]">{priceEgp} ج.م — فودافون كاش</span>
                  {saleNeedsLawyerReview && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-800">تحتاج مراجعة إضافية</span>
                  )}
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-black text-slate-500">
                    <span>اكتمال البيانات</span>
                    <span>{saleCompletionPercent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${saleCompletionPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
            {saleRiskNotes.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-900">
                {saleRiskNotes.map((note) => <div key={note}>{note}</div>)}
              </div>
            )}
          </div>

          <div className="mb-6">
            <OptionalClauseSelector
              template={templateDefinition}
              variantKey={draft.variantKey!}
              selectedClauseKeys={draft.selectedOptionalClauseKeys}
              onToggle={toggleOptionalClause}
            />
          </div>

          <div className="mb-8 flex items-center gap-1 overflow-x-auto pb-2">
            {progressSteps.map((s, i) => (
              <React.Fragment key={s.step}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(s.step)}
                  className={`flex min-w-[98px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-center transition-all ${
                    currentStep === s.step
                      ? "bg-[#00102e] text-white shadow-md"
                      : currentStep > s.step
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${currentStep === s.step ? "bg-[#986410] text-white" : "bg-slate-200 text-slate-500"}`}>{s.step}</span>
                  <span className="text-[10px] font-bold leading-tight">{s.label}</span>
                  <span className="text-[9px] opacity-70">{s.articleRange}</span>
                </button>
                {i < progressSteps.length - 1 && <div className={`h-0.5 min-w-4 flex-1 rounded-full ${currentStep > s.step ? "bg-emerald-400" : "bg-slate-200"}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-11">
            <div className="space-y-5 xl:col-span-5">
              {activeStep?.sourceClauseKey && (
                <DynamicOptionalStep
                  step={activeStep}
                  fieldValues={formData}
                  onFieldChange={(fieldKey, value) => setStoredFieldValue(contractSlug, fieldKey, value)}
                />
              )}
              {currentStepKey === "sale_seller" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">بيانات البائع</h3>
                  {renderPartyTypeSelector("seller_party_type", "فرد", "شركة / منشأة")}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input className={inputClass} value={field("seller_name")} onChange={e => set("seller_name", e.target.value)} placeholder="الاسم الرباعي *" />
                    <input className={inputClass} value={field("seller_nationality")} onChange={e => set("seller_nationality", e.target.value)} placeholder="الجنسية *" />
                    <input className={`${inputClass} font-mono`} dir="ltr" value={field("seller_national_id")} onChange={e => set("seller_national_id", e.target.value)} placeholder="الرقم القومي / جواز السفر *" />
                    <input className={inputClass} value={field("seller_id_issuer")} onChange={e => set("seller_id_issuer", e.target.value)} placeholder="جهة الإصدار" />
                    <input className={`${inputClass} text-left font-mono`} dir="ltr" type="date" value={field("seller_id_issue_date")} onChange={e => set("seller_id_issue_date", e.target.value)} />
                    <input className={`${inputClass} font-mono`} dir="ltr" value={field("seller_phone")} onChange={e => set("seller_phone", e.target.value)} placeholder="الهاتف *" />
                    <input className={`${inputClass} text-left`} dir="ltr" value={field("seller_email")} onChange={e => set("seller_email", e.target.value)} placeholder="البريد الإلكتروني" />
                    <input className={inputClass} value={field("seller_address")} onChange={e => set("seller_address", e.target.value)} placeholder="محل الإقامة *" />
                  </div>
                  {renderCompanyFields("seller", "seller_party_type", "ممثل البائع")}
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {uploadBox("sale_seller_id_front", "وجه بطاقة البائع", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("sale_seller_id_back", "ظهر بطاقة البائع", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("seller_personal_photo", "صورة شخصية للبائع", <Camera className="h-5 w-5 text-[#986410]" />, true)}
                  </div>
                </div>
              )}

              {currentStepKey === "sale_buyer" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">بيانات المشتري</h3>
                  {renderPartyTypeSelector("buyer_party_type", "فرد", "شركة / منشأة")}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input className={inputClass} value={field("buyer_name")} onChange={e => set("buyer_name", e.target.value)} placeholder="الاسم الرباعي *" />
                    <input className={inputClass} value={field("buyer_nationality")} onChange={e => set("buyer_nationality", e.target.value)} placeholder="الجنسية *" />
                    <input className={`${inputClass} font-mono`} dir="ltr" value={field("buyer_national_id")} onChange={e => set("buyer_national_id", e.target.value)} placeholder="الرقم القومي / جواز السفر *" />
                    <input className={inputClass} value={field("buyer_id_issuer")} onChange={e => set("buyer_id_issuer", e.target.value)} placeholder="جهة الإصدار" />
                    <input className={`${inputClass} text-left font-mono`} dir="ltr" type="date" value={field("buyer_id_issue_date")} onChange={e => set("buyer_id_issue_date", e.target.value)} />
                    <input className={`${inputClass} font-mono`} dir="ltr" value={field("buyer_phone")} onChange={e => set("buyer_phone", e.target.value)} placeholder="الهاتف *" />
                    <input className={`${inputClass} text-left`} dir="ltr" value={field("buyer_email")} onChange={e => set("buyer_email", e.target.value)} placeholder="البريد الإلكتروني" />
                    <input className={inputClass} value={field("buyer_address")} onChange={e => set("buyer_address", e.target.value)} placeholder="محل الإقامة *" />
                  </div>
                  {renderCompanyFields("buyer", "buyer_party_type", "ممثل المشتري")}
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {uploadBox("sale_buyer_id_front", "وجه بطاقة المشتري", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("sale_buyer_id_back", "ظهر بطاقة المشتري", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("buyer_personal_photo", "صورة شخصية للمشتري", <Camera className="h-5 w-5 text-[#986410]" />, true)}
                  </div>
                </div>
              )}

              {currentStepKey === "sale_unit" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">بيانات الوحدة السكنية</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input className={inputClass} value={field("sale_unit_governorate")} onChange={e => set("sale_unit_governorate", e.target.value)} placeholder="المحافظة *" />
                    <input className={inputClass} value={field("sale_unit_city")} onChange={e => set("sale_unit_city", e.target.value)} placeholder="المدينة / المركز *" />
                    <input className={inputClass} value={field("sale_unit_district")} onChange={e => set("sale_unit_district", e.target.value)} placeholder="الحي / المنطقة" />
                    <input className={inputClass} value={field("sale_compound_name")} onChange={e => set("sale_compound_name", e.target.value)} placeholder="اسم الكمبوند (إن وجد)" />
                    <input className={inputClass} value={field("sale_plot_number")} onChange={e => set("sale_plot_number", e.target.value)} placeholder="رقم القطعة" />
                    <input className={inputClass} value={field("sale_adjacency_number")} onChange={e => set("sale_adjacency_number", e.target.value)} placeholder="رقم المجاورة" />
                    <input className={inputClass} value={field("sale_unit_street")} onChange={e => set("sale_unit_street", e.target.value)} placeholder="الشارع *" />
                    <input className={inputClass} value={field("sale_building_number")} onChange={e => set("sale_building_number", e.target.value)} placeholder="رقم العقار *" />
                    <input className={inputClass} value={field("sale_building_name")} onChange={e => set("sale_building_name", e.target.value)} placeholder="اسم البرج / العمارة" />
                    <input className={inputClass} value={field("sale_floor_number")} onChange={e => set("sale_floor_number", e.target.value)} placeholder="الدور" />
                    <input className={inputClass} value={field("sale_unit_number")} onChange={e => set("sale_unit_number", e.target.value)} placeholder="رقم الوحدة *" />
                    <input className={`${inputClass} text-left font-mono`} dir="ltr" type="number" value={field("sale_unit_area")} onChange={e => set("sale_unit_area", e.target.value)} placeholder="المساحة م2 *" />
                    <select className={inputClass} value={field("sale_finishing_level")} onChange={e => set("sale_finishing_level", e.target.value)}>
                      <option value="brick">بدون تشطيب / طوب</option><option value="plaster">نصف تشطيب / محارة</option><option value="fully_finished">تشطيب كامل</option><option value="lux">لوكس</option><option value="super_lux">سوبر لوكس</option><option value="super_high_lux">سوبر هاي لوكس</option>
                    </select>
                    <input className={inputClass} value={field("sale_bedrooms_count")} onChange={e => set("sale_bedrooms_count", e.target.value)} placeholder="عدد غرف النوم" />
                    <input className={inputClass} value={field("sale_reception_count")} onChange={e => set("sale_reception_count", e.target.value)} placeholder="عدد الريسبشن" />
                    <input className={inputClass} value={field("sale_bathrooms_count")} onChange={e => set("sale_bathrooms_count", e.target.value)} placeholder="عدد الحمامات" />
                    <input className={inputClass} value={field("sale_balconies_count")} onChange={e => set("sale_balconies_count", e.target.value)} placeholder="عدد البلكونات" />
                    <select className={inputClass} value={field("sale_has_kitchen")} onChange={e => set("sale_has_kitchen", e.target.value)}>
                      <option value="yes">يوجد مطبخ</option><option value="no">لا يوجد مطبخ مستقل</option>
                    </select>
                    <input className={inputClass} value={field("sale_kitchen_description")} onChange={e => set("sale_kitchen_description", e.target.value)} placeholder="وصف المطبخ أو التجهيزات (اختياري)" />
                  </div>
                </div>
              )}

              {currentStepKey === "sale_meters_boundaries" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">العدادات وحدود العقار</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      ["electricity", "الكهرباء"],
                      ["water", "المياه"],
                      ["gas", "الغاز الطبيعي"],
                    ].map(([meterKey, meterLabel]) => (
                      <div key={meterKey} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <div className="text-[11px] font-black text-[#00102e]">عداد {meterLabel}</div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <input className={`${inputClass} text-left font-mono`} dir="ltr" value={field(`sale_${meterKey}_meter`)} onChange={e => set(`sale_${meterKey}_meter`, e.target.value)} placeholder="رقم العداد" />
                          <select className={inputClass} value={field(`sale_${meterKey}_meter_type`)} onChange={e => set(`sale_${meterKey}_meter_type`, e.target.value)}>
                            <option value="independent">مستقل</option><option value="shared">مشترك</option><option value="not_present">غير موجود</option>
                          </select>
                          <input className={`${inputClass} text-left font-mono`} dir="ltr" value={field(`sale_${meterKey}_meter_reading`)} onChange={e => set(`sale_${meterKey}_meter_reading`, e.target.value)} placeholder="القراءة عند التسليم" />
                        </div>
                      </div>
                    ))}
                    <input className={inputClass} value={field("sale_north_boundary")} onChange={e => set("sale_north_boundary", e.target.value)} placeholder="الحد البحري" />
                    <input className={inputClass} value={field("sale_south_boundary")} onChange={e => set("sale_south_boundary", e.target.value)} placeholder="الحد القبلي" />
                    <input className={inputClass} value={field("sale_east_boundary")} onChange={e => set("sale_east_boundary", e.target.value)} placeholder="الحد الشرقي" />
                    <input className={inputClass} value={field("sale_west_boundary")} onChange={e => set("sale_west_boundary", e.target.value)} placeholder="الحد الغربي" />
                  </div>
                </div>
              )}

              {currentStepKey === "sale_ownership" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">ما هو سند ملكية البائع؟</h3>
                  {draft.variantKey === "preliminary_sale" ? (
                    <>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {[
                          ["initial_sale_contract", "عقد بيع ابتدائي"],
                          ["customary_sale_contract", "عقد بيع عرفي"],
                          ["court_judgment", "حكم قضائي"],
                          ["allocation", "تخصيص من جهة"],
                          ["other", "أخرى"],
                        ].map(([value, label]) => (
                          <button key={value} type="button" onClick={() => set("ownership_source_type", value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${field("ownership_source_type") === value ? "border-[#986410] bg-[#986410]/10 text-[#986410]" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{label}</button>
                        ))}
                      </div>
                      {field("ownership_source_type") === "other" && <input className={`${inputClass} mt-4`} value={field("ownership_source_other")} onChange={e => set("ownership_source_other", e.target.value)} placeholder="اكتب نوع السند" />}
                    </>
                  ) : (
                    <div className="rounded-xl border border-[#986410]/20 bg-[#986410]/5 px-4 py-3 text-xs font-bold leading-6 text-[#00102e]">
                      مصدر الملكية مرتبط بنوع العقد المختار: {draft.variantKey === "inherited_sale" ? "إعلام وراثة وسند ملكية المورث" : "سند ملكية صالح للشهر والتسجيل"}. ستدخل بياناته التفصيلية في الخطوة المخصصة.
                    </div>
                  )}
                  <div className="mt-5">{uploadBox("sale_ownership_documents", "رفع سند الملكية PDF أو صورة - يمكن رفع أكثر من ملف", <FileCheck className="h-5 w-5 text-[#986410]" />, false, true)}</div>
                </div>
              )}

              {currentStepKey === "sale_price" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">ثمن البيع</h3>
                  <ArabicCurrencyInput label="سعر البيع" value={String(field("sale_total_price"))} onChange={v => set("sale_total_price", v)} required min={1} />
                  <p className="mt-3 rounded-xl border border-[#986410]/20 bg-[#986410]/5 px-4 py-3 text-xs font-bold text-[#986410]">سيتم تحويل الرقم إلى كتابة داخل العقد تلقائياً.</p>
                </div>
              )}

              {currentStepKey === "sale_payment" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">كيف سيتم السداد؟</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      ["cash_full", "نقداً بالكامل"], ["bank_transfer", "تحويل بنكي"], ["down_payment_later", "دفعة مقدمة والباقي لاحقاً"], ["installments", "أقساط"],
                    ].map(([value, label]) => (
                      <button key={value} type="button" onClick={() => selectSalePaymentMethod(value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${field("sale_payment_method") === value ? "border-[#986410] bg-[#986410]/10 text-[#986410]" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{label}</button>
                    ))}
                  </div>
                  {field("sale_payment_method") === "down_payment_later" && (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input className={`${inputClass} text-left font-mono`} dir="ltr" value={field("sale_down_payment")} onChange={e => set("sale_down_payment", e.target.value)} placeholder="المقدم" />
                    </div>
                  )}
                  {field("sale_payment_method") === "installments" && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold leading-6 text-emerald-900">
                      تم تفعيل إضافة «جدول الأقساط». ستظهر خطوة مستقلة قبل المراجعة لتسجيل المقدم والاستحقاقات وشرط التأخير.
                    </div>
                  )}
                </div>
              )}

              {currentStepKey === "sale_handover" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">هل سيتم التسليم فور توقيع العقد؟</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["yes", "no"].map(value => <button key={value} type="button" onClick={() => set("sale_handover_immediate", value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${field("sale_handover_immediate") === value ? "border-[#986410] bg-[#986410]/10 text-[#986410]" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{value === "yes" ? "نعم" : "لا"}</button>)}
                  </div>
                  {field("sale_handover_immediate") === "no" && <input className={`${inputClass} mt-4 text-left font-mono`} dir="ltr" type="date" value={field("sale_handover_date")} onChange={e => set("sale_handover_date", e.target.value)} />}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select className={inputClass} value={field("sale_occupancy_status")} onChange={e => set("sale_occupancy_status", e.target.value)}>
                      <option value="vacant">خالية من الشاغلين وواضعي اليد</option>
                      <option value="seller_occupied">مشغولة بواسطة البائع حتى التسليم</option>
                      <option value="rented">مؤجرة للغير</option>
                      <option value="other_occupant">يشغلها شخص/واضع يد آخر</option>
                    </select>
                    <input className={`${inputClass} text-left font-mono`} dir="ltr" type="number" min="0" value={field("sale_handover_keys_count")} onChange={e => set("sale_handover_keys_count", e.target.value)} placeholder="عدد المفاتيح/وسائل الدخول" />
                  </div>
                  {field("sale_occupancy_status") !== "vacant" && (
                    <textarea className={`${inputClass} mt-3 min-h-20`} value={field("sale_occupancy_details")} onChange={e => set("sale_occupancy_details", e.target.value)} placeholder="بيانات الشاغل أو عقد الإيجار وموعد الإخلاء/التسليم" />
                  )}
                </div>
              )}

              {currentStepKey === "sale_utilities" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">المرافق ونقل العدادات</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[["seller_paid_electricity", "الكهرباء مسددة"], ["seller_paid_water", "المياه مسددة"], ["seller_paid_gas", "الغاز مسدد"], ["seller_paid_maintenance", "الصيانة مسددة"]].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={formData[key] === true} onChange={e => set(key, e.target.checked)} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <label className={`${labelClass} mt-5`}>من يتحمل رسوم نقل العدادات؟</label>
                  <select className={inputClass} value={field("meter_transfer_fees_payer")} onChange={e => set("meter_transfer_fees_payer", e.target.value)}>
                    <option value="seller">البائع</option><option value="buyer">المشتري</option><option value="split">مناصفة</option>
                  </select>
                </div>
              )}

              {currentStepKey === "sale_guarantees" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">هل العقار عليه أي قيود؟</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[["sale_has_mortgage", "رهن"], ["sale_has_dispute", "نزاع"], ["sale_has_attachment", "حجز"], ["sale_has_usufruct", "حق انتفاع"]].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={formData[key] === true} onChange={e => set(key, e.target.checked)} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {(formData.sale_has_mortgage || formData.sale_has_dispute || formData.sale_has_attachment || formData.sale_has_usufruct) && (
                    <textarea className={`${inputClass} mt-4 min-h-24`} value={field("sale_encumbrance_notes")} onChange={e => set("sale_encumbrance_notes", e.target.value)} placeholder="اشرح القيد أو النزاع باختصار" />
                  )}
                  <label className="mt-4 flex items-start gap-2 rounded-xl border border-[#986410]/20 bg-[#986410]/5 p-3 text-xs font-bold leading-6 text-slate-700">
                    <input type="checkbox" className="mt-1" checked={formData.sale_inspection_acknowledged === true} onChange={e => set("sale_inspection_acknowledged", e.target.checked)} />
                    <span>يقر المشتري بأنه عاين الوحدة ومستنداتها المعاينة المناسبة وقبل حالتها الظاهرة، مع عدم الإخلال بالضمانات القانونية.</span>
                  </label>
                </div>
              )}

              {currentStepKey === "sale_broker_registration" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                  <div>
                    <h3 className="mb-3 text-sm font-black text-[#00102e]">هل العقار مسجل بالشهر العقاري؟</h3>
                    <select className={inputClass} value={field("is_unit_registered")} onChange={e => set("is_unit_registered", e.target.value)}>
                      <option value="yes">نعم، مسجل</option><option value="no">لا، غير مسجل</option><option value="unknown">لم يتم التحديد بعد</option>
                    </select>
                    {field("is_unit_registered") === "yes" && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><input className={inputClass} value={field("registration_number")} onChange={e => set("registration_number", e.target.value)} placeholder="رقم التسجيل" /><input className={`${inputClass} text-left font-mono`} dir="ltr" type="date" value={field("registration_date")} onChange={e => set("registration_date", e.target.value)} /></div>}
                  </div>
                  <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>من يتحمل ضريبة التصرفات العقارية؟</label>
                      <select className={inputClass} value={field("real_estate_disposition_tax_payer")} onChange={e => set("real_estate_disposition_tax_payer", e.target.value)}>
                        <option value="seller">البائع</option><option value="buyer">المشتري</option><option value="shared">مناصفة</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>من يتحمل رسوم الشهر والتسجيل؟</label>
                      <select className={inputClass} value={field("registration_fees_payer")} onChange={e => set("registration_fees_payer", e.target.value)}>
                        <option value="buyer">المشتري</option><option value="seller">البائع</option><option value="shared">مناصفة</option>
                      </select>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="mb-3 text-sm font-black text-[#00102e]">هل يوجد وسيط عقاري؟</h3>
                    <select className={inputClass} value={field("has_broker")} onChange={e => set("has_broker", e.target.value)}><option value="no">لا</option><option value="yes">نعم</option></select>
                    {field("has_broker") === "yes" && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><input className={inputClass} value={field("broker_name")} onChange={e => set("broker_name", e.target.value)} placeholder="اسم الوسيط" /><input className={`${inputClass} text-left font-mono`} dir="ltr" value={field("broker_phone")} onChange={e => set("broker_phone", e.target.value)} placeholder="هاتف الوسيط" /><input className={`${inputClass} text-left font-mono`} dir="ltr" value={field("broker_commission")} onChange={e => set("broker_commission", e.target.value)} placeholder="العمولة" /><select className={inputClass} value={field("broker_commission_payer")} onChange={e => set("broker_commission_payer", e.target.value)}><option value="buyer">المشتري</option><option value="seller">البائع</option><option value="split">مناصفة</option></select></div>}
                  </div>
                </div>
              )}

              {currentStepKey === "sale_attachments_court" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-slate-100 pb-3 text-sm font-black text-[#00102e]">المرفقات والمحكمة المختصة</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {uploadBox("sale_seller_id_front", "وجه بطاقة البائع", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("sale_seller_id_back", "ظهر بطاقة البائع", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("sale_buyer_id_front", "وجه بطاقة المشتري", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("sale_buyer_id_back", "ظهر بطاقة المشتري", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("sale_electricity_receipt", "آخر إيصال كهرباء", <Receipt className="h-5 w-5 text-emerald-700" />, true)}
                    {uploadBox("sale_water_receipt", "آخر إيصال مياه", <Receipt className="h-5 w-5 text-emerald-700" />, true)}
                    {uploadBox("sale_gas_receipt", "آخر إيصال غاز", <Receipt className="h-5 w-5 text-emerald-700" />, true)}
                    {uploadBox("sale_extra_docs", "مستندات أخرى", <FileCheck className="h-5 w-5 text-[#986410]" />, true, true)}
                  </div>
                  <label className={`${labelClass} mt-5`}>المحكمة المختصة</label>
                  <select className={inputClass} value={field("sale_competent_court")} onChange={e => set("sale_competent_court", e.target.value)}>
                    <option value="القاهرة">القاهرة</option><option value="الجيزة">الجيزة</option><option value="الإسكندرية">الإسكندرية</option><option value="المنصورة">المنصورة</option><option value="أخرى">أخرى</option>
                  </select>
                </div>
              )}

              {currentStepKey === "sale_review" && (
                <div className="rounded-2xl border border-[#986410]/30 bg-[#986410]/5 p-6 shadow-xs">
                  <h3 className="mb-5 border-b border-[#986410]/20 pb-3 text-sm font-black text-[#00102e]">مراجعة عقد البيع قبل الاعتماد</h3>
                  {draft.selectedOptionalClauseKeys.length > 0 && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-[10px] font-black text-emerald-800">المستندات الملحقة التي ستصدر منفصلة</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {draft.selectedOptionalClauseKeys.map((key) => {
                          const clause = templateDefinition.optionalClauses.find((item) => item.key === key);
                          return clause ? <span key={key} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-emerald-800">{clause.nameAr}</span> : null;
                        })}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {[...saleRequiredReviewItems, ...saleCompanyRequiredItems].map(({ label, value }) => {
                      const ok = !!String(value || "").trim();
                      return <div key={label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${ok ? "border border-emerald-200 bg-emerald-50" : "border border-red-200 bg-red-50"}`}><span className="text-slate-700">{label}</span><span className={`font-bold ${ok ? "text-emerald-800" : "text-red-600"}`}>{ok ? value : "مطلوب"}</span></div>;
                    })}
                  </div>
                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white bg-white p-4">
                    <input type="checkbox" checked={declarationAccepted} onChange={e => setDeclarationAccepted(e.target.checked)} className="mt-1" />
                    <span className="text-xs font-bold leading-6 text-slate-700">أقر بصحة البيانات وأنني أراجع المسودة قبل الدفع والاعتماد.</span>
                  </label>
                  <button type="button" onClick={() => void openSaleCheckoutIfReady()} disabled={!declarationAccepted || !isSaleReadyForPayment} className={`mt-5 w-full rounded-xl px-5 py-3 text-xs font-black ${declarationAccepted && isSaleReadyForPayment ? "bg-[#00102e] text-[#986410]" : "bg-slate-200 text-slate-400"}`}>{isSaleReadyForPayment ? `اعتماد ودفع ${priceEgp} ج.م` : "استكمل بيانات البيع المطلوبة"}</button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button disabled={currentStep === 1} onClick={() => setCurrentStep(p => Math.max(1, p - 1))} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-40"><ArrowRight className="mr-1 inline h-4 w-4" />خطوة سابقة</button>
                {currentStep < progressSteps.length && <button onClick={() => setCurrentStep(p => Math.min(progressSteps.length, p + 1))} className="rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-bold text-white">خطوة تالية<ArrowLeft className="ml-1 inline h-4 w-4 text-[#986410]" /></button>}
              </div>
            </div>

            <aside className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-md xl:col-span-6">
              <div className="border-b border-slate-200 bg-[#00102e] px-5 py-3 text-xs font-bold text-white">معاينة حية لعقد البيع</div>
              <div className="space-y-4 p-6 text-xs leading-7 text-[#00102e]" dir="rtl">
                <div className="border-b-2 border-[#00102e] pb-4 text-center">
                  <div className="mb-1 text-[10px] font-black text-[#986410]">Z draft — معاينة قانونية حية</div>
                  <h2 className="text-lg font-black">{contractTitle}</h2>
                  <p className="text-[10px] text-slate-400">{displaySerial} — مسودة قيد الإعداد</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className={currentStepKey === "sale_seller" ? highlightClass + " p-4" : normalClass + " p-4"}>
                    <div className="mb-1 font-black text-[#986410]">البائع</div>
                    <p>الاسم: <LiveField value={field("seller_name")} placeholder="اسم البائع" /></p>
                    <p>الهوية: <LiveField value={field("seller_national_id")} placeholder="رقم الهوية" /></p>
                    <p>الهاتف: <LiveField value={field("seller_phone")} placeholder="الهاتف" /></p>
                  </div>
                  <div className={currentStepKey === "sale_buyer" ? highlightClass + " p-4" : normalClass + " p-4"}>
                    <div className="mb-1 font-black text-[#986410]">المشتري</div>
                    <p>الاسم: <LiveField value={field("buyer_name")} placeholder="اسم المشتري" /></p>
                    <p>الهوية: <LiveField value={field("buyer_national_id")} placeholder="رقم الهوية" /></p>
                    <p>الهاتف: <LiveField value={field("buyer_phone")} placeholder="الهاتف" /></p>
                  </div>
                </div>

                <div className={["sale_unit", "sale_meters_boundaries"].includes(currentStepKey) ? highlightClass + " p-4" : normalClass + " p-4"}>
                  <div className="mb-1 font-black text-[#00102e]">وصف الوحدة</div>
                  <p><LiveField value={saleLocationText} placeholder="بيانات الموقع والوحدة" /></p>
                  <p>المساحة: <LiveField value={field("sale_unit_area")} placeholder="____" /> م2، التشطيب: <LiveField value={saleLabel(field("sale_finishing_level"), saleFinishingLabels)} />.</p>
                  <p className="text-[11px] text-slate-500">الكهرباء: {field("sale_electricity_meter") || "غير مدخل"}، المياه: {field("sale_water_meter") || "غير مدخل"}، الغاز: {field("sale_gas_meter") || "غير مدخل"}.</p>
                </div>

                <div className={["sale_ownership", "sale_preliminary_details", "sale_registration_details", "sale_inheritance_details", "sale_broker_registration"].includes(currentStepKey) ? highlightClass + " p-4" : normalClass + " p-4"}>
                  <div className="mb-1 font-black text-[#00102e]">الملكية والتسجيل</div>
                  <p>سند الملكية: <LiveField value={field("ownership_source_type") === "other" ? field("ownership_source_other") : saleLabel(field("ownership_source_type"), saleOwnershipLabels)} placeholder="نوع سند الملكية" />.</p>
                  <p>حالة التسجيل: <LiveField value={saleLabel(field("is_unit_registered"), registrationLabels)} />.</p>
                  {field("is_unit_registered") === "yes" && <p>رقم التسجيل: <LiveField value={field("registration_number")} placeholder="رقم التسجيل" />.</p>}
                </div>

                <div className={["sale_price", "sale_payment", "sale_installment_schedule"].includes(currentStepKey) ? highlightClass + " p-4" : normalClass + " p-4"}>
                  <div className="mb-1 font-black text-[#00102e]">الثمن والسداد</div>
                  <p>ثمن البيع: <strong>{field("sale_total_price") || "____"} ج.م</strong>.</p>
                  <p>طريقة السداد: <LiveField value={saleLabel(field("sale_payment_method"), salePaymentLabels)} />.</p>
                  {field("sale_payment_method") === "installments" && <p className="font-bold text-emerald-800">تفاصيل الأقساط ستصدر في ملحق مستقل مرتبط بالعقد.</p>}
                </div>

                <div className={["sale_handover", "sale_utilities", "sale_guarantees"].includes(currentStepKey) ? highlightClass + " p-4" : normalClass + " p-4"}>
                  <div className="mb-1 font-black text-[#00102e]">التسليم والمرافق والضمانات</div>
                  <p>{field("sale_handover_immediate") === "yes" ? "يتم التسليم فور توقيع العقد." : <>يتم التسليم بتاريخ <LiveField value={field("sale_handover_date")} placeholder="تاريخ التسليم" />.</>}</p>
                  <p>رسوم نقل العدادات يتحملها: <LiveField value={saleLabel(field("meter_transfer_fees_payer"), payerLabels)} />.</p>
                  <p>{formData.sale_has_mortgage || formData.sale_has_dispute || formData.sale_has_attachment || formData.sale_has_usufruct ? "توجد قيود/ملاحظات يجب مراجعتها وذكرها في العقد." : "لا توجد قيود معلنة على الوحدة حسب البيانات المدخلة."}</p>
                </div>

                <div className={currentStepKey === "sale_attachments_court" ? highlightClass + " p-4" : normalClass + " p-4"}>
                  <div className="mb-2 font-black text-[#00102e]">المرفقات المرفوعة</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {saleAttachmentItems.map((item) => (
                      <div key={item.key} className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${uploads[item.key] ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-400"}`}>
                        <span className="block">{uploads[item.key] ? "تم الرفع" : "لم يرفع بعد"} — {item.label}</span>
                        {uploads[item.key] && <span className="mt-1 block break-all font-mono text-[9px] text-emerald-700">{uploads[item.key]}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                {renderSelectedAnnexCards()}
              </div>
            </aside>
          </div>
        </main>
        <Footer />
        <VodafoneCashModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} orderTitle={contractTitle} amountEgp={priceEgp} contractId={checkoutContract?.id ?? draft?.backendContractId} serialNumber={checkoutContract?.serialNumber ?? draft?.serialNumber} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 mx-auto max-w-[1400px] w-full px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-12">

        {/* Header Box with clean top spacing */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border border-slate-200 bg-white p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-[#00102e]/10 px-2.5 py-0.5 text-xs font-bold text-[#00102e] border border-[#00102e]/20">
                صياغة فورية خطوة بخطوة — إعداد بنفسك
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
              {priceEgp} ج.م — فودافون كاش
            </span>
          </div>
        </div>

        {/* Immutability Notice */}
        <div className="rounded-xl border border-[#986410]/30 bg-[#986410]/5 p-3.5 mb-6 flex items-start gap-3">
          <Lock className="h-4 w-4 text-[#986410] shrink-0 mt-0.5" />
          <div className="text-xs text-[#00102e] leading-relaxed">
            <strong className="block font-bold mb-0.5">تنبيه حماية الهوية (Core Data Immutability)</strong>
            بيانات الأطراف (الاسم، الرقم القومي، الهاتف، بطاقة الهوية) تُقفل نهائياً بعد اعتماد العقد ودفع رسوم Z draft.
          </div>
        </div>

        <div className="mb-6">
          <OptionalClauseSelector
            template={templateDefinition}
            variantKey={draft.variantKey!}
            selectedClauseKeys={draft.selectedOptionalClauseKeys}
            onToggle={toggleOptionalClause}
          />
        </div>

        {/* Steps Progress */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {progressSteps.map((s, i) => (
            <React.Fragment key={s.step}>
              <button
                onClick={() => setCurrentStep(s.step)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-center transition-all cursor-pointer whitespace-nowrap ${
                  currentStep === s.step
                    ? "bg-[#00102e] text-white shadow-md"
                    : currentStep > s.step
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-white text-slate-400 border border-slate-200"
                }`}
              >
                <span className={`text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center ${
                  currentStep === s.step ? "bg-[#986410] text-white" : currentStep > s.step ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}>{s.step}</span>
                <span className="text-[10px] font-bold leading-tight">{s.label}</span>
                <span className="text-[9px] opacity-70">{s.articleRange}</span>
              </button>
              {i < progressSteps.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[20px] rounded-full ${currentStep > s.step ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* SPLIT: LEFT = live preview, RIGHT = form */}
        <div className="grid grid-cols-1 xl:grid-cols-11 gap-6 items-start">

          {/* ─── RIGHT: FORM ─── */}
          <div id="wizard-form" className="xl:col-span-5 space-y-5 scroll-mt-24">
            {activeStep?.sourceClauseKey && (
              <DynamicOptionalStep
                step={activeStep}
                fieldValues={formData}
                onFieldChange={(fieldKey, value) => setStoredFieldValue(contractSlug, fieldKey, value)}
              />
            )}
            {/* STEP 1 */}
            {currentStepKey === "rental_landlord" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-[#00102e] border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#986410]" />
                  بيانات الطرف الأول (المؤجر) — مقفلة بعد الحفظ
                </h3>
                {renderPartyTypeSelector("landlord_party_type", "فرد", "شركة / منشأة")}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="الاسم الرباعي الكامل" required helpText={fieldHelp.landlord_name?.help} videoUrl={fieldHelp.landlord_name?.video} />
                    <input type="text" value={field("landlord_name")} onChange={e => set("landlord_name", e.target.value)}
                      placeholder="أحمد محمد حسن علي" className={inputClass} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <FieldLabel label="الرقم القومي (14 رقم)" required helpText={fieldHelp.landlord_national_id?.help} videoUrl={fieldHelp.landlord_national_id?.video} />
                      {renderDigitCounter(field("landlord_national_id"), 14)}
                    </div>
                    <input type="text" maxLength={14} value={field("landlord_national_id")} onChange={e => set("landlord_national_id", e.target.value)}
                      placeholder="2XXXXXXXXXXXXX" className={inputClass + " font-mono"} />
                  </div>
                  <div>
                    <label className={labelClass}>الجنسية</label>
                    <input type="text" value={field("landlord_nationality")} onChange={e => set("landlord_nationality", e.target.value)}
                      placeholder="مصر" className={inputClass} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <FieldLabel label="رقم الهاتف" required helpText={fieldHelp.landlord_phone?.help} videoUrl={fieldHelp.landlord_phone?.video} />
                      {renderDigitCounter(field("landlord_phone"), 11)}
                    </div>
                    <input type="text" maxLength={11} value={field("landlord_phone")} onChange={e => set("landlord_phone", e.target.value)}
                      placeholder="01XXXXXXXXX" className={inputClass + " font-mono"} />
                  </div>
                  <div>
                    <label className={labelClass}>جهة إصدار الهوية</label>
                    <input type="text" value={field("landlord_id_issuer")} onChange={e => set("landlord_id_issuer", e.target.value)} placeholder="جهة الإصدار" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>تاريخ إصدار الهوية</label>
                    <input type="date" value={field("landlord_id_issue_date")} onChange={e => set("landlord_id_issue_date", e.target.value)} dir="ltr" className={`${inputClass} text-left font-mono`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>البريد الإلكتروني</label>
                    <input type="email" value={field("landlord_email")} onChange={e => set("landlord_email", e.target.value)} dir="ltr" placeholder="name@example.com" className={`${inputClass} text-left`} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel label="العنوان المسجل بالبطاقة" required helpText={fieldHelp.landlord_address?.help} videoUrl={fieldHelp.landlord_address?.video} />
                    <input type="text" value={field("landlord_address")} onChange={e => set("landlord_address", e.target.value)}
                      placeholder="المحافظة - المدينة - الشارع ورقم العقار" className={inputClass} />
                  </div>
                </div>
                {renderCompanyFields("landlord", "landlord_party_type", "ممثل المؤجر")}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-3">المرفقات الإلزامية والاختيارية للمؤجر:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadBox("landlord_id_card_front", "وجه بطاقة الرقم القومي", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("landlord_id_card_back", "ظهر بطاقة الرقم القومي", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("property_deed", "سند الملكية أو العقد القديم (يمكن رفع أكثر من ملف)", <FileCheck className="h-5 w-5 text-[#986410]" />, true, true)}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStepKey === "rental_tenant" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-[#00102e] border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#986410]" />
                  بيانات الطرف الثاني (المستأجر) — مقفلة بعد الحفظ
                </h3>
                {renderPartyTypeSelector("tenant_party_type", "فرد", "شركة / منشأة")}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="الاسم الرباعي الكامل" required helpText={fieldHelp.tenant_name?.help} videoUrl={fieldHelp.tenant_name?.video} />
                    <input type="text" value={field("tenant_name")} onChange={e => set("tenant_name", e.target.value)}
                      placeholder="علي حسن محمود إبراهيم" className={inputClass} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <FieldLabel label="الرقم القومي (14 رقم)" required helpText={fieldHelp.tenant_national_id?.help} videoUrl={fieldHelp.tenant_national_id?.video} />
                      {renderDigitCounter(field("tenant_national_id"), 14)}
                    </div>
                    <input type="text" maxLength={14} value={field("tenant_national_id")} onChange={e => set("tenant_national_id", e.target.value)}
                      placeholder="2XXXXXXXXXXXXX" className={inputClass + " font-mono"} />
                  </div>
                  <div>
                    <label className={labelClass}>الجنسية</label>
                    <input type="text" value={field("tenant_nationality")} onChange={e => set("tenant_nationality", e.target.value)}
                      placeholder="مصر" className={inputClass} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <FieldLabel label="رقم الهاتف" required helpText={fieldHelp.tenant_phone?.help} videoUrl={fieldHelp.tenant_phone?.video} />
                      {renderDigitCounter(field("tenant_phone"), 11)}
                    </div>
                    <input type="text" maxLength={11} value={field("tenant_phone")} onChange={e => set("tenant_phone", e.target.value)}
                      placeholder="01XXXXXXXXX" className={inputClass + " font-mono"} />
                  </div>
                  <div>
                    <label className={labelClass}>جهة إصدار الهوية</label>
                    <input type="text" value={field("tenant_id_issuer")} onChange={e => set("tenant_id_issuer", e.target.value)} placeholder="جهة الإصدار" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>تاريخ إصدار الهوية</label>
                    <input type="date" value={field("tenant_id_issue_date")} onChange={e => set("tenant_id_issue_date", e.target.value)} dir="ltr" className={`${inputClass} text-left font-mono`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>البريد الإلكتروني</label>
                    <input type="email" value={field("tenant_email")} onChange={e => set("tenant_email", e.target.value)} dir="ltr" placeholder="name@example.com" className={`${inputClass} text-left`} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel label="العنوان الحالي" required helpText={fieldHelp.tenant_address?.help} videoUrl={fieldHelp.tenant_address?.video} />
                    <input type="text" value={field("tenant_address")} onChange={e => set("tenant_address", e.target.value)}
                      placeholder="المحافظة - المنطقة - الشارع ورقم المنزل" className={inputClass} />
                  </div>
                </div>
                {renderCompanyFields("tenant", "tenant_party_type", "ممثل المستأجر")}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-3">مرفق الهوية للمستأجر:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadBox("tenant_id_card_front", "وجه بطاقة الرقم القومي", <Upload className="h-5 w-5 text-[#00102e]" />)}
                    {uploadBox("tenant_id_card_back", "ظهر بطاقة الرقم القومي", <Upload className="h-5 w-5 text-[#00102e]" />)}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStepKey === "rental_property" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-[#00102e] border-b border-slate-100 pb-3">
                  وصف العقار وبيانات العين المؤجرة
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>المحافظة *</label>
                    <input type="text" value={field("property_governorate")} onChange={e => set("property_governorate", e.target.value)}
                      placeholder="القاهرة" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>المدينة / المركز *</label>
                    <input type="text" value={field("property_city")} onChange={e => set("property_city", e.target.value)}
                      placeholder="مدينة نصر" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>الحي / المنطقة</label>
                    <input type="text" value={field("property_district")} onChange={e => set("property_district", e.target.value)}
                      placeholder="الحي العاشر" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>اسم الكمبوند / المشروع</label>
                    <input type="text" value={field("property_compound_name")} onChange={e => set("property_compound_name", e.target.value)}
                      placeholder="إن وجد" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>رقم القطعة</label>
                    <input type="text" value={field("property_plot_number")} onChange={e => set("property_plot_number", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>رقم المجاورة</label>
                    <input type="text" value={field("property_adjacency_number")} onChange={e => set("property_adjacency_number", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>اسم الشارع *</label>
                    <input type="text" value={field("property_street")} onChange={e => set("property_street", e.target.value)}
                      placeholder="شارع 9" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>رقم العقار *</label>
                    <input type="text" value={field("building_number")} onChange={e => set("building_number", e.target.value)}
                      placeholder="12" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>اسم البرج / العمارة</label>
                    <input type="text" value={field("building_name")} onChange={e => set("building_name", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>الدور</label>
                    <input type="text" value={field("floor_number")} onChange={e => set("floor_number", e.target.value)}
                      placeholder="الثالث" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>رقم الشقة *</label>
                    <input type="text" value={field("unit_number")} onChange={e => set("unit_number", e.target.value)}
                      placeholder="5" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>المساحة الإجمالية (م²) *</label>
                    <input type="number" value={field("property_area")} onChange={e => set("property_area", e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>عدد الغرف</label>
                    <input type="number" min={0} value={field("rooms_count")} onChange={e => set("rooms_count", e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>عدد صالات الاستقبال</label>
                    <input type="number" min={0} value={field("reception_count")} onChange={e => set("reception_count", e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>عدد الحمامات</label>
                    <input type="number" min={0} value={field("bathrooms_count")} onChange={e => set("bathrooms_count", e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>عدد البلكونات</label>
                    <input type="number" min={0} value={field("balconies_count")} onChange={e => set("balconies_count", e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>مستوى التشطيب</label>
                    <select value={field("finishing_level")} onChange={e => set("finishing_level", e.target.value)} className={inputClass}>
                      <option value="unfinished">بدون تشطيب</option>
                      <option value="semi_finished">نصف تشطيب</option>
                      <option value="fully_finished">تشطيب كامل</option>
                      <option value="lux">لوكس</option>
                      <option value="super_lux">سوبر لوكس</option>
                      <option value="super_high_lux">سوبر هاي لوكس</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>المطبخ</label>
                    <select value={field("has_kitchen")} onChange={e => set("has_kitchen", e.target.value)} className={inputClass}>
                      <option value="yes">يوجد</option><option value="no">لا يوجد مستقل</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>وصف المطبخ / التجهيزات</label>
                    <input type="text" value={field("kitchen_description")} onChange={e => set("kitchen_description", e.target.value)} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>ملاحظات العنوان أو وصف إضافي</label>
                    <input type="text" value={field("property_address")} onChange={e => set("property_address", e.target.value)}
                      placeholder="علامة مميزة أو وصف إضافي اختياري" className={inputClass} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-3 text-xs font-black text-[#00102e]">حدود العين المؤجرة (اختياري)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" value={field("north_boundary")} onChange={e => set("north_boundary", e.target.value)} placeholder="الحد البحري" className={inputClass} />
                    <input type="text" value={field("south_boundary")} onChange={e => set("south_boundary", e.target.value)} placeholder="الحد القبلي" className={inputClass} />
                    <input type="text" value={field("east_boundary")} onChange={e => set("east_boundary", e.target.value)} placeholder="الحد الشرقي" className={inputClass} />
                    <input type="text" value={field("west_boundary")} onChange={e => set("west_boundary", e.target.value)} placeholder="الحد الغربي" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>رقم عداد الكهرباء</label>
                    <input type="text" value={field("electricity_meter")} onChange={e => set("electricity_meter", e.target.value)}
                      placeholder="0000000" className={inputClass + " font-mono"} />
                  </div>
                  <div>
                    <label className={labelClass}>رقم عداد المياه</label>
                    <input type="text" value={field("water_meter")} onChange={e => set("water_meter", e.target.value)}
                      placeholder="0000000" className={inputClass + " font-mono"} />
                  </div>
                  <div>
                    <label className={labelClass}>رقم عداد الغاز</label>
                    <input type="text" value={field("gas_meter")} onChange={e => set("gas_meter", e.target.value)}
                      placeholder="0000000" className={inputClass + " font-mono"} />
                  </div>
                </div>
                {/* Step 3 - Document uploads */}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-3">المرفقات الاختيارية لوصف العقار:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadBox("property_photos", "صور العقار من الداخل والخارج", <Camera className="h-5 w-5 text-[#00102e]" />, true, true)}
                    {uploadBox("ownership_doc", "عقد الملكية أو التسجيل (يمكن رفع أكثر من ملف)", <FileCheck className="h-5 w-5 text-[#986410]" />, true, true)}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {currentStepKey === "rental_terms" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-[#00102e] border-b border-slate-100 pb-3">
                  الغرض من الإيجار ومدة العقد
                </h3>

                <div className="rounded-xl border border-[#986410]/20 bg-[#986410]/5 p-4">
                  <label className={labelClass}>الغرض من الإيجار</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#00102e] px-3 py-1 text-xs font-black text-white">
                      {field("rental_purpose") === "commercial" ? "تجاري" : field("rental_purpose") === "administrative" ? "إداري" : "سكني"}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600">محدد تلقائيًا من نوع العقد المختار ولا يتغير داخل المعالج.</span>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    type="checkbox"
                    checked={field("sublease_allowed") !== "yes"}
                    onChange={(e) => set("sublease_allowed", e.target.checked ? "no" : "yes")}
                    className="mt-1"
                  />
                  <span className="text-xs font-bold leading-6 text-slate-700">
                    يمنع التأجير من الباطن أو التنازل عن العين بدون موافقة كتابية من المؤجر.
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>تاريخ بدء الإيجار *</label>
                    <input
                      type="date"
                      value={field("start_date")}
                      onChange={e => set("start_date", e.target.value)}
                      dir="ltr"
                      className={`${inputClass} text-left font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>تاريخ انتهاء الإيجار *</label>
                    <input
                      type="date"
                      value={field("end_date")}
                      onChange={e => set("end_date", e.target.value)}
                      dir="ltr"
                      className={`${inputClass} text-left font-mono`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>مدة العقد</label>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={field("contract_duration_amount")}
                        onChange={e => set("contract_duration_amount", e.target.value)}
                        dir="ltr"
                        placeholder="12"
                        className={`${inputClass} text-left font-mono`}
                      />
                      <select
                        value={field("contract_duration_unit") || "month"}
                        onChange={e => set("contract_duration_unit", e.target.value)}
                        className={inputClass}
                      >
                        <option value="month">شهر</option>
                        <option value="year">سنة</option>
                      </select>
                    </div>
                    <p className="mt-1 rounded-lg border border-[#986410]/20 bg-[#986410]/5 px-3 py-2 text-[10px] font-bold text-[#986410]">
                      مدة العقد كتابة: {contractDurationText(field("contract_duration_amount"), field("contract_duration_unit")) || "أدخل مدة العقد"}
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>مهلة الإخطار قبل عدم التجديد / الإخلاء (يوم)</label>
                    <input type="number" min={0} max={3650} value={field("non_renewal_notice_days")} onChange={e => set("non_renewal_notice_days", e.target.value)}
                      dir="ltr" className={`${inputClass} text-left font-mono`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>التجديد</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        ["no_auto", "لا يتجدد تلقائياً"],
                        ["mutual_agreement", "يتجدد باتفاق الطرفين"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => set("renewal_policy", value)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                            field("renewal_policy") === value
                              ? "border-[#986410] bg-[#986410]/10 text-[#986410]"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5 */}
            {currentStepKey === "rental_financial" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-[#00102e] border-b border-slate-100 pb-3">
                  القيمة الإيجارية والتأمين وطريقة الدفع
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <ArabicCurrencyInput
                      label="قيمة الإيجار الشهري"
                      value={String(field("monthly_rent"))}
                      onChange={v => set("monthly_rent", v)}
                      required
                      min={100}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>موعد الدفع</label>
                    <select value={field("rent_due_day")} onChange={e => set("rent_due_day", e.target.value)} className={inputClass}>
                      <option value="1">أول الشهر</option>
                      <option value="5">اليوم الخامس</option>
                      <option value="7">اليوم السابع</option>
                      <option value="custom">موعد مخصص</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>طريقة الدفع</label>
                    <select value={field("payment_method")} onChange={e => set("payment_method", e.target.value)} className={inputClass}>
                      <option value="cash">نقداً</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="wallet">محفظة إلكترونية</option>
                    </select>
                  </div>
                  {field("payment_method") === "bank_transfer" && (
                    <>
                      <div>
                        <label className={labelClass}>اسم البنك</label>
                        <input type="text" value={field("bank_name")} onChange={e => set("bank_name", e.target.value)}
                          placeholder="اسم البنك" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>رقم الحساب</label>
                        <input type="text" value={field("bank_account_number")} onChange={e => set("bank_account_number", e.target.value)}
                          dir="ltr" placeholder="Account / IBAN" className={`${inputClass} text-left font-mono`} />
                      </div>
                    </>
                  )}
                  {field("payment_method") === "wallet" && (
                    <div className="sm:col-span-2">
                      <label className={labelClass}>رقم المحفظة الإلكترونية</label>
                      <input type="text" value={field("wallet_number")} onChange={e => set("wallet_number", e.target.value)}
                        dir="ltr" placeholder="01XXXXXXXXX" className={`${inputClass} text-left font-mono`} />
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>هل توجد زيادة سنوية؟</label>
                    <select value={field("annual_increase_enabled")} onChange={e => set("annual_increase_enabled", e.target.value)} className={inputClass}>
                      <option value="yes">نعم</option>
                      <option value="no">لا</option>
                    </select>
                  </div>
                  {field("annual_increase_enabled") === "yes" && (
                    <>
                    <div>
                      <label className={labelClass}>نسبة الزيادة السنوية (%)</label>
                      <input type="number" value={field("annual_increase")} onChange={e => set("annual_increase", e.target.value)}
                        placeholder="10" min={0} max={100} dir="ltr" className={`${inputClass} text-left font-mono`} />
                      {field("annual_increase") && Number(field("annual_increase")) > 0 && (
                      <p className="text-[10px] text-[#986410] font-bold mt-1">
                        ↑ زيادة سنوية بنسبة {field("annual_increase")}% = {Math.round(Number(field("monthly_rent")) * (1 + Number(field("annual_increase")) / 100)).toLocaleString("ar-EG")} ج.م السنة القادمة
                      </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>طريقة الحساب</label>
                      <select value={field("annual_increase_type")} onChange={e => set("annual_increase_type", e.target.value)} className={inputClass}>
                        <option value="simple">بسيطة</option>
                        <option value="compound">مركبة</option>
                      </select>
                    </div>
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <label className={labelClass}>هل يوجد مبلغ تأمين؟</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["yes", "نعم"],
                        ["no", "لا"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => set("has_deposit", value)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                            field("has_deposit") === value
                              ? "border-[#986410] bg-[#986410]/10 text-[#986410]"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {field("has_deposit") === "yes" && (
                  <>
                    <div>
                      <ArabicCurrencyInput
                        label="مبلغ التأمين النقدي المسترد"
                        value={String(field("deposit_amount"))}
                        onChange={v => set("deposit_amount", v)}
                        required
                        min={0}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>مدة رد التأمين بعد التسليم والمخالصة (يوم)</label>
                      <input type="number" min={0} max={365} value={field("deposit_return_days")} onChange={e => set("deposit_return_days", e.target.value)}
                        dir="ltr" className={`${inputClass} text-left font-mono`} />
                    </div>
                  </>
                  )}
                </div>
                <div className="rounded-xl bg-[#00102e]/5 border border-[#00102e]/15 p-3 text-xs text-[#00102e]">
                  <strong className="block mb-1">ملاحظة مهمة عن الدفع:</strong>
                  تُسدد قيمة الإيجار الشهري مقدماً بحلول اليوم الخامس من كل شهر ميلادي، ولا يُعد مبلغ التأمين بديلاً عن آخر إيجار.
                </div>
                {/* Step 4 - Document uploads */}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-3">المرفقات الاختيارية للشروط المالية:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadBox("rent_receipts", "إيصال دفع آخر إيجار أو تأمين", <Receipt className="h-5 w-5 text-emerald-700" />, true, true)}
                    {uploadBox("financial_agreement", "أي اتفاق مالي مكتوب سابق", <FileCheck className="h-5 w-5 text-[#986410]" />, true, true)}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6 */}
            {currentStepKey === "rental_utilities" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-[#00102e] border-b border-slate-100 pb-3">
                  المرافق والعدادات ومن يتحمل الفواتير
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>رقم عداد الكهرباء</label>
                    <input type="text" value={field("electricity_meter")} onChange={e => set("electricity_meter", e.target.value)}
                      dir="ltr" className={`${inputClass} text-left font-mono`} />
                  </div>
                  <div>
                    <label className={labelClass}>نوع عداد الكهرباء</label>
                    <select value={field("electricity_meter_type")} onChange={e => set("electricity_meter_type", e.target.value)} className={inputClass}>
                      <option value="prepaid_card">كارت</option>
                      <option value="bill">فاتورة</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>رقم عداد المياه</label>
                    <input type="text" value={field("water_meter")} onChange={e => set("water_meter", e.target.value)}
                      dir="ltr" className={`${inputClass} text-left font-mono`} />
                  </div>
                  <div>
                    <label className={labelClass}>نوع عداد المياه</label>
                    <select value={field("water_meter_type")} onChange={e => set("water_meter_type", e.target.value)} className={inputClass}>
                      <option value="separate">منفصل</option>
                      <option value="shared">مشترك</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>رقم عداد الغاز</label>
                    <input type="text" value={field("gas_meter")} onChange={e => set("gas_meter", e.target.value)}
                      dir="ltr" className={`${inputClass} text-left font-mono`} />
                  </div>
                  <div>
                    <label className={labelClass}>نوع عداد الغاز</label>
                    <select value={field("gas_meter_type")} onChange={e => set("gas_meter_type", e.target.value)} className={inputClass}>
                      <option value="independent">مستقل</option><option value="shared">مشترك</option><option value="not_present">غير موجود</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>الإنترنت</label>
                    <select value={field("internet_available")} onChange={e => set("internet_available", e.target.value)} className={inputClass}>
                      <option value="yes">يوجد</option>
                      <option value="no">لا يوجد</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-3 text-xs font-black text-[#00102e]">التزامات الفواتير</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ["tenant_pays_electricity", "المستأجر مسؤول عن فواتير الكهرباء"],
                      ["tenant_pays_water", "المستأجر مسؤول عن المياه"],
                      ["tenant_pays_gas", "المستأجر مسؤول عن الغاز"],
                      ["tenant_pays_internet", "المستأجر مسؤول عن الإنترنت"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-white bg-white px-3 py-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={formData[key] === true}
                          onChange={(e) => set(key, e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7 */}
            {currentStepKey === "rental_practical" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-[#00102e] border-b border-slate-100 pb-3">
                  شروط سهلة بدل صياغة قانونية معقدة
                </h3>

                <div>
                  <label className={labelClass}>الحيوانات الأليفة</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      ["prohibited", "ممنوع"],
                      ["allowed", "مسموح"],
                      ["conditional", "مسموح بشروط"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set("pets_policy", value)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                          field("pets_policy") === value
                            ? "border-[#986410] bg-[#986410]/10 text-[#986410]"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>إذا تأخر المستأجر عن السداد، ماذا يحدث؟</label>
                  <select value={field("late_payment_action")} onChange={e => set("late_payment_action", e.target.value)} className={inputClass}>
                    <option value="grace_period">إعطاء مهلة ثم تطبيق الشرط الفاسخ</option>
                    <option value="immediate_termination">إنهاء العقد عند الإخلال الجوهري</option>
                    <option value="no_special_clause">بدون شرط خاص</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>هل تريد إضافة غرامة تأخير؟</label>
                    <select value={field("late_penalty_enabled")} onChange={e => set("late_penalty_enabled", e.target.value)} className={inputClass}>
                      <option value="yes">نعم</option>
                      <option value="no">لا</option>
                    </select>
                  </div>
                  {field("late_penalty_enabled") === "yes" && (
                    <div>
                      <label className={labelClass}>قيمة الغرامة اليومية</label>
                      <input type="number" value={field("daily_late_penalty_amount")} onChange={e => set("daily_late_penalty_amount", e.target.value)}
                        min={0} dir="ltr" className={`${inputClass} text-left font-mono`} />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className={labelClass}>المحكمة المختصة *</label>
                    <select value={field("competent_court")} onChange={e => set("competent_court", e.target.value)} className={inputClass}>
                      <option value="القاهرة">القاهرة</option>
                      <option value="الجيزة">الجيزة</option>
                      <option value="الإسكندرية">الإسكندرية</option>
                      <option value="المنصورة">المنصورة</option>
                      <option value="طنطا">طنطا</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* REVIEW STEP */}
            {currentStepKey === "rental_review" && (
              <div className="rounded-2xl border border-[#986410]/30 bg-[#986410]/5 p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-[#986410]/20 pb-3">
                  <ShieldCheck className="h-6 w-6 text-[#00102e]" />
                  <div>
                    <h3 className="text-sm font-extrabold text-[#00102e]">مراجعة واعتماد العقد</h3>
                    <p className="text-xs text-slate-600 mt-0.5">راجع المعاينة الحية يساراً ثم اقرأ الإقرار وادفع</p>
                  </div>
                </div>
                {draft.selectedOptionalClauseKeys.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-[10px] font-black text-emerald-800">الملاحق المختارة</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {draft.selectedOptionalClauseKeys.map((key) => {
                        const clause = templateDefinition.optionalClauses.find((item) => item.key === key);
                        return clause ? <span key={key} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-emerald-800">{clause.nameAr}</span> : null;
                      })}
                    </div>
                  </div>
                )}
                <div className="space-y-2 text-xs">
                  {[...requiredReviewItems, ...rentalCompanyRequiredItems].map(({ label, value }) => {
                    const ok = !!String(value || "").trim();
                    return (
                    <div key={label} className={`flex items-center justify-between rounded-lg px-3 py-2 ${ok ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                      <span className="text-slate-700">{label}</span>
                      <span className={`font-bold ${ok ? "text-emerald-800" : "text-red-600"}`}>{ok ? value : "⚠ مطلوب"}</span>
                    </div>
                    );
                  })}
                </div>

                {/* ─── INTERACTIVE STEP 5 ACTION GUIDANCE & SHARING ─── */}
                <div className="rounded-2xl border-2 border-[#986410]/60 bg-gradient-to-br from-[#00102e] to-[#0a1f4d] p-5 text-white shadow-xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                    <div className="rounded-xl bg-[#986410] p-2 text-[#00102e]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#986410] uppercase block">حسابك أولا — ثم المشاركة أو الدفع</span>
                      <h4 className="text-sm font-extrabold text-white">المشاركة تتم من داخل هذه المسودة وبـ Z-ID محدد</h4>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    أنت الآن تعاين <strong>مسودة حية</strong>. مشاركة العقد لا تتم كرابط عام؛ اكتب Z-ID للطرف الآخر، ثم أرسل له رابط دعوة مقيد بحسابه. فتح الرابط وحده لا يعطي صلاحية قبل التحقق من نفس Z-ID.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Option 1: Share first */}
                    <div className="rounded-xl bg-white/10 border border-white/15 p-3.5 hover:bg-white/15 transition-all space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[#986410] font-extrabold text-xs">
                          <Share2 className="h-4 w-4" />
                          <span>دعوة طرف آخر بهذه المسودة</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          Z-ID هو أساس الصلاحية. الرابط مجرد وسيلة للوصول إلى الدعوة، ويطلب من الطرف الآخر التحقق من Z-ID قبل فتح المسودة. بعد الدفع تصبح المشاركة للعرض فقط.
                        </p>
                      </div>
                      <input
                        type="text"
                        value={shareZId}
                        onChange={(e) => setShareZId(e.target.value)}
                        placeholder="Z-ID للطرف الآخر"
                        dir="ltr"
                        className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-left text-xs font-mono text-white placeholder:text-slate-500 focus:border-[#986410] focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSharePermission("review_only")}
                          className={`rounded-lg px-2 py-2 text-[10px] font-bold transition-colors ${
                            sharePermission === "review_only" ? "bg-[#986410] text-[#00102e]" : "bg-white/10 text-slate-200 hover:bg-white/20"
                          }`}
                        >
                          عرض فقط
                        </button>
                        <button
                          type="button"
                          onClick={() => setSharePermission("review_edit")}
                          className={`rounded-lg px-2 py-2 text-[10px] font-bold transition-colors ${
                            sharePermission === "review_edit" ? "bg-[#986410] text-[#00102e]" : "bg-white/10 text-slate-200 hover:bg-white/20"
                          }`}
                        >
                          مراجعة وتعديل قبل الدفع
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateShareLink}
                        className="w-full rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{shareCopied ? "تم إنشاء الدعوة ونسخ الرابط" : "إنشاء دعوة مقيدة ونسخ الرابط"}</span>
                      </button>
                      {generatedShareLink && (
                        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] text-emerald-100">
                          تم إنشاء دعوة لهذه المسودة ومقيدة بـ Z-ID: <span className="font-mono">{shareZId}</span>
                        </div>
                      )}
                    </div>

                    {/* Option 2: Pay & Finalize now */}
                    <div className="rounded-xl bg-gradient-to-br from-[#986410]/25 to-[#986410]/10 border-2 border-[#986410] p-3.5 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-300 font-extrabold text-xs">
                          <ShieldCheck className="h-4 w-4" />
                          <span>اعتماد ودفع بعد التسجيل</span>
                        </div>
                        <p className="text-[10px] text-slate-200 leading-relaxed">
                          بعد تسجيل الحساب يتم دفع الرسوم بفودافون كاش، ثم مراجعة إثبات التحويل واعتماد العقد. بعد الاعتماد يمكنك تحميل النسخة النهائية، وتصبح حقول الهوية والبيانات الأساسية مقفولة.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void openCheckoutIfReady()}
                        className="w-full rounded-lg bg-[#986410] hover:bg-amber-400 text-[#00102e] px-3 py-2 text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
                      >
                        <span>{isContractReadyForPayment ? `اعتماد ودفع ${priceEgp} ج.م` : "استكمل البيانات المطلوبة"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Declaration Checkbox */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={declarationAccepted}
                        onChange={e => setDeclarationAccepted(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        declarationAccepted
                          ? "bg-[#00102e] border-[#00102e]"
                          : "border-slate-300 bg-white group-hover:border-[#986410]"
                      }`}>
                        {declarationAccepted && <CheckCircle2 className="h-3.5 w-3.5 text-[#986410]" />}
                      </div>
                    </div>
                    <span className="text-xs text-slate-700 leading-relaxed">
                      أقر بأنني قرأت وفهمت ووافقت على{" "}
                      <a
                        href="/declaration"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="font-bold text-[#986410] underline underline-offset-2 hover:text-[#00102e] transition-colors inline-flex items-center gap-0.5"
                      >
                        وثيقة الإقرار والموافقة القانونية الكاملة
                        <ExternalLink className="h-3 w-3" />
                      </a>{" "}
                      الخاصة بمنصة Z draft، وأن جميع البيانات المُدخلة صحيحة ودقيقة.
                    </span>
                  </label>
                  {!declarationAccepted && (
                    <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mr-8">
                      ⚠ يجب قبول الإقرار قبل الانتقال للدفع
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs text-slate-500">رسوم الصياغة والاعتماد:</span>
                    <div className="text-xl font-extrabold text-[#00102e]">
                      {priceEgp} ج.م فقط
                    </div>
                  </div>
                  <button
                    onClick={() => void openCheckoutIfReady()}
                    disabled={!declarationAccepted || !isContractReadyForPayment}
                    className={`w-full rounded-xl px-5 py-3 text-xs font-bold transition-colors shadow-md sm:w-auto whitespace-nowrap ${
                      declarationAccepted && isContractReadyForPayment
                        ? "bg-[#00102e] text-[#986410] hover:bg-[#0a1f4d] cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {isContractReadyForPayment ? `اعتماد ودفع ${priceEgp} ج.م` : "استكمل المطلوب"}
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
          <div id="wizard-preview" className="xl:col-span-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scroll-mt-24">
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
                {/* Title */}
                <div className="text-center pb-4 border-b-2 border-[#00102e]">
                  <div className="text-[10px] text-[#986410] font-bold uppercase tracking-widest mb-1">منصة Z draft لإعداد العقود</div>
                  <h2 className="text-lg font-extrabold text-[#00102e]">{contractTitle}</h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{displaySerial} — مسودة قيد الإعداد</p>
                </div>

                {/* Preamble */}
                <p className="text-slate-700">
                  إنه في تاريخ{" "}
                  <LiveField value={field("start_date") ? new Date(String(field("start_date"))).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : ""} placeholder="__________ / __________ / __________م" />{" "}
                  تم الاتفاق والتراضي بين كل من:
                </p>

                {/* PARTY 1 */}
                <div className={currentStepKey === "rental_landlord" ? highlightClass + " p-4" : normalClass + " p-4"}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {currentStepKey === "rental_landlord" && <Zap className="h-3 w-3 text-[#986410]" />}
                    <h4 className="font-extrabold text-[#00102e]">الطرف الأول (المؤجر):</h4>
                  </div>
                  <ul className="space-y-1 text-[11px]">
                    <li>الاسم: <LiveField value={field("landlord_name")} placeholder="الاسم الرباعي للمؤجر" /></li>
                    <li>الجنسية: <LiveField value={field("landlord_nationality")} placeholder="مصر" /> بموجب رقم قومي: <LiveField value={field("landlord_national_id")} placeholder="00000000000000" /></li>
                    <li>العنوان: <LiveField value={field("landlord_address")} placeholder="عنوان المؤجر" /></li>
                    <li>رقم الهاتف: <LiveField value={field("landlord_phone")} placeholder="01XXXXXXXXX" /></li>
                    {uploads["landlord_id_card_front"] && <li className="text-emerald-700 font-bold">✓ تم إرفاق وجه بطاقة الهوية ({uploads["landlord_id_card_front"]})</li>}
                    {uploads["landlord_id_card_back"] && <li className="text-emerald-700 font-bold">✓ تم إرفاق ظهر بطاقة الهوية ({uploads["landlord_id_card_back"]})</li>}
                    {uploads["property_deed"] && <li className="text-emerald-700 font-bold">✓ تم إرفاق سند الملكية ({uploads["property_deed"]})</li>}
                  </ul>
                </div>

                {/* PARTY 2 */}
                <div className={currentStepKey === "rental_tenant" ? highlightClass + " p-4" : normalClass + " p-4"}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {currentStepKey === "rental_tenant" && <Zap className="h-3 w-3 text-[#986410]" />}
                    <h4 className="font-extrabold text-[#00102e]">الطرف الثاني (المستأجر):</h4>
                  </div>
                  <ul className="space-y-1 text-[11px]">
                    <li>الاسم: <LiveField value={field("tenant_name")} placeholder="الاسم الرباعي للمستأجر" /></li>
                    <li>الجنسية: <LiveField value={field("tenant_nationality")} placeholder="مصر" /> بموجب رقم قومي: <LiveField value={field("tenant_national_id")} placeholder="00000000000000" /></li>
                    <li>العنوان: <LiveField value={field("tenant_address")} placeholder="عنوان المستأجر" /></li>
                    <li>رقم الهاتف: <LiveField value={field("tenant_phone")} placeholder="01XXXXXXXXX" /></li>
                    {uploads["tenant_id_card_front"] && <li className="text-emerald-700 font-bold">✓ تم إرفاق وجه بطاقة الهوية ({uploads["tenant_id_card_front"]})</li>}
                    {uploads["tenant_id_card_back"] && <li className="text-emerald-700 font-bold">✓ تم إرفاق ظهر بطاقة الهوية ({uploads["tenant_id_card_back"]})</li>}
                  </ul>
                </div>

                {/* ARTICLE 3 — Property */}
                <div className={["rental_property", "rental_residential_details", "rental_commercial_details", "rental_administrative_details"].includes(currentStepKey) ? highlightClass + " p-4" : normalClass + " p-4"}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {["rental_property", "rental_residential_details", "rental_commercial_details", "rental_administrative_details"].includes(currentStepKey) && <Zap className="h-3 w-3 text-[#986410]" />}
                    <h4 className="font-extrabold text-[#00102e]">مادة (3): وصف العين المؤجرة</h4>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    أجّر الطرف الأول للطرف الثاني العين المؤجرة الكائنة بمحافظة{" "}
                    <LiveField value={field("property_governorate")} placeholder="المحافظة" />،{" "}
                    <LiveField value={field("property_city")} placeholder="المدينة / المنطقة" />{" "}
                    — العنوان التفصيلي: <LiveField value={propertyLocationText || field("property_address")} placeholder="الشارع، المبنى، الدور، رقم الوحدة" />،{" "}
                    بمساحة إجمالية حوالي <LiveField value={field("property_area")} /> م²،{" "}
                    تشطيب: <LiveField value={field("finishing_level") === "super_lux" ? "سوبر لوكس" : field("finishing_level") === "semi_finished" ? "نصف تشطيب" : field("finishing_level") === "other" ? "أخرى" : "لوكس"} />.
                    {(field("electricity_meter") || field("water_meter") || field("gas_meter")) && (
                      <span> رقم عداد الكهرباء: <LiveField value={field("electricity_meter")} />، المياه: <LiveField value={field("water_meter")} />، الغاز: <LiveField value={field("gas_meter")} />.</span>
                    )}
                  </p>
                </div>

                {/* ARTICLE 4 */}
                <div className={currentStepKey === "rental_terms" ? highlightClass + " p-3" : normalClass + " p-3"}>
                  <h4 className="font-extrabold text-[#00102e] mb-1">مادة (4): الغرض من الإيجار</h4>
                  <p className="text-[11px] text-slate-700">
                    يستأجر الطرف الثاني العين لغرض{" "}
                    <LiveField value={field("rental_purpose") === "commercial" ? "تجاري" : field("rental_purpose") === "administrative" ? "إداري" : field("rental_purpose") === "professional" ? "مهني" : "سكني"} />
                    ، و{field("sublease_allowed") === "yes" ? "يجوز التأجير من الباطن بموافقة كتابية" : "يحظر التأجير من الباطن أو التنازل دون موافقة كتابية"}.
                  </p>
                </div>

                {/* ARTICLES 5, 6, 7 */}
                <div className={["rental_terms", "rental_financial"].includes(currentStepKey) ? highlightClass + " p-4 space-y-3" : normalClass + " p-4 space-y-3"}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {currentStepKey === "rental_terms" && <Zap className="h-3 w-3 text-[#986410]" />}
                    <h4 className="font-extrabold text-[#00102e]">مادة (5): مدة الإيجار</h4>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    مدة العقد <LiveField value={contractDurationText(field("contract_duration_amount"), field("contract_duration_unit"))} placeholder="مدة العقد" />، تبدأ من{" "}
                    <LiveField value={field("start_date") ? new Date(String(field("start_date"))).toLocaleDateString("ar-EG", {year:"numeric",month:"long",day:"numeric"}) : ""} placeholder="تاريخ البدء" />{" "}
                    وتنتهي في <LiveField value={field("end_date") ? new Date(String(field("end_date"))).toLocaleDateString("ar-EG", {year:"numeric",month:"long",day:"numeric"}) : ""} placeholder="تاريخ الانتهاء" />.
                    ينتهي العقد بقوة القانون دون إنذار ولا يتجدد تلقائياً.
                  </p>
                  <div className="border-t border-slate-200 pt-2">
                    <h4 className="font-extrabold text-[#00102e] mb-1">مادة (6): القيمة الإيجارية</h4>
                    <p className="text-[11px] text-slate-700">
                      تبلغ القيمة الإيجارية الشهرية{" "}
                      <strong className={field("monthly_rent") ? "text-[#00102e] font-extrabold text-xs" : "text-slate-400 font-normal"}>
                        {field("monthly_rent") || "_____"} ج.م
                      </strong>{" "}
                      شهرياً، مع زيادة سنوية <LiveField value={field("annual_increase_enabled") === "yes" && field("annual_increase") ? field("annual_increase") + "%" : "لا توجد"} placeholder="__%" />،{" "}
                      تُسدد مقدماً في يوم <LiveField value={field("rent_due_day")} placeholder="__" /> من كل شهر بطريقة <LiveField value={field("payment_method") === "bank_transfer" ? "تحويل بنكي" : field("payment_method") === "wallet" ? "محفظة إلكترونية" : "نقداً"} />.
                    </p>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <h4 className="font-extrabold text-[#00102e] mb-1">مادة (7): مبلغ التأمين</h4>
                    <p className="text-[11px] text-slate-700">
                      {field("has_deposit") === "yes" ? "دفع المستأجر مبلغ التأمين وقدره" : "اتفق الطرفان على عدم وجود مبلغ تأمين"}{" "}
                      <strong className={field("deposit_amount") ? "text-[#00102e] font-extrabold text-xs" : "text-slate-400 font-normal"}>
                        {field("has_deposit") === "yes" ? `${field("deposit_amount") || "_____"} ج.م` : ""}
                      </strong>{" "}
                      {field("has_deposit") === "yes" ? "يُرد عند التسليم بعد خصم أي مستحقات." : "."}
                    </p>
                  </div>
                </div>

                {/* ARTICLES 8–19 SUMMARY */}
                <div className={`p-4 space-y-1.5 ${currentStepKey === "rental_review" ? highlightClass : normalClass}`}>
                  {currentStepKey === "rental_review" && <div className="flex items-center gap-1.5 mb-2"><Zap className="h-3 w-3 text-[#986410]" /><span className="font-bold text-[#00102e] text-[11px]">عرض البنود الكاملة — جاهز للاعتماد</span></div>}
                  {rentalSummaryArticles.map((article, index) => (
                    <p key={article} className="text-[10px] text-slate-600 border-r-2 border-slate-200 pr-2">
                      بند ملخص ({index + 1}): {article}
                    </p>
                  ))}
                </div>

                {renderSelectedAnnexCards()}

                {/* Signatures */}
                <div className="pt-4 border-t-2 border-[#00102e] grid grid-cols-2 gap-4 text-center text-[10px]">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="font-extrabold text-[#00102e] mb-1">الطرف الأول (المؤجر)</div>
                    <div className="text-slate-500 text-[9px] mb-4"><LiveField value={field("landlord_name")} placeholder="________________________" /></div>
                    <div className="border-b border-slate-400 w-3/4 mx-auto" />
                    <div className="text-slate-400 mt-1 text-[9px]">التوقيع والبصمة</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="font-extrabold text-[#00102e] mb-1">الطرف الثاني (المستأجر)</div>
                    <div className="text-slate-500 text-[9px] mb-4"><LiveField value={field("tenant_name")} placeholder="________________________" /></div>
                    <div className="border-b border-slate-400 w-3/4 mx-auto" />
                    <div className="text-slate-400 mt-1 text-[9px]">التوقيع والبصمة</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5 text-[#986410]" />Z draft — معاينة بيانات العقد قبل الإصدار</span>
                  <span className="font-mono">{displaySerial}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Mobile Preview Button (Shows on small/medium screens where side-by-side right pane wraps) */}
      <div className="fixed bottom-6 left-6 z-40 xl:hidden">
        <button
          onClick={() => setIsMobilePreviewOpen(true)}
          className="rounded-full bg-[#00102e] text-[#986410] px-5 py-3.5 text-xs font-black shadow-2xl border-2 border-[#986410] flex items-center gap-2.5 hover:bg-[#0a1f4d] transition-all active:scale-95 cursor-pointer"
        >
          <FileText className="h-4 w-4" />
          <span>👁️ معاينة العقد الآن</span>
        </button>
      </div>

      {/* Mobile Preview Modal */}
      {isMobilePreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#00102e]" />
                <h3 className="text-sm sm:text-base font-black text-[#00102e]">معاينة وثيقة العقد القانونية الحية</h3>
              </div>
              <button
                onClick={() => setIsMobilePreviewOpen(false)}
                className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕ إغلاق
              </button>
            </div>
            
            <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-800 bg-slate-50 p-5 rounded-2xl border border-slate-200 font-cairo">
              <div className="text-center pb-3 border-b border-slate-200">
                <span className="text-[10px] text-slate-400 font-mono block">مسودة حية — Z draft Legal</span>
                <h4 className="text-base font-extrabold text-[#00102e] mt-1">{contractTitle}</h4>
              </div>

              <p className="text-slate-700">
                إنه في يوم <strong className="text-[#00102e]">{new Date().toLocaleDateString("ar-EG")}</strong> تم الاتفاق والتراضي بين كل من:
              </p>

              <div className="rounded-xl bg-white p-3 border border-slate-200 space-y-1">
                <strong className="text-[#986410] block">الطرف الأول (المؤجر):</strong>
                <p>السيد/ <strong className="text-slate-900">{field("landlord_name") || "_______________"}</strong> يحمل رقم قومي <strong className="font-mono text-slate-900">{field("landlord_national_id") || "_______________"}</strong> ورقم هاتف <strong className="font-mono text-slate-900">{field("landlord_phone") || "_______________"}</strong>.</p>
              </div>

              <div className="rounded-xl bg-white p-3 border border-slate-200 space-y-1">
                <strong className="text-[#986410] block">الطرف الثاني (المستأجر):</strong>
                <p>السيد/ <strong className="text-slate-900">{field("tenant_name") || "_______________"}</strong> يحمل رقم قومي <strong className="font-mono text-slate-900">{field("tenant_national_id") || "_______________"}</strong> ورقم هاتف <strong className="font-mono text-slate-900">{field("tenant_phone") || "_______________"}</strong>.</p>
              </div>

              <div className="space-y-2 pt-2">
                <p><strong className="text-slate-900">المادة (1) ومادة (2) محل العقد والماليات:</strong> الوحدة الكائنة في: <strong className="text-blue-800">{field("property_address") || "_______________"}</strong> بقيمة إيجارية <strong className="text-emerald-700 font-black">{field("monthly_rent") || "_______"} ج.م</strong> وتأمين <strong className="text-slate-900">{field("deposit_amount") || "_______"} ج.م</strong>.</p>
              </div>

                <div className="flex items-center justify-between border-t border-slate-300 pt-3 text-[11px] font-bold text-slate-600">
                  <span>مكان توقيع الطرف الأول</span>
                  <span>مكان توقيع الطرف الثاني</span>
                </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsMobilePreviewOpen(false)}
                className="w-full sm:w-auto rounded-xl bg-[#00102e] text-[#986410] px-6 py-3 text-xs font-bold shadow-md cursor-pointer hover:bg-[#0a1f4d]"
              >
                إغلاق المعاينة والمتابعة
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <VodafoneCashModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} orderTitle={contractTitle} amountEgp={priceEgp} contractId={checkoutContract?.id ?? draft?.backendContractId} serialNumber={checkoutContract?.serialNumber ?? draft?.serialNumber} />
    </div>
  );
}
