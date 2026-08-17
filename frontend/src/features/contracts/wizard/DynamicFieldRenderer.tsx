"use client";

import React, { useRef } from "react";
import { Calendar, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import { evaluateCondition } from "@zdraft/template-engine";
import type {
  ContractFieldValue,
  PrimitiveFieldValue,
  RepeaterRowValue,
  WizardFieldDefinition,
} from "../domain/contractTemplate.types";

interface DynamicFieldRendererProps {
  field: WizardFieldDefinition;
  value: ContractFieldValue | undefined;
  onChange: (value: ContractFieldValue) => void;
  onFilesSelected?: (files: File[]) => Promise<void> | void;
  uploading?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 transition-all focus:border-[#00102e] focus:outline-none focus:ring-1 focus:ring-[#986410]/30";

function scalarValue(value: ContractFieldValue | undefined): PrimitiveFieldValue {
  if (Array.isArray(value)) return "";
  return value ?? "";
}

function DateFieldInput({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (val: string) => void;
  min?: string | number;
  max?: string | number;
}) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const displayDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join(" / ")
    : value;

  const handleClick = () => {
    const el = hiddenInputRef.current;
    if (!el) return;
    try {
      const anyEl = el as unknown as { showPicker?: () => void; focus?: () => void };
      if (typeof anyEl.showPicker === "function") {
        anyEl.showPicker();
      } else {
        anyEl.focus?.();
      }
    } catch {
      (el as unknown as { focus?: () => void }).focus?.();
    }
  };

  return (
    <div onClick={handleClick} className="relative flex items-center cursor-pointer">
      <input
        type="text"
        readOnly
        value={displayDate || ""}
        placeholder="اختر التاريخ"
        className={`${inputClass} cursor-pointer pr-4 pl-10`}
      />
      <Calendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        ref={hiddenInputRef}
        type="date"
        value={value || ""}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        min={min ? String(min) : undefined}
        max={max ? String(max) : undefined}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}

function renderScalarControl(
  field: WizardFieldDefinition,
  value: PrimitiveFieldValue,
  onChange: (value: PrimitiveFieldValue) => void,
) {
  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className={`${inputClass} min-h-28 resize-y`}
      />
    );
  }

  if (field.type === "radio") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {field.options?.map((option) => {
          const selected = String(value ?? "") === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-xl border px-3 py-2.5 text-right text-xs font-black transition ${
                selected
                  ? "border-[#986410] bg-[#986410]/10 text-[#00102e]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-[#986410]/40"
              }`}
            >
              {option.labelAr}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <select value={String(value ?? "")} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)} className={inputClass}>
        <option value="">اختر...</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.labelAr}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#986410]"
        />
        <span className={`text-[10px] font-bold leading-6 ${field.required ? "text-[#c66b22]" : "text-slate-700"}`}>
          {field.labelAr} {field.required && <span aria-label="إلزامي">*</span>}
        </span>
      </label>
    );
  }

  if (field.type === "date") {
    return (
      <DateFieldInput
        value={String(value ?? "")}
        onChange={(val) => onChange(val)}
        min={field.validation?.min}
        max={field.validation?.max}
      />
    );
  }

  const type = field.type === "number" || field.type === "money" ? "number" : "text";
  return (
    <input
      type={type}
      value={String(value ?? "")}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      placeholder={field.placeholder}
      min={field.validation?.min}
      max={field.validation?.max}
      className={inputClass}
    />
  );
}

function RepeaterRenderer({
  field,
  value,
  onChange,
}: {
  field: WizardFieldDefinition;
  value: RepeaterRowValue[];
  onChange: (value: RepeaterRowValue[]) => void;
}) {
  const rows = Array.isArray(value) && value.length > 0 ? value : [{}];

  const updateRow = (index: number, key: string, nextValue: PrimitiveFieldValue) => {
    const next = [...rows];
    next[index] = {
      ...next[index],
      [key]: nextValue,
    };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[11px] font-black text-[#00102e]">عنصر رقم {index + 1}</span>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
              disabled={rows.length <= Math.max(1, field.minRows ?? 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" /> حذف
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {field.columns
              ?.filter((column) => !column.visibleWhen || evaluateCondition(column.visibleWhen, row))
              .map((column) => {
                const required = Boolean(column.required || (column.requiredWhen && evaluateCondition(column.requiredWhen, row)));
                return (
                  <div key={column.key}>
                    <label className="mb-1 block text-[10px] font-black text-slate-600">
                      {column.labelAr} {required && <span className="text-[#c66b22]">*</span>}
                    </label>
                    {column.type === "select" ? (
                      <select
                        value={String(row[column.key] ?? "")}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => updateRow(index, column.key, event.target.value)}
                        className={inputClass}
                      >
                        <option value="">اختر...</option>
                        {column.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.labelAr}
                          </option>
                        ))}
                      </select>
                    ) : column.type === "date" ? (
                      <DateFieldInput
                        value={String(row[column.key] ?? "")}
                        onChange={(val) => updateRow(index, column.key, val)}
                      />
                    ) : (
                      <input
                        type={column.type === "number" || column.type === "money" ? "number" : "text"}
                        value={String(row[column.key] ?? "")}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateRow(index, column.key, event.target.value)}
                        placeholder={column.placeholder}
                        className={inputClass}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, {}])}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#986410]/40 bg-[#986410]/5 px-3 py-2 text-xs font-black text-[#986410] hover:bg-[#986410]/10"
      >
        <span className="text-sm">+</span> إضافة بند جديد
      </button>
    </div>
  );
}

interface DynamicFieldRendererProps {
  field: WizardFieldDefinition;
  value: ContractFieldValue | undefined;
  allFormValues?: Record<string, any>;
  onChange: (value: ContractFieldValue) => void;
  onFilesSelected?: (files: File[]) => Promise<void> | void;
  uploading?: boolean;
}

export default function DynamicFieldRenderer({
  field,
  value,
  allFormValues = {},
  onChange,
}: DynamicFieldRendererProps) {
  if (field.type === "repeater") {
    const listValue = Array.isArray(value) ? (value as RepeaterRowValue[]) : [];
    return <RepeaterRenderer field={field} value={listValue} onChange={onChange} />;
  }

  let label = field.labelAr;
  let placeholder = field.placeholder;
  let helpText = field.helpText;

  if (field.key.endsWith("_national_id")) {
    const natKey = field.key.replace(/_national_id$/, "_nationality");
    const natVal = String(allFormValues[natKey] ?? "").trim();
    const isNonEgyptian = natVal !== "" && natVal !== "مصري" && natVal !== "egyptian" && natVal !== "مصرية" && natVal !== "مصري الجنسية";
    if (isNonEgyptian) {
      label = "رقم جواز السفر";
      placeholder = "أدخل رقم جواز السفر الساري";
      helpText = "رقم جواز السفر للمتعاقد غير المصري";
    } else {
      label = "الرقم القومي";
      placeholder = "14 رقمًا قوميًا";
      helpText = "الرقم القومي المكون من 14 رقمًا للمواطن المصري";
    }
  }

  const effectiveField: WizardFieldDefinition = {
    ...field,
    labelAr: label,
    placeholder: placeholder || field.placeholder,
  };

  return (
    <div className="space-y-1.5">
      {field.type !== "checkbox" && (
        <label className="block text-xs font-bold text-[#00102e]">
          {label} {field.required && <span className="text-[#c66b22]">*</span>}
        </label>
      )}
      {renderScalarControl(effectiveField, scalarValue(value), (next) => onChange(next))}
      {helpText && (
        <p className="text-[10px] text-slate-400 leading-normal">{helpText}</p>
      )}
    </div>
  );
}
