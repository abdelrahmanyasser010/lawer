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
  CircleDollarSign,
  FileStack,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  UserRound,
  UsersRound,
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

type OfficeContext = Omit<OfficeContractContextDto, "createdByStaffId">;
type ClientOption = { id: number; name: string; email: string; phone?: string; whatsappNumber?: string; status: string };
type LawyerOption = { id: number; name: string; email: string; status: string };
type TemplateCatalogItem = { slug: ContractSlug; nameAr: string; description: string; priceEgp: number; version: number; variantsCount: number };

const fallbackTemplateCards: TemplateCatalogItem[] = [
  { slug: "rental", nameAr: "عقود الإيجار", description: "سكني أو تجاري أو إداري", priceEgp: 0, version: 1, variantsCount: 3 },
  { slug: "apartment_sale", nameAr: "عقود البيع", description: "ابتدائي أو قابل للتسجيل أو ميراث", priceEgp: 0, version: 1, variantsCount: 3 },
  { slug: "freelancer", nameAr: "عقود الخدمات والعمل الحر", description: "هوية بصرية، تطوير مواقع، وإدارة حسابات التواصل", priceEgp: 59, version: 2, variantsCount: 3 },
];

const defaultContext: OfficeContext = {
  clientMode: "existing",
  clientId: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  assignedLawyerId: "",
  billingMode: "office_waiver",
  waiverReason: "خدمة داخلية للمكتب",
  notifyClient: true,
};

function inputClass() {
  return "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-[#986410] focus:ring-2 focus:ring-[#986410]/15";
}

