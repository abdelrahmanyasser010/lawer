"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileText, HelpCircle, Plus, Save, Settings, Trash2, Upload } from "lucide-react";
import type { ContractVariantDefinition, ReadinessDefinition, ReadinessItemDefinition, ReadinessSectionDefinition } from "@zdraft/template-engine";

type Props = {
  variants: ContractVariantDefinition[];
  readOnly: boolean;
  busy: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onSave: (variantKey: string, readiness: ReadinessDefinition) => void;
};

type AttachmentPreset = "images_pdf" | "images" | "pdf" | "any" | "custom";

const emptyReadiness = (): ReadinessDefinition => ({
  titleAr: "أنت جاهز؟",
  description: "راجع البيانات والمستندات المطلوبة قبل البدء في تعبئة العقد.",
  sections: [],
});

const newSection = (index: number): ReadinessSectionDefinition => ({
  key: `section_${index + 1}`,
  titleAr: "قسم جديد",
  description: "",
  required: false,
  items: [],
});

const newItem = (index: number): ReadinessItemDefinition => ({
  key: `requirement_${index + 1}`,
  labelAr: "متطلب جديد",
  description: "",
  type: "requirement",
  required: false,
});

const itemTypeLabels: Record<NonNullable<ReadinessItemDefinition["type"]>, string> = {
  requirement: "معلومة يقرأها العميل",
  field: "بيان مطلوب من العميل",
  document: "مستند أو صورة",
};

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

function attachmentPresetLabel(types?: string[]): string {
  const preset = attachmentPresetFromTypes(types);
  if (preset === "images_pdf") return "صور أو PDF";
  if (preset === "images") return "صور فقط";
  if (preset === "pdf") return "PDF فقط";
  if (preset === "custom") return "صيغ مخصصة";
  return "أي ملف مناسب";
}

function bytesToMegabytes(value?: number): string {
  if (!value) return "";
  return String(Math.max(1, Math.round(value / 1024 / 1024)));
}

function megabytesToBytes(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed * 1024 * 1024);
}

