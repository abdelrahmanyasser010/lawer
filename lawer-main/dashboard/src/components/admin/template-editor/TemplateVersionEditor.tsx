"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Eye,
  FilePlus2,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  createSampleFieldValues,
  type AtomicConditionDefinition,
  type ConditionDefinition,
  type ContractFieldValue,
  type ContractTemplateDefinition,
  type ContractVariantDefinition,
  type LegalClauseDefinition,
  type OptionalClauseDefinition,
  type TemplateDefinitionInspection,
  type WizardFieldDefinition,
  type WizardStepDefinition,
} from "@zdraft/template-engine";
import { ChangeEvent, FormEvent, MouseEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { dashboardRequest } from "@/lib/apiClient";
import { hasBackendPermission } from "@/lib/adminAccess";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { useAdminConfirm } from "@/components/admin/AdminDialog";

type Version = {
  id: number;
  templateId: number;
  versionNumber: number;
  status: string;
  definition: ContractTemplateDefinition;
  changeSummary?: string;
  legalReference?: string;
  effectiveFrom?: string;
};

type PreviewResult = {
  clauses: Array<{ key: string; titleAr: string; bodyAr: string }>;
  missingVariables: string[];
  missingClauseKeys: string[];
  definitionVersion: number;
};

type ModalState =
  | { kind: "variant"; value?: ContractVariantDefinition }
  | { kind: "step"; variantKey: string; value?: WizardStepDefinition }
  | { kind: "field"; variantKey: string; stepKey: string; value?: WizardFieldDefinition }
  | { kind: "clause"; value?: LegalClauseDefinition }
  | { kind: "optional"; value?: OptionalClauseDefinition }
  | null;

type TabKey = "structure" | "clauses" | "optional" | "preview" | "validation";

const fieldTypeLabels: Record<WizardFieldDefinition["type"], string> = {
  text: "نص قصير",
  textarea: "نص طويل",
  number: "رقم",
  money: "مبلغ مالي",
  date: "تاريخ",
  select: "قائمة اختيار",
  radio: "اختيار واحد",
  checkbox: "إقرار / علامة اختيار",
  attachment: "رفع ملف",
  repeater: "جدول متكرر",
};

const conditionOperators = [
  ["equals", "يساوي"],
  ["not_equals", "لا يساوي"],
  ["truthy", "مفعّل / نعم"],
  ["falsy", "غير مفعّل / لا"],
  ["includes", "يحتوي على"],
] as const;

const conditionOperatorKeys = new Set<string>(conditionOperators.map(([key]) => key));

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConditionDefinition(value: unknown): value is ConditionDefinition {
  if (!isPlainRecord(value)) return false;
  if ("fieldKey" in value) {
    return typeof value.fieldKey === "string" && typeof value.operator === "string" && conditionOperatorKeys.has(value.operator);
  }
  if ("all" in value) return Array.isArray(value.all) && value.all.every(isConditionDefinition);
  if ("any" in value) return Array.isArray(value.any) && value.any.every(isConditionDefinition);
  if ("not" in value) return isConditionDefinition(value.not);
  return false;
}

function splitCsv(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[،,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalText(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T, label: string): T {
  const text = String(raw ?? "").trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label}: صيغة JSON غير صحيحة`);
  }
}

function optionsText(field?: WizardFieldDefinition): string {
  return (field?.options ?? []).map((item) => `${item.value}|${item.labelAr}`).join("\n");
}

function parseOptions(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...labelParts] = line.split("|");
      const labelAr = labelParts.join("|").trim();
      if (!value?.trim() || !labelAr) throw new Error("كل خيار يجب أن يكون بالشكل value|الاسم العربي");
      return { value: value.trim(), labelAr };
    });
}

function buildCondition(form: FormData): ConditionDefinition | undefined {
  const fieldKey = optionalText(form.get("conditionFieldKey"));
  if (!fieldKey) {
    const existingComposite = optionalText(form.get("existingCompositeCondition"));
    if (!existingComposite) return undefined;
    try {
      const parsed: unknown = JSON.parse(existingComposite);
      return isConditionDefinition(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  const operator = String(form.get("conditionOperator") || "equals") as "equals" | "not_equals" | "truthy" | "falsy" | "includes";
  const rawValue = optionalText(form.get("conditionValue"));
  return {
    fieldKey,
    operator,
    ...(["truthy", "falsy"].includes(operator) ? {} : { value: rawValue ?? "" }),
  };
}

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-black text-[#00102e]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormActions({ busy, onCancel, submitLabel = "حفظ" }: { busy: boolean; onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
      <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">إلغاء</button>
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d5a84c] disabled:opacity-50">
        <Save className="h-4 w-4" />{busy ? "جاري الحفظ..." : submitLabel}
      </button>
    </div>
  );
}

function FieldBadge({ field }: { field: WizardFieldDefinition }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{fieldTypeLabels[field.type]}</span>
      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${field.required ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}`}>
        {field.required ? "إجباري" : "اختياري"}
      </span>
      {field.visibleWhen && <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800">شرطي</span>}
    </div>
  );
}

export default function TemplateVersionEditor({ versionId }: { versionId: string }) {
  const [version, setVersion] = useState<Version | null>(null);
  const [inspection, setInspection] = useState<TemplateDefinitionInspection | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("structure");
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [clauseSearch, setClauseSearch] = useState("");
  const [previewVariant, setPreviewVariant] = useState("");
  const [previewOptionals, setPreviewOptionals] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [returnReviewOpen, setReturnReviewOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const { confirm, dialog: confirmDialog } = useAdminConfirm();

  const load = useCallback(async () => {
    setError("");
    try {
      const [loaded, validation] = await Promise.all([
        dashboardRequest<Version>(`/api/v1/admin/templates/versions/${versionId}`),
        dashboardRequest<TemplateDefinitionInspection>(`/api/v1/admin/templates/versions/${versionId}/validation`),
      ]);
      setVersion(loaded);
      setInspection(validation);
      setPreviewVariant((current) => current || loaded.definition.variants[0]?.key || "");
      setExpandedVariants((current) => Object.keys(current).length ? current : Object.fromEntries(loaded.definition.variants.slice(0, 1).map((item) => [item.key, true])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل إصدار القالب");
    }
  }, [versionId]);

  useEffect(() => {
    setCanEdit(hasBackendPermission("templates.edit", "templates.manage"));
    setCanPublish(hasBackendPermission("templates.publish", "templates.manage"));
    void load();
  }, [load]);

  const readOnly = version?.status !== "draft" || !canEdit;
  const allFieldKeys = useMemo(() => {
    if (!version) return [];
    return [...new Set(version.definition.variants.flatMap((variant) => variant.steps.flatMap((step) => step.fields.map((field) => field.key))))].sort();
  }, [version]);

  async function mutate(path: string, init: RequestInit, successMessage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await dashboardRequest(path, init);
      setModal(null);
      setNotice(successMessage);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تنفيذ الإجراء");
    } finally {
      setBusy(false);
    }
  }

  async function saveReviewMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    await mutate(`/api/v1/admin/templates/versions/${version.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        definition: version.definition,
        changeSummary: form.get("changeSummary"),
        legalReference: form.get("legalReference"),
        effectiveFrom: form.get("effectiveFrom") || undefined,
      }),
    }, "تم حفظ بيانات المراجعة");
  }

  async function submitForReview() {
    if (!version || !canEdit || version.status !== "draft") return;
    if (!await confirm({ title: "إرسال للمراجعة القانونية", message: "بعد الإرسال سيتوقف تعديل هذه المسودة حتى تعود من المراجعة. هل تريد المتابعة؟", confirmLabel: "إرسال للمراجعة" })) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/submit-review`, { method: "POST" }, "تم إرسال الإصدار للمراجعة القانونية");
  }

  async function returnToDraft() {
    if (!version || !canPublish || version.status !== "legal_review" || !returnReason.trim()) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/return-draft`, { method: "POST", body: JSON.stringify({ reason: returnReason.trim() }) }, "أعيد الإصدار للتعديل");
    setReturnReviewOpen(false);
    setReturnReason("");
  }

  async function publish() {
    if (!version || !canPublish || version.status !== "legal_review") return;
    if (!await confirm({ title: "اعتماد ونشر الإصدار", message: "سيُستخدم هذا الإصدار للعقود الجديدة فقط، ولن تتغير العقود السابقة.", confirmLabel: "اعتماد ونشر" })) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/publish`, { method: "POST" }, "تم اعتماد الإصدار ونشره");
  }

  async function submitVariant(event: FormEvent<HTMLFormElement>, value?: ContractVariantDefinition) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    const variant = {
      key: value?.key ?? String(form.get("key") || "").trim(),
      nameAr: String(form.get("nameAr") || "").trim(),
      description: String(form.get("description") || "").trim(),
      documentTitleAr: optionalText(form.get("documentTitleAr")),
      sourceDocumentName: optionalText(form.get("sourceDocumentName")),
      requiredClauseKeys: splitCsv(form.get("requiredClauseKeys")),
      allowedOptionalClauseKeys: splitCsv(form.get("allowedOptionalClauseKeys")),
      defaultFieldValues: parseJson<Record<string, ContractFieldValue>>(form.get("defaultFieldValues"), value?.defaultFieldValues ?? {}, "القيم الافتراضية"),
      steps: value?.steps ?? [],
    };
    await mutate(
      value ? `/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(value.key)}` : `/api/v1/admin/templates/versions/${version.id}/variants`,
      { method: value ? "PATCH" : "POST", body: JSON.stringify({ variant }) },
      value ? "تم تعديل نوع العقد" : "تمت إضافة نوع العقد",
    );
  }

  async function submitStep(event: FormEvent<HTMLFormElement>, variantKey: string, value?: WizardStepDefinition) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    const step = {
      key: value?.key ?? String(form.get("key") || "").trim(),
      titleAr: String(form.get("titleAr") || "").trim(),
      articleRange: optionalText(form.get("articleRange")),
      description: optionalText(form.get("description")),
      sourceClauseKey: optionalText(form.get("sourceClauseKey")),
      visibleWhen: buildCondition(form),
      fields: value?.fields ?? [],
    };
    await mutate(
      value
        ? `/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variantKey)}/steps/${encodeURIComponent(value.key)}`
        : `/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variantKey)}/steps`,
      { method: value ? "PATCH" : "POST", body: JSON.stringify({ step }) },
      value ? "تم تعديل الخطوة" : "تمت إضافة الخطوة",
    );
  }

  async function submitField(event: FormEvent<HTMLFormElement>, variantKey: string, stepKey: string, value?: WizardFieldDefinition) {
    event.preventDefault();
    if (!version) return;
    try {
      const form = new FormData(event.currentTarget);
      const type = String(form.get("type")) as WizardFieldDefinition["type"];
      const options = parseOptions(form.get("options"));
      const field: WizardFieldDefinition = {
        key: value?.key ?? String(form.get("key") || "").trim(),
        type,
        labelAr: String(form.get("labelAr") || "").trim(),
        placeholder: optionalText(form.get("placeholder")),
        helpText: optionalText(form.get("helpText")),
        required: form.get("required") === "on",
        ...(options.length ? { options } : {}),
        ...(type === "repeater" ? { columns: parseJson(form.get("columns"), value?.columns ?? [], "أعمدة الجدول"), minRows: Number(form.get("minRows") || 0) || undefined } : {}),
        validation: {
          ...(form.get("min") !== "" ? { min: Number(form.get("min")) } : {}),
          ...(form.get("max") !== "" ? { max: Number(form.get("max")) } : {}),
          ...(form.get("minLength") !== "" ? { minLength: Number(form.get("minLength")) } : {}),
          ...(form.get("maxLength") !== "" ? { maxLength: Number(form.get("maxLength")) } : {}),
          ...(form.get("expectedDigits") !== "" ? { expectedDigits: Number(form.get("expectedDigits")) } : {}),
          ...(optionalText(form.get("pattern")) ? { pattern: optionalText(form.get("pattern")) } : {}),
        },
        visibleWhen: buildCondition(form),
      };
      if (!Object.keys(field.validation ?? {}).length) delete field.validation;
      await mutate(
        value
          ? `/api/v1/admin/templates/versions/${version.id}/fields/${encodeURIComponent(value.key)}`
          : `/api/v1/admin/templates/versions/${version.id}/fields`,
        { method: value ? "PATCH" : "POST", body: JSON.stringify({ variantKey, stepKey, field }) },
        value ? "تم تعديل الحقل" : "تمت إضافة الحقل",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر قراءة بيانات الحقل");
    }
  }

  async function submitClause(event: FormEvent<HTMLFormElement>, value?: LegalClauseDefinition) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    const clause: LegalClauseDefinition = {
      key: value?.key ?? String(form.get("key") || "").trim(),
      titleAr: String(form.get("titleAr") || "").trim(),
      bodyAr: String(form.get("bodyAr") || "").trim(),
      enabled: form.get("enabled") === "on",
      variables: splitCsv(form.get("variables")),
      visibleWhen: buildCondition(form),
      sourceDocumentName: optionalText(form.get("sourceDocumentName")),
      sourcePageStart: form.get("sourcePageStart") ? Number(form.get("sourcePageStart")) : undefined,
      sourcePageEnd: form.get("sourcePageEnd") ? Number(form.get("sourcePageEnd")) : undefined,
    };
    await mutate(
      value ? `/api/v1/admin/templates/versions/${version.id}/clauses/${encodeURIComponent(value.key)}` : `/api/v1/admin/templates/versions/${version.id}/clauses`,
      { method: value ? "PATCH" : "POST", body: JSON.stringify({ clause }) },
      value ? "تم تعديل البند" : "تمت إضافة البند",
    );
  }

  async function submitOptional(event: FormEvent<HTMLFormElement>, value?: OptionalClauseDefinition) {
    event.preventDefault();
    if (!version) return;
    try {
      const form = new FormData(event.currentTarget);
      const optionalClause: OptionalClauseDefinition = {
        key: value?.key ?? String(form.get("key") || "").trim(),
        nameAr: String(form.get("nameAr") || "").trim(),
        description: String(form.get("description") || "").trim(),
        documentTitleAr: optionalText(form.get("documentTitleAr")),
        sourceDocumentName: optionalText(form.get("sourceDocumentName")),
        outputMode: String(form.get("outputMode") || "inline") as "inline" | "separate_annex",
        applicableVariantKeys: form.getAll("applicableVariantKeys").map(String),
        insertBeforeStepKey: String(form.get("insertBeforeStepKey") || "").trim(),
        legalClauseKeys: splitCsv(form.get("legalClauseKeys")),
        insertedSteps: parseJson(form.get("insertedSteps"), value?.insertedSteps ?? [], "خطوات الإضافة"),
        defaultFieldValues: parseJson<Record<string, ContractFieldValue>>(form.get("defaultFieldValues"), value?.defaultFieldValues ?? {}, "القيم الافتراضية"),
      };
      await mutate(
        value
          ? `/api/v1/admin/templates/versions/${version.id}/optional-clauses/${encodeURIComponent(value.key)}`
          : `/api/v1/admin/templates/versions/${version.id}/optional-clauses`,
        { method: value ? "PATCH" : "POST", body: JSON.stringify({ optionalClause }) },
        value ? "تم تعديل الإضافة" : "تمت إضافة الإضافة",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر قراءة بيانات الإضافة");
    }
  }

  async function remove(path: string, message: string, confirmation: string, body?: unknown) {
    if (!await confirm({ title: "تأكيد الحذف", message: confirmation, confirmLabel: "تأكيد", danger: true })) return;
    await mutate(path, { method: "DELETE", ...(body ? { body: JSON.stringify(body) } : {}) }, message);
  }

  async function moveVariant(variant: ContractVariantDefinition, index: number, direction: -1 | 1) {
    if (!version) return;
    const target = index + direction;
    if (target < 0 || target >= version.definition.variants.length) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variant.key)}`, {
      method: "PATCH",
      body: JSON.stringify({ variant: { moveToIndex: target } }),
    }, "تم تغيير ترتيب نوع العقد");
  }

  async function moveStep(variantKey: string, step: WizardStepDefinition, index: number, direction: -1 | 1, total: number) {
    if (!version) return;
    const target = index + direction;
    if (target < 0 || target >= total) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variantKey)}/steps/${encodeURIComponent(step.key)}`, {
      method: "PATCH",
      body: JSON.stringify({ step: { moveToIndex: target } }),
    }, "تم تغيير ترتيب الخطوة");
  }

  async function generatePreview() {
    if (!version || !previewVariant) return;
    setBusy(true);
    setError("");
    try {
      const fieldValues = createSampleFieldValues(version.definition, previewVariant, previewOptionals);
      const result = await dashboardRequest<PreviewResult>(`/api/v1/admin/templates/versions/${version.id}/preview`, {
        method: "POST",
        body: JSON.stringify({ variantKey: previewVariant, selectedOptionalClauseKeys: previewOptionals, fieldValues }),
      });
      setPreview(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إنشاء المعاينة");
    } finally {
      setBusy(false);
    }
  }

  if (error && !version) return <div className="p-8"><PageError message={error} onRetry={load} /></div>;
  if (!version) return <div className="p-8"><PageLoading /></div>;

  const filteredClauses = (version.definition.legalClauses ?? []).filter((clause) => `${clause.titleAr} ${clause.key} ${clause.bodyAr}`.toLowerCase().includes(clauseSearch.toLowerCase()));
  const tabs: Array<[TabKey, string, ReactNode]> = [
    ["structure", "الأنواع والأسئلة", <Layers3 className="h-4 w-4" key="i" />],
    ["clauses", "البنود القانونية", <FilePlus2 className="h-4 w-4" key="i" />],
    ["optional", "الإضافات والملاحق", <Braces className="h-4 w-4" key="i" />],
    ["preview", "معاينة تجريبية", <Eye className="h-4 w-4" key="i" />],
    ["validation", "فحص الجاهزية", <ClipboardCheck className="h-4 w-4" key="i" />],
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
      {confirmDialog}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-[#00102e] sm:text-3xl">{version.definition.nameAr} — الإصدار {version.versionNumber}</h1>
            <StatusBadge value={version.status} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {version.status === "published"
              ? "نسخة منشورة للعرض فقط. أنشئ إصدارًا جديدًا قبل أي تعديل."
              : version.status === "legal_review"
                ? "الإصدار عند المراجعة القانونية ولا يمكن تعديله. يمكن للمسؤول اعتماده ونشره أو إعادته مع ملاحظات."
                : version.status === "archived"
                  ? "إصدار مؤرشف للرجوع إليه ولا يمكن تعديله أو نشره مرة أخرى."
                  : "حرّر الأسئلة والبنود، عالج أخطاء الفحص، ثم أرسله للمراجعة القانونية."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><RefreshCw className="h-4 w-4" />تحديث</button>
          {version.status === "draft" && canEdit && (
            <button type="button" disabled={busy || Boolean(inspection?.errors.length)} onClick={() => void submitForReview()} className="inline-flex items-center gap-2 rounded-xl bg-[#986410] px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-4 w-4" />إرسال للمراجعة القانونية
            </button>
          )}
          {version.status === "legal_review" && canPublish && (
            <>
              <button type="button" disabled={busy} onClick={() => setReturnReviewOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-xs font-black text-amber-900 disabled:opacity-50">
                <RefreshCw className="h-4 w-4" />إعادة للتعديل
              </button>
              <button type="button" disabled={busy || Boolean(inspection?.errors.length)} onClick={() => void publish()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />اعتماد ونشر
              </button>
            </>
          )}
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{notice}</div>}
      {!canEdit && version.status === "draft" && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">حسابك يملك صلاحية العرض فقط. تعديل مسودة القالب يحتاج صلاحية مستقلة.</div>}
      {version.status === "legal_review" && !canPublish && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">الإصدار عند المسؤول القانوني. يمكنك الاطلاع عليه فقط حتى يتم اعتماده أو إعادته للتعديل.</div>}

      <form onSubmit={saveReviewMetadata} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:grid-cols-4">
        <label className="text-xs font-black text-slate-600">ملخص التعديل<input name="changeSummary" defaultValue={version.changeSummary ?? ""} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#986410]" /></label>
        <label className="text-xs font-black text-slate-600">المرجع القانوني<input name="legalReference" defaultValue={version.legalReference ?? ""} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#986410]" /></label>
        <label className="text-xs font-black text-slate-600">تاريخ بدء السريان<input name="effectiveFrom" type="datetime-local" defaultValue={version.effectiveFrom?.slice(0, 16) ?? ""} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#986410]" /></label>
        <div className="flex items-end">{!readOnly && <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-[#d5a84c]"><Save className="h-4 w-4" />حفظ بيانات المراجعة</button>}</div>
      </form>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {tabs.map(([key, label, icon]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-black ${activeTab === key ? "bg-[#00102e] text-[#d5a84c]" : "text-slate-600 hover:bg-slate-50"}`}>
            {icon}{label}{key === "validation" && inspection && <span className={`rounded-full px-2 py-0.5 text-[10px] ${inspection.errors.length ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{inspection.errors.length}</span>}
          </button>
        ))}
      </nav>

      {activeTab === "structure" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><h2 className="text-xl font-black text-[#00102e]">أنواع العقد وخطوات إدخال البيانات</h2><p className="mt-1 text-xs font-semibold text-slate-500">كل نوع عقد له خطواته وأسئلته وترتيبه، ويمكن تعديله داخل الإصدار المسودة فقط.</p></div>
            {!readOnly && <button type="button" onClick={() => setModal({ kind: "variant" })} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" />إضافة نوع عقد</button>}
          </div>

          {version.definition.variants.map((variant, variantIndex) => {
            const expanded = expandedVariants[variant.key] ?? false;
            return (
              <article key={variant.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <button type="button" onClick={() => setExpandedVariants((current) => ({ ...current, [variant.key]: !expanded }))} className="flex min-w-0 items-center gap-3 text-right">
                    {expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
                    <div className="min-w-0"><h3 className="truncate text-base font-black text-[#00102e]">{variant.nameAr}</h3><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{variant.key} · {variant.steps.length} خطوة</p></div>
                  </button>
                  {!readOnly && <div className="flex flex-wrap gap-1.5">
                    <button type="button" disabled={variantIndex === 0 || busy} onClick={() => void moveVariant(variant, variantIndex, -1)} className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-30" title="تحريك لأعلى"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" disabled={variantIndex === version.definition.variants.length - 1 || busy} onClick={() => void moveVariant(variant, variantIndex, 1)} className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-30" title="تحريك لأسفل"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setModal({ kind: "variant", value: variant })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-black"><Pencil className="h-3.5 w-3.5" />تعديل النوع</button>
                    <button type="button" onClick={() => setModal({ kind: "step", variantKey: variant.key })} className="inline-flex items-center gap-1 rounded-lg bg-[#00102e] px-3 py-2 text-[11px] font-black text-white"><Plus className="h-3.5 w-3.5" />إضافة خطوة</button>
                    <button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variant.key)}`, "تم حذف نوع العقد", `حذف نوع العقد «${variant.nameAr}» من هذه المسودة؟`)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </div>}
                </div>
                {expanded && <div className="space-y-3 p-4">
                  {variant.steps.map((step, stepIndex) => {
                    const stepId = `${variant.key}:${step.key}`;
                    const stepExpanded = expandedSteps[stepId] ?? true;
                    return (
                      <div key={step.key} className="rounded-xl border border-slate-200">
                        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <button type="button" onClick={() => setExpandedSteps((current) => ({ ...current, [stepId]: !stepExpanded }))} className="flex items-center gap-2 text-right">
                            {stepExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            <div><div className="text-sm font-black text-slate-800">{step.titleAr}</div><div className="mt-1 font-mono text-[9px] text-slate-400">{step.key} · {step.fields.length} حقل</div></div>
                          </button>
                          {!readOnly && <div className="flex flex-wrap gap-1.5">
                            <button type="button" disabled={stepIndex === 0 || busy} onClick={() => void moveStep(variant.key, step, stepIndex, -1, variant.steps.length)} className="rounded-lg border p-1.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" disabled={stepIndex === variant.steps.length - 1 || busy} onClick={() => void moveStep(variant.key, step, stepIndex, 1, variant.steps.length)} className="rounded-lg border p-1.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => setModal({ kind: "step", variantKey: variant.key, value: step })} className="rounded-lg border px-2.5 py-1.5 text-[10px] font-black">تعديل الخطوة</button>
                            <button type="button" onClick={() => setModal({ kind: "field", variantKey: variant.key, stepKey: step.key })} className="inline-flex items-center gap-1 rounded-lg bg-[#986410] px-2.5 py-1.5 text-[10px] font-black text-white"><Plus className="h-3 w-3" />إضافة سؤال</button>
                            <button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variant.key)}/steps/${encodeURIComponent(step.key)}`, "تم حذف الخطوة", `حذف خطوة «${step.titleAr}» وكل حقولها؟`)} className="rounded-lg border border-red-200 p-1.5 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>}
                        </div>
                        {stepExpanded && <div className="border-t border-slate-100">
                          {step.fields.map((field) => (
                            <div key={field.key} className="flex flex-col gap-3 border-b border-slate-100 p-3 last:border-b-0 md:flex-row md:items-center md:justify-between">
                              <div className="min-w-0"><div className="text-sm font-black text-slate-800">{field.labelAr}</div><div className="mt-1 break-all font-mono text-[9px] text-slate-400">{field.key}</div>{field.helpText && <p className="mt-1 text-[11px] text-slate-500">{field.helpText}</p>}</div>
                              <div className="flex flex-wrap items-center gap-2"><FieldBadge field={field} />{!readOnly && <><button type="button" onClick={() => setModal({ kind: "field", variantKey: variant.key, stepKey: step.key, value: field })} className="rounded-lg border border-slate-200 p-2 text-slate-600"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/fields/${encodeURIComponent(field.key)}`, "تم حذف الحقل", `حذف السؤال «${field.labelAr}»؟`, { variantKey: variant.key, stepKey: step.key })} className="rounded-lg border border-red-200 p-2 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></>}</div>
                            </div>
                          ))}
                          {!step.fields.length && <div className="p-4 text-center text-xs font-bold text-slate-400">لا توجد أسئلة في هذه الخطوة.</div>}
                        </div>}
                      </div>
                    );
                  })}
                  {!variant.steps.length && <div className="rounded-xl bg-amber-50 p-4 text-center text-xs font-bold text-amber-800">هذا النوع لا يحتوي خطوات بعد.</div>}
                </div>}
              </article>
            );
          })}
          {!version.definition.variants.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Layers3 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-500">ابدأ بإضافة نوع عقد واحد على الأقل.</p></div>}
        </section>
      )}

      {activeTab === "clauses" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-black text-[#00102e]">البنود القانونية</h2><p className="mt-1 text-xs font-semibold text-slate-500">النص المنشور لا يتغير بأثر رجعي. استخدم المتغيرات بالشكل {"{{field_key}}"}.</p></div>{!readOnly && <button type="button" onClick={() => setModal({ kind: "clause" })} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" />إضافة بند</button>}</div>
          <input value={clauseSearch} onChange={(event: ChangeEvent<HTMLInputElement>) => setClauseSearch(event.target.value)} placeholder="ابحث باسم المادة أو مفتاحها أو جزء من النص" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#986410]" />
          <div className="space-y-3">{filteredClauses.map((clause) => <article key={clause.key} className={`rounded-2xl border bg-white p-5 ${clause.enabled === false ? "border-slate-200 opacity-60" : "border-slate-200"}`}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#00102e]">{clause.titleAr}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black ${clause.enabled === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>{clause.enabled === false ? "معطّل" : "مفعّل"}</span></div><div className="mt-1 font-mono text-[9px] text-slate-400">{clause.key}</div>{clause.sourceDocumentName && <div className="mt-1 text-[10px] font-bold text-slate-500">المصدر: {clause.sourceDocumentName}{clause.sourcePageStart ? ` — ص ${clause.sourcePageStart}${clause.sourcePageEnd && clause.sourcePageEnd !== clause.sourcePageStart ? ` إلى ${clause.sourcePageEnd}` : ""}` : ""}</div>}</div>{!readOnly && <div className="flex gap-2"><button type="button" onClick={() => setModal({ kind: "clause", value: clause })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[11px] font-black"><Pencil className="h-3.5 w-3.5" />تعديل</button>{clause.enabled !== false && <button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/clauses/${encodeURIComponent(clause.key)}`, "تم تعطيل البند", `تعطيل البند «${clause.titleAr}» في هذه المسودة؟`)} className="rounded-lg border border-red-200 px-3 py-2 text-[11px] font-black text-red-700">تعطيل</button>}</div>}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-slate-700">{clause.bodyAr}</p></article>)}{!filteredClauses.length && <div className="rounded-2xl bg-slate-50 p-8 text-center text-xs font-bold text-slate-500">لا توجد بنود مطابقة.</div>}</div>
        </section>
      )}

      {activeTab === "optional" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-xl font-black text-[#00102e]">الإضافات والملاحق الاختيارية</h2><p className="mt-1 text-xs font-semibold text-slate-500">مثل جدول الأقساط أو محضر الاستلام والجرد، ويمكن إصدارها داخل العقد أو كمستند مستقل.</p></div>{!readOnly && <button type="button" onClick={() => setModal({ kind: "optional" })} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" />إضافة ملحق أو خيار</button>}</div>
          <div className="grid gap-4 lg:grid-cols-2">{version.definition.optionalClauses.map((optional) => <article key={optional.key} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#00102e]">{optional.nameAr}</h3><div className="mt-1 font-mono text-[9px] text-slate-400">{optional.key}</div></div><span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800">{optional.outputMode === "separate_annex" ? "مستند مستقل" : "داخل العقد"}</span></div><p className="mt-3 text-sm leading-7 text-slate-600">{optional.description || "—"}</p><div className="mt-4 space-y-2 text-[11px] font-bold text-slate-500"><div>متاح لـ: {optional.applicableVariantKeys.map((key) => version.definition.variants.find((item) => item.key === key)?.nameAr ?? key).join("، ") || "غير محدد"}</div><div>الخطوات المضافة: {optional.insertedSteps.length}</div><div>البنود القانونية: {optional.legalClauseKeys.length}</div></div>{!readOnly && <div className="mt-4 flex gap-2"><button type="button" onClick={() => setModal({ kind: "optional", value: optional })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[11px] font-black"><Pencil className="h-3.5 w-3.5" />تعديل</button><button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/optional-clauses/${encodeURIComponent(optional.key)}`, "تم حذف الإضافة", `حذف الإضافة «${optional.nameAr}» من هذه المسودة؟`)} className="rounded-lg border border-red-200 px-3 py-2 text-[11px] font-black text-red-700">حذف</button></div>}</article>)}{!version.definition.optionalClauses.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs font-bold text-slate-500 lg:col-span-2">لا توجد إضافات أو ملاحق اختيارية.</div>}</div>
        </section>
      )}

      {activeTab === "preview" && (
        <section className="space-y-5">
          <div><h2 className="text-xl font-black text-[#00102e]">معاينة تجريبية قبل النشر</h2><p className="mt-1 text-xs font-semibold text-slate-500">يملأ النظام بيانات تجريبية تلقائيًا ويعرض البنود الناتجة حتى تراجع ترتيبها والمتغيرات الناقصة.</p></div>
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:grid-cols-3"><label className="text-xs font-black text-slate-600">نوع العقد<select value={previewVariant} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setPreviewVariant(event.target.value); setPreviewOptionals([]); setPreview(null); }} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal">{version.definition.variants.map((variant) => <option key={variant.key} value={variant.key}>{variant.nameAr}</option>)}</select></label><div className="lg:col-span-2"><div className="text-xs font-black text-slate-600">الإضافات المراد اختبارها</div><div className="mt-2 flex flex-wrap gap-2">{version.definition.optionalClauses.filter((optional) => optional.applicableVariantKeys.includes(previewVariant)).map((optional) => <label key={optional.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><input type="checkbox" checked={previewOptionals.includes(optional.key)} onChange={(event: ChangeEvent<HTMLInputElement>) => setPreviewOptionals((current) => event.target.checked ? [...current, optional.key] : current.filter((key) => key !== optional.key))} />{optional.nameAr}</label>)}{!version.definition.optionalClauses.some((optional) => optional.applicableVariantKeys.includes(previewVariant)) && <span className="text-xs text-slate-400">لا توجد إضافات لهذا النوع.</span>}</div></div><div className="lg:col-span-3"><button type="button" disabled={!previewVariant || busy} onClick={() => void generatePreview()} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-[#d5a84c]"><Eye className="h-4 w-4" />إنشاء المعاينة</button></div></div>
          {preview && <div className="space-y-4">{(preview.missingVariables.length > 0 || preview.missingClauseKeys.length > 0) && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900"><div>متغيرات لم تُستبدل: {preview.missingVariables.join("، ") || "لا يوجد"}</div><div className="mt-1">بنود غير موجودة: {preview.missingClauseKeys.join("، ") || "لا يوجد"}</div></div>}<div className="rounded-2xl border border-slate-200 bg-white p-6">{preview.clauses.map((clause) => <article key={clause.key} className="border-b border-slate-100 py-5 first:pt-0 last:border-b-0 last:pb-0"><h3 className="text-center text-base font-black text-[#00102e]">{clause.titleAr}</h3><p className="mt-3 whitespace-pre-wrap text-justify text-sm leading-8 text-slate-700">{clause.bodyAr}</p></article>)}{!preview.clauses.length && <p className="text-center text-sm font-bold text-slate-400">لم ينتج عن الاختيارات الحالية أي بنود.</p>}</div></div>}
        </section>
      )}

      {activeTab === "validation" && inspection && (
        <section className="space-y-5">
          <div><h2 className="text-xl font-black text-[#00102e]">فحص جاهزية الإصدار</h2><p className="mt-1 text-xs font-semibold text-slate-500">النشر يتوقف تلقائيًا عند وجود أخطاء؛ التحذيرات لا تمنع النشر لكنها تحتاج مراجعة.</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries({ "أنواع العقد": inspection.stats.variants, "الخطوات": inspection.stats.steps, "الحقول": inspection.stats.fields, "البنود": inspection.stats.legalClauses, "الإضافات": inspection.stats.optionalClauses }).map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center"><div className="text-2xl font-black text-[#00102e]">{value}</div><div className="mt-1 text-[11px] font-bold text-slate-500">{label}</div></div>)}</div>
          {!inspection.errors.length && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"><CheckCircle2 className="h-6 w-6" /><div><div className="font-black">لا توجد أخطاء تمنع النشر</div><div className="mt-1 text-xs font-semibold">راجع التحذيرات والمعاينة القانونية قبل الاعتماد النهائي.</div></div></div>}
          {!!inspection.errors.length && <div className="space-y-2"><h3 className="font-black text-red-800">أخطاء يجب معالجتها ({inspection.errors.length})</h3>{inspection.errors.map((item, index) => <div key={`${item.code}-${index}`} className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" /><div><div className="text-sm font-black text-red-900">{item.messageAr}</div><div className="mt-1 font-mono text-[9px] text-red-500">{item.code} · {item.path}</div></div></div>)}</div>}
          {!!inspection.warnings.length && <div className="space-y-2"><h3 className="font-black text-amber-800">ملاحظات للمراجعة ({inspection.warnings.length})</h3>{inspection.warnings.map((item, index) => <div key={`${item.code}-${index}`} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><div className="text-sm font-black text-amber-900">{item.messageAr}</div><div className="mt-1 font-mono text-[9px] text-amber-600">{item.code} · {item.path}</div></div></div>)}</div>}
        </section>
      )}

      {returnReviewOpen && (
        <ModalShell title="إعادة الإصدار للتعديل" onClose={() => setReturnReviewOpen(false)}>
          <div className="space-y-4 p-6">
            <p className="text-sm font-semibold leading-7 text-slate-600">اكتب الملاحظات التي يجب معالجتها. ستُسجل في سجل العمليات ويعود الإصدار إلى حالة مسودة.</p>
            <label className="block text-xs font-black">سبب الإعادة وملاحظات المراجع
              <textarea value={returnReason} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReturnReason(event.target.value)} rows={6} className="mt-2 w-full rounded-xl border border-slate-200 p-4 text-sm leading-7 font-normal" placeholder="مثال: مراجعة صياغة المادة الخامسة وربط متغير تاريخ السداد بالحقل الصحيح" />
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
              <button type="button" onClick={() => setReturnReviewOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">إلغاء</button>
              <button type="button" disabled={busy || !returnReason.trim()} onClick={() => void returnToDraft()} className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"><RefreshCw className="h-4 w-4" />إعادة للتعديل</button>
            </div>
          </div>
        </ModalShell>
      )}

      {modal?.kind === "variant" && <ModalShell title={modal.value ? "تعديل نوع العقد" : "إضافة نوع عقد"} onClose={() => setModal(null)}><form onSubmit={(event: FormEvent<HTMLFormElement>) => void submitVariant(event, modal.value)} className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">مفتاح النوع<input name="key" required disabled={Boolean(modal.value)} defaultValue={modal.value?.key} pattern="[a-z0-9_.-]+" className="mt-2 w-full rounded-xl border p-3 font-mono font-normal disabled:bg-slate-100" /></label><label className="text-xs font-black">الاسم الظاهر<input name="nameAr" required defaultValue={modal.value?.nameAr} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">عنوان المستند<input name="documentTitleAr" defaultValue={modal.value?.documentTitleAr} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">اسم ملف المصدر<input name="sourceDocumentName" defaultValue={modal.value?.sourceDocumentName} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label></div><label className="block text-xs font-black">وصف النوع<textarea name="description" rows={3} defaultValue={modal.value?.description} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">مفاتيح البنود الإجبارية<textarea name="requiredClauseKeys" rows={4} defaultValue={modal.value?.requiredClauseKeys.join(", ")} className="mt-2 w-full rounded-xl border p-3 font-mono text-xs font-normal" /></label><label className="text-xs font-black">الإضافات الاختيارية المسموحة<textarea name="allowedOptionalClauseKeys" rows={4} defaultValue={modal.value?.allowedOptionalClauseKeys.join(", ")} className="mt-2 w-full rounded-xl border p-3 font-mono text-xs font-normal" /></label></div><label className="block text-xs font-black">القيم الافتراضية — إعداد متقدم<textarea name="defaultFieldValues" rows={5} dir="ltr" defaultValue={JSON.stringify(modal.value?.defaultFieldValues ?? {}, null, 2)} className="mt-2 w-full rounded-xl border p-3 font-mono text-xs font-normal" /></label><FormActions busy={busy} onCancel={() => setModal(null)} /></form></ModalShell>}

      {modal?.kind === "step" && <ModalShell title={modal.value ? "تعديل الخطوة" : "إضافة خطوة"} onClose={() => setModal(null)}><form onSubmit={(event: FormEvent<HTMLFormElement>) => void submitStep(event, modal.variantKey, modal.value)} className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">مفتاح الخطوة<input name="key" required disabled={Boolean(modal.value)} defaultValue={modal.value?.key} pattern="[a-z0-9_.-]+" className="mt-2 w-full rounded-xl border p-3 font-mono font-normal disabled:bg-slate-100" /></label><label className="text-xs font-black">عنوان الخطوة<input name="titleAr" required defaultValue={modal.value?.titleAr} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">نطاق المواد<input name="articleRange" defaultValue={modal.value?.articleRange} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">مفتاح البند المصدر<input name="sourceClauseKey" defaultValue={modal.value?.sourceClauseKey} className="mt-2 w-full rounded-xl border p-3 font-mono font-normal" /></label></div><label className="block text-xs font-black">وصف الخطوة<textarea name="description" rows={3} defaultValue={modal.value?.description} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><ConditionFields value={modal.value?.visibleWhen} fieldKeys={allFieldKeys} /><FormActions busy={busy} onCancel={() => setModal(null)} /></form></ModalShell>}

      {modal?.kind === "field" && <ModalShell title={modal.value ? "تعديل السؤال" : "إضافة سؤال"} onClose={() => setModal(null)}><form onSubmit={(event: FormEvent<HTMLFormElement>) => void submitField(event, modal.variantKey, modal.stepKey, modal.value)} className="space-y-5 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">مفتاح الحقل<input name="key" required disabled={Boolean(modal.value)} defaultValue={modal.value?.key} pattern="[a-z0-9_.-]+" className="mt-2 w-full rounded-xl border p-3 font-mono font-normal disabled:bg-slate-100" /></label><label className="text-xs font-black">اسم السؤال<input name="labelAr" required defaultValue={modal.value?.labelAr} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">نوع الحقل<select name="type" defaultValue={modal.value?.type ?? "text"} className="mt-2 w-full rounded-xl border p-3 font-normal">{Object.entries(fieldTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="flex items-end gap-2 rounded-xl border p-3 text-xs font-black"><input name="required" type="checkbox" defaultChecked={modal.value?.required} />حقل إجباري</label><label className="text-xs font-black">نص داخل الحقل<input name="placeholder" defaultValue={modal.value?.placeholder} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">مساعدة للمستخدم<input name="helpText" defaultValue={modal.value?.helpText} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label></div><label className="block text-xs font-black">خيارات القائمة أو الاختيار — كل خيار في سطر بالشكل value|الاسم<textarea name="options" rows={5} dir="ltr" defaultValue={optionsText(modal.value)} className="mt-2 w-full rounded-xl border p-3 font-mono text-xs font-normal" /></label><div className="rounded-2xl bg-slate-50 p-4"><div className="mb-3 text-xs font-black text-slate-700">قواعد التحقق</div><div className="grid gap-3 sm:grid-cols-3"><label className="text-[11px] font-bold">أقل قيمة<input name="min" type="number" defaultValue={modal.value?.validation?.min} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-[11px] font-bold">أكبر قيمة<input name="max" type="number" defaultValue={modal.value?.validation?.max} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-[11px] font-bold">عدد الأرقام المتوقع<input name="expectedDigits" type="number" defaultValue={modal.value?.validation?.expectedDigits} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-[11px] font-bold">أقل طول<input name="minLength" type="number" defaultValue={modal.value?.validation?.minLength} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-[11px] font-bold">أكبر طول<input name="maxLength" type="number" defaultValue={modal.value?.validation?.maxLength} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-[11px] font-bold">نمط التحقق<input name="pattern" dir="ltr" defaultValue={modal.value?.validation?.pattern} className="mt-1 w-full rounded-lg border p-2 font-mono font-normal" /></label></div></div><ConditionFields value={modal.value?.visibleWhen} fieldKeys={allFieldKeys} /><div className="rounded-2xl border border-slate-200 p-4"><div className="text-xs font-black">إعداد الجدول المتكرر فقط</div><label className="mt-3 block text-[11px] font-bold">الحد الأدنى للصفوف<input name="minRows" type="number" min="0" defaultValue={modal.value?.minRows} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="mt-3 block text-[11px] font-bold">تعريف الأعمدة بصيغة JSON<textarea name="columns" rows={6} dir="ltr" defaultValue={JSON.stringify(modal.value?.columns ?? [], null, 2)} className="mt-1 w-full rounded-lg border p-3 font-mono text-xs font-normal" /></label></div><FormActions busy={busy} onCancel={() => setModal(null)} /></form></ModalShell>}

      {modal?.kind === "clause" && <ModalShell title={modal.value ? "تعديل البند القانوني" : "إضافة بند قانوني"} onClose={() => setModal(null)}><form onSubmit={(event: FormEvent<HTMLFormElement>) => void submitClause(event, modal.value)} className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">مفتاح البند<input name="key" required disabled={Boolean(modal.value)} defaultValue={modal.value?.key} pattern="[a-z0-9_.-]+" className="mt-2 w-full rounded-xl border p-3 font-mono font-normal disabled:bg-slate-100" /></label><label className="text-xs font-black">عنوان المادة<input name="titleAr" required defaultValue={modal.value?.titleAr} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label></div><label className="block text-xs font-black">النص القانوني<textarea name="bodyAr" required rows={14} defaultValue={modal.value?.bodyAr} className="mt-2 w-full rounded-xl border p-4 text-sm leading-8 font-normal" /></label><label className="flex items-center gap-2 text-xs font-black"><input name="enabled" type="checkbox" defaultChecked={modal.value?.enabled !== false} />البند مفعّل في هذا الإصدار</label><label className="block text-xs font-black">المتغيرات — يفصل بينها فاصلة<input name="variables" dir="ltr" defaultValue={modal.value?.variables?.join(", ")} className="mt-2 w-full rounded-xl border p-3 font-mono font-normal" /></label><div className="grid gap-4 sm:grid-cols-3"><label className="text-xs font-black">ملف المصدر<input name="sourceDocumentName" defaultValue={modal.value?.sourceDocumentName} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">من صفحة<input name="sourcePageStart" type="number" min="1" defaultValue={modal.value?.sourcePageStart} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">إلى صفحة<input name="sourcePageEnd" type="number" min="1" defaultValue={modal.value?.sourcePageEnd} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label></div><ConditionFields value={modal.value?.visibleWhen} fieldKeys={allFieldKeys} /><FormActions busy={busy} onCancel={() => setModal(null)} /></form></ModalShell>}

      {modal?.kind === "optional" && <ModalShell title={modal.value ? "تعديل الإضافة أو الملحق" : "إضافة ملحق أو خيار"} onClose={() => setModal(null)}><form onSubmit={(event: FormEvent<HTMLFormElement>) => void submitOptional(event, modal.value)} className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">مفتاح الإضافة<input name="key" required disabled={Boolean(modal.value)} defaultValue={modal.value?.key} pattern="[a-z0-9_.-]+" className="mt-2 w-full rounded-xl border p-3 font-mono font-normal disabled:bg-slate-100" /></label><label className="text-xs font-black">الاسم الظاهر<input name="nameAr" required defaultValue={modal.value?.nameAr} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">طريقة الإصدار<select name="outputMode" defaultValue={modal.value?.outputMode ?? "inline"} className="mt-2 w-full rounded-xl border p-3 font-normal"><option value="inline">داخل العقد</option><option value="separate_annex">مستند مستقل</option></select></label><label className="text-xs font-black">نقطة الإدراج قبل خطوة<input name="insertBeforeStepKey" defaultValue={modal.value?.insertBeforeStepKey} className="mt-2 w-full rounded-xl border p-3 font-mono font-normal" /></label><label className="text-xs font-black">عنوان المستند<input name="documentTitleAr" defaultValue={modal.value?.documentTitleAr} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><label className="text-xs font-black">ملف المصدر<input name="sourceDocumentName" defaultValue={modal.value?.sourceDocumentName} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label></div><label className="block text-xs font-black">الوصف<textarea name="description" rows={3} defaultValue={modal.value?.description} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label><div><div className="text-xs font-black">أنواع العقد التي تقبل الإضافة</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{version.definition.variants.map((variant) => <label key={variant.key} className="flex items-center gap-2 rounded-xl border p-3 text-xs font-bold"><input type="checkbox" name="applicableVariantKeys" value={variant.key} defaultChecked={modal.value?.applicableVariantKeys.includes(variant.key)} />{variant.nameAr}</label>)}</div></div><label className="block text-xs font-black">مفاتيح البنود القانونية<input name="legalClauseKeys" defaultValue={modal.value?.legalClauseKeys.join(", ")} className="mt-2 w-full rounded-xl border p-3 font-mono text-xs font-normal" /></label><div className="rounded-2xl border border-slate-200 p-4"><div className="text-xs font-black">إعداد متقدم للخطوات والحقول داخل الإضافة</div><p className="mt-1 text-[11px] leading-5 text-slate-500">يمكن استخدامه للملاحق المعقدة. احتفظ بالمفاتيح الإنجليزية ولا تغيّرها بعد نشر الإصدار.</p><textarea name="insertedSteps" rows={10} dir="ltr" defaultValue={JSON.stringify(modal.value?.insertedSteps ?? [], null, 2)} className="mt-3 w-full rounded-xl border p-3 font-mono text-xs font-normal" /></div><label className="block text-xs font-black">القيم الافتراضية — JSON<textarea name="defaultFieldValues" rows={5} dir="ltr" defaultValue={JSON.stringify(modal.value?.defaultFieldValues ?? {}, null, 2)} className="mt-2 w-full rounded-xl border p-3 font-mono text-xs font-normal" /></label><FormActions busy={busy} onCancel={() => setModal(null)} /></form></ModalShell>}
    </div>
  );
}

function isAtomicCondition(value: ConditionDefinition | undefined): value is AtomicConditionDefinition {
  return Boolean(value && "fieldKey" in value);
}

function ConditionFields({ value, fieldKeys }: { value?: WizardFieldDefinition["visibleWhen"]; fieldKeys: string[] }) {
  const atomicCondition = isAtomicCondition(value) ? value : undefined;
  const hasCompositeCondition = Boolean(value && !atomicCondition);

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="text-xs font-black text-violet-900">شرط الظهور — اختياري</div>
      {hasCompositeCondition && (
        <p className="mt-2 rounded-lg border border-violet-200 bg-white p-2 text-[11px] font-bold leading-5 text-violet-700">
          هذا الشرط مركب ومحرك القوالب سيحتفظ به كما هو حتى يتم استبداله بشرط بسيط من الحقول التالية.
        </p>
      )}
      {hasCompositeCondition && <input type="hidden" name="existingCompositeCondition" value={JSON.stringify(value)} />}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-[11px] font-bold text-violet-900">الحقل الذي يعتمد عليه<input list="template-field-keys" name="conditionFieldKey" defaultValue={atomicCondition?.fieldKey} className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 font-mono font-normal" /><datalist id="template-field-keys">{fieldKeys.map((key) => <option key={key} value={key} />)}</datalist></label>
        <label className="text-[11px] font-bold text-violet-900">المقارنة<select name="conditionOperator" defaultValue={atomicCondition?.operator ?? "equals"} className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 font-normal">{conditionOperators.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-[11px] font-bold text-violet-900">القيمة<input name="conditionValue" defaultValue={atomicCondition?.value === undefined ? "" : String(atomicCondition.value)} className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 font-normal" /></label>
      </div>
    </div>
  );
}
