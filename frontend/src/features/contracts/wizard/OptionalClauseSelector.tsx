"use client";

import { Check, FileStack, PlusCircle } from "lucide-react";
import type { ContractFieldValue, ContractTemplateDefinition } from "../domain/contractTemplate.types";
import { evaluateCondition } from "@/features/contracts/wizard/resolveWizardDefinition";

interface OptionalClauseSelectorProps {
  template: ContractTemplateDefinition;
  variantKey: string;
  selectedClauseKeys: string[];
  fieldValues: Record<string, ContractFieldValue>;
  onToggle: (clauseKey: string) => void;
  compact?: boolean;
}

export default function OptionalClauseSelector({
  template,
  variantKey,
  selectedClauseKeys,
  fieldValues,
  onToggle,
  compact = false,
}: OptionalClauseSelectorProps) {
  const variant = template.variants.find((item) => item.key === variantKey);
  if (!variant) return null;

  const clauses = template.optionalClauses.filter(
    (clause) =>
      variant.allowedOptionalClauseKeys.includes(clause.key) &&
      clause.applicableVariantKeys.includes(variant.key) &&
      (clause.key !== "sale_installment_schedule" || fieldValues.sale_payment_plan === "installments"),
  );

  if (clauses.length === 0) return null;
  const requiredAnnexKeys = new Set(variant.requiredAnnexKeys ?? []);

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-3 flex items-center gap-2">
        <PlusCircle className="h-4 w-4 text-[#986410]" />
        <div>
          <h2 className="text-sm font-black text-[#00102e]">ملاحق العقد</h2>
          {!compact && (
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              الملاحق الأساسية تُضاف تلقائيًا ولا يمكن إلغاؤها، والملاحق الاختيارية يمكنك إضافتها حسب الحاجة. جميعها تصدر كقوالب فارغة بعد العقد داخل نفس ملف PDF.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {clauses.map((clause) => {
          const required = requiredAnnexKeys.has(clause.key) || Boolean(clause.requiredWhen && evaluateCondition(clause.requiredWhen, fieldValues));
          const selected = required || selectedClauseKeys.includes(clause.key);
          const separateAnnex = clause.outputMode === "separate_annex";
          return (
            <button
              key={clause.key}
              type="button"
              onClick={() => !required && onToggle(clause.key)}
              disabled={required}
              className={`rounded-xl border px-3 py-3 text-right transition-all ${
                selected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#986410]/40"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-black">
                    {separateAnnex && <FileStack className="h-3.5 w-3.5" />}
                    {clause.nameAr}
                  </span>
                  <span className="mt-1 block text-[10px] font-semibold leading-5 opacity-75">{clause.description}</span>
                  <span className="mt-2 inline-flex rounded-full border border-current/20 bg-white px-2 py-0.5 text-[9px] font-black">
                    {required ? "أساسي — مضاف تلقائيًا" : separateAnnex ? "اختياري — يُضاف بعد العقد" : "اختياري"}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
