"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import type {
  ContractFieldValue,
  PrimitiveFieldValue,
  RepeaterRowValue,
  WizardFieldDefinition,
} from "@zdraft/template-engine";

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
        <span className="text-xs font-bold leading-6 text-slate-700">{field.labelAr}</span>
      </label>
    );
  }

  const type = field.type === "date" ? "date" : field.type === "number" || field.type === "money" ? "number" : "text";
  return (
    <input
      type={type}
      value={String(value ?? "")}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      placeholder={field.placeholder}
      min={field.validation?.min}
      max={field.validation?.max}
      className={inputClass}
      dir={type === "number" || type === "date" ? "ltr" : undefined}
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
  const rows = value.length > 0 ? value : [{}];

  const updateRow = (index: number, key: string, nextValue: PrimitiveFieldValue) => {
    const nextRows = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: nextValue } : row));
    onChange(nextRows);
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
            {field.columns?.map((column) => (
              <div key={column.key}>
                <label className="mb-1 block text-[10px] font-black text-slate-600">
                  {column.labelAr} {column.required && <span className="text-rose-500">*</span>}
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
                ) : (
                  <input
                    type={column.type === "date" ? "date" : column.type === "number" || column.type === "money" ? "number" : "text"}
                    value={String(row[column.key] ?? "")}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => updateRow(index, column.key, event.target.value)}
                    placeholder={column.placeholder}
                    dir={column.type === "date" || column.type === "number" || column.type === "money" ? "ltr" : undefined}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, {}])}
        className="inline-flex items-center gap-2 rounded-xl border border-[#986410]/30 bg-[#986410]/5 px-3 py-2 text-xs font-black text-[#986410]"
      >
        <Plus className="h-4 w-4" /> إضافة عنصر
      </button>
    </div>
  );
}

export default function DynamicFieldRenderer({ field, value, onChange, onFilesSelected, uploading = false }: DynamicFieldRendererProps) {
  if (field.type === "attachment") {
    const fileNames = Array.isArray(value) && value.every((item) => typeof item === "string")
      ? (value as string[])
      : [];
    return (
      <div>
        <label className="mb-1 block text-xs font-black text-slate-700">
          {field.labelAr} {field.required && <span className="text-rose-500">*</span>}
        </label>
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center transition hover:border-[#986410]/50 hover:bg-[#986410]/5">
          <span className="text-xs font-black text-[#00102e]">{uploading ? "جاري رفع الملفات..." : "اختر صورًا أو ملفات داعمة"}</span>
          <span className="mt-1 text-[10px] font-semibold text-slate-500">تُرفع الملفات إلى التخزين الخاص ولا تُحفظ داخل المتصفح.</span>
          <input
            type="file"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const files = Array.from(event.target.files ?? []);
              if (onFilesSelected) void onFilesSelected(files);
              else onChange(files.map((file) => file.name));
              event.target.value = "";
            }}
          />
        </label>
        {fileNames.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fileNames.map((name) => (
              <span key={name} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800">{name}</span>
            ))}
          </div>
        )}
        {field.helpText && <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500">{field.helpText}</p>}
      </div>
    );
  }
  if (field.type === "repeater") {
    const rows = Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null)
      ? (value as RepeaterRowValue[])
      : [];
    return (
      <div>
        <label className="mb-2 block text-xs font-black text-slate-700">
          {field.labelAr} {field.required && <span className="text-rose-500">*</span>}
        </label>
        <RepeaterRenderer field={field} value={rows} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return renderScalarControl(field, scalarValue(value), onChange);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-black text-slate-700">
        {field.labelAr} {field.required && <span className="text-rose-500">*</span>}
      </label>
      {renderScalarControl(field, scalarValue(value), onChange)}
      {field.helpText && <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500">{field.helpText}</p>}
    </div>
  );
}
