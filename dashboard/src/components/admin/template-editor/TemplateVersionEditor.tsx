"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
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
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";

function GripVertical({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

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
import { ChangeEvent, FormEvent, MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dashboardRequest } from "@/lib/apiClient";
import { hasBackendPermission } from "@/lib/adminAccess";
import { PageError, PageLoading, StatusBadge } from "@/components/admin/PageFeedback";
import { useAdminConfirm } from "@/components/admin/AdminDialog";
import ReadinessEditor from "@/components/admin/template-editor/ReadinessEditor";

type Version = {
  id: number;
  templateId: number;
  versionNumber: number;
  status: string;
  templateNameAr?: string;
  categoryId?: number | null;
  categoryNameAr?: string | null;
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
  | { kind: "fieldHelp"; variantKey: string; stepKey: string; value: WizardFieldDefinition }
  | { kind: "clause"; value?: LegalClauseDefinition }
  | { kind: "clauseGuidance"; value: LegalClauseDefinition }
  | { kind: "optional"; value?: OptionalClauseDefinition }
  | null;

type TabKey = "structure" | "readiness" | "clauses" | "optional" | "preview" | "validation";

function tabForInspectionPath(path = ""): TabKey {
  const normalized = path.toLowerCase();
  if (normalized.includes("readiness")) return "readiness";
  if (normalized.includes("legalclauses") || normalized.includes("clauses")) return "clauses";
  if (normalized.includes("optionalclauses") || normalized.includes("optional")) return "optional";
  return "structure";
}

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
    .map((line, index) => {
      const [value, ...labelParts] = line.split("|");
      const labelAr = labelParts.join("|").trim();
      if (!value?.trim()) throw new Error("كل اختيار يجب أن يحتوي نصًا ظاهرًا");
      return labelAr
        ? { value: value.trim(), labelAr }
        : { value: `option_${index + 1}`, labelAr: value.trim() };
    });
}

type RepeaterColumnDefinition = NonNullable<WizardFieldDefinition["columns"]>[number];
type OptionalInsertedStepDefinition = OptionalClauseDefinition["insertedSteps"][number];
type ReorderDragItem =
  | { kind: "variant"; key: string; index: number }
  | { kind: "step"; variantKey: string; key: string; index: number }
  | { kind: "field"; variantKey: string; stepKey: string; key: string; index: number };

function nextInternalKey(prefix: string, existing: string[]) {
  let index = existing.length + 1;
  let candidate = `${prefix}_${index}`;
  while (existing.includes(candidate)) {
    index += 1;
    candidate = `${prefix}_${index}`;
  }
  return candidate;
}

function humanDefaultValue(value: ContractFieldValue): { kind: "text" | "number" | "boolean" | "complex"; text: string } {
  if (typeof value === "boolean") return { kind: "boolean", text: value ? "true" : "false" };
  if (typeof value === "number") return { kind: "number", text: String(value) };
  if (typeof value === "string") return { kind: "text", text: value };
  return { kind: "complex", text: "قيمة مركبة محفوظة" };
}

function buildDefaultValue(kind: string, text: string, fallback: ContractFieldValue): ContractFieldValue {
  if (kind === "boolean") return text === "true";
  if (kind === "number") {
    const value = Number(text);
    return Number.isFinite(value) ? value : 0;
  }
  if (kind === "complex") return fallback;
  return text;
}

function buildCondition(form: FormData, prefix = "condition"): ConditionDefinition | undefined {
  const fieldKey = optionalText(form.get(`${prefix}FieldKey`));
  if (!fieldKey) {
    const existingComposite = optionalText(form.get(`${prefix}ExistingCompositeCondition`));
    if (!existingComposite) return undefined;
    try {
      const parsed: unknown = JSON.parse(existingComposite);
      return isConditionDefinition(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  const operator = String(form.get(`${prefix}Operator`) || "equals") as "equals" | "not_equals" | "truthy" | "falsy" | "includes";
  const rawValue = optionalText(form.get(`${prefix}Value`));
  return {
    fieldKey,
    operator,
    ...(["truthy", "falsy"].includes(operator) ? {} : { value: rawValue ?? "" }),
  };
}

function ModalShell({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl ${wide ? "max-w-6xl" : "max-w-3xl"}`} onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-black text-[#00102e]">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="إغلاق">
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
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d7a94f] disabled:opacity-50">
        <Save className="h-4 w-4" />{busy ? "جاري الحفظ..." : submitLabel}
      </button>
    </div>
  );
}

function FieldEditorSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 border-b border-slate-100 pb-3">
        <h3 className="text-base font-black text-[#00102e]">{title}</h3>
        {description && <p className="text-sm font-semibold leading-6 text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function FieldInputLabel({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <label className="block text-sm font-black text-slate-700">
      {label}
      <div className={mono ? "mt-2 font-mono" : "mt-2"}>{children}</div>
    </label>
  );
}

function ToggleCard({ name, defaultChecked, checked, onChange, title, description }: { name: string; defaultChecked?: boolean; checked?: boolean; onChange?: (checked: boolean) => void; title: string; description?: string }) {
  return (
    <label className="flex min-h-[76px] cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition hover:border-[#986410]/40 hover:bg-white">
      <input name={name} type="checkbox" checked={checked} defaultChecked={checked === undefined ? defaultChecked : undefined} onChange={(event) => onChange?.(event.target.checked)} className="mt-1 h-4 w-4 accent-[#986410]" />
      <span>
        <span className="block font-black text-slate-800">{title}</span>
        {description && <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

function TechnicalDetails({ title = "إعدادات تقنية متقدمة", children }: { title?: string; children: ReactNode }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer list-none text-sm font-black text-slate-700 [&::-webkit-details-marker]:hidden">{title}</summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  );
}



function DefaultValuesBuilder({
  name,
  values,
  fieldOptions,
}: {
  name: string;
  values?: Record<string, ContractFieldValue>;
  fieldOptions: Array<{ key: string; label: string }>;
}) {
  type Row = { key: string; kind: "text" | "number" | "boolean" | "complex"; text: string; original: ContractFieldValue };
  const [rows, setRows] = useState<Row[]>(() => Object.entries(values ?? {}).map(([key, value]) => ({ key, ...humanDefaultValue(value), original: value })));
  const serialized = useMemo(() => {
    return JSON.stringify(Object.fromEntries(rows.filter((row) => row.key).map((row) => [row.key, buildDefaultValue(row.kind, row.text, row.original)])));
  }, [rows]);
  const optionMap = useMemo(() => new Map(fieldOptions.map((option) => [option.key, option.label])), [fieldOptions]);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={serialized} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-800">قيم تعبأ تلقائيًا — اختياري</div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">حدد السؤال والقيمة التي تبدأ بها تلقائيًا بدل كتابة بيانات تقنية.</p>
        </div>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { key: "", kind: "text", text: "", original: "" }])}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
        >
          <Plus className="h-3.5 w-3.5" /> إضافة قيمة
        </button>
      </div>
      {rows.map((row, index) => {
        const known = !row.key || optionMap.has(row.key);
        return (
          <div key={`${row.key || "new"}:${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_auto] sm:items-end">
            <FieldInputLabel label="السؤال">
              <select value={row.key} onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, key: event.target.value } : item))} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal">
                <option value="">اختر السؤال...</option>
                {!known && <option value={row.key}>{row.key}</option>}
                {fieldOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </FieldInputLabel>
            <FieldInputLabel label="نوع القيمة">
              <select value={row.kind} disabled={row.kind === "complex"} onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, kind: event.target.value as Row["kind"] } : item))} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal disabled:bg-slate-50">
                <option value="text">نص</option>
                <option value="number">رقم</option>
                <option value="boolean">نعم / لا</option>
                {row.kind === "complex" && <option value="complex">قيمة مركبة محفوظة</option>}
              </select>
            </FieldInputLabel>
            <FieldInputLabel label="القيمة">
              {row.kind === "boolean" ? (
                <select value={row.text} onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, text: event.target.value } : item))} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal">
                  <option value="true">نعم</option><option value="false">لا</option>
                </select>
              ) : (
                <input type={row.kind === "number" ? "number" : "text"} value={row.text} disabled={row.kind === "complex"} onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, text: event.target.value } : item))} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal disabled:bg-slate-50" />
              )}
            </FieldInputLabel>
            <button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 px-3 text-red-700" aria-label="حذف القيمة"><Trash2 className="h-4 w-4" /></button>
          </div>
        );
      })}
      {!rows.length && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">لا توجد قيم تلقائية. يمكنك ترك هذا القسم فارغًا.</div>}
    </div>
  );
}

