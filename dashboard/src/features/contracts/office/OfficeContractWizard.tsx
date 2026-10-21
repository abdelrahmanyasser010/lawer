"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileStack,
  FileText,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";
import {
  resolveWizardDefinition,
  validateDynamicDefinition,
  type ContractDraftData,
  type ContractFieldValue,
  type ContractSlug,
} from "@zdraft/template-engine";
import DynamicFieldRenderer from "../components/DynamicFieldRenderer";
import { useOfficeTemplate } from "../data/useOfficeTemplate";
import {
  saveOfficeContractDraft,
  type OfficeBillingMode,
  type OfficeClientMode,
  type OfficeContractContextDto,
} from "../data/officeContractRepository";
import { getCurrentStaff } from "@/lib/adminAccess";
import { dashboardRequest } from "@/lib/apiClient";
import { dashboardFeatures } from "@/config/dashboardFeatures";
import LegalDocumentSheet from "@/components/contract/LegalDocumentSheet";
import { formatWizardFieldValue, resolveWizardFieldLabel } from "../domain/contractDisplay";

type OfficeContext = Omit<OfficeContractContextDto, "createdByStaffId">;
type ClientOption = { id: number; name: string; email: string; phone?: string; whatsappNumber?: string; status: string };
type LawyerOption = { id: number; name: string; email: string; status: string };
type TemplateCatalogItem = { slug: ContractSlug; nameAr: string; description: string; priceEgp: number; version: number; variantsCount: number };

const fallbackTemplateCards: TemplateCatalogItem[] = [
  { slug: "rental", nameAr: "عقود الإيجار", description: "سكني أو تجاري أو إداري", priceEgp: 0, version: 1, variantsCount: 3 },
  { slug: "apartment_sale", nameAr: "عقود البيع", description: "ابتدائي أو قابل للتسجيل أو ميراث", priceEgp: 0, version: 1, variantsCount: 3 },
  { slug: "freelancer", nameAr: "عقود الخدمات والعمل الحر", description: "هوية بصرية، تطوير مواقع، وإدارة حسابات التواصل", priceEgp: 0, version: 2, variantsCount: 3 },
];

const defaultContext: OfficeContext = {
  clientMode: "existing",
  clientId: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  assignedLawyerId: "",
  billingMode: "office_waiver",
  waiverReason: "",
  notifyClient: true,
};

function inputClass() {
  return "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-[#986410] focus:ring-1 focus:ring-[#986410]/20";
}

