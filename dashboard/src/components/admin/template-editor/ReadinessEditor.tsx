"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import type { ContractVariantDefinition, ReadinessDefinition, ReadinessItemDefinition, ReadinessSectionDefinition } from "@zdraft/template-engine";

type Props = {
  variants: ContractVariantDefinition[];
  readOnly: boolean;
  busy: boolean;
  onSave: (variantKey: string, readiness: ReadinessDefinition) => void;
};

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

export default function ReadinessEditor({ variants, readOnly, busy, onSave }: Props) {
  const firstVariant = variants[0]?.key ?? "";
  const [variantKey, setVariantKey] = useState(firstVariant);
  const selectedVariant = useMemo(() => variants.find((variant) => variant.key === variantKey), [variants, variantKey]);
  const [draft, setDraft] = useState<ReadinessDefinition>(selectedVariant?.readiness ?? emptyReadiness());

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

  if (!variants.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">أضف نوع عقد أولاً حتى تضبط صفحة «أنت جاهز؟».</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h2 className="text-xl font-black text-[#00102e]">صفحة «أنت جاهز؟»</h2><p className="mt-1 text-xs font-semibold text-slate-500">لكل نوع عقد صفحة تجهيز مستقلة. الإرشادات والإعدادات لا تظهر داخل نص العقد.</p></div>
        <select value={variantKey} onChange={(event) => setVariantKey(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black" disabled={busy}>
          {variants.map((variant) => <option key={variant.key} value={variant.key}>{variant.nameAr}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-black text-slate-600">عنوان الصفحة<input value={draft.titleAr ?? ""} onChange={(event) => setDraft((current) => ({ ...current, titleAr: event.target.value }))} disabled={readOnly} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
          <label className="text-xs font-black text-slate-600">وصف الصفحة<textarea value={draft.description ?? ""} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} disabled={readOnly} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
        </div>
      </div>

      {draft.sections.map((section, sectionIndex) => (
        <article key={`${section.key}-${sectionIndex}`} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <label className="text-xs font-black">مفتاح القسم<input value={section.key} onChange={(event) => updateSection(sectionIndex, { key: event.target.value })} disabled={readOnly} className="mt-2 w-full rounded-xl border p-2.5 font-mono text-xs font-normal" /></label>
              <label className="text-xs font-black">عنوان القسم<input value={section.titleAr} onChange={(event) => updateSection(sectionIndex, { titleAr: event.target.value })} disabled={readOnly} className="mt-2 w-full rounded-xl border p-2.5 font-normal" /></label>
              <label className="text-xs font-black">وصف مختصر<input value={section.description ?? ""} onChange={(event) => updateSection(sectionIndex, { description: event.target.value })} disabled={readOnly} className="mt-2 w-full rounded-xl border p-2.5 font-normal" /></label>
            </div>
            {!readOnly && <div className="flex gap-1.5"><button type="button" onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0 || busy} className="rounded-lg border p-2 disabled:opacity-30" title="تحريك لأعلى"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === draft.sections.length - 1 || busy} className="rounded-lg border p-2 disabled:opacity-30" title="تحريك لأسفل"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => setDraft((current) => ({ ...current, sections: current.sections.filter((_, i) => i !== sectionIndex) }))} className="rounded-lg border border-red-200 p-2 text-red-700" title="حذف القسم"><Trash2 className="h-4 w-4" /></button></div>}
          </div>
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            {section.items.map((item, itemIndex) => (
              <div key={`${item.key}-${itemIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 lg:grid-cols-6">
                  <label className="text-[11px] font-black lg:col-span-1">المفتاح<input value={item.key} onChange={(event) => updateItem(sectionIndex, itemIndex, { key: event.target.value })} disabled={readOnly} className="mt-1 w-full rounded-lg border p-2 font-mono text-xs font-normal" /></label>
                  <label className="text-[11px] font-black lg:col-span-2">النص الظاهر<input value={item.labelAr} onChange={(event) => updateItem(sectionIndex, itemIndex, { labelAr: event.target.value })} disabled={readOnly} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
                  <label className="text-[11px] font-black">النوع<select value={item.type ?? "requirement"} onChange={(event) => updateItem(sectionIndex, itemIndex, { type: event.target.value as ReadinessItemDefinition["type"] })} disabled={readOnly} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="requirement">متطلب</option><option value="field">حقل</option><option value="document">مستند</option></select></label>
                  <label className="text-[11px] font-black">Field Key<input value={item.fieldKey ?? ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { fieldKey: event.target.value || undefined })} disabled={readOnly} className="mt-1 w-full rounded-lg border p-2 font-mono text-xs font-normal" /></label>
                  <label className="flex items-end gap-2 rounded-lg border bg-white p-2 text-[11px] font-black"><input type="checkbox" checked={Boolean(item.required)} onChange={(event) => updateItem(sectionIndex, itemIndex, { required: event.target.checked })} disabled={readOnly} />إجباري</label>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-black">الوصف أو الإرشاد<textarea value={item.description ?? ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { description: event.target.value })} disabled={readOnly} rows={2} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-[11px] font-black">مساعدة بجانب علامة (!) <textarea value={item.helpText ?? ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { helpText: event.target.value })} disabled={readOnly} rows={2} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-[11px] font-black">الملفات المسموحة<input value={item.attachmentRules?.acceptedTypes?.join(", ") ?? ""} onChange={(event) => updateAttachmentRules(sectionIndex, itemIndex, { acceptedTypes: event.target.value.split(/[,،\n]/).map((value) => value.trim()).filter(Boolean) })} disabled={readOnly} placeholder="image/*, application/pdf" className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-[11px] font-black">أقصى عدد<input type="number" min="1" value={item.attachmentRules?.maxFiles ?? ""} onChange={(event) => updateAttachmentRules(sectionIndex, itemIndex, { maxFiles: event.target.value ? Number(event.target.value) : undefined })} disabled={readOnly} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-[11px] font-black">أقصى حجم بالبايت<input type="number" min="1" value={item.attachmentRules?.maxBytes ?? ""} onChange={(event) => updateAttachmentRules(sectionIndex, itemIndex, { maxBytes: event.target.value ? Number(event.target.value) : undefined })} disabled={readOnly} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label></div>
                {!readOnly && <div className="mt-3 flex justify-end gap-1.5"><button type="button" onClick={() => moveItem(sectionIndex, itemIndex, -1)} disabled={itemIndex === 0 || busy} className="rounded-lg border p-1.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => moveItem(sectionIndex, itemIndex, 1)} disabled={itemIndex === section.items.length - 1 || busy} className="rounded-lg border p-1.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setDraft((current) => ({ ...current, sections: current.sections.map((entry, i) => i === sectionIndex ? { ...entry, items: entry.items.filter((_, j) => j !== itemIndex) } : entry) }))} className="rounded-lg border border-red-200 p-1.5 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></div>}
              </div>
            ))}
            {!readOnly && <button type="button" onClick={() => setDraft((current) => ({ ...current, sections: current.sections.map((entry, i) => i === sectionIndex ? { ...entry, items: [...entry.items, newItem(entry.items.length)] } : entry) }))} className="inline-flex items-center gap-1 rounded-lg bg-[#986410] px-3 py-2 text-[11px] font-black text-white"><Plus className="h-3.5 w-3.5" />إضافة متطلب</button>}
          </div>
        </article>
      ))}

      <div className="flex flex-wrap justify-between gap-2"><div className="flex gap-2">{!readOnly && <button type="button" onClick={() => setDraft((current) => ({ ...current, sections: [...current.sections, newSection(current.sections.length)] }))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black"><Plus className="h-4 w-4" />إضافة قسم</button>}</div>{!readOnly && <button type="button" disabled={busy} onClick={() => onSave(variantKey, draft)} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-3 text-xs font-black text-[#d5a84c] disabled:opacity-50"><Save className="h-4 w-4" />حفظ صفحة «أنت جاهز؟»</button>}</div>
    </section>
  );
}