function RepeaterColumnsBuilder({ columns: initialColumns }: { columns?: RepeaterColumnDefinition[] }) {
  const [columns, setColumns] = useState<RepeaterColumnDefinition[]>(initialColumns ?? []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function updateColumn(index: number, patch: Partial<RepeaterColumnDefinition>) {
    setColumns((current) => current.map((column, columnIndex) => columnIndex === index ? { ...column, ...patch } : column));
  }

  function addColumn() {
    setColumns((current) => [...current, {
      key: nextInternalKey("column", current.map((column) => column.key)),
      labelAr: "",
      type: "text",
    } as RepeaterColumnDefinition]);
  }

  function moveColumn(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= columns.length || to >= columns.length) return;
    setColumns((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="columns" value={JSON.stringify(columns)} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-800">أعمدة الجدول</div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">أضف الأعمدة كما سيراها العميل. يمكنك سحب العمود لتغيير ترتيبه.</p>
        </div>
        <button type="button" onClick={addColumn} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#00102e] px-3 py-2 text-xs font-black text-white"><Plus className="h-3.5 w-3.5" />إضافة عمود</button>
      </div>
      {columns.map((column, index) => {
        const optionText = (column.options ?? []).map((option) => option.labelAr).join("\n");
        return (
          <div
            key={column.key}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragEnd={() => setDraggedIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); if (draggedIndex !== null) moveColumn(draggedIndex, index); setDraggedIndex(null); }}
            className={`rounded-xl border bg-white p-3 transition ${draggedIndex === index ? "border-[#986410] opacity-60" : "border-slate-200"}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-500"><GripVertical className="h-4 w-4 cursor-grab" />عمود {index + 1}</div>
              <button type="button" onClick={() => setColumns((current) => current.filter((_, columnIndex) => columnIndex !== index))} className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 px-2.5 text-xs font-black text-red-700"><Trash2 className="h-3.5 w-3.5" />حذف</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInputLabel label="اسم العمود">
                <input value={column.labelAr} onChange={(event) => updateColumn(index, { labelAr: event.target.value })} placeholder="مثال: القسط" className="w-full rounded-lg border border-slate-200 p-2.5 font-normal" />
              </FieldInputLabel>
              <FieldInputLabel label="نوع البيانات">
                <select value={column.type} onChange={(event) => updateColumn(index, { type: event.target.value as RepeaterColumnDefinition["type"] })} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal">
                  <option value="text">نص</option><option value="number">رقم</option><option value="money">مبلغ مالي</option><option value="date">تاريخ</option><option value="select">قائمة اختيار</option>
                </select>
              </FieldInputLabel>
              <FieldInputLabel label="نص توضيحي داخل الحقل">
                <input value={column.placeholder ?? ""} onChange={(event) => updateColumn(index, { placeholder: event.target.value || undefined })} className="w-full rounded-lg border border-slate-200 p-2.5 font-normal" />
              </FieldInputLabel>
              <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={Boolean(column.required)} onChange={(event) => updateColumn(index, { required: event.target.checked })} className="h-4 w-4 accent-[#986410]" /> مطلوب
              </label>
              {column.type === "select" && <div className="sm:col-span-2"><FieldInputLabel label="الاختيارات — كل اختيار في سطر"><textarea value={optionText} onChange={(event) => updateColumn(index, { options: event.target.value.split("\n").map((labelAr) => labelAr.trim()).filter(Boolean).map((labelAr, optionIndex) => ({ value: column.options?.[optionIndex]?.value ?? `option_${optionIndex + 1}`, labelAr })) })} rows={3} className="w-full rounded-lg border border-slate-200 p-2.5 font-normal leading-6" /></FieldInputLabel></div>}
            </div>
          </div>
        );
      })}
      {!columns.length && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">ابدأ بإضافة أول عمود للجدول.</div>}
    </div>
  );
}

function OptionalAdvancedVisualBuilder({
  value,
  version,
}: {
  value?: OptionalClauseDefinition;
  version: Version;
}) {
  const [steps, setSteps] = useState<OptionalInsertedStepDefinition[]>(value?.insertedSteps ?? []);
  const allBaseFields = version.definition.variants.flatMap((variant) => variant.steps.flatMap((step) => step.fields.map((field) => ({ key: field.key, label: `${variant.nameAr} — ${field.labelAr}` }))));
  const insertedFieldOptions = steps.flatMap((step) => step.fields.map((field) => ({ key: field.key, label: `الملحق — ${step.titleAr || "خطوة جديدة"} — ${field.labelAr || "سؤال جديد"}` })));
  const defaultFieldOptions = [...allBaseFields, ...insertedFieldOptions].filter((option, index, list) => list.findIndex((item) => item.key === option.key) === index);

  function updateStep(index: number, patch: Partial<OptionalInsertedStepDefinition>) {
    setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step));
  }

  function addStep() {
    setSteps((current) => [...current, {
      key: nextInternalKey("annex_step", current.map((step) => step.key)),
      titleAr: "",
      fields: [],
    } as OptionalInsertedStepDefinition]);
  }

  function addField(stepIndex: number) {
    setSteps((current) => current.map((step, index) => {
      if (index !== stepIndex) return step;
      return {
        ...step,
        fields: [...step.fields, {
          key: nextInternalKey("annex_field", current.flatMap((item) => item.fields.map((field) => field.key))),
          type: "text",
          labelAr: "",
        } as WizardFieldDefinition],
      };
    }));
  }

  function updateField(stepIndex: number, fieldIndex: number, patch: Partial<WizardFieldDefinition>) {
    setSteps((current) => current.map((step, index) => index === stepIndex ? { ...step, fields: step.fields.map((field, itemIndex) => itemIndex === fieldIndex ? { ...field, ...patch } : field) } : step));
  }

  function moveStepLocal(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => { const next = [...current]; const [item] = next.splice(index, 1); next.splice(target, 0, item); return next; });
  }

  function moveFieldLocal(stepIndex: number, fieldIndex: number, direction: -1 | 1) {
    setSteps((current) => current.map((step, index) => {
      if (index !== stepIndex) return step;
      const target = fieldIndex + direction;
      if (target < 0 || target >= step.fields.length) return step;
      const fields = [...step.fields];
      const [item] = fields.splice(fieldIndex, 1);
      fields.splice(target, 0, item);
      return { ...step, fields };
    }));
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name="insertedSteps" value={JSON.stringify(steps)} />
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-800">خطوات وأسئلة يضيفها الملحق</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">استخدمها فقط إذا كان اختيار الملحق يحتاج بيانات إضافية من العميل.</p>
          </div>
          <button type="button" onClick={addStep} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700"><Plus className="h-3.5 w-3.5" />إضافة خطوة</button>
        </div>
        <div className="mt-4 space-y-3">
          {steps.map((step, stepIndex) => (
            <div key={step.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><FieldInputLabel label={`اسم الخطوة ${stepIndex + 1}`}><input value={step.titleAr} onChange={(event) => updateStep(stepIndex, { titleAr: event.target.value })} placeholder="مثال: بيانات الأقساط" className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal" /></FieldInputLabel></div>
                <div className="flex items-center gap-2 pt-2 sm:pt-7">
                  <button type="button" disabled={stepIndex === 0} onClick={() => moveStepLocal(stepIndex, -1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30" aria-label="تحريك الخطوة لأعلى"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={stepIndex === steps.length - 1} onClick={() => moveStepLocal(stepIndex, 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30" aria-label="تحريك الخطوة لأسفل"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => addField(stepIndex)} className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black"><Plus className="h-3.5 w-3.5" />سؤال</button>
                  <button type="button" onClick={() => setSteps((current) => current.filter((_, index) => index !== stepIndex))} className="inline-flex h-10 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-xs font-black text-red-700"><Trash2 className="h-3.5 w-3.5" />حذف</button>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {step.fields.map((field, fieldIndex) => (
                  <div key={field.key} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
                    <FieldInputLabel label={`السؤال ${fieldIndex + 1}`}><input value={field.labelAr} onChange={(event) => updateField(stepIndex, fieldIndex, { labelAr: event.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 font-normal" /></FieldInputLabel>
                    <FieldInputLabel label="نوع الإجابة"><select value={field.type} onChange={(event) => updateField(stepIndex, fieldIndex, { type: event.target.value as WizardFieldDefinition["type"] })} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal">{!["text", "textarea", "number", "money", "date", "checkbox", "select", "radio"].includes(field.type) && <option value={field.type}>{fieldTypeLabels[field.type]}</option>}<option value="text">نص</option><option value="textarea">نص طويل</option><option value="number">رقم</option><option value="money">مبلغ</option><option value="date">تاريخ</option><option value="checkbox">اختيار نعم/لا</option><option value="select">قائمة اختيار</option><option value="radio">اختيار واحد</option></select></FieldInputLabel>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={fieldIndex === 0} onClick={() => moveFieldLocal(stepIndex, fieldIndex, -1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30" aria-label="تحريك السؤال لأعلى"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={fieldIndex === step.fields.length - 1} onClick={() => moveFieldLocal(stepIndex, fieldIndex, 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30" aria-label="تحريك السؤال لأسفل"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setSteps((current) => current.map((item, index) => index === stepIndex ? { ...item, fields: item.fields.filter((_, index2) => index2 !== fieldIndex) } : item))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-700" aria-label="حذف السؤال"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {(field.type === "select" || field.type === "radio") && <div className="sm:col-span-3"><FieldInputLabel label="الاختيارات — كل اختيار في سطر"><textarea value={(field.options ?? []).map((option) => option.labelAr).join("\n")} onChange={(event) => updateField(stepIndex, fieldIndex, { options: event.target.value.split("\n").map((labelAr) => labelAr.trim()).filter(Boolean).map((labelAr, optionIndex) => ({ value: field.options?.[optionIndex]?.value ?? `option_${optionIndex + 1}`, labelAr })) })} rows={3} className="w-full rounded-lg border border-slate-200 p-2.5 font-normal leading-6" /></FieldInputLabel></div>}
                    <label className="sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(stepIndex, fieldIndex, { required: event.target.checked })} className="h-4 w-4 accent-[#986410]" />هذا السؤال مطلوب عند اختيار الملحق</label>
                  </div>
                ))}
                {!step.fields.length && <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-500">لا توجد أسئلة إضافية في هذه الخطوة.</div>}
              </div>
            </div>
          ))}
          {!steps.length && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">هذا الملحق لا يضيف خطوات جديدة حاليًا.</div>}
        </div>
      </div>
      <DefaultValuesBuilder name="defaultFieldValues" values={value?.defaultFieldValues} fieldOptions={defaultFieldOptions} />
    </div>
  );
}

function ClauseSettingsForm({
  clause,
  availableFields,
  busy,
  onCancel,
  onSubmit,
}: {
  clause?: LegalClauseDefinition;
  availableFields: Array<{ key: string; label: string }>;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [body, setBody] = useState(clause?.bodyAr ?? "");
  const [selectedFieldKey, setSelectedFieldKey] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable() {
    if (!selectedFieldKey) return;
    const token = `{{${selectedFieldKey}}}`;
    const element = bodyRef.current;
    const start = element?.selectionStart ?? body.length;
    const end = element?.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      const cursor = start + token.length;
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 bg-slate-50/70 p-5">
      <input type="hidden" name="key" value={clause?.key ?? ""} />

      <FieldEditorSection title="صياغة البند" description="اكتب النص كما سيظهر داخل العقد، وأدرج بيانات العميل من القائمة بدون حفظ مفاتيح تقنية.">
        <FieldInputLabel label="عنوان المادة">
          <input name="titleAr" required defaultValue={clause?.titleAr} placeholder="مثال: مدة العقد" className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
        </FieldInputLabel>
        <FieldInputLabel label="النص القانوني">
          <textarea ref={bodyRef} name="bodyAr" required rows={14} value={body} onChange={(event) => setBody(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm leading-8 font-normal" placeholder="اكتب نص البند هنا." />
        </FieldInputLabel>

        {availableFields.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-black text-[#00102e]">إدراج بيانات من إجابات العميل</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">ضع المؤشر في مكان البيانات داخل النص، اختر السؤال، ثم اضغط إدراج.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select value={selectedFieldKey} onChange={(event) => setSelectedFieldKey(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal">
                <option value="">اختر بيانات العميل...</option>
                {availableFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
              </select>
              <button type="button" disabled={!selectedFieldKey} onClick={insertVariable} className="rounded-xl bg-[#00102e] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">إدراج في النص</button>
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
          <input name="enabled" type="checkbox" defaultChecked={clause?.enabled !== false} className="h-4 w-4 accent-[#986410]" />
          البند مفعّل في هذا الإصدار
        </label>
      </FieldEditorSection>

      <FieldEditorSection title="شرح مبسط للمستخدم" description="يظهر بجانب علامة (!) ولا يدخل ضمن نص العقد.">
        <textarea name="guidance" rows={4} defaultValue={clause?.guidance} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-7 font-normal" placeholder="اشرح المقصود بالبند بلغة بسيطة." />
      </FieldEditorSection>

      <TechnicalDetails title="الربط والمصدر — إعدادات متقدمة">
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-500">المتغيرات الموجودة داخل النص تُكتشف تلقائيًا. استخدم الحقل التالي فقط لإضافة مفاتيح خاصة لا تظهر داخل النص مباشرة.</p>
        <FieldInputLabel label="متغيرات إضافية — يفصل بينها فاصلة" mono>
          <input name="variables" dir="ltr" defaultValue={clause?.variables?.join(", ")} placeholder="special_value" className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
        </FieldInputLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldInputLabel label="ملف المصدر">
            <input name="sourceDocumentName" defaultValue={clause?.sourceDocumentName} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
          </FieldInputLabel>
          <FieldInputLabel label="من صفحة">
            <input name="sourcePageStart" type="number" min="1" defaultValue={clause?.sourcePageStart} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
          </FieldInputLabel>
          <FieldInputLabel label="إلى صفحة">
            <input name="sourcePageEnd" type="number" min="1" defaultValue={clause?.sourcePageEnd} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
          </FieldInputLabel>
        </div>
        <ConditionFields value={clause?.visibleWhen} fieldKeys={availableFields.map((field) => field.key)} />
      </TechnicalDetails>

      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  );
}

function VariantClauseSelectionPanel({
  variants,
  clauses,
  readOnly,
  busy,
  onSave,
}: {
  variants: ContractVariantDefinition[];
  clauses: LegalClauseDefinition[];
  readOnly: boolean;
  busy: boolean;
  onSave: (variant: ContractVariantDefinition, requiredClauseKeys: string[]) => void;
}) {
  const enabledClauses = useMemo(() => clauses.filter((clause) => clause.enabled !== false), [clauses]);
  const [search, setSearch] = useState("");
  const [selectedByVariant, setSelectedByVariant] = useState<Record<string, string[]>>(
    () => Object.fromEntries(variants.map((variant) => [variant.key, variant.requiredClauseKeys ?? []])),
  );

  const filteredClauses = useMemo(() => {
    const clean = search.trim().toLowerCase();
    if (!clean) return enabledClauses;
    return enabledClauses.filter((clause) => `${clause.titleAr} ${clause.key} ${clause.sourceDocumentName ?? ""}`.toLowerCase().includes(clean));
  }, [enabledClauses, search]);

  const groupedClauses = useMemo(() => {
    const groups = new Map<string, LegalClauseDefinition[]>();
    filteredClauses.forEach((clause) => {
      const groupName = clause.sourceDocumentName || "بنود عامة";
      groups.set(groupName, [...(groups.get(groupName) ?? []), clause]);
    });
    return Array.from(groups.entries());
  }, [filteredClauses]);

  function toggleClause(variantKey: string, clauseKey: string, checked: boolean) {
    setSelectedByVariant((current) => {
      const previous = current[variantKey] ?? [];
      const next = checked ? [...new Set([...previous, clauseKey])] : previous.filter((key) => key !== clauseKey);
      return { ...current, [variantKey]: next };
    });
  }

  if (!variants.length || !enabledClauses.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-[#00102e]">اختيار البنود الأساسية لكل نسخة</h3>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">نفس بيانات البنود القديمة، لكن مكانها الصحيح هنا داخل صياغة العقد.</p>
        </div>
        <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="ابحث في البنود" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#986410] lg:w-72" />
      </div>

      <div className="mt-4 space-y-3">
        {variants.map((variant) => {
          const selectedKeys = selectedByVariant[variant.key] ?? [];
          return (
            <details key={variant.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3" open={variants.length === 1}>
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-[#00102e]">{variant.nameAr}</span>
                    <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">{selectedKeys.length} محدد</span>
                  </div>
                  {!readOnly && <button type="button" disabled={busy} onClick={(event) => { event.preventDefault(); onSave(variant, selectedKeys); }} className="rounded-lg bg-[#00102e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">حفظ اختيار البنود</button>}
                </div>
              </summary>

              <div className="mt-3 space-y-3">
                {groupedClauses.map(([groupName, groupClauses]) => (
                  <div key={`${variant.key}:${groupName}`} className="rounded-xl bg-white p-3">
                    <div className="mb-2 text-xs font-bold text-slate-500">{groupName}</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {groupClauses.map((clause) => {
                        const checked = selectedKeys.includes(clause.key);
                        return (
                          <label key={clause.key} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs transition ${checked ? "border-[#986410]/50 bg-[#986410]/5" : "border-slate-200 hover:border-slate-300"}`}>
                            <input type="checkbox" checked={checked} disabled={readOnly} onChange={(event) => toggleClause(variant.key, clause.key, event.target.checked)} className="mt-1 h-4 w-4 accent-[#986410]" />
                            <span className="min-w-0">
                              <span className="block font-bold text-slate-800">{clause.titleAr}</span>
                              {clause.guidance && <span className="mt-1 line-clamp-1 block text-[11px] font-medium leading-5 text-slate-500">{clause.guidance}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!filteredClauses.length && <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs font-bold text-slate-500">لا توجد بنود مطابقة للبحث.</div>}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function VariantSettingsForm({
  version,
  value,
  busy,
  onCancel,
  onSubmit,
}: {
  version: Version;
  value?: ContractVariantDefinition;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const currentIndex = value ? version.definition.variants.findIndex((variant) => variant.key === value.key) : -1;

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-5">
      <input type="hidden" name="key" value={value?.key ?? ""} />
      <input type="hidden" name="documentTitleAr" value={value?.documentTitleAr ?? ""} />
      <input type="hidden" name="sourceDocumentName" value={value?.sourceDocumentName ?? ""} />
      <input type="hidden" name="requiredClauseKeys" value={value?.requiredClauseKeys.join(", ") ?? ""} />
      <input type="hidden" name="allowedOptionalClauseKeys" value={value?.allowedOptionalClauseKeys.join(", ") ?? ""} />
      <input type="hidden" name="defaultFieldValues" value={JSON.stringify(value?.defaultFieldValues ?? {})} />

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldInputLabel label="اسم نسخة العقد">
          <input name="nameAr" required defaultValue={value?.nameAr} placeholder="مثال: عقد إيجار سكني" className="w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" />
        </FieldInputLabel>
        {value && (
          <FieldInputLabel label="ترتيب الظهور">
            <select name="moveToIndex" defaultValue={currentIndex >= 0 ? currentIndex : 0} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal">
              {version.definition.variants.map((variant, index) => (
                <option key={variant.key} value={index}>{index + 1} — {variant.nameAr}</option>
              ))}
            </select>
          </FieldInputLabel>
        )}
        <div className="sm:col-span-2">
          <FieldInputLabel label="وصف داخلي اختياري">
            <textarea name="description" rows={3} defaultValue={value?.description} placeholder="ملاحظة مختصرة للفريق عن استخدام هذه النسخة." className="w-full rounded-xl border border-slate-200 p-3 text-sm font-normal leading-6" />
          </FieldInputLabel>
        </div>
      </div>
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-500">
        اختيار البنود القانونية اتنقل لمرحلة «صياغة العقد» حتى يفضل تعديل النسخة خفيف وواضح.
      </p>
      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  );
}

function StepSettingsForm({
  version,
  value,
  busy,
  onCancel,
  onSubmit,
}: {
  version: Version;
  value?: WizardStepDefinition;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5 p-6">
      <input type="hidden" name="key" value={value?.key ?? ""} />
      <FieldEditorSection title="بيانات الخطوة" description="الخطوة تظهر للعميل كعنوان مجموعة أسئلة داخل العقد.">
        <FieldInputLabel label="عنوان الخطوة">
          <input name="titleAr" required defaultValue={value?.titleAr} placeholder="مثال: بيانات الطرف الأول" className="w-full rounded-xl border border-slate-200 p-3 font-normal" />
        </FieldInputLabel>
        <FieldInputLabel label="وصف يظهر أعلى أسئلة الخطوة">
          <textarea name="description" rows={3} defaultValue={value?.description} placeholder="اختياري: وضّح للعميل المطلوب في هذه الخطوة." className="w-full rounded-xl border border-slate-200 p-3 font-normal leading-7" />
        </FieldInputLabel>
      </FieldEditorSection>

      <TechnicalDetails>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInputLabel label="نطاق المواد">
            <input name="articleRange" defaultValue={value?.articleRange} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
          </FieldInputLabel>
          <FieldInputLabel label="رمز البند المصدر" mono>
            <input name="sourceClauseKey" defaultValue={value?.sourceClauseKey} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
          </FieldInputLabel>
        </div>
        <ConditionFields value={value?.visibleWhen} fieldKeys={version.definition.variants.flatMap((variantItem) => variantItem.steps.flatMap((step) => step.fields.map((field) => field.key)))} />
      </TechnicalDetails>

      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  );
}

function previewOptionsFromText(text: string): Array<{ value: string; labelAr: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...labelParts] = line.split("|");
      return { value: value.trim(), labelAr: labelParts.join("|").trim() || value.trim() };
    });
}

type AttachmentPreset = "images_pdf" | "images" | "pdf" | "any" | "custom";

function attachmentPresetFromTypes(types?: string[]): AttachmentPreset {
  if (!types?.length) return "any";
  const normalized = [...types].sort().join(",");
  if (normalized === ["application/pdf", "image/*"].sort().join(",")) return "images_pdf";
  if (normalized === "image/*") return "images";
  if (normalized === "application/pdf") return "pdf";
  return "custom";
}

function attachmentTypesForPreset(preset: AttachmentPreset, previous?: string[]): string[] | undefined {
  if (preset === "images_pdf") return ["image/*", "application/pdf"];
  if (preset === "images") return ["image/*"];
  if (preset === "pdf") return ["application/pdf"];
  if (preset === "custom") return previous ?? [];
  return undefined;
}

function bytesToMegabytes(value?: number): string {
  if (!value) return "";
  return String(Math.max(1, Math.round(value / 1024 / 1024)));
}

function megabytesToBytes(value: FormDataEntryValue | null): number | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed * 1024 * 1024);
}

