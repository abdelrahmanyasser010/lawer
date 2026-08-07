"use client";

import { CheckCircle2, FileText, Layers3 } from "lucide-react";
import type { ContractTemplateDefinition } from "../domain/contractTemplate.types";

interface VariantSelectorProps {
  template: ContractTemplateDefinition;
  selectedVariantKey: string | null;
  onSelect: (variantKey: string) => void;
}

export default function VariantSelector({ template, selectedVariantKey, onSelect }: VariantSelectorProps) {
  const parentLabel = template.slug === "apartment_sale" ? "نوع عقد البيع" : "نوع عقد الإيجار";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00102e] text-[#986410]">
          <Layers3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-[#00102e]">اختر {parentLabel} قبل بدء المعالج</h2>
          <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
            كل اختيار له صياغته وحقوله القانونية المستقلة، بينما تظل الإضافات الطويلة في ملاحق منفصلة.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {template.variants.map((variant) => {
          const selected = variant.key === selectedVariantKey;
          return (
            <button
              key={variant.key}
              type="button"
              onClick={() => onSelect(variant.key)}
              className={`rounded-2xl border p-4 text-right transition-all ${
                selected
                  ? "border-[#986410] bg-[#986410]/5 ring-2 ring-[#986410]/20"
                  : "border-slate-200 bg-slate-50 hover:border-[#986410]/40 hover:bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black text-[#986410]">
                    <FileText className="h-3.5 w-3.5" />
                    <span>صيغة مستقلة</span>
                  </div>
                  <h3 className="text-sm font-black text-[#00102e]">{variant.nameAr}</h3>
                  {variant.description && (
                    <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">{variant.description}</p>
                  )}
                  {variant.sourceDocumentName && (
                    <p className="mt-3 text-[9px] font-bold text-slate-400">المصدر: {variant.sourceDocumentName}</p>
                  )}
                </div>
                {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
