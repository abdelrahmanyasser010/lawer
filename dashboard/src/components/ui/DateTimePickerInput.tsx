"use client";

import React, { useRef } from "react";
import { Calendar, Clock, X } from "lucide-react";

export interface DateTimePickerInputProps {
  value?: string; // e.g. "2026-10-23T14:30"
  defaultValue?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  className?: string;
  wrapperClassName?: string;
  "aria-label"?: string;
  name?: string;
  id?: string;
}

export function DateTimePickerInput({
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "اليوم / الشهر / السنة — --:--",
  hasError = false,
  disabled = false,
  required = false,
  clearable = false,
  className = "",
  wrapperClassName = "",
  "aria-label": ariaLabel,
  name,
  id,
}: DateTimePickerInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const [internalVal, setInternalVal] = React.useState(defaultValue || "");

  const currentValue = controlledValue !== undefined ? controlledValue : internalVal;

  const formatDisplay = (val: string) => {
    if (!val) return "";
    const [datePart, timePart] = val.split("T");
    if (!datePart) return val;
    const formattedDate = datePart.split("-").reverse().join(" / ");
    if (!timePart) return formattedDate;

    const [hStr, mStr] = timePart.split(":");
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return `${formattedDate} - ${timePart}`;
    const period = h >= 12 ? "م" : "ص";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${formattedDate}  ·  ${h12}:${mStr} ${period}`;
  };

  const displayVal = formatDisplay(currentValue);

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

  const handleChange = (newVal: string) => {
    if (controlledValue === undefined) {
      setInternalVal(newVal);
    }
    onChange?.(newVal);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    handleChange("");
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
          value={displayVal}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-3 py-2 text-xs font-medium transition-all outline-none focus:ring-1 ${baseClasses} ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          } pl-8 ${className}`}
        />

        <Calendar
          className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
            hasError ? "text-rose-500" : "text-slate-400"
          }`}
        />

        {clearable && currentValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-7 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
            title="مسح"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        <input
          ref={hiddenInputRef}
          type="datetime-local"
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="absolute inset-0 h-full w-full pointer-events-none opacity-0"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
