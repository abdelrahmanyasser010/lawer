"use client";

import React from "react";
import { numberToEgyptianPoundsWords } from "@zdraft/template-engine";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  currency?: string;
}

export default function ArabicCurrencyInput({
  value,
  onChange,
  label,
  placeholder = "0",
  required = false,
  min = 0,
  max = 999_999_999,
  currency = "ج.م",
}: Props) {
  const numVal = Number(value);
  const hasValue = value !== "" && !isNaN(numVal) && numVal > 0;
  const isInvalid = value !== "" && (!hasValue || numVal < min || numVal > max);
  const arabicText = hasValue ? numberToEgyptianPoundsWords(numVal) : "";

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Input Field */}
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          className={`w-full rounded-xl border py-2.5 pl-14 pr-10 text-left text-sm font-bold text-[#00102e] focus:outline-none focus:ring-1 transition-all ${
            isInvalid
              ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200"
              : hasValue
              ? "border-emerald-300 bg-emerald-50/40 focus:border-[#986410] focus:ring-[#986410]/20"
              : "border-slate-300 bg-white focus:border-[#986410] focus:ring-[#986410]/20"
          }`}
          dir="ltr"
        />
        {/* Currency badge */}
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
          {currency}
        </span>
        {/* Status icon */}
        {hasValue && !isInvalid && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
        )}
        {isInvalid && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
        )}
      </div>

      {/* Arabic Words Display */}
      {hasValue && !isInvalid && (
        <div className="rounded-lg border border-[#986410]/25 bg-[#986410]/5 px-3.5 py-2.5 flex items-start gap-2">
          <span className="text-[10px] text-[#986410] font-bold shrink-0 mt-0.5">كتابةً تلقائيًا:</span>
          <span className="text-[11px] text-[#00102e] font-bold leading-relaxed" dir="rtl">
            {arabicText}
          </span>
        </div>
      )}

      {/* Validation error */}
      {isInvalid && (
        <p className="text-[10px] text-red-600 font-bold flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {numVal < min ? `الحد الأدنى المسموح: ${min.toLocaleString("ar-EG")}` : `الحد الأقصى المسموح: ${max.toLocaleString("ar-EG")}`}
        </p>
      )}
    </div>
  );
}
