"use client";

import { AlertCircle, FileStack, FileText } from "lucide-react";
import type { ContractFieldValue, WizardStepDefinition } from "../domain/contractTemplate.types";
import DynamicFieldRenderer from "./DynamicFieldRenderer";

interface DynamicOptionalStepProps {
  step: WizardStepDefinition;
  fieldValues: Record<string, ContractFieldValue>;
  fieldErrors?: Record<string, string>;
  stepErrors?: string[];
  touchedFieldKeys?: Set<string>;
  onFieldChange: (fieldKey: string, value: ContractFieldValue) => void;
  onFieldFocus?: (fieldKey: string, labelAr: string) => void;
  onFilesSelected?: (fieldKey: string, files: File[]) => Promise<void> | void;
  uploadingField?: string | null;
}

export default function DynamicOptionalStep({
  step,
  fieldValues,
  fieldErrors = {},
  stepErrors = [],
  touchedFieldKeys,
  onFieldChange,
  onFieldFocus,
  onFilesSelected,
  uploadingField,
}: DynamicOptionalStepProps) {
  const isAnnex = step.articleRange === "مستند منفصل" || step.sourceClauseKey?.includes("annex");
  const Icon = isAnnex ? FileStack : FileText;

  // Filter cross-field step warnings that are not already attached to a specific field
  const crossFieldWarnings = stepErrors.filter((msg) => {
    return !step.fields.some((f) => fieldErrors[f.key] === msg);
  });

  return (
    <section className="rounded-2xl border border-[#986410]/30 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-start gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#986410]/10 text-[#986410]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-[#00102e]">{step.titleAr}</h3>
            {step.articleRange && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-500">
                {step.articleRange}
              </span>
            )}
            {isAnnex && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-800">
                سيُضاف بعد العقد في ملف PDF النهائي
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
            {step.description ??
              (isAnnex
                ? "البيانات التالية تخص الملحق فقط، ولن تُدمج كصفحات طويلة داخل العقد الأساسي."
                : null)}
          </p>
        </div>
      </div>

      {crossFieldWarnings.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-bold text-rose-800 space-y-1 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-black text-rose-900 mb-1">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>تنبيهات في هذه الخطوة:</span>
          </div>
          {crossFieldWarnings.map((warning, idx) => (
            <p key={idx} className="text-[11px] leading-5 pr-5">
              • {warning}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {step.fields.map((field) => (
          <div key={field.key} data-field-key={field.key} className={field.type === "repeater" || field.type === "textarea" ? "sm:col-span-2" : ""}>
            <DynamicFieldRenderer
              field={field}
              value={fieldValues[field.key]}
              allFormValues={fieldValues}
              errorMessage={fieldErrors[field.key]}
              touched={touchedFieldKeys?.has(field.key)}
              onChange={(value) => onFieldChange(field.key, value)}
              onFocus={() => onFieldFocus?.(field.key, field.labelAr)}
              onFilesSelected={onFilesSelected ? (files) => onFilesSelected(field.key, files) : undefined}
              uploading={uploadingField === field.key}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