export default function OfficeContractWizard() {
  const staff = getCurrentStaff();
  const canAssignLawyer = staff.role === "super_admin" || staff.permissions.includes("contracts.assign");
  const canViewClients = staff.role === "super_admin" || staff.permissions.includes("clients.view");
  const [templateCatalog, setTemplateCatalog] = useState<TemplateCatalogItem[]>(fallbackTemplateCards);
  const [templateSlug, setTemplateSlug] = useState<ContractSlug>("rental");
  const { definition, origin, loading, error } = useOfficeTemplate(templateSlug);
  const [variantKey, setVariantKey] = useState<string | null>(null);
  const [selectedOptionalClauseKeys, setSelectedOptionalClauseKeys] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, ContractFieldValue>>({});
  const [attachmentRefs, setAttachmentRefs] = useState<Record<string, string[]>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [currentStepKey, setCurrentStepKey] = useState("");
  const [officeContext, setOfficeContext] = useState<OfficeContext>(defaultContext);
  const [stage, setStage] = useState<"context" | "contract" | "success">("context");
  const [serial, setSerial] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSource, setSavedSource] = useState<"api" | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

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
      .catch(() => {
        // The shared catalog keeps the demo usable until PostgreSQL is running.
      });
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
    const onlyVariant = definition.variants.length === 1 ? definition.variants[0] : null;
    setVariantKey(onlyVariant?.key ?? null);
    setSelectedOptionalClauseKeys([]);
    setFieldValues(onlyVariant?.defaultFieldValues ?? {});
    setCurrentStepKey(onlyVariant?.steps[0]?.key ?? "");
    setStage("context");
    setSerial(null);
    setSavedSource(null);
    setSaving(false);
  }, [definition]);

  const resolved = useMemo(() => {
    if (!definition || !variantKey) return null;
    return resolveWizardDefinition(definition, variantKey, selectedOptionalClauseKeys, fieldValues);
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

  const progress = steps.length ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0;

  function selectTemplate(slug: ContractSlug) {
    setTemplateSlug(slug);
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

  function continueFromContext() {
    if (officeContext.clientMode === "existing" && !officeContext.clientId) {
      setNotice("اختر عميلًا مسجلًا من القائمة.");
      return;
    }
    if (officeContext.clientMode === "new" && !officeContext.clientName.trim()) {
      setNotice("أدخل اسم العميل الجديد.");
      return;
    }
    if (officeContext.billingMode === "office_waiver" && !officeContext.waiverReason.trim()) {
      setNotice("سبب الإعفاء مطلوب للحفظ في سجل التدقيق.");
      return;
    }
    setNotice(null);
    setStage("contract");
  }

  function goNext() {
    if (!resolved || !draft || !currentStep) return;
    const stepIssues = validateDynamicDefinition(resolved, draft).filter((issue) => issue.stepKey === currentStep.key);
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر رفع الملفات");
    } finally {
      setUploadingField(null);
    }
  }

  async function saveDraft() {
    if (!resolved || !draft || saving) return;
    const issues = validateDynamicDefinition(resolved, draft);
    if (issues.length) {
      const first = issues[0];
      setCurrentStepKey(first.stepKey);
      setNotice(`لا يمكن حفظ المسودة قبل استكمال: ${first.labelAr}`);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const result = await saveOfficeContractDraft(draft, { ...officeContext, createdByStaffId: staff.id });
      setSerial(result.serialNumber);
      setSavedSource(result.source);
      setStage("success");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ مسودة المكتب");
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
    setStage("context");
    setSerial(null);
    setNotice(null);
    setSavedSource(null);
    setSaving(false);
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#986410]" /></div>;
  }

  if (error || !definition) {
    return <div className="m-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">{error || "تعذر تحميل القالب"}</div>;
  }

  if (stage === "success") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-9 w-9" /></div>
          <h1 className="mt-5 text-2xl font-black text-[#00102e]">تم تجهيز مسودة المكتب</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">الرقم المرجعي: <span className="font-mono text-[#986410]">{serial}</span></p>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right text-xs font-bold leading-7 text-slate-600">
            <div>العميل: {officeContext.clientMode === "office_internal" ? "استخدام داخلي للمكتب" : officeContext.clientName}</div>
            <div>القالب: {definition.nameAr} — {resolved?.variant.nameAr}</div>
            <div>التحصيل: {officeContext.billingMode === "client_invoice" ? "بانتظار فاتورة العميل" : "بدون دفع داخل المنصة"}</div>
            <div>الملاحق: {selectedOptionalClauseKeys.length ? selectedOptionalClauseKeys.length : "لا يوجد"}</div>
            <div>الحفظ: {savedSource === "api" ? "تم عبر API وقاعدة البيانات" : "جارٍ التأكيد"}</div>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/contracts" className="rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-white">العودة للعقود</Link>
            <button type="button" onClick={resetAll} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black text-slate-700">إنشاء عقد آخر</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/contracts" className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-[#986410]"><ArrowRight className="h-4 w-4" /> إدارة العقود</Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-[#00102e] sm:text-3xl">إنشاء عقد من مكتب المحاماة</h1>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-800">بدون انتحال حساب العميل</span>
          </div>
          <p className="mt-2 max-w-3xl text-xs font-semibold leading-6 text-slate-500">يستخدم نفس تعريفات القوالب والـVariants والملاحق الموجودة في واجهة العميل، مع سياق تشغيلي خاص بالمكتب وسجل إعفاء واضح.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-500">
          <ShieldCheck className="h-4 w-4 text-[#986410]" /> مصدر القالب: {origin === "api" ? "API" : "Shared Engine"} — إصدار {definition.version}
        </div>
      </div>

      {notice && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black leading-6 text-amber-900">{notice}</div>}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {templateCatalog.map((card) => {
          const available = card.variantsCount > 0;
          const selected = templateSlug === card.slug;
          return (
            <button key={card.slug} type="button" disabled={!available} onClick={() => selectTemplate(card.slug)} className={`rounded-2xl border p-4 text-right transition ${selected ? "border-[#986410] bg-[#986410]/5 ring-2 ring-[#986410]/15" : "border-slate-200 bg-white hover:border-[#986410]/40"} disabled:cursor-not-allowed disabled:opacity-50`}>
              <div className="flex items-center justify-between gap-3"><FileText className="h-5 w-5 text-[#986410]" />{selected && <Check className="h-5 w-5 text-emerald-600" />}</div>
              <h2 className="mt-3 text-sm font-black text-[#00102e]">{card.nameAr}</h2>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">{card.description}</p>
            </button>
          );
        })}
      </div>

      {stage === "context" ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-5 flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00102e] text-[#986410]"><UserRound className="h-5 w-5" /></div><div><h2 className="text-base font-black text-[#00102e]">سياق إنشاء العقد</h2><p className="mt-1 text-xs font-semibold text-slate-500">حدد صاحب العقد، المحامي المسؤول، وسياسة التحصيل قبل بدء البيانات القانونية.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="mb-2 block text-xs font-black text-slate-700">إنشاء العقد لصالح</label><div className="grid gap-2 sm:grid-cols-3">{([
                ["existing", "عميل موجود"], ["new", "عميل جديد"], ["office_internal", "استخدام داخلي للمكتب"],
              ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setOfficeContext((current) => ({ ...current, clientMode: value as OfficeClientMode, clientId: "", clientName: "", clientPhone: "", clientEmail: "" }))} className={`rounded-xl border px-3 py-3 text-xs font-black ${officeContext.clientMode === value ? "border-[#986410] bg-[#986410]/5 text-[#00102e]" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{label}</button>)}</div></div>
              {officeContext.clientMode === "existing" && <div className="sm:col-span-2"><label className="mb-1 block text-xs font-black text-slate-700">العميل المسجل *</label><select disabled={optionsLoading} className={inputClass()} value={officeContext.clientId} onChange={(event) => { const selected = clients.find((client) => String(client.id) === event.target.value); setOfficeContext((current) => ({ ...current, clientId: event.target.value, clientName: selected?.name ?? "", clientPhone: selected?.phone ?? selected?.whatsappNumber ?? "", clientEmail: selected?.email ?? "" })); }}><option value="">{optionsLoading ? "جارٍ تحميل العملاء..." : "اختر العميل"}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} — {client.email}</option>)}</select></div>}
              {officeContext.clientMode === "new" && <>
                <div><label className="mb-1 block text-xs font-black text-slate-700">اسم العميل *</label><input className={inputClass()} value={officeContext.clientName} onChange={(event) => setOfficeContext((current) => ({ ...current, clientName: event.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-black text-slate-700">رقم واتساب</label><input dir="ltr" className={inputClass()} value={officeContext.clientPhone} onChange={(event) => setOfficeContext((current) => ({ ...current, clientPhone: event.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-black text-slate-700">البريد الإلكتروني</label><input dir="ltr" type="email" className={inputClass()} value={officeContext.clientEmail} onChange={(event) => setOfficeContext((current) => ({ ...current, clientEmail: event.target.value }))} /></div>
              </>}
              {officeContext.clientMode === "existing" && officeContext.clientId && <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">{officeContext.clientName} — {officeContext.clientEmail || officeContext.clientPhone || "بيانات التواصل غير مكتملة"}</div>}
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-black text-slate-700">المحامي المسؤول</label>{canAssignLawyer ? <select disabled={optionsLoading} className={inputClass()} value={officeContext.assignedLawyerId} onChange={(event) => setOfficeContext((current) => ({ ...current, assignedLawyerId: event.target.value }))}><option value="">يُسند لاحقًا</option>{lawyers.map((lawyer) => <option key={lawyer.id} value={lawyer.id}>{lawyer.name} — {lawyer.email}</option>)}</select> : <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-700">{staff.role === "lawyer" ? `${staff.name} — مسند إليك تلقائيًا` : "يُسند لاحقًا بواسطة إدارة التشغيل"}</div>}</div>
              <div className="sm:col-span-2"><label className="mb-2 block text-xs font-black text-slate-700">سياسة التحصيل</label><div className="grid gap-2 md:grid-cols-3">{([
                ["office_waiver", "إعفاء موثق"], ["external_collection", "تم التحصيل خارج المنصة"], ["client_invoice", "إرسال فاتورة للعميل"],
              ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setOfficeContext((current) => ({ ...current, billingMode: value as OfficeBillingMode }))} className={`rounded-xl border px-3 py-3 text-xs font-black ${officeContext.billingMode === value ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{label}</button>)}</div></div>
              {officeContext.billingMode === "office_waiver" && <div className="sm:col-span-2"><label className="mb-1 block text-xs font-black text-slate-700">سبب الإعفاء الذي سيظهر في سجل التدقيق *</label><input className={inputClass()} value={officeContext.waiverReason} onChange={(event) => setOfficeContext((current) => ({ ...current, waiverReason: event.target.value }))} /></div>}
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 sm:col-span-2"><input type="checkbox" checked={officeContext.notifyClient} onChange={(event) => setOfficeContext((current) => ({ ...current, notifyClient: event.target.checked }))} className="h-4 w-4 accent-[#986410]" /> إرسال إشعار للعميل عند حفظ المسودة أو طلب بيانات منه</label>
            </div>
          </section>
          <aside className="rounded-2xl border border-[#986410]/25 bg-[#00102e] p-6 text-white shadow-sm"><BriefcaseBusiness className="h-7 w-7 text-[#986410]" /><h2 className="mt-4 text-base font-black">ضوابط الإنتاج</h2><div className="mt-4 space-y-3 text-xs font-semibold leading-6 text-slate-300"><p>• كل موظف يعمل بحسابه، ولا يتم الدخول بحساب العميل.</p><p>• الإعفاء لا يحذف السعر؛ يسجل سببًا وهوية صاحب القرار.</p><p>• العقد يظل مسودة حتى المراجعة والاعتماد وفق الصلاحية.</p><p>• تعديل العقد بعد القفل ينشئ إصدارًا جديدًا، وليس استبدالًا صامتًا.</p></div><button type="button" onClick={continueFromContext} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#986410] px-4 py-3 text-xs font-black text-white">متابعة إلى القالب <ArrowLeft className="h-4 w-4" /></button></aside>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-xs font-black text-[#00102e]">نوع الصيغة</h2><div className="mt-3 space-y-2">{definition.variants.map((variant) => <button key={variant.key} type="button" onClick={() => selectVariant(variant.key)} className={`w-full rounded-xl border p-3 text-right ${variantKey === variant.key ? "border-[#986410] bg-[#986410]/5" : "border-slate-200 bg-slate-50"}`}><span className="block text-xs font-black text-[#00102e]">{variant.nameAr}</span><span className="mt-1 block text-[10px] font-semibold leading-5 text-slate-500">{variant.description}</span></button>)}</div></section>
            {activeOptionalClauses.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><FileStack className="h-4 w-4 text-[#986410]" /><h2 className="text-xs font-black text-[#00102e]">ملاحق مستقلة</h2></div><div className="mt-3 space-y-2">{activeOptionalClauses.map((clause) => { const selected = selectedOptionalClauseKeys.includes(clause.key); return <button key={clause.key} type="button" onClick={() => toggleOptionalClause(clause.key)} className={`w-full rounded-xl border p-3 text-right ${selected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><span className="flex items-center gap-2 text-xs font-black text-[#00102e]">{selected && <Check className="h-4 w-4 text-emerald-600" />}{clause.nameAr}</span><span className="mt-1 block text-[10px] font-semibold leading-5 text-slate-500">{clause.description}</span></button>; })}</div></section>}
          </aside>

          <main className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {!variantKey ? <div className="py-16 text-center"><UsersRound className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-4 text-sm font-black text-[#00102e]">اختر نوع العقد من القائمة</h2></div> : currentStep ? <>
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><span className="text-[10px] font-black text-[#986410]">الخطوة {currentStepIndex + 1} من {steps.length}</span><h2 className="mt-1 text-lg font-black text-[#00102e]">{currentStep.titleAr}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{currentStep.description || currentStep.articleRange}</p></div><div className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600">{progress}%</div></div>
              {currentStep.fields.length ? <div className="grid gap-4 sm:grid-cols-2">{currentStep.fields.map((field) => <div key={field.key} className={field.type === "textarea" || field.type === "repeater" || field.type === "attachment" ? "sm:col-span-2" : ""}><DynamicFieldRenderer field={field} value={field.type === "attachment" ? (attachmentRefs[field.key]?.length ? [`${attachmentRefs[field.key].length} ملف مرفوع`] : []) : fieldValues[field.key]} onChange={(value) => setFieldValues((current) => ({ ...current, [field.key]: value }))} onFilesSelected={field.type === "attachment" ? (files) => uploadFiles(field.key, files) : undefined} uploading={uploadingField === field.key} /></div>)}</div> : <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs font-bold text-slate-500">لا توجد حقول إدخال في هذه الخطوة.</div>}
              <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5"><button type="button" disabled={currentStepIndex === 0} onClick={() => currentStepIndex > 0 && setCurrentStepKey(steps[currentStepIndex - 1].key)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 disabled:opacity-40"><ArrowRight className="h-4 w-4" /> السابق</button>{currentStepIndex === steps.length - 1 ? <button type="button" onClick={saveDraft} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white disabled:cursor-wait disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} {saving ? "جارٍ الحفظ..." : "حفظ مسودة المكتب"}</button> : <button type="button" onClick={goNext} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-white">التالي <ArrowLeft className="h-4 w-4" /></button>}</div>
            </> : null}
          </main>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#986410]" /><h2 className="text-xs font-black text-[#00102e]">ملخص التشغيل</h2></div><div className="mt-4 space-y-3 text-xs font-bold text-slate-600"><div className="flex justify-between gap-3"><span>العميل</span><span className="text-left text-[#00102e]">{officeContext.clientMode === "office_internal" ? "المكتب" : officeContext.clientName || "غير محدد"}</span></div><div className="flex justify-between gap-3"><span>المحامي</span><span className="text-left text-[#00102e]">{officeContext.assignedLawyerId ? "مسند" : "لاحقًا"}</span></div><div className="flex justify-between gap-3"><span>الدفع</span><span className="text-left text-[#00102e]">{officeContext.billingMode === "client_invoice" ? "فاتورة" : "لا يوجد دفع داخل المنصة"}</span></div><div className="flex justify-between gap-3"><span>القالب</span><span className="text-left text-[#00102e]">{resolved?.variant.nameAr || "—"}</span></div></div><button type="button" onClick={() => setStage("context")} className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600">تعديل سياق الطلب</button></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-emerald-600" /><h2 className="text-xs font-black text-[#00102e]">قاعدة الإعفاء</h2></div><p className="mt-3 text-[11px] font-semibold leading-6 text-slate-500">لا يتم حذف القيمة الأصلية من السجل. يسجل النظام السعر، قرار الإعفاء، السبب، ومن نفّذه.</p></section>
            <button type="button" onClick={resetAll} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-500"><RotateCcw className="h-4 w-4" /> بدء جديد</button>
          </aside>
        </div>
      )}
    </div>
  );
}