function RequirementPreview({ draft }: { draft: ReadinessDefinition }) {
  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
      <div className="text-center">
        <span className="inline-flex rounded-full bg-[#986410]/10 px-3 py-1 text-xs font-black text-[#986410]">معاينة للعميل</span>
        <h3 className="mt-3 text-2xl font-black text-[#00102e]">{draft.titleAr || "أنت جاهز؟"}</h3>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">{draft.description || "راجع البيانات والمستندات المطلوبة قبل البدء."}</p>
      </div>

      <div className="mt-5 space-y-3">
        {draft.sections.map((section, sectionIndex) => (
          <section key={`${section.key}-preview-${sectionIndex}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h4 className="text-sm font-black text-[#00102e]">{section.titleAr || "قسم بدون عنوان"}</h4>
              {section.description && <p className="mt-1 text-xs leading-6 text-slate-500">{section.description}</p>}
            </div>
            <div className="divide-y divide-slate-100">
              {section.items.map((item, itemIndex) => (
                <div key={`${item.key}-preview-${itemIndex}`} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-1 h-4 w-4 rounded border border-slate-300 bg-white" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-800">
                      {item.type === "document" ? <Upload className="h-4 w-4 text-[#986410]" /> : <FileText className="h-4 w-4 text-[#986410]" />}
                      {item.labelAr || "متطلب بدون اسم"}
                      {item.required && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-black text-orange-800">مطلوب</span>}
                    </div>
                    {item.description && <p className="mt-1 text-xs leading-6 text-slate-500">{item.description}</p>}
                    {item.type === "document" && (
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {attachmentPresetLabel(item.attachmentRules?.acceptedTypes)}
                        {item.attachmentRules?.maxFiles ? ` · حتى ${item.attachmentRules.maxFiles} ملف` : ""}
                        {item.attachmentRules?.maxBytes ? ` · حتى ${bytesToMegabytes(item.attachmentRules.maxBytes)} ميجابايت` : ""}
                      </p>
                    )}
                  </div>
                  {item.helpText && <span title={item.helpText} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-800"><HelpCircle className="h-3.5 w-3.5" />!</span>}
                </div>
              ))}
              {!section.items.length && <div className="px-4 py-4 text-center text-sm font-semibold text-slate-500">لا توجد متطلبات داخل هذا القسم.</div>}
            </div>
          </section>
        ))}
        {!draft.sections.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">أضف قسمًا واحدًا على الأقل لتظهر المعاينة هنا.</div>}
      </div>
    </aside>
  );
}

export default function ReadinessEditor({ variants, readOnly, busy, onDirtyChange, onSave }: Props) {
  const firstVariant = variants[0]?.key ?? "";
  const [variantKey, setVariantKey] = useState(firstVariant);
  const selectedVariant = useMemo(() => variants.find((variant) => variant.key === variantKey), [variants, variantKey]);
  const variantFields = useMemo(() => selectedVariant?.steps.flatMap((step) => step.fields.map((field) => ({ key: field.key, label: `${step.titleAr} — ${field.labelAr}` }))) ?? [], [selectedVariant]);
  const [draft, setDraft] = useState<ReadinessDefinition>(selectedVariant?.readiness ?? emptyReadiness());
  const savedReadiness = useMemo(() => selectedVariant?.readiness ?? emptyReadiness(), [selectedVariant]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedReadiness), [draft, savedReadiness]);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!variants.some((variant) => variant.key === variantKey)) {
      // The selected variant can disappear after an admin mutation; keep the selector valid.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVariantKey(firstVariant);
    }
  }, [firstVariant, variantKey, variants]);

  useEffect(() => {
    // The draft is intentionally reset when the admin switches contract variants.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(selectedVariant?.readiness ?? emptyReadiness());
  }, [selectedVariant]);

  function updateSection(index: number, patch: Partial<ReadinessSectionDefinition>) {
    setDraft((current) => ({ ...current, sections: current.sections.map((section, i) => i === index ? { ...section, ...patch } : section) }));
  }

  function updateItem(sectionIndex: number, itemIndex: number, patch: Partial<ReadinessItemDefinition>) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, i) => i !== sectionIndex ? section : {
        ...section,
        items: section.items.map((item, j) => j === itemIndex ? { ...item, ...patch } : item),
      }),
    }));
  }

  function updateAttachmentRules(sectionIndex: number, itemIndex: number, patch: Record<string, unknown>) {
    const item = draft.sections[sectionIndex]?.items[itemIndex];
    updateItem(sectionIndex, itemIndex, { attachmentRules: { ...(item?.attachmentRules ?? {}), ...patch } });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.sections.length) return;
    setDraft((current) => {
      const sections = [...current.sections];
      const [section] = sections.splice(index, 1);
      sections.splice(target, 0, section);
      return { ...current, sections };
    });
  }

  function moveItem(sectionIndex: number, index: number, direction: -1 | 1) {
    const target = index + direction;
    const section = draft.sections[sectionIndex];
    if (!section || target < 0 || target >= section.items.length) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((item, i) => {
        if (i !== sectionIndex) return item;
        const items = [...item.items];
        const [entry] = items.splice(index, 1);
        items.splice(target, 0, entry);
        return { ...item, items };
      }),
    }));
  }

  function removeSection(sectionIndex: number) {
    const section = draft.sections[sectionIndex];
    if (!section) return;
    if (!window.confirm(`حذف قسم «${section.titleAr || "بدون عنوان"}» وكل المتطلبات الموجودة داخله؟`)) return;
    setDraft((current) => ({ ...current, sections: current.sections.filter((_, i) => i !== sectionIndex) }));
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    const item = draft.sections[sectionIndex]?.items[itemIndex];
    if (!item) return;
    if (!window.confirm(`حذف المتطلب «${item.labelAr || "بدون اسم"}»؟`)) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((entry, i) => i === sectionIndex ? { ...entry, items: entry.items.filter((_, j) => j !== itemIndex) } : entry),
    }));
  }

  if (!variants.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">أضف نوع عقد أولاً حتى تضبط صفحة «أنت جاهز؟».</div>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black text-[#00102e]">صفحة «أنت جاهز؟»</h2>
            {dirty && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">تغييرات غير محفوظة</span>}
          </div>
          <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">اضبط صفحة التجهيز التي تظهر قبل تعبئة العقد. كل نوع عقد له صفحة مستقلة ومعاينة مباشرة.</p>
        </div>
        <label className="min-w-72 text-sm font-black text-slate-700">
          اختر نوع العقد
          <select value={variantKey} onChange={(event) => {
            const nextKey = event.target.value;
            if (dirty && !window.confirm("لديك تغييرات غير محفوظة في هذا النوع. هل تريد الانتقال بدون حفظها؟")) return;
            setVariantKey(nextKey);
          }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#00102e]" disabled={busy}>
            {variants.map((variant) => <option key={variant.key} value={variant.key}>{variant.nameAr}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-black text-[#00102e]">نصوص أعلى الصفحة</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">هذه أول رسائل يقرأها العميل قبل بدء العقد.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-black text-slate-700">
                عنوان الصفحة
                <input value={draft.titleAr ?? ""} onChange={(event) => setDraft((current) => ({ ...current, titleAr: event.target.value }))} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[#986410]" />
              </label>
              <label className="text-sm font-black text-slate-700">
                وصف مختصر
                <textarea value={draft.description ?? ""} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} disabled={readOnly} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal leading-7 outline-none focus:border-[#986410]" />
              </label>
            </div>
          </div>

          {draft.sections.map((section, sectionIndex) => (
            <article key={`${section.key}-${sectionIndex}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid flex-1 gap-4 md:grid-cols-2">
                    <label className="text-sm font-black text-slate-700">
                      عنوان القسم
                      <input value={section.titleAr} onChange={(event) => updateSection(sectionIndex, { titleAr: event.target.value })} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#986410]" />
                    </label>
                    <label className="text-sm font-black text-slate-700">
                      وصف القسم
                      <input value={section.description ?? ""} onChange={(event) => updateSection(sectionIndex, { description: event.target.value })} disabled={readOnly} placeholder="مثال: المستندات المطلوبة قبل البدء" className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#986410]" />
                    </label>
                  </div>
                  {!readOnly && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0 || busy} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" />أعلى</button>
                      <button type="button" onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === draft.sections.length - 1 || busy} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" />أسفل</button>
                      <button type="button" onClick={() => removeSection(sectionIndex)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"><Trash2 className="h-4 w-4" />حذف</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-5">
                {section.items.map((item, itemIndex) => (
                  <div key={`${item.key}-${itemIndex}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="text-sm font-black text-slate-700 xl:col-span-2">
                          النص الظاهر للعميل
                          <input value={item.labelAr} onChange={(event) => updateItem(sectionIndex, itemIndex, { labelAr: event.target.value })} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[#986410]" />
                        </label>
                        <label className="text-sm font-black text-slate-700">
                          نوع المطلوب
                          <select value={item.type ?? "requirement"} onChange={(event) => {
                            const nextType = event.target.value as ReadinessItemDefinition["type"];
                            updateItem(sectionIndex, itemIndex, { type: nextType, attachmentRules: nextType === "document" ? item.attachmentRules : undefined });
                          }} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#986410]">
                            {Object.entries(itemTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        <label className="text-sm font-black text-slate-700 xl:col-span-2">
                          وصف أو إرشاد يظهر تحت السطر
                          <textarea value={item.description ?? ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { description: event.target.value })} disabled={readOnly} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal leading-7 outline-none focus:border-[#986410]" />
                        </label>
                        <label className="text-sm font-black text-slate-700">
                          علامة المساعدة (!)
                          <textarea value={item.helpText ?? ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { helpText: event.target.value })} disabled={readOnly} rows={2} placeholder="شرح قصير يظهر عند علامة التعجب" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal leading-7 outline-none focus:border-[#986410]" />
                        </label>
                      </div>

                      {!readOnly && (
                        <div className="flex flex-wrap gap-2 lg:w-56 lg:justify-end">
                          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${item.required ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                            <input type="checkbox" checked={Boolean(item.required)} onChange={(event) => updateItem(sectionIndex, itemIndex, { required: event.target.checked })} disabled={readOnly} className="h-4 w-4 accent-[#986410]" />
                            {item.required ? "إجباري" : "اختياري"}
                          </label>
                          <button type="button" onClick={() => moveItem(sectionIndex, itemIndex, -1)} disabled={itemIndex === 0 || busy} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" />أعلى</button>
                          <button type="button" onClick={() => moveItem(sectionIndex, itemIndex, 1)} disabled={itemIndex === section.items.length - 1 || busy} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" />أسفل</button>
                          <button type="button" onClick={() => removeItem(sectionIndex, itemIndex)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"><Trash2 className="h-4 w-4" />حذف</button>
                        </div>
                      )}
                    </div>

                    {item.type === "document" && (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 md:grid-cols-3">
                        <label className="text-sm font-black text-sky-950">
                          نوع الملف المقبول
                          <select value={attachmentPresetFromTypes(item.attachmentRules?.acceptedTypes)} onChange={(event) => updateAttachmentRules(sectionIndex, itemIndex, { acceptedTypes: attachmentTypesForPreset(event.target.value as AttachmentPreset, item.attachmentRules?.acceptedTypes) })} disabled={readOnly} className="mt-2 w-full rounded-xl border border-sky-200 bg-white p-3 text-sm font-normal">
                            <option value="images_pdf">صور أو PDF</option>
                            <option value="images">صور فقط</option>
                            <option value="pdf">PDF فقط</option>
                            <option value="any">أي ملف مناسب</option>
                            <option value="custom">تخصيص متقدم</option>
                          </select>
                        </label>
                        <label className="text-sm font-black text-sky-950">
                          أقصى عدد ملفات
                          <input type="number" min="1" value={item.attachmentRules?.maxFiles ?? ""} onChange={(event) => updateAttachmentRules(sectionIndex, itemIndex, { maxFiles: event.target.value ? Number(event.target.value) : undefined })} disabled={readOnly} className="mt-2 w-full rounded-xl border border-sky-200 bg-white p-3 text-sm font-normal" />
                        </label>
                        <label className="text-sm font-black text-sky-950">
                          أقصى حجم للملف
                          <div className="mt-2 flex overflow-hidden rounded-xl border border-sky-200 bg-white">
                            <input type="number" min="1" value={bytesToMegabytes(item.attachmentRules?.maxBytes)} onChange={(event) => updateAttachmentRules(sectionIndex, itemIndex, { maxBytes: megabytesToBytes(event.target.value) })} disabled={readOnly} className="min-w-0 flex-1 p-3 text-sm font-normal outline-none" />
                            <span className="border-r border-sky-100 px-3 py-3 text-sm font-black text-sky-800">MB</span>
                          </div>
                        </label>
                      </div>
                    )}

                    <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <summary className="inline-flex cursor-pointer items-center gap-2 text-xs font-black text-slate-500"><Settings className="h-3.5 w-3.5" />ربط متقدم</summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="text-xs font-black text-slate-600">
                          ربط بحقل داخل العقد
                          <select value={item.fieldKey ?? ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { fieldKey: event.target.value || undefined })} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal">
                            <option value="">بدون ربط</option>
                            {variantFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                          </select>
                        </label>
                        {item.type === "document" && attachmentPresetFromTypes(item.attachmentRules?.acceptedTypes) === "custom" && (
                          <label className="text-xs font-black text-slate-600">
                            صيغ مخصصة
                            <input value={item.attachmentRules?.acceptedTypes?.join(", ") ?? ""} onChange={(event) => updateAttachmentRules(sectionIndex, itemIndex, { acceptedTypes: event.target.value.split(/[,،\n]/).map((value) => value.trim()).filter(Boolean) })} disabled={readOnly} placeholder="image/*, application/pdf" className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs font-normal" />
                          </label>
                        )}
                      </div>
                    </details>
                  </div>
                ))}
                {!section.items.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">لا توجد متطلبات داخل هذا القسم.</div>}
                {!readOnly && (
                  <button type="button" onClick={() => setDraft((current) => ({ ...current, sections: current.sections.map((entry, i) => i === sectionIndex ? { ...entry, items: [...entry.items, newItem(entry.items.length)] } : entry) }))} className="inline-flex items-center gap-2 rounded-xl bg-[#986410] px-4 py-3 text-sm font-black text-white">
                    <Plus className="h-4 w-4" />إضافة متطلب داخل القسم
                  </button>
                )}
              </div>
            </article>
          ))}

          <div className="flex flex-wrap justify-between gap-3">
            {!readOnly && (
              <button type="button" onClick={() => setDraft((current) => ({ ...current, sections: [...current.sections, newSection(current.sections.length)] }))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#00102e]">
                <Plus className="h-4 w-4" />إضافة قسم جديد
              </button>
            )}
            {!readOnly && (
              <button type="button" disabled={busy || !dirty} onClick={() => onSave(variantKey, draft)} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-6 py-3 text-sm font-black text-[#d7a94f] disabled:opacity-50">
                <Save className="h-4 w-4" />{dirty ? "حفظ التغييرات" : "لا توجد تغييرات"}
              </button>
            )}
          </div>
        </div>

        <RequirementPreview draft={draft} />
      </div>
    </section>
  );
}