export default function OfficeContractWizard() {
  const staff = getCurrentStaff();
  const canAssignLawyer = dashboardFeatures.assignment && (staff.role === "super_admin" || staff.permissions.includes("contracts.assign"));
  const canViewClients = staff.role === "super_admin" || staff.permissions.includes("clients.view");
  const [templateCatalog, setTemplateCatalog] = useState<TemplateCatalogItem[]>(fallbackTemplateCards);
  const [templateSlug, setTemplateSlug] = useState<ContractSlug>("rental");
  const { definition, loading, error } = useOfficeTemplate(templateSlug);
  const [variantKey, setVariantKey] = useState<string | null>(null);
  const [selectedOptionalClauseKeys, setSelectedOptionalClauseKeys] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, ContractFieldValue>>({});
  const [attachmentRefs, setAttachmentRefs] = useState<Record<string, string[]>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [currentStepKey, setCurrentStepKey] = useState("");
  const [officeContext, setOfficeContext] = useState<OfficeContext>(defaultContext);
  const [showContextModal, setShowContextModal] = useState(false);
  const [serial, setSerial] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSource, setSavedSource] = useState<"api" | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [previewTab, setPreviewTab] = useState<"document" | "summary">("document");
  const [activePreviewField, setActivePreviewField] = useState<{ key: string; labelAr: string } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    dashboardRequest<TemplateCatalogItem[]>("/api/v1/templates")
      .then((items) => {
        if (!active || !items.length) return;
        setTemplateCatalog(items);
        if (!items.some((item) => item.slug === templateSlug && item.variantsCount > 0)) {
          const firstAvailable = items.find((item) => item.variantsCount > 0);
          if (firstAvailable) setTemplateSlug(firstAvailable.slug);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setOptionsLoading(true);
    Promise.all([
      canViewClients ? dashboardRequest<ClientOption[]>("/api/v1/admin/users?status=active") : Promise.resolve([]),
      canAssignLawyer ? dashboardRequest<LawyerOption[]>("/api/v1/admin/team/assignable-lawyers") : Promise.resolve([]),
    ])
      .then(([clientRows, lawyerRows]) => {
        if (!active) return;
        setClients(clientRows);
        setLawyers(lawyerRows);
        if (!canAssignLawyer && staff.role === "lawyer") {
          setOfficeContext((current) => ({ ...current, assignedLawyerId: staff.id }));
        }
      })
      .catch((reason: unknown) => {
        if (active) setNotice(reason instanceof Error ? reason.message : "تعذر تحميل العملاء أو المحامين");
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });
    return () => { active = false; };
  }, [canAssignLawyer, canViewClients, staff.id, staff.role]);

  useEffect(() => {
    if (!definition) return;
    const defaultVariant = definition.variants[0]?.key ?? null;
    setVariantKey(defaultVariant);
    setSelectedOptionalClauseKeys([]);
    const firstVariant = definition.variants.find((v) => v.key === defaultVariant);
    setFieldValues(firstVariant?.defaultFieldValues ?? {});
    setCurrentStepKey(firstVariant?.steps[0]?.key ?? "");
    setSerial(null);
    setSavedSource(null);
    setSaving(false);
  }, [definition]);

  const resolved = useMemo(() => {
    if (!definition || !variantKey) return null;
    const effectiveVariantKey = definition.variants.some((v) => v.key === variantKey)
      ? variantKey
      : definition.variants[0]?.key;
    if (!effectiveVariantKey) return null;
    try {
      return resolveWizardDefinition(definition, effectiveVariantKey, selectedOptionalClauseKeys, fieldValues);
    } catch {
      return null;
    }
  }, [definition, fieldValues, selectedOptionalClauseKeys, variantKey]);

  const steps = resolved?.steps ?? [];
  const currentStepIndex = Math.max(0, steps.findIndex((step) => step.key === currentStepKey));
  const currentStep = steps[currentStepIndex];
  const activeOptionalClauses = definition?.optionalClauses.filter((clause) =>
    variantKey
      ? clause.applicableVariantKeys.includes(variantKey) &&
        definition.variants.find((variant) => variant.key === variantKey)?.allowedOptionalClauseKeys.includes(clause.key)
      : false,
  ) ?? [];

  const draft = useMemo<ContractDraftData | null>(() => {
    if (!definition) return null;
    return {
      templateSlug,
      templateVersion: definition.version,
      variantKey,
      selectedOptionalClauseKeys,
      fieldValues,
      attachmentRefs,
      currentStepKey,
      creationMode: "office_assisted",
      coreIdentityLocked: false,
      updatedAt: new Date().toISOString(),
    };
  }, [attachmentRefs, currentStepKey, definition, fieldValues, selectedOptionalClauseKeys, templateSlug, variantKey]);

  const validationIssues = useMemo(() => {
    if (!resolved || !draft) return [];
    return validateDynamicDefinition(resolved, draft);
  }, [resolved, draft]);

  const issuesByStepKey = useMemo(() => {
    const map: Record<string, typeof validationIssues> = {};
    for (const issue of validationIssues) {
      if (!map[issue.stepKey]) map[issue.stepKey] = [];
      map[issue.stepKey].push(issue);
    }
    return map;
  }, [validationIssues]);

  const progress = steps.length ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0;
  const isReviewStep = currentStep?.fields.length === 0;

  function selectTemplate(slug: ContractSlug) {
    if (slug === templateSlug) return;
    setTemplateSlug(slug);
    setVariantKey(null);
    setSelectedOptionalClauseKeys([]);
    setFieldValues({});
    setCurrentStepKey("");
    setNotice(null);
    setSavedSource(null);
    setSaving(false);
  }


  function selectVariant(key: string) {
    if (!definition) return;
    const variant = definition.variants.find((item) => item.key === key);
    if (!variant) return;
    setVariantKey(key);
    setSelectedOptionalClauseKeys([]);
    setFieldValues(variant.defaultFieldValues ?? {});
    setCurrentStepKey(variant.steps[0]?.key ?? "");
  }

  function toggleOptionalClause(key: string) {
    if (!definition) return;
    const clause = definition.optionalClauses.find((item) => item.key === key);
    setSelectedOptionalClauseKeys((current) => {
      const selected = current.includes(key);
      if (!selected && clause?.defaultFieldValues) {
        setFieldValues((values) => ({ ...clause.defaultFieldValues, ...values }));
      }
      return selected ? current.filter((item) => item !== key) : [...current, key];
    });
  }

  function goNext() {
    if (!resolved || !draft || !currentStep) return;
    const stepIssues = issuesByStepKey[currentStep.key] || [];
    if (stepIssues.length) {
      setNotice(`أكمل الحقول المطلوبة: ${stepIssues.slice(0, 3).map((issue) => issue.labelAr).join("، ")}`);
      return;
    }
    setNotice(null);
    if (currentStepIndex < steps.length - 1) setCurrentStepKey(steps[currentStepIndex + 1].key);
  }

  async function uploadFiles(fieldKey: string, files: File[]) {
    if (!files.length) return;
    setUploadingField(fieldKey);
    setNotice(null);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const body = new FormData();
        body.append("file", file, file.name);
        return dashboardRequest<{ id: number; fileName: string }>("/api/v1/attachments", { method: "POST", body });
      }));
      const ids = uploaded.map((item) => String(item.id));
      setAttachmentRefs((current) => ({ ...current, [fieldKey]: ids }));
      setFieldValues((current) => ({ ...current, [fieldKey]: ids }));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "تعذر رفع الملفات");
    } finally {
      setUploadingField(null);
    }
  }

  async function saveDraft() {
    if (!resolved || !draft || saving) return;
    const issues = validateDynamicDefinition(resolved, draft);
    setSaving(true);
    setNotice(null);
    try {
      const result = await saveOfficeContractDraft(draft, { ...officeContext, createdByStaffId: staff.id });
      setSerial(result.serialNumber);
      setSavedSource(result.source);
      setIsSuccess(true);
      if (issues.length) setNotice(`تم حفظ المسودة، وما زال بها ${issues.length} حقل يحتاج استكمالاً قبل الإصدار.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "تعذر حفظ مسودة المكتب");
    } finally {
      setSaving(false);
    }
  }

  function resetAll() {
    setOfficeContext({ ...defaultContext, assignedLawyerId: !canAssignLawyer && staff.role === "lawyer" ? staff.id : "" });
    setTemplateSlug("rental");
    setVariantKey(null);
    setSelectedOptionalClauseKeys([]);
    setFieldValues({});
    setAttachmentRefs({});
    setCurrentStepKey("");
    setIsSuccess(false);
    setSerial(null);
    setNotice(null);
    setSavedSource(null);
    setSaving(false);
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#986410]" /></div>;
  }

  if (error || !definition) {
    return <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-xs font-bold text-rose-800">{error || "تعذر تحميل القالب"}</div>;
  }

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></div>
          <h1 className="mt-4 text-xl font-black text-[#00102e]">تم إنشاء وحفظ مسودة العقد بنجاح</h1>
          <p className="mt-1 text-xs font-bold text-slate-500">الرقم المرجعي: <span className="font-mono text-[#986410] font-black">{serial}</span></p>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-right text-xs font-bold leading-6 text-slate-700">
            <div>• العميل: <span className="font-black text-[#00102e]">{officeContext.clientMode === "office_internal" ? "استخدام داخلي للمكتب" : officeContext.clientName || "عميل مسجل"}</span></div>
            <div>• القالب: <span className="font-black text-[#00102e]">{definition.nameAr} — {resolved?.variant.nameAr}</span></div>
            <div>• نظام التحصيل: <span className="font-black text-[#00102e]">{officeContext.billingMode === "client_invoice" ? "مطالبة العميل" : officeContext.billingMode === "external_collection" ? "تحصيل خارجي" : "إعفاء من الدفع (استخدام داخلي)"}</span></div>
            <div>• الملاحق: <span className="font-black text-[#00102e]">{selectedOptionalClauseKeys.length ? `${selectedOptionalClauseKeys.length} ملحق مختار` : "لا يوجد"}</span></div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/contracts" className="rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-white hover:bg-[#00102e]/90 transition">الانتقال لإدارة العقود</Link>
            <button type="button" onClick={resetAll} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition">إنشاء عقد آخر</button>
          </div>
        </div>
      </div>
    );
  }

  const contractTitle = `${definition.nameAr} — ${resolved?.variant.nameAr || ""}`;
  const displaySerial = serial || "مسودة جديدة";

  return (
    <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 lg:px-8">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/contracts" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#986410]"><ArrowRight className="h-3.5 w-3.5" /> العقود</Link>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-bold text-[#986410]">إنشاء عقد جديد من المكتب</span>
          </div>
          <h1 className="mt-1 text-base sm:text-lg font-black text-[#00102e]">{contractTitle}</h1>
        </div>

        {/* Action Controls & Context Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowContextModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#986410]/30 bg-[#986410]/10 px-3 py-1.5 text-xs font-bold text-[#00102e] hover:bg-[#986410]/20 transition"
          >
            <UserRound className="h-3.5 w-3.5 text-[#986410]" />
            <span>العميل: {officeContext.clientMode === "office_internal" ? "استخدام داخلي" : officeContext.clientName || "تحديد العميل"}</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-xs text-slate-600">
              {officeContext.billingMode === "office_waiver" ? "بدون دفع" : "مطالبة"}
            </span>
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-3 w-3" />
            بدء جديد
          </button>
        </div>
      </div>

      {notice && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold leading-5 text-amber-900">{notice}</div>}

      {/* Template & Variant Selector Bar */}
      <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_auto]">
        {/* Template Pills */}
        <div className="flex flex-wrap gap-1.5">
          {templateCatalog.map((card) => {
            const selected = templateSlug === card.slug;
            return (
              <button
                key={card.slug}
                type="button"
                onClick={() => selectTemplate(card.slug)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  selected
                    ? "border-[#986410] bg-[#00102e] text-[#d7a94f] shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#986410]/50"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{card.nameAr}</span>
              </button>
            );
          })}
        </div>

        {/* Variant Dropdown / Pills */}
        {definition.variants.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">النوع:</span>
            {definition.variants.map((v) => {
              const selected = variantKey === v.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => selectVariant(v.key)}
                  aria-pressed={selected}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    selected
                      ? "border-[#986410] bg-[#986410]/15 text-[#00102e] ring-1 ring-[#986410]/30"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {v.nameAr}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Steps Navigation Bar */}
      <div className="no-scrollbar mb-4 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xs" style={{ scrollbarWidth: "none" }}>
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStepIndex;
          const isDone = idx < currentStepIndex;
          const stepIssues = issuesByStepKey[step.key] || [];
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setCurrentStepKey(step.key)}
              aria-current={isCurrent ? "step" : undefined}
              className={`group flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                isCurrent
                  ? "bg-[#00102e] text-white shadow-xs"
                  : stepIssues.length > 0
                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                  : isDone
                  ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-xs font-black ${
                isCurrent ? "bg-[#986410] text-[#00102e]" : isDone ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {isDone ? "✓" : idx + 1}
              </span>
              <span>{step.titleAr}</span>
              {stepIssues.length > 0 && !isCurrent && (
                <span className="rounded-full bg-rose-600 px-1 py-0 text-xs text-white">!</span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN TWO-COLUMN SPLIT: RIGHT = Form, LEFT = Live A4 Document Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* ── RIGHT COLUMN: DYNAMIC FORM ── */}
        <div className="xl:col-span-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            {currentStep && !isReviewStep && (
              <>
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-bold text-[#986410]">الخطوة {currentStepIndex + 1} من {steps.length}</span>
                    <h2 className="mt-0.5 text-base font-black text-[#00102e]">{currentStep.titleAr}</h2>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{currentStep.description || currentStep.articleRange}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 font-mono">{progress}%</div>
                </div>

                {currentStep.fields.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {currentStep.fields.map((field) => (
                      <div
                        key={field.key}
                        onFocus={() => setActivePreviewField({ key: field.key, labelAr: field.labelAr })}
                        className={field.type === "textarea" || field.type === "repeater" || field.type === "attachment" ? "sm:col-span-2" : ""}
                      >
                        <DynamicFieldRenderer
                          field={field}
                          value={field.type === "attachment" ? (attachmentRefs[field.key]?.length ? [`${attachmentRefs[field.key].length} ملف مرفوع`] : []) : fieldValues[field.key]}
                          allFormValues={fieldValues}
                          onChange={(value) => {
                            setActivePreviewField({ key: field.key, labelAr: field.labelAr });
                            setFieldValues((current) => ({ ...current, [field.key]: value }));
                          }}
                          onFilesSelected={field.type === "attachment" ? (files) => uploadFiles(field.key, files) : undefined}
                          uploading={uploadingField === field.key}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs font-bold text-slate-500">
                    لا توجد حقول إدخال في هذه الخطوة.
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={currentStepIndex === 0}
                    onClick={() => currentStepIndex > 0 && setCurrentStepKey(steps[currentStepIndex - 1].key)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> السابق
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#00102e] px-5 py-2 text-xs font-black text-white hover:bg-[#00102e]/90"
                  >
                    التالي <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* Final Review & Issue Step */}
            {isReviewStep && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#00102e]">مراجعة واعتماد مسودة العقد</h2>
                    <p className="text-xs font-semibold text-slate-500">تحقق من اكتمال البيانات قبل الحفظ النهائي للمكتب</p>
                  </div>
                </div>

                {/* Optional Annexes Selector */}
                {activeOptionalClauses.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#00102e] mb-2.5">
                      <FileStack className="h-3.5 w-3.5 text-[#986410]" />
                      <span>الملاحق والبنود الاختيارية</span>
                    </div>
                    <div className="space-y-1.5">
                      {activeOptionalClauses.map((clause) => {
                        const selected = selectedOptionalClauseKeys.includes(clause.key);
                        return (
                          <button
                            key={clause.key}
                            type="button"
                            onClick={() => toggleOptionalClause(clause.key)}
                            className={`w-full rounded-lg border p-2.5 text-right transition flex items-center justify-between gap-2.5 ${
                              selected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold text-[#00102e]">{clause.nameAr}</div>
                              <div className="text-xs font-semibold text-slate-500">{clause.description}</div>
                            </div>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                              selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              {selected ? "مختار ✓" : "غير مفعّل"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Validation Summary */}
                {validationIssues.length > 0 ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs">
                    <div className="font-bold text-rose-800 mb-1.5">توجد {validationIssues.length} بيانات مطلوبة تحتاج استكمالاً:</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {validationIssues.map((issue, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const target = steps.find((s) => s.key === issue.stepKey);
                            if (target) setCurrentStepKey(target.key);
                          }}
                          className="w-full text-right flex items-center justify-between rounded-md bg-white border border-rose-200 p-2 text-[10.5px] font-bold text-rose-900 hover:bg-rose-100/70"
                        >
                          <span>{issue.labelAr}</span>
                          <span className="text-rose-600">الانتقال للحقل ←</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>كافة الحقول والبيانات الأساسية مكتملة ومطابقة للقالب القانوني.</span>
                  </div>
                )}

                {/* Save Draft CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStepKey(steps[currentStepIndex - 1]?.key || steps[0]?.key)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> السابق
                  </button>
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-6 py-2.5 text-xs font-black text-[#d7a94f] shadow-md hover:bg-[#00102e]/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5 text-[#986410]" />}
                    {saving ? "جارٍ الحفظ..." : "حفظ مسودة العقد للمكتب"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── LEFT COLUMN: LIVE A4 LEGAL DOCUMENT PREVIEW ── */}
        <div className="xl:col-span-6 space-y-3">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#00102e] px-3.5 py-2 text-white">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab("document")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    previewTab === "document" ? "bg-[#986410] text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
                  }`}
                >
                  <FileText className="h-3 w-3" />
                  ورقة العقد الحية (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("summary")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    previewTab === "summary" ? "bg-[#986410] text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  ملخص البنود
                </button>
              </div>

              <span className="flex max-w-[50%] items-center gap-1 rounded-full border border-[#986410]/30 bg-[#986410]/20 px-2 py-0.5 text-xs font-bold text-[#d7a94f]">
                <Zap className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{activePreviewField ? `تعديل: ${activePreviewField.labelAr}` : "تحديث حي مباشر"}</span>
              </span>
            </div>

            {/* Document Content */}
            {previewTab === "document" ? (
              <div className="overflow-hidden bg-slate-100/70 p-3 max-h-[calc(100vh-140px)] overflow-y-auto">
                <LegalDocumentSheet
                  serialNumber={displaySerial}
                  templateSlug={templateSlug}
                  variantKey={variantKey}
                  selectedOptionalClauseKeys={selectedOptionalClauseKeys}
                  templateNameAr={contractTitle}
                  fieldValues={fieldValues}
                  status="draft"
                  activeFieldKey={activePreviewField?.key}
                  activeFieldLabel={activePreviewField?.labelAr}
                />
              </div>
            ) : (
              <div className="p-4 space-y-3 text-xs leading-relaxed max-h-[calc(100vh-140px)] overflow-y-auto" dir="rtl">
                <div className="text-center pb-3 border-b-2 border-[#00102e]">
                  <div className="text-xs text-[#986410] font-bold uppercase tracking-widest">منصة Z draft — مكتب المحاماة</div>
                  <h3 className="text-sm font-black text-[#00102e] mt-0.5">{contractTitle}</h3>
                  <p className="text-xs text-slate-500 font-mono">{displaySerial}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="font-bold text-[#00102e] mb-2 text-xs">البيانات المدخلة في العقد:</div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {Object.entries(fieldValues).length ? (
                      Object.entries(fieldValues).map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-slate-200 bg-white p-2">
                          <div className="text-[8.5px] font-bold text-slate-500">{k}</div>
                          <div className="mt-0.5 text-[10.5px] font-bold text-[#00102e] break-words">{String(v ?? "—")}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-xs">ابدأ بإدخال البيانات لتظهر هنا.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Modal (Client & Billing Assignment) */}
      {showContextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-[#986410]" />
                <h3 className="text-sm font-black text-[#00102e]">تخصيص العميل وسياق العقد</h3>
              </div>
              <button type="button" onClick={() => setShowContextModal(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">✕</button>
            </div>

            <div className="mt-3.5 space-y-3.5 text-xs font-bold">
              <div>
                <label className="mb-1.5 block text-slate-700 text-xs">إنشاء العقد لصالح</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    ["existing", "عميل مسجل"],
                    ["new", "عميل غير مسجل"],
                    ["office_internal", "استخدام داخلي"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setOfficeContext((cur) => ({ ...cur, clientMode: value, clientId: "", clientName: "" }))}
                      aria-pressed={officeContext.clientMode === value}
                      className={`min-h-10 rounded-lg border px-3 py-2 text-center font-bold transition text-xs ${
                        officeContext.clientMode === value ? "border-[#986410] bg-[#986410]/10 text-[#00102e]" : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {officeContext.clientMode === "existing" && (
                <div>
                  <label className="mb-1 block text-slate-700 text-xs">اختر العميل المسجل</label>
                  <select
                    disabled={optionsLoading}
                    aria-label="اختر العميل المسجل"
                    className={inputClass()}
                    value={officeContext.clientId}
                    onChange={(e) => {
                      const sel = clients.find((c) => String(c.id) === e.target.value);
                      setOfficeContext((cur) => ({
                        ...cur,
                        clientId: e.target.value,
                        clientName: sel?.name ?? "",
                        clientPhone: sel?.phone ?? sel?.whatsappNumber ?? "",
                        clientEmail: sel?.email ?? "",
                      }));
                    }}
                  >
                    <option value="">{optionsLoading ? "جارٍ التحميل..." : "اختر عميلاً من القائمة"}</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
                  </select>
                </div>
              )}

              {officeContext.clientMode === "new" && (
                <div className="space-y-2.5">
                  <div><label className="mb-1 block text-slate-700 text-xs">اسم العميل *</label><input aria-label="اسم العميل" className={inputClass()} value={officeContext.clientName} onChange={(e) => setOfficeContext((cur) => ({ ...cur, clientName: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-slate-700 text-xs">رقم الهاتف / واتساب</label><input aria-label="رقم الهاتف أو واتساب" dir="ltr" className={inputClass()} value={officeContext.clientPhone} onChange={(e) => setOfficeContext((cur) => ({ ...cur, clientPhone: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-slate-700 text-xs">البريد الإلكتروني</label><input aria-label="البريد الإلكتروني" dir="ltr" type="email" className={inputClass()} value={officeContext.clientEmail} onChange={(e) => setOfficeContext((cur) => ({ ...cur, clientEmail: e.target.value }))} /></div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-slate-700 text-xs">سياسة التحصيل</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    ["office_waiver", "بدون دفع (إعفاء)"],
                    ["external_collection", "تحصيل خارجي"],
                    ["client_invoice", "مطالبة العميل"],
                  ] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setOfficeContext((cur) => ({ ...cur, billingMode: v as OfficeBillingMode }))}
                      aria-pressed={officeContext.billingMode === v}
                      className={`min-h-10 rounded-lg border px-3 py-2 text-center font-bold transition text-xs ${
                        officeContext.billingMode === v ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {officeContext.billingMode === "office_waiver" && officeContext.clientMode !== "office_internal" && (
                <div>
                  <label className="mb-1 block text-slate-700 text-xs">سبب الإعفاء (يُسجل في سجل النظام)</label>
                  <input aria-label="سبب الإعفاء" className={inputClass()} value={officeContext.waiverReason} onChange={(e) => setOfficeContext((cur) => ({ ...cur, waiverReason: e.target.value }))} placeholder="مثال: تم التحصيل كاش في المقر" />
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowContextModal(false)}
                className="rounded-xl bg-[#00102e] px-5 py-2 text-xs font-bold text-white hover:bg-[#00102e]/90"
              >
                تطبيق ومتابعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