function FieldLivePreview({ label, type, required, placeholder, helpText, optionsTextValue }: { label: string; type: WizardFieldDefinition["type"]; required: boolean; placeholder: string; helpText: string; optionsTextValue: string }) {
  const options = previewOptionsFromText(optionsTextValue);
  const title = label.trim() || "اسم السؤال";
  const base = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500";

  return (
    <aside className="sticky top-4 h-fit rounded-3xl border border-[#986410]/20 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-base font-black text-[#00102e]"><Eye className="h-4 w-4 text-[#986410]" />معاينة السؤال</div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="mb-2 block text-sm font-black text-slate-800">
          {title} {required && <span className="text-rose-700">*</span>}
        </label>
        {type === "textarea" ? (
          <div className={`${base} min-h-24`}>{placeholder || "نص طويل..."}</div>
        ) : type === "select" || type === "radio" ? (
          <div className="grid gap-2">
            {(options.length ? options : [{ value: "option_1", labelAr: "اختيار أول" }, { value: "option_2", labelAr: "اختيار ثاني" }]).slice(0, 3).map((option) => (
              <div key={option.value} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">{option.labelAr}</div>
            ))}
          </div>
        ) : type === "checkbox" ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">{title}</div>
        ) : type === "attachment" ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-3 py-5 text-center text-sm font-bold text-slate-500">رفع ملف أو صورة</div>
        ) : type === "date" ? (
          <div className={base}>اليوم / الشهر / السنة</div>
        ) : (
          <div className={base}>{placeholder || (type === "money" ? "0.00" : "يكتب العميل هنا")}</div>
        )}
        {helpText.trim() && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-900">! {helpText}</div>}
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">هذه معاينة لشكل السؤال للعميل، وليست حفظًا للتغيير.</p>
    </aside>
  );
}

function CustomerFieldPreview({ field }: { field: WizardFieldDefinition }) {
  const base = "rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-500";
  const options = field.options ?? [];

  return (
    <div className="space-y-2">
      <div className="text-sm font-bold text-slate-800">
        {field.labelAr} {field.required && <span className="text-rose-700">*</span>}
      </div>

      {field.type === "textarea" ? (
        <div className={`${base} min-h-20`}>{field.placeholder || "اكتب الإجابة هنا"}</div>
      ) : field.type === "select" ? (
        <div className={base}>{field.placeholder || options[0]?.labelAr || "اختر من القائمة"}</div>
      ) : field.type === "radio" ? (
        <div className="grid gap-2">
          {(options.length ? options : [{ value: "option_1", labelAr: "اختيار أول" }, { value: "option_2", labelAr: "اختيار ثانٍ" }]).slice(0, 4).map((option) => (
            <div key={option.value} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700">
              <span className="h-4 w-4 rounded-full border border-slate-300 bg-white" />
              {option.labelAr}
            </div>
          ))}
        </div>
      ) : field.type === "checkbox" ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700">
          <span className="h-4 w-4 rounded border border-slate-300 bg-white" />
          {field.placeholder || field.labelAr}
        </div>
      ) : field.type === "attachment" ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm font-semibold text-slate-500">رفع ملف أو صورة</div>
      ) : field.type === "repeater" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid min-w-[320px] grid-cols-2 gap-px bg-slate-200 text-xs font-bold text-slate-600">
            {(field.columns?.length ? field.columns : [{ key: "column_1", labelAr: "البيان", type: "text" }, { key: "column_2", labelAr: "القيمة", type: "text" }]).slice(0, 4).map((column) => (
              <div key={column.key} className="bg-slate-50 px-3 py-2.5">{column.labelAr}</div>
            ))}
          </div>
          <div className="px-3 py-3 text-xs font-semibold text-slate-400">سيضيف العميل البيانات في صفوف الجدول.</div>
        </div>
      ) : field.type === "date" ? (
        <div className={base}>اليوم / الشهر / السنة</div>
      ) : field.type === "money" ? (
        <div className={base}>{field.placeholder || "0.00"}</div>
      ) : field.type === "number" ? (
        <div className={base}>{field.placeholder || "0"}</div>
      ) : (
        <div className={base}>{field.placeholder || "اكتب الإجابة هنا"}</div>
      )}

      {field.helpText && <div className="text-xs font-semibold leading-5 text-slate-500">{field.helpText}</div>}
    </div>
  );
}

