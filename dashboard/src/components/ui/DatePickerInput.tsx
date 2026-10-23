"use client";

import React, { useRef } from "react";
import { Calendar, X } from "lucide-react";

export interface DatePickerInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  hasError?: boolean;
  disabled?: boolean;
  required?: boolean;
  showTodayButton?: boolean;
  clearable?: boolean;
  className?: string;
  wrapperClassName?: string;
  "aria-label"?: string;
  name?: string;
  id?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "اليوم / الشهر / السنة",
  min,
  max,
  hasError = false,
  disabled = false,
  required = false,
  showTodayButton = true,
  clearable = false,
  className = "",
  wrapperClassName = "",
  "aria-label": ariaLabel,
  name,
  id,
}: DatePickerInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  // Format "YYYY-MM-DD" -> "DD / MM / YYYY"
  const displayDate =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value.split("-").reverse().join(" / ")
      : value;

  const handleClick = () => {
    if (disabled) return;
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

  const setToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const today = new Date().toISOString().split("T")[0];
    onChange(today);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange("");
  };

  const baseClasses = hasError
    ? "border-rose-400 bg-rose-50/20 text-rose-950 focus:border-rose-600 focus:ring-rose-500/20"
    : "border-slate-200 bg-white text-slate-900 focus:border-[#00102e] focus:ring-[#986410]/30";

  return (
    <div className={`relative inline-block w-full ${disabled ? "opacity-70" : ""} ${wrapperClassName}`}>
      <div
        onClick={handleClick}
        className={`relative flex items-center ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input
          type="text"
          readOnly
          id={id}
          name={name}
          aria-label={ariaLabel}
          required={required}
          value={displayDate || ""}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-3 py-2 text-xs font-medium transition-all outline-none focus:ring-1 ${baseClasses} ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          } ${showTodayButton ? "pl-20" : clearable && value ? "pl-16" : "pl-9"} ${className}`}
        />

        {/* Calendar Icon on Left in RTL */}
        <Calendar
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
            hasError ? "text-rose-500" : "text-slate-400"
          }`}
        />

        {/* Quick Today Button */}
        {showTodayButton && !disabled && (
          <button
            type="button"
            onClick={setToday}
            className="absolute left-8 top-1/2 z-10 -translate-y-1/2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-black text-slate-600 transition hover:bg-[#986410]/15 hover:text-[#00102e]"
          >
            اليوم
          </button>
        )}

        {/* Optional Clear Button */}
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-8 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
            title="مسح التاريخ"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Hidden Native Picker */}
        <input
          ref={hiddenInputRef}
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          min={min ? String(min) : undefined}
          max={max ? String(max) : undefined}
          disabled={disabled}
          className="absolute inset-0 h-full w-full pointer-events-none opacity-0"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
