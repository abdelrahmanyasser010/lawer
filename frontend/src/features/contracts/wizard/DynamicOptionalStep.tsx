"use client";

import { FileStack, FileText } from "lucide-react";
import type { ContractFieldValue, WizardStepDefinition } from "../domain/contractTemplate.types";
import DynamicFieldRenderer from "./DynamicFieldRenderer";

interface DynamicOptionalStepProps {
  step: WizardStepDefinition;
  fieldValues: Record<string, ContractFieldValue>;
  onFieldChange: (fieldKey: string, value: ContractFieldValue) => void;
  onFilesSelected?: (fieldKey: string, files: File[]) => Promise<void> | void;
  uploadingField?: string | null;
}

export default function DynamicOptionalStep({ step, fieldValues, onFieldChange, onFilesSelected, uploadingField }: DynamicOptionalStepProps) {
  const isAnnex = step.articleRange === "مستند منفصل" || step.sourceClauseKey?.includes("annex");
  const Icon = isAnnex ? FileStack : FileText;

  return (
    <section className="rounded-2xl border border-[#986410]/30 bg-white p-6 shadow-xs">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10 text-[#986410]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-[#00102e]">{step.titleAr}</h3>
            {isAnnex && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-800">
                سيصدر كمستند مستقل
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
            {step.description ??
              (isAnnex
                ? "البيانات التالية تخص الملحق فقط، ولن تُدمج كصفحات طويلة داخل العقد الأساسي."
                : "هذه الحقول مرتبطة بنوع العقد المختار وتتحكم في الصياغة القانونية تلقائيًا.")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {step.fields.map((field) => (
          <div key={field.key} className={field.type === "repeater" || field.type === "textarea" ? "sm:col-span-2" : ""}>
            <DynamicFieldRenderer
              field={field}
              value={fieldValues[field.key]}
              onChange={(value) => onFieldChange(field.key, value)}
              onFilesSelected={onFilesSelected ? (files) => onFilesSelected(field.key, files) : undefined}
              uploading={uploadingField === field.key}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