function FieldSettingsForm({
  field,
  fieldKeys,
  busy,
  onCancel,
  onSubmit,
}: {
  field?: WizardFieldDefinition;
  fieldKeys: string[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const activeField: WizardFieldDefinition = field ?? { key: "", type: "text", labelAr: "" };
  const [label, setLabel] = useState(field?.labelAr ?? "");
  const [type, setType] = useState<WizardFieldDefinition["type"]>(field?.type ?? "text");
  const [required, setRequired] = useState(Boolean(field?.required));
  const [placeholder, setPlaceholder] = useState(field?.placeholder ?? "");
  const [helpText, setHelpText] = useState(field?.helpText ?? "");
  const [optionsTextValue, setOptionsTextValue] = useState(optionsText(field));
  const [filePreset, setFilePreset] = useState<AttachmentPreset>(attachmentPresetFromTypes(field?.attachmentRules?.acceptedTypes));
  const [acceptedTypes, setAcceptedTypes] = useState<string[]>(field?.attachmentRules?.acceptedTypes ?? []);
  const [maxFileMegabytes, setMaxFileMegabytes] = useState(bytesToMegabytes(field?.attachmentRules?.maxBytes));

  return (
    <form onSubmit={onSubmit} className="space-y-5 bg-slate-50/70 p-5">
      <input type="hidden" name="key" value={field?.key ?? ""} />
      <div className="rounded-2xl border border-[#986410]/20 bg-[#986410]/5 p-4">
        <div className="text-sm font-black text-[#00102e]">{field ? field.labelAr : "سؤال جديد"}</div>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          عدّل النص الذي يراه العميل وشاهد معاينة فورية. الإعدادات التقنية مطوية بالأسفل.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <FieldEditorSection title="السؤال الذي يظهر للعميل" description="اكتب الاسم ونوع الإدخال وهل هو إجباري.">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInputLabel label="اسم السؤال">
                <input name="labelAr" required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="مثال: اسم المالك" className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
              </FieldInputLabel>
              <FieldInputLabel label="نوع الإدخال">
                <select name="type" value={type} onChange={(event) => setType(event.target.value as WizardFieldDefinition["type"])} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal">
                  {Object.entries(fieldTypeLabels).map(([key, typeLabel]) => <option key={key} value={key}>{typeLabel}</option>)}
                </select>
              </FieldInputLabel>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleCard name="required" checked={required} onChange={setRequired} title="إجباري" description="لا يستطيع العميل المتابعة قبل إدخال قيمة." />
              <label className="flex min-h-[68px] cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs transition hover:border-[#986410]/40 hover:bg-white">
                <input name="numberToWords" type="checkbox" defaultChecked={field?.numberToWords} className="mt-1 h-4 w-4 accent-[#986410]" />
                <span>
                  <span className="block font-black text-slate-800">تحويل الرقم كتابة</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">مناسب للمبالغ أو الأرقام التي تظهر مكتوبة في العقد.</span>
                </span>
              </label>
            </div>
            <input type="hidden" name="requiredPreview" value={required ? "1" : "0"} />
          </FieldEditorSection>

          <FieldEditorSection title="النصوص والإرشاد" description="النص داخل الحقل يساعد العميل، والإرشاد يظهر بجانب علامة التوضيح.">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInputLabel label="نص داخل الحقل">
                <input name="placeholder" value={placeholder} onChange={(event) => setPlaceholder(event.target.value)} placeholder="مثال: اكتب الاسم رباعي" className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
              </FieldInputLabel>
              <FieldInputLabel label="إرشاد مختصر للعميل">
                <input name="helpText" value={helpText} onChange={(event) => setHelpText(event.target.value)} placeholder="شرح مختصر يظهر بجانب علامة (!)" className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
              </FieldInputLabel>
            </div>
            {(type === "select" || type === "radio") && (
              <FieldInputLabel label="الاختيارات — كل اختيار في سطر">
                <textarea name="options" rows={5} value={optionsTextValue} onChange={(event) => setOptionsTextValue(event.target.value)} placeholder={"نقدي\nتحويل بنكي\nشيك"} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal leading-7" />
              </FieldInputLabel>
            )}
            {type !== "select" && type !== "radio" && <input type="hidden" name="options" value="" />}
          </FieldEditorSection>

          <details open={Boolean(field?.validation && Object.keys(field.validation).length)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer list-none text-sm font-black text-[#00102e] [&::-webkit-details-marker]:hidden">
              قواعد الإدخال والتحقق — اختياري
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">افتحها فقط عندما تحتاج حدًا أدنى أو أقصى أو تحققًا خاصًا.</span>
            </summary>
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldInputLabel label="أقل قيمة"><input name="min" type="number" defaultValue={field?.validation?.min} className="w-full rounded-lg border border-slate-200 bg-white p-2 font-normal" /></FieldInputLabel>
              <FieldInputLabel label="أكبر قيمة"><input name="max" type="number" defaultValue={field?.validation?.max} className="w-full rounded-lg border border-slate-200 bg-white p-2 font-normal" /></FieldInputLabel>
              <FieldInputLabel label="عدد الأرقام المتوقع"><input name="expectedDigits" type="number" defaultValue={field?.validation?.expectedDigits} className="w-full rounded-lg border border-slate-200 bg-white p-2 font-normal" /></FieldInputLabel>
              <FieldInputLabel label="أقل عدد حروف"><input name="minLength" type="number" defaultValue={field?.validation?.minLength} className="w-full rounded-lg border border-slate-200 bg-white p-2 font-normal" /></FieldInputLabel>
              <FieldInputLabel label="أكبر عدد حروف"><input name="maxLength" type="number" defaultValue={field?.validation?.maxLength} className="w-full rounded-lg border border-slate-200 bg-white p-2 font-normal" /></FieldInputLabel>
              <FieldInputLabel label="نمط خاص للتحقق" mono><input name="pattern" dir="ltr" defaultValue={field?.validation?.pattern} className="w-full rounded-lg border border-slate-200 bg-white p-2 font-normal" /></FieldInputLabel>
            </div>
          </details>

          {type === "attachment" && (
            <details open={type === "attachment"} className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <summary className="cursor-pointer list-none text-sm font-black text-sky-950 [&::-webkit-details-marker]:hidden">إعدادات رفع الملفات</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="acceptedTypes" value={acceptedTypes.join(", ")} />
                <FieldInputLabel label="نوع الملف المقبول">
                  <select value={filePreset} onChange={(event) => {
                    const nextPreset = event.target.value as AttachmentPreset;
                    setFilePreset(nextPreset);
                    setAcceptedTypes(attachmentTypesForPreset(nextPreset, acceptedTypes) ?? []);
                  }} className="w-full rounded-lg border border-sky-200 bg-white p-3 font-normal">
                    <option value="images_pdf">صور أو PDF</option>
                    <option value="images">صور فقط</option>
                    <option value="pdf">PDF فقط</option>
                    <option value="any">أي ملف مناسب</option>
                    <option value="custom">تخصيص متقدم</option>
                  </select>
                </FieldInputLabel>
                <FieldInputLabel label="أقصى عدد ملفات"><input name="maxFiles" type="number" min="1" defaultValue={field?.attachmentRules?.maxFiles} className="w-full rounded-lg border border-sky-200 bg-white p-3 font-normal" /></FieldInputLabel>
                <FieldInputLabel label="أقصى حجم للملف">
                  <div className="flex overflow-hidden rounded-lg border border-sky-200 bg-white">
                    <input name="maxFileMegabytes" type="number" min="1" value={maxFileMegabytes} onChange={(event) => setMaxFileMegabytes(event.target.value)} className="min-w-0 flex-1 p-3 font-normal outline-none" />
                    <span className="border-r border-sky-100 px-3 py-3 text-sm font-black text-sky-800">MB</span>
                  </div>
                </FieldInputLabel>
                {filePreset === "custom" && (
                  <FieldInputLabel label="صيغ مخصصة" mono>
                    <input value={acceptedTypes.join(", ")} onChange={(event) => setAcceptedTypes(event.target.value.split(/[,،\n]/).map((item) => item.trim()).filter(Boolean))} placeholder="image/*, application/pdf" className="w-full rounded-lg border border-sky-200 bg-white p-3 font-normal" />
                  </FieldInputLabel>
                )}
                <ToggleCard name="requireFrontBack" defaultChecked={field?.attachmentRules?.requireFrontBack} title="يشترط وجه وظهر" description="للصور مثل البطاقة أو الرخصة." />
              </div>
            </details>
          )}
          {type !== "attachment" && (
            <>
              <input type="hidden" name="acceptedTypes" value={field?.attachmentRules?.acceptedTypes?.join(", ") ?? ""} />
              <input type="hidden" name="maxFiles" value={field?.attachmentRules?.maxFiles ?? ""} />
              <input type="hidden" name="maxBytes" value={field?.attachmentRules?.maxBytes ?? ""} />
              <input type="hidden" name="maxFileMegabytes" value="" />
            </>
          )}

          {type === "repeater" && (
            <details open={type === "repeater"} className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer list-none text-sm font-black text-[#00102e] [&::-webkit-details-marker]:hidden">إعداد الجدول المتكرر</summary>
              <div className="mt-4 space-y-3">
                <FieldInputLabel label="الحد الأدنى للصفوف"><input name="minRows" type="number" min="0" defaultValue={field?.minRows} className="w-full rounded-lg border border-slate-200 p-2 font-normal" /></FieldInputLabel>
                <RepeaterColumnsBuilder columns={field?.columns} />
              </div>
            </details>
          )}

          {type !== "repeater" && (
            <>
              <input type="hidden" name="minRows" value={field?.minRows ?? ""} />
              <input type="hidden" name="columns" value={JSON.stringify(field?.columns ?? [])} />
            </>
          )}

          <TechnicalDetails>
            <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-500">هذه إعدادات تقنية اختيارية لا يحتاجها الاستخدام اليومي.</p>
            <ConditionFields value={field?.visibleWhen} fieldKeys={fieldKeys} title="شرط الظهور" />
            <FieldAdvancedControls field={activeField} fieldKeys={fieldKeys} />
          </TechnicalDetails>

          <FormActions busy={busy} onCancel={onCancel} />
        </div>
        <FieldLivePreview label={label} type={type} required={required} placeholder={placeholder} helpText={helpText} optionsTextValue={optionsTextValue} />
      </div>
    </form>
  );
}

function FieldBadge({ field }: { field: WizardFieldDefinition }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{fieldTypeLabels[field.type]}</span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${field.required ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}`}>
        {field.required ? "إجباري" : "اختياري"}
      </span>
      {field.visibleWhen && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800">شرطي</span>}
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
  const [canEdit] = useState(() => hasBackendPermission("templates.edit", "templates.manage"));
  const [canPublish] = useState(() => hasBackendPermission("templates.publish", "templates.manage"));
  const [clauseSearch, setClauseSearch] = useState("");
  const [previewVariant, setPreviewVariant] = useState("");
  const [previewOptionals, setPreviewOptionals] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [customerPreviewOpen, setCustomerPreviewOpen] = useState(false);
  const [returnReviewOpen, setReturnReviewOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [readinessDirty, setReadinessDirty] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [dragItem, setDragItem] = useState<ReorderDragItem | null>(null);
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
    // Load remote editor state once the version id is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!customerPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCustomerPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [customerPreviewOpen]);

  const readOnly = version?.status !== "draft" || !canEdit;
  const canEditGuidance = Boolean(canEdit && version?.status !== "archived");
  const allFieldKeys = useMemo(() => {
    if (!version) return [];
    return [...new Set(version.definition.variants.flatMap((variant) => variant.steps.flatMap((step) => step.fields.map((field) => field.key))))].sort();
  }, [version]);

  const availableClauseFields = useMemo(() => {
    if (!version) return [];
    const seen = new Set<string>();
    return version.definition.variants.flatMap((variant) => variant.steps.flatMap((step) => step.fields.map((field) => ({
      key: field.key,
      label: `${variant.nameAr} — ${step.titleAr} — ${field.labelAr}`,
    })))).filter((field) => {
      if (seen.has(field.key)) return false;
      seen.add(field.key);
      return true;
    });
  }, [version]);

  async function goToTab(nextTab: TabKey) {
    if (nextTab === activeTab) return;
    if (activeTab === "readiness" && readinessDirty) {
      const shouldLeave = await confirm({
        title: "تغييرات غير محفوظة",
        message: "لديك تعديلات في صفحة «أنت جاهز؟» لم تُحفظ بعد. إذا غادرت الآن ستفقد هذه التعديلات.",
        confirmLabel: "مغادرة بدون حفظ",
        danger: true,
      });
      if (!shouldLeave) return;
      setReadinessDirty(false);
    }
    setActiveTab(nextTab);
  }

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

  async function saveReadiness(variantKey: string, readiness: NonNullable<ContractVariantDefinition["readiness"]>) {
    if (!version) return;
    const definition: ContractTemplateDefinition = {
      ...version.definition,
      variants: version.definition.variants.map((variant) => variant.key === variantKey ? { ...variant, readiness } : variant),
    };
    await mutate(`/api/v1/admin/templates/versions/${version.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        definition,
        changeSummary: version.changeSummary,
        legalReference: version.legalReference,
        effectiveFrom: version.effectiveFrom || undefined,
      }),
    }, "تم حفظ صفحة أنت جاهز؟");
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
    const variantKey = value?.key ?? optionalText(form.get("key")) ?? "";
    const moveToIndexRaw = form.get("moveToIndex");
    const moveToIndex = moveToIndexRaw === null || moveToIndexRaw === "" ? undefined : Number(moveToIndexRaw);
    const variant = {
      key: variantKey,
      nameAr: String(form.get("nameAr") || "").trim(),
      description: String(form.get("description") || "").trim(),
      documentTitleAr: optionalText(form.get("documentTitleAr")),
      sourceDocumentName: optionalText(form.get("sourceDocumentName")),
      requiredClauseKeys: splitCsv(form.get("requiredClauseKeys")),
      allowedOptionalClauseKeys: splitCsv(form.get("allowedOptionalClauseKeys")),
      defaultFieldValues: parseJson<Record<string, ContractFieldValue>>(form.get("defaultFieldValues"), value?.defaultFieldValues ?? {}, "القيم الافتراضية"),
      steps: value?.steps ?? [],
      ...(value && Number.isFinite(moveToIndex) ? { moveToIndex } : {}),
    };
    await mutate(
      value ? `/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(value.key)}` : `/api/v1/admin/templates/versions/${version.id}/variants`,
      { method: value ? "PATCH" : "POST", body: JSON.stringify({ variant }) },
      value ? "تم تعديل نسخة العقد" : "تمت إضافة نسخة العقد",
    );
  }

  async function saveVariantClauseSelection(variant: ContractVariantDefinition, requiredClauseKeys: string[]) {
    if (!version) return;
    await mutate(
      `/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variant.key)}`,
      { method: "PATCH", body: JSON.stringify({ variant: { requiredClauseKeys } }) },
      "تم حفظ بنود نسخة العقد",
    );
  }

  async function submitStep(event: FormEvent<HTMLFormElement>, variantKey: string, value?: WizardStepDefinition) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    const stepKey = value?.key ?? optionalText(form.get("key")) ?? "";
    const step = {
      key: stepKey,
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
      const fieldKey = value?.key ?? optionalText(form.get("key")) ?? "";
      const maxBytes = Number(form.get("maxBytes") || 0) > 0 ? Number(form.get("maxBytes")) : megabytesToBytes(form.get("maxFileMegabytes"));
      const field: WizardFieldDefinition = {
        key: fieldKey,
        type,
        labelAr: String(form.get("labelAr") || "").trim(),
        placeholder: optionalText(form.get("placeholder")),
        helpText: optionalText(form.get("helpText")),
        required: form.get("required") === "on",
        requiredWhen: buildCondition(form, "requiredWhen"),
        visibleWhen: buildCondition(form, "condition"),
        printInDocument: form.get("printInDocument") === "on",
        dataScope: optionalText(form.get("dataScope")) as WizardFieldDefinition["dataScope"],
        dataSource: optionalText(form.get("dataSource")),
        editable: form.get("editable") === "on",
        documentMapping: optionalText(form.get("documentMapping")),
        manualCheckbox: form.get("manualCheckbox") === "on",
        ...(Number(form.get("blankRows") || 0) > 0 ? { blankRows: Number(form.get("blankRows")) } : {}),
        ...(splitCsv(form.get("blankRowLabels")).length ? { blankRowLabels: splitCsv(form.get("blankRowLabels")) } : {}),
        ...(form.get("numberToWords") === "on" ? { numberToWords: true } : {}),
        ...(type === "attachment" ? {
          attachmentRules: {
            acceptedTypes: splitCsv(form.get("acceptedTypes")),
            ...(Number(form.get("maxFiles") || 0) > 0 ? { maxFiles: Number(form.get("maxFiles")) } : {}),
            ...(maxBytes ? { maxBytes } : {}),
            ...(form.get("requireFrontBack") === "on" ? { requireFrontBack: true } : {}),
          },
        } : {}),
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

  async function submitFieldHelp(event: FormEvent<HTMLFormElement>, variantKey: string, stepKey: string, value: WizardFieldDefinition) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    await mutate(`/api/v1/admin/templates/versions/${version.id}/fields/${encodeURIComponent(value.key)}/help`, {
      method: "PATCH",
      body: JSON.stringify({ variantKey, stepKey, helpText: optionalText(form.get("helpText")) ?? null, helpRef: optionalText(form.get("helpRef")) ?? null }),
    }, "تم تحديث مساعدة الحقل دون إنشاء Version جديدة");
  }

  async function submitClause(event: FormEvent<HTMLFormElement>, value?: LegalClauseDefinition) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    const bodyAr = String(form.get("bodyAr") || "").trim();
    const variablesFromBody = [...bodyAr.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((match) => match[1].trim()).filter(Boolean);
    const clause: LegalClauseDefinition = {
      key: value?.key ?? String(form.get("key") || "").trim(),
      titleAr: String(form.get("titleAr") || "").trim(),
      bodyAr,
      guidance: optionalText(form.get("guidance")),
      enabled: form.get("enabled") === "on",
      variables: [...new Set([...splitCsv(form.get("variables")), ...variablesFromBody])],
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

  async function submitClauseGuidance(event: FormEvent<HTMLFormElement>, value: LegalClauseDefinition) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    await mutate(`/api/v1/admin/templates/versions/${version.id}/clauses/${encodeURIComponent(value.key)}/guidance`, {
      method: "PATCH",
      body: JSON.stringify({ guidance: optionalText(form.get("guidance")) ?? null }),
    }, "تم تحديث الإرشاد دون إنشاء Version جديدة");
  }

  async function submitOptional(event: FormEvent<HTMLFormElement>, value?: OptionalClauseDefinition) {
    event.preventDefault();
    if (!version) return;
    try {
      const form = new FormData(event.currentTarget);
      const selectedLegalClauseKeys = form.getAll("legalClauseKeys").map(String).filter(Boolean);
      const optionalClause: OptionalClauseDefinition = {
        key: value?.key ?? String(form.get("key") || "").trim(),
        nameAr: String(form.get("nameAr") || "").trim(),
        description: String(form.get("description") || "").trim(),
        documentTitleAr: optionalText(form.get("documentTitleAr")),
        sourceDocumentName: optionalText(form.get("sourceDocumentName")),
        outputMode: String(form.get("outputMode") || "inline") as "inline" | "separate_annex",
        applicableVariantKeys: form.getAll("applicableVariantKeys").map(String),
        insertBeforeStepKey: String(form.get("insertBeforeStepKey") || "").trim(),
        legalClauseKeys: selectedLegalClauseKeys.length ? selectedLegalClauseKeys : splitCsv(form.get("legalClauseKeys")),
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

  async function moveVariantToIndex(variant: ContractVariantDefinition, target: number) {
    if (!version || target < 0 || target >= version.definition.variants.length) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variant.key)}`, {
      method: "PATCH",
      body: JSON.stringify({ variant: { moveToIndex: target } }),
    }, "تم تغيير ترتيب نسخة العقد");
  }

  async function moveVariant(variant: ContractVariantDefinition, index: number, direction: -1 | 1) {
    await moveVariantToIndex(variant, index + direction);
  }

  async function moveStepToIndex(variantKey: string, step: WizardStepDefinition, target: number, total: number) {
    if (!version || target < 0 || target >= total) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variantKey)}/steps/${encodeURIComponent(step.key)}`, {
      method: "PATCH",
      body: JSON.stringify({ step: { moveToIndex: target } }),
    }, "تم تغيير ترتيب الخطوة");
  }

  async function moveStep(variantKey: string, step: WizardStepDefinition, index: number, direction: -1 | 1, total: number) {
    await moveStepToIndex(variantKey, step, index + direction, total);
  }

  async function moveFieldToIndex(variantKey: string, stepKey: string, field: WizardFieldDefinition, target: number, total: number) {
    if (!version || target < 0 || target >= total) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/fields/${encodeURIComponent(field.key)}`, {
      method: "PATCH",
      body: JSON.stringify({ variantKey, stepKey, field: { key: field.key, type: field.type, labelAr: field.labelAr, moveToIndex: target } }),
    }, "تم تغيير ترتيب الحقل");
  }

  async function moveField(variantKey: string, stepKey: string, field: WizardFieldDefinition, index: number, direction: -1 | 1, total: number) {
    await moveFieldToIndex(variantKey, stepKey, field, index + direction, total);
  }

  async function dropVariant(targetIndex: number) {
    if (!version || dragItem?.kind !== "variant") return;
    const variant = version.definition.variants.find((item) => item.key === dragItem.key);
    setDragItem(null);
    if (!variant || dragItem.index === targetIndex) return;
    await moveVariantToIndex(variant, targetIndex);
  }

  async function dropStep(variantKey: string, targetIndex: number) {
    if (!version || dragItem?.kind !== "step" || dragItem.variantKey !== variantKey) return;
    const variant = version.definition.variants.find((item) => item.key === variantKey);
    const step = variant?.steps.find((item) => item.key === dragItem.key);
    setDragItem(null);
    if (!variant || !step || dragItem.index === targetIndex) return;
    await moveStepToIndex(variantKey, step, targetIndex, variant.steps.length);
  }

  async function dropField(variantKey: string, stepKey: string, targetIndex: number) {
    if (!version || dragItem?.kind !== "field" || dragItem.variantKey !== variantKey || dragItem.stepKey !== stepKey) return;
    const step = version.definition.variants.find((item) => item.key === variantKey)?.steps.find((item) => item.key === stepKey);
    const field = step?.fields.find((item) => item.key === dragItem.key);
    setDragItem(null);
    if (!step || !field || dragItem.index === targetIndex) return;
    await moveFieldToIndex(variantKey, stepKey, field, targetIndex, step.fields.length);
  }

  async function moveClause(clause: LegalClauseDefinition, index: number, direction: -1 | 1) {
    if (!version) return;
    const clauses = version.definition.legalClauses ?? [];
    const target = index + direction;
    if (target < 0 || target >= clauses.length) return;
    await mutate(`/api/v1/admin/templates/versions/${version.id}/clauses/${encodeURIComponent(clause.key)}`, {
      method: "PATCH",
      body: JSON.stringify({ clause: { moveToIndex: target } }),
    }, "تم تغيير ترتيب البند القانوني");
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
  const tabs: Array<[TabKey, string, string, ReactNode]> = [
    ["structure", "بناء النموذج", "نسخ العقد والخطوات والأسئلة", <Layers3 className="h-4 w-4" key="i" />],
    ["readiness", "تجهيز العميل", "ما يحتاجه قبل بدء العقد", <ClipboardCheck className="h-4 w-4" key="i" />],
    ["clauses", "صياغة العقد", "البنود القانونية الأساسية", <FilePlus2 className="h-4 w-4" key="i" />],
    ["optional", "الإضافات", "الملاحق والبنود الاختيارية", <Braces className="h-4 w-4" key="i" />],
    ["preview", "تجربة العقد", "عاين الناتج ببيانات تجريبية", <Eye className="h-4 w-4" key="i" />],
    ["validation", "المراجعة والنشر", "أخطاء الجاهزية قبل الإرسال", <ClipboardCheck className="h-4 w-4" key="i" />],
  ];

  const activeTabMeta = tabs.find(([key]) => key === activeTab);
  const totalSteps = version.definition.variants.reduce((sum, variant) => sum + variant.steps.length, 0);
  const totalFields = version.definition.variants.reduce((sum, variant) => sum + variant.steps.reduce((stepSum, step) => stepSum + step.fields.length, 0), 0);
  const validationErrorCount = inspection?.errors.length ?? 0;
  const customerPreviewVariant = version.definition.variants.find((variant) => variant.key === previewVariant) ?? version.definition.variants[0];
  const builderBreadcrumb = [
    version.categoryNameAr || "غير مصنف",
    version.templateNameAr || version.definition.nameAr,
    `الإصدار ${version.versionNumber}`,
  ];

  const isSingleVariant = version.definition.variants.length <= 1;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-5">
      {confirmDialog}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center">
        <div>
          <Link href="/templates" className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-[#00102e]">
            <ArrowRight className="h-4 w-4" />العودة إلى قوالب العقود
          </Link>
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
            {builderBreadcrumb.map((part, index) => (
              <span key={`${part}-${index}`} className="inline-flex items-center gap-1.5">
                <span className={index === builderBreadcrumb.length - 1 ? "text-[#00102e]" : ""}>{part}</span>
                {index < builderBreadcrumb.length - 1 && <span className="text-slate-300">›</span>}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[#00102e]">بناء نموذج العقد</h1>
            <StatusBadge value={version.status} />
          </div>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            {version.templateNameAr || version.definition.nameAr} — الإصدار {version.versionNumber} · {isSingleVariant ? "رتّب الخطوات والأسئلة كما ستظهر للعميل." : "رتّب نسخ العقد والخطوات والأسئلة كما ستظهر للعميل."}
          </p>
          <div className="mt-1.5 text-xs font-bold text-slate-600">
            {isSingleVariant
              ? `${totalSteps} خطوة · ${totalFields} سؤال · ${version.definition.legalClauses?.length ?? 0} بند قانوني`
              : `${version.definition.variants.length} نسخ · ${totalSteps} خطوة · ${totalFields} سؤال`}
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
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
          <button type="button" onClick={() => { setPreviewVariant((current) => current || version.definition.variants[0]?.key || ""); setCustomerPreviewOpen(true); }} disabled={!version.definition.variants.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Eye className="h-4 w-4" />معاينة كعميل</button>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><RefreshCw className="h-4 w-4" />تحديث</button>
          {version.status === "draft" && canEdit && (
            <button type="button" disabled={busy} onClick={() => void goToTab("validation")} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">
              <ClipboardCheck className="h-4 w-4" />فحص الجاهزية{validationErrorCount ? ` (${validationErrorCount})` : ""}
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
      {readinessDirty && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">لديك تغييرات غير محفوظة في صفحة «أنت جاهز؟». احفظها قبل الانتقال إلى مرحلة أخرى أو إرسال القالب للمراجعة.</div>}
      {!canEdit && version.status === "draft" && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">حسابك يملك صلاحية العرض فقط. تعديل مسودة القالب يحتاج صلاحية مستقلة.</div>}
      {version.status === "legal_review" && !canPublish && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">الإصدار عند المسؤول القانوني. يمكنك الاطلاع عليه فقط حتى يتم اعتماده أو إعادته للتعديل.</div>}

      <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <div className="text-sm font-black text-[#00102e]">إعدادات الإصدار والمراجعة</div>
            <div className="mt-1 text-xs font-bold text-slate-500">ملخص التعديل، المرجع القانوني، وتاريخ السريان.</div>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
        </summary>
        <form onSubmit={saveReviewMetadata} className="grid gap-4 border-t border-slate-100 p-5 lg:grid-cols-4">
          <label className="text-xs font-black text-slate-600">ملخص التعديل<input name="changeSummary" defaultValue={version.changeSummary ?? ""} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#986410]" /></label>
          <label className="text-xs font-black text-slate-600">المرجع القانوني<input name="legalReference" defaultValue={version.legalReference ?? ""} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#986410]" /></label>
          <label className="text-xs font-black text-slate-600">تاريخ بدء السريان<input name="effectiveFrom" type="datetime-local" defaultValue={version.effectiveFrom?.slice(0, 16) ?? ""} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#986410]" /></label>
          <div className="flex items-end">{!readOnly && <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-[#d7a94f]"><Save className="h-4 w-4" />حفظ الإعدادات</button>}</div>
        </form>
      </details>

      <div className="space-y-3">
        <nav className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 px-1">
              <div className="text-xs font-bold text-[#986410]">مراحل بناء النموذج</div>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {activeTabMeta?.[1]} · {activeTabMeta?.[2]}
              </p>
            </div>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 xl:pb-0" style={{ scrollbarWidth: "none" }}>
              {tabs.map(([key, label, , icon], index) => {
                const active = activeTab === key;
                const hasErrors = key === "validation" && validationErrorCount > 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void goToTab(key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${active ? "border border-white/10 bg-[#00102e] text-white shadow-sm ring-1 ring-[#00102e]" : hasErrors ? "border border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"}`}
                  >
                    <span className={active ? "text-[#d7a94f]" : ""}>{icon}</span>
                    <span>{index + 1}. {label}</span>
                    {key === "validation" && (
                      <span className={`rounded-full px-1.5 text-[10px] ${validationErrorCount ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {validationErrorCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <main className="min-w-0 space-y-4">
      {activeTab === "structure" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-[#00102e]">{isSingleVariant ? "هيكل العقد والأسئلة" : "نسخ العقد والخطوات والأسئلة"}</h2>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">التعديل هنا يخص الإصدار المسودة فقط.</p>
            </div>
            {!readOnly && <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setReorderMode((current) => !current)} aria-pressed={reorderMode} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${reorderMode ? "border-[#986410] bg-[#986410]/10 text-[#986410]" : "border-slate-200 bg-white text-slate-700"}`}><GripVertical className="h-4 w-4" />{reorderMode ? "إنهاء الترتيب" : "ترتيب بالسحب"}</button>
              {!isSingleVariant && <button type="button" onClick={() => setModal({ kind: "variant" })} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-3.5 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />إضافة نسخة</button>}
            </div>}
          </div>
          <details className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <summary className="cursor-pointer text-sm font-bold text-[#00102e]">كيف يُبنى العقد؟</summary>
            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs font-medium leading-5 text-slate-700 md:grid-cols-3">
              {isSingleVariant ? (
                <>
                  <div className="rounded-xl bg-slate-50 p-2.5"><span className="font-bold text-[#00102e]">١. الخطوات</span><br />أقسام العقد مثل بيانات الأطراف أو بيانات الوحدة/الخدمة.</div>
                  <div className="rounded-xl bg-slate-50 p-2.5"><span className="font-bold text-[#00102e]">٢. الأسئلة</span><br />البيانات التي يجيب عنها العميل داخل كل خطوة.</div>
                  <div className="rounded-xl bg-slate-50 p-2.5"><span className="font-bold text-[#00102e]">٣. البنود القانونية</span><br />تُربط بمتغيرات الأسئلة وتُنتج وثيقة العقد النهائية.</div>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-slate-50 p-2.5"><span className="font-bold text-[#00102e]">١. نسخة العقد</span><br />مثال: بيع ابتدائي أو إيجار سكني داخل نفس نوع العقد.</div>
                  <div className="rounded-xl bg-slate-50 p-2.5"><span className="font-bold text-[#00102e]">٢. الخطوات</span><br />مثل بيانات الأطراف أو بيانات الوحدة.</div>
                  <div className="rounded-xl bg-slate-50 p-2.5"><span className="font-bold text-[#00102e]">٣. الأسئلة</span><br />البيانات التي يجيب عنها العميل داخل كل خطوة.</div>
                </>
              )}
            </div>
          </details>
          {reorderMode && !readOnly && <div className="flex items-start gap-3 rounded-2xl border border-[#986410]/30 bg-[#986410]/5 p-4 text-sm font-semibold leading-6 text-slate-700"><GripVertical className="mt-0.5 h-5 w-5 shrink-0 text-[#986410]" /><div><span className="font-black text-[#00102e]">وضع الترتيب مفعّل.</span> اسحب من المقبض لترتيب نسخ العقد، الخطوات والأسئلة. ويمكن استخدام سهمي أعلى/أسفل بعد التركيز على المقبض أو من قائمة «⋯» على الموبايل.</div></div>}

          {version.definition.variants.map((variant, variantIndex) => {
            const expanded = isSingleVariant ? (expandedVariants[variant.key] ?? true) : (expandedVariants[variant.key] ?? false);
            return (
              <article key={variant.key} onDragOver={(event) => { if (reorderMode && dragItem?.kind === "variant") event.preventDefault(); }} onDrop={(event) => { if (!reorderMode) return; event.preventDefault(); void dropVariant(variantIndex); }} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${reorderMode && dragItem?.kind === "variant" && dragItem.key === variant.key ? "border-[#986410] opacity-60" : "border-slate-200"}`}>
                <div className="flex flex-col gap-2 bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    {reorderMode && !readOnly && !isSingleVariant && <span draggable={!busy} onDragStart={(event) => { event.stopPropagation(); setDragItem({ kind: "variant", key: variant.key, index: variantIndex }); }} onDragEnd={() => setDragItem(null)} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); void moveVariant(variant, variantIndex, -1); } if (event.key === "ArrowDown") { event.preventDefault(); void moveVariant(variant, variantIndex, 1); } }} role="button" tabIndex={0} title="اسحب أو استخدم الأسهم لتغيير ترتيب نسخة العقد" aria-label={`اسحب لترتيب ${variant.nameAr}`} className="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-xl border border-[#986410]/30 bg-white text-[#986410] active:cursor-grabbing"><GripVertical className="h-5 w-5" /></span>}
                  <button type="button" onClick={() => setExpandedVariants((current) => ({ ...current, [variant.key]: !expanded }))} className="flex min-w-0 items-center gap-3 text-right">
                    {expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />}
                    <div className="min-w-0">
                      <span className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${isSingleVariant ? "bg-[#986410]/10 text-[#986410]" : "bg-white text-slate-500"}`}>{isSingleVariant ? "نموذج العقد" : `نسخة عقد #${variantIndex + 1}`}</span>
                      <h3 className="truncate text-[15px] font-bold text-[#00102e]">{variant.nameAr}</h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">{variant.steps.length} خطوة إدخال</p>
                    </div>
                  </button>
                  </div>
                  {!readOnly && <div className="flex flex-wrap items-start gap-2">
                    <button type="button" onClick={() => setModal({ kind: "step", variantKey: variant.key })} className="inline-flex items-center gap-1 rounded-xl bg-[#00102e] px-3 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />إضافة خطوة</button>
                    {!isSingleVariant && <button type="button" onClick={() => setModal({ kind: "variant", value: variant })} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"><Pencil className="h-3.5 w-3.5" />تعديل النسخة</button>}
                    {!isSingleVariant && <details className="relative">
                      <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 [&::-webkit-details-marker]:hidden">⋯</summary>
                      <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold shadow-xl">
                        <button type="button" disabled={variantIndex === 0 || busy} onClick={() => void moveVariant(variant, variantIndex, -1)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp className="h-4 w-4" />تحريك لأعلى</button>
                        <button type="button" disabled={variantIndex === version.definition.variants.length - 1 || busy} onClick={() => void moveVariant(variant, variantIndex, 1)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><ArrowDown className="h-4 w-4" />تحريك لأسفل</button>
                        <button
                          type="button"
                          disabled={version.definition.variants.length <= 1 || busy}
                          title={version.definition.variants.length <= 1 ? "لا يمكن حذف النسخة الوحيدة داخل نوع العقد. عطّل نوع العقد من صفحة الأنواع بدلًا من ذلك." : undefined}
                          onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variant.key)}`, "تم حذف نسخة العقد", `حذف نسخة العقد «${variant.nameAr}» من هذه المسودة؟`)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />حذف النسخة
                        </button>
                      </div>
                    </details>}
                  </div>}
                </div>
                {expanded && <div className="space-y-3 p-4">
                  {variant.steps.map((step, stepIndex) => {
                    const stepId = `${variant.key}:${step.key}`;
                    const stepExpanded = expandedSteps[stepId] ?? true;
                    return (
                      <div key={step.key} onDragOver={(event) => { if (reorderMode && dragItem?.kind === "step" && dragItem.variantKey === variant.key) { event.preventDefault(); event.stopPropagation(); } }} onDrop={(event) => { if (!reorderMode) return; event.preventDefault(); event.stopPropagation(); void dropStep(variant.key, stepIndex); }} className={`overflow-hidden rounded-2xl border bg-white transition ${reorderMode && dragItem?.kind === "step" && dragItem.key === step.key ? "border-[#986410] opacity-60" : "border-slate-200"}`}>
                        <div className="flex flex-col gap-2 border-b border-slate-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            {reorderMode && !readOnly && <span draggable={!busy} onDragStart={(event) => { event.stopPropagation(); setDragItem({ kind: "step", variantKey: variant.key, key: step.key, index: stepIndex }); }} onDragEnd={() => setDragItem(null)} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); void moveStep(variant.key, step, stepIndex, -1, variant.steps.length); } if (event.key === "ArrowDown") { event.preventDefault(); void moveStep(variant.key, step, stepIndex, 1, variant.steps.length); } }} role="button" tabIndex={0} title="اسحب أو استخدم الأسهم لتغيير ترتيب الخطوة" aria-label={`اسحب لترتيب ${step.titleAr}`} className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-[#986410]/30 bg-white text-[#986410] active:cursor-grabbing"><GripVertical className="h-4 w-4" /></span>}
                          <button type="button" onClick={() => setExpandedSteps((current) => ({ ...current, [stepId]: !stepExpanded }))} className="flex items-center gap-3 text-right">
                            {stepExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                            <div>
                              <span className="mb-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">خطوة #{stepIndex + 1}</span>
                              <div className="text-[15px] font-bold text-slate-900">{step.titleAr}</div>
                              <div className="mt-0.5 text-xs font-medium text-slate-500">{step.fields.length} سؤال</div>
                            </div>
                          </button>
                          </div>
                          {!readOnly && <div className="flex flex-wrap items-start gap-2">
                            <button type="button" onClick={() => setModal({ kind: "field", variantKey: variant.key, stepKey: step.key })} className="inline-flex items-center gap-1 rounded-xl bg-[#986410] px-3 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />إضافة سؤال</button>
                            <button type="button" onClick={() => setModal({ kind: "step", variantKey: variant.key, value: step })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">تعديل الخطوة</button>
                            <details className="relative">
                              <summary className="cursor-pointer list-none rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 [&::-webkit-details-marker]:hidden">⋯</summary>
                              <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold shadow-xl">
                                <button type="button" disabled={stepIndex === 0 || busy} onClick={() => void moveStep(variant.key, step, stepIndex, -1, variant.steps.length)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp className="h-4 w-4" />تحريك لأعلى</button>
                                <button type="button" disabled={stepIndex === variant.steps.length - 1 || busy} onClick={() => void moveStep(variant.key, step, stepIndex, 1, variant.steps.length)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><ArrowDown className="h-4 w-4" />تحريك لأسفل</button>
                                <button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/variants/${encodeURIComponent(variant.key)}/steps/${encodeURIComponent(step.key)}`, "تم حذف الخطوة", `حذف خطوة «${step.titleAr}» وكل حقولها؟`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />حذف الخطوة</button>
                              </div>
                            </details>
                          </div>}
                        </div>
                        {stepExpanded && <div>
                          {step.fields.map((field, fieldIndex) => (
                            <div key={field.key} onDragOver={(event) => { if (reorderMode && dragItem?.kind === "field" && dragItem.variantKey === variant.key && dragItem.stepKey === step.key) { event.preventDefault(); event.stopPropagation(); } }} onDrop={(event) => { if (!reorderMode) return; event.preventDefault(); event.stopPropagation(); void dropField(variant.key, step.key, fieldIndex); }} className={`flex flex-col gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0 xl:flex-row xl:items-center xl:justify-between ${reorderMode && dragItem?.kind === "field" && dragItem.key === field.key ? "bg-[#986410]/5 opacity-60" : ""}`}>
                              <div className="flex min-w-0 items-start gap-3">
                                {reorderMode && !readOnly && <span draggable={!busy} onDragStart={(event) => { event.stopPropagation(); setDragItem({ kind: "field", variantKey: variant.key, stepKey: step.key, key: field.key, index: fieldIndex }); }} onDragEnd={() => setDragItem(null)} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); void moveField(variant.key, step.key, field, fieldIndex, -1, step.fields.length); } if (event.key === "ArrowDown") { event.preventDefault(); void moveField(variant.key, step.key, field, fieldIndex, 1, step.fields.length); } }} role="button" tabIndex={0} title="اسحب أو استخدم الأسهم لتغيير ترتيب السؤال" aria-label={`اسحب لترتيب ${field.labelAr}`} className="mt-0.5 flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg border border-[#986410]/30 bg-white text-[#986410] active:cursor-grabbing"><GripVertical className="h-4 w-4" /></span>}
                                <span className="mt-0.5 flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-600">#{fieldIndex + 1}</span>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-slate-900">{field.labelAr}</div>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <FieldBadge field={field} />
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${field.helpText ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{field.helpText ? "مساعدة ✓" : "بدون مساعدة"}</span>
                                {!readOnly && <button type="button" onClick={() => setModal({ kind: "field", variantKey: variant.key, stepKey: step.key, value: field })} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Pencil className="h-3.5 w-3.5" />تعديل</button>}
                                {!readOnly && <details className="relative">
                                  <summary className="cursor-pointer list-none rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 [&::-webkit-details-marker]:hidden">⋯</summary>
                                  <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold shadow-xl">
                                    <button type="button" disabled={fieldIndex === 0 || busy} onClick={() => void moveField(variant.key, step.key, field, fieldIndex, -1, step.fields.length)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" />تحريك لأعلى</button>
                                    <button type="button" disabled={fieldIndex === step.fields.length - 1 || busy} onClick={() => void moveField(variant.key, step.key, field, fieldIndex, 1, step.fields.length)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" />تحريك لأسفل</button>
                                    <button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/fields/${encodeURIComponent(field.key)}`, "تم حذف الحقل", `حذف السؤال «${field.labelAr}»؟`, { variantKey: variant.key, stepKey: step.key })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />حذف السؤال</button>
                                  </div>
                                </details>}
                              </div>
                            </div>
                          ))}
                          {!step.fields.length && <div className="p-5 text-center text-sm font-bold text-slate-500"><div>لا توجد أسئلة في هذه الخطوة.</div>{!readOnly && <button type="button" onClick={() => setModal({ kind: "field", variantKey: variant.key, stepKey: step.key })} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#986410] px-4 py-2.5 text-xs font-black text-white"><Plus className="h-4 w-4" />إضافة أول سؤال</button>}</div>}
                        </div>}
                      </div>
                    );
                  })}
                  {!variant.steps.length && <div className="rounded-xl bg-amber-50 p-5 text-center text-sm font-bold text-amber-900"><div>هذه النسخة لا تحتوي خطوات بعد.</div>{!readOnly && <button type="button" onClick={() => setModal({ kind: "step", variantKey: variant.key })} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-xs font-black text-white"><Plus className="h-4 w-4" />إضافة أول خطوة</button>}</div>}
                </div>}
              </article>
            );
          })}
          {!version.definition.variants.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Layers3 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-600">ابدأ بإضافة نسخة العقد التي سيختارها العميل داخل هذا القالب.</p>{!readOnly && <button type="button" onClick={() => setModal({ kind: "variant" })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-2.5 text-sm font-black text-white"><Plus className="h-4 w-4" />إضافة أول نسخة</button>}</div>}
        </section>
      )}

      {activeTab === "readiness" && (
        <ReadinessEditor
          variants={version.definition.variants}
          readOnly={readOnly}
          busy={busy}
          onDirtyChange={setReadinessDirty}
          onSave={(variantKey, readiness) => void saveReadiness(variantKey, readiness)}
        />
      )}

      {activeTab === "clauses" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-bold text-[#00102e]">البنود القانونية</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {isSingleVariant
                  ? `بنود ${version.templateNameAr || version.definition.nameAr} (${filteredClauses.length} بند). النص المنشور لا يتغير بأثر رجعي. استخدم المتغيرات بالشكل {{field_key}}.`
                  : `النص المنشور لا يتغير بأثر رجعي. استخدم المتغيرات بالشكل {{field_key}}.`}
              </p>
            </div>
            {!readOnly && <button type="button" onClick={() => setModal({ kind: "clause" })} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" />إضافة بند</button>}
          </div>
          {!isSingleVariant && (
            <VariantClauseSelectionPanel
              key={version.definition.variants.map((variant) => `${variant.key}:${(variant.requiredClauseKeys ?? []).join("|")}`).join(";")}
              variants={version.definition.variants}
              clauses={version.definition.legalClauses ?? []}
              readOnly={readOnly}
              busy={busy}
              onSave={(variant, requiredClauseKeys) => void saveVariantClauseSelection(variant, requiredClauseKeys)}
            />
          )}
          <input value={clauseSearch} onChange={(event: ChangeEvent<HTMLInputElement>) => setClauseSearch(event.target.value)} placeholder="ابحث باسم المادة أو جزء من النص" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#986410]" />
          <div className="space-y-3">{filteredClauses.map((clause) => { const clauseIndex = (version.definition.legalClauses ?? []).findIndex((item) => item.key === clause.key); return <article key={clause.key} className={`rounded-2xl border bg-white p-5 ${clause.enabled === false ? "border-slate-200 opacity-60" : "border-slate-200"}`}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#00102e]">{clause.titleAr}</h3><span className={`rounded-full px-2 py-1 text-xs font-black ${clause.enabled === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>{clause.enabled === false ? "معطّل" : "مفعّل"}</span></div><details className="mt-1"><summary className="cursor-pointer text-xs font-bold text-slate-500">تفاصيل تقنية</summary><div className="mt-1 font-mono text-xs text-slate-500">{clause.key}</div></details>{clause.sourceDocumentName && <div className="mt-1 text-xs font-bold text-slate-500">المصدر: {clause.sourceDocumentName}{clause.sourcePageStart ? ` — ص ${clause.sourcePageStart}${clause.sourcePageEnd && clause.sourcePageEnd !== clause.sourcePageStart ? ` إلى ${clause.sourcePageEnd}` : ""}` : ""}</div>}</div>{!readOnly && <div className="flex flex-wrap gap-2"><button type="button" disabled={clauseIndex <= 0 || busy} onClick={() => void moveClause(clause, clauseIndex, -1)} className="rounded-lg border p-2 disabled:opacity-30" title="تحريك لأعلى" aria-label="تحريك البند لأعلى"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" disabled={clauseIndex < 0 || clauseIndex >= (version.definition.legalClauses?.length ?? 1) - 1 || busy} onClick={() => void moveClause(clause, clauseIndex, 1)} className="rounded-lg border p-2 disabled:opacity-30" title="تحريك لأسفل" aria-label="تحريك البند لأسفل"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setModal({ kind: "clause", value: clause })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-black"><Pencil className="h-3.5 w-3.5" />تعديل</button>{clause.enabled !== false && <button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/clauses/${encodeURIComponent(clause.key)}`, "تم تعطيل البند", `تعطيل البند «${clause.titleAr}» في هذه المسودة؟`)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700">تعطيل</button>}</div>}</div>{clause.guidance && <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-900"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">!</span><span>{clause.guidance}</span></div>}{canEditGuidance && <button type="button" onClick={() => setModal({ kind: "clauseGuidance", value: clause })} className="mt-3 rounded-lg border border-amber-200 px-3 py-2 text-xs font-black text-amber-800">{clause.guidance ? "تعديل الإرشاد" : "إضافة إرشاد (!)"}</button>}<p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-slate-700">{clause.bodyAr}</p></article> })}{!filteredClauses.length && <div className="rounded-2xl bg-slate-50 p-8 text-center text-xs font-bold text-slate-500">لا توجد بنود مطابقة.</div>}</div>
        </section>
      )}

      {activeTab === "optional" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-[#00102e]">الإضافات والملاحق الاختيارية</h2><p className="mt-1 text-xs font-semibold text-slate-500">مثل جدول الأقساط أو محضر الاستلام والجرد، ويمكن إصدارها داخل العقد أو كمستند مستقل.</p></div>{!readOnly && <button type="button" onClick={() => setModal({ kind: "optional" })} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-4 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" />إضافة ملحق أو خيار</button>}</div>
          <div className="grid gap-4 lg:grid-cols-2">{version.definition.optionalClauses.map((optional) => <article key={optional.key} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#00102e]">{optional.nameAr}</h3><details className="mt-1"><summary className="cursor-pointer text-xs font-bold text-slate-500">تفاصيل تقنية</summary><div className="mt-1 font-mono text-xs text-slate-500">{optional.key}</div></details></div><span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-black text-violet-800">{optional.outputMode === "separate_annex" ? "مستند مستقل" : "داخل العقد"}</span></div><p className="mt-3 text-sm leading-7 text-slate-600">{optional.description || "—"}</p><div className="mt-4 space-y-2 text-xs font-bold text-slate-500"><div>متاح لـ: {optional.applicableVariantKeys.map((key) => version.definition.variants.find((item) => item.key === key)?.nameAr ?? key).join("، ") || "غير محدد"}</div><div>الخطوات المضافة: {optional.insertedSteps.length}</div><div>البنود القانونية: {optional.legalClauseKeys.length}</div></div>{!readOnly && <div className="mt-4 flex gap-2"><button type="button" onClick={() => setModal({ kind: "optional", value: optional })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-black"><Pencil className="h-3.5 w-3.5" />تعديل</button><button type="button" onClick={() => void remove(`/api/v1/admin/templates/versions/${version.id}/optional-clauses/${encodeURIComponent(optional.key)}`, "تم حذف الإضافة", `حذف الإضافة «${optional.nameAr}» من هذه المسودة؟`)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700">حذف</button></div>}</article>)}{!version.definition.optionalClauses.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs font-bold text-slate-500 lg:col-span-2">لا توجد إضافات أو ملاحق اختيارية.</div>}</div>
        </section>
      )}

      {activeTab === "preview" && (
        <section className="space-y-5">
          <div><h2 className="text-lg font-bold text-[#00102e]">معاينة تجريبية قبل النشر</h2><p className="mt-1 text-xs font-semibold text-slate-500">يملأ النظام بيانات تجريبية تلقائيًا ويعرض البنود الناتجة حتى تراجع ترتيبها والمتغيرات الناقصة.</p></div>
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:grid-cols-3">
            {isSingleVariant ? (
              <div>
                <span className="text-xs font-black text-slate-600">نوع العقد المراد معاينته</span>
                <div className="mt-2 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-[#00102e]">
                  {version.templateNameAr || version.definition.nameAr}
                </div>
              </div>
            ) : (
              <label className="text-xs font-black text-slate-600">نسخة العقد<select value={previewVariant} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setPreviewVariant(event.target.value); setPreviewOptionals([]); setPreview(null); }} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal">{version.definition.variants.map((variant) => <option key={variant.key} value={variant.key}>{variant.nameAr}</option>)}</select></label>
            )}<div className="lg:col-span-2"><div className="text-xs font-black text-slate-600">الإضافات المراد اختبارها</div><div className="mt-2 flex flex-wrap gap-2">{version.definition.optionalClauses.filter((optional) => optional.applicableVariantKeys.includes(previewVariant)).map((optional) => <label key={optional.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><input type="checkbox" checked={previewOptionals.includes(optional.key)} onChange={(event: ChangeEvent<HTMLInputElement>) => setPreviewOptionals((current) => event.target.checked ? [...current, optional.key] : current.filter((key) => key !== optional.key))} />{optional.nameAr}</label>)}{!version.definition.optionalClauses.some((optional) => optional.applicableVariantKeys.includes(previewVariant)) && <span className="text-xs text-slate-500">لا توجد إضافات لهذه النسخة.</span>}</div></div><div className="lg:col-span-3"><button type="button" disabled={!previewVariant || busy} onClick={() => void generatePreview()} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-[#d7a94f]"><Eye className="h-4 w-4" />إنشاء المعاينة</button></div></div>
          {preview && <div className="space-y-4">{(preview.missingVariables.length > 0 || preview.missingClauseKeys.length > 0) && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900"><div>بيانات لم تُربط داخل النص: {preview.missingVariables.map((key) => availableClauseFields.find((field) => field.key === key)?.label ?? key).join("، ") || "لا يوجد"}</div><div className="mt-1">بنود غير موجودة: {preview.missingClauseKeys.map((key) => version.definition.legalClauses?.find((clause) => clause.key === key)?.titleAr ?? key).join("، ") || "لا يوجد"}</div></div>}<div className="rounded-2xl border border-slate-200 bg-white p-6">{preview.clauses.map((clause) => <article key={clause.key} className="border-b border-slate-100 py-5 first:pt-0 last:border-b-0 last:pb-0"><h3 className="text-center text-base font-black text-[#00102e]">{clause.titleAr}</h3><p className="mt-3 whitespace-pre-wrap text-justify text-sm leading-8 text-slate-700">{clause.bodyAr}</p></article>)}{!preview.clauses.length && <p className="text-center text-sm font-bold text-slate-500">لم ينتج عن الاختيارات الحالية أي بنود.</p>}</div></div>}
        </section>
      )}

      {activeTab === "validation" && inspection && (
        <section className="space-y-5">
          <div><h2 className="text-lg font-bold text-[#00102e]">فحص جاهزية الإصدار</h2><p className="mt-1 text-xs font-semibold text-slate-500">النشر يتوقف تلقائيًا عند وجود أخطاء؛ التحذيرات لا تمنع النشر لكنها تحتاج مراجعة.</p></div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
            {isSingleVariant
              ? `${inspection.stats.steps} خطوة · ${inspection.stats.fields} سؤال · ${inspection.stats.legalClauses} بند قانوني · ${inspection.stats.optionalClauses} ملحق اختياري`
              : `${inspection.stats.variants} نسخ · ${inspection.stats.steps} خطوة · ${inspection.stats.fields} سؤال · ${inspection.stats.legalClauses} بند · ${inspection.stats.optionalClauses} إضافة`}
          </div>
          {!inspection.errors.length && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"><CheckCircle2 className="h-6 w-6" /><div><div className="font-black">لا توجد أخطاء تمنع النشر</div><div className="mt-1 text-xs font-semibold">راجع التحذيرات والمعاينة القانونية قبل الاعتماد النهائي.</div></div></div>}
          {!!inspection.errors.length && <div className="space-y-2"><h3 className="font-black text-red-800">أخطاء يجب معالجتها ({inspection.errors.length})</h3>{inspection.errors.map((item, index) => <div key={`${item.code}-${index}`} className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-start"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" /><div className="min-w-0 flex-1"><div className="text-sm font-black text-red-900">{item.messageAr}</div><details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-red-700">تفاصيل تقنية</summary><div className="mt-1 break-all font-mono text-xs text-red-500">{item.code} · {item.path}</div></details></div><button type="button" onClick={() => void goToTab(tabForInspectionPath(item.path))} className="shrink-0 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-800">اذهب للمشكلة</button></div>)}</div>}
          {!!inspection.warnings.length && <div className="space-y-2"><h3 className="font-black text-amber-800">ملاحظات للمراجعة ({inspection.warnings.length})</h3>{inspection.warnings.map((item, index) => <div key={`${item.code}-${index}`} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><div className="text-sm font-black text-amber-900">{item.messageAr}</div><details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800">تفاصيل تقنية</summary><div className="mt-1 font-mono text-xs text-amber-600">{item.code} · {item.path}</div></details></div></div>)}</div>}
          {version.status === "draft" && canEdit && (
            <div className="flex justify-end">
              <button type="button" disabled={busy || readinessDirty || Boolean(inspection.errors.length)} onClick={() => void submitForReview()} className="rounded-xl bg-[#986410] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">إرسال للمراجعة القانونية</button>
            </div>
          )}
        </section>
      )}

        </main>
      </div>

      {customerPreviewOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="معاينة رحلة العميل">
          <button type="button" aria-label="إغلاق معاينة العميل" onClick={() => setCustomerPreviewOpen(false)} className="absolute inset-0 bg-slate-950/30" />
          <aside className="absolute inset-y-0 left-0 flex w-full max-w-xl flex-col bg-slate-50 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-[#00102e]"><Eye className="h-4 w-4 text-[#986410]" />معاينة كعميل</div>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">معاينة سريعة لترتيب الخطوات والأسئلة الحالي. لا تحفظ أو تغيّر أي بيانات.</p>
              </div>
              <button type="button" onClick={() => setCustomerPreviewOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" aria-label="إغلاق"><X className="h-4 w-4" /></button>
            </div>

            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <label className="block text-xs font-bold text-slate-600">نسخة العقد
                <select value={customerPreviewVariant?.key ?? ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setPreviewVariant(event.target.value); setPreviewOptionals([]); setPreview(null); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#986410]">
                  {version.definition.variants.map((variant) => <option key={variant.key} value={variant.key}>{variant.nameAr}</option>)}
                </select>
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {customerPreviewVariant ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-base font-bold text-[#00102e]">{customerPreviewVariant.nameAr}</div>
                    <div className="mt-1 text-xs font-medium text-slate-500">{customerPreviewVariant.steps.length} خطوة · {customerPreviewVariant.steps.reduce((sum, step) => sum + step.fields.length, 0)} سؤال</div>
                  </div>

                  {customerPreviewVariant.steps.map((step, stepIndex) => (
                    <section key={step.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-bold text-[#986410]">الخطوة {stepIndex + 1} من {customerPreviewVariant.steps.length}</div>
                        <h3 className="mt-1 text-base font-bold text-[#00102e]">{step.titleAr}</h3>
                      </div>
                      <div className="space-y-5 p-4">
                        {step.fields.map((field) => <CustomerFieldPreview key={field.key} field={field} />)}
                        {!step.fields.length && <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm font-medium text-slate-500">لا توجد أسئلة في هذه الخطوة.</div>}
                      </div>
                    </section>
                  ))}

                  {!customerPreviewVariant.steps.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-500">لا توجد خطوات في هذه النسخة حتى الآن.</div>}
                  <p className="px-1 text-xs font-medium leading-5 text-slate-500">الحقول الشرطية قد تظهر أو تختفي للعميل حسب إجاباته. معاينة البنود القانونية النهائية تظل في مرحلة «تجربة العقد».</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-500">أضف نسخة عقد أولًا لعرض رحلة العميل.</div>
              )}
            </div>
          </aside>
        </div>
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

      {modal?.kind === "variant" && (
        <ModalShell title={modal.value ? "تعديل نسخة العقد" : "إضافة نسخة"} onClose={() => setModal(null)}>
          <VariantSettingsForm
            version={version}
            value={modal.value}
            busy={busy}
            onCancel={() => setModal(null)}
            onSubmit={(event: FormEvent<HTMLFormElement>) => void submitVariant(event, modal.value)}
          />
        </ModalShell>
      )}

      {modal?.kind === "step" && (
        <ModalShell title={modal.value ? "تعديل الخطوة" : "إضافة خطوة"} onClose={() => setModal(null)}>
          <StepSettingsForm
            version={version}
            value={modal.value}
            busy={busy}
            onCancel={() => setModal(null)}
            onSubmit={(event: FormEvent<HTMLFormElement>) => void submitStep(event, modal.variantKey, modal.value)}
          />
        </ModalShell>
      )}

      {modal?.kind === "field" && (
        <ModalShell title={modal.value ? "تعديل سؤال داخل القالب" : "إضافة سؤال جديد"} onClose={() => setModal(null)} wide>
          <FieldSettingsForm
            field={modal.value}
            fieldKeys={allFieldKeys}
            busy={busy}
            onCancel={() => setModal(null)}
            onSubmit={(event: FormEvent<HTMLFormElement>) => void submitField(event, modal.variantKey, modal.stepKey, modal.value)}
          />
        </ModalShell>
      )}

      {modal?.kind === "clause" && (
        <ModalShell title={modal.value ? "تعديل البند القانوني" : "إضافة بند قانوني"} onClose={() => setModal(null)} wide>
          <ClauseSettingsForm
            clause={modal.value}
            availableFields={availableClauseFields}
            busy={busy}
            onCancel={() => setModal(null)}
            onSubmit={(event: FormEvent<HTMLFormElement>) => void submitClause(event, modal.value)}
          />
        </ModalShell>
      )}
      {modal?.kind === "clauseGuidance" && <ModalShell title="تعديل إرشاد البند بدون إصدار Version جديد" onClose={() => setModal(null)}><form onSubmit={(event: FormEvent<HTMLFormElement>) => void submitClauseGuidance(event, modal.value)} className="space-y-4 p-6"><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-900">هذا التعديل يغيّر الشرح الظاهر للمستخدم فقط، ولا يغيّر النص القانوني أو العقود الصادرة.</p><label className="block text-xs font-black">الإرشاد بجانب علامة (!) <textarea name="guidance" rows={5} defaultValue={modal.value.guidance} className="mt-2 w-full rounded-xl border p-3 text-sm leading-6 font-normal" placeholder="اكتب شرحًا مبسطًا للمستخدم" /></label><FormActions busy={busy} onCancel={() => setModal(null)} /></form></ModalShell>}

      {modal?.kind === "optional" && (
        <ModalShell title={modal.value ? "تعديل الإضافة أو الملحق" : "إضافة ملحق أو خيار"} onClose={() => setModal(null)} wide>
          <form onSubmit={(event: FormEvent<HTMLFormElement>) => void submitOptional(event, modal.value)} className="space-y-5 bg-slate-50/70 p-5">
            <input type="hidden" name="key" value={modal.value?.key ?? ""} />

            <FieldEditorSection title="ما الذي يراه المستخدم؟" description="عرّف اسم الإضافة وطريقة خروجها بدون التعامل مع مفاتيح تقنية.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInputLabel label="الاسم الظاهر">
                  <input name="nameAr" required defaultValue={modal.value?.nameAr} placeholder="مثال: جدول الأقساط" className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
                </FieldInputLabel>
                <FieldInputLabel label="طريقة الإصدار">
                  <select name="outputMode" defaultValue={modal.value?.outputMode ?? "inline"} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal">
                    <option value="inline">داخل العقد</option>
                    <option value="separate_annex">كمستند مستقل</option>
                  </select>
                </FieldInputLabel>
                <FieldInputLabel label="عنوان المستند">
                  <input name="documentTitleAr" defaultValue={modal.value?.documentTitleAr} placeholder="اختياري" className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
                </FieldInputLabel>
                <div className="sm:col-span-2">
                  <FieldInputLabel label="وصف مختصر">
                    <textarea name="description" rows={3} defaultValue={modal.value?.description} placeholder="اشرح للمستخدم متى يحتاج هذه الإضافة." className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal leading-7" />
                  </FieldInputLabel>
                </div>
              </div>
            </FieldEditorSection>

            <FieldEditorSection title="أين تستخدم الإضافة؟" description="اختر أنواع العقود ثم حدد موضعها داخل رحلة تعبئة العقد إن احتجت.">
              <div className="grid gap-2 sm:grid-cols-2">
                {version.definition.variants.map((variant) => (
                  <label key={variant.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 hover:border-slate-300">
                    <input type="checkbox" name="applicableVariantKeys" value={variant.key} defaultChecked={modal.value?.applicableVariantKeys.includes(variant.key)} className="h-4 w-4 accent-[#986410]" />
                    {variant.nameAr}
                  </label>
                ))}
              </div>
              <FieldInputLabel label="موضع الإدراج — اختياري">
                <select name="insertBeforeStepKey" defaultValue={modal.value?.insertBeforeStepKey ?? ""} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal">
                  <option value="">في نهاية الخطوات / حسب الإعداد الافتراضي</option>
                  {version.definition.variants.flatMap((variant) => variant.steps.map((step) => (
                    <option key={`${variant.key}:${step.key}`} value={step.key}>{variant.nameAr} — قبل «{step.titleAr}»</option>
                  )))}
                </select>
              </FieldInputLabel>
            </FieldEditorSection>

            <FieldEditorSection title="البنود القانونية المرتبطة" description="اختر البنود بالاسم بدل كتابة مفاتيح داخلية.">
              {(version.definition.legalClauses ?? []).length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(version.definition.legalClauses ?? []).filter((clause) => clause.enabled !== false).map((clause) => (
                    <label key={clause.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 hover:border-slate-300">
                      <input type="checkbox" name="legalClauseKeys" value={clause.key} defaultChecked={modal.value?.legalClauseKeys.includes(clause.key)} className="mt-1 h-4 w-4 accent-[#986410]" />
                      <span className="min-w-0">
                        <span className="block text-slate-800">{clause.titleAr}</span>
                        {clause.guidance && <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-slate-500">{clause.guidance}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">أضف البنود القانونية أولًا ثم اربطها بالملحق من هنا.</p>
              )}
            </FieldEditorSection>

            <TechnicalDetails title="إعدادات تقنية متقدمة للملاحق">
              <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-500">لا تحتاج هذا القسم في الاستخدام اليومي. استخدمه فقط إذا كان الملحق يضيف خطوات وأسئلة جديدة تلقائيًا.</p>
              <FieldInputLabel label="ملف المصدر الداخلي">
                <input name="sourceDocumentName" defaultValue={modal.value?.sourceDocumentName} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" />
              </FieldInputLabel>
              <OptionalAdvancedVisualBuilder value={modal.value} version={version} />
            </TechnicalDetails>

            <FormActions busy={busy} onCancel={() => setModal(null)} />
          </form>
        </ModalShell>
      )}
      {modal?.kind === "fieldHelp" && <ModalShell title="تعديل مساعدة الحقل بدون إصدار Version جديد" onClose={() => setModal(null)}><form onSubmit={(event: FormEvent<HTMLFormElement>) => void submitFieldHelp(event, modal.variantKey, modal.stepKey, modal.value)} className="space-y-4 p-6"><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-900">هذا التعديل يغيّر الإرشاد الظاهر بجانب السؤال فقط، ولا يغيّر الحقل أو العقود الصادرة.</p><label className="block text-xs font-black">نص المساعدة / علامة (!) <textarea name="helpText" rows={5} defaultValue={modal.value.helpText} className="mt-2 w-full rounded-xl border p-3 text-sm leading-6 font-normal" placeholder="اكتب شرحًا مبسطًا لما يجب إدخاله" /></label><label className="block text-xs font-black">مرجع المساعدة الاختياري<input name="helpRef" defaultValue={modal.value.helpRef} className="mt-2 w-full rounded-xl border p-3 font-mono text-xs font-normal" /></label><FormActions busy={busy} onCancel={() => setModal(null)} /></form></ModalShell>}
    </div>
  );
}

function isAtomicCondition(value: ConditionDefinition | undefined): value is AtomicConditionDefinition {
  return Boolean(value && "fieldKey" in value);
}

function FieldAdvancedControls({ field, fieldKeys }: { field?: WizardFieldDefinition; fieldKeys: string[] }) {
  if (!field) return null;
  return <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
    <div className="text-xs font-black text-emerald-900">إعدادات الحقل المتقدمة</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-emerald-950">نطاق البيانات<select name="dataScope" defaultValue={field.dataScope ?? ""} className="mt-1 w-full rounded-lg border border-emerald-200 bg-white p-2 font-normal"><option value="">يُحفظ مع العقد</option><option value="organization">بيانات المؤسسة</option><option value="counterparty">بيانات الطرف الآخر</option><option value="transaction">بيانات المعاملة</option><option value="contract">بيانات العقد</option><option value="user">بيانات المستخدم</option><option value="system">بيانات النظام</option></select></label>
      <label className="text-xs font-bold text-emerald-950">مصدر البيانات / المفتاح المحفوظ<input name="dataSource" defaultValue={field.dataSource} placeholder="مثال: profile.phone أو saved_party" className="mt-1 w-full rounded-lg border border-emerald-200 bg-white p-2 font-normal" /></label>
      <label className="text-xs font-bold text-emerald-950">مفتاح الربط داخل المستند<input name="documentMapping" dir="ltr" defaultValue={field.documentMapping} placeholder="مثال: landlord.phone" className="mt-1 w-full rounded-lg border border-emerald-200 bg-white p-2 font-mono font-normal" /></label>
      <label className="text-xs font-bold text-emerald-950">عدد الصفوف الفارغة للطباعة<input name="blankRows" type="number" min="0" defaultValue={field.blankRows} className="mt-1 w-full rounded-lg border border-emerald-200 bg-white p-2 font-normal" /></label>
    </div>
    <label className="block text-xs font-bold text-emerald-950">عناوين الصفوف الفارغة — اختياري<input name="blankRowLabels" defaultValue={field.blankRowLabels?.join(", ")} placeholder="مثال: الأول، الثاني، الثالث" className="mt-1 w-full rounded-lg border border-emerald-200 bg-white p-2 font-normal" /></label>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2 text-xs font-bold"><input name="printInDocument" type="checkbox" defaultChecked={field.printInDocument !== false} />يظهر في جدول بيانات العقد</label>
      <label className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2 text-xs font-bold"><input name="editable" type="checkbox" defaultChecked={field.editable !== false} />يسمح للعميل بتعديله</label>
      <label className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2 text-xs font-bold"><input name="manualCheckbox" type="checkbox" defaultChecked={field.manualCheckbox} />خانة يدوية في الملحق</label>
    </div>
    <ConditionFields value={field.requiredWhen} fieldKeys={fieldKeys} namePrefix="requiredWhen" title="شرط الإلزام — اختياري" />
  </div>;
}

function ConditionFields({ value, fieldKeys, namePrefix = "condition", title = "شرط الظهور — اختياري", field }: { value?: WizardFieldDefinition["visibleWhen"]; fieldKeys: string[]; namePrefix?: string; title?: string; field?: WizardFieldDefinition }) {
  const atomicCondition = isAtomicCondition(value) ? value : undefined;
  const hasCompositeCondition = Boolean(value && !atomicCondition);

  return (
    <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <FieldAdvancedControls field={field} fieldKeys={fieldKeys} />
      <div className="text-xs font-black text-violet-900">{title}</div>
      {hasCompositeCondition && (
        <p className="mt-2 rounded-lg border border-violet-200 bg-white p-2 text-xs font-bold leading-5 text-violet-700">
          هذا الشرط مركب ومحرك القوالب سيحتفظ به كما هو حتى يتم استبداله بشرط بسيط من الحقول التالية.
        </p>
      )}
      {hasCompositeCondition && <input type="hidden" name={`${namePrefix}ExistingCompositeCondition`} value={JSON.stringify(value)} />}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold text-violet-900">الحقل الذي يعتمد عليه<input list={`${namePrefix}-field-keys`} name={`${namePrefix}FieldKey`} defaultValue={atomicCondition?.fieldKey} className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 font-mono font-normal" /><datalist id={`${namePrefix}-field-keys`}>{fieldKeys.map((key) => <option key={key} value={key} />)}</datalist></label>
        <label className="text-xs font-bold text-violet-900">المقارنة<select name={`${namePrefix}Operator`} defaultValue={atomicCondition?.operator ?? "equals"} className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 font-normal">{conditionOperators.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-xs font-bold text-violet-900">القيمة<input name={`${namePrefix}Value`} defaultValue={atomicCondition?.value === undefined ? "" : String(atomicCondition.value)} className="mt-1 w-full rounded-lg border border-violet-200 bg-white p-2 font-normal" /></label>
      </div>
    </div>
  );
}
